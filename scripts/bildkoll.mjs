// Bildkoll — läser en skärmdump och letar efter fel som INTE kastar ett konsolfel.
//
// VARFÖR inte en rak pixeldiff mot en baslinje: harnessen nollställer aldrig
// spardatan, så varje körning startar på en annan nivå, och spelen är fulla av
// Math.random() (partiklar, banor, laster). En pixeldiff hade tjutit varje körning
// och slutat läsas efter en vecka. I stället mäts EGENSKAPER hos bilden som är
// stabila under slumpen men som går sönder när renderingen gör det:
//
//   tom-scen         nästan inget ritades — spelet visar en tom skärm
//   heltackande-falt EN färg täcker halva skärmen (den kända Pixi-buggen: naken
//                    Graphics ritad kring origo + stor .position blir ett skärmbrett
//                    fält som kan lägga sig som en platt hinna över hela lager)
//   platt-scen       allt innehåll ligger i en smal remsa — layouten har kollapsat
//
// Baslinje-diff finns också, men som OPT-IN (--baslinje), för de gånger man medvetet
// jämför före/efter med samma spardata.
//
//   node scripts/bildkoll.mjs <bild.png> [--baslinje <bild.png>] [--json]
//   node scripts/bildkoll.mjs --rapport .test-shots     # mätvärden för kalibrering
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

// Trösklar KALIBRERADE mot repots 71 spelskärmdumpar, inte gissade. Uppmätt spann:
//   innehåll  4,3 % (spara-linjen) … 87,8 % (tvatta-djuret), näst lägst 9,8 %
//   enskilt fält  max 32,7 % (plantera-fron)
//   smalaste låda  71 % (vad-forsvann)
// Trösklarna ligger med marginal utanför det friska spannet, så en varning betyder
// något. Kör `node scripts/bildkoll.mjs --rapport .test-shots` för att kalibrera om.
export const GRANSER = {
  tomScen: 0.02, // under detta ritades i praktiken ingenting alls
  glesScen: 0.07, // under detta är scenen påfallande tom (spara-linjen: 4,3 %)
  faltAndel: 0.45, // en enskild icke-bakgrundsfärg över detta = heltäckande fält
  plattLada: 0.4, // innehållets bredd ELLER höjd som andel av duken
  diffAndel: 0.02, // pixeldiff mot baslinje över detta = ändrad bild
  kantCream: 0.6, // andel EXAKT letterbox-creme i "bar-zonerna" över detta = ingen bleed
}

// Letterbox-bakgrundens exakta färg (theme.js COLORS.bg). Full bleed betyder att
// zonerna utanför 16:9-rektangeln ska visa SCEN, inte denna creme. Avståndet hålls
// snävt (≤10): creme målas som en solid fyllning, medan warm-temats himmel
// (#fff0d6, Manhattan 21) är legitim scen och får inte räknas.
const CREME = [0xfd, 0xf6, 0xe3]

// Kolla bar-zonerna på en icke-16:9-skärmdump: med contain-skalning ligger de till
// vänster/höger (bredare än 16:9) eller uppe/nere (högre). Aktiveras bara när bilden
// avviker >1 % från 16:9 — en vanlig 1280×720-körning berörs aldrig.
//
// Två lärdomar från runda 1 är inbyggda:
// 1. Zonerna mäts i HALVOR (övre/undre resp. vänster/höger). En himmel som inte
//    breddats ger creme bara OVANFÖR horisonten — hela zonens snitt stannade under
//    tröskeln och missen hittades med ögonen i stället för av mätaren.
// 2. Spel vars EGEN spelyta medvetet är skalets creme (pusselbord, papperspanel)
//    kan aldrig skiljas från "ingen bleed" på pixlarna i zonen. Är innehållsytan
//    (16:9-rektangeln) själv ≥35 % exakt creme är cremen designen — ingen flagga.
// 3. Samma sak när cremen är en medveten RAM (folj-sparet: ängsmatta med creme-kant
//    runt om): är remsan precis INNANFÖR 16:9-rektangeln också creme (≥60 %) så
//    fortsätter zonerna bara designens ram — ingen flagga.
function kantCream(png) {
  const { width: w, height: h, data } = png
  const mal = 16 / 9
  const aspekt = w / h
  if (Math.abs(aspekt - mal) / mal < 0.01) return null
  const s = Math.min(w / 1280, h / 720)
  const barW = Math.round((w - 1280 * s) / 2)
  const barH = Math.round((h - 720 * s) / 2)
  const cremeAndel = (zx, zy, zw, zh) => {
    let totalt = 0
    let creme = 0
    for (let y = zy; y < zy + zh; y++) {
      for (let x = zx; x < zx + zw; x++) {
        const i = (y * w + x) * 4
        const d = Math.abs(data[i] - CREME[0]) + Math.abs(data[i + 1] - CREME[1]) + Math.abs(data[i + 2] - CREME[2])
        totalt++
        if (d <= 10) creme++
      }
    }
    return totalt ? creme / totalt : 0
  }
  const halvor = []
  if (barW > 4) {
    const hh = Math.floor(h / 2)
    halvor.push(cremeAndel(0, 0, barW, hh), cremeAndel(0, hh, barW, h - hh),
      cremeAndel(w - barW, 0, barW, hh), cremeAndel(w - barW, hh, barW, h - hh))
  } else if (barH > 4) {
    const hw = Math.floor(w / 2)
    halvor.push(cremeAndel(0, 0, hw, barH), cremeAndel(hw, 0, w - hw, barH),
      cremeAndel(0, h - barH, hw, barH), cremeAndel(hw, h - barH, w - hw, barH))
  }
  if (!halvor.length) return null
  const inreCreme = cremeAndel(barW, barH, w - 2 * barW, h - 2 * barH)
  // Ramremsan: ~24 designpx precis innanför 16:9-rektangeln (skalad till bildens px).
  const rt = Math.max(8, Math.round(24 * s))
  const iw = w - 2 * barW
  const ih = h - 2 * barH
  const ram = (
    cremeAndel(barW, barH, iw, rt) + cremeAndel(barW, barH + ih - rt, iw, rt) +
    cremeAndel(barW, barH + rt, rt, ih - 2 * rt) + cremeAndel(barW + iw - rt, barH + rt, rt, ih - 2 * rt)
  ) / 4
  return { andel: Math.max(...halvor), inreCreme, ramCreme: ram, barW, barH }
}

