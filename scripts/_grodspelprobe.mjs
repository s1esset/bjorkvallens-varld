// _grodspelprobe.mjs — spelar grodan-slurp på riktigt i headless Chrome, som ett OTÅLIGT barn.
//
//   node scripts/_grodspelprobe.mjs [--sek 150] [--rundor 2] [--kontroll]
//
// Harnessens nio autotryck mäter inte målet (de träffar insekter bara av en slump), så den här
// sonden trycker på insekternas FAKTISKA lägen (läser `window.__barnspel.game._svarm.lista`),
// på grenen/stocken/stenen, på grodan (hopp) och slumpvis — så fort spelet tillåter.
// Mäter: ätna per minut, rundor klara + tid per runda, återställningar (grodan rymde),
// grodans fart/spridning, hinder som startade, konsolfel. Sist: exit MITT I ett tungdrag,
// åter in, spela 5 s, exit — 0 fel krävs.
//
// KONTROLLARM (--kontroll): trycker i blindo, minst 150 px från varje insekt. Ätna per
// minut MÅSTE bli klart lägre där — annars mäter talet sikthjälpen/autohjälpen, inte spelet.
//
// Kräver dev-servern (npm run dev) — `window.__barnspel` finns bara i DEV.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const SEK = Number(val('--sek', 150))
const RUNDOR = Number(val('--rundor', 2))
const KONTROLL = argv.includes('--kontroll')
const BILDER = argv.includes('--bilder') // skärmdump var 5:e s → .test-shots/_grodspel-N.png
const ID = 'grodan-slurp'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(800)

// Designkoordinat → sidkoordinat via spelets egen scen (tål letterbox/skalning).
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
  return {
    runda: g._runda,
    atna: g._atna,
    firar: g._firar,
    groda: { x: gr.pos.x, y: gr.pos.y, fart: gr.fart, lage: gr.lage, kraft: gr.kraft, riktning: gr.riktning, trasig: gr.trasig() },
    mun: m,
    tunga: g._tunga.lage,
    insekter: g._svarm.lista.map((i) => ({ x: i.x, y: i.y, typ: i.typ })),
    foremal: g._dammen.foremal.filter((f) => f.typ !== 'strand').map((f) => ({ x: f.body.position.x, y: f.body.position.y, typ: f.typ })),
    hinder: g._hinder.aktiv?.typ || null,
  }
})

