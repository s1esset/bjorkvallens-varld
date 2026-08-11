// Sond: VARFÖR misslyckas glittergrottans ANDRA WebGL-kontext? (ÅTGÄRDER V15)
//
// V15 mätte symptomet — `npm run test glittergrottan` faller ~25 % av gångerna ENSAM,
// med `THREE.WebGLRenderer: A WebGL context could not be created` följt av tom scen.
// Den mätte däremot aldrig VILKEN egenskap hos begäran som fäller den, och utan det
// blir varje fix en gissning. Sonden isolerar frågan från spelet helt:
//
//   färsk sida → appen laddas (Pixi tar kontext 1, precis som i harnessen)
//                → försök skapa kontext 2 med olika attribut → lyckades/föll
//
// Armarna körs VÄXELVIS (samma regel som scripts/_ab.sh) eftersom maskinen driver:
// termik och ackumulerade GPU-processer gör sekventiella block oense med varandra.
// En färsk SIDA per försök speglar harnessen (en färsk webbläsare per körning) och
// undviker att kontexterna staplas mot Chromes tak på ~16 per sida.
//
// TVÅ LÄGEN, och det andra är det som bär signalen:
//   node scripts/_kontextprobe.mjs [N]          attribut-armarna ovan (isolerat)
//   node scripts/_kontextprobe.mjs --spel [N]   monterar RIKTIGA glittergrottan om och om
//                                               och skriver ut konsolen ORDAGRANT när den
//                                               faller — inklusive `Reason: <statusMessage>`
//                                               ur three's webglcontextcreationerror, som är
//                                               det enda som säger VARFÖR webbläsaren vägrar.
import { chromium } from 'playwright'

const SPEL = process.argv.includes('--spel')
const RESERV = process.argv.includes('--reserv')
const N = Number(process.argv.filter((a) => !a.startsWith('--'))[2] || 8)

// --reserv: TVINGA fram vägran (window.__tvingaIngen3D) och kontrollera att spelet landar
// i sitt reservläge i stället för på en tom skärm. Utan det här är reservvägen skriven men
// aldrig körd — och en väg ingen har kört är en gissning till (samma skäl som harnessens
// `--tvinga-tom`). Kontrollerar också exit mitt i läget, som allt annat i repot.
if (RESERV) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 220)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 220)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => { window.__tvingaIngen3D = true })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'glittergrottan' }))
  await page.waitForTimeout(1500)
  const st = await page.evaluate(() => ({
    reservlage: !!window.__barnspel.game?._reservlage,
    kristaller: window.__barnspel.game?._reserv?.length ?? 0,
    dukar: document.querySelectorAll('canvas').length,
    barn: window.__barnspel.game?._root?.children?.length ?? 0,
  }))
  const tryck = async (dx, dy) => page.evaluate(({ dx, dy }) => {
    const cvs = document.querySelectorAll('canvas'); const cv = cvs[cvs.length - 1]
    const r = cv.getBoundingClientRect()
    const x = r.left + dx * (r.width / 1280); const y = r.top + dy * (r.height / 720)
    for (const t of ['pointerdown', 'pointerup']) {
      cv.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true }))
    }
  }, { dx, dy })
  await tryck(240, 400)
  await page.waitForTimeout(600)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))
  await page.screenshot({ path: '.test-shots/glittergrottan-reserv.png' })
  // Exit MITT I läget — vilo-tweenarna är eviga (repeat: -1) och måste dö med spelet.
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  const efterExit = await page.evaluate(() => ({
    kvar: !!window.__barnspel.game?._reserv,
    tweens: window.gsap ? window.gsap.globalTimeline.getChildren(true, true, false).length : -1,
  }))
  await browser.close()
  const rader = [
    ['reservläget aktivt', st.reservlage === true],
    ['fem kristaller ritade', st.kristaller === 5],
    ['ingen three-duk (bara Pixis)', st.dukar === 1],
    ['0 konsolfel', fel.length === 0],
    ['städat efter exit', efterExit.kvar === false],
  ]
  console.log('\n  Reservläget (tvingad vägran)\n')
  for (const [namn, ok] of rader) console.log(`  ${ok ? '✓' : '✗'} ${namn}`)
  if (fel.length) for (const f of fel) console.log('    ' + f)
  console.log(`\n  bild: .test-shots/glittergrottan-reserv.png  (root-barn: ${st.barn})`)
  process.exit(rader.every(([, ok]) => ok) ? 0 : 1)
}

