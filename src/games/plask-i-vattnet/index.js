// Plask i Vattnet — lugn utforskande FYSIKlek (3–5 år). Barnet drar (eller tap-tap:ar)
// föremål från hyllan upptill ner i en stor glasvattentank: PLASK! Nu är vattnet en
// RIKTIG matter.js-värld med FLYTKRAFT: lätta saker (and, båt, löv, badring, äpple…)
// gungar mjukt upp och GUPPAR vid ytan, tunga saker (sten, nyckel, mynt, ankare…)
// sjunker lugnt till botten. Inget är fel — tanken tar emot ALLT, släpp utanför snäpper
// mjukt hem, varje plask ger ljud + ring + glad röst som NAMNGER vad som flyter/sjunker
// ("Anden flyter!", "Stenen sjunker!"). När alla föremål i rundan provats firar vi
// (delat firande + stjärna + klistermärke) och en ny, varierad uppsättning dyker upp —
// oändlig lek, ingen timer, ingen poäng. Att trycka på vattnet ger ett litet glatt plask
// som får flytarna att guppa till. Allt ritas programmatiskt (Pixi Graphics + emoji).
//
// FLYTKRAFT-recept (se ctx.services / lib/physics.js):
//   varje föremål blir en dynamisk cirkelkropp; varje bildruta beräknar vi hur djupt den
//   är nedsänkt och lägger på en UPPÅT-kraft ∝ nedsänkningsdjup × floatFactor. Eftersom
//   både gravitation och flytkraft skalar med massan blir beteendet massoberoende:
//   floatFactor > 1 ⇒ netto uppåt (gungar vid ytan), < 1 ⇒ netto nedåt (sjunker sakta).
//   Vattenmotstånd (hastighetsdämpning) + hastighetstak håller rörelsen LUGN och gör att
//   inget kan studsa eller skjuta ur tanken; en svag bana-fjäder + vaggning ger liv.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { puff, ripple, wiggle, pop, bounceIn, sparkle } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ---- Tank/vatten i designkoordinater -------------------------------------
const TANK = { x: 390, y: 250, w: 500, h: 440, r: 28 } // glasbehållare (390..890, 250..690)
const WATER = { x: 398, y: 330, w: 484, h: 352, r: 18 } // vattenkropp (398..882, 330..682)
const SURFACE_Y = 330 // vattenytan (flytkraftens nollinje)
const TANK_CX = 640 // tankens mitt = drag-mål + nedslagspunkt
const TANK_CY = 470
const SHELF_Y = 150 // hyllraden upptill
const SHELF_X = [190, 326, 462, 818, 954, 1090] // 6 platser (mitten fri för tank/header)

// ---- Fysik-väggar (tankens insida) ---------------------------------------
const WALL_L = 414 // vänster innervägg
const WALL_R = 866 // höger innervägg
const FLOOR_TOP = 672 // golvets ovansida (föremål vilar med center ~ FLOOR_TOP - r)

// ---- Föremål --------------------------------------------------------------
const BODY_R = 38 // fysikradie
const EMOJI_SIZE = 80
const HIT_R = 56 // osynlig cirkel-träffyta, radie 56 -> Ø112px ≥ 96px (24px lucka kvar till grannen)

// ---- Flytkraftskonstanter (lugnt inställda) -------------------------------
const GRAV_Y = 0.9 // tankens gravitation (matter: kraft = massa·GRAV_Y·0.001 per steg)
const BUOY_BASE = GRAV_Y * 0.001 // flytkraftens bas = exakt neutral vid frac·floatFactor = 1
const FLOAT_FACTOR = 1.6 // flytare: netto uppåt -> gungar med ~62% nedsänkt vid ytan
const SINK_FACTOR = 0.4 // sjunkare: netto nedåt -> glider sakta till botten
const DRAG = 0.93 // vattenmotstånd per bildruta -> lugnt, aldrig studsigt/skakigt
const BOB_AMP = 0.0007 // litet guppande lyft vid ytan (bara flytare)
const BOB_W = 1.8 // långsammare gupp -> lugnare, mjukare vattenkänsla
const SWAY_AMP = 0.00025 // mjuk sidledsvaggning (liv)
const SWAY_W = 1.4
const SPRING_K = 0.00003 // svag "hitta din plats"-fjäder mot tilldelad bana
const MAXF_A = 0.0008 // tak på sidledsacceleration (håller fjädern snäll)
const MAX_V = 10 // hastighetstak -> kan ALDRIG skjuta ur tanken
const ANG_DAMP = 0.9 // rotationsdämpning -> föremål håller sig ~upprätta

