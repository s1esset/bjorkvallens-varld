// FYSIKKOSTNAD (FYSIKPLAN M4): vad av bildrutans arbete är FYSIK, och vad är resten?
//
//   node scripts/_fysikkostnad.mjs spindelhjalten kugghjulen spindelnatet natskott-pa-stan
//   node scripts/_fysikkostnad.mjs <id…> [--cpu 4] [--varv 3] [--sek 2.5] [--url http://localhost:5174]
//   node scripts/_fysikkostnad.mjs spindelhjalten --utan-drag      # bara läget "stilla"
//   node scripts/_fysikkostnad.mjs <id> --egen _metod1,_metod2      # fler egna fysikmetoder på spelet
//
// Mall: `_popcornomrit.mjs`. Stämplarna är två ticker-lyssnare — HÖGSTA prioritet (före spelet)
// och LÄGSTA (efter Pixis render) — så en bildrutas TOTALA arbete (uppdatering + render) mäts, inte
// bara spelets egen tick (Pixi triangulerar en Graphics först när den RENDERAS). gsap-tweens går på
// sin egen rAF-klocka och ingår alltså inte.
//
// FYSIK = tiden INUTI `PhysicsWorld.update`, `Rep.steg` (verlet-repet) och spelets egna fysik-
// metoder (kugghjulen: `_stegMaskin`/`_stegRem`; fler via --egen). Haken sitter på PROTOTYPERNA, och
// modulerna hämtas via samma URL som spelet laddade (`performance.getEntriesByType('resource')`) —
// en nyimporterad kopia är en annan modulinstans. Anrop inuti varandra räknas EXKLUSIVT (`_stegRem`
// anropar `Rep.steg`: repet räknas som rep, resten av metoden som egen) och bildrutans fysik
// summeras bara på yttersta nivån, så inget räknas två gånger.
//
// KONTROLLARMAR FÖRST (CLAUDE.md: en mätning som inte kan skilja två KÄNDA lägen åt mäter ingenting):
//   K1  barlast 4 ms i början av bildrutan (utanför fysiken) → total ≈ +4, resten ≈ +4, fysik ≈ 0
//   K2  barlast 4 ms INUTI det första fysikanropet per bildruta → fysik ≈ +4, total ≈ +4, resten ≈ 0
// Deltan är MEDELVÄRDEN (timern är kvantiserad). Rör sig inte mätaren ~4 ms i båda är spelets rad "omätt" — ett spel som aldrig anropar något
// hakat fysikanrop får "fysikandel omätbar" (bara total + resten rapporteras, och resten = allt).
// Bildruteintervallet (rAF) rapporteras aldrig: det klipps av vsync och kan inte skilja lägen åt.
//
// ⚠️ Bara mot en DEV-server (läser `window.__barnspel`). Standard är :5174 — dev-servern UTAN HMR
// (`npx vite --config scripts/_vite-nohmr.mjs`) — så att en agent som sparar en `src/`-fil inte
// laddar om sidan mitt i en mätning. Dev-servern har gamelog PÅ (en provtagning var 30:e fysikruta)
// — samma i alla armar. Kör aldrig bredvid en annan webbläsarsond.
import { chromium } from 'playwright'

const arg = (k, d) => {
  const i = process.argv.indexOf(k)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d
}
const BAS = arg('--url', 'http://localhost:5174')
const CPU = Number(arg('--cpu', 4))
const VARV = Number(arg('--varv', 3))
const SEK = Number(arg('--sek', 2.5))
const EGEN = arg('--egen', '').split(',').filter(Boolean)
const UTAN_DRAG = process.argv.includes('--utan-drag')
const IDS = process.argv.slice(2).filter((a, i, v) => !a.startsWith('--') && !(i > 0 && v[i - 1].startsWith('--')))
if (!IDS.length) {
  console.error('ange minst ett spel-id, t.ex. spindelhjalten')
  process.exit(2)
}

// Spelens egna fysikmetoder (egna integratorer som varken är PhysicsWorld eller Rep).
const EGNA = {
  kugghjulen: ['_stegMaskin', '_stegRem'],
}
// Spel där ett pågående DRAG är en egen frågeställning: var greppet sitter + hur fingret rör sig.
const DRAG = {
  spindelhjalten: { grepp: `gl(g._hero)`, dx: -90, dy: 40, flagga: `g._launcher._aiming` },
}

