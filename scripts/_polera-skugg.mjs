// Polering 2026-09-30: `skuggmatchning` — harnessen drar aldrig en sak till RÄTT skugga
// (drag/ratt 0). Sonden drar från föremålets FAKTISKA läge på bänken till dess skugga på filten
// (riktiga musdrag), släpper först en sak på FEL skugga (snäppytan får inte flytta sig), spelar
// två rundor otåligt och går ut mitt i en rundfinal.
//   node scripts/_polera-skugg.mjs
import { chromium } from 'playwright'

const ID = 'skuggmatchning'
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
  await page.waitForTimeout(1800)

  // Par: föremålets skärmläge → rätt skuggas skärmläge (+ en FEL skugga).
  const par = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const ut = []
    for (const m of g._items) {
      if (m._done || m.container.destroyed) continue
      const t = g._drag.targets.find((q) => !q.view.destroyed && q.accepts({ key: m.key }))
      const f = g._drag.targets.find((q) => !q.view.destroyed && !q.accepts({ key: m.key }))
      if (!t) continue
      const a = m.container.toGlobal({ x: 0, y: -m.foot * 0.5 })
      const b = t.view.toGlobal({ x: 0, y: 0 })
      const c = f ? f.view.toGlobal({ x: 0, y: 0 }) : null
      ut.push({ a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, fel: c && { x: c.x, y: c.y, vx: f.view.x, vy: f.view.y } })
    }
    return { niva: g._level, placerade: g._placed, par: ut, resolving: g._resolving }
  })
  const dra = async (a, b) => {
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 })
    await page.mouse.move(b.x, b.y, { steps: 6 })
    await page.mouse.up()
  }

  // Fel släpp först
  let s = await par()
  const start = s.niva
  if (s.par[0]?.fel) {
    const fore = s.par[0].fel
    await dra(s.par[0].a, s.par[0].fel)
    await page.waitForTimeout(700)
    const efter = await page.evaluate((f) => {
      const g = window.__barnspel.game
      const t = g._drag.targets.find((q) => Math.abs(q.view.x - f.vx) < 1 && Math.abs(q.view.y - f.vy) < 1)
      return t ? { x: t.view.x, y: t.view.y } : null
    }, fore)
    ok('fel släpp: snäppytan står still', efter && efter.x === fore.vx && efter.y === fore.vy, JSON.stringify(efter))
    ok('fel släpp: ingenting placerat', (await par()).placerade === 0, '')
  }

  // Två rundor, otåligt
  const t0 = Date.now()
  let drag = 0
  while (Date.now() - t0 < 90000) {
    s = await par()
    if (s.niva >= start + 2) break
    if (s.resolving || !s.par.length) { await page.mouse.click(400, 300); await page.waitForTimeout(150); continue }
    await dra(s.par[0].a, s.par[0].b)
    drag++
    await page.waitForTimeout(250)
  }
  s = await par()
  ok('två rundor klaras med riktiga drag', s.niva >= start + 2, `nivå ${start} → ${s.niva}, ${drag} drag på ${Math.round((Date.now() - t0) / 1000)} s`)
  await page.screenshot({ path: '.test-shots/_polera-skugg-runda3.png' })

  // Exit mitt i en rundfinal
  const t1 = Date.now()
  while (Date.now() - t1 < 40000) {
    s = await par()
    if (s.resolving) break
    if (s.par.length) await dra(s.par[0].a, s.par[0].b)
    await page.waitForTimeout(200)
  }
  const felFore = errors.length
  await page.waitForTimeout(300)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('exit mitt i finalen: 0 nya konsolfel', errors.length === felFore, `${errors.length - felFore} nya`)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 4).join(' | ') || '—')
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn} · ${r.text}`)
console.log(rader.every((r) => r.ok) ? '\nALLT GRÖNT' : '\nNÅGOT ÄR RÖTT')
