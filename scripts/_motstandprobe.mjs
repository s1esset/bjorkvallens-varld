// Mäter lib/luftmotstand.js i TAL — utan webbläsare (rena tal, ingen Pixi).
//
//   node scripts/_motstandprobe.mjs
//
// Ett motstånd är lätt att skriva så att det SER rätt ut: saker faller, farten planar
// ut, inget konsolfel. Men hela poängen med att byta ut `chute.y += sink * dt` mot en
// riktig lag är att lagen ska ge det den lovar — annars är det bara en dyrare konstant.
// Frågorna volymen måste svara ja på:
//
//   1. Nås gränsfarten, och är den EXAKT den spelet bad om?
//   2. Skalar massan som √m och arean som 1/√A? (annars är kalibreringen en lögn)
//   3. Är vinden en HASTIGHET — driver allt till slut med luften, och släpar tungt efter?
//   4. Har styrningen en egen gränsfart, och är en tung last trögare i sidled?
//   5. Håller fartspärren även vid ett lagg-hopp?
//   6. Nollas `driv()` varje steg, och är `steg()` efter `destroy()` verkligen dött?
import { Motstandsvolym } from '../src/lib/luftmotstand.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const nara = (a, b, tol) => Math.abs(a - b) <= tol

// Fallskärmens egna tal (se src/games/fallskarmen/index.js).
const GRAV = 0.086
const V_LATT = 85 / 60 // px/bildruta — uppmätt fallfart i HEAD (85 px/s)
const MASSA_TUNG = 2.79

// Släpp en kropp och kör N bildrutor. Returnerar banan.
function fall({ massa = 1, gransfart = V_LATT, vind = 0, styr = 0, kraft = 0, steg = 600, dt = 1, vy0 = 0 }) {
  const luft = new Motstandsvolym({ grav: GRAV })
  const o = { x: 0, y: 0 }
  const r = luft.lagg(o, { massa, gransfart, vy: vy0 })
  luft.setVind(vind, 0)
  const bana = []
  for (let i = 0; i < steg; i++) {
    if (styr) luft.driv(r, styr, 0) // acceleration (massoberoende)
    if (kraft) luft.kraft(r, kraft, 0) // kraft (delas med massan)
    luft.steg(dt)
    bana.push({ t: (i + 1) / 60, x: o.x, y: o.y, vx: r.vx, vy: r.vy })
  }
  return { luft, r, o, bana }
}

console.log('\nLUFTMOTSTÅND — gör lagen det den lovar?\n')

// 1. GRÄNSFARTEN.
console.log('1. Gränsfart')
{
  const { r, bana, luft } = fall({})
  const slut = bana[bana.length - 1]
  ok('farten planar ut på den begärda gränsfarten', nara(slut.vy, V_LATT, 0.01), `${(slut.vy * 60).toFixed(1)} px/s (bad om ${(V_LATT * 60).toFixed(0)})`)
  ok('gransfart() rapporterar samma tal', nara(luft.gransfart(r), V_LATT, 1e-6), `${(luft.gransfart(r) * 60).toFixed(1)} px/s`)
  // Tiden till 95 % — det som gör att fallet SYNS accelerera (HEAD: 0,07 s = ingen alls).
  const t95 = bana.find((p) => p.vy >= V_LATT * 0.95)
  ok('accelerationen är synlig, inte omedelbar', t95 && t95.t > 0.25 && t95.t < 1.5, `95 % av farten efter ${t95 ? t95.t.toFixed(2) : '—'} s`)
}

