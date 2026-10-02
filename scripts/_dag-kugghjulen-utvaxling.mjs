// KUGGHJULEN (F10) — utväxlingen och lasten, Node-arm utan webbläsare.
//
//   node scripts/_dag-kugghjulen-utvaxling.mjs
//
// Importerar spelets EGEN kopplingsregel och maskinsteg (src/games/kugghjulen/maskin.js — samma
// kod som `_rebuildMesh` och `_stegMaskin` kör) och frågar:
//
//   A. UTVÄXLINGEN: stegar man veven 10 varv och för rotationen vidare hjul för hjul på ytfart
//      (ω_b = ∓ω_a · r_a/r_b, summerad per steg i flyttal), hamnar målhjulet då inom 1 % av
//      det `beraknaFaktorer` säger? Kontrollarm: en avsiktligt FEL radie (3 %) ska ge > 1 %.
//   B. LASTEN: reflekteras den som J·f² och b·f² (energi- och effektbalans)? Är ett litet hjul
//      sist tyngre än ett stort?
//   C. STEGET: gör `stegaMaskin` utan last EXAKT det gamla inbyggda steget (inget har ändrats för
//      en tom vev eller ett bygge utan karusell)? Och med last: går maskinen långsammare igång
//      och rullar kortare, men når den ALLTID flaggan, hur tung den än är (P0 motgång: sakta
//      ner, aldrig stoppa)?
import { byggKoppling, beraknaFaktorer, reflekteradLast, stegaMaskin, lindra, LASTER, LAST_TAK,
  VEV_SNABB, VEV_MOMENT, VEV_MAXGAP, VEV_FRIKTION, VEV_MAXFART } from '../src/games/kugghjulen/maskin.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n3 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(3) : String(v))

const R0 = 66
const RT = 66
const MESH_TOL = 14
const SIZ = { S: 50, M: 66, L: 84 }

// Samma fasta nivåer som `_pattern` (nivå 1–4 och 6 är rena kuggkedjor).
const NIVAER = {
  1: ['M'], 2: ['M', 'L'], 3: ['L', 'M', 'L'], 4: ['M', 'L', 'S', 'M'], 6: ['M', 'L', 'M', 'L', 'M'],
}

// Lägg ut en kedja med EXAKT mesh-avstånd, i en böjd bana (så geometrin inte råkar vara en rak linje).
function kedja(storlekar, vinkelSteg = 0.18) {
  const noder = [{ x: 230, y: 360, r: R0 }]
  let ang = 0
  for (const s of [...storlekar, 'T']) {
    const r = s === 'T' ? RT : SIZ[s]
    const f = noder[noder.length - 1]
    const d = f.r + r
    noder.push({ x: f.x + d * Math.cos(ang), y: f.y + d * Math.sin(ang), r })
    ang += vinkelSteg
  }
  return noder
}

// Fristående ytfarts-integrator: veven vrids i små steg; varje hjul får sin vinkel från FÖRÄLDERNS
// rotation via ytfarten (båglängd r_a·dθ_a = r_b·dθ_b, med länkens tecken). `radie` = de radier
// integratorn tror på (kan ändras för kontrollarmen).
function stegaVarv(noder, adj, varv, radie, stegPerVarv = 720) {
  const n = noder.length
  // trädet: förälder + länktecken, samma BFS-ordning som spelets
  const par = new Array(n).fill(-1)
  const tecken = new Array(n).fill(0)
  const sedd = new Array(n).fill(false)
  sedd[0] = true
  const ordning = [0]
  for (let k = 0; k < ordning.length; k++) {
    const u = ordning[k]
    for (const e of adj[u]) {
      if (!sedd[e.to]) { sedd[e.to] = true; par[e.to] = u; tecken[e.to] = e.tecken; ordning.push(e.to) }
    }
  }
  const ang = new Array(n).fill(0)
  const dTh = (2 * Math.PI) / stegPerVarv
  for (let s = 0; s < varv * stegPerVarv; s++) {
    ang[0] += dTh
    // föräldern först (ordning är BFS) — ytfart: dθ_b = tecken · (r_a / r_b) · dθ_a
    let dA = new Array(n).fill(0)
    dA[0] = dTh
    for (let k = 1; k < ordning.length; k++) {
      const v = ordning[k]
      const u = par[v]
      dA[v] = tecken[v] * (radie[u] / radie[v]) * dA[u]
      ang[v] += dA[v]
    }
  }
  return ang
}

