// Mäter att spindelhjaltens nya hjälp-ERBJUDANDE fungerar som avsett — att hjälpen
// bjuder in i stället för att ersätta, utan att no-fail-golvet försvinner.
//
// Sex punkter:
//   1. Efter 2 missar dyker Skjut!-knappen + prickbanan upp, och hjälten står STILLA
//      (spelet skjuter alltså inte längre åt barnet).
//   2. Prickbanan ljuger inte: dess närmaste punkt ligger tätt intill ett riktigt mål.
//   3. Slangbellan är fortfarande påslagen — barnet kan sikta själv i stället.
//   4. Tryck på Skjut! => hjälten flyger och en stjärna samlas.
//   5. NO-FAIL: rör man INTE knappen tar det garanterade glidet vid efter OFFER_PATIENCE.
//   6. Knappen klarar P0:s 96px, och att lämna spelet mitt i allt ger 0 konsolfel.
//
//   node scripts/_offerprobe.mjs [--shot ut.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '')
const ID = 'spindelhjalten'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const ok = (namn, pass, detalj) => { results.push({ namn, pass, detalj }); }

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

  const open = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1200)
  }
  const toScreen = async (x, y) => page.evaluate(([dx, dy]) => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return { x: (window.innerWidth - 1280 * s) / 2 + dx * s, y: (window.innerHeight - 720 * s) / 2 + dy * s }
  }, [x, y])
  const tap = async (x, y) => {
    const p = await toScreen(x, y)
    await page.mouse.click(p.x, p.y)
    await page.waitForTimeout(150)
  }
  const drag = async (x0, y0, x1, y1) => {
    const a = await toScreen(x0, y0)
    const b = await toScreen(x1, y1)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8)
      await page.waitForTimeout(20)
    }
    await page.mouse.up()
  }

  const state = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('spindelhjalten')
    if (!g) return null
    const tgts = (g._targets || []).map((t) => ({ x: t.x, y: t.y, collected: !!t.collected }))
    let minD = null
    const pts = g._offer?.pts || []
    for (const p of pts) {
      for (const t of tgts) {
        const d = Math.hypot(p.x - t.x, p.y - t.y)
        if (minD === null || d < minD) minD = d
      }
    }
    // Minsta marginal mellan prickbanan och ett studsmoln, uttryckt som (avstånd - (r+HERO_R)).
    // Negativt = banan går genom ett moln och lovar en flykt som i verkligheten studsar bort.
    let bumpMargin = null
    for (const p of pts) {
      for (const bm of g._bumpers || []) {
        const m = Math.hypot(p.x - bm.x, p.y - bm.y) - ((bm.r || 0) + 46)
        if (bumpMargin === null || m < bumpMargin) bumpMargin = m
      }
    }
    return {
      mode: g._mode,
      misser: g._misses,
      bumpMargin,
      antalMoln: (g._bumpers || []).length,
      stjarnKrock: (g._targets || []).some((t) =>
        (g._bumpers || []).some((bm) => Math.hypot(t.x - bm.x, t.y - bm.y) < (bm.r || 0) + 40),
      ),
      harErbjudande: !!g._offer,
      knappSyns: !!(g._shootBtn && g._shootBtn.visible),
      knappB: g._shootBtn?.width || 0,
      knappH: g._shootBtn?.height || 0,
      banaSyns: !!(g._offerPath && g._offerPath.visible),
      banPunkter: pts.length,
      banaTillMal: minD,
      slangbellaPa: !!g._launcher?.enabled,
      heroX: Math.round(g._hero?.x ?? -1),
      heroY: Math.round(g._hero?.y ?? -1),
      samlade: tgts.filter((t) => t.collected).length,
      totalt: tgts.length,
    }
  })

  // Missar tills erbjudandet dyker upp (eller ger upp). Ett svagt skott uppåt-vänster
  // missar stjärnorna som ligger uppe till höger.
  const missaTills = async (villkor, maxRundor = 5) => {
    for (let i = 0; i < maxRundor; i++) {
      const s = await state()
      if (villkor(s)) return s
      if (s.mode !== 'aim') { await page.waitForTimeout(700); continue }
      await drag(240, 540, 320, 610)
      // vänta ut flykten (max MAX_FLIGHT 5s + retur)
      for (let w = 0; w < 30; w++) {
        await page.waitForTimeout(300)
        const st = await state()
        if (st.mode === 'aim') break
      }
    }
    return await state()
  }

  // ---- Runda 1: erbjudandet ska dyka upp och gå att ta ---------------------
  await open()
  const s0 = await state()
  ok('start: inget erbjudande, slangbellan på', !s0.harErbjudande && s0.slangbellaPa, `mode=${s0.mode} mål=${s0.totalt}`)

  const s1 = await missaTills((s) => s.harErbjudande)
  ok('1. erbjudande efter 2 missar', s1.harErbjudande && s1.knappSyns && s1.banaSyns,
    `missar=${s1.misser} knapp=${s1.knappSyns} bana=${s1.banaSyns} (${s1.banPunkter} punkter)`)
  ok('1b. hjälten står stilla vid slangbellan (skjuter inte själv)', s1.mode === 'aim' && Math.abs(s1.heroX - 240) < 6,
    `mode=${s1.mode} hero=(${s1.heroX},${s1.heroY})`)
  ok('2. prickbanan ljuger inte (närmar sig ett mål)', s1.banaTillMal !== null && s1.banaTillMal < 60,
    `närmaste punkt ${s1.banaTillMal === null ? '-' : Math.round(s1.banaTillMal)}px från ett mål`)
  ok('3. slangbellan kvar påslagen (går att sikta själv)', s1.slangbellaPa === true, `enabled=${s1.slangbellaPa}`)
  ok('2b. prickbanan går inte genom ett studsmoln', s1.bumpMargin === null || s1.bumpMargin >= 0,
    `minsta marginal ${s1.bumpMargin === null ? '- (inga moln)' : Math.round(s1.bumpMargin) + 'px'} (${s1.antalMoln} moln)`)
  ok('2c. ingen stjärna ligger ovanpå ett studsmoln', s1.stjarnKrock === false, `krock=${s1.stjarnKrock}`)
  ok('6a. Skjut!-knappen klarar P0 96px', s1.knappB >= 96 && s1.knappH >= 96, `${Math.round(s1.knappB)}×${Math.round(s1.knappH)}px`)

  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, '-erbjudande.png') })

  const fore = s1.samlade
  await tap(640, 648) // Skjut!
  let s2 = null
  for (let w = 0; w < 30; w++) {
    await page.waitForTimeout(300)
    s2 = await state()
    if (s2.samlade > fore || s2.mode === 'resolving') break
  }
  ok('4. tryck på Skjut! => stjärna samlas', s2.samlade > fore, `samlade ${fore} -> ${s2.samlade}`)
  if (shot) { await page.screenshot({ path: shot }); }

  // ---- Runda 2: no-fail-golvet när ingen trycker ---------------------------
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await open()
  const s3 = await missaTills((s) => s.harErbjudande)
  if (!s3.harErbjudande) {
    ok('5. no-fail utan tryck', false, 'kom aldrig till ett erbjudande i runda 2')
  } else {
    const fore2 = s3.samlade
    let glid = false
    let s4 = s3
    for (let w = 0; w < 60; w++) { // > OFFER_PATIENCE (12s)
      await page.waitForTimeout(400)
      s4 = await state()
      if (s4.mode === 'gliding') glid = true
      if (s4.samlade > fore2) break
    }
    ok('5. no-fail: glidet tar vid utan tryck', s4.samlade > fore2,
      `glidläge sågs=${glid} samlade ${fore2} -> ${s4.samlade}`)
  }

  // ---- Exit mitt i allt ----------------------------------------------------
  const foreExit = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(900)
  ok('6b. exit mitt i allt ger 0 nya konsolfel', errors.length === foreExit,
    errors.slice(foreExit).join(' | ') || 'inga')

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
