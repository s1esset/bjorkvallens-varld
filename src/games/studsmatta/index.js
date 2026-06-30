// Studsmatta — fysik-GAME (2–5 år). En glad kanin (🐰) studsar på en elastisk
// studsmatta. MÅL: uppe i skyn svävar morötter 🥕 och stjärnor ⭐ — studsa kaninen
// upp och FÅNGA allihop, så firas nivån och en ny (högre, fler, mer åt sidan) börjar.
//
// EN enda, tydlig kontroll (utöver "tryck = liten studs"): DRA studsmattan.
//   • Vågrätt  -> flyttar kaninens studs-pelare i sidled (sikta under ett mål).
//   • Lodrätt  -> DRA NER mattan för att spänna den som en slangbella: ju längre
//                 ner, desto HÖGRE/snabbare studs. Höjden DU sätter blir kvar
//                 (höjd-/hastighetskontroll) tills du flyttar den igen.
// INGET misslyckande: kaninen studsar oändligt vidare, missar är roliga, och en
// mjuk auto-hjälp (sänk mattan + glid) gör att varje mål ALLTID nås.
// matter.js sköter fysiken via lib/physics.js.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, nudge, Matter } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { floatText, sparkle, puff, burst, bigCelebration, pop } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

const { Body } = Matter

// --- Geometri (designkoordinater 1280x720) ---
const HALF_SPAN = 200 // halva mattans bredd
const FLOOR_Y = 666 // där benen står
const CHAR_R = 38 // kaninens fysik-radie
const BED_MIN_X = 330 // hur långt åt vänster mattan får dras
const BED_MAX_X = 950 // hur långt åt höger mattan får dras
const BED_MIN_Y = 350 // högst upp mattan får dras (mjukast studs)
const BED_MAX_Y = 560 // längst ner mattan får dras (spändast = högst studs)
const DEFAULT_BED_Y = 470 // start: lagom spänning
const FLOOR_RESCUE_Y = 624 // föll kaninen bredvid mattan? mjuk räddnings-studs

// --- Fysik-trimning (matter.js-enheter; finjustera vid speltest) ---
const GRAVITY_Y = 1.2
const MIN_UP = 9 // studs vid mattan högst uppe (mjukast)
const MAX_UP = 24 // studs vid mattan längst ner (kaninen flyger ALDRIG ur skärmen)
const CEIL_Y = 110 // mjukt tak: studsar tillbaka ned om kaninen ändå kommer för högt

// --- Insamling / mål ---
const COLLECT_R = 72 // generös fångst-radie (barnvänlig)

// --- Auto-hjälp (no-fail) ---
const ASSIST_DELAY = 7 // s utan fångst -> sänk mattan (mer kraft) åt barnet
const GLIDE_DELAY = 13 // s utan fångst -> garanterad glid-fångst
const IDLE_DELAY = 6 // s utan tryck -> tyst röst-recue

