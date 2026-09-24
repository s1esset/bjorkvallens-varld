// _siktprobe.mjs — grodan-slurps SIKTE och VÄNDKNAPP, spelade på riktigt i headless Chrome.
//
//   node scripts/_siktprobe.mjs [--bilder]
//
// Ägaren (2026-09-24): "när vi håller in fingret på grodan för superhopp så vill vi se en
// diskret / halvtransparent animerad pil (trajectory path) som hela tiden uppdaterar banan …
// samt att man kan justera den genom att dra med fingret för att bestämma riktningen", och en
// liten knapp nere till höger som vänder grodan utan att tungan åker ut.
//
// Armar:
//   bana × N    håll på grodan, dra fingret åt ett håll, vänta, läs PILENS bana (spelets egen
//               `_sikt.bana`) i sista bildrutan före släppet, släpp — och spela in grodans
//               tyngdpunkt VARJE FYSIKSTEG (phys.beforeStep) tills den landar. Felet = avståndet
//               mellan pilens punkt k och tyngdpunkten efter k steg, och landningen i x.
//               Kontrollarmen: inget drag (grodans egen riktning) — pilen måste stämma även där.
//   riktning    dras fingret åt vänster/höger hoppar grodan åt det hållet (hoppets första fart).
//   kort-drag   ett kort tryck som DRAR (0,2 s) blir ett superhopp; ett kort tryck utan drag är
//               fortfarande ett vanligt hopp (P0 — inget kräver håll).
//   vand        tryck på vändknappen: riktningen byts, ingen tunga går ut; två tryck = tillbaka;
//               mitt i ett superhopp vänder den INTE (stjärnläget har ingen sida).
//
// --bilder: .test-shots/_sikt-*.png (pilen mitt i ett drag, och vändknappen). Titta på dem.
// Kräver dev-servern (npm run dev).
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const BILDER = argv.includes('--bilder')
const ID = 'grodan-slurp'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 240)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 240)) })

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
// Dammen (flest blad att landa på) — en sond som tvingar biomen jämför samma värld varje gång.
await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(700)

// Världspunkt → sidans pixlar (kameran flyttar världen).
async function sida(x, y, lager = '_scen') {
  return page.evaluate(([x, y, lager]) => {
    const g = window.__barnspel.game
    const p = g[lager].toGlobal({ x, y })
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const skala = r.width / (c.width / (window.devicePixelRatio || 1))
    return { x: r.left + p.x * skala, y: r.top + p.y * skala }
  }, [x, y, lager])
}

const lage = () => page.evaluate(() => {
  const g = window.__barnspel.game
  const gr = g._groda
  const c = gr.tyngdpunkt()
  return {
    x: gr.pos.x, y: gr.pos.y, cx: c.x, cy: c.y, riktning: gr.riktning, lage: gr.lage, fas: gr.superFas, stj: gr.stjarna,
    sup: g._super?.fas ?? null, tunga: g._tunga.lage, ladd: !!g._ladd, firar: g._firar, paMark: gr.paMark,
    vk: { x: g._vandKnapp.c.x, y: g._vandKnapp.c.y, syns: g._vandKnapp.c.visible },
  }
})

async function vantaSitt(maxMs = 12000) {
  const t = Date.now()
  while (Date.now() - t < maxMs) {
    const L = await lage()
    if (!L.firar && !L.sup && !L.fas && (L.lage === 'sitt') && L.tunga === 'av' && L.paMark) return L
    await page.waitForTimeout(60)
  }
  return lage()
}

// Kalla hem grodan till startbladet (samma som hem-bladet gör) — varje arm börjar på samma ställe.
async function hem() {
  await page.evaluate(() => {
    const g = window.__barnspel.game
    g._kallaHem(g._ctx)
  })
  await page.waitForTimeout(900)
}

