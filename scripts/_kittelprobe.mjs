// KITTELN — hällningen och elden, de två systemen som möts (trollblandning, spår 3 P3).
//
//   node scripts/_kittelprobe.mjs        (kräver dev-servern på :5173)
//
// Frågorna som måste besvaras med tal, inte med tycke:
//
//   1. NÅR STRÅLEN NER? En hällning ska absorberas i ytan — inte rinna förbi kitteln,
//      inte fastna i luften, inte lämna partiklar kvar när den är slut.
//   2. LÄCKER DEN? Ingen partikel får synas nedanför brygdytan (då rinner den genom
//      järnet). Mäts som största y någon partikel haft under hela hällningen.
//   3. ÄR UTSPÄDNINGEN MASS-VIKTAD? En skvätt ska tona brygden en bit, två olika
//      ingredienser ska ge medelvärdet — inte "sista färgen vinner".
//   4. KYLER EN KALL INGREDIENS? Is i en kokande kittel ska sänka temperaturen
//      MÄTBART, och elden ska ta tillbaka den inom rimlig tid.
//   5. FÖLJER BUBBLORNA VÄRMEN? Kall kittel = märkbart glesare puttrande.
//   6. SYNS ELDEN? Lågorna får inte ligga bakom grytkroppen (första försöket gjorde
//      det — hela elden var osynlig utom en flisa mellan benen).
//   7. ÖVERLEVER EXIT MITT I EN HÄLLNING?
import { chromium } from 'playwright'

