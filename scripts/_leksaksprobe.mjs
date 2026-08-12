// `vart-tog-det-vagen`: gör varje leksak SITT eget nummer när den hittas?
//
// Reaktionstabellen byggdes 2026-07-02 mot en `Text` (`switch (p.text)`). När leksaken
// blev en RITAD ikon i en Container 2026-08-06 (P0 ASSETS) blev `p.text` `undefined` och
// hela tabellen föll till `default` — tyst, utan konsolfel, med grönt test i sex veckor.
// Sonden mäter RÖRELSENS SIGNATUR per leksak, inte att en gren "finns":
//
//   dy    hur långt leksaken rör sig i höjdled  (grodan hoppar, ballongen stiger)
//   dx    i sidled                              (bilen kör iväg)
//   drot  rotation i radianer                   (stjärnan snurrar, katten vinglar)
//   dsk   skala                                 (frukten kläms)
//
// Två saker gör mätningen ärlig:
//   * WIRING mäts i en RIKTIG runda (koppen trycks på i spelet), inte genom att anropa
//     metoden — annars bevisas bara att tabellen finns, inte att den kopplas in.
//   * TABELLEN mäts sedan per nyckel, och kravet är att signaturerna SKILJER SIG.
//     "Alla tio gör något" är grönt även på HEAD, där alla tio gör exakt samma pop.
//
//   node scripts/_leksaksprobe.mjs
import { chromium } from 'playwright'

