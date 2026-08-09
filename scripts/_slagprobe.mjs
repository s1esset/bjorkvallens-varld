// Mäter anslagsljudet i lib/physics.js (LYFTPLAN B5) i TAL. Ett grönt test säger
// bara "0 konsolfel"; det säger ingenting om en hård träff faktiskt låter hårdare
// än en mjuk. Det är precis den frågan den här sonden svarar på.
//
//   node scripts/_slagprobe.mjs
//
// Ingen webbläsare behövs: physics.js drar in matter + theme + gamelog, och inget
// av dem rör DOM:en (gamelog viker ihop till `ON = false` utan import.meta.env).
// Samma grepp som _kameraprobe.mjs.
import { PhysicsWorld, MATERIAL, mat } from '../src/lib/physics.js'

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}

// Fejkad AudioService: samlar in exakt det spelen skulle ha hört.
const lyssnare = () => {
  const toner = []
  return { toner, tone: (o) => toner.push({ ...o }), sfx: () => {}, sample: () => false }
}

// Släpp en kropp från höjden h ned på ett golv och kör tills den slagit i.
function slapp({ material = 'tra', h = 300, sek = 3, opts = {} } = {}) {
  const varld = new PhysicsWorld({ gravityY: 1.4, walls: ['floor'] })
  const a = lyssnare()
  varld.impactAudio(a, opts)
  varld.rectangle(640, 720 - 40, 900, 80, { isStatic: true, friction: 0.9, restitution: 0 })
  varld.circle(640, 720 - 80 - h, 30, mat(material))
  for (let i = 0; i < Math.round(sek * 60); i++) varld.update(1000 / 60)
  varld.destroy()
  return a.toner
}

console.log('\nanslagsfart -> volym och tonhöjd')
{
  const lag = slapp({ h: 40 })
  const hog = slapp({ h: 620 })
  ok('mjukt fall låter', lag.length > 0, `${lag.length} ton(er)`)
  ok('hårt fall låter', hog.length > 0, `${hog.length} ton(er)`)
  const vLag = lag[0]?.vol ?? 0
  const vHog = hog[0]?.vol ?? 0
  const fLag = lag[0]?.freq ?? 0
  const fHog = hog[0]?.freq ?? 0
  ok('hårdare = högre volym', vHog > vLag * 1.3, `${vLag.toFixed(3)} -> ${vHog.toFixed(3)}`)
  ok('hårdare = ljusare ton', fHog > fLag, `${Math.round(fLag)} Hz -> ${Math.round(fHog)} Hz`)
  // Taket får inte spränga P0:s "aldrig en summer": volymen ska stanna på sitt tak.
  ok('volymen har tak', vHog <= 0.24 + 1e-6, `${vHog.toFixed(3)} <= 0.240`)
}

console.log('\nmaterialen har olika röst')
{
  const rad = []
  for (const namn of Object.keys(MATERIAL)) {
    const t = slapp({ material: namn, h: 400 })
    rad.push({ namn, freq: t[0]?.freq ?? 0, typ: t[0]?.type ?? '-', n: t.length })
  }
  for (const r of rad) console.log(`    ${r.namn.padEnd(7)} ${Math.round(r.freq).toString().padStart(5)} Hz  ${r.typ.padEnd(9)} ${r.n} ton(er)`)
  ok('alla fem materialen låter', rad.every((r) => r.n > 0))
  const unika = new Set(rad.map((r) => Math.round(r.freq)))
  ok('fem skilda tonhöjder', unika.size === rad.length, `${unika.size} av ${rad.length}`)
  const sten = rad.find((r) => r.namn === 'sten')
  const glas = rad.find((r) => r.namn === 'glas')
  ok('sten är mörkare än glas', sten.freq < glas.freq, `${Math.round(sten.freq)} < ${Math.round(glas.freq)}`)
}

