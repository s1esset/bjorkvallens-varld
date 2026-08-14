// MATA PAPPA: ÖNSKAN + KYLDÖRRENS KLISTERMÄRKEN.
//
// Två ändringar mäts här, båda med kända lägen på var sin sida:
//
//   ÖNSKAN   pappa får en lust till EN bit på brädan (ring + blick + replik). Belöningen
//            ska ligga i CEREMONIN och aldrig i framstegen — en önskad bit som gav mer
//            mätare hade gjort alla andra bitar till fel svar, alltså en uppgift man kan
//            misslyckas med (P0). Sonden mäter därför mätarsteget i BÅDA fallen.
//   MÄRKEN   varje mättad mage sätter ett klistermärke på kyldörren, sparat i profilen.
//
// KONTROLLARMARNA KÖRS FÖRST, och de är tre:
//   ⓵ före första önskan (t < ONSKAN.forstaGang) ska det finnas NOLL ring och blicken
//     ska stå rakt fram — utan den raden betyder "ringen finns" och "han tittar dit"
//     ingenting, för de kunde ha varit sanna hela tiden,
//   ⓶ en ICKE önskad bit matas → mätarsteget är referensen som mätarmen jämförs mot,
//   ⓷ kyldörren är TOM vid start (bounds 0×0) — ett märkeslager som redan ritat något
//     hade gjort "efter en mage finns det något" till en icke-mätning.
//
// Läser TILLSTÅND (spelets egna fält + riggens blicknamn) och rösttjänstens faktiska
// anrop, aldrig pixlar: en ring på 6 px och en ring på 60 px ser likadana ut i ett antal.
//
//   node scripts/_onskeprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'

