// `vakna-pappa`: ÄGARENS TVÅ PUNKTER.
//
//   ⓵ går det att välja EN till TRE saker och skicka iväg dem med väckknappen?
//   ⓶ pekar ficklampan dit den lyser?
//
// KONTROLLARMAR FÖRST, annars mäter man ingenting:
//   · ett tryck på tom hylla ska INTE lägga något i vallistan
//   · väckknappen utan val ska inte skicka något (och ska ändå svara)
//   · lampans vinkel läses BÅDE i hyllans viloläge och riktad — ett tal utan sitt
//     motsatta läge bredvid sig säger inget om att vridningen ens hände
//
//   node scripts/_komboprobe.mjs
import { chromium } from 'playwright'

const ID = 'vakna-pappa'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const grad = (r) => `${(r * 180 / Math.PI).toFixed(0)}°`

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1800)

  const G = (src) => page.evaluate(
    async ([gid, s]) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      return eval(s)
    }, [ID, src],
  )
  const sk = await page.evaluate(() => {
    const c = window.__barnspel.app.canvas.getBoundingClientRect()
    return { l: c.left, t: c.top, sx: c.width / window.__barnspel.app.renderer.width, sy: c.height / window.__barnspel.app.renderer.height }
  })
  const S = (x, y) => ({ x: Math.round(sk.l + x * sk.sx), y: Math.round(sk.t + y * sk.sy) })
  const tryck = async (x, y) => { await page.mouse.click(S(x, y).x, S(x, y).y); await page.waitForTimeout(220) }

  // ---------------------------------------------------------------- kontrollarm ---
  await tryck(640, 690)   // tom bordsyta mellan hyllplatserna
  console.log(`KONTROLL tomt bord  → valda=${await G('g._valda.length')}  (ska vara 0)`)
  const foreKnapp = await G('g._vaken')
  await tryck(1120, 570)  // väckknappen utan val
  console.log(`KONTROLL tom knapp  → vaken ${foreKnapp} → ${await G('g._vaken')}  (ska stå still)`)

  // ---------------------------------------------------------------- valet ---
  const platser = await G('g._verktyg.filter(p => p.sida === g._sida).map(p => ({ key: p.key, x: p.x, y: p.y }))')
  console.log(`\nSIDA 0 bär: ${platser.map((p) => p.key).join(', ')}`)

  const steg = []
  for (let i = 0; i < 4; i++) {
    await tryck(platser[i].x, platser[i].y)
    steg.push(`${i + 1} tryck → valda ${await G('JSON.stringify(g._valda.map(p => p.key))')} · ringar synliga ${await G('g._ringar.filter(r => r.visible).length')}`)
  }
  for (const s of steg) console.log('  ' + s)
  await page.screenshot({ path: '.test-shots/_kombo-tre-valda.png' })

  // Ett andra tryck på samma sak ska TA BORT den.
  const fore = await G('g._valda.length')
  const sista = await G('g._valda[g._valda.length - 1].key')
  const pos = platser.find((p) => p.key === sista)
  await tryck(pos.x, pos.y)
  console.log(`  tryck igen på "${sista}" → valda ${fore} → ${await G('g._valda.length')}  (ska minska med 1)`)

  // ---------------------------------------------------------------- kombon ---
  await G('g._vaken = 0; g._pausT = 0')
  // Välj tre igen (listan har två kvar efter avmarkeringen)
  const har = await G('JSON.stringify(g._valda.map(p => p.key))')
  const kvar = platser.filter((p) => !JSON.parse(har).includes(p.key))
  await tryck(kvar[0].x, kvar[0].y)
  const valda = await G('JSON.stringify(g._valda.map(p => p.key))')
  const vakenFore = await G('g._vaken')
  await tryck(1120, 570)   // VÄCK!
  await page.waitForTimeout(2400)
  const efter = await G('(() => ({ vaken: +g._vaken.toFixed(2), valda: g._valda.length, resor: g._resor.size, busy: g._busy }))()')
  console.log(`\nKOMBO  skickade ${valda}`)
  console.log(`       vaken ${vakenFore} → ${efter.vaken} · vallistan tomd=${efter.valda === 0} · resor kvar=${efter.resor} · busy=${efter.busy}`)

  // Alla tre ska vara HEMMA igen efter resan.
  await page.waitForTimeout(2600)
  const hemma = await G(`JSON.stringify(g._verktyg.filter(p => p.sida === g._sida).map(p => ({
    key: p.key,
    dx: Math.round(p.v.view.x - p.x), dy: Math.round(p.v.view.y - p.y), em: p.v.view.eventMode,
  })))`)
  console.log(`       hemma efteråt: ${hemma}`)

  // ---------------------------------------------------------------- ficklampan ---
  const lampSida = await G('g._verktyg.find(p => p.key === "lampa").sida')
  while ((await G('g._sida')) !== lampSida) await tryck(878, 596)
  const lampa = await G('(() => { const p = g._verktyg.find(q => q.key === "lampa"); return { x: p.x, y: p.y } })()')
  const vilo = await G('(() => { const p = g._verktyg.find(q => q.key === "lampa"); return { rot: +p.v.stralPunkt() ? 0 : 0, lins: p.v.stralPunkt() } })()')
  const linsVilo = await G('(() => { const p = g._verktyg.find(q => q.key === "lampa"); const l = p.v.stralPunkt(); return l ? { x: Math.round(l.x - p.v.view.x), y: Math.round(l.y - p.v.view.y) } : null })()')
  console.log(`\nFICKLAMPAN  linsen i VILA, relativt lampans mitt: ${JSON.stringify(linsVilo)}  (vinkel ${grad(Math.atan2(linsVilo.y, linsVilo.x))})`)

  await G('g._vaken = 0; g._busy = false; g._pausT = 0')
  await tryck(lampa.x, lampa.y)
  await tryck(1120, 570)
  await page.waitForTimeout(700)   // mitt i verkan, innan hemresan
  const riktad = await G(`(() => {
    const p = g._verktyg.find(q => q.key === "lampa")
    const l = p.v.stralPunkt()
    const mal = g._zonPunkt('ansikte')
    if (!l) return null
    const vLampa = Math.atan2(l.y - p.v.view.y, l.x - p.v.view.x)
    const vMal = Math.atan2(mal.y - l.y, mal.x - l.x)
    let d = vLampa - vMal
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    return { vLampa, vMal, fel: d, lampX: Math.round(p.v.view.x), lampY: Math.round(p.v.view.y), malX: Math.round(mal.x), malY: Math.round(mal.y) }
  })()`)
  if (riktad) {
    console.log(`            lampan står på (${riktad.lampX},${riktad.lampY}), målet på (${riktad.malX},${riktad.malY})`)
    console.log(`            linsen pekar ${grad(riktad.vLampa)} · mot målet är ${grad(riktad.vMal)} · FEL ${grad(riktad.fel)}`)
    console.log(`            ${Math.abs(riktad.fel) < 0.3 ? '✓ lampan lyser dit den pekar' : '✗ lampan lyser åt fel håll'}`)
  }
  await page.screenshot({ path: '.test-shots/_lampa-riktad.png' })

  console.log(`\nkonsolfel: ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('  ' + e)
} finally {
  await browser.close()
}
