// Checkpoint-fil för pågående pipeline-körningar. Överlever krasch/strömavbrott,
// så att en NY session kan plocka upp exakt där den förra slutade (/aterta).
//
//   node scripts/korning.mjs start /spel stjarnflykten --titel "Stjärnflykten"
//   node scripts/korning.mjs steg bygg --nasta "npm run test stjarnflykten"
//   node scripts/korning.mjs artefakt commit a1b2c3d
//   node scripts/korning.mjs notis "drag-spel, testa med --drag"
//   node scripts/korning.mjs visa
//   node scripts/korning.mjs klar
//
// Filen ligger i .claude/state/korning.json (gitignorerad — den är arbetsläge,
// inte projekt-historik; historiken hamnar i docs/SESSIONS.md).
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, '.claude/state')
const FILE = join(DIR, 'korning.json')

const argv = process.argv.slice(2)
const cmd = argv[0]
const arg = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const now = () => new Date().toISOString()

const load = () => { try { return JSON.parse(readFileSync(FILE, 'utf8')) } catch { return null } }
const save = (s) => { mkdirSync(DIR, { recursive: true }); writeFileSync(FILE, JSON.stringify(s, null, 2) + '\n', 'utf8') }

switch (cmd) {
  case 'start': {
    // git-bash gör om "/spel" till en Windows-sökväg — normalisera tillbaka.
    const kommando = '/' + String(argv[1] ?? '').replace(/\\/g, '/').split('/').filter(Boolean).pop()
    const state = {
      kommando, id: argv[2] || null, titel: arg('--titel'),
      startad: now(), uppdaterad: now(),
      steg: arg('--steg', 'spec'), klara: [],
      artefakter: { spec: null, commits: [] },
      nasta: arg('--nasta', ''), anteckningar: arg('--notis', ''),
    }
    save(state)
    console.log(`✓ körning startad: ${state.kommando} ${state.id ?? ''} (steg: ${state.steg})`)
    break
  }
  case 'steg': {
    const s = load()
    if (!s) { console.error('✗ ingen aktiv körning'); process.exit(1) }
    if (s.steg && s.steg !== argv[1] && !s.klara.includes(s.steg)) s.klara.push(s.steg)
    s.steg = argv[1]
    s.uppdaterad = now()
    if (arg('--nasta') !== null) s.nasta = arg('--nasta')
    save(s)
    console.log(`✓ steg: ${s.steg}  (klara: ${s.klara.join(', ') || '—'})`)
    break
  }
  case 'artefakt': {
    const s = load()
    if (!s) { console.error('✗ ingen aktiv körning'); process.exit(1) }
    const [, key, value] = argv
    if (key === 'commit') s.artefakter.commits.push(value)
    else s.artefakter[key] = value
    s.uppdaterad = now()
    save(s)
    console.log(`✓ ${key}: ${value}`)
    break
  }
  case 'notis': {
    const s = load()
    if (!s) { console.error('✗ ingen aktiv körning'); process.exit(1) }
    s.anteckningar = [s.anteckningar, argv[1]].filter(Boolean).join(' · ')
    s.uppdaterad = now()
    save(s)
    console.log('✓ noterat')
    break
  }
  case 'visa': {
    const s = load()
    if (!s) { console.log('ingen aktiv körning'); break }
    console.log(JSON.stringify(s, null, 2))
    break
  }
  case 'klar': {
    if (existsSync(FILE)) rmSync(FILE)
    console.log('✓ körning avslutad')
    break
  }
  default:
    console.log('användning: korning.mjs start|steg|artefakt|notis|visa|klar')
    process.exit(2)
}
