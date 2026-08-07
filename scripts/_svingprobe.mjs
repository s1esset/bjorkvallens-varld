// Mäter polerings-omgången i spindel-zacke-svingar SOM SPELAREN möter den:
// riktiga mustryck i släpp-fönstret, aldrig setLevel-genvägar för själva spelandet.
//
// Punkter:
//   1. 📏-tryck ritar en spök-båge (ghost-Graphics får geometri direkt).
//   2. Lång och kort nät ger OLIKA båge — Lång når mätbart längre (bounds.maxX).
//   3. Bågen tonar bort av sig själv (~2,3 s) och lämnar tom Graphics.
//   4. Spelaren når målet via egna släpp i framåt-bågen (ingen moln-loop krävs).
//   5. Vinstscenen står rätt: Zacke PÅ taket, Elvira framsprungen intill,
//      kattungen upphoppad i famnen (positioner mätta mitt i scenen).
//   6. Nästa nivå byggs och spelet är spelbart igen (state 'swing', nivå +1).
//   7. Exit MITT I vinstscenen (under Elvira-löpningen) → 0 nya konsolfel.
//
//   node scripts/_svingprobe.mjs [--shot-ghost a.png] [--shot-win b.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shotGhost = opt('--shot-ghost', '')
const shotWin = opt('--shot-win', '')
const ID = 'spindel-zacke-svingar'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const ok = (namn, pass, detalj) => results.push({ namn, pass, detalj })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  const open = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1200)
    // Exponera modul-singletonen EN gång — waitForFunction-predikat måste vara synkrona
    // (ett async-predikat returnerar en Promise som alltid är truthy → falsk träff direkt).
    await page.evaluate(async (gid) => {
      window.__probeGame = (await import('/src/games/registry.js')).getGame(gid)
    }, ID)
  }
  const leave = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(500)
  }
  const state = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('spindel-zacke-svingar')
    if (!g) return null
    const gb = g._ghost && !g._ghost.destroyed ? g._ghost.getLocalBounds() : null
    const goal = g._anchors?.[g._anchors.length - 1]
    return {
      state: g._state,
      resolving: !!g._resolving,
      theta: g._theta,
      omega: g._omega,
      ropeLen: g._ropeLen,
      level: g._level,
      anchors: g._anchors?.length ?? 0,
      goalX: goal?.x ?? null,
      z: { x: Math.round(g._zacke?.x ?? -1), y: Math.round(g._zacke?.y ?? -1) },
      elvira: g._elvira && !g._elvira.destroyed ? { x: Math.round(g._elvira.x), y: Math.round(g._elvira.y) } : null,
      kitten: g._kitten && !g._kitten.destroyed ? { x: Math.round(g._kitten.x), y: Math.round(g._kitten.y) } : null,
      ghost: gb ? { w: Math.round(gb.width), maxX: Math.round(gb.maxX), alpha: g._ghost.alpha } : null,
    }
  })
  const toScreen = async (x, y) => page.evaluate(([dx, dy]) => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return { x: (window.innerWidth - 1280 * s) / 2 + dx * s, y: (window.innerHeight - 720 * s) / 2 + dy * s }
  }, [x, y])
  const tapDesign = async (x, y) => {
    const p = await toScreen(x, y)
    await page.mouse.click(p.x, p.y)
  }

  // ---- 1–3: spök-bågen ----------------------------------------------------
  await open()
  await tapDesign(130, 650) // 📏 → Lång
  await page.waitForTimeout(300)
  const sLong = await state()
  ok('1. spök-båge ritas vid längd-tryck', !!sLong.ghost && sLong.ghost.w > 100,
    sLong.ghost ? `bredd ${sLong.ghost.w}px, maxX ${sLong.ghost.maxX}` : 'ingen geometri')
  if (shotGhost) await page.screenshot({ path: shotGhost })
  const longMaxX = sLong.ghost?.maxX ?? 0
  await page.waitForTimeout(600)
  await tapDesign(130, 650) // 📏 → Kort
  await page.waitForTimeout(300)
  const sShort = await state()
  const shortMaxX = sShort.ghost?.maxX ?? 0
  ok('2. lång båge når mätbart längre än kort', longMaxX - shortMaxX > 40,
    `Lång maxX ${longMaxX} vs Kort maxX ${shortMaxX} (diff ${longMaxX - shortMaxX}px)`)
  await page.waitForTimeout(2400)
  const sFade = await state()
  ok('3. bågen tonar bort och städas', !sFade.ghost || sFade.ghost.w === 0,
    sFade.ghost ? `bredd ${sFade.ghost.w}, alpha ${sFade.ghost.alpha}` : 'tom')

  // ---- 4: spela till målet med egna släpp i framåt-bågen ------------------
  let releases = 0
  let reachedGoal = false
  const t0 = Date.now()
  while (Date.now() - t0 < 45000) {
    const hit = await page
      .waitForFunction(() => {
        const g = window.__probeGame
        if (!g) return false
        if (g._resolving) return 'goal'
        return g._state === 'swing' && g._omega > 0.02 && g._theta >= 0.55 && g._theta <= 0.85 ? 'tap' : false
      }, null, { timeout: 15000, polling: 30 })
      .then((h) => h.jsonValue())
      .catch(() => null)
    if (hit === 'goal') { reachedGoal = true; break }
    if (hit === 'tap') {
      await tapDesign(900, 260)
      releases++
      await page.waitForTimeout(700)
    } else break
  }
  ok('4. spelaren når målet med egna tajmade släpp', reachedGoal, `${releases} släpp`)

  // ---- 5: vinstscenens positioner (mitt i scenen, efter kattung-hoppet) ----
  const sGoal = await state()
  await page.waitForTimeout(1750)
  const sWin = await state()
  if (shotWin) await page.screenshot({ path: shotWin })
  const lx = (sGoal.goalX ?? 0) - 64
  const zOk = sWin.z && Math.abs(sWin.z.x - lx) < 6 && Math.abs(sWin.z.y - 462) < 6
  const eOk = sWin.elvira && Math.abs(sWin.elvira.x - (lx + 54)) < 6 && Math.abs(sWin.elvira.y - 520) < 3
  const kOk = sWin.kitten && Math.abs(sWin.kitten.x - (lx - 36)) < 6 && Math.abs(sWin.kitten.y - 468) < 6
  ok('5. vinstscenen står rätt (Zacke på taket, Elvira intill, kattungen i famnen)',
    !!(zOk && eOk && kOk),
    `z=${JSON.stringify(sWin.z)} elvira=${JSON.stringify(sWin.elvira)} kitten=${JSON.stringify(sWin.kitten)} (lx ${lx})`)

  // ---- 6: nästa nivå byggs och spelet lever igen --------------------------
  await page.waitForTimeout(1800)
  const sNext = await state()
  ok('6. nästa nivå byggs och spelet är spelbart igen',
    sNext.state === 'swing' && !sNext.resolving && sNext.level === (sGoal.level ?? 0) && sNext.anchors >= 3,
    `state=${sNext.state} nivå=${sNext.level} fästen=${sNext.anchors}`)

  // ---- 7: exit MITT I vinstscenen -----------------------------------------
  let winReleases = 0
  let winReached = false
  const t1 = Date.now()
  while (Date.now() - t1 < 45000) {
    const hit = await page
      .waitForFunction(() => {
        const g = window.__probeGame
        if (!g) return false
        if (g._resolving) return 'goal'
        return g._state === 'swing' && g._omega > 0.02 && g._theta >= 0.55 && g._theta <= 0.85 ? 'tap' : false
      }, null, { timeout: 15000, polling: 30 })
      .then((h) => h.jsonValue())
      .catch(() => null)
    if (hit === 'goal') { winReached = true; break }
    if (hit === 'tap') {
      await tapDesign(900, 260)
      winReleases++
      await page.waitForTimeout(700)
    } else break
  }
  const foreExit = errors.length
  if (winReached) {
    await page.waitForTimeout(800) // mitt i Elvira-löpningen + före kattung-hoppet
    await leave()
    await page.waitForTimeout(1500)
  }
  ok('7. exit mitt i vinstscenen ger 0 nya konsolfel',
    winReached && errors.length === foreExit,
    winReached ? (errors.slice(foreExit).join(' | ') || 'inga') : `nådde inte målet (${winReleases} släpp)`)

  console.log('')
  let fel = 0
  for (const r of results) {
    if (!r.pass) fel++
    console.log(`  ${r.pass ? '✓' : '✗'} ${r.namn}  —  ${r.detalj}`)
  }
  console.log('')
  console.log(`  ${results.length - fel}/${results.length} gröna · ${errors.length} konsolfel totalt`)
  if (errors.length) console.log('  ' + errors.slice(0, 5).join('\n  '))
  process.exitCode = fel ? 1 : 0
} finally {
  await browser.close()
}
