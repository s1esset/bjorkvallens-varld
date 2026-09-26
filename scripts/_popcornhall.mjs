// HÄLLSOND — popcornkalaset med EN gest: bär kärlet dit (var man än tar i det), tryck nedåt
// över målet så lutar det. Rena tal + matter, samma `Karl` och samma hyllor (`fysik.js`) som
// spelet, samma rum (bänk, bord, tre skålar, väggar). Ingen webbläsare.
//
//   node scripts/_popcornhall.mjs [--n 16] [--golv]
//
// Ägarens rapport 2026-09-26: "jättesvår att styra / hälla … fastnar, spiller, vägrar luta
// ibland". Webbläsarsonden `_popcornnaiv` hittade orsakerna i den gamla styrningen; den här
// mäter att varje nybörjargrepp nu häller i skålen och att kontrollarmarna INTE häller.
//
// Kontrollarmar FÖRST (de ska ge ~0 % ut — skiljer mätaren inte dem från hällningen säger den
// ingenting): håll still över skålen · bär vågrätt i spishöjd in över skålen · bär i bygeln.
import { PhysicsWorld } from '../src/lib/physics.js'
import { Karl } from '../src/games/popcornkalaset/karl.js'
import { GRYTA, PASE, SKAL, SPIS, BANK, BORD, GOLV, POPCORN, KORN } from '../src/games/popcornkalaset/matt.js'
import { byggSkal, iSkal, grytHylla, paseHylla } from '../src/games/popcornkalaset/fysik.js'

const arg = process.argv.slice(2)
const N = Number(arg.includes('--n') ? arg[arg.indexOf('--n') + 1] : 16)
let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }
const pct = (v) => `${Math.round(v * 100)} %`

const GRYTA_HEM = { x: SPIS.x, y: SPIS.yta - GRYTA.golv - GRYTA.djup }
const PASE_HEM = { x: PASE.x, y: BANK.yta - PASE.golv - PASE.djup }

// Spelets rum. `innehall`: 'pop' = N popcorn i grytan, 'korn' = 32 korn i påsen.
function rum(innehall = 'pop') {
  const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: -400, right: 1280, bottom: GOLV } })
  phys.rectangle((BANK.x0 + BANK.x1) / 2, BANK.yta + 20, BANK.x1 - BANK.x0, 40, { isStatic: true, label: 'bank' })
  phys.rectangle((BORD.x0 + BORD.x1) / 2, BORD.yta + BORD.tjock / 2, BORD.x1 - BORD.x0, BORD.tjock, { isStatic: true, label: 'bord' })
  for (const s of SKAL) byggSkal(phys, s)
  // FORE=… i miljön prövar en annan hällpunkt (svep).
  const gryta = new Karl(phys, { ...GRYTA_HEM, ...GRYTA, label: 'gryta', grupp: -7, ...(process.env.FORE ? { vippaFore: Number(process.env.FORE) } : {}) })
  const pase = new Karl(phys, { ...PASE_HEM, ...PASE, label: 'pase', grupp: -7 })
  gryta.hylla = (x) => grytHylla(gryta, x)
  pase.hylla = (x) => paseHylla(pase, gryta, x)
  gryta.rum = pase.rum = { x0: 0, x1: 1280 }
  const kroppar = []
  if (innehall === 'pop') {
    for (let i = 0; i < N; i++) {
      const c = i % 6
      const r = Math.floor(i / 6)
      const p = gryta.varld((c - 2.5) * 26, GRYTA.djup - POPCORN.r - 2 - r * (POPCORN.r * 2 + 1))
      kroppar.push(phys.polygon(p.x, p.y, 7, POPCORN.r, { ...POPCORN.kropp, label: 'popcorn' }))
    }
  } else {
    for (let i = 0; i < 32; i++) {
      const ly = PASE.djup - 8 - (i % 6) * 9 - Math.floor(i / 6) * 2
      const lx = (((i * 37) % 11) / 10 - 0.5) * (pase.innerHalv(ly) * 2 - 14)
      const p = pase.varld(lx, ly)
      kroppar.push(phys.circle(p.x, p.y, KORN.r, { ...KORN.kropp, label: 'korn' }))
    }
  }
  gryta.innehall = kroppar
  pase.innehall = kroppar
  phys.beforeStep(() => { gryta.steg(); pase.steg() })
  const w = { phys, gryta, pase, kroppar, maxV: 0 }
  stega(w, 90)
  return w
}
function stega(w, n, varje) {
  for (let i = 0; i < n; i++) {
    varje?.(i)
    w.phys.update(1000 / 60)
    w.maxV = Math.max(w.maxV, Math.abs(w.gryta.vinkel), Math.abs(w.pase.vinkel))
  }
}
// Fingret från A till B med `fart` px/steg (ett barns drag), sedan kvar.
function drag(w, karl, a, b, fart = 10) {
  const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / fart))
  stega(w, n, (i) => karl.dra(a.x + ((b.x - a.x) * (i + 1)) / n, a.y + ((b.y - a.y) * (i + 1)) / n))
  return b
}
// Släpp som spelet gör (index.js `_upp`): häller den → hänger kvar över målet; annars över en
// skål → parkera där; annars hem.
function slapp(w, karl) {
  if (karl.lage === 'vippa') return karl.slappVippa()
  const m = karl.varld(0, 0)
  if (karl === w.gryta) {
    const s = SKAL.findIndex((sk) => Math.abs(m.x - sk.x) < sk.kantB / 2 + 50 && m.y < sk.kant)
    if (s >= 0) karl.parkera(SKAL[s].x, grytHylla(karl, SKAL[s].x).y)
    else karl.parkera(GRYTA_HEM.x, karl.parkHojd(SPIS.yta) - 4)
  } else {
    const h = paseHylla(karl, w.gryta, m.x)
    if (h.mal) karl.parkera(h.mal.x, h.y)
    else karl.parkera(PASE_HEM.x, karl.parkHojd(BANK.yta) - 4)
  }
}

