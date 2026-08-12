// Ritar ansiktsriggen i alla sina lägen och tar en skärmdump.
//
// Ett ansikte går inte att bedöma i tal. Klipp-pipelinen (`npm run ansikte`) mäter att
// lagren är RÄTT INRIKTADE (silhuett-IoU), men om käkens tak är för högt, om skarven
// syns, eller om en min läser som "arg" i stället för "sur" — det ser bara ögat.
//
// Rutnätet: vila · tre gap-lägen · blink · alla nio miner.
//
//   node scripts/_ansiktebild.mjs [--shot .test-shots/ansikte.png] [--person pappa]
//
// Kräver dev-servern (window.__barnspel är DEV-only).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '.test-shots/ansikte.png')
const person = opt('--person', 'pappa')
const url = opt('--url', 'http://localhost:5173')
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
  await page.waitForTimeout(700)

  const fakta = await page.evaluate(async (person) => {
    // Bara PROJEKTETS egna sökvägar går att importera här — en bar specifier
    // ('pixi.js') resolvas av Vite i modulgrafen, inte i webbläsarens import().
    const { laddaAnsikte, Ansikte } = await import('/src/lib/ansikte.js')
    const { createScene } = await import('/src/lib/scene.js')
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (c.__galleri) c.removeFromParent()

    const duk = createScene('meadow', { width: 1280, height: 720 })
    duk.__galleri = true
    layer.addChild(duk)

    const data = await laddaAnsikte(person)
    const lagen = [
      ['vila', (a) => {}],
      ['gap 0,35', (a) => a.gap(0.35)],
      ['gap 0,7', (a) => a.gap(0.7)],
      ['gap 1,0', (a) => a.gap(1)],
      ['blink', (a) => { a._ogon.alpha = 1 }],
      ...Object.keys(data.manifest.miner).map((m) => [m, (a) => { a._miner[m].visible = true; a._miner[m].alpha = 1 }]),
    ]
    const cols = 5
    const rader = Math.ceil(lagen.length / cols)
    const cellW = 1280 / cols
    const cellH = 720 / rader
    window.__ansikten = []
    lagen.forEach(([namn, satt], i) => {
      const a = new Ansikte(data, { hojd: cellH * 0.92 })
      a.view.position.set((i % cols) * cellW + cellW / 2, Math.floor(i / cols) * cellH + cellH * 0.5)
      satt(a)
      a.view.__galleri = true
      layer.addChild(a.view)
      window.__ansikten.push(a)
    })
    return { lagen: lagen.map((l) => l[0]), ruta: data.manifest.ruta, lager: Object.keys(data.manifest.lager).length, miner: Object.keys(data.manifest.miner).length }
  }, person)

  await page.waitForTimeout(600)
  await page.screenshot({ path: shot })

  // Exit-säkerhet: riv alla riggar och se att ingenting fortsätter ticka.
  const kvar = await page.evaluate(() => {
    const n = window.__ansikten.length
    for (const a of window.__ansikten) a.destroy()
    window.__ansikten = []
    return n
  })
  await page.waitForTimeout(500)

  console.log(`\n  ruta ${fakta.ruta.w}x${fakta.ruta.h} · ${fakta.lager} lager + ${fakta.miner} miner`)
  console.log(`  lägen: ${fakta.lagen.join(' · ')}`)
  console.log(`  rev ${kvar} riggar efter bilden`)
  console.log(`  ${errors.length === 0 ? '✓ 0 konsolfel' : '✗ ' + errors.length + ' konsolfel: ' + errors.slice(0, 3).join(' | ')}`)
  console.log(`  bild: ${shot}\n`)
  process.exitCode = errors.length ? 1 : 0
} finally {
  await browser.close()
}
