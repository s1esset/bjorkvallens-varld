// Checkpoint för en NATTKÖRNING: flera faser, var och en en egen headless-session
// (`scripts/nattkorning.ps1` driver dem). Filen är sanningen om vad som är gjort —
// en fas som dör på kvotgränsen plockas upp av en NY session som läser den här
// i stället för att återuppta en kall historik (full omläsning utan cache).
//
//   node scripts/natt.mjs visa                      hela läget, kort
//   node scripts/natt.mjs visa F2                   en fas med sina spel
//   node scripts/natt.mjs spel <id> <status> [--commit sha] [--version v] [--notis "…"]
//        status: planerad | bygger | byggd | testad | committad | skippad | stoppad
//   node scripts/natt.mjs fas <F> <status> [--notis "…"]
//        status: vantar | pagar | klar | delvis
//   node scripts/natt.mjs logg "<rad>"              en rad i nattloggen (logg.md)
//   node scripts/natt.mjs kvot                      klockan + 5h/veckokvoten ur drivarens mätare
//                                                   (kvot.json) → "byggare max N" och ev. STOPP
//   node scripts/natt.mjs prova <id>                check --game + test + gamelogg i EN kompakt
//                                                   utskrift (orkestreraren är den dyra modellen —
//                                                   ett anrop och tjugo rader i stället för fyra
//                                                   anrop och hundra)
//
// Filerna ligger i .claude/state/natt/ (gitignorerad — arbetsläge, inte historik;
// historiken hamnar i docs/SESSIONS.md och docs/games/<id>.md §5).
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// NATT_DIR sätts av drivaren (och av dess simulering) — annars nattens vanliga katalog.
const DIR = process.env.NATT_DIR ? resolve(ROOT, process.env.NATT_DIR) : join(ROOT, '.claude/state/natt')
const FILE = join(DIR, 'plan.json')
const LOGG = join(DIR, 'logg.md')

const argv = process.argv.slice(2)
const cmd = argv[0]
const arg = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const nu = () => new Date().toLocaleString('sv-SE', { hour12: false })

const SPEL_STATUS = ['planerad', 'bygger', 'byggd', 'testad', 'committad', 'skippad', 'stoppad']
const FAS_STATUS = ['vantar', 'pagar', 'klar', 'delvis']

const load = () => {
  try { return JSON.parse(readFileSync(FILE, 'utf8')) } catch (e) {
    console.error(`✗ kan inte läsa ${FILE}: ${e.message}`); process.exit(1)
  }
}
const save = (p) => { mkdirSync(DIR, { recursive: true }); writeFileSync(FILE, JSON.stringify(p, null, 2) + '\n', 'utf8') }
const logg = (rad) => { mkdirSync(DIR, { recursive: true }); appendFileSync(LOGG, `- ${nu()} · ${rad}\n`, 'utf8') }

const hittaSpel = (p, id) => {
  for (const f of p.faser) for (const s of f.spel ?? []) if (s.id === id) return { fas: f, spel: s }
  console.error(`✗ inget spel "${id}" i planen`); process.exit(1)
}

