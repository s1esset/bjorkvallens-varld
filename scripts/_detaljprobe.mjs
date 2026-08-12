// Vad är inställningen "Enklare grafik" VÄRD? (LYFTPLAN C10 / nattkö N8)
//
// `setDetaljniva(0)` byter varje bakad gradient mot en rå färg. Att koppla en knapp
// till det är meningslöst om den inte köper något mätbart — och en knapp som INTE gör
// något är sämre än ingen knapp alls, för föräldern som slår på den tror att hen har
// hjälpt sin platta.
//
// Mätt genom appens EGEN väg: inställningen skrivs via `SaveService`, sidan LADDAS OM,
// och `main.js` sätter nivån vid uppstart. Att importera `/src/lib/form.js` i sonden
// och kalla `setDetaljniva` där bevisar ingenting — `_ikonkostnad.mjs` har mätt att
// probets import kan bli en ANNAN modulinstans än den spelen redan fått.
//
// Två storheter per spel, armarna VÄXELVIS (maskinen driver):
//   textur-byte  summan av de bakade gradienternas GPU-textur i den monterade scenen
//   FPS          under CPU-strypning — utan den ligger båda armarna i taket
//
// MÄT OM PÅ PLATTAN innan någon tror på siffrorna här: en utvecklardator är inte
// målplattan, och det enda som INTE syns i de här talen är gradientsamplingen per
// pixel — en svag mobil-GPU kan vara fyllnadsbegränsad där ritanropen är identiska.
// Bygg och servera (se skill `skal-och-data`), peka sedan sonden dit:
//
//   node scripts/_detaljprobe.mjs [--cpu 6] [--sek 3] [--url http://...:4173]
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : d }
const txt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CPU = opt('--cpu', 6)
const SEK = opt('--sek', 3)
const URL = txt('--url', 'http://localhost:5173')
const SPELBILD = txt('--bild', null) // --bild <id> → skärmdump av båda nivåerna, inga tal

