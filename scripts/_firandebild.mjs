// Fångar ett FIRANDE mitt i rörelsen (konfettiregn + burst) så tätheten går att se
// med ögat. Ordinarie test-skärmdump tas efter att effekterna dött ut och visar
// därför aldrig det som faktiskt ändrats.
//
// Tajmingen är inte godtycklig: konfettin har inbyggd fördröjning (0–0,4 s) och
// faller i ~2 s, medan burst/sparkle/puff lever under 1 s. Fyras allt samtidigt och
// bilden tas efter 0,7 s är skurarna redan borta. Regnet startar därför först, och
// skurarna fyras när regnet fyllt bilden.
//   node scripts/_firandebild.mjs <ut.png>
import { chromium } from 'playwright'
const ut = process.argv[2] || '.test-shots/_firande.png'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('pageerror', (e) => fel.push(String(e.message || e).slice(0, 160)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'poppa-ballonger' }))
await p.waitForTimeout(1500)
await p.evaluate(async () => {
  const fb = await import('/src/lib/feedback.js')
  fb.bigCelebration(window.__barnspel.fxLayer)
})
await p.waitForTimeout(950)
await p.evaluate(async () => {
  const fb = await import('/src/lib/feedback.js')
  const L = window.__barnspel.fxLayer
  fb.burst(L, 420, 300, { count: 14 })
  fb.burst(L, 880, 380, { count: 14, power: 1.4 })
  fb.sparkle(L, 640, 230, { count: 6 })
  fb.puff(L, 300, 500, { count: 8 })
})
await p.waitForTimeout(230)
const n = await p.evaluate(() => {
  let t = 0
  const w = (c) => { if (!c || c.destroyed) return; if (Array.isArray(c.particleChildren)) t += c.particleChildren.length; if (c.children) c.children.forEach(w) }
  w(window.__barnspel.app.stage); return t
})
await p.screenshot({ path: ut })
console.log(`levande partiklar: ${n} · fel: ${fel.length} · ${ut}`)
await b.close()
