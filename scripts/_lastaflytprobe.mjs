// LASTA FLYTAREN (FYSIKPLAN F6a, plask-i-vattnet) — trycker en sjunkare ned en flytare?
//
//   node scripts/_lastaflytprobe.mjs          (Node, ingen webbläsare, ingen dev-server)
//
// Samma tank och samma tal som spelet (GRAV_Y 0,9 · flyt 1,6/0,4 · BODY_R 38 · ytan 330 · liv på
// flytaren, så den guppar — `BOB_AMP` är nästan lika stor som gravitationen), driven av
// PhysicsWorld + Flytvolym med fasta 1/60-steg. Flytarens gupp är DETERMINISTISKT (egen stegklocka,
// fas 0), så varje arm jämförs STEG FÖR STEG mot kontrollens bana: Δy = armens y − kontrollens y
// (positiv = nedtryckt).
//   KONTROLL 1   inget släpp alls                → grundbanan (och dess medelnedsänkning)
//   KONTROLL 2   sjunkare släpps 400 px bort      → Δy ≈ 0 (ett släpp på annat håll rör inte flytaren)
//   HEAD         födelse på DROP_Y (dagens kod)   → vad som händer utan lyftet
//   MÄTARM       födelse på slappY()              → flytaren trycks ned (Δy > 0) och KOMMER TILLBAKA
// Kontrollerna måste hålla innan mätraderna skrivs (en mätning som inte rör sig mellan två kända
// lägen mäter ingenting). Avslutar med kod 1 om något faller.
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Flytvolym } from '../src/lib/flytkraft.js'
import { FluidWorld, FLUIDS } from '../src/lib/vatska.js'
import { slappY } from '../src/games/plask-i-vattnet/last.js'

const { Body } = Matter
const SURFACE_Y = 330, FLOOR_TOP = 672, WALL_L = 414, WALL_R = 866, BODY_R = 38, GRAV_Y = 0.9, DROP_Y = SURFACE_Y - 26
const FLOAT = 1.6, SINK = 0.4
const FLOAT_X = 588
const SETT = 300 // flytaren lägger sig först
const f1 = (x) => x.toFixed(1)
const f3 = (x) => x.toFixed(3)
let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }

