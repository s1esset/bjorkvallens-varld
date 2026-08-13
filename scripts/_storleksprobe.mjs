// Hur STORA blir köksprylarna och busföremålen egentligen?
//
// Ägaren: "saker som spottas ut blir annan storlek ... blir förvirrande och plottrigt."
// `_spottprobe` visade att SKALAN är 1 både före och efter ett spott, alltså är det inte
// spottet som ändrar storlek. Kvar står frågan om sakerna är olika stora FRÅN BÖRJAN.
//
// Misstanken kommer ur `skafferi.js`s `passa(g, bredd)`, som normaliserar BREDDEN. För en
// gaffel, kniv eller visp — smala och höga — betyder en bredd på 52 px att höjden blir vad
// den blir. Sonden ritar varje sak och mäter den verkliga rutan.
//
//   node scripts/_storleksprobe.mjs
import { chromium } from 'playwright'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

const matt = await page.evaluate(async () => {
  const { SAKER } = await import('/src/games/mata-munnen/skafferi.js')
  const { FOODS, MAT_STARK, makeFood } = await import('/src/lib/mat.js')
  const ut = []
  for (const [id, s] of Object.entries(SAKER)) {
    let b = null
    try {
      const v = s.rita()
      b = v.getLocalBounds()
      v.destroy?.({ children: true })
    } catch (e) { ut.push({ id, fel: String(e.message).slice(0, 40) }); continue }
    ut.push({ id, grupp: s.atbar === false ? 'bus' : 'mat', w: Math.round(b.width), h: Math.round(b.height) })
  }
  // Tallriksmaten som referens — den är spelets norm och ritas med makeFood(key, 0.75).
  for (const f of [...FOODS, ...MAT_STARK]) {
    const v = makeFood(f.key, 0.75)
    const b = v.getLocalBounds()
    v.destroy?.({ children: true })
    ut.push({ id: f.key, grupp: 'tallrik', w: Math.round(b.width), h: Math.round(b.height) })
  }
  return ut
})

const grupper = ['tallrik', 'mat', 'bus']
for (const g of grupper) {
  const rader = matt.filter((m) => m.grupp === g && !m.fel).sort((a, b) => (b.h * b.w) - (a.h * a.w))
  if (!rader.length) continue
  const ytor = rader.map((r) => r.w * r.h)
  const max = rader[0], min = rader[rader.length - 1]
  console.log(`\n  ${g.toUpperCase()} (${rader.length} st) — störst/minst YTA: ${(ytor[0] / ytor[ytor.length - 1]).toFixed(1)}×`)
  console.log(`    störst: ${max.id} ${max.w}×${max.h}   ·   minst: ${min.id} ${min.w}×${min.h}`)
  const hoga = rader.filter((r) => r.h > 130)
  if (hoga.length) console.log(`    högre än 130 px: ${hoga.map((r) => `${r.id} ${r.w}×${r.h}`).join(' · ')}`)
}

// Det tal som betyder något: hur mycket större är den största saken än tallrikens median?
const tallrik = matt.filter((m) => m.grupp === 'tallrik').map((m) => m.h).sort((a, b) => a - b)
const medianH = tallrik[tallrik.length >> 1]
const varst = matt.filter((m) => m.grupp !== 'tallrik' && !m.fel).sort((a, b) => b.h - a.h)[0]
console.log(`\n  Tallriksmatens median-HÖJD: ${medianH} px`)
console.log(`  Högsta skåpsak: ${varst.id} ${varst.w}×${varst.h} = ${(varst.h / medianH).toFixed(1)}× medianen\n`)
console.log(`  konsolfel: ${fel.length}`)
await browser.close()