// Kvantisera till 5 bitar/kanal → 32768 hinkar. Nog för att hitta "en färg dominerar"
// utan att en mjuk gradient splittras i tusen unika toner.
const hink = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
const urHink = (h) => [((h >> 10) & 31) << 3, ((h >> 5) & 31) << 3, (h & 31) << 3]

export function matBild(png) {
  const { width: w, height: h, data } = png
  const antal = new Int32Array(32768)
  for (let i = 0; i < data.length; i += 4) antal[hink(data[i], data[i + 1], data[i + 2])]++

  // Bakgrund = vanligaste färgen.
  let bg = 0
  for (let i = 1; i < antal.length; i++) if (antal[i] > antal[bg]) bg = i
  const [br, bgg, bb] = urHink(bg)

  // Innehåll = pixlar som ligger MÄRKBART från bakgrunden. Avståndsmåttet (inte
  // hink-jämförelse) gör att en mjuk bakgrundsgradient inte räknas som innehåll.
  const totalt = w * h
  let innehall = 0
  let minX = w
  let maxX = -1
  let minY = h
  let maxY = -1
  const innehallAntal = new Int32Array(32768)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const d = Math.abs(r - br) + Math.abs(g - bgg) + Math.abs(b - bb)
      if (d <= 60) continue
      innehall++
      innehallAntal[hink(r, g, b)]++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  // Största enskilda icke-bakgrundsfärgen.
  let topp = 0
  for (let i = 1; i < innehallAntal.length; i++) if (innehallAntal[i] > innehallAntal[topp]) topp = i

  return {
    bredd: w,
    hojd: h,
    bakgrund: '#' + [br, bgg, bb].map((v) => v.toString(16).padStart(2, '0')).join(''),
    innehallAndel: innehall / totalt,
    faltAndel: innehallAntal[topp] / totalt,
    faltFarg: '#' + urHink(topp).map((v) => v.toString(16).padStart(2, '0')).join(''),
    lådaBredd: maxX < 0 ? 0 : (maxX - minX + 1) / w,
    lådaHojd: maxY < 0 ? 0 : (maxY - minY + 1) / h,
  }
}

