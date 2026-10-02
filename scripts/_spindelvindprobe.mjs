// SPINDELHJÄLTENS VINDBAND + ENHORNINGENS VINDKNAPP (FYSIKPLAN F4, kluster B2) — mäter i TAL, utan webbläsare.
//
//   node scripts/_spindelvindprobe.mjs [--bara A,B]
//
// HUR LANDNINGSPUNKTEN MÄTS: samma matter-värld som spelet (PhysicsWorld, samma kropp, samma fysiksteg).
//   A  spindelhjälten: hjälten skjuts från slangbellan (240,540) med ett rutnät av (kraft × vinkel); landning =
//      x vid hjältens FÖRSTA golvkontakt (collisionStart mot 'wall'), banan körs 300 steg. Tre armar per skott:
//        K0   ingen vind
//        HEAD dagens globala vind (setWind(pv / WIND_DIV), pv = 0,15 + 0,035·nivå) — KONTROLLARMEN
//        NY   Vindfalt-bandet (src/games/spindelhjalten/vindband.js)
//      Mått: skjutning |landning − K0| per arm, att inget lämnar bild (x ∈ [0,1280] hela flygningen),
//      att ett lågt skott UNDER bandet inte flyttas (bandet är en plats, inte en global kraft) och
//      förhandsbanans fel (px vid steg 64) för NY mot en prickbana utan vind och mot HEAD:s.
//   B  enhorningen-elvira: se längre ned.
import { PhysicsWorld, MATERIALS, Body } from '../src/lib/physics.js'
import { predictTrajectory } from '../src/lib/physics.js'
import { SLING, BAND_X0, BAND_X1, luftForNiva, nyttVindband, stallBand, forhandsAcc, forutsagBana, HERO_FA } from '../src/games/spindelhjalten/vindband.js'

import * as ELV from '../src/games/enhorningen-elvira/vindband.js'

const args = process.argv.slice(2)
const baraIdx = args.indexOf('--bara')
const BARA = baraIdx >= 0 ? new Set(args[baraIdx + 1].split(',').map((s) => s.trim().toUpperCase())) : null
const vill = (id) => !BARA || BARA.has(id)

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const not = (t) => console.log(`  · ${t}`)
const rubrik = (t) => console.log(`\n══ ${t}`)
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const medel = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1)

// ═══ A · spindelhjälten ═══════════════════════════════════════════════════════════════════════════════
const GRAVITY = 1.0
const PREVIEW_G = 0.2778 * GRAVITY
const PREVIEW_DAMP = 1 - 0.004
const WIND_DIV = (1000 / 60) ** 2
const BOUNDS = { floorY: 674, leftX: 46, rightX: 1234, restitution: 0.72 }
const HERO_R = 46

function skjut({ vx, vy, arm, niva, dir, bandY }) {
  const phys = new PhysicsWorld({ gravityY: GRAVITY, walls: ['floor', 'left', 'right'] })
  let vind = null
  if (arm === 'HEAD') phys.setWind((dir * (0.15 + Math.min(niva, 4) * 0.035)) / WIND_DIV, 0)
  if (arm === 'NY') {
    vind = nyttVindband(phys, { luft: luftForNiva(niva), y: bandY })
    stallBand(vind, { dir, y: bandY })
  }
  const body = phys.circle(SLING.x, SLING.y, HERO_R, { ...MATERIALS.bouncy, label: 'hero' })
  Body.setVelocity(body, { x: vx, y: vy })
  let landX = null
  let landSteg = null
  let steg = 0
  phys.onCollision((e) => {
    for (const p of e.pairs) {
      const a = p.bodyA.label
      const b = p.bodyB.label
      if ((a === 'hero' && b === 'wall') || (b === 'hero' && a === 'wall')) {
        if (landX == null && body.position.y > 560) {
          landX = body.position.x
          landSteg = steg
        }
      }
    }
  })
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  const bana = []
  for (steg = 1; steg <= 300; steg++) {
    phys.update(1000 / 60)
    minX = Math.min(minX, body.position.x)
    maxX = Math.max(maxX, body.position.x)
    minY = Math.min(minY, body.position.y)
    bana.push({ x: body.position.x, y: body.position.y })
  }
  vind?.destroy()
  phys.destroy()
  return { landX, landSteg, minX, maxX, minY, bana }
}

