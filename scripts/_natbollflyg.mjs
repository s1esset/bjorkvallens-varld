// _natbollflyg.mjs — flyger nätbollen fritt? Skjuter på en gata UTAN mål och (valfritt) utan
// gatusaker, i HEAD och i arbetskopian, och spelar in banan i sidan bildruta för bildruta.
//   node scripts/_natbollflyg.mjs [--url http://localhost:5174]
import { chromium } from 'playwright'
const args = process.argv.slice(2)
const url = args.indexOf('--url') >= 0 ? args[args.indexOf('--url') + 1] : 'http://localhost:5174'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ut = {}
for (const arm of ['HEAD', 'NY']) {
  for (const utanSaker of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    if (arm === 'HEAD') {
      await page.evaluate(async () => {
        const g = (await import('/src/games/registry.js')).getGame('natskott-pa-stan')
        const head = (await import('/scripts/_natHEAD.mjs')).default
        for (const k of Object.keys(head)) g[k] = head[k]
      })
    }
    await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'natskott-pa-stan' }))
    await page.waitForFunction(() => window.__natdbg && window.__natdbg._alive, null, { timeout: 20000 })
    await page.waitForTimeout(1500)
    const r = await page.evaluate(async (utanSaker) => {
      const m = window.__natdbg
      m._announce = () => {}
      for (const t of [...m._targets]) m._removeTarget(t)
      m._spawnTimer = 999
      if (utanSaker) {
        for (const p of [...m._props]) { if (p.c._wxLjus) p.c._wxLjus.destroy(); p.c.destroy({ children: true }) }
        m._props = []
        m._propTimer = 999
      }
      m._mode = 'boll'
      const ctx = window.__barnspel.ctx
      const spar = []
      const loop = () => {
        for (const b of m._balls || []) { spar.push({ x: Math.round(b.body.position.x), y: Math.round(b.body.position.y), vy: +b.body.velocity.y.toFixed(1) }); break }
        if (spar.length < 400) requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
      m._shootBall(ctx, { x: 880, y: 470 })
      await new Promise((res) => setTimeout(res, 2600))
      const xs = spar.map((b) => b.x)
      const studs = spar.filter((b, i) => i > 0 && spar[i - 1].vy > 1 && b.vy < -1).length
      const props = (m._props || []).map((p) => `${p.def.id}@${Math.round(p.c.x)}`)
      return { px: spar.length ? Math.max(...xs) - Math.min(...xs) : 0, rutor: spar.length, studs, sist: spar[spar.length - 1], props }
    }, utanSaker)
    ut[`${arm}${utanSaker ? '/utan-saker' : ''}`] = r
    await page.close()
  }
}
console.log(JSON.stringify(ut, null, 1))
await browser.close()
