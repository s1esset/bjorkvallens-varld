// Sond: SPELAR glittergrottan runda för runda och mäter tre saker som gröna test
// inte ser:
//   1. petzonen — ingen kristallplats får hamna bakom glimmerdjuret (dy>500 & dx<396)
//   2. kamera-driften — vaknar efter ~2.5s idle, lägger sig efter tryck
//   3. kub-formregeln — n=6 ska bygga 2/2/2 (första/andra/kub) och gå att klara
// Sonden trycker via riktiga PointerEvents på worldToDesign-positioner — den
// verifierar alltså också att pick() träffar rätt MEDAN kameran driftar.
//
//   node scripts/_glitterprobe.mjs [rundor]
import { chromium } from 'playwright'

const roundsMax = Number(process.argv[2] || 14)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const out = { rundor: [], drift: {}, kubrunda: null, zonbrott: [], errors: [] }

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => out.errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  // Den KÖRANDE modulinstansen exponeras av GameHost (DEV-only) — en egen import
  // av spel-URL:en kan ge en annan instans så fort Vite HMR-stämplat modulen.
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'glittergrottan' }))
  await page.waitForFunction(
    () => window.__barnspel.game && window.__barnspel.game._phase === 'play',
    null, { timeout: 15000 })
  await page.evaluate(() => { window.__mod = window.__barnspel.game })

  // --- 2. kamera-drift: idla 4.5s → driften ska vara vaken; tryck → ska lägga sig ---
  await page.waitForTimeout(4500)
  out.drift.puls = await page.evaluate(async () => {
    const m = window.__mod
    const L = m._layer
    const probe = () => ({ elapsed: +L._elapsed.toFixed(2), updates: L._updates.size, noTap: +m._noTap.toFixed(2), drift: +m._drift.toFixed(3) })
    const a = probe()
    await new Promise((r) => setTimeout(r, 1000))
    return { fore: a, efter: probe() }
  })
  out.drift.vaken = await page.evaluate(() =>
    Math.hypot(window.__mod._layer.camera.position.x, window.__mod._layer.camera.position.y).toFixed(2))
  await page.evaluate(() => {
    // OBS: med ThreeLayer finns TVÅ canvasar — three-canvasen ligger först (pointer-
    // events: none). Pixi-canvasen är den som lyssnar; ta den sista.
    const cvs = document.querySelectorAll('canvas')
    const cv = cvs[cvs.length - 1]
    const r = cv.getBoundingClientRect()
    for (const t of ['pointerdown', 'pointerup']) {
      cv.dispatchEvent(new PointerEvent(t, {
        clientX: r.left + 640, clientY: r.top + 680,
        pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
      }))
    }
  })
  await page.waitForTimeout(1400)
  out.drift.efterTryck = await page.evaluate(() =>
    Math.hypot(window.__mod._layer.camera.position.x, window.__mod._layer.camera.position.y).toFixed(2))

  // --- spela rundor: läs plan, kolla petzon, tryck i rangordning ---
  const readRound = () => page.evaluate(() => {
    const m = window.__mod
    return {
      level: m._level, rule: m._rule, formCube: !!m._formCube, n: m._crystals.length,
      crystals: m._crystals.map((c) => ({ dx: Math.round(c.dx), dy: Math.round(c.dy), shape: c.shape, rank: c.rank })),
    }
  })

  const playRound = () => page.evaluate(async () => {
    const m = window.__mod
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const cvs = document.querySelectorAll('canvas')
    const cv = cvs[cvs.length - 1] // Pixi-canvasen (three-canvasen ligger först, utan lyssnare)
    const tap = (x, y) => {
      const r = cv.getBoundingClientRect()
      for (const t of ['pointerdown', 'pointerup']) {
        cv.dispatchEvent(new PointerEvent(t, {
          clientX: r.left + x, clientY: r.top + y,
          pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
        }))
      }
    }
    // Räkna att trycken faktiskt når spelets _tap (skiljer "event försvann" från
    // "pick missade").
    if (!m.__tapPatched) {
      m.__tapPatched = true
      m.__tapCount = 0
      const orig = m._tap
      m._tap = function (...a) {
        m.__tapCount++
        return orig.apply(this, a)
      }
    }
    // Låt inväxt-animationen (~0.9s) bli klar innan vi trycker — hit-sfären växer
    // med mesh.scale och är osynligt liten i början.
    await sleep(1000)
    const cs = m._crystals.slice().sort((a, b) => a.rank - b.rank)
    for (const c of cs) {
      for (let a = 0; a < 5 && !c.lit; a++) {
        const d = m._layer.worldToDesign(c.mesh.position)
        tap(d.x, d.y)
        await sleep(320)
      }
      if (!c.lit) {
        const d = m._layer.worldToDesign(c.mesh.position)
        return {
          ok: false,
          fastnade: {
            shape: c.shape, rank: c.rank, x: Math.round(d.x), y: Math.round(d.y),
            skala: +c.mesh.scale.x.toFixed(3),
            direktPick: m._layer.pick(d.x, d.y, [c.mesh], true).length,
            mwPos: [12, 13, 14].map((i) => Math.round(c.mesh.matrixWorld.elements[i])),
            pickEfterMwUppdatering: (() => {
              c.mesh.updateMatrixWorld(true)
              m._layer.camera.updateMatrixWorld(true)
              return m._layer.pick(d.x, d.y, [c.mesh], true).length
            })(),
            tapCount: m.__tapCount,
            fogged: !!c.fogged, moln: m._clouds.length, miss: m._miss, steg: m._step,
            tanda: m._crystals.filter((k) => k.lit).length, fas: m._phase,
          },
        }
      }
    }
    return { ok: true }
  })

  const waitFreshRound = () => page.waitForFunction(
    () => window.__mod._phase === 'play' && window.__mod._crystals.every((c) => !c.lit),
    null, { timeout: 25000 })

  for (let i = 0; i < roundsMax; i++) {
    const info = await readRound()
    for (const c of info.crystals) {
      if (c.dy > 500 && c.dx < 396) out.zonbrott.push({ level: info.level, ...c })
    }
    const res = await playRound()
    out.rundor.push({ level: info.level, rule: info.rule, formCube: info.formCube, n: info.n, ok: res.ok, ...(res.ok ? {} : res) })
    if (info.formCube && res.ok) {
      const counts = {}
      info.crystals.forEach((c) => { counts[`${c.shape}:${c.rank}`] = (counts[`${c.shape}:${c.rank}`] || 0) + 1 })
      out.kubrunda = { level: info.level, counts }
    }
    if (!res.ok) break
    if (out.kubrunda && i >= 9) break
    await waitFreshRound()
  }

  // Saknas kub-rundan (slumpen valde aldrig form på nivå 6+): bygg om via snabb
  // ut/in-navigering tills form dyker upp, och spela den då.
  let respawn = 0
  while (!out.kubrunda && respawn++ < 15) {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForFunction(() => !window.__barnspel.game, null, { timeout: 10000 })
    await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'glittergrottan' }))
    // _alive blir true först i init — skiljer färskt läge från kvarvarande gammalt.
    try {
      await page.waitForFunction(
        () => window.__barnspel.game && window.__barnspel.game._alive && window.__barnspel.game._phase === 'play',
        null, { timeout: 15000 })
    } catch {
      out.respawnFel = await page.evaluate(() => ({
        harGame: !!window.__barnspel.game,
        alive: window.__barnspel.game?._alive ?? null,
        phase: window.__barnspel.game?._phase ?? null,
        canvasar: document.querySelectorAll('canvas').length,
      }))
      break
    }
    const info = await readRound()
    if (info.rule !== 'form') continue
    for (const c of info.crystals) {
      if (c.dy > 500 && c.dx < 396) out.zonbrott.push({ level: info.level, ...c })
    }
    const res = await playRound()
    out.rundor.push({ level: info.level, rule: info.rule, formCube: info.formCube, n: info.n, ok: res.ok, respawn: true })
    if (info.formCube && res.ok) {
      const counts = {}
      info.crystals.forEach((c) => { counts[`${c.shape}:${c.rank}`] = (counts[`${c.shape}:${c.rank}`] || 0) + 1 })
      out.kubrunda = { level: info.level, counts }
    }
  }

  console.log(JSON.stringify(out, null, 2))
} finally {
  await browser.close()
}