if (vill('A')) {
  rubrik('A · spindelhjälten — vindbandet (NY) mot dagens globala vind (HEAD) och ingen vind (K0)')
  const KRAFT = [14, 18, 22, 26]
  const GRADER = [-25, -38, -50, -62, -74]
  const bandY = 300
  for (const niva of [0, 4]) {
    for (const dir of [1, -1]) {
      const rader = []
      for (const k of KRAFT) {
        for (const g of GRADER) {
          const a = (g * Math.PI) / 180
          // vänsterskott = spegelvänd riktning vore en annan slangbella; vi skjuter alltid åt höger och
          // låter vinden vara med- eller motvind
          const vx = Math.cos(a) * k
          const vy = Math.sin(a) * k
          const r0 = skjut({ vx, vy, arm: 'K0', niva, dir, bandY })
          const rh = skjut({ vx, vy, arm: 'HEAD', niva, dir, bandY })
          const rn = skjut({ vx, vy, arm: 'NY', niva, dir, bandY })
          rader.push({ k, g, r0, rh, rn })
        }
      }
      const dh = rader.filter((r) => r.r0.landX != null && r.rh.landX != null).map((r) => Math.abs(r.rh.landX - r.r0.landX))
      const dn = rader.filter((r) => r.r0.landX != null && r.rn.landX != null).map((r) => Math.abs(r.rn.landX - r.r0.landX))
      const ut = (arm) => rader.filter((r) => r[arm].minX < 0 || r[arm].maxX > 1280).length
      not(`nivå ${niva}, vind ${dir > 0 ? '→' : '←'} · ${rader.length} skott · skjutning vid första golvkontakt, px (medel/max):  HEAD ${f(medel(dh), 0)}/${f(Math.max(...dh), 0)} · NY ${f(medel(dn), 0)}/${f(Math.max(...dn), 0)}  · lämnar bild (x<0|>1280): HEAD ${ut('rh')} · NY ${ut('rn')}`)
      if (niva === 0 && dir > 0) {
        ok('KONTROLL: dagens globala vind flyttar landningen märkbart (medel ≥ 60 px)', medel(dh) >= 60, `${f(medel(dh), 0)} px`)
        ok('bandet flyttar landningen märkbart (medel ≥ 40 px) men inte förstörande (max ≤ 360 px)', medel(dn) >= 40 && Math.max(...dn) <= 360, `medel ${f(medel(dn), 0)} · max ${f(Math.max(...dn), 0)} px`)
      }
      ok(`nivå ${niva} ${dir > 0 ? '→' : '←'}: inget skott lämnar bilden i sidled (väggar) — NY`, ut('rn') === 0)
    }
  }
  // Bandet är en PLATS: ett platt lågt skott som aldrig når upp i bandet (y > 300+118 = 418 hela vägen) flyttas inte.
  {
    const lagt = skjut({ vx: 20, vy: -4, arm: 'NY', niva: 4, dir: 1, bandY: 300 })
    const lagt0 = skjut({ vx: 20, vy: -4, arm: 'K0', niva: 4, dir: 1, bandY: 300 })
    const lagtH = skjut({ vx: 20, vy: -4, arm: 'HEAD', niva: 4, dir: 1, bandY: 300 })
    ok('KONTROLL: ett lågt skott under bandet — HEAD flyttas (> 40 px), bandet inte (< 6 px)', Math.abs(lagtH.landX - lagt0.landX) > 40 && Math.abs(lagt.landX - lagt0.landX) < 6, `K0 ${f(lagt0.landX, 0)} · HEAD ${f(lagtH.landX, 0)} · NY ${f(lagt.landX, 0)}`)
    not(`lågt skott högsta punkt y ${f(lagt0.minY, 0)} (bandet börjar y ${300 + 118})`)
  }
  // Med- och motvind är olika: ett högt skott flyttas åt vindens håll
  {
    const a = (-55 * Math.PI) / 180
    const vx = Math.cos(a) * 14
    const vy = Math.sin(a) * 14
    const k0 = skjut({ vx, vy, arm: 'K0', niva: 2, dir: 1, bandY: 300 })
    const hoger = skjut({ vx, vy, arm: 'NY', niva: 2, dir: 1, bandY: 300 })
    const vanster = skjut({ vx, vy, arm: 'NY', niva: 2, dir: -1, bandY: 300 })
    ok('→-vind skjuter längre, ←-vind kortare än ingen vind (±≥ 25 px)', hoger.landX - k0.landX >= 25 && k0.landX - vanster.landX >= 25, `← ${f(vanster.landX, 0)} · ingen ${f(k0.landX, 0)} · → ${f(hoger.landX, 0)}`)
  }

  // Förhandsbanan: fel vid steg 64 mot verklig bana (inga hinder). Tre pricklinjer: utan vind, dagens konstant, NY.
  {
    const fel0 = []
    const felH = []
    const felN = []
    let n = 0
    for (const niva of [0, 2, 4]) {
      for (const k of [16, 22, 28]) {
        for (const g of [-30, -45, -60]) {
          const a = (g * Math.PI) / 180
          const vx = Math.cos(a) * k
          const vy = Math.sin(a) * k
          const verkl = skjut({ vx, vy, arm: 'NY', niva, dir: 1, bandY: 300 })
          const rh = skjut({ vx, vy, arm: 'HEAD', niva, dir: 1, bandY: 300 })
          const T = 64
          const pris = (wx) => predictTrajectory({ x: SLING.x, y: SLING.y, vx, vy, gy: PREVIEW_G, wx, steps: T, every: 1, floorY: BOUNDS.floorY, leftX: BOUNDS.leftX, rightX: BOUNDS.rightX, restitution: BOUNDS.restitution, damp: PREVIEW_DAMP })
          const vind = nyttVindband({ beforeStep: null, world: null }, { luft: luftForNiva(niva), y: 300 })
          stallBand(vind, { dir: 1, y: 300 })
          const wxNy = forhandsAcc({ vind, vx, vy, gy: PREVIEW_G, damp: PREVIEW_DAMP, bounds: BOUNDS, steps: T })
          vind.destroy()
          const pN = pris(wxNy)[T - 1]
          const p0 = pris(0)[T - 1]
          const pH = pris(0.15 + Math.min(niva, 4) * 0.035)[T - 1]
          const vN = verkl.bana[T - 1]
          const vH = rh.bana[T - 1]
          fel0.push(Math.hypot(p0.x - vN.x, p0.y - vN.y))
          felN.push(Math.hypot(pN.x - vN.x, pN.y - vN.y))
          felH.push(Math.hypot(pH.x - vH.x, pH.y - vH.y))
          n++
        }
      }
    }
    not(`förhandsbanans fel vid steg 64 mot verklig bana (${n} skott, medel/max px): utan vind ${f(medel(fel0), 1)}/${f(Math.max(...fel0), 0)} · NY (viktad medelacc) ${f(medel(felN), 1)}/${f(Math.max(...felN), 0)} · HEAD:s egen mot HEAD ${f(medel(felH), 1)}/${f(Math.max(...felH), 0)}`)
    ok('KONTROLL: en prickbana UTAN vind har tydligt fel mot bandets verkliga bana (medel > 25 px)', medel(fel0) > 25, `${f(medel(fel0), 1)} px`)
    ok('prickbanan med vindband ljuger mindre än utan vind (medel ≤ 60 % av vindfria felet)', medel(felN) <= medel(fel0) * 0.6, `${f(medel(felN), 1)} mot ${f(medel(fel0), 1)} px`)
  }
  // luftVid ↔ fysiken: sluthastigheten vid fritt fall i bandet
  {
    const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    const b = phys.circle(700, 300, 20, { ...MATERIALS.bouncy, label: 'hero' })
    const v = nyttVindband(phys, { luft: 30, y: 300 })
    stallBand(v, { dir: 1, y: 300 })
    const x0 = b.position.x
    for (let i = 0; i < 30; i++) phys.update(1000 / 60)
    const dv = b.velocity.x
    const forv = HERO_FA * v.luftVid(b.position.x, 300).vx * 30
    not(`30 steg i bandets mitt: hjältens fart ${f(dv, 2)} px/steg (förväntat ≈ fa·w·30 = ${f(forv, 2)}), flyttad ${f(b.position.x - x0, 0)} px`)
    ok('kraften i fysiken = fa · luftens fart (±35 %, avtagande längs bandet)', Math.abs(dv - forv) / forv < 0.35, `${f(dv, 2)} mot ${f(forv, 2)}`)
    v.destroy()
    phys.destroy()
  }
}

