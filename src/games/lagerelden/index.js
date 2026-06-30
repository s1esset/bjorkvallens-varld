// Lägerelden — Zacke bygger en lägereld i skymningen (2–4 år). Barnet DRAR vedpinnar
// till bålplatsen (mer bränsle → högre, varaktigare låga), PUMPAR/SVEPER en bälg för
// att blåsa luft (lågan flammar upp, blir gulare/vitare och högre) och HÅLLER Zacke's
// marshmallow över glöden (drag) tills den blir GYLLENE. Tre kontroller påverkar
// utfallet: ved (_fuel), luft (_air) och marshmallowens läge — uppfyller ≥2-kravet.
//
// INGEN fara, INGET game-over: mer ved/luft ger bara en STÖRRE, gladare eld och
// SNABBARE gyllene-rostning. Lågan klampas (fyller aldrig skärmen) och dör aldrig
// (_fuel ≥ basnivå). Marshmallowen blir aldrig svart (färgmål = gyllene) och _toast
// sjunker aldrig. Missar är roliga (vingel + mjukt ljud). Mjuk auto-hjälp (idle-vindpust,
// basvärme, och en garanterad värme-boost efter ~25s) gör att succén alltid kommer.
//
// EXIT-SÄKERHET: hela eld-partikel-integratorn är TICKER-driven (egna hastigheter i en
// pool), ALDRIG gsap på en partikel — particlarna lever/dör i _update och hela
// _fireLayer rensas i destroy(). De få gsap-tweens som finns (bälg-squash, marshmallow-
// återgång, glöd-andning, firande) går via lib/feedback.js (exit-säkra) eller dödas i
// destroy(). Tickern tas bort och _root.destroy({children:true}) körs i destroy().
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { puff, sparkle, burst, pop, wiggle, breathe, floatText, bigCelebration } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Layout (designkoordinater 1280×720) ---
const FIRE_X = 640
const FIRE_BASE_Y = 560
const HAND = { x: 1092, y: 470 } // Zacke's hand där pinnen + marshmallowen sitter
const MARSH_REST = { x: 960, y: 470 } // marshmallowens viloposition framför Zacke

// --- Eld-tillstånd ---
const BASE_FUEL = 0.6 // _fuel faller aldrig under detta → elden dör aldrig
const BASE_HEAT = 0.6
const AIR_MAX = 3
const PART_CAP = 90 // mjukt partikeltak för prestanda

