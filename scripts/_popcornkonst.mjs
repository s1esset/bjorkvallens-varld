// _popcornkonst.mjs — förhandsbild av popcornkalasets konst (src/games/popcornkalaset/konst.js).
//
//   node scripts/_popcornkonst.mjs            → .test-shots/_popcornkonst.png (hela rummet)
//   node scripts/_popcornkonst.mjs --detalj   → .test-shots/_popcornkonst-detalj.png (närbilder)
//   node scripts/_popcornkonst.mjs --tv       → rummet i finishen (tv-sken på, lampan dimmad)
//
// Kräver dev-servern på :5173. Sidan (`_popcornkonst.html`) laddar bara konst.js, matt.js och
// mjukkropp.js — inte appens register, så en sparad spelfil laddar inte om bilden.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const detalj = argv.includes('--detalj')
const tv = argv.includes('--tv')
const UT = `.test-shots/_popcornkonst${detalj ? '-detalj' : tv ? '-tv' : ''}.png`
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push(String(e.message)))
page.on('console', (m) => { if (m.type() === 'error') fel.push(`${m.text()} ${m.location()?.url || ''}`) })
await page.goto(`http://localhost:5173/scripts/_popcornkonst.html?vy=${detalj ? 'detalj' : 'rum'}${tv ? '&tv' : ''}`, { waitUntil: 'domcontentloaded' })
try {
  await page.waitForFunction(() => window.__klar === true, null, { timeout: 30000 })
} catch {
  console.log('sidan blev aldrig klar')
}
await page.waitForTimeout(300)
await page.locator('canvas').screenshot({ path: UT })
console.log(`${UT}  konsolfel: ${fel.length}`)
for (const f of fel) console.log('  ', f)
await b.close()
