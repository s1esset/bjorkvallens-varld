// ROLIGA SNURRAN: lägesväljaren · autoläget · vinstceremonin · trofehyllan.
//
// Ägaruppdrag: en toggle mellan "hjulen stannar själva" och "du stoppar dem själv",
// tre lika = vinsten, en ceremoni (vinsten glider ner stor uppifrån, roterande stjärna
// bakom, strålar ut åt alla håll, glans över föremålet, kort trudelutt) och en trofehylla
// som sparar det man vunnit.
//
// KONTROLLARM FÖRST (arm 0): det MANUELLA läget, som fanns före ändringen. Visar armen
// samma sak som mätarmarna mäter är sonden fel byggd — ett hjul som "stannar själv" i
// manuellt läge vore inte ett fynd utan ett mätfel.
//
// Mäts i tal, inte i tycke:
//   toggle      ett riktigt TRYCK på träffytan flippar `_auto` OCH sparar det
//   auto        hjulen stannar utan att något rörs · stopptid · hjulen i tur och ordning
//   garanti     antal snurr mellan två tre-lika (taket är AUTO_VINST_VAR = 3)
//   delad       antal symboler gemensamma för alla tre hjulen (måste vara ≥1, annars är
//               tre lika omöjligt oavsett hur väl barnet siktar)
//   ceremoni    lagren finns · vinstens storlek mot trummans symbol · stjärnan roterar ·
//               glansbandet rör sig · vinsten hamnar på hyllan
//   hylla       troféer sparas i profilen och överlever en OMLADDNING
//   exit        lämna mitt i ceremonin → konsolfel
//
//   node scripts/_vinstprobe.mjs [--url http://localhost:5173] [--snurr 8]
import { chromium } from 'playwright'

