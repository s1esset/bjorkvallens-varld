// Snöbollen — rulla en liten snöboll nerför en vinterbacke och se den VÄXA genom
// snön, välta pingviner/lådor/små snögubbar och till slut klumpa ihop sig till en
// glad snögubbe medan vakt-pingvinen vid mållinjen hejar.
//
// Två barnvänliga kontroller som tydligt ändrar utfallet:
//   STYR  — håll och dra i sidled (eller tappa en punkt): snöbollen följer fingret
//           i x medan gravitationen sköter nedförsfarten -> styr fart + var den hamnar.
//   KNUFF — snabbt tap på snöbollen: en fart-knuff nedför backen. Står bollen och
//           pressar mot ett hinder blir samma tap ett BANK som välter hindret snabbare.
//
// MOTGÅNG (aldrig stopp): hindren står stilla som riktiga hinder (statiska kroppar) —
// men de VÄLTER alltid. Kommer bollen stor OCH snabb plöjer den rakt igenom, behåller
// farten och får extra snö. Kommer den liten och långsam bromsas den, pressar sig
// igenom på ~1 s (snabbare om barnet håller/bankar) och tappar lite snö på kuppen.
// Hindret tar alltså bort SIG SJÄLVT ur vägen — ett kilat läge är strukturellt omöjligt.
// Bara ett hinder kan pressas åt gången, och en stillastående boll får ändå en mjuk
// auto-knuff som sista utväg. Varje runda slutar med en snögubbe + firande.
// Ingen poäng, ingen timer, inget "game over".
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, MATERIALS } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { puff, sparkle, burst, bigCelebration, floatText, pop, bounceIn, breathe } from '../../lib/feedback.js'
import { COLORS } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

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
const STUCK = 2 // s stillastående (och INTE mot ett hinder) -> mjuk auto-knuff

// Rullfysik. Uppmätt mot matter.js fasta 1/60-steg: med den gamla gravitationen 1.1
// och luftfriktionen 0.012 rullade bollen bara ~1 px/steg — för lite för att någonsin
// ta sig förbi ett hinder. 2.0/0.003 ger ~5 px/steg fri rullning (backen på ~6 s utan
// input) och lämnar gott om utrymme för styrningens ±9 px/steg.
const GRAVITY_Y = 2.0
const AIR = 0.003
const GROW_PER_PX = 0.022 // snö som samlas per rullad px
const FIELD_GROW = 11 // fet bonus-klump per snöfält
const SMASH_GROW = 6 // extra snö när man plöjer rakt igenom ett hinder
const GRIND_LOSS = 6 // snö som ramlar av när man pressar sig igenom långsamt

// Kollisionsfilter: bollen krockar med allt, men VÄLTA hinder (spillror) krockar bara
// med backen/väggarna — de kan alltså aldrig bli en ny vägg framför bollen.
const CAT_BALL = 0x0002
const CAT_DEBRIS = 0x0004
const MASK_DEBRIS = 0x0001

