// `saftbaren`: bubblar saften i ett glas som STÅR STILLA?
//
// Punkten kom ur `_stillaprobe`: `saftbaren` har repots största scen (**679 noder**) och bara
// 13 av dem rörde sig — största utslaget **1,1 px** i två svep av tre. Nästan allt stod still.
// §4 [Quick]: "Bubblor som stiger i glaset när det står stilla."
//
// "Det finns bubblor" räcker inte som krav. Sonden mäter de fem egenskaper som gör dem till
// kolsyra i ett glas i stället för prickar på skärmen:
//   1. De STIGER (rör sig uppåt, inte bara finns).
//   2. De spricker VID YTAN — aldrig ovanför den, då svävar de i luften.
//   3. Ett TOMT glas bubblar inte.
//   4. Ett glas som BÄRS bubblar inte — kravet i §4 är uttryckligen "när det står stilla".
//   5. Det finns ett tak per glas.
//
//   node scripts/_bubbelprobe.mjs
import { chromium } from 'playwright'

const ID = 'saftbaren'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })
  await page.waitForTimeout(3000) // låt vätskan lägga sig i de förfyllda glasen

  // --- 1–3, 5. Följ bubblorna i tre fyllda glas ------------------------------
  const lopp = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const glas = g._glasses || []
    if (!glas.length || glas[0].bubblor === undefined) return { fel: 'spelet har inga bubblor' }
    const fyllda = glas.filter((x) => (x._n || 0) >= 12)
    const tomma = glas.filter((x) => (x._n || 0) < 12)
    const spar = { fodda: 0, steg: [], overYtan: 0, toppPerGlas: 0, tomtBubblade: 0 }
    const senast = new Map()
    const t0 = performance.now()
    while (performance.now() - t0 < 6000) {
      for (const x of glas) {
        const yta = x._yta ?? -22
        spar.toppPerGlas = Math.max(spar.toppPerGlas, x.bubblor.length)
        if ((x._n || 0) < 12 && x.bubblor.length) spar.tomtBubblade++
        for (const b of x.bubblor) {
          const f = senast.get(b)
          if (f === undefined) { spar.fodda++ } else { spar.steg.push(f - b.ly) }
          senast.set(b, b.ly)
          // Bubblan får aldrig ritas ovanför vätskeytan.
          if (b.ly < yta - 1) spar.overYtan++
        }
      }
      await new Promise((r) => requestAnimationFrame(r))
    }
    const stig = spar.steg.filter((v) => v > 0.01)
    return {
      fel: null,
      fyllda: fyllda.length,
      tomma: tomma.length,
      fodda: spar.fodda,
      stigandeSteg: stig.length,
      totalaSteg: spar.steg.length,
      medelSteg: stig.length ? +(stig.reduce((a, b) => a + b, 0) / stig.length).toFixed(2) : 0,
      overYtan: spar.overYtan,
      toppPerGlas: spar.toppPerGlas,
      tomtBubblade: spar.tomtBubblade,
    }
  })

  if (lopp.fel) {
    ok('1 bubblorna fods och stiger', false, `${lopp.fel} — RAKNAS SOM 0`)
    ok('2 spricker vid ytan', false, 'samma orsak')
    ok('3 tomt glas bubblar inte', false, 'samma orsak')
    ok('5 taket haller', false, 'samma orsak')
  } else {
    ok('1 bubblorna fods och stiger', lopp.fodda > 5 && lopp.stigandeSteg > lopp.totalaSteg * 0.98,
      `${lopp.fodda} bubblor pa 6 s, ${lopp.stigandeSteg}/${lopp.totalaSteg} steg uppat, medel ${lopp.medelSteg} px/bildruta`)
    ok('2 spricker vid ytan, aldrig ovanfor', lopp.overYtan === 0,
      `${lopp.overYtan} bildrutor med en bubbla ovanfor vatskeytan`)
    ok('3 tomt glas bubblar inte', lopp.tomtBubblade === 0,
      `${lopp.tomma} tomma glas, ${lopp.tomtBubblade} bildrutor med bubblor i dem`)
    ok('5 taket haller', lopp.toppPerGlas <= 7, `som mest ${lopp.toppPerGlas} bubblor i ett glas (tak 7)`)
  }

  // --- 4. Ett glas som BÄRS bubblar inte -------------------------------------
  const buret = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const glas = (g._glasses || []).find((x) => (x._n || 0) >= 12)
    if (!glas) return { fel: 'inget fyllt glas' }
    glas.held = true
    glas.y = glas.homeY - 200 // lyft det
    // Ge spelet EN bildruta att reagera på lyftet innan räkningen börjar. Sonden sätter
    // `held` mitt i en bildruta, alltså innan spelets tick har fått köra — att kräva 0
    // redan då vore att kräva en reaktion innan tiden gått framåt, och den enda "buggen"
    // det mäter är sondens egen ordning mot tickern. (Spelet tömmer dessutom bubblorna
    // direkt i `_onGlassDown`, som är vägen ett riktigt finger tar.)
    await new Promise((r) => requestAnimationFrame(r))
    let sedda = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 1500) {
      sedda += glas.bubblor.length
      await new Promise((r) => requestAnimationFrame(r))
    }
    // Ställ TILLBAKA glaset via spelets egen synk — annars står det kvar i luften och
    // skärmdumpen längre ner visar en bar med ett svävande glas som sonden själv orsakat.
    glas.held = false
    glas.y = glas.homeY
    glas.x = glas.homeX
    glas.angle = 0
    g._syncGlass(glas)
    return { fel: null, sedda }
  })

  if (buret.fel) ok('4 ett buret glas bubblar inte', false, `${buret.fel} — RAKNAS SOM 0`)
  else ok('4 ett buret glas bubblar inte', buret.sedda === 0, `${buret.sedda} bubbel-bildrutor medan glaset bars`)

  await page.waitForTimeout(1500)
  await page.screenshot({ path: '.test-shots/_bubbel-saftbaren.png' })

  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('6 inga konsolfel', errors.length === 0, `${errors.length} fel${errors[0] ? ': ' + errors[0] : ''}`)

  console.log(`\n  ${ID} — bubblor i glaset\n`)
  for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn.padEnd(34)} ${r.text}`)
  const gronaN = rader.filter((r) => r.ok).length
  console.log(`\n  ${gronaN}/${rader.length}\n`)
  process.exitCode = gronaN === rader.length ? 0 : 1
} finally {
  await browser.close()
}
