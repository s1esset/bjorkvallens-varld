// VIPPBRÄDAN — syns böjen? (P1, dag 2026-10-02 D7). Spelets förvalda vikt (äpplet), bild när högra spetsens utslag är störst.
//   node scripts/_dag-vipp-boj.mjs [ut.png]      (kräver dev-servern på :5173)
import { chromium } from 'playwright'
const ut = process.argv[2] || '.test-shots/_vipp-boj.png'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'vippbradan' }))
  await page.waitForTimeout(2500)
  const r = await page.evaluate(async () => {
    const g = window.__barnspel.game
    g._dropWeight(window.__barnspel.ctx, 855)
    let max = 0, f0 = -1
    for (let f = 0; f < 120; f++) {
      await new Promise((res) => requestAnimationFrame(res))
      const b = Math.abs(g._bojTipR || 0)
      if (b > max) { max = b; f0 = f }
      if (max > 5 && b < max * 0.9) return { max: +max.toFixed(1), f: f0, stoppad: f }
    }
    return { max: +max.toFixed(1), f: f0 }
  })
  await page.screenshot({ path: ut })
  console.log(JSON.stringify({ ...r, ut, errors }))
} finally { await browser.close() }