const IDLE_MS = 6000 // ms utan handling → vänlig röst-repris + vink
const ROAST_BOOST_MS = 25000 // håller man länge utan mål → garanterad värme-boost

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'lagerelden',
  titleSv: 'Lägerelden',
  icon: '🔥',
  category: 'roligt',
  input: 'mixed',
  ageRange: [2, 4],
  bundle: 'lagerelden',
  voiceIntro: 'Rosta marshmallows gyllene! Håll den över elden tills den blir gyllene.',

  init(ctx) {
    this._alive = true
    this._resolving = false

    // Tillstånd
    this._fuel = BASE_FUEL
    this._air = 0
    this._toast = 0
    this._heat = BASE_HEAT
    this._airLean = 0
    this._boost = 0
    this._idle = 0
    this._roastMs = 0
    this._holding = false

    // Engångs-röstrepliker
    this._saidFuel = false
    this._saidPump = false
    this._saidHalf = false

    // Ljud-strypning
    this._lastWhoosh = 0
    this._lastRoastSfx = 0
    this._lastSparkle = 0
    this._lastMarshDraw = -1

    // Partiklar
    this._parts = [] // { g, x, y, vx, vy, life, maxLife, r0 }
    this._pool = []
    this._pileLogs = []

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    const cfg = this._levelConfig(this._level)
    this._fuelMax = cfg.fuelMax
    this._hotR = cfg.hotR
    this._theme = cfg.theme
    this._order = cfg.order
    this._filled = 0
    this._windAmp = cfg.windAmp
    this._windFreq = cfg.windFreq
    this._windPhase = Math.random() * Math.PI * 2
    this._time = 0
    this._hotX = FIRE_X // lågans heta zon (svajar i sidled med vinden)

    this._flameTopY = FIRE_BASE_Y - 100

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Bakgrund (varm skymning + mark) som FÖRSTA barn.
    this._bg = createScene(this._theme, { ground: true })
    this._root.addChild(this._bg)

    // 2) Eldstad: mörk markskugga + ring av stenar kring bålet.
    this._hearth = makeHearth(this._hotR > 150 ? 168 : 150)
    this._hearth.eventMode = 'none'
    this._hearth.interactiveChildren = false
    this._root.addChild(this._hearth)

    // 3) Vedstapel-lager (korslagda vedpinnar som växer när man lägger på).
    this._pileLayer = new Container()
    this._pileLayer.position.set(0, 0)
    this._pileLayer.eventMode = 'none'
    this._pileLayer.interactiveChildren = false
    this._root.addChild(this._pileLayer)

    // 4) Bål-dropzon (osynlig, stor träffyta för DragController-veden + tap-tap).
    this._dropZone = new Graphics().circle(0, 0, 150).fill({ color: 0xffffff, alpha: 0 })
    this._dropZone.position.set(FIRE_X, FIRE_BASE_Y - 30)
    this._root.addChild(this._dropZone)

    // 5) Eld-lager: glödhalo (andas) + partiklar. Ovanpå veden, under marshmallow/bälg.
    this._fireLayer = new Container()
    this._fireLayer.position.set(FIRE_X, FIRE_BASE_Y)
    this._fireLayer.eventMode = 'none'
    this._fireLayer.interactiveChildren = false
    this._glow = new Graphics().circle(0, 0, 90).fill({ color: COLORS.orange, alpha: 0.18 })
    this._glow.eventMode = 'none'
    this._fireLayer.addChild(this._glow)
    this._root.addChild(this._fireLayer)
    this._glowBreathe = breathe(this._glow, { scale: 1.12, duration: 1.1 })

    // 6) "Het zon"-markör: svag gul oval över lågans topp (lyser starkare när elden är het).
    this._hotMark = new Graphics().ellipse(0, 0, 70, 34).fill({ color: 0xffe27a, alpha: 0.1 })
    this._hotMark.position.set(FIRE_X, 470)
    this._hotMark.eventMode = 'none'
    this._root.addChild(this._hotMark)

    // 7) Vedhög (källa): drag-bara pinnar nere till vänster (direkta _root-barn → root-koord).
    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._drag.addTarget(this._dropZone, (d) => d?.kind === 'ved', { hitRadius: 170 })
    this._logs = []
    const homes = [
      { x: 168, y: 612, rot: -0.35 },
      { x: 214, y: 596, rot: 0.18 },
      { x: 258, y: 614, rot: 0.5 },
    ]
    for (const h of homes) {
      const log = makeLog()
      log.position.set(h.x, h.y)
      log.rotation = h.rot
      log.hitArea = new Circle(0, 0, 60) // ≥96px träffyta
      this._root.addChild(log)
      const rec = this._drag.addItem(log, { kind: 'ved' }, {
        onCorrect: () => this._onWoodDropped(ctx, rec),
        onWrong: () => wiggle(log),
      })
      this._logs.push(rec)
    }

    // 8) Bälg (kontroll) nere till höger.
    this._bellows = makeBellows()
    this._bellows.position.set(1080, 600)
    this._bellows.hitArea = new Circle(0, 0, 100)
    this._bellows.eventMode = 'static'
    this._bellows.cursor = 'pointer'
    this._bellowsTop = this._bellows.getChildByLabel('top')
    this._onBellowsDown = (e) => this._bellowsDown(ctx, e)
    this._bellows.on('pointerdown', this._onBellowsDown)
    this._root.addChild(this._bellows)

    // 9) Zacke + pinne + marshmallow (till höger, vänd mot elden).
    this._zacke = makeZacke()
    this._zacke.position.set(1140, 470)
    this._zacke.eventMode = 'none'
    this._root.addChild(this._zacke)

    this._stick = new Graphics()
    this._stick.eventMode = 'none'
    this._root.addChild(this._stick)

    this._marsh = new Container()
    this._marshGfx = new Graphics()
    this._marshGfx.eventMode = 'none'
    this._marsh.addChild(this._marshGfx)
    this._drawMarsh(0)
    this._marsh.position.set(MARSH_REST.x, MARSH_REST.y)
    this._marsh.hitArea = new Circle(0, 0, 64) // ≥96px träffyta
    this._marsh.eventMode = 'static'
    this._marsh.cursor = 'pointer'
    this._onMarshDown = (e) => this._marshDown(ctx, e)
    this._marsh.on('pointerdown', this._onMarshDown)
    this._root.addChild(this._marsh)

    // 10) Order-fat uppe i mitten: tomma platser som fylls med gyllene marshmallows.
    this._orderLayer = new Container()
    this._orderLayer.eventMode = 'none'
    this._orderLayer.interactiveChildren = false
    this._root.addChild(this._orderLayer)
    this._buildOrder()

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivå-konfiguration -------------------------------------------------
  // MÅL: rosta `order` marshmallows GYLLENE (syns som tomma platser på fatet uppe).
  // Slumpad svårighet per nivå: antal i ordern + hur mycket vinden får lågan att
  // svaja i sidled (man håller marshmallowen där lågan ÄR just nu). Allt förlåtande.

  _levelConfig(level) {
    const theme = level <= 1 ? 'sunset' : 'night'
    const fuelMax = level <= 1 ? 4 : 6
    const hotR = level <= 1 ? 150 : level <= 3 ? 160 : 172
    // Order växer med nivån men med slump: 1–2 lågt, upp mot 3–4 senare.
    const base = 1 + Math.floor(level / 2)
    const order = clamp(base + (Math.random() < 0.5 ? 0 : 1), 1, 4)
    // Vind: ingen på nivå 0, sedan slumpad amplitud/fart som ökar lugnt med nivån.
    const windAmp = level === 0 ? 0 : clamp(24 + level * 12 + Math.random() * 30, 0, 120)
    const windFreq = 0.5 + Math.random() * 0.5 // svängningar/sek (lugnt)
    return { fuelMax, hotR, theme, order, windAmp, windFreq }
  },

  // ---- Order-fat (synligt mål) --------------------------------------------

  _buildOrder() {
    if (!this._orderLayer || this._orderLayer.destroyed) return
    this._orderLayer.removeChildren().forEach((c) => c.destroy({ children: true }))
    this._slots = []
    const n = this._order
    const gap = 64
    const totalW = (n - 1) * gap
    const x0 = FIRE_X - totalW / 2
    const y = 96
    // Fat (en mjuk avlång bricka under platserna).
    const plate = new Graphics()
      .roundRect(x0 - 46, y - 30, totalW + 92, 60, 30)
      .fill({ color: 0x6b4326, alpha: 0.85 })
      .roundRect(x0 - 38, y - 24, totalW + 76, 20, 14)
      .fill({ color: 0xffffff, alpha: 0.12 })
    plate.eventMode = 'none'
    this._orderLayer.addChild(plate)
    for (let i = 0; i < n; i++) {
      const slot = new Container()
      slot.position.set(x0 + i * gap, y)
      // Tom plats = streckad/blek marshmallow-kontur.
      const ghost = new Graphics().roundRect(-18, -24, 36, 48, 14).fill({ color: 0xffffff, alpha: 0.18 }).stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
      ghost.label = 'ghost'
      const fill = new Graphics() // ritas gyllene när platsen fylls
      fill.label = 'fill'
      fill.visible = false
      slot.addChild(ghost, fill)
      this._orderLayer.addChild(slot)
      this._slots.push(slot)
    }
  },

  _fillSlot(ctx, i) {
    const slot = this._slots?.[i]
    if (!slot || slot.destroyed) return
    const ghost = slot.getChildByLabel('ghost')
    const fill = slot.getChildByLabel('fill')
    if (ghost) ghost.visible = false
    if (fill && !fill.destroyed) {
      fill.clear()
        .roundRect(-18, -24, 36, 48, 14).fill(0xe8a93c).stroke({ width: 3, color: 0xb9842b })
        .roundRect(-11, -18, 10, 20, 6).fill({ color: 0xffffff, alpha: 0.25 })
      fill.visible = true
      pop(slot, { scale: 1.35 })
    }
    sparkle(ctx.fxLayer, slot.x, slot.y, { count: 6 })
  },

  // ---- Ved → bål ----------------------------------------------------------

  _onWoodDropped(ctx, rec) {
    this._addFuel(ctx)
    this._recycleLog(rec)
  },

  _addFuel(ctx) {
    if (!this._alive) return
    this._idle = 0
    this._fuel = Math.min(this._fuelMax, this._fuel + 1)

    // En korslagd 🪵 läggs synligt på högen.
    const log = new Text({ text: '🪵', style: { fontFamily: FONT.body, fontSize: 64 } })
    log.anchor.set(0.5)
    log.position.set(FIRE_X + (Math.random() * 60 - 30), 568 + (Math.random() * 8 - 4))
    log.rotation = Math.random() * 0.8 - 0.4
    log.eventMode = 'none'
    this._pileLayer.addChild(log)
    this._pileLogs.push(log)

    // Lågan hoppar till av nytt bränsle.
    this._air = Math.min(AIR_MAX, this._air + 0.25)
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, FIRE_X, 560, { count: 8, color: COLORS.orange })
    for (let i = 0; i < 6; i++) this._spawnParticle()
    if (!this._saidFuel) {
      this._saidFuel = true
      ctx.services.voice.say('Mer ved gör elden stor!')
    }
  },

  // Veden glider mjukt tillbaka till vedhögen → tar aldrig slut.
  _recycleLog(rec) {
    if (!this._alive || rec.view.destroyed) return
    rec.placed = false
    rec.view.eventMode = 'static'
    rec.view.alpha = 1
    gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.32, ease: 'back.out(1.4)' })
  },

  // ---- Bälg: tryck (liten pust) + svep (stor pust) ------------------------

  _bellowsDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._bellowsStart = { x: e.global.x, y: e.global.y }
    this._bellowsMax = 0
    this._onBellowsMove = (ev) => {
      const d = Math.hypot(ev.global.x - this._bellowsStart.x, ev.global.y - this._bellowsStart.y)
      if (d > this._bellowsMax) this._bellowsMax = d
    }
    this._onBellowsUp = () => this._bellowsUp(ctx)
    this._bellows.on('globalpointermove', this._onBellowsMove)
    this._bellows.on('pointerup', this._onBellowsUp)
    this._bellows.on('pointerupoutside', this._onBellowsUp)
  },

  _bellowsUp(ctx) {
    this._detachBellows()
    const strength = clamp(this._bellowsMax / 120, 0.4, 1.6)
    this._pump(ctx, strength)
  },

  _detachBellows() {
    if (this._onBellowsMove) this._bellows.off('globalpointermove', this._onBellowsMove)
    if (this._onBellowsUp) {
      this._bellows.off('pointerup', this._onBellowsUp)
      this._bellows.off('pointerupoutside', this._onBellowsUp)
    }
    this._onBellowsMove = this._onBellowsUp = null
  },

  _pump(ctx, strength) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._air = Math.min(AIR_MAX, this._air + 0.5 * strength)
    this._airLean = (Math.random() * 2 - 1) * 0.5

    // Bälg-handtaget trycks ihop och studsar tillbaka.
    if (this._bellowsTop && !this._bellowsTop.destroyed) {
      gsap.killTweensOf(this._bellowsTop.scale)
      gsap.timeline()
        .to(this._bellowsTop.scale, { y: 0.55, duration: 0.07, ease: 'power2.in' })
        .to(this._bellowsTop.scale, { y: 1, duration: 0.2, ease: 'back.out(2.2)' })
    }

    // Direkt visuell respons (<100ms): ett svall av extra eldpartiklar uppåt.
    const extra = 6 + ((strength * 6) | 0)
    for (let i = 0; i < extra; i++) this._spawnParticle(true)

    const now = performance.now()
    if (now - this._lastWhoosh > 120) {
      this._lastWhoosh = now
      ctx.services.audio.sfx('whoosh')
    }
    if (!this._saidPump) {
      this._saidPump = true
      ctx.services.voice.say('Blås på elden — titta så den växer!')
    }
  },

  // ---- Marshmallow: eget pekar-grepp (fri placering över elden) -----------

  _marshDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._holding = true
    gsap.killTweensOf(this._marsh)
    gsap.killTweensOf(this._marsh.scale)
    gsap.to(this._marsh.scale, { x: 1.1, y: 1.1, duration: 0.12 })
    ctx.services.audio.sfx('tap')
    this._onMarshMove = (ev) => {
      if (!this._holding) return
      const p = this._root.toLocal(ev.global)
      this._marsh.x = clamp(p.x, 120, 1180)
      this._marsh.y = clamp(p.y, 120, 660)
    }
    this._onMarshUp = () => this._marshUp(ctx)
    this._marsh.on('globalpointermove', this._onMarshMove)
    this._marsh.on('pointerup', this._onMarshUp)
    this._marsh.on('pointerupoutside', this._onMarshUp)
  },

  _marshUp() {
    if (!this._alive) return
    this._holding = false
    this._detachMarsh()
    gsap.to(this._marsh.scale, { x: 1, y: 1, duration: 0.15 })
    const hotY = this._flameTopY + 20
    const d = Math.hypot(this._marsh.x - this._hotX, this._marsh.y - hotY)
    if (d < this._hotR) {
      // Släppt nära den heta zonen → hänger kvar och fortsätter rostas (auto-hjälp).
      gsap.to(this._marsh, { x: this._hotX + 50, y: this._flameTopY + 10, duration: 0.3, ease: 'power2.out' })
    } else {
      // Annars glider den mjukt tillbaka till vilopositionen (men _toast behålls).
      gsap.to(this._marsh, { x: MARSH_REST.x, y: MARSH_REST.y, duration: 0.5, ease: 'power2.inOut' })
    }
  },

  _detachMarsh() {
    if (this._onMarshMove) this._marsh.off('globalpointermove', this._onMarshMove)
    if (this._onMarshUp) {
      this._marsh.off('pointerup', this._onMarshUp)
      this._marsh.off('pointerupoutside', this._onMarshUp)
    }
    this._onMarshMove = this._onMarshUp = null
  },

  _drawMarsh(toast) {
    if (Math.abs(toast - this._lastMarshDraw) < 0.015 && this._lastMarshDraw >= 0) return
    this._lastMarshDraw = toast
    const col = lerpColor(0xfff7e6, 0xe8a93c, toast)
    const edge = lerpColor(0xe8dcc0, 0xb9842b, toast)
    const g = this._marshGfx
    if (g.destroyed) return
    g.clear()
    g.roundRect(-20, -26, 40, 52, 16).fill(col).stroke({ width: 3, color: edge })
    g.roundRect(-12, -20, 11, 22, 6).fill({ color: 0xffffff, alpha: 0.35 * (1 - toast * 0.6) })
  },

  // ---- Eld-partiklar (ticker-driven pool, ALDRIG gsap) --------------------

  _spawnParticle(fromPump = false) {
    if (this._parts.length >= PART_CAP) return
    let g = this._pool.pop()
    if (!g) {
      g = new Graphics()
      g.eventMode = 'none'
      this._fireLayer.addChild(g)
    }
    g.visible = true
    const heat = this._heat
    const r0 = 5 + Math.random() * 6
    const x = (Math.random() * 2 - 1) * (8 + Math.random() * 32)
    const vy = -(1.6 + heat * 1.4 + Math.random() * 0.8) * (fromPump ? 1.25 : 1)
    const vx = (Math.random() * 2 - 1) * 0.5
    this._parts.push({ g, x, y: 0, vx, vy, life: 0, maxLife: 26 + Math.random() * 20, r0 })
  },

  _flameColor(t, heat) {
    const hot = clamp((heat - BASE_HEAT) / 2.2, 0, 1)
    const start = lerpColor(0xffe27a, 0xfff3b0, hot) // hetare = vitare-gul start
    if (t < 0.45) return lerpColor(start, COLORS.orange, t / 0.45)
    if (t < 0.75) return lerpColor(COLORS.orange, COLORS.red, (t - 0.45) / 0.3)
    return lerpColor(COLORS.red, 0x9a8b7a, (t - 0.75) / 0.25) // tonar mot grårök
  },

  // ---- Ticker -------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = clamp(ticker.deltaMS / 16.67, 0, 3)

    // Decay: luft pyser ut, ved sjunker långsamt (aldrig under basnivå).
    this._air *= Math.pow(0.96, dt)
    this._fuel = Math.max(BASE_FUEL, this._fuel - 0.0008 * dt)
    this._airLean *= Math.pow(0.92, dt)

    // Härledd värme + mjukt lerpad lågtopp.
    const heat = BASE_HEAT + this._fuel * 0.12 + this._air * 0.5 + this._boost
    this._heat = heat
    const flameH = Math.min(60 + heat * 70, 300)
    const target = FIRE_BASE_Y - flameH
    this._flameTopY += (target - this._flameTopY) * Math.min(1, 0.1 * dt)

    // Vind: lågans heta zon svajar mjukt i sidled (man håller marshmallowen DÄR lågan är).
    this._time += ticker.deltaMS / 1000
    const windX = this._windAmp * Math.sin(this._time * this._windFreq * Math.PI * 2 + this._windPhase)
    this._hotX += (FIRE_X + windX - this._hotX) * Math.min(1, 0.15 * dt)
    if (this._fireLayer && !this._fireLayer.destroyed) this._fireLayer.x = this._hotX
    // Lågan lutar i vindens riktning (utöver pust-flickret).
    if (this._windAmp > 0) {
      const lean = Math.cos(this._time * this._windFreq * Math.PI * 2 + this._windPhase) * (this._windAmp / 120) * 0.5
      this._airLean += (lean - this._airLean) * Math.min(1, 0.1 * dt)
    }

    // Glöd + het-zon-markör lyser med värmen och följer den heta zonen.
    const hot = clamp((heat - BASE_HEAT) / 2.2, 0, 1)
    if (this._glow && !this._glow.destroyed) this._glow.alpha = 0.16 + hot * 0.12
    if (this._hotMark && !this._hotMark.destroyed) {
      this._hotMark.x = this._hotX
      this._hotMark.y = this._flameTopY + 6
      this._hotMark.alpha = 0.08 + hot * 0.18
    }

    // Spawna nya partiklar (mängd skalar med värmen, klampat av PART_CAP).
    let spawn = Math.round((1.0 + heat * 1.6) * dt)
    while (spawn-- > 0) this._spawnParticle()

    // Integrera + rita om + döda partiklar.
    for (let i = this._parts.length - 1; i >= 0; i--) {
      const p = this._parts[i]
      p.life += dt
      const t = p.life / p.maxLife
      if (t >= 1 || p.g.destroyed) {
        if (!p.g.destroyed) {
          p.g.visible = false
          this._pool.push(p.g)
        }
        this._parts.splice(i, 1)
        continue
      }
      p.vx += this._airLean * 0.08 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy *= Math.pow(0.985, dt)
      const r = Math.max(0.5, p.r0 * (1 - 0.7 * t))
      const col = this._flameColor(t, heat)
      const alpha = t < 0.75 ? 1 - t * 0.4 : (1 - t) * 0.9
      const g = p.g
      g.clear().circle(0, 0, r).fill({ color: col, alpha })
      if (t < 0.5) g.circle(0, 0, r * 0.45).fill({ color: 0xfff7d0, alpha: alpha * 0.7 }) // glansig kärna
      g.position.set(p.x, p.y)
    }

    // Rita om Zacke's pinne (hand → marshmallow) varje frame. Göms medan en
    // gyllene marshmallow flyger till fatet (_resolving) så pinnen inte sträcks dit upp.
    if (this._stick && !this._stick.destroyed) {
      this._stick.clear()
      if (!this._resolving) {
        this._stick
          .moveTo(HAND.x, HAND.y).lineTo(this._marsh.x, this._marsh.y).stroke({ width: 7, color: COLORS.brown })
          .moveTo(HAND.x, HAND.y).lineTo(this._marsh.x, this._marsh.y).stroke({ width: 2.5, color: 0xb98a5c, alpha: 0.7 })
      }
    }

    // Marshmallow-rostning: nära den (svajande) heta zonen + het eld = snabbare. _toast sjunker ALDRIG.
    if (!this._resolving) {
      const hotY = this._flameTopY + 20
      const dist = Math.hypot(this._marsh.x - this._hotX, this._marsh.y - hotY)
      if (dist < this._hotR) {
        const proximity = 1 - dist / this._hotR
        this._toast = Math.min(1, this._toast + (0.1 + heat * 0.18) * proximity * (dt / 60))
        this._drawMarsh(this._toast)
        this._roastMs += ticker.deltaMS
        this._idle = 0

        // Mjuk röst + gnistor medan den rostas.
        const now = performance.now()
        if (now - this._lastSparkle > 700) {
          this._lastSparkle = now
          sparkle(ctx.fxLayer, this._marsh.x, this._marsh.y, { count: 4 })
        }
        if (now - this._lastRoastSfx > 1400) {
          this._lastRoastSfx = now
          ctx.services.audio.sfx('soft')
        }
        if (!this._saidHalf && this._toast >= 0.5) {
          this._saidHalf = true
          ctx.services.voice.say('Snart är den klar!')
        }

        // Auto-hjälp: håller man länge utan mål → garanterad värme-boost ("elden tar fart").
        if (this._roastMs > ROAST_BOOST_MS && this._toast < 1) this._boost = 0.9
      }
      if (this._toast >= 1) this._onGolden(ctx)
    }

    // Idle: vänlig röst-repris + vink på närmaste kontroll + liten hjälpsam vindpust.
    if (!this._resolving) {
      this._idle += ticker.deltaMS
      if (this._idle >= IDLE_MS) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        this._air = Math.min(AIR_MAX, this._air + 0.4) // en hjälpsam gust → elden växer lite
        if (this._toast > 0.05 && !this._marsh.destroyed) pop(this._marsh)
        else if (this._logs[0] && !this._logs[0].view.destroyed) wiggle(this._logs[0].view)
      }
    }
  },

  // ---- Mål: en marshmallow gyllene → flyger till fatet; hela ordern klar → firande ---

  _onGolden(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._holding = false
    this._detachMarsh()
    this._drawMarsh(1)

    if (!this._marsh.destroyed) pop(this._marsh, { scale: 1.25 })
    sparkle(ctx.fxLayer, this._marsh.x, this._marsh.y, { count: 8 })
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(randomFrom(['Gyllene!', 'Den är klar!', 'Mums, gyllene!']))

    // Marshmallowen flyger upp till sin plats på fatet.
    const slot = this._slots?.[this._filled]
    const tx = slot ? slot.x : FIRE_X
    const ty = slot ? slot.y : 96
    gsap.killTweensOf(this._marsh)
    this._flyTimer = gsap.to(this._marsh, {
      x: tx, y: ty, duration: 0.6, ease: 'power2.inOut',
      onComplete: () => {
        if (!this._alive) return
        this._fillSlot(ctx, this._filled)
        this._filled++
        if (this._filled >= this._order) {
          this._winOrder(ctx)
        } else {
          // Ny vit marshmallow att rosta för nästa plats.
          this._toast = 0
          this._lastMarshDraw = -1
          this._drawMarsh(0)
          this._saidHalf = false
          if (!this._marsh.destroyed) {
            this._marsh.position.set(MARSH_REST.x, MARSH_REST.y)
            this._marsh.scale.set(1)
            pop(this._marsh)
          }
          this._resolving = false
          this._idle = 0
          ctx.services.voice.say('En till! Rosta nästa.')
        }
      },
    })
  },

  // Hela ordern klar → stort firande + ny (svårare, slumpad) eld/order.
  _winOrder(ctx) {
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, FIRE_X, 110, { count: 16 })
    floatText(ctx.fxLayer, FIRE_X, 64, '😋', { fontSize: 64 })

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('marshmallows', (ctx.progress.get().custom?.marshmallows || 0) + this._order)
    ctx.progress.complete()

    this._goldenTimer = gsap.delayedCall(1.8, () => {
      if (this._alive) this._nextFire(ctx)
    })
  },

  _nextFire(ctx) {
    if (!this._alive) return
    this._level += 1
    const cfg = this._levelConfig(this._level)

    // Ev. ny stämning/eldstadsstorlek på högre nivåer.
    if (cfg.theme !== this._theme) {
      this._theme = cfg.theme
      if (this._bg && !this._bg.destroyed) this._bg.destroy({ children: true })
      this._bg = createScene(this._theme, { ground: true })
      this._root.addChildAt(this._bg, 0)
    }
    this._fuelMax = cfg.fuelMax
    this._hotR = cfg.hotR

    // Ny, slumpad order + vind för den här nivån.
    this._order = cfg.order
    this._filled = 0
    this._windAmp = cfg.windAmp
    this._windFreq = cfg.windFreq
    this._windPhase = Math.random() * Math.PI * 2
    this._buildOrder()

    // Nollställ rosten — en ny, vit marshmallow. Inga sjunkande värden, ingen poäng.
    this._toast = 0
    this._lastMarshDraw = -1
    this._drawMarsh(0)
    this._fuel = BASE_FUEL
    this._boost = 0
    this._roastMs = 0
    this._saidHalf = false

    // Töm vedhögen tillbaka till bas (ny eld att bygga upp).
    for (const log of this._pileLogs) if (!log.destroyed) log.destroy()
    this._pileLogs = []

    gsap.killTweensOf(this._marsh)
    this._marsh.position.set(MARSH_REST.x, MARSH_REST.y)
    this._marsh.scale.set(1)

    this._resolving = false
    this._idle = 0
    ctx.services.voice.say('En ny eld! Lägg på ved igen.')
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)

    this._goldenTimer?.kill?.()
    this._flyTimer?.kill?.()
    this._glowBreathe?.kill?.()

    this._detachBellows()
    this._detachMarsh()
    if (this._bellows && !this._bellows.destroyed) {
      this._bellows.off('pointerdown', this._onBellowsDown)
      if (this._bellowsTop && !this._bellowsTop.destroyed) gsap.killTweensOf(this._bellowsTop.scale)
    }
    if (this._marsh && !this._marsh.destroyed) {
      this._marsh.off('pointerdown', this._onMarshDown)
      gsap.killTweensOf(this._marsh)
      gsap.killTweensOf(this._marsh.scale)
    }
    if (this._glow && !this._glow.destroyed) gsap.killTweensOf(this._glow)
    for (const rec of this._logs || []) {
      if (rec.view && !rec.view.destroyed) gsap.killTweensOf(rec.view)
    }
    this._drag?.destroy()

    // Eldpartiklar lever bara i tickern → säkert att bara nolla referenserna.
    this._parts = []
    this._pool = []
    this._pileLogs = []

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Eldstad: mörk markskugga-ellips + ring av grå stenar i ellipsbåge.
function makeHearth(rx = 150) {
  const c = new Container()
  const ry = 42
  const shadow = new Graphics().ellipse(FIRE_X, FIRE_BASE_Y + 16, rx + 24, ry + 14).fill({ color: COLORS.shadow, alpha: 0.18 })
  c.addChild(shadow)
  const n = 7
  const stoneCol = lerpColor(COLORS.inkSoft, 0xffffff, 0.35)
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.08 + (0.84 * i) / (n - 1)) // främre båge
    const sx = FIRE_X + Math.cos(a) * rx
    const sy = FIRE_BASE_Y + 20 + Math.sin(a) * ry
    const r = 22 + Math.random() * 8
    const stone = new Graphics()
      .circle(0, 0, r).fill(stoneCol)
      .circle(-r * 0.3, -r * 0.3, r * 0.4).fill({ color: 0xffffff, alpha: 0.25 })
    stone.position.set(sx, sy)
    c.addChild(stone)
  }
  return c
}