const ID = 'trollblandning'
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0')
const kanal = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  const start = async () => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction(() => !!window.__barnspel.game?._fluid, null, { timeout: 15000 })
    await page.waitForTimeout(700)
  }

  // Ett RIKTIGT drag genom DragController — inte ett internt anrop. Poängen är att
  // hällningen ska utlösas av samma väg som barnets finger tar.
  const dra = async (elemId) => {
    const p = await page.evaluate((id) => {
      const g = window.__barnspel.game
      const rec = (g._dropRecs || []).find((r) => r?.data?.elem === id)
      if (!rec) return null
      const gp = rec.view.getGlobalPosition()
      const c = window.__barnspel.app.canvas.getBoundingClientRect()
      const s = c.width / 1280
      return { x: c.left + gp.x * s, y: c.top + gp.y * s, cx: c.left + 560 * s, cy: c.top + 330 * s }
    }, elemId)
    if (!p) throw new Error('hittade ingen droppe för ' + elemId)
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(p.x + ((p.cx - p.x) * i) / 6, p.y + ((p.cy - p.y) * i) / 6)
    await page.mouse.up()
  }

  await start()
  console.log('\nKITTELN — hällningen och elden\n')

  // --- 1+2. Strålen når ner, och den läcker inte -------------------------------
  const vilaTemp = await page.evaluate(() => window.__barnspel.game._varme.temp('brygd'))
  ok('elden håller kitteln vid kok i vila', vilaTemp > 0.85, `temp ${vilaTemp.toFixed(3)}`)

  await dra('vatten')
  const strale = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const vanta = () => new Promise((r) => requestAnimationFrame(r))
    let maxAntal = 0
    let maxY = 0
    // Var LANDAR strålen? Partiklar som är på väg in i slukbandet (y > 300) röjer
    // träffpunkten — landar den på ingrediensringen vid CX±52 ser det ut som att
    // man häller på en droppe i luften i stället för i grytan.
    let traffSum = 0
    let traffN = 0
    for (let i = 0; i < 110; i++) {
      await vanta()
      const w = g._fluid
      maxAntal = Math.max(maxAntal, w.count)
      for (let k = 0; k < w.count; k++) {
        if (w.y[k] > maxY) maxY = w.y[k]
        if (w.y[k] > 300) {
          traffSum += w.x[k]
          traffN++
        }
      }
    }
    return { maxAntal, maxY, traff: traffN ? traffSum / traffN : 0, kvar: g._fluid.count, absorberat: g._mixTot, brygd: g._brewColor }
  })
  ok('strålen finns i luften', strale.maxAntal >= 8, `max ${strale.maxAntal} partiklar samtidigt`)
  ok('hällningen absorberas i ytan', strale.absorberat >= 25, `${strale.absorberat} partiklar slukade`)
  ok('inget rinner genom järnet', strale.maxY <= 375, `djupaste partikel y=${strale.maxY.toFixed(0)} (ytan 330)`)
  ok('strålen landar mitt i brygden', Math.abs(strale.traff - 560) < 34, `träffpunkt x=${strale.traff.toFixed(0)} (mitten 560, ringarna 508/612)`)
  ok('strålen tar slut', strale.kvar === 0, `${strale.kvar} kvar efter hällningen`)

  // --- 3. Utspädningen är mass-viktad ------------------------------------------
  const [br, bg, bb] = kanal(strale.brygd)
  const [vr, vg, vb] = kanal(0x4aa3df) // vatten
  const [nr, ng, nb] = kanal(0x2a2342) // rundans botten
  const motVatten = (br - nr) / (vr - nr || 1)
  ok(
    'brygden tonar mot det som hällts i',
    br > nr + 8 && bb > nb + 20 && bg > ng + 20,
    `${hex(0x2a2342)} → ${hex(strale.brygd)} (mot ${hex(0x4aa3df)}, ${(motVatten * 100).toFixed(0)} % av vägen)`,
  )
  void vg
  void vb

  void bg
  void bb

  // Andra ingrediensen: resultatet ska vara det MASS-VIKTADE MEDELVÄRDET av det som
  // hällts i, tonat efter hur full kitteln är — inte "sista färgen vinner".
  // ⚠️ Första versionen av det här måttet påstod att blått måste SJUNKA när eld hälls
  // i. Det var sonden som hade fel: vattnets blå (223) och eldens (107) ger medlet 165,
  // vilket är HÖGRE än det halvmättade vattnets 150. Måttet jämför nu mot den uträknade
  // blandningen i stället för mot en magkänsla om riktningen.
  // ⚠️ OCH SONDEN HADE FEL EN GÅNG TILL: en `waitForFunction` på "_pour är null och
  // vätskan är slut" returnerade OMEDELBART, för hällningen börjar först efter
  // droppens 0,2 s uppflygning. Måttet läste då vattnets egen färg, jämförde den med
  // en förutsägelse räknad ur samma vatten-blandning, och blev grönt utan att eld
  // någonsin runnit. Nu samplas varje bildruta och domen tas på den SISTA rutan före
  // reaktionen (som byter bottenfärg).
  // DragController släpper inte ingrediensen i samma ögonblick som musen — uppmätt:
  // `_inCauldron` är fortfarande tom direkt efter `mouse.up()`. Vänta in den.
  await dra('eld')
  await page.waitForFunction(() => window.__barnspel.game._inCauldron.length === 2, null, { timeout: 4000 })
  const blandat = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const vanta = () => new Promise((r) => requestAnimationFrame(r))
    let sista = null
    for (let i = 0; i < 130; i++) {
      await vanta()
      if (g._inCauldron.length < 2) break // reaktionen har slagit till
      sista = { brygd: g._brewColor, bas: g._basBrygd, mix: Array.from(g._mix.entries()), tot: g._mixTot }
    }
    return sista
  })
  if (!blandat) throw new Error('hann aldrig sampla blandningen')
  // Räkna om blandningen HÄR, ur spelets egna räknare — mätningen ska inte behöva tro
  // på spelets färgfunktion. pal-index = ordningen i ELEMENTS: 0 = eld, 1 = vatten.
  const PAL_HEX = { 0: 0xff6b6b, 1: 0x4aa3df }
  const VOLYM = 80
  const vantatMedel = [0, 1, 2].map((k) => {
    let s = 0
    for (const [p, n] of blandat.mix) s += kanal(PAL_HEX[p])[k] * n
    return s / blandat.tot
  })
  const matt = Math.min(1, blandat.tot / VOLYM)
  const vantat = vantatMedel.map((v, k) => kanal(blandat.bas)[k] + (v - kanal(blandat.bas)[k]) * matt)
  const uppmatt = kanal(blandat.brygd)
  const avvik = Math.max(...uppmatt.map((v, k) => Math.abs(v - vantat[k])))
  const franEld = Math.max(...uppmatt.map((v, k) => Math.abs(v - kanal(0xff6b6b)[k])))
  ok(
    'två ingredienser ger den MASS-VIKTADE blandningen',
    avvik <= 4,
    `${hex(strale.brygd)} + eld → ${hex(blandat.brygd)}, väntat rgb(${vantat.map((v) => v.toFixed(0)).join(',')}), avvikelse ${avvik.toFixed(1)}`,
  )
  ok('det är inte "sista färgen vinner"', franEld > 50, `${franEld.toFixed(0)} kanalsteg från ren eld ${hex(0xff6b6b)}`)

  // --- 4+5. Kylan och elden -----------------------------------------------------
  await page.evaluate(() => window.__barnspel.game._onEmpty())
  await page.waitForTimeout(1400)
  const fore = await page.evaluate(() => ({
    temp: window.__barnspel.game._varme.temp('brygd'),
    rate: window.__barnspel.game._bubblor.o.rate,
  }))
  // Nivå 0 har baserna eld/vatten/jord/luft — is finns först på nivå 2. Vatten
  // (varm 0,24) är den kallaste ingrediensen ett barn möter i första rundan, och
  // det är den kylningen som måste synas.
  await dra('vatten')
  const kylning = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const vanta = () => new Promise((r) => requestAnimationFrame(r))
    let lagsta = 1
    let lagstaRate = 99
    for (let i = 0; i < 110; i++) {
      await vanta()
      const t = g._varme.temp('brygd')
      if (t < lagsta) lagsta = t
      if (g._bubblor.o.rate < lagstaRate) lagstaRate = g._bubblor.o.rate
    }
    // Hur lång tid tar elden på sig tillbaka till 80 % av utgångsläget?
    const mal = 0.8 * 0.92
    let rutor = 0
    while (g._varme.temp('brygd') < mal && rutor < 900) {
      await vanta()
      rutor++
    }
    return { lagsta, lagstaRate, aterS: rutor / 60, nadde: g._varme.temp('brygd') >= mal }
  })
  ok('en kall ingrediens KYLER kitteln mätbart', kylning.lagsta < fore.temp - 0.35, `${fore.temp.toFixed(2)} → ${kylning.lagsta.toFixed(2)}`)
  ok('bubblorna hör kylan', kylning.lagstaRate < fore.rate * 0.45, `takt ${fore.rate.toFixed(1)} → ${kylning.lagstaRate.toFixed(1)}/s`)
  ok('elden tar tillbaka den', kylning.nadde && kylning.aterS < 12, `${kylning.aterS.toFixed(1)} s till 80 % av kok`)

  // --- 6. Syns elden alls? -------------------------------------------------------
  const eldSyns = await page.evaluate(() => {
    const g = window.__barnspel.game
    const b = g._eldContainer.getBounds()
    const kittel = g._cauldron.getBounds()
    // Grytkroppen slutar vid CY+96 = 496. Allt av elden ovanför det är dolt bakom järn.
    return { top: b.y, bottom: b.y + b.height, bredd: b.width, synligt: b.y + b.height - 496, kittelBottom: kittel.y + kittel.height }
  })
  ok(
    'elden syns nedanför grytkroppen',
    // Trösklarna är avlästa ur bilden: under ~24 px synligt band försvinner elden
    // bakom järnet, och smalare än grytans egen bredd (~200 px) läser den som en
    // ensam låga i stället för en bädd.
    eldSyns.synligt >= 24 && eldSyns.bredd >= 200,
    `${eldSyns.synligt.toFixed(0)} px synligt band, ${eldSyns.bredd.toFixed(0)} px bred`,
  )

  // --- 7. Bilden + exit mitt i en hällning ------------------------------------------
  // Skärmdumpen mitt i strålen är inte pynt: två av buggarna i den här rundan syntes
  // BARA där (elden bakom järnet, kokglöden som sköljde bort brygdfärgen).
  errors.length = 0
  await dra('jord')
  await page.waitForFunction(() => (window.__barnspel.game?._fluid?.count || 0) > 4, null, { timeout: 4000 })
  await page.waitForTimeout(220)
  await page.screenshot({ path: '.test-shots/_kittel-hallning.png' })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('exit mitt i hällningen är rent', errors.length === 0, errors.slice(0, 2).join(' | ') || '0 fel')

  console.log(`\n  ${fel === 0 ? '✓ alla mått gröna' : `✗ ${fel} mått röda`}\n`)
} finally {
  await browser.close()
}
process.exit(fel === 0 ? 0 : 1)
