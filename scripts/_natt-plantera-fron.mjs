// Nattkörningen F1: plantera-fron — så, vattna (håll kannan), fota blomman i full storlek.
// Två rundor, otåligt. node scripts/_natt-plantera-fron.mjs
import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'plantera-fron' }))
await page.waitForFunction(() => window.__barnspel.game?.id === 'plantera-fron' && window.__barnspel.ctx?.stage, null, { timeout: 20000 })
await page.waitForTimeout(1500)
const m = page.mouse
async function runda(n) {
  const hal = await page.evaluate(() => (window.__barnspel.game._holes || window.__barnspel.game._plants || []).map((h) => [h.x | 0, h.y | 0]))
  console.log(`runda ${n}: hål`, JSON.stringify(hal))
  for (const [hx] of hal.length ? hal : [[640]]) {
    // tap-tap: fröet, sedan hålet
    await m.click(640, 210); await page.waitForTimeout(150)
    await m.click(hx, 560); await page.waitForTimeout(500)
  }
  await page.waitForTimeout(400)
  const plants = await page.evaluate(() => (window.__barnspel.game._plants || []).map((p) => [p.x | 0, p.sort?.id]))
  console.log('  plantor', JSON.stringify(plants))
  for (const [px] of plants) {
    await m.move(640, 150); await m.down()
    await m.move(px + 103, 150, { steps: 6 })
    await page.waitForTimeout(2900)
    await page.screenshot({ path: '.test-shots/_plantera-vattnar.png' })
    await m.up(); await page.waitForTimeout(200)
  }
}
await runda(1)
for (const t of [1, 2, 3]) { await page.waitForTimeout(900); await page.screenshot({ path: `.test-shots/_plantera-blom-${t}.png` }) }
await m.click(640, 402); await page.waitForTimeout(300); await m.click(640, 402)
await page.waitForTimeout(3500)
await runda(2)
await page.waitForTimeout(2000)
await page.screenshot({ path: '.test-shots/_plantera-blom2.png' })
console.log('fel:', errors.length, errors.slice(0, 3).join(' | '))
await browser.close()
