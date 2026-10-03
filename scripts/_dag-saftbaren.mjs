// Dag D16 B1 · saftbaren — isbitar som flyter på saften (FYSIKPLAN F6a, kund 1).
//
//   node scripts/_dag-saftbaren.mjs            (Node, ingen webbläsare, ingen dev-server)
//
// Kör spelets EGEN isfysik (`src/games/saftbaren/is.js`) mot spelets egna glas/vätskeparametrar
// och spelets egna metoder (`_buildGlasses`, `_carryAll`, `_syncGlass`, `_stats` anropas på en
// attrapp av spelet — de läser bara `_world`/`_glasses`). Varje mätning har en KONTROLLRAD.
import { Container } from 'pixi.js'
import { FluidWorld } from '../src/lib/vatska.js'
import { Isvarld, ISBIT_HALV } from '../src/games/saftbaren/is.js'
import spel from '../src/games/saftbaren/index.js'

const FIXED = 1000 / 60
let fel = 0
const ok = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}
const f1 = (x) => x.toFixed(1)
const f2 = (x) => x.toFixed(2)

const IN_W = 114, IN_TOP = -220, IN_BOT = -22, GRATE_Y = 620
const GEOM = { halvBredd: IN_W / 2, topp: IN_TOP, botten: IN_BOT }

// ---- en attrapp av spelet: samma värld, samma glas, samma ägarlogik ----------------------------
function bygg({ medIs = true } = {}) {
  const S = Object.create(spel)
  S._world = new FluidWorld({
    max: 620, radius: 26, gravityY: 0.52, rho0: 5, k: 0.5, kNear: 3, sigma: 0.06, beta: 0.12,
    restitution: 0.06, wallFriction: 0.35,
    walls: { left: false, right: false, bottom: false, top: false },
    bounds: { left: -200, right: 1480, top: -400, bottom: 840 },
  })
  S._world.setChannels(3, 0.09)
  S._backL = new Container()
  S._frontL = new Container()
  S._bubbelL = new Container()
  S._buildGlasses()
  S.ram = (dtMS = FIXED) => {
    for (const g of S._glasses) {
      const diff = g.wantAngle - g.angle
      if (Math.abs(diff) > 0.001) g.angle += diff * 0.05
    }
    S._carryAll()
    for (const g of S._glasses) S._syncGlass(g)
    S._is?.steg(dtMS)
    S._world.update(dtMS)
  }
  S.kor = (ms) => { for (let t = 0; t < ms; t += FIXED) S.ram() }
  S.fyll = (gi, rader, pal = 0) => {
    const g = S._glasses[gi]
    for (let r = 0; r < rader; r++)
      for (let c = 0; c < 8; c++)
        S._world.spawn(g.x - 49 + c * 14 + (((r * 8 + c) * 7919) % 100 / 100 - 0.5) * 4, g.y - 36 - r * 15, { pal, ch: [pal === 0 ? 1 : 0, pal === 1 ? 1 : 0, pal === 2 ? 1 : 0] })
  }
  if (medIs) {
    S._isLogg = { land: 0, klink: 0, plums: 0, smalt: 0 }
    S._is = new Isvarld({
      glas: () => S._glasses, varld: S._world, geom: GEOM,
      krok: {
        paLand: () => S._isLogg.land++, paKlink: () => S._isLogg.klink++,
        paPlums: () => S._isLogg.plums++, paSmalt: () => S._isLogg.smalt++,
      },
    })
  }
  return S
}

const mal = (S, gi) => S._stats(S._glasses[gi])

const BARA = process.argv.includes('--bara') ? process.argv[process.argv.indexOf('--bara') + 1] : null
const kor = (b) => !BARA || BARA === b
const GLASS_X = [390, 570, 750, 930]
const TILT = 2.2, OFFS = 100
const FRAN = { x: 1234, y: 528 } // isbytta
const ext0 = ISBIT_HALV
const glid = (S, g, x, y, ram) => {
  const x0 = g.x, y0 = g.y
  for (let i = 1; i <= ram; i++) {
    g.x = x0 + ((x - x0) * i) / ram
    g.y = y0 + ((y - y0) * i) / ram
    S.ram()
  }
}
const iGlaset = (k) => Math.abs(k.lx) <= IN_W / 2 + 0.01 && k.ly <= IN_BOT + 0.01 && k.ly >= IN_TOP - 14 - 0.01
const nVarld = (S) => S._world.count
const nGlas = (S, gi) => mal(S, gi).n


