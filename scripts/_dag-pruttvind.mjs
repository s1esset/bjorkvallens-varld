// D11: bajs-och-kiss — pruttvinden PÅ: syns luftströmmen, böjer pricklinjen, landar korven? (bild + 0 konsolfel)
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 160)))
page.on('pageerror', (e) => fel.push('PAGEERROR ' + e.message))
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel)
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'bajs-och-kiss' }))
await page.waitForTimeout(3500)
const info = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('bajs-och-kiss')
  g._windOn = true; g._applyWind(); g._updateWindButton?.()
  return { hand: g._kidHands[g._activeKid], toilet: { x: g._toilet.x, y: g._toilet.bowlY }, wind: g._launcher?.previewWind ?? g._launcher?._previewWind }
})
console.log(JSON.stringify(info))
// dra från korven en bit bakåt så pricklinjen ritas
const peka = (x, y, typ) => page.evaluate(({ x, y, typ }) => {
  const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); const s = Math.min(r.width / 1280, r.height / 720)
  c.dispatchEvent(new PointerEvent(typ, { clientX: r.left + r.width / 2 + (x - 640) * s, clientY: r.top + r.height / 2 + (y - 360) * s, pointerId: 1, pointerType: 'mouse', button: 0, buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
}, { x, y, typ })
const held = await page.evaluate(async () => { const g = (await import('/src/games/registry.js')).getGame('bajs-och-kiss'); return { x: g._held.x, y: g._held.y } })
await peka(held.x, held.y, 'pointerdown')
for (let i = 1; i <= 6; i++) { await peka(held.x - i * 14, held.y + i * 10, 'pointermove'); await page.waitForTimeout(30) }
await page.waitForTimeout(300)
await page.screenshot({ path: '.test-shots/_dag-pruttvind.png' })
await peka(held.x - 84, held.y + 60, 'pointerup')
await page.waitForTimeout(2500)
await page.screenshot({ path: '.test-shots/_dag-pruttvind-2.png' })
console.log('fel', fel.length, fel.slice(0, 3))
await b.close()
