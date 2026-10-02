// ENHÖRNINGEN ELVIRA — molnets fjäder i riktig webbläsare, två kast otåligt (P1, dag 2026-10-02 D7)
//
//   node scripts/_dag-elvira-spel.mjs        (kräver dev-servern på :5173)
//
// Harnessen drar aldrig ett moln och släpper aldrig Elvira på ett. Sonden drar ett moln ur facket
// med riktig mus till under startpunkten, släpper Elvira rakt ner (spelets _launch), och följer
// molnets nedtryckning (moln.komp) och Elviras högsta läge efter studsen. Två kast i rad: andra
// kastet går så fort spelet tillåter (spamtryck på Hoppa under flygningen). Sist: exit mitt i en studs.
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'enhorningen-elvira' }))
  await page.waitForTimeout(2500)

  const kast = []
  for (let runda = 0; runda < 2; runda++) {
    await page.waitForFunction(() => window.__barnspel.game._state === 'placing', null, { timeout: 15000 })
    // Ett synligt moln som inte ligger i luften redan.
    const fran = await page.evaluate(() => {
      const g = window.__barnspel.game
      const c = g._clouds.find((q) => q.view.visible)
      const p = c.view.getGlobalPosition()
      return { x: p.x, y: p.y }
    })
    await page.mouse.move(fran.x, fran.y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) await page.mouse.move(fran.x + (200 - fran.x) * i / 8, fran.y + (470 - fran.y) * i / 8)
    await page.mouse.up()
    await page.waitForTimeout(350)
    const r = await page.evaluate(async () => {
      const g = window.__barnspel.game
      const ctx = window.__barnspel.ctx
      const raf = () => new Promise((res) => requestAnimationFrame(res))
      const c = g._clouds.find((q) => q.moln && Math.abs(q.view.x - 200) < 40)
      if (!c) return { fel: 'inget moln placerat', moln: g._clouds.map((q) => [q.view.x, q.view.y, !!q.moln]) }
      g._launch(ctx, { vx: 0.2, vy: 0 })
      let kompMax = 0, landad = false, minYefter = 9999, yLand = null, ut = false
      for (let f = 0; f < 240; f++) {
        await raf()
        const k = c.moln.komp
        if (k > kompMax) kompMax = k
        const y = g._elvira.y, x = g._elvira.x
        if (x < 0 || x > 1280 || y < 0 || y > 720) ut = true
        if (!landad && k > 3) { landad = true; yLand = y }
        if (landad && y < minYefter) minYefter = y
        if (f === 30 || f === 60) g._hoppa?.onTap?.() // otåligt — knappen är avstängd under flygningen
      }
      return { kompMax: +kompMax.toFixed(1), landad, studsHojd: yLand != null ? +(yLand - minYefter).toFixed(1) : null, ut, state: g._state }
    })
    kast.push(r)
    // Till nästa kast så fort spelet SJÄLVT tillåter (väntan överst i loopen); läget där hon står då:
    await page.waitForFunction(() => window.__barnspel.game._state === 'placing', null, { timeout: 15000 }).catch(() => {})
    r.efterAt = await page.evaluate(() => { const g = window.__barnspel.game; return [Math.round(g._elvira.x), Math.round(g._elvira.y), g._state] })
  }
  // Exit mitt i en studs.
  await page.waitForFunction(() => window.__barnspel.game._state === 'placing', null, { timeout: 15000 }).catch(() => {})
  await page.evaluate(async () => {
    const g = window.__barnspel.game
    g._launch(window.__barnspel.ctx, { vx: 0.2, vy: 0 })
    for (let f = 0; f < 40; f++) await new Promise((r) => requestAnimationFrame(r))
    window.__barnspel.nav.go('menu')
  })
  await page.waitForTimeout(1500)
  console.log(JSON.stringify({ kast, antalFel: errors.length, errors: errors.slice(0, 5) }, null, 2))
} finally {
  await browser.close()
}
