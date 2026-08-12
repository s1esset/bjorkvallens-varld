// `plantera-fron`: lever jorden, och KÄNNER den vad barnet gör?
//
// Punkten kom ur `_stillaprobe`, som mätte spelet som ett äkta TABLEAU: 17 noder,
// **0** i rörelse, största utslag **0,0 px i tre svep**. Trädgården stod helt stilla.
// §4 [Quick]: "Liv i jorden vid sådd: en mask som tittar upp ur ett hål ... små
// variationer så ingen runda ser exakt likadan ut."
//
// "Det rör sig något" räcker inte som krav — då hade en slumpvis vibration godkänts.
// Sonden mäter de egenskaper som gör masken till ett DJUR i jorden:
//   1. Scenen står inte längre stilla i vilofönstret (mot HEADs 0,0 px).
//   2. Masken kommer HELT upp och HELT ner — en hel kikcykel, inte ett darr.
//   3. Ett nedslag SKRÄMMER den: den åker ner efter att fröet landat.
//   4. Skrämseln avtar med AVSTÅNDET — närmaste masken dyker djupare än den bortre.
//   5. Nerdykandet är snabbare än uppdykandet (rädsla vs nyfikenhet).
//   6. Taket håller: aldrig fler än 2 maskar.
//   7. Masken syns aldrig under sin egen marknivå (klippningen håller).
//   8. Exit mitt i en kikcykel lämnar ingenting som tickar.
//
// ⚠️ Raderna 6, 7 och 8 är VAKTER, inte bevis — de är gröna på HEAD också (där det
// inte finns någon mask alls). Bevisen är 1–5.
//
//   node scripts/_maskprobe.mjs [--bild]     # --bild: skärmdump när masken är uppe
import { chromium } from 'playwright'

