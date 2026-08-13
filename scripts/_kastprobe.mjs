// KASTPROBE — kastar mat på pappa i `mata-munnen` (ägaruppdrag 2, steg 4).
//
// Kastet är ett svep genom luften, och därför inte något ett grönt test kan se: det
// hinner varken skriva ett konsolfel eller lämna ett spår i bilden. Det här mäter det.
//
// ⚠️ KONTROLLARMARNA FÖRST — varje rad här kan bli grön av fel skäl:
//   1. ETT LÅNGSAMT SLÄPP FÅR INTE BLI ETT KAST. Utan den raden vet man inte om tröskeln
//      finns; "kastet fungerar" kan lika gärna betyda "allt är ett kast".
//   2. ETT SNABBT DRAG SOM STANNAR FÖRE SLÄPPET FÅR INTE BLI ETT KAST. Prov läggs bara
//      vid `pointermove`, så det sista provet bär full fart hur länge fingret än stått
//      still efteråt — den fällan är tyst och `KAST_ALDER` är det som stänger den.
//   3. EN FLYKT SOM MISSAR FÅR INTE RÄKNAS SOM TRÄFF. Kastet mot en punkt 300 px UNDER
//      ansiktet är kontrollarmen till svep-testet: träffar den är svepet för girigt.
//
// Mätarmarna: träffandel per brädplats · tunnling vid full fart · exit mitt i en flykt.
//
//   node scripts/_kastprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')
const ID = 'mata-munnen'
const errors = []
let fel = 0
const rad = (ok, text) => { if (!ok) fel++; console.log(`  ${ok ? '✓' : '✗'} ${text}`) }

