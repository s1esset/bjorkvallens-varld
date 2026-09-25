// _superhoppprobe.mjs — mäter grodan-slurps SUPERHOPP i Node (ingen webbläsare).
//
//   node scripts/_superhoppprobe.mjs            alla armar
//   node scripts/_superhoppprobe.mjs p1         en arm
//
// Armar:
//   vanligt   kontrollarm: ett vanligt hopp (samma som _grodprobe hopp) — höjd/längd att jämföra med.
//   p0 p05 p1 superhopp med sats 0 / 0,5 / 1: höjd, längd, luftsteg, varv i volten, blev det
//             stjärnläge, landade den, när vilade den en sekund, och sitter den efter vakna()?
//   stjarna   stjärnlägets posfel i luften (tyngdlöst, inget snurr) — och kontrollarm med
//             musklerna av, så att måttet bevisat kan skilja en hållen pose från en slak.
//   rep       klibbrepet i en statisk gren ovanför: fastnar det, blir grodan hängande, och slurpas
//             repet in utan att något rymmer?
//   sats      laddningen på marken: sjunker bålen, och står grodan kvar (inget hopp av sig självt)?
import { setDetaljniva } from '../src/lib/form.js'
import { Container } from 'pixi.js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Groda, POSER } from '../src/games/grodan-slurp/groda.js'
import { Klibbrep } from '../src/games/grodan-slurp/klibbrep.js'
import { Flytvolym } from '../src/lib/flytkraft.js'

setDetaljniva(0)
const arg = process.argv[2] || 'alla'
const YT = 560
const r1 = (v) => Math.round(v * 10) / 10
const r2 = (v) => Math.round(v * 100) / 100
const wrap = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2))

const UTAN_FLYT = process.argv.includes('--utan-flyt')
function varld({ g = 1, mark = true, flyt = !UTAN_FLYT } = {}) {
  const phys = new PhysicsWorld({ gravityY: g, walls: ['floor', 'left', 'right'] })
  phys.engine.positionIterations = 8
  phys.engine.velocityIterations = 6
  phys.engine.constraintIterations = 5
  const golv = mark ? phys.rectangle(640, YT - 6 + 30, 2400, 60, { isStatic: true, label: 'mark' }) : null
  const lager = { bak: new Container(), mitt: new Container(), fram: new Container() }
  const groda = new Groda(phys, lager, { x: 300, y: mark ? YT - 6 - 40 : 300, riktning: 1 })
  phys.beforeStep(() => groda.steg())
  // Samma flytvolym som dammen (spärr 22, vridDamp 0,9 — även ovanför ytan) och samma flyt per
  // del som spelet. Utan den mätte sonden en snällare värld än spelets: snurret överlevde här
  // men inte där. Ytan ligger under golvet, så ingen lyftkraft — bara spärrarna.
  if (flyt) {
    const volym = new Flytvolym({ varld: phys, ytY: YT, botten: 720, vanster: 0, hoger: 1280, motstand: 0.94, maxFart: 22, guppAmp: 0.00012, vaggAmp: 0.0001 })
    groda.flytIn(volym, (n) => (n === 'huvud' ? 2.4 : n === 'kropp' ? 1.9 : 1.3))
    const orig = phys.update.bind(phys)
    let t = 0
    phys.update = (dt) => {
      t += dt / 1000
      volym.steg(t)
      orig(dt)
    }
  }
  return { phys, golv, groda }
}
function posfel(g, pose) {
  const P = POSER[pose]
  let s = 0
  for (const l of g.leder) {
    const d = g._rel(l)
    const mal = wrap(g._malFor(l, P) - l.mitt)
    s += (mal - d) ** 2
  }
  return Math.sqrt(s / g.leder.length)
}
const nan = (g) => g.delar.some((b) => !Number.isFinite(b.position.x) || !Number.isFinite(b.position.y))
function spridning(g) {
  const k = g.b.kropp.position
  let m = 0
  for (const b of g.delar) m = Math.max(m, Math.hypot(b.position.x - k.x, b.position.y - k.y))
  return m
}
const steg = (phys, n) => {
  for (let i = 0; i < n; i++) phys.update(1000 / 60)
}

