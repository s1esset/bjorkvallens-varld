// Grävmaskinen — bygg-/fysiklek (3–5 år). Zacke kör en grävmaskin. Barnet DRAR skopan
// ner i en oändlig hög för att gräva (skopan fylls), drar den fyllda skopan över
// dumpern och SLÄPPER → skopan tippar och korn rinner ut vid munnen. Lasten faller
// GRANULÄRT (en egen cellulär "falling-sand"-simulering, INTE matter.js) och lägger sig
// i högar i flaket. Fyll flaket till fyllnadslinjen → Bobo tutar och KÖR IVÄG med lasten,
// en tom dumper backar in med en NY sorts last. Spelet kan ALDRIG misslyckas: högen är
// oändlig, spill är bara kul, och en vindpust hjälper till på slutet av en lång paus.
// Allt ritas programmatiskt (Pixi Graphics).
//
// LASTER (variationsaxeln): fem material turas om per nivå — sand, grus, snö, småsten,
// godisströssel. Varje last har egen palett (även på högen man gräver ur), egen rasvinkel
// (branta laster kräver TVÅ cellers fall för att glida i sidled och bygger därför spetsiga
// högar i stället för att lägga sig platt), egen kornform, egna ljud, egna skatter och
// egna repliker.
//
// Simuleringen: ett rutnät (Int8Array, CELL=10) över flaket + marginal. WALL-celler
// (=9) bildar flakets väggar/golv så korn stannar inne. Var STEP_MS=28 ms körs ETT steg:
// iterera rader NERIFRÅN och UPP, flytta varje korn ner / ner-vänster / ner-höger
// (slumpad L/R-ordning) → naturliga högar. ALLA korn ritas i EN dedikerad Graphics
// (this._sandGfx), och bara när rutnätet FAKTISKT ändrats (_dirty) — vilande last kostar
// noll. Inget GSAP rör rutnätet → inherent exit-säkert.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, puff, burst, floatText, bigCelebration, sparkle, shake } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS } from '../../lib/theme.js'

// --- Rutnät (designkoordinater) ---
const CELL = 10 // cellstorlek
const ZX = 600 // simzonens vänsterkant (x)
const ZY = 200 // simzonens överkant (y)
const COLS = 52 // (1120-600)/10
const ROWS = 34 // (540-200)/10
const N_CELLS = COLS * ROWS
const WALL = 9 // väggcell-flagga
const SPECIAL = 4 // fjärde palettfärgen: guldkorn / isglitter / godisbit
const CAP = 48 // skopans kapacitet (korn)
const STEP_MS = 28 // ms mellan sim-steg (~36 steg/s)
const TOP_Y = 360 // flakets överkant
const FLOOR_Y = 500 // flakets golv
const TOP_ROW = Math.floor((TOP_Y - ZY) / CELL) // 16
// Hur tätt lasten packar sig under fyllnadslinjen. Används för att RITA linjen där
// lasten faktiskt hamnar när målet är nått — tidigare var linjen en lögn (se docs §5).
const FILL_FACTOR = 0.72

// --- Laster: en per nivå ------------------------------------------------------
// `pal` = fyra färger; 1–3 är vanliga nyanser, 4 (SPECIAL) är den glittriga med
// sannolikhet `specialP`. `steep` ger brantare högar. `radius`/`inset` formar kornen.
// Sandens repliker är de som redan HAR röstklipp — därför oförändrade strängar.
const CARGOS = [
  {
    id: 'sand',
    pal: [0xe8c98a, 0xd9b46f, 0xc89a55, 0xffd24a],
    specialP: 0.09,
    steep: false,
    radius: 0,
    inset: 0,
    scrape: { freq: 130, type: 'sawtooth', slideTo: 80, vol: 0.13 },
    hiss: 2200,
    fynd: ['💎', '🦴', '🐚', '⭐'],
    intro: 'Hjälp Zacke! Gräv sand och fyll lastbilen!',
    recue: 'Gräv mer sand!',
    full: 'Full last! Bra jobbat!',
  },
  {
    id: 'grus',
    pal: [0xa8b2ba, 0x8a939b, 0x6f7880, 0xc0a17a],
    specialP: 0.14,
    steep: false,
    radius: 1.6,
    inset: 0.8,
    scrape: { freq: 95, type: 'square', slideTo: 60, vol: 0.12 },
    hiss: 1400,
    fynd: ['🔩', '⚙️', '🔧', '💎'],
    intro: 'Nu gräver vi grus!',
    recue: 'Gräv mer grus!',
    full: 'Full last med grus! Bra jobbat!',
  },
  {
    id: 'sno',
    pal: [0xffffff, 0xf0f7ff, 0xdceaf7, 0xbfe9ff],
    specialP: 0.16,
    steep: true,
    radius: 4.6,
    inset: 0.4,
    scrape: { freq: 260, type: 'sine', slideTo: 190, vol: 0.1 },
    hiss: 900,
    fynd: ['❄️', '⛄', '🧊', '⭐'],
    intro: 'Nu skottar vi snö!',
    recue: 'Skotta mer snö!',
    full: 'Full last med snö! Bra jobbat!',
  },
  {
    id: 'sten',
    pal: [0xa39485, 0x8b7f74, 0x6f6459, 0x5c6b73],
    specialP: 0.13,
    steep: true,
    radius: 3.2,
    inset: 1.2,
    scrape: { freq: 80, type: 'square', slideTo: 55, vol: 0.13 },
    hiss: 700,
    fynd: ['💎', '🪨', '🦴', '🔮'],
    intro: 'Nu gräver vi småsten!',
    recue: 'Gräv mer småsten!',
    full: 'Full last med småsten! Bra jobbat!',
  },
  {
    id: 'godis',
    pal: [0xff6b6b, 0x4aa3df, 0x5bbf6a, 0xffd35c],
    specialP: 0.25,
    steep: false,
    radius: 4,
    inset: 2,
    scrape: { freq: 330, type: 'triangle', slideTo: 240, vol: 0.11 },
    hiss: 2800,
    fynd: ['🍭', '🍬', '🧁', '🍪'],
    intro: 'Nu öser vi godisströssel!',
    recue: 'Ös mer strössel!',
    full: 'Full last med godis! Bra jobbat!',
  },
]

// Spridning när lasten hälls. En LUGN, riktad häll ger en tät stråle (mindre spill),
// ett slarvigt kast ger en bred — skicklighet som belönas, aldrig bestraffas.
const SPREAD_TIGHT = [0, -1, 1]
const SPREAD_WIDE = [0, -1, 1, -2, 2, -3, 3]

