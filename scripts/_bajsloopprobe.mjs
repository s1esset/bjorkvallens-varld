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
// L4 (världen större än skärmen): sonden trycker bara på det som SYNS (spelets `_vyNu`, utan
// skalknapparna och hem-bladet). Det som ligger utanför bild GÅR den mot, som ett barn: tungan
// mot ett synligt föremål åt det hållet (grodan flyger dit), annars ett simtag (trycka i vattnet)
// eller ett hopp. Kören kastas det mot bara på nära håll (spelets `_naraKoren`).
//
// Kräver dev-servern (npm run dev) — `window.__barnspel` finns bara i DEV.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const SEK = Number(val('--sek', 400))
const RUNDOR = Number(val('--rundor', 2))
const BILDER = argv.includes('--bilder')
const BIOM = val('--biom', null) // L5: tvinga en biom (damm | is | fors | skog) i ALLA rundor
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
  if (BIOM) {
    await page.evaluate((biom) => {
      const g = window.__barnspel.game
      g._tvingaBiom = biom
      g._rivVarld()
      g._byggVarld(g._ctx)
    }, BIOM)
  }
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
    nara: g._naraKoren ? g._naraKoren() : true,
    markY: g._dammen.golvY ?? 560,
    biom: g._biomNamn || 'damm',
    vy: g._vyNu ? { ...g._vyNu } : { left: 0, right: 1280, top: 0, bottom: 720 },
    groda: { x: gr.pos.x, y: gr.pos.y, lage: gr.lage, riktning: gr.riktning },
    tunga: g._tunga.lage,
    fastI: g._tunga.body?.label || null,
    mun: m,
    insekter: g._svarm.lista.map((i) => ({ x: i.x, y: i.y })),
    foremal: g._dammen.foremal.filter((f) => f.typ !== 'strand').map((f) => ({ x: f.body.position.x, y: f.body.position.y })),
  }
})

// Skalets knappar (hörnen) och hem-bladet (mitt upptill) — i SKÄRMEN, alltså relativt vyn.
const hornet = (x, y, vy = { left: 0, right: 1280, top: 0 }) => {
  const sx = x - vy.left
  const sy = y - vy.top
  const w = vy.right - vy.left
  return ((sx < 140 || sx > w - 140) && sy < 130) || (Math.abs(sx - w / 2) < 80 && sy < 120)
}
const synlig = (x, y, vy) => x > vy.left + 50 && x < vy.right - 50 && y > vy.top + 50 && y < vy.bottom - 30 && !hornet(x, y, vy)

// Gå mot x: tungan på ett synligt föremål åt det hållet inom räckhåll (grodan flyger dit), annars
// ett simtag åt det hållet om grodan flyter, annars ett tryck på grodan (hopp).
async function gaMot(L, x) {
  const dir = Math.sign(x - L.groda.x) || 1
  const kand = L.foremal
    .filter((f) => (f.x - L.groda.x) * dir > 70 && Math.hypot(f.x - L.mun.x, f.y - L.mun.y) < 400 && synlig(f.x, Math.max(f.y, L.vy.top + 60), L.vy))
    .sort((a, b) => (b.x - L.groda.x) * dir - (a.x - L.groda.x) * dir)
  if (kand.length && Math.random() < 0.8) {
    const f = kand[0]
    await tryck(f.x, Math.max(f.y, L.vy.top + 70))
    return 'foremal'
  }
  if (L.groda.lage === 'vatten') {
    await tryck(L.groda.x + dir * 160, 640)
    return 'sim'
  }
  // Skogen (L5): tungan i MARKEN en bit bort drar grodan dit.
  if (L.markY < 540 && Math.random() < 0.7) {
    const gx = L.groda.x + dir * 330
    if (synlig(gx, L.markY + 14, L.vy)) {
      await tryck(gx, L.markY + 14)
      return 'foremal'
    }
  }
  await tryck(L.groda.x, L.groda.y)
  return 'hopp'
}

