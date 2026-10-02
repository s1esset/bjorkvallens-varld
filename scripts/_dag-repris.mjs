// Dagkörning (kluster B3) — `kulbana`: slow-motion-repris av den lyckade rullningen (FYSIKPLAN F8, ägarbeslut Ä8).
//   node scripts/_dag-repris.mjs
//
// Kräver dev-servern på :5173 (eller :5174 utan HMR — sätt URL=http://localhost:5174). Ensam körning:
// två webbläsarsonder samtidigt förfalskar varandras svar. Redigera inte src/ medan den kör.
//
// SPELAR med riktiga muspekningar (SLÄPP, tryck i fältet, hem). En lyckad rullning kräver att kulan faktiskt
// hamnar i hinken, och att bygga en ramp-layout blint är opålitligt — så sonden trycker SLÄPP på riktigt (kulan
// blir dynamisk, `_falling`, inspelningen startar) och KASTAR sedan kulan: en väl vald startposition högt över
// hinken + en vågrät fart som en banförhandsvisning (`predictTrajectory`) räknar ut. Därefter är det den riktiga
// fysiken, det riktiga målet (`_inBucket` → `_win(ctx, true)` → `_startaRepris`) och den riktiga reprisen.
// Kastet börjar ≤ 10 steg efter SLÄPP och rullningen efter det är ≥ 60 steg, så reprisens fönster (de sista 60)
// aldrig innehåller teleporten.
//
// HAKAR (sondens egna, spelets kod är orörd): `phys.beforeStep` skriver en OBEROENDE referensbana (en vanlig array,
// inte inspelarens buffert); `_startaRepris`/`_firande` lindas för att läsa tid + läge; en ticker på LÄGSTA
// prioritet (efter spelets) läser kulans RITADE läge varje bildruta medan `_repris` lever.
//
// MÄTNINGAR
//   KONTROLLARMAR (först — de ska ge det KÄNDA svaret):
//     K1  bufferten (`g._rec`) == referensbanan: 0,0 px över alla steg i fönstret (oberoende hak).
//     K2  samma jämförelse mot referensen FÖRSKJUTEN 3 steg ger > 0,5 px — mätaren kan alltså se ett fel.
//     K3  propellerns RITADE vinkel under reprisen ligger närmare det INSPELADE än den LEVANDE fysikens (som snurrat
//         vidare) — annars visar reprisen bladen på fel ställe (mäter att propellern verkligen styrs av uppspelningen).
//   M1  reprisens ritade läge avviker ≤ 1e-6 px från den inspelade banan (polylinjen mellan stegen); på helsteg 0,0.
//   M2  reprisen är KORT: 2,0–3,3 s från mål till firande (60 steg i 0,4× = 2,5 s), och firandet följer av sig självt.
//   M3  spåret finns medan reprisen går (+1 barn i kulans förälder, ett Graphics bakom kulan) och är riven efteråt.
//   M4  OTÅLIGT: tryck i fältet 0,7 s in → reprisen slut inom 300 ms, firandet börjar, nästa bana laddas < 4 s;
//       tryck på SLÄPP under reprisen gör detsamma; ett andra SLÄPP-tryck under firandet bara wigglar (inga fel).
//   M5  ANDRA runda: nästa bana spelas, reprisen går igen från noll (inga rester: spår 1, fönster rätt).
//   M6  EXIT mitt i en repris (hem-tryck): 0 konsolfel, spåret rivet, `_repris` null, 0 tweens kvar (spelets gsap)
//       på rot + alla barn, ticker-samplaren ser ingen repris mer.
//
// Vad som ska synas i skärmdumparna (`.test-shots/_dag-repris-*.png`): `-mitt`: kulan hög upp i slow-motion med ett
// mjukt vitt spår som tjocknar mot kulan; bladen (bana 4) står där de var när kulan passerade.
import { chromium } from 'playwright'

const ID = 'kulbana'
const URL = process.env.URL || 'http://localhost:5173'

