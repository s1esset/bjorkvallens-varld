// HANDTAGSBILD — en hällning i sidohandtaget, i sex rutor (node-simulering → SVG → skärmdump).
//   node scripts/_popcornhandtagbild.mjs [skål 0-2] [sida -1|1] [--ingen-flytt]
//   → .test-shots/_popcornhandtagbild.png
// Ställer grytan på skålen, tar handtaget, flyttar fingret rakt över skålens mitt (som H7 i
// `_popcornhandtag`), och ritar kropparna, handen (röd) och fingret (blå ring).
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Karl } from '../src/games/popcornkalaset/karl.js'
import { GRYTA, SKAL, SPIS, BANK, BORD, GOLV, POPCORN } from '../src/games/popcornkalaset/matt.js'
import { byggSkal } from '../src/games/popcornkalaset/fysik.js'

const a = process.argv.slice(2)
const S = Number(a[0] ?? 1)
const SIDA = Number(a[1] ?? 1)
const FLYTT = !a.includes('--ingen-flytt')
const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: -400, right: 1280, bottom: GOLV } })
phys.rectangle((BANK.x0 + BANK.x1) / 2, BANK.yta + 20, BANK.x1 - BANK.x0, 40, { isStatic: true, label: 'bank' })
phys.rectangle((BORD.x0 + BORD.x1) / 2, BORD.yta + BORD.tjock / 2, BORD.x1 - BORD.x0, BORD.tjock, { isStatic: true, label: 'bord' })
for (const s of SKAL) byggSkal(phys, s)
const g = new Karl(phys, { x: SPIS.x, y: SPIS.yta - GRYTA.golv - GRYTA.djup, ...GRYTA, label: 'karl', grupp: -7 })
g.rum = { x0: 0, x1: 1280 }
const pop = []
for (let i = 0; i < 24; i++) {
  const p = g.varld(((i % 6) - 2.5) * 26, GRYTA.djup - 15 - Math.floor(i / 6) * 27)
  pop.push(phys.polygon(p.x, p.y, 7, POPCORN.r, { ...POPCORN.kropp, label: 'popcorn' }))
}
g.innehall = pop
phys.beforeStep(() => g.steg())
let finger = null
const rutor = []
const bild = (rubrik) => {
  let svg = ''
  for (const b of Matter.Composite.allBodies(phys.world)) {
    for (const d of b.parts.length > 1 ? b.parts.slice(1) : [b]) {
      const pts = d.vertices.map((v) => `${v.x.toFixed(0)},${v.y.toFixed(0)}`).join(' ')
      const farg = b.label === 'popcorn' ? '#f6e27a' : b.label === 'karl' ? '#6a7f9a' : b.isStatic ? '#8a6a4a' : '#999'
      svg += `<polygon points="${pts}" fill="${farg}" stroke="#222" stroke-width="1"/>`
    }
  }
  for (const sd of [-1, 1]) { const h = g.varld(sd * GRYTA.handtag.x, GRYTA.handtag.y); svg += `<circle cx="${h.x}" cy="${h.y}" r="9" fill="#d9483b"/>` }
  if (g._hand) svg += `<circle cx="${g._hand.x}" cy="${g._hand.y}" r="5" fill="red"/>`
  if (finger) svg += `<circle cx="${finger.x}" cy="${finger.y}" r="14" fill="none" stroke="#2a6fdb" stroke-width="3"/>`
  rutor.push(`<div><b>${rubrik}</b><svg viewBox="380 60 900 600" width="620" height="413" style="background:#eef">${svg}</svg></div>`)
}
const steg = (n, f) => { for (let i = 0; i < n; i++) { f?.(i); phys.update(1000 / 60) } }
steg(90)
const dra = (p, q, fart, kvar = 0) => { const n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / fart)); steg(n, (i) => { finger = { x: p.x + ((q.x - p.x) * (i + 1)) / n, y: p.y + ((q.y - p.y) * (i + 1)) / n }; g.dra(finger.x, finger.y) }); steg(kvar, () => g.dra(finger.x, finger.y)); return q }
// Ställ på skålen
let p = g.varld(0, 50)
g.greppa(p.x, p.y)
dra(p, { x: SKAL[S].x, y: SKAL[S].kant - 100 }, 9, 40)
g.lagNer()
finger = null
steg(120)
bild('ställd på skålen')
p = g.varld(SIDA * GRYTA.handtag.x, GRYTA.handtag.y)
finger = p
g.greppa(p.x, p.y)
steg(30, () => g.dra(p.x, p.y)); bild('handtaget taget, +0,5 s (lyfts)')
const mal = FLYTT ? { x: SKAL[S].x, y: p.y - 40 } : { x: p.x, y: p.y }
dra(p, mal, 4)
bild('fingret över skålen')
steg(40, () => g.dra(mal.x, mal.y)); bild('+0,7 s')
steg(60, () => g.dra(mal.x, mal.y)); bild('+1,7 s')
steg(100, () => g.dra(mal.x, mal.y)); bild('+3,3 s')
const { chromium } = await import('playwright')
const { mkdirSync } = await import('node:fs')
mkdirSync('.test-shots', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1900, height: 880 } })
await page.setContent(`<body style="margin:0;font:15px sans-serif"><div style="display:grid;grid-template-columns:repeat(3,630px)">${rutor.join('')}</div></body>`)
await page.screenshot({ path: '.test-shots/_popcornhandtagbild.png' })
await browser.close()
console.log('→ .test-shots/_popcornhandtagbild.png')
