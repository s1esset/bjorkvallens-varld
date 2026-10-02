// LANDA-SOND (FYSIKPLAN P4, B2) — landar saker med rätt tyngd, på EXAKT marken, och ger alltid loss?
//
//   node scripts/_landaprobe.mjs        (ingen webbläsare, < 1 s)
//
// Kontrollarmar först (annars säger inget tal något):
//   · samma tyngd två gånger → IDENTISKA kurvor (sonden är deterministisk)
//   · studs 0 → exakt ETT nedslag och inget hopp; fallet följer sqrt(2h/g) (analytiskt känt svar)
// Mätarmar: slutläge = markY (± 0,5) för båda tyngder · stor studsar lägre än liten · avbryt() mitt i
// → på marken samma steg · destroy() mitt i / med död nod · klar resolvas alltid · ingen lyssnare kvar ·
// samma kurva vid 30/45/60/90 Hz (Takt).
import { landa, skapaLandning, LANDA_STEG_MS } from '../src/lib/landa.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const R = (v) => Math.round(v * 100) / 100

// Falsk nod/ticker — landa() rör bara .y och .destroyed resp. add/remove.
const nod = () => ({ y: 0, destroyed: false })
const fakeTicker = () => {
  const lyss = new Set()
  return {
    lyss,
    add: (f) => lyss.add(f),
    remove: (f) => lyss.delete(f),
    kor(ms) {
      for (const f of [...lyss]) f({ deltaMS: ms })
    },
  }
}

// Kör den rena stegaren hela vägen; returnerar kurva + slagfarter.
function kurva(opt, maxSteg = 2000) {
  const s = skapaLandning(opt)
  const y = [s.y]
  const slag = []
  let n = 0
  while (!s.steg((nr, fart) => slag.push({ nr, steg: n, fart })) && n < maxSteg) {
    y.push(s.y)
    n++
  }
  y.push(s.y)
  return { y, slag, steg: n, slut: s.y, klar: s.klar }
}
const lika = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
// Högsta hoppet efter första nedslaget: marken minus minsta y efter steg för första slaget.
const hopp = (k, markY) => {
  const i0 = k.slag[0]?.steg ?? 0
  return markY - Math.min(...k.y.slice(i0 + 1))
}

const MARK = 0
const FRAN = -400

console.log('KONTROLLARMAR')
{
  const a = kurva({ fran: FRAN, markY: MARK, tyngd: 'liten' })
  const b = kurva({ fran: FRAN, markY: MARK, tyngd: 'liten' })
  ok('samma tyngd två gånger → identiska kurvor', lika(a.y, b.y) && a.slag.length === b.slag.length, `${a.y.length} punkter`)

  const z = kurva({ fran: FRAN, markY: MARK, studs: 0 })
  ok('studs 0 → exakt ett nedslag, inget hopp', z.slag.length === 1 && hopp(z, MARK) < 0.01, `slag ${z.slag.length}`)
  const tFall = (z.slag[0].steg * LANDA_STEG_MS) / 1000
  const tTeori = Math.sqrt((2 * 400) / 3000)
  ok('fallet följer sqrt(2h/g)', Math.abs(tFall - tTeori) < 0.03, `${R(tFall)} s mot ${R(tTeori)} s`)
  const e = kurva({ fran: FRAN, markY: MARK, studs: 0.5 })
  ok('kontroll: studs 0,5 > 1 slag (talet RÖR SIG mellan två kända lägen)', e.slag.length > z.slag.length, `${e.slag.length} slag`)
}

console.log('MÄTARM — slutläge och tyngd')
for (const hojd of [150, 400, 900]) {
  for (const markY of [0, 340, -50]) {
    const fran = markY - hojd
    const s = kurva({ fran, markY, tyngd: 'stor' })
    const l = kurva({ fran, markY, tyngd: 'liten' })
    ok(`höjd ${hojd}, markY ${markY}: slutläge = markY (båda)`, Math.abs(s.slut - markY) <= 0.5 && Math.abs(l.slut - markY) <= 0.5 && s.klar && l.klar, `stor ${R(s.slut)} · liten ${R(l.slut)}`)
  }
}
{
  const s = kurva({ fran: FRAN, markY: MARK, tyngd: 'stor' })
  const l = kurva({ fran: FRAN, markY: MARK, tyngd: 'liten' })
  const hs = hopp(s, MARK)
  const hl = hopp(l, MARK)
  ok('stor studsar lägre än liten', hs < hl, `stor ${R(hs)} px · liten ${R(hl)} px`)
  ok('stor = duns (≤ 2 slag), liten = studs (≥ 3 slag)', s.slag.length <= 2 && l.slag.length >= 3, `stor ${s.slag.length} · liten ${l.slag.length}`)
  ok('hoppen avtar (liten)', l.slag.every((x, i) => i === 0 || x.fart < l.slag[i - 1].fart), l.slag.map((x) => Math.round(x.fart)).join(' > '))
  ok('aldrig under marken', Math.max(...s.y, ...l.y) <= MARK + 1e-9)
  const f = kurva({ fran: FRAN, markY: MARK, tyngd: 'liten', fordrojning: 500 })
  ok('fördröjning 500 ms ≈ 30 steg senare', Math.abs(f.slag[0].steg - l.slag[0].steg - 30) <= 1, `${f.slag[0].steg - l.slag[0].steg} steg`)
  const redan = kurva({ fran: 20, markY: MARK })
  ok('fran under marken → står direkt på markY, inget slag', redan.slut === MARK && redan.slag.length === 0)
}

