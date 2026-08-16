// GÖMBILDEN — `titt-ut-pappa`s alla gömställen med pappa AVSLÖJAD, en bild per möbel.
//
// Varför den finns: möblernas avslöjande-gest (lock som tippar, flik som viker ut, kudde som
// far av) rör sig ÖVER eller UNDER ansiktet beroende på vilket lager delen ligger i, och det
// syns inte i ett enda tal. Spelets vanliga skärmdump visar dessutom bara EN möbel per runda,
// och möbleringen lottas — sju av elva. Utan den här sonden är resten omätt i bild.
//
// ⚠️ Kör ENSAM, och kör den inte medan något skriver i repot: Vite skickar full-reload vid
//    varje filändring, och en omladdning mitt i sonden byter ut hela spelet.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const UT = '.test-shots/gom'
mkdirSync(UT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
let laddningar = 0
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
page.on('load', () => { laddningar += 1 })

const vanta = (ms) => page.waitForTimeout(ms)

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'titt-ut-pappa' }))
await vanta(2400)

// Alla möbelnycklar som finns i katalogen — inte bara de sju som råkade lottas in.
// Möbelkatalogen bor i `layout.js`, som är ren data och går att importera i sonden.
const { MOBLER } = await import('../src/games/titt-ut-pappa/layout.js')
const alla = Object.keys(MOBLER)
const rader = []

// Möbleringen lottas per omgång. Vi tar om rundan tills varje nyckel setts en gång, och
// tvingar pappa till just den plats nyckeln råkade hamna på.
const sedda = new Set()
for (let varv = 0; varv < 14 && sedda.size < alla.length; varv++) {
  const kvar = await page.evaluate((redanSedda) => {
    const g = window.__barnspel.game
    return g._platser.map((p) => p.key).filter((k) => !redanSedda.includes(k))
  }, [...sedda])

  for (const key of kvar) {
    const ok = await page.evaluate((k) => {
      const g = window.__barnspel.game
      const plats = g._platser.find((p) => p.key === k)
      if (!plats) return null
      // ⚠️ FRYS RUNDMASKINERIET. Varje avslöjande schemalägger nästa runda ~1,9 s senare,
      //    och den rundan får BYTA PLATS på möblerna (det är ju funktionen). Timern sköt in
      //    mellan nästa möbels `_nyRunda` och dess skärmdump: bilden visade en annan möbel
      //    på den plats sonden just mätt. Det såg ut som två buggar i spelet och var en
      //    kapplöpning i sonden. Originalen sparas en gång och läggs tillbaka här.
      g.__org = g.__org || { nyRunda: g._nyRunda, byt: g._bytPlatser, final: g._final }
      g._nyRunda = g.__org.nyRunda
      g._bytPlatser = g.__org.byt
      g._final = g.__org.final

      // Tvinga gömstället: `_valjGomma` lottar annars, och en lottning kan behöva tjugo
      // rundor för att nå den elfte möbeln.
      const gammal = g._valjGomma
      g._valjGomma = () => plats
      g._nyRunda(window.__barnspel.ctx)
      g._valjGomma = gammal
      // Kika räcker inte — kiket är en kort upp-och-ner och sonden hann missa fönstret i
      // hälften av bilderna. `_hittaPappa` är det FULLA avslöjandet: locket öppnas och han
      // reser sig till `_uppY` och blir kvar där. Det är det läget frågan gäller.
      g._hittaPappa(window.__barnspel.ctx, plats)
      // ⚠️ NOLLSTÄLL FYNDRÄKNAREN. Efter MAL fynd kör spelet sin final, och finalen
      //    MÖBLERAR OM rummet — då fotograferade sonden en annan möbel än den den trodde
      //    (leksakslådans bild visade fåtöljen). Symtomet såg ut som ett fel i spelet.
      g._fynd = 0
      g._busy = false
      // …och spärra dem tills nästa bild är tagen.
      g._nyRunda = () => {}
      g._bytPlatser = () => false
      g._final = () => {}
      return { x: Math.round(plats.ankare.x), y: Math.round(g._kantVarld(plats)), s: +plats.s.toFixed(2), slot: plats.slot.id }
    }, key)
    if (!ok) continue
    // 1,0 s: reslyftet tar 0,34 s och locket 0,36 s, men `_hittaPappa` schemalägger nästa
    // runda ~1,9 s senare — väntar sonden längre fotograferar den NÄSTA möbleringen.
    await vanta(1000)
    // Beskär runt möbeln: bred nog för hela silhuetten, hög nog för både gest och ansikte.
    const bredd = 460
    const hojd = 520
    const cx = Math.max(bredd / 2, Math.min(1280 - bredd / 2, ok.x))
    const cy = Math.max(hojd / 2, Math.min(720 - hojd / 2, ok.y - 90))
    await page.screenshot({
      path: join(UT, `${key}.png`),
      clip: { x: cx - bredd / 2, y: cy - hojd / 2, width: bredd, height: hojd },
    })
    // ⚠️ VÄNTA UT FÖRRA AVSLÖJANDETS EFTERSPEL. `_hittaPappa` schemalägger nästa runda
    //    ~1,9 s senare. Utan den här pausen sköt den timern in mellan nästa möbels
    //    `_nyRunda` och dess skärmdump, flyttade pappa någon annanstans och stängde
    //    locket — bilden blev en tom möbel, och det såg ut som att avslöjandet var trasigt.
    await vanta(1500)
    sedda.add(key)
    rader.push(`  ${key.padEnd(14)} plats ${ok.slot}  skala ${ok.s}  ankare (${ok.x}, ${ok.y})`)
  }

  // Ny omgång = ny möblering, så nästa varv kan innehålla möbler vi inte sett.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    g.__org = g.__org || { nyRunda: g._nyRunda, byt: g._bytPlatser, final: g._final }
    g._nyRunda = g.__org.nyRunda
    g._bytPlatser = g.__org.byt
    g._final = g.__org.final
    g._runda = 1
    // ⚠️ RIV FÖRST. `_byggPlatser` LÄGGER TILL platser, den ersätter dem inte — spelet
    //    kallar alltid `_rivPlatser()` före. Utan den raden staplade sonden möbel på möbel
    //    i samma slot, och bilderna visade en möbel som inte var den de påstod (en fåtölj
    //    med ett tvättkorgslock tvärsöver, en leksakslåda utan pappa). Det såg ut som två
    //    buggar i spelet och var en i sonden.
    g._rivPlatser()
    g._byggPlatser(window.__barnspel.ctx)
  })
  await vanta(900)
}

await browser.close()

console.log('')
for (const r of rader) console.log(r)
console.log(`\n  ${sedda.size}/${alla.length} möbler avbildade i ${UT}/`)
const missade = alla.filter((k) => !sedda.has(k))
if (missade.length) console.log(`  ⚠ aldrig inlottade: ${missade.join(', ')}`)
console.log(`  sidladdningar: ${laddningar} ${laddningar > 1 ? '⚠ OMLADDNING MITT I — bilderna kan visa olika möbleringar' : ''}`)
console.log(`  konsolfel: ${fel.length}`)
for (const f of fel.slice(0, 5)) console.log(`    ✗ ${f}`)
console.log('')
