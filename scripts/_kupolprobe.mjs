// Vad gör fallskärmens kupol egentligen? Samma mjukkropp, samma tal, utan webbläsare.
//
//   node scripts/_kupolprobe.mjs
//
// Skärmdumpen visade en platt, sned kupol men kunde inte säga VARFÖR. Det här skriver ut
// tygets punkter i vila och under last, så formen går att läsa i tal.
import { Mjukkropp } from '../src/lib/mjukkropp.js'

const RX = 92
const RY = 66
const SKIRT_Y = -100
const N = 16

const bygg = ({ styvhet = 0.9, tryck = 1.15, grav = 0.02 } = {}) => {
  const k = new Mjukkropp({
    x: 0,
    y: SKIRT_Y,
    w: RX * 2,
    h: RY * 2,
    punkter: N,
    grav,
    damp: 0.9,
    tryck,
    styvhet,
    // INGEN egen form. `form(a)` skalar BÅDA axlarna, så en "platt underkant" via
    // radiefaktor drar också in skärmkantens hörn (sin a = 0 fick faktor 0,12 → ±11 px
    // i stället för ±92), och fästpunkterna slet dem sedan 80 px utåt. Kupolen är
    // i stället en HEL ellips vars undre halva ligger dold under skärmkanten — det är
    // den som ger trycket sin luftvolym, precis som i en riktig fallskärm.
  })
  // HELA SKÄRMKANTEN fästs (undre halvan, punkt N/4..3N/4) i sina egna vilolägen.
  // Med bara tre fästen kunde ringen ROTERA runt dem: efter 240 steg låg toppunkten
  // på x = −55 och bredden hade vuxit från 184 till 209 px, och kraftfältet drunknade
  // i den rörelsen (lätt, tung och sidby gav identiska former på 0,1 px).
  for (let i = N / 4; i <= (3 * N) / 4; i++) k.fast(i, k.pts[i].x, k.pts[i].y)
  return k
}

const beskriv = (k, namn) => {
  const topp = k.pts[0]
  let minY = 1e9
  let maxX = -1e9
  let minX = 1e9
  for (let i = 0; i < N; i++) {
    minY = Math.min(minY, k.pts[i].y)
    minX = Math.min(minX, k.pts[i].x)
    maxX = Math.max(maxX, k.pts[i].x)
  }
  console.log(`\n${namn}`)
  console.log(`  topp (punkt 0): x=${topp.x.toFixed(1)} y=${topp.y.toFixed(1)}   (viloläge: 0, ${(SKIRT_Y - RY).toFixed(0)})`)
  console.log(`  höjd över skärmkanten: ${(SKIRT_Y - minY).toFixed(1)} px  (ritad kupol: ${RY})`)
  console.log(`  bredd: ${(maxX - minX).toFixed(1)} px  (ritad: ${RX * 2})`)
  const rad = []
  for (let j = 0; j <= N / 2; j++) {
    const i = ((3 * N) / 4 + j) % N
    rad.push(`${k.pts[i].x.toFixed(0)},${k.pts[i].y.toFixed(0)}`)
  }
  console.log(`  övre bågen v→h: ${rad.join('  ')}`)
}

// 1. Direkt efter bygget — är VILOFORMEN en dom?
{
  const k = bygg()
  beskriv(k, '1. VILOFORM (innan ett enda steg)')
}

// 2. Utan yttre kraft, 240 steg — håller den formen av egen kraft?
{
  const k = bygg()
  for (let i = 0; i < 240; i++) k.steg(1)
  beskriv(k, '2. EFTER 240 STEG utan kraftfält (bara tygets egen tyngd 0,02)')
}

