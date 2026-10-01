// Node-test för src/lib/variation.js (U1). Ingen webbläsare.
//   node scripts/_variationtest.mjs
// Kontrollarmen FÖRST: en naiv randomFrom upprepar ~1/n (talet ska synas och röra sig med n).
// Först när den visar det kända svaret läses mätarmarna (nastaVariant, pase, slumpIBand, rundprofil).
import { nastaVariant, pase, slumpIBand, rundprofil } from '../src/lib/variation.js'

const N = 10000
let fel = 0
const kolla = (ok, text) => {
  if (!ok) fel++
  console.log(`${ok ? 'OK  ' : 'FEL '} ${text}`)
}
const lista = (n) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i }))
const naiv = (l) => l[Math.floor(Math.random() * l.length)]

// ── 0. KONTROLLARM: naiv randomFrom upprepar ~1/n ────────────────────────────────────────
console.log('— kontrollarm: naiv randomFrom —')
const naivTal = {}
for (const n of [2, 3, 4, 6, 10]) {
  const l = lista(n)
  let rep = 0
  let f = null
  for (let i = 0; i < N; i++) {
    const v = naiv(l)
    if (v === f) rep++
    f = v
  }
  naivTal[n] = rep / N
  const vantat = 1 / n
  kolla(Math.abs(rep / N - vantat) < 0.02, `naiv n=${n}: upprepar ${(100 * rep / N).toFixed(1)} % (väntat ${(100 * vantat).toFixed(1)} %)`)
}
kolla(naivTal[2] > naivTal[4] && naivTal[4] > naivTal[10], 'kontrollarmens tal RÖR SIG med n (2 > 4 > 10)')

// ── 1. nastaVariant: aldrig samma två i rad ──────────────────────────────────────────────
console.log('— nastaVariant —')
for (const n of [2, 3, 6]) {
  const l = lista(n)
  let rep = 0
  const sett = new Set()
  let f
  for (let i = 0; i < N; i++) {
    const v = nastaVariant(l, f?.id)
    if (f && v.id === f.id) rep++
    sett.add(v.id)
    f = v
  }
  kolla(rep === 0 && sett.size === n, `nastaVariant n=${n}: ${rep} upprepningar på ${N}, ${sett.size}/${n} poster nådda`)
}
{
  let rep = 0
  let f
  for (let i = 0; i < N; i++) {
    const v = nastaVariant([2, 3, 4, 5], f)
    if (v === f) rep++
    f = v
  }
  kolla(rep === 0, `nastaVariant på rena tal: ${rep} upprepningar`)
}
kolla(nastaVariant([{ id: 'a' }], 'a').id === 'a', 'nastaVariant: enpostslista ger posten (ingen annan finns)')
kolla(nastaVariant([{ id: 'a' }, { id: 'b' }], { id: 'a' }).id === 'b', 'nastaVariant: forra som POST fungerar också')

// ── 2. pase: varje post exakt en gång per varv, aldrig samma två i rad över gränsen ──────
console.log('— pase —')
for (const n of [2, 3, 5, 8]) {
  const l = lista(n)
  const p = pase(l)
  let rep = 0
  let varvFel = 0
  let f
  const alla = []
  for (let i = 0; i < N; i++) {
    const v = p.nasta()
    if (f && v.id === f.id) rep++
    f = v
    alla.push(v.id)
  }
  const hela = Math.floor(N / n)
  for (let v = 0; v < hela; v++) {
    const bit = alla.slice(v * n, (v + 1) * n)
    if (new Set(bit).size !== n) varvFel++
  }
  kolla(rep === 0 && varvFel === 0, `pase n=${n}: ${rep} upprepningar, ${varvFel} av ${hela} varv ej exakt en gång vardera, ${p.varv} varv`)
}
{
  // forra: första dragningen får inte vara förra
  let brott = 0
  for (let i = 0; i < 2000; i++) {
    if (pase(lista(3), 'p1').nasta().id === 'p1') brott++
  }
  kolla(brott === 0, `pase(lista, forra): första dragningen aldrig forra (${brott} brott på 2000)`)
  // listan du skickade in rörs inte; en enpostspåse ger bara den
  const l = lista(4)
  const kopia = JSON.stringify(l)
  const p = pase(l)
  for (let i = 0; i < 9; i++) p.nasta()
  kolla(JSON.stringify(l) === kopia, 'pase: inskickad lista orörd')
  kolla(pase([7]).nasta() === 7, 'pase: enpostslista ger posten')
  kolla(pase([]).nasta() === undefined, 'pase: tom lista ger undefined')
  // .kvar räknar ner
  const q = pase(lista(4))
  q.nasta()
  kolla(q.kvar === 3, `pase: .kvar efter en dragning = ${q.kvar} (väntat 3)`)
  // Jämn fördelning av varvets FÖRSTA post (blandningen är inte skev)
  const forst = {}
  for (let i = 0; i < 20000; i++) {
    const id = pase(lista(4)).nasta().id
    forst[id] = (forst[id] || 0) + 1
  }
  const snett = Math.max(...Object.values(forst)) / Math.min(...Object.values(forst))
  kolla(snett < 1.15, `pase: första postens fördelning över 4 poster ${JSON.stringify(forst)} (max/min ${snett.toFixed(2)})`)
}

