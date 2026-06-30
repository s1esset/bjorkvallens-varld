// Knuffa Tornet — fysik-spel (2–5 år). En tung rivningskula hänger i ett RIKTIGT REP
// (matter.js Constraint = pendel) under en flyttbar krankärra ovanför ett torn av glada
// klossar på en avsats. MÅL: knuffa NER ALLA klossar (och kronan 👑) av avsatsen — en
// mätare fylls för varje kloss som ramlar, och när alla ligger nere kommer ett firande
// och ett större torn.
//
// KONTROLL (mer makt över hur OCH var kulan faller):
//   • GREPPA kulan och dra den dit du vill (den följer fingret längs repet) — släpp så
//     svingar gravitationen ner den i tornet. Mer bakåt/upp = mer kraft (högre fall).
//   • FLYTTA KRANEN: dra den stora gula krankärran i sidled för att välja VAR kulan
//     hänger och faller (siktar mot olika delar av tornet).
//   • BYT REP: en stor knapp växlar mellan STYVT rep (stel pendel) och ELASTISKT rep —
//     det elastiska repet TÖJS synligt när man drar och slungar kulan som en slangbella.
//   • TYNGD: en knapp växlar kulans storlek/tyngd (Liten/Mellan/Stor) — en tung kula bär
//     mer rörelsemängd (riktig matter.js-massa) och knuffar fler klossar på en gång.
//
// INGET misslyckande: missar är roliga (tyst puff + gnistror), och efter ett par svingar
// får barnet en kraftig hjälp-sving, och räcker inte den ramlar alla klossar av sig själva
// så tornet ALLTID faller. Krock-LJUD är borttagna (på begäran) — slag är tysta, men
// belöning/firande och mjuka ljud finns kvar. Allt ritas programmatiskt (Pixi + emoji).
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { Button } from '../../lib/Button.js'
import { puff, floatText, sparkle, burst, bounceIn, bigCelebration, pop } from '../../lib/feedback.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'

const { Constraint, Composite, Body } = Matter

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// --- Geometri (designkoordinater 1280×720) ---
const PIVOT_Y = 80 // repets upphängningshöjd (krankärrans krok)
const PIVOT_X0 = 800 // kärrans startläge (rakt ovanför tornet)
const PIVOT_MIN_X = 600 // kärrans vänstra gräns på skenan
const PIVOT_MAX_X = 1000 // kärrans högra gräns
const CHAIN_LEN = 330 // repets vilolängd: kulans lägsta punkt = pivot.y + denna (~410)
const BALL_R = 46 // baskula-radie (skalas av tyngd-knappen)
const THETA_REST = 0.85 // vilo-spänning (~49°), standardläge
const THETA_MIN = -0.3 // får dras en aning åt höger också
const THETA_MAX = 1.5 // största spänning (~86°, nära vågrätt)
const STRETCH_MAX = 1.5 // elastiskt rep: hur långt kulan kan dras (× CHAIN_LEN) = töjning

const FLOOR_Y = 720
const LEDGE_Y = 480 // avsatsens översida (klossarna står här)
const PED = { x1: 640, x2: 1180 } // avsatsens vänster/höger-kant
const CLEAR_MARGIN = 80 // kloss räknas "nere" när dess y > LEDGE_Y + detta (ramlat av)

const BLOCK_W = 100
const BLOCK_H = 56
const BLOCK_COLORS = PLAYFUL

const SIZES = [
  { f: 0.78, label: 'Liten' },
  { f: 1.0, label: 'Mellan' },
  { f: 1.32, label: 'Stor' },
]

// Rep-typer: STYVT = stel pendel; ELASTISKT = mjuk fjäder (töjs synligt, slangbella).
const ROPES = [
  { id: 'styv', label: 'Styvt', icon: '🪢', elastic: false, stiffness: 0.96, damping: 0.04, color: COLORS.inkSoft },
  { id: 'elastisk', label: 'Elastiskt', icon: '🌀', elastic: true, stiffness: 0.18, damping: 0.06, color: COLORS.purple },
]

const REST_SPEED = 1.6 // matter-fart under detta = svinget har lugnat sig
const MAX_FLIGHT = 3.6 // s innan en sving avbryts (no-fail)
const IDLE_DELAY = 6 // s utan handling -> röst-recue
const HIT_THROTTLE = 0.07 // s mellan kloss-nere-ljud (plopp)