const las = (page) => page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  return {
    atna: g._atna,
    geggor: g._geggor?.length ?? 0,
    busy: !!g._busy,
    losa: (g._losa || []).length,
    flygande: (g._losa || []).filter((r) => r._flyger).length,
    mun: { x: Math.round(g._mun?.x ?? 0), y: Math.round(g._munY ?? 0) },
    kast: [...(g.__kast || [])],
    slapp: [...(g.__slapp || [])],
    mat: (g._mat || []).filter((r) => !r._uppaten && !r.view.destroyed)
      .map((r) => ({ key: r.data.key, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
  }
})

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(1600)

  // Spelets EGEN mätning av släppfarten hämtas ur kroken, inte räknas om här. En
  // omräkning i sonden hade mätt sondens musdrivning, inte det spelet faktiskt fick.
  const spionera = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    if (g.__kast) return
    g.__kast = []
    g.__slapp = []
    const orig = g._kasta
    g._kasta = function (ctx, rec, k) {
      const svar = orig.call(this, ctx, rec, k)
      g.__kast.push({ fart: +k.fart.toFixed(2), tog: svar === true })
      return svar
    }
    // ⚠️ ETT TOMT `__kast` HAR TVÅ HELT OLIKA ORSAKER: kroken ropades aldrig (fingret låg
    // över ett mål, eller farten var för låg), eller kroken sa nej. Utan `_onUp`-spåret
    // står "0 kast" för båda, och sonden pekar då åt fel håll.
    const dc = g._drag
    const ou = dc._onUp.bind(dc)
    dc._onUp = function (rec) {
      if (dc.active === rec) {
        const f = dc._slappFart(rec)
        g.__slapp.push({ dragen: !!rec.dragging, prov: rec._spar?.length ?? 0,
          fart: f ? +f.fart.toFixed(2) : null,
          mal: !!dc._targetUnder(rec.tx, rec.ty),
          x: Math.round(rec.tx), y: Math.round(rec.ty) })
      }
      return ou(rec)
    }
  })
  await spionera()

  const nolla = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    g.__kast = []
    g.__slapp = []
  })

  let s = await las(page)
  const MUN = s.mun
  console.log(`\n  KASTET — munnen (${MUN.x}, ${MUN.y}) · tallrik ${s.mat.length} bitar\n`)

  // ⚠️ SIKTET VAR SONDENS TVÅ FÖRSTA FEL, båda tysta, båda gröna kontrollarmar.
  //  1. Ett släpp 42 % på vägen mot munnen ligger från brädans MITTPLATSER redan inne i
  //     snäppradien (702 → 102 px, taket är 130): `_targetUnder` hittar ett mål, kroken
  //     ropas aldrig, och biten blir uppäten av ett vanligt släpp. 4 av 6 "missar".
  //  2. Att i stället backa 190 px från munnen gav noll ANSATS från samma platser
  //     (utgångsläget hamnade 8 px från släpppunkten) — uppmätt släppfart 0,00–0,35 px/ms
  //     mot tröskelns 0,85. Sonden mätte då sin egen musdrivning, inte spelet.
  //
  // Och det är en riktig upptäckt om banan, inte bara en sondbugg: RAKT UNDER ansiktet
  // finns ingen plats att ta sats på (bänken ligger 452–558, munnen på 350). Därifrån
  // släpper man maten — man kastar den inte. Kastet mäts därför bara där ansatsen finns.
  const AVST = 150 // px från munnen — utanför snäppradien (130), innanför ansatsen
  const ANSATS = 90 // px — kortare än så är det ingen kaströrelse
  const banan = (bit, mal) => Math.hypot(mal.x - bit.x, mal.y - bit.y) - AVST
  const valjBit = (s, mal) => s.mat.slice().sort((a, b) => banan(b, mal) - banan(a, mal))[0] || null

  // ⚠️ RAKT UNDER ANSIKTET FINNS INGEN PLATS ATT TA SATS PÅ, och det är geometri, inte
  // en inställning: bänken ligger 452–558 och munnen på 350, alltså ~180 px lodrätt.
  // Uppmätt: 6 av 8 brädplatser saknade ansats när kastet krävde att det STARTADE där
  // maten låg. Handen gör i stället det uppenbara — drar undan åt sidan och snärtar
  // diagonalt — och där finns gott om väg (x 250 ger 407 px till munnen).
  const UPPVIND = [{ x: 250, y: 520 }, { x: 1000, y: 520 }]
  const uppvind = (bit, mal) =>
    UPPVIND.filter((p) => Math.hypot(mal.x - p.x, mal.y - p.y) - AVST >= ANSATS)
      .sort((a, b) => Math.hypot(a.x - bit.x, a.y - bit.y) - Math.hypot(b.x - bit.x, b.y - bit.y))[0]

  // Kastet som en hand gör det: greppa maten, dra undan LUGNT om det behövs (fart som
  // hinner förfalla ur ringbufferten), och SNÄRTA sista biten. Returnerar ansatsen.
  const kastaFran = async (bit, mal, o = {}) => {
    if (!bit) return null
    await page.mouse.move(bit.x, bit.y)
    await page.mouse.down()
    let p = bit
    // Vind alltid upp när ansatsen är kort. Ett 111 px kast går inte att driva fort nog
    // med playwrights musdrivning (~20 ms per steg), och då mäter armen sonden.
    if (banan(bit, mal) < 260) {
      const u = uppvind(bit, mal)
      if (!u) { await page.mouse.up(); return null }
      for (let i = 1; i <= 6; i++) {
        await page.mouse.move(bit.x + (u.x - bit.x) * (i / 6), bit.y + (u.y - bit.y) * (i / 6))
        await page.waitForTimeout(55)
      }
      p = u
    }
    const d = Math.hypot(mal.x - p.x, mal.y - p.y)
    const ansats = d - AVST
    if (ansats < ANSATS) { await page.mouse.up(); return null }
    const t = ansats / d
    const langs = (u) => ({ x: p.x + (mal.x - p.x) * t * u, y: p.y + (mal.y - p.y) * t * u })
    const u0 = Math.min(0.5, 18 / ansats) // 18 px räcker över dragets 12 px-tröskel
    const q = langs(u0)
    await page.mouse.move(q.x, q.y)
    await page.waitForTimeout(220) // ringbufferten förfaller — snärten mäts ensam
    const dt = Math.max(0, Math.round((o.ms ?? 60) / 5))
    for (let i = 1; i <= 5; i++) {
      const r = langs(u0 + (1 - u0) * (i / 5))
      await page.mouse.move(r.x, r.y)
      if (dt) await page.waitForTimeout(dt)
    }
    if (o.hall) await page.waitForTimeout(o.hall)
    await page.mouse.up()
    return Math.round(ansats)
  }

  // ---- KONTROLL 1: långsamt släpp ----------------------------------------
  await nolla()
  let bit = valjBit(s, MUN)
  rad(await kastaFran(bit, MUN, { ms: 1400 }) !== null, `  (ansats fanns: ${Math.round(banan(bit, MUN))} px)`)
  await page.waitForTimeout(700)
  let k = (await las(page)).kast
  rad(k.every((x) => !x.tog), `KONTROLL långsamt släpp blir INTE kast (${k.length ? k.map((x) => x.fart).join('/') + ' px/ms' : 'kroken ropades aldrig'})`)

  // ---- KONTROLL 2: snabbt drag som STANNAR före släppet -------------------
  await nolla()
  s = await las(page)
  bit = valjBit(s, MUN)
  await kastaFran(bit, MUN, { ms: 60, hall: 420 })
  await page.waitForTimeout(700)
  k = (await las(page)).kast
  rad(k.every((x) => !x.tog), `KONTROLL snabbt drag + 420 ms stillastående blir INTE kast (${k.length ? k.map((x) => x.fart).join('/') : 'kroken ropades aldrig'})`)

  // ---- KONTROLL 3: kast mot en punkt LÅNGT under ansiktet -----------------
  await nolla()
  s = await las(page)
  bit = valjBit(s, { x: 1120, y: 530 })
  let fore = { atna: s.atna, geggor: s.geggor }
  // VÅGRÄTT under ansiktet, inte "mot en punkt under det": en riktning som pekar snett
  // ner blir ett kort kast (siktet backar 190 px från målet), och ett kort kast mäter
  // ingenting. Banan går här på y 530 medan ansiktets ellips slutar vid 395.
  const under = { x: 1120, y: 530 }
  await kastaFran(bit, under, { ms: 60 })
  await page.waitForTimeout(1800)
  let e = await las(page)
  rad(e.kast.some((x) => x.tog), `  (kastet gick iväg: ${e.kast.map((x) => x.fart).join('/')} px/ms)`)
  rad(e.atna === fore.atna && e.geggor === fore.geggor,
    `KONTROLL kast UNDER ansiktet träffar ingenting (ätna ${fore.atna}→${e.atna}, gegga ${fore.geggor}→${e.geggor})`)

  if (fel) {
    console.log('\n  Kontrollarmarna föll — mätarmarna är inte värda att läsa.\n')
    process.exit(1)
  }

  // ---- MÄTARM 4: träffandel från brädans platser -------------------------
  console.log('')
  let mun = 0
  let ansikte = 0
  let bom = 0
  let utanAnsats = 0
  const varv = 8
  for (let i = 0; i < varv; i++) {
    s = await las(page)
    if (s.busy || !s.mat.length) { await page.waitForTimeout(1400); continue }
    await nolla()
    // Alla brädans platser i tur och ordning — inklusive de som ligger för nära ansiktet
    // för att kunna kastas ifrån. De räknas SEPARAT: ett tak som tystas bort läser som
    // "allt gick bra" (CLAUDE.md: inga tysta bortval).
    bit = s.mat[i % s.mat.length]
    fore = { atna: s.atna, geggor: s.geggor }
    const ansats = await kastaFran(bit, MUN, { ms: 60 })
    if (ansats === null) { utanAnsats++; continue }
    await page.waitForTimeout(2200)
    e = await las(page)
    if (!e.kast.some((x) => x.tog)) { bom++; console.log(`    (ansats ${ansats} px men inget kast: ${JSON.stringify(e.slapp)})`); continue }
    if (e.atna > fore.atna) mun++
    else if (e.geggor > fore.geggor) ansikte++
    else bom++
    await page.waitForTimeout(1400)
  }
  const kastade = mun + ansikte + bom
  const traff = mun + ansikte
  console.log(`  TRÄFF ${traff}/${kastade} kast nådde pappa (mun ${mun} · ansikte ${ansikte} · bänken ${bom})`)
  if (utanAnsats) console.log(`  ${utanAnsats}/${varv} kast gick inte att ta sats till alls`)
  rad(kastade > 0 && traff >= Math.ceil(kastade * 0.5), `kastet går att sikta (≥50 % av kasten når ansiktet)`)

  // ---- MÄTARM 5: tunnling vid full fart ----------------------------------
  // Full fart TVÄRS genom munnen från vänster. Ett punkttest i stegets slutläge kan
  // hoppa över den; svepet får inte.
  await nolla()
  s = await las(page)
  {
    bit = valjBit(s, MUN)
    fore = { atna: s.atna, geggor: s.geggor }
    await kastaFran(bit, MUN, { ms: 0 })
    await page.waitForTimeout(2200)
    e = await las(page)
    const f = Math.max(0, ...e.kast.map((x) => x.fart))
    rad(e.atna > fore.atna || e.geggor > fore.geggor,
      `SVEP full fart (${f} px/ms) tunnlar inte genom ansiktet (ätna ${fore.atna}→${e.atna}, gegga ${fore.geggor}→${e.geggor}) ${JSON.stringify(e.slapp)}`)
  }

  // ---- 6: EXIT mitt i en flykt -------------------------------------------
  await nolla()
  s = await las(page)
  {
    // ⚠️ MÅLET FÅR INTE LIGGA BAKOM ANSIKTET. Första försöket siktade upp åt vänster
    // och släpppunkten hamnade INNE i bus-ellipsen (430, 194) — kroken sa nej (`tog:
    // false`) och exit-raden mätte ett kast som aldrig fanns. Vänsterkanten på bänkhöjd
    // ger en lång flykt med hela banan under ansiktet.
    const bort = { x: 236, y: 430 }
    bit = valjBit(s, bort)
    await kastaFran(bit, bort, { ms: 30 })
    // Flykten är kort. EN avläsning 90 ms efter släppet kan lika gärna ligga efter den
    // som mitt i — läs upprepat och ta det största talet, annars mäter raden turen.
    let iLuften = 0
    let sist = null
    for (let i = 0; i < 8; i++) {
      sist = await las(page)
      iLuften = Math.max(iLuften, sist.flygande)
      if (iLuften) break
    }
    if (!iLuften) console.log(`    (inget flög: kast ${JSON.stringify(sist?.kast)} · busy ${sist?.busy} · lösa ${sist?.losa})`)
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(1200)
    rad(iLuften > 0, `exit-testet lämnade MEDAN något flög (${iLuften} i luften)`)
  }

  rad(errors.length === 0, `0 konsolfel${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''}`)
  console.log(`\n  ${fel === 0 ? '✓ ALLT GRÖNT' : `✗ ${fel} fel`}\n`)
} finally {
  await browser.close()
}
process.exit(fel ? 1 : 0)
