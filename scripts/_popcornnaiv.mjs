// POPCORNKALASET — spela påsen och grytan som en NYBÖRJARE gör, inte som expertvägen i
// `_popcornspel` (släpp över målet → vänta → greppa SIDAN → dra lodrätt). Ägaren 2026-09-26:
// "jättesvår att styra / hälla från … fastnar, spiller, vägrar luta ibland".
//
//   node scripts/_popcornnaiv.mjs [--fall P1,G2,…] [--bild]      (kräver dev-servern på :5173)
//
// Varje fall laddar om spelet, gör EN gest och mäter: kärlets vinkel och läge under gesten,
// hur långt greppunkten släpar efter fingret, och vart innehållet tog vägen (kvar · målet ·
// spill). `--bild` sparar en skärmdump efter varje fall i .test-shots/.
import { chromium } from 'playwright'

const arg = process.argv.slice(2)
const FALL = arg.includes('--fall') ? arg[arg.indexOf('--fall') + 1].split(',') : null
const BILD = arg.includes('--bild')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

const G = (fn, a) => page.evaluate(fn, a)
async function starta() {
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await G(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
  await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
  await page.waitForTimeout(1200)
}
// Vid 1280×720 är designrummet 1:1 med skärmen, men läs det ändå.
const skarm = (x, y) => G(({ x, y }) => {
  const p = window.__barnspel.game._root.toGlobal({ x, y })
  const c = window.__barnspel.ctx.services.app.canvas.getBoundingClientRect()
  const r = window.__barnspel.ctx.services.app.renderer
  return { x: c.left + (p.x / r.width) * c.width * r.resolution, y: c.top + (p.y / r.height) * c.height * r.resolution }
}, { x, y })
const lokal = (namn, lx, ly) => G(({ namn, lx, ly }) => window.__barnspel.game[namn].varld(lx, ly), { namn, lx, ly })

// Läget just nu: kärlens vinkel/läge och greppunktens glapp mot fingret.
const las = (finger) => G((f) => {
  const g = window.__barnspel.game
  const k = (karl) => {
    const h = karl._hand
    const fp = karl._fast ? karl.varld(karl._fast.x, karl._fast.y) : null
    return { lage: karl.lage, zon: karl.zon, v: +(karl.vinkel * 57.3).toFixed(0), x: Math.round(karl.body.position.x), y: Math.round(karl.body.position.y), glapp: f && fp ? Math.round(Math.hypot(fp.x - f.x, fp.y - f.y)) : null }
  }
  return { gryta: k(g._gryta), pase: k(g._pase) }
}, finger)

// Vart innehållet tog vägen.
const innehall = () => G(async () => {
  const g = window.__barnspel.game
  const { iSkal } = await import('/src/games/popcornkalaset/fysik.js')
  const { SKAL } = await import('/src/games/popcornkalaset/matt.js')
  const korn = { pase: 0, gryta: 0, annat: 0 }
  for (const k of g._korn) {
    const p = k.body.position
    if (g._pase.inuti(p.x, p.y, 10)) korn.pase++
    else if (g._gryta.inuti(p.x, p.y, 10)) korn.gryta++
    else korn.annat++
  }
  const pop = { gryta: 0, skal: 0, annat: 0 }
  for (const q of g._pop) {
    const p = q.body.position
    if (g._gryta.inuti(p.x, p.y, 20)) pop.gryta++
    else if (SKAL.some((s) => iSkal(s, p.x, p.y))) pop.skal++
    else pop.annat++
  }
  return { korn, pop }
})

// Ett drag med riktiga musrörelser; `spar` loggar läget var `var`:e steg.
async function drag(fran, till, { steg = 30, hall = 0, ms = 16, spar = null, upp = true } = {}) {
  const a = await skarm(fran.x, fran.y)
  const b = await skarm(till.x, till.y)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  const spår = []
  for (let i = 1; i <= steg; i++) {
    const f = { x: fran.x + ((till.x - fran.x) * i) / steg, y: fran.y + ((till.y - fran.y) * i) / steg }
    await page.mouse.move(a.x + ((b.x - a.x) * i) / steg, a.y + ((b.y - a.y) * i) / steg)
    await page.waitForTimeout(ms)
    if (spar && (i % 5 === 0 || i === steg)) spår.push(await las(f))
  }
  if (hall) {
    for (let t = 0; t < hall; t += 250) {
      await page.waitForTimeout(250)
      if (spar) spår.push(await las(till))
    }
  }
  if (upp) await page.mouse.up()
  return spår
}
const vanta = (ms) => page.waitForTimeout(ms)

// Grytan full av popcorn, på spisen, utan att spela påsen (samma 30 st varje gång).
async function fyllGrytan(n = 30) {
  await G((n) => {
    const g = window.__barnspel.game
    for (const k of [...g._korn]) g._taKorn(k)
    for (let i = 0; i < n; i++) {
      const p = g._gryta.varld(((i % 6) - 2.5) * 26, 88 - Math.floor(i / 6) * 16)
      g._nyttKorn(p.x, p.y)
    }
  }, n)
  await vanta(600)
  await G((n) => window.__popcorn.poppa(n), n)
  await vanta(2200)
}

const vis = (s, karl) => s.map((r) => `${r[karl].lage}/${r[karl].zon ?? '-'} ${r[karl].v}°${r[karl].glapp != null ? ' g' + r[karl].glapp : ''}`).join(' → ')

const FALLEN = {
  // PÅSEN ---------------------------------------------------------------------------------
  async P1() {
    console.log('P1 påsen: bär den över grytan och försök LUTA den utan att släppa (drag nedåt-höger)')
    const mitt = await lokal('_pase', 0, 52)
    const gm = await lokal('_gryta', 0, 0)
    const over = { x: gm.x - 20, y: gm.y - 150 }
    await drag(mitt, over, { steg: 30, upp: false })
    const s = await drag(over, { x: over.x + 120, y: over.y + 160 }, { steg: 30, hall: 1500, spar: true })
    console.log('   ', vis(s, 'pase'))
    await vanta(1500)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async P2() {
    console.log('P2 påsen: släpp över grytan, greppa sidan DIREKT och dra nedåt (otålig)')
    const mitt = await lokal('_pase', 0, 52)
    const gm = await lokal('_gryta', 0, 0)
    await drag(mitt, { x: gm.x - 20, y: gm.y - 150 }, { steg: 30 })
    await vanta(120)
    const sida = await lokal('_pase', 38 + 8, 20)
    const s = await drag(sida, { x: sida.x, y: sida.y + 220 }, { steg: 40, hall: 2500, spar: true })
    console.log('   ', vis(s, 'pase'))
    await vanta(1500)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async P3() {
    console.log('P3 påsen: parkerad över grytan, greppa sidan och dra i SIDLED')
    const mitt = await lokal('_pase', 0, 52)
    const gm = await lokal('_gryta', 0, 0)
    await drag(mitt, { x: gm.x - 20, y: gm.y - 150 }, { steg: 30 })
    await vanta(1600)
    const sida = await lokal('_pase', 38 + 8, 20)
    const s = await drag(sida, { x: sida.x + 200, y: sida.y }, { steg: 30, hall: 2000, spar: true })
    console.log('   ', vis(s, 'pase'))
    await vanta(1500)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async P4() {
    console.log('P4 påsen: parkerad, greppa MITT PÅ och dra nedåt')
    const mitt = await lokal('_pase', 0, 52)
    const gm = await lokal('_gryta', 0, 0)
    await drag(mitt, { x: gm.x - 20, y: gm.y - 150 }, { steg: 30 })
    await vanta(1600)
    const m2 = await lokal('_pase', 0, 52)
    const s = await drag(m2, { x: m2.x, y: m2.y + 200 }, { steg: 30, hall: 2000, spar: true })
    console.log('   ', vis(s, 'pase'))
    await vanta(1500)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async P5() {
    console.log('P5 påsen: expertvägen (släpp, vänta, sidan nedåt 220 px) — kontrollarm')
    const mitt = await lokal('_pase', 0, 52)
    const gm = await lokal('_gryta', 0, 0)
    await drag(mitt, { x: gm.x - 20, y: gm.y - 150 }, { steg: 30 })
    await vanta(1600)
    const sida = await lokal('_pase', 38 + 8, 20)
    const s = await drag(sida, { x: sida.x, y: sida.y + 220 }, { steg: 40, hall: 2500, spar: true })
    console.log('   ', vis(s, 'pase'))
    await vanta(1500)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  // GRYTAN --------------------------------------------------------------------------------
  async G1() {
    console.log('G1 grytan: greppa SIDAN på spisen och bär den till skål 0')
    await fyllGrytan()
    const sida = await lokal('_gryta', 100 + 13, 40)
    const s = await drag(sida, { x: 706, y: sida.y - 40 }, { steg: 36, spar: true })
    console.log('   ', vis(s, 'gryta'))
    await vanta(2500)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async G2() {
    console.log('G2 grytan: bygeln till skål 0 och LUTA utan att släppa (drag nedåt-höger)')
    await fyllGrytan()
    const bygel = await lokal('_gryta', 0, -92)
    const over = { x: 706, y: bygel.y - 60 }
    await drag(bygel, over, { steg: 36, upp: false })
    const s = await drag(over, { x: over.x + 120, y: over.y + 150 }, { steg: 30, hall: 1500, spar: true })
    console.log('   ', vis(s, 'gryta'))
    await vanta(2000)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async G3() {
    console.log('G3 grytan: bygeln till skål 0, släpp, greppa BYGELN igen och dra nedåt')
    await fyllGrytan()
    const bygel = await lokal('_gryta', 0, -92)
    await drag(bygel, { x: 706, y: bygel.y - 60 }, { steg: 36 })
    await vanta(1600)
    const b2 = await lokal('_gryta', 0, -92)
    const s = await drag(b2, { x: b2.x, y: b2.y + 200 }, { steg: 30, hall: 1500, spar: true })
    console.log('   ', vis(s, 'gryta'))
    await vanta(2000)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async G4() {
    console.log('G4 grytan: bygeln till skål 0, släpp, greppa sidan DIREKT och dra nedåt (otålig)')
    await fyllGrytan()
    const bygel = await lokal('_gryta', 0, -92)
    await drag(bygel, { x: 706, y: bygel.y - 60 }, { steg: 36 })
    await vanta(120)
    const sida = await lokal('_gryta', 113, 20)
    const s = await drag(sida, { x: sida.x, y: sida.y + 240 }, { steg: 50, hall: 2600, spar: true })
    console.log('   ', vis(s, 'gryta'))
    await vanta(2000)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async G5() {
    console.log('G5 grytan: expertvägen (bygeln, släpp, vänta, sidan nedåt 240 px) — kontrollarm')
    await fyllGrytan()
    const bygel = await lokal('_gryta', 0, -92)
    await drag(bygel, { x: 706, y: bygel.y - 60 }, { steg: 36 })
    await vanta(1600)
    const sida = await lokal('_gryta', 113, 20)
    const s = await drag(sida, { x: sida.x, y: sida.y + 240 }, { steg: 50, hall: 2600, spar: true })
    console.log('   ', vis(s, 'gryta'))
    await vanta(2000)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async G6() {
    console.log('G6 grytan: bygeln till skål 0, släpp, greppa VÄNSTRA sidan och dra nedåt')
    await fyllGrytan()
    const bygel = await lokal('_gryta', 0, -92)
    await drag(bygel, { x: 706, y: bygel.y - 60 }, { steg: 36 })
    await vanta(1600)
    const sida = await lokal('_gryta', -113, 20)
    const s = await drag(sida, { x: sida.x, y: sida.y + 240 }, { steg: 50, hall: 2600, spar: true })
    console.log('   ', vis(s, 'gryta'))
    await vanta(2000)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
  async G7() {
    console.log('G7 grytan: glappet — bygeln fram och tillbaka i vanlig takt (600 px på 0,5 s)')
    await fyllGrytan()
    const bygel = await lokal('_gryta', 0, -92)
    const s = await drag(bygel, { x: bygel.x + 500, y: bygel.y - 60 }, { steg: 30, ms: 16, spar: true, hall: 1000 })
    console.log('   ', vis(s, 'gryta'))
    await vanta(1500)
    console.log('    innehåll', JSON.stringify(await innehall()))
  },
}

try {
  for (const [namn, fn] of Object.entries(FALLEN)) {
    if (FALL && !FALL.includes(namn)) continue
    await starta()
    await fn()
    if (BILD) await page.screenshot({ path: `.test-shots/_popcornnaiv_${namn}.png` })
  }
  console.log(errors.length ? `\n✗ ${errors.length} konsolfel: ${errors.slice(0, 4).join(' | ')}` : '\n✓ 0 konsolfel')
} finally {
  await browser.close()
}
