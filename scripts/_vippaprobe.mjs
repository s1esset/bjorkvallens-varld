// VIPPA (FYSIKPLAN P2, lib/vippa.js) — Node-mätning utan Pixi-renderare: vippan stegas med
// `{ ticker: null }` och `steg(deltaMS)` med syntetiska vsync-stämplar.
//
//   node scripts/_vippaprobe.mjs
//
// KONTROLLARMAR (måste ge det KÄNDA svaret före mätraderna läses):
//   · damp 0   ska INTE gå till vila (utslaget lever kvar efter 30 s, noden skrivs hela tiden)
//   · ett      naiv stegning `fjader1d.steg(1/60)` per BILDRUTA — ska SKILJA mellan 30 och 60 Hz
//              (annars säger "samma kurva" ingenting om Takt)
// MÄTARMAR:
//   · utslag efter en stöt rör noden; 0,00 i vila efter N s; inga skrivningar efter vilan
//   · samma kurva vid 30/60/90 Hz (och 57,1 med fasglapp), max håller vid jättestöt, tre axlar,
//     destroy() tar tickerlyssnaren, riven nod släpper tickern själv, hitArea ger dev-varning
import { vippa } from '../src/lib/vippa.js'
import { fjader1d } from '../src/lib/takt.js'

let fel = 0
const kontroll = (namn, ok, detalj = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!ok) fel++
}
const f = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v))

// Fejknod som räknar skrivningar per egenskap.
function fejk(start = {}) {
  const n = { destroyed: false, skrivningar: 0, _rotation: start.rotation ?? 0, _y: start.y ?? 0, skew: { _x: start.skewx ?? 0 } }
  Object.defineProperty(n, 'rotation', { get() { return n._rotation }, set(v) { n._rotation = v; n.skrivningar++ } })
  Object.defineProperty(n, 'y', { get() { return n._y }, set(v) { n._y = v; n.skrivningar++ } })
  Object.defineProperty(n.skew, 'x', { get() { return n.skew._x }, set(v) { n.skew._x = v; n.skrivningar++ } })
  return n
}

// Kör `sek` sekunder vid `hz` med vsync-stämplade deltan (±0,1 ms jitter). `vidTid` = [s] → värden.
function kor(v, nod, prop, hz, sek, vidTid = []) {
  const utf = {}
  const dt = 1000 / hz
  let t = 0
  const klart = new Set()
  const n = Math.round(sek * hz)
  for (let i = 0; i < n; i++) {
    v.steg(Math.round((dt + (i % 2 ? 0.1 : -0.1)) * 10) / 10)
    t += dt / 1000
    for (const s of vidTid) if (!klart.has(s) && t >= s - 1e-9) { klart.add(s); utf[s] = prop(nod) }
  }
  return utf
}

const TIDER = [0.5, 1.0, 1.5, 2.0]
const rot = (n) => n.rotation

console.log('\n══ KONTROLL: damp 0 går INTE till vila')
{
  const nod = fejk()
  const v = vippa(nod, { ticker: null, damp: 0, max: 0.3 })
  v.stot(1)
  kor(v, nod, rot, 60, 30)
  const skr0 = nod.skrivningar
  let maxAbs = 0
  for (let i = 0; i < 120; i++) { v.steg(1000 / 60); maxAbs = Math.max(maxAbs, Math.abs(nod.rotation)) }
  kontroll('efter 30 s lever utslaget kvar (maxAbs > 0,15 rad av 0,3) och noden skrivs varje ruta',
    maxAbs > 0.15 && !v.vila && nod.skrivningar - skr0 === 120, `maxAbs ${f(maxAbs)} rad, skrivningar +${nod.skrivningar - skr0}/120`)
}

