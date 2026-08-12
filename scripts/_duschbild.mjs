// TVÄTTA DJURET — duschen i bild (underlag för N3-beslutet).
//
//   node scripts/_duschbild.mjs        (kräver dev-servern på :5173)
//
// Frågan passet ska svara på: läser den nuvarande sprayen som vatten, eller är den
// en rad ritade cirklar? Duschen bärs av en egen integrator där VARJE droppe också
// är mekanik (`_rinseAt` vid nedslaget), så ett byte till SPH är inte en portning
// utan en ändring av spelet. Bilden får avgöra om det är värt det.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const UT = '.test-shots'
mkdirSync(UT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('pageerror', (e) => fel.push((e.message || String(e)).slice(0, 160)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'tvatta-djuret' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._spray, null, { timeout: 15000 })
  await page.waitForTimeout(900)

  const tal = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const vanta = (n = 1) => new Promise((r) => {
      let i = 0
      const s = () => (++i >= n ? r() : requestAnimationFrame(s))
      requestAnimationFrame(s)
    })
    // Lås upp duschen och håll den över djuret. `_nozzle` är den punkt sprayen föds ur.
    g._showerReady = true
    g._sprayOn = true
    g._nozzle = { x: 640, y: 210 }
    for (let i = 0; i < 90; i++) { g._sprayOn = true; g._nozzle = { x: 640, y: 210 }; await vanta(1) }
    // Hur långt isär ligger partiklarna? Det avgör om de kan läsa som en stråle.
    const f = g._fluid
    let summa = 0
    let par = 0
    for (let i = 0; i < f.count; i++) {
      let nara = 1e9
      for (let j = 0; j < f.count; j++) {
        if (i === j) continue
        nara = Math.min(nara, Math.hypot(f.x[i] - f.x[j], f.y[i] - f.y[j]))
      }
      if (nara < 1e8) { summa += nara; par++ }
    }
    return { droppar: f.count, medelGrannavstand: par ? +(summa / par).toFixed(1) : null, radie: f.radius }
  })

  await page.screenshot({ path: `${UT}/tvatta-dusch.png` })
  console.log(`  ${UT}/tvatta-dusch.png`)
  console.log(`\n  droppar i luften: ${tal.droppar} · medelavstånd till närmaste granne: ${tal.medelGrannavstand} px · droppradie ~${tal.radie} px`)
  console.log(`  konsolfel: ${fel.length ? fel.slice(0, 2).join(' | ') : 'inga'}\n`)
} finally {
  await browser.close()
}
