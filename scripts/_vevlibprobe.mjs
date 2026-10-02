// VEV-SONDEN (FYSIKPLAN G8) — prövar src/lib/vev.js i Node. (`_vevprobe.mjs` är KUGGHJULENS egen
// vev i webbläsaren — en annan sak.)
//
//   node scripts/_vevlibprobe.mjs
//
// Ingen webbläsare och inget Pixi: `Vev` pratar med pekhändelser via `pekGrepp` (lib/pekare.js), som
// bara rör `on/off/toLocal`, så en EventEmitter3-yta räcker. `performance.now` ersätts med en
// virtuell klocka (fingrets vinkelfart mäts över 90 ms). Matter-armen kör den RIKTIGA
// `PhysicsWorld` + `phys.gangjarn` (F1).
//
// KONTROLLARMARNA FÖRST — varje arm har en motsvarighet som MÅSTE ge det kända svaret, annars mäter
// mätarmen ingenting och skriptet avslutar 1:
//   K1  ingen input → varvtalet står på 0 · en knuff RÖR det (talet kan flytta sig)
//   K2  utan dämpning (damp 0, dödzon 0) snurrar ratten vidare → dämpningen är det som stoppar den
//   K3  utan tak (maxFart/acc oändliga, gain 1) SKENAR en vild snurr förbi maxFart → taket är det som håller
import EventEmitter from 'eventemitter3'
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Vev, VEV_STEG_MS } from '../src/lib/vev.js'