// ============================================================ A · STÖT → RÖRELSE → VILA
if (kor('A')) {
  console.log('\nA · STÖT → RÖRELSE → VILA — isbiten flyter, guppar av en stöt och kommer till ro\n')
  const S = bygg()
  S.fyll(1, 10)
  S.kor(2500)
  const g = S._glasses[1]
  const k = S._is.slapp(g, FRAN)
  let flugit = 0
  while (k.flyg && flugit < 200) { S.ram(); flugit++ }
  ok('flygningen tar 0,4–1,0 s', flugit * FIXED >= 400 && flugit * FIXED <= 1000, `${flugit} steg = ${f2(flugit * FIXED / 1000)} s`)
  let tVila = null
  for (let t = 0; t < 600 && tVila === null; t++) { S.ram(); if (k.vilar) tVila = t }
  ok('kommer till ro inom 3 s efter landningen', tVila !== null && tVila * FIXED < 3000, tVila === null ? 'aldrig' : `${f2(tVila * FIXED / 1000)} s`)
  const ext = ext0 * (1 + Math.abs(Math.sin(k.rot)) * 0.4)
  const fran = (IN_BOT - ext) - k.ly
  ok('FLYTER: nedsänkt 50–80 % och inte på botten', k.s > 0.5 && k.s < 0.8 && fran > 6, `s=${f2(k.s)} · ${f1(fran)} px över botten · centrum ${f1(k.wy - g._isNiva)} px under ytan`)
  ok('isbiten ligger i glaset', iGlaset(k), `lx=${f1(k.lx)} ly=${f1(k.ly)}`)
  const c = S._world.colliders.find((q) => q.type === 'circle' && Math.abs(q.x - k.wx) < 0.5 && Math.abs(q.y - k.wy) < 0.5)
  ok('kolliderarens läge = isbitens', !!c && true, c ? `Δ ${f2(Math.hypot(c.x - k.wx, c.y - k.wy))} px` : 'ingen kolliderare')
  ok('kolliderarens storlek ≈ ritad kloss (cirkel ⌀ ±6 px)', !!c && c.type === 'circle' && Math.abs(c.r * 2 - ISBIT_HALV * 2) <= 6, c ? `⌀ ${c.r * 2} mot ${ISBIT_HALV * 2}` : '')
  const y0 = k.ly
  S._is.knuffa(g, 1.1)
  let maxAv = 0, ro = null
  for (let t = 0; t < 600; t++) { S.ram(); maxAv = Math.max(maxAv, Math.abs(k.ly - y0)); if (k.vilar && ro === null) ro = t }
  ok('STÖT → RÖRELSE: tryck på glaset flyttar isen ≥ 3 px', maxAv >= 3, `${f1(maxAv)} px`)
  ok('… → VILA: tillbaka i ro inom 4 s, nära samma nivå (±6 px)', ro !== null && ro * FIXED < 4000 && Math.abs(k.ly - y0) < 6, ro === null ? 'aldrig' : `${f2(ro * FIXED / 1000)} s, Δ ${f1(k.ly - y0)} px`)
  // kontroll 1: utan stöt står den still
  const S2 = bygg(); S2.fyll(1, 6); S2.kor(2500)
  const k2 = S2._is.slapp(S2._glasses[1], FRAN)
  for (let t = 0; t < 300; t++) S2.ram()
  const y2 = k2.ly
  let rorelse = 0
  for (let t = 0; t < 120; t++) { S2.ram(); rorelse = Math.max(rorelse, Math.abs(k2.ly - y2)) }
  ok('KONTROLL utan stöt: ingen rörelse (< 0,3 px på 2 s)', rorelse < 0.3, `${f2(rorelse)} px`)
  // kontroll 2: tomt glas → isen ligger på botten
  const S3 = bygg()
  const k3 = S3._is.slapp(S3._glasses[1], FRAN)
  for (let t = 0; t < 400; t++) S3.ram()
  const ext3 = ext0 * (1 + Math.abs(Math.sin(k3.rot)) * 0.4)
  ok('KONTROLL tomt glas: isen vilar på botten', k3.vilar && Math.abs(k3.ly - (IN_BOT - ext3)) < 1.5, `ly=${f1(k3.ly)} botten=${f1(IN_BOT - ext3)}`)
  // kontroll 3: ingen yta att flyta på → sjunker (visar att det är SAFTEN som bär)
  const S4 = bygg(); S4.fyll(1, 6); S4.kor(2500)
  const k4 = S4._is.slapp(S4._glasses[1], FRAN)
  S4._is._niva = () => Infinity
  for (let t = 0; t < 400; t++) S4.ram()
  ok('KONTROLL utan yta: sjunker till botten (djupare än flytläget)', k4.ly > k.ly + 5, `ly=${f1(k4.ly)} mot ${f1(k.ly)}`)
}

