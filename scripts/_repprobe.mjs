// Sond för poleringsomgången i natskott-pa-stan: MÄTER de tre nya sakerna i stället
// för att lita på att de "känns" rätt.
//
//   1. Elastisk indragning — spelar in repets vilolängd, kroppens fart och slack-
//      flaggan varje bildruta under en hemdragning. Rapporterar hemtid, antal RYCK
//      (slakt → spänt), toppfart och hur långt kroppen hann falla när repet var slakt.
//      Ett rep som bara drar rakt hem ger 0 ryck — det är felet vi vill kunna se.
//   2. Fönstermonster — krossar rutor tills ett monster tittar ut, fångar det med
//      BÅDA näten och verifierar att klibbnätet håller kvar det i hålet och att
//      dragnätet ger en ny vän i baksätet.
//   3. Pakettjuven — tvingar fram en stöld, verifierar taket (aldrig samtidigt som
//      skatan), att paketet faktiskt lyfts, och att ett nät på monstret ger tillbaka det.
//
//   node scripts/_repprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const url = opt('--url', 'http://localhost:5173')
const ID = 'natskott-pa-stan'

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 300)))

const tap = (x, y) =>
  page.evaluate(
    ({ x, y }) => {
      const cvs = document.querySelectorAll('canvas')
      const cv = cvs[cvs.length - 1]
      const r = cv.getBoundingClientRect()
      for (const t of ['pointerdown', 'pointerup']) {
        cv.dispatchEvent(
          new PointerEvent(t, {
            clientX: r.left + x,
            clientY: r.top + y,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            bubbles: true,
            isPrimary: true,
          }),
        )
      }
    },
    { x, y },
  )

const M = () => page.evaluate(() => (window.__natdbg && window.__natdbg._alive ? true : false))
const set = (fn) => page.evaluate(fn)

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1400)
if (!(await M())) {
  console.log('spelet startade inte'), await browser.close(), process.exit(1)
}

// ---- in-page inspelare: en rAF-loop som samplar netted-kroppar -----------------
await set(() => {
  const m = window.__natdbg
  window.__rep = { rows: [], on: false }
  const loop = () => {
    if (!window.__natdbg || !window.__natdbg._alive) return
    if (window.__rep.on) {
      for (const r of m._targets || []) {
        if (!r.netted) continue
        window.__rep.rows.push({
          t: performance.now(),
          kind: r.kind,
          x: Math.round(r.view.x),
          y: Math.round(r.view.y),
          reel: Math.round(r.reel || 0),
          slack: !!r.slack,
          v: +Math.hypot(r.body.velocity.x, r.body.velocity.y).toFixed(2),
          pts: r.rope ? r.rope.pts.length : 0,
          dbg: r.dbg ? `d${r.dbg.d}/str${r.dbg.stretch}/satt${r.dbg.vx}${r.dbg.sens ? '/sensor' : ''}${r.dbg.stat ? '/STATISK' : ''}` : '',
          // hur mycket repet hänger: största avvikelsen från raka linjen hand→kropp
          sag: r.rope ? bow(r.rope.pts) : 0,
        })
      }
    }
    requestAnimationFrame(loop)
  }
  function bow(p) {
    const a = p[0]
    const b = p[p.length - 1]
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1
    let mx = 0
    for (const q of p) {
      const d = Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / L
      if (d > mx) mx = d
    }
    return Math.round(mx)
  }
  requestAnimationFrame(loop)
})

const state = () =>
  page.evaluate(() => {
    const m = window.__natdbg
    return {
      mode: m._mode,
      phase: m._phase,
      seat: (m._seatList || []).length,
      broken: m._brokenCount | 0,
      thief: m._thief ? m._thief.phase : null,
      skata: !!m._skata,
      targets: (m._targets || []).map((r) => ({
        kind: r.kind,
        x: Math.round(r.view.x),
        y: Math.round(r.view.y),
        r: r.r,
        stuck: !!r.stuck,
        netted: !!r.netted,
      })),
      monsters: (m._mid || []).flatMap((s) =>
        (s.wins || [])
          .filter((w) => w.mc && !w.mc.destroyed)
          .map((w) => ({ x: Math.round(s.c.x + w.lx), y: Math.round(w.cy + 6), caught: w.mc._wxCaught || null, art: w.mc._wxArt || null })),
      ),
      windows: (m._mid || []).flatMap((s) =>
        (s.wins || [])
          .filter((w) => w.state === 'ok' && s.c.x + w.lx > 120 && s.c.x + w.lx < 1180 && w.cy > 120)
          .map((w) => ({ x: Math.round(s.c.x + w.lx), y: Math.round(w.cy) })),
      ),
    }
  })

