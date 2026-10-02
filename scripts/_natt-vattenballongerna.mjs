// VATTENBALLONGERNA — kran + sikte med riktig mus, två rundor otåligt (N1, natt 2026-10-02)
//
//   node scripts/_natt-vattenballongerna.mjs        (kräver dev-servern på :5173)
//
// Harnessens auto-drag träffar aldrig ballongen (drag/ratt 0). Sonden trycker på kranen där den
// FAKTISKT står (`_kran`), väntar in en fylld ballong (`_st === 'klar'`) och drar bakåt från
// skjutplatsen (`_ballong`) i 45° med en kraft som justeras efter förra nedslaget mot närmaste
// varma djur — ett otåligt barn som rättar sig själv. Kontrollarm först: ett drag från tom äng
// får INTE kasta något. Mäter kast per runda, träffar, missar och complete(); två rundor.
import { chromium } from 'playwright'

const ID = 'vattenballongerna'
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
    const gl = (x, y) => { const q = st.toGlobal({ x, y }); return { x: q.x, y: q.y } }
    return {
      st: g._st, complete: window.__klar,
      kran: gl(g._kran.x, g._kran.y), ballong: { ...gl(g._ballong.x, g._ballong.y), fylld: g._ballong.fylld },
      djur: g._djur.map((d) => ({ art: d.art, sval: d.sval, ...gl(d.nod.x, d.nod.y) })),
    }
  })
  const vanta = (fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false)

  // Kontrollarm: drag från tom äng, ingen ballong i luften efteråt.
  await vanta(() => window.__barnspel.game._st === 'ingen')
  await page.mouse.move(640, 680); await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(640 - i * 12, 680 - i * 6)
  await page.mouse.up()
  await page.waitForTimeout(500)
  const kontroll = { stEfter: (await las()).st }

  const rundor = []
  let m = 90 // dragets längd (px), justeras efter nedslaget
  for (let runda = 0; runda < 2; runda++) {
    const r = { arter: null, kast: 0, traffar: 0, missar: 0, nedslag: [], complete: 0 }
    for (let k = 0; k < 40; k++) {
      await vanta(() => ['ingen', 'klar', 'finish'].includes(window.__barnspel.game._st))
      let s = await las()
      r.arter ??= s.djur.map((d) => d.art).join(',')
      if (s.complete > runda || s.st === 'finish') break
      if (s.st === 'ingen') {
        await page.mouse.click(s.kran.x, s.kran.y - 10)
        if (!(await vanta(() => window.__barnspel.game._st === 'klar', null, 6000))) { r.fel = 'kranen fyllde inte'; break }
        s = await las()
      }
      const mal = s.djur.filter((d) => !d.sval).sort((a, b) => a.x - b.x)[0]
      if (!mal) { await page.waitForTimeout(300); continue }
      const b = s.ballong
      await page.mouse.move(b.x, b.y); await page.mouse.down()
      for (let i = 1; i <= 10; i++) await page.mouse.move(b.x - (m * i) / 10 / Math.SQRT2, b.y + (m * i) / 10 / Math.SQRT2)
      await page.mouse.up()
      r.kast++
      await vanta(() => window.__barnspel.game._st !== 'flyger' && window.__barnspel.game._st !== 'klar', null, 8000)
      const e = await page.evaluate(() => ({ x: window.__barnspel.game._ballong.x, st: window.__barnspel.game._st }))
      await page.waitForTimeout(1200) // stänket svalkar under kaskaden, inte i nedslagsrutan
      const efter = await las()
      const blevSval = efter.djur.filter((d) => d.sval).length > s.djur.filter((d) => d.sval).length
      if (blevSval) r.traffar++; else r.missar++
      r.nedslag.push([Math.round(m), Math.round(e.x), Math.round(mal.x), blevSval ? 'T' : '-'])
      if (!blevSval) m = Math.max(30, Math.min(220, m + (mal.x - e.x) * 0.12))
    }
    await vanta((n) => window.__klar > n, runda, 15000)
    r.complete = (await las()).complete
    rundor.push(r)
    await vanta(() => window.__barnspel.game._st === 'ingen', null, 20000)
  }
  // Exit mitt i en flygning.
  const s = await las()
  if (s.st === 'ingen') {
    await page.mouse.click(s.kran.x, s.kran.y - 10)
    await vanta(() => window.__barnspel.game._st === 'klar', null, 6000)
    const b = (await las()).ballong
    await page.mouse.move(b.x, b.y); await page.mouse.down(); await page.mouse.move(b.x - 60, b.y + 60); await page.mouse.up()
    await page.waitForTimeout(250)
  }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1500)
  console.log(JSON.stringify({ kontroll, rundor, completeTotalt: await page.evaluate(() => window.__klar), antalFel: errors.length, errors: errors.slice(0, 5) }))
} finally {
  await browser.close()
}