// ============================================================ B · SAFTVOLYMEN
if (kor('B')) {
  console.log('\nB · SAFTENS VOLYM — isbitar trycker undan saft men stjäl och tränger aldrig ut något\n')
  for (const rader of [3, 6, 9, 13, 15]) {
    const S = bygg()
    S.fyll(1, rader)
    S.kor(2500)
    const g = S._glasses[1]
    const n0 = nGlas(S, 1), tot0 = nVarld(S), yta0 = mal(S, 1).yta
    let minN = n0
    for (let i = 0; i < 4; i++) {
      S._is.slapp(g, FRAN)
      if (i === 2) S._is.slapp(g, FRAN) // två på en gång
      for (let t = 0; t < 70; t++) { S.ram(); minN = Math.min(minN, nGlas(S, 1)) }
    }
    for (let t = 0; t < 360; t++) { S.ram(); minN = Math.min(minN, nGlas(S, 1)) }
    const n1 = nGlas(S, 1), tot1 = nVarld(S), yta1 = mal(S, 1).yta
    let utanfor = 0
    const w = S._world
    for (let i = 0; i < w.count; i++) {
      const lx = w.x[i] - g.x, ly = w.y[i] - g.y
      if (!(Math.abs(lx) < IN_W / 2 + 20 && ly < 4 && ly > IN_TOP - 60)) utanfor++
    }
    const isar = S._is.antalI(g)
    ok(`${String(rader).padStart(2)} rader (n=${n0}): glasets saft oförändrad, 0 ute ur glaset`, n1 === n0 && utanfor === 0 && tot1 === tot0, `n ${n0}→${n1} · lägst ${minN} · världen ${tot0}→${tot1} · utanför ${utanfor} · is ${isar} · ytan ${f1(yta0)}→${f1(yta1)}`)
  }
  const A = bygg(), B = bygg({ medIs: false })
  A.fyll(1, 13); B.fyll(1, 13)
  A.kor(2500); B.kor(2500)
  for (let i = 0; i < 3; i++) { A._is.slapp(A._glasses[1], FRAN); A.kor(1200) }
  B.kor(3600)
  const stig = mal(B, 1).yta - mal(A, 1).yta
  ok('KONTROLL: isen trycker undan saft (ytan stiger ≥ 3 px mot utan is; djupt glas)', stig >= 3, `utan is ${f1(mal(B, 1).yta)} · med 3 isbitar ${f1(mal(A, 1).yta)} → +${f1(stig)} px`)
  const A2 = bygg(); A2.fyll(1, 9); A2.fyll(2, 9); A2.kor(2500)
  const grann0 = nGlas(A2, 2)
  A2._is.slapp(A2._glasses[1], FRAN); A2._is.slapp(A2._glasses[1], FRAN); A2.kor(3000)
  ok('granneglas får inget av isbitarna', nGlas(A2, 2) === grann0, `${grann0}→${nGlas(A2, 2)}`)
}

