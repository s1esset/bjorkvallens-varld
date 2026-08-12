// Syns Elviras bana? (docs/games/enhorningen-elvira.md §4 Juice — "Glitterspår")
//
// Spåret finns bara MEDAN hon flyger, och `npm run test` fotograferar spelet i
// placeringsläge. Ett grönt test säger alltså ingenting om den här effekten.
//
// Fyra frågor, alla mätta i bild och inte i kod:
//   1. syns spåret alls under flykten (målade pixlar, allt annat dolt)?
//   2. FÖLJER det hennes bana — ligger banden där hon varit?
//   3. städas det mellan kasten, så nästa kast börjar med tom luft?
//   4. lever något kvar efter exit?
//
//   node scripts/_sparprobe.mjs
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'enhorningen-elvira' }))
  await page.waitForFunction(() => !!window.__barnspel.game, null, { timeout: 15000 })
  await page.waitForTimeout(1500)

  const bild = async () => PNG.sync.read(await page.screenshot())
  const skiljer = (a, b) => {
    let n = 0
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) > 6 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 6 ||
          Math.abs(a.data[i + 2] - b.data[i + 2]) > 6) {
        n++
        const px = (i / 4) % a.width
        const py = Math.floor((i / 4) / a.width)
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
      }
    }
    return { n, box: n ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null }
  }

  // Isolera spåret: dölj allt annat i scenen. Molnen och regnbågen animeras via GSAP,
  // så att bara växla `_trailG.visible` mellan två skärmdumpar hade mätt deras rörelse
  // också (samma fälla som `_gungprobe.mjs` gick i först).
  const sparetsPixlar = async () => {
    const satt = (v) => page.evaluate((v) => {
      const g = window.__barnspel.game
      for (const c of g._root.children) if (c !== g._trailG) c.visible = v
    }, v)
    await satt(false)
    const med = await bild()
    await page.evaluate(() => { window.__barnspel.game._trailG.visible = false })
    const utan = await bild()
    await page.evaluate(() => { window.__barnspel.game._trailG.visible = true })
    await satt(true)
    return skiljer(med, utan)
  }

  const skjut = () => page.evaluate(() => {
    const g = window.__barnspel.game
    g._launch(window.__barnspel.ctx, { vx: 11, vy: -13 })
  })

  console.log('\nGlitterspår i `enhorningen-elvira`\n')

  // ---------- 1 + 2: syns det, och ligger det där hon varit? ----------
  await skjut()
  await page.waitForTimeout(700)
  const underFlykt = await sparetsPixlar()
  const hennes = await page.evaluate(() => {
    const b = window.__barnspel.game._elviraBody
    return b ? { x: Math.round(b.position.x), y: Math.round(b.position.y) } : null
  })
  const punkter = await page.evaluate(() => window.__barnspel.game._trail.length)
  writeFileSync('.test-shots/_elvira-spar.png', await page.screenshot())
  console.log(`  under flykt: ${underFlykt.n} målade pixlar · ${punkter} punkter i bufferten`)
  if (underFlykt.box) {
    console.log(`  spårets utsträckning: ${underFlykt.box.w}×${underFlykt.box.h} px vid (${underFlykt.box.x}, ${underFlykt.box.y})`)
    console.log(`  Elvira är nu i (${hennes?.x}, ${hennes?.y}) — spåret ska sluta VID henne`)
  }
  if (underFlykt.n < 400) { console.log('  ⚠ spåret syns knappt'); kod = 1 }
  // Banan ska vara utdragen, inte en klump: ett spår som bara ligger under henne har
  // ingen utsträckning och visar ingen bana.
  const langd = underFlykt.box ? Math.max(underFlykt.box.w, underFlykt.box.h) : 0
  console.log(`  längsta utsträckning: ${langd} px ${langd > 150 ? '(en bana)' : '(EN KLUMP — visar ingen bana)'}`)
  if (langd <= 150) kod = 1

  // ---------- 3: städas det mellan kasten? ----------
  await page.waitForTimeout(4200) // låt kastet landa och spelet gå till placeringsläge
  const lage = await page.evaluate(() => window.__barnspel.game._state)
  const efterLandning = await sparetsPixlar()
  console.log(`\n  efter landning (läge "${lage}"): ${efterLandning.n} målade pixlar`)
  if (lage === 'placing' && efterLandning.n > 60) {
    console.log('  ⚠ spåret ligger kvar i placeringsläget — nästa kast börjar inte med tom luft')
    kod = 1
  }

  // ---------- 4: exit ----------
  await skjut()
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(800)
  const kvar = await page.evaluate(() => !!window.__barnspel.game)
  console.log(`\n  exit mitt i flykten: spelmodul kvar: ${kvar ? 'JA (fel)' : 'nej'} · konsolfel: ${fel.length}`)
  if (kvar || fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
