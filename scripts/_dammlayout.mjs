// Dammens slumpade layout (grodan-slurp/dammen.js) mot spec-reglerna, över många omgångar.
//   node scripts/_dammlayout.mjs [antal=300]   (dev-servern på :5173)
// Regler (docs/games/grodan-slurp.md §4a + orkestratorns beställning): 2–4 blad, bredd 130–170,
// x ∈ [220,1060], ≥ 220 px mellan mitten · startbladet är inte det närmast trädet · 1–2 stenar,
// topp 470–520, överlappar inga blad · stocken krockar inte med en sten vid start och står i
// [200,1080] · 3–6 vass vid kanterna (x < 170 eller > 1110) · startPunkt = blad[0] − 40.
import { chromium } from 'playwright'
const N = Number(process.argv[2]) || 300
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('pageerror', (e) => fel.push(String(e.message).slice(0, 200)))
  page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel?.app, null, { timeout: 15000 })
  const r = await page.evaluate(async (N) => {
    const { PhysicsWorld } = await import('/src/lib/physics.js')
    const { Dammen } = await import('/src/games/grodan-slurp/dammen.js')
    const C = window.__barnspel.app.stage.constructor
    const brott = {}
    const bokfor = (k) => (brott[k] = (brott[k] || 0) + 1)
    const antalBlad = {}
    const antalSten = {}
    for (let i = 0; i < N; i++) {
      const lager = { himmel: new C(), bakom: new C(), vatten: new C(), fram: new C() }
      const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
      const d = new Dammen({ phys, lager, audio: null, tid: ['morgon', 'eftermiddag', 'skymning'][i % 3], view: null })
      const bl = d.blad
      antalBlad[bl.length] = (antalBlad[bl.length] || 0) + 1
      if (bl.length < 2 || bl.length > 4) bokfor('bladantal')
      for (const b of bl) {
        if (b.bredd < 130 - 1e-6 || b.bredd > 170 + 1e-6) bokfor('bladbredd')
        if (b.x < 220 || b.x > 1060) bokfor('bladx')
        if (Math.abs(b.body.position.y - (554 + 7)) > 0.01) bokfor('bladhojd')
      }
      for (let a = 0; a < bl.length; a++) for (let b = a + 1; b < bl.length; b++) if (Math.abs(bl[a].x - bl[b].x) < 220 - 1e-6) bokfor('bladavstand')
      const tradX = d._x(0)
      const narmast = bl.reduce((m, b) => (Math.abs(b.x - tradX) < Math.abs(m.x - tradX) ? b : m))
      if (narmast === bl[0]) bokfor('start-narmast-tradet')
      if (Math.abs(d.startPunkt.x - bl[0].x) > 1e-6 || d.startPunkt.y !== 514) bokfor('startpunkt')
      const stenar = d.foremal.filter((f) => f.typ === 'sten')
      antalSten[stenar.length] = (antalSten[stenar.length] || 0) + 1
      if (stenar.length < 1 || stenar.length > 2) bokfor('stenantal')
      for (const s of stenar) {
        const bb = s.body.bounds
        if (bb.min.y < 470 - 0.5 || bb.min.y > 520 + 0.5) bokfor('stentopp')
        for (const b of bl) if (bb.max.x > b.x - b.bredd / 2 && bb.min.x < b.x + b.bredd / 2) bokfor('sten-over-blad')
      }
      const st = d._stock.body
      if (st.position.x < 200 || st.position.x > 1080) bokfor('stock-x')
      for (const s of stenar) if (st.bounds.max.x > s.body.bounds.min.x && st.bounds.min.x < s.body.bounds.max.x) bokfor('stock-i-sten')
      const vass = d.foremal.filter((f) => f.typ === 'vass')
      if (vass.length < 3 || vass.length > 6) bokfor('vassantal')
      for (const v of vass) {
        const x = v.body.position.x
        if (!(x < 170 || x > 1110)) bokfor('vass-x')
        if (!v.body.isSensor || !v.body.isStatic) bokfor('vass-ej-sensor')
      }
      const g = d.gren.body
      if (g.bounds.min.y < 60 || g.bounds.min.y > 230) bokfor('gren-hojd')
      if (d.foremal.find((f) => f.typ === 'gren') !== d.gren) bokfor('gren-ej-forst')
      if (!d.foremal.every((f) => f.klibb === true && f.body && f.view)) bokfor('foremal-form')
      d.destroy()
      phys.destroy()
      for (const l of Object.values(lager)) l.destroy({ children: true })
    }
    return { brott, antalBlad, antalSten }
  }, N)
  console.log(`${N} omgångar · blad ${JSON.stringify(r.antalBlad)} · stenar ${JSON.stringify(r.antalSten)}`)
  console.log(Object.keys(r.brott).length ? `BROTT: ${JSON.stringify(r.brott)}` : 'inga regelbrott')
  console.log(`konsolfel ${fel.length}`, fel.slice(0, 5))
} finally { await browser.close() }
