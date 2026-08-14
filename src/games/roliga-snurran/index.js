// Roliga Snurran — en spelautomat i FORM, aldrig i MEKANIK (2–5 år).
//
// Barnet trycker på den stora spaken → tre trummor börjar snurra. Sedan trycker barnet
// på VARJE trumma, i valfri ordning, för att stoppa den. Det är hela agensen: trummorna
// går långsamt nog (≈1,8 symboler/s) att man faktiskt kan sikta på en symbol man vill ha,
// och stoppet är WYSIWYG — den symbol som står i fönstret när fingret nuddar är den som
// hamnar mitt i (en liten reaktionsledning på 0,06 s räknas in, resten är en mjuk
// inbromsning på 0,42 s som sätter sig på plats). Uppmätt med scripts/_snurrprobe.mjs:
// 94 % av trycken gav den symbol som stod i fönstret, mot 17 % för grannsymbolen.
//
// TVÅ LÄGEN, en väljare på maskinens högra sida (ikon-först, ingen text):
//   · HANDEN   — barnet stoppar varje hjul själv (som ovan). Standard.
//   · STJÄRNAN — hjulen stannar av sig själva, ett i taget, som en riktig spelautomat.
// Valet sparas per profil (`custom.autoStopp`). I autoläget är ett tryck på ett snurrande
// hjul inte dött: det svarar med hjulets egen ton och en ring (P0 ÅTERKOPPLING).
//
// TRE LIKA ÄR VINSTEN. Den får en egen ceremoni — vinsten glider ner uppifrån i stort
// format, en stjärna roterar bakom den, strålar skjuts ut åt alla håll, en glans skimrar
// över föremålet och en kort trudelutt klingar — och ställer sig sedan på TROFEHYLLAN till
// vänster, som sparas mellan sessioner (`custom.trofeer`, max 8 unika).
//
// ⚠️ INGEN SPELAUTOMAT-DRAMATURGI ÄNDÅ. Det finns ingen insats, ingen förlust, ingen
// "nästan-vinst", ingen poäng, ingen timer. Att tre lika nu är en VINST får inte göra de
// andra utfallen till förluster, och får inte bli en jakt:
//   · tre lika  → ceremonin ovan + myntregn ur luckan + trofé på hyllan
//   · två lika  → mellanfirande: de två som är lika hoppar ut och möts
//   · alla olika→ symbolerna hoppar ut, virvlar ihop och en TOKIG BLANDFIGUR (byggd av
//                 alla tre) kliver ur luckan och dansar
// Två skydd mot jakten, båda mätta (se `scripts/_vinstprobe.mjs`):
//   ⓵ I autoläget GARANTERAS tre lika minst var tredje snurr (och alltid det första i en
//     session). Barnet kan alltså aldrig dra spaken mer än tre gånger utan en vinst — det
//     är motsatsen till en enarmad bandits variabla belöning.
//   ⓶ Rundans symboluppsättning bär alltid en DELAD symbol som finns på alla tre hjulen.
//     Utan den kunde tre lika vara matematiskt OMÖJLIGT: med tre olika symboler per trumma,
//     dragna oberoende ur en femuppsättning, saknade **17,9 %** av rundorna en gemensam
//     symbol — och runda 0 är den varje nytt barn möter. Uppmätt över 200 000 dragningar.
// Efter fem snurr: complete() + maskinen får en ny färgpalett och en ny symboluppsättning.
//
// TON: varje trumma har sin egen ton (C5 · E5 · G5). När alla tre står klingar de
// tillsammans som en durtreklang — och en stillastående trumma går att trycka på för att
// spela sin ton igen, så maskinen också är ett litet instrument.
//
// EXIT-SÄKERHET: trummornas rörelse, lamporna, mynten och Bobos studs drivs av TICKERN
// (egna hastigheter), inte av gsap på Pixi-objekt. De gsap-tidslinjer som finns (spaken,
// utsprånget, blandfiguren) ligger i `this._tls` och dödas i destroy(); partiklar går via
// lib/feedback.js som redan är exit-säkra. Tickern tas bort och roten rivs.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { drawIcon } from '../../lib/artikoner.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { pop, squash, wiggle, sparkle, burst, ripple, kvittera, breathe, shake, liv } from '../../lib/feedback.js'
import { topLightFill, cylinderFill, sphereFill, verticalFill } from '../../lib/form.js'
import { COLORS, PLAYFUL, shade } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// --- Maskinens mått (designkoordinater 1280×720) ---
const CAB = { x: 290, y: 175, w: 700, h: 515 }
const RING = { l: 272, t: 158, r: 1008, b: 694 } // lampornas sken har radie 22 → ryms i bild
const REEL_X = [420, 640, 860]
const REEL_Y = 390
const WIN_W = 180
const WIN_H = 168
const HIT_HW = 96 // träffytan: 192×208 px, 28 px mellan hjulen (P0 ≥96 / ≥24)
const HIT_HH = 104
const LEVER_X = 1075
const LEVER_Y = 500 // spakens pivå
const HATCH = { x: 540, y: 585, w: 200, h: 70 }

// --- Lägesväljaren (hand ↔ stjärna) ---
// Sitter under spakens arm på maskinens högra sida. Spakens träffyta slutar vid y=530,
// väljarens börjar vid 542 — 12 px är för lite, så väljaren ligger på 620 och glappet blir
// 44 px (P0 kräver ≥24 px mellan träffytor).
const TOG = { x: 1118, y: 620 }
const TOG_HW = 92 // träffyta 184×156 px (P0 ≥96)
const TOG_HH = 78
const TOG_DX = 42 // avstånd från plattans mitt ut till vardera pictogram

// --- Trofehyllan ---
// Till vänster om maskinen. Lampringens sken når x = RING.l − 22 = 250, så hyllan får
// 0..244. Hembknappen i skalet slutar vid y≈117, därför börjar första plankan på 300.
const SHELF_X = 126
const SHELF_DX = 56 // två pelare: x 70 och 182
const SHELF_Y = [300, 416, 532, 648]
const TROF_MAX = SHELF_Y.length * 2 // 8 unika troféer
const TROF_SIZE = 68

// --- Vinstceremonin ---
const PRIZE = { x: 640, y: 348 }
const PRIZE_SIZE = 96
const PRIZE_SKALA = 2.35 // "i större storlek" — 96 × 2,35 ≈ 226 px mot trummans 108
const PRIZE_STRALAR = 16

// --- Autoläget ---
// Hjulen stannar av sig själva ett i taget. Talen är slotmaskinens kadens, inte slumpens:
// första hjulet efter 1,1 s och sedan 0,72 s mellan hjulen.
const AUTO_BAS = 1.1
const AUTO_STEG = 0.72
// När en snurr ska ge tre lika LETAR hjulet efter rätt symbol i stället för att tvinga
// fram den (ett påtvingat mål hade fått hjulet att accelerera in i sitt stopp — stoppet är
// en INBROMSNING på 0,42 s). Jakten kostar som mest ett varv; taket bryter den ändå, så en
// omöjlig symbol aldrig kan låsa ett hjul i evighet.
const AUTO_JAKT_TAK = 3.6
// Garanterad vinst minst var tredje autosnurr — se noten i huvudet.
const AUTO_VINST_VAR = 3

// --- Trummorna ---
const SLOTS = 6 // platser runt trumman
const PITCH = 168 // px mellan två symboler = fönstrets höjd
const TOTAL = SLOTS * PITCH
const BASE_SPEED = 300 // px/s ≈ 1,8 symboler/s — långsamt nog att sikta på
const SPIN_ACC = 1400 // px/s² uppstart
const STOP_DUR = 0.42 // s mjuk inbromsning
// Stoppet siktar på NÄRMASTE symbolmitt, plus en liten reaktionsledning. Toleransen är
// alltså en halv symbol åt vardera hållet = ±0,28 s vid 1,79 symboler/s — ett barn får
// nästan en tredjedels sekund fel utan att få fel symbol. Ledningen hålls LITEN med flit:
// varje tiondel framåt äter av tåligheten för ett SENT tryck, och sent är det ett barn är.
const LEAD = 0.06
const MIN_SPIN = 0.35 // s minsta snurrvarv; ett tidigare tryck BOKAS (se _reelTap)
const REEL_TONES = [523.25, 659.25, 783.99] // C5 · E5 · G5 = durtreklang
const RAINBOW_CHANCE = 0.16 // sällsynt regnbågstrumma
const SPINS_PER_ROUND = 5
const IDLE_DELAY = 6 // s tystnad innan mjuk om-cue
const COIN_CAP = 56 // poolens storlek (byggs en gång, aldrig under spel)

// Symboluppsättningar — byts mellan rundor. Nycklarna är artikoner.js ritmallar:
// varje symbol blir ett FRISTÅENDE ritat föremål med egen silhuett, skugga och eget
// liv (guppar när trumman står still), aldrig en emoji i en ruta.
const SETS = [
  ['🐶', '🐱', '🐰', '🐻', '🦊'],
  ['🍎', '🍌', '🍓', '🍇', '🍊'],
  ['🚗', '🚌', '🚀', '⛵', '🚲'],
  ['🐠', '🐳', '🦀', '🐢', '🐙'],
  ['⭐', '🍀', '🌸', '🌙', '💎'],
  ['🧸', '🎈', '🎁', '🍦', '⚽'],
]

// Maskinens färgpaletter — en ny per avklarad runda.
const PALETTES = [
  { kropp: 0xff6b6b, kant: 0xc9424f, panel: 0x5b3a6b, ram: 0xffd35c, lampa: 0xffe27a },
  { kropp: 0x4aa3df, kant: 0x2f7cb0, panel: 0x25456b, ram: 0xfff3b0, lampa: 0xfff3b0 },
  { kropp: 0x5bbf6a, kant: 0x3f8a4f, panel: 0x2d5b3a, ram: 0xffd35c, lampa: 0xffe27a },
  { kropp: 0xa78bfa, kant: 0x7a5fd0, panel: 0x3d2f6b, ram: 0xffd7f0, lampa: 0xffd7f0 },
  { kropp: 0xff8a3d, kant: 0xd9691f, panel: 0x6b3a1f, ram: 0xfff3b0, lampa: 0xffe27a },
]

const RAINBOW = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]

const TRE_LIKA = ['Tre lika! Vilket party!', 'Titta, alla tre är likadana!']
const TVA_LIKA = ['Två lika! Så fint!', 'Två kompisar hittade varandra!']
const BLANDAT = ['En tokig kompis kom fram!', 'Titta vilken rolig blandning!']

const modw = (v, m) => ((v % m) + m) % m

// Riv ett helt underträd UTAN att läcka GraphicsContext.
//
// ⚠️ `node.destroy({ children: true })` ser ut att städa allt, men Pixi v8 läser
// `if (this._ownedContext && !options)` — ett options-OBJEKT är sant, så varje Graphics
// i trädet behåller sin kontext (och dess GPU-buffertar). Spelet river och bygger grafik
// i klump: 18 symboler per rundbyte, upp till 90 mynt per fest, tre utsprungna symboler
// och en blandfigur per snurr. `destroy()` utan argument river kontexten — och bara den,
// FYLLNINGENS textur lämnas i fred (den är en delad gradient ur lib/form.js-cachen och
// `destroy(true)` hade slagit ut volymen i hela appen).
function riv(node) {
  if (!node || node.destroyed) return
  for (const ch of node.removeChildren()) riv(ch)
  node.destroy()
}

