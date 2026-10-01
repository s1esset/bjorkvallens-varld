// Takt-sond (FYSIKPLAN M2): ger ett spel EXAKT samma värld vid olika bildrutetakt — och mäter
// vad spelets egen fysikkod gör med den.
//
//   node scripts/_taktprobe.mjs <id> --expr "g._balls.length" [--expr "namn=uttryck"] \
//        [--hz 30,45,57,60] [--seed 7] [--sek 8] [--var 0.5] \
//        [--tryck "1.5:640,60;4:300,60"] [--drag "2:300,400>900,400:0.6"] [--hall 0.1] \
//        [--riktig-klocka] [--skarm] [--json] [--port 5173] [--url http://…] [--viewport 1280x720]
//
// Varför den finns: `_fpsprobe`/`_fysikkostnad` mäter vad en bildruta KOSTAR. Den här mäter vad en
// bildruta GÖR — om samma värld rör sig olika långt vid 30 Hz som vid 60 Hz (kod som lägger en kraft,
// ett dämpningsfaktor eller ett tidssteg PER BILDRUTA i stället för per fysiksteg). Det går inte att
// se i en körning i realtid, där maskinen väljer takten åt dig.
//
// Så här gör den armen deterministisk (varje arm = ny sida, rena sparfiler):
//   · Math.random byts mot en seedad generator (mulberry32) FÖRE sidan laddas, och sås om precis
//     före spelet monteras — samma slumptal i varje arm hur lång splashen än hann leva.
//   · Pixis ticker stoppas (`autoStart = false`, `maxFPS = 0` — spelets tak på 60 skulle annars
//     hoppa över var tredje bildruta vid 57 Hz) och sonden anropar `ticker.update(t += 1000/hz)`
//     själv. Allt som hänger på `ticker.deltaMS` (PhysicsWorld, Flytvolym, spelens egna lyssnare)
//     ser en perfekt jämn takt.
//   · KLOCKAN VIRTUALISERAS (förval): `performance.now()` och `Date.now()` returnerar sondens tid
//     — INTE väggklockan — från och med monteringen, och gsap drivs med `gsap.ticker.tick()` i
//     samma steg. Annars läser spelen som mäter tid med `performance.now()` (domino, bowling,
//     flipperspel, DragController-kast, impactAudio-golvet …) en klocka som sonden inte styr, och
//     gsap (som går på egen rAF/Date.now) kör tweens och `ctx.later()` på realtid medan fysiken
//     står på simulerad tid → kontrollarmen skulle skilja. `--riktig-klocka` stänger av detta
//     (då driver sonden bara tickern; mät fysik, inte tweens).
//   · Tryck skickas som riktiga PointerEvent på duken (designkoordinater → skärm genom samma
//     contain-letterbox som harnessen), på ett bestämt tick-index i stället för en väggtid.
//
// KVAR som kan göra två körningar olika (kontrollarmen säger om det spelar roll):
//   · Röst och ljud (`voice.talar`, `audio.sampleDuration`) är WebAudio/HTMLAudio på väggklocka —
//     `ctx.narTyst`-köer och allt som väntar in en replik kan ta olika lång tid.
//   · Resurser som laddas under monteringen (fetch/bild) avgör hur många mikro-/makrouppgifter som
//     hinner före första tick. Sonden stegar därför INTE medan montering pågår (klockan är fryst).
//
// KONTROLLARM FÖRST (annars säger inget tal något):
//   node scripts/_taktprobe.mjs studsa-ner --hz 60,60 --seed 7 --expr "…"      → ska bli IDENTISK
// MÄTARM:
//   node scripts/_taktprobe.mjs studsa-ner --hz 30,60 --seed 7 --expr "…"      → ska SKILJA för
//   per-bildruta-kod, och inte skilja efter en fix som lägger kraften per fysiksteg.
// Kör aldrig bredvid en annan webbläsarsond och redigera inte src/ medan den kör (HMR laddar om).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const ID = args[0] && !args[0].startsWith('--') ? args[0] : null
const flagga = (namn) => args.includes(namn)
const varde = (namn, def) => {
  const i = args.indexOf(namn)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def
}
const alla = (namn) => {
  const ut = []
  args.forEach((a, i) => {
    if (a === namn && i + 1 < args.length) ut.push(args[i + 1])
  })
  return ut
}

