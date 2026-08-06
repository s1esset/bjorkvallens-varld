// Ritar valda drawIcon-nycklar i ett rutnät ovanpå appen och tar en skärmdump.
// Verifieringsverktyg när nya ikoner läggs till i src/lib/artikoner.js — en saknad
// nyckel faller igenom till en grå cirkel som ser ut som ett medvetet designval.
//
//   node scripts/_ikoner.mjs "🐑,🐴,🦆" [--shot .test-shots/ikoner.png] [--size 130]
//
// Kräver dev-servern (window.__barnspel är DEV-only).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const keys = (args[0] || '').split(',').map((s) => s.trim()).filter(Boolean)
const shot = opt('--shot', '.test-shots/ikoner.png')
const size = Number(opt('--size', 130))
const url = opt('--url', 'http://localhost:5173')

if (!keys.length) {
  console.error('usage: node scripts/_ikoner.mjs "🐑,🐴,🦆" [--shot ut.png] [--size 130]')
  process.exit(2)
}
mkdirSync(dirname(shot), { recursive: true })

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)

  await page.evaluate(async ({ keys, size }) => {
    const { drawIcon } = await import('/src/lib/artikoner.js')
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (c.__gallery) c.removeFromParent()

    const cols = Math.min(6, keys.length)
    const cellW = 1280 / cols
    const rows = Math.ceil(keys.length / cols)
    const cellH = Math.min(210, 680 / rows)

    // Opak platta så ikonerna syns mot bibliotekets bakgrund. drawIcon ger en
    // Graphics-instans; .clear() gör den till en ren duk.
    const bg = drawIcon('__ingen__', 1)
    bg.clear().rect(0, 0, 1280, 720).fill(0xf4f0e6)
    bg.__gallery = true
    layer.addChild(bg)

    keys.forEach((k, i) => {
      const g = drawIcon(k, size)
      g.position.set((i % cols) * cellW + cellW / 2, Math.floor(i / cols) * cellH + cellH / 2 + 30)
      g.__gallery = true
      layer.addChild(g)
    })
  }, { keys, size })

  await page.waitForTimeout(400)
  await page.screenshot({ path: shot })
  console.log(`ordning (radvis, ${Math.min(6, keys.length)} per rad): ${keys.join(' ')}`)
  console.log(errors.length ? `✗ ${errors.length} fel:\n  ${errors.join('\n  ')}` : `✓ 0 konsolfel · ${shot}`)
} finally {
  await browser.close()
}
