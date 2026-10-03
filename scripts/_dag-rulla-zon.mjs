// KULLAR OCH GROPAR (F4, rulla-bollen-hem, dag 2026-10-03 D14) — samma skott två gånger på level 4 (bana 5)
// (kulle + grop): kontrollarmen utan zoner (`_clearZoner()`, dagens HEAD-beteende) FÖRST, sedan med
// zonerna. Bollen skjuts mot zonens mitt med fast fart; vi läser var den stannar och att den aldrig
// lämnar planen. Två rundor med exit mitt i rullen.
//
//   node scripts/_dag-rulla-zon.mjs [--url …]
// Skärmdump: .test-shots/_dag-rulla-zon-<level>.png (banan med zonerna, före skottet)
// MÄTNING: armarna skiljer sig (zonen böjer/bromsar) · bollen inom 0..1280 × 0..720 · 0 konsolfel.
import { chromium } from 'playwright'

const URL = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'rulla-bollen-hem'
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  // Ett skott från start mot zon[i]:s mitt. Returnerar slutläge + min/max under rullen.
  const skott = async (medZoner, zi, fart, level) => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1500)
    const info = await page.evaluate(({ medZoner, zi, level }) => {
      const g = window.__barnspel.game, ctx = window.__barnspel.ctx
      g._loadLevel(ctx, level)
      g._clearObstacles() // båda armarna utan hinder: bara zonen skiljer
      const z = g._zoner.map((z) => ({ typ: z.typ, x: Math.round(z.x), y: Math.round(z.y) }))
      const b = g._ballBody.position
      return { z, start: { x: Math.round(b.x), y: Math.round(b.y) }, medZoner, zi }
    }, { medZoner, zi, level })
    await page.waitForTimeout(700)
    if (medZoner && zi === 0) await page.screenshot({ path: `.test-shots/_dag-rulla-zon-${level}.png` })
    const res = await page.evaluate(async ({ medZoner, zi, fart, mal }) => {
      const g = window.__barnspel.game, ctx = window.__barnspel.ctx
      const b = g._ballBody.position
      const d0 = Math.hypot(mal.x - b.x, mal.y - b.y) || 1
      // sikta 50 px vid sidan av mitten, så kullen böjer av och gropen drar in
      const mx = mal.x - ((mal.y - b.y) / d0) * 50, my = mal.y + ((mal.x - b.x) / d0) * 50
      const dx = mx - b.x, dy = my - b.y, d = Math.hypot(dx, dy) || 1
      if (!medZoner) g._clearZoner()
      g._shoot(ctx, (dx / d) * fart, (dy / d) * fart)
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
      for (let i = 0; i < 160; i++) {
        await new Promise((r) => setTimeout(r, 50))
        if (!g._ballBody) break
        const p = g._ballBody.position
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
        if (g._mode !== 'rolling') break
      }
      const p = g._ballBody.position
      return { slut: { x: Math.round(p.x), y: Math.round(p.y) }, mode: g._mode, minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY) }
    }, { medZoner, zi, fart, mal: info.z[zi] || { x: 1000, y: 400 } })
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(300)
    return { ...info, ...res }
  }

  for (const level of [2, 4, 5]) {
    for (const zi of [0, 1]) {
      for (const fart of [16, 24]) {
        const utan = await skott(false, zi, fart, level)
        if (!utan.z[zi]) break
        const med = await skott(true, zi, fart, level)
        const typ = med.z[zi]?.typ
        console.log(`  level ${level} zon ${zi} (${typ} @ ${med.z[zi]?.x},${med.z[zi]?.y}) fart ${fart}: utan → ${utan.slut.x},${utan.slut.y} (${utan.mode}) · med → ${med.slut.x},${med.slut.y} (${med.mode})`)
        const skillnad = Math.hypot(med.slut.x - utan.slut.x, med.slut.y - utan.slut.y)
        ok(`    zonen ändrar banan`, skillnad > 15 || med.mode !== utan.mode, `${Math.round(skillnad)} px`)
        for (const [arm, r] of [['utan', utan], ['med', med]]) {
          ok(`    ${arm}: inom bild`, r.minX >= 0 && r.maxX <= 1280 && r.minY >= 0 && r.maxY <= 720, `x ${r.minX}..${r.maxX} y ${r.minY}..${r.maxY}`)
        }
      }
    }
  }

  // Exit mitt i rullen, två rundor.
  for (const runda of [1, 2]) {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1200)
    await page.evaluate(() => { const g = window.__barnspel.game, ctx = window.__barnspel.ctx; g._loadLevel(ctx, 6 + 3 * Math.random() | 0); g._shoot(ctx, 14, -3) })
    await page.waitForTimeout(250)
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(600)
  ok('0 konsolfel (exit mitt i rullen, två rundor)', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
console.log(fel ? `\n✗ ${fel} fel` : '\n✓ grönt')
process.exit(fel ? 1 : 0)
