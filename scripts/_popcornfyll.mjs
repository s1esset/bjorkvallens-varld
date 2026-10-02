// Mäter om poppande mjuka popcorn i SPELET är hela (fyllnad ≈ 1) eller en hoptryckt remsa (≈ 0,05).
//   node scripts/_popcornfyll.mjs [--url http://localhost:5174]
// Bakgrund (O1): _poppprobe sätter kroppen på startskalan med 30 steg INNAN den växer; spelets
// `_poppa` gjorde inte det, och en ring som byggts i full storlek men fått ×0,35-vilolängder
// vänder ut och in på de första stegen.
import { chromium } from 'playwright'
const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
  await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
  await page.waitForTimeout(1000)
  const r = await page.evaluate(async () => {
    const g = window.__barnspel.game
    if (g._korn.length < 8) g._fyllPase()
    window.__popcorn.poppa(6)
    const mat = []
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 90))
      const m = g._pop.filter((p) => p.mjuk).map((p) => p.mjuk.fyllnad())
      if (m.length) mat.push(Math.min(...m))
    }
    return mat
  })
  console.log('minsta fyllnad över poppande kroppar, var 90 ms:', r.map((x) => x.toFixed(2)).join(' '))
  console.log('konsolfel:', errors.length, errors.slice(0, 3).join(' | '))
} finally { await browser.close() }
