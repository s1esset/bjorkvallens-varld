// Tidsserie: öppnar ett spel (färsk sida) och läser ett uttryck på g var --steg ms under --tid ms,
// medan en lista handlingar körs. Svarar på "RÖR sig det här fältet medan spelet spelas?".
//
//   node scripts/_natt-sampla.mjs <id> --expr "<js på g>" [--tid 3000] [--steg 200] [--vanta 1200]
//        [--fore "<js på g att köra före samplingen>"] [--klick x,y]… [--drag x0,y0,x1,y1,ms]…
//        [--varv 2]   (spelar handlingarna två gånger = två rundor otåligt)
//
// Handlingarna körs EN gång före varje varv; sampling pågår under hela varvet. Konsolfel räknas.
// ⚠️ Kör aldrig två webbläsarsonder samtidigt, och rör inte src/ medan den kör.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const id = args[0]
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const flera = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []))
const expr = opt('--expr', null)
const tid = Number(opt('--tid', 3000))
const steg = Number(opt('--steg', 200))
const vanta = Number(opt('--vanta', 1200))
const fore = opt('--fore', null)
const varv = Number(opt('--varv', 1))
const url = opt('--url', 'http://localhost:5173')
const klick = flera('--klick').map((s) => s.split(',').map(Number))
const drag = flera('--drag').map((s) => s.split(',').map(Number))
if (!id || !expr) { console.error('usage: _natt-sampla.mjs <id> --expr "…"'); process.exit(2) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = []
try {
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctxB.newPage()
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR ' + (e.message || String(e)).slice(0, 200)))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && !!window.__barnspel.ctx?.stage, id, { timeout: 20000 })
  await page.waitForTimeout(vanta)
  if (fore) await page.evaluate((u) => new Function('g', 'ctx', u)(window.__barnspel.game, window.__barnspel.ctx), fore)

  const till = async (x, y) => page.evaluate(({ x, y }) => {
    const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect()
    const sk = Math.min(r.width / 1280, r.height / 720)
    return [r.left + (r.width - 1280 * sk) / 2 + x * sk, r.top + (r.height - 720 * sk) / 2 + y * sk]
  }, { x, y })

  for (let v = 0; v < varv; v++) {
    // sampling i sidan, parallellt med handlingarna
    const serie = page.evaluate(async ({ uttryck, tid, steg }) => {
      const ut = []; const t0 = performance.now()
      while (performance.now() - t0 < tid) {
        try {
          const val = new Function('g', 'ctx', `return (${uttryck})`)(window.__barnspel.game, window.__barnspel.ctx)
          ut.push(typeof val === 'number' ? +val.toFixed(3) : val)
        } catch (e) { ut.push('ERR ' + (e?.message || e)) }
        await new Promise((r) => setTimeout(r, steg))
      }
      return ut
    }, { uttryck: expr, tid, steg })
    for (const [x, y] of klick) { const [cx, cy] = await till(x, y); await page.mouse.click(cx, cy); await page.waitForTimeout(150) }
    for (const [x0, y0, x1, y1, ms = 400] of drag) {
      const [a, b] = await till(x0, y0); const [c, d] = await till(x1, y1)
      await page.mouse.move(a, b); await page.mouse.down()
      const n = Math.max(2, Math.round(ms / 16))
      for (let i = 1; i <= n; i++) { await page.mouse.move(a + (c - a) * i / n, b + (d - b) * i / n); await page.waitForTimeout(16) }
      await page.mouse.up(); await page.waitForTimeout(100)
    }
    const s = await serie
    console.log(`varv ${v + 1}: ${s.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')}`)
  }
  await ctxB.close()
} finally { await browser.close() }
console.log(`konsolfel: ${fel.length}`)
fel.slice(0, 8).forEach((f) => console.log('  ' + f))
