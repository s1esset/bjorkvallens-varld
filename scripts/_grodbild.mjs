// _grodbild.mjs — ritar grodan-slurps ragdoll-groda i några lägen och sparar en PNG.
//
//   node scripts/_grodbild.mjs [--ut .test-shots/_grodbild.png]
//
// Kör i dev-serverns sida (vite transformerar importerna) men på en EGEN Pixi-duk ovanpå
// appen: sitt (efter 3 s vila), mitt i ett hopp, dinglande i tungan under en gren, slak efter
// en smäll, och vänd åt vänster. Varje groda har en egen liten fysikvärld.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const UT = argv.includes('--ut') ? argv[argv.indexOf('--ut') + 1] : '.test-shots/_grodbild.png'

const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push(String(e.message)))
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
const res = await page.evaluate(async () => {
  const PIXI = await import('/scripts/_grodbild-pixi.js')
  const { Groda } = await import('/src/games/grodan-slurp/groda.js')
  const { Tunga } = await import('/src/games/grodan-slurp/tunga.js')
  const { PhysicsWorld } = await import('/src/lib/physics.js')
  const app = new PIXI.Application()
  await app.init({ width: 1280, height: 720, background: 0xcfeecf, antialias: true })
  app.canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'
  document.body.appendChild(app.canvas)
  app.ticker.stop()
  const lagen = [
    { namn: 'sitt', x: 160, riktning: 1 },
    { namn: 'hopp', x: 400, riktning: 1 },
    { namn: 'dingla', x: 660, riktning: 1 },
    { namn: 'slak', x: 860, riktning: 1 },
    { namn: 'vand', x: 1130, riktning: -1 },
    { namn: 'matt', x: 160, riktning: 1, y: 300 },
  ]
  const ut = []
  for (const l of lagen) {
    const phys = new PhysicsWorld({ gravityY: 1, walls: [] })
    phys.engine.positionIterations = 8
    phys.engine.velocityIterations = 6
    phys.engine.constraintIterations = 5
    const my = l.y ? l.y + 40 : 600
    const mark = new PIXI.Graphics().rect(l.x - 110, my, 220, 30).fill(0x6b8f4a)
    app.stage.addChild(mark)
    phys.rectangle(l.x, my + 30, 220, 60, { isStatic: true, label: 'mark' })
    const c = { bak: new PIXI.Container(), mitt: new PIXI.Container(), fram: new PIXI.Container() }
    const tl = new PIXI.Container()
    app.stage.addChild(c.bak, c.mitt, c.fram, tl)
    const g = new Groda(phys, c, { x: l.x, y: (l.y || 560), riktning: l.riktning })
    g.ytY = 5000
    phys.beforeStep(() => g.steg())
    let tunga = null
    if (l.namn === 'dingla') {
      const gren = phys.rectangle(l.x + 40, 250, 200, 24, { isStatic: true, label: 'gren' })
      app.stage.addChild(new PIXI.Graphics().rect(l.x - 60, 238, 200, 24).fill(0x7a5230))
      tunga = new Tunga({ groda: g, lager: tl, ytY: 5000, hitta: { kropp: () => ({ body: gren, x: l.x + 30, y: 245 }), insekt: () => null }, pa: { traffKropp() { g.lage = 'dingla' }, traffInsekt() {}, at() {}, bom() {}, vatten() {}, slappt() {} } })
      phys.beforeStep(() => tunga.steg())
    }
    for (let i = 0; i < 150; i++) phys.update(1000 / 60)
    if (l.namn === 'hopp') {
      g.hoppa(1)
      for (let i = 0; i < 16; i++) phys.update(1000 / 60)
    }
    if (l.namn === 'dingla') {
      tunga.skjut(l.x + 30, 245)
      for (let i = 0; i < 150; i++) phys.update(1000 / 60)
    }
    if (l.namn === 'slak') {
      g.slappna(1)
      g.knuffa(3, -7, 1)
      for (let i = 0; i < 40; i++) phys.update(1000 / 60)
    }
    g.setMage(l.namn === 'slak' || l.namn === 'matt' ? 1 : 0)
    g.tittMal = { x: l.x + 200 * l.riktning, y: 200 }
    for (let i = 0; i < 20; i++) g.rita(1 / 60)
    tunga?.rita()
    const t = new PIXI.Text({ text: l.namn, style: { fontSize: 22, fill: 0x224422 } })
    t.position.set(l.x - 30, (l.y ? l.y + 90 : 650))
    app.stage.addChild(t)
    ut.push({ namn: l.namn, x: Math.round(g.pos.x), y: Math.round(g.pos.y), lage: g.lage, kraft: Math.round(g.kraft * 100) / 100 })
  }
  app.renderer.render(app.stage)
  return ut
})
await page.waitForTimeout(200)
await page.screenshot({ path: UT })
console.log(JSON.stringify({ ut: UT, lagen: res, fel }, null, 1))
await b.close()
