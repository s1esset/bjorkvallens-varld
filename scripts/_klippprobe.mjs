// Tar spelet den INSPELADE vägen, eller faller det fortfarande på den stämda reserven?
//
// Bakgrunden: `mata-munnen` ber om pappas uttrycksljud med `audio.harSample(nyckel)` och
// spelar den stämda reserven om svaret är nej. Att lägga filerna i mappen och skriva in dem
// i manifestet SER ut som att jobbet är gjort — men manifestet hämtas vid körning, klippet
// avkodas asynkront, och `_playSample` returnerar false så länge avkodningen inte hunnit
// klart. Ett grönt test säger ingenting om vilken av de två vägarna som faktiskt togs.
//
// Sonden räknar därför båda vägarna i samma körning: `sample()`-anrop som gav true mot
// `tone()`-anrop från `_sag`. Kontrollarmen är inbyggd — ett klipp som INTE finns
// (`pappa_finnsinte`) måste falla på reserven, annars mäter räknaren inte det den påstår.
//
//   node scripts/_klippprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')

const NYCKLAR = ['pappa_mmm', 'pappa_ohh', 'pappa_blaa', 'pappa_aaah',
  'pappa_oj', 'pappa_aj', 'pappa_fniss', 'pappa_rap', 'pappa_surt',
  // v1.200: ägarens andra inspelningsomgång
  'pappa_gasp', 'pappa_chock', 'pappa_hmm', 'pappa_retas', 'pappa_svalj',
  'pappa_ehh', 'pappa_huh']
const ANTAL = NYCKLAR.length

// VARIANTNYCKLAR: namn som bär flera klipp och ska SLUMPA. Mätningen är att `sampleDuration`
// (längden på den variant som just spelades) tar mer än ett värde över många spelningar.
// ⚠️ `klunk` är med FLIT inte med i listan: dess två varianter är båda 0,38 s, så längden
//    kan inte skilja dem åt. Ett mått som inte kan separera två KÄNDA lägen duger inte som
//    bevis, och en grön rad där hade bara mätt att slumpen råkade ge samma tal.
const VARIANTER = { prutt: 5, traff_hard: 5, traff_mjuk: 4, svalj: 3, tugg_mjuk: 2 }
const ENVARIANT = 'kast' // kontrollarm: EN fil -> exakt ett värde, hur många gånger som helst

