// HUR STOR ÄR DEN ÖPPNA MUNNEN, i designpixlar?
//
// `borsta-tanderna` vilar helt på ett gap som HÅLLS öppet: barnet ska dra en tandborste
// in i munnen och skrubba där. Frågan är alltså inte om `gap()` fungerar utan hur stor
// den SYNLIGA mun-inre-ytan blir — och den går inte att räkna fram ur manifestet:
// lagrens rutor bär genomskinlig marginal, så `ovre.y + ovre.h` ligger en bit under den
// sista ogenomskinliga raden. Ett tal räknat på rutorna gav 23 px; bilden såg större ut.
//
// MÄTNINGEN: mun-lagret byts mot en MAGENTA platta i exakt samma läge och samma index.
// Allt annat i riggen står kvar, så käken och överläppen skymmer plattan precis som de
// skymmer fotot. Synlig magenta ÄR alltså synlig mun-inre — ingen tröskling av en
// fotoyta där tänderna är vita och skuggan svart.
//
// KONTROLLARM: gap 0. Står munnen stängd ska talet vara ~0 px. Är det inte 0 mäter
// sonden något annat än munnen och resten av tabellen betyder ingenting.
//
//   node scripts/_gapprobe.mjs [--hojd 880] [--person pappa]
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const hojd = Number(opt('--hojd', 880))
const person = opt('--person', 'pappa')
const url = opt('--url', 'http://localhost:5173')
const spara = args.includes('--spara')
mkdirSync('.test-shots', { recursive: true })

const MAGENTA = 0xff00ff
const ANS_X = 640
const ANS_Y = 300

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)

  const fakta = await page.evaluate(async ({ person, hojd, ANS_X, ANS_Y, MAGENTA }) => {
    const { laddaAnsikte, Ansikte } = await import('/src/lib/ansikte.js')
    // En bar specifier ('pixi.js') gar inte att losa i sidkontexten. `rimLight`
    // RETURNERAR en Graphics ur appens egen Pixi-instans, och den gar att tomma
    // och rita om — samma vag som `_glodprobe` tar.
    const { rimLight } = await import('/src/lib/form.js')
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (String(c.label || '').startsWith('_gap')) c.removeFromParent()

    // Platt vit botten: magentan ska aldrig kunna forvaxlas med nagot annat.
    const botten = rimLight(1)
    botten.clear().rect(-300, -200, 1900, 1200).fill({ color: 0xffffff })
    botten.label = '_gapBotten'
    layer.addChild(botten)

    const data = await laddaAnsikte(person)
    const a = new Ansikte(data, { hojd })
    a.view.position.set(ANS_X, ANS_Y)
    a.view.label = '_gapAnsikte'
    layer.addChild(a.view)
    window.__gapAns = a

    // Mun-lagret ersatts av en platta i SAMMA lage och SAMMA index — kaken och
    // overlappen skymmer den da exakt som de skymmer fotot.
    const L = data.manifest.lager.mun
    const platta = rimLight(1)
    platta.clear().rect(L.x, L.y, L.w, L.h).fill({ color: MAGENTA })
    platta.eventMode = 'none'
    const ix = a._inre.getChildIndex(a._mun)
    a._inre.addChildAt(platta, ix)
    a._mun.visible = false
    window.__gapPlatta = platta
    window.__gapHem = L.y

    const k = hojd / data.manifest.ruta.h
    const G = data.manifest.geometri
    return {
      k,
      ruta: data.manifest.ruta,
      munRuta: {
        x: ANS_X + (G.mun.x - data.manifest.ruta.w / 2) * k,
        y: ANS_Y + (G.mun.y - data.manifest.ruta.h / 2) * k,
        w: G.mun.w * k,
        h: G.mun.h * k,
      },
      ogonY: ANS_Y + (G.ogonlinje - data.manifest.ruta.h / 2) * k,
      innehall: { x: ANS_X + (data.manifest.lager.bas.x - data.manifest.ruta.w / 2) * k, w: data.manifest.lager.bas.w * k },
    }
  }, { person, hojd, ANS_X, ANS_Y, MAGENTA })

  for (const g of [0, 0.35, 0.7, 1.0]) {
    await page.evaluate((g) => {
      const a = window.__gapAns
      a.gap(g)
      // mun-lagret följer käken en bit (MUN_FOLJ) — plattan måste följa med.
      window.__gapPlatta.y = a._mun.y - window.__gapHem
    }, g)
    await page.waitForTimeout(160)
    const buf = await page.screenshot()
    if (spara) writeFileSync(`.test-shots/_gapprobe-${String(g).replace('.', ',')}.png`, buf)
    const png = PNG.sync.read(buf)
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4
        // Magentan renderas rakt av (ingen alfa, ingen tint) — exakt jämförelse duger,
        // och en exakt jämförelse kan inte råka svepa in en hudton.
        if (png.data[i] < 230 || png.data[i + 1] > 40 || png.data[i + 2] < 230) continue
        n++
        if (x < x0) x0 = x; if (y < y0) y0 = y
        if (x > x1) x1 = x; if (y > y1) y1 = y
      }
    }
    rader.push({ g, n, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 })
  }

  await page.evaluate(() => {
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (String(c.label || '').startsWith('_gap')) c.removeFromParent()
    window.__gapAns?.destroy()
  })
  await page.waitForTimeout(300)

  console.log(`ANSIKTET  hojd ${hojd} · k ${fakta.k.toFixed(3)} · ruta ${fakta.ruta.w}x${fakta.ruta.h}`)
  console.log(`  ansiktets INNEHÅLL x ${Math.round(fakta.innehall.x)} .. ${Math.round(fakta.innehall.x + fakta.innehall.w)} (${Math.round(fakta.innehall.w)} px brett)`)
  console.log(`  ögonlinje y ${Math.round(fakta.ogonY)} · manifestets mun-ruta ${Math.round(fakta.munRuta.x)},${Math.round(fakta.munRuta.y)} ${Math.round(fakta.munRuta.w)}x${Math.round(fakta.munRuta.h)}`)
  console.log('')
  console.log('SYNLIG MUN-INRE (magenta platta i mun-lagrets ställe)')
  for (const r of rader) {
    const ctrl = r.g === 0 ? '   ← KONTROLLARM (ska vara ~0)' : ''
    if (r.n === 0) { console.log(`  gap ${r.g.toFixed(2)}   0 px${ctrl}`); continue }
    console.log(`  gap ${r.g.toFixed(2)}   ${String(r.n).padStart(6)} px · bbox ${r.x0},${r.y0} → ${r.x1},${r.y1}  (${r.w} x ${r.h} px)${ctrl}`)
  }
  const kontroll = rader.find((r) => r.g === 0)
  const full = rader.find((r) => r.g === 1)
  console.log('')
  if (kontroll.n > 400) console.log(`  ✗ KONTROLLARMEN LÄCKER (${kontroll.n} px vid stängd mun) — resten av tabellen mäter något annat`)
  else console.log(`  ✓ kontrollarmen tyst (${kontroll.n} px)`)
  console.log(`  P0: en träffyta behöver 96 px. Full gap ger ${full.w} x ${full.h} px synlig mun.`)
  console.log(errors.length ? `  ✗ ${errors.length} konsolfel: ${errors[0]}` : '  ✓ 0 konsolfel')
} finally {
  await browser.close()
}
