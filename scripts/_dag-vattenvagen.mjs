// Dagkörning 2026-10-02, kluster B4 (G8): `vattenvagen`s VENTIL (lib/vev.js) spelad med RIKTIGA
// pekningar — drag runt hjulet, bara tryck, otåligt över banbytet, och exit mitt i en snurr.
//
//   node scripts/_dag-vattenvagen.mjs            (kräver dev-servern på :5173)
//
// VAR VENTILEN SITTER: x = kranens x + 150 (− 150 när det skulle passera x 1040), y = 56 (design 1280×720; hjulets träffcirkel radie 60).
// Bana 1 (kranen i kolumn 1, 4 kolumner): x = 730. Kranens x ligger mellan 340 och 940, alltså
// ventilen mellan 490 och 1090 — från kranen i kolumn 4 och uppåt (x > 950) ligger den UTANFÖR
// harnessens autotryck (x ≤ 950, y ≤ 600); y = 56 är alltid inom. Sonden skriver ut var den satt
// på banorna 1–6.
//
// KONTROLLARM FÖRST: (1) en stängd ventil ger NOLL partiklar — även när vägen är hel (HEAD
// strålade alltid; talet MÅSTE ha rört sig när ventilen öppnats, annars mäter noll ingenting);
// (2) ett drag MOTURS öppnar inte (medurs rotation är det som räknas).
//
// MÄTARMAR: drag-armen (1 varv/s) · tap-armen (≤ 10 tryck når samma varvtal) · taket (8 varv/s
// skenar inte förbi maxFart 0,25 rad/steg = 2,39 varv/s) · halo (tryck 55 px från mitten träffar,
// 70 px gör det inte) · två rundor otåligt (tryck på ventilen under firandet, finger hållet över
// banbytet) · auto-hjälpen (14 s utan tryck → hjulet vrids av sig självt) · exit mitt i en snurr.
import { chromium } from 'playwright'