console.log('\nKUGGHJULEN — utväxling, last och maskinsteg (Node)\n')

// ---- A. Utväxling ------------------------------------------------------------
console.log('A. Utväxlingen över 10 varv')
let sämstFel = 0
for (const [niv, st] of Object.entries(NIVAER)) {
  const noder = kedja(st)
  const adj = byggKoppling(noder, MESH_TOL)
  const { depth, factor } = beraknaFaktorer(noder, adj)
  const sista = noder.length - 1
  const allaDrivna = depth.every((d) => d >= 0)
  const ang = stegaVarv(noder, adj, 10, noder.map((x) => x.r))
  const forvantat = 10 * 2 * Math.PI * factor[sista]
  const relFel = Math.abs(ang[sista] - forvantat) / Math.abs(forvantat)
  sämstFel = Math.max(sämstFel, relFel)
  // teleskopet: faktorn är ±R0/RT och paritet = antal länkar
  const tecknet = (noder.length - 1) % 2 === 0 ? 1 : -1
  ok(`nivå ${niv} (${st.join('')}): kedjan greppar och målhjulet går ${n3(factor[sista])}×`,
    allaDrivna && Math.abs(Math.abs(factor[sista]) - R0 / RT) < 1e-12 && Math.sign(factor[sista]) === tecknet,
    `fel över 10 varv ${(relFel * 100).toExponential(1)} %`)
  ok(`nivå ${niv}: inom 1 % över 10 varv`, relFel < 0.01)
}
// Kontrollarm 1: målhjulets radie 3 % fel i integratorn → > 1 %.
{
  const noder = kedja(NIVAER[6])
  const adj = byggKoppling(noder, MESH_TOL)
  const { factor } = beraknaFaktorer(noder, adj)
  const sista = noder.length - 1
  const fel_r = noder.map((x) => x.r)
  fel_r[sista] *= 1.03
  const ang = stegaVarv(noder, adj, 10, fel_r)
  const rel = Math.abs(ang[sista] - 10 * 2 * Math.PI * factor[sista]) / Math.abs(10 * 2 * Math.PI * factor[sista])
  ok('KONTROLLARM: 3 % fel på målhjulets radie syns som > 1 % fel', rel > 0.01, `${(rel * 100).toFixed(2)} %`)
}
// Kontrollarm 2: ett hjul där integratorn läser olika radie in och ut (ett klassiskt mätfel) → > 1 %.
{
  const noder = kedja(NIVAER[4])
  const adj = byggKoppling(noder, MESH_TOL)
  const { factor } = beraknaFaktorer(noder, adj)
  const sista = noder.length - 1
  // Fel-regel: dubbelräkna ett hjuls radie (r_u/r_v med v:s radie 5 % fel i FÖRE-leden men rätt i nästa)
  const ang = stegaVarv(noder, adj, 10, noder.map((x, i) => (i === 2 ? x.r * 1.05 : x.r)))
  // Mellanhjul kan ha FEL radie och ändå ge rätt mål (teleskopet) — så kontrollen här är att
  // den STEGADE faktorn hos själva mellanhjulet avviker, inte målet.
  const relMellan = Math.abs(ang[2] - 10 * 2 * Math.PI * factor[2]) / Math.abs(10 * 2 * Math.PI * factor[2])
  ok('KONTROLLARM: 5 % fel radie på ett mellanhjul syns på HJULET', relMellan > 0.01, `${(relMellan * 100).toFixed(2)} % på hjulet`)
  const relMal = Math.abs(ang[sista] - 10 * 2 * Math.PI * factor[sista]) / Math.abs(10 * 2 * Math.PI * factor[sista])
  ok('...men målet står kvar (utväxlingen teleskoperar bort mellanhjulen)', relMal < 0.01, `${(relMal * 100).toExponential(1)} % på målet`)
}
// Rem: en rak rem behåller riktningen, en korsad vänder — samma regel som spelets.
{
  const noder = [
    { x: 0, y: 0, r: 66 }, { x: 300, y: 0, r: 50 }, { x: 600, y: 0, r: 84 },
  ]
  const rakt = beraknaFaktorer(noder, byggKoppling(noder, MESH_TOL, [{ i: 0, j: 1, tecken: 1 }, { i: 1, j: 2, tecken: 1 }]))
  const korsat = beraknaFaktorer(noder, byggKoppling(noder, MESH_TOL, [{ i: 0, j: 1, tecken: 1 }, { i: 1, j: 2, tecken: -1 }]))
  ok('rak rem: samma håll, ω_b = ω_a · r_a/r_b', Math.abs(rakt.factor[1] - 66 / 50) < 1e-12 && rakt.factor[2] > 0, n3(rakt.factor[2]))
  ok('korsad rem: motsatt håll, samma storlek', Math.abs(korsat.factor[2] + rakt.factor[2]) < 1e-12, n3(korsat.factor[2]))
}
console.log(`   sämsta fel över 10 varv: ${(sämstFel * 100).toExponential(1)} %\n`)