function rakna(w, mal) {
  const r = { mal: 0, kvar: 0, annan: 0, spill: 0 }
  for (const b of w.kroppar) {
    const { x, y } = b.position
    if (w.gryta.inuti(x, y, 24) && mal !== 'gryta') r.kvar++
    else if (w.pase.inuti(x, y, 12)) r.kvar++
    else if (mal === 'gryta' && w.gryta.inuti(x, y, 24)) r.mal++
    else if (typeof mal === 'number' && iSkal(SKAL[mal], x, y)) r.mal++
    else if (SKAL.some((s) => iSkal(s, x, y))) r.annan++
    else {
      r.spill++
      if (arg.includes('--golv')) console.log(`      spill: ${Math.round(x)},${Math.round(y)}`)
    }
  }
  const n = w.kroppar.length
  return { mal: r.mal / n, kvar: r.kvar / n, annan: r.annan / n, spill: r.spill / n }
}
// Var det hällda landade: x mot målets mitt, i HÄLLRIKTNINGEN (+ = förbi mitten, bort från pipen).
function landning(w, mx) {
  const d = w.kroppar.filter((b) => !w.gryta.inuti(b.position.x, b.position.y, 24)).map((b) => Math.round((b.position.x - mx) * (w.gryta._sida || 1))).sort((a, b) => a - b)
  if (!d.length) return ''
  const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))]
  return ` · landar ${q(0.5) >= 0 ? '+' : ''}${q(0.5)} px (${q(0.1)}…${q(0.9)})`
}
const rad = (r) => `mål ${pct(r.mal).padStart(5)} · kvar ${pct(r.kvar).padStart(5)} · annan skål ${pct(r.annan).padStart(4)} · spill ${pct(r.spill).padStart(4)}`

console.log(`\nHÄLLSOND — popcornkalaset, en gest (${N} popcorn)\n`)
const ytter = GRYTA.bredd / 2 + GRYTA.vagg
const GREPP = [
  ['bygeln', 0, -GRYTA.bygel],
  ['höger sida', ytter, 20],
  ['vänster sida', -ytter, 20],
  ['botten', 0, GRYTA.djup + 8],
]

