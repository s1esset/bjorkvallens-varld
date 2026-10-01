// _nohmrprobe.mjs — laddar :5174 (scripts/_vite-nohmr.mjs) verkligen INTE om en öppen sida
// när en spelfil sparas? Kontrollarm: :5173 ska ladda om av samma sparning.
//   node scripts/_nohmrprobe.mjs
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const FIL = 'src/games/studsmatta/index.js'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const res = {}
try {
  for (const port of [5173, 5174]) {
    const page = await browser.newPage()
    await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 30000 })
    await page.evaluate(() => { window.__markor = 42 })
    res[port] = { page }
  }
  const src = readFileSync(FIL, 'utf8')
  writeFileSync(FIL, src + '\n')
  await new Promise((r) => setTimeout(r, 3500))
  writeFileSync(FIL, src)
  await new Promise((r) => setTimeout(r, 2500))
  for (const port of [5173, 5174]) {
    const kvar = await res[port].page.evaluate(() => window.__markor === 42).catch(() => false)
    console.log(`${port}: ${kvar ? 'INGEN omladdning' : 'LADDADES OM'}`)
  }
} finally {
  await browser.close()
}
