// Rulla Bollen Hem — minigolf-fysik sedd ovanifrån (3–5 år). Barnet SIKTAR och
// rullar bollen hem i målet: greppar bollen, drar för att välja riktning + kraft
// (en prickad bana visar EXAKT var bollen rullar och stannar) och släpper — bollen
// rullar iväg som en riktig matter.js-kropp utan gravitation (toppvy), bromsas av
// ytans luftmotstånd (= friktion) och studsar mjukt mot planens väggar tills den
// stannar. Nästa skott går från det nya viloläget (precis som riktig minigolf), så
// bollen kommer steg för steg närmare.
//
// VARIATION + STIGANDE SVÅRIGHET PER BANA (no-fail hela tiden):
//  • HINDER — statiska klossar (rulla runt) och studsdynor/"bumprar" (pinball-studs
//    med pling) dyker upp från bana 2 och blir fler/närmare på högre banor.
//  • YTOR — varje bana väljer en startyta (gräs/is/sand). Yt-knappen byter ändå fritt
//    (extra kontroll); friktionen + pricklinjens damp uppdateras alltid i takt.
//  • BOLLAR — ibland en annan boll: 🏀 studsboll (mer studs) eller 🎳 tung boll (kort,
//    seg rull). Bollens studsighet speglas i pricklinjens studs så linjen stämmer.
//  • VIND — från bana 4 en mjuk bris som böjer bollens väg. Vinden slås PÅ vid skott
//    och AV när bollen nästan stannat, så den alltid kan vila inför nästa skott.
//
// INGET misslyckande: stannar bollen utan mål blir det en glad puff + vingel, och efter
// FLERA egna stopp får den först ett nästan-perfekt hjälp-skott och sist en garanterad
// hemrullning (glider rakt hem som spöke/sensor genom ev. hinder) — alltid jubel,
// aldrig "game over". Allt ritas programmatiskt (Pixi Graphics + system-emoji).
//
// Kalibrering (uppmätt mot matter vid fast 1/60-steg): toppvy => gravityY = 0, så
// previewGravity = 0; utrullningen styrs av luftmotståndet och matter dämpar farten
// ~(1 - frictionAir) per steg, så previewDamp = 1 - frictionAir får pricklinjen att
// stanna på exakt samma punkt som bollen. För VIND: matter ger fart-tillskott
// windAccel × (1000/60)² px/steg, så för en pricklinje-vind previewWind (px/steg²)
// sätts matter-vinden windAccel = previewWind / (1000/60)²  (≈ /277.8). Då matchar den
// böjda pricklinjen bollens verkliga böj. Hinder ritas medvetet INTE i pricklinjen
// (det är banans utmaning) — och glide-hjälpen garanterar ändå alltid mål.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { Button } from '../../lib/Button.js'
import { bigCelebration, puff, sparkle, pop, wiggle, floatText } from '../../lib/feedback.js'
import { FONT, COLORS } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// Layout i designkoordinater (1280×720).
const FIELD = { x: 60, y: 120, w: 1160, h: 560, r: 32 }
const WALL = { l: 60, r: 1220, t: 120, b: 680 } // planens inre studskanter
const BALL_R = 56
const BALL_START = { x: 200, y: 400 }

// Ytor (extra kontroll). frictionAir = ytans bromsning: gräs bromsar lagom, is bromsar
// mindre (lång, hal glidning), sand bromsar mest (kort, seg rull). Bollens utrullning
// ≈ v0 × (1 - fa) / fa, så is rullar ~2× så långt som gräs, sand ~30% kortare.
const SURFACES = [
  { key: 'gras', label: 'Gräs', icon: '🌱', frictionAir: 0.028 },
  { key: 'is', label: 'Is', icon: '🧊', frictionAir: 0.014 },
  { key: 'sand', label: 'Sand', icon: '🏖️', frictionAir: 0.044 },
]
const SURFACE_VOICE = {
  gras: 'Mjukt gräs. Bollen rullar lugnt.',
  is: 'Hal is! Bollen glider långt.',
  sand: 'Mjuk sand. Bollen rullar kort.',
}

// Bollar (ibland en annan boll). rest = studsighet (mot väggar/hinder), dragAdd = extra
// luftmotstånd ovanpå ytan (tung boll rullar kortare, studsboll lite längre).
const BALLS = {
  normal: { rest: 0.55, dragAdd: 0 },
  bouncy: { rest: 0.82, dragAdd: -0.005 },
  heavy: { rest: 0.4, dragAdd: 0.012 },
}

