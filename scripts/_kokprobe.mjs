// Trycker på KÖKETS luckor i `mata-munnen` och mäter vad som faktiskt händer.
//
// Testharnessen rör dem inte: den drar mellan generiska punkter och trycker aldrig på en
// station, så hela köksinteraktionen vore grön och omätt (samma fälla som gjorde att
// kärnloopen aldrig testades — se docs/games/mata-munnen.md §3).
//
// Mäter:
//   katalogen    ritar VARJE nyckel i skafferiet något? (en felstavad nyckel ger en grå
//                cirkel utan att något felar — den enda kontrollen som fångar det)
//   traffytor    ≥96 px och ≥24 px mellan varje par (P0) — räknat, inte antaget
//   oppning      öppnas luckan, kommer det saker, går de att dra?
//   taket        stängs den äldsta när OPPNA_MAX överskrids?
//   oatligt      spottas en gaffel ut UTAN att mätaren rör sig?
//   knapparna    vatten · spis · fläkt · fönster — växlar de, och tickar de vidare?
//   fysiken      vilar de lösa sakerna på bänken, krockar de, håller taket?
//   vatskan      spills en pöl, rinner den ut, torkar den upp och rivs världen?
//   mjuka        vobblar geggan vid nedslaget (mot en OKNUFFAD kontrollarm) och fryser den?
//   exit         0 konsolfel när spelet lämnas med luckor öppna och en hög på bänken
import { chromium } from 'playwright'

const url = process.env.BARNSPEL_URL || 'http://localhost:5173'
const shot = '.test-shots/_kokprobe.png'
const errors = []
let brister = 0
const krav = (ok, text) => { if (!ok) brister++; return ok ? '✓' : '✗' }