// 2. SKALNINGEN — massan som √m, arean som 1/√A.
console.log('\n2. Skalning')
{
  // Samma kupol (samma k·A), dubbelt så tung last: gränsfarten ska gå upp som √2.
  const luft = new Motstandsvolym({ grav: GRAV })
  const kA = Motstandsvolym.motstandFor({ massa: 1, grav: GRAV, gransfart: V_LATT })
  const latt = luft.lagg({ x: 0, y: 0 }, { massa: 1, area: kA / luft.tathet })
  const tung = luft.lagg({ x: 0, y: 0 }, { massa: MASSA_TUNG, area: kA / luft.tathet })
  const kvot = luft.gransfart(tung) / luft.gransfart(latt)
  ok('massan skalar som √m', nara(kvot, Math.sqrt(MASSA_TUNG), 0.01), `${MASSA_TUNG}× massa → ${kvot.toFixed(2)}× fart (√ = ${Math.sqrt(MASSA_TUNG).toFixed(2)})`)
  const stor = luft.lagg({ x: 0, y: 0 }, { massa: 1, area: (4 * kA) / luft.tathet })
  ok('arean skalar som 1/√A', nara(luft.gransfart(stor) / luft.gransfart(latt), 0.5, 0.01), `4× kupol → ${(luft.gransfart(stor) / luft.gransfart(latt)).toFixed(2)}× fart`)
  ok('tyngdknappens kvot blir HEADs 1,67×', nara(kvot, 1.67, 0.02), `${kvot.toFixed(2)}× mot uppmätta 1,67×`)
}

// 3. VINDEN ÄR EN HASTIGHET.
console.log('\n3. Vind')
{
  const V = 2.5 // px/bildruta luftfart
  const l = fall({ massa: 1, vind: V, steg: 900 })
  const t = fall({ massa: MASSA_TUNG, gransfart: V_LATT * Math.sqrt(MASSA_TUNG), vind: V, steg: 900 })
  const slutL = l.bana[l.bana.length - 1]
  const slutT = t.bana[t.bana.length - 1]
  ok('allt driver till slut MED luften', nara(slutL.vx, V, 0.02) && nara(slutT.vx, V, 0.05), `lätt ${slutL.vx.toFixed(2)} · tung ${slutT.vx.toFixed(2)} av ${V}`)
  // Under ett verkligt fall (~3–4,5 s) hinner den tunga INTE dit — det är hela skillnaden.
  const vid = (b, sek) => b.find((p) => p.t >= sek) || b[b.length - 1]
  const dl = vid(l.bana, 1).x
  const dt2 = vid(t.bana, 1).x
  ok('tung last släpar efter i en by', dt2 < dl * 0.8, `på 1 s: lätt ${dl.toFixed(0)} px · tung ${dt2.toFixed(0)} px (${(dl / dt2).toFixed(2)}×)`)
  ok('en kropp som redan driver med luften känner inget motstånd', (() => {
    const luft = new Motstandsvolym({ grav: GRAV })
    const o = { x: 0, y: 0 }
    const r = luft.lagg(o, { massa: 1, gransfart: V_LATT, vx: V })
    luft.setVind(V, 0)
    luft.steg(1)
    return nara(r.vx, V, 1e-9)
  })(), 'sidofarten oförändrad')
}

