// _frysprobe.mjs — FASTNAR ANSIKTET? (ägarrapport v1.204.0: "ansiktet fastnade mellan 2 lägen")
//
// Sonden matar pappa många gånger i rad och läser riggens EGET tillstånd mellan tuggorna.
// Tre fenomen mäts, inte mekanismen som orsakar dem:
//
//   SPÖKMIN   en min-lapp med `visible: true` som INTE är `_aktivMin` → två ansikten på en
//             gång, permanent. Det är exakt det ägaren beskrev.
//   BLINK     når ögonlockets alfa 1 under en vila sent i omgången? Ett fotoansikte som
//             slutat blinka läser som en stillbild.
//   DÖDA      hur många poster i `_tw` är döda (`!parent`)? Roten var en läcka: `liv()`
//             dödar sitt gamla andetag men den posten rensades aldrig, och vid ~24 tuggor
//             började ringbufferten döda LEVANDE tweens i stället.
//
// ⚠️ KONTROLLARMEN ÄR HEAD. Talen nedan säger ingenting utan den — kör
//   `git stash push src/lib/ansikte.js && node scripts/_frysprobe.mjs && git stash pop`
// och se att sonden faktiskt FÅNGAR det trasiga läget. En mätning som inte kan skilja två
// kända lägen åt säger inget om det okända.
//
//   node scripts/_frysprobe.mjs [--tuggor 30]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? +args[i + 1] : d }
const TUGGOR = opt('--tuggor', 30)
const ID = 'mata-munnen'
const url = process.env.URL || 'http://localhost:5173'

