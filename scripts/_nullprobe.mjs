// ENGÅNGSSOND: PEKAR UT RADEN som föder spöktweenen bakom "Cannot set properties of null
// (setting 'y')" i borsta-tanderna.
//
// Vägen hit: stacken sa bara att en gsap-tween skriver `.y` på en riven Pixi-nod, och en
// typlista ("_Graphics{x,y,alpha}") namnger inte en rad. Sonden hakar därför på spelets
// EGEN `gsap.to` innan spelet monteras och sparar skapelse-stacken på varje tween — sedan
// letas mål som är `destroyed` och stacken skrivs ut.
//
// Sekvensen är `_borstprobe` arm I→J, den enda som föder felen: greppa borsten, sväng vid
// VÄGGEN medan tungan går sin runda, SLÄPP borsten långt från munnen och lämna spelet
// direkt — alltså mitt i den fördröjda återlämningen.
import { chromium } from 'playwright'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'borsta-tanderna'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const sedda = new Map()

const haka = (page) => page.evaluate(async () => {
  const u = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /gsap/.test(n))
  if (!u) return 'ingen gsap-resurs'
  const m = await import(u)
  const g = m.gsap || m.default
  if (g.__hakad) return 'redan hakad'
  for (const namn of ['to', 'from', 'fromTo']) {
    const orig = g[namn].bind(g)
    g[namn] = (...a) => { const tw = orig(...a); try { tw.__fodd = new Error().stack } catch {} return tw }
  }
  g.__hakad = true
  window.__gsap = g
  return 'hakad'
})

const spoken = (page) => page.evaluate(() => {
  const g = window.__gsap
  if (!g) return ['ingen hake']
  const ut = []
  for (const tw of g.globalTimeline.getChildren(true, true, true)) {
    const mal = typeof tw.targets === 'function' ? tw.targets() : []
    for (const t of mal) {
      if (t && typeof t === 'object' && t.destroyed === true) {
        const falt = Object.keys(tw.vars || {}).filter((k) => !['ease', 'onUpdate', 'onComplete', 'onRepeat', 'repeat', 'yoyo', 'duration', 'delay', 'overwrite', 'immediateRender', 'parent', 'data', 'callbackScope'].includes(k))
        const rad = (tw.__fodd || '').split('\n').find((l) => /\/src\//.test(l)) || '(okänd födelse)'
        ut.push(`${t.constructor?.name}{${falt.join(',')}}${typeof tw.repeat === 'function' && tw.repeat() === -1 ? ' EVIG' : ''}  ←  ${rad.trim()}`)
      }
    }
  }
  return ut
})

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => {
    const k = (e.message || '').slice(0, 90)
    sedda.set(k, (sedda.get(k) || 0) + 1)
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  // Hakas via ett spel som redan importerat gsap, annars finns ingen gsap-resurs att hitta.
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(1600)
  console.log('  gsap: ' + (await haka(page)))
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1000)

  const L = await page.evaluate(async () => {
    const m = await import('/src/games/borsta-tanderna/layout.js')
    return { TUB: m.TUB_PLATS, TANDRAD: m.TANDRAD }
  })
  const antal = () => [...sedda.values()].reduce((a, b) => a + b, 0)

  // Kastar spelets egen destroy? Kastar den halvvägs städas resten aldrig, och DÅ blir
  // tre orelaterade spöken (drag · maskot · badrum) ett och samma fel.
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('borsta-tanderna')
    const orig = g.destroy.bind(g)
    window.__destroyFel = []
    g.destroy = (...a) => {
      try { return orig(...a) } catch (e) { window.__destroyFel.push(String((e && e.stack) || e).slice(0, 400)); throw e }
    }
  })

  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(1700)
  await page.mouse.click(L.TUB[1].x, L.TUB[1].y)
  await page.waitForTimeout(1500)

  const b = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('borsta-tanderna')
    const v = g._borste?.view
    g._flackar.forEach((f, i) => { f.kvar = i === g._flackar.length - 1 ? 1 : 0; g._ritaFlack(f) })
    g._tungaTill = 0
    g._minTill = 0
    return v && !v.destroyed ? { x: Math.round(v.x), y: Math.round(v.y) } : null
  })
  if (b) {
    await page.mouse.move(b.x, b.y)
    await page.mouse.down()
    await page.mouse.move(1080, 280, { steps: 8 })
    for (let i = 0; i < 14; i++) {
      await page.mouse.move(1080 + (i % 2 ? 60 : -60), 280, { steps: 2 })
      await page.waitForTimeout(60)
    }
  }
  await page.waitForTimeout(1400)
  console.log(`  före släppet · fel ${antal()} · spöken ${JSON.stringify(await spoken(page), null, 1)}`)

  // SLÄPPET LÅNGT FRÅN MUNNEN, och ut ur spelet direkt efteråt.
  await page.mouse.up()
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(1800)
  console.log(`  efter släpp + omladdning · fel ${antal()}`)
  for (const s of await spoken(page)) console.log('    SPÖKE: ' + s)

  console.log('  destroy kastade: ' + JSON.stringify(await page.evaluate(() => window.__destroyFel || []), null, 1))

  console.log('\n  FEL:')
  for (const [m, n] of sedda) console.log(`  ×${n} ${m}`)
  if (!sedda.size) console.log('  (inga)')
} finally {
  await browser.close()
}
