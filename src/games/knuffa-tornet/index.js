// Knuffa Tornet — fysik-spel (2–5 år). En tung rivningskula hänger i en kedja i en
// kran ovanför ett torn av glada klossar som står på en avsats (pedestal). MÅL: knuffa
// NER ALLA klossar (och kronan 👑 på toppen) av avsatsen — en mätare fylls för varje
// kloss som ramlar, och när alla ligger nere kommer ett firande och ett större torn.
//
// KONTROLL (AimLauncher-likt pull-back): barnet GREPPAR kulan och drar BAKÅT/UPP för att
// spänna pendeln — en prickad bågvisning visar svingbanan och hur hårt det blir — och
// SLÄPPER så gravitationen svingar ner kulan i tornet (mer tillbakadrag = mer kraft).
// Liten dragning = tap → en lagom standardsving (tap-fallback, no-fail). EXTRA KONTROLL:
// en stor knapp växlar kulans STORLEK/TYNGD (Liten/Mellan/Stor) — en stor tung kula bär
// mer rörelsemängd och knuffar fler klossar på en gång (riktig matter.js-massa).
//
// INGET misslyckande: missar är roliga (puff + boing), och efter ett par svingar får
// barnet en kraftig hjälp-sving, och räcker inte den ramlar alla klossar av sig själva
// så tornet ALLTID faller. Allt ritas programmatiskt (Pixi Graphics + emoji).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { Button } from '../../lib/Button.js'
import { puff, floatText, sparkle, burst, bounceIn, bigCelebration, pop } from '../../lib/feedback.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'

const { Constraint, Composite, Body } = Matter

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// --- Geometri (designkoordinater 1280×720) ---
const PIVOT = { x: 800, y: 70 } // kranens fasta upphängningspunkt (rakt ovanför tornet)
const CHAIN_LEN = 330 // kedjans längd: kulans lägsta punkt = (800, 400), ovanför avsatsen
const BALL_R = 46 // baskula-radie (skalas av storleksknappen)
const THETA_REST = 0.9 // vilo-spänning (~51°), standardkraft vid tap
const THETA_MIN = 0.45 // minsta spänning
const THETA_MAX = 1.45 // största spänning (~83°)

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

const REST_SPEED = 1.6 // matter-fart under detta = svinget har lugnat sig
const MAX_FLIGHT = 3.6 // s innan en sving avbryts (no-fail)
const IDLE_DELAY = 6 // s utan handling -> röst-recue
const HIT_THROTTLE = 0.07 // s mellan krock-ljud