// --- Ritade bollar (P0 ASSETS) ---------------------------------------------
// Mönstret ligger i en egen container som roteras; ansiktet ligger utanför så
// bollen tittar rakt fram medan den rullar.
function makeBallSkin(kind, r) {
  const c = new Container()
  const g = new Graphics()
  if (kind === 'bouncy') {
    g.circle(0, 0, r).fill(0xff8a3d).stroke({ width: 3, color: 0xd9661f })
    g.moveTo(-r, 0).lineTo(r, 0).stroke({ width: 4, color: 0x8a4a15 })
    g.moveTo(0, -r).lineTo(0, r).stroke({ width: 4, color: 0x8a4a15 })
    g.moveTo(-r * 0.72, -r * 0.72).quadraticCurveTo(0, 0, -r * 0.72, r * 0.72).stroke({ width: 4, color: 0x8a4a15 })
    g.moveTo(r * 0.72, -r * 0.72).quadraticCurveTo(0, 0, r * 0.72, r * 0.72).stroke({ width: 4, color: 0x8a4a15 })
  } else if (kind === 'heavy') {
    g.circle(0, 0, r).fill(0x4a3f6b).stroke({ width: 3, color: 0x2f2748 })
    g.circle(-r * 0.28, -r * 0.3, r * 0.13).fill(0x241d38)
    g.circle(r * 0.1, -r * 0.4, r * 0.13).fill(0x241d38)
    g.circle(-r * 0.05, -r * 0.05, r * 0.13).fill(0x241d38)
    g.ellipse(-r * 0.34, r * 0.3, r * 0.3, r * 0.18).fill({ color: 0xffffff, alpha: 0.14 })
  } else {
    // Fotboll: fälten ligger LÄNGS KANTEN så ansiktet i mitten alltid syns.
    g.circle(0, 0, r).fill(0xfffdf7).stroke({ width: 3, color: 0xd8d2c6 })
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2
      g.circle(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.19).fill(0x33291f)
      const a2 = a + Math.PI / 6
      g.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78)
        .lineTo(Math.cos(a2) * r, Math.sin(a2) * r)
        .stroke({ width: 3, color: 0x33291f, alpha: 0.6 })
    }
  }
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Bollens ansikte: ögon + leende, alltid upprätt. Sitter ovanpå mönstret.
function makeBallFace(r) {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(-r * 0.3, -r * 0.16, r * 0.17, r * 0.2).fill(0xfffdf7)
  g.ellipse(r * 0.3, -r * 0.16, r * 0.17, r * 0.2).fill(0xfffdf7)
  g.circle(-r * 0.28, -r * 0.13, r * 0.09).fill(0x33291f)
  g.circle(r * 0.32, -r * 0.13, r * 0.09).fill(0x33291f)
  g.moveTo(-r * 0.22, r * 0.24).quadraticCurveTo(0, r * 0.46, r * 0.22, r * 0.24)
    .stroke({ width: 4, color: 0x33291f, cap: 'round' })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Målvakten Bobo: står i målet, vinkar och fångar bollen.
function makeKeeper() {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 44, 30, 9).fill({ color: 0x000000, alpha: 0.16 })
  g.ellipse(-13, 36, 12, 8).fill(0x3f8f43)
  g.ellipse(13, 36, 12, 8).fill(0x3f8f43)
  g.ellipse(0, 8, 26, 30).fill(0x5bbf6a) // matchtröja
  g.rect(-26, 2, 52, 9).fill({ color: 0xfffdf7, alpha: 0.75 })
  c.addChild(g)
  const arms = new Graphics()
  arms.moveTo(-20, -4).quadraticCurveTo(-38, -14, -42, -38).stroke({ width: 11, color: 0x5bbf6a, cap: 'round' })
  arms.moveTo(20, -4).quadraticCurveTo(38, -14, 42, -38).stroke({ width: 11, color: 0x5bbf6a, cap: 'round' })
  arms.circle(-42, -38, 10).fill(0xffd35c) // handskar
  arms.circle(42, -38, 10).fill(0xffd35c)
  c.addChild(arms)
  const head = new Graphics()
  head.circle(0, -38, 22).fill(0xfffdf7)
  head.circle(-8, -41, 3.6).fill(0x33291f)
  head.circle(8, -41, 3.6).fill(0x33291f)
  head.moveTo(-8, -31).quadraticCurveTo(0, -24, 8, -31).stroke({ width: 3, color: 0x33291f, cap: 'round' })
  head.circle(-15, -32, 4.5).fill({ color: 0xff9ec4, alpha: 0.8 })
  head.circle(15, -32, 4.5).fill({ color: 0xff9ec4, alpha: 0.8 })
  c.addChild(head)
  c._arms = arms
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

const WALL_REST = 0.55 // planens väggars studsighet (effektiv studs = max(boll, vägg))
const STEP2 = (1000 / 60) ** 2 // ≈ 277.8 — fasta tidssteget² (vind-kalibrering)
const REST_SPEED = 0.6 // matter-fart under detta = bollen stannar
const REST_DWELL = 0.28 // s under REST_SPEED innan vi räknar bollen som stilla
const MAX_ROLL = 6 // s rullning innan vi tvingar stopp (extra säkerhet)
const IDLE_DELAY = 6 // s utan handling innan röst-recue
const BOUNCE_THROTTLE = 0.14 // s mellan studsljud (anti-spam)
const WIND_CUTOFF = 4 // px/steg: under detta slås vinden av så bollen kan vila

// Förhandsvisningens väggar (bollens MITT studsar här). predict saknar takvägg, så
// banorna är gjorda så att direkt-/sido-/golvstudsar räcker — topp-studs behövs aldrig.
const PREVIEW_BOUNDS = { floorY: WALL.b - BALL_R, leftX: WALL.l + BALL_R, rightX: WALL.r - BALL_R, restitution: WALL_REST }

// Färger.
const C_GRASS = 0x7ec850
const C_FIELD = 0x8fd65e
const C_FIELD_EDGE = 0x5fa83c
const C_GOAL = 0xffd84a

const IDLE_CUES = ['Sikta och rulla bollen hem!', 'Dra i bollen och släpp – rulla hem den!', 'Sikta mot målet och släpp!']
const MISS_CUES = ['Nästan! Rulla igen.', 'Försök en gång till!', 'Nästan framme – en gång till!']
const WIN_CUES = ['Mål! Du klarade det!', 'Hurra! Bollen är hemma!', 'Bra rullat! Rakt i mål!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'rulla-bollen-hem',
  titleSv: 'Rulla Bollen Hem',
  icon: '⚽',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'rulla-bollen-hem',
  voiceIntro: 'Sikta och rulla bollen hem i målet!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._restT = 0
    this._rollT = 0
    this._mode = 'aim' // aim | rolling | gliding | resolving
    this._misses = 0
    this._assisting = false
    this._lastBounce = -1
    this._surfaceIdx = 0
    this._ballKey = 'normal'
    this._effFrictionAir = SURFACES[0].frictionAir
    this._windPreview = 0 // px/steg² i pricklinjen
    this._windAccel = 0 // matter-acceleration (= previewWind / STEP2)
    this._windOn = false
    this._obstacleBodies = []
    this._obstacleViews = []
    this._previewBounds = { ...PREVIEW_BOUNDS }
    this._home = { x: 1060, y: 400, r: 110 }
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildScene(ctx)

    // Fysik: toppvy => INGEN gravitation. Egna studsväggar längs planens insida
    // (inte skärmkanten), så bollen alltid hålls kvar inne på planen (no-fail).
    this._phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    this._buildWalls()

    // Boll-kropp (persistent: vilar där den stannar och skjuts om från nya läget).
    this._ballBody = this._phys.circle(BALL_START.x, BALL_START.y, BALL_R, {
      restitution: BALLS.normal.rest,
      friction: 0.04,
      frictionAir: SURFACES[0].frictionAir,
      density: 0.0012,
      label: 'ball',
    })
    // Toppvy-puck: lås vinkeln (ingen snurr från studsar) så containern står upprätt
    // och skuggan stannar under bollen — endast emojin roteras (rull-känsla).
    Body.setInertia(this._ballBody, Infinity)
    this._phys.link(this._ballBody, this._ball) // synkar bara position (vinkel = 0)

    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Sikt-/skjut-kontroll: dra för riktning + kraft, prickad bana = exakt utrullning.
    // slingshot:false => man drar ÅT det håll bollen ska rulla (knuff, inte slangbella).
    this._launcher = new AimLauncher({
      target: this._ball,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: false,
      hitRadius: 92,
      maxPower: 26,
      minPower: 8,
      powerScale: 0.16,
      tapPower: 0.62, // ett litet tap ger en lekfull knuff mot målet (inte ett facit-skott — dra för kraft)
      trailColor: 0xffffff,
      previewGravity: 0, // toppvy: ingen gravitation i pricklinjen
      previewWind: 0,
      previewDamp: 1 - SURFACES[0].frictionAir, // = ytans bromsning -> linjen stannar rätt
      bounds: { ...PREVIEW_BOUNDS },
      getOrigin: () => ({ x: this._ball.x, y: this._ball.y }),
      defaultAim: () => ({ x: this._home.x, y: this._home.y }),
      onGrab: () => {
        this._idle = 0
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      },
      onAim: () => {
        this._idle = 0
      },
      onLaunch: (v) => {
        this._assisting = false
        this._shoot(ctx, v.vx, v.vy)
      },
    })

    // Bollen läggs överst (ovanför pricklinjen och målet).
    this._root.addChild(this._ball)

    this._buildSurfaceUI(ctx)

    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen -------------------------------------------------------

  _buildScene(ctx) {
    // Gräs-bakgrund: fångar tap utanför bollen -> liten glad puff (varje pekning syns).
    this._bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(C_GRASS)
    this._bg.eventMode = 'static'
    this._onBgTap = (e) => this._bgTap(ctx, e)
    this._bg.on('pointertap', this._onBgTap)
    this._root.addChild(this._bg)

    // Spelplan med rundade hörn (studsväggar) — dekorativ, släpper tap igenom.
    const frame = new Graphics()
      .roundRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, FIELD.r)
      .fill(C_FIELD)
      .stroke({ width: 10, color: C_FIELD_EDGE })
    frame.roundRect(FIELD.x, FIELD.y, FIELD.w, 60, FIELD.r).fill({ color: 0xa6e36f, alpha: 0.5 })
    frame.roundRect(FIELD.x, FIELD.y + FIELD.h - 50, FIELD.w, 50, FIELD.r).fill({ color: 0x4f9a36, alpha: 0.3 })
    // Klippta gräsränder + riktiga planlinjer: mittcirkel, mittlinje, straffområde och
    // hörnbågar. Planen var tidigare en helt tom grön yta.
    for (let i = 0; i < 8; i++) {
      frame.rect(FIELD.x, FIELD.y + i * 70, FIELD.w, 35).fill({ color: 0x86cf56, alpha: 0.35 })
    }
    const L = { width: 5, color: 0xffffff, alpha: 0.5 }
    frame.moveTo(640, FIELD.y + 14).lineTo(640, FIELD.y + FIELD.h - 14).stroke(L)
    frame.circle(640, 400, 96).stroke(L)
    frame.circle(640, 400, 9).fill({ color: 0xffffff, alpha: 0.5 })
    frame.rect(FIELD.x + 14, 250, 130, 300).stroke(L)
    frame.rect(FIELD.x + FIELD.w - 144, 250, 130, 300).stroke(L)
    frame.arc(FIELD.x + 14, FIELD.y + 14, 34, 0, Math.PI / 2).stroke(L)
    frame.arc(FIELD.x + FIELD.w - 14, FIELD.y + 14, 34, Math.PI / 2, Math.PI).stroke(L)
    frame.eventMode = 'none'
    this._root.addChild(frame)

    // Spår efter bollen: ett bleknande gräsavtryck så skottet får ett synligt efterspel.
    this._trail = new Graphics()
    this._trail.eventMode = 'none'
    this._root.addChild(this._trail)
    this._trailPts = []

    // Hål-rad upptill (bana 1, 2, 3 …) — konkret framsteg utan läsning.
    this._holeRow = new Graphics()
    this._holeRow.eventMode = 'none'
    this._root.addChild(this._holeRow)
    this._drawHoleRow(this._level)

    // Is-overlay (visas mjukt när ytan = is): ljusblå isyta med glansstreck.
    this._iceOverlay = new Graphics()
    this._iceOverlay.roundRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, FIELD.r).fill({ color: 0xcdeeff })
    this._iceOverlay.roundRect(FIELD.x + 60, FIELD.y + 50, FIELD.w * 0.5, 18, 9).fill({ color: 0xffffff, alpha: 0.5 })
    this._iceOverlay.roundRect(FIELD.x + 260, FIELD.y + 190, FIELD.w * 0.4, 14, 7).fill({ color: 0xffffff, alpha: 0.4 })
    this._iceOverlay.roundRect(FIELD.x + 120, FIELD.y + 360, FIELD.w * 0.34, 12, 6).fill({ color: 0xffffff, alpha: 0.35 })
    this._iceOverlay.alpha = 0
    this._iceOverlay.eventMode = 'none'
    this._root.addChild(this._iceOverlay)

    // Sand-overlay (visas mjukt när ytan = sand): varm sandton med lätta prickar.
    this._sandOverlay = new Graphics()
    this._sandOverlay.roundRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, FIELD.r).fill({ color: 0xf2dca0 })
    for (let i = 0; i < 26; i++) {
      const sx = FIELD.x + 40 + Math.random() * (FIELD.w - 80)
      const sy = FIELD.y + 40 + Math.random() * (FIELD.h - 80)
      this._sandOverlay.circle(sx, sy, 3 + Math.random() * 4).fill({ color: 0xd9b873, alpha: 0.5 })
    }
    this._sandOverlay.alpha = 0
    this._sandOverlay.eventMode = 'none'
    this._root.addChild(this._sandOverlay)

    // Hinder-lager (klossar + studsdynor) ligger under bollen, över ytan.
    this._obsLayer = new Container()
    this._obsLayer.eventMode = 'none'
    this._obsLayer.interactiveChildren = false
    this._root.addChild(this._obsLayer)

    this._buildWindFlag()
    this._buildHome()
    this._buildBall()
  },

  // Liten vindflöjel som visar att det blåser + åt vilket håll (svajar mjukt).
  _buildWindFlag() {
    this._windFlag = new Container()
    this._windFlag.eventMode = 'none'
    const leaf = new Text({ text: '🌬️', style: { fontFamily: FONT.body, fontSize: 50 } })
    leaf.anchor.set(0.5)
    this._windArrow = new Text({ text: '→', style: { fontFamily: FONT.title, fontSize: 54, fontWeight: '900', fill: 0x3f78ad } })
    this._windArrow.anchor.set(0.5)
    this._windArrow.position.set(54, 2)
    this._windFlag.addChild(leaf, this._windArrow)
    this._windFlag.position.set(640, 158)
    this._windFlag.alpha = 0
    this._root.addChild(this._windFlag)
    this._windSway = gsap.to(this._windFlag, { y: 168, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildHome() {
    this._homeC = new Container()
    this._homeC.eventMode = 'none' // tap passerar igenom (bollens skott avgör målet)
    this._homeC.interactiveChildren = false
    this._homeGlow = new Graphics() // målzon-ring (ritas om per nivå, andas)

    // RITAT mål (P0 ASSETS): stolpar, ribba och nät — inte en 🥅-emoji i en vit ruta.
    const goal = new Graphics()
    goal.roundRect(-86, -88, 172, 156, 10).fill({ color: 0x2a3f55, alpha: 0.14 }) // måldjup
    for (let i = -3; i <= 3; i++) goal.moveTo(i * 25, -80).lineTo(i * 25, 60).stroke({ width: 2, color: 0xffffff, alpha: 0.55 })
    for (let j = 0; j < 6; j++) goal.moveTo(-80, -80 + j * 28).lineTo(80, -80 + j * 28).stroke({ width: 2, color: 0xffffff, alpha: 0.55 })
    goal.roundRect(-90, -92, 12, 164, 6).fill(0xfffdf7) // vänster stolpe
    goal.roundRect(78, -92, 12, 164, 6).fill(0xfffdf7) // höger stolpe
    goal.roundRect(-90, -92, 180, 12, 6).fill(0xfffdf7) // ribba
    goal.roundRect(-90, 60, 180, 12, 6).fill({ color: 0xe4e0d8, alpha: 0.9 })
    goal.eventMode = 'none'

    // Målvakten Bobo bor i målet: han vinkar när man siktar, fångar bollen och jublar.
    this._keeper = makeKeeper()
    this._keeper.position.set(0, 22)
    this._homeC.addChild(this._homeGlow, goal, this._keeper)
    this._root.addChild(this._homeC)
    // Mjuk andning på målringen (drar blicken mot målet).
    this._goalTween = gsap.to(this._homeGlow.scale, { x: 1.12, y: 1.12, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    // Målvakten vaggar lugnt i väntan.
    this._keeperIdle = gsap.to(this._keeper, { x: 16, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildBall() {
    this._ball = new Container()
    this._ball.position.set(BALL_START.x, BALL_START.y)
    const shadow = new Graphics().ellipse(0, BALL_R * 0.92, BALL_R * 0.9, BALL_R * 0.34).fill({ color: 0x000000, alpha: 0.16 })
    // Mönstret roteras (rull-känsla) medan ANSIKTET hålls upprätt — bollen är en figur,
    // inte en puck. Båda ritas (P0 ASSETS), ingen emoji.
    this._ballSkin = makeBallSkin('normal', BALL_R * 0.92)
    this._ballFace = makeBallFace(BALL_R * 0.92)
    shadow.eventMode = 'none'
    this._ball.addChild(shadow, this._ballSkin, this._ballFace)
    // Bollen blir AimLaunchers target (den sätter eventMode + hit-halo själv).
    this._root.addChild(this._ball)
  },

  // Fyra tjocka, statiska studsväggar vars insidor ligger exakt vid planens kanter.
  _buildWalls() {
    const T = 220
    const W = 1280
    const H = 720
    const opt = { isStatic: true, restitution: WALL_REST, friction: 0.04, label: 'wall' }
    this._phys.rectangle(WALL.l - T / 2, H / 2, T, H + 600, opt) // vänster
    this._phys.rectangle(WALL.r + T / 2, H / 2, T, H + 600, opt) // höger
    this._phys.rectangle(W / 2, WALL.t - T / 2, W + 600, T, opt) // topp
    this._phys.rectangle(W / 2, WALL.b + T / 2, W + 600, T, opt) // botten
  },

  // ---- Banor (nivåberoende) -----------------------------------------------

  _layoutFor(level) {
    const start = { ...BALL_START }
    let home
    if (level <= 1) {
      home = { x: 1060, y: 400, r: 110 } // rak väg, lär ut sikt + kraft
    } else if (level <= 3) {
      home = { x: 1090, y: level % 2 ? 260 : 540, r: 100 } // upp/ner -> sikta i vinkel
    } else if (level <= 5) {
      home = { x: 1130, y: level % 2 ? 232 : 568, r: 95 } // nära hörnet -> studsskott lönar sig
    } else {
      const yBase = level % 2 ? 232 : 560
      const jitter = Math.random() * 70 - 35
      home = { x: clamp(1080 + (level - 6) * 8, 1000, 1150), y: clamp(yBase + jitter, 210, 590), r: 88 }
      start.y = clamp(400 + (Math.random() * 120 - 60), 280, 520)
    }
    return { home, start }
  },

  // Startyta per bana (yt-knappen byter ändå fritt). Gräs först (lär ut), sedan rotation.
  _surfaceForLevel(level) {
    if (level <= 1) return 0
    const pattern = [0, 0, 1, 0, 2, 1, 0, 2, 1]
    return pattern[level] ?? [0, 1, 2][level % 3]
  },

  // Boll per bana — ibland en annan boll, annars vanlig fotboll.
  _ballForLevel(level) {
    if (level === 3 || level === 7) return 'bouncy'
    if (level === 5 || level === 9) return 'heavy'
    if (level >= 10) return ['normal', 'bouncy', 'heavy'][level % 3]
    return 'normal'
  },

  // Vind (pricklinje-vind px/steg², signerad) — mjuk bris från bana 4, växer långsamt,
  // byter håll varannan bana. matter-vinden härleds som previewWind / STEP2 (kalibrerat).
  _windForLevel(level) {
    if (level <= 3) return 0
    const mag = Math.min(0.045 + (level - 4) * 0.012, 0.11)
    return (level % 2 ? 1 : -1) * mag
  },

  // Hinder per bana (skalas med nivå). Klossar = rulla runt; studsdynor = pinball-studs.
  // Filtreras så start och målinfart alltid är fria (no-fail garanteras ändå av glide).
  _obstaclesForLevel(level, home, start) {
    const out = []
    if (level >= 2 && level <= 3) {
      out.push({ type: 'bumper', x: 660, y: level % 2 ? 300 : 500, r: 56 })
    } else if (level >= 4 && level <= 5) {
      out.push({ type: 'block', x: 600, y: level % 2 ? 330 : 400, w: 64, h: 220 })
      out.push({ type: 'bumper', x: 830, y: level % 2 ? 520 : 280, r: 50 })
    } else if (level >= 6) {
      const n = Math.min(4, 2 + Math.floor((level - 6) / 2))
      const step = 300 / Math.max(1, n)
      for (let i = 0; i < n; i++) {
        const x = 470 + i * step + (Math.random() * 50 - 25)
        const y = clamp(210 + Math.random() * 360, 200, 600)
        if (Math.random() < 0.5) out.push({ type: 'block', x, y, w: 56, h: 150 + Math.random() * 90 })
        else out.push({ type: 'bumper', x, y, r: 46 })
      }
    }
    // Säkerställ fri start och fri målinfart (no-fail): filtrera bort hinder för nära.
    return out.filter((o) => {
      const half = o.type === 'block' ? Math.max(o.w, o.h) / 2 : o.r
      const dHome = Math.hypot(o.x - home.x, o.y - home.y)
      const dStart = Math.hypot(o.x - start.x, o.y - start.y)
      return dHome > home.r + half + 70 && dStart > 150 + half && o.x < home.x - 70
    })
  },

  _buildObstacles(specs) {
    for (const s of specs) {
      let body
      const view = new Graphics()
      if (s.type === 'block') {
        body = this._phys.rectangle(s.x, s.y, s.w, s.h, { isStatic: true, restitution: 0.32, friction: 0.1, label: 'block' })
        view.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 12).fill({ color: 0x9a6b3f }).stroke({ width: 6, color: 0x6e4a28 })
        view.roundRect(-s.w / 2 + 6, -s.h / 2 + 6, s.w - 12, 16, 6).fill({ color: 0xbb8a5a, alpha: 0.7 })
      } else {
        body = this._phys.circle(s.x, s.y, s.r, { isStatic: true, restitution: 0.92, friction: 0, label: 'bumper' })
        view.circle(0, 0, s.r).fill({ color: 0xff7043 }).stroke({ width: 6, color: 0xc63f17 })
        view.circle(0, 0, s.r * 0.55).fill({ color: 0xffd0b0, alpha: 0.85 })
        view.circle(0, 0, s.r * 0.28).fill({ color: 0xffffff, alpha: 0.9 })
      }
      view.position.set(s.x, s.y)
      view.eventMode = 'none'
      view.scale.set(0.6)
      this._obsLayer.addChild(view)
      this._obstacleBodies.push(body)
      this._obstacleViews.push(view)
      gsap.to(view.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' })
    }
  },

  _clearObstacles() {
    for (const b of this._obstacleBodies) this._phys?.removeBody(b)
    for (const v of this._obstacleViews) {
      if (v && !v.destroyed) {
        gsap.killTweensOf(v.scale)
        gsap.killTweensOf(v)
        v.destroy()
      }
    }
    this._obstacleBodies = []
    this._obstacleViews = []
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._mode = 'aim'
    this._misses = 0
    this._assisting = false
    this._restT = 0
    this._rollT = 0
    this._idle = 0

    // Vind av (bollen ska vila inför första skottet); värdet appliceras vid skott.
    this._phys.setWind(0, 0)
    this._windOn = false

    const lay = this._layoutFor(level)
    this._home = lay.home
    this._positionHome()

    // Hinder för banan.
    this._clearObstacles()
    this._buildObstacles(this._obstaclesForLevel(level, lay.home, lay.start))

    // Yta + boll för banan (uppdaterar friktion, studs, pricklinjens damp + studs, emoji).
    this._surfaceIdx = this._surfaceForLevel(level)
    this._ballKey = this._ballForLevel(level)
    this._applyMaterials(ctx, { silent: true })

    // Vind för banan (pricklinjen visar den; matter-vinden slås på vid skott).
    this._windPreview = this._windForLevel(level)
    this._windAccel = this._windPreview / STEP2
    this._launcher.setPreview({ wind: this._windPreview })
    if (this._windFlag && !this._windFlag.destroyed) {
      this._windFlag.alpha = this._windPreview !== 0 ? 1 : 0
      if (this._windArrow && !this._windArrow.destroyed) this._windArrow.text = this._windPreview > 0 ? '→' : '←'
    }

    // Bollen tillbaka till start, upprätt och full storlek, inte spöke.
    gsap.killTweensOf(this._ball)
    gsap.killTweensOf(this._ball.scale)
    this._ball.scale.set(1)
    this._ball.alpha = 1
    this._ballSkin.rotation = 0
    this._ballBody.isSensor = false
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    Body.setPosition(this._ballBody, { x: lay.start.x, y: lay.start.y })
    this._ball.position.set(lay.start.x, lay.start.y)

    this._launcher.setEnabled(true)
    if (!this._ball.destroyed) pop(this._ball)

    // Mjuk talad ledtråd när banan har något nytt (boll/vind/hinder) — bara ibland.
    if (level > 0) {
      const hints = []
      if (this._ballKey === 'bouncy') hints.push('Nu har du studsbollen – den studsar mycket!')
      else if (this._ballKey === 'heavy') hints.push('En tung boll – ge den en extra knuff!')
      if (this._windPreview !== 0) hints.push('Det blåser lite på banan – sikta så vinden hjälper dig.')
      if (this._obstacleBodies.length) hints.push('Akta hindren och rulla runt dem!')
      if (hints.length) {
        this._hintTimer?.kill()
        this._hintTimer = ctx.later(0.6, () => {
          if (this._alive) ctx.services.voice.say(randomFrom(hints))
        })
      }
    }
  },

  _positionHome() {
    this._homeC.position.set(this._home.x, this._home.y)
    this._homeGlow.clear().circle(0, 0, this._home.r).stroke({ width: 6, color: C_GOAL, alpha: 0.55 })
    // Mål-sensor (riktig matter-kropp, label 'home'): ploppar bollen "i mål".
    if (this._homeSensor) this._phys.removeBody(this._homeSensor)
    this._homeSensor = this._phys.circle(this._home.x, this._home.y, Math.max(24, this._home.r * 0.5), {
      isStatic: true,
      isSensor: true,
      label: 'home',
    })
  },

  // ---- Yta + boll: håller fysik OCH pricklinje i takt --------------------

  // Sätter bollens frictionAir (yta + bollens dragAdd), studsighet och emoji, och
  // speglar exakt samma värden i pricklinjen (damp = 1 - fa, bounds.restitution = studs)
  // så förhandsvisningen alltid stämmer med verkliga utrullningen och studsen.
  _applyMaterials(ctx, { silent = false } = {}) {
    const s = SURFACES[this._surfaceIdx]
    const ball = BALLS[this._ballKey] || BALLS.normal
    const fa = clamp(s.frictionAir + ball.dragAdd, 0.008, 0.09)
    this._effFrictionAir = fa
    if (this._ballBody) {
      this._ballBody.frictionAir = fa
      this._ballBody.restitution = ball.rest
    }
    this._previewBounds = { ...PREVIEW_BOUNDS, restitution: Math.max(ball.rest, WALL_REST) }
    this._launcher?.setPreview({ damp: 1 - fa, bounds: this._previewBounds })

    // Byt bollens ritade mönster (mönstret roteras; ansiktet ligger kvar upprätt).
    if (this._ballKey !== this._skinKey && this._ball && !this._ball.destroyed) {
      this._skinKey = this._ballKey
      const oldSkin = this._ballSkin
      this._ballSkin = makeBallSkin(this._ballKey, BALL_R * 0.92)
      this._ball.addChildAt(this._ballSkin, this._ball.getChildIndex(oldSkin))
      gsap.killTweensOf(oldSkin)
      if (!oldSkin.destroyed) oldSkin.destroy({ children: true })
    }
    if (this._surfaceLabel && !this._surfaceLabel.destroyed) this._surfaceLabel.text = `${s.icon} ${s.label}`
    if (this._iceOverlay && !this._iceOverlay.destroyed) {
      gsap.killTweensOf(this._iceOverlay)
      gsap.to(this._iceOverlay, { alpha: s.key === 'is' ? 0.5 : 0, duration: 0.3 })
    }
    if (this._sandOverlay && !this._sandOverlay.destroyed) {
      gsap.killTweensOf(this._sandOverlay)
      gsap.to(this._sandOverlay, { alpha: s.key === 'sand' ? 0.55 : 0, duration: 0.3 })
    }

    this._idle = 0
    if (!silent) {
      ctx.services.audio.sfx('whoosh')
      ctx.services.voice.say(SURFACE_VOICE[s.key] || '')
      if (this._surfaceBtn && !this._surfaceBtn.destroyed) pop(this._surfaceBtn)
      floatText(ctx.fxLayer, this._surfaceBtn.x, this._surfaceBtn.y - 84, s.icon, { fontSize: 56 })
    }
  },

  // ---- Skott --------------------------------------------------------------

  _shoot(ctx, vx, vy) {
    if (!this._alive || this._mode === 'rolling' || this._mode === 'gliding' || this._mode === 'resolving') return
    this._mode = 'rolling'
    this._rollT = 0
    this._restT = 0
    this._idle = 0
    this._launcher.setEnabled(false)
    Body.setVelocity(this._ballBody, { x: vx, y: vy })
    // Vinden verkar under flykten (pricklinjen visade böjen); slås av när bollen saktat.
    if (this._windAccel !== 0) {
      this._phys.setWind(this._windAccel, 0)
      this._windOn = true
    }
    ctx.services.audio.sfx('whoosh')
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5 })
  },

  // ---- Ticker: fysik + rull-känsla + mål/stopp + idle ---------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._phys.update(ticker.deltaMS)

    // Rull-rotation på emojin (proportionell mot horisontell fart, riktning-medveten).
    const b = this._ballBody
    const spd = Math.hypot(b.velocity.x, b.velocity.y)
    if (spd > 0.05 && this._ballSkin && !this._ballSkin.destroyed) {
      this._ballSkin.rotation += (b.velocity.x / BALL_R) * (ticker.deltaMS / 16.67)
    }

    // Spårlinje: lägg en punkt medan bollen rullar och låt hela spåret blekna bort.
    this._updateTrail(dt, spd)

    if (this._mode === 'rolling' || this._mode === 'gliding') {
      if (this._inHome()) {
        this._reachGoal(ctx)
        return
      }
      if (this._mode !== 'rolling') return
      // Slå av vinden när bollen nästan stannat, så den kan vila inför nästa skott.
      if (this._windOn && spd < WIND_CUTOFF) {
        this._phys.setWind(0, 0)
        this._windOn = false
      }
      this._rollT += dt
      if (spd < REST_SPEED) {
        this._restT += dt
        if (this._restT >= REST_DWELL || this._rollT > MAX_ROLL) this._settle(ctx)
      } else {
        this._restT = 0
        if (this._rollT > MAX_ROLL) this._settle(ctx)
      }
      return
    }

    if (this._mode === 'aim') {
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say(randomFrom(IDLE_CUES))
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      }
    }
  },

  // Bleknande spår efter bollen (ritas om varje bildruta, max 46 punkter).
  _updateTrail(dt, spd) {
    const g = this._trail
    if (!g || g.destroyed) return
    const pts = this._trailPts
    if (spd > 1.2 && this._ball && !this._ball.destroyed) {
      const last = pts[pts.length - 1]
      if (!last || Math.hypot(this._ball.x - last.x, this._ball.y - last.y) > 20) {
        pts.push({ x: this._ball.x, y: this._ball.y, a: 0.42 })
        if (pts.length > 46) pts.shift()
      }
    }
    if (!pts.length) return
    for (const p of pts) p.a -= dt * 0.22
    while (pts.length && pts[0].a <= 0) pts.shift()
    g.clear()
    for (const p of pts) {
      if (p.a <= 0) continue
      g.circle(p.x, p.y, 13).fill({ color: 0x4f9a36, alpha: p.a * 0.55 })
    }
  },

  _inHome() {
    const r = this._home.r + (this._assisting ? 30 : 0) // hjälp-skott = ännu generösare
    return Math.hypot(this._ball.x - this._home.x, this._ball.y - this._home.y) < r
  },

  // Bollen stannade utan mål -> ALLTID roligt, aldrig straff. Snäll upptrappning:
  // ett par fria försök -> nästan-perfekt hjälp-skott -> garanterad hemrullning.
  _settle(ctx) {
    if (!this._alive || this._mode === 'resolving') return
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    this._phys.setWind(0, 0)
    this._windOn = false
    this._mode = 'aim'
    this._restT = 0
    this._rollT = 0
    this._misses++

    // Snällt men SENT: barnet får flera egna skott innan hjälpen. Aim-hjälp (nästan-
    // perfekt skott) vid 3 stopp, garanterad glid-hem som absolut sista utväg vid 4.
    if (this._misses >= 4) {
      this._glideHome(ctx)
      return
    }
    if (this._misses >= 3) {
      this._autoShot(ctx)
      return
    }

    // Normal miss: mjukt ljud + vingel på bollen + liten puff (lekfullt).
    ctx.services.audio.sfx('soft')
    if (this._ballFace && !this._ballFace.destroyed) wiggle(this._ballFace)
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5 })
    this._launcher.setEnabled(true)
    this._idle = 0
    if (Math.random() < 0.55) ctx.services.voice.say(randomFrom(MISS_CUES))
  },

  // Hjälp-skott (steg 1): sikta rakt mot målet med lagom kraft så utrullningen når hem.
  // Vinden hålls av (rak modell) så v0-uppskattningen stämmer; missar den ändå (hinder)
  // så tar steg 2 (glide) vid nästa stopp över — garanterat mål.
  _autoShot(ctx) {
    this._assisting = true
    this._idle = 0
    this._phys.setWind(0, 0)
    this._windOn = false
    ctx.services.voice.say('Nästan! Jag hjälper till lite.')
    const dx = this._home.x - this._ball.x
    const dy = this._home.y - this._ball.y
    const D = Math.hypot(dx, dy) || 1
    const fa = this._effFrictionAir
    // Utrullning ≈ v0 × (1 - fa) / fa. Lös v0 så bollen rullar ~1.15×D (lite överskott
    // in i målet); +30-radien fångar den oavsett.
    let v0 = (D * 1.15 * fa) / (1 - fa)
    v0 = clamp(v0, 10, 30)
    const vx = (dx / D) * v0
    const vy = (dy / D) * v0
    ctx.services.audio.sfx('whoosh')
    if (this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 6 })
    this._mode = 'rolling'
    this._rollT = 0
    this._restT = 0
    this._launcher.setEnabled(false)
    Body.setVelocity(this._ballBody, { x: vx, y: vy })
  },

  // Garanterad hemrullning (steg 2): bollen glider hela vägen hem som spöke (sensor),
  // rakt genom ev. hinder (exit-säker {}-proxy).
  _glideHome(ctx) {
    this._mode = 'gliding'
    this._assisting = true
    this._idle = 0
    this._launcher.setEnabled(false)
    this._phys.setWind(0, 0)
    this._windOn = false
    this._ballBody.isSensor = true // passera hinder rent under garanterad glidning
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('Jag rullar den hem åt dig!')
    const sx = this._ball.x
    const sy = this._ball.y
    const tx = this._home.x
    const ty = this._home.y
    const st = { p: 0 }
    gsap.killTweensOf(st)
    this._glideTween = gsap.to(st, {
      p: 1,
      duration: 1.0,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._alive || !this._ballBody) {
          this._glideTween?.kill()
          return
        }
        const x = sx + (tx - sx) * st.p
        const y = sy + (ty - sy) * st.p
        Body.setPosition(this._ballBody, { x, y })
        Body.setVelocity(this._ballBody, { x: 0, y: 0 })
        if (this._ballSkin && !this._ballSkin.destroyed) this._ballSkin.rotation += 0.16
      },
      onComplete: () => {
        if (this._alive) this._reachGoal(ctx)
      },
    })
  },

  // ---- Mål nått: firande + ny bana ----------------------------------------

  _reachGoal(ctx) {
    if (this._mode === 'resolving') return
    this._mode = 'resolving'
    this._glideTween?.kill()
    this._launcher.setEnabled(false)
    this._idle = 0
    this._restT = 0
    this._phys.setWind(0, 0)
    this._windOn = false
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })

    const hx = this._home.x
    const hy = this._home.y
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(WIN_CUES))

    // Bollen åker in i målet och krymper. Kroppen flyttas till målet (link följer);
    // skala tweenas på containern (link rör bara position/vinkel, inte skala).
    Body.setPosition(this._ballBody, { x: hx, y: hy })
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    if (this._ball && !this._ball.destroyed) {
      this._ball.position.set(hx, hy)
      gsap.killTweensOf(this._ball.scale)
      gsap.to(this._ball.scale, { x: 0.5, y: 0.5, duration: 0.4, ease: 'power2.in' })
    }

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    puff(ctx.fxLayer, hx, hy, { count: 14, color: C_GOAL })
    sparkle(ctx.fxLayer, hx, hy, { count: 8 })
    // Målvakten fångar bollen och hoppar av glädje — spelets EGEN slutbild.
    this._keeperCatch(ctx)

    // Förlopp: höj nivå, räkna hemrullningar, kör delat firande (stjärna + klistermärke).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    this._drawHoleRow(this._level)
    ctx.progress.complete()

    this._loadTimer = ctx.later(1.9, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // Målvakten kastar upp armarna, hoppar och jublar när bollen kommer hem.
  _keeperCatch(ctx) {
    const k = this._keeper
    if (!k || k.destroyed) return
    this._keeperIdle?.pause()
    const ky = k.y
    gsap.killTweensOf(k)
    gsap.to(k, {
      y: ky - 40, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 3,
      onComplete: () => {
        if (!k.destroyed) { k.y = ky; this._keeperIdle?.resume() }
      },
    })
    if (k._arms && !k._arms.destroyed) {
      gsap.killTweensOf(k._arms)
      gsap.to(k._arms, {
        rotation: 0.26, duration: 0.16, yoyo: true, repeat: 5, ease: 'sine.inOut',
        onComplete: () => { if (k._arms && !k._arms.destroyed) k._arms.rotation = 0 },
      })
    }
    ctx.services.audio.tone({ freq: 523.25, dur: 0.14, type: 'triangle', vol: 0.16 })
    ctx.services.audio.tone({ freq: 659.25, dur: 0.14, type: 'triangle', vol: 0.16, delay: 0.12 })
    ctx.services.audio.tone({ freq: 783.99, dur: 0.22, type: 'triangle', vol: 0.18, delay: 0.24 })
  },

  // Hål-raden upptill: en plupp per klarad bana (max 12) — konkret framsteg utan text.
  _drawHoleRow(level) {
    const g = this._holeRow
    if (!g || g.destroyed) return
    g.clear()
    const shown = Math.min(12, level + 3)
    const x0 = 640 - ((shown - 1) * 44) / 2
    for (let i = 0; i < shown; i++) {
      const done = i < level
      const x = x0 + i * 44
      g.circle(x, 64, 15).fill({ color: done ? C_GOAL : 0xffffff, alpha: done ? 0.95 : 0.35 })
        .stroke({ width: 3, color: done ? 0xd9a021 : 0xffffff, alpha: 0.8 })
      if (done) g.circle(x, 64, 6).fill(0xd9a021)
    }
  },

  // ---- Kollisioner: mål-sensor + hinder/studs-ljud ------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const involvesBall = pair.bodyA === this._ballBody || pair.bodyB === this._ballBody
      if (!involvesBall) continue
      const other = pair.bodyA === this._ballBody ? pair.bodyB : pair.bodyA
      if (other.label === 'home') {
        if (this._mode === 'rolling' || this._mode === 'gliding') this._reachGoal(ctx)
        return
      }
      if (other.label === 'bumper') {
        // Pinball-studs: knuffa bollen radiellt utåt med liten extra fart + pling.
        if (this._mode === 'rolling') {
          const ball = this._ballBody
          const dx = ball.position.x - other.position.x
          const dy = ball.position.y - other.position.y
          const d = Math.hypot(dx, dy) || 1
          const cur = Math.hypot(ball.velocity.x, ball.velocity.y)
          const boost = Math.min(cur * 1.1 + 1.5, 26)
          Body.setVelocity(ball, { x: (dx / d) * boost, y: (dy / d) * boost })
          this._restT = 0
        }
        if (this._t - this._lastBounce > BOUNCE_THROTTLE) {
          this._lastBounce = this._t
          ctx.services.audio.sfx('pling')
          if (this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5 })
        }
        continue
      }
      if (other.label === 'wall' || other.label === 'block') {
        if (this._t - this._lastBounce > BOUNCE_THROTTLE) {
          const spd = Math.hypot(this._ballBody.velocity.x, this._ballBody.velocity.y)
          if (spd > 2) {
            this._lastBounce = this._t
            ctx.services.audio.sfx('pop')
            if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 4 })
          }
        }
      }
    }
  },

  // ---- Extra kontroll: yta (Gräs → Is → Sand) -----------------------------

  _buildSurfaceUI(ctx) {
    this._surfaceBtn = new Button({
      icon: '🔄',
      label: 'Byt yta',
      width: 200,
      height: 108,
      color: COLORS.teal,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._cycleSurface(ctx),
    })
    this._surfaceBtn.position.set(168, 616)
    this._root.addChild(this._surfaceBtn)

    // Indikator ovanför knappen visar vald yta (emoji + namn) — uppdateras vid byte.
    this._surfaceLabel = new Text({
      text: '',
      style: { fontFamily: FONT.title, fontSize: 34, fontWeight: '800', fill: COLORS.ink, align: 'center' },
    })
    this._surfaceLabel.anchor.set(0.5)
    this._surfaceLabel.position.set(168, 534)
    this._surfaceLabel.eventMode = 'none'
    this._root.addChild(this._surfaceLabel)
  },

  _cycleSurface(ctx) {
    this._surfaceIdx = (this._surfaceIdx + 1) % SURFACES.length
    this._applyMaterials(ctx, { silent: false })
  },

  // ---- Tom-tap på planen: alltid en glad liten respons -------------------

  _bgTap(ctx, e) {
    if (!this._alive || this._mode === 'rolling' || this._mode === 'gliding' || this._mode === 'resolving') return
    const p = this._root.toLocal(e.global)
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, p.x, p.y, { count: 4 })
    this._idle = 0
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._loadTimer?.kill()
    this._glideTween?.kill()
    this._goalTween?.kill()
    this._hintTimer?.kill()
    this._windSway?.kill()

    this._clearObstacles()

    if (this._bg && !this._bg.destroyed) this._bg.off('pointertap', this._onBgTap)
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball)
      gsap.killTweensOf(this._ball.scale)
    }
    if (this._ballSkin && !this._ballSkin.destroyed) gsap.killTweensOf(this._ballSkin)
    if (this._ballFace && !this._ballFace.destroyed) {
      gsap.killTweensOf(this._ballFace)
      gsap.killTweensOf(this._ballFace.scale)
    }
    this._keeperIdle?.kill()
    if (this._keeper && !this._keeper.destroyed) {
      gsap.killTweensOf(this._keeper)
      gsap.killTweensOf(this._keeper.scale)
      if (this._keeper._arms) gsap.killTweensOf(this._keeper._arms)
    }
    this._trailPts = []
    if (this._homeGlow && !this._homeGlow.destroyed) gsap.killTweensOf(this._homeGlow.scale)
    if (this._iceOverlay && !this._iceOverlay.destroyed) gsap.killTweensOf(this._iceOverlay)
    if (this._sandOverlay && !this._sandOverlay.destroyed) gsap.killTweensOf(this._sandOverlay)
    if (this._windFlag && !this._windFlag.destroyed) gsap.killTweensOf(this._windFlag)
    if (this._surfaceBtn && !this._surfaceBtn.destroyed) gsap.killTweensOf(this._surfaceBtn.scale)

    this._launcher?.destroy()
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
