// Nattkörningen 2026-10-01: `vad-forsvann` — spelar rundor med RIKTIGA musklick: Göm-knappen,
// bild mitt i filtens täckning (ska dölja allt), svarsfasen, ett fel svar och sedan rätt.
// Tvingar nivå 0 ('gone') och nivå 3 (båda lägena), två rundor i rad otåligt, och exit mitt i filten.
//   node scripts/_natt-vad-forsvann.mjs
import { chromium } from 'playwright'

const ID = 'vad-forsvann'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text = '') => rader.push({ namn, ok: !!villkor, text })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  const start = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
    await page.waitForTimeout(900)
  }
  // Global skärmpunkt (css px) för ett Pixi-objekt; duken fyller 1280×720 i den här vyn.
  const pt = (expr) => page.evaluate((e) => {
    const g = window.__barnspel.game, c = window.__barnspel.ctx
    const o = new Function('g', 'c', 'return ' + e)(g, c)
    if (!o || o.destroyed) return null
    const p = o.getGlobalPosition()
    const cv = document.querySelector('canvas').getBoundingClientRect()
    const r = window.__barnspel.app?.renderer?.screen || { width: cv.width, height: cv.height }
    return { x: cv.left + p.x * cv.width / r.width, y: cv.top + p.y * cv.height / r.height }
  }, expr)
  const fas = () => page.evaluate(() => window.__barnspel.game._phase)
  const tvinga = (lvl, mode) => page.evaluate(([l, m]) => {
    const g = window.__barnspel.game, c = window.__barnspel.ctx
    g._level = l
    const r = Math.random
    if (m) Math.random = () => (m === 'added' ? 0.1 : 0.9)
    g._build(c)
    Math.random = r
    return g._mode + ' n=' + g._slots.length
  }, [lvl, mode])

  const runda = async (tag) => {
    await page.waitForTimeout(1200) // knappen skalar in efter sakerna
    const b = await pt('g._button')
    if (!b) return ok(tag + ' knapp', false, 'ingen knapp')
    await page.mouse.click(b.x, b.y + 10)
    // mitt i täckningen: filten ska ha lagt sig över rutnätet
    let mitt = false
    for (let i = 0; i < 40 && !mitt; i++) {
      await page.waitForTimeout(50)
      mitt = await page.evaluate(() => {
        const g = window.__barnspel.game
        return g._phase === 'covering' && !!g._missing
      })
    }
    await page.screenshot({ path: `.test-shots/_natt-vf-${tag}-mitt.png` })
    ok(tag + ' filten nådde täckt läge', mitt)
    await page.waitForFunction(() => window.__barnspel.game._phase === 'answer', null, { timeout: 8000 }).catch(() => {})
    const f = await fas()
    ok(tag + ' svarsfas', f === 'answer', f)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `.test-shots/_natt-vf-${tag}-svar.png` })
    const info = await page.evaluate(() => {
      const g = window.__barnspel.game
      const i = g._choices.findIndex((c) => g._missing && c && !c.destroyed && c._motif === g._missing._motif)
      return { n: g._choices.length, ratt: i, motifs: g._choices.map((c) => c._motif?.key || c._motif?.name || '?') }
    })
    // hitta rätt via motif-referens om _motif inte finns på kortet: jämför via spelets egen onChoice
    const rattIdx = info.ratt >= 0 ? info.ratt : await page.evaluate(() => {
      const g = window.__barnspel.game
      return g._choices.findIndex((c) => c.__m === g._missing._motif)
    })
    const felIdx = [...Array(info.n).keys()].find((i) => i !== rattIdx)
    if (felIdx != null) {
      const p = await pt(`g._choices[${felIdx}]`)
      await page.mouse.click(p.x, p.y)
      await page.waitForTimeout(250)
      ok(tag + ' fel svar vingar, fas kvar', (await fas()) === 'answer')
    }
    const pr = await pt(`g._choices[${rattIdx}]`)
    if (!pr) return ok(tag + ' rätt svar', false, 'rätt index ' + rattIdx + ' ' + JSON.stringify(info))
    await page.mouse.click(pr.x, pr.y)
    await page.waitForTimeout(250)
    ok(tag + ' rätt svar löser', (await fas()) === 'resolved', await fas())
    await page.waitForFunction(() => window.__barnspel.game._phase === 'show' && window.__barnspel.game._button, null, { timeout: 6000 }).catch(() => {})
    ok(tag + ' ny runda', (await fas()) === 'show')
  }

  await start()
  // Svaren bär sitt motiv? Annars märk dem via _makeChoice.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    const orig = g._makeChoice
    g._makeChoice = function (c, m) { const k = orig.call(this, c, m); k.__m = m; return k }
  })
  console.log('   ..', await tvinga(0))
  await runda('n0a')
  await runda('n0b') // otåligt direkt på nästa
  console.log('   ..', await tvinga(3, 'gone'))
  await runda('n3gone')
  console.log('   ..', await tvinga(3, 'added'))
  await runda('n3added')
  console.log('   ..', await tvinga(2, 'gone'))
  await runda('n2gone')

  // Exit mitt i filten
  const b = await pt('g._button')
  if (b) await page.mouse.click(b.x, b.y + 10)
  await page.waitForTimeout(300)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('0 konsolfel', errors.length === 0, errors.slice(0, 4).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log((r.ok ? '✓ ' : '✗ ') + r.namn + (r.text ? '  — ' + r.text : ''))
process.exit(rader.every((r) => r.ok) ? 0 : 1)
