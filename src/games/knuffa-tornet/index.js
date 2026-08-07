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
import { puff, floatText, sparkle, burst, bounceIn, bigCelebration, pop, shake } from '../../lib/feedback.js'
import { makeBobo } from '../../lib/figurer.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'

const { Constraint, Composite, Body } = Matter

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// --- Geometri (designkoordinater 1280×720) ---
const PIVOT_Y = 80 // repets upphängningshöjd (krankärrans krok)
const PIVOT_X0 = 800 // kärrans startläge (rakt ovanför tornet)
const PIVOT_MIN_X = 600 // kärrans vänstra gräns på skenan
// Kärrans högra gräns var 1000. En tung stenkloss som knuffats till x≈1050 stod då
// UTOM RÄCKHÅLL för varje kranläge (kulans lägsta punkt ligger rakt under kroken) och
// banan gick bara att avsluta via no-fail-garantin. 1100 täcker hela avsatsen som en
// kloss realistiskt hamnar på.
const PIVOT_MAX_X = 1100
// Repets vilolängd. 330 satte kulans underkant på y=456 — 24 px OVANFÖR understa
// klossraden (424–480), så ett fullt sving nöp bara toppen av tornet och resten sköts
// åt sidan. 348 låter kulan svepa genom bottenraden utan att skrapa i avsatsen (474 mot
// avsatsens 480).
const CHAIN_LEN = 348
const BALL_R = 46 // baskula-radie (skalas av tyngd-knappen)
const THETA_REST = 0.85 // vilo-spänning (~49°), standardläge
const THETA_MIN = -0.3 // får dras en aning åt höger också
const THETA_MAX = 1.5 // största spänning (~86°, nära vågrätt)
const STRETCH_MAX = 1.5 // elastiskt rep: hur långt kulan kan dras (× CHAIN_LEN) = töjning

const FLOOR_Y = 720
const LEDGE_Y = 480 // avsatsens översida (klossarna står här)
// Avsatsens högerkant var 1180, alltså 330 px startbana från tornet till kanten. Sonden
// visade vad det gav: kulan sköt hela tornet 80 px åt sidan per sving utan att något
// ramlade av, tre svingar i rad. 1090 gör kanten till en verklig kant.
const PED = { x1: 640, x2: 1090 }
// Arbetar-Bobo på marken. Måste vara klar av BÅDE Tyngd-knappen (centrum 150,624) och
// kranmasten (x≈515) — x=150 lade honom helt bakom knappen, vilket bara syntes i
// skärmdumpen. x=330 ligger mitt emellan dem.
const WORKER_X = 330
const WORKER_R = 46
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

// Små "hoppsan"-emoji som pipar upp när en kloss ramlar (ger klossarna karaktär).
const PIPS = ['😮', '😆', '😲', '🙃', '😵']

const INVITE_WAIT = 7 // s som den inbjudande hjälpen väntar innan spelet svingar själv

// --- Tornformer -----------------------------------------------------------
// Avsatsen bär x 640–1180, så varje kloss måste hamna inom ~710–1130 för att inte
// ramla av direkt vid start. dx = kolumnläge i COL-enheter från tornets mitt.
const COL = 108 // kolumnavstånd (BLOCK_W + luft: inga överlapp vid spawn)
const TOWER_X = 850
const MAX_ROWS = 4 // högre torn än så når kulan inte toppen på ett rimligt sving
const SHAPES = [
  { id: 'torn', cols: [{ dx: 0, h: 3 }] },
  { id: 'trappa', cols: [{ dx: -1, h: 1 }, { dx: 0, h: 2 }, { dx: 1, h: 3 }] },
  // Port: två pelare med en bro över. Bron vilar 24 px på varje pelare (båda ändarna
  // stöttade -> den kan inte tippa), och gapet under läser som en öppning.
  { id: 'port', cols: [{ dx: -0.7, h: 2 }, { dx: 0.7, h: 2 }], lintel: true },
  { id: 'pyramid', cols: [{ dx: -1, h: 2 }, { dx: 0, h: 3 }, { dx: 1, h: 2 }] },
  { id: 'dubbel', cols: [{ dx: -1.2, h: 3 }, { dx: 1.2, h: 3 }] },
]

