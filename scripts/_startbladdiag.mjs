// _startbladdiag.mjs — engångsdiagnos (grodan-slurp L4): sitter grodan kvar på startbladet när
// bladen är envägsplattformar? Start, efter "grodan hem" och efter några hopp på bladet.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
const ut = []
for (let n = 0; n < 4; n++) {
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
  const r = await page.evaluate(async () => {
    const g = window.__barnspel.game
    g._nastaHinder = 9999
    const v = (ms) => new Promise((res) => setTimeout(res, ms))
    const las = () => ({ y: Math.round(g._groda.pos.y), lage: g._groda.lage, under: g._groda.underlag?.label || null })
    await v(2000)
    const start = las()
    g._kallaHem(g._ctx)
    await v(2000)
    const hem = las()
    const hopp = []
    for (let i = 0; i < 3; i++) {
      g._groda.hoppa(g._groda.riktning)
      await v(1800)
      hopp.push(las())
    }
    return { start, hem, hopp }
  })
  ut.push(r)
}
console.log(JSON.stringify(ut))
await b.close()
