// Ritar createScene() i ett rutnät och tar en skärmdump — utan att gå via ett spel.
// Scenen är delad av 55 spel, så ett temabyte eller en ny scenparameter måste gå att se
// utan att först hitta ett spel som råkar använda just det temat.
//
//   node scripts/_scenbild.mjs sky,meadow,water,candy            (teman)
//   node scripts/_scenbild.mjs meadow --tider dag,morgon,skymning,kvall
//
// Kräver dev-servern (window.__barnspel är DEV-only).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const teman = (args[0] || 'meadow').split(',').map((s) => s.trim()).filter(Boolean)
const tider = opt('--tider', '').split(',').map((s) => s.trim()).filter(Boolean)
const shot = opt('--shot', '.test-shots/scen.png')
const url = opt('--url', 'http://localhost:5173')
mkdirSync(dirname(shot), { recursive: true })

// Varje ruta är en egen scen i egen skala. Ett par (tema, tid) per ruta.
const rutor = tider.length ? teman.flatMap((t) => tider.map((d) => [t, d])) : teman.map((t) => [t, null])

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)

  await page.evaluate(async ({ rutor }) => {
    const { createScene } = await import('/src/lib/scene.js')
    // 'pixi.js' är ett bart modulnamn och går inte att resolva i sidkontexten (ingen
    // import map). Graphics hämtas därför via en app-modul som redan importerar Pixi —
    // samma grepp som scripts/_ikoner.mjs använder för sin bakgrundsplatta.
    const { drawIcon } = await import('/src/lib/artikoner.js')
    const blank = () => drawIcon('__ingen__', 1).clear()
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (c.__scen) c.removeFromParent()

    const cols = rutor.length <= 2 ? 1 : 2
    const cw = 1280 / cols, ch = 720 / Math.ceil(rutor.length / cols)

    const bg = blank().rect(0, 0, 1280, 720).fill(0x101010)
    bg.__scen = true
    layer.addChild(bg)

    rutor.forEach(([tema, tid], i) => {
      // Scenen ritas i full designstorlek och skalas ner till rutan, så proportionerna
      // (horisontens höjd, bandens amplitud) blir desamma som i ett riktigt spel.
      const s = createScene(tema, tid ? { tid } : {})
      s.scale.set(cw / 1280, ch / 720)
      s.position.set((i % cols) * cw, Math.floor(i / cols) * ch)
      // Scener ritar numera full bleed (±240/±160 px utanför designytan, lib/view.js) —
      // utan mask målar varje ruta in i grannens. Masken är barn till scenen och
      // klipper i designkoordinater.
      const m = blank().rect(0, 0, 1280, 720).fill(0xffffff)
      s.addChild(m)
      s.mask = m
      s.__scen = true
      layer.addChild(s)
    })
  }, { rutor })

  await page.waitForTimeout(500)
  await page.screenshot({ path: shot })
  console.log(`rutor: ${rutor.map(([t, d]) => (d ? `${t}/${d}` : t)).join(' ')}`)
  console.log(errors.length ? `✗ ${errors.length} fel:\n  ${errors.join('\n  ')}` : `✓ 0 konsolfel · ${shot}`)
} finally {
  await browser.close()
}
