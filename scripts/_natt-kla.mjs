// Nattkörningen 2026-09-30: `kla-efter-vadret` — går det att klä Elvira från klädstrecket med
// riktiga drag (harnessens drag är generiska), fungerar tap-tap-reserven, ger fel plagg en
// wiggle och ingen placering, och överlever fem rundor otåligt spelade + exit mitt i promenaden?
//   node scripts/_natt-kla.mjs
import { chromium } from 'playwright'

const ID = 'kla-efter-vadret'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

// Skärmpunkter: ett oplacerat plagg (fits = true/false) och dess mål (rätt zon, eller en
// krävd zon om plagget inte passar)
const PUNKTER = (fits) => `(() => {
  const b = window.__barnspel, g = b.game
  const rec = g._drag.items.find((r) => !r.placed && r.data.fits === ${fits} && !r.data._wxWorn && (!${fits} || (g._reqZones.includes(r.data.slot) && !g._filled.has(r.data.slot))))
  if (!rec) return null
  const slot = ${fits} ? rec.data.slot : g._reqZones[0]
  const z = g._zones[slot]
  const c = b.app.canvas.getBoundingClientRect()
  const s = c.width / b.app.renderer.width
  const p = rec.view.getGlobalPosition(), q = z.getGlobalPosition()
  return { fx: c.left + p.x * s, fy: c.top + p.y * s, tx: c.left + q.x * s, ty: c.top + q.y * s,
           hx: Math.round(p.x), hy: Math.round(p.y) }
})()`

async function dra(page, p) {
  await page.mouse.move(p.fx, p.fy)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(p.fx + ((p.tx - p.fx) * i) / 8, p.fy + ((p.ty - p.fy) * i) / 8)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}
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
  await page.waitForTimeout(1200)
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return { lvl: g._level, placed: g._placed, needed: g._needed, res: g._resolving, w: g._weather?.key }
  })

  const vader = []
  let felTestat = false, tapTestat = false
  for (let runda = 0; runda < 5; runda++) {
    // vänta tills rundan tar emot
    const t0 = Date.now()
    while ((await stat()).res && Date.now() - t0 < 15000) await page.waitForTimeout(100)
    const s0 = await stat()
    vader.push(s0.w)
    // Fel plagg först (runda 0): ska inte placeras
    if (!felTestat) {
      const p = await page.evaluate(PUNKTER(false))
      if (p) {
        await dra(page, p)
        await page.waitForTimeout(250)
        const s1 = await stat()
        ok('fel plagg placeras inte', s1.placed === s0.placed, `placed ${s0.placed} -> ${s1.placed} (fran ${p.hx},${p.hy})`)
        felTestat = true
      }
    }
    // Runda 1: tap-tap-reserven på första plagget
    if (runda === 1 && !tapTestat) {
      const p = await page.evaluate(PUNKTER(true))
      const f = (await stat()).placed
      await page.mouse.click(p.fx, p.fy); await page.waitForTimeout(250)
      await page.mouse.click(p.tx, p.ty); await page.waitForTimeout(400)
      ok('tap-tap satter pa ett plagg', (await stat()).placed === f + 1 || (await stat()).res, `placed ${f} -> ${(await stat()).placed}`)
      tapTestat = true
    }
    // Resten med riktiga drag, så fort spelet tillåter
    let varv = 0
    while (!(await stat()).res && varv++ < 8) {
      const p = await page.evaluate(PUNKTER(true))
      if (!p) break
      const f = (await stat()).placed
      await dra(page, p)
      await page.waitForTimeout(400) // snäppet (0,24 s) måste landa innan onCorrect räknar
      const s = await stat()
      if (runda === 0 && varv === 1) ok('drag fran strecket till ratt zon', s.placed === f + 1 || s.res, `placed ${f} -> ${s.placed} (fran ${p.hx},${p.hy})`)
    }
    const s2 = await stat()
    ok(`runda ${runda + 1} klar (${s0.w})`, s2.res || s2.lvl > s0.lvl, `level ${s0.lvl} -> ${s2.lvl}`)
  }
  ok('minst tre olika vader pa fem rundor', new Set(vader).size >= 3, vader.join(','))
  // Exit mitt i promenaden
  await page.waitForTimeout(900)
  const felFore = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('exit mitt i promenaden: 0 nya fel', errors.length === felFore, `${errors.length - felFore} nya`)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | ') || '0')
} finally {
  await browser.close()
}
console.log(`\n  ${ID} — nattsond\n`)
for (const r of rader) console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(40)} ${r.text}`)
console.log(`\n  ${rader.filter((r) => r.ok).length}/${rader.length} grona\n`)