if (!ID) {
  console.error('användning: node scripts/_taktprobe.mjs <id> --expr "g._phys.engine.timing.timestamp" [--hz 30,60] [--seed 7] [--sek 8]')
  console.error('  uttrycket körs i sidan med g = spelinstansen, ctx, S = tjänsterna, t = sek, k = tick, hz')
  process.exit(2)
}

const PORT = varde('--port', '5173')
const URL = varde('--url', `http://localhost:${PORT}`)
const HZ = varde('--hz', '30,45,57,60').split(',').map(Number)
const SEED = Number(varde('--seed', 7))
const SEK = Number(varde('--sek', 8))
const VAR = Number(varde('--var', 0.5))
const HALL = Number(varde('--hall', 0.1))
const VIRTUELL = !flagga('--riktig-klocka')
const JSON_UT = flagga('--json')
const SKARM = flagga('--skarm')
const [VP_W, VP_H] = varde('--viewport', '1280x720').toLowerCase().split('x').map(Number)

if (HZ.some((h) => !(h > 0)) || !(SEK > 0) || !(VAR > 0) || !(VP_W > 0) || !(VP_H > 0)) {
  console.error('--hz, --sek, --var och --viewport måste vara positiva tal')
  process.exit(2)
}

// --expr "uttryck" eller "namn=uttryck". Förval: fysikens egen tid (sanity: ~60 steg/s oavsett Hz).
const EXPR = (alla('--expr').length ? alla('--expr') : ['fysiktid=g._phys ? g._phys.engine.timing.timestamp : null']).map((s, i) => {
  const m = /^([\wåäöÅÄÖ.-]+)=(?!=)([\s\S]+)$/.exec(s)
  return m ? { namn: m[1], kod: m[2] } : { namn: `e${i + 1}`, kod: s }
})

// --tryck "sek:x,y;sek:x,y"   (sek eller "<N>t" för tick-index)
// --drag  "sek:x0,y0>x1,y1:varaktighet-sek;…"
// Händelser får tick-index per arm: samma SIMULERADE tid i varje arm (tid × hz, avrundat uppåt).
const tidTillTick = (s, hz) => {
  const m = /^(\d+(?:\.\d+)?)t$/.exec(s.trim())
  if (m) return Math.max(1, Math.round(Number(m[1])))
  return Math.max(1, Math.ceil(Number(s) * hz - 1e-9))
}
const trycken = varde('--tryck', '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [tid, xy] = s.split(':')
    const [x, y] = xy.split(',').map(Number)
    return { tid, x, y }
  })
const dragen = varde('--drag', '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [tid, rest, dur] = s.split(':')
    const [a, b] = rest.split('>').map((p) => p.split(',').map(Number))
    return { tid, x0: a[0], y0: a[1], x1: b[0], y1: b[1], dur: Number(dur ?? 0.5) }
  })
for (const t of trycken) if (![t.x, t.y].every(Number.isFinite)) { console.error('felaktigt --tryck', t); process.exit(2) }
for (const d of dragen) if (![d.x0, d.y0, d.x1, d.y1, d.dur].every(Number.isFinite)) { console.error('felaktigt --drag', d); process.exit(2) }

const handelserFor = (hz) => {
  const ut = []
  const hallTick = Math.max(1, Math.round(HALL * hz))
  for (const t of trycken) {
    const k = tidTillTick(t.tid, hz)
    ut.push({ k, typ: 'pointerdown', x: t.x, y: t.y }, { k: k + hallTick, typ: 'pointerup', x: t.x, y: t.y })
  }
  for (const d of dragen) {
    const k = tidTillTick(d.tid, hz)
    const n = Math.max(1, Math.round(d.dur * hz))
    ut.push({ k, typ: 'pointerdown', x: d.x0, y: d.y0 })
    for (let i = 1; i <= n; i++) {
      ut.push({ k: k + i, typ: 'pointermove', x: d.x0 + ((d.x1 - d.x0) * i) / n, y: d.y0 + ((d.y1 - d.y0) * i) / n })
    }
    ut.push({ k: k + n + 1, typ: 'pointerup', x: d.x1, y: d.y1 })
  }
  return ut.sort((a, b) => a.k - b.k)
}

