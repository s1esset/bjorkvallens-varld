// Mäter att tvatta-djurets NYA zon-mekanik gör verktygsvalet äkta — att kladdlera
// verkligen kräver dusch FÖRST och svamp SEN, utan att no-fail går sönder.
//
// Punkter:
//   1. Nivå 0 har INGEN kladdlera (svampen ska läras in ensam först).
//   2. På en högre nivå finns kladdlera, men under taket 40 %.
//   3. Duschen är tillgänglig direkt när kladd finns (annars är fläckarna olösbara).
//   4. Att SKRUBBA kladd tar inte bort den — antalet kladdfläckar är oförändrat, och
//      renhetsmätaren går ALDRIG bakåt (P0: ingen bestraffning).
//   5. Att SKÖLJA kladd mjukar upp den (kladd -> torr), och DÅ biter svampen.
//   6. Spelet klarar sig inte självt utan input, men auto-hjälpen når ändå 100 %.
//   7. Exit mitt i allt ger 0 konsolfel.
//
//   node scripts/_tvattprobe.mjs [--shot ut.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '')
const ID = 'tvatta-djuret'

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
  const nollstall = async () => page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await nollstall()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  const open = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1300)
  }
  const setLevel = async (n) => page.evaluate((lvl) => {
    const doc = window.__barnspel?.save?.data
    if (!doc) return false
    for (const p of doc.profiles || []) {
      p.games = p.games || {}
      p.games['tvatta-djuret'] = { unlocked: true, highestLevel: lvl, stars: 0, lastPlayedAt: null, custom: {} }
    }
    window.__barnspel.save._requestPersist?.()
    return true
  }, n)
  const toScreen = async (x, y) => page.evaluate(([dx, dy]) => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return { x: (window.innerWidth - 1280 * s) / 2 + dx * s, y: (window.innerHeight - 720 * s) / 2 + dy * s }
  }, [x, y])
  const state = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('tvatta-djuret')
    if (!g) return null
    const fl = (g._flakes || []).filter((f) => !f._clean)
    return {
      niva: g._level,
      kvar: fl.length,
      kladd: fl.filter((f) => f.kind === 'klibb').length,
      torr: fl.filter((f) => f.kind === 'torr').length,
      totalt: g._totalMud,
      renhet: +(g._renhet?.() ?? -1).toFixed(3),
      duschKlar: !!g._showerReady,
      // en kladdfläck att sikta på
      kladdPos: fl.filter((f) => f.kind === 'klibb').map((f) => ({ x: Math.round(f.x), y: Math.round(f.y) }))[0] || null,
    }
  })
  // Dra ett verktyg (svamp/dusch) fram och tillbaka över en punkt.
  const dragTool = async (from, to) => {
    const a = await toScreen(from.x, from.y)
    const b = await toScreen(to.x, to.y)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10)
      await page.waitForTimeout(35)
    }
    for (let i = 10; i >= 0; i--) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10)
      await page.waitForTimeout(35)
    }
    await page.mouse.up()
    // Verktyget glider tillbaka till sin bricka på 0.4s — grip inte förrän det är hemma,
    // annars greppar nästa drag tomma luften (och testet ser ut som en spelbugg).
    await page.waitForTimeout(700)
  }

  // ---- Nivå 0: ingen kladd ------------------------------------------------
  await open()
  const s0 = await state()
  ok('1. nivå 0 är fri från kladdlera', s0.kladd === 0, `${s0.kladd} kladd av ${s0.totalt} fläckar`)

  // ---- Hög nivå: kladd finns, under taket ---------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(300)
  await setLevel(4)
  await open()
  const s1 = await state()
  const andel = s1.totalt ? s1.kladd / s1.totalt : 0
  ok('2. högre nivå har kladd, under taket 40 %', s1.kladd > 0 && andel <= 0.42,
    `${s1.kladd}/${s1.totalt} = ${Math.round(andel * 100)}% (nivå ${s1.niva})`)
  ok('3. duschen är tillgänglig direkt när kladd finns', s1.duschKlar === true, `duschKlar=${s1.duschKlar}`)

  // ---- Skrubba kladden: ska INTE försvinna --------------------------------
  const mal = s1.kladdPos
  if (!mal) {
    ok('4. skrubb biter inte på kladd', false, 'hittade ingen kladdfläck att testa på')
  } else {
    const SVAMP = { x: 165, y: 630 } // svampens bricka (tool.home)
    const foreKladd = s1.kladd
    const foreRenhet = s1.renhet
    await dragTool(SVAMP, mal)
    const s2 = await state()
    ok('4. skrubb tar inte bort kladd, och mätaren går aldrig bakåt',
      s2.kladd === foreKladd && s2.renhet >= foreRenhet,
      `kladd ${foreKladd} -> ${s2.kladd} · renhet ${foreRenhet} -> ${s2.renhet}`)

    // ---- Skölj kladden mjuk, skrubba sen ---------------------------------
    const DUSCH = { x: 1115, y: 630 } // duschens bricka (tool.home)
    await dragTool(DUSCH, mal)
    const s3 = await state()
    const mjuknade = s3.kladd < foreKladd
    ok('5a. dusch mjukar upp kladd (kladd -> torr)', mjuknade, `kladd ${foreKladd} -> ${s3.kladd}`)
    if (shot) await page.screenshot({ path: shot })
    const foreKvar = s3.kvar
    await dragTool(SVAMP, mal)
    const s4 = await state()
    ok('5b. svampen biter EFTER sköljningen', s4.kvar < foreKvar, `fläckar kvar ${foreKvar} -> ${s4.kvar}`)
  }

  // ---- No-fail: auto-hjälpen får inte FASTNA på kladd ---------------------
  // Den städar en fläck per 9s idle-tick (medvetet en knuff, ingen lösare) — att vänta ut
  // 128 fläckar tar ~19 min, så "når 100 %" går inte att mäta här. Det som MÅSTE gälla är
  // att kladd inte låser den: både kladd- och totalantalet ska fortsätta sjunka.
  const fore6 = await state()
  await page.waitForTimeout(32000)
  const efter6 = await state()
  ok('6. auto-hjälpen fastnar inte på kladd (mjukar upp och fortsätter)',
    efter6.kvar < fore6.kvar && efter6.kladd < fore6.kladd,
    `fläckar ${fore6.kvar} -> ${efter6.kvar} · kladd ${fore6.kladd} -> ${efter6.kladd}`)

  const foreExit = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(900)
  ok('7. exit mitt i allt ger 0 nya konsolfel', errors.length === foreExit, errors.slice(foreExit).join(' | ') || 'inga')

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
