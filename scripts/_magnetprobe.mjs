// Magnetfiske-sond: mäter ägarens två rapporterade fel i stället för att resonera om dem.
//
//   A) PASSIV — spelet laddas och INGET rörs på 8 s. Rapporterar hur många metallsaker
//      som fastnar av sig själva, när den första gör det, och hur många som hamnar
//      OVANFÖR dammens toppvägg (= tunnlat igenom den vid hög fart).
//   B) JITTER — magneten dras på en sak tills den fastnar och hålls sedan STILLA.
//      Fastklistrade saker ska ligga på en fast offset från magneten; sonden mäter hur
//      mycket den offseten skakar (max avvikelse + hopp mellan bildrutor) för både
//      kroppen och den synliga vyn.
//   C) SORTERNA — bygger nivå 0–3 och kontrollerar att varje sak heter något
//      `makeThing` har en gren för. Ett okänt id ritas som sista grenen, helt tyst:
//      så visade nivå 0–2 en TRÄBÅT där ankan skulle stå. Ligger SIST i sonden, för
//      dess nivåsvep måste bounca via biblioteket och den övergången (~0,4 s) krockar
//      annars med mätningarna ovan.
//
//   node scripts/_magnetprobe.mjs [nivå]      (default 3 = full damm, 5 metall + 3 kork)
import { chromium } from 'playwright'

const ID = 'magnet-fiske'
const LVL = Number(process.argv[2] ?? 3)
const WALL_TOP = 200 // POND.y0 — kroppens centrum kan aldrig nå hit utan att tunnla

const snap = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    // Modulen är en singleton och lever kvar efter destroy() — `_magnet` finns då som
    // referens men är riven, och Pixi v8 nollar `_position` så `.x` KASTAR. Snapen får
    // därför aldrig lita på att spelet är monterat bara för att modulen svarar.
    if (!g?._items || !g._magnet || g._magnet.destroyed) return null
    return {
      mx: g._magnet.x,
      my: g._magnet.y,
      caught: g._caught,
      needed: g._needed,
      stuck: g._stuck.length,
      niva: g._level,
      poles: !!g._poles,
      polaritet: g._falt?.polaritet ?? null,
      flipSyns: !!g._flipBtn && !g._flipBtn.destroyed && g._flipBtn.visible,
      flipTryckbar: !!g._flipBtn && !g._flipBtn.destroyed && g._flipBtn.eventMode === 'static',
      huvud: g._head && !g._head.destroyed ? 1 : 0,
      items: g._items.map((it) => ({
        kind: it.emoji, // sorts-id, INTE en emoji (namnet är kvar från migreringen)
        metal: it.metal,
        pol: it.pol | 0,
        stuck: !!it.stuck,
        delivered: !!it.delivered,
        slot: it.slot,
        bx: it.body.position.x,
        by: it.body.position.y,
        spd: it.body.speed,
        vx: it.view && !it.view.destroyed ? it.view.x : null,
        vy: it.view && !it.view.destroyed ? it.view.y : null,
      })),
    }
  }, ID)

