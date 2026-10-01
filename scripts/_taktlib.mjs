// TAKT-LIBBET (FYSIKPLAN T3) — hänger en mjukkropp och ett rep lika högt vid alla bildfrekvenser?
//
//   node scripts/_taktlib.mjs [--json]
//
// Pixis riktiga `Ticker` (maxFPS 60 som i App.js, vsync-stämplar à 0,1 ms) driver bildrutorna.
// ARMAR:
//   dtF   KONTROLLARMEN: dagens stegning, `steg(clamp(deltaMS/16,67, 0,5, 2))` (lagerelden,
//         glasstornet). Måste SKILJA mellan Hz — annars mäter bänken ingenting.
//   ett   ett `steg(1)` per avfyrad bildruta (så stegar de spel som aldrig skickade dtF).
//   takt  `uppdatera(deltaMS)` — fast steg ur lib/takt.js. Ska ge SAMMA tal vid alla Hz.
// Mått: mjukkropp = höjd/bredd (px) hängande ur toppen, och mitt-pinnad (lagerelden) med
// mjukhet 0,9; rep = hängning (px under kordan) för en lina spänd mellan två punkter.
// Varje scen har en kontrollrad som måste hålla innan mätraderna skrivs.
import { Ticker } from 'pixi.js'
import { Mjukkropp } from '../src/lib/mjukkropp.js'
import { Rep } from '../src/lib/rep.js'
import { Takt } from '../src/lib/takt.js'

