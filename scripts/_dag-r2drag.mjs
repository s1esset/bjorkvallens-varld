// R2-SNABBDRAG — korgen/tratten dras i full fart genom fallande föremål (dag 2026-10-02 D7)
//
//   node scripts/_dag-r2drag.mjs fanga-frukten|studsa-ner [sekunder]   (dev-servern på :5173)
//
// Frågan R2 ställer: när barnet sveper korgen (fanga-frukten) eller tratten (studsa-ner) så
// fort det går, går föremålen IGENOM kanten (statisk kropp som teleporteras) — och hur hårt
// kastas de efter mötet (kinematisk kropp med maxFart)? Sonden sveper kontrollen fram och
// tillbaka i spelets tak-fart (korgen: _targetX, spelets egen 26 px/bildruta-gräns; tratten:
// _positionFunnel 40 px/bildruta), släpper extra föremål i svepets bana och följer VARJE
// föremål bildruta för bildruta:
//   kontakt   = föremålet kom inom sin radie + kantens halva tjocklek från kanten
//   igenom    = föremålets centrum korsade kantens mittlinje (tecknet bytte) inom kantens längd,
//               eller kom närmare än 40 % av kontaktavståndet
//   fartEfter = högsta fart (px/steg) under 60 bildrutor efter första kontakten
//   urBild    = föremålet lämnade 0..1280 i x eller steg över y −60
// Fälten _rimL/_rimR (korgen) och _funnelL/_funnelR (tratten) läses som matter-kroppar.
// Kontrollarm: HEAD (statiska kroppar med setPosition) — där ska `igenom` > 0 synas vid svep.
import { chromium } from 'playwright'

const id = process.argv[2] || 'fanga-frukten'
const sek = Number(process.argv[3] || 25)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  await page.waitForTimeout(2500)
  await page.evaluate(async (id) => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /matter/.test(n))
    const M = await import(url)
    const Body = (M.default || M).Body
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const korg = id === 'fanga-frukten'
    const S = (window.__r2 = { id, rutor: 0, foremal: 0, kontakt: 0, igenom: 0, urBild: 0, fartEfter: [], minKvot: [], spar: new Map() })
    let dir = 1
    let fx = 640
    let n = 0
    const kanter = () => (korg ? [g._rimL, g._rimR] : [g._funnelL, g._funnelR]).filter(Boolean)
    const lista = () => (korg ? g._fruit : g._balls) || []
    const tick = () => {
      if (window.__barnspel.game !== g || !g._alive) return
      S.rutor++
      n++
      // Svep kontrollen i takfart.
      if (korg) {
        if (Math.abs(g._targetX - g._basket.x) < 4 || n === 1) {
          dir = -dir
          g._targetX = dir > 0 ? g._bMax : g._bMin
        }
        g._misses = 0
        if (n % 28 === 0) {
          g._spawn(ctx)
          const f = g._fruit[g._fruit.length - 1]
          if (f && f.body) {
            Body.setPosition(f.body, { x: 260 + Math.random() * 760, y: g._mouthY - 150 })
            Body.setVelocity(f.body, { x: 0, y: 6 })
          }
        }
      } else {
        fx += dir * 40
        if (fx > 1080) { fx = 1080; dir = -1 }
        if (fx < 200) { fx = 200; dir = 1 }
        // Släpp där tratten FAKTISKT står (som ett riktigt släpp), annars mäter sonden släppets teleport.
        if (n % 24 === 0 && g._funnelL) g._drop(ctx, g._funnelL.position.x + 87.5, true)
        g._positionFunnel(fx)
        g._dropX = fx
      }
      // Följ varje föremål mot varje kant.
      for (const f of lista()) {
        const b = f.body
        if (!b || f.caught || f.settled) continue
        let s = S.spar.get(b.id)
        if (!s) { s = { kontaktRuta: -1, maxFart: 0, minKvot: 9, igenom: false, ur: false, sida: {} }; S.spar.set(b.id, s); S.foremal++ }
        const r = b.circleRadius || 20
        for (const k of kanter()) {
          const dx = b.position.x - k.position.x
          const dy = b.position.y - k.position.y
          let kvot, ly, inom
          if (k.circleRadius) {
            const d = Math.hypot(dx, dy)
            kvot = d / (k.circleRadius + r)
            inom = false
          } else {
            const c = Math.cos(-k.angle), si = Math.sin(-k.angle)
            const lx = dx * c - dy * si
            ly = dx * si + dy * c
            inom = Math.abs(lx) < 60
            kvot = inom ? Math.abs(ly) / (6 + r) : 9
          }
          if (kvot < 1.05 && s.kontaktRuta < 0) s.kontaktRuta = S.rutor
          s.minKvot = Math.min(s.minKvot, kvot)
          if (inom) {
            const sg = Math.sign(ly)
            const fore = s.sida[k.id]
            if (fore !== undefined && fore !== sg && Math.abs(ly) < 6 + r) s.igenom = true
            s.sida[k.id] = sg
          } else if (!k.circleRadius) delete s.sida[k.id]
        }
        if (s.minKvot < 0.4) s.igenom = true
        if (s.kontaktRuta >= 0 && S.rutor - s.kontaktRuta <= 60) {
          s.maxFart = Math.max(s.maxFart, Math.hypot(b.velocity.x, b.velocity.y))
        }
        if (b.position.x < 0 || b.position.x > 1280 || b.position.y < -60) s.ur = true
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, id)
  await page.waitForTimeout(sek * 1000)
  const res = await page.evaluate(() => {
    const S = window.__r2
    const spar = [...S.spar.values()]
    const kontakt = spar.filter((s) => s.kontaktRuta >= 0)
    const farter = kontakt.map((s) => s.maxFart).sort((a, b) => a - b)
    const q = (p) => (farter.length ? Number(farter[Math.min(farter.length - 1, Math.floor(p * farter.length))].toFixed(2)) : null)
    return {
      id: S.id, rutor: S.rutor, foremal: spar.length, kontakt: kontakt.length,
      igenom: spar.filter((s) => s.igenom).length,
      urBild: spar.filter((s) => s.ur).length,
      fartEfterMedian: q(0.5), fartEfterP90: q(0.9), fartEfterMax: farter.length ? Number(farter[farter.length - 1].toFixed(2)) : null,
      minKvot: Number(Math.min(...spar.map((s) => s.minKvot)).toFixed(2)),
    }
  })
  await page.screenshot({ path: `.test-shots/_dag-r2drag-${id}.png` })
  console.log(JSON.stringify({ ...res, errors: errors.slice(0, 5), antalFel: errors.length }, null, 2))
} finally {
  await browser.close()
}
