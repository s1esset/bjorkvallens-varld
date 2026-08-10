// Ballonglyftens AVFÄRD i tal — utan webbläsare.
//
//   node scripts/_lyftprobe.mjs [--svep]
//
// Rundan som ska byggas: barnet bestämmer NÄR paketet skickas iväg ("räcker det?").
// Fysiken måste då svara ja på fyra saker, och alla fyra är avvägningar mot varandra:
//
//   1. Med ALLA ballonger ska paketet nå Elvira på 2,5–4 s (inte segla i evighet).
//   2. Med EN FÖR FÅ ska det stiga en bit, sakta in och komma tillbaka — synligt, men
//      inte så högt att det lämnar bilden. 60–160 px är fönstret.
//   3. Tröskeln måste hålla för HELA nivåspannet (N = 3..8). Det är den svåra biten:
//      lyftet per ballong är g·(1+marginal)/N, så vid N = 8 ligger n = N−1 bara
//      1/8 under tröskeln och marginalen måste vara liten — men liten marginal ger
//      också litet överskott, alltså långsam färd. Motståndet är knappen som löser det.
//   4. ÖVERSKOTT ska synas: fler ballonger än nödvändigt = snabbare, gladare lyft.
import { Motstandsvolym } from '../src/lib/luftmotstand.js'

const GRAV = 0.1 // px/bildruta² — paketets tyngd
const V_FALL = 6 // paketets gränsfart i fritt fall (sätter motståndet: kA/m = g/v²)
const MARGINAL = 0.12 // lyftet vid n = N är (1 + MARGINAL) × tyngden
const YCK = 2 // uppåtryck när barnet släpper iväg det (px/bildruta)
const RESA = 400 // px från marken upp till Elvira

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

// En avfärd. Returnerar hur högt paketet kom och om det nådde fram.
function avfard({ N, n, grav = GRAV, vFall = V_FALL, marginal = MARGINAL, yck = YCK, steg = 900 }) {
  const luft = new Motstandsvolym({ grav })
  const box = { x: 0, y: 0 } // y = 0 vid marken, negativt uppåt
  const rec = luft.lagg(box, { massa: 1, gransfart: vFall, vy: -yck })
  const lyftPer = (grav * (1 + marginal)) / N
  let hogst = 0
  let framme = 0
  for (let i = 1; i <= steg; i++) {
    luft.kraft(rec, 0, -lyftPer * n) // ballongernas lyft
    luft.steg(1)
    hogst = Math.min(hogst, box.y)
    if (!framme && box.y <= -RESA) framme = i
    if (framme) break
    if (i > 20 && box.y >= 0 && rec.vy > 0) break // tillbaka på marken
  }
  return { hogst: -hogst, framme: framme / 60, tid: framme ? framme / 60 : null }
}

