// _stubbdiag.mjs — varför fastnar tungan i stubbens stam? (engångsdiagnos, grodan-slurp L4)
// Ställer grodan intill stubben, skjuter tungan mot punkter PÅ ANDRA SIDAN (långt från stammen)
// och skriver ut: undanta-listan (etiketter), var tungan fastnade och tryckets mål.
import { chromium } from 'playwright'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(900)
const ut = []
for (let n = 0; n < 6; n++) {
  const r = await page.evaluate(async (n) => {
    const g = window.__barnspel.game
    g._nastaHinder = 9999
    const d = g._dammen
    const sx = d._x(d._plan.stubbe.u)
    const sida = n % 2 ? 1 : -1
    g._tunga.nollstall()
    g._groda.teleportera(sx + sida * 48, 552, -sida)
    g._kam.moveTo(sx, 360)
    await new Promise((res) => setTimeout(res, 700))
    const m = g._groda.mun()
    // Målet: på ANDRA sidan av stammen, 250 px bort, 150 px upp.
    const mal = { x: sx - sida * 250, y: m.y - 150 }
    const und = g._inuti(m.x, m.y, mal.x, mal.y).map((q) => q.label)
    g._tunga.skjut(mal.x, mal.y)
    await new Promise((res) => setTimeout(res, 400))
    const t = g._tunga
    const stam = d.foremal.find((f) => f.body.label === 'stam' && Math.abs(f.body.position.x - sx) < 5)
    const bb = stam?.body.bounds
    return {
      sida, grodaX: Math.round(g._groda.pos.x), mun: { x: Math.round(m.x), y: Math.round(m.y) }, mal,
      stamBounds: bb && { x0: Math.round(bb.min.x), x1: Math.round(bb.max.x), y0: Math.round(bb.min.y), y1: Math.round(bb.max.y) },
      undanta: und, tungLage: t.lage, fastI: t.body?.label || null, spets: { x: Math.round(t.spets.x), y: Math.round(t.spets.y) },
      stamIUndanta: t._undanta?.includes(stam?.body),
    }
  }, n)
  ut.push(r)
}
console.log(JSON.stringify(ut, null, 1))
await b.close()
