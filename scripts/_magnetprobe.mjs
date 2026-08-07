// Magnetfiske-sond: mäter ägarens två rapporterade fel i stället för att resonera om dem.
//
//   A) PASSIV — spelet laddas och INGET rörs på 8 s. Rapporterar hur många metallsaker
//      som fastnar av sig själva, när den första gör det, och hur många som hamnar
//      OVANFÖR dammens toppvägg (= tunnlat igenom den vid hög fart).
//   B) JITTER — magneten dras på en sak tills den fastnar och hålls sedan STILLA.
//      Fastklistrade saker ska ligga på en fast offset från magneten; sonden mäter hur
//      mycket den offseten skakar (max avvikelse + hopp mellan bildrutor) för både
//      kroppen och den synliga vyn.
//
//   node scripts/_magnetprobe.mjs [nivå]      (default 3 = full damm, 5 metall + 3 kork)
import { chromium } from 'playwright'

const ID = 'magnet-fiske'
const LVL = Number(process.argv[2] ?? 3)
const WALL_TOP = 200 // POND.y0 — kroppens centrum kan aldrig nå hit utan att tunnla

const snap = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    if (!g?._items) return null
    return {
      mx: g._magnet.x,
      my: g._magnet.y,
      caught: g._caught,
      needed: g._needed,
      stuck: g._stuck.length,
      items: g._items.map((it) => ({
        metal: it.metal,
        stuck: !!it.stuck,
        delivered: !!it.delivered,
        slot: it.slot,
        bx: it.body.position.x,
        by: it.body.position.y,
        spd: it.body.speed,
        vx: it.view && !it.view.destroyed ? it.view.x : null,
        vy: it.view && !it.view.destroyed ? it.view.y : null,
      })),
    }
  }, ID)

const stat = (xs) => {
  if (!xs.length) return { min: 0, max: 0, spann: 0 }
  const min = Math.min(...xs)
  const max = Math.max(...xs)
  return { min, max, spann: max - min }
}
const r1 = (v) => Number(v.toFixed(1))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(
    ({ gid, lvl }) => {
      const s = window.__barnspel.save
      s.update((d) => {
        const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
        if (!p) return
        p.games = p.games || {}
        p.games[gid] = { ...(p.games[gid] || { unlocked: true, stars: 0, custom: {} }), highestLevel: lvl }
      })
      s.flush()
    },
    { gid: ID, lvl: LVL },
  )
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(900)

  console.log(`\n  Magnetsond — ${ID}, nivå ${LVL}\n`)

  // ---- A) PASSIV: rör ingenting -------------------------------------------
  const s0 = await snap(page)
  const metalN = s0.items.filter((i) => i.metal).length
  console.log(`  A) PASSIV — ${metalN} metall + ${s0.items.length - metalN} kork, magnet parkerad (${r1(s0.mx)}, ${r1(s0.my)})`)
  console.log(`     start: ${s0.items.filter((i) => i.metal).map((i) => `(${Math.round(i.bx)},${Math.round(i.by)})`).join(' ')}`)

  let firstStick = null
  let maxSpd = 0
  let tunneled = 0
  const seenTunnel = new Set()
  for (let k = 0; k <= 80; k++) {
    const s = await snap(page)
    if (!s) break
    const t = k * 100
    for (const [i, it] of s.items.entries()) {
      if (it.spd > maxSpd) maxSpd = it.spd
      if (it.by < WALL_TOP && !seenTunnel.has(i) && !it.delivered) {
        seenTunnel.add(i)
        tunneled++
      }
    }
    if (firstStick == null && s.stuck > 0) firstStick = t
    if (k % 20 === 0 || (firstStick != null && t === firstStick)) {
      console.log(`     t=${String(t).padStart(4)} ms  fast=${s.stuck}  i hinken=${s.caught}/${s.needed}  toppfart=${r1(maxSpd)} px/steg`)
    }
    await page.waitForTimeout(100)
  }
  const sEnd = await snap(page)
  const fastnat = sEnd.items.filter((i) => i.stuck).length
  const levererat = sEnd.caught
  console.log(`\n     ► utan ett enda tryck: ${fastnat} fast + ${levererat} redan i hinken av ${metalN} metall`)
  console.log(`     ► första fastnandet: ${firstStick == null ? 'aldrig' : firstStick + ' ms'}`)
  console.log(`     ► saker ovanför toppväggen (tunnlat): ${tunneled}   toppfart: ${r1(maxSpd)} px/steg\n`)

  // ---- B) JITTER: dra magneten på en sak, håll den sedan stilla ------------
  let s = await snap(page)
  let target = s.items.find((i) => i.metal && !i.stuck && !i.delivered)
  if (target) {
    await page.mouse.move(s.mx, s.my)
    await page.mouse.down()
    // dra i etapper så globalpointermove hinner följa med
    for (let k = 1; k <= 12; k++) {
      const cur = await snap(page)
      const tg = cur.items.find((i) => i.metal && !i.stuck && !i.delivered)
      if (!tg) break
      await page.mouse.move(cur.mx + (tg.bx - cur.mx) * (k / 12), cur.my + (tg.by - cur.my) * (k / 12))
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(500)
  }
  s = await snap(page)
  console.log(`  B) JITTER — ${s.stuck} sak(er) fast, magneten hålls stilla i 1,5 s`)

  // Offset kropp→magnet och vy→magnet ska vara KONSTANT för en fastklistrad sak.
  const series = new Map() // itemIndex -> { bx:[], by:[], vx:[], vy:[] }
  const t0 = Date.now()
  let frames = 0
  while (Date.now() - t0 < 1500) {
    const q = await snap(page)
    if (!q) break
    frames++
    for (const [i, it] of q.items.entries()) {
      if (!it.stuck || it.delivered) continue
      if (!series.has(i)) series.set(i, { bx: [], by: [], vx: [], vy: [] })
      const e = series.get(i)
      e.bx.push(it.bx - q.mx)
      e.by.push(it.by - q.my)
      if (it.vx != null) {
        e.vx.push(it.vx - q.mx)
        e.vy.push(it.vy - q.my)
      }
    }
  }
  console.log(`     ${frames} prov`)
  if (!series.size) console.log('     (ingen sak fastnade — inget att mäta)')
  for (const [i, e] of series) {
    const hop = (xs, ys) => {
      let m = 0
      for (let k = 1; k < xs.length; k++) m = Math.max(m, Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]))
      return m
    }
    const bxs = stat(e.bx)
    const bys = stat(e.by)
    const vxs = stat(e.vx)
    const vys = stat(e.vy)
    console.log(
      `     sak ${i}: kropp-offset spann x ${r1(bxs.spann)} / y ${r1(bys.spann)} px, max hopp ${r1(hop(e.bx, e.by))} px` +
        `  |  VY-offset spann x ${r1(vxs.spann)} / y ${r1(vys.spann)} px, max hopp ${r1(hop(e.vx, e.vy))} px`,
    )
  }

  console.log(`\n  ${errors.length ? '✗ ' + errors.join(' | ') : '✓ 0 konsolfel'}\n`)
} finally {
  await browser.close()
}
