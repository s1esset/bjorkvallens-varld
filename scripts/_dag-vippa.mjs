// _dag-vippa.mjs — FYSIKPLAN P2 per spel: RÖR SIG det vippade inre barnet vid en stöt, står det
// STILL i vila, är träffytan orörd, och lever inga tweens kvar efter exit?
//
//   node scripts/_dag-vippa.mjs <spel-id> --expr "<js → nod>" [--hit "<js → nod med hitArea>"]
//        [--handling "<js>" | --klick x,y | --ingen] [--prep "<js>"] [--fore 2500] [--vila 4000]
//        [--url http://localhost:5173]
//
// `g` = window.__barnspel.game, `ctx` = window.__barnspel.ctx i alla uttryck.
//
// Mätningen läser nodens ritade rektangel i FÖRÄLDERNS rum (getLocalBounds × nodens lokala
// transform). Då syns bara nodens EGEN rörelse (vippan) — inte förälderns gupp, liv eller
// kamera. Tre fönster: vila före (20 bildrutor) → stöt → 2 s per bildruta → vila efter.
//   rorelse  = största avvikelse i px från vilan före, under de 2 s efter stöten
//   spridFore/spridEfter = svängningen inom respektive vilofönster (ska vara 0,00)
//   driftVila = vilan efter mot vilan före (ska vara 0,00 — vippan snäpper tillbaka)
//   hitLika  = hitArea (som JSON) identisk före och efter
//   tweens   = gsap.isTweening på noden + alla barn + förfäder, mätt EFTER exit med spelets gsap
//
// KONTROLLARM: `--ingen` (ingen stöt) ska ge rorelse 0,00; HEAD-läget (en andra server på en
// worktree, --url) med samma handling ska ge rorelse 0,00 på motsvarande nod.
// ⚠️ Kör aldrig två webbläsarsonder samtidigt.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const ID = argv[0]
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1] }
const har = (n) => argv.includes('--' + n)
const URL_ = opt('url', 'http://localhost:5173')
const EXPR = opt('expr')
const HIT = opt('hit')
const HANDLING = har('ingen') ? null : opt('handling')
const KLICK = opt('klick')
const PREP = opt('prep')
const LAS = opt('las') // valfritt uttryck som skrivs ut efter mätningen (t.ex. en räknare handlingen lade på window)
const FORE = +opt('fore', 2500)
const VILA = +opt('vila', 4000)
if (!ID || !EXPR) { console.error('användning: node scripts/_dag-vippa.mjs <id> --expr "<js>" …'); process.exit(2) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto(URL_, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(FORE)

  await page.evaluate(([expr, hit]) => {
    const fn = (s) => new Function('g', 'ctx', 'return (' + s + ')')
    window.__vp = { nod: fn(expr), hit: hit ? fn(hit) : null }
    window.__vp.rekt = () => {
      const g = window.__barnspel.game, ctx = window.__barnspel.ctx
      const n = window.__vp.nod(g, ctx)
      if (!n || n.destroyed || !n.parent) return null
      // Lokala bounds × nodens EGEN lokala transform — förälderns världsmatris kan vara en
      // bildruta gammal i rAF och läckte förälderns kittel-squash in som 11 px "rörelse" på HEAD.
      const b = n.getLocalBounds()
      n.updateLocalTransform()
      const m = n.localTransform
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
        .map(([x, y]) => m.apply({ x, y }))
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    }
    window.__vp.hitJson = () => {
      if (!window.__vp.hit) return null
      const h = window.__vp.hit(window.__barnspel.game, window.__barnspel.ctx)
      return h ? JSON.stringify({ ha: h.hitArea, x: h.x, y: h.y }) : 'saknas'
    }
    window.__vp.fonster = (ms, max) => new Promise((res) => {
      const ut = []; const t0 = performance.now()
      const steg = () => {
        ut.push(window.__vp.rekt())
        if (performance.now() - t0 < ms && ut.length < (max || 1e9)) requestAnimationFrame(steg)
        else res(ut)
      }
      requestAnimationFrame(steg)
    })
  }, [EXPR, HIT])

  if (PREP) {
    await page.evaluate((s) => new Function('g', 'ctx', s)(window.__barnspel.game, window.__barnspel.ctx), PREP)
    await page.waitForTimeout(1500)
  }

  const dev = (a, b) => (!a || !b ? NaN : Math.max(...a.map((v, i) => Math.abs(v - b[i]))))
  const sprid = (arr) => Math.max(0, ...arr.map((r) => dev(r, arr[0])))

  const hitFore = await page.evaluate(() => window.__vp.hitJson())
  const fore = await page.evaluate(() => window.__vp.fonster(5000, 20))
  if (!fore[0]) throw new Error('noden hittades inte: ' + EXPR)

  if (KLICK) {
    const [x, y] = KLICK.split(',').map(Number)
    const geo = await page.evaluate(() => {
      const r = document.querySelector('canvas').getBoundingClientRect()
      const s = Math.min(r.width / 1280, r.height / 720)
      return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
    })
    page.mouse.click(geo.x0 + x * geo.s, geo.y0 + y * geo.s)
  } else if (HANDLING) {
    await page.evaluate((s) => new Function('g', 'ctx', s)(window.__barnspel.game, window.__barnspel.ctx), HANDLING)
  }
  const under = await page.evaluate(() => window.__vp.fonster(2000))
  await page.waitForTimeout(VILA)
  const efter = await page.evaluate(() => window.__vp.fonster(5000, 20))
  const hitEfter = await page.evaluate(() => window.__vp.hitJson())

  if (LAS) console.log('las:', JSON.stringify(await page.evaluate((s) => new Function('g', 'ctx', 'return (' + s + ')')(window.__barnspel.game, window.__barnspel.ctx), LAS)))
  const rorelse = Math.max(0, ...under.filter(Boolean).map((r) => dev(r, fore[0])))
  const res = {
    id: ID, url: URL_, stot: KLICK ? 'klick ' + KLICK : HANDLING ? 'js' : 'INGEN (kontroll)',
    rorelse: +rorelse.toFixed(2),
    spridFore: +sprid(fore).toFixed(2),
    spridEfter: +sprid(efter).toFixed(2),
    driftVila: +dev(efter[0], fore[0]).toFixed(2),
    hitLika: hitFore === hitEfter, hitFore: hitFore?.slice(0, 120),
  }

  // Exit: plocka undan noden, alla barn och förfäder FÖRE rivningen, räkna sedan med spelets gsap.
  const tw = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/gsap\.js|deps\/gsap/.test(n))
    if (!url) return { fel: 'gsap-url saknas' }
    const { gsap } = await import(url)
    const n = window.__vp.nod(window.__barnspel.game, window.__barnspel.ctx)
    const noder = []
    const ner = (x) => { if (!x) return; noder.push(x); for (const c of x.children || []) ner(c) }
    ner(n)
    for (let p = n?.parent; p && p.parent; p = p.parent) noder.push(p)
    const leverFore = noder.filter((x) => gsap.isTweening(x) || (x.scale && gsap.isTweening(x.scale))).length
    await window.__barnspel.nav.go('library')
    await new Promise((r) => setTimeout(r, 600))
    const lever = noder.filter((x) => gsap.isTweening(x) || (x.scale && gsap.isTweening(x.scale)) || (x.skew && gsap.isTweening(x.skew))).length
    return { noder: noder.length, leverFore, leverEfterExit: lever }
  })
  await page.waitForTimeout(400)
  res.tweens = tw
  res.konsolfel = errors.length
  console.log(JSON.stringify(res, null, 1))
  if (errors.length) console.log('fel:', errors.slice(0, 5))
} catch (e) {
  console.error('SONDFEL', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