const stat = (xs) => {
  if (!xs.length) return { min: 0, max: 0, spann: 0 }
  const min = Math.min(...xs)
  const max = Math.max(...xs)
  return { min, max, spann: max - min }
}
const r1 = (v) => Number(v.toFixed(1))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

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
  await page.evaluate(
    ({ gid, lvl }) => {
      const s = window.__barnspel.save
      s.update((d) => {
        const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
        if (!p) return
        p.games = p.games || {}
        p.games[gid] = { ...(p.games[gid] || { unlocked: true, stars: 0, custom: {} }), highestLevel: lvl }
      })
      s.flush()
    },
    { gid: ID, lvl: LVL },
  )
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(
    async (gid) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      return !!(g?._items?.length && g._magnet && !g._magnet.destroyed)
    },
    ID,
    { timeout: 8000 },
  )
  await page.waitForTimeout(700)

  console.log(`\n  Magnetsond — ${ID}, nivå ${LVL}\n`)

  // ---- A) PASSIV: rör ingenting -------------------------------------------
  const s0 = await snap(page)
  if (!s0) {
    console.log(
      '  DIAG: ' +
        JSON.stringify(
          await page.evaluate(async (gid) => {
            const g = (await import('/src/games/registry.js')).getGame(gid)
            return { har: !!g, items: g?._items?.length ?? null, magnet: !!g?._magnet, riven: g?._magnet?.destroyed ?? null, resolving: !!g?._resolving }
          }, ID),
        ),
    )
    throw new Error('spelet var inte monterat när mätningen skulle börja')
  }
  const metalN = s0.items.filter((i) => i.metal).length
  console.log(`  A) PASSIV — ${metalN} metall + ${s0.items.length - metalN} kork, magnet parkerad (${r1(s0.mx)}, ${r1(s0.my)})`)
  console.log(`     start: ${s0.items.filter((i) => i.metal).map((i) => `(${Math.round(i.bx)},${Math.round(i.by)})`).join(' ')}`)

  let firstStick = null
  let maxSpd = 0
  let tunneled = 0
  const seenTunnel = new Set()
  for (let k = 0; k <= 80; k++) {
    const s = await snap(page)
    if (!s) break
    const t = k * 100
    for (const [i, it] of s.items.entries()) {
      if (it.spd > maxSpd) maxSpd = it.spd
      if (it.by < WALL_TOP && !seenTunnel.has(i) && !it.delivered) {
        seenTunnel.add(i)
        tunneled++
      }
    }
    if (firstStick == null && s.stuck > 0) firstStick = t
    if (k % 20 === 0 || (firstStick != null && t === firstStick)) {
      console.log(`     t=${String(t).padStart(4)} ms  fast=${s.stuck}  i hinken=${s.caught}/${s.needed}  toppfart=${r1(maxSpd)} px/steg`)
    }
    await page.waitForTimeout(100)
  }
  const sEnd = await snap(page)
  const fastnat = sEnd.items.filter((i) => i.stuck).length
  const levererat = sEnd.caught
  console.log(`\n     ► utan ett enda tryck: ${fastnat} fast + ${levererat} redan i hinken av ${metalN} metall`)
  console.log(`     ► första fastnandet: ${firstStick == null ? 'aldrig' : firstStick + ' ms'}`)
  console.log(`     ► saker ovanför toppväggen (tunnlat): ${tunneled}   toppfart: ${r1(maxSpd)} px/steg\n`)

  // ---- B) JITTER: dra magneten på en sak, håll den sedan stilla ------------
  let s = await snap(page)
  let target = s.items.find((i) => i.metal && !i.stuck && !i.delivered)
  if (target) {
    await page.mouse.move(s.mx, s.my)
    await page.mouse.down()
    // dra i etapper så globalpointermove hinner följa med
    for (let k = 1; k <= 12; k++) {
      const cur = await snap(page)
      const tg = cur.items.find((i) => i.metal && !i.stuck && !i.delivered)
      if (!tg) break
      await page.mouse.move(cur.mx + (tg.bx - cur.mx) * (k / 12), cur.my + (tg.by - cur.my) * (k / 12))
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(500)
  }
  s = await snap(page)
  console.log(`  B) JITTER — ${s.stuck} sak(er) fast, magneten hålls stilla i 1,5 s`)

  // Offset kropp→magnet och vy→magnet ska vara KONSTANT för en fastklistrad sak.
  const series = new Map() // itemIndex -> { bx:[], by:[], vx:[], vy:[] }
  const t0 = Date.now()
  let frames = 0
  while (Date.now() - t0 < 1500) {
    const q = await snap(page)
    if (!q) break
    frames++
    for (const [i, it] of q.items.entries()) {
      if (!it.stuck || it.delivered) continue
      if (!series.has(i)) series.set(i, { bx: [], by: [], vx: [], vy: [] })
      const e = series.get(i)
      e.bx.push(it.bx - q.mx)
      e.by.push(it.by - q.my)
      if (it.vx != null) {
        e.vx.push(it.vx - q.mx)
        e.vy.push(it.vy - q.my)
      }
    }
  }
  console.log(`     ${frames} prov`)
  if (!series.size) console.log('     (ingen sak fastnade — inget att mäta)')
  for (const [i, e] of series) {
    const hop = (xs, ys) => {
      let m = 0
      for (let k = 1; k < xs.length; k++) m = Math.max(m, Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]))
      return m
    }
    const bxs = stat(e.bx)
    const bys = stat(e.by)
    const vxs = stat(e.vx)
    const vys = stat(e.vy)
    console.log(
      `     sak ${i}: kropp-offset spann x ${r1(bxs.spann)} / y ${r1(bys.spann)} px, max hopp ${r1(hop(e.bx, e.by))} px` +
        `  |  VY-offset spann x ${r1(vxs.spann)} / y ${r1(vys.spann)} px, max hopp ${r1(hop(e.vx, e.vy))} px`,
    )
  }

  // ⚠️ SLÄPP KNAPPEN. Avsnitt B lämnade musen NEDTRYCKT genom resten av sonden. Med en
  // hållen knapp tvärs över fyra skärmbyten revs spelet mitt i avsnitt D:s mätning
  // (DIAG: items 0, magneten riven, skärmen fortfarande 'game' — alltså GameHost mitt i
  // en ombyggnad, vilket bara ett tryck på hem-knappen gör).
  await page.mouse.up()

  // --- C) SORTERNA: ritas varje sak som den sort den heter? ---------------------
  // Ett sorts-id som `makeThing` inte känner igen faller igenom till sista grenen och
  // ritas som något HELT annat, helt tyst. Så levde nivå 0–2 med en träbåt där ankan
  // skulle stå, i tio nivåer, eftersom `korkPool` fortfarande höll emoji-strängar.
  // Måttet är billigt och fångar hela klassen: varje sak i varje nivå måste heta något
  // `makeThing` faktiskt har en gren för.
  const KANDA = ['fisk', 'nyckel', 'mynt', 'skruv', 'burk', 'anka', 'badring', 'batt', 'stavrod', 'stavbla']
  let sortFel = 0
  const sedda = new Set()
  for (const lvl of [0, 1, 2, 3]) {
    await page.evaluate(
      ({ gid, l }) => {
        const s = window.__barnspel.save
        s.update((d) => {
          const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
          if (!p) return
          p.games = p.games || {}
          p.games[gid] = { ...(p.games[gid] || { unlocked: true, stars: 0, custom: {} }), highestLevel: l }
        })
        s.flush()
      },
      { gid: ID, l: lvl },
    )
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction(
      async (gid) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        return !!(g?._items?.length && g._magnet && !g._magnet.destroyed)
      },
      ID,
      { timeout: 8000 },
    )
    const q = await snap(page)
    const okanda = (q?.items || []).map((i) => i.kind).filter((k) => !KANDA.includes(k))
    for (const i of q?.items || []) sedda.add(i.kind)
    if (okanda.length) sortFel++
    console.log(`  nivå ${lvl}: ${(q?.items || []).map((i) => i.kind).join(', ')}${okanda.length ? `   ✗ OKÄNDA: ${okanda.join(', ')}` : ''}`)
    // ⚠️ Skärmbytet är INTE klart när `nav.go` returnerar (övergången tar ~0,4 s). Med
    // 250 ms här hann nästa `nav.go('game')` fram FÖRE bibliotekets rivning, som sedan
    // rev den nymonterade omgången — mätningen efter svepet såg ett spel med
    // `_magnet.destroyed === true` och noll saker. Vänta ut övergången.
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(700)
  }
  console.log(`  ${sortFel === 0 ? '✓' : '✗'} alla sorter är ritbara${sortFel ? ` — ${sortFel} nivå(er) med okända id` : ''}`)
  console.log(`  ${sedda.has('anka') ? '✓' : '✗'} ankan finns i dammen (spelets pedagogiska ankare)\n`)

  // --- D) POLERNA (nivå ≥ 2) ---------------------------------------------------
  // Tre frågor, i den ordning de kan förstöra leken:
  //   1. Är nivå 0–1 orörd? Polerna lägger ett VILLKOR i kärnloopen och spelet är
  //      appens yngsta (2–4 år) — den yngsta dammen ska inte ha märkt något.
  //   2. Kan en bortstött stavmagnet fastna ändå? Den pressas mot pondväggen medan
  //      magneten fortsätter fram, så avståndet ensamt räcker inte som spärr.
  //   3. Löser EN knapptryckning den? Det är hela no-fail-garantin: går den inte att
  //      vända hem står barnet med en damm som aldrig blir klar.
  // LADDA OM SIDAN per nivå. Att bara `nav.go('library')` → `nav.go('game')` räcker inte,
  // och det är mätt: en `nav.go` som kommer medan routern är `_busy` KASTAS TYST (Nav.js
  // rad 32), och efter avsnitt C fastnade `_busy` i true. Loggade anrop:
  //   game(busy false) · library(busy TRUE) · game(busy TRUE) · library(busy TRUE) …
  // Alltså mätte sonden hela tiden på det FÖRSTA spelet — nivå 0 med tre saker, medan
  // den trodde sig titta på nivå 2 — och när den första övergången till sist städade
  // revs modulen (den är en singleton: den gamla skärmens destroy river den nya
  // monteringens tillstånd). Noll konsolfel hela vägen. En omladdning ger en ren router.
  const montera = async (lvl) => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate(
      ({ gid, l }) => {
        const s = window.__barnspel.save
        s.update((d) => {
          const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
          if (!p) return
          p.games = p.games || {}
          p.games[gid] = { ...(p.games[gid] || { unlocked: true, stars: 0, custom: {} }), highestLevel: l }
        })
        s.flush()
      },
      { gid: ID, l: lvl },
    )
    // Vänta tills routern är ledig — annars kastas anropet.
    await page.waitForFunction(() => !window.__barnspel.nav._busy, null, { timeout: 10000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction(
      async (gid) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        return !!(g?._items?.length && g._magnet && !g._magnet.destroyed)
      },
      ID,
      { timeout: 8000 },
    )
    // Lev-koll: står omgången kvar 1,5 s senare är den vår, annars kom en rivning.
    await page.waitForTimeout(1500)
    return snap(page)
  }
  const FLIP = { x: 1148, y: 262 } // FLIP_BTN i spelet
  const STICK_R = 46

  console.log('  D) POLER')
  let polFel = 0
  const kolla = (namn, villkor, detalj = '') => {
    console.log(`     ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
    if (!villkor) polFel++
  }

  // 1) Nivå 0–1 orörd.
  for (const lvl of [0, 1]) {
    const q = await montera(lvl)
    if (!q) {
      console.log('     NAVLOGG: ' + JSON.stringify(await page.evaluate(() => window.__navlogg), null, 1))
      throw new Error(`nivå ${lvl} gick inte att montera`)
    }
    const stav = q.items.filter((i) => i.pol !== 0)
    kolla(
      `nivå ${lvl}: inga poler alls`,
      !q.poles && stav.length === 0 && !q.flipSyns && !q.flipTryckbar && q.polaritet === 1,
      `poles=${q.poles} stavar=${stav.length} knapp syns=${q.flipSyns}/tryckbar=${q.flipTryckbar} polaritet=${q.polaritet}`,
    )
  }

  // 2+3) Nivå 2: bygg upp läget, håll magneten på den bortstötta, vänd, mät.
  {
    let q = await montera(2)
    const rod = q.items.filter((i) => i.kind === 'stavrod').length
    const bla = q.items.filter((i) => i.kind === 'stavbla').length
    kolla('nivå 2: en röd OCH en blå stavmagnet', q.poles && rod === 1 && bla === 1 && q.flipSyns && q.flipTryckbar, `spelets nivå=${q.niva} röd=${rod} blå=${bla} polaritet=${q.polaritet} innehåll: ${q.items.map((i) => i.kind).join(', ')}`)

    // Följ saken på SORT, inte index: fylls hinken byggs dammen om och indexen betyder
    // något helt annat (den fällan gav "spelet försvann" en gång redan).
    const bortSort = q.items.find((i) => i.pol === q.polaritet)?.kind
    const draSort = q.items.find((i) => i.pol === -q.polaritet)?.kind
    const hitta = (s, sort = bortSort) => s?.items?.find((i) => i.kind === sort)
    kolla('en stavmagnet stöts bort och en dras in samtidigt', !!bortSort && !!draSort, `bortstött=${bortSort} dragen=${draSort}`)

    // Bilden av pol-dammen — titta på den, ett grönt mått ser inte att två färger krockar.
    await page.screenshot({ path: '.test-shots/_magnet-poler.png' })

    // Jaga den bortstötta i 5 s med magneten: barnet håller fingret på saken.
    await page.mouse.move(q.mx, q.my)
    await page.mouse.down()
    let minD = Infinity
    let maxFart = 0
    let tunnlade = 0
    let fastnade = false
    for (let k = 0; k < 50; k++) {
      const cur = await snap(page)
      const it = hitta(cur)
      if (!it) break
      await page.mouse.move(it.bx, it.by)
      await page.waitForTimeout(100)
      const after = await snap(page)
      const a = hitta(after)
      if (!a) break
      minD = Math.min(minD, Math.hypot(after.mx - a.bx, after.my - a.by))
      maxFart = Math.max(maxFart, a.spd)
      if (a.by < WALL_TOP) tunnlade++
      if (a.stuck || a.delivered) fastnade = true
    }
    q = await snap(page)
    if (!q) {
      console.log(
        '     DIAG: ' +
          JSON.stringify(
            await page.evaluate(async (gid) => {
              const g = (await import('/src/games/registry.js')).getGame(gid)
              return { har: !!g, items: g?._items?.length ?? null, magnet: !!g?._magnet, riven: g?._magnet?.destroyed ?? null, resolving: !!g?._resolving, skarm: window.__barnspel?.nav?.current?.name ?? null, aktivt: !!window.__barnspel?.game, alive: g?._alive ?? null }
            }, ID),
          ),
      )
      console.log('     KONSOL: ' + (errors.length ? errors.slice(-4).join(' | ') : '(0 fel)'))
      throw new Error('spelet försvann mitt i pol-jakten')
    }
    const jagad = hitta(q)
    kolla('den bortstötta fastnar ALDRIG (5 s jakt)', !fastnade && jagad && !jagad.stuck && !jagad.delivered, `närmast ${r1(minD)} px (fastna-radie ${STICK_R}), toppfart ${r1(maxFart)} px/steg`)
    kolla('knuffen tunnlar aldrig genom pondväggen', tunnlade === 0, `${tunnlade} prov ovanför toppväggen`)
    // ⚠️ FLYTTA UNDAN MAGNETEN FÖRE VÄNDNINGEN. Jakten slutar med magneten PÅ saken
    // (uppmätt närmast 0 px — spärren, inte avståndet, är det som hindrar fastnandet),
    // och vänder man då fastnar den inom en bildruta. "0,0 s" mätte alltså bara att
    // spärren släpper, inte att fältet drar hem den. Ställ magneten på ett riktigt
    // avstånd först, så mäter tiden det barnet faktiskt väntar.
    const q1 = await snap(page)
    const sak1 = hitta(q1)
    // 200 px rakt in mot dammens mitt — ett avstånd ett barn faktiskt lämnar magneten på,
    // och långt innanför dragets radie (300). En fast punkt duger inte: den bortstötta
    // saken hamnar var som helst, och första försöket mätte 368 px, alltså utanför fältet.
    const mot = Math.atan2(405 - sak1.by, 540 - sak1.bx)
    const bort = {
      x: clamp(sak1.bx + Math.cos(mot) * 200, 150, 930),
      y: clamp(sak1.by + Math.sin(mot) * 200, 230, 580),
    }
    await page.mouse.move(bort.x, bort.y)
    await page.waitForTimeout(400)
    await page.mouse.up()
    await page.waitForTimeout(300)

    // Vänd polen med knappen och håll magneten stilla — hur snabbt blir den fångbar?
    const fore = await snap(page)
    const d0 = Math.hypot(fore.mx - hitta(fore).bx, fore.my - hitta(fore).by)
    await page.mouse.click(FLIP.x, FLIP.y)
    await page.waitForTimeout(120)
    const efter = await snap(page)
    kolla('knappen vänder polen', efter.polaritet === -fore.polaritet, `${fore.polaritet} → ${efter.polaritet}`)

    // Magneten står kvar där den var: nu ska saken komma HEM av sig själv.
    let ms = null
    const t1 = Date.now()
    while (Date.now() - t1 < 6000) {
      const cur = await snap(page)
      if (!cur) break
      const a = hitta(cur)
      if (a?.stuck || a?.delivered) {
        ms = Date.now() - t1
        break
      }
      await page.waitForTimeout(80)
    }
    kolla(
      'EN vändning gör den fångbar (magneten står stilla)',
      ms != null && d0 > 120,
      ms == null ? `fastnade aldrig på 6 s (avstånd ${r1(d0)} px)` : `från ${r1(d0)} px: fastnade efter ${(ms / 1000).toFixed(1)} s`,
    )

    // Exit mitt i en vändning: rotationstweenen och ljudet ska inte överleva rivningen.
    await page.mouse.click(FLIP.x, FLIP.y)
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(900)
  }
  console.log(`  ${polFel === 0 ? '✓ polerna håller' : `✗ ${polFel} pol-mått rött`}\n`)

  console.log(`\n  ${errors.length ? '✗ ' + errors.join(' | ') : '✓ 0 konsolfel'}\n`)
} finally {
  await browser.close()
}
