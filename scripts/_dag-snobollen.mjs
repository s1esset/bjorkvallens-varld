// SNOBOLLEN (F3, dag 2026-10-02 D12) — går snögubben sönder i snöklumpar i SPELET, och lever något kvar?
//
//   node scripts/_dag-snobollen.mjs [--url http://localhost:5173]
//
// Harnessens autotryck rullar sällan bollen ända fram till en snögubbe, så sonden välter den första
// snögubben med spelets EGEN väg (`_toppleTarget(ctx, t, smash=true, fart)`) — samma anrop som en krock gör.
// Två rundor; den andra lämnas OTÅLIGT mitt i klumparna (nästa nav river dem).
//   MÄTNING  4 klumpar i världen, ≤ 12, synliga, borta efter livstiden (2,4 s), 0 konsolfel
//   KONTROLL ett hinder som INTE är en snögubbe ger inga klumpar (dagens skriptade spillra)
// Skärmdump: .test-shots/_dag-snobollen.png (strax efter krocken).
import { chromium } from 'playwright'

const URL = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'snobollen'
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

  const valta = (typ) =>
    page.evaluate(async ({ gid, typ }) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const typer = (g._targets || []).map((t) => t.type)
      const t = (g._targets || []).find((x) => (typ === 'snoman' ? x.type === 'snoman' : x.type !== 'snoman') && !x.down)
      if (!t) return { saknas: true, typer }
      const fore = (g._klumpar || []).length
      g._toppleTarget(window.__ctx, t, true, 9)
      return { fore, typer }
    }, { gid: ID, typ })
  const lage = () =>
    page.evaluate(async (gid) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const k = g._klumpar || []
      return { n: k.length, synliga: k.filter((x) => x.view && !x.view.destroyed && x.view.visible && x.view.alpha > 0.05).length }
    }, ID)

  for (const runda of [1, 2]) {
    // Hindren lottas per bana — starta om tills banan har en snögubbe (högst 8 försök).
    for (let f = 0; f < 8; f++) {
      if (runda > 1 || f > 0) { await page.evaluate(() => window.__barnspel.nav.go('menu')); await page.waitForTimeout(300) }
      await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
      await page.waitForTimeout(500)
      const har = await page.evaluate(async (gid) => ((await import('/src/games/registry.js')).getGame(gid)._targets || []).some((t) => t.type === 'snoman'), ID)
      if (har) break
    }
    await page.evaluate(async (gid) => {
      // spelets ctx: fånga den ur en metod som tickern anropar varje bildruta (en gång per sida)
      const g = (await import('/src/games/registry.js')).getGame(gid)
      if (g.__fangad) return
      const orig = g._updateGlod
      g._updateGlod = function (ctx, dt) { window.__ctx = ctx; return orig.call(this, ctx, dt) }
      g.__fangad = true
    }, ID)
    await page.waitForTimeout(1400)
    console.log(`\n  Runda ${runda}`)
    if (runda === 1) {
      const k = await valta('annat')
      await page.waitForTimeout(150)
      const l = await lage()
      ok('KONTROLL ett hinder som inte är en snögubbe ger inga klumpar', k.saknas || l.n === 0, k.saknas ? `inget annat hinder (${k.typer.join(',')})` : `klumpar ${l.n}`)
    }
    const k = await valta('snoman')
    if (k.saknas) { ok('det finns en snögubbe att välta', false, k.typer.join(',')); continue }
    let max = 0, forsta = null
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(50)
      const l = await lage()
      max = Math.max(max, l.n)
      if (!forsta && l.n > 0) forsta = l
    }
    if (runda === 1) await page.screenshot({ path: '.test-shots/_dag-snobollen.png' })
    ok('snögubben går sönder i 4 snöklumpar', forsta && forsta.n === 4 && forsta.synliga === 4, `klumpar ${forsta?.n} (synliga ${forsta?.synliga})`)
    ok('taket håller (≤ 12)', max <= 12, `högst ${max}`)
    if (runda === 1) {
      await page.waitForTimeout(2800)
      const slut = await lage()
      ok('klumparna är borta efter livstiden (2,4 s)', slut.n === 0, `kvar ${slut.n}`)
    }
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1500)
  ok('0 konsolfel över två rundor + exit mitt i klumparna', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
console.log(fel ? `\n  ✗ ${fel} fel` : '\n  ALLT GRÖNT')
process.exit(fel ? 1 : 0)