// ── 3. slumpIBand: håller sig i bandet, jämnt, och kanterna nås ──────────────────────────
console.log('— slumpIBand —')
{
  const mn = (a) => Math.min(...a)
  const mx = (a) => Math.max(...a)
  const dra = (f) => Array.from({ length: N }, f)

  let a = dra(() => slumpIBand(400, 60))
  kolla(mn(a) >= 340 && mx(a) <= 460 && mn(a) < 342 && mx(a) > 458, `±60 runt 400: ${mn(a).toFixed(1)}..${mx(a).toFixed(1)} (band 340..460, båda ändar nås)`)

  a = dra(() => slumpIBand(400, { min: -40, max: 80 }))
  kolla(mn(a) >= 360 && mx(a) <= 480 && mn(a) < 362 && mx(a) > 478, `{min:-40,max:80}: ${mn(a).toFixed(1)}..${mx(a).toFixed(1)} (band 360..480)`)

  a = dra(() => slumpIBand(3, 1, { heltal: true }))
  const raknat = {}
  for (const v of a) raknat[v] = (raknat[v] || 0) + 1
  const heltalOk = a.every(Number.isInteger) && Object.keys(raknat).join() === '2,3,4'
  const lika = Math.max(...Object.values(raknat)) / Math.min(...Object.values(raknat))
  kolla(heltalOk && lika < 1.15, `heltal 3±1: ${JSON.stringify(raknat)} (lika chans, max/min ${lika.toFixed(2)})`)

  a = dra(() => slumpIBand(400, 60, { steg: 20 }))
  kolla(a.every((v) => v >= 340 && v <= 460 && Math.abs((v - 340) / 20 - Math.round((v - 340) / 20)) < 1e-9)
    && new Set(a).size === 7, `steg 20: ${new Set(a).size} rutnätspunkter i 340..460 (väntat 7)`)

  a = dra(() => slumpIBand(150, 200, { golv: 140, tak: 1140 }))
  kolla(mn(a) >= 140 && mx(a) <= 350, `golv 140: ${mn(a).toFixed(1)}..${mx(a).toFixed(1)} (band 140..350, ingen kantklump)`)
  const vid = a.filter((v) => v < 145).length / N
  kolla(vid < 0.05, `golvet klipper bandet FÖRE dragningen: ${(100 * vid).toFixed(1)} % inom 5 px av golvet (väntat ~2,4 %, en klämning vore ~24 %)`)

  a = dra(() => slumpIBand(2000, 50, { tak: 1140 }))
  kolla(a.every((v) => v === 1140), 'bandet helt utanför taket: klämms till taket')

  let rep = 0
  let f
  for (let i = 0; i < N; i++) {
    const v = slumpIBand(3, 1, { heltal: true, forra: f })
    if (v === f) rep++
    f = v
  }
  kolla(rep === 0, `heltal med forra: ${rep} upprepningar`)
  f = undefined
  rep = 0
  for (let i = 0; i < N; i++) {
    const v = slumpIBand(400, 60, { steg: 20, forra: f })
    if (v === f) rep++
    f = v
  }
  kolla(rep === 0, `steg med forra: ${rep} upprepningar`)
  kolla(slumpIBand(5, 0, { heltal: true }) === 5, 'spann 0 ger mitt')
  kolla(slumpIBand(5, 0.2, { heltal: true }) === 5, 'heltal i ett band utan heltalspunkt utom mitt ger mitt')
}

// ── 4. rundprofil ────────────────────────────────────────────────────────────────────────
console.log('— rundprofil —')
{
  let p
  let sidFel = 0
  let narFel = 0
  let utanforFel = 0
  let minD = 1
  const bucket = [0, 0, 0, 0]
  for (let i = 0; i < N; i++) {
    const q = rundprofil(i, p)
    if (p) {
      if (q.sida === p.sida) sidFel++
      for (const k of ['a', 'b', 'c']) {
        const d = Math.abs(q[k] - p[k])
        minD = Math.min(minD, d)
        if (d < 0.25 - 1e-9) narFel++
      }
    }
    for (const k of ['a', 'b', 'c']) if (!(q[k] >= 0 && q[k] < 1)) utanforFel++
    bucket[Math.floor(q.a * 4)]++
    p = q
  }
  kolla(sidFel === 0, `sida byter sida varje runda: ${sidFel} fel`)
  kolla(narFel === 0 && minD >= 0.25 - 1e-9, `a/b/c minst 0,25 från förra: minsta avstånd ${minD.toFixed(3)}`)
  kolla(utanforFel === 0, `a/b/c i 0..1: ${utanforFel} utanför`)
  // Kedjan med 0,25-spärr gynnar kanterna (stationärt ~1,33 max/min) — frågan är bara att
  // ingen fjärdedel svälts: varje fjärdedel ≥ 18 % av dragningarna (jämnt = 25 %).
  const minAndel = Math.min(...bucket) / bucket.reduce((s, b) => s + b, 0)
  kolla(minAndel >= 0.18, `a täcker hela 0..1 (fjärdedelar ${bucket.join('/')}, minsta ${(minAndel * 100).toFixed(1)} %)`)
  const ensam = rundprofil(0)
  kolla(ensam.fro === 0 && (ensam.sida === 1 || ensam.sida === -1), 'första profilen (utan forra) giltig')
}

console.log(fel ? `\n${fel} FEL` : '\nalla OK')
process.exit(fel ? 1 : 0)
