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
import { PhysicsWorld, STEG2 } from '../src/lib/physics.js'
import { Flytvolym } from '../src/lib/flytkraft.js'
import { FluidWorld } from '../src/lib/vatska.js'
import { Mjukkropp } from '../src/lib/mjukkropp.js'

const { Engine, Composite, Bodies, Body, Events, Vertices } = Matter

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
//   'kin'       phys.kinematisk(vagg, { maxFart }) (R2): fingret = ett mål som flyttas `v` px/bildruta,
//               kroppen hinner efter i fysiksteget med högst maxFart px/steg
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
  let kin = null
  let mal = vagg.position.x
  if (lage === 'kin') kin = phys.kinematisk(vagg, { maxFart: 12 })
  if (lage === 'fart') {
    unbind = phys.beforeStep(() => {
      if (kvar > 0) Body.setPosition(vagg, { x: vagg.position.x + fart, y: vagg.position.y }, true)
      else Body.setVelocity(vagg, { x: 0, y: 0 })
    })
  }
  const total = RUTOR + 40
  for (let i = 0; i < total; i++) {
    if (lage === 'teleport' && kvar > 0) Body.setPosition(vagg, { x: vagg.position.x + fart, y: vagg.position.y })
    if (kin && kvar > 0) kin.till((mal += fart), 360) // "fingret" rör sig en bildruta
    phys.update(FIXED)
    if (kvar > 0) kvar--
    toppFart = Math.max(toppFart, Math.hypot(ball.velocity.x, ball.velocity.y))
    if (vagg.position.x >= ball.position.x) tunnlade = true // väggens mitt har passerat bollens mitt
  }
  const res = { toppFart, bollFlytt: ball.position.x - bollX0, tunnlade, finalFart: Math.hypot(ball.velocity.x, ball.velocity.y) }
  const vaggFartKvar = Math.hypot(vagg.velocity.x, vagg.velocity.y)
  unbind?.()
  kin?.destroy()
  phys.destroy()
  return { ...res, vaggFartKvar }
}