// 3. SVEP: hur mjukt måste tyget vara för att lasten ska SYNAS i kupolen?
// Luftkraften på lasten är m·g i jämvikt: 0,086 (lätt) och 0,240 (tung). Fältet i tyget
// är den kraften gånger KUPOL_KRAFT. Målet: lätt ~3 px, tung ~8 px, by ~6–10 px i sidled
// — synligt på 1280×720 utan att kupolen ser trasig ut.
console.log('\n3. SVEP — toppunktens förskjutning (px) vid olika tyg och olika KUPOL_KRAFT\n')
console.log('   styvhet  tryck   K     lätt(upp)  tung(upp)  by(sid)   bredd tung')
const kor = (opts, K, fx, fy) => {
  const k = bygg(opts)
  k.falt(fx * K, fy * K)
  for (let i = 0; i < 240; i++) k.steg(1)
  let minX = 1e9
  let maxX = -1e9
  for (let i = 0; i < N; i++) {
    minX = Math.min(minX, k.pts[i].x)
    maxX = Math.max(maxX, k.pts[i].x)
  }
  return { dy: SKIRT_Y - RY - k.pts[0].y, dx: k.pts[0].x, bredd: maxX - minX }
}
const SWEEP = process.argv.includes('--svep')
for (const styvhet of SWEEP ? [0.9, 0.5, 0.25, 0.12] : []) {
  for (const tryck of [1.15, 0.4]) {
    for (const K of [0.6, 6, 30]) {
      const latt = kor({ styvhet, tryck }, K, 0, -0.086)
      const tung = kor({ styvhet, tryck }, K, 0, -0.24)
      const by = kor({ styvhet, tryck }, K, -0.15, -0.086)
      console.log(
        `   ${styvhet.toFixed(2).padStart(5)}   ${tryck.toFixed(2)}   ${String(K).padStart(3)}   ` +
          `${latt.dy.toFixed(1).padStart(7)}    ${tung.dy.toFixed(1).padStart(7)}   ${by.dx.toFixed(1).padStart(6)}   ${tung.bredd.toFixed(0).padStart(5)}`
      )
    }
  }
}
if (SWEEP) process.exit(0)

// 4. DE VALDA TALEN — håller tyget formen, syns lasten, och svänger det ut?
const VALD = { styvhet: 0.12, tryck: 0.4, grav: 0.02 }
const K = 5
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
console.log(`\n4. Valda tal: styvhet ${VALD.styvhet} · tryck ${VALD.tryck} · KUPOL_KRAFT ${K}\n`)
{
  // Stabilitet: 900 steg utan kraft ska lämna kupolen exakt där den byggdes.
  const k = bygg(VALD)
  for (let i = 0; i < 900; i++) k.steg(1)
  ok('formen står stilla utan kraft (ingen drift, ingen rotation)', Math.abs(k.pts[0].x) < 0.5 && Math.abs(k.pts[0].y + 166) < 1.5, `topp ${k.pts[0].x.toFixed(2)}, ${k.pts[0].y.toFixed(1)}`)

  const bukt = (fx, fy) => {
    const b = bygg(VALD)
    b.falt(fx * K, fy * K)
    for (let i = 0; i < 240; i++) b.steg(1)
    return { dy: SKIRT_Y - RY - b.pts[0].y, dx: b.pts[0].x }
  }
  const latt = bukt(0, -0.086)
  const tung = bukt(0, -0.24)
  const by = bukt(-0.15, -0.086)
  ok('lasten syns i kupolen', latt.dy > 1.5 && latt.dy < 5, `lätt ${latt.dy.toFixed(1)} px upp`)
  ok('en tung last spänner den TYDLIGT mer', tung.dy > latt.dy * 2, `tung ${tung.dy.toFixed(1)} px (${(tung.dy / latt.dy).toFixed(1)}×)`)
  ok('en by trycker in kupolen från sidan', Math.abs(by.dx) > 5 && Math.abs(by.dx) < 20, `${by.dx.toFixed(1)} px i sidled`)

  // Svängning: byt last tvärt (Lätt → Tung) och se att tyget SVÄNGER in, inte hoppar.
  const s = bygg(VALD)
  s.falt(0, -0.086 * K)
  for (let i = 0; i < 240; i++) s.steg(1)
  const fore = s.pts[0].y
  s.falt(0, -0.24 * K)
  const spar = []
  for (let i = 0; i < 180; i++) {
    s.steg(1)
    spar.push(s.pts[0].y)
  }
  const slut = spar[spar.length - 1]
  const nadde = spar.findIndex((y) => Math.abs(y - slut) < 0.3)
  ok('lastbytet SVÄNGER in i stället för att hoppa', nadde > 8, `${nadde} bildrutor (${(nadde / 60).toFixed(2)} s) från ${fore.toFixed(1)} till ${slut.toFixed(1)}`)
  ok('och den svänger inte förbi orimligt', Math.min(...spar) > slut - 6, `minsta y ${Math.min(...spar).toFixed(1)} mot slutläget ${slut.toFixed(1)}`)
}
console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
process.exit(fel === 0 ? 0 : 1)
