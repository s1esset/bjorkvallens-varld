// AUTO-HJÄLPENS RÖST — hörs den, eller klipps den av sin egen räkning?
//
//   node scripts/_hjalpprobe.mjs        (kräver dev-servern på :5173)
//
// `ballonglyft` tog emot `{ auto: true }` i `_attachLoose` och läste det aldrig. När
// spelet hjälpte till sa `_recue` "Jag hjälper dig — en ballong till!" och räkneordet
// följde i SAMMA tick — men `VoiceService.say()` inleder med `cancel()`, så hjälprepliken
// dog innan den hunnit två tiondelar. Ett ~3 s klipp, aldrig hört.
//
// Sonden lyssnar där sanningen finns: den hookar `_playUrls` och `cancel` i den RIKTIGA
// tjänsten och mäter
//   1. hur många klipp auto-hjälpen skickar i EN sändning (1 = bara siffran; 2 = kedjan),
//   2. om ett `cancel()` inträffar mellan hjälprepliken och räkneordet,
//   3. hur länge hjälpklippet faktiskt fick spela innan det byttes ut,
//   4. att barnets EGET tryck fortfarande bara säger räkneordet (ingen ny pratighet),
//   5. exit mitt i auto-hjälpen.
import { chromium } from 'playwright'

const ID = 'ballonglyft'
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(() => !!window.__barnspel.game?._loose?.length, null, { timeout: 15000 })

  // Hooka den riktiga tjänsten. Vi mäter vad som SPELAS, inte vad som sägs — det är
  // skillnaden mellan de två som är buggen.
  await page.evaluate(() => {
    const v = window.__barnspel.ctx.services.voice
    const logg = []
    window.__rostlogg = logg
    const url2text = new Map()
    for (const [text, fil] of v._clips ? v._clips.entries() : []) url2text.set(fil, text)
    const origPlay = v._playUrls.bind(v)
    v._playUrls = (urls) => {
      logg.push({ typ: 'spela', t: performance.now(), n: urls.length, texter: urls.map((u) => url2text.get(u) || u.split('/').pop()) })
      return origPlay(urls)
    }
    const origCancel = v.cancel.bind(v)
    v.cancel = () => {
      logg.push({ typ: 'avbryt', t: performance.now() })
      return origCancel()
    }
  })

  console.log('\nAUTO-HJÄLPENS RÖST — ballonglyft\n')

  // --- 1. Barnets EGET tryck: bara räkneordet -----------------------------------
  await page.evaluate(() => {
    window.__rostlogg.length = 0
    const g = window.__barnspel.game
    const b = g._loose.find((x) => !x._taken)
    b.emit('pointertap')
  })
  await page.waitForTimeout(600)
  const eget = await page.evaluate(() => window.__rostlogg.filter((r) => r.typ === 'spela'))
  ok(
    'barnets eget tryck säger BARA räkneordet',
    eget.length === 1 && eget[0].n === 1,
    eget.map((e) => `[${e.texter.join(' + ')}]`).join(' ') || '(inget spelades)',
  )

  // --- 2. Auto-hjälpen: en kedja, inget avbrott ---------------------------------
  // Idle-hjälpen kommer i två faser (~9 s lockar, ~+3,5 s fäster). Vi väntar ut båda.
  await page.evaluate(() => {
    window.__rostlogg.length = 0
  })
  await page.waitForFunction(() => window.__barnspel.game?._n >= 2, null, { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(400)
  const logg = await page.evaluate(() => window.__rostlogg)
  const spelningar = logg.filter((r) => r.typ === 'spela')
  const hjalp = spelningar.find((s) => s.texter.some((t) => /hjälper dig/.test(t)))
  ok('auto-hjälpen säger hjälprepliken alls', !!hjalp, hjalp ? `[${hjalp.texter.join(' + ')}]` : 'hjälprepliken spelades ALDRIG')
  ok(
    'hjälpreplik + räkneord kommer som EN kedja',
    !!hjalp && hjalp.n === 2,
    hjalp ? `${hjalp.n} klipp i sändningen` : '—',
  )

  // Hur länge fick hjälpklippet leva innan nästa sändning/avbrott?
  if (hjalp) {
    const efter = logg.filter((r) => r.t > hjalp.t)
    const nasta = efter.find((r) => r.typ === 'spela' || r.typ === 'avbryt')
    const livstid = nasta ? nasta.t - hjalp.t : Infinity
    ok(
      'hjälpklippet klipps inte av räkningen',
      livstid > 900,
      nasta ? `${Math.round(livstid)} ms till nästa ${nasta.typ}` : 'inget avbrott alls',
    )
  } else {
    ok('hjälpklippet klipps inte av räkningen', false, 'ingen hjälpreplik att mäta')
  }

  // --- 3. Exit mitt i auto-hjälpen ------------------------------------------------
  errors.length = 0
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(800)
  ok('exit efter auto-hjälpen är rent', errors.length === 0, errors.slice(0, 2).join(' | ') || '0 fel')

  console.log(`\n  ${fel === 0 ? '✓ alla mått gröna' : `✗ ${fel} mått röda`}\n`)
} finally {
  await browser.close()
}
process.exit(fel === 0 ? 0 : 1)
