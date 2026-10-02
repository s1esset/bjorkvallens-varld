// SAFTBAREN — klipper FluidView.area någon saft? (O2, dag 2026-10-02 D6)
//
//   node scripts/_dag-saftbaren-area.mjs        (kräver dev-servern på :5173)
//
// Fryser vätskan, lägger testdroppar i HÖRNEN av den yta saften kan nå (ett lyft glas
// står som högst på y 300 → kanten 64; glasen dras x 120–1160 ± 84) och räknar vätskans
// pixlar med ALLT annat dolt (metod ⓷), för tre ytor i samma bildruta (botten: gallret — under det är barens framsida ogenomskinlig):
//   förval  = bibliotekets hela yta (HEAD-läget, kontrollarmen)
//   spelets = den yta spelet sätter nu
//   snål    = en medvetet för liten yta — MÅSTE tappa pixlar, annars mäter sonden inget
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'saftbaren' }))
  await page.waitForTimeout(1800)

  const res = await page.evaluate(async () => {
    const { game: g, app } = window.__barnspel
    const w = g._world
    const v = g._view
    const R = v.layer.boundsArea.constructor
    const spelets = v.layer.boundsArea.clone()
    w.update = () => {}
    w.clear()
    const pts = [[40, 70], [1240, 70], [40, 612], [1240, 612], [640, 300]]
    for (const [x, y] of pts) for (let i = 0; i < 12; i++) w.spawn(x + (i % 4) * 7, y + Math.floor(i / 4) * 7)
    // Dölj allt utom vätskelagret, nivå för nivå upp till scenen.
    const dolda = []
    let n = v.layer
    while (n.parent) {
      for (const s of n.parent.children) if (s !== n && s.visible) { s.visible = false; dolda.push(s) }
      n = n.parent
    }
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const rakna = () => {
      app.renderer.render(app.stage)
      const cv = app.canvas
      const c2 = document.createElement('canvas')
      c2.width = cv.width; c2.height = cv.height
      const cx = c2.getContext('2d')
      cx.drawImage(cv, 0, 0)
      const d = cx.getImageData(0, 0, c2.width, c2.height).data
      const bg = [d[0], d[1], d[2]]
      let px = 0
      let ovan = 0 // ovanför gallrets överkant (614) — det enda som syns i spelet
      const yMax = Math.floor((608 / 720) * c2.height)
      for (let i = 0; i < d.length; i += 4) {
        const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2]
        if (dr * dr + dg * dg + db * db > 900) { px++; if (i / 4 / c2.width < yMax) ovan++ }
      }
      return { px, ovan }
    }
    const ut = {}
    for (const [namn, yta] of [
      ['forval', new R(-120, -240, 1520, 1080)],
      ['spelets', spelets],
      ['snal', new R(200, 200, 880, 300)],
      ['spelets2', spelets],
    ]) {
      v.layer.boundsArea = yta
      v.update()
      await frame()
      ut[namn] = { ...rakna(), yta: [yta.x, yta.y, yta.width, yta.height], rt: Math.round(yta.width * 0.5) * Math.round(yta.height * 0.5) }
    }
    for (const s of dolda) s.visible = true
    return ut
  })
  console.log(JSON.stringify({ ...res, errors }, null, 2))
} finally {
  await browser.close()
}
