// _bajssuperprobe.mjs — grodan-slurp: superhopp MED en bajskorv i munnen (spelkritikerns otestade
// kombination). Ställer upp läget med spelets egna metoder och spelar sedan med riktiga
// pekarhändelser: håll på grodan (full sats) → släpp → tryck bredvid i luften (repet åker ut)
// → vänta tills superhoppet är klart → tryck på kören (kast) → vänta på matningen.
//
//   node scripts/_bajssuperprobe.mjs [--varv 3]
//
// Kontrollerar per varv: superhoppet går hela vägen (luft → vaknar → klart), korven sitter i
// munnen hela tiden (lage 'mun'), repet fångar inga insekter (fangar=false) och inga insekter
// äts medan korven bärs (_atna oförändrat), kastet når en unge (matade +1), 0 konsolfel.
// Hindren stängs av (en kotte som knockar ut korven är en ANNAN, avsiktlig väg).
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const VARV = Number(val('--varv', 3))

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(1500)

const sida = (x, y) => page.evaluate(([x, y]) => {
  const g = window.__barnspel.game
  const p = g._scen.toGlobal({ x, y })
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  const skala = r.width / (c.width / (window.devicePixelRatio || 1))
  return { x: r.left + p.x * skala, y: r.top + p.y * skala }
}, [x, y])
const las = () => page.evaluate(() => {
  const g = window.__barnspel.game
  const k = g._bar
  return {
    atna: g._atna, matade: g._matade, bar: !!k, korvLage: k?.lage || null, super: g._super?.fas || null,
    uppe: !!g._super?.uppe, superFas: g._groda.superFas, rep: !!g._rep, fangar: g._rep ? g._rep.fangar : null,
    pos: { x: g._groda.pos.x, y: g._groda.pos.y }, kanHoppa: g._groda.kanHoppa, lage: g._groda.lage,
    kor: g._dammen.grodungar.plats, firar: g._firar,
  }
})

const varv = []
for (let v = 0; v < VARV; v++) {
  // Ställ upp: en korv i munnen, grodan hem på startbladet, inga hinder.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    g._nastaHinder = 9999
    g._hinder.avsluta()
    g._kallaHem(g._ctx)
    const gr = g._groda
    const k = g._bajs.skapa(gr.pos.x, gr.pos.y - 120, ['fluga', 'humla', 'fjaril', 'fluga', 'fluga'], 0, 0)
    g._bajs.gripTunga(k)
    g._taKorv(g._ctx, k)
  })
  await page.waitForTimeout(1600)
  let L = await las()
  const r = { bar0: L.bar, atna0: L.atna, matade0: L.matade }
  // Håll på grodan (full sats), släpp.
  const p = await sida(L.pos.x, L.pos.y)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(1650)
  await page.mouse.up()
  await page.waitForTimeout(350)
  L = await las()
  r.superStart = L.super
  // Repet: ett tryck bredvid grodan i luften.
  const q = await sida(L.pos.x + 160, L.pos.y - 60)
  await page.mouse.click(q.x, q.y)
  await page.waitForTimeout(150)
  L = await las()
  r.rep = L.rep
  r.repFangar = L.fangar
  let korvHela = L.korvLage === 'mun'
  let maxAt = L.atna
  const t0 = Date.now()
  while (Date.now() - t0 < 12000) {
    L = await las()
    if (L.korvLage !== 'mun') korvHela = false
    maxAt = Math.max(maxAt, L.atna)
    if (!L.super) break
    await page.waitForTimeout(120)
  }
  r.superKlar = !L.super
  r.superSek = Math.round((Date.now() - t0) / 100) / 10
  r.korvIMunnenHelaTiden = korvHela
  r.atnaUnderBar = maxAt - r.atna0
  r.barEfter = L.bar
  // Kasta till kören.
  await page.waitForTimeout(400)
  const k = await sida(L.kor.x, L.kor.y - 30)
  await page.mouse.click(k.x, k.y)
  await page.waitForTimeout(1600)
  L = await las()
  r.matadeEfter = L.matade - r.matade0
  r.firar = L.firar
  varv.push(r)
  if (L.firar) break
}
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(800)
console.log(JSON.stringify({ varv, fel: fel.length, felExempel: fel.slice(0, 6) }, null, 1))
await b.close()
