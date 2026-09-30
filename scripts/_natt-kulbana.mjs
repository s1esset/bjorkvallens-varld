// Nattkörningen 2026-09-30/10-01: `kulbana` — SLÄPP flyttades bort från hemknappen. Sonden
// trycker med RIKTIGA muspekningar: SLÄPP släpper kulan, två banor spelas i mål (hjälpvägen:
// miss → hand → luta → släpp → ev. glid hem), bana 4 får en propeller dragen ut i fältet och
// kulan släpps genom den, och sist ett tryck i hemknappens nedre kant som ska gå HEM.
//   node scripts/_natt-kulbana.mjs
import { chromium } from 'playwright'

const ID = 'kulbana'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })
  await page.waitForTimeout(1800)

  const skarm = (x, y) => page.evaluate(([x, y]) => {
    const b = window.__barnspel
    const c = b.app.canvas.getBoundingClientRect()
    const s = c.width / b.app.renderer.width
    return { x: c.left + x * s, y: c.top + y * s }
  }, [x, y])
  const klick = async (x, y) => { const p = await skarm(x, y); await page.mouse.click(p.x, p.y) }
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game
    if (!g || g.id !== 'kulbana') return { borta: true }
    const h = g._helpBtn, r = g._releaseBtn
    return {
      lvl: g._level, fall: !!g._falling, res: !!g._resolving, glid: !!g._gliding,
      hjalp: !!(h && !h.destroyed && h.visible), hx: h && Math.round(h.x), hy: h && Math.round(h.y),
      rx: r && Math.round(r.x), ry: r && Math.round(r.y),
      delar: g._parts.map((p) => ({ k: p.kind ?? p._kind, x: Math.round(p.x), y: Math.round(p.y) })),
    }
  })
  const vantaLugn = async (ms = 30000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { const s = await stat(); if (!s.fall && !s.res && !s.glid) return true; await page.waitForTimeout(150) }
    return false
  }

  const s0 = await stat()
  ok('SLÄPP-knappen står där sonden väntar sig', s0.rx != null, `SLÄPP (${s0.rx},${s0.ry}) hand (${s0.hx},${s0.hy})`)

  const spelaBana = async () => {
    const start = await stat()
    const steg = []
    for (let f = 0; f < 6; f++) {
      const s = await stat()
      if (s.lvl !== start.lvl) break
      if (s.hjalp && f > 0) { await klick(s.hx, s.hy); steg.push('hand'); await page.waitForTimeout(400); await vantaLugn(); const q = await stat(); if (q.lvl !== start.lvl) break }
      await klick(s0.rx, s0.ry)
      await page.waitForTimeout(150)
      const q = await stat()
      steg.push(q.fall || q.glid || q.res ? 'släpp' : 'släpp-DOG')
      await vantaLugn()
      await page.waitForTimeout(1500)
    }
    // vänta in banbytet (firande)
    const t0 = Date.now()
    while (Date.now() - t0 < 8000 && (await stat()).lvl === start.lvl) await page.waitForTimeout(200)
    const e = await stat()
    return { fran: start.lvl, till: e.lvl, steg: steg.join(',') }
  }
  const b1 = await spelaBana()
  ok('SLÄPP med riktigt tryck släpper kulan', !b1.steg.includes('DOG'), b1.steg)
  ok('bana 1 spelas i mål', b1.till > b1.fran, `${b1.fran} -> ${b1.till} (${b1.steg})`)
  const b2 = await spelaBana()
  ok('bana 2 spelas i mål', b2.till > b2.fran, `${b2.fran} -> ${b2.till} (${b2.steg})`)

  // Propellern: ladda bana 4, dra ut propellern till ett läge under rännan, släpp kulan
  await page.evaluate(() => { const g = window.__barnspel.game, c = window.__barnspel.ctx; g._level = 4; g._loadLevel(c, 4) })
  await page.waitForTimeout(1500)
  const s4 = await stat()
  const prop = s4.delar.find((d) => d.k === 'propeller')
  ok('bana 4 har en propeller på hyllan', !!prop, JSON.stringify(s4.delar))
  if (prop) {
    const a = await skarm(prop.x, prop.y)
    await page.mouse.move(a.x, a.y); await page.mouse.down()
    for (let k = 1; k <= 14; k++) { const p = await skarm(prop.x + (380 - prop.x) * k / 14, prop.y + (330 - prop.y) * k / 14); await page.mouse.move(p.x, p.y); await page.waitForTimeout(25) }
    await page.mouse.up()
    await page.waitForTimeout(600)
    const s5 = await stat()
    const p2 = s5.delar.find((d) => d.k === 'propeller')
    ok('propellern gick att dra ut i fältet', p2 && p2.y < 600, JSON.stringify(p2))
    await page.screenshot({ path: '.test-shots/_kulbana-propeller.png' })
    await klick(s0.rx, s0.ry)
    const t0 = Date.now()
    await page.waitForTimeout(300)
    const lugn = await vantaLugn(26000)
    ok('kulan genom propellern tar slut (<26 s)', lugn, `${Math.round((Date.now() - t0) / 100) / 10} s`)
  }

  // Hem: tryck i hemknappens NEDRE kant (x 70, y 128 = inom dess halo, 46 px ovanför SLÄPP:s halo)
  const felFore = errors.length
  await klick(70, 128)
  await page.waitForTimeout(1500)
  const hem = await stat()
  ok('tryck vid hemknappens kant går HEM', hem.borta, JSON.stringify(hem).slice(0, 80))
  await page.waitForTimeout(1500)
  ok('0 konsolfel efter exit', errors.length === felFore, errors.slice(felFore).join(' | '))
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn}  — ${r.text}`)
process.exit(rader.every((r) => r.ok) ? 0 : 1)