// ─── Körs i sidan, FÖRE alla modulers kod ────────────────────────────────────────────────────
const initSkript = ({ seed }) => {
  const mulberry = (a) => () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // En stabil omslagsfunktion: bibliotek som cachat `Math.random` träffar ändå generatorn.
  let gen = mulberry(seed)
  Math.random = () => gen()
  window.__taktSeed = (s) => {
    gen = mulberry(s)
  }

  const rp = performance.now.bind(performance)
  const rd = Date.now
  const K = (window.__takt = {
    v: null, // null = väggklocka; annars sondens tid i ms (performance.now-skala)
    v0: 0,
    epoch: 0,
    nPerf: 0,
    nDate: 0,
    real: { perf: rp, date: rd },
    engage(v) {
      K.v0 = v
      K.v = v
      K.epoch = rd()
    },
  })
  performance.now = () => {
    if (K.v === null) return rp()
    K.nPerf++
    return K.v
  }
  Date.now = () => {
    if (K.v === null) return rd()
    K.nDate++
    return K.epoch + (K.v - K.v0)
  }
}

// ─── Hela mätningen för EN arm, i sidan ─────────────────────────────────────────────────────
const kor = async ({ id, hz, sek, seed, exprs, handelser, varSek, virtuell }) => {
  const K = window.__takt
  const S = window.__barnspel
  const ticker = S.app.ticker
  const dt = 1000 / hz
  let gsap = window.gsap
  if (virtuell && !gsap) {
    // Reserv: samma modulinstans som spelet har, via resursens url (en nyimporterad kopia vore en ANNAN klocka).
    const rec = performance.getEntriesByType('resource').find((r) => /\/gsap(\.js)?(\?|$)/.test(r.name))
    if (rec) gsap = (await import(/* @vite-ignore */ rec.name)).gsap
  }
  if (virtuell && !(gsap && gsap.ticker && gsap.ticker.tick)) {
    throw new Error('window.gsap saknas — kan inte driva gsap; kör med --riktig-klocka')
  }
  const yta = () => new Promise((r) => setTimeout(r, 0))
  const fn = exprs.map((e) => ({ namn: e.namn, f: new Function('g', 'ctx', 'S', 't', 'k', 'hz', `return (${e.kod})`) }))

  // Stoppa tickern (autoStart av, annars startar varje ticker.add() den igen) och ta bort 60 fps-taket.
  ticker.autoStart = false
  ticker.stop()
  ticker.maxFPS = 0
  let tv = K.real.perf()
  if (virtuell) K.engage(tv)
  ticker.lastTime = tv
  ticker._lastFrame = tv

  const steg = () => {
    tv += dt
    if (virtuell) K.v = tv
    ticker.update(tv)
    if (virtuell) gsap.ticker.tick()
  }

  // Så om slumpen och montera spelet. Klockan är fryst medan monteringen väntar på I/O —
  // sonden stegar inte (antalet steg skulle då bero på väggklockan och göra armarna olika).
  window.__taktSeed(seed)
  let klar = false
  let navFel = null
  Promise.resolve(S.nav.go('game', { id })).then(
    () => (klar = true),
    (e) => {
      navFel = e
      klar = true
    },
  )
  const varningar = []
  const t0 = K.real.date()
  while (!klar) {
    await yta()
    // Reservläge: väntar monteringen på något som kräver tickern (en tween) börjar vi steppa.
    if (K.real.date() - t0 > 3000) {
      if (!varningar.includes('nav-steg')) varningar.push('nav-steg: monteringen krävde tickern — armen är inte deterministisk')
      steg()
    }
    if (K.real.date() - t0 > 30000) throw new Error('nav.go hann inte klart på 30 s')
  }
  if (navFel) throw navFel
  // Övergången från splashen (Navs gsap-tween) — ett fast antal steg per Hz.
  let guard = 0
  while (S.nav._busy && guard++ < 600) {
    steg()
    await yta()
  }
  if (!S.game || S.game.id !== id) throw new Error(`spelet ${id} monterades inte (game=${S.game?.id})`)
  const g = () => S.game
  const ctx = S.ctx

  const cv = document.querySelector('canvas')
  const peka = (typ, x, y) => {
    const r = cv.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    cv.dispatchEvent(
      new PointerEvent(typ, {
        clientX: r.left + r.width / 2 + (x - 640) * s,
        clientY: r.top + r.height / 2 + (y - 360) * s,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: typ === 'pointerup' ? 0 : 1,
        bubbles: true,
        isPrimary: true,
      }),
    )
  }

  const norm = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : String(v)
    if (v === undefined) return null
    try {
      return JSON.parse(JSON.stringify(v))
    } catch {
      return String(v)
    }
  }
  const lasa = (k) => {
    const t = (k * dt) / 1000
    const v = {}
    for (const e of fn) {
      try {
        v[e.namn] = norm(e.f(g(), ctx, S, t, k, hz))
      } catch (err) {
        v[e.namn] = `FEL: ${String(err.message || err).slice(0, 80)}`
      }
    }
    return { k, t: Number(t.toFixed(4)), v }
  }

  const N = Math.round(sek * hz)
  const prov = [lasa(0)]
  let nasta = varSek
  let h = 0
  const nPerf0 = K.nPerf
  const nDate0 = K.nDate
  for (let k = 1; k <= N; k++) {
    while (h < handelser.length && handelser[h].k <= k) {
      const e = handelser[h++]
      peka(e.typ, e.x, e.y)
    }
    steg()
    await yta()
    const t = (k * dt) / 1000
    if (t >= nasta - 1e-9 || k === N) {
      prov.push(lasa(k))
      while (nasta <= t + 1e-9) nasta += varSek
    }
  }
  return {
    hz,
    ticks: N,
    prov,
    klockanrop: { perfNow: K.nPerf - nPerf0, dateNow: K.nDate - nDate0 },
    varningar,
    handelserKvar: handelser.length - h,
  }
}

