// SORTERA SKRÄP — fylls tunnan, och känns lasten?
//
//   node scripts/_tunnprobe.mjs [--cpu 4] [--bild]     (kräver dev-servern på :5173)
//
// Saken försvann bakom tunnan och lämnade inget spår: tunnan såg likadan ut efter tio
// saker som före den första. Fyra frågor, var och en mätt för sig — för de kan gå sönder
// oberoende av varandra:
//
//   1. LASTEN FINNS. En klump per svald sak, i sakens egen färg, upp till taket HEAP_CAP.
//   2. LASTEN SYNS. Antal MÅLADE pixlar i lastlagret. Mäts genom att dölja HELA scenen
//      utom lastlagret (CLAUDE.md: bara den isoleringen svarar på frågan — en referens-
//      bild mäter det som rört sig mest, och att växla `visible` mäter 60 ms av annat).
//   3. LOCKET TRYCKS UPP. Lockets vilo-y ska sjunka monotont med lasten och sluta vid taket.
//   4. TYNGDEN. En TOM tunna ska hoppa till och lugna sig fort; en FULL ska gå djupare och
//      ta längre tid. Mäts som guppets djup + tiden tills den står still, och tunnans
//      vilo-y ska ha sjunkit.
//
// ⚠️ Sonden matar via spelets egen `_onCorrect` (samma väg som ett rätt släpp), inte via
// draget — draget är oförändrat och skulle bara lägga till brus. Och den läser
// SCENGRAFEN, inte spelets flaggor: `_eaten` hade svarat ja även om inget ritats om.
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import fs from 'node:fs'

