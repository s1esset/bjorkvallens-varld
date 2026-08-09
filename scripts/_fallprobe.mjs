// FALL-SOND — fallskärmens känsla i tal, före och efter en fysikändring.
//
//   node scripts/_fallprobe.mjs            (kräver dev-servern på :5173)
//   node scripts/_fallprobe.mjs --json     (bara siffrorna, för jämförelse)
//
// Fallets KÄNSLA är hela spelet: hur länge resan ner tar, hur hårt vinden drar, och
// hur snabbt barnets styrning biter. Byter man ut den handrullade rörelsen mot en
// riktig motståndslag måste de tre talen gå att lägga bredvid varandra före/efter —
// annars vet ingen om spelet blev bättre eller bara annorlunda.
//
// Sonden kör spelet DETERMINISTISKT: vinden tvingas till ett fast värde varje bildruta
// (spelets egen bytartimer slumpar annars riktning), styr-assisten nollas (den skulle
// annars dra mot målet och maskera vindens verkan) och ingen input ges utom den sond-
// styrningen mäter. Allt läses ur spelets egna koordinater, inte ur bilden.
import { chromium } from 'playwright'

const ID = 'fallskarmen'
const JSON_ONLY = process.argv.includes('--json')
const log = (...a) => !JSON_ONLY && console.log(...a)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  // Ett fall, mätt bildruta för bildruta.
  //   tung   Tung-läget på/av
  //   vind   luftens verkan (spelets egen `_wind`-enhet), låst varje bildruta
  //   styr   null = ingen input; annars px till höger om fallskärmen som "fingret" hålls
  const fall = async ({ tung = false, vind = 0, styr = null }) =>
    page.evaluate(
      async ({ gid, tung, vind, styr }) => {
        const B = window.__barnspel
        const vanta = (ms) => new Promise((r) => setTimeout(r, ms))
        // ⚠️ VARJE MÄTNING KRÄVER EN FÄRSK MONTERING. Ett `nav.go('game')` när spelet
        // redan ligger uppe gör ingenting, och efter en landning är `_chute` utbytt
        // eller riven — nästa mätning läste då `.x` på en riven Container och sprack.
        // Vägen ut i biblioteket och tillbaka ger ett spel i nyskick varje gång.
        await B.nav.go('library')
        await vanta(500)
        await B.nav.go('game', { id: gid })
        await vanta(700)
        const g = B.game
        if (!g?._chute || g._chute.destroyed) return { fel: 'inget fall' }

        // Deterministiskt läge.
        // ⚠️ SÄTT INTE BARA FLAGGAN. Tyngden bor i luftvolymens last, och den byts av
        // `_setLast()` — spelet gör det i `_toggleWeight`. Sonden som bara satte
        // `_heavy = true` mätte därför en LÄTT last i båda armarna och rapporterade
        // "kvot 1,02×" på en fysik som i själva verket ger 1,67×.
        g._heavy = !!tung
        g._setLast?.()
        g._misses = 0 // ingen snäll assist — den skulle dra mot målet
        g._chute.position.set(640, 150)
        g._vx = 0
        const x0 = g._chute.x

        const prover = []
        const t0 = performance.now()
        while (performance.now() - t0 < 12000) {
          await new Promise((r) => requestAnimationFrame(r))
          if (!g._chute || g._chute.destroyed) break
          g._wind = vind // lås vinden (spelets bytartimer slumpar annars)
          g._windTimer = 0
          if (styr !== null) {
            g._steer.active = true
            g._steer.x = g._chute.x + styr
          }
          prover.push({ t: (performance.now() - t0) / 1000, x: g._chute.x, y: g._chute.y, vx: g._vx })
          if (g._resolving) break
        }
        if (styr !== null) g._steer.active = false

        const sluten = prover[prover.length - 1] || { t: 0, x: x0, y: 150, vx: 0 }
        // Fart nedåt över de sista 30 proverna = den fart fallet SLUTAR på.
        const svans = prover.slice(-30)
        const dy = svans.length > 1 ? (svans[svans.length - 1].y - svans[0].y) / (svans[svans.length - 1].t - svans[0].t) : 0
        // Hur snabbt farten nedåt etableras: tid tills 95 % av slutfarten.
        let t95 = 0
        for (let i = 4; i < prover.length; i++) {
          const v = (prover[i].y - prover[i - 4].y) / (prover[i].t - prover[i - 4].t)
          if (v >= dy * 0.95) {
            t95 = prover[i].t
            break
          }
        }
        // ⚠️ SLUTDRIFTEN ÄR OFTA MÄTTAD, INTE MÄTT. Banan har mjuka väggar på ±500 px
        // från mitten, och i vind når en lätt fallskärm dem långt före marken — då
        // rapporterar "drift" väggen, inte vinden, och två helt olika fysikmodeller får
        // samma siffra. Därför mäts driften också i ett fönster FÖRE väggen (1 s och
        // 2 s), och tiden då väggen först nåddes rapporteras som eget mått.
        const vid = (t) => prover.find((p) => p.t >= t) || sluten
        const vagg = prover.find((p) => p.x <= 141 || p.x >= 1139)
        // Farten i BÖRJAN av fallet. `t95` ensam kan inte se skillnad på "ingen
        // acceleration" och "startade redan nära gränsfarten" — men startfart mot
        // slutfart kan: är de lika finns ingen acceleration alls.
        const forsta = prover.slice(2, 14)
        const dyStart =
          forsta.length > 1 ? (forsta[forsta.length - 1].y - forsta[0].y) / (forsta[forsta.length - 1].t - forsta[0].t) : 0
        return {
          tid: +sluten.t.toFixed(2),
          fartStart: Math.round(dyStart), // px/s i början
          fartNer: Math.round(dy), // px/s
          t95: +t95.toFixed(2), // tid till 95 % av slutfarten = finns acceleration alls?
          drift: Math.round(sluten.x - x0), // px i sidled vid marken (kan vara mättad)
          drift1s: Math.round(vid(1).x - x0),
          drift2s: Math.round(vid(2).x - x0),
          vaggTid: vagg ? +vagg.t.toFixed(2) : null, // null = rörde aldrig väggen
          vxSlut: +sluten.vx.toFixed(2),
          hojd: Math.round(sluten.y),
          n: prover.length,
        }
      },
      { gid: ID, tung, vind, styr }
    )

  const R = {}
  log('\nFALLSKÄRMEN — fallets känsla i tal\n')

  log('1. Fritt fall utan vind (hur lång är resan ner?)')
  R.lattStilla = await fall({ tung: false, vind: 0 })
  R.tungStilla = await fall({ tung: true, vind: 0 })
  log(`   Lätt : ${R.lattStilla.tid} s · ${R.lattStilla.fartStart} → ${R.lattStilla.fartNer} px/s · 95 % efter ${R.lattStilla.t95} s`)
  log(`   Tung : ${R.tungStilla.tid} s · ${R.tungStilla.fartStart} → ${R.tungStilla.fartNer} px/s · 95 % efter ${R.tungStilla.t95} s`)
  log(`   kvot Tung/Lätt: ${(R.tungStilla.fartNer / Math.max(1, R.lattStilla.fartNer)).toFixed(2)}×`)

  const rad = (namn, r) =>
    log(
      `   ${namn.padEnd(6)}: drift 1 s ${String(r.drift1s).padStart(4)} px · 2 s ${String(r.drift2s).padStart(4)} px · ` +
        `vid marken ${String(r.drift).padStart(4)} px${r.vaggTid ? ` (väggen vid ${r.vaggTid} s — mättad)` : ''} · vx ${r.vxSlut}`
    )

  log('\n2. Samma fall med vind (hur hårt drar den — och biter Tung mindre?)')
  R.lattVind = await fall({ tung: false, vind: 0.25 })
  R.tungVind = await fall({ tung: true, vind: 0.25 })
  rad('Lätt', R.lattVind)
  rad('Tung', R.tungVind)
  log(`   Lätt driver ${(R.lattVind.drift1s / Math.max(1, R.tungVind.drift1s)).toFixed(2)}× så långt som Tung på 1 s`)

  log('\n3. Styrning mot stilla luft (hur snabbt biter barnets input?)')
  R.lattStyr = await fall({ tung: false, vind: 0, styr: 200 })
  R.tungStyr = await fall({ tung: true, vind: 0, styr: 200 })
  rad('Lätt', R.lattStyr)
  rad('Tung', R.tungStyr)

  log('\n4. Vind MOT styrning (kan barnet hålla emot?)')
  R.motvind = await fall({ tung: false, vind: 0.25, styr: -200 })
  rad('Lätt', R.motvind)
  log('   (negativ drift = barnet vann över vinden)')

  log(`\nkonsolfel: ${errors.length}${errors.length ? ' — ' + errors.slice(0, 2).join(' | ') : ''}`)
  R.fel = errors.length
  if (JSON_ONLY) console.log(JSON.stringify(R, null, 2))
  else console.log('\n(kör med --json för siffrorna i jämförbar form)\n')
} finally {
  await browser.close()
}