switch (cmd) {
  case 'visa': {
    const p = load()
    const bara = argv[1]
    for (const f of p.faser) {
      if (bara && f.id !== bara) continue
      console.log(`${f.id}  ${f.status.padEnd(7)} ${f.titel ?? ''}${f.notis ? '  — ' + f.notis : ''}`)
      for (const s of f.spel ?? []) {
        const extra = [s.commit && `commit ${s.commit}`, s.version, s.notis].filter(Boolean).join(' · ')
        console.log(`    ${s.id.padEnd(22)} ${s.status.padEnd(10)} ${extra}`)
      }
    }
    break
  }
  case 'spel': {
    const [, id, status] = argv
    if (!SPEL_STATUS.includes(status)) { console.error(`✗ status måste vara ${SPEL_STATUS.join('|')}`); process.exit(2) }
    const p = load()
    const { spel } = hittaSpel(p, id)
    spel.status = status
    if (arg('--commit')) spel.commit = arg('--commit')
    if (arg('--version')) spel.version = arg('--version')
    if (arg('--notis')) spel.notis = [spel.notis, arg('--notis')].filter(Boolean).join(' · ')
    spel.uppdaterad = nu()
    save(p)
    logg(`${id} → ${status}${arg('--notis') ? ' — ' + arg('--notis') : ''}`)
    console.log(`✓ ${id}: ${status}`)
    break
  }
  case 'fas': {
    const [, fid, status] = argv
    if (!FAS_STATUS.includes(status)) { console.error(`✗ status måste vara ${FAS_STATUS.join('|')}`); process.exit(2) }
    const p = load()
    const f = p.faser.find((x) => x.id === fid)
    if (!f) { console.error(`✗ ingen fas "${fid}"`); process.exit(1) }
    f.status = status
    if (arg('--notis')) f.notis = arg('--notis')
    f.uppdaterad = nu()
    save(p)
    logg(`fas ${fid} → ${status}${arg('--notis') ? ' — ' + arg('--notis') : ''}`)
    console.log(`✓ fas ${fid}: ${status}`)
    break
  }
  case 'logg': {
    logg(argv[1] ?? '')
    console.log('✓ loggat')
    break
  }
  case 'kvot': {
    // kvot.json skrivs av drivaren var 30:e s ur sessionens rate_limit_event (riktig mätare,
    // inte en uppskattning). Reglerna står i plan.json → kvot; förvalen nedan.
    const p = load()
    const r = { byggareTak: 0.82, perByggare: 0.075, maxByggare: 4, fasStopp: 0.93, veckoTak: 0.74, ...(p.kvot ?? {}) }
    const klocka = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    let k = null
    try { k = JSON.parse(readFileSync(join(DIR, 'kvot.json'), 'utf8').replace(/^﻿/, '')) } catch {}
    if (!k) { console.log(`klockan ${klocka} · kvot okänd (ingen mätning än) · byggare max 2`); break }
    const nu = Date.now()
    const fem = nu >= Date.parse(k.femAterstalls) ? 0 : k.fem
    const sju = nu >= Date.parse(k.sjuAterstalls) ? 0 : k.sju
    const pct = (x) => `${Math.round(x * 100)} %`
    const hhmm = (s) => new Date(Date.parse(s)).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    let max = Math.max(0, Math.min(r.maxByggare, Math.floor((r.byggareTak - fem) / r.perByggare + 1e-9)))
    const stopp = []
    if (fem >= r.fasStopp) stopp.push(`5h-kvoten ${pct(fem)}`)
    if (sju >= r.veckoTak) stopp.push(`veckokvoten ${pct(sju)} (nattens tak ${pct(r.veckoTak)})`)
    if (stopp.length) max = 0
    console.log(`klockan ${klocka} · 5h ${pct(fem)} (återställs ${hhmm(k.femAterstalls)}) · vecka ${pct(sju)} · byggare max ${max}`)
    if (stopp.length) console.log(`STOPP: ${stopp.join(' · ')} — committa det som är grönt, sätt spelens status rätt, \`natt.mjs fas <F> pagar --notis "kvotpaus"\` och avsluta sessionen. Drivaren sover till återställningen.`)
    else if (max === 0) console.log('INGA NYA BYGGARE: testa/committa det som redan är byggt, sätt fasen pagar --notis "kvotpaus" och avsluta.')
    break
  }
  case 'prova': {
    const id = argv[1]
    if (!id) { console.error('✗ prova <id>'); process.exit(2) }
    const kor = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 })
    const svans = (r, n) => `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-n).map((s) => '  ' + s).join('\n')
    const chk = kor(['scripts/check.mjs', '--game', id])
    console.log(`check  (kod ${chk.status})\n${svans(chk, 6)}`)
    const tst = kor(['scripts/test-games.mjs', id])
    console.log(`test   (kod ${tst.status})\n${svans(tst, 10)}`)
    const loggFil = join(ROOT, '.test-logs', `${id}.json`)
    if (existsSync(loggFil)) {
      const j = JSON.parse(readFileSync(loggFil, 'utf8'))
      const s = j.korning?.summary ?? {}
      const v = s.vanligast ?? {}
      const fynd = (j.fynd ?? s.fynd ?? []).map((f) => `${f.niva ?? f.level ?? '?'}:${f.typ ?? f.kod ?? f.id ?? '?'}`)
      console.log(`logg   fel ${s.fel ?? '?'} · varningar ${s.varningar ?? '?'} · speltid ${Math.round((s.speltidMs ?? 0) / 100) / 10} s · snittruta ${s.snittRutaMs ?? '?'} ms · långa rutor ${s.langaRutor ?? '?'}`)
      console.log(`       drag/ratt ${v['drag/ratt'] ?? 0} · drag/foremal ${v['drag/foremal'] ?? 0} · input/ned ${v['input/ned'] ?? 0} · rost/say ${v['rost/say'] ?? 0} · tweens ${s.tweensSkapade ?? '?'}`)
      console.log(`       fynd: ${fynd.length ? fynd.join(', ') : 'inga'}${j.tomScen ? ' · TOM SCEN: ' + JSON.stringify(j.tomScen).slice(0, 120) : ''}`)
    } else console.log('logg   saknas')
    console.log(`bild   .test-shots/${id}.png  ← öppna och titta`)
    process.exit(chk.status || tst.status ? 1 : 0)
  }
  default:
    console.log('användning: natt.mjs visa [F] | spel <id> <status> | fas <F> <status> | logg "<rad>" | kvot | prova <id>')
    process.exit(2)
}
