// PEKAVBROTT (FYSIKPLAN M3): vad händer när fingret AVBRYTS i stället för att lyftas?
//
// En riktig surfplatta skickar `touchcancel` (palm-avvisning, systemgest, en notis som drar
// ned sidan) — och Pixi 8 lyssnar INTE på `pointercancel` (EventSystem.mjs:323-337 binder bara
// pointerdown/-move/-up/-leave/-over). Alltså kommer ALDRIG något `pointerup`/`pointerupoutside`,
// och varje spel som håller en "ett finger i taget"-flagga (`_grepp`, `active`, `_aiming`,
// `_fanGrab`) står kvar `true` för alltid. Sonden mäter om det faktiskt blir en död träffyta,
// per spel, med riktiga CDP-pekningar:
//
//   arm 0   KONTROLL  vanligt drag (`touchEnd`) → ett NYTT grepp efteråt ska fungera. Lyckas inte
//                     armen är spelets rad "omätt" — aldrig "ok" (död arm, fel grepplats).
//   arm 0b  räkna `pointercancel` på window när CDP skickar `touchCancel`. Är det 0 skickar
//                     sonden ett eget `new PointerEvent('pointercancel')` (märks "syntetisk").
//   arm A   `touchCancel` mitt i draget → kan en NY pekning (nytt finger-id) greppa?
//   arm B   två fingrar: finger 2 landar och rör sig medan finger 1 håller. Följer föremålet
//                     finger 1 (id-vakt) eller dras det av finger 2?
//
// "Greppet lyckades" = föremålet / siktet (`las`) flyttade sig ≥ N px (Pixi-globala px) med
// fingret. Spelets tillståndsflaggor skrivs ut bredvid men avgör inget — fenomenet är flytten.
//
//   node scripts/_pekavbrottprobe.mjs                      # alla sex, dev-servern på 5174
//   node scripts/_pekavbrottprobe.mjs sortera-skrap knuffa-tornet
//   node scripts/_pekavbrottprobe.mjs --url http://localhost:5173 --port 5173 --n 40
//
// ⚠️ Bara mot en DEV-server (läser `window.__barnspel`). Standard är :5174 — dev-servern UTAN
// HMR (`npx vite --config scripts/_vite-nohmr.mjs`) — så att en parallell agent som sparar en
// `src/`-fil inte laddar om sidan under en mätning. Kör aldrig bredvid en annan webbläsarsond.
import { chromium } from 'playwright'

const arg = (k, d) => {
  const i = process.argv.indexOf(k)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d
}
const PORT = arg('--port', '5174')
const BAS = arg('--url', `http://localhost:${PORT}`)
const N = Number(arg('--n', 40)) // minsta flytt (px) för att kalla ett grepp lyckat
const POSITIONELLA = process.argv.slice(2).filter((a, i, v) => !a.startsWith('--') && !(i > 0 && v[i - 1].startsWith('--')))

