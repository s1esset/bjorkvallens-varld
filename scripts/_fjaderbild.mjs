// FJÄDERBRÄDA I BILD — syns dyket, och sitter fjädrarna kvar i plankan?
//
//   node scripts/_fjaderbild.mjs            (kräver dev-servern på :5173)
//
// Talen i `_fjaderprobe.mjs` säger att bräddan pressas 6,9–19,4 px och kastar kulan
// 37–272 px. De säger ingenting om att plankan RITAS böjd, att zigzag-fjädrarna följer
// undersidan i böjen eller att foten står still. Sonden ställer därför bräddan mitt i
// fältet, släpper kulan rakt ner i den och fångar tre bildrutor: vila · djupast · efter
// kastet. Tittar man inte på dem har man inte sett den (samma skäl som `npm run test`
// kör bildkoll: ett grönt test vet inget om vad som syns).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const ID = 'kulbana'
const UT = '.test-shots'
// RAKT UNDER UTSLÄPPET (300, 168), inte mitt i fältet: kulan släpps utan sidofart, så
// den faller lodrätt.
//
// ⚠️ TVÅ SONDBUGGAR GAV SAMMA "BRÄDDAN GÖR INGET"-BILD, ingen av dem i spelet:
// (1) första versionen flyttade kulan genom att skriva `body.position` direkt — det
// flyttar matters position men INTE kroppens hörn och bounds, så kollisionsformen låg
// kvar; (2) den andra skickade `{ x, y }` till en callback som plockade ut `{ bx, by }`,
// alltså `undefined` → `part.x = NaN` → `Body.setPosition(NaN)` → kroppen försvinner
// HELT ur matter, och Pixi-vyn med den, utan ett enda konsolfel (precis den fälla
// `physics.js` beskriver vid `_make`). Båda gångerna föll kulan rakt genom bräddan och
// bilden var tom där den skulle stått.
const BRADA = { bx: 300, by: 430 }

mkdirSync(UT, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('pageerror', (e) => fel.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(() => !!window.__barnspel.game, null, { timeout: 15000 })
  await page.waitForTimeout(900)

  // Bana 2 är den första med en fjäderbräda. Ställ den mitt i fältet, ta bort ramperna
  // ur vägen och lägg kulan rakt över — vi vill mäta bräddan, inte bygget.
  const info = await page.evaluate(({ bx, by }) => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    g._loadLevel(ctx, 2)
    const brada = g._parts.find((p) => p._kind === 'bounce')
    for (const p of g._parts) if (p !== brada) p.y = 700 // ramperna ur vägen
    for (const p of g._parts) g._syncPartBodies(p)
    brada.x = bx
    brada.y = by
    g._syncPartBodies(brada)
    return { delar: g._parts.length, maxKomp: brada._fjader.maxKomp, fot: brada._fjader.hojd }
  }, BRADA)
  console.log(`bana 2 · ${info.delar} delar · bräddans maxKomp ${info.maxKomp} px`)

  // VÄNTA UT INTRO-STUDSEN. Delarna monteras med `bounceIn` (scale 0 → 1), och sondens
  // första vilobild togs mitt i den: bräddan låg på scale 0,00 och bilden visade tom
  // himmel där den stod. En "syns inget"-bild kan alltså vara sondens otålighet.
  await page.waitForFunction(
    () => {
      const b = window.__barnspel.game?._parts?.find((p) => p._kind === 'bounce')
      return !!b && b.scale.y > 0.98
    },
    null,
    { timeout: 5000 },
  )
  await page.screenshot({ path: `${UT}/fjader-1-vila.png` })

  // Släpp kulan och fånga den djupaste bildrutan.
  await page.evaluate(() => window.__barnspel.game._release(window.__barnspel.ctx))

  let djupast = 0
  let bildTagen = false
  const spar = []
  for (let i = 0; i < 90; i++) {
    const { komp, kulaY } = await page.evaluate(() => {
      const g = window.__barnspel.game
      const b = g?._parts?.find((p) => p._kind === 'bounce')
      return { komp: b?._fjader?.komp ?? 0, kulaY: g?._ballBody?.position?.y ?? -1 }
    })
    spar.push(`${kulaY.toFixed(0)}/${komp.toFixed(1)}`)
    if (komp > djupast) djupast = komp
    if (komp > 12 && !bildTagen) {
      await page.screenshot({ path: `${UT}/fjader-2-djupast.png` })
      bildTagen = true
    }
    if (bildTagen && komp < 1) break
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(180)
  await page.screenshot({ path: `${UT}/fjader-3-efter.png` })

  // VRIDEN bräda: foten, fjädrarna och plankan sitter i delens container, så vridningen
  // ska bära hela riggen — och utkastet går längs plankans normal (uppmätt ±323 px i
  // sidled vid ±30° i `_fjaderprobe`). En bild som visar att inget lager står kvar.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    const b = g._parts.find((p) => p._kind === 'bounce')
    b._angleStep = 6 // +30°
    b.rotation = (30 * Math.PI) / 180
    if (b._knob && !b._knob.destroyed) b._knob.rotation = -b.rotation
    g._syncPartBodies(b)
    b._fjader.ladda(7) // halv last → böjd planka i bild
    b._rita()
  })
  await page.waitForTimeout(60)
  await page.screenshot({ path: `${UT}/fjader-4-vriden.png` })

  console.log(`djupaste inpressning som hanns fångas: ${djupast.toFixed(1)} px${bildTagen ? '' : ' (INGEN djup-bild — höj fallet)'}`)
  console.log(`kulans y / inpressning: ${spar.slice(20, 44).join(' ')}`)
  console.log(fel.length ? `✗ konsolfel: ${fel.slice(0, 3).join(' | ')}` : '✓ inga konsolfel')
  console.log(`bilder: ${UT}/fjader-1-vila.png · fjader-2-djupast.png · fjader-3-efter.png`)
  process.exit(fel.length || !bildTagen ? 1 : 0)
} finally {
  await browser.close()
}