let bildNr = 0
async function bild(namn) {
  if (!BILDER) return
  await page.screenshot({ path: `.test-shots/_sikt-${String(++bildNr).padStart(2, '0')}-${namn}.png` })
}

// Ett siktat superhopp. dir = [dx, dy] i skärmpixlar från grodan (null = inget drag).
async function siktHopp(dir, hallS, { bildNamn = null } = {}) {
  await hem()
  const L = await vantaSitt()
  const p = await sida(L.cx, L.cy)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  const t0 = Date.now()
  if (dir) {
    // Dra i tio små steg (ett riktigt finger glider).
    await page.waitForTimeout(60)
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(p.x + (dir[0] * i) / 10, p.y + (dir[1] * i) / 10)
      await page.waitForTimeout(16)
    }
  }
  while ((Date.now() - t0) / 1000 < hallS - 0.05) await page.waitForTimeout(30)
  if (bildNamn) await bild(bildNamn)
  // Pilens bana i SISTA bildrutan före släppet + inspelning av tyngdpunkten per fysiksteg.
  const pil = await page.evaluate(() => {
    const g = window.__barnspel.game
    const s = g._sikt
    const rec = (window.__siktRec = { pts: [], landSteg: null, n: 0, klar: false })
    g._phys.beforeStep(() => {
      if (rec.klar) return
      const gr = g._groda
      if (!gr) return
      const c = gr.tyngdpunkt()
      rec.pts.push(c.x, c.y)
      rec.n++
      if (rec.n > 3 && rec.n < 40 && !gr.landat) {
        let l = -Infinity
        for (const d of gr.delar) l = Math.max(l, d.bounds.max.y)
        ;(rec.lagst = rec.lagst || []).push(Math.round(l - c.y))
      }
      // Vad nuddar grodan (steg 4–30)? — en bana som tar slut för tidigt har en orsak.
      if (rec.n > 3 && rec.n < 30) {
        const del = new Set(gr.delar)
        for (const pr of g._phys.engine.pairs.list) {
          if (!pr.isActive || pr.isSensor) continue
          const a = pr.bodyA.parent || pr.bodyA
          const bb = pr.bodyB.parent || pr.bodyB
          if (del.has(a) === del.has(bb)) continue
          const annan = del.has(a) ? bb : a
          rec.kontakt = rec.kontakt || {}
          const nyckel = annan.label + '@' + Math.round(annan.position.x)
          if (!(nyckel in rec.kontakt)) rec.kontakt[nyckel] = rec.n
        }
      }
      // Landat = superhoppets egen flagga (eller fötterna under något efter frånskjutet — de
      // trycker mot bladet de första stegen, det är inte en landning).
      if (rec.landSteg === null && rec.n > 3 && (gr.landat || (rec.n > 14 && (gr._markUnder < 2 || gr.iVatten)))) rec.landSteg = rec.n
      if (rec.n > 260) rec.klar = true
    })
    if (!s?.bana) return null
    const P = s.bana.pts
    const ex = P[P.length - 2]
    const ey = P[P.length - 1] + 30
    const i = g._dammen.foremal.filter((f) => { const bb = f.body.bounds; return ex > bb.min.x && ex < bb.max.x && ey > bb.min.y && ey < bb.max.y }).map((f) => f.body.label)
    const gr = g._groda
    return { pts: P.slice(), landat: s.bana.landat, a: s.a, i, under: gr.underlag?.label ?? null, lage: gr.lage, com: gr.tyngdpunkt() }
  })
  await page.mouse.up()
  await page.waitForTimeout(3600)
  const rec = await page.evaluate(() => {
    window.__siktRec.klar = true
    return window.__siktRec
  })
  const ut = { dir, hallS, pilSyns: !!pil && pil.a > 0.5, pilLandat: pil?.landat ?? null, pilI: pil?.i, under: pil?.under, lage: pil?.lage, com: pil ? [Math.round(pil.com.x), Math.round(pil.com.y)] : null }
  if (!pil || rec.pts.length < 6) return { ...ut, fel: 'ingen bana/inspelning' }
  // Inspelningens första punkt är tyngdpunkten före första steget (= pilens start, nästan: ett
  // steg kan ha gått mellan pilens bildruta och släppet).
  // Inspelningen startar före släppet: börja vid steget innan farten hoppar upp (> 5 px/steg —
  // lättningen, 4 px, kan hamna i ett eget steg).
  let k0 = 0
  for (let k = 1; k < rec.pts.length / 2; k++) {
    if (Math.hypot(rec.pts[k * 2] - rec.pts[k * 2 - 2], rec.pts[k * 2 + 1] - rec.pts[k * 2 - 1]) > 5) {
      k0 = k - 1
      break
    }
  }
  const A = rec.pts.slice(k0 * 2)
  if (rec.landSteg !== null) rec.landSteg -= k0
  const P = pil.pts
  const start = Math.hypot(A[0] - P[0], A[1] - P[1])
  const n = Math.min(A.length, P.length) / 2
  const slut = Math.min(n, rec.landSteg ?? n) - 1
  let maxFel = 0
  const felVid = []
  for (let k = 1; k <= slut; k++) {
    const e = Math.hypot(A[k * 2] - P[k * 2], A[k * 2 + 1] - P[k * 2 + 1])
    maxFel = Math.max(maxFel, e)
    if (k % 15 === 0) felVid.push(Math.round(e))
  }
  // Toppen och landningen: pilens mot grodans.
  let pTop = Infinity
  let aTop = Infinity
  for (let k = 0; k < P.length / 2; k++) pTop = Math.min(pTop, P[k * 2 + 1])
  for (let k = 0; k < (rec.landSteg ?? A.length / 2); k++) aTop = Math.min(aTop, A[k * 2 + 1])
  const pLand = { x: P[P.length - 2], y: P[P.length - 1], steg: P.length / 2 - 1 }
  const ls = rec.landSteg ?? A.length / 2 - 1
  const aLand = { x: A[ls * 2 - 2], y: A[ls * 2 - 1], steg: ls - 1 }
  const v0 = { x: A[2] - A[0], y: A[3] - A[1] }
  // Farten efter frånskjutet: grodans (steg 9→10) mot pilens (samma steg).
  const vk = (Q, k) => ({ x: Q[k * 2] - Q[k * 2 - 2], y: Q[k * 2 + 1] - Q[k * 2 - 1] })
  const k10 = Math.min(10, slut)
  const dv = k10 > 2 ? { x: Math.round((vk(A, k10).x - vk(P, k10).x) * 100) / 100, y: Math.round((vk(A, k10).y - vk(P, k10).y) * 100) / 100 } : null
  return {
    ...ut,
    startFel: Math.round(start),
    maxFelForeLandning: Math.round(maxFel),
    felVar15steg: felVid,
    topp: { pil: Math.round(P[1] - pTop), groda: Math.round(A[1] - aTop) },
    landning: { pilX: Math.round(pLand.x), grodaX: Math.round(aLand.x), dx: Math.round(aLand.x - pLand.x), pilSteg: pLand.steg, grodaSteg: aLand.steg },
    forstaFart: { x: Math.round(v0.x * 10) / 10, y: Math.round(v0.y * 10) / 10 },
    dvSteg10: dv,
    k0,
    kontakt: rec.kontakt,
    benUnderTP: rec.lagst ? [Math.min(...rec.lagst), rec.lagst.slice().sort((a, b) => a - b)[rec.lagst.length >> 1], Math.max(...rec.lagst)] : null,
    pilV1: { x: Math.round((P[2] - P[0]) * 10) / 10, y: Math.round((P[3] - P[1]) * 10) / 10 },
  }
}

