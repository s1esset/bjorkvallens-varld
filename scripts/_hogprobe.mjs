// HÖG-SONDEN (FYSIKPLAN P3, M1-armen) — mäter lib/hog.js i TAL, utan webbläsare.
//
//   node scripts/_hogprobe.mjs [--json]
//
// Varje arm har en KONTROLLRAD som måste hålla innan mätraden läses (en mätning som inte rör sig mellan två
// KÄNDA lägen mäter ingenting). Faller en kontroll skrivs den armens mätrader inte och skriptet avslutar med 1.
//
//   A  taket          K: tak 1000 ger antal = N (mätaren rör sig)   M: tak 30 håller varje steg, de 30 NYASTE blir kvar
//   B  fångväggar     K: samma beskjutning mot ett golv utan sidor släpper ut kroppar   M: 0 utanför över 3 000 steg
//   C  kryp           K: sova av ger 0 sovande, på ger fler   M: sova på < 0,5 px/10 s (600 steg), för tre hopar
//   D  väckning       K: en kropp som tas bort UTAN väckning lämnar tornet hängande   M: Hogs borttagning faller ner
//   E  kostnad        ms/steg vid N = 0 / 10 / 30, sova av/på (hrtime, median av 5)
//   F  rakna-applen   spelets egna _hogSlot/_hogOpt: antal = fångade (3, 5, 7, 10), inga överlapp, i rader, i korgen
//   G  klambubblor    spelets egna _hogOpt: 26 pärlor in → 20 syns, högen under halsen, 0 rymt
//
// Spelens tal hämtas ur deras egna moduler (`_hogSlot`, `_hogOpt` är rena funktioner) — sonden kopierar inget.
import { performance } from 'node:perf_hooks'
import { Hog } from '../src/lib/hog.js'
import { PhysicsWorld } from '../src/lib/physics.js'
import raknaApplen from '../src/games/rakna-applen/index.js'
import klambubblor from '../src/games/klambubblor/index.js'

const FIXED = 1000 / 60
const JSON_UT = process.argv.includes('--json')
const f = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1]
const ut = (...a) => { if (!JSON_UT) console.log(...a) }
const res = {}
let fel = 0

function arm(id, titel) {
  const s = { id, titel, ok: true }
  res[id] = s
  ut(`\n== ${id} · ${titel}`)
  return s
}
function kontroll(s, namn, villkor, detalj = '') {
  if (!villkor) { s.ok = false; fel++ }
  ut(`  ${villkor ? 'ok ' : 'FEL'} KONTROLL ${namn}${detalj ? ' · ' + detalj : ''}`)
}
function rad(s, text, villkor = null) {
  if (villkor === false) { s.ok = false; fel++ }
  ut(`  ${villkor === false ? 'FEL' : villkor === true ? 'ok ' : ' · '} ${text}`)
}

