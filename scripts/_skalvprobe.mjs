// `djurorkester`: sprider sig dånet till grannkorten — och gör det det FYSISKT?
//
// Punkten kom ur `_stillaprobe`: 24 av 33 noder "rörde sig", men största utslaget var
// **7,2 px** i tre svep i rad. Scenen stod i praktiken still — sex öar som inte visste om
// varandra. §4 [Quick]: "När ett djur sjunger, låt grannkorten skälva lätt i takt."
//
// "Något rör sig" räcker inte som krav — det hade en slumpvis vibration också klarat.
// Sonden mäter de fyra egenskaper som skiljer ett DÅN från ett darr:
//   1. Utslaget AVTAR med avståndet från den som sjunger.
//   2. En DJUP röst (ko, C4) skakar grannarna mer än en LJUS (anka, C5) — basen bär.
//   3. Det finns ett TAK: att trumma på alla sex korten får inte ge ett växande kaos.
//   4. Kortet självt står still — `hitArea` sitter där, och en träffyta får inte vandra.
// Plus: skälvet dör ut, och ingenting tickar efter exit.
//
//   node scripts/_skalvprobe.mjs
import { chromium } from 'playwright'

const ID = 'djurorkester'
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
  await page.waitForTimeout(1800) // låt inflygningen landa

  // Mät ETT sångtryck: utslag per grannkort + kortets egen rörelse.
  const matSang = (djurId) => page.evaluate(async (id) => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const kort = g._cards || []
    const kalla = kort.find((c) => c._djur.id === id)
    if (!kalla) return { fel: `hittade inget kort for ${id}` }
    // Nollställ innan mätningen — annars mäter vi förra tryckets svans.
    for (const c of kort) { c._skalvAmp = 0; if (c._inner) c._inner.x = 0 }
    await new Promise((r) => requestAnimationFrame(r))
    const prov = kort.map(() => ({ inner: [], kortX: [], kortY: [] }))
    g._sing(ctx, kalla)
    const t0 = performance.now()
    while (performance.now() - t0 < 1200) {
      kort.forEach((c, i) => {
        prov[i].inner.push(c._inner ? c._inner.x : 0)
        prov[i].kortX.push(c.x); prov[i].kortY.push(c.y)
      })
      await new Promise((r) => requestAnimationFrame(r))
    }
    const spann = (a) => Math.max(...a) - Math.min(...a)
    return {
      fel: null,
      kalla: kalla._djur.id,
      rader: kort.map((c, i) => ({
        id: c._djur.id,
        avstand: +Math.hypot(c.x - kalla.x, c.y - kalla.y).toFixed(0),
        utslag: +spann(prov[i].inner).toFixed(2),
        kortRorelse: +Math.max(spann(prov[i].kortX), spann(prov[i].kortY)).toFixed(2),
        arKalla: c === kalla,
      })),
    }
  }, djurId)

  const ko = await matSang('ko') // C4, 261,63 Hz — djupast
  const anka = await matSang('anka') // C5, 523,25 Hz — ljusast

  if (ko.fel || anka.fel) {
    console.log('  ✗ kunde inte hitta korten:', ko.fel || anka.fel)
    process.exitCode = 1
  } else {
    const grannar = ko.rader.filter((r) => !r.arKalla).sort((a, b) => a.avstand - b.avstand)
    const nara = grannar[0]
    const langst = grannar[grannar.length - 1]

    ok('1 grannarna skalver alls', grannar.every((r) => r.utslag > 0.5),
      `${grannar.filter((r) => r.utslag > 0.5).length} av ${grannar.length} grannar, ${grannar.map((r) => r.utslag.toFixed(1)).join('/')} px`)

    ok('2 utslaget avtar med avstandet', nara.utslag > langst.utslag * 1.25,
      `narmast (${nara.avstand} px) ${nara.utslag.toFixed(1)} px mot langst bort (${langst.avstand} px) ${langst.utslag.toFixed(1)} px`)

    const koMax = Math.max(...ko.rader.filter((r) => !r.arKalla).map((r) => r.utslag))
    const ankaMax = Math.max(...anka.rader.filter((r) => !r.arKalla).map((r) => r.utslag))
    ok('3 djup rost skakar mer an ljus', koMax > ankaMax * 1.3,
      `ko (C4) ${koMax.toFixed(1)} px mot anka (C5) ${ankaMax.toFixed(1)} px`)

    const kortRor = Math.max(...ko.rader.map((r) => r.arKalla ? 0 : r.kortRorelse))
    ok('4 grannkortens hitArea star still', kortRor < 0.01,
      `grannkortens egen rorelse ${kortRor.toFixed(2)} px (krav 0,00)`)

    // --- 5. Taket: trumma på alla sex korten och läs det största utslaget ------
    const kaos = await page.evaluate(async () => {
      const g = window.__barnspel.game
      const ctx = window.__barnspel.ctx
      const kort = g._cards || []
      for (const c of kort) { c._skalvAmp = 0; if (c._inner) c._inner.x = 0 }
      let topp = 0
      for (let varv = 0; varv < 3; varv++) {
        for (const c of kort) {
          g._sing(ctx, c)
          for (let f = 0; f < 3; f++) {
            await new Promise((r) => requestAnimationFrame(r))
            for (const k of kort) topp = Math.max(topp, Math.abs(k._inner ? k._inner.x : 0))
          }
        }
      }
      return { topp: +topp.toFixed(2), tak: 11 }
    })
    ok('5 taket haller vid trummande', kaos.topp <= kaos.tak + 0.6,
      `18 tryck i rad gav som mest ${kaos.topp.toFixed(1)} px (tak ${kaos.tak})`)

    // --- 6. Skälvet dör ut -----------------------------------------------------
    const dor = await page.evaluate(async () => {
      const g = window.__barnspel.game
      await new Promise((r) => setTimeout(r, 2000))
      return +Math.max(...(g._cards || []).map((c) => Math.abs(c._inner ? c._inner.x : 0))).toFixed(3)
    })
    ok('6 skalvet dor ut', dor < 0.06, `${dor.toFixed(3)} px kvar 2 s efter sista trycket`)

    console.log(`\n  ${ID} — dånet sprider sig\n`)
    console.log('      kort            avstand   utslag   kortets egen rorelse')
    for (const r of grannar) {
      console.log(`      ${r.id.padEnd(14)}${String(r.avstand).padStart(7)} px${String(r.utslag.toFixed(1)).padStart(8)} px${String(r.kortRorelse.toFixed(2)).padStart(12)} px`)
    }
    console.log('')
    for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn.padEnd(36)} ${r.text}`)
  }

  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('7 inga konsolfel', errors.length === 0, `${errors.length} fel${errors[0] ? ': ' + errors[0] : ''}`)
  console.log(`  ${rader[rader.length - 1].ok ? '✓' : '✗'} 7 inga konsolfel${''.padEnd(22)} ${rader[rader.length - 1].text}`)

  const gronaN = rader.filter((r) => r.ok).length
  console.log(`\n  ${gronaN}/${rader.length}\n`)
  process.exitCode = gronaN === rader.length ? 0 : 1
} finally {
  await browser.close()
}
