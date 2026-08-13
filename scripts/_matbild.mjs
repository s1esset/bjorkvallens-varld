// Rita saker ur `mata-munnen`s katalog i ett rutnät, stort nog att bedöma.
//
// `_kokprobe` svarar på om en nyckel ritar NÅGOT (och att det inte är reservcirkeln), men
// inte på om det ser ut som det ska föreställa. En böna som blev en brun klick och en kål
// som blev en grön boll passerar varje tal man kan sätta.
//
//   node scripts/_matbild.mjs bonor kal [--skala 2.6] [--ut .test-shots/_matbild.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const nycklar = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const SKALA = +opt('--skala', 2.6)
const UT = opt('--ut', '.test-shots/_matbild.png')
const url = opt('--url', 'http://localhost:5173')
if (!nycklar.length) { console.error('  ange minst en nyckel'); process.exit(1) }

const kol = Math.min(nycklar.length, 4)
const rad = Math.ceil(nycklar.length / kol)
const RUTA = 300

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: kol * RUTA, height: rad * RUTA } })
const fel = []
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
// Ett spel måste vara monterat: Pixi-appen och `_root` skapas av GameHost, inte av skalet.
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'mata-munnen' }))
await page.waitForFunction(() => !!window.__barnspel.game?._root, null, { timeout: 15000 })
await page.waitForTimeout(1200)

const matt = await page.evaluate(async ({ nycklar, SKALA, RUTA, kol }) => {
  const g = window.__barnspel.game
  const mod = await import('/src/games/mata-munnen/skafferi.js')
  g._root.removeChildren()
  const ut = []
  nycklar.forEach((k, i) => {
    const v = mod.makeSak(k)
    v.position.set((i % kol) * RUTA + RUTA / 2, Math.floor(i / kol) * RUTA + RUTA / 2)
    v.scale.set(SKALA)
    g._root.addChild(v)
    const b = v.getLocalBounds()
    ut.push({ k, w: Math.round(b.width), h: Math.round(b.height) })
  })
  return ut
}, { nycklar, SKALA, RUTA, kol })

await page.waitForTimeout(500)
await page.screenshot({ path: UT })
await browser.close()
for (const m of matt) console.log(`  ${m.k.padEnd(14)} ${m.w}×${m.h} px`)
console.log(`  ${fel.length} konsolfel · bild: ${UT}\n`)