// Deterministisk slump (mulberry32) — samma beskjutning i kontroll- och mätarm.
function slump(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BOX = { x0: 0, x1: 640, y1: 600 }
const nyVy = () => ({ x: 0, y: 0, rotation: 0, alpha: 1, destroyed: false, position: { set(x, y) { this._p = [x, y] } }, destroy() { this.destroyed = true } })

// ---------------------------------------------------------------- A · taket
function armA() {
  const s = arm('A', 'taket')
  const kor = (tak, N) => {
    const hog = new Hog({ kanter: BOX, tak })
    let maxAntal = 0
    let brott = 0
    for (let i = 0; i < N; i++) {
      hog.lagg({ cirkel: 11, vy: nyVy() }, 100 + (i % 20) * 24, 500)
      for (let k = 0; k < 8; k++) {
        hog.update(FIXED)
        maxAntal = Math.max(maxAntal, hog.antal)
        if (hog.antal > tak) brott++
      }
    }
    for (let k = 0; k < 90; k++) hog.update(FIXED) // låt uttoningen (0,45 s) bli klar
    const ids = hog.poster.map((p) => p.id)
    const r = { antal: hog.antal, synliga: hog.synliga, maxAntal, brott, minId: Math.min(...ids), maxId: Math.max(...ids) }
    hog.destroy()
    return r
  }
  const k = kor(1000, 50)
  kontroll(s, 'tak 1000 / N = 50: alla 50 syns (taket är det som begränsar)', k.antal === 50 && k.synliga === 50, `antal ${k.antal}`)
  const m = kor(30, 50)
  rad(s, `tak 30 / N = 50: antal ${m.antal}, synliga ${m.synliga}, högsta antal under körningen ${m.maxAntal}, steg över taket ${m.brott}`, m.antal === 30 && m.synliga === 30 && m.maxAntal <= 30 && m.brott === 0)
  rad(s, `de kvarvarande är de NYASTE: id ${m.minId}–${m.maxId} (väntat 21–50)`, m.minId === 21 && m.maxId === 50)
}

// ---------------------------------------------------------------- B · fångväggar
// Beskjutning: var 10:e steg en cirkel från slumpad x längst upp, fart upp till 40 px/steg åt slumpad riktning.
function beskjut(skapa, steg = 3000) {
  const r = slump(7)
  let ute = 0 // kropp-steg utanför lådan, räknat OBEROENDE av Hog (på kropparnas egna lägen)
  let bort = 0
  const kroppar = new Set()
  return {
    kor(lagg, tick, kropparNu) {
      for (let i = 0; i < steg; i++) {
        if (i % 10 === 0) {
          const v = 5 + r() * 35
          const a = r() * Math.PI * 2
          const b = lagg(40 + r() * 560, 20 + r() * 200, { x: Math.cos(a) * v, y: Math.sin(a) * v })
          if (b) kroppar.add(b)
        }
        tick()
        for (const b of kropparNu()) {
          const { x, y } = b.position
          if (!Number.isFinite(x) || x < BOX.x0 - 1 || x > BOX.x1 + 1 || y > BOX.y1 + 1) { ute++ }
        }
      }
      return { ute, bort }
    },
  }
}
function armB() {
  const s = arm('B', 'fångväggar — 3 000 steg, en cirkel var 10:e steg, fart 5–40 px/steg åt slumpad riktning')
  // KONTROLL: samma beskjutning mot ett golv UTAN sidor släpper ut kroppar (mätaren ser rymning).
  {
    const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor'], bounds: { left: 0, top: 0, right: 640, bottom: 600 } })
    const lista = []
    const b = beskjut()
    const r = b.kor((x, y, v) => { const k = phys.circle(x, y, 11, { restitution: 0.2 }); Body_setV(k, v); lista.push(k); return k }, () => phys.update(FIXED), () => lista)
    kontroll(s, 'golv utan sidor: kroppar ute ur lådan > 0', r.ute > 0, `${r.ute} kropp-steg utanför`)
    phys.destroy()
  }
  const kor = (extra) => {
    const hog = new Hog({ kanter: { ...BOX, ...extra }, tak: 30 })
    const b = beskjut()
    const r = b.kor((x, y, v) => hog.lagg({ cirkel: 11, vy: nyVy(), studs: 0.3 }, x, y, v)?.body, () => hog.update(FIXED), () => hog.poster.map((p) => p.body))
    const out = { ute: r.ute, rymt: hog.rymt, antal: hog.antal }
    hog.destroy()
    return out
  }
  const a = kor({})
  rad(s, `öppen låda: ${a.ute} kropp-steg utanför (oberoende räkning), hog.rymt ${a.rymt}, antal ${a.antal}`, a.ute === 0 && a.rymt === 0)
  const b = kor({ y0: 120 })
  rad(s, `med lock (y0 120): ${b.ute} utanför, hog.rymt ${b.rymt}`, b.ute === 0 && b.rymt === 0)
  const c = kor({ hornrund: 16 })
  rad(s, `med rundade hörn: ${c.ute} utanför, hog.rymt ${c.rymt}`, c.ute === 0 && c.rymt === 0)
}
import Matter from 'matter-js'
function Body_setV(b, v) { Matter.Body.setVelocity(b, v) }

// ---------------------------------------------------------------- C · kryp
function hogN(opt, fyll, { lag = 900, mat = 600, kanter = BOX, tak = 40 } = {}) {
  const hog = new Hog({ kanter, tak, ...opt })
  fyll(hog)
  for (let i = 0; i < lag; i++) hog.update(FIXED)
  const start = hog.poster.map((p) => ({ x: p.body.position.x, y: p.body.position.y }))
  for (let i = 0; i < mat; i++) hog.update(FIXED)
  let max = 0
  let sov = 0
  hog.poster.forEach((p, i) => {
    max = Math.max(max, Math.hypot(p.body.position.x - start[i].x, p.body.position.y - start[i].y))
    if (p.body.isSleeping) sov++
  })
  const r = { kryp: max, sov, n: hog.poster.length, rymt: hog.rymt }
  hog.destroy()
  return r
}
function armC() {
  const s = arm('C', 'kryp — px per 10 s (600 steg) efter 900 steg att lägga sig')
  const lada = (hog) => { for (let i = 0; i < 30; i++) hog.lagg({ cirkel: 11, vy: nyVy(), studs: 0.1 }, 60 + (i % 14) * 24 + (((i / 14) | 0) % 2) * 8, 570 - ((i / 14) | 0) * 26) }
  const av = hogN({ sova: false }, lada)
  const pa = hogN({ sova: true }, lada)
  kontroll(s, 'mätaren rör sig: sova av → 0 sovande, sova på → fler än 0', av.sov === 0 && pa.sov > 0, `av ${av.sov}/${av.n} · på ${pa.sov}/${pa.n}`)
  rad(s, `lådan 30 bollar: sova av ${f(av.kryp)} px · sova på ${f(pa.kryp)} px (sovande ${pa.sov}/${pa.n})`, pa.kryp < 0.5)
  // Spelens egna hopar (se F och G): korgens 10 frukter, burkens 20 pärlor.
  const kF = raknaApplen._hogOpt()
  const fruktHop = (hog) => { for (let i = 0; i < 10; i++) { const sl = raknaApplen._hogSlot(i, 10); hog.lagg({ cirkel: kF.postR, vy: nyVy(), studs: 0.18, friktion: 0.5, luft: 0.02 }, sl.x, sl.hoverY, { x: 0, y: 1.5 }); for (let k = 0; k < 40; k++) hog.update(FIXED) } }
  const fa = hogN({ ...kF, sova: false, bort: null }, fruktHop, { kanter: kF.kanter, tak: kF.tak })
  const fp = hogN({ ...kF, bort: null }, fruktHop, { kanter: kF.kanter, tak: kF.tak })
  rad(s, `korgens 10 frukter: sova av ${f(fa.kryp)} px · på ${f(fp.kryp)} px (sovande ${fp.sov}/${fp.n})`, fp.kryp < 0.5)
  const kG = klambubblor._hogOpt()
  const parlHop = (hog) => { for (let i = 0; i < 20; i++) { hog.lagg({ cirkel: 7, vy: nyVy(), studs: 0.25, friktion: 0.3, luft: 0.008 }, (i % 5 - 2) * 4, -49, { x: 0, y: 2 }); for (let k = 0; k < 30; k++) hog.update(FIXED) } }
  const ga = hogN({ ...kG, sova: false }, parlHop, { kanter: kG.kanter, tak: kG.tak })
  const gp = hogN({ ...kG }, parlHop, { kanter: kG.kanter, tak: kG.tak })
  rad(s, `burkens 20 pärlor: sova av ${f(ga.kryp)} px · på ${f(gp.kryp)} px (sovande ${gp.sov}/${gp.n})`, gp.kryp < 0.5)
}

// ---------------------------------------------------------------- D · väckning
function armD() {
  const s = arm('D', 'väckning — ett torn av cirklar i en smal låda, den understa tas bort')
  const torn = (naiv) => {
    const hog = new Hog({ kanter: { x0: 0, x1: 24, y1: 300 }, tak: 5, sova: true, gravitation: 1 })
    for (let i = 0; i < 5; i++) { hog.lagg({ cirkel: 11, vy: nyVy(), studs: 0.0 }, 12, 288 - i * 24); for (let k = 0; k < 4; k++) hog.update(FIXED) }
    for (let k = 0; k < 300; k++) hog.update(FIXED)
    const sov = hog.poster.filter((p) => p.body.isSleeping).length
    const topp0 = Math.min(...hog.poster.map((p) => p.body.position.y))
    const understa = hog.poster.reduce((a, p) => (p.body.position.y > a.body.position.y ? p : a))
    if (naiv) {
      // dagens sätt utan Hog: ta bort kroppen direkt och lämna resten sovande
      hog.fysik.removeBody(understa.body)
      hog._poster.splice(hog._poster.indexOf(understa), 1)
    } else {
      hog._ta(understa, true)
    }
    for (let k = 0; k < 120; k++) hog.update(FIXED)
    const topp1 = Math.min(...hog.poster.map((p) => p.body.position.y))
    hog.destroy()
    return { sov, fall: topp1 - topp0 }
  }
  const n = torn(true)
  kontroll(s, 'utan väckning hänger det sovande tornet kvar (fallet 0 px) — fällan finns', n.sov === 5 && Math.abs(n.fall) < 1, `${n.sov}/5 sov, fall ${f(n.fall, 1)} px`)
  const m = torn(false)
  rad(s, `Hog._ta väcker: tornets topp faller ${f(m.fall, 1)} px (väntat ≈ 22 = en kula)`, m.fall > 18 && m.fall < 30)
}

// ---------------------------------------------------------------- E · kostnad
function armE() {
  const s = arm('E', 'kostnad — ms per fast steg (hrtime, median av 5)')
  const kostnad = (N, sova) => {
    const prov = []
    for (let rep = 0; rep < 5; rep++) {
      const hog = new Hog({ kanter: BOX, tak: 40, sova })
      for (let i = 0; i < N; i++) hog.lagg({ cirkel: 11, vy: nyVy() }, 60 + (i % 14) * 24 + (((i / 14) | 0) % 2) * 8, 570 - ((i / 14) | 0) * 26)
      for (let i = 0; i < 300; i++) hog.update(FIXED)
      const t0 = performance.now()
      for (let i = 0; i < 300; i++) hog.update(FIXED)
      prov.push((performance.now() - t0) / 300)
      hog.destroy()
    }
    return median(prov)
  }
  const t0 = kostnad(0, true)
  const rows = [[10, false], [10, true], [30, false], [30, true]].map(([n, sv]) => [n, sv, kostnad(n, sv)])
  const av30 = rows.find((r) => r[0] === 30 && !r[1])[2]
  kontroll(s, 'kostnaden växer med N: N = 30 (sova av) dyrare än tom värld', av30 > t0, `${f(t0, 4)} → ${f(av30, 4)} ms`)
  rad(s, `N = 0: ${f(t0, 4)} ms/steg`)
  for (const [n, sv, t] of rows) rad(s, `N = ${n}, sova ${sv ? 'på ' : 'av'}: ${f(t, 4)} ms/steg`)
  rad(s, 'N = 30 kostar < 0,3 ms/steg även utan sömn (en bildruta kör 1 steg)', av30 < 0.3)
}

// ---------------------------------------------------------------- F · rakna-applen
function armF() {
  const s = arm('F', 'rakna-applen — spelets egna _hogSlot + _hogOpt, frukterna släpps i takt (0,4 s) och otåligt (0,1 s)')
  const opt = raknaApplen._hogOpt()
  const kor = (total, takt) => {
    const hog = new Hog({ ...opt, bort: null })
    let fallen = 0
    hog.paSlag(() => { fallen++ })
    const slots = []
    for (let i = 0; i < total; i++) {
      const sl = raknaApplen._hogSlot(i, total)
      slots.push(sl)
      hog.lagg({ cirkel: opt.postR, vy: nyVy(), studs: 0.18, friktion: 0.5, luft: 0.02 }, sl.x, sl.hoverY, { x: 0, y: 1.5 })
      for (let k = 0; k < takt; k++) hog.update(FIXED)
    }
    for (let k = 0; k < 400; k++) hog.update(FIXED)
    const P = hog.poster.map((p) => ({ x: p.body.position.x, y: p.body.position.y, id: p.id }))
    let minD = Infinity
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) minD = Math.min(minD, Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y))
    let maxDy = 0
    P.forEach((p, i) => { maxDy = Math.max(maxDy, Math.abs(p.y - slots[i].restY)) })
    const ys = P.map((p) => p.y).sort((a, b) => a - b)
    let rader = 1
    for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > 14) rader++
    const R = opt.postR
    const topp = Math.min(...P.map((p) => p.y)) - R
    const inom = P.every((p) => p.x - R >= opt.kanter.x0 - 1 && p.x + R <= opt.kanter.x1 + 1)
    const r = { antal: hog.antal, synliga: hog.synliga, minD, maxDy, rader, topp, inom, rymt: hog.rymt, fallen, vilar: hog.vilar }
    hog.destroy()
    return r
  }
  // KONTROLL: mätaren skiljer rader åt — 3 frukter är en rad, 7 är två (kända lägen).
  {
    const tre = kor(3, 24)
    const sju = kor(7, 24)
    kontroll(s, 'radmätaren: 3 frukter → 1 rad, 7 frukter → 2 rader', tre.rader === 1 && sju.rader === 2, `${tre.rader} / ${sju.rader}`)
  }
  for (const [total, takt] of [[3, 24], [5, 24], [7, 24], [10, 24], [10, 6], [5, 6]]) {
    const r = kor(total, takt)
    rad(s, `${String(total).padStart(2)} frukter, ${takt === 24 ? 'lugnt' : 'otåligt'}: antal ${r.antal}/${total} · rader ${r.rader} · minsta avstånd ${f(r.minD, 1)} px · störst avvikelse från platsen ${f(r.maxDy, 1)} px · högen når y ${f(r.topp, 0)} · i korgen ${r.inom} · rymt ${r.rymt} · slag ${r.fallen} · vilar ${r.vilar}`,
      r.antal === total && r.synliga === total && r.minD >= 38 && r.inom && r.rymt === 0 && r.vilar)
  }
  // 5 frukter: allt på EN rad (precis som den gamla staplingen)
  const fem = kor(5, 24)
  rad(s, `5 frukter ligger på en rad (väntat 1 rad, fick ${fem.rader})`, fem.rader === 1)
}

