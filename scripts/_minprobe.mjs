// MINPROBE — vad KOSTAR en min, och hur mycket av den bär faktiskt information?
//
// Frågan kommer ur `docs/games/mata-munnen.md` §6 steg 0+2: varianter av varje min vore
// 3× hela riggen i GPU-minne (13 miner à 423×641 RGBA = 13,5 MB idag), så innan en enda
// variant klipps måste det mätas hur stor del av en min-lapp som verkligen SKILJER sig
// från neutralbilden. Resten är samma ansikte ritat en gång till, ovanpå sig självt.
//
// ⚠️ KONTROLLARMARNA FÖRST (CLAUDE.md: en mätare som inte kan skilja två KÄNDA lägen åt
// säger ingenting om det okända):
//   · `neutral mot neutral`         → måste ge 0 px över tröskeln. Gör den inte det mäter
//                                     sonden brus, inte min.
//   · `neutral mot neutral +6 px`   → måste ge ett STORT utslag. Gör den inte det kan
//                                     mätaren inte se en förändring alls.
//
// Måttet är per-pixel |Δ| i gråskala mellan två INRIKTADE helbilder ur `.tmp-ansikte/`
// (samma filer som `scripts/ansikte.mjs` klipper minerna ur), vägt med den ovala lappens
// egen alfa — en skillnad där lappen ändå är genomskinlig syns inte i spelet.
//
//   node scripts/_minprobe.mjs [--troskel 18] [--bild]
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const BILD = args.includes('--bild')
const TROSKLAR = [8, 12, 18, 26, 36]
const TROSKEL = +opt('--troskel', 18)

const TMP = '.tmp-ansikte'
const magick = (a, bin = false) => execFileSync('magick', a, { maxBuffer: 1 << 28, encoding: bin ? 'buffer' : 'utf8' })

// Samma tal som `scripts/ansikte.mjs` G.min — lappens oval.
const G_MIN = { cx: 373, cy: 452, rx: 168, ry: 226, mjuk: 34 }
const MINER = ['sur', 'acklad', 'het', 'lycksalig', 'fundersam', 'forvanad', 'aj', 'nojd', 'skratt',
  'gasp', 'chock', 'skeptisk', 'retas']

const manifest = JSON.parse(fs.readFileSync(path.join('public', 'ansikte', 'pappa', 'manifest.json'), 'utf8'))
const W = manifest.ruta.w
const H = manifest.ruta.h

// Gråskala ur en inriktad helbild, som rå Uint8Array W*H.
function gra(fil, extra = []) {
  const buf = magick([fil, ...extra, '-alpha', 'remove', '-background', 'black',
    '-colorspace', 'Gray', '-depth', '8', `gray:-`], true)
  if (buf.length !== W * H) throw new Error(`${fil}: ${buf.length} byte, väntade ${W * H}`)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.length)
}

// Lappens alfa: samma ellips + oskärpa som klippet gör, som en egen gråbild.
const alfaFil = path.join(TMP, '_probe_oval.png')
magick(['-size', `${W}x${H}`, 'xc:black', '-fill', 'white',
  '-draw', `ellipse ${G_MIN.cx},${G_MIN.cy} ${G_MIN.rx},${G_MIN.ry} 0,360`,
  '-blur', `0x${G_MIN.mjuk}`, '-colorspace', 'Gray', '-depth', '8', alfaFil])
const OVAL = gra(alfaFil)

const neutral = gra(path.join(TMP, 'neutral.png'))

// Skillnadens utbredning: antal px över varje tröskel + bbox för den valda tröskeln,
// allt VÄGT med lappens alfa (α/255) så en skillnad i lappens genomskinliga utkant inte
// räknas som synlig.
function matning(bild) {
  const antal = new Array(TROSKLAR.length).fill(0)
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  let summa = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const a = OVAL[i] / 255
      if (a < 0.04) continue
      const d = Math.abs(bild[i] - neutral[i]) * a
      summa += d
      for (let t = 0; t < TROSKLAR.length; t++) if (d >= TROSKLAR[t]) antal[t]++
      if (d >= TROSKEL) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  const bbox = x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  return { antal, bbox, summa: Math.round(summa / 1000) }
}

const mb = (w, h) => (w * h * 4) / (1024 * 1024)
const rad = (namn, m, storlek) => {
  const b = m.bbox
  console.log(`  ${namn.padEnd(22)} ${TROSKLAR.map((t, i) => String(m.antal[i]).padStart(6)).join(' ')}  ` +
    (b ? `${String(b.w).padStart(3)}x${String(b.h).padStart(3)} @ ${String(b.x).padStart(3)},${String(b.y).padStart(3)}` : '        — inget  ') +
    (storlek ? `  ${storlek}` : ''))
}

