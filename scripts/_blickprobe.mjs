// _blickprobe.mjs — FLIMRAR BLICKEN NÄR MÅLET ÄR EN FLUGA?
//
// Nattpassets enda i förväg utpekade MÄTFRÅGA (`docs/IDEER.md` post 2 ⓷, `docs/NATTPASS.md`
// steg 3a): `blick()`s hysteres (`BLICK_DOD 0,16` · `BLICK_HYST 0,14` · `BLICK_TID 0,13 s`)
// är inställd på en LÅNGSAMT DRAGEN MATBIT. En fluga rör sig ryckigt och snabbt. Byts
// blicklappen oftare än ~3 gånger per sekund läser det som ett ögonflimmer i stället för en
// blick — och det är ett FOTOANSIKTE, alltså direkt obehagligt.
//
// VAD SOM MÄTS: antal LAPPBYTEN per sekund, inte alfa. Sonden hakar på riggens egen
// `_blickTill()` — alltså mekanismens faktiska beslut, inte en avläsning i bild.
//
// ⚠️ TRE ARMAR I SAMMA KÖRNING, och kontrollarmen först:
//     långsam   samma bana i 1/5 farten  → KÄNT lugnt. Kan sonden inte visa att den är
//                                          lugnare än flugan mäter den ingenting.
//     fluga     spelets riktiga bana, rått läge till blick()
//     filtrerad samma bana genom `Blickfilter` (den kända reserven)
//
// ⚠️ BANAN IMPORTERAS UR SPELET (`src/games/flugan-pa-nasan/fluga.js`). En sond som hittar på
//    sin egen "fluglika" rörelse mäter sondens fluga och blir grön den dag banan ändras.
//
// ⚠️ RIGGEN ÄR DEN RIKTIGA. Sonden kör mot ett spel som redan har en `Ansikte`-instans
//    (`mata-munnen`) — frågan gäller riggens konstanter, och de är delade. Att bygga en
//    egen rigg hade mätt en kopia.
//
// `--zoner` är en annan fråga: LANDAR hon över huvud taget, och nås alla sex zoner? Zonen
// avgörs av `traffar()` (silhuetten rad för rad) plus var på ansiktet träffen låg, och en
// zon som aldrig nås är en reaktion som är byggd, betald och osynlig. Sonden driver spelets
// EGEN `_update` med syntetisk tid och hakar på `_landa`.
//
//   node scripts/_blickprobe.mjs [--sek 20] [--zoner]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? +args[i + 1] : d }
const SEK = opt('--sek', 20)
const ZONER = args.includes('--zoner')
const VARD = ZONER ? 'flugan-pa-nasan' : 'mata-munnen' // valfritt spel som bär en Ansikte-instans
const url = process.env.URL || 'http://localhost:5173'

