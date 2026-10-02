// KNUFFA-TORNET (F3, dag 2026-10-02 D12) — går glaset sönder i godisbitar i SPELET, och lever något kvar?
//
//   node scripts/_dag-knuffa-tornet.mjs [--url http://localhost:5173]
//
// Harnessens autotryck svingar kulan men träffar sällan glaset (det bor på nivå ≥ 3), så den här sonden
// ställer kulan bredvid glasklossen och skickar den rakt in med en känd fart — en riktig kollision, inte
// `bryt()`. Två rundor, den andra startad OTÅLIGT medan godiset från den första fortfarande rullar.
//   KONTROLL  en långsam knuff (1 px/steg, under gränsen) delar INTE glaset
//   MÄTNING   en hård knuff (14 px/steg) → glaset borta, 6 godisbitar i världen, ≤ 12, borta efter livstiden
// Skärmdump: .test-shots/_dag-knuffa-tornet.png (strax efter delningen).
import { chromium } from 'playwright'

const URL = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'knuffa-tornet'
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
  await page.evaluate((gid) => {
    const s = window.__barnspel.save
    s.update((d) => {
      const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
      if (!p) return
      p.games = p.games || {}
      p.games[gid] = { ...(p.games[gid] || { unlocked: true, stars: 0, custom: {} }), highestLevel: 4 }
    })
    s.flush()
  }, ID)

  // Skicka kulan in i glasklossen från vänster med farten v (px/steg).
  const knuffa = (v) =>
    page.evaluate(async ({ gid, v }) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const { Body } = await import('/src/lib/physics.js')
      const glas = (g._blocks || []).find((b) => b.kind === 'glas' && !b.cleared)
      const kula = g._ballBody
      if (!glas || !kula) return { saknas: !glas ? 'glas' : 'kula' }
      const p = glas.body.position
      const r = kula.circleRadius || 30
      const halv = (glas.body.bounds.max.x - glas.body.bounds.min.x) / 2
      // I siktläget är kulan STATISK (hänger i kranen) — släpp den, annars rör den sig aldrig.
      if (kula.isStatic) Body.setStatic(kula, false)
      Body.setPosition(kula, { x: p.x - halv - r - 2, y: p.y })
      Body.setVelocity(kula, { x: v, y: 0 })
      return { glasX: p.x, glasY: p.y }
    }, { gid: ID, v })

  const lage = () =>
    page.evaluate(async (gid) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const glas = (g._blocks || []).filter((b) => b.kind === 'glas')
      return {
        glasKvar: glas.filter((b) => !b.cleared && !b.shattering).length,
        glasTot: glas.length,
        godis: (g._godis || []).length,
        bitarLib: g._phys?.brytBitar?.length ?? g._phys?.brytBitar ?? null,
        godisSynliga: (g._godis || []).filter((x) => x.view && !x.view.destroyed && x.view.visible && x.view.alpha > 0.05).length,
      }
    }, ID)

  for (const runda of [1, 2]) {
    if (runda > 1) { await page.evaluate(() => window.__barnspel.nav.go('menu')); await page.waitForTimeout(300) }
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1400)
    console.log('    glas i tornet: ' + (await lage()).glasTot)
    console.log(`\n  Runda ${runda}`)
    const fore = await lage()
    if (runda === 1) {
      const k = await knuffa(1)
      await page.waitForTimeout(500)
      const efterK = await lage()
      ok('KONTROLL långsam knuff (1 px/steg) delar inte glaset', !k.saknas && efterK.glasKvar === fore.glasKvar && efterK.godis === 0, `glas ${fore.glasKvar} → ${efterK.glasKvar} · godis ${efterK.godis}${k.saknas ? ' · saknas ' + k.saknas : ''}`)
    }
    const f0 = await lage()
    const k = await knuffa(14)
    let max = 0
    let forsta = null
    for (let t = 0; t < 12; t++) {
      await page.waitForTimeout(50)
      const l = await lage()
      max = Math.max(max, l.godis)
      if (!forsta && l.godis > 0) forsta = l
    }
    if (runda === 1) await page.screenshot({ path: '.test-shots/_dag-knuffa-tornet.png' })
    ok(`hård knuff (14 px/steg) → glaset går sönder i godis`, !k.saknas && forsta && forsta.glasKvar < f0.glasKvar, `glas ${f0.glasKvar} → ${forsta?.glasKvar} · godis ${forsta?.godis} (synliga ${forsta?.godisSynliga}) · lib ${forsta?.bitarLib}`)
    ok('taket håller (≤ 12 godisbitar)', max <= 12, `högst ${max}`)
    if (runda === 1) {
      await page.waitForTimeout(3600)
      const slut = await lage()
      ok('godiset är borta efter livstiden (3 s)', slut.godis === 0, `kvar ${slut.godis} · lib ${slut.bitarLib}`)
    }
    // runda 2 lämnas mitt i godiset: nästa nav river det
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1500)
  ok('0 konsolfel över två rundor + exit mitt i godiset', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
console.log(fel ? `\n  ✗ ${fel} fel` : '\n  ALLT GRÖNT')
process.exit(fel ? 1 : 0)