// --- Skopans geometri / spelyta ---
const PIVOT_X = 480 // bom-led
const PIVOT_Y = 458
const BUCKET_HOME = { x: 300, y: 470 }
const MOUTH_DY = 30 // munnens y-offset från skopans mitt
const X_MIN = 110
const X_MAX = 1060
const Y_MIN = 130
const Y_MAX = 560
const IDLE_DELAY = 6 // s utan handling → röst-recue
const HELP_IDLE = 14 // s HELT utan handling innan en vindpust ens övervägs
const HELP_NEAR = 0.55 // vindpusten hjälper bara när lasten redan är så här långt gången

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Får ett korn glida i sidled ner? Branta laster (snö, småsten) kräver TVÅ cellers
// fall och bygger därför spetsiga högar; lösa laster (sand, grus) lägger sig platt.
function canSlide(grid, below, col, d, steep) {
  const c2 = col + d
  if (c2 < 0 || c2 >= COLS) return false
  if (grid[below + d] !== 0) return false
  if (!steep) return true
  const two = below + COLS + d
  return two >= N_CELLS || grid[two] === 0
}

export default {
  id: 'gravmaskinen',
  titleSv: 'Grävmaskinen',
  icon: '🚜',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'gravmaskinen',
  voiceIntro: 'Hjälp Zacke! Gräv sand och fyll lastbilen!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._acc = 0
    this._idle = 0
    this._helpT = 0
    this._fullHold = 0
    this._dragging = false
    this._resolving = false
    this._bucketCount = 0
    this._speed = 0
    this._lastScoopSfx = -1
    this._lastSpillFx = -1
    this._lastHiss = -1 // senaste kornrassel-ljud
    this._lastFynd = -100 // senaste skatt-fynd
    this._lastBeep = -1 // senaste backningspip
    this._digT = -100 // senaste grävtag (Zackes framåtluta)
    this._moved = 0 // rörliga korn senaste frame (rassel-intensitet)
    this._dirty = true // rutnätet har ändrats → rita om lasten
    this._meterR = -1
    this._pilePulsing = false

    this.grid = new Int8Array(N_CELLS)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildScene(ctx)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    // Nivå 0 är alltid sand → spelets inspelade instruktion. Kommer barnet tillbaka
    // till en snö-/godisnivå säger vi i stället vad DEN lasten är.
    ctx.services.voice.say(this._level === 0 ? this.voiceIntro : this._cargo.intro)
  },

  // ---- Scen (byggs en gång) ----------------------------------------------

  _buildScene(ctx) {
    // Varm bygg-/sandton som FÖRSTA barn (dekorativ, exit-säker).
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height, ground: true }))

    // Osynlig tryckyta för tap-tap-fallback (under skopan, ovanpå dekoren).
    this._tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._tapCatcher.eventMode = 'static'
    this._onCatchH = (e) => this._onCatchTap(ctx, e)
    this._tapCatcher.on('pointertap', this._onCatchH)
    this._root.addChild(this._tapCatcher)

    // Oändlig hög (vänster). Ritas kring ett eget centrum (pivot) så den kan pulsa
    // snyggt vid grävning utan att hoppa. Färgen sätts per last i _drawPile.
    this._pile = new Graphics()
    this._pile.pivot.set(240, 520)
    this._pile.position.set(240, 520)
    this._pile.eventMode = 'none'
    this._root.addChild(this._pile)

    // Grävmaskin + hytt + förar-Zacke.
    this._root.addChild(this._makeMachine())

    // RIGGEN: dumper + flak + linje + mätare + last i EN behållare, så hela ekipaget
    // kan KÖRA IVÄG med lasten vid full last och en tom dumper backa in.
    this._rig = new Container()
    this._rig.eventMode = 'none'
    this._root.addChild(this._rig)

    // RITAD dumper (P0 ASSETS) med Bobo som förare/mottagare.
    this._truck = this._makeTruck()
    this._truck.position.set(905, 558)
    this._rig.addChild(this._truck)

    this._bedGfx = new Graphics()
    this._bedGfx.eventMode = 'none'
    this._rig.addChild(this._bedGfx)

    this._fillLineGfx = new Graphics()
    this._fillLineGfx.eventMode = 'none'
    this._rig.addChild(this._fillLineGfx)

    // RITAD måltavla (P0 ASSETS) — var en 🎯-emoji.
    this._fillMarker = new Graphics()
    this._fillMarker.circle(0, 0, 19).fill(0xff6b6b)
    this._fillMarker.circle(0, 0, 13).fill(0xfffdf7)
    this._fillMarker.circle(0, 0, 8).fill(0xff6b6b)
    this._fillMarker.circle(0, 0, 3.5).fill(0xfffdf7)
    this._fillMarker.eventMode = 'none'
    this._rig.addChild(this._fillMarker)

    // Fyllnadsmätare: barnet ser framstegen utan att kunna läsa.
    this._meterGfx = new Graphics()
    this._meterGfx.eventMode = 'none'
    this._rig.addChild(this._meterGfx)

    // Lastens korn: alla ritas här (över flaket, under skopan).
    this._sandGfx = new Graphics()
    this._sandGfx.eventMode = 'none'
    this._rig.addChild(this._sandGfx)

    // Bommen (armen): ritas om varje frame från pivot till skopan.
    this._boom = new Graphics()
    this._boom.eventMode = 'none'
    this._root.addChild(this._boom)

    // Skopan (dra-objektet) — överst, interaktiv.
    this._bucket = this._makeBucket()
    this._bucket.position.set(BUCKET_HOME.x, BUCKET_HOME.y)
    this._root.addChild(this._bucket)

    this._onDownH = (e) => this._onDown(ctx, e)
    this._onMoveH = (e) => this._onMove(ctx, e)
    this._onUpH = (e) => this._onUp(ctx, e)
    this._bucket.on('pointerdown', this._onDownH)
    this._bucket.on('globalpointermove', this._onMoveH)
    this._bucket.on('pointerup', this._onUpH)
    this._bucket.on('pointerupoutside', this._onUpH)
  },

  // Högen man gräver ur bär LASTENS färger — snönivån har en snöhög, godisnivån
  // en strösselhög. Samma silhuett, ny värld.
  _drawPile(pal) {
    const g = this._pile
    if (!g || g.destroyed) return
    g.clear()
    // Markskugga under högen.
    g.ellipse(240, 612, 200, 26).fill({ color: 0x000000, alpha: 0.12 })
    // Tre lager (botten → topp), mjuk kulle med topp vid (240,360).
    g.moveTo(70, 612).quadraticCurveTo(150, 470, 240, 442).quadraticCurveTo(360, 470, 430, 612).fill(pal[2])
    g.moveTo(108, 612).quadraticCurveTo(180, 432, 240, 402).quadraticCurveTo(322, 446, 398, 612).fill(pal[1])
    g.moveTo(150, 612).quadraticCurveTo(212, 382, 240, 360).quadraticCurveTo(292, 402, 350, 612).fill(pal[0])
  },

  _makeMachine() {
    const c = new Container()
    c.eventMode = 'none'
    // RITAD grävmaskin (P0 ASSETS): larvband, hjul, chassi och en öppen hytt där
    // Zacke sitter. Tidigare var det en 🚜-emoji + en gul ruta med ett 🧒 i — exakt
    // det ASSETS-regeln förbjuder.
    const body = new Graphics()
    body.ellipse(430, 614, 108, 14).fill({ color: 0x000000, alpha: 0.14 })
    body.roundRect(352, 570, 156, 40, 20).fill(0x4a5560) // larvband
    body.roundRect(358, 576, 144, 28, 14).fill(0x6f7880)
    for (let i = 0; i < 6; i++) body.circle(378 + i * 21, 590, 9).fill(0x4a5560)
    body.circle(378, 590, 14).fill(0x8a939b)
    body.circle(482, 590, 14).fill(0x8a939b)
    body.roundRect(366, 528, 132, 46, 12).fill(0xffd35c).stroke({ width: 4, color: 0xe0a92c }) // chassi
    body.roundRect(372, 534, 120, 12, 6).fill({ color: 0xffe9a8, alpha: 0.9 })
    body.roundRect(486, 540, 26, 22, 6).fill(0x8a939b) // motorhuv bak
    c.addChild(body)
    // Hytt: ram + fönsterruta (Zacke syns genom rutan, inte i en bricka).
    const cab = new Graphics()
    cab.roundRect(392, 462, 78, 70, 12).fill(0xffd35c).stroke({ width: 5, color: 0xe0a92c })
    cab.roundRect(400, 470, 62, 48, 8).fill({ color: 0xbfe9ff, alpha: 0.55 })
    cab.moveTo(462, 470).lineTo(462, 518).stroke({ width: 3, color: 0xe0a92c, alpha: 0.6 })
    c.addChild(cab)
    // Förar-Zacke (enda avbildade människan) — ritad, sitter i hytten.
    const zacke = new Graphics()
    zacke.roundRect(415, 498, 30, 24, 8).fill(0x4aa3df) // överkropp
    zacke.circle(430, 486, 17).fill(0xffd9a8) // huvud
    zacke.moveTo(413, 480).quadraticCurveTo(430, 466, 447, 480).quadraticCurveTo(430, 474, 413, 480).fill(0xf5a623)
    zacke.circle(424, 486, 3).fill(0x33291f)
    zacke.circle(436, 486, 3).fill(0x33291f)
    zacke.moveTo(424, 494).quadraticCurveTo(430, 499, 436, 494).stroke({ width: 2.6, color: 0x33291f, cap: 'round' })
    zacke.circle(418, 491, 3.5).fill({ color: 0xff9ec4, alpha: 0.7 })
    zacke.circle(442, 491, 3.5).fill({ color: 0xff9ec4, alpha: 0.7 })
    // hjälm
    zacke.moveTo(411, 480).quadraticCurveTo(430, 458, 449, 480).closePath().fill(COLORS.orange)
    zacke.roundRect(408, 477, 44, 7, 3).fill(COLORS.orangeDark)
    // Pivot vid höfterna → andning och framåtluta roterar överkroppen, inte hela bilden.
    zacke.pivot.set(430, 522)
    zacke.position.set(430, 522)
    this._zacke = zacke
    c.addChild(zacke)
    return c
  },

  // Vilo-liv (P0 ASSETS): Zacke andas hela tiden och lutar sig mot skopan när barnet
  // gräver; Bobo gungar lätt i hytten. Värdena SKRIVS varje frame — inga tweens, som
  // loggen (tween-per-ruta) särskilt varnar för.
  _animateFigures(dt) {
    const z = this._zacke
    if (z && !z.destroyed) {
      z.y = 522 + Math.sin(this._t * 1.7) * 1.6
      const lutar = this._t - this._digT < 0.2 ? -0.16 : 0
      z.rotation += (lutar - z.rotation) * Math.min(1, dt * 9)
    }
    const arm = this._driverArm
    // Under firandet vinkar armen via en tween — rör den inte då.
    if (arm && !arm.destroyed && !this._resolving) {
      arm.rotation = 0.5 + Math.sin(this._t * 1.15) * 0.09
    }
  },

  // RITAD dumper (P0 ASSETS): hytt, flak, hjul och strålkastare — var en 🚛-emoji.
  // Bobo sitter vid ratten: mottagaren som tar emot lasten och kör iväg med den.
  _makeTruck() {
    const c = new Container()
    const g = new Graphics()
    g.ellipse(0, 60, 118, 14).fill({ color: 0x000000, alpha: 0.14 })
    g.roundRect(-104, -34, 92, 78, 10).fill(0x8a939b) // flak
    g.roundRect(-104, -34, 92, 12, 6).fill(0xb8c2ca)
    for (let i = 0; i < 3; i++) g.rect(-92 + i * 28, -22, 8, 60).fill({ color: 0x6f7880, alpha: 0.8 })
    g.roundRect(-8, -18, 74, 62, 10).fill(0x5bbf6a) // hytt
    g.roundRect(2, -8, 44, 30, 7).fill({ color: 0xbfe9ff, alpha: 0.7 }) // ruta
    g.roundRect(-8, 30, 74, 14, 6).fill(0x3f8f43)
    g.circle(62, 16, 7).fill(0xffd35c) // strålkastare
    g.roundRect(-110, 30, 176, 16, 8).fill(0x4a5560) // chassibalk
    for (const wx of [-78, -34, 40]) {
      g.circle(wx, 46, 20).fill(0x33291f)
      g.circle(wx, 46, 10).fill(0xb8c2ca)
    }
    g.eventMode = 'none'
    c.addChild(g)

    // Bobo i rutan (mottagaren) + en arm som vinkar när lasten är full.
    const bobo = makeMascot(11)
    bobo.position.set(24, 10)
    c.addChild(bobo)
    const arm = new Graphics()
    arm.moveTo(0, 0).lineTo(0, -20).stroke({ width: 6, color: COLORS.orange, cap: 'round' })
    arm.circle(0, -22, 4.5).fill(COLORS.cream)
    arm.position.set(46, 16)
    arm.rotation = 0.5
    arm.eventMode = 'none'
    this._driverArm = arm
    c.addChild(arm)

    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  _makeBucket() {
    const c = new Container()
    const body = new Graphics()
    // Metallskopa (trapets, öppen upptill).
    body.poly([-54, -30, 54, -30, 40, 40, -40, 40]).fill(0xb8c0c8).stroke({ width: 4, color: 0x8a939b })
    // Inre skugga.
    body.poly([-46, -22, 46, -22, 34, 34, -34, 34]).fill(0xa7b0b8)
    // Grävtänder nedtill.
    for (const tx of [-30, -10, 10, 30]) {
      body.poly([tx - 6, 40, tx + 6, 40, tx, 53]).fill(0x9aa3ab).stroke({ width: 2, color: 0x8a939b })
    }
    c.addChild(body)
    // Lastfyllnad (ritas om vid behov, ovanpå skopan).
    this._bucketSand = new Graphics()
    c.addChild(this._bucketSand)
    // Träffyta ≥96px.
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 78)
    return c
  },

  _updateBucketSand(count) {
    const g = this._bucketSand
    if (!g || g.destroyed) return
    g.clear()
    const ratio = clamp(count / CAP, 0, 1)
    if (ratio <= 0.02) return
    const pal = this._pal
    const botY = 34
    const topY = botY - ratio * 54
    // Trapetsbredd interpolerad (smalare nedtill).
    const widthAt = (y) => 34 + ((botY - y) / 56) * 12
    const wb = widthAt(botY)
    const wt = widthAt(topY)
    g.poly([-wb, botY, wb, botY, wt, topY, -wt, topY]).fill(pal[1])
    g.poly([-wt, topY, wt, topY, wt - 4, topY + 5, -wt + 4, topY + 5]).fill({ color: pal[0], alpha: 0.85 })
  },

  // ---- Nivå / last / flak -------------------------------------------------

  _levelConfig(level) {
    if (level <= 1) return { leftX: 745, rightX: 985, target: 120 }
    if (level <= 3) return { leftX: 725, rightX: 1005, target: 160 }
    if (level <= 5) return { leftX: 720, rightX: 1010, target: 205 }
    return { leftX: 715, rightX: 1015, target: 240 + ((Math.random() * 30) | 0) }
  },

  _loadLevel(ctx, level, announce = false) {
    if (!this._alive) return
    this._level = level
    const cfg = this._levelConfig(level)
    this._cfg = cfg
    this._target = cfg.target
    // Ny last var nivå — hela världen (hög, korn, ljud, skatter, repliker) byter skepnad.
    this._cargo = CARGOS[level % CARGOS.length]
    this._pal = this._cargo.pal

    this._setWalls(cfg)

    // Fyllnadslinjen HÄRLEDS ur målet så den inte ljuger. Tidigare satt linjen 3–4
    // rader ovanför den mängd som faktiskt krävdes (mål 55 korn ≈ 2,4 rader mot en
    // linje 6 rader upp) — nivån klarades långt innan lasten syntes nå den.
    const interior = Math.max(1, this._rightCol - this._leftCol - 1)
    const rows = this._target / (interior * FILL_FACTOR)
    this._fillRow = clamp(Math.round(this._floorRow - rows), TOP_ROW + 1, this._floorRow - 2)
    this._fillY = this._fillRow * CELL + ZY
    this._lineCells = Math.max(6, Math.floor(interior * 0.5))

    this._drawPile(this._pal)
    this._drawBed()
    this._drawFillLine()
    this._meterR = -1
    this._drawMeter(0)

    // Nollställ rundans tillstånd.
    this._bucketCount = 0
    this._updateBucketSand(0)
    this._resolving = false
    this._dragging = false
    this._speed = 0
    this._helpT = 0
    this._fullHold = 0
    this._idle = 0
    this._dirty = true
    gsap.killTweensOf(this._bucket)
    this._bucket.rotation = 0
    this._bucket.position.set(BUCKET_HOME.x, BUCKET_HOME.y)
    this._renderSand()

    if (announce) ctx.services.voice.say(this._cargo.intro)
  },

  _setWalls(cfg) {
    const grid = this.grid
    grid.fill(0)
    const lc = clamp(Math.floor((cfg.leftX - ZX) / CELL), 1, COLS - 2)
    const rc = clamp(Math.floor((cfg.rightX - ZX) / CELL), 1, COLS - 2)
    const floorRow = clamp(Math.floor((FLOOR_Y - ZY) / CELL), 0, ROWS - 2) // 30
    for (let row = TOP_ROW; row <= floorRow; row++) {
      grid[row * COLS + lc] = WALL
      grid[row * COLS + rc] = WALL
    }
    for (let row = floorRow; row <= floorRow + 1 && row < ROWS; row++) {
      for (let col = lc; col <= rc; col++) grid[row * COLS + col] = WALL
    }
    this._leftCol = lc
    this._rightCol = rc
    this._floorRow = floorRow
  },

  _drawBed() {
    const g = this._bedGfx
    if (!g || g.destroyed) return
    g.clear()
    const lwx = this._leftCol * CELL + ZX
    const rwx = this._rightCol * CELL + ZX
    const fy = this._floorRow * CELL + ZY
    const h = fy - TOP_Y
    // Mörk bakgrundspanel (djup) bakom lasten.
    g.roundRect(lwx + CELL, TOP_Y, rwx - lwx - CELL, h, 8).fill({ color: 0x6b4326, alpha: 0.16 })
    // Golv.
    g.roundRect(lwx - 8, fy, rwx - lwx + CELL + 16, 2 * CELL, 6).fill(COLORS.brown).stroke({ width: 3, color: 0x6b4326 })
    // Vänster vägg.
    g.roundRect(lwx - 8, TOP_Y, CELL + 8, h + CELL, 6).fill(COLORS.brown).stroke({ width: 3, color: 0x6b4326 })
    // Höger vägg.
    g.roundRect(rwx, TOP_Y, CELL + 8, h + CELL, 6).fill(COLORS.brown).stroke({ width: 3, color: 0x6b4326 })
    // Chassi-balk under flaket — kopplar ihop flaket med lastbilen (flaket sitter PÅ den).
    g.roundRect(lwx - 6, fy + 2 * CELL, rwx - lwx + CELL + 12, 12, 5).fill(0x3a3f45)
    // Centrera dumpern under flaket och skala den mot flakets bredd → EN dumper.
    if (this._truck && !this._truck.destroyed) {
      this._truck.position.set((lwx + rwx) / 2, fy + 78)
      this._truck.scale.set(clamp((rwx - lwx) / 210, 1, 1.5))
    }
  },

  _drawFillLine() {
    const g = this._fillLineGfx
    if (!g || g.destroyed) return
    g.clear()
    const y = this._fillY
    const x0 = this._leftCol * CELL + ZX + CELL
    const x1 = this._rightCol * CELL + ZX
    for (let x = x0; x < x1 - 8; x += 24) {
      g.rect(x, y - 2, 14, 4).fill({ color: COLORS.yellow, alpha: 0.85 })
    }
    if (this._fillMarker && !this._fillMarker.destroyed) this._fillMarker.position.set(x1 + 24, y)
  },

  // Fyllnadsmätare vid sidan av flaket — framsteg utan en enda bokstav.
  _drawMeter(ratio) {
    const g = this._meterGfx
    if (!g || g.destroyed) return
    if (Math.abs(ratio - this._meterR) < 0.015) return
    this._meterR = ratio
    g.clear()
    const x = this._rightCol * CELL + ZX + 52
    const y0 = TOP_Y + 6
    const h = FLOOR_Y - y0
    g.roundRect(x, y0, 22, h, 11).fill({ color: COLORS.cream, alpha: 0.85 })
    // Fast, avläsbar färg — INTE lastens. Mätaren är en UI-kontroll, och med lastens
    // egen färg blev snönivåns mätare vit på gräddvitt, alltså osynlig (sett i bild).
    const fh = (h - 6) * clamp(ratio, 0, 1)
    if (fh > 2) g.roundRect(x + 3, y0 + 3 + (h - 6 - fh), 16, fh, 8).fill(COLORS.green)
    g.roundRect(x, y0, 22, h, 11).stroke({ width: 3, color: COLORS.brown })
    // Målmarkering i mätarens topp.
    g.roundRect(x - 2, y0 - 5, 26, 6, 3).fill(COLORS.yellow)
  },

  // ---- Drag: gräv-medan-du-drar + tippa-vid-släpp ------------------------

  _onDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._tapTl?.kill()
    this._dragging = true
    const p = this._root.toLocal(e.global)
    this._grabDX = p.x - this._bucket.x
    this._grabDY = p.y - this._bucket.y
    this._dragDist = 0
    this._speed = 0
    this._lastScoopX = this._bucket.x
    this._lastScoopY = this._bucket.y + MOUTH_DY
    this._idle = 0
    this._helpT = 0
    pop(this._bucket)
    ctx.services.audio.sfx('tap')
  },

  _onMove(ctx, e) {
    if (!this._alive || !this._dragging || this._resolving) return
    const p = this._root.toLocal(e.global)
    const nx = clamp(p.x - this._grabDX, X_MIN, X_MAX)
    const ny = clamp(p.y - this._grabDY, Y_MIN, Y_MAX)
    const step = Math.hypot(nx - this._bucket.x, ny - this._bucket.y)
    this._dragDist += step
    // Utjämnad fart → avgör om hällningen blir en tät stråle eller ett brett kast.
    this._speed = this._speed * 0.72 + step * 0.28
    this._bucket.x = nx
    this._bucket.y = ny
    this._idle = 0
    this._helpT = 0

    const munX = nx
    const munY = ny + MOUTH_DY
    const digging = this._digAt(ctx, munX, munY)
    // Kort skopa-darrning medan man gräver (annars rakt hängande).
    this._bucket.rotation = digging ? (Math.random() * 2 - 1) * 0.045 : 0
    this._lastScoopX = munX
    this._lastScoopY = munY
  },

  // Högens yta vid x (Infinity utanför högen).
  _pileSurf(x) {
    if (x < 100 || x > 400) return Infinity
    return 360 + (Math.abs(x - 240) / 160) * 230
  },

  // Ett grävtag. Fyller efter hur LÅNGT och hur DJUPT munnen sveper — ett djupt tag
  // ger nästan tre gånger så mycket som ett skrap i ytan. Returnerar true om det grävs.
  _digAt(ctx, munX, munY) {
    if (this._bucketCount >= CAP) return false
    const surf = this._pileSurf(munX)
    if (munY <= surf) return false
    const moved = Math.hypot(munX - this._lastScoopX, munY - this._lastScoopY)
    this._digT = this._t // Zacke lutar sig fram så länge det grävs
    const depth = clamp((munY - surf) / 120, 0, 1)
    this._bucketCount = Math.min(CAP, this._bucketCount + (moved / 6.5) * (0.55 + 1.05 * depth))
    this._updateBucketSand(this._bucketCount)
    if (this._t - this._lastScoopSfx > 0.14) {
      this._lastScoopSfx = this._t
      // Kornigt skrap i lastens egen klangfärg.
      ctx.services.audio.tone({ dur: 0.11, ...this._cargo.scrape })
      puff(ctx.fxLayer, munX, munY, { count: 3, color: this._pal[1] })
      this._pulsePile()
      this._maybeFynd(ctx, munX, munY)
    }
    return true
  },

  // Gräver man djupt kan en begravd skatt dyka upp — olika fynd per last.
  _maybeFynd(ctx, x, y) {
    if (!this._alive || y < 470) return // bara djupa grävtag
    if (this._t - this._lastFynd < 7 || Math.random() > 0.16) return
    this._lastFynd = this._t
    const list = this._cargo.fynd
    const tok = list[(Math.random() * list.length) | 0]
    sparkle(ctx.fxLayer, x, y - 10, { count: 8 })
    floatText(ctx.fxLayer, x, y - 20, tok, { fontSize: 64, rise: 120 })
    ctx.services.audio.sfx('reveal')
    ctx.services.audio.tone({ freq: 1200, dur: 0.18, type: 'sine', vol: 0.18, slideTo: 1800 })
    ctx.services.voice.say('Titta, en skatt!')
  },

  _onUp(ctx, e) {
    if (!this._alive || !this._dragging) return
    this._dragging = false
    if (this._resolving) return
    // Kort gest (<14px) = tap → tap-tap-fallback.
    if (this._dragDist < 14) {
      const p = this._root.toLocal(e.global)
      this._handleTap(ctx, p.x, p.y)
      return
    }
    // Drag-släpp: har skopan last → tippa där fingret släpptes. En LUGN hand ger en
    // tät stråle, ett ryck ger ett brett kast med mer spill.
    if (this._bucketCount > 0) this._tip(ctx, this._speed < 7)
  },

  _onCatchTap(ctx, e) {
    if (!this._alive || this._dragging || this._resolving) return
    const p = this._root.toLocal(e.global)
    this._handleTap(ctx, p.x, p.y)
  },

  // Tap-tap-fallback: tap vid högen GRÄVER (riktig animation), tap över flaket tippar.
  _handleTap(ctx, x, y) {
    if (this._resolving) return
    this._idle = 0
    this._helpT = 0
    const overBed = x >= this._cfg.leftX - 30 && x <= this._cfg.rightX + 30
    if (this._bucketCount > 0 && (overBed || x >= ZX)) {
      const tx = clamp(x, this._cfg.leftX, this._cfg.rightX)
      this._moveBucketTo(tx, 300, () => this._tip(ctx, true))
    } else if (x < 470) {
      this._tapDig(ctx)
    } else {
      // Lekfullt neutralt svar (aldrig "fel").
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, x, y, { count: 4 })
    }
  },

  // Tap vid högen: skopan ÅKER NER i högen och fyller sig medan munnen sveper genom
  // materialet — samma _digAt som vid drag. Tidigare sattes _bucketCount = 24 rakt av,
  // vilket gav last utan att skopan rört högen (fusk som bröt illusionen).
  _tapDig(ctx) {
    const b = this._bucket
    if (!b || b.destroyed) return
    gsap.killTweensOf(b)
    this._tapTl?.kill()
    this._lastScoopX = b.x
    this._lastScoopY = b.y + MOUTH_DY
    const step = () => {
      if (!this._alive || this._resolving || b.destroyed) return
      const mx = b.x
      const my = b.y + MOUTH_DY
      if (this._digAt(ctx, mx, my)) b.rotation = (Math.random() * 2 - 1) * 0.05
      this._lastScoopX = mx
      this._lastScoopY = my
    }
    this._tapTl = gsap.timeline({
      onComplete: () => {
        if (this._alive && !b.destroyed) b.rotation = 0
      },
    })
    this._tapTl
      .to(b, { x: 170, y: 470, duration: 0.3, ease: 'power2.inOut' })
      .to(b, { x: 320, y: 520, duration: 0.8, ease: 'sine.inOut', onUpdate: step })
      .to(b, { x: 330, y: 420, duration: 0.32, ease: 'power2.out' })
  },

  _moveBucketTo(tx, ty, onDone) {
    gsap.killTweensOf(this._bucket)
    this._tapTl?.kill()
    gsap.to(this._bucket, {
      x: tx,
      y: ty,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        if (this._alive) onDone?.()
      },
    })
  },

  _tip(ctx, tight = true) {
    if (!this._alive || this._resolving || this._bucketCount <= 0) return
    const n = Math.round(this._bucketCount)
    this._bucketCount = 0
    this._updateBucketSand(0)
    ctx.services.audio.sfx('whoosh')
    const mx = this._bucket.x
    const my = this._bucket.y + MOUTH_DY
    this._spawnGrains(mx, my, n, tight)
    // Damm när lasten rinner ut + ett litet skärm-skutt när en stor mängd rasar.
    puff(ctx.fxLayer, mx, my, { count: 6, color: this._pal[0] })
    if (n >= 18) shake(this._root, { intensity: 5, duration: 0.32 })
    // En lugn, riktad häll kvitteras — aldrig en tillsägelse när den är slarvig.
    if (tight && n >= 10) {
      sparkle(ctx.fxLayer, mx, my - 12, { count: 6 })
      ctx.services.audio.tone({ freq: 880, dur: 0.14, type: 'sine', vol: 0.12, slideTo: 1180 })
    }
    this._helpT = 0
    // Tipp-animation (luta fram & tillbaka). Position orörd → bommen håller ihop.
    const b = this._bucket
    gsap.killTweensOf(b)
    gsap
      .timeline()
      .to(b, { rotation: -0.7, duration: 0.22, ease: 'power2.out' })
      .to(b, { rotation: 0, duration: 0.32, ease: 'back.out(2)' })
  },

  _pulsePile() {
    const s = this._pile
    if (this._pilePulsing || !s || s.destroyed) return
    this._pilePulsing = true
    gsap
      .timeline({
        onComplete: () => {
          this._pilePulsing = false
          if (!s.destroyed) s.scale.set(1)
        },
      })
      .to(s.scale, { x: 0.96, y: 1.04, duration: 0.1, ease: 'sine.out' })
      .to(s.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out(2)' })
  },

  // ---- Kornsimulering (cellulär falling-sand) ----------------------------

  _spawnGrains(munX, munY, n, tight = true) {
    const grid = this.grid
    const overBed = munX >= this._cfg.leftX && munX <= this._cfg.rightX
    const minC = overBed ? this._leftCol + 1 : 1
    const maxC = overBed ? this._rightCol - 1 : COLS - 2
    const baseCol = clamp(Math.round((munX - ZX) / CELL), minC, maxC)
    const baseRow = clamp(Math.floor((munY - ZY) / CELL), 0, this._floorRow - 1)
    const spread = tight ? SPREAD_TIGHT : SPREAD_WIDE
    const specialP = this._cargo.specialP
    for (let k = 0; k < n; k++) {
      const col = clamp(baseCol + spread[k % spread.length], minC, maxC)
      // Hitta tomma celler från munnens höjd och uppåt (hoppar över väggar/last).
      let row = baseRow
      while (row >= 0 && grid[row * COLS + col] !== 0) row--
      if (row < 0) continue
      grid[row * COLS + col] = Math.random() < specialP ? SPECIAL : 1 + ((Math.random() * 3) | 0)
    }
    this._dirty = true
  },

  // ETT sim-steg: nerifrån-upp; varje korn faller ner / ner-vänster / ner-höger.
  _simStep(ctx) {
    const grid = this.grid
    const steep = this._cargo.steep
    let moved = 0 // räkna rörliga korn → rassel-intensitet
    for (let row = ROWS - 2; row >= 0; row--) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col
        const v = grid[i]
        if (v < 1 || v > SPECIAL) continue // tom eller WALL
        const below = i + COLS
        if (grid[below] === 0) {
          grid[below] = v
          grid[i] = 0
          moved++
          continue
        }
        const d1 = Math.random() < 0.5 ? -1 : 1
        if (canSlide(grid, below, col, d1, steep)) {
          grid[below + d1] = v
          grid[i] = 0
          moved++
          continue
        }
        if (canSlide(grid, below, col, -d1, steep)) {
          grid[below - d1] = v
          grid[i] = 0
          moved++
          continue
        }
        // annars vila
      }
    }
    if (moved > 0) this._dirty = true
    this._moved += moved
    // Dränera nedersta raden (spill utanför flaket) — bara kul, aldrig straff.
    const base = (ROWS - 1) * COLS
    for (let col = 0; col < COLS; col++) {
      const v = grid[base + col]
      if (v >= 1 && v <= SPECIAL) {
        grid[base + col] = 0
        this._dirty = true
        if (this._t - this._lastSpillFx > 0.25) {
          this._lastSpillFx = this._t
          const x = col * CELL + ZX + CELL / 2
          ctx.services.audio.sfx('soft')
          puff(ctx.fxLayer, x, 596, { count: 3, color: this._pal[1] })
          floatText(ctx.fxLayer, x, 600, '😄', { fontSize: 46 })
        }
      }
    }
  },

  _renderSand() {
    const g = this._sandGfx
    if (!g || g.destroyed) return
    g.clear()
    const grid = this.grid
    const pal = this._pal
    const c = this._cargo
    const ins = c.inset
    const sz = CELL - ins * 2
    const rad = c.radius
    for (let row = 0; row < ROWS; row++) {
      const ry = row * CELL + ZY + ins
      const rb = row * COLS
      for (let col = 0; col < COLS; col++) {
        const v = grid[rb + col]
        if (v < 1 || v > SPECIAL) continue
        const rx = col * CELL + ZX + ins
        if (rad > 0) g.roundRect(rx, ry, sz, sz, rad).fill(pal[v - 1])
        else g.rect(rx, ry, sz, sz).fill(pal[v - 1])
      }
    }
  },

  // Räkna VILANDE korn inne i flaket: totalt + de på/ovanför fyllnadslinjen.
  // Ett korn som fortfarande faller har en tom cell under sig och räknas INTE — annars
  // räknas hela strålen medan den är i luften, och en enda hög tippning kan utlösa
  // "full last" direkt (mätt: nivån klarades på 3,4 s i harnessen).
  _countFill() {
    const grid = this.grid
    let total = 0
    let aboveLine = 0
    for (let col = this._leftCol + 1; col < this._rightCol; col++) {
      for (let row = 0; row < this._floorRow; row++) {
        const v = grid[row * COLS + col]
        if (v < 1 || v > SPECIAL) continue
        if (grid[(row + 1) * COLS + col] === 0) continue // faller fortfarande
        total++
        if (row <= this._fillRow) aboveLine++
      }
    }
    return { total, aboveLine }
  },

  // ---- Uppdatering --------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt

    // Stega simuleringen (fast tidssteg).
    this._acc += ticker.deltaMS
    let steps = 0
    while (this._acc >= STEP_MS && steps < 4) {
      this._simStep(ctx)
      this._acc -= STEP_MS
      steps++
    }
    // Rita bara om rutnätet ändrats — en vilande last kostar ingenting.
    if (this._dirty) {
      this._renderSand()
      this._dirty = false
    }
    this._drawBoom()
    this._animateFigures(dt)

    // Kornigt rassel medan lasten rinner (intensitet ∝ antal rörliga korn).
    if (this._moved > 2 && this._t - this._lastHiss > 0.08) {
      this._lastHiss = this._t
      const intensity = clamp(this._moved / 30, 0.15, 1)
      const base = this._cargo.hiss
      ctx.services.audio.tone({
        freq: base + Math.random() * base * 0.4,
        dur: 0.05,
        type: 'sawtooth',
        vol: 0.05 * intensity,
      })
    }
    // Lasten räknas först när den lagt sig — så länge korn rasar är höjden inte sann.
    const settling = this._moved > 2
    this._moved = 0

    if (this._resolving) return

    // Full last?
    const { total, aboveLine } = this._countFill()
    // Mätaren visar den av de TVÅ vägarna till full last som kommit längst. Med bara
    // korn-andelen stod mätaren på 45 % när en brant snölast redan nått linjen — två
    // mätare som säger olika saker är värre än en som ljuger.
    this._drawMeter(Math.max(total / this._target, aboveLine / this._lineCells))
    const isFull = total >= this._target || aboveLine >= this._lineCells
    this._fullHold = isFull && !settling ? this._fullHold + dt : 0
    if (this._fullHold > 0.45) {
      this._onFull(ctx)
      return
    }

    // Idle-recue.
    if (!this._dragging) {
      this._idle += dt
      if (this._idle > IDLE_DELAY) {
        this._idle = 0
        this._reCue(ctx)
      }
      // Mjuk hjälp: bara efter en LÅNG paus, och bara som en sista knuff när lasten
      // redan är nästan färdig. Målet sänks aldrig — barnets egna grävtag bär lasten.
      this._helpT += dt
      if (this._helpT > HELP_IDLE) {
        this._helpT = 0
        if (total >= this._target * HELP_NEAR) this._gust(ctx, total)
        else this._reCue(ctx)
      }
    }
  },

  // Bommen som en RIKTIG grävarm: bom + knäled + sticka, inte en rak pinne. Knäet
  // ligger vinkelrätt UPPÅT från linjen pivot→skopa, och en tung skopa får armen att
  // sjunka en aning — hydraulik-känsla utan en enda extra tween.
  _drawBoom() {
    const g = this._boom
    if (!g || g.destroyed || !this._bucket || this._bucket.destroyed) return
    g.clear()
    const sag = (this._bucketCount / CAP) * 5
    const bx = this._bucket.x
    const by = this._bucket.y - 22 + sag
    const dx = bx - PIVOT_X
    const dy = by - PIVOT_Y
    const len = Math.hypot(dx, dy) || 1
    // Vinkelrät enhetsvektor, vänd så knäet alltid pekar uppåt i bild.
    let nx = -dy / len
    let ny = dx / len
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    const bend = clamp(len * 0.2, 12, 48) - sag
    const kx = (PIVOT_X + bx) / 2 + nx * bend
    const ky = (PIVOT_Y + by) / 2 + ny * bend
    // Bom (pivot → knä) och sticka (knä → skopa).
    g.moveTo(PIVOT_X, PIVOT_Y).lineTo(kx, ky).stroke({ width: 26, color: COLORS.brown, cap: 'round' })
    g.moveTo(kx, ky).lineTo(bx, by).stroke({ width: 21, color: COLORS.brown, cap: 'round' })
    g.moveTo(PIVOT_X, PIVOT_Y).lineTo(kx, ky).stroke({ width: 8, color: 0xb07a4f, cap: 'round', alpha: 0.9 })
    g.moveTo(kx, ky).lineTo(bx, by).stroke({ width: 6, color: 0xb07a4f, cap: 'round', alpha: 0.9 })
    // Hydraulcylinder längs bommen.
    const hx = PIVOT_X + (kx - PIVOT_X) * 0.55 - nx * 13
    const hy = PIVOT_Y + (ky - PIVOT_Y) * 0.55 - ny * 13
    g.moveTo(PIVOT_X + nx * 4, PIVOT_Y + ny * 4).lineTo(hx, hy).stroke({ width: 9, color: 0x8a939b, cap: 'round' })
    // Leder.
    g.circle(kx, ky, 11).fill(COLORS.orangeDark).stroke({ width: 3, color: COLORS.yellow })
    g.circle(PIVOT_X, PIVOT_Y, 16).fill(COLORS.orangeDark).stroke({ width: 4, color: COLORS.yellow })
  },

  _reCue(ctx) {
    ctx.services.voice.say(this._cargo.recue)
    if (this._bucket && !this._bucket.destroyed) wiggle(this._bucket)
    floatText(ctx.fxLayer, 240, 360, '⬇️', { fontSize: 48 })
  },

  // Vindpust: en sista liten knuff när lasten nästan är full och barnet stått still
  // länge. Ger BARA det som fattas, högst 14 korn, och rör aldrig målet.
  _gust(ctx, total) {
    if (!this._alive || this._resolving) return
    const missing = Math.max(0, this._target - total)
    const n = Math.min(14, missing)
    if (n <= 0) return
    const cx = (this._cfg.leftX + this._cfg.rightX) / 2
    floatText(ctx.fxLayer, cx, 320, '💨', { fontSize: 60 })
    ctx.services.audio.sfx('soft')
    ctx.services.voice.say('En vindpust hjälper till!')
    this._spawnGrains(cx, 300, n, false)
  },

  _onFull(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    // Riktig två-tons lastbils-tuta.
    ctx.services.audio.tone({ freq: 320, dur: 0.3, type: 'square', vol: 0.22 })
    ctx.services.audio.tone({ freq: 250, dur: 0.45, type: 'square', vol: 0.22, delay: 0.28 })
    ctx.services.voice.say(this._cargo.full)
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, (this._cfg.leftX + this._cfg.rightX) / 2, TOP_Y)
    // Bobo vinkar från hytten — mottagaren som tar emot lasten.
    const arm = this._driverArm
    if (arm && !arm.destroyed) {
      gsap.killTweensOf(arm)
      gsap.to(arm, {
        rotation: 1.1,
        duration: 0.16,
        yoyo: true,
        repeat: 5,
        ease: 'sine.inOut',
        onComplete: () => {
          if (!arm.destroyed) arm.rotation = 0.5
        },
      })
    }

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('lastbilar', (ctx.progress.get().custom?.lastbilar || 0) + 1)
    ctx.progress.complete()

    this._deliver(ctx)
  },

  // Spelets egen finish: den fyllda dumpern KÖR IVÄG med lasten (hela riggen — flak,
  // last och allt — rullar ut ur bild), och en tom backar in med en ny sorts last.
  _deliver(ctx) {
    const rig = this._rig
    if (!rig || rig.destroyed) return
    this._deliverTl?.kill()
    this._deliverTl = gsap
      .timeline({ delay: 0.85 })
      .add(() => {
        if (this._alive) ctx.services.voice.say('Bobo kör iväg med lasten!')
      })
      .to(rig, { x: -22, duration: 0.3, ease: 'back.in(2)' }) // liten sats bakåt före starten
      .to(rig, {
        x: 620,
        duration: 1.0,
        ease: 'power2.in',
        onUpdate: () => {
          if (!this._alive) return
          if (this._t - this._lastBeep > 0.3) {
            this._lastBeep = this._t
            puff(ctx.fxLayer, this._truck.x + rig.x - 120, 600, { count: 4, color: 0xd8d2c4 })
          }
        },
      })
      .add(() => {
        if (!this._alive) return
        // Ny last laddas medan riggen är utanför bild. _loadLevel öppnar spelet igen,
        // så vi låser det direkt tills den tomma dumpern faktiskt står på plats.
        this._loadLevel(ctx, this._level + 1, true)
        this._resolving = true
      })
      // Den tomma dumpern BACKAR in från samma håll (höger). Att i stället låta den
      // komma från vänster skulle köra rakt igenom grävmaskinen och högen.
      .to(
        rig,
        {
          x: 0,
          duration: 0.95,
          ease: 'power2.out',
          onUpdate: () => {
            if (!this._alive) return
            if (this._t - this._lastBeep > 0.55) {
              this._lastBeep = this._t
              ctx.services.audio.tone({ freq: 1100, dur: 0.12, type: 'square', vol: 0.12 })
            }
          },
        },
        '+=0.2',
      )
      .add(() => {
        if (!this._alive) return
        this._resolving = false
        this._idle = 0
        this._helpT = 0
      })
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._deliverTl?.kill()
    this._tapTl?.kill()

    if (this._bucket && !this._bucket.destroyed) {
      this._bucket.off('pointerdown', this._onDownH)
      this._bucket.off('globalpointermove', this._onMoveH)
      this._bucket.off('pointerup', this._onUpH)
      this._bucket.off('pointerupoutside', this._onUpH)
      gsap.killTweensOf(this._bucket)
      gsap.killTweensOf(this._bucket.scale)
    }
    if (this._tapCatcher && !this._tapCatcher.destroyed) this._tapCatcher.off('pointertap', this._onCatchH)
    if (this._rig && !this._rig.destroyed) gsap.killTweensOf(this._rig)
    if (this._truck && !this._truck.destroyed) gsap.killTweensOf(this._truck)
    if (this._driverArm && !this._driverArm.destroyed) gsap.killTweensOf(this._driverArm)
    if (this._pile && !this._pile.destroyed) {
      gsap.killTweensOf(this._pile)
      gsap.killTweensOf(this._pile.scale)
    }
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
