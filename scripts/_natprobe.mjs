// Sond för natskott-pa-stan: SPELAR spelet som ett barn skulle — läser målens
// riktiga positioner ur modul-singletonen, byter nät med växelknappen när
// uppdraget kräver det, fullföljer 3 uppdrag, väntar in HEMKOMSTEN, tar en
// skärmdump mitt i finalen och lämnar sedan MITT I firandet (värsta exit-stunden),
// går in igen och ut igen. Rapporterar konsolfel + vad som faktiskt hände.
//
//   node scripts/_natprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const url = opt('--url', 'http://localhost:5173')
const ID = 'natskott-pa-stan'

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 300)))

const tap = (x, y) =>
  page.evaluate(({ x, y }) => {
    const cv = document.querySelector('canvas')
    const r = cv.getBoundingClientRect()
    for (const t of ['pointerdown', 'pointerup']) {
      cv.dispatchEvent(new PointerEvent(t, {
        clientX: r.left + x, clientY: r.top + y,
        pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
      }))
    }
  }, { x, y })

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1500)

const read = () =>
  page.evaluate(() => {
    const m = window.__natdbg
    if (!m || !m._alive) return null
    return {
      phase: m._phase,
      mode: m._mode,
      mKey: m._missionKey || null,
      mAct: !!m._missionActive,
      got: m._missionGot | 0,
      need: m._missionNeed | 0,
      done: m._missionsDone | 0,
      seat: (m._seatList || []).length,
      broken: m._brokenCount | 0,
      skata: !!m._skata,
      bodies: (m._targets || []).length,
      targets: (m._targets || []).map((r) => ({
        kind: r.kind, x: Math.round(r.view.x), y: Math.round(r.view.y),
        stuck: !!r.stuck, netted: !!r.netted, golden: !!r.golden, loosened: !!r.loosened,
      })),
    }
  })

const NEED_NET = { katt: 'drag', paket: 'klibb', ballong: 'drag' }
const seen = { gust: false, skata: false, broken: 0, gold: 0, maxBodies: 0, toggles: 0, taps: 0 }
let homecoming = false
let winTapped = 0
const t0 = Date.now()

while (Date.now() - t0 < 150000) {
  const s = await read()
  if (!s) break
  seen.maxBodies = Math.max(seen.maxBodies, s.bodies)
  if (s.skata) seen.skata = true
  // vindbyn mäts på spelets egen loosened-flagga (sätts permanent vid lossning) —
  // fältet var tidigare dött och rapporterade alltid false utan att mäta något
  if (s.targets.some((t) => t.loosened)) seen.gust = true
  seen.broken = Math.max(seen.broken, s.broken)
  if (s.targets.some((t) => t.golden)) seen.gold++

  if (s.phase === 'arrive') {
    homecoming = true
    await page.waitForTimeout(2400)
    const sArr = await read()
    console.log('  [hemkomst] mål på gatan:', JSON.stringify(sArr?.targets ?? []), 'säte:', sArr?.seat)
    await page.screenshot({ path: '.test-shots/natskott-hemkomst.png' })
    // lämna MITT i finalen (hoppande vänner, tweens, complete på väg)
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(800)
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1200)
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(800)
    break
  }

  if (s.mAct && s.mKey) {
    const wantNet = NEED_NET[s.mKey]
    if (s.mode !== wantNet) {
      await tap(168, 648) // växelknappen
      seen.toggles++
      await page.waitForTimeout(350)
      continue
    }
    const match = s.targets.find((t) =>
      (s.mKey === 'paket' ? t.kind === 'paket' : t.kind === s.mKey) &&
      !t.netted && !(wantNet === 'klibb' && t.stuck) &&
      t.x > 260 && t.x < 1170 && t.y > 70 && t.y < 600)
    if (match) {
      await tap(match.x, match.y)
      seen.taps++
      await page.waitForTimeout(700)
      continue
    }
    // inget uppdragsmål i bild: knäck en ruta då och då (testar tak + läkning)
    if (winTapped < 4 && Math.random() < 0.5) {
      await tap(300 + Math.random() * 600, 280 + Math.random() * 120)
      winTapped++
      seen.taps++
    }
    await page.waitForTimeout(600)
    continue
  }

  // fri lek: dra hem något om det finns, annars smält en ruta
  const any = s.targets.find((t) => !t.netted && !t.stuck && t.x > 300 && t.x < 1100 && t.y > 80 && t.y < 600)
  if (any && Math.random() < 0.6) {
    await tap(any.x, any.y)
    seen.taps++
  } else if (winTapped < 6) {
    await tap(350 + Math.random() * 550, 260 + Math.random() * 140)
    winTapped++
    seen.taps++
  }
  await page.waitForTimeout(650)
}

const final = await read()
console.log(JSON.stringify({
  homecoming,
  seen,
  winTapped,
  final: final ? { phase: final.phase, done: final.done, seat: final.seat } : 'exited',
  errors,
  errorCount: errors.length,
  sekunder: Math.round((Date.now() - t0) / 1000),
}, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