const RECUE = [
  'Dra mattan neråt för en högre studs!',
  'Flytta mattan i sidled och dra ner för att spänna den!',
  'Fånga morötterna högt uppe!',
]
const CHEERS = ['Hopp!', 'Wii!', 'Högre!', 'Studs!']
const COLLECT_CHEERS = ['Mums!', 'En till!', 'Bra fångat!', 'Ja!']
const WIN_CHEERS = ['Du fångade alla! Hurra!', 'Allihop! Vad duktig du är!', 'Bravo! Alla fångade!']
const BOOST_FLOATS = ['🎵', '⭐', '🎶', '✨']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'studsmatta',
  titleSv: 'Studsmatta',
  icon: '🦘',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'studsmatta',
  voiceIntro: 'Dra studsmattan neråt för att spänna den och studsa kaninen högt!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._sinceCollect = 0
    this._helpStage = 0
    this._lastLand = 0
    this._lastVoice = 0
    this._bedX = 640
    this._bedY = DEFAULT_BED_Y
    this._tapBoost = false // tryck-fallback: en gångs extra-studs
    this._dragging = false
    this._gliding = false
    this._resolving = false
    this._collected = 0
    this._goals = []
    this._bedProxy = { dip: 0 }
    // Cache för change-guards (rita om matta/mätare bara när något ändrats).
    this._lastDip = NaN
    this._lastRigX = NaN
    this._lastRigY = NaN
    this._lastPower = NaN

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: glad äng med himmel/sol/moln/kullar (dekor, aldrig tryckbar).
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Heltäckande, osynlig fångare BAKOM allt spel: tryck var som helst = liten studs.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatcherTap = () => this._boost(ctx)
    this._catcher.on('pointertap', this._onCatcherTap)
    this._root.addChild(this._catcher)

    // Mål-lager (morötter/stjärnor som svävar) — eventMode none, fångas via avstånd.
    this._goalLayer = new Container()
    this._goalLayer.eventMode = 'none'
    this._goalLayer.interactiveChildren = false
    this._root.addChild(this._goalLayer)

    // Skugga under kaninen (krymper när den är hög).
    this._shadow = new Graphics().ellipse(0, 0, 58, 14).fill({ color: COLORS.shadow, alpha: 0.18 })
    this._shadow.eventMode = 'none'
    this._root.addChild(this._shadow)

    // Studsmattans "rigg" (ram + ben + elastisk matt-linje), flyttbar i x och y.
    // Allt ritas centrerat kring lokal x=0; rig.x = mattans mitt. Bädden ritas vid _bedY.
    this._rig = new Container()
    this._rig.eventMode = 'static'
    this._rig.cursor = 'pointer'
    this._rigG = new Graphics()
    this._rigG.eventMode = 'none'
    this._rig.addChild(this._rigG)
    this._onRigDown = (e) => this._rigDown(ctx, e)
    this._onRigMove = (e) => this._rigMove(e)
    this._onRigUp = () => this._rigUp(ctx)
    this._rig.on('pointerdown', this._onRigDown)
    this._root.addChild(this._rig)

    // Kaninen (emoji) kopplad till en fysik-kropp.
    this._charView = new Text({ text: '🐰', style: { fontFamily: FONT.body, fontSize: 74 } })
    this._charView.anchor.set(0.5)
    this._charView.eventMode = 'none'
    this._root.addChild(this._charView)

    // Kraftmätare (dekor) — visar hur spänd/hög mattan är.
    this._buildMeter()

    // Fysik: golv + sidoväggar (mjukt tak hanteras manuellt i ticken).
    this._phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })

    // Mattans bädd = statisk kropp som flyttas med _bedX/_bedY. Restitution 0 —
    // studsen styr vi själva i _land (vår setVelocity efter Matters lösare = full kontroll).
    this._bedBody = this._phys.rectangle(this._bedX, this._bedY + 22, HALF_SPAN * 2, 44, {
      isStatic: true,
      restitution: 0,
      friction: 0,
      label: 'bed',
    })

    this._char = this._phys.circle(this._bedX, this._bedY - 120, CHAR_R, {
      restitution: 0.9,
      friction: 0.001,
      frictionAir: 0.002,
      label: 'char',
    })
    this._phys.link(this._char, this._charView)

    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Rita riggen och placera kropp/hitArea på rätt höjd.
    this._applyBed()

    // Första nivån (från sparad progress -> oändlig variation).
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._spawnGoals(this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._say(ctx, this.voiceIntro, 0)
  },

  // ---- Aktuell studskraft 0..1 utifrån hur lågt mattan är dragen --------------
  _power() {
    return clamp((this._bedY - BED_MIN_Y) / (BED_MAX_Y - BED_MIN_Y), 0, 1)
  },

  // ---- Tick: fysik + centrering + insamling + auto-hjälp + idle -------------

  _update(ctx, t) {
    if (!this._alive) return
    this._phys.update(t.deltaMS)
    const char = this._char
    const dtSec = t.deltaMS / 1000

    // Rita elastisk matta (med ev. studs-dip) + uppdatera mätaren.
    this._drawRig(this._bedProxy.dip)
    this._updateMeter()

    // Skugga som krymper med höjden.
    const h = clamp((this._bedY - char.position.y) / 380, 0, 1)
    this._shadow.x = char.position.x
    this._shadow.y = this._bedY + 16
    this._shadow.scale.set(1 - h * 0.5, 1)
    this._shadow.alpha = 0.18 * (1 - h * 0.6)

    if (this._gliding) return // hjälp-glid styr kaninen helt

    // Mjukt tak: kommer kaninen ändå för högt, studsa lugnt tillbaka ned.
    if (char.position.y < CEIL_Y && char.velocity.y < 0) {
      nudge(char, char.velocity.x, Math.abs(char.velocity.y) * 0.35 + 1)
    }

    // Mjuk centrering mot mattans mitt (så att flytta mattan flyttar studs-pelaren).
    const dx = this._bedX - char.position.x
    if (Math.abs(dx) > 20) {
      let vx = char.velocity.x + dx * 0.012
      vx = clamp(vx, -8, 8)
      nudge(char, vx, char.velocity.y)
    }

    // Dämpa eventuellt snurr mjukt mot vila.
    if (Math.abs(char.angularVelocity) > 0.01) {
      Body.setAngularVelocity(char, char.angularVelocity * 0.95)
    }

    // Räddning: föll kaninen bredvid mattan (golvet)? mjuk studs tillbaka in.
    if (char.position.y > FLOOR_RESCUE_Y) {
      const now = performance.now()
      if (now - this._lastLand > 120) {
        this._lastLand = now
        nudge(char, (this._bedX - char.position.x) * 0.06, -(MIN_UP + 2))
        ctx.services.audio.sfx('soft')
      }
    }

    if (this._resolving) return

    // Fånga mål (vid kontakt).
    this._checkCollect(ctx)

    // Auto-hjälp så ett mål ALLTID nås (no-fail).
    this._sinceCollect += dtSec
    const remaining = this._goals.filter((g) => !g.got)
    if (remaining.length) {
      if (this._sinceCollect >= GLIDE_DELAY) {
        this._glideToGoal(ctx, this._nearestGoal(remaining))
      } else if (this._sinceCollect >= ASSIST_DELAY && this._helpStage < 1) {
        this._helpStage = 1
        this._assist(ctx, this._nearestGoal(remaining))
      }
    }

    // Tyst om-tilltal om barnet inte tryckt på ~6 s (kaninen studsar ändå vidare).
    this._idle += dtSec
    if (this._idle > IDLE_DELAY) {
      this._idle = 0
      this._say(ctx, randomFrom(RECUE), 0)
    }
  },

  // ---- Tryck = liten extra-studs (tap-fallback för de minsta) -----------------

  _boost(ctx) {
    if (!this._alive || this._resolving || this._gliding) return
    this._idle = 0
    this._tapBoost = true // nästa landning får en garanterad hög studs
    this._dipBed()
    this._squash(this._charView, false)
    ctx.services.audio.sfx('pop')
    if (Math.random() < 0.4) {
      floatText(ctx.fxLayer, this._charView.x, this._charView.y - 64, randomFrom(BOOST_FLOATS))
    }
    if (Math.random() < 0.3) this._say(ctx, randomFrom(CHEERS), 1600)
  },

  // ---- Landning på mattan: studsa upp så högt som mattan är spänd -------------

  _land(ctx) {
    if (!this._alive || this._gliding || this._resolving) return
    const now = performance.now()
    if (now - this._lastLand < 90) return // skydd mot dubbel-kollision
    this._lastLand = now

    const char = this._char
    const power = this._tapBoost ? 1 : this._power()
    this._tapBoost = false
    const up = MIN_UP + power * (MAX_UP - MIN_UP)
    const big = power > 0.5
    // Lite av den vågräta farten bevaras + en mjuk dragning mot mattans mitt.
    let vx = char.velocity.x * 0.4 + (this._bedX - char.position.x) * 0.03
    vx = clamp(vx, -7, 7)
    nudge(char, vx, -up)

    this._dipBed()
    this._squash(this._charView, big)
    ctx.services.audio.sfx(big ? 'boing' : 'soft')

    if (big) {
      Body.setAngularVelocity(char, (Math.random() - 0.5) * 0.3)
      if (Math.random() < 0.45) {
        floatText(ctx.fxLayer, this._charView.x, this._charView.y - 64, randomFrom(BOOST_FLOATS))
      }
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive || this._gliding || this._resolving) return
    for (const pair of e.pairs) {
      const hitBed =
        (pair.bodyA === this._char && pair.bodyB === this._bedBody) ||
        (pair.bodyB === this._char && pair.bodyA === this._bedBody)
      if (hitBed) {
        this._land(ctx)
        break
      }
    }
  },

  // ---- Dra mattan i x (sikta) + y (spänn för höjd) ---------------------------

  _rigDown(ctx, e) {
    if (!this._alive || this._resolving || this._gliding) return
    this._idle = 0
    this._dragging = false
    this._dragStart = this._root.toLocal(e.global)
    this._dragOrigX = this._bedX
    this._dragOrigY = this._bedY
    ctx.services.audio.sfx('tap')
    this._rig.on('globalpointermove', this._onRigMove)
    this._rig.on('pointerup', this._onRigUp)
    this._rig.on('pointerupoutside', this._onRigUp)
  },

  _rigMove(e) {
    if (!this._alive) return
    const p = this._root.toLocal(e.global)
    const dx = p.x - this._dragStart.x
    const dy = p.y - this._dragStart.y
    if (!this._dragging && Math.hypot(dx, dy) > 12) this._dragging = true
    if (this._dragging) {
      this._setBed(
        clamp(this._dragOrigX + dx, BED_MIN_X, BED_MAX_X),
        clamp(this._dragOrigY + dy, BED_MIN_Y, BED_MAX_Y),
      )
    }
  },

  _rigUp(ctx) {
    this._detachRig()
    if (!this._dragging) {
      // Inget drag = tryck -> liten extra-studs (tap-fallback, även de minsta klarar det).
      this._boost(ctx)
    }
    this._dragging = false
  },

  _detachRig() {
    if (this._rig && !this._rig.destroyed) {
      this._rig.off('globalpointermove', this._onRigMove)
      this._rig.off('pointerup', this._onRigUp)
      this._rig.off('pointerupoutside', this._onRigUp)
    }
  },

  _setBed(x, y) {
    this._bedX = x
    this._bedY = y
    this._applyBed()
  },

  // Synka riggens position, träffyta och fysik-kroppen mot _bedX/_bedY.
  _applyBed() {
    if (this._rig && !this._rig.destroyed) {
      this._rig.x = this._bedX
      // Stor, förlåtande dra-träffyta runt mattan (>=96px), följer höjden.
      this._rig.hitArea = new Rectangle(-HALF_SPAN - 46, this._bedY - 72, (HALF_SPAN + 46) * 2, 150)
    }
    if (this._bedBody) Body.setPosition(this._bedBody, { x: this._bedX, y: this._bedY + 22 })
    this._drawRig(this._bedProxy.dip)
  },

  // ---- Mål: skapa, fånga, hjälpa --------------------------------------------

  _spawnGoals(level) {
    if (!this._alive) return
    this._clearGoals()
    this._collected = 0
    const n = clamp(2 + level, 2, 5)
    // Toppen sjunker (högre upp) med nivån; aldrig högre än kaninen säkert når.
    const top = Math.max(210, 460 - level * 55)
    const jit = level >= 4 ? () => (Math.random() * 50 - 25) : () => 0
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1)
      const x = clamp(380 + f * 520 + jit(), 360, 920)
      // Varannan högt (top), varannan mitt — tvingar barnet att variera höjden.
      const y = clamp((i % 2 === 0 ? top : Math.min(460, top + 150)) + jit(), 200, 470)
      const kind = Math.random() < 0.5 ? 'star' : 'carrot'
      this._addGoal(x, y, kind)
    }
  },

  _addGoal(x, y, kind) {
    const view = new Text({ text: kind === 'star' ? '⭐' : '🥕', style: { fontFamily: FONT.body, fontSize: 60 } })
    view.anchor.set(0.5)
    view.position.set(x, y)
    view.eventMode = 'none'
    this._goalLayer.addChild(view)
    // Lugn andning + mjuk gunga (drar blicken; exit-säkert via gsap-tween på view).
    const tween = gsap.to(view.scale, { x: 1.14, y: 1.14, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    const bob = gsap.to(view, { y: y - 10, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._goals.push({ x, y, kind, got: false, view, tween, bob })
  },

  _clearGoals() {
    for (const g of this._goals) {
      g.tween?.kill()
      g.bob?.kill()
      if (g.view && !g.view.destroyed) {
        gsap.killTweensOf(g.view)
        gsap.killTweensOf(g.view.scale)
        g.view.destroy()
      }
    }
    this._goals = []
  },

  _nearestGoal(list) {
    const c = this._char.position
    let best = list[0]
    let bestD = Infinity
    for (const g of list) {
      const d = (g.x - c.x) ** 2 + (g.y - c.y) ** 2
      if (d < bestD) {
        bestD = d
        best = g
      }
    }
    return best
  },

  _checkCollect(ctx) {
    const c = this._char.position
    for (const g of this._goals) {
      if (g.got) continue
      if (Math.hypot(g.x - c.x, g.view.y - c.y) < COLLECT_R) {
        this._collectGoal(ctx, g)
      }
    }
  },

  _collectGoal(ctx, g) {
    if (!this._alive || g.got) return
    g.got = true
    this._collected++
    this._sinceCollect = 0
    this._helpStage = 0

    sparkle(ctx.fxLayer, g.x, g.view.y, { count: 7 })
    puff(ctx.fxLayer, g.x, g.view.y, { count: 8, color: g.kind === 'star' ? COLORS.yellow : COLORS.orange })
    floatText(ctx.fxLayer, g.x, g.view.y - 24, g.kind === 'star' ? '⭐' : '🥕')
    ctx.services.audio.sfx(g.kind === 'star' ? 'magi' : 'pling')
    if (Math.random() < 0.6) this._say(ctx, randomFrom(COLLECT_CHEERS), 800)

    g.tween?.kill()
    g.bob?.kill()
    if (g.view && !g.view.destroyed) {
      gsap.killTweensOf(g.view)
      gsap.killTweensOf(g.view.scale)
      g.view.destroy()
    }

    if (this._goals.every((x) => x.got)) this._winLevel(ctx)
  },

  // Steg 1: flytta mattan under närmaste mål + spänn den (sänk) åt barnet.
  _assist(ctx, g) {
    if (!this._alive || !g) return
    this._say(ctx, 'Jag hjälper till!', 600)
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, this._charView.x, this._charView.y, { count: 6 })
    const targetX = clamp(g.x, BED_MIN_X, BED_MAX_X)
    // Mjuk glid av mattan mot målets x + ner till full spänning (uppdaterar fysik-kroppen).
    this._assistTween?.kill()
    const proxy = { x: this._bedX, y: this._bedY }
    this._assistTween = gsap.to(proxy, {
      x: targetX,
      y: BED_MAX_Y,
      duration: 0.7,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (this._alive) {
          this._setBed(clamp(proxy.x, BED_MIN_X, BED_MAX_X), clamp(proxy.y, BED_MIN_Y, BED_MAX_Y))
        }
      },
    })
  },

  // Steg 2: garanterad glid-fångst (kaninen glider till målet, fångar, fortsätter).
  _glideToGoal(ctx, g) {
    if (!this._alive || this._gliding || this._resolving || !g) return
    this._gliding = true
    const char = this._char
    Body.setStatic(char, true)
    nudge(char, 0, 0)
    this._assistTween?.kill()
    const from = { x: char.position.x, y: char.position.y }
    this._glideTween = gsap.to(from, {
      x: g.x,
      y: g.view.y,
      duration: 0.8,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (this._alive && this._char) Body.setPosition(this._char, { x: from.x, y: from.y })
      },
      onComplete: () => {
        if (!this._alive) return
        this._collectGoal(ctx, g)
        // Tillbaka ovanför mattan och fortsätt studsa.
        if (this._char) {
          Body.setStatic(this._char, false)
          Body.setPosition(this._char, { x: this._bedX, y: this._bedY - 130 })
          nudge(this._char, 0, -2)
        }
        this._gliding = false
        this._sinceCollect = 0
        this._helpStage = 0
      },
    })
  },

  // ---- Nivå klar: firande + ny (svårare) nivå -------------------------------

  _winLevel(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._idle = 0

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    this._say(ctx, randomFrom(WIN_CHEERS), 0)
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, this._charView.x, this._charView.y, { count: 16 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete() // delat firande + beröm-röst + stjärna + klistermärke

    this._loadTimer = gsap.delayedCall(1.9, () => {
      if (!this._alive) return
      this._resolving = false
      this._sinceCollect = 0
      this._helpStage = 0
      this._tapBoost = false
      this._setBed(640, DEFAULT_BED_Y)
      if (this._char) {
        Body.setStatic(this._char, false)
        Body.setPosition(this._char, { x: 640, y: this._bedY - 130 })
        nudge(this._char, 0, -MIN_UP)
      }
      this._spawnGoals(this._level)
      if (this._charView && !this._charView.destroyed) pop(this._charView)
    })
  },

  // ---- Kraftmätare (dekor) — visar hur spänd/hög mattan är -------------------

  _buildMeter() {
    this._meter = new Container()
    this._meter.position.set(1206, 470)
    this._meter.eventMode = 'none'
    const track = new Graphics()
      .roundRect(-22, -110, 44, 220, 22)
      .fill({ color: 0x000000, alpha: 0.12 })
      .stroke({ width: 4, color: COLORS.white, alpha: 0.7 })
    this._meterFill = new Graphics()
    const cap = new Text({ text: '⬆️', style: { fontFamily: FONT.body, fontSize: 34 } })
    cap.anchor.set(0.5)
    cap.y = -140
    this._meter.addChild(track, this._meterFill, cap)
    this._root.addChild(this._meter)
  },

  _updateMeter() {
    const g = this._meterFill
    if (!g || g.destroyed) return
    const c = this._power()
    if (c === this._lastPower) return // ändras bara när mattan dras → hoppa över annars
    this._lastPower = c
    const hgt = c * 200
    const color = c > 0.66 ? COLORS.orange : c > 0.33 ? COLORS.yellow : COLORS.teal
    g.clear()
    if (hgt > 1) g.roundRect(-15, 100 - hgt, 30, hgt, 14).fill(color)
  },

  // ---- Mattans ritning (ben + elastisk bädd vid _bedY, lokal x=0) ------------

  _drawRig(dip) {
    const g = this._rigG
    if (!g || g.destroyed) return
    // Geometrin ändras bara vid studs-dip eller när mattan flyttas → annars hoppa över
    // (sparar en full re-tessellering varje frame medan kaninen är i luften).
    if (dip === this._lastDip && this._bedX === this._lastRigX && this._bedY === this._lastRigY) return
    this._lastDip = dip
    this._lastRigX = this._bedX
    this._lastRigY = this._bedY
    const by = this._bedY
    const lx = -HALF_SPAN
    const rx = HALF_SPAN
    g.clear()
    // Ben (vinklade ut mot golvet) — sträcks/komprimeras med höjden.
    g.moveTo(lx, by).lineTo(lx - 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
    g.moveTo(rx, by).lineTo(rx + 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
    // Fötter.
    g.roundRect(lx - 70, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
    g.roundRect(rx + 26, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
    // Elastisk matt-linje (sjunker i mitten med dip vid studs).
    g.moveTo(lx, by)
      .quadraticCurveTo(0, by + dip, rx, by)
      .stroke({ width: 11, color: COLORS.teal, cap: 'round' })
    g.moveTo(lx, by - 4)
      .quadraticCurveTo(0, by - 4 + dip, rx, by - 4)
      .stroke({ width: 3, color: COLORS.white, alpha: 0.5, cap: 'round' })
    // Ändknoppar (mattans fästen).
    g.circle(lx, by, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    g.circle(rx, by, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
  },

  _dipBed() {
    if (!this._alive) return
    gsap.killTweensOf(this._bedProxy)
    gsap
      .timeline()
      .to(this._bedProxy, { dip: 30, duration: 0.07, ease: 'power2.out' })
      .to(this._bedProxy, { dip: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
  },

  // Squash (platt) -> stretch (lång) -> tillbaka. Tweenar bara scale.
  _squash(view, big = false) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    const sq = big ? 0.58 : 0.74
    const st = big ? 1.3 : 1.16
    gsap
      .timeline()
      .to(view.scale, { x: 2 - sq, y: sq, duration: 0.07, ease: 'power2.out' })
      .to(view.scale, { x: 2 - st, y: st, duration: 0.12, ease: 'power1.out' })
      .to(view.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.2)' })
  },

  // Strypt röst-tilltal (undviker att prat staplas på varandra).
  _say(ctx, text, minGap = 1500) {
    const now = performance.now()
    if (now - this._lastVoice < minGap) return
    this._lastVoice = now
    ctx.services.voice.say(text)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._loadTimer?.kill()
    this._assistTween?.kill()
    this._glideTween?.kill()
    this._detachRig()
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatcherTap)
    if (this._rig && !this._rig.destroyed) this._rig.off('pointerdown', this._onRigDown)
    this._clearGoals()
    if (this._charView && !this._charView.destroyed) {
      gsap.killTweensOf(this._charView)
      gsap.killTweensOf(this._charView.scale)
    }
    gsap.killTweensOf(this._bedProxy)
    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