const cockPos = (theta) => ({
  x: PIVOT.x - CHAIN_LEN * Math.sin(theta),
  y: PIVOT.y + CHAIN_LEN * Math.cos(theta),
})

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
    this._phase = 'aim' // aim | swing | assist | resolving
    this._won = false
    this._aiming = false
    this._theta = THETA_REST
    this._blocks = [] // { body, view, cleared, isCrown }
    this._total = 0
    this._cleared = 0
    this._clearedAtStart = 0
    this._misses = 0
    this._crownDown = false
    this._sizeIdx = 1
    this._ballFactor = 1

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

    // Kloss-lager (under kedja/kula i z-led).
    this._blockLayer = new Container()
    this._root.addChild(this._blockLayer)

    // Kedja + kran-arm (dekor).
    this._chain = new Graphics()
    this._chain.eventMode = 'none'
    this._root.addChild(this._chain)
    this._buildCrane()

    // Bågvisning (prickad svingbana) — ritas om vid sikte.
    this._hint = new Graphics()
    this._hint.eventMode = 'none'
    this._hint.visible = false
    this._root.addChild(this._hint)

    // Rivningskulan (greppbar, pendel-tvång till kranens fasta punkt).
    this._ballView = makeBall(BALL_R)
    const start = cockPos(this._theta)
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
      pointA: { x: PIVOT.x, y: PIVOT.y },
      bodyB: this._ballBody,
      pointB: { x: 0, y: 0 },
      length: CHAIN_LEN,
      stiffness: 0.95,
      damping: 0.03,
    })
    Composite.add(this._phys.world, this._constraint)
    this._bindBall(ctx)
    this._root.addChild(this._ballView)

    // UI: mätare (mål-framsteg) + storleksknapp.
    this._buildMeter(ctx)
    this._buildSizeButton(ctx)

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

  // ---- Scenbyggen ---------------------------------------------------------

  _buildPedestal(ctx) {
    const g = new Graphics()
    g.roundRect(PED.x1, LEDGE_Y, PED.x2 - PED.x1, FLOOR_Y - LEDGE_Y + 30, 22).fill(COLORS.brown)
    g.roundRect(PED.x1, LEDGE_Y, PED.x2 - PED.x1, 16, 22).fill({ color: 0xffffff, alpha: 0.18 })
    g.roundRect(PED.x1 + 12, LEDGE_Y + 30, PED.x2 - PED.x1 - 24, 10, 6).fill({ color: 0x000000, alpha: 0.12 })
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildCrane() {
    const g = new Graphics()
    // Horisontell kran-arm + stöttepelare upp till pivoten.
    g.roundRect(PIVOT.x - 150, PIVOT.y - 26, 220, 18, 8).fill(COLORS.inkSoft)
    g.roundRect(PIVOT.x - 150, PIVOT.y - 150, 18, 150, 8).fill(COLORS.inkSoft)
    // Pivot-knopp där kedjan fäster.
    g.circle(PIVOT.x, PIVOT.y, 12).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.ink })
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildMeter(ctx) {
    this._meter = new Container()
    this._meter.position.set(ctx.width / 2, 44)
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
      label: 'Mellan',
      width: 200,
      height: 116,
      color: COLORS.blue,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._cycleSize(ctx),
    })
    this._sizeBtn.position.set(150, 628)
    this._root.addChild(this._sizeBtn)
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

    // Kula tillbaka i vilospänning, statisk, mellanstorlek.
    this._setSize(1)
    this._sizeIdx = 1
    this._freezeBall(THETA_REST)

    this._buildTower(ctx, level)
    this._updateMeter()

    this._sizeBtn?.setEnabled(true)
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

  // ---- Kula: storlek/tyngd ------------------------------------------------

  _cycleSize(ctx) {
    if (!this._alive || this._phase !== 'aim') return
    this._idle = 0
    this._sizeIdx = (this._sizeIdx + 1) % SIZES.length
    this._setSize(this._sizeIdx)
    const s = SIZES[this._sizeIdx]
    if (this._sizeBtn?._face) {
      // uppdatera etiketten via floatText (knappens text byggs en gång)
    }
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

  // ---- Pekare: pull-back-sikte (greppa kulan, dra, släpp) -----------------

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
    this._down = this._root.toLocal(e.global)
    ctx.services.audio.sfx('tap')
    if (!this._ballView.destroyed) pop(this._ballView)
    this._drawHint(this._theta)
    this._ballView.on('globalpointermove', this._onBallMove)
    this._ballView.on('pointerup', this._onBallUp)
    this._ballView.on('pointerupoutside', this._onBallUp)
  },

  _ballMove(ctx, e) {
    if (!this._aiming) return
    const p = this._root.toLocal(e.global)
    this._theta = this._angleFromPoint(p)
    this._freezeBall(this._theta)
    this._drawHint(this._theta)
  },

  _ballUp(ctx, e) {
    if (!this._aiming) return
    this._aiming = false
    this._detachBall()
    this._hideHint()
    // Tap (litet drag) använder nuvarande vilospänning -> standardsving (no-fail).
    this._release(ctx)
  },

  _angleFromPoint(p) {
    const dx = p.x - PIVOT.x
    const dy = p.y - PIVOT.y
    // vinkel från lodrätt nedåt, positiv åt vänster (mer = mer kraft)
    const theta = Math.atan2(-dx, dy)
    return clamp(theta, THETA_MIN, THETA_MAX)
  },

  // Placera den STATISKA kulan på pendelcirkeln vid spänningsvinkel theta.
  _freezeBall(theta) {
    this._theta = theta
    const c = cockPos(theta)
    if (this._ballBody) {
      Body.setStatic(this._ballBody, true)
      Body.setPosition(this._ballBody, c)
      Body.setVelocity(this._ballBody, { x: 0, y: 0 })
      Body.setAngularVelocity(this._ballBody, 0)
      Body.setAngle(this._ballBody, 0)
    }
    if (this._ballView && !this._ballView.destroyed) {
      this._ballView.position.set(c.x, c.y)
      this._ballView.rotation = 0
    }
  },

  // Släpp kulan: gravitationen + kedjan svingar ner den i tornet (kraft ∝ spänning).
  _release(ctx) {
    if (!this._alive) return
    this._phase = 'swing'
    this._flightT = 0
    this._restT = 0
    this._clearedAtStart = this._cleared
    this._sizeBtn?.setEnabled(false)
    Body.setStatic(this._ballBody, false)
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    Body.setAngularVelocity(this._ballBody, 0)
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
    const power = (theta - THETA_MIN) / (THETA_MAX - THETA_MIN) // 0..1
    const col = power > 0.66 ? COLORS.orange : power > 0.33 ? COLORS.yellow : COLORS.white
    let n = 0
    for (let a = theta; a > -0.45; a -= 0.12) {
      const c = cockPos(a)
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
    if (!this._alive || this._aiming) return
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
      if (this._aiming) {
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
      sparkle(ctx.fxLayer, b.view?.x ?? PIVOT.x, b.view?.y ?? PIVOT.y, { count: 10 })
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
    this._sizeBtn?.setEnabled(true)
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

  // Hjälp-sving (steg 1): stor tung kula + full spänning, svingas automatiskt.
  _autoAssistSwing(ctx) {
    if (!this._alive || this._won) return
    ctx.services.voice.say('Jag hjälper till!')
    this._setSize(2) // stor & tung
    this._sizeIdx = 2
    this._freezeBall(THETA_MAX)
    this._sizeBtn?.setEnabled(false)
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
    this._sizeBtn?.setEnabled(false)
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
    this._sizeBtn?.setEnabled(false)
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

  // ---- Krock-ljud ---------------------------------------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    if (this._t - this._lastHit <= HIT_THROTTLE) return
    let ballHit = false
    let blockHit = false
    for (const pair of e.pairs) {
      const la = pair.bodyA.label
      const lb = pair.bodyB.label
      const involvesBall = la === 'ball' || lb === 'ball'
      const involvesBlock = la === 'block' || lb === 'block'
      if (!involvesBlock) continue
      if (pair.bodyA.speed + pair.bodyB.speed < 2.5) continue
      if (involvesBall) ballHit = true
      else blockHit = true
    }
    if (ballHit || blockHit) {
      this._lastHit = this._t
      ctx.services.audio.sfx(ballHit ? 'boing' : 'pop')
      if (ballHit && this._ballView && !this._ballView.destroyed) {
        puff(ctx.fxLayer, this._ballView.x, this._ballView.y, { count: 6 })
      }
    }
  },

  _drawChain() {
    const g = this._chain
    if (!g || g.destroyed || !this._ballView || this._ballView.destroyed) return
    g.clear()
    g.moveTo(PIVOT.x, PIVOT.y)
      .lineTo(this._ballView.x, this._ballView.y)
      .stroke({ width: 8, color: COLORS.inkSoft, alpha: 0.9 })
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

// Tung, glansig rivningskula (färg + highlight + mörk kant) med liten dekor-länk.
function makeBall(r) {
  const c = new Container()
  const body = new Graphics()
    .circle(0, 0, r)
    .fill(0x6b6f76)
    .stroke({ width: r * 0.1, color: 0x3a3d42, alpha: 0.85 })
  const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.34).fill({ color: COLORS.white, alpha: 0.45 })
  gloss.eventMode = 'none'
  // Liten fästögla upptill (där kedjan möter kulan).
  const ring = new Graphics().circle(0, -r * 0.96, r * 0.16).stroke({ width: r * 0.1, color: 0x3a3d42 })
  ring.eventMode = 'none'
  c.addChild(ring, body, gloss)
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
