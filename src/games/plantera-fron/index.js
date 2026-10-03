// Plantera Frön — lugn dra + vattna-lek (2–4 år). Tre steg utan press:
//   1. Så:    dra (eller tap-tap) frön ner i jordhålen → de snäpper ner, jordhög.
//             Riktigt "plopp"-klipp när fröet landar i jorden.
//   2. Vattna: när allt är sått dyker vattenkannan upp. Barnet DRAR kannan över en
//              planta och håller kvar → kannan lutar, vattendroppar rinner (mjukt
//              porlande vattenljud), jorden mörknar av fukt och plantan VÄXER över tid
//              (grodd → stjälk → blad → svällande knopp).
//   3. Blomning: när en planta vattnats klart är knoppen full → den SPRICKER och
//              kronbladen vecklar ut sig ETT i taget (stigande ton) innan blomman
//              poppar in med ett magi-klipp, gnistror och pollen-pluff — klimax.
//   4. Klart: när alla plantor blommat fladdrar fjärilar in → firande + klistermärke,
//              ny runda. Inga felsteg: vattnet växer alltid. Pausar barnet vinkar
//              kannan först (bara röst+gest); först SENARE hjälper en mjuk auto-vattning
//              lite (svagare dos), så barnets hållande faktiskt avgör — men det blir
//              alltid klart.
// Inga felsteg, ingen timer, ingen poäng. Allt ritas programmatiskt (Pixi) — blomhuvudet
// också: kronblad med volym, en mitt och ett litet ansikte som blinkar, ser mot kannan och ler.
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, squash, puff, sparkle , kvittera, liv, landa as landaFx } from '../../lib/feedback.js'
import { landa } from '../../lib/landa.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, tint } from '../../lib/theme.js'
import { verticalFill, sphereFill, topLightFill, bage } from '../../lib/form.js'
import { pase } from '../../lib/variation.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// Himlen var tidigare den platta tonen 0xbfe6ff; de två nedan spänner om den.
const SKY_TOP = 0xa7dbfd
const SKY_HORIZON = 0xd8f1ff
const HOLE_Y = 560 // jordhålens y (i jordrabatten)
// Fröna står på marken (gräskanten strax ovanför jordlisten), inte i himlen: de FALLER in uppifrån
// och landar med studs (FYSIKPLAN P4, lib/landa.js). Skuggan sitter på markens y = SEED_Y + SEED_FOT.
// Avståndet till hålraden (HOLE_Y 560) är 168 > 100 = hålens snäppradie, så ett frö börjar aldrig INNE i ett mål och kräver ett drag.
const SEED_Y = 392
const SEED_FOT = 34 // fröets fot (och skuggan) under dess mitt
const BUD_COLORS = [0x6fbf73, 0x88c98a, 0x7bc043]
const POLLEN = 0xffe08a
// Dur-pentatonisk skala (C5–E6) för kronbladens pling och blommornas fnitter — stämd, inte gissad.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]

// --- Blomsorterna ---------------------------------------------------------
// Varje sort är en egen SILHUETT, inte bara en annan färg: antal kronblad, bredd, spetsig/rund/
// hjärtformad spets och en mitt i egen storlek. `lager` ritas bakifrån och fram (varje kronblad
// vecklas ut för sig i `_bloom`). Kronbladet börjar `off` px från mitten och är `ry*2` långt, så
// räckvidden är off + 2·ry ≈ 46–52 px — samma som de gamla kronbladens 48.
//   form: 'rund' | 'spets' | 'hjarta' · ton: <0 mörkare, >0 ljusare än sortens färg
//   vrid: andel av kronbladsvinkeln som lagret vrids, så de inre ligger i glipan mellan de yttre
const SORTER = [
  { id: 'prastkrage', farg: [0xfdf6ee, 0xffe3ef], mitt: 0xffd23c, R: 22, ink: 0x4a3220,
    lager: [{ n: 11, rx: 7, ry: 21, off: 6, form: 'rund', ton: 0 }] },
  { id: 'ros', farg: [0xff5d73, 0xf2557f, 0xff7a52], mitt: 0xffc07a, R: 19, ink: 0x4a2530,
    lager: [{ n: 7, rx: 19, ry: 17, off: 12, form: 'rund', ton: 0 }, { n: 7, rx: 14, ry: 11, off: 8, form: 'rund', ton: 0.2, vrid: 0.5 }] },
  { id: 'solros', farg: [0xffc928], mitt: 0xc98a4b, R: 27, ink: 0x3a2616, frukorn: true,
    lager: [{ n: 14, rx: 8, ry: 21, off: 6, form: 'spets', ton: -0.14, vrid: 0.5 }, { n: 14, rx: 8, ry: 21, off: 6, form: 'spets', ton: 0 }] },
  { id: 'tulpan', farg: [0xff8a3d, 0xff5d73, 0xffd35c], mitt: 0xfff0a0, R: 20, ink: 0x4a3220,
    lager: [{ n: 5, rx: 17, ry: 23, off: 4, form: 'spets', ton: 0 }] },
  { id: 'viol', farg: [0xa78bfa, 0x8f9bff], mitt: 0xffe27a, R: 18, ink: 0x2f2250,
    lager: [{ n: 5, rx: 17, ry: 18, off: 10, form: 'rund', ton: 0 }] },
  { id: 'korsbar', farg: [0xffb7d0, 0xffc9d8], mitt: 0xffe3a0, R: 19, ink: 0x5a2a3c,
    lager: [{ n: 5, rx: 17, ry: 22, off: 6, form: 'hjarta', ton: 0 }] },
]
const DROP_BLUE = 0x6fc3ef
const STEM_H = 150 // full stjälkhöjd
// Sällsynt jätteblomma: var sjätte blomning får ett 1,35 gånger större huvud. Plantan är
// ingen träffyta (eventMode 'none'), så skalan rör bara konsten.
const JATTE_CHANS = 1 / 6
const JATTE_SKALA = 1.35
const POUR_MS = 2600 // ms sammanhängande vattning för att blomma en planta
const SPROUT0 = 0.06 // liten startgrodd så det syns något att vattna
const CAN_HOME_X = 640
const CAN_HOME_Y = 150
const SPOUT_LOCAL = { x: -104, y: -12 } // pip-spetsen i kannans lokala koordinater

// --- Liv i jorden ---------------------------------------------------------
// `_stillaprobe` mätte spelet som ett äkta TABLEAU: 17 noder, **0** i rörelse,
// största utslag **0,0 px i tre svep**. Trädgården stod helt stilla medan barnet
// tittade på den. §4 [Quick]: "Liv i jorden vid sådd."
// ⚠️ Docen skrev masken som 🪱. P0 ASSETS förbjuder en emoji som HELA föremålet —
// masken nedan är RITAD, med egen silhuett och eget ansikte.
// Masken är inte dekor: den DYKER när ett frö plumsar ner, och kraften avtar med
// avståndet, så barnet ser att det bor något i jorden som känner av vad hen gör.
const WORM_RISE = 52 // px masken reser sig ur jorden när den kikar upp
const WORM_RANGE = 420 // px: inom denna radie skräms masken av ett nedslag
// ⚠️ Maskarna placeras RELATIVT hålraden, inte på fasta punkter. Första versionen
// hade fasta gläntor vid x=170/1110 — på nivå 0 finns BARA ETT hål (x=640), alltså
// låg närmaste mask 471 px bort och hamnade utanför WORM_RANGE: skrämseln var död
// på precis den nivå en tvååring spelar. Avstånden nedan mäts från hålradens ändar.
const WORM_OFFS = [150, 300] // px utanför hålraden — en nära mask och en bortre
const WORM_YS = [606, 644]

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t) => t * t * (3 - 2 * t) // mjuk 0→1

// Mörkare variant av en färg (jordkant, konturer).
function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

// --- Blomhuvudet: ritat, inte en emoji (FYSIKPLAN Ä12) -------------------------
// Kronbladet börjar vid (0, -off) och pekar uppåt; L är dess längd. Rotationen i `_makePlant`
// sprider ut dem runt mitten, och skalan 0→1 vecklar ut dem från mitten.
function ritaKronblad(g, form, rx, L, off) {
  if (form === 'spets') {
    g.moveTo(0, -off).quadraticCurveTo(-2 * rx, -off - L * 0.5, 0, -off - L).quadraticCurveTo(2 * rx, -off - L * 0.5, 0, -off)
    g.closePath()
  } else if (form === 'hjarta') {
    g.moveTo(0, -off)
      .bezierCurveTo(-1.5 * rx, -off - 0.25 * L, -1.1 * rx, -off - 1.05 * L, -0.5 * rx, -off - 0.98 * L)
      .quadraticCurveTo(-0.12 * rx, -off - 0.97 * L, 0, -off - 0.84 * L)
      .quadraticCurveTo(0.12 * rx, -off - 0.97 * L, 0.5 * rx, -off - 0.98 * L)
      .bezierCurveTo(1.1 * rx, -off - 1.05 * L, 1.5 * rx, -off - 0.25 * L, 0, -off)
    g.closePath()
  } else {
    g.ellipse(0, -off - L / 2, rx, L / 2)
  }
}

// Ett kronblad med volym: ljust mot spetsen, mörkare mot mitten (som skuggan i en blomma), ett
// mörkare kantstreck och en svag nerv. Gradienten är cachad per färg — noll bakningar per planta.
function makeKronblad(lag, farg) {
  const c = lag.ton < 0 ? shade(farg, -lag.ton) : tint(farg, lag.ton)
  const L = lag.ry * 2
  const g = new Graphics()
  ritaKronblad(g, lag.form, lag.rx, L, lag.off)
  g.fill(topLightFill(c, { highlight: 0.2, dark: 0.22, mid: 0.4 })).stroke({ width: 2, color: shade(c, 0.28), join: 'round' })
  g.moveTo(0, -lag.off - L * 0.2).lineTo(0, -lag.off - L * 0.62).stroke({ width: 1.8, color: shade(c, 0.3), alpha: 0.35, cap: 'round' })
  g.eventMode = 'none'
  return g
}

