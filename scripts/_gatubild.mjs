// Ritar de elva gatusakerna med RIKTIG PixiJS i RIKTIG Chrome och tar skärmdumpar.
// Blocket bor i scratchpad (det ska klistras in i natskott-pa-stan/index.js), så
// sonden bygger en TILLFÄLLIG modul i repot som ger blocket sina beroenden
// (Container/Graphics + shade/tint/COLORS/rnd/clamp) och plockar isär den efteråt.
//
//   node scripts/_gatubild.mjs [--src <fil>] [--url http://localhost:5173]
//     -> .test-shots/natskott-gatusaker.png        (vila)
//     -> .test-shots/natskott-gatusaker-drag.png   (dragnät på allt)
//     -> .test-shots/natskott-gatusaker-klibb.png
//     -> .test-shots/natskott-gatusaker-boll.png
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const url = arg('--url', 'http://localhost:5173')
const SRC = arg('--src', 'C:/Users/Admin/AppData/Local/Temp/claude/C--repos-pwagames/e008ee63-a3fa-438e-b721-28622dc469f8/scratchpad/gatuobjekt.js')
const TMP = path.join(ROOT, 'scripts', '_gatuprobe_tmp.js')
const TMPHTML = path.join(ROOT, '_gatuprobe_tmp.html')
const SHOTS = path.join(ROOT, '.test-shots')
mkdirSync(SHOTS, { recursive: true })

const block = readFileSync(SRC, 'utf-8')

