// Letar efter TYSTA TRYCK som ännu inte hänt: pekhanterare som bortar tidigt på en
// upptagen-flagga (_busy · _resolving · _locked · …) utan att ge någon återkoppling.
// Det är P0-brottet `dod-traffyta`, och harnessen hittar det bara när dess åtta
// sekunder råkar träffa rätt fas — tre olika körningar gav tre olika spel.
//
//   node scripts/_tystprobe.mjs            # bara kandidaterna
//   node scripts/_tystprobe.mjs --alla     # även de som redan kvitterar
//
// ⚠️ DEN HÄR SONDEN GER LEDTRÅDAR, INTE DOMAR. Den läser text, inte beteende: den
// vet inte om spelet svarar på ett annat sätt (en tween som redan rullar, en annan
// hanterare på samma yta), och den ser inte pekningar som når fram via en delad
// DragController. Reproducera i harnessen innan du ändrar en rad — ett plausibelt
// men falskt spår får inte generera en ändring (docs/ATGARDER.md).
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GAMES = join(ROOT, 'src/games')
const visaAlla = process.argv.includes('--alla')

const FLAGGOR = /this\._(busy|resolving|locked|cleared|animating|playing|showing|running|_?done)\b/
// Kvitterar hanteraren på något sätt i sin tidiga retur-gren?
const KVITTO = /kvittera|_nudge|_kvitto|audio\.(sfx|tone|sample)|wiggle|pop\(|ripple/

const rader = []
for (const id of readdirSync(GAMES)) {
  let kod
  try {
    kod = readFileSync(join(GAMES, id, 'index.js'), 'utf8')
  } catch {
    continue
  }
  const linjer = kod.split(/\r?\n/)

  // 1) Vilka metoder är bundna till en pekning?
  //    OBS: bindningens kropp får INTE läsas som "fram till första )" — en pilfunktion
  //    börjar med `()` och matchen tar då slut innan metodnamnet ens har setts. Det
  //    var sondens första bugg: den rapporterade noll kandidater i hela repot.
  const handlare = new Set()
  const bind = /\.on\(\s*'(?:pointertap|pointerdown|pointerup)'\s*,([^\n]*)/g
  let m
  while ((m = bind.exec(kod))) {
    for (const t of m[1].matchAll(/this\.(_[A-Za-z0-9_]+)/g)) handlare.add(t[1])
  }
  // Ett steg av indirektion: `this._onCatch = (e) => this._onTap(ctx, e)` betyder att
  // det är `_onTap` som bär vakten, inte `_onCatch`.
  for (const t of kod.matchAll(/this\.(_[A-Za-z0-9_]+)\s*=\s*\([^)]*\)\s*=>\s*this\.(_[A-Za-z0-9_]+)/g)) {
    if (handlare.has(t[1])) handlare.add(t[2])
  }

  // 2) Har en sådan metod en tyst tidig retur på en upptagen-flagga?
  for (const namn of handlare) {
    const start = linjer.findIndex((l) => new RegExp(`^\\s*${namn}\\s*\\(`).test(l))
    if (start < 0) continue // pilfunktion eller fält — inte en metod i objektet
    for (let i = start + 1; i < Math.min(start + 22, linjer.length); i++) {
      const l = linjer[i]
      // Nästa metod = namn+parentes på TVÅ stegs indrag. Utan nyckelords-undantaget
      // matchar `if (` det mönstret, och sonden bröt då på hanterarens FÖRSTA rad —
      // sondens andra bugg, och skälet till att den envisades med noll kandidater.
      if (/^ {2}[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(l) && !/^ {2}(if|for|while|switch|return|const|let)\b/.test(l)) break
      if (!FLAGGOR.test(l) || !/\breturn\b/.test(l)) continue
      const tyst = !KVITTO.test(l)
      if (tyst || visaAlla) rader.push({ id, namn, rad: i + 1, tyst, text: l.trim() })
      break
    }
  }
}

const kandidater = rader.filter((r) => r.tyst)
console.log(`\n  Tysta pekhanterare — LEDTRÅDAR, inte domar\n`)
let spel = null
for (const r of rader.sort((a, b) => a.id.localeCompare(b.id) || a.rad - b.rad)) {
  if (r.id !== spel) {
    spel = r.id
    console.log(`  ${spel}`)
  }
  console.log(`    ${r.tyst ? '⚠' : '✓'} ${r.namn}  ·  ${r.id}/index.js:${r.rad}`)
  if (r.tyst) console.log(`        ${r.text}`)
}
console.log(`\n  ${kandidater.length} kandidat(er) i ${new Set(kandidater.map((r) => r.id)).size} spel${visaAlla ? ` · ${rader.length - kandidater.length} kvitterar redan` : ''}\n`)