// ---- B. Lasten ---------------------------------------------------------------
console.log('B. Lasten reflekteras genom utväxlingen')
{
  const f = 1.32 // ett litet (r 50) grenhjul
  const l = reflekteradLast([{ typ: 'flakt', f }])
  ok('tröghet J·f² (energin ½Jω² lika på båda sidor)', Math.abs(l.J - LASTER.flakt.J * f * f) < 1e-12, n3(l.J))
  // energi: ½·J_t·ω_t² på målsidan = ½·J_refl·ω_c² på vevsidan
  const wc = 0.2
  ok('energibalans', Math.abs(0.5 * LASTER.flakt.J * (f * wc) ** 2 - 0.5 * l.J * wc ** 2) < 1e-12)
  // effekt: dämpningens förlust b·ω_t² = b_refl·ω_c²
  ok('effektbalans (dämpning)', Math.abs(LASTER.flakt.b * (f * wc) ** 2 - l.b * wc ** 2) < 1e-12, n3(l.b))
  const litet = reflekteradLast([{ typ: 'flakt', f: R0 / 50 }])
  const stort = reflekteradLast([{ typ: 'flakt', f: R0 / 84 }])
  ok('ett LITET hjul sist är tyngre att veva än ett STORT', litet.J > stort.J * 2 && litet.b > stort.b * 2,
    `J ${n3(litet.J)} mot ${n3(stort.J)} (kvot ${(litet.J / stort.J).toFixed(2)}×, = (84/50)²)`)
  ok('ingen last = noll', reflekteradLast([]).J === 0 && reflekteradLast([]).b === 0)
  ok('okänd last eller NaN ignoreras', reflekteradLast([{ typ: 'okand', f: 1 }, { typ: 'flakt', f: NaN }]).J === 0)
}
console.log()

// ---- C. Steget ---------------------------------------------------------------
console.log('C. Maskinsteget')

// Det GAMLA inbyggda steget (kopierat ur kugghjulen/index.js före F10) — referens för "inget ändrat".
function gammalt(s, J, dt = 1) {
  if (s._cranking) {
    const gap = lindra(s._fingerAngle - s._crankAngle)
    const malVel = s._fingerVel + gap * VEV_SNABB
    const maxAndring = (VEV_MOMENT / J) * dt
    s._crankVel += Math.max(-maxAndring, Math.min(maxAndring, malVel - s._crankVel))
    if (Math.abs(gap) > VEV_MAXGAP) s._crankAngle += (Math.abs(gap) - VEV_MAXGAP) * Math.sign(gap)
  } else {
    s._crankVel *= Math.pow(VEV_FRIKTION, dt / J)
    if (Math.abs(s._crankVel) < 0.0008) s._crankVel = 0
  }
  s._crankVel = Math.max(-VEV_MAXFART, Math.min(VEV_MAXFART, s._crankVel))
  s._crankAngle += s._crankVel * dt
}

const ny = () => ({ _cranking: false, _fingerAngle: 0, _fingerVel: 0, _crankAngle: 0, _crankVel: 0 })