const ROUND_SIZE = 6 // antal föremål per runda (fyller hyllans 6 platser)

// ---- Upptäckts-logg (två sidohyllor "Flyter"/"Sjunker") -------------------
// Varje testat föremål lägger EN miniatyr i rätt hylla och STANNAR där över
// rundor (och sessioner, via progress.custom) -> ett växande, ordlöst mönster.
const LOG_FLOAT_X = 82 // vänster sidohylla (utanför tanken)
const LOG_SINK_X = 1198 // höger sidohylla
const LOG_HEAD_Y = 214 // rubrik-y
const LOG_FIRST_Y = 300 // första miniatyrens y
const LOG_STEP = 46 // radavstånd mellan miniatyrer
const LOG_MAX = 8 // en hylla svämmar aldrig över (poolen har 8 av varje)

// ---- Gissa först (valfritt, no-fail) -------------------------------------
// När ett föremål TAP-markeras dyker en liten tankebubbla + två stora ikon-
// knappar upp: 🔼 flyter / 🔽 sjunker. Rätt gissning -> extra gnistor + jubel;
// fel -> mjukt "Vi ser efter!" och plasket avslöjar svaret. Aldrig straff; den
// som bara drar-och-släpper ser aldrig knapparna (ren plask-lek för de yngsta).
const GUESS_Y = 196 // knapparnas y (fri mitt-topp ovanför tanken)

// Föremålspooler med svenska NAMN (bestämd form -> "Anden flyter!", "Stenen sjunker!").
const POOL_FLOAT = [
  { emoji: '🦆', name: 'Anden' },
  { emoji: '🍃', name: 'Lövet' },
  { emoji: '🪵', name: 'Trästocken' },
  { emoji: '🛟', name: 'Badringen' },
  { emoji: '⛵', name: 'Båten' },
  { emoji: '🍎', name: 'Äpplet' },
  { emoji: '🦢', name: 'Svanen' },
  { emoji: '⚽', name: 'Bollen' },
]
const POOL_SINK = [
  { emoji: '🪨', name: 'Stenen' },
  { emoji: '🔑', name: 'Nyckeln' },
  { emoji: '🥄', name: 'Skeden' },
  { emoji: '🪙', name: 'Myntet' },
  { emoji: '⚓', name: 'Ankaret' },
  { emoji: '🔩', name: 'Skruven' },
  { emoji: '🔨', name: 'Hammaren' },
  { emoji: '⚙️', name: 'Kugghjulet' },
]

const IDLE_LINES = ['Plaska lite till!', 'Släpp en sak till i vattnet!', 'Vad flyter och vad sjunker?']
const JUMPERS = ['🐟', '🐠', '🐡', '🦆'] // glad hoppare vid firandet

