// Nattkörningen 2026-09-30: `folj-sparet` — spela HELA spåret med riktiga tryck (sista tassen
// x≈1010, bortom harnessens räckvidd 950), husfinalen (dörr, ljus, figur vid huset), runda 2
// (äng -> strand) och vidare till snö, ETT fel avtryck mitt i rundan, otåliga tryck under demo
// och under finalen, och exit mitt i finalen / demon / världsbytet. Räknar konsolfel + döda tweens.
//   node scripts/_natt-folj-sparet.mjs
import { chromium } from 'playwright'

const ID = 'folj-sparet'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })
const log = (...a) => console.log('   ..', ...a)
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
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage && window.__barnspel.game._foots?.length, ID, { timeout: 20000 })
    await page.waitForTimeout(400)
  }
  await gaIn()

  // --- hjälpare ---
  const footScr = (i) => page.evaluate((i) => {
    const b = window.__barnspel, fp = b.game._foots[i]
    if (!fp || fp.destroyed) return null
    const c = b.app.canvas.getBoundingClientRect()
    const k = c.width / b.app.renderer.screen.width
    const p = fp.toGlobal({ x: 0, y: 0 })
    return { x: c.left + p.x * k, y: c.top + p.y * k, gx: p.x, gy: p.y }
  }, i)
  const knappScr = () => page.evaluate(() => {
    const b = window.__barnspel
    const c = b.app.canvas.getBoundingClientRect()
    const k = c.width / b.app.renderer.screen.width
    const p = b.game._showBtn.toGlobal({ x: 0, y: 0 })
    return { x: c.left + p.x * k, y: c.top + p.y * k }
  })
  const st = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return {
      busy: g._busy, win: g._winning, exp: g._expected, n: g._sequence.length, seq: g._sequence.join(''),
      tema: g._tema?.id, lvl: g._level, runda: g._runda, foots: g._foots.length,
      lit: g._foots.filter((f) => f.lit).length, wrong: g._wrongStreak,
      em: g._foots.every((f) => f.eventMode === 'static'),
      rx: Math.round(g._rabbit.x), ry: Math.round(g._rabbit.y), rs: +g._rabbit.scale.x.toFixed(2),
      door: +g._door.scale.x.toFixed(2), dl: +g._doorLight.alpha.toFixed(2), hl: +g._houseLight.alpha.toFixed(2),
      snow: g._houseSnow.visible, oldW: !!g._oldWorld, finds: g._finds.children.length,
      worldId: g._world?.root?.uid ?? null, rundor: (window.__barnspel.ctx.progress.get().custom?.rundor | 0),
    }
  })
  const klick = async (p, wait = 0) => { await page.mouse.click(p.x, p.y); if (wait) await page.waitForTimeout(wait) }
  // Vänta tills spelet tar emot tryck i en ny runda (demon klar)
  const vantaRedo = async (maxMs = 20000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < maxMs) {
      const s = await st()
      if (!s.busy && !s.win && s.em && s.foots > 0 && s.exp === 0) return Date.now() - t0
      await page.waitForTimeout(40)
    }
    return -1
  }
  const gsapInfo = () => page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((u) => /gsap/.test(u) && /\.js/.test(u))
    const mod = await import(url)
    const gsap = mod.gsap || mod.default
    const all = gsap.globalTimeline.getChildren(true, true, false)
    let dead = 0
    const deadKinds = {}
    for (const t of all) {
      let tg = []
      try { tg = t.targets?.() || [] } catch { tg = [] }
      for (const o of tg) if (o && o.destroyed === true) { const k = o.label || o.constructor?.name || '?'; dead++; deadKinds[k] = (deadKinds[k] || 0) + 1 }
    }
    return { n: all.length, dead, deadKinds }
  })
  // Kontrollarm för mätaren: en tween mot en rivd nod MÅSTE synas som död
  const kontroll = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((u) => /gsap/.test(u) && /\.js/.test(u))
    const mod = await import(url)
    const gsap = mod.gsap || mod.default
    const C = window.__barnspel.game._root.constructor
    const c = new C()
    const tw = gsap.to(c, { x: 10, duration: 30 })
    c.destroy()
    const all = gsap.globalTimeline.getChildren(true, true, false)
    let dead = 0
    for (const t of all) for (const o of (t.targets?.() || [])) if (o && o.destroyed === true) dead++
    tw.kill()
    return dead
  })
  ok('kontroll: dode-tween-mataren slar till pa en rivd nod', kontroll >= 1, `${kontroll} dod(a) sedda`)

  // ====================== RUNDA 1 (äng, 3 steg) ======================
  const s0 = await st()
  ok('runda 1 startar i aeng, 3 steg, demo pagar (upptaget)', s0.tema === 'aeng' && s0.n === 3 && s0.busy, `tema ${s0.tema}, n ${s0.n}, busy ${s0.busy}, nivå ${s0.lvl}`)

  // Otåligt: tryck på ett avtryck under demon. Inget ska räknas.
  {
    const felFore = errors.length
    for (let i = 0; i < 3; i++) { const p = await footScr(i); await klick(p, 60) }
    const s = await st()
    ok('tryck under demon: inget raknas, inga fel', s.exp === 0 && s.lit === 0 && errors.length === felFore, `exp ${s.exp}, lit ${s.lit}, nya fel ${errors.length - felFore}`)
  }
  const v1 = await vantaRedo()
  ok('demon klar, avtrycken tar emot tryck', v1 >= 0, `${v1} ms`)

  // Traffyta: mitt pa varje avtryck ska traffa avtrycket
  {
    const hit = await page.evaluate(() => {
      const b = window.__barnspel, g = b.game
      const rb = b.app.renderer.events.rootBoundary
      return g._foots.map((fp) => {
        const p = fp.toGlobal({ x: 0, y: 0 })
        let h = null
        try { h = rb.hitTest(p.x, p.y) } catch { h = 'ERR' }
        let n = h, isFp = false
        while (n && n !== 'ERR') { if (n === fp) { isFp = true; break } n = n.parent }
        return { x: Math.round(p.x), ok: isFp }
      })
    })
    ok('traffyta: mitt pa varje avtryck traffar det', hit.every((h) => h.ok), hit.map((h) => `${h.x}:${h.ok ? 'ja' : 'NEJ'}`).join(' '))
  }

  // Ett FEL avtryck (inte det förväntade) efter ett rätt — ingen nollställning
  {
    const seq = (await st()).seq.split('').map(Number)
    const p0 = await footScr(seq[0])
    await klick(p0, 150)
    const a = await st()
    const fel = seq[2]
    const pf = await footScr(fel)
    const felFore = errors.length
    await klick(pf, 200)
    const b = await st()
    ok('ett fel avtryck: ingen nollstallning, inget tandes, inga fel', a.exp === 1 && b.exp === 1 && b.lit === 1 && b.wrong === 1 && errors.length === felFore, `exp ${a.exp} -> ${b.exp}, lit ${b.lit}, wrongStreak ${b.wrong}, nya fel ${errors.length - felFore}`)
    // tryck pa redan tant avtryck -> samma: mjukt
    await klick(p0, 150)
    const c = await st()
    ok('tryck pa redan tant avtryck: mjukt, rundan fortsatter', c.exp === 1 && c.lit === 1, `exp ${c.exp}, lit ${c.lit}, wrong ${c.wrong}`)
  }

  // Resten av sekvensen, otåligt (120 ms mellan trycken), hela vägen hem
  const spelaRunda = async (etikett, fran = 0, stepMs = 120) => {
    const s = await st()
    const seq = s.seq.split('').map(Number)
    const registrerade = []
    for (let k = fran; k < seq.length; k++) {
      const p = await footScr(seq[k])
      const fore = (await st()).exp
      await klick(p, stepMs)
      const efter = (await st()).exp
      registrerade.push(efter === fore + 1 ? 1 : 0)
    }
    const maxX = await page.evaluate((seq) => Math.round(Math.max(...seq.map((i) => window.__barnspel.game._foots[i].x))), seq)
    return { seq, registrerade, maxX }
  }
  const r1 = await spelaRunda('runda1', 1)
  const w1 = await st()
  ok('runda 1: alla tryck registreras (inkl. sista tassen)', r1.registrerade.every((x) => x === 1) && w1.win, `${r1.registrerade.join('')} (sista x ${r1.maxX}), win ${w1.win}`)
  ok('sista tassen ligger bortom harnessens 950', r1.maxX > 950, `x ${r1.maxX}`)
  await page.waitForTimeout(1400)
  const fin = await st()
  ok('husfinalen: dorren oppen, ljus tant, figur hemma', fin.door < 0.4 && fin.dl > 0.8 && fin.hl > 0.9 && Math.abs(fin.rx - 1170) < 30, `dorr ${fin.door}, dorrljus ${fin.dl}, husljus ${fin.hl}, figur ${fin.rx},${fin.ry} skala ${fin.rs}`)
  ok('firandet sparat: rundor +1', fin.rundor === 1, `rundor ${fin.rundor}`)

  // Otåligt under finalen: tryck avtryck + "Visa igen" + tomma ytan
  {
    const felFore = errors.length
    const kb = await knappScr()
    for (let i = 0; i < 6; i++) {
      await klick(await footScr(i % 3), 50)
      if (i % 2) await klick(kb, 30)
    }
    const s = await st()
    ok('otaliga tryck under finalen: 0 fel, rundan orubbad', errors.length === felFore && s.win && s.exp === s.n, `nya fel ${errors.length - felFore}, win ${s.win}, exp ${s.exp}/${s.n}`)
  }

  // ====================== RUNDA 2 (strand, 4 steg) ======================
  const oldWorld = await page.evaluate(() => window.__barnspel.game._world?.root?.uid)
  // Tryck otåligt medan bygget/demon pågår (en ny runda byggs 3 s efter vinsten)
  {
    const t0 = Date.now()
    let n = 0
    const felFore = errors.length
    while (Date.now() - t0 < 6500) {
      const s = await st()
      if (s.runda >= 1 && !s.win && s.busy && s.tema === 'strand') {
        // byggd, demon pagar: tryck pa avtryck
        const p = await footScr(n++ % s.foots)
        if (p) await klick(p, 100)
      } else await page.waitForTimeout(60)
      if (!s.busy && !s.win) break
    }
    ok('runda 2 byggs utan fel trots tryck i bygget', errors.length === felFore, `${n} tryck under demon, nya fel ${errors.length - felFore}`)
  }
  const v2 = await vantaRedo()
  const s2 = await st()
  ok('runda 2: tema aeng -> strand, 4 steg', s2.tema === 'strand' && s2.n === 4 && s2.foots === 4 && v2 >= 0, `tema ${s2.tema}, n ${s2.n}, redo efter ${v2} ms`)
  ok('runda 2: ny varld byggd, den gamla riven', !s2.oldW, `oldWorld kvar: ${s2.oldW}`)
  ok('runda 2: finalens dorr stangd igen, hus slackt', s2.door > 0.95 && s2.dl < 0.1 && s2.hl < 0.3 && s2.lit === 0, `dorr ${s2.door}, dorrljus ${s2.dl}, husljus ${s2.hl}, lit ${s2.lit}`)
  // "Visa igen" två gånger snabbt mitt i rundan
  {
    const kb = await knappScr()
    await klick(kb, 100); await klick(kb, 100)
    const vb = await st()
    ok('Visa igen x2 i rad: demon gar om, inget fel', vb.busy && errors.length === 0, `busy ${vb.busy}, fel ${errors.length}`)
    await vantaRedo()
  }
  const r2 = await spelaRunda('runda2', 0)
  const w2 = await st()
  ok('runda 2 klaras: alla 4 tryck registreras, final', r2.registrerade.every((x) => x === 1) && r2.registrerade.length === 4 && w2.win, `${r2.registrerade.join('')}, win ${w2.win}`)

  // ====================== RUNDA 3 (snö) + RUNDA 4 (äng, blandad ordning) ======================
  for (const [nr, forvTema, forvN] of [[3, 'sno', 5], [4, 'aeng', 6]]) {
    const v = await vantaRedo(25000)
    const s = await st()
    ok(`runda ${nr}: tema ${forvTema}, ${forvN} steg${nr === 4 ? ' (blandad ordning)' : ''}`, v >= 0 && s.tema === forvTema && s.n === forvN && (forvTema !== 'sno' || s.snow), `tema ${s.tema}, n ${s.n}, seq ${s.seq}, snomossa ${s.snow}`)
    const r = await spelaRunda('runda' + nr, 0)
    const w = await st()
    ok(`runda ${nr} klaras`, r.registrerade.every((x) => x === 1) && w.win, `${r.registrerade.join('')}, win ${w.win}`)
    if (nr === 4) {
      // EXIT MITT I FINALEN (hoppet in i huset pagar, dorren svanger)
      await page.waitForTimeout(700)
      const pre = await st()
      const felFore = errors.length
      const g1 = await gsapInfo()
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await page.waitForTimeout(2500)
      const g2 = await gsapInfo()
      ok('exit mitt i finalen: 0 nya fel', errors.length === felFore && pre.win, `win ${pre.win}, figur ${pre.rx},${pre.ry}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
      ok('exit i finalen: inga tweens mot rivna noder', g2.dead === 0, `fore ${g1.n} (${g1.dead} dode), efter ${g2.n} (${g2.dead} dode ${JSON.stringify(g2.deadKinds)})`)
    }
  }

  // ====================== exit under DEMON (återinträde: nivå 4 = 7 steg) ======================
  await gaIn()
  {
    const s = await st()
    ok('aterinträde: nivå 4 -> 7 steg, sista tassen bortom 950', s.n === 7 && s.lvl === 4, `n ${s.n}, niva ${s.lvl}, seq ${s.seq}`)
    await page.waitForTimeout(1200) // mitt i demon
    const pre = await st()
    const felFore = errors.length
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(2500)
    const g = await gsapInfo()
    ok('exit mitt i demon: 0 nya fel, inga dode tweens', errors.length === felFore && g.dead === 0 && pre.busy, `busy ${pre.busy}, nya fel ${errors.length - felFore}, ${g.dead} dode ${JSON.stringify(g.deadKinds)}`)
  }

  // ====================== runda med 7 steg + exit mitt i världsbytet ======================
  await gaIn()
  {
    await vantaRedo(25000)
    const r = await spelaRunda('runda7', 0, 100)
    const w = await st()
    ok('7-stegsrunda klaras (sista tassen x ' + r.maxX + ')', r.registrerade.every((x) => x === 1) && r.registrerade.length === 7 && w.win, `${r.registrerade.join('')}, win ${w.win}`)
    // vänta tills nästa runda byggs (3 s) och exit 0,25 s in i världsfaden
    const t0 = Date.now()
    while (Date.now() - t0 < 6000 && !(await st()).oldW) await page.waitForTimeout(20)
    await page.waitForTimeout(250)
    const pre = await st()
    const felFore = errors.length
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(2500)
    const g = await gsapInfo()
    ok('exit mitt i varldsbytet: 0 nya fel, inga dode tweens', pre.oldW && errors.length === felFore && g.dead === 0, `oldWorld vid exit ${pre.oldW}, nya fel ${errors.length - felFore}, ${g.dead} dode ${JSON.stringify(g.deadKinds)}`)
  }
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | ') || '0')
} finally {
  await browser.close()
}
console.log(`\n  ${ID} — nattsond\n`)
for (const r of rader) console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(58)} ${r.text}`)
console.log(`\n  ${rader.filter((r) => r.ok).length}/${rader.length} grona\n`)
