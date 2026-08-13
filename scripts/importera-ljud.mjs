// IMPORTERA-LJUD — ägarens inspelningar + CC0-effekter → `public/audio/sfx/`.
//
// Samma princip som `npm run voice` och `npm run sfx`: allt tungt görs EN gång här, och
// appen läser bara färdiga mp3:or + `manifest.json`. Körs om vid nya inspelningar.
//
//   node scripts/importera-ljud.mjs [--kalla <katalog>] [--torr]
//
// ⚠️ TRE SAKER SOM ÄR MÄTTA, INTE VALDA — alla tre kostade tid förra gången (v1.194):
//
//  1. NIVÅN. Målet är −18 LUFS, som är `djur_hund.mp3`s nivå — appens första INSPELADE klipp.
//     Uppmätt på de befintliga: pappa_mmm −18,4 · pappa_aj −18,7 · pappa_surt −18,5 ·
//     djur_hund −18,3. Appen normaliserar INTE per klipp (`_playSample` sätter
//     `gain = masterVolume` rakt av), så filen måste bära rätt nivå.
//     ⚠️ INTE `loudnorm` i dynamiskt läge: det komprimerar rösten själv på ett kort klipp,
//     och dess −1 dBTP mäts FÖRE mp3-kodningen (lame skjuter över). Fast förstärkning +
//     mjuk begränsare gav 17 dB spridning → 0,4 dB.
//
//  2. KLIPPUNKTEN MÄTS PER FIL. Källorna bär 0,27–0,83 s tystnad före rösten. Trimningen
//     läser `silencedetect` i stället för att kapa ett fast antal millisekunder — en regel
//     som "hoppa fram till det ljudstarka partiet" kapade `Fniss` mitt i dess starkaste
//     skratt förra gången, eftersom just den filen bar sitt kraftigaste ljud FÖRST.
//
//  3. TUGGKLIPPEN ÄR SERIER OCH MÅSTE STYCKAS. `chewing_cracker` är 7,15 s och `chew_smack`
//     5,53 s — alltså 8–12 tuggor var. Spelet spelar ETT tuggljud per sammanbitning på
//     käkens egen takt (mätt: 3 sammanbitningar för mjuk mat, 2 för seg), så ett helt klipp
//     hade gett trettio tuggor för tre. Snittpunkterna nedan är lästa ur `silencedetect`.
//
// ⚠️ EBU R128 kan inte mäta ett klipp kortare än 0,4 s (gate-blocket är 400 ms) —
//    `wet_impact.mp3` är 0,26 s och rapporterar −70 LUFS, vilket inte är en mätning.
//    Sådana klipp nivåsätts på TOPPEN i stället, och det står i rapporten vilka.
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const KALLA = opt('--kalla', 'C:/repos/ComfyUI_Windows_portable/ComfyUI/input/s1face2/ljud')
const TORR = args.includes('--torr')
const UT = path.join('public', 'audio', 'sfx')
const MAL_LUFS = -18
const TOPP_TAK = -1.5 // dB — takhöjd kvar åt mp3-kodaren
// För klipp under 0,45 s går R128 inte att använda (gate-blocket är 400 ms). Reservmåttet är
// oviktad RMS, och målet är MÄTT ur de klipp som redan ligger på −18 LUFS: pappa_mmm −18,0 ·
// pappa_aj −18,8 · pappa_surt −19,1 · djur_hund −19,8 · pappa_fniss −20,6 dB RMS.
// ⚠️ Reservmåttet får INTE vara toppen: en kort smäll toppar nära 0 dB vid en RMS som ligger
// 20 dB under rösten, så topp-normalisering gjorde ett tuggljud öronbedövande bredvid pappa
// (uppmätt: +16,6 dB på en knapring som redan var i nivå).
const MAL_RMS = -19