const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const gaIn = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
    await page.waitForTimeout(1500)
  }
  const skarm = (x, y) => page.evaluate(([x, y]) => {
    const b = window.__barnspel
    const c = b.app.canvas.getBoundingClientRect()
    const s = c.width / b.app.renderer.width
    return { x: c.left + x * s, y: c.top + y * s }
  }, [x, y])
  const klick = async (x, y) => { const p = await skarm(x, y); await page.mouse.click(p.x, p.y) }
  const dra = async (fx, fy, tx, ty) => {
    const a = await skarm(fx, fy)
    await page.mouse.move(a.x, a.y); await page.mouse.down()
    for (let k = 1; k <= 14; k++) { const p = await skarm(fx + (tx - fx) * k / 14, fy + (ty - fy) * k / 14); await page.mouse.move(p.x, p.y); await page.waitForTimeout(20) }
    await page.mouse.up()
    await page.waitForTimeout(120)
  }

  // ---- sondens hakar (per spelinstans; spelet är en singleton, phys byts vid init) ----------------------
  const hakaPa = () => page.evaluate(() => {
    const g = window.__barnspel.game
    window.__rp ||= { ref: [], refProp: [], starter: [], firanden: [], frames: [], snaps: [] }
    const D = window.__rp
    if (g.__rpPhys !== g._phys) {
      g.__rpPhys = g._phys
      let var_ = false
      g._phys.beforeStep(() => {
        if (!g._falling || g._resolving) { var_ = false; return }
        if (!var_) { D.ref.length = 0; D.refProp.length = 0; var_ = true } // första steget efter SLÄPP = inspelarens första post
        const b = g._ballBody
        D.ref.push({ x: b.position.x, y: b.position.y, a: b.angle })
        const pp = g._parts.find((p) => p && !p.destroyed && p._prop)?._prop
        if (pp) D.refProp.push(pp.angle)
      })
    }
    if (!g.__rpLindat) {
      g.__rpLindat = true
      const sr = g._startaRepris
      g._startaRepris = function (c) {
        const b = this._ballBody
        const E = D.ref.slice()
        E.push({ x: b.position.x, y: b.position.y, a: b.angle }) // fanga() skriver NU-läget som sista post
        const EP = D.refProp.slice()
        const pp = this._parts.find((p) => p && !p.destroyed && p._prop)?._prop
        if (pp) EP.push(pp.angle)
        const barnFore = this._ball.parent.children.length
        const ret = sr.call(this, c)
        const rec = this._rec
        const fonster = []
        for (let i = 0; i < rec.langd; i++) fonster.push(rec.steg(i))
        D.snaps.push({ ret, E, EP, fonster, langd: rec.langd, L: this._repris?.langd ?? 0, barnFore, barnUnder: this._ball.parent.children.length, t0: performance.now(), lvl: this._level })
        return ret
      }
      const fi = g._firande
      g._firande = function (c) { D.firanden.push({ t: performance.now(), lvl: this._level, barn: this._ball?.parent?.children.length ?? -1 }); return fi.call(this, c) }
    }
    if (!window.__rpTick) {
      window.__rpTick = () => {
        const gg = window.__barnspel.game
        if (!gg || gg.id !== 'kulbana' || !gg._repris) return
        const blad = gg._parts?.find((p) => p && !p.destroyed && p._prop)
        D.frames.push({
          i: gg._repris.index, x: gg._ball.x, y: gg._ball.y, rot: gg._ball.rotation, t: performance.now(),
          bladRot: blad?._blad?.rotation ?? null, propLive: blad?._prop?.angle ?? null, snap: D.snaps.length,
        })
      }
      window.__barnspel.app.ticker.add(window.__rpTick, null, -100) // LÄGSTA prioritet = efter spelets egen tick
    }
  })
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game
    if (!g || g.id !== 'kulbana') return { borta: true }
    const r = g._releaseBtn
    return {
      lvl: g._level, fall: !!g._falling, res: !!g._resolving, glid: !!g._gliding, repris: !!g._repris,
      rx: r && Math.round(r.x), ry: r && Math.round(r.y),
      delar: g._parts.map((p, i) => ({ i, k: p._kind, x: Math.round(p.x), y: Math.round(p.y) })),
    }
  })
  const laddaBana = async (n) => {
    await page.evaluate((lvl) => { const g = window.__barnspel.game, c = window.__barnspel.ctx; g._level = lvl; g._loadLevel(c, lvl) }, n)
    await page.waitForTimeout(500)
    await hakaPa()
  }

  // SLÄPP på riktigt, sedan ett kast mot hinken (banförhandsvisning väljer den vågräta farten).
  const slappOchKasta = async (s0) => {
    await klick(s0.rx, s0.ry)
    await page.waitForTimeout(60)
    return page.evaluate(async () => {
      const { Body, predictTrajectory } = await import('/src/lib/physics.js')
      const g = window.__barnspel.game
      const B = g._ballBody
      if (B.isStatic) return { fel: 'kulan är statisk efter SLÄPP' }
      const bx = g._bucketPos.x, by = g._bucketPos.y
      const sx = bx - 150, sy = by - 360, vy0 = -7
      let bast = null
      for (let vx = 0; vx <= 9; vx += 0.05) {
        const pts = predictTrajectory({ x: sx, y: sy, vx, vy: vy0, gy: 1.1 * 0.001 * (1000 / 60) ** 2, damp: 0.994, steps: 260, every: 1 })
        const p = pts.find((q, i) => q.y >= by - 30 && i > 5)
        if (!p) continue
        const d = Math.abs(p.x - bx)
        if (!bast || d < bast.d) bast = { d, vx }
      }
      Body.setPosition(B, { x: sx, y: sy })
      Body.setVelocity(B, { x: bast.vx, y: vy0 })
      Body.setAngle(B, 0)
      return { vx: +bast.vx.toFixed(2), miss: +bast.d.toFixed(1) }
    })
  }
  // Väntar tills reprisen startat (eller rundan gått förbi utan en).
  const vantaRepris = async (ms = 12000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
      const s = await stat()
      if (s.borta) return false
      if (s.repris) return true
      if (!s.fall && !s.res && !s.glid) return false // missad runda
      await page.waitForTimeout(25)
    }
    return false
  }
  const vantaLugn = async (ms = 12000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { const s = await stat(); if (s.borta) return false; if (!s.fall && !s.res && !s.glid && !s.repris) return true; await page.waitForTimeout(60) }
    return false
  }
  // Spelar tills en LYCKAD rullning med repris (kastet kan missa — då nytt SLÄPP, högst 4 gånger).
  const tillRepris = async (etikett, s0) => {
    for (let f = 1; f <= 4; f++) {
      const k = await slappOchKasta(s0)
      if (k.fel) { console.log(`  [${etikett}] ${k.fel}`); await page.waitForTimeout(800); continue }
      if (await vantaRepris(9000)) { console.log(`  [${etikett}] försök ${f}: kast vx ${k.vx} (förutsagd miss ${k.miss} px) → repris`); return true }
      console.log(`  [${etikett}] försök ${f}: kast vx ${k.vx} → ingen repris`)
      await vantaLugn(9000)
    }
    return false
  }
  const lasD = (nyckel) => page.evaluate((k) => window.__rp[k], nyckel)

  await gaIn()
  await hakaPa()
  const s0 = await stat()
  ok('SLÄPP-knappen finns', s0.rx != null, `SLÄPP (${s0.rx},${s0.ry})`)

  // ================= RUNDA 1: hela reprisen, ingen beröring ==============================================
  await laddaBana(0)
  const lvl1 = (await stat()).lvl
  const fore1 = errors.length
  const r1 = await tillRepris('runda 1', s0)
  ok('runda 1: lyckad rullning ger en repris', r1, '')
  if (r1) {
    await page.waitForTimeout(1100)
    await page.screenshot({ path: '.test-shots/_dag-repris-mitt.png' })
    // medan den går: spåret finns
    const under = await page.evaluate(() => { const g = window.__barnspel.game; const par = g._ball.parent; const i = par.children.indexOf(g._ball); return { barn: par.children.length, bakom: par.children[i - 1]?.constructor?.name, finns: !!g._repris } })
    // vänta ut hela reprisen och firandet
    const t0 = Date.now()
    while (Date.now() - t0 < 8000 && (await stat()).repris) await page.waitForTimeout(40)
    await page.waitForTimeout(300)
    const snaps = await lasD('snaps'); const sn = snaps[snaps.length - 1]
    const fir = await lasD('firanden'); const fi = fir[fir.length - 1]
    const frames = (await lasD('frames')).filter((f) => f.snap === snaps.length)
    // K1: buffert == oberoende referens (hela fönstret, exakt)
    const n = sn.langd
    const avst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
    let k1 = 0
    for (let i = 0; i < n; i++) k1 = Math.max(k1, avst(sn.fonster[i], sn.E[i]), Math.abs(sn.fonster[i].vinkel - sn.E[i].a))
    ok('K1 kontroll: inspelarens buffert == oberoende referensbana (0,0 px)', n > 60 && sn.E.length === n && k1 === 0, `${n} steg · max avvikelse ${k1}`)
    // K2: förskjuten referens ger > 0,5 px
    let k2 = 0
    for (let i = 3; i < n; i++) k2 = Math.max(k2, avst(sn.fonster[i], sn.E[i - 3]))
    ok('K2 kontroll: referensen förskjuten 3 steg AVVIKER (mätaren ser ett fel)', k2 > 0.5, `max avvikelse ${k2.toFixed(2)} px`)
    // M1: ritat läge mot polylinjen (fönstret = sista L av E)
    const s = n - sn.L
    let m1 = 0, helsteg = 0, helMax = 0
    for (const f of frames) {
      const i0 = Math.min(sn.L - 1, Math.floor(f.i)), i1 = Math.min(sn.L - 1, i0 + 1), t = f.i - i0
      const a = sn.E[s + i0], b = sn.E[s + i1]
      const lx = a.x + (b.x - a.x) * t, ly = a.y + (b.y - a.y) * t
      const d = Math.hypot(f.x - lx, f.y - ly)
      m1 = Math.max(m1, d)
      if (t === 0) { helsteg++; helMax = Math.max(helMax, d) }
    }
    ok('M1 reprisens ritade läge avviker ≤ 1e-6 px från den spelade banan', frames.length > 80 && m1 < 1e-6, `${frames.length} bildrutor · max ${m1.toExponential(2)} px · ${helsteg} helsteg (max ${helMax})`)
    ok('M1 reprisen börjar vid fönstrets start och slutar vid målläget (sista 60 av banan)', sn.L === 60 && frames.length && frames[0].i < 1 && frames[frames.length - 1].i > 58, `L ${sn.L} · första index ${frames[0]?.i.toFixed(2)} · sista ${frames[frames.length - 1]?.i.toFixed(2)}`)
    const sek = (fi.t - sn.t0) / 1000
    ok('M2 reprisen är KORT: 2,0–3,3 s från mål till firande', sek >= 2.0 && sek <= 3.3, `${sek.toFixed(2)} s`)
    ok('M3 spåret finns medan reprisen går (+1 barn, ett Graphics strax bakom kulan)', under.finns && sn.barnUnder === sn.barnFore + 1 && /Graphics$/.test(under.bakom || ''), `barn ${sn.barnFore} → ${sn.barnUnder} · bakom kulan: ${under.bakom}`)
    ok('M3 spåret är rivet när firandet börjar (barn tillbaka på samma antal)', fi.barn === sn.barnFore, `${fi.barn} barn vid firandet (före: ${sn.barnFore})`)
    const lugn1 = await vantaLugn(6000)
    ok('runda 1: firandet följer och nästa bana laddas (reprisen låste inte rundan)', lugn1 && (await stat()).lvl === lvl1 + 1, `bana ${lvl1} → ${(await stat()).lvl}`)
    ok('0 konsolfel under runda 1', errors.length === fore1, errors.slice(fore1).join(' | '))
  }

  // ================= RUNDA 2: OTÅLIGT — tryck i fältet mitt i reprisen ==================================
  await vantaLugn(8000)
  const fore2 = errors.length
  const lvl2 = (await stat()).lvl
  const r2 = await tillRepris('runda 2 (fälttryck)', s0)
  ok('runda 2: repris startar (andra rundan, inga rester)', r2, '')
  if (r2) {
    await page.waitForTimeout(700)
    const nFore = (await lasD('firanden')).length
    await klick(640, 330) // tomt fält
    const t0 = Date.now()
    while (Date.now() - t0 < 600 && (await stat()).repris) await page.waitForTimeout(20)
    const efter = Date.now() - t0
    const stN = await stat()
    const nEfter = (await lasD('firanden')).length
    ok('M4 fälttryck 0,7 s in hoppar över reprisen (slut inom 300 ms) och firandet börjar', !stN.repris && efter < 300 && nEfter === nFore + 1, `repris slut efter ${efter} ms · firanden ${nFore} → ${nEfter}`)
    const sn = (await lasD('snaps')).slice(-1)[0]
    ok('M5 andra rundans fönster är rätt (60 steg ur en NY bana, ett spår)', sn.L === 60 && sn.barnUnder === sn.barnFore + 1 && sn.langd > 60, `L ${sn.L} · langd ${sn.langd} · barn ${sn.barnFore} → ${sn.barnUnder}`)
    // andra SLÄPP-trycket under firandet = bara wiggle
    await klick(s0.rx, s0.ry)
    await page.waitForTimeout(300)
    const lugn2 = await vantaLugn(8000)
    ok('M4 nästa bana laddas efter hoppet (< 4 s) och SLÄPP under firandet bara wigglar', lugn2 && (await stat()).lvl === lvl2 + 1, `bana ${lvl2} → ${(await stat()).lvl}`)
    ok('0 konsolfel under runda 2', errors.length === fore2, errors.slice(fore2).join(' | '))
  }

  // ================= RUNDA 3: otåligt — SLÄPP-tryck under reprisen ======================================
  const fore3 = errors.length
  const lvl3 = (await stat()).lvl
  const r3 = await tillRepris('runda 3 (SLÄPP-tryck)', s0)
  ok('runda 3: repris startar', r3, '')
  if (r3) {
    await page.waitForTimeout(500)
    await klick(s0.rx, s0.ry)
    const t0 = Date.now()
    while (Date.now() - t0 < 600 && (await stat()).repris) await page.waitForTimeout(20)
    const stN = await stat()
    ok('M4 SLÄPP-tryck under reprisen hoppar över den (slut inom 300 ms)', !stN.repris && Date.now() - t0 < 300 && stN.res, `res ${stN.res} repris ${stN.repris}`)
    ok('M4 nästa bana laddas efter hoppet', (await vantaLugn(8000)) && (await stat()).lvl === lvl3 + 1, `bana ${lvl3} → ${(await stat()).lvl}`)
    ok('0 konsolfel under runda 3', errors.length === fore3, errors.slice(fore3).join(' | '))
  }

  // ================= RUNDA 4: bana 4 — propellern går i takt med kulans repris ==========================
  const fore4 = errors.length
  await laddaBana(4)
  const s4 = await stat()
  const prop = s4.delar.find((d) => d.k === 'propeller')
  ok('bana 4 har en propeller på hyllan', !!prop, JSON.stringify(prop))
  if (prop) {
    await dra(prop.x, prop.y, 700, 330) // långt från kastbanan (kulan faller över x ≥ 930)
    const r4 = await tillRepris('runda 4 (propeller)', s0)
    ok('runda 4: repris startar med propellern i fältet', r4, '')
    if (r4) {
      await page.waitForTimeout(1200)
      await page.screenshot({ path: '.test-shots/_dag-repris-propeller.png' })
      const t0 = Date.now()
      while (Date.now() - t0 < 8000 && (await stat()).repris) await page.waitForTimeout(40)
      const snaps = await lasD('snaps'); const sn = snaps[snaps.length - 1]
      const frames = (await lasD('frames')).filter((f) => f.snap === snaps.length && f.bladRot != null)
      const s = sn.EP.length - sn.L
      let m = 0, live = 0, vinkelrorelse = 0
      for (const f of frames) {
        const i0 = Math.min(sn.L - 1, Math.floor(f.i)), i1 = Math.min(sn.L - 1, i0 + 1), t = f.i - i0
        const ang = sn.EP[s + i0] + (sn.EP[s + i1] - sn.EP[s + i0]) * t
        m = Math.max(m, Math.abs(f.bladRot - ang))
        live = Math.max(live, Math.abs(f.propLive - ang))
      }
      vinkelrorelse = Math.abs(sn.EP[sn.EP.length - 1] - sn.EP[s])
      ok('M1 propellerns ritade vinkel == inspelad (≤ 1e-9 rad) under reprisen', frames.length > 80 && m < 1e-9, `${frames.length} bildrutor · max ${m.toExponential(2)} rad`)
      ok('K3 kontroll: den LEVANDE fysikens propeller har snurrat vidare (avviker > 0,02 rad från det inspelade)', live > 0.02 && vinkelrorelse > 0.5, `levande avviker max ${live.toFixed(3)} rad · propellern rörde sig ${vinkelrorelse.toFixed(2)} rad i fönstret`)
      await vantaLugn(8000)
    }
    ok('0 konsolfel under runda 4', errors.length === fore4, errors.slice(fore4).join(' | '))
  }

  // ================= RUNDA 5: EXIT mitt i en repris ======================================================
  const fore5 = errors.length
  await laddaBana(1)
  const r5 = await tillRepris('runda 5 (exit)', s0)
  ok('runda 5: repris startar', r5, '')
  if (r5) {
    await page.waitForTimeout(700)
    // plocka undan alla noder under roten + spåret FÖRE rivningen; mät sedan med spelets egen gsap
    await page.evaluate(() => {
      const g = window.__barnspel.game
      const noder = []
      const ner = (x) => { if (!x) return; noder.push(x); for (const c of x.children || []) ner(c) }
      ner(g._root)
      const par = g._ball.parent
      window.__exitNoder = { noder, spar: par.children[par.children.indexOf(g._ball) - 1], ball: g._ball }
    })
    await klick(70, 128) // hem (hemknappens nedre kant)
    await page.waitForTimeout(1500)
    const hem = await stat()
    ok('M6 hem mitt i en repris går hem', hem.borta, JSON.stringify(hem).slice(0, 60))
    const tw = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/gsap\.js|deps\/gsap/.test(n))
      if (!url) return { fel: 'gsap-url saknas' }
      const { gsap } = await import(url)
      const { noder, spar } = window.__exitNoder
      const lever = noder.filter((x) => gsap.isTweening(x) || (x.scale && gsap.isTweening(x.scale)) || (x.position && gsap.isTweening(x.position))).length
      const g = window.__barnspel.game
      return { noder: noder.length, lever, sparRiven: !!spar && spar.destroyed, reprisKvar: !!(g && g._repris) }
    })
    ok('M6 spåret är rivet efter exit', tw.sparRiven, JSON.stringify(tw))
    ok('M6 0 tweens kvar på rot + alla barn (spelets gsap)', tw.lever === 0, `${tw.lever} av ${tw.noder} noder tweenar`)
    const nFore = await page.evaluate(() => window.__rp.frames.length)
    await page.waitForTimeout(1200)
    const nEfter = await page.evaluate(() => window.__rp.frames.length)
    ok('M6 samplaren ser ingen repris efter exit (inget tickar)', nFore === nEfter, `${nFore} → ${nEfter}`)
    ok('0 konsolfel efter exit mitt i reprisen', errors.length === fore5, errors.slice(fore5).join(' | '))
  }

  // gå in igen och ut igen (singleton-spelet: ingen repris eller inspelning får läcka mellan omgångar)
  await gaIn()
  await hakaPa()
  const sI = await page.evaluate(() => { const g = window.__barnspel.game; return { repris: !!g._repris, rec: g._rec?.langd ?? -1, recProp: !!g._recProp } })
  ok('ny omgång: ingen repris, tom buffert', !sI.repris && sI.rec === 0, JSON.stringify(sI))
  await klick(70, 128)
  await page.waitForTimeout(1500)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn}  — ${r.text}`)
process.exit(rader.every((r) => r.ok) ? 0 : 1)
