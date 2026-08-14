// _snurrprobe — SPELAR `roliga-snurran` utan att gå via registret.
//
// Spelet är nybyggt och ännu inte registrerat, så `npm run test` kan inte nå det. Sonden
// importerar modulen direkt via dev-servern, bygger en ctx av skalets egna tjänster och
// kör kärnloopen: spak → tre trumtryck → utfall, om och om igen.
//
// Den mäter det designen FAKTISKT lovar, inte att koden går att köra:
//   1) SIKTET  — den symbol som står i fönstret NÄR fingret nuddar ska vara den som
//                stannar där. Sonden läser `_centreKey` vid trycket och jämför med
//                trummans vilonyckel efteråt. Kontrollarm: samma jämförelse mot en
//                symbol som lästes ett HALVT steg fel (ska ge en klart sämre siffra).
//   2) UTFALL  — alla tre grenarna (tre lika · två lika · blandfigur) ska nås, och
//                varje snurr ska sluta med att spaken går att dra igen (ingen låsning).
//   3) EXIT    — destroy() mitt i ett firande får inte lämna ett konsolfel efter sig.
//
//   node scripts/_snurrprobe.mjs [--snurr 12] [--url http://localhost:5173]
//   node scripts/_snurrprobe.mjs --bild --shot <UTANFÖR repot>/snurr.png
//
// ⚠️ SKRIV INTE SKÄRMDUMPAR IN I REPOT MEDAN SIDAN LEVER. Vite-servern bevakar
// projektroten, och en ny fil i `.test-shots/` mitt i en körning ger en FULL PAGE RELOAD:
// WebGL-kontexten rivs under Pixis fötter och körningen slutar med "Could not retrieve
// shader source (WebGL context may be lost)" — plus en skärmdump där varje gradient-
// fyllning i HELA appen ritas fel (himlen, maskinens plåt, Bobos huvud). Det såg exakt ut
// som en GPU-bugg i spelet. Attribuerat med mätning: 3 av 3 körningar rena när samma bilder
// skrevs utanför repot, mot 2 av 4 med WebGL-fel när de skrevs till `.test-shots/`, och två
// kontrollarmar (bibliotekskärmen ensam · spelet monterat men ospelat · och `roliga-snurran`
// respektive `tryck-och-forvandla` klickade i 45 s med EN dump på slutet) alla rena 3/3.
// `npm run test` är opåverkad — den fotar först när spelet är avslutat.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const SNURR = Number(opt('--snurr', 12))
const BILD = args.includes('--bild') // ta bilder i tre lägen i stället för att mäta
const url = opt('--url', 'http://localhost:5173')
const shot = opt('--shot', '.test-shots/roliga-snurran-sond.png')
mkdirSync(dirname(shot), { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  const t0 = Date.now()
  // Tidsstämpla felen. Utan stämpeln går det inte att se OM ett WebGL-fel kommer under
  // spelet eller först vid skärmdump/rivning — och det är hela skillnaden mellan ett
  // spelfel och en sondartefakt.
  page.on('console', (m) => { if (m.type() === 'error') fel.push(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ` + m.text().slice(0, 180)) })
  page.on('pageerror', (e) => fel.push(`[${((Date.now() - t0) / 1000).toFixed(1)}s] PAGEERROR: ` + (e.message || String(e)).slice(0, 180)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)

  // --bild: montera spelet och fota tre lägen (vila · snurrande · firande). Ett spel
  // går inte att bedöma i tal — och det här spelets hela poäng är hur maskinen SER ut.
  if (BILD) {
    await page.evaluate(async (rent) => {
      window.__rent = rent
      const s = window.__barnspel
      const { drawIcon } = await import('/src/lib/artikoner.js')
      const mod = (await import('/src/games/roliga-snurran/index.js')).default
      const stage = drawIcon('__ingen__', 1).clear()
      s.gateLayer.addChild(stage)
      const progress = {
        _st: { unlocked: true, highestLevel: 0, stars: 0, custom: {} },
        get() { return this._st }, update() {}, setLevel() {}, addStars() {},
        setCustom() {}, complete() {},
      }
      const ctx = {
        stage, ticker: s.app.ticker, width: 1280, height: 720, view: s.scaler.view,
        services: s, progress, fxLayer: s.fxLayer, exitToLibrary() {},
        later(sec, fn) { const id = setTimeout(fn, sec * 1000); return { kill: () => clearTimeout(id) } },
      }
      mod.init(ctx)
      mod.mount(ctx)
      window.__snurr = { mod, ctx }
    }, args.includes('--rent'))
    await page.waitForTimeout(900)
    await page.screenshot({ path: shot.replace('.png', '-1vila.png') })
    await page.evaluate(() => window.__snurr.mod._leverTap(window.__snurr.ctx))
    await page.waitForTimeout(900)
    await page.screenshot({ path: shot.replace('.png', '-2snurr.png') })
    // Tvinga fram tre lika så festen syns i bild.
    await page.evaluate(() => {
      const { mod, ctx } = window.__snurr
      for (const r of mod._reels) mod._reelTap(ctx, r)
      if (!window.__rent) setTimeout(() => { for (const r of mod._reels) { r.strip = r.strip.map(() => '⭐'); for (let i = 0; i < 6; i++) r.nodes[i]._symSetKey('⭐') } }, 100)
    })
    await page.waitForTimeout(1900)
    await page.screenshot({ path: shot.replace('.png', '-3fest.png') })

    // Fjärde läget: alla olika → blandfiguren. Den är spelets mest karaktärsbärande
    // grafik och går inte att bedöma i tal.
    await page.waitForFunction(() => window.__snurr.mod._phase === 'redo', null, { timeout: 20000 })
    await page.evaluate(() => {
      const { mod, ctx } = window.__snurr
      mod._leverTap(ctx)
      setTimeout(() => {
        const olika = ['🐶', '🍎', '🚀']
        mod._reels.forEach((r, i) => {
          if (!window.__rent) {
            r.strip = r.strip.map(() => olika[i])
            for (let s = 0; s < 6; s++) r.nodes[s]._symSetKey(olika[i])
          }
          mod._reelTap(ctx, r)
        })
      }, 700)
    })
    await page.waitForTimeout(2600)
    await page.screenshot({ path: shot.replace('.png', '-4bland.png') })
    await page.evaluate(() => window.__snurr.mod.destroy(window.__snurr.ctx))
    console.log(`  bilder: ${shot.replace('.png', '-1vila.png')} · -2snurr · -3fest`)
    console.log(fel.length ? `  ✗ ${fel.length} konsolfel:\n    ${fel.join('\n    ')}` : '  ✓ 0 konsolfel')
    await browser.close()
    process.exit(0)
  }

  const res = await page.evaluate(async (SNURR) => {
    const s = window.__barnspel
    const { drawIcon } = await import('/src/lib/artikoner.js')
    const mod = (await import('/src/games/roliga-snurran/index.js')).default

    const stage = drawIcon('__ingen__', 1).clear() // Graphics ärver Container
    s.gateLayer.addChild(stage)
    const timers = new Set()
    const progress = {
      _st: { unlocked: true, highestLevel: 0, stars: 0, custom: {} },
      get() { return this._st },
      update() {}, setLevel() {}, addStars() {},
      setCustom(k, v) { this._st.custom[k] = v },
      complete() { window.__snurrDone = (window.__snurrDone || 0) + 1 },
    }
    const ctx = {
      stage, ticker: s.app.ticker, width: 1280, height: 720, view: s.scaler.view,
      services: s, progress, fxLayer: s.fxLayer, exitToLibrary() {},
      later(sec, fn) {
        const id = setTimeout(() => { timers.delete(id); fn() }, sec * 1000)
        timers.add(id)
        return { kill: () => clearTimeout(id) }
      },
    }
    const vila = (ms) => new Promise((r) => setTimeout(r, ms))

    mod.init(ctx)
    mod.mount(ctx)
    window.__snurr = { mod, ctx, vila }
    await vila(700)

    const sikte = { traff: 0, miss: 0, kontrollTraff: 0, kontrollMiss: 0 }
    const utfall = { tre: 0, tva: 0, bland: 0 }
    const laser = []
    const spar = []
    let laster = 0

    for (let n = 0; n < SNURR; n++) {
      // vänta tills spaken är dragbar
      let vakt = 0
      while (mod._phase !== 'redo' && vakt++ < 200) await vila(50)
      if (mod._phase !== 'redo') { laster++; break }

      mod._leverTap(ctx)
      await vila(950) // förbi uppstarten, så trycket blir ett RIKTAT tryck
      spar.push(`#${n} fas=${mod._phase} lagen=${mod._reels.map((r) => r.state + ':' + r.spinT.toFixed(2)).join(',')}`)

      const sedda = []
      for (let i = 0; i < 3; i++) {
        const r = mod._reels[i]
        // Trycket kan AVVISAS (spärren mot att trumman stoppas innan den ens kommit
        // igång svarar med ett kvitto i stället). Ett barn trycker då bara igen — så
        // sonden gör det med, annars mäter den sin egen otålighet i stället för spelet.
        let f = 0
        while (r.state === 'spin' && f++ < 12) {
          // vad SER barnet i fönstret i samma bildruta som fingret nuddar?
          const sedd = mod._centreKey(r)
          const bredvid = r.strip[(((Math.round(-r.offset / 168) + 1) % 6) + 6) % 6]
          mod._reelTap(ctx, r)
          if (r.state !== 'spin') { sedda[i] = { sedd, bredvid }; break }
          await vila(120)
        }
        if (!sedda[i]) sedda[i] = { sedd: null, bredvid: null }
        await vila(260)
      }
      // Vänta tills alla verkligen står — annars mäts en trumma som fortfarande bromsar.
      let v2 = 0
      while (mod._reels.some((r) => r.state !== 'still') && v2++ < 100) await vila(50)
      for (let i = 0; i < 3; i++) {
        const fick = mod._reels[i].key
        if (sedda[i].sedd == null) continue
        if (sedda[i].sedd === fick) sikte.traff++
        else sikte.miss++
        if (sedda[i].bredvid === fick) sikte.kontrollTraff++
        else sikte.kontrollMiss++
      }
      const k = mod._reels.map((r) => r.key)
      if (k[0] === k[1] && k[1] === k[2]) utfall.tre++
      else if (k[0] === k[1] || k[1] === k[2] || k[0] === k[2]) utfall.tva++
      else utfall.bland++
      laser.push(k.join(' '))
      await vila(300)
    }

    // Exit mitt i ett firande: dra spaken, stoppa allt och riv under pågående dans.
    let vakt = 0
    while (mod._phase !== 'redo' && vakt++ < 200) await vila(50)
    mod._leverTap(ctx)
    await vila(700)
    for (const r of mod._reels) mod._reelTap(ctx, r)
    await vila(900) // mitt i utfallets animation
    const levande = { mynt: mod._coins.length, hopp: mod._leaps.length, bland: !!mod._bland }
    // Rivningen sker i ett EGET anrop, så Node hinner fota maskinen efter alla
    // rundbyten (18 symboler byts ut per byte — det är den enda punkt där spelet
    // river och bygger grafik i klump, och den måste synas i bild).
    window.__snurrRiv = () => { mod.destroy(ctx); for (const id of timers) clearTimeout(id) }

    return { sikte, utfall, laser, laster, levande, spar, klart: window.__snurrDone || 0 }
  }, SNURR)

  await page.waitForTimeout(300)
  await page.screenshot({ path: shot.replace('.png', '-efter-rundbyten.png') })
  await page.evaluate(() => window.__snurrRiv())
  await page.waitForTimeout(600)
  await page.screenshot({ path: shot })

  const { sikte, utfall, levande } = res
  const andel = (a, b) => (a + b ? ((a / (a + b)) * 100).toFixed(1) : '0.0')
  console.log(`\n  roliga-snurran — ${SNURR} snurr\n`)
  console.log(`  SIKTE   sedd symbol stannade: ${andel(sikte.traff, sikte.miss)} %  (${sikte.traff}/${sikte.traff + sikte.miss})`)
  console.log(`          kontrollarm (grannsymbolen): ${andel(sikte.kontrollTraff, sikte.kontrollMiss)} %`)
  console.log(`  UTFALL  tre lika ${utfall.tre} · två lika ${utfall.tva} · blandfigur ${utfall.bland}`)
  console.log(`  RUNDA   complete() ${res.klart} ggr · låsningar ${res.laster}`)
  console.log(`  EXIT    revs med ${levande.mynt} mynt, ${levande.hopp} utsprungna symboler, blandfigur: ${levande.bland}`)
  console.log(`  fall:   ${res.laser.join(' | ')}`)
  for (const rad of res.spar || []) console.log(`    ${rad}`)
  console.log(fel.length ? `\n  ✗ ${fel.length} konsolfel:\n    ${fel.join('\n    ')}\n` : `\n  ✓ 0 konsolfel · ${shot}\n`)
} finally {
  await browser.close()
}
