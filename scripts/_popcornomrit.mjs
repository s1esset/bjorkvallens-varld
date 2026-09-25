// POPCORNKALASET B0 — vad kostar det att rita om N mjuka popcorn varje bildruta?
//
//   node scripts/_popcornomrit.mjs              (kräver dev-servern på :5173)
//
// En mjuk kropp (`Mjukkropp.path()`) ritas om VARJE bildruta under poppen, ~41 steg. Pixi v8
// triangulerar en Graphics först när den RENDERAS, så en tidtagning runt spelets `_update`
// ensam hade missat halva kostnaden. Sonden stämplar därför hela bildrutans arbete: en
// ticker-lyssnare med högsta prioritet (före spelet) och en med lägsta (efter Pixis render).
//
// Kontrollarmarna först (CLAUDE.md: "en mätning som inte kan skilja två KÄNDA lägen åt säger
// ingenting"): N = 0 är golvet, och en BARLAST som bränner känd tid i bildrutan måste flytta
// talet med ungefär sin egen storlek — annars mäter sonden något annat än bildrutans arbete.
// Bildruteintervallet (rAF) rapporteras inte: det klipps av vsync och kan inte skilja lägen åt.
import { chromium } from 'playwright'

const N_LISTA = [0, 4, 8, 16, 24]
const VARV = 3
const CPU = Number(process.argv.includes('--cpu') ? process.argv[process.argv.indexOf('--cpu') + 1] : 4)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let fel = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
  await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
  await page.waitForTimeout(1200)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  // Stämplarna: före allt och efter Pixis render.
  await page.evaluate(() => {
    const t = window.__barnspel.ctx.ticker
    const m = (window.__omrit = { start: 0, ms: [], barlast: 0, pa: false })
    m.fore = () => { m.start = performance.now(); if (m.barlast) { const s = performance.now(); while (performance.now() - s < m.barlast) { /* bränn */ } } }
    m.efter = () => { if (m.pa) m.ms.push(performance.now() - m.start) }
    t.add(m.fore, null, 1000)
    t.add(m.efter, null, -1000)
  })

  const mat = async (n, barlast = 0) => {
    const varv = []
    for (let v = 0; v < VARV; v++) {
      const r = await page.evaluate(async ({ n, barlast }) => {
        const g = window.__barnspel.game
        if (g._korn.length < n + 2) g._fyllPase()
        const m = window.__omrit
        m.barlast = barlast
        m.ms = []
        await new Promise((r) => setTimeout(r, 200))
        m.pa = true
        window.__popcorn.poppa(n)
        await new Promise((r) => setTimeout(r, 600)) // poppen varar ~41 steg ≈ 0,7 s
        m.pa = false
        m.barlast = 0
        const s = m.ms.slice().sort((a, b) => a - b)
        const mjuka = g._pop.filter((p) => p.mjuk).length
        return { median: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)], rutor: s.length, mjuka }
      }, { n, barlast })
      varv.push(r)
      await page.waitForTimeout(700)
    }
    const med = (k) => varv.map((r) => r[k]).sort((a, b) => a - b)[1]
    return { median: med('median'), p90: med('p90'), rutor: med('rutor') }
  }

  console.log(`\nB0 — bildrutans arbete (uppdatering + render), CPU-strypning ×${CPU}, median av ${VARV} varv\n`)
  const bas = await mat(0)
  const bar = await mat(0, 4)
  console.log(`  kontroll N=0             median ${bas.median.toFixed(2)} ms · p90 ${bas.p90.toFixed(2)} ms · ${bas.rutor} rutor`)
  console.log(`  kontroll N=0 + barlast 4 median ${bar.median.toFixed(2)} ms · p90 ${bar.p90.toFixed(2)} ms`)
  const flytt = bar.median - bas.median
  const mätarenRör = flytt > 3 && flytt < 6
  console.log(`  ${mätarenRör ? '✓' : '✗'} barlasten flyttar mätaren ${flytt.toFixed(2)} ms (väntat ≈ 4)`)
  if (!mätarenRör) fel++
  for (const n of N_LISTA.slice(1)) {
    const r = await mat(n)
    console.log(`  N=${String(n).padStart(2)}  median ${r.median.toFixed(2)} ms (+${(r.median - bas.median).toFixed(2)}) · p90 ${r.p90.toFixed(2)} ms · ${((r.median - bas.median) / n).toFixed(3)} ms per kropp`)
  }
  console.log(`\n  konsolfel: ${errors.length}${errors.length ? '\n   ' + errors.slice(0, 5).join('\n   ') : ''}`)
  if (errors.length) fel++
} finally {
  await browser.close()
}
process.exit(fel ? 1 : 0)