const ID = 'vart-tog-det-vagen'
const NYCKLAR = ['🐥', '⭐', '🍓', '🐸', '🚗', '🎈', '🐱', '🌟', '🦋', '🍎']
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1500)

  // --- 1. WIRING: spela en riktig runda och tryck på RÄTT kopp. --------------
  // Vänta ut blandningen tills spelet självt säger 'guess'.
  await page.waitForFunction(() => window.__barnspel.game?._phase === 'guess', null, { timeout: 20000 })
  const wiring = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const spar = []
    const orig = g._reactPrize.bind(g)
    g._reactPrize = function (c) { spar.push(g._prizeKey ?? null); return orig(c) }
    const p = g._prize
    const f0 = { x: p.x, y: p.y, rot: p.rotation, sk: p.scale.x }
    g._prizeCup.emit('pointertap', { global: { x: 0, y: 0 } })
    const prov = []
    const t0 = performance.now()
    while (performance.now() - t0 < 1500) {
      prov.push({ x: p.x, y: p.y, rot: p.rotation, sk: p.scale.x })
      await new Promise((r) => requestAnimationFrame(r))
    }
    g._reactPrize = orig
    const mx = (f) => Math.max(...prov.map((q) => Math.abs(q[f] - f0[f])))
    return { kort: spar, dy: +mx('y').toFixed(1), dx: +mx('x').toFixed(1), drot: +mx('rot').toFixed(3), dsk: +mx('sk').toFixed(2) }
  })

  const nyckel = wiring.kort[0]
  ok('1 reaktionen kopplas in', wiring.kort.length === 1 && nyckel != null && nyckel !== undefined,
    `_reactPrize kord ${wiring.kort.length} gang, nyckel = ${nyckel === null ? 'NULL (tabellen ar dod)' : nyckel}`)

  // --- 2. TABELLEN: en signatur per leksak. ----------------------------------
  // FRYS FÖRLOPPET FÖRST. Spelet spelar vidare av sig självt: `_finishRound` startar
  // en ny runda 1,3 s efter fyndet och flyttar då leksaken till en NY kopp-plats.
  // Utan frysning mätte sonden den förflyttningen och rapporterade `dx 240 px` på
  // kycklingen — ett tal som inte hade med reaktionen att göra alls.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    g._timers?.forEach((t) => t.kill())
    g._timers = []
    g._shuffleTl?.kill()
    g._newRound = () => {}
    g._finishRound = () => {}
    g._phase = 'fryst'
  })

  const sig = {}
  for (const k of NYCKLAR) {
    sig[k] = await page.evaluate(async (key) => {
      const g = window.__barnspel.game
      const p = g._prize
      // Nollställ till ett känt viloläge utan att gå via en ny runda (som skulle
      // slumpa om nyckeln). Tweens dödas av spelets egen _reactPrize.
      p.x = 640; p.y = 470; p.rotation = 0; p.scale.set(1)
      g._prizeKey = key
      const f0 = { x: p.x, y: p.y, rot: p.rotation, sk: p.scale.x }
      g._reactPrize(window.__barnspel.ctx)
      const prov = []
      const t0 = performance.now()
      while (performance.now() - t0 < 1100) {
        prov.push({ x: p.x, y: p.y, rot: p.rotation, sk: p.scale.x })
        await new Promise((r) => requestAnimationFrame(r))
      }
      const mx = (f) => Math.max(...prov.map((q) => Math.abs(q[f] - f0[f])))
      return { dy: +mx('y').toFixed(1), dx: +mx('x').toFixed(1), drot: +mx('rot').toFixed(3), dsk: +mx('sk').toFixed(2) }
    }, k)
    await page.waitForTimeout(120)
  }

  const fingeravtryck = (s) => [s.dy > 25 ? 'Y' : '', s.dx > 25 ? 'X' : '', s.drot > 1.0 ? 'SNURR' : (s.drot > 0.02 ? 'vingel' : ''), s.dsk > 0.25 ? 'KLAM' : ''].filter(Boolean).join('+') || 'bara puls'
  const avtryck = NYCKLAR.map((k) => fingeravtryck(sig[k]))
  const unika = new Set(avtryck)
  ok('2 leksakerna gor OLIKA saker', unika.size >= 4,
    `${unika.size} olika signaturer av ${NYCKLAR.length} leksaker: ${[...unika].join(' · ')}`)

  const generiska = avtryck.filter((a) => a === 'bara puls').length
  ok('3 ingen faller till default', generiska === 0, `${generiska} av ${NYCKLAR.length} gor bara en generisk puls`)

  ok('4 grodan hoppar', sig['🐸'].dy > 60, `dy ${sig['🐸'].dy} px`)
  ok('5 bilen kor ivag', sig['🚗'].dx > 60, `dx ${sig['🚗'].dx} px`)
  ok('6 ballongen stiger', sig['🎈'].dy > 40 && sig['🎈'].dx < 5, `dy ${sig['🎈'].dy} px, dx ${sig['🎈'].dx} px`)
  ok('7 stjarnan snurrar ett varv', sig['⭐'].drot > 6.0 && sig['🌟'].drot > 6.0,
    `⭐ ${sig['⭐'].drot} rad, 🌟 ${sig['🌟'].drot} rad`)
  ok('8 frukten klams utan att flytta sig', sig['🍎'].dsk > 0.25 && sig['🍎'].dy < 5,
    `skala +${sig['🍎'].dsk}, dy ${sig['🍎'].dy} px`)
  ok('9 djuren vinglar', sig['🐥'].drot > 0.02 && sig['🐱'].drot > 0.02 && sig['🦋'].drot > 0.02,
    `🐥 ${sig['🐥'].drot} · 🐱 ${sig['🐱'].drot} · 🦋 ${sig['🦋'].drot} rad`)

  // --- 3. exit mitt i en reaktion -------------------------------------------
  await page.evaluate(() => {
    const g = window.__barnspel.game
    g._prizeKey = '🚗'
    g._reactPrize(window.__barnspel.ctx)
  })
  await page.waitForTimeout(120) // lämna MITT i bilens 0,68 s långa resa
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('10 inga konsolfel (aven vid exit mitt i)', errors.length === 0,
    `${errors.length} fel${errors[0] ? ': ' + errors[0] : ''}`)

  console.log(`\n  ${ID} — leksakens egen reaktion\n`)
  for (const k of NYCKLAR) {
    const s = sig[k]
    console.log(`      ${k}  dy ${String(s.dy).padStart(5)}  dx ${String(s.dx).padStart(5)}  rot ${String(s.drot).padStart(6)}  skala ${s.dsk}   ${fingeravtryck(s)}`)
  }
  console.log('')
  for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn.padEnd(36)} ${r.text}`)
  const gronaN = rader.filter((r) => r.ok).length
  console.log(`\n  ${gronaN}/${rader.length}\n`)
  process.exitCode = gronaN === rader.length ? 0 : 1
} finally {
  await browser.close()
}
