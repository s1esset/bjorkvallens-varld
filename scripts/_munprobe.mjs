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
      // Huvudgesten: lutar han sig MOT maten? Läses som riggens eget fält, inte som en
      // pixelmätning i bild — gesten är en transform och har ett exakt tal.
      luta: Math.round((a?._g?.lutaR ?? 0) * 1000) / 1000,
      // Blicken läses i TVÅ lager: vilken lapp riggen VALT, och hur mycket den faktiskt
      // syns. Bara namnet hade varit mekanismen och inte fenomenet — lappen korsbleks, så
      // ett valt namn med alfa 0 betyder att ögonen står kvar rakt fram.
      blick: a?._blickNamn ?? null,
      // ÖNSKAN (v1.214): efter ett släpp står blicken inte längre alltid rakt fram — har
      // pappa en lust tittar han på DEN. Utan det här fältet läste raden nedan hans
      // önskan som "ögonen följer inte maten", alltså ett falskt rött på en ny funktion.
      onskan: g._onskan?.rec?.view && !g._onskan.rec.view.destroyed
        ? { x: Math.round(g._onskan.rec.view.x), y: Math.round(g._onskan.rec.view.y) }
        : null,
      blickA: a?._blickar
        ? Math.round(Math.max(...Object.values(a._blickar).map((s) => s.alpha)) * 100) / 100
        : null,
      // Kontinuerliga ljud: spelets egen lista och tjänstens faktiska källor. BÅDA behövs
      // — spelet kan tro att en slinga går utan att tjänsten startat den, och tjänsten kan
      // bära en slinga som spelet tappat räkningen på (det är den som låter kvar på menyn).
      slingor: [...(g._slingor || [])],
      kallor: window.__barnspel?.audio?._loops?.size ?? 0,
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
  // BLICKEN i samma grepp: samma matbit hålls först klart till VÄNSTER om ansiktet, sedan
  // klart till höger. De två är varandras kontrollarmar — ett "blick_v" utan mätningen åt
  // andra hållet kan lika gärna vara en lapp som fastnat, och `blick(0,0)` efter släppet
  // är den tredje. Punkterna räknas ur `mun.x` (= ansiktets mittlinje), aldrig hårdkodat.
  await page.mouse.move(s.mun.x - 260, s.mun.y)
  await page.waitForTimeout(320)
  const bVanster = await las(page)
  await page.mouse.move(s.mun.x + 260, s.mun.y)
  await page.waitForTimeout(320)
  const bHoger = await las(page)
  await page.mouse.move(s.mun.x + 40, s.mun.y + 30)
  // 300 ms, inte 160: gapet sätts i spelets tick, och EN lång bildruta i mätögonblicket
  // gav en gång 0,00 med draget bevisat levande (1 av 5 körningar). Mätfönstret ska inte
  // ligga i samma storleksordning som en bildruta.
  await page.waitForTimeout(300)
  const nara = await las(page)
  const naraMun = nara.gap
  console.log(`  (drag långt bort: ${JSON.stringify(fjarran.drag)} · vid munnen: ${JSON.stringify(nara.drag)})`)
  // Lutningen mäts i SAMMA drag: han ska luta sig mot maten när den är nära, och stå
  // rakt när ingen drar. Kontrollarmen är läget efter släppet.
  const lutaNara = nara.luta
  await page.mouse.move(bit.x, bit.y)
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(700)
  const efterSlapp = await las(page)
  console.log(`\n  GAP  långt bort ${langtBort.toFixed(2)}  →  vid munnen ${naraMun.toFixed(2)}   ${naraMun > langtBort + 0.3 ? '✓' : '✗ munnen bjuder inte in'}`)
  console.log(`  LUTA vid munnen ${lutaNara.toFixed(3)} rad · efter släppet ${efterSlapp.luta.toFixed(3)}   ` +
    `${Math.abs(lutaNara) > 0.004 && Math.abs(efterSlapp.luta) < 0.004 ? '✓' : '✗ huvudet följer inte maten (eller går inte tillbaka)'}`)
  // Tredje läsningen: blicken ska SLUTA följa den släppta biten. Väntat läge beror på om
  // han just då har en önskan — då tittar han på den i stället för rakt fram (v1.214), och
  // riktningen räknas ur samma tal som spelet självt använder.
  const vantatEfter = (() => {
    const o = efterSlapp.onskan
    if (!o) return null
    const k = { v: Math.max(0, -(o.x - efterSlapp.mun.x) / 300), h: Math.max(0, (o.x - efterSlapp.mun.x) / 300),
      ner: Math.max(0, (o.y - efterSlapp.mun.y) / 200) }
    return Object.keys(k).reduce((b, n) => (k[n] > k[b] ? n : b), 'v')
  })()
  const blickOk = bVanster.blick === 'v' && bHoger.blick === 'h' && bVanster.blickA > 0.5 && bHoger.blickA > 0.5 &&
    (vantatEfter === null ? (efterSlapp.blick === null && efterSlapp.blickA < 0.2) : efterSlapp.blick === vantatEfter)
  console.log(`  BLICK maten till vänster ${bVanster.blick} (alfa ${bVanster.blickA}) · till höger ${bHoger.blick} ` +
    `(alfa ${bHoger.blickA}) · efter släppet ${efterSlapp.blick} (alfa ${efterSlapp.blickA}, ` +
    `väntat ${vantatEfter ?? 'rakt fram'}${efterSlapp.onskan ? ' — han önskar sig något' : ''})   ` +
    `${blickOk ? '✓' : '✗ ögonen följer inte maten'}`)

  // ---- 2. ETT MÅL: mata en bit --------------------------------------------
  s = await las(page)
  const forsta = s.mat[0]
  const fore = { atna: s.atna, fyll: s.fyll, kvar: s.mat.length }
  // TUGGAR HAN OLIKA PÅ OLIKA MAT? Käkens öppning spelas in bildruta för bildruta under
  // tugget och sammanbitningarna räknas som stigande flanker. Väntat antal läses ur
  // SPELETS egen tabell (`tuggProfil`), inte ur en kopia här — en kopia hade drivit isär
  // vid första ändringen och sonden hade då mätt sig själv.
  //
  // ⚠️ MÄTFÖNSTRET FÅR INTE BÖRJA FÖRE SLÄPPET. Gapet följer fingret medan maten dras och
  // står på 1,00 vid munnen — det är en stigande flank som inte är en tugga, och första
  // körningen räknade därför 3 där profilen säger 2. Fönstret startar efter `mouse.up`.
  // Minen läses i SAMMA fönster: hållet är ~1,4 s och en avläsning efter en 2,6 s
  // inspelning kommer alltid för sent (den rapporterade "(ingen)" med allt i sin ordning).
  await drag(forsta, s.mun)
  const tugg = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const a = g._ans
    const t0 = performance.now()
    const spar = []
    let min = null
    while (performance.now() - t0 < 2400) {
      spar.push(a?._gap ?? 0)
      if (!min && a?._aktivMin) {
        for (const [namn, s2] of Object.entries(a._miner)) if (s2 === a._aktivMin) min = namn
      }
      await new Promise((r) => requestAnimationFrame(r))
    }
    // ⚠️ TVÅ STÄNGNINGAR SOM INTE ÄR TUGGOR, båda avlästa i den råa gapkurvan (`--trace`):
    //   9876432111111 | 13677751577774267876 2 0000…
    //   └ munnen stängs efter släppet   └ tuggan: tre stigningar med var sin sammanbitning
    // Den första är draget som slutar (gapet följer fingret och räknas ner när det släpps,
    // ~200 ms innan `onCorrect` ens fyrar), inte ett tugg. Räknaren hoppar därför över
    // allt fram till FÖRSTA gången munnen är stängd, och räknar sedan sammanbitningar —
    // en fallande flank efter en stigning. Sammanbitningen är dessutom exakt vad `onTugg`
    // fyrar på, alltså samma händelse som knasterljudet ligger på.
    let n = 0
    let uppe = false
    let igang = false
    for (const v of spar) {
      if (!igang) { if (v < 0.2) igang = true; continue }
      if (uppe && v < 0.2) { n++; uppe = false }
      if (!uppe && v > 0.35) uppe = true
    }
    return { tuggor: n, topp: Math.round(Math.max(...spar, 0) * 100) / 100, min,
      spar: spar.filter((_, i) => i % 2 === 0).map((v) => Math.round(v * 10)) }
  })
  const vantat = await page.evaluate(async (key) => {
    const m = await import('/src/games/mata-munnen/index.js')
    const p = m.tuggProfil(key)
    return { n: p.n, klass: Object.keys(m.TUGG).find((k) => m.TUGG[k] === p) }
  }, forsta.key)
  console.log(`\n  TUGG ${forsta.key} (${vantat.klass}): ${tugg.tuggor} sammanbitningar, väntat ${vantat.n} · djupaste gap ${tugg.topp}   ` +
    `${tugg.tuggor === vantat.n ? '✓' : '✗ käken följer inte tuggprofilen'}`)
  if (args.includes('--trace')) console.log(`       gapkurva (tiondelar, varannan bildruta): ${tugg.spar.join('')}`)
  await page.waitForTimeout(1500)
  let e = await las(page)
  const steg = Math.round((1 / s.antal) * 1000) / 1000
  console.log(`\n  MAT  ${forsta.key}: äten ${fore.atna}→${e.atna} · mätare ${fore.fyll}→${e.fyll} (väntat steg ${steg}) · kvar ${fore.kvar}→${e.mat.length}`)
  console.log(`       min under tugget: ${tugg.min ?? '(ingen)'}   ${e.atna === fore.atna + 1 && Math.abs(e.fyll - steg) < 0.02 && tugg.min ? '✓' : '✗'}`)
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

  // ---- 3b. SLINGORNA: låter fläkten så länge den snurrar? ------------------
  // Kontrollarmen FÖRST (CLAUDE.md: en mätning som inte kan skilja två kända lägen åt
  // säger ingenting om det okända): innan någon rört fläkten ska tjänsten bära noll
  // källor. Sedan på, sedan av. Att läsa spelets `_slingor` ensamt hade inte räckt —
  // spelet kan tro att något låter utan att tjänsten startade det.
  const flaktYta = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const st = (g._stationer || []).find((x) => x.id === 'flakt')
    return st ? { x: Math.round(st.yta.x + st.yta.w / 2), y: Math.round(st.yta.y + st.yta.h / 2) } : null
  })
  if (flaktYta) {
    const noll = await las(page)
    await page.mouse.click(flaktYta.x, flaktYta.y)
    await page.waitForTimeout(500)
    const pa = await las(page)
    await page.mouse.click(flaktYta.x, flaktYta.y)
    await page.waitForTimeout(600)
    const av = await las(page)
    console.log(`\n  LJUD fläkten: källor ${noll.kallor} (orörd) → ${pa.kallor} (på: ${pa.slingor.join(',') || '—'}) → ${av.kallor} (av)   ` +
      `${noll.kallor === 0 && pa.kallor === 1 && av.kallor === 0 ? '✓' : '✗ slingan följer inte stationen'}`)
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

  // ---- 5. EXIT MITT I ETT TUGG, MED KRANEN PÅ -----------------------------
  // Ett kontinuerligt ljud överlever inte en tween-städning — det överlever ALLT tills
  // någon stoppar källan. Den som lämnar mitt i ett rinnande vatten stänger inte av
  // kranen först, så den här raden är hela skälet till att `stopAllLoops()` finns.
  s = await las(page)
  if (flaktYta) {
    await page.mouse.click(flaktYta.x, flaktYta.y)
    await page.waitForTimeout(400)
  }
  const ljudFore = (await las(page)).kallor
  if (s.mat.length) {
    await drag(s.mat[0], s.mun)
    await page.waitForTimeout(420) // mitt i tuggan, före minen
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(1400)
  }
  const ljudEfter = await page.evaluate(() => window.__barnspel?.audio?._loops?.size ?? -1)
  console.log(`\n  EXIT  ljudkällor med fläkten PÅ: ${ljudFore} → efter att ha lämnat spelet: ${ljudEfter}   ` +
    `${ljudFore > 0 && ljudEfter === 0 ? '✓' : '✗ ett ljud lever kvar utanför spelet'}`)

  console.log(`\n  ${errors.length === 0 ? '✓ 0 konsolfel (inkl. exit mitt i tugget)' : '✗ ' + errors.length + ' konsolfel: ' + errors.slice(0, 3).join(' | ')}`)
  console.log(`  bilder: ${shot} (+ -tugg, -bus)\n`)
  process.exitCode = errors.length ? 1 : 0
} finally {
  await browser.close()
}
