// `flugan-pa-nasan`: VEM tar pekningen över syltburken? Kartlägger burkens hela `hitArea`
// (124×156 px) i ett rutnät och frågar Pixis egen träffsökning vilken nod som ligger överst.
// Grannen är lådans verktygsknappar i `_klickL`, som ligger ETT LAGER OVANFÖR burken.
//
//   node scripts/_syltprobe3.mjs
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ID = 'flugan-pa-nasan'

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1600)

  const karta = await page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    const app = window.__barnspel.app
    const bo = app.renderer.events.rootBoundary
    // `rootTarget` sätts först när en riktig händelse behandlas — sonden frågar utan händelse.
    if (!bo.rootTarget) bo.rootTarget = app.stage
    const burk = g._sylt.view
    const namn = (n) => {
      if (!n) return '—'
      if (n === burk) return 'BURK'
      const vk = g._verktygKnappar.findIndex((v) => v.knapp === n)
      if (vk >= 0) return `verktyg${vk}`
      if (n === g._flaktKlick) return 'flakt'
      const t = g._drag.targets.findIndex((t) => t.view === n)
      if (t >= 0) return `mal:${g._drag.targets[t].view._wNamn}`
      if (n === g._root) return 'root'
      return n.constructor?.name || '?'
    }
    const rader = []
    for (let dy = -78; dy <= 78; dy += 26) {
      const rad = []
      for (let dx = -62; dx <= 62; dx += 31) {
        const p = { x: burk.x + dx, y: burk.y + dy }
        const hit = bo.hitTest(p.x, p.y)
        rad.push(namn(hit))
      }
      rader.push({ dy, rad })
    }
    return { burk: { x: burk.x, y: burk.y }, rader }
  }, ID)

  console.log(`Burkens ankare: (${karta.burk.x}, ${karta.burk.y}) · hitArea (-62,-78,124,156)\n`)
  console.log('  dy      dx=-62    -31       0        +31      +62')
  for (const r of karta.rader) {
    console.log(`  ${String(r.dy).padStart(4)}   ` + r.rad.map((s) => s.padEnd(9)).join(''))
  }
} finally {
  await browser.close()
}
