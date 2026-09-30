// Nattkörningen 2026-09-30: `vilket-djur-later` — (a) 2-djursrunda: fel djur först, sedan rätt;
// (b) 6 djur (tvingad nivå 3): nås ALLA sex huvuden + alla sex öron med riktiga tryck, och hur
// långt ligger träffytorna från varandra; (c) vändarundan (tvingad): tryck på djuret -> nästa runda;
// (d) otåliga rundor, milstolpe med temabyte och exit mitt i firandet / mitt i temabytet.
//   node scripts/_natt-vilket-djur-later.mjs
import { chromium } from 'playwright'

const ID = 'vilket-djur-later'
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

  // Hookar på spelets egen metod (instansegenskap skuggar prototypen/modulobjektets metod).
  // Idempotent: modulobjektet är detsamma vid återinträde.
  const hook = () => page.evaluate(() => {
    const g = window.__barnspel.game
    window.__nc = []
    window.__nl = []
    if (!g.__hooked) {
      g.__hooked = true
      const oc = g._choose, ol = g._listen
      g._choose = function (ctx, d) { window.__nc.push({ id: d?._djur?.id, busy: this._busy, t: performance.now() }); return oc.call(this, ctx, d) }
      g._listen = function (ctx, d) { window.__nl.push({ id: d?._djur?.id, busy: this._busy }); return ol.call(this, ctx, d) }
    }
  })
  const gaIn = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage && window.__barnspel.game._cards?.length, ID, { timeout: 20000 })
    await hook()
    await page.waitForTimeout(500)
  }
  await gaIn()

  // --- hjälpare ---
  const scr = (what, i) => page.evaluate(([what, i]) => {
    const b = window.__barnspel, g = b.game
    const c = b.app.canvas.getBoundingClientRect()
    const k = c.width / b.app.renderer.screen.width
    const card = g._cards[i]
    if (!card || card.destroyed) return null
    let p
    if (what === 'head') p = card.toGlobal({ x: 0, y: -104 })
    else if (what === 'ear') { if (!card._ear || card._ear.destroyed) return null; p = card._ear.toGlobal({ x: 0, y: 0 }) }
    else p = card.toGlobal({ x: 0, y: -10 })
    return { x: c.left + p.x * k, y: c.top + p.y * k, id: card._djur.id }
  }, [what, i])
  const pt = (x, y) => page.evaluate(([x, y]) => {
    const b = window.__barnspel
    const c = b.app.canvas.getBoundingClientRect(), k = c.width / b.app.renderer.screen.width
    return { x: c.left + x * k, y: c.top + y * k }
  }, [x, y])
  const klick = async (p, wait = 0) => { await page.mouse.click(p.x, p.y); if (wait) await page.waitForTimeout(wait) }
  const st = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return {
      busy: g._busy, hur: g._hur, rond: g._rond, wins: g._wins, n: g._cards.length, tema: g._tema, level: g._level, first: g._first,
      ans: g._answer?.id, ansTema: g._answer?.tema, ansIdx: g._cards.findIndex((c) => c._djur === g._answer), ids: g._cards.map((c) => c._djur.id).join(','),
      set: g._winsInSet, setT: g._setTarget, rundor: (window.__barnspel.ctx.progress.get().custom?.rundor | 0), decoTema: g._decoTema,
      nc: window.__nc.length, nl: window.__nl.length,
    }
  })
  const vantaRunda = async (rondFore, maxMs = 12000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < maxMs) {
      const s = await st()
      if (s.rond > rondFore && !s.busy && s.n > 0) return Date.now() - t0
      await page.waitForTimeout(30)
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
  const kontroll = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((u) => /gsap/.test(u) && /\.js/.test(u))
    const mod = await import(url)
    const gsap = mod.gsap || mod.default
    const C = window.__barnspel.game._root.constructor
    const c = new C()
    const tw = gsap.to(c, { x: 10, duration: 30 })
    c.destroy()
    let dead = 0
    for (const t of gsap.globalTimeline.getChildren(true, true, false)) for (const o of (t.targets?.() || [])) if (o && o.destroyed === true) dead++
    tw.kill()
    return dead
  })
  ok('kontroll: dode-tween-mataren slar till pa en rivd nod', kontroll >= 1, `${kontroll} dod(a) sedda`)
  // Kontroll av hooken: ett tryck pa ett djur maste synas i __nc
  // (görs i (a) nedan: nc räknas före/efter)

  // ====================== (a) 2 djur: fel först, sedan rätt ======================
  const a0 = await st()
  ok('(a) forsta rundan: 2 djur pa scenen', a0.n === 2 && a0.first === false && !a0.hur, `n ${a0.n}: ${a0.ids}, svar ${a0.ans}, niva ${a0.level}`)
  {
    const felFore = errors.length
    const fel = a0.ansIdx === 0 ? 1 : 0
    const pf = await scr('head', fel)
    await klick(pf, 250)
    const s1 = await st()
    ok('(a) fel djur: registreras, rundan fortsatter, inget fel', s1.nc === 1 && !s1.busy && s1.rond === a0.rond && s1.wins === 0 && errors.length === felFore, `nc ${s1.nc}, busy ${s1.busy}, rond ${s1.rond}, wins ${s1.wins}, nya fel ${errors.length - felFore}`)
    // andra felet också, snabbt (två fel i rad) — ingen nollställning, ingen straff
    await klick(pf, 120)
    const s1b = await st()
    ok('(a) fel djur tva ganger: fortfarande samma runda, ej upptaget', s1b.nc === 2 && !s1b.busy && s1b.rond === a0.rond && errors.length === felFore, `nc ${s1b.nc}, busy ${s1b.busy}`)
    // Tomt tryck bredvid djuren (vänligt, inte fel)
    const tom = await pt(120, 330)
    await klick(tom, 150)
    const s1c = await st()
    ok('(a) tomt tryck: mjukt, inget raknas som svar', s1c.nc === 2 && !s1c.busy && errors.length === felFore, `nc ${s1c.nc}, nya fel ${errors.length - felFore}`)
    // Rätt
    const pr = await scr('head', a0.ansIdx)
    await klick(pr, 60)
    const s2 = await st()
    ok('(a) rätt djur: firande (upptaget) och ratt djur registrerat', s2.busy && s2.wins === 1, `busy ${s2.busy}, wins ${s2.wins}`)
    const lastc = await page.evaluate(() => window.__nc[window.__nc.length - 1]?.id)
    ok('(a) det registrerade trycket var pa SVARET', lastc === a0.ans, `${lastc} vs svar ${a0.ans}`)
    // otaligt: tryck pa svaret igen + andra djuret under firandet -> ETT steg, inga fel
    for (let i = 0; i < 4; i++) { await klick(pr, 40); await klick(await scr('head', 1 - a0.ansIdx), 40) }
    const s3 = await st()
    ok('(a) otaliga tryck under firandet: inget extra steg, inga fel', s3.wins === 1 && s3.rundor === 1 && errors.length === felFore, `wins ${s3.wins}, rundor ${s3.rundor}, nya fel ${errors.length - felFore}`)
    const v = await vantaRunda(a0.rond)
    const s4 = await st()
    ok('(a) nasta runda kommer, 3 djur (golv), ej vanda', v >= 0 && s4.n === 3 && !s4.hur && s4.rond === a0.rond + 1, `efter ${v} ms, n ${s4.n}, rond ${s4.rond}`)
    // Runda 2: klicka svaret DIREKT (otaligt, så fort spelet tar emot)
    const pr2 = await scr('head', s4.ansIdx)
    await klick(pr2, 0)
    const s5 = await st()
    ok('(a) runda 2 klaras med omedelbart tryck', s5.busy && s5.wins === 2, `busy ${s5.busy}, wins ${s5.wins}`)
    await vantaRunda(s4.rond)
  }

  // ====================== (b) 6 djur ======================
  await page.evaluate(() => { const b = window.__barnspel, g = b.game; g._first = false; g._level = 3; g._wins = 0; g._newRound(b.ctx) })
  await page.waitForTimeout(1400)
  {
    const s = await st()
    ok('(b) tvingad nivå 3: sex djur', s.n === 6 && !s.hur, `n ${s.n}: ${s.ids}, svar ${s.ans}`)
    // Träffytornas inbördes avstånd (exakt: rektangel mot rektangel / cirkel mot rektangel)
    const geo = await page.evaluate(() => {
      const g = window.__barnspel.game
      const R = (c) => { const s = c._sc; return { x0: c.x - 70 * s, x1: c.x + 70 * s, y0: c.y - 150 * s, y1: c.y + 16 * s } }
      const gapRR = (a, b) => {
        const gx = Math.max(a.x0 - b.x1, b.x0 - a.x1), gy = Math.max(a.y0 - b.y1, b.y0 - a.y1)
        return gx > 0 || gy > 0 ? Math.hypot(Math.max(gx, 0), Math.max(gy, 0)) : Math.max(gx, gy)
      }
      const gapCR = (cx, cy, r, b) => {
        const dx = Math.max(b.x0 - cx, 0, cx - b.x1), dy = Math.max(b.y0 - cy, 0, cy - b.y1)
        return Math.hypot(dx, dy) - r
      }
      const cards = g._cards, rects = cards.map(R)
      let aa = Infinity, ee = Infinity, eo = Infinity, own = Infinity
      const ownTxt = []
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          aa = Math.min(aa, gapRR(rects[i], rects[j]))
          const a = cards[i]._ear, b = cards[j]._ear
          ee = Math.min(ee, Math.hypot(a.x - b.x, a.y - b.y) - 100)
        }
        for (let j = 0; j < cards.length; j++) {
          const e = cards[i]._ear
          const gp = gapCR(e.x, e.y, 50, rects[j])
          if (i === j) { own = Math.min(own, gp); ownTxt.push(Math.round(gp)) } else eo = Math.min(eo, gp)
        }
      }
      const hs = cards.map((c) => `${Math.round(c.x)},${Math.round(c.y)}x${c._sc}`).join(' ')
      return { aa: Math.round(aa), ee: Math.round(ee), eo: Math.round(eo), own: ownTxt.join('/'), hs, minHitW: Math.round(140 * cards[0]._sc), minHitH: Math.round(166 * cards[0]._sc) }
    })
    ok('(b) traffytor: djur-djur >= 24 px', geo.aa >= 24, `minsta glipa ${geo.aa} px (traffyta ${geo.minHitW}x${geo.minHitH}), positioner ${geo.hs}`)
    ok('(b) traffytor: ora-ora >= 24 px', geo.ee >= 24, `minsta glipa ${geo.ee} px (ora Ø100)`)
    ok('(b) traffytor: ora mot ANDRAS djur >= 24 px', geo.eo >= 24, `minsta glipa ${geo.eo} px; ora mot eget djur (info, syskon): ${geo.own}`)

    // Hookkontroll + alla sex ORON (fri-lyssna) — registreras som _listen, aldrig _choose
    await hook()
    const felFore = errors.length
    const ores = []
    for (let i = 0; i < 6; i++) {
      const p = await scr('ear', i)
      const f = await page.evaluate(() => window.__nl.length)
      await klick(p, 160)
      const e = await page.evaluate(() => ({ nl: window.__nl.length, last: window.__nl[window.__nl.length - 1]?.id, nc: window.__nc.length }))
      ores.push(e.nl === f + 1 && e.last === p.id && e.nc === 0 ? 1 : 0)
    }
    ok('(b) alla sex oron nas och raknas ej som svar', ores.every((x) => x === 1) && errors.length === felFore, `${ores.join('')}, nya fel ${errors.length - felFore}`)

    // Alla sex HUVUDEN: fem fel + svaret sist
    const before = await st()
    const order = [...Array(6).keys()].filter((i) => i !== before.ansIdx).concat([before.ansIdx])
    const tr = []
    for (const i of order) {
      const p = await scr('head', i)
      const n0 = await page.evaluate(() => window.__nc.length)
      await klick(p, 170)
      const e = await page.evaluate(() => ({ nc: window.__nc.length, last: window.__nc[window.__nc.length - 1] }))
      tr.push(e.nc === n0 + 1 && e.last.id === p.id ? 1 : 0)
    }
    const after = await st()
    ok('(b) alla sex huvuden nas (ratt djur traffas) med riktiga tryck', tr.every((x) => x === 1), `${tr.join('')} (ordning ${order.join('')}), fel-tryck ej upptagna: ${(await page.evaluate(() => window.__nc.slice(0, 6).every((c) => !c.busy)))}`)
    ok('(b) svaret sist -> firande, ett steg', after.busy && after.wins === 1 && errors.length === felFore, `busy ${after.busy}, wins ${after.wins}, nya fel ${errors.length - felFore}`)
    // kropp (lägre) — träffar djuret från fötterna också? Mitt i kroppen på ett djur i nedre raden
    await vantaRunda(before.rond)
  }

  // ====================== (c) vändarundan ======================
  await page.evaluate(() => { const b = window.__barnspel, g = b.game; g._wins = 3; g._newRound(b.ctx) })
  await page.waitForTimeout(1200)
  {
    const s = await st()
    ok('(c) vandarunda: ett stort djur', s.hur && s.n === 1, `hur ${s.hur}, n ${s.n}: ${s.ids}`)
    // repetera-knappen
    const felFore = errors.length
    const knapp = await pt(640, 158)
    await klick(knapp, 300)
    const sk = await st()
    ok('(c) repetera-knappen: inget fel, rundan orubbad', errors.length === felFore && !sk.busy && sk.rond === s.rond, `busy ${sk.busy}, nya fel ${errors.length - felFore}`)
    const w0 = s.wins
    const p = await scr('head', 0)
    await klick(p, 50)
    const k1 = await st()
    await klick(p, 50); await klick(p, 50) // otaligt dubbel-/trippeltryck
    const k2 = await st()
    ok('(c) tryck pa djuret: harmar, ETT steg aven vid tre tryck', k1.busy && k2.wins === w0 + 1 && errors.length === felFore, `busy ${k1.busy}, wins ${w0} -> ${k2.wins}, nya fel ${errors.length - felFore}`)
    const v = await vantaRunda(s.rond)
    const s3 = await st()
    ok('(c) nasta runda kommer efter vandan, ej vanda igen', v >= 0 && s3.rond === s.rond + 1 && !s3.hur, `efter ${v} ms, rond ${s3.rond}, hur ${s3.hur}, n ${s3.n}`)
  }

  // ====================== (d) otåliga rundor + milstolpe + exit ======================
  // Tre rundor i rad: tryck svaret i samma stund spelet tar emot, plus tryck under firandet
  {
    const felFore = errors.length
    let lyckade = 0
    const r0 = (await st()).wins
    for (let k = 0; k < 3; k++) {
      const s = await st()
      if (s.hur) { await klick(await scr('head', 0), 0) } else await klick(await scr('head', s.ansIdx), 0)
      for (let i = 0; i < 6; i++) { await klick(await scr('head', 0) ?? { x: 640, y: 300 }, 30); await klick(await pt(640, 158), 30) }
      const v = await vantaRunda(s.rond, 12000)
      if (v >= 0) lyckade++
    }
    const s = await st()
    ok('(d) tre otaliga rundor i rad: alla byggs, ett steg per runda', lyckade === 3 && s.wins - r0 === 3 && errors.length === felFore, `${lyckade}/3 byggda, wins +${s.wins - r0}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
  }
  // Milstolpe: tvinga sista steget i setet -> shake + complete() + temabyte (gard -> skog)
  {
    const s = await st()
    await page.evaluate(() => { const g = window.__barnspel.game; g._winsInSet = g._setTarget - 1 })
    const felFore = errors.length
    const tema0 = s.tema
    if (s.hur) { log('vandarunda vid milstolpen, tar den') }
    await klick(await scr('head', s.hur ? 0 : s.ansIdx), 0)
    // vänta tills temat byts (tidFira + 1,6 s) och nästa runda byggs
    const t0 = Date.now()
    let byte = -1
    while (Date.now() - t0 < 9000) {
      const q = await st()
      if (q.tema !== tema0 && q.n > 0 && !q.busy) { byte = Date.now() - t0; break }
      await page.waitForTimeout(40)
    }
    const q = await st()
    ok('(d) milstolpe: temat byts och en ny runda byggs i det', byte >= 0 && q.decoTema === q.tema, `${tema0} -> ${q.tema} efter ${byte} ms, deco ${q.decoTema}, n ${q.n}: ${q.ids}`)
    ok('(d) milstolpe: inga fel, svaret ur det nya temat', errors.length === felFore && q.ansTema === q.tema, `svar ${q.ans} (${q.ansTema}) i tema ${q.tema}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
    // Exit 0,3 s in i temats nedtoning (deco tonar in 0,6 s)
  }
  // Exit mitt i temabyte: bygg en milstolpe till och lämna precis när kulissen byts
  {
    const s = await st()
    await page.evaluate(() => { const g = window.__barnspel.game; g._winsInSet = g._setTarget - 1 })
    const tema0 = s.tema
    await klick(await scr('head', s.hur ? 0 : s.ansIdx), 0)
    const t0 = Date.now()
    while (Date.now() - t0 < 9000 && (await st()).tema === tema0) await page.waitForTimeout(15)
    await page.waitForTimeout(250)
    const pre = await st()
    const felFore = errors.length
    const g1 = await gsapInfo()
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(2500)
    const g2 = await gsapInfo()
    ok('(d) exit mitt i temabytet: 0 nya fel', errors.length === felFore && pre.tema !== tema0, `tema ${tema0} -> ${pre.tema}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
    ok('(d) exit i temabytet: inga tweens mot rivna noder', g2.dead === 0, `fore ${g1.n} (${g1.dead} dode), efter ${g2.n} (${g2.dead} dode ${JSON.stringify(g2.deadKinds)})`)
  }
  // Exit mitt i firandet av ett vanligt rätt svar
  await gaIn()
  {
    const s = await st()
    await klick(await scr('head', s.hur ? 0 : s.ansIdx), 0)
    await page.waitForTimeout(450) // hoppet pagar, klippet schemalagt pa 0,85 s
    const pre = await st()
    const felFore = errors.length
    const g1 = await gsapInfo()
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(2500)
    const g2 = await gsapInfo()
    ok('(d) exit mitt i firandet: 0 nya fel', errors.length === felFore && pre.busy, `busy ${pre.busy}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
    ok('(d) exit i firandet: inga tweens mot rivna noder', g2.dead === 0, `fore ${g1.n} (${g1.dead} dode), efter ${g2.n} (${g2.dead} dode ${JSON.stringify(g2.deadKinds)})`)
  }
  // Exit mitt i en vändarunda-härmning
  await gaIn()
  {
    await page.evaluate(() => { const b = window.__barnspel, g = b.game; g._first = false; g._wins = 3; g._newRound(b.ctx) })
    await page.waitForTimeout(800)
    await klick(await scr('head', 0), 0)
    await page.waitForTimeout(500)
    const felFore = errors.length
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(2500)
    const g = await gsapInfo()
    ok('(d) exit mitt i vandans harmning: 0 nya fel, inga dode tweens', errors.length === felFore && g.dead === 0, `nya fel ${errors.length - felFore}, ${g.dead} dode ${JSON.stringify(g.deadKinds)}`)
  }
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | ') || '0')
} finally {
  await browser.close()
}
console.log(`\n  ${ID} — nattsond\n`)
for (const r of rader) console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(62)} ${r.text}`)
console.log(`\n  ${rader.filter((r) => r.ok).length}/${rader.length} grona\n`)
