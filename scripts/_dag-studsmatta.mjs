// STUDSMATTAN — två rundor otåligt (P1, dag 2026-10-02 D6)
//
//   node scripts/_dag-studsmatta.mjs        (kräver dev-servern på :5173)
//
// Harnessen drar aldrig mattan och hinner aldrig en nivå. Sonden tar alla mål i två
// rundor i följd (spelets egen _collectGoal), spamtrycker under firandet och mellan
// rundorna, drar mattan fram och tillbaka med riktig mus, och loggar kaninens högsta
// läge, landningar under firandet och konsolfel.
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'studsmatta' }))
  await page.waitForTimeout(2000)
  await page.evaluate(() => {
    const g = window.__barnspel.game
    window.__sm = { minY: 1e9, maxY: -1e9, vyUnderFirande: 0, rutor: 0 }
    const tick = () => {
      if (!window.__barnspel.game || window.__barnspel.game !== g || !g._char) return
      const s = window.__sm
      s.rutor++
      const y = g._char.position.y
      s.minY = Math.min(s.minY, y)
      s.maxY = Math.max(s.maxY, y)
      if (g._resolving && g._char.velocity.y < -3) s.vyUnderFirande++
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  const rundor = []
  for (let r = 0; r < 2; r++) {
    // Dra mattan med riktig mus (huvudkontrollen).
    const rig = await page.evaluate(() => { const g = window.__barnspel.game; return { x: g._bedX, y: g._bedY + 10 } })
    await page.mouse.move(rig.x, rig.y)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) await page.mouse.move(rig.x + Math.sin(i / 3) * 200, rig.y + (i % 2) * 60, { steps: 2 })
    await page.mouse.up()
    const fore = await page.evaluate(() => {
      const g = window.__barnspel.game
      const ctx = window.__barnspel.ctx
      const n = g._goals.filter((x) => !x.got).length
      for (const m of [...g._goals]) if (!m.got) g._collectGoal(ctx, m)
      return { mal: n, resolving: !!g._resolving }
    })
    // Otåligt: spamtryck på fångaren under firandet.
    for (let i = 0; i < 14; i++) { await page.mouse.click(200 + i * 60, 250); await page.waitForTimeout(90) }
    await page.waitForTimeout(3500)
    const efter = await page.evaluate(() => {
      const g = window.__barnspel.game
      return { nyaMal: g._goals.filter((x) => !x.got).length, resolving: !!g._resolving }
    })
    rundor.push({ fore, efter })
  }
  await page.waitForTimeout(1500)
  const sm = await page.evaluate(() => window.__sm)
  await page.screenshot({ path: '.test-shots/_dag-studsmatta.png' })
  console.log(JSON.stringify({ rundor, ...sm, errors }, null, 2))
} finally {
  await browser.close()
}
