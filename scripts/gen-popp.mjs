// Syntetiserar popcornpoppen till `popcornkalaset`: sex KORTA varianter popp_1…popp_6.
//
//   node scripts/gen-popp.mjs          → public/audio/sfx/popp_<n>.mp3 + manifestnyckeln "popp"
//   node scripts/gen-popp.mjs --torr   → bara tabellen, skriver ingenting
//
// VARFÖR SYNTES. Det enda popp-klippet i appen (`pop.mp3`) är ett bubbelplopp på 1,05 s —
// fyrtio sådana i en kaskad svämmar över allt. Ägaren 2026-09-25: "ett litet kort pop så vi
// inte svämmar över med ljud". MOSS (foley-modellen) är brusig för knastertorra korta ljud,
// och en syntes ger exakt längd, exakt nivå och egen licens. Deterministisk (seedad), så en
// omkörning ger samma filer.
//
// ETT POPP = fyra lager, alla under ~70 ms:
//   klick   vitt brus genom ett högpass, avklingning 1,2 ms — själva smällen när skalet brister
//   pok     en sinus som glider ner från 1,35·f0 till f0 på några ms — kornets "kropp"
//   delton  2,3·f0 med halva avklingningen — gör att det låter ihåligt, inte som en ren ton
//   fjun    bandpassat brus kring 2,5 kHz, 20 ms — det lätta fluffet efter smällen
//
// NIVÅ. Appen normaliserar inte per klipp (`_playSample` spelar filen rakt av), så filen måste
// bära nivån. Mål: oviktad RMS (`volumedetect` mean_volume) −24 dB — tystare än `plopp` (−21,6)
// eftersom poppen spelas många gånger i rad, högre än `tap` (−28,5). Aldrig toppnormalisering:
// R128 kan inte mäta under 0,4 s och toppen på en smäll säger ingenting om hur hög den låter
// (minnet: ljudimport-matning). Toppen hålls under −1 dB.
//
// Manifestet är APP-BRETT: nyckeln `popp` prövades mot `sample('popp')`/`sfx('popp')` i src/
// (ingen användare) innan den lades till. `<namn>_<tal>.mp3` grupperas till en variantserie
// även av `gen-sfx.py`s manifestbygge (ÅTGÄRDER V20), så en senare `npm run sfx` behåller den.
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UT = join(ROOT, 'public/audio/sfx')
const TORR = process.argv.includes('--torr')
const SR = 24000 // samma som resten av public/audio/sfx (24 kHz mono 96 kbps)
const LANGD = 0.075
const MAL_RMS = -24
const MAX_TOPP = -1

// Sex korn: grundton, pokets avklingning (s), klickets styrka, fjunets styrka.
const VARIANTER = [
  { f0: 390, tau: 0.017, klick: 1.0, fjun: 0.1 },
  { f0: 470, tau: 0.015, klick: 0.9, fjun: 0.08 },
  { f0: 560, tau: 0.013, klick: 1.0, fjun: 0.12 },
  { f0: 650, tau: 0.012, klick: 0.8, fjun: 0.1 },
  { f0: 760, tau: 0.010, klick: 1.0, fjun: 0.14 },
  { f0: 880, tau: 0.009, klick: 0.9, fjun: 0.1 },
]

function slump(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// RBJ-bandpass (konstant toppförstärkning 0 dB).
function bandpass(f, q) {
  const w = (2 * Math.PI * f) / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w)
  const a0 = 1 + a
  const k = { b0: a / a0, b1: 0, b2: -a / a0, a1: (-2 * c) / a0, a2: (1 - a) / a0 }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  return (x) => {
    const y = k.b0 * x + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    return y
  }
}

