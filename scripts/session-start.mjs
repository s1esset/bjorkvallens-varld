// Körs av SessionStart-hooken. Ger nästa session ett läge på tre rader:
// pågående körning (efter krasch/strömavbrott), okommitterat arbete, version.
// Måste vara snabb och tyst — inga nätanrop, ingen webbläsare.
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => { try { return readFileSync(join(ROOT, p), 'utf8') } catch { return null } }
const sh = (c) => { try { return execSync(c, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' } }

const out = []

// 1. Oavslutad pipeline-körning?
const statePath = join(ROOT, '.claude/state/korning.json')
if (existsSync(statePath)) {
  try {
    const s = JSON.parse(readFileSync(statePath, 'utf8'))
    if (s.steg !== 'klar') {
      out.push(`⏸  OAVSLUTAD KÖRNING: ${s.kommando} ${s.id ?? ''} — steg "${s.steg}" (klara: ${s.klara?.join(', ') || '—'})`)
      if (s.nasta) out.push(`   nästa: ${s.nasta}`)
      out.push('   → kör /aterta för att fortsätta, eller radera .claude/state/korning.json')
    }
  } catch { /* trasig state-fil, strunt i den */ }
}

// 2. Okommitterat arbete
const dirty = sh('git status --porcelain').split('\n').filter(Boolean)
if (dirty.length) {
  const games = new Set(dirty.map((l) => l.match(/src\/games\/([^/]+)\//)?.[1]).filter(Boolean))
  out.push(`●  ${dirty.length} okommitterade filer${games.size ? ` (spel: ${[...games].join(', ')})` : ''}`)
}

// 3. Version + senaste commit
const pkg = JSON.parse(read('package.json') || '{}')
out.push(`ℹ  v${pkg.version ?? '?'} · ${sh('git log -1 --format="%h %s"').slice(0, 72)}`)

if (out.length) console.log(out.join('\n'))
