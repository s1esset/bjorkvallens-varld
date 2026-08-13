// _silprobe.mjs — SILHUETTEN mot träffytan.
//
// Ägarrapport: "hitboxen för huvudet går ej längs masken (fyrkantig låda utanför ansiktet)".
// Frågan är mätbar: hur mycket av `BUS`-ellipsen i `mata-munnen` ligger UTANFÖR det fotot
// faktiskt målar? Sonden läser alfan ur `bas.webp` rad för rad, räknar om till design-
// koordinater med spelets EGNA tal (`ANS`, `BUS`), och rapporterar överskottet.
//
// ⚠️ Kontrollarm först: en ellips som exakt omsluter silhuetten ska ge ~0 % falsk yta i
// mitten av ansiktet. Utan den raden mäter man bara att ellipsen är en ellips.
import fs, { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const MAGICK = process.env.MAGICK || 'magick'
const BAS = 'public/ansikte/pappa/bas.webp'
const MAN = JSON.parse(readFileSync('public/ansikte/pappa/manifest.json', 'utf8'))

// Spelets egna tal (kok.js · index.js) — skrivna av, inte importerade, för att sonden ska
// kunna köras mot en gammal HEAD utan att bero på att exporten finns där.
const ANS = { x: 620, y: 250, h: 460 }
const BUS = { rx: 215, ry: 250 }
const BUS_NER = Math.round((616 / 800 - 0.5) * ANS.h)

const L = MAN.lager.bas
const R = MAN.ruta
const k = ANS.h / R.h // designpixlar per rutpixel

/** Alfans vänstra/högra kant per rad i BAS-lagrets egna koordinater. */
function profil(steg = 8) {
  const rader = []
  for (let y = 0; y < L.h; y += steg) {
    const h = Math.min(steg, L.h - y)
    let ut
    try {
      ut = execFileSync(MAGICK, [BAS, '-alpha', 'extract', '-threshold', '20%',
        '-crop', `${L.w}x${h}+0+${y}`, '+repage', '-format', '%w %h %X %Y', 'info:'],
      { encoding: 'utf8' })
    } catch { rader.push(null); continue }
    const m = ut.trim().match(/^(\d+) (\d+) ([+-]\d+) ([+-]\d+)$/)
    if (!m) { rader.push(null); continue }
    const w = +m[1]
    const x0 = +m[3]
    if (!w) { rader.push(null); continue }
    rader.push({ y: y + h / 2, x0, x1: x0 + w })
  }
  return rader
}

/** Rutkoordinat → designkoordinat. */
const dx = (xRuta) => ANS.x + (xRuta - R.w / 2) * k
const dy = (yRuta) => ANS.y + (yRuta - R.h / 2) * k

/** Ligger punkten i bus-ellipsen? Kopia av spelets `_iAnsiktet`. */
function iEllips(x, y, rx = BUS.rx, ry = BUS.ry, ryNer = BUS_NER) {
  const d0 = y - ANS.y
  const a = (x - ANS.x) / rx
  const b = d0 / (d0 > 0 ? ryNer : ry)
  return a * a + b * b <= 1
}

console.log('\n  SILHUETTEN mot träffytan — mata-munnen\n')

const rader = profil()
const giltiga = rader.filter(Boolean)
if (!giltiga.length) {
  console.log('  ✗ ingen alfa lästes — är ImageMagick på PATH? (sätt MAGICK=...)')
  process.exit(1)
}

// --- 1. hur bred ÄR han? ---
let maxHalv = 0; let maxY = 0
for (const r of giltiga) {
  const v = dx(r.x0 + L.x); const h = dx(r.x1 + L.x)
  const halv = Math.max(ANS.x - v, h - ANS.x)
  if (halv > maxHalv) { maxHalv = halv; maxY = dy(r.y) }
}
const topp = dy(giltiga[0].y)
const bott = dy(giltiga[giltiga.length - 1].y)
console.log(`  ansiktets bredaste halva : ${maxHalv.toFixed(0)} px (vid y=${maxY.toFixed(0)})`)
console.log(`  BUS.rx                   : ${BUS.rx} px  →  ${(BUS.rx / maxHalv).toFixed(2)}× för bred`)
console.log(`  fotots topp / botten     : y=${topp.toFixed(0)} / y=${bott.toFixed(0)}`)
console.log(`  BUS uppåt / nedåt        : y=${(ANS.y - BUS.ry).toFixed(0)} / y=${(ANS.y + BUS_NER).toFixed(0)}\n`)

// --- 2. BÅDA felen, inte bara det ena ---
//
// ⚠️ En sond som bara räknar DÖD YTA rankar en oändligt liten träffyta som perfekt. Måttet
// måste därför gå åt båda hållen: hur mycket av zonen är tom (falsk träff), OCH hur mycket
// av det synliga ansiktet ligger utanför zonen (missad träff). Ansiktet är synligt ner till
// köksöns bakkant (`KANT_Y`) — under den finns han, men bakom bänken.
const KANT_Y = 440

/** Silhuettens vänstra/högra kant i DESIGN-x på en given design-y, eller null. */
function kant(y) {
  const yr = (y - ANS.y) / k + R.h / 2 - L.y
  let bast = null
  for (const r of giltiga) if (!bast || Math.abs(r.y - yr) < Math.abs(bast.y - yr)) bast = r
  if (!bast || Math.abs(bast.y - yr) > 12) return null
  return { v: dx(bast.x0 + L.x), h: dx(bast.x1 + L.x) }
}

function bedom(inne, etikett) {
  const G = 2
  let falsk = 0; let zon = 0; let missad = 0; let ansikte = 0
  for (let y = 0; y <= KANT_Y; y += G) {
    const kn = kant(y)
    for (let x = ANS.x - 260; x <= ANS.x + 260; x += G) {
      const iZon = inne(x, y)
      const iAns = !!kn && x >= kn.v && x <= kn.h
      if (iZon) { zon++; if (!iAns) falsk++ }
      if (iAns) { ansikte++; if (!iZon) missad++ }
    }
  }
  const pF = zon ? (100 * falsk) / zon : 0
  const pM = ansikte ? (100 * missad) / ansikte : 0
  console.log(`  ${etikett.padEnd(26)} falsk yta ${pF.toFixed(1).padStart(5)} %   missat ansikte ${pM.toFixed(1).padStart(5)} %`)
  return { pF, pM }
}

console.log('  falsk yta  = i träffzonen men INGET ansikte där (barnet kastar bredvid och får en träff)')
console.log('  missat     = synligt ansikte utanför träffzonen (barnet träffar honom och inget händer)\n')

bedom((x, y) => iEllips(x, y, BUS.rx, BUS.ry, BUS_NER), 'NUVARANDE   rx=215')
bedom((x, y) => iEllips(x, y, Math.round(maxHalv), BUS.ry, BUS_NER), `ellips      rx=${Math.round(maxHalv)}`)
bedom((x, y) => iEllips(x, y, Math.round(maxHalv), BUS.ry, KANT_Y - ANS.y), `ellips      rx=${Math.round(maxHalv)} ner till kanten`)

// DEN LEVERERADE koden, inte en skiss av den: samma bandade profil ur manifestet som
// `Ansikte.traffar()` läser, samma marginal (`MAT_R` = matbitens fysikradie), samma
// `KANT_Y`-klippning som `_iAnsiktet` gör.
//
// ⚠️ Profilen läses ur MANIFESTET här. Läste sonden om alfan själv vore den här raden bara
// en mätning av att två kopior av samma formel är överens — den skulle inte kunna upptäcka
// att bandningen (16 px) eller lagrets offset kom in fel i den fil spelet faktiskt laddar.
const MAT_R = 34
const S = MAN.geometri?.silhuett
if (!S?.rader) {
  console.log('  ✗ manifestet saknar geometri.silhuett — kör `node scripts/silhuett.mjs`\n')
  process.exit(1)
}
function levererad(x, y) {
  if (y > KANT_Y) return false
  const rx = (x - ANS.x) / k + R.w / 2
  const yr = (y - ANS.y) / k + R.h / 2
  const m = MAT_R / k
  for (let i = Math.floor((yr - m) / S.steg); i <= Math.floor((yr + m) / S.steg); i++) {
    const rad = S.rader[i]
    if (rad && rx >= rad[0] - m && rx <= rad[1] + m) return true
  }
  return false
}
// Marginalen kostar falsk yta — men den "falska" ytan är där bitens KANT rör ansiktet.
// Raden med marginal 0 står bredvid för att visa hur mycket av talet som är just marginalen.
function profilTest(marg) {
  return (x, y) => {
    if (y > KANT_Y) return false
    const kn = kant(y)
    return !!kn && x >= kn.v - marg && x <= kn.h + marg
  }
}
bedom(profilTest(0), 'profil      marginal 0')
bedom(levererad, `LEVERERAD   marginal ${MAT_R}`)
console.log('\n  (LEVERERAD läser manifestets bandade profil — avviker den från "profil" är det')
console.log('   bandningen eller lagrets offset som kommit in fel, inte formeln.)\n')

// --- 3. bilden. Ett tal säger inte var ytan sitter, och klagomålet var visuellt ---
if (process.argv.includes('--bild')) {
  const UT = '.test-shots/_silprobe.png'
  const W = 1280; const H = 720
  // ⚠️ Överlägget byggs som en PIXELBUFFERT, inte som `-draw point`. Ett draw-argument per
  // punkt blev tiotusentals argument och sprängde kommandoraden (E2BIG, ingen bild alls).
  const rgba = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ny = levererad(x, y)
      const gammal = iEllips(x, y, BUS.rx, BUS.ry, BUS_NER)
      if (!ny && !gammal) continue
      const i = (y * W + x) * 4
      // GRÖNT = levererad zon. RÖTT = yta bara den gamla ellipsen tog — det ägaren såg som
      // en låda utanför ansiktet.
      rgba[i] = ny ? 0x28 : 0xe0
      rgba[i + 1] = ny ? 0xb4 : 0x40
      rgba[i + 2] = ny ? 0x55 : 0x20
      rgba[i + 3] = 0x66
    }
  }
  const tmp = '.test-shots/_silprobe.rgba'
  fs.mkdirSync('.test-shots', { recursive: true })
  fs.writeFileSync(tmp, rgba)
  const bas = MAN.lager.bas
  const x0 = Math.round(ANS.x + (bas.x - R.w / 2) * k)
  const y0 = Math.round(ANS.y + (bas.y - R.h / 2) * k)
  const bredd = Math.round(bas.w * k)
  execFileSync(MAGICK, ['-size', `${W}x${H}`, 'xc:#f3e3c6',
    '(', `public/ansikte/pappa/${bas.fil}`, '-resize', `${bredd}x`, ')',
    '-geometry', `+${x0}+${y0}`, '-composite',
    '(', '-size', `${W}x${H}`, '-depth', '8', `rgba:${tmp}`, ')', '-composite',
    '-fill', 'none', '-stroke', '#1a1a1a', '-strokewidth', '2',
    '-draw', `line 0,${KANT_Y} ${W},${KANT_Y}`, UT])
  fs.unlinkSync(tmp)
  console.log(`  bild: ${UT}  (RÖTT = yta den gamla ellipsen tog men silhuetten inte · GRÖNT = levererad zon · linjen är KANT_Y)\n`)
}