console.log('\n══ KONTROLL: naiv "ett fast steg per bildruta" skiljer mellan 30 och 60 Hz')
{
  const kurva = (hz) => {
    const sp = fjader1d(Math.sqrt(180), 0.18)
    sp.stot(1)
    const ut = []
    for (let i = 1; i <= hz * 2; i++) ut.push([i / hz, sp.steg(1 / 60)]) // ett 1/60-steg per ruta, oavsett Hz
    return ut
  }
  const a = kurva(30), b = kurva(60)
  let skil = 0
  for (const t of [0.5, 1.0, 1.5]) {
    const va = a.find(([tt]) => Math.abs(tt - t) < 1e-6)[1]
    const vb = b.find(([tt]) => Math.abs(tt - t) < 1e-6)[1]
    skil = Math.max(skil, Math.abs(va - vb))
  }
  kontroll('ett-arm @30 skiljer från ett-arm @60 (max-skillnad i x ≥ 0,1 över 5 tidpunkter)', skil >= 0.1, `${f(skil)}`)
}

console.log('\n══ MÄTARM: stöt → utslag → vila (60 Hz, damp 0,18, max 0,3 rad)')
{
  const nod = fejk({ rotation: 0.1 })
  const v = vippa(nod, { ticker: null })
  const innan = nod.skrivningar
  kontroll('i vila skriver vippan ingenting (steg utan stöt, 60 rutor)', (() => { for (let i = 0; i < 60; i++) v.steg(1000 / 60); return nod.skrivningar === innan && v.vila })())
  v.stot(0.8)
  let topp = 0, tidTillVila = -1
  for (let i = 0; i < 60 * 12; i++) {
    v.steg(1000 / 60)
    topp = Math.max(topp, Math.abs(nod.rotation - 0.1))
    if (tidTillVila < 0 && v.vila) tidTillVila = (i + 1) / 60
  }
  kontroll('stöt 0,8 ger utslag > 0,1 rad (och ≤ 0,3)', topp > 0.1 && topp <= 0.3 + 1e-9, `topp ${f(topp)} rad`)
  kontroll('0,00 i vila: noden står på exakt startvärdet 0,1', nod.rotation === 0.1, `${nod.rotation}`)
  kontroll('vilan nås inom 12 s', tidTillVila > 0, `${f(tidTillVila, 2)} s`)
  const s0 = nod.skrivningar
  for (let i = 0; i < 300; i++) v.steg(1000 / 60)
  kontroll('0 skrivningar efter vilan (300 rutor)', nod.skrivningar === s0, `${nod.skrivningar - s0}`)
  v.stot(-0.5)
  v.steg(1000 / 60)
  kontroll('en ny stöt väcker den igen (noden rör sig)', nod.rotation !== 0.1 && !v.vila)
  v.destroy()
}

console.log('\n══ MÄTARM: samma kurva vid 30 / 60 / 90 Hz (jitterfritt) och 57,1 Hz (±1 steg)')
{
  const kor0 = (hz) => {
    const nod = fejk()
    const v = vippa(nod, { ticker: null })
    v.stot(1)
    const utf = {}
    const klart = new Set()
    for (let i = 1; i <= Math.round(hz * 2.5); i++) {
      v.steg(1000 / hz)
      for (const t of TIDER) if (!klart.has(t) && i / hz >= t - 1e-9) { klart.add(t); utf[t] = nod.rotation }
    }
    return utf
  }
  // Referens: 60 Hz, värdet efter varje steg.
  const refNod = fejk(); const refV = vippa(refNod, { ticker: null }); refV.stot(1)
  const ref = [0]
  for (let i = 0; i < 160; i++) { refV.steg(1000 / 60); ref.push(refNod.rotation) }
  const kurvor = {}
  for (const hz of [30, 57.1, 60, 90]) kurvor[hz] = kor0(hz)
  for (const hz of [30, 57.1, 60, 90]) console.log(`  ${String(hz).padStart(5)} Hz  rad @ ${TIDER.join(' / ')} s: ${TIDER.map((t) => f(kurvor[hz][t], 4)).join(' ')}`)
  let spann = 0
  for (const t of TIDER) {
    const vs = [30, 60].map((hz) => kurvor[hz][t])
    spann = Math.max(spann, Math.max(...vs) - Math.min(...vs))
  }
  kontroll('30 mot 60 Hz: spann ≤ 0,002 rad vid varje tidpunkt', spann <= 0.002, `spann ${f(spann, 5)} rad`)
  for (const hz of [57.1, 90]) {
  let ok = true
  let maxAv = 0
  for (const t of TIDER) {
    const k = Math.floor(t * 60 + 1e-6)
    const lo = Math.min(ref[k - 1], ref[k], ref[k + 1]) - 0.001
    const hi = Math.max(ref[k - 1], ref[k], ref[k + 1]) + 0.001
    const v = kurvor[hz][t]
    if (v < lo || v > hi) ok = false
    maxAv = Math.max(maxAv, Math.abs(v - ref[k]))
  }
  kontroll(`${hz} Hz ligger inom ±1 steg av 60 Hz-kurvan (fasglapp / flyttalsgräns vid provtagning)`, ok, `största avvikelse ${f(maxAv, 4)} rad`)
  }
}

