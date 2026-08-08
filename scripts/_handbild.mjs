// Närbild på de tre näthänderna, stort och mot neutral botten, så posen går att
// bedöma utan att gissa. Handposen har nu läst fel tre gånger (V-tecken, sedan
// pekfinger-och-lillfinger, sedan kaninöron) — den här sonden gör om-tag billiga.
//
//   node scripts/_handbild.mjs  →  .test-shots/natskott-hander.png
import { chromium } from 'playwright'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'natskott-pa-stan'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1400)

// Töm scenen, frys världen och ställ upp de tre händerna stort på en lugn botten.
await page.evaluate(() => {
  const m = window.__natdbg
  for (const r of [...m._targets]) m._removeTarget(r)
  m._scroll = 0
  m._spawnTimer = 999
  m._gustTimer = 999
  m._skataTimer = 999
  m._heistTimer = 999
  m._shiftBodies = () => {}
  m._behave = () => {}
  m._spawnTick = () => {}
  m._updateArm = () => {}
  // dölj kuliss och bil så bara händerna syns
  for (const s of m._far) s.c.visible = false
  for (const s of m._mid) s.c.visible = false
  m._root.children.forEach((ch) => {
    if (ch !== m._arm && !(m._sidoHander || []).includes(ch)) ch.visible = false
  })
  // aktiv hand stor i mitten
  m._arm.position.set(400, 690)
  m._arm.scale.set(1.15)
  m._arm.rotation = 0
  // de två väntande stort bredvid
  const p = [[820, 690], [1120, 690]]
  ;(m._sidoHander || []).forEach((c, i) => {
    c.position.set(p[i][0], p[i][1])
    c.scale.set(1.15)
  })
})
await page.waitForTimeout(500)
await page.screenshot({ path: '.test-shots/natskott-hander.png' })
const lage = await page.evaluate(() => ({ aktiv: window.__natdbg._mode, vantar: window.__natdbg._vantar }))
console.log('aktiv hand:', lage.aktiv, '· väntande:', (lage.vantar || []).join(' + '))
console.log(errors.length ? `✗ ${errors.length} konsolfel: ${errors[0]}` : '✓ 0 konsolfel')
await browser.close()
process.exit(errors.length ? 1 : 0)
