// ZACKES BILTVÄTT — vattenstrålen som riktig vätska.
//
//   node scripts/_stralprobe.mjs [--cpu N]     (kräver dev-servern på :5173)
//
// Strålen var 28 ritade cirklar i en kon som tog tvärt slut vid JET_LEN. Nu är den
// SPH ur lib/vatska.js. Frågorna som avgör om bytet är en förbättring och inte bara
// en annan sorts fusk:
//
//   1. Går strålen dit munstycket pekar? (medelriktning mot spelets egen `dir`)
//   2. Är den SAMMANHÄNGANDE? Största hålet längs banan måste rymmas inom
//      interaktionsradien, annars ritas den som prickar under metaboll-tröskeln.
//   3. Når vattnet fram till bilen?
//   4. RINNER DET AV? Vatten som blir liggande på karossen är en blå filt över
//      vindrutan — den enskilt viktigaste siffran i hela sonden.
//   5. Rinner golvpölen undan efteråt?
//   6. Håller sig antalet under taket vid ihållande spolning? (nås taket börjar
//      strålen återanvända sina EGNA partiklar och tunnas ut mitt i luften)
//   7. Vad kostar det? FPS under spolning, CPU-strypt.
//   8. Är MEKANIKEN orörd? Sköljningen avgörs av `_inJet`, inte av var en partikel
//      hamnar — samma antal sekunder till ren yta som före bytet.
//   9. Tickar något efter `destroy()` mitt i en stråle?
import { chromium } from 'playwright'

