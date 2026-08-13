// Spelar `mata-munnen` på riktigt: drar mat till munnen, drar mat i pannan (bus), matar
// en hel tallrik till rapfinalen och lämnar spelet mitt i ett tugg.
//
// Testharnessen drar mellan generiska punkter och träffade aldrig en enda matbit — hela
// kärnloopen var alltså grön och omätt. Det den här sonden svarar på:
//
//   gap-inbjudan   gapar munnen när maten NÄRMAR sig? (kontroll: samma bit långt bort)
//   maten          försvinner biten, stiger mätaren exakt 1/antal, kommer rätt MIN?
//   bus            fastnar maten på pannan, och håller taket (GEGGA_MAX)?
//   finalen        når mätaren 1,0, kommer nöjd-minen, kommer en ny tallrik?
//   exit           0 konsolfel när man lämnar mitt i tugget
//
// Varje tal har en kontrollarm bredvid sig — ett gap-värde utan "långt bort"-mätningen
// säger ingenting, eftersom vilogapet också är ett tal.
//
//   node scripts/_munprobe.mjs [--shot .test-shots/_munprobe.png]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '.test-shots/_munprobe.png')
const url = opt('--url', 'http://localhost:5173')
mkdirSync(dirname(shot), { recursive: true })

const ID = 'mata-munnen'
const errors = []

