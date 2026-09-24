// _superspelprobe.mjs — spelar grodan-slurps SUPERHOPP på riktigt i headless Chrome.
//
//   node scripts/_superspelprobe.mjs [--hopp 3] [--bilder]
//
// Harnessens autotryck når aldrig grodan (loggen: noll `grodan/superhopp`), så hela superhoppet
// är omätt av `npm run test`. Den här sonden HÅLLER fingret på grodans faktiska läge
// (mouse.down … mouse.up), trycker i luften (repet), och följer förloppet ur spelets eget
// tillstånd: sats → volt → stjärna → landat → vila → vaknar → slurp → klart.
//
// Armar i tur och ordning (otåligt — nästa tryck så fort spelet tillåter):
//   tapp        ett KORT tryck på grodan måste fortfarande vara ett vanligt hopp (P0: inget kräver håll)
//   super × N   håll 0,4–1,6 s, tryck på grodan mitt i luften (repet), räkna tiderna per fas
//   kor-kort    kort tryck på grodkören: kören hejar, grodan flyttas INTE
//   kor-hall    håll 2,7 s på grodkören (gränsen är 2,5 s) mitt i ett superhopp: grodan tillbaka på startbladet
//   exit        gå ut mitt i ett superhopp med repet ute, in igen, spela 3 s, ut — 0 fel krävs
//
// --bilder: skärmdumpar av varje fas i .test-shots/_super-*.png (titta på dem!).
// Kräver dev-servern (npm run dev) — `window.__barnspel` finns bara i DEV.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const HOPP = Number(val('--hopp', 3))
const BILDER = argv.includes('--bilder')
const ID = 'grodan-slurp'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 240)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 240)) })

async function starta() {
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
}
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await starta()
await page.waitForTimeout(900)

async function sida(x, y) {
  return page.evaluate(([x, y]) => {
    const g = window.__barnspel.game
    if (!g?._scen) return null
    const p = g._scen.toGlobal({ x, y })
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const skala = r.width / (c.width / (window.devicePixelRatio || 1))
    return { x: r.left + p.x * skala, y: r.top + p.y * skala }
  }, [x, y])
}

const lage = () => page.evaluate(() => {
  const g = window.__barnspel.game
  if (!g?._groda) return null
  const gr = g._groda
  const k = gr._com()
  return {
    fas: gr.superFas, stj: gr.stjarna, landat: gr.landat, vil: gr.vilSteg, sover: gr.sover, lage: gr.lage,
    x: gr.pos.x, y: gr.pos.y, kx: k.x, ky: k.y, riktning: gr.riktning, laddning: gr.laddning,
    sup: g._super?.fas ?? null, uppe: g._super?.uppe ?? null, rep: g._rep?.lage ?? null, repIns: g._rep?.antalInsekter ?? 0,
    atna: g._atna, ladd: !!g._ladd, hem: !!g._hem, firar: g._firar, start: g._dammen.startPunkt, kor: g._dammen.grodungar.plats,
    tunga: g._tunga.lage, trasig: gr.trasig(), volt: gr._voltVinkel || 0,
    insekter: g._svarm.lista.map((i) => ({ x: i.x, y: i.y })),
  }
})

let bildNr = 0
// Bilderna tas i hopp nr 2 (full sats — längst tid i luften).
const bildHopp = (n) => n === 2
async function bild(namn) {
  if (!BILDER) return
  await page.screenshot({ path: `.test-shots/_super-${String(++bildNr).padStart(2, '0')}-${namn}.png` })
}

async function vantaSitt(maxMs = 9000) {
  const t = Date.now()
  while (Date.now() - t < maxMs) {
    const L = await lage()
    if (L && !L.firar && !L.sup && (L.lage === 'sitt' || L.lage === 'vatten') && L.tunga === 'av') return L
    await page.waitForTimeout(60)
  }
  return lage()
}

const ut = { tapp: null, super: [], korKort: null, korHall: null, exit: null }

// ── tapp: ett kort tryck på grodan = vanligt hopp ──────────────────────────────────────────
{
  const L = await vantaSitt()
  const p = await sida(L.x, L.y)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(90)
  await page.mouse.up()
  let minY = L.ky
  let sup = false
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(50)
    const M = await lage()
    minY = Math.min(minY, M.ky)
    if (M.sup || M.fas === 'volt' || M.fas === 'stjarna') sup = true
  }
  ut.tapp = { hojd: Math.round(L.ky - minY), blevSuper: sup }
}

