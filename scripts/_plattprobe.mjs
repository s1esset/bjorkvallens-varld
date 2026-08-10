// Vilka spel ritar fortfarande PLATT? Rankar skärmdumparna efter hur stor del av
// innehållet som ligger i stora enfärgade fält.
//
// Bakgrunden: LYFTPLAN rad 3 / C1.3 ska ge spelobjekten volym med form.js-fyllningar,
// men det finns 203 lokala rit-funktioner och ingen mening i att gå igenom dem i
// bokstavsordning. En gradient på en 11 px-stjärna syns inte; en på ett 90 px-klot
// bär hela bilden. Måttet nedan pekar ut var det finns MYCKET yta att vinna.
//
// Så här mäts det: exakta RGB-värden räknas per skärmdump. Ett platt föremål lägger
// tusentals pixlar på EN exakt färg; ett gradientfyllt sprider sig över hundratals
// toner. Bakgrundsfärgen (den vanligaste) räknas bort, liksom skalets fasta UI.
//
// ⚠️ RANKA PÅ STÖRSTA ENSKILDA FÄLTET, inte på summan. En bakad FillGradient
// kvantiseras till band (256 steg som sträcks över formen), och varje band kan vara
// tusentals pixlar. Summan av "platt yta" STIGER därför när man gör rätt: mullvadens
// gräsmatta gick från 536 849 till 735 907 total platt yta av en korrekt fix — medan
// dess största fält föll från 215 742 till 32 889, vilket är det som faktiskt hände.
//
// ⚠️ Måttet är en LEDTRÅD, inte en dom. En panel, en knapp, ett vitt ritpapper och en
// fotbollsplan sedd uppifrån är legitimt platta — `rulla-bollen-hem` toppar listan och
// ska göra det. Titta på bilden innan du ändrar något.
//
//   node scripts/_plattprobe.mjs [.test-shots] [--min 2000] [--topp 20] [--medbakgrund]
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? Number(argv[i + 1]) : d }
const dir = argv.find((a) => !a.startsWith('--') && !Number.isFinite(Number(a))) || '.test-shots'
const MIN = opt('--min', 2000) // minsta fält som räknas som "ett platt föremål"
const TOPP = opt('--topp', 20)
const MED_BG = argv.includes('--medbakgrund') // räkna INTE bort bakgrunden — se matPlatthet()

const rgbKey = (r, g, b) => (r << 16) | (g << 8) | b

function matPlatthet(png) {
  const { data } = png
  const antal = new Map()
  const totalt = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue
    const k = rgbKey(data[i], data[i + 1], data[i + 2])
    antal.set(k, (antal.get(k) || 0) + 1)
  }
  // Bakgrund = vanligaste färgen. Den är oftast redan en gradient (scene.js), men i
  // spel med egen ritad bakgrund är den en enda ton — och den ska inte dominera måttet.
  //
  // ⚠️ BLINDFLÄCK, och den ger FALSKA REGRESSIONER: avdraget gäller exakt EN ton. Tonar
  // du just den ytan (helt rätt åtgärd) krymper avdraget, och talet STIGER fast bilden
  // blev bättre. `rulla-bollen-hem` gick 29 317 → 38 718 av en korrekt bakgrundsgradient
  // — den verkliga ytan föll samtidigt 258 619 → 38 718. Kör `--medbakgrund` när du
  // jämför FÖRE/EFTER på ett spel som ritar sin egen bakgrund; ranklistan behåller
  // avdraget, för där är poängen att hitta spelobjekt, inte bakgrunder.
  let bg = 0
  let bgN = 0
  if (!MED_BG) for (const [k, n] of antal) if (n > bgN) { bgN = n; bg = k }
  const innehall = totalt - bgN
  let plattYta = 0
  const falt = []
  for (const [k, n] of antal) {
    if (k === bg || n < MIN) continue
    plattYta += n
    falt.push({ farg: '#' + k.toString(16).padStart(6, '0'), px: n })
  }
  falt.sort((a, b) => b.px - a.px)
  return {
    innehallAndel: innehall / totalt,
    plattAndel: innehall > 0 ? plattYta / innehall : 0,
    plattPx: plattYta,
    toner: antal.size,
    storstaFalt: falt.slice(0, 3),
  }
}

// Bara de 72 SPELENS skärmdumpar. `.test-shots` innehåller också sondutdata
// (kamerarutnät, ikonark, scenbilder) som annars dominerar listan helt.
const spelIds = new Set(readdirSync('src/games', { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join('src/games', d.name, 'index.js'))).map((d) => d.name))
const filer = readdirSync(dir).filter((f) => f.endsWith('.png') && spelIds.has(f.replace('.png', '')))
const rader = []
for (const f of filer) {
  try {
    const m = matPlatthet(PNG.sync.read(readFileSync(join(dir, f))))
    rader.push({ spel: f.replace('.png', ''), ...m })
  } catch (e) {
    rader.push({ spel: f.replace('.png', ''), fel: String(e.message).slice(0, 60) })
  }
}
const storst = (r) => (r.storstaFalt && r.storstaFalt[0] ? r.storstaFalt[0].px : 0)
rader.sort((a, b) => storst(b) - storst(a))

console.log(`\n  Platthet i ${rader.length} skärmdumpar (fält ≥ ${MIN} px, ${MED_BG ? 'BAKGRUNDEN MEDRÄKNAD' : 'bakgrund borträknad'})`)
console.log('  Rankat på STÖRSTA ENSKILDA FÄLTET — summan stiger av en korrekt gradient (se filhuvudet).\n')
console.log('  ' + 'spel'.padEnd(26) + 'största'.padStart(9) + 'summa'.padStart(10) + 'toner'.padStart(8) + '   de tre största fälten')
for (const r of rader.slice(0, TOPP)) {
  if (r.fel) { console.log('  ' + r.spel.padEnd(26) + '  FEL ' + r.fel); continue }
  const falt = r.storstaFalt.map((f) => `${f.farg}:${f.px}`).join(' ')
  console.log(
    '  ' + r.spel.padEnd(26) +
    String(storst(r)).padStart(9) +
    String(r.plattPx).padStart(10) +
    String(r.toner).padStart(8) + '   ' + falt
  )
}
console.log()