// Fynd i EXAKT samma form som gamelog använder, så de faller rakt in i
// test-game.mjs JSON och test-games.mjs tabell utan någon extra rendering.
export function granska(bildPath, baslinjePath) {
  const fynd = []
  if (!existsSync(bildPath)) return fynd
  let png
  try {
    png = PNG.sync.read(readFileSync(bildPath))
  } catch {
    return fynd
  }
  const m = matBild(png)

  if (m.innehallAndel < GRANSER.tomScen) {
    fynd.push({
      kod: 'tom-scen',
      niva: 'fel',
      n: 1,
      msg: `Bara ${(m.innehallAndel * 100).toFixed(1)} % av skärmen har innehåll — spelet ritade i praktiken ingenting`,
      exempel: [{ innehall: +m.innehallAndel.toFixed(4), bakgrund: m.bakgrund }],
    })
  } else if (m.innehallAndel < GRANSER.glesScen) {
    fynd.push({
      kod: 'gles-scen',
      niva: 'varning',
      n: 1,
      msg: `Bara ${(m.innehallAndel * 100).toFixed(1)} % av skärmen har innehåll — scenen är påfallande tom (gate-punkt 4)`,
      exempel: [{ innehall: +m.innehallAndel.toFixed(4), bakgrund: m.bakgrund }],
    })
  }
  if (m.faltAndel > GRANSER.faltAndel) {
    fynd.push({
      kod: 'heltackande-falt',
      niva: 'fel',
      n: 1,
      msg: `En enda färg (${m.faltFarg}) täcker ${(m.faltAndel * 100).toFixed(0)} % av skärmen — trolig naken Graphics med stor .position`,
      exempel: [{ farg: m.faltFarg, andel: +m.faltAndel.toFixed(3) }],
    })
  }
  const kc = kantCream(png)
  if (kc && kc.andel > GRANSER.kantCream && kc.inreCreme < 0.35 && kc.ramCreme < 0.6) {
    fynd.push({
      kod: 'kant-cream',
      niva: 'fel',
      n: 1,
      msg: `${(kc.andel * 100).toFixed(0)} % av värsta zonhalvan utanför 16:9 är letterbox-creme — bakgrunden når inte skärmkanten (full bleed saknas)`,
      exempel: [{ andel: +kc.andel.toFixed(3), inreCreme: +kc.inreCreme.toFixed(3), barW: kc.barW, barH: kc.barH }],
    })
  }
  if (m.innehallAndel >= GRANSER.tomScen && (m.lådaBredd < GRANSER.plattLada || m.lådaHojd < GRANSER.plattLada)) {
    fynd.push({
      kod: 'platt-scen',
      niva: 'varning',
      n: 1,
      msg: `Allt innehåll ligger i en remsa (${(m.lådaBredd * 100) | 0}×${(m.lådaHojd * 100) | 0} % av duken) — trolig layoutkollaps`,
      exempel: [{ bredd: +m.lådaBredd.toFixed(2), hojd: +m.lådaHojd.toFixed(2) }],
    })
  }

  // Opt-in: jämför mot en baslinje (kräver samma spardata före/efter).
  if (baslinjePath && existsSync(baslinjePath)) {
    try {
      const bas = PNG.sync.read(readFileSync(baslinjePath))
      if (bas.width === png.width && bas.height === png.height) {
        const olika = pixelmatch(bas.data, png.data, null, png.width, png.height, { threshold: 0.12 })
        const andel = olika / (png.width * png.height)
        if (andel > GRANSER.diffAndel) {
          fynd.push({
            kod: 'bild-andrad',
            niva: 'varning',
            n: 1,
            msg: `${(andel * 100).toFixed(1)} % av bilden skiljer sig från baslinjen`,
            exempel: [{ andel: +andel.toFixed(4) }],
          })
        }
      }
    } catch {
      /* trasig baslinje ska aldrig fälla en testkörning */
    }
  }
  return fynd
}

// --- CLI ---------------------------------------------------------------------
const argv = process.argv.slice(2)
if (argv.length && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const arg = (n, d) => {
    const i = argv.indexOf(n)
    return i >= 0 ? argv[i + 1] : d
  }
  if (argv[0] === '--rapport') {
    // Kalibreringsläge: skriv mätvärden för alla bilder i en katalog.
    const dir = argv[1] || '.test-shots'
    const filer = readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
    console.log('bild'.padEnd(30), 'innehåll'.padStart(9), 'fält'.padStart(7), 'låda'.padStart(11), '  bakgrund')
    const rader = []
    for (const f of filer) {
      try {
        const m = matBild(PNG.sync.read(readFileSync(join(dir, f))))
        rader.push({ f, m })
        console.log(
          f.replace('.png', '').padEnd(30),
          (m.innehallAndel * 100).toFixed(1).padStart(8) + '%',
          (m.faltAndel * 100).toFixed(1).padStart(6) + '%',
          `${((m.lådaBredd * 100) | 0)}×${((m.lådaHojd * 100) | 0)}`.padStart(10),
          '  ' + m.bakgrund,
        )
      } catch {
        console.log(f.padEnd(30), '  (kunde inte läsas)')
      }
    }
    const sorterat = [...rader].sort((a, b) => a.m.innehallAndel - b.m.innehallAndel)
    console.log('\n  lägst innehåll:', sorterat.slice(0, 5).map((r) => `${r.f.replace('.png', '')} ${(r.m.innehallAndel * 100).toFixed(1)}%`).join(' · '))
    const faltSort = [...rader].sort((a, b) => b.m.faltAndel - a.m.faltAndel)
    console.log('  störst enskilt fält:', faltSort.slice(0, 5).map((r) => `${r.f.replace('.png', '')} ${(r.m.faltAndel * 100).toFixed(1)}%`).join(' · '))
  } else {
    const fynd = granska(argv[0], arg('--baslinje'))
    if (argv.includes('--json')) console.log(JSON.stringify(fynd, null, 2))
    else if (!fynd.length) console.log('✓ inga bildfynd')
    else for (const f of fynd) console.log(`${f.niva === 'fel' ? '✗' : '⚠'} ${f.kod} — ${f.msg}`)
  }
}
