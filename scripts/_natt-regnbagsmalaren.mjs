// Nattkörning F2: går tvillingvarianten (två bågar med VAR SITT centrum) att måla med
// riktiga musdrag? Harnessens auto-drag målar inga bågar. Två rundor, otåligt.
//   node scripts/_natt-regnbagsmalaren.mjs [variant=tvillingar]   (kräver npm run dev på :5173)
import { chromium } from 'playwright'

const VARIANT = process.argv[2] || 'tvillingar'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = []
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.stack || e).slice(0, 600)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel)
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'regnbagsmalaren' }))
  await page.waitForFunction(() => window.__barnspel.game?.id === 'regnbagsmalaren')
  await page.waitForTimeout(1500)
  const sk = await page.evaluate(() => {
    const r = document.querySelector('canvas').getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { s, ox: r.left + (r.width - 1280 * s) / 2, oy: r.top + (r.height - 720 * s) / 2 }
  })
  const P = (x, y) => [sk.ox + x * sk.s, sk.oy + y * sk.s]

  for (let runda = 1; runda <= 2; runda++) {
    // Runda 2 byggs av SPELET självt (ett tvingat _buildRound mitt i firandet lämnar tweens —
    // på HEAD också, så det är sondens artefakt, inte barnets väg).
    if (runda > 1) await page.waitForFunction(() => { const g = window.__barnspel.game; return !g._resolving && g._arcs.every((a) => !a.done) }, null, { timeout: 15000 })
    const id = (runda > 1 || process.env.NOFORCE) ? await page.evaluate(() => window.__barnspel.game._variant?.id) : await page.evaluate((v) => {
      const g = window.__barnspel.game
      for (let i = 0; i < 40; i++) {
        g._level = 3 + i
        g._buildRound()
        if (g._variant?.id === v) break
      }
      return g._variant?.id
    }, VARIANT)
    await page.waitForTimeout(400); console.log('  fel efter ombygge: ' + fel.length)
    let drag = 0
    for (let varv = 0; varv < 30; varv++) {
      const st = await page.evaluate(() => {
        const g = window.__barnspel.game
        const a = g._arcs[g._active]
        return { n: g._arcs.length, klara: g._arcs.filter((x) => x.done).length, act: g._active, a: a && !a.done ? { cx: a.cx ?? 640, cy: a.cy ?? 600, R: a.R } : null, res: g._resolving }
      })
      if (st.klara === st.n) break
      if (!st.a || st.res) { await page.waitForTimeout(300); continue }
      // Svep vänster fot → topp → höger fot runt AKTIV bågs eget centrum.
      const pts = []
      for (let k = 0; k <= 24; k++) {
        const t = Math.PI + (Math.PI * k) / 24
        pts.push(P(st.a.cx + Math.cos(t) * st.a.R, st.a.cy + Math.sin(t) * st.a.R))
      }
      await page.mouse.move(...pts[0])
      await page.mouse.down()
      for (const p of pts.slice(1)) { await page.mouse.move(...p); await page.waitForTimeout(16) }
      await page.mouse.up()
      drag++
      await page.waitForTimeout(450)
    }
    const slut = await page.evaluate(() => {
      const g = window.__barnspel.game
      return { klara: g._arcs.filter((x) => x.done).length, n: g._arcs.length, res: g._resolving, cx: [...new Set(g._arcs.map((a) => a.cx | 0))].join('/') }
    })
    const ok = slut.klara === slut.n
    if (!ok) kod = 1
    console.log(`${ok ? '✓' : '✗'} runda ${runda}: variant ${id} · ${slut.klara}/${slut.n} bågar klara på ${drag} drag · centra x ${slut.cx}`)
    console.log('  fel hittills: ' + fel.length); await page.waitForTimeout(Number(process.env.VILA || 600))
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1500)
} finally {
  await browser.close()
}
console.log(`konsolfel: ${fel.length}`)
fel.slice(0, 6).forEach((f) => console.log('  ' + f))
process.exit(kod || (fel.length ? 1 : 0))