const t0 = Date.now()
const statistik = { tryck: 0, paInsekt: 0, paForemal: 0, paGroda: 0, slump: 0, rundTider: [], maxFart: 0, trasig: 0, utanfor: 0, hinder: {}, lagen: {} }
let senRunda = 1
let rundStart = Date.now()
let sistHinder = null
let ataTot = 0
let prevAtna = 0
let nastaBild = 3
let bildNr = 0
while ((Date.now() - t0) / 1000 < SEK) {
  const L = await lage()
  if (!L) break
  if (L.runda !== senRunda) ataTot += Math.max(0, 8 - prevAtna) + L.atna
  else ataTot += Math.max(0, L.atna - prevAtna)
  prevAtna = L.atna
  if (L.runda !== senRunda) {
    statistik.rundTider.push(Math.round((Date.now() - rundStart) / 100) / 10)
    senRunda = L.runda
    rundStart = Date.now()
    if (statistik.rundTider.length >= RUNDOR) break
  }
  statistik.maxFart = Math.max(statistik.maxFart, L.groda.fart)
  if (L.groda.trasig) statistik.trasig++
  if (L.groda.x < 0 || L.groda.x > 1280 || L.groda.y > 720) statistik.utanfor++
  statistik.lagen[L.groda.lage] = (statistik.lagen[L.groda.lage] || 0) + 1
  if (L.hinder && L.hinder !== sistHinder) statistik.hinder[L.hinder] = (statistik.hinder[L.hinder] || 0) + 1
  sistHinder = L.hinder

  const r = Math.random()
  if (KONTROLL) {
    // Blind: en punkt minst 150 px från varje insekt (annars räddar sikthjälpen trycket och
    // armen mäter "tryck nära en insekt" i stället för "tryck i blindo").
    let px = 640
    let py = 300
    for (let f = 0; f < 30; f++) {
      px = 200 + Math.random() * 880
      py = 150 + Math.random() * 350
      if (L.insekter.every((i) => Math.hypot(i.x - px, i.y - py) > 150)) break
    }
    await tryck(px, py)
    statistik.slump++
  } else if (r < 0.62 && L.insekter.length) {
    // Närmaste insekt först (barnet siktar på det som är nära), ibland en slumpvis.
    const ins = Math.random() < 0.7
      ? L.insekter.slice().sort((a, b) => Math.hypot(a.x - L.mun.x, a.y - L.mun.y) - Math.hypot(b.x - L.mun.x, b.y - L.mun.y))[0]
      : L.insekter[Math.floor(Math.random() * L.insekter.length)]
    // Skalets knappar sitter i övre hörnen — ett tryck där lämnar spelet (sondfel, inte spelfel).
    if ((ins.x < 140 || ins.x > 1140) && ins.y < 130) continue
    await tryck(ins.x, ins.y)
    statistik.paInsekt++
  } else if (r < 0.78 && L.foremal.length) {
    const f = L.foremal[Math.floor(Math.random() * L.foremal.length)]
    await tryck(Math.max(150, Math.min(1130, f.x)), Math.max(135, f.y))
    statistik.paForemal++
  } else if (r < 0.9) {
    await tryck(L.groda.x, L.groda.y)
    statistik.paGroda++
  } else {
    await tryck(160 + Math.random() * 960, 140 + Math.random() * 420)
    statistik.slump++
  }
  statistik.tryck++
  if (BILDER && (Date.now() - t0) / 1000 > nastaBild && bildNr < 12) {
    await page.screenshot({ path: `.test-shots/_grodspel-${bildNr++}.png` })
    nastaBild += 5
  }
  await page.waitForTimeout(160 + Math.random() * 380)
}
const slut = await lage()
const sek = (Date.now() - t0) / 1000
const logg = await page.evaluate(() => (window.__gamelog ? window.__gamelog.snapshot() : null))
const handelser = {}
const detaljer = []
for (const h of logg?.timeline || []) {
  if (h.cat !== 'grodan') continue
  handelser[h.event] = (handelser[h.event] || 0) + 1
  if (h.event !== 'tunga' && detaljer.length < 60) detaljer.push(`${(h.t / 1000).toFixed(1)} ${h.event} ${JSON.stringify(h.d || {})}`)
}

// Exit mitt i ett tungdrag: skjut tungan på en gren, lämna 120 ms senare.
const felFore = fel.length
const L2 = await lage()
const gren = L2?.foremal.find((f) => f.typ === 'gren') || L2?.foremal[0]
if (gren) await tryck(gren.x, gren.y)
await page.waitForTimeout(260)
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1500)
await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
await page.waitForTimeout(1200)
for (let i = 0; i < 12; i++) {
  await tryck(200 + Math.random() * 880, 80 + Math.random() * 400)
  await page.waitForTimeout(250)
}
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1500)

console.log(JSON.stringify({
  kontroll: KONTROLL,
  sek: Math.round(sek),
  atnaSlut: slut?.atna,
  rundorKlara: statistik.rundTider.length,
  rundTider: statistik.rundTider,
  handelser,
  ataTot,
  atnaPerMin: Math.round((ataTot / sek) * 60 * 10) / 10,
  ...statistik,
  maxFart: Math.round(statistik.maxFart * 10) / 10,
  fel: fel.length,
  felEfterExit: fel.length - felFore,
  felExempel: fel.slice(0, 8),
  detaljer: argv.includes('--detaljer') ? detaljer : undefined,
}, null, 1))
await b.close()
