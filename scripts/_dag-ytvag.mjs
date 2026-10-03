// YTVÅGOR (F5-kunderna, dag 2026-10-03 D14) — rör sig vågen vid stöt och står den STILL i vila?
// Stöten ges med spelets EGEN väg; omritningarna räknas genom att haka spelets ritfunktion.
//
//   node scripts/_dag-ytvag.mjs <id> [--url …]
//   fargregn       `_vagStot(pöl, pöl.x, false)` på varje pöl   · ritning `_ritaVag(p)`
//   tvatta-djuret  `_vagStot(640, 4)` (som skaket efter badet)   · ritning `_ritaVag()`
//   unika-knytt    hela vägen till vattenvärlden med RIKTIGA tryck: världsverktyget (480,630) →
//                  spaken (1160,350, bortom harnessen) → ägget ×4 → tryck på vattnet (640,580)
//                  · läser `game._cer.skvalp` { vaken, rorlig, omritn, maxH }
// KONTROLLARM FÖRST: 1,5 s i vila före stöten ska ge 0 omritningar (i unika-knytt: före trycket på
// vattnet, efter att det lagt sig). MÄTNING: >0 omritningar efter stöten · 0 omritningar de sista
// 1,5 s efter att ytan lagt sig · stilla inom 8 s · två rundor, exit mitt i vågen · 0 konsolfel.
// Skärmdump: .test-shots/_dag-ytvag-<id>.png (strax efter stöten)
import { chromium } from 'playwright'

const ID = process.argv[2]
const URL = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
if (!['fargregn', 'tvatta-djuret', 'unika-knytt'].includes(ID)) { console.log('ange spel-id'); process.exit(2) }
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

  // Antal omritningar hittills (spelets egen räknare eller vår hake).
  const ritn = () => page.evaluate((id) => {
    const g = window.__barnspel.game
    if (id === 'unika-knytt') return g._cer?.skvalp?.omritn ?? -1
    return g.__ritn ?? -1
  }, ID)
  const vaken = () => page.evaluate((id) => {
    const g = window.__barnspel.game
    if (id === 'unika-knytt') return !!g._cer?.skvalp?.vaken
    if (id === 'fargregn') return g._puddles.some((p) => p._vagAktiv)
    return !!g._vagAktiv
  }, ID)

  for (const runda of [1, 2]) {
    if (runda > 1) { await page.evaluate(() => window.__barnspel.nav.go('menu')); await page.waitForTimeout(300) }
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1500)
    if (ID !== 'unika-knytt') {
      await page.evaluate(() => {
        const g = window.__barnspel.game
        g.__ritn = 0
        const orig = g._ritaVag
        g._ritaVag = function (...a) { g.__ritn++; return orig.apply(this, a) }
      })
    } else {
      // RIKTIGA tryck hela vägen till vattenvärlden.
      await page.mouse.click(480, 630)
      await page.waitForTimeout(500)
      const v = await page.evaluate(() => window.__barnspel.game._val?.v)
      ok(`runda ${runda}: vattenvärlden vald`, v === 1, `_val.v = ${v}`)
      await page.mouse.click(1160, 350)
      await page.waitForFunction(() => window.__barnspel.game._cer?.lage === 'knack', null, { timeout: 15000 }).catch(() => {})
      for (let i = 0; i < 4; i++) { await page.mouse.click(640, 470); await page.waitForTimeout(300) }
      await page.waitForFunction(() => window.__barnspel.game._fas === 'avtack', null, { timeout: 10000 }).catch(() => {})
      // Ceremonins egna skvalp (världen rullar ut, knyttets skutt, föremål landar) kommer EFTER avtack-
      // starten — vänta in dem, sedan tills ytan lagt sig (kontrollarmens utgångsläge).
      await page.waitForTimeout(5000)
      for (let i = 0; i < 60 && (await vaken()); i++) await page.waitForTimeout(250)
      const s = await page.evaluate(() => window.__barnspel.game._cer?.skvalp)
      ok(`runda ${runda}: vattnet finns och har skvalpat av kläckningen`, !!s && s.omritn > 1 && !s.vaken, JSON.stringify(s))
    }
    // KONTROLLARM: vila, inga omritningar.
    const r0 = await ritn()
    await page.waitForTimeout(1500)
    const r1 = await ritn()
    ok(`runda ${runda}: kontrollarm — vila före stöten ritar inte om`, r1 === r0 && r0 >= 0, `${r0} → ${r1}`)
    // STÖT med spelets väg.
    if (ID === 'fargregn') await page.evaluate(() => { const g = window.__barnspel.game; for (const p of g._puddles) g._vagStot(p, p.x, false) })
    else if (ID === 'tvatta-djuret') await page.evaluate(() => window.__barnspel.game._vagStot(640, 4))
    else await page.mouse.click(640, 580)
    await page.waitForTimeout(350)
    if (runda === 1) await page.screenshot({ path: `.test-shots/_dag-ytvag-${ID}.png` })
    if (runda === 2) {
      // exit mitt i vågen
      const r2 = await ritn()
      ok(`runda 2: stöten ritar om`, r2 > r1, `${r1} → ${r2}`)
      break
    }
    const r2 = await ritn()
    ok(`runda ${runda}: stöten ritar om`, r2 > r1, `${r1} → ${r2}`)
    const t0 = Date.now()
    while (Date.now() - t0 < 8000 && (await vaken())) await page.waitForTimeout(100)
    const stilla = !(await vaken())
    ok(`runda ${runda}: ytan lägger sig`, stilla, `${((Date.now() - t0) / 1000 + 0.35).toFixed(1)} s`)
    const r3 = await ritn()
    await page.waitForTimeout(1500)
    const r4 = await ritn()
    ok(`runda ${runda}: i vila igen — 0 omritningar på 1,5 s`, r4 === r3, `${r3} → ${r4}`)
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(800)
  ok('0 konsolfel (två rundor, exit mitt i vågen)', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
console.log(fel ? `\n✗ ${fel} fel` : '\n✓ grönt')
process.exit(fel ? 1 : 0)