const las = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const a = g._ans
    let min = null
    if (a?._aktivMin) for (const [namn, s] of Object.entries(a._miner)) if (s === a._aktivMin) min = namn
    return {
      antal: g._antal,
      atna: g._atna,
      fyll: Math.round((g._fyllNiva ?? 0) * 1000) / 1000,
      gap: Math.round((a?._gap ?? 0) * 1000) / 1000,
      min,
      geggor: g._geggor?.length ?? 0,
      busy: !!g._busy,
      drag: g._drag?.active
        ? { key: g._drag.active.data?.key, dragging: !!g._drag.active.dragging, tx: Math.round(g._drag.active.tx), ty: Math.round(g._drag.active.ty) }
        : null,
      // Munnens läge LÄSES ur spelets egen målnod. Det stod 455 hårdkodat här, och när
      // köket flyttade ansiktet till x=620 mätte sonden fortfarande — den rapporterade
      // ett gap (0,12 → 0,74) för ett drag som i själva verket landade i kinden och
      // räknades som bus. En hårdkodad koordinat i en sond är en tyst felkälla.
      mun: { x: Math.round(g._mun?.x ?? 0), y: Math.round(g._mun?.y ?? g._munY) },
      ogon: Math.round(g._ogonY ?? 0),
      mat: (g._mat || []).filter((r) => !r._uppaten && !r.view.destroyed)
        .map((r) => ({ key: r.data.key, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
    }
  })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(1600)

  // Ett drag i steg, så `globalpointermove` hinner köras och tröskeln (12 px) passeras.
  const drag = async (fran, till, { steg = 10, paus = 45, slapp = true } = {}) => {
    await page.mouse.move(fran.x, fran.y)
    await page.mouse.down()
    for (let i = 1; i <= steg; i++) {
      await page.mouse.move(fran.x + (till.x - fran.x) * (i / steg), fran.y + (till.y - fran.y) * (i / steg))
      await page.waitForTimeout(paus)
    }
    if (slapp) await page.mouse.up()
  }

  let s = await las(page)
  console.log(`\n  tallrik: ${s.antal} bitar — ${s.mat.map((m) => m.key).join(' · ')}`)
  console.log(`  munnen: (${s.mun.x}, ${s.mun.y}) · vilogap ${s.gap}`)

  // ---- 1. GAP-INBJUDAN, med kontrollarm -----------------------------------
  // Samma matbit, samma drag — en gång till en punkt LÅNGT från munnen, en gång ända
  // fram. Utan kontrollarmen vore ett gapvärde bara ett tal.
  const bit = s.mat[0]
  await drag(bit, { x: bit.x - 60, y: bit.y - 120 }, { slapp: false })
  const fjarran = await las(page)
  const langtBort = fjarran.gap
  await page.mouse.move(s.mun.x + 40, s.mun.y + 30)
  // 300 ms, inte 160: gapet sätts i spelets tick, och EN lång bildruta i mätögonblicket
  // gav en gång 0,00 med draget bevisat levande (1 av 5 körningar). Mätfönstret ska inte
  // ligga i samma storleksordning som en bildruta.
  await page.waitForTimeout(300)
  const nara = await las(page)
  const naraMun = nara.gap
  console.log(`  (drag långt bort: ${JSON.stringify(fjarran.drag)} · vid munnen: ${JSON.stringify(nara.drag)})`)
  await page.mouse.move(bit.x, bit.y)
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(700)
  console.log(`\n  GAP  långt bort ${langtBort.toFixed(2)}  →  vid munnen ${naraMun.toFixed(2)}   ${naraMun > langtBort + 0.3 ? '✓' : '✗ munnen bjuder inte in'}`)

  // ---- 2. ETT MÅL: mata en bit --------------------------------------------
  s = await las(page)
  const forsta = s.mat[0]
  const fore = { atna: s.atna, fyll: s.fyll, kvar: s.mat.length }
  await drag(forsta, s.mun)
  await page.waitForTimeout(1500)
  let e = await las(page)
  const steg = Math.round((1 / s.antal) * 1000) / 1000
  console.log(`\n  MAT  ${forsta.key}: äten ${fore.atna}→${e.atna} · mätare ${fore.fyll}→${e.fyll} (väntat steg ${steg}) · kvar ${fore.kvar}→${e.mat.length}`)
  console.log(`       min efter tugget: ${e.min ?? '(ingen)'}   ${e.atna === fore.atna + 1 && Math.abs(e.fyll - steg) < 0.02 ? '✓' : '✗'}`)
  await page.screenshot({ path: shot.replace(/\.png$/, '-tugg.png') })

  // ---- 3. BUS: släpp i pannan ---------------------------------------------
  s = await las(page)
  if (s.mat.length) {
    const busBit = s.mat[0]
    const geggorFore = s.geggor
    await drag(busBit, { x: s.mun.x, y: s.ogon - 55 }) // pannan, ovanför ögonlinjen
    await page.waitForTimeout(900)
    e = await las(page)
    console.log(`\n  BUS  ${busBit.key} i pannan: gegga ${geggorFore}→${e.geggor} · mätaren ${s.fyll}→${e.fyll} ${Math.abs(e.fyll - s.fyll) < 0.001 ? '(oförändrad ✓)' : '(✗ bus ska inte mätta)'} · min ${e.min ?? '(ingen)'}`)
    await page.screenshot({ path: shot.replace(/\.png$/, '-bus.png') })
  }

  // ---- 4. HELA TALLRIKEN → FINALEN ----------------------------------------
  let varv = 0
  s = await las(page)
  while (s.mat.length && varv < 12) {
    const m = s.mat[0]
    await drag(m, s.mun)
    await page.waitForTimeout(1400)
    s = await las(page)
    varv++
  }
  const vidFinal = await las(page)
  console.log(`\n  FINAL  mätare ${vidFinal.fyll} · äten ${vidFinal.atna}/${vidFinal.antal} · min ${vidFinal.min ?? '(ingen)'} · busy ${vidFinal.busy}`)
  await page.screenshot({ path: shot })

  await page.waitForTimeout(4200)
  const efterFinal = await las(page)
  console.log(`  EFTER  ny tallrik: ${efterFinal.mat.length} bitar · mätare ${efterFinal.fyll} · gegga ${efterFinal.geggor} (ska vara 0 — avtorkad)`)

  // ---- 5. EXIT MITT I ETT TUGG --------------------------------------------
  s = await las(page)
  if (s.mat.length) {
    await drag(s.mat[0], s.mun)
    await page.waitForTimeout(420) // mitt i tuggan, före minen
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(1400)
  }

  console.log(`\n  ${errors.length === 0 ? '✓ 0 konsolfel (inkl. exit mitt i tugget)' : '✗ ' + errors.length + ' konsolfel: ' + errors.slice(0, 3).join(' | ')}`)
  console.log(`  bilder: ${shot} (+ -tugg, -bus)\n`)
  process.exitCode = errors.length ? 1 : 0
} finally {
  await browser.close()
}