const SPEL = ['kla-efter-vadret', 'skuggmatchning', 'ballonglyft', 'vandkort', 'enkelt-pussel', 'golvet-ar-lava']

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  const cdp = await page.context().newCDPSession(page)
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  // Sätt läget genom appens egen SaveService och ladda om — hela vägen, som en förälder.
  const settLage = async (enklare) => {
    await page.evaluate((v) => window.__barnspel.save.update((d) => { d.settings.enklareGrafik = v }), enklare)
    await page.waitForTimeout(250) // skrivningen är fördröjd (SaveService._schedule)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    return page.evaluate(async () => (await import('/src/lib/form.js')).detaljniva())
  }

  // Går igenom hela scengrafen och summerar de DISTINKTA bakade gradienttexturerna.
  // Samma teknik som `_ikonkostnad.mjs`: cacherna går inte att läsa utifrån, men
  // texturerna sitter kvar på ritinstruktionerna.
  const gradienter = () => page.evaluate(() => {
    const kallor = new Map()
    const walk = (n) => {
      if (!n || n.destroyed) return
      const ins = n.context?.instructions
      if (ins) {
        for (const i of ins) {
          const src = i.data?.style?.fill && i.data.style.texture?.source
          if (src) kallor.set(src.uid, { w: src.width, h: src.height })
        }
      }
      if (n.children) for (const k of n.children) walk(k)
    }
    walk(window.__barnspel.app.stage)
    let byte = 0, radiella = 0, linjara = 0
    for (const s of kallor.values()) { byte += s.w * s.h * 4; s.h > 1 ? radiella++ : linjara++ }
    return { antal: kallor.size, radiella, linjara, byte }
  })

  // FPS + RITANROP per bildruta. Ritanropen är den storhet som faktiskt kan skilja på
  // en svag GPU: en gradientfyllning är en egen textur att binda och kan bryta Pixis
  // batch, medan en rå färg batchas med sina grannar. GPU-minnet (140 KB) är för litet
  // för att betyda något; batchbrytningarna behöver inte vara det. Räknas genom att
  // haka på WebGL-kontextens egna rit-anrop — inget gissande om Pixis interna räknare.
  const fps = (sek) => page.evaluate(async (sek) => {
    const app = window.__barnspel.app
    const gl = app.renderer.gl
    let rutor = 0, anrop = 0
    let haka = null
    if (gl && !gl.__sondHakad) {
      const de = gl.drawElements.bind(gl)
      const da = gl.drawArrays.bind(gl)
      const dei = gl.drawElementsInstanced?.bind(gl)
      gl.drawElements = (...a) => { anrop++; return de(...a) }
      gl.drawArrays = (...a) => { anrop++; return da(...a) }
      if (dei) gl.drawElementsInstanced = (...a) => { anrop++; return dei(...a) }
      gl.__sondHakad = true
      haka = () => { gl.drawElements = de; gl.drawArrays = da; if (dei) gl.drawElementsInstanced = dei; gl.__sondHakad = false }
    }
    const rakna = () => { rutor++ }
    app.ticker.add(rakna)
    await new Promise((r) => setTimeout(r, sek * 1000))
    app.ticker.remove(rakna)
    haka?.()
    return { fps: rutor / sek, ritanrop: rutor ? anrop / rutor : 0 }
  }, sek)

  const matning = async (id) => {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(500)
    await page.evaluate((g) => window.__barnspel.nav.go('game', { id: g }), id)
    await page.waitForTimeout(1600)
    const g = await gradienter()
    const f = await fps(SEK)
    return { ...g, ...f }
  }

  // Vad KOSTAR nivå 0 i bild? Talen ovan säger bara vad den sparar. Det som byts bort
  // är precis den volym LYFTPLAN C1 lade fyra sessioner på att ge föremålen.
  const bild = async (id, fil) => {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(500)
    await page.evaluate((g) => window.__barnspel.nav.go('game', { id: g }), id)
    await page.waitForTimeout(1600)
    writeFileSync(fil, await page.screenshot())
  }

  if (SPELBILD) {
    await settLage(false)
    await bild(SPELBILD, `.test-shots/_detalj-${SPELBILD}-full.png`)
    await settLage(true)
    await bild(SPELBILD, `.test-shots/_detalj-${SPELBILD}-enkel.png`)
    await settLage(false)
    console.log(`  .test-shots/_detalj-${SPELBILD}-{full,enkel}.png · konsolfel: ${fel.length}`)
    await browser.close()
    process.exit(fel.length ? 1 : 0)
  }

  console.log(`\n"Enklare grafik" — vad byter nivå 0 mot nivå 2? (CPU ÷${CPU}, ${SEK}s per mätning)\n`)
  const rader = []
  // VÄXELVIS per spel: ett omladdningsbyte per arm är dyrt, men sekventiellt
  // "alla på 2, sedan alla på 0" mäter maskinens drift lika mycket som ändringen.
  for (const id of SPEL) {
    const n2 = await settLage(false)
    const full = await matning(id)
    const n0 = await settLage(true)
    const enkel = await matning(id)
    if (n2 !== 2 || n0 !== 0) { console.log(`  ⚠ ${id}: nivån tog inte (${n2}/${n0}) — inställningen når inte fram`); kod = 1 }
    rader.push({ id, full, enkel })
  }
  await settLage(false)

  const pad = (s, n) => String(s).padEnd(n)
  const num = (v, n, d = 1) => String(v.toFixed(d)).padStart(n)
  console.log(pad('spel', 20) + pad('gradienter', 13) + pad('KB textur', 14) + pad('ritanrop/ruta', 17) + 'FPS (nivå 2 → 0)')
  console.log('-'.repeat(92))
  let sByte = 0, sAntal = 0
  for (const r of rader) {
    sByte += r.full.byte - r.enkel.byte
    sAntal += r.full.antal - r.enkel.antal
    console.log(
      pad(r.id, 20) +
      pad(`${r.full.antal} → ${r.enkel.antal}`, 13) +
      pad(`${(r.full.byte / 1024).toFixed(0)} → ${(r.enkel.byte / 1024).toFixed(0)}`, 14) +
      pad(`${r.full.ritanrop.toFixed(1)} → ${r.enkel.ritanrop.toFixed(1)}`, 17) +
      num(r.full.fps, 5) + ' → ' + num(r.enkel.fps, 5)
    )
  }
  console.log('-'.repeat(78))
  console.log(`  sparat totalt: ${sAntal} gradienter · ${(sByte / 1024).toFixed(0)} KB GPU-textur`)
  console.log(`  konsolfel: ${fel.length}`)
  if (fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
