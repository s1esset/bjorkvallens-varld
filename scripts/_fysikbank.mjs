// FYSIKBÄNKEN (FYSIKPLAN M1) — mäter fysikbiblioteken i TAL, utan webbläsare.
//
//   node scripts/_fysikbank.mjs [--bara S6,S7,S8] [--json]
//
// Varje scen har en KONTROLLRAD som måste hålla innan mätraden skrivs. Faller kontrollen
// skrivs inga mätrader för scenen (en mätning som inte rör sig mellan två KÄNDA lägen
// säger ingenting om det okända) och skriptet avslutar med kod 1.
//
// Byggt i natt (fas F6, B1):  S6 takt · S7 kostnad · S8 kinematik.
// TODO — INTE med än (kopiera mallen i S6/S8 när de byggs):
//
//   | Scen | Mäter                                              | Kontrollrad                         | Återanvänd |
//   |------|----------------------------------------------------|-------------------------------------|------------|
//   | S1   | vilande hög: kryp px/10 s + ms/steg, sova av/på    | N = 0 ger 0,000 ms-golvet           | S7:s hög   |
//   | S2   | statisk yta: studs max(A,B), friktion min(A,B)     | 13/13 ur _studsprobe                | _studsprobe (importera, kopiera inte) |
//   | S3   | tunnling: kula mot 16 px vägg vid 10–60 px/steg    | 10 px/steg studsar alltid           | S8:s vägg  |
//   | S4   | leder: gångjärnsdrift, pendelenergi damp 0/0,1     | damp 0,1 MÅSTE tappa snurr          | _superhoppprobe |
//   | S5   | grepp: drivPunkt mot Constraint vid r²·m/I 0,5/1/3 | Constraint vid 3,0 MÅSTE skena      | karl.js drivPunkt |
//   | S9   | brytbart: rörelsemängd före/efter delning          | ingen delning under gränsen         | (väntar på F3) |
//   Saknas i S6 (M1-tabellen nämner dem): magnetfångst (kräver Magnetfalt-loopen ur magnet-fiske),
//   mjukkroppshäng (marshmallowen), rephäng (`rep.js`), Motstandsvolym-fall. Saknas i S7:
//   skuggvärld per omritning (G3a finns inte än).
//
// ARMAR (S6). Bänken beror INTE på att lib-filerna står i något visst läge:
//   ref    DAGENS ackumulator + DAGENS flytkraft per bildruta, inbäddade i den här filen
//          (kopia av physics.js:update och flytkraft.js:steg före T1/T4). Kontrollarmen.
//   ref-T  samma värld MED snäpp (`|d − FIXED| < 0,5 → d = FIXED`, T4) och flytkraften per
//          FYSIKSTEG (T1). Målläget i referensform — det talen i FYSIKPLAN §1.3.3 lovar.
//   lib    src/lib/physics.js + src/lib/flytkraft.js som de står just nu. Självstegning
//          (T1) DETEKTERAS: har volymen lagt en `beforeUpdate`-lyssnare på motorn anropar vi
//          inte `steg(t)`. Före B3 stegar bänken volymen per bildruta, som spelen gör i dag.
//
// Pixis riktiga `Ticker` (`maxFPS = 60`, vsync-stämplar kvantiserade till 0,1 ms) driver
// bildrutorna precis som i App.js. Kontrollen kör i stället `deltaMS = 1000/60` EXAKT, utan
// ticker: stämplar som är OKVANTISERADE går inte att tro på genom tickern, och det är mätt —
// flyttalsbruset i `currentTime − lastFrame` ger 99,3/0,7 % vid start 0 och 33/33/33 % vid
// start 1000 ms (rest på tröskeln), trots att varje ruta är "exakt" 16,667 ms.
import Matter from 'matter-js'
import { Ticker } from 'pixi.js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Flytvolym } from '../src/lib/flytkraft.js'
import { FluidWorld } from '../src/lib/vatska.js'
import { Mjukkropp } from '../src/lib/mjukkropp.js'

const { Engine, Composite, Bodies, Body, Events } = Matter