const ID = 'roliga-snurran'
const arg = (namn, fallback) => {
  const i = process.argv.indexOf(namn)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const BAS = arg('--url', 'http://localhost:5173')
const SNURR = Math.max(4, parseInt(arg('--snurr', '8'), 10) || 8)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let fel = 0
const rapport = []
const notera = (rad, ok) => {
  rapport.push(`  ${ok ? '✓' : '✗'} ${rad}`)
  if (!ok) fel++
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  const boot = async () => {
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1500)
  }
  await page.goto(BAS, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await boot()

  const G = (src) =>
    page.evaluate(
      async ([gid, s]) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        return eval(s)
      },
      [ID, src],
    )

  // Vänta tills ett uttryck blir sant — INTE en fast paus. Ceremonin är flera sekunder och
  // en fast väntan hade mätt fel skede så fort maskinen är olika snabb.
  const vantaTill = async (uttryck, tak = 25000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < tak) {
      if (await G(`!!(${uttryck})`)) return Date.now() - t0
      await page.waitForTimeout(60)
    }
    return -1
  }

  // Designkoordinat → skärmkoordinat, så trycken går genom spelets RIKTIGA träffytor.
  const skarm = (dx, dy) =>
    G(`(() => {
      const p = g._root.toGlobal({ x: ${dx}, y: ${dy} })
      const c = window.__barnspel.app.canvas.getBoundingClientRect()
      return { x: Math.round(c.left + p.x * (c.width / window.__barnspel.app.renderer.width)),
               y: Math.round(c.top + p.y * (c.height / window.__barnspel.app.renderer.height)) }
    })()`)
  const tryck = async (p) => {
    await page.mouse.click(p.x, p.y)
    await page.waitForTimeout(90)
  }

  const spak = await skarm(1075, 400)
  const vaxel = await skarm(1118, 620)
  const hjul = [await skarm(420, 390), await skarm(640, 390), await skarm(860, 390)]

  // ---------------------------------------------------------------- arm 0: kontroll
  // MANUELLT läge (standard). Hjulen får INTE stanna av sig själva.
  await vantaTill('g._phase === "redo"')
  const autoStart = await G('g._auto')
  await tryck(spak)
  await page.waitForTimeout(3200) // långt förbi autolägets 1,1 + 0,72·2 = 2,54 s
  const kvarSnurrar = await G('g._reels.filter(r => r.state === "spin").length')
  notera(`kontrollarm: manuellt läge, ${kvarSnurrar}/3 hjul snurrar ännu efter 3,2 s (auto=${autoStart})`, kvarSnurrar === 3 && autoStart === false)
  for (const h of hjul) await tryck(h)
  const stannade = await vantaTill('g._reels.every(r => r.state === "still")', 8000)
  notera(`kontrollarm: barnets tryck stoppar alla tre hjulen (${stannade} ms)`, stannade >= 0)
  await vantaTill('g._phase === "redo"', 20000)

  // ---------------------------------------------------------------- arm 1: väljaren
  await tryck(vaxel)
  // ⚠️ 900 ms, inte 400: `SaveService.update` är DEBOUNCAD 500 ms (SaveService.js:80). En
  // avläsning före flushen gav `custom.autoStopp = null` och såg ut som att spelet inte
  // sparade — medan omladdningsarmen längre ner samtidigt visade att det gjorde det.
  await page.waitForTimeout(900)
  const efterTryck = await G('({ auto: g._auto, knopp: Math.round(g._togKnob.x) })')
  const sparat = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('pwagames.save.v1') || '{}')
    const p = (d.profiles || []).find((x) => x.id === d.activeProfileId) || (d.profiles || [])[0]
    return p?.games?.['roliga-snurran']?.custom?.autoStopp ?? null
  })
  notera(`väljaren: ett riktigt tryck på träffytan flippar läget (auto ${autoStart} → ${efterTryck.auto}, knopp x ${efterTryck.knopp})`, efterTryck.auto === true && efterTryck.knopp > 0)
  notera(`väljaren: valet sparas i profilen (custom.autoStopp = ${sparat})`, sparat === true)

  // ---------------------------------------------------------------- arm 2+3: autoläget
  const utfall = []
  let ceremoni = null
  let symbolStorlek = await G('g._reels[0].nodes[0]._symSize')

  for (let s = 0; s < SNURR; s++) {
    if ((await vantaTill('g._phase === "redo"', 25000)) < 0) break
    const gem = await G('g._gemensammaNycklar().length')
    const t0 = Date.now()
    await tryck(spak)
    // INGET rörs härefter — hjulen ska stanna av sig själva.
    const klar = await vantaTill('g._reels.every(r => r.state === "still")', 20000)
    const st = await G('({ want: g._wantKey, keys: g._reels.map(r => r.key) })')
    const tre = st.keys[0] === st.keys[1] && st.keys[1] === st.keys[2]
    utfall.push({ gem, want: st.want, tre, ms: klar < 0 ? -1 : Date.now() - t0 })

    // Fånga ceremonin LEVANDE första gången tre lika faller.
    //
    // ⚠️ Mät SVÄNGNINGEN över ett fönster, inte två punkter. Första versionen läste
    // glansbandet vid två tidpunkter direkt efter landningen och fick −104 → −104: bandets
    // svep startar 0,6 s in i ceremonin och båda avläsningarna låg FÖRE det. Ett tal som
    // står stilla för att man mätte fel skede ser exakt ut som en effekt som inte finns.
    // Skärmdumpen tas EFTER hela svepet — den kostar ~150 ms och förskjuter annars mätningen.
    if (tre && !ceremoni) {
      if ((await vantaTill('g._prizeLayer && g._prizeNod && g._prizeNod.scale.x > 2', 9000)) >= 0) {
        const prov = []
        for (let i = 0; i < 14; i++) {
          const p = await G(`g._prizeLayer && g._prizeNod && !g._prizeNod.destroyed ? ({
            lager: g._prizeLayer.children.length,
            dim: +g._prizeDim.alpha.toFixed(2),
            skala: +g._prizeNod.scale.x.toFixed(2),
            starRot: +g._prizeStar.rotation.toFixed(3),
            rayRot: +g._prizeRays.rotation.toFixed(3),
            band: +g._prizeBand.x.toFixed(1),
            maskad: !!g._prizeGlans.mask,
          }) : null`)
          if (p) prov.push(p)
          if (i === 6) await page.screenshot({ path: '.test-shots/_vinstprobe-ceremoni.png' })
          await page.waitForTimeout(130)
        }
        if (prov.length >= 4) {
          const kol = (n) => prov.map((p) => p[n])
          const svang = (n) => +(Math.max(...kol(n)) - Math.min(...kol(n))).toFixed(2)
          ceremoni = {
            prov: prov.length,
            lager: Math.max(...kol('lager')),
            dim: Math.max(...kol('dim')),
            skala: Math.max(...kol('skala')),
            maskad: prov.every((p) => p.maskad),
            starSvang: svang('starRot'),
            raySvang: svang('rayRot'),
            bandSvang: svang('band'),
            // Motsatt håll: stjärnans rotation ska VÄXA och strålarnas MINSKA.
            motsatt: kol('starRot')[prov.length - 1] > kol('starRot')[0] && kol('rayRot')[prov.length - 1] < kol('rayRot')[0],
          }
        }
      }
    }
  }

  const stoppade = utfall.filter((u) => u.ms > 0)
  const medel = stoppade.length ? Math.round(stoppade.reduce((s, u) => s + u.ms, 0) / stoppade.length) : -1
  notera(`auto: alla ${stoppade.length}/${utfall.length} snurr stannade UTAN att något rördes (snitt ${medel} ms)`, stoppade.length === utfall.length && utfall.length > 0)
  notera(`delad symbol: minst en symbol gemensam för alla tre hjulen i varje snurr (min ${Math.min(...utfall.map((u) => u.gem))})`, utfall.every((u) => u.gem >= 1))

  // Garantin: aldrig fler än 3 drag mellan två vinster, och första snurren är en vinst.
  let lucka = 0
  let varsta = 0
  for (const u of utfall) {
    lucka++
    if (u.tre) {
      if (lucka > varsta) varsta = lucka
      lucka = 0
    }
  }
  const treAntal = utfall.filter((u) => u.tre).length
  notera(`garanti: första autosnurren gav tre lika (want=${utfall[0]?.want ?? '–'})`, utfall[0]?.tre === true)
  notera(`garanti: som mest ${varsta} snurr mellan två vinster (taket är 3) · ${treAntal}/${utfall.length} tre lika`, varsta > 0 && varsta <= 3)
  notera(`garanti: varje BEGÄRD vinst blev också en vinst (${utfall.filter((u) => u.want).length} begärda)`, utfall.filter((u) => u.want).every((u) => u.tre))

  if (ceremoni) {
    const kvot = +((ceremoni.skala * 96) / symbolStorlek).toFixed(2)
    notera(`ceremoni: ${ceremoni.lager} lager (dämpning ${ceremoni.dim} · stjärna · strålar · vinst), ${ceremoni.prov} prov`, ceremoni.lager >= 4 && ceremoni.dim > 0.2)
    notera(`ceremoni: vinsten är ${kvot}× trummans symbol (${Math.round(ceremoni.skala * 96)} px mot ${symbolStorlek})`, kvot > 1.6)
    notera(`ceremoni: stjärnan roterar ${ceremoni.starSvang} rad och strålarna ${ceremoni.raySvang} rad ÅT ANDRA HÅLLET`, ceremoni.starSvang > 0.15 && ceremoni.raySvang > 0.05 && ceremoni.motsatt)
    notera(`ceremoni: glansen maskad av föremålets egen silhuett, bandet sveper ${ceremoni.bandSvang} px`, ceremoni.maskad && ceremoni.bandSvang > 40)
  } else {
    notera('ceremoni: ingen tre-lika fångades levande — höj --snurr', false)
  }

  // ---------------------------------------------------------------- arm 4: hyllan
  await vantaTill('g._phase === "redo"', 25000)
  const hylla = await G('({ trofeer: g._trofeer.slice(), noder: g._trofNoder.length })')
  const iProfil = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('pwagames.save.v1') || '{}')
    const p = (d.profiles || []).find((x) => x.id === d.activeProfileId) || (d.profiles || [])[0]
    return p?.games?.['roliga-snurran']?.custom?.trofeer ?? null
  })
  notera(`hylla: ${hylla.trofeer.length} trofé(er) på hyllan, lika många ritade noder`, hylla.trofeer.length > 0 && hylla.noder === hylla.trofeer.length)
  notera(`hylla: unika (ingen dubblett i listan)`, new Set(hylla.trofeer).size === hylla.trofeer.length)
  notera(`hylla: sparad i profilen [${(iProfil || []).join(' ')}]`, JSON.stringify(iProfil) === JSON.stringify(hylla.trofeer))

  await page.screenshot({ path: '.test-shots/_vinstprobe-hylla.png' })

  // Överlever en OMLADDNING? Det är hela poängen med att "spara det man vunnit".
  await page.reload({ waitUntil: 'domcontentloaded' })
  await boot()
  const efterOmladdning = await G('({ trofeer: g._trofeer.slice(), noder: g._trofNoder.length, auto: g._auto })')
  notera(`hylla: överlever omladdning (${efterOmladdning.noder} noder, läget auto=${efterOmladdning.auto})`,
    JSON.stringify(efterOmladdning.trofeer) === JSON.stringify(hylla.trofeer) && efterOmladdning.noder === hylla.trofeer.length && efterOmladdning.auto === true)

  // ---------------------------------------------------------------- arm 5: exit
  const foreExit = errors.length
  await vantaTill('g._phase === "redo"', 25000)
  await tryck(spak)
  await vantaTill('g._prizeLayer', 22000) // vänta in en ceremoni (garantin ger en inom 3 drag)
  let varv = 0
  while (!(await G('!!g._prizeLayer')) && varv++ < 3) {
    await vantaTill('g._phase === "redo"', 25000)
    await tryck(spak)
    await vantaTill('g._prizeLayer', 22000)
  }
  const mittI = await G('!!g._prizeLayer')
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1400)
  notera(`exit MITT i ceremonin (lager levde: ${mittI}) → ${errors.length - foreExit} konsolfel`, errors.length - foreExit === 0)

  console.log(`\n  ${ID} — vinst, läge och hylla\n`)
  for (const r of rapport) console.log(r)
  console.log(`\n  utfall per snurr (auto): ${utfall.map((u) => (u.tre ? '★' : '·')).join('')}   ★ = tre lika`)
  console.log(`  konsolfel totalt: ${errors.length}`)
  for (const e of errors.slice(0, 5)) console.log('    ' + e)
  console.log(fel ? `\n  ✗ ${fel} mätning(ar) föll\n` : '\n  ✓ allt på plats\n')
  process.exit(fel ? 1 : 0)
} finally {
  await browser.close()
}
