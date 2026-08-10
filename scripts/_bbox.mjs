// Var ligger ett exakt RGB-falt i en skarmdump? Skriver ut bbox + antal.
//   node scripts/_bbox.mjs <bild> <#rrggbb>
import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
const [fil, hex] = process.argv.slice(2)
const want = parseInt(hex.replace('#', ''), 16)
const png = PNG.sync.read(readFileSync(fil))
let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
  const i = (y * png.width + x) * 4
  if (((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]) !== want) continue
  n++; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y
}
console.log(`${hex}: ${n} px · bbox ${x0},${y0} → ${x1},${y1} (${x1 - x0 + 1}x${y1 - y0 + 1})`)