// Skriptad körning: dra 0,18 rad/steg i 90 steg (med den jämning spelet gör), släpp, rulla 300 steg.
function kor(steg, J, last, { fart = 0.18, dra = 90, rulla = 400 } = {}) {
  const s = ny()
  s._cranking = true
  const farter = []
  const gap = []
  for (let i = 0; i < dra; i++) {
    s._fingerAngle += fart
    s._fingerVel = s._fingerVel * 0.6 + fart * 0.4
    steg(s, J, last)
    farter.push(s._crankVel)
    if (i >= dra / 2) gap.push(Math.abs(s._fingerAngle - s._crankAngle))
  }
  const topp = Math.max(...farter.map(Math.abs))
  const t90 = farter.findIndex((v) => Math.abs(v) >= topp * 0.9)
  const a0 = s._crankAngle
  s._cranking = false
  let rutor = 0
  while (s._crankVel !== 0 && rutor < rulla) { steg(s, J, last); rutor++ }
  gap.sort((a, b) => a - b)
  return { topp, t90, utrullning: Math.abs(s._crankAngle - a0), rutor, medianGap: gap[Math.floor(gap.length / 2)], s }
}

{
  // Jämförelsen mot det gamla: samma bygge utan last → bit för bit samma tal.
  let maxAvv = 0
  for (const J of [1, 2.2, 3.7, 5.77, 6.32, 9]) {
    const a = ny(); const b = ny()
    a._cranking = b._cranking = true
    for (let i = 0; i < 300; i++) {
      if (i === 120) a._cranking = b._cranking = false
      if (i === 200) a._cranking = b._cranking = true
      const df = i < 120 ? 0.18 : i < 200 ? 0 : -0.1
      a._fingerAngle += df; b._fingerAngle += df
      a._fingerVel = b._fingerVel = a._fingerVel * 0.6 + df * 0.4
      gammalt(a, J)
      stegaMaskin(b, J, { J: 0, b: 0 })
      maxAvv = Math.max(maxAvv, Math.abs(a._crankAngle - b._crankAngle), Math.abs(a._crankVel - b._crankVel))
    }
  }
  ok('utan last är steget IDENTISKT med det gamla (tom vev, 2–9 i tröghet)', maxAvv === 0, `största avvikelse ${maxAvv}`)
}

// Ett realistiskt nivå-8-bygge: M L M + gren S (på L), karusell + fläkt.
const bygget = 1 + 1 + (84 / 66) ** 2 + 1 + (50 / 66) ** 2 // vev + M + L + M + grenens S
const fLitet = (66 / 84) * (84 / 50) // grenhjulet S på L: |f| = 66/50
const lastN8 = reflekteradLast([{ typ: 'karusell', f: 1 }, { typ: 'flakt', f: fLitet }])
const utanLast = kor(stegaMaskin, bygget, { J: 0, b: 0 })
const medLast = kor(stegaMaskin, bygget + lastN8.J, lastN8)
console.log(`   nivå 8-bygge: tröghet ${n3(bygget)} + last ${n3(lastN8.J)} (dämpning ${n3(lastN8.b)})`)
console.log(`   utan last: 90 % efter ${utanLast.t90} steg · toppfart ${n3(utanLast.topp)} · utrullning ${n3(utanLast.utrullning)} rad · median-glapp ${(utanLast.medianGap * 57.3).toFixed(0)}°`)
console.log(`   med last : 90 % efter ${medLast.t90} steg · toppfart ${n3(medLast.topp)} · utrullning ${n3(medLast.utrullning)} rad · median-glapp ${(medLast.medianGap * 57.3).toFixed(0)}°`)
ok('lasten syns: maskinen tar längre tid att få igång', medLast.t90 > utanLast.t90, `${medLast.t90} mot ${utanLast.t90} steg`)
ok('lasten syns: svänghjulet rullar KORTARE ut', medLast.utrullning < utanLast.utrullning * 0.95,
  `${n3(medLast.utrullning)} mot ${n3(utanLast.utrullning)} rad`)
ok('lasten är mjuk: toppfarten når ändå fingrets', medLast.topp > 0.18 * 0.85, `${n3(medLast.topp)} rad/steg (finger 0,180)`)
ok('handtaget ligger inte kvar efter fingret med last (median ≤ 17°)', medLast.medianGap <= VEV_MAXGAP, `${(medLast.medianGap * 57.3).toFixed(0)}°`)

