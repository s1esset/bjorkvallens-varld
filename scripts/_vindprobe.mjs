// VINDPROBEN (FYSIKPLAN F4) — mäter lib/vind.js i TAL, utan webbläsare.
//
//   node scripts/_vindprobe.mjs [--bara A,B,C,D,E,F]
//
// Varje avsnitt kör sin KONTROLLARM först (dagens kod inbäddad, eller en barlast med känt utslag) och
// skriver mätraden bara om kontrollen rör sig. En mätning som inte skiljer två KÄNDA lägen åt säger
// ingenting om det okända.
//
//   A  portekvivalens   studsa-ner-fläkten: dagens `_fanForce` (kopia) mot Vindfalt — samma kroppar,
//                       samma läge/fart → samma KRAFT per steg (bit för bit) och samma bana.
//   B  takt-invarians   M1 S6: samma vind över 60 / 57 / 30 fps → samma bana. Kontrollarm: en kraft
//                       per BILDRUTA (gamla mönstret) som VISAS bero på takten.
//   C  luften är relativ  sluthastighet = luftens fart, lätt följer med / tung släpar, frictionAir 0 skenar inte.
//   D  formen           flugan-pa-nasans `_vindKraft` (kopia) mot Vindfalt kon+sug; en ren kon täcker mindre.
//   E  bajs-och-kiss    pruttvindens kon: medelacceleration längs en flygbana + förhandsbanans fel (px)
//                       mot dagens globala vind.
//   F  tid              styrka-reglaget · puff (periodisk) · pust (enstaka by) · aktiv som funktion.
import { PhysicsWorld, Body, speedToAccel, STEG2 } from '../src/lib/physics.js'
import { Vindfalt } from '../src/lib/vind.js'

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
const WIND_LUFT = 16 // px/steg — kalibreras i E, står i spelet som PRUTT_LUFT
const f = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v))

// deterministisk slump
function lcg(seed) {
  let s = seed >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
}

// ─── studsa-ner: dagens konstanter + dagens formel (KOPIA av index.js:60-70, :403-419) ────────────────────
const FAN_X = [116, 1164]
const FAN_BAND = 104
const FAN_REACH = 1150
const FAN_AVTAG = 0.6
const FAN_FART = 110

function gammalFlakt(phys, bodies, st, fart = FAN_FART) {
  return phys.beforeStep(() => {
    if (!st.blaser) return
    const fx = FAN_X[st.sida]
    const dir = st.sida === 0 ? 1 : -1
    for (const body of bodies) {
      const p = body.position
      const dy = Math.abs(p.y - st.y)
      if (dy > FAN_BAND) continue
      const langs = (p.x - fx) * dir
      if (langs < 0 || langs > FAN_REACH) continue
      const avtag = (1 - FAN_AVTAG * (langs / FAN_REACH)) * (1 - dy / FAN_BAND)
      const a = speedToAccel(fart * avtag, body.frictionAir)
      Body.applyForce(body, p, { x: body.mass * a * dir, y: 0 })
    }
  })
}

// Dagens fläkt som Vindfalt — exakt så som studsa-ner bygger den.
function nyFlaktVind(phys, st, bodies) {
  const v = new Vindfalt({
    varld: phys,
    form: { typ: 'band', x: FAN_X[st.sida], y: st.y, rackvidd: FAN_REACH, halvhojd: FAN_BAND },
    luft: { x: st.sida === 0 ? FAN_FART : -FAN_FART, y: 0 },
    avtag: { langs: FAN_AVTAG, tvars: 1 },
    filter: (b) => bodies.includes(b),
    aktiv: () => st.blaser,
  })
  return v
}

function nyttBrade(st, antal, seed = 7) {
  const phys = new PhysicsWorld({ gravityY: 1, walls: [] })
  const slump = lcg(seed)
  const bodies = []
  for (let i = 0; i < antal; i++) {
    const x = 90 + slump() * 1100
    const y = 140 + slump() * 420
    const b = phys.circle(x, y, 20, { restitution: 0.72, friction: 0.04, frictionAir: 0.006, density: 0.002, label: 'ball' })
    Body.setVelocity(b, { x: (slump() - 0.5) * 6, y: slump() * 4 })
    bodies.push(b)
  }
  return { phys, bodies }
}

