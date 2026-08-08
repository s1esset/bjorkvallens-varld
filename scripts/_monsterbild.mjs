// Ställer upp monsterfamiljen på rad i det RIKTIGA spelet och tar en skärmdump.
// Agenten som ritade arterna verifierade dem mot en egen Pixi-stubb — den kan inte
// säga något om Pixis egen fyllningsregel för sammansatta paths. Den här sonden
// ritar dem med riktig PixiJS i riktig Chrome, så bilden är beviset.
//
//   node scripts/_monsterbild.mjs  →  .test-shots/natskott-monster.png
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

// _spawnTick anropas av _update MED ctx — genom att byta ut den kommer vi åt ctx
// utan att spelet behöver exponera den.
await page.evaluate(() => {
  const m = window.__natdbg
  window.__arter = []
  const kvar = [...m._targets]
  for (const r of kvar) m._removeTarget(r)
  m._gustTimer = 999
  m._skataTimer = 999
  m._heistTimer = 999
  m._spawnTimer = 999
  m._onskade = ['ludd', 'goblin', 'tenta', 'taggis', 'flaxis', 'sten', 'snigel', 'maskis', 'svampis', 'grodis', 'spoke', 'robo']
  m._spawnTick = function (ctx) {
    const art = m._onskade.shift()
    if (!art) return
    const rec = this._spawnTarget(ctx, 'monster', 1380, { art, force: true })
    if (!rec) return
    const i = 12 - m._onskade.length - 1
    rec.walkV = 0
    rec.body.isStatic = true
    window.__natdbg._phys.constructor // no-op, håller referensen levande
    rec._wxPlats = 120 + (i % 6) * 208
    rec._wxRad = i < 6 ? 300 : 490
    window.__arter.push({ art, x: rec._wxPlats })
  }
})
// tolv spawnar
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => (window.__natdbg._spawnTimer = 0.01))
  await page.waitForTimeout(120)
}
// lås dem på rad, frys scrollen och släck UI-pulsen så bilden blir jämförbar
await page.evaluate(() => {
  const m = window.__natdbg
  m._scroll = 0
  m._targets.forEach((r) => {
    if (r._wxPlats) {
      r.body.position.x = r._wxPlats
      r.body.position.y = r._wxRad
      r.view.x = r._wxPlats
      r.view.y = r._wxRad
    }
  })
  m._shiftBodies = () => {}
  m._behave = () => {}
})
await page.waitForTimeout(700)
await page.screenshot({ path: '.test-shots/natskott-monster.png' })
const arter = await page.evaluate(() => window.__arter)
console.log('arter i bild:', arter.map((a) => `${a.art}@${a.x}`).join(' · '))
console.log(errors.length ? `✗ ${errors.length} konsolfel: ${errors[0]}` : '✓ 0 konsolfel')
await browser.close()
process.exit(errors.length ? 1 : 0)
