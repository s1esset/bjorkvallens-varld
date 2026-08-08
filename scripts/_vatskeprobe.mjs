// Vad gör vätskan EGENTLIGEN? En metaboll-vätska kan vara helt osynlig utan att ett
// enda konsolfel skrivs: partiklarna finns, sprite:sen står rätt, men efter suddning
// hamnar alfan under tröskeln och filtret skriver ut noll. Skärmdumpen visar då en
// tom scen och testet är grönt.
//
// Sonden mäter tre saker som inte går att se i koden:
//   1. ANTAL levande partiklar över tid (rinner kranen? städas spillet?)
//   2. hur många PIXLAR vätskan faktiskt målar, per färgband — mätt på duken
//   3. FPS under körning, med CPU-strypning (utan strypning mäter man ingenting)
//
//   node scripts/_vatskeprobe.mjs <id> [--sek 8] [--cpu 6] [--shot ut.png]
//   node scripts/_vatskeprobe.mjs vattenvagen --losa   (lägg lösningen först)
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const id = args[0]
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const SEK = Number(opt('--sek', 8))
const CPU = Number(opt('--cpu', 6))
const shot = opt('--shot', `.test-shots/_vatska-${id}.png`)
const losa = args.includes('--losa')

if (!id) {
  console.error('usage: node scripts/_vatskeprobe.mjs <id> [--sek 8] [--cpu 6] [--shot ut.png] [--losa]')
  process.exit(2)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(1500)

  // Spelet får lösa banan åt oss när vi vill mäta det FYLLDA läget (kranen kopplad
  // hela vägen), inte bara den läckande starten.
  if (losa) {
    await page.evaluate(() => {
      const g = window.__barnspel.game
      for (let i = 0; i < 40; i++) g._autoHelp?.(window.__barnspel.ctx)
    })
    await page.waitForTimeout(500)
  }

  const cdp = await page.context().newCDPSession(page)
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  const matning = await page.evaluate(async (sek) => {
    // __barnspel.game är den KÖRANDE instansen; en egen import kan ge en annan
    // modulinstans så fort Vite HMR-stämplat filen.
    const g = window.__barnspel.game
    const app = window.__barnspel.app
    const prov = []
    let rutor = 0
    const rakna = () => rutor++
    app.ticker.add(rakna)
    const t0 = performance.now()
    let nasta = 0
    while (performance.now() - t0 < sek * 1000) {
      await new Promise((r) => requestAnimationFrame(r))
      const t = performance.now() - t0
      if (t >= nasta) {
        nasta += 1000
        prov.push({
          ms: Math.round(t),
          partiklar: g._fluid?.count ?? -1,
          iRor: g._queue?.length ?? -1,
          fyllnad: Number((g._fill ?? -1).toFixed(2)),
        })
      }
    }
    app.ticker.remove(rakna)
    const sekTot = (performance.now() - t0) / 1000

    // Hur många pixlar målar vätskan? Läs duken och räkna pixlar som är MER blå än
    // bakgrunden — scenen är själv ljusblå, så ett enkelt "är den blå"-test ljuger.
    const cv = app.canvas
    const g2 = document.createElement('canvas')
    g2.width = cv.width
    g2.height = cv.height
    const c2 = g2.getContext('2d')
    c2.drawImage(cv, 0, 0)
    const d = c2.getImageData(0, 0, g2.width, g2.height).data
    // Bara MÄTTAD vatten-blå räknas. Scenens himmel (176,227,250) och muggens glas
    // är ljusblå de med — räknar man dem får man 10 % täckning i en tom scen, och
    // det var precis vad sondens första version rapporterade.
    let vatskePix = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const b = d[i + 2]
      if (b > 170 && r < 140 && b - r > 120) vatskePix++
    }
    return { prov, fps: Number((rutor / sekTot).toFixed(1)), vatskePix, dukPix: g2.width * g2.height }
  }, SEK)

  await page.screenshot({ path: shot })

  // Exit-säkerhet: lämna spelet MITT i strömmen och gå in igen. En FluidView äger
  // filter och hundratals sprites; rivs de fel märks det först här — eller hos
  // föräldern vars barn trycker hem mitt i ett plask.
  // Strypningen av först: med CPU 6× hinner spelet inte ens montera på 1,2 s, och
  // sonden rapporterade -1 som om vätskan vore borta.
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(1500)
  const efterAter = await page.evaluate(() => window.__barnspel.game?._fluid?.count ?? -1)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)

  console.log(JSON.stringify({ id, cpu: CPU, losa, ...matning, efterAter, shot, errors }, null, 2))
} finally {
  await browser.close()
}
