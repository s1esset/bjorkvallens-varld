// Skärmdump av spelens SAMLINGSVISNINGAR (custom-data) — en färsk profil visar dem aldrig,
// så test-skärmdumpen kan inte se om en rad stenar/grodor/regnbågar krockar med något.
//   node scripts/_samlingbild.mjs
import { chromium } from 'playwright'
const FALL = [
  ['golvet-ar-lava', 'rundor', 12],
  ['vippbradan', 'landningar', 9],
  ['regnbagsmalaren', 'regnbagar', 5],
  ['balanstornet', 'rekordH', 330],
  ['studsbollar', 'korgar', 40],
  ['harma-melodin', 'rundor', 5],
  ['vad-forsvann', 'rundor', 12],
]
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('pageerror', (e) => fel.push(String(e.message).slice(0, 140)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel)
for (const [id, key, v] of FALL) {
  await p.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  await p.waitForFunction(() => !!window.__barnspel.ctx?.progress, null, { timeout: 15000 })
  await p.waitForTimeout(500)
  await p.evaluate(([k, v]) => window.__barnspel.ctx.progress.setCustom(k, v), [key, v])
  await p.evaluate(() => window.__barnspel.nav.go('library'))
  await p.waitForTimeout(500)
  await p.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  await p.waitForTimeout(2200)
  await p.screenshot({ path: `.test-shots/_samling-${id}.png` })
  console.log(`${id}: ${key}=${v} → .test-shots/_samling-${id}.png`)
  await p.evaluate(() => window.__barnspel.nav.go('library'))
  await p.waitForTimeout(400)
}
console.log('sidfel:', fel.length ? fel : 'inga')
await b.close()
