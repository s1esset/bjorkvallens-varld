// Nattkörningen 2026-09-30: `vattenvagen` — lös banor med RIKTIGA drag (rörbit från hyllan till
// brunn) + tryck för att vrida, otåligt under firandet och över banbytet, bana 5 (T-rör, två
// muggar) och 6, exit mitt i firandet och mitt i ett drag. Räknar konsolfel + döda tweens.
//   node scripts/_natt-vattenvagen.mjs
import { chromium } from 'playwright'

const ID = 'vattenvagen'
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
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage && window.__barnspel.game._mugs?.length, ID, { timeout: 20000 })
    await page.waitForTimeout(1200)
  }
  await gaIn()

  // --- hjälpare: skärmpunkt för ett spelobjekt ---
  const scr = (s) => page.evaluate((s) => {
    const b = window.__barnspel, g = b.game
    let v = null
    if (s.k === 'stamp') v = g._drag.items.find((r) => r.data.type === s.type && !r.view.destroyed)?.view
    else if (s.k === 'cell') v = g._grid[s.row]?.[s.col]?.view
    else if (s.k === 'anystamp') v = g._drag.items.find((r) => !r.view.destroyed)?.view
    if (!v || v.destroyed) return null
    const c = b.app.canvas.getBoundingClientRect()
    const k = c.width / b.app.renderer.screen.width
    const p = v.toGlobal({ x: 0, y: 0 })
    return { x: c.left + p.x * k, y: c.top + p.y * k }
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
    return {
      lvl: g._level, res: g._resolving, conn: g._connected, mugs: g._mugs.length,
      fill: g._mugs.map((m) => +m.fill.toFixed(2)), done: g._mugs.map((m) => m.done),
      pipes: g._pipes.length, active: !!g._drag.active, sel: !!g._drag.selected, alive: g._alive,
    }
  })
  const cellInfo = (col, row) => page.evaluate(([c, r]) => {
    const cell = window.__barnspel.game._grid[r]?.[c]
    return cell ? { pipe: cell.pipe && !cell.pipe.destroyed ? { t: cell.pipe._ptype, rot: cell.pipe._rot } : null, stone: !!cell.stone } : null
  }, [col, row])
  // Stampen är tagbar igen (spelet tar emot ett nytt grepp)
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

  // --- löser en bana med drag + vridtryck. otalig = ingen väntan utöver att spelet tar emot ---
  const losBana = async (etikett, { otalig = false } = {}) => {
    const plan = await page.evaluate(() => {
      const g = window.__barnspel.game
      return g._solution.map((s, i) => ({ ...s, fixed: i === 0 || s.row === g._rows - 1 }))
    })
    const att = plan.filter((s) => !s.fixed)
    let landade = 0, vridna = 0, vantaMax = 0
    for (const s of att) {
      const w = await vantaStamp(s.type)
      vantaMax = Math.max(vantaMax, w)
      const a = await scr({ k: 'stamp', type: s.type }), b = await scr({ k: 'cell', col: s.col, row: s.row })
      if (!a || !b) continue
      await drag(a, b)
      await page.waitForTimeout(otalig ? 290 : 450)
      let ci = await cellInfo(s.col, s.row)
      if (ci?.pipe?.t === s.type) landade++
      else { log(etikett, 'drag landade inte', JSON.stringify(s), JSON.stringify(ci)); continue }
      for (let k = 0; k < s.rot; k++) {
        await klick(b, otalig ? 60 : 200)
      }
      await page.waitForTimeout(otalig ? 60 : 250)
      ci = await cellInfo(s.col, s.row)
      if (ci?.pipe?.rot === s.rot) vridna++
      else log(etikett, 'vridning fel', JSON.stringify(s), JSON.stringify(ci))
    }
    return { antal: att.length, landade, vridna, vantaMax }
  }
  // Vänta tills banan är klar (res) och sedan nästa bana byggd
  const vantaKlar = async (lvl, maxMs = 40000) => {
    const t0 = Date.now()
    let resT = null, max = []
    while (Date.now() - t0 < maxMs) {
      const s = await state()
      if (s.res && resT == null) resT = Date.now() - t0
      if (s.fill.length > max.length) max = s.fill
      if (s.fill.every((f, i) => f >= (max[i] ?? 0))) max = s.fill
      if (s.lvl > lvl) return { nasta: true, resT, t: Date.now() - t0, max }
      await page.waitForTimeout(100)
    }
    return { nasta: false, resT, t: Date.now() - t0, max }
  }
  const hemmaStampar = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return g._drag.items.map((r) => Math.round(Math.hypot(r.view.x - r.home.x, r.view.y - r.home.y)))
  })

  // gsap-kontroll: samma instans som spelet
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
      for (const o of tg) if (o && o.destroyed === true) { dead++; deadKinds[o.label || o.constructor?.name || '?'] = (deadKinds[o.label || o.constructor?.name || '?'] || 0) + 1 }
    }
    return { n: all.length, dead, deadKinds }
  })
  const g0 = await gsapInfo()
  ok('kontroll: gsap-instansen ser spelets tweens', g0.n > 3, `${g0.n} tweens i globalTimeline`)

  // ====================== BANA 1: lugnt, riktiga drag ======================
  const s1 = await state()
  ok('bana 1 startar: en mugg, kran, inget firande', s1.lvl === 1 && s1.mugs === 1 && !s1.res, `lvl ${s1.lvl}, muggar ${s1.mugs}`)
  const r1 = await losBana('bana1')
  ok('bana 1: alla drag landar i ratt brunn', r1.landade === r1.antal && r1.antal > 0, `${r1.landade}/${r1.antal} landade`)
  ok('bana 1: vridtryck ger ratt riktning', r1.vridna === r1.antal, `${r1.vridna}/${r1.antal} vridna ratt`)
  // Vattnet ska nå muggen
  {
    const t0 = Date.now()
    let rKlar = null, maxFill = 0, conn = false
    while (Date.now() - t0 < 30000) {
      const s = await state()
      maxFill = Math.max(maxFill, ...s.fill)
      conn = conn || s.conn
      if (s.res) { rKlar = Date.now() - t0; break }
      await page.waitForTimeout(100)
    }
    ok('bana 1: vattnet kopplas och muggen fylls', conn && rKlar != null, `kopplad ${conn}, full efter ${rKlar} ms, max fyllnad ${maxFill}`)
    // OTALIGT under firandet: grip en bit och hall genom banbytet (1,6 s), slapp efterat
    if (rKlar != null) {
      const a = await scr({ k: 'anystamp' })
      const b = await scr({ k: 'cell', col: 0, row: 0 })
      if (a) {
        await page.mouse.move(a.x, a.y); await page.mouse.down()
        for (let i = 1; i <= 6; i++) { await page.mouse.move(a.x + i * 10, a.y - i * 20); await page.waitForTimeout(40) }
        const t1 = Date.now()
        while (Date.now() - t1 < 4000 && (await state()).lvl === 1) await page.waitForTimeout(50)
        await page.waitForTimeout(250)
        await page.mouse.move(b.x, b.y, { steps: 6 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }
      const s = await state()
      ok('drag hallet over banbytet: bana 2 byggs, inget fastnat', s.lvl === 2 && !s.active && !s.res && s.mugs === 1, `lvl ${s.lvl}, active ${s.active}, res ${s.res}, rör ${s.pipes}`)
      ok('0 konsolfel hittills (efter banbytet)', errors.length === 0, errors.slice(0, 2).join(' | ') || '0 fel')
    }
  }
  if ((await state()).lvl < 2) { await page.evaluate(() => { const b = window.__barnspel; b.game._buildLevel(b.ctx, 2) }); await page.waitForTimeout(800) }

  // ====================== BANA 2: otalig, tryck under firandet ======================
  const r2 = await losBana('bana2', { otalig: true })
  ok('bana 2 (otalig): drag landar + vrids ratt', r2.landade === r2.antal && r2.vridna === r2.antal && r2.antal > 0, `land ${r2.landade}/${r2.antal}, vrid ${r2.vridna}/${r2.antal}, max vantan pa stamp ${r2.vantaMax} ms`)
  {
    const t0 = Date.now()
    while (Date.now() - t0 < 30000 && !(await state()).res) await page.waitForTimeout(80)
    const res = (await state()).res
    ok('bana 2: firandet startar', res, `${Date.now() - t0} ms`)
    // Otaliga tryck: hamra pa alla rutor + slapp stampar medan firandet pagar
    const felFore = errors.length
    const t1 = Date.now()
    let n = 0
    while (Date.now() - t1 < 1500 && (await state()).lvl === 2) {
      const col = n % 4, row = n % 3
      const p = await scr({ k: 'cell', col, row })
      if (p) await klick(p, 30)
      if (n % 3 === 0) {
        const a = await scr({ k: 'anystamp' }), b = await scr({ k: 'cell', col: (n + 1) % 4, row: n % 3 })
        if (a && b) await drag(a, b, { steps: 4, stepMs: 8 })
      }
      n++
    }
    await page.waitForTimeout(900)
    const s = await state()
    ok('otaliga tryck under firandet: 0 fel, bana 3 byggs', errors.length === felFore && s.lvl === 3, `${n} tryckomgangar, lvl ${s.lvl}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
  }

  // ====================== BANA 3-4: stenar (tryck) ======================
  for (const L of [3, 4]) {
    if ((await state()).lvl !== L) { await page.evaluate((L) => { const b = window.__barnspel; b.game._buildLevel(b.ctx, L) }, L); await page.waitForTimeout(800) }
    const st = await page.evaluate(() => window.__barnspel.game._grid.flat().filter((c) => c.stone).map((c) => ({ col: c.col, row: c.row })))
    if (st.length) {
      const p = await scr({ k: 'cell', col: st[0].col, row: st[0].row })
      await klick(p, 120)
      const ci = await cellInfo(st[0].col, st[0].row)
      ok(`bana ${L}: tryck pa sten tar bort den`, ci && !ci.stone, `sten ${JSON.stringify(st[0])} -> stone=${ci?.stone}`)
    }
    const r = await losBana('bana' + L, { otalig: true })
    const k = await vantaKlar(L)
    ok(`bana ${L}: loses med drag och nasta bana byggs`, r.landade === r.antal && r.vridna === r.antal && k.nasta, `land ${r.landade}/${r.antal}, vrid ${r.vridna}/${r.antal}, res efter ${k.resT} ms, nasta ${k.nasta}`)
  }

  // ====================== BANA 5: T-ror, tva muggar ======================
  if ((await state()).lvl !== 5) { log('bana 5 nåddes inte naturligt, tvingar'); await page.evaluate(() => { const b = window.__barnspel; b.game._buildLevel(b.ctx, 5) }); await page.waitForTimeout(800) }
  {
    const s = await state()
    ok('bana 5: tva muggar', s.lvl === 5 && s.mugs === 2, `lvl ${s.lvl}, muggar ${s.mugs}`)
    const plan = await page.evaluate(() => window.__barnspel.game._solution.map((x) => `${x.col},${x.row}:${x.type}/${x.rot}`).join(' '))
    log('bana 5 lösning', plan)
    const r = await losBana('bana5')
    ok('bana 5: drag landar + vrids ratt (inkl. T-ror)', r.landade === r.antal && r.vridna === r.antal && r.antal > 0, `land ${r.landade}/${r.antal}, vrid ${r.vridna}/${r.antal}`)
    const t0 = Date.now()
    let both = false, firstDone = null, maxF = [0, 0]
    while (Date.now() - t0 < 40000) {
      const s = await state()
      s.fill.forEach((f, i) => { maxF[i] = Math.max(maxF[i], f) })
      if (s.done.some(Boolean) && firstDone == null) firstDone = Date.now() - t0
      if (s.done.every(Boolean)) { both = true; break }
      await page.waitForTimeout(100)
    }
    ok('bana 5: BADA muggarna fylls', both, `forsta klar ${firstDone} ms, bada ${Date.now() - t0} ms, max fyllnad ${maxF}`)
    const k = await vantaKlar(5, 6000)
    ok('bana 5 -> bana 6 byggs', k.nasta, `res efter ${k.resT} ms, nasta ${k.nasta}`)
    const h = await hemmaStampar()
    ok('stampar aterhamtade efter banbyte', h.every((d) => d <= 2), `avstand till hem: ${h}`)
  }

  // ====================== BANA 6: lose + exit mitt i firandet ======================
  if ((await state()).lvl !== 6) { await page.evaluate(() => { const b = window.__barnspel; b.game._buildLevel(b.ctx, 6) }); await page.waitForTimeout(800) }
  {
    const r = await losBana('bana6', { otalig: true })
    ok('bana 6: drag landar + vrids ratt', r.landade === r.antal && r.vridna === r.antal && r.antal > 0, `land ${r.landade}/${r.antal}, vrid ${r.vridna}/${r.antal}`)
    const t0 = Date.now()
    while (Date.now() - t0 < 30000 && !(await state()).res) await page.waitForTimeout(50)
    // exit mitt i firandet (blomman slar ut, Elvira hoppar, beröm pagar)
    await page.waitForTimeout(500)
    const pre = await state()
    const felFore = errors.length
    const g1 = await gsapInfo()
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(2500)
    const g2 = await gsapInfo()
    ok('exit mitt i firandet: 0 nya fel', errors.length === felFore && pre.res, `res ${pre.res}, nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
    ok('exit: inga tweens mot forstorda noder', g2.dead === 0, `fore ${g1.n} tweens (${g1.dead} dode), efter ${g2.n} (${g2.dead} dode ${JSON.stringify(g2.deadKinds)})`)
  }

  // ====================== exit mitt i ett DRAG ======================
  await gaIn()
  {
    const a = await scr({ k: 'anystamp' }), b = await scr({ k: 'cell', col: 2, row: 1 })
    await page.mouse.move(a.x, a.y); await page.mouse.down()
    for (let i = 1; i <= 8; i++) { await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8); await page.waitForTimeout(16) }
    const felFore = errors.length
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.mouse.move(b.x + 20, b.y + 10, { steps: 3 })
    await page.mouse.up()
    await page.waitForTimeout(2500)
    const g3 = await gsapInfo()
    ok('exit mitt i ett drag (fingret kvar): 0 nya fel', errors.length === felFore, `nya fel ${errors.length - felFore}${errors.length > felFore ? ' ' + errors.slice(felFore, felFore + 2).join(' | ') : ''}`)
    ok('exit i drag: inga tweens mot forstorda noder', g3.dead === 0, `${g3.n} tweens, ${g3.dead} dode ${JSON.stringify(g3.deadKinds)}`)
  }
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | ') || '0')
} finally {
  await browser.close()
}
console.log(`\n  ${ID} — nattsond\n`)
for (const r of rader) console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(58)} ${r.text}`)
console.log(`\n  ${rader.filter((r) => r.ok).length}/${rader.length} grona\n`)
