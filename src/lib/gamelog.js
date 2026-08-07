// Diagnostiklogg — ser vad som FAKTISKT händer i ett spel: input, utdata, fysik,
// rendering, motorernas interna läge (matter · Pixi · GSAP · three) och fel.
//
// DEV-ONLY. `ON` blir konstant `false` i bygget (Vite ersätter import.meta.env.DEV),
// så varje funktion viker ihop till en tom retur och minifieraren slänger kroppen.
// Ingen loggning når nätet, inget skrivs till localStorage — P0 "ingen spårning" gäller.
//
// Två sorters poster:
//   HÄNDELSE  log(cat, event, data)   — rå tidslinje, ringbuffert
//   FYND      flag(code, msg, data)   — härledd slutsats ("detta ÄR ett problem"),
//                                       räknas ihop per kod så en loop inte dränker loggen
//
// I webbläsaren (dev):  window.__gamelog.summary()  ·  .dump()  ·  .snapshot()
// I harnessen:          scripts/test-game.mjs hämtar snapshot() och skriver .test-logs/<id>.json
import { gsap } from 'gsap'
import { DESIGN_W, DESIGN_H } from './theme.js'

export const ON = !!(import.meta.env && import.meta.env.DEV)

const MAX_EVENTS = 6000 // ringbuffert (~2–3 MB som värst)
const LATE_SOUND_MS = 200 // P0 kräver <100 ms; marginal för harness-jitter innan vi larmar
const RESPONSE_GRACE_MS = 320 // när vi dömer av en pekning som stum
const MIN_JUDGE_MS = 180 // kortare fönster än så är för lite underlag för en dom
const SAMPLE_MS = 500 // scen/motor-provtagning
const LONG_FRAME_MS = 50 // bildruta som hackar synligt (~3 tappade rutor)
const OFFSCREEN_SLACK = 400 // hur långt utanför 1280×720 ett objekt får ligga
const MAX_FLAG_DETAILS = 5 // spara detaljer för de N första träffarna per kod

// ---------------------------------------------------------------- tillstånd

const events = []
let head = 0 // ringbuffert-skrivpekare
let seq = 0
let t0 = 0
let runId = 0
let game = null // { id, stage, ctx, startedAt }
let lastId = null // överlever endGame så sammanfattningen vet vilket spel den gäller
const flags = new Map() // kod -> { code, level, msg, n, firstT, lastT, samples[] }
const counts = new Map() // "cat/event" -> antal
let attached = false
let services = null
let app = null

// input→svar-spårning. Flera pekningar kan vänta på dom samtidigt — ett barn
// hamrar snabbare än nådtiden, och då får INGEN av dem tystas bort odömd.
const pendings = []
const DRAG_PX = 14 // längre än så: gest, inte tryck (P0:s <100 ms gäller tryck)
let tapSeq = 0

// bildrute-statistik
const frame = { n: 0, sumMs: 0, maxMs: 0, long: 0, lastLogAt: 0, minFps: 999 }

// animations-statistik (gsap-patch i attach)
const anim = { n: 0, lastN: 0, runStart: 0 }

// fysik-statistik (fylls av physics.js)
const phys = { collisions: 0, bodies: 0, sleeping: 0, starved: 0, maxSpeed: 0, worlds: 0 }

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const round = (v, d = 1) => (typeof v === 'number' && isFinite(v) ? Number(v.toFixed(d)) : v)
const bad = (v) => typeof v !== 'number' || !isFinite(v)

// ---------------------------------------------------------------- kärna

// Rå händelse i tidslinjen. cat = grov kanal, event = vad, data = valfri detalj.
export function log(cat, event, data, level = 'info') {
  if (!ON) return
  const rec = { i: seq++, t: round(now() - t0, 0), cat, event, level }
  if (data !== undefined) rec.d = data
  if (events.length < MAX_EVENTS) events.push(rec)
  else {
    events[head] = rec
    head = (head + 1) % MAX_EVENTS
  }
  const key = cat + '/' + event
  counts.set(key, (counts.get(key) || 0) + 1)
  return rec
}

