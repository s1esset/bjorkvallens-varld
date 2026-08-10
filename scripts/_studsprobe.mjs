// STATISK RESTITUTION (ÅTGÄRDER V10) — hur mycket skulle fixen faktiskt ÄNDRA?
//
//   node scripts/_studsprobe.mjs            (ingen webbläsare, ~2 s)
//
// `PhysicsWorld._make` skapar kroppen dynamisk och sätter den statisk efteråt (NaN-fixen),
// och matters `Body.setStatic` nollar då `restitution`. Varje `restitution` ett spel satt på
// en ramp, vägg, studsplatta eller hink har alltså aldrig gjort något.
//
// Fixen är två rader — men den ändrar 23 spel samtidigt, och alla är handtrimmade mot dagens
// beteende. Innan något ändras måste BLASTRADIEN mätas, inte gissas. Sonden svarar på:
//
//   1. Nollas restitution verkligen av `setStatic`? (regressionsvakt)
//   2. Vad är parets studsregel — max, medel eller produkt? (avgör HELA blastradien)
//   3. Vilka av spelens 44 statiska tal ligger ÖVER den rörliga kroppens egen studs, och
//      skulle alltså faktiskt börja göra något? (resten är no-ops och kan aldrig regressa)
//   4. Hur STOR blir skillnaden i px för dem som ändras?
//
// Arm A = idag (talet nollat). Arm B = fixen, simulerad genom att återställa `_original`
// på den skapade kroppen — så mätningen kräver ingen ändring i delad kod.
import { PhysicsWorld } from '../src/lib/physics.js'

const PLANK = { x: 640, y: 400, w: 200, h: 32 }
const BALL_R = 26
const GRAV = 1.1
const FALL = 260 // px — ett rejält men vanligt fall

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

// Ett släpp rakt ner på en statisk planka. `fixad` = återställ `_original` efter setStatic.
function slapp({ statiskR, dynamiskR, fixad, studs }) {
  const v = new PhysicsWorld({ gravityY: GRAV, walls: [] })
  const plank = v.rectangle(PLANK.x, PLANK.y, PLANK.w, PLANK.h, {
    isStatic: true, restitution: statiskR, friction: 0.04, label: 'plank',
    ...(studs != null ? { studs } : {}),
  })
  if (fixad && plank._original) plank.restitution = plank._original.restitution
  const startY = PLANK.y - PLANK.h / 2 - BALL_R - FALL
  const kula = v.circle(PLANK.x, startY, BALL_R, {
    restitution: dynamiskR, friction: 0.03, frictionAir: 0.006, density: 0.0013, label: 'ball',
  })

  let traffad = false
  let topp = Infinity
  let parStuds = null
  v.onCollision((e) => {
    for (const p of e.pairs) {
      if (p.bodyA.label === 'plank' || p.bodyB.label === 'plank') {
        if (!traffad) parStuds = p.restitution
        traffad = true
      }
    }
  })
  for (let i = 0; i < 400; i++) {
    v.update(1000 / 60)
    if (traffad) topp = Math.min(topp, kula.position.y)
  }
  const vila = PLANK.y - PLANK.h / 2 - BALL_R
  const plankRest = plank.restitution
  const plankOrig = plank._original ? plank._original.restitution : null
  const plankStudsFalt = plank.studs
  v.destroy()
  return {
    hopp: traffad && isFinite(topp) ? Math.max(0, vila - topp) : 0,
    parStuds, plankRest, plankOrig, plankStudsFalt,
  }
}

console.log('\nSTATISK RESTITUTION — blastradien för ÅTGÄRDER V10\n')

// --- 1. Regressionsvakt: nollas talet? ------------------------------------
{
  const v = new PhysicsWorld({ gravityY: GRAV, walls: [] })
  const p = v.rectangle(100, 100, 50, 50, { isStatic: true, restitution: 0.95, friction: 0.04 })
  ok('setStatic nollar restitution', p.restitution === 0 && p._original?.restitution === 0.95,
    `satt 0.95 → ${p.restitution} (original ${p._original?.restitution})`)
  ok('...och sätter friktionen till 1', p.friction === 1, `friction ${p.friction} (original ${p._original?.friction})`)
  v.destroy()
}

