// _satsprobe.mjs — syns grodan-slurps sats INOM 100 ms efter trycket? (P0: ljud+bild < 100 ms)
//   node scripts/_satsprobe.mjs
// Pixelsvängning i en ruta runt grodan, med ALLT UTOM grodans tre lager dolt (vatten, insekter och
// bladgupp gav annars 750–4 490 px brus): före trycket mot 90 ms efter. Armar: kontroll = samma
// 90 ms utan tryck (grodans vilorörelse), head = tryck men den omedelbara hukningen avslagen
// (`_laddT` negativt → bilden följer bara satsen, som före ändringen), ny = tryck.
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(1500)
await page.evaluate(() => {
  const g = window.__barnspel.game
  for (const [n, c] of Object.entries(g._L)) c.visible = n.startsWith('groda')
  g._ctx.fxLayer.visible = false
})
const las = () => page.evaluate(() => {
  const g = window.__barnspel.game
  const k = g._groda.pos
  const p = g._scen.toGlobal({ x: k.x, y: k.y })
  const c = document.querySelector('canvas').getBoundingClientRect()
  const s = c.width / 1280
  return { x: c.left + p.x * s, y: c.top + p.y * s }
})
function diff(a, bb) {
  const A = PNG.sync.read(a)
  const B = PNG.sync.read(bb)
  let n = 0
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2])
    if (d > 40) n++
  }
  return n
}
const ut = { kontroll: [], head: [], ny: [] }
for (let v = 0; v < 6; v++) {
  for (const arm of ['kontroll', 'head', 'ny']) {
    // Vänta tills grodan sitter still igen.
    await page.waitForFunction(() => { const g = window.__barnspel.game; return !g._super && !g._ladd }, null, { timeout: 15000 })
    // Frys grodans egna ögonblick: blinkningen, blicken och kvacket (annars ett brus på 200–4 200 px).
    await page.evaluate(() => {
      const g = window.__barnspel.game
      g._groda._nastaBlink = 1e9
      g._kvackKlocka = 1e9
      g._svarm.lista.forEach((i) => g._svarm.ata(i))
      const sp = g._dammen.startPunkt
      g._groda.teleportera(sp.x, sp.y)
    })
    await page.waitForTimeout(1300)
    await page.waitForTimeout(400)
    const p = await las()
    const clip = { x: p.x - 110, y: p.y - 90, width: 220, height: 170 }
    const fore = await page.screenshot({ clip })
    if (arm !== 'kontroll') {
      await page.mouse.move(p.x, p.y)
      await page.mouse.down()
      if (arm === 'head') await page.evaluate(() => { window.__barnspel.game._groda._laddT = -1e9 })
    }
    await page.waitForTimeout(90)
    const efter = await page.screenshot({ clip })
    ut[arm].push(diff(fore, efter))
    if (arm !== 'kontroll') {
      await page.mouse.up()
      await page.waitForTimeout(1800)
    }
  }
}
console.log(JSON.stringify(ut))
await b.close()
