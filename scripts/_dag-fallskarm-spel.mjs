// FALLSKÄRMEN — gräsmattans fjäder i riktig webbläsare, två rundor otåligt (P1, dag 2026-10-02 D7)
//
//   node scripts/_dag-fallskarm-spel.mjs        (kräver dev-servern på :5173)
//
// Låter hopparen falla av sig själv två rundor i rad (andra rundan med Tung), spamtrycker under
// studsen och nivåbytet, och loggar per runda: studsens högsta läge över marken (px), djupaste
// inpressning, antal nedslag och om hoppararen lämnade bild. Sist: exit mitt i en studs.
import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'fallskarmen' }))
  await page.waitForTimeout(2000)
  const rundor = []
  for (let runda = 0; runda < 2; runda++) {
    if (runda === 1) await page.mouse.click(140, 600) // tyngdknappen → Tung
    const r = await page.evaluate(async () => {
      const g = window.__barnspel.game
      const raf = () => new Promise((res) => requestAnimationFrame(res))
      const forra = g._gras
      let sett = false, minY = 9999, maxY = -9999, slag = 0, ut = false, f = 0
      for (; f < 1200; f++) {
        await raf()
        const c = g._chute
        if (c && !c.destroyed && (c.y < 0 || c.y > 720 || c.x < 0 || c.x > 1280)) ut = true
        const gr = g._gras
        if (gr && gr !== forra) {
          sett = true
          minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y); slag = Math.max(slag, gr.slagN)
          if (gr.klar) break
        }
      }
      return { landade: sett, studsOverMark: +(560 - minY).toFixed(1), djupast: +(maxY - 560).toFixed(1), nedslag: slag, ut, rutor: f }
    })
    // otåligt: tryck under nivåbytet
    for (let i = 0; i < 6; i++) { await page.mouse.click(640 + (i % 2 ? 200 : -200), 400); await page.waitForTimeout(60) }
    rundor.push(r)
  }
  // Exit mitt i en studs.
  await page.evaluate(async () => {
    const g = window.__barnspel.game
    const forra = g._gras
    for (let f = 0; f < 1200 && (!g._gras || g._gras === forra); f++) await new Promise((r) => requestAnimationFrame(r))
    for (let f = 0; f < 10; f++) await new Promise((r) => requestAnimationFrame(r))
    window.__barnspel.nav.go('menu')
  })
  await page.waitForTimeout(1500)
  console.log(JSON.stringify({ rundor, antalFel: errors.length, errors: errors.slice(0, 5) }))
} finally { await browser.close() }
