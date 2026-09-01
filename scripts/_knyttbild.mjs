// unika-knytt: bilder ur FÖDELSEN — det enda stället där knyttets storlek och skuggor
// går att bedöma. Testharnessen når aldrig hit (dess nio tryck rör aldrig spaken), så
// ceremonins slutbild har ingen annan mätare än den här.
//
// Spelar ett helt varv med egna tryck och sparar tre rutor i `.test-shots/`:
//   knytt-fodelse.png   knyttet reser sig ur skalet (två skuggor? fel storlek?)
//   knytt-varld.png     världen står kvar, knyttet på väg mot bänken
//   knytt-bank.png      knyttet på bänken — ligger det en övergiven skugga kvar på gräset?
//   knytt-lek-*.png     lekfulla lägets tre lägen (finger till höger · vila · till vänster).
//                       Lutningen mäts av `_knyttprobe` L5, men bara en BILD svarar på om
//                       kroppen lutar över sin skugga eller lossnar från den — `_snurr`
//                       ligger under `_skala` medan skuggan är dess SYSKON under `view`.
//
// Rapporterar också knyttets UPPMÄTTA höjd ur `getBounds()` mot vad `dna.storlek` lovar:
// riggen skalar själv med `storlek`, så en storleksfaktor i ceremonin räknar den två gånger.
//
//   node scripts/_knyttbild.mjs [--storlek 0|1|2|3]
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const SPAK_X = 1160
const SPAK_Y = 350
const AGG_X = 640
const AGG_Y = 470
const T_STORLEK = { x: 300, y: 450 }

const arg = process.argv.slice(2)
const vill = arg.includes('--storlek') ? Number(arg[arg.indexOf('--storlek') + 1]) : 3

