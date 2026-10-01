// _natram.mjs — vad KOSTAR kvällen i natskott-pa-stan? A/B mot HEAD, växelvis, med CPU-strypning.
//
// Kontrollarm = HEAD: `scripts/_natHEAD.mjs` (git show HEAD:…/index.js, importvägar
// omskrivna) läggs över spelets singleton i registret INNAN spelet startas — samma sida, samma
// server, samma strypning. Mätarm = arbetskopian.
//
// Varför strypning: utan den är rAF-intervallet mättat av vsync (17,4–18 ms oavsett vad som
// händer — CLAUDE.md "en sond som mäter bildrutetid kan vara MÄTTAD"). Med ×4 CPU slutar den
// vara det. Mäter dessutom spelets egen `_update` (JS) och renderarens `render()` (CPU-sidan)
// per bildruta, så skillnaden kan läggas på rätt rad.
//
//   node scripts/_natram.mjs [--url http://localhost:5174] [--cpu 4] [--varv 2] [--sek 6]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const url = opt('--url', 'http://localhost:5174')
const CPU = Number(opt('--cpu', 4))
const VARV = Number(opt('--varv', 2))
const SEK = Number(opt('--sek', 6))
const ID = 'natskott-pa-stan'
// Kontrollarm för MÄTAREN: --barlast N bränner N ms i spelets _update i NY-armen. Rör sig
// inte ramMs/updMs med en känd barlast mäter sonden ingenting.
const BARLAST = Number(opt('--barlast', 0))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []

const matFonster = (page, sek) =>
  page.evaluate(async (sek) => {
    const g = window.__natdbg
    const app = window.__barnspel.app
    const r = app.renderer
    const st = { ram: [], upd: 0, ren: 0, n: 0 }
    const origU = g._update
    g._update = function (ctx, tk) {
      const t0 = performance.now()
      origU.call(this, ctx, tk)
      st.upd += performance.now() - t0
      st.n++
    }
    const origR = r.render
    r.render = function (...a) {
      const t0 = performance.now()
      const ut = origR.apply(this, a)
      st.ren += performance.now() - t0
      return ut
    }
    let last = performance.now()
    let id = 0
    const f = (t) => {
      st.ram.push(t - last)
      last = t
      id = requestAnimationFrame(f)
    }
    id = requestAnimationFrame(f)
    await new Promise((res) => setTimeout(res, sek * 1000))
    cancelAnimationFrame(id)
    g._update = origU
    r.render = origR
    const ram = st.ram.slice(2)
    const medel = ram.reduce((a, b) => a + b, 0) / (ram.length || 1)
    const s = [...ram].sort((a, b) => a - b)
    let noder = 0
    const rakna = (n) => {
      noder++
      for (const c of n.children || []) rakna(c)
    }
    rakna(g._root)
    return {
      ramMs: +medel.toFixed(2),
      p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(1),
      updMs: +(st.upd / (st.n || 1)).toFixed(3),
      renMs: +(st.ren / (st.n || 1)).toFixed(3),
      rutor: ram.length,
      noder,
    }
  }, sek)

const arm = async (namn) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`${namn}: ${(e.message || String(e)).slice(0, 200)}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${namn}: ${m.text().slice(0, 200)}`))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  if (namn === 'HEAD') {
    await page.evaluate(async () => {
      const reg = await import('/src/games/registry.js')
      const g = reg.getGame('natskott-pa-stan')
      const head = (await import('/scripts/_natHEAD.mjs')).default
      for (const k of Object.keys(head)) g[k] = head[k]
    })
  }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(() => window.__natdbg && window.__natdbg._alive, null, { timeout: 30000 })
  // håll spelet i fri lek (inget uppdrag som spawnar annorlunda) och utan tomgångs-cue
  await page.evaluate((barlast) => {
    const g = window.__natdbg
    g._announce = () => {}
    g._idle = -1e9
    if (barlast > 0) {
      const o = g._update
      g._update = function (ctx, tk) {
        const t0 = performance.now()
        while (performance.now() - t0 < barlast) { /* barlast */ }
        o.call(this, ctx, tk)
      }
    }
  }, namn === 'NY' ? BARLAST : 0)
  await page.waitForTimeout(2500)
  const ut = { dag: await matFonster(page, SEK) }
  if (namn === 'NY') {
    await page.evaluate(() => {
      const g = window.__natdbg
      g._kvallMalNu = () => 1
      g._kvallFart = 4
    })
    await page.waitForTimeout(1500)
    ut.kvall = await matFonster(page, SEK)
    await page.evaluate(() => {
      const g = window.__natdbg
      g._kvallMalNu = () => 0.2
      g._vader = 'regn'
    })
    await page.waitForTimeout(1500)
    ut.regn = await matFonster(page, SEK)
  }
  await page.close()
  return ut
}

const res = { HEAD: [], NY: [] }
for (let v = 0; v < VARV; v++) {
  res.HEAD.push(await arm('HEAD'))
  res.NY.push(await arm('NY'))
}
const medel = (lista, lage, falt) => {
  const v = lista.map((x) => x[lage]?.[falt]).filter((x) => x != null)
  return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null
}
const sammanfattning = {}
for (const [arm, lagen] of [['HEAD', ['dag']], ['NY', ['dag', 'kvall', 'regn']]]) {
  for (const l of lagen) {
    sammanfattning[`${arm}/${l}`] = Object.fromEntries(['ramMs', 'p95', 'updMs', 'renMs', 'noder'].map((f) => [f, medel(res[arm], l, f)]))
  }
}
console.log(JSON.stringify({ cpu: CPU, sek: SEK, varv: VARV, sammanfattning, rad: res, errors }, null, 2))
await browser.close()
