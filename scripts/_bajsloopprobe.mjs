// _bajsloopprobe.mjs — spelar grodan-slurps BAJSLOOP hela vägen i headless Chrome, som ett
// otåligt barn som vet vad det vill: äta → bajsa → hämta korven → bära → kasta till kören ×3.
//
//   node scripts/_bajsloopprobe.mjs [--sek 400] [--rundor 2] [--bilder]
//
// Harnessens autotryck når aldrig kören (x > 950 eller hörnet mitt emot trädet) och träffar
// en korv bara av en slump — den här sonden läser spelets FAKTISKA lägen och trycker:
//   bär grodan en korv      → på kören (en slumpad unge — spelet väljer närmaste omatade)
//   ligger en korv fritt    → på korven
//   annars                  → som _grodspelprobe: närmaste insekt, föremål, grodan, slump
// Mäter per runda: tid till första korven (= där rundan slutade FÖRE bajsloopen), tid per
// korv, tid per runda, korvar som tappades, sen hjälp, max antal korvar samtidigt, konsolfel.
// Sist tre exit-prov: MITT I ett kast (korven i luften), MITT I en krystning, och in igen.
//
// Kräver dev-servern (npm run dev) — `window.__barnspel` finns bara i DEV.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const SEK = Number(val('--sek', 400))
const RUNDOR = Number(val('--rundor', 2))
const BILDER = argv.includes('--bilder')
const ID = 'grodan-slurp'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
const starta = async () => {
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
  await page.waitForTimeout(800)
}
await starta()

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
  const gr = g._groda
  const m = gr.mun()
  const kor = g._dammen.grodungar
  return {
    runda: g._runda,
    atna: g._atna,
    firar: g._firar,
    matade: g._matade,
    korvar: g._korvar,
    bar: !!g._bar,
    krystar: !!g._kryst,
    fria: g._bajs.fria.map((k) => ({ x: k.x, y: k.y })),
    antalKorvar: g._bajs.antal,
    flyger: g._bajs.lista.some((k) => k.lage === 'flyger'),
    kor: kor.plats,
    groda: { x: gr.pos.x, y: gr.pos.y, lage: gr.lage, riktning: gr.riktning },
    tunga: g._tunga.lage,
    fastI: g._tunga.body?.label || null,
    mun: m,
    insekter: g._svarm.lista.map((i) => ({ x: i.x, y: i.y })),
    foremal: g._dammen.foremal.filter((f) => f.typ !== 'strand').map((f) => ({ x: f.body.position.x, y: f.body.position.y })),
  }
})

const hornet = (x, y) => (x < 140 || x > 1140) && y < 130 // skalets knappar — ett tryck där lämnar spelet

