// Kontroll av spel-kontraktet, registret, P0-reglerna, docs och röst-täckning.
// Beroendefri (bara Node). Körs som grind före varje commit.
//
//   npm run check                  # hela repot (täckningsluckor = varningar)
//   npm run check -- --game <id>   # ETT spel, strikt (varningar blir fel)
//   npm run check -- --json        # maskinläsbar utdata
//
// Exit 0 = grönt, 1 = fel hittade.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const onlyGame = arg('--game')
const asJson = argv.includes('--json')
const strict = argv.includes('--strict') || !!onlyGame

const problems = []   // { level:'fel'|'varning', id, msg }
const err = (id, msg) => problems.push({ level: 'fel', id, msg })
const warn = (id, msg) => problems.push({ level: strict ? 'fel' : 'varning', id, msg })

const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return null } }

// ---------- referensdata ur theme.js ----------
const theme = read(join(ROOT, 'src/lib/theme.js')) || ''
const CATEGORIES = [...theme.matchAll(/^\s{2}(\w+):\s*\{\s*label:/gm)].map((m) => m[1])
const TAB_CATS = new Set(
  [...theme.matchAll(/cats:\s*\[([^\]]+)\]/g)].flatMap((m) =>
    [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])),
)
const INPUTS = ['tap', 'drag', 'mixed']

// ---------- spelmappar ----------
const gamesDir = join(ROOT, 'src/games')
const folders = readdirSync(gamesDir)
  .filter((f) => statSync(join(gamesDir, f)).isDirectory())
  .filter((f) => !onlyGame || f === onlyGame)
  .sort()

if (onlyGame && !folders.length) {
  console.error(`✗ Hittar inget spel med id "${onlyGame}" under src/games/`)
  process.exit(1)
}