// Härlett fynd. Samma kod räknas upp i stället för att spamma tidslinjen.
export function flag(code, msg, data, level = 'varning') {
  if (!ON) return
  let f = flags.get(code)
  if (!f) {
    f = { code, level, msg, n: 0, firstT: 0, lastT: 0, samples: [] }
    flags.set(code, f)
  }
  f.n++
  f.lastT = round(now() - t0, 0)
  if (f.n === 1) {
    f.firstT = f.lastT
    log('kontroll', code, data, level)
  }
  if (f.samples.length < MAX_FLAG_DETAILS && data !== undefined) f.samples.push({ t: f.lastT, ...data })
  return f
}

// Varje utdata kvitterar väntande pekningar. Skillnaden mellan STARK och svag
// signal är viktig: ljud/röst/förlopp utlöses av en handler (går att tidsätta),
// medan en gsap-tween lika gärna kan vara en bakgrundsanimation som råkade
// starta. Tweens duger som livstecken, aldrig som bevis för svarstiden.
const STARKA = new Set(['sfx', 'sample', 'tone', 'voice', 'progress', 'drag', 'sikte'])

function noteOutput(kind, detail) {
  if (!pendings.length) return
  const t = now()
  const stark = STARKA.has(kind)
  for (const p of pendings) {
    if (!p.outputs.length) p.firstAt = t
    if (stark && !p.firstStrongAt) p.firstStrongAt = t
    if (p.outputs.length < 8) p.outputs.push(detail ? `${kind}:${detail}` : kind)
  }
}

function timeline() {
  if (events.length < MAX_EVENTS) return events.slice()
  return events.slice(head).concat(events.slice(0, head))
}

// ---------------------------------------------------------------- körning (ett spelpass)

export function startGame(id, ctx) {
  if (!ON) return
  t0 = now()
  seq = 0
  events.length = 0
  head = 0
  flags.clear()
  counts.clear()
  runId++
  frame.n = frame.sumMs = frame.maxMs = frame.long = 0
  frame.minFps = 999
  frame.lastLogAt = 0
  phys.collisions = phys.bodies = phys.sleeping = phys.starved = phys.maxSpeed = phys.worlds = 0
  anim.lastN = anim.runStart = anim.n
  clearPending()
  game = { id, stage: ctx?.stage || null, ctx, startedAt: new Date().toISOString() }
  lastId = id
  log('liv', 'start', { id })
  // Tom scen? Ge modulen en sekund att bygga klart först.
  const myRun = runId
  setTimeout(() => {
    if (!game || runId !== myRun) return
    const st = game.stage
    const n = st && !st.destroyed ? st.children.length : 0
    log('render', 'scen-byggd', { barn: n, noder: countNodes(st) })
    if (n === 0) flag('tom-scen', 'Spelets stage har inga barn en sekund efter mount', { id }, 'fel')
  }, 1000)
}

export function endGame(reason = 'exit') {
  if (!ON || !game) return
  const alive = { ...frame }
  log('liv', 'slut', {
    orsak: reason,
    speltidMs: round(now() - t0, 0),
    rutor: alive.n,
    snittMs: round(alive.n ? alive.sumMs / alive.n : 0, 2),
    langaRutor: alive.long,
  })
  clearPending()
  const dead = game
  game = null
  // Efterkontroll: allt som fortfarande animerar mot spelets (nu rivna) objekt
  // är en exit-säkerhetsbugg — den P0-regel som är svårast att se med ögat.
  const myRun = runId
  setTimeout(() => {
    if (runId !== myRun) return // nytt spel hann starta, mätningen är inte längre ren
    const leaks = orphanTweens()
    if (leaks.length) {
      flag('tween-lacka', `${leaks.length} GSAP-tween(s) lever vidare efter destroy`, { id: dead.id, mal: leaks.slice(0, 6) }, 'fel')
    }
  }, 400)
}

// ---------------------------------------------------------------- input

function clearPending() {
  for (const p of pendings) clearTimeout(p.timer)
  pendings.length = 0
}

