// SOND: BÄR karaktärsriggens tween-lista taket 48 på riktigt?
//
// V17 rättade `Karaktar._track` från `t.isActive?.()` till `t?.parent` — samma rättning som
// redan gjorts i `Ansikte._track` och `badrum.js:211`. Men rättningen har en OMÄTT PREMISS:
// filtret körs bara när listan passerar 48, och ingen har vägt om `_tw` någonsin kommer dit
// i verklig lek. Gör den aldrig det är fixen gratis och verkningslös på samma gång.
//
// Sonden mäter per rigg:
//   max         längsta lista riggen någonsin haft
//   komp        antal komprimeringar (dvs. gånger listan passerat 48)
//   tappade     hur många VÄNTANDE tweens (parent sann, isActive falsk) som HEADs mätare
//               hade kastat ur listan vid de komprimeringarna — exakt de som destroy()
//               sedan aldrig hade dödat
//
// ⚠️ BÅDA MÄTARNA KÖRS PÅ SAMMA DATA i samma körning: sonden för en SKUGGLISTA vid sidan av
// den riktiga och filtrerar den med HEADs predikat. Det är starkare än två armar — armarna
// kan inte driva isär, för de ser exakt samma tween-ström. Vid `destroy()` jämförs listorna:
// `missadeAvHead` = tweens som LEVER (eller väntar) vid exit och som HEADs bokföring tappat
// bort, `kvarEfterRivning` = hur många av dem som fortfarande lever EFTER rivningen.
//
// Ordningen är kontrollarm först (repots regel): K0 = en rigg som bara står och andas (talet
// ska vara nära noll), K1 = en barlast med känt utslag (300 påtvingade humörbyten — talet
// MÅSTE röra sig). Först därefter mätarmarna: riktiga spel som drivs med riktiga pekningar.
//
//   node scripts/_riggprobe.mjs [--sek 25] [--spel a,b,c]
import { chromium } from 'playwright'

const opt = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const url = opt('--url', 'http://localhost:5173')
const SEK = Number(opt('--sek', '25'))
const SPEL = opt('--spel', 'leksakslada,balanstornet,elementlekplatsen,borsta-tanderna').split(',')

// ⚠️ URL:en MÅSTE hämtas ur sidans EGNA resurser. Vite hänger på `?t=<tid>` efter varje
// HMR-ändring, och ett rakt `import('/src/lib/karaktarer.js')` ger då en ANDRA modul-
// instans: prototypen som hakas är inte den spelen ärver från (uppmätt: `instanceof`
// falsk, riggarna helt osynliga för sonden). Samma fälla som gsap-kopian i `_nullprobe`.
const HAKE = () => import(performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/lib/karaktarer.js'))).then((M) => {
  const K = M.Karaktar
  if (K.prototype.__hakad) return 'redan hakad'
  const stat = new WeakMap()
  window.__rigg = { poster: [], aktiva: [], etikett: 'start' }
  const s = (o) => {
    let x = stat.get(o)
    if (!x) {
      x = { etikett: window.__rigg.etikett, max: 0, komp: 0, tappade: 0, tappadeMax: 0, skapad: 0, head: [], vidExit: null }
      stat.set(o, x)
      window.__rigg.poster.push(x)
      window.__rigg.aktiva.push(o)
    }
    return x
  }
  const origTrack = K.prototype._track
  K.prototype._track = function (tw) {
    const st = s(this)
    st.skapad++
    if (this._tw.length > 48) {
      st.komp++
      const t = this._tw.filter((x) => x?.parent && !x.isActive?.()).length
      st.tappade += t
      if (t > st.tappadeMax) st.tappadeMax = t
    }
    // Skugglistan: HEADs bokföring, rad för rad, på exakt samma tween-ström.
    if (st.head.length > 48) st.head = st.head.filter((x) => x && x.isActive?.())
    st.head.push(tw)
    const r = origTrack.call(this, tw)
    if (this._tw.length > st.max) st.max = this._tw.length
    return r
  }
  const origD = K.prototype.destroy
  K.prototype.destroy = function () {
    const st = s(this)
    const levande = this._tw.filter((t) => t?.parent)
    const missade = levande.filter((t) => !st.head.includes(t))
    st.vidExit = { lista: this._tw.length, levande: levande.length, missadeAvHead: missade.length, kvarEfterRivning: 0 }
    const r = origD.call(this)
    st.vidExit.kvarEfterRivning = missade.filter((t) => t?.parent).length
    const i = window.__rigg.aktiva.indexOf(this)
    if (i >= 0) window.__rigg.aktiva.splice(i, 1)
    return r
  }
  K.prototype.__hakad = true
  window.__K = K
  window.__mk = M.makeKaraktar
  return 'hakad'
})

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = new Map()

