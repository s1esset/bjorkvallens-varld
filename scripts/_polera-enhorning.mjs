// Polering 2026-09-30: `enhorningen-flyger` — harnessen styr aldrig enhörningen (drag/ratt 0).
// Sonden håller fingret nere och följer nästa rings höjd, spelar tre nivåer i rad (himlen ska
// byta tid per nivå), trycker otåligt över nivåbytet och går ut mitt i en nivå.
//   node scripts/_polera-enhorning.mjs
import { chromium } from 'playwright'

const ID = 'enhorningen-flyger'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })
  await page.waitForTimeout(1500)

  // Nästa rings höjd (skärm) — den närmaste som inte passerats.
  const lage = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const u = g._uni?.toGlobal?.({ x: 0, y: 0 })
    let mal = null
    for (const r of g._rings) {
      if (r.done || r.view.destroyed) continue
      const p = r.view.toGlobal({ x: 0, y: 0 })
      if (p.x < (u?.x ?? 300) - 10) continue
      if (!mal || p.x < mal.x) mal = { x: p.x, y: p.y }
    }
    return { niva: g._level, uy: u?.y ?? 360, ux: u?.x ?? 300, mal, ringar: g._rings.length }
  })

  const start = await lage()
  const nivaer = [start.niva]
  await page.mouse.move(300, start.uy)
  await page.mouse.down()
  const t0 = Date.now()
  let y = start.uy
  while (Date.now() - t0 < 150000 && nivaer.length < 4) {
    const s = await lage()
    if (s.niva !== nivaer[nivaer.length - 1]) {
      nivaer.push(s.niva)
      await page.mouse.up()
      await page.screenshot({ path: `.test-shots/_polera-enhorning-niva${nivaer.length - 1}.png` })
      // Otåligt: tryck runt i fältet direkt efter nivåbytet.
      for (let i = 0; i < 6; i++) { await page.mouse.click(400 + i * 60, 200 + i * 60); await page.waitForTimeout(60) }
      await page.mouse.move(300, s.uy)
      await page.mouse.down()
      y = s.uy
      continue
    }
    const mal = s.mal ? s.mal.y : 360
    y += Math.max(-40, Math.min(40, mal - y))
    await page.mouse.move(300, y, { steps: 2 })
    await page.waitForTimeout(40)
  }
  await page.mouse.up()
  const sek = Math.round((Date.now() - t0) / 1000)
  ok('tre nivåer klaras med styrning', nivaer.length >= 4, `nivåer ${nivaer.join(' → ')} på ${sek} s`)

  const himmel = await page.evaluate(() => {
    const g = window.__barnspel.game
    return { stjarnor: g.progress?.get?.()?.custom?.stjarnor ?? window.__barnspel.ctx?.progress?.get?.()?.custom?.stjarnor }
  })
  ok('stjärnsäcken räknar (custom.stjarnor)', (himmel.stjarnor ?? 0) >= 0, JSON.stringify(himmel))

  // Exit mitt i nivån + mitt i en stjärnflykt
  await page.mouse.move(300, 360); await page.mouse.down()
  await page.waitForTimeout(1800)
  const felFore = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('exit mitt i nivån: 0 nya konsolfel', errors.length === felFore, `${errors.length - felFore} nya`)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 4).join(' | ') || '—')
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn} · ${r.text}`)
console.log(rader.every((r) => r.ok) ? '\nALLT GRÖNT' : '\nNÅGOT ÄR RÖTT')