function onPointerDown(e) {
  if (!ON) return
  const p = toDesign(e)
  let hit = null
  try {
    const r = app.canvas.getBoundingClientRect()
    const t = app?.renderer?.events?.rootBoundary?.hitTest?.(e.clientX - r.left, e.clientY - r.top)
    hit = t ? t.label || t.constructor?.name || 'objekt' : null
  } catch {
    /* hitTest är en bekvämlighet — aldrig värd en krasch */
  }
  const rec = { n: ++tapSeq, x: round(p.x, 0), y: round(p.y, 0), hit }
  log('input', 'ned', rec)
  // En pekning stänger föregående mätfönster. Annars krediteras nästa trycks ljud
  // till det förra och svarstiden blir exakt tryck-intervallet (mätfel, inte bugg).
  while (pendings.length) judge(pendings[0], 'nytt-tryck')
  const mine = { t: now(), ...rec, cx: e.clientX, cy: e.clientY, outputs: [], firstAt: 0, firstStrongAt: 0, dragged: false, timer: null }
  pendings.push(mine)
  // Domen faller när nådtiden gått ut — INTE vid pointerup. Ett drag släpps ofta
  // långt senare, och då hade svarstiden aldrig mätts.
  mine.timer = setTimeout(() => judge(mine, 'nadtid'), RESPONSE_GRACE_MS)
}

// Dom över EN pekning: svarade spelet, och i så fall hur snabbt?
function judge(mine, orsak) {
  const i = pendings.indexOf(mine)
  if (i < 0) return
  pendings.splice(i, 1)
  clearTimeout(mine.timer)
  const fonster = round(now() - mine.t, 0)
  if (mine.outputs.length) {
    const dt = round(mine.firstAt - mine.t, 0)
    const dtLjud = mine.firstStrongAt ? round(mine.firstStrongAt - mine.t, 0) : null
    log('input', 'svar', { pek: mine.n, efterMs: dt, ljudMs: dtLjud, av: mine.outputs.slice(0, 4), hit: mine.hit })
    if (dtLjud == null && mine.hit && fonster >= MIN_JUDGE_MS) {
      // P0 kräver ljud OCH bild. Bara tweens: antingen tyst knapp, eller så var
      // "rörelsen" en bakgrundsanimation och trycket gjorde egentligen ingenting.
      flag('tryck-utan-ljud', `Tryck på "${mine.hit}" gav rörelse men inget ljud inom ${fonster} ms`, { x: mine.x, y: mine.y, hit: mine.hit }, 'varning')
    } else if (dtLjud != null && dtLjud > LATE_SOUND_MS) {
      flag('sen-aterkoppling', `Första ljudet efter pekningen kom ${dtLjud} ms senare (P0-krav <100 ms)`, { x: mine.x, y: mine.y, hit: mine.hit, dtLjud }, 'varning')
    }
    return
  }
  if (mine.dragged) {
    // Fingret rörde sig: en gest, inte ett tryck. Rörelsen SYNS (objektet följer
    // handen) utan att ge ljud eller tween — det får inte räknas som stumt.
    log('input', 'gest-utan-ljud', { x: mine.x, y: mine.y, hit: mine.hit })
    return
  }
  if (fonster < MIN_JUDGE_MS) {
    // Fönstret hann aldrig löpa ut (nästa tryck kom emellan) — för kort för en dom.
    log('input', 'obedomd', { x: mine.x, y: mine.y, hit: mine.hit, fonsterMs: fonster, orsak })
    return
  }
  if (mine.hit) {
    flag('dod-traffyta', `Tryck på "${mine.hit}" gav varken ljud, röst eller animation inom ${fonster} ms`, { x: mine.x, y: mine.y, hit: mine.hit }, 'varning')
  } else {
    // Bakgrundstryck: ofta legitimt, men många i rad = ytan är i praktiken tom.
    log('input', 'tyst-tryck', { x: mine.x, y: mine.y }, 'info')
  }
}

function onPointerMove(e) {
  if (!pendings.length) return
  for (const p of pendings) {
    if (!p.dragged && Math.hypot(e.clientX - p.cx, e.clientY - p.cy) > DRAG_PX) p.dragged = true
  }
}

