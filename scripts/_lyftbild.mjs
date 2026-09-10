// unika-knytt — BILDERNA till poleringsrundan 2026-09-10. `_knyttlyftprobe` mäter att noderna
// finns och gör rätt; bara en bild svarar på om de LÄSER rätt — om en not ser ut som en not,
// om kronan sitter på hjässan eller svävar, om en ny sak krockar med sina grannar.
//
//   node scripts/_lyftbild.mjs [--bara tratt,krona]
//
// Sparar i .test-shots/:
//   knytt-tratt.png       noterna mitt i flykten från Ljudtratten in i glaset (steg 2)
//   knytt-krona.png       tre kronknytt (generation 1) på hyllan i verkstan (steg 2)
//   knytt-krona-bod.png   samma tre i Knyttboden, r 44 (steg 2)
//
// ⚠️ Kör ALDRIG bredvid en annan webbläsarsond eller `npm run test:all`.
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const arg = process.argv.slice(2)
const BARA = arg.includes('--bara') ? new Set(arg[arg.indexOf('--bara') + 1].split(',')) : null
const vill = (n) => !BARA || BARA.has(n)

// Tre frön som ger hornet `krona` i generation 1, med olika öron (runda · häng · spetsiga).
// Hittade med dnaFromSeed(fro, { …, gen: 1 }).horn === 3 — plats 8 = 1 är generationen.
const KRONOR = [
  [551606264, 7, 2, 0, 1, 0, 0, 0, 1],
  [2079321745, 0, 2, 0, 0, 0, 0, 0, 1],
  [1941324913, 4, 2, 0, 2, 0, 0, 0, 1],
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(900)
  const besok = async (lista) => {
    await page.evaluate((l) => {
      const dag = Math.floor(Date.now() / 86400000)
      window.__barnspel.ctx.progress.setCustom('knytt', { v: 2, lista: l, n: l.length, firad: 99, dag, torka: 0, fram: 0 })
    }, lista)
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(400)
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1500)
  }
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const X = (x) => geo.x0 + x * geo.s
  const Y = (y) => geo.y0 + y * geo.s
  const klick = (x, y) => page.mouse.click(X(x), Y(y))
  const bort = () => page.mouse.move(X(200), Y(120))

  if (vill('tratt')) {
    await besok([])
    await klick(800, 630)
    // Andra noten har just lämnat tratten och den första är halvvägs in i glaset.
    await page.waitForTimeout(330)
    await page.screenshot({ path: '.test-shots/knytt-tratt.png' })
    console.log('  .test-shots/knytt-tratt.png')
    await page.waitForTimeout(900)
  }

  if (vill('krona')) {
    await besok(KRONOR)
    await bort()
    await page.waitForTimeout(400)
    await page.screenshot({ path: '.test-shots/knytt-krona.png' })
    console.log('  .test-shots/knytt-krona.png')
    await klick(1160, 612)
    await page.waitForTimeout(900)
    await bort()
    await page.waitForTimeout(200)
    await page.screenshot({ path: '.test-shots/knytt-krona-bod.png' })
    console.log('  .test-shots/knytt-krona-bod.png')
    const horn = await page.evaluate(() => window.__barnspel.game._bon.map((b) => b.knytt?._dna?.horn))
    console.log(`  hyllans horn: ${horn.join(' · ')} (3 = krona)`)
    await klick(1160, 628) // dörren
    await page.waitForTimeout(500)
  }

  // Kronan i FULL storlek: knyttet föds i sin värld (r 92). Kupans frö sätts till ett
  // kronfrö — spaken rullar bara fröet om det saknas, så ceremonin bygger exakt den individen.
  if (vill('krona-stor')) {
    await besok([])
    await page.evaluate(([fro, f, v]) => {
      const g = window.__barnspel.game
      g._fro = fro
      g._val.f = f
      g._val.v = v
      g._tvingaTier = 0
      g._synkaVerktyg()
      g._kupa?.setVal(g._val)
    }, [KRONOR[1][0], KRONOR[1][1], KRONOR[1][4]])
    await klick(1160, 350)
    await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 })
    for (let i = 0; i < 4; i++) { await klick(640, 470); await page.waitForTimeout(260) }
    await page.waitForFunction(() => window.__barnspel.game._klar === true, null, { timeout: 20000 })
    await page.waitForTimeout(700) // kompisen landar på kronan
    await bort()
    await page.waitForTimeout(150)
    await page.screenshot({ path: '.test-shots/knytt-krona-stor.png' })
    const d = await page.evaluate(() => ({ horn: window.__barnspel.game._dna?.horn, kompis: window.__barnspel.game._knytt?.kompis }))
    console.log(`  .test-shots/knytt-krona-stor.png · horn ${d.horn} · kompis ${d.kompis}`)
  }

  console.log(`  ${errors.length} konsolfel${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`)
} finally {
  await browser.close()
}