export default {
  id: 'knuffa-tornet',
  titleSv: 'Knuffa Tornet',
  icon: '💥',
  category: 'fysik',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'knuffa-tornet',
  voiceIntro: 'Dra kulan bakåt och släpp – knuffa ner alla klossar!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._flightT = 0
    this._restT = 0
    this._assistT = 0
    this._lastHit = -1
    this._lastPuff = -1
    this._phase = 'aim' // aim | swing | assist | resolving
    this._won = false
    this._aiming = false
    this._theta = THETA_REST
    this._stretch = 1
    this._blocks = [] // { body, view, cleared, isCrown }
    this._total = 0
    this._cleared = 0
    this._clearedAtStart = 0
    this._misses = 0
    this._crownDown = false
    this._sizeIdx = 1
    this._ballFactor = 1
    this._ropeIdx = 0
    this._rope = ROPES[0]
    this._ropeLen = CHAIN_LEN
    this._pivot = { x: PIVOT_X0, y: PIVOT_Y } // flyttas av krankärran

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (glad himmel + sol/moln) — dekorativ.
    this._root.addChild(createScene('sky', { width: ctx.width, height: ctx.height }))

    // Mjuk fångare för "tryck bredvid" (lugnt ljud + recue) — under kulan i z-led.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onFieldTap = (e) => this._fieldTap(ctx, e)
    this._catcher.on('pointertap', this._onFieldTap)
    this._root.addChild(this._catcher)

    // Avsats (pedestal): statisk kropp som klossarna står på; ritas som sten.
    this._buildPedestal(ctx)

    // Fysik: gravitation + golv/väggar.
    this._phys = new PhysicsWorld({ gravityY: 1.2, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))
    this._pedBody = this._phys.rectangle(
      (PED.x1 + PED.x2) / 2,
      (LEDGE_Y + FLOOR_Y) / 2,
      PED.x2 - PED.x1,
      FLOOR_Y - LEDGE_Y,
      { isStatic: true, friction: 0.9, frictionStatic: 1.4, restitution: 0.05, label: 'pedestal' },
    )

    // Kloss-lager (under rep/kula i z-led).
    this._blockLayer = new Container()
    this._root.addChild(this._blockLayer)

    // Kran (fast skena + mast) + flyttbar kärra. Repet ritas separat varje bildruta.
    this._chain = new Graphics()
    this._chain.eventMode = 'none'
    this._buildCrane(ctx)
    this._root.addChild(this._chain)

    // Bågvisning (prickad svingbana) — ritas om vid sikte.
    this._hint = new Graphics()
    this._hint.eventMode = 'none'
    this._hint.visible = false
    this._root.addChild(this._hint)

    // Rivningskulan (greppbar) hänger i repet (Constraint) från kärrans krok.
    this._ballView = makeBall(BALL_R)
    const start = this._cock(this._theta)
    this._ballView.position.set(start.x, start.y)
    this._ballBody = this._phys.circle(start.x, start.y, BALL_R, {
      density: 0.02, // tung -> bär rörelsemängd genom klossarna
      restitution: 0.1,
      friction: 0.4,
      frictionAir: 0.001,
      label: 'ball',
    })
    this._phys.link(this._ballBody, this._ballView)
    Body.setStatic(this._ballBody, true)
    this._constraint = Constraint.create({
      pointA: { x: this._pivot.x, y: this._pivot.y },
      bodyB: this._ballBody,
      pointB: { x: 0, y: 0 }, // fäst i kulans mitt (stabil pendel); repet RITAS till toppen
      length: this._ropeLen,
      stiffness: this._rope.stiffness,
      damping: this._rope.damping,
    })
    Composite.add(this._phys.world, this._constraint)
    this._bindBall(ctx)
    this._root.addChild(this._ballView)

    // UI: mätare (mål-framsteg, längst ner) + tyngd-knapp + rep-knapp.
    this._buildMeter(ctx)
    this._buildSizeButton(ctx)
    this._buildRopeButton(ctx)

    // Bygg banan för aktuell nivå.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // Position på pendelcirkeln (kulans mitt) vid spänningsvinkel theta runt aktuell pivot.
  _cock(theta) {
    return {
      x: this._pivot.x - this._ropeLen * Math.sin(theta),
      y: this._pivot.y + this._ropeLen * Math.cos(theta),
    }
  },

  // ---- Scenbyggen ---------------------------------------------------------

  _buildPedestal(ctx) {
    const g = new Graphics()
    g.roundRect(PED.x1, LEDGE_Y, PED.x2 - PED.x1, FLOOR_Y - LEDGE_Y + 30, 22).fill(COLORS.brown)
    g.roundRect(PED.x1, LEDGE_Y, PED.x2 - PED.x1, 16, 22).fill({ color: 0xffffff, alpha: 0.18 })
    g.roundRect(PED.x1 + 12, LEDGE_Y + 30, PED.x2 - PED.x1 - 24, 10, 6).fill({ color: 0x000000, alpha: 0.12 })
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  // Fast kran: mast + horisontell skena. Kärran (kroken) är separat & dragbar.
  _buildCrane(ctx) {
    const beamY = 22
    const x1 = PIVOT_MIN_X - 70
    const x2 = PIVOT_MAX_X + 70
    const g = new Graphics()
    // vänster mast ner mot marken
    g.roundRect(x1 - 26, beamY, 26, 470, 8).fill(COLORS.inkSoft)
    // horisontell balk (skena) som kärran åker på
    g.roundRect(x1, beamY, x2 - x1, 18, 6).fill(COLORS.inkSoft)
    g.roundRect(x1, beamY + 12, x2 - x1, 5, 3).fill({ color: 0x000000, alpha: 0.15 })
    g.eventMode = 'none'
    this._root.addChild(g)

    // Flyttbar krankärra (stor träffyta — barnet drar den i sidled).
    const cart = new Container()
    const cg = new Graphics()
    cg.roundRect(-46, -50, 92, 40, 10).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.ink })
    cg.circle(-28, -52, 10).fill(COLORS.ink) // hjul på skenan
    cg.circle(28, -52, 10).fill(COLORS.ink)
    cg.roundRect(-8, -14, 16, 16, 4).fill(COLORS.inkSoft) // hals ner till kroken
    cg.circle(0, 4, 11).fill(COLORS.orange).stroke({ width: 3, color: COLORS.ink }) // krok (pivot ~y0)
    // pilar som visar att kärran kan dras i sidled
    cg.poly([-62, -30, -50, -38, -50, -22]).fill({ color: COLORS.ink, alpha: 0.5 })
    cg.poly([62, -30, 50, -38, 50, -22]).fill({ color: COLORS.ink, alpha: 0.5 })
    cart.addChild(cg)
    cart.position.set(this._pivot.x, this._pivot.y)
    cart.eventMode = 'static'
    cart.cursor = 'pointer'
    cart.hitArea = new Rectangle(-72, -64, 144, 110) // >=96px touch target
    cart.interactiveChildren = false
    this._trolley = cart
    this._onTrolleyDown = (e) => this._trolleyDown(ctx, e)
    this._onTrolleyMove = (e) => this._trolleyMove(ctx, e)
    this._onTrolleyUp = (e) => this._trolleyUp(ctx, e)
    cart.on('pointerdown', this._onTrolleyDown)
    this._root.addChild(cart)
  },

  _buildMeter(ctx) {
    this._meter = new Container()
    this._meter.position.set(ctx.width / 2, ctx.height - 40)
    this._meter.eventMode = 'none'
    const bw = 360
    const bg = new Graphics().roundRect(-bw / 2, -18, bw, 36, 18).fill({ color: 0x000000, alpha: 0.18 })
    this._meterFill = new Graphics()
    const crown = new Text({ text: '👑', style: { fontFamily: FONT.body, fontSize: 40 } })
    crown.anchor.set(0.5)
    crown.position.set(-bw / 2 - 30, 0)
    this._meterW = bw
    this._meter.addChild(bg, this._meterFill, crown)
    this._root.addChild(this._meter)
  },

  _updateMeter() {
    const g = this._meterFill
    if (!g || g.destroyed) return
    const frac = this._total ? this._cleared / this._total : 0
    const bw = this._meterW
    g.clear()
    if (frac > 0) g.roundRect(-bw / 2, -18, Math.max(36, bw * frac), 36, 18).fill(COLORS.green)
  },

  _buildSizeButton(ctx) {
    this._sizeBtn = new Button({
      icon: '⚪',
      label: 'Tyngd',
      width: 200,
      height: 116,
      color: COLORS.blue,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._cycleSize(ctx),
    })
    this._sizeBtn.position.set(150, 624)
    this._root.addChild(this._sizeBtn)
    this._sizeTag = this._makeTag(150, 700, SIZES[this._sizeIdx].label, COLORS.ink)
  },

  _buildRopeButton(ctx) {
    this._ropeBtn = new Button({
      icon: '🪢',
      label: 'Byt rep',
      width: 210,
      height: 116,
      color: COLORS.purple,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._cycleRope(ctx),
    })
    this._ropeBtn.position.set(1120, 624)
    this._root.addChild(this._ropeBtn)
    this._ropeTag = this._makeTag(1120, 700, this._rope.label, this._rope.color)
  },

  _makeTag(x, y, text, color) {
    const t = new Text({
      text,
      style: { fontFamily: FONT.title, fontSize: 24, fontWeight: '700', fill: color, align: 'center' },
    })
    t.anchor.set(0.5)
    t.position.set(x, y)
    t.eventMode = 'none'
    this._root.addChild(t)
    return t
  },

  _refreshSizeTag() {
    if (this._sizeTag && !this._sizeTag.destroyed) this._sizeTag.text = SIZES[this._sizeIdx].label
  },

  _refreshRopeTag() {
    if (this._ropeTag && !this._ropeTag.destroyed) {
      this._ropeTag.text = this._rope.label
      this._ropeTag.style.fill = this._rope.color
    }
  },

  _setControlsEnabled(on) {
    this._sizeBtn?.setEnabled(on)
    this._ropeBtn?.setEnabled(on)
    if (this._trolley && !this._trolley.destroyed) {
      this._trolley.eventMode = on ? 'static' : 'none'
      this._trolley.alpha = on ? 1 : 0.6
    }
  },

  // ---- Nivåer -------------------------------------------------------------

  _layoutFor(level) {
    const rows = clamp(3 + Math.floor(level / 1), 3, 6) // taller
    const cols = level >= 2 ? 2 : 1 // wider
    const sturdy = 1 + level * 0.14 // sturdier (mer massa = svårare att stöta)
    const xs = cols === 1 ? [780] : [760, 880]
    return { rows, cols, xs, sturdy }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._clearTower()

    this._phase = 'aim'
    this._won = false
    this._aiming = false
    this._misses = 0
    this._cleared = 0
    this._crownDown = false
    this._flightT = 0
    this._restT = 0
    this._assistT = 0
    this._idle = 0
    this._theta = THETA_REST
    this._stretch = 1

    // Kran tillbaka till mitten, styvt rep, mellanstor kula i vilospänning.
    this._setPivotX(PIVOT_X0)
    this._setRope(0)
    this._setSize(1)
    this._sizeIdx = 1
    this._refreshSizeTag()
    this._freezeBall(THETA_REST)

    this._buildTower(ctx, level)
    this._updateMeter()

    this._setControlsEnabled(true)
    if (!this._ballView.destroyed) pop(this._ballView)
  },

  _buildTower(ctx, level) {
    const { rows, xs, sturdy } = this._layoutFor(level)
    let topCenterX = xs[0]
    let topCenterY = LEDGE_Y - BLOCK_H / 2 - (rows - 1) * BLOCK_H
    let n = 0
    for (const cx of xs) {
      for (let i = 0; i < rows; i++) {
        const y = LEDGE_Y - BLOCK_H / 2 - i * BLOCK_H
        const color = BLOCK_COLORS[(i + n) % BLOCK_COLORS.length]
        const view = makeBlock(BLOCK_W, BLOCK_H, color)
        view.position.set(cx, y)
        this._blockLayer.addChild(view)
        const body = this._phys.rectangle(cx, y, BLOCK_W, BLOCK_H, {
          density: 0.0016 * sturdy,
          restitution: 0.06,
          friction: 0.7,
          frictionStatic: 1.4,
          label: 'block',
        })
        this._phys.link(body, view)
        this._blocks.push({ body, view, cleared: false, isCrown: false })
        bounceIn(view, { delay: i * 0.04 })
        if (cx === xs[0] && y < topCenterY + 1) topCenterY = y
      }
      n++
    }

    // Krona på toppen av första (vänstra) kolumnen.
    const crownY = topCenterY - BLOCK_H / 2 - 22
    const cview = makeCrown()
    cview.position.set(topCenterX, crownY)
    this._blockLayer.addChild(cview)
    const cbody = this._phys.rectangle(topCenterX, crownY, 64, 40, {
      density: 0.0012,
      restitution: 0.1,
      friction: 0.6,
      frictionStatic: 1.0,
      label: 'block',
    })
    this._phys.link(cbody, cview)
    this._blocks.push({ body: cbody, view: cview, cleared: false, isCrown: true })
    bounceIn(cview, { delay: rows * 0.04 })

    this._total = this._blocks.length
  },

  _clearTower() {
    for (const b of this._blocks) {
      this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
        b.view.destroy({ children: true })
      }
    }
    this._blocks = []
  },

  // ---- Krankärra: flytta var kulan hänger/faller --------------------------

  _setPivotX(x) {
    this._pivot.x = clamp(x, PIVOT_MIN_X, PIVOT_MAX_X)
    if (this._constraint) this._constraint.pointA.x = this._pivot.x
    if (this._trolley && !this._trolley.destroyed) this._trolley.x = this._pivot.x
  },

  _trolleyDown(ctx, e) {
    if (!this._alive || this._phase !== 'aim') return
    this._idle = 0
    this._trolleyDragging = true
    const p = this._root.toLocal(e.global)
    this._trolleyOff = this._pivot.x - p.x
    ctx.services.audio.sfx('tap')
    if (!this._trolley.destroyed) pop(this._trolley)
    this._trolley.on('globalpointermove', this._onTrolleyMove)
    this._trolley.on('pointerup', this._onTrolleyUp)
    this._trolley.on('pointerupoutside', this._onTrolleyUp)
  },

  _trolleyMove(ctx, e) {
    if (!this._trolleyDragging) return
    const p = this._root.toLocal(e.global)
    this._setPivotX(p.x + (this._trolleyOff || 0))
    // Kulan hänger med kärran (behåll spänning), repet & bågen följer.
    this._freezeBall(this._theta)
    if (this._hint?.visible) this._drawHint(this._theta)
    this._drawChain()
  },

  _trolleyUp(ctx, e) {
    if (!this._trolleyDragging) return
    this._trolleyDragging = false
    const t = this._trolley
    if (t && !t.destroyed) {
      t.off('globalpointermove', this._onTrolleyMove)
      t.off('pointerup', this._onTrolleyUp)
      t.off('pointerupoutside', this._onTrolleyUp)
    }
  },

  // ---- Kula: storlek/tyngd ------------------------------------------------

  _cycleSize(ctx) {
    if (!this._alive || this._phase !== 'aim') return
    this._idle = 0
    this._sizeIdx = (this._sizeIdx + 1) % SIZES.length
    this._setSize(this._sizeIdx)
    this._refreshSizeTag()
    const s = SIZES[this._sizeIdx]
    floatText(ctx.fxLayer, this._ballView.x, this._ballView.y - 70, s.label, { fontSize: 40 })
    if (!this._ballView.destroyed) pop(this._ballView)
  },

  // Skala om kula-kroppen (matter) + vyn så massan följer storleken (area×densitet).
  _setSize(idx) {
    const f = SIZES[idx].f
    const ratio = f / this._ballFactor
    if (this._ballBody && Math.abs(ratio - 1) > 1e-3) Body.scale(this._ballBody, ratio, ratio)
    this._ballFactor = f
    if (this._ballView && !this._ballView.destroyed) this._ballView.scale.set(f)
    // Generös träffyta oavsett storlek (~120px på skärmen).
    if (this._ballView) this._ballView.hitArea = new Circle(0, 0, 120 / f)
  },

  // ---- Rep: styvt <-> elastiskt -------------------------------------------

  _setRope(idx) {
    this._ropeIdx = ((idx % ROPES.length) + ROPES.length) % ROPES.length
    this._rope = ROPES[this._ropeIdx]
    if (this._constraint) {
      this._constraint.stiffness = this._rope.stiffness
      this._constraint.damping = this._rope.damping
    }
    this._refreshRopeTag()
  },

  _cycleRope(ctx) {
    if (!this._alive || this._phase !== 'aim') return
    this._idle = 0
    this._setRope(this._ropeIdx + 1)
    floatText(ctx.fxLayer, this._ballView.x, this._ballView.y - 70, this._rope.label, { fontSize: 36 })
    ctx.services.voice.say(this._rope.elastic ? 'Elastiskt rep!' : 'Styvt rep!')
    if (!this._ballView.destroyed) pop(this._ballView)
    this._drawChain()
  },

  // ---- Pekare: greppa kulan, dra dit du vill, släpp -----------------------

  _bindBall(ctx) {
    const t = this._ballView
    t.eventMode = 'static'
    t.cursor = 'pointer'
    t.hitArea = new Circle(0, 0, 120)
    this._onBallDown = (e) => this._ballDown(ctx, e)
    this._onBallMove = (e) => this._ballMove(ctx, e)
    this._onBallUp = (e) => this._ballUp(ctx, e)
    t.on('pointerdown', this._onBallDown)
  },

  _ballDown(ctx, e) {
    if (!this._alive || this._phase !== 'aim') return
    this._idle = 0
    this._aiming = true
    ctx.services.audio.sfx('tap')
    if (!this._ballView.destroyed) pop(this._ballView)
    this._drawHint(this._theta)
    this._ballView.on('globalpointermove', this._onBallMove)
    this._ballView.on('pointerup', this._onBallUp)
    this._ballView.on('pointerupoutside', this._onBallUp)
  },

  // Kulan följer fingret direkt: STYVT rep låser den på pendelcirkeln (vinkel-styrning),
  // ELASTISKT rep låter den dras UTÅT förbi vilolängden (töjs → mer slangbella-kraft).
  _ballMove(ctx, e) {
    if (!this._aiming) return
    const p = this._root.toLocal(e.global)
    const dx = p.x - this._pivot.x
    const dy = p.y - this._pivot.y
    const dist = Math.hypot(dx, dy) || 1
    const theta = clamp(Math.atan2(-dx, dy), THETA_MIN, THETA_MAX)
    const dirx = -Math.sin(theta)
    const diry = Math.cos(theta)
    let useDist = this._ropeLen
    if (this._rope.elastic) useDist = clamp(dist, this._ropeLen * 0.5, this._ropeLen * STRETCH_MAX)
    this._theta = theta
    this._stretch = useDist / this._ropeLen
    this._freezeAt(this._pivot.x + dirx * useDist, this._pivot.y + diry * useDist)
    this._drawHint(theta)
    this._drawChain()
  },

  _ballUp(ctx, e) {
    if (!this._aiming) return
    this._aiming = false
    this._detachBall()
    this._hideHint()
    this._release(ctx)
  },

  // Placera den STATISKA kulan exakt på (x,y) (drag/vila), nollställ fart & rotation.
  _freezeAt(x, y) {
    const b = this._ballBody
    if (b) {
      Body.setStatic(b, true)
      Body.setPosition(b, { x, y })
      Body.setVelocity(b, { x: 0, y: 0 })
      Body.setAngularVelocity(b, 0)
      Body.setAngle(b, 0)
    }
    if (this._ballView && !this._ballView.destroyed) {
      this._ballView.position.set(x, y)
      this._ballView.rotation = 0
    }
  },

  // Vila/återställning: kulan på pendelcirkeln vid spänningsvinkel theta (ingen töjning).
  _freezeBall(theta) {
    this._theta = clamp(theta, THETA_MIN, THETA_MAX)
    this._stretch = 1
    const c = this._cock(this._theta)
    this._freezeAt(c.x, c.y)
  },

  // Släpp kulan: repet (Constraint) + gravitationen svingar/slungar ner den i tornet.
  _release(ctx) {
    if (!this._alive) return
    this._phase = 'swing'
    this._flightT = 0
    this._restT = 0
    this._clearedAtStart = this._cleared
    this._setControlsEnabled(false)
    const b = this._ballBody
    Body.setStatic(b, false)
    Body.setAngularVelocity(b, 0)
    if (this._rope.elastic && this._stretch > 1.03) {
      // Slangbella: ge en startfart längs repet mot lägsta punkten ∝ töjning.
      const tx = this._pivot.x
      const ty = this._pivot.y + this._ropeLen
      let vx = tx - b.position.x
      let vy = ty - b.position.y
      const L = Math.hypot(vx, vy) || 1
      const sp = 5.5 * this._stretch
      Body.setVelocity(b, { x: (vx / L) * sp, y: (vy / L) * sp })
    } else {
      Body.setVelocity(b, { x: 0, y: 0 })
    }
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('Svinga!')
  },

  _detachBall() {
    const t = this._ballView
    if (t && !t.destroyed) {
      t.off('globalpointermove', this._onBallMove)
      t.off('pointerup', this._onBallUp)
      t.off('pointerupoutside', this._onBallUp)
    }
  },

  // Prickad bågvisning längs pendelbanan från spänningen ner förbi tornet.
  _drawHint(theta) {
    const g = this._hint
    if (!g || g.destroyed) return
    g.clear()
    g.visible = true
    const aFrac = clamp(theta / THETA_MAX, 0, 1)
    const power = this._rope.elastic ? clamp((this._stretch - 0.6) / (STRETCH_MAX - 0.6), 0, 1) : aFrac
    const col = power > 0.66 ? COLORS.orange : power > 0.33 ? COLORS.yellow : COLORS.white
    let n = 0
    for (let a = theta; a > -0.7; a -= 0.12) {
      const c = this._cock(a)
      const r = 9 - 5 * (n / 12)
      g.circle(c.x, c.y, Math.max(3.5, r)).fill({ color: col, alpha: 0.85 - 0.5 * (n / 12) })
      n++
    }
  },

  _hideHint() {
    if (this._hint && !this._hint.destroyed) {
      this._hint.clear()
      this._hint.visible = false
    }
  },

  _fieldTap(ctx, e) {
    if (!this._alive || this._aiming || this._trolleyDragging) return
    const p = this._root.toLocal(e.global)
    this._idle = 0
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, p.x, p.y, { count: 4 })
  },

  // ---- Uppdatering --------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._phys.update(ticker.deltaMS)
    this._drawChain()

    if (this._phase === 'swing' || this._phase === 'assist') {
      this._checkClears(ctx)
      if (this._won) return
    }

    if (this._phase === 'swing') {
      this._flightT += dt
      const b = this._ballBody
      const spd = b ? b.speed : 0
      if (spd < REST_SPEED) {
        this._restT += dt
      } else {
        this._restT = 0
      }
      if ((this._flightT > 0.6 && this._restT > 0.45) || this._flightT > MAX_FLIGHT) {
        this._endSwing(ctx)
      }
      return
    }

    if (this._phase === 'assist') {
      this._assistT += dt
      // Säkerhet: om allt inte ramlat på 2,5s, knuffa ner resten (no-fail garanti).
      if (this._assistT > 2.5 && !this._won) this._knockAllOff(ctx, true)
      return
    }

    if (this._phase === 'aim') {
      if (this._aiming || this._trolleyDragging) {
        this._idle = 0
        return
      }
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        if (!this._ballView.destroyed) pop(this._ballView)
      }
    }
  },

  _checkClears(ctx) {
    for (const b of this._blocks) {
      if (b.cleared) continue
      if (b.body.position.y > LEDGE_Y + CLEAR_MARGIN) this._onClear(ctx, b)
    }
  },

  _onClear(ctx, b) {
    if (b.cleared) return
    b.cleared = true
    this._cleared++
    this._updateMeter()
    if (this._t - this._lastHit > HIT_THROTTLE) {
      this._lastHit = this._t
      ctx.services.audio.sfx('plopp')
    }
    if (b.isCrown && !this._crownDown) {
      this._crownDown = true
      ctx.services.audio.sfx('magi')
      ctx.services.voice.say('Kronan ramlar!')
      sparkle(ctx.fxLayer, b.view?.x ?? this._pivot.x, b.view?.y ?? this._pivot.y, { count: 10 })
    } else {
      sparkle(ctx.fxLayer, b.view?.x ?? 0, b.view?.y ?? 0, { count: 4 })
    }
    if (this._cleared >= this._total) this._win(ctx)
  },

  // Svinget tog slut utan full rivning -> tillbaka till sikte + ev. hjälp.
  _endSwing(ctx) {
    if (!this._alive || this._won) return
    const gained = this._cleared - this._clearedAtStart
    if (gained > 0) this._misses = 0
    else this._misses++

    this._phase = 'aim'
    this._freezeBall(THETA_REST)
    this._setControlsEnabled(true)
    this._idle = 0

    if (this._cleared >= this._total) {
      this._win(ctx)
      return
    }
    if (this._misses >= 3) {
      this._knockAllOff(ctx, false)
    } else if (this._misses >= 2) {
      this._autoAssistSwing(ctx)
    }
  },

  // Hjälp-sving (steg 1): styvt rep + stor tung kula + full spänning, svingas automatiskt.
  _autoAssistSwing(ctx) {
    if (!this._alive || this._won) return
    ctx.services.voice.say('Jag hjälper till!')
    this._setRope(0) // styvt = säker pendel
    this._setSize(2) // stor & tung
    this._sizeIdx = 2
    this._refreshSizeTag()
    this._setPivotX(PIVOT_X0)
    this._freezeBall(THETA_MAX)
    this._setControlsEnabled(false)
    this._assistCall = gsap.delayedCall(0.35, () => {
      if (!this._alive || this._phase !== 'aim') return
      this._release(ctx)
    })
  },

  // Garanterad rivning (steg 2): alla kvarvarande klossar knuffas av avsatsen.
  _knockAllOff(ctx, force) {
    if (!this._alive || this._won) return
    this._phase = 'assist'
    this._assistT = 0
    this._setControlsEnabled(false)
    if (!force) ctx.services.voice.say('Titta, alla ramlar!')
    ctx.services.audio.sfx('magi')
    for (const b of this._blocks) {
      if (b.cleared) continue
      Body.setStatic(b.body, false)
      Body.setVelocity(b.body, { x: 11 + Math.random() * 5, y: -3 - Math.random() * 4 })
      Body.setAngularVelocity(b.body, (Math.random() - 0.5) * 0.4)
      if (b.view && !b.view.destroyed) sparkle(ctx.fxLayer, b.view.x, b.view.y, { count: 5 })
    }
    if (force) {
      // Sista garanti: räkna dem som nere direkt.
      this._checkAndForce(ctx)
    }
  },

  _checkAndForce(ctx) {
    // Markera alla kvarvarande som nere (no-fail slutgaranti).
    for (const b of this._blocks) if (!b.cleared) this._onClear(ctx, b)
  },

  // ---- Mål nått: firande + ny nivå ---------------------------------------

  _win(ctx) {
    if (this._won) return
    this._won = true
    this._phase = 'resolving'
    this._aiming = false
    this._detachBall()
    this._hideHint()
    this._setControlsEnabled(false)
    this._assistCall?.kill()

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Hurra! Du knuffade ner alla klossar!')

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, 800, 360, { count: 14 })
    sparkle(ctx.fxLayer, 800, 360, { count: 10 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete()

    this._reloadCall = gsap.delayedCall(2.3, () => {
      if (!this._alive) return
      ctx.services.voice.say('Ett större torn!')
      this._loadLevel(ctx, this._level)
    })
  },

  // ---- Krock: TYST (inga krock-ljud) men rolig visuell puff ---------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    // Krock-LJUDEN är borttagna (på begäran). Endast en tyst, lekfull puff när kulan
    // slår in i tornet — håller känslan rolig utan irriterande slagljud.
    if (this._t - this._lastPuff <= 0.12) return
    let ballHit = false
    for (const pair of e.pairs) {
      const la = pair.bodyA.label
      const lb = pair.bodyB.label
      const involvesBall = la === 'ball' || lb === 'ball'
      const involvesBlock = la === 'block' || lb === 'block'
      if (involvesBall && involvesBlock && pair.bodyA.speed + pair.bodyB.speed > 3) {
        ballHit = true
        break
      }
    }
    if (ballHit && this._ballView && !this._ballView.destroyed) {
      this._lastPuff = this._t
      puff(ctx.fxLayer, this._ballView.x, this._ballView.y, { count: 5 })
    }
  },

  // Rep mellan kärrans krok och kulan. STYVT = kedjelänkar; ELASTISKT = band som tunnas
  // ut när det töjs. Repet ritas till kulans kant mot pivoten (alltid "uppåt" mot kroken).
  _drawChain() {
    const g = this._chain
    if (!g || g.destroyed || !this._ballView || this._ballView.destroyed) return
    const px = this._pivot.x
    const py = this._pivot.y
    const bx = this._ballView.x
    const by = this._ballView.y
    let dx = px - bx
    let dy = py - by
    const dlen = Math.hypot(dx, dy) || 1
    const rr = BALL_R * 0.96 * this._ballFactor
    const ax = bx + (dx / dlen) * rr
    const ay = by + (dy / dlen) * rr
    g.clear()
    if (this._rope.elastic) {
      const stretch = clamp(dlen / this._ropeLen, 0.6, STRETCH_MAX)
      const w = clamp(12 / stretch, 4, 12)
      g.moveTo(px, py).lineTo(ax, ay).stroke({ width: w, color: this._rope.color, alpha: 0.95 })
      g.moveTo(px, py).lineTo(ax, ay).stroke({ width: Math.max(1.5, w * 0.3), color: COLORS.white, alpha: 0.3 })
    } else {
      g.moveTo(px, py).lineTo(ax, ay).stroke({ width: 8, color: this._rope.color, alpha: 0.95 })
      const links = 5
      for (let i = 1; i < links; i++) {
        const tt = i / links
        g.circle(px + (ax - px) * tt, py + (ay - py) * tt, 5).fill(this._rope.color)
      }
    }
    // fäst-lug där repet möter kulan
    g.circle(ax, ay, 8 * this._ballFactor).fill(0x3a3d42).stroke({ width: 2, color: 0x23262b })
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._reloadCall?.kill()
    this._assistCall?.kill()
    this._detachBall()

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onFieldTap)
    if (this._trolley && !this._trolley.destroyed) {
      this._trolley.off('pointerdown', this._onTrolleyDown)
      this._trolley.off('globalpointermove', this._onTrolleyMove)
      this._trolley.off('pointerup', this._onTrolleyUp)
      this._trolley.off('pointerupoutside', this._onTrolleyUp)
    }
    if (this._ballView && !this._ballView.destroyed) {
      this._ballView.off('pointerdown', this._onBallDown)
      gsap.killTweensOf(this._ballView)
      gsap.killTweensOf(this._ballView.scale)
    }
    for (const b of this._blocks) {
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
      }
    }
    this._blocks = []

    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Tung, glansig rivningskula (färg + highlight + mörk kant). Fästpunkten för repet
