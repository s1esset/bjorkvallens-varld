// Bygg Tornet — bygg-/fysiklek (3–5 år). En vänlig kloss väntar högt uppe. Barnet
// TRYCKER var som helst — klossen flyttar sig till FINGRET och faller DÄR, rakt ner,
// med RIKTIG fysik (matter.js). Den landar på stapeln, lutar och vajar och får sätta sig.
// När den vilat snäpps den fast (statisk) så basen står stadigt medan tornet växer.
// FYSIKEN avgör vinsten: när tillräckligt många klossar VILAR på varandra (ingen kloss
// faller av) har vi byggt ett torn → firande. En kloss som tippar av är ALDRIG ett fall:
// den puffar bara bort glatt och barnet får en ny. Efter ett par missar lägger kranen
// nästa kloss rakt på plats av sig själv (auto-hjälp), så tornet ALLTID når topp-flaggan.
// Allt ritas programmatiskt (Pixi Graphics + system-emoji) — inga externa filer.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, puff, sparkle, breathe, bigCelebration } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, FONT, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

// --- Geometri (designkoordinater 1280×720) ---
const BASE_X = 640 // tornets mittlinje (nästa klossens default-läge)
const GROUND_TOP_Y = 604 // markens ovansida = nedersta klossens vilolinje
const BW = 190 // klossbredd (≫96px träffyta — fast man trycker var som helst)
const BH = 64 // klosshöjd
const RAIL_Y = 28 // kranrälsens höjd (trallan åker här)
const READY_Y = 104 // den väntande klossen svävar högt upp och faller härifrån
const BOB = 7 // mjuk gungning för den väntande klossen
const MAX_DRIFT = 150 // hur långt tornet får luta i sidled från mitten (håll byggbart)
const DROP_MIN_X = BW / 2 + 24 // klossen får falla var som helst på skärmen …
const DROP_MAX_X = DESIGN_W - BW / 2 - 24 // … men aldrig delvis utanför kanten

// Klossens fysik: hög friktion + statisk friktion och nästan ingen studs ⇒ klossar
// staplar och glider inte; lite luftmotstånd ⇒ vajet lugnar sig snabbt. Lugnt & förlåtande.
const BLOCK_OPTS = { density: 0.0018, restitution: 0.03, friction: 0.85, frictionStatic: 1.6, frictionAir: 0.02, label: 'block' }

// Vila-/landningströsklar.
const REST_SPEED = 1.4 // matter-fart under detta = klossen har lugnat sig
const ANG_REST = 0.05 // vinkelhastighet under detta = inte längre tippande
const REST_HOLD = 0.35 // s i vila innan vi snäpper fast
const MAX_FALL = 3.0 // s innan vi tvångs-sätter klossen (no-fail)

// Acceptans (FYSIKEN avgör): kom klossen till vila PÅ stapeln (annars puff bort + ny kloss).
const ACCEPT_DX = 120 // sidled från stödpunkten
const ACCEPT_DY = 58 // hur långt under förväntad höjd den får sjunka
const ACCEPT_ANGLE = 0.5 // ~29° lutning ok; mer = den har tippat av

const HIT_THROTTLE = 0.08 // s mellan landnings-ljud
const IDLE_DELAY = 6 // s utan handling → röst-recue

