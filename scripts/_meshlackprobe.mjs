// O1: lämnar en riven mjukMesh kvar GPU-buffertar? Pop 12 popcorn, riv antingen via att poppen blir klar eller
// via spelbyte mitt i, och räkna hur många av meshernas buffert-uid:n som FORTFARANDE ligger i
// `renderer.buffer._managedBuffers.items`. Kontrollarm: med `geometry.destroy()` (utan true) kvar 24 av 144;
// med `destroy(true)` 0. (_graflackprobe mäter bara GraphicsContext, inte MeshGeometry.)
//   node scripts/_meshlackprobe.mjs   (kräver dev-servern på :5174)
import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  for (const vänta of [100, 400, 900]) {
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
  await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
  await page.waitForTimeout(1200)
  const uids = await page.evaluate(async (v) => {
    const g = window.__barnspel.game
    if (g._korn.length < 14) g._fyllPase()
    window.__popcorn.poppa(12)
    await new Promise((r) => setTimeout(r, v))
    const u = []
    for (const p of g._pop) if (p.mm) for (const c of p.mm.view.children) { for (const b of c.geometry.buffers) u.push(b.uid); u.push(c.geometry.indexBuffer.uid) }
    window.__uids = u
    return u.length
  }, vänta)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1500)
  const kvar = await page.evaluate(() => { const it = window.__barnspel.app.renderer.buffer._managedBuffers.items; return window.__uids.filter((u) => it[u]).length })
  console.log('exit efter', vänta, 'ms: buffertar', uids, 'kvar', kvar)
  }
  console.log('konsolfel', errors.length, errors.slice(0, 3))
} finally { await browser.close() }
