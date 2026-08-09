// Mäter de två nya delarna i LYFTPLAN spår E runda A4:
//
//   lib/glod.js       — är blandningen FAKTISKT additiv, eller bara en ljus fläck?
//   Emitter (partiklar.js) — håller den takten, återanvänder den poolen, städar den?
//
// Varför en sond och inte ett öga: `blendMode = 'add'` som TYST inte slår igenom
// (fel lager, fel Pixi-version, en filterkedja emellan) ser nästan likadant ut som
// när den slår igenom. Skillnaden är exakt mätbar och därför inte värd att gissa om:
//
//   additiv:  resultat = källa + botten   → en RÖD glöd på grå botten lämnar
//                                            grön och blå KVAR på bottenvärdet
//   normal:   resultat = källa            → grön och blå DRAS NED mot noll
//
// Emitterns tre påståenden mäts lika bokstavligt: jämviktsantalet ska landa på
// rate·DENSITY·life, poolen ska sluta VÄXA när jämvikten är nådd (annars allokerar
// den varje bildruta i stället för att återanvända), och ett stoppat eller förstört
// fält ska försvinna helt — ett vilande ParticleContainer på ett app-långlivat lager
// dör aldrig av sig självt (CLAUDE.md).
//
//   node scripts/_glodprobe.mjs
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const pixel = async (x, y) => {
    const buf = await page.screenshot({ clip: { x: x - 3, y: y - 3, width: 6, height: 6 } })
    const png = PNG.sync.read(buf)
    let r = 0, g = 0, b = 0
    const n = png.width * png.height
    for (let i = 0; i < png.data.length; i += 4) { r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2] }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
  }

  const falt = () => page.evaluate(() => {
    let f = 0, p = 0
    const walk = (n) => {
      if (!n || n.destroyed) return
      if (Array.isArray(n.particleChildren)) { f++; p += n.particleChildren.length }
      if (n.children) for (const k of n.children) walk(k)
    }
    walk(window.__barnspel.app.stage)
    return { falt: f, partiklar: p }
  })

  // ---------- A. är blandningen additiv? ----------
  //
  // Botten är en mörk grå platta (60,60,60) så att det finns gott om takhöjd uppåt
  // i alla tre kanalerna. Glöden är RENT RÖD: additiv blandning får då bara röra R.
  // En Graphics utan att kunna importera 'pixi.js' härifrån (bar specifier går inte
  // att lösa i sidkontexten): lib/form.js `rimLight` RETURNERAR en Graphics ur appens
  // egen Pixi-instans, och den går att tömma och rita om.
  await page.evaluate(async () => {
    const { rimLight } = await import('/src/lib/form.js')
    const lager = window.__barnspel.fxLayer
    const platta = rimLight(1)
    platta.clear().rect(400, 200, 480, 320).fill(0x3c3c3c)
    platta.label = '_sond_platta'
    lager.addChild(platta)
  })
  await page.waitForTimeout(120)
  const botten = await pixel(640, 360)

  await page.evaluate(async () => {
    const { glod } = await import('/src/lib/glod.js')
    const lager = window.__barnspel.fxLayer
    const g = glod({ color: 0xff0000, size: 260, alpha: 1 })
    g.label = '_sond_glod'
    g.position.set(640, 360)
    lager.addChild(g)
    window.__sondGlod = !!g
  })
  await page.waitForTimeout(120)
  const medGlod = await pixel(640, 360)
  const glodFanns = await page.evaluate(() => window.__sondGlod === true)

  // Samma sprite men med normal blandning — kontrollarmen. Utan den bevisar ett
  // höjt R-värde ingenting; en vanlig röd fläck höjer också R.
  await page.evaluate(() => {
    const lager = window.__barnspel.fxLayer
    const g = lager.children.find((c) => c.label === '_sond_glod')
    if (g) g.blendMode = 'normal'
  })
  await page.waitForTimeout(120)
  const medNormal = await pixel(640, 360)

  await page.evaluate(() => {
    const lager = window.__barnspel.fxLayer
    for (const l of ['_sond_glod', '_sond_platta']) {
      const c = lager.children.find((k) => k.label === l)
      if (c) { lager.removeChild(c); c.destroy() }
    }
  })

  // ---------- B. emitterns takt, pool och städning ----------
  const RATE = 40
  const LIFE = 1.0
  const em = await page.evaluate(async ({ rate, life }) => {
    const part = await import('/src/lib/partiklar.js')
    const lager = window.__barnspel.fxLayer
    window.__sondEm = part.emitter(lager, {
      x: 640, y: 360, rate, life, lifeVar: 0, speed: 60, spread: 1.2, size: 10,
      colors: [0xffd166], blend: 'add',
    })
    return { tathet: part.DENSITY, vantat: Math.round(rate * part.DENSITY * life) }
  }, { rate: RATE, life: LIFE })

  await page.waitForTimeout(2200)
  const jamvikt = await page.evaluate(() => window.__sondEm.levande)
  const poolA = await page.evaluate(() => {
    const f = window.__barnspel.fxLayer._fxFieldAdd
    return f && !f.destroyed ? f.particleChildren.length : 0
  })
  await page.waitForTimeout(2200)
  const poolB = await page.evaluate(() => {
    const f = window.__barnspel.fxLayer._fxFieldAdd
    return f && !f.destroyed ? f.particleChildren.length : 0
  })

  // Additivt fält = eget fält. Med en vanlig burst samtidigt ska det bli TVÅ.
  await page.evaluate(async () => {
    const fb = await import('/src/lib/feedback.js')
    fb.burst(window.__barnspel.fxLayer, 400, 360, { count: 20 })
  })
  await page.waitForTimeout(120)
  const tvaFalt = await falt()

  // Stoppad emitter ska brinna klart och sedan lämna NOLL fält efter sig.
  await page.evaluate(() => window.__sondEm.stop())
  await page.waitForTimeout(3000)
  const efterStopp = await falt()

  // ---------- C. destroy mitt i flödet ----------
  const felFore = errors.length
  await page.evaluate(async () => {
    const part = await import('/src/lib/partiklar.js')
    window.__sondEm2 = part.emitter(window.__barnspel.fxLayer, { x: 640, y: 360, rate: 60, life: 2 })
  })
  await page.waitForTimeout(700)
  const iFlykten = await page.evaluate(() => window.__sondEm2.levande)
  await page.evaluate(() => window.__sondEm2.destroy())
  await page.waitForTimeout(900)
  const efterDestroy = await falt()
  const felVidDestroy = errors.length - felFore

  const rad = (n, v, ok) => console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(30)} ${v}`)
  const vantat = em.vantat
  const additiv = medGlod[1] >= botten[1] - 6 && medGlod[0] > botten[0] + 60
  const normalSankte = medNormal[1] < botten[1] - 10
  const taktOk = Math.abs(jamvikt - vantat) <= vantat * 0.25
  const poolStabil = poolB <= poolA * 1.15 + 4

  console.log('\n  Glöd- och emittersond (LYFTPLAN spår E, runda A4)\n')
  rad('glöd-textur bakad', glodFanns, glodFanns)
  rad('botten (grå platta)', botten.join(','), true)
  rad('med additiv röd glöd', medGlod.join(','), additiv)
  rad('  → G kvar på bottennivå', `${botten[1]} → ${medGlod[1]}`, additiv)
  rad('samma sprite, normal blandning', medNormal.join(','), normalSankte)
  rad('  → G drogs ned (kontrollarm)', `${botten[1]} → ${medNormal[1]}`, normalSankte)
  console.log('')
  rad('täthet · väntad jämvikt', `${em.tathet} · ${vantat}`, true)
  rad('uppmätt jämvikt', jamvikt, taktOk)
  rad('pool 2 s → 4 s (växer den?)', `${poolA} → ${poolB}`, poolStabil)
  rad('additivt fält är EGET fält', `${tvaFalt.falt} fält`, tvaFalt.falt >= 2)
  rad('fält kvar efter stop()', efterStopp.falt, efterStopp.falt === 0)
  console.log('')
  rad('levande vid destroy', iFlykten, iFlykten > 0)
  rad('fält kvar efter destroy()', efterDestroy.falt, efterDestroy.falt === 0)
  rad('konsolfel vid destroy', felVidDestroy, felVidDestroy === 0)
  rad('konsolfel totalt', errors.length, errors.length === 0)
  if (errors.length) console.log('\n  ' + errors.slice(0, 5).join('\n  '))
  console.log('')

  const gront = glodFanns && additiv && normalSankte && taktOk && poolStabil &&
    tvaFalt.falt >= 2 && efterStopp.falt === 0 && iFlykten > 0 &&
    efterDestroy.falt === 0 && errors.length === 0
  kod = gront ? 0 : 1
} catch (e) {
  console.error(e)
  kod = 2
} finally {
  await browser.close()
}
process.exit(kod)
