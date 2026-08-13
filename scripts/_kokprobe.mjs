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
//   exit         0 konsolfel när spelet lämnas med luckor öppna
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
      strale: !!g._noder?.strale?.visible,
      hjul: Math.round((g._noder?.flakthjul?.rotation ?? 0) * 1000) / 1000,
      dragbara: (g._mat || []).filter((r) => !r._uppaten && !r.view.destroyed)
        .map((r) => ({ key: r.data.key, atbar: r.data.atbar !== false, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
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

  // ---- 6. EXIT MED ALLT PÅ -------------------------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)

  console.log(`\n  ${errors.length ? '✗ ' + errors.length + ' konsolfel:\n   ' + errors.slice(0, 6).join('\n   ') : '✓ 0 konsolfel (inkl. exit med luckor öppna och kranen på)'}`)
  console.log(`  ${brister ? `✗ ${brister} brister` : '✓ alla mätningar gröna'}`)
  console.log(`  bilder: ${shot} (+ -oppen, -spott)\n`)
  process.exitCode = brister || errors.length ? 1 : 0
} finally {
  await browser.close()
}