// ---------------------------------------------------------------------------------------------
// Per spel: var greppytan FAKTISKT sitter, vad som följer fingret, och vilka flaggor som kan fastna.
// Alla uttryck körs i sidan med `g` (spelet), `gl(obj,x,y)` (obj → Pixi-globalt) och `app`.
//   grepp  → {x,y} Pixi-globalt (null = ännu inte greppbart)
//   las    → {x,y} Pixi-globalt: det som SKA följa fingret (föremål, korg, siktets pekare)
//   dir    → hur långt fingret dras (Pixi-px)
//   f2     → var finger 2 landar (tomt fält, aldrig en knapp) och åt vilket håll det rör sig
//   flagg  → spelets egna "ett finger i taget"-flaggor (bara för utskriften)
//   klar   → är spelet redo för ett nytt grepp efter ett släpp? (väntas in upp till 25 s)
//   prep   → körs en gång efter montering (hakar t.ex. sikte-spelets pekare)
//   nolla  → körs före varje drag (nollar `las`-minnet)
// ---------------------------------------------------------------------------------------------
const SPEL = {
  'sortera-skrap': {
    grepp: `(() => { const it = g._items.find((i) => !i.sorted && !i.container.destroyed); return it ? gl(it.container) : null })()`,
    las: `(() => { const it = g._items.find((i) => !i.sorted && !i.container.destroyed) || g._items[0]; return gl(it.container) })()`,
    // Arm A nytt grepp på ETT ANNAT föremål: ett fastnat `active` kapar annars samma föremål via sin
    // egen globalpointermove-lyssnare och ser ut som ett lyckat grepp (mätt: 166 px på båda).
    grepp2: `(() => { const v = g._items.filter((i) => !i.sorted && !i.container.destroyed); return v[1] ? gl(v[1].container) : null })()`,
    las2: `(() => { const v = g._items.filter((i) => !i.sorted && !i.container.destroyed); return gl(v[1].container) })()`,
    dir: { x: 140, y: -90 },
    f2: { x: 1100, y: 160, dx: 0, dy: 140 },
    flagg: `({ active: !!g._drag?.active, vald: !!g._drag?.selected })`,
    klar: `!g._drag.active`,
  },
  spindelhjalten: {
    prep: `(() => { const L = g._launcher; if (L.__wrap) return; L.__wrap = true; const o = L._velFrom.bind(L); L._velFrom = (p) => { g.__pk = g._root.toGlobal(p); return o(p) } })()`,
    nolla: `(g.__pk = null)`,
    grepp: `g._launcher.enabled && g._hero && !g._hero.destroyed ? gl(g._hero) : null`,
    las: `g.__pk || gl(g._hero)`,
    dir: { x: -110, y: 45 },
    f2: { x: 800, y: 130, dx: 0, dy: 120 },
    flagg: `({ aiming: g._launcher._aiming, enabled: g._launcher.enabled })`,
    klar: `g._launcher.enabled && !g._launcher._aiming`,
  },
  popcornkalaset: {
    grepp: `(() => { const b = g._gryta.body.position; return g._root.toGlobal({ x: b.x, y: b.y }) })()`,
    las: `(() => { const b = g._gryta.body.position; return g._root.toGlobal({ x: b.x, y: b.y }) })()`,
    dir: { x: 140, y: -70 },
    f2: { x: 640, y: 120, dx: 120, dy: 0 },
    flagg: `({ grepp: g._grepp ? g._grepp.typ : null, lage: g._gryta.lage })`,
    klar: `!g._grepp && ['fri', 'park'].includes(g._gryta.lage) && Math.hypot(g._gryta.body.velocity.x, g._gryta.body.velocity.y) < 0.6`,
  },
  'knuffa-tornet': {
    grepp: `g._phase === 'aim' && g._ballView && !g._ballView.destroyed ? gl(g._ballView) : null`,
    las: `gl(g._ballView)`,
    dir: { x: -150, y: -30 },
    f2: { x: 1100, y: 160, dx: 0, dy: 120 },
    flagg: `({ aiming: g._aiming, fas: g._phase })`,
    klar: `g._phase === 'aim' && !g._aiming`,
  },
  'studsa-ner': {
    grepp: `gl(g._fan, 0, -18)`,
    las: `gl(g._fan)`,
    dirFn: `({ x: 0, y: g._fanY > 380 ? -100 : 100 })`, // alltid ≥ 100 px att gå åt, oavsett var fläkten står
    f2: { x: 640, y: 150, dx: 80, dy: 0 },
    flagg: `({ fanGrab: g._fanGrab, aiming: g._aiming })`,
    klar: `!g._fanGrab`,
  },
  'fanga-frukten': {
    // Hela duken är fångaren: greppet sätts i det tomma fältet, korgen följer fingret.
    grepp: `g._root.toGlobal({ x: g._basket.x, y: 300 })`,
    las: `g._root.toGlobal({ x: g._basket.x, y: g._basket.y })`,
    dirFn: `({ x: g._basket.x > 640 ? -320 : 320, y: 0 })`, // start-till-slut mäts: växla håll så korgen aldrig hamnar på samma plats
    f2: { x: 300, y: 250, dx: 0, dy: 100 },
    flagg: `({ dragging: g._dragging })`,
    klar: `true`,
  },
}
const SPELLISTA = POSITIONELLA.length ? POSITIONELLA : Object.keys(SPEL)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const allaFel = []
let syntetisk = null // beslutas av arm 0b

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true })
  let errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))
  const cdp = await page.context().newCDPSession(page)

  const G = (id, src) =>
    page.evaluate(async ([gid, s]) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const app = window.__barnspel.app
      const gl = (o, x = 0, y = 0) => { const p = o.toGlobal({ x, y }); return { x: p.x, y: p.y } }
      // eslint-disable-next-line no-eval
      return eval(s)
    }, [id, src])

  // Pixi-globalt → skärm (appens scaler ligger emellan).
  const skarm = (p) => page.evaluate(([x, y]) => {
    const app = window.__barnspel.app
    const c = app.canvas.getBoundingClientRect()
    const k = c.width / app.screen.width
    return { x: Math.round(c.left + x * k), y: Math.round(c.top + y * k), k }
  }, [p.x, p.y])

  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts })
  const vänta = (ms) => page.waitForTimeout(ms)

  // Ny sida per arm: ingen arm ärver förra armens tillstånd (en hållen flagga, en halvvägs kula).
  const oppna = async (id) => {
    errors = []
    await page.goto(BAS, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate(() => {
      const c = (window.__pc = { cancel: 0, up: 0, down: 0, lastId: 0 })
      window.addEventListener('pointercancel', () => c.cancel++, true)
      window.addEventListener('pointerup', () => c.up++, true)
      window.addEventListener('pointerdown', (e) => { c.down++; c.lastId = e.pointerId }, true)
    })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
    await vänta(1800)
    const s = SPEL[id]
    // Vänta tills greppet finns (introt/inbounce färdigt).
    for (let i = 0; i < 40; i++) {
      const ok = await G(id, `(() => { try { return !!(${s.grepp}) } catch { return false } })()`).catch(() => false)
      if (ok) break
      await vänta(250)
    }
    await vänta(900)
    if (s.prep) await G(id, s.prep)
  }

  const medFinger = async (id, f, fran, till, steg = 6) => {
    for (let i = 1; i <= steg; i++) {
      const x = Math.round(fran.x + ((till.x - fran.x) * i) / steg)
      const y = Math.round(fran.y + ((till.y - fran.y) * i) / steg)
      await touch('touchMove', [...f.andra(), { x, y, id: f.id }])
      await vänta(26)
    }
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  // Ett drag med ETT finger-id. Returnerar flytten av `las` mätt MEDAN fingret håller.
  // `slut`: 'upp' | 'avbryt' | 'kvar' (lämna fingret nere).
  const drag = async (id, fingerId, slut, annat = false) => {
    const s = SPEL[id]
    const greppEx = annat && s.grepp2 ? s.grepp2 : s.grepp
    const lasEx = annat && s.las2 ? s.las2 : s.las
    if (s.nolla) await G(id, s.nolla)
    const g0 = await G(id, greppEx)
    if (!g0) return { grepp: false, flytt: 0 }
    const l0 = await G(id, lasEx)
    const dir = s.dirFn ? await G(id, s.dirFn) : s.dir
    const a = await skarm(g0)
    const b = await skarm({ x: g0.x + dir.x, y: g0.y + dir.y })
    const f = { id: fingerId, andra: () => [] }
    await touch('touchStart', [{ x: a.x, y: a.y, id: fingerId }])
    await vänta(70)
    await medFinger(id, f, a, b, 7)
    await vänta(380)
    const l1 = await G(id, lasEx)
    const flagg = await G(id, s.flagg)
    if (slut === 'upp') await touch('touchEnd', [])
    else if (slut === 'avbryt') {
      await touch('touchCancel', [])
      await vänta(120)
      const antal = await page.evaluate(() => window.__pc.cancel)
      if (antal === 0 && syntetisk !== false) {
        // CDP:s touchCancel gav inget DOM-event: skicka ett eget, så att nedströms kod ser samma sak.
        await page.evaluate(() => {
          const id = window.__pc.lastId
          const app = window.__barnspel.app
          for (const t of [app.canvas, window]) {
            t.dispatchEvent(new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }))
          }
        })
      }
    }
    await vänta(260)
    return { grepp: true, flytt: dist(l0, l1), l0, l1, flagg, a, b, vekt: { x: l1.x - l0.x, y: l1.y - l0.y } }
  }

  const vantaKlar = async (id) => {
    const s = SPEL[id]
    await vänta(900)
    for (let i = 0; i < 100; i++) {
      const ok = await G(id, `(() => { try { return !!(${s.klar}) } catch { return true } })()`).catch(() => true)
      if (ok) return true
      await vänta(250)
    }
    return false
  }

  // ---- arm 0b (en gång, på första spelet): kommer det ett DOM-pointercancel? -----------------
  {
    const id0 = SPELLISTA[0]
    await oppna(id0)
    const r = await drag(id0, 31, 'kvar')
    await touch('touchCancel', [])
    await vänta(250)
    const antal = await page.evaluate(() => window.__pc.cancel)
    syntetisk = antal === 0
    console.log(`\n  arm 0b — CDP touchCancel på ${id0}: pointercancel på window = ${antal} (grepp ${r.grepp ? 'ok' : 'MISSLYCKADES'})`)
    console.log(syntetisk ? '    → CDP skickar INGET DOM-event; arm A skickar ett eget PointerEvent("pointercancel")' : '    → CDP skickar ett riktigt pointercancel; ingen syntetisk hjälp behövs')
  }

  for (const id of SPELLISTA) {
    const s = SPEL[id]
    if (!s) { console.log(`  okänt spel ${id}`); continue }
    const rad = { id, fel: [] }
    try {
      // ---- arm 0: kontroll ---------------------------------------------------------------
      await oppna(id)
      const d1 = await drag(id, 11, 'upp')
      let d2 = { grepp: false, flytt: 0 }
      if (d1.grepp) {
        const klar = await vantaKlar(id)
        rad.klar0 = klar
        d2 = await drag(id, 12, 'upp')
      }
      rad.a0 = { f1: d1.flytt, f2: d2.flytt }
      rad.vekt0 = d1.vekt
      rad.a0ok = d1.flytt >= N && d2.flytt >= N

      // ---- arm A (+ 0b-räknaren): touchCancel mitt i draget, sedan ett nytt grepp ---------
      await oppna(id)
      const c1 = await drag(id, 21, 'avbryt')
      const pc = await page.evaluate(() => ({ ...window.__pc }))
      const flaggEfter = await G(id, s.flagg)
      let c2 = { grepp: false, flytt: 0 }
      if (c1.grepp) c2 = await drag(id, 22, 'upp', true)
      rad.aA = { avbrutet: c1.flytt, ny: c2.flytt, flagg: flaggEfter, cancelDom: pc.cancel }
      rad.aAok = c2.flytt >= N

      // ---- arm B: två fingrar -------------------------------------------------------------
      await oppna(id)
      {
        if (s.nolla) await G(id, s.nolla)
        const g0 = await G(id, s.grepp)
        if (!g0) { rad.b = null } else {
          const dir = s.dirFn ? await G(id, s.dirFn) : s.dir
          const lStart = await G(id, s.las)
          const a = await skarm(g0)
          const steg = 0.5
          const b1 = await skarm({ x: g0.x + dir.x * steg, y: g0.y + dir.y * steg })
          const b2 = await skarm({ x: g0.x + dir.x, y: g0.y + dir.y })
          const f1 = { id: 41, andra: () => [] }
          await touch('touchStart', [{ x: a.x, y: a.y, id: 41 }])
          await vänta(70)
          await medFinger(id, f1, a, b1, 4)
          await vänta(300)
          const lA = await G(id, s.las)
          // finger 2 landar i tomma fältet och rör sig; finger 1 står still
          const p2a = await skarm({ x: s.f2.x, y: s.f2.y })
          const p2b = await skarm({ x: s.f2.x + s.f2.dx, y: s.f2.y + s.f2.dy })
          await touch('touchStart', [{ x: b1.x, y: b1.y, id: 41 }, { x: p2a.x, y: p2a.y, id: 42 }])
          await vänta(70)
          const f2 = { id: 42, andra: () => [{ x: b1.x, y: b1.y, id: 41 }] }
          await medFinger(id, f2, p2a, p2b, 6)
          await vänta(350)
          const lB = await G(id, s.las)
          // finger 1 rör sig vidare medan finger 2 ligger kvar
          const f1b = { id: 41, andra: () => [{ x: p2b.x, y: p2b.y, id: 42 }] }
          await medFinger(id, f1b, b1, b2, 4)
          await vänta(380)
          const lC = await G(id, s.las)
          const flaggB = await G(id, s.flagg)
          await touch('touchEnd', [])
          await vänta(250)
          // Där finger 1 slutade ska föremålet ha gått SAMMA väg som i arm 0 (ett finger, samma drag):
          // förskjutning från start jämförs vektor mot vektor. (En fast offset mot fingret vore fel
          // för en kula på en pendelcirkel eller en fläkt på en räls.)
          const v0 = rad.vekt0 || { x: 0, y: 0 }
          const offFel = dist({ x: lC.x - lStart.x, y: lC.y - lStart.y }, v0)
          rad.b = { f2Drar: dist(lA, lB), f1Foljs: offFel, flagg: flaggB }
        }
      }
    } catch (e) {
      rad.fel.push(String(e.message || e).slice(0, 200))
    }
    rad.konsolfel = errors.length
    allaFel.push(...errors.slice(0, 3).map((e) => `${id}: ${e}`))
    rader.push(rad)
    console.log(`  ${id} klart`)
  }

  // ---- utskrift --------------------------------------------------------------------------
  const r0 = (n) => (n == null ? '-' : String(Math.round(n)))
  console.log(`\n  (N = ${N} px; flytt i Pixi-globala px; DOM-pointercancel från CDP: ${syntetisk ? 'NEJ — syntetisk' : 'ja'})\n`)
  console.log('| spel | arm 0 grepp 1 / 2 (px) | arm 0b pointercancel | arm A: avbrutet / nytt grepp (px; sortera: annat föremål) | arm A flaggor efter cancel | arm B: finger 2 drar (px) · avvikelse från arm 0:s väg när finger 1 rört sig klart (px; <N = följer f1) |')
  console.log('|---|---|---|---|---|---|')
  const flaggText = (f) => (f ? Object.entries(f).map(([k, v]) => `${k}=${v}`).join(' ') : '-')
  for (const r of rader) {
    const a0 = r.a0 ? `${r0(r.a0.f1)} / ${r0(r.a0.f2)} ${r.a0ok ? 'ok' : 'OMÄTT'}` : 'fel'
    const a0b = r.aA ? String(r.aA.cancelDom) + (syntetisk ? ' (syntetisk)' : '') : '-'
    let aA = '-'
    if (r.aA) {
      aA = `${r0(r.aA.avbrutet)} / ${r0(r.aA.ny)} `
      aA += !r.a0ok ? 'omätt (arm 0 död)' : r.aAok ? 'LYCKAS' : 'FASTNAR'
    }
    let aB = '-'
    if (r.b) {
      const drar = r.b.f2Drar >= N
      aB = `${r0(r.b.f2Drar)} ${drar ? '→ f2 DRAR' : '→ ignoreras'} · ${r0(r.b.f1Foljs)} ${r.b.f1Foljs < N ? '→ f1 följs vid slutet' : '→ f1 följs EJ'}`
      if (!r.a0ok) aB += ' (arm 0 död: omätt)'
    }
    console.log(`| ${r.id} | ${a0} | ${a0b} | ${aA} | ${r.aA ? flaggText(r.aA.flagg) : '-'} | ${aB} |`)
    for (const f of r.fel) console.log(`|  ↳ fel | ${f} | | | | |`)
  }
  console.log(`\n  konsolfel: ${allaFel.length}`)
  for (const e of allaFel.slice(0, 8)) console.log('    ' + e)
  const dod = rader.filter((r) => !r.a0ok).length
  if (dod) console.log(`\n  ⚠️ ${dod} spel hade en död kontrollarm (arm 0) — deras A/B-rader är OMÄTTA, inte ok`)
  console.log()
  process.exit(0)
} finally {
  await browser.close()
}
