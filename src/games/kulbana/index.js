// Kulbanan — barnet bygger sin egen kulbana (3–5 år). En glansig gul kula vilar
// frusen vid utsläppet uppe till vänster. Barnet DRAR ut lutande ramper, en tratt
// och en studsplatta från "Delar"-hyllan, VRIDER dem (stor ↻-knapp, 15°-steg) och
// trycker SLÄPP — kulan blir en riktig matter.js-kropp, rullar nedför ramperna,
// studsar mjukt och plumsar (förhoppningsvis) ner i hinken 🪣. Ren ingenjörsglädje.
//
// INGET misslyckande: missar kulan blir det en mjuk "Hoppsan!"-puff och kulan
// återvänder själv till utsläppet — oändligt många försök. Efter 3 missar lutar
// spelet närmaste ramp mot hinken (vänlig auto-hjälp); räcker inte det glider kulan
// hela vägen hem av sig själv och rundan firas ändå. Ingen poäng, ingen straff-timer.
//
// Fysik: STATISKA ramp-/studs-/tratt-kroppar som barnet flyttar (vi syncar
// Body.setPosition/Body.setAngle vid varje drag OCH varje vrid) + en DYNAMISK kula.
// Allt ritas programmatiskt (Pixi Graphics + system-emoji) — inga externa filer.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, nudge } from '../../lib/physics.js'
import { Fjaderbrada } from '../../lib/fjader.js'
import { createScene } from '../../lib/scene.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { pop, wiggle, breathe, bounceIn, puff, sparkle, burst, bigCelebration, floatText, shake , kvittera} from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Geometri (designkoordinater 1280×720) ---
const CHUTE = { x: 300, y: 168 } // utsläppet uppe till vänster (kulans startläge)
const BALL_R = 26
const FIELD = { minX: 80, maxX: 1200, minY: 120, maxY: 690 } // klamp för delarna
const SHELF_Y = 660 // delarna parkeras här på hyllan

// Vrid-knappens steg: 15° inom [−60°, +60°] (index 4 = 0°).
const ANGLE_STEPS = [-60, -45, -30, -15, 0, 15, 30, 45, 60].map((d) => (d * Math.PI) / 180)

