// unika-knytt: SYNS unikheten? — hur olika blir tva knytt i rad, pa riktigt?
//
// Bakgrunden ar en tvist mellan tva granskare 2026-09-01. `_aterstall()` (index.js:690)
// nollar sju falt men aldrig `this._val` — barnets recept. Ett barn som bara matar spaken
// far darfor samma farg/storlek/monster/varld i all evighet, och hela variationen maste
// baras av FROET ensamt. Granskare A kallade det avsiktligt, granskare B rankade det som
// spelets storsta fel. Docens rad 195 sager "redo for nasta recept" men avgor ingenting.
//
// Sonden mater det med ett tal i stallet: hur ofta ser knytt N och N+1 LIKA ut?
//
// KONTROLLARM (kors alltid forst, och den ar halva matningen):
//   FRYST   = spelets nuvarande beteende (samma `_val` varje varv, bara nytt fro)
//   VARIERAD = det `_val` skulle ge om `_aterstall` cyklade receptet
// Ger de tva armarna samma tal mater sonden ingenting — da ar `_val` inte det som avgor,
// och granskare A har ratt. Skiljer de sig ar skillnaden exakt kostnaden for den frysta.
//
// ⚠ FORSTA VERSIONEN AV DEN HAR SONDEN VAR FEL, och kontrollarmen falde den (2026-09-01).
// Den raknade hur ofta tva knytt i rad var IDENTISKA (samma signatur) och fick 0,00 % i
// BADA armarna — 15 843 unika siluetter pa 20 000 drag. Sant, men fel fraga: tva knytt i
// rad ar nastan aldrig identiska i nagon arm, sa mattet kunde inte skilja de tva kanda
// lagena at och sade darfor ingenting om det okanda. Talet 30–60 % som en granskare
// pastod ar samtidigt MATT FALSKT: vanligaste siluetten tar 0,1 %, inte 30.
//
// Ratt fraga ar inte "ar de identiska" utan "SER de olika ut". Sonden mater darfor de
// fyra hogsalienta axlarna var for sig — det ett barn laser pa tva meters avstand:
//   kulor    baskulörens hue-avstand i grader mellan knytt N och N+1
//   varld    samma varld eller inte
//   monster  samma monster eller inte
//   siluett  kropp·oron·svans·ben·ogonform·ogonantal·mun·horn·vingar
// och rapporterar hur manga av de fyra som faktiskt SKILJER mellan tva knytt i rad.
// De kontinuerliga dragen (asym, brusAmp, kindAlfa …) raknas AVSIKTLIGT inte in — de ar
// under upplosningen for "ser den annorlunda ut?", och att ta med dem hade gjort varje
// individ unik pa papperet och sagt ingenting om bilden. Det ar hela fyndet.
//
//   node scripts/_variantprobe.mjs [--varv 20000]
import { dnaFromSeed, FARGER, MONSTER, VARLDAR, STORLEKAR } from '../src/games/unika-knytt/dna.js'

const arg = (n, d) => {
  const i = process.argv.indexOf(n)
  return i > -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : d
}
const VARV = arg('--varv', 20000)