// K — kontrollarmar
{
  // K1: håll still över skål 1 i 3 s (bär dit, fingret stilla ovanför hyllan).
  const w = rum()
  const a = w.gryta.varld(0, -GRYTA.bygel)
  w.gryta.greppa(a.x, a.y)
  const hy = grytHylla(w.gryta, SKAL[1].x).y
  drag(w, w.gryta, a, { x: SKAL[1].x, y: hy - 30 })
  stega(w, 180)
  const r = rakna(w, 1)
  console.log(`K1 håll still över skål 1:           ${rad(r)} · max ${Math.round(w.maxV * 57.3)}°`)
  ok('K1 att hålla still häller inte', r.kvar >= 0.9, `kvar ${pct(r.kvar)}`)
}
for (const s of [0, 1, 2]) {
  // K2: bär vågrätt i SPISHÖJD (lägre än hyllan) in över skålen — lyfts upp, lutar inte.
  const w = rum()
  const a = w.gryta.varld(0, -GRYTA.bygel)
  w.gryta.greppa(a.x, a.y)
  drag(w, w.gryta, a, { x: SKAL[s].x, y: a.y })
  stega(w, 120)
  const r = rakna(w, s)
  console.log(`K2 vågrätt i spishöjd in över skål ${s}: ${rad(r)} · max ${Math.round(w.maxV * 57.3)}° · ${w.gryta.lage}`)
  ok(`K2 skål ${s}: att bära in över skålen underifrån häller inte`, r.kvar >= 0.9, `kvar ${pct(r.kvar)}`)
}
for (const fart of [8, 17, 30]) {
  // K3: bär i bygeln i 500 / 1000 / 1800 px/s och släpp över skål 0.
  const w = rum()
  const a = w.gryta.varld(0, -GRYTA.bygel)
  w.gryta.greppa(a.x, a.y)
  drag(w, w.gryta, a, { x: SKAL[0].x, y: a.y - 80 }, fart)
  slapp(w, w.gryta)
  stega(w, 180)
  const r = rakna(w, 0)
  console.log(`K3 bär i bygeln ${fart * 60} px/s:        ${rad(r)}`)
  ok(`K3 bygelbärning ${fart * 60} px/s spiller ≤ 10 %`, r.kvar >= 0.9, `kvar ${pct(r.kvar)}`)
}
{
  // K4: tryck nedåt över BÄNKEN (inget mål där) — får varken hälla eller krossa.
  const w = rum()
  const a = w.gryta.varld(0, -GRYTA.bygel)
  w.gryta.greppa(a.x, a.y)
  const b = drag(w, w.gryta, a, { x: 470, y: a.y - 40 })
  drag(w, w.gryta, b, { x: 470, y: b.y + 260 }, 6)
  stega(w, 120)
  const r = rakna(w, 0)
  console.log(`K4 tryck nedåt över bänken:         ${rad(r)} · max ${Math.round(w.maxV * 57.3)}°`)
  ok('K4 att trycka nedåt utan mål häller inte', r.kvar >= 0.9, `kvar ${pct(r.kvar)}`)
}