// ============================================================ C · BÄRS MED GLASET
if (kor('C')) {
  console.log('\nC · GLASET DRAS — isen stannar i glaset, saften likaså\n')
  const S = bygg()
  S.fyll(0, 8); S.fyll(2, 8, 2)
  S.kor(2500)
  const g = S._glasses[0]
  for (let i = 0; i < 3; i++) { S._is.slapp(g, FRAN); S.kor(900) }
  const n0 = nGlas(S, 0), g2 = nGlas(S, 2)
  let ute = 0, maxAbs = 0
  const kolla = () => { for (const k of S._is.kuber) { if (!iGlaset(k)) ute++; maxAbs = Math.max(maxAbs, Math.hypot(k.wx - g.x, k.wy - g.y)) } }
  glid(S, g, g.x, 380, 8); kolla()
  for (let i = 0; i < 40; i++) { g.x += 22; S.ram(); kolla() }
  for (let i = 0; i < 40; i++) { g.x -= 22; S.ram(); kolla() }
  glid(S, g, 390, 620, 12)
  for (let q = 0; q < 8; q++) { S.kor(1000); console.log('     t+' + (q + 1) + 's ' + S._is.kuber.map((k) => `${f1(k.ly)} v${f2(Math.hypot(k.vx, k.vy))}`).join(' | ')) }
  ok('alla isbitar i glaset under hela draget (22 px/bildruta förbi glas 2)', ute === 0, `${ute} observationer utanför · störst avstånd från glasets fot ${f1(maxAbs)} px`)
  ok('glasets saft oförändrad efter draget', nGlas(S, 0) === n0, `${n0}→${nGlas(S, 0)}`)
  ok('granneglaset (2) har kvar sin saft', nGlas(S, 2) === g2, `${g2}→${nGlas(S, 2)}`)
  console.log('     ' + S._is.kuber.map((k) => `(${f1(k.lx)},${f1(k.ly)}) v(${f2(k.vx)},${f2(k.vy)}) s${f2(k.s)} vilar ${k.vilar}`).join(' | '))
  const p0 = S._is.kuber.map((k) => [k.lx, k.ly])
  S.kor(1000)
  const rors = Math.max(...S._is.kuber.map((k, i) => Math.hypot(k.lx - p0[i][0], k.ly - p0[i][1])))
  ok('allt är i ro igen 11 s efter slängen (≤ 0,5 px på sista sekunden)', rors <= 0.5, `${f2(rors)} px`)
  const T = bygg(); T.fyll(0, 8); T.kor(2500)
  const kg = T._glasses[0]; T._is.slapp(kg, FRAN); T.kor(1500)
  const kk = T._is.kuber[0]
  const lx0 = kk.lx
  for (let i = 0; i < 6; i++) { kg.x += 18; T.ram() }
  let sl = 0
  for (let i = 0; i < 30; i++) { T.ram(); sl = Math.max(sl, Math.abs(kk.lx - lx0)) }
  ok('KONTROLL tröghet: ett ryck får isen att hasa i glaset (≥ 3 px)', sl >= 3, `${f1(sl)} px`)
}

// ============================================================ D · HÄLLNING
if (kor('D')) {
  console.log('\nD · HÄLLNING — glas med is hälls i ett annat (tryck-tryck-vägen): isen stannar, saften går över\n')
  const kor = (medIs) => {
    const S = bygg({ medIs })
    S.fyll(1, 13); S.fyll(2, 2, 2)
    S.kor(2500)
    const g = S._glasses[1]
    if (medIs) for (let i = 0; i < 3; i++) { S._is.slapp(g, FRAN); S.kor(800) }
    const n2 = nGlas(S, 2)
    glid(S, g, g.x, 380, 14)
    glid(S, g, 750 - OFFS, 620 - 232, 32)
    g.wantAngle = TILT
    let ute = 0
    for (let t = 0; t < 90; t++) S.ram()
    for (let t = 0; t < 90; t++) { S.ram(); if (medIs) for (const k of S._is.kuber) if (!iGlaset(k)) ute++ }
    g.wantAngle = 0
    for (let t = 0; t < 60; t++) { S.ram(); if (medIs) for (const k of S._is.kuber) if (!iGlaset(k)) ute++ }
    glid(S, g, GLASS_X[1], 380, 14); glid(S, g, GLASS_X[1], 620, 10)
    S.kor(3500)
    return { S, ute, n2, n2e: nGlas(S, 2), tote: nVarld(S) }
  }
  const med = kor(true), utan = kor(false)
  const motagit = med.n2e - med.n2, motagitU = utan.n2e - utan.n2
  console.log(`     utan is: målglaset ${utan.n2}→${utan.n2e} (+${motagitU}) · med is: ${med.n2}→${med.n2e} (+${motagit})`)
  ok('isbitarna stannar i glaset hela hällningen', med.ute === 0, `${med.ute} observationer utanför`)
  ok('hällningen över är lika stor med is som utan (±12 %)', motagit > 20 && Math.abs(motagit - motagitU) <= 0.12 * motagitU, `${motagit} mot ${motagitU}`)
  ok('is i glaset efteråt: alla 3 kvar', med.S._is.antalI(med.S._glasses[1]) === 3)
}