function laddArm(p, siktGrader) {
  const { phys, groda } = varld()
  steg(phys, 90)
  const x0 = groda._com().x
  const y0 = groda._com().y
  const aim = siktGrader == null ? null : { x: Math.cos((siktGrader * Math.PI) / 180), y: -Math.sin((siktGrader * Math.PI) / 180) }
  const v = groda.superFart(p, aim)
  const ok = groda.laddHopp(p, 1, aim)
  let minY = y0
  let landX = null
  let minKraft = 1
  let slak = 0
  let stj = false
  for (let i = 0; i < 240; i++) {
    phys.update(1000 / 60)
    minY = Math.min(minY, groda._com().y)
    minKraft = Math.min(minKraft, groda.kraft)
    if (groda.lage === 'slak') slak++
    if (groda.superFas || groda.stjarna) stj = true
    if (landX === null && i > 10 && groda.paMark) landX = groda._com().x
  }
  const kr = groda.b.kropp
  const aR = groda.riktning === 1 ? kr.angle : Math.PI - kr.angle
  return {
    p, sikt: siktGrader, hoppade: ok, fart: r1(Math.hypot(v.x, v.y)),
    hojd: r1(y0 - minY), langd: landX === null ? null : r1(Math.abs(landX - x0)),
    minKraft: r2(minKraft), slakSteg: slak, superFas: stj,
    efter: { lage: groda.lage, posfel: r2(posfel(groda, 'sitt')), bal: r2(wrap(aR)), luft: r2(groda.delar[0].frictionAir) },
  }
}

function superArm(p) {
  const { phys, groda } = varld()
  steg(phys, 90)
  const x0 = groda._com().x
  const y0 = groda._com().y
  const ok = groda.superHopp(p, 1)
  let minY = y0
  let luft = 0
  let stjSteg = null
  let landSteg = null
  let landX = null
  let vilaSteg = null
  let maxVarv = 0
  let maxSpr = 0
  for (let i = 0; i < 600; i++) {
    phys.update(1000 / 60)
    minY = Math.min(minY, groda._com().y)
    maxSpr = Math.max(maxSpr, spridning(groda))
    if (!groda.landat) luft++
    if (groda.superFas === 'volt') maxVarv = Math.max(maxVarv, Math.abs(groda._voltVinkel) / (Math.PI * 2))
    if (stjSteg === null && groda.stjarna) stjSteg = i
    if (landSteg === null && groda.landat) {
      landSteg = i
      landX = groda._com().x
    }
    if (vilaSteg === null && groda.vilSteg >= 60) {
      vilaSteg = i
      break
    }
  }
  const stjVid = groda.stjarna
  const fore = { x: groda.pos.x, y: groda.pos.y }
  groda.vakna(1)
  steg(phys, 120)
  return {
    hoppade: ok,
    hojd: r1(y0 - minY),
    langd: landX === null ? null : r1(landX - x0),
    luftSteg: luft,
    varvIVolten: r2(maxVarv),
    stjarnaEfterSteg: stjSteg,
    landadeEfterSteg: landSteg,
    vilaEfterSteg: vilaSteg,
    stjarnaVidVila: stjVid,
    maxSpridning: r1(maxSpr),
    vaknaFlytt: r1(Math.hypot(groda.pos.x - fore.x, groda.pos.y - fore.y)),
    efterVakna: { lage: groda.lage, paMark: groda.paMark, posfel: r2(posfel(groda, 'sitt')), stjarna: groda.stjarna, fas: groda.superFas },
    nan: nan(groda),
  }
}

