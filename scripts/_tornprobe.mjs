// Mäter knuffa-tornets NIVÅER genom att faktiskt spela dem: sonden bygger varje
// tornform, kontrollerar att den STÅR KVAR vid start (en form som rasar av sig själv
// ser inte trasig ut i ett grönt test) och svingar sedan kulan med full kraft, sving
// efter sving, tills tornet ligger nere.
//
// Rapporterar per nivå: form, antal klossar, specialklossar, ras vid start, antal
// svingar till klart, och om hjälpen behövde bjuda in.
//
//   node scripts/_tornprobe.mjs [antal-nivåer] [--shots]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const levels = Number(args[0] || 5)
const fromIdx = args.indexOf('--from')
const from = fromIdx >= 0 ? Number(args[fromIdx + 1]) : 0
const wantShots = args.includes('--shots')
const wantExit = args.includes('--exit')
const ID = 'knuffa-tornet'
const MAX_SWINGS = 10

mkdirSync('.test-shots', { recursive: true })

const state = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('knuffa-tornet')
    return {
      level: g._level,
      phase: g._phase,
      total: g._total,
      cleared: g._cleared,
      misses: g._misses,
      invited: !!g._invited,
      won: g._won,
      kinds: g._blocks.map((b) => b.kind),
      // Position per kloss: hur långt den drivit från sitt spawn-läge (ras vid start).
      pos: g._blocks.map((b) => ({ x: Math.round(b.body.position.x), y: Math.round(b.body.position.y), c: b.cleared })),
      ball: { x: Math.round(g._ballView.x), y: Math.round(g._ballView.y) },
      cocked: (() => {
        const c = { x: g._pivot.x - g._ropeLen * Math.sin(1.5), y: g._pivot.y + g._ropeLen * Math.cos(1.5) }
        return { x: Math.round(c.x), y: Math.round(c.y) }
      })(),
    }
  })

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
  await page.waitForTimeout(1200)

  console.log(`\n  Nivåsond för ${ID} — ${levels} nivåer, full kraft per sving\n`)

  for (let lvl = from; lvl < from + levels; lvl++) {
    // Sätt nivån i spardatan och montera om spelet (samma väg som ett barn som
    // spelat sig hit).
    await page.evaluate(({ gid, lvl }) => {
      const s = window.__barnspel.save
      s.update((d) => {
        const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
        if (!p) return
        p.games = p.games || {}
        p.games[gid] = { ...(p.games[gid] || { unlocked: true, stars: 0, custom: {} }), highestLevel: lvl }
      })
      s.flush()
    }, { gid: ID, lvl })
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(350)
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1600)

    const s0 = await state(page)
    const spawn = s0.pos.map((p) => ({ ...p }))
    if (wantShots) await page.screenshot({ path: `.test-shots/_torn-${lvl}.png` })

    // Ras vid start: någon kloss som redan räknats som nere, eller drivit i sidled.
    await page.waitForTimeout(900)
    const s1 = await state(page)
    const drift = Math.max(...s1.pos.map((p, i) => Math.abs(p.x - spawn[i].x)))
    const rasade = s1.cleared

    let swings = 0
    let invited = false
    let raddad = false
    let s = s1
    while (swings < MAX_SWINGS && !s.won && s.cleared < s.total) {
      if (s.phase !== 'aim') { await page.waitForTimeout(300); s = await state(page); continue }
      // Greppa kulan där den hänger, dra upp till full spänning, släpp.
      await page.mouse.move(s.ball.x, s.ball.y)
      await page.mouse.down()
      await page.mouse.move((s.ball.x + s.cocked.x) / 2, (s.ball.y + s.cocked.y) / 2, { steps: 6 })
      await page.mouse.move(s.cocked.x, s.cocked.y, { steps: 6 })
      await page.mouse.up()
      swings++
      // Vänta ut svinget (max 6 s).
      for (let i = 0; i < 24; i++) {
        await page.waitForTimeout(250)
        s = await state(page)
        if (s.phase === 'assist') raddad = true
        if (s.won || s.phase === 'aim') break
      }
      if (s.invited) invited = true
      s = await state(page)
      if (process.env.TRACE) {
        const kvar = s.pos.map((p, i) => (p.c ? null : `${s.kinds[i]}@${p.x},${p.y}`)).filter(Boolean)
        console.log(`      sving ${swings}: ${s.cleared}/${s.total} nere · missar ${s.misses} · fas ${s.phase} · kvar ${kvar.join(' ')}`)
      }
      // Finishen (dammoln → flagga → jubel) syns bara ~1 s efter vinsten.
      if (s.won && wantShots) {
        await page.waitForTimeout(1000)
        await page.screenshot({ path: `.test-shots/_torn-${lvl}-finish.png` })
      }
      // Exit-säkerhet: lämna spelet MITT i finishen (fördröjda steg + flagg-tween lever
      // då fortfarande). Harnessens standardcykel hamnar aldrig här.
      if (s.won && wantExit) {
        await page.waitForTimeout(500)
        await page.evaluate(() => window.__barnspel.nav.go('library'))
        await page.waitForTimeout(1400)
        const fynd = await page.evaluate(() => (window.__gamelog ? window.__gamelog.summary().fynd : []))
        const illa = fynd.filter((f) => f.niva === 'fel')
        console.log(`      exit mitt i finishen: ${illa.length ? '✗ ' + illa.map((f) => f.kod).join(', ') : '✓ inga fel-fynd'}`)
        await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
        await page.waitForTimeout(1200)
      }
    }

    if (process.env.TRACE) {
      const sagt = await page.evaluate(() => (window.__gamelog ? [...new Set(window.__gamelog.dump('rost').map((e) => e.d?.text))] : []))
      console.log(`      sagt: ${sagt.join(' | ')}`)
    }
    const kinds = s0.kinds.reduce((a, k) => ((a[k] = (a[k] || 0) + 1), a), {})
    const utfall = s.won || s.cleared >= s.total ? `klar på ${swings} sving` : `EJ KLAR på ${MAX_SWINGS} svingar (${s.cleared}/${s.total})`
    console.log(
      `  nivå ${lvl}  ${String(s0.total).padStart(2)} klossar  ${Object.entries(kinds).map(([k, n]) => `${k}×${n}`).join(' ')}`,
    )
    console.log(`           start: ras ${rasade}, sidodrift ${drift} px  ·  ${utfall}${invited ? '  · hjälpen bjöd in' : ''}${raddad ? '  · GARANTIN knuffade ner resten' : ''}`)
  }

  console.log(`\n  ${errors.length ? '✗ ' + errors.length + ' konsolfel:' : '✓ 0 konsolfel'}`)
  for (const e of errors.slice(0, 6)) console.log('    ' + e)
  console.log('')
} finally {
  await browser.close()
}