const setMode = async (mode) => {
  if ((await state()).mode === mode) return
  await tap(168, 652) // växelknappen
  await page.waitForTimeout(260)
}

const out = []
const say = (s) => {
  out.push(s)
  console.log(s)
}

// =============================================================== 1. elastiskt rep
await setMode('drag')
let reelRuns = []
for (let attempt = 0; attempt < 14 && reelRuns.length < 3; attempt++) {
  const st = await state()
  // sista mätningen SKA vara ett markdjur — de betedde sig annorlunda i en tidig
  // körning (2 px/steg mot luftmålens 15), och den skillnaden får inte gå omätt
  const markDjur = reelRuns.length >= 2
  const cand = st.targets.find(
    (t) => !t.netted && t.x > 620 && t.x < 1180 && t.y > 120 && (!markDjur || t.kind === 'katt' || t.kind === 'hund' || t.kind === 'monster'),
  )
  if (!cand) {
    await set(() => (window.__natdbg._spawnTimer = 0.02))
    await page.waitForTimeout(700)
    continue
  }
  await set(() => {
    window.__rep.rows = []
    window.__rep.on = true
  })
  const t0 = Date.now()
  await tap(cand.x, cand.y)
  // vänta tills kroppen är hemma (eller ge upp)
  let landed = false
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(50)
    const s2 = await state()
    if (!s2.targets.some((t) => t.netted)) {
      landed = true
      break
    }
  }
  const rows = await page.evaluate(() => {
    window.__rep.on = false
    return window.__rep.rows
  })
  if (!landed || rows.length < 6) continue
  let ryck = 0
  let prev = rows[0].slack
  let maxV = 0
  let maxSag = 0
  let slackFrames = 0
  for (const r of rows) {
    if (r.slack !== prev) {
      if (!r.slack) ryck++ // slakt → spänt = ett ryck
      prev = r.slack
    }
    if (r.slack) slackFrames++
    if (r.v > maxV) maxV = r.v
    if (r.sag > maxSag) maxSag = r.sag
  }
  reelRuns.push({
    kind: rows[0].kind,
    ms: Date.now() - t0,
    frames: rows.length,
    ryck,
    slackAndel: +(slackFrames / rows.length).toFixed(2),
    maxV: +maxV.toFixed(1),
    maxSag,
    pts: rows[0].pts,
    spar: rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 8)) === 0).map((r) => `${r.reel}|${r.v}|${r.slack ? 'S' : 't'}|${r.dbg}`),
  })
}
say('1. ELASTISK INDRAGNING')
if (!reelRuns.length) say('   ✗ ingen hemdragning gick att mäta')
for (const r of reelRuns) {
  say(
    `   ${r.kind.padEnd(8)} hemtid ${String(r.ms).padStart(4)} ms · ${r.frames} rutor · RYCK ${r.ryck} · slakt ${Math.round(r.slackAndel * 100)}% · toppfart ${r.maxV} px/steg · repets största båge ${r.maxSag} px · ${r.pts} repunkter`,
  )
  say(`            spår (vilolängd|fart|Slakt/spänt): ${r.spar.join('  ')}`)
}
const ryckSnitt = reelRuns.length ? reelRuns.reduce((a, b) => a + b.ryck, 0) / reelRuns.length : 0
const sagSnitt = reelRuns.length ? reelRuns.reduce((a, b) => a + b.maxSag, 0) / reelRuns.length : 0
say(`   → snitt ${ryckSnitt.toFixed(1)} ryck och ${sagSnitt.toFixed(0)} px båge per hemdragning (0 ryck = inte elastiskt, 0 px båge = rakt streck)`)