const res = { bana: [], kortDrag: null, kortTapp: null, vand: null }

// Kontrollarm först: inget drag.
res.bana.push(await siktHopp(null, 1.0))
for (const [dir, hall, namn] of [
  [[160, -170], 0.9, 'hoger-brant'],
  [[-220, -120], 1.4, 'vanster'],
  [[240, -60], 1.7, 'hoger-flack'],
  [[-200, -115], 1.1, 'vanster-30'],
  [[0, -220], 1.2, 'rakt-upp'],
  [[-150, 90], 0.8, 'vanster-nedat'],
]) {
  res.bana.push({ namn, ...(await siktHopp(dir, hall, { bildNamn: namn === 'vanster' ? 'drag-vanster' : namn === 'hoger-brant' ? 'drag-hoger' : null })) })
}

// Kort drag (0,2 s) → superhopp; kort tryck utan drag → vanligt hopp.
{
  await hem()
  const L = await vantaSitt()
  const p = await sida(L.cx, L.cy)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(p.x - i * 25, p.y - i * 25)
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(60)
  await page.mouse.up()
  await page.waitForTimeout(150)
  const M = await lage()
  res.kortDrag = { blevSuper: !!(M.sup || M.fas), riktning: M.riktning }
  await page.waitForTimeout(4000)
}
{
  await hem()
  const L = await vantaSitt()
  const p = await sida(L.cx, L.cy)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(90)
  await page.mouse.up()
  let sup = false
  let minY = L.cy
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(50)
    const M = await lage()
    minY = Math.min(minY, M.cy)
    if (M.sup || M.fas === 'volt' || M.fas === 'stjarna') sup = true
  }
  res.kortTapp = { blevSuper: sup, hojd: Math.round(L.cy - minY) }
}

