import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)))
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'vandkort' }))
await page.waitForTimeout(1500)
// Lås upp ljudet med en riktig pekning och låt klippen avkodas.
await page.mouse.click(640, 400)
await page.waitForTimeout(2500)
const r = await page.evaluate(() => {
  const a = window.__barnspel.audio
  return {
    urlar: [...a._sampleUrls.keys()].sort(),
    avkodade: [...a._samples.keys()].sort(),
  }
})
console.log('manifest-nycklar:', r.urlar.length)
for (const k of ['tap', 'soft', 'flip']) {
  console.log(' ', k.padEnd(6), 'url:', r.urlar.includes(k) ? 'JA' : 'NEJ', ' avkodad:', r.avkodade.includes(k) ? 'JA' : 'NEJ')
}
console.log('konsolfel:', errs.length ? errs : 'inga')
await b.close()
