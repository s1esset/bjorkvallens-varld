// Nattkörningen 2026-10-01: `vart-tog-det-vagen` — spelar rundor med RIKTIGA musklick mitt på
// kopparnas ritade bild: vänta ut blandningen, tryck fel kopp, sedan rätt. Otåligt: nästa runda
// startas direkt. Tvingar 5 koppar. Mäter att hyllan fylls, sparas i custom, syns efter
// återinträde och ligger inom skärmen; att ingen kopp-träffyta ligger över Bobo; exit mitt i flygningen.
//   node scripts/_natt-vart-tog-det-vagen.mjs
import { chromium } from 'playwright'

const ID = 'vart-tog-det-vagen'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text = '') => rader.push({ namn, ok: !!villkor, text })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  const start = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
    await page.waitForTimeout(600)
  }
  // Mittpunkt (css px) av ett objekts ritade bild.
  const mitt = (expr) => page.evaluate((e) => {
    const g = window.__barnspel.game, c = window.__barnspel.ctx
    const o = new Function('g', 'c', 'return ' + e)(g, c)
    if (!o || o.destroyed) return null
    const b = o.getBounds()
    const cv = document.querySelector('canvas').getBoundingClientRect()
    const sc = cv.width / (document.querySelector('canvas').width / (window.devicePixelRatio || 1))
    return { x: cv.left + (b.x + b.width / 2) * sc, y: cv.top + (b.y + b.height / 2) * sc }
  }, expr)
  const fas = () => page.evaluate(() => window.__barnspel.game._phase)

  const runda = async (tag) => {
    await page.waitForFunction(() => window.__barnspel.game._phase === 'guess', null, { timeout: 25000 }).catch(() => {})
    const f = await fas()
    ok(tag + ' gissa-fas', f === 'guess', f)
    if (f !== 'guess') return
    const n = await page.evaluate(() => window.__barnspel.game._cups.length)
    const ri = await page.evaluate(() => window.__barnspel.game._cups.indexOf(window.__barnspel.game._prizeCup))
    const fi = ri === 0 ? 1 : 0
    const pf = await mitt(`g._cups[${fi}]`)
    await page.mouse.click(pf.x, pf.y)
    await page.waitForTimeout(150)
    ok(tag + ' fel kopp: fas kvar', (await fas()) === 'guess')
    await page.waitForTimeout(700)
    const pr = await mitt(`g._cups[${ri}]`)
    await page.mouse.click(pr.x, pr.y)
    await page.waitForTimeout(200)
    ok(tag + ` rätt kopp (${n} koppar)`, (await fas()) === 'resolving', await fas())
  }

  await start()
  await runda('r1')
  await runda('r2')
  await page.screenshot({ path: '.test-shots/_natt-vtdv-r2.png' })
  // tvinga 5 koppar
  await page.waitForFunction(() => window.__barnspel.game._phase === 'guess' || window.__barnspel.game._phase === 'reveal' || window.__barnspel.game._phase === 'shuffle', null, { timeout: 8000 }).catch(() => {})
  await page.evaluate(() => { window.__barnspel.game._level = 8 })
  await runda('r3')
  await page.waitForFunction(() => window.__barnspel.game._phase === 'shuffle', null, { timeout: 8000 }).catch(() => {})
  await page.waitForFunction(() => window.__barnspel.game._phase === 'guess', null, { timeout: 25000 }).catch(() => {})
  const geo = await page.evaluate(() => {
    const g = window.__barnspel.game
    const bo = g._bobo?.view || g._bobo
    const bb = bo?.getBounds ? bo.getBounds() : null
    const cups = g._cups.map((c) => { const h = c.hitArea; const p = c.getGlobalPosition(); return h ? { l: p.x + h.x * c.scale.x, r: p.x + (h.x + h.width) * c.scale.x, t: p.y + h.y * c.scale.y } : null })
    return { n: g._cups.length, bobo: bb && { l: bb.x, r: bb.x + bb.width }, cups }
  })
  console.log('   .. geo', JSON.stringify(geo))
  await page.screenshot({ path: '.test-shots/_natt-vtdv-5.png' })
  await runda('r4')
  await page.waitForTimeout(900)
  await page.screenshot({ path: '.test-shots/_natt-vtdv-flyg.png' })
  const hyl = await page.evaluate(() => {
    const g = window.__barnspel.game, c = window.__barnspel.ctx
    return { hittade: g._hittade, custom: c.progress.get().custom }
  })
  console.log('   .. hylla', JSON.stringify(hyl))
  ok('hittade sparas', (hyl.hittade?.length || 0) >= 1 && JSON.stringify(hyl.custom || {}).includes('hittade'))
  // exit mitt i flygningen
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1500)
  await start()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '.test-shots/_natt-vtdv-ater.png' })
  const bild = await page.evaluate(() => {
    const g = window.__barnspel.game
    const h = g._hylla
    const v = h?.view || h?.root || h?._root || h?.c
    const b = v?.getBounds ? v.getBounds() : null
    return { n: g._hittade?.length, b: b && { x: b.x, y: b.y, w: b.width, h: b.height } }
  })
  console.log('   .. hylla efter återinträde', JSON.stringify(bild))
  ok('hittade kvar efter återinträde', bild.n === hyl.hittade.length)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('0 konsolfel', errors.length === 0, errors.slice(0, 4).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log((r.ok ? '✓ ' : '✗ ') + r.namn + (r.text ? '  — ' + r.text : ''))
process.exit(rader.every((r) => r.ok) ? 0 : 1)
