// _klatterdiag.mjs — engångsdiagnos (grodan-slurp L4): vart tar tungskottet mot en gren vägen?
import { chromium } from 'playwright'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(900)
const setup = await page.evaluate(() => {
  const g = window.__barnspel.game
  g._nastaHinder = 9999
  const d = g._dammen
  const gren = d.foremal.filter((f) => f.typ === 'gren' && f.body.label === 'gren')
  const lagst = gren.sort((a, b) => b.body.position.y - a.body.position.y)[0]
  const bb = lagst.body.bounds
  const x = (bb.min.x + bb.max.x) / 2 + 60
  g._tunga.nollstall()
  g._groda.teleportera(x, 552, 1)
  g._kam.moveTo(x, 360)
  return { gren: { x0: Math.round(bb.min.x), x1: Math.round(bb.max.x), y0: Math.round(bb.min.y), y1: Math.round(bb.max.y), cx: Math.round(lagst.body.position.x), cy: Math.round(lagst.body.position.y) }, x }
})
await page.waitForTimeout(700)
const mal = { x: setup.gren.cx, y: setup.gren.cy }
const skarm = await page.evaluate(([x, y]) => {
  const g = window.__barnspel.game
  const p = g._scen.toGlobal({ x, y })
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  const skala = r.width / (c.width / (window.devicePixelRatio || 1))
  return { x: r.left + p.x * skala, y: r.top + p.y * skala, lokal: g._scen.toLocal(p) }
}, [mal.x, mal.y])
await page.mouse.click(skarm.x, skarm.y)
await page.waitForTimeout(600)
const efter = await page.evaluate(() => {
  const g = window.__barnspel.game
  const tl = (window.__gamelog?.snapshot()?.timeline || []).filter((h) => h.cat === 'grodan').slice(-8)
  const m = g._groda.mun()
  return { tunga: g._tunga.lage, fastI: g._tunga.body?.label || null, groda: { x: Math.round(g._groda.pos.x), y: Math.round(g._groda.pos.y), lage: g._groda.lage }, mun: { x: Math.round(m.x), y: Math.round(m.y) }, logg: tl.map((h) => `${h.event} ${JSON.stringify(h.d || {})}`), undanta: (g._tunga._undanta || []).map((q) => q.label) }
})
console.log(JSON.stringify({ setup, mal, skarm, efter }, null, 1))
await b.close()
