// _grodprobe.mjs — mäter grodan-slurps RAGDOLL och TUNGA i Node (ingen webbläsare).
//
//   node scripts/_grodprobe.mjs            alla armar
//   node scripts/_grodprobe.mjs sitt       en arm
//
// Armar:
//   kontroll  musklerna AV (kraft 0 hela tiden) — posfelet MÅSTE bli stort, annars mäter
//             måttet ingenting (kör den först, CLAUDE.md: kontrollarm först).
//   sitt      grodan på ett blad i 5 s: posfel (RMS rad över lederna), bålvinkel, drift, vila.
//   hopp      hoppa från bladet: höjd, längd, landar den och sätter sig igen?
//   gren      tunga i en statisk gren ovanför: når grodan dit, hur långt under hänger den?
//   latt      tunga i en lätt kotte (1,6) på en hylla: kotten ska komma, grodan knappt röra sig.
//   tung      tunga i en tung stock (36) på en hylla: grodan ska röra sig MER än kotten.
//   small     en hård knuff i sidled: slaknar (kraft < 0,45) och samlar sig (kraft → 1, sitter).
//   vand      spegling: posfelet ska vara lika litet efter vändningen.
import { setDetaljniva } from '../src/lib/form.js'
import { Container } from 'pixi.js'
import { PhysicsWorld, Matter } from '../src/lib/physics.js'
import { Groda, POSER } from '../src/games/grodan-slurp/groda.js'
import { Tunga } from '../src/games/grodan-slurp/tunga.js'

setDetaljniva(0)
const { Query, Body } = Matter
const arg = process.argv[2] || 'alla'
const YT = 560
const r1 = (v) => Math.round(v * 10) / 10
const r2 = (v) => Math.round(v * 100) / 100

function varld({ g = 1, mark = true } = {}) {
  const phys = new PhysicsWorld({ gravityY: g, walls: ['floor', 'left', 'right'] })
  phys.engine.positionIterations = 8
  phys.engine.velocityIterations = 6
  phys.engine.constraintIterations = 5
  // Ett brett golv (inte 'wall' — väggar räknas inte som mark i groda.js).
  const blad = mark ? phys.rectangle(640, YT - 6 + 30, 1400, 60, { isStatic: true, label: 'mark' }) : null
  const lager = { bak: new Container(), mitt: new Container(), fram: new Container() }
  const groda = new Groda(phys, lager, { x: 400, y: mark ? YT - 6 - 40 : 300, riktning: 1 })
  phys.beforeStep(() => groda.steg())
  return { phys, blad, groda }
}

const wrap = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2))
function posfel(g, pose = 'sitt') {
  const P = POSER[pose]
  let s = 0
  for (const l of g.leder) {
    const d = g._rel(l)
    const mal = wrap(g._malFor(l, P) - l.mitt)
    s += (mal - d) ** 2
  }
  return Math.sqrt(s / g.leder.length)
}
function bolvinkel(g) {
  const a = g.b.kropp.angle
  return wrap(g.riktning === 1 ? a : Math.PI - a)
}
function spridning(g) {
  const k = g.b.kropp.position
  let m = 0
  for (const b of g.delar) m = Math.max(m, Math.hypot(b.position.x - k.x, b.position.y - k.y))
  return m
}
function nan(g) {
  return g.delar.some((b) => !Number.isFinite(b.position.x) || !Number.isFinite(b.position.y))
}
const steg = (phys, n) => {
  for (let i = 0; i < n; i++) phys.update(1000 / 60)
}

