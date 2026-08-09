// Vilorörelsen (feedback.liv): rör sig föremålen alls, och rör de sig i EGEN takt?
// `breathe` var skal-bara och synkron — tio föremål i lås läses som en pulserande yta,
// inte som tio levande saker. Sonden mäter amplitud och fasspridning i tal.
//
//   antal      hur många objekt i scenen som har en liv-tween
//   amplitud   px mellan högsta och lägsta y under ~1,2 s (per objekt, medel)
//   fasspridning  0 = alla guppar exakt i lås, 1 = jämnt utspridda över cykeln
//   exit       lever någon liv-tween kvar efter att spelet lämnats?
//
//   node scripts/_livprobe.mjs <spel-id>
import { chromium } from 'playwright'

const ID = process.argv[2] || 'loopdjuren'
const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1800)

  // Samla alla objekt i skärmens träd som bär en liv-tween.
  await page.evaluate(() => {
    const hittade = []
    const gata = (n) => {
      if (!n || n.destroyed) return
      if (n._fxLiv) hittade.push(n)
      for (const c of n.children || []) gata(c)
    }
    gata(window.__barnspel.nav.ctx.screenHolder)
    window.__liv = hittade
    window.__spar = hittade.map(() => [])
  })

  for (let i = 0; i < 24; i++) {
    await page.evaluate(() => {
      window.__liv.forEach((n, j) => window.__spar[j].push(n.destroyed ? null : n.y))
    })
    await page.waitForTimeout(50)
  }

  const res = await page.evaluate(() => {
    const amp = []
    const fas = []
    window.__spar.forEach((s) => {
      const v = s.filter((x) => x != null)
      if (v.length < 4) return
      amp.push(Math.max(...v) - Math.min(...v))
      // Var i cykeln ligger objektet? Ta positionen relativt sitt eget spann.
      const lo = Math.min(...v)
      const hi = Math.max(...v)
      fas.push(hi > lo ? (v[0] - lo) / (hi - lo) : 0)
    })
    return { n: window.__liv.length, amp, fas }
  })

  const medel = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
  // Fasspridning: hur utspridda är objektens cykellägen? 0 = lås, ~0.29 = jämnt slumpat.
  const spridning =
    res.fas.length > 1 ? Math.sqrt(medel(res.fas.map((f) => (f - medel(res.fas)) ** 2))) : 0

  // Exit-koll: mät att tweenen slutar TICKA, inte att den rapporterar sig inaktiv.
  // En liv-tween som dödas inifrån sin egen onUpdate fryser sin totalTime men kan
  // fortfarande svara true på isActive() — den siffran ljuger alltså.
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)
  const t1 = await page.evaluate(() => window.__liv.map((n) => n._fxLiv?.totalTime() ?? -1))
  await page.waitForTimeout(700)
  const kvar = await page.evaluate(
    (fore) => window.__liv.filter((n, i) => (n._fxLiv?.totalTime() ?? -1) > fore[i] + 0.05).length,
    t1,
  )

  console.log(`\n  ${ID} — vilorörelse`)
  console.log(`  objekt med liv   ${res.n}`)
  console.log(`  amplitud         ${medel(res.amp).toFixed(1)} px i snitt (minsta ${Math.min(...res.amp).toFixed(1)})`)
  console.log(`  fasspridning     ${spridning.toFixed(2)}   (0 = alla i lås, ~0,29 = jämnt utspridda)`)
  console.log(`  tickar efter exit ${kvar} av ${res.n}`)
  console.log(`  konsolfel        ${errors.length}`)
  for (const e of errors.slice(0, 5)) console.log('    ' + e)

  const fel = res.n === 0 || medel(res.amp) < 1 || (res.n > 2 && spridning < 0.12) || kvar > 0 || errors.length > 0
  console.log(fel ? '\n  ✗ ingen rörelse, lås eller kvarlevande tween\n' : '\n  ✓ rörelse, egen takt per objekt, allt dör vid exit\n')
  process.exit(fel ? 1 : 0)
} finally {
  await browser.close()
}