// ─── Utskrift ───────────────────────────────────────────────────────────────────────────────
const fmt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(3)) : v === null || v === undefined ? '–' : typeof v === 'string' ? v : JSON.stringify(v))
const tal = (v) => typeof v === 'number'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const armar = []
let kraschade = 0
try {
  console.log(`\n  Takt-sond — ${ID} · hz ${HZ.join(',')} · seed ${SEED} · ${SEK} s · klocka ${VIRTUELL ? 'VIRTUELL (performance.now/Date.now/gsap drivs av sonden)' : 'riktig (bara tickern drivs)'}`)
  console.log(`  uttryck: ${EXPR.map((e) => `${e.namn} = ${e.kod}`).join('  |  ')}`)
  if (trycken.length || dragen.length) console.log(`  tryck: ${trycken.length} · drag: ${dragen.length} (samma simulerade tid i varje arm)`)

  for (let a = 0; a < HZ.length; a++) {
    const hz = HZ[a]
    const page = await browser.newPage({ viewport: { width: VP_W, height: VP_H } })
    const fel = []
    page.on('pageerror', (e) => fel.push((e.message || String(e)).slice(0, 200)))
    page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 200)))
    try {
      await page.addInitScript(initSkript, { seed: SEED })
      await page.goto(URL, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => !!window.__barnspel && !!window.__barnspel.app, null, { timeout: 15000 })
      await page.waitForTimeout(400) // splashen får rita sin första ruta; sonden tar över sedan
      const r = await page.evaluate(kor, {
        id: ID,
        hz,
        sek: SEK,
        seed: SEED,
        exprs: EXPR,
        handelser: handelserFor(hz),
        varSek: VAR,
        virtuell: VIRTUELL,
      })
      if (SKARM) {
        mkdirSync('.test-shots', { recursive: true })
        await page.screenshot({ path: `.test-shots/_takt-${ID}-${hz}hz-arm${a}.png` })
      }
      armar.push({ arm: a, ...r, konsolfel: fel.slice(0, 3), antalFel: fel.length })
    } catch (err) {
      kraschade++
      armar.push({ arm: a, hz, ticks: 0, prov: [], kraschade: String(err.message || err).slice(0, 300), konsolfel: fel.slice(0, 3), antalFel: fel.length })
    } finally {
      await page.close()
    }
    const sista = armar[armar.length - 1]
    console.log(
      `  arm ${a}: ${hz} Hz · ${sista.ticks} tick` +
        (sista.kraschade ? ` · KRASCH: ${sista.kraschade}` : '') +
        (sista.klockanrop ? ` · klockanrop efter start: performance.now ${sista.klockanrop.perfNow}, Date.now ${sista.klockanrop.dateNow}` : '') +
        (sista.antalFel ? ` · ${sista.antalFel} konsolfel` : '') +
        (sista.varningar?.length ? ` · ⚠ ${sista.varningar.join('; ')}` : ''),
    )
  }
} finally {
  await browser.close()
}