const armar = {
  vanligt() {
    const { phys, groda } = varld()
    steg(phys, 90)
    const x0 = groda._com().x
    const y0 = groda._com().y
    groda.hoppa(1)
    let minY = y0
    let landX = null
    for (let i = 0; i < 240; i++) {
      phys.update(1000 / 60)
      minY = Math.min(minY, groda._com().y)
      if (landX === null && i > 10 && groda.paMark) landX = groda._com().x
    }
    return { hojd: r1(y0 - minY), langd: landX && r1(landX - x0), nan: nan(groda) }
  },
  p0: () => superArm(0),
  p05: () => superArm(0.5),
  p1: () => superArm(1),
  // SATS-HOPPET (2026-09-25): hållet under full sats är ett vanligt hopp längs pilens bana — ingen
  // volt, inget stjärnläge. Landar grodan på benen? `sikt` = höjdvinkel i grader (null = egen).
  ladd: () => [0, 0.5, 0.95].flatMap((p) => [null, 50, 80, 130].map((sikt) => laddArm(p, sikt))),
  stjarna() {
    const ut = {}
    for (const kontroll of [true, false]) {
      const { phys, groda } = varld({ g: 0, mark: false })
      groda.superFas = 'volt'
      groda._superN = 0
      groda._tillStjarna()
      groda._spinS = 0
      groda._snurra(-groda._snurrFart())
      // Ingen brus-flax, inget snurr: bara om musklerna håller stjärnan.
      groda._flax.forEach((n) => (n.amp = 0))
      groda._spinA = groda._spinB = 0
      const orig = groda._superSteg.bind(groda)
      groda._superSteg = (iV) => {
        orig(iV)
        groda._snurra(-groda._snurrFart())
        if (kontroll) groda.kraft = 0
      }
      // Samma störning i båda armarna: en sprattling var halvsekund. Musklerna ska dra
      // tillbaka lemmarna; utan dem ska posfelet växa.
      const fel = []
      for (let i = 0; i < 4; i++) {
        groda.sprattla()
        groda.sprattla()
        steg(phys, 30)
        fel.push(r2(posfel(groda, 'stjarna')))
      }
      ut[kontroll ? 'kontroll' : 'muskler'] = { posfelPerHalvsek: fel, spridning: r1(spridning(groda)), nan: nan(groda) }
    }
    return ut
  },
  rep() {
    const { phys, groda } = varld()
    phys.rectangle(520, 250, 520, 26, { isStatic: true, label: 'gren' })
    steg(phys, 90)
    groda.superHopp(1, 1)
    const svarm = { lista: [], fanga() {}, slapp() {} }
    let fastnade = null
    let klar = false
    let rep = null
    let hangSteg = 0
    let maxSpr = 0
    for (let i = 0; i < 700; i++) {
      phys.update(1000 / 60)
      maxSpr = Math.max(maxSpr, spridning(groda))
      // Repet skjuts mitt i volten (sidovyn) — då prövas också vybytet (nyMun).
      if (!rep && i === 8) {
        rep = new Klibbrep({ phys, groda, lager: new Container(), svarm, pa: { fastnade: (b) => { fastnade = fastnade || { mal: b.label, i }; if (rep.ankrad) groda.landa() }, klar: () => (klar = true) } })
        groda.vidVyByte = () => rep.nyMun()
        rep.skjut(0.35, -0.94)
      }
      if (rep && fastnade && !groda.paMark && groda.pos.y < 520) hangSteg++
      if (rep && (groda.vilSteg >= 60 || (fastnade && i - fastnade.i > 330))) {
        rep.slurpa()
        groda.vakna(1)
        for (let k = 0; k < 90 && !klar; k++) rep.rita(1 / 60)
        break
      }
    }
    steg(phys, 150)
    return { fastnade, hangSteg, slurpKlar: klar, lankarKvar: rep?.lankar.length, efter: { paMark: groda.paMark, lage: groda.lage, y: r1(groda.pos.y) }, maxSpridning: r1(maxSpr), nan: nan(groda) }
  },
  // Spelkritikerns fall 1: landning mitt i volten → stjärnan slår ut ÄNDÅ, lyft ovanför marken.
  // Kontrollarm utan lyftet (stjärnan läggs ut där bålen står, lemmarna delvis inne i golvet):
  // måttet MÅSTE skilja dem — annars mäter det inte överlappet.
  tidig() {
    const ut = {}
    for (const lyft of [false, true]) {
      const { phys, groda } = varld()
      steg(phys, 90)
      groda.superFas = 'volt'
      groda._superN = 20
      groda._tillStjarna(lyft)
      if (!lyft) groda._landar()
      let maxFart = 0
      let maxDel = 0
      let inneIGolv = 0
      for (let i = 0; i < 150; i++) {
        phys.update(1000 / 60)
        const v = groda._comFart()
        maxFart = Math.max(maxFart, Math.hypot(v.x, v.y))
        for (const b of groda.delar) {
          maxDel = Math.max(maxDel, Math.hypot(b.velocity.x, b.velocity.y))
          if (i < 3 && b.bounds.max.y > YT - 6 + 6) inneIGolv++
        }
      }
      ut[lyft ? 'lyft' : 'kontroll'] = { maxTyngdpunktsfart: r1(maxFart), maxDelfart: r1(maxDel), delarInneIGolvet: inneIGolv, stjarna: groda.stjarna, landat: groda.landat, vilSteg: groda.vilSteg, nan: nan(groda), spridning: r1(spridning(groda)) }
    }
    return ut
  },
  // Spelkritikerns fall 2: grenen rakt ovanför — studsen får inte äta upp stjärnläget.
  studs() {
    const { phys, groda } = varld()
    phys.rectangle(330, 360, 400, 26, { isStatic: true, label: 'gren' })
    steg(phys, 90)
    groda.superHopp(0.6, 1)
    let studsSteg = null
    let stjSteg = null
    let landSteg = null
    let maxSpr = 0
    for (let i = 0; i < 300; i++) {
      phys.update(1000 / 60)
      maxSpr = Math.max(maxSpr, spridning(groda))
      if (studsSteg === null && groda._voltStuds) studsSteg = i
      if (stjSteg === null && groda.stjarna) stjSteg = i
      if (landSteg === null && groda.landat) landSteg = i
    }
    return { studsSteg, stjarnaSteg: stjSteg, landadeSteg: landSteg, stjarnaForeLandning: stjSteg !== null && (landSteg === null || stjSteg <= landSteg), maxSpridning: r1(maxSpr), nan: nan(groda) }
  },
  sats() {
    const { phys, groda } = varld()
    steg(phys, 90)
    const y0 = groda._com().y
    groda.laddaStart()
    let minY = 0
    for (let i = 0; i < 100; i++) {
      groda.setLaddning(Math.min(1, i / 90))
      phys.update(1000 / 60)
    }
    const yLadd = groda.pos.y
    minY = yLadd
    return { bolSjonk: r1(yLadd - y0), paMark: groda.paMark, lage: groda.lage, fas: groda.superFas, nan: nan(groda), minY: r1(minY) }
  },
}

// Repet måste stega i fysiken: koppla in det via en global krok (samma som spelet gör i beforeStep).
const origRep = Klibbrep.prototype.skjut
Klibbrep.prototype.skjut = function (ux, uy) {
  const ok = origRep.call(this, ux, uy)
  if (ok && !this._krokad) {
    this._krokad = true
    this._phys.beforeStep(() => this.steg())
  }
  return ok
}

const lista = arg === 'alla' ? Object.keys(armar) : [arg]
for (const namn of lista) {
  try {
    console.log(namn.padEnd(8), JSON.stringify(armar[namn]()))
  } catch (e) {
    console.log(namn.padEnd(8), 'FEL', e.stack.split('\n').slice(0, 4).join(' | '))
  }
}
