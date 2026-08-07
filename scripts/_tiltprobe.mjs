// Hur mycket måste ett glas luta innan saften faktiskt rinner ur — och VAR landar strålen?
// De två talen hänger ihop: spelet ställer ett hällande glas `OFFS` px vid sidan om målet,
// så en ändrad lutning kräver ett nytt OFFS i samma veva.
//
// Sonden fyller glas 1, låser lutningen, och mäter per vinkel:
//   • hur många partiklar som lämnar glaset (och hur snabbt)
//   • medel-x där de passerar ett stående glas RIMPLAN (y ≈ 400) → det är OFFS
//
//   node scripts/_tiltprobe.mjs [vinklar...]     default: en svep 1.05 → 2.2
import { chromium } from 'playwright'

const ID = 'saftbaren'
const VINKLAR = process.argv.slice(2).map(Number).filter((v) => v > 0)
const SVEP = VINKLAR.length ? VINKLAR : [1.05, 1.3, 1.5, 1.7, 1.9, 2.1, 2.2]
const GLAS_X = 545
const GLAS_Y = 388
const RIM_Y = 400 // ett stående glas rim ligger här (GRATE_Y + IN_TOP)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)

  console.log(`\n  Lutningssond — ${ID}\n`)
  console.log(`  vinkel   rann ur   kvar   halva ur efter   landar vid x   OFFS (landning − glas)`)
  console.log(`  ${'-'.repeat(76)}`)

  for (const v of SVEP) {
    const r = await page.evaluate(
      async ({ gid, v, gx, gy, rim }) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        const w = g._world
        w.clear()
        const gl = g._glasses[1]
        gl.x = gx
        gl.y = gy
        gl.angle = 0
        gl.wantAngle = 0
        g._busy = true // håll beställnings-/drickslogiken borta från mätningen
        for (let r = 0; r < 13; r++)
          for (let c = 0; c < 8; c++) w.spawn(gx - 49 + c * 14, gy - 36 - r * 15, { pal: 1, ch: [0, 1, 0] })
        await new Promise((res) => setTimeout(res, 900))
        const fore = g._stats(gl).n

        gl.wantAngle = v
        // Räkna partiklar som passerar rimplanet UTANFÖR glaset → det är strålen.
        let sumX = 0
        let nX = 0
        let halva = null
        const t0 = performance.now()
        const IN_W = 114, IN_TOP = -220, IN_BOT = -22
        for (let steg = 0; steg < 300; steg++) {
          await new Promise((res) => setTimeout(res, 16))
          const ca = Math.cos(-gl.angle)
          const sa = Math.sin(-gl.angle)
          for (let i = 0; i < w.count; i++) {
            const y = w.y[i]
            if (y < rim - 12 || y > rim + 12) continue
            const dx = w.x[i] - gl.x
            const dy = y - gl.y
            const lx = dx * ca - dy * sa
            const ly = dx * sa + dy * ca
            if (Math.abs(lx) < IN_W / 2 && ly < IN_BOT && ly > IN_TOP - 20) continue // inne i glaset
            sumX += w.x[i]
            nX++
          }
          if (halva === null && g._stats(gl).n <= fore / 2) halva = Math.round(performance.now() - t0)
        }
        const efter = g._stats(gl).n
        g._busy = false
        return { fore, efter, halva, landning: nX ? sumX / nX : null, prov: nX, vinkel: Number(gl.angle.toFixed(2)) }
      },
      { gid: ID, v, gx: GLAS_X, gy: GLAS_Y, rim: RIM_Y },
    )
    const ur = r.fore - r.efter
    const land = r.landning == null ? '     —' : Math.round(r.landning).toString().padStart(6)
    const offs = r.landning == null ? '   —' : Math.round(r.landning - GLAS_X).toString().padStart(4)
    console.log(
      `  ${String(v).padEnd(7)} ${String(ur).padStart(6)}/${r.fore}  ${String(r.efter).padStart(5)}` +
        `   ${(r.halva == null ? 'aldrig' : r.halva + ' ms').padStart(14)}   ${land}         ${offs}  (${r.prov} prov)`,
    )
  }
  console.log(`\n  Spelet kör i dag TILT = 1.05 och OFFS = 205.`)
  console.log(`  ${errors.length ? '✗ ' + errors.join(' | ') : '✓ 0 konsolfel'}\n`)
} finally {
  await browser.close()
}
