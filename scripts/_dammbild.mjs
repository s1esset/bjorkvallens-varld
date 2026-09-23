// DAMMEN I BILD — grodan-slurp/dammen.js ensam, utan spelet runt omkring.
//
//   node scripts/_dammbild.mjs [morgon|eftermiddag|skymning[:v|:h] ...]   (kräver dev-servern på :5173)
//   ':v' / ':h' tvingar trädets sida (första Math.random i konstruktorn), annars slumpas den.
//
// Monterar BARA `Dammen` ovanpå appens scen (fyra egna lager i samma ordning som spelet),
// stegar fysik + scen på appens ticker och lägger en enkel grön "grod-klump" (dynamisk cirkel)
// på startbladet — så syns det om bladet bär, om vattnet tonar det som är under ytan och om
// bladet sjunker av tyngden. Tre bilder per tid: vila · plask (våg + droppar + bladtryck +
// kvack) · mitt i grodkören. Sist körs rivningen och ALLT publikt anropas en gång till efter
// `destroy()` — konsolfelen räknas över hela körningen.
//
// Mäter också det som bilden inte visar: stockens läge efter några sekunder (inom u-gränsen?),
// klumpens läge (vilar den på bladet?) och bladkroppens nedsjunkning under last.
//
// BRED=1: 1600×720-fönster, designytan centrerad och view = −160…1440 — så syns bleed-kanterna
// (himmel, vatten, botten, strand, förgrundsvassen som ska följa skärmkanten).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const TIDER = process.argv.slice(2).length ? process.argv.slice(2) : ['morgon', 'eftermiddag', 'skymning']
const UT = '.test-shots'
const BRED = !!process.env.BRED
const VP = BRED ? { width: 1600, height: 720 } : { width: 1280, height: 720 }
mkdirSync(UT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let felTotalt = 0
try {
  const page = await browser.newPage({ viewport: VP })
  const fel = []
  page.on('pageerror', (e) => fel.push((e.message || String(e)).slice(0, 200)))
  page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 200)))
  const varn = []
  page.on('console', (m) => m.type() === 'warning' && varn.push(m.text().slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel?.app, null, { timeout: 15000 })
  await page.waitForTimeout(600)

  for (const arg of TIDER) {
    const [tid, sida] = arg.split(':')
    const info = await page.evaluate(async ({ tid, sida, BRED }) => {
      const { PhysicsWorld } = await import('/src/lib/physics.js')
      const { Dammen, YT_Y } = await import('/src/games/grodan-slurp/dammen.js')
      const app = window.__barnspel.app
      const C = app.stage.constructor
      const G = (await import('/src/lib/form.js')).rimLight(1).constructor // Graphics-klassen
      if (window.__damm) window.__damm.riv()
      const rot = new C()
      rot.scale.set(BRED ? 1 : app.screen.width / 1280)
      if (BRED) rot.x = 160
      app.stage.addChild(rot)
      const lager = { himmel: new C(), bakom: new C(), vatten: new C(), fram: new C() }
      const grodLager = new C()
      rot.addChild(lager.himmel, lager.bakom, grodLager, lager.vatten, lager.fram)
      const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
      const orig = Math.random
      let forsta = !!sida
      Math.random = () => (forsta ? ((forsta = false), sida === 'v' ? 0.2 : 0.8) : orig())
      let d
      try {
        d = new Dammen({ phys, lager, audio: window.__barnspel.audio, tid, view: BRED ? { left: -160, right: 1440, top: 0, bottom: 720, width: 1600, height: 720 } : { left: 0, right: 1280, top: 0, bottom: 720, width: 1280, height: 720 } })
      } finally {
        Math.random = orig
      }
      // En enkel "groda": dynamisk cirkel på startpunkten.
      const klump = phys.circle(d.startPunkt.x, d.startPunkt.y, 30, { density: 0.002, friction: 0.8, label: 'groda' })
      const kv = new C()
      const kg = new G()
      kg.circle(0, 0, 30).fill(0x3fbf4f).circle(-10, -14, 7).fill(0xffffff).circle(10, -14, 7).fill(0xffffff)
      kv.addChild(kg)
      grodLager.addChild(kv)
      phys.link(klump, kv)
      d.flytvolym.lagg(klump, { flyt: 1.6 })
      let t = 0
      const tick = (tk) => {
        const dt = tk.deltaMS / 1000
        t += dt
        d.steg(t)
        phys.update(tk.deltaMS)
        d.rita(dt, t)
        d.grodungar.titta(klump.position.x, klump.position.y)
      }
      app.ticker.add(tick)
      window.__damm = {
        d, phys, klump, YT_Y,
        riv() {
          app.ticker.remove(tick)
          d.destroy()
          phys.destroy()
          rot.destroy({ children: true })
          window.__damm = null
        },
      }
      return {
        tid: d.tid,
        sida: d._sida,
        blad: d.blad.map((b) => ({ x: Math.round(b.x), bredd: Math.round(b.bredd) })),
        foremal: d.foremal.map((f) => f.typ),
        start: d.startPunkt,
        stock: Math.round(d._stock.body.position.x),
        stenar: d._plan.stenar.map((s) => Math.round(d._x(s.u))),
      }
    }, { tid, sida, BRED })
    console.log(`\n=== ${info.tid} · träd ${info.sida === 'v' ? 'vänster' : 'höger'} ===`)
    console.log(`blad ${JSON.stringify(info.blad)} · start ${JSON.stringify(info.start)} · stenar ${info.stenar} · stock x ${info.stock}`)
    console.log(`foremal: ${info.foremal.join(', ')}`)

    await page.waitForTimeout(2200)
    const vila = await page.evaluate(() => {
      const { d, klump } = window.__damm
      const b0 = d.blad[0]
      const s = d._stock.body
      return {
        klump: { x: Math.round(klump.position.x), y: Math.round(klump.position.y) },
        blad0Sank: +(b0.body.position.y - b0._y0).toFixed(2),
        andraBladSank: d.blad.slice(1).map((b) => +(b.body.position.y - b._y0).toFixed(2)),
        stock: { x: Math.round(s.position.x), y: Math.round(s.position.y), vinkel: +s.angle.toFixed(2) },
        uGrans: [Math.round(d._plan.stockU0), d._plan.stockU1],
        stockU: Math.round(d._u(s.position.x)),
      }
    })
    console.log(`vila: klump ${JSON.stringify(vila.klump)} (bladets topp ${554}) · blad0 sjunkit ${vila.blad0Sank} px · övriga ${JSON.stringify(vila.andraBladSank)}`)
    console.log(`      stock ${JSON.stringify(vila.stock)} · u ${vila.stockU} inom ${JSON.stringify(vila.uGrans)}`)
    await page.screenshot({ path: `${UT}/dammbild${BRED ? "-bred" : ""}-${tid}${sida ? "-" + sida : ""}-vila.png` })

    await page.evaluate(() => {
      const { d } = window.__damm
      d.plask(640, 1)
      d.plask(900, 0.4)
      d.bladTryck(d.blad[0].body, 1)
      d.grodungar.kvack(4)
      d.grodungar.heja()
    })
    await page.waitForTimeout(260)
    await page.screenshot({ path: `${UT}/dammbild${BRED ? "-bred" : ""}-${tid}${sida ? "-" + sida : ""}-plask.png` })
    const vag = await page.evaluate(() => {
      const { d } = window.__damm
      let mx = 0
      for (let x = 0; x <= 1280; x += 10) mx = Math.max(mx, Math.abs(d.ytaVid(x) - 560))
      return { maxUtslag: +mx.toFixed(1), droppar: d._dropp.length, blad0: +(d.blad[0].body.position.y - d.blad[0]._y0).toFixed(2) }
    })
    console.log(`plask: ytans största utslag ${vag.maxUtslag} px · droppar i luften ${vag.droppar} · blad0 ${vag.blad0} px`)

    const kor = await page.evaluate(() => ({ langd: window.__damm.d.grodungar.kor(), x: window.__damm.d.grodungar._bladC.x }))
    // Sista tonen (alla tre i ackord) börjar 1,66 s in — säckarna är störst ~0,2 s senare.
    await page.waitForTimeout(1860)
    await page.screenshot({ path: `${UT}/dammbild${BRED ? "-bred" : ""}-${tid}${sida ? "-" + sida : ""}-kor.png` })
    await page.screenshot({ path: `${UT}/dammbild${BRED ? "-bred" : ""}-${tid}${sida ? "-" + sida : ""}-ungar.png`, clip: { x: Math.round(kor.x - 150 + (BRED ? 160 : 0)), y: 600, width: 300, height: 120 } })
    console.log(`kör: ${kor.langd} s`)
    await page.waitForTimeout(700)
  }

  // Rivning + allt publikt EFTER destroy — ska vara tyst.
  const efter = await page.evaluate(() => {
    const { d, phys } = window.__damm
    const kvar = () => phys.world.bodies.filter((b) => b.label !== 'wall' && b.label !== 'groda').length
    const fore = kvar()
    d.destroy()
    const kropparEfter = kvar()
    d.steg(99)
    d.rita(0.016, 99)
    d.plask(500, 1)
    d.bladTryck(null, 1)
    d.grodungar.kvack(2)
    d.grodungar.heja()
    const k = d.grodungar.kor()
    d.destroy()
    window.__damm.riv()
    return { fore, kropparEfter, korEfter: k }
  })
  console.log(`\nrivning: dammens kroppar ${efter.fore} → ${efter.kropparEfter} · kor() efter destroy = ${efter.korEfter}`)
  await page.waitForTimeout(400)
  felTotalt = fel.length
  console.log(`konsolfel: ${fel.length} · varningar: ${varn.length}`)
  for (const v of [...new Set(varn)].slice(0, 8)) console.log('  varning: ' + v)
  for (const f of fel.slice(0, 12)) console.log('  ' + f)
} finally {
  await browser.close()
}
process.exit(felTotalt ? 1 : 0)