// ═══ A2 · vindbilden (Pixi utan renderare): löven rör sig i vindens riktning, tonar ut, rivs utan spår ═══
if (vill('A')) {
  rubrik('A2 · spindelhjälten — vindbilden (Vindbild) syns, följer riktningen och rivs rent')
  const { Container } = await import('pixi.js')
  const { Vindbild } = await import('../src/games/spindelhjalten/vindbild.js')
  for (const dir of [1, -1]) {
    const rot = new Container()
    const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    const vind = nyttVindband(phys, { luft: 35, y: 300 })
    const bild = new Vindbild(rot)
    ok('av: bilden är dold', bild.rot.visible === false)
    stallBand(vind, { dir, y: 300 })
    bild.stall({ dir, y: 300, halv: 118, luft: 35 })
    bild.uppdatera(1 / 60, vind)
    const x0 = bild._lov.map((l) => l.v.x)
    for (let i = 0; i < 30; i++) bild.uppdatera(1 / 60, vind)
    ok(`dir ${dir}: bilden syns och har alfa > 0,9 efter 0,5 s`, bild.rot.visible && bild.rot.alpha > 0.9, f(bild.rot.alpha, 2))
    const med = bild._lov.filter((l) => l.p > 0.1 && l.p < 0.9)
    const x1 = bild._lov.map((l) => l.v.x)
    const flyttat = bild._lov.reduce((a, l, i) => a + (l.p > 0.1 && l.p < 0.9 ? Math.sign(x1[i] - x0[i]) : 0), 0)
    ok(`dir ${dir}: löven driver åt vindens håll (${dir > 0 ? 'höger' : 'vänster'})`, med.length > 0 && Math.sign(flyttat) === dir, `${med.length} löv, nettotecken ${flyttat}`)
    ok('löven ligger inom bandets bredd', bild._lov.every((l) => l.v.x >= BAND_X0 - 5 && l.v.x <= BAND_X1 + 5))
    stallBand(vind, { dir: 0 })
    bild.stall({ dir: 0 })
    for (let i = 0; i < 90; i++) bild.uppdatera(1 / 60, vind)
    ok('vinden av: bilden tonar bort och döljs', bild.rot.visible === false)
    bild.destroy()
    bild.uppdatera(1 / 60, vind)
    bild.stall({ dir })
    ok('efter destroy: uppdatera/stall är no-ops (exit-säkert)', bild.rot.destroyed === true)
    vind.destroy()
    phys.destroy()
    rot.destroy({ children: true })
  }
}

