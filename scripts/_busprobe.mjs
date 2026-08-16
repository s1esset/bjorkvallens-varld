// BUSSONDEN — spelar `vakna-pappa` med riktiga muspekningar och läser spelets eget
// tillstånd. Frågan är ägarens: väcker de tolv sakerna pappa på TOLV OLIKA sätt, eller är
// de tolv namn på samma knapp?
//
// ⚠️ KONTROLLARMEN FÖRST. Arm 1 trycker på VÄCK-knappen UTAN valt verktyg. Stiger
//    vakenheten då mäter sonden knappen, inte verktyget, och varje tal efter det är
//    värdelöst. (CLAUDE.md: en mätning som inte kan skilja två KÄNDA lägen åt säger
//    ingenting om det okända.)
//
// ⚠️ VAKENHETEN NOLLSTÄLLS MELLAN VARJE SAK, och pausen med den. Utan det mäter man
//    ackumulering: sak nr 8 skulle "ge +0" bara för att taket redan var nått.
//
// ⚠️ MIN-KOLUMNEN ÄR EN INDIKATION, INTE ETT BEVIS. Den samplar `_aktivMin` var 250:e ms;
//    en min med `hall: 0.9` kan hamna mellan två sampel, och `lampa` kisar med `blunda()`
//    som inte är en min alls. En tom min-ruta betyder alltså "sonden såg ingen", inte
//    "saken har ingen" — läs koden innan du kallar det ett fel.
//
// Kör ENSAM. Två headless-Chrome mot samma dev-server svälter varandras ticker, och en
// filändring i repot får Vite att ladda om sidan mitt i mätningen (räknas nedan).
import { chromium } from 'playwright'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const HYLL_Y = 596
const PLATS_X = [190, 370, 550, 730]
const PIL_H = { x: 878, y: HYLL_Y }
const VACK = { x: 1120, y: 570 }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
let laddningar = 0
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 180)) })
page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 180)))
page.on('load', () => { laddningar += 1 })

const vanta = (ms) => page.waitForTimeout(ms)
const peka = (x, y) => page.evaluate(({ x, y }) => {
  const cv = document.querySelector('canvas')
  const r = cv.getBoundingClientRect()
  for (const t of ['pointerdown', 'pointerup']) {
    cv.dispatchEvent(new PointerEvent(t, {
      clientX: r.left + x, clientY: r.top + y,
      pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
    }))
  }
}, { x, y })

const las = () => page.evaluate(() => {
  const g = window.__barnspel?.game
  if (!g) return { tomt: true }
  const a = g._ans
  return {
    vaken: +(g._vaken || 0).toFixed(2),
    sida: g._sida,
    vald: g._drag?.selected?.data?.key ?? null,
    busy: !!g._busy,
    taketNer: !!g._taketNer,
    filtPa: !!g._filtPa,
    // Riggens AKTIVA min är det enda måttet på att ansiktet faktiskt svarade — två saker
    // som ger samma +1 men samma min är två namn på samma knapp.
    // ⚠️ Returnera NAMNET, inte lappen: `_aktivMin` är en Pixi-Sprite och playwright kan
    //    inte serialisera den (`object reference chain is too long`).
    min: a && a._aktivMin ? (Object.keys(a._miner || {}).find((k) => a._miner[k] === a._aktivMin) ?? '?') : null,
  }
})

// Nollställ mellan varje sak. ⚠️ TRE FÄLLOR SOM ALLA GAV FALSKA NOLLOR:
//   ⓵ `_filtPa` — klockan drar filten över hans huvud, och då HALVERAS nästa saks verkan
//     (`n = Math.floor(n/2)`), alltså blir ett +1 ett +0. Tre saker efter klockan såg
//     stumma ut i två körningar i rad.
//   ⓶ `_sistKey`/`_upprepning` — tredje gången samma orsak ger ett läge mindre.
//   ⓷ Baslinjen 0 — kaffet doftar först från LÄGE 2, alltså `_vaken >= 1`. Vid 0 gör det
//     ingenting, helt korrekt, och en nolla där mäter spelets regel och inte verktyget.
// Baslinjen är därför 1: alla nivågrindar är öppna och taket (4) nås inte av ett +2.
const BAS = 1
const nollstall = () => page.evaluate((bas) => {
  const g = window.__barnspel.game
  g._vaken = bas
  g._pausT = 0
  g._aterT = 0
  g._busy = false
  g._filtPa = false
  g._filtKvar = 0
  g._filtAnvand = false
  g._taketNer = false
  g._sistKey = null
  g._upprepning = 0
  if (g._filtKlick) g._filtKlick.visible = false
  g._ans?.slappMin?.()
}, BAS)

