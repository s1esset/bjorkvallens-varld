// Dagkörning D10 (kluster B2) — `kulbana`: propellern är ett riktigt gångjärn med motor (FYSIKPLAN F1/G8).
//   node scripts/_dag-kulbana.mjs
//
// Kräver dev-servern på :5173 (eller :5174 utan HMR — sätt URL=http://localhost:5174). Ensam körning:
// två webbläsarsonder samtidigt förfalskar varandras svar.
//
// SPELAR bana 4 med RIKTIGA muspekningar: drar ut PROPELLERN ur hyllan och lägger den i kulans FALLINJE
// (kulans startläge läses ur spelets tillstånd: `_ballBody.position` = utsläppet; navet hamnar 35 px åt
// sidan och 250 px under det, så kulan ALLTID slår i ett blad) — inga ramper, ingen lottad layout. Trycker
// sedan SLÄPP. En inspelare hakar på spelets `phys.beforeStep` och skriver en rad PER FAST FYSIKSTEG
// (propellerns vinkelfart ω = angle − anglePrev i rad/steg, kulans och navets läge/fart). Samma läsning
// fungerar på HEAD (statiska stavar `_props`, vinkeln satt med fart) och på nya koden (`_prop`, en dynamisk
// kropp på ett gångjärn), så KONTROLLARMEN är samma sond mot HEAD. En TRÄFF räknas GEOMETRISKT: ett steg
// där kulan är släppt och kulans mitt ligger närmare navet än bladlängd + kulradie (75 + 26 = 101 px) — det
// finns i båda armarna (kollisionshändelsen finns bara i ny kod och skrivs bara som INFO).
//
// MÄTNINGAR (3 släpp per runda, två rundor)
//   (c) PARKERAD propeller på hyllan snurrar inte: max |ω| = 0 under 1 s.          (HEAD ✓ · nya ✓)
//   (b) kulan KOM till propellern (≥ 1 närhetssteg per runda) och rundan tar slut (inget fastnat, < 26 s).
//   (a) ω ÄNDRAS av kulan: i minst ett släpp per runda avviker ω från takten 0,035 med ≥ 0,012 rad/steg;
//       motorn för tillbaka den (slut-ω inom 0,006 — den kan sakta ner, aldrig stanna), |ω| ≤ 0,15 och
//       längsta stillestånd ≤ 2 s.
//         KONTROLLARM = HEAD: träffar > 0 men ω KONSTANT 0,035 (avvikelse < 1e-6) → (a)-raderna ✗ på HEAD.
//   Runda 2 är OTÅLIG: bana 4 laddas om direkt (rivning av gångjärn + kropp) och nästa SLÄPP trycks så
//   fort fallet tagit slut.
//   (d) 0 konsolfel; efter HEM tickar inget (inspelarens radantal står still); HEM mitt i ett fall
//       (propellern i full snurr, kulan på väg) ger 0 fel.
//
// Vad som ska synas i skärmdumpen (`.test-shots/_dag-kulbana-*.png`): propellern ute i fältet med
// stativ, bladen med vita svisch-bågar efter spetsarna när kulan just slagit i (alfa följer
// |ω − 0,035|), noll svisch när den snurrar på egen hand. Parkerad på hyllan: kryss 45°, inga bågar.
import { chromium } from 'playwright'

const ID = 'kulbana'
const URL = process.env.URL || 'http://localhost:5173'
const OMEGA = 0.035
const PROP_R = 75 + 26 // bladlängd + kulradie: närmare än så mellan kulans mitt och navet = kulan är vid bladen

