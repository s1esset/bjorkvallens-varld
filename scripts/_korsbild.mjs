// KUGGHJULEN — remmen rak mot korsad, i bild.
//
//   node scripts/_korsbild.mjs        (kräver dev-servern på :5173)
//
// `_korsprobe.mjs` svarar på om tecknet vänds och om spannen skär varandra. Den kan
// inte svara på om X:et LÄSES som ett X. Två skärmdumpar av samma maskin, beskurna
// runt remspannet, är den enda mätning som duger på den frågan.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const UT = '.test-shots'
mkdirSync(UT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'kugghjulen' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._crank, null, { timeout: 15000 })
  await page.waitForTimeout(600)

  const bygg = await page.evaluate(() => new Promise((klar) => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    g._buildLevel(ctx, 5)
    requestAnimationFrame(() => {
      for (const s of g._solutionPegs) g._spawnGear(ctx, s.peg, s.size, {})
      g._placeRem(ctx)
      g._rebuildMesh(ctx)
      setTimeout(() => klar({ slot: g._rem.slot, korsad: g._rem.korsad }), 400)
    })
  }))

  // Beskär runt remspannet så X:et fyller bilden i stället för hela verkstaden.
  const sc = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, s: r.width / 1280 }
  })
  const ruta = {
    x: Math.round(sc.x + (bygg.slot.x - 260) * sc.s),
    y: Math.round(sc.y + (bygg.slot.y - 190) * sc.s),
    width: Math.round(520 * sc.s),
    height: Math.round(380 * sc.s),
  }

  await page.screenshot({ path: `${UT}/kugghjulen-rem-rak.png`, clip: ruta })
  console.log(`  ${UT}/kugghjulen-rem-rak.png`)

  await page.evaluate(() => window.__barnspel.game._vandRem(window.__barnspel.ctx))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${UT}/kugghjulen-rem-korsad.png`, clip: ruta })
  console.log(`  ${UT}/kugghjulen-rem-korsad.png`)

  // Och hela skärmen i korsat läge — vänd-ringen och maskinen i sitt sammanhang.
  await page.screenshot({ path: `${UT}/kugghjulen-rem-korsad-hel.png` })
  console.log(`  ${UT}/kugghjulen-rem-korsad-hel.png`)
} finally {
  await browser.close()
}