// ═══ B · enhorningen-elvira ═══════════════════════════════════════════════════════════════════════════
const E_R = 46
const E_GROUND_TOP = 600
const E_WEIGHTS = {
  latt: { gravity: 0.8, density: 0.0006, frictionAir: 0.02 },
  tung: { gravity: 1.45, density: 0.003, frictionAir: 0.012 },
}
const E_BOUNDS = (restitution = 0.6) => ({ floorY: E_GROUND_TOP - E_R, leftX: E_R, rightX: 1280 - E_R, restitution })

function elviraSkott({ vx, vy, vikt, arm, dir, niva, bandY }) {
  const w = E_WEIGHTS[vikt]
  const phys = new PhysicsWorld({ gravityY: w.gravity, walls: ['left', 'right', 'ceiling'] })
  phys.rectangle(640, E_GROUND_TOP + 70, 1280 + 600, 140, { isStatic: true, restitution: 0.32, friction: 0.7, label: 'ground' })
  let vind = null
  if (arm === 'HEAD') phys.setWind(dir * 0.0005, 0)
  if (arm === 'NY') {
    vind = ELV.nyttVindband(phys, { luft: ELV.luftForNiva(niva), y: bandY })
    ELV.stallBand(vind, { dir, y: bandY })
  }
  const body = phys.circle(ELV.START.x, ELV.START.y, E_R, { restitution: 0.4, friction: 0.05, frictionAir: w.frictionAir, density: w.density, label: 'elvira' })
  Body.setInertia(body, Infinity)
  phys.fartTak(body, 22)
  Body.setVelocity(body, { x: vx, y: vy })
  let landX = null
  phys.onCollision((e) => {
    for (const p of e.pairs) {
      const a = p.bodyA.label
      const b = p.bodyB.label
      if ((a === 'elvira' && b === 'ground') || (b === 'elvira' && a === 'ground')) if (landX == null) landX = body.position.x
    }
  })
  let minX = Infinity
  let maxX = -Infinity
  const bana = []
  for (let steg = 1; steg <= 240; steg++) {
    phys.update(1000 / 60)
    minX = Math.min(minX, body.position.x)
    maxX = Math.max(maxX, body.position.x)
    bana.push({ x: body.position.x, y: body.position.y })
  }
  vind?.destroy()
  phys.destroy()
  return { landX, minX, maxX, bana }
}

