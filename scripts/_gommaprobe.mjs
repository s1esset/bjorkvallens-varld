// _gommaprobe.mjs — ÄR PAPPA GÖMD, OCH SYNS HAN NÄR HAN HITTAS?
//
// `titt-ut-pappa` gömmer inte ansiktet med en mask utan med LAGERORDNING: varje gömställe
// har en `bak`- och en `fram`-del och riggen ligger emellan. Det betyder att "är han gömd?"
// är en ren bildfråga — ingen flagga i koden vet svaret, och aritmetiken i `rummet.js`
// (`ansY >= kantY + 152`) är ett PÅSTÅENDE om geometri, inte en mätning av vad som ritas.
//
// FENOMENET SOM MÄTS: hur många pixlar av ansiktet SYNS i varje läge?
//
// Metoden är den enda av de tre i CLAUDE.md som faktiskt svarar: scenen FRYSES
// (`gsap.globalTimeline.pause()` + spelets `_busy`), och sedan tas två skärmdumpar som
// skiljer sig på EXAKT en sak — ansiktets `visible`. Diffen är då per definition den
// synliga delen av ansiktet; ingenting annat kan ha rört sig mellan bilderna. En jämförelse
// mot en referensbild hade i stället mätt gardinen som vajade, och att växla `visible` utan
// att frysa hade mätt allt som hann röra sig under de ~60 ms bilderna ligger isär.
//
// ⚠️ KONTROLLARMEN KÖRS FÖRE MÄTARMEN, per gömställe. `kontroll` lyfter ansiktet 220 px
//    över sitt gömda läge med fronten STÄNGD — ett läge som är känt SYNLIGT. Skiljer inte
//    sonden den från `gomd` mäter den ingenting, och då är resten av talen värdelösa.
//
// ⚠️ gsap hämtas ur SIDANS egen modulinstans (resource-listan), aldrig som en nyimport:
//    en egen kopia har en egen global tidslinje och skulle pausa ingenting alls.
//
// `--kompisar` är en annan fråga och svarar bara i BILD: ritar de sju överraskningarna
// stort på en lugn botten. P0 ASSETS ("egen silhuett, aldrig en emoji i en ruta") går inte
// att läsa ur koden — `drawIcon` är godkänd som grund, och skillnaden mellan en godtagbar
// och en tunn figur syns bara för ögat.
//
//   node scripts/_gommaprobe.mjs [--spara] [--kompisar]
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const SPARA = args.includes('--spara')
const KOMPISBILD = args.includes('--kompisar')
const ID = 'titt-ut-pappa'
const url = process.env.URL || 'http://localhost:5173'
const UT = '.test-shots/gomma'

const errors = []
let fel = 0
const rad = (ok, text) => { if (!ok) fel++; console.log(`  ${ok ? '✓' : '✗'} ${text}`) }