// ============================================================ E · TAK + LIVSCYKEL
if (kor('E')) {
  console.log('\nE · TAK OCH LIVSCYKEL\n')
  const S = bygg()
  S.fyll(1, 11); S.kor(1500)
  const g = S._glasses[1]
  const vaggar = S._world.colliders.length
  for (let i = 0; i < 7; i++) { S._is.slapp(g, FRAN); S.kor(120) }
  S.kor(1500)
  ok('högst 3 isbitar i ett glas (fler smälter den äldsta)', S._is.antalI(g) === 3 && S._is.kuber.length === 3, `${S._is.antalI(g)} kvar · ${S._isLogg.smalt} smälte`)
  const medKoll = S._is.kuber.filter((k) => k.post.coll).length
  ok('kolliderare = glasväggar + isbitar som tränger undan saft', S._world.colliders.length === vaggar + medKoll && medKoll >= 1, `${S._world.colliders.length} = ${vaggar} väggar + ${medKoll} (av 3 isbitar; de som ligger mot glaset har ingen)`)
  const flyger = S._is.slapp(g, FRAN)
  S.ram()
  ok('en isbit i flykt har ingen kolliderare', !flyger.flyg || !flyger.post.coll, `flyg ${!!flyger.flyg} coll ${!!flyger.post.coll}`)
  ok('en smältande isbit har ingen kolliderare', S._is.kuber.filter((k) => k.smalter).every((k) => !k.post.coll), `${S._is.kuber.filter((k) => k.smalter).length} smälter`)
  S.kor(1500)
  g.angle = 0.5
  S.ram()
  ok('lutat glas: inga isbitskolliderare (saften hälls fritt)', S._world.colliders.length === vaggar, `${S._world.colliders.length}`)
  g.angle = 0
  S._is.destroy()
  ok('destroy: alla kolliderare borta, inga kuber, följaren avregistrerad', S._world.colliders.length === vaggar && S._is.kuber.length === 0 && (S._world._foljare?.length ?? 0) === 0, `kolliderare ${S._world.colliders.length}`)
  S._is.steg(16.7)
  S.ram()
  ok('steg() efter destroy kastar inte', true)
}

