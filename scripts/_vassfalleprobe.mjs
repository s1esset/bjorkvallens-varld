// _vassfalleprobe.mjs — vass-fällan i grodan-slurp: kommer grodan loss ur vassen vid kanten?
//
//   node scripts/_vassfalleprobe.mjs [--pass 6] [--sek 40] [--falla vass|stubbe]
//
// --falla stubbe (L4): samma prov vid den döda stammen mitt i dammen — grodan tätt intill
// stammen, vänd MOT den. Där fastnade _bajsloopprobe i L4:s första version (varje skott i 'stam').
//
// _bajsloopprobe fångade en runda som stod still i 590 s: grodan i vattnet vid kanten, med
// ansiktet MOT väggen och fyra vasstrån runt sig. Alla 576 tungskott fastnade i vassen (skotten
// mot insekterna passerade stråna precis framför munnen), och hoppen från vattnet gick åt det
// håll grodan tittade — in i väggen. Här byggs läget MED FLIT i varje pass (samma läge i båda
// armarna): grodan teleporteras till vattnet mellan vassen på den sida där det står vass,
// vänd mot väggen. Sedan spelar ett envist barn: tryck alltid på insekten närmast munnen,
// och var 8:e tryck på grodan (hopp).
//
// Mäter per pass: ätna på `--sek` s, tungskott som fastnade i vass / alla tungskott, och om
// grodan kom ut (x mer än 220 px från kanten någon gång).
// Kontrollarm = koden före rättelsen (git stash), mätarm = med rättelsen.
//
// Kräver dev-servern (npm run dev).
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const PASS = Number(val('--pass', 6))
const SEK = Number(val('--sek', 40))
const ID = 'grodan-slurp'
const FALLA = val('--falla', 'vass')

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

async function tryck(x, y) {
  const s = await page.evaluate(([x, y]) => {
    const g = window.__barnspel.game
    if (!g?._scen) return null
    const p = g._scen.toGlobal({ x, y })
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const skala = r.width / (c.width / (window.devicePixelRatio || 1))
    return { x: r.left + p.x * skala, y: r.top + p.y * skala }
  }, [x, y])
  if (s) await page.mouse.click(s.x, s.y)
}

const hornet = (x, y) => (x < 140 || x > 1140) && y < 130
const pass = []
for (let n = 0; n < PASS; n++) {
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
  // L5: biomen byts vid varje start — fällorna finns i DAMMEN, så den tvingas fram.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    if (g._biomNamn === 'damm') return
    g._tvingaBiom = 'damm'
    g._rivVarld()
    g._byggVarld(g._ctx)
  })
  await page.waitForTimeout(700)
  // Ställ grodan i vassen vid kanten, vänd mot väggen.
  const stalld = await page.evaluate((falla) => {
    const g = window.__barnspel.game
    g._nastaHinder = 9999
    window.__vfFalla = falla
    const VW = g._dammen.VW || 1280
    if (falla === 'stubbe') {
      const d = g._dammen
      const sx = d._x(d._plan.stubbe.u)
      const sida = Math.random() < 0.5 ? -1 : 1
      const x = sx + sida * 48
      g._tunga.nollstall()
      g._groda.teleportera(x, 552, -sida)
      g._kam?.moveTo(x, 360)
      return { sida, x: Math.round(x), stubbeX: Math.round(sx) }
    }
    const vass = g._dammen.foremal.filter((f) => f.typ === 'vass').map((f) => f.body.position.x)
    const v = vass.filter((x) => x < 220)
    const h = vass.filter((x) => x > VW - 220)
    const sida = v.length >= h.length ? -1 : 1
    const x = sida < 0 ? 105 : VW - 105
    g._tunga.nollstall()
    g._groda.teleportera(x, 552, sida)
    g._kam?.moveTo(x, 360)
    return { sida, x, VW, vassVid: sida < 0 ? v.map(Math.round) : h.map(Math.round) }
  }, FALLA)
  await page.waitForTimeout(500)
  const t0 = Date.now()
  let atna0 = null
  let ute = false
  let i = 0
  while ((Date.now() - t0) / 1000 < SEK) {
    const L = await page.evaluate(() => {
      const g = window.__barnspel.game
      if (!g?._groda) return null
      const m = g._groda.mun()
      const vy = g._vyNu || { left: 0, right: 1280, top: 0, bottom: 720 }
      const syns = (q) => q.x > vy.left + 60 && q.x < vy.right - 60 && q.y > vy.top + 130 && q.y < vy.bottom - 40
      return { atna: g._atna, firar: g._firar, x: g._groda.pos.x, y: g._groda.pos.y, mun: m, bar: !!g._bar, kor: g._dammen.grodungar.plats, fria: (g._bajs?.fria || []).map((k) => ({ x: k.x, y: k.y })), insekter: g._svarm.lista.filter(syns).map((q) => ({ x: q.x, y: q.y })) }
    })
    if (!L) break
    if (atna0 === null) atna0 = L.atna
    if (FALLA === 'stubbe' ? Math.abs(L.x - stalld.stubbeX) > 200 : Math.min(L.x, (stalld.VW || 1280) - L.x) > 220) ute = true
    if (!L.firar) {
      if (++i % 8 === 0) await tryck(L.x, L.y)
      else if (L.bar) await tryck(L.kor.x, L.kor.y - 30)
      else if (L.fria.length) await tryck(L.fria[0].x, L.fria[0].y)
      else if (L.insekter.length) {
        const q = L.insekter.slice().sort((a, c) => Math.hypot(a.x - L.mun.x, a.y - L.mun.y) - Math.hypot(c.x - L.mun.x, c.y - L.mun.y))[0]
        if (!hornet(q.x, q.y)) await tryck(q.x, q.y)
      }
    }
    await page.waitForTimeout(170 + Math.random() * 180)
  }
  const slut = await page.evaluate(() => {
    const g = window.__barnspel.game
    const tl = window.__gamelog?.snapshot()?.timeline || []
    let tunga = 0
    let vass = 0
    const mal = window.__vfFalla === 'stubbe' ? 'stam' : 'vass'
    for (const h of tl) {
      if (h.cat !== 'grodan') continue
      if (h.event === 'tunga') tunga++
      if (h.event === 'fast' && h.d?.mal === mal) vass++
    }
    return { atna: g._atna, tunga, vass }
  })
  pass.push({ n, ...stalld, atna: slut.atna - (atna0 ?? 0), tunga: slut.tunga, iVass: slut.vass, komUt: ute })
}
await page.evaluate(() => window.__barnspel.nav.go('library'))
const sum = (k) => pass.reduce((s, p) => s + p[k], 0)
console.log(JSON.stringify({
  pass,
  kommitUt: `${pass.filter((p) => p.komUt).length}/${pass.length}`,
  atnaTotalt: sum('atna'),
  vassAndel: `${sum('iVass')}/${sum('tunga')}`,
  fel: fel.length,
  felExempel: fel.slice(0, 5),
}, null, 1))
await b.close()
