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
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rad = []
const ok = (b) => (b ? '✓' : '✗')

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
    gapNu: Math.round((g._gapNu ?? 0) * 1000) / 1000,
    iRad: k ? !!g._iTandraden?.(k.x, k.y) : null,
  }
})

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 180)))

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

  console.log('\n  BORSTA-TANDERNA — spelad av sonden\n')
  for (const [namn, text, bra] of rad) console.log(`  ${ok(bra)} ${namn.padEnd(32)} ${text}`)
  const fel = rad.filter((r) => !r[2]).length
  console.log(`\n  ${fel === 0 ? '✓ alla ' + rad.length + ' matningar grona' : '✗ ' + fel + ' av ' + rad.length + ' FALLER'}`)
  console.log(errors.length ? `  ✗ ${errors.length} konsolfel: ${errors[0]}` : '  ✓ 0 konsolfel')
} finally {
  await browser.close()
}