// Samma layoutkonstanter som spelet.
const modul = `// AUTOGENERERAD av scripts/_gatubild.mjs — raderas efter körningen.
import { Container, Graphics, Application } from 'pixi.js'
import { shade, tint, COLORS } from '../src/lib/theme.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rnd = (a, b) => a + Math.random() * (b - a)

${block}

const SIDEWALK_TOP = 555
const SIDEWALK_BOT = 612
const NEAR_BOT = 664
const CITY_WALLS = [0x9aa3b5, 0xb08a75, 0x8f9aa8, 0xa88f9b, 0x93a89a]

function band(root, oy) {
  const g = new Graphics()
  g.rect(0, oy, 1280, 430).fill(0x9fc7de)                       // himmel
  g.rect(0, oy + 430, 1280, SIDEWALK_TOP - 430).fill(0xa8bcc2)  // bakre gata
  // hus-siluetter som väggbakgrund (dörren ska ha nagot att sitta pa)
  let bx = -20
  let i = 0
  while (bx < 1300) {
    const bw = 200 + ((i * 37) % 70)
    const bh = 250 + ((i * 53) % 110)
    const wall = CITY_WALLS[i % CITY_WALLS.length]
    g.rect(bx, oy + SIDEWALK_TOP - bh, bw, bh).fill(wall).stroke({ width: 3, color: shade(wall, 0.25) })
    g.rect(bx, oy + SIDEWALK_TOP - 26, bw, 26).fill(shade(wall, 0.14))
    bx += bw + 14
    i++
  }
  g.rect(0, oy + SIDEWALK_TOP, 1280, SIDEWALK_BOT - SIDEWALK_TOP).fill(0xd8d3c8)
  g.rect(0, oy + SIDEWALK_TOP, 1280, 5).fill({ color: 0xffffff, alpha: 0.35 })
  g.rect(0, oy + SIDEWALK_BOT, 1280, NEAR_BOT - SIDEWALK_BOT).fill(0x565d66)
  g.rect(0, oy + SIDEWALK_BOT, 1280, 7).fill(0x9aa1a8)
  g.rect(0, oy + NEAR_BOT, 1280, 720 - NEAR_BOT).fill(0x3d434b)
  g.eventMode = 'none'
  root.addChild(g)
}

// x-plats per rad. rad 0 = oy 0, rad 1 = oy 720.
const PLATS = [
  ['appeltrad', 0, 130], ['lyktstolpe', 0, 300], ['trafikljus', 0, 400],
  ['korvstand', 0, 580], ['dorr', 0, 790], ['bil', 0, 1050],
  ['brandpost', 1, 100], ['brevlada', 1, 215], ['blommor', 1, 340],
  ['gatulock', 1, 450], ['cykel', 1, 590],
  ['dorr', 1, 780], ['appeltrad', 1, 960], ['trafikljus', 1, 1130],
]

export async function montera() {
  const app = new Application()
  await app.init({ width: 1280, height: 1440, background: 0x9fc7de, antialias: true })
  document.body.appendChild(app.canvas)
  app.canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647'
  band(app.stage, 0)
  band(app.stage, 720)

  const saker = []
  const matt = []
  window.__gatuFel = []
  for (const [id, rad, x] of PLATS) {
    const spec = GATUSAKER.find((s) => s.id === id)
    if (!spec) { window.__gatuFel.push('saknar spec: ' + id); continue }
    let v
    try { v = spec.rita() } catch (e) { window.__gatuFel.push(id + ' rita: ' + e.message); continue }
    const oy = rad * 720
    const fy = spec.fot === 'vagg' ? SIDEWALK_TOP : spec.fot === 'mark' ? 648 : 600
    v.position.set(x, oy + fy)
    app.stage.addChild(v)
    saker.push({ id, spec, v })
    const b = v.getLocalBounds()
    matt.push({
      id, deklW: spec.bredd, deklH: spec.hojd, traffR: spec.traffR,
      x0: Math.round(b.x), x1: Math.round(b.x + b.width),
      y0: Math.round(b.y), y1: Math.round(b.y + b.height),
    })
  }

  let tid = 0
  app.ticker.add((tk) => {
    const dt = tk.deltaMS / 1000
    tid += dt
    for (const s of saker) {
      if (!s.v._wxTick) continue
      try { s.v._wxTick(tid, dt) } catch (e) { window.__gatuFel.push(s.id + ' tick: ' + e.message) }
    }
  })

  const rakn = {}
  const rutor = saker.map((s) => {
    rakn[s.id] = (rakn[s.id] || 0) + 1
    const g = s.v.position
    const w = Math.min(1280, s.spec.bredd + 90)
    const h = s.spec.hojd + 80
    return {
      id: s.id, n: rakn[s.id] > 1 ? '-' + rakn[s.id] : '',
      klipp: {
        x: Math.max(0, Math.min(1280 - w, g.x - w / 2)),
        y: Math.max(0, Math.min(1440 - h, g.y - s.spec.hojd - 50)),
        width: w, height: h,
      },
    }
  })

  window.__gatu = {
    matt,
    rutor,
    ider: saker.map((s) => s.id),
    saknarTick: saker.filter((s) => typeof s.v._wxTick !== 'function').map((s) => s.id),
    saknarReagera: saker.filter((s) => typeof s.v._wxReagera !== 'function').map((s) => s.id),
    reagera(nat) {
      const taggar = []
      for (const s of saker) {
        if (typeof s.v._wxReagera !== 'function') continue
        try { taggar.push(s.id + '=' + s.v._wxReagera(nat)) }
        catch (e) { window.__gatuFel.push(s.id + ' reagera(' + nat + '): ' + e.message) }
      }
      return taggar
    },
    // simulerar att spelaren lämnar mitt i en reaktion
    riv() {
      for (const s of saker) s.v.destroy({ children: true })
    },
  }
  return true
}
`

writeFileSync(TMP, modul, 'utf-8')
// Egen tom sida — appens skal skulle annars navigera/ladda om mitt i körningen.
writeFileSync(TMPHTML, `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<title>gatusaker</title><style>html,body{margin:0;background:#222;overflow:hidden}</style></head>
<body><script type="module">
import { montera } from '/scripts/_gatuprobe_tmp.js'
montera().then(() => { window.__gatuKlar = true })
</script></body></html>
`, 'utf-8')