const FIXED = 1000 / 60
const args = process.argv.slice(2)
const JSON_UT = args.includes('--json')
const baraIdx = args.indexOf('--bara')
const BARA = baraIdx >= 0 ? new Set(args[baraIdx + 1].split(',').map((s) => s.trim().toUpperCase())) : null
const startIdx = args.indexOf('--start') // vsync-stämplarnas nollpunkt (ms) — 60,00 Hz-raden beror på den, se §1.3.3
const STARTMS = startIdx >= 0 ? Number(args[startIdx + 1]) : 1000
const vill = (id) => !BARA || BARA.has(id)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const f = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] }
const ut = (...a) => { if (!JSON_UT) console.log(...a) }

// ─── gemensamt: scenresultat, kontrollrader ──────────────────────────────────────────────────
const resultat = {}
let kontrollFel = 0

function scen(id, titel) {
  const s = { id, titel, kontroll: [], rader: [], noter: [], kontrollHolls: true }
  resultat[id] = s
  ut(`\n══ ${id} · ${titel} ${'═'.repeat(Math.max(2, 78 - id.length - titel.length))}`)
  return s
}
function kontroll(s, namn, villkor, detalj = '') {
  s.kontroll.push({ namn, ok: !!villkor, detalj })
  if (!villkor) { s.kontrollHolls = false; kontrollFel++ }
  ut(`  ${villkor ? '✓' : '✗'} KONTROLL ${namn}${detalj ? ' · ' + detalj : ''}`)
}
function not(s, text) { s.noter.push(text); ut(`  · ${text}`) }

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S6 — TAKT
// ═════════════════════════════════════════════════════════════════════════════════════════════

// --- Referensvärlden: dagens PhysicsWorld.update, ordagrant (utan vind/länkar) -----------------
class RefVarld {
  constructor({ gravityY = 1, snap = false } = {}) {
    this.engine = Engine.create()
    this.engine.gravity.y = gravityY
    this._acc = 0
    this._snap = snap
  }
  _stat(body) { Body.setStatic(body, true); Composite.add(this.engine.world, body); return body }
  rectangle(x, y, w, h, o = {}) {
    const { isStatic, ...rest } = o
    const b = Bodies.rectangle(x, y, w, h, rest)
    if (isStatic) return this._stat(b)
    Composite.add(this.engine.world, b); return b
  }
  circle(x, y, r, o = {}) {
    const { isStatic, ...rest } = o
    const b = Bodies.circle(x, y, r, rest)
    if (isStatic) return this._stat(b)
    Composite.add(this.engine.world, b); return b
  }
  beforeStep(fn) { Events.on(this.engine, 'beforeUpdate', fn) }
  update(deltaMS) {
    let d = Math.min(deltaMS || FIXED, 100)
    if (this._snap && Math.abs(d - FIXED) < 0.5) d = FIXED
    this._acc += d
    let steps = 0
    while (this._acc >= FIXED && steps < 5) {
      Engine.update(this.engine, FIXED)
      this._acc -= FIXED
      steps++
    }
    if (steps >= 5) this._acc = 0
  }
}

// --- Referensflytvolymen: flytkraft.js:steg ordagrant (utan ström/exit), valfritt per fysiksteg -
class RefFlyt {
  constructor({ varld, ytY, botten, vanster, hoger, perSteg = false }) {
    this.engine = varld.engine
    Object.assign(this, { ytY, botten, vanster, hoger })
    this.motstand = 0.93; this.maxFart = 10; this.vridDamp = 0.9
    this.fjader = 0.00003; this.maxSid = 0.0008
    this.guppAmp = 0.0007; this.guppW = 1.8; this.vaggAmp = 0.00025; this.vaggW = 1.4
    this.bottenLugn = 0.7; this.bottenMarg = 8
    this._items = []
    this._t = 0
    if (perSteg) varld.beforeStep(() => { this._t += 1 / 60; this.steg(this._t) })
  }
  get bas() { return this.engine.gravity.y * (this.engine.gravity.scale ?? 0.001) }
  lagg(body, { flyt = 1, hemX = null, fas = 0, liv = false } = {}) {
    const bb = body.bounds
    this._items.push({ body, flyt, r: body.circleRadius || (bb.max.y - bb.min.y) / 2, hemX, fas, liv })
  }
  nedsankning(body) { const o = this._items.find((i) => i.body === body); return o ? this._frac(o) : 0 }
  _frac(o) {
    const p = o.body.position
    if (p.x < this.vanster || p.x > this.hoger) return 0
    return clamp((p.y + o.r - this.ytY) / (2 * o.r), 0, 1)
  }
  steg(t = 0) {
    for (const o of this._items) {
      const b = o.body
      const pos = b.position
      const frac = this._frac(o)
      if (frac > 0) {
        let vAcc = -this.bas * frac * o.flyt
        let sidA = o.hemX == null ? 0 : this.fjader * (o.hemX - pos.x)
        if (o.liv) {
          vAcc += this.guppAmp * Math.sin(t * this.guppW + o.fas)
          sidA += this.vaggAmp * Math.sin(t * this.vaggW + o.fas * 1.3)
        }
        sidA = clamp(sidA, -this.maxSid, this.maxSid)
        Body.applyForce(b, pos, { x: b.mass * sidA, y: b.mass * vAcc })
        Body.setVelocity(b, { x: b.velocity.x * this.motstand, y: b.velocity.y * this.motstand })
      }
      if (this.botten != null && pos.y > this.botten - o.r - this.bottenMarg) {
        Body.setVelocity(b, { x: b.velocity.x * this.bottenLugn, y: b.velocity.y * this.bottenLugn })
      }
      if (b.angularVelocity) Body.setAngularVelocity(b, b.angularVelocity * this.vridDamp)
      const sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > this.maxFart) Body.setVelocity(b, { x: (b.velocity.x / sp) * this.maxFart, y: (b.velocity.y / sp) * this.maxFart })
    }
  }
}

