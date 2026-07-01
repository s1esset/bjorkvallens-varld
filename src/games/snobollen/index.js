// Snöbollen — rulla en liten snöboll nerför en vinterbacke och se den VÄXA genom
// snön, välta pingviner/lådor och till slut klumpa ihop sig till en glad snögubbe.
// Ren bygg-och-växa-tillfredsställelse, helt utan risk att misslyckas.
//
// Två barnvänliga kontroller som tydligt ändrar utfallet:
//   STYR  — håll och dra i sidled (eller tappa en punkt): snöbollen följer fingret
//           i x medan gravitationen sköter nedförsfarten -> styr fart + var den hamnar.
//   KNUFF — snabbt tap på snöbollen: en fart-knuff nedför backen -> mer momentum att
//           välta mål. Fler knuffar = kraftigare smäll.
// Snöbollen drivs helt av gravitation + styrning (ingen sikt-förhandsvisning), så
// ingen pricklinje-kalibrering behövs — allt körs på matter.js fasta 1/60-steg.
//
// No-fail: minst ett snöfält ligger rakt i bollens väg (växt utan styrning), backen
// lutar alltid nedåt (bollen rullar fram), en stillastående boll får en mjuk auto-knuff,
// och är bollen för liten vid snögubbe-platsen trollas extra snö fram tills den är stor
// nog. Varje runda slutar med en snögubbe + firande. Inget "game over", ingen poäng.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, MATERIALS } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { puff, sparkle, burst, bigCelebration, floatText, pop, bounceIn } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Backens geometri (statisk sluttning) i designkoordinater (1280×720) ---------
const HILL = { cx: 640, cy: 470, w: 1480, h: 120, angle: 0.16 } // vänster högt, höger lågt
const SIN = Math.sin(HILL.angle)
const COS = Math.cos(HILL.angle)
const TAN = Math.tan(HILL.angle)
// Backens topp-yta är en linje genom denna punkt med lutning TAN (uppmätt från kroppen).
const SURF_X = HILL.cx + (HILL.h / 2) * SIN // 649.6
const SURF_Y = HILL.cy - (HILL.h / 2) * COS // 410.8

const START = { x: 215, y: 250 } // snöbollens startläge, högt upp till vänster
const BASE_R = 40 // start-radie
const MAX_R = 110 // maxradie
const ZONE_X = 1085 // når bollen hit (längst ned-höger) -> bygg snögubbe
const ZONE = { x: 1140, r: 120 } // snögubbe-platsens visuella ring
const MAX_V = 22 // hastighets-clamp (px/steg) så bollen aldrig skjuts genom en vägg
const IDLE = 6 // s utan handling -> röst-recue
const STUCK = 2.5 // s stillastående -> mjuk auto-knuff

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const TOPPLE_WORDS = ['Oj!', 'Hihi!', 'Wii!', 'Pang!']

