// Regressionstest för "objektet växer för varje tryck"-buggen.
// Trycker snabbare än animationen hinner bli klar (som ett barn som hamrar på
// samma figur) och mäter slutskalan. Före fixen växte den ~1.18x per tryck.
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

const res = await page.evaluate(async () => {
  const fb = await import('/src/lib/feedback.js')
  const mk = () => ({
    destroyed: false,
    rotation: 0,
    x: 100,
    y: 100,
    scale: { x: 1, y: 1, set(x, y) { this.x = x; this.y = y ?? x } },
  })
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // 12 snabba tryck, 60 ms isär (pop-animationen är ~340 ms -> kraftig överlappning)
  const a = mk()
  for (let i = 0; i < 12; i++) { fb.pop(a); await sleep(60) }
  await sleep(700)

  // 12 snabba vinglingar
  const b = mk()
  for (let i = 0; i < 12; i++) { fb.wiggle(b); await sleep(50) }
  await sleep(700)

  // 12 snabba skakningar
  const c = mk()
  for (let i = 0; i < 12; i++) { fb.shake(c, { intensity: 8, duration: 0.4 }); await sleep(60) }
  await sleep(800)

  // Legitim skaländring mellan tryck ska fortfarande respekteras (t.ex. snöboll som växer)
  const d = mk()
  fb.pop(d); await sleep(500)
  d.scale.set(2, 2)          // spelet ändrar viloskalan medan objektet står stilla
  fb.pop(d); await sleep(600)

  return {
    popScale: +a.scale.x.toFixed(3),
    wiggleRot: +b.rotation.toFixed(4),
    shakeX: +c.x.toFixed(2),
    shakeY: +c.y.toFixed(2),
    grownRest: +d.scale.x.toFixed(3),
  }
})

await browser.close()

const ok = (v, exp, tol) => Math.abs(v - exp) <= tol
const checks = [
  ['pop  slutskala', res.popScale, 1, 0.02],
  ['wiggle rotation', res.wiggleRot, 0, 0.01],
  ['shake x', res.shakeX, 100, 0.5],
  ['shake y', res.shakeY, 100, 0.5],
  ['pop respekterar ny viloskala (2.0)', res.grownRest, 2, 0.02],
]
let fail = 0
for (const [namn, v, exp, tol] of checks) {
  const pass = ok(v, exp, tol)
  if (!pass) fail++
  console.log(`  ${pass ? '✓' : '✗'} ${namn.padEnd(36)} ${v}  (väntat ${exp} ±${tol})`)
}
if (errors.length) console.log('  konsolfel:', errors)
console.log(fail ? `\n  ✗ ${fail} kontroll(er) misslyckades\n` : '\n  ✓ alla kontroller gröna\n')
process.exit(fail ? 1 : 0)
