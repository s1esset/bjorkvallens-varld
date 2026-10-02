// MATA MONSTRET — kast mot munnen (D9, G2 bonus). Kontrollarmarna först.
//
//   node scripts/_dag-mata-monstret.mjs        (kräver dev-servern på :5173)
//
// Klassiska läget (runda 0, munnen ~(640,364), ätradie 150). Per arm tas en mat på bordet:
//   A långsamt drag till (420,470) (utanför munzonen), släpp     → INGET kast
//   B snabbt drag dit, fingret still 300 ms, släpp               → INGET kast
//   C snabbt drag mot munnen, släpp i farten utanför zonen       → kast; äts den?
//   D drag in i munnen                                           → vanligt ätande
// Spionerar på `_kasta` (returvärdet) och läser `_fed` före/efter.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('console', m => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
p.on('pageerror', e => fel.push('PAGEERROR ' + String(e).slice(0, 160)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'mata-monstret' }))
await p.waitForTimeout(3500)
const lage = await p.evaluate(() => {
  const g = window.__barnspel.game
  window.__kast = []
  const o = g._kasta
  g._kasta = function (...a) { const r = o.apply(this, a); window.__kast.push(r); return r }
  return g._mode
})

const arm = (namn) => p.evaluate(async (namn) => {
  const w = (ms) => new Promise(r => setTimeout(r, ms))
  const g = window.__barnspel.game
  for (let i = 0; i < 40 && (g._flightFood || g._kastade.length); i++) await w(150)
  const m = g._foods.find(f => !f._eaten && !f.container.destroyed && !(f.rec && f.rec.placed))
  if (!m) return { namn, fel: 'ingen mat' }
  const q = m.container.getGlobalPosition()
  const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), sx = r.width / 1280
  const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x * sx, clientY: r.top + y * sx,
    pointerId: 1, pointerType: 'touch', button: 0, buttons: t === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
  const dra = async (a, z, n, ms) => { for (let i = 1; i <= n; i++) { ev('pointermove', a[0] + (z[0] - a[0]) * i / n, a[1] + (z[1] - a[1]) * i / n); await w(ms) } }
  const fed0 = g._fed, k0 = window.__kast.length
  const a = [q.x, q.y]
  ev('pointerdown', ...a)
  await dra(a, [320, 560], 12, 30); await w(200)
  const S = [320, 560], Z = [440, 480]
  if (namn === 'A') await dra(S, Z, 30, 30)
  if (namn === 'B') { await dra(S, Z, 5, 16); await w(300) }
  if (namn === 'C') await dra(S, Z, 5, 16)
  if (namn === 'D') await dra(S, [640, 380], 20, 20)
  const f = namn === 'D' ? [640, 380] : Z
  ev('pointerup', ...f)
  await w(2500)
  return { namn, kast: window.__kast.slice(k0).join(',') || '–', att: g._fed - fed0 }
}, namn)

const ut = []
for (const n of ['A', 'B', 'C', 'C', 'C', 'D']) { ut.push(await arm(n)); await p.waitForTimeout(300) }
await p.evaluate(() => window.__barnspel.nav.go('menu'))
await p.waitForTimeout(800)
console.log(`\n  mata-monstret — kast mot munnen (läge ${lage})\n`)
for (const r of ut) console.log(`  ${r.namn}: ${r.fel || `_kasta → ${r.kast} · ätna ${r.att}`}`)
console.log(`\n  konsolfel: ${fel.length}`); for (const x of fel.slice(0, 6)) console.log('   ' + x)
await b.close()
