#!/usr/bin/env node
// npm run deploy - publicera det som ar committat till GitHub Pages.
//
// Varfor ett eget kommando i stallet for att lata `npm run build` deploya:
// bygget kors ocksa av `npm run serve` och av testharnessen, och en publicering
// far aldrig ske som bieffekt av att nagon tittar pa appen lokalt. Publicering
// ska vara ett medvetet beslut - darfor ett eget verb.
//
// Grinden ligger FORE pushen med flit: varje push till master publicerar direkt
// till barnens telefon, sa ett rott `check` far aldrig na dit.
//
//   node scripts/deploy.mjs            grind -> push -> folj bygget
//   node scripts/deploy.mjs --snabb    hoppa over `npm run check` (bara docs-andringar)

import { execFileSync, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const SNABB = process.argv.includes('--snabb')
const REPO = 's1esset/bjorkvallens-varld'
const SAJT = 'https://s1esset.github.io/bjorkvallens-varld/'

const sh = (cmd) => execSync(cmd, { encoding: 'utf-8' }).trim()
const kor = (cmd) => execSync(cmd, { stdio: 'inherit' })

// gh ligger inte alltid i PATH i ett skal som startades fore installationen.
const GH_FALLBACK = 'C:\\Program Files\\GitHub CLI\\gh.exe'
function ghBin() {
  try {
    execSync('gh --version', { stdio: 'ignore' })
    return 'gh'
  } catch {
    return existsSync(GH_FALLBACK) ? GH_FALLBACK : null
  }
}

function avbryt(rubrik, ...rader) {
  console.error(`\n  ✗ ${rubrik}`)
  for (const r of rader) console.error(`    ${r}`)
  console.error('')
  process.exit(1)
}

console.log('\n  Publicerar till GitHub Pages\n')

// 1. Ratt gren. CLAUDE.md: push bara till origin master, ingenting annat.
const gren = sh('git rev-parse --abbrev-ref HEAD')
if (gren !== 'master') {
  avbryt(`Du star pa "${gren}", inte master.`, 'Bara master publiceras. Byt gren eller sla ihop forst.')
}

// 2. Inget ocommittat. Annars publiceras nagot annat an det du tittar pa.
const smutsigt = sh('git status --porcelain')
if (smutsigt) {
  avbryt(
    'Arbetstradet har ocommittade andringar.',
    'Pages publicerar det som ar COMMITTAT - annars far telefonen en annan version an du tror.',
    'Committa eller stash:a forst:',
    ...smutsigt.split('\n').slice(0, 12).map((r) => `  ${r}`),
  )
}

// 3. Finns det ens nagot att skicka?
let attSkicka = ''
try {
  attSkicka = sh('git log origin/master..HEAD --oneline')
} catch {
  avbryt('Hittar ingen origin/master.', 'Kor `git fetch origin` forst.')
}
if (!attSkicka) {
  console.log('  ✓ origin/master ar redan i kapp - inget att publicera.')
  console.log(`    Sajten: ${SAJT}\n`)
  process.exit(0)
}
console.log('  Commits som publiceras:')
for (const rad of attSkicka.split('\n')) console.log(`    ${rad}`)
console.log('')

// 4. Grinden. Rott check = ingen push.
if (SNABB) {
  console.log('  ⚠ --snabb: hoppar over npm run check\n')
} else {
  console.log('  Kor npm run check ...\n')
  try {
    kor('npm run check')
  } catch {
    avbryt('check ar rod - ingenting pushades.', 'Fixa fynden, eller kor med --snabb om andringen bara ror dokumentation.')
  }
}

// 5. Push. Det ar HAR publiceringen startar - workflowen triggas av pushen.
console.log('\n  Pushar till origin master ...')
try {
  kor('git push origin master')
} catch {
  avbryt('Pushen misslyckades.', 'Ar du inloggad? `gh auth status` - och `gh auth setup-git` kopplar in gh som credential helper.')
}

// 6. Folj bygget om gh finns. Annars racker adressen till Actions-fliken.
const gh = ghBin()
if (!gh) {
  console.log(`\n  ✓ Pushat. Foljer inte bygget (gh saknas).`)
  console.log(`    Status: https://github.com/${REPO}/actions`)
  console.log(`    Sajten: ${SAJT}\n`)
  process.exit(0)
}

console.log('\n  Foljer bygget (tar ca 1-2 min) ...\n')
try {
  execFileSync(gh, ['run', 'watch', '--repo', REPO, '--exit-status', '--interval', '10'], { stdio: 'inherit' })
} catch {
  avbryt(
    'Bygget gick INTE igenom - sajten star kvar pa forra versionen.',
    `Logg: https://github.com/${REPO}/actions`,
  )
}

console.log(`\n  ✓ Publicerat: ${SAJT}`)
console.log('    Telefonen hamtar den vid nasta start, eller direkt via menyns "Hamta senaste".\n')
