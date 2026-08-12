// `tarta-i-ansiktet`: rinner grädden — och gör den det UTAN att fly undan svampen?
//
// §4 [Quick]: "Grädden droppar sakta nedför ansiktet över tid → levande kladd istället
// för frysta klumpar." Kontrollerad mot koden 2026-08-12: genuint obyggd (noll träffar på
// `dropp|rinn|drip|glid`).
//
// Fyra krav, och de tre sista är precis de som gör effekten SPELBAR i stället för bara snygg:
//   1. Klumparna rör sig nedåt över tid, och en STOR klump rinner längre än en liten.
//   2. Det finns ett TAK. Grädde som rinner obehindrat blir ett mål som flyr undan
//      svampen — barnet skulle jaga kladdet i stället för att torka det.
//   3. Ingen klump rinner ut ur ansiktet (under hakan).
//   4. Torkningen läser klumpens LEVANDE läge — en svamp som prövar mot startpositionen
//      hade slutat träffa så fort grädden runnit.
//
//   node scripts/_dropprobe.mjs
import { chromium } from 'playwright'

const ID = 'tarta-i-ansiktet'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })
  await page.waitForTimeout(1200)

  // --- 1–3. Lägg grädde och följ den i 8 s -----------------------------------
  const lopp = await page.evaluate(async () => {
    const g = window.__barnspel.game
    g._addCream()
    g._addCream()
    const lager = g._splatLayer
    const blobbar = [...lager.children]
    const start = blobbar.map((b) => ({ r: b._r, y0: b.y, tak: b._dripMax }))
    // Vänta ut `bounceIn` innan mätningen — den skalar, men vi läser y, så det är
    // ofarligt; pausen finns för att rinnandet ska hinna bli mätbart.
    await new Promise((r) => setTimeout(r, 8000))
    const slut = blobbar.map((b) => (b.destroyed ? null : b.y))
    const spar = blobbar.map((b) => (b.destroyed || !b._spar ? 0 : b._spar.getLocalBounds().height))
    return { start, slut, spar, hakaKrav: 105 }
  })

  const flyttar = lopp.start.map((s, i) => (lopp.slut[i] == null ? null : lopp.slut[i] - s.y0)).filter((v) => v != null)
  ok('1 gradden rinner', flyttar.length > 0 && Math.min(...flyttar) > 3,
    `${flyttar.length} klumpar, minst ${Math.min(...flyttar).toFixed(1)} px, mest ${Math.max(...flyttar).toFixed(1)} px`)

  // Stor klump ska rinna längre än liten: jämför de tre största mot de tre minsta.
  const par = lopp.start.map((s, i) => ({ r: s.r, d: lopp.slut[i] == null ? null : lopp.slut[i] - s.y0, tak: s.tak }))
    .filter((p) => p.d != null).sort((a, b) => a.r - b.r)
  const sma = par.slice(0, 3)
  const stora = par.slice(-3)
  const medel = (a) => a.reduce((s, p) => s + p.d, 0) / (a.length || 1)
  ok('2 storleken syns i hur langt den rinner', medel(stora) > medel(sma),
    `sma (r ${sma.map((p) => p.r.toFixed(0)).join('/')}) ${medel(sma).toFixed(1)} px mot stora (r ${stora.map((p) => p.r.toFixed(0)).join('/')}) ${medel(stora).toFixed(1)} px`)

  // Ett tak som inte FINNS (HEAD har inget `_dripMax` → NaN) får inte läsa som godkänt:
  // `d > NaN` är alltid falskt, och raden hade blivit grön på ett spel utan mekanik alls.
  const utanTak = par.filter((p) => !Number.isFinite(p.tak)).length
  const overTak = par.filter((p) => p.d > p.tak + 0.6).length
  ok('3 taket haller — inget flyende mal', utanTak === 0 && overTak === 0,
    utanTak
      ? `${utanTak} av ${par.length} klumpar har INGET tak (NaN) — kan inte utvarderas, raknas som 0`
      : `${overTak} av ${par.length} klumpar rann forbi sitt eget tak (tak ${Math.min(...par.map((p) => p.tak)).toFixed(0)}–${Math.max(...par.map((p) => p.tak)).toFixed(0)} px)`)

  const lagst = Math.max(...lopp.slut.filter((v) => v != null))
  ok('4 ingen rinner ut ur ansiktet', lagst <= lopp.hakaKrav + 0.6,
    `lagsta klump y = ${lagst.toFixed(1)} (hakan ${lopp.hakaKrav})`)

  ok('5 strimman ar synlig', Math.max(...lopp.spar) > 8,
    `langsta strimma ${Math.max(...lopp.spar).toFixed(1)} px hog`)

  // Bilden tas HÄR, före torkningsprovet — annars fotar sonden ett ansikte som den
  // just skrubbat, och effekten den ska visa är delvis bortgnuggad.
  await page.screenshot({ path: '.test-shots/_dropp-tarta.png' })

  // --- 6. Svampen träffar den RUNNA klumpen, inte startläget ------------------
  const torka = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const lager = g._splatLayer
    const blob = lager.children.find((b) => b._dripY > 4)
    if (!blob) return { fel: 'ingen klump hade runnit an' }
    const fore = blob._clean || 0
    const s = g._sponge
    if (!s) return { fel: 'ingen svamp' }
    s.visible = true
    // Ansiktets rymd -> rotens rymd (clownen står i FACE_X/FACE_Y = 640/300).
    s.position.set(640 + blob.x, 300 + blob.y)
    for (let i = 0; i < 6; i++) {
      g._rub(ctx)
      await new Promise((r) => requestAnimationFrame(r))
    }
    return { fel: null, fore, efter: blob.destroyed ? 1 : (blob._clean || 0), dripY: blob.destroyed ? null : blob._dripY }
  })

  if (torka.fel) {
    ok('6 svampen laser klumpens LEVANDE lage', false, `${torka.fel} — RAKNAS SOM 0`)
  } else {
    ok('6 svampen laser klumpens LEVANDE lage', torka.efter > torka.fore,
      `_clean ${torka.fore.toFixed(2)} -> ${torka.efter.toFixed(2)} nar svampen halls dar klumpen ar NU`)
  }

  // --- 7. exit ---------------------------------------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('7 inga konsolfel', errors.length === 0, `${errors.length} fel${errors[0] ? ': ' + errors[0] : ''}`)

  console.log(`\n  ${ID} — grädden rinner\n`)
  for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn.padEnd(40)} ${r.text}`)
  const gronaN = rader.filter((r) => r.ok).length
  console.log(`\n  ${gronaN}/${rader.length}\n`)
  process.exitCode = gronaN === rader.length ? 0 : 1
} finally {
  await browser.close()
}