// Hindren. tip = hur mycket "press" som krävs innan det välter (sekunder vid press 1,0).
const OBSTACLES = {
  penguin: { tip: 1.0, halfW: 33, h: 86, words: ['Oj!', 'Piip!', 'Hoppsan!'], snow: 0 },
  crate: { tip: 1.35, halfW: 38, h: 80, words: ['Pang!', 'Krasch!', 'Oj!'], snow: 0 },
  snoman: { tip: 0.8, halfW: 32, h: 86, words: ['Puff!', 'Hihi!', 'Wii!'], snow: 10 },
}
const OB_TYPES = Object.keys(OBSTACLES)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

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
    this._growAcc = 0
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
    this._lastVoice = -9
    this._lastCreak = -1
    this._lastSpray = -1
    this._vxPrev = 0
    this._pressing = null // hindret som bollen pressar mot just nu (max ETT åt gången)
    this._saidBlocked = false
    this._fields = []
    this._targets = []
    this._debris = []
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
    this._debrisLayer = new Container()
    this._targetLayer = new Container()
    this._ballLayer = new Container()
    this._snowLayer = new Container()
    this._hintLayer = new Container()
    for (const layer of [this._fieldLayer, this._debrisLayer, this._targetLayer, this._ballLayer, this._snowLayer, this._hintLayer]) {
      layer.eventMode = 'passive'
      this._root.addChild(layer)
    }

    // Rull-spår: ett brett ljust släp ritas här (bakom fält/boll), nollställs per bana.
    this._trail = new Graphics()
    this._trail.eventMode = 'none'
    this._root.addChildAt(this._trail, this._root.getChildIndex(this._fieldLayer))

    // Fysik: gravitation drar nedåt; väggar håller bollen kvar på banan.
    this._phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })
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
    this._lastVoice = this._gt
  },

  // Talar bara om det gått en stund sedan sist — barnet ska inte dränkas i röst.
  _say(ctx, text, gap = 2.4) {
    if (!this._alive || this._gt - this._lastVoice < gap) return
    this._lastVoice = this._gt
    ctx.services.voice.say(text)
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
    g.roundRect(-hw, -hh, HILL.w, 7, 6).fill({ color: 0xd3e5f6 }) // tunn kant: gör lutningen läsbar mot vit himmel
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

  // ---- Ritade fristående föremål (P0 ASSETS: aldrig emoji-i-bricka) --------

  // Pingvin som tittar uppför backen mot bollen. Fötterna vid y = +42.
  _makePenguin(s = 1) {
    const g = new Graphics()
    g.ellipse(-14, 40, 12, 6).fill(0xef9a2e).ellipse(13, 41, 12, 6).fill(0xef9a2e) // fötter
    g.ellipse(-29, 4, 8, 20).fill(0x33435a).ellipse(29, 6, 8, 18).fill(0x33435a) // fenor
    g.ellipse(0, 4, 30, 38).fill(0x3a4a5e) // kropp
    g.ellipse(0, 10, 20, 28).fill(0xffffff) // mage
    g.circle(0, -28, 22).fill(0x3a4a5e) // huvud
    g.ellipse(-1, -24, 15, 14).fill(0xffffff) // ansikte
    g.moveTo(-5, -27).lineTo(-19, -21).lineTo(-5, -15).closePath().fill(0xef9a2e) // näbb
    g.circle(-8, -31, 4.6).fill(0xffffff).circle(-8.6, -31, 2.4).fill(0x1d2733)
    g.circle(5, -31, 4.6).fill(0xffffff).circle(4.4, -31, 2.4).fill(0x1d2733)
    g.ellipse(0, -46, 13, 5.5).fill({ color: 0xffffff, alpha: 0.95 }) // snömössa
    g.scale.set(s)
    g.eventMode = 'none'
    return g
  },

  // Trälåda med plankor, snedstag och snö på locket.
  _makeCrate() {
    const g = new Graphics()
    g.roundRect(-37, -38, 74, 76, 7).fill(0xc8874a).stroke({ width: 4, color: 0x9a6234 })
    g.rect(-37, -15, 74, 9).fill(0xb0763f).rect(-37, 13, 74, 9).fill(0xb0763f)
    g.moveTo(-30, 32).lineTo(-21, 32).lineTo(30, -30).lineTo(21, -30).closePath().fill({ color: 0xb0763f, alpha: 0.85 })
    g.roundRect(-40, -47, 80, 13, 6).fill(0xffffff) // snö på locket
    g.circle(-18, -47, 8).fill(0xffffff).circle(12, -49, 9).fill(0xffffff)
    g.eventMode = 'none'
    return g
  },

  // Liten snögubbe att plöja igenom (dess snö åker med i bollen).
  _makeSnoman() {
    const g = new Graphics()
    g.moveTo(-24, 8).lineTo(-46, -8).lineTo(-44, -12).lineTo(-22, 3).closePath().fill(0x8a5a3b) // kvistarm
    g.moveTo(24, 6).lineTo(45, -12).lineTo(47, -8).lineTo(26, 11).closePath().fill(0x8a5a3b)
    g.circle(0, 14, 28).fill(0xffffff).stroke({ width: 3, color: 0xdfeaf4 })
    g.circle(0, -24, 19).fill(0xffffff).stroke({ width: 3, color: 0xdfeaf4 })
    g.circle(0, 8, 3.4).fill(0x333333).circle(0, 22, 3.4).fill(0x333333) // knappar
    g.circle(-7, -28, 3).fill(0x333333).circle(7, -28, 3).fill(0x333333) // ögon
    g.moveTo(-4, -22).lineTo(-19, -19).lineTo(-4, -16).closePath().fill(0xef7c2e) // morot
    g.eventMode = 'none'
    return g
  },

  // Ritad snöflinga (mål-markering) — sex armar med små grenar.
  _makeFlake(r = 44, color = COLORS.blue) {
    const g = new Graphics()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const dx = Math.cos(a)
      const dy = Math.sin(a)
      g.moveTo(0, 0).lineTo(dx * r, dy * r).stroke({ width: 7, color, cap: 'round' })
      const bx = dx * r * 0.6
      const by = dy * r * 0.6
      const na = a + 0.9
      const ma = a - 0.9
      g.moveTo(bx, by).lineTo(bx + Math.cos(na) * r * 0.3, by + Math.sin(na) * r * 0.3).stroke({ width: 5, color, cap: 'round' })
      g.moveTo(bx, by).lineTo(bx + Math.cos(ma) * r * 0.3, by + Math.sin(ma) * r * 0.3).stroke({ width: 5, color, cap: 'round' })
    }
    g.circle(0, 0, r * 0.16).fill(color)
    g.eventMode = 'none'
    return g
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
      friction: 0.05,
      frictionAir: AIR,
      density: 0.0016,
      label: 'snowball',
      collisionFilter: { category: CAT_BALL, mask: 0xffffffff },
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

  // ---- Mål-zon (snögubbe-plats) + vakt-pingvin + tillväxt-mätare ----------

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
    const mark = this._makeFlake(44, COLORS.blue)
    mark.alpha = 0.45
    this._zoneC.addChild(ring, mark)
    this._root.addChildAt(this._zoneC, this._root.getChildIndex(this._fieldLayer)) // bakom fält/boll
    this._zoneTween = gsap.to(this._zoneC.scale, { x: 1.07, y: 1.07, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // MOTTAGAREN: en vakt-pingvin som står och väntar vid snögubbe-platsen och
    // hejar när snöbollen kommer fram.
    const gx = 1238
    this._greeter = new Container()
    this._greeter.eventMode = 'none'
    this._greeter.position.set(gx, this._surfaceY(gx) - 40)
    const shadow = new Graphics().ellipse(0, 46, 30, 9).fill({ color: 0x6f86a0, alpha: 0.2 })
    shadow.eventMode = 'none'
    this._greeterBody = this._makePenguin(0.9)
    this._greeter.addChild(shadow, this._greeterBody)
    this._root.addChild(this._greeter)
    this._greetTween = breathe(this._greeter, { scale: 1.05, duration: 1.6 })
  },

  _buildMeter() {
    this._meterC = new Container()
    this._meterC.eventMode = 'none'
    this._meterC.position.set(1206, 178) // under skalets ljudknapp uppe till höger
    const bg = new Graphics().roundRect(0, 0, 44, 150, 18).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 3, color: COLORS.blue, alpha: 0.5 })
    this._meterFill = new Graphics()
    // Liten ritad snögubbe som "lock" på mätaren (ingen emoji).
    const cap = new Graphics()
    cap.circle(22, -16, 13).fill(0xffffff).stroke({ width: 2.5, color: 0xdfeaf4 })
    cap.circle(22, -37, 9).fill(0xffffff).stroke({ width: 2.5, color: 0xdfeaf4 })
    cap.circle(19, -39, 1.8).fill(0x333333).circle(25, -39, 1.8).fill(0x333333)
    cap.moveTo(23, -36).lineTo(32, -34).lineTo(23, -32).closePath().fill(0xef7c2e)
    cap.eventMode = 'none'
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
    // Hindren sprids jämnt med garanterat glapp (>=150 px) så två aldrig kan bilda
    // en vägg, och typerna blandas så omgång 2 inte ser ut som omgång 1.
    const types = shuffle([...OB_TYPES, ...OB_TYPES]).slice(0, Math.max(1, nT))
    const targets = []
    for (let i = 0; i < nT; i++) {
      const x = clamp(lerp(430, 995, nT, i) + (nT > 1 ? jit(20) : jit(60)), 400, 1010)
      targets.push({ x, type: types[i % types.length] || randomFrom(OB_TYPES) })
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
    this._pressing = null
    this._saidBlocked = false
    this._growAcc = 0
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
      gsap.killTweensOf(t.view?.scale)
      if (t.view && !t.view.destroyed) t.view.destroy()
    }
    this._targets = []
    for (const d of this._debris) {
      if (d.body) this._phys.removeBody(d.body)
      if (d.view && !d.view.destroyed) d.view.destroy()
    }
    this._debris = []
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

  // Ett hinder = ritat föremål + STATISK kropp. Statisk (inte lätt-dynamisk) är hela
  // poängen: en dynamisk låda sköts framför bollen som en bulldozer och båda malde
  // ner i 0,13 px/steg — spelet gick inte att klara. Nu står hindret stilla tills
  // det VÄLTER, och då tas kroppen bort helt.
  _addTarget(x, type) {
    const spec = OBSTACLES[type] || OBSTACLES.penguin
    const sy = this._surfaceY(x)
    const cy = sy - spec.h / 2 - 2
    const view = new Container()
    const shadow = new Graphics().ellipse(0, spec.h / 2 - 2, spec.halfW * 0.95, 10).fill({ color: 0x6f86a0, alpha: 0.22 })
    shadow.eventMode = 'none'
    const art = type === 'crate' ? this._makeCrate() : type === 'snoman' ? this._makeSnoman() : this._makePenguin()
    view.addChild(shadow, art)
    view.position.set(x, cy)
    view.rotation = HILL.angle
    view.eventMode = 'none'
    this._targetLayer.addChild(view)

    const body = this._phys.rectangle(x, cy, spec.halfW * 2, spec.h, {
      isStatic: true,
      angle: HILL.angle,
      friction: 0.35,
      label: 'target',
    })
    const t = { body, view, art, spec, type, x, cy, press: 0, down: false, color: type === 'crate' ? COLORS.orange : type === 'snoman' ? 0xbfe0f5 : 0x5a6b7a }
    this._targets.push(t)
    bounceIn(view, { duration: 0.4 })
    return t
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
    this._vxPrev = 0
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

  // Tap på bollen: fart-knuff nedför — ELLER ett rejält BANK om bollen just nu
  // pressar mot ett hinder (då är knuffen det som får hindret att välta fortare).
  _onKnuff(ctx) {
    if (!this._alive || this._resolving) return
    if (this._gt - this._lastKnuff < 0.15) return // throttle
    this._lastKnuff = this._gt
    const b = this._ballBody
    const t = this._pressing
    if (t && !t.down) {
      t.press += 0.34
      ctx.services.audio.sfx('pop')
      ctx.services.audio.tone({ freq: 150 + t.press * 120, dur: 0.09, type: 'square', vol: 0.1 })
      if (t.view && !t.view.destroyed) {
        t.view.x = t.x + (Math.random() * 8 - 4)
        puff(ctx.fxLayer, t.view.x, t.view.y + 20, { count: 5, color: 0xffffff })
      }
    } else {
      Body.setVelocity(b, { x: b.velocity.x + 6, y: b.velocity.y + 1 }) // ned-höger längs backen
      ctx.services.audio.sfx('whoosh')
    }
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

  // ---- Spel-loop: styrning, växt, hinder, mål-zon, idle/auto-hjälp --------

  _gameTick(ctx, ticker) {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05)
    this._gt += dt
    this._updateFlakes(dt, ctx)
    this._updateDebris(dt)
    if (!this._alive || this._resolving) return

    const b = this._ballBody

    // Mjuk sidledsstyrning mot fingret (eller tap-tap-fönstret).
    if (this._tapSteerT > 0) this._tapSteerT -= dt
    const steeringNow = this._steering || this._tapSteerT > 0
    if (steeringNow) {
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

    // Kontinuerlig rull-tillväxt: bollen samlar snö per rullad px (ackumuleras och
    // appliceras i små kliv så fysikkroppen inte skalas om varje bildruta).
    if (onGround && frameDist > 0.05 && this._r < MAX_R) {
      this._growAcc += frameDist * GROW_PER_PX
      if (this._growAcc >= 0.3) {
        this._growBall(this._growAcc)
        this._growAcc = 0
      }
    }

    // Rull-ljud: ett mjukt knaster som stiger i tonhöjd/styrka med fart + storlek.
    this._rollT -= dt
    if (onGround && spd > 1.2 && this._rollT <= 0) {
      const f = clamp(spd / 10, 0, 1)
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

    // Hinder: press/välta.
    this._updateTargets(ctx, dt, spd, steeringNow)
    this._vxPrev = b.velocity.x

    // Når bollen snögubbe-platsen?
    if (b.position.x >= ZONE_X) {
      this._reachZone(ctx)
      return
    }

    // Stillastående -> mjuk auto-knuff (no-fail). Gäller ÄVEN när barnet håller kvar
    // fingret (det var förr avstängt då, alltså precis när man behövde det som mest).
    // Pressar bollen mot ett hinder räknas det inte som stillastående — hindret
    // välter av sig självt inom ~1 s och är alltså ingen fälla.
    if (spd < 0.8 && !this._pressing) {
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

  // Pressa mot hindret framför: leta upp det hinder bollen rör vid, låt "press"
  // byggas upp (snabbare ju större/snabbare bollen är och om barnet håller emot),
  // och välta det när press >= spec.tip. Kommer bollen tillräckligt stor OCH snabb
  // plöjer den rakt igenom direkt.
  _updateTargets(ctx, dt, spd, steeringNow) {
    const b = this._ballBody
    let touching = null
    for (const t of this._targets) {
      if (t.down) continue
      const dx = t.x - b.position.x
      const contact = dx > -this._r * 0.6 && dx < this._r + t.spec.halfW + 8 && b.position.y + this._r > this._surfaceY(t.x) - t.spec.h + 8
      // Bara ETT hinder åt gången kan pressas (tak på hur mycket som kan gå fel).
      if (!touching && contact && b.velocity.x > -1.2) touching = t
      else if (t.press > 0) {
        t.press = Math.max(0, t.press - dt * 1.2) // reser sig igen om bollen backar undan
        this._leanTarget(t)
      }
    }
    this._pressing = touching
    if (!touching) return

    const t = touching
    // "Plöja igenom" avgörs av MOMENTUM (fart × storlek), inte fart ensam: en
    // fullvuxen snöboll valsar rakt igenom, en liten måste kämpa sig förbi.
    const incoming = Math.max(this._vxPrev, b.velocity.x)
    const power = incoming * (this._r / 70)
    const smash = incoming >= 8.5 || (power >= 5.5 && incoming >= 2.5)
    if (t.press === 0) {
      // Första kontakten: ljud + snöspray direkt (<100 ms).
      ctx.services.audio.sfx('soft')
      if (this._ball && !this._ball.destroyed) pop(this._ball, { scale: 1.1 })
      puff(ctx.fxLayer, b.position.x + this._r * 0.7, b.position.y, { count: 6, color: 0xffffff })
      if (!smash && !this._saidBlocked) {
        this._saidBlocked = true
        this._say(ctx, 'Oj då!')
      }
    }
    if (smash) {
      this._toppleTarget(ctx, t, true, incoming)
      return
    }
    // Press-takt: storlek + fart + att barnet aktivt trycker på (styr mot hindret).
    const pushing = steeringNow && this._fingerX > b.position.x + 10
    t.press += dt * (0.55 + this._r / 90 + spd / 6 + (pushing ? 0.55 : 0))
    this._leanTarget(t)

    // Knastrande press-ljud som stiger mot vältningen + snöspray.
    if (this._gt - this._lastCreak > 0.16) {
      this._lastCreak = this._gt
      const p = clamp(t.press / t.spec.tip, 0, 1)
      ctx.services.audio.tone({ freq: 120 + p * 190, dur: 0.08, type: 'triangle', vol: 0.06 + p * 0.05 })
    }
    if (this._gt - this._lastSpray > 0.25) {
      this._lastSpray = this._gt
      puff(ctx.fxLayer, b.position.x + this._r * 0.75, b.position.y + this._r * 0.4, { count: 4, color: 0xffffff })
    }
    if (t.press >= t.spec.tip) this._toppleTarget(ctx, t, false, incoming)
  },

  // Hindret lutar sig mer och mer ju närmare vältningen det är (läsbar förvarning).
  _leanTarget(t) {
    if (!t.view || t.view.destroyed) return
    const p = clamp(t.press / t.spec.tip, 0, 1)
    t.view.rotation = HILL.angle + p * 0.34
    t.view.x = t.x + p * 6 + (p > 0.5 ? Math.sin(this._gt * 40) * 2 : 0)
  },

  // VÄLTA: statiska kroppen bort (vägen är fri för alltid), föremålet blir en
  // dynamisk spillra som tumlar iväg och sedan snöar igen.
  _toppleTarget(ctx, t, smash, incoming) {
    if (!this._alive || t.down) return
    t.down = true
    this._pressing = null
    if (t.body) {
      this._phys.removeBody(t.body)
      t.body = null
    }
    const i = this._targets.indexOf(t)
    if (i >= 0) this._targets.splice(i, 1)

    const view = t.view
    const vx = smash ? 7 + Math.random() * 4 : 2.4 + Math.random() * 1.6
    const vy = smash ? -8 - Math.random() * 3 : -2.6 - Math.random()
    if (view && !view.destroyed) {
      const body = this._phys.rectangle(view.x, view.y, t.spec.halfW * 2, t.spec.h, {
        ...MATERIALS.light,
        frictionAir: 0.02,
        angle: view.rotation,
        label: 'debris',
        collisionFilter: { category: CAT_DEBRIS, mask: MASK_DEBRIS },
      })
      Body.setVelocity(body, { x: vx, y: vy })
      Body.setAngularVelocity(body, (smash ? 0.3 : 0.16) + Math.random() * 0.1)
      this._phys.link(body, view)
      this._debrisLayer.addChild(view)
      this._debris.push({ body, view, age: 0, life: smash ? 1.9 : 1.4 })
      puff(ctx.fxLayer, view.x, view.y, { count: smash ? 14 : 8, color: t.color })
      floatText(ctx.fxLayer, view.x, view.y - 46, randomFrom(t.spec.words), { fontSize: smash ? 54 : 44 })
    }

    const b = this._ballBody
    if (smash) {
      // Plöjde rakt igenom: behåll farten, få extra snö, stort ljud.
      ctx.services.audio.sfx('pop')
      ctx.services.audio.sfx('celebrate')
      ctx.services.audio.tone({ freq: 220, dur: 0.18, type: 'square', vol: 0.14, slideTo: 90 })
      Body.setVelocity(b, { x: Math.max(b.velocity.x, incoming * 0.85), y: b.velocity.y })
      this._growBall(SMASH_GROW + (t.spec.snow || 0))
      if (this._ball && !this._ball.destroyed) {
        pop(this._ball, { scale: 1.24 })
        sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 10 })
      }
      this._say(ctx, 'Pang!', 3.5)
    } else {
      // Pressade sig igenom: hindret välter, men lite snö ramlade av bollen.
      ctx.services.audio.sfx('pop')
      ctx.services.audio.sfx('soft')
      Body.setVelocity(b, { x: b.velocity.x + 2.2, y: b.velocity.y })
      const loss = Math.min(GRIND_LOSS - (t.spec.snow || 0), Math.max(0, this._r - BASE_R))
      if (loss > 0) this._shrinkBall(ctx, loss)
      else this._growBall(t.spec.snow || 0)
      if (this._ball && !this._ball.destroyed) pop(this._ball)
      this._say(ctx, 'Bra jobbat!', 3.5)
    }
    this._idle = 0
    this._stillT = 0
  },

  // Spillror: tumlar med fysiken, snöar sedan igen (tick-drivet = alltid exit-säkert).
  _updateDebris(dt) {
    for (let i = this._debris.length - 1; i >= 0; i--) {
      const d = this._debris[i]
      d.age += dt
      const v = d.view
      if (!v || v.destroyed) {
        if (d.body) this._phys.removeBody(d.body)
        this._debris.splice(i, 1)
        continue
      }
      const off = v.x > 1400 || v.x < -120 || v.y > 820
      if (d.age > d.life || off) {
        v.alpha -= dt * 1.8
        if (v.alpha <= 0 || off) {
          if (d.body) this._phys.removeBody(d.body)
          v.destroy()
          this._debris.splice(i, 1)
        }
      }
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
    if (!(delta > 0) || !this._ballBody) return
    const prev = this._r
    this._r = Math.min(MAX_R, this._r + delta)
    if (this._r > prev) {
      const f = this._r / prev
      Body.scale(this._ballBody, f, f) // matter räknar om massan från density -> mer momentum
      this._updateMeter()
    }
  },

  // Tappa snö (motgång som märks men aldrig stoppar): aldrig under startstorleken.
  _shrinkBall(ctx, delta) {
    if (!(delta > 0) || !this._ballBody) return
    const prev = this._r
    this._r = Math.max(BASE_R, this._r - delta)
    if (this._r < prev) {
      const f = this._r / prev
      Body.scale(this._ballBody, f, f)
      this._updateMeter()
      if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y + this._r * 0.4, { count: 7, color: 0xffffff })
    }
  },

  _grow(ctx, field) {
    this._growBall(FIELD_GROW) // feta bonus-klumpar (mer än den kontinuerliga rull-växten)
    if (this._gt - this._lastGrowSound > 0.12) {
      this._lastGrowSound = this._gt
      ctx.services.audio.sfx('reveal')
      ctx.services.audio.tone({ freq: 420 + clamp((this._r - BASE_R) * 6, 0, 460), dur: 0.12, type: 'sine', vol: 0.14 })
    }
    if (this._ball && !this._ball.destroyed) {
      pop(this._ball)
      sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 7 })
    }
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
    this._say(ctx, 'Jag hjälper till!')
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 6, color: 0xffffff })
  },

  _idleCue(ctx) {
    if (!this._alive || this._resolving) return
    const v = ctx.services.voice
    if (v.replayLast) v.replayLast()
    else v.say(this.voiceIntro)
    this._lastVoice = this._gt
    if (this._ball && !this._ball.destroyed) pop(this._ball)
    // Pressar bollen mot ett hinder: ordlös "tryck här"-vink på bollen (barnet kan
    // banka sig igenom snabbare) — ikon först, ingen läsning.
    if (this._pressing && this._ball && !this._ball.destroyed) {
      floatText(ctx.fxLayer, this._ball.x, this._ball.y - this._r - 26, '👆', { fontSize: 58, rise: 60 })
      return
    }
    // Vink mot närmaste oätna snöfält.
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
    if (near) sparkle(ctx.fxLayer, near._cx, near._cy - 20, { count: 8 })
  },

  // ---- Kollisioner: väggstuds-ljud ---------------------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    const bb = this._ballBody
    for (const pair of e.pairs) {
      const inv = pair.bodyA === bb || pair.bodyB === bb
      if (!inv) continue
      const other = pair.bodyA === bb ? pair.bodyB : pair.bodyA
      if (other.label === 'wall') {
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

  // ---- Snögubbe-platsen nådd: bygg snögubben (med no-fail auto-hjälp) ------

  _reachZone(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true // blockera input + dubbel-trigg
    this._steering = false
    this._tapSteerT = 0
    this._pressing = null
    this._clearHint()
    const b = this._ballBody
    Body.setVelocity(b, { x: 0, y: 0 })
    Body.setStatic(b, true) // frys bollen medan snögubben byggs
    const bigEnough = this._bigEnough || 80
    // Bara en RIKTIGT liten boll får trollad extra snö. Annars byggs snögubben av
    // exakt den snö barnet samlat — storleken är barnets förtjänst, inte magi.
    if (this._r >= bigEnough * 0.62) this._buildSnowman(ctx)
    else this._autoGrowAndBuild(ctx, bigEnough * 0.7)
  },

  // För liten? Trolla fram extra snö tills den räcker, bygg sedan ändå.
  _autoGrowAndBuild(ctx, targetR) {
    ctx.services.voice.say('Lite mer snö!')
    this._lastVoice = this._gt
    ctx.services.audio.sfx('reveal')
    if (this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 10 })
    this._helpTimer = gsap.delayedCall(0.45, () => {
      if (this._alive && this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 8 })
    })
    const proxy = { r: this._r }
    this._growTween = gsap.to(proxy, {
      r: Math.min(MAX_R, targetR),
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
    const big = R >= (this._bigEnough || 80)

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    // Liten glad melodislinga (stämd durtreklang) ovanpå firandet.
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => ctx.services.audio.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.16, delay: i * 0.12 }))
    ctx.services.voice.say(big ? 'Titta — en snögubbe! Bravo!' : 'En snögubbe!')
    this._lastVoice = this._gt

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
    // Ritad morots-näsa (fristående föremål, ingen emoji).
    const nose = new Graphics()
    nose.moveTo(0, -R * 0.07).lineTo(R * 0.36, R * 0.02).lineTo(0, R * 0.09).closePath().fill(0xef7c2e)
    nose.moveTo(R * 0.12, -R * 0.035).lineTo(R * 0.14, R * 0.05).stroke({ width: Math.max(1, R * 0.02), color: 0xc75f1c })
    nose.position.set(bx + R * 0.05, headY + R * 0.04)
    nose.rotation = 0.12
    add(nose)
    // Ritad hatt (brätte + kulle + band).
    const hat = new Graphics()
    hat.ellipse(0, 0, R * 0.52, R * 0.12).fill(0x39404d)
    hat.roundRect(-R * 0.3, -R * 0.6, R * 0.6, R * 0.6, R * 0.08).fill(0x39404d)
    hat.roundRect(-R * 0.31, -R * 0.16, R * 0.62, R * 0.12, R * 0.04).fill(0xe4572e)
    hat.position.set(bx, headY - R * 0.44)
    add(hat)
    // Ritad halsduk — färgen varierar per snögubbe (variation mellan omgångar).
    const scarfCol = randomFrom([0xe4572e, 0x4aa3df, 0x7bc043, 0xf3b61f, 0xb56bd6])
    const scarf = new Graphics()
    scarf.roundRect(-R * 0.36, -R * 0.09, R * 0.72, R * 0.18, R * 0.08).fill(scarfCol)
    scarf.roundRect(R * 0.06, 0, R * 0.17, R * 0.42, R * 0.07).fill(scarfCol)
    scarf.position.set(bx, headY + R * 0.44)
    add(scarf)

    this._snowParts.forEach((p, i) => bounceIn(p, { delay: 0.06 * i }))

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, bx, by, { count: 16 })

    // MOTTAGAREN hejar: vakt-pingvinen hoppar och jublar.
    this._cheerGreeter(ctx)

    // Förlopp: höj nivå EN gång, räkna snögubbar, kör delat firande (stjärna + klistermärke).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()
    ctx.progress.setCustom('snogubbar', (ctx.progress.get().custom?.snogubbar || 0) + 1)

    this._nextTimer?.kill()
    this._nextTimer = gsap.delayedCall(1.9, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  _cheerGreeter(ctx) {
    const g = this._greeter
    if (!g || g.destroyed) return
    this._greetTween?.kill()
    gsap.killTweensOf(g)
    gsap.killTweensOf(g.scale)
    const baseY = this._surfaceY(1238) - 40
    this._cheerTl?.kill()
    this._cheerTl = gsap
      .timeline({
        onComplete: () => {
          if (this._alive && g && !g.destroyed) this._greetTween = breathe(g, { scale: 1.05, duration: 1.6 })
        },
      })
      .to(g, { y: baseY - 46, duration: 0.22, ease: 'power2.out' })
      .to(g, { y: baseY, duration: 0.26, ease: 'bounce.out' })
      .to(g, { y: baseY - 34, duration: 0.2, ease: 'power2.out' })
      .to(g, { y: baseY, duration: 0.24, ease: 'bounce.out' })
    this._cheerTimer?.kill()
    this._cheerTimer = gsap.delayedCall(0.5, () => {
      if (!this._alive) return
      ctx.services.audio.tone({ freq: 880, dur: 0.1, type: 'sine', vol: 0.18 })
      ctx.services.audio.tone({ freq: 1174, dur: 0.14, type: 'sine', vol: 0.16, delay: 0.1 })
      // Hålls innanför skärmkanten (annars klipps texten av till höger).
      if (this._greeter && !this._greeter.destroyed) floatText(ctx.fxLayer, Math.min(this._greeter.x, 1170), this._greeter.y - 80, 'Hurra!', { fontSize: 44 })
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
    this._greetTween?.kill()
    this._cheerTl?.kill()
    this._cheerTimer?.kill()
    for (const tw of this._decorTweens || []) tw?.kill()

    if (this._greeter) {
      gsap.killTweensOf(this._greeter)
      gsap.killTweensOf(this._greeter.scale)
    }
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
    for (const t of this._targets) {
      gsap.killTweensOf(t.view)
      gsap.killTweensOf(t.view?.scale)
    }
    for (const d of this._debris) {
      gsap.killTweensOf(d.view)
      gsap.killTweensOf(d.view?.scale)
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