export default {
  id: 'roliga-snurran',
  titleSv: 'Roliga Snurran',
  icon: '🎰',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'roliga-snurran',
  voiceIntro: 'Tryck på spaken så snurrar hjulen!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._lastSay = 0
    this._phase = 'redo' // redo | snurrar | firar
    this._tls = [] // gsap-tidslinjer att döda i destroy
    this._coins = []
    this._coinQueue = 0
    this._coinAcc = 0
    this._leaps = [] // symboler som hoppat ut ur fönstren
    this._bland = null
    this._bobT = 1 // studs-fas för Bobo (1 = i vila)
    this._lightMode = 'vila'
    this._lightT = 0

    const st = ctx.progress.get()
    this._round = Math.max(0, st.custom?.rundor | 0)
    this._spins = 0
    // Läget och hyllan överlever sessionen. Spardata är barnets, inte kodens: allt som
    // läses härifrån saneras (fel typ = som om det inte fanns), annars kan en gammal eller
    // handredigerad profil krascha spelet vid start.
    this._auto = st.custom?.autoStopp === true
    this._trofeer = (Array.isArray(st.custom?.trofeer) ? st.custom.trofeer : [])
      .filter((k) => typeof k === 'string')
      .slice(0, TROF_MAX)
    this._trofNoder = []
    this._autoSpins = AUTO_VINST_VAR // ⇒ första autosnurren i en session ger alltid vinst
    this._wantKey = null
    this._prizeLayer = null
    this._prizeT = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Bakgrund (dekor, fångar ingen pekning).
    this._root.addChild(createScene('candy'))

    // 2) Tryck-fångare UNDER maskinen: ett tomt tryck ger alltid ett glatt litet svar.
    //    Täcker bleed-zonen så tryck på synlig yta utanför 0..1280 svarar på telefon.
    this._catcher = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, ctx.height + 2 * BLEED_Y)
      .fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onEmpty = (e) => this._emptyTap(ctx, e)
    this._catcher.on('pointertap', this._onEmpty)
    this._root.addChild(this._catcher)

    // 2b) Trofehyllan — ligger ÖVER fångaren men är själv `none`, så ett tryck på hyllan
    //     ändå ger fångarens glada lilla svar (P0: ingen yta får vara tyst).
    this._buildShelf()

    // 3) Maskinen. `_deco` bär all ritad plåt (den får skakas), medan hjulens och
    //    spakens träffytor ligger i egna noder som ALDRIG animeras — en träffyta som
    //    rör sig mitt i ett tryck är precis den fällan CLAUDE.md varnar för.
    this._mach = new Container()
    this._root.addChild(this._mach)
    this._deco = new Container()
    this._deco.eventMode = 'none'
    this._deco.interactiveChildren = false
    this._mach.addChild(this._deco)

    this._shadow = new Graphics()
    this._body = new Graphics()
    this._bulbBase = new Graphics()
    this._deco.addChild(this._shadow, this._bulbBase, this._body)

    // Lampring runt hela maskinen — varje lampas SKEN är en egen nod (alfan animeras
    // i tickern), medan sockeln ritas en gång i `_bulbBase`.
    this._bulbs = []
    // 8 lampor per långsida ger ingen lampa på x=640 — där sitter Bobo, och en lampa
    // bakom honom hade sett ut som ett fel.
    for (const p of ringPositions(RING.l, RING.t, RING.r, RING.b, 8, 4)) {
      const g = new Graphics()
      g.position.set(p.x, p.y)
      g.eventMode = 'none'
      this._deco.addChild(g)
      this._bulbs.push(g)
    }

    // Fem framstegslampor på kronan (tänds per snurr, slocknar aldrig mitt i en runda).
    this._lamps = []
    this._lampLit = 0
    for (let i = 0; i < SPINS_PER_ROUND; i++) {
      const g = new Graphics()
      g.position.set(640 + (i - 2) * 72, 232)
      g.eventMode = 'none'
      this._deco.addChild(g)
      this._lamps.push(g)
    }

    this._hatch = new Graphics()
    this._deco.addChild(this._hatch)

    // 4) Trummorna.
    this._reels = []
    for (let i = 0; i < 3; i++) this._reels.push(this._makeReel(ctx, i))

    // 5) Spaken (egen nod, stor träffyta, roterar kring sin pivå).
    this._buildLever(ctx)
    this._buildToggle(ctx)

    // 6) Bobo sitter på maskinens tak och studsar i takt med trummornas tickande.
    this._boboWrap = new Container()
    this._boboWrap.position.set(640, 0)
    this._mach.addChild(this._boboWrap)
    this._bobo = makeKaraktar({ r: 38 })
    this._bobo.view.position.set(0, 88)
    this._boboWrap.addChild(this._bobo.view)

    // 7) Främre lager: utsprungna symboler, blandfiguren och myntregnet.
    this._front = new Container()
    this._front.eventMode = 'none'
    this._front.interactiveChildren = false
    this._root.addChild(this._front)
    this._buildCoinPool()

    // 8) Ceremonilagret: vinstens egen scen, ovanför allt annat spelet ritar. Står tomt
    //    mellan vinsterna — noden finns bara för att z-ordningen ska vara given.
    this._prizeRoot = new Container()
    this._prizeRoot.eventMode = 'none'
    this._prizeRoot.interactiveChildren = false
    this._root.addChild(this._prizeRoot)

    this._applyRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    this._lastSay = performance.now()
    this._bobo?.react('hej')
  },

  // ---- Runda: palett, symboluppsättning, fart ------------------------------

  _applyRound(ctx) {
    const pal = PALETTES[this._round % PALETTES.length]
    this._pal = pal
    this._set = SETS[this._round % SETS.length]
    // Mjuk progression: fler OLIKA symboler per trumma (3 → 4 → 5) och lite högre fart.
    this._distinct = Math.min(3 + this._round, 5)
    this._speed = BASE_SPEED + Math.min(this._round, 2) * 30
    // Rundans DELADE symbol: den enda som garanterat finns på alla tre hjulen, alltså den
    // som gör tre lika möjligt över huvud taget. Se noten i filhuvudet (⓶).
    this._delad = randomFrom(this._set)
    this._paintMachine()
    for (const r of this._reels) this._fillStrip(r)
    this._lampLit = 0
    for (let i = 0; i < this._lamps.length; i++) this._paintLamp(i, false)
    this._armLever()
  },

  // Trummans remsa: `distinct` olika symboler fyller SLOTS platser (några upprepas), i
  // egen ordning per trumma så hjulen aldrig går i lås. Aldrig två lika bredvid varandra —
  // då blir det omöjligt att se vilken man siktar på.
  _fillStrip(r) {
    const keys = shuffle([...this._set]).slice(0, this._distinct)
    // GARANTI: rundans delade symbol finns på VARJE hjul. Utan den drar de tre hjulen sina
    // symboler oberoende, och med `distinct` 3 ur en femuppsättning saknade 17,9 % av
    // rundorna en symbol som fanns på alla tre — tre lika var då omöjligt hur väl barnet än
    // siktade, och runda 0 (distinct 3) är den varje nytt barn möter först.
    if (this._delad && !keys.includes(this._delad)) keys[keys.length - 1] = this._delad
    const strip = []
    for (let i = 0; i < SLOTS; i++) strip.push(keys[i % keys.length])
    let arr = shuffle(strip)
    for (let tries = 0; tries < 12; tries++) {
      let ok = true
      for (let i = 0; i < SLOTS; i++) if (arr[i] === arr[(i + 1) % SLOTS]) ok = false
      if (ok) break
      arr = shuffle(strip)
    }
    r.strip = arr
    for (let i = 0; i < SLOTS; i++) r.nodes[i]._symSetKey(arr[i])
    r.offset = modw(Math.round(Math.random() * SLOTS) * PITCH, TOTAL)
    r.key = this._centreKey(r)
    this._layoutReel(r)
  },

  // ---- Maskinens plåt ------------------------------------------------------

  _paintMachine() {
    const p = this._pal
    const g = this._body
    if (!g || g.destroyed) return
    g.clear()
    // Golvskugga.
    this._shadow.clear().ellipse(640, 700, 380, 30).fill({ color: 0x000000, alpha: 0.16 })
    // Ben.
    g.roundRect(360, CAB.y + CAB.h - 10, 70, 32, 12).fill(shade(p.kant, 0.25))
    g.roundRect(850, CAB.y + CAB.h - 10, 70, 32, 12).fill(shade(p.kant, 0.25))
    // Kropp.
    g.roundRect(CAB.x, CAB.y, CAB.w, CAB.h, 40).fill(topLightFill(p.kropp)).stroke({ width: 9, color: p.kant })
    // Krona (bär framstegslamporna).
    g.roundRect(CAB.x + 22, CAB.y + 16, CAB.w - 44, 86, 28).fill(topLightFill(p.panel)).stroke({ width: 5, color: p.kant })
    g.roundRect(CAB.x + 40, CAB.y + 26, CAB.w - 80, 22, 11).fill({ color: 0xffffff, alpha: 0.12 })
    // Panelen bakom hjulen.
    g.roundRect(316, 288, 648, 196, 26).fill(verticalFill(shade(p.panel, 0.1), shade(p.panel, 0.42)))
      .stroke({ width: 6, color: p.ram })
    // Mellanband under hjulen.
    g.roundRect(340, 500, 600, 46, 20).fill({ color: shade(p.kant, 0.2), alpha: 0.55 })
    // Spakens fäste: en arm som går UT ur maskinen till pivån, annars svävar spaken.
    g.roundRect(940, LEVER_Y - 26, LEVER_X - 940, 52, 20).fill(topLightFill(shade(p.kropp, 0.12)))
      .stroke({ width: 5, color: p.kant })
    g.roundRect(952, LEVER_Y - 12, 40, 24, 10).fill({ color: 0x000000, alpha: 0.12 })
    // Luckan (myntregnet kommer härifrån).
    this._hatch.clear()
      .roundRect(HATCH.x - 12, HATCH.y - 10, HATCH.w + 24, HATCH.h + 22, 20)
      .fill(cylinderFill(p.ram, { axis: 'x' })).stroke({ width: 5, color: shade(p.kant, 0.2) })
      .roundRect(HATCH.x, HATCH.y, HATCH.w, HATCH.h, 14)
      .fill(verticalFill(0x241c2e, 0x120c18))
      .roundRect(HATCH.x + 10, HATCH.y + HATCH.h - 16, HATCH.w - 20, 12, 6)
      .fill({ color: p.ram, alpha: 0.35 })
    // Lampramen runt hela maskinen + varje lampas sockel (allt statiskt: i tickern
    // ändras BARA skenets alfa, så en lampring kostar noll omritningar per bildruta).
    const bb = this._bulbBase.clear()
    const rw = RING.r - RING.l
    const rh = RING.b - RING.t
    bb.roundRect(RING.l - 17, RING.t - 17, rw + 34, rh + 34, 58).fill(topLightFill(shade(p.kant, 0.2)))
    bb.roundRect(RING.l - 9, RING.t - 9, rw + 18, rh + 18, 50).fill(topLightFill(p.ram))
    for (const b of this._bulbs) {
      bb.circle(b.x, b.y, 14).fill(shade(p.kant, 0.35))
      bb.circle(b.x, b.y, 10).fill(sphereFill(shade(p.lampa, 0.18), { dark: 0.25 }))
    }
    for (const b of this._bulbs) {
      if (!b || b.destroyed) continue
      b.clear()
        .circle(0, 0, 22).fill({ color: p.lampa, alpha: 0.3 })
        .circle(0, 0, 9).fill(0xfffbe6)
    }
    for (const r of this._reels) this._paintReel(r)
    for (let i = 0; i < this._lamps.length; i++) this._paintLamp(i, i < this._lampLit)
    this._paintLever()
    this._paintToggle()
  },

  _paintLamp(i, on) {
    const g = this._lamps[i]
    if (!g || g.destroyed) return
    const p = this._pal
    g.clear()
    if (on) {
      g.circle(0, 0, 26).fill({ color: p.lampa, alpha: 0.3 })
      g.circle(0, 0, 16).fill(sphereFill(p.lampa, { dark: 0.1 })).stroke({ width: 3, color: 0xffffff, alpha: 0.55 })
    } else {
      // Släckt = en glaslampa som VÄNTAR, inte ett svart hål.
      g.circle(0, 0, 14).fill(sphereFill(shade(p.lampa, 0.55), { dark: 0.2 })).stroke({ width: 4, color: shade(p.ram, 0.3) })
    }
  },

  // ---- Trumma --------------------------------------------------------------

  _makeReel(ctx, i) {
    const v = new Container()
    v.position.set(REEL_X[i], REEL_Y)

    const maskG = new Graphics().rect(-WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H).fill(0xffffff)
    const inner = new Container()
    const back = new Graphics()
    const drum = new Container()
    inner.addChild(back, drum)
    inner.mask = maskG
    const frame = new Graphics()
    frame.eventMode = 'none'
    v.addChild(maskG, inner, frame)

    const r = {
      i, view: v, back, drum, frame, nodes: [], strip: [],
      offset: 0, spd: 0, spdMax: BASE_SPEED, state: 'still', wait: 0, spinT: 0,
      t: 0, from: 0, to: 0, tickK: null, rainbow: false, key: null, pending: false,
      autoAt: Infinity, // sätts per snurr; Infinity = manuellt läge (hjulet stannar aldrig själv)
    }
    for (let s = 0; s < SLOTS; s++) {
      const n = makeSymbol(this._set ? this._set[0] : SETS[0][0], 108)
      drum.addChild(n)
      r.nodes.push(n)
    }

    v.eventMode = 'static'
    v.cursor = 'pointer'
    v.hitArea = new Rectangle(-HIT_HW, -HIT_HH, HIT_HW * 2, HIT_HH * 2)
    v.on('pointertap', () => this._reelTap(ctx, r))
    this._mach.addChild(v)
    return r
  },

  _paintReel(r) {
    const p = this._pal
    if (r.back && !r.back.destroyed) {
      r.back.clear()
      if (r.rainbow) {
        // Full färg + en ljus slöja. Halvgenomskinliga band över panelen blev grumligt
        // brungröna i skärmdumpen — en regnbåge måste läsa som en regnbåge.
        const h = (WIN_H + 40) / RAINBOW.length
        for (let i = 0; i < RAINBOW.length; i++) {
          r.back.rect(-WIN_W / 2, -WIN_H / 2 - 20 + i * h, WIN_W, h + 1).fill(RAINBOW[i])
        }
        r.back.rect(-WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H).fill({ color: 0xffffff, alpha: 0.38 })
      } else {
        r.back.rect(-WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H).fill(cylinderFill(0xfff6e6, { dark: 0.15, highlight: 0.25 }))
      }
    }
    if (r.frame && !r.frame.destroyed) {
      r.frame.clear()
        // Mjuka trum-skuggor upptill och nedtill: fönstret läser som en RUNDAD trumma.
        .rect(-WIN_W / 2, -WIN_H / 2, WIN_W, 26).fill({ color: 0x2a1d16, alpha: 0.28 })
        .rect(-WIN_W / 2, WIN_H / 2 - 26, WIN_W, 26).fill({ color: 0x2a1d16, alpha: 0.28 })
        .roundRect(-WIN_W / 2 - 8, -WIN_H / 2 - 8, WIN_W + 16, WIN_H + 16, 18)
        .stroke({ width: 9, color: r.rainbow ? 0xffffff : p.ram })
        .roundRect(-WIN_W / 2 - 8, -WIN_H / 2 - 8, WIN_W + 16, WIN_H + 16, 18)
        .stroke({ width: 3, color: shade(p.kant, 0.15), alpha: 0.6 })
    }
  },

  _layoutReel(r) {
    for (let s = 0; s < SLOTS; s++) {
      const n = r.nodes[s]
      if (!n || n.destroyed) continue
      let y = modw(s * PITCH + r.offset, TOTAL)
      if (y > TOTAL / 2) y -= TOTAL
      n.y = y
      n.visible = Math.abs(y) < WIN_H / 2 + PITCH * 0.7
    }
  },

  _centreIndex(r) {
    return modw(Math.round(-r.offset / PITCH), SLOTS)
  },

  _centreKey(r) {
    return r.strip[this._centreIndex(r)]
  },

  _centreNode(r) {
    return r.nodes[this._centreIndex(r)]
  },

  // ---- Spaken --------------------------------------------------------------

  _buildLever(ctx) {
    const c = new Container()
    c.position.set(LEVER_X, LEVER_Y)
    this._leverArt = new Graphics()
    this._leverArt.eventMode = 'none'
    c.addChild(this._leverArt)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-90, -230, 180, 260) // 180×260 px
    c.on('pointertap', () => this._leverTap(ctx))
    this._lever = c
    this._mach.addChild(c)
    this._paintLever()
  },

  _paintLever() {
    const g = this._leverArt
    if (!g || g.destroyed) return
    const p = this._pal || PALETTES[0]
    g.clear()
    // Pivån är METALL, inte lackad plåt. Med maskinens röda ton såg den ut som en andra
    // knopp längst ner på stången i skärmdumpen.
    g.roundRect(-30, -16, 60, 34, 14).fill(cylinderFill(0x8d99a6, { axis: 'x' })).stroke({ width: 4, color: 0x5c6672 })
    g.circle(0, 0, 13).fill(0x5c6672)
    g.circle(0, 0, 6).fill(0x39424c)
    g.roundRect(-11, -178, 22, 182, 11).fill(cylinderFill(0xc9d2da))
    g.circle(0, -178, 46).fill(sphereFill(0xff3b3b, { dark: 0.34 })).stroke({ width: 5, color: 0xa82626 })
    g.ellipse(-14, -194, 15, 11).fill({ color: 0xffffff, alpha: 0.45 })
  },

  // Lockande vilopuls på spakens BILD, aldrig på noden som bär träffytan — då står
  // hitArea still medan knoppen andas.
  _armLever() {
    this._leverBreath?.kill()
    this._leverBreath = null
    if (!this._alive || !this._lever || this._lever.destroyed) return
    gsap.killTweensOf(this._lever)
    this._lever.rotation = 0
    this._leverArt.scale.set(1)
    this._leverBreath = breathe(this._leverArt, { scale: 1.05, duration: 1.1 })
  },

  // ---- Lägesväljaren: handen eller stjärnan --------------------------------

  // En KONTROLLPANEL får bära UI-ikoner — P0 ASSETS förbjuder ikoner i rutor för
  // SPELOBJEKT, och säger uttryckligen att paneler får bära UI-kontroller. Ikon-först och
  // noll läsning: handen = "du stoppar hjulen", stjärnan = "de stannar av sig själva".
  // Vad valet betyder sägs dessutom med RÖST vid varje tryck (P0 NAVIGATION).
  _buildToggle(ctx) {
    const c = new Container()
    c.position.set(TOG.x, TOG.y)
    this._togPlate = new Graphics()
    this._togKnob = new Graphics()
    this._togIcons = new Graphics()
    for (const g of [this._togPlate, this._togKnob, this._togIcons]) g.eventMode = 'none'
    // Knoppen ligger UNDER pictogrammen: den valda bilden står på en tänd bricka, den
    // andra på mörk plåt. Ett reglage som gled OVANPÅ hade dolt just det som förklarar.
    c.addChild(this._togPlate, this._togKnob, this._togIcons)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-TOG_HW, -TOG_HH, TOG_HW * 2, TOG_HH * 2)
    c.on('pointertap', () => this._toggleTap(ctx))
    this._toggle = c
    this._mach.addChild(c)
    this._togKnob.x = this._auto ? TOG_DX : -TOG_DX
    this._paintToggle()
  },

  _paintToggle() {
    const p = this._pal || PALETTES[0]
    const plate = this._togPlate
    if (plate && !plate.destroyed) {
      plate.clear()
      // Fäste upp mot spakens arm — utan det svävar panelen bredvid maskinen.
      plate.roundRect(-15, -104, 30, 52, 12).fill(topLightFill(shade(p.kropp, 0.12)))
      plate.roundRect(-84, -56, 168, 112, 26).fill(topLightFill(shade(p.panel, 0.06)))
        .stroke({ width: 6, color: p.ram })
      plate.roundRect(-70, -46, 140, 16, 8).fill({ color: 0xffffff, alpha: 0.1 })
    }
    const k = this._togKnob
    if (k && !k.destroyed) {
      k.clear()
      k.circle(0, 0, 40).fill({ color: p.lampa, alpha: 0.3 })
      k.circle(0, 0, 31).fill(sphereFill(p.lampa, { dark: 0.12 })).stroke({ width: 4, color: 0xffffff, alpha: 0.6 })
    }
    this._paintTogIcons()
  },

  _paintTogIcons() {
    const g = this._togIcons
    if (!g || g.destroyed) return
    g.clear()
    const valt = { color: 0x2a1d16 }
    const vilar = { color: 0xffffff, alpha: 0.42 }
    ritHand(g, -TOG_DX, 2, this._auto ? vilar : valt)
    ritGnista(g, TOG_DX, 0, this._auto ? valt : vilar)
  },

  _toggleTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    this._setAuto(ctx, !this._auto)
  },

  // Väljaren går att röra NÄR SOM HELST, även mitt i ett snurr. Ett läge som bara gick att
  // byta i vila hade varit en tyst träffyta halva speltiden. Bytet gäller från NÄSTA snurr:
  // `_startSpin` läser `_auto` en gång och sätter hjulens `autoAt` då, så hjul som redan
  // letar efter sitt stopp aldrig byter regler mitt i rörelsen.
  _setAuto(ctx, v) {
    this._auto = v
    ctx.progress.setCustom('autoStopp', v)
    const a = ctx.services.audio
    a.sfx('flip')
    a.tone({ freq: v ? 620 : 470, dur: 0.11, type: 'triangle', vol: 0.16, slideTo: v ? 830 : 360 })
    sparkle(ctx.fxLayer, TOG.x + (v ? TOG_DX : -TOG_DX), TOG.y, { count: 5 })
    const k = this._togKnob
    if (k && !k.destroyed) {
      gsap.killTweensOf(k)
      this._track(gsap.to(k, { x: v ? TOG_DX : -TOG_DX, duration: 0.24, ease: 'back.out(2)' }))
    }
    this._paintTogIcons()
    this._say(ctx, v ? 'Nu stannar hjulen själva.' : 'Nu stoppar du hjulen själv.', true)
  },

  _leverTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    if (this._phase !== 'redo') {
      // Upptagen — men aldrig tyst (P0 ÅTERKOPPLING). Ett dämpat kvitto.
      kvittera(ctx.fxLayer, LEVER_X, LEVER_Y - 178, ctx.services.audio)
      return
    }
    this._pull(ctx)
  },

  _pull(ctx) {
    this._phase = 'snurrar'
    this._leverBreath?.kill()
    this._leverBreath = null
    gsap.killTweensOf(this._lever)
    this._leverArt.scale.set(1)

    const a = ctx.services.audio
    a.sfx('flip')
    a.tone({ freq: 220, dur: 0.18, type: 'square', vol: 0.12, slideTo: 110 })
    a.sfx('whoosh')
    shake(this._deco, { intensity: 5, duration: 0.4 })

    // Trummorna startar i SAMMA bildruta som trycket. Först satt starten i spakens
    // gsap-tidslinje (efter 0,16 s) — dels är det på gränsen till P0:s 100 ms, dels
    // fann sonden att en enda hackig bildruta kunde skjuta starten förbi barnets nästa
    // tryck: hjulen stod still när fingret kom, trycket träffade ingenting och hjulen
    // snurrade sedan vidare i all evighet (uppmätt: spinT 0,03 s efter 950 ms väntan).
    // Spaken är dekor och får svänga i sin egen takt.
    this._startSpin(ctx)
    const tl = gsap.timeline()
    tl.to(this._lever, { rotation: 0.95, duration: 0.16, ease: 'power2.in' })
      .to(this._lever, { rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
    this._track(tl)
  },

  _startSpin(ctx) {
    if (!this._alive) return
    // Sällsynt regnbågstrumma: en trumma i taget, och bara ibland.
    const rb = Math.random() < RAINBOW_CHANCE ? (Math.random() * 3) | 0 : -1

    // AUTOLÄGET bestämmer utfallet FÖRE snurren, inte efter — och det är hela skälet till
    // att läget inte blir en enarmad bandit. Går det AUTO_VINST_VAR snurr utan tre lika är
    // nästa garanterad, så barnet aldrig kan dra spaken mer än tre gånger utan en vinst.
    // `_autoSpins` startar på taket, alltså ger första autosnurren i en session alltid vinst.
    this._wantKey = null
    if (this._auto) {
      this._autoSpins++
      if (this._autoSpins >= AUTO_VINST_VAR) {
        const gem = this._gemensammaNycklar()
        if (gem.length) this._wantKey = randomFrom(gem)
      }
    }

    for (const r of this._reels) {
      r.rainbow = r.i === rb
      r.state = 'spin'
      r.spd = 0
      r.spdMax = this._speed
      r.wait = r.i * 0.07
      r.spinT = 0
      r.pending = false
      r.autoAt = this._auto ? AUTO_BAS + r.i * AUTO_STEG : Infinity
      this._paintReel(r)
    }
    this._say(ctx, this._auto ? 'Titta, hjulen stannar själva!' : 'Stoppa hjulen när du vill!', true)
    if (rb >= 0) sparkle(ctx.fxLayer, REEL_X[rb], REEL_Y, { count: 8 })
    this._lightMode = 'snurr'
  },

  // Symboler som finns på ALLA TRE hjulen — alltså de utfall "tre lika" som ens är möjliga.
  // Rundans delade symbol (se `_fillStrip`) garanterar att listan aldrig är tom.
  _gemensammaNycklar() {
    const [a, b, c] = this._reels.map((r) => new Set(r.strip))
    if (!a || !b || !c) return []
    return [...a].filter((k) => b.has(k) && c.has(k))
  },

  // Vilken symbol SKULLE landa om hjulet bromsade just nu? Samma räkning som `_stopReel`
  // gör, så jakten i autoläget och barnets eget tryck ser exakt samma sak.
  _wouldKey(r) {
    const to = Math.round((r.offset + r.spd * LEAD) / PITCH) * PITCH
    return r.strip[modw(Math.round(-to / PITCH), SLOTS)]
  },

  // ---- Trycket på en trumma ------------------------------------------------

  _reelTap(ctx, r) {
    if (!this._alive) return
    this._idle = 0
    const a = ctx.services.audio

    if (r.state === 'spin') {
      if (this._auto) {
        // Autoläget: maskinen sköter stoppet. Trycket är ändå ALDRIG tyst — hjulet svarar
        // med sin egen ton och en ring, precis som ett stillastående hjul gör. Att bara
        // borta här vore P0-brottet `dod-traffyta`.
        a.tone({ freq: REEL_TONES[r.i], dur: 0.24, type: 'triangle', vol: 0.16 })
        ripple(ctx.fxLayer, REEL_X[r.i], REEL_Y, { maxR: 88, color: 0xffffff, width: 5, alpha: 0.45 })
        return
      }
      if (r.spinT < MIN_SPIN) {
        // För tidigt att stanna (trumman har knappt kommit igång) — men trycket KASTAS
        // INTE BORT. Det bokas: trumman får sitt minsta varv och stannar sedan av sig
        // själv. Ett ivrigt barn trycker på hjulet i samma andetag som det släpper
        // spaken, och att svara "nej" på det trycket är att be om ett andra tryck.
        // Sonden fann det: spinT låg på 0,40–0,56 s när fingret kom, alltså exakt på
        // spärren, och en avvisning lämnade trumman snurrande i all evighet.
        r.pending = true
        a.sfx('tap')
        ripple(ctx.fxLayer, REEL_X[r.i], REEL_Y, { maxR: 88, color: 0xffffff, width: 5, alpha: 0.5 })
        return
      }
      this._stopReel(r)
      a.sfx('tap')
      ripple(ctx.fxLayer, REEL_X[r.i], REEL_Y, { maxR: 96, color: 0xffffff, width: 6 })
      return
    }
    if (r.state === 'stop') {
      kvittera(ctx.fxLayer, REEL_X[r.i], REEL_Y, a)
      return
    }
    // Stillastående trumma: symbolen är ett FÖREMÅL, inte en bild — den svarar.
    // Maskinen blir ett litet instrument: C, E och G går att spela när som helst.
    const n = this._centreNode(r)
    if (n && !n.destroyed) pop(n, { scale: 1.16 })
    a.tone({ freq: REEL_TONES[r.i], dur: 0.3, type: 'triangle', vol: 0.2 })
    sparkle(ctx.fxLayer, REEL_X[r.i], REEL_Y - 20, { count: 4 })
  },

  // WYSIWYG-stoppet: målet är NÄRMASTE symbolmitt räknat från läget en reaktionstid
  // fram i tiden. Trumman rullar alltså som mest en halv symbol till (eller sätter sig
  // tillbaka en tredjedel) — det man såg i fönstret är det som stannar där.
  _stopReel(r) {
    r.state = 'stop'
    r.t = 0
    r.from = r.offset
    r.to = Math.round((r.offset + r.spd * LEAD) / PITCH) * PITCH
  },

  _onReelStopped(ctx, r) {
    r.state = 'still'
    r.offset = modw(r.to, TOTAL)
    this._layoutReel(r)
    r.key = this._centreKey(r)

    const a = ctx.services.audio
    a.tone({ freq: 150, dur: 0.08, type: 'square', vol: 0.1 })
    a.tone({ freq: REEL_TONES[r.i], dur: 0.44, type: 'triangle', vol: 0.24 })
    const n = this._centreNode(r)
    if (n && !n.destroyed) squash(n, { intensity: 0.9 })
    sparkle(ctx.fxLayer, REEL_X[r.i], REEL_Y, { count: 5 })
    this._bobo?.look(REEL_X[r.i] - 640, REEL_Y)

    if (this._reels.every((x) => x.state === 'still')) this._evaluate(ctx)
  },

  // ---- Utfall: allt firas, inget förloras ---------------------------------

  _evaluate(ctx) {
    this._phase = 'firar'
    this._lightMode = 'vila'
    const a = ctx.services.audio
    // Alla tre står → tonerna klingar TILLSAMMANS som en durtreklang.
    for (let i = 0; i < 3; i++) a.tone({ freq: REEL_TONES[i], dur: 0.55, type: 'triangle', vol: 0.15, delay: 0.06 })

    const keys = this._reels.map((r) => r.key)
    const rb = this._reels.find((r) => r.rainbow)
    if (rb) {
      const o = this._reels.filter((r) => r !== rb)
      if (o[0].key === o[1].key && rb.key !== o[0].key) {
        this._morphRainbow(ctx, rb, o[0].key)
        keys[rb.i] = o[0].key
        ctx.later(1, () => { if (this._alive) this._outcome(ctx, keys) })
        return
      }
    }
    ctx.later(0.4, () => { if (this._alive) this._outcome(ctx, keys) })
  },

  // Regnbågstrumman är MAGI, inte en vinstmekanik: när de andra två redan är lika
  // förvandlar den sig till samma sak i en poff.
  _morphRainbow(ctx, r, key) {
    const idx = this._centreIndex(r)
    r.strip[idx] = key
    r.key = key
    const n = r.nodes[idx]
    ctx.services.audio.sfx('reveal')
    burst(ctx.fxLayer, REEL_X[r.i], REEL_Y, { count: 16, colors: RAINBOW })
    this._say(ctx, 'Regnbågshjulet blev likadant!', true)
    if (n && !n.destroyed) {
      n._symSetKey(key)
      pop(n, { scale: 1.3 })
    }
  },

  _outcome(ctx, keys) {
    if (!this._alive) return
    const [a, b, c] = keys
    if (a === b && b === c) this._tripleWin(ctx, a)
    else if (a === b || b === c || a === c) {
      const par = a === b ? [0, 1] : b === c ? [1, 2] : [0, 2]
      this._pairWin(ctx, par)
    } else this._blendWin(ctx, keys)
  },

  // Tre lika → VINSTEN. Hjulens symboler hoppar ut och lämnar över till ceremonin.
  _tripleWin(ctx, key) {
    const a = ctx.services.audio
    a.sfx('correct')
    this._lightMode = 'party'
    this._autoSpins = 0 // garantin räknas om från noll
    this._bobo?.react('jubel')
    this._say(ctx, randomFrom(TRE_LIKA), true)
    shake(this._deco, { intensity: 8, duration: 0.5 })
    for (let i = 0; i < 3; i++) this._leapOut(this._reels[i], 480 + i * 160, 252)
    for (let i = 0; i < 3; i++) {
      ctx.later(0.3 + i * 0.12, () => {
        if (!this._alive) return
        burst(ctx.fxLayer, 480 + i * 160, 252, { count: 14 })
      })
    }
    // Mängden glitter är MEDVETET nästan lika i alla tre utfall (26 · 24 · 24). Först
    // låg den på 34 · 10 · 0, alltså en belöning som växte med sällsyntheten — det är
    // den variabla belöningsstrukturen ("liten vinst ofta, stor vinst sällan, gratis att
    // försöka igen") som lär in en spelautomatsloop, och den är förbjuden här även utan
    // insats och utan förlust. Utfallen skiljs åt i KARAKTÄR i stället: skaket och
    // dansen hör till tre lika, mötet till två lika, blandfiguren till alla olika.
    this._coinRain(ctx, 26)
    // Symbolerna flyger hem tidigt: de har gjort sitt jobb (visat VAD man fick) och ska
    // inte konkurrera med ceremonin om blicken.
    ctx.later(0.55, () => { if (this._alive) this._leapBack(ctx) })
    ctx.later(0.85, () => { if (this._alive) this._prizeCeremony(ctx, key) })
    ctx.later(4.1, () => { if (this._alive) this._nextSpin(ctx) })
  },

  // ---- Vinstceremonin ------------------------------------------------------

  // "Det du vann var jättefint och unikt." Fem lager, i den ordning ögat läser dem:
  //   ⓵ resten av bilden dämpas             ⓸ vinsten glider ner uppifrån, stor
  //   ⓶ en stor stjärna roterar bakom        ⓹ en glans skimrar över den
  //   ⓷ strålar skjuts ut åt alla håll      + en kort trudelutt i stämda intervall
  // Sedan flyger vinsten till trofehyllan och sparas.
  _prizeCeremony(ctx, key) {
    if (!this._alive || !this._prizeRoot || this._prizeRoot.destroyed) return
    this._clearPrize()

    const lag = new Container()
    lag.eventMode = 'none'
    this._prizeRoot.addChild(lag)
    this._prizeLayer = lag
    this._prizeT = 0

    // ⓵ Dämpningen. En FLAT ton, inte en radiell toning: `buildRadialGradient` förfyller
    //    hela duken med sista färgstoppet och kan därför inte ha genomskinlig mitt — en
    //    vinjett byggd så blir en jämn mörkning ändå (CLAUDE.md). Då är en rektangel
    //    ärligare och gratis.
    const dim = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, ctx.width + BLEED_X * 2, ctx.height + BLEED_Y * 2)
      .fill(0x1a1030)
    dim.alpha = 0
    dim.eventMode = 'none'
    lag.addChild(dim)
    this._prizeDim = dim
    this._track(gsap.to(dim, { alpha: 0.46, duration: 0.3 }))

    // ⓶ Stjärnan bakom vinsten. Den roterar i TICKERN, inte i en `repeat: -1`-tween: en
    //    evig tween som överlever sin nod är precis den läcka filhuvudet lovar undvika.
    const star = new Graphics()
    ritStjarna(star, 12, 262, 152, { color: 0xffd35c, alpha: 0.42 })
    ritStjarna(star, 12, 196, 112, { color: 0xfff3c4, alpha: 0.5 })
    star.position.set(PRIZE.x, PRIZE.y)
    star.scale.set(0.15)
    star.alpha = 0
    star.eventMode = 'none'
    lag.addChild(star)
    this._prizeStar = star
    this._track(gsap.to(star, { alpha: 1, duration: 0.35 }))
    this._track(gsap.to(star.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.5)' }))

    // ⓷ Strålarna: kilar som skjuts ut från BAKOM föremålet (de börjar på r=74, alltså
    //    innanför vinsten, och slutar långt utanför). Varannan är smal och kort — en jämn
    //    krans läser som ett hjul, en ojämn som ett utbrott.
    const rays = new Graphics()
    for (let i = 0; i < PRIZE_STRALAR; i++) {
      const v = (i / PRIZE_STRALAR) * Math.PI * 2
      const bred = i % 2 ? 0.042 : 0.072
      const langd = i % 2 ? 320 : 470
      rays.moveTo(Math.cos(v - bred) * 74, Math.sin(v - bred) * 74)
        .lineTo(Math.cos(v) * langd, Math.sin(v) * langd)
        .lineTo(Math.cos(v + bred) * 74, Math.sin(v + bred) * 74)
        .closePath()
        .fill({ color: i % 2 ? 0xfff3c4 : 0xffd35c, alpha: i % 2 ? 0.26 : 0.4 })
    }
    rays.position.set(PRIZE.x, PRIZE.y)
    rays.scale.set(0.12)
    rays.eventMode = 'none'
    lag.addChildAt(rays, 1) // bakom stjärnan
    this._prizeRays = rays
    this._track(gsap.to(rays.scale, { x: 1, y: 1, duration: 0.55, ease: 'power2.out' }))

    // ⓸ Vinsten glider ner uppifrån mot mitten, i större storlek.
    const prize = new Container()
    prize.eventMode = 'none'
    prize.position.set(PRIZE.x, -190)
    prize.scale.set(0.6)
    const konst = drawIcon(key, PRIZE_SIZE)
    konst.eventMode = 'none'
    prize.addChild(konst)

    // ⓹ Glansen: ett ljust band som sveper diagonalt, MASKAT av en andra ritning av samma
    //    föremål. `drawIcon` returnerar en `Graphics`, så den duger som stencilmask — och
    //    då kan glansen aldrig sticka utanför silhuetten och rita en ruta runt vinsten
    //    (P0 ASSETS: ett spelobjekt får aldrig läsa som en ikon i en box).
    const glansMask = drawIcon(key, PRIZE_SIZE)
    glansMask.eventMode = 'none'
    const glans = new Container()
    glans.eventMode = 'none'
    const band = new Graphics()
    band.rect(-14, -118, 28, 236).fill({ color: 0xffffff, alpha: 0.85 })
    band.rect(20, -118, 10, 236).fill({ color: 0xffffff, alpha: 0.45 })
    band.rotation = 0.42
    band.x = -104
    glans.addChild(band)
    glans.mask = glansMask
    prize.addChild(glansMask, glans)
    lag.addChild(prize)
    this._prizeNod = prize
    this._prizeGlans = glans
    this._prizeBand = band

    this._trudelutt(ctx.services.audio)
    const tl = gsap.timeline()
    tl.to(prize, { y: PRIZE.y, duration: 0.55, ease: 'back.out(1.25)' })
      .to(prize.scale, { x: PRIZE_SKALA, y: PRIZE_SKALA, duration: 0.55, ease: 'back.out(1.6)' }, 0)
    this._track(tl)

    // Landningen: gnistor, en knyck och två svep av glansen.
    ctx.later(0.6, () => {
      if (!this._alive || prize.destroyed) return
      squash(prize, { intensity: 0.7 })
      burst(ctx.fxLayer, PRIZE.x, PRIZE.y, { count: 20, colors: [0xffe14a, 0xfff3c4, 0xffd35c], power: 1.5 })
      sparkle(ctx.fxLayer, PRIZE.x, PRIZE.y, { count: 12 })
      ctx.services.audio.sfx('celebrate')
      this._track(gsap.fromTo(band, { x: -104 }, { x: 104, duration: 0.62, ease: 'sine.inOut', repeat: 1, repeatDelay: 0.28 }))
    })

    ctx.later(2.5, () => { if (this._alive) this._prizeToShelf(ctx, key) })
  },

  // "Kort positiv trudelutt": C–E–G–C uppåt, en vändning på B och ett vilande C, med en
  // grundton under hela frasen. Stämda intervall — aldrig ett generiskt UI-klick.
  _trudelutt(a) {
    const mel = [[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.32], [987.77, 0.5], [1046.5, 0.62]]
    for (const [f, d] of mel) {
      a.tone({ freq: f, dur: d >= 0.5 ? 0.4 : 0.16, type: 'triangle', vol: 0.2, delay: d })
      a.tone({ freq: f * 2, dur: 0.11, type: 'sine', vol: 0.07, delay: d })
    }
    a.tone({ freq: 261.63, dur: 0.95, type: 'sine', vol: 0.11 })
  },

  // Vinsten flyger SJÄLV till sin plats på hyllan — barnet ska se sambandet mellan det som
  // firades och det som står kvar efteråt.
  _prizeToShelf(ctx, key) {
    if (!this._alive) return
    const a = ctx.services.audio
    const status = this._trofStatus(key)
    let mal
    let klar

    if (status === 'ny') {
      const i = this._trofeer.length
      this._trofeer.push(key)
      ctx.progress.setCustom('trofeer', [...this._trofeer])
      mal = this._trofPos(i)
      this._say(ctx, 'Den ställer sig på hyllan!', true)
      klar = () => {
        const nod = this._placeTrophy(key, i)
        if (nod) pop(nod, { scale: 1.35 })
      }
    } else if (status === 'dubblett') {
      // En dubblett firas LIKA mycket — men hyllan är en samling av unika saker, så den
      // befintliga trofén hoppar till i stället för att få en tvilling bredvid sig.
      const i = this._trofeer.indexOf(key)
      mal = this._trofPos(i)
      this._say(ctx, 'Den har du redan! Titta på hyllan.', true)
      klar = () => {
        const nod = this._trofNoder[i]
        if (nod && !nod.destroyed) pop(nod, { scale: 1.4 })
      }
    } else {
      // Full hylla tar ALDRIG bort något. Att se en sak man vunnit försvinna är en
      // förlust, och förlust finns inte i det här spelet.
      mal = { x: SHELF_X, y: SHELF_Y[SHELF_Y.length - 1] - 38 }
      this._say(ctx, 'Hyllan är full av fina saker!', true)
      klar = () => {
        for (const n of this._trofNoder) if (n && !n.destroyed) pop(n, { scale: 1.22 })
      }
    }

    if (this._prizeDim && !this._prizeDim.destroyed) {
      this._track(gsap.to(this._prizeDim, { alpha: 0, duration: 0.7, delay: 0.1 }))
    }
    for (const n of [this._prizeStar, this._prizeRays]) {
      if (n && !n.destroyed) this._track(gsap.to(n, { alpha: 0, duration: 0.45 }))
    }

    const prize = this._prizeNod
    if (!prize || prize.destroyed) {
      klar()
      this._clearPrize()
      return
    }
    gsap.killTweensOf(prize)
    gsap.killTweensOf(prize.scale)
    const tl = gsap.timeline({
      onComplete: () => {
        if (!this._alive) return
        klar()
        sparkle(ctx.fxLayer, mal.x, mal.y, { count: 8 })
        a.tone({ freq: 1046.5, dur: 0.24, type: 'triangle', vol: 0.18 })
        this._clearPrize()
      },
    })
    tl.to(prize, { x: mal.x, y: mal.y, duration: 0.72, ease: 'power2.inOut' })
      .to(prize.scale, { x: TROF_SIZE / PRIZE_SIZE, y: TROF_SIZE / PRIZE_SIZE, duration: 0.72, ease: 'power2.inOut' }, 0)
    this._track(tl)
  },

  // Ceremonins nedmontering. Masken kopplas loss FÖRE rivningen: en `mask` som pekar på en
  // redan riven Graphics är precis det som smäller om barnet lämnar mitt i firandet.
  _clearPrize() {
    const lag = this._prizeLayer
    if (this._prizeGlans && !this._prizeGlans.destroyed) this._prizeGlans.mask = null
    for (const n of [lag, this._prizeNod, this._prizeStar, this._prizeRays, this._prizeDim, this._prizeBand]) {
      if (n && !n.destroyed) {
        gsap.killTweensOf(n)
        if (n.scale) gsap.killTweensOf(n.scale)
      }
    }
    this._prizeLayer = null
    this._prizeNod = null
    this._prizeStar = null
    this._prizeRays = null
    this._prizeDim = null
    this._prizeGlans = null
    this._prizeBand = null
    riv(lag)
  },

  // ---- Trofehyllan ---------------------------------------------------------

  _trofStatus(key) {
    if (this._trofeer.includes(key)) return 'dubblett'
    if (this._trofeer.length >= TROF_MAX) return 'full'
    return 'ny'
  },

  // −29, inte −38: skuggan sitter på `TROF_SIZE * 0,48` = 32,6 px under behållaren, och
  // plankans ÖVERSIDA ligger på `SHELF_Y`. Med −38 hamnade skuggan 5 px OVANFÖR plankan
  // och troféerna svävade — syntes bara i skärmdumpen, aldrig i ett tal.
  _trofPos(i) {
    return { x: SHELF_X + (i % 2 ? SHELF_DX : -SHELF_DX), y: SHELF_Y[(i / 2) | 0] - 29 }
  },

  // Hyllan är PLANKOR att stå på, aldrig rutor att ligga i: troféerna ritas fristående
  // ovanpå med egen silhuett, egen markskugga och eget liv (P0 ASSETS).
  _buildShelf() {
    const s = new Container()
    s.eventMode = 'none'
    s.interactiveChildren = false
    const g = new Graphics()
    for (const y of SHELF_Y) {
      g.roundRect(10, y, 232, 15, 7).fill(topLightFill(0xa87c4e))
      g.roundRect(10, y + 10, 232, 6, 3).fill({ color: 0x6b4d38, alpha: 0.5 })
      g.moveTo(30, y + 15).lineTo(42, y + 42).lineTo(54, y + 15).closePath().fill(0x8a6238)
      g.moveTo(198, y + 15).lineTo(210, y + 42).lineTo(222, y + 15).closePath().fill(0x8a6238)
    }
    g.eventMode = 'none'
    s.addChild(g)
    this._trofLager = new Container()
    this._trofLager.eventMode = 'none'
    s.addChild(this._trofLager)
    this._shelf = s
    this._root.addChild(s)
    for (let i = 0; i < this._trofeer.length; i++) this._placeTrophy(this._trofeer[i], i)
  },

  _placeTrophy(key, i) {
    if (!this._trofLager || this._trofLager.destroyed) return null
    const p = this._trofPos(i)
    const c = new Container()
    c.eventMode = 'none'
    c.position.set(p.x, p.y)
    const skugga = new Graphics()
      .ellipse(0, TROF_SIZE * 0.48, TROF_SIZE * 0.34, TROF_SIZE * 0.1)
      .fill({ color: 0x2a1d16, alpha: 0.22 })
    skugga.eventMode = 'none'
    const inner = new Container()
    inner.eventMode = 'none'
    const ikon = drawIcon(key, TROF_SIZE)
    ikon.eventMode = 'none'
    inner.addChild(ikon)
    c.addChild(skugga, inner)
    // Vilorörelsen ligger i ett BARN — behållarens y äger platsen på plankan, guppningen
    // får inte slåss med den (samma uppdelning som `makeSymbol`).
    liv(inner, { bob: 3, sway: 0.02, duration: 2.6 + Math.random() * 0.9 })
    c._trofInner = inner
    this._trofLager.addChild(c)
    this._trofNoder.push(c)
    return c
  },

  // Två lika → mellanfirande: de två som är lika hoppar ut och möts.
  _pairWin(ctx, par) {
    const a = ctx.services.audio
    a.sfx('pling')
    a.tone({ freq: 523.25, dur: 0.2, type: 'triangle', vol: 0.22 })
    a.tone({ freq: 783.99, dur: 0.3, type: 'triangle', vol: 0.22, delay: 0.14 })
    this._lightMode = 'snurr'
    this._bobo?.react('heja')
    this._say(ctx, randomFrom(TVA_LIKA), true)
    this._leapOut(this._reels[par[0]], 560, 262)
    this._leapOut(this._reels[par[1]], 720, 262)
    ctx.later(0.4, () => {
      if (!this._alive) return
      sparkle(ctx.fxLayer, 640, 262, { count: 10 })
      ctx.services.audio.sfx('pop')
      this._danceLeaps()
    })
    this._coinRain(ctx, 24)
    ctx.later(2, () => { if (this._alive) this._leapBack(ctx) })
    ctx.later(2.6, () => { if (this._alive) this._nextSpin(ctx) })
  },

  // Alla olika → symbolerna virvlar ihop och en TOKIG BLANDFIGUR kliver ur luckan.
  _blendWin(ctx, keys) {
    const a = ctx.services.audio
    a.sfx('whoosh')
    this._lightMode = 'snurr'
    this._say(ctx, randomFrom(BLANDAT), true)
    for (let i = 0; i < 3; i++) this._leapOut(this._reels[i], 640, 300)
    ctx.later(0.55, () => {
      if (!this._alive) return
      burst(ctx.fxLayer, 640, 300, { count: 20 })
      ctx.services.audio.sfx('pop')
      ctx.services.audio.tone({ freq: 320, dur: 0.3, type: 'sine', vol: 0.2, slideTo: 900 })
      for (const l of this._leaps) if (l.node && !l.node.destroyed) l.node.visible = false
      this._spawnBland(ctx, keys)
      // Blandfiguren fick tidigare INGA mynt alls — den vanligaste utgången var därmed
      // den snålaste. Nu kommer regnet när figuren kliver ur luckan, som dess entré.
      this._coinRain(ctx, 24)
    })
    ctx.later(3.3, () => { if (this._alive) this._despawnBland(ctx) })
    ctx.later(3.5, () => { if (this._alive) this._leapBack(ctx) })
    ctx.later(4, () => { if (this._alive) this._nextSpin(ctx) })
  },

  // ---- Symboler som hoppar UT ur fönstren ---------------------------------

  // ⚠️ Symbolen i FÖNSTRET blir kvar. Första versionen dolde den medan kopian dansade,
  // och skärmdumpen visade två TOMMA trumfönster mitt i festen — det läser som en bugg,
  // inte som ett firande. Nu poppar originalet till på trumman i samma ögonblick som
  // kopian skjuter ut, så det ser ut som att en symbol till hoppade fram.
  _leapOut(r, tx, ty) {
    if (!this._alive || !r.key) return
    const node = makeSymbol(r.key, 112)
    node.position.set(REEL_X[r.i], REEL_Y)
    this._front.addChild(node)
    const centre = this._centreNode(r)
    if (centre && !centre.destroyed) pop(centre, { scale: 1.14 })
    this._leaps.push({ node, reel: r })
    const tl = gsap.timeline()
    tl.to(node, { x: tx, y: ty, duration: 0.36, ease: 'back.out(1.5)' })
      .to(node.scale, { x: 1.2, y: 1.2, duration: 0.36, ease: 'back.out(1.8)' }, 0)
    this._track(tl)
  },

  _danceLeaps() {
    for (const l of this._leaps) {
      const n = l.node
      if (!n || n.destroyed) continue
      const tl = gsap.timeline({ repeat: 3 })
      tl.to(n, { y: n.y - 26, rotation: 0.14, duration: 0.22, ease: 'power2.out' })
        .to(n, { y: n.y, rotation: -0.14, duration: 0.28, ease: 'bounce.out' })
      this._track(tl)
    }
  },

  _leapBack(ctx) {
    for (const l of this._leaps) {
      const n = l.node
      const r = l.reel
      if (!n || n.destroyed) continue
      gsap.killTweensOf(n)
      gsap.killTweensOf(n.scale)
      n.visible = true // blandfiguren gömde dem — de ska SES flyga hem
      const tl = gsap.timeline({
        onComplete: () => {
          riv(n)
        },
      })
      tl.to(n, { x: REEL_X[r.i], y: REEL_Y, rotation: 0, duration: 0.3, ease: 'power2.in' })
        .to(n.scale, { x: 0.7, y: 0.7, duration: 0.3, ease: 'power2.in' }, 0)
      this._track(tl)
      sparkle(ctx.fxLayer, REEL_X[r.i], REEL_Y, { count: 4 })
    }
    this._leaps = []
  },

  // ---- Blandfiguren --------------------------------------------------------

  _spawnBland(ctx, keys) {
    this._despawnBland(ctx)
    const fig = makeBlandfigur(keys, randomFrom(PLAYFUL))
    fig.position.set(640, 706)
    fig.scale.set(0.2)
    this._front.addChild(fig)
    this._bland = fig
    this._bobo?.react('hoppsan')
    const a = ctx.services.audio
    a.tone({ freq: 240, dur: 0.18, type: 'sine', vol: 0.18, slideTo: 520 })
    a.tone({ freq: 660, dur: 0.14, type: 'triangle', vol: 0.16, delay: 0.2 })
    // Blandfiguren är den VANLIGASTE utgången och har bara en kroppsmall, så samma
    // figur skulle annars komma tillbaka identisk gång på gång. Slumpad slutstorlek
    // och bredd gör varje blandning till sin egen individ tills mallarna blir fler.
    const stor = 0.66 + Math.random() * 0.14
    const bred = 0.92 + Math.random() * 0.16
    const tl = gsap.timeline()
    tl.to(fig, { y: 676, duration: 0.36, ease: 'back.out(1.7)' })
      .to(fig.scale, { x: stor * bred, y: stor, duration: 0.36, ease: 'back.out(1.7)' }, 0)
    // Dansen: fyra hopp med vaggning — en tokig figur ska bete sig tokigt.
    for (let i = 0; i < 4; i++) {
      tl.to(fig, { y: 638, rotation: i % 2 ? 0.12 : -0.12, duration: 0.2, ease: 'power2.out' })
        .to(fig, { y: 676, rotation: 0, duration: 0.28, ease: 'bounce.out' })
    }
    this._track(tl)
    for (let i = 0; i < 4; i++) {
      ctx.later(0.5 + i * 0.48, () => {
        if (!this._alive) return
        ctx.services.audio.tone({ freq: 400 + i * 90, dur: 0.1, type: 'square', vol: 0.09 })
        sparkle(ctx.fxLayer, 640, 560, { count: 4 })
      })
    }
  },

  _despawnBland(ctx) {
    const fig = this._bland
    this._bland = null
    if (!fig || fig.destroyed) return
    gsap.killTweensOf(fig)
    gsap.killTweensOf(fig.scale)
    burst(ctx.fxLayer, 640, 570, { count: 14 })
    ctx.services.audio.sfx('pop')
    const tl = gsap.timeline({ onComplete: () => riv(fig) })
    tl.to(fig.scale, { x: 0.1, y: 0.1, duration: 0.22, ease: 'back.in(1.6)' })
      .to(fig, { y: 712, duration: 0.22, ease: 'power2.in' }, 0)
    this._track(tl)
  },

  // ---- Efter ett snurr: framsteg och ev. rundfinal -------------------------

  _nextSpin(ctx) {
    if (!this._alive) return
    this._spins++
    if (this._lampLit < SPINS_PER_ROUND) {
      this._paintLamp(this._lampLit, true)
      this._lampLit++
      ctx.services.audio.tone({ freq: 880 + this._lampLit * 60, dur: 0.12, type: 'sine', vol: 0.14 })
    }
    if (this._spins >= SPINS_PER_ROUND) {
      this._finishRound(ctx)
      return
    }
    this._phase = 'redo'
    this._lightMode = 'vila'
    this._idle = 0
    this._armLever()
  },

  // Rundans egen finish: lamporna springer runt HELA maskinen och ett myntregn av
  // glitter forsar ur luckan — sedan får snurran en ny färgpalett och nya symboler.
  _finishRound(ctx) {
    this._phase = 'firar'
    this._lightMode = 'party'
    this._bobo?.react('jubel')
    shake(this._deco, { intensity: 9, duration: 0.6 })
    this._coinRain(ctx, 56)
    ctx.services.audio.sfx('correct')
    ctx.progress.complete() // firande + beröm + stjärna + klistermärke (skalet)
    this._round++
    ctx.progress.setCustom('rundor', this._round)
    ctx.progress.setLevel(Math.min(9, 1 + this._round))

    // Egen replik EFTER skalets beröm, annars talar de i mun på varandra.
    ctx.later(1.4, () => {
      if (this._alive) this._say(ctx, 'Hurra! Snurran fick nya färger!', true)
    })
    ctx.later(2.6, () => {
      if (!this._alive) return
      this._spins = 0
      this._applyRound(ctx)
      for (const r of this._reels) {
        const n = this._centreNode(r)
        if (n && !n.destroyed) pop(n, { scale: 1.2 })
      }
      this._phase = 'redo'
      this._lightMode = 'vila'
      this._idle = 0
    })
  },

  // ---- Myntregn ur luckan --------------------------------------------------

  _coinRain(ctx, n) {
    this._coinQueue = (this._coinQueue || 0) + n
    ctx.services.audio.sfx('pling')
  },

  // Myntpoolen byggs EN gång. Först föddes och revs varje mynt för sig, och det var
  // mätbart farligt: två kontrollarmar (bibliotekskärmen ensam, och spelet monterat men
  // ospelat) gick 50 s utan ett enda fel, medan varje SPELAD körning slutade med
  // "Could not retrieve shader source (WebGL context may be lost)". Ett firande födde upp
  // till 90 Graphics — alltså 90 GraphicsContext med var sin GPU-buffert — på två
  // sekunder. En pool allokerar noll under spel.
  _buildCoinPool() {
    this._coinPool = []
    for (let i = 0; i < COIN_CAP; i++) {
      const g = new Graphics()
      const rr = 11 + (i % 5) * 1.5
      if (i % 3 === 0) {
        const c = RAINBOW[i % RAINBOW.length]
        if (g.star) g.star(0, 0, 5, rr, rr * 0.5).fill(c)
        else g.circle(0, 0, rr).fill(c)
      } else {
        g.circle(0, 0, rr).fill(sphereFill(0xffd35c, { dark: 0.3 })).stroke({ width: 2.5, color: 0xd9a12c })
        g.circle(-rr * 0.3, -rr * 0.3, rr * 0.3).fill({ color: 0xffffff, alpha: 0.6 })
      }
      g.eventMode = 'none'
      g.visible = false
      this._front.addChild(g)
      this._coinPool.push({ g, aktiv: false, x: 0, y: 0, vx: 0, vy: 0, spin: 0, rot: 0, life: 0, max: 1 })
    }
  },

  _spawnCoin() {
    const c = this._coinPool.find((p) => !p.aktiv)
    if (!c) return // taket nått — kön tappar överskottet, vilket inte syns
    c.aktiv = true
    c.x = 640 + (Math.random() * 2 - 1) * 80
    c.y = HATCH.y + 30
    c.vx = (Math.random() * 2 - 1) * 210
    c.vy = -260 - Math.random() * 240
    c.spin = (Math.random() * 2 - 1) * 9
    c.rot = Math.random() * 6
    c.life = 0
    c.max = 1.5 + Math.random() * 0.5
    if (!c.g.destroyed) {
      c.g.visible = true
      c.g.alpha = 1
      c.g.position.set(c.x, c.y)
    }
    this._coins.push(c)
  },

  // ---- Tomt tryck ----------------------------------------------------------

  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    ctx.services.audio.sfx('soft')
    ripple(ctx.fxLayer, p.x, p.y, { maxR: 70, width: 5, alpha: 0.5 })
    sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
    if (this._phase === 'redo' && this._lever && !this._lever.destroyed) wiggle(this._lever)
  },

  // ---- Ticker --------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(ticker.deltaMS, 50) / 1000
    this._t += dt
    this._lightT += dt

    for (const r of this._reels) this._stepReel(ctx, r, dt)
    this._stepBulbs()
    this._stepBobo(dt)
    this._stepCoins(dt)

    // Ceremonins stjärna och strålar snurrar i TICKERN — en `repeat: -1`-tween hade
    // överlevt sin nod, och strålarna går medvetet ÅT ANDRA HÅLLET: två lager som roterar
    // åt samma håll läser som ett hjul, motsatta som ett sken.
    if (this._prizeStar && !this._prizeStar.destroyed) {
      this._prizeT += dt
      this._prizeStar.rotation = this._prizeT * 0.55
      if (this._prizeRays && !this._prizeRays.destroyed) this._prizeRays.rotation = -this._prizeT * 0.28
    }

    // Vilorörelse: symbolen mitt i en stillastående trumma andas.
    for (const r of this._reels) {
      const n = r.state === 'still' ? this._centreNode(r) : null
      for (const m of r.nodes) {
        if (!m || m.destroyed || !m._symInner) continue
        if (m === n) {
          m._symInner.y = Math.sin(this._t * 1.9 + r.i * 1.7) * 4 - 2
          m._symInner.rotation = Math.cos(this._t * 1.5 + r.i) * 0.03
        } else if (m._symInner.y !== 0) {
          m._symInner.y = 0
          m._symInner.rotation = 0
        }
      }
    }

    // Mjuk om-cue — aldrig en tillsägelse, aldrig ett automatiskt drag åt barnet.
    this._idle += dt
    if (this._idle >= IDLE_DELAY) {
      this._idle = 0
      if (this._phase === 'redo') {
        this._say(ctx, 'Tryck på den stora spaken!')
        if (this._lever && !this._lever.destroyed) pop(this._lever, { scale: 1.12 })
      } else if (this._phase === 'snurrar') {
        this._say(ctx, 'Tryck på ett hjul så stannar det!')
        for (const r of this._reels) {
          if (r.state === 'spin') ripple(ctx.fxLayer, REEL_X[r.i], REEL_Y, { maxR: 100, width: 5, alpha: 0.4 })
        }
      }
    }
  },

  _stepReel(ctx, r, dt) {
    if (r.wait > 0) {
      r.wait -= dt
      if (r.wait > 0) {
        this._layoutReel(r)
        return
      }
    }
    if (r.state === 'spin') {
      r.spd = Math.min(r.spdMax, r.spd + SPIN_ACC * dt)
      r.offset = modw(r.offset + r.spd * dt, TOTAL)
      r.spinT += dt
      this._reelTick(ctx, r)
      if (r.pending && r.spinT >= MIN_SPIN) {
        r.pending = false
        this._stopReel(r)
      } else if (this._auto && r.spinT >= r.autoAt) {
        // JAKTEN: hjulet stannar först när den symbol som SKULLE landa är den vi vill ha.
        // Att i stället TVINGA fram ett mål hade fått hjulet att accelerera in i sitt
        // stopp — `_stopReel` är en inbromsning från `offset` till `to` på 0,42 s, och ett
        // mål ett varv bort hade betytt 1 008 px på den tiden. Taket bryter jakten så ett
        // hjul aldrig kan snurra i evighet, hur omöjlig symbolen än råkar vara.
        if (!this._wantKey || this._wouldKey(r) === this._wantKey || r.spinT >= r.autoAt + AUTO_JAKT_TAK) {
          this._stopReel(r)
        }
      }
    } else if (r.state === 'stop') {
      r.t += dt
      const k = Math.min(1, r.t / STOP_DUR)
      const e = 1 - Math.pow(1 - k, 3)
      r.offset = r.from + (r.to - r.from) * e
      if (k >= 1) {
        this._onReelStopped(ctx, r)
        return
      }
      this._reelTick(ctx, r)
    }
    // Layouten körs ÄVEN när trumman står still: den är det enda stället som återställer
    // synligheten på en symbol som hoppat ut ur fönstret och kommit tillbaka.
    this._layoutReel(r)
  },

  // Mekaniskt tick varje gång en symbol passerar mitten — det är rytmen Bobo studsar i.
  _reelTick(ctx, r) {
    const k = Math.floor(modw(r.offset, TOTAL) / PITCH)
    if (r.tickK == null) {
      r.tickK = k
      return
    }
    if (k === r.tickK) return
    r.tickK = k
    ctx.services.audio.tone({ freq: 760 + r.i * 100, dur: 0.03, type: 'triangle', vol: 0.05 })
    if (r.i === 0) this._bobT = 0
  },

  // Lampringen: bara ALFAN skrivs (geometrin är ritad en gång i _paintMachine).
  // vila = mjukt tindrande · snurr = ett ljus som springer varvet runt · party = snabbare
  // varv på en ljusare botten.
  _stepBulbs() {
    const mode = this._lightMode
    const n = this._bulbs.length
    for (let i = 0; i < n; i++) {
      const g = this._bulbs[i]
      if (!g || g.destroyed) continue
      let a
      if (mode === 'vila') {
        a = 0.55 + 0.25 * Math.sin(this._lightT * 1.3 + i * 0.7)
      } else {
        const speed = mode === 'party' ? 1.15 : 0.5
        const ph = Math.cos((i / n - this._lightT * speed) * Math.PI * 2)
        a = (mode === 'party' ? 0.45 : 0.3) + 0.7 * Math.pow(Math.max(0, ph), 6)
      }
      g.alpha = Math.min(1, a)
    }
  },

  _stepBobo(dt) {
    if (!this._boboWrap || this._boboWrap.destroyed) return
    if (this._bobT < 1) {
      this._bobT = Math.min(1, this._bobT + dt * 3.4)
      this._boboWrap.y = -22 * Math.sin(this._bobT * Math.PI)
    } else if (this._boboWrap.y !== 0) {
      this._boboWrap.y = 0
    }
  },

  _stepCoins(dt) {
    if (this._coinQueue > 0) {
      this._coinAcc = (this._coinAcc || 0) + dt
      while (this._coinAcc > 0.035 && this._coinQueue > 0) {
        this._coinAcc -= 0.035
        this._coinQueue--
        this._spawnCoin()
      }
    }
    for (let i = this._coins.length - 1; i >= 0; i--) {
      const c = this._coins[i]
      c.life += dt
      if (c.g.destroyed || c.life > c.max || c.y > 780) {
        c.aktiv = false
        if (!c.g.destroyed) c.g.visible = false
        this._coins.splice(i, 1)
        continue
      }
      c.vy += 1250 * dt
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.rot += c.spin * dt
      c.g.position.set(c.x, c.y)
      // Vridning kring egen axel: bredden pulserar som ett mynt i luften.
      c.g.scale.x = 0.32 + 0.68 * Math.abs(Math.cos(c.rot))
      c.g.alpha = Math.min(1, (c.max - c.life) * 3)
    }
  },

  // ---- Småhjälpare ---------------------------------------------------------

  _track(tl) {
    // Rensa FÄRDIGA/DÖDADE tidslinjer (tw.parent, se CLAUDE.md) — aldrig de äldsta.
    if (this._tls.length > 40) this._tls = this._tls.filter((t) => t && t.parent)
    this._tls.push(tl)
    return tl
  },

  _say(ctx, text, force = false) {
    const now = performance.now()
    if (!force && now - this._lastSay < 900) return
    this._lastSay = now
    ctx.services.voice.say(text)
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)

    for (const t of this._tls) t?.kill?.()
    this._tls = []
    this._leverBreath?.kill()
    this._leverBreath = null

    this._coins = []
    this._coinPool = []
    this._coinQueue = 0

    for (const l of this._leaps) {
      if (l.node && !l.node.destroyed) {
        gsap.killTweensOf(l.node)
        gsap.killTweensOf(l.node.scale)
      }
    }
    this._leaps = []

    if (this._bland && !this._bland.destroyed) {
      gsap.killTweensOf(this._bland)
      gsap.killTweensOf(this._bland.scale)
    }
    this._bland = null

    for (const r of this._reels || []) {
      for (const n of r.nodes) {
        if (n && !n.destroyed) {
          gsap.killTweensOf(n)
          gsap.killTweensOf(n.scale)
        }
      }
      if (r.view && !r.view.destroyed) {
        gsap.killTweensOf(r.view)
        gsap.killTweensOf(r.view.scale)
      }
    }
    this._reels = []

    // Ceremonin kan rullа när barnet trycker på bakåtknappen — den rivs FÖRE roten, så
    // masken hinner kopplas loss från sin Graphics.
    this._clearPrize()

    // Troféernas vilorörelse är EVIGA tweens (`liv()` kör `repeat: -1`). De dör inte av
    // sig själva och måste dödas var för sig, annars tickar de vidare på rivna noder.
    for (const n of this._trofNoder || []) {
      if (!n || n.destroyed) continue
      n._trofInner?._fxLiv?.kill()
      gsap.killTweensOf(n)
      gsap.killTweensOf(n.scale)
    }
    this._trofNoder = []

    if (this._togKnob && !this._togKnob.destroyed) gsap.killTweensOf(this._togKnob)
    if (this._lever && !this._lever.destroyed) {
      gsap.killTweensOf(this._lever)
      gsap.killTweensOf(this._lever.scale)
    }
    if (this._deco && !this._deco.destroyed) gsap.killTweensOf(this._deco)
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onEmpty)

    this._bobo?.destroy()
    this._bobo = null
    ctx?.services?.voice?.cancel()
    riv(this._root)
  },
}