// En dragbar vedpinne (🪵 emoji).
function makeLog() {
  const c = new Container()
  const t = new Text({ text: '🪵', style: { fontFamily: FONT.body, fontSize: 70 } })
  t.anchor.set(0.5)
  t.eventMode = 'none'
  c.addChild(t)
  return c
}

// Bälg: brun träkropp + ljusare glansstreck + rörlig handtagshalva (label "top") + 💨-hint.
function makeBellows() {
  const c = new Container()
  // Nedre fast halva.
  const base = new Graphics()
    .moveTo(-70, 18).lineTo(40, 8).lineTo(40, 30).lineTo(-70, 40).closePath().fill(COLORS.brown)
  // Pip mot elden (uppåt-vänster).
  const nozzle = new Graphics().roundRect(-94, 4, 30, 14, 6).fill(0x6b4326)
  // Övre rörliga halva (squashas vid pump).
  const top = new Graphics()
  top.label = 'top'
  top.moveTo(-70, -2).lineTo(40, 6).lineTo(40, -18).lineTo(-70, -22).closePath().fill(lerpColor(COLORS.brown, 0xffffff, 0.18))
  top.moveTo(-64, -14).lineTo(30, -6).stroke({ width: 4, color: 0xffffff, alpha: 0.25 })
  // Handtag.
  const grip = new Graphics().circle(34, -8, 12).fill(0x6b4326)
  const hint = new Text({ text: '💨', style: { fontFamily: FONT.body, fontSize: 40 } })
  hint.anchor.set(0.5)
  hint.position.set(-108, -6)
  hint.eventMode = 'none'
  c.addChild(nozzle, base, top, grip, hint)
  return c
}

// Zacke: glad pojke vänd mot elden (vänster). Programmatisk Graphics.
function makeZacke() {
  const c = new Container()
  // Kropp.
  const body = new Graphics().roundRect(-2, 28, 56, 70, 22).fill(COLORS.blue)
  // Huvud (varm hudton).
  const skin = 0xf6b78a
  const head = new Graphics().circle(0, 0, 38).fill(skin)
  // Hår.
  const hair = new Graphics()
  hair.arc(0, 0, 39, Math.PI, Math.PI * 2).fill(0x5a3a23)
  hair.ellipse(0, -30, 40, 18).fill(0x5a3a23)
  // Ögon (vänd vänster → lite åt vänster) + leende.
  const eyes = new Graphics()
    .circle(-16, -2, 4.5).fill(COLORS.ink)
    .circle(2, -2, 4.5).fill(COLORS.ink)
  const smile = new Graphics().arc(-7, 8, 14, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 4, color: COLORS.ink, cap: 'round' })
  // Kind.
  const cheek = new Graphics().circle(-22, 10, 7).fill({ color: COLORS.pink, alpha: 0.5 })
  c.addChild(body, hair, head, cheek, eyes, smile)
  return c
}
