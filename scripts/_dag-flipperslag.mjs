// FLIPPERSLAGET — vad får en kula som paddeln slår i rörelse? (R2, dag 2026-10-02 D7)
//
//   node scripts/_dag-flipperslag.mjs [reps]        (kräver dev-servern på :5173)
//
// Paddeln var en statisk kropp vars vinkel skrevs om varje bildruta: ingen fart, så en kula
// den svepte in i fick bara den skriptade kicken (`_tryKick`, inom 59 px) eller skyfflades/
// tunnlade. R2 gör paddeln kinematisk. Sonden lägger kulan stilla på slagsidan av vänster
// paddel på avstånd d från mittlinjen vid andel t av längden, trycker paddeln (spelets _flip)
// och följer kulan 45 bildrutor:
//   igenom   = kulans centrum bytte sida om paddelns mittlinje inom paddelns längd
//   fart     = högsta fart (px/steg) — spelets fartspärr är 27
//   ut       = kulan lämnade 0..1280 / steg över y −60
//   uppåt    = kulans lägsta y-fart (negativ = uppåt, det barnet vill se)
// Kontrollarm: HEAD.
import { chromium } from 'playwright'

const reps = Number(process.argv[2] || 2)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'flipperspel' }))
  await page.waitForTimeout(2500)
  const res = await page.evaluate(async (reps) => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /matter/.test(n))
    const M = await import(url)
    const Body = (M.default || M).Body
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const raf = () => new Promise((r) => requestAnimationFrame(r))
    const p = g._paddles.find((q) => q.side === 'left')
    const ut = []
    for (let rep = 0; rep < reps; rep++) {
      for (const d of [62, 75, 95]) {
        for (const t of [0.5, 0.8, 1.0]) {
          // Paddeln i vila.
          g._pressMs.left = 0
          for (let i = 0; i < 30; i++) await raf()
          const a = p.ang
          const ax = p.pivotX, ay = p.pivotY
          const ux = Math.cos(a), uy = Math.sin(a)
          const nx = p.ks * -Math.sin(a), ny = p.ks * Math.cos(a)
          const L = 150
          const sx = ax + ux * L * t, sy = ay + uy * L * t
          const b = g._ball
          Body.setPosition(b, { x: sx + nx * d, y: sy + ny * d })
          Body.setVelocity(b, { x: 0, y: 0 })
          g._resolving = false
          g._flip(ctx, 'left')
          let igenom = false, fart = 0, ute = false, uppat = 0
          let fore = null
          for (let i = 0; i < 45; i++) {
            await raf()
            const bb = g._ball
            if (!bb) break
            const pa = p.ang
            const qx = bb.position.x - p.pivotX, qy = bb.position.y - p.pivotY
            const along = qx * Math.cos(pa) + qy * Math.sin(pa)
            const perp = -qx * Math.sin(pa) * p.ks + qy * Math.cos(pa) * p.ks
            if (along >= 0 && along <= L) {
              const sg = Math.sign(perp)
              if (fore !== null && sg !== fore && Math.abs(perp) < 60) igenom = true
              fore = sg
            }
            fart = Math.max(fart, Math.hypot(bb.velocity.x, bb.velocity.y))
            uppat = Math.min(uppat, bb.velocity.y)
            if (bb.position.x < 0 || bb.position.x > 1280 || bb.position.y < -60) ute = true
          }
          ut.push({ d, t, igenom, fart: Number(fart.toFixed(1)), uppat: Number(uppat.toFixed(1)), ute })
        }
      }
    }
    return ut
  }, reps)
  const n = res.length
  const sum = {
    slag: n,
    igenom: res.filter((r) => r.igenom).length,
    ut: res.filter((r) => r.ute).length,
    fartMedian: res.map((r) => r.fart).sort((a, b) => a - b)[Math.floor(n / 2)],
    uppatMedian: res.map((r) => r.uppat).sort((a, b) => a - b)[Math.floor(n / 2)],
    traffadeUppat: res.filter((r) => r.uppat < -5).length,
  }
  const perD = {}
  for (const r of res) (perD['d' + r.d] ||= []).push(r.uppat)
  console.log(JSON.stringify({ ...sum, uppatPerD: Object.fromEntries(Object.entries(perD).map(([k, v]) => [k, v.join(' ')])), antalFel: errors.length, errors: errors.slice(0, 4) }, null, 2))
} finally {
  await browser.close()
}
