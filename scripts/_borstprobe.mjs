// SPELAR `borsta-tanderna` PÅ RIKTIGT — testharnessen gör det aldrig.
//
// `npm run test` drar mellan GENERISKA punkter och rörde inte borsten en enda gång:
// loggen visade `drag/foremal 1` och NOLL `drag/ratt`/`slapp`/`miss`. Hela kärnloopen var
// alltså grön och omätt, precis det `mata-munnen` betalade för (docs/games/mata-munnen.md §3).
//
// ⚠️ KONTROLLARMARNA KÖRS FÖRE MÄTARMARNA, alltid. Ett tal som inte kan skilja två KÄNDA
//    lägen åt säger ingenting om det okända, och den ordningen kostade ett halvt pass
//    senast den kastades om.
//      A. Vila              — gapet ska vara ~0 och ingen fläck rörd.
//      B. Borsten LÅNGT bort — hålls borsten vid väggen med SAMMA sveprörelse ska gapet
//                             fortfarande vara lågt och ingen fläck renare. Utan den mäter
//                             man bara att tiden går.
//    Först därefter mätarmen: samma borste, samma grepp, men huvudet på tandraden.
//
// ⚠️ KONTAKTPUNKTEN ÄR BORSTHUVUDET, inte fingret. Sonden siktar fingret på
//    `TANDRAD − huvud` och LÄSER sedan spelets egen `_kontakt()` för att se var huvudet
//    faktiskt hamnade — en hårdkodad offset här hade rapporterat samma tal även efter att
//    konsten flyttats (samma fälla som den hårdkodade vingspetsen i `bygg-en-kompis`).
//
//   node scripts/_borstprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')
const ID = 'borsta-tanderna'
mkdirSync('.test-shots', { recursive: true })

const errors = []
const stackar = new Map()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rad = []
// Varje arm bär sitt eget felantal: 172 konsolfel i en klumpsumma säger inte VILKEN
// arm som föder dem, och tre engångssonder gick åt att gissa fel skede.
const _push = rad.push.bind(rad)
rad.push = (r) => _push([r[0], `${r[1]} · fel ${errors.length}`, r[2]])
const ok = (b) => (b ? '✓' : '✗')

// Spöktweens: gsap-tweens vars MÅL redan är förstört. Stacken bakom ett null-fel säger
// bara att någon skriver `.y` på en riven nod — den här avläsningen namnger noden. Måste
// gå via spelets EGEN gsap-instans; en nyimporterad kopia har en egen global tidslinje
// och rapporterar 0 oavsett vad som pågår.
const spoken = (page) => page.evaluate(async () => {
  const u = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /gsap/.test(n))
  if (!u) return 'ingen gsap-resurs'
  const g = (await import(u)).gsap || (await import(u)).default
  const ut = []
  for (const tw of g.globalTimeline.getChildren(true, true, true)) {
    const mal = typeof tw.targets === 'function' ? tw.targets() : []
    for (const t of mal) {
      if (t && typeof t === 'object' && t.destroyed === true) {
        ut.push(`${t.constructor?.name || '?'}{${Object.keys(tw.vars || {}).filter((k) => !['ease', 'onUpdate', 'onComplete', 'onRepeat', 'repeat', 'yoyo', 'duration', 'delay'].includes(k)).join(',')}}${typeof tw.repeat === 'function' && tw.repeat() === -1 ? ' EVIG' : ''}`)
      }
    }
  }
  return ut.length ? ut.join(' · ') : 'inga'
})

