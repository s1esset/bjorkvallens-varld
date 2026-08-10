// SÅPBUBBLORNAS HINNA — ger den efter för vinden, och hittar den tillbaka?
//
//   node scripts/_bubbelprobe.mjs        (kräver dev-servern på :5173)
//
// En puff som bara FLYTTAR bubblor läser som att de är hårda kulor. Frågorna hinnan
// måste svara ja på:
//
//   1. Syns utdragningen alls när en puff sveper förbi? (för liten = bortkastad kod)
//   2. Har den ett TAK? (för stor = bubblan ser trasig ut)
//   3. Hittar den tillbaka till rund, eller ligger den kvar deformerad?
//   4. Är utdragningen riktad LÄNGS blåset?
//   5. Kostar den något mätbart i bildrutetid?
//   6. Överlever exit mitt i en puff?
import { chromium } from 'playwright'

const ID = 'sapbubblor'
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(() => (window.__barnspel.game?._bubbles?.length || 0) > 3, null, { timeout: 15000 })
  await page.waitForTimeout(900)

  console.log('\nSÅPBUBBLOR — hinnan i vinden\n')

  const matning = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const vanta = () => new Promise((r) => requestAnimationFrame(r))

    // Vila först: ingen puff → alla bubblor ska vara runda.
    let vilaMax = 0
    for (let i = 0; i < 40; i++) {
      await vanta()
      for (const b of g._bubbles) vilaMax = Math.max(vilaMax, b._sq || 0)
    }

    // ⚠️ MÄT PÅ EN KÄND BUBBLA, INTE PÅ "DEN SOM RÅKAR LIGGA I MITTEN". Kraften delas
    // med massan, och massan följer radien — så en sond som tar närmaste bubbla mäter en
    // ny massa varje körning. Uppmätt konsekvens: samma kod gav 42,7 % i en körning och
    // 2,9 % i nästa, alltså 15× spridning på en konstant som bara ändrats 1,6×. Sonden
    // föder därför sin EGEN bubbla med fast radie mitt i bild.
    // Ta den NYSS tillagda bubblan ur listan — en sökning på position missar, eftersom
    // bubblan stiger direkt och hinner flytta sig innan sonden hinner leta.
    const fore_n = g._bubbles.length
    g._spawn(ctx, { x: 640, y: 380, r: 40, kind: 'normal' })
    await vanta()
    const mal = g._bubbles.length > fore_n ? g._bubbles[g._bubbles.length - 1] : null
    if (!mal) return { fel: 'ingen bubbla (taket MAX_BUBBLES?)' }
    const fore = { x: mal.x, y: mal.y }
    const fan = g._nearestFan(mal.x, mal.y)
    const rutor = []
    g._blow(ctx, fan, mal.x, mal.y)
    for (let i = 0; i < 150; i++) {
      await vanta()
      if (mal.destroyed || mal._popped) break
      rutor.push({ sq: mal._sq || 0, a: mal._sqA || 0, sx: mal.scale.x, sy: mal.scale.y })
    }
    const toppIdx = rutor.reduce((bi, r, i) => (r.sq > rutor[bi].sq ? i : bi), 0)
    const topp = rutor[toppIdx] || { sq: 0, a: 0 }
    // Riktningen från fläkten till bubblan — utdragningen ska ligga längs den.
    const blasVinkel = Math.atan2(fore.y - fan.y, fore.x - fan.x)
    let dv = Math.abs(topp.a - blasVinkel)
    while (dv > Math.PI) dv = Math.abs(dv - 2 * Math.PI)
    // Hittade den tillbaka?
    const svans = rutor.slice(-25)
    const slutMax = svans.reduce((m, r) => Math.max(m, r.sq), 0)
    return {
      vilaMax,
      topp: topp.sq,
      toppRuta: toppIdx,
      vinkelfel: dv,
      slutMax,
      antalRutor: rutor.length,
      bubblor: g._bubbles.length,
      massa: mal._mass,
      radie: mal._r ?? null,
    }
  })

  ok('bubblorna är runda när det inte blåser', matning.vilaMax < 0.02, `största utdragning i vila ${matning.vilaMax?.toFixed(4)}`)
  ok(
    'en puff drar ut hinnan synligt',
    matning.topp > 0.1,
    `${(matning.topp * 100).toFixed(1)} % utdragning på en r=40-bubbla (massa ${matning.massa?.toFixed?.(2) ?? matning.massa}), ${matning.bubblor} i luften`
  )
  // Taket ska hålla — men en direktträff får inte LIGGA på det, för då slutar massan
  // synas: en liten bubbla och en jättebubbla deformeras lika mycket, fast hela
  // fläktmekaniken bygger på att kraften delas med massan.
  ok('utdragningen har ett tak, och slår inte i det', matning.topp <= 0.28, `${(matning.topp * 100).toFixed(1)} % (tak 30 %)`)
  ok('utdragningen ligger längs blåset', matning.vinkelfel < 0.6, `${((matning.vinkelfel * 180) / Math.PI).toFixed(0)}° från siktlinjen`)
  ok('hinnan hittar tillbaka till rund', matning.slutMax < 0.05, `${(matning.slutMax * 100).toFixed(1)} % kvar efter puffen`)

  // Bildrutetid med full luft + puffar.
  const fps = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const vanta = () => new Promise((r) => requestAnimationFrame(r))
    let n = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 2500) {
      await vanta()
      n++
      if (n % 20 === 0) {
        const b = g._bubbles[n % g._bubbles.length]
        if (b && !b._popped) g._blow(ctx, g._nearestFan(b.x, b.y), b.x, b.y)
      }
    }
    return { fps: Math.round((n / (performance.now() - t0)) * 1000), bubblor: g._bubbles.length }
  })
  ok('bildrutetiden håller med full luft och puffar', fps.fps >= 50, `${fps.fps} FPS med ${fps.bubblor} bubblor`)

  // Exit mitt i en puff.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const b = g._bubbles.find((x) => !x._popped)
    if (b) g._blow(ctx, g._nearestFan(b.x, b.y), b.x, b.y)
    window.__barnspel.nav.go('library')
  })
  await page.waitForTimeout(1500)
  const rivet = await page.evaluate(() => !window.__barnspel.game)
  ok('spelet är rivet efter exit mitt i en puff', rivet)
  ok('inga konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))

  console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
  process.exit(fel === 0 ? 0 : 1)
} finally {
  await browser.close()
}
