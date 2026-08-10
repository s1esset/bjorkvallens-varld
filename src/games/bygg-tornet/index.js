// Bygg Tornet — bygg-/fysiklek (3–5 år). En vänlig kloss väntar högt uppe. Barnet
// TRYCKER var som helst — klossen flyttar sig till FINGRET och faller DÄR, rakt ner,
// med RIKTIG fysik (matter.js). Den landar på stapeln, lutar och vajar och får sätta sig.
// När den vilat snäpps den fast (statisk) så basen står stadigt medan tornet växer.
// FYSIKEN avgör vinsten: när tillräckligt många klossar VILAR på varandra (ingen kloss
// faller av) har vi byggt ett torn → firande. En kloss som tippar av är ALDRIG ett fall:
// den puffar bara bort glatt och barnet får en ny. Barnet får sikta själv de första
// försöken; först efter FLERA missar smyger en svag centrerings-hjälp in, och efter ännu
// en lägger kranen nästa kloss på plats själv — så tornet ALLTID når topp-flaggan, men
// barnets egen träff är alltid det som firas mest.
// Allt ritas programmatiskt (Pixi Graphics + system-emoji) — inga externa filer.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, mat } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, puff, sparkle, breathe, bigCelebration } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, DESIGN_W, DESIGN_H } from '../../lib/theme.js'
import { groundFill } from '../../lib/form.js'

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
// mat('tra') bidrar BARA med materialets identitet (och därmed dess röst) — klossarnas
// egna, handtrimmade tal ligger sist och vinner. Ett material får aldrig tuna om ett
// fungerande spel bakvägen.
const BLOCK_OPTS = mat('tra', { density: 0.0018, restitution: 0.03, friction: 0.85, frictionStatic: 1.6, frictionAir: 0.02, label: 'block' })

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

// Klosstyper: bredden varierar så balansen blir ett riktigt val. Höjden hålls konstant
// (BH) så stapelns matematik och de generösa toleranserna är oförändrade.
const SPECS = [
  { kind: 'kloss', w: 190 },
  { kind: 'kloss', w: 190 },
  { kind: 'planka', w: 250 },
  { kind: 'smal', w: 140 },
  { kind: 'tunna', w: 170 },
]

