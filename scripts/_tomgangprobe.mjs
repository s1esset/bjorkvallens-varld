// Tomgångs-sond (ÅTGÄRDER V21): kapar spelets PÅMINNELSE en replik som redan talar?
//
// De flesta spel har en tomgångs-påminnelse (~6 s utan tryck → instruktionen igen). Räknas
// den från barnets senaste TRYCK i stället för från när rösten TYSTNADE, kapar den varje
// replik som råkar tala då — och sedan narTyst-kön (v1.251) flyttade många repliker senare
// har det blivit vanligare. Sonden gör samma sak i varje spel:
//   montera → tysta introt → säg en LÅNG replik (appens längsta klipp, 8,99 s) → rör
//   ingenting i 9,5 s → räkna varje say()/replayLast() som kom medan repliken talade.
//
//   node scripts/_tomgangprobe.mjs [id id …] [--ut .test-logs/_tomgang.json]
//
// KONTROLLARM: `--kontroll` låter sonden själv säga en kort rad 3 s in — den MÅSTE räknas som
// en kapning, annars är räknaren blind (ett grönt utfall betyder då ingenting).
//
// `--eget` (ÅTGÄRDER V24): sonden säger INGENTING själv. Den hakar på rösten före monteringen
// och räknar varje replik som kapar en ANNAN replik spelet självt sa — med hur långt den kapade
// hann (klippets currentTime). Det är barnets verkliga läge: introt kapat av spelets eget
// rundflöde. Standardläget överdriver (sondens 8,99 s-rad gör allt under 9 s till en kapning);
// det här läget gör det inte. Kontrollarm: `domino` på HEAD (före V24) — introt 7,32 s, andra
// instruktionen på fast 3,6 s — MÅSTE ge en kapning.
// Det ser också det standardläget är BLINT för: repliker före 0,9 s (sonden hinner inte haka
// på — flipperspel kapade introt 0,1 s in), och `folj-sparet`, vars intro ÄR sondens långa
// replik — rösten spärrar en exakt upprepning, så standardläget kunde aldrig se det kapas.
import { chromium } from 'playwright'
import fs from 'node:fs'