const armar = {
  kontroll() {
    const { phys, groda } = varld()
    const orig = groda._muskler.bind(groda)
    groda._muskler = () => {}
    groda._balstod = () => {}
    steg(phys, 300)
    groda._muskler = orig
    return { posfel: r2(posfel(groda)), bol: r2(bolvinkel(groda)), y: r1(groda.pos.y), nan: nan(groda), spridning: r1(spridning(groda)) }
  },
  sitt() {
    const { phys, groda } = varld()
    const y0 = groda.pos.y
    const x0 = groda.pos.x
    const fel = []
    for (let i = 0; i < 5; i++) {
      steg(phys, 60)
      fel.push(r2(posfel(groda)))
    }
    const v = groda.delar.reduce((s, b) => s + Math.hypot(b.velocity.x, b.velocity.y), 0) / groda.delar.length
    return { posfelPerSek: fel, bol: r2(bolvinkel(groda)), malBol: -0.45, dy: r1(groda.pos.y - y0), dx: r1(groda.pos.x - x0), medelfart: r2(v), paMark: groda.paMark, lage: groda.lage, nan: nan(groda), spridning: r1(spridning(groda)) }
  },
  hopp() {
    const { phys, groda } = varld()
    steg(phys, 90)
    const x0 = groda.pos.x
    const y0 = groda.pos.y
    const ok = groda.hoppa(1)
    let minY = y0
    let landX = null
    let luftSteg = 0
    let sattSteg = null
    for (let i = 0; i < 300; i++) {
      phys.update(1000 / 60)
      minY = Math.min(minY, groda.pos.y)
      if (!groda.paMark) luftSteg++
      if (landX === null && i > 10 && groda.paMark) landX = groda.pos.x
      if (sattSteg === null && i > 10 && groda.lage === 'sitt' && posfel(groda) < 0.35) sattSteg = i
    }
    return { hoppade: ok, hojd: r1(y0 - minY), landX: landX && r1(landX - x0), luftSteg, sitterIgenEfterSteg: sattSteg, slutPosfel: r2(posfel(groda)), bol: r2(bolvinkel(groda)), slutY: r1(groda.pos.y), nan: nan(groda), maxSpridning: r1(spridning(groda)) }
  },
  gren() {
    const { phys, groda } = varld()
    const gren = phys.rectangle(660, 150, 360, 26, { isStatic: true, label: 'gren' })
    steg(phys, 60)
    const tunga = new Tunga({ groda, lager: new Container(), ytY: YT, hitta: { kropp: (ax, ay, bx, by) => traff([gren], ax, ay, bx, by), insekt: () => null }, pa: noop() })
    phys.beforeStep(() => tunga.steg())
    tunga.skjut(600, 150)
    let fastSteg = null
    let narmast = Infinity
    let narSteg = null
    const spar = []
    for (let i = 0; i < 360; i++) {
      phys.update(1000 / 60)
      if (fastSteg === null && tunga.lage === 'fast') fastSteg = i
      if (tunga.lage === 'fast') {
        const d = tunga.langd
        if (d < narmast) {
          narmast = d
          narSteg = i
        }
      }
      if (i % 30 === 0) spar.push([r1(groda.pos.x), r1(groda.pos.y), tunga.lage])
    }
    return { fastEfterSteg: fastSteg, narmastTunga: r1(narmast), vidSteg: narSteg, slutTunga: r1(tunga.langd), lage: tunga.lage, grodLage: groda.lage, spar, nan: nan(groda), maxSpridning: r1(spridning(groda)) }
  },
  latt() {
    return dragArm(0.0022, 15)
  },
  tung() {
    return dragArm(0.004, 'stock')
  },
  small() {
    const { phys, groda } = varld()
    steg(phys, 60)
    groda.slappna(1)
    groda.knuffa(9, -6, 1)
    let minKraft = 1
    let slak = 0
    let tillbaka = null
    for (let i = 0; i < 360; i++) {
      phys.update(1000 / 60)
      minKraft = Math.min(minKraft, groda.kraft)
      if (groda.lage === 'slak') slak++
      if (tillbaka === null && i > 30 && groda.lage === 'sitt' && posfel(groda) < 0.35) tillbaka = i
    }
    return { minKraft: r2(minKraft), slakSteg: slak, sitterIgenEfterSteg: tillbaka, slutPosfel: r2(posfel(groda)), bol: r2(bolvinkel(groda)), nan: nan(groda), spridning: r1(spridning(groda)) }
  },
  vand() {
    const { phys, groda } = varld()
    steg(phys, 120)
    const fore = posfel(groda)
    const x = groda.pos.x
    groda.vand()
    const direkt = posfel(groda)
    steg(phys, 120)
    return { posfelFore: r2(fore), direktEfter: r2(direkt), efter2s: r2(posfel(groda)), riktning: groda.riktning, bol: r2(bolvinkel(groda)), dx: r1(groda.pos.x - x), nan: nan(groda) }
  },
}

function traff(kroppar, ax, ay, bx, by) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 7))
  for (let i = 1; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n
    const y = ay + ((by - ay) * i) / n
    const t = Query.point(kroppar, { x, y })
    if (t.length) return { body: t[0], x, y }
  }
  return null
}
function noop() {
  return { traffKropp() {}, traffInsekt() {}, at() {}, bom() {}, vatten() {}, slappt() {} }
}

// Massfördelningen, ren: tyngdlöst, inget golv — grodan och saken svävar på samma höjd.
// Förväntan (Newton 3): grodans förflyttning / sakens ≈ m_sak / M_groda.
function dragArm(density, storlek) {
  const { phys, groda } = varld({ g: 0, mark: false })
  const sak = storlek === 'stock'
    ? phys.rectangle(720, 300, 190, 34, { density, chamfer: { radius: 14 }, frictionAir: 0.012, label: 'stock' })
    : phys.circle(720, 300, storlek, { density, frictionAir: 0.012, label: 'kotte' })
  steg(phys, 20)
  const g0 = { x: groda.pos.x, y: groda.pos.y }
  const s0 = { x: sak.position.x, y: sak.position.y }
  const tunga = new Tunga({ groda, lager: new Container(), ytY: 2000, hitta: { kropp: (ax, ay, bx, by) => traff([sak], ax, ay, bx, by), insekt: () => null }, pa: noop() })
  phys.beforeStep(() => tunga.steg())
  tunga.skjut(sak.position.x, sak.position.y)
  let fast = null
  let slappt = null
  let gX = 0
  let sX = 0
  for (let i = 0; i < 240; i++) {
    phys.update(1000 / 60)
    if (fast === null && tunga.lage === 'fast') fast = { i, pa: tunga.body?.label }
    if (fast && slappt === null && tunga.lage !== 'fast') slappt = i
    if (fast && slappt === null) {
      gX = groda.pos.x - g0.x
      sX = s0.x - sak.position.x
    }
  }
  return { sakMassa: r1(sak.mass), grodMassa: r1(groda.massa), fast, slapptSteg: slappt, grodanMot: r1(gX), sakenMot: r1(sX), kvotGS: r2(gX / Math.max(0.1, sX)), forvantat: r2(sak.mass / groda.massa), nan: nan(groda) }
}

const lista = arg === 'alla' ? Object.keys(armar) : [arg]
for (const namn of lista) {
  try {
    console.log(namn.padEnd(9), JSON.stringify(armar[namn]()))
  } catch (e) {
    console.log(namn.padEnd(9), 'FEL', e.stack.split('\n').slice(0, 3).join(' | '))
  }
}
