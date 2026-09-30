// SOND: menyns Nyheter-ruta — syns knappen, öppnas rutan, går listan att scrolla med ett
// FINGER (html/body har touch-action:none), stängs den med ETT tryck (✖ och utanför), och
// försvinner pricken när rutan lästs? Körs mot dev-servern (:5173), i telefonens mått också.
//
//   node scripts/_nyhetprobe.mjs [--port 5173]
import { chromium } from 'playwright'

const opt = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const PORT = opt('--port', '5173')
const url = `http://localhost:${PORT}/`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = []
const resultat = []
const rapport = (namn, ok, info) => {
  resultat.push(ok)
  console.log(`  ${ok ? '✓' : '✗'} ${namn}${info !== undefined ? ` · ${info}` : ''}`)
}
try {
  for (const vp of [{ width: 1280, height: 720 }, { width: 952, height: 428 }]) {
    console.log(`\n  viewport ${vp.width}×${vp.height}`)
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => fel.push(e.message))
    page.on('console', (m) => m.type() === 'error' && fel.push(m.text()))
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await page.mouse.click(vp.width / 2, vp.height / 2)
    await page.waitForTimeout(1800)

    // Designrymd → skärm: samma contain-skala som Scaler.
    const s = Math.min(vp.width / 1280, vp.height / 720)
    const ox = (vp.width - 1280 * s) / 2
    const oy = (vp.height - 720 * s) / 2
    const skarm = (x, y) => [ox + x * s, oy + y * s]
    const KNAPP = skarm(1280 - 24 - 62 - 62 - 48 - 88, 720 - 24 - 30)

    // Pricken: finns i Pixi — läs den via bilden (röd klick i knappens hörn).
    await page.screenshot({ path: `.test-shots/_nyheter-meny-${vp.width}.png` })
    await page.touchscreen.tap(...KNAPP)
    await page.waitForTimeout(400)
    const oppen = await page.$('.dom-modal .nyheter')
    rapport('rutan öppnas med ett tryck', !!oppen)
    if (!oppen) { await ctx.close(); continue }
    const mat = await page.evaluate(() => {
      const kort = document.querySelector('.nyheter').getBoundingClientRect()
      const lista = document.querySelector('.nyheter__lista')
      return {
        kortInne: kort.left >= 0 && kort.top >= 0 && kort.right <= innerWidth && kort.bottom <= innerHeight,
        poster: document.querySelectorAll('.nyheter__post').length,
        scrollbar: lista.scrollHeight > lista.clientHeight,
        scrollH: lista.scrollHeight, clientH: lista.clientHeight,
      }
    })
    rapport('kortet ryms i fönstret', mat.kortInne)
    rapport('alla poster ritade', mat.poster > 0, mat.poster)
    await page.screenshot({ path: `.test-shots/_nyheter-ruta-${vp.width}.png` })

    // FINGERSVEP på listan: råa CDP-touchhändelser, inte mushjul — det är touch-action som kan
    // stoppa det. ⚠️ `Input.synthesizeScrollGesture` scrollar INGENTING i headless, inte ens med
    // touch-action auto överallt (kontrollarm 2026-09-30: 0 px i alla armar). Råa touchStart/
    // Move/End gav 285 px som byggt och 0 px med listan på touch-action none — de skiljer lägena.
    if (mat.scrollbar) {
      const box = await page.evaluate(() => {
        const r = document.querySelector('.nyheter__lista').getBoundingClientRect()
        return { x: r.left + r.width / 2, y0: r.top + r.height * 0.8, y1: r.top + r.height * 0.2 }
      })
      const cdp = await ctx.newCDPSession(page)
      const x = Math.round(box.x)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: Math.round(box.y0) }] })
      for (let i = 1; i <= 12; i++) {
        const y = Math.round(box.y0 - ((box.y0 - box.y1) * i) / 12)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
        await page.waitForTimeout(16)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(300)
      const top = await page.evaluate(() => document.querySelector('.nyheter__lista').scrollTop)
      rapport('listan scrollar med fingret', top > 20, `scrollTop ${top}`)
      await page.screenshot({ path: `.test-shots/_nyheter-scrollad-${vp.width}.png` })
    } else {
      rapport('listan behöver inte scrollas', true, `${mat.scrollH} ≤ ${mat.clientH}`)
    }

    await page.tap('.nyheter__stang')
    await page.waitForTimeout(300)
    rapport('✖ stänger med ett tryck', !(await page.$('.dom-modal')))
    const minne = await page.evaluate(() => localStorage.getItem('pwagames.nyheter'))
    rapport('läst post sparas', /"sett":"\d+\.\d+"/.test(minne || ''), minne)

    // Öppna igen och stäng UTANFÖR kortet.
    await page.touchscreen.tap(...KNAPP)
    await page.waitForTimeout(400)
    await page.touchscreen.tap(8, 8)
    await page.waitForTimeout(300)
    rapport('tryck utanför stänger', !(await page.$('.dom-modal')))
    await page.screenshot({ path: `.test-shots/_nyheter-efter-${vp.width}.png` })
    await ctx.close()
  }
  console.log('\n  KONSOLFEL:')
  for (const m of fel) console.log(`  × ${m.slice(0, 120)}`)
  if (!fel.length) console.log('  (inga)')
  const trasiga = resultat.filter((r) => !r).length
  console.log(`\n  ${trasiga || fel.length ? '✗' : '✓'} ${resultat.length - trasiga}/${resultat.length}`)
} finally {
  await browser.close()
}
