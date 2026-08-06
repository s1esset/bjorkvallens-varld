// Importerar valda CC0-ljud från ett Kenney-ljudpaket till public/audio/sfx/.
//
//   node scripts/kenney-sfx.mjs <sökväg-till-uppackad-Audio-katalog>
//
// Paketet: https://kenney.nl/assets/interface-sounds (Creative Commons Zero, CC0 —
// ingen attribution krävs, får bäddas in offline). Ladda ner, packa upp, peka hit.
//
// VARFÖR BARA TRE LJUD. En mätning av repot visade 263 sfx-anrop som saknar riktigt
// klipp, fördelade på sex nycklar. Men fyra av dem ska INTE ersättas:
//
//   correct   660→880 Hz          = en ren KVINT
//   match     660→990→1320 Hz     = en durtreklang, arpeggierad
//   pling     880 + 1320 Hz       = kvint
//
// Det är stämd musik, inte blipp. Kvalitetsgrindens punkt 5 säger uttryckligen
// "aldrig generiska UI-blipp som musik" — att byta dessa mot Kenneys `confirmation`
// och `bong` vore alltså att BRYTA mot regeln man försökte uppfylla. De lämnas kvar.
//
// Kvar blir de nycklar där synten faktiskt är generisk:
//   tap    en 520 Hz triangel — hörs vid VARENDA pekning i alla 71 spel. Ett riktigt
//          klick har bredbandig transient och känns taktilt; en ren ton känns elektronisk.
//   soft   mjuk neutral "inte riktigt"-ton. En pluck har samma avsikt men mer kropp.
//   flip   en fyrkantsvågs-glidning. Ett mekaniskt ljud är helt enkelt sanningsenligare.
//
// ATT ÅNGRA: ta bort raden ur public/audio/sfx/manifest.json. AudioService faller då
// tillbaka på syntesen automatiskt — ingen kodändring behövs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SFX_DIR = join(ROOT, 'public/audio/sfx')
const MANIFEST = join(SFX_DIR, 'manifest.json')

// sfx-nyckel → källfil i Kenney-paketet. Matchat på längd (allt under 0,2 s) och
// funktion; långa ljud (switch 0,62 s, scroll 1,0 s) är uteslutna — de hinner inte
// bli klara innan nästa pekning.
const KARTA = {
  tap: 'click_001.ogg', // 0,100 s — taktilt klick vid pekning
  soft: 'pluck_001.ogg', // 0,102 s — mjuk, neutral, aldrig en tillsägelse
  flip: 'toggle_001.ogg', // 0,139 s — mekaniskt vänd
}

// Samma kodning som repots befintliga klipp: mp3, 24 kHz, mono, 96 kbps.
const AR = '24000'
const KBPS = '96k'
const TOPP_DB = -3 // toppnormalisering, så inget klipp sticker ut i volym

const kalla = process.argv[2]
if (!kalla || !existsSync(kalla)) {
  console.error('usage: node scripts/kenney-sfx.mjs <sökväg-till-Kenney-Audio-katalog>')
  console.error('       hämta paketet från https://kenney.nl/assets/interface-sounds (CC0)')
  process.exit(2)
}

const ffmpeg = (args) => execFileSync('ffmpeg', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// Mät toppnivån så vi kan normalisera i stället för att gissa en volym.
// volumedetect skriver till STDERR och ffmpeg avslutar med 0 — mätvärdet måste
// därför läsas ur stderr vid LYCKAD körning, inte ur ett undantag.
const toppNivaDb = (fil) => {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', fil, '-af', 'volumedetect', '-f', 'null', '-'], {
    encoding: 'utf8',
  })
  const m = ((r.stderr || '') + (r.stdout || '')).match(/max_volume:\s*(-?[\d.]+) dB/)
  if (!m) throw new Error(`kunde inte mäta toppnivån för ${fil} — normalisera inte på en gissning`)
  return Number(m[1])
}

mkdirSync(SFX_DIR, { recursive: true })
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}

let n = 0
for (const [nyckel, fil] of Object.entries(KARTA)) {
  const src = join(kalla, fil)
  if (!existsSync(src)) {
    console.log(`  ⚠ hoppar över ${nyckel}: ${fil} finns inte i paketet`)
    continue
  }
  const utNamn = `${nyckel}.mp3`
  const ut = join(SFX_DIR, utNamn)
  const topp = toppNivaDb(src)
  const gain = (TOPP_DB - topp).toFixed(2)
  ffmpeg(['-y', '-v', 'error', '-i', src, '-af', `volume=${gain}dB`, '-ac', '1', '-ar', AR, '-b:a', KBPS, ut])
  manifest[nyckel] = utNamn
  n++
  console.log(`  ✓ ${nyckel.padEnd(6)} ← ${fil.padEnd(16)} (topp ${topp} dB → ${TOPP_DB} dB)`)
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log(`\n  ${n} klipp importerade · manifest har nu ${Object.keys(manifest).length} nycklar`)
console.log('  Källa: Kenney Interface Sounds (CC0) — https://kenney.nl/assets/interface-sounds')
