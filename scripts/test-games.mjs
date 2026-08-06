// Kör headless-harnessen över ett, flera eller alla spel — parallellt — och
// skriver en sammanfattningstabell. Wrappar scripts/test-game.mjs.
//
//   npm run test <id>            # ett spel
//   npm run test:all             # alla spel i registret
//   npm run test -- a b c        # flera
//   ... [--jobs 4] [--url http://localhost:5173] [--keep-shots]
//   npm run test -- --spara-baslinje    # spara dagens bilder som baslinje
//   npm run test -- --baslinje          # jämför mot baslinjen (opt-in, se bildkoll.mjs)
//
// Dragspel får automatiskt några generiska musdrag utöver standardtrycken.
// Skärmdumpar hamnar i .test-shots/ (gitignorerad).
// Exit 0 = alla gröna, 1 = minst ett spel har konsolfel.
import { spawn } from 'node:child_process'
import { readdirSync, statSync, mkdirSync, readFileSync, existsSync, copyFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }

const url = arg('--url', 'http://localhost:5173')
const jobs = Math.max(1, Number(arg('--jobs', 4)))
const shotDir = join(ROOT, '.test-shots')
const gamesDir = join(ROOT, 'src/games')

const allGames = () => readdirSync(gamesDir)
  .filter((f) => statSync(join(gamesDir, f)).isDirectory())
  .filter((f) => existsSync(join(gamesDir, f, 'index.js')))
  .sort()

const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--url', '--jobs'].includes(argv[i - 1])))
// npm run kan kasta om flaggor så ett flagg-värde hamnar bland spel-id:na. Ett okänt id
// ska ge ett tydligt meddelande, inte en ENOENT-stacktrace mitt i körningen.
const known = new Set(allGames())
const okand = positional.filter((p) => !known.has(p))
const valda = positional.filter((p) => known.has(p))
if (okand.length) console.log(`  ⚠ hoppar över okänt: ${okand.join(', ')}`)
if (positional.length && !valda.length) {
  console.error(`\n  ✗ inga giltiga spel-id angivna (${positional.join(', ')})\n`)
  process.exit(2)
}
const ids = flag('--all') || !valda.length ? allGames() : valda

mkdirSync(shotDir, { recursive: true })

// Dragspel behöver riktiga musdrag för att kärnloopen ska köras.
const inputOf = (id) => {
  const src = readFileSync(join(gamesDir, id, 'index.js'), 'utf8')
  const head = src.slice(Math.max(0, src.search(/export\s+default\s*\{/)))
  const m = head.match(/input\s*:\s*'(\w+)'/)
  return m ? m[1] : 'tap'
}
const GENERIC_DRAGS = '640,360>420,240;300,500>800,360;900,300>640,520'

// Baslinje-diff är OPT-IN (--baslinje): spardatan nollställs inte mellan körningar och
// spelen är fulla av Math.random(), så en diff är bara meningsfull när man medvetet
// jämför före/efter. Spara en baslinje med --spara-baslinje.
const baselineDir = join(shotDir, 'baseline')
const useBaseline = flag('--baslinje')
if (flag('--spara-baslinje')) mkdirSync(baselineDir, { recursive: true })

const runOne = (id) => new Promise((done) => {
  const input = inputOf(id)
  const args = ['scripts/test-game.mjs', id, '--url', url, '--shot', join(shotDir, `${id}.png`)]
  if (input === 'drag' || input === 'mixed') args.push('--drag', GENERIC_DRAGS)
  if (useBaseline) args.push('--baslinje', join(baselineDir, `${id}.png`))
  const t0 = Date.now()
  let out = ''
  const p = spawn(process.execPath, args, { cwd: ROOT })
  p.stdout.on('data', (d) => { out += d })
  p.stderr.on('data', (d) => { out += d })
  p.on('close', (code) => {
    let errors = []
    let fynd = []
    try {
      const r = JSON.parse(out.slice(out.indexOf('{')))
      errors = r.errors || []
      fynd = r.fynd || []
    } catch { errors = code === 0 ? [] : [out.trim().split('\n').pop()?.slice(0, 160) || 'okänt fel'] }
    done({ id, input, errors, fynd, ms: Date.now() - t0 })
  })
})

console.log(`\n  Testar ${ids.length} spel mot ${url} (${jobs} parallellt)\n`)

const results = []
const queue = [...ids]
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  while (queue.length) {
    const id = queue.shift()
    const r = await runOne(id)
    results.push(r)
    const fel = r.fynd.filter((f) => f.niva === 'fel')
    const varn = r.fynd.filter((f) => f.niva === 'varning')
    const mark = r.errors.length ? '✗' : fel.length ? '!' : '✓'
    const notis = [
      r.errors.length ? `${r.errors.length} konsolfel` : '',
      fel.length ? `⚑ ${fel.map((f) => f.kod).join(' ')}` : '',
      varn.length ? `⚠ ${varn.map((f) => f.kod).join(' ')}` : '',
    ].filter(Boolean).join('  ')
    console.log(`  ${mark} ${r.id.padEnd(26)} ${String(r.ms / 1000).padStart(5)}s  ${notis}`)
  }
}))

// Spara körningens skärmdumpar som ny baslinje att jämföra mot nästa gång.
if (flag('--spara-baslinje')) {
  let n = 0
  for (const r of results) {
    const src = join(shotDir, `${r.id}.png`)
    if (existsSync(src)) { copyFileSync(src, join(baselineDir, `${r.id}.png`)); n++ }
  }
  console.log(`\n  ⤓ ${n} skärmdumpar sparade som baslinje i .test-shots/baseline/`)
}

const failed = results.filter((r) => r.errors.length).sort((a, b) => a.id.localeCompare(b.id))
if (failed.length) {
  console.log('\n  Fel:\n')
  for (const f of failed) {
    console.log(`  ✗ ${f.id}`)
    for (const e of f.errors.slice(0, 4)) console.log(`      ${e}`)
  }
}
// Diagnostikloggens fynd: buggar som inte kastar ett enda konsolfel.
const medFynd = results.filter((r) => r.fynd.length).sort((a, b) => a.id.localeCompare(b.id))
if (medFynd.length) {
  console.log('\n  Loggfynd (.test-logs/<id>.json):\n')
  for (const r of medFynd) {
    console.log(`  ${r.fynd.some((f) => f.niva === 'fel') ? '⚑' : '⚠'} ${r.id}`)
    for (const f of r.fynd.slice(0, 5)) console.log(`      ${f.niva === 'fel' ? '✗' : '⚠'} ${f.kod} ×${f.n} — ${f.msg}`)
  }
}
console.log(`\n  ${failed.length ? '✗' : '✓'} ${results.length - failed.length}/${results.length} gröna · skärmdumpar i .test-shots/ · loggar i .test-logs/\n`)
process.exit(failed.length ? 1 : 0)
