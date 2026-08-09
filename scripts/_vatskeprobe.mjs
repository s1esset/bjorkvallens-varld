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
      const ctx = window.__barnspel.ctx
      // Tre kända former: spel med mjuk auto-hjälp löser sig själva bit för bit, spel
      // med en stenbricka får sina stenar utlagda över hindret, och spel där man SLÄPPER
      // saker i vätskan (plask-i-vattnet) får alla hyllans föremål i tanken. Det senare
      // är hela poängen där: ett tomt kärl mäter bara att vattnet ligger still.
      if (g._onDrop && g._drag?.items) {
        for (const rec of g._drag.items.filter((r) => !r.placed)) {
          rec.placed = true
          g._onDrop(ctx, rec)
        }
      } else if (g._autoHelp) {
        for (let i = 0; i < 40; i++) g._autoHelp(ctx)
      } else if (g._placeFree && g._stones) {
        const L = g._lavaLeft
        const R = g._lavaRight
        const n = g._stones.length
        g._stones.forEach((s, i) => g._placeFree(ctx, s, L + ((R - L) * (i + 1)) / (n + 1)))
      }
    })
    await page.waitForTimeout(1200)
  }

  const cdp = await page.context().newCDPSession(page)
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  const matning = await page.evaluate(async (sek) => {
    // __barnspel.game är den KÖRANDE instansen; en egen import kan ge en annan
    // modulinstans så fort Vite HMR-stämplat filen.
    const g = window.__barnspel.game
    const app = window.__barnspel.app
    // Vätskan hittas på FORM, inte på namn: spelen döper sitt fält olika
    // (_fluid, _lava, _world) och en sond som gissar namnet rapporterar -1.
    const varld = Object.values(g).find((v) => v && typeof v === 'object' && typeof v.spawn === 'function' && 'radius' in v && 'count' in v)
    const vy = Object.values(g).find((v) => v && typeof v === 'object' && v.layer && v._thr)
    const u = vy?._thr?.resources?.fluidUniforms?.uniforms?.uColor
    const mal = u ? [Math.round(u[0] * 255), Math.round(u[1] * 255), Math.round(u[2] * 255)] : null
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
        // Ytans höjd är det enda sättet att veta om bassängen är rätt fylld. En
        // stapel med 5 % marginal, så ett enstaka stänk i luften inte får bestämma.
        let ytaY = -1
        if (varld?.count) {
          const ys = []
          for (let i = 0; i < varld.count; i++) ys.push(varld.y[i])
          ys.sort((a, b) => a - b)
          ytaY = Math.round(ys[Math.floor(ys.length * 0.05)])
        }
        prov.push({
          ms: Math.round(t),
          ytaY,
          partiklar: varld?.count ?? -1,
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
    // Pixlarna jämförs mot vätskans EGEN kroppsfärg (läst ur shaderns uniform), inte
    // mot ett handskrivet "är den blå?". Första versionen räknade scenens ljusblå
    // himmel som vatten och rapporterade 10 % täckning i en tom scen.
    let vatskePix = 0
    if (mal) {
      for (let i = 0; i < d.length; i += 4) {
        const dr = d[i] - mal[0]
        const dg = d[i + 1] - mal[1]
        const db = d[i + 2] - mal[2]
        if (dr * dr + dg * dg + db * db < 3600) vatskePix++
      }
    }
    return { prov, fps: Number((rutor / sekTot).toFixed(1)), farg: mal, vatskePix, dukPix: g2.width * g2.height }
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
  const efterAter = await page.evaluate(() => {
    const g = window.__barnspel.game
    if (!g) return -1
    const v = Object.values(g).find((x) => x && typeof x === 'object' && typeof x.spawn === 'function' && 'radius' in x && 'count' in x)
    return v?.count ?? -1
  })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)

  console.log(JSON.stringify({ id, cpu: CPU, losa, ...matning, efterAter, shot, errors }, null, 2))
} finally {
  await browser.close()
}
