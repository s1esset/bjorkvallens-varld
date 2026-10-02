// Sond: bibliotekets sorteringsknapp stegar 🆕 → 🔄 → 🔤 → 🆕 med riktiga muspekningar.
// Mäter per tryck: sparat läge (localStorage), vad rösten sa, och tar en skärmdump
// (.test-shots/_sortering-<läge>.png) så ordningen går att se. Konsolfel räknas.
//   node scripts/_sorteringprobe.mjs [url]     (dev-servern måste köra)
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('console', (m) => m.type() === 'error' && fel.push(m.text()))
page.on('pageerror', (e) => fel.push(String(e)))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.removeItem('pwagames.library.ui'))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => {
  window.__sagt = []
  const v = window.__barnspel.voice
  const orig = v.say.bind(v)
  v.say = (t, ...r) => (window.__sagt.push(t), orig(t, ...r))
})
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1200)

// Knappens designläge (LibraryScreen: DESIGN_W - edge - 104 - md - 48, edge + 52) → skärm.
const rect = await page.evaluate(() => {
  const c = document.querySelector('canvas').getBoundingClientRect()
  return { x: c.x, y: c.y, w: c.width, h: c.height }
})
const s = Math.min(rect.w / 1280, rect.h / 720)
const ox = rect.x + (rect.w - 1280 * s) / 2
const oy = rect.y + (rect.h - 720 * s) / 2
const bx = ox + 1080 * s
const by = oy + 76 * s

const las = () => page.evaluate(() => JSON.parse(localStorage.getItem('pwagames.library.ui') || '{}').sort ?? '(inget)')
const rader = [`start: ${await las()}`]
await page.screenshot({ path: '.test-shots/_sortering-start.png' })
for (let i = 0; i < 3; i++) {
  await page.mouse.click(bx, by)
  await page.waitForTimeout(900)
  const lage = await las()
  const sagt = await page.evaluate(() => window.__sagt.at(-1))
  await page.screenshot({ path: `.test-shots/_sortering-${i + 1}-${lage}.png` })
  rader.push(`tryck ${i + 1}: ${lage} · rösten: "${sagt}"`)
}
// Omladdning ska minnas läget.
await page.mouse.click(bx, by) // → updated
await page.waitForTimeout(500)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1000)
rader.push(`efter omladdning: ${await las()}`)
await page.screenshot({ path: '.test-shots/_sortering-omladdad.png' })

console.log(rader.join('\n'))
console.log(`konsolfel: ${fel.length}`)
for (const f of fel.slice(0, 5)) console.log('  ', f)
await browser.close()
