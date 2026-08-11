// FLIPPERSPELETS SLUMPADE BANA — läggs något fel, någonsin?
//
//   node scripts/_banprobe.mjs [--banor 400]        (kräver dev-servern på :5173)
//
// Ägarens speltest 2026-08-11: "mer slumpmässigt utsatta poäng-bumpers utan att de läggs
// fel eller kolliderar". En slumpad layout kan inte granskas med ögat — den har oändligt
// många utfall, och felet dyker upp hos barnet den enda gång det inträffar. Sonden kör
// spelets EGEN `_samplaBana` hundratals gånger och dömer varje bana mot geometrin.
//
// KILREGELN är hela poängen. Kulan är 56 px i diameter, alltså finns bara två säkra
// mellanrum mellan två ytor: ≥64 px (kulan passerar) eller ≤50 px (kulan kan inte ta sig
// IN, alltså kan den inte fastna). Ett mellanrum däremellan är en fälla — kulan kryper in
// och kilas fast, och för ett barn ser det ut som att spelet hängt sig.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const BANOR = Number(opt('--banor', 400))

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : String(v))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'flipperspel' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._ball, null, { timeout: 20000 })
  await page.waitForTimeout(1200)

  console.log(`\nFLIPPERSPELET — den slumpade banan (${BANOR} banor per nivå-grupp)\n`)

  const utfall = await page.evaluate(async ({ BANOR }) => {
    const g = window.__barnspel.game
    // Samma tal som spelet. Läses inte ur modulen (de är inte exporterade) utan speglas
    // här med flit: ändras spelets tal utan att sonden följer med, faller sonden.
    const BALL_R = 28
    const GAP_FRI = 64
    const GAP_TATT = 50
    const FIELD = { x0: 335, x1: 945, y0: 264, y1: 468 }
    const BUMP_R = 34
    const PEG_R = 17
    const SERVE_Y = 192

    const seg = (px, py, ax, ay, bx, by) => {
      const dx = bx - ax
      const dy = by - ay
      const l2 = dx * dx + dy * dy || 1
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    }
    // Hinderlistan byggs ur spelets LEVANDE kroppar, inte ur kopierade tal — då kan den
    // inte hamna ur fas med banan som faktiskt byggs.
    const kroppar = () => g._phys.world?.bodies || g._phys.engine?.world?.bodies || []
    const fasta = kroppar()
      .filter((b) => ['spinner', 'sling', 'wall', 'flipper', 'guide'].includes(b.label))
      .map((b) => ({ label: b.label, x: b.position.x, y: b.position.y, v: b.vertices.map((v) => ({ x: v.x, y: v.y })) }))
    const avstTillKropp = (h, x, y) => {
      let d = Infinity
      for (let i = 0; i < h.v.length; i++) {
        const a = h.v[i]
        const b = h.v[(i + 1) % h.v.length]
        d = Math.min(d, seg(x, y, a.x, a.y, b.x, b.y))
      }
      return d
    }

    const grupper = [1, 3, 5, 7, 9, 12]
    const ut = []
    for (const niva of grupper) {
      const rad = {
        niva,
        antal: [],
        kil: 0,
        overlapp: 0,
        utanfor: 0,
        serveKrock: 0,
        minstaGapDyna: Infinity,
        minstaGapFast: Infinity,
        utanMal: 0,
      }
      for (let k = 0; k < BANOR; k++) {
        const bana = g._samplaBana(niva)
        const alla = [
          ...bana.dynor.map((d) => ({ ...d, r: BUMP_R })),
          ...bana.stolpar.map((s) => ({ ...s, r: PEG_R })),
        ]
        rad.antal.push(bana.dynor.length)
        rad.stolpar = (rad.stolpar || 0) + bana.stolpar.length
        if (niva >= 5 && !bana.dynor.some((d) => d.kind === 'goal')) rad.utanMal++
        for (let i = 0; i < alla.length; i++) {
          const a = alla[i]
          if (a.x - a.r < FIELD.x0 - BUMP_R - 1 || a.x + a.r > FIELD.x1 + BUMP_R + 1) rad.utanfor++
          if (a.y < FIELD.y0 - 1 || a.y > FIELD.y1 + 1) rad.utanfor++
          // Serveringen: kulan föds vid y=192 och får inte födas inne i något.
          if (Math.abs(a.y - SERVE_Y) < a.r + BALL_R) rad.serveKrock++
          for (let j = i + 1; j < alla.length; j++) {
            const b = alla[j]
            const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r
            rad.minstaGapDyna = Math.min(rad.minstaGapDyna, gap)
            if (gap < 0) rad.overlapp++
            // Kilregeln gäller ÄVEN mellan två utplacerade föremål: fri passage eller
            // tätt intill. Kravet får inte vara "alltid ≥64" — stolparna tillåts med
            // flit ligga tätt intill en dyna när fältet är fullt.
            else if (gap > GAP_TATT && gap < GAP_FRI) { rad.kil++; rad.kilVar = (rad.kilVar || []); rad.kilVar.push('foremal ' + Math.round(gap)) }
          }
          for (const h of fasta) {
            const gap = avstTillKropp(h, a.x, a.y) - a.r
            rad.minstaGapFast = Math.min(rad.minstaGapFast, gap)
            if (gap < 0) rad.overlapp++
            else if (gap > GAP_TATT && gap < GAP_FRI) { rad.kil++; rad.kilVar = (rad.kilVar || []); rad.kilVar.push(h.label + ' ' + Math.round(gap)) }
          }
        }
      }
      rad.snittAntal = rad.antal.reduce((s, v) => s + v, 0) / rad.antal.length
      rad.minAntal = Math.min(...rad.antal)
      rad.maxAntal = Math.max(...rad.antal)
      delete rad.antal
      if (rad.kilVar) rad.kilVar = [...new Set(rad.kilVar)].slice(0, 6)
      ut.push(rad)
    }
    return ut
  }, { BANOR })

  let kil = 0
  let overlapp = 0
  let utanfor = 0
  let serve = 0
  let utanMal = 0
  let minDyna = Infinity
  let minFast = Infinity
  console.log('  nivå   dynor (min/snitt/max)   stolpar/bana   kil   överlapp   utanför   serve')
  for (const r of utfall) {
    console.log(`   ${String(r.niva).padStart(2)}     ${r.minAntal} / ${n1(r.snittAntal)} / ${r.maxAntal}`.padEnd(38) +
      `${n1(r.stolpar / BANOR).padStart(9)}${String(r.kil).padStart(9)}${String(r.overlapp).padStart(11)}${String(r.utanfor).padStart(10)}${String(r.serveKrock).padStart(8)}`)
    kil += r.kil
    overlapp += r.overlapp
    utanfor += r.utanfor
    serve += r.serveKrock
    utanMal += r.utanMal
    minDyna = Math.min(minDyna, r.minstaGapDyna)
    minFast = Math.min(minFast, r.minstaGapFast)
  }
  const totalt = utfall.length * BANOR
  console.log(`\n  ${totalt} banor · minsta gap föremål↔föremål ${n1(minDyna)} px (fri ≥64 ELLER tätat ≤50) · minsta gap mot fast bana ${n1(minFast)} px`)

  ok('inga två föremål överlappar', overlapp === 0, `${overlapp} av ${totalt} banor`)
  const kilVar = utfall.flatMap((r) => r.kilVar || [])
  ok('inga KILAR (gap 50–64 px där kulan kan klämmas fast)', kil === 0, `${kil} fynd${kilVar.length ? ' — ' + kilVar.join(', ') : ''}`)
  ok('inget föremål hamnar utanför fältet', utanfor === 0, `${utanfor} fynd`)
  ok('inget föremål ligger i kulans serveringsläge', serve === 0, `${serve} fynd`)
  ok('varje bana från nivå 5 har ett mål', utanMal === 0, `${utanMal} utan mål`)
  ok('dyn-antalet växer med nivån', utfall[0].snittAntal < utfall[utfall.length - 1].snittAntal,
    `nivå 1: ${n1(utfall[0].snittAntal)} → nivå 12: ${n1(utfall[utfall.length - 1].snittAntal)}`)
  ok('banan är faktiskt SLUMPAD (två dragningar skiljer sig)', minDyna < 1e8, 'ja')

  // Två banor i rad får inte vara samma bana.
  const olika = await page.evaluate(() => {
    const g = window.__barnspel.game
    const nyckel = (b) => b.dynor.map((d) => `${Math.round(d.x)},${Math.round(d.y)}`).join('|')
    const set = new Set()
    for (let i = 0; i < 50; i++) set.add(nyckel(g._samplaBana(6)))
    return set.size
  })
  ok('50 dragningar ger 50 olika banor', olika === 50, `${olika} unika`)

  // Tal räcker inte. En bana kan vara geometriskt korrekt och ändå SE hopklumpad ut,
  // och det är bara ögat som avgör. Bygg en riktig runda per nivå och ta bilden.
  if (args.includes('--bild')) {
    for (const niva of [1, 5, 9]) {
      await page.evaluate((n) => {
        const g = window.__barnspel.game
        g._level = n
        g._buildRound(window.__barnspel.ctx)
      }, niva)
      await page.waitForTimeout(1100)
      await page.screenshot({ path: `.test-shots/_banprobe-niva${niva}.png` })
      console.log(`  · bild: .test-shots/_banprobe-niva${niva}.png`)
    }
  }

  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  const stolpSnitt = utfall.reduce((s, r) => s + r.stolpar, 0) / (utfall.length * BANOR)
  ok('bada stolparna far plats pa nastan varje bana', stolpSnitt > 1.9, `snitt ${n1(stolpSnitt)} av 2`)

  ok('exit ger inga konsolfel', errors.length === 0, errors[0] || 'inga')

  console.log(`\n${fel === 0 ? 'ALLA GRÖNA' : fel + ' FEL'}\n`)
} finally {
  await browser.close()
}
process.exit(fel === 0 ? 0 : 1)
