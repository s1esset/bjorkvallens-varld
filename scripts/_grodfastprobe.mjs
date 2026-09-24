// _grodfastprobe.mjs — fastnar grodan (grodan-slurp) så att barnet inte kommer någonstans?
//
//   node scripts/_grodfastprobe.mjs [--pass 6] [--sek 90]
//
// Strategin är ett envist barn: tryck ALLTID på insekten närmast munnen, så fort spelet tillåter
// (inga hopp, inga föremål, inga slumptryck). Den strategin hittade ett läge där inget åts på
// 2 × 120 s (_bajsloopprobe, exit-proven). Varje pass startar spelet på nytt.
// Mäter per pass: ätna, längsta lucka utan att äta, och — första gången en lucka når 25 s —
// en ögonblicksbild: grodans läge/riktning/tillstånd, vad tungan sitter fast i, vad munnen är
// inuti, föremål nära munnen, och en skärmdump (.test-shots/_grodfast-N.png).
// Läser bara `_svarm`, `_groda`, `_tunga`, `_atna`, `_dammen` — går alltså att köra mot HEAD
// (före bajsloopen) som kontrollarm.
//
// Kräver dev-servern (npm run dev).
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const PASS = Number(val('--pass', 6))
const SEK = Number(val('--sek', 90))
const ID = 'grodan-slurp'

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
    if (!g?._scen) return null
    const p = g._scen.toGlobal({ x, y })
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const skala = r.width / (c.width / (window.devicePixelRatio || 1))
    return { x: r.left + p.x * skala, y: r.top + p.y * skala }
  }, [x, y])
  if (s) await page.mouse.click(s.x, s.y)
}

const lage = () => page.evaluate(() => {
  const g = window.__barnspel.game
  if (!g?._groda) return null
  const m = g._groda.mun()
  return { atna: g._atna, runda: g._runda, firar: g._firar, bar: !!g._bar, fria: (g._bajs?.fria || []).map((k) => ({ x: k.x, y: k.y })), kor: g._dammen.grodungar.plats, mun: m, insekter: g._svarm.lista.map((i) => ({ x: i.x, y: i.y })) }
})

const bild = () => page.evaluate(() => {
  const g = window.__barnspel.game
  const gr = g._groda
  const m = gr.mun()
  const r = (v) => Math.round(v)
  return {
    groda: { x: r(gr.pos.x), y: r(gr.pos.y), lage: gr.lage, riktning: gr.riktning, kraft: Math.round(gr.kraft * 100) / 100, paMark: gr.paMark, underlag: gr.underlag?.label || null },
    mun: { x: r(m.x), y: r(m.y) },
    tunga: g._tunga.lage,
    fastI: g._tunga.body?.label || null,
    inuti: g._inuti(m.x, m.y).map((b) => b.label),
    nara: g._dammen.foremal.map((f) => ({ typ: f.typ, x: r(f.body.position.x), y: r(f.body.position.y) })).filter((f) => Math.hypot(f.x - m.x, f.y - m.y) < 240),
    insekter: g._svarm.lista.map((i) => `${i.typ}@${r(i.x)},${r(i.y)}`),
  }
})

const hornet = (x, y) => (x < 140 || x > 1140) && y < 130
const pass = []
for (let n = 0; n < PASS; n++) {
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
  await page.waitForTimeout(800)
  const t0 = Date.now()
  let senAt = Date.now()
  let senAtna = 0
  let atna = 0
  let lucka = 0
  let fast = null
  const fastLog0 = await page.evaluate(() => window.__gamelog?.snapshot()?.timeline?.length || 0)
  while ((Date.now() - t0) / 1000 < SEK) {
    const L = await lage()
    if (!L) break
    if (L.atna !== senAtna) {
      atna += Math.max(0, L.atna - senAtna)
      senAtna = L.atna
      senAt = Date.now()
    }
    // Bajsloopen (om den finns) sköts som barnet skulle: hämta korven, lämna den i kören.
    if (L.bar || L.fria.length || L.firar) senAt = Date.now()
    lucka = Math.max(lucka, (Date.now() - senAt) / 1000)
    if (!fast && (Date.now() - senAt) / 1000 > 25) {
      fast = { vidSek: Math.round((Date.now() - t0) / 1000), ...(await bild()) }
      await page.screenshot({ path: `.test-shots/_grodfast-${n}.png` })
    }
    if (L.firar) {
      await page.waitForTimeout(250)
      continue
    }
    if (L.bar) await tryck(L.kor.x, L.kor.y - 30)
    else if (L.fria.length) await tryck(L.fria[0].x, L.fria[0].y)
    else if (L.insekter.length) {
      const ins = L.insekter.slice().sort((a, c) => Math.hypot(a.x - L.mun.x, a.y - L.mun.y) - Math.hypot(c.x - L.mun.x, c.y - L.mun.y))[0]
      if (!hornet(ins.x, ins.y)) await tryck(ins.x, ins.y)
    }
    await page.waitForTimeout(160 + Math.random() * 200)
  }
  const logg = await page.evaluate(() => window.__gamelog?.snapshot()?.timeline || [])
  const fastMal = {}
  for (const h of logg.slice(fastLog0)) if (h.cat === 'grodan' && h.event === 'fast') fastMal[h.d?.mal] = (fastMal[h.d?.mal] || 0) + 1
  pass.push({ n, atna, langstaLucka: Math.round(lucka), fastMal, fast })
}
await page.evaluate(() => window.__barnspel.nav.go('library'))
console.log(JSON.stringify({ pass, fastnadePass: pass.filter((p) => p.fast).length, fel: fel.length, felExempel: fel.slice(0, 5) }, null, 1))
await b.close()