// Antal pixlar som skiljer två bilder, plus var de ligger. Tröskeln är medvetet låg (8 av
// 255 per kanal): ansiktet är ett foto mot tapet och skillnaden är stor där den finns —
// det som ska sållas bort är komprimeringsbrus, inte svaga skillnader.
function diff(a, b) {
  const A = PNG.sync.read(a)
  const B = PNG.sync.read(b)
  const n = Math.min(A.data.length, B.data.length)
  let antal = 0
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
  for (let i = 0; i < n; i += 4) {
    const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2])
    if (d < 24) continue
    antal++
    const p = i / 4
    const x = p % A.width
    const y = (p / A.width) | 0
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return { antal, bbox: antal ? { x0, y0, x1, y1 } : null }
}

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
  await page.waitForTimeout(2200)

  // Sidans EGNA gsap. Utan den här raden pausas ingenting och varje mätning nedan blir
  // brus från gardiner, klockvisare och kompisar som guppar.
  const harGsap = await page.evaluate(async () => {
    const u = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /gsap/i.test(n))
    if (!u) return false
    window.__gsap = (await import(u)).gsap
    return !!window.__gsap
  })
  rad(harGsap, 'sidans egen gsap hittad (annars mäter sonden brus)')
  if (!harGsap) throw new Error('ingen gsap-modul i resource-listan')

  const nycklar = await page.evaluate(async (id) => {
    const g = (await import('/src/games/registry.js')).getGame(id)
    return g?._platser?.map((p) => p.key) || []
  }, ID)
  rad(nycklar.length === 7, `7 gömställen byggda (fick ${nycklar.length}: ${nycklar.join(', ')})`)

  if (SPARA || KOMPISBILD) mkdirSync(UT, { recursive: true })

  if (KOMPISBILD) {
    const namn = await page.evaluate(async () => {
      // Pixi hämtas ur SIDANS resource-lista, precis som gsap ovan — Vites dep-url är
      // innehållshashad och går inte att gissa (`/node_modules/.vite/deps/pixi.js` finns inte).
      const pu = performance.getEntriesByType('resource').map((r) => r.name)
        .find((n) => /deps\/pixi\.js/.test(n)) || performance.getEntriesByType('resource')
        .map((r) => r.name).find((n) => /pixi/i.test(n))
      const { Container, Graphics } = await import(pu)
      const K = await import('/src/games/titt-ut-pappa/kompisar.js')
      const ctx = window.__barnspel.ctx
      for (const b of ctx.stage.children) b.visible = false
      const rot = new Container()
      rot.addChild(new Graphics().rect(0, 0, 1280, 720).fill(0xf3ece0))
      ctx.stage.addChild(rot)
      window.__kompisRot = rot
      const gjorda = []
      K.KOMPISAR.forEach((key, i) => {
        const k = K.makeKompis(key)
        k.view.position.set(150 + (i % 4) * 320, i < 4 ? 210 : 520)
        k.view.scale.set(1.7)
        rot.addChild(k.view)
        k.liv?.()
        gjorda.push(k.key)
      })
      return gjorda
    })
    await page.waitForTimeout(900)
    writeFileSync(`${UT}/kompisar.png`, await page.screenshot())
    rad(namn.length === 7, `7 kompisar ritade i .test-shots/gomma/kompisar.png (${namn.join(', ')})`)
    rad(errors.length === 0, `0 konsolfel när kompisarna byggdes (${errors.length})`)
    for (const e of errors.slice(0, 6)) console.log(`      ${e}`)
    console.log(`\n  ${fel === 0 ? '✓ bilden skriven — titta på den' : `✗ ${fel} röda rader`}\n`)
    await browser.close()
    process.exit(fel ? 1 : 0)
  }

  // Ställ ansiktet i ett läge och frys scenen. `lage`: 'gomd' | 'kik' | 'upp' | 'kontroll'.
  const stall = async (key, lage) => {
    await page.evaluate(async ([id, k, l]) => {
      const g = (await import('/src/games/registry.js')).getGame(id)
      const plats = g._platser.find((p) => p.key === k)
      window.__gsap.globalTimeline.resume()
      g._busy = true
      g._idle = 0
      plats.g.stang?.()
      g._pappaPlats = plats
      g._flyttaPappa(plats, { direkt: true })
      if (l === 'upp') plats.g.oppna?.()
      window.__plats = plats
    }, [ID, key, lage])
    // Låt en öppning/stängning spela klart INNAN allt fryses — annars mäts ett halvöppet
    // lock, vilket är ett tredje läge ingen av armarna beskriver.
    await page.waitForTimeout(l0(lage))
    await page.evaluate(async ([id, l]) => {
      const g = (await import('/src/games/registry.js')).getGame(id)
      const a = g._ans
      window.__gsap.killTweensOf(a.view)
      // ⚠️ KONTROLLARMEN MÅSTE GÅ BORT FRÅN SKYDDET, inte alltid uppåt — och VILKEN väg det
      //    är går inte att sluta sig till ur talen. Första försöket lyfte alltid 220 px upp,
      //    och för taklampan (skyddet sitter ovanför) betydde det ut ur bilden: 2 665 px i
      //    stället för ett fritt ansikte, alltså UNDER tröskeln armen skulle bevisa. Andra
      //    försöket valde riktning ur `kantY > ansY` och föll direkt på krukan, som med flit
      //    står ovanför sin egen kant. Nu prövas BÅDA riktningarna och den friaste vinner —
      //    det är det armen faktiskt är till för: ett läge som är känt synligt.
      a.view.y = l === 'gomd' ? g._gomdY
        : l === 'kik' ? g._kikY
          : l === 'upp' ? g._uppY
            : l === 'kontrollUpp' ? g._gomdY - 220
              : g._gomdY + 220
      window.__gsap.globalTimeline.pause()
    }, [ID, lage])
    await page.waitForTimeout(140)
  }
  const l0 = (lage) => (lage === 'upp' ? 700 : 260)

  const satt = async (synlig) => {
    await page.evaluate(async ([id, s]) => {
      const g = (await import('/src/games/registry.js')).getGame(id)
      g._ans.view.visible = s
    }, [ID, synlig])
    await page.waitForTimeout(90)
  }

  const mat = async (key, lage) => {
    await stall(key, lage)
    await satt(true)
    const a = await page.screenshot()
    await satt(false)
    const b = await page.screenshot()
    await satt(true)
    if (SPARA) writeFileSync(`${UT}/${key}-${lage}.png`, a)
    return diff(a, b)
  }

  console.log('\n  GÖMSTÄLLE          kontroll     gömd        kik         upp      (synliga px av ansiktet)')
  const tabell = []
  for (const key of nycklar) {
    // KONTROLLARMEN FÖRST, alltid — se filhuvudet.
    const kUpp = await mat(key, 'kontrollUpp')
    const kNer = await mat(key, 'kontrollNer')
    const kontroll = kUpp.antal >= kNer.antal ? kUpp : kNer
    const gomd = await mat(key, 'gomd')
    const kik = await mat(key, 'kik')
    const upp = await mat(key, 'upp')
    tabell.push({ key, kontroll, gomd, kik, upp })
    console.log(`  ${key.padEnd(18)} ${String(kontroll.antal).padStart(8)} ${String(gomd.antal).padStart(11)} ${String(kik.antal).padStart(11)} ${String(upp.antal).padStart(11)}`)
  }

  console.log('')
  for (const t of tabell) {
    // Kan sonden skilja två KÄNDA lägen åt? Utan den här raden säger resten ingenting.
    rad(t.kontroll.antal > t.gomd.antal + 4000,
      `${t.key}: kontrollarmen syns tydligt mer än det gömda läget (${t.kontroll.antal} mot ${t.gomd.antal})`)
  }
  console.log('')
  for (const t of tabell) {
    // KRUKAN ÄR UNDANTAGET, och det är spelets skämt: den är med flit alldeles för liten
    // och halva pappa ska sticka upp bakom den i runda 3. Att kräva att den gömmer honom
    // vore att mäta mot fel avsikt — men den får inte heller vara i praktiken oskymd, så
    // den prövas mot kontrollarmen i stället för mot noll.
    if (t.key === 'kruka') {
      rad(t.gomd.antal < t.kontroll.antal * 0.8,
        `kruka: skämtet — syns tydligt men mindre än helt fri (${t.gomd.antal} mot fritt ${t.kontroll.antal})`)
      continue
    }
    rad(t.gomd.antal < 2500, `${t.key}: GÖMD — högst 2 500 px av ansiktet syns (${t.gomd.antal})`)
  }
  console.log('')
  for (const t of tabell) {
    // TAKLAMPAN HAR MED FLIT INGEN KIK, och det är geometri, inte en glömska: skyddet sitter
    // OVANFÖR ansiktet, så "titta fram över kanten" skulle betyda att åka NEDÅT — och
    // eftersom ögonen sitter högt i ansiktet exponerar en nedåtkik hela nedre 2/3 av
    // ansiktet i stället för ett par ögon. Lampan skvallrar med bukt, skakning och fniss.
    if (t.key === 'lampa') {
      rad(t.kik.antal === t.gomd.antal, 'lampa: ingen kik (skyddet sitter ovanför — avsiktligt, se doc §4)')
      continue
    }
    // KRUKAN HAR HELLER INGEN KIK, och behöver ingen: han syns redan till 3/4. En titt fram
    // över kanten på en 130 px hög kruka har ingen kant att titta över — skvallret där är
    // att han står mitt i rummet bakom en krukväxt.
    if (t.key === 'kruka') {
      rad(Math.abs(t.kik.antal - t.gomd.antal) < 600, 'kruka: ingen kik behövs (han syns redan — spelets skämt)')
      continue
    }
    rad(t.kik.antal > t.gomd.antal + 300, `${t.key}: KIKEN syns över det gömda läget (+${t.kik.antal - t.gomd.antal} px)`)
  }
  console.log('')
  for (const t of tabell) {
    const b = t.upp.bbox
    const inne = b && b.y0 >= 0 && b.y1 <= 719
    rad(t.upp.antal > 12000, `${t.key}: HITTAD — ansiktet syns ordentligt (${t.upp.antal} px)`)
    rad(!!inne, `${t.key}: HITTAD — inom bild (bbox y ${b ? `${b.y0}–${b.y1}` : 'inget'})`)
  }

  // Krukan är UNDANTAGET och ska synas redan i gömt läge — spelets skämt i runda 3.
  const kruka = tabell.find((t) => t.key === 'kruka')
  if (kruka) console.log(`\n  · krukans skämt: ${kruka.gomd.antal} px syns redan när han "gömmer sig" (avsiktligt)`)

  rad(errors.length === 0, `0 konsolfel (${errors.length})`)
  for (const e of errors.slice(0, 6)) console.log(`      ${e}`)
} finally {
  await browser.close()
}
console.log(`\n  ${fel === 0 ? '✓ allt grönt' : `✗ ${fel} röda rader`}\n`)
process.exit(fel ? 1 : 0)