const rader = []
const skriv = (n, v, k = '') => rader.push([n, String(v), k])

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'vakna-pappa' }))
  await vanta(2600)

  // ⚠️ LÄS PLATSERNA UR SPELET, GISSA DEM INTE. Första versionen räknade sida = index/4 och
  //    x ur en egen tabell; då valdes 11 av 12 saker ALDRIG, och deras "+1/+2" var i själva
  //    verket den FÖRRA sakens verkan som låg kvar vald. Alla tolv talen såg rimliga ut.
  const poster = await page.evaluate(() => window.__barnspel.game._verktyg.map((p) => ({
    key: p.key, x: Math.round(p.x), y: Math.round(p.y), sida: p.sida,
  })))
  let s = await las()
  if (s.tomt) throw new Error('spelet exponerar inget tillstånd')

  // ---- ARM 1: KONTROLLARM — VÄCK utan valt verktyg ------------------------
  await nollstall()
  await peka(VACK.x, VACK.y)
  await vanta(1200)
  const kontroll = (await las()).vaken - BAS
  skriv('KONTROLL väck utan val', kontroll, 'ska vara 0')

  // ---- ARM 2: alla tolv saker, en i taget --------------------------------
  const utfall = []
  for (const post of poster) {
    const { key, x: plats, y: platsY, sida } = post
    await nollstall()
    // Bläddra till rätt sida.
    for (let v = 0; v < 4; v++) {
      if ((await las()).sida === sida) break
      await peka(PIL_H.x, PIL_H.y)
      await vanta(420)
    }
    await peka(plats, platsY)      // välj saken
    await vanta(500)
    const valdOk = (await las()).vald === key
    await page.evaluate(() => { window.__barnspel.game._busy = false })
    await peka(VACK.x, VACK.y)     // använd den
    // ⚠️ POLLA, LÄS INTE EN GÅNG. Sakerna FLYGER till ansiktet först (katten GÅR dit), och
    //    minen håller bara 0,8–1,5 s. Ett enda avläst värde 2,4 s senare missade både den
    //    långsammaste verkan och alla miner: 9 av 12 rapporterade "min: —" fast de hade
    //    en. Vi tar högsta vakenheten och FÖRSTA levande minen över hela fönstret.
    // 9 s fönster: KATTEN GÅR till ansiktet i tre steg med 0,45 s paus emellan, och höjer
    // vakenheten först när hon är framme. Med 5,5 s stod hon som "utan verkan" — ett fel i
    // MÄTAREN som såg ut som ett fel i spelet. Tiden till verkan mäts därför också: den är
    // ett designtal (hur länge ett barn väntar på sitt svar), inte en sondparameter.
    let toppVaken = BAS
    // ALLA miner i fönstret, inte bara den första: `_skickaIvag` spelar en generisk min när
    // saken landar, och den maskerade sakens EGNA min i åtta av tolv fall.
    const forstaMin = new Set()
    let tidTillVerkan = null
    for (let t = 0; t < 36; t++) {
      await vanta(250)
      const p = await las()
      if (p.tomt) break
      if (p.vaken > toppVaken) {
        toppVaken = p.vaken
        if (tidTillVerkan == null) tidTillVerkan = ((t + 1) * 0.25).toFixed(2)
      }
      if (p.min) forstaMin.add(p.min)
    }
    utfall.push({ key, vald: valdOk, dv: +(toppVaken - BAS).toFixed(2), min: [...forstaMin], tid: tidTillVerkan })
  }
  for (const u of utfall) {
    skriv(`  ${u.key}`, `+${u.dv}`, `${u.vald ? '' : 'VALDES INTE · '}${u.tid ? `${u.tid} s` : '   —'} · ${u.min.length ? u.min.join('+') : '—'}`)
  }
  const stumma = utfall.filter((u) => u.dv <= 0)
  const minerSet = new Set(utfall.flatMap((u) => u.min))
  skriv('saker utan verkan', stumma.length ? stumma.map((u) => u.key).join(', ') : '0', 'ska vara 0')
  skriv('olika miner totalt', minerSet.size, [...minerSet].join(' '))
  skriv('saker utan egen min', utfall.filter((u) => !u.min.length).map((u) => u.key).join(', ') || '0')

  // ---- ARM 3: rummet — täcket åker av ------------------------------------
  await nollstall()
  // Töm valet först — en zon petar bara om ingen sak är vald (`if (!this._drag?.selected)`).
  await page.evaluate(() => window.__barnspel.game._drag?._deselect?.())
  const magX = await page.evaluate(() => window.__barnspel.game._zoner?.find?.((z) => z.zon === 'filt')?.n?.x ?? 570)
  const foreTack = (await las()).taketNer
  await peka(570, 440)   // täcket över magen (ZONER-posten 'filt')
  await vanta(1600)
  const efterTack = (await las()).taketNer
  skriv('tryck på täcket', `${foreTack} → ${efterTack}`, efterTack !== foreTack ? 'täcket åkte ner' : `INGEN ÄNDRING (zon-x ${magX})`)

  // ---- ARM 4: exit mitt i en handling ------------------------------------
  await peka(poster[0].x, poster[0].y)
  await vanta(300)
  await page.evaluate(() => { window.__barnspel.game._busy = false })
  await peka(VACK.x, VACK.y)
  await vanta(120)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await vanta(1600)
  skriv('exit mitt i väckningen', fel.length === 0 ? 'rent' : `${fel.length} konsolfel`)
} catch (err) {
  skriv('SOND KRASCHADE', err.message)
} finally {
  await browser.close()
}

const b = Math.max(...rader.map((r) => r[0].length))
console.log('')
for (const [n, v, k] of rader) console.log(`  ${n.padEnd(b)}  ${v.padEnd(12)} ${k}`)
console.log(`\n  sidladdningar: ${laddningar}${laddningar > 1 ? ' ⚠ OMLADDNING MITT I — talen gäller inte' : ''}`)
console.log(`  konsolfel: ${fel.length}`)
for (const f of fel.slice(0, 6)) console.log(`    ✗ ${f}`)
console.log('')
