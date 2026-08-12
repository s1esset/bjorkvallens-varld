// Skärmdump av inställningsskärmen — den enda skärm ingen testkörning öppnar.
// `npm run test` går rakt in i ett spel, så ett fel i panelernas geometri (rader
// som spiller ut ur sin ruta, paneler som möter DATA-raden) är osynligt för sviten.
//
//   node scripts/_installningsbild.mjs            → .test-shots/_installningar.png
//   node scripts/_installningsbild.mjs --enklare  → med "Enklare grafik" påslagen
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const ENKLARE = process.argv.includes('--enklare')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  if (ENKLARE) {
    // Genom appens EGEN SaveService — att peta i localStorage direkt träffar ett tomt
    // dokument i en färsk kontext (samma fälla som `_nivabild.mjs` dokumenterar).
    await page.evaluate(() => {
      window.__barnspel.save.update((d) => { d.settings.enklareGrafik = true })
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  }

  await page.evaluate(() => window.__barnspel.nav.go('settings'))
  await page.waitForTimeout(900)

  const fil = `.test-shots/_installningar${ENKLARE ? '-enklare' : ''}.png`
  writeFileSync(fil, await page.screenshot())

  const niva = await page.evaluate(async () => {
    const f = await import('/src/lib/form.js')
    return { niva: f.detaljniva(), sparad: window.__barnspel.save.data.settings.enklareGrafik }
  })
  console.log(`  ${fil}`)
  console.log(`  detaljnivå ${niva.niva} · sparad enklareGrafik: ${niva.sparad}`)
  console.log(`  konsolfel: ${fel.length}`)
  if (fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }

  // Städa så nästa körning inte ärver läget.
  if (ENKLARE) {
    await page.evaluate(() => {
      window.__barnspel.save.update((d) => { d.settings.enklareGrafik = false })
    })
  }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
