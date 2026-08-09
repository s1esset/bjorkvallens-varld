// Saftbaren — fyra glas, en kran och riktig vätska (src/lib/vatska.js).
// Kärnloop: dra kranen till ett glas → tryck → saften rinner. Spaken byter färg.
// Häll ett glas i ett annat (dra eller tryck-tryck) → färgerna smittar av sig i
// vätskan och blir en NY färg: gul + blå blir grön. Bobo beställer en färg och
// dricker upp den när den är klar. Inget kan gå sönder, spill rinner ner i gallret.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, DESIGN_W, DESIGN_H, shade } from '../../lib/theme.js'
import { FluidWorld, FluidView } from '../../lib/vatska.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { Button } from '../../lib/Button.js'
import { pop, puff, sparkle, burst , kvittera} from '../../lib/feedback.js'

// --- färgvärlden -----------------------------------------------------------
// Index i den här listan ÄR partikelns färg (world.pal[i]).
const PAL = [
  { hex: 0xef3b3b, mork: 0xc22a2a }, // 0 röd
  { hex: 0xffd233, mork: 0xe0b117 }, // 1 gul
  { hex: 0x2f7fe0, mork: 0x1f5cad }, // 2 blå
  { hex: 0x3fb352, mork: 0x2d8a3d }, // 3 grön
  { hex: 0xff8a1e, mork: 0xd96c0a }, // 4 orange
  { hex: 0x9b57d3, mork: 0x7a3cb0 }, // 5 lila
  { hex: 0x8a5a3b, mork: 0x6b442b }, // 6 brun
]
const HEX = PAL.map((p) => p.hex)
const ROD = 0, GUL = 1, BLA = 2, GRON = 3, ORANGE = 4, LILA = 5, BRUN = 6

// Varje partikel bär MÄNGDER av rött/gult/blått (vätskemotorns kanaler), inte ett
// färgnamn. Färgen är en avläsning av blandningen — därför gör en droppe blått i ett
// glas gult ingen skillnad, medan halva glaset blått gör det grönt. RGB-medelvärde
// vore fel här: blå + gul blir grått i RGB, men grönt i en burk saft.
const CH = [
  [1, 0, 0], // röd
  [0, 1, 0], // gul
  [0, 0, 1], // blå
]
const TROSKEL = 0.24 // så mycket av en ingrediens krävs för att den ska "synas"

function classify(r, y, b) {
  const s = r + y + b
  if (s <= 0.0001) return ROD
  const R = r / s
  const Y = y / s
  const B = b / s
  const nR = R > TROSKEL
  const nY = Y > TROSKEL
  const nB = B > TROSKEL
  const n = (nR ? 1 : 0) + (nY ? 1 : 0) + (nB ? 1 : 0)
  if (n === 3) return BRUN
  if (n <= 1) return R >= Y && R >= B ? ROD : Y >= B ? GUL : BLA
  if (!nB) return ORANGE
  if (!nY) return LILA
  return GRON
}

// Repliken när en blandning lyckas (de tre första finns redan som röstklipp).
const MIX_ROST = {
  [GRON]: 'Gul och blå blir grön!',
  [LILA]: 'Röd och blå blir lila!',
  [ORANGE]: 'Röd och gul blir orange!',
  [BRUN]: 'Oj, nu blev det brunt!',
}
const ORDER_ROST = [
  'Bobo vill ha röd saft!',
  'Bobo vill ha gul saft!',
  'Bobo vill ha blå saft!',
  'Bobo vill ha grön saft!',
  'Bobo vill ha orange saft!',
  'Bobo vill ha lila saft!',
]

// --- mått ------------------------------------------------------------------
const GLASS_X = [390, 570, 750, 930]
const GRATE_Y = 620 // glasen står här
// Ett glas som RÖR SIG i sidled måste hålla sig ovanför den här linjen. Under den
// överlappar dess inre hålrum de stående glasens (deras inre sträcker sig från y 400 till
// 598), och då går det inte att avgöra vems saft som är vems — se _carryAll. Uppmätt:
// ett fullt glas som gled diagonalt förbi glas 2 på väg till hinken tappade hela
// innehållet där (52 partiklar blev liggande med medel-x 740 ≈ glas 2:s 750).
// GRATE_Y - 240 ger 8 px luft mellan fångstrutorna.
const SAFE_Y = GRATE_Y - 240
const HALL_Y = SAFE_Y // så högt lyfts ett glas man håller i (aldrig kvar på disken)
const RAIL_Y = 150 // kranens skena
const SPOUT_Y = 236 // där saften lämnar pipen
const HINK_X = 1100
const BOBO_X = 1160
const BOBO_Y = 300
const LEVER_X = 150
const LEVER_TOP = 322
const LEVER_STEP = 96 // avstånd mellan färglägena (≥96 px träffyta)
const KRAN_MIN = GLASS_X[0]
const KRAN_MAX = GLASS_X[3]
// Glasets inre hålrum, i glasets egna koordinater (origo = glasets fot).
const IN_W = 114
const IN_TOP = -220
const IN_BOT = -22
const FULLT = 118 // partiklar i ett fullt glas
const KLART = 64 // så mycket krävs för att en beställning ska räknas som klar
// Lutningen när man häller, och hur långt vid sidan om målet ett hällande glas ställs.
// DE TVÅ HÖR IHOP och får aldrig ändras var för sig: mynningen sitter i glasets egna
// koordinater på (0, IN_TOP), så vid lutningen θ hamnar den `-IN_TOP·sin θ` px åt sidan
// och `IN_TOP·cos θ` px i höjdled räknat från foten. Ändrar man θ flyttar sig alltså
// strålens nedslag, och OFFS måste mätas om.
//
// TILT var 1,05 rad (60°) och då rann det **inte en droppe** — saften nådde aldrig över
// glasets läpp, så spelets kärnloop ("häll ett glas i ett annat") gjorde ingenting alls.
// Uppmätt med scripts/_pourtune.mjs (fullt källglas, riktigt målglas, spelets egen
// geometri), antal partiklar som hamnar I MÅLET av ~103:
//     1,05 → 0     1,5/205 → 29     1,9/205 → 19     2,2/205 → ~19
//     2,2/100 → 77 (spill 7)   2,4/100 → 81 (spill 11)   2,6/100 → 86 (spill 13)
// Valt 2,2 + 100: 75 % av saften kommer över, minst spill av kandidaterna, och minst
// extrem vinkel — glaset tippar förbi vågrätt som en riktig hällning i stället för att
// vändas upp och ner. Att hålla glaset HÖGRE (fot-y 300 i stället för 388) mättes också
// och blev sämre: längre fall → mer skvätt (59 i målet, 25–38 spill).
const TILT = 2.2
const OFFS = 100
// Var mynningen (0, IN_TOP) hamnar i förhållande till foten vid lutningen TILT.
// MOUTH_DX används där saften ska falla FRITT ner i något brett (hinken); OFFS där
// den ska rinna över kanten på ett smalt glas — de skiljer sig för att en mynning som
// lutar in över glasets kant träffar bättre än en stråle som faller utanför den.
const MOUTH_DX = Math.round(-IN_TOP * Math.sin(TILT)) // 178
// Bobo DRICKER, han får inte ett glas hällt över sig: hans mun är en drain-ruta
// (190×190 runt BOBO_X-20, BOBO_Y+30) och saften ska ligga stilla INNE i den medan
// den sugs ur glaset. Den grunda gamla lutningen gör precis det — den lutar saften
// mot mynningen utan att tömma den på golvet — så drickandet behåller sina egna tal.
const SERVE_TILT = 1.05
const SERVE_OFFS = 205
const DROPP = [
  { scale: 1.0, threshold: 0.56 },
  { scale: 1.38, threshold: 0.42 },
  { scale: 1.85, threshold: 0.3 },
]