// Specialklossar gör VALET av tyngd och rep till ett pussel i stället för smak:
//   sten  tung sockel — en liten kula studsar bara av, en stor välter den
//   studs gummi — flyger långt, särskilt med elastiskt rep
//   glas  spricker i gnistror vid en hård träff (räknas som nedknuffad)
// Friktionen var 0,7/1,4 på ALLA klossar — så hög att stapeln betedde sig som ett enda
// limmat block och sköts åt sidan i stället för att rasa. Låg friktion mellan klossar gör
// att de skvätter isär av ett slag; stenen behåller sitt grepp och är fortfarande ankaret.
const KINDS = {
  normal: { dens: 1, rest: 0.06, fric: 0.4, fricS: 0.7 },
  // Stenen var 3,4× massa med frictionStatic 1,4. Mätt: den kröp 20 px per fullträff
  // även med stora kulan och behövde sju svingar för att nå kanten. 2,2× är fortfarande
  // tydligt tyngst men går att skjuta iväg — vilket är hela poängen med tyngdknappen.
  sten: { dens: 2.2, rest: 0.02, fric: 0.8, fricS: 0.9 },
  studs: { dens: 0.7, rest: 0.72, fric: 0.3, fricS: 0.5 },
  glas: { dens: 0.6, rest: 0.05, fric: 0.35, fricS: 0.6 },
}
// Slagfart som spräcker en glaskloss. Var 9 — men världens uppmätta toppfart ÄR 9, så
// tröskeln nåddes aldrig och glaset ramlade bara av som vilken kloss som helst.
const GLAS_SPEED = 6

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
    this._blocks = [] // { body, view, cleared, isCrown, kind }
    this._shatter = [] // glasklossar som ska spricka i nästa tick
    this._invited = false // hjälpen har ställt kulan i läge och väntar på barnet
    this._inviteT = 0
    this._finishCalls = [] // fördröjda steg i finishen (måste dö med spelet)
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
    // pointerDOWN, inte pointertap: tap fyrar först vid släpp, så ett barn som trycker
    // och håller kvar fingret fick sin puff först en kvarts sekund senare (P0 kräver
    // <100 ms). Harnessen mätte upp exakt det: 262 ms på ett tryck i gräset.
    this._onFieldTap = (e) => this._fieldTap(ctx, e)
    this._catcher.on('pointerdown', this._onFieldTap)
    this._root.addChild(this._catcher)

    // Avsats (pedestal): statisk kropp som klossarna står på; ritas som sten.
    this._buildPedestal(ctx)

    // Arbetar-Bobo på marken till vänster — anledningen att riva (gate-punkt 4).
    this._buildWorker()

    // Fysik: gravitation + golv/väggar.
    this._phys = new PhysicsWorld({ gravityY: 1.2, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))
    this._pedBody = this._phys.rectangle(
      (PED.x1 + PED.x2) / 2,
      (LEDGE_Y + FLOOR_Y) / 2,
      PED.x2 - PED.x1,
      FLOOR_Y - LEDGE_Y,
      { isStatic: true, friction: 0.6, frictionStatic: 0.9, restitution: 0.05, label: 'pedestal' },
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

  // Arbetar-Bobo med hjälm på marken till vänster (gate-punkt 4: en anledning att riva).
  // Avsatsen börjar på x=640 och klossarna ramlar ner strax vänster om den, så x≈150 är
  // fri yta. Han hejar vid varje nedknuffad kloss och jublar vid vinst.
  _buildWorker() {
    const w = new Container()
    w.eventMode = 'none'
    w.interactiveChildren = false
    w.position.set(WORKER_X, FLOOR_Y - 24 - 2.36 * WORKER_R)

    const bobo = makeBobo(WORKER_R)
    w.addChild(bobo)

    // Bygghjälm ovanpå huvudet (makeBobo har origo i huvudets centrum).
    const helmet = new Graphics()
    helmet.arc(0, -WORKER_R * 0.16, WORKER_R * 1.02, Math.PI, 0).fill(COLORS.yellow)
    helmet.roundRect(-WORKER_R * 1.2, -WORKER_R * 0.24, WORKER_R * 2.4, WORKER_R * 0.24, WORKER_R * 0.12)
      .fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orangeDark })
    helmet.roundRect(-WORKER_R * 0.1, -WORKER_R * 1.2, WORKER_R * 0.2, WORKER_R * 1.0, 4)
      .fill({ color: 0xffffff, alpha: 0.35 })
    w.addChild(helmet)

    this._worker = w
    this._root.addChild(w)
    this._workerIdle = gsap.to(w.scale, {
      x: 1.03, y: 1.03, duration: 2.0, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
  },

  // Arbetaren hejar (liten gest) respektive jublar (stor) — egen reaktion utöver konfettin.
  _workerCheer(ctx, big = false) {
    const w = this._worker
    if (!w || w.destroyed) return
    gsap.killTweensOf(w.scale)
    gsap
      .timeline()
      .to(w.scale, { x: big ? 1.2 : 1.09, y: big ? 1.28 : 1.14, duration: 0.12, ease: 'power2.out' })
      .to(w.scale, { x: 1, y: 1, duration: big ? 0.66 : 0.5, ease: 'elastic.out(1, 0.42)' })
    sparkle(ctx.fxLayer, w.x, w.y - WORKER_R * 1.6, { count: big ? 10 : 5 })
  },

  _buildPedestal(ctx) {
    const g = new Graphics()
    g.roundRect(PED.x1, LEDGE_Y, PED.x2 - PED.x1, FLOOR_Y - LEDGE_Y + 30, 22).fill(COLORS.brown)
    g.roundRect(PED.x1, LEDGE_Y, PED.x2 - PED.x1, 16, 22).fill({ color: 0xffffff, alpha: 0.18 })
    g.roundRect(PED.x1 + 12, LEDGE_Y + 30, PED.x2 - PED.x1 - 24, 10, 6).fill({ color: 0x000000, alpha: 0.12 })
    // Stenblock i avsatsen (den var en helt tom brun platta som täckte en fjärdedel av skärmen).
    for (let r = 0; r < 4; r++) {
      const yy = LEDGE_Y + 56 + r * 46
      for (let cx = PED.x1 + 18 + (r % 2 ? 46 : 0); cx < PED.x2 - 40; cx += 92) {
        g.roundRect(cx, yy, 78, 34, 8).fill({ color: 0x9a6a45, alpha: 0.45 })
        g.roundRect(cx, yy, 78, 8, 6).fill({ color: 0xb98a5f, alpha: 0.5 })
      }
    }
    // gräs som växer över avsatsens kant
    for (let x = PED.x1 + 10; x < PED.x2 - 10; x += 22) {
      g.moveTo(x, LEDGE_Y + 2).quadraticCurveTo(x + 4, LEDGE_Y - 8, x + (x % 7) - 3, LEDGE_Y - 15)
        .stroke({ width: 3, color: 0x5bbf6a, alpha: 0.8 })
    }
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  // Fast kran: mast + horisontell skena. Kärran (kroken) är separat & dragbar.
  _buildCrane(ctx) {
    const beamY = 22
    const x1 = PIVOT_MIN_X - 70
    const x2 = PIVOT_MAX_X + 70
    const g = new Graphics()
    // Vänster mast ner mot marken. Höjden var hårdkodad till 470 och slutade på y≈492 —
    // mitt i luften, till vänster om avsatsen (PED.x1 = 640), så kranen såg ut att sväva.
    const mastX = x1 - 26
    const mastBottom = FLOOR_Y - 24 // marklinjen som arbetar-Bobo står på
    g.roundRect(mastX, beamY, 26, mastBottom - beamY, 8).fill(COLORS.inkSoft)
    // fotplatta, så masten läser som förankrad och inte avklippt
    g.roundRect(mastX - 15, mastBottom - 16, 56, 22, 8).fill(COLORS.ink)
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
    // Placering, tredje försöket: y=height−40 låg BAKOM sockeln, toppmitten (640,64) låg
    // under krankärran som åker på skenan mellan x=600 och 1000. Den enda ytan som är fri
    // från hemknapp (x≤116), skena (x≥530) och kärra är luckan uppe till vänster.
    this._meter.position.set(310, 64)
    this._meter.eventMode = 'none'
    this._pips = []
    this._meterBg = new Graphics()
    this._meterBg.eventMode = 'none'
    this._meter.addChild(this._meterBg)
    this._root.addChild(this._meter)
  },

  // EN PRICK PER KLOSS som ska ner, sista pricken är kronan. En abstrakt stapel säger
  // ingenting till en 2-åring; en rad klossar som tänds en efter en är själva målet,
  // synligt. Varje kloss äger sin prick, så räkningen är ärlig oavsett fallordning.
  _rebuildMeter() {
    const m = this._meter
    if (!m || m.destroyed) return
    for (const p of this._pips) {
      gsap.killTweensOf(p.scale)
      if (!p.destroyed) p.destroy()
    }
    this._pips = []
    const n = this._total
    if (!n) return
    // Raden måste rymmas i luckan (max 330 px) mellan hemknappen (slutar x=116) och
    // kranmasten (börjar x=504). Ett högt torn ger upp till 13 klossar — pressade in på
    // en rad blev prickarna 18 px risgryn, och då är "en prick per kloss" ingen mätare
    // längre. Över åtta klossar bryts raden i två i stället för att krympa vidare.
    const rader = n > 8 ? 2 : 1
    const perRad = Math.ceil(n / rader)
    const gap = perRad > 6 ? 8 : 10
    const w = clamp(Math.floor((330 - (perRad - 1) * gap) / perRad), 26, 44)
    this._pipW = rader > 1 ? w * 0.78 : w
    const total = perRad * w + (perRad - 1) * gap
    const radH = rader > 1 ? 26 : 0
    if (this._meterBg && !this._meterBg.destroyed) {
      const h = rader > 1 ? 62 : 50
      this._meterBg.clear()
        .roundRect(-total / 2 - 14, -h / 2, total + 28, h, Math.min(25, h / 2))
        .fill({ color: 0xfffdf7, alpha: 0.72 })
        .stroke({ width: 3, color: 0x000000, alpha: 0.07 })
    }
    for (let i = 0; i < n; i++) {
      const rad = Math.floor(i / perRad)
      const iRad = i % perRad
      const iRaden = Math.min(perRad, n - rad * perRad) // sista raden kan vara kortare
      const bredd = iRaden * w + (iRaden - 1) * gap
      const g = new Graphics()
      g.position.set(-bredd / 2 + w / 2 + iRad * (w + gap), rader > 1 ? -radH / 2 + rad * radH : 0)
      g.eventMode = 'none'
      m.addChild(g)
      this._pips.push(g)
      this._paintPip(i, false)
    }
  },

  _paintPip(i, lit) {
    const g = this._pips?.[i]
    if (!g || g.destroyed) return
    const isCrown = i === this._total - 1
    const s = (this._pipW || 44) / 44
    g.clear()
    if (isCrown) {
      // Ritad krona (P0 ASSETS) — guld när den ligger nere, blek kontur innan.
      g.moveTo(-17 * s, 9 * s).lineTo(-17 * s, -7 * s).lineTo(-8 * s, 1 * s).lineTo(0, -12 * s)
        .lineTo(8 * s, 1 * s).lineTo(17 * s, -7 * s).lineTo(17 * s, 9 * s)
        .closePath()
        .fill(lit ? 0xffd24a : { color: 0xfffdf7, alpha: 0.75 })
        .stroke({ width: 3, color: lit ? 0xd9a021 : 0x000000, alpha: lit ? 1 : 0.25 })
      if (lit) g.circle(0, -12 * s, 3.2 * s).fill(0xff6b6b)
    } else {
      g.roundRect(-21 * s, -14 * s, 42 * s, 28 * s, 8 * s)
        .fill(lit ? COLORS.green : { color: 0xfffdf7, alpha: 0.75 })
        .stroke({ width: 3, color: lit ? 0x2f9a4d : 0x000000, alpha: lit ? 1 : 0.25 })
    }
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
    this._sizeTag = this._makeTag(150, 546, SIZES[this._sizeIdx].label, COLORS.ink)
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
    this._ropeTag = this._makeTag(1120, 546, this._rope.label, this._rope.color)
  },

  _makeTag(x, y, text, color) {
    // Ljus pill bakom etiketten: den låg tidigare mot avsatsens bruna sten och var
    // i praktiken oläsbar.
    const pill = new Graphics()
      .roundRect(-70, -20, 140, 40, 20)
      .fill({ color: 0xfffdf7, alpha: 0.9 })
      .stroke({ width: 3, color: 0x000000, alpha: 0.08 })
    pill.position.set(x, y)
    pill.eventMode = 'none'
    this._root.addChild(pill)
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

  // Banans form OCH innehåll per nivå. Formen roterar (torn → trappa → port → pyramid
  // → dubbel) och växer på höjden först när alla former visats en gång, så tur 2 aldrig
  // ser ut som tur 1. Specialklossarna sätts DETERMINISTISKT: banan ska vara en design,
  // inte ett tärningskast.
  _layoutFor(level) {
    const shape = SHAPES[level % SHAPES.length]
    const grow = clamp(Math.floor(level / SHAPES.length), 0, 2)
    const sturdy = clamp(1 + level * 0.1, 1, 1.6)
    const cells = []
    let topRow = 0
    for (const c of shape.cols) {
      const h = clamp(c.h + grow, 1, MAX_ROWS)
      for (let i = 0; i < h; i++) cells.push({ x: TOWER_X + c.dx * COL, row: i, kind: 'normal' })
      if (h > topRow) topRow = h
    }
    if (shape.lintel) cells.push({ x: TOWER_X, row: topRow, kind: 'normal' })

    const byRow = [...cells].sort((a, b) => a.row - b.row)
    // Stensockeln hör hemma i ett BRETT torn. I en ensam kolumn blev den i stället en
    // propp: de lätta klossarna ovanpå försvann på ett sving, och sedan stod en tung
    // kloss ensam kvar och kröp några pixlar per sving (mätt: 8 svingar utan avslut).
    if (level >= 2 && shape.cols.length > 1) byRow[0].kind = 'sten'
    // Glaset LÅGT och gummit HÖGT, inte tvärtom: kulan sveper genom de två understa
    // raderna, så en glaskloss i toppen träffades i praktiken aldrig — den ramlade bara
    // av som vilken kloss som helst och krossögonblicket uteblev.
    if (level >= 3) {
      const lagt = byRow.find((c) => c.row <= 1 && c.kind === 'normal')
      if (lagt) lagt.kind = 'glas'
    }
    if (level >= 4) {
      const top = byRow[byRow.length - 1]
      if (top.kind === 'normal') top.kind = 'studs'
    }

    // Kronan står överst på den högsta kolumnen (eller på bron).
    const highest = cells.reduce((a, b) => (b.row > a.row ? b : a), cells[0])
    return { cells, sturdy, crownX: highest.x, crownRow: highest.row + 1, shape: shape.id }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._clearTower()
    this._hideInvite()
    this._clearFinishCalls()
    this._removeFlag()
    this._shatter = []
    // Kulan och repet tonades bort i finishen — de hör till nästa torn igen.
    for (const o of [this._ballView, this._chain]) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        o.alpha = 1
      }
    }

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
    this._rebuildMeter()

    this._setControlsEnabled(true)
    if (!this._ballView.destroyed) pop(this._ballView)
  },

  _buildTower(ctx, level) {
    const { cells, sturdy, crownX, crownRow } = this._layoutFor(level)
    cells.forEach((cell, n) => {
      const y = LEDGE_Y - BLOCK_H / 2 - cell.row * BLOCK_H
      const k = KINDS[cell.kind]
      const color = BLOCK_COLORS[(cell.row + n) % BLOCK_COLORS.length]
      const view = makeBlock(BLOCK_W, BLOCK_H, color, cell.kind)
      view.position.set(cell.x, y)
      this._blockLayer.addChild(view)
      const body = this._phys.rectangle(cell.x, y, BLOCK_W, BLOCK_H, {
        density: 0.0016 * sturdy * k.dens,
        restitution: k.rest,
        friction: k.fric,
        frictionStatic: k.fricS,
        label: 'block',
      })
      this._phys.link(body, view)
      this._blocks.push({ body, view, cleared: false, isCrown: false, nervous: false, kind: cell.kind })
      bounceIn(view, { delay: cell.row * 0.04 })
    })

    // Kronan står överst på den högsta kolumnen (eller på broen i port-formen).
    const crownY = LEDGE_Y - BLOCK_H / 2 - crownRow * BLOCK_H + BLOCK_H / 2 - 22
    const cview = makeCrown()
    cview.position.set(crownX, crownY)
    this._blockLayer.addChild(cview)
    const cbody = this._phys.rectangle(crownX, crownY, 64, 40, {
      density: 0.0012,
      restitution: 0.1,
      friction: 0.4,
      frictionStatic: 0.7,
      label: 'block',
    })
    this._phys.link(cbody, cview)
    this._blocks.push({ body: cbody, view: cview, cleared: false, isCrown: true, nervous: false, kind: 'krona' })
    bounceIn(cview, { delay: crownRow * 0.04 })

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
    // Aldrig NER I avsatsen: ett elastiskt rep kan töjas rakt ner (theta≈0) och la då
    // den frusna kulan inuti stenblocket — vid släppet sköt matter ut den som en kork.
    if (x > PED.x1 - 40 && x < PED.x2 + 40) y = Math.min(y, LEDGE_Y - BALL_R * this._ballFactor - 6)
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
    this._hideInvite() // barnet tog över — inbjudan har gjort sitt
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
    this._step(ctx, dt)
    // ALLTID sist i bildrutan: _step kan teleportera kulan (_freezeBall efter ett sving),
    // och ritades repet före det hamnade det kvar vid förra positionen. Det syntes bara
    // som en bildrutas glitch i spelet — men skärmdumpen frös just den bildrutan, med
    // repet hängande i tomma luften bredvid kulan.
    this._drawChain()
  },

  _step(ctx, dt) {
    if (this._shatter?.length) this._doShatter(ctx)
    this._sweepCleared()

    if (this._phase === 'swing' || this._phase === 'assist') {
      this._checkClears(ctx)
      if (this._won) return
      this._spookBlocks()
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
        this._inviteT = 0
        return
      }
      if (this._invited) {
        // Inbjudan har sin egen klocka (och tystar den vanliga recuen). Rör barnet
        // inte kulan i tid svingar spelet ändå — garantin är kvar, men den kommer sist.
        this._idle = 0
        this._inviteT += dt
        if (this._inviteT > INVITE_WAIT) {
          this._hideInvite()
          this._autoAssistSwing(ctx)
        }
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

  // Målet är "av avsatsen" — så mät DET, inte bara fallhöjden. Springan mellan avsatsens
  // högerkant (1180) och skärmkanten (1280) är exakt en kloss bred: en kloss som halkade
  // ner där kilade fast på y≈491, långt ovanför fall-tröskeln, och räknades aldrig som
  // nere. Sonden fastnade på 3/5 i åtta svingar innan no-fail-garantin hann rädda banan.
  _checkClears(ctx) {
    for (const b of this._blocks) {
      if (b.cleared) continue
      const p = b.body.position
      if (p.y > LEDGE_Y + CLEAR_MARGIN || p.x < PED.x1 - 20 || p.x > PED.x2 + 20) this._onClear(ctx, b)
    }
  },

  // En nedknuffad kloss får flyga och landa, sedan tas den ur fysiken och tonar bort.
  // Utan det glider den vidare tvärs över golvet och blir liggande OVANPÅ "Byt rep"-
  // knappen — skräp fastnat i UI:t, tydligt på skärmdumpen. TAK på två per bildruta:
  // en mass-rivning ska inte bli en tween-storm i samma ruta som firandet.
  _sweepCleared() {
    let n = 0
    for (const b of this._blocks) {
      if (b.swept || !b.clearAt || this._t < b.clearAt) continue
      b.swept = true
      this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) gsap.to(b.view, { alpha: 0, duration: 0.3 })
      if (++n >= 2) return
    }
  },

  _onClear(ctx, b) {
    if (b.cleared) return
    b.cleared = true
    this._cleared++
    // Strypningen avgör de EXTRA effekterna, inte bara ljudet. När garantin knuffar ner
    // tio klossar i samma bildruta blev det annars tio hejarop och tio gnistskurar på en
    // gång — 132 nya tweens på en halv sekund (loggen: tween-per-ruta) och en arbetare
    // som ryckte. Prick och squash är per kloss; jubel och gnistor är per HÄNDELSE.
    const pinged = this._t - this._lastHit > HIT_THROTTLE
    if (pinged) {
      this._lastHit = this._t
      ctx.services.audio.sfx('plopp')
      this._workerCheer(ctx)
    }
    // Klossens EGEN prick tänds (inte "de N första"), så räkningen stämmer även när
    // kronan ramlar först.
    const pi = this._blocks.indexOf(b)
    if (pi >= 0) {
      this._paintPip(pi, true)
      // Pricken tänds ALLTID; puffen bara när händelsen inte är strypt. Vid en mass-
      // rivning tänds tio prickar i samma bildruta, och tio pop-timelines där är ren
      // tween-svall som ingen hinner se.
      const pip = this._pips?.[pi]
      if (pinged && pip && !pip.destroyed) pop(pip)
    }
    // Snabb squash när klossen ramlar (skala — fysik-länken rör inte scale).
    const v = b.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v.scale)
      gsap.to(v.scale, { x: 1.34, y: 0.66, duration: 0.1, yoyo: true, repeat: 1, ease: 'sine.out' })
    }
    // Klossen får flyga och landa — men sedan lämnar den scenen (se _sweepCleared).
    b.clearAt = this._t + 0.8
    if (b.isCrown && !this._crownDown) {
      this._crownDown = true
      ctx.services.audio.sfx('magi')
      ctx.services.voice.say('Kronan ramlar!')
      sparkle(ctx.fxLayer, b.view?.x ?? this._pivot.x, b.view?.y ?? this._pivot.y, { count: 10 })
    } else if (pinged) {
      sparkle(ctx.fxLayer, b.view?.x ?? 0, b.view?.y ?? 0, { count: 4 })
      // Liten "hoppsan"-pip ger klossen karaktär (samma strypning som plopp = ingen spam).
      if (v && !v.destroyed) {
        floatText(ctx.fxLayer, v.x, v.y - 24, PIPS[(Math.random() * PIPS.length) | 0], { fontSize: 32, rise: 62, duration: 0.7 })
      }
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
      this._offerAssist(ctx)
    } else {
      this._hintTool(ctx)
    }
  },

  // Står bara stenklossar kvar och kulan är liten? Peka på verktyget i stället för att
  // ta över — det är hela poängen med tyngdknappen.
  _hintTool(ctx) {
    if (this._sizeIdx >= 2) return
    const kvar = this._blocks.filter((b) => !b.cleared && !b.isCrown)
    if (!kvar.length || !kvar.every((b) => b.kind === 'sten')) return
    ctx.services.voice.say('Prova den stora kulan!')
    if (this._sizeBtn && !this._sizeBtn.destroyed) pop(this._sizeBtn)
  },

  // Hjälp steg 1: BJUD IN i stället för att spela klart. Spelet ställer kulan i perfekt
  // läge (styvt rep, stor kula, kran mitt, full spänning) och låter den blinka — men
  // barnet gör sista handgreppet självt. Först om ingen rör den på INVITE_WAIT sekunder
  // svingar spelet (_autoAssistSwing). Så förblir vinsten barnets.
  // Hjälpen ska SIKTA, inte bara ställa sig i mitten. Kulans lägsta punkt ligger rakt
  // under kroken, så kranen måste stå vid den kloss som står kvar längst bort — annars
  // svingar hjälpen i tomma luften när en tung kloss knuffats åt sidan.
  // Sikta på den NÄRMASTE kloss som står kvar — aldrig på den som står längst bort.
  // Mätt: en hjälp som siktade på den bortersta klossen flyttade kranen till andra änden
  // av skenan och LÄMNADE den där, så varje följande sving svepte förbi resten av tornet.
  // Nivå 1 gick från 4 till 8 svingar och nivå 3–4 blev inte klara alls på tio.
  _assistPivotX() {
    const kvar = this._blocks.filter((b) => !b.cleared)
    if (!kvar.length) return PIVOT_X0
    const narmast = kvar.reduce((a, b) =>
      Math.abs(b.body.position.x - this._pivot.x) < Math.abs(a.body.position.x - this._pivot.x) ? b : a)
    return clamp(narmast.body.position.x - 30, PIVOT_MIN_X, PIVOT_MAX_X)
  },

  _offerAssist(ctx) {
    if (!this._alive || this._won || this._invited) return
    this._setRope(0) // styvt = säker pendel
    this._setSize(2) // stor & tung
    this._sizeIdx = 2
    this._refreshSizeTag()
    this._setPivotX(this._assistPivotX())
    this._freezeBall(THETA_MAX)
    this._invited = true
    this._inviteT = 0
    ctx.services.voice.say('Kulan är redo! Släpp den!')
    ctx.services.audio.sfx('pling')

    this._hideInvite()
    const ring = new Graphics().circle(0, 0, 76).stroke({ width: 9, color: COLORS.yellow, alpha: 0.95 })
    ring.eventMode = 'none'
    ring.position.set(this._ballView.x, this._ballView.y)
    this._inviteRing = ring
    this._root.addChild(ring)
    this._inviteTw = gsap.to(ring.scale, { x: 1.22, y: 1.22, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _hideInvite() {
    this._invited = false
    this._inviteTw?.kill()
    this._inviteTw = null
    if (this._inviteRing) {
      gsap.killTweensOf(this._inviteRing.scale)
      if (!this._inviteRing.destroyed) this._inviteRing.destroy()
      this._inviteRing = null
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
    this._setPivotX(this._assistPivotX())
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
    }
    // EN gemensam skur, inte en per kloss: tio klossar × fem gnistor blev femtio tweens
    // i samma bildruta (loggen: tween-per-ruta) — och läste ändå som ett enda ögonblick.
    burst(ctx.fxLayer, TOWER_X, LEDGE_Y - 70, { count: 12 })
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

  // Spel-specifik finish (gate-punkt 7): rivningen är KLAR. Dammoln rullar längs den
  // tomma avsatsen där muren stod, en flagga reser sig på rivningsplatsen till en stämd
  // durtreklang, och först därefter kommer jublet. Ingen anonym konfetti först.
  _demolitionFinish(ctx) {
    const later = (t, fn) => {
      const c = gsap.delayedCall(t, () => {
        if (this._alive) fn()
      })
      this._finishCalls.push(c)
      return c
    }

    // 1. Dammoln rullar vänster → höger längs avsatskanten (muren har rasat). Stegen
    //    ligger glest: allt på en gång blev 132 nya tweens i samma halvsekund, vilket
    //    loggen (med rätta) läser som en tween-storm.
    for (let i = 0; i < 6; i++) {
      const x = PED.x1 + 60 + i * ((PED.x2 - PED.x1 - 120) / 5)
      later(i * 0.12, () => puff(ctx.fxLayer, x, LEDGE_Y - 8, { count: 4 }))
    }

    // 2. Flaggan reser sig på tomten — till en durtreklang (C–E–G), inte ett UI-blipp.
    later(0.35, () => {
      this._raiseFlag()
      const chord = [523.25, 659.25, 783.99]
      chord.forEach((freq, i) => later(i * 0.13, () => ctx.services.audio.tone({ freq, dur: 0.42, type: 'sine', vol: 0.24 })))
    })

    // 3. Arbetaren jublar vid sin färdiga rivningsplats, sedan flyger jublet upp.
    later(0.65, () => {
      this._workerCheer(ctx, true)
      burst(ctx.fxLayer, TOWER_X, LEDGE_Y - 90, { count: 10 })
    })
    later(1.05, () => {
      ctx.services.audio.sfx('celebrate')
      bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    })
  },

  // Ritad flagga (stång + vimpel) som hissas på den rentrivna avsatsen.
  _raiseFlag() {
    this._removeFlag()
    const f = new Container()
    // Stången är HÖG med sig: en kort flagga hamnade bakom rivningskulan, som efter
    // vinsten dinglar kvar på ungefär samma höjd (kulans överkant ligger på y≈367).
    // Vimpeln sitter i toppen, ovanför kulans svepbana.
    const pole = new Graphics().roundRect(-4, -178, 8, 182, 4).fill(COLORS.inkSoft)
    const cloth = new Graphics()
    cloth.moveTo(4, -174).lineTo(78, -153).lineTo(4, -132).closePath()
      .fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark, alpha: 0.8 })
    cloth.circle(28, -153, 7).fill({ color: 0xfffdf7, alpha: 0.9 })
    const foot = new Graphics().ellipse(0, -2, 22, 8).fill({ color: 0x000000, alpha: 0.16 })
    f.addChild(foot, pole, cloth)
    f.position.set(TOWER_X, LEDGE_Y)
    f.eventMode = 'none'
    f.interactiveChildren = false
    f.scale.set(1, 0)
    this._flag = f
    this._root.addChild(f)
    gsap.to(f.scale, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' })
    this._flagTw = gsap.to(cloth.scale, { x: 0.88, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.5 })
  },

  _removeFlag() {
    this._flagTw?.kill()
    this._flagTw = null
    if (this._flag) {
      gsap.killTweensOf(this._flag.scale)
      if (!this._flag.destroyed) this._flag.destroy({ children: true })
      this._flag = null
    }
  },

  _clearFinishCalls() {
    for (const c of this._finishCalls) c?.kill()
    this._finishCalls = []
  },

  _win(ctx) {
    if (this._won) return
    this._won = true
    this._phase = 'resolving'
    this._aiming = false
    this._detachBall()
    this._hideHint()
    this._hideInvite()
    this._setControlsEnabled(false)
    this._assistCall?.kill()

    ctx.services.audio.sfx('correct')
    ctx.services.voice.say('Hurra! Du knuffade ner alla klossar!')
    // Kulan har gjort sitt. Den lämnas annars hängande där sista svinget stannade den —
    // ofta rakt över tomten, alltså framför flaggan som är hela finishens signaturbild.
    // Repet tonar med, annars pekar det ut i tomma luften.
    for (const o of [this._ballView, this._chain]) {
      if (o && !o.destroyed) gsap.to(o, { alpha: 0, duration: 0.3 })
    }
    this._demolitionFinish(ctx)

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

  // ---- Krock: en SNÄLL smäll (mjuk träduns + mikroskak) + rolig puff -------

  _onCollision(ctx, e) {
    if (!this._alive) return
    let hitSpeed = 0
    for (const pair of e.pairs) {
      const la = pair.bodyA.label
      const lb = pair.bodyB.label
      if (la !== 'ball' && lb !== 'ball') continue
      const other = la === 'ball' ? pair.bodyB : pair.bodyA
      if (other.label !== 'block') continue
      const sp = pair.bodyA.speed + pair.bodyB.speed
      if (sp > hitSpeed) hitSpeed = sp
      // Glaskloss + hård träff = den spricker. Kroppen tas INTE bort här (mitt i matter:s
      // eget kollisionsevent) utan köas till nästa tick.
      if (sp > GLAS_SPEED) {
        const rec = this._blocks.find((x) => x.body === other)
        if (rec && rec.kind === 'glas' && !rec.cleared && !rec.shattering) {
          rec.shattering = true
          this._shatter.push(rec)
        }
      }
    }
    // En rivningskula som krossar ett torn SKA få sitt "duns" — men snällt: en mjuk,
    // rundad träklots-ton (ingen buzzer) vars kraft växer med slagfarten. Behåll
    // strypningen så det aldrig distar/loopar.
    if (this._t - this._lastPuff <= 0.12) return
    if (hitSpeed > 3 && this._ballView && !this._ballView.destroyed) {
      this._lastPuff = this._t
      puff(ctx.fxLayer, this._ballView.x, this._ballView.y, { count: 5 })
      // Snäll smäll: mjuk, rundad träduns; volym ∝ slagkraft.
      const strength = clamp((hitSpeed - 3) / 16, 0, 1)
      ctx.services.audio.tone({ freq: 150, slideTo: 78, dur: 0.14, type: 'sine', vol: 0.16 + strength * 0.3 })
      // Liten skärm-mikroskak i takt med kraften — aldrig hård.
      this._screenShake(4 + strength * 6)
    }
  },

  // Glaskloss som spruckit: den räknas som nedknuffad (mätaren rör sig), kroppen lämnar
  // världen och vyn tonar bort i gnistror. Körs i tickern, aldrig i matter:s event.
  _doShatter(ctx) {
    const list = this._shatter
    this._shatter = []
    for (const b of list) {
      if (!this._alive || b.cleared) continue
      const v = b.view
      const x = v && !v.destroyed ? v.x : this._pivot.x
      const y = v && !v.destroyed ? v.y : this._pivot.y
      ctx.services.audio.tone({ freq: 1500, slideTo: 2600, dur: 0.16, type: 'triangle', vol: 0.26 })
      ctx.services.voice.say('Pang! Glasklossen sprack!')
      burst(ctx.fxLayer, x, y, { count: 12 })
      sparkle(ctx.fxLayer, x, y, { count: 8 })
      this._onClear(ctx, b)
      this._phys.removeBody(b.body)
      if (v && !v.destroyed) gsap.to(v, { alpha: 0, duration: 0.2 })
    }
  },

  // Mjuk skärm-mikroskak (ALDRIG hård) skalad med slagkraften. Skakar hela scenroten
  // via den exit-säkra shake-hjälparen (tweenar en proxy, inte roten direkt).
  _screenShake(power) {
    const r = this._root
    if (!r || r.destroyed) return
    this._shakeTw?.kill()
    r.x = 0
    r.y = 0
    this._shakeTw = shake(r, { intensity: clamp(power, 3, 10), duration: 0.3 })
  },

  // Klossarna lever inför slaget: en stående kloss darrar av förväntan när kulan
  // närmar sig. Darret sker på SCALE (fysik-länken rör bara position+rotation), så det
  // krockar aldrig med motorn. Varje kloss darrar bara en gång per sving-runda.
  _spookBlocks() {
    if (this._phase !== 'swing') return
    const b0 = this._ballBody
    if (!b0) return
    const bx = b0.position.x
    const by = b0.position.y
    for (const b of this._blocks) {
      if (b.cleared || b.nervous) continue
      const v = b.view
      if (!v || v.destroyed) continue
      if (Math.hypot(v.x - bx, v.y - by) < 155) {
        b.nervous = true
        gsap.killTweensOf(v.scale)
        gsap.to(v.scale, {
          x: 1.1,
          y: 0.9,
          duration: 0.08,
          yoyo: true,
          repeat: 3,
          ease: 'sine.inOut',
          onComplete: () => {
            if (!v.destroyed) v.scale.set(1)
          },
        })
      }
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
    // Inbjudningsringen sitter på kulan så länge den blinkar.
    if (this._inviteRing && !this._inviteRing.destroyed) this._inviteRing.position.set(bx, by)
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._reloadCall?.kill()
    this._assistCall?.kill()
    this._shakeTw?.kill()
    this._workerIdle?.kill()
    this._hideInvite()
    this._clearFinishCalls()
    this._removeFlag()
    if (this._worker && !this._worker.destroyed) gsap.killTweensOf(this._worker.scale)
    this._detachBall()

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointerdown', this._onFieldTap)
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
    // Mätarens prickar puffar när de tänds — en puls som lever kvar mot en förstörd
    // prick är exakt den exit-bugg P0 varnar för.
    for (const p of this._pips || []) {
      p._fxPopTl?.kill()
      gsap.killTweensOf(p.scale)
    }
    this._pips = []

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

// Färgglad kloss (rundad rektangel + mjuk highlight + glatt ansikte). Ansiktet gör
// tornet till "gänget" man knuffar — mer charm, noll fysik-risk.
// `kind` ger specialklossarna en EGEN silhuett och ett eget uttryck, så barnet kan se
// skillnaden innan det svingar: sten är grå och sprucken med bistra ögonbryn, gummi är
// grön med ringar och ett brett flin, glas är genomskinligt med en blänk-diagonal.
function makeBlock(w, h, color, kind = 'normal') {
  const c = new Container()
  const fill = kind === 'sten' ? 0x9a9ea6 : kind === 'studs' ? 0x4ec26a : kind === 'glas' ? 0xbfe9f5 : color
  const alpha = kind === 'glas' ? 0.62 : 1
  const g = new Graphics()
    .roundRect(-w / 2, -h / 2, w, h, kind === 'sten' ? 6 : 12)
    .fill({ color: fill, alpha })
    .stroke({ width: 4, color: shade(fill, kind === 'glas' ? 0.1 : 0.22), alpha: kind === 'glas' ? 0.5 : 0.7 })
  const hi = new Graphics().roundRect(-w / 2 + 10, -h / 2 + 8, w * 0.4, h * 0.22, 6).fill({ color: COLORS.white, alpha: kind === 'glas' ? 0.5 : 0.28 })
  hi.eventMode = 'none'
  c.addChild(g, hi)

  if (kind === 'sten') {
    // Sprickor: gör tyngden läsbar utan text.
    const cr = new Graphics()
    cr.moveTo(-28, -h / 2 + 4).lineTo(-16, 0).lineTo(-24, h / 2 - 4).stroke({ width: 2.5, color: 0x6f737a, alpha: 0.8 })
    cr.moveTo(22, -h / 2 + 6).lineTo(30, 2).stroke({ width: 2.5, color: 0x6f737a, alpha: 0.8 })
    cr.eventMode = 'none'
    c.addChild(cr)
  } else if (kind === 'studs') {
    const ring = new Graphics()
    ring.roundRect(-w / 2 + 12, -h / 2 + 9, w - 24, h - 18, 10).stroke({ width: 3, color: 0xffffff, alpha: 0.45 })
    ring.eventMode = 'none'
    c.addChild(ring)
  } else if (kind === 'glas') {
    const shine = new Graphics()
    shine.moveTo(-w / 2 + 18, h / 2 - 6).lineTo(w / 2 - 30, -h / 2 + 6).stroke({ width: 6, color: 0xffffff, alpha: 0.55 })
    shine.eventMode = 'none'
    c.addChild(shine)
  }

  // Ansikte: två prickögon + ett litet leende (bistert på sten, brett på gummi).
  const face = new Graphics()
  face.circle(-15, -6, 4.5).fill(COLORS.ink)
  face.circle(15, -6, 4.5).fill(COLORS.ink)
  if (kind === 'sten') {
    face.moveTo(-22, -15).lineTo(-9, -11).stroke({ width: 3, color: COLORS.ink })
    face.moveTo(22, -15).lineTo(9, -11).stroke({ width: 3, color: COLORS.ink })
    face.moveTo(-10, 8).lineTo(10, 8).stroke({ width: 3, color: COLORS.ink })
  } else {
    face.arc(0, -1, kind === 'studs' ? 15 : 12, 0.18 * Math.PI, 0.82 * Math.PI).stroke({ width: 3, color: COLORS.ink })
  }
  face.eventMode = 'none'
  c.addChild(face)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// RITAD krona på toppen (P0 ASSETS) med mjuk glöd — var en 👑-emoji.
function makeCrown() {
  const c = new Container()
  const glow = new Graphics().circle(0, 0, 40).fill({ color: 0xffe27a, alpha: 0.3 })
  glow.eventMode = 'none'
  const e = new Graphics()
  e.moveTo(-27, 16).lineTo(-27, -12).lineTo(-13, 2).lineTo(0, -20).lineTo(13, 2).lineTo(27, -12).lineTo(27, 16)
    .closePath().fill(0xffd24a).stroke({ width: 3, color: 0xd9a021 })
  e.rect(-27, 10, 54, 8).fill(0xe8b53a)
  e.circle(0, -20, 5).fill(0xff6b6b)
  e.circle(-27, -12, 4).fill(0x57c8c3)
  e.circle(27, -12, 4).fill(0x57c8c3)
  e.circle(0, 14, 3.4).fill(0xfffdf7)
  e.eventMode = 'none'
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
