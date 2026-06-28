/**
 * Genererar app-ikoner (PNG) helt utan externa bibliotek — endast Nodes
 * inbyggda zlib. Ritar en vänlig maskot ("Bobo") på Barnspels orange platta.
 *
 * Kör:  npm run icons
 * Skapar: public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png
 *
 * Teknik: rita hårda former i 4x superupplösning -> nedsampla = mjuk kantutjämning.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// ---------- PNG-kodning ----------
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0 // filter 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---------- enkel rasterare (hårda former) ----------
function canvas(size) {
  return { w: size, h: size, data: Buffer.alloc(size * size * 4) }
}
function px(c, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return
  const i = (y * c.w + x) * 4
  c.data[i] = r
  c.data[i + 1] = g
  c.data[i + 2] = b
  c.data[i + 3] = a
}
function rect(c, x0, y0, x1, y1, col) {
  for (let y = Math.max(0, y0 | 0); y < Math.min(c.h, y1 | 0); y++)
    for (let x = Math.max(0, x0 | 0); x < Math.min(c.w, x1 | 0); x++) px(c, x, y, col)
}
function disc(c, cx, cy, r, col) {
  const r2 = r * r
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx,
        dy = y - cy
      if (dx * dx + dy * dy <= r2) px(c, x, y, col)
    }
}
function roundedRect(c, x0, y0, x1, y1, r, col) {
  rect(c, x0 + r, y0, x1 - r, y1, col)
  rect(c, x0, y0 + r, x1, y1 - r, col)
  disc(c, x0 + r, y0 + r, r, col)
  disc(c, x1 - r, y0 + r, r, col)
  disc(c, x0 + r, y1 - r, r, col)
  disc(c, x1 - r, y1 - r, r, col)
}
function smile(c, cx, cy, r, thick, col) {
  // nedre båge (leende). theta 0..PI ger nedre halvan (y nedåt).
  for (let t = 0.12 * Math.PI; t <= 0.88 * Math.PI; t += 0.004) {
    const x = cx + r * Math.cos(t)
    const y = cy + r * Math.sin(t)
    disc(c, x, y, thick, col)
  }
}
function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]
}

// ---------- nedsampling (4x box) ----------
function downsample(src, factor) {
  const w = src.w / factor,
    h = src.h / factor
  const out = canvas(w)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      for (let sy = 0; sy < factor; sy++)
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * src.w + (x * factor + sx)) * 4
          const sa = src.data[i + 3]
          r += src.data[i] * sa
          g += src.data[i + 1] * sa
          b += src.data[i + 2] * sa
          a += sa
        }
      const n = factor * factor
      const oi = (y * w + x) * 4
      if (a > 0) {
        out.data[oi] = Math.round(r / a)
        out.data[oi + 1] = Math.round(g / a)
        out.data[oi + 2] = Math.round(b / a)
      }
      out.data[oi + 3] = Math.round(a / n)
    }
  return out
}

// ---------- maskoten ----------
const COL = {
  orange: hex('#FF8A3D'),
  orangeDark: hex('#F5731E'),
  cream: hex('#FFF3D6'),
  ink: hex('#3A2A1E'),
  cheek: hex('#FFB0A0'),
  star: hex('#FFE08A'),
}

function drawIcon(size, { maskable }) {
  const ss = 4
  const S = size * ss
  const c = canvas(S)
  const m = maskable ? 0 : Math.round(S * 0.06)
  const radius = maskable ? 0 : Math.round(S * 0.22)

  // bakgrundsplatta
  if (maskable) rect(c, 0, 0, S, S, COL.orange)
  else roundedRect(c, m, m, S - m, S - m, radius, COL.orange)

  // mjuk botten-skugga för djup
  const inset = maskable ? Math.round(S * 0.1) : m + Math.round(S * 0.04)
  // ansiktscirkel
  const cx = S / 2
  const cy = S * 0.52
  const faceR = S * (maskable ? 0.3 : 0.33)
  disc(c, cx, cy + faceR * 0.06, faceR, COL.orangeDark) // liten skuggkant
  disc(c, cx, cy, faceR, COL.cream)

  // öron/knoppar (små cirklar upptill) för charm
  disc(c, cx - faceR * 0.78, cy - faceR * 0.78, faceR * 0.26, COL.cream)
  disc(c, cx + faceR * 0.78, cy - faceR * 0.78, faceR * 0.26, COL.cream)

  // kinder
  disc(c, cx - faceR * 0.56, cy + faceR * 0.22, faceR * 0.17, COL.cheek)
  disc(c, cx + faceR * 0.56, cy + faceR * 0.22, faceR * 0.17, COL.cheek)

  // ögon
  const eyeR = faceR * 0.13
  const eyeDx = faceR * 0.36
  const eyeY = cy - faceR * 0.12
  disc(c, cx - eyeDx, eyeY, eyeR, COL.ink)
  disc(c, cx + eyeDx, eyeY, eyeR, COL.ink)
  // glansprick i ögonen
  disc(c, cx - eyeDx + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35, COL.cream)
  disc(c, cx + eyeDx + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35, COL.cream)

  // leende
  smile(c, cx, cy + faceR * 0.05, faceR * 0.42, faceR * 0.07, COL.ink)

  // liten stjärna uppe till höger
  if (!maskable) {
    const sx = S * 0.74
    const sy = S * 0.24
    disc(c, sx, sy, S * 0.05, COL.star)
  }

  return downsample(c, ss)
}

function save(name, size, opts) {
  const img = drawIcon(size, opts)
  writeFileSync(join(outDir, name), encodePNG(img.w, img.h, img.data))
  console.log('  ✓', name, `${size}x${size}`)
}

console.log('Genererar ikoner i', outDir)
save('icon-192.png', 192, { maskable: false })
save('icon-512.png', 512, { maskable: false })
save('maskable-512.png', 512, { maskable: true })
save('apple-touch-icon.png', 180, { maskable: true })
console.log('Klart.')