// --- 2. Vilken regel använder paret? --------------------------------------
// Det här talet avgör HELA blastradien: med max() är varje statiskt värde UNDER den
// rörliga kroppens egen studs en ren no-op, och kan alltså aldrig regressa.
console.log('\n  Parets studsregel (statisk 0.90 mot dynamisk 0.30, fixad arm):')
{
  const hog = slapp({ statiskR: 0.9, dynamiskR: 0.3, fixad: true })
  const lag = slapp({ statiskR: 0.3, dynamiskR: 0.9, fixad: true })
  const bada = slapp({ statiskR: 0.9, dynamiskR: 0.9, fixad: true })
  const maxRegel = Math.abs(hog.parStuds - 0.9) < 1e-9
  console.log(`    par.restitution = ${hog.parStuds} · omvänt ${lag.parStuds} · båda höga ${bada.parStuds}`)
  ok('paret tar MAX av de två (inte medel eller produkt)', maxRegel,
    `0.90 mot 0.30 gav ${hog.parStuds} — medel hade gett 0.60, produkt 0.27`)
}

// --- 3 + 4. Spelens verkliga tal ------------------------------------------
// De distinkta statiska värden som faktiskt står i src/games (se `_studsprobe`-tabellen
// i ÅTGÄRDER V10) plus de dynamiska studstal MATERIALS ger.
const STATISKA = [0.04, 0.05, 0.1, 0.18, 0.2, 0.3, 0.32, 0.35, 0.4, 0.5, 0.55, 0.7, 0.75, 0.92, 1.0]
const DYNAMISKA = [
  { namn: 'heavy  0.18', r: 0.18 },
  { namn: 'kula   0.42', r: 0.42 },
  { namn: 'normal 0.45', r: 0.45 },
  { namn: 'bouncy 0.86', r: 0.86 },
]

console.log('\n  Hopphöjd (px) efter 260 px fall — IDAG → FIXAD, per rörlig kropp:\n')
const doda = []
const levande = []
for (const dyn of DYNAMISKA) {
  const bitar = []
  for (const s of STATISKA) {
    const a = slapp({ statiskR: s, dynamiskR: dyn.r, fixad: false })
    const b = slapp({ statiskR: s, dynamiskR: dyn.r, fixad: true })
    const diff = b.hopp - a.hopp
    // Klassa efter REGELN (max), inte efter en px-tröskel. Strax ovanför den rörliga
    // kroppens studs är den ÄKTA skillnaden bara någon px, och en grov tröskel
    // stämplade då ett levande fall som dött (0,20 mot heavy 0,18 gav 1 px).
    if (s <= dyn.r + 1e-9) doda.push({ s, dyn: dyn.r, diff })
    else levande.push({ s, dyn: dyn.r, a: a.hopp, b: b.hopp, diff })
    bitar.push(`${s.toFixed(2)}:${Math.round(a.hopp)}→${Math.round(b.hopp)}`)
  }
  console.log(`    ${dyn.namn}  ${bitar.join('  ')}`)
}

console.log('')
ok('ett statiskt tal UNDER den rörliga kroppens studs är en REN no-op',
  doda.every((d) => Math.abs(d.diff) < 1.5),
  `${doda.length} av ${STATISKA.length * DYNAMISKA.length} kombinationer rör sig <1,5 px (störst ${Math.max(...doda.map((d) => Math.abs(d.diff))).toFixed(1)} px)`)
ok('ett statiskt tal ÖVER den rörliga kroppens studs ändrar banan',
  levande.length > 0 && levande.every((l) => l.diff > 0),
  `${levande.length} kombinationer ändras, störst ${Math.round(Math.max(...levande.map((l) => l.diff)))} px`)

