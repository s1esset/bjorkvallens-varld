/**
 * Hämtar de egen-hostade typsnitten (SIL OFL 1.1) till public/fonts så att
 * appen fungerar helt offline. Källa: Fontsource via jsDelivr (latinskt subset
 * täcker å/ä/ö). Kräver nät EN gång; därefter ligger filerna i repo:t.
 *
 * Kör:  npm run assets
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'fonts')
await mkdir(outDir, { recursive: true })

const FONTS = [
  { out: 'fredoka-600.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-600-normal.woff2' },
  { out: 'baloo2-700.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/baloo-2@latest/latin-700-normal.woff2' },
  { out: 'nunito-400.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-400-normal.woff2' },
  { out: 'nunito-700.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-700-normal.woff2' },
]

let ok = 0
for (const f of FONTS) {
  try {
    const res = await fetch(f.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(join(outDir, f.out), buf)
    console.log('  ✓', f.out, `(${(buf.length / 1024).toFixed(0)} KB)`)
    ok++
  } catch (err) {
    console.warn('  ✗', f.out, '-', err.message, '(appen faller tillbaka till systemtypsnitt)')
  }
}

await writeFile(
  join(outDir, 'OFL.txt'),
  'Fredoka, Baloo 2 och Nunito licensieras under SIL Open Font License 1.1.\n' +
    'Se https://openfontlicense.org . Behåll denna fil tillsammans med WOFF2-filerna.\n',
)

console.log(`Klart: ${ok}/${FONTS.length} typsnitt hämtade.`)
