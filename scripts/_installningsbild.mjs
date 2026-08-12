// Skärmdump av inställningsskärmen — den enda skärm ingen testkörning öppnar.
// `npm run test` går rakt in i ett spel, så ett fel i panelernas geometri är osynligt
// för sviten. Sonden byggdes när en sjätte rad lades till i ljudpanelen och krockade
// med DATA-knapparna: de är CENTRERADE på sin y (632 ⇒ 590–674), så panelen som "slutade
// på 610" låg redan under dem. Raden är borta igen (LYFTPLAN C10), sonden är kvar.
//
//   node scripts/_installningsbild.mjs   → .test-shots/_installningar.png
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  await page.evaluate(() => window.__barnspel.nav.go('settings'))
  await page.waitForTimeout(900)
  writeFileSync('.test-shots/_installningar.png', await page.screenshot())

  console.log('  .test-shots/_installningar.png')
  console.log(`  konsolfel: ${fel.length}`)
  if (fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
