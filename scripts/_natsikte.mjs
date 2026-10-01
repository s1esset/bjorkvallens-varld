// _natsikte.mjs — träffar nätbollen det barnet SIKTAR på? HEAD mot arbetskopian, växelvis.
//
// Varje försök: gatan töms på mål (gatusakerna står kvar som i spelet), en katt ställs på
// trottoaren 180–560 px framför handen, bollhanden tar fram, ETT riktigt tryck på katten
// (lite ovanför, som ett barn som pekar på huvudet). Efter 1,4 s: blev just den katten
// insnärjd? Och åt en gatusak skottet i stället?
//
// Kontrollarm = HEAD (scripts/_natHEAD.mjs över registrets singleton).
//   node scripts/_natsikte.mjs [--url http://localhost:5174] [--n 16] [--varv 2]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const url = opt('--url', 'http://localhost:5174')
const N = Number(opt('--n', 16))
const VARV = Number(opt('--varv', 2))
// Blind arm: trycker rakt UPP i himlen ovanför katten i stället för på den. Träffar den lika
// ofta mäter sonden inte siktet (minnet "blind kontrollarm").
const BLIND = args.includes('--blind')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []

const arm = async (namn) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`${namn}: ${(e.message || String(e)).slice(0, 200)}`))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  if (namn === 'HEAD') {
    await page.evaluate(async () => {
      const g = (await import('/src/games/registry.js')).getGame('natskott-pa-stan')
      const head = (await import('/scripts/_natHEAD.mjs')).default
      for (const k of Object.keys(head)) g[k] = head[k]
    })
  }
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'natskott-pa-stan' }))
  await page.waitForFunction(() => window.__natdbg && window.__natdbg._alive, null, { timeout: 20000 })
  await page.waitForTimeout(1200)
  await page.evaluate(() => {
    const m = window.__natdbg
    m._announce = () => {}
    m._spawnTimer = 1e9
    m._heistTimer = 1e9
    m._skataTimer = 1e9
    m._gustTimer = 1e9
    m._idle = -1e9
    m._mode = 'boll'
    m._ritaArm?.()
  })
  let traff = 0
  let atenAvSak = 0
  for (let i = 0; i < N; i++) {
    const mal = await page.evaluate((i) => {
      const m = window.__natdbg
      const ctx = window.__barnspel.ctx
      for (const t of [...m._targets]) m._removeTarget(t)
      for (const b of [...m._balls]) m._killBall(ctx, b, false)
      m._balls = []
      m._idle = -1e9
      const x = 690 + ((i * 97) % 380)
      const r = m._spawnTarget(ctx, 'katt', x)
      r.walkV = 0
      window.__natSakTraff = 0
      if (!m.__natHookad) {
        const o = m._hitProp
        m._hitProp = function (...a) {
          window.__natSakTraff++
          return o.apply(this, a)
        }
        m.__natHookad = true
      }
      return { x: Math.round(r.view.x), y: Math.round(r.view.y) }
    }, i)
    await page.waitForTimeout(250) // katten landar på trottoaren
    const p = await page.evaluate(() => {
      const r = window.__natdbg._targets[0]
      return r ? { x: Math.round(r.view.x), y: Math.round(r.view.y) } : null
    })
    if (!p) continue
    await page.evaluate(({ x, y }) => {
      const cvs = document.querySelectorAll('canvas')
      const cv = cvs[cvs.length - 1]
      const b = cv.getBoundingClientRect()
      for (const t of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(t, { clientX: b.left + x, clientY: b.top + y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true }))
    }, { x: p.x, y: BLIND ? 120 : p.y - 30 })
    await page.waitForTimeout(1400)
    const utfall = await page.evaluate(() => ({ snarjd: !!window.__natdbg._targets[0]?.snarjd, sak: window.__natSakTraff | 0 }))
    if (utfall.snarjd) traff++
    else if (utfall.sak) atenAvSak++
    void mal
  }
  await page.close()
  return { traff, atenAvSak, n: N }
}

const res = { HEAD: [], NY: [] }
for (let v = 0; v < VARV; v++) {
  res.HEAD.push(await arm('HEAD'))
  res.NY.push(await arm('NY'))
}
const sum = (l, f) => l.reduce((a, b) => a + b[f], 0)
console.log(JSON.stringify({
  HEAD: { traff: sum(res.HEAD, 'traff'), atenAvSak: sum(res.HEAD, 'atenAvSak'), av: sum(res.HEAD, 'n') },
  NY: { traff: sum(res.NY, 'traff'), atenAvSak: sum(res.NY, 'atenAvSak'), av: sum(res.NY, 'n') },
  rad: res,
  errors,
}, null, 1))
await browser.close()