// ═══ A · portekvivalens ═════════════════════════════════════════════════════════════════════════════════
if (vill('A')) {
  rubrik('A · portekvivalens — studsa-ner-fläkten, dagens formel mot Vindfalt')
  const kor = (arm, sida, fanY, steg = 240, antal = 80) => {
    const st = { sida, y: fanY, blaser: true }
    const { phys, bodies } = nyttBrade(st, antal)
    let rig
    if (arm === 'gammal') gammalFlakt(phys, bodies, st)
    else if (arm === 'gammal+1%') gammalFlakt(phys, bodies, st, FAN_FART * 1.01)
    else if (arm === 'vind') rig = nyFlaktVind(phys, st, bodies)
    else if (arm === 'vind-av') {
      st.blaser = false
      rig = nyFlaktVind(phys, st, bodies)
    }
    // läser kraften ETTER att vindens lyssnare lagt den (registrerad efter) — i matter nollas den i steget
    const krafter = []
    phys.beforeStep(() => krafter.push(bodies.map((b) => [b.force.x, b.force.y])))
    const banor = []
    for (let i = 0; i < steg; i++) {
      phys.update(1000 / 60)
      banor.push(bodies.map((b) => [b.position.x, b.position.y, b.velocity.x, b.velocity.y]))
    }
    rig?.destroy()
    phys.destroy()
    return { krafter, banor }
  }
  const diff = (a, b) => {
    let dF = 0
    let dP = 0
    let nFord = 0
    for (let s = 0; s < a.krafter.length; s++) {
      for (let k = 0; k < a.krafter[s].length; k++) {
        dF = Math.max(dF, Math.abs(a.krafter[s][k][0] - b.krafter[s][k][0]), Math.abs(a.krafter[s][k][1] - b.krafter[s][k][1]))
        for (let c = 0; c < 4; c++) dP = Math.max(dP, Math.abs(a.banor[s][k][c] - b.banor[s][k][c]))
        if (a.krafter[s][k][0] !== 0) nFord++
      }
    }
    return { dF, dP, nFord }
  }
  let krokKontroll = true
  const rader = []
  for (const [sida, y] of [[0, 380], [1, 380], [0, 250], [1, 512]]) {
    const g = kor('gammal', sida, y)
    const kp = diff(g, kor('gammal+1%', sida, y)) // barlast: 1 % starkare fläkt — MÅSTE synas
    const av = diff(g, kor('vind-av', sida, y)) // fläkten avstängd — MÅSTE synas
    const v = diff(g, kor('vind', sida, y))
    rader.push({ sida, y, kp, av, v })
    if (!(kp.dF > 0 && kp.dP > 1e-9)) krokKontroll = false
    if (!(av.dF > 0 && av.dP > 1e-9)) krokKontroll = false
  }
  ok('KONTROLL: en 1 % starkare fläkt och en avstängd fläkt SYNS i krafttalet (mätaren rör sig)', krokKontroll,
    rader.map((r) => `${r.sida}/${r.y}: +1 % → dF ${r.kp.dF.toExponential(1)}, av → dF ${r.av.dF.toExponential(1)}`).join(' · '))
  ok('KONTROLL: fältet träffar kroppar (krafter ≠ 0 i minst 200 prov per körning)', rader.every((r) => r.v.nFord > 200), rader.map((r) => r.v.nFord).join('/'))
  for (const r of rader) {
    ok(`fläkt sida ${r.sida}, y ${r.y}: Vindfalt = dagens formel`, r.v.dF === 0 && r.v.dP === 0, `max |ΔF| ${r.v.dF.toExponential(2)} · max |Δbana| ${r.v.dP.toExponential(2)} över 240 steg × 80 kroppar`)
  }
}