const t0 = Date.now()
const rundor = []
let R = { start: Date.now(), forstaKorv: null, korvTider: [], matTider: [], maxKorvar: 0 }
let senRunda = 1
let senKorvar = 0
let senMatade = 0
let bildNr = 0
let nastaBild = 4
const tryckAv = { kor: 0, korv: 0, insekt: 0, foremal: 0, groda: 0, slump: 0 }
const xHist = {}
const fastHist = {}
const lageHist = {}
const fastnat = [] // ögonblicksbilder när inget ätits på 30 s
let senAtna = 0
let senAtT = Date.now()
let sistFastnat = 0
while ((Date.now() - t0) / 1000 < SEK) {
  const L = await lage()
  if (!L) break
  if (L.runda !== senRunda) {
    R.tid = Math.round((Date.now() - R.start) / 100) / 10
    rundor.push(R)
    senRunda = L.runda
    senKorvar = 0
    senMatade = 0
    R = { start: Date.now(), forstaKorv: null, korvTider: [], matTider: [], maxKorvar: 0 }
    if (rundor.length >= RUNDOR) break
  }
  const nu = Math.round((Date.now() - R.start) / 100) / 10
  if (L.korvar > senKorvar) {
    if (R.forstaKorv === null) R.forstaKorv = nu
    R.korvTider.push(nu)
    senKorvar = L.korvar
  }
  if (L.matade > senMatade) {
    R.matTider.push(nu)
    senMatade = L.matade
  }
  R.maxKorvar = Math.max(R.maxKorvar, L.antalKorvar)
  const hink = Math.floor(L.groda.x / 160) * 160
  xHist[hink] = (xHist[hink] || 0) + 1
  lageHist[L.groda.lage] = (lageHist[L.groda.lage] || 0) + 1
  if (L.fastI) fastHist[L.fastI] = (fastHist[L.fastI] || 0) + 1
  if (L.atna !== senAtna || L.bar || L.fria.length || L.firar) {
    senAtna = L.atna
    senAtT = Date.now()
  } else if (Date.now() - senAtT > 30000 && Date.now() - sistFastnat > 20000 && fastnat.length < 4) {
    sistFastnat = Date.now()
    const detalj = await page.evaluate(() => {
      const g = window.__barnspel.game
      const gr = g._groda
      const m = gr.mun()
      const inuti = g._inuti(m.x, m.y).map((b) => b.label)
      const nara = g._dammen.foremal.map((f) => ({ typ: f.typ, label: f.body.label, x: Math.round(f.body.position.x), y: Math.round(f.body.position.y) }))
        .filter((f) => Math.hypot(f.x - m.x, f.y - m.y) < 220)
      return { mun: { x: Math.round(m.x), y: Math.round(m.y) }, groda: { x: Math.round(gr.pos.x), y: Math.round(gr.pos.y), lage: gr.lage, riktning: gr.riktning, kraft: Math.round(gr.kraft * 100) / 100 }, tunga: g._tunga.lage, fastI: g._tunga.body?.label, inuti, nara, insekter: g._svarm.lista.map((i) => `${i.typ}@${Math.round(i.x)},${Math.round(i.y)}`), bajsDags: g._bajsDags, kryst: !!g._kryst, magen: g._iMagen.length, bar: !!g._bar, super: g._super?.fas || null, superFas: gr.superFas, ladd: !!g._ladd, hem: !!g._hem, firar: g._firar, korvar: g._bajs.lista.map((k) => `${k.lage}@${Math.round(k.x)},${Math.round(k.y)}`), senaste: (window.__gamelog?.snapshot()?.timeline || []).filter((h) => h.cat === 'grodan').slice(-14).map((h) => `${(h.t / 1000).toFixed(1)} ${h.event} ${JSON.stringify(h.d || {})}`) }
    })
    await page.screenshot({ path: `.test-shots/_bajsfast-${fastnat.length}.png` })
    fastnat.push({ sekUtanAt: Math.round((Date.now() - senAtT) / 1000), ...detalj })
  }

  if (L.firar || L.flyger) {
    await page.waitForTimeout(200)
    continue
  }
  if (L.bar) {
    // Kören: en slumpad unge (spelet väljer närmaste omatade). Ibland väntar barnet en stund.
    if (Math.random() < 0.8) {
      await tryck(L.kor.x + (Math.random() - 0.5) * 150, L.kor.y - 30 + (Math.random() - 0.5) * 40)
      tryckAv.kor++
    } else {
      await tryck(160 + Math.random() * 900, 150 + Math.random() * 350)
      tryckAv.slump++
    }
  } else if (L.fria.length && Math.random() < 0.8) {
    const k = L.fria[0]
    await tryck(k.x, k.y)
    tryckAv.korv++
  } else {
    const r = Math.random()
    if (r < 0.62 && L.insekter.length) {
      const ins = Math.random() < 0.7
        ? L.insekter.slice().sort((a, c) => Math.hypot(a.x - L.mun.x, a.y - L.mun.y) - Math.hypot(c.x - L.mun.x, c.y - L.mun.y))[0]
        : L.insekter[Math.floor(Math.random() * L.insekter.length)]
      if (hornet(ins.x, ins.y)) continue
      await tryck(ins.x, ins.y)
      tryckAv.insekt++
    } else if (r < 0.78 && L.foremal.length) {
      const f = L.foremal[Math.floor(Math.random() * L.foremal.length)]
      await tryck(Math.max(150, Math.min(1130, f.x)), Math.max(135, f.y))
      tryckAv.foremal++
    } else if (r < 0.9) {
      await tryck(L.groda.x, L.groda.y)
      tryckAv.groda++
    } else {
      await tryck(160 + Math.random() * 960, 140 + Math.random() * 420)
      tryckAv.slump++
    }
  }
  if (BILDER && (Date.now() - t0) / 1000 > nastaBild && bildNr < 16) {
    await page.screenshot({ path: `.test-shots/_bajsloop-${bildNr++}.png` })
    nastaBild += 6
  }
  await page.waitForTimeout(160 + Math.random() * 380)
}
if (rundor.length < RUNDOR) {
  R.tid = null
  R.pagaende = Math.round((Date.now() - R.start) / 100) / 10
  rundor.push(R)
}
const slut = await lage()
const logg = await page.evaluate(() => (window.__gamelog ? window.__gamelog.snapshot() : null))
const handelser = {}
const fastMal = {}
for (const h of logg?.timeline || []) {
  if (h.cat !== 'grodan') continue
  handelser[h.event] = (handelser[h.event] || 0) + 1
  if (h.event === 'fast') fastMal[h.d?.mal] = (fastMal[h.d?.mal] || 0) + 1
}