function syntes(v, seed) {
  const r = slump(seed)
  const n = Math.round(LANGD * SR)
  const ut = new Float32Array(n)
  const bp = bandpass(2500, 1.4)
  let hpPrev = 0, hpUt = 0
  let fas1 = r() * Math.PI * 2, fas2 = r() * Math.PI * 2
  const f0 = v.f0 * (0.97 + r() * 0.06)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    // klick: brus genom ett enpoligt högpass
    const brus = r() * 2 - 1
    hpUt = 0.85 * (hpUt + brus - hpPrev)
    hpPrev = brus
    const klick = v.klick * hpUt * Math.exp(-t / 0.0012)
    // pok + delton: glidande sinus, mjuk 0,6 ms-attack så att smällen inte blir ett DC-hack
    const f = f0 * (1 + 0.35 * Math.exp(-t / 0.004))
    fas1 += (2 * Math.PI * f) / SR
    fas2 += (2 * Math.PI * f * 2.3) / SR
    const attack = Math.min(1, t / 0.0006)
    const pok = 0.7 * attack * Math.exp(-t / v.tau) * Math.sin(fas1)
    const delton = 0.25 * attack * Math.exp(-t / (v.tau / 2)) * Math.sin(fas2)
    // fjun: bandpassat brus
    const fjun = v.fjun * bp(r() * 2 - 1) * Math.exp(-t / 0.02) * 3
    // de sista 10 ms tonas ut till exakt noll — ett klipp som slutar mitt i en våg knäpper
    const utton = Math.min(1, (LANGD - t) / 0.01)
    ut[i] = (klick + pok + delton + fjun) * utton
  }
  return ut
}

function wav(samples, gain) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  return buf
}

// ffmpeg skriver volumedetect-statistiken på stderr, även när körningen lyckas.
function volym(fil) {
  const text = spawnSync('ffmpeg', ['-hide_banner', '-i', fil, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
  const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(text)?.[1])
  const max = Number(/max_volume: (-?[\d.]+) dB/.exec(text)?.[1])
  return { mean, max }
}
function langd(fil) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fil], { encoding: 'utf8' }).trim())
}
function mp3(wavFil, mp3Fil) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wavFil, '-ac', '1', '-ar', String(SR), '-b:a', '96k', mp3Fil])
}

const tmp = mkdtempSync(join(tmpdir(), 'popp-'))
const rader = []
try {
  VARIANTER.forEach((v, i) => {
    const nr = i + 1
    const s = syntes(v, 1000 + nr)
    const w = join(tmp, `popp_${nr}.wav`)
    const m = join(tmp, `popp_${nr}.mp3`)
    // Två varv: mät efter kodningen (mp3 ändrar nivån lite) och justera förstärkningen.
    let gain = 0.5
    let niva
    for (let varv = 0; varv < 3; varv++) {
      writeFileSync(w, wav(s, gain))
      mp3(w, m)
      niva = volym(m)
      const tillRms = MAL_RMS - niva.mean
      const tillTopp = MAX_TOPP - niva.max
      const steg = Math.min(tillRms, tillTopp)
      if (Math.abs(steg) < 0.3) break
      gain *= 10 ** (steg / 20)
    }
    const slut = join(UT, `popp_${nr}.mp3`)
    if (!TORR) writeFileSync(slut, readFileSync(m))
    rader.push({ fil: `popp_${nr}.mp3`, f0: v.f0, 'längd s': langd(m).toFixed(3), 'mean dB': niva.mean, 'max dB': niva.max })
  })
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
console.table(rader)

if (!TORR) {
  const mfil = join(UT, 'manifest.json')
  const man = JSON.parse(readFileSync(mfil, 'utf8'))
  man.popp = VARIANTER.map((_, i) => `popp_${i + 1}.mp3`)
  const sorterad = Object.fromEntries(Object.keys(man).sort().map((k) => [k, man[k]]))
  writeFileSync(mfil, JSON.stringify(sorterad, null, 2) + '\n')
  console.log('✓ manifest: "popp" →', man.popp.length, 'varianter')
} else {
  console.log('(torr körning — ingenting skrivet)')
}
