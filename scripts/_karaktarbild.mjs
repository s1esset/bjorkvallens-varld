// Ritar karaktärsriggens alla humör i ett rutnät och tar en skärmdump.
// En min går inte att bedöma i tal — den måste SES. Sonden finns för att ett
// humörbyte som ser rätt ut i tabellen (ögonlock 0.62, bryn −0.3) mycket väl kan
// läsa som "arg" eller "trött" i bild.
//
//   node scripts/_karaktarbild.mjs [--shot .test-shots/karaktarer.png] [--r 62]
//   node scripts/_karaktarbild.mjs --reaktion jubel   # frys mitt i en reaktion
//
// Kräver dev-servern (window.__barnspel är DEV-only).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '.test-shots/karaktarer.png')
const r = Number(opt('--r', 62))
const reaktion = opt('--reaktion', null)
const url = opt('--url', 'http://localhost:5173')
mkdirSync(dirname(shot), { recursive: true })

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)

  const namn = await page.evaluate(async ({ r, reaktion }) => {
    // OBS: bara PROJEKTETS egna sökvägar går att importera här. En bar specifier
    // ('pixi.js') resolvas av Vite i modulgrafen, inte i webbläsarens import() —
    // den kastar "Failed to resolve module specifier". Bakgrunden ritas därför med
    // createScene, vilket ändå är en ärligare bakgrund att bedöma en figur mot.
    const { makeKaraktar, MOODS } = await import('/src/lib/karaktarer.js')
    const { createScene } = await import('/src/lib/scene.js')
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (c.__galleri) c.removeFromParent()

    const duk = createScene('meadow', { width: 1280, height: 720 })
    duk.__galleri = true
    layer.addChild(duk)

    const lista = Object.keys(MOODS)
    const cols = 4
    const cellW = 1280 / cols
    const cellH = 700 / Math.ceil(lista.length / cols)
    window.__karaktarer = []
    lista.forEach((m, i) => {
      const k = makeKaraktar({ r, idle: false })
      k.view.position.set((i % cols) * cellW + cellW / 2, Math.floor(i / cols) * cellH + cellH * 0.34)
      k.setMood(m, { direkt: true })
      if (reaktion) k.react(reaktion)
      k.view.__galleri = true
      layer.addChild(k.view)
      window.__karaktarer.push(k)
    })
    return lista
  }, { r, reaktion })

  await page.waitForTimeout(reaktion ? 260 : 500)
  await page.screenshot({ path: shot })

  // Exit-säkerhet i samma körning: riv alla riggar och se att ingenting kastar.
  await page.evaluate(() => {
    for (const k of window.__karaktarer || []) k.destroy()
    window.__karaktarer = []
  })
  await page.waitForTimeout(500)

  console.log(`\n  ${namn.length} humör: ${namn.join(' · ')}`)
  console.log(`  bild: ${shot}`)
  console.log(errors.length ? `  ✗ ${errors.length} konsolfel:\n     ${errors.slice(0, 5).join('\n     ')}` : '  ✓ 0 konsolfel (inkl. destroy)')
} finally {
  await browser.close()
}
process.exit(errors.length ? 1 : 0)