const ID = 'zackes-biltvatt'
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
  // ⚠️ TELEPORTERA INTE EN VERLET-PUNKT. Slangen är ett rep: sätts bara .x/.y läser
  // solvern skillnaden mot förra läget som en FART, och munstycket pendlar i all
  // evighet. Riktningen roterade då mellan varje bildruta och samma mätning gav
  // 340 / 123 / 47 / 0 px i fyra körningar — mätgeometrin rörde sig mer än det som
  // mättes. Här låses BÅDA de två sista punkterna med px/py = x/y (noll fart), och
  // riktningen sätts av var de ligger i förhållande till varandra. Då står strålen
  // stilla och pekar exakt dit sonden vill.
  // ⚠️ HÅLL MUNSTYCKET PÅ AVSTÅND FRÅN BILEN. Mynningen ligger 82 px bortom greppet
  // (se _nozzleTip), och bilens kollisionsbubblor når ~74 px ut från sina centrum: med
  // greppet på (380,320) FÖDDES varje partikel inuti ett hinder och bromsades i samma
  // steg — uppmätt 0,5 px/steg direkt efter en födsel på 15. Talet såg ut som ett fel
  // i strålen och var ett fel i sondens uppställning.
  const spola = async (rutor, x, y, mx, my) => {
    const pts = g._hose.pts
    const a = pts[pts.length - 2]
    const b = pts[pts.length - 1]
    let ux = 0, uy = 1
    if (mx != null) {
      const d = Math.hypot(mx - x, my - y) || 1
      ux = (mx - x) / d
      uy = (my - y) / d
    }
    g._hoseDrag = true
    for (let i = 0; i < rutor; i++) {
      a.x = a.px = x
      a.y = a.py = y
      b.x = b.px = x + ux * 42
      b.y = b.py = y + uy * 42
      await vanta(1)
    }
  }
  const slapp = async (rutor) => {
    g._hoseDrag = false
    g._hoseAuto = null
    g._hoseTarget = null
    await vanta(rutor)
  }
  // Hur mycket vatten ligger PÅ bilen? Räknas i en ram runt karossens silhuett —
  // inte i hela bilens bbox, för då räknas strålen som passerar framför med.
  // ⚠️ FRYS FÖRLOPPET INNAN DU MÄTER GEOMETRIN. Spolar man på riktigt blir bilen ren,
  // kör ut och ersätts — och mätningen landar i en slumpmässig fas av det. Samma mått
  // gav 340 / 112 / 47 / 0 px i fyra körningar innan det här. Med sköljningen bortkopplad
  // står bilen kvar och strålen är den enda som rör sig.
  const frys = () => {
    if (g.__rinse) return
    g.__rinse = g._rinseStep
    g.__wet = g._wetDirt
    g._rinseStep = () => {}
    g._wetDirt = () => {}
  }
  const tina = () => {
    if (!g.__rinse) return
    g._rinseStep = g.__rinse
    g._wetDirt = g.__wet
    g.__rinse = null
  }
  const paBilen = () => {
    const f = g._fluid
    const car = g._car
    const v = g._vehicle
    if (!f || !car || !v) return 0
    let n = 0
    const tak = car.y - v.h / 2 - v.h * v.roof
    for (let i = 0; i < f.count; i++) {
      const dx = Math.abs(f.x[i] - car.x)
      const dy = f.y[i]
      if (dx < v.w / 2 + 30 && dy > tak - 40 && dy < car.y + v.h / 2 + 10) n++
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
  await page.waitForFunction(() => !!window.__barnspel.game?._hose, null, { timeout: 20000 })
  await page.waitForTimeout(900)

  const kor = (kropp, arg) => page.evaluate(new Function('arg', `return (async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    ${HJALP}
    ${kropp}
  })()`), arg)

  console.log(`\nZACKES BILTVÄTT — vattenstrålen${CPU > 1 ? ` (CPU ×${CPU})` : ''}\n`)

  const finns = await kor(`return { fluid: !!g._fluid, hinder: g._fluid ? g._fluid.colliders.length : 0 }`)
  if (!finns.fluid) {
    ok('strålen är riktig vätska', false, 'HEAD: `_fluid` finns inte — strålen är fortfarande ritade cirklar')
    console.log('\n  ⚠ resten kan inte mätas\n')
    process.exit(1)
  }
  ok('bilen är ett hinder i vätskan', finns.hinder >= 1, `${finns.hinder} colliders`)

  // --- 1, 2, 3: strålen ------------------------------------------------------
  const stral = await kor(`
    const f = g._fluid
    frys()
    // ⚠️ LÅT SLANGEN SÄTTA SIG FÖRST, och töm vattnet EFTERÅT. Slangen är en verlet-
    // kedja: dess viloläge — och därmed munstyckets riktning — är fortfarande på väg
    // in de första bildrutorna. Mättes strålen medan den vandrade föddes partiklarna
    // under en annan riktning än den som sedan lästes, och samma mått gav 340 px i en
    // körning och 112 i nästa. Nu är varje mätt partikel född under EN riktning.
    await spola(70, 300, 250, g._car.x, g._car.y - 10)
    f.clear()
    await spola(90, 300, 250, g._car.x, g._car.y - 10)
    const { tip, dir } = g._nozzleTip()
    // ⚠️ MED TVÅ MÄTT SOM BÅDA VAR FEL INNAN DET HÄR: en rak axel räknade bort
    // strålens egen svans (en riktig stråle är en BÅGE), och partikelfarten nära
    // munstycket mätte 0,2–4,7 px/steg trots 15 vid födseln — partiklar föds tätare
    // än de hinner flyta undan, så SPH:ns närtryck bromsar varje droppe medan själva
    // FRONTEN ändå går framåt. En 70 px-zon runt munstycket bär dessutom vatten som
    // stänkt TILLBAKA från bilen, alltså per definition mot strålens riktning.
    //
    // Frågan som betyder något för barnet: når BILDEN lika långt som spelet REGÖR?
    // Träffprövningen godkänner allt inom JET_LEN, så en stråle som tar slut på halva
    // vägen gör rent där det inte syns något vatten alls. Och sammanhanget mäts som
    // varje partikels avstånd till sin NÄRMASTE GRANNE — det bryr sig inte om banans form.
    let langst = 0
    let sidled = 0
    let nv = 0
    const flyg = []
    for (let i = 0; i < f.count; i++) {
      const wx = f.x[i] - tip.x
      const wy = f.y[i] - tip.y
      const t = wx * dir.x + wy * dir.y
      const perp = wx * -dir.y + wy * dir.x
      // ⚠️ INGET FARTFILTER PÅ RÄCKVIDDEN. Strålen är inte ballistiska droppar: varje
      // partikel bromsas av sina egna grannar inom ~30 px, medan FRONTEN drivs framåt
      // av trycket bakom. Ett filter på sp > 1,5 mätte därför "hur långt en snabb
      // droppe kommer" (27 px) i ett vattenband som i själva verket nådde bilen.
      // Vätskan är tömd före mätningen, så varje partikel HÄR kommer ur den här strålen.
      if (t > 0) {
        if (t > langst) langst = t
        if (t < 340) flyg.push(i)
        // Centreringen mäts BARA på strålens kropp. Räknas golvpölen med hamnar den i
        // medelvärdet och siktlinjen ser snedvriden ut fastän strålen ligger rakt.
        if (t > 20 && t < 235) { sidled += perp; nv++ }
      }
    }
    let storstaHal = 0
    for (const i of flyg) {
      let nara = Infinity
      for (const j of flyg) {
        if (i === j) continue
        nara = Math.min(nara, Math.hypot(f.x[i] - f.x[j], f.y[i] - f.y[j]))
      }
      if (isFinite(nara)) storstaHal = Math.max(storstaHal, nara)
    }
    const langs = flyg
    const car = g._car
    const v = g._vehicle
    let traffar = 0
    for (let i = 0; i < f.count; i++) {
      if (Math.abs(f.x[i] - car.x) < v.w / 2 + 40 && Math.abs(f.y[i] - car.y) < v.h) traffar++
    }
    return { iStralen: langs.length, storstaHal, langst, count: f.count, nv, sidled: nv ? sidled / nv : 0, jetLen: 235, traffar, radie: f.radius, antal: f.count }
  `)

  ok('BILDEN når lika långt som spelet RENGÖR', stral.langst >= stral.jetLen * 0.8,
    `vattnet når ${n1(stral.langst)} px av ${stral.jetLen} px, ${stral.count} partiklar totalt`)
  ok('strålen ligger centrerad på siktlinjen', stral.nv > 5 && Math.abs(stral.sidled) < 40,
    `tyngdpunkt ${n1(stral.sidled)} px på ${stral.nv} partiklar i bandet (0 partiklar = inget mätt)`)
  ok('strålen är SAMMANHÄNGANDE', stral.iStralen > 10 && stral.storstaHal < stral.radie,
    `${stral.iStralen} partiklar i luften, värsta grannavstånd ${n1(stral.storstaHal)} px (interaktionsradie ${stral.radie} px)`)
  ok('vattnet når fram till bilen', stral.traffar >= 6, `${stral.traffar} partiklar vid karossen`)

  // --- 4: rinner det av bilen? ----------------------------------------------
  const avrinning = await kor(`
    const pa0 = paBilen()
    await slapp(90) // 1,5 s
    const pa1 = paBilen()
    await slapp(90) // 3,0 s
    return { pa0, pa1, pa2: paBilen() }
  `)
  ok('vattnet RINNER AV karossen', avrinning.pa2 <= 3,
    `på bilen: ${avrinning.pa0} under spolning → ${avrinning.pa1} efter 1,5 s → ${avrinning.pa2} efter 3 s`)

  // --- 5: golvpölen ---------------------------------------------------------
  const pol = await kor(`
    const f = g._fluid
    await spola(60, 300, 250, g._car.x, g._car.y - 10)
    const under = f.count
    await slapp(60)
    const e1 = f.count
    await slapp(180)
    return { under, e1, e2: f.count }
  `)
  ok('golvpölen rinner undan efteråt', pol.e2 <= 12,
    `${pol.under} under spolning → ${pol.e1} efter 1 s → ${pol.e2} efter 4 s`)

  // --- 6: taket -------------------------------------------------------------
  const tak = await kor(`
    const f = g._fluid
    f.clear()
    let topp = 0
    for (let r = 0; r < 6; r++) {
      await spola(60, 300, 250, g._car.x, g._car.y - 10)
      topp = Math.max(topp, f.count)
    }
    return { topp, max: f.max }
  `)
  ok('antalet håller sig under taket vid lång spolning', tak.topp < tak.max,
    `topp ${tak.topp} av taket ${tak.max} (${Math.round((tak.topp / tak.max) * 100)} %)`)

  // --- 7: kostnaden ---------------------------------------------------------
  const fps = await kor(`
    const f = g._fluid
    let rutor = 0
    const t0 = performance.now()
    const pts = g._hose.pts
    g._hoseDrag = true
    while (performance.now() - t0 < 2000) {
      const n = pts[pts.length - 2]
      n.x = 300; n.y = 250
      g._hoseAuto = { x: g._car.x, y: g._car.y - 10, t: 5 }
      await vanta(1)
      rutor++
    }
    const f1 = rutor / ((performance.now() - t0) / 1000)
    await slapp(120)
    let r2 = 0
    const t1 = performance.now()
    while (performance.now() - t1 < 1500) { await vanta(1); r2++ }
    return { spolar: f1, vila: r2 / ((performance.now() - t1) / 1000), antal: f.count }
  `)
  const golv = CPU > 1 ? 24 : 50
  ok('spelet håller bildfrekvensen medan det spolar', fps.spolar >= golv,
    `${n1(fps.spolar)} fps spolande mot ${n1(fps.vila)} fps i vila (golv ${golv})`)

  // --- 8: mekaniken orörd ---------------------------------------------------
  const mek = await kor(`
    tina() // sköljningen tillbaka: den här raden ska mäta den riktiga mekaniken
    // Gör en fläck till skum och spola den — samma väg spelet självt går.
    const spot = g._spots.find((s) => !s.view.destroyed)
    if (!spot) return { ingen: true }
    spot.fas = 'skum'
    spot.arbete = 0
    const w = g._spotWorld(spot)
    const steg0 = spot.steg
    const t0 = performance.now()
    let rutor = 0
    const pts = g._hose.pts
    g._hoseDrag = true
    while (g._spots.includes(spot) && !spot.view.destroyed && rutor < 400) {
      const n = pts[pts.length - 2]
      n.x = w.x - 150; n.y = w.y - 130
      g._hoseAuto = { x: w.x, y: w.y, t: 5 }
      await vanta(1)
      rutor++
    }
    g._hoseDrag = false
    g._hoseAuto = null
    return { rutor, borta: !g._spots.includes(spot) || spot.view.destroyed }
  `)
  ok('en skumfläck går fortfarande att spola bort', !mek.ingen && mek.borta,
    mek.ingen ? 'ingen fläck att mäta på' : `${mek.rutor} bildrutor i strålen`)

  // --- 9: exit --------------------------------------------------------------
  const exitFel = []
  page.on('pageerror', (e) => exitFel.push(e.message))
  await kor(`
    await spola(20, 300, 250, g._car.x, g._car.y - 10)
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
