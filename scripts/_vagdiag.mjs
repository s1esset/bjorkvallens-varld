// _vagdiag.mjs — strandens vågor: hur långt fram och tillbaka en groda som FLYTER i havet gungar
// (det barnet ser), mot samma groda med vågorna avstängda. En runda per arm, samma värld.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(800)
const ut = {}
for (const arm of ['vagor', 'kontroll']) {
  ut[arm] = await page.evaluate(async (arm) => {
    const g = window.__barnspel.game
    g._tvingaBiom = 'strand'
    g._rivVarld()
    g._byggVarld(g._ctx)
    g._hinderKlocka = -9999
    const d = g._dammen
    if (arm === 'kontroll') {
      d.biom = { ...d.biom, vagor: null }
      d.flytvolym.stromX = 0
    }
    // Fritt vatten ute i havet, långt från allt fast.
    const lx = d._x(d._plan.kustU + 380)
    let x = lx
    for (let f = 0; f < 300; f++) {
      const k = d._x(d._plan.kustU + 300 + Math.random() * 900)
      if (d.foremal.every((o) => o.typ === 'strand' || Math.abs(o.body.position.x - k) > 230)) { x = k; break }
    }
    g._groda.teleportera(x, 575, 1)
    g._idle = -999 // ingen simhjälp (den simmar hem efter 3,5 s stilla)
    await new Promise((r) => setTimeout(r, 1200))
    const xs = []
    const t0 = performance.now()
    while (performance.now() - t0 < 9000) {
      g._idle = -999
      xs.push(g._groda.pos.x)
      await new Promise((r) => setTimeout(r, 100))
    }
    return { sving: Math.round(Math.max(...xs) - Math.min(...xs)), netto: Math.round(xs[xs.length - 1] - xs[0]), landDir: d._plan.landDir, lage: g._groda.lage }
  }, arm)
}
console.log(JSON.stringify(ut))
await b.close()