// ---------------------------------------------------------------- G · klambubblor
function armG() {
  const s = arm('G', 'klambubblor — spelets egna _hogOpt: 26 pärlor in (en per 0,5 s + en regnbågskedja på 7 inom 0,6 s)')
  const opt = klambubblor._hogOpt()
  const kor = (N, kedja) => {
    const hog = new Hog({ ...opt })
    const r = slump(11)
    let maxAntal = 0
    for (let i = 0; i < N; i++) {
      hog.lagg({ cirkel: opt.postR, vy: nyVy(), studs: 0.25, friktion: 0.3, luft: 0.008 }, (r() * 2 - 1) * 9, -49, { x: (r() * 2 - 1) * 0.5, y: 2 })
      const lucka = kedja && i >= 10 && i < 17 ? 5 : 30
      for (let k = 0; k < lucka; k++) { hog.update(FIXED); maxAntal = Math.max(maxAntal, hog.antal) }
    }
    for (let k = 0; k < 400; k++) hog.update(FIXED)
    const P = hog.poster.filter((p) => !p.ute).map((p) => ({ x: p.body.position.x, y: p.body.position.y }))
    let minD = Infinity
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) minD = Math.min(minD, Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y))
    const R = opt.postR
    const topp = Math.min(...P.map((p) => p.y)) - R
    const inom = P.every((p) => p.x - R >= opt.kanter.x0 - 1 && p.x + R <= opt.kanter.x1 + 1 && p.y + R <= opt.kanter.y1 + 1)
    const out = { antal: hog.antal, synliga: hog.synliga, maxAntal, minD, topp, inom, rymt: hog.rymt, vilar: hog.vilar }
    hog.destroy()
    return out
  }
  // KONTROLL: 12 pärlor (under taket) → alla syns (antal = fångade), 26 → taket.
  const lite = kor(12, false)
  kontroll(s, '12 fångade (under taket): 12 syns', lite.antal === 12 && lite.synliga === 12, `antal ${lite.antal}`)
  const m = kor(26, false)
  rad(s, `26 fångade: antal ${m.antal} (tak ${opt.tak}), synliga ${m.synliga}, minsta avstånd ${f(m.minD, 1)} px, högen når y ${f(m.topp, 1)} (halsen börjar −54), i burken ${m.inom}, rymt ${m.rymt}, vilar ${m.vilar}`,
    m.antal === opt.tak && m.synliga === opt.tak && m.topp >= -52 && m.inom && m.rymt === 0 && m.vilar && m.minD >= 12)
  const k = kor(26, true)
  rad(s, `26 fångade med en kedja på 7 på 0,6 s: antal ${k.antal}, högsta antal ${k.maxAntal}, minsta avstånd ${f(k.minD, 1)} px, högen når y ${f(k.topp, 1)}, i burken ${k.inom}, rymt ${k.rymt}`,
    k.antal === opt.tak && k.maxAntal <= opt.tak && k.inom && k.rymt === 0 && k.minD >= 12)
}

armA()
armB()
armC()
armD()
armE()
armF()
armG()
if (JSON_UT) console.log(JSON.stringify(res))
ut(`\n${fel === 0 ? 'ALLT GRÖNT' : fel + ' FEL'}`)
process.exit(fel === 0 ? 0 : 1)