const t0 = Date.now()
const rundor = []
let R = { start: Date.now(), forstaKorv: null, korvTider: [], matTider: [], maxKorvar: 0 }
let senRunda = 1
let senKorvar = 0
let senMatade = 0
let bildNr = 0
let nastaBild = 4
const tryckAv = { kor: 0, korv: 0, insekt: 0, foremal: 0, groda: 0, slump: 0, sim: 0, hopp: 0 }
const xHist = {}
const fastHist = {}
const lageHist = {}
const fastnat = [] // ögonblicksbilder när inget ätits på 30 s
let senAtna = ''
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
  // Framsteg = något RÄKNAS (ätna, korvar, matade) eller firandet pågår. Att bära räknas inte —
  // en groda som bär men aldrig når kören är också fast.
  const nyckel = `${L.atna}|${L.korvar}|${L.matade}|${L.runda}`
  if (nyckel !== senAtna || L.firar) {
    senAtna = nyckel
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
    // Kören: en slumpad unge (spelet väljer närmaste omatade) — bara på nära håll och om den
    // syns. Annars går barnet mot kören. Ibland väntar barnet en stund (slumptryck).
    const korY = L.kor.y - 30
    if (Math.random() < 0.8) {
      if (L.nara && synlig(L.kor.x, korY, L.vy)) {
        await tryck(L.kor.x + (Math.random() - 0.5) * 150, korY + (Math.random() - 0.5) * 40)
        tryckAv.kor++
      } else {
        tryckAv[await gaMot(L, L.kor.x)]++
      }
    } else {
      await tryck(L.vy.left + 160 + Math.random() * 900, L.vy.top + 150 + Math.random() * 350)
      tryckAv.slump++
    }
  } else if (L.fria.length && Math.random() < 0.8) {
    const k = L.fria[0]
    if (synlig(k.x, k.y, L.vy) && Math.hypot(k.x - L.mun.x, k.y - L.mun.y) < 430) {
      await tryck(k.x, k.y)
      tryckAv.korv++
    } else tryckAv[await gaMot(L, k.x)]++
  } else {
    const r = Math.random()
    const syns = L.insekter.filter((q) => synlig(q.x, q.y, L.vy))
    if (r < 0.62 && L.insekter.length) {
      if (!syns.length) {
        const q = L.insekter.slice().sort((a, c) => Math.abs(a.x - L.groda.x) - Math.abs(c.x - L.groda.x))[0]
        tryckAv[await gaMot(L, q.x)]++
      } else {
        const ins = Math.random() < 0.7
          ? syns.slice().sort((a, c) => Math.hypot(a.x - L.mun.x, a.y - L.mun.y) - Math.hypot(c.x - L.mun.x, c.y - L.mun.y))[0]
          : syns[Math.floor(Math.random() * syns.length)]
        await tryck(ins.x, ins.y)
        tryckAv.insekt++
      }
    } else if (r < 0.78 && L.foremal.length) {
      const f = L.foremal.filter((q) => synlig(q.x, Math.max(q.y, L.vy.top + 70), L.vy))
      if (f.length) {
        const q = f[Math.floor(Math.random() * f.length)]
        await tryck(q.x, Math.max(q.y, L.vy.top + 70))
        tryckAv.foremal++
      }
    } else if (r < 0.9) {
      await tryck(L.groda.x, L.groda.y)
      tryckAv.groda++
    } else {
      await tryck(L.vy.left + 160 + Math.random() * 960, L.vy.top + 140 + Math.random() * 420)
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
    if (L.bar) {
      if (L.nara && synlig(L.kor.x, L.kor.y - 30, L.vy)) await tryck(L.kor.x, L.kor.y - 30)
      else await gaMot(L, L.kor.x)
    } else if (L.fria.length) {
      const k = L.fria[0]
      if (synlig(k.x, k.y, L.vy) && Math.hypot(k.x - L.mun.x, k.y - L.mun.y) < 430) await tryck(k.x, k.y)
      else await gaMot(L, k.x)
    } else if (L.insekter.length) {
      const syns = L.insekter.filter((q) => synlig(q.x, q.y, L.vy))
      const lista = syns.length ? syns : L.insekter
      const ins = lista.slice().sort((a, c) => Math.hypot(a.x - L.mun.x, a.y - L.mun.y) - Math.hypot(c.x - L.mun.x, c.y - L.mun.y))[0]
      if (syns.length) await tryck(ins.x, ins.y)
      else await gaMot(L, ins.x)
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
  const nadde = await spelaTill((L) => L.bar && !L.firar && L.nara && synlig(L.kor.x, L.kor.y - 30, L.vy))
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
  const nadde = await spelaTill((L) => L.fria.length > 0 && !L.bar && synlig(L.fria[0].x, L.fria[0].y, L.vy) && Math.hypot(L.fria[0].x - L.mun.x, L.fria[0].y - L.mun.y) < 430)
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