// Samma mulberry32 som spelet, men for FROvalet — index.js slumpar ett nytt fro per varv.
let s = 0x2f6e2b1
const rnd = () => {
  s = (s + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const nyttFro = () => Math.floor(rnd() * 4294967296)

const formsig = (d) =>
  [d.kropp, d.oron, d.svans, d.ben, d.ogonform, d.ogonantal, d.mun, d.horn, d.vingar].join('.')

/** Hue ur den bakade hex-baskulören — det ar den farg som faktiskt nar duken. */
const hueAv = (hex) => {
  const r = ((hex >> 16) & 255) / 255
  const g = ((hex >> 8) & 255) / 255
  const b = (hex & 255) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  if (mx === mn) return 0
  const c = mx - mn
  const h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4
  return (h * 60 + 360) % 360
}
const hueDiff = (a, b) => Math.abs(((b - a + 540) % 360) - 180)

// Under sa har manga grader laser tva kulörer som SAMMA farg for ett barn pa avstand.
// Satt medvetet lagt: ±8° ar spelets egen klamp for varldsnyansen (dna.js:361).
const KULOR_TROSKEL = 12

/** En arm: `nastaVal` far avgora om receptet star still eller cyklar mellan varven. */
const kor = (namn, nastaVal) => {
  let val = { f: 6, z: 2, m: 3, v: 2, g: 1 }
  let forra = null
  const skilj = { kulor: 0, varld: 0, monster: 0, siluett: 0 }
  let summaAxlar = 0
  let nollAxlar = 0
  let maxHue = 0
  const formRakn = new Map()

  for (let i = 0; i < VARV; i++) {
    const d = dnaFromSeed(nyttFro(), val)
    const nu = { hue: hueAv(d.palett.bas), varld: d.varld, monster: d.monster, form: formsig(d) }
    if (forra) {
      const dh = hueDiff(forra.hue, nu.hue)
      if (dh > maxHue) maxHue = dh
      const a = {
        kulor: dh >= KULOR_TROSKEL,
        varld: nu.varld !== forra.varld,
        monster: nu.monster !== forra.monster,
        siluett: nu.form !== forra.form,
      }
      let n = 0
      for (const k of Object.keys(skilj)) if (a[k]) { skilj[k]++; n++ }
      summaAxlar += n
      if (n === 0) nollAxlar++
    }
    formRakn.set(nu.form, (formRakn.get(nu.form) || 0) + 1)
    forra = nu
    val = nastaVal(val)
  }

  const par = VARV - 1
  const topp = [...formRakn.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    namn,
    kulor: (100 * skilj.kulor) / par,
    varld: (100 * skilj.varld) / par,
    monster: (100 * skilj.monster) / par,
    siluett: (100 * skilj.siluett) / par,
    snittAxlar: summaAxlar / par,
    nollAxlar: (100 * nollAxlar) / par,
    maxHue,
    unikaForm: formRakn.size,
    toppAndel: (100 * topp[1]) / VARV,
    toppSig: topp[0],
  }
}

const FRYST = kor('FRYST   (spelets kod i dag)', (v) => v)
const VARIERAD = kor('VARIERAD (om _val cyklade)', (v) => ({
  f: (v.f + 1) % FARGER.length,
  z: (v.z + 1) % 4,
  m: (v.m + 1) % MONSTER.length,
  v: (v.v + 1) % VARLDAR.length,
  g: v.g,
}))

const pct = (x) => `${x.toFixed(1).padStart(5)} %`
console.log(`\n  unika-knytt — SER tva knytt i rad olika ut? ${VARV} varv per arm`)
console.log(`  (en axel raknas som skild nar den syns: kulör ≥${KULOR_TROSKEL}° hue, eller ett byte av varld/monster/siluett)\n`)
console.log('  arm                            kulör    varld  monster  siluett   axlar/par   INGEN axel skild')
for (const r of [FRYST, VARIERAD]) {
  console.log(
    `  ${r.namn.padEnd(28)} ${pct(r.kulor)} ${pct(r.varld)} ${pct(r.monster)} ${pct(r.siluett)}      ${r.snittAxlar.toFixed(2)} / 4      ${pct(r.nollAxlar)}`,
  )
}

const d = FRYST.snittAxlar - VARIERAD.snittAxlar
console.log(`\n  storsta hue-avstand i den frysta armen: ${FRYST.maxHue.toFixed(1)}° (spelets egen klamp ar ±8°, dna.js:361)`)
console.log(`  unika siluetter: fryst ${FRYST.unikaForm} · varierad ${VARIERAD.unikaForm} — vanligaste siluetten tar ${FRYST.toppAndel.toFixed(1)} %`)
console.log(`\n  skillnad mellan armarna: ${d >= 0 ? '+' : ''}${d.toFixed(2)} axlar per par`)
if (Math.abs(d) < 0.05) {
  console.log('  ⚠ ARMARNA AR LIKA — sonden mater inte `_val`. Slutsatsen far INTE dras harifran.')
} else {
  console.log('  ✓ armarna skiljer sig — talen ovan ar `_val`-frysningens faktiska kostnad.')
}
console.log(`\n  storlekar: ${STORLEKAR.length} · farger: ${FARGER.length} · monster: ${MONSTER.length} · varldar: ${VARLDAR.length}\n`)
