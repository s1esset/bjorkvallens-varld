// Stockens flythöjd över tid (grodan-slurp/dammen.js) — sjunker den, eller svänger den bara?
//   node scripts/_dammstock.mjs   (dev-servern på :5173)
import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('pageerror', (e) => fel.push(String(e.message).slice(0, 200)))
  page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel?.app, null, { timeout: 15000 })
  const ut = await page.evaluate(async () => {
    const { PhysicsWorld } = await import('/src/lib/physics.js')
    const { Dammen } = await import('/src/games/grodan-slurp/dammen.js')
    const app = window.__barnspel.app
    const C = app.stage.constructor
    const rot = new C()
    app.stage.addChild(rot)
    const lager = { himmel: new C(), bakom: new C(), vatten: new C(), fram: new C() }
    rot.addChild(lager.himmel, lager.bakom, lager.vatten, lager.fram)
    const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
    const d = new Dammen({ phys, lager, audio: null, tid: 'eftermiddag', view: null })
    let steg = 0
    phys.beforeStep(() => steg++)
    let t = 0
    const prov = []
    let rutor = 0
    const stegPerRuta = {}
    await new Promise((klar) => {
      const tick = (tk) => {
        const f = steg
        t += tk.deltaMS / 1000
        d.steg(t)
        phys.update(tk.deltaMS)
        d.rita(tk.deltaMS / 1000, t)
        stegPerRuta[steg - f] = (stegPerRuta[steg - f] || 0) + 1
        rutor++
        if (rutor % 12 === 0) {
          const b = d._stock.body
          prov.push([+t.toFixed(2), +b.position.y.toFixed(1), +b.velocity.y.toFixed(2), +d.flytvolym.nedsankning(b).toFixed(2)])
        }
        if (t > 6) { app.ticker.remove(tick); klar() }
      }
      app.ticker.add(tick)
    })
    const b = d._stock.body
    const r = { massa: +b.mass.toFixed(2), radieBounds: +((b.bounds.max.y - b.bounds.min.y) / 2).toFixed(1), prov, stegPerRuta }
    d.destroy(); phys.destroy(); rot.destroy({ children: true })
    return r
  })
  console.log(`massa ${ut.massa} · halvhöjd ${ut.radieBounds} · steg/bildruta ${JSON.stringify(ut.stegPerRuta)}`)
  for (const p of ut.prov) console.log(`t ${p[0]}  y ${p[1]}  vy ${p[2]}  nedsänkt ${p[3]}`)
  console.log(`konsolfel ${fel.length}`, fel.slice(0, 5))
} finally { await browser.close() }
