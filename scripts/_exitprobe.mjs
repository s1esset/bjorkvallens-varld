// Exit-säkerhet MITT I leveransanimationen. Harnessens standardcykel hinner aldrig
// fylla flaket, så den 3 s långa dumper-kör-iväg-tidslinjen testas aldrig av den.
// Sonden spelar tills lasten är full och lämnar spelet mitt i leveransen — sedan
// kollas konsolfel och tweens som lever vidare efter destroy.
//
//   node scripts/_exitprobe.mjs [ms-in-i-leveransen]
import { chromium } from 'playwright'

const vanta = Number(process.argv[2] || 1500)
const ID = 'gravmaskinen'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1400)

  const G = (src) =>
    page.evaluate(async (s) => {
      const g = (await import('/src/games/registry.js')).getGame('gravmaskinen')
      return eval(s)
    }, src)

  const cykel = async () => {
    const p = await G('({x:Math.round(g._bucket.x),y:Math.round(g._bucket.y)})')
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    for (const [x, y] of [
      [250, 500],
      [190, 530],
      [240, 545],
      [300, 535],
      [340, 515],
    ]) {
      await page.mouse.move(x, y)
      await page.waitForTimeout(45)
    }
    for (const [x, y] of [
      [420, 380],
      [600, 300],
      [865, 280],
      [865, 275],
    ]) {
      await page.mouse.move(x, y)
      await page.waitForTimeout(40)
    }
    await page.mouse.up()
    await page.waitForTimeout(900)
  }

  let varv = 0
  while (!(await G('g._resolving')) && varv < 14) {
    await cykel()
    varv++
  }
  const full = await G('g._resolving')
  console.log(full ? `full last efter ${varv} lass — lämnar spelet om ${vanta} ms` : 'NÅDDE ALDRIG full last')

  // Lämna MITT i leveransen (dumpern är på väg ut ur bild).
  await page.waitForTimeout(vanta)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)

  // Lever något kvar? Modulen ska vara död och inga tweens ska röra dess objekt.
  const efter = await G(`({
    alive: g._alive,
    rootDestroyed: !!g._root?.destroyed,
    rigDestroyed: !!g._rig?.destroyed,
    leveransAktiv: g._deliverTl ? g._deliverTl.isActive() : 'ingen tidslinje',
    tapAktiv: g._tapTl ? g._tapTl.isActive() : 'ingen tidslinje',
  })`).catch((e) => ({ fel: String(e).slice(0, 120) }))
  console.log('efter destroy:', efter)

  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(800)
  console.log('konsolfel:', errors.length ? errors : 'inga')
  process.exitCode = errors.length ? 1 : 0
} finally {
  await browser.close()
}
