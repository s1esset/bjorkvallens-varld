// PRUTTBADETS TVÅLDROPPAR — kastar ett popp upp riktig vätska, och städas den?
//
//   node scripts/_tvalprobe.mjs [--cpu 6] [--bild]     (kräver dev-servern på :5173)
//
// ⚠️ `_vatskeprobe.mjs` DUGER INTE till det här spelet, och det syntes bara på talen:
// den mäter en vätska som rinner av sig själv (en kran, ett glas). Här skapas vätskan
// bara av ett POPP, så sonden rapporterade `partiklar: 0` genom hela körningen — och
// ändå 232 913 "vätskepixlar", eftersom badvattnets blå ligger nära `FLUIDS.tval`.
// Ett grönt tal om ingenting alls.
//
// Den här sonden trycker på Zackes mage, väntar ut bubblans resa och mäter:
//   1. Föds det partiklar av ett popp?
//   2. Håller partikeltaket när många bubblor poppar samtidigt?
//   3. DRÄNERAS de bort igen? (annars ligger de osynliga på botten och kostar för alltid)
//   4. Målar vätskan pixlar OVANFÖR ytlinjen? ⚠️ Bara där — badvattnet ligger under
//      och har nästan samma färg, så en mätning över hela duken bevisar ingenting.
//   5. Är dropparna synliga mot SKUMMET? (vitt mot vitt var det första försökets bugg)
//   6. FPS under CPU-strypning.
//   7. Överlever exit mitt i ett stänk?
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CPU = Number(opt('--cpu', 6))
const SURFACE_Y = 330 // samma tal som spelet

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : String(v))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'pruttbad' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._tval, null, { timeout: 20000 })
  await page.waitForTimeout(1200) // låt splashen tona ut

  console.log(`\nPRUTTBADET — tvåldropparna vid poppet (CPU ×${CPU})\n`)

  const kor = (kropp) => page.evaluate(new Function(`return (async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    const vanta = (n = 1) => new Promise((r) => {
      let i = 0
      const steg = () => (++i >= n ? r() : requestAnimationFrame(steg))
      requestAnimationFrame(steg)
    })
    ${kropp}
  })()`))

  // 1 + 2. Poppa bubblor via spelets egen väg och följ partikelantalet.
  const spray = await kor(`
    // Spelets egen bubbelväg: föd en bubbla vid magen och lyft den till ytan.
    const popp = (r) => {
      const b = g._spawnBubble ? g._spawnBubble(ctx, 640, 420, r) : null
      return b
    }
    // Enklast och ärligast: anropa _popBubble på en bubbla spelet självt skapat.
    let topp = 0
    const serie = []
    for (let k = 0; k < 6; k++) {
      // Trycket på magen är spelets egen ingång (pointerdown/up på Zacke).
      g._zackeDown?.({ global: { x: 640, y: 430 }, data: null })
      await vanta(4)
      g._zackeUp?.()
      await vanta(3)
    }
    // Låt bubblorna stiga och poppa av sig själva.
    for (let i = 0; i < 220; i++) {
      await vanta(1)
      topp = Math.max(topp, g._tval.count)
      if (i % 20 === 0) serie.push(g._tval.count)
    }
    return { topp, serie, tak: g._tval.max, bubblorKvar: g._bubbles.length }
  `)

  ok('ett popp föder tvålpartiklar', spray.topp > 0, `högst ${spray.topp} samtidigt (tak ${spray.tak})`)
  ok('partikeltaket håller', spray.topp <= spray.tak, `${spray.topp} av ${spray.tak}`)

  // 3. Dräneras de bort? Vänta ut fallet och läs av.
  const efter = await kor(`
    for (let i = 0; i < 200; i++) await vanta(1)
    return { kvar: g._tval.count, botten: g._tval.countIn(640, ${SURFACE_Y} + 120, 900, 240) }
  `)
  ok('dropparna dräneras bort igen', efter.kvar === 0, `${efter.kvar} kvar, ${efter.botten} på botten`)

  // 4 + 5. Partiklar OCH pixlar i SAMMA ögonblick.
  //
  // ⚠️ FÖRSTA VERSIONEN VAR FALSKT RÖD av precis det skälet: stänket mättes i ett
  // `evaluate` och pixlarna i nästa, och dropparna hade fallit och dränerats i
  // mellantiden — 11 partiklar ovanför ytan men 0 px målade. Allt måste ligga i EN
  // avläsning. Färgen läses dessutom ur vätskans EGEN shader-uniform (samma metod som
  // `_vatskeprobe`), inte ur ett handskrivet "är den blå?" — badvattnet är också blått.
  const px = await kor(`
    g._tval.clear()
    g._addFoam(ctx, 40) // lite skum, så mätningen sker mot samma botten som barnet ser
    g._tvalStank({ x: 640, r: 30 })
    for (let i = 0; i < 8; i++) await vanta(1)
    const antal = g._tval.count
    const over = g._tval.countIn(640, ${SURFACE_Y} - 70, 900, 140)

    const u = g._tvalView?._thr?.resources?.fluidUniforms?.uniforms?.uColor
    const mal = u ? [Math.round(u[0] * 255), Math.round(u[1] * 255), Math.round(u[2] * 255)] : null

    // ⚠️ ETT FÄRGAVSTÅND RÄCKER INTE, och den första versionen var FALSKT GRÖN på det:
    // den rapporterade 30 533 px i vätskans ton, men badets SKUM (0xffe6f0) ligger på
    // avstånd² 3460 från tvålens [255,182,206] — under tröskeln 3600. Talet var nästan
    // bara skum. Mätningen är därför DIFFERENTIELL: samma band, en gång med
    // vätskelagret synligt och en gång utan. Skillnaden kan bara vara vätskan.
    const c = window.__barnspel.app.canvas
    const sx = c.width / 1280
    const sy = c.height / 720
    const x0 = Math.round(210 * sx)
    const x1 = Math.round(1070 * sx)
    const y0 = Math.round((${SURFACE_Y} - 150) * sy)
    const y1 = Math.round((${SURFACE_Y} - 6) * sy)
    const mat = () => {
      const s = document.createElement('canvas')
      s.width = c.width
      s.height = c.height
      const cx2 = s.getContext('2d')
      cx2.drawImage(c, 0, 0)
      const d = cx2.getImageData(x0, y0, x1 - x0, y1 - y0).data
      let n = 0
      for (let i = 0; i < d.length; i += 4) {
        const dr = d[i] - mal[0]
        const dg = d[i + 1] - mal[1]
        const db = d[i + 2] - mal[2]
        if (dr * dr + dg * dg + db * db < 3600) n++
      }
      return n
    }
    const med = mal ? mat() : 0
    g._tvalView.layer.visible = false
    await vanta(1)
    const utan = mal ? mat() : 0
    g._tvalView.layer.visible = true
    return { antal, over, med, utan, netto: med - utan, mal, rutPix: (x1 - x0) * (y1 - y0) }
  `)

  ok('stänket når UPP över ytan', px.over > 0, `${px.over} av ${px.antal} partiklar ovanför ytlinjen`)
  ok('dropparna målar pixlar ovanför ytan', px.netto > 300,
    `${px.netto} px NETTO (${px.med} med vätskelagret, ${px.utan} utan) i tonen ${JSON.stringify(px.mal)}`)
  // Vitt mot vitt var första försökets ÄKTA bugg: jag färgade dropparna med rundans
  // skumfärg, och `BATHS[0].foam` är 0xffffff.
  ok('dropparna är INTE vita (osynliga mot skummet)', px.mal && !(px.mal[0] > 244 && px.mal[1] > 244 && px.mal[2] > 244),
    `kroppsfärg ${JSON.stringify(px.mal)}`)

  // Färgen mot BADETS vatten — det ANDRA färgfelet var en ordningsbugg: `_applyLevel`
  // körs i init före `_buildTval`, så färgsättningen no-oppade och dropparna behöll
  // `FLUIDS.tval`-blå ända till andra rundan (ljusblå tvål i ett rosa bad).
  // ⚠️ MÅSTE mätas på en NYLADDAD sida, annars träffar kontrollen ingenting: efter en
  // klarad runda har `_applyLevel` redan körts en andra gång och färgen är rätt. Och
  // den måste ske i ett bad med index > 0 — på nivå 0 ligger badets blå så nära
  // `FLUIDS.tval`-blå att buggen inte syns i talen. Sparfilen bär nivån från stegen
  // ovan, så omladdningen ger just det.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'pruttbad' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._tval, null, { timeout: 20000 })
  const farg = await kor(`
    const bad = g._bath()
    const w = bad.water
    const bl = (c, t) => {
      const r = ((c >> 16) & 255) + (255 - ((c >> 16) & 255)) * t
      const gg = ((c >> 8) & 255) + (255 - ((c >> 8) & 255)) * t
      const b = (c & 255) + (255 - (c & 255)) * t
      return [Math.round(r), Math.round(gg), Math.round(b)]
    }
    const u = g._tvalView?._thr?.resources?.fluidUniforms?.uniforms?.uColor
    const har = u ? [Math.round(u[0] * 255), Math.round(u[1] * 255), Math.round(u[2] * 255)] : null
    return { badId: bad.id, vantad: bl(w, 0.45), har }
  `)
  const nara = farg.har && farg.vantad.every((v, i) => Math.abs(v - farg.har[i]) <= 3)
  ok('dropparna bär BADETS färg redan i första rundan', nara,
    `${farg.badId}: väntat ${JSON.stringify(farg.vantad)}, har ${JSON.stringify(farg.har)}`)

  // 6. FPS under strypning, medan stänk pågår.
  const fps = await kor(`
    let rutor = 0
    const t0 = performance.now()
    for (let k = 0; k < 14; k++) {
      g._tvalStank({ x: 400 + k * 40, r: 26 })
      for (let i = 0; i < 12; i++) { await vanta(1); rutor++ }
    }
    return { fps: rutor / ((performance.now() - t0) / 1000), topp: g._tval.count }
  `)
  ok('FPS håller under strypning', fps.fps > 45, `${n1(fps.fps)} fps med upp till ${fps.topp} partiklar`)

  // 7. Exit mitt i ett stänk.
  const exit = await kor(`
    g._tvalStank({ x: 640, r: 30 })
    await vanta(2)
    const varld = g._tval
    app.nav.go('library')
    await new Promise((r) => setTimeout(r, 900))
    return { doda: !varld._alive }
  `)
  ok('vätskan dör med spelet', exit.doda)
  ok('inga konsolfel', errors.length === 0, errors.slice(0, 3).join(' | '))

  if (args.includes('--bild')) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'pruttbad' }))
    await page.waitForFunction(() => !!window.__barnspel.game?._tval, null, { timeout: 20000 })
    await page.waitForTimeout(1200)
    await kor(`
      g._addFoam(ctx, 40) // lite skum, så dropparna syns MOT skummet
      for (const x of [430, 560, 700, 840]) g._tvalStank({ x, r: 30 })
      for (let i = 0; i < 9; i++) await vanta(1)
    `)
    await page.screenshot({ path: '.test-shots/_tval-pruttbad.png' })
    console.log('\n  bild: .test-shots/_tval-pruttbad.png')
  }

  console.log(fel === 0 ? '\n  ✓ tvåldropparna lever, syns och städas\n' : `\n  ✗ ${fel} fel\n`)
  process.exit(fel === 0 ? 0 : 1)
} finally {
  await browser.close()
}
