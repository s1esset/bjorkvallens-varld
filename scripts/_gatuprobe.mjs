// Sond for gatusakerna i natskott-pa-stan: verifierar att de FINNS pa gatan,
// att alla tre naten ger olika reaktion, och att traffytan haller P0 (>=96 px).
//   node scripts/_gatuprobe.mjs
import { chromium } from 'playwright'
const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 250)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 250)))
const tap = (x, y) => page.evaluate(({ x, y }) => {
  const cvs = document.querySelectorAll('canvas'); const cv = cvs[cvs.length - 1]
  const r = cv.getBoundingClientRect()
  for (const t of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true }))
}, { x, y })
const props = () => page.evaluate(() => (window.__natdbg._props || []).map((p) => ({
  id: p.def.id, x: Math.round(p.c.x), y: Math.round(p.c.y), r: p.r,
  mitt: Math.round(p.c.y - (p.def.hojd || 90) * 0.45),
  nat: p.c._wxNat || null, kvar: +(p.c._wxR || 0).toFixed(2),
})))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'natskott-pa-stan' }))
await page.waitForTimeout(1500)

// 1. finns de, och haller traffytan P0?
let alla = new Set()
const smaa = []
for (let i = 0; i < 26; i++) {
  const ps = await props()
  for (const p of ps) { alla.add(p.id); if (p.r * 2 < 96) smaa.push(`${p.id} r=${p.r}`) }
  await page.waitForTimeout(400)
}
console.log(`gatusaker sedda: ${alla.size}/11 -> ${[...alla].join(' ')}`)
console.log(smaa.length ? `x traffyta under 96 px: ${[...new Set(smaa)].join(', ')}` : 'ok alla traffytor >= 96 px diameter')

// 2. reagerar de olika pa de tre naten?
const sido = await page.evaluate(() => (window.__natdbg._sidoHander || []).map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) })))
const setMode = async (vill) => {
  for (let i = 0; i < 3; i++) {
    const st = await page.evaluate(() => ({ m: window.__natdbg._mode, v: [...window.__natdbg._vantar] }))
    if (st.m === vill) return true
    const slot = st.v.indexOf(vill); if (slot < 0) return false
    await tap(sido[slot].x, sido[slot].y - 120); await page.waitForTimeout(300)
  }
  return false
}
for (const nat of ['drag', 'klibb', 'boll']) {
  await setMode(nat)
  let traff = 0, taggar = []
  for (let k = 0; k < 8 && traff < 3; k++) {
    const ps = (await props()).filter((p) => p.x > 220 && p.x < 1120)
    if (!ps.length) { await page.waitForTimeout(600); continue }
    const p = ps[0]
    await tap(p.x, p.mitt)
    await page.waitForTimeout(260)
    const efter = (await props()).find((q) => q.id === p.id && Math.abs(q.x - p.x) < 120)
    if (efter && efter.nat === nat && efter.kvar > 0) { traff++; taggar.push(`${p.id}:${efter.kvar}s`) }
    await page.waitForTimeout(500)
  }
  console.log(`  ${nat.padEnd(5)} -> ${traff} reaktioner startade ${traff ? '(' + taggar.join(' ') + ')' : 'x'}`)
}
// 3. exit mitt i en reaktion
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(700)
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'natskott-pa-stan' }))
await page.waitForTimeout(1200)
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(600)
console.log(errors.length ? `x ${errors.length} konsolfel: ${errors[0]}` : 'ok 0 konsolfel')
await browser.close()
process.exit(errors.length ? 1 : 0)
