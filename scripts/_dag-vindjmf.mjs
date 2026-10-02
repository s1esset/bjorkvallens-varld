// D11 engångssond: studsa-ner — ger Vindfalt samma kraft som gamla _fanForce, i det levande spelet?
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel)
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'studsa-ner' }))
await page.waitForTimeout(2600)
const peka = (dx, dy, typ) => page.evaluate(({ dx, dy, typ }) => {
  const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); const s = Math.min(r.width / 1280, r.height / 720)
  c.dispatchEvent(new PointerEvent(typ, { clientX: r.left + r.width / 2 + (dx - 640) * s, clientY: r.top + r.height / 2 + (dy - 360) * s, pointerId: 1, pointerType: 'mouse', button: 0, buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
}, { dx, dy, typ })
await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('studsa-ner')
  g._fanSide = 0; g._fanY = 380; g._placeFan(); g._balls.forEach((x) => (x.settled = true))
  for (let i = 0; i < 40 && !g._fanBlaser(); i++) await new Promise((r) => setTimeout(r, 200))
  const v = g._vind
  window.__vj = { steg: 0, aktiv: 0, iBand: 0, kraftNy: 0, kraftGammal: 0, dvx: 0, n: 0 }
  const ut = window.__vj
  const orig = v._steg.bind(v)
  v._steg = () => {
    ut.steg++
    if (v.aktiv) ut.aktiv++
    for (const ball of g._balls) {
      if (ball.settled) continue
      const p = ball.body.position
      const dy = Math.abs(p.y - 380); const langs = p.x - 116
      if (dy <= 104 && langs >= 0 && langs <= 1150) { ut.iBand++; ut.kraftGammal += 110 * (1 - 0.6 * langs / 1150) * (1 - dy / 104) }
      const l = v.luftVid(p.x, p.y); if (l) ut.kraftNy += l.vx
      ball._vx0 = ball.body.velocity.x
    }
    const f0 = g._balls.map((x) => x.body.force.x)
    orig()
    g._balls.forEach((x, i) => { if (!x.settled && x.body.force.x !== f0[i]) ut.n++ })
  }
})
await peka(640, 60, 'pointerdown'); await peka(640, 60, 'pointerup')
await page.waitForTimeout(2400)
console.log(JSON.stringify(await page.evaluate(() => window.__vj)))
await b.close()
