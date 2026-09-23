// _grodfinal.mjs — utlöser grodan-slurps mål direkt och fotograferar finishen längs tidslinjen:
// rapen (bubbelringen), magplasket, grodkören, complete() och den nya rundan.
//
//   node scripts/_grodfinal.mjs            → .test-shots/_grodfinal-<t>.png
//
// Mäter också att mage = 1 (rund groda), att complete() anropades exakt en gång och att den nya
// rundan byggdes (runda 2, ätna 0) — med 0 konsolfel. Kräver dev-servern.
import { chromium } from 'playwright'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(1500)
await page.evaluate(() => {
  const g = window.__barnspel.game
  window.__completes = 0
  const orig = g._ctx.progress.complete.bind(g._ctx.progress)
  g._ctx.progress.complete = (...a) => { window.__completes++; return orig(...a) }
  g._atna = 7
  g._groda.setMage(7 / 8)
  // Ät en riktig insekt (den närmaste) så hela _at-vägen körs.
  const ins = g._svarm.lista[0]
  g._svarm.fanga(ins)
  g._at(g._ctx, ins)
})
const tider = [0.3, 0.9, 1.4, 1.9, 2.4, 3.3, 4.2, 5.6, 9.5]
let forra = 0
const mage = []
for (const t of tider) {
  await page.waitForTimeout((t - forra) * 1000)
  forra = t
  await page.screenshot({ path: `.test-shots/_grodfinal-${String(t).replace('.', '_')}.png` })
  mage.push(await page.evaluate(() => ({ mage: window.__barnspel.game._groda?.mage, runda: window.__barnspel.game._runda, atna: window.__barnspel.game._atna, firar: window.__barnspel.game._firar })))
}
const completes = await page.evaluate(() => window.__completes)
console.log(JSON.stringify({ completes, mage, fel }, null, 1))
await b.close()
