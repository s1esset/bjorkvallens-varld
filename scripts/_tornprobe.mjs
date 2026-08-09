// Torn-sond: får varje klosstyp i knuffa-tornet sin egen RÖST — utan att materialet
// tunar om fysiken bakvägen?
//
//   node scripts/_tornprobe.mjs [nivå]      (default 4 = alla klosstyper i tornet)
//
// Två frågor, och den andra är den som kostar pengar om man gissar:
//   A) Talar sten, glas, gummi, trä och kronan med skilda tonhöjder?
//   B) Är klossarnas fysik EXAKT densamma som spelets egen KINDS-tabell säger?
//      `mat()` sprider materialets fysiktal och lägger spelets sist — men bara de tal
//      spelet FAKTISKT sätter. `frictionAir` sattes aldrig, så materialtabellens värde
//      (trä 0,012 · metall 0,006 · glas 0,005) hade smugit in en balansändring i ett
//      handtrimmat spel utan att ett enda test blivit rött.
import { chromium } from 'playwright'

const ID = 'knuffa-tornet'
const LVL = Number(process.argv[2] ?? 4)

// Spelets egen tabell (src/games/knuffa-tornet/index.js) + matters standard-frictionAir.
const KINDS = {
  normal: { dens: 1, rest: 0.06, fric: 0.4, fricS: 0.7, rost: 'tra' },
  sten: { dens: 2.2, rest: 0.02, fric: 0.8, fricS: 0.9, rost: 'sten' },
  studs: { dens: 0.7, rest: 0.72, fric: 0.3, fricS: 0.5, rost: 'gummi' },
  glas: { dens: 0.6, rest: 0.05, fric: 0.35, fricS: 0.6, rost: 'glas' },
  krona: { rost: 'metall' },
}
const LUFT = 0.01

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(
    ({ gid, lvl }) => {
      const s = window.__barnspel.save
      s.update((d) => {
        const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
        if (!p) return
        p.games = p.games || {}
        p.games[gid] = { ...(p.games[gid] || { unlocked: true, stars: 0, custom: {} }), highestLevel: lvl }
      })
      s.flush()
    },
    { gid: ID, lvl: LVL },
  )
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1000)

  const data = await page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    const { MATERIAL } = await import('/src/lib/physics.js')
    return {
      niva: g._level,
      klossar: (g._blocks || []).map((b) => ({
        kind: b.kind,
        mat: b.body.mat || null,
        ton: b.body.mat ? MATERIAL[b.body.mat].ton : null,
        rest: b.body.restitution,
        fric: b.body.friction,
        fricS: b.body.frictionStatic,
        luft: b.body.frictionAir,
        dens: b.body.density,
      })),
    }
  }, ID)

  console.log(`\n  Torn-sond — ${ID}, nivå ${data.niva} · ${data.klossar.length} klossar\n`)

  // A) Rösterna.
  const perTyp = new Map()
  for (const k of data.klossar) if (!perTyp.has(k.kind)) perTyp.set(k.kind, k)
  for (const [kind, k] of perTyp) {
    const vantad = KINDS[kind]?.rost
    console.log(`     ${kind.padEnd(7)} → ${String(k.mat).padEnd(7)} ${k.ton} Hz`)
    if (vantad) ok(`${kind} talar ${vantad}`, k.mat === vantad, k.mat === vantad ? '' : `fick ${k.mat}`)
  }
  const toner = [...new Set([...perTyp.values()].map((k) => k.ton))]
  ok('minst tre skilda tonhöjder i tornet', toner.length >= 3, toner.sort((a, b) => a - b).join(' · ') + ' Hz')

  // B) Fysiken oförändrad — det materialet ALDRIG får röra.
  let avvik = 0
  for (const k of data.klossar) {
    const t = KINDS[k.kind]
    if (!t || k.kind === 'krona') continue
    if (Math.abs(k.rest - t.rest) > 1e-9) avvik++
    if (Math.abs(k.fric - t.fric) > 1e-9) avvik++
    if (Math.abs(k.fricS - t.fricS) > 1e-9) avvik++
    if (Math.abs(k.luft - LUFT) > 1e-9) avvik++
  }
  ok('varje kloss bär spelets EGNA fysiktal', avvik === 0, `${avvik} avvikelser över ${data.klossar.length} klossar`)
  ok('luftmotståndet är matters standard, inte materialets', data.klossar.every((k) => Math.abs(k.luft - LUFT) < 1e-9), `${LUFT}`)

  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
  ok('0 sidfel', errors.length === 0, errors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}
console.log(fel === 0 ? '\n  ALLT GRÖNT\n' : `\n  ${fel} FEL\n`)
process.exit(fel ? 1 : 0)
