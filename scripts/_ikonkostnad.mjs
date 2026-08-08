// Mäter vad gradientfyllningarna i lib/form.js FAKTISKT kostar när hela ikonbiblioteket
// ritas: antal distinkta bakade gradienter och deras GPU-textur i byte.
//
// Bakgrunden till att detta mäts i stället för gissas: Pixi bakar en LINJÄR gradient till
// en 256x1-duk (~1 KB) men en RADIELL till 256x256 (~256 KB) — se buildRadialGradient i
// node_modules/pixi.js. sphereFill är alltså ~256 gånger dyrare per instans än
// topLightFill, och artikoner.js anropar sphereFill i nästan varje mall.
//
//   node scripts/_ikonkostnad.mjs "🐶,🐱,…"      (kräver dev-servern)
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')

// Nycklarna läses ur ART-tabellen i källan, så probet inte kan hamna ur synk med den.
const src = readFileSync('src/lib/artikoner.js', 'utf8')
const table = src.slice(src.indexOf('const ART = {'), src.indexOf('export function drawIcon'))
const SKIP = new Set(['djur', 'frukt', 'fordon', 'former', 'havsdjur', 'kläder'])
const keys = [...table.matchAll(/(?:'([^']+)'|(\b[a-zà-ö]+\b)):\s*\[/g)]
  .map((m) => m[1] || m[2]).filter((k) => !SKIP.has(k))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  // Mätt på de BAKADE texturerna i ritinstruktionerna, inte på modulens cache-räknare.
  // Cacherna går inte att läsa utifrån: en `import('/src/lib/form.js')` i probet är en
  // ANNAN modulinstans än den artikoner.js redan fått av Vite, så dess Map:ar står på 0
  // hur många ikoner som än ritats. Texturerna sitter däremot på instruktionerna själva.
  const res = await page.evaluate(async (keys) => {
    const art = await import('/src/lib/artikoner.js')
    const sources = new Map()
    for (const k of keys) {
      const g = art.drawIcon(k, 130)
      for (const ins of g.context.instructions) {
        const st = ins.data?.style
        const src = st?.fill && st.texture?.source
        if (src) sources.set(src.uid, { w: src.width, h: src.height })
      }
      g.destroy()
    }
    let bytes = 0, radiella = 0, linjara = 0
    for (const s of sources.values()) {
      bytes += s.w * s.h * 4
      s.h > 1 ? radiella++ : linjara++
    }
    return { ritade: keys.length, radiella, linjara, bytes }
  }, keys)

  console.log(`ikoner ritade: ${res.ritade}`)
  console.log(`distinkta bakade gradienter: ${res.radiella} radiella (NxN) · ${res.linjara} linjara (Nx1)`)
  console.log(`GPU-textur totalt: ${(res.bytes / 1048576).toFixed(2)} MB`)
  console.log(errors.length ? `✗ ${errors.length} fel:\n  ${errors.join('\n  ')}` : '✓ 0 konsolfel')
} finally {
  await browser.close()
}
