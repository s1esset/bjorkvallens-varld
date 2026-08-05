// Startar de offline-genererande TTS/SFX-skripten med narrator-venvens python.
//
//   node scripts/run-tts.mjs voice [extra args…]   → scripts/gen-voice.py
//   node scripts/run-tts.mjs sfx   [extra args…]   → scripts/gen-sfx.py
//
// VARFÖR en wrapper: npm kör sina scripts genom cmd.exe på Windows, och cmd klarar
// inte en kommandorad som BÖRJAR med en citerad sökväg och sedan har fler citerade
// argument — den svarar "Felaktig syntax för filnamn, katalognamn eller volymetikett"
// och kör aldrig något. Här spawnas python med en riktig argv-array i stället, så
// ingen shell-citering är inblandad; samma kommando fungerar från bash, PowerShell
// och cmd. Python körs med -u så framstegsraderna strömmar live i stället för att
// buffras tills körningen är klar.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Narrator-venven (svenska F5-TTS + MOSS-SFX). Överstyr med NARRATOR_PYTHON.
const PYTHON = process.env.NARRATOR_PYTHON
  || 'C:\\repos\\storygen\\services\\narrator\\.venv\\Scripts\\python.exe'
const REF_WAV = process.env.NARRATOR_REF_WAV
  || 'C:\\repos\\storygen\\services\\narrator\\src\\narrator\\assets\\narrator_default.wav'
// Transkript av referensklippet — måste matcha ljudet ord för ord.
const REF_TEXT = process.env.NARRATOR_REF_TEXT
  || 'Some call me nature, others call me mother nature.'

const mode = process.argv[2]
const extra = process.argv.slice(3)

if (mode !== 'voice' && mode !== 'sfx') {
  console.error('användning: node scripts/run-tts.mjs voice|sfx [extra args…]')
  process.exit(2)
}

if (!existsSync(PYTHON)) {
  console.error(`\n  ✗ hittar inte narrator-venvens python:\n    ${PYTHON}\n`)
  console.error('  Sätt NARRATOR_PYTHON till rätt python.exe, eller kör /rost när venven finns.')
  console.error('  Appen fungerar under tiden via Web Speech-fallback — ingenting är trasigt.\n')
  process.exit(1)
}

const args = mode === 'voice'
  ? ['-u', join('scripts', 'gen-voice.py'),
     '--phrases', join('scripts', 'voice-phrases.json'),
     '--ref', REF_WAV,
     '--ref-text', REF_TEXT,
     '--out', join('public', 'audio', 'voice')]
  : ['-u', join('scripts', 'gen-sfx.py')]

const child = spawn(PYTHON, [...args, ...extra], { cwd: ROOT, stdio: 'inherit' })
child.on('error', (e) => {
  console.error(`\n  ✗ kunde inte starta python: ${e.message}\n`)
  process.exit(1)
})
child.on('exit', (code) => process.exit(code ?? 1))
