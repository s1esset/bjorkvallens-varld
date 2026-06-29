// Pruttbubbelbad — fnitter-fysik (2–4 år). Zacke sitter i ett skummande bubbelbad;
// barnet trycker (eller HÅLLER) på hans mage → PRRRT! En luftbubbla föds vid
// tryckpunkten och stiger gungande genom vattnet, vobblar i sidled och POPPAR vid
// ytan med ett fniss + skumplask. Ju hårdare/längre man håller, desto större bubbla
// (stiger snabbare, poppar högre, mer skum). En gul gummianka man kan DRA gör att
// bubblorna studsar åt nya håll. Mål: poppa bubblor tills skummet fyller badet upp
// till den prickade skumlinjen → firande + nytt, lite högre mål (oändlig lek).
//
// No-fail: tomma tryck finns inte (vatten ger plopp+ring, magen ger alltid en bubbla),
// varje pop ökar skummet monotont, och vid idle pruttar Zacke SJÄLV tills badet fylls.
//
// Bubblorna är vanliga Pixi-objekt som ENDAST rörs av ticker-integratorn (ingen matter.js,
// ingen GSAP på bubbel-objekt) → exit-säkra utan extra skydd. Partiklar/plask går via
// lib/feedback.js (redan exit-säkra). GSAP rör endast Zacke/anka/skum + {}-proxies.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { puff, sparkle, ripple, floatText, pop, wiggle, bigCelebration } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ---- Geometri (designkoordinater) ---------------------------------------
const SURFACE_Y = 330 // vattenytan = pop-linje + lyftkraftens nollinje
const WALL_L = 230 // logiska väggar (bubbel-studs)
const WALL_R = 1050
const FLOOR = 650
const ZACKE_X = 430
const ZACKE_Y = 360
const DUCK_R = 66 // ankans kollisionsradie
const DUCK_HOME = { x: 760, y: 430 }

// ---- Bubblor -------------------------------------------------------------
const BASE = 40 // ritradie; view.scale = r / BASE
const R_MIN = 28 // snabbt tap ger ändå en rolig bubbla
const R_MAX = 70
const FOAM_K = 0.9 // skum-tillskott per pop = r * FOAM_K
const MAX_V = 14 // hastighetstak — inget kan skjuta ur karet