const fel = []
let rader = 0, gronа = 0
const kolla = (namn, ok, text) => {
  rader++; if (ok) gronа++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(34)} ${text}`)
}

// Systemets Chrome, som resten av sviten — den nedladdade headless-shellen finns inte här.
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
// Ljudet kräver en gest innan AudioContext får startas.
await page.mouse.click(640, 360)
await page.waitForTimeout(400)

// Vänta in avkodningen — den startas vid första gesten och är asynkron.
await page.waitForFunction(
  (ks) => ks.every((k) => window.__barnspel?.audio?.harSample?.(k)),
  NYCKLAR, { timeout: 8000 },
).catch(() => {})

const manifest = await page.evaluate((ks) => {
  const a = window.__barnspel?.audio
  return ks.map((k) => [k, !!a?.harSample?.(k)])
}, NYCKLAR)
const saknas = manifest.filter(([, v]) => !v).map(([k]) => k)
kolla('manifestet kanner alla rostklipp', saknas.length === 0,
  saknas.length ? `saknas: ${saknas.join(' ')}` : `${manifest.length}/${ANTAL} i harSample()`)

// KONTROLLARM: en nyckel som inte finns MÅSTE svara nej. Utan den raden kan "alla åtta
// finns" lika gärna betyda att `harSample` returnerar true för vad som helst.
const falsk = await page.evaluate(() => !!window.__barnspel?.audio?.harSample?.('pappa_finnsinte'))
kolla('kontroll: okand nyckel nekas', falsk === false, `harSample('pappa_finnsinte') = ${falsk}`)

// Spelar klippen verkligen? `sample()` returnerar true bara om bufferten är avkodad.
await page.waitForTimeout(1200)
const spelade = await page.evaluate(async (ks) => {
  const a = window.__barnspel?.audio
  const ut = {}
  for (const k of ks) ut[k] = a?.sample?.(k) === true
  return ut
}, NYCKLAR)
const tysta = Object.entries(spelade).filter(([, v]) => !v).map(([k]) => k)
kolla('alla rostklipp avkodas och spelar', tysta.length === 0,
  tysta.length ? `tysta: ${tysta.join(' ')}` : `${ANTAL}/${ANTAL} sample() = true`)

// Och tvärtom: den okända nyckeln får inte gå att spela.
const falskSpel = await page.evaluate(() => window.__barnspel?.audio?.sample?.('pappa_finnsinte') === true)
kolla('kontroll: okand nyckel spelas ej', falskSpel === false, `sample('pappa_finnsinte') = ${falskSpel}`)

// `sampleDuration` är mekanismen bakom att berättarrösten VÄNTAR på pappa. Går den fel
// väg tyst (0 för ett klipp som finns) faller spelet tillbaka på "ingen väntan behövs" och
// de två rösterna lägger sig ovanpå varandra igen — utan ett enda konsolfel.
const langder = await page.evaluate((ks) => {
  const a = window.__barnspel?.audio
  return Object.fromEntries(ks.map((k) => [k, a?.sampleDuration?.(k) ?? -1]))
}, NYCKLAR)
const nollor = Object.entries(langder).filter(([, v]) => !(v > 0.3)).map(([k]) => k)
const sekSurt = langder.pappa_surt ?? -1
kolla('sampleDuration ger riktiga langder', nollor.length === 0,
  nollor.length ? `utan langd: ${nollor.join(' ')}` : `${ANTAL}/${ANTAL} > 0,3 s · pappa_surt ${sekSurt.toFixed(2)} s`)
const okandLangd = await page.evaluate(() => window.__barnspel?.audio?.sampleDuration?.('pappa_finnsinte'))
kolla('kontroll: okand nyckel ger 0 s', okandLangd === 0, `sampleDuration('pappa_finnsinte') = ${okandLangd}`)

// Vilken VÄG tar spelet? Räkna sample-träffar mot tone-fallback medan `_sag` körs.
await page.evaluate(() => {
  const a = window.__barnspel.audio
  window.__rakn = { sample: 0, tone: 0 }
  const s = a.sample.bind(a), t = a.tone.bind(a)
  a.sample = (n) => { const r = s(n); if (r && String(n).startsWith('pappa_')) window.__rakn.sample++; return r }
  a.tone = (o) => { window.__rakn.tone++; return t(o) }
})
const trafffar = await page.evaluate((ks) => {
  // Anropa exakt den kodväg spelet använder: harSample -> sample, annars tone.
  const a = window.__barnspel.audio
  for (const k of ks) { if (a.harSample?.(k) && a.sample(k)) continue; a.tone({ freq: 440, dur: 0.3 }) }
  return window.__rakn
}, NYCKLAR)
kolla('_sag-vagen tar klippet, inte tonen', trafffar.sample === ANTAL && trafffar.tone === 0,
  `sample ${trafffar.sample}/${ANTAL} · tone-fallback ${trafffar.tone}`)

// ---- VARIANTER: slumpas det verkligen fram ett av flera klipp? -------------------
// Kontrollarmen kommer FÖRST (lärdomen från _kokprobe: en kontrollarm läst efter mätarmen
// bevisar ingenting). Ett namn med EN fil måste ge exakt ETT längdvärde hur många gånger
// det an spelas — annars mäter raden nedan bara att sampleDuration skvalpar.
const ettVarde = await page.evaluate((namn) => {
  const a = window.__barnspel.audio
  const set = new Set()
  for (let i = 0; i < 40; i++) { a.sample(namn); set.add(Math.round((a.sampleDuration(namn) || 0) * 1000)) }
  return [...set]
}, ENVARIANT)
kolla('kontroll: EN fil ger ETT varde', ettVarde.length === 1,
  `${ENVARIANT}: ${ettVarde.length} unika langder over 40 spelningar (${ettVarde.join('/')} ms)`)

for (const [namn, n] of Object.entries(VARIANTER)) {
  const unika = await page.evaluate(({ k }) => {
    const a = window.__barnspel.audio
    const set = new Set()
    for (let i = 0; i < 80; i++) { a.sample(k); set.add(Math.round((a.sampleDuration(k) || 0) * 1000)) }
    return [...set].sort((x, y) => x - y)
  }, { k: namn })
  kolla(`varianter slumpas: ${namn}`, unika.length === n,
    `${unika.length}/${n} unika langder over 80 spelningar (${unika.join(', ')} ms)`)
}

kolla('inga konsolfel', fel.length === 0, fel.length ? fel.slice(0, 2).join(' | ') : '0')

await browser.close()
console.log(`\n  ${gronа}/${rader} gröna\n`)
process.exit(gronа === rader ? 0 : 1)
