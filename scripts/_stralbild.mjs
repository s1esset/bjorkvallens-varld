// ZACKES BILTVÄTT — vattenstrålen i bild.
//
//   node scripts/_stralbild.mjs        (kräver dev-servern på :5173)
//
// Spolar mot bilen i ett bestämt antal bildrutor och tar en bild per hållpunkt:
// strålen på väg ut, strålen i plåten, och vad som ligger kvar när fingret släpper.
// Talen ligger i `_stralprobe.mjs` — den här filen svarar bara på om det LÄSER som
// vatten.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const UT = '.test-shots'
mkdirSync(UT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('pageerror', (e) => fel.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 160)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'zackes-biltvatt' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._hose, null, { timeout: 15000 })
  await page.waitForTimeout(800)

  const kor = (kropp, arg) => page.evaluate(new Function('arg', `return (async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    const vanta = (n = 1) => new Promise((r) => {
      let i = 0
      const steg = () => (++i >= n ? r() : requestAnimationFrame(steg))
      requestAnimationFrame(steg)
    })
    ${kropp}
  })()`), arg)

  // ⚠️ SAMMA UPPHÄNGNING SOM `_stralprobe`. Sätts bara .x/.y på en verlet-punkt läser
  // solvern skillnaden som en FART och munstycket pendlar — då pekar strålen åt ett
  // annat håll i bilden än det sonden mätte. Båda de två sista punkterna låses med
  // px/py = x/y (noll fart), och riktningen ges av var de ligger mot varandra.
  const HALL = `
    const pts = g._hose.pts
    const a = pts[pts.length - 2]
    const b = pts[pts.length - 1]
    const GX = 300, GY = 250
    const mal = { x: g._car.x, y: g._car.y - 10 }
    const d = Math.hypot(mal.x - GX, mal.y - GY) || 1
    const ux = (mal.x - GX) / d, uy = (mal.y - GY) / d
    const pin = () => {
      a.x = a.px = GX; a.y = a.py = GY
      b.x = b.px = GX + ux * 42; b.y = b.py = GY + uy * 42
    }
  `

  const bild = async (namn) => {
    await page.screenshot({ path: `${UT}/zackes-strale-${namn}.png` })
    console.log(`  ${UT}/zackes-strale-${namn}.png`)
  }

  // Låt slangen sätta sig i det låsta läget innan strålen slås på.
  await kor(`${HALL}
    for (let i = 0; i < 30; i++) { pin(); await vanta(1) }
  `)

  await kor(`${HALL}
    g._hoseDrag = true
    for (let i = 0; i < 14; i++) { pin(); await vanta(1) }
  `)
  await bild('ut')

  await kor(`${HALL}
    for (let i = 0; i < 80; i++) { pin(); await vanta(1) }
  `)
  await bild('i-platen')

  await kor(`${HALL}
    g._hoseDrag = false
    g._hoseAuto = null
    g._hoseTarget = null
    for (let i = 0; i < 55; i++) { pin(); await vanta(1) }
  `)
  await bild('efter-slapp')

  const tal = await kor(`return { partiklar: g._fluid.count, hinder: g._fluid.colliders.length }`)
  console.log(`\n  partiklar i luften/på golvet: ${tal.partiklar} · hinder: ${tal.hinder}`)
  console.log(`  konsolfel: ${fel.length ? fel.slice(0, 3).join(' | ') : 'inga'}\n`)
} finally {
  await browser.close()
}