export default {
  id: 'pruttbad',
  titleSv: 'Pruttbubbelbad',
  icon: '🛁',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'pruttbad',
  voiceIntro: 'Tryck på Zackes mage så pruttar det bubblor!',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._bubbles = []
    this._foam = { level: 0 }
    this._held = false
    this._charging = null
    this._resolving = false
    this._idle = 0
    this._firstPrutt = false
    this._duckPhase = 0
    this._duckActive = false
    this._duckMoved = false
    this._duckSelected = false
    this._duckBase = { x: DUCK_HOME.x, y: DUCK_HOME.y }
    this._lastBoing = 0
    this._lastQuack = 0

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._applyLevel()

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (FÖRSTA barn) — badrums-vatten-gradient.
    const scene = createScene('water', { ground: false })
    this._root.addChild(scene)

    this._buildTub()
    this._buildGoal()
    this._buildFoam()
    this._buildWaterTap(ctx)
    this._buildZacke(ctx)
    this._buildDuck(ctx)

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivå-skalning ------------------------------------------------------

  _applyLevel() {
    this._goalFoam = 70 + this._level * 18
    this._goalY = clamp(SURFACE_Y - this._goalFoam, 220, SURFACE_Y - 30)
    this._levelBoost = Math.min(this._level * 4, 20) // större standardbubblor på högre nivå
  },

  // ---- Scenbyggen ---------------------------------------------------------

  _buildTub() {
    const g = new Graphics()
    // Porslinskar.
    g.roundRect(170, 250, 940, 430, 90).fill(COLORS.white).stroke({ width: 12, color: COLORS.teal })
    // Glansremsa upptill.
    g.roundRect(190, 262, 900, 40, 30).fill({ color: 0xffffff, alpha: 0.6 })
    // Vatten.
    g.roundRect(200, 330, 880, 340, 60).fill({ color: COLORS.blue, alpha: 0.55 })
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildGoal() {
    this._goalGfx = new Graphics()
    this._goalGfx.eventMode = 'none'
    this._root.addChild(this._goalGfx)
    this._goalMarker = new Text({ text: '🫧', style: { fontFamily: FONT.body, fontSize: 40 } })
    this._goalMarker.anchor.set(0.5)
    this._goalMarker.eventMode = 'none'
    this._root.addChild(this._goalMarker)
    this._drawGoal()
  },

  _drawGoal() {
    const g = this._goalGfx
    if (!g || g.destroyed) return
    g.clear()
    for (let x = 240; x <= 1010; x += 34) g.circle(x, this._goalY, 5).fill({ color: COLORS.white, alpha: 0.85 })
    if (!this._goalMarker.destroyed) this._goalMarker.position.set(1042, this._goalY)
  },

  _buildFoam() {
    this._foamGfx = new Graphics()
    this._foamGfx.eventMode = 'none'
    this._root.addChild(this._foamGfx)
    this._drawFoam()
  },

  _drawFoam() {
    const g = this._foamGfx
    if (!g || g.destroyed) return
    g.clear()
    if (this._foam.level <= 0) return
    const top = Math.max(this._goalY, SURFACE_Y - this._foam.level)
    // Skumkropp.
    g.roundRect(208, top, 864, SURFACE_Y - top + 26, 24).fill({ color: 0xffffff, alpha: 0.85 })
    // Bubbliga toppar.
    for (let x = 236; x <= 1044; x += 46) g.circle(x, top, 28).fill({ color: 0xffffff, alpha: 0.92 })
  },

  // Osynlig träffzon över vattnet — alltid kul plopp (ligger UNDER Zacke/anka i z).
  _buildWaterTap(ctx) {
    const area = new Container()
    area.hitArea = new Rectangle(200, SURFACE_Y, 880, FLOOR - SURFACE_Y + 20)
    area.eventMode = 'static'
    this._waterTapHandler = (e) => this._waterTap(ctx, e)
    area.on('pointertap', this._waterTapHandler)
    this._waterArea = area
    this._root.addChild(area)
  },

  _buildZacke(ctx) {
    const z = new Container()
    z.position.set(ZACKE_X, ZACKE_Y)
    // Skugga.
    z.addChild(new Graphics().ellipse(0, 130, 96, 22).fill({ color: COLORS.shadow, alpha: 0.12 }))
    // Kropp.
    z.addChild(new Graphics().circle(0, 0, 120).fill(COLORS.orange))
    // Mage-glans (huvudknappen).
    z.addChild(new Graphics().circle(0, 20, 70).fill({ color: 0xffb27a, alpha: 0.9 }))
    z.addChild(new Graphics().circle(-18, 2, 22).fill({ color: 0xffffff, alpha: 0.4 }))
    // Kinder.
    z.addChild(new Graphics().circle(-56, -46, 15).fill({ color: COLORS.pink, alpha: 0.7 }))
    z.addChild(new Graphics().circle(56, -46, 15).fill({ color: COLORS.pink, alpha: 0.7 }))
    // Ögon.
    for (const ex of [-38, 38]) {
      z.addChild(new Graphics().circle(ex, -80, 16).fill(COLORS.white))
      z.addChild(new Graphics().circle(ex, -78, 8).fill(COLORS.ink))
    }
    // Leende.
    z.addChild(new Graphics().arc(0, -56, 30, 0.18 * Math.PI, 0.82 * Math.PI).stroke({ width: 6, color: COLORS.ink, cap: 'round' }))

    z.eventMode = 'static'
    z.cursor = 'pointer'
    z.hitArea = new Circle(0, 20, 92) // träffyta-diameter 184px ≫ 96px
    this._zackeDown = (e) => this._zackePointerDown(ctx, e)
    this._zackeUp = () => this._releaseBubble(ctx)
    z.on('pointerdown', this._zackeDown)
    z.on('pointerup', this._zackeUp)
    z.on('pointerupoutside', this._zackeUp)
    this._zacke = z
    this._root.addChild(z)
  },

  _buildDuck(ctx) {
    const d = new Container()
    d.addChild(new Graphics().ellipse(0, 44, 52, 14).fill({ color: COLORS.shadow, alpha: 0.12 }))
    const e = new Text({ text: '🦆', style: { fontFamily: FONT.body, fontSize: 84 } })
    e.anchor.set(0.5)
    e.eventMode = 'none'
    d.addChild(e)
    d.position.set(this._duckBase.x, this._duckBase.y)
    d.eventMode = 'static'
    d.cursor = 'pointer'
    d.hitArea = new Circle(0, 0, 80) // träffyta-diameter 160px
    this._duckDownH = (ev) => this._duckDown(ctx, ev)
    this._duckMoveH = (ev) => this._duckMove(ev)
    this._duckUpH = () => this._duckUp(ctx)
    d.on('pointerdown', this._duckDownH)
    this._duck = d
    this._root.addChild(d)
  },

  // ---- Mage: tryck/håll → bubbla -----------------------------------------

  _zackePointerDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, WALL_L + 30, WALL_R - 30)
    this._held = true
    // Laddnings-bubbla vid tryckpunkten på karbotten.
    const view = this._makeBubbleView()
    const r = R_MIN + this._levelBoost
    view.scale.set(r / BASE)
    view.position.set(x, FLOOR - 30)
    this._root.addChild(view)
    this._charging = { x, r, view }
    // Riktig prutt (<100ms) eller mjuk syntes.
    if (!ctx.services.audio.sample('fart')) ctx.services.audio.sfx('soft')
    pop(this._zacke)
    if (!this._firstPrutt) {
      this._firstPrutt = true
      ctx.services.voice.say('Pruttbubblor!')
    }
  },

  _releaseBubble(ctx) {
    if (!this._held) return
    this._held = false
    const c = this._charging
    this._charging = null
    if (!c) return
    if (c.view && !c.view.destroyed) c.view.destroy()
    if (this._resolving) return
    this._idle = 0
    this._spawnBubble(c.x, c.r)
    // Dubbel-prutt på högre nivå → mer skum per tryck (lättare, inte svårare).
    if (this._level >= 2 && Math.random() < 0.35) {
      this._spawnBubble(clamp(c.x + (Math.random() - 0.5) * 120, WALL_L + 30, WALL_R - 30), Math.max(R_MIN, c.r * 0.7))
    }
    ctx.services.audio.sfx('whoosh')
  },

  _makeBubbleView() {
    const v = new Container()
    const g = new Graphics()
      .circle(0, 0, BASE)
      .fill({ color: 0xbfefff, alpha: 0.5 })
      .stroke({ width: 3, color: 0xffffff, alpha: 0.8 })
    g.circle(-BASE * 0.34, -BASE * 0.34, BASE * 0.22).fill({ color: 0xffffff, alpha: 0.85 }) // glansprick
    v.addChild(g)
    v.eventMode = 'none'
    return v
  },

  _spawnBubble(x, r) {
    if (!this._alive || this._resolving) return
    r = clamp(r, R_MIN, R_MAX + this._levelBoost)
    x = clamp(x, WALL_L + r, WALL_R - r)
    this._pushBubble(x, r)
  },

  // Skapa en bubbel-view + lägg i listan (delas av _spawnBubble och firande-svärmen,
  // som kör medan _resolving=true och därför inte kan gå via _spawnBubble-gardet).
  _pushBubble(x, r, vy = 0) {
    const view = this._makeBubbleView()
    view.scale.set(r / BASE)
    view.position.set(x, FLOOR - 30)
    this._root.addChild(view)
    this._bubbles.push({ view, x, y: FLOOR - 30, r, vx: 0, vy, phase: Math.random() * 6, age: 0 })
  },

  // ---- Anka: dra → flytta studshindret -----------------------------------

  _setDuckPos(x, y) {
    this._duckBase.x = clamp(x, WALL_L + DUCK_R, WALL_R - DUCK_R)
    this._duckBase.y = clamp(y, SURFACE_Y + 20, FLOOR - DUCK_R)
  },

  _duckDown(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    this._duckActive = true
    this._duckMoved = false
    this._duckStart = { x: p.x, y: p.y }
    this._duckGrab = { dx: this._duckBase.x - p.x, dy: this._duckBase.y - p.y }
    this._duckCtx = ctx
    this._duck.on('globalpointermove', this._duckMoveH)
    this._duck.on('pointerup', this._duckUpH)
    this._duck.on('pointerupoutside', this._duckUpH)
  },

  _duckMove(e) {
    if (!this._duckActive || !this._alive) return
    const p = this._root.toLocal(e.global)
    if (!this._duckMoved && Math.hypot(p.x - this._duckStart.x, p.y - this._duckStart.y) > 12) this._duckMoved = true
    if (this._duckMoved) {
      this._setDuckPos(p.x + this._duckGrab.dx, p.y + this._duckGrab.dy)
      const now = performance.now()
      if (now - this._lastQuack > 220) {
        this._lastQuack = now
        const a = this._duckCtx?.services?.audio
        if (a && !a.sample('djur_anka')) a.sfx('pop')
        if (this._duck && !this._duck.destroyed) pop(this._duck)
      }
      this._idle = 0
    }
  },

  _duckUp(ctx) {
    if (!this._duckActive) return
    this._duckActive = false
    this._duck.off('globalpointermove', this._duckMoveH)
    this._duck.off('pointerup', this._duckUpH)
    this._duck.off('pointerupoutside', this._duckUpH)
    if (!this._duckMoved) {
      // Tap → tap-tap: markera ankan, nästa vatten-tryck glider den dit.
      this._duckSelected = !this._duckSelected
      if (!ctx.services.audio.sample('djur_anka')) ctx.services.audio.sfx('pop')
      pop(this._duck)
    } else {
      this._duckSelected = false
    }
  },

  // ---- Vatten-tryck (alltid kul) -----------------------------------------

  _waterTap(ctx, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    // Tap-tap-släpp av ankan: glid den till tryckpunkten.
    if (this._duckSelected) {
      this._duckSelected = false
      const tx = clamp(p.x, WALL_L + DUCK_R, WALL_R - DUCK_R)
      const ty = clamp(p.y, SURFACE_Y + 20, FLOOR - DUCK_R)
      const st = { x: this._duckBase.x, y: this._duckBase.y }
      this._duckGlide?.kill()
      this._duckGlide = gsap.to(st, {
        x: tx,
        y: ty,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => this._setDuckPos(st.x, st.y),
      })
      if (!ctx.services.audio.sample('djur_anka')) ctx.services.audio.sfx('pop')
      return
    }
    ripple(ctx.fxLayer, p.x, p.y, { color: COLORS.white, maxR: 64 })
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.sfx('pop')
    // Närliggande bubblor får en liten knuff.
    for (const b of this._bubbles) {
      if (Math.abs(b.x - p.x) < 120 && Math.abs(b.y - p.y) < 140) {
        b.vx += (Math.random() - 0.5) * 2
        b.vy -= 1.5
      }
    }
  },

  // ---- Tick: laddning, bubbel-integrator, anka-gupp, idle/auto-hjälp -------

  _update(ctx, tk) {
    if (!this._alive) return
    const dt = Math.min(2.5, tk.deltaMS / 16.67)

    // Håll-laddning: bubblan växer synligt (direktmanipulation, ingen dold gest).
    if (this._held && this._charging) {
      this._charging.r = Math.min(R_MAX + this._levelBoost, this._charging.r + (26 / 60) * dt)
      const v = this._charging.view
      if (v && !v.destroyed) v.scale.set(this._charging.r / BASE)
    }

    // Anka guppar lätt på ytan.
    this._duckPhase += 0.05 * dt
    if (this._duck && !this._duck.destroyed) {
      this._duck.position.set(this._duckBase.x, this._duckBase.y + Math.sin(this._duckPhase) * 5)
    }

    // Bubbel-integrator.
    const duckX = this._duckBase.x
    const duckY = this._duckBase.y
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      const vyT = -(0.11 * b.r) // terminalfart uppåt ∝ radie
      b.vy += (vyT - b.vy) * 0.08 * dt
      b.vy *= 0.97
      b.vx *= 0.92
      b.phase += 0.12 * dt
      b.vx += Math.sin(b.phase) * 0.5 * dt
      // Hastighetstak.
      const sp = Math.hypot(b.vx, b.vy)
      if (sp > MAX_V) {
        b.vx = (b.vx / sp) * MAX_V
        b.vy = (b.vy / sp) * MAX_V
      }
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.age += dt

      // Väggstuds.
      if (b.x < WALL_L + b.r) {
        b.x = WALL_L + b.r
        b.vx *= -0.5
      } else if (b.x > WALL_R - b.r) {
        b.x = WALL_R - b.r
        b.vx *= -0.5
      }

      // Anka-kollision → studs (ankans placering ändrar bubblornas väg).
      const dx = b.x - duckX
      const dy = b.y - duckY
      const d = Math.hypot(dx, dy)
      const minD = b.r + DUCK_R
      if (d < minD && d > 0.01) {
        const nx = dx / d
        const ny = dy / d
        b.x = duckX + nx * minD
        b.y = duckY + ny * minD
        const dot = b.vx * nx + b.vy * ny
        b.vx = (b.vx - 2 * dot * nx) * 0.6
        b.vy = (b.vy - 2 * dot * ny) * 0.6
        const now = performance.now()
        if (now - this._lastBoing > 150) {
          this._lastBoing = now
          if (!ctx.services.audio.sample('boing')) ctx.services.audio.sfx('soft')
          if (this._duck && !this._duck.destroyed) wiggle(this._duck)
        }
      }

      if (b.view && !b.view.destroyed) b.view.position.set(b.x, b.y)

      // Pop vid ytan (bubblans topp når ytan) eller efter max-livslängd.
      if (b.y - b.r <= SURFACE_Y || b.age > 360) {
        this._popBubble(ctx, b, i)
      }
    }

    // Idle / auto-hjälp (~6s) — garanterar framgång utan precision.
    this._idle += dt / 60
    if (!this._resolving && this._idle > 6) {
      this._idle = 0
      this._autoHelp(ctx)
    }
  },

  _popBubble(ctx, b, i) {
    this._bubbles.splice(i, 1)
    if (b.view && !b.view.destroyed) b.view.destroy()
    if (!this._alive) return
    const big = b.r / 10
    puff(ctx.fxLayer, b.x, SURFACE_Y, { count: 6 + (big | 0), color: 0xffffff })
    sparkle(ctx.fxLayer, b.x, SURFACE_Y)
    ripple(ctx.fxLayer, b.x, SURFACE_Y, { color: COLORS.white, maxR: 40 + b.r * 1.4, alpha: 0.6 }) // större bubbla plaskar högre
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.sfx('pop')
    if (Math.random() < 0.3) floatText(ctx.fxLayer, b.x, SURFACE_Y - 10, randomFrom(['Hihi!', 'Pluff!', '😄', '🫧']))
    this._addFoam(ctx, b.r)
  },

  _addFoam(ctx, r) {
    this._foam.level += r * FOAM_K
    this._drawFoam()
    if (!this._resolving && this._foam.level >= this._goalFoam) this._onComplete(ctx)
  },

  _autoHelp(ctx) {
    if (!this._alive || this._resolving) return
    ctx.services.voice.replayLast()
    if (this._zacke && !this._zacke.destroyed) pop(this._zacke)
    const x = WALL_L + 80 + Math.random() * (WALL_R - WALL_L - 160)
    const r = 36 + Math.random() * 24 + this._levelBoost
    this._spawnBubble(x, r)
    if (!ctx.services.audio.sample('fart')) ctx.services.audio.sfx('soft')
  },

  // ---- Klart → firande → nytt bad ----------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._held = false
    if (this._charging?.view && !this._charging.view.destroyed) this._charging.view.destroy()
    this._charging = null
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    if (this._zacke && !this._zacke.destroyed) pop(this._zacke)
    // En glad pruttsvärm.
    this._foam.level = this._goalFoam // håll skummet på linjen under firandet
    for (let i = 0; i < 8; i++) {
      const r = 30 + Math.random() * 30
      const x = WALL_L + 60 + Math.random() * (WALL_R - WALL_L - 120)
      this._pushBubble(x, r, -2 - Math.random() * 2)
    }
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    ctx.progress.complete()
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('bad', (ctx.progress.get().custom?.bad | 0) + 1)
    this._roundTimer = gsap.delayedCall(1.5, () => this._alive && this._newRound(ctx))
  },

  _newRound(ctx) {
    if (!this._alive) return
    this._applyLevel()
    this._drawGoal()
    // Töm skummet mjukt.
    this._foamTween?.kill()
    const st = { v: this._foam.level }
    this._foamTween = gsap.to(st, {
      v: 0,
      duration: 0.6,
      ease: 'power1.in',
      onUpdate: () => {
        this._foam.level = st.v
        this._drawFoam()
      },
    })
    this._idle = 0
    this._firstPrutt = true // röst-cue redan given denna session
    this._resolving = false
  },

  // ---- Städning -----------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._held = false
    this._charging = null

    this._roundTimer?.kill()
    this._foamTween?.kill()
    this._duckGlide?.kill()

    // Bubblor är bara ticker-styrda Pixi-objekt → räcker att förstöra dem.
    this._bubbles?.forEach((b) => b.view && !b.view.destroyed && b.view.destroy())
    if (this._bubbles) this._bubbles.length = 0

    // Pekar-lyssnare.
    if (this._zacke && !this._zacke.destroyed) {
      this._zacke.off('pointerdown', this._zackeDown)
      this._zacke.off('pointerup', this._zackeUp)
      this._zacke.off('pointerupoutside', this._zackeUp)
    }
    if (this._waterArea && !this._waterArea.destroyed) this._waterArea.off('pointertap', this._waterTapHandler)
    if (this._duck && !this._duck.destroyed) {
      this._duck.off('pointerdown', this._duckDownH)
      this._duck.off('globalpointermove', this._duckMoveH)
      this._duck.off('pointerup', this._duckUpH)
      this._duck.off('pointerupoutside', this._duckUpH)
    }

    gsap.killTweensOf(this._zacke)
    gsap.killTweensOf(this._zacke?.scale)
    gsap.killTweensOf(this._duck)
    gsap.killTweensOf(this._duck?.scale)
    gsap.killTweensOf(this._foamGfx)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
