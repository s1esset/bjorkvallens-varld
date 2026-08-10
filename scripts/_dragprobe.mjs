// Tyngden i draget (DragController): följer bilden efter fingret, lutar den åt
// dragets håll, kastar den en skugga — och städas allt bort när föremålet släpps
// eller spelet lämnas mitt i ett drag?
//
// Mäter i tal, inte i tycke:
//   eftersläpning  px mellan fingret (rec.tx) och bilden (view.x) under farten
//   lutning        rad, ska vara > 0 under farten och ~0 efter släpp
//   skugga         finns ett extra barn i föremålets förälder under draget (och noll efter).
//                  KRÄVS bara av spel som valt `new DragController({ skugga: true })` — den
//                  är opt-in, och hälften av spelen ritar en egen markskugga i stället.
//   exit           lämna spelet MITT i ett drag: konsolfel + kvarglömd skugga
//
//   node scripts/_dragprobe.mjs [spel-id]
import { chromium } from 'playwright'

const ID = process.argv[2] || 'sortera-skrap'
const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1600)

  // Läs ur spelmodulen. Sonden kräver att spelet håller sin DragController i `_drag`.
  const G = (src) =>
    page.evaluate(
      async ([gid, s]) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        return eval(s)
      },
      [ID, src],
    )

  const dcFinns = await G('!!(g && g._drag && g._drag.items && g._drag.items.length)')
  if (!dcFinns) {
    console.log(`${ID}: ingen DragController på g._drag — välj ett annat spel`)
    process.exit(2)
  }

  // Skärmposition för föremål 0 (design -> skärm via appens scaler).
  const start = await G(`(() => {
    const rec = g._drag.items[0]
    const p = rec.view.getGlobalPosition()
    const c = window.__barnspel.app.canvas.getBoundingClientRect()
    return { x: Math.round(c.left + p.x * (c.width / window.__barnspel.app.renderer.width)),
             y: Math.round(c.top + p.y * (c.height / window.__barnspel.app.renderer.height)),
             barnFore: rec.view.parent.children.length }
  })()`)

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.waitForTimeout(60)

  // Dra snabbt i sidled — eftersläpning och lutning ska synas medan farten är hög.
  let mitt = null
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(start.x + i * 34, start.y - i * 6)
    await page.waitForTimeout(16)
    if (i === 6) {
      // MÄT FÖRST, fotografera sedan: en screenshot tar ~100 ms och då har bilden
      // hunnit i kapp fingret — eftersläpningen mättes till 0 px innan den flytten.
      mitt = await G(`(() => {
        const rec = g._drag.items[0]
        return {
          lag: Math.round(Math.abs(rec.tx - rec.view.x)),
          rot: +(rec.view.rotation - (rec.restRot || 0)).toFixed(3),
          // DragControllers skugga är OPT-IN (\`skugga: true\`) — ungefär hälften av
          // spelen ritar en egen markskugga under sina föremål i stället. Sonden får
          // därför bara KRÄVA en skugga av de spel som har bett om en.
          skuggaOpt: !!g._drag._skugga,
          skugga: !!rec._shadow,
          skuggAlpha: rec._shadow ? +rec._shadow.alpha.toFixed(2) : 0,
          barn: rec.view.parent.children.length,
          skala: +(rec.view.scale.x / (rec.base.x || 1)).toFixed(2),
        }
      })()`)
      await page.screenshot({ path: `.test-shots/_dragprobe-${ID}.png` })
    }
  }
  await page.mouse.up()
  await page.waitForTimeout(1200)

  const efter = await G(`(() => {
    const rec = g._drag.items[0]
    return {
      rot: +(rec.view.rotation).toFixed(3),
      vilorot: +(rec.restRot || 0).toFixed(3),
      lutkvar: +Math.abs((rec.view.rotation) - (rec.restRot || 0)).toFixed(3),
      skugga: !!rec._shadow,
      barn: rec.view.parent.children.length,
      skala: +(rec.view.scale.x / (rec.base.x || 1)).toFixed(2),
    }
  })()`)

  console.log(`\n  ${ID} — tyngd i draget`)
  console.log(`  eftersläpning   ${mitt.lag} px   (0 = ingen tyngd, > 40 = degigt)`)
  console.log(`  lutning         ${mitt.rot} rad under farten -> ${efter.rot} efter släpp (vila ${efter.vilorot}, kvar ${efter.lutkvar})`)
  console.log(
    mitt.skuggaOpt
      ? `  skugga          ${mitt.skugga ? 'ja' : 'NEJ'} (alpha ${mitt.skuggAlpha}) -> ${efter.skugga ? 'KVAR' : 'borta'}`
      : `  skugga          avstängd (skugga: false) — spelet ritar egen markskugga, inget krav`,
  )
  console.log(`  barn i lagret   ${start.barnFore} -> ${mitt.barn} under drag -> ${efter.barn} efter`)
  console.log(`  skala mot vila  ${mitt.skala}x lyft -> ${efter.skala}x efter landning`)

  // Exit MITT i ett drag: skuggan lever i spelets lager och måste dö med det.
  const p2 = await G(`(() => {
    const rec = g._drag.items[1] || g._drag.items[0]
    const p = rec.view.getGlobalPosition()
    const c = window.__barnspel.app.canvas.getBoundingClientRect()
    return { x: Math.round(c.left + p.x * (c.width / window.__barnspel.app.renderer.width)),
             y: Math.round(c.top + p.y * (c.height / window.__barnspel.app.renderer.height)) }
  })()`)
  await page.mouse.move(p2.x, p2.y)
  await page.mouse.down()
  for (let i = 1; i <= 4; i++) {
    await page.mouse.move(p2.x + i * 30, p2.y - i * 10)
    await page.waitForTimeout(16)
  }
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)
  await page.mouse.up()
  await page.waitForTimeout(600)

  console.log(`  exit mitt i drag ${errors.length === 0 ? 'rent' : errors.length + ' konsolfel'}`)
  for (const e of errors.slice(0, 5)) console.log('    ' + e)

  const fel =
    (mitt.skuggaOpt && !mitt.skugga) ||
    mitt.lag === 0 ||
    Math.abs(mitt.rot) < 0.01 ||
    efter.skugga ||
    efter.barn !== start.barnFore ||
    efter.lutkvar > 0.01 ||
    errors.length > 0
  console.log(fel ? '\n  ✗ något saknas eller lever kvar\n' : '\n  ✓ tyngd på plats, allt städat\n')
  process.exit(fel ? 1 : 0)
} finally {
  await browser.close()
}
