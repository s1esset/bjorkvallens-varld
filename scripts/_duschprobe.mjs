// TVÄTTA DJURET — duschen som riktig vätska.
//
//   node scripts/_duschprobe.mjs [--cpu N]     (kräver dev-servern på :5173)
//
// Sprayen var 24 egna droppar på 4 px radie i blekblått: uppmätt 6,8 px till närmaste
// granne — långt inom en metaboll-radie — men ritade var för sig och därmed i praktiken
// osynliga mot lerans brunt. Halva spelets loop syntes inte. Nu är den SPH.
//
// ⚠️ SKÖLJNINGEN LEVER I SAMMA VATTEN som bilden: den utlöses av partiklar som just
// kommit in i silhuetten. Det gör rad 5 till passets viktigaste — ändras sköljtakten
// har spelet blivit lättare eller svårare utan att någon bett om det. Den raden är
// skriven så att den kör på BÅDA armarna (den rör bara `_sprayOn`, `_nozzle`, `_foam`).
//
//   1. Är strålen SAMMANHÄNGANDE? (grannavstånd mot interaktionsradien)
//   2. Når vattnet fram till djuret?
//   3. Blir det INTE liggande? (en blå platta på ryggen är felet som lurade två gånger)
//   4. Rinner karpölen undan?
//   5. Är SKÖLJTAKTEN oförändrad mot HEAD? (bildrutor tills allt skum är borta)
//   6. Vad kostar det?
//   7. Tickar något efter destroy() mitt i en stråle?
import { chromium } from 'playwright'

const ID = 'tvatta-djuret'
const cpuArg = process.argv.indexOf('--cpu')
const CPU = cpuArg > 0 ? Number(process.argv[cpuArg + 1]) : 0

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : String(v))

