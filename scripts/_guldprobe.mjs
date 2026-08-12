// `vandkort`: det gyllene kortet — sällsynthet, minnessäkerhet och belöning.
//
// Punkten kom ur `_stillaprobe`: `vandkort` var repots tydligaste TABLEAU — 48 noder rör
// sig under utdelningen och sedan **0** medan barnet studerar brädet.
//
// Två designregler bär idén, och båda mäts:
//   1. Bara ETT kort är gyllene, aldrig hela paret. Ett glittrande PAR hade kunnat matchas
//      på synintryck och minnesleken vore borta för just det paret.
//   2. Kortet skimrar UTAN att flytta sig. I ett minnesspel är kortets PLATS informationen
//      — ett kort som guppar flyttar barnets hållhake (och `hitArea` sitter på kortet).
//
//   node scripts/_guldprobe.mjs
import { chromium } from 'playwright'

const ID = 'vandkort'
const BRADEN = 120 // hur många bräden sällsyntheten mäts över
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })
  await page.waitForTimeout(1200)

  // --- 1–3. Sällsynthet och regler, över många bräden -----------------------
  const stat = await page.evaluate(({ n }) => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const ut = { niva0: { braden: 0, guld: 0 }, hogre: { braden: 0, guld: 0 }, mest: 0, guldPar: 0 }
    for (let i = 0; i < n; i++) {
      g._level = i % 5 // täck alla nivåer, inklusive 0
      g._build(ctx)
      const guld = (g._cards || []).filter((c) => c._gold)
      const hink = g._level === 0 ? ut.niva0 : ut.hogre
      hink.braden++
      if (guld.length) hink.guld++
      if (guld.length > ut.mest) ut.mest = guld.length
      // Är BÅDA korten i ett par gyllene? (skulle göra paret matchbart på synintryck)
      for (const c of guld) {
        const tvilling = (g._cards || []).find((o) => o !== c && o._symbol === c._symbol)
        if (tvilling && tvilling._gold) ut.guldPar++
      }
    }
    return ut
  }, { n: BRADEN })

  ok('1 aldrig mer an ETT gyllene kort', stat.mest <= 1, `mest ${stat.mest} per brade over ${BRADEN} braden`)
  ok('2 aldrig ett gyllene PAR', stat.guldPar === 0, `${stat.guldPar} bräden dar bada korten i ett par var gyllene`)
  ok('3 aldrig pa niva 0', stat.niva0.guld === 0, `${stat.niva0.guld} av ${stat.niva0.braden} niva-0-braden bar guld`)
  const andel = stat.hogre.braden ? stat.hogre.guld / stat.hogre.braden : 0
  ok('4 sallsynt men inte sallsynt-borta', andel > 0.25 && andel < 0.65,
    `${stat.hogre.guld} av ${stat.hogre.braden} braden pa niva 1+ = ${(andel * 100).toFixed(0)} %`)

  // --- 5. Skimrar utan att flytta sig ---------------------------------------
  const rorelse = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    let kort = null
    for (let i = 0; i < 60 && !kort; i++) {
      g._level = 2
      g._build(ctx)
      kort = (g._cards || []).find((c) => c._gold)
    }
    if (!kort) return { fel: 'hittade inget gyllene kort' }
    // Bygg-entrén (`bounceIn`) skalar kortet — vänta ut den, annars mäter vi den.
    await new Promise((r) => setTimeout(r, 1400))
    const prov = { kx: [], ky: [], bx: [], ringa: [] }
    const t0 = performance.now()
    while (performance.now() - t0 < 3000) {
      prov.kx.push(kort.x); prov.ky.push(kort.y)
      prov.bx.push(kort._goldBand ? kort._goldBand.x : 0)
      prov.ringa.push(kort._goldRim ? kort._goldRim.children[0].alpha : 0)
      await new Promise((r) => requestAnimationFrame(r))
    }
    const spann = (a) => Math.max(...a) - Math.min(...a)
    return {
      kort: +Math.max(spann(prov.kx), spann(prov.ky)).toFixed(2),
      band: +spann(prov.bx).toFixed(1),
      ring: +spann(prov.ringa).toFixed(2),
      fel: null,
    }
  })

  if (rorelse.fel) {
    ok('5 kortet star still', false, rorelse.fel + ' — RAKNAS SOM 0')
    ok('6 skimret rör sig', false, 'samma orsak')
  } else {
    ok('5 kortet star still', rorelse.kort < 0.01, `kortets egen rorelse ${rorelse.kort.toFixed(2)} px (krav 0,00)`)
    ok('6 skimret ror sig', rorelse.band > 100 && rorelse.ring > 0.3,
      `bandet ${rorelse.band} px over kortet, ringens alfa svanger ${rorelse.ring}`)
  }

  // Lämna en BILD på ett bräde med guld. Sviten fotar nivå 0, där guld aldrig finns —
  // utan den här bilden hade ingen kunnat titta på effekten själv.
  await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    for (let i = 0; i < 60; i++) {
      g._level = 2
      g._build(ctx)
      if ((g._cards || []).some((c) => c._gold)) break
    }
    await new Promise((r) => setTimeout(r, 1500))
  })
  await page.screenshot({ path: '.test-shots/_guld-vandkort.png' })

  // --- 7–8. Belöningen fyrar BARA på ett gyllene par -------------------------
  const bel = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const ctx = window.__barnspel.ctx
    const spar = []
    // HEAD saknar hela mekanismen. Ett kast här hade rivit sonden och gett "inget
    // resultat" i stället för en RÖD rad — en misslyckad mätning måste räknas som 0.
    if (typeof g._guldFirande !== 'function') {
      return { guld: { fel: 'spelet har ingen _guldFirande' }, vanlig: { fel: 'spelet har ingen _guldFirande' } }
    }
    const orig = g._guldFirande.bind(g)
    g._guldFirande = function (...a) { spar.push('guld'); return orig(...a) }

    const matcha = async (viljGuld) => {
      let a = null; let b = null
      for (let i = 0; i < 80 && !a; i++) {
        g._level = 2
        g._build(ctx)
        const kort = g._cards || []
        const guld = kort.find((c) => c._gold)
        if (viljGuld) {
          if (!guld) continue
          a = guld; b = kort.find((o) => o !== a && o._symbol === a._symbol)
        } else {
          a = kort.find((c) => !c._gold && kort.some((o) => o !== c && o._symbol === c._symbol && !o._gold))
          b = a ? kort.find((o) => o !== a && o._symbol === a._symbol) : null
        }
      }
      if (!a || !b) return { fel: 'hittade inget par' }
      await new Promise((r) => setTimeout(r, 300))
      const fore = spar.length
      let topp = 0
      // Gå spelets EGNA väg: `_flip` på första kortet, sedan på tvillingen. Att
      // anropa jämförelsen direkt hade hoppat över `_busy`-grinden och `_showFace`,
      // alltså mätt något annat än det barnet utlöser.
      g._busy = false
      g._first = null
      g._flip(ctx, a)
      g._flip(ctx, b)
      const t0 = performance.now()
      while (performance.now() - t0 < 1400) {
        topp = Math.max(topp, g._fx?.children.length || 0)
        await new Promise((r) => requestAnimationFrame(r))
      }
      return { firanden: spar.length - fore, topp, fel: null }
    }

    const guld = await matcha(true)
    const vanlig = await matcha(false)
    g._guldFirande = orig
    return { guld, vanlig }
  })

  if (bel.guld.fel || bel.vanlig.fel) {
    ok('7 firandet fyrar bara pa guld', false, `${bel.guld.fel || bel.vanlig.fel} — RAKNAS SOM 0`)
    ok('8 guldparet syns mer', false, 'samma orsak')
  } else {
    ok('7 firandet fyrar bara pa guld', bel.guld.firanden === 1 && bel.vanlig.firanden === 0,
      `guldpar ${bel.guld.firanden} firande, vanligt par ${bel.vanlig.firanden}`)
    ok('8 guldparet syns mer', bel.guld.topp > bel.vanlig.topp,
      `fx-noder som mest: guld ${bel.guld.topp} mot vanligt ${bel.vanlig.topp}`)
  }

  // --- 9. exit ---------------------------------------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  const kvar = await page.evaluate(() => {
    const g = window.__barnspel.game
    return (g?._cards || []).filter((c) => c._goldTween?.isActive?.()).length
  })
  ok('9 inget skimmer tickar efter exit', kvar === 0, `${kvar} levande guld-tweens`)
  ok('10 inga konsolfel', errors.length === 0, `${errors.length} fel${errors[0] ? ': ' + errors[0] : ''}`)

  console.log(`\n  ${ID} — det gyllene kortet\n`)
  for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn.padEnd(36)} ${r.text}`)
  const gronaN = rader.filter((r) => r.ok).length
  console.log(`\n  ${gronaN}/${rader.length}\n`)
  process.exitCode = gronaN === rader.length ? 0 : 1
} finally {
  await browser.close()
}
