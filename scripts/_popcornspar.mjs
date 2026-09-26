// POPCORNKALASET — spåra EN otålig vippning bildruta för bildruta (fall G4 i `_popcornnaiv`):
// grytan släpps över skål 0 och greppas i sidan 120 ms senare, medan den fortfarande glider.
//   node scripts/_popcornspar.mjs [--vanta 120]
import { chromium } from 'playwright'
const arg = process.argv.slice(2)
const VANTA = Number(arg.includes('--vanta') ? arg[arg.indexOf('--vanta') + 1] : 120)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const G = (fn, a) => page.evaluate(fn, a)
try {
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await G(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
  await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
  await page.waitForTimeout(1200)
  await G(() => {
    const g = window.__barnspel.game
    for (const k of [...g._korn]) g._taKorn(k)
    for (let i = 0; i < 30; i++) { const p = g._gryta.varld(((i % 6) - 2.5) * 26, 88 - Math.floor(i / 6) * 16); g._nyttKorn(p.x, p.y) }
  })
  await page.waitForTimeout(600)
  await G(() => window.__popcorn.poppa(30))
  await page.waitForTimeout(2200)
  // Spåret: en rad per fast steg, skriven av beforeStep.
  await G(() => {
    const g = window.__barnspel.game
    window.__spar = []
    g._phys.beforeStep(() => {
      const k = g._gryta, b = k.body
      const pop = g._pop.map((p) => p.body)
      const i = pop.filter((q) => k.inuti(q.position.x, q.position.y, 20))
      const mx = pop.length ? pop.reduce((s, q) => s + q.position.x, 0) / pop.length : 0
      const vmax = pop.reduce((m, q) => Math.max(m, Math.hypot(q.velocity.x, q.velocity.y)), 0)
      window.__spar.push({ lage: k.lage, x: +b.position.x.toFixed(0), y: +b.position.y.toFixed(0), v: +(b.angle * 57.3).toFixed(0), vx: +b.velocity.x.toFixed(1), vy: +b.velocity.y.toFixed(1), hx: k._hand ? +k._hand.x.toFixed(0) : null, hy: k._hand ? +k._hand.y.toFixed(0) : null, hvx: k._hand ? +k._hand.vx.toFixed(1) : null, mx: +k._mal.x.toFixed(0), my: +k._mal.y.toFixed(0), vm: k._vippaMal != null ? +(k._vippaMal * 57.3).toFixed(0) : null, iGr: i.length, popX: +mx.toFixed(0), vmax: +vmax.toFixed(1) })
    })
  })
  const sk = (x, y) => G(({ x, y }) => { const p = window.__barnspel.game._root.toGlobal({ x, y }); return p }, { x, y })
  const lok = (lx, ly) => G(({ lx, ly }) => window.__barnspel.game._gryta.varld(lx, ly), { lx, ly })
  const drag = async (a, b, steg, hall = 0) => {
    await page.mouse.move(a.x, a.y); await page.mouse.down()
    for (let i = 1; i <= steg; i++) { await page.mouse.move(a.x + (b.x - a.x) * i / steg, a.y + (b.y - a.y) * i / steg); await page.waitForTimeout(16) }
    if (hall) await page.waitForTimeout(hall)
    await page.mouse.up()
  }
  const bygel = await lok(0, -92)
  await G(() => { window.__spar.length = 0; window.__markor = [] })
  await drag(bygel, { x: 706, y: bygel.y - 60 }, 36)
  await G(() => window.__markor.push(['släpp', window.__spar.length]))
  await page.waitForTimeout(VANTA)
  const sida = await lok(113, 20)
  await G(() => window.__markor.push(['grepp sida', window.__spar.length]))
  await drag(sida, { x: sida.x, y: sida.y + 240 }, 50, 2600)
  await G(() => window.__markor.push(['släpp 2', window.__spar.length]))
  await page.waitForTimeout(1500)
  const { spar, markor } = await G(() => ({ spar: window.__spar, markor: window.__markor }))
  const m = Object.fromEntries(markor.map(([n, i]) => [i, n]))
  spar.forEach((r, i) => { if (m[i] || i % 4 === 0) console.log(`${String(i).padStart(4)} ${m[i] ? '◆ ' + m[i] + ' ' : ''}${r.lage.padEnd(6)} pos ${r.x},${r.y} ${r.v}° v ${r.vx},${r.vy} hand ${r.hx},${r.hy} hvx ${r.hvx} mål ${r.mx},${r.my} vippMål ${r.vm}° iGrytan ${r.iGr} popX ${r.popX} vmax ${r.vmax}`) })
} finally { await browser.close() }
