// SILHUETT — ansiktets faktiska kontur, rad för rad, in i manifestet.
//
// Ägarrapport (v1.204.0): "hitboxen för huvudet går ej längs masken (fyrkantig låda utanför
// ansiktet)". `mata-munnen` prövade träffar mot en handstämd ELLIPS, och `_silprobe.mjs`
// mätte upp vad den kostade: **32,0 % av träffzonen träffade inget ansikte alls, samtidigt
// som 18,8 % av det synliga ansiktet låg utanför zonen.** Fel åt båda hållen på en gång —
// alltså fel FORM, inte fel storlek. Att bara krympa ellipsen gör det värre (rx 124 ger
// 31,9 % missat ansikte); den uppmätta radprofilen ger 0,0 / 0,0.
//
// Samma lärdom som halsmasken 2026-08-13: det som skiljer ansikte från icke-ansikte är
// POSITION, profilerad rad för rad — inte ett enda tal.
//
// Profilen läses ur `bas.webp`s alfa (basen är hela det inriktade ansiktet, så den bär
// konturen även när käken sjunker) och lagras i RUTANS koordinater, så riggen kan räkna om
// den med sin egen skala utan att känna till något lagers offset.
//
//   node scripts/silhuett.mjs [--person pappa] [--steg 16]
//
// Körs automatiskt som en del av `node scripts/ansikte.mjs`. Den fristående vägen finns för
// att kunna fylla på ett REDAN klippt manifest utan att klippa om alla lager.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const MAGICK = process.env.MAGICK || 'magick'
// Bandhöjden syns i bild: på 16 px trappar konturen märkbart där den svänger snabbast
// (hjässan och käkvinkeln) — se `.test-shots/_silprobe.png`. 8 px kostar 100 rader i stället
// för 50, alltså ~1 kB i manifestet, och det är inget att spara på.
export const STEG = 8 // px i rutans koordinater mellan profilens rader
const TROSKEL = 48 // alfa 0–255: under detta är pixeln genomskinlig nog att inte vara ansikte

/**
 * Konturens vänstra och högra kant per band, i RUTANS koordinater.
 *
 * ⚠️ EN magick-körning, inte en per rad. Alfan hämtas som råa gråskalebytes (`gray:-`) och
 * profileras i JS: 50 anrop till ImageMagick tog 10 s och gav exakt samma tal.
 *
 * @param {string} basFil  sökväg till `bas.webp`
 * @param {{x:number,y:number,w:number,h:number}} lager  basens läge i rutan
 * @param {{w:number,h:number}} ruta
 * @returns {{steg:number, rader:Array<[number,number]|null>}}
 */
export function silhuett(basFil, lager, ruta, steg = STEG) {
  const rå = execFileSync(MAGICK, [basFil, '-alpha', 'extract', '-depth', '8', 'gray:-'],
    { maxBuffer: 1 << 28 })
  if (rå.length !== lager.w * lager.h) {
    throw new Error(`silhuett: ${rå.length} bytes men lagret är ${lager.w}×${lager.h}`)
  }
  const rader = []
  for (let y = 0; y < ruta.h; y += steg) {
    // Bandet i BASENS rader. Ligger det helt utanför lagret finns inget ansikte där.
    const y0 = Math.max(0, y - lager.y)
    const y1 = Math.min(lager.h, y + steg - lager.y)
    if (y1 <= y0) { rader.push(null); continue }
    let v = lager.w; let h = -1
    for (let r = y0; r < y1; r++) {
      const bas = r * lager.w
      for (let c = 0; c < v; c++) if (rå[bas + c] >= TROSKEL) { v = c; break }
      for (let c = lager.w - 1; c > h; c--) if (rå[bas + c] >= TROSKEL) { h = c; break }
    }
    rader.push(h < v ? null : [v + lager.x, h + lager.x])
  }
  return { steg, rader }
}

// ⚠️ `file://${argv[1]}` duger inte som "kördes jag direkt?" på Windows: `import.meta.url`
// blir `file:///C:/...` med tre snedstreck medan sammanfogningen ger två, så CLI-delen
// hoppades tyst över och skriptet skrev ingenting alls.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
  const person = opt('--person', 'pappa')
  const steg = +opt('--steg', STEG)
  const kat = path.join('public', 'ansikte', person)
  const fil = path.join(kat, 'manifest.json')
  const man = JSON.parse(fs.readFileSync(fil, 'utf8'))
  const s = silhuett(path.join(kat, man.lager.bas.fil), man.lager.bas, man.ruta, steg)
  man.geometri = { ...man.geometri, silhuett: s }
  fs.writeFileSync(fil, JSON.stringify(man, null, 2))
  const fyllda = s.rader.filter(Boolean)
  const bredaste = Math.max(...fyllda.map(([v, h]) => h - v))
  console.log(`\n  silhuett → ${fil}`)
  console.log(`  ${fyllda.length} av ${s.rader.length} band bär ansikte · steg ${steg} px · bredaste ${bredaste} px`)
  console.log(`  topp y=${s.rader.findIndex(Boolean) * steg} · botten y=${(s.rader.length - 1 - [...s.rader].reverse().findIndex(Boolean)) * steg}\n`)
}
