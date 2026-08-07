// Var föds NaN:en i bygg-tornet? Sonden spelar spelet med riktiga tryck och läser
// spelets egna fält varje 100 ms — första bildrutan där något blir NaN skrivs ut med
// hela tillståndet runt omkring, så orsaken går att peka ut i stället för att gissas.
//
//   node scripts/_nanprobe.mjs [id]
import { chromium } from 'playwright'

const ID = process.argv[2] || 'bygg-tornet'

const snap = (page, id) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    const b = g._active?.body
    const v = g._active?.view
    return {
      fas: g._phase,
      count: g._count,
      misses: g._misses,
      dropX: g._dropX,
      supportX: g._supportX,
      stackTopY: g._stackTopY,
      expC: g._expC,
      carrierX: g._carrierX,
      t: g._t,
      body: b ? { x: b.position.x, y: b.position.y, a: b.angle, m: b.mass, spd: b.speed } : null,
      view: v && !v.destroyed ? { x: v.x, y: v.y } : null,
      placerade: (g._placed || []).map((p) => ({ x: p.body?.position.x, y: p.body?.position.y })),
    }
  }, id)

const bad = (o) => {
  const hits = []
  const walk = (v, path) => {
    if (typeof v === 'number') { if (!Number.isFinite(v)) hits.push(path) }
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], path ? `${path}.${k}` : k)
  }
  walk(o, '')
  return hits
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)

  console.log(`\n  NaN-sond för ${ID}\n`)
  const start = await snap(page, ID)
  console.log(`  vid start (inget tryck an): ${JSON.stringify(start)}`)
  console.log(`  NaN-falt vid start: ${bad(start).join(', ') || 'inga'}
`)
  let forra = start
  let hittat = false
  // Samma tryck-mönster som harnessen: mitt på skärmen, i tur och ordning.
  const taps = [[300, 250], [640, 250], [950, 250], [300, 450], [640, 450], [950, 450], [640, 360], [500, 300]]
  for (let i = 0; i < taps.length && !hittat; i++) {
    await page.mouse.click(taps[i][0], taps[i][1])
    for (let k = 0; k < 22; k++) {
      const s = await snap(page, ID)
      const b = bad(s)
      if (b.length) {
        console.log(`  ✗ NaN efter tryck ${i + 1} (${taps[i]}) — fält: ${b.join(', ')}`)
        console.log(`    FÖRE:  ${JSON.stringify(forra)}`)
        console.log(`    EFTER: ${JSON.stringify(s)}`)
        hittat = true
        break
      }
      forra = s
      await page.waitForTimeout(100)
    }
  }
  if (!hittat) console.log('  ✓ ingen NaN under 8 tryck')
  console.log(`  ${errors.length ? '✗ ' + errors.join(' | ') : '✓ 0 konsolfel'}\n`)
} finally {
  await browser.close()
}