const FIXED = 1000 / 60
const JSON_UT = process.argv.includes('--json')
const ut = (...a) => { if (!JSON_UT) console.log(...a) }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
let fel = 0
const rader = []
const kontroll = (namn, villkor, detalj = '') => {
  ut(`  ${villkor ? '✓' : '✗'} KONTROLL ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

// Kör `sek` sekunder vid `hz`; `tick(deltaMS)` per avfyrad bildruta, `mat()` de sista `matSek`.
function korTicker(hz, sek, tick, mat, matSek = 2) {
  const tk = new Ticker()
  tk.autoStart = false
  tk.maxFPS = 60
  let tid = 0
  const acc = []
  tk.add((t) => {
    tid += t.deltaMS / 1000
    tick(t.deltaMS)
    if (tid > sek - matSek) acc.push(mat())
  })
  const n = Math.round(sek * hz)
  for (let i = 0; i <= n; i++) tk.update(Math.round((1000 + (i * 1000) / hz) * 10) / 10)
  const nyckel = Object.keys(acc[0] ?? {})
  const medel = {}
  for (const k of nyckel) medel[k] = acc.reduce((s, a) => s + a[k], 0) / acc.length
  return medel
}

const stegare = (arm, obj) => {
  if (arm === 'dtF') return (d) => obj.steg(clamp(d / FIXED, 0.5, 2))
  if (arm === 'ett') return () => obj.steg(1)
  return (d) => obj.uppdatera(d)
}

// ─── mjukkropp ───────────────────────────────────────────────────────────────────────────────
function mjuk(arm, hz, lage) {
  const m = new Mjukkropp({ x: 0, y: 0, w: 40, h: 52, punkter: 14, grav: 0.34, damp: 0.9, iter: 6 })
  m.fast(lage === 'hang' ? m.topp : m.mitt, 0, 0)
  m.mjukhet(0.9)
  const steg = stegare(arm, m)
  return korTicker(hz, 12, steg, () => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    for (let i = 0; i < m.n; i++) { const p = m.pts[i]; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y) }
    return { bredd: x1 - x0, hojd: y1 - y0 }
  })
}

// ─── rep ─────────────────────────────────────────────────────────────────────────────────────
function rep(arm, hz, sag) {
  const r = new Rep({ n: 20, seg: 600 / 19, grav: 0.5 })
  r.bygg(100, 100, () => 0, 0) // rakt längs kordan; spann() gör den slak och den faller till en kedjekurva
  r.spann(100, 100, 700, 100, sag)
  const steg = stegare(arm, r)
  return korTicker(hz, 12, steg, () => ({ hang: Math.max(...r.pts.map((p) => p.y)) - 100 }))
}


// ─── glasstornets vobbel: en impuls (skjut) efter 1 s uppvärmning (Pixis FÖRSTA bildruta är en
// 100 ms-ruta — den måste ligga FÖRE impulsen), sedan ringens avvikelse från viloradien:
// medelvärde över 0,5 s (robust mot att 30 Hz bara ser varannan fysikruta) och rest 1,0–1,5 s efter.
function vobbel(arm, hz) {
  const m = new Mjukkropp({ x: 0, y: 0, w: 88, h: 88, punkter: 16, grav: 0, damp: 0.84, iter: 5, styvhet: 0.45 })
  m.fast(m.mitt, 0, 0)
  const steg = stegare(arm, m)
  let tid = 0
  let skjutit = false
  let summa = 0
  let n = 0
  let kvar = 0
  const tk = new Ticker()
  tk.autoStart = false
  tk.maxFPS = 60
  tk.add((t) => {
    tid += t.deltaMS / 1000
    if (!skjutit && tid > 1) { m.skjut(8, 0); skjutit = true; tid = 1 }
    steg(t.deltaMS)
    if (!skjutit) return
    let max = 0
    for (let i = 0; i < m.n; i++) max = Math.max(max, Math.abs(Math.hypot(m.pts[i].x, m.pts[i].y) - 44))
    if (tid < 1.5) { summa += max; n++ }
    if (tid > 2.0 && tid < 2.5) kvar = Math.max(kvar, max)
  })
  for (let i = 0; i <= hz * 4; i++) tk.update(Math.round((1000 + (i * 1000) / hz) * 10) / 10)
  return { medel: summa / n, kvar1s: kvar }
}

const HZ = [30, 40, 50, 57.1, 60, 90]
const ARMAR = ['dtF', 'ett', 'takt']
const SCENER = [
  { id: 'mjuk-hang', titel: 'Mjukkropp hängande ur toppen (mjukhet 0,9)', kor: (a, h) => mjuk(a, h, 'hang'), nyckel: ['hojd', 'bredd'] },
  { id: 'mjuk-mitt', titel: 'Mjukkropp mitt-pinnad som lagerelden (mjukhet 0,9)', kor: (a, h) => mjuk(a, h, 'mitt'), nyckel: ['hojd', 'bredd'] },
  { id: 'vobbel', titel: 'Glasstornets ring: skjut(8,0) vid start → medelavvikelse 0,5 s (px) / rest 1,0–1,5 s efter (px)', kor: vobbel, nyckel: ['medel', 'kvar1s'] },
  { id: 'rep-spant', titel: 'Rep spänt 600 px, sag 1,0 — hängning under kordan (FYSIKPLAN: ~1,9× djupare vid 30 fps)', kor: (a, h) => rep(a, h, 1.0), nyckel: ['hang'] },
  { id: 'rep-slakt', titel: 'Rep slakt 600 px, sag 1,3 — hängning under kordan', kor: (a, h) => rep(a, h, 1.3), nyckel: ['hang'] },
]

// Takt-enhetens egna kontroller: exakt ett steg/ruta vid 60,0 Hz utan jitter, taket kastar rest.
{
  ut('\n══ TAKT-enheten')
  const t = new Takt()
  let n = 0
  for (let i = 0; i < 600; i++) n += t.kor(1000 / 60 + (i % 2 ? 0.1 : -0.1), () => {})
  kontroll('±0,1 ms vsync-jitter → exakt 600 steg på 600 rutor (snäpp)', n === 600, `${n}`)
  const t2 = new Takt({ snapp: 0 })
  let n2 = 0
  for (let i = 0; i < 600; i++) n2 += t2.kor(1000 / 60 + (i % 2 ? 0.1 : -0.1), () => {})
  ut(`  · utan snäpp: ${n2} steg på 600 rutor (jittern ±0,1 ms är nollmedelvärde, så summan driver inte — det är FÖRDELNINGEN per ruta snäppet rättar, se _fysikbank S6)`)
  let a = 0
  const t3 = new Takt({ max: 3 })
  const n3 = t3.kor(90, () => a++)
  kontroll('90 ms → max 3 steg och resten kastad', n3 === 3 && a === 3 && t3.alfa === 0, `steg ${n3}, alfa ${f(t3.alfa)}`)
  const t4 = new Takt()
  t4.kor(25, () => {})
  kontroll('25 ms → ett steg, alfa = 8,33/16,67 = 0,5', Math.abs(t4.alfa - 0.5) < 1e-9, `alfa ${f(t4.alfa, 4)}`)
  const t5 = new Takt()
  const n5 = t5.kor(0, () => {}) + t5.kor(NaN, () => {})
  kontroll('0 / NaN räknas som ett steg (som physics.js)', n5 === 2, `${n5}`)
}

for (const sc of SCENER) {
  ut(`\n══ ${sc.id} · ${sc.titel}`)
  const tabell = {}
  for (const arm of ARMAR) for (const hz of HZ) tabell[`${arm}@${hz}`] = sc.kor(arm, hz)
  // Kontrollen: dagens dtF-stegning SKA skilja mellan 30 och 60 Hz (annars mäter vi inget).
  const k = sc.nyckel[0]
  const skil = Math.abs(tabell['dtF@30'][k] - tabell['dtF@60'][k]) / Math.abs(tabell['dtF@60'][k])
  kontroll(`dtF @30 skiljer sig från dtF @60 (${k})`, skil > 0.08, `${f(tabell['dtF@30'][k])} mot ${f(tabell['dtF@60'][k])} (${f(100 * skil, 1)} %, ${f(tabell['dtF@30'][k] / tabell['dtF@60'][k])}×)`)
  if (fel) { ut('  ✗ kontrollen höll inte — inga mätrader'); continue }
  ut(`  ${pad('arm', 5)} ${HZ.map((h) => padL(h + ' Hz', 22)).join('')}`)
  for (const arm of ARMAR) {
    ut(`  ${pad(arm, 5)} ${HZ.map((h) => padL(sc.nyckel.map((n) => f(tabell[`${arm}@${h}`][n])).join(' / '), 22)).join('')}   (${sc.nyckel.join(' / ')})`)
  }
  for (const n of sc.nyckel) {
    const v = HZ.map((h) => tabell[`takt@${h}`][n])
    const spann = Math.max(...v) - Math.min(...v)
    const vd = HZ.map((h) => tabell[`dtF@${h}`][n])
    const spannD = Math.max(...vd) - Math.min(...vd)
    kontroll(`takt ${n}: samma tal vid alla Hz (spann ≤ 0,5 px)`, spann <= 0.5, `takt-spann ${f(spann)} px · dtF-spann ${f(spannD)} px`)
  }
  rader.push({ id: sc.id, tabell })
}

if (JSON_UT) console.log(JSON.stringify({ fel, rader }, null, 1))
else ut(`\n${fel ? '✗ ' + fel + ' kontroll(er) föll' : '✓ alla kontroller höll'}`)
process.exit(fel ? 1 : 0)
