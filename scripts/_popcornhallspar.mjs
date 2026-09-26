// HÄLLSPÅR — en hällning ur `_popcornhall` bildruta för bildruta, i text och (med --bild) i
// sex rutor. Rena tal + matter, samma Karl och hyllor som spelet.
//
//   node scripts/_popcornhallspar.mjs <skål 0-2> <sida -1|1> [park] [--bild] [--tyst]
//     park   = släpp över skålen och vänta först (annars ETT drag från spisen och nedåt)
//   → .test-shots/_popcornhallspar.png
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Karl } from '../src/games/popcornkalaset/karl.js'
import { GRYTA, SKAL, SPIS, BANK, BORD, GOLV, POPCORN } from '../src/games/popcornkalaset/matt.js'
import { byggSkal, grytHylla } from '../src/games/popcornkalaset/fysik.js'

const a = process.argv.slice(2)
const S = Number(a[0] ?? 0)
const SIDA = Number(a[1] ?? 1)
const PARK = a.includes('park')
const BILD = a.includes('--bild')
const TYST = a.includes('--tyst')
const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: -400, right: 1280, bottom: GOLV } })
phys.rectangle((BANK.x0 + BANK.x1) / 2, BANK.yta + 20, BANK.x1 - BANK.x0, 40, { isStatic: true, label: 'bank' })
phys.rectangle((BORD.x0 + BORD.x1) / 2, BORD.yta + BORD.tjock / 2, BORD.x1 - BORD.x0, BORD.tjock, { isStatic: true, label: 'bord' })
for (const s of SKAL) byggSkal(phys, s)
const g = new Karl(phys, { x: SPIS.x, y: SPIS.yta - GRYTA.golv - GRYTA.djup, ...GRYTA, label: 'karl', grupp: -7 })
g.hylla = (x) => grytHylla(g, x)
g.rum = { x0: 0, x1: 1280 }
const pop = []
for (let i = 0; i < 16; i++) {
  const p = g.varld(((i % 6) - 2.5) * 26, GRYTA.djup - 15 - Math.floor(i / 6) * 27)
  pop.push(phys.polygon(p.x, p.y, 7, POPCORN.r, { ...POPCORN.kropp, label: 'popcorn' }))
}
g.innehall = pop
phys.beforeStep(() => g.steg())
let t = 0
const rutor = []
const bildVid = new Set()
const bild = (rubrik) => {
  let svg = ''
  for (const b of Matter.Composite.allBodies(phys.world)) {
    for (const d of b.parts.length > 1 ? b.parts.slice(1) : [b]) {
      const pts = d.vertices.map((v) => `${v.x.toFixed(0)},${v.y.toFixed(0)}`).join(' ')
      const farg = b.label === 'popcorn' ? '#f6e27a' : b.label === 'karl' ? '#6a7f9a' : b.isStatic ? '#8a6a4a' : '#999'
      svg += `<polygon points="${pts}" fill="${farg}" stroke="#222" stroke-width="1"/>`
    }
  }
  const h = g._hand
  if (h) svg += `<circle cx="${h.x}" cy="${h.y}" r="7" fill="red"/>`
  svg += `<circle cx="${g._mal.x}" cy="${g._mal.y}" r="5" fill="none" stroke="red" stroke-width="2"/>`
  rutor.push(`<div><b>${rubrik}</b><svg viewBox="420 100 860 540" width="620" height="390" style="background:#eef">${svg}</svg></div>`)
}
const logg = () => {
  const ute = pop.filter((b) => !g.inuti(b.position.x, b.position.y, 24))
  const gp = g._fast ? g.varld(g._fast.x, g._fast.y) : null
  const vx = ute.length ? (ute.reduce((s, b) => s + b.velocity.x, 0) / ute.length).toFixed(1) : '-'
  if (!TYST) console.log(`${String(t).padStart(4)} ${g.lage.padEnd(6)} v ${String(Math.round(g.vinkel * 57.3)).padStart(4)}° mål ${g._vippaMal != null ? Math.round(g._vippaMal * 57.3) : '-'}° grepp ${gp ? Math.round(gp.x) + ',' + Math.round(gp.y) : '-'} handmål ${Math.round(g._mal.x)},${Math.round(g._mal.y)} kropp v ${g.body.velocity.x.toFixed(1)} · ute ${ute.length} (medel vx ${vx}): ${ute.slice(0, 5).map((b) => Math.round(b.position.x) + ',' + Math.round(b.position.y)).join(' ')}`)
}
const steg = (n, f) => {
  for (let i = 0; i < n; i++) {
    f?.(i)
    phys.update(1000 / 60)
    t++
    if (t % 6 === 0) logg()
    if (BILD && bildVid.has(t)) bild(`steg ${t} · ${g.lage} ${Math.round(g.vinkel * 57.3)}°`)
  }
}
steg(90)
const ytter = GRYTA.bredd / 2 + GRYTA.vagg
const dra = (p, q, fart) => {
  const n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / fart))
  steg(n, (i) => g.dra(p.x + ((q.x - p.x) * (i + 1)) / n, p.y + ((q.y - p.y) * (i + 1)) / n))
}
if (PARK) {
  const b0 = g.varld(0, -GRYTA.bygel)
  g.greppa(b0.x, b0.y)
  dra(b0, { x: SKAL[S].x, y: b0.y - 60 }, 10)
  g.parkera(SKAL[S].x, grytHylla(g, SKAL[S].x).y)
  steg(100)
  if (!TYST) console.log('--- grepp och nedåt')
  const t0 = t
  for (const d of [8, 20, 32, 44, 70, 140]) bildVid.add(t0 + d)
  const p = g.varld(SIDA * ytter, 20)
  g.greppa(p.x, p.y)
  dra(p, { x: p.x, y: p.y + 240 }, 6)
} else {
  const p = g.varld(SIDA * ytter, 20)
  g.greppa(p.x, p.y)
  const b0 = g.varld(0, -GRYTA.bygel)
  const off = { x: b0.x - p.x, y: b0.y - p.y }
  const over = { x: SKAL[S].x - off.x, y: grytHylla(g, SKAL[S].x).y - 30 - off.y }
  dra(p, over, 10)
  if (!TYST) console.log('--- nedåt')
  const t0 = t
  for (const d of [8, 20, 32, 44, 70, 140]) bildVid.add(t0 + d)
  dra(over, { x: over.x + 25, y: over.y + 260 }, 6)
}
steg(150)
if (!TYST) console.log('--- släpp')
g.slappVippa()
steg(150)
if (BILD) {
  const { chromium } = await import('playwright')
  const { mkdirSync } = await import('node:fs')
  mkdirSync('.test-shots', { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1900, height: 820 } })
  await page.setContent(`<body style="margin:0;font:15px sans-serif"><div style="display:grid;grid-template-columns:repeat(3,630px)">${rutor.join('')}</div></body>`)
  await page.screenshot({ path: '.test-shots/_popcornhallspar.png' })
  await browser.close()
  console.log('→ .test-shots/_popcornhallspar.png')
}
