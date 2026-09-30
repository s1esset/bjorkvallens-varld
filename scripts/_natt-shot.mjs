// Nattkörningen: skärmdump av ett spel efter ett eget evaluate-steg.
//   node scripts/_natt-shot.mjs <id> <ut.png> "<js mot g=window.__barnspel.game, c=ctx>" [vänta-ms]
import { chromium } from 'playwright'
const [ID, UT, JS = '', MS = '1500'] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
await page.waitForTimeout(1200)
if (JS) console.log('eval:', await page.evaluate((js) => { const g = window.__barnspel.game, c = window.__barnspel.ctx; return String(new Function('g', 'c', js)(g, c)) }, JS))
await page.waitForTimeout(Number(MS))
await page.screenshot({ path: UT })
console.log('fel:', errors.length, errors.slice(0, 3).join(' | '))
await browser.close()
