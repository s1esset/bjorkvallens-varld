// _svampprobe.mjs — grodan-slurp L5 (skogen): landar grodan på en flugsvamp i hög fart?
//
//   node scripts/_svampprobe.mjs [--varv 6]
//
// Spelkritikern (L4/L5): svampen är en ENVÄGSPLATTFORM med studs 0,8, och envägsregeln slår om till
// fast först när hela grodan är ovanför — omätt vid superhoppets fart. Här släpps grodan 260 px
// över en svamphatt med fart nedåt (vanligt fall: 8 px/steg, superhoppsfall: 16 px/steg) och följs
// i 2,5 s: studsade den (högsta y efter första kontakten), föll den IGENOM hatten (lägsta y långt
// under hatten), och var hamnade den (på svampen / marken). Plus ETT riktigt superhopp (håll på
// grodan) från marken intill en svamp, med 0 konsolfel som krav.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const VARV = Number(val('--varv', 6))

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.evaluate(() => {
  const g = window.__barnspel.game
  g._tvingaBiom = 'skog'
  g._rivVarld()
  g._byggVarld(g._ctx)
  g._nastaHinder = 9999
})
await page.waitForTimeout(900)
const varv = []
for (let n = 0; n < VARV; n++) {
  const r = await page.evaluate(async (n) => {
    const g = window.__barnspel.game
    const vanta = (ms) => new Promise((res) => setTimeout(res, ms))
    const sv = g._dammen.foremal.filter((f) => f.typ === 'svamp')
    if (!sv.length) return { ingenSvamp: true }
    const s = sv[n % sv.length].body
    const topp = s.bounds.min.y
    g._nollaTunga()
    g._groda.teleportera(s.position.x, topp - 260, 1)
    g._kam.moveTo(s.position.x, 300)
    const fart = n % 2 ? 16 : 8
    g._groda.knuffa(0, fart, 1)
    let minY = Infinity
    let maxY = -Infinity
    let kontakt = false
    let studsHojd = 0
    for (let i = 0; i < 50; i++) {
      await vanta(50)
      const y = g._groda.pos.y
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      if (!kontakt && g._groda.underlag?.label === 'svamp') kontakt = true
      if (kontakt) studsHojd = Math.max(studsHojd, (topp - 40) - y)
    }
    return { fart, hattTopp: Math.round(topp), djupast: Math.round(maxY), igenom: maxY > topp + 60, kontakt, studsHojd: Math.round(studsHojd), slut: { y: Math.round(g._groda.pos.y), under: g._groda.underlag?.label || null, lage: g._groda.lage } }
  }, n)
  varv.push(r)
}
// Ett riktigt superhopp från marken bredvid en svamp.
const sup = await page.evaluate(async () => {
  const g = window.__barnspel.game
  const vanta = (ms) => new Promise((res) => setTimeout(res, ms))
  const s = g._dammen.foremal.find((f) => f.typ === 'svamp').body
  g._nollaTunga()
  g._groda.teleportera(s.position.x - 220, 470, 1)
  g._kam.moveTo(s.position.x, 360)
  await vanta(1200)
  return { x: g._groda.pos.x, y: g._groda.pos.y, sx: s.position.x }
})
const skarm = await page.evaluate(([x, y]) => {
  const g = window.__barnspel.game
  const p = g._scen.toGlobal({ x, y })
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  const skala = r.width / (c.width / (window.devicePixelRatio || 1))
  return { x: r.left + p.x * skala, y: r.top + p.y * skala }
}, [sup.x, sup.y])
await page.mouse.move(skarm.x, skarm.y)
await page.mouse.down()
await page.waitForTimeout(1100)
await page.mouse.up()
await page.waitForTimeout(6000)
const efter = await page.evaluate(() => {
  const g = window.__barnspel.game
  return { super: g._super?.fas || null, y: Math.round(g._groda.pos.y), under: g._groda.underlag?.label || null, lage: g._groda.lage }
})
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(600)
console.log(JSON.stringify({ varv, superhopp: efter, fel: fel.length, felExempel: fel.slice(0, 5) }, null, 1))
await b.close()
