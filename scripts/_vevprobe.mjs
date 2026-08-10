// KUGGHJULENS VEV — känns maskinen tyngre ju mer barnet byggt?
//
//   node scripts/_vevprobe.mjs        (kräver dev-servern på :5173)
//
// Förut satte fingret vinkeln rakt av: en ensam vev och en maskin med fem hjul kändes
// exakt likadana. Frågorna trögheten måste svara ja på:
//
//   1. Går en tom vev fortfarande igång direkt? (annars blev spelet trögare, inte rikare)
//   2. Tar en byggd maskin MÄTBART längre tid att få upp i fart?
//   3. Rullar den vidare när barnet släpper — och rullar den TYNGRE bygget längre?
//   4. Stannar den till slut? (inget svänghjul får snurra i evighet)
//   5. Finns ett fartTAK, så inget kan skena?
//   6. Når flaggan fortfarande hela vägen? (no-fail får inte ha blivit svårare)
import { chromium } from 'playwright'

const ID = 'kugghjulen'
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
  await page.waitForFunction(() => !!window.__barnspel.game?._crank, null, { timeout: 15000 })
  await page.waitForTimeout(800)

  console.log('\nKUGGHJULEN — maskinens tröghet\n')

  // Veva med en konstant "fingerfart" i N bildrutor, mät fart och utrullning.
  // `_troghet()` läses direkt, och hjulen fejkas som greppande genom `driven`-flaggan —
  // det är exakt det fältet `_troghet()` summerar över.
  const kor = (hjul) =>
    page.evaluate(
      async (hjul) => {
        const g = window.__barnspel.game
        const vanta = () => new Promise((r) => requestAnimationFrame(r))
        // ⚠️ HJULEN FINNS INTE FÖRRÄN DE DRAGITS UT. Första versionen satte `driven` på
        // `g._gears[i]` — men listan är TOM innan barnet placerat något, så både den tomma
        // veven och "fem hjul" mätte tröghet 1,00 och sonden dömde en fungerande fysik.
        // Sonden bygger därför sina egna hjulposter; `_troghet()` läser bara `driven`,
        // `fly` och `r`, och `_update` hoppar över poster utan `view`.
        const radier = [50, 66, 84, 66, 50]
        g._gears.length = 0
        for (let i = 0; i < hjul; i++) g._gears.push({ driven: true, fly: false, r: radier[i % radier.length], view: null })
        g._crankAngle = 0
        g._crankVel = 0
        const J = g._troghet()

        // 60 bildrutor med fingret som drar jämnt. Fingrets vinkel förs fram lika mycket
        // varje ruta — precis som en jämn dragning runt pivoten.
        g._cranking = true
        g._fingerAngle = g._crankAngle
        const farter = []
        let maxGap = 0
        let jamviktGap = 0
        const jamvikter = []
        for (let i = 0; i < 60; i++) {
          g._fingerAngle += 0.18 // rad/bildruta som fingret rör sig
          g._fingerVel = g._fingerVel * 0.6 + 0.18 * 0.4 // samma jämning som `_crankMove`
          await vanta()
          farter.push(g._crankVel)
          // ⚠️ SKILJ UPPSTARTEN FRÅN JÄMVIKTEN. De första bildrutorna bygger med
          // nödvändighet ett glapp — maskinen står stilla och fingret rör sig — och ett
          // maxvärde över hela körningen rapporterar därför uppstarten, inte kopplingen.
          // Det som får barnet att tro att veven är trasig är ett glapp som LIGGER KVAR,
          // och det är jämviktsvärdet nedan.
          const g0 = Math.abs(g._fingerAngle - g._crankAngle)
          maxGap = Math.max(maxGap, g0)
          if (i >= 30) {
            jamviktGap = Math.max(jamviktGap, g0)
            jamvikter.push(g0)
          }
        }
        const toppfart = Math.max(...farter.map(Math.abs))
        // Tid till 90 % av den fart maskinen till slut når.
        const t90 = farter.findIndex((v) => Math.abs(v) >= toppfart * 0.9)

        // Släpp och mät utrullningen.
        g._cranking = false
        const a0 = g._crankAngle
        let rutor = 0
        while (Math.abs(g._crankVel) > 0 && rutor < 400) {
          await vanta()
          rutor++
        }
        const sorterat = jamvikter.slice().sort((x, y) => x - y)
        const median = sorterat.length ? sorterat[Math.floor(sorterat.length / 2)] : 0
        return { J, toppfart, t90: t90 < 0 ? -1 : t90, maxGap, jamviktGap, medianGap: median, utrullning: Math.abs(g._crankAngle - a0), rutorTillStopp: rutor }
      },
      hjul
    )

  const tom = await kor(0)
  const bygd = await kor(5)

  console.log(`   tom vev  : tröghet ${tom.J.toFixed(2)} · toppfart ${tom.toppfart.toFixed(3)} rad/ruta · 90 % efter ${tom.t90} rutor`)
  console.log(`   5 hjul   : tröghet ${bygd.J.toFixed(2)} · toppfart ${bygd.toppfart.toFixed(3)} rad/ruta · 90 % efter ${bygd.t90} rutor\n`)

  // ⚠️ DET HÄR MÅTTET SAKNADES OCH VAR DET SOM FÄLLDE FÖRSTA VERSIONEN. Sonden mätte bara
  // fart, aldrig hur långt handtaget hamnade EFTER fingret — och en granskning som mätte
  // just det fann 40–100° glapp på ett femhjulsbygge i normalt barntempo, med ett glapp
  // som aldrig läkte. Kuggarna sitter 36–40° isär, så det var en hel kuggbredd fel: det
  // ser trasigt ut, inte tungt. En fart som ser rimlig ut i tal kan alltså vara en
  // sönderbruten koppling i handen.
  const grader = (r) => ((r * 180) / Math.PI).toFixed(0)
  console.log(`   glapp    : tom median ${grader(tom.medianGap)}° / varsta ${grader(tom.jamviktGap)}°  ·  5 hjul median ${grader(bygd.medianGap)}° / varsta ${grader(bygd.jamviktGap)}°`)
  ok('handtaget ligger inte kvar efter fingret (tom vev)', tom.medianGap <= 0.22, `median ${grader(tom.medianGap)}° i jämvikt (värsta ruta ${grader(tom.jamviktGap)}°, uppstart ${grader(tom.maxGap)}°)`)
  ok('handtaget ligger inte kvar efter fingret (5 hjul)', bygd.medianGap <= 0.32, `median ${grader(bygd.medianGap)}° i jämvikt (värsta ruta ${grader(bygd.jamviktGap)}°)`)
  ok('en tom vev går igång direkt', tom.t90 >= 0 && tom.t90 <= 8, `${tom.t90} bildrutor till 90 % av farten`)
  ok('en byggd maskin är mätbart trögare att få igång', bygd.t90 > tom.t90 * 1.6, `${bygd.t90} mot ${tom.t90} bildrutor`)
  ok('trögheten växer med bygget', bygd.J > tom.J * 3, `${tom.J.toFixed(2)} → ${bygd.J.toFixed(2)}`)
  ok('maskinen rullar vidare när barnet släpper', bygd.utrullning > 0.3, `${bygd.utrullning.toFixed(2)} rad efter släpp`)
  ok('och det tunga bygget rullar LÄNGRE än den tomma veven', bygd.utrullning > tom.utrullning * 1.3, `${bygd.utrullning.toFixed(2)} mot ${tom.utrullning.toFixed(2)} rad`)
  ok('svänghjulet stannar till slut', bygd.rutorTillStopp < 400, `${bygd.rutorTillStopp} bildrutor`)

  // Farttak: dra orimligt hårt.
  const tak = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const vanta = () => new Promise((r) => requestAnimationFrame(r))
    g._cranking = true
    for (let i = 0; i < 90; i++) {
      g._fingerAngle += 40 // orimligt ryck: 40 rad på en bildruta
      await vanta()
    }
    const v = Math.abs(g._crankVel)
    g._cranking = false
    g._crankVel = 0
    return v
  })
  ok('fartens tak håller även vid ett orimligt ryck', tak <= 0.51, `${tak.toFixed(3)} rad/ruta (tak 0,50)`)

  // 7. HÖRS tyngden? Trögheten kändes i handen men vevljudet var identiskt oavsett bygge.
  // Mätt genom att avlyssna de RIKTIGA `audio.tone`-anropen `_crankMove` gör — inte genom
  // att läsa konstanterna, för det är anropet barnet hör.
  const ljud = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const audio = window.__barnspel.audio
    const rader = []
    const original = audio.tone.bind(audio)
    audio.tone = (o) => {
      rader.push({ freq: o.freq, vol: o.vol })
      return original(o)
    }
    const radier = [50, 66, 84, 66, 50]
    const mat = (hjul) => {
      g._gears.length = 0
      for (let i = 0; i < hjul; i++) g._gears.push({ driven: true, fly: false, r: radier[i % radier.length], view: null })
      rader.length = 0
      // Kalla `_crankMove` som ett finger gör, men förbi 140 ms-spärren.
      for (let i = 0; i < 4; i++) {
        g._cranking = true
        g._lastCrankSound = -1e9
        g._crankMove(window.__barnspel.ctx, { global: { x: 300 + i * 8, y: 300 } })
      }
      g._cranking = false
      const f = rader.map((r) => r.freq).filter((v) => v != null)
      const v = rader.map((r) => r.vol).filter((x) => x != null)
      return { J: g._troghet(), freq: f.length ? f[f.length - 1] : null, vol: v.length ? v[v.length - 1] : null, n: rader.length }
    }
    const tomL = mat(0)
    const bygdL = mat(5)
    audio.tone = original
    g._gears.length = 0
    return { tom: tomL, bygd: bygdL }
  })
  const L = ljud
  ok('vevljudet spelas alls', L.tom.n > 0 && L.tom.freq != null,
    `${L.tom.n} ton-anrop, ${L.tom.freq} Hz vid tröghet ${L.tom.J.toFixed(2)}`)
  ok('en tung maskin LÅTER tyngre (djupare klack)', L.bygd.freq != null && L.tom.freq / L.bygd.freq >= 1.4,
    `${L.tom.freq} Hz tom → ${L.bygd.freq} Hz vid tröghet ${L.bygd.J.toFixed(2)} (${(L.tom.freq / L.bygd.freq).toFixed(2)}×)`)
  ok('...och fylligare', L.bygd.vol > L.tom.vol * 1.3, `vol ${L.tom.vol?.toFixed(3)} → ${L.bygd.vol?.toFixed(3)}`)
  // Surfplattans högtalare tappar botten: ett "ärligare" djupt klack blir TYSTARE, inte tyngre.
  ok('klacket stannar i tablet-högtalarens band', L.bygd.freq >= 150 && L.tom.freq <= 250,
    `${L.bygd.freq}–${L.tom.freq} Hz (golv 150, tak 250)`)

  ok('inga konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))

  console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
  process.exit(fel === 0 ? 0 : 1)
} finally {
  await browser.close()
}
