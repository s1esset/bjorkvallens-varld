// _varldbildprobe.mjs — bilder av grodan-slurps STORA värld (L4) från kamerans olika lägen.
//
//   node scripts/_varldbildprobe.mjs [--tid morgon|eftermiddag|skymning]
//
// Harnessens skärmdump visar bara den bit kameran råkar stå på. Här släpps följningen och
// kameran flyttas (spelets egen `_kam.moveTo`) till: startbilden · vänstra strandens träd ·
// uppe i vänstra kronan · kören · högra stranden · uppe i högra kronan · mitten uppe. En
// skärmdump per läge i .test-shots/_varld-N.png, plus kamerans och lagrens lägen (parallaxen
// går bara att bedöma som tal — minnet "Kamerans första kund": fjärranbandet ska ha flyttat
// FJARRAN × kamerans förflyttning, HUD:en 0).
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const TID = val('--tid', null)
const BIOM = val('--biom', null) // L5: damm | is | fors | skog (via spelets _tvingaBiom)
const PREFIX = val('--prefix', BIOM ? `_varld-${BIOM}` : '_varld')

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(1200)
if (BIOM && !TID) {
  await page.evaluate((biom) => {
    const g = window.__barnspel.game
    g._tvingaBiom = biom
    g._rivVarld()
    g._byggVarld(g._ctx)
  }, BIOM)
  await page.waitForTimeout(1200)
}
if (TID) {
  await page.evaluate((tid) => {
    const g = window.__barnspel.game
    g._senasteTid = null
    g._runda = 1
    const orig = Math.random
    g._rivVarld()
    // Bygg om med vald tid: _byggVarld väljer 'eftermiddag' i runda 1, annars slump bland övriga.
    g._runda = tid === 'eftermiddag' ? 0 : 1
    if (window.__vbBiom) g._tvingaBiom = window.__vbBiom
    g._senasteTid = tid === 'morgon' ? 'skymning' : 'morgon'
    Math.random = () => 0.01
    try { g._byggVarld(g._ctx) } finally { Math.random = orig }
  }, TID)
  await page.waitForTimeout(800)
}
const info = await page.evaluate(() => {
  const g = window.__barnspel.game
  g._nastaHinder = 9999
  const d = g._dammen
  const P = d._plan
  return {
    biom: d.biomNamn, tid: d.tid, VW: d.VW, TOPP: d.TOPP, kor: P.kor, start: d.startPunkt,
    trad: P.trad.map((t) => ({ bank: t.bank, x: Math.round(d._xb(t.bank, t.stamU)), grenar: t.grenar.map((q) => Math.round(q.topp)) })),
    stubbe: P.stubbe && { x: Math.round(d._x(P.stubbe.u)), topp: Math.round(P.stubbe.topp) },
  }
})
const lagen = [
  ['start', null, null],
  ['vanstra-tradet', 640, 360],
  ['vanstra-kronan', 640, -360],
  ['koren', info.kor.x, 360],
  ['hogra-stranden', info.VW - 640, 360],
  ['hogra-kronan', info.VW - 640, -360],
  ['mitten-uppe', info.VW / 2, -200],
]
const matt = []
for (const [i, [namn, x, y]] of lagen.entries()) {
  const m = await page.evaluate(([x, y]) => {
    const g = window.__barnspel.game
    const k = g._kam
    if (x !== null) {
      k.unfollow()
      k.moveTo(x, y)
    }
    const f = g._L.fjarran
    return { kamX: Math.round(k.x), kamY: Math.round(k.y), varld: { x: Math.round(g._scen.x), y: Math.round(g._scen.y) }, fjarran: { x: Math.round(f.x), y: Math.round(f.y) }, himmel: { x: Math.round(g._L.himmel.x), y: Math.round(g._L.himmel.y) }, hud: { x: Math.round(g._hud.x), y: Math.round(g._hud.y) } }
  }, [x, y])
  await page.waitForTimeout(450)
  await page.screenshot({ path: `.test-shots/${PREFIX}-${i}.png` })
  matt.push({ i, namn, ...m })
}
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(600)
console.log(JSON.stringify({ info, matt, fel: fel.length, felExempel: fel.slice(0, 5) }, null, 1))
await b.close()
