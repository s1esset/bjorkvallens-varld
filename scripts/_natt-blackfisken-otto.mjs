// BLÄCKFISKEN OTTO — kärnloopen med riktig mus, två rundor otåligt (N1, natt 2026-10-02)
//
//   node scripts/_natt-blackfisken-otto.mjs        (kräver dev-servern på :5173)
//
// Harnessens auto-drag träffar inga föremål (drag/ratt 0). Sonden trycker där en sak FAKTISKT
// ligger (`_saker`), drar till vännen som vill ha den (`_vanner`) och släpper; burken dras i
// stället 260 px bort från fisken. Kontrollarm först i varje runda: en sak som INTE är behovet
// dras till en vän — vännen ska inte bli klar. Sedan alla behov i följd utan väntan, tills
// `progress.complete()` har räknats. Två rundor, sist exit mitt i festen.
import { chromium } from 'playwright'

const ID = 'blackfisken-otto'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(2500)
  await page.evaluate(() => {
    const p = window.__barnspel.ctx.progress
    window.__klar = 0
    const orig = p.complete.bind(p)
    p.complete = (...a) => { window.__klar++; return orig(...a) }
  })
  const las = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const st = window.__barnspel.ctx.stage
    const gl = (o) => { const q = st.toGlobal({ x: o.x, y: o.y }); return { x: q.x, y: q.y } }
    return {
      fas: g._fas, klara: g._klara, complete: window.__klar,
      saker: g._saker.map((s) => ({ id: s.id, behov: s.behov, klar: s.klar, tung: s.tung, ...gl(s) })),
      vanner: g._vanner.map((v) => ({ typ: v.typ, klar: v.klar, ...gl(v) })),
    }
  })
  const dra = async (a, b, steg = 18) => {
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.waitForTimeout(250) // armen hinner fram till saken
    for (let i = 1; i <= steg; i++) {
      await page.mouse.move(a.x + (b.x - a.x) * i / steg, a.y + (b.y - a.y) * i / steg)
      await page.waitForTimeout(35)
    }
    await page.waitForTimeout(120)
    await page.mouse.up()
  }

  const rundor = []
  for (let runda = 0; runda < 2; runda++) {
    await page.waitForFunction(() => window.__barnspel.game._fas === 'spel', null, { timeout: 20000 })
    await page.waitForTimeout(300)
    let s = await las()
    const r = { vanner: s.vanner.map((v) => v.typ), kontroll: null, leveranser: [] }
    // Kontrollarm: fel sak till en vän.
    const v0 = s.vanner.find((v) => !v.klar)
    const fel = s.saker.find((q) => q.behov !== v0.typ && !q.tung && !q.klar)
    if (fel) {
      await dra(fel, v0)
      await page.waitForTimeout(600)
      s = await las()
      r.kontroll = { sak: fel.id, till: v0.typ, vanKlar: s.vanner.find((v) => v.typ === v0.typ).klar }
    }
    // Mätarm: varje behov, otåligt i följd. Upp till 3 försök per vän.
    for (let f = 0; f < 9; f++) {
      s = await las()
      if (s.fas !== 'spel') break
      const v = s.vanner.find((q) => !q.klar)
      if (!v) break
      const sak = s.saker.find((q) => q.behov === v.typ && !q.klar)
      if (!sak) { r.leveranser.push({ van: v.typ, fel: 'ingen sak' }); break }
      const mal = sak.id === 'burk' ? { x: sak.x - 260, y: Math.max(120, sak.y - 120) } : v
      await dra(sak, mal)
      await page.waitForTimeout(400)
      const e = await las()
      r.leveranser.push({ van: v.typ, sak: sak.id, fran: [Math.round(sak.x), Math.round(sak.y)], till: [Math.round(mal.x), Math.round(mal.y)], klar: e.vanner.find((q) => q.typ === v.typ).klar })
    }
    await page.waitForFunction((n) => window.__klar > n, runda, { timeout: 15000 }).catch(() => {})
    s = await las()
    r.fasEfter = s.fas
    r.complete = s.complete
    rundor.push(r)
    if (runda === 0) await page.waitForFunction(() => window.__barnspel.game._fas === 'spel', null, { timeout: 20000 }).catch(() => {})
  }
  // Exit mitt i festen: andra rundans fest pågår (eller har just börjat).
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1500)
  console.log(JSON.stringify({ rundor, completeTotalt: await page.evaluate(() => window.__klar), antalFel: errors.length, errors: errors.slice(0, 5) }, null, 2))
} finally {
  await browser.close()
}