// ---------- kontrakt + P0 per spel ----------
// Metadata läses ur den statiska default-exportens huvud (regex — ingen import,
// eftersom pixi.js inte kan laddas i Node). Bara texten EFTER `export default {`
// scannas, annars vinner ett `id:` i en datalista högre upp i filen.
const exportHead = (src) => {
  const i = src.search(/export\s+default\s*\{/)
  return i < 0 ? src : src.slice(i)
}
const field = (src, name) => {
  const m = src.match(new RegExp(`(?:^|[\\s{,])${name}\\s*:\\s*(.+)`, 'm'))
  return m ? m[1].trim().replace(/,\s*$/, '') : null
}
const strField = (src, name) => {
  const raw = field(src, name)
  const m = raw && raw.match(/^['"](.*?)['"]/)
  return m ? m[1] : null
}

const games = []
for (const id of folders) {
  const file = join(gamesDir, id, 'index.js')
  if (!existsSync(file)) { err(id, 'saknar index.js'); continue }
  const src = read(file)
  if (!src) { err(id, 'kan inte läsa index.js'); continue }

  const head = exportHead(src)
  const meta = {
    id: strField(head, 'id'),
    titleSv: strField(head, 'titleSv'),
    icon: strField(head, 'icon'),
    category: strField(head, 'category'),
    input: strField(head, 'input'),
    ageRange: field(head, 'ageRange'),
    voiceIntro: strField(head, 'voiceIntro'),
  }
  games.push({ id, src, meta })

  // --- kontrakt ---
  if (!/export\s+default\s*\{/.test(src)) err(id, 'saknar `export default {`')
  if (meta.id !== id) err(id, `id "${meta.id}" matchar inte mappnamnet "${id}"`)
  if (!/^[a-z0-9_-]+$/.test(id)) err(id, 'mappnamn/id måste vara ASCII (a-z 0-9 _ -)')
  if (!meta.titleSv) err(id, 'saknar titleSv')
  if (!meta.icon) err(id, 'saknar icon')
  if (!meta.category) err(id, 'saknar category')
  else if (!CATEGORIES.includes(meta.category)) err(id, `okänd category "${meta.category}" (giltiga: ${CATEGORIES.join(', ')})`)
  else if (!TAB_CATS.has(meta.category)) err(id, `category "${meta.category}" ingår inte i någon TAB_GROUP → spelet syns inte i biblioteket`)
  if (!meta.input) err(id, 'saknar input')
  else if (!INPUTS.includes(meta.input)) err(id, `okänt input "${meta.input}" (tap|drag|mixed)`)
  if (!meta.ageRange) err(id, 'saknar ageRange')
  else {
    const nums = (meta.ageRange.match(/\d+/g) || []).map(Number)
    if (nums.length !== 2 || nums[0] > nums[1] || nums[0] < 1 || nums[1] > 6)
      err(id, `orimlig ageRange ${meta.ageRange} (förväntas [2,5]-aktigt)`)
  }
  if (!/\binit\s*\(|\binit\s*:/.test(src)) err(id, 'saknar init()')
  if (!/\bdestroy\s*\(|\bdestroy\s*:/.test(src)) err(id, 'saknar destroy()')
  if (!meta.voiceIntro) warn(id, 'saknar voiceIntro (spelet startar utan talad instruktion)')

  // --- P0 / kodhälsa ---
  if (/\blocalStorage\b/.test(src)) err(id, 'använder localStorage direkt — använd ctx.progress')
  if (/\.interactive\s*=/.test(src)) err(id, 'Pixi v7-API `.interactive =` — använd eventMode')
  if (/\b(window\.)?(alert|prompt)\s*\(/.test(src)) err(id, 'native alert/prompt — använd lib/confirm.js eller lib/toast.js')
  if (/\bnew\s+Audio\s*\(|\bAudioContext\s*\(/.test(src)) err(id, 'egen ljudmotor — använd ctx.services.audio')
  if (/\bfetch\s*\(|XMLHttpRequest/.test(src)) err(id, 'nätanrop vid körning är förbjudet (P0)')

  const usesGsap = /\bgsap\./.test(src)
  if (usesGsap && !/killTweensOf/.test(src)) warn(id, 'använder gsap men anropar aldrig killTweensOf i destroy')
  const usesDelayed = /setTimeout\s*\(|delayedCall\s*\(|setInterval\s*\(/.test(src)
  if (usesDelayed && !/_alive/.test(src)) warn(id, 'har fördröjda callbacks men ingen _alive-flagga (exit-säkerhet)')
  // Ticker städas via ctx.ticker.remove(), en sparad referens (this._tickerRef?.remove)
  // eller ticker?.remove — acceptera alla tre.
  const addsTick = /ticker\??\.add\s*\(/.test(src)
  const removesTick = /ticker\??\.remove\s*\(/.test(src) || /\.remove\s*\(\s*this\._tick/.test(src)
  if (addsTick && !removesTick) warn(id, 'lägger till ticker-callback utan att ta bort den i destroy')
  if (/\bthree\b|three3d/.test(src) && /^import .*three/m.test(src)) err(id, 'statisk three-import — ladda dynamiskt i init (egen chunk)')
  // Egna fält på ett Pixi-objekt får ALDRIG heta som Pixis interna transform-cache.
  // Snöbollen la fältets världs-x i `f._cx` — Pixi v8 använder samma namn för cosinus
  // av rotationen och räknar `lt.a = _cx * scale.x`, så varje snöfält renderades med
  // vågrät skala 3660 och skjuvning 591. Ingen krasch, inget konsolfel: bara osynliga
  // spelobjekt. Prefixa egna fält med något eget (`_wx`, `_wy`, `_mitt…`).
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\.(_(?:cx|cy|sx|sy|position|scale|pivot|origin|skew|rotation|updateFlags|worldTransform|maskEffect|filterEffect))\s*=[^=]/g)) {
    if (m[1] === 'this') continue
    err(id, `\`${m[1]}.${m[2]} =\` skriver över Pixis interna transform-fält — byt namn (t.ex. ${m[2].replace('_', '_w')})`)
  }

  // En nod-egenskap får inte vara den enda bäraren av en spel-NYCKEL. `vart-tog-det-vagen`
  // valde leksakens reaktion med `switch (this._prize.text)` — riktigt när leksaken var en
  // `Text`. När den blev en ritad ikon i en `Container` (P0 ASSETS) blev fältet `undefined`
  // och HELA tabellen föll till `default`: tio leksaker, en enda generisk puls, i sex veckor
  // utan ett konsolfel eller ett rött test. Håll nyckeln i ett eget fält (`this._prizeKey`).
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  // Bara `.text`: `.label` är matter.js kanoniska kropps-id i det här repot (59 helt
  // legitima träffar) och `.name` är för brett. Tripwiren ska vara tyst tills den behövs.
  for (const m of stripped.matchAll(/switch\s*\(\s*([\w.$[\]]*\.text)\s*\)|([\w.$[\]]*\.text)\s*===?\s*['"`]/g)) {
    const uttryck = m[1] || m[2]
    if (/^(e|ev|event)\./.test(uttryck)) continue
    err(id, `\`${uttryck}\` används som nyckel — en nod-egenskap dör tyst när noden byter typ (ritad ikon i stället för Text). Spara nyckeln i ett eget fält.`)
  }

  // --- doc ---
  if (!existsSync(join(ROOT, 'docs/games', `${id}.md`))) warn(id, `saknar docs/games/${id}.md`)
}

// ---------- registret ----------
const registry = read(join(ROOT, 'src/games/registry.js')) || ''
const registered = new Set([...registry.matchAll(/from\s+'\.\/([^/]+)\/index\.js'/g)].map((m) => m[1]))
if (!onlyGame) {
  for (const f of folders) if (!registered.has(f)) err(f, 'finns på disk men är inte importerad i registry.js')
  for (const r of registered) if (!folders.includes(r)) err(r, 'importeras i registry.js men mappen saknas')
} else if (!registered.has(onlyGame)) {
  err(onlyGame, 'är inte importerad i registry.js')
}
// varje importerat spel måste också ligga i GAMES-arrayen
const gamesArray = registry.match(/GAMES\s*=\s*\[([\s\S]*?)\]/)
if (gamesArray) {
  const idents = [...registry.matchAll(/import\s+(\w+)\s+from\s+'\.\/([^/]+)\/index\.js'/g)]
  for (const [, ident, folder] of idents) {
    if (onlyGame && folder !== onlyGame) continue
    if (!new RegExp(`\\b${ident}\\b`).test(gamesArray[1])) err(folder, `importeras men saknas i GAMES-arrayen`)
  }
} else if (!onlyGame) err('registry', 'hittar ingen GAMES-array i registry.js')

// ---------- röst-täckning ----------
let phrases = []
try { phrases = JSON.parse(read(join(ROOT, 'scripts/voice-phrases.json')) || '[]') } catch { err('röst', 'voice-phrases.json är trasig JSON') }
const phraseSet = new Set(phrases.map((p) => String(p).trim()))
let manifest = {}
try { manifest = JSON.parse(read(join(ROOT, 'public/audio/voice/manifest.json')) || '{}') } catch { /* inga klipp än */ }

// Kommentarer bort, annars matchar all svensk kodkommentar som "replik".
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// En sträng som LÅTER som en talad replik: innehåller mellanslag och antingen åäö
// eller slutar som en mening. Fångar repliker som ligger i en konstant-bank i stället
// för direkt i voice.say(...) — annars slinker de igenom utan att någonsin få ett klipp.
const looksSpoken = (s) =>
  s.length >= 10 && s.length <= 160 && /\s/.test(s) && /[a-zåäö]/i.test(s) &&
  (/[åäöÅÄÖ]/.test(s) || /[.!?]$/.test(s)) &&
  !/^[a-z]+\.[a-z]+/i.test(s) && !/https?:|\/\//.test(s)

// Täckt = frasen finns, ELLER varje mening i den finns var för sig (VoiceService
// spelar då ett klipp per mening — samma regel som i say()).
const tackt = (t) => {
  if (phraseSet.has(t)) return true
  const delar = t.split(/(?<=[!?.])\s+/).map((s) => s.trim()).filter(Boolean)
  return delar.length > 1 && delar.every((d) => phraseSet.has(d))
}

let pendingClips = 0
let templateSays = 0
for (const g of games) {
  const spoken = new Set()
  const clean = stripComments(g.src)
  if (g.meta.voiceIntro) spoken.add(g.meta.voiceIntro)
  for (const m of clean.matchAll(/voice\.say\(\s*'((?:[^'\\]|\\.)*)'/g)) spoken.add(m[1].replace(/\\'/g, "'"))
  for (const m of clean.matchAll(/voice\.say\(\s*"((?:[^"\\]|\\.)*)"/g)) spoken.add(m[1].replace(/\\"/g, '"'))
  // Backtick: utan ${} är det en vanlig literal (annars helt osynlig här). MED ${}
  // finns texten först vid körning — den kan omöjligt slås upp statiskt, så den
  // räknas bara, och verifieras i stället mot testkörningens fynd längre ned.
  for (const m of clean.matchAll(/voice\.say\(\s*`([^`]*)`/g)) {
    if (m[1].includes('${')) templateSays++
    else if (m[1].trim()) spoken.add(m[1])
  }
  // Meningsliknande literaler var som helst i filen (repliksbanker, ordlistor).
  for (const m of clean.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    const s = m[1].replace(/\\'/g, "'")
    if (looksSpoken(s)) spoken.add(s)
  }
  // Metadata är inte tal. En flerordstitel med åäö ("Zackes Biltvätt") matchar annars
  // heuristiken och skulle kräva ett röstklipp som aldrig sägs.
  if (g.meta.titleSv) spoken.delete(g.meta.titleSv)
  for (const t of spoken) {
    if (!phraseSet.has(t)) warn(g.id, `repliken "${t.slice(0, 48)}…" saknas i scripts/voice-phrases.json (får aldrig ett klipp)`)
    else if (!manifest[t]) pendingClips++
  }
}

// ---------- röst-fynd ur senaste testkörningen (.test-logs) ----------
// Den statiska läsningen ovan ser bara literaler. Repliker som byggs vid körning
// (template literal, tabelluppslag, konkatenering) syns först när spelet KÖRT —
// och då flaggar gamelog dem som `rost-utan-klipp` med den exakta texten. Vi läser
// den domen här, så en osynlig replik ändå fångas av grinden i stället för att bara
// tyst falla till robotrösten. Saknas loggen (inget test kört) hoppas kontrollen över.
let loggarLasta = 0
for (const g of games) {
  const raw = read(join(ROOT, '.test-logs', `${g.id}.json`))
  if (!raw) continue
  let logg
  try { logg = JSON.parse(raw) } catch { continue }
  loggarLasta++
  const sedda = new Set()
  for (const f of logg.fynd || []) {
    if (f.kod !== 'rost-utan-klipp') continue
    for (const ex of f.exempel || []) {
      const t = String(ex?.text || '').trim()
      if (!t || sedda.has(t) || tackt(t)) continue
      sedda.add(t)
      warn(g.id, `körningen sa "${t.slice(0, 48)}" utan klipp — texten byggs vid körning och saknas i scripts/voice-phrases.json`)
    }
  }
}

// ---------- utdata ----------
// ---------- statisk restitution: tal som inte gör någonting (ÅTGÄRDER V10) ----------
// `PhysicsWorld._make` skapar kroppen dynamisk och sätter den statisk efteråt (NaN-fixen),
// och matters `Body.setStatic` NOLLAR då restitution. Ett `restitution` på en statisk kropp
// har alltså aldrig gjort något — uppmätt i `scripts/_studsprobe.mjs`: plattans 0,02 och
// 0,95 ger identiskt studshopp. Sedan v1.130.0 finns `{ isStatic: true, studs: 0.75 }`,
// som `_make` sätter EFTER `setStatic`.
//
// Rapporteras som EN sammanfattningsrad, inte som ett femtiotal varningar: talen är ofarliga
// (de gör ingenting) och migreringen kräver att man SPELAR spelet för att avgöra vilken studs
// som var avsedd. `npm run check -- --studs` skriver ut hela listan när någon tar itu med den.
//
// ⚠️ TVÅ MEDVETNA GRÄNSDRAGNINGAR, båda hittade genom att läsa listan sonden själv skrev:
//   · `restitution: 0` räknas inte — det säger exakt vad `setStatic` ändå gör.
//   · Raden säger "medan kroppen är statisk", inte "aldrig". `kulbana:140` skapar spelets
//     KULA statisk (parkerad före utskjutning) med `restitution: 0.42`; när den väcks med
//     `Body.setStatic(b, false)` läser matter tillbaka talet ur `_original`. Ett tal på en
//     kropp som senare väcks är alltså levande, och listan är en läslista — inte en fixlista.
const visaStuds = argv.includes('--studs')
const dodaStuds = []
// Hela options-objektet plockas ut med klammermatchning, inte med en radregex: sex av
// de fyrtiofyra ligger över flera rader (`plugin: {}` och `collisionFilter: {}` gör
// dessutom objekten nästlade), och en radbaserad läsning missade just dem.
const objektRunt = (src, i) => {
  let d = 0
  let start = -1
  for (let k = i; k >= 0; k--) {
    const c = src[k]
    if (c === '}') d++
    else if (c === '{') { if (d === 0) { start = k; break } d-- }
  }
  if (start < 0) return null
  d = 0
  for (let k = start; k < src.length; k++) {
    const c = src[k]
    if (c === '{') d++
    else if (c === '}') { d--; if (d === 0) return src.slice(start, k + 1) }
  }
  return null
}
for (const g of games) {
  for (const m of g.src.matchAll(/\bisStatic\s*:\s*true/g)) {
    const obj = objektRunt(g.src, m.index)
    if (!obj || !/\brestitution\s*:/.test(obj) || /\bstuds\s*:/.test(obj)) continue
    const tal = obj.match(/\brestitution\s*:\s*([^,\s}]+)/)?.[1] ?? '?'
    if (Number(tal) === 0) continue // `restitution: 0` säger samma sak som setStatic gör
    const rad = g.src.slice(0, m.index).split('\n').length
    dodaStuds.push({ id: g.id, rad, tal })
  }
}

const errors = problems.filter((p) => p.level === 'fel')
const warnings = problems.filter((p) => p.level === 'varning')

if (asJson) {
  console.log(JSON.stringify({ games: games.length, errors, warnings, pendingClips, templateSays, loggarLasta, dodaStuds }, null, 2))
} else {
  const scope = onlyGame ? `spel "${onlyGame}" (strikt)` : `${games.length} spel`
  console.log(`\n  Kontroll av ${scope}\n`)
  for (const p of problems) console.log(`  ${p.level === 'fel' ? '✗' : '⚠'} ${p.id.padEnd(24)} ${p.msg}`)
  if (!problems.length) console.log('  ✓ inga problem')
  console.log('')
  if (pendingClips) console.log(`  ♪ ${pendingClips} repliker väntar på röstklipp — kör /rost när narratorn är uppe (Web Speech täcker upp tills dess)`)
  if (templateSays) console.log(`  ♪ ${templateSays} repliker byggs vid körning (template literal) — bara en testkörning kan verifiera dem (${loggarLasta} loggar lästa i .test-logs)`)
  if (dodaStuds.length) {
    const spel = new Set(dodaStuds.map((d) => d.id)).size
    console.log(`  ⚙ ${dodaStuds.length} restitution-tal i ${spel} spel gör ingenting MEDAN kroppen är statisk (setStatic nollar dem, ÅTGÄRDER V10) — ska ytan studsa: { studs }${visaStuds ? '' : ' · lista: npm run check -- --studs'}`)
    if (visaStuds) {
      for (const d of dodaStuds) console.log(`      ${d.id}:${d.rad}  restitution ${d.tal}`)
    }
  }
  console.log(`  ${errors.length ? '✗' : '✓'} ${errors.length} fel · ${warnings.length} varningar\n`)
}

process.exit(errors.length ? 1 : 0)
