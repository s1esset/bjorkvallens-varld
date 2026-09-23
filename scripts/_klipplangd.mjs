// Längden på röstklippet för en exakt replik (ffprobe). Engångshjälp för ÅTGÄRDER V24.
//   node scripts/_klipplangd.mjs "Replik ett" "Replik två" …
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const m = JSON.parse(fs.readFileSync('public/audio/voice/manifest.json', 'utf8'))
for (const t of process.argv.slice(2)) {
  const f = m[t]
  if (!f) { console.log(`   –   INGET KLIPP  "${t}"`); continue }
  const s = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `public/audio/voice/${f}`]).toString().trim()
  console.log(`${(+s).toFixed(2).padStart(5)} s  "${t}"`)
}