// 4. STYRNINGEN — och skillnaden mellan en acceleration och en kraft.
console.log('\n4. Styrning')
{
  const A = 0.06 // px/bildruta²
  const vid = (b, sek) => b.find((p) => p.t >= sek) || b[b.length - 1]
  const tungFart = V_LATT * Math.sqrt(MASSA_TUNG)

  // Som KRAFT (barnet drar i en lina): accelerationen blir F/m → tungt är trögare.
  const lk = fall({ massa: 1, kraft: A, steg: 900 })
  const tk = fall({ massa: MASSA_TUNG, gransfart: tungFart, kraft: A * MASSA_TUNG * 0.62, steg: 900 })
  const slutL = lk.bana[lk.bana.length - 1]
  ok('styrningen har en egen gränsfart', slutL.vx > 0 && Math.abs(slutL.vx - lk.bana[800].vx) < 0.01, `lätt planar på ${slutL.vx.toFixed(2)} px/bildruta`)
  ok(
    'som KRAFT är en tung last trögare i sidled',
    vid(tk.bana, 1).x < vid(lk.bana, 1).x,
    `på 1 s: lätt ${vid(lk.bana, 1).x.toFixed(0)} px · tung ${vid(tk.bana, 1).x.toFixed(0)} px`
  )
  console.log('     (HEAD gav 248 respektive 245 px — knappen gjorde ingen skillnad alls)')

  // ⚠️ ISOLERA MASSAN, ANNARS MÄTER DU KUPOLEN. Två kroppar med olika massa har också
  // olika k·A när båda kalibrerats mot sin egen fallkänsla — då skiljer sig banorna av
  // MOTSTÅNDET, inte av massan, och `driv` ser mass-beroende ut fast den inte är det
  // (mätt: 18,5 mot 23,1 px, hela skillnaden från k·A/m). Jämförelsen nedan håller
  // därför k·A/m KONSTANT och varierar bara massan: då är `driv` identisk och `kraft`
  // skiljer sig med exakt massförhållandet.
  const parAcc = []
  const parKraft = []
  for (const m of [1, MASSA_TUNG]) {
    // SAMMA gränsfart ⇒ samma k·A/m ⇒ identiskt motstånd; bara massan skiljer.
    // (`motstandFor` ger kA = m·g/v², så v konstant är det som håller kA/m konstant —
    // inte v ∝ √m, som håller kA konstant och alltså ÄNDRAR motståndet per massa.)
    const g = V_LATT
    parAcc.push(vid(fall({ massa: m, gransfart: g, styr: A, steg: 120 }).bana, 0.5).x)
    parKraft.push(vid(fall({ massa: m, gransfart: g, kraft: A, steg: 120 }).bana, 0.5).x)
  }
  ok(
    'driv() är massoberoende (spelets hjälp känns lika i båda lägena)',
    nara(parAcc[0], parAcc[1], 0.01),
    `på 0,5 s: lätt ${parAcc[0].toFixed(2)} px · tung ${parAcc[1].toFixed(2)} px`
  )
  ok(
    'kraft() delas med massan (barnets muskler känner lasten)',
    nara(parKraft[1] / parKraft[0], 1 / MASSA_TUNG, 0.02),
    `tung når ${(parKraft[1] / parKraft[0]).toFixed(2)}× av lättas väg (1/${MASSA_TUNG} = ${(1 / MASSA_TUNG).toFixed(2)})`
  )
}

// 5. FARTSPÄRREN.
console.log('\n5. Fartspärr')
{
  const luft = new Motstandsvolym({ grav: GRAV, maxFart: 26 })
  const o = { x: 0, y: 0 }
  const r = luft.lagg(o, { massa: 1, gransfart: V_LATT })
  for (let i = 0; i < 50; i++) {
    luft.driv(r, 400, 400) // orimlig knuff
    luft.steg(3) // och ett lagg-hopp
  }
  ok('inget kan överskrida fartspärren', Math.hypot(r.vx, r.vy) <= 26.0001, `${Math.hypot(r.vx, r.vy).toFixed(2)} px/bildruta`)
  ok('positionen är ändlig (ingen NaN)', Number.isFinite(o.x) && Number.isFinite(o.y), `x=${o.x.toFixed(0)} y=${o.y.toFixed(0)}`)
}

// 6. DRIV NOLLAS + EXIT.
console.log('\n6. Städning')
{
  const luft = new Motstandsvolym({ grav: GRAV })
  const o = { x: 0, y: 0 }
  const r = luft.lagg(o, { massa: 1, gransfart: V_LATT })
  luft.driv(r, 5, 0)
  luft.steg(1)
  const vxEfter = r.vx
  luft.steg(1) // inget nytt driv
  ok('driv() gäller ETT steg, inte för alltid', r.vx < vxEfter, `${vxEfter.toFixed(3)} → ${r.vx.toFixed(3)} px/bildruta`)

  const yFore = o.y
  luft.destroy()
  luft.steg(1)
  luft.steg(1)
  ok('steg() efter destroy() gör ingenting', o.y === yFore, `y oförändrad (${o.y.toFixed(1)})`)
  ok('kroppslistan är tömd', luft._kroppar.length === 0)
}

console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
process.exit(fel === 0 ? 0 : 1)