// SNABBDRAG genom fallande kroppar (R2-mätningen): en vägg 16×640 dras 40 px/bildruta åt vänster
// genom 12 bollar som FALLER ur samma höjd. Antal som hamnar på FEL sida om kanten (IGENOM) och
// högsta bollfart efter mötet. 'teleport' = dagens mönster, 'kin' = phys.kinematisk (maxFart 12).
function snabbdrag(lage, { fart = 40, rorelse = true } = {}) {
  const phys = new PhysicsWorld({ gravityY: 0.3, walls: [] })
  const N = 12
  const bollar = []
  for (let i = 0; i < N; i++) bollar.push(phys.circle(420 + i * 54, 250 + (i % 3) * 20, 20, { restitution: 0.3, friction: 0.05, frictionAir: 0.002 }))
  const vagg = phys.rectangle(1100, 400, 16, 640, { isStatic: true })
  let kin = null
  let mal = vagg.position.x
  if (lage === 'kin') kin = phys.kinematisk(vagg, { maxFart: 12 })
  const slut = 1100 - 800
  let toppFart = 0
  let toppFartEfterMote = 0
  const moteSteg = new Map()
  for (let i = 0; i < 260; i++) {
    if (rorelse && vagg.position.x > slut + 1 && mal > slut) {
      if (lage === 'teleport') Body.setPosition(vagg, { x: Math.max(slut, vagg.position.x - fart), y: 400 })
      else { mal = Math.max(slut, mal - fart); kin.till(mal, 400) }
    }
    phys.update(FIXED)
    for (let b = 0; b < N; b++) {
      const kula = bollar[b]
      const sp = Math.hypot(kula.velocity.x, kula.velocity.y)
      const nara = Math.abs(kula.position.x - vagg.position.x) < 40
      if (nara && !moteSteg.has(b)) moteSteg.set(b, i)
      if (moteSteg.has(b) && i - moteSteg.get(b) < 6) toppFartEfterMote = Math.max(toppFartEfterMote, sp)
      toppFart = Math.max(toppFart, sp)
    }
  }
  // IGENOM = bollen ligger HÖGER om väggen (den började till vänster om väggen, som kom från höger).
  const igenom = bollar.filter((k) => k.position.x > vagg.position.x + 8).length
  const flytt = Math.abs(1100 - vagg.position.x)
  kin?.destroy()
  phys.destroy()
  return { igenom, toppFartEfterMote, flytt }
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
  // R2: samma kontroll för kinematisk() — en vägg som står still ger bollen noll, och en som dras ger fart.
  const vilaK = kor8(24, 'kin', { rorelse: false })
  kontroll(s, 'vägg i vila (kinematisk) → bollen orörd och väggens fart 0', vilaK.toppFart === 0 && vilaK.bollFlytt === 0 && !vilaK.tunnlade && vilaK.vaggFartKvar === 0, `topp ${f(vilaK.toppFart)} · flytt ${f(vilaK.bollFlytt)} · vaggFart ${f(vilaK.vaggFartKvar)}`)
  const rorK = kor8(8, 'kin')
  kontroll(s, 'mätaren rör sig: kinematisk ger bollen fart vid 8 px/ruta', rorK.toppFart > 1, `topp ${f(rorK.toppFart, 2)}`)
  const sdVila = snabbdrag('kin', { rorelse: false })
  kontroll(s, 'snabbdrag-arm, vägg i vila → ingen boll IGENOM och ingen mötesfart', sdVila.igenom === 0 && sdVila.flytt === 0, `igenom ${sdVila.igenom} · flytt ${f(sdVila.flytt, 1)}`)
  const sdT = snabbdrag('teleport')
  kontroll(s, 'snabbdrag-armen rör sig: teleport 40 px/ruta (HEAD) släpper igenom bollar', sdT.igenom > 0, `igenom ${sdT.igenom}/12`)
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
  ut(`
  ${pad('väggfart', 12)} ${pad('kinematisk (maxFart 12): topp-fart', 36)} ${padL('× väggen', 9)}`)
  for (const v of [4, 8, 12, 24, 40, 48]) {
    const k = kor8(v, 'kin')
    s.rader.push({ vaggFart: v, kinematisk: k })
    ut(`  ${pad(v + ' px/ruta', 12)} ${pad(f(k.toppFart, 2) + ' px/steg' + (k.tunnlade ? ' · IGENOM' : '') + ' · kvar ' + f(k.vaggFartKvar, 1), 36)} ${padL(f(k.toppFart / Math.min(v, 12), 2), 9)}`)
  }
  const sdK = snabbdrag('kin')
  s.rader.push({ snabbdrag40: { teleport: sdT, kinematisk: sdK } })
  ut(`
  snabbdrag 40 px/bildruta genom 12 fallande bollar: teleport → ${sdT.igenom} IGENOM · mötesfart ${f(sdT.toppFartEfterMote, 2)} (flytt ${f(sdT.flytt, 0)} px) · kinematisk → ${sdK.igenom} IGENOM · mötesfart ${f(sdK.toppFartEfterMote, 2)} (flytt ${f(sdK.flytt, 0)} px)`)
  not(s, 'förväntat §1.3.4: teleport 4–24 px/ruta skyfflar bollen med fart 0,0, 32 och 48 px/ruta passerar väggen IGENOM · fart per steg 5,1–30,9 (1,29×), ingen tunnling, 41,2 / 61,8 vid 32 / 48')
  not(s, 'fart per steg kräver ett fart-tak i spelet (annars kastas frukten ur banan, P0) — bänken mäter obegränsat')
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S1 — VILOKRYP + OPTIONER (R5): iterationer · sova · (S3 nedan: fartTak)
// ═════════════════════════════════════════════════════════════════════════════════════════════

// En vilande hög genom PhysicsWorld (så att OPTIONERNA mäts, inte rå matter): ett torn på 8 lådor
// och 34 cirklar i en låda 640 × 600. `lag` = antal steg att lägga sig, sedan mäts krypet i 600 steg.
function hogS1(opt, { N = 34, lag = 900 } = {}) {
  const phys = new PhysicsWorld({ gravityY: 1, bounds: { left: 0, top: 0, right: 640, bottom: 600 }, ...opt })
  const kroppar = []
  for (let i = 0; i < 8; i++) kroppar.push(phys.rectangle(520 + (i % 2) * 3, 570 - i * 31, 46, 30, { friction: 0.5, restitution: 0.05, label: 'lada' }))
  for (let i = 0; i < N; i++) {
    const x = 60 + (i % 14) * 24 + ((i / 14) | 0) % 2 * 8
    const y = 570 - ((i / 14) | 0) * 26
    kroppar.push(phys.circle(x, y, 11, { restitution: 0.1, friction: 0.4, label: 'boll' }))
  }
  for (let i = 0; i < lag; i++) phys.update(FIXED)
  const start = kroppar.map((b) => ({ x: b.position.x, y: b.position.y }))
  let sov = 0
  const t0 = nu()
  for (let i = 0; i < 600; i++) phys.update(FIXED)
  const ms = (nu() - t0) / 600
  let max = 0
  let sum = 0
  kroppar.forEach((b, i) => {
    const d = Math.hypot(b.position.x - start[i].x, b.position.y - start[i].y)
    max = Math.max(max, d)
    sum += d
    if (b.isSleeping) sov++
  })
  const res = { kryp: max, medel: sum / kroppar.length, sov, ms, pos: kroppar.map((b) => [b.position.x, b.position.y]), engine: phys.engine }
  phys.destroy()
  return res
}

// Samma hög rakt genom matter, utan PhysicsWorld — kontrollen för "utan optioner = dagens".
function hogRå() {
  const eng = Engine.create()
  eng.gravity.y = 1
  const stat = (x, y, w, h) => { const b = Bodies.rectangle(x, y, w, h, { isStatic: true, label: 'wall' }); Composite.add(eng.world, b) }
  const t = 120
  stat(320, 600 + t / 2, 640 + 400, t); stat(-t / 2, 300, t, 600 + 400); stat(640 + t / 2, 300, t, 600 + 400)
  const kroppar = []
  const add = (b) => { Composite.add(eng.world, b); kroppar.push(b) }
  for (let i = 0; i < 8; i++) add(Bodies.rectangle(520 + (i % 2) * 3, 570 - i * 31, 46, 30, { friction: 0.5, restitution: 0.05, label: 'lada' }))
  for (let i = 0; i < 34; i++) {
    const x = 60 + (i % 14) * 24 + ((i / 14) | 0) % 2 * 8
    const y = 570 - ((i / 14) | 0) * 26
    add(Bodies.circle(x, y, 11, { restitution: 0.1, friction: 0.4, label: 'boll' }))
  }
  for (let i = 0; i < 1500; i++) Engine.update(eng, FIXED)
  return kroppar.map((b) => [b.position.x, b.position.y])
}

function s1() {
  const s = scen('S1', 'vilokryp + optioner (R5) — torn + 34 bollar, kryp px/10 s och ms/steg, sova av/på, iterationer')
  // KONTROLL 1: ett PhysicsWorld utan optioner står på matters förval, och är BIT-identiskt med rå matter.
  const förval = hogS1({})
  const ra = hogRå()
  const dRå = Math.max(...förval.pos.map((p, i) => Math.max(Math.abs(p[0] - ra[i][0]), Math.abs(p[1] - ra[i][1]))))
  const e0 = förval.engine
  kontroll(s, 'förval: iterationer 6/4/2 och sömn av (= matters egna)', e0.positionIterations === 6 && e0.velocityIterations === 4 && e0.constraintIterations === 2 && e0.enableSleeping === false,
    `${e0.positionIterations}/${e0.velocityIterations}/${e0.constraintIterations} sova ${e0.enableSleeping}`)
  kontroll(s, 'PhysicsWorld utan optioner = rå matter: största positionsskillnad 0,000 px efter 1500 steg', dRå === 0, `${f(dRå, 6)} px`)
  // KONTROLL 2: mätaren rör sig — sova:false har 0 sovande, sova:true har några (två KÄNDA lägen).
  const av = hogS1({ sova: false })
  const pa = hogS1({ sova: true })
  kontroll(s, 'mätaren rör sig: sova av → 0 sovande efter lägget, sova på → fler än 0', av.sov === 0 && pa.sov > 0, `av ${av.sov} · på ${pa.sov} sovande av ${av.pos.length}`)
  // KONTROLL 3: iterationerna landar på motorn, och utelämnade tal står kvar.
  const it = hogS1({ iterationer: { position: 12, fart: 8, villkor: 4 } })
  const del = hogS1({ iterationer: { position: 10 } })
  kontroll(s, 'iterationer: { position, fart, villkor } sätts på motorn', it.engine.positionIterations === 12 && it.engine.velocityIterations === 8 && it.engine.constraintIterations === 4,
    `${it.engine.positionIterations}/${it.engine.velocityIterations}/${it.engine.constraintIterations}`)
  kontroll(s, 'ett utelämnat tal står kvar på förvalet ({ position: 10 } → 10/4/2)', del.engine.positionIterations === 10 && del.engine.velocityIterations === 4 && del.engine.constraintIterations === 2,
    `${del.engine.positionIterations}/${del.engine.velocityIterations}/${del.engine.constraintIterations}`)
  // KONTROLL 4: sömn-fällan finns (det är därför den är opt-in) — en sovande låda utan stöd hänger kvar.
  const fall = (sova) => {
    const phys = new PhysicsWorld({ gravityY: 1, walls: [], sova })
    const plattan = phys.rectangle(300, 400, 200, 20, { isStatic: true })
    const lada = phys.rectangle(300, 370, 40, 40, { label: 'lada' })
    for (let i = 0; i < 200; i++) phys.update(FIXED)
    const sov = lada.isSleeping
    const y0 = lada.position.y
    phys.removeBody(plattan)
    for (let i = 0; i < 60; i++) phys.update(FIXED)
    const dy = lada.position.y - y0
    phys.destroy()
    return { sov, dy }
  }
  const fAv = fall(false)
  const fPa = fall(true)
  kontroll(s, 'fällan: utan sömn faller lådan när stödet tas bort (≥ 50 px)', fAv.dy >= 50, `${f(fAv.dy, 1)} px`)
  if (!s.kontrollHolls) { ut('  ✗ kontrollen höll inte — inga mätrader för S1'); return }

  ut(`\n  ${pad('arm', 34)} ${padL('max kryp px/10 s', 17)} ${padL('medel px', 9)} ${padL('sovande', 8)} ${padL('ms/steg', 9)}`)
  const arm = (namn, r) => {
    s.rader.push({ arm: namn, krypMax: r.kryp, krypMedel: r.medel, sovande: r.sov, msPerSteg: r.ms })
    ut(`  ${pad(namn, 34)} ${padL(f(r.kryp, 3), 17)} ${padL(f(r.medel, 4), 9)} ${padL(r.sov, 8)} ${padL(f(r.ms, 4), 9)}`)
  }
  arm('förval (sova av · 6/4/2)', förval)
  arm('sova: true', pa)
  arm('iterationer 12/8/4', it)
  arm('iterationer 3/2/1', hogS1({ iterationer: { position: 3, fart: 2, villkor: 1 } }))
  not(s, `fällan: sova ${fPa.sov ? 'på' : '(sov ej)'} → lådan ${fPa.sov ? 'sover' : 'sov inte'} och faller ${f(fPa.dy, 1)} px när stödet tas bort (utan sömn ${f(fAv.dy, 1)} px) — en sovande kropp väcks bara av en RÖRLIG kropp`)
  not(s, 'beslut: sömn slås inte på i något spel här — det motiveras bara av ett uppmätt vilokryp i ett spel (bygg-tornet, balanstornet), aldrig av kostnad')
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S3 — TUNNLING + fartTak (R5): kula r 10 mot en vägg 16 px tjock
// ═════════════════════════════════════════════════════════════════════════════════════════════

// 'utan' = inget tak · 'efter' = ett hemgjort tak i afterUpdate (planens ordalydelse, utan förhandsspärr)
// · 'lib' = phys.fartTak (före OCH efter steget). `avstand` = kulans startavstånd till väggen.
function tunnla(v, arm, tak, avstand) {
  const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
  phys.rectangle(640, 360, 16, 400, { isStatic: true, label: 'vagg' })
  const kula = phys.circle(640 - 8 - 10 - avstand, 360, 10, { restitution: 0.5, friction: 0, frictionAir: 0, label: 'kula' })
  if (arm === 'lib') phys.fartTak(kula, tak)
  if (arm === 'efter') Events.on(phys.engine, 'afterUpdate', () => { const s = Math.hypot(kula.velocity.x, kula.velocity.y); if (s > tak) Body.setVelocity(kula, { x: kula.velocity.x / s * tak, y: kula.velocity.y / s * tak }) })
  Body.setVelocity(kula, { x: v, y: 0 })
  let topp = 0
  let studsade = false
  for (let i = 0; i < 80; i++) {
    phys.update(FIXED)
    topp = Math.max(topp, Math.hypot(kula.velocity.x, kula.velocity.y))
    if (kula.velocity.x < 0) studsade = true
  }
  const tunnlade = kula.position.x > 640 + 8
  phys.destroy()
  return { tunnlade, studsade, topp }
}

function s3() {
  const s = scen('S3', 'tunnling + fartTak (R5) — kula r 10 mot vägg 16 px, 10–60 px/steg')
  // KONTROLL: 10 px/steg studsar alltid (utan tak); en känd tunnling finns över ~30 (mätaren rör sig).
  const FARTER = [10, 20, 30, 40, 50, 60]
  const utanRader = FARTER.map((v) => tunnla(v, 'utan', null, 200))
  kontroll(s, '10 px/steg studsar utan tak (ingen tunnling)', utanRader[0].studsade && !utanRader[0].tunnlade, `studs ${utanRader[0].studsade} · igenom ${utanRader[0].tunnlade}`)
  kontroll(s, 'mätaren rör sig: 60 px/steg tunnlar utan tak (annars finns inget att skydda mot)', utanRader[5].tunnlade, `igenom ${utanRader[5].tunnlade}`)
  // KONTROLL: ett tak ÖVER farten rör inte kulan (bit-identiskt med utan tak).
  const hog = tunnla(10, 'lib', 40, 200)
  kontroll(s, 'ett tak över farten är en no-op: 10 px/steg med tak 40 ger samma topp-fart och studs', hog.studsade && Math.abs(hog.topp - utanRader[0].topp) < 1e-9, `topp ${f(hog.topp, 4)} mot ${f(utanRader[0].topp, 4)}`)
  // KONTROLL: tak = null tar bort spärren.
  {
    const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    const b = phys.circle(100, 100, 10, { frictionAir: 0 })
    phys.fartTak(b, 5)
    phys.fartTak(b, null)
    Body.setVelocity(b, { x: 30, y: 0 })
    phys.update(FIXED)
    kontroll(s, 'fartTak(b, null) tar bort spärren', Math.abs(b.velocity.x - 30) < 1e-9, `v ${f(b.velocity.x, 3)}`)
    phys.destroy()
  }
  if (!s.kontrollHolls) { ut('  ✗ kontrollen höll inte — inga mätrader för S3'); return }

  ut(`\n  ${pad('start-fart', 12)} ${pad('utan tak', 22)} ${pad('tak 12 (lib)', 22)} ${pad('30 px från väggen: efter-bara', 30)} ${pad('30 px från väggen: lib', 24)}`)
  let libIgenom = 0
  let efterIgenom = 0
  FARTER.forEach((v, i) => {
    const a = utanRader[i]
    const l = tunnla(v, 'lib', 12, 200)
    const eNar = tunnla(v, 'efter', 12, 30)
    const lNar = tunnla(v, 'lib', 12, 30)
    if (l.tunnlade || lNar.tunnlade) libIgenom++
    if (eNar.tunnlade) efterIgenom++
    s.rader.push({ fart: v, utan: a, lib12: l, efterNara: eNar, libNara: lNar })
    const txt = (r) => `${r.tunnlade ? 'IGENOM' : 'studs'} · topp ${f(r.topp, 1)}`
    ut(`  ${pad(v + ' px/steg', 12)} ${pad(txt(a), 22)} ${pad(txt(l), 22)} ${pad(txt(eNar), 30)} ${pad(txt(lNar), 24)}`)
  })
  not(s, `lib-taket (före OCH efter steget): ${libIgenom} av ${FARTER.length * 2} rader tunnlar · efter-bara-taket (planens ordalydelse): ${efterIgenom} av ${FARTER.length} nära rader tunnlar — en fart som sätts MELLAN steg (en kick) hinner ett helt steg på full fart`)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S10 — KONTAKT + KROPPSFABRIKER (R6): paKontakt · konvex · sammansatt · grupp
// ═════════════════════════════════════════════════════════════════════════════════════════════

function s10() {
  const s = scen('S10', 'kontakt + kroppsfabriker (R6) — paKontakt mot handskriven matchning, konvex, sammansatt, grupp')
  // ── paKontakt: 12 kulor regnar över 4 enkla och 4 sammansatta käglor, 600 steg ──────────────
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const phys = new PhysicsWorld({ gravityY: 0.8, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: 0, right: 640, bottom: 600 } })
  for (let i = 0; i < 4; i++) phys.circle(80 + i * 150, 540, 22, { label: 'kagla', restitution: 0.3 })
  for (let i = 0; i < 4; i++) {
    const x = 150 + i * 120
    const delar = [Bodies.rectangle(x, 420, 60, 14), Bodies.rectangle(x, 400, 14, 40), Bodies.circle(x, 380, 14)]
    phys.sammansatt(delar, { label: 'kagla', restitution: 0.3, friction: 0.3 })
  }
  const kulor = []
  for (let i = 0; i < 12; i++) kulor.push(phys.circle(60 + rnd() * 520, -20 - i * 90, 16, { label: 'kula', restitution: 0.5, frictionAir: 0.002 }))
  // Tre lyssnare på samma ström: paKontakt, handskriven matchning mot FÖRÄLDERNS etikett (rätt)
  // och handskriven mot delens egen etikett (fällan: en sammansatt kropps delar saknar etikett).
  let steg = 0
  const pk = []
  const pkRev = []
  const hand = []
  const naiv = []
  phys.paKontakt('kula', 'kagla', (kula, kagla, par) => pk.push(`${kula.id}:${kagla.id}:${steg}`))
  phys.paKontakt('kagla', 'kula', (kagla, kula, par) => pkRev.push(`${kula.id}:${kagla.id}:${steg}`))
  phys.onCollision((e) => {
    for (const p of e.pairs) {
      const a = p.bodyA.parent
      const b = p.bodyB.parent
      if (a.label === 'kula' && b.label === 'kagla') hand.push(`${a.id}:${b.id}:${steg}`)
      else if (a.label === 'kagla' && b.label === 'kula') hand.push(`${b.id}:${a.id}:${steg}`)
      const na = p.bodyA.label
      const nb = p.bodyB.label
      if (na === 'kula' && nb === 'kagla') naiv.push(1)
      else if (na === 'kagla' && nb === 'kula') naiv.push(1)
    }
  })
  let fel0 = 0
  phys.paKontakt('finns', 'inte', () => fel0++)
  for (let i = 0; i < 600; i++) { steg = i; phys.update(FIXED) }
  phys.destroy()
  const lika = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
  kontroll(s, 'kontrollström: handskriven matchning ser ≥ 20 kula/kägla-par på 600 steg (strömmen är rik nog)', hand.length >= 20, `${hand.length} par`)
  kontroll(s, 'mätaren rör sig: handskriven matchning på DELENS etikett missar sammansatta par (fällan finns)', naiv.length < hand.length, `${naiv.length} mot ${hand.length}`)
  kontroll(s, 'två okända etiketter ger 0 anrop', fel0 === 0, `${fel0}`)
  kontroll(s, 'paKontakt(kula, kagla) får EXAKT samma par som den handskrivna matchningen (id och steg)', lika(pk, hand), `${pk.length} mot ${hand.length}`)
  kontroll(s, 'paKontakt(kagla, kula) (omvänd ordning) får samma par, med kulan alltid i första argumentet', lika(pkRev, hand), `${pkRev.length} mot ${hand.length}`)

  // ── konvex ──────────────────────────────────────────────────────────────────────────────
  const maxAvv = (body, pts) => Math.max(...pts.map((p) => Math.min(...body.vertices.map((v) => Math.hypot(v.x - p.x, v.y - p.y)))))
  const P = [{ x: 100, y: 500 }, { x: 300, y: 520 }, { x: 340, y: 600 }, { x: 80, y: 610 }]
  {
    const v = new PhysicsWorld({ gravityY: 1, walls: [] })
    const rå = Bodies.fromVertices(0, 0, [P.map((p) => ({ ...p }))])
    kontroll(s, 'mätaren rör sig: rå Bodies.fromVertices(0,0) hamnar FEL (kroppen centreras om)', maxAvv(rå, P) > 50, `${f(maxAvv(rå, P), 1)} px`)
    const k = v.konvex(P, { isStatic: true, studs: 0.5, friktion: 0.2, label: 'sluttning' })
    kontroll(s, 'konvex: hörnen ligger på punkterna (största avvikelse < 1e-6 px)', maxAvv(k, P) < 1e-6, `${f(maxAvv(k, P), 9)} px`)
    kontroll(s, 'konvex: isStatic/studs/friktion gäller (genom _make)', k.isStatic && k.restitution === 0.5 && k.friction === 0.2 && k._original?.restitution === 0.5 && k._original?.friction === 0.2 && k.studs === undefined && k.friktion === undefined,
      `static ${k.isStatic} · rest ${k.restitution} · fr ${k.friction} · _original ${k._original?.restitution}/${k._original?.friction}`)
    Body.setStatic(k, false)
    const kula = v.circle(200, 100, 14, { label: 'kula' })
    for (let i = 0; i < 120; i++) v.update(FIXED)
    kontroll(s, 'konvex: kroppen går att väcka (setStatic(false) → ändlig massa, ingen NaN)', Number.isFinite(k.mass) && Number.isFinite(k.position.x) && Number.isFinite(k.position.y) && k.position.y > 560, `massa ${f(k.mass, 1)} · y ${f(k.position.y, 1)} · kula ${kula.position.y > 0}`)
    v.destroy()
  }
  {
    const L = [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 140 }, { x: 140, y: 140 }, { x: 140, y: 200 }, { x: 100, y: 200 }] // L-form (konkav)
    let varn = 0
    const orig = console.warn
    console.warn = () => { varn++ }
    const v = new PhysicsWorld({ walls: [] })
    const k = v.konvex(L, { isStatic: true })
    console.warn = orig
    const hull = Vertices.hull(L.map((p) => ({ ...p })))
    kontroll(s, 'konkav kontur: faller tillbaka på det konvexa höljet utan konsolvarning', varn === 0 && Math.abs(Vertices.area(k.vertices, false) - Vertices.area(hull, false)) < 1e-6 && k.vertices.length === hull.length,
      `${varn} varningar · ${k.vertices.length} hörn (${L.length} in) · area ${f(Math.abs(Vertices.area(k.vertices)), 0)}`)
    v.destroy()
  }

  // ── sammansatt ────────────────────────────────────────────────────────────────────────
  {
    const v = new PhysicsWorld({ gravityY: 1, walls: ['floor'] })
    const k = v.sammansatt([Bodies.rectangle(300, 300, 60, 14), Bodies.circle(300, 280, 14)], { isStatic: true, label: 'bygel', studs: 0.4, friktion: 0.1 })
    const delarOk = k.parts.length === 3 && k.parts.every((p) => p.friction === 0.1 && p.restitution === 0.4)
    kontroll(s, 'sammansatt: föräldern bär etiketten, alla delar bär studs och friktion', k.label === 'bygel' && delarOk, `${k.parts.length} kroppar · ${k.parts.map((p) => p.friction + '/' + p.restitution).join(' ')}`)
    Body.setStatic(k, false)
    for (let i = 0; i < 200; i++) v.update(FIXED)
    kontroll(s, 'sammansatt: kroppen går att väcka (ändlig massa, ingen NaN, faller till golvet)', Number.isFinite(k.mass) && Number.isFinite(k.position.y) && k.position.y > 600, `massa ${f(k.mass, 1)} · y ${f(k.position.y, 1)} · delar ${k.parts.slice(1).map((p) => p.friction).join('/')}`)
    v.destroy()
  }

  // ── grupp ─────────────────────────────────────────────────────────────────────────────
  {
    const v = new PhysicsWorld({ gravityY: 0, walls: [] })
    const g1 = v.grupp()
    const g2 = v.grupp()
    const tryck = (grp) => {
      const w = new PhysicsWorld({ gravityY: 0, walls: [] })
      const cf = grp == null ? {} : { collisionFilter: { group: grp } }
      const a = w.circle(100, 100, 20, { frictionAir: 0, ...cf })
      const b = w.circle(110, 100, 20, { frictionAir: 0, ...cf })
      for (let i = 0; i < 30; i++) w.update(FIXED)
      const d = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)
      w.destroy()
      return d
    }
    const utan = tryck(null)
    const med = tryck(g1)
    kontroll(s, 'grupp: ids är negativa och unika', g1 < 0 && g2 < 0 && g1 !== g2, `${g1} · ${g2}`)
    kontroll(s, 'mätaren rör sig: två överlappande cirklar utan grupp trycks isär (≥ 38 px)', utan >= 38, `${f(utan, 1)} px`)
    kontroll(s, 'grupp: samma grupp → ingen kollision (de ligger kvar 10 px isär)', Math.abs(med - 10) < 1e-6, `${f(med, 3)} px`)
    v.destroy()
  }
  if (!s.kontrollHolls) { ut('  ✗ kontrollen höll inte — inga mätrader för S10'); return }
  s.rader.push({ par: hand.length, paKontakt: pk.length, omvand: pkRev.length, naiv: naiv.length })
  ut(`\n  paKontakt-par på 600 steg: ${pk.length} · omvänd ordning ${pkRev.length} · handskriven (förälder) ${hand.length} · handskriven (del) ${naiv.length}`)
  not(s, 'konvex: en KONKAV kontur ersätts av sitt konvexa hölje (Vertices.hull) — det är dokumenterat, inte ett fel; dela konkava former i flera konvexa kroppar')
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S4 — LEDER (F1): gångjärnsdrift · stel rotation damp 0 mot 0,18, pendel · motor + momenttak · portar
// ═════════════════════════════════════════════════════════════════════════════════════════════
// Dagens mönster (rå `Constraint` + `Composite.add`, vridfjäder som en `beforeStep` på `body.torque`)
// är KONTROLLARMEN och är inbäddat här — bänken beror inte på att spelen står i något visst läge.

// Ankarpunkten på kroppen i världen (matters pointB roteras med kroppens vinkel sedan skapandet).
function ankarVarld(c) {
  const b = c.bodyB
  const d = b.angle - c.angleB
  const px = c.pointB.x
  const py = c.pointB.y
  return { x: b.position.x + px * Math.cos(d) - py * Math.sin(d), y: b.position.y + px * Math.sin(d) + py * Math.cos(d) }
}

// Gångjärnsdrift under last, två laster. `plank` = balanstornets verkliga fall: plankan 660×28 i sin mitt,
// den tyngsta klossen ytterst, vridfjädern på (k 58, damp 280). `svang` = en stång 300×16 fäst i vänstra
// änden (tyngdpunkten 150 px från leden), svänger från vågrätt: last = tyngd + centrifugal.
// Mått: största avståndet mellan ankaret på kroppen och världspunkten, över 10 s.
// ⚠️ MATTERS gräns, samma tal i den råa Constraintens arm: en TUNG massa långt från leden (sammansatt
// stång + kula 56 kg 240 px bort) får lösaren att skena (ω 400 rad/steg) redan första steget. Lägg leden nära
// tyngdpunkten eller håll lasten lätt — inget spel här bygger så.
function gangjarnsDrift(arm, { last = 'plank', sek = 10, styvhet = 1 } = {}) {
  const phys = new PhysicsWorld({ gravityY: last === 'plank' ? 1.2 : 1, walls: [] })
  let k, P, vridfj = null
  if (last === 'plank') {
    P = { x: 640, y: 496 }
    k = phys.rectangle(640, 496, 660, 28, { density: 0.0016, frictionAir: 0.02, friction: 0.86, frictionStatic: 1.5 })
    phys.rectangle(820, 496 - 14 - 33, 170, 66, { density: 0.0026, friction: 0.72, frictionStatic: 1.2, frictionAir: 0.02, restitution: 0.02 })
    vridfj = { vila: 0, k: 58, damp: 280 }
  } else {
    P = { x: 400, y: 300 }
    k = phys.rectangle(550, 300, 300, 16, { density: 0.002, frictionAir: 0 })
  }
  let c, g
  if (arm === 'rå') {
    c = Matter.Constraint.create({ pointA: { x: P.x, y: P.y }, bodyB: k, pointB: { x: P.x - k.position.x, y: P.y - k.position.y }, length: 0, stiffness: styvhet })
    Composite.add(phys.world, c)
    if (vridfj) phys.beforeStep(() => { k.torque += -(k.angle - vridfj.vila) * vridfj.k - k.angularVelocity * vridfj.damp })
  } else {
    g = phys.gangjarn(k, P, { styvhet })
    c = g.constraint
    if (vridfj) g.vridfjader(vridfj)
  }
  let drift = 0
  let toppFart = 0
  for (let i = 0; i < sek * 60; i++) {
    phys.update(FIXED)
    const a = ankarVarld(c)
    drift = Math.max(drift, Math.hypot(a.x - P.x, a.y - P.y))
    toppFart = Math.max(toppFart, Math.abs(k.angularVelocity))
  }
  const vinkel = k.angle
  phys.destroy()
  return { drift, toppFart, vinkel }
}

// Två kroppar hopfogade med `gangjarn(…, { med })` (en kedja stativ → A → B, hängande under tyngd).
// `rå` bygger samma sak med matters egna Constraint. Drift = glappet mellan de två ankarpunkterna.
function tvaKroppsDrift(arm) {
  const phys = new PhysicsWorld({ gravityY: 1, walls: [] })
  const a = phys.rectangle(500, 300, 200, 16, { density: 0.002, frictionAir: 0 })
  const b = phys.rectangle(680, 300, 200, 16, { density: 0.002, frictionAir: 0 })
  const stativ = phys.rectangle(400, 300, 20, 20, { isStatic: true })
  const lokal = (k, p) => ({ x: p.x - k.position.x, y: p.y - k.position.y })
  const P2 = { x: 580, y: 300 }
  let c, g0, g
  if (arm === 'rå') {
    const c0 = Matter.Constraint.create({ bodyA: stativ, pointA: lokal(stativ, { x: 400, y: 300 }), bodyB: a, pointB: lokal(a, { x: 400, y: 300 }), length: 0, stiffness: 1 })
    c = Matter.Constraint.create({ bodyA: a, pointA: lokal(a, P2), bodyB: b, pointB: lokal(b, P2), length: 0, stiffness: 1 })
    Composite.add(phys.world, [c0, c])
  } else {
    g0 = phys.gangjarn(a, { x: 400, y: 300 }, { med: stativ })
    g = phys.gangjarn(b, P2, { med: a })
    c = g.constraint
  }
  const rot = (k, p, vinkel0) => {
    const d = k.angle - vinkel0
    return { x: k.position.x + p.x * Math.cos(d) - p.y * Math.sin(d), y: k.position.y + p.x * Math.sin(d) + p.y * Math.cos(d) }
  }
  let drift = 0
  for (let i = 0; i < 600; i++) {
    phys.update(FIXED)
    const pa = rot(c.bodyA, c.pointA, c.angleA)
    const pb = rot(c.bodyB, c.pointB, c.angleB)
    drift = Math.max(drift, Math.hypot(pa.x - pb.x, pa.y - pb.y))
  }
  const vinkel = b.angle - a.angle
  g?.ta()
  g0?.ta()
  phys.destroy()
  return { drift, vinkel }
}

// Pendel: kula r 15 i ett rep (längd 200) från (640, 100), släppt 60° ut, ingen luft. Energin per
// massenhet i px²/steg² (½v² + a·h, a = 0,2778·g) — h över lägsta punkten; medel över sista 2 s.
function pendelEnergi(arm, { damp = 0, sek = 10 } = {}) {
  const gy = 1
  const phys = new PhysicsWorld({ gravityY: gy, walls: [] })
  const L = 200
  const P = { x: 640, y: 100 }
  const th = Math.PI / 3
  const kula = phys.circle(P.x + L * Math.sin(th), P.y + L * Math.cos(th), 15, { density: 0.002, frictionAir: 0 })
  if (arm === 'rå') Composite.add(phys.world, Matter.Constraint.create({ pointA: { x: P.x, y: P.y }, bodyB: kula, pointB: { x: 0, y: 0 }, length: L, stiffness: 1, damping: damp }))
  else phys.pendel(P, kula, { langd: L, styvhet: 1, damp })
  const a = gy * 0.001 * STEG2
  const E = () => 0.5 * (kula.velocity.x ** 2 + kula.velocity.y ** 2) + a * (P.y + L - kula.position.y)
  const E0 = E()
  const slut = []
  for (let i = 1; i <= sek * 60; i++) {
    phys.update(FIXED)
    if (i > (sek - 2) * 60) slut.push(E())
  }
  const Eslut = slut.reduce((x, y) => x + y, 0) / slut.length
  phys.destroy()
  return { E0, Eslut, kvar: Eslut / E0 }
}

// STEL ROTATION (CLAUDE.md "matter-ledernas damping bromsar varje stel rotation"): två rutor hopfogade i
// sitt gemensamma hörn snurrar som EN stel kropp runt leden, utan tyngd och luft. Vinkelfart efter 40 steg.
function stelSnurr(arm, damp) {
  const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
  const A = phys.rectangle(570, 300, 60, 60, { frictionAir: 0, collisionFilter: { group: -1 } })
  const B = phys.rectangle(630, 300, 60, 60, { frictionAir: 0, collisionFilter: { group: -1 } })
  const w0 = 0.12
  Body.setAngularVelocity(A, w0)
  Body.setAngularVelocity(B, w0)
  // som EN stel kropp runt leden (600, 300): v = ω × r
  Body.setVelocity(A, { x: 0, y: -w0 * 30 })
  Body.setVelocity(B, { x: 0, y: w0 * 30 })
  if (arm === 'rå') Composite.add(phys.world, Matter.Constraint.create({ bodyA: A, pointA: { x: 30, y: 0 }, bodyB: B, pointB: { x: -30, y: 0 }, length: 0, stiffness: 0.95, damping: damp }))
  else phys.led(A, B, { ankA: { x: 30, y: 0 }, ankB: { x: -30, y: 0 }, styvhet: 0.95, damp })
  for (let i = 0; i < 40; i++) phys.update(FIXED)
  const w = (A.angularVelocity + B.angularVelocity) / 2
  phys.destroy()
  return { w, kvar: w / w0 }
}

// MOTOR: stång 660×28 fäst i mitten + en tung kula på högra änden (sammansatt). Målfart −0,02 rad/steg
// (lyfter lasten). Ett andra lyssnarlag läser `torque` EFTER motorns lyssnare — det oberoende måttet på
// vad som faktiskt lades på (inget `h.moment`). `cap` = maxMoment.
function motorKor({ cap, last = 0.008, fart = -0.02, steg = 240 }) {
  const phys = new PhysicsWorld({ gravityY: 1, walls: [] })
  const delar = [Bodies.rectangle(640, 300, 660, 28, { density: 0.0016 })]
  if (last > 0) delar.push(Bodies.circle(640 + 290, 300, 30, { density: last }))
  const k = phys.sammansatt(delar, { frictionAir: 0.02 })
  const g = phys.gangjarn(k, { x: 640, y: 300 })
  g.motor({ fart, maxMoment: cap })
  let toppMoment = 0
  const unbind = phys.beforeStep(() => { toppMoment = Math.max(toppMoment, Math.abs(k.torque)) })
  let nadde = -1
  for (let i = 1; i <= steg; i++) {
    phys.update(FIXED)
    if (nadde < 0 && Math.abs(k.angularVelocity - fart) < 0.05 * Math.abs(fart)) nadde = i
  }
  const res = { nadde, toppMoment, vinkel: k.angle, slutFart: k.angularVelocity }
  unbind()
  g.ta()
  phys.destroy()
  return res
}

// PORT 1 — balanstornet: plankan + vridfjädern ur filhuvudet (`torque += −(vinkel − vila)·STOD_K −
// vinkelfart·STOD_DAMP`), en kloss på en kolumn. `rå` = HEAD:s kod ordagrant.
function balansKor(arm, { k, klossIdx, x, vila = 0 }) {
  const SPEC = { liten: { w: 100, h: 54, d: 0.0016 }, mellan: { w: 136, h: 60, d: 0.002 }, stor: { w: 170, h: 66, d: 0.0026 } }
  const sp = SPEC[klossIdx]
  const PX = 640, PY = 496, STOD_DAMP = 280
  const phys = new PhysicsWorld({ gravityY: 1.2, walls: ['floor', 'left', 'right'] })
  phys.rectangle(640, 770, 1900, 260, { isStatic: true, friction: 1, label: 'mark' })
  const pb = phys.rectangle(PX, PY, 660, 28, { restitution: 0.02, friction: 0.86, frictionStatic: 1.5, frictionAir: 0.02, density: 0.0016, label: 'planka' })
  Body.setAngle(pb, vila)
  if (arm === 'rå') {
    Composite.add(phys.world, Matter.Constraint.create({ pointA: { x: PX, y: PY }, bodyB: pb, pointB: { x: 0, y: 0 }, length: 0, stiffness: 1 }))
    phys.beforeStep(() => { pb.torque += -(pb.angle - vila) * k - pb.angularVelocity * STOD_DAMP })
  } else {
    const g = phys.gangjarn(pb, { x: PX, y: PY })
    g.vridfjader({ vila: () => vila, k: () => k, damp: STOD_DAMP })
  }
  phys.rectangle(x, PY - 14 - sp.h / 2, sp.w, sp.h, { restitution: 0.02, friction: 0.72, frictionStatic: 1.2, frictionAir: 0.02, density: sp.d, label: 'kloss' })
  let topp = 0
  const bana = []
  for (let i = 0; i < 600; i++) {
    phys.update(FIXED)
    topp = Math.max(topp, Math.abs(pb.angle - vila))
    if (i % 100 === 99) bana.push(pb.angle)
  }
  const res = { slut: pb.angle, topp, bana, x: pb.position.x, y: pb.position.y }
  phys.destroy()
  return res
}

// PORT 2 — vippbrädan: plankan fastnålad i mitten (längd 0, styvhet 1), en vikt släpps på högra armen.
function vippKor(arm) {
  const CX = 640, PIVOT_Y = 520
  const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
  const pl = phys.rectangle(CX, PIVOT_Y, 600, 24, { density: 0.0012, frictionAir: 0.02, friction: 0.6, restitution: 0.05, label: 'plank' })
  if (arm === 'rå') Composite.add(phys.world, Matter.Constraint.create({ pointA: { x: CX, y: PIVOT_Y }, bodyB: pl, pointB: { x: 0, y: 0 }, length: 0, stiffness: 1 }))
  else phys.gangjarn(pl, { x: CX, y: PIVOT_Y })
  const vikt = phys.circle(CX + 220, PIVOT_Y - 260, 26, { density: 0.004, restitution: 0.1, friction: 0.5, frictionAir: 0.004, label: 'vikt' })
  let topp = 0
  const bana = []
  for (let i = 0; i < 480; i++) {
    phys.update(FIXED)
    topp = Math.max(topp, Math.abs(pl.angle))
    if (i % 60 === 59) bana.push(pl.angle, vikt.position.y)
  }
  const res = { slut: pl.angle, topp, bana, vx: vikt.position.x, vy: vikt.position.y }
  phys.destroy()
  return res
}

// PORT 3 — knuffa-tornet: kulan hänger i repet (styvt 0,96/0,04 resp. elastiskt 0,18/0,06), släpps 50° ut;
// kranens kärra flyttas 120 px i sidled efter 90 steg (`pointA.x`), repet byts efter 200 steg.
function repKor(arm) {
  const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
  const L = 260
  const P = { x: 500, y: 90 }
  const th = 50 * Math.PI / 180
  const kula = phys.circle(P.x + L * Math.sin(th), P.y + L * Math.cos(th), 34, { density: 0.02, restitution: 0.1, friction: 0.4, frictionAir: 0.001, label: 'ball' })
  let c, h
  if (arm === 'rå') {
    c = Matter.Constraint.create({ pointA: { x: P.x, y: P.y }, bodyB: kula, pointB: { x: 0, y: 0 }, length: L, stiffness: 0.96, damping: 0.04 })
    Composite.add(phys.world, c)
  } else {
    h = phys.pendel(P, kula, { langd: L, styvhet: 0.96, damp: 0.04 })
    c = h.constraint
  }
  const bana = []
  for (let i = 0; i < 400; i++) {
    if (i === 90) { if (h) h.punkt.x += 120; else c.pointA.x += 120 }
    if (i === 200) { if (h) h.satt({ styvhet: 0.18, damp: 0.06 }); else { c.stiffness = 0.18; c.damping = 0.06 } }
    phys.update(FIXED)
    if (i % 40 === 39) bana.push(kula.position.x, kula.position.y)
  }
  phys.destroy()
  return { bana }
}

// Kedja (F1-risken "constraintIterations 2 räcker inte"): fem stavar + en tung kula längst ned, alla leder
// styvhet 1. Mått: kulans avstånd till fästet minus den stela kedjans längd (5·40 + 30) — töjningen.
function kedjeTojning(villkor) {
  const phys = new PhysicsWorld({ gravityY: 1, walls: [], iterationer: { villkor } })
  const lank = []
  for (let i = 0; i < 5; i++) lank.push(phys.rectangle(640, 120 + i * 40, 12, 40, { density: 0.002, frictionAir: 0.01, collisionFilter: { group: -1 } }))
  const tung = phys.circle(640, 120 + 5 * 40 + 20, 30, { density: 0.02, collisionFilter: { group: -1 } })
  phys.gangjarn(lank[0], { x: 640, y: 100 })
  for (let i = 1; i < 5; i++) phys.led(lank[i - 1], lank[i], { ankA: { x: 0, y: 20 }, ankB: { x: 0, y: -20 }, styvhet: 1 })
  phys.led(lank[4], tung, { ankA: { x: 0, y: 20 }, ankB: { x: 0, y: -30 }, styvhet: 1 })
  Body.setVelocity(tung, { x: 6, y: 0 })
  let max = 0
  for (let i = 0; i < 300; i++) {
    phys.update(FIXED)
    max = Math.max(max, Math.hypot(tung.position.x - 640, tung.position.y - 100) - (5 * 40 + 30))
  }
  phys.destroy()
  return { max }
}

function s4() {
  const s = scen('S4', 'leder (F1) — gångjärnsdrift, stel rotation damp 0 mot 0,18, pendel, motor + momenttak, portar mot rå Constraint')
  // ── KONTROLLRADER ───────────────────────────────────────────────────────────────────────
  // (1) mätaren rör sig: ett MJUKT gångjärn (styvhet 0,2) under samma last MÅSTE drifta.
  const mjuk = gangjarnsDrift('api', { styvhet: 0.03, last: 'svang' })
  kontroll(s, 'mätaren rör sig: gångjärn med styvhet 0,03 under den svängande lasten driftar (> 0,5 px)', mjuk.drift > 0.5, `${f(mjuk.drift, 2)} px`)
  // (2) STEL ROTATION: leden med damp 0,18 MÅSTE tappa snurret (CLAUDE.md: 0,18 → 0,002), damp 0 måste hålla.
  const snurr18 = stelSnurr('api', 0.18)
  const snurr0 = stelSnurr('api', 0)
  kontroll(s, 'fällan är verklig: led med damp 0,18 tappar stel rotation (> 50 % bort på 40 steg)', snurr18.kvar < 0.5, `kvar ${f(snurr18.kvar * 100, 1)} % (damp 0,18) mot ${f(snurr0.kvar * 100, 1)} % (damp 0)`)
  kontroll(s, 'damp 0 (förval) håller stel rotation (> 85 % kvar)', snurr0.kvar > 0.85, `${f(snurr0.kvar * 100, 1)} %`)
  // (3) motorn: ett för litet momenttak MÅSTE stanna den (taket binder) — annars mäter "taket håller" ingenting.
  const motorStall = motorKor({ cap: 4, last: 0.008 })
  const motorFri = motorKor({ cap: 4000, last: 0.008 })
  kontroll(s, 'mätaren rör sig: tak 4 stannar motorn under last (når inte målfarten)', motorStall.nadde < 0 && Math.abs(motorStall.slutFart) < 0.01, `slutfart ${f(motorStall.slutFart, 4)} · topp ${f(motorStall.toppMoment, 2)}`)
  kontroll(s, 'mätaren rör sig: tak 4000 når målfarten −0,02 under samma last', motorFri.nadde > 0, `inom ${motorFri.nadde} steg`)
  // (4) portarnas kontrollarm: rå mot rå ska vara identisk med sig själv, och mätaren ska skilja olika k.
  const rA = balansKor('rå', { k: 58, klossIdx: 'stor', x: 820 })
  const rB = balansKor('rå', { k: 58, klossIdx: 'stor', x: 820 })
  const rC = balansKor('rå', { k: 48, klossIdx: 'stor', x: 820 })
  kontroll(s, 'balanstornet rå-armen är deterministisk (två körningar, samma tal)', rA.slut === rB.slut && rA.topp === rB.topp, `${f(rA.slut, 6)} = ${f(rB.slut, 6)}`)
  kontroll(s, 'balanstornet rå-armen rör sig: k 48 mot 58 skiljer (> 0,03 rad)', Math.abs(rC.slut - rA.slut) > 0.03, `${f(rC.slut, 4)} mot ${f(rA.slut, 4)}`)
  if (!s.kontrollHolls) { ut('  ✗ kontrollen höll inte — inga mätrader för S4'); return }

  // ── MÄTRADER ────────────────────────────────────────────────────────────────────────────
  const mjukP = gangjarnsDrift('api', { styvhet: 0.03, last: 'plank' })
  kontroll(s, 'mätaren rör sig: gångjärn med styvhet 0,03 under plank-lasten driftar (> 0,5 px)', mjukP.drift > 0.5, `${f(mjukP.drift, 2)} px`)
  for (const last of ['plank', 'svang']) {
    const gj = gangjarnsDrift('api', { last })
    const gjRå = gangjarnsDrift('rå', { last })
    s.rader.push({ last, gangjarn: gj, rå: gjRå })
    const namn = last === 'plank' ? 'balanstornets plank + tyngsta klossen ytterst + vridfjäder' : 'svängande stång från vågrätt'
    kontroll(s, `gångjärnets drift ≤ 0,5 px över 10 s — ${namn}`, gj.drift <= 0.5, `${f(gj.drift, 3)} px (rå Constraint: ${f(gjRå.drift, 3)}) · topp ω ${f(gj.toppFart, 4)} rad/steg`)
    kontroll(s, `gångjärnet = den råa Constraintens bana — ${last} (slutvinkel, 1e-9)`, Math.abs(gj.vinkel - gjRå.vinkel) < 1e-9 && Math.abs(gj.drift - gjRå.drift) < 1e-9, `${f(gj.vinkel, 6)} mot ${f(gjRå.vinkel, 6)}`)
  }
  const tkA = tvaKroppsDrift('api')
  const tkR = tvaKroppsDrift('rå')
  s.rader.push({ tvaKroppar: { api: tkA, rå: tkR } })
  kontroll(s, 'gångjärn mellan två kroppar (med: …) = råa Constraints: samma glapp och slutvinkel (1e-9)', Math.abs(tkA.drift - tkR.drift) < 1e-9 && Math.abs(tkA.vinkel - tkR.vinkel) < 1e-9, `glapp ${f(tkA.drift, 3)} px mot ${f(tkR.drift, 3)}`)
  not(s, `kedja stativ → A → B (två gångjärn, 200 px stavar, hängande): ankarglappet är ${f(tkA.drift, 2)} px — matters egen lösare, samma tal i råa armen; en kedja av leder vill ha fler villkorsvarv (se raden nedan)`)

  // Pendel: damp 0 mot 0,1
  const p0 = pendelEnergi('api', { damp: 0 })
  const p1 = pendelEnergi('api', { damp: 0.1 })
  const r0 = pendelEnergi('rå', { damp: 0 })
  const r1 = pendelEnergi('rå', { damp: 0.1 })
  s.rader.push({ pendel: { damp0: p0, damp01: p1, rå0: r0, rå01: r1 } })
  ut(`\n  pendel (kula r 15, rep 200, 60° ut, 10 s): energi kvar  damp 0 → ${f(p0.kvar * 100, 1)} %  ·  damp 0,1 → ${f(p1.kvar * 100, 1)} %  (rå: ${f(r0.kvar * 100, 1)} / ${f(r1.kvar * 100, 1)} %)`)
  kontroll(s, 'pendel = den råa Constraintens energi (både damp 0 och 0,1, 1e-9)', Math.abs(p0.kvar - r0.kvar) < 1e-9 && Math.abs(p1.kvar - r1.kvar) < 1e-9, `${f(p0.kvar, 6)}/${f(r0.kvar, 6)} · ${f(p1.kvar, 6)}/${f(r1.kvar, 6)}`)
  not(s, `pendel: matters constraint SJÄLV tar energi — ${f(p0.kvar * 100, 1)} % kvar efter 10 s vid damp 0 (rå Constraint: ${f(r0.kvar * 100, 1)} %), och damp 0,1 gör det inte märkbart värre (${f(p1.kvar * 100, 1)} %): damping verkar bara RADIELLT, en svängande kula är tangentiell. Fällan är en led med LÄNGD 0: stel rotation ${f(snurr18.kvar * 100, 1)} % kvar vid damp 0,18 mot ${f(snurr0.kvar * 100, 1)} % vid damp 0 (kontrollraden ovan)`)
  s.rader.push({ stelSnurr: { damp0: snurr0, damp018: snurr18 } })

  // Motor
  ut('')
  const motRad = []
  const TAK = [4000, 4000, 60, 12, 4]
  const KOR = [['olastad, tak 4000', { cap: 4000, last: 0 }], ['lastad, tak 4000', { cap: 4000, last: 0.008 }], ['lastad, tak 60', { cap: 60, last: 0.008 }], ['lastad, tak 12', { cap: 12, last: 0.008 }], ['lastad, tak 4', { cap: 4, last: 0.008 }]]
  for (const [namn, o] of KOR) {
    const m = motorKor(o)
    motRad.push({ namn, ...m })
    ut(`  motor ${pad(namn, 20)} når 95 % av målfarten inom ${padL(m.nadde < 0 ? '—' : m.nadde, 4)} steg · högsta moment ${padL(f(m.toppMoment, 2), 9)} (tak ${o.cap}) · slutfart ${padL(f(m.slutFart, 4), 8)} · vinkel ${f(m.vinkel, 2)}`)
  }
  s.rader.push({ motor: motRad })
  const lastad = motRad[1]
  kontroll(s, 'motorn når målfarten under last (≤ 40 steg)', lastad.nadde > 0 && lastad.nadde <= 40, `${lastad.nadde} steg`)
  kontroll(s, 'motorn passerar ALDRIG momenttaket (fem körningar, oberoende läsning av body.torque)', motRad.every((m, i) => m.toppMoment <= TAK[i] + 1e-6), motRad.map((m) => f(m.toppMoment, 2)).join(' · '))
  kontroll(s, 'ett bindande tak syns: taket 12 använder fullt moment (≥ 11,9) och når målfarten SENARE än taket 60', motRad[3].toppMoment >= 11.9 && (motRad[3].nadde < 0 || motRad[3].nadde > motRad[2].nadde), `${f(motRad[3].toppMoment, 2)} · tak 12 nådde ${motRad[3].nadde} mot tak 60 ${motRad[2].nadde}`)

  // Motor mellan TVÅ fria kroppar (ingen tyngd, ingen luft): relativ fart når målet, momentet delas som ett PAR
  {
    const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    const A = phys.rectangle(570, 300, 60, 60, { frictionAir: 0, collisionFilter: { group: -1 } })
    const B = phys.rectangle(630, 300, 60, 120, { frictionAir: 0, collisionFilter: { group: -1 } })
    const h = phys.led(A, B, { ankA: { x: 30, y: 0 }, ankB: { x: -30, y: 0 }, styvhet: 1 })
    h.motor({ fart: 0.03, maxMoment: 3000 })
    let nadde = -1
    let L = 0
    for (let i = 1; i <= 80; i++) {
      phys.update(FIXED)
      if (nadde < 0 && Math.abs(h.vinkelfart - 0.03) < 0.0015) nadde = i
    }
    // vinkelmomentet kring ledens punkt (ω·I per kropp + orbital) — ska hållas ~0 när momentet är ett par
    const p = { x: 600, y: 300 }
    for (const k of [A, B]) L += k.inertia * k.angularVelocity + k.mass * ((k.position.x - p.x) * k.velocity.y - (k.position.y - p.y) * k.velocity.x)
    kontroll(s, 'motor mellan två fria kroppar: relativ vinkelfart når målet (±5 %) inom 40 steg', nadde > 0 && nadde <= 40, `${nadde} steg · rel ${f(h.vinkelfart, 4)} · A ${f(A.angularVelocity, 4)} · B ${f(B.angularVelocity, 4)}`)
    kontroll(s, 'momentet fördelas som ett par: A får motsatt tecken mot B, och vinkelmomentet kring leden hålls ≈ 0', A.angularVelocity < 0 && B.angularVelocity > 0 && Math.abs(L) < 0.02 * Math.abs(B.inertia * B.angularVelocity), `L ${f(L, 1)} mot B:s ${f(B.inertia * B.angularVelocity, 1)}`)
    phys.destroy()
  }

  // Portar
  ut('')
  let bit = true
  for (const [k, kl, x, namn] of [[48, 'stor', 820, 'smal·stor ytterst'], [58, 'stor', 820, 'mellan·stor ytterst'], [72, 'stor', 460, 'bred·stor ytterst (vänster)'], [58, 'mellan', 820, 'mellan·mellan ytterst'], [58, 'liten', 820, 'mellan·liten ytterst'], [58, 'stor', 700, 'mellan·stor innerst']]) {
    const a = balansKor('rå', { k, klossIdx: kl, x })
    const b = balansKor('api', { k, klossIdx: kl, x })
    const lika = a.slut === b.slut && a.topp === b.topp && a.x === b.x && a.y === b.y && a.bana.every((v, i) => v === b.bana[i])
    bit = bit && lika
    s.rader.push({ balanstornet: namn, k, rå: a, api: b, lika })
    ut(`  balanstornet ${pad(namn, 28)} k ${padL(k, 2)} · lutning rå ${padL(f(a.slut, 4), 7)} rad · gångjärn+vridfjäder ${padL(f(b.slut, 4), 7)} rad · ${lika ? 'BIT FÖR BIT LIKA' : 'SKILJER ' + f(Math.abs(a.slut - b.slut), 9)}`)
  }
  kontroll(s, 'port balanstornet: gångjärn + vridfjäder ger EXAKT samma bana som rå Constraint + egen torque (6 konfigurationer × 600 steg)', bit)
  const vA = vippKor('rå')
  const vB = vippKor('api')
  const vippLika = vA.slut === vB.slut && vA.topp === vB.topp && vA.bana.every((v, i) => v === vB.bana[i])
  s.rader.push({ vippbradan: { rå: vA, api: vB, lika: vippLika } })
  ut(`  vippbrädan: toppvinkel rå ${f(vA.topp, 4)} · gångjärn ${f(vB.topp, 4)} · slut ${f(vA.slut, 5)} / ${f(vB.slut, 5)}`)
  kontroll(s, 'port vippbrädan: gångjärnet ger EXAKT samma bana som rå Constraint (viktfall på högra armen, 480 steg)', vippLika && vA.topp > 0.05, `topp ${f(vA.topp, 4)} rad`)
  const nA = repKor('rå')
  const nB = repKor('api')
  const repLika = nA.bana.every((v, i) => v === nB.bana[i])
  s.rader.push({ knuffaTornet: { rå: nA, api: nB, lika: repLika } })
  ut(`  knuffa-tornet: rep (flytt av pointA.x efter 90 steg, repbyte efter 200) — ${repLika ? 'BIT FÖR BIT LIKA' : 'SKILJER'} över ${nA.bana.length / 2} provpunkter, slut (${f(nA.bana.at(-2), 1)}, ${f(nA.bana.at(-1), 1)}) mot (${f(nB.bana.at(-2), 1)}, ${f(nB.bana.at(-1), 1)})`)
  kontroll(s, 'port knuffa-tornet: pendel med styvhet 0,96 / damp 0,04, flyttbart fäste och repbyte = samma bana som rå Constraint', repLika)

  const k2 = kedjeTojning(2)
  const k5 = kedjeTojning(5)
  s.rader.push({ kedja: { villkor2: k2, villkor5: k5 } })
  not(s, `kedja av 6 leder med en tung kula längst ned (300 steg): största töjningen — villkorsvarv 2: ${f(k2.max, 2)} px · 5: ${f(k5.max, 2)} px (grodan kör 5)`)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
if (vill('S1')) s1()
if (vill('S3')) s3()
if (vill('S4')) s4()
if (vill('S6')) s6()
if (vill('S7')) s7()
if (vill('S8')) s8()
if (vill('S10')) s10()
if (JSON_UT) console.log(JSON.stringify(resultat, null, 2))
else ut(`\n${kontrollFel ? '✗ ' + kontrollFel + ' kontrollrad(er) föll' : '✓ alla kontrollrader höll'}`)
process.exit(kontrollFel ? 1 : 0)