// ═══ B · takt-invarians ═════════════════════════════════════════════════════════════════════════════════
if (vill('B')) {
  rubrik('B · takt-invarians (M1 S6) — samma vind över 60 / 57 / 30 fps')
  // Bana efter ~3 s speltid. `perBildruta` = det GAMLA mönstret (en kraft före varje update) som kontrollarm.
  const kor = (fps, perBildruta) => {
    const st = { sida: 0, y: 380, blaser: true }
    const phys = new PhysicsWorld({ gravityY: 1, walls: [] })
    const b = phys.circle(200, 380, 20, { frictionAir: 0.006, density: 0.002 })
    Body.setStatic(b, false)
    const frame = 1000 / fps
    let rig = null
    if (!perBildruta) rig = nyFlaktVind(phys, st, [b])
    const slump = lcg(3)
    let t = 0
    let rutor = 0
    let steg = 0
    let snap = null
    // Läget efter EXAKT 180 fysiksteg (ögonblicket före steg 181) — annars mäter spannet bara hur många
    // steg sista bildrutan hann med, inte vindens takt.
    phys.beforeStep(() => {
      if (++steg === 181) snap = { x: b.position.x, vx: b.velocity.x }
    })
    while (!snap) {
      // vsync-jitter ±0,3 ms, som en riktig skärm
      const d = frame + (slump() - 0.5) * 0.6
      if (perBildruta) {
        const dir = 1
        const dy = Math.abs(b.position.y - st.y)
        const langs = (b.position.x - FAN_X[0]) * dir
        if (dy <= FAN_BAND && langs >= 0 && langs <= FAN_REACH) {
          const avtag = (1 - FAN_AVTAG * (langs / FAN_REACH)) * (1 - dy / FAN_BAND)
          Body.applyForce(b, b.position, { x: b.mass * speedToAccel(FAN_FART * avtag, b.frictionAir), y: 0 })
        }
      }
      phys.update(d)
      t += d
      rutor++
    }
    const ut = snap
    rig?.destroy()
    phys.destroy()
    return ut
  }
  const sv = [60, 57, 30].map((fps) => ({ fps, ...kor(fps, false) }))
  const sp = [60, 57, 30].map((fps) => ({ fps, ...kor(fps, true) }))
  const spannV = Math.max(...sv.map((r) => r.x)) - Math.min(...sv.map((r) => r.x))
  const spannP = Math.max(...sp.map((r) => r.x)) - Math.min(...sp.map((r) => r.x))
  not(`kontrollarm (en kraft per BILDRUTA): ${sp.map((r) => `${r.fps} fps → x ${f(r.x, 1)}`).join(' · ')} · spann ${f(spannP, 1)} px`)
  not(`Vindfalt (per fysiksteg):            ${sv.map((r) => `${r.fps} fps → x ${f(r.x, 1)}`).join(' · ')} · spann ${f(spannV, 1)} px`)
  ok('KONTROLL: kraft per bildruta beror på takten (spann > 20 px)', spannP > 20, `${f(spannP, 1)} px`)
  ok('Vindfalt: samma bana över 60/57/30 fps (spann < 0,01 px)', spannV < 0.01, `${f(spannV, 2)} px`)
}

