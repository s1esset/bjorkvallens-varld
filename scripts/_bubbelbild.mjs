// Mätpass för §4-punkt 5 ("bättre vätske- och bubbelfysik"): fyll badet med bubblor av alla
// tre sorter och FÅNGA BILDEN. Docens instruktion är att skriva ner vad som ser fel ut i bild
// innan något ändras — den här sonden producerar underlaget, den dömer ingenting.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 160)))
page.on('pageerror', (e) => fel.push('PAGEERROR: ' + String(e.message).slice(0, 160)))
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'pruttbad' }))
await page.waitForTimeout(1500)
const stat = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  for (const [soap, n] of [[0, 6], [1, 5], [2, 3]]) {
    g._soap = soap
    for (let i = 0; i < n; i++) g._pushBubble(260 + Math.random() * 760, g._rMin() + Math.random() * (g._rMax() - g._rMin()), 0, i % 4 === 0 ? 'glitter' : 'normal')
  }
  await new Promise((r) => setTimeout(r, 900))
  return { antal: g._bubbles.length, radier: g._bubbles.map((b) => Math.round(b.r)).sort((a, b) => a - b), fart: g._bubbles.map((b) => +Math.hypot(b.vx, b.vy).toFixed(2)) }
})
writeFileSync('.test-shots/_bubblor.png', await page.screenshot())
console.log('  bubblor i luften:', stat.antal)
console.log('  radier:', stat.radier.join(' '))
console.log('  farter:', stat.fart.join(' '))
console.log('  konsolfel:', fel.length ? fel.join(' | ') : 0)
await browser.close()
