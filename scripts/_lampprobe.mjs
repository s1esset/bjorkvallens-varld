// FICKLAMPAN i `skattjakt-i-morkret`: släpper draget taget när fingret lyfts?
//
// Ägarrapport: "ficklampan fastnar när man släpper den och då kan man inte flytta runt
// den mer." Sonden mäter TILLSTÅNDET efter ett släpp (`_drar` · `_pekId`) och sedan
// FENOMENET: kan en NY pekare (annat pointerId, som en ny fingerpekning alltid får)
// flytta ljuset efteråt?
//
// KONTROLLARM FÖRST: samma sekvens med greppet på tomma ytan (`_catcher`). Den vägen
// fungerar på HEAD, så om kontrollarmen också visar "fastnar" mäter sonden fel sak.
//
//   node scripts/_lampprobe.mjs
import { chromium } from 'playwright'

const ID = 'skattjakt-i-morkret'
const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1800)

  const G = (src) =>
    page.evaluate(
      async ([gid, s]) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        return eval(s)
      },
      [ID, src],
    )

  const cdp = await page.context().newCDPSession(page)
  // Skärmkoordinat för en DESIGN-punkt (appens scaler ligger emellan).
  const skarm = (dx, dy) =>
    G(`(() => {
      const p = g._rot.toGlobal({ x: ${dx}, y: ${dy} })
      const c = window.__barnspel.app.canvas.getBoundingClientRect()
      return { x: Math.round(c.left + p.x * (c.width / window.__barnspel.app.renderer.width)),
               y: Math.round(c.top + p.y * (c.height / window.__barnspel.app.renderer.height)) }
    })()`)

  const lampPos = () => G('({ x: Math.round(g._lampa.x), y: Math.round(g._lampa.y), lx: Math.round(g._lx), tx: Math.round(g._tx), drar: !!g._drar, pekId: g._pekId })')

  // Ett helt drag med EN finger-id: ner · flytta · upp.
  const drag = async (id, from, to) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id }] })
    await page.waitForTimeout(60)
    for (let i = 1; i <= 6; i++) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / 6)
      const y = Math.round(from.y + ((to.y - from.y) * i) / 6)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id }] })
      await page.waitForTimeout(24)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(220)
  }

  const rader = []
  // En arm: greppa `var`, dra till `dit`, släpp — och pröva sedan att flytta ljuset med
  // en NY pekare (annat id) till `sen`. Mätvärdet är hur långt ljuset FAKTISKT gick.
  const arm = async (namn, grepp, dit, sen, id1, id2) => {
    const p0 = await lampPos()
    await drag(id1, grepp, dit)
    const p1 = await lampPos()
    // Ny pekning på annan plats — ska flytta ljuset dit.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sen.x, y: sen.y, id: id2 }] })
    await page.waitForTimeout(60)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sen.x + 40, y: sen.y + 30, id: id2 }] })
    await page.waitForTimeout(400)
    const p2 = await lampPos()
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(300)
    rader.push({
      namn,
      floyttDrag: Math.hypot(p1.x - p0.x, p1.y - p0.y),
      drarEfterSlapp: p1.drar,
      pekIdEfterSlapp: p1.pekId,
      flyttEfter: Math.hypot(p2.x - p1.x, p2.y - p1.y),
    })
  }

  // 1) KONTROLLARM: greppa TOMMA ytan (catcher) — den vägen fungerar på HEAD.
  await arm('grepp på tomma ytan', await skarm(420, 300), await skarm(700, 380), await skarm(300, 250), 11, 12)
  // 2) MÄTARM: greppa SJÄLVA FICKLAMPAN. Fingret ligger då exakt på lampans mitt.
  const lampa = await G('({ x: g._lampa.x, y: g._lampa.y })')
  await arm('grepp på ficklampan', await skarm(lampa.x, lampa.y), await skarm(600, 420), await skarm(950, 260), 21, 22)

  console.log(`\n  ${ID} — släpper draget taget?\n`)
  for (const r of rader) {
    console.log(`  ${r.namn}`)
    console.log(`    lampan flyttades under draget   ${Math.round(r.floyttDrag)} px`)
    console.log(`    efter släpp: _drar=${r.drarEfterSlapp}  _pekId=${r.pekIdEfterSlapp}`)
    console.log(`    NY pekare flyttar lampan        ${Math.round(r.flyttEfter)} px   ${r.flyttEfter < 20 ? '← FASTNAT' : 'ok'}`)
  }
  console.log(`\n  konsolfel: ${errors.length}`)
  for (const e of errors.slice(0, 5)) console.log('    ' + e)

  const fel = rader.some((r) => r.drarEfterSlapp || r.pekIdEfterSlapp !== null || r.flyttEfter < 20) || errors.length > 0
  console.log(fel ? '\n  ✗ draget släpps inte överallt\n' : '\n  ✓ draget släpps på båda greppen\n')
  process.exit(fel ? 1 : 0)
} finally {
  await browser.close()
}