// Ett litet vänligt ansikte. `set` kallas varje bildruta men ritar bara om munnen när öppningen
// ändrats (kvantiserad i åttondelar). open 0..1 = leende → skratt · happy = blundar glatt (^ ^) ·
// lx/ly = blickriktning (-1..1) · blink 0.1..1 = ögonlockens höjd.
function makeFace(R, ink) {
  const root = new Container()
  root.eventMode = 'none'
  const ex = R * 0.4
  const er = R * 0.24
  const eyes = new Container()
  eyes.position.set(0, -R * 0.14)
  const pupils = []
  for (const s of [-1, 1]) {
    eyes.addChild(new Graphics().ellipse(s * ex, 0, er, er * 1.15).fill(0xffffff).stroke({ width: 1.4, color: ink }))
    const p = new Graphics().circle(0, 0, er * 0.58).fill(ink).circle(-er * 0.2, -er * 0.22, er * 0.2).fill(0xffffff)
    p.position.set(s * ex, 0)
    eyes.addChild(p)
    pupils.push(p)
  }
  const happyEyes = new Container()
  happyEyes.position.set(0, -R * 0.14)
  happyEyes.visible = false
  const hg = new Graphics()
  for (const s of [-1, 1]) bage(hg, s * ex, er * 0.45, er * 0.95, 1.12 * Math.PI, 1.88 * Math.PI).stroke({ width: Math.max(2, R * 0.1), color: ink, cap: 'round' })
  happyEyes.addChild(hg)
  const cheeks = new Graphics()
  cheeks.circle(-R * 0.66, R * 0.2, R * 0.17).fill({ color: 0xff7a8a, alpha: 0.42 })
  cheeks.circle(R * 0.66, R * 0.2, R * 0.17).fill({ color: 0xff7a8a, alpha: 0.42 })
  const mouth = new Graphics()
  mouth.position.set(0, R * 0.3)
  root.addChild(cheeks, eyes, happyEyes, mouth)
  const st = { q: -1 }
  const drawMouth = (q) => {
    mouth.clear()
    if (q === 0) {
      bage(mouth, 0, -R * 0.14, R * 0.36, 0.17 * Math.PI, 0.83 * Math.PI).stroke({ width: Math.max(2, R * 0.1), color: ink, cap: 'round' })
      return
    }
    const o = q / 8
    const w = R * 0.32
    const h = R * 0.36 * o
    mouth.moveTo(-w, 0).lineTo(w, 0).bezierCurveTo(w * 0.9, h * 1.5, -w * 0.9, h * 1.5, -w, 0).closePath()
    mouth.fill(0x8a2f3a).stroke({ width: Math.max(1.6, R * 0.07), color: ink, join: 'round' })
    if (o > 0.5) mouth.ellipse(0, h * 0.95, w * 0.5, h * 0.3).fill(0xff8a98)
  }
  return {
    root,
    set({ open = 0, happy = false, lx = 0, ly = 0, blink = 1 }) {
      const q = Math.round(Math.max(0, Math.min(1, open)) * 8)
      if (q !== st.q) {
        st.q = q
        drawMouth(q)
      }
      eyes.visible = !happy
      happyEyes.visible = happy
      eyes.scale.y = blink
      pupils[0].position.set(-ex + lx * R * 0.1, ly * R * 0.1)
      pupils[1].position.set(ex + lx * R * 0.1, ly * R * 0.1)
    },
  }
}

// Knoppen: en grön ägg-silhuett med tre kronbladsspetsar i sortens färg som tittar upp ur toppen
// (en ledtråd om vad som kommer) och ett sovande litet ansikte som ler när den vattnas.
function makeBud(sort, farg, green) {
  const c = new Container()
  c.eventMode = 'none'
  const dark = shade(green, 0.3)
  for (const a of [-0.6, 0, 0.6]) {
    const t = new Graphics()
    ritaKronblad(t, 'spets', 6, 17, 12)
    t.fill(topLightFill(farg, { highlight: 0.2, dark: 0.22 })).stroke({ width: 2, color: shade(farg, 0.28), join: 'round' })
    t.rotation = a
    c.addChild(t)
  }
  c.addChild(new Graphics().circle(0, 0, 20).fill(sphereFill(green)).stroke({ width: 3, color: dark }))
  const face = makeFace(14, 0x1f4a2a)
  face.root.position.set(0, 1)
  c.addChild(face.root)
  c._face = face
  return c
}

// --- Trädgården som minns (U3, D15) ---------------------------------------------
// Blommorna barnet odlat står kvar i en rabatt på kullarna vid sidorna: 12 platser (6 vid vardera
// kanten, växer inåt). Spar-nyckeln `custom.tradgard` = { n, rad } — `n` är hur många blommor som
// någonsin planterats, `rad` en post per plats ({ s: sortens id, j: 1 om jätteblomma }). Den
// (n + 1):a blomman tar plats n % 12, så de äldsta ersätts på plats och inget skiftar. Den gamla
// nyckeln `custom.flowers` (ett antal) skrivs fortfarande OFÖRÄNDRAD och läses som reserv: har
// barnet bara den, fylls rabatten ur den (sorterna i tur och ordning) tills första nya blomman.
const TRADGARD_PLATSER = 12 // (var 14: de två innersta, x 372 och 908, skymdes av stora plantan vid hål 1 och 3)
const TRADGARD_SPARADE = 14 // så många poster i `rad` kan finnas sparade från första versionen — skrivs tillbaka orörda
const TRADGARD_Y = 474 // markens y på kullen (staketet slutar 436, jordkanten ~478)
const TRADGARD_STJALK = [44, 58, 50, 66, 48, 60, 54] // stjälkhöjd per plats, så raden inte är en kam
const TRADGARD_SKALA = 0.5 // blomhuvudet i förhållande till den stora blomman

const tradgardX = (plats) => ((plats % 2) ? 1220 - (plats >> 1) * 52 : 60 + (plats >> 1) * 52)

// Kronbladets kontur som punktlista (samma mått som `ritaKronblad`), roterad `a` runt mitten. En
// hel blomma ritas i ETT Graphics (12 platser × upp till 28 kronblad som egna objekt vore för dyrt).
function kronbladPunkter(form, rx, L, off, a) {
  const pts = []
  if (form === 'spets') {
    const N = 6
    for (let i = 0; i <= N; i++) {
      const t = i / N
      pts.push([2 * (1 - t) * t * -2 * rx, -off - L * t])
    }
    for (let i = N - 1; i >= 1; i--) {
      const t = i / N
      pts.push([2 * (1 - t) * t * 2 * rx, -off - L * t])
    }
  } else {
    const w = form === 'hjarta' ? rx * 1.1 : rx
    for (let i = 0; i < 14; i++) {
      const v = (i / 14) * Math.PI * 2
      pts.push([Math.cos(v) * w, -off - L / 2 + Math.sin(v) * (L / 2)])
    }
  }
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const flat = []
  for (const [x, y] of pts) flat.push(x * ca - y * sa, x * sa + y * ca)
  return flat
}

// En liten stående blomma i rabatten. Origo = fotpunkten. `kropp` är det som vajar (barnet).
function makeTradgardsBlomma(entry, plats) {
  const sort = SORTER.find((s) => s.id === entry.s) || SORTER[0]
  const farg = sort.farg[plats % sort.farg.length]
  const h = TRADGARD_STJALK[plats % TRADGARD_STJALK.length]
  const dark = shade(COLORS.green, 0.22)
  const node = new Container()
  node.eventMode = 'none'
  node.addChild(new Graphics().ellipse(0, 3, 15, 4).fill({ color: 0x2b5a2a, alpha: 0.28 }))
  const kropp = new Container()
  kropp.eventMode = 'none'
  kropp.rotation = (((plats * 37) % 7) - 3) * 0.012
  const g = new Graphics()
  g.roundRect(-3, -h, 6, h + 1, 3).fill(COLORS.green).stroke({ width: 1.5, color: dark })
  g.ellipse(-9, -h * 0.4, 9, 4.5).fill(COLORS.green).stroke({ width: 1.5, color: dark })
  g.ellipse(9, -h * 0.62, 9, 4.5).fill(COLORS.green).stroke({ width: 1.5, color: dark })
  kropp.addChild(g)
  const head = new Container()
  head.eventMode = 'none'
  head.position.set(0, -h)
  head.scale.set(TRADGARD_SKALA * (entry.j ? JATTE_SKALA : 1))
  const pg = new Graphics()
  for (const lag of sort.lager) {
    const c = lag.ton < 0 ? shade(farg, -lag.ton) : tint(farg, lag.ton)
    for (let i = 0; i < lag.n; i++) {
      const a = ((i + (lag.vrid || 0)) / lag.n) * Math.PI * 2
      pg.poly(kronbladPunkter(lag.form, lag.rx, lag.ry * 2, lag.off, a)).fill(c).stroke({ width: 2, color: shade(c, 0.28), join: 'round' })
    }
  }
  head.addChild(pg)
  head.addChild(new Graphics().circle(0, 0, sort.R).fill(sort.mitt).stroke({ width: 2.5, color: shade(sort.mitt, 0.32) }))
  const face = makeFace(sort.R, sort.ink)
  face.set({ open: 0 })
  head.addChild(face.root)
  kropp.addChild(head)
  node.addChild(kropp)
  node._kropp = kropp
  node._fas = (plats * 1.7) % (Math.PI * 2)
  node._vila = kropp.rotation
  return node
}