export default {
  id: 'plask-i-vattnet',
  titleSv: 'Plask i Vattnet',
  icon: '💧',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'plask-i-vattnet',
  voiceIntro: 'Släpp sakerna i vattnet och se vad som flyter och vad som sjunker!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._t = 0
    this._dropped = 0
    this._celebrating = false
    this._itemViews = [] // alla rundans föremåls-containrar (hylla + i vatten)
    this._objects = [] // i-vatten-objekt: { body, view, floats, floatFactor, r, homeX, phase }
    this._logIcons = [] // alla miniatyrer i upptäckts-hyllorna (för tween-städ)
    this._guessItem = null // vilket markerat föremål gissningen gäller
    this._guess = null // 'float' | 'sink' | null
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik utan standardväggar -> vi bygger tankens egna insidor (golv + sidor).
    this._phys = new PhysicsWorld({ gravityY: GRAV_Y, walls: [] })
    this._buildTankBodies()

    this._buildTank(ctx)
    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Fysikkroppar för tanken (statiska) ---------------------------------

  _buildTankBodies() {
    const T = 60 // väggtjocklek (rejäl -> inget kan tunnla igenom)
    const cx = (WALL_L + WALL_R) / 2
    // Golv.
    this._phys.rectangle(cx, FLOOR_TOP + T / 2, WALL_R - WALL_L + T * 2, T, {
      isStatic: true,
      restitution: 0.04,
      friction: 0.6,
      label: 'tankfloor',
    })
    // Sidoväggar (höga -> täcker även ovanför ytan, så inget kan glida ut i sidled).
    this._phys.rectangle(WALL_L - T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3, label: 'tankwall' })
    this._phys.rectangle(WALL_R + T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3, label: 'tankwall' })
  },

  // ---- Scenbyggen ---------------------------------------------------------

  _buildTank(ctx) {
    // Bakgrund (dekorativ — släpper tap igenom).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'none'
    this._root.addChild(bg)

    // Glas (transparent + vit rim).
    const glass = new Graphics()
      .roundRect(TANK.x, TANK.y, TANK.w, TANK.h, TANK.r)
      .fill({ color: 0x9fd8f0, alpha: 0.18 })
      .stroke({ width: 8, color: 0xffffff, alpha: 0.7 })
    glass.eventMode = 'none'
    this._root.addChild(glass)

    // Vattenkropp (halvtransparent, lite indrag innanför glaset).
    const water = new Graphics().roundRect(WATER.x, WATER.y, WATER.w, WATER.h, WATER.r).fill({ color: 0x4aa3df, alpha: 0.45 })
    water.eventMode = 'none'
    this._root.addChild(water)

    // Ambient: små bubblor som driver uppåt (ticker-driven, exit-säker).
    this._buildBubbles()

    // Ljus, lätt guppande ytlinje (dekorativ).
    const line = new Graphics().roundRect(WATER.x, -4, WATER.w, 8, 4).fill({ color: 0xffffff, alpha: 0.35 })
    line.position.set(0, SURFACE_Y)
    line.eventMode = 'none'
    this._root.addChild(line)
    this._surfaceTween = gsap.to(line, { y: SURFACE_Y + 4, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Osynligt drag-mål som täcker hela tanken (generös träffzon för tap-tap).
    const target = new Container()
    target.position.set(TANK_CX, TANK_CY)
    target.hitArea = new Circle(0, 0, 260)
    this._waterTapHandler = (e) => this._waterTap(ctx, e)
    target.on('pointertap', this._waterTapHandler) // registreras FÖRE drag-målets _tap
    this._tankView = target
    this._root.addChild(target)

    this._buildLogs(ctx) // två sidohyllor "Flyter"/"Sjunker" (upptäckts-logg)
    this._buildGuessUi(ctx) // gissa-först-knappar (dolda tills ett föremål markeras)
  },

  // ---- Upptäckts-logg (sidohyllor) ----------------------------------------

  _buildLogs(ctx) {
    this._logFloat = this._makeLogPanel(LOG_FLOAT_X, 'Flyter', '🔼', COLORS.green)
    this._logSink = this._makeLogPanel(LOG_SINK_X, 'Sjunker', '🔽', COLORS.blue)
    // Fyll från sparad logg -> upptäckter stannar mellan rundor OCH sessioner.
    const cust = ctx.progress.get().custom || {}
    ;(cust.floatLog || []).forEach((e) => this._addLogIcon(this._logFloat, e, false))
    ;(cust.sinkLog || []).forEach((e) => this._addLogIcon(this._logSink, e, false))
  },

  _makeLogPanel(cx, label, arrow, color) {
    const panel = new Container()
    panel.position.set(cx, 0)
    panel.eventMode = 'none'
    panel.interactiveChildren = false
    const bg = new Graphics()
      .roundRect(-56, 196, 112, 466, 22)
      .fill({ color, alpha: 0.14 })
      .stroke({ width: 3, color, alpha: 0.5 })
    const head = new Text({
      text: `${arrow}\n${label}`,
      style: { fontFamily: FONT.display, fontSize: 24, fontWeight: '700', fill: COLORS.inkSoft, align: 'center' },
    })
    head.anchor.set(0.5, 0)
    head.position.set(0, LOG_HEAD_Y)
    panel.addChild(bg, head)
    panel._items = []
    this._root.addChild(panel)
    return panel
  },

  _addLogIcon(panel, emoji, animate = true) {
    if (!panel || panel.destroyed || panel._items.length >= LOG_MAX) return
    const t = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 40 } })
    t.anchor.set(0.5)
    t.position.set(0, LOG_FIRST_Y + panel._items.length * LOG_STEP)
    t.eventMode = 'none'
    panel.addChild(t)
    panel._items.push(t)
    this._logIcons.push(t)
    if (animate) bounceIn(t)
  },

  // Lägg (om ny) det testade föremålet i rätt hylla. Varje sak visas EN gång ->
  // mönstret "vad flyter / vad sjunker" byggs upp lugnt över rundor.
  _logItem(ctx, data) {
    const panel = data.floats ? this._logFloat : this._logSink
    const key = data.floats ? 'floatLog' : 'sinkLog'
    const list = (ctx.progress.get().custom || {})[key] || []
    if (list.includes(data.emoji)) return
    ctx.progress.setCustom(key, [...list, data.emoji].slice(-LOG_MAX))
    this._addLogIcon(panel, data.emoji, true)
  },

  // ---- Gissa först (valfri tankebubbla + två ikon-knappar) ----------------

  _buildGuessUi(ctx) {
    const ui = new Container()
    ui.visible = false // syns bara medan ett föremål är TAP-markerat
    ui.eventMode = 'passive'
    this._root.addChild(ui)
    this._guessUi = ui

    const bubble = new Graphics()
      .roundRect(494, 104, 292, 52, 26)
      .fill({ color: COLORS.white, alpha: 0.92 })
      .stroke({ width: 3, color: 0xbfeefa, alpha: 0.9 })
    bubble.eventMode = 'none'
    const q = new Text({
      text: 'Flyter eller sjunker?',
      style: { fontFamily: FONT.display, fontSize: 26, fontWeight: '700', fill: COLORS.inkSoft },
    })
    q.anchor.set(0.5)
    q.position.set(640, 130)
    q.eventMode = 'none'
    ui.addChild(bubble, q)

    this._guessBtnFloat = this._makeGuessBtn(ctx, 566, '🔼', COLORS.green, 'float')
    this._guessBtnSink = this._makeGuessBtn(ctx, 714, '🔽', COLORS.blue, 'sink')
    ui.addChild(this._guessBtnFloat, this._guessBtnSink)
  },

  _makeGuessBtn(ctx, x, arrow, color, kind) {
    const b = new Container()
    b.position.set(x, GUESS_Y)
    const disc = new Graphics().circle(0, 0, 52).fill({ color, alpha: 0.92 }).stroke({ width: 5, color: 0xffffff, alpha: 0.9 })
    disc.eventMode = 'none'
    const a = new Text({ text: arrow, style: { fontFamily: FONT.body, fontSize: 52 } })
    a.anchor.set(0.5)
    a.eventMode = 'none'
    b.addChild(disc, a)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    b.hitArea = new Circle(0, 0, 60) // Ø120 ≥ 96px
    b._tap = () => this._onGuess(ctx, kind, b)
    b.on('pointertap', b._tap)
    return b
  },

  _showGuessUi(ctx, rec) {
    if (!this._alive || this._celebrating || !this._guessUi) return
    this._guessItem = rec
    this._guess = null
    for (const b of [this._guessBtnFloat, this._guessBtnSink]) {
      if (!b || b.destroyed) continue
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      b.scale.set(1)
      b.alpha = 1
    }
    this._guessUi.visible = true
    ctx.services.voice.say('Flyter eller sjunker?')
  },

  _hideGuessUi() {
    if (this._guessUi && !this._guessUi.destroyed) this._guessUi.visible = false
  },

  _onGuess(ctx, kind, btn) {
    if (!this._alive || !this._guessUi?.visible) return
    this._guess = kind
    this._idle = 0
    ctx.services.audio.sfx('tap')
    if (btn && !btn.destroyed) pop(btn)
    // Tona ut det andra valet så barnets gissning känns bekräftad.
    const other = kind === 'float' ? this._guessBtnSink : this._guessBtnFloat
    if (other && !other.destroyed) gsap.to(other, { alpha: 0.35, duration: 0.15 })
    // Knapparna stannar synliga tills släppet (då avslöjas svaret).
  },

  _buildBubbles() {
    this._bubbleLayer = new Container()
    this._bubbleLayer.eventMode = 'none'
    this._bubbleLayer.interactiveChildren = false
    this._root.addChild(this._bubbleLayer)
    this._bubbles = []
    for (let i = 0; i < 7; i++) {
      const b = new Graphics()
        .circle(0, 0, 5 + Math.random() * 7)
        .fill({ color: 0xffffff, alpha: 0.35 })
        .stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
      b.eventMode = 'none'
      this._resetBubble(b, true)
      this._bubbleLayer.addChild(b)
      this._bubbles.push(b)
    }
  },

  _resetBubble(b, spread = false) {
    b._baseX = WATER.x + 24 + Math.random() * (WATER.w - 48)
    b._sway = 6 + Math.random() * 10
    b._phase = Math.random() * Math.PI * 2
    b._vy = 16 + Math.random() * 24
    b.x = b._baseX
    b.y = spread ? SURFACE_Y + 16 + Math.random() * (WATER.h - 36) : WATER.y + WATER.h - 12
  },

  // Ett hyllföremål: BARA figuren (emoji) — ingen bricka/bakgrund. En osynlig
  // cirkel-hitArea (≥96px) gör hela föremålet dragbart/tryckbart.
  // VIKTIGT: en tom Container UTAN hitArea är OKLICKBAR i Pixi v8 när alla barn har
  // eventMode 'none' (det var därför inget gick att flytta). hitArea löser detta.
  _makeItem(data) {
    const it = new Container()
    const e = new Text({ text: data.emoji, style: { fontFamily: FONT.body, fontSize: EMOJI_SIZE } })
    e.anchor.set(0.5)
    e.eventMode = 'none'
    it.addChild(e)
    it._emoji = e
    it.hitArea = new Circle(0, 0, HIT_R)
    return it
  },

  // ---- Runda --------------------------------------------------------------

  _newRound(ctx) {
    if (!this._alive) return
    this._clearRound()

    this._dropped = 0
    this._celebrating = false
    this._idle = 0

    // Spridda viloplatser (banor) så saker inte staplas exakt — fördelas vid släpp.
    this._floatLanes = shuffle([496, 588, 680, 772])
    this._sinkLanes = shuffle([496, 600, 704, 808])

    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._drag.addTarget(this._tankView, () => true, { hitRadius: 280 }) // tar emot ALLT

    // Varierad uppsättning: 2–4 flytare + resten sjunkare (alltid minst 2 av varje
    // så barnet upptäcker mönstret), slumpade föremål -> ny känsla varje runda.
    const floatCount = randomFrom([2, 3, 3, 4])
    const sinkCount = ROUND_SIZE - floatCount
    const floaters = shuffle(POOL_FLOAT).slice(0, floatCount).map((d) => ({ ...d, floats: true, floatFactor: FLOAT_FACTOR }))
    const sinkers = shuffle(POOL_SINK).slice(0, sinkCount).map((d) => ({ ...d, floats: false, floatFactor: SINK_FACTOR }))
    const items = shuffle([...floaters, ...sinkers])

    items.forEach((data, i) => {
      const view = this._makeItem(data)
      view.position.set(SHELF_X[i], SHELF_Y)
      this._root.addChild(view)
      this._itemViews.push(view)
      this._drag.addItem(view, data, {
        onSelect: (rec) => {
          this._idle = 0
          this._showGuessUi(ctx, rec) // fires ENDAST vid tap-markering (inte vid drag)
        },
        onCorrect: (rec) => this._onDrop(ctx, rec),
        onWrong: (rec) => this._alive && wiggle(rec.view),
      })
      bounceIn(view, { delay: i * 0.05 })
    })
  },

  // Riv föregående runda: drag-controller, alla fysikkroppar och alla föremåls-vyer.
  _clearRound() {
    this._hideGuessUi() // rundans föremål försvinner -> ingen dinglande gissning
    this._guessItem = null
    this._guess = null
    this._drag?.destroy()
    this._drag = null
    for (const o of this._objects) {
      if (o.body) this._phys.removeBody(o.body)
    }
    this._objects = []
    this._itemViews.forEach((v) => {
      if (!v || v.destroyed) return
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      v.destroy({ children: true })
    })
    this._itemViews = []
  },

  // ---- Släpp -> bli en fysikkropp i vattnet -------------------------------

  _onDrop(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    const view = rec.view // har snäppt till tankens mitt (TANK_CX, TANK_CY)
    const data = rec.data

    // Gissningen (om någon) gällde just det här föremålet; hämta + nollställ + göm.
    const guessed = this._guessItem === rec ? this._guess : null
    this._guessItem = null
    this._guess = null
    this._hideGuessUi()

    // Ingen bricka längre — bara figuren plaskar i. En liten puls ger en mjuk
    // "plopp"-känsla när den lämnar handen och blir en fysikkropp (exit-säker via scale).
    if (!view.destroyed) pop(view, { scale: 1.12 })

    // Liten slumpoffset så två föremål aldrig föds exakt på varandra (= ingen jitter).
    const x = TANK_CX + (Math.random() - 0.5) * 44
    const y = TANK_CY + (Math.random() - 0.5) * 20
    gsap.killTweensOf(view) // stoppa drag-controllerns snäpp-tween (klar) före fysik-synk
    view.position.set(x, y)

    // Tilldela bana (lugn fördelning över ytan/botten).
    const lanes = data.floats ? this._floatLanes : this._sinkLanes
    const homeX = lanes.length ? lanes.shift() : clamp(480 + Math.random() * 340, WALL_L + BODY_R, WALL_R - BODY_R)

    // Dynamisk cirkelkropp; samma täthet för alla (flyt/sjunk styrs av floatFactor).
    const body = this._phys.circle(x, y, BODY_R, {
      restitution: 0.06,
      friction: 0.3,
      frictionAir: 0.012,
      density: 0.0012,
      label: data.floats ? 'floater' : 'sinker',
    })
    Body.setVelocity(body, { x: (Math.random() - 0.5) * 1.2, y: 1.6 + Math.random() * 1.6 }) // mjuk "plopp ner"
    this._phys.link(body, view)

    this._objects.push({ body, view, floats: data.floats, floatFactor: data.floatFactor, r: BODY_R, homeX, phase: Math.random() * Math.PI * 2 })

    this._splash(ctx, x, data, guessed)
    this._logItem(ctx, data) // lägg en miniatyr i rätt upptäckts-hylla (om ny)
    this._surfaceWave(x, body) // ytsvall: redan flytande saker guppar mjukt när något nytt plaskar i

    this._dropped++
    if (this._dropped >= ROUND_SIZE) this._finishRound(ctx)
  },

  // Ytsvall vid ett nytt plask: flytare i närheten får en mjuk uppåt-knuff och guppar
  // till, så vattnet känns sammanhängande. Kraften taklas av MAX_V -> alltid lugnt.
  _surfaceWave(x, exceptBody) {
    for (const o of this._objects) {
      if (!o.floats || !o.body || o.body === exceptBody) continue
      const b = o.body
      const d = Math.abs(b.position.x - x)
      if (d < 230 && b.position.y < SURFACE_Y + 130) {
        const k = 1 - d / 230
        Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 0.6 * k, y: b.velocity.y - 1.8 * k })
        if (o.view && !o.view.destroyed) pop(o.view, { scale: 1.06 })
      }
    }
  },

  // Plask vid ytan: ljud + ring + bubbelpuff + glad röst som namnger flyt/sjunk
  // (och en positiv reaktion på ev. gissning).
  _splash(ctx, x, data, guessed) {
    if (!this._alive) return
    const a = ctx.services.audio
    // Riktigt vatten via SFX-pipelinen: LÄTT plask (pop) för flytare, DJUP plopp
    // för sjunkare — faller mjukt till en ton om klippet inte hunnit avkodas.
    if (data.floats) {
      if (!a.sample('pop')) a.tone({ freq: 720, dur: 0.14, type: 'sine', vol: 0.22, slideTo: 1200 })
      a.tone({ freq: 1500, dur: 0.12, type: 'sine', vol: 0.1, delay: 0.05 }) // ljus stänk-topp
    } else {
      if (!a.sample('plopp')) a.tone({ freq: 300, dur: 0.24, type: 'sine', vol: 0.3, slideTo: 90 })
    }
    // Dubbel ytring -> tydligt "plask vid vattenytan".
    ripple(ctx.fxLayer, x, SURFACE_Y, { color: 0xbfeefa, maxR: 86, width: 7, alpha: 0.7 })
    ripple(ctx.fxLayer, x, SURFACE_Y, { color: 0xffffff, maxR: 52, width: 4, alpha: 0.5, duration: 0.42 })
    puff(ctx.fxLayer, x, SURFACE_Y, { count: 12, color: 0x9fd8f0 })
    // Namngivning (bestämd form) + positiv gissnings-reaktion. ALDRIG straff.
    const verb = data.floats ? 'flyter' : 'sjunker'
    if (guessed && (guessed === 'float') === data.floats) {
      sparkle(ctx.fxLayer, x, SURFACE_Y - 10, { count: 10 }) // rätt gissat -> extra gnistor
      a.sfx('correct')
      ctx.services.voice.say(`Ja! ${data.name} ${verb}!`)
    } else if (guessed) {
      a.sfx('soft') // fel gissat -> mjukt, avslöja svaret (aldrig buzzer)
      ctx.services.voice.say(`Vi ser efter! ${data.name} ${verb}!`)
    } else {
      ctx.services.voice.say(`${data.name} ${verb}!`)
    }
  },

  // Tryck direkt på vattnet (utan markerat föremål) = litet glatt plask + flytare
  // i närheten guppar till. Ren orsak-och-verkan; krockar inte med drag/tap-tap.
  _waterTap(ctx, e) {
    if (!this._alive || this._celebrating) return
    if (this._drag?.selected) return // ett tap-tap-släpp pågår -> plasket sköts av onDrop
    this._hideGuessUi() // inget markerat -> städa ev. dinglande gissningsbubbla
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, WATER.x + 30, WATER.x + WATER.w - 30)
    const y = clamp(p.y, SURFACE_Y, WATER.y + WATER.h - 20)
    this._idle = 0
    ctx.services.audio.sfx(Math.random() < 0.3 ? 'pling' : 'pop')
    ripple(ctx.fxLayer, x, y, { color: 0xbfeefa, maxR: 64, alpha: 0.6 })
    puff(ctx.fxLayer, x, y, { count: 7, color: 0x9fd8f0 })
    this._nudgeFloaters(x)
  },

  // Flytare nära plasket får en liten uppåt-knuff -> de guppar (kraften taklas av MAX_V).
  _nudgeFloaters(x) {
    for (const o of this._objects) {
      if (!o.floats || !o.body) continue
      const b = o.body
      if (Math.abs(b.position.x - x) < 170 && b.position.y < SURFACE_Y + 130) {
        Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 1.6, y: b.velocity.y - 2.4 })
        if (o.view && !o.view.destroyed) pop(o.view, { scale: 1.1 })
      }
    }
  },

  // ---- Flytkraft (körs varje bildruta FÖRE phys.update) -------------------

  _applyBuoyancy() {
    for (const o of this._objects) {
      const b = o.body
      if (!b) continue
      const pos = b.position
      // Nedsänkningsgrad: 0 (helt ovanför ytan) .. 1 (helt under).
      const frac = clamp((pos.y + o.r - SURFACE_Y) / (2 * o.r), 0, 1)
      if (frac > 0) {
        // Flytkraft uppåt (accel · massa). Massoberoende eftersom gravitationen också ∝ massa.
        const buoyA = BUOY_BASE * frac * o.floatFactor
        // Vertikalt: flytare GUPPAR mjukt vid ytan; sjunkare glider rakt och lugnt nedåt.
        let vAcc = -buoyA
        // Sidled: svag fjäder mot tilldelad bana (gäller alla -> ingen stapling).
        let swayA = SPRING_K * (o.homeX - pos.x)
        if (o.floats) {
          vAcc += BOB_AMP * Math.sin(this._t * BOB_W + o.phase) // litet gupp
          swayA += SWAY_AMP * Math.sin(this._t * SWAY_W + o.phase * 1.3) // mjuk vaggning
        }
        swayA = clamp(swayA, -MAXF_A, MAXF_A)
        Body.applyForce(b, pos, { x: b.mass * swayA, y: b.mass * vAcc })
        // Vattenmotstånd: dämpa farten -> lugnt, aldrig studsigt.
        Body.setVelocity(b, { x: b.velocity.x * DRAG, y: b.velocity.y * DRAG })
      }
      // Sjunkare som nått botten lugnas extra -> de lägger sig stilla utan jitter.
      if (!o.floats && pos.y > FLOOR_TOP - o.r - 8) {
        Body.setVelocity(b, { x: b.velocity.x * 0.7, y: b.velocity.y * 0.7 })
      }
      // Håll föremålet ~upprätt.
      if (b.angularVelocity) Body.setAngularVelocity(b, b.angularVelocity * ANG_DAMP)
      // Hastighetstak -> kan ALDRIG skjuta ur tanken.
      const sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > MAX_V) Body.setVelocity(b, { x: (b.velocity.x / sp) * MAX_V, y: (b.velocity.y / sp) * MAX_V })
    }
  },

  // ---- Firande + ny runda --------------------------------------------------

  _finishRound(ctx) {
    if (this._celebrating) return
    this._celebrating = true
    this._idle = 0
    this._level++
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('totalDropped', (ctx.progress.get().custom?.totalDropped || 0) + ROUND_SIZE)
    // complete() sköter celebrate-ljud, beröm-röst, konfetti, stjärna och klistermärke.
    ctx.progress.complete()
    this._jumpFish(ctx)
    this._roundTimer = gsap.delayedCall(1.6, () => this._newRound(ctx))
  },

  // En glad fisk hoppar upp ur vattnet och plaskar ner igen. Exit-säker proxy-tween;
  // fisken lever i fxLayer (inte _root) -> spåras och städas i destroy.
  _jumpFish(ctx) {
    const fish = new Text({ text: randomFrom(JUMPERS), style: { fontFamily: FONT.body, fontSize: 96 } })
    fish.anchor.set(0.5)
    fish.position.set(TANK_CX, SURFACE_Y + 30)
    fish.rotation = -0.5
    fish.eventMode = 'none'
    ctx.fxLayer.addChild(fish)
    this._fish = fish
    const st = { x: TANK_CX, y: SURFACE_Y + 30, rot: -0.5 }
    const apply = () => {
      if (fish.destroyed) return
      fish.x = st.x
      fish.y = st.y
      fish.rotation = st.rot
    }
    this._fishTl = gsap
      .timeline({ onUpdate: apply, onComplete: () => !fish.destroyed && fish.destroy() })
      .to(st, { y: 120, x: 700, rot: 0.4, duration: 0.5, ease: 'power2.out' })
      .to(st, { y: SURFACE_Y + 30, x: 760, rot: 1.0, duration: 0.45, ease: 'power2.in' })
  },

  // ---- Ambient + idle + fysik-steg ----------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._idle += dt

    // Flytkraft FÖRE motorsteget (krafterna nollställs i Engine.update).
    this._applyBuoyancy()
    this._phys.update(ticker.deltaMS)

    // Idle-recue (~6s): glad röst + en kvarvarande hyllsak puffar till.
    if (this._idle > 6 && !this._celebrating) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_LINES))
      const onShelf = this._itemViews.filter((v) => !v.destroyed && v.eventMode === 'static')
      if (onShelf.length) pop(randomFrom(onShelf))
    }

    // Drivande bubblor.
    for (const b of this._bubbles) {
      b.y -= b._vy * dt
      b.x = b._baseX + Math.sin(this._t * 1.5 + b._phase) * b._sway
      if (b.y < SURFACE_Y + 8) this._resetBubble(b)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._roundTimer?.kill()
    this._surfaceTween?.kill()
    this._fishTl?.kill()
    if (this._fish && !this._fish.destroyed) this._fish.destroy()

    this._drag?.destroy() // dödar item-tweens (skala) + lyssnare
    this._itemViews?.forEach((v) => {
      if (!v || v.destroyed) return
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
    })
    // Upptäckts-hyllornas miniatyrer (bounceIn på scale) + gissningsknapparna.
    this._logIcons?.forEach((t) => {
      if (t && !t.destroyed) gsap.killTweensOf(t.scale)
    })
    ;[this._guessBtnFloat, this._guessBtnSink].forEach((b) => {
      if (!b || b.destroyed) return
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      if (b._tap) b.off('pointertap', b._tap)
    })
    if (this._tankView && !this._tankView.destroyed && this._waterTapHandler) {
      this._tankView.off('pointertap', this._waterTapHandler)
    }

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
