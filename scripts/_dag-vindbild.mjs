// SYNS VINDEN? (F4-kunderna, dag 2026-10-02 D13) — slår på spelets vind med spelets EGEN väg,
// tar en skärmdump mitt i blåsten och lämnar sedan otåligt mitt i den (två rundor).
//
//   node scripts/_dag-vindbild.mjs <id> [--url …]
//   spindelhjalten     `_cycleWind(ctx)`            (vindknappen: av → höger)
//   enhorningen-elvira `_applyWind(1)`              (Medvind)
//   flugan-pa-nasan    `_blas(ctx)`                 (fläkten blåser)
//   sapbubblor         `_blow(ctx, fans[0], 700, 260)` (en puff från vänster fläkt)
//   bowling            `_autoHelp(ctx)`             (vindbyn välter käglorna)
//   fallskarmen        ingen handling — skikten blåser av sig själva (nivån sätts till 4)
// Skärmdump: .test-shots/_dag-vind-<id>.png · MÄTNING 0 konsolfel över två rundor med exit mitt i vinden.
import { chromium } from 'playwright'

const ID = process.argv[2]
const URL = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const VANTA = { spindelhjalten: 900, 'enhorningen-elvira': 900, 'flugan-pa-nasan': 450, sapbubblor: 350, bowling: 600, fallskarmen: 1500 }
if (!(ID in VANTA)) { console.log('ange spel-id'); process.exit(2) }
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  for (const runda of [1, 2]) {
    if (runda > 1) { await page.evaluate(() => window.__barnspel.nav.go('menu')); await page.waitForTimeout(300) }
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(runda === 1 ? 3500 : 1800)
    const svar = await page.evaluate((id) => {
      const g = window.__barnspel.game, ctx = window.__barnspel.ctx
      try {
        if (id === 'spindelhjalten') g._cycleWind(ctx)
        else if (id === 'enhorningen-elvira') g._applyWind(1)
        else if (id === 'flugan-pa-nasan') g._blas(ctx)
        else if (id === 'sapbubblor') g._blow(ctx, g._fans[0], 700, 260)
        else if (id === 'bowling') g._autoHelp(ctx)
        else if (id === 'fallskarmen') g._loadLevel?.(ctx, 4)
        return 'ok'
      } catch (e) { return String(e).slice(0, 160) }
    }, ID)
    ok(`runda ${runda}: spelets vindväg gick att anropa`, svar === 'ok', svar)
    await page.waitForTimeout(VANTA[ID])
    if (runda === 1) {
      await page.screenshot({ path: `.test-shots/_dag-vind-${ID}.png` })
      await page.waitForTimeout(VANTA[ID])
      await page.screenshot({ path: `.test-shots/_dag-vind-${ID}-2.png` })
    }
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(800)
  ok('0 konsolfel (två rundor, exit mitt i vinden)', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
console.log(fel ? `\n✗ ${fel} fel` : '\n✓ grönt')
process.exit(fel ? 1 : 0)