export default {
  id: 'snobollen',
  titleSv: 'Snöbollen',
  icon: '⛄',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'snobollen',
  voiceIntro: 'Dra för att rulla snöbollen nerför backen!',

  init(ctx) {
    this._alive = true
    this._gt = 0 // speltid (s)
    this._idle = 0
    this._stillT = 0
    this._r = BASE_R
    this._steering = false
    this._tapSteerT = 0
    this._fingerX = START.x
    this._downX = START.x
    this._downTime = 0
    this._moved = false
    this._downOnBall = false
    this._resolving = false
    this._lastKnuff = -1
    this._lastBounce = -1
    this._lastGrowSound = -1
    this._fields = []
    this._targets = []
    this._snowParts = []
    this._flakes = []
    this._decorTweens = []
    this._rollT = 0 // nedräkning till nästa rull-knaster
    this._prevX = START.x // förra frames position (för rull-distans)
    this._prevY = START.y
    this._lastTrailX = START.x // senast utlagda spår-prick
    this._lastTrailY = START.y
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Vinterbakgrund som FÖRSTA barn (snöig himmel + vit markremsa).
    const winter = { top: 0xcfe9ff, bottom: 0xeaf6ff, ground: 0xffffff, groundDark: 0xdce8f2, sun: true, clouds: 2 }
    this._root.addChild(createScene(winter, { width: ctx.width, height: ctx.height }))

    // Stor osynlig styr-yta: pekning var som helst "tar tag" i leken.
    this._backdrop = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0xffffff, alpha: 0 })
    this._backdrop.eventMode = 'static'
    this._onBackDown = (e) => this._onDown(ctx, e, false)
    this._onUpEv = () => this._onUp()
    this._backdrop.on('pointerdown', this._onBackDown)
    this._backdrop.on('pointerup', this._onUpEv)
    this._backdrop.on('pointerupoutside', this._onUpEv)
    this._root.addChild(this._backdrop)

    this._buildHill()
    this._buildDecor(ctx) // granar, stenar, stuga med rök -> levande backe
    this._buildFlakes(ctx)

    // Lager i rätt z-ordning (bak -> fram).
    this._fieldLayer = new Container()
    this._targetLayer = new Container()
    this._ballLayer = new Container()
    this._snowLayer = new Container()
    this._hintLayer = new Container()
    for (const layer of [this._fieldLayer, this._targetLayer, this._ballLayer, this._snowLayer, this._hintLayer]) {
      layer.eventMode = 'passive'
      this._root.addChild(layer)
    }

    // Rull-spår: ett brett ljust släp ritas här (bakom fält/boll), nollställs per bana.
    this._trail = new Graphics()
    this._trail.eventMode = 'none'
    this._root.addChildAt(this._trail, this._root.getChildIndex(this._fieldLayer))

    // Fysik: gravitation drar nedåt; väggar håller bollen kvar på banan.
    this._phys = new PhysicsWorld({ gravityY: 1.1, walls: ['floor', 'left', 'right'] })
    // Backen som statiskt fysik-golv (samma transform som grafiken).
    this._hillBody = this._phys.rectangle(HILL.cx, HILL.cy, HILL.w, HILL.h, {
      isStatic: true,
      angle: HILL.angle,
      friction: 0.4,
      label: 'hill',
    })

    this._makeBall(ctx)
    this._buildZone()
    this._buildMeter()

    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._tick = (ticker) => {
      if (!this._alive) return
      this._phys.update(ticker.deltaMS)
      this._gameTick(ctx, ticker)
    }
    ctx.ticker.add(this._tick)

    this._loadLevel(ctx, this._level)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen -------------------------------------------------------

  _buildHill() {
    const c = new Container()
    c.position.set(HILL.cx, HILL.cy)
    c.rotation = HILL.angle
    c.eventMode = 'none'
    const hw = HILL.w / 2
    const hh = HILL.h / 2
    const g = new Graphics()
    g.roundRect(-hw - 20, hh - 18, HILL.w + 40, 60, 30).fill({ color: 0xb9cfe0, alpha: 0.35 }) // markskugga under backen
    g.roundRect(-hw, -hh, HILL.w, HILL.h, 42).fill(COLORS.white) // själva backen
    g.roundRect(-hw, -hh, HILL.w, 26, 42).fill({ color: 0xeaf2fb }) // snö-glans uppe
    g.roundRect(-hw, hh - 22, HILL.w, 22, 42).fill({ color: 0xdce8f2, alpha: 0.8 }) // mjuk skugg-kant
    c.addChild(g)
    this._root.addChild(c)
  },

  _buildFlakes(ctx) {
    this._flakeLayer = new Container()
    this._flakeLayer.eventMode = 'none'
    for (let i = 0; i < 16; i++) {
      const f = new Graphics().circle(0, 0, 2 + Math.random() * 3).fill({ color: 0xffffff, alpha: 0.8 })
      f.x = Math.random() * ctx.width
      f.y = Math.random() * ctx.height
      f.vy = 14 + Math.random() * 20
      f.vx = Math.random() * 8 - 4
      this._flakeLayer.addChild(f)
      this._flakes.push(f)
    }
    this._root.addChild(this._flakeLayer)
  },

  // Befolka backen: fjärran gran-siluetter, snöiga stenar, granar och en stuga
  // med rykande skorsten. Allt dekorativt (eventMode 'none'), bakom fält/boll.
  _buildDecor(ctx) {
    const decor = new Container()
    decor.eventMode = 'none'
    decor.interactiveChildren = false

    // Fjärran gran-siluetter (djup/dis) längs backens topp.
    const far = new Graphics()
    for (let i = 0; i < 7; i++) {
      const x = 30 + i * 180 + (Math.random() * 40 - 20)
      const by = this._surfaceY(x) - 4
      const h = 40 + Math.random() * 26
      far.moveTo(x - h * 0.4, by).lineTo(x + h * 0.4, by).lineTo(x, by - h).closePath().fill({ color: 0xb9cfe0, alpha: 0.5 })
    }
    decor.addChild(far)

    // Snöklädda stenar.
    for (const [x, s] of [[300, 1], [870, 0.8]]) {
      const rock = new Graphics().ellipse(0, 0, 30 * s, 20 * s).fill(0xa7b8c8).ellipse(0, -7 * s, 25 * s, 11 * s).fill(0xffffff)
      rock.position.set(x, this._surfaceY(x) - 8)
      decor.addChild(rock)
    }

    // Snöiga granar längs backen.
    for (const [x, s] of [[95, 1.2], [455, 0.9], [770, 1.05], [1000, 0.8]]) decor.addChild(this._makeTree(x, s))

    // Stuga med rykande skorsten (uppe till vänster).
    const cx = 165
    const cot = new Container()
    cot.position.set(cx, this._surfaceY(cx))
    const cg = new Graphics()
    cg.roundRect(-38, -46, 76, 50, 6).fill(0xd98b6a) // vägg
    cg.roundRect(-14, -26, 20, 30, 3).fill(0x8a5a3b) // dörr
    cg.roundRect(12, -34, 16, 16, 3).fill(0xfff2c0) // fönster (varmt ljus)
    cg.rect(20, -78, 12, 22).fill(0xb5654a) // skorsten
    cg.moveTo(-48, -44).lineTo(0, -82).lineTo(48, -44).closePath().fill(0xffffff) // snötak
    cot.addChild(cg)
    const smoke = new Graphics()
    smoke.eventMode = 'none'
    cot.addChild(smoke)
    const st = { t: 0 }
    const stw = gsap.to(st, {
      t: 1,
      duration: 2.8,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        if (smoke.destroyed) {
          stw.kill()
          return
        }
        smoke.clear()
        for (let i = 0; i < 3; i++) {
          const p = (st.t + i / 3) % 1
          smoke.circle(26 + p * 12, -78 - p * 44, 4 + p * 9).fill({ color: 0xffffff, alpha: 0.45 * (1 - p) })
        }
      },
    })
    this._decorTweens.push(stw)
    decor.addChild(cot)

    this._decor = decor
    this._root.addChild(decor) // efter backen, före flingor + fält/boll
  },

  // En liten snötäckt gran vid backens yta (stam + tre grantoppar + snötopp).
  _makeTree(x, s = 1) {
    const g = new Graphics()
    g.roundRect(-4 * s, -16 * s, 8 * s, 22 * s, 2).fill(0x8a5a3b)
    const tri = (by, hw, h) => g.moveTo(-hw * s, by * s).lineTo(hw * s, by * s).lineTo(0, (by - h) * s).closePath()
    tri(-8, 30, 34).fill(0x3f7d54)
    tri(-28, 25, 32).fill(0x3f7d54)
    tri(-46, 19, 28).fill(0x3f7d54)
    g.circle(0, -72 * s, 7 * s).fill(0xffffff)
    g.circle(-13 * s, -22 * s, 5 * s).fill({ color: 0xffffff, alpha: 0.85 })
    g.circle(11 * s, -36 * s, 5 * s).fill({ color: 0xffffff, alpha: 0.85 })
    g.position.set(x, this._surfaceY(x) - 2)
    g.eventMode = 'none'
    return g
  },

  _surfaceY(x) {
    return SURF_Y + TAN * (x - SURF_X)
  },

  // ---- Snöbollen ----------------------------------------------------------

  _makeBall(ctx) {
    // Markskugga (separat, roterar INTE med bollen — håller sig upprätt under den).
    this._ballShadow = new Graphics().ellipse(0, 0, BASE_R * 0.9, BASE_R * 0.34).fill({ color: 0x6f86a0, alpha: 0.22 })
    this._ballShadow.eventMode = 'none'
    this._ballLayer.addChild(this._ballShadow)

    // Bollens container: glanscirkel + highlight + kant + dekor-prick (rotationen syns).
    this._ball = new Container()
    const main = new Graphics().circle(0, 0, BASE_R).fill(0xffffff).stroke({ width: 3, color: 0xdfeaf4 })
    const hi = new Graphics().circle(-BASE_R * 0.32, -BASE_R * 0.32, BASE_R * 0.34).fill({ color: 0xf2f8ff, alpha: 0.9 })
    const dot = new Graphics().circle(BASE_R * 0.32, -BASE_R * 0.12, BASE_R * 0.14).fill({ color: 0xbfe0f5, alpha: 0.8 })
    for (const ch of [main, hi, dot]) ch.eventMode = 'none'
    this._ball.addChild(main, hi, dot)
    this._ball.position.set(START.x, START.y)
    this._ball.eventMode = 'static'
    this._ball.cursor = 'pointer'
    this._ball.hitArea = new Circle(0, 0, BASE_R + 24) // skalas med containern -> alltid stor träffyta
    this._ballLayer.addChild(this._ball)

    // Fysikkropp: låg friktion = rullar lätt; låg studs = klistrar mot backen.
    this._ballBody = this._phys.circle(START.x, START.y, BASE_R, {
      restitution: 0.1,
      friction: 0.06,
      frictionAir: 0.012,
      density: 0.0016,
      label: 'snowball',
    })
    // Vyn speglar alltid fysikradien (this._r / BASE_R) + skuggan följer med.
    this._phys.link(this._ballBody, this._ball, (v) => {
      if (v.destroyed) return
      v.scale.set(this._r / BASE_R)
      const s = this._ballShadow
      if (s && !s.destroyed) {
        s.x = v.x
        s.y = v.y + this._r * 0.86
        s.scale.set(this._r / BASE_R)
      }
    })

    // Pekare: håll-och-dra styr, snabb-tap knuffar.
    this._onBallDown = (e) => this._onDown(ctx, e, true)
    this._onMoveEv = (e) => this._onMove(ctx, e)
    this._onKnuffEv = () => this._onKnuff(ctx)
    this._ball.on('pointerdown', this._onBallDown)
    this._ball.on('globalpointermove', this._onMoveEv)
    this._ball.on('pointerup', this._onUpEv)
    this._ball.on('pointerupoutside', this._onUpEv)
    this._ball.on('pointertap', this._onKnuffEv)
  },

  // ---- Mål-zon (snögubbe-plats) + tillväxt-mätare -------------------------

  _buildZone() {
    this._zoneC = new Container()
    this._zoneC.eventMode = 'none'
    this._zoneC.position.set(ZONE.x, this._surfaceY(ZONE.x) - 70)
    const ring = new Graphics()
    // Streckad ring = rad av små bågar/prickar runt cirkeln.
    const n = 26
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      ring.circle(Math.cos(a) * ZONE.r, Math.sin(a) * ZONE.r, 5).fill({ color: COLORS.blue, alpha: 0.4 })
    }
    const mark = new Text({ text: '❄', style: { fontFamily: FONT.body, fontSize: 64, fill: COLORS.blue } })
    mark.anchor.set(0.5)
    mark.alpha = 0.5
    this._zoneC.addChild(ring, mark)
    this._root.addChildAt(this._zoneC, this._root.getChildIndex(this._fieldLayer)) // bakom fält/boll
    this._zoneTween = gsap.to(this._zoneC.scale, { x: 1.07, y: 1.07, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildMeter() {
    this._meterC = new Container()
    this._meterC.eventMode = 'none'
    this._meterC.position.set(1206, 120)
    const bg = new Graphics().roundRect(0, 0, 44, 150, 18).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 3, color: COLORS.blue, alpha: 0.5 })
    this._meterFill = new Graphics()
    const cap = new Text({ text: '⛄', style: { fontFamily: FONT.body, fontSize: 40 } })
    cap.anchor.set(0.5, 1)
    cap.position.set(22, -6)
    this._meterC.addChild(bg, this._meterFill, cap)
    this._root.addChild(this._meterC)
    this._updateMeter()
  },

  _updateMeter() {
    if (!this._meterFill || this._meterFill.destroyed) return
    const target = Math.max(1, (this._bigEnough || 80) - BASE_R)
    const p = clamp((this._r - BASE_R) / target, 0, 1)
    const H = 142
    this._meterFill.clear().roundRect(5, 4 + H * (1 - p), 34, H * p, 14).fill({ color: COLORS.blue, alpha: 0.85 })
  },

  // ---- Banor (nivåberoende, cykliska) -------------------------------------

  _layoutFor(level) {
    let nF
    let nT
    let bigEnough
    if (level <= 1) {
      nF = 5
      nT = 1
      bigEnough = 80
    } else if (level <= 3) {
      nF = 6
      nT = 2
      bigEnough = 90
    } else if (level <= 5) {
      nF = 7
      nT = 3
      bigEnough = 95
    } else {
      nF = 9
      nT = 4
      bigEnough = 100
    }
    const lerp = (a, b, n, i) => (n <= 1 ? (a + b) / 2 : a + (b - a) * (i / (n - 1)))
    const jit = (m) => Math.random() * m * 2 - m

    const fields = []
    for (let i = 0; i < nF; i++) {
      const x = clamp(lerp(320, 1010, nF, i) + jit(28), 300, 1030)
      fields.push({ x, y: this._surfaceY(x) - 30 })
    }
    const targets = []
    for (let i = 0; i < nT; i++) {
      const x = clamp(lerp(440, 985, nT, i) + (nT > 1 ? jit(26) : 0), 420, 1000)
      targets.push({ x, type: randomFrom(['penguin', 'box']) })
    }
    return { fields, targets, bigEnough, start: { ...START } }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._clearDynamic()
    this._level = level
    this._resolving = false
    this._idle = 0
    this._stillT = 0
    this._tapSteerT = 0
    this._steering = false
    this._clearHint()

    const lay = this._layoutFor(level)
    this._bigEnough = lay.bigEnough
    for (const f of lay.fields) this._addField(f.x, f.y)
    for (const t of lay.targets) this._addTarget(t.x, t.type)

    this._resetBall(lay.start.x, lay.start.y)
    if (this._ball && !this._ball.destroyed) pop(this._ball)
  },

  _clearDynamic() {
    for (const f of this._fields) {
      f._fadeTw?.kill()
      gsap.killTweensOf(f)
      if (!f.destroyed) f.destroy()
    }
    this._fields = []
    for (const t of this._targets) {
      if (t.body) this._phys.removeBody(t.body)
      gsap.killTweensOf(t.view)
      if (t.view && !t.view.destroyed) t.view.destroy()
    }
    this._targets = []
    for (const p of this._snowParts) {
      gsap.killTweensOf(p)
      gsap.killTweensOf(p.scale)
      if (!p.destroyed) p.destroy()
    }
    this._snowParts = []
    this._growTween?.kill()
    this._helpTimer?.kill()
  },

  _addField(x, y) {
    const f = new Graphics()
    const blobs = 3 + (Math.random() < 0.5 ? 1 : 0)
    for (let i = 0; i < blobs; i++) {
      const ox = Math.random() * 56 - 28
      const oy = Math.random() * 26 - 13
      const r = 34 + Math.random() * 22
      f.circle(ox, oy, r).fill({ color: 0xffffff, alpha: 0.95 }).stroke({ width: 3, color: 0xeaf2fb, alpha: 0.6 })
    }
    f.position.set(x, y)
    f.eventMode = 'none'
    f._cx = x
    f._cy = y
    f._eaten = false
    this._fieldLayer.addChild(f)
    this._fields.push(f)
  },

  _addTarget(x, type) {
    const sy = this._surfaceY(x)
    const view = new Container()
    const feet = new Graphics().ellipse(0, 44, 30, 12).fill({ color: 0xdfeaf4, alpha: 0.9 })
    const emoji = new Text({ text: type === 'penguin' ? '🐧' : '📦', style: { fontFamily: FONT.body, fontSize: 84 } })
    emoji.anchor.set(0.5, 0.62)
    feet.eventMode = 'none'
    emoji.eventMode = 'none'
    view.addChild(feet, emoji)
    view.position.set(x, sy - 46)
    view.rotation = HILL.angle
    view.eventMode = 'none'
    this._targetLayer.addChild(view)
    // Lätt dynamisk kropp som står på backen och flyger när en stor/snabb boll smäller in.
    const body = this._phys.rectangle(x, sy - 46, 78, 90, { ...MATERIALS.light, friction: 0.6, angle: HILL.angle, label: 'target' })
    this._phys.link(body, view)
    this._targets.push({ body, view, color: type === 'penguin' ? 0x5a6b7a : COLORS.orange, lastHit: -1 })
  },

  _resetBall(x, y) {
    const b = this._ballBody
    Body.setStatic(b, false)
    const f = BASE_R / this._r
    if (f > 0 && isFinite(f) && Math.abs(f - 1) > 1e-4) Body.scale(b, f, f)
    this._r = BASE_R
    Body.setAngle(b, 0)
    Body.setAngularVelocity(b, 0)
    Body.setVelocity(b, { x: 0, y: 0 })
    Body.setPosition(b, { x, y })
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball.scale)
      this._ball.rotation = 0
      this._ball.scale.set(1)
      this._ball.position.set(x, y)
    }
    // Nollställ rull-distans + spår så bollens teleport inte ger ett falskt hopp.
    this._prevX = x
    this._prevY = y
    this._lastTrailX = x
    this._lastTrailY = y
    this._trail?.clear()
    this._updateMeter()
  },

  // ---- Pekare: STYR (drag/tap-tap) + KNUFF (tap) --------------------------

  _onDown(ctx, e, onBall) {
    if (!this._alive || this._resolving) return
    const p = this._root.toLocal(e.global)
    this._steering = true
    this._downOnBall = onBall
    this._downX = p.x
    this._fingerX = p.x
    this._downTime = this._gt
    this._moved = false
    this._idle = 0
    this._stillT = 0
    ctx.services.audio.sfx('tap')
    if (this._ball && !this._ball.destroyed) pop(this._ball)
    this._drawHint()
  },

  _onMove(ctx, e) {
    if (!this._alive || this._resolving || !this._steering) return
    const p = this._root.toLocal(e.global)
    this._fingerX = p.x
    if (Math.abs(p.x - this._downX) > 14) this._moved = true
    this._idle = 0
    this._stillT = 0
    this._drawHint()
  },

  _onUp() {
    if (!this._alive) return
    const wasSteer = this._steering
    this._steering = false
    this._clearHint()
    // Tap-tap-fallback: ett kort tap UTANFÖR bollen -> styr mjukt mot tappade x en stund.
    if (wasSteer && !this._downOnBall && !this._moved && this._gt - this._downTime < 0.4) {
      this._tapSteerT = 0.8
    }
  },

  _onKnuff(ctx) {
    if (!this._alive || this._resolving) return
    if (this._gt - this._lastKnuff < 0.15) return // throttle
    this._lastKnuff = this._gt
    const b = this._ballBody
    Body.setVelocity(b, { x: b.velocity.x + 6, y: b.velocity.y + 1 }) // ned-höger längs backen
    ctx.services.audio.sfx('whoosh')
    if (this._ball && !this._ball.destroyed) {
      pop(this._ball)
      puff(ctx.fxLayer, this._ball.x - this._r * 0.6, this._ball.y, { count: 8, color: 0xffffff })
    }
    this._idle = 0
    this._stillT = 0
  },

  _drawHint() {
    if (!this._hintLayer || this._hintLayer.destroyed) return
    if (!this._hint) {
      this._hint = new Graphics()
      this._hint.eventMode = 'none'
      this._hintLayer.addChild(this._hint)
    }
    this._hint.clear()
    if (!this._ball || this._ball.destroyed) return
    const x0 = this._ball.x
    const y0 = this._ball.y
    const x1 = this._fingerX
    for (let i = 1; i <= 6; i++) {
      const x = x0 + (x1 - x0) * (i / 6)
      this._hint.circle(x, y0, 5).fill({ color: 0xffffff, alpha: 0.7 })
    }
  },

  _clearHint() {
    if (this._hint && !this._hint.destroyed) this._hint.clear()
  },

  // ---- Spel-loop: styrning, växt, mål-zon, idle/auto-hjälp ----------------

  _gameTick(ctx, ticker) {
    const dt = ticker.deltaMS / 1000
    this._gt += dt
    this._updateFlakes(dt, ctx)
    if (!this._alive || this._resolving) return

    const b = this._ballBody

    // Mjuk sidledsstyrning mot fingret (eller tap-tap-fönstret).
    if (this._tapSteerT > 0) this._tapSteerT -= dt
    if (this._steering || this._tapSteerT > 0) {
      const desired = clamp((this._fingerX - b.position.x) * 0.09, -9, 9)
      const vx = b.velocity.x
      Body.setVelocity(b, { x: vx + (desired - vx) * 0.25, y: b.velocity.y })
      if (this._steering) this._drawHint()
    }

    // Hastighets-clamp (anti-tunnel).
    const cvx = clamp(b.velocity.x, -MAX_V, MAX_V)
    const cvy = clamp(b.velocity.y, -MAX_V, MAX_V)
    if (cvx !== b.velocity.x || cvy !== b.velocity.y) Body.setVelocity(b, { x: cvx, y: cvy })

    // Fart + läge mot backens yta (delas av spår, rull-ljud och rull-tillväxt).
    const spd = Math.hypot(b.velocity.x, b.velocity.y)
    const surfY = this._surfaceY(b.position.x)
    const onGround = b.position.y > surfY - this._r - 26
    const frameDist = Math.hypot(b.position.x - this._prevX, b.position.y - this._prevY)
    this._prevX = b.position.x
    this._prevY = b.position.y

    // Rull-spår: lägg en bred, ljus prick där bollen rullar (visar fart + väg).
    if (onGround && this._trail && !this._trail.destroyed) {
      if (Math.hypot(b.position.x - this._lastTrailX, b.position.y - this._lastTrailY) > 15) {
        this._lastTrailX = b.position.x
        this._lastTrailY = b.position.y
        this._trail.circle(b.position.x, surfY + 5, this._r * 0.6).fill({ color: 0xf1f8ff, alpha: 0.5 })
      }
    }

    // Kontinuerlig rull-tillväxt: bollen samlar en aning snö hela tiden den rullar,
    // så att HÅLLA farten uppe via styrning/knuff blir en verklig strategi. Fälten
    // är bara feta bonus-klumpar ovanpå detta.
    if (onGround && frameDist > 1.5 && this._r < MAX_R) this._growBall(Math.min(frameDist * 0.01, 0.5))

    // Rull-ljud: ett mjukt knaster som stiger i tonhöjd/styrka med fart + storlek.
    this._rollT -= dt
    if (onGround && spd > 1.2 && this._rollT <= 0) {
      const f = clamp(spd / MAX_V, 0, 1)
      this._rollT = 0.16 - f * 0.08
      ctx.services.audio.tone({ freq: 90 + f * 110 + this._r * 0.4, dur: 0.07, type: 'triangle', vol: 0.05 + f * 0.06 })
    }

    // Snöfält -> växt (markera ätet direkt så samma fält bara växer en gång).
    for (const f of this._fields) {
      if (f._eaten) continue
      const dx = f._cx - b.position.x
      const dy = f._cy - b.position.y
      const reach = 70 + this._r * 0.5
      if (dx * dx + dy * dy < reach * reach) {
        f._eaten = true
        this._grow(ctx, f)
      }
    }

    // Når bollen snögubbe-platsen?
    if (b.position.x >= ZONE_X) {
      this._reachZone(ctx)
      return
    }

    // Stillastående -> mjuk auto-knuff (no-fail). (spd beräknas ovan.)
    if (spd < 0.8 && !this._steering && this._tapSteerT <= 0) {
      this._stillT += dt
      if (this._stillT >= STUCK) {
        this._stillT = 0
        this._autoNudge(ctx)
      }
    } else {
      this._stillT = 0
    }

    // Idle-recue.
    this._idle += dt
    if (this._idle >= IDLE) {
      this._idle = 0
      this._idleCue(ctx)
    }
  },

  _updateFlakes(dt, ctx) {
    for (const f of this._flakes) {
      if (f.destroyed) continue
      f.y += f.vy * dt
      f.x += f.vx * dt
      if (f.y > ctx.height + 8) {
        f.y = -8
        f.x = Math.random() * ctx.width
      }
      if (f.x < -8) f.x = ctx.width + 8
      else if (f.x > ctx.width + 8) f.x = -8
    }
  },

  // Väx radien med `delta`, skala fysikkroppen så massan/momentumet följer med.
  _growBall(delta) {
    const prev = this._r
    this._r = Math.min(MAX_R, this._r + delta)
    if (this._r > prev) {
      const f = this._r / prev
      Body.scale(this._ballBody, f, f) // matter räknar om massan från density -> mer momentum
      this._updateMeter()
    }
  },

  _grow(ctx, field) {
    this._growBall(14) // feta bonus-klumpar (mer än den kontinuerliga rull-växten)
    if (this._gt - this._lastGrowSound > 0.12) {
      this._lastGrowSound = this._gt
      ctx.services.audio.sfx('reveal')
    }
    if (this._ball && !this._ball.destroyed) {
      pop(this._ball)
      sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 7 })
    }
    floatText(ctx.fxLayer, field._cx, field._cy - 50, '❄', { fontSize: 46 })
    this._fadeField(field)
    this._idle = 0
    this._stillT = 0
  },

  // Tonar bort fältet till "uppskrapad mark" (exit-säker {}-proxy).
  _fadeField(f) {
    const st = { a: f.alpha }
    const tw = gsap.to(st, {
      a: 0.28,
      duration: 0.4,
      onUpdate: () => {
        if (f.destroyed) {
          tw.kill()
          return
        }
        f.alpha = st.a
      },
      onComplete: () => {
        if (!f.destroyed) f.tint = 0xdce8f2
      },
    })
    f._fadeTw = tw
  },

  _autoNudge(ctx) {
    if (!this._alive || this._resolving) return
    const b = this._ballBody
    Body.setVelocity(b, { x: b.velocity.x + 5, y: b.velocity.y + 0.8 })
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('Jag hjälper till!')
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 6, color: 0xffffff })
  },

  _idleCue(ctx) {
    if (!this._alive || this._resolving) return
    const v = ctx.services.voice
    if (v.replayLast) v.replayLast()
    else v.say(this.voiceIntro)
    if (this._ball && !this._ball.destroyed) pop(this._ball)
    // Pil-vink mot närmaste oätna snöfält.
    let near = null
    let best = Infinity
    for (const f of this._fields) {
      if (f._eaten) continue
      const d = Math.abs(f._cx - this._ball.x)
      if (d < best) {
        best = d
        near = f
      }
    }
    if (near) floatText(ctx.fxLayer, near._cx, near._cy - 40, '❄', { fontSize: 44 })
  },

  // ---- Kollisioner: mål vältas, väggstuds-ljud ----------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    const bb = this._ballBody
    for (const pair of e.pairs) {
      const inv = pair.bodyA === bb || pair.bodyB === bb
      if (!inv) continue
      const other = pair.bodyA === bb ? pair.bodyB : pair.bodyA
      if (other.label === 'target') {
        const t = this._targets.find((tt) => tt.body === other)
        if (t) this._hitTarget(ctx, t)
      } else if (other.label === 'wall') {
        if (this._gt - this._lastBounce > 0.18) {
          const spd = Math.hypot(bb.velocity.x, bb.velocity.y)
          if (spd > 3) {
            this._lastBounce = this._gt
            ctx.services.audio.sfx('pop')
          }
        }
      }
    }
  },

  _hitTarget(ctx, t) {
    if (this._gt - t.lastHit < 0.3) return
    t.lastHit = this._gt
    const bb = this._ballBody
    const spd = Math.hypot(bb.velocity.x, bb.velocity.y)
    const strong = this._r >= 70 || spd > 6
    if (strong) {
      // Stor/snabb boll: målet flyger undan (firande).
      Body.setVelocity(t.body, { x: 6 + Math.random() * 4, y: -7 - Math.random() * 4 })
      Body.setAngularVelocity(t.body, 0.2 + Math.random() * 0.2)
      ctx.services.audio.sfx('pop')
      ctx.services.audio.sfx('soft')
      if (t.view && !t.view.destroyed) puff(ctx.fxLayer, t.view.x, t.view.y, { count: 10, color: t.color })
      floatText(ctx.fxLayer, t.view.x, t.view.y - 50, randomFrom(TOPPLE_WORDS), { fontSize: 48 })
    } else {
      // Liten boll: målet vinglar bara lekfullt (ingen miss, ingen straff).
      Body.setVelocity(t.body, { x: 1.5, y: -1.2 })
      Body.setAngularVelocity(t.body, 0.15)
      ctx.services.audio.sfx('soft')
    }
    this._idle = 0
  },

  // ---- Snögubbe-platsen nådd: bygg snögubben (med no-fail auto-hjälp) ------

  _reachZone(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true // blockera input + dubbel-trigg
    this._steering = false
    this._tapSteerT = 0
    this._clearHint()
    const b = this._ballBody
    Body.setVelocity(b, { x: 0, y: 0 })
    Body.setStatic(b, true) // frys bollen medan snögubben byggs
    const bigEnough = this._bigEnough || 80
    if (this._r >= bigEnough) this._buildSnowman(ctx)
    else this._autoGrowAndBuild(ctx, bigEnough)
  },

  // För liten? Trolla fram extra snö tills den är stor nog, bygg sedan ändå.
  _autoGrowAndBuild(ctx, bigEnough) {
    ctx.services.voice.say('Lite mer snö!')
    ctx.services.audio.sfx('reveal')
    if (this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 10 })
    this._helpTimer = gsap.delayedCall(0.45, () => {
      if (this._alive && this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 8 })
    })
    const proxy = { r: this._r }
    this._growTween = gsap.to(proxy, {
      r: Math.min(MAX_R, bigEnough + 2),
      duration: 0.9,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._alive || !this._ballBody) {
          this._growTween?.kill()
          return
        }
        const f = proxy.r / this._r
        if (f > 0 && isFinite(f)) Body.scale(this._ballBody, f, f)
        this._r = proxy.r
        this._updateMeter()
      },
      onComplete: () => {
        if (this._alive) this._buildSnowman(ctx)
      },
    })
  },

  _buildSnowman(ctx) {
    if (!this._alive) return
    const bx = this._ball && !this._ball.destroyed ? this._ball.x : ZONE.x
    const by = this._ball && !this._ball.destroyed ? this._ball.y : this._surfaceY(ZONE.x) - 60
    const R = this._r

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Titta — en snögubbe! Bravo!')

    this._snowParts = []
    const add = (obj) => {
      obj.eventMode = 'none'
      this._snowLayer.addChild(obj)
      this._snowParts.push(obj)
      return obj
    }
    const bellyY = by - R * 0.95
    const headY = bellyY - R * 0.62
    const belly = new Graphics().circle(0, 0, R * 0.72).fill(0xffffff).stroke({ width: 3, color: 0xdfeaf4 })
    belly.position.set(bx, bellyY)
    add(belly)
    const head = new Graphics().circle(0, 0, R * 0.5).fill(0xffffff).stroke({ width: 3, color: 0xdfeaf4 })
    head.position.set(bx, headY)
    add(head)
    // Kol-ögon + knappar.
    for (const [ex, ey] of [[-R * 0.16, headY - R * 0.12], [R * 0.16, headY - R * 0.12]]) {
      const eye = new Graphics().circle(0, 0, R * 0.06).fill(0x333333)
      eye.position.set(bx + ex, ey)
      add(eye)
    }
    for (let i = 0; i < 3; i++) {
      const btn = new Graphics().circle(0, 0, R * 0.06).fill(0x333333)
      btn.position.set(bx, bellyY - R * 0.28 + i * R * 0.28)
      add(btn)
    }
    // Morots-näsa + hatt.
    const nose = new Text({ text: '🥕', style: { fontFamily: FONT.body, fontSize: R * 0.5 } })
    nose.anchor.set(0.1, 0.5)
    nose.rotation = 0.2
    nose.position.set(bx + R * 0.04, headY + R * 0.04)
    add(nose)
    const hat = new Text({ text: '🎩', style: { fontFamily: FONT.body, fontSize: R * 0.95 } })
    hat.anchor.set(0.5, 0.85)
    hat.position.set(bx, headY - R * 0.42)
    add(hat)

    this._snowParts.forEach((p, i) => bounceIn(p, { delay: 0.06 * i }))

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, bx, by, { count: 16 })

    // Förlopp: höj nivå EN gång, räkna snögubbar, kör delat firande (stjärna + klistermärke).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()
    ctx.progress.setCustom('snogubbar', (ctx.progress.get().custom?.snogubbar || 0) + 1)

    this._nextTimer?.kill()
    this._nextTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._growTween?.kill()
    this._helpTimer?.kill()
    this._nextTimer?.kill()
    this._zoneTween?.kill()
    for (const tw of this._decorTweens || []) tw?.kill()

    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball)
      gsap.killTweensOf(this._ball.scale)
      this._ball.off('pointerdown')
      this._ball.off('globalpointermove')
      this._ball.off('pointerup')
      this._ball.off('pointerupoutside')
      this._ball.off('pointertap')
    }
    if (this._backdrop && !this._backdrop.destroyed) {
      this._backdrop.off('pointerdown')
      this._backdrop.off('pointerup')
      this._backdrop.off('pointerupoutside')
    }
    for (const f of this._fields) {
      f._fadeTw?.kill()
      gsap.killTweensOf(f)
    }
    for (const p of this._snowParts) {
      gsap.killTweensOf(p)
      gsap.killTweensOf(p.scale)
    }
    if (this._zoneC) gsap.killTweensOf(this._zoneC.scale)

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
