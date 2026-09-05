// unika-knytt — SALLSYNTHETEN i tal, utan webblasare (docens §3b, leverans 2 steg 2).
//
//   node scripts/_tierprobe.mjs
//
// Hela rullningen ar ren logik i `dna.js` (`rullaTier`, `tierOdds`). Det som KRAVER en
// webblasare — att ceremonin faktiskt bygger folie/gloria/kompis och att sparposten bar
// tiern — mats av `_knyttprobe.mjs` (armarna T*).
//
// u dras ur ett JAMNT RUTNAT ((i+0,5)/N), inte ur en slumpkalla: da ar andelarna exakta
// till 1/N och armarna kan krava tabellens tal pa hundradelen i stallet for "ungefar".
//
// Armar:
//   K0 kontroll  utan garantier ar vanlig MOJLIG (~83 %)           -> annars mater T3 inget
//   T1 matarm    oddsen per gnistniva ar agarens tabell exakt (guld 2,00/2,17/2,33/2,50 ...)
//   T2 matarm    taket: fyra+ gnistor ger samma odds som tre (+5 pp ar ett TAK)
//   T3 matarm    garantierna: forsta klackningen och torka >= 6 ger ALDRIG vanlig,
//                torka 5 ger det fortfarande (kontrollarm inne i familjen)
//   T4 matarm    tiern ror ALDRIG genetiken: samma fro, t 0 mot t 3 -> identisk individ
//   T5 matarm    kompisen foljer varlden (en per varld, alla olika)
//   T6 matarm    `_sparaKnytt` skriver `this._tier` pa plats 7 — last UR index.js
//   T7 matarm    bada replikerna star som literaler i index.js OCH finns i voice-phrases
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { rullaTier, tierOdds, dnaFromSeed, VARLDAR, TIER } from '../src/games/unika-knytt/dna.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const las = (p) => readFileSync(join(ROOT, p), 'utf8')
const rader = []
const arm = (namn, varde, ok) => rader.push([namn, String(varde), !!ok])

const N = 200000
/** Andelar i procent per tier for gnistniva g, over ett jamnt rutnat av u. */
const andel = (g, opts) => {
  const c = [0, 0, 0, 0]
  for (let i = 0; i < N; i++) c[rullaTier((i + 0.5) / N, g, opts)]++
  return c.map((x) => (100 * x) / N)
}
const f2 = (x) => x.toFixed(2)

// =================================================================== K0 kontrollarm
const k0 = andel(0)
arm('K0 kontroll  utan garantier finns vanliga', `vanlig ${f2(k0[0])} %`, k0[0] > 80 && k0[0] < 86)

// =================================================================== T1 tabellen
// Agarens tal (docens §3b), per gnista: +1/6 pp guld · +0,5 pp silver · +1,0 pp brons.
const TABELL = [
  [2.0, 5.0, 10.0, 17.0],
  [2.17, 5.5, 11.0, 18.67],
  [2.33, 6.0, 12.0, 20.33],
  [2.5, 6.5, 13.0, 22.0],
]
let tabOk = true
const tabTal = []
for (let g = 0; g <= 3; g++) {
  const a = andel(g)
  const skimmer = a[1] + a[2] + a[3]
  const [guld, silver, brons, tot] = TABELL[g]
  const ok = Math.abs(a[3] - guld) < 0.02 && Math.abs(a[2] - silver) < 0.02 && Math.abs(a[1] - brons) < 0.02 && Math.abs(skimmer - tot) < 0.02
  if (!ok) tabOk = false
  tabTal.push(`g${g}: ${f2(a[3])}/${f2(a[2])}/${f2(a[1])} = ${f2(skimmer)}`)
}
arm('T1 matarm    oddsen ar agarens tabell (guld/silver/brons = skimmer)', tabTal.join(' · '), tabOk)

// =================================================================== T2 taket
const a3 = andel(3)
const a7 = andel(7)
const o7 = tierOdds(7)
arm('T2 matarm    fyra+ gnistor = tre (taket +5 pp)', `g7 skimmer ${f2(a7[1] + a7[2] + a7[3])} · guld ${f2(a7[3])} · odds ${(o7.guld * 100).toFixed(2)}`, a7.every((x, i) => Math.abs(x - a3[i]) < 1e-9))