function bygg() {
  const varld = new PhysicsWorld({ gravityY: GRAV_Y, walls: [] })
  const T = 60
  varld.rectangle((WALL_L + WALL_R) / 2, FLOOR_TOP + T / 2, WALL_R - WALL_L + T * 2, T, { isStatic: true, friction: 0.6 })
  varld.rectangle(WALL_L - T / 2, 300, T, 900, { isStatic: true, friction: 0.3 })
  varld.rectangle(WALL_R + T / 2, 300, T, 900, { isStatic: true, friction: 0.3 })
  const vol = new Flytvolym({ varld, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
  return { varld, vol }
}
const kropp = (varld) => varld.circle(0, 0, BODY_R, { restitution: 0.06, friction: 0.3, frictionAir: 0.012, density: 0.0012 })

// En körning. `slapp` = null | { x, lyft }. Returnerar flytarens bana (y, frac per steg).
function kor(slapp, av = 0, sek = 12) {
  const { varld, vol } = bygg()
  const fl = kropp(varld)
  Body.setPosition(fl, { x: FLOAT_X, y: 340 })
  vol.lagg(fl, { flyt: FLOAT, r: BODY_R, hemX: FLOAT_X, liv: true, fas: 0 })
  const objekt = [{ floats: true, body: fl, r: BODY_R }]
  const SLAPP = SETT + av // släppsteget — flytarens gupp har olika fas vid olika steg
  let sj = null
  let overlapp = 0 // hur djupt sjunkaren föds inne i flytaren (px)
  const y = []
  const frac = []
  const kontakt = []
  const rel = [] // sjunkarens fart relativt flytaren per steg (px/steg)
  for (let s = 0; s < SETT + 80 + sek * 60; s++) {
    if (s === SLAPP && slapp) {
      sj = kropp(varld)
      const sy = slapp.lyft ? slappY(objekt, slapp.x, DROP_Y, BODY_R) : DROP_Y
      Body.setPosition(sj, { x: slapp.x, y: sy })
      Body.setVelocity(sj, { x: 0, y: 3.8 })
      vol.lagg(sj, { flyt: SINK, r: BODY_R, hemX: 700, liv: false })
      overlapp = Math.max(0, 2 * BODY_R - Math.hypot(slapp.x - fl.position.x, sy - fl.position.y))
    }
    varld.update(1000 / 60)
    y.push(fl.position.y)
    frac.push(vol.nedsankning(fl))
    rel.push(sj ? Math.hypot(sj.velocity.x - fl.velocity.x, sj.velocity.y - fl.velocity.y) : 0)
    kontakt.push(sj ? Math.hypot(sj.position.x - fl.position.x, sj.position.y - fl.position.y) < 2 * BODY_R + 2 : false)
  }
  vol.destroy(); varld.destroy()
  return { y, frac, kontakt, rel, overlapp, slapp: SLAPP }
}

// Δy mot kontrollens bana, räknat från släppsteget.
function mot(k, a) {
  let topp = -1e9, kont = 0, sistaKontakt = -1, forsta = -1, anslag = 0
  for (let s = a.slapp; s < a.y.length; s++) {
    const d = a.y[s] - k.y[s]
    if (d > topp) topp = d
    if (a.kontakt[s]) {
      kont++
      sistaKontakt = s - a.slapp
      if (forsta < 0) { forsta = s - a.slapp; anslag = Math.max(a.rel[s], a.rel[s - 1] || 0) }
    }
  }
  const slut = a.y.slice(-60).reduce((t, v, i) => t + (v - k.y[k.y.length - 60 + i]), 0) / 60
  return { topp, kont, sistaKontakt, forsta, anslag, slut, overlapp: a.overlapp }
}

console.log('\nLASTA FLYTAREN — trycker en sjunkare ned en flytare?\n')
const FASER = [0, 35, 70, 105, 140, 175] // släppsteg efter inläggningen: täcker guppets period (~209 steg)
const k1 = kor(null)
const fm = k1.frac.slice(60, SETT).reduce((a, c) => a + c, 0) / (SETT - 60)
console.log(`KONTROLL 1 · inget släpp: medelnedsänkning ${f3(fm)} (1/flyt = ${f3(1 / FLOAT)}), flytarens y ${f1(Math.min(...k1.y.slice(SETT)))}…${f1(Math.max(...k1.y.slice(SETT)))}`)
ok('flytaren ligger kvar vid ytan (medelnedsänkning 0,45–0,8)', fm > 0.45 && fm < 0.8, f3(fm))
const k2 = FASER.map((av) => mot(k1, kor({ x: 800, lyft: true }, av)).topp)
console.log(`KONTROLL 2 · släpp 400 px bort i ${FASER.length} faser: max |Δy| ${f1(Math.max(...k2.map(Math.abs)))} px`)
ok('ett släpp långt bort rör inte flytaren (max |Δy| < 0,5 px)', Math.max(...k2.map(Math.abs)) < 0.5)
ok('slappY() lämnar y orört när ingen flytare är i närheten', slappY([{ floats: true, body: { position: { x: 588, y: 340 } }, r: 38 }], 900, DROP_Y, 38) === DROP_Y)
ok('slappY() lyfter födelsen över en flytare under släppet', slappY([{ floats: true, body: { position: { x: 588, y: 340 } }, r: 38 }], 600, DROP_Y, 38) < DROP_Y - 20)

if (fel) { console.log(`\n${fel} kontroll(er) föll — inga mätrader.`); process.exit(1) }

// Per dx: HEAD och NY över alla faser. "född i" = största överlappet vid födelsen; "1:a kontakt" = minsta steg
// till första beröring bland faserna där de rör varandra; "ned" = största nedtryckning av flytaren.
const sam = (arr, fn) => arr.map(fn)
let nedMax = 0
console.log(' dx  arm   max ned (px)   född i flytaren (px)   1:a kontakt (steg)   anslag (px/steg)   kontaktsteg  Δy efter 12 s')
for (const dx of [0, 14, 30, 52]) {
  const x = FLOAT_X + dx
  const head = FASER.map((av) => mot(k1, kor({ x, lyft: false }, av)))
  const ny = FASER.map((av) => mot(k1, kor({ x, lyft: true }, av)))
  const rad = (namn, m) => {
    const kontakt = m.filter((r) => r.forsta >= 0)
    console.log(`${String(dx).padStart(3)}  ${namn} ${f1(Math.max(...sam(m, (r) => r.topp))).padStart(10)} ${f1(Math.max(...sam(m, (r) => r.overlapp))).padStart(16)} ${String(kontakt.length ? Math.min(...kontakt.map((r) => r.forsta)) : '-').padStart(20)} ${(kontakt.length ? f1(Math.min(...kontakt.map((r) => r.anslag))) : '-').padStart(18)} ${String(Math.max(...sam(m, (r) => r.kont))).padStart(12)} ${f1(Math.max(...sam(m, (r) => Math.abs(r.slut)))).padStart(10)}`)
  }
  rad('HEAD', head)
  rad('NY  ', ny)
  if (dx <= 30) {
    const nedny = Math.max(...ny.map((r) => r.topp))
    ok(`dx ${dx}: NY föds aldrig inne i flytaren, HEAD gör det i någon fas`, ny.every((r) => r.overlapp === 0) && head.some((r) => r.overlapp > 5), `HEAD max ${f1(Math.max(...head.map((r) => r.overlapp)))} px · NY max ${f1(Math.max(...ny.map((r) => r.overlapp)))} px`)
    ok(`dx ${dx}: sjunkaren FALLER ned (första beröring ≥ 4 steg efter födelsen, anslag ≥ 3 px/steg)`, ny.filter((r) => r.forsta >= 0).every((r) => r.forsta >= 4 && r.anslag >= 3), `min ${Math.min(...ny.filter((r) => r.forsta >= 0).map((r) => r.forsta))} steg`)
    ok(`dx ${dx}: släppet trycker ned flytaren (max Δy > 6 px)`, nedny > 6, `${f1(nedny)} px`)
    ok(`dx ${dx}: flytaren kommer tillbaka (|Δy efter 12 s| < 4 px i alla faser)`, ny.every((r) => Math.abs(r.slut) < 4), `${f1(Math.max(...ny.map((r) => Math.abs(r.slut))))} px`)
    ok(`dx ${dx}: sjunkaren lämnar flytaren inom 8 s i alla faser`, ny.every((r) => r.sistaKontakt >= 0 && r.sistaKontakt < 480), `längst ${Math.max(...ny.map((r) => r.sistaKontakt))} steg`)
    nedMax = Math.max(nedMax, nedny)
  }
}
console.log(`\nmest nedtryckt flytare: ${f1(nedMax)} px`)

// ---- VOLYM: trängs vatten undan när flytaren trycks ned? (vätskeskiktet, som spelets _buildFluid) ----
// Samma skikt som spelet: 414–866 × 258–400, ytan 330, partikelyta 73 px², hinder r 34 som FÖLJER kropparna
// via `foljKroppar` medan de är i skiktet. Mäter på partiklarnas egna koordinater.
//   KONTROLL    skikt utan några hinder        → ytnivån rör sig inte av att kroppar finns (referensnivå)
//   FLYTARE     bara flytaren (hindret följer) → nivån STIGER (undanträngning finns)
//   FLYTARE+SJ  flytare + landande sjunkare    → nivån stiger MER, och inget läcker / tunnlar
const OBJ_FLUID_R = 34, FLUID_BOTTOM = 400, FLUID_CEIL = 258, FLUID_R = 24, PARTIKEL_YTA = 73
const iSkiktet = (b) => b.position.y > SURFACE_Y - 26 && b.position.y < FLUID_BOTTOM + 20

function skikt(medHinder, sjunkare, sek = 8) {
  const { varld, vol } = bygg()
  const fl = kropp(varld)
  Body.setPosition(fl, { x: FLOAT_X, y: 340 })
  vol.lagg(fl, { flyt: FLOAT, r: BODY_R, hemX: FLOAT_X, liv: true, fas: 0 })
  const objekt = [{ floats: true, body: fl, r: BODY_R }]
  const fluid = new FluidWorld({
    max: 480, radius: FLUID_R, gravityY: 0.5, rho0: FLUIDS.vatten.rho0, sigma: FLUIDS.vatten.sigma, beta: FLUIDS.vatten.beta,
    restitution: 0.02, wallFriction: 0.2, walls: { left: true, right: true, bottom: true, top: true },
    bounds: { left: WALL_L, right: WALL_R, top: FLUID_CEIL, bottom: FLUID_BOTTOM },
  })
  const steg = Math.sqrt(PARTIKEL_YTA)
  let n = 0
  for (let y = FLUID_BOTTOM - 4; y > SURFACE_Y; y -= steg) {
    for (let x = WALL_L + 5; x < WALL_R - 4; x += steg) {
      fluid.spawn(x + (((n * 7919) % 100) / 100 - 0.5) * 2, y, {}) // deterministisk "slump"
      n++
    }
  }
  const start = fluid.count
  const fk = medHinder ? fluid.foljKroppar(varld, []) : null
  fk?.lagg({ body: fl, form: { type: 'circle', r: OBJ_FLUID_R }, nar: iSkiktet })
  const KOL = 12
  const nivaer = []
  let ute = 0, genom = 0, maxHinder = 0
  let sj = null
  for (let s = 0; s < 150 + sek * 60; s++) {
    if (s === 150 && sjunkare) {
      sj = kropp(varld)
      Body.setPosition(sj, { x: FLOAT_X + 14, y: slappY(objekt, FLOAT_X + 14, DROP_Y, BODY_R) })
      Body.setVelocity(sj, { x: 0, y: 3.8 })
      vol.lagg(sj, { flyt: SINK, r: BODY_R, hemX: 700, liv: false })
      fk?.lagg({ body: sj, form: { type: 'circle', r: OBJ_FLUID_R }, nar: iSkiktet })
    }
    varld.update(1000 / 60)
    fluid.update(1000 / 60)
    maxHinder = Math.max(maxHinder, fluid.colliders.length)
    if (s >= 150) {
      const kol = new Array(KOL).fill(1e9)
      for (let i = 0; i < fluid.count; i++) {
        const x = fluid.x[i], y = fluid.y[i]
        if (x < WALL_L - 20 || x > WALL_R + 20 || y < FLUID_CEIL - 20 || y > FLUID_BOTTOM + 20) ute++
        for (const c of fluid.colliders) if (Math.hypot(x - c.x, y - c.y) < c.r - 10) genom++
        const k = Math.floor(((x - WALL_L) / (WALL_R - WALL_L)) * KOL)
        if (k >= 0 && k < KOL && y < kol[k]) kol[k] = y
      }
      const g = kol.filter((v) => v < 1e9)
      nivaer.push(g.reduce((a, c) => a + c, 0) / g.length)
    }
  }
  const slut = fluid.count
  const medel = (a) => a.reduce((t, v) => t + v, 0) / a.length
  const vila = medel(nivaer.slice(0, 30)) // innan släppet har något hunnit hända (släppet är vid steg 150, mätt från 150)
  const res = { start, slut, ute, genom, maxHinder, topp: Math.min(...nivaer), vila, medel: medel(nivaer), kvar: fk ? fk.antal : 0 }
  fk?.stoppa()
  fluid.destroy(); vol.destroy(); varld.destroy()
  return res
}

console.log('\nVOLYM — vätskeskiktet (hinder följer kropparna via foljKroppar)\n')
const v0 = skikt(false, false)
const v1 = skikt(true, false)
const v2 = skikt(true, true)
const rad = (n, v) => console.log(`${n.padEnd(12)} partiklar ${v.start} → ${v.slut} · utanför ${v.ute} · genom hinder ${v.genom} · max hinder ${v.maxHinder} · ytnivå vila ${f1(v.vila)} · högst ${f1(v.topp)} · medel ${f1(v.medel)}`)
rad('KONTROLL', v0)
rad('FLYTARE', v1)
rad('FLYTARE+SJ', v2)
ok('KONTROLL: inga hinder alls', v0.maxHinder === 0)
ok('volymen är konstant i alla armar (inget skapas, inget läcker)', v0.start === v0.slut && v1.start === v1.slut && v2.start === v2.slut, `${v0.start} → ${v2.slut}`)
ok('ingen partikel utanför skiktet', v0.ute + v1.ute + v2.ute === 0, `${v0.ute + v1.ute + v2.ute}`)
ok('hindret tränger undan vatten: flytaren höjer nivån jämfört med kontrollen (≥ 2 px)', v0.topp - v1.topp >= 2 || v0.medel - v1.medel >= 2, `högst ${f1(v0.topp - v1.topp)} px · medel ${f1(v0.medel - v1.medel)} px`)
ok('den landande sjunkaren sänker inte nivån (≥ −1,5 px mot flytaren ensam) — den trängs undan först när den är I skiktet (y > 304)', v2.topp - v1.topp <= 1.5 && v2.medel - v1.medel <= 1.5, `högst ${f1(v1.topp - v2.topp)} px · medel ${f1(v1.medel - v2.medel)} px · max hinder ${v2.maxHinder}`)
ok('hindren tunnlas inte: ≤ 50 partikel-rutor djupt (10 px) inne i ett hinder', v1.genom <= 50 && v2.genom <= 50, `FLYTARE ${v1.genom} · +SJ ${v2.genom} partikel-rutor av ~${v1.start * 8 * 60}`)
process.exit(fel ? 1 : 0)