// ── super × N ──────────────────────────────────────────────────────────────────────────────
const HALL = [0.45, 1.0, 1.7, 1.2, 0.7]
for (let n = 0; n < HOPP; n++) {
  const L = await vantaSitt()
  if (!L) break
  const hall = HALL[n % HALL.length]
  const p = await sida(L.x, L.y)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  const tSats = Date.now()
  const r = { hallS: hall, maxLaddning: 0, fas: {}, repTryck: false, repIns: 0, atnaFore: L.atna, hojd: 0, x0: Math.round(L.kx) }
  let bildSats = false
  while ((Date.now() - tSats) / 1000 < hall) {
    const M = await lage()
    r.maxLaddning = Math.max(r.maxLaddning, M.laddning)
    if (!bildSats && (Date.now() - tSats) / 1000 > hall * 0.8 && n === 2) {
      bildSats = true
      await bild('sats')
    }
    await page.waitForTimeout(40)
  }
  await page.mouse.up()
  const t0 = Date.now()
  let minY = L.ky
  let sett = { volt: false, stj: false, land: false, vaknar: false, uppe: false }
  let klar = false
  while (Date.now() - t0 < 16000) {
    const M = await lage()
    const t = Math.round((Date.now() - t0) / 100) / 10
    minY = Math.min(minY, M.ky)
    if (M.fas === 'volt' && !sett.volt) {
      sett.volt = true
      r.fas.volt = t
      if (bildHopp(n)) {
        await page.waitForTimeout(120)
        await bild('volt')
      }
    }
    if (M.stj && !sett.stj) {
      sett.stj = true
      r.fas.stjarna = t
      if (bildHopp(n)) await bild('stjarna')
      // Tryck PÅ grodan mitt i luften → repet.
      if (!M.landat) {
        const q = await sida(M.x, M.y)
        await page.mouse.click(q.x, q.y)
        r.repTryck = true
        await page.waitForTimeout(260)
        if (bildHopp(n)) await bild('rep')
        // Och ett snärt mot närmaste insekt.
        const ins = M.insekter[0]
        if (ins) {
          const s = await sida(ins.x, ins.y)
          await page.mouse.click(s.x, s.y)
        }
      }
    }
    if (M.landat && !sett.land) {
      sett.land = true
      r.fas.landat = t
      r.landX = Math.round(M.kx)
      if (bildHopp(n)) {
        await page.waitForTimeout(250)
        await bild('tumlar')
      }
    }
    if (M.sover && !sett.sover) {
      sett.sover = true
      r.fas.sover = t
      if (bildHopp(n)) await bild('sover')
    }
    if (M.sup === 'vaknar' && !sett.vaknar) {
      sett.vaknar = true
      r.fas.vaknarTill = t
    }
    if (M.uppe && !sett.uppe) {
      sett.uppe = true
      r.fas.uppe = t
      r.repIns = M.repIns
      if (bildHopp(n)) {
        await page.waitForTimeout(90)
        await bild('slurp')
      }
    }
    if (sett.volt && !M.sup && !M.fas) {
      r.fas.klar = t
      klar = true
      break
    }
    await page.waitForTimeout(40)
  }
  const E = await lage()
  r.hojd = Math.round(L.ky - minY)
  r.klar = klar
  r.atna = E.atna - r.atnaFore
  r.efter = { lage: E.lage, stj: E.stj, trasig: E.trasig }
  ut.super.push(r)
  if (bildHopp(n)) {
    await page.waitForTimeout(600)
    await bild('efter')
  }
}

// L4: kören är ofta utanför bild — hem-knappen är HEM-BLADET i HUD:en (skärmrum). `hemPunkt`
// ger sidkoordinaten för det (eller körens, i en version utan HUD).
const hemPunkt = (L) => page.evaluate(([kx, ky]) => {
  const g = window.__barnspel.game
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  const skala = r.width / (c.width / (window.devicePixelRatio || 1))
  const p = g._hud ? g._hud.toGlobal({ x: 640, y: 64 }) : g._scen.toGlobal({ x: kx, y: ky })
  return { x: r.left + p.x * skala, y: r.top + p.y * skala }
}, [L.kor.x, L.kor.y - 30])

// ── hem-knappen: kort tryck (grodan stannar) ─────────────────────────────────────────────────
{
  const L = await vantaSitt()
  const k = await hemPunkt(L)
  await page.mouse.move(k.x, k.y)
  await page.mouse.down()
  await page.waitForTimeout(120)
  await page.mouse.up()
  await page.waitForTimeout(300)
  const M = await lage()
  ut.korKort = { flytt: Math.round(Math.hypot(M.kx - L.kx, M.ky - L.ky)), hem: M.hem, tunga: M.tunga }
}

// ── grodkören: håll 2,7 s mitt i ett superhopp → hem ──────────────────────────────────────
{
  const L = await vantaSitt()
  let p = await sida(L.x, L.y)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
  await page.waitForTimeout(500)
  const I = await lage()
  const k = await hemPunkt(I)
  await page.mouse.move(k.x, k.y)
  await page.mouse.down()
  await page.waitForTimeout(1300)
  await bild('kor-hall')
  await page.waitForTimeout(1400)
  await page.mouse.up()
  await page.waitForTimeout(200)
  const M = await lage()
  ut.korHall = { varISuper: !!I.sup, efterSuper: M.sup, stj: M.stj, avstandTillStart: Math.round(Math.hypot(M.x - M.start.x, M.y - M.start.y)), hem: M.hem }
  await bild('hemma')
}

// ── exit mitt i ett superhopp med repet ute, in igen ──────────────────────────────────────
{
  const L = await vantaSitt()
  const p = await sida(L.x, L.y)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  let M = null
  for (let i = 0; i < 40; i++) {
    M = await lage()
    if (M.stj) break
    await page.waitForTimeout(40)
  }
  const q = await sida(M.x, M.y)
  await page.mouse.click(q.x, q.y)
  await page.waitForTimeout(150)
  const repUte = (await lage()).rep
  const felFore = fel.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  await starta()
  await page.waitForTimeout(600)
  const N = await vantaSitt()
  const r = await sida(N.x, N.y)
  await page.mouse.move(r.x, r.y)
  await page.mouse.down()
  await page.waitForTimeout(600)
  await page.mouse.up()
  await page.waitForTimeout(2400)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  ut.exit = { repUteVidExit: repUte, nyaFel: fel.length - felFore }
}

console.log(JSON.stringify(ut, null, 1))
console.log('konsolfel:', fel.length)
for (const f of fel.slice(0, 12)) console.log('  ', f)
await b.close()