// H — hällningarna: ETT drag från spisen till skålen och vidare nedåt, var man än tar i.
console.log('')
const res = []
for (const s of [0, 1, 2]) {
  for (const [namn, lx, ly] of GREPP) {
    const w = rum()
    const a = w.gryta.varld(lx, ly)
    w.gryta.greppa(a.x, a.y)
    // Fingret dit där kärlets mitt står över skålen, strax ovanför hyllan …
    const off = { x: w.gryta.varld(0, -GRYTA.bygel).x - a.x, y: w.gryta.varld(0, -GRYTA.bygel).y - a.y }
    const hy = grytHylla(w.gryta, SKAL[s].x).y
    const over = { x: SKAL[s].x - off.x, y: hy - 30 - off.y }
    drag(w, w.gryta, a, over)
    // … och vidare nedåt 260 px, lite snett som ett barn drar.
    drag(w, w.gryta, over, { x: over.x + 25, y: over.y + 260 }, 6)
    stega(w, 150)
    const v = Math.round(w.gryta.vinkel * 57.3)
    slapp(w, w.gryta)
    stega(w, 150)
    const r = rakna(w, s)
    res.push({ s, namn, ...r })
    console.log(`H  skål ${s} ${namn.padEnd(13)} ${rad(r)} · vinkel ${String(v).padStart(4)}°${landning(w, SKAL[s].x)}`)
  }
}
{
  const hallt = res.filter((r) => r.mal + r.annan + r.spill > 0.1)
  const trff = hallt.reduce((s, r) => s + r.mal, 0) / hallt.reduce((s, r) => s + r.mal + r.annan + r.spill, 0)
  ok('H  varje grepp häller (≥ 60 % ut ur grytan)', res.every((r) => r.kvar <= 0.4), `sämst kvar ${pct(Math.max(...res.map((r) => r.kvar)))}`)
  ok('H  det som hälls landar i rätt skål', trff >= 0.8, `${pct(trff)} av det hällda, sämst ${pct(Math.min(...hallt.map((r) => r.mal / (r.mal + r.annan + r.spill))))}`)
}

// V — parkerad först (släpp över skålen, vänta), SEDAN tryck nedåt — var man än tar.
// Förut: bygeln + nedåt pressade ned grytan i skålen (29 av 30 krossades ut, `_popcornnaiv` G3).
console.log('')
for (const [namn, lx, ly] of GREPP) {
  const w = rum()
  const a = w.gryta.varld(0, -GRYTA.bygel)
  w.gryta.greppa(a.x, a.y)
  drag(w, w.gryta, a, { x: SKAL[0].x, y: a.y - 60 })
  slapp(w, w.gryta)
  stega(w, 100)
  const p = w.gryta.varld(lx, ly)
  w.gryta.greppa(p.x, p.y)
  drag(w, w.gryta, p, { x: p.x, y: p.y + 240 }, 6)
  stega(w, 150)
  slapp(w, w.gryta)
  stega(w, 150)
  const r = rakna(w, 0)
  console.log(`V  parkerad, ${namn.padEnd(13)} ${rad(r)}${landning(w, SKAL[0].x)}`)
  ok(`V  parkerad + ${namn} nedåt häller i skålen`, r.mal >= 0.6 && r.spill <= 0.2, `mål ${pct(r.mal)}, spill ${pct(r.spill)}`)
}

// O — otålig: släpp över skålen och greppa sidan 7 steg senare (medan grytan glider).
// Förut: lutningen fastnade på 27° och 26 av 30 hamnade på spisen (`_popcornnaiv` G4).
for (const s of [0, 1, 2]) {
  const w = rum()
  const a = w.gryta.varld(0, -GRYTA.bygel)
  w.gryta.greppa(a.x, a.y)
  drag(w, w.gryta, a, { x: SKAL[s].x, y: a.y - 60 }, 14)
  slapp(w, w.gryta)
  stega(w, 7)
  const p = w.gryta.varld(ytter, 20)
  w.gryta.greppa(p.x, p.y)
  drag(w, w.gryta, p, { x: p.x, y: p.y + 240 }, 5)
  stega(w, 150)
  const v = Math.round(w.gryta.vinkel * 57.3)
  slapp(w, w.gryta)
  stega(w, 150)
  const r = rakna(w, s)
  console.log(`O  otålig vid skål ${s}:             ${rad(r)} · vinkel ${v}°${landning(w, SKAL[s].x)}`)
  ok(`O  otålig vid skål ${s} häller i skålen`, r.mal >= 0.6 && r.spill <= 0.2, `mål ${pct(r.mal)}, spill ${pct(r.spill)}`)
}

