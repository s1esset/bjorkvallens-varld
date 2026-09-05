// unika-knytt — UPPLASNINGARNA (ATGARDER U3) i tal, utan webblasare.
//
//   node scripts/_upplasprobe.mjs
//
// Varfor den ar node-only: hela mekanismen ar ren logik i `dna.js` (tak per axel,
// milstolpar, migrering av en gammal sparpost). Det som KRAVER en webblasare — att
// verktyget faktiskt cyklar inom taket och att firandet syns — matas av `_knyttprobe.mjs`
// (armarna U*). Att lagga bada i samma sond hade gjort den langsammaste delen obligatorisk
// for den snabbaste fragan.
//
// ⚠️ Ordningen ar kontrollarm -> matarm, alltid. Tva av armarna har en BARLAST som
// simulerar HEAD (inga milstolpar alls, dvs. hela tabellen upplast fran start); den maste
// FALLA pa samma pastaende, annars mater armen ingenting. Kvallspasset 2026-08-12 kostade
// 77 min pa precis det: fyra matare som var grona utan att mata nagot.
//
// Armar:
//   K0 kontroll  barlast "inga milstolpar"  -> startverkstan ar INTE smalare  (ska falla)
//   K1 kontroll  en gammal sparpost UTAN last del -> migreringen ger bara listans langd
//   U1 matarm    takFor() vaxer exakt EN axel per milstolpe, i ratt ordning
//   U2 matarm    inget tak krymper nagonsin nar n vaxer (0..24)
//   U3 matarm    ingen axel kan vaxa forbi sina egna delar (tak === tabellangd)
//   U4 matarm    migrering: en anvand LAST del lyfter antalet till sin milstolpe
//   U5 matarm    `falt` pekar pa ratt plats i sparposten — last UR index.js `_sparaKnytt`,
//                inte antaget. Byter nagon ordning i posten laser migreringen fel falt.
//   U6 matarm    orort-cyklingen (`(v+1) % tak`) nar aldrig ett last index
//   U7 matarm    varje milstolpe har en replik i index.js OCH den finns i voice-phrases.json
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  MILSTOLPAR, START_TAK, takFor, antalFranPoster,
  FARGER, MONSTER, VARLDAR, STORLEKAR,
} from '../src/games/unika-knytt/dna.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const las = (p) => readFileSync(join(ROOT, p), 'utf8')
const AXLAR = ['farg', 'monster', 'varld', 'storlek']
const TABELL = { farg: FARGER.length, monster: MONSTER.length, varld: VARLDAR.length, storlek: STORLEKAR.length }

const rader = []
const arm = (namn, varde, ok) => rader.push([namn, String(varde), !!ok])

// ---------------------------------------------------------------- barlast = HEAD
// "Som spelet sag ut fore U3": varje axel har hela sin tabell fran forsta bildrutan.
const barlastTak = () => ({ ...TABELL, gnista: 4 })

// =================================================================== K0 kontrollarm
// Pastaendet alla matarmar vilar pa ar att STARTVERKSTAN ar smalare an tabellerna. Pa
// barlasten ar den det inte — faller den inte har, mater ingen av de andra armarna nagot.
const smalare = (t) => AXLAR.some((a) => t[a] < TABELL[a])
arm('K0 kontroll  barlast (HEAD) ar INTE smalare', AXLAR.map((a) => `${a} ${barlastTak()[a]}/${TABELL[a]}`).join(' · '), !smalare(barlastTak()))

// =================================================================== U1
const t0 = takFor(0)
arm('U1 matarm    startverkstan ar smalare', AXLAR.map((a) => `${a} ${t0[a]}/${TABELL[a]}`).join(' · '), smalare(t0))

let ordningOk = true
const steg = []
for (const m of MILSTOLPAR) {
  const fore = takFor(m.vid - 1)
  const efter = takFor(m.vid)
  const vaxte = AXLAR.filter((a) => efter[a] > fore[a])
  steg.push(`${m.vid}:${vaxte.join('+') || '-'}`)
  if (vaxte.length !== 1 || vaxte[0] !== m.axel) ordningOk = false
  if (efter[m.axel] !== m.tak) ordningOk = false
}
arm('U1b          exakt EN axel per milstolpe', steg.join(' · '), ordningOk)

// =================================================================== U2 monotoni
let krymper = ''
for (let n = 1; n <= 28; n++) {
  const a = takFor(n - 1)
  const b = takFor(n)
  for (const ax of AXLAR) if (b[ax] < a[ax]) krymper = `${ax} vid ${n}`
}
arm('U2 matarm    inget tak krymper (n 0..28)', krymper || 'inget', !krymper)

// =================================================================== U3 tak = tabell
const overTak = AXLAR.filter((a) => takFor(999)[a] !== TABELL[a])
arm('U3 matarm    full verkstad === tabellerna', AXLAR.map((a) => `${a} ${takFor(999)[a]}`).join(' · '), overTak.length === 0)

// =================================================================== K1 + U4 migrering
// Sparposten: [fro, f, z, m, v, r, g, 0].
const post = (f = 0, z = 0, m = 0, v = 0) => [123, f, z, m, v, 0, 0, 0]
const oskyldig = [post(7, 2, 3, 2), post(0, 0, 0, 0)] // hogsta TILLATNA index i startverkstan
arm('K1 kontroll  gammal post utan last del', `antal ${antalFranPoster(oskyldig)} (listans langd 2)`, antalFranPoster(oskyldig) === 2)