if (vill('B')) {
  rubrik('B · enhorningen-elvira — vindbandet (NY) mot dagens globala vind (HEAD) och ingen vind (K0)')
  const KRAFT = [8, 11, 14, 17]
  const GRADER = [10, 25, 40, 55]
  const bandY = 330
  for (const vikt of ['latt', 'tung']) {
    for (const dir of [1, -1]) {
      const niva = 4
      const rader = []
      for (const k of KRAFT) {
        for (const g of GRADER) {
          const a = (g * Math.PI) / 180
          const vx = Math.cos(a) * k
          const vy = Math.sin(a) * k - 3
          rader.push({
            r0: elviraSkott({ vx, vy, vikt, arm: 'K0', dir, niva, bandY }),
            rh: elviraSkott({ vx, vy, vikt, arm: 'HEAD', dir, niva, bandY }),
            rn: elviraSkott({ vx, vy, vikt, arm: 'NY', dir, niva, bandY }),
          })
        }
      }
      const gilt = rader.filter((r) => r.r0.landX != null && r.rh.landX != null && r.rn.landX != null)
      const dh = gilt.map((r) => Math.abs(r.rh.landX - r.r0.landX))
      const dn = gilt.map((r) => Math.abs(r.rn.landX - r.r0.landX))
      const ut = (arm) => rader.filter((r) => r[arm].minX < 0 || r[arm].maxX > 1280).length
      not(`${vikt} ${dir > 0 ? 'medvind →' : 'motvind ←'} · ${gilt.length}/${rader.length} skott landar · skjutning px (medel/max): HEAD ${f(medel(dh), 0)}/${f(Math.max(...dh), 0)} · NY ${f(medel(dn), 0)}/${f(Math.max(...dn), 0)} · lämnar bild: HEAD ${ut('rh')} · NY ${ut('rn')}`)
      if (vikt === 'latt' && dir > 0) {
        ok('KONTROLL: dagens globala vind flyttar landningen märkbart (medel ≥ 40 px)', medel(dh) >= 40, `${f(medel(dh), 0)} px`)
        ok('bandet flyttar landningen märkbart (medel ≥ 40 px), inte förstörande (max ≤ 330)', medel(dn) >= 40 && Math.max(...dn) <= 330, `medel ${f(medel(dn), 0)} · max ${f(Math.max(...dn), 0)} px`)
      }
      ok(`${vikt} ${dir > 0 ? '→' : '←'}: inget skott lämnar bilden (väggar/tak) — NY`, ut('rn') === 0)
    }
  }
  // Lätt följer med mer än tung (samma luft, olika frictionAir) — fysiken, inte ett handsatt tal.
  {
    const a = (30 * Math.PI) / 180
    const vx = Math.cos(a) * 11
    const vy = Math.sin(a) * 11 - 3
    const d = {}
    for (const vikt of ['latt', 'tung']) {
      const k0 = elviraSkott({ vx, vy, vikt, arm: 'K0', dir: 1, niva: 4, bandY: 330 })
      const k1 = elviraSkott({ vx, vy, vikt, arm: 'NY', dir: 1, niva: 4, bandY: 330 })
      d[vikt] = k1.landX - k0.landX
    }
    ok('lätt Elvira blåser längre än tung i samma luft (≥ 1,2×)', d.latt >= d.tung * 1.2 && d.tung > 10, `lätt ${f(d.latt, 0)} px · tung ${f(d.tung, 0)} px`)
  }
  // Förhandsbanan mäts som VINDENS BIDRAG (bana med vind − bana utan, vid steg 54, före/efter första golvkontakt
  // spelar ingen roll — golvstudsen modelleras grovt med eller utan vind och ingår inte i frågan "ljuger vinden?").
  //   hint-bågen    forutsagBana (vind ur fältet per steg) · launcherns tal  viktad medelacc → predictTrajectory(wx)
  //   utan vind     kontrollarm: bidrag 0       ·   HEAD  dagens konstant 0,139 mot dagens globala vind
  {
    const fHint = []
    const fTal = []
    const f0 = []
    const fH = []
    const T = 54
    for (const vikt of ['latt', 'tung']) {
      const w = E_WEIGHTS[vikt]
      for (const niva of [3, 6]) {
        for (const k of [8, 12, 16]) {
          for (const g of [15, 35, 55]) {
            const a = (g * Math.PI) / 180
            const vx = Math.cos(a) * k
            const vy = Math.sin(a) * k - 3
            const k0 = elviraSkott({ vx, vy, vikt, arm: 'K0', dir: 1, niva, bandY: 330 }).bana[T - 1]
            const verkl = elviraSkott({ vx, vy, vikt, arm: 'NY', dir: 1, niva, bandY: 330 }).bana[T - 1]
            const rh = elviraSkott({ vx, vy, vikt, arm: 'HEAD', dir: 1, niva, bandY: 330 }).bana[T - 1]
            const vind = ELV.nyttVindband({ beforeStep: null, world: null }, { luft: ELV.luftForNiva(niva), y: 330 })
            ELV.stallBand(vind, { dir: 1, y: 330 })
            const gy = w.gravity * 0.2778
            const damp = 1 - w.frictionAir
            const bounds = E_BOUNDS(0.6)
            const wxNy = ELV.forhandsAcc({ vind, vx, vy, gy, damp, fa: w.frictionAir, bounds, steps: T })
            const pris = (wx) => predictTrajectory({ x: ELV.START.x, y: ELV.START.y, vx, vy, gy, wx, damp, steps: T, every: 1, floorY: bounds.floorY, leftX: bounds.leftX, rightX: bounds.rightX, restitution: bounds.restitution })[T - 1]
            const p0 = pris(0)
            const exakt = ELV.forutsagBana({ vind, vx, vy, gy, damp, fa: w.frictionAir, steps: T, bounds }).pts[T - 1]
            const santBidrag = verkl.x - k0.x
            fHint.push(Math.abs(exakt.x - p0.x - santBidrag))
            fTal.push(Math.abs(pris(wxNy).x - p0.x - santBidrag))
            f0.push(Math.abs(santBidrag))
            fH.push(Math.abs(pris(0.0005 * 277.8).x - p0.x - (rh.x - k0.x)))
            vind.destroy()
          }
        }
      }
    }
    const rad = (l) => `${f(medel(l), 1)}/${f(Math.max(...l), 0)}`
    not(`vindens bidrag i x vid steg ${T}, fel mot verklig bana (${f0.length} skott, medel/max px): hint-bågen ${rad(fHint)} · launcherns tal ${rad(fTal)} · utan vind ${rad(f0)} · HEAD:s konstant mot HEAD ${rad(fH)}`)
    ok('KONTROLL: vindens bidrag är stort nog att mäta (utan-vind-felet medel > 25 px)', medel(f0) > 25, `${f(medel(f0), 1)} px`)
    ok('hint-bågen (vind ur fältet per steg) visar vindens bidrag inom 20 % av dess storlek', medel(fHint) <= medel(f0) * 0.2, `${f(medel(fHint), 1)} mot ${f(medel(f0), 1)} px`)
    ok('launcherns vind-tal visar vindens bidrag inom 25 % av dess storlek', medel(fTal) <= medel(f0) * 0.25, `${f(medel(fTal), 1)} mot ${f(medel(f0), 1)} px`)
  }
}

