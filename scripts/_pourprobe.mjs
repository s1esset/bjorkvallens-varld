// Verifierar hela hällningen efter TILT/OFFS-kalibreringen, via spelets EGNA vägar.
//   A) glas → glas (tryck-tryck): kommer saften över, och blir blå + gul GRÖN?
//   B) glas → hink (tryck-tryck): försvinner saften ner i hinken?
//   C) hela beställningen: rätt färg i ett glas → Bobo dricker upp → runda klar.
//
//   node scripts/_pourprobe.mjs
import { chromium } from 'playwright'

const ID = 'saftbaren'
const GLASS_X = [390, 570, 750, 930]
const FARG = { röd: 0, gul: 1, blå: 2, grön: 3 }

const state = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    return {
      total: g._world.count,
      busy: !!g._busy,
      dricker: !!g._drink,
      order: g._order?.pal ?? null,
      glas: g._glasses.map((x) => ({ x: Math.round(x.x), a: Number(x.angle.toFixed(2)), ...g._stats(x) })),
    }
  }, ID)

const fyll = (page, gi, ch, rows) =>
  page.evaluate(
    async ({ gid, gi, ch, rows }) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const gl = g._glasses[gi]
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < 8; c++) g._world.spawn(gl.x - 49 + c * 14 + (Math.random() - 0.5) * 4, gl.y - 36 - r * 15, { pal: 0, ch })
    },
    { gid: ID, gi, ch, rows },
  )

const tom = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    g._world.clear()
  }, ID)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)

  console.log(`\n  Hällverifiering — ${ID}\n`)

  // ---- A) glas → glas, gul i blå ------------------------------------------
  await tom(page)
  await page.waitForTimeout(300)
  await fyll(page, 1, [0, 1, 0], 12) // gult i glas 1
  await fyll(page, 2, [0, 0, 1], 5) // lite blått i glas 2
  await page.waitForTimeout(1400)
  const a0 = await state(page)
  await page.mouse.click(GLASS_X[1], 500)
  await page.waitForTimeout(250)
  await page.mouse.click(GLASS_X[2], 500)
  await page.waitForTimeout(4200)
  const a1 = await state(page)
  const gront = a1.glas[2].dom === FARG.grön
  console.log(`  A) GLAS → GLAS   glas1 ${a0.glas[1].n} → ${a1.glas[1].n}   glas2 ${a0.glas[2].n} → ${a1.glas[2].n}`)
  console.log(`     glas 2 färg: ${a1.glas[2].dom} (3 = grön), renhet ${a1.glas[2].frac.toFixed(2)}`)
  console.log(`     ► gul hälld i blå blev grön: ${gront ? 'JA' : 'NEJ'}   (överfört ${a1.glas[2].n - a0.glas[2].n})\n`)

  // ---- B) glas → hink ------------------------------------------------------
  await tom(page)
  await page.waitForTimeout(300)
  await fyll(page, 1, [1, 0, 0], 12)
  await page.waitForTimeout(1400)
  const b0 = await state(page)
  await page.mouse.click(GLASS_X[1], 500)
  await page.waitForTimeout(250)
  await page.mouse.click(1100, 560) // hinken
  await page.waitForTimeout(5000)
  const b1 = await state(page)
  console.log(`  B) GLAS → HINK   glas1 ${b0.glas[1].n} → ${b1.glas[1].n}   världen ${b0.total} → ${b1.total}`)
  console.log(`     ► hinken slukade ${b0.total - b1.total} partiklar: ${b0.total - b1.total > 20 ? 'JA' : 'NEJ'}\n`)

  // ---- C) hela beställningen ----------------------------------------------
  // Montera om först: A och B lämnar glas mitt i hemresan och en beställning som
  // redan kan vara uppfylld, och då mäter man probens rester i stället för spelet.
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(400)
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1400)
  await tom(page)
  await page.waitForTimeout(300)
  const want = await page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    return g._order?.pal ?? 0
  }, ID)
  // Beställningen kan vara en BLANDFÄRG (3–5). Bygg då kanalerna för den i stället för
  // att klampa ner till blå — annars mäter man en beställning som aldrig kan uppfyllas.
  const CH_FOR = { 0: [1, 0, 0], 1: [0, 1, 0], 2: [0, 0, 1], 3: [0, 0.5, 0.5], 4: [0.5, 0.5, 0], 5: [0.5, 0, 0.5] }
  const ch = CH_FOR[want] || [1, 0, 0]
  await fyll(page, 2, ch, 12) // fyll glas 2 med den beställda färgen
  console.log(`  C) BESTÄLLNING — Bobo vill ha färg ${want}, glas 2 fylls med den`)
  let serverad = false
  let klar = null
  for (let k = 1; k <= 26; k++) {
    await page.waitForTimeout(500)
    const s = await state(page)
    if (s.dricker && !serverad) {
      serverad = true
      console.log(`     t=${k * 500} ms: Bobo dricker (glas 2 har ${s.glas[2].n})`)
    }
    if (serverad && !s.dricker && klar === null) {
      klar = k * 500
      console.log(`     t=${klar} ms: klar, ny beställning = färg ${s.order}`)
      break
    }
  }
  console.log(`     ► Bobo fick sitt glas och drack upp: ${serverad && klar ? 'JA' : 'NEJ'}\n`)

  console.log(`  ${errors.length ? '✗ ' + errors.join(' | ') : '✓ 0 konsolfel'}\n`)
} finally {
  await browser.close()
}
