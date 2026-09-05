// unika-knytt: SKIMRET i bild — det enda som avgor om folien, ramen, solkronan, glorian
// och kompisen faktiskt SYNS. `_knyttprobe` T0/T3 mater att noderna finns; bara en bild
// svarar pa om bandet sveper over himlen eller ligger som en vit lada, om kronan sticker
// ut bakom ramen, om kompisen sitter pa hjassan eller svavar bredvid.
//
// Spelar en runda per tier med `_tvingaTier` (DEV-kroken i index.js) och sparar
//   .test-shots/knytt-tier<0-3>.png   varlden star framme, knyttet nyfott, kompisen landad
//
//   node scripts/_skimmerbild.mjs [--tier 0,1,2,3]
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const SPAK = { x: 1160, y: 350 }
const AGG = { x: 640, y: 470 }
const arg = process.argv.slice(2)
const TIERS = arg.includes('--tier') ? arg[arg.indexOf('--tier') + 1].split(',').map(Number) : [0, 1, 2, 3]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1600)

  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const X = (x) => geo.x0 + x * geo.s
  const Y = (y) => geo.y0 + y * geo.s
  const klick = (x, y) => page.mouse.click(X(x), Y(y))

  for (const t of TIERS) {
    await page.evaluate((t) => { window.__barnspel.game._tvingaTier = t }, t)
    await klick(SPAK.x, SPAK.y)
    await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 })
    for (let i = 0; i < 4; i++) { await klick(AGG.x, AGG.y); await page.waitForTimeout(260) }
    await page.waitForFunction(() => window.__barnspel.game._klar === true, null, { timeout: 20000 })
    // Kompisen landar 1,15 + 1,5 + 1,05 s efter klackningen; `_klar` kommer vid 3,3 s.
    await page.waitForTimeout(700)
    // Fingret bort fran knyttet sa blicken och leken inte styr bilden.
    await page.mouse.move(X(200), Y(120))
    await page.waitForTimeout(150)
    const fil = `.test-shots/knytt-tier${t}.png`
    await page.screenshot({ path: fil })
    const info = await page.evaluate(() => {
      const g = window.__barnspel.game
      return { tier: g._tier, folie: g._cer?.folie, kompis: g._knytt?.kompis, gloria: g._knytt?.gloria, namn: g._dna?.namn }
    })
    console.log(`  tier ${t}: ${fil} · folie ${info.folie} · kompis ${info.kompis} · gloria ${info.gloria} · ${info.namn}`)
    await page.waitForFunction(() => !!window.__barnspel.game._knyttYta, null, { timeout: 20000 })
    await klick(SPAK.x, SPAK.y)
    await page.waitForFunction(() => window.__barnspel.game._fas === 'bygga', null, { timeout: 20000 })
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: '.test-shots/knytt-tier-hylla.png' })
  console.log(`  hyllan: .test-shots/knytt-tier-hylla.png`)
  console.log(`  ${errors.length} konsolfel${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`)
} finally {
  await browser.close()
}