// --- plask-i-vattnets tank (samma tal som _flytprobe) ------------------------------------------
const TANK = { ytY: 330, botten: 672, vanster: 414, hoger: 866, r: 38, grav: 0.9, flyt: 1.6, hemX: 640 }

function byggTank(arm) {
  const mk = arm === 'lib'
    ? new PhysicsWorld({ gravityY: TANK.grav, walls: [] })
    : new RefVarld({ gravityY: TANK.grav, snap: arm === 'ref-T' })
  const T = 60
  const cx = (TANK.hoger + TANK.vanster) / 2
  mk.rectangle(cx, TANK.botten + T / 2, TANK.hoger - TANK.vanster + T * 2, T, { isStatic: true, restitution: 0.04, friction: 0.6 })
  mk.rectangle(TANK.vanster - T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3 })
  mk.rectangle(TANK.hoger + T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3 })
  const b = mk.circle(TANK.hemX, 470, TANK.r, { restitution: 0.06, friction: 0.3, frictionAir: 0.012, density: 0.0012 })
  Body.setVelocity(b, { x: 0, y: 1.8 })

  const geo = { varld: mk, ytY: TANK.ytY, botten: TANK.botten, vanster: TANK.vanster, hoger: TANK.hoger }
  const lyssnare0 = mk.engine.events?.beforeUpdate?.length ?? 0
  const vol = arm === 'lib' ? new Flytvolym(geo) : new RefFlyt({ ...geo, perSteg: arm === 'ref-T' })
  vol.lagg(b, { flyt: TANK.flyt, hemX: TANK.hemX, fas: 0, liv: false })
  // Självstegning = volymen la en beforeUpdate-lyssnare på motorn (före eller vid lagg()).
  const sjalvsteg = arm === 'lib' ? (mk.engine.events?.beforeUpdate?.length ?? 0) > lyssnare0 : arm === 'ref-T'
  // Egen stegräknare — räknar fysiksteg oavsett vem som stegar.
  let steg = 0
  Events.on(mk.engine, 'beforeUpdate', () => { steg++ })
  return { mk, vol, b, sjalvsteg, stegRaknare: () => steg }
}

// En körning: `hz` vsync, `kvant` 0,1 ms-stämplar, `direkt` = exakt FIXED utan ticker.
function kor6(arm, hz, { kvant = true, direkt = false, sek = 60, matSek = 20 } = {}) {
  const T = byggTank(arm)
  const hist = [0, 0, 0, 0] // 0 / 1 / 2 / 3+ steg per avfyrad ruta
  let fired = 0
  let tid = 0
  const summa = { n: 0, s: 0 }
  const cb = (t) => {
    fired++
    tid += t.deltaMS / 1000
    const s0 = T.stegRaknare()
    if (!T.sjalvsteg) T.vol.steg(tid) // spelets ordning: volymen FÖRE världen (bara när den inte stegar sig själv)
    T.mk.update(t.deltaMS)
    const n = T.stegRaknare() - s0
    if (fired > 10) hist[Math.min(3, n)]++
    if (tid > sek - matSek) { summa.n++; summa.s += T.vol.nedsankning(T.b) }
  }
  const nVsync = Math.round(sek * hz)
  if (direkt) {
    for (let i = 0; i < nVsync; i++) cb({ deltaMS: FIXED })
  } else {
    const tk = new Ticker()
    tk.autoStart = false
    tk.maxFPS = 60 // som src/shell/App.js:24
    tk.add(cb)
    const START = STARTMS
    for (let i = 0; i <= nVsync; i++) {
      const s = START + (i * 1000) / hz
      tk.update(kvant ? Math.round(s * 10) / 10 : s)
    }
  }
  const tot = hist.reduce((a, b) => a + b, 0) || 1
  return { arm, hz, kvant, direkt, fired, procent: hist.map((h) => (100 * h) / tot), flyt: summa.s / Math.max(1, summa.n), sjalvsteg: T.sjalvsteg }
}

