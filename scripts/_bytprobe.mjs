// SOND: HUR LÄNGE lever det gamla spelet efter att barnet tryckt på bakknappen?
//
// `Nav.go()` monterar den NYA skärmen först och river den gamla först när övergången är
// klar (`onComplete: klar`, `ANIM.fade + 0.1`). Under hela det fönstret kör spelet vidare:
// dess ticker, dess `ctx.later()`-timers, dess röst och dess ljudslingor — allt det som
// `GameHost.destroy()` städar, och som alltså inte städas ännu. Det är MENINGEN att bilden
// glider undan så (mätt i `_navprobe`: korstoningen lyste creme, den här ordningen 0,9 %),
// men LJUDET har aldrig mätts i samma fönster.
//
// Sonden tidsstämplar: tryck → ny skärm monterad → gammal skärm riven, och läser vad som
// hände med rösten däremellan (`say`/`cancel` med text), plus om spelets ljudslingor ännu
// låter när den nya skärmen redan är uppe.
//
// KONTROLLARM först: samma mätning på ett byte MENY→BIBLIOTEK, där ingen GameHost finns att
// riva. Fönstret ska finnas där också (det är Navs, inte spelets) men röstraderna ska
// saknas — annars mäter sonden något annat än den tror.
//
//   node scripts/_bytprobe.mjs [--spel borsta-tanderna] [--varv 3]
import { chromium } from 'playwright'

const opt = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const url = opt('--url', 'http://localhost:5173')
const ID = opt('--spel', 'borsta-tanderna')
const VARV = Number(opt('--varv', '3'))

const HAKA = () => {
  const v = window.__barnspel.voice
  const a = window.__barnspel.audio
  window.__spar = []
  const nu = () => Math.round(performance.now())
  if (!v.__hakad) {
    for (const n of ['say', 'cancel']) {
      const o = v[n].bind(v)
      v[n] = (...arg) => { window.__spar.push({ t: nu(), vad: 'voice.' + n, text: String(arg[0] || '').slice(0, 34) }); return o(...arg) }
    }
    if (a.stopAllLoops) {
      const o = a.stopAllLoops.bind(a)
      a.stopAllLoops = (...arg) => { window.__spar.push({ t: nu(), vad: 'audio.stopAllLoops' }); return o(...arg) }
    }
    v.__hakad = true
  }
  // Navs egen ordning: när monteras den nya skärmen, när rivs den gamla?
  const nav = window.__barnspel.nav
  if (!nav.__hakad) {
    const g = nav.go.bind(nav)
    nav.go = (namn, p) => {
      window.__spar.push({ t: nu(), vad: 'go(' + namn + ')' })
      const f = nav.routes.get(namn)
      if (f && !f.__hakad) {
        const h = async (...arg) => {
          const s = await f(...arg)
          window.__spar.push({ t: nu(), vad: 'monterad:' + namn })
          const d = s.destroy?.bind(s)
          s.destroy = (...x) => { window.__spar.push({ t: nu(), vad: 'riven:' + namn }); return d?.(...x) }
          return s
        }
        h.__hakad = true
        nav.routes.set(namn, h)
      }
      // Den GAMLA skärmens destroy måste också fångas — den hakades när den monterades.
      return g(namn, p)
    }
    nav.__hakad = true
  }
  return 'hakad'
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  console.log('  hake: ' + (await page.evaluate(HAKA)))

  const kor = async (till, fran, etikett) => {
    await page.evaluate(() => { window.__spar.length = 0 })
    await page.evaluate(([t, i]) => window.__barnspel.nav.go(t, i ? { id: i } : {}), [fran.n, fran.id || ''])
    await page.waitForTimeout(2600)
    await page.evaluate(() => { window.__spar.length = 0 })
    await page.evaluate((t) => window.__barnspel.nav.go(t), till)
    await page.waitForTimeout(1600)
    const s = await page.evaluate(() => window.__spar)
    const t0 = s[0]?.t ?? 0
    const riven = s.find((x) => x.vad.startsWith('riven:'))
    const mont = s.find((x) => x.vad.startsWith('monterad:'))
    console.log(`\n  ${etikett}`)
    for (const x of s) console.log(`    +${String(x.t - t0).padStart(4)} ms  ${x.vad}${x.text ? '  "' + x.text + '"' : ''}`)
    console.log(`    → fönster tryck→rivning: ${riven ? riven.t - t0 : '?'} ms · ny skärm uppe efter ${mont ? mont.t - t0 : '?'} ms`)
    return riven ? riven.t - t0 : null
  }

  // KONTROLLARM: byte utan GameHost. Fönstret ska finnas, röstraderna inte.
  await kor('library', { n: 'menu' }, 'KONTROLL  meny → bibliotek (ingen GameHost)')

  const matt = []
  for (let i = 0; i < VARV; i++) matt.push(await kor('library', { n: 'game', id: ID }, `MÄTARM ${i + 1}  ${ID} → bibliotek`))
  const rena = matt.filter((x) => x != null)
  if (rena.length) {
    console.log(`\n  FÖNSTER (tryck → GameHost.destroy): ${rena.join(', ')} ms · median ${rena.sort((a, b) => a - b)[rena.length >> 1]} ms`)
  }
} finally {
  await browser.close()
}
