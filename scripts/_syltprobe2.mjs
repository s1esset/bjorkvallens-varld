// `flugan-pa-nasan`, andra frågan om syltburken: vad händer om barnet TRYCKER först
// (tap-tap-markeringen) och sedan DRAR? `DragController._toggleSelect` startar en
// `repeat: -1`-tween på `view.scale`, och varken `_onDown`, `_onUp` eller `_resolveDrop`
// rör `this.selected`.
//
// KONTROLLARM: samma drag UTAN föregående tryck — där ska ingen evig tween finnas.
//
//   node scripts/_syltprobe2.mjs
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ID = 'flugan-pa-nasan'

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  const G = (src) => page.evaluate(
    async ([gid, s]) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      return eval(s)
    }, [ID, src],
  )

  const skarm = async () => page.evaluate(() => {
    const c = window.__barnspel.app.canvas.getBoundingClientRect()
    return { l: c.left, t: c.top, sx: c.width / window.__barnspel.app.renderer.width, sy: c.height / window.__barnspel.app.renderer.height }
  })

  async function korning(medForTryck) {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1600)
    const sk = await skarm()
    const S = (x, y) => ({ x: Math.round(sk.l + x * sk.sx), y: Math.round(sk.t + y * sk.sy) })
    const burk = await G('(() => { const v = g._sylt.view; return { x: v.x, y: v.y } })()')
    const a = S(burk.x, burk.y - 30)

    if (medForTryck) {
      await page.mouse.click(a.x, a.y)
      await page.waitForTimeout(500)
    }
    const eftertryck = await G('(() => ({ vald: !!g._drag.selected, pulse: !!(g._drag.selected && g._drag.selected._pulse) }))()')

    // dra till fönstret
    const mal = await G('(() => { const t = g._drag.targets.find(t => t.view._wNamn === "fonster"); return { x: t.view.x, y: t.view.y } })()')
    const b = S(mal.x, mal.y)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x + (b.x - a.x) * i / 12, a.y + (b.y - a.y) * i / 12); await page.waitForTimeout(18) }
    await page.mouse.up()

    // Skalan avläst över 1,2 s EFTER att draget löst sig: en evig yoyo syns som en svängning.
    await page.waitForTimeout(900)
    const prov = []
    for (let i = 0; i < 14; i++) {
      prov.push(await G('+g._sylt.view.scale.x.toFixed(4)'))
      await page.waitForTimeout(90)
    }
    const sv = Math.max(...prov) - Math.min(...prov)
    const kvar = await G('(() => ({ vald: !!g._drag.selected, pulse: !!(g._drag.selected && g._drag.selected._pulse && g._drag.selected._pulse.parent) }))()')
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(700)
    return { eftertryck, sv: +sv.toFixed(4), prov, kvar }
  }

  const kontroll = await korning(false)
  console.log(`KONTROLL (bara drag)  skalsvängning=${kontroll.sv}  selected=${kontroll.kvar.vald} pulse=${kontroll.kvar.pulse}`)
  const matt = await korning(true)
  console.log(`MÄTARM  (tryck→drag)  skalsvängning=${matt.sv}  selected=${matt.kvar.vald} pulse=${matt.kvar.pulse}`)
  console.log(`        efter det första trycket: selected=${matt.eftertryck.vald} pulse=${matt.eftertryck.pulse}`)
  console.log(`        skalprov: ${matt.prov.join(' ')}`)
  console.log(`\nkonsolfel: ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('  ' + e)
} finally {
  await browser.close()
}