const HJALP = `
  const vanta = (n = 1) => new Promise((r) => {
    let i = 0
    const steg = () => (++i >= n ? r() : requestAnimationFrame(steg))
    requestAnimationFrame(steg)
  })
  // Hall duschen stilla over djuret. Munstyckets lage ar spelets egen _nozzle.
  const spola = async (rutor, x, y) => {
    g._showerReady = true
    for (let i = 0; i < rutor; i++) {
      g._sprayOn = true
      g._nozzle = { x, y }
      await vanta(1)
    }
  }
  const slapp = async (rutor) => {
    g._sprayOn = false
    await vanta(rutor)
  }
  // Hur mycket vatten ligger PÅ djuret? Mäts mot silhuetten med samma marginal som
  // spelet självt använder — en vilande droppe ligger en kroppsradie UTANFÖR ellipsen.
  const paDjuret = () => {
    const f = g._fluid
    if (!f) return 0
    let n = 0
    for (let i = 0; i < f.count; i++) {
      for (const e of g._silh) {
        const dx = (f.x[i] - e.cx) / (e.rx + 14)
        const dy = (f.y[i] - e.cy) / (e.ry + 14)
        if (dx * dx + dy * dy <= 1) { n++; break }
      }
    }
    return n
  }
`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))
  if (CPU > 1) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  }
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(() => !!window.__barnspel.game?._silh, null, { timeout: 20000 })
  await page.waitForTimeout(900)

  const kor = (kropp, arg) => page.evaluate(new Function('arg', `return (async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    ${HJALP}
    ${kropp}
  })()`), arg)

  console.log(`\nTVÄTTA DJURET — duschen${CPU > 1 ? ` (CPU ×${CPU})` : ''}\n`)

  // --- 5 FÖRST: sköljtakten, det enda måttet som kör på båda armarna ---------
  // Lägg ut ett fast rutnät skum över ryggen och mät hur många bildrutor duschen
  // behöver för att skölja bort allt. Förloppet är fryst i övrigt: inga nya fläckar.
  const skolj = await kor(`
    for (const f of [...g._foam]) { if (f.view && !f.view.destroyed) f.view.destroy() }
    g._foam.length = 0
    for (let i = 0; i < 12; i++) g._spawnFoam(520 + (i % 6) * 60, 380 + Math.floor(i / 6) * 60)
    const start = g._foam.length
    let rutor = 0
    g._showerReady = true
    // ⚠️ HÅLL DUSCHEN PÅ DJURET, och svep. Med munstycket i LUFTEN över ryggen blev
    // raden röd i BÅDA armarna: vattnet räknas av spelet vid sin INGÅNGSPUNKT i
    // silhuetten, alltså högst upp på ryggen, och skum 100 px längre ner ligger
    // utanför sköljradien 44. Ett barn håller duschmunstycket mot den smutsiga
    // fläcken — sonden måste göra samma sak, annars mäter den sin egen uppställning.
    while (g._foam.some((f) => !f._rinsed) && rutor < 1200) {
      g._sprayOn = true
      g._nozzle = { x: 640 + Math.sin(rutor / 42) * 170, y: 380 + Math.sin(rutor / 96) * 40 }
      await vanta(1)
      rutor++
    }
    g._sprayOn = false
    return { start, rutor, kvar: g._foam.filter((f) => !f._rinsed).length, harFluid: !!g._fluid }
  `)
  // HEADs egen siffra, mätt med exakt den här raden mot `git stash`: 248 bildrutor.
  // Sköljningen utlöses per partikel som kommer in i silhuetten, så TÄTHETEN på
  // strålen ÄR spelets svårighet. Bandet nedan är därför inte kosmetik — utan det
  // kan en tuning-ändring göra spelet dubbelt så trögt utan att någon märker det.
  const HEAD_RUTOR = 248
  ok('duschen sköljer bort allt skum', skolj.kvar === 0,
    `${skolj.start} skumfläckar borta på ${skolj.rutor} bildrutor (${(skolj.rutor / 60).toFixed(1)} s)`)
  ok('SVÅRIGHETEN är oförändrad mot HEAD', skolj.rutor > HEAD_RUTOR * 0.7 && skolj.rutor < HEAD_RUTOR * 1.35,
    `${skolj.rutor} bildrutor mot HEADs ${HEAD_RUTOR} (band 174–335)`)

  if (!skolj.harFluid) {
    console.log('\n  ⚠ HEAD: `_fluid` finns inte — resten kan inte mätas\n')
    process.exit(1)
  }

  // --- 1, 2, 3: strålen -----------------------------------------------------
  const stral = await kor(`
    const f = g._fluid
    f.clear()
    await spola(80, 640, 210)
    let varsta = 0
    for (let i = 0; i < f.count; i++) {
      let nara = Infinity
      for (let j = 0; j < f.count; j++) {
        if (i === j) continue
        nara = Math.min(nara, Math.hypot(f.x[i] - f.x[j], f.y[i] - f.y[j]))
      }
      if (isFinite(nara)) varsta = Math.max(varsta, nara)
    }
    return { antal: f.count, varsta, radie: f.radius, pa: paDjuret(), max: f.max }
  `)
  ok('strålen är SAMMANHÄNGANDE', stral.antal > 20 && stral.varsta < stral.radie,
    `${stral.antal} partiklar, värsta grannavstånd ${n1(stral.varsta)} px (interaktionsradie ${stral.radie} px)`)
  ok('vattnet når fram till djuret', stral.pa >= 5, `${stral.pa} partiklar på silhuetten`)
  ok('antalet håller sig under taket', stral.antal < stral.max,
    `${stral.antal} av taket ${stral.max} (${Math.round((stral.antal / stral.max) * 100)} %)`)

  // --- 3: ingen blå platta på ryggen ---------------------------------------
  const platta = await kor(`
    const pa0 = paDjuret()
    await slapp(60)
    const pa1 = paDjuret()
    await slapp(120)
    return { pa0, pa1, pa2: paDjuret(), kvar: g._fluid.count }
  `)
  ok('vattnet blir INTE liggande på djuret', platta.pa2 === 0,
    `på djuret: ${platta.pa0} under spolning → ${platta.pa1} efter 1 s → ${platta.pa2} efter 3 s`)

  // --- 4: karpölen ----------------------------------------------------------
  const pol = await kor(`
    const f = g._fluid
    await spola(90, 640, 210)
    const under = f.count
    await slapp(60)
    const e1 = f.count
    await slapp(240)
    return { under, e1, e2: f.count }
  `)
  ok('karpölen rinner undan', pol.e2 <= 10,
    `${pol.under} under spolning → ${pol.e1} efter 1 s → ${pol.e2} efter 5 s`)

  // --- 6: kostnaden ---------------------------------------------------------
  const fps = await kor(`
    let rutor = 0
    const t0 = performance.now()
    g._showerReady = true
    while (performance.now() - t0 < 2000) {
      g._sprayOn = true
      g._nozzle = { x: 640, y: 210 }
      await vanta(1)
      rutor++
    }
    const f1 = rutor / ((performance.now() - t0) / 1000)
    await slapp(150)
    let r2 = 0
    const t1 = performance.now()
    while (performance.now() - t1 < 1500) { await vanta(1); r2++ }
    return { spolar: f1, vila: r2 / ((performance.now() - t1) / 1000) }
  `)
  const golv = CPU > 1 ? 24 : 50
  ok('spelet håller bildfrekvensen medan det duschar', fps.spolar >= golv,
    `${n1(fps.spolar)} fps duschande mot ${n1(fps.vila)} fps i vila (golv ${golv})`)

  // --- 7: exit --------------------------------------------------------------
  const exitFel = []
  page.on('pageerror', (e) => exitFel.push(e.message))
  await kor(`
    await spola(20, 640, 210)
    app.nav.go('library')
  `)
  await page.waitForTimeout(1200)
  ok('inga fel när man lämnar mitt i en stråle', exitFel.length === 0, exitFel.slice(0, 2).join(' | ') || 'tyst')
  ok('inga konsolfel under hela körningen', errors.length === 0, errors.slice(0, 2).join(' | ') || 'tyst')

  console.log(`\n  ${fel === 0 ? '✅ ALLA GRÖNA' : `❌ ${fel} röda`}\n`)
  process.exit(fel === 0 ? 0 : 1)
} finally {
  await browser.close()
}