// ═══ B2 · Elviras vindbild (Pixi utan renderare) ═════════════════════════════════════════════════════
if (vill('B')) {
  rubrik('B2 · enhorningen-elvira — vindbilden syns, följer riktningen och rivs rent')
  const { Container } = await import('pixi.js')
  const { Vindbild } = await import('../src/games/enhorningen-elvira/vindbild.js')
  for (const dir of [1, -1]) {
    const rot = new Container()
    const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    const vind = ELV.nyttVindband(phys, { luft: 10.5, y: 330 })
    const bild = new Vindbild(rot)
    ok('lugnt: bilden är dold', bild.rot.visible === false)
    ELV.stallBand(vind, { dir, y: 330 })
    bild.stall({ dir, y: 330, halv: ELV.BAND_HALV, luft: 10.5 })
    bild.uppdatera(1 / 60, vind)
    const x0 = bild._blommor.map((b) => b.v.x)
    for (let i = 0; i < 30; i++) bild.uppdatera(1 / 60, vind)
    ok(`dir ${dir}: bilden syns (alfa > 0,9 efter 0,5 s)`, bild.rot.visible && bild.rot.alpha > 0.9, f(bild.rot.alpha, 2))
    const x1 = bild._blommor.map((b) => b.v.x)
    const med = bild._blommor.filter((b) => b.p > 0.1 && b.p < 0.9)
    const netto = bild._blommor.reduce((a, b, i) => a + (b.p > 0.1 && b.p < 0.9 ? Math.sign(x1[i] - x0[i]) : 0), 0)
    ok(`dir ${dir}: blommorna driver åt vindens håll`, med.length > 0 && Math.sign(netto) === dir, `${med.length} blommor, nettotecken ${netto}`)
    ok('blommorna ligger inom bandets bredd', bild._blommor.every((b) => b.v.x >= ELV.BAND_X0 - 5 && b.v.x <= ELV.BAND_X1 + 5))
    ELV.stallBand(vind, { dir: 0 })
    bild.stall({ dir: 0 })
    for (let i = 0; i < 90; i++) bild.uppdatera(1 / 60, vind)
    ok('lugnt igen: bilden tonar bort och döljs', bild.rot.visible === false)
    // Medvind → motvind direkt: bandet tonas in på nytt (inget hopp över skärmen)
    ELV.stallBand(vind, { dir: 1, y: 330 })
    bild.stall({ dir: 1, y: 330 })
    for (let i = 0; i < 40; i++) bild.uppdatera(1 / 60, vind)
    bild.stall({ dir: -1, y: 330 })
    ok('riktningsbyte direkt: bilden tonar in på nytt (alfa < 0,5 vid bytet)', bild._visa === 0)
    bild.destroy()
    bild.uppdatera(1 / 60, vind)
    bild.stall({ dir })
    ok('efter destroy: uppdatera/stall är no-ops (exit-säkert)', bild.rot.destroyed === true)
    vind.destroy()
    phys.destroy()
    rot.destroy({ children: true })
  }
}

console.log(fel ? `\n✗ ${fel} fel` : '\n✓ alla mått gröna')
process.exit(fel ? 1 : 0)