// Litet hjul sist (fläkt på S) vs stort (fläkt på L): samma bygge i övrigt.
{
  const lS = reflekteradLast([{ typ: 'karusell', f: 1 }, { typ: 'flakt', f: 66 / 50 }])
  const lL = reflekteradLast([{ typ: 'karusell', f: 1 }, { typ: 'flakt', f: 66 / 84 }])
  const s = kor(stegaMaskin, 5 + lS.J, lS)
  const l = kor(stegaMaskin, 5 + lL.J, lL)
  ok('fläkt på ett litet hjul är tyngre att få igång än på ett stort', s.t90 >= l.t90 && s.utrullning < l.utrullning,
    `litet: ${s.t90} steg / ${n3(s.utrullning)} rad · stort: ${l.t90} steg / ${n3(l.utrullning)} rad`)
}

// P0 MOTGÅNG: lasten får sakta ner, aldrig stoppa. Svep tröghet och dämpning långt över vad spelet har.
{
  let sämstT90 = 0
  let sämstTopp = 1
  let bromsOverTak = 0
  for (let J = 1; J <= 12; J += 1.5) {
    for (const b of [0, 0.4, 1, 2, 4, 8]) {
      const r = kor(stegaMaskin, J, { J: 0, b }, { dra: 300 })
      sämstT90 = Math.max(sämstT90, r.t90)
      sämstTopp = Math.min(sämstTopp, r.topp)
      // bromsen får aldrig ta mer än LAST_TAK av kopplingens moment
      const s = ny(); s._cranking = true; s._crankVel = 0.2; s._fingerAngle = 0.2; s._fingerVel = 0.2
      const v0 = s._crankVel
      stegaMaskin(s, J, { J: 0, b })
      const cap = VEV_MOMENT / J
      const forlust = v0 - s._crankVel
      // fingret står på sin fart → kopplingen vill hålla 0,2; allt farten tappar är bromsen
      if (forlust > LAST_TAK * cap + 1e-12) bromsOverTak++
    }
  }
  ok('P0: bromsen tar aldrig mer än LAST_TAK av kopplingens moment (tröghet 1–12, b 0–8)', bromsOverTak === 0, `${bromsOverTak} brott`)
  ok('P0: veven når alltid fingrets fart (tröghet 12, dämpning 8)', sämstTopp > 0.18 * 0.85, `lägsta toppfart ${n3(sämstTopp)} av 0,180`)
  console.log(`   (sämsta uppstart i svepet: ${sämstT90} steg till 90 %)`)
}

// Flaggan: |Δ målvinkel| = 6π måste hissas även med den tyngsta tänkbara lasten (nivå 8 + dubbel last).
{
  const FULL = Math.PI * 6
  const tung = { J: lastN8.J * 3, b: lastN8.b * 3 }
  for (const [namn, J, last] of [['tom vev', 1, { J: 0, b: 0 }], ['nivå 8 + last', bygget + lastN8.J, lastN8], ['3× lasten', bygget + tung.J, tung]]) {
    const s = ny(); s._cranking = true
    let prog = 0; let prev = 0; let steg = 0
    while (prog < FULL && steg < 3000) {
      s._fingerAngle += 0.18
      s._fingerVel = s._fingerVel * 0.6 + 0.18 * 0.4
      stegaMaskin(s, J, last)
      prog += Math.abs(s._crankAngle * 1 - prev) // målfaktor ±1
      prev = s._crankAngle
      steg++
    }
    ok(`flaggan hissas hela vägen (${namn})`, prog >= FULL, `${steg} steg (${(steg / 60).toFixed(1)} s) vid fingerfart 0,18`)
  }
}

// Tak på fart även med last.
{
  const s = ny(); s._cranking = true
  for (let i = 0; i < 200; i++) { s._fingerAngle += 40; s._fingerVel = 40; stegaMaskin(s, 2, { J: 0.4, b: 0.4 }) }
  ok('fartens tak håller med last vid ett orimligt ryck', Math.abs(s._crankVel) <= VEV_MAXFART + 1e-12, n3(s._crankVel))
}

console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
process.exit(fel === 0 ? 0 : 1)
