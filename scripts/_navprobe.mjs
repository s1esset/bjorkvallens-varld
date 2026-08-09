// Skärmövergångarna: går alla vägar fram och tillbaka, och blänker skalets creme
// till mitt i bytet? Den gamla korstoningen hade båda skärmarna halvgenomskinliga
// samtidigt — med full bleed lyser creme igenom precis då. Sonden mäter det.
//
//   creme mitt i bytet   andel pixlar nära #fdf6e3 ~120 ms in i övergången
//   creme i vila         samma mätning när ingen övergång pågår (referensen)
//   riktning             gamla skärmens x-förskjutning: negativ djupare in, positiv tillbaka
//   lås                  släpps nav._busy, eller fastnar routern efter ett byte?
//
//   node scripts/_navprobe.mjs [bredd x höjd]
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const vp = (process.argv[2] || '952x428').split('x').map(Number)
const CREAM = [0xfd, 0xf6, 0xe3]

function cremeAndel(buf) {
  const png = PNG.sync.read(buf)
  let n = 0
  for (let i = 0; i < png.data.length; i += 4) {
    const d =
      Math.abs(png.data[i] - CREAM[0]) + Math.abs(png.data[i + 1] - CREAM[1]) + Math.abs(png.data[i + 2] - CREAM[2])
    if (d <= 12) n++
  }
  return n / (png.width * png.height)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] } })
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
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(900)

  let vila = cremeAndel(await page.screenshot())

  // En resa hela vägen in till ett spel och ut igen. Mät mitt i varje byte (~120 ms in)
  // och i vila efter varje landning — cremen mitt i får inte överstiga BÅDA ändarnas.
  const resa = [
    ['library', 'in'],
    ['game', 'in'],
    ['library', 'ut'],
    ['menu', 'ut'],
  ]
  const matt = []
  for (const [mal, vantad] of resa) {
    const foreVila = vila
    await page.evaluate((m) => window.__barnspel.nav.go(m, m === 'game' ? { id: 'djurorkester' } : {}), mal)
    await page.waitForTimeout(120)
    const bild = await page.screenshot()
    const glid = await page.evaluate(() => {
      const h = window.__barnspel.nav.ctx.screenHolder
      // Den gamla skärmen ligger ÖVERST (index sist) medan den glider undan.
      const top = h.children[h.children.length - 1]
      return h.children.length > 1 ? Math.round(top.x - (top.pivot?.x || 0)) : 0
    })
    await page.waitForTimeout(1400)
    const namn = await page.evaluate(() => window.__barnspel.nav.current?.name)
    const last = await page.evaluate(() => !!window.__barnspel.nav._busy)
    vila = cremeAndel(await page.screenshot())
    matt.push({ mal, vantad, creme: cremeAndel(bild), tak: Math.max(foreVila, vila), glid, namn, last })
  }

  console.log(`\n  Skärmövergångar (${vp[0]}x${vp[1]})`)
  for (const m of matt) {
    console.log(
      `  -> ${m.mal.padEnd(8)} (${m.vantad})  creme mitt i ${(m.creme * 100).toFixed(1).padStart(5)} % mot ${(m.tak * 100).toFixed(1).padStart(5)} % i vila  glid ${String(m.glid).padStart(5)}  landade ${m.namn}  las ${m.last ? 'KVAR' : 'slappt'}`,
    )
  }
  console.log(`  konsolfel           ${errors.length}`)
  for (const e of errors.slice(0, 5)) console.log('    ' + e)

  const fel =
    errors.length > 0 ||
    matt.some((m) => m.namn !== m.mal || m.last) ||
    matt.some((m) => m.creme > m.tak + 0.02) ||
    !matt.some((m) => m.glid < -20) ||
    !matt.some((m) => m.glid > 20)
  console.log(fel ? '\n  ✗ övergången läcker creme, fastnar eller saknar riktning\n' : '\n  ✓ riktning åt båda håll, inget cremeblänk, inget lås\n')
  process.exit(fel ? 1 : 0)
} finally {
  await browser.close()
}
