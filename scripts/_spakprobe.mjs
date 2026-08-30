// unika-knytt: SPAKEN i varje fas — ger den ljud+bild på varje tryck?
//
// `byggSpak.onTap` (kupan.js) har ingen egen återkoppling alls: allt ljud och all rörelse
// ligger i `dra()`, som bara `_startaCeremoni` anropar. Spakens träffyta står däremot kvar
// `static` i ALLA faser. Frågan sonden ställer är vad ett tryck faktiskt ger i var och en.
//
// Extra vikt: 1,6 s efter att knyttet nått bänken säger spelet högt
// "Tryck på spaken igen så gör vi ett nytt knytt!" — så `avtack` är den fas där barnet med
// störst sannolikhet trycker på spaken.
//
// ⚠️ Att bara räkna ljud i ett fönster MÄTER FEL: scenen låter av sig själv (knyttet skuttar,
// kupan bubblar), och första versionen av den här sonden läste 1 sådant ljud som att spaken
// svarade. Varje tal har därför en KONTROLL bredvid sig:
//
//   traff       antal pointertap som NÅDDE spakens view (egen lyssnare — landar trycket?)
//   ljud        ljud under 320 ms EFTER trycket
//   tomgang     ljud under 320 ms UTAN tryck, precis innan — scenens egen bakgrund
//   arm         spakarmens rotationssvängning under fönstret (dra() vrider den till 1,08)
//   fas         spelets fas före → efter
//
//   node scripts/_spakprobe.mjs
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const SPAK_X = 1160
const SPAK_Y = 350
const AGG_X = 640
const AGG_Y = 470

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
  await page.waitForTimeout(1600)

  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const klick = (x, y) => page.mouse.click(geo.x0 + x * geo.s, geo.y0 + y * geo.s)

  await page.evaluate(() => {
    const a = window.__barnspel.audio
    window.__ljud = 0
    window.__namn = []
    for (const m of ['sfx', 'tone', 'sample']) {
      if (typeof a?.[m] !== 'function') continue
      const org = a[m].bind(a)
      a[m] = (...args) => {
        window.__ljud++
        window.__namn.push(typeof args[0] === 'string' ? args[0] : m)
        return org(...args)
      }
    }
    // Spakarmen är barn nr 2 i spakens view (bas, arm) — dra() äger dess rotation.
    window.__arm = () => {
      const v = window.__barnspel.game?._spak?.view
      const a = v && !v.destroyed ? v.children[1] : null
      return a && !a.destroyed ? a.rotation : null
    }
    // Landar trycket på spaken? Mätaren är en EGEN lyssnare på exakt den händelse
    // spelets `onTap` är bunden till — ingen koordinatmatematik att räkna fel på.
    window.__spakTraff = 0
    window.__barnspel.game._spak.view.on('pointertap', () => { window.__spakTraff++ })
  })

  const fas = () => page.evaluate(() => window.__barnspel.game?._fas || '?')

  // Ett fönster på 320 ms: räknar ljud och spakarmens svängning. `gorKlick` styr om ett
  // tryck sker i fönstret — samma mätare används alltså för tomgång och för mätning.
  const fonster = async (gorKlick, x, y) => {
    await page.evaluate(() => { window.__ljud = 0; window.__namn = []; window.__arm_spar = [window.__arm()] })
    if (gorKlick) await klick(x, y)
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(40)
      await page.evaluate(() => window.__arm_spar.push(window.__arm()))
    }
    return page.evaluate(() => {
      const v = window.__arm_spar.filter((n) => Number.isFinite(n))
      return { ljud: window.__ljud, namn: window.__namn.slice(0, 6), arm: v.length > 1 ? Math.max(...v) - Math.min(...v) : 0 }
    })
  }

  const rader = []
  const mat = async (etikett, x, y) => {
    const f0 = await fas()
    await page.evaluate(() => { window.__spakTraff = 0 })
    const tom = await fonster(false)
    const mattt = await fonster(true, x, y)
    const traff = await page.evaluate(() => window.__spakTraff)
    rader.push({ etikett, f0, traff, tom: tom.ljud, ljud: mattt.ljud, namn: mattt.namn, arm: mattt.arm, f1: await fas() })
  }

  // --- ARM 1 (KONTROLL): spaken i fas `bygga`, där den bevisligen fungerar ----------
  await mat('KONTROLL bygga', SPAK_X, SPAK_Y)

  // --- kör ceremonin i mål ----------------------------------------------------------
  for (let i = 0; i < 40 && (await fas()) === 'ceremoni'; i++) {
    await klick(200, 200)
    await page.waitForTimeout(140)
  }
  // Spaken mitt i kläckningen: ägget är uppgiften, men trycket får inte vara tyst.
  if ((await fas()) === 'klacka') await mat('MÄT klacka', SPAK_X, SPAK_Y)
  for (let i = 0; i < 12 && (await fas()) === 'klacka'; i++) {
    await klick(AGG_X, AGG_Y)
    await page.waitForTimeout(260)
  }
  await page.waitForTimeout(900)

  // --- ARM 2 (MÄT): spaken i fas `avtack` ------------------------------------------
  // Fasen har TVÅ skeden och de måste mätas var för sig: fram till `_tillBanken` (2,6 s
  // efter 'klar') strömmar världen fortfarande ut och knyttet är varken sparat eller
  // framme; efter den ligger knyttet på bänken och rösten har sagt "tryck på spaken igen".
  const nadde = await fas()
  const harYta = () => page.evaluate(() => !!window.__barnspel.game?._knyttYta)
  if (nadde === 'avtack' && !(await harYta())) {
    await mat('MÄT avtack tidigt', SPAK_X, SPAK_Y)
  }
  for (let i = 0; i < 60 && !(await harYta()) && (await fas()) === 'avtack'; i++) {
    await page.waitForTimeout(200)
  }
  const sent = (await fas()) === 'avtack' && (await harYta())
  if (sent) {
    // Kontrollrad FÖRST: tom yta i samma fas — där kvitterar spelet bevisligen.
    await mat('KONTROLL tom yta', 200, 200)
    await mat('MÄT avtack sent', SPAK_X, SPAK_Y)
    // Flygturen hem till boet tar 0,7 s och `_aterstall` ligger i dess onComplete — fasen
    // måste läsas EFTER den, annars mäter man mätfönstrets längd och inte spelet.
    await page.waitForTimeout(1600)
  }
  const slutFas = await fas()

  // --- EXIT MITT I CEREMONIN --------------------------------------------------------
  // Ceremonin är spelets längsta tidslinje; att lämna mitt i den är den hårdaste exiten.
  let exitFel = []
  let exitRent = null
  if ((await fas()) === 'bygga') {
    await klick(SPAK_X, SPAK_Y)
    await page.waitForTimeout(2200)          // mitt i degen/knådningen
    errors.length = 0
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(1500)
    exitFel = errors.slice(0, 4)
    // GameHost nollar `window.__barnspel.game` vid rivning, så ett SAKNAT handtag är det
    // rena utfallet — inte ett misslyckat prov.
    exitRent = await page.evaluate(() => {
      const g = window.__barnspel.game
      if (!g) return { slappt: true }
      return { slappt: false, alive: !!g._alive, rotRiven: !g._rot }
    })
  }

  const pad = (s, n) => String(s).padEnd(n)
  console.log('')
  console.log('  unika-knytt — spaken per fas (tomgang = scenens egen bakgrund, utan tryck)')
  console.log('')
  console.log('  tryck               fas       traff  tomgang  ljud   arm     fas efter ljudnamn')
  for (const r of rader) {
    console.log(`  ${pad(r.etikett, 18)}  ${pad(r.f0, 8)}  ${String(r.traff).padStart(5)}  ${String(r.tom).padStart(7)}  ${String(r.ljud).padStart(4)}  ${r.arm.toFixed(3)}   ${pad(r.f1, 9)} ${r.namn.join(' ')}`)
  }
  console.log('')
  if (nadde !== 'avtack') {
    console.log(`  ⚠ nådde aldrig fas 'avtack' (fastnade i '${nadde}') — mätarmen kördes inte`)
  } else {
    const m = rader.filter((r) => r.etikett.startsWith('MÄT'))
    const tysta = m.filter((r) => r.traff > 0 && r.ljud <= r.tom && r.arm < 0.02 && r.f0 === r.f1)
    const sentRad = rader.find((r) => r.etikett === 'MÄT avtack sent')
    console.log(tysta.length
      ? `  ✗ ${tysta.length} tryck LANDADE på spaken utan ljud över tomgången, rörelse eller verkan`
      : '  ✓ varje tryck på spaken gav ljud över tomgången')
    console.log(sentRad
      ? (slutFas === 'bygga' ? `  ✓ spaken stänger rundan när knyttet står på bänken (fas efter 1,6 s: ${slutFas})` : `  ✗ rundan stängdes inte (fas ${slutFas})`)
      : '  ⚠ hann aldrig mäta det sena skedet')
  }
  console.log('')
  if (exitRent) {
    console.log(exitRent.slappt
      ? `  exit mitt i ceremonin: konsolfel ${exitFel.length} · spelhandtaget släppt av GameHost`
      : `  exit mitt i ceremonin: konsolfel ${exitFel.length} · _alive ${exitRent.alive} · rot riven ${exitRent.rotRiven}`)
    if (exitFel.length) console.log(`   ${exitFel.join('\n   ')}`)
  } else {
    console.log('  ⚠ exit-armen kördes inte (rundan stod inte i fas bygga)')
  }
  console.log('')
} finally {
  await browser.close()
}
