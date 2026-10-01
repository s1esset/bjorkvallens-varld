// _nathem.mjs — natskott-pa-stans HEMKOMST, med tre olika figurer i dörren:
//   R  reserven (tom profil → ett av spelets monster)
//   K  barnets knytt (ett nyss "kläckt" knytt i sessionsminnet → kommer först, F5.3)
//   C  barnets kompis
// Fyller baksätet med vänner, startar hemkomsten direkt (spelets egen _homecoming), tar
// bilder genom hela finalen, och LÄMNAR mitt i den i varje arm. Efter exit: inga levande
// figurer (levandeFigurer() ur APPENS modulinstans), 0 konsolfel.
//
//   node scripts/_nathem.mjs [--url http://localhost:5174] [--ut .test-shots/_nathem]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const url = opt('--url', 'http://localhost:5174')
const UT = opt('--ut', '.test-shots/_nathem')
mkdirSync(UT, { recursive: true })
const ID = 'natskott-pa-stan'
const KNYTT0 = [12345, 2, 1, 3, 0, 1, 0, 0, 0]
const KOMPIS0 = { kropp: 2, ogon: 3, mun: 2, topp: 1, farg: 6, storlek: 2 }

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 300)))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel?.profiles?.activeId?.(), null, { timeout: 20000 })

const ga = async () => {
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(() => window.__natdbg && window.__natdbg._alive, null, { timeout: 15000 })
  await page.waitForTimeout(900)
}
const MOD = async () =>
  page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/src/lib/egnafigurer.js')) || '/src/lib/egnafigurer.js')

const resultat = {}
const arm = async (namn, forbered) => {
  await ga()
  const mod = await MOD()
  await page.evaluate(async ({ mod, forbered, KNYTT0, KOMPIS0 }) => {
    const m = await import(mod)
    m.glomSessionen()
    const s = window.__barnspel
    if (forbered === 'knytt') m.minns(s, 'knytt', KNYTT0)
    if (forbered === 'kompis') m.minns(s, 'kompis', KOMPIS0)
    // ett knytt barnet bara MÖTT (soffan i popcornkalaset) — takten: arm C visade ett eget,
    // så en tom omgång först, sedan det mötta
    if (forbered === 'mott') {
      m.minnsMott(s, 'knytt', [777777, 4, 1, 2, 3, 0, 1, 0, 0])
    }
  }, { mod, forbered, KNYTT0, KOMPIS0 })
  // sex vänner i baksätet, kvällen nästan fallen, hem NU
  await page.evaluate(() => {
    const g = window.__natdbg
    const ctx = window.__barnspel.ctx
    for (const [k, art] of [['katt'], ['monster', 'goblin'], ['ballong'], ['hund'], ['monster', 'spoke'], ['paket']]) g._landFriend(ctx, k, false, art)
    g._kvall = 0.8
    g._missionsDone = 3
    g._homecoming(ctx)
  })
  const bild = async (t, tag) => {
    await page.waitForTimeout(t)
    await page.screenshot({ path: `${UT}/${namn}-${tag}.png` })
  }
  await bild(2500, '1-dorr')
  await bild(1800, '2-firande')
  const info = await page.evaluate(async (mod) => {
    const m = await import(mod)
    const g = window.__natdbg
    const f = g._hemFig
    return {
      fig: f ? (f._wxReserv ? 'reserv' : `${f.typ}${f.mott ? '/mott' : ''}`) : null,
      egen: f ? m.arEgen(f) : false,
      levande: m.levandeFigurer().length,
      kvall: +g._kvall.toFixed(2),
      utvanner: g._outFriends.length,
    }
  }, mod)
  await bild(2400, '3-in-i-huset')
  const lampor = await page.evaluate(() => (window.__natdbg._hemGlow?._wxLampor || []).map((l) => l.tand))
  // LÄMNA mitt i (vännerna går in, tweens i luften), in igen, ut igen
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)
  const efterExit = await page.evaluate(async (mod) => (await import(mod)).levandeFigurer().length, mod)
  resultat[namn] = { ...info, lampor, efterExit }
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(400)
}

await arm('R', null)
// barnets samlingar måste FINNAS (valjEgna visar bara figurer som finns i samlingen) —
// seedas genom källspelens egen progress, som _egnafigurprobe gör
const seeda = async (spel, nyckel, varde) => {
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), spel)
  await page.waitForTimeout(1500)
  await page.evaluate(([n, v]) => window.__barnspel.ctx.progress.setCustom(n, v), [nyckel, varde])
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(500)
}
await seeda('unika-knytt', 'knytt', { v: 2, lista: [KNYTT0], n: 1, firad: 3, dag: 0, torka: 0 })
await seeda('bygg-en-kompis', 'galleri', [KOMPIS0])
await arm('K', 'knytt')
await arm('C', 'kompis')
// M: töm samlingarna igen — då är det MÖTTA knyttet enda figuren i poolen
await seeda('unika-knytt', 'knytt', { v: 2, lista: [], n: 0, firad: 3, dag: 0, torka: 0 })
await seeda('bygg-en-kompis', 'galleri', [])
await arm('M', 'mott')

// sista armen: spela vidare EFTER hemkomsten in i nästa runda (huset scrollar bort med figuren).
// Ett mött knytt i en nollställd session → barnets figur står i dörren (inte reserven).
await ga()
await page.evaluate(async (mod) => {
  const m = await import(mod)
  m.glomSessionen()
  m.minnsMott(window.__barnspel, 'knytt', [777777, 4, 1, 2, 3, 0, 1, 0, 0])
}, await MOD())
await page.evaluate(() => {
  const g = window.__natdbg
  const ctx = window.__barnspel.ctx
  for (const k of ['katt', 'ballong', 'hund']) g._landFriend(ctx, k, false)
  g._kvall = 0.8
  g._missionsDone = 3
  g._homecoming(ctx)
})
await page.waitForTimeout(9200)
await page.screenshot({ path: `${UT}/vidare-morgon.png` })
const vidare = await page.evaluate(async (mod) => {
  const m = await import(mod)
  const g = window.__natdbg
  const seg = g._mid.find((s) => s.hem)
  return { phase: g._phase, kvall: +g._kvall.toFixed(2), hemSeg: g._mid.filter((s) => s.hem).length, figKvar: !!seg?.fig, egen: seg?.fig ? m.arEgen(seg.fig) : false, levande: m.levandeFigurer().length }
}, await MOD())
await page.waitForTimeout(9000)
const vidare2 = await page.evaluate(() => {
  const g = window.__natdbg
  return { hemSeg: g._mid.filter((s) => s.hem).length, kvall: +g._kvall.toFixed(2), uppdrag: g._missionKey }
})
// kör ifrån huset (fart ×10 en stund): när hemmet scrollat ut ska figuren i dörren vara riven
const mod = await MOD()
await page.evaluate(() => {
  const g = window.__natdbg
  g._scrollBase = 25
  g._scroll = 25
})
await page.waitForTimeout(2500)
const bortkort = await page.evaluate(async (mod) => {
  const m = await import(mod)
  const g = window.__natdbg
  g._scrollBase = 2.1
  g._scroll = 2.1
  return { hemSeg: g._mid.filter((s) => s.hem).length, levande: m.levandeFigurer().length }
}, mod)
vidare2.bortkort = bortkort
await page.evaluate(() => window.__barnspel.nav.go('menu'))
await page.waitForTimeout(500)

console.log(JSON.stringify({ resultat, vidare, vidare2, errors, errorCount: errors.length }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