const ID = 'mata-munnen'
const arg = (namn, fallback) => {
  const i = process.argv.indexOf(namn)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const BAS = arg('--url', 'http://localhost:5173')

const errors = []
let fel = 0
const rapport = []
const notera = (rad, ok) => {
  rapport.push(`  ${ok ? '✓' : '✗'} ${rad}`)
  if (!ok) fel++
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  // Rösten spelas in i en logg. Bekräftelsen ("Precis den pappa ville ha!") är det enda
  // tal som skiljer den önskade biten från vilken bit som helst — grimasen, tuggan och
  // mätarsteget är MED FLIT identiska.
  const hookaRost = () =>
    page.evaluate(() => {
      const v = window.__barnspel.voice
      if (v._probeOrig) return
      v._probeOrig = v.say.bind(v)
      window.__rost = []
      v.say = (t, force) => {
        // Skulle den här repliken ens spelas? En identisk text inom 8 s släpps av
        // tjänsten själv (anti-upprepning) INNAN `cancel()` — den kapar alltså inget.
        const stoppas = !force && t === v.last && performance.now() - (v._lastSayAt || 0) < 8000
        window.__rost.push({ t: performance.now(), text: t, kapade: stoppas ? 0 : (v.kvar || 0) })
        return v._probeOrig(t, force)
      }
    })
  const rost = () => page.evaluate(() => (window.__rost || []).map((r) => r.text))
  const nollaRost = () => page.evaluate(() => { window.__rost = [] })

  // AVBROTT: `VoiceService.say()` kallar `cancel()`, så varje ny replik KAPAR den förra.
  // Loggen bär därför `kvarFore` — hur många sekunder som återstod av det klipp som
  // spelade när den nya repliken kom. Ett tal > 0 är en mening barnet aldrig fick höra
  // klart. Anti-upprepningsfönstret (samma text inom 8 s) räknas bort: en sådan replik
  // spelas aldrig och kapar därför ingenting.
  const avbrott = () =>
    page.evaluate(() => (window.__rost || []).filter((r) => r.kapade > 0.15)
      .map((r) => `${r.text.slice(0, 34)}… (${r.kapade.toFixed(2)} s kvar)`))

  const las = () =>
    page.evaluate(async () => {
      const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
      const a = g._ans
      const o = g._onskan
      const kyl = (g._stationer || []).find((st) => st.id === 'kyl')
      const b = g._markeL && !g._markeL.destroyed ? g._markeL.getLocalBounds() : null
      return {
        antal: g._antal,
        atna: g._atna,
        fyll: Math.round((g._fyllNiva ?? 0) * 1000) / 1000,
        busy: !!g._busy,
        // Antalet ringar i propp-lagret, oberoende av `_onskan`: en ring som blivit kvar
        // efter en släppt önskan syns bara HÄR, aldrig i flaggan. Lagret bär exakt en
        // annan sak (mättnadsburken), så allt utom den är en ring — ett `_probe`-fält på
        // den aktuella ringen hade räknat just den och varit blint för de läckta.
        // ⚠️ ETT ANTAL RÄCKER INTE. "Ringen läckte" och "en NY önskan hann födas" ger båda
        // talet 1 — och tidsfönstret skiljer dem inte åt, för föregående tuggas
        // `later(efterTugga)` fyrar av mitt i mätningen. Varje ring får därför ett id, och
        // frågan blir "finns den GAMLA ringen kvar", inte "hur många ringar finns det".
        ringar: (g._propL?.children || []).filter((c) => c !== g._matarC).map((c) => {
          window.__ringId = window.__ringId || 0
          if (!c._probeId) c._probeId = ++window.__ringId
          return c._probeId
        }),
        onskan: o && o.rec?.view && !o.rec.view.destroyed
          ? {
            key: o.rec.data.key,
            x: Math.round(o.rec.view.x),
            y: Math.round(o.rec.view.y),
            ringX: Math.round(o.ring.x),
            ringY: Math.round(o.ring.y),
            synlig: !!o.ring.visible,
            plats: o.rec._plats,
          }
          : null,
        blick: a?._blickNamn ?? null,
        marken: g._marken ?? null,
        sparat: window.__barnspel.profiles.active()?.games?.['mata-munnen']?.custom?.marken ?? null,
        // Ligger märkena på kylens DÖRR? Ritas de på stommen syns de aldrig bakom en
        // stängd dörr — och det felet är redan gjort en gång i den här filen (magneterna).
        paDorr: !!(g._markeL && kyl?.dorr && g._markeL.parent === kyl.dorr),
        markeBox: b ? { w: Math.round(b.width), h: Math.round(b.height) } : null,
        mat: (g._mat || []).filter((r) => !r._uppaten && !r.view.destroyed && r._plats != null)
          .map((r) => ({ key: r.data.key, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
        mun: { x: Math.round(g._mun?.x ?? 0), y: Math.round(g._mun?.y ?? 0) },
      }
    })

  const boot = async (rensa) => {
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    if (rensa) {
      await page.evaluate(() => {
        for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    }
    await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
    await hookaRost()
  }

  const drag = async (fran, till, { steg = 10, paus = 40, slapp = true } = {}) => {
    await page.mouse.move(fran.x, fran.y)
    await page.mouse.down()
    for (let i = 1; i <= steg; i++) {
      await page.mouse.move(fran.x + (till.x - fran.x) * (i / steg), fran.y + (till.y - fran.y) * (i / steg))
      await page.waitForTimeout(paus)
    }
    if (slapp) await page.mouse.up()
  }

  // Vänta tills ett uttryck blir sant — aldrig en fast paus. Önskan föds efter en `later`
  // och tallriken byts efter finalens hela tidtabell; båda flyttar sig med maskinen.
  const vantaTill = async (f, tak = 20000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < tak) {
      if (f(await las())) return Date.now() - t0
      await page.waitForTimeout(80)
    }
    return -1
  }

  await page.goto(BAS, { waitUntil: 'domcontentloaded' })
  await boot(true)
  await page.waitForTimeout(1500)

  // ---- KONTROLLARM ⓵ · före första önskan ---------------------------------
  const f0 = await las()
  notera(`kontroll: ingen ring före första önskan (ringar ${f0.ringar.length}, önskan ${f0.onskan ? 'ja' : 'nej'})`,
    f0.ringar.length === 0 && !f0.onskan)
  notera(`kontroll: blicken rakt fram utan önskan (${f0.blick ?? 'rakt fram'})`, f0.blick === null)
  // ---- KONTROLLARM ⓷ · tom kyldörr ----------------------------------------
  notera(`kontroll: kyldörren tom vid start (märken ${f0.marken}, ritad box ${f0.markeBox?.w ?? 0}×${f0.markeBox?.h ?? 0})`,
    f0.marken === 0 && (f0.markeBox?.w ?? 0) === 0)
  notera(`märkeslagret sitter på kylens DÖRR (inte på stommen)`, f0.paDorr === true)

  // ---- 1. ÖNSKAN FÖDS ------------------------------------------------------
  const tOnskan = await vantaTill((s) => !!s.onskan, 12000)
  const s1 = await las()
  notera(`önskan föds efter ${(tOnskan / 1000).toFixed(1)} s — "${s1.onskan?.key}" på plats ${s1.onskan?.plats}`,
    tOnskan > 0 && !!s1.onskan && s1.onskan.plats != null)
  notera(`önskan kräver minst två bitar att välja mellan (${s1.mat.length} på brädan)`, s1.mat.length >= 2)
  notera(`ringen står PÅ biten (Δ ${Math.abs(s1.onskan.ringX - s1.onskan.x)}, ${Math.abs(s1.onskan.ringY - s1.onskan.y)} px)`,
    Math.abs(s1.onskan.ringX - s1.onskan.x) <= 2 && Math.abs(s1.onskan.ringY - s1.onskan.y) <= 2)
  // ⚠️ ORDEN KOMMER EFTER BILDEN. Ringen och nicken är omedelbara (P0), men repliken
  // väntar in introt (3,65 s klipp mot en önskan på 3,4 s) — en läsning direkt efter att
  // ringen tänts mäter alltså tystnaden mellan dem, inte en utebliven replik.
  const t1 = Date.now()
  let r1 = await rost()
  while (Date.now() - t1 < 6000 && !r1.some((t) => /den där/i.test(t))) {
    await page.waitForTimeout(150)
    r1 = await rost()
  }
  notera(`han SÄGER något när lusten kommer, efter att introt talat klart ` +
    `(${r1.filter((t) => /den där/i.test(t)).length} replik, ${((Date.now() - t1) / 1000).toFixed(1)} s efter ringen)`,
    r1.some((t) => /den där/i.test(t)))

  // ---- 2. BLICKEN (mot kontrollarm ⓵) --------------------------------------
  notera(`blicken går till önskan: rakt fram → ${s1.blick ?? 'rakt fram'}`, s1.blick !== null)

  // ---- 3. RINGEN SLOCKNAR NÄR BITEN LYFTS ----------------------------------
  // En ring runt handen är en markering barnet inte bad om, och en ring kvar på en tom
  // plats pekar på ingenting. Mäts mitt i ett grepp, inte efteråt.
  const onskadBit = { x: s1.onskan.x, y: s1.onskan.y }
  await drag(onskadBit, { x: onskadBit.x, y: onskadBit.y - 90 }, { steg: 4, paus: 40, slapp: false })
  const sHall = await las()
  notera(`ringen är släckt medan biten hålls (synlig=${sHall.onskan?.synlig})`, sHall.onskan?.synlig === false)
  await page.mouse.move(onskadBit.x, onskadBit.y)
  await page.mouse.up()
  await page.waitForTimeout(450)
  const sSlapp = await las()
  notera(`ringen tänds igen när biten läggs tillbaka (synlig=${sSlapp.onskan?.synlig})`, sSlapp.onskan?.synlig === true)

  // ---- KONTROLLARM ⓶ · mata en bit han INTE bad om -------------------------
  const annan = sSlapp.mat.find((m) => m.key !== sSlapp.onskan.key)
  await nollaRost()
  const fyllFore = sSlapp.fyll
  await drag({ x: annan.x, y: annan.y }, sSlapp.mun)
  await page.waitForTimeout(1400)
  const sAnnan = await las()
  const stegAnnan = Math.round((sAnnan.fyll - fyllFore) * 1000) / 1000
  const rAnnan = await rost()
  notera(`kontroll: en ICKE önskad bit äts (mätaren ${fyllFore} → ${sAnnan.fyll}, steg ${stegAnnan})`,
    stegAnnan > 0.01)
  notera(`kontroll: ingen bekräftelse-replik för fel bit`, !rAnnan.some((t) => /Precis den/i.test(t)))
  notera(`önskan står KVAR när något annat äts (${sAnnan.onskan?.key ?? 'borta'} = ${sSlapp.onskan.key})`,
    sAnnan.onskan?.key === sSlapp.onskan.key)

  // ---- 4. MÄTARM · mata den han BAD om -------------------------------------
  await vantaTill((s) => !!s.onskan && !s.busy, 8000)
  const sFore = await las()
  await nollaRost()
  const fyllFore2 = sFore.fyll
  await drag({ x: sFore.onskan.x, y: sFore.onskan.y }, sFore.mun)
  // Ringens städning läses HÄR, en dryg sekund efter tugget — nästa lust kommer först på
  // `efterTugga + 0.9` ≈ 3,1 s. ⚠️ Mätt efter bekräftelsen (som väntar ut röstklippet)
  // stod räknaren på 1 och det var den NYA ringen: ett läckage och en ny önskan ser
  // likadana ut i ett antal, och bara tidpunkten skiljer dem åt.
  await page.waitForTimeout(1100)
  const sRing = await las()
  const gamla = sRing.ringar.filter((id) => sFore.ringar.includes(id))
  notera(`den uppfyllda önskans ring är RIVEN (ring #${sFore.ringar.join(',')} → kvar: ${gamla.length ? gamla.join(',') : 'ingen'}; i lagret nu: ${sRing.ringar.join(',') || 'inga'})`,
    sFore.ringar.length === 1 && gamla.length === 0)
  // ⚠️ EN FAST PAUS MÄTTE FEL SKEDE. Bekräftelsen ligger på `later(0.92)` PLUS klippets
  // egen längd (`_sag` → `sampleDuration`, 0,7–1,9 s) — 1,8 s räckte inte för `pappa_mmm`
  // och sonden rapporterade "ingen bekräftelse" om en replik som kom 0,3 s senare.
  const t0 = Date.now()
  while (Date.now() - t0 < 5000) {
    if ((await rost()).some((t) => /Precis den pappa/i.test(t))) break
    await page.waitForTimeout(120)
  }
  const sEfter = await las()
  const stegOnskad = Math.round((sEfter.fyll - fyllFore2) * 1000) / 1000
  const rOnskad = await rost()
  notera(`den önskade biten bekräftas i tal ("Precis den pappa ville ha!")`,
    rOnskad.some((t) => /Precis den pappa/i.test(t)))
  notera(`MÄTARSTEGET ÄR OFÖRÄNDRAT: önskad ${stegOnskad} mot kontrollarmens ${stegAnnan}`,
    Math.abs(stegOnskad - stegAnnan) < 0.005)

  // ---- 5. KLISTERMÄRKET ----------------------------------------------------
  // Mata klart tallriken. Varje varv läser brädan om — påfyllningen flyttar bitarna.
  let varv = 0
  while (varv++ < 12) {
    const s = await las()
    if (s.marken > 0) break
    if (s.busy || !s.mat.length) { await page.waitForTimeout(400); continue }
    const bit = s.mat[0]
    await drag({ x: bit.x, y: bit.y }, s.mun)
    await page.waitForTimeout(1500)
  }
  await vantaTill((s) => s.marken > 0, 12000)
  const sMarke = await las()
  notera(`en mättad mage ger ett märke (${f0.marken} → ${sMarke.marken})`, sMarke.marken === 1)
  notera(`märket är SPARAT i profilen (custom.marken = ${sMarke.sparat})`, sMarke.sparat === 1)
  notera(`något är faktiskt RITAT på dörren: ${sMarke.markeBox?.w}×${sMarke.markeBox?.h} px (start 0×0)`,
    (sMarke.markeBox?.w ?? 0) >= 24 && (sMarke.markeBox?.w ?? 0) <= 60)

  // ---- 6. ÖVERLEVER EN OMLADDNING ------------------------------------------
  await page.reload({ waitUntil: 'domcontentloaded' })
  await boot(false)
  await page.waitForTimeout(1800)
  const sOm = await las()
  notera(`märket finns kvar efter OMLADDNING (${sOm.marken} st, ritad box ${sOm.markeBox?.w}×${sOm.markeBox?.h})`,
    sOm.marken === 1 && (sOm.markeBox?.w ?? 0) >= 24)
  notera(`och det ritas om på dörren, inte på stommen`, sOm.paDorr === true)

  // ---- 6c. STÄMPELN RÖR BARA SITT EGET MÄRKE -------------------------------
  // Alla åtta låg först i EN `Graphics` och stämpelpulsen flyttade hela lagrets pivot till
  // det nya märket — de gamla skalades då kring en punkt som inte är deras egen och gled i
  // sidled. Kontrollarmen är det NYA märket i samma mätning: ser sonden dess puls (≠ 0 px)
  // men det gamla står still (0 px), då mäter den rörelse och inte ingenting.
  const driftP = page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const fore = g._marken
    const bas = g._markeNoder.map((n) => { const p = n.getGlobalPosition(); return { x: p.x, y: p.y } })
    const max = bas.map(() => 0)
    let nyMin = null
    let nyMax = null
    let tSkapad = 0
    return await new Promise((klar) => {
      const t0 = performance.now()
      const tick = () => {
        for (let i = 0; i < bas.length; i++) {
          const n = g._markeNoder[i]
          if (!n || n.destroyed) continue
          const p = n.getGlobalPosition()
          max[i] = Math.max(max[i], Math.hypot(p.x - bas[i].x, p.y - bas[i].y))
        }
        // Kontrollarmen: det NYA märkets EGEN skala. Mäts som spann (max − min), inte som
        // nivå — en nivå säger bara var tweenen råkade stå när sonden tittade.
        const ny = g._markeNoder[fore]
        if (ny && !ny.destroyed) {
          const sc = ny.scale.x
          nyMin = nyMin === null ? sc : Math.min(nyMin, sc)
          nyMax = nyMax === null ? sc : Math.max(nyMax, sc)
        }
        // ⚠️ VILLKORET STOD SOM `elapsed > 3000` OCH MÄTTE DÄRMED INGENTING. Märket
        // stämplas ~12 s in, alltså när `elapsed` redan passerat 3 s — loopen bröt då på
        // FÖRSTA bildrutan efter födseln, samplade den nya noden en enda gång (spann 0)
        // och den gamla aldrig UNDER pulsen. Båda raderna var gröna utan att ha mätt
        // stämpeln. Fönstret räknas nu från FÖDSELN och täcker hela tweenen (0,5 s).
        if (tSkapad === 0 && g._marken > fore) tSkapad = performance.now()
        if (performance.now() - t0 < 40000 && !(tSkapad && performance.now() - tSkapad > 1200)) {
          requestAnimationFrame(tick)
        } else {
          klar({
            gamla: Math.round(Math.max(0, ...max) * 10) / 10,
            nyPuls: nyMin === null ? 0 : Math.round((nyMax - nyMin) * 34 * 10) / 10,
            fore, efter: g._marken,
          })
        }
      }
      requestAnimationFrame(tick)
    })
  }).catch(() => null)
  // ⚠️ Mätningen ovan får INTE inväntas här — den löper i sidan tills nästa märke stämplats,
  // och tallriken måste matas i botten under tiden. Ett `await` före matningen låser båda.
  let v = 0
  while (v++ < 14) {
    const s = await las()
    if (s.marken > 1) break
    if (s.busy || !s.mat.length) { await page.waitForTimeout(400); continue }
    await drag({ x: s.mat[0].x, y: s.mat[0].y }, s.mun)
    await page.waitForTimeout(1500)
  }
  const d = await driftP
  if (d) {
    notera(`kontroll: det NYA märkets stämpel syns i mätningen (${d.nyPuls} px puls, märken ${d.fore} → ${d.efter})`,
      d.nyPuls > 3)
    notera(`det GAMLA märket står stilla när ett nytt stämplas (${d.gamla} px drift)`, d.gamla < 1)
  } else {
    notera('drift-mätningen kunde inte köras', false)
  }

  // ---- 6b. BILD PÅ EN FULL DÖRR --------------------------------------------
  // Åtta märken går inte att bedöma i tal: rutnätet kan kollidera med handtaget, med
  // barnteckningen eller med dörrens underkant utan att ett enda tal rör sig. Profilen
  // sätts till taket och dörren fotograferas.
  await page.evaluate((max) => {
    window.__barnspel.save.update((d) => {
      const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
      p.games['mata-munnen'].custom.marken = max
    })
  }, 8)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await boot(false)
  await page.waitForTimeout(1600)
  const sFull = await las()
  notera(`full dörr: ${sFull.marken} märken, ritad box ${sFull.markeBox?.w}×${sFull.markeBox?.h} px`,
    sFull.marken === 8 && (sFull.markeBox?.w ?? 0) >= 100 && (sFull.markeBox?.h ?? 0) >= 100)
  // Märkena ligger på dörren (x 34–140, y 437–579) — hela kylen klipps ut ur skärmdumpen.
  await page.screenshot({ path: '.test-shots/_onskeprobe-kyl.png', clip: { x: 10, y: 260, width: 200, height: 390 } })
  rapport.push('  → .test-shots/_onskeprobe-kyl.png (dörren med åtta märken — döm den i BILD)')

  // ---- 8. RÖSTEN FÅR TALA TILL PUNKT ---------------------------------------
  // Klippen är 2,28–4,06 s (mätt med ffprobe) medan schemat är fasta tal på 2,2–3,4 s, och
  // `say()` kallar `cancel()`. Utan `_narTyst` kapas därför introt och bekräftelsen mitt i
  // meningen — ett barn hör att pappa blev avbruten.
  //
  // KONTROLLARMEN ÄR DEN GAMLA KODEN: `_narTyst` kortsluts till att köra direkt, vilket är
  // exakt vad raden gjorde före fixen. Samma bräda, samma session, samma drag. Utan den
  // vore "0 avbrott" bara ett tal utan motsatsläge.
  const spelaEttVarv = async (varv) => {
    await nollaRost()
    let n = 0
    while (n++ < varv) {
      const s = await las()
      if (s.busy || !s.mat.length) { await page.waitForTimeout(500); continue }
      const bit = s.onskan && !s.busy ? s.onskan : s.mat[0]
      await drag({ x: bit.x, y: bit.y }, s.mun)
      await page.waitForTimeout(2600) // hinner med min → bekräftelse → nästa lust
    }
    return avbrott()
  }
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    g._narTystOrig = g._narTyst
    g._narTyst = (c, fn) => fn() // den gamla, oskyddade schemaläggningen
  })
  const kapadeFore = await spelaEttVarv(4)
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    g._narTyst = g._narTystOrig
  })
  const kapadeEfter = await spelaEttVarv(4)
  notera(`KONTROLL utan väntan kapas repliker mitt i meningen: ${kapadeFore.length} st` +
    (kapadeFore.length ? ` — ${kapadeFore[0]}` : ''), kapadeFore.length > 0)
  notera(`med väntan talar narratorn till punkt: ${kapadeEfter.length} kapade` +
    (kapadeEfter.length ? ` — ${kapadeEfter.join(' · ')}` : ''), kapadeEfter.length === 0)

  // ---- 7. EXIT MITT I EN ÖNSKAN --------------------------------------------
  await vantaTill((s) => !!s.onskan, 12000)
  const foreExit = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)
  notera(`exit mitt i en levande önskan: ${errors.length - foreExit} konsolfel`, errors.length === foreExit)

  console.log(`\n  ÖNSKAN + KLISTERMÄRKEN — ${ID}\n`)
  console.log(rapport.join('\n'))
  if (errors.length) console.log('\n  konsolfel:\n' + errors.slice(0, 6).map((e) => '    ' + e).join('\n'))
  console.log(`\n  ${fel === 0 ? '✓' : '✗'} ${rapport.length - fel}/${rapport.length} gröna · ${errors.length} konsolfel\n`)
} finally {
  await browser.close()
}
process.exit(fel || errors.length ? 1 : 0)