export default {
  id: 'plantera-fron',
  titleSv: 'Plantera Frön',
  icon: '🌱',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'plantera-fron',
  voiceIntro: 'Dra fröna ner i jorden!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._pouring = false
    this._resolving = false
    this._saidPlopp = false
    this._saidWater = false
    this._drops = [] // aktiva vattendroppar (ticker-drivna)
    this._plants = [] // per-runda-plantor
    this._worms = [] // maskarna i jorden (ticker-drivna, per runda)
    this._fro = [] // landningarna: { l, bild, art, sh, klar } per frö (per runda)
    this._tweened = [] // per-runda-objekt vars tweens måste dödas vid städ/exit
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._ctx = ctx
    this._sorter = pase(SORTER) // varje blomsort visas en gång per varv, aldrig samma två i rad

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._buildDecor(ctx)

    // Trädgården som minns: blommorna från tidigare rundor står kvar i rabatten (bakom rundan).
    this._gardenLayer = new Container()
    this._gardenLayer.eventMode = 'passive' // blommorna är 'none'; bara de två sidozonerna tar tryck
    this._root.addChild(this._gardenLayer)
    this._gardenNodes = new Array(TRADGARD_PLATSER).fill(null)
    this._gardenT = 0
    this._gardenNya = []
    this._sagtTradgard = false // "Titta, din trädgård växer!" högst en gång per montering
    this._lasTradgard(ctx)
    for (let i = 0; i < TRADGARD_PLATSER; i++) if (this._gardenRad[i]) this._sattBlomma(i, false)
    this._rabattZoner(ctx)

    this._round = new Container() // all per-runda-grafik (frön/hål/plantor/kanna/droppar)
    this._root.addChild(this._round)
    this._buildFore(ctx) // gräs i förgrunden, ovanpå rundan (tar inga tryck)

    this._drag = new DragController({ space: this._round, services: ctx.services })

    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Läser den sparade trädgården (`custom.tradgard`, annars reserv ur det gamla `custom.flowers`).
  // Skriver ingenting — sparandet sker först när en ny blomma planterats (`_planteraITradgard`).
  _lasTradgard(ctx) {
    const c = ctx.progress.get().custom || {}
    const t = c.tradgard
    this._gardenRad = new Array(TRADGARD_PLATSER).fill(null)
    this._gardenExtra = [] // poster ur den första versionens 14 platser som inte längre visas: bevaras
    if (t && Array.isArray(t.rad)) {
      this._gardenExtra = t.rad.slice(TRADGARD_PLATSER, TRADGARD_SPARADE)
      for (let i = 0; i < TRADGARD_PLATSER; i++) {
        const e = t.rad[i]
        if (e && typeof e.s === 'string') this._gardenRad[i] = { s: e.s, j: e.j ? 1 : 0 }
      }
      this._gardenN = Math.max(0, t.n | 0, this._gardenRad.filter(Boolean).length)
      return
    }
    // Reserv: bara det gamla antalet finns → rabatten fylls med sorterna i tur och ordning.
    const antal = Math.max(0, Number(c.flowers) | 0)
    this._gardenN = antal
    for (let i = 0; i < Math.min(antal, TRADGARD_PLATSER); i++) this._gardenRad[i] = { s: SORTER[i % SORTER.length].id, j: 0 }
  },

  // Två osynliga träffytor (en per rabattsida, 300×110): ett tryck får sidans blommor att vagga till,
  // en i taget inifrån och ut, med en mjuk ton. Mäts mot grannarna: hålens snäppcirklar börjar vid
  // x 310 / slutar 970, plantornas blomhuvuden vid x 338 / 942 och frönas halor vid x 400 / 880 —
  // zonerna (x 30–330 och 950–1250) överlappar ingen av dem. Ligger bakom rundan, så den vinner.
  _rabattZoner(ctx) {
    this._rabattTon = [0, 0]
    ;[0, 1].forEach((sida) => {
      const zon = new Container()
      zon.eventMode = 'static'
      zon.hitArea = sida === 0 ? new Rectangle(30, 366, 300, 110) : new Rectangle(950, 366, 300, 110)
      zon.on('pointertap', () => this._vaggaRabatt(ctx, sida))
      this._gardenLayer.addChild(zon)
    })
  },

  _vaggaRabatt(ctx, sida) {
    if (!this._alive) return
    this._idle = 0
    // Vaggningen sker i tickern (`_stepTradgard`): nodens `_kick` avtar av sig själv, inga tweens.
    this._gardenNodes.forEach((n, plats) => {
      if (!n || n.destroyed || plats % 2 !== sida) return
      n._kickVila = (plats >> 1) * 0.06
      n._kick = 1
    })
    const f = PENTA[this._rabattTon[sida]++ % PENTA.length]
    ctx.services.audio.tone({ freq: f, dur: 0.18, type: 'sine', vol: 0.12, slideTo: f * 1.25 })
    sparkle(ctx.fxLayer, sida === 0 ? 170 : 1110, TRADGARD_Y - 50, { count: 3 })
  },

  // Ritar blomman på plats `plats` (ersätter en äldre). `popIn`: studsar in med en ton och glitter.
  _sattBlomma(plats, popIn, delay = 0) {
    const old = this._gardenNodes[plats]
    if (old && !old.destroyed) {
      gsap.killTweensOf(old.scale)
      old.destroy({ children: true })
    }
    const node = makeTradgardsBlomma(this._gardenRad[plats], plats)
    node.position.set(tradgardX(plats), TRADGARD_Y)
    this._gardenLayer.addChild(node)
    this._gardenNodes[plats] = node
    if (popIn) bounceIn(node, { delay, duration: 0.55 })
    return node
  },

  // Rundan är klar: varje blomma barnet odlat får en plats i rabatten. Sparas direkt (barnet kan
  // gå ut under de 3 s innan nästa runda) — visningen kommer när nästa runda startar.
  _planteraITradgard(ctx) {
    const nya = []
    for (const p of this._plants) {
      const plats = this._gardenN % TRADGARD_PLATSER
      this._gardenRad[plats] = { s: p.sort.id, j: p.jatte ? 1 : 0 }
      this._gardenN++
      nya.push(plats)
    }
    ctx.progress.setCustom('tradgard', { n: this._gardenN, rad: [...this._gardenRad.map((e) => (e ? { s: e.s, j: e.j } : null)), ...(this._gardenExtra || [])] })
    this._gardenNya = (this._gardenNya || []).concat(nya)
  },

  // Nästa runda startar: nyplanterade blommor studsar in i rabatten, en i taget, med varsin ton.
  _visaNyaBlommor(ctx) {
    const nya = this._gardenNya || []
    this._gardenNya = []
    if (!nya.length) return
    nya.forEach((plats, i) => {
      const d = 0.15 + i * 0.28
      this._sattBlomma(plats, true, d)
      const node = this._gardenNodes[plats]
      ctx.later(d + 0.05, () => {
        if (!this._alive || !node || node.destroyed) return
        sparkle(ctx.fxLayer, node.x, node.y - 50, { count: 5 })
        const f = PENTA[(this._gardenN - nya.length + i) % PENTA.length]
        ctx.services.audio.tone({ freq: f, dur: 0.2, type: 'sine', vol: 0.16, slideTo: f * 1.5 })
      })
    })
    if (this._sagtTradgard) return
    this._sagtTradgard = true
    ctx.narTyst(() => {
      if (this._alive && !ctx.services.voice.talar) ctx.services.voice.say('Titta, din trädgård växer!')
    })
  },

  // Bakgrund: himmel + jordrabatt + sol/moln. Allt dekorativt (fångar ingen tap).
  _buildDecor(ctx) {
    const decor = new Container()
    decor.eventMode = 'none'
    decor.interactiveChildren = false

    // Himmel och jord breddas med BLEED så en bred telefon (full bleed) aldrig ser
    // creme-kanter. Jordgradienten breddas BARA i sidled — samma lodräta spann
    // (440..740) som förut, så den synliga färgmappningen är oförändrad — och remsan
    // under 740 (plattor högre än 16:9) är en helfärgad rect i gradientens slutton.
    // Himlen låg på 495 283 px — 54 % av skärmen — i EN ton (`_plattprobe --medbakgrund`),
    // medan jorden under redan var tonad. Toningen går djupare upptill och blekare mot
    // horisonten, som en riktig himmel, och spänner om den gamla platta SKY-tonen.
    // Cachad per färgpar — noll texturbakningar per montering.
    decor.addChild(new Graphics().rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, 460 + BLEED_Y).fill(verticalFill(SKY_TOP, SKY_HORIZON)))
    // Jorden mörknar nedåt, som en riktig jordprofil gör. Var EN brun ton over 301 000 px —
    // appens storsta enfargade yta dar platt faktiskt var fel (scripts/_plattprobe.mjs).
    decor.addChild(new Graphics().roundRect(-20 - BLEED_X, 440, ctx.width + 40 + 2 * BLEED_X, 300, 36).fill(verticalFill(tint(COLORS.brown, 0.16), shade(COLORS.brown, 0.3))))
    decor.addChild(new Graphics().rect(-20 - BLEED_X, 740, ctx.width + 40 + 2 * BLEED_X, BLEED_Y).fill(shade(COLORS.brown, 0.3)))
    // Matjordskanten. Så fort himlen slutade vara platt blev DEN här remsan spelets
    // största enfärgade fält (57 152 px) — samma fynd, ny plats. Tonas som resten.
    decor.addChild(new Graphics().roundRect(-20 - BLEED_X, 432, ctx.width + 40 + 2 * BLEED_X, 46, 24).fill(verticalFill(shade(COLORS.brown, 0.1), shade(COLORS.brown, 0.3))))

    // Solens sken: tre mjuka ringar bakom solen så himlen får ett ljus att luta sig mot.
    const halo = new Graphics()
    for (const [hr, ha] of [[150, 0.1], [108, 0.14], [78, 0.2]]) halo.circle(1080, 132, hr).fill({ color: 0xfff3b0, alpha: ha })
    decor.addChild(halo)

    // Ritad sol med strålar och ansikte (var en ☀️-emoji).
    const sun = new Graphics()
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      sun.moveTo(Math.cos(a) * 38, Math.sin(a) * 38).lineTo(Math.cos(a) * 54, Math.sin(a) * 54)
      sun.stroke({ width: 7, color: 0xffc93c, cap: 'round' })
    }
    sun.circle(0, 0, 38).fill(0xffd35c).stroke({ width: 4, color: 0xe0a94f })
    sun.circle(-13, -6, 4).fill(0x8a6a2a)
    sun.circle(13, -6, 4).fill(0x8a6a2a)
    bage(sun, 0, 2, 14, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 3.5, color: 0x8a6a2a })
    sun.circle(-24, 8, 6).fill({ color: 0xff9d9d, alpha: 0.5 })
    sun.circle(24, 8, 6).fill({ color: 0xff9d9d, alpha: 0.5 })
    sun.position.set(1080, 132) // medvetet undan hörn-knapparna
    decor.addChild(sun)

    // Riktiga puffiga moln (var rundade rektanglar som läste som tomma etiketter).
    // Molnen har en ljus topp och en blåaktig undersida (som riktiga moln) i stället för en platt vit ton.
    const clouds = new Graphics()
    const molnFyll = topLightFill(COLORS.white, { highlight: 0, dark: 0.1, mid: 0.35 })
    for (const [cx, cy, s] of [[330, 120, 1], [640, 90, 0.8], [880, 150, 0.7]]) {
      clouds.roundRect(cx - 66 * s, cy, 132 * s, 28 * s, 14 * s).fill(molnFyll)
      clouds.circle(cx - 42 * s, cy + 6 * s, 24 * s).fill(molnFyll)
      clouds.circle(cx, cy - 12 * s, 34 * s).fill(molnFyll)
      clouds.circle(cx + 44 * s, cy + 6 * s, 26 * s).fill(molnFyll)
    }
    decor.addChild(clouds)

    // Trädgården fick en värld: kullar bakom rabatten, gräskant och småsten i
    // jorden. Marken var förut en platt brun platta utan ett enda kännetecken.
    // Tre plan bakom rabatten: en dimmig fjärrås med små träd, gröna kullar och ett vitt staket.
    // Längre bort = blekare och blåare (luftperspektiv), så himlen får djup i stället för att vara
    // en tonad skiva. Allt ligger under y 440 + matjordskanten, och inget högt sitter i hörnen.
    const ridge = new Graphics()
    ridge.ellipse(120, 452, 420, 84).fill(topLightFill(0xb4d8d2, { highlight: 0.12, dark: 0.06 }))
    ridge.ellipse(760, 460, 520, 96).fill(topLightFill(0xbfdcd0, { highlight: 0.12, dark: 0.06 }))
    ridge.ellipse(1300, 452, 360, 80).fill(topLightFill(0xb4d8d2, { highlight: 0.12, dark: 0.06 }))
    for (const [tx, ty, tr] of [[250, 376, 15], [296, 382, 12], [520, 372, 16], [575, 378, 12], [880, 376, 14], [930, 380, 17], [1210, 380, 13], [1262, 376, 16]]) {
      ridge.roundRect(tx - 2, ty, 4, tr + 6, 2).fill(0x8aa89a)
      ridge.circle(tx, ty, tr).fill(sphereFill(0x9ccaa6))
    }
    decor.addChildAt(ridge, 1)

    const hills = new Graphics()
    hills.ellipse(180, 500, 260, 90).fill(topLightFill(0x8fd07a, { highlight: 0.16, dark: 0.12 }))
    hills.ellipse(640, 512, 320, 100).fill(topLightFill(0x9fd88a, { highlight: 0.16, dark: 0.12 }))
    hills.ellipse(1120, 498, 240, 86).fill(topLightFill(0x8fd07a, { highlight: 0.16, dark: 0.12 }))
    decor.addChildAt(hills, 2)

    // Staketet: spetsiga ribbor på en längsgående bom, bakom gräsranden. Ribborna får volym
    // (ljus topp, varm underkant) och en skugga mot kullen så de står i något.
    const fence = new Graphics()
    const staketFyll = topLightFill(0xf6ead2, { highlight: 0.06, dark: 0.16 })
    for (let fx = -BLEED_X - 30; fx < ctx.width + BLEED_X + 30; fx += 46) {
      fence.ellipse(fx + 8, 436, 18, 4).fill({ color: 0x4f8a45, alpha: 0.3 })
      fence.poly([fx - 9, 436, fx - 9, 408, fx, 398, fx + 9, 408, fx + 9, 436]).fill(staketFyll).stroke({ width: 2, color: 0xc9b690, join: 'round' })
    }
    fence.roundRect(-BLEED_X - 30, 414, ctx.width + 2 * BLEED_X + 60, 8, 3).fill(topLightFill(0xf0dfbd, { highlight: 0.05, dark: 0.18 })).stroke({ width: 2, color: 0xc9b690 })
    decor.addChildAt(fence, 3)

    const soil = new Graphics()
    // De fyra yttersta stråna ligger i bleed-zonen (utanför 0..1280) så gräskanten
    // inte tar slut mitt i bilden på en bred telefon; på 16:9 syns de aldrig.
    for (const [gx, gh] of [[-160, 18], [-55, 21], [60, 20], [150, 15], [255, 22], [400, 16], [520, 19], [760, 17], [900, 22], [1030, 15], [1180, 20], [1335, 19], [1430, 16]]) {
      soil.moveTo(gx, 452).quadraticCurveTo(gx - 5, 452 - gh, gx - 11, 452 - gh + 4)
      soil.moveTo(gx, 452).quadraticCurveTo(gx + 2, 452 - gh - 3, gx + 8, 452 - gh + 2)
      soil.stroke({ width: 4, color: 0x6fb85c, cap: 'round' })
    }
    decor.addChild(soil)

    // Jorden har lager: släta ränder som en spadtagen profil, och sandkorn. Rännorna ligger i
    // sidled på y 500–705 och korsar aldrig hål (y 560) eller maskar (y 606/644) som ritas OVANPÅ.
    const lager = new Graphics()
    const sidovag = (y, amp, ton, alfa, bredd) => {
      const x0 = -20 - BLEED_X
      const x1 = ctx.width + 20 + BLEED_X
      lager.moveTo(x0, y)
      const steg = 160
      for (let x = x0; x < x1; x += steg) {
        const f = ((x - x0) / steg) % 2 === 0 ? 1 : -1
        lager.quadraticCurveTo(x + steg / 2, y + f * amp, x + steg, y + (f * amp) / 4)
      }
      lager.stroke({ width: bredd, color: ton, alpha: alfa, cap: 'round' })
    }
    sidovag(512, 7, 0x2b1a0f, 0.16, 7)
    sidovag(518, 5, tint(COLORS.brown, 0.3), 0.2, 3)
    sidovag(676, 9, 0x2b1a0f, 0.2, 9)
    sidovag(684, 6, tint(COLORS.brown, 0.3), 0.18, 3)
    sidovag(718, 5, 0x1d1008, 0.22, 6)
    for (let i = 0; i < 46; i++) {
      const kx = -140 + ((i * 197 + 61) % 1560)
      const ky = 492 + ((i * 89 + 23) % 230)
      lager.circle(kx, ky, 1.4 + (i % 3) * 0.7).fill({ color: i % 2 ? tint(COLORS.brown, 0.35) : 0x2b1a0f, alpha: 0.4 })
    }
    decor.addChild(lager)

    // Stenar med volym och en mörk skugga, nedtryckta i jorden. De ligger i bräddarna, utanför
    // hålraden och maskarnas gånghål (se WORM_YS), så inget ritas ovanpå dem.
    const stenar = new Graphics()
    for (const [px, py, pr, pf] of [[150, 702, 15, 0xa39587], [330, 698, 11, 0x9a8c80], [560, 708, 13, 0xaa9b8c], [760, 704, 10, 0x9a8c80], [990, 700, 16, 0xa39587], [1190, 706, 12, 0xaa9b8c], [92, 512, 12, 0x9a8c80], [1196, 522, 14, 0xa39587]]) {
      stenar.ellipse(px + 3, py + pr * 0.55, pr * 1.05, pr * 0.42).fill({ color: 0x1d1008, alpha: 0.35 })
      stenar.ellipse(px, py, pr, pr * 0.74).fill(sphereFill(pf)).stroke({ width: 2, color: shade(pf, 0.4) })
    }
    decor.addChild(stenar)

    this._root.addChild(decor)
  },

  // Förgrund: ett par grästuvor i nedre hörnen, framför jorden och rundans föremål. De sitter i
  // x < 130 och x > 1150 (längre ut än hålen, maskarna och kannans dragyta) och tar inga tryck.
  _buildFore(ctx) {
    const fore = new Container()
    fore.eventMode = 'none'
    fore.interactiveChildren = false
    const g = new Graphics()
    const tuva = (bx, riktning) => {
      for (const [dx, h, lutning, ton] of [[0, 46, 0.1, 0x4f9d49], [10, 62, 0.3, 0x5fb057], [22, 40, 0.5, 0x4f9d49], [-10, 54, -0.2, 0x6fbf63], [-22, 36, -0.45, 0x5fb057]]) {
        const x = bx + dx * riktning
        const sx = lutning * riktning
        g.moveTo(x - 6, 730).quadraticCurveTo(x + sx * h * 0.3, 730 - h * 0.6, x + sx * h, 730 - h).quadraticCurveTo(x + sx * h * 0.3 + 7, 730 - h * 0.55, x + 6, 730)
        g.closePath()
        g.fill(topLightFill(ton, { highlight: 0.18, dark: 0.2 })).stroke({ width: 1.5, color: shade(ton, 0.3), join: 'round' })
      }
    }
    tuva(30, 1)
    tuva(-120, 1)
    tuva(1250, -1)
    tuva(1400, -1)
    fore.addChild(g)
    this._root.addChild(fore)
  },

  // Ny runda: töm förra rundan, bygg hål + frön. Kannan skapas först vid vattenfasen.
  _newRound(ctx) {
    if (!this._alive) return
    this._clearRound()
    this._phase = 'sow'
    this._cuePhrase = this.voiceIntro
    this._pouring = false
    this._resolving = false
    this._sown = 0
    this._bloomed = 0
    this._idle = 0
    this._holeCount = Math.min(3, 1 + Math.floor(this._level / 2)) // 1–3 hål, mjuk trappa

    // INGEN panel bakom fröna. Här låg förut en vit rundad ruta — spelobjekt i en
    // bricka, vilket P0 ASSETS förbjuder. En ritad korg testades men svävade
    // synligt i himlen (fröraden ligger på y≈210, högt över marken). Fröna står
    // nu fritt med sin egen skugga, som ett riktigt föremål ska.

    // Jordhål (mål): jämnt fördelade kring x=640 med 230px mellanrum.
    this._holes = []
    const hStart = 640 - ((this._holeCount - 1) * 230) / 2

    // Maskarna först i _round → de ritas BAKOM hål, frön och plantor.
    this._addWorms(hStart, hStart + (this._holeCount - 1) * 230)
    for (let i = 0; i < this._holeCount; i++) {
      const hx = hStart + i * 230
      const hole = this._makeHole()
      hole.position.set(hx, HOLE_Y)
      hole._filled = false
      this._round.addChild(hole)
      this._holes.push({ view: hole, x: hx, y: HOLE_Y })
      // Fröet står 168 px ovanför hålet: radie 160 snäppte efter 8 px vingel. 100 kräver ett riktigt
      // drag, och hålen (230 isär) får inte längre överlappande snäppytor.
      this._drag.addTarget(hole, () => !hole._filled, { hitRadius: 100 })
    }

    // Frön (källa): lika många som hålen, alltid lösbart.
    // 170 isär: halorna (r 70) håller P0-avståndet ≥ 24 px (120 lät dem överlappa).
    const sStart = 640 - ((this._holeCount - 1) * 170) / 2
    for (let i = 0; i < this._holeCount; i++) {
      const seed = this._makeSeed()
      seed.position.set(sStart + i * 170, SEED_Y)
      this._round.addChild(seed)
      this._drag.addItem(
        seed,
        { idx: i },
        { onCorrect: (rec, target) => this._onSow(ctx, rec, target), onWrong: (rec) => this._onMiss(ctx, rec) }
      )
      this._landaFro(ctx, seed, i)
    }
    this._visaNyaBlommor(ctx) // förra rundans blommor flyttar in i rabatten
  },

  // Fröet faller in uppifrån och landar på marken (lib/landa.js). Allt rör sig i det INRE barnet
  // `bild` (origo = fotpunkten) — containern `seed` är DragControllerns föremål och står stilla på
  // sin vilplats, så draget, hit-halon och `home` aldrig flyttar sig. Greppar barnet mitt i fallet
  // lägger `avbryt()` fröet på marken i samma ögonblick (pointerdown), och draget tar vid.
  _landaFro(ctx, seed, i) {
    const bild = seed._bild
    const topY = Math.min(0, ctx.view?.top ?? 0) - 110 // fotpunkten börjar över synlig överkant
    const post = { l: null, bild, art: seed._art, sh: seed._sh, klar: false }
    post.l = landa(bild, {
      ticker: ctx.ticker,
      fran: topY - SEED_Y,
      markY: SEED_FOT,
      tyngd: 'liten',
      studs: 0.4, // en ollonnöt: några avtagande hopp
      fordrojning: i * 170,
      onLand: (ty, slag) => this._froSlag(ctx, seed, i, slag),
    })
    this._fro.push(post)
    seed.on('pointerdown', () => post.l.avbryt())
    post.l.klar.then((orsak) => {
      post.klar = true
      if (!this._alive || orsak === 'riven' || post.art.destroyed) return
      liv(post.art, { bob: 0, sway: 0.045, duration: 2.6 + i * 0.4 }) // står och vaggar lite
    })
  },

  // Varje nedslag: tryckning i bilden, stämd duns, jordpuff vid det första.
  _froSlag(ctx, seed, i, slag) {
    if (!this._alive || seed.destroyed || seed._bild.destroyed) return
    const k = clamp01(slag.fart / 1500)
    landaFx(seed._bild, { intensity: 0.25 + 1.1 * k, base: { x: 1, y: 1 } })
    const f = PENTA[(i * 2) % PENTA.length] / 2
    ctx.services.audio.tone({ freq: f * (1 + slag.nr * 0.12), dur: 0.11, type: 'sine', vol: 0.03 + 0.1 * k, slideTo: f * 0.8 })
    if (slag.nr === 0) puff(ctx.fxLayer, seed.x, SEED_Y + SEED_FOT, { count: 5, color: tint(COLORS.brown, 0.45) }) // ljusare än jordlisten bakom
  },

  // Skuggan följer höjden: liten och blek högt upp, full när fröet står på marken.
  _stegaFro() {
    for (const f of this._fro) {
      if (f.klar || f.sh.destroyed || f.bild.destroyed) continue
      const h = Math.max(0, SEED_FOT - f.bild.y)
      const k = clamp01(1 - h / 520)
      f.sh.scale.set(0.45 + 0.55 * k)
      f.sh.alpha = k
    }
    for (const f of this._fro) {
      if (f.klar && !f.sh.destroyed && f.sh.alpha !== 1) {
        f.sh.scale.set(1)
        f.sh.alpha = 1
      }
    }
  },

  // Töm förra rundans noder + döda alla per-runda-tweens (exit/round-säkert).
  _clearRound() {
    this._drag.clear()
    this._canBob?.kill()
    this._canBob = null
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    this._tweened = []
    this._drops = [] // droppar ligger i _round och förstörs nedan; nolla referenserna
    this._plants = []
    this._worms = [] // maskarna ligger också i _round — nolla före rivningen
    this._rivFro()
    this._can = null
    this._dropLayer = null
    this._pouring = false
    this._round.removeChildren().forEach((o) => o.destroy({ children: true }))
  },

  // Landningarna ligger i fröna i _round: lossa tickern och döda sway/tryckning FÖRE rivningen
  // (killTweensOf på roten når inte det inre barnet).
  _rivFro() {
    for (const f of this._fro || []) {
      f.l.destroy()
      f.art._fxLiv?.kill()
      f.bild._fxSquashTl?.kill()
      f.bild._fxPopTl?.kill()
      if (!f.bild.destroyed) gsap.killTweensOf(f.bild.scale)
    }
    this._fro = []
  },

  _track(obj) {
    this._tweened.push(obj)
    return obj
  },

  // P0 ASSETS: fröet är ett FRISTÅENDE ritat ollon — låg tidigare som en
  // 🌰-emoji inuti en vit cirkel, alltså en ikon i en bricka.
  _makeSeed() {
    const c = new Container()
    const sh = new Graphics().ellipse(0, SEED_FOT, 30, 9).fill({ color: 0x000000, alpha: 0.3 }) // 0,15 försvann mot jordkanten
    sh.alpha = 0 // tonas in medan fröet faller (_stegaFro)
    sh.scale.set(0.45)
    sh.pivot.set(0, SEED_FOT) // skalar kring fotpunkten, flyttar sig inte
    sh.position.set(0, SEED_FOT)
    const bild = new Container() // origo = fotpunkten: lib/landa.js skriver bara bild.y, tryckningen skalar härifrån
    bild.position.set(0, SEED_FOT)
    const g = new Graphics()
    g.position.set(0, -SEED_FOT)
    g.ellipse(0, 6, 26, 30).fill(0xc98a4b).stroke({ width: 4, color: 0x9a5c33 }) // nöten
    g.ellipse(-8, -2, 9, 13).fill({ color: 0xe0aa72, alpha: 0.7 }) // glans
    g.moveTo(-27, -12).quadraticCurveTo(0, -34, 27, -12).quadraticCurveTo(0, 0, -27, -12).closePath()
    g.fill(0x7a4a28).stroke({ width: 4, color: 0x5c3720 }) // hattens brätte
    g.roundRect(-5, -40, 10, 12, 5).fill(0x5c3720) // stjälk
    for (let i = -2; i <= 2; i++) g.circle(i * 9, -18, 2.2).fill({ color: 0x5c3720, alpha: 0.55 })
    // Litet ansikte → eget liv (P0: egen silhuett OCH egen personlighet).
    g.circle(-8, 8, 3.5).fill(0x3a2616)
    g.circle(8, 8, 3.5).fill(0x3a2616)
    bage(g, 0, 12, 7, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 2.5, color: 0x3a2616 })
    bild.addChild(g)
    c.addChild(sh, bild)
    c._bild = bild
    c._art = g
    c._sh = sh
    c.hitArea = new Circle(0, 0, 70) // hit-halo ≥96px Ø, STILLA på vilplatsen (även under fallet)
    return c
  },

  _makeHole() {
    const c = new Container()
    // Hålet har ett ljusare brätte och ett djupare, mörkare svalg — det läser som en grop, inte som en skiva.
    c.addChild(new Graphics()
      .ellipse(0, 0, 75, 30).fill(0x3a2616).stroke({ width: 4, color: shade(COLORS.brown, 0.35) })
      .ellipse(0, -2, 80, 32).stroke({ width: 3, color: tint(COLORS.brown, 0.22), alpha: 0.55 })
      .ellipse(0, 5, 60, 20).fill({ color: 0x1d1008, alpha: 0.65 }))
    c.hitArea = new Circle(0, 0, 90) // generös träffyta för tap-tap
    return c
  },

  // En ritad daggmask som kikar upp ur jorden.
  // ⚠️ Kroppen MÅSTE klippas mot marknivån. Första versionen litade på att den
  // ritade jordkanten skulle dölja foten — men kanten är 12 px och kroppen 60,
  // så en nedåkt mask stack ut UNDER sitt eget hål. Testet var grönt; det var
  // skärmdumpen som visade det. Masken nedan klipper allt under marknivån.
  _makeWorm() {
    const c = new Container()
    c.eventMode = 'none'
    c.scale.set(1.35) // ritad i små mått; skalas upp så den läses som ett djur, inte en prick
    c.addChild(new Graphics().ellipse(0, 0, 27, 11).fill(0x2b1a0f)) // gånghålet

    const body = new Container()
    const g = new Graphics()
    // Kroppen nedifrån och upp — smalnar mot huvudet så silhuetten blir en mask,
    // inte en korv. Varje ring är ett eget fill-anrop (flera former i EN Graphics
    // med ett gemensamt fill tar den första färgen — se `_makeSeed`).
    for (const [sy, r] of [[2, 12.5], [-11, 12], [-23, 11.2], [-34, 10.4], [-44, 9.8]]) {
      g.circle(0, sy, r).fill(0xd98a90)
    }
    g.ellipse(-3.5, -26, 4.5, 20).fill({ color: 0xeeaeb2, alpha: 0.75 }) // ljusstrimma
    for (const sy of [-6, -17, -28]) { // ledringarna
      g.moveTo(-10, sy).quadraticCurveTo(0, sy + 4, 10, sy).stroke({ width: 2, color: 0xb46b73, alpha: 0.7 })
    }
    g.circle(0, -46, 10).fill(0xdf959b) // huvudet
    g.circle(-3.6, -48, 2.4).fill(0x3a2616)
    g.circle(3.6, -48, 2.4).fill(0x3a2616)
    bage(g, 0, -45, 5, 0.2 * Math.PI, 0.8 * Math.PI).stroke({ width: 2, color: 0x7d4a4e })
    body.addChild(g)
    body.y = WORM_RISE // börjar nere i jorden
    c.addChild(body)

    // Marknivån: allt under y=+3 är under jorden och ska inte synas.
    const klipp = new Graphics().rect(-46, -150, 92, 153).fill(0xffffff)
    c.addChild(klipp)
    body.mask = klipp

    c.addChild(new Graphics() // jordkanten runt gånghålet
      .ellipse(0, 3, 30, 11).fill(shade(COLORS.brown, 0.12))
      .ellipse(0, 1, 23, 7).fill({ color: 0x2b1a0f, alpha: 0.55 }))
    c._body = body
    return c
  },

  // 1–2 maskar per runda, placerade UTANFÖR hålraden (aldrig i vägen för en
  // planta som växer) och på olika avstånd — en nära, en bortre. Sida, avstånd
  // och antal slumpas så ingen runda ser exakt likadan ut, vilket är §4-punkten.
  _addWorms(hStart, hEnd) {
    this._worms = []
    const antal = Math.random() < 0.4 ? 1 : 2
    const vandNara = Math.random() < 0.5 // vilken sida som får den nära masken
    const valda = []
    for (let i = 0; i < antal; i++) {
      const vanster = (i === 0) === vandNara
      const off = WORM_OFFS[i]
      const x = vanster ? hStart - off : hEnd + off
      valda.push([Math.max(130, Math.min(1150, x)), WORM_YS[i % WORM_YS.length]])
    }
    for (let i = 0; i < valda.length; i++) {
      const [wx, wy] = valda[i]
      const view = this._makeWorm()
      view.position.set(wx, wy)
      this._round.addChild(view)
      this._worms.push({
        view,
        body: view._body,
        x: wx,
        y: wy,
        t: i * 2.6, // fasförskjutning så de två inte kikar upp i takt
        period: 7.5 + Math.random() * 2,
        ut: 0, // 0 = nere i jorden, 1 = helt uppe
        duckT: 0, // s kvar av skrämseln
        duckAmt: 0, // hur djupt den här skrämseln trycker ner masken (0..1)
        sway: 1.5 + Math.random() * 0.5,
      })
    }
  },

  // Ett frö som plumsar ner skrämmer maskarna. Kraften avtar med avståndet —
  // det är skillnaden mot en slumpvis vibration: barnet ser att det var DESS
  // nedslag som gjorde det, och att den närmaste masken blev mest rädd.
  _scareWorms(x, y) {
    for (const w of this._worms) {
      const d = Math.hypot(w.x - x, w.y - y)
      const k = clamp01(1 - d / WORM_RANGE)
      if (k <= 0.02) continue
      w.duckAmt = Math.max(w.duckAmt, k)
      w.duckT = Math.max(w.duckT, 0.5 + k * 1.6)
    }
  },

  // Per-frame: kikcykeln + skrämseln. Uppdykandet är LÅNGSAMT (nyfikenhet) och
  // nerdykandet SNABBT (rädsla) — asymmetrin är det som gör masken levande.
  _stepWorms(dt) {
    for (const w of this._worms) {
      if (!w.view || w.view.destroyed) continue
      w.t += dt
      if (w.duckT > 0) w.duckT = Math.max(0, w.duckT - dt)

      // Kikcykeln: uppe drygt halva varvet, med mjuk resning och sjunkning.
      const u = (w.t % w.period) / w.period
      let mal = 0
      if (u > 0.12 && u < 0.72) mal = Math.sin(((u - 0.12) / 0.6) * Math.PI)
      if (w.duckT > 0) mal *= 1 - w.duckAmt
      else w.duckAmt = 0

      // Ner fort (rädsla), upp sakta (nyfikenhet). Uppfarten låg först på 1,1 och
      // då hann masken bara till 0,89 av full höjd innan cykeln vände — den kom
      // aldrig HELT upp. 1,7 räcker till full resning och behåller asymmetrin.
      const takt = mal < w.ut ? 4.5 : 1.7
      w.ut += (mal - w.ut) * Math.min(1, takt * dt)
      w.body.y = (1 - w.ut) * WORM_RISE
      w.body.rotation = Math.sin(w.t * w.sway) * 0.22 * w.ut
    }
  },

  // Frö ner i hål: plopp, jordhög, puff, göm fröet. Allt är "rätt".
  _onSow(ctx, rec, target) {
    if (!this._alive) return
    const hole = target.view
    hole._filled = true
    this._idle = 0
    ctx.services.audio.sfx('plopp') // riktigt "plopp"-klipp i jorden (ersätter TTS-"Plopp!")
    this._scareWorms(hole.x, hole.y) // maskarna känner nedslaget

    const mound = new Graphics()
      .ellipse(0, 0, 60, 26)
      .fill(topLightFill(shade(COLORS.brown, 0.15), { highlight: 0.22, dark: 0.18 }))
      .stroke({ width: 3, color: shade(COLORS.brown, 0.32) })
    mound.eventMode = 'none'
    mound.position.set(hole.x, hole.y - 6)
    this._round.addChild(mound)
    this._track(mound)
    pop(mound)
    puff(ctx.fxLayer, hole.x, hole.y, { count: 6, color: COLORS.brown })

    gsap.to(rec.view, {
      alpha: 0,
      duration: 0.2,
      onComplete: () => {
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
      },
    })

    this._sown++
    if (this._sown >= this._holeCount) this._startWatering(ctx)
  },

  // Miss (sikta bredvid alla hål): lekfull vingel. DragControllern spelar 'soft'.
  _onMiss(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    wiggle(rec.view)
  },

  // Allt sått → bygg kollapsade plantor + vattenkanna att dra och vattna med.
  _startWatering(ctx) {
    if (!this._alive) return
    this._phase = 'water'
    this._cuePhrase = 'Dra vattenkannan över blommorna!'
    this._idle = 0
    this._helpStage = 0 // 0=ingen hjälp, 1=vinkat, 2+=auto-vattnat (mjuk trappa)
    this._bloomed = 0

    // Plantor (kollapsade, liten startgrodd).
    this._plants = this._holes.map((h) => this._makePlant(h))
    for (const p of this._plants) {
      p.grow = SPROUT0
      this._renderPlant(p)
    }

    // Droppar-lager (ticker-drivna partiklar). Eget lager så de inte fångar tap.
    this._dropLayer = new Container()
    this._dropLayer.eventMode = 'none'
    this._dropLayer.interactiveChildren = false
    this._round.addChild(this._dropLayer)

    // Vattenkanna (dragbar). Skapas ovanför plantorna och studsar mjukt för att locka.
    this._can = this._makeCan(ctx)
    this._can.position.set(CAN_HOME_X, CAN_HOME_Y)
    this._round.addChild(this._can)
    // Håll dropparna överst (ovanför kannan) så vattnet syns rinna ur pipen.
    this._round.setChildIndex(this._dropLayer, this._round.children.length - 1)

    bounceIn(this._can)
    this._track(this._can)
    this._canBob = gsap.to(this._can, { y: '-=12', duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    ctx.services.voice.say(this._cuePhrase)
  },

  // Bygg en planta (kollapsad) ovanpå ett hål: stjälk + blad + knopp + blomma.
  // Växer kontinuerligt via _renderPlant(grow 0→1).
  _makePlant(h) {
    const node = new Container()
    node.position.set(h.x, h.y - 8)
    node.eventMode = 'none'
    const dark = shade(COLORS.green, 0.22)

    // Fuktig jord: mörk fläck runt basen som växer/mörknar medan man vattnar (bakom allt).
    const damp = new Graphics().ellipse(0, 10, 52, 18).fill(shade(COLORS.brown, 0.42))
    damp.alpha = 0

    const stem = new Graphics().roundRect(-7, -STEM_H, 14, STEM_H + 2, 7).fill(COLORS.green).stroke({ width: 3, color: dark })
    stem.scale.set(1, 0) // växer uppåt (skala y 0→1)

    const leftLeaf = new Graphics().ellipse(0, 0, 26, 12).fill(COLORS.green).stroke({ width: 3, color: dark })
    leftLeaf.rotation = -0.5
    leftLeaf.scale.set(0)
    const rightLeaf = new Graphics().ellipse(0, 0, 26, 12).fill(COLORS.green).stroke({ width: 3, color: dark })
    rightLeaf.rotation = 0.5
    rightLeaf.scale.set(0)

    // Sorten (silhuett + färg + mitt) lottas ur en påse: alla sex visas innan någon återkommer.
    const sort = this._sorter.nasta()
    const farg = randomFrom(sort.farg)
    const bud = makeBud(sort, farg, randomFrom(BUD_COLORS))
    bud.scale.set(0)

    // Blomhuvudet: kronbladen (ett Graphics vardera, så de kan vecklas ut ett i taget) bakom en
    // mitt med ansikte. Kronbladet ritas med basen i (0,0) och spetsen uppåt → rotation pekar
    // utåt, scale 0→1 växer ut från mitten. Huvudet är bara en träffyta efter blomningen.
    const head = new Container()
    head.eventMode = 'none' // blir 'static' först när blomman slagit ut (p.ready)
    head.hitArea = new Circle(0, 0, 72) // Ø144 — ≥96 px, grannen står 230 px bort
    const petals = new Container()
    petals.eventMode = 'none'
    for (const lag of sort.lager) {
      for (let i = 0; i < lag.n; i++) {
        const pet = makeKronblad(lag, farg)
        pet.rotation = ((i + (lag.vrid || 0)) / lag.n) * Math.PI * 2
        pet.scale.set(0)
        petals.addChild(pet)
        this._track(pet)
      }
    }
    const mid = new Container() // mitten + ansiktet; poppar in sist
    mid.eventMode = 'none'
    const skiva = new Graphics().circle(0, 0, sort.R).fill(sphereFill(sort.mitt)).stroke({ width: 2.5, color: shade(sort.mitt, 0.32) })
    mid.addChild(skiva)
    if (sort.frukorn) {
      const korn = new Graphics()
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.2
        korn.circle(Math.cos(a) * (sort.R - 4.5), Math.sin(a) * (sort.R - 4.5), 1.9).fill({ color: 0x5c3720, alpha: 0.55 })
      }
      mid.addChild(korn)
    }
    const face = makeFace(sort.R, sort.ink)
    mid.addChild(face.root)
    mid.scale.set(0)
    head.addChild(petals, mid)

    node.eventMode = 'passive' // huvudet ovanför tar tryck; resten av plantan gör det aldrig
    node.addChild(damp, stem, leftLeaf, rightLeaf, bud, head)
    this._round.addChild(node)
    this._track(stem)
    this._track(leftLeaf)
    this._track(rightLeaf)
    this._track(bud)
    this._track(mid)
    this._track(head)
    const p = {
      node, damp, stem, leftLeaf, rightLeaf, bud, head, petals, mid, face, sort,
      hy: h.y, x: h.x, flowerY: h.y - 8 - STEM_H, grow: 0, done: false, ready: false,
      t: 0, fas: Math.random() * Math.PI * 2, blinkT: 1.2 + Math.random() * 2.5, blinkP: 0,
      open: 0, happyT: 0, wetT: 0, tapN: 0,
    }
    head.on('pointertap', () => this._klappa(this._ctx, p))
    return p
  },

  // Ett tryck på en utslagen blomma: den kluckar till, ler stort och sjunger en ton ur skalan —
  // en liten melodi uppåt för varje tryck. Aldrig fel, och aldrig något som ändrar spelet.
  _klappa(ctx, p) {
    if (!this._alive || !p.ready || p.head.destroyed) return
    this._idle = 0
    squash(p.head, { intensity: 1.1 })
    p.happyT = 1.3
    p.blinkP = 0
    const f = PENTA[p.tapN++ % PENTA.length]
    ctx.services.audio.tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.13, slideTo: f * 1.5 })
    sparkle(ctx.fxLayer, p.node.x, p.flowerY, { count: 3 })
  },

  // Blommornas eget liv, varje bildruta (ticker-drivet, inga tweens att städa): de vajar, blinkar
  // med olika takt, tittar på vattenkannan, och ler stort när kannan vattnar nära — knopparna
  // blundar glatt när det är DERAS vatten. Munnen ritas bara om när öppningen ändras.
  _stepBlommor(s) {
    const can = this._can && !this._can.destroyed ? this._can : null
    for (const p of this._plants) {
      if (!p.node || p.node.destroyed) continue
      p.t += s
      const g01 = smooth(clamp01(p.grow))
      p.node.rotation = Math.sin(p.t * 1.15 + p.fas) * (0.012 + 0.03 * g01)
      if (p.done) p.head.rotation = Math.sin(p.t * 1.15 + p.fas - 0.8) * 0.05

      p.blinkT -= s
      if (p.blinkT <= 0) {
        p.blinkP = 0.15
        p.blinkT = 2.4 + Math.random() * 3
      }
      let blink = 1
      if (p.blinkP > 0) {
        p.blinkP = Math.max(0, p.blinkP - s)
        blink = 0.1 + 0.9 * Math.abs((1 - p.blinkP / 0.15) * 2 - 1)
      }
      if (p.happyT > 0) p.happyT -= s
      if (p.wetT > 0) p.wetT -= s

      let lx = 0
      let ly = 0.2
      if (can) {
        const dx = can.x - p.x
        const dy = can.y - p.flowerY
        const len = Math.hypot(dx, dy) || 1
        lx = dx / len
        ly = dy / len
      }
      const nara = this._pouring && can && Math.abs(can.x - p.x) < 300
      const mal = p.done ? (p.happyT > 0 || nara ? 1 : 0) : p.wetT > 0 ? 1 : 0
      p.open += (mal - p.open) * Math.min(1, 8 * s)
      if (p.done) p.face.set({ open: p.open, happy: p.happyT > 0, lx, ly, blink })
      else p.bud._face.set({ open: p.open, happy: p.wetT > 0, lx, ly, blink })
    }
  },

  // Rita plantan utifrån dess grow-värde (0→1). Kontinuerligt: stjälk → blad → svällande
  // knopp. Kronbladen/blomman styrs INTE här — de vecklar ut sig i _bloom (klimax).
  _renderPlant(p) {
    const g = p.grow
    // Smoothstep varje delfas så växten skjuter upp organiskt (mjuk start/stopp)
    // i stället för linjärt — knoppen når ändå FULL vid grow=1 (smooth(1)=1).
    const stemFrac = smooth(clamp01(g / 0.5))
    const leafFrac = smooth(clamp01((g - 0.25) / 0.35))
    const budFrac = smooth(clamp01((g - 0.42) / 0.58)) // knoppen sväller till FULL vid grow=1
    const topY = -STEM_H * stemFrac

    p.stem.scale.y = stemFrac

    const midY = topY * 0.55
    p.leftLeaf.y = midY
    p.leftLeaf.x = -4
    p.leftLeaf.scale.set(leafFrac)
    p.rightLeaf.y = midY
    p.rightLeaf.x = 4
    p.rightLeaf.scale.set(leafFrac)

    // Fuktig jord: växer och mörknar med vattnandet.
    p.damp.scale.set(0.5 + g * 0.85)
    p.damp.alpha = Math.min(0.5, g * 0.62)

    // Toppnoderna följer stjälkspetsen.
    p.bud.y = topY
    p.head.y = topY
    if (!p.done) {
      p.bud.alpha = 1
      p.bud.scale.set(budFrac)
    }

    p.flowerY = p.node.y + topY // för gnistror i toppen
  },

  // Vattenkanna ritad programmatiskt (pip + kropp + handtag + stril). Dragbar.
  _makeCan(ctx) {
    const can = new Container()
    const blue = COLORS.blue
    const dark = shade(blue, 0.26)
    const g = new Graphics()

    // pip (rör) ut åt vänster-ned + stril i änden
    g.poly([-40, -8, -98, -28, -108, -12, -50, 20]).fill(blue).stroke({ width: 5, color: dark })
    g.circle(-104, -19, 13).fill(dark)
    // kropp
    g.roundRect(-46, -34, 92, 74, 22).fill(blue).stroke({ width: 5, color: dark })
    // övre kant (öppning)
    g.ellipse(0, -34, 44, 13).fill(shade(blue, 0.08)).stroke({ width: 5, color: dark })
    // glansremsa
    g.roundRect(-34, -20, 22, 42, 11).fill({ color: COLORS.white, alpha: 0.22 })
    can.addChild(g)
    // handtag (båge över toppen)
    const handle = new Graphics()
    handle.moveTo(-26, -30)
    handle.quadraticCurveTo(0, -82, 30, -28)
    handle.stroke({ width: 11, color: dark })
    can.addChild(handle)

    can.hitArea = new Circle(0, 0, 80) // träffyta Ø160 (≥96px)
    can.eventMode = 'static'
    can.cursor = 'pointer'
    can._spout = SPOUT_LOCAL
    can.on('pointerdown', (e) => this._canDown(ctx, e))
    return can
  },

  // Greppa kannan → börja vattna (luta + droppar). Draget följer fingret.
  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _canDown(ctx, e) {
    if (!this._alive) return
    // Kannan går inte att använda i fel fas eller under firandet — men ett tryck
    // får aldrig vara stumt (P0 ÅTERKOPPLING).
    if (this._phase !== 'water' || this._resolving) return this._kvitto(ctx, e)
    if (!this._can || this._can.destroyed) return
    this._pouring = true
    this._idle = 0
    this._helpStage = 0 // barnet vattnar själv → nollställ auto-hjälpstrappan
    this._pourAccum = 0
    this._gurgleAccum = 0
    this._canBob?.kill()
    this._canBob = null

    const p = this._round.toLocal(e.global)
    this._can._grabDX = this._can.x - p.x
    this._can._grabDY = this._can.y - p.y
    gsap.killTweensOf(this._can)
    gsap.to(this._can, { rotation: -0.32, duration: 0.18, ease: 'power2.out' })
    ctx.services.audio.sfx('whoosh')
    if (!this._saidWater) {
      this._saidWater = true
      ctx.services.voice.say('Vattna blommorna!')
    }

    this._can._move = (ev) => this._canMove(ev)
    this._can._up = () => this._canUp()
    this._can.on('globalpointermove', this._can._move)
    this._can.on('pointerup', this._can._up)
    this._can.on('pointerupoutside', this._can._up)
  },

  _canMove(e) {
    if (!this._alive || !this._pouring || !this._can || this._can.destroyed) return
    const p = this._round.toLocal(e.global)
    const x = Math.max(150, Math.min(1130, p.x + this._can._grabDX))
    const y = Math.max(120, Math.min(470, p.y + this._can._grabDY)) // håll pipen ovanför jorden
    this._can.x = x
    this._can.y = y
  },

  _canUp() {
    this._pouring = false
    const can = this._can
    if (!can || can.destroyed) return
    if (can._move) can.off('globalpointermove', can._move)
    if (can._up) {
      can.off('pointerup', can._up)
      can.off('pointerupoutside', can._up)
    }
    can._move = can._up = null
    gsap.to(can, { rotation: 0, duration: 0.3, ease: 'power2.inOut' })
  },

  // Pågående vattning (varje tick medan kannan hålls): droppar + väx plantan under pipen.
  _pourTick(ctx, dt) {
    if (!this._can || this._can.destroyed || !this._dropLayer) return
    const sp = this._round.toLocal(this._can.toGlobal(this._can._spout))

    // Spreja droppar i en jämn takt (ticker-drivet, oberoende av FPS).
    this._pourAccum += dt
    while (this._pourAccum >= 45) {
      this._pourAccum -= 45
      this._spawnDrop(sp.x, sp.y)
    }

    // Mjukt porlande vattenljud medan kannan hålls (låg, lätt slumpad ton).
    this._gurgleAccum += dt
    if (this._gurgleAccum >= 190) {
      this._gurgleAccum -= 190
      const wf = 190 + Math.random() * 170
      ctx.services.audio.tone({ freq: wf, dur: 0.17, type: 'sine', vol: 0.06, slideTo: wf * 0.65 })
    }

    // Närmaste ovattnade planta vars hål ligger nedanför pipen.
    let best = null
    let bd = 150
    for (const p of this._plants) {
      if (p.done) continue
      const dx = Math.abs(p.x - sp.x)
      if (p.hy > sp.y && dx < bd) {
        bd = dx
        best = p
      }
    }
    if (best) {
      best.wetT = 0.4 // knoppen ler så länge den får vatten
      best.grow = Math.min(1, best.grow + dt / POUR_MS)
      this._renderPlant(best)
      if (best.grow >= 1) this._bloom(ctx, best)
    }
  },

  // En vattendroppe (ticker-driven, exit-säker): ingen gsap, ren positions-integration.
  _spawnDrop(x, y) {
    if (!this._dropLayer || this._dropLayer.destroyed) return
    const d = new Graphics().ellipse(0, 0, 4, 7).fill({ color: DROP_BLUE, alpha: 0.92 })
    d.position.set(x + (Math.random() * 10 - 5), y)
    d.eventMode = 'none'
    this._dropLayer.addChild(d)
    this._drops.push({
      g: d,
      vx: Math.random() * 1.2 - 0.6,
      vy: 1.5 + Math.random() * 1.5,
      gy: 562 + Math.random() * 10,
    })
  },

  // Flytta alla droppar nedåt med "gravitation"; landar de → liten plask + förstör.
  // Exit-säkert: bara levande Pixi-objekt rörs, förstörda droppar släpps tyst.
  _stepDrops(ctx, dt) {
    if (!this._drops.length) return
    const f = dt / 16.667 // normalisera mot 60 fps
    const keep = []
    for (const dr of this._drops) {
      if (dr.g.destroyed) continue
      dr.vy += 0.55 * f
      dr.g.x += dr.vx * f
      dr.g.y += dr.vy * f
      if (dr.g.y >= dr.gy) {
        if (Math.random() < 0.22) puff(ctx.fxLayer, dr.g.x, dr.gy, { count: 2, color: DROP_BLUE })
        dr.g.destroy()
      } else {
        keep.push(dr)
      }
    }
    this._drops = keep
  },

  // En planta är fullvuxen → BLOMNING som ett litet skådespel (spelets klimax):
  // knoppen spricker, kronbladen vecklar ut sig ett i taget (stigande ton), och
  // blomman poppar in med magi-klipp + gnistror + pollen-pluff. Räkna mot firande.
  // Exit/round-säkert: alla objekt är _track:ade (tweens dödas vid clear/destroy);
  // fxLayer-hjälparna (sparkle/puff) är exit-säkra av sig själva.
  _bloom(ctx, p) {
    if (p.done) return
    p.grow = 1
    this._renderPlant(p) // stjälk/blad/knopp/fukt till fullt (done ännu false)
    p.done = true

    // 1) Knoppen spricker: en snabb squash, sedan tonar den bort.
    ctx.services.audio.sfx('pop')
    gsap.killTweensOf(p.bud.scale)
    gsap.to(p.bud.scale, { x: 1.35, y: 0.7, duration: 0.12, ease: 'power2.out' })
    gsap.to(p.bud, { alpha: 0, duration: 0.28, delay: 0.12 })

    // Sällsynt JÄTTEBLOMMA: samma skådespel med större huvud, en djup C-durtreklang och mer
    // glitter. Ingen fjäril här — fjärilarna är finalens belöning.
    const jatte = Math.random() < JATTE_CHANS
    const hs = jatte ? JATTE_SKALA : 1
    p.jatte = jatte
    p.head.scale.set(hs) // kronbladen och mitten är skala 0 tills de vecklas ut — huvudet bär storleken

    // 2) Kronbladen vecklar ut sig ETT i taget (bakre lagret först), med en stigande liten "pling"
    // ur pentatonskalan. Många kronblad (solros: 28) tar högst ~0,9 s totalt.
    const petals = p.petals.children
    const steg = Math.min(0.09, 0.9 / petals.length)
    petals.forEach((pet, i) => {
      gsap.killTweensOf(pet.scale)
      pet.scale.set(0)
      const d = 0.16 + i * steg
      gsap.to(pet.scale, { x: 1, y: 1, duration: 0.34, delay: d, ease: 'back.out(2.4)' })
      // Högst åtta toner (en per skalsteg), även när en solros har 28 kronblad.
      if (i % Math.ceil(petals.length / PENTA.length) === 0) {
        ctx.services.audio.tone({ freq: PENTA[Math.min(PENTA.length - 1, Math.floor(i / Math.ceil(petals.length / PENTA.length)))], dur: 0.13, type: 'sine', vol: 0.12, delay: d })
      }
    })

    // 3) Mitten med ansiktet poppar in sist + magi-klipp, gnistror och pollen-pluff.
    const faceDelay = 0.16 + petals.length * steg + 0.06
    gsap.killTweensOf(p.mid.scale)
    p.mid.scale.set(0)
    gsap.to(p.mid.scale, {
      x: 1,
      y: 1,
      duration: jatte ? 0.6 : 0.42,
      delay: faceDelay,
      ease: 'back.out(2.6)',
      onComplete: () => {
        if (!this._alive || p.head.destroyed) return
        p.ready = true // nu är blomman en träffyta
        p.head.eventMode = 'static'
      },
      onStart: () => {
        if (!this._alive) return
        p.happyT = 1.8 // ler stort när den slagit ut
        ctx.services.audio.sfx('magi')
        sparkle(ctx.fxLayer, p.node.x, p.flowerY, jatte ? { count: 18 } : undefined)
        puff(ctx.fxLayer, p.node.x, p.flowerY, { count: jatte ? 14 : 8, color: POLLEN })
        if (jatte) {
          // C3–E3–G3–C4 brett arpeggio under magi-klippet: den stora blomman låter stor.
          ;[130.81, 164.81, 196.0, 261.63].forEach((f, i) => {
            ctx.services.audio.tone({ freq: f, dur: 0.5, type: 'triangle', vol: 0.12, delay: 0.1 + i * 0.09 })
          })
        }
      },
    })

    this._bloomed++
    if (this._bloomed >= this._holeCount) this._finishRound(ctx)
  },

  // Alla blommor ute: fjärilar + delat firande + klistermärke, sedan ny runda.
  // _resolving säkrar att complete() bara körs EN gång per runda.
  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._phase = 'done'
    this._pouring = false
    this._canBob?.kill()
    this._canBob = null

    this._flyButterflies(ctx, 2 + ((Math.random() * 3) | 0))
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('flowers', (ctx.progress.get().custom?.flowers || 0) + this._holeCount) // oförändrat: antalet
    this._planteraITradgard(ctx) // ny nyckel `tradgard`: vilka blommor, så rabatten kan visa dem
    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke
    // 3 s: den ritade blomman ska hinna slå ut helt, le och gå att trycka på innan
    // nästa runda river den (1,4 s rev den mitt i utvecklingen — 2026-10-02).
    this._newRoundCall = gsap.delayedCall(3, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Mjuk, TRAPPAD auto-hjälp så barnets eget hållande avgör: första idle-stöten
  // vinkar bara kannan + röst (ingen vattning) — barnet får chansen. Först SENARE
  // (stadie ≥2) vattnar vi på riktigt, synligt och uttalat, med en SVAGARE dos.
  // Aldrig ett felsteg — bara en hjälpande hand, och det blir alltid klart.
  _autoHelp(ctx) {
    if (!this._alive || this._phase !== 'water' || this._resolving || this._pouring) return
    let best = null
    for (const p of this._plants) {
      if (p.done) continue
      if (!best || p.grow < best.grow) best = p
    }
    if (!best) return

    this._helpStage = (this._helpStage || 0) + 1

    // Vinka kannan mot plantan och luta den lite (rent visuellt) — i alla stadier.
    if (this._can && !this._can.destroyed) {
      this._canBob?.kill()
      this._canBob = null
      gsap.killTweensOf(this._can)
      gsap.to(this._can, { x: best.x, y: 380, duration: 0.5, ease: 'power2.inOut' })
      gsap.to(this._can, { rotation: -0.28, duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }

    // Stadie 1: BARA en vinkande kanna + röst — ge barnet chansen att vattna själv.
    if (this._helpStage < 2) {
      ctx.services.voice.say('Håll kannan över blomman!')
      return
    }

    // Stadie ≥2: nu hjälper vi till på riktigt — synligt och uttalat, men med en
    // svagare dos än förr (0.16) så barnets eget hållande fortfarande avgör mest.
    ctx.services.voice.say('Jag hjälper till lite!')
    for (let i = 0; i < 6; i++) this._spawnDrop(best.x + (Math.random() * 30 - 15), 400)
    ctx.services.audio.sfx('whoosh')
    best.wetT = 1.2
    best.grow = Math.min(1, best.grow + 0.16)
    this._renderPlant(best)
    if (best.grow >= 1) this._bloom(ctx, best)
  },

  // Fjärilar som fladdrar in i fxLayer (exit-säkert: proxy + kopiera bara om levande).
  _flyButterflies(ctx, n) {
    for (let i = 0; i < n; i++) {
      // Ritad fjäril (var 🦋): fyra vingar, kropp och antenner.
      const b = new Graphics()
      const wing = [0xa78bfa, 0xf7b9e4, 0x6ad0ff, 0xffd35c][i % 4]
      b.ellipse(-13, -8, 13, 15).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.ellipse(13, -8, 13, 15).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.ellipse(-11, 9, 10, 11).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.ellipse(11, 9, 10, 11).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.roundRect(-3, -14, 6, 30, 3).fill(0x4a3728)
      b.moveTo(-2, -14).quadraticCurveTo(-8, -24, -12, -22).stroke({ width: 2, color: 0x4a3728 })
      b.moveTo(2, -14).quadraticCurveTo(8, -24, 12, -22).stroke({ width: 2, color: 0x4a3728 })
      b.eventMode = 'none'
      const startX = 180 + Math.random() * 220
      const baseY = 300 + Math.random() * 150
      const endX = startX + 480 + Math.random() * 320
      const amp = 38 + Math.random() * 34
      b.position.set(startX, baseY)
      ctx.fxLayer.addChild(b)
      const st = { p: 0 }
      const tw = gsap.to(st, {
        p: 1,
        duration: 2.6 + Math.random() * 0.8,
        delay: i * 0.12,
        ease: 'none',
        onUpdate: () => {
          if (b.destroyed) {
            tw.kill()
            return
          }
          b.x = startX + (endX - startX) * st.p
          b.y = baseY + Math.sin(st.p * Math.PI * 4) * amp
          b.alpha = st.p > 0.8 ? (1 - st.p) / 0.2 : 1
        },
        onComplete: () => {
          if (!b.destroyed) b.destroy()
        },
      })
    }
  },

  // Rabattens blommor vajar mjukt, var och en med egen fas (ticker-drivet — inga tweens att städa).
  _stepTradgard(dt) {
    this._gardenT += dt
    for (const n of this._gardenNodes) {
      if (!n || n.destroyed) continue
      let extra = 0
      if (n._kick > 0) {
        if (n._kickVila > 0) n._kickVila -= dt // inifrån och ut: varje blomma väntar på sin tur
        else {
          extra = Math.sin((1 - n._kick) * 18) * n._kick * 0.32
          n._kick -= dt * 1.1
          if (n._kick < 0) n._kick = 0
        }
      }
      n._kropp.rotation = n._vila + Math.sin(this._gardenT * 1.5 + n._fas) * 0.045 + extra
    }
  },

  // Per-frame: flytta droppar; vattna medan kannan hålls; annars räkna idle → auto-hjälp/recue.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS
    this._stepDrops(ctx, dt)
    this._stepWorms(dt / 1000)
    this._stegaFro()
    this._stepBlommor(dt / 1000)
    this._stepTradgard(dt / 1000)

    // Tomgången räknas från TYSTNAD: medan en replik talar står klockan still (V21 —
    // annars kapar påminnelsens say() en replik som redan talar).
    // Gäller båda klockorna nedan (vattnings-hjälpen och så-recuen talar båda).
    if (ctx.services.voice.talar) this._idle = 0
    if (this._phase === 'water') {
      if (this._pouring) {
        this._idle = 0
        this._pourTick(ctx, dt)
      } else {
        this._idle += dt / 1000
        if (this._idle > 9) {
          // Högre tröskel (9s) så barnet hinner engagera sig innan hjälpen vinkar.
          this._idle = 0
          this._autoHelp(ctx)
        }
      }
    } else if (this._phase === 'sow') {
      this._idle += dt / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this._cuePhrase)
        const live = this._drag.items.find((r) => !r.placed && !r.view.destroyed)
        if (live) wiggle(live.view)
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    this._pouring = false
    ctx.ticker.remove(this._tick)
    this._newRoundCall?.kill()
    this._canBob?.kill()
    this._rivFro()
    this._drag?.destroy()
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    this._drops = []
    this._plants = []
    this._worms = []
    for (const n of this._gardenNodes || []) if (n && !n.destroyed) gsap.killTweensOf(n.scale)
    this._gardenNodes = []
    this._gardenNya = []
    this._ctx = null
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