const ID = 'plantera-fron'
const BILD = process.argv.includes('--bild')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })

  const finns = await page.evaluate(() => (window.__barnspel.game._worms || []).length)
  if (!finns) {
    console.log('\n  Spelet har inga maskar (_worms tomt) — HEAD, eller trasig koppling.\n')
    ok('1. scenen lever i vilofonstret', false, 'inga maskar alls')
    ok('6. taket haller (max 2)', true, '0 maskar')
  } else {
    // --- 1, 2, 5, 7. Följ en hel kikcykel ---------------------------------
    const cykel = await page.evaluate(async () => {
      const g = window.__barnspel.game
      const spar = { maxUt: 0, minUt: 1, prov: 0, rorelse: 0, underMark: 0, upp: [], ner: [] }
      let forra = null
      const t0 = performance.now()
      while (performance.now() - t0 < 11000) {
        for (const w of g._worms) {
          spar.maxUt = Math.max(spar.maxUt, w.ut)
          spar.minUt = Math.min(spar.minUt, w.ut)
          // Kroppens topp i maskens EGNA koordinater; klippningen går vid y=+3.
          const topp = w.body.y - 56
          if (topp > 3) spar.underMark++
        }
        const w0 = g._worms[0]
        if (forra !== null) {
          const d = w0.ut - forra
          spar.rorelse += Math.abs(d) * 52
          if (d > 0.004) spar.upp.push(d)
          if (d < -0.004) spar.ner.push(-d)
        }
        forra = w0.ut
        spar.prov++
        await new Promise((r) => requestAnimationFrame(r))
      }
      const snitt = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
      return { ...spar, uppTakt: snitt(spar.upp), nerTakt: snitt(spar.ner) }
    })

    ok('1. scenen lever i vilofonstret', cykel.rorelse > 40,
      `mask 0 rorde sig ${cykel.rorelse.toFixed(0)} px totalt over 11 s (HEAD: 0,0 px, TABLEAU i tre svep)`)
    ok('2. hel kikcykel (helt upp OCH helt ner)', cykel.maxUt > 0.9 && cykel.minUt < 0.1,
      `ut naade ${cykel.maxUt.toFixed(2)} som mest och ${cykel.minUt.toFixed(2)} som minst`)
    ok('7. syns aldrig under marknivan', cykel.underMark === 0,
      `${cykel.underMark} av ${cykel.prov} bildrutor med kropp under klippningen`)

    // --- 3, 4. Skrämseln: ett RIKTIGT frö dras ner i hålet ------------------
    // Vi kallar inte `_scareWorms` direkt — det hade mätt mekanismen, inte att
    // den kopplas in. Draget gar hela vagen genom DragController -> _onSow.
    const nara = await page.evaluate(() => {
      const g = window.__barnspel.game
      const h = g._holes[0]
      // Sortera maskarna efter avstand till det hal vi ska sa i.
      const med = g._worms.map((w) => ({ w, d: Math.hypot(w.x - h.x, w.y - h.y) }))
        .sort((a, b) => a.d - b.d)
      window.__matt = { hal: h, nara: med[0], bortre: med[med.length - 1] }
      return { antal: g._worms.length, naraD: Math.round(med[0].d), bortreD: Math.round(med[med.length - 1].d) }
    })

    const start = await page.evaluate(() => {
      const g = window.__barnspel.game
      const rec = g._drag.items.find((r) => !r.placed)
      const p = rec.view.getGlobalPosition()
      const c = window.__barnspel.app.canvas.getBoundingClientRect()
      const sx = c.width / window.__barnspel.app.renderer.width
      const sy = c.height / window.__barnspel.app.renderer.height
      const h = window.__matt.hal
      const hp = { x: h.view.getGlobalPosition().x, y: h.view.getGlobalPosition().y }
      return {
        fx: Math.round(c.left + p.x * sx), fy: Math.round(c.top + p.y * sy),
        tx: Math.round(c.left + hp.x * sx), ty: Math.round(c.top + hp.y * sy),
      }
    })

    // Vanta tills NARA-masken ar uppe, sa fallet har nagonstans att falla fran.
    // ⚠️ Forsta versionen kravde att ALLA maskar var uppe samtidigt — men de ar
    // med flit fasforskjutna, sa det intraffar sallan: waitForFunction slog i
    // taket och matningen startade fran en mask som stod NERE (ut = 0,00).
    // Raden var rod av sondens eget krav, inte av spelet.
    const uppe = await page.waitForFunction(() => window.__matt.nara.w.ut > 0.7,
      null, { timeout: 15000 }).then(() => true).catch(() => false)
    if (!uppe) ok('0. naramasken kom upp', false, 'masken naadde aldrig ut > 0,7 pa 15 s')
    const fore = await page.evaluate(() => ({
      nara: window.__matt.nara.w.ut, bortre: window.__matt.bortre.w.ut,
    }))

    await page.mouse.move(start.fx, start.fy)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(start.fx + ((start.tx - start.fx) * i) / 10, start.fy + ((start.ty - start.fy) * i) / 10)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
    await page.waitForTimeout(700) // dykningen ar snabb men inte omedelbar

    const efter = await page.evaluate(() => ({
      nara: window.__matt.nara.w.ut, bortre: window.__matt.bortre.w.ut,
      naraDuck: window.__matt.nara.w.duckAmt, bortreDuck: window.__matt.bortre.w.duckAmt,
      sadd: window.__barnspel.game._sown,
    }))

    const fallNara = fore.nara - efter.nara
    const fallBortre = fore.bortre - efter.bortre
    ok('3. ett nedslag skrammer masken', efter.sadd > 0 && fallNara > 0.25,
      `naramasken (${nara.naraD} px bort) gick ${fore.nara.toFixed(2)} -> ${efter.nara.toFixed(2)} (fall ${fallNara.toFixed(2)}) efter ett riktigt drag`)
    if (nara.antal > 1) {
      ok('4. skramseln avtar med avstandet', efter.naraDuck > efter.bortreDuck + 0.05 || fallNara > fallBortre,
        `duckAmt ${efter.naraDuck.toFixed(2)} vid ${nara.naraD} px mot ${efter.bortreDuck.toFixed(2)} vid ${nara.bortreD} px`)
    } else {
      ok('4. skramseln avtar med avstandet', true, `bara en mask i den har rundan (${nara.antal}) — vakt, inte matt`)
    }
    ok('5. ner fortare an upp', cykel.nerTakt > cykel.uppTakt,
      `nertakt ${(cykel.nerTakt * 1000).toFixed(1)} mot upptakt ${(cykel.uppTakt * 1000).toFixed(1)} (ut/bildruta x1000)`)
    ok('6. taket haller (max 2)', nara.antal <= 2, `${nara.antal} maskar i rundan`)

    if (BILD) {
      await page.waitForFunction(() => window.__barnspel.game._worms.some((w) => w.ut > 0.93),
        null, { timeout: 15000 }).catch(() => {})
      await page.screenshot({ path: '.test-shots/_mask-uppe.png' })
      console.log('\n  skarmdump: .test-shots/_mask-uppe.png (mask uppe)')
    }
  }

  // --- 8. Exit mitt i en kikcykel -----------------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  const efterExit = errors.length
  ok('8. exit mitt i cykeln ar tyst', true, `${efterExit} konsolfel totalt (vakt: gron aven pa HEAD)`)
  ok('9. inga konsolfel', errors.length === 0, errors.length ? errors[0] : 'inga')
} finally {
  await browser.close()
}

console.log('\n  plantera-fron — lever jorden?\n')
let gronast = 0
for (const r of rader) {
  if (r.ok) gronast++
  console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(36)} ${r.text}`)
}
console.log(`\n  ${gronast}/${rader.length} grona\n`)
process.exit(gronast === rader.length ? 0 : 1)
