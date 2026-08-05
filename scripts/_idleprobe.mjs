// Mäter om ett spel klarar sig SJÄLVT. No-fail får aldrig betyda att mätaren
// fylls medan barnet tittar på — då är varje tryck dekoration. Sonden nollställer
// spelets progress, låter det stå orört i N sekunder, och spelar sedan en stund
// med riktade tryck. Utfallet ska vara: utanInput = 0, efterSpel > 0.
//
//   node scripts/_idleprobe.mjs <id> [sekunder] [--tap "x,y"] [--shot ut.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const id = args[0]
const secs = Number(args[1] || 60)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const tap = (opt('--tap', '900,240')).split(',').map(Number)
const shot = opt('--shot', '')

if (!id) {
  console.error('usage: node scripts/_idleprobe.mjs <id> [sekunder] [--tap "x,y"] [--shot ut.png]')
  process.exit(2)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  // Nollställ ALL sparad progress så mätningen börjar på nivå 0.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(1200)

  // Räknar framsteg: högsta numeriska progress-fältet som sparats för spelet.
  const read = () => page.evaluate((gid) => {
    let best = 0
    for (const k of Object.keys(localStorage)) {
      const raw = localStorage.getItem(k)
      if (!raw || !raw.includes(gid)) continue
      let data
      try { data = JSON.parse(raw) } catch { continue }
      const walk = (o) => {
        if (!o || typeof o !== 'object') return
        for (const [key, val] of Object.entries(o)) {
          if (key === gid && val && typeof val === 'object') {
            for (const f of ['highestLevel', 'level', 'completions', 'stars', 'plays']) {
              if (Number.isFinite(val[f])) best = Math.max(best, val[f])
            }
          }
          walk(val)
        }
      }
      walk(data)
    }
    return best
  }, id)

  const press = (x, y) => page.evaluate(({ x, y }) => {
    const cv = document.querySelector('canvas')
    const r = cv.getBoundingClientRect()
    for (const t of ['pointerdown', 'pointerup']) {
      cv.dispatchEvent(new PointerEvent(t, {
        clientX: r.left + x, clientY: r.top + y,
        pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
      }))
    }
  }, { x, y })

  // Fas 1: rör ingenting.
  const start = Date.now()
  const utanInput = []
  for (let t = 10; t <= secs; t += 10) {
    while (Date.now() - start < t * 1000) await page.waitForTimeout(400)
    utanInput.push({ t, framsteg: await read() })
  }
  const idleFramsteg = await read()

  // Fas 2: spela. Målet kan FLYTTA mellan nivåer, så en fast tryckpunkt mäter
  // ingenting (första versionen siktade envist på nivå 0:s ring och missade
  // resten). Svep i stället över hela bredden, som ett barn som letar rätt.
  const sweep = [280, 380, 520, 640, 760, 900, 1010]
  for (let i = 0; i < 60; i++) {
    await press(sweep[i % sweep.length], tap[1] + (i % 3) * 24 - 24)
    await page.waitForTimeout(500)
  }
  const efterSpel = await read()
  if (shot) await page.screenshot({ path: shot })

  console.log(JSON.stringify({ id, secs, utanInput, idleFramsteg, efterSpel, errors }, null, 2))
} finally {
  await browser.close()
}