// --- vad varje källa blir ----------------------------------------------------
//
// `namn` är nyckeln spelet frågar efter. Flera rader med SAMMA namn blir automatiskt
// varianter, och `AudioService.sample()` slumpar mellan dem — ägarens regel: "är det flera
// ljudeffekter med samma syfte kan vi använda dem med, fast då slumpas ljudet fram".
//
// `klipp: [start, slut]` i sekunder. Utelämnad = trimma tystnad i båda ändar automatiskt.
const KLIPP = [
  // --- pappas röst (ägarens egna inspelningar) ---
  { fil: 'Gasp.m4a', namn: 'pappa_gasp' },
  { fil: 'Chock.m4a', namn: 'pappa_chock' },
  { fil: 'Hmm.m4a', namn: 'pappa_hmm' },
  { fil: 'Retas.m4a', namn: 'pappa_retas' },
  { fil: 'Ehh.m4a', namn: 'pappa_ehh' },
  { fil: 'Huh.m4a', namn: 'pappa_huh' },

  // --- tuggning: EN sammanbitning per fil, styckad ur serien ---
  // chewing_cracker: tystnad 1,013 (+0,128) och 1,528 (+0,428) → en hel knapring emellan.
  { fil: 'chewing_cracker.mp3', namn: 'tugg_knaprig', klipp: [1.141, 1.528] },
  // chew_smack: ljudet börjar 1,117 (tystnad 0→1,117) och nästa tystnad är 1,446.
  { fil: 'chew_smack.mp3', namn: 'tugg_seg', klipp: [1.117, 1.446] },
  // `mjuk` är den vanligaste maten och ligger mellan de två andra — den får BÅDA som
  // varianter i stället för ett eget klipp som inte finns i materialet.
  { fil: 'chew_smack.mp3', namn: 'tugg_mjuk', klipp: [1.117, 1.446] },
  { fil: 'chewing_cracker.mp3', namn: 'tugg_mjuk', klipp: [1.141, 1.528] },

  // --- dryck: en klunk, inte ett helt glas ---
  { fil: 'drinking.mp3', namn: 'klunk', klipp: [0, 0.379] },
  { fil: 'drinking_wet.mp3', namn: 'klunk', klipp: [2.442, 2.820] },

  // --- sväljning (fyra varianter) ---
  // Pappas EGEN sväljning ligger i samma hög som de tre foley-klippen i stället för att vara
  // en egen nyckel. Samma syfte = samma hög (ägarens regel), och hans röst emellanåt gör att
  // sväljningen ibland är HAN och ibland bara ett ljud — vilket är mer levande än endera.
  { fil: 'Svalj.m4a', namn: 'svalj' },
  { fil: 'swallow_gulp.mp3', namn: 'svalj' },
  { fil: 'swallow_1.mp3', namn: 'svalj' },
  { fil: 'swallow_drink.mp3', namn: 'svalj', klipp: [0.929, 1.441] },

  // --- kastet ---
  { fil: 'throw_swoosh.mp3', namn: 'kast' },
  // mjuk mat mot ett ansikte
  { fil: 'wet_impact.mp3', namn: 'traff_mjuk' },
  { fil: 'wet_impact_2.mp3', namn: 'traff_mjuk' },
  { fil: 'wet_splat.mp3', namn: 'traff_mjuk' },
  { fil: 'slime_impact.mp3', namn: 'traff_mjuk' },
  // hårda saker mot ett ansikte
  { fil: 'cartoon_bonk.mp3', namn: 'traff_hard' },
  { fil: 'cartoon_boong.mp3', namn: 'traff_hard' },
  { fil: 'male_hurt_impact_1.mp3', namn: 'traff_hard' },
  { fil: 'male_hurt_impact_2.mp3', namn: 'traff_hard' },
  { fil: 'male_hit_grunt.mp3', namn: 'traff_hard' },

  // --- prutten (bönor och kål) ---
  { fil: 'fart_1.mp3', namn: 'prutt' },
  { fil: 'fart_2.mp3', namn: 'prutt' },
  { fil: 'fart_3.mp3', namn: 'prutt' },
  { fil: 'fart_4.mp3', namn: 'prutt' },
  { fil: 'fart_5.mp3', namn: 'prutt' },
  { fil: 'fart_long.mp3', namn: 'prutt_lang' },

  // --- köket ---
  { fil: 'cabinet_open.mp3', namn: 'lucka' },
  { fil: 'unsuck_pop.mp3', namn: 'plopp_av' },
  // `bottle_blow` importeras INTE: det finns ingen flaska att blåsa i, och att bygga en
  // händelse enbart för att ett klipp finns är att sätta svansen först.
]