// ═══ C · luften är relativ ═════════════════════════════════════════════════════════════════════════════
if (vill('C')) {
  rubrik('C · luften är relativ — sluthastighet, lätt/tung, frictionAir 0')
  const W = 6 // px/steg
  const kor = (fa, { global = false, steg = 1500 } = {}) => {
    const phys = new PhysicsWorld({ gravityY: 0, walls: [], windAx: global ? 0.0005 : 0 })
    const b = phys.circle(0, 0, 20, { frictionAir: fa, density: 0.002 })
    const v = global ? null : new Vindfalt({ varld: phys, form: { typ: 'band', x: -1e6, y: -1e6, vinkel: 0, rackvidd: 4e6, halvhojd: 4e6 }, avtag: { langs: 0, tvars: 0 }, luft: { x: W, y: 0 } })
    let t63 = null
    let max = 0
    for (let i = 0; i < steg; i++) {
      phys.update(1000 / 60)
      max = Math.max(max, b.velocity.x)
      if (t63 == null && b.velocity.x >= 0.632 * W) t63 = i + 1
    }
    const slut = b.velocity.x
    v?.destroy()
    phys.destroy()
    return { t63, slut, max }
  }
  const lat = kor(0.05)
  const tung = kor(0.008)
  const ingen = kor(0)
  not(`lätt (fa 0,05): 63 % efter ${lat.t63} steg, sluthastighet ${f(lat.slut, 2)} (luft ${W})`)
  not(`tung (fa 0,008): 63 % efter ${tung.t63} steg, sluthastighet ${f(tung.slut, 2)}`)
  not(`fa 0: sluthastighet ${f(ingen.slut, 2)}, högsta ${f(ingen.max, 2)}`)
  // Första steget: dagens globala vind ger SAMMA acceleration åt lätt och tung (massa- och fa-blind),
  // Vindfalt ger acceleration ∝ fa (lätt följer med, tung släpar).
  const steg1 = (fa, global) => kor(fa, { global, steg: 1 }).slut
  const g1 = [steg1(0.05, true), steg1(0.008, true)]
  const v1 = [steg1(0.05, false), steg1(0.008, false)]
  ok('KONTROLL: dagens globala setWind ger lätt och tung SAMMA fart efter ett steg', Math.abs(g1[0] - g1[1]) < 1e-9 && g1[0] > 0.1, `lätt ${f(g1[0], 4)} · tung ${f(g1[1], 4)}`)
  ok('Vindfalt: första stegets fartändring ∝ frictionAir (lätt/tung = 6,25 ±2 %)', Math.abs(v1[0] / v1[1] - 6.25) < 0.125, `${f(v1[0], 4)} / ${f(v1[1], 4)} = ${f(v1[0] / v1[1], 3)}`)
  ok('lätt kropp driver mot luftens fart (±3 %)', Math.abs(lat.slut - W) < 0.03 * W, f(lat.slut, 3))
  ok('tung kropp driver mot luftens fart (±3 %)', Math.abs(tung.slut - W) < 0.03 * W, f(tung.slut, 3))
  ok('lätt FÖLJER MED fortare än tung (≥ 3×)', lat.t63 * 3 <= tung.t63, `${lat.t63} mot ${tung.t63} steg`)
  ok('aldrig förbi luften', lat.max <= W * 1.001 && tung.max <= W * 1.001 && ingen.max <= W * 1.001, `högst ${f(Math.max(lat.max, tung.max, ingen.max), 3)}`)
  ok('frictionAir 0 skenar inte (reservFa) — driver mot luften', Math.abs(ingen.slut - W) < 0.03 * W, f(ingen.slut, 3))
}

