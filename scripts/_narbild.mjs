// Närbild på en yta i ett spel — för att DÖMA EN MIN, inte för att gissa på den.
//
// Karaktärsriggens brynlutning är 0,02–0,3 rad på ett bryn som är 0,32·r brett. I en
// 1280×720-skärmdump är det några få pixlar, och två av tre gånger i den här
// utrullningen har mitt intryck av en 1:1-bild varit fel åt något håll. Sonden
// renderar med `deviceScaleFactor` så pixlarna FINNS (en uppskalning efteråt hittar
// bara på dem) och klipper ut rutan runt ansiktet.
//
//   node scripts/_narbild.mjs <spel-id> --ruta x,y,w,h [--zoom 3] [--vanta 2500]
//     -> .test-shots/<id>-narbild.png
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const arg = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d)
const id = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--ruta' && argv[argv.indexOf(a) - 1] !== '--zoom' && argv[argv.indexOf(a) - 1] !== '--vanta' && argv[argv.indexOf(a) - 1] !== '--url')
const url = arg('--url', 'http://localhost:5173')
const zoom = Number(arg('--zoom', '3'))
const vanta = Number(arg('--vanta', '2500'))
const [rx, ry, rw, rh] = arg('--ruta', '0,0,1280,720').split(',').map(Number)

if (!id) {
  console.error('  Ange ett spel-id: node scripts/_narbild.mjs <id> --ruta x,y,w,h')
  process.exit(1)
}

const SHOTS = path.join(ROOT, '.test-shots')
mkdirSync(SHOTS, { recursive: true })
const ut = path.join(SHOTS, `${id}-narbild.png`)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: zoom })
page.on('pageerror', (e) => console.log(`  ! ${e.message}`))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
await page.waitForTimeout(vanta)

// Designrymden är 1280×720 med letterbox (contain), så rutan måste gå via canvasens
// verkliga läge — annars klipper man ut fel yta så fort fönstret inte är exakt 16:9.
const box = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const s = Math.min(box.w / 1280, box.h / 720)
const ox = box.x + (box.w - 1280 * s) / 2
const oy = box.y + (box.h - 720 * s) / 2

await page.screenshot({ path: ut, clip: { x: ox + rx * s, y: oy + ry * s, width: rw * s, height: rh * s } })
console.log(`  ${ut}  (${rw}×${rh} design-px @ ${zoom}× = ${Math.round(rw * s * zoom)}×${Math.round(rh * s * zoom)} bildpunkter)`)
await browser.close()
