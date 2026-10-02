// P4 (landa): det OTÅLIGA greppet — barnet trycker på ett föremål medan det fortfarande faller.
//
//   node scripts/_dag-landa.mjs <spel-id>
//
// Per spel, två rundor (spelet lämnas och öppnas igen däremellan):
//   ⓵ fall      vid 100 ms och 2,5 s efter start: den nod under föremålet vars y rört sig mest
//               (= landa-noden) och föremålets ritade nederkant. Efter landningen ska noden stå
//               på sin vila (oftast 0) — ritad geometri, inte spelets flagga.
//   ⓶ grepp     tryck på föremål 0:s vilplats 150 ms efter start, dra 120 px, mät ritad mitt mot
//               fingret (följer bilden fingret, eller hänger den kvar i luften?), släpp.
//   ⓷ tweens    1,6 s efter släppet: ändliga gsap-tweens kvar på föremålets noder (spelets EGEN
//               gsap-instans — en nyimporterad kopia har en egen tidslinje och säger alltid 0).
//   ⓸ exit      öppna spelet igen och lämna det 200 ms in (mitt i fallet): konsolfel efteråt.
// Kontrollarm: kör mot HEAD — där finns ingen fallnod (⓵ visar ~0 px rörelse) och greppet följer.
import { chromium } from 'playwright'

const ID = process.argv[2] || 'sortera-skrap'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let rott = false
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  const G = (src) =>
    page.evaluate(
      async ([gid, s]) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        const url = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /\/gsap\.js/.test(n))
        const gsap = url ? (await import(url)).gsap || (await import(url)).default : null
        const nodes = (v) => {
          const ut = []
          const gå = (n, d) => {
            ut.push(n)
            if (d < 4) for (const c of n.children || []) gå(c, d + 1)
          }
          gå(v, 0)
          return ut
        }
        const skarm = (p) => {
          const c = window.__barnspel.app.canvas.getBoundingClientRect()
          const r = window.__barnspel.app.renderer
          return { x: Math.round(c.left + p.x * (c.width / r.width)), y: Math.round(c.top + p.y * (c.height / r.height)) }
        }
        return eval(s)
      },
      [ID, src],
    )
  const oppna = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(400)
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  }
  const vantaDrag = async () => {
    for (let i = 0; i < 40; i++) {
      if (await G('!!(g && g._drag && g._drag.items && g._drag.items.length && !g._drag.items[0].view.destroyed && g._drag.items[0].view.parent)')) return true
      await page.waitForTimeout(10)
    }
    return false
  }

  // ⓵ fall
  await oppna()
  if (!(await vantaDrag())) throw new Error('ingen g._drag.items')
  await page.waitForTimeout(100)
  const tidigt = await G(`g._drag.items.map((r) => nodes(r.view).map((n) => n.y))`)
  const tidigtBotten = await G(`g._drag.items.map((r) => Math.round(r.view.getBounds().maxY))`)
  await page.waitForTimeout(2400)
  const sent = await G(`g._drag.items.map((r) => nodes(r.view).map((n) => n.y))`)
  const sentBotten = await G(`g._drag.items.map((r) => Math.round(r.view.getBounds().maxY))`)
  console.log(`\n  ${ID} — landa: fall, otåligt grepp, exit`)
  let fallnoder = 0
  tidigt.forEach((ys, i) => {
    let bast = -1, d = 0
    ys.forEach((y, j) => {
      const dd = Math.abs((sent[i][j] ?? y) - y)
      if (dd > d) { d = dd; bast = j }
    })
    if (d > 30) fallnoder++
    if (i < 6)
      console.log(`  ⓵ föremål ${i}: fallnod #${bast} y ${bast < 0 ? '-' : tidigt[i][bast].toFixed(1)} → ${bast < 0 ? '-' : sent[i][bast].toFixed(1)} (rörde ${d.toFixed(0)} px) · ritad botten ${tidigtBotten[i]} → ${sentBotten[i]}`)
  })
  console.log(`     ${fallnoder}/${tidigt.length} föremål föll`)

  // ⓶ otåligt grepp, andra öppningen
  await oppna()
  if (!(await vantaDrag())) throw new Error('ingen g._drag.items (runda 2)')
  await page.waitForTimeout(Number(process.env.GREPP_MS || 150))
  const st = await G(`(() => { const r = g._drag.items[0]; return { ...skarm(r.view.getGlobalPosition()), fallY: nodes(r.view).map(n => n.y) } })()`)
  await page.mouse.move(st.x, st.y)
  await page.mouse.down()
  await page.waitForTimeout(60)
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(st.x + i * 20, st.y + i * 8)
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(250)
  const folj = await G(`(() => { const r = g._drag.items[0]; const b = r.view.getBounds();
    const c = skarm({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
    return { mitt: c, aktiv: !!(g._drag.active || g._drag._active || g._drag.dragging) } })()`)
  const fx = st.x + 120, fy = st.y + 48
  const avst = Math.round(Math.hypot(folj.mitt.x - fx, folj.mitt.y - fy))
  console.log(`  ⓶ grepp 150 ms in: finger (${fx},${fy}) · ritad mitt (${folj.mitt.x},${folj.mitt.y}) · avstånd ${avst} px`)
  await page.mouse.up()
  await page.waitForTimeout(1600)
  const kvar = await G(`(() => { if (!gsap) return 'ingen gsap'; const r = g._drag.items[0];
    let n = 0; for (const x of nodes(r.view)) for (const o of [x, x.scale, x.position]) if (o) for (const t of gsap.getTweensOf(o)) if (t.isActive() && t.repeat() !== -1) n++; return n })()`)
  console.log(`  ⓷ ändliga tweens kvar på föremålet 1,6 s efter släppet: ${kvar}`)

  // ⓸ exit mitt i fallet
  const fore = errors.length
  await oppna()
  await page.waitForTimeout(200)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1500)
  console.log(`  ⓸ exit 200 ms in: ${errors.length - fore} nya konsolfel · totalt ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('     ' + e)
  rott = errors.length > 0 || avst > 90 || (typeof kvar === 'number' && kvar > 0)
  console.log(rott ? '\n  ✗ se ovan\n' : '\n  ✓ greppet tar föremålet mitt i fallet, inget kvar\n')
} finally {
  await browser.close()
}
process.exit(rott ? 1 : 0)