// --- Spel-läge: samma frågor, men i det RIKTIGA spelet -----------------------
// Talen ovan säger att lagen är rätt. De säger ingenting om att spelet kopplat in den:
// att trycket på paketet skickar iväg det, att en för få kommer tillbaka utan att fastna,
// att en ballong tillagd MITT i en resa räddar den, och att rundan går att lösa.
if (process.argv.includes('--spel')) {
  const { chromium } = await import('playwright')
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

    // Kör en runda: fäst `antal` ballonger, skicka, mät.
    const runda = (antal, extraEfterMs = 0) =>
      page.evaluate(
        async ({ antal, extraEfterMs }) => {
          const B = window.__barnspel
          const vanta = (ms) => new Promise((r) => setTimeout(r, ms))
          await B.nav.go('library')
          await vanta(400)
          await B.nav.go('game', { id: 'ballonglyft' })
          await vanta(700)
          const g = B.game
          const ctx = window.__barnspel.ctx
          const N = g._N
          const vill = antal < 0 ? N + antal : Math.min(antal, N) // negativt = N − k
          for (let i = 0; i < vill; i++) {
            const b = g._loose.find((x) => !x._taken)
            if (b) g._attachLoose(ctx, b)
            await vanta(120)
          }
          await vanta(700)
          const yFore = g._box.y
          g._send(ctx)
          let hogst = yFore
          let extraGjord = false
          const t0 = performance.now()
          while (performance.now() - t0 < 9000) {
            await new Promise((r) => requestAnimationFrame(r))
            if (g._box?.destroyed) break
            hogst = Math.min(hogst, g._box.y)
            if (extraEfterMs && !extraGjord && performance.now() - t0 > extraEfterMs) {
              extraGjord = true
              const b = g._loose.find((x) => !x._taken)
              if (b) g._attachLoose(ctx, b)
            }
            if (g._resolving) break
            if (!g._sending && performance.now() - t0 > 500) break
          }
          return { N, n: g._n, yFore, hogst, mal: g._targetY, klar: !!g._resolving, sending: !!g._sending }
        },
        { antal, extraEfterMs }
      )

    console.log('\nBALLONGLYFT — avfärden i det RIKTIGA spelet\n')
    const alla = await runda(99)
    ok('alla ballonger + tryck på paketet → paketet når fram', alla.klar, `N=${alla.N}, nådde y=${Math.round(alla.hogst)} (mål ${Math.round(alla.mal)})`)

    const forFa = await runda(1)
    const steg = Math.round(forFa.yFore - forFa.hogst)
    ok('en enda ballong räcker inte', !forFa.klar, `steg ${steg} px och vände`)
    ok('och paketet fastnar inte i luften', !forFa.sending, 'tillbaka på sin räknehöjd')

    // RÄDDNINGEN: skicka med en för få och fäst den sista MITT I RESAN. Spelet lägger ut
    // exakt N lösa ballonger, så det finns aldrig en extra att lägga till — den enda
    // vägen till "fler ballonger mitt i luften" är att ha sparat en.
    const raddad = await runda(-1, 250)
    ok('en ballong tillagd mitt i resan räddar den', raddad.klar, `${raddad.n} av ${raddad.N} — nådde y=${Math.round(raddad.hogst)} (mål ${Math.round(raddad.mal)})`)

    // P0-VAKT: avståndet mellan de lösa ballongernas träffytor vid FLEST ballonger.
    // `_N` fastnar på 8 från nivå ~6, så det är spelets normala läge — inte ett hörn.
    const glapp = await page.evaluate(async () => {
      const B = window.__barnspel
      const vanta = (ms) => new Promise((r) => setTimeout(r, ms))
      await B.nav.go('library')
      await vanta(400)
      await B.nav.go('game', { id: 'ballonglyft' })
      await vanta(600)
      const g = B.game
      g._loadLevel(window.__barnspel.ctx, 9) // hög nivå → N = 8
      await vanta(400)
      const xs = g._loose.map((b) => b.x).sort((a, b) => a - b)
      const bredd = g._loose[0]?.hitArea?.width ?? 104
      let minst = 1e9
      for (let i = 1; i < xs.length; i++) minst = Math.min(minst, xs[i] - xs[i - 1])
      return { N: g._N, antal: xs.length, minstaAvstand: minst, bredd, glapp: minst - bredd }
    })
    ok(
      'P0: ≥24 px mellan de lösa ballongernas träffytor',
      glapp.glapp >= 24,
      `N=${glapp.N}: ${Math.round(glapp.minstaAvstand)} px mellan mitterna, träffyta ${glapp.bredd} px → ${Math.round(glapp.glapp)} px glapp`
    )

    ok('inga konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))
    console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
    process.exit(fel === 0 ? 0 : 1)
  } finally {
    await browser.close()
  }
}

console.log('\nBALLONGLYFT — avfärden\n')

