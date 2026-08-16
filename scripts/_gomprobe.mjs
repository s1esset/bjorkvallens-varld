// `titt-ut-pappa`: SER VARJE GÖMSTÄLLE RÄTT UT när han kikar och när han hittas?
//
// Ett gömställe går inte att bedöma i tal — det var precis så dörrbuggen överlevde: talen
// (kantY, ansY, träffyta) var alla lagliga, och ändå hängde huvudet fritt ovanför karmen.
// Sonden ställer därför pappa i VARJE möbel och fotograferar tre lägen: gömd · kikande ·
// hittad. Den laddar om tills alla möbler i katalogen har visat sig (rummet bär nio av dem
// åt gången).
//
// Den mäter också det som GÅR att mäta, mot layouten:
//   · hamnar ansiktets rutas överkant över möbelns täckande kant när han är GÖMD? (ska INTE)
//   · hamnar fotorutans RAKA UNDERKANT utanför det som täcker den? (ska INTE)
//   · rör han sig alls mellan gömd och hittad? (ett gömställe utan avslöjande är trasigt)
//
//   node scripts/_gomprobe.mjs [--bara dorr,lampa]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const ID = 'titt-ut-pappa'
const bara = (() => {
  const i = process.argv.indexOf('--bara')
  return i > 0 ? process.argv[i + 1].split(',') : null
})()
mkdirSync('.test-shots/gom', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const R = (n) => Math.round(n)

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })

  const G = (src) => page.evaluate(
    async ([gid, s]) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      return eval(s)
    }, [ID, src],
  )

  const alla = await page.evaluate(async () => {
    const L = await import('/src/games/titt-ut-pappa/layout.js')
    return Object.keys(L.MOBLER)
  })
  const kvar = new Set(bara || alla)
  const rader = []

  for (let varv = 0; varv < 12 && kvar.size; varv++) {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1500)
    const keys = await G('g._platser.map(p => p.key)')
    for (let i = 0; i < keys.length; i++) {
      if (!kvar.has(keys[i])) continue
      kvar.delete(keys[i])
      const key = keys[i]

      // Ställ pappa i just den här möbeln, utan att röra resten av rundan.
      const matt = await G(`(async () => {
        const L = await import('/src/games/titt-ut-pappa/layout.js')
        const plats = g._platser[${i}]
        g._busy = false
        for (const p of g._platser) { if (p.innehall === 'pappa') p.innehall = null; p.g.stang?.() }
        plats.innehall = 'pappa'
        g._pappaPlats = plats
        g._flyttaPappa(plats, { direkt: true })
        const M = L.MOBLER[plats.key]
        const a = g._ans
        const s = plats.s
        const as = s * (M.ansSkala ?? 1)
        const tak = plats.ankare.y + (M.tackY != null ? M.tackY : M.kantY) * s
        return {
          key: plats.key, slot: plats.slot.id, s: +s.toFixed(2), as: +as.toFixed(2),
          // Ansiktets synliga hjässa och fotorutans RAKA underkant, i världen.
          hjassa: a.view.y - L.ANS_HJASSA * as,
          fotUnder: a.view.y + (L.ANS_H / 2) * as,
          tak,
          gomd: { x: a.view.x, y: a.view.y },
          kik: { x: g._kikX, y: g._kikY },
          upp: { x: g._uppX, y: g._uppY, lut: g._uppLut || 0 },
        }
      })()`)

      await page.screenshot({ path: `.test-shots/gom/${key}-1-gomd.png` })
      await G('g._kika()')
      await page.waitForTimeout(420)
      await page.screenshot({ path: `.test-shots/gom/${key}-2-kikar.png` })
      await page.waitForTimeout(900)
      const fel = await G(`(() => {
        try {
          g._kikar = false
          g._busy = false
          g._hittaPappa({
            services: window.__barnspel,
            fxLayer: window.__barnspel.fxLayer,
            later: (t, f) => setTimeout(f, t * 1000),
            progress: { get: () => ({}), setLevel() {}, complete() {} },
          }, g._platser[${i}])
          return null
        } catch (e) { return String(e && e.message || e).slice(0, 140) }
      })()`)
      if (fel) console.log(`  ⚠ ${key}: _hittaPappa kastade — ${fel}`)
      await page.waitForTimeout(700)
      const lage = await G('(() => { const a = g._ans.view; return { x: Math.round(a.x), y: Math.round(a.y), v: a.visible, al: +a.alpha.toFixed(2) } })()')
      matt.efter = lage
      await page.screenshot({ path: `.test-shots/gom/${key}-3-hittad.png` })

      rader.push(matt)
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await page.waitForTimeout(500)
      break   // en möbel per laddning: `_hittaPappa` startar en ny runda och flyttar allt
    }
  }

  console.log('möbel        plats  skala  ansikte  gömd hjässa vs täckande kant   fotokant vs kant   rör sig?')
  for (const r of rader) {
    const dolt = r.hjassa >= r.tak - 0.5
    const rorelse = R(Math.hypot(r.upp.x - r.gomd.x, r.upp.y - r.gomd.y))
    console.log(
      `${r.key.padEnd(12)} ${r.slot.padEnd(6)} ${String(r.s).padEnd(6)} ${String(r.as).padEnd(8)} ` +
      `hjässa ${R(r.hjassa)} ${dolt ? '≥' : '<'} kant ${R(r.tak)} ${dolt ? '✓' : '✗ STICKER UPP'}   ` +
      `foto ${R(r.fotUnder)}   ${rorelse} px${rorelse < 8 ? ' ✗ RÖR SIG INTE' : ''}` +
      ` · efter: (${r.efter?.x},${r.efter?.y}) mål (${R(r.upp.x)},${R(r.upp.y)})${r.efter && Math.hypot(r.efter.x - r.upp.x, r.efter.y - r.upp.y) > 14 ? ' ✗ HAMNADE FEL' : ''}` +
      (r.upp.lut ? ` lut ${r.upp.lut}` : ''),
    )
  }
  if (kvar.size) console.log(`\n⚠ hann aldrig se: ${[...kvar].join(', ')}`)

  // KOMPISEN i en liten väggsak. Samma fråga som för pappa: kommer den ut vid SIDAN eller
  // svävar den ovanför ramen? (Grundfallet "upp över kanten" gäller en korg, inte en tavla.)
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1500)
  const kmp = await G(`(() => {
    const i = g._platser.findIndex(p => p.slot.sort === 'liten' && p.innehall && p.innehall !== 'pappa')
    if (i < 0) return null
    const plats = g._platser[i]
    g._busy = false
    g._hittaKompis({
      services: window.__barnspel, fxLayer: window.__barnspel.fxLayer,
      later: (t, f) => setTimeout(f, t * 1000),
      progress: { get: () => ({}), setLevel() {}, complete() {} },
    }, plats)
    return { plats: plats.slot.id, ram: { x: plats.ankare.x, y: plats.ankare.y }, skala: +g._kompisSkala(plats).toFixed(2) }
  })()`)
  if (kmp) {
    await page.waitForTimeout(600)
    const k = await G('(() => { const v = [...g._kompisar].map(k => k.view).filter(v => v && !v.destroyed && v.visible)[0]; return v ? { x: Math.round(v.x), y: Math.round(v.y) } : null })()')
    await page.screenshot({ path: '.test-shots/gom/_kompis-liten.png' })
    console.log(`\nKOMPIS i ${kmp.plats}: skala ${kmp.skala} · hamnade (${k?.x},${k?.y}) · ramens ankare (${kmp.ram.x},${kmp.ram.y})`)
    console.log(`  ${k && k.y > kmp.ram.y - 190 ? '✓ vid ramen, inte ovanför den' : '✗ svävar över ramen'} · bild: .test-shots/gom/_kompis-liten.png`)
  }
  console.log(`\nbilder: .test-shots/gom/<mobel>-{1-gomd,2-kikar,3-hittad}.png`)
  console.log(`konsolfel: ${errors.length}`)
  for (const e of errors.slice(0, 8)) console.log('  ' + e)
} finally {
  await browser.close()
}