export default {
  id: 'saftbaren',
  titleSv: 'Saftbaren',
  icon: '🥤',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'saftbaren',
  voiceIntro: 'Tryck på kranen så rinner det saft i glaset!',

  init(ctx) {
    this._alive = true
    this._ctxRef = ctx
    this._busy = false
    this._selected = null
    this._idle = 0
    this._hint = 0
    this._frame = 0
    this._toneT = 0
    this._dropp = 1
    this._mixT = 0 // kylning mellan två färgutrop (ms, performance.now)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._bg = new Container()
    this._backL = new Container()
    this._root.addChild(this._bg, this._backL)
    this._paintRoom()

    // Vätskevärlden. Inga världsväggar i sidled — spill ska få rinna ur bild.
    this._world = new FluidWorld({
      max: 620,
      radius: 26,
      gravityY: 0.52,
      rho0: 5,
      k: 0.5,
      kNear: 3,
      sigma: 0.06,
      beta: 0.12,
      restitution: 0.06,
      wallFriction: 0.35,
      walls: { left: false, right: false, bottom: false, top: false },
      bounds: { left: -200, right: DESIGN_W + 200, top: -400, bottom: DESIGN_H + 120 },
    })
    this._world.setChannels(3, 0.09)

    this._view = new FluidView(this._root, this._world, {
      palette: HEX,
      blobScale: DROPP[this._dropp].scale,
      threshold: DROPP[this._dropp].threshold,
      blur: 9,
      quality: 2,
      resolution: 0.5,
    })
    this._view.layer.eventMode = 'none'
    this._view.layer.interactiveChildren = false

    this._frontL = new Container()
    this._propL = new Container()
    this._root.addChild(this._frontL, this._propL)

    this._buildGlasses()
    this._buildHink()
    this._buildGrateFront()
    this._buildKran(ctx)
    this._buildLever(ctx)
    this._buildBobo()
    this._buildDroppToggle(ctx)

    // Tre glas står färdiga med grundfärgerna, det fjärde är tomt att blanda i.
    this._prefill(this._glasses[0], ROD, 6)
    this._prefill(this._glasses[1], GUL, 6)
    this._prefill(this._glasses[2], BLA, 6)

    this._newOrder(ctx, true)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._tick = null
    gsap.killTweensOf(this._glasses?.map((g) => g.front) || [])
    for (const g of this._glasses || []) {
      gsap.killTweensOf(g)
      gsap.killTweensOf(g.front.scale)
    }
    gsap.killTweensOf(this._kran || {})
    gsap.killTweensOf(this._lever || {})
    if (this._bobo) gsap.killTweensOf(this._bobo)
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null
    this._boboFace = null
    this._view?.destroy()
    this._world?.destroy()
    this._view = null
    this._world = null
    this._glasses = []
    this._root?.destroy({ children: true })
    this._root = null
  },

  // ---------------------------------------------------------------- scen ---

  _paintRoom() {
    const g = new Graphics()
    // vägg: varm gradient i breda remsor
    for (let i = 0; i < 24; i++) {
      const t = i / 23
      const c = lerpHex(0xffe9c9, 0xf7cfa0, t)
      g.rect(0, (DESIGN_H / 24) * i, DESIGN_W, DESIGN_H / 24 + 1).fill(c)
    }
    // hylla högst upp med saftflaskor (dekor, ger baren ett rum)
    g.rect(0, 70, DESIGN_W, 18).fill(0xa9714a)
    g.rect(0, 88, DESIGN_W, 8).fill(shade(0xa9714a, 0.25))
    // 7 flaskor mellan x=200 och x=1082: de gamla ytterlägena (60 och 1180) låg rakt
    // bakom hem- och ljudknappen i hörnen.
    for (let i = 0; i < 7; i++) {
      const x = 200 + i * 147
      const c = PAL[i % 6].hex
      // Halsen låg tidigare på y=-6 och kapades av skärmkanten. Hela flaskan ryms nu
      // mellan y=2 och hyllplanet (y=70), så korkarna syns.
      g.roundRect(x - 20, 14, 40, 56, 10).fill({ color: c, alpha: 0.85 })
      g.roundRect(x - 7, 2, 14, 18, 5).fill(shade(c, 0.3))
      g.roundRect(x - 16, 22, 12, 22, 6).fill({ color: 0xffffff, alpha: 0.3 })
    }
    // bänkskiva
    g.rect(0, GRATE_Y - 8, DESIGN_W, 16).fill(0xc2a07d)
    g.rect(0, GRATE_Y + 8, DESIGN_W, DESIGN_H - GRATE_Y).fill(0x8f6a49)
    this._bg.addChild(g)
    this._bg.eventMode = 'none'
    this._bg.interactiveChildren = false
  },

  // Gallret ritas ÖVER vätskan: spill ser då ut att rinna ner genom det och försvinna.
  _buildGrateFront() {
    const g = new Graphics()
    g.rect(0, GRATE_Y - 6, DESIGN_W, 12).fill(0xb9b4ad)
    for (let x = 6; x < DESIGN_W; x += 26) {
      g.roundRect(x, GRATE_Y - 4, 14, 8, 3).fill(0xdad5ce)
    }
    g.rect(0, GRATE_Y + 6, DESIGN_W, DESIGN_H - GRATE_Y - 6).fill(0x8f6a49)
    g.rect(0, GRATE_Y + 6, DESIGN_W, 6).fill(shade(0x8f6a49, 0.25))
    g.eventMode = 'none'
    this._frontL.addChild(g)
  },

  _buildGlasses() {
    this._glasses = []
    for (let i = 0; i < GLASS_X.length; i++) {
      const back = new Graphics()
      paintGlassBack(back)
      back.eventMode = 'none'
      this._backL.addChild(back)

      const front = new Graphics()
      paintGlassFront(front)
      front.eventMode = 'static'
      front.cursor = 'pointer'
      front.hitArea = new Rectangle(-84, -236, 168, 248)
      this._frontL.addChild(front)

      const g = {
        i,
        homeX: GLASS_X[i],
        homeY: GRATE_Y,
        x: GLASS_X[i],
        y: GRATE_Y,
        angle: 0,
        wantAngle: 0,
        held: false,
        lastMix: -1, // senast utropade blandfärg för DET HÄR glaset (se _checkGlasses)
        back,
        front,
        walls: [],
      }
      // tre väggar: botten + två sidor (origo = glasets fot)
      const add = (lx, ly, w, h) => g.walls.push({ lx, ly, c: this._world.addBox(0, 0, w, h) })
      add(0, -10, 150, 24)
      add(-66, -115, 18, 210)
      add(66, -115, 18, 210)

      front.on('pointerdown', (e) => this._onGlassDown(g, e))
      this._glasses.push(g)
      this._syncGlass(g)
    }
  },

  _buildHink() {
    const g = new Graphics()
    // hink: stavar + band + handtag, fristående ritad (ingen emoji)
    g.moveTo(-62, -110).lineTo(62, -110).lineTo(48, 0).lineTo(-48, 0).closePath().fill(0x9a6b45)
    for (let i = -2; i <= 2; i++) {
      g.moveTo(i * 24, -110).lineTo(i * 20, 0).stroke({ width: 3, color: shade(0x9a6b45, 0.25) })
    }
    g.moveTo(-60, -80).lineTo(60, -80).stroke({ width: 8, color: 0x6f4c30 })
    g.moveTo(-53, -22).lineTo(53, -22).stroke({ width: 8, color: 0x6f4c30 })
    g.ellipse(0, -110, 62, 14).fill(0x7d5636)
    g.ellipse(0, -110, 52, 9).fill(0x4a3120)
    g.arc(0, -112, 74, Math.PI * 1.15, Math.PI * 1.85).stroke({ width: 7, color: 0x6f4c30 })
    g.x = HINK_X
    g.y = GRATE_Y
    g.eventMode = 'static'
    g.cursor = 'pointer'
    g.hitArea = new Rectangle(-80, -128, 160, 140)
    g.on('pointertap', () => this._onHinkTap())
    this._frontL.addChild(g)
    this._hink = g
    // hinken suger — den blir aldrig full
    this._hinkDrain = { x: HINK_X, y: GRATE_Y - 60 }
  },

  _buildKran(ctx) {
    const k = new Container()
    const g = new Graphics()
    // rör ner från skenan
    g.roundRect(-16, -96, 32, 84, 8).fill(0xb9c2c9)
    g.roundRect(-11, -92, 10, 74, 5).fill(0xe6ecf0)
    // ventilhus
    g.roundRect(-46, -18, 92, 56, 16).fill(0xa8b3bb)
    g.roundRect(-40, -12, 80, 26, 12).fill(0xd7dfe5)
    // pip
    g.roundRect(-13, 34, 26, 34, 8).fill(0x9aa6ae)
    g.roundRect(-9, 60, 18, 10, 4).fill(0x76828b)
    // färgfönster (visar vilken saft som kommer)
    const win = new Graphics()
    win.roundRect(-22, -6, 44, 22, 8).fill(0xffffff)
    // handtag
    const hand = new Graphics()
    hand.roundRect(-8, -60, 16, 46, 8).fill(0xef3b3b)
    hand.circle(0, -64, 18).fill(0xff6b6b)
    hand.circle(-5, -69, 6).fill({ color: 0xffffff, alpha: 0.55 })
    hand.y = 0
    k.addChild(g, win, hand)
    k.x = GLASS_X[0]
    k.y = RAIL_Y
    k.eventMode = 'static'
    k.cursor = 'pointer'
    k.hitArea = new Rectangle(-60, -100, 120, 176)
    this._propL.addChild(k)

    // skena
    const rail = new Graphics()
    rail.roundRect(KRAN_MIN - 70, RAIL_Y - 104, KRAN_MAX - KRAN_MIN + 140, 16, 8).fill(0x8d99a3)
    rail.eventMode = 'none'
    this._propL.addChildAt(rail, 0)

    this._kran = { view: k, win, hand, x: GLASS_X[0], pouring: false, pourT: 0, dragging: false }
    k.on('pointerdown', (e) => this._onKranDown(ctx, e))

    // ◀ ▶ — tryck-alternativet till draget (P0: drag måste ha tap-fallback)
    const mk = (dir) =>
      new Button({
        icon: dir < 0 ? '◀' : '▶',
        width: 104,
        height: 104,
        color: COLORS.teal,
        services: ctx.services,
        onTap: () => this._stepKran(ctx, dir),
      })
    const bl = mk(-1)
    const br = mk(1)
    bl.x = KRAN_MIN - 130
    br.x = KRAN_MAX + 130
    bl.y = br.y = RAIL_Y - 20
    this._propL.addChild(bl, br)
    this._setKranColor()
  },

  _buildLever(ctx) {
    const c = new Container()
    c.x = LEVER_X
    c.y = 0
    const g = new Graphics()
    // konsol + spår
    g.roundRect(-52, LEVER_TOP - 74, 104, LEVER_STEP * 2 + 148, 30).fill(0xc9a97f)
    g.roundRect(-14, LEVER_TOP - 26, 28, LEVER_STEP * 2 + 52, 14).fill(0x6f4c30)
    c.addChild(g)
    // tre färgknoppar att trycka på (tap-alternativ till spaken)
    this._leverKnobs = []
    for (let i = 0; i < 3; i++) {
      const kn = new Graphics()
      const y = LEVER_TOP + i * LEVER_STEP
      kn.circle(0, 0, 34).fill(PAL[i].mork)
      kn.circle(0, -3, 28).fill(PAL[i].hex)
      kn.circle(-9, -12, 9).fill({ color: 0xffffff, alpha: 0.5 })
      kn.x = 0
      kn.y = y
      kn.eventMode = 'static'
      kn.cursor = 'pointer'
      kn.hitArea = new Rectangle(-52, -48, 104, 96)
      kn.on('pointertap', () => this._setLever(ctx, i, true))
      c.addChild(kn)
      this._leverKnobs.push(kn)
    }
    // själva spaken
    const arm = new Graphics()
    arm.roundRect(-6, -12, 74, 24, 12).fill(0x8d99a3)
    arm.circle(66, 0, 26).fill(0xef3b3b)
    arm.circle(58, -8, 9).fill({ color: 0xffffff, alpha: 0.5 })
    arm.circle(0, 0, 14).fill(0x6f4c30)
    arm.x = 0
    arm.y = LEVER_TOP
    arm.eventMode = 'static'
    arm.cursor = 'pointer'
    arm.hitArea = new Rectangle(-30, -54, 130, 108)
    c.addChild(arm)
    this._propL.addChild(c)
    this._lever = { view: c, arm, idx: 0, dragging: false }
    arm.on('pointerdown', (e) => this._onLeverDown(ctx, e))
  },

  _buildBobo() {
    const b = new Container()
    b.x = BOBO_X
    b.y = BOBO_Y
    // Bobo är gästen som BESTÄLLER och DRICKER — spelets hela poäng. Som statiskt
    // huvud kunde han bara vänta; som rigg är han törstig medan beställningen står
    // och nöjd när glaset är tomt. `kropp: false`: disken skär av honom vid midjan
    // och en kropp bakom disken syns inte alls.
    this._kar = makeKaraktar({ r: 74, kropp: false })
    const m = this._kar.view
    b.addChild(m)
    this._propL.addChild(b)
    this._bobo = b
    this._kar.setMood('hungrig', { direkt: true }) // törstig i vila
    this._boboFace = m

    // pratbubbla med ett ritat glas i den beställda färgen
    const bub = new Container()
    bub.x = BOBO_X - 160
    bub.y = BOBO_Y - 30
    const back = new Graphics()
    back.roundRect(-74, -66, 148, 132, 30).fill(0xfffdf7)
    back.roundRect(-74, -66, 148, 132, 30).stroke({ width: 6, color: 0xe2d4bd })
    back.circle(84, 26, 15).fill(0xfffdf7)
    back.circle(106, 34, 9).fill(0xfffdf7)
    const mini = new Graphics()
    bub.addChild(back, mini)
    bub.eventMode = 'none'
    this._propL.addChild(bub)
    this._bubble = bub
    this._bubbleGlass = mini
  },

  _buildDroppToggle(ctx) {
    const c = new Container()
    c.x = LEVER_X
    c.y = 660
    const g = new Graphics()
    g.roundRect(-84, -46, 168, 92, 28).fill(0xfffdf7)
    g.roundRect(-84, -46, 168, 92, 28).stroke({ width: 5, color: 0xe2d4bd })
    c.addChild(g)
    this._droppDots = []
    for (let i = 0; i < 3; i++) {
      const d = new Graphics()
      d.x = -44 + i * 44
      c.addChild(d)
      this._droppDots.push(d)
    }
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-96, -58, 192, 116)
    c.on('pointertap', () => this._cycleDropp(ctx))
    this._propL.addChild(c)
    this._paintDroppDots()
  },

  _paintDroppDots() {
    for (let i = 0; i < 3; i++) {
      const d = this._droppDots[i]
      const on = i === this._dropp
      const r = 9 + i * 6
      d.clear()
      d.circle(0, 2, r).fill(on ? 0x2f7fe0 : 0xd8d2c8)
      d.circle(-r * 0.3, 2 - r * 0.3, r * 0.32).fill({ color: 0xffffff, alpha: on ? 0.7 : 0.4 })
    }
  },

  // ------------------------------------------------------------ styrning ---

  _stepKran(ctx, dir) {
    this._idle = 0
    const cur = nearestIndex(this._kran.x)
    const next = Math.max(0, Math.min(GLASS_X.length - 1, cur + dir))
    this._moveKran(GLASS_X[next])
    ctx.services.audio.sfx('tap')
  },

  _moveKran(x) {
    const k = this._kran
    gsap.killTweensOf(k)
    gsap.to(k, {
      x,
      duration: 0.28,
      ease: 'back.out(1.6)',
      onUpdate: () => {
        if (this._alive && !k.view.destroyed) k.view.x = k.x
      },
    })
  },

  _onKranDown(ctx, e) {
    this._idle = 0
    const k = this._kran
    const start = this._root.toLocal(e.global)
    k.dragging = false
    k.grabDX = k.x - start.x
    const move = (ev) => {
      const p = this._root.toLocal(ev.global)
      if (!k.dragging && Math.abs(p.x - start.x) > 12) k.dragging = true
      if (k.dragging) {
        k.x = Math.max(KRAN_MIN, Math.min(KRAN_MAX, p.x + k.grabDX))
        k.view.x = k.x
      }
    }
    const up = () => {
      k.view.off('globalpointermove', move)
      k.view.off('pointerup', up)
      k.view.off('pointerupoutside', up)
      if (k.dragging) {
        this._moveKran(GLASS_X[nearestIndex(k.x)])
        ctx.services.audio.sfx('soft')
      } else {
        this._togglePour(ctx)
      }
    }
    k.view.on('globalpointermove', move)
    k.view.on('pointerup', up)
    k.view.on('pointerupoutside', up)
  },

  _togglePour(ctx) {
    const k = this._kran
    k.pouring = !k.pouring
    k.pourT = k.pouring ? 1600 : 0
    gsap.to(k.hand, { rotation: k.pouring ? -0.8 : 0, duration: 0.18, ease: 'back.out(2)' })
    ctx.services.audio.sfx(k.pouring ? 'flip' : 'soft')
    pop(k.view, { scale: 1.06 })
  },

  _onLeverDown(ctx, e) {
    this._idle = 0
    const l = this._lever
    const arm = l.arm
    let moved = false
    const start = this._root.toLocal(e.global)
    const move = (ev) => {
      const p = this._root.toLocal(ev.global)
      if (!moved && Math.abs(p.y - start.y) > 12) moved = true
      if (moved) arm.y = Math.max(LEVER_TOP, Math.min(LEVER_TOP + LEVER_STEP * 2, p.y))
    }
    const up = () => {
      arm.off('globalpointermove', move)
      arm.off('pointerup', up)
      arm.off('pointerupoutside', up)
      const idx = moved ? Math.round((arm.y - LEVER_TOP) / LEVER_STEP) : (l.idx + 1) % 3
      this._setLever(ctx, idx, !moved)
    }
    arm.on('globalpointermove', move)
    arm.on('pointerup', up)
    arm.on('pointerupoutside', up)
  },

  _setLever(ctx, idx, snap) {
    const l = this._lever
    l.idx = Math.max(0, Math.min(2, idx))
    this._idle = 0
    gsap.killTweensOf(l.arm)
    gsap.to(l.arm, { y: LEVER_TOP + l.idx * LEVER_STEP, duration: snap ? 0.3 : 0.2, ease: 'back.out(1.8)' })
    for (let i = 0; i < 3; i++) {
      const k = this._leverKnobs[i]
      gsap.killTweensOf(k.scale)
      gsap.to(k.scale, { x: i === l.idx ? 1.18 : 1, y: i === l.idx ? 1.18 : 1, duration: 0.2 })
    }
    this._setKranColor()
    ctx.services.audio.tone({ freq: 300 + l.idx * 120, dur: 0.12, type: 'triangle', vol: 0.3 })
    sparkle(this._propL, this._kran.x, RAIL_Y + 20, { count: 5 })
  },

  _setKranColor() {
    const c = PAL[this._lever ? this._lever.idx : 0]
    this._kran.win.clear()
    this._kran.win.roundRect(-22, -6, 44, 22, 8).fill(c.hex)
    this._kran.win.roundRect(-18, -3, 36, 8, 4).fill({ color: 0xffffff, alpha: 0.35 })
  },

  _cycleDropp(ctx) {
    this._idle = 0
    this._dropp = (this._dropp + 1) % DROPP.length
    const d = DROPP[this._dropp]
    this._view.setBlobScale(d.scale, d.threshold)
    this._paintDroppDots()
    ctx.services.audio.tone({ freq: 220 + this._dropp * 160, dur: 0.14, type: 'sine', vol: 0.3 })
    sparkle(this._propL, LEVER_X, 660, { count: 6 })
  },

  // -------------------------------------------------------------- glasen ---

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  // Saftbaren har ingen ctx i sina pekhanterare — den ligger på this._ctx.
  _kvitto(e) {
    const ctx = this._ctx
    if (!ctx) return
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _onGlassDown(g, e) {
    if (this._busy) return this._kvitto(e)
    this._idle = 0
    const start = this._root.toLocal(e.global)
    let moved = false
    g.grabDX = g.x - start.x
    g.grabDY = g.y - start.y
    const move = (ev) => {
      const p = this._root.toLocal(ev.global)
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) > 14) {
        moved = true
        g.held = true
        this._deselect()
        this._lift(g)
      }
      if (moved) {
        g.x = Math.max(120, Math.min(DESIGN_W - 120, p.x + g.grabDX))
        // Ett hållet glas LYFTS från disken. Låg det kvar på GRATE_Y stod det i exakt
        // samma rymd som glasen det drogs förbi — då går det inte att avgöra vems saft
        // som är vems (se _carryAll), och _tiltFor lutade det aldrig heller eftersom
        // den kräver g.y < o.y - 120. Nu gör den det.
        g.y = Math.max(300, Math.min(HALL_Y, p.y + g.grabDY))
      }
    }
    const up = () => {
      g.front.off('globalpointermove', move)
      g.front.off('pointerup', up)
      g.front.off('pointerupoutside', up)
      if (moved) {
        g.held = false
        this._sendHome(g)
      } else {
        this._onGlassTap(g)
      }
    }
    g.front.on('globalpointermove', move)
    g.front.on('pointerup', up)
    g.front.on('pointerupoutside', up)
  },

  _lift(g) {
    this._ctxRef?.services?.audio?.sfx('pop')
    this._frontL.setChildIndex(g.front, this._frontL.children.length - 1)
  },

  // Tryck-tryck: markera ett glas, tryck sedan på ett annat (eller hinken).
  _onGlassTap(g) {
    if (this._selected === g) {
      this._deselect()
      return
    }
    if (this._selected) {
      const from = this._selected
      this._deselect()
      this._autoPour(from, g.homeX, g.homeY - 232, 1500)
      return
    }
    this._selected = g
    this._ctxRef?.services?.audio?.sfx('tap')
    g._pulse = gsap.to(g.front.scale, { x: 1.07, y: 1.07, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _onHinkTap() {
    if (this._busy) return this._kvitto()
    this._idle = 0
    if (this._selected) {
      const g = this._selected
      this._deselect()
      // Hinken har en bred öppning → låt strålen falla fritt rakt ner i den.
      this._autoPour(g, HINK_X, GRATE_Y - 190, 1800, MOUTH_DX)
    } else {
      pop(this._hink, { scale: 1.08 })
      this._ctxRef?.services?.audio?.sfx('soft')
    }
  },

  _deselect() {
    const g = this._selected
    this._selected = null
    if (!g) return
    g._pulse?.kill()
    g._pulse = null
    if (!g.front.destroyed) gsap.to(g.front.scale, { x: 1, y: 1, duration: 0.15 })
  },

  // Tryck-tryck-hällningen: ställ glaset `offs` px VÄNSTER om målet och luta åt höger,
  // så hamnar mynningen över målet (se TILT/OFFS/MOUTH_DX för varför de talen hör ihop).
  _autoPour(g, targetX, targetY, ms, offs = OFFS) {
    if (this._busy) return
    this._busy = true
    this._frontL.setChildIndex(g.front, this._frontL.children.length - 1)
    this._ctxRef?.services?.audio?.sfx('whoosh')
    this._moveOver(g, targetX - offs, targetY, 0.55, () => {
      g.wantAngle = TILT
      this._ctxRef?.later(ms / 1000, () => {
        if (!this._alive) return
        g.wantAngle = 0
        this._ctxRef?.later(0.45, () => {
          if (!this._alive) return
          this._busy = false
          this._sendHome(g)
        })
      })
    })
  },

  _sendHome(g) {
    g.wantAngle = 0
    this._moveOver(g, g.homeX, g.homeY, 0.6)
  },

  // Flytta ett glas i sidled UTAN att dra det tvärs genom de stående glasen: upp först,
  // sedan i sidled ovanför dem, sedan ner. En rak diagonal låter det passera lågt förbi
  // grannarna, och då byter saften ägare på vägen (se SAFE_Y och _carryAll).
  // Ser dessutom ut som att glaset lyfts, bärs och ställs ner — inte glider genom bordet.
  _moveOver(g, x, y, dur, onDone) {
    gsap.killTweensOf(g)
    const ner = () => {
      if (!this._alive) return
      gsap.to(g, { y, duration: dur * 0.3, ease: 'back.out(1.2)', onComplete: () => this._alive && onDone?.() })
    }
    const isidled = () => {
      if (!this._alive) return
      if (Math.abs(g.x - x) < 1) return ner()
      gsap.to(g, { x, duration: dur * 0.45, ease: 'power2.inOut', onComplete: ner })
    }
    if (g.y > SAFE_Y) gsap.to(g, { y: SAFE_Y, duration: dur * 0.25, ease: 'power2.out', onComplete: isidled })
    else isidled()
  },

  _prefill(g, pal, rows) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 8; c++) {
        this._world.spawn(g.x - 49 + c * 14 + (Math.random() - 0.5) * 4, g.y - 36 - r * 15, { pal, ch: CH[pal] })
      }
    }
  },

  // Vätskan följer med glaset när det flyttas. Utan det här "tappar" ett glas som
  // dras snabbt hela sitt innehåll: väggarna hinner svepa förbi partiklarna på en
  // bildruta, och saften blir stående kvar i luften. Vi flyttar både position OCH
  // förra positionen, annars får partiklarna en falsk hastighet och skvätter ur.
  //
  // Varje partikel får EN ägare, annars stjäl ett glas som flyger förbi innehållet
  // ur ett glas som står stilla. Ägaren är det glas partikeln ligger DJUPAST inne i.
  //
  // Tidigare vann "lägsta glaset" (`it.g.y > own.y`). Den regeln kunde aldrig utse en
  // vinnare mellan två glas i samma höjd — och ett draget glas fick stå kvar på disken,
  // alltså exakt samma y som de andra. Jämförelsen blev falsk varje gång och ägarskapet
  // föll tillbaka på ordningen i `_glasses`: drog man glas 0 förbi glas 2 tog glas 0
  // med sig HELA innehållet (uppmätt: 56 av 56 partiklar). Två saker fixar det: ett
  // hållet glas lyfts nu från disken (se _onGlassDown), och djupet nedan avgör — den
  // som håller partikeln längst in från sina kanter äger den.
  _carryAll() {
    const w = this._world
    let anyMoved = false
    for (const g of this._glasses) if (g.x !== g.lastX || g.y !== g.lastY) anyMoved = true
    if (!anyMoved) return
    const HALF = IN_W / 2 + 8
    const info = this._glasses.map((g) => ({ g, ca: Math.cos(-g.angle), sa: Math.sin(-g.angle) }))
    for (let i = 0; i < w.count; i++) {
      let own = null
      let bestDjup = 0
      for (let k = 0; k < info.length; k++) {
        const it = info[k]
        const rx = w.x[i] - it.g.lastX
        const ry = w.y[i] - it.g.lastY
        const lx = rx * it.ca - ry * it.sa
        const ly = rx * it.sa + ry * it.ca
        const dSida = HALF - Math.abs(lx)
        const dTopp = ly - (IN_TOP - 30)
        const dBotten = IN_BOT + 4 - ly
        if (dSida <= 0 || dTopp <= 0 || dBotten <= 0) continue
        const djup = Math.min(dSida, dTopp, dBotten)
        if (djup > bestDjup || (djup === bestDjup && own && it.g.y > own.y)) {
          bestDjup = djup
          own = it.g
        }
      }
      if (!own) continue
      const dx = own.x - own.lastX
      const dy = own.y - own.lastY
      if (!dx && !dy) continue
      w.x[i] += dx
      w.y[i] += dy
      w.px[i] += dx
      w.py[i] += dy
    }
  },

  _syncGlass(g) {
    const ca = Math.cos(g.angle)
    const sa = Math.sin(g.angle)
    for (const w of g.walls) {
      w.c.x = g.x + w.lx * ca - w.ly * sa
      w.c.y = g.y + w.lx * sa + w.ly * ca
      w.c.angle = g.angle
    }
    g.back.x = g.front.x = g.x
    g.back.y = g.front.y = g.y
    g.back.rotation = g.front.rotation = g.angle
    g.lastX = g.x
    g.lastY = g.y
  },

  // Läs av varje partikels blandning och skriv dess visningsfärg. Billigt (en
  // klassificering per partikel), och det är HÄR färgläran syns för barnet.
  _recolor() {
    const w = this._world
    const ch = w.ch
    for (let i = 0; i < w.count; i++) {
      w.pal[i] = classify(ch[0][i], ch[1][i], ch[2][i])
    }
  },

  // Räkna vätskan i ett glas: antal + vilken färg som dominerar.
  _stats(g) {
    const w = this._world
    const ca = Math.cos(-g.angle)
    const sa = Math.sin(-g.angle)
    const counts = new Array(PAL.length).fill(0)
    let n = 0
    for (let i = 0; i < w.count; i++) {
      const dx = w.x[i] - g.x
      const dy = w.y[i] - g.y
      const lx = dx * ca - dy * sa
      const ly = dx * sa + dy * ca
      if (Math.abs(lx) < IN_W / 2 && ly < IN_BOT && ly > IN_TOP - 20) {
        counts[w.pal[i]]++
        n++
      }
    }
    let dom = -1
    let best = 0
    for (let p = 0; p < counts.length; p++) if (counts[p] > best) { best = counts[p]; dom = p }
    return { n, dom, frac: n ? best / n : 0 }
  },

  // ---------------------------------------------------------- beställning ---

  _newOrder(ctx, first) {
    // Första beställningen är alltid en färg som redan finns i baren (nåbar direkt),
    // därefter växlar det mellan grundfärger och blandningar.
    const enkla = [ROD, GUL, BLA]
    const mixade = [GRON, ORANGE, LILA]
    const pool = first ? enkla : Math.random() < 0.6 ? mixade : enkla
    let want = pool[(Math.random() * pool.length) | 0]
    if (want === this._order?.pal) want = pool[(pool.indexOf(want) + 1) % pool.length]
    this._order = { pal: want }
    this._kar?.setMood('hungrig') // ny beställning → törstig igen
    this._paintBubble(want)
    gsap.killTweensOf(this._bubble)
    gsap.to(this._bubble, { alpha: 1, duration: 0.25 })
    if (!first) ctx.services.voice.say(ORDER_ROST[want])
    pop(this._bubble, { scale: 1.12 })
  },

  _paintBubble(pal) {
    const g = this._bubbleGlass
    const c = PAL[pal]
    g.clear()
    // ritat miniglas med saft i beställd färg
    g.moveTo(-30, -44).lineTo(30, -44).lineTo(23, 44).lineTo(-23, 44).closePath().fill({ color: 0xffffff, alpha: 0.55 })
    g.moveTo(-27, -8).lineTo(27, -8).lineTo(22, 40).lineTo(-22, 40).closePath().fill(c.hex)
    g.ellipse(0, -8, 27, 7).fill(shade(c.hex, 0.15))
    g.moveTo(-30, -44).lineTo(30, -44).lineTo(23, 44).lineTo(-23, 44).closePath().stroke({ width: 5, color: 0xcfd8de })
    g.ellipse(0, -44, 30, 8).fill({ color: 0xeaf2f7, alpha: 0.9 })
    // sugrör
    g.roundRect(10, -70, 9, 46, 4).fill(0xff6b6b)
  },

  _serve(ctx, g) {
    this._busy = true
    this._deselect()
    this._drink = { g, t: 0, drained: 0 }
    // bubblan viker undan medan glaset förs upp till munnen
    gsap.killTweensOf(this._bubble)
    gsap.to(this._bubble, { alpha: 0, duration: 0.25 })
    gsap.killTweensOf(g)
    this._frontL.setChildIndex(g.front, this._frontL.children.length - 1)
    // Foten hamnar OFFS px vänster om Bobo — då pekar mynningen mot munnen när
    // glaset lutas åt höger (samma räkning som _autoPour).
    this._moveOver(g, BOBO_X - SERVE_OFFS, BOBO_Y + 52, 0.6, () => {
      if (this._drink) this._drink.g.wantAngle = SERVE_TILT
    })
    ctx.services.audio.sfx('whoosh')
  },

  _finishServe(ctx) {
    const d = this._drink
    this._drink = null
    if (!d) return
    const pal = this._order.pal
    d.g.wantAngle = 0
    this._sendHome(d.g)
    // Bobos egen finish: nöjd hoppning, en färgad rapbubbla och glitter. Spelets
    // fyra hopp på 46 px är större än riggens och får äga `y` — därför `setMood`
    // och inte `react('jubel')`, som hade tweenat samma `y` samtidigt.
    this._kar?.setMood('stolt')
    gsap.to(this._bobo, { y: BOBO_Y - 46, duration: 0.22, yoyo: true, repeat: 3, ease: 'power2.out' })
    burst(this._propL, BOBO_X, BOBO_Y, { count: 16, colors: [PAL[pal].hex, PAL[pal].mork, 0xffffff] })
    const bubbla = new Graphics()
    bubbla.circle(0, 0, 26).fill({ color: PAL[pal].hex, alpha: 0.75 })
    bubbla.circle(-8, -8, 8).fill({ color: 0xffffff, alpha: 0.6 })
    bubbla.x = BOBO_X + 58
    bubbla.y = BOBO_Y + 20
    this._propL.addChild(bubbla)
    const prox = { s: 0.4, y: bubbla.y, a: 1 }
    gsap.to(prox, {
      s: 1.5,
      y: BOBO_Y - 150,
      a: 0,
      duration: 1.1,
      ease: 'sine.out',
      onUpdate: () => {
        if (bubbla.destroyed) return
        bubbla.scale.set(prox.s)
        bubbla.y = prox.y
        bubbla.alpha = prox.a
      },
      onComplete: () => {
        if (!bubbla.destroyed) bubbla.destroy()
      },
    })
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Precis den färgen Bobo ville ha!')
    ctx.progress.complete()
    ctx.later(1.8, () => {
      if (!this._alive) return
      this._busy = false
      this._newOrder(ctx, false)
    })
  },

  // ---------------------------------------------------------------- tick ---

  _update(ctx, dtMS) {
    if (!this._alive || !this._world) return
    this._ctxRef = ctx
    this._frame++
    const dt = Math.min(dtMS || 16.7, 50)

    // kranen rinner
    const k = this._kran
    if (k.pouring) {
      this._idle = 0
      k.pourT -= dt
      const pal = this._lever.idx
      this._world.spawn(k.x + (Math.random() - 0.5) * 10, SPOUT_Y, { vx: 0, vy: 3.4, pal, ch: CH[pal] })
      this._toneT += dt
      if (this._toneT > 165) {
        this._toneT = 0
        const under = this._glasses[nearestIndex(k.x)]
        const f = Math.min(1, this._stats(under).n / FULLT)
        ctx.services.audio.tone({ freq: 210 + f * 520, dur: 0.11, type: 'sine', vol: 0.22 })
      }
      if (k.pourT <= 0) this._togglePour(ctx)
    }

    // glasen: lutning + synk
    for (const g of this._glasses) {
      if (g.held) g.wantAngle = this._tiltFor(g)
      const diff = g.wantAngle - g.angle
      // Lugn lutning: svänger mynningen för fort hinner väggen svepa förbi vätskan.
      if (Math.abs(diff) > 0.001) g.angle += diff * 0.05
    }
    this._carryAll()
    for (const g of this._glasses) this._syncGlass(g)

    this._world.update(dt)
    this._recolor()
    this._view.update()

    // hinken slukar allt som hamnar i den
    this._world.drain(this._hinkDrain.x, this._hinkDrain.y, 110, 130, { max: 6 })

    // Bobo dricker
    if (this._drink) {
      this._drink.t += dt
      const got = this._world.drain(BOBO_X - 20, BOBO_Y + 30, 190, 190, { max: 5 })
      this._drink.drained += got
      // Han TUGGAR/sväljer i takt med att saften faktiskt försvinner — reaktionen
      // hänger på mätningen (`got`), inte på en timer, så munnen rör sig bara när
      // det verkligen rinner i den.
      if (got && this._frame % 24 === 0) this._kar?.react('nam')
      if (got && this._frame % 8 === 0) {
        ctx.services.audio.tone({ freq: 300 + Math.min(1, this._drink.drained / 60) * 300, dur: 0.09, type: 'sine', vol: 0.18 })
      }
      const kvar = this._stats(this._drink.g).n
      if ((kvar < 6 && this._drink.t > 900) || this._drink.t > 5200) {
        this._world.drain(this._drink.g.x, this._drink.g.y - 110, 280, 300)
        this._finishServe(ctx)
      }
    }

    // var 12:e bildruta: färgreaktioner + beställningen
    if (this._frame % 12 === 0 && !this._busy) this._checkGlasses(ctx)

    // mjuk om-cue
    this._idle += dt
    if (this._idle > 6800 && !this._busy) {
      this._idle = 0
      this._hint = (this._hint + 1) % 2
      ctx.services.voice.say(
        this._hint === 0
          ? 'Dra kranen till ett glas och tryck på den!'
          : 'Tryck på ett glas och sedan på ett annat, så hälls saften över!'
      )
    }
  },

  // Vilket håll ska ett upplyft glas luta åt? Bara när det hålls ÖVER något att
  // hälla i — annars står det rakt och spiller inte av misstag.
  _tiltFor(g) {
    let best = null
    let bestD = 230
    for (const o of this._glasses) {
      if (o === g) continue
      const d = Math.abs(o.x - g.x)
      if (d < bestD && g.y < o.y - 120) {
        bestD = d
        best = o
      }
    }
    const dh = Math.abs(HINK_X - g.x)
    if (dh < bestD && g.y < GRATE_Y - 90) best = { x: HINK_X }
    if (!best) return 0
    // Positiv vinkel svänger mynningen åt HÖGER (Pixi: y nedåt). Luta mot målet.
    return best.x > g.x ? TILT : -TILT
  },

  _checkGlasses(ctx) {
    const nu = performance.now()
    for (const g of this._glasses) {
      const st = this._stats(g)
      // Töms glaset får det utropa sin färg igen nästa gång den blandas fram.
      if (st.n < 10) g.lastMix = -1
      // Ny färg upptäckt → berätta det, EN gång per glas och färg.
      // Minnet satt förut på spelet i stället för på glaset: två glas med var sin
      // blandfärg pingpongade `_lastMix` var 12:e bildruta, så spelet skrek "reveal"
      // + en röstreplik ~10 ggr/s i all evighet (uppmätt 48 ljud + 48 repliker på 5 s
      // helt utan input). Kylningen håller dessutom två samtidiga upptäckter isär.
      if (st.n > 26 && st.frac > 0.86 && st.dom > BLA && st.dom !== g.lastMix && nu - this._mixT > 1500) {
        g.lastMix = st.dom
        this._mixT = nu
        const rost = MIX_ROST[st.dom]
        if (rost) ctx.services.voice.say(rost)
        sparkle(this._propL, g.x, g.y - 150, { count: 8 })
        ctx.services.audio.sfx('reveal')
      }
      // beställningen uppfylld?
      if (
        this._order &&
        !this._busy &&
        !this._drink &&
        st.dom === this._order.pal &&
        st.n >= KLART &&
        st.frac > 0.88 &&
        Math.abs(g.x - g.homeX) < 8 &&
        Math.abs(g.angle) < 0.05
      ) {
        puff(this._propL, g.x, g.y - 220, { count: 8, color: PAL[st.dom].hex })
        this._serve(ctx, g)
        return
      }
    }
  },
}

