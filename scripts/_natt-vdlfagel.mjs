// Nattkörningen: står höna och tupp någon gång på ängen samtidigt? 60 rundor med 6 djur.
import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'vilket-djur-later' }))
await page.waitForFunction(() => window.__barnspel.game?.id === 'vilket-djur-later' && window.__barnspel.ctx?.stage, null, { timeout: 20000 })
await page.waitForTimeout(1200)
const r = await page.evaluate(() => {
  const g = window.__barnspel.game, c = window.__barnspel.ctx
  let bada = 0, n6 = 0
  for (let i = 0; i < 60; i++) {
    g._first = false; g._wins = 0; g._level = 3; g._tema = i % 2 ? 'gard' : 'skog'; g._newRound(c)
    const ids = g._cards.map((k) => k._djur?.id ?? k._data?.id ?? k.djur?.id)
    if (ids.length === 6) n6++
    if (ids.includes('hona') && ids.includes('tupp')) bada++
    if (i === 0) console.log('ids', ids.join(','))
  }
  return { bada, n6, prov: g._cards.map((k) => k._djur?.id).join(',') }
})
console.log(JSON.stringify(r), 'fel:', errors.length)
await browser.close()