const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const gaIn = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
    await page.waitForTimeout(1500)
  }
  const skarm = (x, y) => page.evaluate(([x, y]) => {
    const b = window.__barnspel
    const c = b.app.canvas.getBoundingClientRect()
    const s = c.width / b.app.renderer.width
    return { x: c.left + x * s, y: c.top + y * s }
  }, [x, y])
  const klick = async (x, y) => { const p = await skarm(x, y); await page.mouse.click(p.x, p.y) }

  // Inspelaren: en rad per FAST fysiksteg. Hakas på varje ny spelinstans (phys byts vid init).
  const hakaPa = () => page.evaluate(() => {
    const g = window.__barnspel.game
    window.__dag ||= { rader: [], traffar: [], impl: null }
    const D = window.__dag
    if (g.__dagHakad === g._phys) return
    g.__dagHakad = g._phys
    g._phys.beforeStep(() => {
      const part = g._parts?.find((p) => p && !p.destroyed && p._kind === 'propeller')
      const b = part ? (part._prop ?? part._props?.[0]) : null
      const bb = g._ballBody
      if (part && !D.impl) D.impl = part._prop ? 'ny (gångjärn+motor)' : 'HEAD (kinematisk)'
      if (D.rader.length < 60000) {
        D.rader.push({
          w: b ? b.angle - b.anglePrev : null,
          ute: part ? part.y < 600 : false,
          px: part ? part.x : 0, py: part ? part.y : 0,
          bx: bb.position.x, by: bb.position.y, bvx: bb.velocity.x, bvy: bb.velocity.y,
          bst: !!bb.isStatic, fall: !!g._falling, res: !!g._resolving, gl: !!g._gliding, lvl: g._level,
        })
      }
    })
    g._phys.onCollision((e) => {
      for (const pa of e.pairs) {
        const bb = g._ballBody
        const ab = pa.bodyA === bb || pa.bodyB === bb
        const o = pa.bodyA === bb ? pa.bodyB : pa.bodyA
        if (ab && o.label === 'propeller') D.traffar.push({ rad: D.rader.length, vx: bb.velocity.x, vy: bb.velocity.y })
      }
    })
  })
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game
    if (!g || g.id !== 'kulbana') return { borta: true }
    const r = g._releaseBtn
    return {
      lvl: g._level, fall: !!g._falling, res: !!g._resolving, glid: !!g._gliding,
      rx: r && Math.round(r.x), ry: r && Math.round(r.y),
      delar: g._parts.map((p, i) => ({ i, k: p._kind, x: Math.round(p.x), y: Math.round(p.y), rot: +p.rotation.toFixed(3) })),
    }
  })
  const rader_ = () => page.evaluate(() => window.__dag?.rader.length ?? 0)
  const lasRader = (fran, till) => page.evaluate(([f, t]) => window.__dag.rader.slice(f, t), [fran, till ?? 1e9])
  const vantaLugn = async (ms = 30000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { const s = await stat(); if (s.borta) return false; if (!s.fall && !s.res && !s.glid) return true; await page.waitForTimeout(60) }
    return false
  }
  const dra = async (fx, fy, tx, ty) => {
    const a = await skarm(fx, fy)
    await page.mouse.move(a.x, a.y); await page.mouse.down()
    for (let k = 1; k <= 14; k++) { const p = await skarm(fx + (tx - fx) * k / 14, fy + (ty - fy) * k / 14); await page.mouse.move(p.x, p.y); await page.waitForTimeout(20) }
    await page.mouse.up()
    await page.waitForTimeout(120)
  }
  // ↻-knappens skärmläge på del i (varierar med delens vinkel)
  const knopp = (i) => page.evaluate((idx) => {
    const g = window.__barnspel.game
    const p = g._parts[idx]
    if (!p?._knob) return null
    const gp = p._knob.getGlobalPosition()
    const b = window.__barnspel
    const c = b.app.canvas.getBoundingClientRect()
    const s = c.width / b.app.renderer.width
    return { x: c.left + gp.x * s, y: c.top + gp.y * s }
  }, i)
  const vrid = async (i, grader) => {
    // 15° per tryck på ↻, index 4 = 0° ... wrap efter +60° till −60°
    const steg = (((grader / 15) % 9) + 9) % 9
    for (let k = 0; k < steg; k++) { const p = await knopp(i); if (!p) break; await page.mouse.click(p.x, p.y); await page.waitForTimeout(90) }
  }

  // Läser var kulan faktiskt faller (utsläppet) ur spelets tillstånd och lägger propellern i fallinjen.
  const fallinje = () => page.evaluate(() => { const p = window.__barnspel.game._ballBody.position; return { x: p.x, y: p.y } })
  const lagg = async () => {
    const f = await fallinje()
    const m = { x: Math.round(f.x + 35), y: Math.round(f.y + 250) }
    const s = await stat()
    const prop = s.delar.find((d) => d.k === 'propeller')
    if (prop && Math.hypot(prop.x - m.x, prop.y - m.y) > 6) await dra(prop.x, prop.y, m.x, m.y)
    return stat()
  }
  const propRad = (s) => s.delar.find((d) => d.k === 'propeller')

  await gaIn()
  await hakaPa()
  const s0 = await stat()
  ok('SLÄPP-knappen finns', s0.rx != null, `SLÄPP (${s0.rx},${s0.ry})`)

  // ---- bana 4 -----------------------------------------------------------------------------
  await page.evaluate(() => { const g = window.__barnspel.game, c = window.__barnspel.ctx; g._level = 4; g._loadLevel(c, 4) })
  await page.waitForTimeout(1200)
  await hakaPa()
  const s4 = await stat()
  const par = propRad(s4)
  ok('bana 4: propellern ligger parkerad på hyllan', par && par.y >= 600, JSON.stringify(par))
  const impl = await page.evaluate(() => window.__dag.impl)
  console.log('implementation:', impl)

  // (c) parkerad: står still
  const r0 = await rader_()
  await page.waitForTimeout(1000)
  const parRader = (await lasRader(r0)).filter((r) => r.w != null)
  const parMax = Math.max(0, ...parRader.map((r) => Math.abs(r.w)))
  ok('(c) parkerad propeller snurrar inte (max |ω| = 0)', parRader.length > 20 && parMax < 1e-9, `${parRader.length} steg · max |ω| ${parMax.toExponential(2)}`)

  // lägg ut layouten
  const sL = await lagg()
  const pl = propRad(sL)
  ok('propellern gick att dra ut i fältet', pl && pl.y < 600, JSON.stringify(pl))
  await page.screenshot({ path: '.test-shots/_dag-kulbana-lagd.png' })

  // takten innan släpp (propellern snurrar av sig själv ute i fältet)
  const rPre = await rader_()
  await page.waitForTimeout(1200)
  const pre = (await lasRader(rPre)).filter((r) => r.w != null && r.ute)
  const medel = pre.length ? pre.reduce((s, r) => s + r.w, 0) / pre.length : NaN
  ok('ute i fältet snurrar propellern av sig själv (ω ≈ 0,035)', Math.abs(medel - OMEGA) < 0.003 && pre.length > 40, `medel ω ${medel.toFixed(4)} över ${pre.length} steg`)

  // ---- runda 1 ----------------------------------------------------------------------------
  const kor = async (etikett) => {
    const fran = await rader_()
    const t0 = Date.now()
    await klick(s0.rx, s0.ry)
    await page.waitForTimeout(150)
    const lugn = await vantaLugn(26000)
    const tid = (Date.now() - t0) / 1000
    const till = await rader_()
    const R = (await lasRader(fran, till)).filter((r) => r.w != null)
    const fall = R.filter((r) => !r.bst)
    const dev = Math.max(0, ...fall.map((r) => Math.abs(r.w - OMEGA)))
    const wMax = Math.max(0, ...fall.map((r) => Math.abs(r.w)))
    const slut = R.slice(-20)
    const wSlut = slut.length ? slut.reduce((s, r) => s + r.w, 0) / slut.length : NaN
    const mal = R.some((r) => r.res)
    const glid = R.some((r) => r.gl) // no-fail-glidet hem (hjälpen) — då var det inte kulan genom propellern
    // Längsta sammanhängande stillestånd (|ω| < 0,002) medan kulan är släppt: motgång får SAKTA NER, aldrig stoppa.
    let still = 0, stillMax = 0
    for (const r of R) { if (!r.bst && r.ute && Math.abs(r.w) < 0.002) { still++; stillMax = Math.max(stillMax, still) } else still = 0 }
    const nara = R.filter((r) => !r.bst && Math.hypot(r.bx - r.px, r.by - r.py) < PROP_R).length // geometrisk träff (båda armarna)
    const traffar = await page.evaluate((f) => window.__dag.traffar.filter((t) => t.rad >= f).length, fran) // kollisionshändelser (bara ny kod)
    console.log(`  [${etikett}] ${tid.toFixed(1)} s · ${R.length} steg · närhetssteg ${nara} · kollisioner ${traffar} · max avvikelse ${dev.toFixed(4)} · max |ω| ${wMax.toFixed(3)} · slut-ω ${wSlut.toFixed(4)} · mål ${mal}`)
    return { lugn, tid, dev, wMax, wSlut, mal, glid, traffar, nara, stillMax, R }
  }
  // `max` släpp i rad utan att vänta artigt — som ett barn som trycker SLÄPP igen så fort kulan är tillbaka.
  const korFlera = async (etikett, max = 3) => {
    let sam = null
    for (let k = 1; k <= max; k++) {
      const r = await kor(`${etikett} · släpp ${k}`)
      sam = sam ? { ...r, dev: Math.max(sam.dev, r.dev), wMax: Math.max(sam.wMax, r.wMax), nara: sam.nara + r.nara, traffar: sam.traffar + r.traffar, stillMax: Math.max(sam.stillMax, r.stillMax), slapp: k, lugn: sam.lugn && r.lugn, tid: sam.tid + r.tid } : { ...r, slapp: 1 }
      if (!r.lugn) break
    }
    return sam
  }
  const r1 = await korFlera('runda 1')
  await page.screenshot({ path: '.test-shots/_dag-kulbana-efter1.png' })
  ok('(b) runda 1 tar slut (inget fastnat för alltid)', r1.lugn, `${r1.tid.toFixed(1)} s`)
  ok('(b) kulan KOM till propellern (geometriskt: ≥ 1 steg närmare än 101 px) — HEAD ska också få träffar', r1.nara > 0, `${r1.nara} närhetssteg · ${r1.traffar} kollisioner`)
  ok('(a) KULAN ÄNDRAR propellerns vinkelfart (avvikelse från 0,035 ≥ 0,012) — kontrollarm HEAD: 0,0000', r1.dev >= 0.012, `max avvikelse ${r1.dev.toFixed(4)}`)
  ok('(a) motorn för tillbaka den mot takten (slut-ω inom 0,006) — aldrig stopp för gott', Math.abs(r1.wSlut - OMEGA) < 0.006, `slut-ω ${r1.wSlut.toFixed(4)}`)
  ok('(a) snurrtaket håller (max |ω| ≤ 0,15 + 0,005)', r1.wMax <= 0.155, `max |ω| ${r1.wMax.toFixed(3)}`)
  ok('(a) propellern stannar aldrig för gott (längsta stillestånd ≤ 2 s = 120 steg)', r1.stillMax <= 120, `längsta stillestånd ${r1.stillMax} steg`)

  // ---- runda 2: OTÅLIGT ---------------------------------------------------------------------
  // Bana 4 laddas om DIREKT efter runda 1 — rivningen (gångjärn + kropp, `ta()` får inte kallas två gånger).
  const fore = errors.length
  await page.evaluate(() => { const g = window.__barnspel.game, c = window.__barnspel.ctx; g._level = 4; g._loadLevel(c, 4) })
  await page.waitForTimeout(300)
  await lagg()
  const r2 = await korFlera('runda 2 (otålig)')
  ok('(b) runda 2 (otålig) tar slut', r2.lugn, `${r2.tid.toFixed(1)} s`)
  ok('(b) runda 2: kulan kom till propellern', r2.nara > 0, `${r2.nara} närhetssteg`)
  ok('(a) runda 2: kulan ändrar farten igen (≥ 0,012) — kontrollarm HEAD: 0,0000', r2.dev >= 0.012, `max avvikelse ${r2.dev.toFixed(4)}`)
  // direkt SLÄPP på nytt (utan att vänta artigt)
  await klick(s0.rx, s0.ry)
  await page.waitForTimeout(250)
  await klick(s0.rx, s0.ry) // andra trycket under fallet ska bara wiggla
  await vantaLugn(26000)
  ok('0 konsolfel efter två otåliga rundor', errors.length === fore, errors.slice(fore).join(' | '))

  // ---- (d) HEM mitt i ett fall, och inget tickar efter exit ------------------------------------
  await page.evaluate(() => { const g = window.__barnspel.game, c = window.__barnspel.ctx; g._level = 4; g._loadLevel(c, 4) })
  await page.waitForTimeout(400)
  await lagg()
  await klick(s0.rx, s0.ry)
  await page.waitForTimeout(500) // mitt i fallet, propellern i full snurr
  const felFore = errors.length
  await klick(70, 128) // hem (hemknappens nedre kant)
  await page.waitForTimeout(1500)
  const hem = await stat()
  ok('HEM mitt i fallet går hem', hem.borta, JSON.stringify(hem).slice(0, 60))
  const n1 = await rader_()
  await page.waitForTimeout(1500)
  const n2 = await rader_()
  ok('inget tickar efter exit (inspelarens radantal står still)', n1 === n2, `${n1} → ${n2}`)
  ok('0 konsolfel efter exit mitt i fallet', errors.length === felFore, errors.slice(felFore).join(' | '))

  // gå in igen och ut igen utan att göra något (singleton-spelet: gammal state får inte läcka)
  await gaIn()
  await hakaPa()
  await page.evaluate(() => { const g = window.__barnspel.game, c = window.__barnspel.ctx; g._level = 4; g._loadLevel(c, 4) })
  await page.waitForTimeout(600)
  const sI = await stat()
  const p3 = propRad(sI)
  ok('ny omgång: propellern parkerad igen', p3 && p3.y >= 600, JSON.stringify(p3))
  await klick(70, 128)
  await page.waitForTimeout(1500)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn}  — ${r.text}`)
process.exit(rader.every((r) => r.ok) ? 0 : 1)