console.log('\ntaket: en rasande hög får inte bli ett skrik')
{
  // ⚠️ VARFÖR onImpact OCH INTE impactAudio HÄR. impactAudio:s andra spärr (28 ms
  // mellan toner) går på VÄGGKLOCKAN, för ljud hörs i verklig tid — och det är rätt
  // i appen. Men den här sonden simulerar 180 bildrutor på ~40 ms verklig tid, så
  // spärren släpper igenom exakt EN ton oavsett hur mycket som rasar. Ett "1 ton på
  // 3 s" här hade alltså varit sondens klocka, inte spelets ljudbild — ett grönt
  // mätvärde som inte mäter något. Bildrute-taket går däremot att mäta ärligt.
  const varld = new PhysicsWorld({ gravityY: 1.4, walls: ['floor', 'left', 'right'] })
  varld.rectangle(640, 700, 900, 80, { isStatic: true, friction: 0.9, restitution: 0 })
  let ruta = 0
  const perRuta = new Map()
  varld.onImpact(() => perRuta.set(ruta, (perRuta.get(ruta) || 0) + 1))
  for (let i = 0; i < 40; i++) varld.circle(420 + (i % 10) * 42, 200 - Math.floor(i / 10) * 70, 20, mat('sten'))
  for (ruta = 0; ruta < 180; ruta++) varld.update(1000 / 60)
  varld.destroy()
  const total = [...perRuta.values()].reduce((s, v) => s + v, 0)
  const varst = Math.max(0, ...perRuta.values())
  console.log(`    ${total} anslag på 3 s · värsta bildrutan ${varst} · ${perRuta.size} rutor med ljud`)
  ok('högen ger MÅNGA anslag', total > 20, `${total} st`)
  ok('aldrig mer än 3 per bildruta', varst <= 3, `värst ${varst}`)
}

console.log('\nen studsande boll låter för VARJE studs')
{
  const varld = new PhysicsWorld({ gravityY: 1.4, walls: ['floor'] })
  varld.rectangle(640, 700, 900, 80, { isStatic: true, friction: 0.4, restitution: 0.9 })
  const farter = []
  varld.onImpact((h) => farter.push(h.speed))
  varld.circle(640, 160, 26, mat('gummi'))
  for (let i = 0; i < 300; i++) varld.update(1000 / 60)
  varld.destroy()
  console.log(`    ${farter.length} studsar · farter ${farter.map((f) => f.toFixed(1)).join(' ')}`)
  ok('flera studsar hörs', farter.length >= 2, `${farter.length} st`)
  ok('varje studs är mjukare än den förra', farter.every((f, i) => i === 0 || f <= farter[i - 1] + 0.01),
    farter.map((f) => f.toFixed(1)).join(' > '))
}

console.log('\nexit-säkerhet')
{
  const varld = new PhysicsWorld({ gravityY: 1.4, walls: ['floor'] })
  const a = lyssnare()
  varld.impactAudio(a)
  varld.rectangle(640, 700, 900, 80, { isStatic: true, friction: 0.9, restitution: 0 })
  varld.circle(640, 200, 30, mat('sten'))
  for (let i = 0; i < 30; i++) varld.update(1000 / 60)
  varld.destroy()
  const fore = a.toner.length
  for (let i = 0; i < 120; i++) varld.update(1000 / 60) // spelaren har lämnat
  ok('inga toner efter destroy()', a.toner.length === fore, `${fore} -> ${a.toner.length}`)
}

console.log('\nmaterialet tunar inte om ett spel bakvägen')
{
  const eget = mat('tra', { friction: 0.4, restitution: 0.04, frictionAir: 0.003 })
  ok('spelets egna tal vinner', eget.friction === 0.4 && eget.restitution === 0.04 && eget.frictionAir === 0.003,
    `friction ${eget.friction} · restitution ${eget.restitution}`)
  ok('materialets identitet följer med', eget.mat === 'tra')
  ok('okänt material kraschar inte', JSON.stringify(mat('kexchoklad', { friction: 0.5 })) === '{"friction":0.5}')
}

console.log(fel === 0 ? '\n✓ slagprobe: allt grönt\n' : `\n✗ slagprobe: ${fel} fel\n`)
process.exit(fel === 0 ? 0 : 1)