console.log(`\n  MIN-LAPPENS INFORMATION — ruta ${W}x${H}, tröskel för bbox = ${TROSKEL}\n`)
console.log(`  ${''.padEnd(22)} ${TROSKLAR.map((t) => `Δ≥${t}`.padStart(6)).join(' ')}  bbox (px över tröskeln)`)

// ---- kontrollarm 1: referensen mot sig själv. Måste bli noll rakt igenom. ----
const k0 = matning(neutral)
rad('KONTROLL själv', k0)
const nollOk = k0.antal.every((n) => n === 0) && !k0.bbox
console.log(`  ${nollOk ? '✓ noll — mätaren läser inte brus' : '✗ MÄTAREN ÄR FEL: identiska bilder ger utslag'}`)

// ---- kontrollarm 2: samma bild flyttad 6 px. Måste ge ett stort utslag. ----
const skifte = path.join(TMP, '_probe_skift.png')
magick([path.join(TMP, 'neutral.png'), '-background', 'none', '-virtual-pixel', 'none',
  '-distort', 'SRT', '0,0 1 0 0,6', skifte])
const k1 = matning(gra(skifte))
rad('KONTROLL +6 px', k1)
console.log(`  ${k1.antal[2] > 5000 ? '✓ stort utslag — mätaren SER en förändring' : '✗ MÄTAREN ÄR BLIND: en 6 px förskjutning syns inte'}\n`)

if (!nollOk || k1.antal[2] <= 5000) {
  console.log('  Kontrollarmarna föll — mätarmen är inte värd att läsa.\n')
  process.exit(1)
}

// ---- mätarm: varje min mot neutral ----
let sparadMb = 0
let nuMb = 0
const forslag = {}
for (const m of MINER) {
  const f = path.join(TMP, `${m}.png`)
  if (!fs.existsSync(f)) { console.log(`  ${m.padEnd(22)} (saknas i ${TMP} — kör npm run ansikte först)`); continue }
  const r = matning(gra(f))
  // En roll får bära ett FÄLT av varianter i manifestet; kostnadsfrågan gäller lappen som
  // faktiskt laddas, och `laddaAnsikte()` laddar EN — så primären (index 0) är rätt rad.
  const nu = Array.isArray(manifest.miner[m]) ? manifest.miner[m][0] : manifest.miner[m]
  nuMb += mb(nu.w, nu.h)
  // Förslaget: bbox + marginal för den mjuka kanten (samma sigma som lappen), klippt mot rutan.
  const mrg = G_MIN.mjuk
  const b = r.bbox
  const p = b ? {
    x: Math.max(0, b.x - mrg), y: Math.max(0, b.y - mrg),
    w: Math.min(W, b.x + b.w + mrg) - Math.max(0, b.x - mrg),
    h: Math.min(H, b.y + b.h + mrg) - Math.max(0, b.y - mrg),
  } : null
  if (p) { forslag[m] = p; sparadMb += mb(nu.w, nu.h) - mb(p.w, p.h) }
  rad(m, r, `nu ${nu.w}x${nu.h} = ${mb(nu.w, nu.h).toFixed(2)} MB → förslag ${p ? `${p.w}x${p.h} = ${mb(p.w, p.h).toFixed(2)} MB` : '—'}  (Σ|Δ| ${r.summa}k)`)
}

console.log(`\n  GPU-minne miner: nu ${nuMb.toFixed(1)} MB → förslag ${(nuMb - sparadMb).toFixed(1)} MB  (−${(100 * sparadMb / nuMb).toFixed(0)} %)`)
console.log(`  Med besparingen ryms ${Math.floor((nuMb) / ((nuMb - sparadMb) / MINER.length))} min-lappar på dagens budget (idag ${MINER.length}).\n`)

if (BILD) {
  // Skillnadskartan i bild: var ligger informationen egentligen?
  const rutor = []
  for (const m of MINER) {
    const f = path.join(TMP, `${m}.png`)
    if (!fs.existsSync(f)) continue
    const ut = path.join(TMP, `_diff_${m}.png`)
    magick([path.join(TMP, 'neutral.png'), f, '-alpha', 'remove', '-background', 'black',
      '-compose', 'difference', '-composite', '-colorspace', 'Gray',
      '(', alfaFil, ')', '-compose', 'multiply', '-composite',
      '-auto-level', ut])
    rutor.push('-label', m, ut)
  }
  const kart = path.join(TMP, '_minprobe.png')
  magick(['montage', '-background', '#222', '-fill', 'white', '-pointsize', '20',
    ...rutor, '-tile', '5x', '-geometry', '260x+2+2', kart])
  console.log(`  karta: ${kart}\n`)
}
