// unika-knytt — sonden docens §7 kallar OBLIGATORISK, och som aldrig blev byggd.
//
// Bakgrund: harnessens nio standardtryck ligger AVSIKTLIGT utanfor spakens traffyta
// (§1b ar en staende layout-invariant: max x = 950, spaken star pa 1160), sa
// `npm run test unika-knytt` kor aldrig ceremonin. Uppmatt i .test-logs: 0 `takt/spak` i
// bada korningarna. Det ar ratt och medvetet — men det gor ocksa att allt bakom spaken
// bara kan matas har.
//
// Den har forsta versionen mater de TVA beteendeandringar som gjordes 2026-09-01 efter
// den forsta oberoende kvalitetskritiken. Bada har en KONTROLLARM som maste ge motsatt
// svar, annars mater sonden ingenting:
//
//   A0 kontroll  pekaren ror sig med knappen UPPE under degfasen  -> knada() ska vara 0
//   A1 matarm    pekaren ror sig med knappen NERE                 -> knada() ska vara >0
//                och `skynda()` far INTE folja med draget (den kortar tidslinjen 0,12 s
//                per anrop och hade brant hela taket 1,2 s pa ett enda drag)
//   C0 kontroll  en runda DAR barnet rort fargkranen               -> receptet star kvar
//   C1 matarm    en runda dar barnet inte rort nagot                -> receptet cyklat
//   D  matarm    tiden 'avtack' -> `_klar` maste rymma taglinen (3,232 s klipp)
//   B0 kontroll  alla fem delar provade, sedan vilostund          -> spaken lockar
//   B1 matarm    fars verkstad, upprepade vilostunder             -> OLIKA delar lockar,
//                var och en med SIN EGEN ton (farg 523 · gnista 659 · storlek 392 ·
//                monster 587 · varld 440). Fore fixen lyste `farg` alltid upp och tonen
//                var 392 — `storlek`s ton — oavsett vilken del det gallde.
//
//   node scripts/_knyttprobe.mjs
//
// ⚠️ Kor ALDRIG bredvid en annan webblasarsond eller `npm run test:all` — tva headless
// Chrome svalter varandras ticker och forfalskar varandras svar.
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const SPAK = { x: 1160, y: 350 }
const TONER = { farg: 523, gnista: 659, storlek: 392, monster: 587, varld: 440 }
const T_LAGE = {
  farg: { x: 300, y: 250 },
  gnista: { x: 950, y: 250 },
  storlek: { x: 300, y: 450 },
  monster: { x: 950, y: 450 },
  varld: { x: 480, y: 630 },
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
let fel = 0

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  const start = async () => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1600)
  }

  await start()
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const X = (x) => geo.x0 + x * geo.s
  const Y = (y) => geo.y0 + y * geo.s
  const klick = (x, y) => page.mouse.click(X(x), Y(y))

  // ---- matare: hakar pa spelets EGNA metoder, inte pa koordinater ----
  const satMatare = () =>
    page.evaluate(() => {
      const g = window.__barnspel.game
      window.__knad = 0
      window.__skynda = 0
      window.__lock = []
      window.__toner = []

      // knada/skynda ligger pa ceremoni-objektet, som byts per omgang -> haka pa nar det finns.
      window.__hakaCer = () => {
        const c = g._cer
        if (!c || c.__hakad) return false
        const k = c.knada?.bind(c)
        const s = c.skynda?.bind(c)
        if (k) c.knada = (...a) => { window.__knad++; return k(...a) }
        if (s) c.skynda = (...a) => { window.__skynda++; return s(...a) }
        c.__hakad = true
        return true
      }

      for (const [ax, v] of Object.entries(g._verktyg || {})) {
        if (!v || v.__hakad) continue
        const l = v.locka?.bind(v)
        if (l) v.locka = (...a) => { window.__lock.push(ax); return l(...a) }
        v.__hakad = true
      }
      const spak = g._spak
      if (spak && !spak.__hakad) {
        const l = spak.locka?.bind(spak)
        if (l) spak.locka = (...a) => { window.__lock.push('SPAK'); return l(...a) }
        spak.__hakad = true
      }
      const a = window.__barnspel.audio
      if (a && !a.__hakad) {
        const t = a.tone.bind(a)
        a.tone = (o) => { window.__toner.push(o?.freq | 0); return t(o) }
        a.__hakad = true
      }
    })

  const las = () => page.evaluate(() => ({
    knad: window.__knad, skynda: window.__skynda,
    lock: window.__lock.slice(), toner: window.__toner.slice(),
    fas: window.__barnspel.game._fas,
  }))
  const nolla = () => page.evaluate(() => {
    window.__knad = 0; window.__skynda = 0; window.__lock.length = 0; window.__toner.length = 0
  })
  /** Tvinga fram en vilostund utan att vanta 7 s — gar genom spelets EGEN ticker. */
  const vila = async () => {
    await page.evaluate(() => { window.__barnspel.game._sistAktiv = performance.now() - 9000 })
    await page.waitForTimeout(260)
  }
  /** Ett drag over degen: `ner` avgor om knappen halls nere. */
  const dra = async (ner) => {
    await page.mouse.move(X(560), Y(430))
    if (ner) await page.mouse.down()
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(X(560 + i * 12), Y(430 + Math.sin(i / 2) * 26))
      await page.waitForTimeout(45)
    }
    if (ner) await page.mouse.up()
  }

  await satMatare()

  // =================================================================== A: knadningen
  // Starta ceremonin och vanta in degfasen (F2 borjar 1,55 s efter spaktrycket).
  await klick(SPAK.x, SPAK.y)
  await page.waitForTimeout(1900)
  await page.evaluate(() => window.__hakaCer())
  const fasNu = (await las()).fas

  await nolla()
  await dra(false)
  const a0 = await las()

  await nolla()
  await dra(true)
  const a1 = await las()

  rader.push(['A0 kontroll  drag med knappen UPPE', `knada ${a0.knad}`, a0.knad === 0])
  // `> 0` racker INTE: draget avslutas med en tap som ensam ger 1 knadning, och HEAD
  // (utan fixen) gav exakt 1. Kravet ar att SJALVA RORELSEN knadar.
  rader.push(['A1 matarm    drag med knappen NERE', `knada ${a1.knad} (HEAD gav 1 = bara tappen)`, a1.knad >= 3])
  // Ett drag avslutas med en `pointertap` i Pixi (down+up pa samma mal), och den tappen
  // gar till `_tomtTryck` -> `_skynda` — helt korrekt, ett tryck FAR korta tidslinjen.
  // Fragan ar om `skynda` skalar med RORELSEN: 12 flyttar gav 1 skynda mot 9 knadningar,
  // alltsa foljer den inte draget. (Forsta versionen krävde 0 och var darfor fel.)
  rader.push(['A1b          skynda skalar INTE med draget', `skynda ${a1.skynda} mot knada ${a1.knad}`, a1.skynda <= 1 && a1.knad >= 3 * Math.max(1, a1.skynda)])
  rader.push([`   (fas vid matningen: ${fasNu})`, '', true])

  // ============================================ C+D: en HEL runda (docens §7-kedja)
  // Harnessens nio tryck nar aldrig hit — spaken star pa 1160, dess hogsta x ar 950.
  await start()
  await satMatare()

  // Tidtagare pa fasbytet. `_fas` gar till 'avtack' vid pa('klack') och `_klar` satts i
  // `_fardigt`, som ar exakt det anrop som utloser `progress.complete()` -> `cancel()`.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    window.__tAvtack = 0
    window.__tKlar = 0
    window.__vakt = setInterval(() => {
      if (!window.__tAvtack && g._fas === 'avtack') window.__tAvtack = performance.now()
      if (!window.__tKlar && g._klar) window.__tKlar = performance.now()
    }, 16)
  })

  /** Spelar en runda till slut. `rorVerktyg` avgor om barnet trycker pa fargkranen. */
  const rundan = async (rorVerktyg) => {
    if (rorVerktyg) {
      await klick(T_LAGE.farg.x, T_LAGE.farg.y)
      await page.waitForTimeout(300)
    }
    await klick(SPAK.x, SPAK.y)
    // Ceremonin ar 6,5 s; vanta in 'klacka' i stallet for att gissa pa en klocka.
    await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 })
    // Fyra knackningar, over KNACK_SPARR (0,18 s).
    for (let i = 0; i < 4; i++) {
      await klick(640, 470)
      await page.waitForTimeout(260)
    }
    // Rundan aterstaller sig INTE sjalv, och det ar med flit: knyttet star kvar pa banken
    // tills barnet skickar hem det, precis som repliken "Tryck pa spaken igen sa gor vi ett
    // nytt knytt!" lovar. (Sondens forsta version vantade pa 'bygga' och hangde i 20 s —
    // spelet var ratt, matningen fel.) Vanta darfor in `_klar`, tryck sedan pa spaken.
    await page.waitForFunction(() => window.__barnspel.game._klar === true, null, { timeout: 20000 })
    // ...och vanta in att knyttet FAKTISKT star pa banken. `_spakTryckt`s 'avtack'-gren
    // kraver `_knyttYta`; trycks spaken tidigare kvitterar den bara och vagrar nollstalla,
    // med flit — fasen 'avtack' borjar redan vid klackningen, 2,6 s fore `_tillBanken`, och
    // att stanga rundan dar hade kastat bort knyttet barnet just gjort (docens §5 punkt 2).
    // Sondens version 2 tryckte efter 400 ms, trafade den garden och hangde. Spelet ratt.
    await page.waitForFunction(() => !!window.__barnspel.game._knyttYta, null, { timeout: 20000 })
    await klick(SPAK.x, SPAK.y)
    await page.waitForFunction(() => window.__barnspel.game._fas === 'bygga', null, { timeout: 20000 })
    await page.waitForTimeout(300)
  }

  const valFore = await page.evaluate(() => ({ ...window.__barnspel.game._val }))
  await rundan(false)
  const valEfter = await page.evaluate(() => ({ ...window.__barnspel.game._val }))
  const tider = await page.evaluate(() => ({ a: window.__tAvtack, k: window.__tKlar }))

  const cyklat = ['f', 'm', 'v'].filter((k) => valFore[k] !== valEfter[k])
  rader.push([
    'C1 matarm    orort recept cyklas',
    `f ${valFore.f}→${valEfter.f} · m ${valFore.m}→${valEfter.m} · v ${valFore.v}→${valEfter.v}`,
    cyklat.length === 3,
  ])

  // D: taglinen "Titta, hela varlden kommer ut!" ar 3,232 s (ffprobe). HEAD gav 2,65 s.
  const gap = (tider.k - tider.a) / 1000
  rader.push(['D  matarm    avtack→klar rymmer taglinen', `${gap.toFixed(2)} s mot klippets 3,23 s (HEAD 2,65)`, gap >= 3.23])

  // C0 kontroll: nu ROR barnet fargkranen -> dess val ska sta kvar, inget cyklas.
  const f0 = await page.evaluate(() => window.__barnspel.game._val.f)
  await rundan(true)
  const f1 = await page.evaluate(() => window.__barnspel.game._val.f)
  // Ett tryck stegar fargen ett steg; darefter far `_aterstall` INTE rora den.
  rader.push(['C0 kontroll  rort recept lamnas ifred', `f ${f0} → tryck → ${f1} (ett steg, inte tva)`, f1 === (f0 + 1) % 10])

  await page.evaluate(() => clearInterval(window.__vakt))

  // =================================================================== B: vilohjalpen
  await start()
  await satMatare()

  // B1: fars verkstad — fyra vilostunder i rad ska locka OLIKA delar.
  await nolla()
  const lockade = []
  const tonPar = []
  for (let i = 0; i < 4; i++) {
    await nolla()
    await vila()
    const r = await las()
    const ax = r.lock[0] || '-'
    lockade.push(ax)
    // INTE `toner[0]`: `tryck()` spelar forst delens MEKANISKA ljud (fargkranens
    // trahandtag 300 Hz, monsterhjulets ratsch 220 Hz) och identitetstonen kommer efter.
    // Forsta versionen las [0], fick klacket och rapporterade fel — sondens fel, inte kodens.
    tonPar.push(`${ax}:${r.toner.join('/') || '-'}`)
  }
  const unika = new Set(lockade.filter((x) => x !== '-' && x !== 'SPAK'))
  const tonRatt = tonPar.every((p) => {
    const [ax, f] = p.split(':')
    if (ax === '-' || ax === 'SPAK') return true
    return f.split('/').map(Number).includes(TONER[ax])
  })
  rader.push(['B1 matarm    olika delar lockas', `${lockade.join(' → ')} (${unika.size} unika)`, unika.size >= 3])
  // Vakuum-vakt: pa HEAD lockades ALDRIG en del, och da var `every()` sant utan att ha
  // provat nagonting. En arm som ar gron for att den inte matte far inte rakna som gron.
  rader.push(['B1b          varje del sin EGEN ton', tonPar.join('  '), tonRatt && unika.size > 0])

  // RIKTIG kontrollarm for B: utan en vilostund far ingenting locka — maste halla i BADA
  // armarna, annars mater B bara att tiden gar.
  await nolla()
  await page.waitForTimeout(600)
  const bK = await las()
  rader.push(['B0 kontroll  ingen vilostund → inget lockas', bK.lock.join(',') || '(inget)', bK.lock.length === 0])

  // B2 ar en MATARM, inte en kontroll: den faller pa HEAD (uppmatt "(inget)"). `_vakna()`
  // nollar `_hintSteg`, sa efter fem tryck ar nasta vilostund steg 1 — och HEADs steg 1
  // sager bara en replik och returnerar utan att peka nagonstans. Med fixen finns ingen
  // oprovad del kvar, och da ar spaken ratt svar.
  for (const [, p] of Object.entries(T_LAGE)) await klick(p.x, p.y)
  await page.waitForTimeout(400)
  await nolla()
  await vila()
  const b2 = await las()
  rader.push(['B2 matarm    allt provat → spaken lockar', b2.lock.join(',') || '(inget)', b2.lock.includes('SPAK')])

  // =================================================================== exit
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  rader.push(['exit         inga konsolfel', `${errors.length} fel`, errors.length === 0])
  if (errors.length) for (const e of errors.slice(0, 4)) rader.push([`   ${e}`, '', false])
} finally {
  await browser.close()
}

console.log(`\n  unika-knytt — vilohjalpen och knadningen\n`)
for (const [namn, varde, ok] of rader) {
  if (!ok) fel++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(40)} ${varde}`)
}
console.log(`\n  ${fel === 0 ? '✓ alla armar som vantat' : `✗ ${fel} arm(ar) fel`}\n`)
process.exit(fel === 0 ? 0 : 1)
