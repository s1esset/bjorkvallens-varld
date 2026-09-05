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
//   U0 matarm    tolv tryck pa fargkranen i STARTverkstan         -> f nar aldrig 8
//                ⚠️ MATARM, inte kontroll: den FALLER pa barlasten (dar nar samma tolv
//                tryck 9). U-familjens kontrollarm ar barlasten sjalv — satt START_TAK i
//                dna.js till hela tabellen (= HEAD) och kor om: U0 · U0b · U1a · U1 · U1c
//                · U1d ska da falla, medan U1b star kvar gron. Det ar precis darfor U1b ar
//                markt "bokforing": den mater raknaren, inte taket. (Att felmarka en
//                matarm som kontroll ar husets aterkommande misstag — se docens §5.)
//   U1 matarm    en kladning som passerar milstolpe 4              -> taket 8 -> 10,
//                firandet kort, och det NYA laget ar det kupan visar
//   U2 matarm    ALLA fyra firandena tanda, ett i taget             -> varje axel vaxer,
//                receptet star pa det forsta nya laget, noll konsolfel. Varlden bygger om
//                dioramat och balgen skalar blobben — helt andra vagar in i kupan an fargen,
//                och de nas aldrig av U1 (som bara passerar milstolpe 4)
//   D0 kontroll  aterbesok SAMMA dag, knytt pa hyllan             -> vanliga introrepliken
//   D1 matarm    aterbesok en ANNAN dag, knytt pa hyllan           -> "har saknat dig"
//   D2 kontroll  annan dag men TOM hylla                           -> vanliga introrepliken
//                (ATGARDER U4: klippet fanns, genererat och betalat, men anropades aldrig)
//   S0 kontroll  fem sparade poster, hyllan visar TRE              -> hyllan ar orord
//   S1 matarm    en runda till                                     -> 6 poster pa disk
//                (HEAD gav 3: bara hyllan sparades, det aldsta kastades — leverans 2)
//   B0 kontroll  alla fem delar provade, sedan vilostund          -> spaken lockar
//   B1 matarm    fars verkstad, upprepade vilostunder             -> OLIKA delar lockar,
//                var och en med SIN EGEN ton (farg 523 · gnista 659 · storlek 392 ·
//                monster 587 · varld 440). Fore fixen lyste `farg` alltid upp och tonen
//                var 392 — `storlek`s ton — oavsett vilken del det gallde.
//
//   L0 kontroll  pekaren ror sig LANGT fran knyttet         -> laget star kvar pa 'idle'
//                (gron aven pa HEAD — det ar precis vad en kontrollarm ska vara)
//   L1 matarm    pekaren ror sig NARA knyttet                -> 'lekfull'. FALLER pa HEAD,
//                dar `setLage` bara nas med 'glad' och laget aldrig kan intraffa
//   L2 matarm    pekaren STANNAR                             -> tillbaka till 'idle'
//   L3 matarm    `glad()` mitt i leken                       -> 'glad' vinner, och leken
//                aterupptas nar den 1,8 s langa gladjen tagit slut
//   L4 matarm    somnen nas fortfarande                      -> 'somnig' och 'sover'
//                (docens §9 B1: `_lage` styr FEM slingor, de fyra andra maste finnas kvar)
//   L5 matarm    GOR laget nagot, eller flippade bara en flagga? Lutningen ar SIGNERAD:
//                fingret till hoger ska luta kroppen at hoger och tvartom. L0-L4 laser
//                bara `_lage` — "byggd ar inte fungerar"
//
//   P0 kontroll  verkstan i vila, CPU strypt              -> maskinens billiga bildruta
//   P1 matarm    degfasen F2+F3, samma strypning            -> ritaDeg() + Mjukkropp +
//                bubblorna + ljusstormen, alltsa rundans dyraste fonster
//   P2           knackfasen, samma strypning                -> ceremonins scen UTAN
//                ritaDeg och utan losaren (andra referensen, i samma runda)
//   P3 barlast   25 ms brand per bildruta                   -> medianen MASTE stiga.
//                Utan den ar P0-P2 vardelosa: alla tre landar pa vsync-intervallet, och
//                ett mattat matt kan inte skilja "billig fas" fran "trasig matare"
//
//   node scripts/_knyttprobe.mjs [--cpu 4]
//
// ⚠️ Kor ALDRIG bredvid en annan webblasarsond eller `npm run test:all` — tva headless
// Chrome svalter varandras ticker och forfalskar varandras svar.
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const CPU = (() => {
  const i = process.argv.indexOf('--cpu')
  return i >= 0 ? Number(process.argv[i + 1]) : 4
})()
const SPAK = { x: 1160, y: 350 }
const KNACK = { x: 640, y: 470 }  // aggets mitt i 'klacka' — samma punkt for varje familj
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

  /**
   * Spelar en runda till slut. `rorVerktyg` avgor om barnet trycker pa fargkranen.
   * `stannaPaBanken` lamnar knyttet STAENDE pa banken i stallet for att stanga rundan —
   * L-familjen mater pa det knyttet, och ett spaktryck till hade skickat hem det.
   */
  const rundan = async (rorVerktyg, stannaPaBanken = false) => {
    if (rorVerktyg) {
      await klick(T_LAGE.farg.x, T_LAGE.farg.y)
      await page.waitForTimeout(300)
    }
    await klick(SPAK.x, SPAK.y)
    // Ceremonin ar 6,5 s; vanta in 'klacka' i stallet for att gissa pa en klocka.
    await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 })
    // Fyra knackningar, over KNACK_SPARR (0,18 s).
    for (let i = 0; i < 4; i++) {
      await klick(KNACK.x, KNACK.y)
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
    if (stannaPaBanken) return
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
  // Modulo TAKET, inte tabellen: startverkstan har 8 farger (ATGARDER U3), inte 10.
  rader.push(['C0 kontroll  rort recept lamnas ifred', `f ${f0} → tryck → ${f1} (ett steg, inte tva)`, f1 === (f0 + 1) % 8])

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

  // =========================================================== U: upplasningarna
  // Verkstan borjar smalare an tabellerna och vaxer med antalet klackta (ATGARDER U3).
  // Den rena logiken mats av `_upplasprobe.mjs`; HAR matas att spelet faktiskt bar den.
  await start()
  await satMatare()

  // U0 KONTROLLARM. Tolv tryck pa fargkranen i en ny verkstad far aldrig na index 8.
  // Pa HEAD (utan tak) nar samma tolv tryck 9 — armen faller dar, alltsa mater den.
  let maxF = 0
  for (let i = 0; i < 12; i++) {
    await klick(T_LAGE.farg.x, T_LAGE.farg.y)
    await page.waitForTimeout(120)
    maxF = Math.max(maxF, await page.evaluate(() => window.__barnspel.game._val.f))
  }
  const tak0 = await page.evaluate(() => ({ ...window.__barnspel.game._tak }))
  rader.push(['U0 matarm    startverkstan har 8 farger', `hogsta f pa 12 tryck: ${maxF} (HEAD ger 9) · tak ${tak0.farg}`, maxF <= 7 && tak0.farg === 8])
  rader.push(['U0b          och 4 monster · 3 varldar · 3 storlekar', `${tak0.monster} · ${tak0.varld} · ${tak0.storlek}`, tak0.monster === 4 && tak0.varld === 3 && tak0.storlek === 3])

  // U1 MATARM. Sattet att na milstolpe 4 utan att spela fyra rundor: sparposten sags redan
  // ha tre klackta. Sedan EN riktig runda -> raknaren gar 3 -> 4 och firandet ska komma.
  await page.evaluate(() => {
    window.__barnspel.ctx.progress.setCustom('knytt', { v: 2, lista: [], n: 3, firad: 3, dag: 0 })
  })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1400)
  const fore = await page.evaluate(() => ({ n: window.__barnspel.game._antal, f: window.__barnspel.game._tak.farg }))
  rader.push(['U1a matarm   sparad raknare las tillbaka', `antal ${fore.n} · tak ${fore.f}`, fore.n === 3 && fore.f === 8])

  await rundan(false)
  await page.waitForTimeout(900) // firandet ligger sist i `_aterstall`
  const efter = await page.evaluate(() => {
    const g = window.__barnspel.game
    return { n: g._antal, firad: g._firad, tak: g._tak.farg, f: g._val.f }
  })
  // Kravet ar att taket VAXTE under rundan, inte bara att det ar 10 efterat. Forsta
  // versionen las bara slutvardet och var da GRON pa barlasten (tak 10 fore OCH efter) —
  // en matarm som inte kan skilja armarna at mater ingenting. Barlasten hittade den.
  rader.push(['U1 matarm    milstolpe 4 oppnar fargkranen', `tak ${fore.f} → ${efter.tak} · antal ${efter.n}`, efter.n === 4 && efter.tak === 10 && efter.tak > fore.f])
  // BOKFORING, inte tak: den har haller aven pa barlasten (raknaren ar oberoende av
  // taken) och far darfor aldrig lasas som bevis for att nagot lastes upp.
  rader.push(['U1b bokforing milstolpen ar FIRAD, en gang', `firad ${efter.firad}`, efter.firad === 4])
  // Avtackningen: receptet stalls pa det FORSTA nya laget sa kupan visar belonigen direkt.
  // En beloning barnet inte kan se ar ingen beloning.
  rader.push(['U1c          kupan visar den nya fargen', `_val.f ${efter.f} (forsta nya = 8)`, efter.f === 8])
  // ...och det sista laget ska nu ga att na — taket ar inte bara ett tal i en variabel.
  await klick(T_LAGE.farg.x, T_LAGE.farg.y)
  await page.waitForTimeout(200)
  const f9 = await page.evaluate(() => window.__barnspel.game._val.f)
  rader.push(['U1d          och det tionde laget gar att na', `f ${efter.f} → tryck → ${f9}`, f9 === 9])

  // U2 MATARM: de tre ovriga firandena. Att spela 16 rundor for att na dem vore 10 minuter;
  // i stallet flyttas raknaren och spelets EGEN `_provaUpplasning` anropas (ctx tas ur
  // `window.__barnspel.ctx`, samma ctx spelet fick). Vagen fram till anropet ar alltsa
  // genvag — men firandet sjalvt ar spelets, inte sondens.
  const felFore = errors.length
  const u2 = []
  for (const [vid, axel, nyttLage, takNyckel, vantatTak] of [
    [8, 'monster', 4, 'monster', 6],
    [12, 'varld', 3, 'varld', 4],
    [16, 'storlek', 3, 'storlek', 4],
  ]) {
    const r = await page.evaluate(([v, ax, nytt, nyckel]) => {
      const g = window.__barnspel.game
      g._antal = v
      g._firad = v - 1
      g._provaUpplasning(window.__barnspel.ctx)
      return { firad: g._firad, tak: g._tak[nyckel], val: { ...g._val }, ax, nytt }
    }, [vid, axel, nyttLage, takNyckel])
    await page.waitForTimeout(900) // laggIn ar animerad; fel dyker upp i callbacken
    const lage = { monster: r.val.m, varld: r.val.v, storlek: r.val.z }[axel]
    u2.push(`${axel} tak ${r.tak} lage ${lage}`)
    rader.push([`U2 matarm    milstolpe ${vid} (${axel})`, `tak ${r.tak}/${vantatTak} · recept ${lage}/${nyttLage} · firad ${r.firad}`, r.tak === vantatTak && lage === nyttLage && r.firad === vid])
  }
  rader.push(['U2b          inga konsolfel ur de tre firandena', `${errors.length - felFore} fel · ${u2.join(' · ')}`, errors.length === felFore])

  // ============================================================ D: aterkomsthalsningen
  const HALSNING = 'Titta, dina knytt har saknat dig!'
  const INTRO = 'Här bygger vi en liten värld åt ett nytt knytt!'
  /** Ett besok med en pahittad sparpost: returnerar allt narratorn sa vid monteringen. */
  const besok = async (dagOffset, lista) => {
    await page.evaluate(([off, l]) => {
      const dag = Math.floor(Date.now() / 86400000) + off
      window.__barnspel.ctx.progress.setCustom('knytt', { v: 2, lista: l, n: l.length, firad: 99, dag })
    }, [dagOffset, lista])
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(500)
    // Kroken sätts pa TJANSTEN, inte pa spelet: `mount()` talar innan sonden hinner nagot.
    await page.evaluate(() => {
      const v = window.__barnspel.voice
      if (!v.__hakad) {
        const s = v.say.bind(v)
        v.say = (t, o) => { window.__sagt.push(String(t)); return s(t, o) }
        v.__hakad = true
      }
      window.__sagt = []
    })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1300)
    return page.evaluate(() => (window.__sagt || []).slice())
  }
  const POST = [[123, 0, 0, 0, 0, 0, 0, 0]]
  const d0 = await besok(0, POST)
  rader.push(['D0 kontroll  samma dag → vanliga introt', d0.includes(HALSNING) ? 'HALSNING (fel)' : 'intro', !d0.includes(HALSNING) && d0.includes(INTRO)])
  const d1 = await besok(-1, POST)
  rader.push(['D1 matarm    annan dag → "har saknat dig"', d1.includes(HALSNING) ? 'halsning' : d1.join(' | ').slice(0, 60), d1.includes(HALSNING)])
  const d2 = await besok(-1, [])
  rader.push(['D2 kontroll  annan dag men tom hylla → intro', d2.includes(HALSNING) ? 'HALSNING (fel)' : 'intro', !d2.includes(HALSNING) && d2.includes(INTRO)])

  // ============================================ S: samlingen overlever hyllan (leverans 2)
  // Fore leverans 2 sparades bara hyllans TRE senaste, och varje fjarde klackning kastade
  // det aldsta knyttet for gott — Knyttboden kan bara visa det som finns pa disk. Fem poster
  // laggs in, en runda spelas, och sparposten lases tillbaka: HEAD ger 3 (hyllans tak),
  // den nya koden 6. Hyllan i verkstan ska fortfarande visa exakt tre.
  const FEM = [0, 1, 2, 3, 4].map((i) => [1000 + i, i, 0, i % 4, i % 3, 0, 0, 0])
  await besok(0, FEM)
  await satMatare()
  const sFore = await page.evaluate(() => {
    const g = window.__barnspel.game
    return { alla: g._alla?.length ?? -1, hylla: g._hyllData.length, bon: g._bon.filter((b) => b.knytt).length }
  })
  rader.push(['S0 kontroll  hyllan visar fortfarande tre', `hylla ${sFore.hylla} · bon med knytt ${sFore.bon}`, sFore.hylla === 3 && sFore.bon === 3])
  await rundan(false)
  const sEfter = await page.evaluate(() => {
    const g = window.__barnspel.game
    const sparat = window.__barnspel.ctx.progress.get()?.custom?.knytt
    return { alla: g._alla?.length ?? -1, hylla: g._hyllData.length, disk: sparat?.lista?.length ?? -1, n: sparat?.n }
  })
  rader.push(['S1 matarm    alla poster overlever en runda', `disk ${sEfter.disk} (HEAD ger 3) · minne ${sEfter.alla} · hylla ${sEfter.hylla} · n ${sEfter.n}`, sEfter.disk === 6 && sEfter.alla === 6 && sEfter.hylla === 3 && sEfter.n === 6])

  // ======================================== L: lekfulla laget (docens §9 B1)
  // Laget fanns skrivet men gick inte att na: `setLage()` anropades bara med 'glad'.
  // Vad det SKA betyda stod redan i dess egen kod — tva av dess fyra effekter (kroppens
  // lutning och sidoforflyttningen) star och faller med att `pekare` finns alls — sa
  // inkopplingen ar "fingret lever nara mig", inte ett pahittat villkor.
  //
  // Alla armar mats pa knyttet DAR DET STAR PA BANKEN, alltsa efter en hel runda. Det ar
  // enda stallet dar barnet och knyttet delar skarm utan att ceremonin styr laget.
  await start()
  // SAMMA runda som C och U kor, bara stannad pa banken. Den bar fyra hart vunna vantevillkor
  // (`klacka` · `_klar` · `_knyttYta`) som en egen kopia har garanterat glider ifran.
  // Knyttet trycks ALDRIG pa har: `_knyttYta` skickar hem det, och da finns inget att mata pa.
  await rundan(false, true)
  await page.waitForTimeout(500)

  const lage = () => page.evaluate(() => window.__barnspel.game._knytt?.lage ?? '(inget knytt)')
  /** For pekaren i sma steg, sa `globalpointermove` fyras pa riktigt hela vagen. */
  const svep = async (x0, y0, x1, y1, n = 10) => {
    for (let i = 0; i <= n; i++) {
      await page.mouse.move(X(x0 + ((x1 - x0) * i) / n), Y(y0 + ((y1 - y0) * i) / n))
      await page.waitForTimeout(40)
    }
  }

  // L0 — samma ROLSE, men langt bort. Utan den mater L1 bara "pekaren rorde sig".
  await svep(140, 250, 300, 250)
  const l0 = await lage()
  rader.push(['L0 kontroll  pekaren ror sig LANGT bort', l0, l0 === 'idle'])

  // L1 — knyttet star pa (800, 470) med r 92, alltsa en lekzon pa 230 px.
  await svep(730, 500, 870, 500)
  const l1 = await lage()
  rader.push(['L1 matarm    pekaren ror sig NARA', `${l1} (HEAD kan bara ge idle)`, l1 === 'lekfull'])

  // L2 — fingret stannar. LEK_SLAPP ar 0,45 s.
  await page.waitForTimeout(900)
  const l2 = await lage()
  rader.push(['L2 matarm    pekaren stannar → slapper', l2, l2 === 'idle'])

  // L3 — 'glad' far ALDRIG kapas av leken. Anropet ar spelets egen vag in (`_boTryck` och
  // `_hemTillBoet` gor samma sak); knyttets traffyta gar inte att trycka pa har, for den
  // skickar hem det.
  await svep(730, 500, 870, 500)
  // Blockkropp, inte uttryck: `glad()` returnerar `this` och playwright kan inte
  // serialisera en Pixi-nod ("object reference chain is too long").
  await page.evaluate(() => { window.__barnspel.game._knytt.glad() })
  await page.waitForTimeout(200)
  const l3a = await lage()
  // ...och efter gladjens 1,8 s ska leken kunna aterupptas.
  await page.waitForTimeout(1900)
  await svep(730, 500, 870, 500)
  const l3b = await lage()
  rader.push(['L3 matarm    glad vinner over leken', `${l3a} → (1,8 s) → ${l3b}`, l3a === 'glad' && l3b === 'lekfull'])

  // L5 kors FORE L4 med flit: L4 snabbspolar `_stilla` och parkerar knyttet SOVANDE, och
  // ur det laget finns ingen lutning kvar att mata. Numret foljer docens §9 B1, inte klockan.
  //
  // L5 — DET HAR ar arme som skiljer "laget nas" fran "laget gor nagot". L0-L4 laser
  // `_lage`, alltsa mekanismen; den har laser vad kroppen FAKTISKT gor. Lutningen ar
  // signerad, sa den bar sin egen kontrollarm: samma rorelse pa andra sidan maste ge
  // motsatt tecken, och ett matt som ger samma tal at bada sidorna mater nagot annat.
  /** Jigga pa plats sa laget lever medan fjadern (styvhet 30, dampning 7,5) hinner ikapp. */
  const dittra = async (x, y, ms) => {
    const t0 = Date.now()
    let i = 0
    while (Date.now() - t0 < ms) {
      await page.mouse.move(X(x + (i % 2 ? 5 : -5)), Y(y))
      await page.waitForTimeout(40)
      i++
    }
  }
  const kropp = () => page.evaluate(() => {
    const k = window.__barnspel.game._knytt
    return { lut: k.s.lut, sido: k.s.sido, lage: k.lage }
  })
  await svep(830, 480, 930, 480, 10)
  await dittra(930, 480, 700)
  const lH = await kropp()
  await svep(930, 480, 670, 480, 16)
  await dittra(670, 480, 700)
  const lV = await kropp()
  rader.push([
    'L5 matarm    lutningen foljer fingrets SIDA',
    `hoger ${lH.lut.toFixed(3)} rad / ${lH.sido.toFixed(1)} px · vanster ${lV.lut.toFixed(3)} / ${lV.sido.toFixed(1)}`,
    lH.lage === 'lekfull' && lV.lage === 'lekfull' && lH.lut > 0.04 && lV.lut < -0.04,
  ])

  // L4 — de tva somnlagena. `_stilla` snabbspolas: det ar SAMMA maskin som raknar upp den,
  // bara utan 20 s vantan. Fingret flyttas forst ut ur lekzonen.
  await page.mouse.move(X(200), Y(200))
  await page.waitForTimeout(700)
  await page.evaluate(() => { window.__barnspel.game._knytt._stilla = 11.9 })
  await page.waitForTimeout(250)
  const l4a = await lage()
  await page.evaluate(() => { window.__barnspel.game._knytt._stilla = 19.9 })
  await page.waitForTimeout(250)
  const l4b = await lage()
  rader.push(['L4 matarm    somnen nas fortfarande', `${l4a} → ${l4b}`, l4a === 'somnig' && l4b === 'sover'])

  // ========================================== P: haller degfasen bildrutebudgeten?
  // Docens §9 C ville mata "ritaDeg()s ~75 allokeringar per bildruta" med
  // `_fpsprobe --cpu 6`. DEN PREMISSEN FALLER: `_fpsprobe` navigerar till MENYN och
  // sprutar partiklar i fxLayer for att jamfora de tva partikelvagarna — den oppnar
  // aldrig ett spel, och kan alltsa inte se ceremonins kod. Posten ar darfor omskriven
  // till den fraga som gar att svara pa och som ar den foraldern kanner:
  //
  //   HALLER degfasen bildrutebudgeten pa en strypt processor?
  //
  // Tre fonster i SAMMA runda pa samma maskin, sa dagsformen inte kan forvaxlas med
  // fasens kostnad. Attributionen ar medvetet grov: P1 bar ritaDeg OCH Mjukkropp-losaren
  // OCH bubblorna OCH ljusstormen. Sticker P1 inte ut behovs ingen attribution — och
  // gor den det ar DET passet som far isolera vilken av de fyra som kostar.
  //
  // ⚠️ VAD MATTET INTE SER: allt som ryms INNANFOR bildrutebudgeten. rAF-intervallet
  // klipps av vsync, sa en fas som kostar 6 ms rapporterar samma 17,4 ms som en som
  // kostar 1. Sonden svarar alltsa pa "spracker degfasen budgeten?", aldrig pa
  // "vad kostar ritaDeg?". Den forsta fragan ar den barnet kanner; den andra kraver en
  // profilerare och ar inte vard ett pass forran den forsta ger fel svar.
  const cdp = await page.context().newCDPSession(page)
  /** Bildrutetider i ms over `ms` millisekunder, forsta rutan kastad (den bar starten). */
  const rutor = (ms) => page.evaluate((ms) => new Promise((res) => {
    const d = []
    const t0 = performance.now()
    let f = t0
    const steg = () => {
      const n = performance.now()
      d.push(n - f)
      f = n
      if (n - t0 < ms) requestAnimationFrame(steg)
      else res(d.slice(1))
    }
    requestAnimationFrame(steg)
  }), ms)
  const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1] || 0 }
  const p95 = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length * 0.95)] || 0 }
  const tal = (a) => `median ${median(a).toFixed(1)} ms · p95 ${p95(a).toFixed(1)} ms · ${a.length} rutor`

  await start()
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  await page.waitForTimeout(500)
  const pVila = await rutor(2500)

  await klick(SPAK.x, SPAK.y)
  // F2 borjar 1,55 s efter spaktrycket och F3 slutar 5,30 s — matningen halls inne i
  // fonstret med marginal i bada andar. Inga tryck under tiden: `_skynda` kortar
  // tidslinjen 0,12 s per anrop och hade flyttat fasgransen mitt i matningen.
  await page.waitForTimeout(1750)
  const pDeg = await rutor(3200)

  await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 })
  const pKnack = await rutor(2000)

  // P3 BARLAST — utan den ar de tre talen ovan vardelosa. De landade alla pa 17,5 ms,
  // alltsa exakt headless Chromes vsync-intervall (~57 fps), och ett matt som ar MATTAT
  // kan inte skilja "billig fas" fran "trasig matare". Barlasten branner en KAND budget
  // per bildruta: 25 ms ryms inte i en ruta, sa medianen MASTE stiga. Gor den inte det
  // mater sonden ingenting och de gronna P-talen ska ignoreras.
  await page.evaluate(() => {
    window.__barlast = () => { const t = performance.now(); while (performance.now() - t < 25); }
    window.__barlastTick = () => { window.__barlast(); window.__barlastId = requestAnimationFrame(window.__barlastTick) }
    window.__barlastTick()
  })
  const pBar = await rutor(1600)
  await page.evaluate(() => { cancelAnimationFrame(window.__barlastId); window.__barlastId = 0 })
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })

  const TAK = 33.4 // tva bildrutor pa 60 Hz — over det kanns det som hack, inte som tyngd
  rader.push([`P0 kontroll  verkstan i vila (CPU ${CPU}x)`, tal(pVila), pVila.length > 30])
  rader.push(['P1 matarm    degfasen F2+F3', tal(pDeg), median(pDeg) < TAK])
  rader.push(['P2           knackfasen (ingen ritaDeg)', tal(pKnack), pKnack.length > 20])
  rader.push(['P3 barlast   25 ms brand per bildruta', tal(pBar), median(pBar) > median(pVila) + 6])
  rader.push([
    '   degfasen mot vilan',
    `${(median(pDeg) / Math.max(0.1, median(pVila))).toFixed(2)}x medianen · ${(median(pDeg) - median(pVila)).toFixed(1)} ms extra · barlasten ${(median(pBar) - median(pVila)).toFixed(1)} ms`,
    true,
  ])

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
