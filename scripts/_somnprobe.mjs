// _somnprobe.mjs — `vakna-pappa`s TVÅ förhandsutpekade mätfrågor (docs/games/vakna-pappa.md §2).
//
// ⓵ VÄXER RIGGENS RINGBUFFERT? `_satLage()` anropar `liv(true, { takt })` vid VARJE lägesbyte,
//    och det var exakt så `mata-munnen` läckte: `liv()` dödar sitt gamla eviga andetag och
//    registrerar ett nytt, den döda posten smet förbi filtret, och while-loopen hoppar över
//    allt med `repeat: -1` — alltså kunde den aldrig vräkas heller. Vid ~20 tuggor började
//    ringbufferten döda LEVANDE tweens i stället, och en hel grimaslapp frös synlig medan en
//    annan min var aktiv: två ansikten på en gång, permanent, med NOLL konsolfel.
//    Det här spelet byter läge långt oftare än `mata-munnen` tuggar.
//
// ⓶ LÄSER ETT ÖGA I TAGET? `blunda({ v: true, h: false })` är ny i `lib/ansikte.js` och
//    finns ingen annanstans i appen. Ett ansikte går inte att bedöma i tal — sonden skriver
//    därför en bild per vakenläge.
//
// ⚠️ KONTROLLARMEN FÖRST. Räknaren för döda tweens är värdelös om den inte KAN röra sig:
//    sonden dödar därför medvetet ett par spårade tweens och kräver att talet stiger, innan
//    den tror på ett lågt tal från spelet självt. (Samma lärdom som `_frysprobe`: en mätning
//    som inte kan skilja två kända lägen åt säger ingenting om det okända.)
//
// ⚠️ gsap och Pixi hämtas ur SIDANS egna modulinstanser (resource-listan) — en nyimport har
//    en egen global tidslinje och rapporterar 0 oavsett vad som pågår.
//
// ⓷ GÅR SPELET ATT KLARA I ETT BARNS TAKT? `PAUS = 3` s efter ett framsteg, sedan ett läge
//    NER var `ATER = 9` s. Koden påstod att "kittla ensam tar honom hela vägen" — ett
//    RESONERAT påstående, och aritmetiken bakom det har ett gungbrädeläge: ger ett tryck +1
//    och tystnaden −1 var tolfte sekund blir nettoframsteget noll vid exakt den takten.
//    Var gränsen FAKTISKT går är en mätfråga (CLAUDE.md: mät, resonera inte).
//
//    ⚠️ MÄTNINGEN DRIVER SPELETS EGNA `_update` OCH `_verkan` med syntetisk tid — den räknar
//       ALDRIG om reglerna i sonden. En sond som simulerar sin egen kopia av `EFFEKT`/`PAUS`/
//       `ATER` hade mätt min modell av spelet, inte spelet, och hade fortsatt vara grön den
//       dag någon ändrade en konstant i `index.js`.
//
//   node scripts/_somnprobe.mjs [--byten 40] [--takt]
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? +args[i + 1] : d }
const BYTEN = opt('--byten', 40)
const TAKT = args.includes('--takt')
const ID = 'vakna-pappa'
const url = process.env.URL || 'http://localhost:5173'
const UT = '.test-shots/somn'

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
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(2400)

  const las = () => page.evaluate(async (id) => {
    const g = (await import('/src/games/registry.js')).getGame(id)
    const a = g?._ans
    if (!a) return null
    // Spökmin: en lapp som är `visible` utan att vara den aktiva. Det ÄR ägarens
    // "fastnade mellan 2 lägen", och den syns bara som ett tillstånd.
    const spoken = []
    for (const [namn, s] of Object.entries(a._miner)) {
      if (s.visible && s !== a._aktivMin) spoken.push(`${namn}@${s.alpha.toFixed(2)}`)
    }
    return {
      tw: a._tw.length,
      doda: a._tw.filter((t) => !t.parent).length,
      // ALLA eviga, inte bara de levande — läckan BESTÅR av döda eviga tweens, och ett
      // första försök som bara räknade de levande stod på 1 i båda armarna.
      eviga: a._tw.filter((t) => (t.repeat?.() ?? 0) === -1).length,
      levandeEviga: a._tw.filter((t) => t.parent && (t.repeat?.() ?? 0) === -1).length,
      spoken,
      blinkLever: !!a._blinkTimer?.parent,
      niva: g._niva?.() ?? null,
      vaken: g._vaken,
    }
  }, ID)

  const satLage = (n) => page.evaluate(async ([id, niva]) => {
    const g = (await import('/src/games/registry.js')).getGame(id)
    g._busy = false
    g._vaken = niva - 1
    // SPELETS EGEN ctx, inte en hopsnickrad — `_satLage` talar (`_sagPappa`/`_sag`), och en
    // falsk ctx hade kastat på `ctx.services` och gjort varje lägesbyte till en tyst miss.
    g._satLage(window.__barnspel.ctx, niva)
  }, [ID, n]).catch(() => {})

  // ---------- ⓷ TAKTEN: når ett barn målet? ----------
  if (TAKT) {
    // Kör spelets EGNA `_update`/`_verkan` med syntetisk tid: 0,25 s per steg, ett
    // kittla-tryck var `intervall` sekund, tills han vaknar eller 240 s simulerats.
    const kor = (intervall) => page.evaluate(async ([id, iv]) => {
      const g = (await import('/src/games/registry.js')).getGame(id)
      const ctx = window.__barnspel.ctx
      g._busy = false
      g._vaken = 0
      g._pausT = 0
      g._aterT = 0
      g._filtPa = false
      g._filtAnvand = false
      g._gardinUppe = false
      g._satLage(ctx, 1, { tyst: true })
      // ⚠️ STEGET MÅSTE VARA ≤ SPELETS EGEN KLÄMMA. `_update` gör
      //    `dt = Math.min(0.05, dtMS / 1000)` (skyddet mot en tappad bildruta), så ett
      //    sondsteg på 0,25 s gav spelet bara 0,05 s: klockan i sonden gick FEM GÅNGER
      //    fortare än klockan i spelet, och 60 s mellan tryck mättes som 12. Kontrollarmen
      //    ("60 s ska aldrig klara det") föll direkt på det — den fångade sondens fel, inte
      //    spelets. Samma lärdom som fasta tidssteg för mjuka kroppar: mät i spelets takt,
      //    annars mäter du något annat än spelet.
      const STEG = 0.05
      const rec = { key: 'kittla', x: 640, y: 596 }
      let t = 0
      let nasta = 0
      let tryck = 0
      let topp = 0
      while (t < 600 && g._vaken < 4) {
        if (iv > 0 && t >= nasta) {
          g._verkan(ctx, rec)   // spelets egen verkan, inte en kopia av EFFEKT
          tryck++
          nasta += iv
        }
        g._update(ctx, STEG * 1000)   // spelets egen loop, inte en kopia av PAUS/ATER
        if (g._vaken > topp) topp = g._vaken
        t += STEG
      }
      const klar = g._vaken >= 4
      g._busy = true // stoppa finalen från att rulla vidare i bakgrunden
      return { klar, sek: Math.round(t), tryck, topp: +topp.toFixed(2) }
    }, [ID, intervall])

    console.log('\n  TAKT (bara kittla, +1 per tryck — den långsammaste vägen)\n')
    console.log('  intervall   klarar?   tid       tryck   högsta läge')
    const rader = []
    // `iv: 0` = INGA tryck alls. Det är sondens kända negativa fall.
    for (const iv of [0, 2, 5, 8, 10, 12, 15, 20, 30, 60]) {
      const r = await kor(iv)
      rader.push({ iv, ...r })
      const namn = iv === 0 ? 'inga  ' : `${String(iv).padStart(5)} s`
      console.log(`  ${namn} ${r.klar ? '     JA ' : '     nej'} ${String(r.sek).padStart(8)} s ${String(r.tryck).padStart(7)} ${String(r.topp).padStart(12)}`)
    }
    console.log('')
    // KONTROLLARMAR: två KÄNDA lägen. Kan mätningen inte skilja dem åt mäter den ingenting.
    //
    // ⚠️ DET KÄNDA NEGATIVA ÄR "INGA TRYCK", INTE "60 S MELLAN TRYCK". Sonden hade först
    //    raden "60 s ska ALDRIG klara det" — och den var rätt mot den GAMLA koden, där
    //    återinsomnandet kunde äta upp ett helt tryck och skapa en permanent gungbräda. Det
    //    var buggen, inte designen. När taket infördes (`_hoj`: högst ett läge per tryck,
    //    varannan gång) blev raden ett krav på att felet skulle vara kvar. Ett kontrollfall
    //    måste vara något som är negativt AV DEFINITION: trycker man aldrig händer inget.
    const snabb = rader.find((r) => r.iv === 2)
    const inga = rader.find((r) => r.iv === 0)
    rad(snabb?.klar, `kontrollarm: 2 s mellan tryck MÅSTE klara det (${snabb?.sek} s, ${snabb?.tryck} tryck)`)
    rad(inga && !inga.klar, `kontrollarm: utan ett enda tryck ska han ALDRIG vakna (högsta läge ${inga?.topp})`)

    // Det som faktiskt ska bevisas: ingen takt får STÅ STILL (P0 MOTGÅNG — hinder saktar
    // ner, de stoppar aldrig). Med det svagaste verktyget ensamt.
    const stall = rader.filter((r) => r.iv > 0 && !r.klar)
    rad(stall.length === 0,
      stall.length === 0
        ? 'ingen trycktakt står still — även 60 s mellan tryck når målet med det svagaste verktyget'
        : `STÅR STILL vid ${stall.map((r) => `${r.iv} s (högsta ${r.topp})`).join(', ')}`)
    const barn = rader.find((r) => r.iv === 8)
    rad(barn?.klar, `ett barn som trycker var 8:e sekund når målet (${barn?.sek} s, ${barn?.tryck} tryck)`)
    rad(errors.length === 0, `0 konsolfel under taktmätningen (${errors.length})`)
    for (const e of errors.slice(0, 6)) console.log(`      ${e}`)
    console.log(`\n  ${fel === 0 ? '✓ allt grönt' : `✗ ${fel} röda rader`}\n`)
    await browser.close()
    process.exit(fel ? 1 : 0)
  }

  // ---------- KONTROLLARM: kan räknaren för döda tweens ens röra sig? ----------
  const fore = await las()
  rad(!!fore, 'ansiktsriggen hittad')
  if (!fore) throw new Error('ingen rigg')
  const efterMord = await page.evaluate(async (id) => {
    const g = (await import('/src/games/registry.js')).getGame(id)
    const a = g._ans
    // Döda tre spårade tweens med flit. Talet MÅSTE stiga — annars mäter sonden ingenting.
    let n = 0
    for (const t of a._tw) { if (n >= 3) break; if (t.parent) { t.kill(); n++ } }
    return { doda: a._tw.filter((t) => !t.parent).length, dodade: n }
  }, ID)
  rad(efterMord.doda >= fore.doda + efterMord.dodade,
    `kontrollarm: döda-räknaren rör sig (${fore.doda} → ${efterMord.doda} efter ${efterMord.dodade} medvetet dödade)`)

  // ---------- MÄTARM: N lägesbyten, alltså N anrop till liv() ----------
  console.log('')
  mkdirSync(UT, { recursive: true })
  for (let i = 0; i < BYTEN; i++) {
    await satLage((i % 5) + 1)
    await page.waitForTimeout(60)
  }
  const efter = await las()
  console.log(`  efter ${BYTEN} lägesbyten: _tw ${efter.tw} · döda ${efter.doda} · eviga ${efter.eviga} (levande ${efter.levandeEviga})`)
  console.log('')

  rad(efter.tw <= 24, `ringbufferten håller sitt tak (_tw = ${efter.tw}, taket 24)`)
  rad(efter.eviga <= 2, `inga döda EVIGA tweens staplas (eviga = ${efter.eviga}, förväntat 1 andetag)`)
  rad(efter.levandeEviga >= 1, `andetaget lever fortfarande (levande eviga = ${efter.levandeEviga})`)
  rad(efter.spoken.length === 0, `ingen spökmin (${efter.spoken.join(', ') || 'ingen'})`)
  rad(efter.blinkLever, 'blinkslingan lever fortfarande (ett ansikte som slutat blinka läser som en stillbild)')

  // ---------- BILD: ett läge per ruta, för ETT ÖGA I TAGET ----------
  console.log('')
  for (let n = 1; n <= 5; n++) {
    await satLage(n)
    await page.waitForTimeout(700)
    writeFileSync(`${UT}/lage-${n}.png`, await page.screenshot())
  }
  rad(true, `fem lägesbilder skrivna till ${UT}/lage-1..5.png — titta på lage-3 (ett öga)`)

  // ---------- EXIT MITT I ETT LÄGESBYTE ----------
  await satLage(4)
  await page.waitForTimeout(80)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)
  rad(errors.length === 0, `0 konsolfel, inklusive exit mitt i ett lägesbyte (${errors.length})`)
  for (const e of errors.slice(0, 6)) console.log(`      ${e}`)
} finally {
  await browser.close()
}
console.log(`\n  ${fel === 0 ? '✓ allt grönt' : `✗ ${fel} röda rader`}\n`)
process.exit(fel ? 1 : 0)
