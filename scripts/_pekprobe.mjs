// unika-knytt: NÅR FINGRET FRAM till de tre moduler som väntar på det?
//
// `kupan.js`, `ceremoni.js` och `knytt.js` tar alla emot en `pekare` i sin `tick()`:
// kupans blobb följer fingret med pupillerna, knyttet räknar fingerrörelse som "liv" och
// somnar utan den, ceremonin räknar om koordinaten åt knyttet den håller. Alla tre matas
// från `index.js:_uppdatera` med `this._pekare` — ett fält som sätts till null i init().
//
// Sonden mäter TVÅ armar med samma mätare, så ett tal utan rörelse finns bredvid ett med:
//
//   stilla    pupillernas svängning (max−min) medan musen står STILL      → ska vara ~0
//   svep      samma svängning medan musen sveper tvärs över kupan         → skiljelinjen
//   pekare    hur många prov där game._pekare var ett objekt med x/y      → rotorsaken
//
// Pupillen är klampad till 4,6 px från mitten, så full sida-till-sida-rörelse är ~9,2 px.
//
//   node scripts/_pekprobe.mjs
import { chromium } from 'playwright'

const ID = 'unika-knytt'
// Kupan sitter på (640,330) i designkoordinater; blobben lever kring dess mitt.
const KUPA_X = 640
const KUPA_Y = 330

const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1800)

  // Leta upp de två ögonen i kupans träd — de bär ett eget fält `_wpup` (pupillnoden).
  const hittade = await page.evaluate(() => {
    const g = window.__barnspel.game
    const ut = []
    const gata = (n) => {
      if (!n || n.destroyed) return
      if (n._wpup) ut.push(n._wpup)
      for (const c of n.children || []) gata(c)
    }
    gata(g?._kupa?.view)
    window.__pup = ut
    return ut.length
  })
  if (hittade < 2) throw new Error(`hittade ${hittade} pupiller i kupan — sonden mäter fel träd`)

  // Skalan skärm→design: skalet letterboxar med Math.min(contain).
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const skarm = (x, y) => [geo.x0 + x * geo.s, geo.y0 + y * geo.s]

  const prov = async () =>
    page.evaluate(() => {
      const p = window.__barnspel.game?._pekare
      return {
        pup: window.__pup.map((n) => (n.destroyed ? null : { x: n.x, y: n.y })),
        pekare: p && Number.isFinite(p.x) && Number.isFinite(p.y) ? 1 : 0,
      }
    })

  const svang = (rader) => {
    // Störst svängning någon av pupillerna gör i någon axel.
    let b = 0
    for (let i = 0; i < 2; i++) {
      for (const ax of ['x', 'y']) {
        const v = rader.map((r) => r.pup[i]?.[ax]).filter((n) => Number.isFinite(n))
        if (v.length > 2) b = Math.max(b, Math.max(...v) - Math.min(...v))
      }
    }
    return b
  }

  // --- ARM 1 (kontroll): musen står still mitt över kupan -------------------
  await page.mouse.move(...skarm(KUPA_X, KUPA_Y))
  await page.waitForTimeout(700)
  const stilla = []
  for (let i = 0; i < 20; i++) {
    stilla.push(await prov())
    await page.waitForTimeout(45)
  }

  // --- ARM 2 (mät): musen sveper tvärs över kupan ---------------------------
  const svep = []
  for (let i = 0; i < 28; i++) {
    const f = i / 27
    const x = KUPA_X + Math.cos(f * Math.PI * 2) * 150
    const y = KUPA_Y + Math.sin(f * Math.PI * 2) * 110
    await page.mouse.move(...skarm(x, y))
    svep.push(await prov())
    await page.waitForTimeout(45)
  }

  const pekTraff = [...stilla, ...svep].reduce((s, r) => s + r.pekare, 0)
  const n = stilla.length + svep.length

  const p2 = (x) => x.toFixed(2)
  console.log('')
  console.log('  unika-knytt — når fingret fram till kupans blick?')
  console.log('')
  console.log(`  stilla (kontroll)   pupillsvängning ${p2(svang(stilla))} px`)
  console.log(`  svep (mät)          pupillsvängning ${p2(svang(svep))} px   (tak ~9,2 px)`)
  console.log(`  game._pekare satt   ${pekTraff}/${n} prov`)
  console.log('')
  const ok = svang(svep) > 1.5 && pekTraff > 0
  console.log(ok ? '  ✓ blicken följer fingret' : '  ✗ blicken följer INTE fingret — pekaren når aldrig tick()')
  if (errors.length) console.log(`  konsolfel: ${errors.length}\n   ${errors.slice(0, 4).join('\n   ')}`)
  console.log('')
} finally {
  await browser.close()
}