// ========================================================== 2. fönstermonster
say('2. FÖNSTERMONSTER')
let mons = null
for (let i = 0; i < 26 && !mons; i++) {
  const st = await state()
  if (st.monsters.length) {
    mons = st.monsters[0]
    break
  }
  const w = st.windows[(Math.random() * st.windows.length) | 0]
  if (!w) {
    await page.waitForTimeout(400)
    continue
  }
  await tap(w.x, w.y)
  await page.waitForTimeout(320)
}
if (!mons) say('   ✗ inget fönstermonster dök upp på 26 försök')
else {
  say(`   monster i ruta vid (${mons.x}, ${mons.y}) — art ${mons.art}`)
  // a) klibbnätet ska hålla kvar det i hålet
  await setMode('klibb')
  const m2 = (await state()).monsters[0]
  if (m2) {
    await tap(m2.x, m2.y)
    await page.waitForTimeout(320)
    const after = (await state()).monsters.find((x) => Math.abs(x.x - m2.x) < 90)
    say(`   klibbnät → ${after ? `fast i hålet (caught=${after.caught})` : '✗ försvann direkt'}`)
    await page.waitForTimeout(2600)
    const gone = !(await state()).monsters.some((x) => Math.abs(x.x - m2.x) < 120)
    say(`   klibbnät → kryper in igen efter ~2,5 s: ${gone ? 'ja' : 'nej (sitter kvar)'}`)
  }
  // b) dragnätet ska ge en ny vän i baksätet
  await setMode('drag')
  let m3 = null
  for (let i = 0; i < 24 && !m3; i++) {
    const st = await state()
    m3 = st.monsters.find((x) => !x.caught) || null
    if (m3) break
    const w = st.windows[(Math.random() * st.windows.length) | 0]
    if (w) await tap(w.x, w.y)
    await page.waitForTimeout(320)
  }
  if (!m3) say('   ✗ hittade inget nytt monster att dra hem')
  else {
    const seatFore = (await state()).seat
    await tap(m3.x, m3.y)
    await page.waitForTimeout(220)
    const netted = (await state()).targets.some((t) => t.kind === 'monster' && t.netted)
    let seatEfter = seatFore
    const spar = []
    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(60)
      const s3 = await state()
      seatEfter = s3.seat
      const mm = s3.targets.find((t) => t.kind === 'monster' && t.netted)
      if (i % 10 === 0) spar.push(mm ? `${mm.x},${mm.y}` : '—')
      if (seatEfter > seatFore) break
    }
    say(`   dragnät → kropp i luften: ${netted ? 'ja' : 'NEJ'} · baksätet ${seatFore} → ${seatEfter} ${seatEfter > seatFore ? '✓' : '✗'}`)
    if (seatEfter === seatFore) say(`            monstrets väg (var 0,6 s): ${spar.join(' → ')}`)
  }
}

// ============================================================== 3. pakettjuven
say('3. PAKETTJUVEN')
await set(() => {
  const m = window.__natdbg
  m._skata = null
  m._heistTimer = 0.05
  m._spawnTimer = 0.02
})
let heist = null
for (let i = 0; i < 70; i++) {
  await page.waitForTimeout(200)
  const st = await state()
  if (st.thief) {
    heist = st
    if (st.thief === 'bar') break
  }
  if (i % 6 === 0) {
    await set(() => {
      const m = window.__natdbg
      m._heistTimer = Math.min(m._heistTimer, 0.05)
      if ((m._targets || []).filter((r) => r.kind === 'monster').length < 1) m._spawnTimer = 0.02
      if ((m._targets || []).filter((r) => r.kind === 'paket').length < 1) m._spawnTimer = 0.02
    })
  }
}
if (!heist) say('   ✗ ingen stöld startade på 14 s')
else {
  const st = await state()
  say(`   tjuv aktiv (fas ${st.thief}) · skata samtidigt: ${st.skata ? 'JA — taket brustet!' : 'nej ✓'}`)
  // paketet ska bäras: ligger tätt ovanför monstret
  const mo = st.targets.find((t) => t.kind === 'monster')
  const pa = st.targets.find((t) => t.kind === 'paket')
  if (mo && pa) say(`   paket ${Math.round(Math.hypot(pa.x - mo.x, pa.y - (mo.y - 68)))} px från bärpositionen ovanför monstret`)
  // näta tjuven → paketet ska tappas. Tjuven SPRINGER (3,1 px/steg), så positionen
  // måste läsas om i samma andetag som trycket — annars mäter sonden ett bomskott.
  if (mo) {
    await setMode('klibb')
    const nu = (await state()).targets.find((t) => t.kind === 'monster')
    if (nu) await tap(nu.x, nu.y)
    await page.waitForTimeout(500)
    const st2 = await state()
    say(`   nät på tjuven → tjuv kvar: ${st2.thief ? 'JA ✗' : 'nej ✓'} · paket kvar på gatan: ${st2.targets.some((t) => t.kind === 'paket') ? 'ja ✓' : 'nej ✗'}`)
  }
}

// ================================================================ exit-säkerhet
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(700)
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1200)
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(600)

say('')
say(errors.length ? `✗ ${errors.length} konsolfel:` : '✓ 0 konsolfel')
for (const e of errors.slice(0, 8)) say('   ' + e)
await browser.close()
process.exit(errors.length ? 1 : 0)