const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const ffProbe = (a) => execFileSync('ffprobe', a, { encoding: 'utf8' }).trim()
// ⚠️ ffmpeg skriver sina MÄTVÄRDEN på stderr och avslutar med 0. `execFileSync` ger bara
// stdout tillbaka vid lyckad körning, så en mätning läst därifrån blir alltid tom — och
// `topp()` returnerade `null` för varje fil. `spawnSync` ger båda strömmarna oavsett utfall.
const matt = (fil, filter, plock) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', fil, '-af', filter, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 26 })
  return plock(`${r.stderr || ''}${r.stdout || ''}`)
}

const lufs = (fil) => matt(fil, 'ebur128=framelog=quiet', (s) => {
  const m = [...s.matchAll(/I:\s*(-?[\d.]+)\s*LUFS/g)].pop()
  return m ? +m[1] : null
})
const topp = (fil) => matt(fil, 'volumedetect', (s) => {
  const m = /max_volume:\s*(-?[\d.]+)\s*dB/.exec(s)
  return m ? +m[1] : null
})
// Oviktad RMS. Behövs för klipp som är för korta för R128 (se MAL_RMS).
const rms = (fil) => matt(fil, 'volumedetect', (s) => {
  const m = /mean_volume:\s*(-?[\d.]+)\s*dB/.exec(s)
  return m ? +m[1] : null
})
const langd = (fil) => +ffProbe(['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', fil])
// Tystnadens gränser: första ljudet och sista ljudet, MÄTT — inte ett fast antal ms.
const tystnad = (fil) => {
  const s = matt(fil, 'silencedetect=noise=-42dB:d=0.10', (x) => x)
  const d = langd(fil)
  // Läs tystnaderna som INTERVALL. En tystnad utan `silence_end` löper till filens slut.
  const tyst = []
  for (const m of s.matchAll(/silence_start:\s*([\d.]+)([\s\S]*?)(?=silence_start:|$)/g)) {
    const e = /silence_end:\s*([\d.]+)/.exec(m[2])
    tyst.push({ fran: +m[1], till: e ? +e[1] : d })
  }
  // Inledande tystnad räknas bara om den börjar VID NOLL.
  const forst = tyst.find((t) => t.fran <= 0.001)
  const from = forst ? forst.till : 0
  // ⚠️ AVSLUTANDE tystnad är den som når filens SLUT — inte "den sista som hittades".
  // `cabinet_open` har en paus mitt i (0,229–0,378) och inget tyst slut alls; regeln
  // "sista silence_start" kapade då 1,77 s till 0,29 s och lämnade ett nästan tyst
  // fragment som behövde +35,9 dB för att nå nivån. Ett mellanrum är inte ett slut.
  const sist = tyst.find((t) => t.till >= d - 0.05 && t.fran > from + 0.15)
  const till = Math.min((sist ? sist.fran : d) + 0.06, d) // 60 ms svans så inget klipps tvärt
  // ⚠️ Reserv: `swallow_gulp` är 0,63 s och ÄR ett enda ljud — trimningen räknade fram
  // from = till och ffmpeg dog på "-to value smaller than -ss". En trimning som inte lämnar
  // något kvar är alltid fel; då är hela filen rätt svar.
  if (till - from < 0.15) return { from: 0, till: d }
  return { from, till }
}

