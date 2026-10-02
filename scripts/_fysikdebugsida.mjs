// _fysikdebugsida.mjs — F9 i webbläsaren: öppnar ett fysikspel med ?fysik och läser
// window.__fysikdebug (konturer === kroppar), konsolfel, skärmdump; sedan hem → aktiv false.
//   node scripts/_fysikdebugsida.mjs [id…] [--url http://localhost:5173]
// Kontrollarm: samma spel UTAN ?fysik → window.__fysikdebug ska saknas (ingen kostnad).
import { chromium } from 'playwright'
const arg = process.argv.slice(2)
const ui = arg.indexOf('--url')
const BAS = ui >= 0 ? arg[ui + 1] : 'http://localhost:5173'
const ids = arg.filter((a, i) => !a.startsWith('--') && arg[i - 1] !== '--url')
const SPEL = ids.length ? ids : ['vippbradan', 'grodan-slurp']
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function kor(id, fysik) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
  page.on('pageerror', (e) => fel.push(String(e)))
  await page.goto(BAS + (fysik ? '/?fysik' : '/'), { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(3500)
  const d = await page.evaluate(() => window.__fysikdebug ? JSON.parse(JSON.stringify(window.__fysikdebug)) : null)
  if (fysik) await page.screenshot({ path: `.test-shots/_fysikdebug-${id}.png` })
  let efter = null
  if (fysik) {
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(800)
    efter = await page.evaluate(() => window.__fysikdebug ? JSON.parse(JSON.stringify(window.__fysikdebug)) : null)
  }
  await page.close()
  return { d, efter, fel }
}
for (const id of SPEL) {
  const k = await kor(id, false)
  console.log(`${id} KONTROLL utan ?fysik: __fysikdebug ${k.d ? 'FINNS (fel)' : 'saknas ✓'} · konsolfel ${k.fel.length}`)
  const m = await kor(id, true)
  console.log(`${id} ?fysik: ${JSON.stringify(m.d)}`)
  console.log(`   konturer===kroppar: ${m.d && m.d.konturer === m.d.kroppar && m.d.kroppar > 0 ? '✓' : '✗'} · efter hem: ${JSON.stringify(m.efter)} · konsolfel ${m.fel.length}`)
  for (const f of m.fel.slice(0, 5)) console.log('   FEL', f.slice(0, 200))
}
await browser.close()
