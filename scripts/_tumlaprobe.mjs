// _tumlaprobe.mjs — hur ofta TUMLAR grodan (smäll → slak ragdoll) på vanliga hopp?
//
//   node scripts/_tumlaprobe.mjs [--biom damm,skog,oken,kok,vardagsrum] [--hopp 14] [--arm tapp,sats,max]
//
// Ägaren 2026-09-25: "Grodan slår och tumlar för ofta vid vanliga hopp … Alla hopp utom maxfart
// ska grodan hoppa och landa som vanligt om den inte slår sig på nåt." Harnessen trycker aldrig på
// grodan, så det här är enda mätningen. Sonden trycker på grodans FAKTISKA läge med riktiga
// muspekningar och hakar på spelets `_small` (varje anslag som når smäll-bedömningen) — en smäll
// räknas som ett TUMMEL när grodans muskelkraft faller av den (slappna).
//
// Armar (per biom, varannan):
//   tapp  ett kort tryck på grodan = vanligt hopp (40 % av gångerna vänds grodan först)
//   sats  håll 0,45–1,2 s med fingret draget 150 px åt ett slumpat håll (30°–150°) — under full sats
//   max   håll 1,9 s (full sats) åt ett slumpat håll — maxfarten, där tumlet ÄR meningen
// Per hopp: tumlade? · vilken del · mot vad · fart · landade grodan på benen (lage 'sitt') inom 4 s?
// Kör mot HEAD först (kontrollarmen) — på HEAD är `sats` ett superhopp som alltid tumlar.
// Kräver dev-servern (npm run dev) — `window.__barnspel` finns bara i DEV.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const BIOMER = val('--biom', 'damm,skog,oken,kok,vardagsrum').split(',')
const HOPP = Number(val('--hopp', 14))
const ARMAR = val('--arm', 'tapp,sats').split(',')
const ID = 'grodan-slurp'
const DEBUG = argv.includes('--debug')

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 240)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 240)) })

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

async function starta(biom) {
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
  await page.evaluate((biom) => {
    const g = window.__barnspel.game
    g._tvingaBiom = biom
    g._rivVarld()
    g._byggVarld(g._ctx)
    // Haka på smäll-bedömningen: varje anrop loggas, och om muskelkraften föll blev det ett tummel.
    if (!g.__tumlaHakad) {
      g.__tumlaHakad = true
      const orig = g._small
      g._small = function (ctx, h) {
        const gr = this._groda
        const fore = gr?.kraft ?? 1
        const r = orig.call(this, ctx, h)
        const efter = this._groda?.kraft ?? 1
        if (gr) {
          const aG = gr.ar(h.a)
          const del = (aG ? h.a : h.b).plugin?.grodDel || '?'
          const annan = aG ? h.b : h.a
          window.__tumla = window.__tumla || []
          window.__tumla.push({ t: performance.now(), del, mot: annan.label, fart: Math.round(h.speed * 10) / 10, tumlade: efter < fore - 0.3 && efter < 0.45, super: !!this._super })
        }
        return r
      }
    }
    // Hindren (kotte, katt …) stängs av: det här mäter HOPPEN, inte motgången.
    g._atna = 0
    g._nastaHinder = 1e9
  }, biom)
  await page.waitForTimeout(700)
}

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
  const kr = gr.b.kropp
  return { bal: Math.round((gr.riktning === 1 ? kr.angle : Math.PI - kr.angle) * 100) / 100, lage: gr.lage, kraft: gr.kraft, fas: gr.superFas, sup: g._super?.fas ?? null, x: gr.pos.x, y: gr.pos.y, kx: k.x, ky: k.y, tunga: g._tunga.lage, firar: g._firar, paMark: gr.paMark, iV: gr.iVatten }
})

async function vantaLugn(maxMs = 9000) {
  const t = Date.now()
  while (Date.now() - t < maxMs) {
    const L = await lage()
    if (L && !L.firar && !L.sup && !L.fas && (L.lage === 'sitt' || L.lage === 'vatten') && L.tunga === 'av') return L
    await page.waitForTimeout(60)
  }
  return null
}

