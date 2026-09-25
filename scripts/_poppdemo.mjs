// Lyssningsdemo av popcornkaskaden: 40 korn som poppar under ~6 s med den ljudspärr planen
// föreslår (minst GAP ms mellan två popp-ljud — bilden poppar ändå, bara ljudet glesas ut).
//
//   node scripts/_poppdemo.mjs [utfil.mp3] [--gap 80] [--utan-sparr]
//
// Spärren är samma som `popcornkalaset` ska ha i koden: ett popp som kommer inom GAP ms efter
// det förra SPELAS INTE (ingen kö — ett köat popp hörs när kornet redan ligger i skålen).
// `sfx()`s eget golv (30 ms per namn) räcker inte: 33 popp/s svämmar över.
import { spawnSync, execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const utfil = args.find((a) => a.endsWith('.mp3')) || join(ROOT, '.test-shots', 'popp_demo.mp3')
const gi = args.indexOf('--gap')
const GAP = gi >= 0 ? Number(args[gi + 1]) : 80
const UTAN = args.includes('--utan-sparr')
const SR = 24000

function lasPcm(fil) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', fil, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 26 })
  const b = r.stdout
  return new Float32Array(b.buffer, b.byteOffset, b.length / 4)
}
const varianter = [1, 2, 3, 4, 5, 6].map((n) => lasPcm(join(ROOT, 'public/audio/sfx', `popp_${n}.mp3`)))

// Seedad slump, så två körningar ger samma kaskad.
let s = 7
const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
const normal = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())

// Kornen blir varma i olika takt: smälltiderna klumpar sig kring mitten (kaskaden), några
// tidiga "först ut"-korn och en svans. Två korn poppar aldrig (farmorskorn).
const tider = []
for (let i = 0; i < 38; i++) tider.push(Math.min(6.2, Math.max(0.6, 3.2 + normal() * 1.0)))
tider.sort((a, b) => a - b)

const langd = Math.ceil(7 * SR)
const mix = new Float32Array(langd)
let senast = -1e9, spelade = 0, glesade = 0
for (const t of tider) {
  const ms = t * 1000
  if (!UTAN && ms - senast < GAP) { glesade++; continue }
  senast = ms
  spelade++
  const v = varianter[Math.floor(r() * varianter.length)]
  const start = Math.round(t * SR)
  for (let i = 0; i < v.length && start + i < langd; i++) mix[start + i] += v[i]
}
let topp = 0
for (const x of mix) topp = Math.max(topp, Math.abs(x))

const tmp = mkdtempSync(join(tmpdir(), 'poppdemo-'))
try {
  const wav = join(tmp, 'demo.wav')
  const buf = Buffer.alloc(44 + langd * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + langd * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(langd * 2, 40)
  for (let i = 0; i < langd; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i])) * 32767), 44 + i * 2)
  writeFileSync(wav, buf)
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-b:a', '96k', utfil])
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
console.log(`${tider.length} popp · ${spelade} hörs · ${glesade} glesade (spärr ${UTAN ? 'AV' : GAP + ' ms'}) · topp ${(20 * Math.log10(topp)).toFixed(1)} dB → ${utfil}`)
