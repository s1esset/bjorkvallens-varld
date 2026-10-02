// Nattkörning F4: pysballongen i poppa-ballonger. Bygger nivå 3 tills en pys finns, trycker på den
// med en RIKTIG mus på dess läge, samplar läget under flykten (håller den sig i bild, utanför
// skalets hörn?) och spelar två rundor otåligt. node scripts/_natt-pys.mjs  (kräver :5173)
import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.stack || e).slice(0, 300)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel)
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'poppa-ballonger' }))
  await page.waitForFunction(() => window.__barnspel.game?.id === 'poppa-ballonger')
  await page.waitForTimeout(1200)
  for (let runda = 0; runda < 2; runda++) {
    let n = 0
    for (let k = 0; k < 10 && !n; k++) {
      n = await page.evaluate(() => {
        const g = window.__barnspel.game; g._level = 3; g._build(window.__barnspel.ctx)
        return g._balloons.filter((b) => b._type === 'pys').length
      })
    }
    await page.waitForTimeout(900)
    const p = await page.evaluate(() => {
      const g = window.__barnspel.game
      const b = g._balloons.find((b) => b._type === 'pys' && !b.destroyed)
      const r = b.getGlobalPosition(); const s = window.__barnspel.app?.stage?.scale?.x || 1
      return { x: r.x, y: r.y, rem: g._remaining }
    })
    // global = canvaspixlar; canvas ligger i sidan (letterbox) — mappa via canvasens rect
    const box = await page.locator('canvas').first().boundingBox()
    const cw = await page.evaluate(() => document.querySelector('canvas').width)
    const k = box.width / cw
    await page.mouse.click(box.x + p.x * k, box.y + p.y * k)
    const spar = []
    for (let t = 0; t < 40; t++) {
      await page.waitForTimeout(200)
      spar.push(await page.evaluate(() => {
        const g = window.__barnspel.game
        const b = g._balloons.find((b) => b._type === 'pys' && b._flyg && !b.destroyed)
        return b ? [b.x | 0, b.y | 0] : null
      }))
    }
    const fl = spar.filter(Boolean)
    const xs = fl.map((q) => q[0]), ys = fl.map((q) => q[1])
    const horn = fl.filter((q) => q[0] < 250 && q[1] < 190).length
    const efter = await page.evaluate(() => ({ rem: window.__barnspel.game._remaining, flyg: window.__barnspel.game._pysFlyg }))
    console.log(`runda ${runda + 1}: pys ${n} · flög ${fl.length * 0.2}s · x ${Math.min(...xs)}–${Math.max(...xs)} · y ${Math.min(...ys)}–${Math.max(...ys)} · hörnet ${horn} · rem ${p.rem}→${efter.rem} · pysFlyg ${efter.flyg}`)
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(800)
} finally { await browser.close() }
console.log(`konsolfel: ${fel.length}`); fel.slice(0, 4).forEach((f) => console.log('  ' + f))