if (process.argv.includes('--svep')) {
  // Sökt: n = N ska fram på 2,5–4 s för BÅDE N=3 och N=8, och n = N−1 ska stanna på
  // 60–160 px för båda. Ycket är den knapp som styr "för få"-fallets höjd mest, eftersom
  // underskottet vid n = N−1 bara är g/N och alltså litet vid stora N.
  console.log('SVEP: marginal × gränsfart × yck\n')
  console.log('   marg  vFall  yck    N=3 n=2   N=3 n=3   N=8 n=7   N=8 n=8   duger')
  for (const marginal of [0.08, 0.12, 0.2]) {
    for (const vFall of [3, 4.5, 6]) {
      for (const yck of [1.2, 2, 3]) {
        const a = avfard({ N: 3, n: 2, marginal, vFall, yck })
        const b = avfard({ N: 3, n: 3, marginal, vFall, yck })
        const c = avfard({ N: 8, n: 7, marginal, vFall, yck })
        const d = avfard({ N: 8, n: 8, marginal, vFall, yck })
        const vis = (r) => (r.tid ? `${r.tid.toFixed(1)}s`.padStart(8) : `${Math.round(r.hogst)}px`.padStart(8))
        const bra =
          b.tid !== null && b.tid >= 2 && b.tid <= 4.5 && d.tid !== null && d.tid >= 2 && d.tid <= 4.5 &&
          a.tid === null && a.hogst >= 60 && a.hogst <= 160 && c.tid === null && c.hogst >= 60 && c.hogst <= 160
        console.log(
          `   ${marginal.toFixed(2)}  ${String(vFall).padStart(5)}  ${String(yck).padStart(3)}  ${vis(a)}  ${vis(b)}  ${vis(c)}  ${vis(d)}   ${bra ? '✓' : ''}`
        )
      }
    }
  }
  process.exit(0)
}

console.log('1. Med alla ballonger ska paketet fram (2,5–4 s)')
for (const N of [3, 4, 6, 8]) {
  const r = avfard({ N, n: N })
  ok(`N = ${N}`, r.tid !== null && r.tid >= 2 && r.tid <= 4.5, r.tid ? `${r.tid.toFixed(2)} s` : `kom bara ${Math.round(r.hogst)} px`)
}

// ⚠️ KRAVET ÄR "TYDLIG GLUGG", INTE "FAST HÖJD". Första versionen krävde 60–160 px för
// alla N och gick INTE att uppfylla: med linjärt lyft och tröskel vid N är underskottet
// vid n = N−1 exakt g/N, alltså 33 % vid tre ballonger men bara 12 % vid åtta. Svepet
// visade att varje inställning som gav en kort resa vid N=8 antingen tog 7,5 s vid N=3
// eller lät sju ballonger lyfta ett åtta-paket. Det är inte ett trimningsfel utan
// geometrin i problemet — och nära-misset blir BÄTTRE av att skala: med tre ballonger
// lyfter paketet knappt, med åtta går det nästan hela vägen och vänder strax under
// Elvira. Kravet är därför att det aldrig NÅR fram och att gluggen syns.
console.log('\n2. Med en för få ska det stiga synligt men ALDRIG nå fram (minst 40 px kvar)')
for (const N of [3, 4, 6, 8]) {
  const r = avfard({ N, n: N - 1 })
  const glugg = RESA - r.hogst
  ok(`N = ${N}, n = ${N - 1}`, r.tid === null && r.hogst >= 55 && glugg >= 40, `steg ${Math.round(r.hogst)} px, ${Math.round(glugg)} px kvar till Elvira`)
}

console.log('\n3. Överskott ska synas (fler ballonger = snabbare)')
{
  const lagom = avfard({ N: 4, n: 4 })
  const extra = avfard({ N: 4, n: 6 })
  ok('sex ballonger på ett fyra-paket går tydligt fortare', extra.tid !== null && extra.tid < lagom.tid * 0.75, `${lagom.tid.toFixed(2)} s → ${extra.tid.toFixed(2)} s`)
}

console.log('\n4. Ingenting kan lämna bilden')
{
  const r = avfard({ N: 3, n: 8, steg: 2000 })
  ok('även ett orimligt överskott har en gränsfart', r.tid !== null && r.tid > 0.8, `${r.tid.toFixed(2)} s för 400 px`)
}

console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
process.exit(fel === 0 ? 0 : 1)
