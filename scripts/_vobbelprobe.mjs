// Vobbel-sond: deformeras glasstornets kopor på riktigt när de landar — och lugnar de
// ner sig igen?
//
//   node scripts/_vobbelprobe.mjs [antal-kulor]     (default 3)
//
// En mjuk kropp som ser rätt ut i en stillbild kan ändå vara fel på tre sätt som bara
// tiden avslöjar: den deformeras inte alls (för styv), den lugnar sig aldrig (evig
// gelé, och en ritstorm varje bildruta), eller den återvänder inte till sin form utan
// blir permanent tillplattad. Sonden mäter ringens avvikelse från viloradien över tid.
import { chromium } from 'playwright'

const ID = 'glasstornet'
const KULOR = Number(process.argv[2] ?? 3)
const VR = 44 // SCOOP_VR

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

// Ringens största avvikelse från vilo-silhuetten, i px, för varje levande kula.
const matt = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    const ut = []
    for (const rec of g._live || []) {
      const s = rec.view && !rec.view.destroyed ? rec.view._soft : null
      if (!s) continue
      let max = 0
      let rorelse = 0
      const c = s.pts[s.mitt]
      for (let i = 0; i < s.n; i++) {
        const p = s.pts[i]
        const th = (i / s.n) * Math.PI * 2 - Math.PI / 2
        const vilo = 44 * (1 + 0.05 * Math.sin(th * 5))
        const r = Math.hypot(p.x - c.x, p.y - c.y)
        max = Math.max(max, Math.abs(r - vilo))
        rorelse += Math.abs(p.x - p.px) + Math.abs(p.y - p.py)
      }
      ut.push({ avvik: +max.toFixed(2), rorelse: +rorelse.toFixed(2), fyll: +s.fyllnad().toFixed(3) })
    }
    return { kulor: ut, barande: !!g._carrier, faller: !!g._falling }
  }, ID)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1000)

  const peka = (dx, dy, typ) =>
    page.evaluate(
      ({ dx, dy, typ }) => {
        const c = document.querySelector('canvas')
        const r = c.getBoundingClientRect()
        const s = Math.min(r.width / 1280, r.height / 720)
        c.dispatchEvent(new PointerEvent(typ, {
          clientX: r.left + r.width / 2 + (dx - 640) * s,
          clientY: r.top + r.height / 2 + (dy - 360) * s,
          pointerId: 1, pointerType: 'mouse', button: 0,
          buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true,
        }))
      },
      { dx, dy, typ },
    )

  console.log(`\n  Vobbel-sond — ${ID}, ${KULOR} kulor\n`)

  let toppAvvik = 0
  let toppRorelse = 0
  for (let k = 0; k < KULOR; k++) {
    // Greppa kopan där den hänger och släpp direkt ovanför tornets mitt.
    const bar = await page.evaluate(async (gid) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      return g._carrier ? { x: g._carrier.x, y: g._carrier.y } : null
    }, ID)
    if (!bar) {
      console.log(`     (ingen kopa att släppa vid kula ${k + 1} — spelet firar eller laddar)`)
      await page.waitForTimeout(1500)
      continue
    }
    await peka(bar.x, bar.y, 'pointerdown')
    await peka(640, bar.y, 'pointermove')
    await peka(640, bar.y, 'pointerup')

    // Följ landningen bildruta för bildruta.
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(70)
      const m = await matt(page)
      for (const kula of m.kulor) {
        toppAvvik = Math.max(toppAvvik, kula.avvik)
        toppRorelse = Math.max(toppRorelse, kula.rorelse)
      }
    }
    const efter = await matt(page)
    const rad = efter.kulor.map((c) => `${c.avvik}px/${c.rorelse}`).join('  ')
    console.log(`     kula ${k + 1}: ${efter.kulor.length} i tornet · avvikelse/rörelse ${rad}`)
    await page.waitForTimeout(900)
  }

  ok('kopan deformeras vid landning', toppAvvik > 1.5, `största avvikelse ${toppAvvik} px (vilo-radie ${VR})`)
  ok('men går aldrig sönder', toppAvvik < VR * 0.6, `${toppAvvik} px < ${(VR * 0.6).toFixed(1)}`)

  // Lugnar den ner sig? Vänta ut vobbeln och mät att ritningen faktiskt slutar.
  await page.waitForTimeout(2500)
  const vila = await matt(page)
  const maxRorelse = Math.max(0, ...vila.kulor.map((c) => c.rorelse))
  const maxAvvik = Math.max(0, ...vila.kulor.map((c) => c.avvik))
  const minFyll = Math.min(1, ...vila.kulor.map((c) => c.fyll))
  console.log(`\n     i vila: rörelse ${maxRorelse} · avvikelse ${maxAvvik} px · fyllnad ${minFyll}`)
  ok('ringen lugnar sig (ritningen stannar)', maxRorelse < 0.4, `${maxRorelse} < 0.4 (WOBBLE_RITA)`)
  ok('formen kommer tillbaka', maxAvvik < 1.5, `${maxAvvik} px kvar`)
  ok('ingen kula har tappat volym', minFyll > 0.9, `minsta fyllnad ${minFyll}`)
  ok('toppen av vobbeln var synlig', toppRorelse > 1, `största ringrörelse ${toppRorelse} px/bildruta`)

  // Exit mitt i vobbeln.
  const bar2 = await page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    return g._carrier ? { x: g._carrier.x, y: g._carrier.y } : null
  }, ID)
  if (bar2) {
    await peka(bar2.x, bar2.y, 'pointerdown')
    await peka(640, bar2.y, 'pointerup')
    await page.waitForTimeout(260) // mitt i fallet
  }
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  ok('0 konsolfel efter exit mitt i vobbeln', errors.length === 0, errors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}
console.log(fel === 0 ? '\n  ALLT GRÖNT\n' : `\n  ${fel} FEL\n`)
process.exit(fel ? 1 : 0)