if (!fs.existsSync(UT)) fs.mkdirSync(UT, { recursive: true })
const TMP = '.tmp-ljud'
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

const manifestFil = path.join(UT, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestFil, 'utf8'))
const grupper = {}
const rapport = []

console.log(`\n  IMPORTERA-LJUD → ${UT}   (mål ${MAL_LUFS} LUFS, topptak ${TOPP_TAK} dB)\n`)

for (const rad of KLIPP) {
  const kalla = path.join(KALLA, rad.fil)
  if (!fs.existsSync(kalla)) { console.log(`  ⚠ saknas: ${rad.fil}`); continue }

  ;(grupper[rad.namn] ||= []).push(rad)
  const nr = grupper[rad.namn].length
  const bas = grupper[rad.namn].length > 1 || KLIPP.filter((k) => k.namn === rad.namn).length > 1
    ? `${rad.namn}_${nr}` : rad.namn
  const utfil = path.join(UT, `${bas}.mp3`)

  // 1. klipp ut biten (angiven eller uppmätt tystnad)
  const rag = path.join(TMP, `${bas}.wav`)
  const [f0, f1] = rad.klipp || (() => { const t = tystnad(kalla); return [t.from, t.till] })()
  ff(['-i', kalla, '-ss', String(f0), '-to', String(f1), '-ac', '1', '-ar', '24000', rag])

  // 2. mät och räkna ut den FASTA förstärkningen
  const d = langd(rag)
  const iL = d >= 0.45 ? lufs(rag) : null
  let gain
  let hur
  if (iL != null && isFinite(iL) && iL > -60) { gain = MAL_LUFS - iL; hur = 'LUFS' }
  else { gain = MAL_RMS - rms(rag); hur = 'RMS ' } // för korta för R128

  // 3. förstärk + mjuk begränsare, koda till appens format
  ff(['-i', rag, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${(10 ** (TOPP_TAK / 20)).toFixed(4)}:level=disabled`,
    '-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', '24000', utfil])

  const uL = langd(utfil) >= 0.45 ? lufs(utfil) : null
  const uT = topp(utfil)
  rapport.push({ namn: rad.namn, fil: `${bas}.mp3`, kalla: rad.fil, d: langd(utfil), hur, gain, uL, uT })
  console.log(`  ${bas.padEnd(16)} ← ${rad.fil.padEnd(24)} ${langd(utfil).toFixed(2)}s  ` +
    `${hur} ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB → ${uL != null ? `${uL.toFixed(1)} LUFS` : 'kort'}  topp ${uT.toFixed(1)} dB`)
}

// --- manifestet: flera filer på samma namn blir ett FÄLT (varianter) ---
for (const [namn, rader] of Object.entries(grupper)) {
  const n = rader.length
  manifest[namn] = n === 1 ? `${namn}.mp3` : rader.map((_, i) => `${namn}_${i + 1}.mp3`)
}
const sorterat = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]))
if (!TORR) fs.writeFileSync(manifestFil, `${JSON.stringify(sorterat, null, 2)}\n`)

const flera = Object.entries(grupper).filter(([, r]) => r.length > 1)
console.log(`\n  ${rapport.length} klipp · ${Object.keys(grupper).length} nycklar` +
  ` · ${flera.length} med varianter: ${flera.map(([k, r]) => `${k}×${r.length}`).join(' ')}`)
const langa = rapport.filter((r) => r.uL != null)
if (langa.length) {
  const min = Math.min(...langa.map((r) => r.uL)); const max = Math.max(...langa.map((r) => r.uL))
  console.log(`  nivå: ${min.toFixed(1)} … ${max.toFixed(1)} LUFS (spridning ${(max - min).toFixed(1)} dB)` +
    ` · ${rapport.filter((r) => r.hur.trim() === 'RMS').length} för korta för R128, nivåsatta på RMS`)
}
console.log(TORR ? '\n  (--torr: manifest.json inte skrivet)\n' : `\n  manifest.json uppdaterat\n`)
