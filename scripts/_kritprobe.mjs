// Mäter att spara-linjens nya kritval FAKTISKT gör något: att en krita går att
// trycka på, att den valda färgen hamnar i spåret, att ett byte mitt i en teckning
// ger ett FLERFÄRGAT spår (gamla streck behåller sin färg), och att motiv-rundan
// går att slutföra och avslöjas. Mäter också att valet överlever ett besök.
//
//   node scripts/_kritprobe.mjs [--shot ut.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '')
const ID = 'spara-linjen'

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

  const open = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1100)
  }
  // Designkoordinat -> skärmkoordinat (letterbox: contain, centrerad).
  const toScreen = async (x, y) => page.evaluate(([dx, dy]) => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return { x: (window.innerWidth - 1280 * s) / 2 + dx * s, y: (window.innerHeight - 720 * s) / 2 + dy * s }
  }, [x, y])
  const tap = async (x, y) => {
    const p = await toScreen(x, y)
    await page.mouse.click(p.x, p.y)
    await page.waitForTimeout(120)
  }
  // Läs spelmodulens inre tillstånd (dev-harnessen exponerar aktivt spel).
  const state = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('spara-linjen')
    if (!g) return null
    return {
      krita: g._crayonIx,
      color: g._color,
      motiv: g._motif?.key || null,
      prickar: g._dots?.length || 0,
      tanda: g._next,
      dotColors: (g._dots || []).filter((d) => d._lit).map((d) => d._wcol),
      round: g._round,
      resolving: !!g._resolving,
    }
  })

  await open()
  let s = await state()
  if (!s) { console.error('  ✗ spelmodulen gick inte att läsa — sonden kan inte mäta'); process.exit(2) }
  console.log(`\n  runda 0: motiv=${s.motiv} prickar=${s.prickar} krita=${s.krita}`)

  // 1) Tryck på gröna kritan (index 2, x=640) — färgen ska byta.
  const fore = s.color
  await tap(640, 600)
  s = await state()
  const bytt = s.color !== fore && s.krita === 2
  console.log(`  kritval: ${fore.toString(16)} -> ${s.color.toString(16)} (index ${s.krita})  ${bytt ? '✓' : '✗'}`)

  // 2) Spåra halva berget i grönt, byt till lila (index 4, x=960), spåra resten.
  const pts = await page.evaluate(async () => (await import('/src/games/registry.js')).getGame('spara-linjen')._dots.map((d) => ({ x: d.x, y: d.y })))
  const half = Math.ceil(pts.length / 2)
  for (let i = 0; i < half; i++) await tap(pts[i].x, pts[i].y)
  await tap(960, 600)
  s = await state()
  const bytteMitt = s.krita === 4 && s.tanda === half
  console.log(`  byte mitt i teckningen: tända=${s.tanda}/${pts.length} krita=${s.krita}  ${bytteMitt ? '✓' : '✗'}`)
  for (let i = half; i < pts.length; i++) await tap(pts[i].x, pts[i].y)
  await page.waitForTimeout(300)
  s = await state()

  const unika = [...new Set(s.dotColors)]
  console.log(`  spårets färger: ${unika.map((c) => '#' + (c ?? 0).toString(16)).join(' + ')}  ${unika.length >= 2 ? '✓ flerfärgat' : '✗ enfärgat'}`)
  console.log(`  runda klar: resolving=${s.resolving} nivå=${s.round}  ${s.resolving && s.round === 1 ? '✓' : '✗'}`)
  if (shot) { await page.waitForTimeout(500); await page.screenshot({ path: shot }) }

  // 3) Nästa runda ska ärva den valda kritan, inte slumpa färg.
  for (const w of [1200, 1400, 2000, 3000]) {
    await page.waitForTimeout(w)
    s = await state()
    console.log(`  +${w}ms: motiv=${s.motiv} prickar=${s.prickar} tända=${s.tanda} resolving=${s.resolving} nivå=${s.round} krita=${s.krita}`)
  }

  // 4) Lämna och kom tillbaka — valet ska minnas sig.
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)
  await open()
  s = await state()
  console.log(`  efter återbesök: krita=${s.krita}  ${s.krita === 4 ? '✓ minns valet' : '✗ glömde'}`)

  // 5) Exit mitt i firandet (exit-säkerhet).
  const pts2 = await page.evaluate(async () => (await import('/src/games/registry.js')).getGame('spara-linjen')._dots.map((d) => ({ x: d.x, y: d.y })))
  for (const p of pts2) await tap(p.x, p.y)
  await page.waitForTimeout(220)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1500)
  console.log(`\n  konsolfel: ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('    ' + e)
} finally {
  await browser.close()
}
