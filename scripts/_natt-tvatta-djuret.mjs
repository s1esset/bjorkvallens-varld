// Nattkörningen 2026-10-01: `tvatta-djuret` — tvättar djuret med RIKTIGA musdrag: tar svampen på
// dess plats och sveper ett fast sicksack-mönster över fläckarnas FAKTISKA ruta, sedan duschen
// (när den låsts upp) samma väg, om och om igen tills rundan är klar. Mäter svep och sekunder till
// dusch-upplåsning och till färdig, två rundor i rad. Kör mot HEAD och ändringen för att se att
// leran inte blev svårare att träffa. Exit mitt i gnuggandet sist.
//   node scripts/_natt-tvatta-djuret.mjs <etikett>
import { chromium } from 'playwright'

const ID = 'tvatta-djuret'
const TAG = process.argv[2] || 'arm'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text = '') => rader.push({ namn, ok: !!villkor, text })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
  await page.waitForTimeout(1500)
  // root-koordinater → css px
  const tillSkarm = (x, y) => page.evaluate(([x, y]) => {
    const g = window.__barnspel.game
    const p = g._root.toGlobal({ x, y })
    const cv = document.querySelector('canvas')
    const r = cv.getBoundingClientRect()
    const sc = r.width / (cv.width / (window.devicePixelRatio || 1))
    return { x: r.left + p.x * sc, y: r.top + p.y * sc }
  }, [x, y])
  const lage = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const fl = (g._flakes || []).filter((f) => !f._clean)
    const xs = fl.map((f) => f.x), ys = fl.map((f) => f.y)
    return {
      tot: g._totalMud, scr: g._scrubbed, rin: g._rinsed, dusch: !!g._showerReady, klar: !!g._resolving,
      klibb: (g._flakes || []).filter((f) => f.kind === 'klibb').length,
      box: fl.length ? { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) } : null,
      sp: { x: g._sponge.view.x, y: g._sponge.view.y }, du: { x: g._shower.view.x, y: g._shower.view.y },
    }
  })
  // Ett svep: grip verktyget, sicksacka över rutan i 55 px-rader, släpp.
  const svep = async (verktyg, box) => {
    const s = await lage()
    const hem = verktyg === 'sponge' ? s.sp : s.du
    const a = await tillSkarm(hem.x, hem.y)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    const b = box || { l: 450, r: 900, t: 250, b: 560 }
    let hoger = true
    for (let y = b.t - 10; y <= b.b + 10; y += 55) {
      const x0 = hoger ? b.l - 20 : b.r + 20, x1 = hoger ? b.r + 20 : b.l - 20
      for (let k = 0; k <= 12; k++) {
        const x = x0 + (x1 - x0) * (k / 12)
        // duschen sprutar under munstycket (34 px under verktyget)
        const p = await tillSkarm(x, verktyg === 'shower' ? y - 34 : y)
        await page.mouse.move(p.x, p.y)
        await page.waitForTimeout(16)
      }
      hoger = !hoger
    }
    await page.mouse.up()
    await page.waitForTimeout(150)
  }

  const runda = async (nr) => {
    const t0 = Date.now()
    let s = await lage()
    const tot = s.tot, klibb0 = s.klibb
    let svepTillDusch = null, tDusch = null, n = 0
    while (!s.klar && n < 30) {
      n++
      await svep(s.dusch ? (n % 2 ? 'shower' : 'sponge') : 'sponge', s.box)
      s = await lage()
      if (s.dusch && svepTillDusch == null) { svepTillDusch = n; tDusch = (Date.now() - t0) / 1000 }
    }
    const t = (Date.now() - t0) / 1000
    console.log(`   .. ${TAG} runda ${nr}: fläckar ${tot} (klibb ${klibb0}) · dusch efter ${svepTillDusch} svep/${tDusch?.toFixed(1)} s · klar efter ${n} svep/${t.toFixed(1)} s`)
    ok(`runda ${nr} klar`, s.klar, `scr ${s.scr}/${s.tot} rin ${s.rin}`)
    return { tot, svepTillDusch, n, t }
  }
  await runda(1)
  await page.screenshot({ path: `.test-shots/_natt-td-${TAG}-klar.png` })
  await page.waitForFunction(() => !window.__barnspel.game._resolving && window.__barnspel.game._totalMud > 0, null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
  await page.screenshot({ path: `.test-shots/_natt-td-${TAG}-r2start.png` })
  await runda(2)
  await page.waitForFunction(() => !window.__barnspel.game._resolving && window.__barnspel.game._totalMud > 0, null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
  // mitt i gnuggandet: bild på skum + smutsig svamp, sedan exit med fingret nere
  const s = await lage()
  const a = await tillSkarm(s.sp.x, s.sp.y)
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  for (let k = 0; k < 30; k++) { const p = await tillSkarm(560 + (k % 10) * 25, 380 + Math.floor(k / 10) * 40); await page.mouse.move(p.x, p.y); await page.waitForTimeout(16) }
  await page.screenshot({ path: `.test-shots/_natt-td-${TAG}-gnugg.png` })
  await page.mouse.up()
  await page.waitForTimeout(600)
  const smuts1 = await page.evaluate(() => window.__barnspel.game._smutsLvl)
  // duschen över djuret (inte svampen): svampen ska vara lika smutsig
  const du = await lage()
  const d0 = await tillSkarm(du.du.x, du.du.y); await page.mouse.move(d0.x, d0.y); await page.mouse.down()
  for (let k = 0; k < 20; k++) { const p = await tillSkarm(600 + k * 10, 360); await page.mouse.move(p.x, p.y); await page.waitForTimeout(16) }
  const smuts2 = await page.evaluate(() => window.__barnspel.game._smutsLvl)
  // sedan strålen över svampen
  for (let k = 0; k < 30; k++) { const p = await tillSkarm(600 - k * 15, 360 + k * 7); await page.mouse.move(p.x, p.y); await page.waitForTimeout(16) }
  const sv = await lage(); const p1 = await tillSkarm(sv.sp.x, sv.sp.y - 40); await page.mouse.move(p1.x, p1.y); await page.waitForTimeout(200)
  const smuts3 = await page.evaluate(() => window.__barnspel.game._smutsLvl)
  await page.mouse.up()
  console.log(`   .. ${TAG} svampsmuts: efter gnugg ${smuts1} · dusch över djuret ${smuts2} · dusch över svampen ${smuts3}`)
  if (TAG !== 'head') ok('svampen smutsig av gnugg, ren först av strålen', smuts1 > 0 && smuts2 === smuts1 && smuts3 === 0)
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.mouse.up()
  await page.waitForTimeout(2500)
  ok('0 konsolfel', errors.length === 0, errors.slice(0, 4).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log((r.ok ? '✓ ' : '✗ ') + r.namn + (r.text ? '  — ' + r.text : ''))
process.exit(rader.every((r) => r.ok) ? 0 : 1)