const las = (page) => page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('borsta-tanderna')
  const a = g._ans
  let min = null
  if (a?._aktivMin) for (const [n, s] of Object.entries(a._miner)) if (s === a._aktivMin) min = n
  const k = g._kontakt?.()
  return {
    fas: g._fas,
    tub: g._tub?.key ?? null,
    gap: Math.round((a?._gap ?? 0) * 1000) / 1000,
    min,
    flackar: g._flackar?.length ?? 0,
    // Summan av `kvar` är måttet på hur smutsigt det är. Ett ANTAL rena fläckar hade
    // hoppat i steg och dolt att borstningen biter långsamt men säkert.
    smuts: Math.round((g._flackar || []).reduce((s, f) => s + f.kvar, 0) * 1000) / 1000,
    rena: (g._flackar || []).filter((f) => f.kvar <= 0).length,
    skum: g._skumKlickar?.length ?? 0,
    glasAktiv: !!g._glasAktiv,
    busy: !!g._busy,
    drar: !!g._drag?.active?.dragging,
    // Spelets EGEN kontaktpunkt, inte sondens gissning.
    kontakt: k ? { x: Math.round(k.x), y: Math.round(k.y), aktiv: !!k.aktiv } : null,
    borste: g._borste?.view && !g._borste.view.destroyed
      ? { x: Math.round(g._borste.view.x), y: Math.round(g._borste.view.y) } : null,
    huvud: g._huvud || null,
    // Diagnostik för gap-frågan: vem håller tillbaka gapet, och tror spelet ens att
    // borsten är på raden?
    minKvar: Math.max(0, Math.round((g._minTill || 0) - performance.now())),
    // Tungan: fas, om noden lever, och om bonusen bokförts den här omgången.
    tungFas: g._tungFas ?? null,
    tungaUte: !!(g._tunga && !g._tunga.destroyed),
    tungBonus: !!g._tungBonus,
    smutsiga: (g._flackar || []).filter((f) => f.kvar > 0).length,
    gapNu: Math.round((g._gapNu ?? 0) * 1000) / 1000,
    iRad: k ? !!g._iTandraden?.(k.x, k.y) : null,
  }
})

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)) })
  // Stacken sparas, inte bara meddelandet: ett felmeddelande utan stack är en gissning
  // som ser ut som ett fynd (det kostade tre engångssonder att lära sig).
  page.on('pageerror', (e) => {
    errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 180))
    const k = (e.stack || e.message || '').split('\n').slice(0, 5).join('\n')
    stackar.set(k, (stackar.get(k) || 0) + 1)
  })

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(1800)

  const L = await page.evaluate(async () => {
    const m = await import('/src/games/borsta-tanderna/layout.js')
    return { TANDRAD: m.TANDRAD, TUB: m.TUB_PLATS, GLAS: m.GLAS, HEM: m.BORSTE_HEM }
  })

  // ---------- KONTROLLARM A: vila ----------
  const vila = await las(page)
  rad.push(['A · KONTROLL vila', `gap ${vila.gap} · smuts ${vila.smuts}/${vila.flackar} · skum ${vila.skum} · fas ${vila.fas}`,
    vila.gap < 0.2 && vila.flackar > 0 && vila.skum === 0])

  // ---------- välj tandkräm ----------
  await page.mouse.click(L.TUB[0].x, L.TUB[0].y)
  await page.waitForTimeout(1500)
  const valt = await las(page)
  rad.push(['   tandkräm vald', `tub ${valt.tub} · fas ${valt.fas} · min ${valt.min}`,
    !!valt.tub && valt.fas === 'borsta'])

  const hv = valt.huvud || { x: 0, y: -68 }

  // ---------- KONTROLLARM B: borsten hålls LÅNGT från munnen ----------
  const hemB = valt.borste || L.HEM
  await page.mouse.move(hemB.x, hemB.y)
  await page.mouse.down()
  await page.mouse.move(1080, 280, { steps: 8 })
  for (let i = 0; i < 14; i++) { // samma sveprörelse, fast vid väggen
    await page.mouse.move(1080 + (i % 2 ? 60 : -60), 280, { steps: 2 })
    await page.waitForTimeout(45)
  }
  const bortB = await las(page)
  await page.mouse.up()
  await page.waitForTimeout(600)
  rad.push(['B · KONTROLL borste vid väggen', `gap ${bortB.gap} · smuts ${bortB.smuts} (var ${vila.smuts}) · drar ${bortB.drar}`,
    bortB.drar && bortB.gap < 0.35 && bortB.smuts >= vila.smuts - 0.02])

  // ---------- MÄTARM: samma borste, huvudet på tandraden ----------
  const fore = await las(page)
  const start = fore.borste || L.HEM
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  // Fingret siktas så att HUVUDET hamnar på raden.
  await page.mouse.move(L.TANDRAD.x - hv.x, L.TANDRAD.y - hv.y, { steps: 12 })
  await page.waitForTimeout(320)
  const vidMunnen = await las(page)
  rad.push(['C · gapar han vid borsten?', `gap ${vidMunnen.gap} · _gapNu ${vidMunnen.gapNu} · minKvar ${vidMunnen.minKvar}ms · iRad ${vidMunnen.iRad} · min ${vidMunnen.min} · kontakt ${JSON.stringify(vidMunnen.kontakt)}`,
    vidMunnen.gap > 0.7 && vidMunnen.gap > bortB.gap + 0.3])

  // Sveper fram och tillbaka längs raden.
  for (let i = 0; i < 30; i++) {
    const t = i % 2 ? L.TANDRAD.h - 20 : L.TANDRAD.v + 20
    await page.mouse.move(t - hv.x, L.TANDRAD.y - hv.y, { steps: 3 })
    await page.waitForTimeout(55)
  }
  const efter = await las(page)
  rad.push(['D · borstas smutsen bort?', `smuts ${fore.smuts} → ${efter.smuts} · rena ${efter.rena}/${efter.flackar}`,
    efter.smuts < fore.smuts - 0.3])
  rad.push(['E · växer skummet?', `skum ${fore.skum} → ${efter.skum} klickar`, efter.skum > fore.skum])

  await page.screenshot({ path: '.test-shots/_borstprobe-skum.png' })

  // Fortsätter tills allt är rent (eller ger upp — då är det ett fynd i sig).
  let varv = 0
  let slut = efter
  while (slut.rena < slut.flackar && varv < 26) {
    for (let i = 0; i < 12; i++) {
      const t = i % 2 ? L.TANDRAD.h - 20 : L.TANDRAD.v + 20
      await page.mouse.move(t - hv.x, L.TANDRAD.y - hv.y, { steps: 3 })
      await page.waitForTimeout(50)
    }
    slut = await las(page)
    varv++
  }
  await page.mouse.up()
  await page.waitForTimeout(1000)
  const rent = await las(page)
  rad.push(['F · går målet att nå?', `rena ${rent.rena}/${rent.flackar} · fas ${rent.fas} · glaset lyser ${rent.glasAktiv} · ${varv} extravarv`,
    rent.rena === rent.flackar && rent.fas === 'skolj' && rent.glasAktiv])

  // ---------- sköljningen ----------
  await page.mouse.click(L.GLAS.x, L.GLAS.y)
  await page.waitForTimeout(2600)
  const gurgel = await las(page)
  rad.push(['G · gurglar han?', `gap ${gurgel.gap} · busy ${gurgel.busy}`, gurgel.busy])
  await page.screenshot({ path: '.test-shots/_borstprobe-skolj.png' })

  // ---------- exit mitt i finalen ----------
  const foreExit = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1300)
  rad.push(['H · exit mitt i sköljningen', `${errors.length - foreExit} konsolfel`, errors.length === foreExit])

  // ---------- TUNGAN: motgången, bonusen, återvändsgränden ----------
  //
  // ⚠️ EGEN OMGÅNG PER ARM, aldrig mitt i den pågående. Första försöket sköt in armarna
  //    efter E — men då hade arm D redan borstat brädet rent och fasen stod på `skolj`,
  //    där tungan aldrig startar. Att skriva tillbaka smuts i det läget gav ett tillstånd
  //    spelet inte kan hamna i själv, 50 konsolfel som var SONDENS, och en trasig arm F.
  //    Varje tungarm monterar därför om spelet och börjar om.
  // ⚠️ HELT FÄRSK SIDA, inte bara en ny omgång. Appen bär en app-bred exit-läcka (spöktweens
  //    från `DragController._snapHome` och badrummets droppe skriver `.y` på rivna noder —
  //    uppmätt LIKA på HEAD, se docs/ATGARDER.md). Felen kastas inne i gsap-tickern och
  //    kortsluter bildrutan, så en tubtryckning efter dem kan tappas: utan omladdning
  //    rapporterade J/K/L "fas valj" och mätte ingenting. Omladdningen isolerar tungarmarna
  //    från en läcka som inte är deras.
  const nyOmgang = async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
    await page.waitForTimeout(1800)
    await page.mouse.click(L.TUB[1].x, L.TUB[1].y)
    await page.waitForTimeout(1500)
  }

  const stall = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('borsta-tanderna')
    g._flackar.forEach((f, i) => { f.kvar = i === g._flackar.length - 1 ? 1 : 0; g._ritaFlack(f) })
    g._tungaTill = 0
    g._minTill = 0
  })
  // Väntar tills tungan nått ett visst skede — eller ger upp. Att sova en fast tid hade
  // mätt fel skede så fort någon rör vid ett av talen (svep 0,62 · park 0,2 · vift 1,56).
  const vantaFas = async (fas, tak = 4000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < tak) {
      const s = await page.evaluate(async () => (await import('/src/games/registry.js')).getGame('borsta-tanderna')._tungFas ?? null)
      if (s === fas) return true
      await page.waitForTimeout(60)
    }
    return false
  }
  const tungLage = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('borsta-tanderna')
    const t = g._tunga
    if (!t || t.destroyed) return null
    const d = g._franRuta(t.x, t.y)
    return d ? { x: Math.round(d.x), y: Math.round(d.y) } : null
  })

  // I · KONTROLLARM: tungan går sin väg medan borsten hålls VID VÄGGEN. Utan den här armen
  //     säger ett bonustal ingenting — då kan bonusen ha fyrat av sig själv.
  await page.mouse.up().catch(() => {})
  await nyOmgang()
  await stall()
  await page.mouse.move((await las(page)).borste?.x ?? L.HEM.x, (await las(page)).borste?.y ?? L.HEM.y)
  await page.mouse.down()
  await page.mouse.move(1080, 280, { steps: 6 })
  const komI = await vantaFas('vift')
  const foreI = await las(page)
  for (let i = 0; i < 10; i++) { // samma sveprörelse, fast vid väggen
    await page.mouse.move(1080 + (i % 2 ? 60 : -60), 280, { steps: 2 })
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(1400)
  const missI = await las(page)
  rad.push(['I · KONTROLL tungan missas', `nådde vift ${komI} · bonus ${missI.tungBonus} · smutsiga ${foreI.smutsiga} → ${missI.smutsiga} · min ${missI.min}`,
    komI && missI.tungBonus === false && missI.smutsiga > foreI.smutsiga && !missI.tungaUte])

  // J · MÄTARM: samma tunga, men borsten förs DIT. Siktet läggs med flit snett — 46 px i x
  //     och 40 px i y från mitten — så armen mäter både att bonusen går att träffa OCH att
  //     träffytan når P0:s 96 px tvärs över (±48). Fyrar den inte där prövas mitten, så ett
  //     ✗ går att skilja från en trasig mekanism.
  await page.mouse.up()
  await nyOmgang()
  await stall()
  const startJ = (await las(page)).borste || L.HEM
  await page.mouse.move(startJ.x, startJ.y)
  await page.mouse.down()
  const komJ = await vantaFas('vift')
  const tl = await tungLage()
  let traffJ = null
  let vid = 'ingen tunga'
  if (tl) {
    await page.mouse.move(tl.x + 46 - hv.x, tl.y + 40 - hv.y, { steps: 6 })
    await page.waitForTimeout(260)
    traffJ = await las(page)
    vid = 'P0-hörnet (+46,+40)'
    if (!traffJ.tungBonus && traffJ.tungaUte) {
      await page.mouse.move(tl.x - hv.x, tl.y - hv.y, { steps: 4 })
      await page.waitForTimeout(260)
      traffJ = await las(page)
      vid = 'mitten (P0-hörnet bommade)'
    }
  }
  await page.mouse.up()
  await page.waitForTimeout(700)
  const efterJ = traffJ ? await las(page) : null
  console.log(`  [spöken efter J] ${await spoken(page)}`)
  rad.push(['J · går bonusen att träffa?', `nådde vift ${komJ} · tunga ${JSON.stringify(tl)} · träff vid ${vid} · bonus ${traffJ?.tungBonus} · smutsiga ${efterJ?.smutsiga}`,
    !!(komJ && tl && traffJ?.tungBonus && vid.startsWith('P0') && efterJ && !efterJ.tungaUte)])

  // ---------- K + L: återvändsgränden och exit MITT I viftfönstret ----------
  //
  // Det längre fönstret (~2,4 s mot 0,62 s) gör den gamla återvändsgränden fyra gånger
  // troligare: blir sista fläcken ren medan tungan är ute står fasen på `skolj`, och en
  // återställd fläck går då aldrig att borsta bort igen (uppmätt: rena 3/4, 26 extravarv).
  await nyOmgang()
  console.log(`  [spöken efter omladdning inför K] ${await spoken(page)}`)
  await stall()
  const komK = await vantaFas('vift')
  // Fläcken som fortfarande är smutsig — den ska bli ren MEDAN tungan viftar.
  const kvarLage = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('borsta-tanderna')
    const f = (g._flackar || []).find((x) => x.kvar > 0)
    if (!f) return null
    f.kvar = 0.12 // nästan ren, så några svep räcker inom fönstret
    g._ritaFlack(f)
    const d = g._franRuta(f.rx, f.ry)
    return d ? { x: Math.round(d.x), y: Math.round(d.y) } : null
  })
  if (kvarLage) {
    const st = await las(page)
    await page.mouse.move((st.borste || L.HEM).x, (st.borste || L.HEM).y)
    await page.mouse.down()
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(kvarLage.x + (i % 2 ? 14 : -14) - hv.x, kvarLage.y - hv.y, { steps: 3 })
      await page.waitForTimeout(55)
    }
    await page.mouse.up()
  }
  await page.waitForTimeout(1800)
  const slutK = await las(page)
  rad.push(['K · återvändsgränd i viftfönstret', `nådde vift ${komK} · fas ${slutK.fas} · smutsiga ${slutK.smutsiga} · tunga kvar ${slutK.tungaUte} · glaset ${slutK.glasAktiv}`,
    komK && slutK.smutsiga === 0 && slutK.fas === 'skolj' && !slutK.tungaUte && slutK.glasAktiv])

  await nyOmgang()
  await stall()
  const komL = await vantaFas('vift')
  const foreL = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1300)
  rad.push(['L · exit mitt i viftfönstret', `nådde vift ${komL} · ${errors.length - foreL} konsolfel`,
    komL && errors.length === foreL])

  console.log('\n  BORSTA-TANDERNA — spelad av sonden\n')
  for (const [namn, text, bra] of rad) console.log(`  ${ok(bra)} ${namn.padEnd(32)} ${text}`)
  const fel = rad.filter((r) => !r[2]).length
  console.log(`\n  ${fel === 0 ? '✓ alla ' + rad.length + ' matningar grona' : '✗ ' + fel + ' av ' + rad.length + ' FALLER'}`)
  console.log(errors.length ? `  ✗ ${errors.length} konsolfel: ${errors[0]}` : '  ✓ 0 konsolfel')
  for (const [k, n] of stackar) console.log(`\n  ×${n}\n${k}`)
} finally {
  await browser.close()
}
