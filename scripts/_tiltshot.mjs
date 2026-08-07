// Titta på hällningen: ställ ett källglas OFFS px vid sidan om ett riktigt målglas,
// luta, och ta bilder under tiden.   node scripts/_tiltshot.mjs <tilt> <offs>
import { chromium } from 'playwright'
const ID = 'saftbaren'
const V = Number(process.argv[2] || 2.4)
const OFFS = Number(process.argv[3] || 100)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)
  await page.evaluate(async ({ gid, offs }) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    g._world.clear(); g._busy = true
    const k = g._glasses[1], m = g._glasses[2]
    m.x = m.homeX; m.y = m.homeY; m.angle = 0; m.wantAngle = 0
    k.x = m.homeX - offs; k.y = m.homeY - 232; k.angle = 0; k.wantAngle = 0
    for (let r = 0; r < 13; r++) for (let c = 0; c < 8; c++) g._world.spawn(k.x - 49 + c * 14, k.y - 36 - r * 15, { pal: 1, ch: [0, 1, 0] })
    // lite blått i målglaset så man ser blandningen
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) g._world.spawn(m.x - 49 + c * 14, m.y - 36 - r * 15, { pal: 2, ch: [0, 0, 1] })
  }, { gid: ID, offs: OFFS })
  await page.waitForTimeout(1000)
  await page.evaluate(async ({ gid, v }) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    g._glasses[1].wantAngle = v
  }, { gid: ID, v: V })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `.test-shots/_pour-${V}-${OFFS}-mitt.png` })
  await page.waitForTimeout(1400)
  await page.evaluate(async ({ gid }) => { (await import('/src/games/registry.js')).getGame(gid)._glasses[1].wantAngle = 0 }, { gid: ID })
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `.test-shots/_pour-${V}-${OFFS}-efter.png` })
  const s = await page.evaluate(async ({ gid }) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    return { kalla: g._stats(g._glasses[1]).n, mal: g._stats(g._glasses[2]), varld: g._world.count }
  }, { gid: ID })
  console.log(`  tilt ${V} offs ${OFFS}: kalla ${s.kalla}, mal ${s.mal.n} (dom ${s.mal.dom}, frac ${s.mal.frac.toFixed(2)}), varld ${s.varld}`)
} finally { await browser.close() }