let fel = 0
const rad = (ok, text) => { if (!ok) fel++; console.log(`  ${ok ? '✓' : '✗'} ${text}`) }
const errors = []

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
  await page.waitForTimeout(1800)

  // Riggens tillstånd, läst direkt ur objektet. Ingen bild behövs: spökminen är ett
  // TILLSTÅND (`visible` utan att vara aktiv), och det syns inte säkrare i pixlar.
  const las = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const a = g._ans
    if (!a) return null
    const spoken = []
    for (const [namn, s] of Object.entries(a._miner)) {
      if (s.visible && s !== a._aktivMin) spoken.push(`${namn}@${s.alpha.toFixed(2)}`)
    }
    const doda = a._tw.filter((t) => !t.parent).length
    return {
      spoken, doda, tw: a._tw.length,
      // ⚠️ ALLA `repeat: -1`, inte bara de levande — och det är hela poängen. Läckan BESTÅR
      // av DÖDA eviga tweens: `liv()` dödar sitt gamla andetag, den posten smiter förbi
      // filtret, och while-loopen hoppar över allt med `repeat: -1`. Ett första försök
      // räknade bara de LEVANDE och var därmed blint för precis det felet — talet stod på 1
      // i BÅDA armarna, eftersom bara ett andetag åt gången någonsin är levande. Det som
      // växer är de döda.
      eviga: a._tw.filter((t) => (t.repeat?.() ?? 0) === -1).length,
      levande: a._tw.filter((t) => t.parent).length,
      // Kontrollarm till hela sonden: matar dragen honom över huvud taget? Harnessens
      // auto-drag har missat varje spelobjekt i det här spelet förut (`drag/ratt` = 0).
      atna: g._atna ?? -1,
      aktiv: a._aktivMin ? Object.keys(a._miner).find((n) => a._miner[n] === a._aktivMin) : null,
      ogonAlfa: a._ogon.alpha,
      blinkLever: !!a._blinkTimer?.parent,
    }
  })

  // Ett tugg: dra en matbit från brädan till munnen. Samma väg som ett barn gör, och den
  // väg som får `_ata` att anropa `liv()` — vilket är där läckan satt.
  const geo = await page.evaluate(async () => {
    const k = await import('/src/games/mata-munnen/kok.js')
    return { platser: k.PLATSER, ans: k.ANS }
  })
  const dra = async (fran, till) => {
    await page.mouse.move(fran[0], fran[1])
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(fran[0] + (till[0] - fran[0]) * i / 8, fran[1] + (till[1] - fran[1]) * i / 8)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
  }

  const start = await las()
  if (!start) { console.log('\n  ✗ riggen laddades inte\n'); process.exit(1) }
  console.log(`\n  FASTNAR ANSIKTET? — ${TUGGOR} tuggor\n`)
  console.log(`  start: tw ${start.tw} · döda ${start.doda} · eviga ${start.eviga}\n`)

  let forstaSpoke = 0
  let maxLevande = 0
  let maxEviga = 0
  let matade = 0
  let forraAtna = start.atna
  const MUN = [geo.ans.x, geo.ans.y + 80]
  for (let i = 1; i <= TUGGOR; i++) {
    await dra(geo.platser[i % geo.platser.length], MUN)
    await page.waitForTimeout(900)
    const s = await las()
    if (!s) break
    maxLevande = Math.max(maxLevande, s.levande)
    maxEviga = Math.max(maxEviga, s.eviga)
    // `_atna` nollställs när tallriken är klar, så tuggorna räknas som ÖKNINGAR, inte som
    // slutvärdet — annars läser en fulläten tallrik som "noll matade".
    if (s.atna > forraAtna) matade += s.atna - forraAtna
    forraAtna = s.atna
    if (s.spoken.length && !forstaSpoke) forstaSpoke = i
    if (i % 6 === 0 || s.spoken.length) {
      console.log(`   tugga ${String(i).padStart(2)}: tw ${String(s.tw).padStart(2)} · levande ${String(s.levande).padStart(2)} · EVIGA ${String(s.eviga).padStart(2)} · ätna ${String(s.atna).padStart(2)} · aktiv ${String(s.aktiv).padEnd(10)}${s.spoken.length ? ` ⚠ SPÖKMIN ${s.spoken.join(' ')}` : ''}`)
    }
  }

  // Blinkningen mäts SENT, efter all belastning — det är där den föll bort.
  let sagBlink = false
  for (let i = 0; i < 90; i++) {
    const s = await las()
    if (s && s.ogonAlfa > 0.9) { sagBlink = true; break }
    await page.waitForTimeout(100)
  }
  const slut = await las()

  console.log('')
  rad(!forstaSpoke, `ingen SPÖKMIN under ${TUGGOR} tuggor${forstaSpoke ? ` (första vid tugga ${forstaSpoke})` : ''}`)
  // KONTROLLARM FÖRST: ett grönt resultat betyder ingenting om dragen aldrig matade honom.
  rad(matade >= TUGGOR * 0.4, `KONTROLL dragen MATAR honom (${matade} tuggor landade av ${TUGGOR})`)
  // Läckan: eviga tweens (döda som levande) som aldrig rensas. Uppmätt på den trasiga koden
  // växte talet 1 → 27 över 26 tuggor, exakt +1 per tugga.
  rad(maxEviga <= 6, `eviga tweens läcker inte (högst ${maxEviga}; en per tugga = läckan)`)
  // Och att listan aldrig fylls av LEVANDE tweens — det är först då ringbufferten tvingas
  // döda något som fortfarande används. Döda poster får ligga kvar tills nästa rensning;
  // de är inte ett fel och ska inte mätas som ett.
  rad(maxLevande < 20, `_tw fylls inte av levande tweens (högst ${maxLevande} av 24)`)
  rad(sagBlink, `pappa BLINKAR fortfarande efter ${TUGGOR} tuggor (ögonlockets alfa nådde 1)`)
  rad(!!slut?.blinkLever, 'blinkslingans timer lever vid slutet')
  rad(errors.length === 0, `0 konsolfel${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)

  console.log(`\n  ${fel ? `✗ ${fel} fel` : '✓ ALLT GRÖNT'}\n`)
} finally {
  await browser.close()
}
process.exit(fel ? 1 : 0)