// Målade pixlar: allt som avviker från dukens tomma botten (hörnpixeln).
const malade = (buf) => {
  const p = PNG.sync.read(buf)
  const bg = [p.data[0], p.data[1], p.data[2]]
  let n = 0
  for (let i = 0; i < p.data.length; i += 4) {
    if (Math.abs(p.data[i] - bg[0]) + Math.abs(p.data[i + 1] - bg[1]) + Math.abs(p.data[i + 2] - bg[2]) > 24) n++
  }
  return n
}

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CPU = Number(opt('--cpu', 4))
const BILD = args.includes('--bild')

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
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'sortera-skrap' }))
  await page.waitForFunction(() => (window.__barnspel.game?._bins || []).length > 0, null, { timeout: 20000 })
  await page.waitForTimeout(1200)

  console.log(`\nSORTERA SKRÄP — fylls tunnan? (CPU x${CPU})\n`)

  // --- 1+3: mata EN tunna sju gånger (över taket) och läs scengrafen efter varje ----
  // ⚠️ Saken som matas in är en ATTRAPP utan container: en riktig sak ur högen hade
  // markerats sorterad och rundan hade byggts om (nya tunnor) mitt i mätningen.
  // `_onRoundDone` stubbas av samma skäl — sondens sju matningar är fler än rundans saker.
  const mata = await page.evaluate(async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    const sov = (ms) => new Promise((r) => setTimeout(r, ms))
    g._onRoundDone = () => {}
    const bin = g._bins[0]
    const attrapp = (cat) => ({ sorted: false, data: { category: cat, emoji: '🥫' }, container: null })
    const las = () => ({
      // Halsen (den solida massan locket vilar på) är också barn till lastlagret — räkna
      // bara klumparna, annars är serien ett steg fel.
      klumpar: bin._heap && !bin._heap.destroyed ? bin._heap.children.filter((c) => c !== bin._neck).length : -1,
      lockVila: Math.round((bin._lidBaseY ?? bin._lid?.y ?? 0) * 10) / 10,
      binY: Math.round(bin.y * 10) / 10,
      sagY: bin._sag && !bin._sag.destroyed ? Math.round(bin._sag.y * 10) / 10 : -999,
    })
    const start = las()
    const steg = []
    for (let i = 0; i < 7; i++) {
      g._onCorrect(ctx, attrapp(bin._cat), { view: bin })
      await sov(650) // klumpen föds vid 0,3 s; sättningen är klar innan nästa
      steg.push(las())
    }
    return { start, steg, cap: 6 }
  })

  const lockSerie = [mata.start.lockVila, ...mata.steg.map((s) => s.lockVila)]
  const klumpSerie = [mata.start.klumpar, ...mata.steg.map((s) => s.klumpar)]
  console.log(`  lock-vila per sak : ${lockSerie.map((v) => n1(v)).join(' → ')}`)
  console.log(`  klumpar per sak   : ${klumpSerie.join(' → ')}`)

  ok('1. lasten finns', klumpSerie[6] === 6, `${klumpSerie[0]} → ${klumpSerie[6]} klumpar`)
  ok('1b. taket håller', klumpSerie[7] === 6, `sjunde saken lade ${klumpSerie[7] - klumpSerie[6]} klump`)
  const monoton = lockSerie.slice(1, 7).every((v, i) => v < lockSerie[i] - 1)
  ok('3. locket trycks upp', monoton, `${n1(lockSerie[0])} → ${n1(lockSerie[6])} px (${n1(lockSerie[0] - lockSerie[6])} px lyft)`)
  ok('3b. lockets tak', Math.abs(lockSerie[7] - lockSerie[6]) < 0.5, `sjunde saken lyfte ${n1(lockSerie[6] - lockSerie[7])} px`)

  // SLÄPPMÅLET får inte röra sig. `DragController` mäter avståndet till `target.view.y` när
  // saken släpps, så en tunna som guppar 13 px flyttar undan sitt eget mål mitt i ett släpp
  // (testloggen fångade det som `snal-snappyta`: ett släpp 2 px utanför radien). Sättningen
  // ligger därför i ett inre lager — `bin.y` ska vara identisk hela vägen.
  const binSerie = [mata.start.binY, ...mata.steg.map((s) => s.binY)]
  const sagSerie = [mata.start.sagY, ...mata.steg.map((s) => s.sagY)]
  ok('6. släppmålet står still', new Set(binSerie).size === 1, `bin.y ${n1(binSerie[0])} genom hela lasten`)
  ok('6b. sättningen sitter i det inre lagret', sagSerie[6] > sagSerie[0] + 1.5, `sag.y ${n1(sagSerie[0])} → ${n1(sagSerie[6])} px`)

  // Bilden av en FULL tunna i den riktiga scenen (testsvitens skärmdump visar bara en tom).
  if (BILD) fs.writeFileSync('.test-shots/_tunnprobe-scen.png', await page.screenshot())

  // --- 2: målade pixlar i LASTLAGRET, hela scenen dold utom det --------------------
  // Isoleringen gar HELA vagen upp: for varje niva fran lastlagret till roten dols alla
  // syskon utom den som bar lasten. Forsta versionen dolde bara INUTI tunnan — och da
  // matte den fortfarande skalets egen bakknapp: 16 320 px i BADA armarna, alltsa ett tal
  // som var gront aven pa HEAD dar lasten inte fanns. En isolering som inte gar till roten
  // mater skalet, inte effekten.
  const harHeap = await page.evaluate(() => {
    const g = window.__barnspel.game
    const heap = g?._bins?.[0]?._heap
    if (!heap || heap.destroyed) return false
    g._spar = []
    const behall = new Set(g._bins.map((b) => b._heap).filter(Boolean)) // alla tunnors last
    let nod = heap
    while (nod.parent) {
      for (const syskon of nod.parent.children) {
        if (syskon === nod || behall.has(syskon)) continue
        g._spar.push([syskon, syskon.visible])
        syskon.visible = false
      }
      behall.add(nod.parent)
      nod = nod.parent
    }
    return true
  })
  ok('2a. lastlagret finns att mata', harHeap, harHeap ? 'isolerat hela vagen till roten' : 'inget _heap — inget att mata')
  await page.waitForTimeout(260)
  const lastBild = harHeap ? await page.screenshot() : null
  await page.evaluate(() => {
    const g = window.__barnspel.game
    for (const [c, v] of g?._spar || []) if (!c.destroyed) c.visible = v
    if (g) g._spar = null
  })
  if (BILD && lastBild) fs.writeFileSync('.test-shots/_tunnprobe-last.png', lastBild)
  const px = lastBild ? malade(lastBild) : 0
  ok('2. lasten syns', px > 2500, `${px} malade pixlar i lastlagret (allt annat dolt till roten)`)

  // --- 4: tyngden — tom tunna mot full tunna --------------------------------------
  const tyngd = await page.evaluate(async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    const sov = (ms) => new Promise((r) => setTimeout(r, ms))
    // Spåra guppet: läs bin.y varje bildruta i 1,6 s efter ett släpp.
    // Sättningen ligger i det INRE lagret (bin.y måste stå still — det är släppmålet).
    const spåra = async (bin) => {
      const serie = []
      const t0 = performance.now()
      const f = () => { if (!bin.destroyed && bin._sag && !bin._sag.destroyed) serie.push([performance.now() - t0, bin._sag.y]) }
      ctx.ticker.add(f)
      await sov(1600)
      ctx.ticker.remove(f)
      const djup = Math.max(...serie.map((s) => s[1]))
      const vila = serie[serie.length - 1][1]
      // "står still": sista tiden då y avviker mer än 0,6 px från slutläget
      let lugn = 0
      for (const [t, y] of serie) if (Math.abs(y - vila) > 0.6) lugn = t
      return { djup: Math.round(djup * 10) / 10, vila: Math.round(vila * 10) / 10, lugn: Math.round(lugn) }
    }
    const attrapp = (cat) => ({ sorted: false, data: { category: cat, emoji: '🥫' }, container: null })
    const tom = g._bins[1] // orörd av matningen ovan
    g._onCorrect(ctx, attrapp(tom._cat), { view: tom })
    const tomM = await spåra(tom)
    const full = g._bins[0] // matad över taket ovan
    g._onCorrect(ctx, attrapp(full._cat), { view: full })
    const fullM = await spåra(full)
    return { tom: tomM, full: fullM }
  })

  console.log(`  tom tunna         : gupp ${n1(tyngd.tom.djup)} px · lugn efter ${tyngd.tom.lugn} ms · vilo-y +${n1(tyngd.tom.vila)}`)
  console.log(`  full tunna        : gupp ${n1(tyngd.full.djup)} px · lugn efter ${tyngd.full.lugn} ms · vilo-y +${n1(tyngd.full.vila)}`)
  ok('4. full tunna guppar djupare', tyngd.full.djup > tyngd.tom.djup + 4, `${n1(tyngd.tom.djup)} → ${n1(tyngd.full.djup)} px`)
  ok('4b. full tunna lugnar sig senare', tyngd.full.lugn > tyngd.tom.lugn + 100, `${tyngd.tom.lugn} → ${tyngd.full.lugn} ms`)
  ok('4c. full tunna står lägre', tyngd.full.vila > tyngd.tom.vila + 1.5, `+${n1(tyngd.tom.vila)} → +${n1(tyngd.full.vila)} px`)

  // --- 5: rundslutets rap (den andra halvan av §4-punkten) -------------------------
  // `_onRoundDone` är stubbad ovan, så rapen anropas direkt. Mäts på LOCKET: det ska
  // lätta tydligt och sedan ligga tillbaka på lastens vilo-höjd — inte hänga kvar uppe.
  const rap = await page.evaluate(async () => {
    const app = window.__barnspel
    const g = app.game
    const bin = g._bins[0]
    const vila = bin._lidBaseY
    const serie = []
    const f = () => { if (!bin.destroyed && bin._lid && !bin._lid.destroyed) serie.push(bin._lid.y) }
    app.ctx.ticker.add(f)
    g._burp(app.ctx, bin)
    await new Promise((r) => setTimeout(r, 900))
    app.ctx.ticker.remove(f)
    return { lyft: Math.round((vila - Math.min(...serie)) * 10) / 10, slut: Math.round((serie[serie.length - 1] - vila) * 10) / 10 }
  })
  ok('5. rundslutet rapar', rap.lyft > 18, `locket lättar ${n1(rap.lyft)} px`)
  ok('5b. locket landar rätt igen', Math.abs(rap.slut) < 1.5, `${n1(rap.slut)} px från lastens vilo-höjd`)

  // --- exit mitt i sättningen -----------------------------------------------------
  await page.evaluate(() => {
    const app = window.__barnspel
    const bin = app.game._bins[0]
    app.game._onCorrect(app.ctx, { sorted: false, data: { category: bin._cat, emoji: '🥫' }, container: null }, { view: bin })
  })
  await page.waitForTimeout(120) // mitt i lockpoppet och FÖRE klumpens 0,3 s
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('exit mitt i sättningen', errors.length === 0, errors.length ? errors.slice(0, 3).join(' | ') : 'inga konsolfel')

  console.log(`\n${fel === 0 ? '✅ ALLA GRÖNA' : `❌ ${fel} röda`}\n`)
  process.exitCode = fel ? 1 : 0
} finally {
  await browser.close()
}