const NUMBERS = ['ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju']
const PLACE_LINES = ['En till!', 'Så högt!', 'Pling!', 'Wow!', 'Mer!']
const MISS_LINES = ['Hoppsan!', 'Vi provar igen!', 'Nästan!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const slotY = (i) => GROUND_TOP_Y - BH / 2 - i * BH

export default {
  id: 'bygg-tornet',
  titleSv: 'Bygg Tornet',
  icon: '🧱',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'bygg-tornet',
  voiceIntro: 'Bygg ett högt torn! Tryck där klossen ska falla.',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._fallT = 0
    this._restT = 0
    this._lastHit = -1
    this._lastSay = -2
    this._dropX = BASE_X // var nästa kloss faller (sätts av barnets tryck)
    this._carrierX = BASE_X // var kran-kroken ritas

    this._phase = 'reset' // reset | carry | fall | wait | finish
    this._placed = [] // fastlåsta klossar { view, body }
    this._active = null // klossen som bärs/faller just nu { view, body }
    this._count = 0
    this._misses = 0 // missar på nuvarande våning (no-fail-räknare)
    this._goal = 4
    this._supportX = BASE_X // mitten på stapelns topp (nästa klossens mål)
    this._stackTopY = GROUND_TOP_Y // stapelns översida (nästa klossens vilolinje)
    this._expC = slotY(0) // förväntad mitt-y för fallande kloss

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildScene(ctx)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._newTower(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen (byggs en gång, återanvänds mellan torn) --------------

  _buildScene(ctx) {
    // Glad himmel (dekorativ, exit-säker via scene.js).
    this._root.addChild(createScene('sky', { width: ctx.width, height: ctx.height }))

    // Osynlig tryckyta över hela skärmen: tryck var som helst → klossen faller DÄR
    // (eller en mjuk lekfull puff). Allt annat ligger ovanpå men är icke-interaktivt.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatch = (e) => this._onTap(ctx, e)
    this._catcher.on('pointertap', this._onCatch)
    this._root.addChild(this._catcher)

    // Fysik: gravitation + golv/väggar.
    this._phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))
    // Egen statisk mark vars ÖVERKANT ligger på GROUND_TOP_Y (klossarna vilar här).
    this._phys.rectangle(DESIGN_W / 2, GROUND_TOP_Y + 130, DESIGN_W + 400, 260, {
      isStatic: true,
      friction: 1,
      frictionStatic: 2,
      restitution: 0,
    })

    // Mark/gräs (dekor).
    const floor = new Graphics()
    floor.rect(0, GROUND_TOP_Y, DESIGN_W, DESIGN_H - GROUND_TOP_Y).fill(COLORS.brown)
    floor.rect(0, GROUND_TOP_Y, DESIGN_W, 16).fill(COLORS.green)
    floor.eventMode = 'none'
    this._root.addChild(floor)

    // Mål-flagga (visar hur högt det ska byggas).
    this._flag = new Text({ text: '🚩', style: { fontFamily: FONT.body, fontSize: 64 } })
    this._flag.anchor.set(0.5)
    this._flag.eventMode = 'none'
    this._root.addChild(this._flag)

    // Spök-markör: lyser där nästa kloss helst ska landa (mitt på stapeln).
    this._ghost = new Graphics()
      .roundRect(-BW / 2, -BH / 2, BW, BH, 14)
      .fill({ color: COLORS.yellow, alpha: 0.1 })
      .stroke({ width: 5, color: COLORS.yellow, alpha: 0.9 })
    this._ghost.eventMode = 'none'
    this._root.addChild(this._ghost)
    this._ghostTween = breathe(this._ghost, { scale: 1.06, duration: 1.0 })

    // Kranräls (dekor, längst upp).
    const rail = new Graphics()
      .roundRect(60, RAIL_Y - 8, DESIGN_W - 120, 16, 8)
      .fill(COLORS.inkSoft)
    rail.roundRect(60, RAIL_Y - 8, DESIGN_W - 120, 5, 8).fill({ color: COLORS.white, alpha: 0.25 })
    rail.eventMode = 'none'
    this._root.addChild(rail)

    // Klossarnas lager (icke-interaktivt → tryck faller ner till tryckytan).
    this._blockLayer = new Container()
    this._blockLayer.eventMode = 'none'
    this._blockLayer.interactiveChildren = false
    this._root.addChild(this._blockLayer)

    // Kran-tralla + lina (ritas om varje bildruta medan klossen väntar).
    this._crane = new Graphics()
    this._crane.eventMode = 'none'
    this._root.addChild(this._crane)
  },

  // ---- Torn (runda) -------------------------------------------------------

  _newTower(ctx) {
    if (!this._alive) return
    this._spawnCall?.kill()
    this._finishCall?.kill()
    this._clearBlocks()

    this._count = 0
    this._misses = 0
    this._supportX = BASE_X
    this._stackTopY = GROUND_TOP_Y
    this._idle = 0
    this._phase = 'reset'
    this._goal = Math.min(4 + this._level, 7)

    // Flaggan vid mål-höjden.
    this._flag.position.set(880, slotY(this._goal - 1) - 8)
    this._flag.scale.set(1)
    this._flagTween?.kill()
    this._flagTween = gsap.to(this._flag, { y: this._flag.y - 12, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    this._ghost.visible = true
    this._moveGhost()

    this._spawnBlock(ctx)
  },

  // Skapa nästa kloss högt upp, väntande (statisk; positionen sätts varje bildruta).
  // Den väntar ovanför stapeln, men barnet bestämmer var den faller genom att trycka.
  _spawnBlock(ctx) {
    if (!this._alive) return
    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }
    this._expC = this._stackTopY - BH / 2
    this._dropX = clamp(this._supportX, DROP_MIN_X, DROP_MAX_X)

    const i = this._count
    const view = this._makeBlock(i)
    view.position.set(this._dropX, READY_Y)
    this._blockLayer.addChild(view)

    const body = this._phys.rectangle(this._dropX, READY_Y, BW, BH, { isStatic: true, ...BLOCK_OPTS })
    this._phys.link(body, view)

    this._active = { view, body }
    this._phase = 'carry'
    this._idle = 0
    bounceIn(view)
  },

  // ---- Tryck → klossen faller DÄR barnet tryckte --------------------------

  _onTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    if (this._phase === 'carry' && this._active) {
      // Flytta klossen till fingret och släpp den där → den faller rakt ner.
      this._dropX = clamp(p.x, DROP_MIN_X, DROP_MAX_X)
      const b = this._active.body
      Body.setPosition(b, { x: this._dropX, y: READY_Y })
      Body.setAngle(b, 0)
      if (!this._active.view.destroyed) this._active.view.position.set(this._dropX, READY_Y)
      this._carrierX = this._dropX
      this._dropActive(ctx)
      return
    }
    // Annars (klossen faller redan / firande): alltid ett glatt svar — aldrig "fel".
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, p.x, p.y, { count: 5 })
  },

  _dropActive(ctx) {
    if (!this._active) return
    this._phase = 'fall'
    this._fallT = 0
    this._restT = 0
    const b = this._active.body
    Body.setStatic(b, false)
    Body.setVelocity(b, { x: 0, y: 0 })
    Body.setAngularVelocity(b, 0)
    ctx.services.audio.sfx('whoosh')
  },

  // ---- Landning: FYSIKEN avgör — lägg fast eller (no-fail) puffa bort ------

  _settleActive(ctx) {
    if (!this._alive || !this._active) return
    const b = this._active.body
    const dx = Math.abs(b.position.x - this._supportX)
    const dy = b.position.y - this._expC // positivt = den sjönk under förväntat
    const ang = Math.abs(normAngle(b.angle))
    // Vilar klossen PÅ stapeln (inte på marken bredvid, inte tippad)? Det avgör fysiken.
    const landedOnTop = dy < ACCEPT_DY && dx < ACCEPT_DX && ang < ACCEPT_ANGLE
    if (landedOnTop) this._lockActive(ctx)
    else this._rejectActive(ctx)
  },

  // Klossen vilade på stapeln → snäpp fast (statisk) så basen står stadigt.
  _lockActive(ctx) {
    const block = this._active
    Body.setStatic(block.body, true)
    const i = this._count
    ctx.services.audio.sfx((i + 1) % 4 === 0 ? 'pop' : 'pling')
    if (!block.view.destroyed) pop(block.view)
    sparkle(ctx.fxLayer, block.body.position.x, block.body.position.y - BH / 2, { count: 6 })
    ctx.services.voice.say(i < NUMBERS.length ? NUMBERS[i] : randomFrom(PLACE_LINES))
    this._afterPlace(ctx, block)
  },

  // Klossen tippade av / hamnade bredvid → ALDRIG ett fall: puffa bort den glatt, ge en ny.
  // Efter ett par missar lägger kranen nästa kloss rakt på plats (auto-hjälp).
  _rejectActive(ctx) {
    const block = this._active
    this._active = null
    this._misses++
    ctx.services.audio.sfx('soft')
    const x = block.body.position.x
    const y = block.body.position.y
    if (block.body) this._phys.removeBody(block.body)
    if (block.view && !block.view.destroyed) {
      gsap.killTweensOf(block.view)
      gsap.killTweensOf(block.view.scale)
      block.view.destroy({ children: true })
    }
    puff(ctx.fxLayer, x, y, { count: 8 })
    if (this._t - this._lastSay > 1.2) {
      this._lastSay = this._t
      ctx.services.voice.say(randomFrom(MISS_LINES))
    }
    this._phase = 'wait'
    const helped = this._misses >= 2
    this._spawnCall = gsap.delayedCall(0.28, () => {
      if (!this._alive) return
      if (helped) this._autoPlace(ctx)
      else this._spawnBlock(ctx)
    })
  },

  // Auto-hjälp (no-fail-garanti): lägg en kloss prydligt och statiskt rakt på stapeln.
  _autoPlace(ctx) {
    if (!this._alive) return
    const i = this._count
    const expC = this._stackTopY - BH / 2
    const view = this._makeBlock(i)
    view.position.set(this._supportX, expC)
    this._blockLayer.addChild(view)
    const body = this._phys.rectangle(this._supportX, expC, BW, BH, { isStatic: true, ...BLOCK_OPTS })
    this._phys.link(body, view)
    bounceIn(view)
    ctx.services.audio.sfx('magi')
    sparkle(ctx.fxLayer, this._supportX, expC - BH / 2, { count: 8 })
    ctx.services.voice.say('Jag hjälper till!')
    this._afterPlace(ctx, { view, body })
  },

  // Gemensamt efter att en kloss lagts: läs av VAR fysiken la den, räkna, gå vidare.
  _afterPlace(ctx, block) {
    this._placed.push(block)
    this._active = null
    this._count++
    this._misses = 0
    // Ny stödpunkt = där klossen FAKTISKT vilar (klampad så tornet hålls byggbart/på skärm).
    this._supportX = clamp(block.body.position.x, BASE_X - MAX_DRIFT, BASE_X + MAX_DRIFT)
    this._stackTopY = block.body.position.y - BH / 2
    this._phase = 'wait'

    // Vinst avgjord av fysiken: tillräckligt många klossar vilar på varandra → torn klart.
    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }
    this._moveGhost()
    this._spawnCall = gsap.delayedCall(0.22, () => {
      if (!this._alive) return
      this._spawnBlock(ctx)
    })
  },

  _moveGhost() {
    if (!this._ghost || this._ghost.destroyed) return
    this._ghost.position.set(this._supportX, this._stackTopY - BH / 2)
  },

  // ---- Mål-höjden nådd: firande + ny högre runda --------------------------

  _finishTower(ctx) {
    if (!this._alive || this._phase === 'finish' || this._resolving) return
    this._resolving = true
    this._phase = 'finish'
    this._spawnCall?.kill()
    this._ghost.visible = false

    // Flaggan hoppar glatt.
    this._flagTween?.kill()
    if (!this._flag.destroyed) {
      pop(this._flag)
      this._flagTween = gsap.to(this._flag, { y: this._flag.y - 24, duration: 0.18, yoyo: true, repeat: 3, ease: 'power1.inOut' })
    }

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Hurra! Vilket högt torn!')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    for (const b of this._placed) sparkle(ctx.fxLayer, b.body.position.x, b.body.position.y, { count: 4 })

    // Spara förlopp + delat firande (stjärna + klistermärke) — exakt en gång.
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('torn', (ctx.progress.get().custom?.torn || 0) + 1)
    ctx.progress.complete()

    this._finishCall = gsap.delayedCall(2.0, () => {
      if (!this._alive) return
      this._resolving = false
      this._newTower(ctx)
    })
  },

  // ---- Uppdatering --------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt

    // Den väntande klossen svävar högt upp och gungar mjukt vid sitt drop-läge.
    if (this._phase === 'carry' && this._active) {
      const y = READY_Y + Math.sin(this._t * 2.2) * BOB
      this._carrierX = this._dropX
      Body.setPosition(this._active.body, { x: this._dropX, y })
      Body.setAngle(this._active.body, 0)
    }

    // Stega fysiken (fast tidssteg) och synka vyerna.
    this._phys.update(ticker.deltaMS)

    // Rita kran-tralla + lina endast medan klossen väntar (släpps → kroken släpper).
    this._drawCrane(this._phase === 'carry' && this._active ? this._active.view : null)

    // Faller → vänta tills klossen lugnat sig → fysiken avgör om den la sig rätt.
    if (this._phase === 'fall' && this._active) {
      this._fallT += dt
      const b = this._active.body
      const slow = b.speed < REST_SPEED && b.angularSpeed < ANG_REST
      // Mjuk centrerings-hjälp som växer med antalet missar (no-fail, alltid byggbart):
      // en svag "magnet" mot stödpunkten medan klossen ännu rör sig.
      if (this._misses > 0 && !slow) {
        const pull = 0.0009 * this._misses
        Body.applyForce(b, b.position, { x: (this._supportX - b.position.x) * pull * b.mass, y: 0 })
      }
      this._restT = slow ? this._restT + dt : 0
      if ((this._fallT > 0.25 && this._restT > REST_HOLD) || this._fallT > MAX_FALL) {
        this._settleActive(ctx)
      }
    }

    // Idle-recue (endast medan klossen väntar): upprepa instruktionen + locka klossen.
    if (this._phase === 'carry') {
      this._idle += dt
      if (this._idle > IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        if (this._active && !this._active.view.destroyed) pop(this._active.view)
      }
    }
  },

  _drawCrane(blockView) {
    const g = this._crane
    if (!g || g.destroyed) return
    g.clear()
    if (!blockView || blockView.destroyed) return
    const cx = this._carrierX
    // Tralla på rälsen.
    g.roundRect(cx - 34, RAIL_Y - 12, 68, 24, 8).fill(COLORS.inkSoft)
    g.circle(cx - 18, RAIL_Y + 13, 6).fill(COLORS.ink)
    g.circle(cx + 18, RAIL_Y + 13, 6).fill(COLORS.ink)
    // Lina ner till klossens topp + liten krok.
    g.moveTo(cx, RAIL_Y + 13).lineTo(blockView.x, blockView.y - BH / 2).stroke({ width: 5, color: COLORS.inkSoft, alpha: 0.9 })
    g.circle(blockView.x, blockView.y - BH / 2, 6).stroke({ width: 4, color: COLORS.inkSoft })
  },

  // Mjuk "klack" när en fallande kloss slår i stapeln/marken (strypt mot ljud-spam).
  _onCollision(ctx, e) {
    if (!this._alive) return
    if (this._t - this._lastHit < HIT_THROTTLE) return
    for (const pair of e.pairs) {
      const involves = pair.bodyA.label === 'block' || pair.bodyB.label === 'block'
      if (!involves) continue
      if (pair.bodyA.speed + pair.bodyB.speed < 2.2) continue
      this._lastHit = this._t
      ctx.services.audio.sfx('tap')
      break
    }
  },

  // En chunky LEGO-aktig kloss: rundad rektangel + två studs-cirklar + skuggrad.
  _makeBlock(i) {
    const c = new Container()
    const color = PLAYFUL[i % PLAYFUL.length]
    const g = new Graphics()
      .roundRect(-BW / 2, -BH / 2, BW, BH, 14)
      .fill(color)
      .stroke({ width: 5, color: COLORS.white, alpha: 0.7 })
    // Skuggrad nedtill (volym).
    g.roundRect(-BW / 2 + 10, BH / 2 - 14, BW - 20, 9, 5).fill({ color: darken(color, 0.22), alpha: 0.55 })
    // Två studs upptill (LEGO-känsla).
    for (const sx of [-50, 50]) {
      g.circle(sx, -BH / 2 + 9, 11).fill({ color: lighten(color, 0.3) })
    }
    c.addChild(g)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  _clearBlocks() {
    const all = [...this._placed]
    if (this._active) all.push(this._active)
    for (const b of all) {
      if (b.body) this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
        b.view.destroy({ children: true })
      }
    }
    this._placed = []
    this._active = null
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._spawnCall?.kill()
    this._finishCall?.kill()
    this._flagTween?.kill()
    this._ghostTween?.kill()

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatch)

    // Döda tweens på ALLA klossvyer (barnet kan avsluta mitt i ett fall/firande).
    const all = [...(this._placed || [])]
    if (this._active) all.push(this._active)
    for (const b of all) {
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
      }
    }
    if (this._flag && !this._flag.destroyed) {
      gsap.killTweensOf(this._flag)
      gsap.killTweensOf(this._flag.scale)
    }
    if (this._ghost && !this._ghost.destroyed) {
      gsap.killTweensOf(this._ghost)
      gsap.killTweensOf(this._ghost.scale)
    }

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Normalisera vinkel till [-π, π].
function normAngle(a) {
  a %= Math.PI * 2
  if (a > Math.PI) a -= Math.PI * 2
  if (a < -Math.PI) a += Math.PI * 2
  return a
}

function lighten(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