const ok = armar.filter((a) => !a.kraschade)

// Per uttryck: tabell över provtider × armar (tunnad), slutvärde per arm, spridning.
console.log('')
const sammanfattning = {}
for (const e of EXPR) {
  console.log(`  ── ${e.namn}  (${e.kod})`)
  const rader = Math.min(...ok.map((a) => a.prov.length), Infinity)
  if (ok.length && Number.isFinite(rader) && rader > 0) {
    const tunn = Math.max(1, Math.ceil(rader / 12))
    console.log('     t(s)   ' + ok.map((a) => `${String(a.hz).padStart(3)}Hz#${a.arm}`.padStart(12)).join(' '))
    for (let i = 0; i < rader; i++) {
      if (i % tunn !== 0 && i !== rader - 1) continue
      console.log(`     ${ok[0].prov[i].t.toFixed(2).padStart(5)}  ` + ok.map((a) => fmt(a.prov[i].v[e.namn]).padStart(12)).join(' '))
    }
  }
  const slut = ok.map((a) => a.prov[a.prov.length - 1]?.v[e.namn])
  console.log(`     SLUT   ` + ok.map((a, i) => `${a.hz}Hz#${a.arm}=${fmt(slut[i])}`).join('  '))

  // Spridning över armarna: på varje provtid (index), max − min över armarna; störst och vid slutet.
  const alla_tal = ok.length > 1 && ok.every((a) => a.prov.every((p) => tal(p.v[e.namn])))
  let maxSpridning = null
  let slutSpridning = null
  if (alla_tal) {
    const n = Math.min(...ok.map((a) => a.prov.length))
    maxSpridning = 0
    for (let i = 0; i < n; i++) {
      const v = ok.map((a) => a.prov[i].v[e.namn])
      maxSpridning = Math.max(maxSpridning, Math.max(...v) - Math.min(...v))
    }
    const sv = slut
    slutSpridning = Math.max(...sv) - Math.min(...sv)
    console.log(`     max−min över armarna: slutet ${fmt(slutSpridning)} · störst under körningen ${fmt(maxSpridning)} (provtiderna skiljer högst ett tick mellan Hz)`)
  }

  // Kontrollarm: armar med SAMMA Hz ska vara identiska rakt av.
  const perHz = new Map()
  for (const a of ok) {
    if (!perHz.has(a.hz)) perHz.set(a.hz, [])
    perHz.get(a.hz).push(a)
  }
  const kontroller = []
  for (const [hz, grupp] of perHz) {
    if (grupp.length < 2) continue
    const ref = JSON.stringify(grupp[0].prov.map((p) => p.v[e.namn]))
    const lika = grupp.every((g2) => JSON.stringify(g2.prov.map((p) => p.v[e.namn])) === ref)
    kontroller.push({ hz, lika })
    console.log(`     KONTROLL ${hz} Hz × ${grupp.length}: ${lika ? 'IDENTISK — determinismen håller' : 'SKILJER — armen är inte deterministisk, jämför inget'}`)
  }
  sammanfattning[e.namn] = { slut, maxSpridning, slutSpridning, kontroller }
  console.log('')
}

const kontrollFel = Object.values(sammanfattning).some((s) => s.kontroller.some((c) => !c.lika))
const harKontroll = Object.values(sammanfattning).some((s) => s.kontroller.length)
if (!harKontroll) console.log('  (ingen kontrollarm — kör t.ex. --hz 60,60 för att bevisa determinismen före 30 mot 60)')
const konsolfel = armar.reduce((s, a) => s + (a.antalFel || 0), 0)
if (konsolfel) console.log(`  ⚠ ${konsolfel} konsolfel under körningarna: ${armar.flatMap((a) => a.konsolfel).slice(0, 3).join(' | ')}`)

if (JSON_UT) console.log(JSON.stringify({ id: ID, hz: HZ, seed: SEED, sek: SEK, virtuell: VIRTUELL, armar, sammanfattning }, null, 2))

const slutsats = kraschade ? `${kraschade} ARM(AR) KRASCHADE` : kontrollFel ? 'KONTROLLARMEN SKILJER — talen är inte jämförbara' : 'KLAR'
console.log(`  ${slutsats}\n`)
process.exit(kraschade || kontrollFel ? 1 : 0)