const medel = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN)
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN }
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : NaN }
const f = (n) => (Number.isFinite(n) ? n.toFixed(2) : '  - ')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const tabell = []
const kontroller = []
const allaFel = []
let fel = 0

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true })
  let errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))
  const cdp = await page.context().newCDPSession(page)
  const vänta = (ms) => page.waitForTimeout(ms)

  const G = (id, src) =>
    page.evaluate(async ([gid, s]) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const app = window.__barnspel.app
      const gl = (o, x = 0, y = 0) => { const p = o.toGlobal({ x, y }); return { x: p.x, y: p.y } }
      // eslint-disable-next-line no-eval
      return eval(s)
    }, [id, src])

  const skarm = (p) => page.evaluate(([x, y]) => {
    const app = window.__barnspel.app
    const c = app.canvas.getBoundingClientRect()
    const k = c.width / app.screen.width
    return { x: Math.round(c.left + x * k), y: Math.round(c.top + y * k) }
  }, [p.x, p.y])

  // Öppna spelet på en färsk sida och haka in mätaren.
  const oppna = async (id) => {
    errors = []
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await page.goto(BAS, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
    await vänta(2500)
    const egna = [...(EGNA[id] || []), ...EGEN]
    const info = await page.evaluate(async ({ egna, id }) => {
      const url = (frag) => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes(frag))
      const laddaMod = async (frag) => {
        const u = url(frag)
        return u ? import(u) : null
      }
      const phys = await laddaMod('/src/lib/physics.js')
      const rep = await laddaMod('/src/lib/rep.js')
      const g = (await import('/src/games/registry.js')).getGame(id)
      const M = (window.__fk = {
        start: 0, acc: 0, pw: 0, rep: 0, egen: 0, anrop: 0, repN: 0, pwN: 0, stack: [],
        barFore: 0, barFys: 0, bränt: false, ms: [], pa: false,
      })
      const bränn = (ms) => { const s = performance.now(); while (performance.now() - s < ms) { /* bränn */ } }
      M.bränn = bränn
      const haka = (obj, namn, nyckel) => {
        const o = obj[namn]
        if (typeof o !== 'function') return false
        obj[namn] = function (...a) {
          const topp = M.stack.length === 0
          const fr = { barn: 0 }
          M.stack.push(fr)
          const t0 = performance.now()
          try {
            if (topp && M.barFys && !M.bränt) { M.bränt = true; bränn(M.barFys) }
            return o.apply(this, a)
          } finally {
            const d = performance.now() - t0
            M.stack.pop()
            if (M.stack.length) M.stack[M.stack.length - 1].barn += d
            M[nyckel] += d - fr.barn
            if (topp) M.acc += d
            M.anrop++
            if (nyckel === 'rep') M.repN++
            if (nyckel === 'pw') M.pwN++
          }
        }
        return true
      }
      const hakat = []
      if (phys?.PhysicsWorld && haka(phys.PhysicsWorld.prototype, 'update', 'pw')) hakat.push('PhysicsWorld.update')
      if (rep?.Rep && haka(rep.Rep.prototype, 'steg', 'rep')) hakat.push('Rep.steg')
      for (const n of egna) if (g && haka(g, n, 'egen')) hakat.push('spelet.' + n)
      M.fore = () => { M.start = performance.now(); M.acc = 0; M.pw = 0; M.rep = 0; M.egen = 0; M.anrop = 0; M.repN = 0; M.pwN = 0; M.bränt = false; if (M.barFore) bränn(M.barFore) }
      M.efter = () => {
        if (M.pa) M.ms.push({ t: performance.now() - M.start, f: M.acc, pw: M.pw, rep: M.rep, egen: M.egen, n: M.anrop, rN: M.repN, pN: M.pwN })
      }
      const t = window.__barnspel.ctx.ticker
      t.add(M.fore, null, 1000)
      t.add(M.efter, null, -1000)
      return { hakat, tickerOk: !!t }
    }, { egna, id })
    return info
  }

  // Ett mätfönster: nollar, sätter barlast, samlar bildrutor `sek` sekunder.
  const fonster = async (barFore, barFys, sek) => {
    await page.evaluate(({ barFore, barFys }) => { const M = window.__fk; M.barFore = barFore; M.barFys = barFys; M.ms = []; M.pa = true }, { barFore, barFys })
    await vänta(sek * 1000)
    return page.evaluate(() => { const M = window.__fk; M.pa = false; M.barFore = 0; M.barFys = 0; const r = M.ms; M.ms = []; return r })
  }
  const summera = (rutor) => ({
    n: rutor.length,
    // performance.now() är kvantiserad till ~0,1 ms: en median av en liten kostnad blir 0,00 men
    // MEDELVÄRDET är rättvisande (kvantiseringen är jittrad) — båda skrivs ut, medel för andelar.
    tot: { med: med(rutor.map((r) => r.t)), p95: p95(rutor.map((r) => r.t)), medel: medel(rutor.map((r) => r.t)) },
    fys: { med: med(rutor.map((r) => r.f)), p95: p95(rutor.map((r) => r.f)), medel: medel(rutor.map((r) => r.f)) },
    rest: { med: med(rutor.map((r) => r.t - r.f)), p95: p95(rutor.map((r) => r.t - r.f)), medel: medel(rutor.map((r) => r.t - r.f)) },
    pw: medel(rutor.map((r) => r.pw)),
    rep: medel(rutor.map((r) => r.rep)),
    egen: medel(rutor.map((r) => r.egen)),
    anrop: medel(rutor.map((r) => r.n)),
    repN: medel(rutor.map((r) => r.rN)),
    pwN: medel(rutor.map((r) => r.pN)),
  })
  // VARV fönster i rad; rutorna slås ihop (median/p95 över alla), medianen av varje varv skrivs ut för spridning.
  const mat = async (barFore, barFys, drag) => {
    const alla = []
    const varvMed = []
    for (let v = 0; v < VARV; v++) {
      const r = await fonster(barFore, barFys, SEK)
      alla.push(...r)
      varvMed.push(med(r.map((x) => x.t)))
      if (drag) await vänta(30)
    }
    const s = summera(alla)
    s.varvMin = Math.min(...varvMed)
    s.varvMax = Math.max(...varvMed)
    return s
  }

  // Ett pågående drag: fingret hålls nere och rör sig i en liten cirkel (≈ 70 Hz) tills `stopp()`.
  const startaDrag = async (id) => {
    const d = DRAG[id]
    const g0 = await G(id, d.grepp)
    const a = await skarm(g0)
    const mitt = { x: a.x + d.dx, y: a.y + d.dy }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 7 }] })
    await vänta(80)
    let kor = true
    let rörelser = 0
    const slinga = (async () => {
      let ang = 0
      while (kor) {
        ang += 0.35
        const x = Math.round(mitt.x + Math.cos(ang) * 30)
        const y = Math.round(mitt.y + Math.sin(ang) * 22)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 7 }] })
        rörelser++
        await vänta(12)
      }
    })()
    return {
      stopp: async () => { kor = false; await slinga; await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }) },
      rörelser: () => rörelser,
    }
  }

  for (const id of IDS) {
    const rad = { id }
    try {
      const info = await oppna(id)
      rad.hakat = info.hakat
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
      await vänta(600)

      // ---- kontrollarmar ----------------------------------------------------------------
      const k0 = await mat(0, 0)
      const k1 = await mat(4, 0)
      const k2 = await mat(0, 4)
      const dTot1 = k1.tot.medel - k0.tot.medel
      const dRest1 = k1.rest.medel - k0.rest.medel
      const dFys1 = k1.fys.medel - k0.fys.medel
      const dTot2 = k2.tot.medel - k0.tot.medel
      const dFys2 = k2.fys.medel - k0.fys.medel
      const dRest2 = k2.rest.medel - k0.rest.medel
      const nara = (x) => x > 2.8 && x < 5.4
      const harFysik = info.hakat.length > 0 && k0.anrop > 0
      rad.k = {
        k1: { dTot: dTot1, dRest: dRest1, dFys: dFys1, ok: nara(dTot1) && nara(dRest1) && Math.abs(dFys1) < 1.2 },
        k2: { dTot: dTot2, dFys: dFys2, dRest: dRest2, ok: harFysik && nara(dTot2) && nara(dFys2) && Math.abs(dRest2) < 1.2 },
      }
      rad.stilla = k0
      rad.hakatTom = !harFysik

      // ---- mätarm: drag ---------------------------------------------------------------
      if (DRAG[id] && !UTAN_DRAG) {
        const dr = await startaDrag(id)
        await vänta(500)
        rad.dragAktivt = await G(id, DRAG[id].flagga)
        rad.drag = await mat(0, 0, true)
        rad.dragRorelser = dr.rörelser()
        await dr.stopp()
      }
      rad.fel = errors.length
      allaFel.push(...errors.slice(0, 3).map((e) => `${id}: ${e}`))
      if (!rad.k.k1.ok) fel++
      tabell.push(rad)
      console.log(`  ${id} klart (${info.hakat.join(', ') || 'inga fysikanrop hakade'})`)
    } catch (e) {
      console.log(`  ${id} FEL: ${String(e.message || e).slice(0, 200)}`)
      rad.undantag = String(e.message || e).slice(0, 200)
      tabell.push(rad)
      fel++
    }
  }

  // ---- utskrift ------------------------------------------------------------------------------
  console.log(`\n  CPU-strypning ×${CPU}, ${VARV} varv × ${SEK} s per mätning. Alla tal i ms per bildruta (total = ticker-arbete + render).\n`)
  console.log('KONTROLLARMAR (barlast 4 ms; väntat ≈ +4 där den ligger, ≈ 0 där den inte ligger)\n')
  console.log('| spel | K1 barlast före: Δtotal · Δrest · Δfysik | K2 barlast i fysiken: Δtotal · Δfysik · Δrest | hakade fysikanrop |')
  console.log('|---|---|---|---|')
  for (const r of tabell) {
    if (!r.k) { console.log(`| ${r.id} | fel | fel | ${r.undantag || ''} |`); continue }
    const k1 = r.k.k1, k2 = r.k.k2
    console.log(`| ${r.id} | ${f(k1.dTot)} · ${f(k1.dRest)} · ${f(k1.dFys)} ${k1.ok ? '✓' : '✗ MÄTAREN RÖR SIG INTE'} | ${r.hakatTom ? 'inga fysikanrop → fysikandel OMÄTBAR' : `${f(k2.dTot)} · ${f(k2.dFys)} · ${f(k2.dRest)} ${k2.ok ? '✓' : '✗'}`} | ${(r.hakat || []).join(', ') || '-'} |`)
  }
  console.log('\nRESULTAT (median / p95 / MEDEL; fysik = PhysicsWorld.update + Rep.steg + spelets egna fysikmetoder, exklusivt. Medelvärdet bär andelen: timern är kvantiserad till ~0,1 ms)\n')
  console.log('| spel · läge | rutor | total med / p95 / medel | fysik med / p95 / medel | resten med / p95 / medel | därav PhysicsWorld · Rep · egen (medel) | anrop/ruta: totalt · PhysicsWorld.update · Rep.steg | varvens totalmedian min–max |')
  console.log('|---|---|---|---|---|---|---|---|')
  for (const r of tabell) {
    if (!r.stilla) continue
    const rad = (lage, s, extra = '') => {
      const omatb = r.hakatTom ? ' (fysikandel omätbar)' : ''
      console.log(`| ${r.id} · ${lage}${extra}${omatb} | ${s.n} | ${f(s.tot.med)} / ${f(s.tot.p95)} / ${f(s.tot.medel)} | ${f(s.fys.med)} / ${f(s.fys.p95)} / ${f(s.fys.medel)} | ${f(s.rest.med)} / ${f(s.rest.p95)} / ${f(s.rest.medel)} | ${f(s.pw)} · ${f(s.rep)} · ${f(s.egen)} | ${f(s.anrop)} · ${f(s.pwN)} · ${f(s.repN)} | ${f(s.varvMin)}–${f(s.varvMax)} |`)
    }
    rad('stilla', r.stilla)
    if (r.drag) rad('sikte-drag', r.drag, ` (aktivt=${r.dragAktivt}, ${r.dragRorelser} pekrörelser)`)
  }
  console.log(`\n  konsolfel: ${allaFel.length}`)
  for (const e of allaFel.slice(0, 6)) console.log('    ' + e)
  if (fel) console.log(`\n  ✗ ${fel} spel med en mätare som inte rörde sig / fel — raderna är OMÄTTA`)
  console.log()
} finally {
  await browser.close()
}
process.exit(fel ? 1 : 0)