const REST_SPEED = 0.4 // matter-fart under detta = kulan står still
const REST_HOLD = 1.2 // s under REST_SPEED innan vi räknar kulan som missad
const FLOOR_MISS_Y = 690 // nådde golvet utan mål = miss
const IDLE_DELAY = 6 // s utan handling → röst-recue
const BOUNCE_THROTTLE = 0.16 // s mellan studsljud (anti-spam)
// Fartsvansen (se `_updateTail`). Trösklarna i px/steg, samma enhet som matters fart.
const TAIL_N = 14 // punkter i strimman
const TAIL_MIN_SPEED = 3 // härunder syns ingen svans alls
const TAIL_FULL_SPEED = 11 // här är den som starkast
const HELP_AFTER = 3 // missar innan den FRIVILLIGA "Hjälp mig?"-knappen dyker upp
const AUTO_HELP_AT = 8 // sista skyddsnätet: efter så många missar glider kulan hem ändå (no-fail)
const NEAR_TARGET = 210 // px till hinken då glödringen intensifieras ("nästan!")
// Fjäderbrädan: kulans fart i rörelse är uppmätt 3–14,6 px/steg (median 7,4 · p90 13,5),
// så 10 px/steg som "full inpressning" lägger hela spannet under taket och låter de
// hårdaste anslagen bottna. Djupet är satt efter plankans tjocklek (32 px): 22 px läser
// som en studsmatta, mer som ett hål. FOOT_Y = fotens ovansida i delens koordinater.
const BOUNCE_FULL = 10
const BOUNCE_DEPTH = 22
const FOOT_Y = 36

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'kulbana',
  titleSv: 'Kulbanan',
  icon: '🟡',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'kulbana',
  voiceIntro: 'Lägg ramperna så kulan rullar ner i hinken! Tryck sedan på släpp.',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._tnow = 0
    this._idle = 0
    this._restT = 0
    this._attempts = 0
    this._lastBounceAt = -1
    this._falling = false
    this._resolving = false
    this._gliding = false
    this._parts = []
    this._obstacles = []
    this._bells = []
    this._helpStage = 0 // 0 = ingen hjälp än, 1 = ramp redan lutad → nästa tryck glider hem
    this._lastWoodAt = -1
    this._selected = null
    this._drag = null
    this._lastMoved = false
    this._bucketPos = { x: 820, y: 558 }
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST (dekorativ himmel).
    this._root.addChild(createScene('sky', { ground: false, width: ctx.width, height: ctx.height }))

    // Fysik: lagom mjukt fall. Ceiling läggs till så en studs aldrig kan kasta
    // kulan ut ur banan (no-escape) — osynligt, ändrar inget annat.
    this._phys = new PhysicsWorld({ gravityY: 1.1, walls: ['left', 'right', 'floor', 'ceiling'], wallThickness: 120 })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))
    // Fjäderbrädorna drivs i MATTERS takt, inte bildrutans: farten som kastar iväg
    // kulan mäts i px/steg, och en bildruta kan rymma 1–5 steg.
    this._unbindStep = this._phys.beforeStep(() => this._stepSprings())

    // Osynlig fält-yta: fångar tap i tomrummet → flytta vald del (tap-tap) eller liten puff.
    this._fieldCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._fieldCatcher.eventMode = 'static'
    this._onFieldTap = (e) => this._fieldTap(ctx, e)
    this._fieldCatcher.on('pointertap', this._onFieldTap)
    this._root.addChild(this._fieldCatcher)

    // Statisk dekor (hylla + utsläpps-spout).
    this._decor = new Container()
    this._decor.eventMode = 'none'
    this._root.addChild(this._decor)
    this._buildStaticDecor()

    // Lager för hink, hinder, kula och delar (i ritordning).
    this._bucketLayer = new Container()
    this._bucketLayer.eventMode = 'none'
    this._root.addChild(this._bucketLayer)
    this._obstacleLayer = new Container()
    this._obstacleLayer.eventMode = 'none'
    this._root.addChild(this._obstacleLayer)

    this._buildBall()
    this._root.addChild(this._ballShadow)
    this._root.addChild(this._ball)

    this._partsLayer = new Container()
    this._root.addChild(this._partsLayer)

    this._buildReleaseButton(ctx)
    this._root.addChild(this._releaseBtn)

    this._buildHelpButton(ctx)
    this._root.addChild(this._helpBtn)

    // Kul-kropp (dynamisk men startar frusen vid utsläppet).
    this._ballBody = this._phys.circle(CHUTE.x, CHUTE.y, BALL_R, {
      restitution: 0.42,
      friction: 0.03,
      frictionAir: 0.006,
      density: 0.0013,
      label: 'ball',
      isStatic: true,
    })
    this._phys.link(this._ballBody, this._ball) // synkar position + rull-rotation

    this._loadLevel(ctx, this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk dekor ------------------------------------------------------

  _buildStaticDecor() {
    // Delar-hyllan (translucent panel nederst).
    const shelf = new Graphics()
      .roundRect(48, 612, 1184, 96, 26)
      .fill({ color: COLORS.cream, alpha: 0.85 })
      .stroke({ width: 5, color: COLORS.yellow, alpha: 0.7 })
    shelf.eventMode = 'none'
    // RITAD verktygslåda (var 🧰).
    const tag = new Graphics()
    tag.roundRect(-22, -6, 44, 26, 5).fill(0xe0574f).stroke({ width: 3, color: 0xb03f3a })
    tag.roundRect(-22, -6, 44, 8, 3).fill(0xf07a72)
    tag.roundRect(-7, -18, 14, 12, 3).stroke({ width: 4, color: 0x8d99a6 })
    tag.roundRect(-5, 2, 10, 6, 2).fill(0xffd35c)
    tag.position.set(86, 646)
    tag.eventMode = 'none'
    const tagTxt = new Text({ text: 'Delar', style: { fontFamily: FONT.title, fontSize: 26, fontWeight: '800', fill: COLORS.inkSoft } })
    tagTxt.position.set(112, 634)
    tagTxt.eventMode = 'none'

    // Utsläpps-spout uppe till vänster (lutande pip med mörk mynning).
    const spout = new Container()
    const sg = new Graphics().roundRect(-60, -16, 120, 32, 16).fill(COLORS.brown).stroke({ width: 5, color: 0x6e4429 })
    sg.roundRect(-60, 4, 120, 12, 8).fill({ color: 0x3a2417, alpha: 0.6 })
    spout.addChild(sg)
    spout.position.set(300, 150)
    spout.rotation = (12 * Math.PI) / 180
    spout.eventMode = 'none'

    // Bakgrundskullar + gräsremsa vid horisonten — himlen var ren tapet, och
    // hinken svävade i tomma intet. Ligger BAKOM hyllan och stör inte bygget.
    const hills = new Graphics()
    hills.ellipse(240, 660, 300, 120).fill({ color: 0x9fd88a, alpha: 0.55 })
    hills.ellipse(720, 672, 380, 130).fill({ color: 0x8fd07a, alpha: 0.5 })
    hills.ellipse(1120, 656, 260, 110).fill({ color: 0x9fd88a, alpha: 0.55 })
    hills.rect(0, 596, 1280, 130).fill({ color: 0x7ec46a, alpha: 0.45 })
    hills.eventMode = 'none'
    this._decor.addChildAt(hills, 0)
    this._decor.addChild(shelf, tag, tagTxt, spout)
  },

  // ---- Kula ---------------------------------------------------------------

  _buildBall() {
    // Fartsvansen: EN återanvänd Graphics som ritas om per bildruta ur kulans senaste
    // lägen. Ligger under kulan och skuggan. Ingen allokering, inga tweens, rivs med
    // `_root` — och den ritas bara när kulan verkligen far (se `_drawTail`).
    this._tail = []
    this._tailG = new Graphics()
    this._tailG.eventMode = 'none'
    this._root.addChild(this._tailG)

    // Mjuk markskugga (separat → roterar INTE med kulan).
    this._ballShadow = new Graphics()
      .ellipse(0, BALL_R * 0.95, BALL_R * 0.85, BALL_R * 0.32)
      .fill({ color: 0x000000, alpha: 0.15 })
    this._ballShadow.eventMode = 'none'
    this._ballShadow.position.set(CHUTE.x, CHUTE.y)

    // Glansig gul kula (Graphics → skarp kant). Highlight roterar med = rull-känsla.
    this._ball = new Container()
    const disc = new Graphics().circle(0, 0, BALL_R).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.orangeDark })
    const hi = new Graphics().circle(-8, -9, 7).fill({ color: 0xffffff, alpha: 0.7 })
    disc.eventMode = 'none'
    hi.eventMode = 'none'
    this._ball.addChild(disc, hi)
    this._ball.eventMode = 'none'
    this._ball.position.set(CHUTE.x, CHUTE.y)
  },

  // ---- SLÄPP-knapp --------------------------------------------------------

  _buildReleaseButton(ctx) {
    const btn = new Container()
    const lip = new Graphics().roundRect(-86, -44, 172, 104, 28).fill(COLORS.greenDark)
    const face = new Graphics().roundRect(-86, -52, 172, 98, 28).fill(COLORS.green)
    face.roundRect(-76, -44, 152, 30, 18).fill({ color: 0xffffff, alpha: 0.18 })
    const label = new Text({ text: 'SLÄPP', style: { fontFamily: FONT.display, fontSize: 34, fontWeight: '800', fill: COLORS.white } })
    label.anchor.set(0.5)
    label.position.set(0, -10)
    // Ritad pil (var ⬇-glyf) — bär hela innebörden för den som inte läser.
    const arrow = new Graphics()
    arrow.roundRect(-6, -14, 12, 18, 5).fill(COLORS.white)
    arrow.moveTo(-16, 2).lineTo(0, 20).lineTo(16, 2).closePath().fill(COLORS.white)
    arrow.position.set(0, 18)
    btn.addChild(lip, face, label, arrow)
    btn.position.set(160, 150)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.interactiveChildren = false
    btn.hitArea = new Rectangle(-86 - 24, -52 - 24, 172 + 48, 104 + 48) // ≥96px träffyta
    this._onRelease = () => this._release(ctx)
    btn.on('pointertap', this._onRelease)
    this._releaseBtn = btn
  },

  _startButtonPulse() {
    if (!this._releaseBtn || this._releaseBtn.destroyed) return
    this._stopButtonPulse()
    this._btnPulse = breathe(this._releaseBtn, { scale: 1.07, duration: 0.9 })
  },

  _stopButtonPulse() {
    this._btnPulse?.kill()
    this._btnPulse = null
    if (this._releaseBtn && !this._releaseBtn.destroyed) this._releaseBtn.scale.set(1)
  },

  // ---- FRIVILLIG "Hjälp mig?"-knapp (synlig auto-hjälp — tar aldrig bygget själv) ----

  _buildHelpButton(ctx) {
    const btn = new Container()
    const lip = new Graphics().roundRect(-84, -38, 168, 92, 26).fill(0xd98a2b)
    const face = new Graphics().roundRect(-84, -46, 168, 88, 26).fill(COLORS.orange)
    face.roundRect(-74, -38, 148, 26, 16).fill({ color: 0xffffff, alpha: 0.18 })
    // Ritad öppen hand (var 🤚).
    const hand = new Graphics()
    hand.roundRect(-13, -4, 26, 26, 10).fill(0xffd7b0).stroke({ width: 2.5, color: 0xe0b48c })
    for (const [hx, hh] of [[-10, 20], [-3, 25], [4, 24], [11, 19]]) {
      hand.roundRect(hx - 3.5, -hh + 2, 7, hh, 3.5).fill(0xffd7b0).stroke({ width: 2, color: 0xe0b48c })
    }
    hand.roundRect(-20, 4, 9, 15, 4).fill(0xffd7b0).stroke({ width: 2, color: 0xe0b48c })
    hand.position.set(-52, 0)
    const label = new Text({ text: 'Hjälp mig?', style: { fontFamily: FONT.display, fontSize: 26, fontWeight: '800', fill: COLORS.white } })
    label.anchor.set(0.5)
    label.position.set(14, 0)
    btn.addChild(lip, face, hand, label)
    btn.position.set(160, 300)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.interactiveChildren = false
    btn.hitArea = new Rectangle(-84 - 24, -46 - 24, 168 + 48, 92 + 48) // ≥96px träffyta
    btn.visible = false
    this._onHelp = () => this._useHelp(ctx)
    btn.on('pointertap', this._onHelp)
    this._helpBtn = btn
  },

  // Visa hjälp-knappen (bara första gången per bana) med studs + lugn puls.
  _showHelpButton() {
    const btn = this._helpBtn
    if (!btn || btn.destroyed || btn.visible) return
    btn.visible = true
    bounceIn(btn)
    this._helpPulse?.kill()
    this._helpPulse = breathe(btn, { scale: 1.08, duration: 0.85 })
  },

  _hideHelpButton() {
    this._helpPulse?.kill()
    this._helpPulse = null
    if (this._helpBtn && !this._helpBtn.destroyed) {
      gsap.killTweensOf(this._helpBtn.scale)
      this._helpBtn.scale.set(1)
      this._helpBtn.visible = false
    }
  },

  // Frivillig hjälp: FÖRSTA trycket lutar närmaste ramp (synligt "putt"), ANDRA
  // trycket glider kulan hem. Barnet väljer själv — bygget löser sig aldrig i tysthet.
  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e, mal) {
    const p = mal && !mal.destroyed ? ctx.fxLayer.toLocal(mal.getGlobalPosition())
      : e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _useHelp(ctx) {
    if (!this._alive) return
    if (this._falling || this._resolving || this._gliding) return this._kvitto(ctx)
    this._idle = 0
    if (this._helpStage === 0) {
      this._helpStage = 1
      this._assistTiltRamp(ctx)
    } else {
      this._hideHelpButton()
      this._glideHome(ctx)
    }
  },

  // ---- Banor (nivåberoende) -----------------------------------------------

  _layoutFor(level) {
    let bucket
    let obstacles = []
    let parts
    let bells = [] // roliga, poäng-fria "slå-till"-klockor (sensorer) som kulan kan ringa i förbi
    if (level <= 1) {
      bucket = { x: 820, y: 558 }
      parts = ['ramp', 'ramp'] // en enda lutande ramp räcker
    } else if (level <= 3) {
      bucket = { x: 980, y: 580 }
      parts = ['ramp', 'ramp', 'bounce']
      obstacles = [{ x: 600, y: 470, w: 46, h: 160 }]
      bells = [{ x: 720, y: 350 }]
    } else if (level <= 5) {
      bucket = { x: 1080, y: 590 }
      parts = ['ramp', 'ramp', 'ramp', 'bounce', 'funnel']
      obstacles = [
        { x: 520, y: 440, w: 46, h: 170 },
        { x: 800, y: 510, w: 46, h: 150 },
      ]
      bells = [
        { x: 680, y: 320 },
        { x: 940, y: 430 },
      ]
    } else {
      const jx = Math.random() * 60 - 30
      const jy = Math.random() * 40 - 20
      bucket = { x: clamp(1080 + jx, 980, 1140), y: clamp(580 + jy, 540, 612) }
      parts = ['ramp', 'ramp', 'ramp', 'bounce', 'funnel']
      obstacles = [
        { x: clamp(520 + jx, 440, 620), y: 440, w: 46, h: 170 },
        { x: clamp(820 + jx, 720, 900), y: 510, w: 46, h: 150 },
      ]
      bells = [
        { x: clamp(680 + jx, 600, 760), y: 320 },
        { x: clamp(940 + jx, 860, 1000), y: 430 },
      ]
    }
    return { bucket, obstacles, parts, bells }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._clearParts()
    this._clearObstacles()
    this._clearBells()
    this._clearBucket()

    this._falling = false
    this._resolving = false
    this._gliding = false
    this._attempts = 0
    this._helpStage = 0
    this._idle = 0
    this._restT = 0
    this._lastMoved = false
    this._hideHelpButton()

    const lay = this._layoutFor(level)
    this._bucketPos = lay.bucket
    this._buildBucket(lay.bucket.x, lay.bucket.y)
    for (const o of lay.obstacles) this._buildObstacle(o)
    for (const bl of lay.bells) this._buildBell(bl.x, bl.y)

    // Delarna parkeras jämnt på hyllan; barnet drar upp dem i fältet.
    const n = lay.parts.length
    lay.parts.forEach((kind, i) => {
      const x = 160 + (i + 0.5) * (950 / n)
      this._makePart(ctx, kind, x, SHELF_Y)
    })

    // Frys kulan på utsläppet.
    this._freezeBall()
    this._setPartsEnabled(true)
    this._startButtonPulse()
  },

  _freezeBall() {
    const b = this._ballBody
    Body.setStatic(b, true)
    nudge(b, 0, 0)
    Body.setPosition(b, { x: CHUTE.x, y: CHUTE.y })
    Body.setAngle(b, 0)
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball.scale)
      this._ball.scale.set(1)
      this._ball.rotation = 0
      this._ball.alpha = 1
      this._ball.position.set(CHUTE.x, CHUTE.y)
    }
  },

  // ---- Hink ---------------------------------------------------------------

  _buildBucket(bx, by) {
    const c = new Container()
    c.eventMode = 'none'
    // Mål-glödring (andas → drar blicken). Cirkel ritad i origo, flyttad via position
    // så breathe skalar runt sin egen mitt.
    const glow = new Graphics().circle(0, 0, 86).stroke({ width: 5, color: COLORS.yellow, alpha: 0.5 })
    glow.position.set(0, -30)
    // RITAD hink (P0 ASSETS) — var en 🪣-emoji inuti en blå rundad ruta, precis
    // det regeln förbjuder. Nu en egen silhuett: konisk kropp, band, mörkt djup
    // och en riktig bygel.
    const handle = new Graphics()
    handle.arc(0, -38, 62, Math.PI, 0).stroke({ width: 7, color: 0x8d99a6 })
    // Kroppen slutar vid +40, inte +66 — hinkens botten hamnade annars BAKOM
    // Delar-hyllan (y=612) och såg avklippt ut.
    const body = new Graphics()
    body.moveTo(-72, -38).lineTo(72, -38).lineTo(60, 40).lineTo(-60, 40).closePath()
    body.fill(COLORS.blue).stroke({ width: 6, color: 0x2f7fb8 })
    body.ellipse(0, -38, 72, 15).fill(0x2f7fb8) // mörk öppning
    body.ellipse(0, -38, 63, 11).fill(0x1f5d8a) // djup
    body.moveTo(-67, -12).lineTo(67, -12).stroke({ width: 5, color: 0x2f7fb8, alpha: 0.8 })
    body.moveTo(-63, 16).lineTo(63, 16).stroke({ width: 5, color: 0x2f7fb8, alpha: 0.8 })
    body.moveTo(-50, -28).lineTo(-44, 32).stroke({ width: 6, color: 0xffffff, alpha: 0.22 })
    // Vatten i botten som skvätter när kulan plumsar i.
    const water = new Graphics()
    water.moveTo(-57, 18).lineTo(57, 18).lineTo(59, 37).lineTo(-59, 37).closePath()
    water.fill({ color: 0x6ad0ff, alpha: 0.75 })
    c.addChild(glow, handle, body, water)
    c.position.set(bx, by)
    this._bucketWater = water
    this._buildCatcher(bx, by)
    this._bucketLayer.addChild(c)
    this._bucketView = c
    this._bucketGlow = glow
    this._bucketGlowTween = breathe(glow, { scale: 1.1, duration: 1.2 })

    // Fångväggar + mjuk botten (riktiga statiska kroppar) så kulan stannar i hinken.
    this._bucketWalls = [
      this._phys.rectangle(bx - 72, by, 14, 100, { isStatic: true, restitution: 0.1, friction: 0.4, label: 'bucketwall' }),
      this._phys.rectangle(bx + 72, by, 14, 100, { isStatic: true, restitution: 0.1, friction: 0.4, label: 'bucketwall' }),
      this._phys.rectangle(bx, by + 54, 150, 16, { isStatic: true, restitution: 0.1, friction: 0.6, label: 'bucketwall' }),
    ]
  },

  // Mottagaren: Bobo står bredvid hinken med utsträckta armar, hejar när kulan
  // ringer en klocka och firar när den plumsar i. Scenen hade ingen publik alls.
  // makeMascot() ger bara ett HUVUD — han får en kropp här, som i Fysik-rundan.
  _buildCatcher(bx, by) {
    const c = new Container()
    c.eventMode = 'none'
    const legs = new Graphics()
    legs.roundRect(-15, 10, 12, 26, 6).fill(0x4a90d9)
    legs.roundRect(3, 10, 12, 26, 6).fill(0x4a90d9)
    legs.roundRect(-19, 32, 18, 9, 4).fill(0x3a5a78)
    legs.roundRect(1, 32, 18, 9, 4).fill(0x3a5a78)
    const torso = new Graphics()
    torso.roundRect(-22, -18, 44, 34, 12).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    const armL = new Graphics()
    armL.roundRect(-6, -4, 12, 30, 6).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    armL.circle(0, 27, 7).fill(COLORS.cream)
    armL.position.set(-22, -14)
    armL.rotation = 0.5
    const armR = new Graphics()
    armR.roundRect(-6, -4, 12, 30, 6).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    armR.circle(0, 27, 7).fill(COLORS.cream)
    armR.position.set(22, -14)
    armR.rotation = -0.5
    // Huvudet är en RIGG (lib/karaktarer.js) med `kropp: false`: blå byxor och de
    // utsträckta armarna ÄR mottagarens roll och animeras av spelet nedan.
    this._rig = makeKaraktar({ r: 26, kropp: false })
    const head = this._rig.view
    head.position.set(0, -44)
    // Armarna ritas EFTER bålen — annars täcker bålen dem och Bobo ser armlös ut.
    c.addChild(legs, torso, armL, armR, head)
    // Står på hinkens vänstra sida, fötterna ovanför Delar-hyllan (y=612).
    c.position.set(bx - 138, by - 8)
    this._bucketLayer.addChild(c)
    this._catcher = c
    this._catcherArms = [armL, armR]
    this._catcherIdle = breathe(c, { scale: 1.04, duration: 1.8 })
  },

  _catcherCheer(big) {
    const c = this._catcher
    if (!c || c.destroyed) return
    // Spelets eget hopp är 26 px — större än riggens `jubel` (0,5·r = 13) — så SPELET
    // äger y och riggen bidrar med minen: stolt vid mål, 'heja' vid en klocka på vägen.
    if (big) this._rig?.setMood('stolt')
    else this._rig?.react('heja')
    const y0 = c.y
    gsap.killTweensOf(c.position)
    gsap.to(c.position, { y: y0 - (big ? 26 : 12), duration: 0.16, yoyo: true, repeat: big ? 3 : 1, ease: 'power2.out' })
    for (const [i, arm] of (this._catcherArms || []).entries()) {
      if (!arm || arm.destroyed) continue
      const sign = i === 0 ? 1 : -1
      gsap.killTweensOf(arm)
      gsap.to(arm, { rotation: sign * (big ? 2.6 : 1.1), duration: 0.18, yoyo: true, repeat: 1, ease: 'back.out(2)' })
    }
  },

  _clearCatcher() {
    // Mottagaren byggs om per bana. En rigg som bara plockas ur trädet tar sina
    // GSAP-tweens med sig och lever vidare — den måste destroy():as här.
    this._rig?.destroy()
    this._rig = null
    this._catcherIdle?.kill()
    this._catcherIdle = null
    for (const arm of this._catcherArms || []) if (arm && !arm.destroyed) gsap.killTweensOf(arm)
    this._catcherArms = null
    if (this._catcher && !this._catcher.destroyed) {
      gsap.killTweensOf(this._catcher)
      gsap.killTweensOf(this._catcher.position)
      gsap.killTweensOf(this._catcher.scale)
      this._catcher.destroy({ children: true })
    }
    this._catcher = null
  },

  _clearBucket() {
    this._clearCatcher()
    if (this._bucketWalls) {
      for (const w of this._bucketWalls) this._phys.removeBody(w)
      this._bucketWalls = null
    }
    this._bucketGlowTween?.kill()
    this._bucketGlowTween = null
    if (this._bucketGlow && !this._bucketGlow.destroyed) gsap.killTweensOf(this._bucketGlow.scale)
    if (this._bucketView && !this._bucketView.destroyed) {
      gsap.killTweensOf(this._bucketView)
      this._bucketView.destroy({ children: true })
    }
    this._bucketView = null
    this._bucketGlow = null
  },

  // ---- Hinder -------------------------------------------------------------

  _buildObstacle(o) {
    const g = new Graphics().roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 12).fill(COLORS.brown).stroke({ width: 4, color: 0x6e4429 })
    g.eventMode = 'none'
    g.position.set(o.x, o.y)
    this._obstacleLayer.addChild(g)
    const body = this._phys.rectangle(o.x, o.y, o.w, o.h, { isStatic: true, restitution: 0.2, friction: 0.4, label: 'obstacle' })
    this._obstacles.push({ view: g, body })
  },

  _clearObstacles() {
    for (const o of this._obstacles) {
      if (o.body) this._phys.removeBody(o.body)
      if (o.view && !o.view.destroyed) o.view.destroy({ children: true })
    }
    this._obstacles = []
  },

  // ---- Klockor (roliga sensor-mål: kulan ringer i dem när den rullar förbi) ----

  _buildBell(bx, by) {
    // Vy: en liten upphängning + 🔔. Cirkeln ritas i origo, containern flyttas (Pixi v8:
    // aldrig stor .position på bar Graphics ritad i origo → wrap i container).
    const c = new Container()
    c.eventMode = 'none'
    const string = new Graphics().roundRect(-3, -46, 6, 22, 3).fill({ color: COLORS.inkSoft, alpha: 0.7 })
    const halo = new Graphics().circle(0, 0, 30).fill({ color: COLORS.yellow, alpha: 0.16 })
    // RITAD klocka (var 🔔): kupa, kant, kläpp och en glansstrimma.
    const emoji = new Graphics()
    emoji.moveTo(-20, 14).quadraticCurveTo(-20, -20, 0, -24).quadraticCurveTo(20, -20, 20, 14).closePath()
    emoji.fill(0xffc93c).stroke({ width: 3, color: 0xd79a1e })
    emoji.roundRect(-24, 12, 48, 9, 4).fill(0xffd86b).stroke({ width: 3, color: 0xd79a1e })
    emoji.circle(0, 25, 6).fill(0xd79a1e)
    emoji.roundRect(-3, -30, 6, 8, 3).fill(0xd79a1e)
    emoji.moveTo(-11, 8).quadraticCurveTo(-12, -12, -2, -17).stroke({ width: 3, color: 0xffffff, alpha: 0.55 })
    c.addChild(halo, string, emoji)
    c.position.set(bx, by)
    this._obstacleLayer.addChild(c)
    // Sensor-kropp: kulan passerar igenom (blockerar inte banan) men triggar collisionStart.
    const body = this._phys.circle(bx, by, 26, { isStatic: true, isSensor: true, label: 'bell' })
    this._bells.push({ view: c, emoji, body, lastRungAt: -1 })
  },

  _ringBell(ctx, rec) {
    if (!rec || !rec.view || rec.view.destroyed) return
    if (this._tnow - rec.lastRungAt < 0.4) return // en klocka ringer inte i ett kör
    rec.lastRungAt = this._tnow
    ctx.services.audio.sfx('pling')
    ctx.services.audio.tone({ freq: 1180, dur: 0.16, type: 'sine', vol: 0.14, delay: 0.03 })
    if (rec.emoji && !rec.emoji.destroyed) wiggle(rec.emoji)
    this._catcherCheer(false) // Bobo hejar när kulan ringer på vägen
    sparkle(ctx.fxLayer, rec.view.x, rec.view.y, { count: 6 })
  },

  _clearBells() {
    for (const bl of this._bells) {
      if (bl.body) this._phys.removeBody(bl.body)
      if (bl.emoji && !bl.emoji.destroyed) gsap.killTweensOf(bl.emoji)
      if (bl.view && !bl.view.destroyed) bl.view.destroy({ children: true })
    }
    this._bells = []
  },

  // ---- Delar (ramp / studsplatta / tratt) ---------------------------------

  _makePart(ctx, kind, x, y) {
    const part = new Container()
    part.position.set(x, y)
    part._kind = kind
    part._angleStep = 4 // 0°
    let hitW
    let hitH

    if (kind === 'ramp') {
      const g = new Graphics().roundRect(-100, -15, 200, 30, 14).fill(COLORS.brown).stroke({ width: 5, color: 0x6e4429 })
      g.roundRect(-92, -12, 184, 7, 4).fill({ color: 0xffffff, alpha: 0.25 })
      g.eventMode = 'none'
      part.addChild(g)
      part._body = this._phys.rectangle(x, y, 200, 30, { isStatic: true, friction: 0.06, restitution: 0.2, label: 'ramp' })
      hitW = 240
      hitH = 100
      this._addKnob(ctx, part, 124)
    } else if (kind === 'bounce') {
      // FJÄDERBRÄDA (`lib/fjader.js`) — plankan är en fjäder med eget tillstånd:
      // den SVÄLJER kulans anslag, dyker undan och kastar tillbaka den på vägen upp.
      //
      // Förut: en statisk kropp med `restitution: 0.95` + en GSAP-squash på
      // `part.scale`. Båda halvorna var lögner. Squashen kunde inte röra en enda
      // kropp, och restitution på en STATISK kropp är en nullhandling i hela repot —
      // matters `Body.setStatic` nollar den (uppmätt: satt 0,95 → 0, och studsen blev
      // kulans egna 0,42, exakt samma som en ramp). Studsplattan har alltså aldrig
      // studsat särskilt. Uppmätt skillnad nu, från 140 px fall: 17 px tillbaka med
      // den styva plattan mot 183 px med fjädern.
      const f = new Fjaderbrada({ bredd: 140, hojd: 32, maxAnslag: BOUNCE_FULL, maxKomp: BOUNCE_DEPTH })
      part._fjader = f

      // Foten står still — det är den som gör att ögat läser plankans dyk som en
      // fjäder och inte som att hela delen glider nedåt.
      const fot = new Graphics()
      fot.roundRect(-56, FOOT_Y, 112, 14, 7).fill(0x2f7f7c)
      fot.roundRect(-56, FOOT_Y, 112, 6, 3).fill({ color: 0x63c0bc, alpha: 0.6 })
      fot.eventMode = 'none'

      const spiral = new Graphics() // två zigzag-fjädrar, ritas om med böjen
      spiral.eventMode = 'none'
      // Lager UR SAMMA KROPP (skugga · planka · glans) — annars glider de isär i böjen.
      const skugga = new Graphics()
      skugga.y = 7
      const kropp = new Graphics()
      const glans = new Graphics()
      for (const g of [skugga, kropp, glans]) g.eventMode = 'none'
      part.addChild(fot, spiral, skugga, kropp, glans)

      part._rita = () => {
        if (part.destroyed) return
        f.path(skugga.clear()).fill({ color: 0x000000, alpha: 0.16 })
        f.path(kropp.clear()).fill(COLORS.teal).stroke({ width: 5, color: 0x3f9a96 })
        f.path(glans.clear(), 0.66).fill({ color: 0xffffff, alpha: 0.18 })
        // Två fjädrar som SYNS bli hoptryckta. Zigzagen läses bara som en fjäder om
        // varven är höga nog: fyra varv på 20 px blev 5 px per varv och såg ut som ett
        // rosa kludd. Tre varv, smalare utslag, och de sitter fast i UNDERSIDAN
        // (`f.undersida`) i stället för i `komp` — annars släpper de från den böjda
        // plankan just i de bildrutor barnet tittar.
        spiral.clear()
        for (const sx of [-32, 32]) {
          const topY = f.undersida(sx) - 1
          const h = Math.max(4, FOOT_Y + 2 - topY)
          const varv = 3
          spiral.moveTo(sx, topY)
          for (let i = 0; i < varv; i++) {
            const mitt = topY + (h * (i + 0.5)) / varv
            const slut = topY + (h * (i + 1)) / varv
            spiral.lineTo(sx + (i % 2 ? -9 : 9), mitt).lineTo(sx, slut)
          }
          spiral.stroke({ width: 3.5, color: COLORS.pink, alpha: 0.85 })
        }
      }
      part._rita()

      part._body = this._phys.rectangle(x, y, 140, 32, { isStatic: true, friction: 0.04, label: 'bounce' })
      hitW = 180
      hitH = 120
      this._addKnob(ctx, part, 96)
    } else {
      // Tratt: två korta plankor i V (centrerar kulan). Ingen vrid-knapp.
      const planks = [
        { ox: -50, oy: 0, ang: (35 * Math.PI) / 180 },
        { ox: 50, oy: 0, ang: (-35 * Math.PI) / 180 },
      ]
      part._subBodies = []
      for (const pl of planks) {
        const pg = new Graphics().roundRect(-60, -13, 120, 26, 12).fill(COLORS.brown).stroke({ width: 5, color: 0x6e4429 })
        pg.position.set(pl.ox, pl.oy)
        pg.rotation = pl.ang
        pg.eventMode = 'none'
        part.addChild(pg)
        const body = this._phys.rectangle(x + pl.ox, y + pl.oy, 120, 26, { isStatic: true, friction: 0.06, restitution: 0.2, label: 'funnel' })
        Body.setAngle(body, pl.ang)
        part._subBodies.push({ body, ox: pl.ox, oy: pl.oy, ang: pl.ang })
      }
      hitW = 220
      hitH = 110
    }

    part.eventMode = 'static'
    part.cursor = 'pointer'
    part.hitArea = new Rectangle(-hitW / 2, -hitH / 2, hitW, hitH)

    // Fri-drag (egen pointer-logik — INTE DragController) + tap-tap-fallback.
    const onDown = (e) => {
      if (!this._alive || this._falling || this._resolving || this._gliding) return
      this._idle = 0
      this._partsLayer.addChild(part) // höj z-index
      const local = this._root.toLocal(e.global)
      this._drag = { part, ox: part.x - local.x, oy: part.y - local.y, moved: false, sx: local.x, sy: local.y }
      gsap.killTweensOf(part.scale)
      gsap.to(part.scale, { x: 1.08, y: 1.08, duration: 0.12, ease: 'power2.out' })
      ctx.services.audio.sfx('tap')
      e.stopPropagation()
    }
    const onMove = (e) => {
      if (!this._drag || this._drag.part !== part) return
      const local = this._root.toLocal(e.global)
      part.x = clamp(local.x + this._drag.ox, FIELD.minX, FIELD.maxX)
      part.y = clamp(local.y + this._drag.oy, FIELD.minY, FIELD.maxY)
      this._syncPartBodies(part)
      if (Math.hypot(local.x - this._drag.sx, local.y - this._drag.sy) > 14) this._drag.moved = true
      this._idle = 0
    }
    const onUp = () => {
      if (!this._drag || this._drag.part !== part) return
      const moved = this._drag.moved
      this._lastMoved = moved
      this._drag = null
      gsap.killTweensOf(part.scale)
      gsap.to(part.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' })
      if (moved) {
        ctx.services.audio.sfx('soft')
        this._deselect()
      }
      this._idle = 0
    }
    const onTap = (e) => {
      e.stopPropagation()
      if (this._lastMoved) {
        this._lastMoved = false
        return
      }
      this._togglePartSelect(ctx, part)
    }
    part.on('pointerdown', onDown)
    part.on('globalpointermove', onMove)
    part.on('pointerup', onUp)
    part.on('pointerupoutside', onUp)
    part.on('pointertap', onTap)

    this._partsLayer.addChild(part)
    this._parts.push(part)
    bounceIn(part)
    return part
  },

  _addKnob(ctx, part, kx) {
    const knob = new Container()
    const g = new Graphics().circle(0, 0, 40).fill(COLORS.orange).stroke({ width: 5, color: COLORS.orangeDark })
    const t = new Text({ text: '↻', style: { fontFamily: FONT.title, fontSize: 44, fontWeight: '800', fill: COLORS.white } })
    t.anchor.set(0.5)
    t.eventMode = 'none'
    knob.addChild(g, t)
    knob.position.set(kx, 0)
    knob.eventMode = 'static'
    knob.cursor = 'pointer'
    knob.hitArea = new Circle(0, 0, 70) // osynlig hit-halo ≥96px
    knob.on('pointerdown', (e) => e.stopPropagation()) // greppa knappen ≠ dra delen
    knob.on('pointertap', (e) => {
      e.stopPropagation()
      this._rotatePart(ctx, part)
    })
    part._knob = knob
    part.addChild(knob)
  },

  // Synka matter-kropparna med delens vy (vid varje drag OCH varje vrid).
  _syncPartBodies(part) {
    if (part._kind === 'funnel') {
      for (const s of part._subBodies) {
        Body.setPosition(s.body, { x: part.x + s.ox, y: part.y + s.oy })
        Body.setAngle(s.body, s.ang)
      }
    } else if (part._body) {
      Body.setAngle(part._body, part.rotation)
      // En fjäderbräda som flyttas behåller sin inpressning (viloläget är delens läge,
      // kroppen sitter `komp` px in längs normalen) — men får INGEN fart av draget.
      if (part._fjader) part._fjader.flytta(part._body, part.x, part.y, part.rotation)
      else Body.setPosition(part._body, { x: part.x, y: part.y })
    }
  },

  // Tillbaka till viloläget före ett nytt släpp: en bräda som lämnats mitt i en
  // svängning hade annars mött nästa kula med en fart den fick av den förra.
  _resetSprings() {
    for (const part of this._parts) {
      const f = part?._fjader
      if (!f || part.destroyed) continue
      f.nolla()
      if (part._body) f.flytta(part._body, part.x, part.y, part.rotation)
      part._rita?.()
      part._bojd = false
    }
  },

  // Fjäderbrädorna: ETT fast fysiksteg var. En vilande bräda kostar exakt noll —
  // varken kropp att flytta eller silhuett att rita om.
  _stepSprings() {
    for (const part of this._parts) {
      const f = part?._fjader
      if (!f || part.destroyed || !part._body) continue
      if (!f.steg()) continue
      f.driv(part._body, part.x, part.y, part.rotation)
      part._bojd = true
    }
  },

  _rotatePart(ctx, part) {
    if (!this._alive || this._falling || this._resolving || this._gliding) return
    this._idle = 0
    part._angleStep = (part._angleStep + 1) % ANGLE_STEPS.length
    const ang = ANGLE_STEPS[part._angleStep]
    part.rotation = ang
    if (part._knob && !part._knob.destroyed) part._knob.rotation = -ang // håll ↻ upprätt
    this._syncPartBodies(part)
    pop(part)
    ctx.services.audio.sfx('flip')
    if (part._knob && !part._knob.destroyed) {
      const wx = part.x + part._knob.x * Math.cos(ang)
      const wy = part.y + part._knob.x * Math.sin(ang)
      sparkle(ctx.fxLayer, wx, wy, { count: 4 })
    }
  },

  // Tap-tap-markering: tap på del markerar (puls); tap igen avmarkerar.
  _togglePartSelect(ctx, part) {
    if (!this._alive || this._falling || this._resolving || this._gliding) return
    this._idle = 0
    if (this._selected === part) {
      this._deselect()
      ctx.services.audio.sfx('soft')
      return
    }
    this._deselect()
    this._selected = part
    gsap.killTweensOf(part.scale)
    part.scale.set(1)
    this._selPulse = breathe(part, { scale: 1.08, duration: 0.7 })
    ctx.services.audio.sfx('tap')
  },

  _deselect() {
    this._selPulse?.kill()
    this._selPulse = null
    if (this._selected && !this._selected.destroyed) {
      gsap.killTweensOf(this._selected.scale)
      this._selected.scale.set(1)
    }
    this._selected = null
  },

  // Tap i tomrummet: flytta vald del dit (tap-tap-flytt) eller glad puff.
  _fieldTap(ctx, e) {
    if (!this._alive) return
    if (this._falling || this._resolving || this._gliding) return this._kvitto(ctx, e)
    const p = this._root.toLocal(e.global)
    this._idle = 0
    if (this._selected && !this._selected.destroyed) {
      const part = this._selected
      const tx = clamp(p.x, FIELD.minX, FIELD.maxX)
      const ty = clamp(p.y, FIELD.minY, FIELD.maxY)
      this._deselect()
      const sx = part.x
      const sy = part.y
      const st = { p: 0 }
      this._fieldTween?.kill()
      this._fieldTween = gsap.to(st, {
        p: 1,
        duration: 0.3,
        ease: 'power2.out',
        onUpdate: () => {
          if (!this._alive || part.destroyed) return
          part.x = sx + (tx - sx) * st.p
          part.y = sy + (ty - sy) * st.p
          this._syncPartBodies(part)
        },
      })
      ctx.services.audio.sfx('soft')
    } else {
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, p.x, p.y, { count: 4 })
    }
  },

  _setPartsEnabled(on) {
    for (const part of this._parts) {
      if (!part || part.destroyed) continue
      part.eventMode = on ? 'static' : 'none'
      part.interactiveChildren = on
      part.alpha = on ? 1 : 0.92
    }
    if (!on) this._deselect()
  },

  // ---- SLÄPP → kulan blir dynamisk ----------------------------------------

  _release(ctx) {
    if (!this._alive) return
    if (this._falling || this._resolving || this._gliding) {
      if (this._releaseBtn && !this._releaseBtn.destroyed) wiggle(this._releaseBtn)
      return
    }
    this._falling = true
    this._restT = 0
    this._idle = 0
    this._resetSprings()
    this._deselect()
    this._setPartsEnabled(false)
    this._stopButtonPulse()
    this._hideHelpButton()
    ctx.services.audio.sfx('whoosh')
    const b = this._ballBody
    Body.setPosition(b, { x: CHUTE.x, y: CHUTE.y })
    Body.setAngle(b, 0)
    Body.setStatic(b, false)
    nudge(b, 0, 0)
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5 })
  },

  // ---- Ticker -------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._tnow += dt
    this._phys.update(ticker.deltaMS)

    // Skuggan följer kulan (utan att rotera).
    if (this._ballShadow && !this._ballShadow.destroyed && this._ball && !this._ball.destroyed) {
      this._ballShadow.position.set(this._ball.x, this._ball.y)
    }

    this._updateTail()

    // Fjäderbrädorna ritas om EN gång per bildruta (fysiken steppar upp till fem
    // gånger) och bara medan de rör sig — `_bojd` sätts av `_stepSprings`.
    for (const part of this._parts) {
      if (!part || part.destroyed || !part._bojd) continue
      part._bojd = false
      part._rita?.()
    }

    // Mottagaren följer kulan med blicken hela vägen ner.
    if (this._rig && this._catcher && !this._catcher.destroyed && this._ball && !this._ball.destroyed) {
      const p = this._catcher.toLocal(this._ball.getGlobalPosition())
      this._rig.look(p.x, p.y) // look() drar självt bort riggens egen position (0, -44)
    }

    if (this._falling && !this._resolving && !this._gliding) {
      const b = this._ballBody
      // Målet lyser starkare ju närmare kulan är → tydlig "nästan!"-känsla (no-fail).
      if (this._bucketGlow && !this._bucketGlow.destroyed && this._bucketGlowTween) {
        const d = Math.hypot(b.position.x - this._bucketPos.x, b.position.y - this._bucketPos.y)
        const near = clamp(1 - d / NEAR_TARGET, 0, 1)
        this._bucketGlow.alpha = 0.5 + near * 0.45
        this._bucketGlowTween.timeScale(1 + near * 2.2)
      }
      if (this._inBucket(b.position.x, b.position.y)) {
        this._win(ctx)
        return
      }
      const spd = Math.hypot(b.velocity.x, b.velocity.y)
      if (b.position.y > FLOOR_MISS_Y) {
        this._returnBall(ctx)
        return
      }
      if (spd < REST_SPEED) {
        this._restT += dt
        if (this._restT >= REST_HOLD) this._returnBall(ctx)
      } else {
        this._restT = 0
      }
      return
    }

    // Banan väntar på SLÄPP → idle-recue efter ~6 s.
    if (!this._falling && !this._resolving && !this._gliding) {
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        this._idleRecue(ctx)
      }
    }
  },

  _inBucket(x, y) {
    const b = this._bucketPos
    return Math.abs(x - b.x) <= 66 && y >= b.y - 54 && y <= b.y - 6
  },

  _idleRecue(ctx) {
    ctx.services.voice.replayLast()
    if (this._releaseBtn && !this._releaseBtn.destroyed) pop(this._releaseBtn)
    const ramp = this._parts.find((p) => p && !p.destroyed && p._kind === 'ramp')
    if (ramp) wiggle(ramp)
  },

  // ---- Mål: firande + ny bana ---------------------------------------------

  _win(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._gliding = false
    this._glideTween?.kill()
    this._setPartsEnabled(false)
    this._stopButtonPulse()
    this._hideHelpButton()
    this._idle = 0

    const bx = this._bucketPos.x
    const by = this._bucketPos.y
    const b = this._ballBody
    Body.setStatic(b, true)
    nudge(b, 0, 0)
    Body.setPosition(b, { x: bx, y: by - 16 })

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    // Saftigt "plums" i vattnet (två snabba nedåt-toner) + mjuk mikroskak.
    ctx.services.audio.tone({ freq: 520, dur: 0.12, type: 'sine', vol: 0.22, slideTo: 180 })
    ctx.services.audio.tone({ freq: 300, dur: 0.18, type: 'sine', vol: 0.16, slideTo: 120, delay: 0.06 })
    ctx.services.voice.say(randomFrom(PRAISE))
    gsap.killTweensOf(this._root) // nolla ev. pågående studs-skak innan mål-skaket (undvik kvar-offset)
    this._root.position.set(0, 0)
    shake(this._root, { intensity: 9, duration: 0.4 })

    // Kulan "plumsar" ner i hinken (kort skala-studs; link rör bara position/vinkel).
    if (this._ball && !this._ball.destroyed) {
      this._ball.position.set(bx, by - 16)
      gsap.killTweensOf(this._ball.scale)
      gsap.fromTo(this._ball.scale, { x: 1, y: 1 }, { x: 0.7, y: 0.7, duration: 0.32, yoyo: true, repeat: 1, ease: 'power2.inOut' })
    }

    // Hinken guppar till av plumset (via {}-proxy → exit-säkert).
    if (this._bucketView && !this._bucketView.destroyed) {
      const bv = this._bucketView
      const y0 = bv.y
      gsap.killTweensOf(bv)
      const st = { y: y0 }
      gsap.to(st, {
        y: y0 + 12,
        duration: 0.12,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (!bv.destroyed) bv.y = st.y
        },
        onComplete: () => {
          if (!bv.destroyed) bv.y = y0
        },
      })
    }

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, bx, by - 30, { count: 16 })
    // Vattenskvätt: blå droppar spritter upp ur hinken.
    burst(ctx.fxLayer, bx, by - 40, { count: 12, colors: [COLORS.blue, COLORS.teal, 0xbfe6ff], power: 0.8 })
    // Bobo firar med armarna i luften — spel-specifikt slut i st.f. en 🎉-emoji.
    this._catcherCheer(true)
    // Vattnet i hinken svallar över kanten av plumset.
    const w = this._bucketWater
    if (w && !w.destroyed) {
      gsap.killTweensOf(w.scale)
      gsap.fromTo(w.scale, { x: 1, y: 1 }, { x: 1.1, y: 1.5, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' })
    }

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('banor', (ctx.progress.get().custom?.banor || 0) + 1)
    ctx.progress.complete()

    this._winTimer?.kill()
    this._winTimer = gsap.delayedCall(1.5, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Miss = roligt + auto-hjälp (garanterar framgång) -------------------

  _returnBall(ctx) {
    if (!this._alive || this._resolving || this._gliding) return
    this._falling = false
    this._restT = 0
    this._attempts++

    ctx.services.audio.sfx('soft')
    if (this._ball && !this._ball.destroyed) {
      floatText(ctx.fxLayer, this._ball.x, this._ball.y - 30, 'Hoppsan!', { fontSize: 44 })
      puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 6 })
    }
    this._freezeBall()
    // Nollställ glödringen (den intensifieras under fall).
    if (this._bucketGlow && !this._bucketGlow.destroyed) this._bucketGlow.alpha = 0.5
    this._bucketGlowTween?.timeScale(1)

    // Sista skyddsnätet (no-fail): efter väldigt många missar glider kulan hem ändå,
    // även om barnet aldrig rör hjälp-knappen. Ligger MYCKET senare än förr (var 4).
    if (this._attempts >= AUTO_HELP_AT) {
      this._hideHelpButton()
      this._glideHome(ctx)
      return
    }

    this._setPartsEnabled(true)
    this._startButtonPulse()
    this._idle = 0

    // Hjälpen är nu FRIVILLIG och SYNLIG: efter några missar dyker en "Hjälp mig?"-
    // knapp upp — banan löser sig aldrig i tysthet, barnets egen lösning tas inte ifrån det.
    if (this._attempts >= HELP_AFTER) {
      this._showHelpButton()
      if (this._attempts === HELP_AFTER) ctx.services.voice.say('Prova igen! Tryck på handen om du vill ha hjälp.')
      return
    }
    if (Math.random() < 0.5) ctx.services.voice.say('Nästan! Prova igen.')
  },

  // Auto-hjälp steg 1: flytta + luta den ramp som ligger närmast hinken så den pekar dit.
  _assistTiltRamp(ctx) {
    ctx.services.voice.say('Jag putar lite!')
    const bx = this._bucketPos.x
    let ramp = null
    let best = Infinity
    for (const p of this._parts) {
      if (!p || p.destroyed || p._kind !== 'ramp' || !p._body) continue
      const d = Math.abs(p.x - bx)
      if (d < best) {
        best = d
        ramp = p
      }
    }
    if (!ramp) return
    const tx = clamp(CHUTE.x + (bx - CHUTE.x) * 0.45, 220, 980)
    const ty = 380
    const dir = bx >= ramp.x ? 1 : -1
    const ang = dir * ((30 * Math.PI) / 180)
    ramp._angleStep = dir > 0 ? 6 : 2 // index för +30° / −30°
    this._deselect()
    const sx = ramp.x
    const sy = ramp.y
    const sr = ramp.rotation
    const st = { p: 0 }
    this._assistTween?.kill()
    this._assistTween = gsap.to(st, {
      p: 1,
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (!this._alive || ramp.destroyed) return
        ramp.x = sx + (tx - sx) * st.p
        ramp.y = sy + (ty - sy) * st.p
        ramp.rotation = sr + (ang - sr) * st.p
        if (ramp._knob && !ramp._knob.destroyed) ramp._knob.rotation = -ramp.rotation
        this._syncPartBodies(ramp)
      },
    })
    ctx.services.audio.sfx('flip')
    // Tydlig "det var jag som puttade"-gest så barnet vet att det var hjälp, inte deras bygge.
    floatText(ctx.fxLayer, ramp.x, ramp.y - 46, '🤚', { fontSize: 52 })
    if (this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, ramp.x, ramp.y, { count: 5 })
  },

  // Auto-hjälp steg 2: kulan glider hela vägen hem (exit-säker {}-proxy) → fira ändå.
  _glideHome(ctx) {
    this._gliding = true
    this._setPartsEnabled(false)
    this._stopButtonPulse()
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('Jag rullar den hem åt dig!')
    const b = this._ballBody
    Body.setStatic(b, true)
    nudge(b, 0, 0)
    const sx = b.position.x
    const sy = b.position.y
    const tx = this._bucketPos.x
    const ty = this._bucketPos.y - 24
    const st = { p: 0 }
    this._glideTween?.kill()
    this._glideTween = gsap.to(st, {
      p: 1,
      duration: 1.0,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._alive) {
          this._glideTween?.kill()
          return
        }
        const x = sx + (tx - sx) * st.p
        const y = sy + (ty - sy) * st.p - Math.sin(st.p * Math.PI) * 60 // mjuk båge
        Body.setPosition(b, { x, y })
        nudge(b, 0, 0)
      },
      onComplete: () => {
        if (this._alive) this._win(ctx)
      },
    })
  },

  // ---- Kollisioner: studsljud ---------------------------------------------

  // Fartsvansen: en svag strimma i kulans egen färg bakom den. Den ska säga FART, så
  // den finns bara när kulan far — en kula som rullar sakta eller ligger still har
  // ingen svans alls, annars blir strimman en del av kulans utseende i stället för en
  // avläsning av hur det går.
  _updateTail() {
    const g = this._tailG
    if (!g || g.destroyed) return
    const b = this._ballBody
    const kor = this._falling && !this._resolving && !this._gliding && b
    const spd = kor ? Math.hypot(b.velocity.x, b.velocity.y) : 0
    const styrka = clamp((spd - TAIL_MIN_SPEED) / (TAIL_FULL_SPEED - TAIL_MIN_SPEED), 0, 1)

    if (!kor || styrka <= 0) {
      if (this._tail.length) {
        this._tail.length = 0
        g.clear()
      }
      return
    }

    // Punkter läggs bara till när kulan FLYTTAT sig — annars fylls bufferten av
    // dubbletter medan den nästan står still och strimman blir en klick.
    const sist = this._tail[this._tail.length - 1]
    if (!sist || Math.hypot(b.position.x - sist.x, b.position.y - sist.y) > 6) {
      this._tail.push({ x: b.position.x, y: b.position.y })
      if (this._tail.length > TAIL_N) this._tail.shift()
    }

    g.clear()
    const p = this._tail
    if (p.length < 3) return
    for (let i = 1; i < p.length; i++) {
      const f = i / (p.length - 1) // 0 = svansspetsen, 1 = vid kulan
      g.moveTo(p[i - 1].x, p[i - 1].y).lineTo(p[i].x, p[i].y)
        .stroke({ width: 3 + f * (BALL_R * 0.9), color: COLORS.yellow, alpha: 0.5 * f * styrka, cap: 'round' })
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const involvesBall = pair.bodyA === this._ballBody || pair.bodyB === this._ballBody
      if (!involvesBall) continue
      const other = pair.bodyA === this._ballBody ? pair.bodyB : pair.bodyA

      // Klocka: ringer glatt när kulan rullar förbi (sensor → blockerar inte).
      if (other.label === 'bell') {
        const rec = this._bells.find((bl) => bl.body === other)
        if (rec) this._ringBell(ctx, rec)
        continue
      }

      // Fjäderbräda: bräddan TAR EMOT anslaget (lagrar farten i fjädern) och kastar
      // tillbaka kulan när plankan går upp igen. Ljudet spelas i samma sekund som
      // kontakten, inte vid utkastet — annars kommer återkopplingen efter 100 ms.
      if (other.label === 'bounce') {
        const part = this._parts.find((p) => p && !p.destroyed && p._body === other)
        const last = part?._fjader ? part._fjader.taEmot(this._ballBody, part.rotation) : 0
        // last = 0 → kulan rullar längs plankan, eller bräddan är redan i svängning
        // (då ÄR kontakten utkastet). Ingen boing på en beröring som inte laddar.
        if (last <= 0.02) continue
        // Boingen behåller sin karaktär (stigande sinus + pling — en DESIGNAD händelse,
        // inte ett anslag), men får nu kraft: en nätt beröring viskar, en riktig smäll
        // sjunger. Det MÅSTE följa kraften nu när ögat ser plankan sjunka olika djupt.
        ctx.services.audio.sfx('pling')
        ctx.services.audio.tone({ freq: 190 + 60 * last, dur: 0.16 + 0.12 * last, type: 'sine', vol: 0.1 + 0.14 * last, slideTo: 520 + 260 * last })
        gsap.killTweensOf(this._root)
        this._root.position.set(0, 0)
        shake(this._root, { intensity: 2 + 5 * last, duration: 0.22 })
        sparkle(ctx.fxLayer, this._ballBody.position.x, this._ballBody.position.y, { count: 3 + Math.round(4 * last) })
        this._lastBounceAt = this._tnow
        continue
      }

      const spd = Math.hypot(this._ballBody.velocity.x, this._ballBody.velocity.y)
      // Trä (ramp/tratt/hinder): mjukt "klonk"; övrigt: neutralt pop. Throttlat.
      // ANSLAGET HÖRS I KRAFTEN (LYFTPLAN B5): en kula som precis nuddar en ramp lät
      // förut exakt som en som dundrar ner i den — samma 160 Hz, samma volym. Nu stiger
      // både volym OCH tonhöjd med farten (örat läser tonhöjd som kraft; bara volym
      // låter som samma träff på olika avstånd). Studsplattan ovan är en DESIGNAD
      // händelse och behåller med flit sin fasta boing.
      if (spd > 2 && this._tnow - this._lastBounceAt > BOUNCE_THROTTLE) {
        this._lastBounceAt = this._tnow
        const kraft = clamp((spd - 2) / 12, 0, 1)
        const wood = other.label === 'ramp' || other.label === 'funnel' || other.label === 'obstacle'
        // Rull-damm i KONTAKTPUNKTEN, mängd efter anslagets kraft: en nätt beröring
        // ryker inte, en riktig smäll gör det. Punkten kommer ur matters `supports` —
        // kulans mittpunkt hade lagt puffen inne i kulan i stället för mot ytan.
        const kp = pair.activeContacts?.[0]?.vertex || pair.collision?.supports?.[0]
        if (kraft > 0.12) {
          puff(ctx.fxLayer, kp ? kp.x : this._ballBody.position.x, kp ? kp.y : this._ballBody.position.y,
            { count: 2 + Math.round(4 * kraft), color: wood ? 0xc9a06a : 0xd8d2c4 })
        }
        if (wood && this._tnow - this._lastWoodAt > BOUNCE_THROTTLE) {
          this._lastWoodAt = this._tnow
          const f = 160 * (0.86 + 0.34 * kraft)
          ctx.services.audio.tone({ freq: f, dur: 0.09 * (0.8 + 0.5 * kraft), type: 'square', vol: 0.08 + kraft * 0.11, slideTo: f * 0.6 })
        } else {
          ctx.services.audio.sfx('pop')
        }
      }
    }
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  _removePartBodies(part) {
    if (part._fjader) {
      part._fjader.destroy()
      part._fjader = null
    }
    if (part._body) {
      this._phys.removeBody(part._body)
      part._body = null
    }
    if (part._subBodies) {
      for (const s of part._subBodies) this._phys.removeBody(s.body)
      part._subBodies = null
    }
  },

  _clearParts() {
    this._deselect()
    this._drag = null
    for (const part of this._parts) {
      if (!part) continue
      this._removePartBodies(part)
      if (!part.destroyed) {
        gsap.killTweensOf(part)
        gsap.killTweensOf(part.scale)
        part.destroy({ children: true })
      }
    }
    this._parts = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._unbindStep?.()
    for (const part of this._parts || []) part?._fjader?.destroy()
    this._winTimer?.kill()
    this._glideTween?.kill()
    this._assistTween?.kill()
    this._fieldTween?.kill()
    this._btnPulse?.kill()
    this._helpPulse?.kill()
    this._bucketGlowTween?.kill()
    this._selPulse?.kill()
    this._catcherIdle?.kill()
    this._rig?.destroy()
    this._rig = null

    // Mottagaren tweenas på position/scale/armar — allt måste dö med omgången.
    if (this._catcher && !this._catcher.destroyed) {
      gsap.killTweensOf(this._catcher)
      gsap.killTweensOf(this._catcher.position)
      gsap.killTweensOf(this._catcher.scale)
    }
    for (const arm of this._catcherArms || []) if (arm && !arm.destroyed) gsap.killTweensOf(arm)
    if (this._bucketWater && !this._bucketWater.destroyed) gsap.killTweensOf(this._bucketWater.scale)

    if (this._fieldCatcher && !this._fieldCatcher.destroyed) this._fieldCatcher.off('pointertap', this._onFieldTap)
    if (this._releaseBtn && !this._releaseBtn.destroyed) {
      this._releaseBtn.off('pointertap', this._onRelease)
      gsap.killTweensOf(this._releaseBtn)
      gsap.killTweensOf(this._releaseBtn.scale)
    }
    if (this._helpBtn && !this._helpBtn.destroyed) {
      this._helpBtn.off('pointertap', this._onHelp)
      gsap.killTweensOf(this._helpBtn)
      gsap.killTweensOf(this._helpBtn.scale)
    }
    for (const bl of this._bells || []) {
      if (bl.emoji && !bl.emoji.destroyed) gsap.killTweensOf(bl.emoji)
    }

    for (const part of this._parts || []) {
      if (part && !part.destroyed) {
        gsap.killTweensOf(part)
        gsap.killTweensOf(part.scale)
      }
    }
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball)
      gsap.killTweensOf(this._ball.scale)
    }
    if (this._bucketGlow && !this._bucketGlow.destroyed) gsap.killTweensOf(this._bucketGlow.scale)

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
