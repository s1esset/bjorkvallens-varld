// Kugghjulens Elvira i alla fem uttryck, sida vid sida (V22): .test-shots/_elvira-alla.png
//   node scripts/_elvirabild.mjs
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel)
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'kugghjulen' }))
await p.waitForFunction(() => !!window.__barnspel.game?._elvira)
await p.waitForTimeout(1500)
const r = await p.evaluate(() => { const bb = window.__barnspel.game._elvira.getBounds(); return { x: Math.floor(bb.x - 40), y: Math.floor(bb.y - 50), width: 150, height: 150 } })
const bilder = []
for (const m of ['lugn', 'glad', 'oj', 'jubel', 'fest']) {
  await p.evaluate((m) => window.__barnspel.game._setElvira(m), m)
  await p.waitForTimeout(900)
  await p.screenshot({ path: `C:/repos/pwagames/.test-shots/_elvira-${m}.png`, clip: r })
}
await b.close()