const argv = process.argv.slice(2)
const flagga = (n) => argv.includes(n)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const UT = val('--ut', '.test-logs/_tomgang.json')
const KONTROLL = flagga('--kontroll')
const EGET = flagga('--eget')
let ids = argv.filter((a, i) => !a.startsWith('--') && !['--ut'].includes(argv[i - 1]))

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const sidfel = []
p.on('pageerror', (e) => sidfel.push(String(e.message).slice(0, 140)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel)
if (!ids.length) ids = await p.evaluate(async () => (await import('/src/games/registry.js')).GAMES.map((g) => g.id))

// Längsta klippet i manifestet (8,99 s enligt ffprobe 2026-09-23).
const LANG = await p.evaluate(async () => {
  const m = await (await fetch('/audio/voice/manifest.json')).json()
  return Object.entries(m).find(([, f]) => f === 'dc61c10dba.mp3')?.[0] || Object.keys(m)[0]
})

const res = {}
if (EGET) {
  for (const id of ids) {
    await p.evaluate(() => window.__barnspel.nav.go('library'))
    await p.waitForTimeout(350)
    // Haka på FÖRE monteringen, så introt själv kommer med i listan över spelets repliker.
    await p.evaluate(() => {
      const v = window.__barnspel.voice
      const s = (window.__egetProbe = { kap: [], sagda: new Set(), say: v.say.bind(v), t0: performance.now() })
      v.say = (t, f) => {
        const a = v._audio
        if (v.talar && s.sagda.has(v.last) && t !== v.last && v.kvar > 0.15) {
          s.kap.push({
            kapad: String(v.last).slice(0, 44),
            hordes: +(a?.currentTime || 0).toFixed(1),
            av: +(a?.duration || 0).toFixed(1),
            text: String(t).slice(0, 44),
            vid: +((performance.now() - s.t0) / 1000).toFixed(1),
          })
        }
        s.sagda.add(t)
        return s.say(t, f)
      }
    })
    await p.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
    try {
      await p.waitForFunction(() => !!window.__barnspel.ctx?.progress, null, { timeout: 15000 })
    } catch { res[id] = { fel: 'monterade inte' }; continue }
    await p.waitForTimeout(10000)
    const r = await p.evaluate(() => {
      const s = window.__egetProbe
      window.__barnspel.voice.say = s.say
      return { kap: s.kap, sagda: [...s.sagda].map((t) => String(t).slice(0, 44)) }
    })
    res[id] = r
    const t = r.kap.length
      ? `KAPAR ×${r.kap.length} — ${r.kap.map((k) => `${k.vid}s "${k.text}" kapade "${k.kapad}" vid ${k.hordes}/${k.av}s`).join(' · ')}`
      : 'ok'
    console.log(`${id.padEnd(24)} ${t}`)
  }
  await p.evaluate(() => window.__barnspel.nav.go('library'))
  await b.close()
  const kapar = Object.entries(res).filter(([, r]) => r.kap?.length).map(([id]) => id)
  console.log(`\n${kapar.length} av ${ids.length} spel kapar en egen replik under de första 10 s (--eget)`)
  console.log(kapar.join(' '))
  if (sidfel.length) console.log('sidfel:', sidfel.slice(0, 5))
  fs.writeFileSync(val('--ut', '.test-logs/_tomgang_eget.json'), JSON.stringify({ tid: new Date().toISOString(), res }, null, 1))
  process.exit(0)
}
for (const id of ids) {
  await p.evaluate(() => window.__barnspel.nav.go('library'))
  await p.waitForTimeout(350)
  await p.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  try {
    await p.waitForFunction(() => !!window.__barnspel.ctx?.progress, null, { timeout: 15000 })
  } catch { res[id] = { fel: 'monterade inte' }; continue }
  await p.waitForTimeout(900)
  const r = await p.evaluate(async ([lang, kontroll]) => {
    const v = window.__barnspel.ctx.services.voice
    const kap = []
    const say = v.say.bind(v), rl = v.replayLast.bind(v)
    const mittI = () => v.last === lang && v.talar && v.kvar > 0.15
    v.say = (t, f) => { if (mittI() && t !== lang) kap.push({ via: 'say', text: String(t).slice(0, 50), efter: +(8.99 - v.kvar).toFixed(1) }); return say(t, f) }
    v.replayLast = (f) => { if (mittI()) kap.push({ via: 'replayLast', text: '(upprepning)', efter: +(8.99 - v.kvar).toFixed(1) }); return rl(f) }
    v.cancel()
    v.say(lang)
    if (kontroll) setTimeout(() => v.say('Bravo!'), 3000)
    await new Promise((r) => setTimeout(r, 9500))
    const hordes = +(8.99 - (v.last === lang ? v.kvar : 0)).toFixed(1)
    v.say = say
    v.replayLast = rl
    return { kap, hordes }
  }, [LANG, KONTROLL])
  res[id] = r
  const t = r.kap.length ? `KAPAR ×${r.kap.length} — ${r.kap.map((k) => `${k.efter}s ${k.via} "${k.text}"`).join(' · ')}` : 'ok'
  console.log(`${id.padEnd(24)} ${t}`)
}
await p.evaluate(() => window.__barnspel.nav.go('library'))
await b.close()
const kapar = Object.entries(res).filter(([, r]) => r.kap?.length).map(([id]) => id)
console.log(`\n${kapar.length} av ${ids.length} spel kapar en talande replik med sin påminnelse${KONTROLL ? ' (KONTROLLARM — alla ska kapa)' : ''}`)
console.log(kapar.join(' '))
if (sidfel.length) console.log('sidfel:', sidfel.slice(0, 5))
if (!KONTROLL) fs.writeFileSync(UT, JSON.stringify({ tid: new Date().toISOString(), lang: LANG, res }, null, 1))