function onPointerUp(e) {
  if (!ON) return
  const p = toDesign(e)
  log('input', 'upp', { x: round(p.x, 0), y: round(p.y, 0) })
}

// Skärm- → designkoordinater (1280×720) via Scaler-transformen på world.
function toDesign(e) {
  try {
    const r = app.canvas.getBoundingClientRect()
    const w = services.world
    return { x: (e.clientX - r.left - w.x) / (w.scale.x || 1), y: (e.clientY - r.top - w.y) / (w.scale.y || 1) }
  } catch {
    return { x: NaN, y: NaN }
  }
}

// ---------------------------------------------------------------- provtagning (scen · motorer)

function countNodes(root, cap = 4000) {
  let n = 0
  const walk = (c, depth) => {
    if (!c || n > cap || depth > 24) return
    n++
    const kids = c.children
    if (kids) for (let i = 0; i < kids.length; i++) walk(kids[i], depth + 1)
  }
  walk(root, 0)
  return n
}

// Letar efter döda/trasiga objekt i spelets scen. Direktbarn kollas mot skärmytan
// (billigt), djupare noder bara mot NaN/förstörd — det är där tysta buggar bor.
function scanScene(stage) {
  if (!stage || stage.destroyed) return { noder: 0 }
  let noder = 0
  let osynliga = 0
  const walk = (c, depth) => {
    if (!c || noder > 4000 || depth > 24) return
    noder++
    if (c.destroyed) {
      flag('forstort-i-scen', 'Ett förstört Pixi-objekt sitter kvar i scengrafen', { label: c.label || c.constructor?.name, depth }, 'fel')
      return
    }
    if (bad(c.x) || bad(c.y) || bad(c.scale?.x) || bad(c.rotation)) {
      flag('nan-transform', 'Objekt med NaN/Infinity i position, skala eller rotation', { label: c.label || c.constructor?.name, x: c.x, y: c.y, sx: c.scale?.x, rot: c.rotation }, 'fel')
      return
    }
    if (c.visible === false || c.alpha === 0) osynliga++
    const kids = c.children
    if (kids) for (let i = 0; i < kids.length; i++) walk(kids[i], depth + 1)
  }
  walk(stage, 0)
  // Direktbarn utanför bilden = layoutbugg som annars bara syns på skärmdumpen.
  for (const c of stage.children) {
    if (!c || c.destroyed || c.visible === false) continue
    let b
    try {
      b = c.getBounds()
    } catch {
      continue
    }
    if (!b || bad(b.x) || bad(b.width)) continue
    if (b.width === 0 || b.height === 0) continue
    const utanfor = b.x + b.width < -OFFSCREEN_SLACK || b.x > DESIGN_W + OFFSCREEN_SLACK || b.y + b.height < -OFFSCREEN_SLACK || b.y > DESIGN_H + OFFSCREEN_SLACK
    if (utanfor) {
      flag('utanfor-bild', 'Synligt objekt ligger helt utanför 1280×720', { label: c.label || c.constructor?.name, x: round(b.x), y: round(b.y), w: round(b.width), h: round(b.height) }, 'varning')
    }
  }
  return { noder, osynliga }
}

// GSAP-tweens som animerar Pixi-objekt vilka redan är förstörda.
function orphanTweens() {
  const out = []
  try {
    const kids = gsap.globalTimeline.getChildren(true, true, false)
    for (const tw of kids) {
      const targets = tw.targets?.() || []
      for (const t of targets) {
        if (t && typeof t === 'object' && t.destroyed === true) {
          out.push(t.label || t.constructor?.name || 'objekt')
          break
        }
      }
    }
  } catch {
    /* gsap-internals får aldrig fälla loggen */
  }
  return out
}