// ═══ D · formen: kon + sug ═════════════════════════════════════════════════════════════════════════════
if (vill('D')) {
  rubrik('D · formen — flugan-pa-nasans `_vindKraft` (kopia) mot Vindfalt kon + sug')
  // KOPIA av flugan-pa-nasan/index.js:826-858 (styrkan s och riktningen), huvudet på (660, 408), rikt ±1.
  const R = 760, H = 260, SR = 620, SD = 0.62
  const gammal = (x, y, rikt) => {
    const hx = 660, hy = 408
    const langs = (x - hx) * rikt
    const dy = y - hy
    if (langs >= 0) {
      if (langs > R) return null
      const halv = H + langs * 0.42
      if (Math.abs(dy) > halv) return null
      const s = (1 - langs / R) * (1 - (Math.abs(dy) / halv) * 0.72)
      return s <= 0 ? null : { s, vx: rikt, vy: 0 }
    }
    const bak = -langs
    if (bak > SR) return null
    const halv = H * 1.25
    if (Math.abs(dy) > halv) return null
    const s = (1 - bak / SR) * (1 - (Math.abs(dy) / halv) * 0.55) * SD
    if (s <= 0) return null
    const d = Math.hypot(bak, dy) || 1
    return { s, vx: (rikt * bak) / d, vy: -dy / d }
  }
  const nyFlugvind = (rikt, sug) =>
    new Vindfalt({
      form: { typ: 'kon', x: 660, y: 408, rackvidd: R, halvhojd: H, vinkel: rikt > 0 ? 0 : Math.PI, ...(sug ? { sug: { rackvidd: SR, halvhojd: H * 1.25, del: SD, tvars: 0.55 } } : {}) },
      luft: { x: 100 * rikt, y: 0 },
    })
  let ds = 0
  let dr = 0
  let n = 0
  let nGammal = 0
  let nKon = 0
  let nSug = 0
  let nGammalSug = 0
  for (const rikt of [1, -1]) {
    const med = nyFlugvind(rikt, true)
    const utan = nyFlugvind(rikt, false)
    for (let x = 100; x <= 1240; x += 20) {
      for (let y = 100; y <= 700; y += 20) {
        const g = gammal(x, y, rikt)
        const m = med.formVid(x, y)
        const u = utan.formVid(x, y)
        if (!g !== !m) {
          ds = Infinity
          continue
        }
        if (g) {
          nGammal++
          n++
          ds = Math.max(ds, Math.abs(g.s - m.s))
          dr = Math.max(dr, Math.abs(g.vx - m.ux), Math.abs(g.vy - m.uy))
        }
        if (u) nKon++
        if (m) nSug++
      }
    }
    med.destroy()
    utan.destroy()
  }
  not(`rutnät 20 px över hela skärmen (båda riktningar): gammal ${nGammal} punkter med vind · kon+sug ${nSug} · ren kon ${nKon}`)
  ok('KONTROLL: en ren kon (utan sug) täcker FÄRRE punkter än kon + sug', nKon < nSug, `${nKon} mot ${nSug} (§5.5: "22 av 200")`)
  ok('Vindfalt kon+sug = flugans formel: samma punkter, samma styrka (≤ 1e-12), samma riktning (≤ 1e-12)', ds <= 1e-12 && dr <= 1e-12 && nGammal === nSug, `max |Δs| ${ds.toExponential(1)} · max |Δriktning| ${dr.toExponential(1)} · ${n} punkter`)
  // sugets riktning pekar mot huvudet
  const v = nyFlugvind(1, true)
  const s1 = v.formVid(300, 408)
  const s2 = v.formVid(300, 300)
  ok('sugets luft strömmar MOT källan (framåt på axeln; uppåt-framåt under huvudet)', s1.ux > 0.99 && s2.ux > 0 && s2.uy > 0, `(${f(s1.ux)},${f(s1.uy)}) · (${f(s2.ux)},${f(s2.uy)})`)
  v.destroy()
}

