// Nattkörning: öppnar ett spel, gör handlingar med RIKTIG mus (designkoordinater 1280×720) och
// tar skärmdumpar vid givna tider efter sista handlingen. Räknar konsolfel.
//   node scripts/_natt-skott.mjs <id> [--klick x,y]… [--fore "<js på g>"] [--vanta 1500]
//        [--skott 400,1500] [--namn suffix]   → .test-shots/_natt-<id>-<suffix>-<ms>.png
import { chromium } from 'playwright'
const args = process.argv.slice(2)
const id = args[0]
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const flera = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []))
const klick = flera('--klick').map((s) => s.split(',').map(Number))
const fore = opt('--fore', null)
const vanta = Number(opt('--vanta', 1500))
const skott = opt('--skott', '400,1500').split(',').map(Number)
const namn = opt('--namn', 'a')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.stack || e).slice(0, 300)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel)
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  await page.waitForFunction((id) => window.__barnspel.game?.id === id, id)
  await page.waitForTimeout(vanta)
  if (fore) console.log('fore →', JSON.stringify(await page.evaluate((s) => { const g = window.__barnspel.game; const ctx = window.__barnspel.ctx; return eval(s) }, fore)))
  const box = await page.locator('canvas').first().boundingBox()
  const k = Math.min(box.width / 1280, box.height / 720)
  const ox = box.x + (box.width - 1280 * k) / 2, oy = box.y + (box.height - 720 * k) / 2
  for (const [x, y] of klick) { await page.mouse.click(ox + x * k, oy + y * k); await page.waitForTimeout(120) }
  let t0 = 0
  for (const ms of skott) {
    await page.waitForTimeout(ms - t0); t0 = ms
    const p = `.test-shots/_natt-${id}-${namn}-${ms}.png`
    await page.screenshot({ path: p }); console.log(p)
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(600)
} finally { await browser.close() }
console.log(`konsolfel: ${fel.length}`); fel.slice(0, 4).forEach((f) => console.log('  ' + f))