// =================================================================== T3 garantierna
const gF = andel(0, { forsta: true })
const gT6 = andel(0, { torka: 6 })
const gT5 = andel(0, { torka: 5 })
arm('T3 matarm    forsta klackningen: aldrig vanlig', `vanlig ${f2(gF[0])} % · brons ${f2(gF[1])} % · guld ${f2(gF[3])} %`, gF[0] === 0 && Math.abs(gF[3] - 2.0) < 0.02)
arm('T3b          torka 6: aldrig vanlig', `vanlig ${f2(gT6[0])} % · brons ${f2(gT6[1])} %`, gT6[0] === 0 && gT6[1] > 90)
arm('T3c kontroll torka 5: vanlig fortfarande mojlig', `vanlig ${f2(gT5[0])} %`, gT5[0] > 80)

// =================================================================== T4 genetiken
const sig = (d) => JSON.stringify({ ...d, tier: 0, sprickor: 0 })
let genOk = true
for (const fro of [1, 12345, 0xdeadbeef, 987654321]) {
  const a = dnaFromSeed(fro, { f: 3, z: 2, m: 1, v: 2, g: 1, t: 0 })
  const b = dnaFromSeed(fro, { f: 3, z: 2, m: 1, v: 2, g: 1, t: 3 })
  if (sig(a) !== sig(b) || a.tier !== 0 || b.tier !== 3) genOk = false
}
const dT = dnaFromSeed(42, { t: 9 })
arm('T4 matarm    tiern ror aldrig genetiken', `4 fron, t 0 mot 3: ${genOk ? 'identiska individer' : 'OLIKA'} · t 9 klampas till ${dT.tier}`, genOk && dT.tier === 3)

// =================================================================== T5 kompisen
const kompisar = VARLDAR.map((_, i) => dnaFromSeed(7, { v: i }).kompis)
arm('T5 matarm    en kompis per varld, alla olika', kompisar.join(' · '), new Set(kompisar).size === VARLDAR.length && kompisar.every((k) => typeof k === 'string' && k.length > 0))

// =================================================================== T6 sparposten
const idx = las('src/games/unika-knytt/index.js')
const start = idx.indexOf('_sparaKnytt(ctx) {')
const kropp = idx.slice(start, idx.indexOf('_byggHylla(ctx) {', start))
const post = kropp.slice(kropp.indexOf('const p = ['), kropp.indexOf(']', kropp.indexOf('const p = [')))
const falt = [...post.matchAll(/this\._(val\.[fzmvrg]|dna\?\.val\.r|tier|fro)\b/g)].map((m) => m[1])
arm('T6 matarm    `_sparaKnytt` skriver tiern pa plats 7', falt.join(' · '), falt.length === 8 && falt[7] === 'tier')
const rensa = idx.slice(idx.indexOf('_rensaPost(post) {'), idx.indexOf('_sparaKnytt(ctx) {'))
const tak = rensa.match(/const tak = \[([^\]]+)\]/)?.[1] || ''
arm('T6b          `_rensaPost` klampar plats 7 mot fyra tier', `tak [${tak.trim()}]`, tak.trim().endsWith(String(TIER.length)))

// =================================================================== T7 replikerna
const fraser = new Set(JSON.parse(las('scripts/voice-phrases.json')))
const REPLIKER = ['Oj, vad det glittrar!', 'Ditt knytt har fått en liten kompis med sig!']
const iIndex = REPLIKER.filter((r) => idx.includes(`'${r}'`))
const iFraser = REPLIKER.filter((r) => fraser.has(r))
arm('T7 matarm    bada replikerna som literaler i index.js', `${iIndex.length}/2`, iIndex.length === 2)
arm('T7b          och i voice-phrases.json', `${iFraser.length}/2`, iFraser.length === 2)

// =================================================================== utskrift
let fel = 0
console.log('\n  unika-knytt — sallsyntheten (docens §3b)\n')
for (const [namn, varde, ok] of rader) {
  if (!ok) fel++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(64)} ${varde}`)
}
console.log(`\n  ${fel === 0 ? '✓ alla armar som vantat' : `✗ ${fel} arm(ar) fel`}\n`)
process.exit(fel === 0 ? 0 : 1)