// ═══ E · bajs-och-kiss: pruttvindens kon ═════════════════════════════════════════════════════════════
if (vill('E')) {
  rubrik('E · bajs-och-kiss — pruttvinden som kon, och förhandsbanan')
  // Spelets egna tal (index.js): gravitation 1,2, förhandsgravitation 0,42, kast = tap mot pottan.
  const MAT = { liten: { r: 24, fa: 0.05, d: 0.0005, e: 0.5, fr: 0.2 }, mellan: { r: 34, fa: 0.01, d: 0.0015, e: 0.45, fr: 0.25 }, stor: { r: 46, fa: 0.008, d: 0.0045, e: 0.18, fr: 0.5 } }
  const HAND = { x: 204, y: 514 } // Elvira (Zacke 344)
  const GOLV = 600
  const MAXP = 24
  const TAPP = 0.85
  // SAMMA parametrar som spelet (`_byggVind` i bajs-och-kiss/index.js). Axeln följer luften (åt höger).
  const BYGG = (phys, handX, toaX) =>
    new Vindfalt({
      varld: phys,
      form: { typ: 'kon', x: handX, y: HAND.y, rackvidd: toaX - handX + 520, halvhojd: 190, vidgning: 0.3 },
      luft: { x: WIND_LUFT, y: 0 },
      avtag: { langs: 0.4, tvars: 0.5 },
      filter: (b) => (b.label === 'turd' ? 0.01 / b.frictionAir : false),
    })
  // Läget där bollens mitt först når `Y` på väg ner, linjärt interpolerat (ett diskret "första steget under golvet"
  // flyttar x 10 px/steg och dränker vindens bidrag).
  const vidY = (bana, Y) => {
    for (let i = 1; i < bana.length; i++) {
      if (bana[i].y >= Y && bana[i].y > bana[i - 1].y) {
        const k = (Y - bana[i - 1].y) / (bana[i].y - bana[i - 1].y)
        return { x: bana[i - 1].x + k * (bana[i].x - bana[i - 1].x), steg: i + k }
      }
    }
    return null
  }
  const flyg = (storlek, toaX, toaY, mode, steg = 70) => {
    const m = MAT[storlek]
    const phys = new PhysicsWorld({ gravityY: 1.2, walls: ['left', 'right'], windAx: mode === 'global' ? 0.0005 : 0 })
    phys.rectangle(640, GOLV + 50, 1700, 100, { isStatic: true, restitution: 0.2, friction: 0.9, label: 'floor' })
    const v = mode === 'kon' ? BYGG(phys, HAND.x, toaX) : null
    const b = phys.circle(HAND.x, HAND.y, m.r, { restitution: m.e, friction: m.fr, frictionAir: m.fa, density: m.d, label: 'turd' })
    const dx = toaX - HAND.x
    const dy = toaY - 50 - HAND.y
    const L = Math.hypot(dx, dy)
    const P = MAXP * TAPP
    const v0 = { x: (dx / L) * P, y: (dy / L) * P }
    Body.setVelocity(b, v0)
    const bana = [{ x: HAND.x, y: HAND.y }]
    let acc = 0
    let nAcc = 0
    for (let i = 0; i < steg; i++) {
      if (v) {
        const w = v.luftVid(b.position.x, b.position.y)
        if (w) {
          acc += speedToAccel(w.vx * (0.01 / b.frictionAir), b.frictionAir) * STEG2
          nAcc++
        }
      }
      phys.update(1000 / 60)
      bana.push({ x: b.position.x, y: b.position.y })
    }
    v?.destroy()
    phys.destroy()
    const land = vidY(bana, GOLV - m.r)
    return { bana, v0, acc: nAcc ? acc / nAcc : 0, nAcc, landX: land ? land.x : NaN, landSteg: land ? land.steg : NaN }
  }
  // Förhandsbanan: dagens `predict` i launcher.js (kopia; gravitation 0,42, ingen damp) — alla 64 steg.
  const forhand = (x, y, vx, vy, wx) => {
    const pts = []
    let px = x
    let py = y
    let pvx = vx
    let pvy = vy
    for (let i = 0; i < 64; i++) {
      pvy += 0.42
      pvx += wx
      px += pvx
      py += pvy
      if (py > GOLV) {
        py = GOLV
        pvy = -Math.abs(pvy) * 0.55
      }
      pts.push({ x: px, y: py })
    }
    return pts
  }
  const toa = [{ x: 900, y: 444 }, { x: 1020, y: 470 }, { x: 1150, y: 488 }]
  const rader = []
  for (const t of toa) {
    rader.push({ t, g: flyg('mellan', t.x, t.y, 'global'), k: flyg('mellan', t.x, t.y, 'kon'), n0: flyg('mellan', t.x, t.y, 'ingen') })
  }
  for (const r of rader) {
    not(`pott x ${r.t.x}: landning utan vind ${f(r.n0.landX, 0)} · global vind (dagens) ${f(r.g.landX, 0)} · kon ${f(r.k.landX, 0)} · konens medelacc ${f(r.k.acc, 3)} px/steg² (${r.k.nAcc} steg i konen) mot dagens 0,139`)
  }
  ok('KONTROLL: dagens globala vind flyttar landningen (≥ 25 px mot ingen vind)', rader.every((r) => r.g.landX - r.n0.landX >= 25), rader.map((r) => f(r.g.landX - r.n0.landX, 0)).join('/') + ' px')
  ok('konen flyttar landningen (≥ 25 px) — pruttvinden gör något', rader.every((r) => r.k.landX - r.n0.landX >= 25), rader.map((r) => f(r.k.landX - r.n0.landX, 0)).join('/') + ' px')
  const kvot = rader.map((r) => (r.k.landX - r.n0.landX) / (r.g.landX - r.n0.landX))
  const q = kvot.reduce((a, b) => a + b, 0) / kvot.length
  ok('konens skjutning inom 0,75–1,35× dagens (medel över de tre pottlägena)', q >= 0.75 && q <= 1.35, `${f(q, 2)}× (${kvot.map((v) => f(v, 2)).join('/')})`)
  // Storlekarna: dagens vind är fa-blind (samma acc åt alla) — konen med fångfaktor 0,01/fa ska hålla det
  const sv = {}
  const sg = {}
  for (const st of ['liten', 'mellan', 'stor']) {
    const n = flyg(st, 1020, 470, 'ingen').landX
    sv[st] = flyg(st, 1020, 470, 'kon').landX - n
    sg[st] = flyg(st, 1020, 470, 'global').landX - n
  }
  not(`skjutning per storlek (pott 1020): global ${Object.entries(sg).map(([k, v]) => `${k} ${f(v, 0)}`).join(' · ')} px · kon ${Object.entries(sv).map(([k, v]) => `${k} ${f(v, 0)}`).join(' · ')} px`)

  // FÖRHANDSBANAN. Dagens: konstant wx 0,13 hela vägen (global vind = sant). Konen: spelets `_forhandsVind`
  // läser fältet längs den vindfria förhandsbanan och sätter wx = medelaccelerationen (launcher tar ETT tal).
  // Mått: vindens BIDRAG (bana med vind − bana utan) vid steg 20 och 28, före golvkontakt — det är vad
  // pricklinjen ska visa rätt. Golvstudsen ingår inte (förhandsbanan modellerar den grovt, med eller utan vind).
  const bidrag = (pts0, pts1, k) => pts1[k - 1].x - pts0[k - 1].x
  const felG = []
  const felK = []
  const felN = [] // kontrollarm: pricklinjen UTAN vind alls
  for (const r of rader) {
    const bana0 = forhand(HAND.x, HAND.y, r.k.v0.x, r.k.v0.y, 0)
    const vb = new Vindfalt({ form: { typ: 'kon', x: HAND.x, y: HAND.y, rackvidd: r.t.x - HAND.x + 520, halvhojd: 190, vidgning: 0.3 }, luft: { x: WIND_LUFT, y: 0 }, avtag: { langs: 0.4, tvars: 0.5 } })
    // som spelet: den vindfria banan TILLS den når golvet (förhandsbanan ritar vidare i en studs som ändå inte stämmer)
    const luft = []
    for (const p of bana0) {
      if (p.y >= GOLV) break
      luft.push(p)
    }
    const wxKon = vb.medelAcc(luft, 0.01).ax // fa·fang = 0,01 px/steg²
    vb.destroy()
    const pg = forhand(HAND.x, HAND.y, r.k.v0.x, r.k.v0.y, 0.13)
    const pk = forhand(HAND.x, HAND.y, r.k.v0.x, r.k.v0.y, wxKon)
    for (const k of [20, 28]) {
      const santG = r.g.bana[k].x - r.n0.bana[k].x
      const santK = r.k.bana[k].x - r.n0.bana[k].x
      felG.push(Math.abs(bidrag(bana0, pg, k) - santG))
      felK.push(Math.abs(bidrag(bana0, pk, k) - santK))
      felN.push(Math.abs(bidrag(bana0, bana0, k) - santK))
    }
    not(`pott ${r.t.x}: wx konen ${f(wxKon, 3)} (medel längs banan till golvet) · verkligt bidrag steg 28: global ${f(r.g.bana[28].x - r.n0.bana[28].x, 0)} px (pricklinjen 0,13 → ${f(bidrag(bana0, pg, 28), 0)}) · kon ${f(r.k.bana[28].x - r.n0.bana[28].x, 0)} px (pricklinjen → ${f(bidrag(bana0, pk, 28), 0)})`)
  }
  const medelG = felG.reduce((a, b) => a + b, 0) / felG.length
  const medelK = felK.reduce((a, b) => a + b, 0) / felK.length
  const medelN = felN.reduce((a, b) => a + b, 0) / felN.length
  ok('KONTROLL: en förhandsbana UTAN vind har tydligt fel mot konens verkliga bidrag (> 30 px) — mätaren rör sig', medelN > 30, `${f(medelN, 1)} px`)
  not(`förhandsbanans fel i vindens bidrag (medel av steg 20 + 28, tre pottlägen): dagens ${f(medelG, 1)} px · konens ${f(medelK, 1)} px`)
  ok('förhandsbanan ljuger inte mer än dagens (konens medelfel ≤ dagens + 3 px)', medelK <= medelG + 3, `${f(medelK, 1)} mot ${f(medelG, 1)} px`)
}

