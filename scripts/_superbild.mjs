// _superbild.mjs — närbild av grodan-slurps stjärnläge och sats (2× upplösning), för ögat.
//   node scripts/_superbild.mjs  → .test-shots/_superbild-*.png
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(1500)
async function narbild(namn) {
  const r = await page.evaluate(() => {
    const g = window.__barnspel.game
    const k = g._groda._com()
    const p = g._scen.toGlobal({ x: k.x, y: k.y })
    const c = document.querySelector('canvas').getBoundingClientRect()
    const s = c.width / 1280
    return { x: c.left + p.x * s, y: c.top + p.y * s, s }
  })
  const w = 320 * r.s
  await page.screenshot({ path: `.test-shots/_superbild-${namn}.png`, clip: { x: Math.max(0, r.x - w / 2), y: Math.max(0, r.y - w / 2), width: w, height: w } })
}
// Sats: håll fingret (spelets egen väg) i 1,4 s.
await page.evaluate(() => {
  const g = window.__barnspel.game
  g._groda.laddaStart()
  g._ladd = { id: -7, t: 1.3, not: 7, full: false, trill: 0 }
})
await page.waitForTimeout(250)
await narbild('sats')
// Stjärnläget mitt i dammen, stilla i luften (tyngdlöst en stund) — både vaken och sovande.
await page.evaluate(() => {
  const g = window.__barnspel.game
  g._ladd = null
  const gr = g._groda
  gr.laddaAvbryt()
  gr.teleportera(640, 330)
  g._phys.engine.gravity.y = 0
  gr.superFas = 'volt'
  gr._superN = 0
  gr._tillStjarna()
  gr._snurra(-gr._snurrFart() + 0.004)
  g._super = { fas: 'luft', t0: g._t, landT: null, vakT: null, uppe: false, p: 1 }
})
await page.waitForTimeout(500)
await narbild('stjarna')
await page.evaluate(() => {
  const g = window.__barnspel.game
  g._superTryck(g._ctx, { x: 640, y: 150 }, false)
})
await page.waitForTimeout(450)
await narbild('rep')
await page.evaluate(() => {
  const gr = window.__barnspel.game._groda
  gr.landat = true
  gr.sover = true
})
await page.waitForTimeout(400)
await narbild('sover')
await b.close()