const fel = []
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1440 } })
  // favicon-404 på sondens tomma sida är inte ett spelfel
  page.on('response', (r) => { if (r.status() === 404) console.log('   (404: ' + r.url() + ')') })
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    if (/Failed to load resource/.test(m.text())) return
    fel.push('KONSOL: ' + m.text().slice(0, 220))
  })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 220)))
  let navs = 0
  page.on('framenavigated', (f) => { if (f === page.mainFrame() && ++navs > 1) fel.push('SIDAN LADDADES OM (' + navs + ')') })

  await page.goto(url.replace(/\/$/, '') + '/_gatuprobe_tmp.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__gatuKlar === true, null, { timeout: 15000 })
  await page.waitForTimeout(1600)

  const info = await page.evaluate(() => ({
    ider: window.__gatu.ider,
    matt: window.__gatu.matt,
    saknarTick: window.__gatu.saknarTick,
    saknarReagera: window.__gatu.saknarReagera,
  }))
  console.log('saker i bild:', info.ider.join(' · '))
  if (info.saknarTick.length) console.log('✗ saknar _wxTick:', info.saknarTick.join(', '))
  if (info.saknarReagera.length) console.log('✗ saknar _wxReagera:', info.saknarReagera.join(', '))
  console.log('\nlåda (deklarerad) vs faktisk silhuett:')
  for (const m of info.matt) {
    const fw = m.x1 - m.x0
    const fh = m.y1 - m.y0
    const flagga = fw > m.deklW * 1.25 || fh > m.deklH * 1.25 ? '  <-- sticker ut' : ''
    console.log(`  ${m.id.padEnd(11)} deklarerad ${String(m.deklW).padStart(3)}x${String(m.deklH).padStart(3)}  faktisk ${String(fw).padStart(3)}x${String(fh).padStart(3)}  x[${m.x0},${m.x1}] y[${m.y0},${m.y1}] traffR ${m.traffR}${flagga}`)
  }

  await page.screenshot({ path: path.join(SHOTS, 'natskott-gatusaker.png') })

  // närbilder: ett urklipp per sak, så detaljer (markis, posthorn, halo) går att döma
  if (process.argv.includes('--nara')) {
    const rutor = await page.evaluate(() => window.__gatu.rutor)
    for (const r of rutor) {
      await page.screenshot({ path: path.join(SHOTS, `natskott-nara-${r.id}${r.n}.png`), clip: r.klipp })
    }
    console.log(`\n${rutor.length} närbilder -> .test-shots/natskott-nara-*.png`)
  }

  for (const nat of ['drag', 'klibb', 'boll']) {
    const taggar = await page.evaluate((n) => window.__gatu.reagera(n), nat)
    console.log(`\n${nat}: ${taggar.join(' · ')}`)
    await page.waitForTimeout(520)
    await page.screenshot({ path: path.join(SHOTS, `natskott-gatusaker-${nat}.png`) })
    if (process.argv.includes('--nara')) {
      const rutor = await page.evaluate(() => window.__gatu.rutor)
      for (const r of rutor) {
        if (r.n) continue // bara första exemplaret av varje sak
        await page.screenshot({ path: path.join(SHOTS, `natskott-nara-${r.id}-${nat}.png`), clip: r.klipp })
      }
    }
    await page.waitForTimeout(1400) // låt reaktionen spela ut och återställa sig
    await page.screenshot({ path: path.join(SHOTS, `natskott-gatusaker-${nat}-sent.png`) })
    await page.waitForTimeout(2600)
  }

  // allt ska ha återställt sig av sig självt
  await page.waitForTimeout(2200)
  await page.screenshot({ path: path.join(SHOTS, 'natskott-gatusaker-efter.png') })

  // exit mitt i en reaktion: riv containrarna medan tick fortfarande kallas
  await page.evaluate(() => window.__gatu.reagera('drag'))
  await page.waitForTimeout(220)
  await page.evaluate(() => window.__gatu.riv())
  await page.waitForTimeout(700)

  const kastade = await page.evaluate(() => window.__gatuFel)
  if (kastade.length) fel.push(...kastade.map((k) => 'KAST: ' + k))
} finally {
  if (browser) await browser.close()
  try { rmSync(TMP) } catch { /* tom */ }
  try { rmSync(TMPHTML) } catch { /* tom */ }
}

console.log('')
if (fel.length) {
  console.log(`✗ ${fel.length} fel:`)
  for (const f of fel.slice(0, 12)) console.log('   ' + f)
} else {
  console.log('✓ 0 konsolfel, 0 kast (inkl. riv mitt i en reaktion)')
}
process.exit(fel.length ? 1 : 0)
