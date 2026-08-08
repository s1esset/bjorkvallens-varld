// Mäter om partikelvägen (lib/partiklar.js -> ParticleContainer) FAKTISKT används,
// om den ritar pixlar, och om den städar efter sig.
//
// Varför en sond: `npm run test` säger bara "0 konsolfel". Faller partikelvägen
// tillbaka på den gamla Graphics-vägen — för att bakningen misslyckats, renderaren
// inte registrerats, eller atlasarket blivit tomt — är testet exakt lika grönt och
// skärmdumpen exakt lika snygg. Enda sättet att veta är att titta i scengrafen medan
// effekten pågår.
//
// TVÅ delar, för att inte upprepa förra versionens misstag: den tryckte på fasta
// punkter i ett spel där ballongerna SVÄVAR, missade allihop, och rapporterade rött
// om ett system som fungerade. En sond som mäter noll måste kunna skilja "vägen är
// död" från "jag träffade ingenting".
//
//   A. direkt — anropar appens EGNA feedback-modul (samma instans; Vite serverar
//      /src/lib/feedback.js på samma URL som skalet importerade). Bevisar att vägen
//      lever och att partiklarna syns i pixlarna.
//   B. i spel — trycker sig igenom ett spel och letar efter partiklar i scengrafen.
//      Bevisar att spelens egna anrop går samma väg.
//
//   node scripts/_partikelprobe.mjs [id] [--shot ut.png]
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const id = args[0] && !args[0].startsWith('--') ? args[0] : 'klambubblor'
const shot = opt('--shot', `.test-shots/_partikel-${id}.png`)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  // Går igenom HELA scenen — spelen skickar effekter till sitt eget rotlager lika
  // ofta som till det delade fxLayer.
  const scan = () => page.evaluate(() => {
    let falt = 0
    let partiklar = 0
    const walk = (n) => {
      if (!n || n.destroyed) return
      if (Array.isArray(n.particleChildren)) { falt++; partiklar += n.particleChildren.length }
      const kids = n.children
      if (kids) for (let i = 0; i < kids.length; i++) walk(kids[i])
    }
    walk(window.__barnspel.app.stage)
    return { falt, partiklar }
  })

  // Antal distinkta färger i ett utsnitt (5-bitars kvantisering). Partiklar i glada
  // färger ovanpå en lugn bakgrund höjer den siffran kraftigt.
  const farger = async (cx, cy) => {
    const buf = await page.screenshot({
      clip: { x: Math.max(0, cx - 130), y: Math.max(0, cy - 130), width: 260, height: 260 },
    })
    const png = PNG.sync.read(buf)
    const set = new Set()
    for (let i = 0; i < png.data.length; i += 4) {
      set.add((png.data[i] >> 3) * 1024 + (png.data[i + 1] >> 3) * 32 + (png.data[i + 2] >> 3))
    }
    return set.size
  }

  // ---------- A. direkt genom appens egen modul ----------
  //
  // VARNING, uppmätt: importera ALDRIG en lib-fil på sin bara sökväg härifrån.
  // Efter en filändring serverar Vite modulen som `/src/lib/atlas.js?t=<tid>` till
  // appen, medan `/src/lib/atlas.js` utan query blir en NY instans med tomt tillstånd.
  // Den första versionen av den här sonden gjorde just det och rapporterade
  // "renderare registrerad: false" om en app där den var registrerad.
  //
  // `partiklar.redo()` är säkert: modulens EGNA relativa import (`./atlas.js`) skrivs
  // om av Vite till samma `?t=`-URL som skalet använder, så svaret kommer från appens
  // riktiga atlas. Och redo() === true innebär att renderaren är registrerad — utan
  // den returnerar frames() null.
  const modul = await page.evaluate(async () => {
    const part = await import('/src/lib/partiklar.js')
    return { ark: part.redo(), tathet: part.DENSITY }
  })

  const foreA = await farger(640, 360)
  await page.evaluate(async () => {
    const fb = await import('/src/lib/feedback.js')
    fb.burst(window.__barnspel.fxLayer, 640, 360, { count: 30 })
  })
  await page.waitForTimeout(90)
  const direkt = await scan()
  const efterA = await farger(640, 360)
  await page.screenshot({ path: shot })
  await page.waitForTimeout(2000)
  const kvarA = await scan()

  // ---------- B. i ett riktigt spel ----------
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(1600)

  let iSpel = 0
  let faltISpel = 0
  // Rutnät av tryck så rörliga mål inte kan gömma sig mellan punkterna.
  for (let gy = 200; gy <= 560 && iSpel === 0; gy += 90) {
    for (let gx = 200; gx <= 1080; gx += 110) {
      await page.mouse.click(gx, gy)
      await page.waitForTimeout(55)
      const s = await scan()
      if (s.partiklar > iSpel) { iSpel = s.partiklar; faltISpel = s.falt }
    }
  }

  // Exit mitt i en effekt.
  const felFore = errors.length
  await page.mouse.click(640, 360)
  await page.waitForTimeout(110)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)
  const felVidExit = errors.length - felFore

  const rad = (n, v, ok) => console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(26)} ${v}`)
  console.log(`\n  Partikelsond — direkt + ${id}\n`)
  rad('atlasark bakat (appens)', modul.ark, modul.ark === true)
  rad('täthetsfaktor', modul.tathet, true)
  console.log('')
  rad('A: fält (ParticleContainer)', direkt.falt, direkt.falt > 0)
  rad('A: partiklar', direkt.partiklar, direkt.partiklar > 0)
  rad('A: färger före → under', `${foreA} → ${efterA}`, efterA > foreA)
  rad('A: kvar efter 2 s', kvarA.partiklar, kvarA.partiklar === 0)
  console.log('')
  rad('B: fält i spel', faltISpel, faltISpel > 0)
  rad('B: partiklar i spel', iSpel, iSpel > 0)
  console.log('')
  rad('konsolfel vid exit', felVidExit, felVidExit === 0)
  rad('konsolfel totalt', errors.length, errors.length === 0)
  if (errors.length) console.log('\n  ' + errors.slice(0, 5).join('\n  '))
  console.log(`\n  skärmdump: ${shot}\n`)

  const gront =
    modul.ark &&
    direkt.falt > 0 && direkt.partiklar > 0 && efterA > foreA && kvarA.partiklar === 0 &&
    faltISpel > 0 && iSpel > 0 && errors.length === 0
  kod = gront ? 0 : 1
} catch (e) {
  console.error(e)
  kod = 2
} finally {
  await browser.close()
}
process.exit(kod)
