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
