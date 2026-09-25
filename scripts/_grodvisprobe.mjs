// _grodvisprobe.mjs — skärmdumpar av grodan-slurps ändringar 2026-09-25 (att TITTA på).
//
//   node scripts/_grodvisprobe.mjs [--biom damm] [--tid natt] [--sats]
//
// Bygger världen i `--biom` vid `--tid` (morgon · eftermiddag · skymning · natt) och fotar
// startbilden. Med `--sats`: håller fingret på grodan och drar det snett uppåt, fotar vid 1,0 s
// (sats-hopp: diskret vit pil) och vid 1,9 s (MAXFARTEN: tjock lysande röd pil, grodan glittrar)
// — och mäter att pilen verkligen bytte färg (röda pixlar i en ruta runt pilen, före/efter).
// Bilder: .test-shots/_grodvis-<biom>-<tid>[-sats|-max].png. Kräver dev-servern.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const BIOM = val('--biom', 'damm')
const TID = val('--tid', 'eftermiddag')
const SATS = argv.includes('--sats')
const ID = 'grodan-slurp'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 240)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 240)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.evaluate(([biom, tid]) => {
  const g = window.__barnspel.game
  g._tvingaBiom = biom
  g._valjTid = () => tid
  g._rivVarld()
  g._byggVarld(g._ctx)
  g._nastaHinder = 1e9
}, [BIOM, TID])
await page.waitForTimeout(1500)
const namn = `.test-shots/_grodvis-${BIOM}-${TID}`
await page.screenshot({ path: `${namn}.png` })
const info = await page.evaluate(() => {
  const g = window.__barnspel.game
  const d = g._dammen
  return { biom: g._biomNamn, tid: d.tid, torr: d.torr, vx: [d._vx0, d._vx1], flyt: [d.flytvolym.vanster, d.flytvolym.hoger], kor: d.grodungar.plats, vatten: !!d._vattenG }
})
console.log(JSON.stringify(info))
// Kören (en torr värld: på land) — kameran dit, en bild.
if (argv.includes('--kor')) {
  await page.evaluate(() => {
    const g = window.__barnspel.game
    const k = g._dammen.grodungar.plats
    const x = k.x + (k.x > 1280 ? -260 : 260)
    g._groda.teleportera(x, 470)
    g._kam.moveTo(x, 360)
  })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${namn}-kor.png` })
}

if (SATS) {
  const L = await page.evaluate(() => { const gr = window.__barnspel.game._groda; const c = gr.tyngdpunkt(); return { x: gr.pos.x, y: gr.pos.y, cx: c.x, cy: c.y } })
  const sida = (x, y) => page.evaluate(([x, y]) => {
    const g = window.__barnspel.game
    const p = g._scen.toGlobal({ x, y })
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const skala = r.width / (c.width / (window.devicePixelRatio || 1))
    return { x: r.left + p.x * skala, y: r.top + p.y * skala }
  }, [x, y])
  const p = await sida(L.x, L.y)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  const dir = L.cx < 1280 ? 1 : -1
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(p.x + dir * i * 22, p.y - i * 20)
    await page.waitForTimeout(16)
  }
  // Röda pixlar (maxfartens pil) i hela bilden: r > 200, g < 90, b < 90.
  const roda = () => page.evaluate(() => {
    const c = document.querySelector('canvas')
    const w = c.width
    const h = c.height
    const t = document.createElement('canvas')
    t.width = w
    t.height = h
    const x = t.getContext('2d')
    x.drawImage(c, 0, 0)
    const d = x.getImageData(0, 0, w, h).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 90 && d[i + 2] < 90) n++
    return n
  })
  await page.waitForTimeout(820)
  const rodaSats = await roda()
  await page.screenshot({ path: `${namn}-sats.png` })
  const s1 = await page.evaluate(() => ({ full: !!window.__barnspel.game._ladd?.full, t: window.__barnspel.game._ladd?.t }))
  await page.waitForTimeout(900)
  const rodaMax = await roda()
  await page.screenshot({ path: `${namn}-max.png` })
  const s2 = await page.evaluate(() => ({ full: !!window.__barnspel.game._ladd?.full, t: window.__barnspel.game._ladd?.t, glans: window.__barnspel.game._glans?.a }))
  // Håll kvar länge: hoppar grodan av sig själv? (Den ska INTE.)
  await page.waitForTimeout(4000)
  const s3 = await page.evaluate(() => ({ ladd: !!window.__barnspel.game._ladd, fas: window.__barnspel.game._groda.superFas, super: !!window.__barnspel.game._super }))
  await page.mouse.up()
  await page.waitForTimeout(400)
  const s4 = await page.evaluate(() => ({ fas: window.__barnspel.game._groda.superFas, super: !!window.__barnspel.game._super }))
  console.log(JSON.stringify({ sats: { ...s1, roda: rodaSats }, max: { ...s2, roda: rodaMax }, efter6s: s3, efterSlapp: s4 }))
}
console.log('konsolfel:', fel.length, fel.slice(0, 5))
await b.close()
