// PLASK-SOND — gör vattnet i `plask-i-vattnet` något, eller ligger det bara där?
//
//   node scripts/_plaskprobe.mjs            (kräver dev-servern på :5173)
//
// `_vatskeprobe` svarar på om vätskan finns, syns och kostar. Den kan INTE svara på om
// den reagerar: ytans 5:e percentil rör sig knappt ens när sex föremål ligger i tanken.
// Den här mäter de fyra sakerna spelet faktiskt lovar:
//
//   1. STÄNK — slår föremålet igenom ytan så att vatten kastas upp?
//   2. UNDANTRÄNGNING — stiger nivån när en volym sänks ner (och sjunker den tillbaka)?
//   3. TAKET — kan en droppe lämna tanken? (P0: inget får hamna utanför banan)
//   4. VOLYMEN — är antalet partiklar konstant? (ingen kran, inget läckage)
//
// Allt mäts på partiklarnas egna koordinater, inte på skärmdumpen: en droppe som flyger
// 60 px upp är 3 px på bilden men hela skillnaden mellan "plask" och "plopp".
import { chromium } from 'playwright'

const ID = 'plask-i-vattnet'
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
  await page.waitForFunction(() => !!window.__barnspel.game?._fluid, null, { timeout: 15000 })
  await page.waitForTimeout(1400) // låt vattnet lägga sig

  // Vattnets tillstånd i tal.
  //
  // ⚠️ NIVÅN ÄR YTANS MEDELHÖJD ÖVER HELA TANKEN, inte den översta partikeln i ett
  // mittband. Ett grunt skikt jämnar inte ut sig direkt: vattnet BUKTAR där flytaren
  // ligger och står kvar en bit därifrån. Mätt i ett fast band gav samma kod och samma
  // radie 15 px lyft i en körning och 4 px i nästa — skillnaden var var flytarna råkade
  // hamna i sina banor, inte hur mycket vatten de trängde undan. Ytprofilen samplas
  // därför i tolv kolumner (översta partikeln i varje) och medelvärdet är nivån.
  const las = () =>
    page.evaluate(() => {
      const g = window.__barnspel.game
      const f = g._fluid
      const n = f.count
      let topp = 1e9
      let ute = 0
      const KOL = 12
      const L = 414
      const R = 866
      const kol = new Array(KOL).fill(1e9)
      for (let i = 0; i < n; i++) {
        const x = f.x[i]
        const y = f.y[i]
        if (y < topp) topp = y
        if (x < 390 || x > 890 || y < 246 || y > 700) ute++
        const k = Math.floor(((x - L) / (R - L)) * KOL)
        if (k >= 0 && k < KOL && y < kol[k]) kol[k] = y
      }
      const giltiga = kol.filter((v) => v < 1e9)
      const yta = giltiga.length ? giltiga.reduce((s, v) => s + v, 0) / giltiga.length : -1
      return {
        antal: n,
        topp: Math.round(topp),
        yta: Math.round(yta),
        ute,
        hinder: f.colliders.length,
        medColl: g._objects.filter((o) => o._coll).length,
        iVatten: g._objects.length,
        flytande: g._objects.filter((o) => o.floats).length,
      }
    })

  // ⚠️ SLÄPP ALLTID FLYTARE. Rundan delar ut 2–4 flytare och resten sjunkare på slump,
  // och båda måtten hänger på vilket slag som råkar komma: uppmätt stänk 23 px för en
  // badring men 11 px för en nyckel (flytkraften bromsar flytaren i ytan och kastar upp
  // vatten; sjunkaren skär igenom), och lyftet försvinner helt om rundan gav få flytare.
  // En sond som släpper "nästa föremål" mäter alltså tärningen, inte vattnet.
  const slapp = (antal) =>
    page.evaluate((k) => {
      const g = window.__barnspel.game
      const ctx = window.__barnspel.ctx
      const kvar = g._drag.items.filter((r) => !r.placed && r.data.floats).slice(0, k)
      for (const rec of kvar) {
        rec.placed = true
        g._onDrop(ctx, rec)
      }
      return kvar.map((r) => r.data.kind + (r.data.floats ? '(flyter)' : '(sjunker)'))
    }, antal)

  console.log('\nPLASK I VATTNET — gör vattnet något?\n')

  const vila = await las()
  console.log(`0. Vila · ${vila.antal} partiklar · yta y=${vila.yta} · högsta droppe y=${vila.topp} · ${vila.hinder} hinder`)
  ok('vattnet ligger still på ytlinjen (330)', Math.abs(vila.yta - 330) <= 8, `yta y=${vila.yta}`)
  ok('inga hinder innan något släppts', vila.hinder === 0)

  // 1. STÄNKET. Släppet OCH mätningen sker i EN evaluate med en rAF-loop: en droppes
  // topp varar 2–3 bildrutor, och en mätning som pollar över Playwright-anropet (5–15 ms
  // per tur och retur) hoppar över just de rutorna och underskattar stänket.
  console.log('\n1. Stänk när ett föremål slår igenom ytan')
  const stankMatning = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const rec = g._drag.items.find((r) => !r.placed && r.data.floats)
    rec.placed = true
    g._onDrop(ctx, rec)
    const f = g._fluid
    let topp = 1e9
    let ute = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 900) {
      await new Promise((r) => requestAnimationFrame(r))
      for (let i = 0; i < f.count; i++) {
        const x = f.x[i]
        const y = f.y[i]
        if (y < topp) topp = y
        if (x < 390 || x > 890 || y < 246 || y > 700) ute++
      }
    }
    return { namn: rec.data.kind + (rec.data.floats ? '(flyter)' : '(sjunker)'), topp: Math.round(topp), ute }
  })
  const namn = [stankMatning.namn]
  const hogst = stankMatning.topp
  const utePeak = stankMatning.ute
  const stank = vila.yta - hogst
  console.log(`   släppte ${namn.join(' ')} → högsta droppe y=${hogst}`)
  ok('vatten kastas upp över ytan', stank > 14, `${Math.round(stank)} px över ytan`)
  ok('ingen droppe lämnar tanken', utePeak === 0, `${utePeak} partiklar utanför`)

  // 2. UNDANTRÄNGNING. TRE till (inte resten): sex släpp är en hel runda, och då firar
  // spelet och lägger ut en ny uppsättning — sondens första version mätte därför nivån i
  // en TÖMD tank och rapporterade "0 föremål i vattnet, 0 px lyft".
  console.log('\n2. Undanträngning när volym sänks ner')
  await slapp(3)
  await page.waitForTimeout(2600)
  // ⚠️ ETT ENDA PROV ÄR SVALL, INTE NIVÅ. Samma kod och samma radie gav 2 px lyft i en
  // körning och 25 px i nästa — skillnaden var vilken fas av vaggningen provet råkade
  // träffa. Nivån är därför medelvärdet av ytans medelhöjd över en sekunds bildrutor.
  const fullt = await las()
  fullt.yta = await page.evaluate(async () => {
    const f = window.__barnspel.game._fluid
    let summa = 0
    let rutor = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 1000) {
      await new Promise((r) => requestAnimationFrame(r))
      const KOL = 12
      const kol = new Array(KOL).fill(1e9)
      for (let i = 0; i < f.count; i++) {
        const k = Math.floor(((f.x[i] - 414) / 452) * KOL)
        if (k >= 0 && k < KOL && f.y[i] < kol[k]) kol[k] = f.y[i]
      }
      const g2 = kol.filter((v) => v < 1e9)
      if (g2.length) {
        summa += g2.reduce((s, v) => s + v, 0) / g2.length
        rutor++
      }
    }
    return rutor ? summa / rutor : -1
  })
  const lyft = vila.yta - fullt.yta
  console.log(`   ${fullt.iVatten} föremål i vattnet (${fullt.flytande} flyter) · ${fullt.hinder} hinder i vätskan · yta y=${fullt.yta}`)
  // En bild av just DET läget: flytare i ytan, nivån uppe. `_vatskeprobe --losa` släpper
  // hela rundan och hinner därför fira och tömma tanken innan skärmdumpen tas — den
  // bilden visar ett tomt kärl och säger ingenting om hur vattnet bär föremål.
  await page.screenshot({ path: '.test-shots/_plask-i-skiktet.png' })
  // Invarianten är att vätskans hinderlista och föremålens `_coll` är i takt — inte att
  // varje flytare har ett hinder. Ett föremål som ännu inte nått vattnet SKA sakna
  // hinder, och sondens första version läste det som ett fel (2 hinder mot 3 flytande).
  // Det som vore en äkta bugg är ett kvarglömt hinder: vatten som trängs undan av
  // ingenting.
  ok('inga kvarglömda hinder i vätskan', fullt.hinder === fullt.medColl && fullt.medColl > 0, `${fullt.hinder} hinder · ${fullt.medColl} föremål i skiktet av ${fullt.iVatten}`)
  // Per flytare, inte i absoluta tal: rundans sammansättning är slumpad (2–4 flytare),
  // så ett fast krav mäter tärningen och inte vattnet.
  ok('nivån stiger av undanträngd volym', fullt.flytande > 0 && lyft / fullt.flytande >= 2, `${Math.round(lyft)} px på ${fullt.flytande} flytare`)
  ok('nivån stiger LAGOM (svämmar inte över rimmen)', lyft < 46, `${Math.round(lyft)} px av 80 px marginal`)

  // 2b. VÄRSTA FALLET: allt som är kvar i tanken samtidigt. Det är här P0-taket prövas —
  //     nivån får aldrig nå rimmen (250) och inget får hamna utanför tanken. (Sex släpp
  //     är en hel runda, så tanken töms strax efteråt; toppen mäts före det.)
  console.log('\n2b. Allt i tanken samtidigt (värsta fallet)')
  const varst = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    for (const rec of g._drag.items.filter((r) => !r.placed)) {
      rec.placed = true
      g._onDrop(ctx, rec)
    }
    const f = g._fluid
    let hogstNiva = 1e9
    let ute = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 1800) {
      await new Promise((r) => requestAnimationFrame(r))
      const KOL = 12
      const kol = new Array(KOL).fill(1e9)
      for (let i = 0; i < f.count; i++) {
        const x = f.x[i]
        const y = f.y[i]
        if (x < 390 || x > 890 || y < 246 || y > 700) ute++
        const k = Math.floor(((x - 414) / 452) * KOL)
        if (k >= 0 && k < KOL && y < kol[k]) kol[k] = y
      }
      const g2 = kol.filter((v) => v < 1e9)
      if (g2.length) hogstNiva = Math.min(hogstNiva, g2.reduce((s, v) => s + v, 0) / g2.length)
    }
    return { niva: Math.round(hogstNiva), ute }
  })
  console.log(`   högsta nivå med allt i: y=${varst.niva} (vila ${Math.round(vila.yta)}, rim 250)`)
  ok('nivån når aldrig rimmen', varst.niva > 268, `${varst.niva - 250} px kvar till rimmen`)
  ok('inget vatten utanför tanken ens då', varst.ute === 0, `${varst.ute} partiklar utanför`)

  // 3. VOLYMEN är konstant och ingen droppe har rymt.
  console.log('\n3. Volym och tak')
  ok('samma antal partiklar som vid start', fullt.antal === vila.antal, `${vila.antal} → ${fullt.antal}`)
  ok('allt vatten är kvar i tanken', fullt.ute === 0, `${fullt.ute} utanför`)

  // 4. EXIT mitt i plasket: lämna spelet direkt efter ett släpp.
  console.log('\n4. Exit')
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1600) // skärmbytet har en övergång; 700 ms mätte den, inte rivningen
  const efter = await page.evaluate(() => ({ spel: !!window.__barnspel.game, fel: 0 }))
  ok('spelet är rivet efter navigering', !efter.spel)
  ok('inga konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))

  console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
  process.exit(fel === 0 ? 0 : 1)
} finally {
  await browser.close()
}