// L — lutningen är barnets: ett kort tryck häller mindre än ett långt.
{
  const ut = []
  for (const dy of [50, 260]) {
    const w = rum()
    const a = w.gryta.varld(0, -GRYTA.bygel)
    w.gryta.greppa(a.x, a.y)
    const hy = grytHylla(w.gryta, SKAL[1].x).y
    const over = drag(w, w.gryta, a, { x: SKAL[1].x, y: hy - 20 })
    drag(w, w.gryta, over, { x: over.x, y: over.y + 20 + dy }, 6)
    stega(w, 120)
    const v = Math.round(w.gryta.vinkel * 57.3)
    // Fingret UPP igen: kärlet rätar sig och bärs vidare (hällningen ska gå att avbryta).
    drag(w, w.gryta, { x: over.x, y: over.y + 20 + dy }, { x: over.x, y: over.y - 40 }, 6)
    stega(w, 90)
    const r = rakna(w, 1)
    ut.push(r.mal)
    console.log(`L  tryck ${String(dy).padStart(3)} px, sedan upp:         ${rad(r)} · vinkel ${v}° → ${Math.round(w.gryta.vinkel * 57.3)}° ${w.gryta.lage}`)
    if (dy === 260) ok('L  fingret upp igen rätar grytan och bär vidare', w.gryta.lage === 'grepp' && Math.abs(w.gryta.vinkel) < 0.15, `${w.gryta.lage} ${Math.round(w.gryta.vinkel * 57.3)}°`)
  }
  ok('L  ett kort tryck häller mindre än ett långt', ut[0] < ut[1] - 0.3, `kort ${pct(ut[0])} mot långt ${pct(ut[1])}`)
}

// P — påsen över grytan på spisen, samma gest.
console.log('')
const PGREPP = [
  ['mitt på', 0, PASE.djup * 0.5],
  ['höger sida', PASE.bredd / 2 + PASE.vagg, 20],
  ['vänster sida', -(PASE.bredd / 2 + PASE.vagg), 20],
  ['botten', 0, PASE.djup + 4],
]
const pRes = []
for (const [namn, lx, ly] of PGREPP) {
  const w = rum('korn')
  const a = w.pase.varld(lx, ly)
  w.pase.greppa(a.x, a.y)
  const off = { x: w.pase.varld(0, 0).x - a.x, y: w.pase.varld(0, 0).y - a.y }
  const h = paseHylla(w.pase, w.gryta, w.gryta.varld(0, 0).x - 30)
  const over = { x: h.mal.x - off.x, y: h.y - 30 - off.y }
  drag(w, w.pase, a, over)
  drag(w, w.pase, over, { x: over.x + 15, y: over.y + 230 }, 6)
  stega(w, 150)
  const v = Math.round(w.pase.vinkel * 57.3)
  slapp(w, w.pase)
  stega(w, 120)
  const r = rakna(w, 'gryta')
  console.log(`P  påsen, ${namn.padEnd(13)}      ${rad(r)} · vinkel ${v}°`)
  pRes.push(r)
  ok(`P  påsen ${namn}: ≥ 70 % av kornen i grytan, ≤ 10 % spill`, r.mal >= 0.7 && r.spill <= 0.1, `${pct(r.mal)}, spill ${pct(r.spill)}`)
}
// Det som blir kvar i påsen går att hälla igen (påsen rätar sig), så kravet per grepp är 70 %
// och medlet 80 % — den gamla expertgestens 80 % per grepp mätte en annan rörelse.
ok('P  påsen: medel ≥ 80 % i grytan', pRes.reduce((a, r) => a + r.mal, 0) / pRes.length >= 0.8, pct(pRes.reduce((a, r) => a + r.mal, 0) / pRes.length))
{
  // PK: påsen vågrätt i bänkhöjd in över grytan — lyfts upp, lutar inte.
  const w = rum('korn')
  const a = w.pase.varld(0, PASE.djup * 0.5)
  w.pase.greppa(a.x, a.y)
  drag(w, w.pase, a, { x: SPIS.x - 30, y: a.y })
  stega(w, 120)
  const r = rakna(w, 'gryta')
  console.log(`PK påsen vågrätt in över grytan:     ${rad(r)} · max ${Math.round(w.maxV * 57.3)}°`)
  ok('PK att bära påsen in över grytan häller inte', r.kvar >= 0.9, `kvar ${pct(r.kvar)}`)
}

console.log(fel ? `\n✗ ${fel} villkor föll\n` : '\n✓ alla villkor håller\n')
process.exit(fel ? 1 : 0)