// --- 5. Världsväggarna: fruktan var obefogad, och det är MÄTT -------------
// `_buildWalls` skickar `{ isStatic: true, restitution: 0.4 }` RAKT in i `Bodies.rectangle`
// och lägger kroppen i världen med `Composite.add` — den går alltså aldrig genom `_make`.
// Matter kör då `setStatic` inifrån `Body.create` och slutar med `_original === null`:
// talet 0,4 är inte undanlagt, det är BORTA. Två följder, båda avgörande för fixen:
//   · en fix i `_make` rör inte väggarna alls → "varje vägg i varje fysikspel blir
//     studsig på en gång" KAN inte hända, och det var det tyngsta argumentet mot V10
//   · vill man någon gång ha studsiga ramar måste `_buildWalls` skrivas om separat
{
  const v = new PhysicsWorld({ gravityY: GRAV })
  const vagg = v.walls?.[0]
  ok('världsväggarnas tal är BORTA, inte undanlagt', vagg != null && vagg.restitution === 0 && vagg._original == null,
    vagg ? `restitution ${vagg.restitution} · _original ${JSON.stringify(vagg._original)} · ${v.walls.length} väggar per spel` : 'inga väggar')
  ok('väggarna går inte genom _make — fixen når dem aldrig', vagg != null && vagg._original == null,
    '_buildWalls använder Composite.add direkt')
  v.destroy()
}

// --- 6. `studs`-opten: den byggda fixen, mätt mot den simulerade ------------
// Mätningarna 1–5 sa vad en fix SKULLE göra. Här mäts vad den GÖR. Kravet är dubbelt:
// en kropp som ber om studs ska studsa exakt som den simulerade fixade armen, och en
// kropp som INTE ber om det ska vara bit-identisk med dagens beteende — annars vore
// opt-in bara en global ändring med ett extra ord.
console.log('\n  `studs`-opten (ÅTGÄRDER V10, byggd):')
{
  const utan = slapp({ statiskR: 0.9, dynamiskR: 0.18, fixad: false })
  const med = slapp({ statiskR: 0, dynamiskR: 0.18, fixad: false, studs: 0.9 })
  const simulerad = slapp({ statiskR: 0.9, dynamiskR: 0.18, fixad: true })
  console.log(`    utan opt ${utan.hopp.toFixed(1)} px · med studs 0.9 ${med.hopp.toFixed(1)} px · simulerad fix ${simulerad.hopp.toFixed(1)} px`)

  ok('`studs` ger samma studs som den simulerade fixen',
    Math.abs(med.hopp - simulerad.hopp) < 1.5,
    `${med.hopp.toFixed(1)} mot ${simulerad.hopp.toFixed(1)} px`)
  ok('`studs` lyfter hoppet rejält mot en tung kropps egna 0,18',
    med.hopp - utan.hopp > 50,
    `+${(med.hopp - utan.hopp).toFixed(0)} px`)
  ok('UTAN `studs` är kroppen orörd — 44 tal i 18 spel ändras inte',
    utan.plankRest === 0 && utan.hopp < 10,
    `restitution ${utan.plankRest} · hopp ${utan.hopp.toFixed(1)} px`)
  ok('`_original` bär studsen, så en väckt kropp behåller den',
    med.plankOrig === 0.9, `_original.restitution ${med.plankOrig}`)
  ok('`studs` läcker inte in i matters namnrymd',
    med.plankStudsFalt === undefined, `body.studs = ${String(med.plankStudsFalt)}`)

  const klamd = slapp({ statiskR: 0, dynamiskR: 0.18, fixad: false, studs: 2 })
  ok('`studs` kläms till 0..1 (2 → 1)', klamd.plankRest === 1, `restitution ${klamd.plankRest}`)

  const noll = slapp({ statiskR: 0.9, dynamiskR: 0.18, fixad: false, studs: 0 })
  ok('`studs: 0` är ett medvetet dött golv, inte "använd talet"',
    noll.plankRest === 0 && noll.hopp < 10, `hopp ${noll.hopp.toFixed(1)} px`)
}

console.log(`\n${fel === 0 ? '✓ alla mått gröna' : `✗ ${fel} mått röda`}\n`)
process.exit(fel === 0 ? 0 : 1)
