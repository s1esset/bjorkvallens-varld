// Kor gatan en bit och tar skarmdumpar sa butikerna hinner rulla in i bild.
//   node scripts/_gatubild2.mjs  ->  .test-shots/natskott-gata-1..4.png
import { chromium } from 'playwright'
const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'natskott-pa-stan' }))
await page.waitForTimeout(1400)
await page.evaluate(() => { window.__natdbg._scroll = 9 }) // snabbspola kulissen
const sedda = new Set()
for (let i = 1; i <= 5; i++) {
  await page.waitForTimeout(1500)
  const b = await page.evaluate(() => (window.__natdbg._mid || []).map((s) => s.butik).filter(Boolean))
  b.forEach((x) => sedda.add(x))
  await page.screenshot({ path: `.test-shots/natskott-gata-${i}.png` })
}
console.log('butiker sedda i bild:', [...sedda].join(' · ') || '(inga)')
console.log(errors.length ? `x ${errors.length} konsolfel: ${errors[0]}` : 'ok 0 konsolfel')
await browser.close()
