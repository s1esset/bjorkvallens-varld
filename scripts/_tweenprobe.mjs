// _tweenprobe.mjs — VAD BETYDER `tween.parent`? (utan webbläsare)
//
// `Ansikte._track()`s ringbuffert ska rensa FÄRDIGA tweens och behålla levande. Villkoret
// var `isActive() || totalProgress() < 1`, och ägarens "ansiktet fastnade mellan 2 lägen"
// spårades till att en DÖDAD `repeat: -1`-tween smiter förbi det villkoret och ligger kvar
// för alltid — en post per `liv()`, alltså en per tugga.
//
// Fixen bygger helt på att `tween.parent` är sann för levande och falsk för både färdiga
// och dödade. Det påståendet är hela ändringen, så det mäts här i stället för att antas.
import { gsap } from 'gsap'

const rader = []
const rad = (namn, vantat, fick) => {
  const ok = vantat === fick
  rader.push(ok)
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(42)} parent=${fick}  (väntat ${vantat})`)
}

const o = { v: 0 }

console.log('\n  GSAP: vad överlever `_track`-filtret?\n')

// --- de tre lägen filtret måste kunna skilja åt ---
const evigLevande = gsap.to(o, { v: 1, duration: 0.1, repeat: -1 })
rad('evig, LEVANDE (liv()s andetag)', true, !!evigLevande.parent)

const evigDodad = gsap.to(o, { v: 1, duration: 0.1, repeat: -1 })
evigDodad.kill()
rad('evig, DÖDAD (liv() anropad igen)', false, !!evigDodad.parent)

// ⚠️ Det gamla villkoret hade sluppit igenom just den här: en dödad evig tween ser LEVANDE
// ut för både `isActive()` och `totalProgress()`. Raden nedan är hela buggen i ett tal.
console.log(`      gamla villkoret på den dödade eviga: isActive=${evigDodad.isActive()} · totalProgress=${evigDodad.totalProgress()}`)
console.log(`      → ${evigDodad.isActive() || evigDodad.totalProgress() < 1 ? 'SLÄPPS IGENOM (läckan)' : 'rensas'}\n`)

const vantande = gsap.delayedCall(5, () => {})
rad('delayedCall som väntar (blinkslingan)', true, !!vantande.parent)
const vantandeDodad = gsap.delayedCall(5, () => {})
vantandeDodad.kill()
rad('delayedCall, DÖDAD', false, !!vantandeDodad.parent)

const tl = gsap.timeline()
tl.to(o, { v: 1, duration: 0.05 })
rad('timeline som löper (min()/tugga())', true, !!tl.parent)

const andlig = gsap.to(o, { v: 1, duration: 0.05 })
const tlKort = gsap.timeline()
tlKort.to(o, { v: 1, duration: 0.05 })

setTimeout(() => {
  rad('ändlig tween, FÄRDIG', false, !!andlig.parent)
  rad('timeline, FÄRDIG', false, !!tlKort.parent)
  const fel = rader.filter((x) => !x).length
  console.log(`\n  ${fel ? `✗ ${fel} fel` : '✓ ALLT GRÖNT — `parent` skiljer levande från både färdig och dödad'}\n`)
  evigLevande.kill(); vantande.kill()
  process.exit(fel ? 1 : 0)
}, 400)