// Vändknappen.
{
  await hem()
  const L = await vantaSitt()
  const logg0 = await page.evaluate(() => (window.__barnspel.gamelog?.events || []).length)
  const vk = await sida(L.vk.x, L.vk.y, '_hud')
  await bild('vandknapp-fore')
  const r = { start: L.riktning, efter1: null, efter2: null, tungaUt: false, iLuften: null, kant: null }
  await page.mouse.click(vk.x, vk.y)
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(40)
    const M = await lage()
    if (M.tunga !== 'av') r.tungaUt = true
  }
  r.efter1 = (await lage()).riktning
  await bild('vandknapp-efter')
  await page.waitForTimeout(700)
  // Halon: 55 px snett ut från mitten (utanför bilden r 32, innanför träffradien 60).
  await page.mouse.click(vk.x - 39, vk.y - 39)
  await page.waitForTimeout(300)
  r.efter2 = (await lage()).riktning
  // Mitt i ett superhopp: ingen vändning, inga fel.
  const L2 = await vantaSitt()
  const p = await sida(L2.cx, L2.cy)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  await page.waitForTimeout(450)
  const fore = await lage()
  await page.mouse.click(vk.x, vk.y)
  await page.waitForTimeout(100)
  const efter = await lage()
  r.iLuften = { fas: fore.fas, riktningFore: fore.riktning, riktningEfter: efter.riktning, stj: efter.stj }
  r.kant = { x: Math.round(L.vk.x), y: Math.round(L.vk.y) }
  res.vand = r
  await page.waitForTimeout(4000)
}

// Exit mitt i en sats med fingret dragande, in igen, spela, ut: 0 fel krävs.
{
  await hem()
  const L = await vantaSitt()
  const p = await sida(L.cx, L.cy)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.mouse.move(p.x + 120, p.y - 140)
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.mouse.up()
  await page.waitForTimeout(600)
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
  await page.waitForTimeout(2500)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
}

for (const a of res.bana) console.log(JSON.stringify(a))
console.log(JSON.stringify({ kortDrag: res.kortDrag, kortTapp: res.kortTapp, vand: res.vand }))
console.log('konsolfel:', fel.length, fel.slice(0, 6))
await b.close()