// =================== Programmatisk grafik ===================

// En symbol på trumman: ett FRISTÅENDE ritat föremål med egen silhuett och egen
// markskugga — aldrig en emoji i en ruta (P0 ASSETS). `_symInner` bär vilorörelsen,
// så trummans layout (som äger nodens y) aldrig slåss med guppningen.
function makeSymbol(key, size = 108) {
  const c = new Container()
  c.eventMode = 'none'
  const shadow = new Graphics().ellipse(0, size * 0.46, size * 0.34, size * 0.1).fill({ color: 0x2a1d16, alpha: 0.16 })
  shadow.eventMode = 'none'
  const inner = new Container()
  inner.eventMode = 'none'
  c.addChild(shadow, inner)
  c._symInner = inner
  c._symSize = size
  c._symKey = key
  c._symSetKey = (k) => {
    if (c.destroyed || inner.destroyed) return
    c._symKey = k
    // riv() i stället för destroy({children:true}) — se noten vid funktionen.
    for (const ch of inner.removeChildren()) riv(ch)
    const icon = drawIcon(k, size)
    icon.eventMode = 'none'
    inner.addChild(icon)
  }
  c._symSetKey(key)
  return c
}

// En stjärna ritad för hand i stället för via `Graphics.star` — myntpoolen gardera redan
// mot att metoden saknas, och ceremonins stjärna är för central för att få vara villkorad.
function ritStjarna(g, uddar, R, r, stil, vrid = 0) {
  const n = uddar * 2
  for (let i = 0; i < n; i++) {
    const rad = i % 2 ? r : R
    const v = vrid - Math.PI / 2 + (i * Math.PI) / uddar
    const x = Math.cos(v) * rad
    const y = Math.sin(v) * rad
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath().fill(stil)
}

// Lägesväljarens två pictogram. Rena UI-glyfer på en kontrollpanel (tillåtet enligt
// P0 ASSETS), ritade i EN Graphics med egen fyllning per form.
// HANDEN = "du trycker själv": pekfingret uppåt ur en knuten näve, med tummen på sidan.
// ⚠️ Första ritningen var näve + finger NEDÅT mot en knapp och spände 68 px på en bricka
// med 62 px diameter — den fyllde cirkeln helt och läste i skärmdumpen som ett NYCKELHÅL.
// Silhuetten måste BRYTA mot brickans rundning för att läsas som en hand: smal upptill,
// bred nedtill, och tummen som gör formen osymmetrisk.
// Fingret måste vara MYCKET smalare än näven (11 mot 34 px) — med 13 mot 30 läste de två
// formerna ihop till en enda stapel i skärmdumpen, och tummen försvann i näven.
function ritHand(g, x, y, stil) {
  g.roundRect(x - 5, y - 28, 11, 28, 5.5).fill(stil) // pekfingret
  g.roundRect(x - 17, y - 6, 34, 27, 12).fill(stil) // näven
  g.roundRect(x - 26, y + 2, 12, 15, 6).fill(stil) // tummen, sticker ut åt vänster
}

// GNISTAN = "det sköter sig självt": en fyruddig glans med två små följeslagare.
function ritGnista(g, x, y, stil) {
  const udd = (cx, cy, R, r) => {
    g.moveTo(cx, cy - R)
      .quadraticCurveTo(cx + r, cy - r, cx + R, cy)
      .quadraticCurveTo(cx + r, cy + r, cx, cy + R)
      .quadraticCurveTo(cx - r, cy + r, cx - R, cy)
      .quadraticCurveTo(cx - r, cy - r, cx, cy - R)
      .closePath()
      .fill(stil)
  }
  udd(x - 2, y - 6, 29, 6)
  udd(x + 23, y + 21, 13, 3)
  udd(x - 24, y + 18, 10, 2)
}

// Lampornas lägen runt maskinens ram (medurs, så ljuset kan springa varvet runt).
function ringPositions(L, T, R, B, nx, ny) {
  const p = []
  for (let i = 0; i < nx; i++) p.push({ x: L + ((R - L) * i) / (nx - 1), y: T })
  for (let i = 1; i <= ny; i++) p.push({ x: R, y: T + ((B - T) * i) / (ny + 1) })
  for (let i = nx - 1; i >= 0; i--) p.push({ x: L + ((R - L) * i) / (nx - 1), y: B })
  for (let i = ny; i >= 1; i--) p.push({ x: L, y: T + ((B - T) * i) / (ny + 1) })
  return p
}

// BLANDFIGUREN: den lyckligaste utgången av alla tre, byggd av de tre symbolerna som
// INTE var lika. En riktig liten varelse med kropp, ben, armar och ögon — symbolerna
// sitter som hatt, mage och något den håller upp i handen. Origo = fötterna.
function makeBlandfigur(keys, color) {
  const c = new Container()
  c.eventMode = 'none'
  const dark = shade(color, 0.3)
  const g = new Graphics()

  g.ellipse(0, 6, 74, 15).fill({ color: 0x2a1d16, alpha: 0.18 })
  // Ben och fötter.
  g.roundRect(-34, -54, 22, 56, 11).fill(cylinderFill(dark))
  g.roundRect(12, -54, 22, 56, 11).fill(cylinderFill(dark))
  g.ellipse(-23, -2, 24, 11).fill(shade(color, 0.45))
  g.ellipse(23, -2, 24, 11).fill(shade(color, 0.45))
  // Armar (den högra hålls upp).
  g.moveTo(-52, -128).quadraticCurveTo(-84, -120, -92, -92).stroke({ width: 17, color: dark, cap: 'round' })
  g.moveTo(52, -128).quadraticCurveTo(88, -132, 96, -160).stroke({ width: 17, color: dark, cap: 'round' })
  // Kropp.
  g.ellipse(0, -108, 64, 70).fill(sphereFill(color)).stroke({ width: 5, color: dark })
  g.ellipse(0, -100, 42, 44).fill({ color: COLORS.cream, alpha: 0.55 })
  // Huvud.
  g.circle(0, -204, 48).fill(sphereFill(color)).stroke({ width: 5, color: dark })
  g.circle(-38, -228, 12).fill(color).stroke({ width: 4, color: dark })
  g.circle(38, -228, 12).fill(color).stroke({ width: 4, color: dark })
  // Ögon (olika stora — figuren ska vara TOKIG, inte prydlig).
  g.circle(-18, -212, 17).fill(COLORS.white)
  g.circle(19, -210, 14).fill(COLORS.white)
  g.circle(-15, -209, 8).fill(COLORS.ink)
  g.circle(21, -213, 7).fill(COLORS.ink)
  g.circle(-17, -212, 3).fill(COLORS.white)
  // Mun + kinder.
  g.moveTo(-20, -182).quadraticCurveTo(2, -164, 22, -184).stroke({ width: 6, color: COLORS.ink, cap: 'round' })
  g.circle(-36, -186, 9).fill({ color: COLORS.pink, alpha: 0.7 })
  g.circle(36, -186, 9).fill({ color: COLORS.pink, alpha: 0.7 })
  // Dager på huvud och kropp.
  g.ellipse(-17, -224, 15, 10).fill({ color: COLORS.white, alpha: 0.3 })
  g.ellipse(-22, -130, 18, 12).fill({ color: COLORS.white, alpha: 0.22 })
  c.addChild(g)

  // De tre symbolerna: hatt, mage och något i handen.
  const hatt = drawIcon(keys[0], 66)
  hatt.position.set(0, -262)
  const mage = drawIcon(keys[1], 62)
  mage.position.set(0, -102)
  const hand = drawIcon(keys[2], 54)
  hand.position.set(102, -178)
  for (const s of [hatt, mage, hand]) {
    s.eventMode = 'none'
    c.addChild(s)
  }
  return c
}
