// _natkvall.mjs — bilder av natskott-pa-stan i varje kvällsläge och väder.
// Låser kvällens mål (k) och vädret genom spelets egna fält och tar en skärmdump per läge,
// efter att fönstren hunnit tändas. Svarar på "hur ser det UT?" — inte på kostnaden (se
// _natram.mjs för bildrutetiden).
//
//   node scripts/_natkvall.mjs [--url http://localhost:5174] [--ut .test-shots/_natkvall]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const url = opt('--url', 'http://localhost:5174')
const UT = opt('--ut', '.test-shots/_natkvall')
mkdirSync(UT, { recursive: true })

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
// --viewport WxH: t.ex. 952x428 (bred telefon) — kvällens lager måste täcka hela bleed-zonen
const [vpW, vpH] = opt('--viewport', '1280x720').split('x').map(Number)
const page = await browser.newPage({ viewport: { width: vpW, height: vpH } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 300)))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'natskott-pa-stan' }))
await page.waitForFunction(() => window.__natdbg && window.__natdbg._alive, null, { timeout: 15000 })
await page.waitForTimeout(1200)

const lage = async (namn, k, vader) => {
  await page.evaluate(([k, vader]) => {
    const m = window.__natdbg
    m._kvallMalNu = () => k
    m._kvallFart = 3
    m._vader = vader
    m._regn = vader === 'regn' ? 1 : 0
    m._idle = -999
  }, [k, vader])
  await page.waitForTimeout(1700)
  const info = await page.evaluate(() => {
    const m = window.__natdbg
    let tanda = 0
    let alla = 0
    for (const s of m._mid) for (const w of s.wins) {
      alla++
      if (w.ljus > 0.9) tanda++
    }
    return { k: +m._kvall.toFixed(2), regn: +m._regn.toFixed(2), tanda, alla, mid: m._midLayer.tint.toString(16) }
  })
  await page.screenshot({ path: `${UT}/${namn}.png` })
  console.log(namn, JSON.stringify(info))
}

await lage('k00-dag', 0, 'klart')
await lage('k30', 0.3, 'klart')
await lage('k50-solnedgang', 0.5, 'klart')
await lage('k70-skymning', 0.7, 'klart')
await lage('k84', 0.84, 'klart')
await lage('k100-kvall', 1, 'klart')
await lage('regn-k10', 0.1, 'regn')
await lage('regn-k45', 0.45, 'regn')
await lage('regn-k80', 0.8, 'regn')

// paraplyer: regnrunda, gående figurer ute på trottoaren, ett nät som blåser av ett paraply
await page.evaluate(() => {
  const m = window.__natdbg
  const ctx = window.__barnspel.ctx
  m._kvallMalNu = () => 0.15
  m._vader = 'regn'
  m._regn = 1
  for (const [k, x] of [['katt', 520], ['monster', 760], ['hund', 980], ['monster', 340]]) {
    const r = m._spawnTarget(ctx, k, x, {})
    if (r) r.walkV = 0
  }
  // uppdragspanelen med nätbollsuppdraget
  m._missionOrder = ['snarj', 'fonster', 'lykta']
  m._missionsDone = 0
  m._missionActive = false
  m._announce(ctx)
})
await page.waitForTimeout(900)
await page.screenshot({ path: `${UT}/regn-paraply.png` })
const mal = await page.evaluate(() => {
  const r = window.__natdbg._targets.find((t) => t.paraply)
  return r ? { x: Math.round(r.view.x), y: Math.round(r.view.y) } : null
})
if (mal) {
  await page.evaluate(({ x, y }) => {
    const cvs = document.querySelectorAll('canvas')
    const cv = cvs[cvs.length - 1]
    const b = cv.getBoundingClientRect()
    for (const t of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(t, { clientX: b.left + x, clientY: b.top + y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true }))
  }, mal)
  await page.waitForTimeout(260)
  await page.screenshot({ path: `${UT}/regn-paraply-flyger.png` })
}
// en tänd lykta på kvällen
await page.evaluate(() => {
  const m = window.__natdbg
  const ctx = window.__barnspel.ctx
  m._kvallMalNu = () => 1
  m._vader = 'klart'
  m._regn = 0
  for (const p of [...m._props]) m._rivProp(p)
  m._props = []
  const def = { ...m }
  const p1 = m._spawnProp(ctx, 760)
  if (p1) m._rivProp(p1), m._props.pop()
})
const lykta = await page.evaluate(() => {
  const m = window.__natdbg
  const ctx = window.__barnspel.ctx
  // tvinga fram en lyktstolpe på x 760 och tänd den med ett nät
  m._missionActive = true
  m._missionKey = 'lykta'
  let p = null
  for (let i = 0; i < 40 && !p; i++) {
    const q = m._spawnProp(ctx, 760)
    if (q && q.def.id === 'lyktstolpe') p = q
    else if (q) { m._rivProp(q); m._props.splice(m._props.indexOf(q), 1) }
  }
  m._scroll = 0
  m._scrollBase = 0
  return p ? { x: Math.round(p.c.x - 26), y: Math.round(p.c.y - 188) } : null
})
await page.waitForTimeout(1500)
await page.screenshot({ path: `${UT}/kvall-lykta-slackt.png` })
if (lykta) {
  await page.evaluate(({ x, y }) => {
    const cvs = document.querySelectorAll('canvas')
    const cv = cvs[cvs.length - 1]
    const b = cv.getBoundingClientRect()
    for (const t of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(t, { clientX: b.left + x, clientY: b.top + y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true }))
  }, lykta)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${UT}/kvall-lykta-tand.png` })
  console.log('lykta', JSON.stringify(await page.evaluate(() => window.__natdbg._props.filter((p) => p.def.id === 'lyktstolpe').map((p) => ({ x: Math.round(p.c.x), tand: !!p.c._wxTand })))))
}

console.log(JSON.stringify({ errors, errorCount: errors.length }))
await browser.close()
process.exit(errors.length ? 1 : 0)