// --- ritfunktioner ---------------------------------------------------------

// Glasets baksida: den svaga innerytan som vätskan ligger framför.
function paintGlassBack(g) {
  g.moveTo(-58, -222).lineTo(58, -222).lineTo(52, -20).lineTo(-52, -20).closePath().fill({ color: 0xdff0f7, alpha: 0.55 })
}

// Glasets framsida: kant, glans och fot. Ritas ÖVER vätskan (metabollen sväller
// utanför partiklarna, så ett glas under skulle läcka färg utanför kanten).
function paintGlassFront(g) {
  // vänster + höger vägg som genomskinligt glas
  g.moveTo(-75, -228).lineTo(-57, -228).lineTo(-52, -8).lineTo(-72, -8).closePath().fill({ color: 0xeaf6fb, alpha: 0.62 })
  g.moveTo(75, -228).lineTo(57, -228).lineTo(52, -8).lineTo(72, -8).closePath().fill({ color: 0xeaf6fb, alpha: 0.62 })
  // botten
  g.moveTo(-72, -8).lineTo(72, -8).lineTo(66, 4).lineTo(-66, 4).closePath().fill({ color: 0xd7ebf4, alpha: 0.9 })
  g.ellipse(0, 4, 66, 12).fill(0xc9e2ee)
  // kant upptill
  g.ellipse(0, -228, 75, 14).stroke({ width: 7, color: 0xdff0f7 })
  g.ellipse(0, -228, 75, 14).fill({ color: 0xffffff, alpha: 0.28 })
  // glansstreck
  g.roundRect(-44, -206, 13, 150, 7).fill({ color: 0xffffff, alpha: 0.5 })
  g.roundRect(36, -196, 7, 110, 4).fill({ color: 0xffffff, alpha: 0.32 })
  // ytterkontur
  g.moveTo(-75, -228).lineTo(-72, -8).lineTo(72, -8).lineTo(75, -228).stroke({ width: 5, color: 0xcfe6f0 })
}

function nearestIndex(x) {
  let bi = 0
  let bd = Infinity
  for (let i = 0; i < GLASS_X.length; i++) {
    const d = Math.abs(GLASS_X[i] - x)
    if (d < bd) {
      bd = d
      bi = i
    }
  }
  return bi
}

function lerpHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0)
}
