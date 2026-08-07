// Hur mycket måste ett glas luta innan saften faktiskt rinner ur? Spelets TILT är
// 1,05 rad. Sonden fyller glas 1, låser lutningen på ett givet värde och mäter hur
// många partiklar som lämnar glaset.  node scripts/_tiltprobe.mjs
import { chromium } from 'playwright'
const ID = 'saftbaren'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)
  console.log('\n  Lutningssond — saftbaren (spelets TILT = 1.05 rad)\n')
  for (const v of [1.05, 1.2, 1.35, 1.5, 1.7]) {
    const r = await page.evaluate(
      async ({ gid, v }) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        g._world.clear()
        const gl = g._glasses[1]
        gl.x = 545; gl.y = 388; gl.angle = 0; gl.wantAngle = 0
        for (let r = 0; r < 13; r++)
          for (let c = 0; c < 8; c++) g._world.spawn(gl.x - 49 + c * 14, gl.y - 36 - r * 15, { pal: 1, ch: [0, 1, 0] })
        await new Promise((res) => setTimeout(res, 900))
        const fore = g._stats(gl).n
        gl.wantAngle = v
        g._busy = true // hindra att beställningen löser ut mitt i mätningen
        await new Promise((res) => setTimeout(res, 3500))
        const efter = g._stats(gl).n
        g._busy = false
        return { fore, efter, vinkel: Number(gl.angle.toFixed(2)) }
      },
      { gid: ID, v },
    )
    console.log(`     lutning ${v} rad (nådde ${r.vinkel}): ${r.fore} → ${r.efter} kvar i glaset, ${r.fore - r.efter} rann ur`)
  }
  console.log('')
} finally {
  await browser.close()
}