const ID = 'vattenvagen'
const CAP = 0.25 // maxFart i spelet (rad/steg)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })
const log = (...a) => console.log('   ..', ...a)
const varvS = (radSteg) => (radSteg * 60) / (2 * Math.PI)
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  const gaIn = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage && window.__barnspel.game._mugs?.length && window.__barnspel.game._vev, ID, { timeout: 20000 })
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      // Toppfarten ur spelets egen ventil, läst varje bildruta (nollställs med __vevNoll).
      window.__vv = { max: 0 }
      window.__vevNoll = () => { window.__vv.max = 0 }
      const loop = () => {
        const v = window.__barnspel?.game?._vev
        if (v) window.__vv.max = Math.max(window.__vv.max, Math.abs(v.fart))
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    })
  }
  await gaIn()

  // ---------- hjälpare ----------
  const scr = (s) => page.evaluate((s) => {
    const b = window.__barnspel, g = b.game
    let v = null
    if (s.k === 'stamp') v = g._drag.items.find((r) => r.data.type === s.type && !r.view.destroyed)?.view
    else if (s.k === 'cell') v = g._grid[s.row]?.[s.col]?.view
    else if (s.k === 'ventil') v = g._ventil?.root
    if (!v || v.destroyed) return null
    const c = b.app.canvas.getBoundingClientRect()
    const k = c.width / b.app.renderer.screen.width
    const p = v.toGlobal({ x: 0, y: 0 })
    return { x: c.left + p.x * k, y: c.top + p.y * k, k, dx: v.x, dy: v.y }
  }, s)
  const drag = async (a, b, { steps = 10, stepMs = 16 } = {}) => {
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps)
      await page.waitForTimeout(stepMs)
    }
    await page.mouse.up()
  }
  const klick = async (p, wait = 0) => { await page.mouse.click(p.x, p.y); if (wait) await page.waitForTimeout(wait) }
  const state = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const v = g._vev
    return {
      lvl: g._level, res: g._resolving, conn: g._connected, pa: g._paPa, oppen: +g._oppen.toFixed(3),
      vinkel: v ? +v.vinkel.toFixed(2) : null, fart: v ? +v.fart.toFixed(4) : null, hallen: v ? v.hallen : null,
      hint: !!g._ventilHint, partiklar: g._fluid ? g._fluid.count : null, mugs: g._mugs.length,
      fill: g._mugs.map((m) => +m.fill.toFixed(2)), done: g._mugs.map((m) => m.done), alive: g._alive,
    }
  })
  const topp = () => page.evaluate(() => window.__vv.max)
  const noll = () => page.evaluate(() => window.__vevNoll())
  const cellInfo = (col, row) => page.evaluate(([c, r]) => {
    const cell = window.__barnspel.game._grid[r]?.[c]
    return cell ? { pipe: cell.pipe && !cell.pipe.destroyed ? { t: cell.pipe._ptype, rot: cell.pipe._rot } : null, stone: !!cell.stone } : null
  }, [col, row])
  const vantaStamp = async (type, maxMs = 2000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < maxMs) {
      const r = await page.evaluate((type) => {
        const it = window.__barnspel.game._drag.items.find((r) => r.data.type === type)
        return it ? { placed: it.placed, em: it.view.eventMode } : null
      }, type)
      if (r && !r.placed && r.em === 'static') return Date.now() - t0
      await page.waitForTimeout(10)
    }
    return -1
  }
  // Löser rörbyggandet (drag + vridtryck) — ventilen rörs INTE.
  const bygg = async (etikett, { otalig = false } = {}) => {
    const plan = await page.evaluate(() => {
      const g = window.__barnspel.game
      return g._solution.map((s, i) => ({ ...s, fixed: i === 0 || s.row === g._rows - 1 }))
    })
    const att = plan.filter((s) => !s.fixed)
    let landade = 0, vridna = 0
    for (const s of att) {
      await vantaStamp(s.type)
      const a = await scr({ k: 'stamp', type: s.type }), b = await scr({ k: 'cell', col: s.col, row: s.row })
      if (!a || !b) continue
      await drag(a, b)
      await page.waitForTimeout(otalig ? 290 : 450)
      let ci = await cellInfo(s.col, s.row)
      if (ci?.pipe?.t === s.type) landade++
      else { log(etikett, 'drag landade inte', JSON.stringify(s), JSON.stringify(ci)); continue }
      for (let k = 0; k < s.rot; k++) await klick(b, otalig ? 60 : 200)
      await page.waitForTimeout(otalig ? 60 : 250)
      ci = await cellInfo(s.col, s.row)
      if (ci?.pipe?.rot === s.rot) vridna++
    }
    return { antal: att.length, landade, vridna }
  }
  // Fingret cirklar runt ventilens mitt. Tiden räknas i verklig klocka, så fingrets fart är
  // `v` varv/s oavsett hur Chrome kvantiserar väntetiderna. rikt 1 = medurs.
  const cirkla = async (v, sek, { r = 38, rikt = 1, ned = true, upp = true } = {}) => {
    const c = await scr({ k: 'ventil' })
    const R = r * c.k
    let th = -Math.PI / 2
    await page.mouse.move(c.x + R * Math.cos(th), c.y + R * Math.sin(th))
    if (ned) await page.mouse.down()
    const t0 = Date.now()
    let tPrev = t0
    let tot = 0
    while (Date.now() - t0 < sek * 1000) {
      const nu = Date.now()
      const d = rikt * v * 2 * Math.PI * ((nu - tPrev) / 1000)
      tPrev = nu
      th += d
      tot += Math.abs(d)
      await page.mouse.move(c.x + R * Math.cos(th), c.y + R * Math.sin(th))
      await page.waitForTimeout(10)
    }
    if (upp) await page.mouse.up()
    return { varv: tot / (2 * Math.PI), s: (Date.now() - t0) / 1000 }
  }
  const gsapInfo = () => page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((u) => /gsap/.test(u) && /\.js/.test(u))
    const mod = await import(url)
    const gsap = mod.gsap || mod.default
    const all = gsap.globalTimeline.getChildren(true, true, false)
    let dead = 0
    for (const t of all) {
      let tg = []
      try { tg = t.targets?.() || [] } catch { tg = [] }
      for (const o of tg) if (o && o.destroyed === true) dead++
    }
    return { n: all.length, dead }
  })
  const vantaNasta = async (lvl, maxMs = 40000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < maxMs) {
      const s = await state()
      if (s.lvl > lvl) return { nasta: true, t: Date.now() - t0 }
      await page.waitForTimeout(100)
    }
    return { nasta: false, t: Date.now() - t0 }
  }

  // ====================== VAR SITTER VENTILEN? ======================
  {
    const rapport = []
    let utanfor = 0
    for (let L = 1; L <= 6; L++) {
      await page.evaluate((L) => { const b = window.__barnspel; b.game._buildLevel(b.ctx, L) }, L)
      await page.waitForTimeout(250)
      const p = await scr({ k: 'ventil' })
      const nara = await page.evaluate(() => {
        // Närmaste avstånd från ventilens träffcirkel till någon brunns träffyta (rektangel ±60 runt cellens mitt).
        const g = window.__barnspel.game
        const v = g._ventil.root
        let min = Infinity
        for (const row of g._grid) for (const c of row) {
          const dx = Math.max(Math.abs(v.x - c.x) - 60, 0)
          const dy = Math.max(Math.abs(v.y - c.y) - 60, 0)
          min = Math.min(min, Math.hypot(dx, dy) - g._vev.hitRadie)
        }
        return Math.round(min)
      })
      const nar = p.dx <= 950 && p.dy <= 600
      if (!nar) utanfor++
      rapport.push(`bana ${L}: (${Math.round(p.dx)}, ${Math.round(p.dy)}) ${nar ? 'nåbar' : 'UTANFÖR autotryck'} · glapp till brunn ${nara} px`)
      if (L === 1) ok('träffyta ≥ 96 px (diameter) och ≥ 24 px till närmaste brunn (bana 1)', (await page.evaluate(() => window.__barnspel.game._vev.hitRadie * 2)) >= 96 && nara >= 24, `diameter 120, glapp ${nara} px`)
      if (nara < 24) ok(`glapp ≥ 24 px (bana ${L})`, false, `${nara} px`)
    }
    rapport.forEach((r) => log(r))
    log(`${utanfor} av 6 banor har ventilen utanför harnessens autotryck`)
    await page.evaluate(() => { const b = window.__barnspel; b.game._buildLevel(b.ctx, 1) })
    await page.waitForTimeout(500)
  }

  // ====================== KONTROLL: stängd ventil = inget vatten ======================
  {
    await page.waitForTimeout(1500)
    const s = await state()
    ok('KONTROLL stängd ventil: 0 partiklar efter 1,5 s (HEAD strålade alltid)', s.partiklar === 0 && s.oppen === 0 && !s.pa, `partiklar ${s.partiklar}, oppen ${s.oppen}`)
  }

  // ====================== RUNDA 1: drag-armen, ventilen SIST ======================
  const r1 = await bygg('bana1')
  ok('bana 1: rören byggda med drag + vridtryck', r1.landade === r1.antal && r1.vridna === r1.antal && r1.antal > 0, `${r1.landade}/${r1.antal} landade, ${r1.vridna} vridna`)
  await page.waitForTimeout(600)
  {
    const s = await state()
    ok('bana 1: vägen hel men vattnet INTE på — väntar på ventilen', s.conn && !s.pa && s.oppen === 0, `kopplad ${s.conn}, påsatt ${s.pa}, oppen ${s.oppen}`)
    ok('bana 1: pilen över ventilen syns direkt', s.hint, `hint ${s.hint}`)
    await page.waitForTimeout(1200)
    const s2 = await state()
    ok('bana 1: hel väg + stängd ventil = 0 partiklar (kontrollarmen, nu med hel ledning)', s2.partiklar === 0, `partiklar ${s2.partiklar}`)
  }
  // MOTURS öppnar OCKSÅ (kritiken D9: en treåring skruvar åt båda hållen). Hjulet rör sig åt minus och kranen går på.
  {
    await noll()
    const c = await cirkla(1, 1.2, { rikt: -1 })
    await page.waitForTimeout(150)
    const s = await state()
    const tp = await topp()
    ok('moturs drag: hjulet rör sig (vinkel < 0) och kranen öppnas', s.vinkel < -1 && s.oppen >= 0.25, `vinkel ${s.vinkel} rad, oppen ${s.oppen}, topp ${varvS(tp).toFixed(2)} varv/s, fingret ${c.varv.toFixed(1)} varv`)
    await page.waitForTimeout(2500) // låt det glida av
  }
  // MÄTARM: drag medurs 1 varv/s i 2 s
  let dragTopp = 0
  {
    await noll()
    const c = await cirkla(1, 2, {})
    dragTopp = await topp()
    await page.waitForTimeout(250)
    const s = await state()
    ok('drag-armen: 1 varv/s medurs öppnar kranen', s.pa && s.oppen >= 0.3, `oppen ${s.oppen}, påsatt ${s.pa}, fingret ${c.varv.toFixed(1)} varv på ${c.s.toFixed(1)} s`)
    ok('drag-armen: hjulet följer fingret (topp 0,7–1,3 varv/s)', varvS(dragTopp) > 0.7 && varvS(dragTopp) < 1.3, `topp ${varvS(dragTopp).toFixed(2)} varv/s (${dragTopp.toFixed(3)} rad/steg)`)
    await page.waitForTimeout(1500)
    const s2 = await state()
    ok('vattnet kom: partiklar efter öppning (talet rörde sig från 0)', s2.partiklar > 0, `partiklar ${s2.partiklar}`)
  }
  // TAKET: en vild snurr (8 varv/s) skenar inte
  {
    await noll()
    const c = await cirkla(8, 1.2, {})
    const tp = await topp()
    ok('tak: 8 varv/s skenar inte förbi maxFart (0,25 rad/steg = 2,39 varv/s)', tp <= CAP * 1.02 && tp > CAP * 0.5, `topp ${tp.toFixed(3)} rad/steg = ${varvS(tp).toFixed(2)} varv/s (fingret ${c.varv.toFixed(1)} varv på ${c.s.toFixed(1)} s)`)
    await page.waitForTimeout(4200) // från taket 0,25 rad/steg tar damp 0,03 ~3,9 s ner till dödzonen 0,0015
    const s = await state()
    ok('hjulet stannar av sig självt efter släpp (≤ 4 s)', Math.abs(s.fart) < 0.002, `fart ${s.fart}`)
  }
  {
    const k = await vantaNasta(1, 40000)
    ok('bana 1: muggen fylls och bana 2 byggs', k.nasta, `${k.t} ms`)
  }

  // ====================== RUNDA 2: tap-armen, otåligt ======================
  if ((await state()).lvl < 2) { await page.evaluate(() => { const b = window.__barnspel; b.game._buildLevel(b.ctx, 2) }); await page.waitForTimeout(800) }
  {
    const s = await state()
    ok('bana 2 startar med STÄNGD ventil (nytt hjul, nytt grepp)', s.lvl === 2 && s.oppen === 0 && !s.pa && s.vinkel === 0 && s.partiklar === 0, `lvl ${s.lvl}, oppen ${s.oppen}, vinkel ${s.vinkel}, partiklar ${s.partiklar}`)
  }
  const r2 = await bygg('bana2', { otalig: true })
  ok('bana 2 (otålig): rören byggda', r2.landade === r2.antal && r2.vridna === r2.antal && r2.antal > 0, `${r2.landade}/${r2.antal}, ${r2.vridna} vridna`)
  {
    // HALO: ett tryck 70 px från mitten (utanför träffcirkeln 60) gör ingenting; 55 px träffar.
    const c = await scr({ k: 'ventil' })
    await noll()
    await klick({ x: c.x + 72 * c.k, y: c.y }, 300)
    let s = await state()
    ok('halo: tryck 72 px från mitten (utanför 60) rör inte hjulet', s.vinkel === 0 && s.oppen === 0, `vinkel ${s.vinkel}`)
    await klick({ x: c.x + 55 * c.k, y: c.y }, 40)
    s = await state()
    ok('halo: tryck 55 px från mitten (utanför hjulet 47, inom halon) ger en knuff', s.fart > 0.01 || s.vinkel > 0.05, `fart ${s.fart}, vinkel ${s.vinkel}`)
    await page.waitForTimeout(2800)
  }
  // Tap-armen: tryck var 250 ms tills kranen är helt öppen. Mätt mot drag-armens topp.
  {
    await noll()
    const c = await scr({ k: 'ventil' })
    let n = 0
    let nOppen = null
    let s = await state()
    const v0 = s.vinkel
    while (n < 10) {
      await klick({ x: c.x + 10 * c.k, y: c.y + 5 * c.k }, 250)
      n++
      s = await state()
      if (nOppen == null && s.oppen >= 1) nOppen = n
    }
    const tp = await topp()
    const kl = Math.round(((s.vinkel - v0) / (Math.PI / 2)) * 10) / 10
    ok('tap-armen: kranen helt öppen inom 10 tryck (fyra kvartsvarv = ett varv)', nOppen != null && nOppen <= 10, `helt öppen efter ${nOppen} tryck, ${kl} kvartsvarv på 10 tryck`)
    ok('tap-armen når ≥ 90 % av drag-armens varvtal (mätt i samma sond)', varvS(tp) >= 0.9 * varvS(dragTopp), `tap ${varvS(tp).toFixed(2)} varv/s mot drag ${varvS(dragTopp).toFixed(2)} varv/s`)
    ok('tap-armen: påsatt, vattnet kommer', s.pa, `pa ${s.pa}`)
  }
  // Otåligt: hamra på ventilen medan banan firas och byggs om, och HÅLL ett finger över banbytet.
  {
    const t0 = Date.now()
    while (Date.now() - t0 < 30000 && !(await state()).res) await page.waitForTimeout(60)
    const res = (await state()).res
    ok('bana 2: muggen full → firande', res, `${Date.now() - t0} ms`)
    const felFore = errors.length
    const c = await scr({ k: 'ventil' })
    await page.mouse.move(c.x + 20 * c.k, c.y)
    await page.mouse.down() // fingret ned på ventilen under firandet …
    for (let i = 0; i < 14; i++) { await page.mouse.move(c.x + (20 + (i % 4) * 6) * c.k, c.y + (i % 3) * 8 * c.k); await page.waitForTimeout(60) }
    let tt = 0
    while ((await state()).lvl === 2 && tt++ < 80) { await page.mouse.move(c.x + 25 * c.k, c.y + (tt % 5) * 4 * c.k); await page.waitForTimeout(40) }
    await page.waitForTimeout(250) // … banan har byggts om (nytt hjul, gamla ytan riven) …
    await page.mouse.up() // … och släppet kommer först nu
    await page.waitForTimeout(400)
    const s = await state()
    ok('finger hållet på ventilen över banbytet: bana 3 byggd, 0 nya fel, inget fastnat', s.lvl === 3 && s.hallen === false && errors.length === felFore, `lvl ${s.lvl}, hallen ${s.hallen}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
    // Det NYA hjulet tar emot ett tryck direkt (grepp-id:t från det gamla fingret får inte ha blivit kvar).
    const c2 = await scr({ k: 'ventil' })
    await klick({ x: c2.x + 8 * c2.k, y: c2.y }, 120)
    const s2 = await state()
    ok('bana 3: nya ventilen tar emot ett tryck direkt efter banbytet', s2.vinkel > 0.2, `vinkel ${s2.vinkel}`)
    await page.waitForTimeout(2500)
    // Hamra otåligt på nya ventilen + rutor.
    const f2 = errors.length
    for (let i = 0; i < 20; i++) { await klick({ x: c2.x + (i % 5) * 4, y: c2.y + (i % 3) * 4 }, 25) }
    ok('otåliga tryck på ventilen: 0 fel', errors.length === f2, `${errors.length - f2} nya fel`)
  }

  // ====================== AUTO-HJÄLPEN: hjulet vrids av sig självt ======================
  {
    const r = await bygg('bana3', { otalig: true })
    ok('bana 3: rören byggda (inför auto-hjälpen)', r.landade === r.antal && r.vridna === r.antal && r.antal > 0, `${r.landade}/${r.antal}`)
    const t0 = Date.now()
    let s = await state()
    let sag = null
    // De otåliga trycken ovan vrider bana 3:s ventil (20 knuffar) — är den redan på mäter armen ingenting.
    const redanPa = s.pa
    while (Date.now() - t0 < 22000 && !s.pa) { await page.waitForTimeout(250); s = await state() }
    sag = Date.now() - t0
    if (redanPa) console.log('  --   auto-hjälpen: OMÄTT — ventilen redan öppnad av de otåliga trycken på bana 3')
    else ok('auto-hjälpen: utan ett enda tryck på ventilen öppnas kranen av sig själv (efter ~14 s)', s.pa && sag > 10000 && sag < 21000, `påsatt ${s.pa} efter ${sag} ms`)
    const k = await vantaNasta(3, 40000)
    ok('bana 3 fylls efter hjälpen och bana 4 byggs', k.nasta, `${k.t} ms`)
  }

  // ====================== EXIT MITT I EN SNURR ======================
  {
    if ((await state()).lvl !== 4) { await page.evaluate(() => { const b = window.__barnspel; b.game._buildLevel(b.ctx, 4) }); await page.waitForTimeout(700) }
    const felFore = errors.length
    const g1 = await gsapInfo()
    // flickning, och ut medan hjulet snurrar OCH fingret ligger kvar
    const c = await scr({ k: 'ventil' })
    const R = 38 * c.k
    await page.mouse.move(c.x, c.y - R)
    await page.mouse.down()
    let th = -Math.PI / 2
    for (let i = 0; i < 25; i++) { th += 0.28; await page.mouse.move(c.x + R * Math.cos(th), c.y + R * Math.sin(th)); await page.waitForTimeout(14) }
    const innan = await state()
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.mouse.move(c.x + 5, c.y - R, { steps: 3 })
    await page.mouse.up()
    await page.waitForTimeout(2500)
    const g2 = await gsapInfo()
    ok('exit mitt i en snurr (fingret kvar): 0 nya fel', errors.length === felFore && innan.fart !== 0, `fart vid exit ${innan.fart}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
    ok('exit: inga tweens mot förstörda noder', g2.dead === 0, `${g1.n} tweens före, ${g2.n} efter (${g2.dead} döda)`)
  }
  // Tillbaka in: ventilen ska fungera igen (återspelssäkert).
  await gaIn()
  {
    const c = await scr({ k: 'ventil' })
    await klick({ x: c.x + 10, y: c.y }, 150)
    const s = await state()
    ok('åter in i spelet: ventilen tar emot ett tryck', s.vinkel > 0.2 && s.lvl >= 1, `vinkel ${s.vinkel}, lvl ${s.lvl}`)
  }
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | ') || '0')
} finally {
  await browser.close()
}
console.log(`\n  ${ID} — ventilen (G8)\n`)
for (const r of rader) console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(78)} ${r.text}`)
console.log(`\n  ${rader.filter((r) => r.ok).length}/${rader.length} gröna\n`)
