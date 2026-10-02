// Nattkörning F2: går varje kägelformation (U2) att slå med SAMMA raka kast som den gamla
// triangeln? Kontrollarm = tri3/tri6/tri10 (HEADs layout). Kastet = tap-fallbackens: rakt mot
// _pinCenter med 62 % av maxkraften. Läser fallna käglor 1,8 s efter kastet (före auto-hjälpen).
//   node scripts/_natt-bowling.mjs [--n 3]       (kräver npm run dev på :5173)
import { chromium } from 'playwright'

const N = Number(process.argv[process.argv.indexOf('--n') + 1]) || 3
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = []
const res = {}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.stack || e).slice(0, 300)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel)
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'bowling' }))
  await page.waitForFunction(() => window.__barnspel.game?.id === 'bowling')
  await page.waitForTimeout(1500)
  for (const level of [0, 2, 4]) {
    for (let k = 0; k < N * 6; k++) {
      const info = await page.evaluate((L) => {
        const g = window.__barnspel.game
        const c = window.__barnspel.ctx
        g._loadLevel(c, L)
        return { id: g._form?.id, n: g._pins.length }
      }, level)
      if ((res[info.id]?.length || 0) >= N) continue
      await page.waitForTimeout(500)
      await page.evaluate(() => {
        const g = window.__barnspel.game
        const c = window.__barnspel.ctx
        const b = g._ballBody.position
        const dx = g._pinCenter.x - b.x
        const dy = g._pinCenter.y - b.y
        const d = Math.hypot(dx, dy)
        g._fire(c, { vx: (dx / d) * 30 * 0.62, vy: (dy / d) * 30 * 0.62 })
      })
      await page.waitForTimeout(1800)
      const ned = await page.evaluate(() => {
        const g = window.__barnspel.game
        return `${g._pins.filter((p) => p.down).length}/${g._pins.length}${g._phase === 'rolling' ? '' : g._phase[0]}`
      })
      ;(res[info.id] ||= []).push(ned)
      await page.waitForTimeout(6500) // låt strike/hjälp/nästa nivå gå klart innan nästa _loadLevel
    }
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(800)
} finally {
  await browser.close()
}
for (const [id, v] of Object.entries(res)) console.log(`${id.padEnd(8)} ${v.join('  ')}`)
console.log(`konsolfel: ${fel.length}`)
fel.slice(0, 4).forEach((f) => console.log('  ' + f))