// ============================================================ F · OTÅLIGT BARN (stress)
if (kor('F')) {
  console.log('\nF · OTÅLIGT BARN — 24 slumpade rundor (samma manus med och utan is): kast, dubbelkast, tryck på glaset, glaset lyfts, slängs och släpps\n')
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const episod = (medIs, seed) => {
    const R = mulberry(seed)
    const S = bygg({ medIs })
    const rader = process.argv.includes('--full') ? 14 + ((R() * 2) | 0) : 1 + ((R() * 15) | 0) // --full: bara nästan fulla glas
    S.fyll(1, rader)
    S.fyll(0, 4, 1)
    S.kor(6500) // låt de hörnpartiklar som spelets egen prefill pressar ut genom väggen hinna kullas FÖRE vi räknar
    const g = S._glasses[1]
    const n0 = nGlas(S, 1), t0 = nVarld(S), a0 = nGlas(S, 0)
    let ute = 0
    for (let steg = 0; steg < 14; steg++) {
      const r = R()
      if (r < 0.35) S._is?.slapp(g, FRAN)
      else if (r < 0.5) { S._is?.slapp(g, FRAN); S._is?.slapp(g, FRAN) }
      else if (r < 0.7) S._is?.knuffa(g, 1.1)
      else if (r < 0.85) {
        // som ett barn: lyft till bärhöjd (SAFE_Y 380), dra i sidled ovanför de andra, släpp
        const dx = (R() < 0.5 ? -1 : 1) * (60 + R() * 200)
        glid(S, g, g.x, 380, 10 + ((R() * 8) | 0)) // <= 24 px/bildruta uppåt (spelets lyft är ~14)
        glid(S, g, Math.max(150, Math.min(1000, g.x + dx)), 300 + R() * 80, Math.ceil(Math.abs(dx) / 22) + ((R() * 8) | 0)) // <= 22 px/bildruta i sidled
      } else { glid(S, g, g.x, Math.min(g.y, 380), 8); glid(S, g, 570, Math.min(g.y, 380), Math.ceil(Math.abs(570 - g.x) / 22) + 1); glid(S, g, 570, 620, 12) } // hem som _moveOver: upp, i sidled, ner
      const ms = 40 + R() * 500
      for (let t = 0; t < ms; t += FIXED) {
        S.ram()
        if (medIs) for (const k of S._is.kuber) if (!k.flyg && !iGlaset(k)) ute++
      }
    }
    glid(S, g, 570, 380, 14)
    glid(S, g, 570, 620, 12)
    S.kor(4000)
    const w = S._world
    let utanfor = 0
    for (let i = 0; i < w.count; i++) {
      let inne = false
      for (const gx of GLASS_X) {
        const lx = w.x[i] - gx, ly = w.y[i] - 620
        if (Math.abs(lx) < 90 && ly < 8 && ly > IN_TOP - 80) inne = true
      }
      if (!inne) utanfor++
    }
    return { avv: Math.abs(nGlas(S, 1) - n0) + Math.abs(nVarld(S) - t0) + Math.abs(nGlas(S, 0) - a0), dtot: nVarld(S) - t0, utanfor, ute, rader }
  }
  const med = [], utan = []
  for (let ep = 0; ep < 24; ep++) { med.push(episod(true, 1000 + ep)); utan.push(episod(false, 1000 + ep)) }
  const sum = (a, f) => a.reduce((x, e) => x + e[f], 0)
  console.log(`     utan is: avvikelse ${sum(utan, 'avv')} · utanför ${sum(utan, 'utanfor')}    med is: avvikelse ${sum(med, 'avv')} · utanför ${sum(med, 'utanfor')} · isbitar utanför ${sum(med, 'ute')}`)
  // Saft som byter glas på vägen (ägarregeln i _carryAll när ett glas dras förbi ett annat) finns redan
  // utan is — samma manus ger samma flytt. Det isen inte får göra är att SKADA: världen ska ha lika många
  // partiklar, och ingen ska ligga utanför ett glas.
  ok('världens partiklar oförändrade i alla 24 rundor med is (0 tappade, 0 kastade)', med.every((e) => e.dtot === 0), `${med.filter((e) => e.dtot !== 0).length} rundor med förlust (utan is: ${utan.filter((e) => e.dtot !== 0).length})`)
  ok('inte fler partiklar utanför glasen med is än utan', sum(med, 'utanfor') <= sum(utan, 'utanfor'), `${sum(med, 'utanfor')} mot ${sum(utan, 'utanfor')}`)
  ok('0 isbitar utanför glaset i någon bildruta', sum(med, 'ute') === 0, `${sum(med, 'ute')}`)
}

