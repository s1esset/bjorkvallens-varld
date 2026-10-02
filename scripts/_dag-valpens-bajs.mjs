// VALPENS BAJS — kast ur skyffeln (D9, G2 bonus). Kontrollarmarna först.
//
//   node scripts/_dag-valpens-bajs.mjs        (kräver dev-servern på :5173)
//
// Per arm: tryck på skyffeln, dra den till närmaste hög (den plockas upp), och släpp:
//   A långsamt drag till (880,500)                 → INGET kast, högen tappas tillbaka
//   B snabbt drag, fingret still 300 ms, släpp     → INGET kast (pekspårets ålder)
//   C snabbt drag mot tunnan, släpp i farten       → kast; räknas det i tunnan?
//   D drag hela vägen in i tunnans mun             → vanlig deposit (som förut)
// Läser `_flyg` direkt efter släppet och spionerar på `_deposit(ctx, hent, kast)`.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('console', m => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
p.on('pageerror', e => fel.push('PAGEERROR ' + String(e).slice(0, 160)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'valpens-bajs' }))
await p.waitForTimeout(3000)
await p.evaluate(() => {
  const g = window.__barnspel.game
  window.__dep = []
  const o = g._deposit
  g._deposit = function (ctx, hent = null, kast = false) { window.__dep.push(kast ? 'kast' : 'drag'); return o.call(this, ctx, hent, kast) }
})

const arm = (namn) => p.evaluate(async (namn) => {
  const w = (ms) => new Promise(r => setTimeout(r, ms))
  const g = window.__barnspel.game
  for (let i = 0; i < 40 && !(g._poops || []).some(q => q && !q.destroyed && !q._taken); i++) await w(150)
  for (let i = 0; i < 40 && (g._autoBusy || g._scooping || g._resolving); i++) await w(150)
  const pile = (g._poops || []).find(q => q && !q.destroyed && !q._taken)
  if (!pile) return { namn, fel: 'ingen hög' }
  const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), sx = r.width / 1280
  const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x * sx, clientY: r.top + y * sx,
    pointerId: 1, pointerType: 'touch', button: 0, buttons: t === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
  const dra = async (a, z, n, ms) => { for (let i = 1; i <= n; i++) { ev('pointermove', a[0] + (z[0] - a[0]) * i / n, a[1] + (z[1] - a[1]) * i / n); await w(ms) } }
  const s0 = [g._scooper.x, g._scooper.y - 20]
  ev('pointerdown', ...s0)
  await dra(s0, [pile.x, pile.y], 14, 20)
  await w(80)
  const bar = !!g._carry
  const fore = window.__dep.length
  // Alla armar börjar från samma ställe (högen kan ligga var som helst — även där förra armen tappade den).
  const S = [400, 450]
  await dra([pile.x, pile.y], S, 20, 30); await w(250)
  if (namn === 'A') await dra(S, [880, 500], 40, 30)
  if (namn === 'B') { await dra(S, [880, 500], 8, 16); await w(300) }
  if (namn === 'C') await dra(S, [900, 470], 7, 16)
  if (namn === 'D') await dra(S, [1140, 470], 20, 20)
  const fx = namn === 'D' ? [1140, 470] : namn === 'C' ? [900, 470] : [880, 500]
  const dbg = (() => { const k = g._spar.fart(); return k ? Math.round(k.fart * 16.7) + ' px/steg (' + g._spar.langd + ' prov)' : 'null (' + g._spar.langd + ' prov)' })()
  ev('pointerup', ...fx)
  await w(30)
  const flyg = (g._flyg || []).length
  await w(2200)
  return { namn, dbg, bar, flyg, dep: window.__dep.slice(fore).join(',') || '–', tillbaka: !pile.destroyed && !pile._taken }
}, namn)

const ut = []
for (const n of ['A', 'B', 'C', 'C', 'C', 'D']) { ut.push(await arm(n)); await p.waitForTimeout(400) }
await p.evaluate(() => window.__barnspel.nav.go('menu'))
await p.waitForTimeout(800)
console.log('\n  valpens-bajs — kast ur skyffeln\n')
for (const r of ut) console.log(`  ${r.namn}: ${r.fel || `fart ${r.dbg} · bar hög ${r.bar} · i luften direkt efter släpp ${r.flyg} · deposits ${r.dep} · högen tillbaka på marken ${r.tillbaka}`}`)
console.log(`\n  konsolfel: ${fel.length}`); for (const f of fel.slice(0, 6)) console.log('   ' + f)
await b.close()
