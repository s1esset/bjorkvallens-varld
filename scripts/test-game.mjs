// Huvudlöst test av ett spel via Playwright + systemets Chrome (channel 'chrome',
// ingen nedladdning). Oberoende av MCP/extension. Navigerar till spelet, trycker
// brett över ytan, kör en exit-cykel (spel->bibliotek->spel->meny) och rapporterar
// konsolfel + sparar en skärmdump.
//
//   node scripts/test-game.mjs <id> [--shot out.png] [--taps "x,y;x,y"] [--url http://localhost:5173]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const id = args[0]
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : def
}
const url = opt('--url', 'http://localhost:5173')
const shot = opt('--shot', `test-${id}.png`)
const tapsArg = opt('--taps', '')
// Dragspel: --drag "fx,fy>tx,ty;fx,fy>tx,ty" gör riktiga musdrag (peka-ner,
// flytta i steg, släpp). Om --drag anges hoppas standardtrycken över.
const dragArg = opt('--drag', '')
const drags = dragArg
  ? dragArg.split(';').map((seg) => seg.split('>').map((p) => p.split(',').map(Number)))
  : []
const defaultTaps = [
  [300, 250], [640, 250], [950, 250],
  [300, 450], [640, 450], [950, 450],
  [480, 600], [800, 600], [640, 360],
]
const taps = tapsArg
  ? tapsArg.split(';').map((p) => p.split(',').map(Number))
  : drags.length
    ? []
    : defaultTaps

if (!id) {
  console.error('usage: node scripts/test-game.mjs <id> [--shot out.png] [--taps "x,y;x,y"]')
  process.exit(2)
}

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 300)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  // gå in i spelet
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(1200)

  // tryck brett över ytan (träffar de flesta interaktiva element)
  for (const [x, y] of taps) {
    await page.evaluate(({ x, y }) => {
      const cv = document.querySelector('canvas')
      const r = cv.getBoundingClientRect()
      for (const t of ['pointerdown', 'pointerup']) {
        cv.dispatchEvent(new PointerEvent(t, {
          clientX: r.left + x, clientY: r.top + y,
          pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
        }))
      }
    }, { x, y })
    await page.waitForTimeout(260)
  }

  // riktiga musdrag (för dragspel)
  for (const [[fx, fy], [tx, ty]] of drags) {
    await page.mouse.move(fx, fy)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(fx + ((tx - fx) * i) / 12, fy + ((ty - fy) * i) / 12)
      await page.waitForTimeout(22)
    }
    await page.mouse.up()
    await page.waitForTimeout(550)
  }

  await page.waitForTimeout(900)
  await page.screenshot({ path: shot })

  // exit-säkerhetscykel: spel -> bibliotek -> spel -> meny (mitt i ev. animationer)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(700)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(400)

  console.log(JSON.stringify({ id, errors, shot, errorCount: errors.length }, null, 2))
} finally {
  await browser.close()
}
process.exit(errors.length ? 1 : 0)
