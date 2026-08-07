// Mäter enhorningen-elviras NYA finish: att vinsten är Elviras egen galopp över
// regnbågen med ett föl som möter henne — inte generisk konfetti.
//
// Fem punkter:
//   1. Fölet står vid regnbågens fot redan under spelet (mottagare, inte bara vid vinst)
//      och ligger innanför skärmen.
//   2. En vinst går att nå (spelet är no-fail: tryck Hoppa tills glidet garanterar den).
//   3. Under finishen RIDER Elvira på regnbågens båge — hon passerar över krönet, alltså
//      högre upp än målpunkten, och hamnar till slut på andra sidan.
//   4. Regnbågens krönstjärna flarar (finishen är knuten till regnbågen, inte generisk).
//   5. Att lämna spelet mitt i galoppen ger 0 konsolfel.
//
//   node scripts/_elviraprobe.mjs [--shot ut.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '')
const ID = 'enhorningen-elvira'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const ok = (namn, pass, detalj) => results.push({ namn, pass, detalj })

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
  await page.waitForTimeout(1300)

  const toScreen = async (x, y) => page.evaluate(([dx, dy]) => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return { x: (window.innerWidth - 1280 * s) / 2 + dx * s, y: (window.innerHeight - 720 * s) / 2 + dy * s }
  }, [x, y])
  const tap = async (x, y) => {
    const p = await toScreen(x, y)
    await page.mouse.click(p.x, p.y)
    await page.waitForTimeout(150)
  }
  const state = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('enhorningen-elvira')
    if (!g) return null
    return {
      state: g._state,
      goal: { ...g._goalPos },
      elvira: { x: Math.round(g._elvira?.x ?? -1), y: Math.round(g._elvira?.y ?? -1) },
      foal: g._foal && !g._foal.destroyed ? { x: Math.round(g._foal.x), y: Math.round(g._foal.y), synlig: g._foal.visible } : null,
      starScale: g._rainbow?._wstar ? +(g._rainbow._wstar.scale.x).toFixed(2) : null,
      rainbowAlpha: +(g._rainbow?.alpha ?? -1).toFixed(2),
    }
  })

  const s0 = await state()
  // Fölet ska stå på fri gräsyta — inte bakom molnfacket (70–540), vikt-växlaren (862–1034)
  // eller Hoppa!-knappen (1043–1257). Stod först rakt under regnbågen, dvs bakom panelen.
  ok('1. fölet står på fri gräsyta, inte bakom en knapp',
    !!s0.foal && s0.foal.synlig && s0.foal.x > 553 && s0.foal.x < 829 && s0.foal.y > 560 && s0.foal.y < 680,
    s0.foal ? `föl (${s0.foal.x},${s0.foal.y}) mål (${s0.goal.x},${s0.goal.y})` : 'inget föl')

  // Tryck Hoppa tills vinsten kommer (no-fail-glidet garanterar den efter 3 försök).
  let vann = false
  const overKron = []
  let maxStar = 0
  let minFoalDist = Infinity // hur nära kommer hon fölet? (den täckte det helt förut)
  let maxX = 0 // rider hon ut ur bild? (goal.x når 1170 på hoga nivaer)
  for (let i = 0; i < 90; i++) {
    const s = await state()
    if (s.state === 'win') {
      vann = true
      // Följ galoppen: hur högt över målet kommer hon, och flarar stjärnan?
      for (let w = 0; w < 40; w++) {
        await page.waitForTimeout(90)
        const g2 = await state()
        if (!g2 || g2.state !== 'win') break
        overKron.push(g2.goal.y - g2.elvira.y)
        if (g2.starScale) maxStar = Math.max(maxStar, g2.starScale)
        maxX = Math.max(maxX, g2.elvira.x)
        if (g2.foal) minFoalDist = Math.min(minFoalDist, Math.hypot(g2.elvira.x - g2.foal.x, g2.elvira.y - g2.foal.y))
        if (shot && overKron.length === 12) await page.screenshot({ path: shot })
      }
      break
    }
    if (s.state === 'placing') await tap(1150, 656) // lägena är placing|flying|returning|help|win
    await page.waitForTimeout(500)
  }
  ok('2. en vinst går att nå', vann, vann ? 'ja' : 'nådde aldrig win-läget')

  const hogst = overKron.length ? Math.max(...overKron) : 0
  ok('3. hon rider över regnbågens krön', hogst > 120, `högsta höjd över målpunkten: ${Math.round(hogst)}px (bågen är 116px)`)
  ok('4. regnbågens krönstjärna flarar', maxStar > 1.3, `största stjärnskala ${maxStar}`)
  ok('6. hon täcker aldrig fölet (mottagaren syns vid ankomsten)', minFoalDist > 120,
    `minsta avstånd Elvira↔föl: ${Number.isFinite(minFoalDist) ? Math.round(minFoalDist) + 'px' : '-'}`)
  ok('7. hon galopperar aldrig ut ur bild', maxX <= 1230, `högsta x: ${Math.round(maxX)} (skärmen är 1280)`)

  // ---- Samma sak på en HÖG nivå -------------------------------------------
  // goal.x vandrar 1010 -> 1170, så högra regnbågsfoten (1286) hamnar utanför 1280-ytan.
  // Nivå 0 kan alltså vara grön medan finishen galopperar ut ur bild på nivå 8.
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(400)
  // Skriv i den LEVANDE SaveService-instansen, inte bara i localStorage: SaveService flushar
  // sitt eget doc vid pagehide, så en localStorage-skrivning + reload blir överskriven av den
  // gamla nivån (första försöket körde nivå 1 och rapporterade ändå "hög nivå").
  const satt = await page.evaluate(() => {
    const sv = window.__barnspel?.save
    const doc = sv?.data
    if (!doc) return false
    for (const p of doc.profiles || []) {
      p.games = p.games || {}
      p.games['enhorningen-elvira'] = { unlocked: true, highestLevel: 8, stars: 0, lastPlayedAt: null, custom: {} }
    }
    sv._requestPersist?.()
    return true
  })
  if (!satt) ok('8-10. hög nivå', false, 'kunde inte sätta nivån via SaveService')
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1300)
  const sh = await state()
  let hiMinDist = Infinity
  let hiMaxX = 0
  let hiVann = false
  for (let i = 0; i < 90; i++) {
    const s = await state()
    if (s.state === 'win') {
      hiVann = true
      for (let w = 0; w < 40; w++) {
        await page.waitForTimeout(90)
        const g2 = await state()
        if (!g2 || g2.state !== 'win') break
        hiMaxX = Math.max(hiMaxX, g2.elvira.x)
        if (g2.foal) hiMinDist = Math.min(hiMinDist, Math.hypot(g2.elvira.x - g2.foal.x, g2.elvira.y - g2.foal.y))
        if (shot && w === 12) await page.screenshot({ path: shot.replace(/\.png$/, '-hognivа.png') })
      }
      break
    }
    if (s.state === 'placing') await tap(1150, 656)
    await page.waitForTimeout(500)
  }
  ok(`8. hög nivå (mål x=${sh.goal.x}): vinst nås`, hiVann, hiVann ? 'ja' : 'nej')
  ok('9. hög nivå: hon galopperar inte ut ur bild', hiMaxX <= 1230, `högsta x: ${Math.round(hiMaxX)}`)
  ok('10. hög nivå: fölet täcks inte', hiMinDist > 120,
    `minsta avstånd: ${Number.isFinite(hiMinDist) ? Math.round(hiMinDist) + 'px' : '-'}`)

  const foreExit = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(900)
  ok('5. exit mitt i galoppen ger 0 nya konsolfel', errors.length === foreExit, errors.slice(foreExit).join(' | ') || 'inga')

  console.log('')
  let fel = 0
  for (const r of results) {
    if (!r.pass) fel++
    console.log(`  ${r.pass ? '✓' : '✗'} ${r.namn}  —  ${r.detalj}`)
  }
  console.log('')
  console.log(`  ${results.length - fel}/${results.length} gröna · ${errors.length} konsolfel totalt`)
  if (errors.length) console.log('  ' + errors.slice(0, 5).join('\n  '))
  process.exitCode = fel ? 1 : 0
} finally {
  await browser.close()
}