const errors = []
let fel = 0
const rad = (ok, text) => { if (!ok) fel++; console.log(`  ${ok ? '✓' : '✗'} ${text}`) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), VARD)
  await page.waitForTimeout(2200)

  if (ZONER) {
    // Driv spelets EGEN loop. `_update` klämmer dt till 0,05 s, så steget måste vara ≤ det
    // (samma fälla som `_somnprobe` gick i: 0,25-steg gav spelet en femtedel av tiden).
    const korZoner = (sek, doda) => page.evaluate(async ([vard, s, d]) => {
      const g = (await import('/src/games/registry.js')).getGame(vard)
      const ctx = window.__barnspel.ctx
      const raknare = {}
      const original = g._landa.bind(g)
      g._landa = (c, f, zon) => { raknare[zon] = (raknare[zon] || 0) + 1; return original(c, f, zon) }
      // NYSNINGEN är den mekanism filhuvudet utpekar som garantin att barnet aldrig kan
      // fastna — och den var död kod: `NYS_TID` (6 s) var större än `SITT_MAX` (4,6), så
      // den vanliga lyft-timeouten hann alltid först. Att bara rätta talet räcker inte;
      // det ska SYNAS att den spelas.
      let nysningar = 0
      const nysOrig = g._nysa.bind(g)
      g._nysa = (c, f) => { nysningar++; return nysOrig(c, f) }
      let kladdiga = 0
      const kladdOrig = g._update.bind(g)
      // KONTROLLARM: stäng av träffytan helt. Då MÅSTE antalet landningar bli noll — annars
      // kommer landningarna inte från `traffar()` och hela mätningen betyder något annat.
      let zonOrig = null
      if (d) { zonOrig = g._zonFor.bind(g); g._zonFor = () => null }
      const STEG = 0.05
      let t = 0
      while (t < s) {
        kladdOrig(ctx, STEG * 1000)
        for (const f of g._flugor) if (f.kladdig) kladdiga = Math.max(kladdiga, 1)
        t += STEG
      }
      g._landa = original
      g._nysa = nysOrig
      if (zonOrig) g._zonFor = zonOrig
      const totalt = Object.values(raknare).reduce((a, b) => a + b, 0)
      return { raknare, totalt, ute: g._ute, nysningar, kladdiga }
    }, [VARD, sek, doda])

    const kontroll = await korZoner(60, true)
    rad(kontroll.totalt === 0, `kontrollarm: utan träffyta sker INGA landningar (${kontroll.totalt})`)

    await page.evaluate((id) => window.__barnspel.nav.go('library'), VARD)
    await page.waitForTimeout(400)
    await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), VARD)
    await page.waitForTimeout(2000)

    const r = await korZoner(240, false)
    console.log(`\n  LANDNINGAR över 240 s simulerad flykt — totalt ${r.totalt}\n`)
    const alla = ['lugg', 'oga', 'nasa', 'kind', 'ora', 'haka']
    for (const z of alla) console.log(`  ${z.padEnd(6)} ${String(r.raknare[z] || 0).padStart(4)}`)
    console.log('')
    rad(r.totalt >= 8, `flugan landar på pappa (${r.totalt} landningar på 240 s)`)
    const tomma = alla.filter((z) => !r.raknare[z])
    rad(tomma.length <= 2, `minst fyra av sex zoner nås (saknas: ${tomma.join(', ') || 'inga'})`)
    rad(!!r.raknare.nasa, 'NÄSAN nås — den bär `blick_ner`, spelets guldkorn')
    rad(r.nysningar > 0, `NYSNINGEN spelas (${r.nysningar} st) — garantin att barnet aldrig fastnar`)
    rad(r.kladdiga > 0, 'KAFFEKOPPEN nås — flugan blir kladdig och långsam (spec-kortets motgång)')
    rad(errors.length === 0, `0 konsolfel (${errors.length})`)
    for (const e of errors.slice(0, 6)) console.log(`      ${e}`)
    console.log(`\n  ${fel === 0 ? '✓ allt grönt' : `✗ ${fel} röda rader`}\n`)
    await browser.close()
    process.exit(fel ? 1 : 0)
  }

  const kor = (arm, sek) => page.evaluate(async ([vard, a, s]) => {
    const g = (await import('/src/games/registry.js')).getGame(vard)
    const F = await import('/src/games/flugan-pa-nasan/fluga.js')
    const ans = g._ans
    if (!ans) return null

    // Hooka riggens EGET beslut. `_blickTill(namn)` är den enda punkt där lappen faktiskt
    // byts; att räkna alfa hade räknat korsblekningens bildrutor i stället för bytena.
    const original = ans._blickTill.bind(ans)
    let byten = 0
    const foljd = []
    ans._blickTill = (namn) => {
      if (namn !== ans._blickNamn) {
        byten++
        foljd.push(namn || '-')
      }
      return original(namn)
    }

    const DT = 1 / 60
    const langsam = a === 'langsam'
    // Kontrollarmen är SAMMA bana i 1/5 farten — inte en annan, lugnare rörelse. Annars
    // jämförs två olika saker och skillnaden kan inte tillskrivas farten.
    const bana = new F.Flugbana({
      x: 640, y: 300,
      omrade: { x: 640, y: 300, w: 620, h: 400 },
      fart: langsam ? 60 : 300,
      accel: langsam ? 300 : 1500,
      ryckMin: langsam ? 1.1 : 0.22,
      ryckMax: langsam ? 3.1 : 0.62,
    })
    const filter = a === 'filtrerad' ? new F.Blickfilter({ tid: 0.28 }) : null

    let t = 0
    while (t < s) {
      bana.steg(DT)
      let bx = bana.x
      let by = bana.y
      if (filter) {
        filter.steg(DT, bx, by)
        bx = filter.x
        by = filter.y
      }
      const dx = (bx - 640) / F.BLICK_RADIE
      const dy = (by - 300) / F.BLICK_RADIE
      ans.blick(Math.max(-1, Math.min(1, dx)), Math.max(0, Math.min(1, dy)))
      t += DT
    }
    ans._blickTill = original
    return { byten, perSek: +(byten / s).toFixed(2), foljd: foljd.slice(0, 14).join(' ') }
  }, [VARD, arm, sek])

  console.log(`\n  BLICKBYTEN per sekund — ${SEK} s simulerad bana per arm\n`)
  console.log('  arm            byten   per sekund')
  const ut = {}
  for (const arm of ['langsam', 'fluga', 'filtrerad']) {
    const r = await kor(arm, SEK)
    if (!r) { rad(false, 'ingen ansiktsrigg i värdspelet'); break }
    ut[arm] = r
    console.log(`  ${arm.padEnd(12)} ${String(r.byten).padStart(7)} ${String(r.perSek).padStart(12)}`)
  }
  console.log('')
  if (ut.langsam) console.log(`  följd (långsam):   ${ut.langsam.foljd}`)
  if (ut.fluga) console.log(`  följd (fluga):     ${ut.fluga.foljd}`)
  if (ut.filtrerad) console.log(`  följd (filtrerad): ${ut.filtrerad.foljd}\n`)

  // KONTROLLARMEN FÖRST: kan mätningen över huvud taget skilja en lugn bana från en ryckig?
  rad(ut.langsam && ut.fluga && ut.fluga.perSek > ut.langsam.perSek * 1.5,
    `kontrollarm: den ryckiga banan ger tydligt fler byten än samma bana i 1/5 farten `
    + `(${ut.fluga?.perSek} mot ${ut.langsam?.perSek} per s)`)

  // DOMEN: ~3 byten/s är gränsen där en blick börjar läsa som ett ögonflimmer.
  const GRANS = 3
  rad(ut.langsam && ut.langsam.perSek <= GRANS, `långsam bana är under gränsen (${ut.langsam?.perSek} ≤ ${GRANS})`)
  console.log(ut.fluga && ut.fluga.perSek > GRANS
    ? `  ⚠ RÅ FLUGA FLIMRAR: ${ut.fluga.perSek} byten/s > ${GRANS} — lågpassfiltret behövs`
    : `  · rå fluga håller sig under gränsen: ${ut.fluga?.perSek} byten/s`)
  rad(ut.filtrerad && ut.filtrerad.perSek <= GRANS,
    `FILTRERAD fluga är under gränsen (${ut.filtrerad?.perSek} ≤ ${GRANS} byten/s)`)

  rad(errors.length === 0, `0 konsolfel (${errors.length})`)
  for (const e of errors.slice(0, 6)) console.log(`      ${e}`)
} finally {
  await browser.close()
}
console.log(`\n  ${fel === 0 ? '✓ allt grönt' : `✗ ${fel} röda rader`}\n`)
process.exit(fel ? 1 : 0)
