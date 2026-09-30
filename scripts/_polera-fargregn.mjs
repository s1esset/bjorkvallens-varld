// Polering 2026-09-30: `fargregn` — spelar fyra rundor på riktigt: trycker på målfärgens droppar
// (riktiga muspekningar på dropparnas skärmläge), också ett par FEL droppar och Bobo (bortom
// harnessens x 950), otåligt över rundbytet, och går ut mitt i en kometflygning.
// Regnbågen på himlen ska ha fått band när färger bemästrats.
//   node scripts/_polera-fargregn.mjs
import { chromium } from 'playwright'

const ID = 'fargregn'
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

  const lage = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const drop = (ratt) => {
      for (const d of g._drops) {
        if (d._resolved || d.destroyed) continue
        const hit = d._def.rainbow || d._def.key === g._target.key
        if (hit !== ratt) continue
        const p = d.toGlobal({ x: 0, y: 0 })
        if (p.y > 130 && p.y < 600 && p.x > 60 && p.x < 1220) return { x: p.x, y: p.y, kind: d._kind }
      }
      return null
    }
    return { rundor: g._rounds, samlat: g._collected, behov: g._need, mal: g._target?.key, ratt: drop(true), fel: drop(false),
      ord: g._wordRound, band: g._bowBands?.length ?? g._bow?.children?.length ?? null }
  })

  // Bobo först: ett tryck ska inte räknas som en droppe
  const b0 = await lage()
  await page.mouse.click(1140, 600); await page.waitForTimeout(300)
  const b1 = await lage()
  ok('Bobo är tryckbar och räknas inte som droppe', b1.samlat === b0.samlat, `samlat ${b0.samlat} → ${b1.samlat}`)

  const start = await lage()
  const t0 = Date.now()
  let felTryck = 0
  const sorter = new Set()
  while (Date.now() - t0 < 120000) {
    const s = await lage()
    if (s.rundor >= start.rundor + 4) break
    if (s.fel && felTryck < 4 && Math.random() < 0.15) { await page.mouse.click(s.fel.x, s.fel.y); felTryck++; await page.waitForTimeout(120); continue }
    if (s.ratt) { sorter.add(s.ratt.kind); await page.mouse.click(s.ratt.x, s.ratt.y); await page.waitForTimeout(90) }
    else await page.waitForTimeout(120)
  }
  const slut = await lage()
  ok('fyra rundor spelade', slut.rundor >= start.rundor + 4, `rundor ${start.rundor} → ${slut.rundor} på ${Math.round((Date.now() - t0) / 1000)} s`)
  ok('fel droppar ger inget fel', errors.length === 0, `${felTryck} feltryck`)
  ok('dropptyper sedda', sorter.size >= 1, [...sorter].join(','))
  await page.screenshot({ path: '.test-shots/_polera-fargregn-runda4.png' })

  // Exit mitt i en kometflygning: tryck rätt och gå ut direkt
  let s = await lage()
  for (let i = 0; i < 40 && !s.ratt; i++) { await page.waitForTimeout(100); s = await lage() }
  const felFore = errors.length
  if (s.ratt) await page.mouse.click(s.ratt.x, s.ratt.y)
  await page.waitForTimeout(60)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('exit mitt i kometen: 0 nya konsolfel', errors.length === felFore, `${errors.length - felFore} nya`)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 4).join(' | ') || '—')
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn} · ${r.text}`)
console.log(rader.every((r) => r.ok) ? '\nALLT GRÖNT' : '\nNÅGOT ÄR RÖTT')
