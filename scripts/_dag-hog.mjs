// HÖGEN I SPELET (P3-kunderna, dag 2026-10-02 D13) — lägger sig det fångade i en hög i
// behållaren, syns lika många som fångats (upp till taket), och står högen STILLA i vila?
//
//   node scripts/_dag-hog.mjs <enhorning-glitterbajs|fanga-frukten|roliga-snurran> [--url …]
//
// Spelar spelets egen väg, två rundor (den andra lämnas otåligt mitt i fångsten):
//   (båda stannar en fångst före målet — banbytet tömmer högen)
//   enhorning-glitterbajs  `_fart(ctx, 1)` var 0,9 s + kistan flyttas under lägsta glittret
//   fanga-frukten          korgens `_targetX` följer lägsta frukten (en perfekt fångare), målet höjt till 99
//   roliga-snurran         `_coinRain(ctx, 26)` två gånger
//   MÄTNING  hog.antal == min(fångade, tak) · rymt 0 · efter 2 s vila: max förflyttning per post < 1 px
//   KONTROLL innan fångst är högen tom (antal 0) — mätaren rör sig från ett känt läge
// Skärmdump: .test-shots/_dag-hog-<id>.png (högen i vila).
import { chromium } from 'playwright'

const ID = process.argv[2]
const URL = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
if (!['enhorning-glitterbajs', 'fanga-frukten', 'roliga-snurran'].includes(ID)) {
  console.log('ange spel-id'); process.exit(2)
}
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

  const lage = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const h = g?._hog
    const n = g._nFangade ?? g._nMynt ?? 0
    return {
      n, antal: h?.antal ?? -1, synliga: h?.synliga ?? -1, rymt: h?.rymt ?? -1, tak: h?.tak ?? -1,
      pos: (h?.poster || []).map((p) => [p.body.position.x, p.body.position.y, p.body.id]),
    }
  })
  // Ett "spelsteg" — spelets egen väg till fler fångade.
  const spela = (i) => page.evaluate(({ id, i }) => {
    const g = window.__barnspel.game, ctx = window.__barnspel.ctx
    if (!g || !g._alive) return
    if (id === 'enhorning-glitterbajs') {
      if (i % 18 === 0 && !g._resolving && g._caught + 4 < g._goal) g._fart(ctx, 1)
      const p = (g._pellets || []).filter((x) => x.body && !x.caught).sort((a, b) => b.body.position.y - a.body.position.y)[0]
      if (p && g._chest && !g._chest.destroyed) g._chest.x = Math.max(140, Math.min(1150, p.body.position.x))
    } else if (id === 'fanga-frukten') {
      const f = (g._fruit || []).filter((x) => x.body && !x.caught).sort((a, b) => b.body.position.y - a.body.position.y)[0]
      if (i === 0) g._goal = 99 // sondens enda ingrepp: banan tar inte slut, så högen hinner nå taket
      if (f) g._targetX = f.body.position.x
    } else if (id === 'roliga-snurran') {
      if (i === 0 || i === 40) g._coinRain(ctx, 26)
    }
  }, { id: ID, i })

  for (const runda of [1, 2]) {
    if (runda > 1) { await page.evaluate(() => window.__barnspel.nav.go('menu')); await page.waitForTimeout(300) }
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(runda === 1 ? 3500 : 1800)
    console.log(`\n  Runda ${runda}`)
    const fore = await lage()
    ok('KONTROLL högen är tom före fångst', fore.antal === 0 && fore.n === 0, `antal ${fore.antal} · fångade ${fore.n}`)
    const steg = runda === 1 ? 160 : 50
    let maxN = 0
    for (let i = 0; i < steg; i++) {
      await spela(i)
      await page.waitForTimeout(50)
      if (i % 10 === 9) { const l = await lage(); maxN = Math.max(maxN, l.n) }
    }
    if (runda === 2) { ok('otålig exit mitt i fångsten', true, `fångade ${maxN}`); break }
    await page.waitForTimeout(2500)
    const a = await lage()
    ok('något fångades', a.n > 0, `fångade ${a.n}`)
    ok('antal i högen = min(fångade, tak)', a.antal === Math.min(a.n, a.tak), `antal ${a.antal} · synliga ${a.synliga} · fångade ${a.n} · tak ${a.tak}`)
    ok('rymt 0', a.rymt === 0, `rymt ${a.rymt}`)
    // Vilofönster: 2 s utan att något nytt landat (fångas något under fönstret: nytt fönster, högst 4).
    let b = a, A = a, maxd = 0, m = 0
    for (let forsok = 0; forsok < 4; forsok++) {
      // vänta in att högen lagt sig (en ny post eller en bortonad äldsta flyttar om högen en stund)
      await page.waitForFunction(() => { const h = window.__barnspel.game?._hog; return h && h.poster.length === h.antal && h.poster.every((p) => p.body.isSleeping) }, null, { timeout: 8000 }).catch(() => {})
      A = await lage()
      await page.waitForTimeout(2000)
      b = await lage()
      if (b.n === A.n) break
      A = b
    }
    const forra = new Map(A.pos.map((q) => [q[2], q]))
    for (const q of b.pos) { const p = forra.get(q[2]); if (!p) continue; m++; maxd = Math.max(maxd, Math.hypot(p[0] - q[0], p[1] - q[1])) }
    ok('högen står stilla i vila (2 s)', maxd < 1 && b.n === A.n, `max förflyttning ${maxd.toFixed(2)} px över ${m} poster · fångade ${A.n} → ${b.n}`)
    ok('posterna fanns kvar under vilomätningen', m > 0 && m === b.antal, `${A.pos.length} → ${b.pos.length}`)
    await page.screenshot({ path: `.test-shots/_dag-hog-${ID}.png` })
  }
  await page.waitForTimeout(600)
  ok('0 konsolfel', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
console.log(fel ? `\n✗ ${fel} fel` : '\n✓ grönt')
process.exit(fel ? 1 : 0)