const fall = [
  ['farg 9 (rosa/sand)', [post(9, 0, 0, 0)], 4],
  ['monster 5 (stjarnor)', [post(0, 0, 5, 0)], 8],
  ['varld 3 (stjarnnatten)', [post(0, 0, 0, 3)], 12],
  ['storlek 3 (storsta)', [post(0, 3, 0, 0)], 16],
  ['varld 4 (oknen)', [post(0, 0, 0, 4)], 20],
  ['varld 5 (grottan)', [post(0, 0, 0, 5)], 24],
  ['grottknytt lyfter forbi alla tre varldsmilstolpar', [post(0, 0, 0, 5), post(0, 0, 0, 0)], 24],
  ['tre poster, hogsta vinner', [post(9, 0, 0, 0), post(0, 0, 0, 3), post(0, 0, 0, 0)], 12],
]
let migOk = true
const migTal = []
for (const [namn, lista, vantat] of fall) {
  const n = antalFranPoster(lista)
  migTal.push(`${namn}→${n}`)
  if (n !== vantat) migOk = false
  // ...och det som verkligen betyder nagot: taket efter migreringen MASTE rymma posten.
  for (const p of lista) {
    const t = takFor(n)
    if (p[1] >= t.farg || p[2] >= t.storlek || p[3] >= t.monster || p[4] >= t.varld) migOk = false
  }
}
arm('U4 matarm    anvand last del lyfter antalet', migTal.join(' · '), migOk)

// =================================================================== U5 faltordningen
// Migreringen laser sparpostens falt via `MILSTOLPAR[].falt`. Byter nagon ordning i
// `_sparaKnytt` laser den tyst fel tal — och en tyst fel migrering ger en verkstad dar en
// varld barnet anvant plotsligt saknas. Ordningen las darfor UR koden.
const idx = las('src/games/unika-knytt/index.js')
// `_byggHylla(` forekommer FORST som anrop i init(), langt fore `_sparaKnytt` — en slice
// mellan dem blev tom och armen rapporterade `undefined` mot alla fyra falt. Sok slutet
// FRAN metodens borjan. (Sondens fel, inte kodens: precis den ordningsfallan CLAUDE.md
// varnar for — las alltid ut vad ett tomt matvarde betyder.)
const start = idx.indexOf('_sparaKnytt(ctx) {')
const kropp = idx.slice(start, idx.indexOf('_byggHylla(ctx) {', start))
const ordning = [...kropp.matchAll(/this\._val\.([fzmvrg])\b/g)].map((m) => m[1])
// Plats 0 ar frot, sedan kommer `_val`-faltena i den ordning de skrivs.
const plats = {}
ordning.forEach((bok, i) => { if (!(bok in plats)) plats[bok] = i + 1 })
const vantad = { farg: plats.f, monster: plats.m, varld: plats.v, storlek: plats.z }
const faltOk = MILSTOLPAR.every((m) => m.falt === vantad[m.axel])
arm('U5 matarm    `falt` matchar _sparaKnytt', MILSTOLPAR.map((m) => `${m.axel} ${m.falt}/${vantad[m.axel]}`).join(' · '), faltOk)

// =================================================================== U6 cyklingen
// `_aterstall` cyklar f/m/v ett steg nar barnet inte rort nagon del. Gar den mot TABELLEN
// i stallet for mot taket pekar receptet pa en last del — och kupan hade visat en varld
// verkstaden inte kan bygga.
let utanfor = ''
for (const n of [0, 4, 8, 12, 16, 20, 24]) {
  const t = takFor(n)
  const val = { f: 0, m: 0, v: 0 }
  for (let i = 0; i < 200; i++) {
    val.f = (val.f + 1) % t.farg
    val.m = (val.m + 1) % t.monster
    val.v = (val.v + 1) % t.varld
    if (val.f >= t.farg || val.m >= t.monster || val.v >= t.varld) utanfor = `n=${n} varv ${i}`
  }
}
arm('U6 matarm    cyklingen halls innanfor taket', utanfor || '200 varv × 7 nivaer, allt innanfor', !utanfor)

// =================================================================== U7 replikerna
// Replikerna bor i index.js (check.mjs laser bara den filen) medan milstolparna bor i
// dna.js. Den delningen ar medveten, men den maste MATAS — annars ar den precis den
// glidning som gjorde hornet `krona` onabart.
const rMatch = idx.slice(idx.indexOf('const UPPLAS_REPLIK'), idx.indexOf('const HINT_S'))
const repliker = Object.fromEntries([...rMatch.matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]))
const fraser = new Set(JSON.parse(las('scripts/voice-phrases.json')))
// Nyckeln ar milstolpens  sedan steg 4 (varlden vaxer i tre milstolpar).
const saknas = MILSTOLPAR.filter((m) => !repliker[m.vid])
const utanFras = MILSTOLPAR.filter((m) => repliker[m.vid] && !fraser.has(repliker[m.vid]))
arm('U7 matarm    varje milstolpe har en replik', `${Object.keys(repliker).length} repliker, ${saknas.length} saknas`, saknas.length === 0)
arm('U7b          varje replik finns i voice-phrases', utanFras.length ? utanFras.map((m) => m.vid).join(',') : 'alla ' + MILSTOLPAR.length, utanFras.length === 0)

// =================================================================== utskrift
let fel = 0
console.log('\n  unika-knytt — upplasningarna (ATGARDER U3)\n')
for (const [namn, varde, ok] of rader) {
  if (!ok) fel++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(42)} ${varde}`)
}
console.log(`\n  ${fel === 0 ? '✓ alla armar som vantat' : `✗ ${fel} arm(ar) fel`}\n`)
process.exit(fel === 0 ? 0 : 1)
