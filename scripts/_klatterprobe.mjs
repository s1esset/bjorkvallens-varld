// _klatterprobe.mjs — grodan-slurp L4: går det att KLÄTTRA uppåt, och följer kameran med?
//
//   node scripts/_klatterprobe.mjs [--varv 4]
//
// Ägaren: "hoppa uppåt mer så kameran / skärmen följer med". _bajsloopprobe spelar nästan bara i
// sidled (insekterna högt upp syns inte från vattnet), så klättringen var omätt. Här: grodan
// ställs vid ett träds fot och ett barn trycker på GRENARNA nerifrån och upp (tungan fäster →
// grodan svingar dit → nästa gren), med riktiga pekartryck via spelets egen omräkning.
// Mäter per varv: högsta y grodan nådde, lägsta kamera-y (hur högt bilden följde), om grodan
// nådde översta grenens höjd, om den kom ned till vattnet igen efter att tungan släppts
// (ingen fastnar i kronan), och att grodan aldrig lämnade bilden (hårda rutan). 0 konsolfel.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const VARV = Number(val('--varv', 4))

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

async function tryck(x, y) {
  const s = await page.evaluate(([x, y]) => {
    const g = window.__barnspel.game
    const p = g._scen.toGlobal({ x, y })
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const skala = r.width / (c.width / (window.devicePixelRatio || 1))
    return { x: r.left + p.x * skala, y: r.top + p.y * skala }
  }, [x, y])
  if (s) await page.mouse.click(s.x, s.y)
}
const las = () => page.evaluate(() => {
  const g = window.__barnspel.game
  const gr = g._groda
  const v = g._vyNu
  return { L: g._tunga._L, fastSteg: g._tunga._fastSteg, paMark: gr.paMark, under: gr.underlag?.label || null, kraft: gr.kraft, gLage: gr.lage, x: gr.pos.x, y: gr.pos.y, lage: gr.lage, tunga: g._tunga.lage, fastI: g._tunga.body?.label || null, fastY: g._tunga.body?.position.y ?? null, langd: g._tunga.langd, kamY: g._kam.y, iBild: gr.pos.x > v.left && gr.pos.x < v.right && gr.pos.y > v.top && gr.pos.y < v.bottom }
})

const varv = []
for (let n = 0; n < VARV; n++) {
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
  await page.waitForTimeout(900)
  // Ställ grodan i vattnet under ett träds lägsta gren (vartannat varv vänster/höger träd).
  const trad = await page.evaluate((n) => {
    const g = window.__barnspel.game
    g._nastaHinder = 9999
    const d = g._dammen
    const t = d._plan.trad[n % 2]
    const sgn = t.bank === 1 ? d._sgn : -d._sgn
    const stamX = d._xb(t.bank, t.stamU)
    // Trädets grenar = de 'gren'-kroppar vars mitt ligger inom 360 px från stammen på vattensidan
    // (stubbens grenar står mitt i dammen). Trycket sätts på grenens mitt, nedifrån och upp.
    const grenar = d.foremal
      .filter((f) => f.body.label === 'gren' && (f.body.position.x - stamX) * sgn > 0 && Math.abs(f.body.position.x - stamX) < 360)
      .map((f) => ({ x: f.body.position.x + sgn * 30, y: f.body.position.y }))
      .sort((a, c) => c.y - a.y)
    const x = grenar[0].x + sgn * 60
    g._tunga.nollstall()
    g._groda.teleportera(x, 552, -sgn)
    g._kam.moveTo(x, 360)
    return { grenar, sgn }
  }, n)
  await page.waitForTimeout(600)
  let minY = Infinity
  let minKamY = Infinity
  let utanforBild = 0
  const r = { grenar: trad.grenar.map((q) => Math.round(q.y)) }
  // Klättra: tryck på gren i, vänta tills tungan sitter och grodan svingat upp, sedan nästa.
  for (let i = 0; i < trad.grenar.length; i++) {
    const q = trad.grenar[i]
    let fast = false
    let sista = null
    for (let f = 0; f < 5 && !fast; f++) {
      await tryck(q.x, q.y)
      // Vänta (utan att trycka igen — ett nytt tryck släpper tungan) tills grodan dragits upp
      // under grenen, eller högst 3 s.
      for (let w = 0; w < 30 && !fast; w++) {
        await page.waitForTimeout(100)
        const L = await las()
        minY = Math.min(minY, L.y)
        minKamY = Math.min(minKamY, L.kamY)
        if (!L.iBild) utanforBild++
        // I rätt gren (kroppens mitt inom 30 px från det tryckta), och tungan har dragit in sig.
        if (L.tunga === 'fast' && L.fastY !== null && Math.abs(L.fastY - q.y) < 30 && L.langd < 170) fast = true
        sista = { L: Math.round(L.L), fastSteg: L.fastSteg, paMark: L.paMark, under: L.under, kraft: Math.round(L.kraft * 100) / 100, gLage: L.gLage, tunga: L.tunga, fastI: L.fastI, fastY: L.fastY === null ? null : Math.round(L.fastY), langd: Math.round(L.langd), y: Math.round(L.y), kamY: Math.round(L.kamY) }
        if (L.tunga === 'av' && w > 6) break
      }
    }
    r[`gren${i}`] = fast
    if (!fast) r[`sista${i}`] = { ...sista, tryckY: Math.round(q.y) }
  }
  r.hogsta = Math.round(minY)
  r.kameraHogst = Math.round(minKamY)
  // Ned igen som ett barn gör: tryck på ett blad nedanför (synligt, inom räckhåll) — tungan ska
  // passera grenen grodan står/hänger i och dra ned grodan (envägsgrenen släpper igenom).
  let nere = false
  const t0 = Date.now()
  for (let f = 0; f < 6 && !nere; f++) {
    const mal = await page.evaluate(() => {
      const g = window.__barnspel.game
      const m = g._groda.mun()
      const v = g._vyNu
      const bl = g._dammen.blad
        .map((b) => ({ x: b.x, y: b.body.position.y - 8 }))
        .filter((b) => b.y > m.y + 80 && b.x > v.left + 60 && b.x < v.right - 60 && b.y < v.bottom - 20)
        .sort((a, c) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(c.x - m.x, c.y - m.y))
      // Inget blad syns: tryck längst ned i bilden, lite åt sidan (dit ett barn trycker).
      return bl[0] || { x: m.x + (Math.random() < 0.5 ? -160 : 160), y: v.bottom - 50 }
    })
    await tryck(mal.x, mal.y)
    for (let w = 0; w < 25 && !nere; w++) {
      await page.waitForTimeout(100)
      const L = await las()
      if (!L.iBild) utanforBild++
      if (L.y > 440) nere = true
    }
  }
  r.kom_ned = nere
  if (!nere) {
    r.nedLogg = await page.evaluate(() => (window.__gamelog?.snapshot()?.timeline || []).filter((h) => h.cat === 'grodan').slice(-8).map((h) => `${(h.t / 1000).toFixed(1)} ${h.event} ${JSON.stringify(h.d || {})}`))
    const L = await las()
    r.nedLage = { y: Math.round(L.y), gLage: L.gLage, tunga: L.tunga, fastI: L.fastI, under: L.under, kamY: Math.round(L.kamY) }
  }
  r.nedSek = nere ? Math.round((Date.now() - t0) / 100) / 10 : null
  r.utanforBild = utanforBild
  varv.push(r)
}
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(600)
console.log(JSON.stringify({ varv, fel: fel.length, felExempel: fel.slice(0, 5) }, null, 1))
await b.close()
