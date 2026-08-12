// Diagnostik: VILKA noder ar det som ror sig i vilofonstret? Storlek + typ + namn.
// Skriven for att verifiera ett PASTAENDE ("de tre var snoflingorna") i stallet for
// att lita pa det. `_stillaprobe` sager bara HUR MANGA.
//   node scripts/_vilkaprobe.mjs <id>
import { chromium } from 'playwright'
const ID = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
  const ut = await page.evaluate(async () => {
    const stage = window.__barnspel.ctx.stage
    const noder = []
    const gata = (n, d, v) => { if (!n || n.destroyed) return; noder.push({ n, d, v }); (n.children || []).forEach((c, i) => gata(c, d + 1, v + '/' + (c.constructor?.name || '?') + i)) }
    gata(stage, 0, 'stage')
    const las = (o) => { const w = o.n.worldTransform; return [w.tx, w.ty, w.tx + w.a * 40 + w.c * 40, w.ty + w.b * 40 + w.d * 40] }
    const T0 = performance.now()
    while (performance.now() - T0 < 4500) await new Promise((r) => requestAnimationFrame(r))
    const mn = noder.map(() => [Infinity, Infinity, Infinity, Infinity])
    const mx = noder.map(() => [-Infinity, -Infinity, -Infinity, -Infinity])
    while (performance.now() - T0 < 5900) {
      for (let i = 0; i < noder.length; i++) { if (noder[i].n.destroyed) continue; const v = las(noder[i]); for (let k = 0; k < 4; k++) { if (v[k] < mn[i][k]) mn[i][k] = v[k]; if (v[k] > mx[i][k]) mx[i][k] = v[k] } }
      await new Promise((r) => requestAnimationFrame(r))
    }
    const rad = []
    for (let i = 0; i < noder.length; i++) {
      let d = 0
      for (let k = 0; k < 4; k++) { const s = mx[i][k] - mn[i][k]; if (Number.isFinite(s) && s > d) d = s }
      if (d <= 0.5) continue
      let b = { width: 0, height: 0 }
      try { b = noder[i].n.getLocalBounds() } catch {}
      const w = noder[i].n.worldTransform
      rad.push({ vag: noder[i].v.slice(-60), typ: noder[i].n.constructor?.name, barn: (noder[i].n.children || []).length,
        px: +d.toFixed(1), bw: Math.round(Math.abs(b.width * w.a)), bh: Math.round(Math.abs(b.height * w.d)) })
    }
    return rad.sort((a, b) => b.bw * b.bh - a.bw * a.bh)
  })
  console.log(`\n  ${ID} — noder i rorelse i vilofonstret:\n`)
  for (const r of ut) console.log(`  ${String(r.px).padStart(7)} px  ${String(r.bw).padStart(5)}x${String(r.bh).padEnd(5)} = ${String(r.bw * r.bh).padStart(8)} px2  ${r.typ}(${r.barn} barn)  ${r.vag}`)
  console.log(`\n  ${ut.length} noder\n`)
} finally { await browser.close() }