// Stigande ton per våning — tornet får en HÖRBAR höjd (C-dur-pentatonik).
const STOREY_TONE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66]

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
    // Stapeln HÖRS nu. `_lockActive` hade redan en duns, men bara på klossen barnet
    // just la — och alltid lika hård. Nu låter varje kloss-mot-kloss-anslag i tornet
    // efter sin egen fart, så ett torn som gungar och sätter sig ger en levande
    // träklang i stället för tystnad mellan de scriptade ljuden.
    this._unbindImpact = this._phys.impactAudio(ctx.services.audio, { hardSpeed: 12, vol: 0.2 })
    // Egen statisk mark vars ÖVERKANT ligger på GROUND_TOP_Y (klossarna vilar här).
    this._phys.rectangle(DESIGN_W / 2, GROUND_TOP_Y + 130, DESIGN_W + 400, 260, {
      isStatic: true,
      friction: 1,
      frictionStatic: 2,
      restitution: 0,
    })

    // Stadens siluett: ETT torn per färdigbyggt torn, sparat mellan omgångar. Skylinen
    // växer alltså över tid — man river inte längre bara sitt bygge, man bygger en stad.
    this._skyline = new Graphics()
    this._skyline.eventMode = 'none'
    this._root.addChild(this._skyline)
    this._drawSkyline(ctx.progress.get().custom?.torn || 0)

    // Byggarbetsplats: grus, gräskant, avspärrningsstaket och en verktygslåda —
    // marken var tidigare en tom brun platta.
    const floor = new Graphics()
    // Gruset lag pa 94 613 px i EN ton (`_plattprobe --medbakgrund`). Ljuset kommer fran
    // horisonten bakom bygget, sa marken ar ljusast vid graskanten och morknar mot
    // betraktaren. Delad markfyllning — se lib/form.js.
    floor.rect(0, GROUND_TOP_Y, DESIGN_W, DESIGN_H - GROUND_TOP_Y).fill(groundFill(COLORS.brown))
    floor.rect(0, GROUND_TOP_Y, DESIGN_W, 16).fill(COLORS.green)
    floor.rect(0, GROUND_TOP_Y + 16, DESIGN_W, 6).fill({ color: 0x6f452c, alpha: 0.5 })
    for (let i = 0; i < 46; i++) {
      const gx = Math.random() * DESIGN_W
      const gy = GROUND_TOP_Y + 30 + Math.random() * (DESIGN_H - GROUND_TOP_Y - 40)
      floor.ellipse(gx, gy, 4 + Math.random() * 7, 3 + Math.random() * 4).fill({ color: 0xa5714c, alpha: 0.55 })
    }
    // gul-svart avspärrning längs nederkanten
    for (let x = -20; x < DESIGN_W + 20; x += 52) {
      floor.moveTo(x, DESIGN_H - 30).lineTo(x + 26, DESIGN_H - 30).stroke({ width: 12, color: COLORS.yellow })
      floor.moveTo(x + 26, DESIGN_H - 30).lineTo(x + 52, DESIGN_H - 30).stroke({ width: 12, color: 0x4a3526 })
    }
    // verktygslåda till höger
    floor.roundRect(1090, GROUND_TOP_Y + 26, 120, 58, 10).fill(0xff8a3d)
    floor.roundRect(1090, GROUND_TOP_Y + 26, 120, 14, 8).fill(0xffa763)
    floor.roundRect(1132, GROUND_TOP_Y + 14, 36, 16, 8).stroke({ width: 7, color: 0x8a939b })
    floor.eventMode = 'none'
    this._root.addChild(floor)

    // Mål-flagga (RITAD — visar hur högt det ska byggas) på en liten avsats.
    this._flag = new Container()
    const fg = new Graphics()
    fg.roundRect(-42, 26, 84, 14, 6).fill(0x8a5a3b) // avsats som kattungen sitter på
    fg.roundRect(-42, 26, 84, 5, 5).fill(0xa5714c)
    fg.moveTo(0, 26).lineTo(0, -44).stroke({ width: 6, color: 0xdcb388, cap: 'round' })
    fg.moveTo(3, -44).lineTo(52, -30).lineTo(3, -14).closePath().fill(COLORS.red)
    fg.moveTo(3, -44).lineTo(52, -30).lineTo(3, -30).closePath().fill({ color: 0xffffff, alpha: 0.25 })
    fg.eventMode = 'none'
    this._flag.addChild(fg)
    this._flag.eventMode = 'none'
    this._root.addChild(this._flag)

    // Kattungen som sitter fast där uppe: BYGG upp till den så den kan ta sig ner.
    // Det ger bygget ett syfte och spelet en egen slutscen.
    this._kitten = makeKitten()
    this._kitten.eventMode = 'none'
    this._root.addChild(this._kitten)

    // Bobo står vid foten och hejar på varje våning.
    this._bobo = makeBuilder()
    this._bobo.position.set(196, GROUND_TOP_Y - 4)
    this._root.addChild(this._bobo)
    this._boboIdle = gsap.to(this._bobo, { y: GROUND_TOP_Y - 12, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })

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

    // Flaggan + kattungens avsats vid mål-höjden.
    const goalY = slotY(this._goal - 1) - 8
    this._flag.position.set(912, goalY)
    this._flag.scale.set(1)
    this._flagTween?.kill()
    this._flagTween = gsap.to(this._flag, { y: goalY - 10, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    // Kattungen sitter på avsatsen och väntar på att tornet ska nå upp.
    this._kittenTw?.kill()
    if (this._kitten && !this._kitten.destroyed) {
      this._kitten.visible = true
      this._kitten.scale.set(1)
      this._kitten.rotation = 0
      this._kitten.position.set(912, goalY + 12)
      this._kittenTw = breathe(this._kitten, { scale: 1.05, duration: 1.3 })
    }

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
    // Första klossen är alltid en vanlig, stadig kloss (trygg bas); därefter varieras
    // bredden så barnet får något att bedöma.
    const spec = i === 0 ? SPECS[0] : randomFrom(SPECS)
    this._spec = spec
    const view = this._makeBlock(i, spec)
    view.position.set(this._dropX, READY_Y)
    this._blockLayer.addChild(view)

    const opts = { isStatic: true, ...BLOCK_OPTS }
    if (spec.kind === 'tunna') { opts.friction = 0.5; opts.frictionStatic = 0.9 }
    const body = this._phys.rectangle(this._dropX, READY_Y, spec.w, BH, opts)
    this._phys.link(body, view)

    this._active = { view, body, w: spec.w }
    this._phase = 'carry'
    this._idle = 0
    this._moveGhost()
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
    const clean = this._misses === 0 // barnet prickade rätt på första försöket → fira extra
    ctx.services.audio.sfx((i + 1) % 4 === 0 ? 'pop' : 'pling')
    // Tyngd + hörbar höjd: en duns som skalar med fallfarten, och en ton per våning
    // som klättrar uppför pentatoniken — man HÖR hur högt tornet är.
    ctx.services.audio.tone({ freq: 110, dur: 0.14, type: 'sine', vol: 0.22, slideTo: 70 })
    ctx.services.audio.tone({ freq: STOREY_TONE[Math.min(i, STOREY_TONE.length - 1)], dur: 0.2, type: 'triangle', vol: 0.16, delay: 0.05 })
    if (!block.view.destroyed) pop(block.view)
    // Dammpuff när den tunga klossen sätter sig.
    puff(ctx.fxLayer, block.body.position.x, block.body.position.y + BH / 2, { count: 6, color: 0xc9a06a })
    this._boboCheer()
    // Barnets EGEN träff firas tydligt — extra gnistor när klossen satt direkt.
    sparkle(ctx.fxLayer, block.body.position.x, block.body.position.y - BH / 2, { count: clean ? 12 : 7 })
    ctx.services.voice.say(i < NUMBERS.length ? NUMBERS[i] : randomFrom(PLACE_LINES))
    this._afterPlace(ctx, block)
  },

  // Klossen tippade av / hamnade bredvid → ALDRIG ett fall: puffa bort den glatt, ge en ny.
  // Först efter FLERA missar (3) lägger kranen nästa kloss rakt på plats (auto-hjälp).
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
    const helped = this._misses >= 3
    this._spawnCall = ctx.later(0.28, () => {
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
    // Hjälpen firas ödmjukt (färre gnistor än barnets egen träff) — den ska inte kännas
    // som barnets triumf.
    sparkle(ctx.fxLayer, this._supportX, expC - BH / 2, { count: 5 })
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
    this._spawnCall = ctx.later(0.22, () => {
      if (!this._alive) return
      this._spawnBlock(ctx)
    })
  },

  // Spök-markören visar en BRED trygg zon (inte en exakt klossruta) — vägledning,
  // inte facit: det finns fortfarande en bedömning kvar för barnet.
  _moveGhost() {
    if (!this._ghost || this._ghost.destroyed) return
    const w = ACCEPT_DX * 1.7
    this._ghost.clear()
      .roundRect(-w / 2, -BH / 2, w, BH, 18)
      .fill({ color: COLORS.yellow, alpha: 0.09 })
      .stroke({ width: 5, color: COLORS.yellow, alpha: 0.75 })
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
    ctx.services.voice.say('Hurra! Nu kan kattungen komma ner!')
    for (const b of this._placed) sparkle(ctx.fxLayer, b.body.position.x, b.body.position.y, { count: 4 })

    // Spara förlopp + delat firande (stjärna + klistermärke) — exakt en gång.
    this._level += 1
    ctx.progress.setLevel(this._level)
    const torn = (ctx.progress.get().custom?.torn || 0) + 1
    ctx.progress.setCustom('torn', torn)
    this._drawSkyline(torn) // stadens siluett växer med ett torn
    ctx.progress.complete()

    // Spelets EGEN slutscen: kattungen hoppar över på tornet, klättrar ner våning för
    // våning och landar hos Bobo. Bygget hade ett SYFTE.
    this._rescueKitten(ctx)

    this._finishCall = ctx.later(3.4, () => {
      if (!this._alive) return
      this._resolving = false
      this._newTower(ctx)
    })
  },

  // Kattungen tar sig ner via tornet till Bobo.
  _rescueKitten(ctx) {
    const k = this._kitten
    if (!k || k.destroyed) return
    this._kittenTw?.kill()
    const steps = [...this._placed]
      .sort((a, b) => a.body.position.y - b.body.position.y)
      .map((b) => ({ x: b.body.position.x, y: b.body.position.y - BH / 2 - 22 }))
    const st = { x: k.x, y: k.y, r: 0 }
    const tl = gsap.timeline({
      onUpdate: () => {
        if (k.destroyed) return
        k.position.set(st.x, st.y)
        k.rotation = st.r
      },
    })
    // Hoppet över från avsatsen till tornets topp.
    if (steps.length) {
      tl.to(st, { x: (st.x + steps[0].x) / 2, y: st.y - 46, r: -0.3, duration: 0.22, ease: 'power2.out' })
      tl.to(st, { x: steps[0].x, y: steps[0].y, r: 0, duration: 0.24, ease: 'power2.in' })
      tl.add(() => { if (this._alive) ctx.services.audio.sfx('pop') })
    }
    // Ett litet skutt per våning ner.
    steps.slice(1).forEach((s) => {
      tl.to(st, { x: s.x, y: s.y - 26, duration: 0.13, ease: 'power2.out' })
      tl.to(st, { x: s.x, y: s.y, duration: 0.15, ease: 'bounce.out' })
      tl.add(() => {
        if (!this._alive) return
        ctx.services.audio.tone({ freq: 440, dur: 0.08, type: 'triangle', vol: 0.12 })
        puff(ctx.fxLayer, s.x, s.y + 20, { count: 3, color: 0xc9a06a })
      })
    })
    // Sista skuttet ner till Bobo + jubel.
    tl.to(st, { x: 300, y: GROUND_TOP_Y - 90, r: 0.4, duration: 0.26, ease: 'power2.out' })
    tl.to(st, { x: 268, y: GROUND_TOP_Y - 24, r: 0, duration: 0.26, ease: 'power2.in' })
    tl.add(() => {
      if (!this._alive) return
      if (!ctx.services.audio.sample('djur_katt')) ctx.services.audio.sfx('pling')
      ctx.services.audio.sfx('celebrate')
      puff(ctx.fxLayer, 268, GROUND_TOP_Y - 8, { count: 8, color: 0xc9a06a })
      sparkle(ctx.fxLayer, 268, GROUND_TOP_Y - 52, { count: 12 })
      bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
      this._boboCheer(true)
      ctx.services.voice.say('Tack för hjälpen!')
    })
    this._kittenTw = tl
  },

  // Bobo hejar: armarna upp + ett litet hopp (dubbelt så stort vid räddningen).
  _boboCheer(big = false) {
    const b = this._bobo
    if (!b || b.destroyed) return
    pop(b, { scale: big ? 1.14 : 1.06 })
    if (b._arms && !b._arms.destroyed) {
      gsap.killTweensOf(b._arms)
      gsap.to(b._arms, {
        rotation: 0.2, duration: 0.14, yoyo: true, repeat: big ? 5 : 1, ease: 'sine.inOut',
        onComplete: () => { if (b._arms && !b._arms.destroyed) b._arms.rotation = 0 },
      })
    }
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
      // Mjuk centrerings-hjälp — men den träder in SENT: barnet får sikta helt själv de
      // första försöken. Först från tredje försöket (misses>=2) smyger en svag "magnet"
      // in mot stödpunkten. Skicklighet ska kännas, aldrig krävas.
      if (this._misses >= 2 && !slow) {
        const pull = 0.0006 * (this._misses - 1)
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

  // En chunky kloss. Bredden varierar per typ (kloss/planka/smal/tunna) så balansen
  // blir ett riktigt val — höjden är alltid BH så stapelmatematiken är oförändrad.
  _makeBlock(i, spec = SPECS[0]) {
    const c = new Container()
    const color = PLAYFUL[i % PLAYFUL.length]
    const w = spec.w
    const g = new Graphics()
    if (spec.kind === 'tunna') {
      // Trätunna: rundade sidor + två stålband. Lite lägre friktion = den kan glida
      // en aning, ett hinder man kan anpassa sig runt (aldrig ett misslyckande).
      g.roundRect(-w / 2, -BH / 2, w, BH, 22).fill(0xb98a5f).stroke({ width: 5, color: 0x8a5a3b })
      g.roundRect(-w / 2 + 6, -BH / 2 + 5, w - 12, 10, 6).fill({ color: 0xd2a877, alpha: 0.8 })
      for (const bx of [-w * 0.22, w * 0.22]) g.rect(bx - 5, -BH / 2, 10, BH).fill({ color: 0x8a939b, alpha: 0.85 })
    } else if (spec.kind === 'planka') {
      // Bred planka med träådring.
      g.roundRect(-w / 2, -BH / 2, w, BH, 10).fill(color).stroke({ width: 5, color: COLORS.white, alpha: 0.7 })
      for (let k = -1; k <= 1; k++) {
        g.moveTo(-w / 2 + 16, k * 16).quadraticCurveTo(0, k * 16 + 6, w / 2 - 16, k * 16)
          .stroke({ width: 2.5, color: darken(color, 0.25), alpha: 0.5 })
      }
    } else {
      g.roundRect(-w / 2, -BH / 2, w, BH, 14).fill(color).stroke({ width: 5, color: COLORS.white, alpha: 0.7 })
    }
    // Skuggrad nedtill (volym).
    g.roundRect(-w / 2 + 10, BH / 2 - 14, w - 20, 9, 5).fill({ color: darken(color, 0.22), alpha: 0.55 })
    // Studs upptill (LEGO-känsla) — antal följer bredden.
    if (spec.kind !== 'tunna') {
      const studs = Math.max(1, Math.round(w / 95))
      for (let s = 0; s < studs; s++) {
        const sx = studs === 1 ? 0 : -w / 2 + 26 + (s * (w - 52)) / (studs - 1)
        g.circle(sx, -BH / 2 + 9, 11).fill({ color: lighten(color, 0.3) })
      }
    }
    c.addChild(g)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Stadens siluett i fjärran: ett torn per färdigbyggt torn (sparat i custom.torn).
  _drawSkyline(count) {
    const g = this._skyline
    if (!g || g.destroyed) return
    g.clear()
    const n = Math.min(14, count)
    for (let i = 0; i < n; i++) {
      const x = 44 + i * 88 + ((i * 37) % 17)
      const floors = 2 + ((i * 5) % 4)
      const w = 46 + ((i * 13) % 22)
      const h = floors * 34
      g.roundRect(x, GROUND_TOP_Y - h, w, h, 8).fill({ color: 0x7fb3d5, alpha: 0.42 })
      for (let f = 0; f < floors; f++) {
        g.rect(x + 10, GROUND_TOP_Y - h + 12 + f * 34, w - 20, 12).fill({ color: 0xfff3b0, alpha: 0.4 })
      }
    }
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
    this._unbindImpact?.()
    this._spawnCall?.kill()
    this._finishCall?.kill()
    this._flagTween?.kill()
    this._ghostTween?.kill()
    this._kittenTw?.kill()
    this._boboIdle?.kill()
    if (this._kitten && !this._kitten.destroyed) { gsap.killTweensOf(this._kitten); gsap.killTweensOf(this._kitten.scale) }
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
      if (this._bobo._arms) gsap.killTweensOf(this._bobo._arms)
    }

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

// --- Ritade figurer (P0 ASSETS: egen silhuett, aldrig en emoji som hela föremålet) ---

// Byggaren Bobo vid tornets fot: hjälm, kropp, armar som kan lyftas.
function makeBuilder() {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 4, 34, 12).fill({ color: 0x4a3526, alpha: 0.18 }) // markskugga
  g.ellipse(-16, -8, 13, 9).fill(0xf5731e) // fötter
  g.ellipse(16, -8, 13, 9).fill(0xf5731e)
  g.ellipse(0, -44, 30, 34).fill(COLORS.orange) // kropp
  g.ellipse(0, -38, 19, 20).fill({ color: COLORS.cream, alpha: 0.92 })
  c.addChild(g)
  const arms = new Graphics()
  arms.moveTo(-24, -56).quadraticCurveTo(-42, -66, -46, -92).stroke({ width: 12, color: COLORS.orange, cap: 'round' })
  arms.moveTo(24, -56).quadraticCurveTo(42, -66, 46, -92).stroke({ width: 12, color: COLORS.orange, cap: 'round' })
  arms.circle(-46, -92, 9).fill(COLORS.cream)
  arms.circle(46, -92, 9).fill(COLORS.cream)
  c.addChild(arms)
  const head = new Graphics()
  head.circle(0, -90, 26).fill(COLORS.cream)
  head.circle(-9, -86, 4).fill(COLORS.ink)
  head.circle(9, -86, 4).fill(COLORS.ink)
  head.moveTo(-10, -78).quadraticCurveTo(0, -70, 10, -78).stroke({ width: 3.5, color: COLORS.ink, cap: 'round' })
  head.circle(-17, -78, 5).fill({ color: COLORS.pink, alpha: 0.8 })
  head.circle(17, -78, 5).fill({ color: COLORS.pink, alpha: 0.8 })
  c.addChild(head)
  // Hjälmen ritas i EGEN Graphics ovanpå — en arc som fylls i samma Graphics som
  // ansiktet drar en kil från förra punkten och lägger sig över hela ansiktet.
  const helmet = new Graphics()
  helmet.ellipse(0, -108, 28, 17).fill(COLORS.yellow)
  helmet.roundRect(-33, -104, 66, 9, 4).fill(0xf5c518)
  helmet.rect(-2, -132, 4, 24).fill(0xf5c518)
  c.addChild(helmet)
  c._arms = arms
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Kattungen som väntar högst upp.
function makeKitten() {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(-17, -12).lineTo(-9, -30).lineTo(0, -11).closePath().fill(0xffb15c) // öron
  g.moveTo(17, -12).lineTo(9, -30).lineTo(0, -11).closePath().fill(0xffb15c)
  g.ellipse(0, 12, 18, 15).fill(0xffb15c) // kropp
  g.moveTo(15, 16).quadraticCurveTo(34, 10, 28, -8).stroke({ width: 6, color: 0xf59042, cap: 'round' }) // svans
  g.circle(0, -6, 18).fill(0xffc888) // huvud
  g.circle(-7, -8, 3.4).fill(COLORS.ink)
  g.circle(7, -8, 3.4).fill(COLORS.ink)
  g.moveTo(-3, -1).lineTo(3, -1).lineTo(0, 2).closePath().fill(0xe79ab0) // nos
  g.moveTo(-22, -3).lineTo(-7, -1).moveTo(-22, 3).lineTo(-7, 2)
    .moveTo(22, -3).lineTo(7, -1).moveTo(22, 3).lineTo(7, 2)
    .stroke({ width: 1.6, color: 0xfffdf7, alpha: 0.9 })
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
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