console.log('MÄTARM — landa() med nod och ticker')
{
  // Samma kurva vid olika bildfrekvens (fast steg via Takt): nodens y vid samma simulerade tid.
  const ref = []
  for (const hz of [60, 30, 45, 90, 57.3]) {
    const n = nod()
    const t = fakeTicker()
    const l = landa(n, { ticker: t, fran: FRAN, markY: MARK, tyngd: 'liten' })
    let hamtad = null
    const d = (1000 / hz) * (1 + 1e-6) // hårsmån över: flyttalssumman får inte landa ETT steg under 400 ms
    const sampla = Math.round((400 * hz) / 1000) // bildruta nr vid 400 ms (heltal vid 30/45/60/90 Hz)
    for (let i = 1; i <= 4000 && l.ar; i++) {
      t.kor(d)
      if (i === sampla) hamtad = n.y
    }
    ref.push({ hz, hamtad, slut: n.y, lyssnare: t.lyss.size })
  }
  const slutOk = ref.every((r) => r.slut === MARK)
  ok('slutläge exakt markY och lyssnare 0 vid 30–90 Hz', slutOk && ref.every((r) => r.lyssnare === 0), ref.map((r) => `${r.hz}Hz:${r.slut}/${r.lyssnare}`).join(' '))
  const mellan = Math.max(...ref.slice(0, 4).map((r) => r.hamtad)) - Math.min(...ref.slice(0, 4).map((r) => r.hamtad))
  ok('samma kurva vid 30/45/60/90 Hz (y vid 400 ms)', mellan < 1, `spann ${R(mellan)} px`)

  // onLand per nedslag, och noden står stilla efteråt.
  const n = nod()
  const t = fakeTicker()
  const slag = []
  const l = landa(n, { ticker: t, fran: FRAN, markY: MARK, tyngd: 'liten', onLand: (ty, s) => slag.push([ty, s.nr]) })
  let lost = false
  l.klar.then(() => (lost = true))
  ok('noden står på fran direkt', n.y === FRAN)
  while (l.ar) t.kor(1000 / 60)
  ok('onLand per nedslag, i ordning', slag.length >= 3 && slag.every((s, i) => s[0] === 'liten' && s[1] === i), `${slag.length} slag`)
  const ySkriven = n.y
  n.y = 123 // kunden flyttar noden efter landningen — libbet får inte skriva över
  t.kor(1000 / 60)
  ok('libbet skriver inte noden efter landningen', n.y === 123 && ySkriven === MARK && t.lyss.size === 0)
  await Promise.resolve()
  ok('klar resolvas vid landning', lost)

  // avbryt() mitt i fallet.
  const n2 = nod()
  const t2 = fakeTicker()
  let onLand2 = 0
  const l2 = landa(n2, { ticker: t2, fran: FRAN, markY: MARK, onLand: () => onLand2++ })
  for (let i = 0; i < 10; i++) t2.kor(1000 / 60)
  const mitt = n2.y
  let r2
  l2.klar.then((v) => (r2 = v))
  l2.avbryt()
  ok('avbryt() → på marken samma steg', mitt < MARK && n2.y === MARK, `före ${R(mitt)} → ${n2.y}`)
  ok('avbryt(): lyssnare borta, onLand ej anropad', t2.lyss.size === 0 && onLand2 === 0)
  t2.kor(1000 / 60)
  l2.avbryt()
  await Promise.resolve()
  ok('avbryt(): klar = "avbruten", idempotent, noden orörd efteråt', r2 === 'avbruten' && n2.y === MARK)

  // avbryt() under fördröjningen (föremålet hänger ännu på fran).
  const n3 = nod()
  const t3 = fakeTicker()
  const l3 = landa(n3, { ticker: t3, fran: FRAN, markY: MARK, fordrojning: 800 })
  t3.kor(1000 / 60)
  l3.avbryt()
  ok('avbryt() under fördröjningen → på marken', n3.y === MARK && t3.lyss.size === 0)

  // destroy() mitt i fallet, levande nod → läggs på marken.
  const n4 = nod()
  const t4 = fakeTicker()
  const l4 = landa(n4, { ticker: t4, fran: FRAN, markY: MARK })
  for (let i = 0; i < 8; i++) t4.kor(1000 / 60)
  let r4
  l4.klar.then((v) => (r4 = v))
  l4.destroy()
  await Promise.resolve()
  ok('destroy() med levande nod → på marken, klar = "riven"', n4.y === MARK && r4 === 'riven' && t4.lyss.size === 0)

  // destroy() med död nod, och nod som dör under fallet (spelet rev den) → ingen kast, klar resolvas.
  const n5 = nod()
  const t5 = fakeTicker()
  const l5 = landa(n5, { ticker: t5, fran: FRAN, markY: MARK })
  for (let i = 0; i < 5; i++) t5.kor(1000 / 60)
  n5.destroyed = true
  n5.y = null // Pixi nollar transformen på en riven nod
  let r5
  l5.klar.then((v) => (r5 = v))
  let kast = false
  try {
    t5.kor(1000 / 60)
    l5.destroy()
  } catch {
    kast = true
  }
  await Promise.resolve()
  ok('riven nod: inget kast, inget skrivet, lyssnare borta, klar resolvad', !kast && n5.y === null && r5 === 'riven' && t5.lyss.size === 0)

  // utan ticker: kunden driver själv med tick(); markY utelämnad = nodens y.
  const n6 = Object.assign(nod(), { y: 250 })
  const l6 = landa(n6, { fran: 50 })
  while (l6.ar) l6.tick(1000 / 60)
  ok('utan ticker: tick() driver, markY = nodens y vid anrop', n6.y === 250)
}

console.log(fel ? `\n${fel} FEL` : '\nALLA GRÖNA')
process.exit(fel ? 1 : 0)