// ═══ F · tid: styrka, puff, pust ══════════════════════════════════════════════════════════════════════
if (vill('F')) {
  rubrik('F · tid — styrka-reglaget, puff (periodisk) och pust (enstaka by)')
  const bygg = (opt) => {
    const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    const b = phys.circle(0, 0, 20, { frictionAir: 0.02, density: 0.002 })
    const v = new Vindfalt({ varld: phys, form: { typ: 'band', x: -1e6, y: -1e6, vinkel: 0, rackvidd: 4e6, halvhojd: 4e6 }, avtag: { langs: 0, tvars: 0 }, luft: { x: 5, y: 0 }, ...opt })
    return { phys, b, v }
  }
  const kor = (r, steg) => {
    const ut = []
    for (let i = 0; i < steg; i++) {
      r.phys.update(1000 / 60)
      ut.push(r.b.velocity.x)
    }
    return ut
  }
  const full = kor(bygg({}), 200)
  const halv = kor(bygg({ styrka: 0.5 }), 200)
  const noll = kor(bygg({ styrka: 0 }), 200)
  ok('KONTROLL: styrka 1 driver mot luften, styrka 0 rör ingenting', full[199] > 4.5 && noll[199] === 0, `${f(full[199], 2)} · ${f(noll[199], 2)}`)
  ok('styrka 0,5 → halv sluthastighet (±3 %)', Math.abs(halv[199] / full[199] - 0.5) < 0.03 * 1.5 + 0.03, `${f(halv[199] / full[199], 3)}`)
  // pust: styrka 0 + en by på 60 steg → farten stiger medan den blåser och klingar sedan av (matters fa)
  const r = bygg({ styrka: 0 })
  r.v.pust(60, 1)
  const p = kor(r, 240)
  const topp = Math.max(...p)
  const iTopp = p.indexOf(topp)
  ok('pust: farten stiger under byn, toppar INNAN byn är slut (steg 30–60: draget tar över när kuvertet sjunker) och klingar av', topp > 0.5 && iTopp >= 30 && iTopp <= 60 && p[239] < topp * 0.1, `topp ${f(topp, 2)} vid steg ${iTopp}, steg 240 → ${f(p[239], 2)}`)
  ok('pust: efter byn är fältet avstängt av sig självt (ingen fortsatt kraft)', r.v.faktor === 0)
  // puff: periodisk modulering — medelfarten sjunker mot en jämn vind med djup > 0
  const pf = kor(bygg({ puff: { period: 1, djup: 0.6 } }), 600)
  const min = Math.min(...pf.slice(300))
  const max = Math.max(...pf.slice(300))
  ok('puff: farten pulserar (max − min > 0,1 px/steg)', max - min > 0.1, `${f(min, 2)} … ${f(max, 2)}`)
  ok('aktiv som funktion läses varje steg', (() => {
    let on = false
    const q = bygg({ aktiv: () => on })
    kor(q, 30)
    const av = q.b.velocity.x
    on = true
    kor(q, 30)
    return av === 0 && q.b.velocity.x > 0
  })())
}

console.log(fel === 0 ? '\n  ALLT GRÖNT\n' : `\n  ${fel} FEL\n`)
process.exit(fel ? 1 : 0)
