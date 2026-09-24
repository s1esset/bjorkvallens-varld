// _bajsbildprobe.mjs — bilder av grodan-slurps bajsloop i de lägen en sond aldrig hinner fota.
//
//   node scripts/_bajsbildprobe.mjs
//
// _bajsloopprobe spelar för effektivt: korven bärs ~1,5 s och kastet tar 0,6 s, så dess bilder
// var 6:e s fångar nästan aldrig dem. Den här sonden STÄLLER UPP lägena i spelet (via spelets
// egna metoder, samma kod som ett riktigt tryck kör) och tar en skärmdump av varje:
//   _bajsbild-0  en fri korv med blandad kost bredvid grodan (leder: fluga, fjäril, humla,
//                trollslända, eldfluga, guldfluga …) + stinklinjer
//   _bajsbild-1  grodan bär korven i munnen, ungarna längtar (gapar)
//   _bajsbild-2  korven mitt i kastet, ungen gapar
//   _bajsbild-3  en unge tuggar/har ätit, en till matad — runda magar
// Plus mått: korvens bredd/höjd i bild (getBounds) och grodans, så storleken går att jämföra.
import { chromium } from 'playwright'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(1500)

// Stäng av motgången (inget hinder mitt i bilderna) och låt grodan sitta.
const matt = await page.evaluate(() => {
  const g = window.__barnspel.game
  g._nastaHinder = 9999
  const gr = g._groda
  const kost = ['fluga', 'fluga', 'fjaril', 'humla', 'trollslanda', 'eldfluga', 'guldfluga', 'fluga']
  const k = g._bajs.skapa(gr.pos.x + gr.riktning * 150, gr.pos.y - 80, kost, 0, 0)
  window.__bajsTest = k
  const rb = (o) => { const r = o.getBounds(); return { w: Math.round(r.width), h: Math.round(r.height) } }
  return { korv: rb(k.view), groda: { w: Math.round(Math.abs(gr.b.huvud.position.x - gr.b.fotN.position.x) + 60) } }
})
await page.waitForTimeout(1600)
await page.screenshot({ path: '.test-shots/_bajsbild-0.png' })

await page.evaluate(() => {
  const g = window.__barnspel.game
  const k = window.__bajsTest
  g._bajs.gripTunga(k)
  g._taKorv(g._ctx, k)
})
await page.waitForTimeout(900)
await page.screenshot({ path: '.test-shots/_bajsbild-1.png' })

await page.evaluate(() => {
  const g = window.__barnspel.game
  const kor = g._dammen.grodungar.plats
  g._kasta(g._ctx, { x: kor.x, y: kor.y - 30 })
})
await page.waitForTimeout(330)
await page.screenshot({ path: '.test-shots/_bajsbild-2.png' })
await page.waitForTimeout(900)
// En unge till matad (direkt), så två magar syns.
await page.evaluate(() => {
  const g = window.__barnspel.game
  const kor = g._dammen.grodungar
  const i = kor.omatad(0)
  if (i >= 0) kor.mata(i, 0xff8fc2)
})
await page.waitForTimeout(1800)
await page.screenshot({ path: '.test-shots/_bajsbild-3.png' })
const slut = await page.evaluate(() => ({ matade: window.__barnspel.game._dammen.grodungar.matade, spelMatade: window.__barnspel.game._matade }))
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(800)
console.log(JSON.stringify({ matt, slut, fel: fel.length, felExempel: fel.slice(0, 5) }, null, 1))
await b.close()