function s6() {
  const s = scen('S6', 'takt — Pixis Ticker (maxFPS 60, stämplar à 0,1 ms) → stegfördelning + flytjämvikt `flyt 1,6`')
  const RATT = 1 / TANK.flyt // 0,625
  const TOL = 0.005

  // KONTROLLRAD: 60,000 Hz OKVANTISERAT (exakt deltaMS 1000/60, utan ticker) → exakt 1 steg/ruta, 0,625.
  const kRef = kor6('ref', 60, { direkt: true })
  kontroll(s, 'ref @60,000 Hz okvantiserat → exakt 1 steg/ruta', kRef.procent[1] === 100, `${kRef.procent.map((p) => f(p, 1)).join('/')} %`)
  kontroll(s, 'ref @60,000 Hz → flytjämvikt 0,625 ± 0,005', Math.abs(kRef.flyt - RATT) < TOL, f(kRef.flyt))
  const kLib = kor6('lib', 60, { direkt: true })
  kontroll(s, 'lib @60,000 Hz okvantiserat → exakt 1 steg/ruta', kLib.procent[1] === 100, `${kLib.procent.map((p) => f(p, 1)).join('/')} %`)
  kontroll(s, 'lib @60,000 Hz → flytjämvikt 0,625 ± 0,005', Math.abs(kLib.flyt - RATT) < TOL, f(kLib.flyt) + (kLib.sjalvsteg ? ' (självstegar)' : ' (stegas per bildruta)'))
  // Mätaren måste RÖRA SIG: dagens kod vid 30 Hz ska sjunka (känt läge: 1,000), annars mäter bänken inget.
  const k30 = kor6('ref', 30)
  kontroll(s, 'mätaren rör sig: ref @30 Hz ≠ ref @60,000 (dagens kod sjunker)', k30.flyt - kRef.flyt > 0.25, `${f(k30.flyt)} mot ${f(kRef.flyt)}`)
  s.kontrollRad = { refDirekt: kRef, libDirekt: kLib }
  if (!s.kontrollHolls) { ut('  ✗ kontrollen höll inte — inga mätrader för S6'); return }

  const HZ = [30, 40, 50, 57.1, 59.94, 60, 90, 120]
  const ARMAR = ['ref', 'ref-T', 'lib']
  const LASSTALL = { 30: 1.0, 40: 0.927, 50: 0.746, 57.1: 0.656, 60: 0.637, 90: 0.637, 120: 0.630 } // §1.3.3 (dagens kod)
  ut(`\n  ${pad('arm', 6)} ${padL('Hz', 6)} ${padL('0 steg', 8)} ${padL('1 steg', 8)} ${padL('2 steg', 8)} ${padL('3+', 6)} ${padL('flyt', 7)} ${padL('Δ0,625', 8)} ${padL('§1.3.3', 7)}`)
  for (const hz of HZ) {
    for (const arm of ARMAR) {
      const r = kor6(arm, hz)
      const rad = { ...r, delta: r.flyt - RATT, fysikplan: arm === 'ref' ? LASSTALL[hz] ?? null : null }
      s.rader.push(rad)
      ut(`  ${pad(arm + (arm === 'lib' ? (r.sjalvsteg ? '*' : '') : ''), 6)} ${padL(hz, 6)} ${r.procent.map((p, i) => padL(f(p, 1) + '%', i < 3 ? 8 : 6)).join(' ')} ${padL(f(r.flyt), 7)} ${padL((rad.delta >= 0 ? '+' : '') + f(rad.delta), 8)} ${padL(rad.fysikplan != null ? f(rad.fysikplan) : '', 7)}`)
    }
    ut('')
  }
  not(s, 'ref = dagens kod · ref-T = snäpp 0,5 ms + flytkraft per steg (målläget) · lib* = lib-filerna som de står, flytvolymen stegar sig själv')
  not(s, 'förväntat dagens kod: 32/34/34 % @60 · 0/99/1 @59,94 · 0/95/5 @57,1 · flyt 1,000 / 0,927 / 0,746 / 0,656 / 0,637 @30/40/50/57/60')
  not(s, 'förväntat efter T4: ~0/98/2 % @60 · efter T1: 0,625 ± 0,005 vid alla Hz (lib-raderna ska likna ref-T)')
  const l = s.rader.filter((r) => r.arm === 'lib')
  s.libSjalvsteg = l[0]?.sjalvsteg ?? false
  not(s, `lib läge: flytvolymen ${s.libSjalvsteg ? 'STEGAR SIG SJÄLV (T1 inne)' : 'stegas per bildruta av bänken (dagens läge)'}`)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S7 — KOSTNAD
// ═════════════════════════════════════════════════════════════════════════════════════════════

const nu = () => Number(process.hrtime.bigint()) / 1e6 // ms

// Vilande hög: N cirklar (r 16) som släpps i en låda och sedan får lägga sig.
function vilandeHog(N, { sova = false } = {}) {
  const eng = Engine.create({ enableSleeping: sova })
  eng.gravity.y = 1
  const W = 640, H = 600
  const stat = (x, y, w, h) => { const b = Bodies.rectangle(x, y, w, h); Body.setStatic(b, true); Composite.add(eng.world, b) }
  stat(W / 2, H + 30, W + 200, 60); stat(-30, H / 2, 60, H * 2); stat(W + 30, H / 2, 60, H * 2)
  const kol = 16
  for (let i = 0; i < N; i++) {
    const x = 120 + (i % kol) * 24 + ((i / kol) | 0) % 2 * 8
    const y = H - 30 - ((i / kol) | 0) * 26
    Composite.add(eng.world, Bodies.circle(x, y, 11, { restitution: 0.1, friction: 0.4 }))
  }
  for (let i = 0; i < 300; i++) Engine.update(eng, FIXED) // lägg sig
  return eng
}
function msPerSteg(N, opt) {
  const prov = []
  for (let rep = 0; rep < 5; rep++) {
    const eng = vilandeHog(N, opt)
    const t0 = nu()
    for (let i = 0; i < 300; i++) Engine.update(eng, FIXED)
    prov.push((nu() - t0) / 300)
  }
  return median(prov)
}

function vatskeKostnad(N) {
  const prov = []
  for (let rep = 0; rep < 3; rep++) {
    const w = new FluidWorld({ max: N, gravityY: 0.5, bounds: { left: 0, right: 1280, top: -200, bottom: 720 } })
    const kol = Math.ceil(Math.sqrt(N))
    for (let i = 0; i < N; i++) w.spawn(500 + (i % kol) * 7, 450 - ((i / kol) | 0) * 7)
    for (let i = 0; i < 40; i++) w.update(FIXED)
    const t0 = nu()
    for (let i = 0; i < 100; i++) w.update(FIXED)
    prov.push((nu() - t0) / 100)
  }
  return median(prov)
}

function mjukKostnad(antal) {
  const prov = []
  for (let rep = 0; rep < 5; rep++) {
    const k = []
    for (let i = 0; i < antal; i++) k.push(new Mjukkropp({ x: 100 + i * 40, y: 100, w: 60, h: 60, punkter: 14 }))
    for (let i = 0; i < 100; i++) for (const m of k) m.steg(1)
    const t0 = nu()
    for (let i = 0; i < 1000; i++) for (const m of k) m.steg(1)
    prov.push(((nu() - t0) * 1000) / 1000) // µs per bildruta för alla kroppar
  }
  return median(prov)
}

function s7() {
  const s = scen('S7', 'kostnad — ren tid runt steget (hrtime, median av 3–5), desktop')
  const NS = [6, 17, 34, 60, 120]
  const golv = msPerSteg(0)
  const eng = NS.map((n) => msPerSteg(n))
  const sov = NS.map((n) => msPerSteg(n, { sova: true }))
  const vNs = [200, 400, 800]
  const vat = vNs.map((n) => vatskeKostnad(n))
  const mNs = [1, 10, 30]
  const mjuk = mNs.map((n) => mjukKostnad(n))

  // KONTROLLRAD: kostnaden växer med N (annars mäter klockan något annat än lösaren).
  const vaxer = (a) => a.every((v, i) => i === 0 || v > a[i - 1])
  kontroll(s, 'Engine.update växer med N (6→120 strikt stigande)', vaxer(eng), eng.map((v) => f(v, 4)).join(' < '))
  kontroll(s, 'Engine.update: N = 120 minst 5× N = 6', eng[4] > 5 * eng[0], `${f(eng[4] / eng[0], 1)}×`)
  kontroll(s, 'tom värld (N = 0) är golvet: billigare än N = 6', golv < eng[0], `${f(golv, 4)} ms`)
  kontroll(s, 'FluidWorld växer med N (200→800)', vaxer(vat), vat.map((v) => f(v, 3)).join(' < '))
  kontroll(s, 'Mjukkropp växer med antal (1→30)', vaxer(mjuk), mjuk.map((v) => f(v, 1)).join(' < '))
  if (!s.kontrollHolls) { ut('  ✗ kontrollen höll inte — inga mätrader för S7'); return }

  const FP = { 6: 0.005, 17: 0.018, 34: 0.044, 60: 0.090, 120: 0.226 } // §1.3.2
  ut(`\n  ${pad('Engine.update', 14)} ${padL('ms/steg', 9)} ${padL('med sömn', 10)} ${padL('§1.3.2', 8)}`)
  NS.forEach((n, i) => {
    s.rader.push({ vad: 'Engine.update', N: n, msPerSteg: eng[i], medSomn: sov[i], fysikplan: FP[n] })
    ut(`  ${pad('N = ' + n, 14)} ${padL(f(eng[i], 4), 9)} ${padL(f(sov[i], 4), 10)} ${padL(FP[n], 8)}`)
  })
  ut(`  ${pad('N = 0 (golv)', 14)} ${padL(f(golv, 4), 9)}`)
  s.rader.push({ vad: 'Engine.update', N: 0, msPerSteg: golv })
  ut(`\n  ${pad('FluidWorld', 14)} ${padL('ms/steg', 9)}`)
  vNs.forEach((n, i) => { s.rader.push({ vad: 'FluidWorld', N: n, msPerSteg: vat[i] }); ut(`  ${pad('N = ' + n, 14)} ${padL(f(vat[i], 3), 9)}`) })
  ut(`\n  ${pad('Mjukkropp', 14)} ${padL('µs/ruta', 9)}   (14 punkter per kropp)`)
  mNs.forEach((n, i) => { s.rader.push({ vad: 'Mjukkropp', antal: n, usPerRuta: mjuk[i] }); ut(`  ${pad(n + ' kroppar', 14)} ${padL(f(mjuk[i], 1), 9)}`) })
  not(s, '§1.3.2 är mätt på en annan hög (formen står inte i planen): jämför KURVAN, inte absoluta tal. En platta är flera gånger långsammare än en desktop — faktorn är omätt (M4, --cpu 6)')
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S8 — KINEMATIK: statisk vägg dras in i en boll
// ═════════════════════════════════════════════════════════════════════════════════════════════

// En vägg 16×120 dras i sidled mot en boll (r 22). Två sätt att flytta en STATISK kropp:
//   'teleport'  Body.setPosition(vagg, p) en gång per bildruta (dagens mönster) — farten förblir 0
//   'fart'      Body.setPosition(vagg, p, true) i beforeStep, per fysiksteg, och nollad i vila
function kor8(v, lage, { rorelse = true } = {}) {
  const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
  const bollX0 = 640
  const ball = phys.circle(bollX0, 360, 22, { restitution: 0.3, friction: 0.05, frictionAir: 0 })
  const vagg = phys.rectangle(400, 360, 16, 120, { isStatic: true })
  const fart = rorelse ? v : 0
  const RUTOR = Math.ceil(300 / Math.max(v, 1)) // väggen dras ~300 px
  let kvar = rorelse ? RUTOR : 0
  let toppFart = 0
  let tunnlade = false
  let unbind = null
  if (lage === 'fart') {
    unbind = phys.beforeStep(() => {
      if (kvar > 0) Body.setPosition(vagg, { x: vagg.position.x + fart, y: vagg.position.y }, true)
      else Body.setVelocity(vagg, { x: 0, y: 0 })
    })
  }
  const total = RUTOR + 40
  for (let i = 0; i < total; i++) {
    if (lage === 'teleport' && kvar > 0) Body.setPosition(vagg, { x: vagg.position.x + fart, y: vagg.position.y })
    phys.update(FIXED)
    if (kvar > 0) kvar--
    toppFart = Math.max(toppFart, Math.hypot(ball.velocity.x, ball.velocity.y))
    if (vagg.position.x >= ball.position.x) tunnlade = true // väggens mitt har passerat bollens mitt
  }
  const res = { toppFart, bollFlytt: ball.position.x - bollX0, tunnlade, finalFart: Math.hypot(ball.velocity.x, ball.velocity.y) }
  unbind?.()
  phys.destroy()
  return res
}

function s8() {
  const s = scen('S8', 'kinematik — vägg 16×120 dras in i boll r 22: teleport per bildruta mot fart per fysiksteg')
  // KONTROLLRAD: vägg i vila → bollen orörd (båda lägena).
  const vilaT = kor8(24, 'teleport', { rorelse: false })
  const vilaF = kor8(24, 'fart', { rorelse: false })
  kontroll(s, 'vägg i vila (teleport-läge) → bollen orörd', vilaT.toppFart === 0 && vilaT.bollFlytt === 0 && !vilaT.tunnlade, `topp ${f(vilaT.toppFart)} · flytt ${f(vilaT.bollFlytt)}`)
  kontroll(s, 'vägg i vila (fart-läge) → bollen orörd', vilaF.toppFart === 0 && vilaF.bollFlytt === 0 && !vilaF.tunnlade, `topp ${f(vilaF.toppFart)} · flytt ${f(vilaF.bollFlytt)}`)
  // Mätaren måste röra sig: ett läge MED rörelse ska ge bollen fart.
  const rorF = kor8(8, 'fart')
  kontroll(s, 'mätaren rör sig: fart-läget ger bollen fart vid 8 px/ruta', rorF.toppFart > 1, `topp ${f(rorF.toppFart, 2)}`)
  if (!s.kontrollHolls) { ut('  ✗ kontrollen höll inte — inga mätrader för S8'); return }

  const FP = { 4: 5.1, 24: 30.9, 32: 41.2, 48: 61.8 } // §1.3.4 (fart per steg)
  ut(`\n  ${pad('väggfart', 12)} ${pad('teleport: bollens topp-fart', 30)} ${pad('fart per steg: bollens topp-fart', 36)} ${padL('× väggen', 9)} ${padL('§1.3.4', 7)}`)
  for (const v of [4, 8, 12, 16, 24, 32, 48]) {
    const t = kor8(v, 'teleport')
    const k = kor8(v, 'fart')
    s.rader.push({ vaggFart: v, teleport: t, fartPerSteg: k, fysikplanFart: FP[v] ?? null })
    const tTxt = `${f(t.toppFart, 2)} px/steg${t.tunnlade ? ' · IGENOM' : ' · skyfflar'}`
    const kTxt = `${f(k.toppFart, 2)} px/steg${k.tunnlade ? ' · IGENOM' : ''}`
    ut(`  ${pad(v + ' px/ruta', 12)} ${pad(tTxt, 30)} ${pad(kTxt, 36)} ${padL(f(k.toppFart / v, 2), 9)} ${padL(FP[v] ?? '', 7)}`)
  }
  not(s, 'förväntat §1.3.4: teleport 4–24 px/ruta skyfflar bollen med fart 0,0, 32 och 48 px/ruta passerar väggen IGENOM · fart per steg 5,1–30,9 (1,29×), ingen tunnling, 41,2 / 61,8 vid 32 / 48')
  not(s, 'fart per steg kräver ett fart-tak i spelet (annars kastas frukten ur banan, P0) — bänken mäter obegränsat')
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
if (vill('S6')) s6()
if (vill('S7')) s7()
if (vill('S8')) s8()
if (JSON_UT) console.log(JSON.stringify(resultat, null, 2))
else ut(`\n${kontrollFel ? '✗ ' + kontrollFel + ' kontrollrad(er) föll' : '✓ alla kontrollrader höll'}`)
process.exit(kontrollFel ? 1 : 0)
