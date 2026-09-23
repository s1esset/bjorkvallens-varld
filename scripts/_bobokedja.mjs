// Gravmaskinens leveranskedja: lastraden → "Bobo kör iväg med lasten!" → nästa lasts intro.
// Driver spelets RIKTIGA _onFull (window.__barnspel) och loggar varje say() med tid, om något
// kapades, och var riggen står när Bobo-raden sägs (x > 0 = på väg ut ur bild).
//   node scripts/_bobokedja.mjs [--varv 3]
import { chromium } from 'playwright'
const VARV = Number(process.argv[process.argv.indexOf('--varv') + 1]) || 3
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('pageerror', (e) => fel.push(String(e.message).slice(0, 140)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel)
let bobo = 0, ordning = 0, kapat = 0, iRorelse = 0
for (let v = 0; v < VARV; v++) {
  await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'gravmaskinen' }))
  await p.waitForFunction(() => !!window.__barnspel.ctx?.progress, null, { timeout: 15000 })
  await p.waitForTimeout(1200)
  const r = await p.evaluate(async () => {
    const c = window.__barnspel.ctx, g = window.__barnspel.game, v = c.services.voice
    v.cancel()
    const logg = [], t0 = performance.now()
    const say = v.say.bind(v)
    // rigX läses 0,5 s EFTER repliken: riggen startar i samma tick som Bobo-raden sägs,
    // så ett läge avläst i själva anropet är alltid 0 och säger ingenting.
    v.say = (t, f) => {
      const post = { t: Math.round(performance.now() - t0), text: t.slice(0, 26), kapar: v.talar && v.kvar > 0.15, rigX: null }
      logg.push(post)
      setTimeout(() => { post.rigX = Math.round(g._rig?.x ?? 0) }, 500)
      return say(t, f)
    }
    const intro = null
    g._onFull(c)
    await new Promise((res) => setTimeout(res, 11000))
    v.say = say
    return { logg, full: g._cargo?.intro }
  })
  const iB = r.logg.findIndex((x) => x.text.startsWith('Bobo kör iväg'))
  const iI = r.logg.findIndex((x, i) => i > 0 && x.text === String(r.full).slice(0, 26))
  if (iB > 0) bobo++
  if (iB > 0 && iI > iB) ordning++
  if (iB > 0 && r.logg[iB].rigX !== 0 && r.logg[iB].rigX < 620) iRorelse++ // lämnat parkeringsläget (satsen bakåt räknas)
  kapat += r.logg.filter((x) => x.kapar).length
  console.log(`varv ${v + 1}: ` + r.logg.map((x) => `${x.t}ms "${x.text}"${x.kapar ? ' KAPAR' : ''} rigX(+0,5s)=${x.rigX}`).join(' | '))
  await p.evaluate(() => window.__barnspel.nav.go('library'))
  await p.waitForTimeout(500)
}
console.log(`\nBobo-raden hördes ${bobo}/${VARV} · intro efter Bobo ${ordning}/${VARV} · Bobo medan riggen kör ${iRorelse}/${VARV} · kapningar ${kapat} · sidfel ${fel.length}`)
await b.close()