const skriv = async (page, etikett) => {
  const p = await page.evaluate((e) => (window.__rigg?.poster || []).filter((x) => x.etikett === e).map((x) => ({
    max: x.max, komp: x.komp, tappade: x.tappade, tappadeMax: x.tappadeMax, skapad: x.skapad, vidExit: x.vidExit,
  })), etikett)
  if (!p.length) return console.log(`  ${etikett.padEnd(22)} — ingen rigg`)
  for (const x of p) {
    const e = x.vidExit
    console.log(
      `  ${etikett.padEnd(22)} skapade=${String(x.skapad).padStart(4)} max=${String(x.max).padStart(3)}` +
      ` komp=${String(x.komp).padStart(3)} tappadeVantande=${String(x.tappade).padStart(3)} (max ${x.tappadeMax}/komp)` +
      (e ? ` · exit: lista=${e.lista} levande=${e.levande} missadeAvHead=${e.missadeAvHead} kvarEfterRivning=${e.kvarEfterRivning}` : ' · (ej riven)')
    )
  }
}

// Riktiga pekningar över spelytan: växlar tap och drag så både knappar och dragspel nås.
const spela = async (page, sek) => {
  const t0 = Date.now()
  const P = [[300, 250], [640, 300], [980, 260], [420, 470], [860, 480], [640, 560], [200, 400], [1080, 400]]
  let i = 0
  while (Date.now() - t0 < sek * 1000) {
    const a = P[i % P.length]
    const b = P[(i + 3) % P.length]
    if (i % 2) {
      await page.mouse.click(a[0], a[1])
    } else {
      await page.mouse.move(a[0], a[1])
      await page.mouse.down()
      for (let k = 1; k <= 10; k++) {
        await page.mouse.move(a[0] + ((b[0] - a[0]) * k) / 10, a[1] + ((b[1] - a[1]) * k) / 10)
        await page.waitForTimeout(30)
      }
      await page.mouse.up()
    }
    await page.waitForTimeout(220)
    i++
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => { const k = (e.message || '').slice(0, 90); fel.set(k, (fel.get(k) || 0) + 1) })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  // Uppvärmning: modulen måste vara LADDAD innan haken kan hitta dess riktiga URL.
  await page.evaluate((i) => window.__barnspel.nav.go('game', { id: i }), SPEL[0])
  await page.waitForTimeout(1800)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1000)
  console.log('  hake: ' + (await page.evaluate(HAKE)))

  // ── KONTROLLARM K0: en rigg som bara står och andas. Talet ska vara nära noll.
  await page.evaluate(() => { window.__rigg.etikett = 'K0 vila' })
  await page.evaluate(() => { window.__k0 = window.__mk({ r: 54 }) })
  await page.waitForTimeout(6000)
  await page.evaluate(() => window.__k0.destroy())
  await skriv(page, 'K0 vila')

  // ── KONTROLLARM K1: barlast med känt utslag. Rör sig talet ALLS?
  await page.evaluate(() => { window.__rigg.etikett = 'K1 barlast' })
  await page.evaluate(async () => {
    const k = window.__mk({ r: 54 })
    window.__k1 = k
    const M = ['glad', 'stolt', 'forvanad', 'nyfiken', 'hungrig', 'ledsen', 'somnig']
    for (let i = 0; i < 300; i++) {
      k.setMood(M[i % M.length])
      if (i % 5 === 0) k.blink()
      if (i % 17 === 0) k.look(100 + i, 60 + i)
      if (i % 40 === 0) await new Promise((r) => requestAnimationFrame(r))
    }
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => window.__k1.destroy())
  await skriv(page, 'K1 barlast')

  // ── MÄTARMAR: riktiga spel, riktiga pekningar.
  for (const id of SPEL) {
    await page.evaluate((e) => { window.__rigg.etikett = e }, id)
    await page.evaluate((i) => window.__barnspel.nav.go('game', { id: i }), id)
    await page.waitForTimeout(1800)
    await spela(page, SEK)
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(1200)
    await skriv(page, id)
  }

  console.log('\n  KONSOLFEL:')
  for (const [m, n] of fel) console.log(`  ×${n} ${m}`)
  if (!fel.size) console.log('  (inga)')
} finally {
  await browser.close()
}