// ============================================================ G · RITAD GEOMETRI (spelets egna vyer, Pixi utan renderare)
if (kor('G')) {
  console.log('\nG · RITAD GEOMETRI — spelets egna _buildIsvarld/_buildIsbytta/_isVyer, vyn följer simuleringen\n')
  const S = bygg({ medIs: false })
  S._propL = new Container()
  S._isL = new Container()
  S._root = new Container()
  S._isT = 0
  S._isKlinkT = 0
  S._kran = { x: 570 }
  const toner = []
  const ctx = { services: { audio: { tone: (o) => toner.push(o), sfx() {} }, voice: { talar: false, say() {} } } }
  S._buildIsvarld(ctx)
  S._buildIsbytta(ctx)
  S.fyll(1, 10)
  S.kor(2500)
  const g = S._glasses[1]
  const k = S._is.slapp(g, { x: 1234, y: 528 })
  ok('en vy skapas direkt (i propL under flygningen)', !!k.vyn && k.vyn.parent === S._propL)
  let landat = false
  for (let t = 0; t < 120; t++) { S.ram(); S._isVyer(FIXED / 1000); if (!k.flyg && !landat) { landat = true; ok('vid landningen flyttas vyn ned under glasets glans (_isL)', k.vyn.parent === S._isL) } }
  const dx = Math.hypot(k.vyn.x - k.wx, k.vyn.y - k.wy)
  ok('vyns läge = simuleringens läge (< 0,01 px)', dx < 0.01, `${dx.toFixed(4)} px`)
  const b = k.ink.getLocalBounds()
  ok('ritad kloss ryms i ±(halvsida + 3 px) och är centrerad', b.minX >= -ISBIT_HALV - 3 && b.maxX <= ISBIT_HALV + 3 && Math.abs((b.minX + b.maxX) / 2) < 1.5 && Math.abs((b.minY + b.maxY) / 2) < 2, `x ${b.minX.toFixed(1)}..${b.maxX.toFixed(1)} y ${b.minY.toFixed(1)}..${b.maxY.toFixed(1)}`)
  ok('vilo-guppningen är liten (≤ 1,2 px) och bara när isen flyter', Math.abs(k.ink.y) <= 1.2 && k.s > 0.2, `ink.y ${k.ink.y.toFixed(2)} · s ${k.s.toFixed(2)}`)
  // en stöt syns som squash i vyn och dör ut
  S._is.knuffa(g, 1.1)
  k.sq = 1
  S._isVyer(FIXED / 1000)
  const sy1 = k.vyn.scale.y
  for (let t = 0; t < 90; t++) S._isVyer(FIXED / 1000)
  ok('squash vid stöt (y-skalan < 1) och tillbaka till 1 inom 1,5 s', sy1 < 0.9 && Math.abs(k.vyn.scale.y - 1) < 0.01, `${sy1.toFixed(2)} → ${k.vyn.scale.y.toFixed(3)}`)
  // träffytor: isbytta ≥ 96 px, ≥ 24 px från hinken (hinkens träffyta ±66 runt x 1100, se HINK/ISBYTTA_X)
  const hb = S._isbytta.view.hitArea
  const bx0 = S._isbytta.view.x + hb.x, bx1 = bx0 + hb.width
  ok('isbyttans träffyta ≥ 96 × 96', hb.width >= 96 && hb.height >= 96, `${hb.width}×${hb.height}`)
  ok('≥ 24 px luft till hinkens träffyta (1100 ± 66)', bx0 - (1100 + 66) >= 24, `${f1(bx0 - 1166)} px`)
  ok('isbyttans ritade bredd ryms på 16:9-skärmen (≤ 1280)', S._isbytta.view.x + 42 <= 1280, `höger kant (kanten på hinkens brätte) ${S._isbytta.view.x + 42}`)
  // tryck på isbytta: en isbit kastas till glaset under kranen och ett ljud kommer direkt
  S._glasses = S._glasses
  const n0 = S._is.kuber.length
  const t0 = toner.length
  S._onIsTap(ctx)
  ok('tryck på isbytta: isbit till glaset under kranen (glas 1 vid x 570) + ljud direkt', S._is.kuber.length === n0 + 1 && S._is.kuber.at(-1).g === g && toner.length > t0)
  // rivning: allt borta
  const vyer = S._is.kuber.map((q) => q.vyn)
  S._is.destroy()
  ok('rivning: alla isbitsvyer förstörda och borta ur sina lager', vyer.length > 0 && vyer.every((v) => v.destroyed) && S._isL.children.length === 0, `${vyer.length} vyer`)
}

console.log(`\n  ${fel ? '✗ ' + fel + ' mätningar röda' : '✓ alla mätningar gröna'}\n`)
process.exit(fel ? 1 : 0)
