// HÄLLSOND — popcornkalasets PÅSE med EN gest: bär den dit (var man än tar i den), tryck nedåt
// över grytan så lutar den. Rena tal + matter, samma `Karl` och samma hylla (`fysik.js`) som
// spelet, samma rum (bänk, bord, tre skålar, väggar). Ingen webbläsare.
//
// ⚠️ Grytan mättes här med samma gest i v1.264. Den gesten är borttagen för grytan 2026-09-26
// (ägaren: de osynliga spärrarna fick grytan att flyga iväg) — grytan har sidohandtag och mäts i
// `_popcornhandtag.mjs`. Kvar här: påsen.
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
import { byggSkal, iSkal, paseHylla } from '../src/games/popcornkalaset/fysik.js'

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
  const gryta = new Karl(phys, { ...GRYTA_HEM, ...GRYTA, label: 'gryta', grupp: -7 })
  const pase = new Karl(phys, { ...PASE_HEM, ...PASE, label: 'pase', grupp: -7 })
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
  const h = paseHylla(karl, w.gryta, m.x)
  if (h.mal) karl.parkera(h.mal.x, h.y)
  else karl.parkera(PASE_HEM.x, karl.parkHojd(BANK.yta) - 4)
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
const rad = (r) => `mål ${pct(r.mal).padStart(5)} · kvar ${pct(r.kvar).padStart(5)} · annan skål ${pct(r.annan).padStart(4)} · spill ${pct(r.spill).padStart(4)}`

console.log('\nHÄLLSOND — popcornkalasets påse, en gest\n')

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
