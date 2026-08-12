// `folj-sparet`: ÄR den ivriga lutningen levande, eller bara närvarande i koden?
//
// Bakgrund: `_stillaprobe` mätte spelet till **4,6 px i tre svep av tre**, bara 2 av 30
// noder i rörelse — alltså en kandidat för N10. Kodläsningen sa i stället att §4-punkten
// "[Medium] Levande figur man bryr sig om" redan ÄR byggd: figuren har ansikte
// (`_paintFigure`), `_lookEager()` lutar den mot nästa väntade fotspår, och `_hopRabbit`
// jublar med "!" + squash-and-stretch. En lutning på 0,11 rad hos en ~40 px figur ger
// ≈4,5 px — misstänkt nära de uppmätta 4,6.
//
// ⚠️ Men "byggd" är inte "fungerar": `vart-tog-det-vagen` bar hela sin reaktionstabell i
// koden och alla tio grenarna var döda i sex veckor. Den här sonden avgör vilket det är,
// så att punkten stryks på en MÄTNING och inte på en kodläsning.
//
//   1. Snurrar figuren alls efter ett rätt tryck? (= `_lookEager` kopplas in)
//   2. Är utslaget det som `_stillaprobe` såg? (då är 4,6 px funktionen, inte tomhet)
//   3. Lutar den mot RÄTT håll — dvs. mot nästa väntade fotspår?
//
//   node scripts/_ivrigprobe.mjs
import { chromium } from 'playwright'

const ID = 'folj-sparet'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })

  // Demofasen tander fotspren ett i taget; vanta tills spelet slapper in ett tryck.
  await page.waitForFunction(() => {
    const g = window.__barnspel.game
    return g && !g._busy && Array.isArray(g._foots) && g._foots.length > 0
  }, null, { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(600)

  // Tryck pa det fotspar spelet FAKTISKT vantar sig (samma vag ett barn tar).
  const traff = await page.evaluate(() => {
    const g = window.__barnspel.game
    const fp = g._foots[g._sequence[g._expected]]
    if (!fp) return { fel: 'inget vantat fotspar' }
    const p = fp.getGlobalPosition()
    const c = window.__barnspel.app.canvas.getBoundingClientRect()
    return {
      x: Math.round(c.left + p.x * (c.width / window.__barnspel.app.renderer.width)),
      y: Math.round(c.top + p.y * (c.height / window.__barnspel.app.renderer.height)),
      nastaX: (() => { const n = g._foots[g._sequence[g._expected + 1]]; return n ? n.x : null })(),
      rabbitX: g._rabbit.x,
    }
  })
  if (traff.fel) throw new Error(traff.fel)
  await page.mouse.click(traff.x, traff.y)

  // Hoppet tar ~0,5 s; darefter startar _lookEager. Folj rotationen efter det.
  await page.waitForTimeout(900)
  const lut = await page.evaluate(async () => {
    const g = window.__barnspel.game
    let mn = Infinity, mx = -Infinity
    const t0 = performance.now()
    while (performance.now() - t0 < 2600) {
      const r = g._rabbit.rotation
      if (r < mn) mn = r
      if (r > mx) mx = r
      await new Promise((res) => requestAnimationFrame(res))
    }
    // Utslaget i px vid figurens ytterkant (~40 px fran dess origo).
    return {
      min: +mn.toFixed(4), max: +mx.toFixed(4),
      pxSpann: +(((mx - mn)) * 40).toFixed(1),
      rabbitX: g._rabbit.x,
      nastaX: (() => { const n = g._foots[g._sequence[g._expected]]; return n ? n.x : null })(),
      tween: !!g._eagerTween,
    }
  })

  ok('1. figuren lutar sig alls efter ett tryck', lut.max - lut.min > 0.02,
    `rotation ${lut.min} .. ${lut.max} rad (_eagerTween ${lut.tween ? 'lever' : 'saknas'})`)
  ok('2. utslaget ar det _stillaprobe sag', lut.pxSpann > 3 && lut.pxSpann < 7,
    `${lut.pxSpann} px vid figurens ytterkant — sallet matte 4,6 px i tre svep`)
  const ratt = lut.nastaX === null || ((lut.nastaX >= lut.rabbitX) === (lut.max > Math.abs(lut.min)))
  ok('3. lutar mot nasta vantade fotspar', ratt,
    `figuren pa x=${Math.round(lut.rabbitX)}, nasta pa x=${lut.nastaX === null ? '(inget)' : Math.round(lut.nastaX)}, utslag ${lut.min}..${lut.max}`)
  ok('4. inga konsolfel', errors.length === 0, errors.length ? errors[0] : 'inga')
} finally {
  await browser.close()
}

console.log('\n  folj-sparet — lever den ivriga lutningen?\n')
let gronast = 0
for (const r of rader) {
  if (r.ok) gronast++
  console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(38)} ${r.text}`)
}
console.log(`\n  ${gronast}/${rader.length} grona\n`)
process.exit(gronast === rader.length ? 0 : 1)
