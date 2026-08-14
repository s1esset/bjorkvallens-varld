// Kontrollarm till _snurrprobe.
//
// Mätkörningen slutar ibland med "Could not retrieve shader source (WebGL context may be
// lost)". Frågan är om det är SPELET eller RUTTEN (sonden monterar ett helt spel ovanpå
// den levande bibliotekskärmen och renderar båda i en minut). Armarna:
//   (tom)              bara bibliotekskärmen
//   --spel <id>        valfri spelmodul monterad och KLICKAD på i samma tempo
// Kör alltid minst tre varv per arm — ett enstaka utfall säger ingenting om en flake.
//
//   node scripts/_snurrkontroll.mjs --spel roliga-snurran --sek 50
//   node scripts/_snurrkontroll.mjs --spel tryck-och-forvandla --sek 50
import { chromium } from 'playwright'
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const SEK = Number(opt('--sek', 50))
const url = opt('--url', 'http://localhost:5173')
const spel = opt('--spel', null)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 120)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 120)))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)
  if (spel) {
    await page.evaluate(async (id) => {
      const s = window.__barnspel
      const { drawIcon } = await import('/src/lib/artikoner.js')
      const mod = (await import(`/src/games/${id}/index.js`)).default
      const stage = drawIcon('__ingen__', 1).clear()
      s.gateLayer.addChild(stage)
      const progress = { _st: { unlocked: true, highestLevel: 0, stars: 0, custom: {} }, get() { return this._st }, update() {}, setLevel() {}, addStars() {}, setCustom() {}, complete() {} }
      const ctx = { stage, ticker: s.app.ticker, width: 1280, height: 720, view: s.scaler.view, services: s, progress, fxLayer: s.fxLayer, exitToLibrary() {}, later(sec, fn) { const id2 = setTimeout(fn, sec * 1000); return { kill: () => clearTimeout(id2) } } }
      mod.init(ctx); mod.mount(ctx); window.__snurr = { mod, ctx }
    }, spel)
  }
  // Samma taktbelastning i båda armarna: två klick i sekunden över hela ytan.
  const t0 = Date.now()
  while (Date.now() - t0 < SEK * 1000) {
    await page.mouse.click(240 + Math.random() * 800, 200 + Math.random() * 380)
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `.test-shots/roliga-snurran-kontroll-${spel || 'tom'}.png` })
  const gl = fel.filter((f) => /WebGL|shader/i.test(f)).length
  console.log(`  ${(spel || 'TOM').padEnd(22)} ${SEK}s · ${fel.length} konsolfel (varav ${gl} GL) ${fel.length ? '· ' + fel[0] : ''}`)
} finally {
  await browser.close()
}
