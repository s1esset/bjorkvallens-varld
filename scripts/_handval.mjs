// Ställer de TRE kameravinklarna på näthanden sida vid sida i riktig Pixi, så
// ägaren kan peka på en i stället för att jag gissar en fjärde gång.
//   node scripts/_handval.mjs  →  .test-shots/natskott-handval.png
import { chromium } from 'playwright'
const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'natskott-pa-stan' }))
await page.waitForTimeout(1400)
await page.evaluate(() => {
  const m = window.__natdbg
  const H = window.__nathander
  for (const r of [...m._targets]) m._removeTarget(r)
  m._scroll = 0
  m._spawnTimer = m._gustTimer = m._skataTimer = m._heistTimer = 999
  m._shiftBodies = () => {}
  m._behave = () => {}
  m._spawnTick = () => {}
  m._updateArm = () => {}
  m._root.children.forEach((ch) => (ch.visible = false))
  const typ = H.typer[0] // röda dragnätshanden
  const lager = m._root
  const varianter = [
    ['1  FRAMIFRAN (nuvarande)', H.front(typ, {}), 250],
    ['2  PROFIL', H.sida(typ, false), 640],
    ['3  BAKIFRAN / UNDERIFRAN', H.bak(typ, false), 1030],
  ]
  for (const [namn, c, x] of varianter) {
    c.position.set(x, 700)
    c.scale.set(1.1)
    c.visible = true
    lager.addChild(c)
    window.__valda = window.__valda || []
    window.__valda.push(namn)
  }
})
await page.waitForTimeout(500)
await page.screenshot({ path: '.test-shots/natskott-handval.png' })
console.log('varianter:', (await page.evaluate(() => window.__valda)).join(' | '))
console.log(errors.length ? `x ${errors.length} konsolfel: ${errors[0]}` : 'ok 0 konsolfel')
await browser.close()