const resultat = {}
for (const biom of BIOMER) {
  await starta(biom)
  const R = (resultat[biom] = {})
  for (const arm of ARMAR) R[arm] = { hopp: 0, tummel: 0, smallar: 0, benLand: 0, orsak: {} }
  for (let n = 0; n < HOPP * ARMAR.length; n++) {
    const arm = ARMAR[n % ARMAR.length]
    const L = await vantaLugn()
    if (!L) {
      // Fastnat (sällsynt): tillbaka till start.
      await page.evaluate(() => { const g = window.__barnspel.game; const sp = g._dammen.startPunkt; g._groda.teleportera(sp.x, sp.y); g._startBladFast?.() })
      await page.waitForTimeout(500)
      continue
    }
    if (Math.random() < 0.4) await page.evaluate(() => window.__barnspel.game._groda.vand())
    await page.waitForTimeout(80)
    const L2 = await lage()
    const sa0 = await page.evaluate(() => { window.__tumla = []; return window.__barnspel.game._superAntal || 0 })
    const p = await sida(L2.x, L2.y)
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    const efterNed = await page.evaluate(() => { const g = window.__barnspel.game; return { ladd: !!g._ladd, hem: !!g._hem, tunga: g._tunga.lage } })
    if (arm === 'tapp') {
      await page.waitForTimeout(90)
    } else {
      const a = (30 + Math.random() * 120) * (Math.PI / 180)
      const q = await sida(L2.kx + Math.cos(a) * 150, L2.ky - Math.sin(a) * 150)
      await page.waitForTimeout(60)
      await page.mouse.move(q.x, q.y, { steps: 4 })
      const hallMs = arm === 'max' ? 1900 : 450 + Math.random() * 750
      const tH = Date.now()
      const prov = []
      while (Date.now() - tH < hallMs) {
        prov.push(await page.evaluate(() => { const g = window.__barnspel.game; const gr = g._groda; return `${gr._mark}/${gr.underlag?.label}/${Math.round(gr.pos.y)}/${g._ladd ? 'L' : '-'}` }))
        await page.waitForTimeout(40)
      }
      if (DEBUG) globalThis.__prov = prov
    }
    const foreUpp = await page.evaluate(() => { const g = window.__barnspel.game; return { ladd: !!g._ladd, siktat: !!g._ladd?.siktat, t: g._ladd?.t } })
    await page.mouse.up()
    // Följ hoppet i 4 s: landade grodan på benen (sitt) utan att bli slak?
    const t0 = Date.now()
    const faser = new Set()
    let slak = false
    let satt = false
    let lamnade = false
    let sista = null
    while (Date.now() - t0 < 4000) {
      const M = await lage()
      if (!M) break
      sista = M
      if (!M.paMark && !M.iV) lamnade = true
      if (M.fas) faser.add(M.fas)
      if (M.lage === 'slak' || M.lage === 'super') slak = slak || M.lage === 'slak' || M.fas === 'stjarna'
      if (lamnade && M.lage === 'sitt' && !slak && !M.fas) { satt = true; break }
      if (lamnade && M.lage === 'vatten' && !M.fas) { satt = true; break }
      await page.waitForTimeout(50)
    }
    // Ett superhopp (HEAD:s sats-arm, eller max) går klart innan nästa hopp.
    await vantaLugn(12000)
    const S = await page.evaluate(() => window.__tumla || [])
    const r = R[arm]
    const sa1 = await page.evaluate(() => window.__barnspel.game._superAntal || 0)
    if (DEBUG && !satt) console.log((globalThis.__prov || []).join(' '))
    if (DEBUG && !satt) console.log(JSON.stringify({ efterNed, foreUpp, p, L2: { x: Math.round(L2.x), y: Math.round(L2.y) } }))
    if (DEBUG && !satt) console.log(biom, arm, 'super', sa1 - sa0, 'faser', [...faser].join('/'), 'slak', slak, 'lamnade', lamnade, 'sist', sista && { lage: sista.lage, kraft: Math.round(sista.kraft * 100) / 100, paMark: sista.paMark, iV: sista.iV, y: Math.round(sista.y), tunga: sista.tunga, bal: sista.bal })
    r.super = (r.super || 0) + (sa1 - sa0)
    r.hopp++
    r.smallar += S.length
    const t = S.filter((s) => s.tumlade)
    if (t.length || slak) r.tummel++
    if (satt) r.benLand++
    for (const s of t) {
      const k = `${s.del}→${s.mot}`
      r.orsak[k] = (r.orsak[k] || 0) + 1
    }
  }
  const F = await page.evaluate(() => 0)
  void F
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
}

for (const [biom, R] of Object.entries(resultat)) {
  for (const [arm, r] of Object.entries(R)) {
    const orsak = Object.entries(r.orsak).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(' ')
    console.log(`${biom.padEnd(11)} ${arm.padEnd(5)} hopp ${String(r.hopp).padStart(2)} · super ${r.super || 0} · tummel ${String(r.tummel).padStart(2)} · på benen ${String(r.benLand).padStart(2)} · smällbedömningar ${r.smallar}${orsak ? ' · ' + orsak : ''}`)
  }
}
const tot = (arm) => Object.values(resultat).reduce((a, R) => ({ h: a.h + (R[arm]?.hopp || 0), t: a.t + (R[arm]?.tummel || 0), b: a.b + (R[arm]?.benLand || 0) }), { h: 0, t: 0, b: 0 })
for (const arm of ARMAR) {
  const s = tot(arm)
  console.log(`TOTALT ${arm}: ${s.t}/${s.h} tumlade · ${s.b}/${s.h} landade på benen`)
}
console.log('konsolfel:', fel.length)
for (const f of fel.slice(0, 10)) console.log('  ', f)
await b.close()