const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1600)

  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const X = (x) => geo.x0 + x * geo.s
  const Y = (y) => geo.y0 + y * geo.s
  const klick = (x, y) => page.mouse.click(X(x), Y(y))
  const fas = () => page.evaluate(() => window.__barnspel.game?._fas || '?')

  // Ställ storleksbälgen på önskat steg (den stegar ett steg per tryck).
  for (let i = 0; i < vill; i++) { await klick(T_STORLEK.x, T_STORLEK.y); await page.waitForTimeout(220) }

  await klick(SPAK_X, SPAK_Y)
  for (let i = 0; i < 40 && (await fas()) === 'ceremoni'; i++) {
    await klick(200, 200)
    await page.waitForTimeout(140)
  }
  for (let i = 0; i < 12 && (await fas()) === 'klacka'; i++) {
    await klick(AGG_X, AGG_Y)
    await page.waitForTimeout(260)
  }

  // Födelsen: knyttet reser sig ur skalet strax efter kläckningen.
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '.test-shots/knytt-fodelse.png' })

  await page.waitForTimeout(1400)
  await page.screenshot({ path: '.test-shots/knytt-varld.png' })
  // Efter _tillBanken står knyttet på bänken och ceremonins hållare är tom.
  await page.waitForTimeout(2600)
  await page.screenshot({ path: '.test-shots/knytt-bank.png' })

  // --- lekfulla läget i bild ------------------------------------------------------
  // Knyttet står på bänken (800, 470). Tre rutor: fingret ute till höger, i vila, och ute
  // till vänster. Vilorutan är KONTROLLEN — utan den går det inte att se om de två andra
  // lutar eller om knyttet alltid stått så.
  const svep = async (x0, x1, y, n) => {
    for (let i = 0; i <= n; i++) {
      await page.mouse.move(X(x0 + ((x1 - x0) * i) / n), Y(y))
      await page.waitForTimeout(40)
    }
  }
  const dittra = async (x, y, ms) => {
    const t0 = Date.now()
    let i = 0
    while (Date.now() - t0 < ms) {
      await page.mouse.move(X(x + (i % 2 ? 5 : -5)), Y(y))
      await page.waitForTimeout(40)
      i++
    }
  }
  const lut = () => page.evaluate(() => {
    const k = window.__barnspel.game?._knytt
    return k ? { lut: +k.s.lut.toFixed(3), sido: +k.s.sido.toFixed(1), lage: k.lage } : null
  })

  await svep(830, 930, 480, 10)
  await dittra(930, 480, 800)
  const lekH = await lut()
  await page.screenshot({ path: '.test-shots/knytt-lek-hoger.png' })

  await page.mouse.move(X(200), Y(200))
  await page.waitForTimeout(1200)
  const lekVila = await lut()
  await page.screenshot({ path: '.test-shots/knytt-lek-vila.png' })

  await svep(770, 670, 480, 10)
  await dittra(670, 480, 800)
  const lekV = await lut()
  await page.screenshot({ path: '.test-shots/knytt-lek-vanster.png' })

  // Mät knyttets ritade höjd mot det `dna.storlek` lovar. `_knytt` sätts först i `_fardigt`
  // ('klar'), så mätningen måste ligga EFTER födelsen — inte vid den.
  const matt = await page.evaluate(() => {
    const g = window.__barnspel.game
    const v = g?._knytt?.view
    if (!v || v.destroyed) return null
    const b = v.getBounds()
    return { h: Math.round(b.height), b: Math.round(b.width), storlek: g?._dna?.storlek ?? null }
  })

  // --- ISOLERADE MÄTNINGAR ---------------------------------------------------------
  // Två frågor som båda kräver knytt byggda UTANFÖR det levande varvet, och som därför
  // delar ställningsverk: samma tre importer, samma bygg → mät → städa → riv.
  //
  // ⓵ SKALAN. Höjden i en LEVANDE omgång går inte att jämföra mellan körningar: varje varv
  //   har ett nytt frö, och öron/horn/vingar ändrar höjden mer än storleken gör. Bygg därför
  //   fyra knytt ur SAMMA dna där bara `storlek` skiljer — då är storleken enda variabeln.
  //
  // ⓶ ÖGONLOCKET. `lockG` (knytt.js:_byggOga) är en KROPPSFÄRGAD lucka, 3e bred och 3,5e hög,
  //   som sänks över ögat. Att den är större än ögat är med flit — den ska täcka helt — men
  //   den är inte klippt mot huvudet, och då målar den kroppsfärg utanför siluetten vid VARJE
  //   blinkning.
  //   ⚠️ FÖRSTA INSTRUMENTET VAR FEL och gav +0,0 px på sex frön: `view.getBounds()` är
  //   unionen över HELA knyttet, inklusive öron, svans och vingar, som sträcker sig långt
  //   utanför huvudet. Ett lock som går utanför KROPPEN ryms lätt innanför den unionen.
  //   Mätningen är därför geometrisk i stället: lockets ytterkant (`ögats x + 1,5e`) mot
  //   kroppens halva bredd vid ansiktshöjd (`m.bredd * 0.86`, samma tal `dx`-klampen använder).
  //
  // `stadKnytt` fanns i knytt.js till 2026-09-01, da de tre stad-looparna slogs ihop till
  // `lib/feedback.js:stadFx`. Sonden kraschade pa den raden fran den dagen till 2026-09-02
  // — HELA den isolerade skalmatningen har alltsa varit dod, utan att nagon markt det.
  const { skala, lock } = await page.evaluate(async () => {
    const kn = await import('/src/games/unika-knytt/knytt.js')
    const dn = await import('/src/games/unika-knytt/dna.js')
    const fb = await import('/src/lib/feedback.js')
    /** Bygg ett knytt ur `dna`, mat det med `f`, riv det igen. */
    const mat = (dna, f) => {
      const k = kn.byggKnytt(dna, { r: 92 })
      const ut = f(k)
      fb.stadFx(k.view)
      k.destroy()
      return ut
    }

    const bas = dn.dnaFromSeed(1234567, { f: 2, z: 0, m: 1, v: 0, g: 1 })
    const skala = dn.STORLEKAR.map((s) =>
      mat({ ...bas, storlek: s }, (k) => ({ s, h: Math.round(k.view.getBounds().height) })))

    const lock = [1234567, 42, 987654, 5150, 31337, 271828].map((fro) =>
      mat(dn.dnaFromSeed(fro, { f: 2, z: 2, m: 1, v: 0, g: 1 }), (k) => {
        const kant = k._m.bredd * 0.86
        let varst = -Infinity
        let eVarst = 0
        // `e` ska hora ihop med det VARSTA ogat — annars rapporterar raden ett matt och en
        // storlek fran tva olika ogon, och talen gar inte att rakna efter for hand.
        for (const o of k._ogon) {
          const over = Math.abs(o.nod.x) + 1.5 * o.e - kant
          if (over > varst) { varst = over; eVarst = o.e }
        }
        return { fro, kant: Math.round(kant), e: Math.round(eVarst), over: Math.round(varst * 10) / 10 }
      }))

    return { skala, lock }
  })

  console.log('')
  console.log('  unika-knytt — födelsebilder')
  console.log('')
  if (matt) {
    console.log(`  levande varv:      dna.storlek ${matt.storlek} · ritad ${matt.h}×${matt.b} px`)
    console.log('  (höjden mellan körningar är INTE jämförbar — nytt frö = andra öron/horn)')
  } else {
    console.log('  ⚠ hittade inget knytt att mäta i det levande varvet')
  }
  console.log('')
  console.log('  isolerat (samma dna, bara storlek varierad, r = 92):')
  console.log('    storlek   höjd    höjd/storlek   höjd/storlek²')
  for (const r of skala) {
    console.log(`    ${r.s.toFixed(2)}      ${String(r.h).padStart(4)}    ${(r.h / r.s).toFixed(1).padStart(8)}   ${(r.h / (r.s * r.s)).toFixed(1).padStart(10)}`)
  }
  const kv = skala.map((r) => r.h / r.s)
  const spr = (Math.max(...kv) - Math.min(...kv)) / (kv.reduce((a, b) => a + b, 0) / kv.length)
  console.log('')
  console.log(`  höjd/storlek varierar ${(spr * 100).toFixed(1)} % — nära 0 betyder att storleken räknas EN gång`)
  console.log(`  spann största/minsta: ${(skala[3].h / skala[0].h).toFixed(2)}x  (kupans blobb lovar 1.62x)`)
  console.log('')
  console.log('  ogonlocket mot KROPPENS kant vid ansiktshojd (negativt = innanfor):')
  for (const r of lock) {
    console.log(`    fro ${String(r.fro).padStart(7)}  kroppskant ${String(r.kant).padStart(3)} px · oga e ${String(r.e).padStart(2)}  →  locket ${r.over >= 0 ? '+' : ''}${r.over} px`)
  }
  const varsta = Math.max(...lock.map((r) => r.over))
  console.log(`  varsta: ${varsta >= 0 ? '+' : ''}${varsta} px  ${varsta > 0 ? '← locket malar kroppsfarg UTANFOR huvudet vid varje blinkning' : '← innanfor'}`)

  console.log('')
  console.log('  lekfulla laget (knyttet pa banken):')
  for (const [namn, v] of [['finger hoger', lekH], ['vila (kontroll)', lekVila], ['finger vanster', lekV]]) {
    console.log(`    ${namn.padEnd(18)} ${v ? `lage ${String(v.lage).padEnd(8)} lut ${String(v.lut).padStart(6)} rad · sido ${String(v.sido).padStart(5)} px` : '(inget knytt)'}`)
  }
  console.log('')
  console.log('  bilder: .test-shots/knytt-fodelse.png · knytt-varld.png · knytt-bank.png')
  console.log('          knytt-lek-hoger.png · knytt-lek-vila.png · knytt-lek-vanster.png')
  if (errors.length) console.log(`  konsolfel: ${errors.length}\n   ${errors.slice(0, 4).join('\n   ')}`)
  else console.log('  konsolfel: inga')
  console.log('')
} finally {
  await browser.close()
}