console.log('\n══ MÄTARM: max håller vid jättestöt och stötsalva')
{
  for (const axel of ['rot', 'y', 'skev']) {
    const max = axel === 'y' ? 10 : 0.2
    const nod = fejk({ y: 50, rotation: 1, skewx: 0.5 })
    const bas = axel === 'y' ? 50 : axel === 'rot' ? 1 : 0.5
    const v = vippa(nod, { ticker: null, axel, max, damp: 0.05 })
    const lasa = axel === 'y' ? () => nod.y : axel === 'rot' ? () => nod.rotation : () => nod.skew.x
    let ut = 0
    v.stot(1e9)
    for (let i = 0; i < 600; i++) {
      if (i % 3 === 0) v.stot(i % 6 === 0 ? 1 : -1) // stöt var tredje ruta — försöker pumpa upp
      v.steg(1000 / 60)
      ut = Math.max(ut, Math.abs(lasa() - bas))
    }
    kontroll(`axel ${axel}: max ${max} håller (utslag ≤ max, och når över 70 % av det)`, ut <= max + 1e-9 && ut > 0.7 * max, `utslag ${f(ut, 4)}`)
    const ovr = axel === 'y' ? [nod.rotation, nod.skew.x] : axel === 'rot' ? [nod.y, nod.skew.x] : [nod.y, nod.rotation]
    kontroll(`axel ${axel}: de andra två egenskaperna orörda`, ovr[0] === (axel === 'y' ? 1 : 50) && ovr[1] === (axel === 'skev' ? 1 : 0.5), JSON.stringify(ovr))
    v.destroy()
  }
}

console.log('\n══ MÄTARM: ticker-livscykel och dev-varning')
{
  const lyss = new Set()
  const ticker = { add: (fn) => lyss.add(fn), remove: (fn) => lyss.delete(fn) }
  const nod = fejk()
  const v = vippa(nod, { ticker })
  kontroll('vippan hakar på tickern med EN lyssnare', lyss.size === 1)
  v.stot(1)
  for (const fn of lyss) fn({ deltaMS: 1000 / 60 })
  kontroll('tickern driver den (noden rör sig)', nod.rotation !== 0, f(nod.rotation))
  v.destroy()
  kontroll('destroy() tar lyssnaren och lämnar noden på basen', lyss.size === 0 && nod.rotation === 0)
  const s = nod.skrivningar
  v.stot(1); v.steg(1000 / 60)
  kontroll('efter destroy() är stöt/steg döda (0 skrivningar)', nod.skrivningar === s)
  v.destroy() // idempotent — får inte kasta

  const nod2 = fejk()
  const v2 = vippa(nod2, { ticker })
  v2.stot(1)
  nod2.destroyed = true
  const s2 = nod2.skrivningar
  for (const fn of [...lyss]) fn({ deltaMS: 1000 / 60 })
  kontroll('riven nod: vippan släpper tickern själv utan att skriva', lyss.size === 0 && nod2.skrivningar === s2)

  const varningar = []
  const gammal = console.warn
  console.warn = (...a) => varningar.push(a.join(' '))
  const nod3 = fejk()
  nod3.hitArea = {}
  const v3 = vippa(nod3, { ticker: null })
  vippa(fejk(), { ticker: null }).destroy()
  console.warn = gammal
  v3.destroy()
  kontroll('hitArea → exakt en dev-varning (och ingen för en nod utan)', varningar.length === 1, varningar[0] ?? '')
}

console.log(fel ? `\n✗ ${fel} kontroll(er) föll` : '\n✓ alla kontroller höll')
process.exit(fel ? 1 : 0)