function sample() {
  if (!ON || !game) return
  const st = game.stage
  const scen = scanScene(st)
  const tweens = (() => {
    try {
      return gsap.globalTimeline.getChildren(true, true, false).length
    } catch {
      return -1
    }
  })()
  const leaks = orphanTweens()
  if (leaks.length) flag('tween-mot-forstort', 'GSAP animerar ett förstört objekt (krasch- och läckrisk)', { mal: leaks.slice(0, 6) }, 'fel')
  const snitt = frame.n ? frame.sumMs / frame.n : 0
  const nyaTweens = anim.n - anim.lastN
  anim.lastN = anim.n
  log('render', 'prov', {
    noder: scen.noder,
    osynliga: scen.osynliga,
    fps: round(snitt ? 1000 / snitt : 0, 0),
    maxRutaMs: round(frame.maxMs, 1),
    langaRutor: frame.long,
    tweens,
    nyaTweens,
    kroppar: phys.bodies,
    sovande: phys.sleeping,
    kollisioner: phys.collisions,
  })
  frame.maxMs = 0
  if (tweens > 400) flag('tween-storm', `${tweens} samtidiga GSAP-tweens — troligen en tween som skapas varje bildruta`, { tweens }, 'varning')
  if (nyaTweens > 120) flag('tween-per-ruta', `${nyaTweens} nya tweens på ${SAMPLE_MS} ms — något tweenar i stället för att skriva värdet direkt`, { nyaTweens }, 'varning')
  if (scen.noder > 2500) flag('scen-svall', `${scen.noder} noder i scengrafen — objekt städas troligen inte bort`, { noder: scen.noder }, 'varning')
}

// ---------------------------------------------------------------- inkoppling

// Anropas EN gång från main.js (dev). Kopplar konsol, fel, input, bildrutor,
// provtagning och tjänste-anropen (ljud/röst) — noll ändringar i spelen.
export function attach(svc) {
  if (!ON || attached) return
  attached = true
  services = svc
  app = svc.app
  t0 = now()

  // — fel & konsol —
  const origErr = console.error.bind(console)
  const origWarn = console.warn.bind(console)
  console.error = (...a) => {
    log('fel', 'console.error', { text: String(a[0]).slice(0, 300) }, 'fel')
    flag('konsolfel', 'console.error under körning', { text: String(a[0]).slice(0, 200) }, 'fel')
    origErr(...a)
  }
  console.warn = (...a) => {
    log('fel', 'console.warn', { text: String(a[0]).slice(0, 300) }, 'varning')
    origWarn(...a)
  }
  window.addEventListener('error', (e) => {
    flag('pageerror', 'Ohanterat undantag', { text: String(e.message).slice(0, 200), fil: e.filename, rad: e.lineno }, 'fel')
  })
  window.addEventListener('unhandledrejection', (e) => {
    flag('promise-fel', 'Ohanterat promise-avslag', { text: String(e.reason?.message || e.reason).slice(0, 200) }, 'fel')
  })

  // — input: fångstfasen på WINDOW, inte på canvasen. Pixis EventSystem registrerar
  //   sina lyssnare på canvasen i app.init() — alltså före oss — och vid ett event som
  //   skickas direkt PÅ canvasen kör lyssnarna i registreringsordning. Då hann spelets
  //   svar loggas före själva trycket och svarstiderna blev förskjutna ett helt tryck.
  //   Window-capture kör alltid först i kedjan och ger rätt ordning.
  const cv = svc.app.canvas
  const franCanvas = (e) => e.target === cv
  window.addEventListener('pointerdown', (e) => franCanvas(e) && onPointerDown(e), { capture: true, passive: true })
  window.addEventListener('pointerup', (e) => franCanvas(e) && onPointerUp(e), { capture: true, passive: true })
  window.addEventListener('pointermove', onPointerMove, { capture: true, passive: true })

  // — bildrutor —
  svc.app.ticker.add((t) => {
    if (!game) return
    const ms = t.deltaMS
    frame.n++
    frame.sumMs += ms
    if (ms > frame.maxMs) frame.maxMs = ms
    if (ms > LONG_FRAME_MS) {
      frame.long++
      const nu = now()
      if (nu - frame.lastLogAt > 400) {
        frame.lastLogAt = nu
        log('render', 'lang-ruta', { ms: round(ms, 1) }, 'varning')
      }
      if (ms > 300) flag('frusen-ruta', `Bildruta på ${Math.round(ms)} ms — appen stod still`, { ms: round(ms, 0) }, 'varning')
    }
  })
  setInterval(sample, SAMPLE_MS)

  // — utdata: ljud —
  wrap(svc.audio, 'sfx', (name) => {
    log('ljud', 'sfx', { name })
    noteOutput('sfx', name)
  })
  wrap(svc.audio, 'tone', (o) => {
    log('ljud', 'tone', { freq: round(o?.freq, 0) })
    noteOutput('tone')
  })
  wrap(svc.audio, 'sample', (name) => {
    log('ljud', 'sample', { name })
    noteOutput('sample', name)
  }, (ret, name) => {
    if (ret === false) flag('saknat-ljudklipp', 'audio.sample() hittade inget klipp — inget ljud spelades', { name }, 'varning')
  })

  // — utdata: röst (och om frasen saknar inspelat klipp) —
  wrap(svc.voice, 'say', (text) => {
    noteOutput('voice')
    // Klipp-manifestet hämtas asynkront. Döms repliken direkt flaggas ALLT som sägs
    // under appens första millisekunder som klipplöst — 14 av 71 spel gjorde det, fast
    // klippet fanns. Loggraden skrivs i tid ("vantar"), domen väntar på manifestet.
    const vantar = svc.voice?._manifestDone === false
    const har = harKlipp(svc.voice, text)
    log('rost', 'say', { text: String(text).slice(0, 90), klipp: har || (vantar ? 'vantar' : false) })
    if (har) return
    const doma = () => {
      if (!harKlipp(svc.voice, text)) flag('rost-utan-klipp', 'Replik saknar inspelat klipp → robotrösten (Web Speech) tar över', { text: String(text).slice(0, 120) }, 'varning')
    }
    if (vantar && svc.voice._manifestReady?.then) svc.voice._manifestReady.then(doma, doma)
    else doma()
  })
  wrap(svc.voice, 'replayLast', () => noteOutput('voice'))

  // — utdata: animation. GSAP är delad modul, så en patch här ser ALLA spelens
  //   tweens: både som kvitto på att en pekning gav rörelse och som takt-mätare.
  try {
    for (const m of ['to', 'from', 'fromTo', 'timeline', 'delayedCall']) {
      wrap(gsap, m, () => {
        anim.n++
        noteOutput('anim')
      })
    }
  } catch {
    log('fel', 'gsap-patch-misslyckades', undefined, 'varning')
  }

  window.__gamelog = api
  log('liv', 'logg-aktiv', { version: svc.appVersion })
}