const { Bodies } = Matter
let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }
const kontroll = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} KONTROLL ${namn}${d ? ' · ' + d : ''}`)
  if (!v) { console.log('  Kontrollarmen rörde sig inte — mätarmen efter den är ogiltig.'); process.exit(1) }
}
const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : String(v))

let KLOCKA = 1000
Object.defineProperty(globalThis, 'performance', { value: { now: () => KLOCKA }, configurable: true, writable: true })
const CX = 640
const CY = 360
const TV = 2 * Math.PI

function yta() {
  const y = new EventEmitter()
  y.eventMode = 'passive'
  y.destroyed = false
  y.toLocal = (g) => ({ x: g.x, y: g.y })
  return y
}
const skicka = (y, type, x, yy, id = 1) => y.emit(type, { type, pointerId: id, global: { x, y: yy } })
const lyssnare = (y) => y.eventNames().reduce((n, k) => n + y.listenerCount(k), 0)

// En ratt: egen integrator (default) eller kopplad till ett riktigt gångjärn.
function ratt(opt = {}, { matter = null } = {}) {
  const y = yta()
  const o = { klick: 0, ...opt }
  let phys = null
  let kropp = null
  if (matter) {
    phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    kropp = Bodies.circle(CX, CY, 60, { frictionAir: 0.03, density: matter.density || 0.001 })
    phys.add(kropp)
    o.phys = phys
    o.gangjarn = phys.gangjarn(kropp, { x: CX, y: CY })
    o.maxMoment = matter.maxMoment || null
  }
  const logg = { klick: 0, knuff: 0, grepp: 0, slapp: [] }
  const vev = new Vev({
    yta: y, x: CX, y: CY, hitArea: { contains: () => true },
    onKlick: () => { logg.klick++ }, onKnuff: () => { logg.knuff++ }, onGrepp: () => { logg.grepp++ },
    onSlapp: (i) => logg.slapp.push(i),
    ...o,
  })
  const h = { y, vev, phys, kropp, logg, topp: 0, toppVarv: 0 }
  // Ett steg: klockan, fysiken/integratorn, och bokför toppfarten.
  h.stega = (n = 1) => {
    for (let i = 0; i < n; i++) {
      KLOCKA += VEV_STEG_MS
      if (phys) phys.update(VEV_STEG_MS)
      else vev.uppdatera(VEV_STEG_MS)
      h.topp = Math.max(h.topp, Math.abs(vev.fart))
    }
  }
  // Fingret cirklar runt axeln i `varvS` varv/s, radie `r`, `sek` sekunder (efter ett ned vid vinkel 0).
  h.cirkla = (varvS, r, sek, { id = 1, lyft = true, th0 = 0 } = {}) => {
    let th = th0
    skicka(y, 'pointerdown', CX + r * Math.cos(th), CY + r * Math.sin(th), id)
    const n = Math.round((sek * 1000) / VEV_STEG_MS)
    for (let i = 0; i < n; i++) {
      th += (varvS * TV) / 60
      KLOCKA += 0 // stegen tar klockan
      skicka(y, 'globalpointermove', CX + r * Math.cos(th), CY + r * Math.sin(th), id)
      h.stega(1)
    }
    const slut = vev.fart
    if (lyft) skicka(y, 'pointerup', CX + r * Math.cos(th), CY + r * Math.sin(th), id)
    return slut
  }
  // Ett tryck: ned, `hall` ms, upp (alla på ratten), jitter px sidled.
  h.tryck = (hall = 60, { x = CX + 40, yy = CY, jitter = 0 } = {}) => {
    skicka(y, 'pointerdown', x, yy)
    if (jitter) skicka(y, 'globalpointermove', x + jitter, yy)
    const n = Math.max(1, Math.round(hall / VEV_STEG_MS))
    h.stega(n)
    skicka(y, 'pointerup', x + jitter, yy)
  }
  return h
}

console.log('\nVEV · rotationsgrepp kring en axel (G8)\n')

// ═══ KONTROLLARMAR ═══════════════════════════════════════════════════════════════════════════
console.log('KONTROLLER')
{
  const h = ratt()
  h.stega(600)
  kontroll('K1a ingen input → vinkel 0 och varvtal 0 efter 10 s', h.vev.vinkel === 0 && h.vev.fart === 0, `vinkel ${h.vev.vinkel}, fart ${h.vev.fart}`)
  const k = ratt()
  k.tryck()
  k.stega(30)
  kontroll('K1b en knuff RÖR varvtalet (talet kan flytta sig)', Math.abs(k.vev.fart) > 0.005, `fart ${f3(k.vev.fart)} rad/steg`)
}
{
  const h = ratt({ damp: 0, stopp: 0 })
  h.vev._fart = 0.1 // sätts för hand: med damp 0 ger en knuff ingen fart (glidet är oändligt)
  h.stega(600)
  kontroll('K2 damp 0 + dödzon 0 → snurrar vidare efter 10 s', Math.abs(h.vev.fart - 0.1) < 1e-9, `fart ${f3(h.vev.fart)}`)
}
{
  const h = ratt({ maxFart: Infinity, acc: Infinity, gain: 1 })
  h.cirkla(8, 60, 1.5)
  kontroll('K3 utan tak SKENAR en vild snurr (8 varv/s ≈ 0,84 rad/steg) förbi 0,3', h.topp > 0.5, `topp ${f3(h.topp)} rad/steg = ${f3((h.topp * 60) / TV)} varv/s`)
}

// ═══ MÄTARM: egen integrator ═════════════════════════════════════════════════════════════════
console.log('\nDRAG (egen integrator)')
let dragVarvS = 0
{
  const h = ratt()
  const slut = h.cirkla(1, 60, 2, { lyft: false })
  const mal = (1 * TV) / 60
  dragVarvS = (slut * 60) / TV
  ok('fingret cirklar 1 varv/s → ratten följer inom 15 % (steady)', Math.abs(slut - mal) / mal < 0.15, `fart ${f3(slut)} mot fingrets ${f3(mal)} rad/steg = ${f3(dragVarvS)} varv/s`)
  ok('onGrepp kom (draget upptäckt)', h.logg.grepp === 1)
  ok('inget tryck-knuff vid ett drag', h.logg.knuff === 0)
  skicka(h.y, 'pointerup', CX + 60, CY)
  const v0 = h.vev.vinkel
  h.stega(1)
  ok('släpp → ratten glider vidare (kast)', h.vev.vinkel > v0 + 0.05, `+${f3(h.vev.vinkel - v0)} rad första steget`)
  let s = 0
  while (Math.abs(h.vev.fart) > 0 && s < 1200) { h.stega(1); s++ }
  ok('stannar till slut (inget svänghjul i evighet)', h.vev.fart === 0 && s < 600, `${f3((s * VEV_STEG_MS) / 1000)} s till stillestånd`)
}
{
  const h = ratt()
  h.cirkla(8, 60, 2)
  ok('vild snurr 8 varv/s: farten tak-klämd till maxFart (0,3 rad/steg)', h.topp <= 0.3 + 1e-9, `topp ${f3(h.topp)} rad/steg = ${f3((h.topp * 60) / TV)} varv/s`)
  ok('…och når taket (greppet fungerar, bara begränsat)', h.topp > 0.29, `topp ${f3(h.topp)}`)
}
{
  // Accelerationstaket: från stillastående får farten växa högst `acc` per steg under ett grepp.
  const h = ratt()
  let prev = 0
  let maxDv = 0
  skicka(h.y, 'pointerdown', CX + 60, CY)
  let th = 0
  for (let i = 0; i < 40; i++) {
    th += (4 * TV) / 60
    skicka(h.y, 'globalpointermove', CX + 60 * Math.cos(th), CY + 60 * Math.sin(th))
    h.stega(1)
    maxDv = Math.max(maxDv, Math.abs(h.vev.fart - prev * (1 - 0.03)))
    prev = h.vev.fart
  }
  ok('accelerationstak: aldrig mer än acc (0,012) rad/steg² under greppet', maxDv <= 0.012 + 1e-9, `största ändring ${f3(maxDv)}`)
}
{
  // Fingret nära axeln (r 8 px) räknas ner — ett darr där ger inte en snurr.
  const h = ratt()
  h.cirkla(3, 8, 1.5)
  ok('nära axeln (r 8 px < rMin 28) dämpas: 3 varv/s ger < 40 % av fingrets fart', h.topp < 0.4 * ((3 * TV) / 60), `topp ${f3(h.topp)} mot fingrets ${f3((3 * TV) / 60)}`)
}
{
  // Ett stilla finger bromsar inte (inget grepp förrän draget) och ett hållet tryck är ingen knuff.
  const h = ratt()
  h.vev._fart = 0.1
  skicka(h.y, 'pointerdown', CX + 40, CY)
  h.stega(40)
  ok('ett STILLA nedtryck på en snurrande ratt bromsar den inte (inget grepp före draget)', Math.abs(h.vev.fart - 0.1 * 0.97 ** 40) < 0.002, `fart ${f3(h.vev.fart)} mot fri ${f3(0.1 * 0.97 ** 40)}`)
  skicka(h.y, 'pointerup', CX + 40, CY)
  ok('…och ett tryck hållet > 600 ms är ingen knuff', h.logg.knuff === 0)
}

console.log('\nTAP = KNUFF')
{
  const h = ratt()
  h.tryck()
  h.stega(600)
  const v = h.vev.vinkel
  ok('ETT tryck på en stilla ratt = ett kvarts varv (π/2 ± 10 %)', Math.abs(v - Math.PI / 2) / (Math.PI / 2) < 0.1, `${f3(v)} rad = ${f3(v / (Math.PI / 2))} kvartsvarv`)
  ok('…och den stannar efteråt', h.vev.fart === 0)
  const k = ratt({ klick: Math.PI / 4 })
  k.tryck()
  k.stega(600)
  ok("onKlick: ett kvarts varv = 2 klick (var 45°)", k.logg.klick === 2, `${k.logg.klick} klick`)
}
let tapTopp = 0
{
  const h = ratt()
  for (let i = 0; i < 10; i++) { h.tryck(60); h.stega(Math.round(190 / VEV_STEG_MS)) }
  tapTopp = h.topp
  const mal = (dragVarvS * TV) / 60
  ok('tap-armen: 10 tryck à 250 ms når drag-armens varvtal (≥ 90 % av 1 varv/s)', tapTopp >= 0.9 * mal, `topp ${f3((tapTopp * 60) / TV)} varv/s mot drag ${f3(dragVarvS)} varv/s`)
  const n = (() => {
    const g = ratt()
    for (let i = 1; i <= 10; i++) { g.tryck(60); g.stega(Math.round(190 / VEV_STEG_MS)); if (g.topp >= 0.9 * mal) return i }
    return 99
  })()
  ok('…inom 10 tryck', n <= 10, `${n} tryck`)
  ok('tryck bokförda: 10 knuffar, inget grepp', h.logg.knuff === 10 && h.logg.grepp === 0)
}
{
  const h = ratt()
  for (let i = 0; i < 30; i++) { h.tryck(40); h.stega(Math.round(60 / VEV_STEG_MS)) }
  ok('tap-spam (30 tryck à 100 ms) skenar inte: topp ≤ maxFart', h.topp <= 0.3 + 1e-9, `topp ${f3(h.topp)} rad/steg`)
}
{
  const h = ratt()
  h.tryck(60, { jitter: 5 })
  ok('ett tryck med 5 px darr räknas som tryck (under dragtröskeln)', h.logg.knuff === 1)
  const g = ratt()
  g.tryck(800)
  ok('ett tryck hållet 800 ms är ingen knuff', g.logg.knuff === 0 && g.vev.fart === 0)
  const o = ratt()
  o.tryck(60, { x: CX + 90, yy: CY })
  ok('ett tryck utanför träffradien (66 px) gör ingenting', o.logg.knuff === 0 && o.vev.fart === 0)
  const t = ratt()
  t.vev.aktiv = false
  t.tryck()
  ok('aktiv = false stänger kontrollen', t.logg.knuff === 0)
  const p = ratt()
  skicka(p.y, 'pointerdown', CX + 60, CY, 1)
  const fore = p.vev.fart
  p.cirkla(2, 60, 0.5, { id: 2, lyft: false })
  skicka(p.y, 'pointerup', CX, CY, 2)
  ok('ett ANDRA finger (annat pointerId) mitt i ett tryck ignoreras', p.vev.fart === fore && p.logg.knuff === 0, `fart ${f3(p.vev.fart)}`)
  skicka(p.y, 'pointerup', CX + 60, CY, 1)
}

// ═══ MÄTARM: kopplad till ett riktigt gångjärn (matter) ══════════════════════════════════════
console.log('\nGÅNGJÄRN (matter, `phys.gangjarn`)')
{
  const k = ratt({}, { matter: {} })
  k.stega(600)
  kontroll('K1c matter: ingen input → kroppen står på 0', Math.abs(k.kropp.angularVelocity) < 1e-9 && Math.abs(k.vev.vinkel) < 1e-9, `vinkel ${f3(k.vev.vinkel)}`)
  const h = ratt({}, { matter: {} })
  const slut = h.cirkla(1, 60, 2, { lyft: false })
  const mal = TV / 60
  ok('drag 1 varv/s → kroppen följer inom 20 %', Math.abs(slut - mal) / mal < 0.2, `fart ${f3(slut)} mot ${f3(mal)} rad/steg`)
  ok('läser leden: vev.vinkel = kroppens vinkel (accumulerad, aldrig modulo)', Math.abs(h.vev.vinkel - h.kropp.angle) < 1e-9 && h.vev.vinkel > 2 * Math.PI, `${f3(h.vev.vinkel)} rad = ${f3(h.vev.varv)} varv`)
}
{
  const h = ratt({}, { matter: {} })
  h.cirkla(8, 60, 2)
  ok('matter, vild snurr: topp ≤ maxFart (taket håller genom leden)', h.topp <= 0.3 * 1.02, `topp ${f3(h.topp)} rad/steg`)
  const g = ratt({}, { matter: {} })
  g.tryck()
  g.stega(600)
  ok('matter, ETT tryck = kvarts varv (± 15 %)', Math.abs(g.vev.vinkel - Math.PI / 2) / (Math.PI / 2) < 0.15, `${f3(g.vev.vinkel / (Math.PI / 2))} kvartsvarv`)
  const t = ratt({}, { matter: {} })
  const mal = TV / 60
  for (let i = 0; i < 10; i++) { t.tryck(60); t.stega(Math.round(190 / VEV_STEG_MS)) }
  ok('matter, tap-armen: 10 tryck når ≥ 90 % av drag-armens 1 varv/s', t.topp >= 0.9 * mal, `topp ${f3((t.topp * 60) / TV)} varv/s`)
}
{
  // Tröghet: med ett FAST momenttak ger en tung ratt lägre fart (kontroll: lätt > tung).
  const lat = ratt({ acc: 1 }, { matter: { density: 0.001, maxMoment: 3 } })
  const tung = ratt({ acc: 1 }, { matter: { density: 0.01, maxMoment: 3 } })
  lat.cirkla(3, 60, 1)
  tung.cirkla(3, 60, 1)
  kontroll('K4 med momenttak: tung ratt (10× tröghet) hinner inte lika långt som lätt', Math.abs(tung.vev.vinkel) < 0.5 * Math.abs(lat.vev.vinkel), `tung ${f3(tung.vev.vinkel)} rad, lätt ${f3(lat.vev.vinkel)} rad`)
}

// ═══ RIVNING ═════════════════════════════════════════════════════════════════════════════════
console.log('\nRIVNING')
{
  const h = ratt({}, { matter: {} })
  const fore = (h.phys.engine.events.beforeUpdate || []).length
  ok('matter: Vev lade en beforeUpdate-krok', fore >= 1, `${fore}`)
  const y = h.y
  ok('lyssnare på ytan finns', lyssnare(y) >= 3, `${lyssnare(y)}`)
  h.vev.destroy()
  ok('destroy: ytan har 0 lyssnare kvar', lyssnare(y) === 0, `${lyssnare(y)}`)
  ok('destroy: beforeUpdate-kroken borta', (h.phys.engine.events.beforeUpdate || []).length === fore - 1)
  skicka(y, 'pointerdown', CX + 40, CY)
  skicka(y, 'pointerup', CX + 40, CY)
  h.stega(10)
  ok('efter destroy gör ett tryck ingenting och inget anrop kommer', h.logg.knuff === 0 && h.kropp.angularVelocity === 0)
  h.vev.knuff()
  h.vev.uppdatera(20)
  ok('efter destroy är knuff()/uppdatera() tysta', h.logg.knuff === 0)
  const e = ratt()
  e.tryck()
  e.vev.destroy()
  e.stega(300)
  ok('destroy mitt i ett glid lämnar inget kvar (egen integrator: farten fryst, inga anrop)', e.logg.klick === 0)
}

console.log(`\n${fel ? '✗ ' + fel + ' FEL' : '✓ allt grönt'}`)
process.exit(fel ? 1 : 0)