const las = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    return {
      fyll: Math.round((g._fyllNiva ?? 0) * 1000) / 1000,
      atna: g._atna,
      oppna: (g._oppnaSt || []).map((s) => s.id),
      stationer: (g._stationer || []).map((s) => ({
        id: s.id, typ: s.typ, oppen: !!s.oppen, yta: s.yta,
        saker: (s._saker || []).filter((r) => !r._uppaten).map((r) => r.data.key),
        dorrX: Math.round((s.dorr?.scale.x ?? 1) * 100) / 100,
        dorrY: Math.round((s.dorr?.scale.y ?? 1) * 100) / 100,
        inre: !!s.inre?.visible,
      })),
      knappar: { vatten: !!g._vatten, spis: !!g._spisPa, flakt: !!g._flaktPa },
      busy: !!g._busy,
      alive: !!g._alive,
      hitar: (g._klickL?.children || []).length,
      strale: !!g._noder?.strale?.visible,
      hjul: Math.round((g._noder?.flakthjul?.rotation ?? 0) * 1000) / 1000,
      dragbara: (g._mat || []).filter((r) => !r._uppaten && !r.view.destroyed)
        .map((r) => ({ key: r.data.key, atbar: r.data.atbar !== false, los: !!r._kropp, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
      mun: { x: Math.round(g._mun?.x ?? 0), y: Math.round(g._mun?.y ?? 0) },
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
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'mata-munnen' }))
  await page.waitForTimeout(1600)

  // ---- 0. KATALOGEN --------------------------------------------------------
  // En felstavad nyckel i `SAKER` ger en grå cirkel med radie 26 och INGET fel. Här
  // ritas varje nyckel och måttet läses — reservcirkeln har en känd, unik storlek.
  const kat = await page.evaluate(async () => {
    const m = await import('/src/games/mata-munnen/skafferi.js')
    const ut = []
    for (const key of Object.keys(m.SAKER)) {
      let b = null
      try {
        const v = m.makeSak(key)
        const r = v.getLocalBounds()
        b = { w: Math.round(r.width), h: Math.round(r.height) }
        v.destroy({ children: true })
      } catch (e) { b = { fel: String(e.message || e).slice(0, 80) } }
      ut.push({ key, ...b })
    }
    return ut
  })
  const trasiga = kat.filter((k) => k.fel || !k.w || (k.w === 52 && k.h === 52))
  console.log(`\n  KATALOG  ${kat.length} nycklar ritade · minsta ${Math.min(...kat.filter((k) => k.w).map((k) => k.w))} px · största ${Math.max(...kat.filter((k) => k.w).map((k) => k.w))} px`)
  console.log(`           trasiga/reservcirklar: ${trasiga.length ? trasiga.map((t) => t.key + (t.fel ? ' ' + t.fel : '')).join(', ') : 'inga'}   ${krav(!trasiga.length, '')}`)

  let s = await las(page)
  const tomtVidStart = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    return (g._losa || []).length
  })

  // ---- 1. TRÄFFYTOR (P0) ---------------------------------------------------
  const y = s.stationer.map((st) => ({ id: st.id, ...st.yta }))
  const forSma = y.filter((a) => a.w < 96 || a.h < 96)
  const nara = []
  for (let i = 0; i < y.length; i++) {
    for (let j = i + 1; j < y.length; j++) {
      const a = y[i]; const b = y[j]
      const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)))
      const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)))
      // Överlapp i BÅDA led = ytorna ligger på varandra. Annars räknas det minsta
      // avståndet i det led där de faktiskt är åtskilda.
      const d = dx === 0 && dy === 0 ? 0 : Math.max(dx, dy)
      if (d < 24) nara.push(`${a.id}↔${b.id} ${d}px`)
    }
  }
  console.log(`\n  P0 YTOR  ${y.length} stationer · minsta ${Math.min(...y.map((a) => Math.min(a.w, a.h)))} px (kräver ≥96)   ${krav(!forSma.length, '')}`)
  console.log(`           för nära varandra (<24 px): ${nara.length ? nara.join(' · ') : 'inga'}   ${krav(!nara.length, '')}`)

  const mitt = (st) => ({ x: st.yta.x + st.yta.w / 2, y: st.yta.y + st.yta.h / 2 })
  const hitta = (id) => s.stationer.find((st) => st.id === id)

  // ---- 2. ÖPPNING ----------------------------------------------------------
  const kyl = hitta('kyl')
  await page.mouse.click(mitt(kyl).x, mitt(kyl).y)
  await page.waitForTimeout(700)
  s = await las(page)
  const k2 = hitta('kyl')
  console.log(`\n  ÖPPNA    kylen: öppen ${k2.oppen} · dörrskala x ${k2.dorrX} (vila 1) · insidan synlig ${k2.inre} · saker ${k2.saker.join(', ') || '(inga)'}   ${krav(k2.oppen && k2.dorrX < 0.4 && k2.inre && k2.saker.length === 3, '')}`)
  await page.screenshot({ path: shot.replace(/\.png$/, '-oppen.png') })

  // ---- 3. TAKET ------------------------------------------------------------
  for (const id of ['skafferi', 'lador']) {
    const st = hitta(id)
    await page.mouse.click(mitt(st).x, mitt(st).y)
    await page.waitForTimeout(600)
    s = await las(page)
  }
  console.log(`\n  TAK      öppna nu: ${s.oppna.join(', ')} (max 2)   ${krav(s.oppna.length <= 2 && !s.oppna.includes('kyl'), '')}`)
  console.log(`           kylens saker städade: ${hitta('kyl').saker.length === 0 ? 'ja' : 'nej — ' + hitta('kyl').saker.join(',')}   ${krav(hitta('kyl').saker.length === 0, '')}`)

  // ---- 4. OÄTLIGT ----------------------------------------------------------
  // Dra en pryl ur lådorna till munnen. Mätaren får INTE röra sig.
  s = await las(page)
  const pryl = s.dragbara.find((d) => !d.atbar)
  if (!pryl) {
    console.log('\n  OÄTLIGT  ✗ hittade ingen oätlig sak framme att dra')
    brister++
  } else {
    const fore = s.fyll
    await page.mouse.move(pryl.x, pryl.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(pryl.x + (s.mun.x - pryl.x) * (i / 10), pryl.y + (s.mun.y - pryl.y) * (i / 10))
      await page.waitForTimeout(45)
    }
    await page.mouse.up()
    await page.waitForTimeout(1500)
    const e = await las(page)
    console.log(`\n  OÄTLIGT  ${pryl.key} i munnen: mätare ${fore} → ${e.fyll} · ätna ${s.atna} → ${e.atna}   ${krav(Math.abs(e.fyll - fore) < 0.001 && e.atna === s.atna, '')}`)
    await page.screenshot({ path: shot.replace(/\.png$/, '-spott.png') })
  }

  // ---- 4b. ÖNS EGNA LUCKOR -------------------------------------------------
  // De sitter i FRAMGRUNDEN, framför pappa, och är de enda vars ritordning kan hamna
  // bakom sin egen möbel. Bilden är enda sättet att se det.
  for (const id of ['oskap_v', 'oskap_h']) {
    const st = hitta(id)
    await page.mouse.click(mitt(st).x, mitt(st).y)
    await page.waitForTimeout(600)
  }
  s = await las(page)
  const ov = hitta('oskap_v'); const oh = hitta('oskap_h')
  console.log(`\n  ÖN       ${ov.id} öppen ${ov.oppen} saker ${ov.saker.join(',')} · ${oh.id} öppen ${oh.oppen} saker ${oh.saker.join(',')}   ${krav(ov.oppen && oh.oppen && ov.saker.length === 2 && oh.saker.length === 2, '')}`)
  await page.screenshot({ path: shot.replace(/\.png$/, '-on.png') })

  // ---- 5. KNAPPARNA --------------------------------------------------------
  const rader = []
  for (const id of ['diskho', 'spis', 'flakt', 'fonster']) {
    const st = hitta(id)
    const f = await las(page)
    await page.mouse.click(mitt(st).x, mitt(st).y)
    await page.waitForTimeout(500)
    const e = await las(page)
    const nyckel = { diskho: 'vatten', spis: 'spis', flakt: 'flakt' }[id]
    const bytt = nyckel ? f.knappar[nyckel] !== e.knappar[nyckel] : true
    rader.push(`${id} ${nyckel ? `${f.knappar[nyckel]}→${e.knappar[nyckel]}` : 'fågel'} ${krav(bytt, '')}`)
  }
  console.log(`\n  KNAPPAR  ${rader.join(' · ')}`)
  s = await las(page)
  const hjul0 = s.hjul
  await page.waitForTimeout(700)
  s = await las(page)
  console.log(`           strålen synlig ${s.strale} · fläkthjulet snurrar ${hjul0} → ${s.hjul}   ${krav(s.strale && s.hjul !== hjul0, '')}`)
  await page.screenshot({ path: shot })

  // ---- 6. FYSIKEN ----------------------------------------------------------
  // Kontrollarmen läses vid START (rad 86), innan något spottats ut. Den stod först här
  // nere och rapporterade 1 kropp — för avsnitt 4 hade redan matat pappa en strumpa. En
  // kontrollarm som läses EFTER mätarmen mäter mätarmen, inte utgångsläget.
  console.log(`\n  FYSIK    kontrollarm — orörd bänk vid start: ${tomtVidStart} lösa kroppar   ${krav(tomtVidStart === 0, '')}`)

  // Högen byggs genom att SPELA, inte genom att sätta interna fält utifrån: öppna
  // skräplådan, mata munnen med det som ligger där, upprepa. Det är samma väg ett barn
  // tar, och därför den enda som mäter det som faktiskt händer.
  for (let varv = 0; varv < 6; varv++) {
    const st = hitta('lador')
    await page.mouse.click(mitt(st).x, mitt(st).y)
    await page.waitForTimeout(450)
    let d = await las(page)
    const p = d.dragbara.find((x) => !x.atbar && !x.los) // en redan liggande sak bygger ingen hög
    if (!p) { await page.mouse.click(mitt(st).x, mitt(st).y); await page.waitForTimeout(300); continue }
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(p.x + (d.mun.x - p.x) * (i / 8), p.y + (d.mun.y - p.y) * (i / 8))
      await page.waitForTimeout(40)
    }
    await page.mouse.up()
    await page.waitForTimeout(1200)
    s = await las(page)
    if (s.oppna.includes('lador')) { await page.mouse.click(mitt(st).x, mitt(st).y); await page.waitForTimeout(300) }
  }
  await page.waitForTimeout(2200) // låt högen få lugna sig innan stillheten mäts

  const h1 = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    return (g._losa || []).filter((r) => r.view && !r.view.destroyed)
      .map((r) => ({ x: Math.round(r.view.x), y: Math.round(r.view.y) }))
  })
  await page.waitForTimeout(700)
  const h2 = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const m = await import('/src/games/mata-munnen/kok.js')
    return {
      losa: (g._losa || []).filter((r) => r.view && !r.view.destroyed)
        .map((r) => ({ x: Math.round(r.view.x), y: Math.round(r.view.y) })),
      dodaVyer: (g._losa || []).filter((r) => !r.view || r.view.destroyed).length,
      golv: m.FYSIK.golv, v: m.FYSIK.v, h: m.FYSIK.h, kant: m.KANT_Y,
    }
  })
  const L = h2.losa
  const rorelse = L.length && h1.length === L.length
    ? Math.max(...L.map((p, i) => Math.hypot(p.x - h1[i].x, p.y - h1[i].y)))
    : -1
  // "Vilar på bänken" får INTE betyda "i ett enda lager": en hög som staplar sig är precis
  // vad kollisioner ska ge. Fönstret sträcker sig därför upp till köksöns bakkant — allt
  // ovanför den svävar, allt under golvet har läckt igenom.
  const pahyllan = L.filter((p) => p.y > h2.kant - 40 && p.y <= h2.golv + 4).length
  const utanfor = L.filter((p) => p.x < h2.v - 10 || p.x > h2.h + 10 || p.y > h2.golv + 10)
  let minAvst = Infinity
  for (let i = 0; i < L.length; i++) {
    for (let j = i + 1; j < L.length; j++) minAvst = Math.min(minAvst, Math.hypot(L[i].x - L[j].x, L[i].y - L[j].y))
  }
  console.log(`           ${L.length} lösa kroppar (tak 8) · kroppar med förstörd vy ${h2.dodaVyer}   ${krav(L.length > 1 && L.length <= 8 && h2.dodaVyer === 0, '')}`)
  console.log(`           vilar på bänken: ${pahyllan}/${L.length} (golv y=${h2.golv})   ${krav(L.length > 0 && pahyllan === L.length, '')}`)
  console.log(`           rörelse på 700 ms: ${rorelse.toFixed(1)} px (ska ha lugnat sig)   ${krav(rorelse >= 0 && rorelse < 6, '')}`)
  console.log(`           minsta avstånd mellan två: ${minAvst === Infinity ? '(bara en)' : minAvst.toFixed(0) + ' px'} — sjuhörningar r=34 får inte ligga i varandra   ${krav(minAvst === Infinity || minAvst > 40, '')}`)
  console.log(`           utanför bordet: ${utanfor.length}   ${krav(!utanfor.length, '')}`)
  await page.screenshot({ path: shot.replace(/\.png$/, '-hog.png') })

  // ---- 7. VÄTSKAN ----------------------------------------------------------
  // Kontrollarm: vätskevärlden ska INTE finnas förrän något faktiskt spillts. Skapas den
  // vid uppstart betalar varje kök för en pöl det aldrig får.
  const foreSpill = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    return { finns: !!g._vatskaV, n: g._vatskaV?.count ?? 0 }
  })
  console.log(`\n  VÄTSKA   kontrollarm — före spill: värld ${foreSpill.finns ? 'finns' : 'saknas'} · ${foreSpill.n} partiklar   ${krav(!foreSpill.finns, '')}`)

  // Leta fram ett glas saft ur besticklådan och mata pappa det.
  //
  // ⚠️ Loopen drivs på stationens EGNA `oppen`-flagga, inte på antaganden om vad ett klick
  //    gör. Första versionen klickade en gång för att öppna och en gång för att stänga i
  //    varje varv — och hamnade ur fas mot en lucka som redan stod öppen sedan avsnitt 4b.
  //    Den öppnade alltså aldrig lådan, tio varv i rad, medan `pointertap` bevisligen kom
  //    fram (down=1 up=1 tap=1). "Klicket når inte fram" och "klicket gör tvärtom" ser
  //    likadana ut utifrån.
  let spillt = false
  for (let varv = 0; varv < 12 && !spillt; varv++) {
    let d = await las(page)
    const st0 = d.stationer.find((x) => x.id === 'oskap_h')
    const st = hitta('oskap_h')
    if (!st0.oppen) {
      await page.mouse.click(mitt(st).x, mitt(st).y)
      await page.waitForTimeout(420)
      d = await las(page)
    }
    const glas = d.dragbara.find((x) => x.key === 'glas_saft' && !x.los)
    if (!glas) {
      await page.mouse.click(mitt(st).x, mitt(st).y) // stäng och lotta om
      await page.waitForTimeout(320)
      continue
    }
    await page.mouse.move(glas.x, glas.y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(glas.x + (d.mun.x - glas.x) * (i / 8), glas.y + (d.mun.y - glas.y) * (i / 8))
      await page.waitForTimeout(40)
    }
    await page.mouse.up()
    await page.waitForTimeout(1600)
    spillt = true
  }
  if (!spillt) { console.log('           ✗ hittade aldrig ett glas saft att spilla'); brister++ }

  const las1 = async () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const w = g._vatskaV
    if (!w) return { finns: false, n: 0 }
    let minY = 1e9; let maxY = -1e9; let minX = 1e9; let maxX = -1e9
    w.forEach((x, yy) => { if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; if (x < minX) minX = x; if (x > maxX) maxX = x })
    // BULKENS bredd, inte ytterlägena: två stänk som flyger åt var sitt håll gör
    // spannet lika brett som bänken oavsett hur samlad pölen är. Halva partiklarna
    // närmast medianen är det som faktiskt läser som en pöl.
    const xs = []
    w.forEach((x) => xs.push(x))
    xs.sort((a, b) => a - b)
    const q = Math.floor(xs.length / 4)
    const bulk = xs.length > 3 ? Math.round(xs[xs.length - 1 - q] - xs[q]) : 0
    return { finns: true, n: w.count, minY: Math.round(minY), maxY: Math.round(maxY), bredd: Math.round(maxX - minX), bulk }
  })
  const v1 = await las1()
  await page.waitForTimeout(1500)
  const v2 = await las1()
  console.log(`           efter spill: ${v1.n} partiklar · botten y ${v1.maxY} → ${v2.maxY} (golv ${h2.golv})   ${krav(v1.n > 20 && v2.maxY <= h2.golv + 14, '')}`)
  console.log(`           pölens bulk: ${v1.bulk} → ${v2.bulk} px (hela spannet ${v2.bredd}) — en pöl, inte en hinna   ${krav(v2.bulk > 0 && v2.bulk < 340, '')}`)
  await page.screenshot({ path: shot.replace(/\.png$/, '-spill.png') })

  // Torkar den upp? Utan det ligger en vätskevärld och kostar för alltid.
  await page.waitForTimeout(11000)
  const v3 = await las1()
  console.log(`           torkar upp av sig själv: ${v1.n} → ${v3.n} partiklar · värld ${v3.finns ? 'kvar' : 'riven'}   ${krav(!v3.finns, '')}`)

  // ---- 8. MJUKA KROPPEN ----------------------------------------------------
  // Två armar på SAMMA kropp: en som får nedslagets knuff och en som inte får den. Utan
  // kontrollarmen är ett breddtal bara ett tal — en verlet-ring har en bredd även när
  // ingenting hänt med den.
  const mjuk = await page.evaluate(async () => {
    const { makeMjukkropp } = await import('/src/lib/mjukkropp.js')
    const matt = (k) => {
      let x0 = 1e9; let x1 = -1e9; let y0 = 1e9; let y1 = -1e9
      for (let i = 0; i < k.n; i++) {
        const p = k.pts[i]
        if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x
        if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y
      }
      return { b: x1 - x0, h: y1 - y0 }
    }
    // SVÄNGNINGEN, inte nivån: en vobbel som hunnit tillbaka mellan två stickprov ser
    // ut som ingen rörelse alls. Höjden samplas varje steg och max−min är svaret.
    const kor = (knuffa) => {
      const k = makeMjukkropp({ x: 400, y: 300, w: 84, h: 44, punkter: 12, grav: 0, damp: 0.93, iter: 4, tryck: 1.04, styvhet: 0.16 })
      if (knuffa) k.knuff(400, 274, 14, 90)
      const hs = []
      for (let i = 0; i < 90; i++) { k.steg(1); hs.push(matt(k).h) }
      const tidig = hs.slice(0, 45)
      const sen = hs.slice(45)
      const sving = (a) => Math.max(...a) - Math.min(...a)
      const ut = { sving: sving(tidig), svingSent: sving(sen), slut: hs[hs.length - 1] }
      k.destroy()
      return ut
    }
    return { kontroll: kor(false), knuff: kor(true) }
  })
  const K = mjuk.kontroll
  const M = mjuk.knuff
  console.log(`
  MJUK     kontrollarm (ingen knuff): svängning ${K.sving.toFixed(1)} px första 45 stegen · ${K.svingSent.toFixed(1)} px sista 45`)
  console.log(`           med nedslaget:              svängning ${M.sving.toFixed(1)} px första 45 stegen · ${M.svingSent.toFixed(1)} px sista 45`)
  console.log(`           vobbeln är nedslagets: ${M.sving.toFixed(1)} px mot kontrollens ${K.sving.toFixed(1)} px   ${krav(M.sving > K.sving + 8, '')}`)
  console.log(`           och den LÄGGER sig: ${M.svingSent.toFixed(1)} px kvar (mindre än en tredjedel)   ${krav(M.svingSent < M.sving / 3, '')}`)

  // I SPELET: en gegga i ansiktet ska ge exakt EN mjuk kropp, och den ska frysa.
  s = await las(page)
  const bit = s.dragbara.find((x) => x.atbar && !x.los)
  if (bit) {
    await page.mouse.move(bit.x, bit.y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) {
      // Pannan, inte munnen: släpp inom 130 px av munnen och biten blir UPPÄTEN, inte
      // gegga. Första versionen siktade på (620, 240) — 110 px från munnen — och mätte
      // därför noll geggor utan att något var fel på geggan.
      await page.mouse.move(bit.x + (s.mun.x - 130 - bit.x) * (i / 8), bit.y + (208 - bit.y) * (i / 8))
      await page.waitForTimeout(40)
    }
    await page.mouse.up()
    await page.waitForTimeout(400)
    const m1 = await page.evaluate(async () => {
      const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
      return { mjuk: !!g._mjuk, geggor: g._geggor.length }
    })
    await page.waitForTimeout(1800)
    const m2 = await page.evaluate(async () => {
      const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
      return { mjuk: !!g._mjuk, geggor: g._geggor.length }
    })
    console.log(`           i spelet: gegga ${m2.geggor} st · mjuk kropp levande ${m1.mjuk} → ${m2.mjuk} (ska frysa)   ${krav(m1.mjuk && !m2.mjuk, '')}`)
  } else {
    console.log('           ✗ hittade ingen matbit att busa med')
    brister++
  }

  // ---- 9. EXIT MED ALLT PÅ -------------------------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)

  console.log(`\n  ${errors.length ? '✗ ' + errors.length + ' konsolfel:\n   ' + errors.slice(0, 6).join('\n   ') : '✓ 0 konsolfel (inkl. exit med luckor öppna, kranen på och en hög på bänken)'}`)
  console.log(`  ${brister ? `✗ ${brister} brister` : '✓ alla mätningar gröna'}`)
  console.log(`  bilder: ${shot} (+ -oppen, -spott)\n`)
  process.exitCode = brister || errors.length ? 1 : 0
} finally {
  await browser.close()
}