function harKlipp(voice, text) {
  try {
    const clips = voice._clips
    if (!clips || !clips.size) return false
    if (clips.has(text)) return true
    const parts = String(text)
      .split(/(?<=[!?.])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return parts.length > 1 && parts.every((p) => clips.has(p))
  } catch {
    return false
  }
}

// Monkey-patch som aldrig ändrar beteendet: före-hook, valfri efter-hook.
function wrap(obj, name, before, after) {
  if (!obj || typeof obj[name] !== 'function' || obj[name].__logged) return
  const orig = obj[name].bind(obj)
  const patched = (...a) => {
    try {
      before?.(...a)
    } catch {
      /* loggen får aldrig störa spelet */
    }
    const ret = orig(...a)
    try {
      after?.(ret, ...a)
    } catch {
      /* noop */
    }
    return ret
  }
  patched.__logged = true
  obj[name] = patched
}

// ---------------------------------------------------------------- hjälpare för bibliotek

// artikoner.js: nyckel som saknas ritas idag som en tyst grå cirkel.
export function logIcon(key, found) {
  if (!ON) return
  if (!found) flag('saknad-ikon', 'drawIcon() fick en okänd nyckel och ritade en grå cirkel', { key: String(key) }, 'fel')
}

// DragController: hela drag-livscykeln (plock, släpp, träff, miss, snäpp tillbaka).
export function logDrag(event, data) {
  if (!ON) return
  log('drag', event, data)
  if (event !== 'miss') noteOutput('drag', event)
  // Miss precis utanför snäppytan: barnet gjorde rätt, radien var för snål.
  const u = data?.narmast?.utanfor
  if (event === 'miss' && typeof u === 'number' && u > 0 && u < 70) {
    flag('snal-snappyta', `Släpp bara ${u} px utanför målets snäppradie (${data.narmast.radie} px) — höj hitRadius`, data.narmast, 'varning')
  }
}

// PhysicsWorld (matter.js).
export function logPhysics(event, data) {
  if (!ON) return
  if (event === 'kollision') {
    phys.collisions += data?.par || 1
    if (phys.collisions % 25 !== 0) return // logga var 25:e, räknaren är exakt ändå
  }
  if (event === 'prov') {
    phys.bodies = data?.kroppar ?? phys.bodies
    phys.sleeping = data?.sovande ?? phys.sleeping
    if (data?.toppfart > phys.maxSpeed) phys.maxSpeed = data.toppfart
  }
  log('fysik', event, data, event === 'svalt' || event === 'nan-kropp' ? 'varning' : 'info')
  if (event === 'svalt') {
    phys.starved++
    if (phys.starved === 3) flag('fysik-svalt', 'Fysiken hinner inte med (>5 steg per bildruta) — simuleringen saktar ned', data, 'varning')
  }
  if (event === 'nan-kropp') flag('nan-kropp', 'Fysikkropp med NaN-position — motorn har spårat ur', data, 'fel')
  if (event === 'rymde') flag('kropp-rymde', 'Kropp hamnade långt utanför banan (föll genom golvet eller tunnlade)', data, 'varning')
  if (event === 'skapad') phys.worlds++
}

// ThreeLayer (three.js) — renderer.info är motorns egen sanning om ritanropen.
export function logThree(event, data) {
  if (!ON) return
  log('3d', event, data)
  if (event === 'prov' && data?.ritanrop > 300) {
    flag('3d-ritanrop', `${data.ritanrop} ritanrop per bildruta — för mycket för en surfplatta`, data, 'varning')
  }
}

// AimLauncher: sikte, kraft, avfyrning.
export function logAim(event, data) {
  if (!ON) return
  log('sikte', event, data)
  noteOutput('sikte', event)
}

// GameHost: förlopp och sparning.
export function logProgress(event, data) {
  if (!ON) return
  log('data', event, data)
  noteOutput('progress', event)
}

// ---------------------------------------------------------------- utdata-API

function summary() {
  const f = [...flags.values()].sort((a, b) => (a.level === b.level ? b.n - a.n : a.level === 'fel' ? -1 : 1))
  const topp = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)
  return {
    spel: game?.id || lastId,
    aktivt: !!game,
    speltidMs: round(now() - t0, 0),
    handelser: seq,
    rutor: frame.n,
    snittRutaMs: round(frame.n ? frame.sumMs / frame.n : 0, 2),
    langaRutor: frame.long,
    tweensSkapade: anim.n - anim.runStart,
    fysik: { ...phys },
    fynd: f.map((x) => ({ kod: x.code, niva: x.level, n: x.n, msg: x.msg, exempel: x.samples })),
    fel: f.filter((x) => x.level === 'fel').length,
    varningar: f.filter((x) => x.level === 'varning').length,
    vanligast: Object.fromEntries(topp),
  }
}

const api = {
  get on() {
    return ON
  },
  log,
  flag,
  summary,
  dump: (filter) => (filter ? timeline().filter((e) => e.cat === filter || e.event === filter) : timeline()),
  snapshot: () => ({ summary: summary(), timeline: timeline() }),
  clear: () => {
    events.length = 0
    head = 0
    seq = 0
    flags.clear()
    counts.clear()
  },
  // Skriv ut en läsbar sammanfattning i konsolen (dev-bekvämlighet).
  print() {
    const s = summary()
    console.info(`[gamelog] ${s.spel} · ${s.handelser} händelser · ${s.rutor} rutor · ${round(s.snittRutaMs, 1)} ms/ruta · ${s.fel} fel, ${s.varningar} varningar`)
    for (const f of s.fynd) console.info(`  ${f.niva === 'fel' ? '✗' : '⚠'} ${f.kod} ×${f.n} — ${f.msg}`)
    return s
  },
}

export default api