// ── Exit-prov ──────────────────────────────────────────────────────────────────────────
// Spelar tills grodan bär en korv (eller en korv ligger fritt, eller krystar), med samma
// strategi men bara mot målet. Returnerar true om läget nåddes.
async function spelaTill(villkor, maxSek = 120) {
  const t = Date.now()
  while ((Date.now() - t) / 1000 < maxSek) {
    const L = await lage()
    if (!L) return false
    if (villkor(L)) return true
    if (L.bar) await tryck(L.kor.x, L.kor.y - 30)
    else if (L.fria.length) await tryck(L.fria[0].x, L.fria[0].y)
    else if (L.insekter.length) {
      const ins = L.insekter.slice().sort((a, c) => Math.hypot(a.x - L.mun.x, a.y - L.mun.y) - Math.hypot(c.x - L.mun.x, c.y - L.mun.y))[0]
      if (!hornet(ins.x, ins.y)) await tryck(ins.x, ins.y)
    }
    await page.waitForTimeout(160 + Math.random() * 200)
  }
  return false
}
const exitProv = []
const utOchIn = async (namn) => {
  const fore = fel.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1500)
  await starta()
  for (let i = 0; i < 12; i++) {
    await tryck(200 + Math.random() * 880, 80 + Math.random() * 400)
    await page.waitForTimeout(250)
  }
  exitProv.push({ namn, felEfter: fel.length - fore })
}
// 1. Mitt i kastet: spela tills grodan bär, tryck på kören, lämna 180 ms senare.
{
  const nadde = await spelaTill((L) => L.bar && !L.firar)
  if (nadde) {
    const L = await lage()
    await tryck(L.kor.x, L.kor.y - 30)
    await page.waitForTimeout(180)
    const flog = (await lage())?.flyger
    exitProv.push({ namn: 'kast-nadd', flyger: flog })
    await utOchIn('mitt-i-kastet')
  } else exitProv.push({ namn: 'mitt-i-kastet', nadde: false })
}
// 2. Mitt i krystningen.
{
  const nadde = await spelaTill((L) => L.krystar)
  if (nadde) await utOchIn('mitt-i-krystningen')
  else exitProv.push({ namn: 'mitt-i-krystningen', nadde: false })
}
// 3. Mitt i ett tungdrag på en korv (korven på väg in på tungan).
{
  const nadde = await spelaTill((L) => L.fria.length > 0 && !L.bar)
  if (nadde) {
    const L = await lage()
    await tryck(L.fria[0].x, L.fria[0].y)
    await page.waitForTimeout(90)
    await utOchIn('mitt-i-korvtungan')
  } else exitProv.push({ namn: 'mitt-i-korvtungan', nadde: false })
}
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1200)

console.log(JSON.stringify({
  sek: Math.round((Date.now() - t0) / 1000),
  rundor,
  slut: slut && { runda: slut.runda, atna: slut.atna, korvar: slut.korvar, matade: slut.matade },
  handelser,
  fastMal,
  xHist,
  lageHist,
  fastHist,
  fastnat,
  tryckAv,
  exitProv,
  fel: fel.length,
  felExempel: fel.slice(0, 8),
}, null, 1))
await b.close()