// ritas dynamiskt i _drawChain (alltid mot kroken), så ingen fast ögla behövs här.
function makeBall(r) {
  const c = new Container()
  const body = new Graphics()
    .circle(0, 0, r)
    .fill(0x6b6f76)
    .stroke({ width: r * 0.1, color: 0x3a3d42, alpha: 0.85 })
  const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.34).fill({ color: COLORS.white, alpha: 0.45 })
  gloss.eventMode = 'none'
  c.addChild(body, gloss)
  c.interactiveChildren = false
  return c
}

// Färgglad kloss (rundad rektangel + mjuk highlight).
function makeBlock(w, h, color) {
  const c = new Container()
  const g = new Graphics()
    .roundRect(-w / 2, -h / 2, w, h, 12)
    .fill(color)
    .stroke({ width: 4, color: shade(color, 0.22), alpha: 0.7 })
  const hi = new Graphics().roundRect(-w / 2 + 10, -h / 2 + 8, w * 0.4, h * 0.22, 6).fill({ color: COLORS.white, alpha: 0.28 })
  hi.eventMode = 'none'
  c.addChild(g, hi)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Krona på toppen (emoji + mjuk glöd).
function makeCrown() {
  const c = new Container()
  const glow = new Graphics().circle(0, 0, 40).fill({ color: 0xffe27a, alpha: 0.3 })
  glow.eventMode = 'none'
  const e = new Text({ text: '👑', style: { fontFamily: FONT.body, fontSize: 54 } })
  e.anchor.set(0.5)
  c.addChild(glow, e)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