if (SPEL) {
  // ⚠️ EN FÄRSK WEBBLÄSARE PER FÖRSÖK. Chromes spärr ("Web page caused context loss and
  // was blocked") är ett tillstånd i WEBBLÄSAREN, inte i sidan: så fort ett försök trippat
  // den blockeras alla följande sidor i samma instans, och en delad webbläsare rapporterar
  // därför en kaskad av fall som ser ut som en 100-procentig frekvens. `npm run test` startar
  // en färsk webbläsare per körning — sonden måste göra likadant för att mäta samma sak.
  const utfall = []
  {
    for (let i = 0; i < N; i++) {
      const browser = await chromium.launch({ channel: 'chrome', headless: true })
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
      const konsol = []
      page.on('console', (m) => konsol.push(`[${m.type()}] ${m.text()}`))
      page.on('pageerror', (e) => konsol.push('[pageerror] ' + (e.message || String(e))))
      let ok = false
      try {
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
        await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'glittergrottan' }))
        await page.waitForTimeout(1800)
        // Hur många kontexter lever på sidan, och tog three sin?
        const läge = await page.evaluate(() => ({
          dukar: document.querySelectorAll('canvas').length,
          treKanvas: !!document.querySelector('canvas[data-engine]'),
        }))
        ok = läge.treKanvas
        // Går det att ÅTERHÄMTA sig? Efter ett fall: försök skapa en rå kontext igen med
        // växande fördröjning. Det avgör om "försök igen om en stund" är en möjlig fix
        // eller om Chromes spärr är permanent för sidan — och det är skillnaden mellan en
        // omtagning och att spelet måste klara sig utan 3D-lagret.
        let åter = null
        if (!ok) {
          åter = await page.evaluate(async () => {
            const steg = [0, 100, 300, 1000, 2500]
            const ut = []
            for (const ms of steg) {
              await new Promise((r) => setTimeout(r, ms))
              const cv = document.createElement('canvas')
              let g = null
              try { g = cv.getContext('webgl2') || cv.getContext('webgl') } catch { g = null }
              ut.push({ ms, ok: !!g })
              if (g) break
            }
            return ut
          })
        }
        utfall.push({ i, ok, läge, åter, fel: konsol.filter((r) => /error|WebGL|context/i.test(r)) })
      } catch (e) {
        utfall.push({ i, ok: false, läge: null, åter: null, fel: [...konsol, 'SIDFEL: ' + String(e.message || e)] })
      } finally {
        await page.close()
        await browser.close()
      }
      process.stderr.write(`  ${i + 1}/${N} ${ok ? 'ok' : 'FÖLL'}\n`)
    }
  }
  const föll = utfall.filter((u) => !u.ok)
  console.log(`\n  glittergrottan monterad ${N} ggr: ${N - föll.length} ok · ${föll.length} föll\n`)
  for (const f of föll) {
    console.log(`  --- försök ${f.i + 1} · dukar ${f.läge?.dukar ?? '?'} · three-duk ${f.läge?.treKanvas} ---`)
    for (const r of [...new Set(f.fel)]) console.log('   ' + r.slice(0, 260))
    if (f.åter) {
      const vann = f.åter.find((s) => s.ok)
      console.log(`   återhämtning: ${f.åter.map((s) => `${s.ms}ms:${s.ok ? 'OK' : '-'}`).join(' ')}` +
        `  → ${vann ? `lyckades efter ${vann.ms} ms` : 'ALDRIG (spärren är permanent för sidan)'}`)
    }
  }
  if (!föll.length) console.log('  (inget fall den här gången — kör fler varv)')
  process.exit(0)
}

// three.js WebGLRenderer skickar exakt de här attributen (se WebGLRenderer.js) för
// spelets optioner: { antialias: true, alpha: true, powerPreference: 'high-performance',
// stencil: false }. Resten av armarna skruvar på EN sak i taget mot den.
const ARMS = [
  { namn: 'three-idag', attrs: { antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false } },
  { namn: 'utan-antialias', attrs: { antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false } },
  { namn: 'default-power', attrs: { antialias: true, alpha: true, powerPreference: 'default', stencil: false } },
  { namn: 'naken', attrs: {} },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const res = new Map(ARMS.map((a) => [a.namn, { ok: 0, fel: 0, orsaker: [] }]))

try {
  for (let runda = 0; runda < N; runda++) {
    for (const arm of ARMS) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
      try {
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
        const r = await page.evaluate((attrs) => {
          // Pixis kontext lever redan på sidan — det här är alltså kontext nummer TVÅ,
          // exakt det läge glittergrottan försätter webbläsaren i.
          const cv = document.createElement('canvas')
          cv.width = 1280; cv.height = 720
          let gl = null, orsak = ''
          try { gl = cv.getContext('webgl2', attrs) } catch (e) { orsak = String(e.message || e) }
          if (!gl) {
            // three faller tillbaka på webgl1 innan den kastar — mät båda stegen.
            try { gl = cv.getContext('webgl', attrs) } catch (e) { orsak ||= String(e.message || e) }
            if (gl) return { ok: true, nivå: 1 }
            return { ok: false, orsak: orsak || 'getContext gav null' }
          }
          return { ok: true, nivå: 2 }
        }, arm.attrs)
        const slot = res.get(arm.namn)
        if (r.ok) slot.ok++
        else { slot.fel++; slot.orsaker.push(r.orsak) }
      } catch (e) {
        const slot = res.get(arm.namn)
        slot.fel++; slot.orsaker.push('SIDFEL: ' + String(e.message || e).slice(0, 120))
      } finally {
        await page.close()
      }
    }
    process.stderr.write(`  runda ${runda + 1}/${N}\n`)
  }
} finally {
  await browser.close()
}

console.log(`\n  Andra WebGL-kontexten, ${N} försök per arm, armarna växelvis\n`)
console.log('  arm               lyckade   föll   andel')
let någotFöll = false
for (const arm of ARMS) {
  const r = res.get(arm.namn)
  const tot = r.ok + r.fel
  if (r.fel) någotFöll = true
  console.log(`  ${arm.namn.padEnd(16)} ${String(r.ok).padStart(7)} ${String(r.fel).padStart(6)}   ${((r.fel / tot) * 100).toFixed(0)} %`)
  if (r.orsaker.length) console.log(`      orsaker: ${[...new Set(r.orsaker)].join(' · ').slice(0, 200)}`)
}
if (!någotFöll) {
  console.log('\n  ⚠️ INGEN arm föll. Kontextskapandet är alltså inte det som fäller spelet —')
  console.log('     leta i stället i three/spelets egen väg (eller i maskinens GPU-tillstånd).')
}
