// `vad-forsvann`: lever sakerna på hyllan, och lever BARA de?
//
// `_livprobe` svarar på den generella frågan (antal · amplitud · fasspridning · exit).
// Den här sonden mäter de fyra sakerna den inte kan se, och som alla tre är fällor
// som slagit till i det här repot förut:
//
//   1. TRÄFFYTAN STÅR STILL. Vilorörelsen får inte ligga på noden som bär `hitArea`
//      (P0 + `sortera-skrap`s `snal-snappyta`). Slotens egen y ska vara 0,0 px rörelse.
//   2. KONTAKTSKUGGAN + PLATSHÅLLAREN STÅR STILL. De hör till hyllan, inte till saken.
//   3. LUCKAN GUPPAR INTE. När en sak är borta ska hålet vara ett hål — inte en
//      osynlig sak som fortsätter andas.
//   4. KARAKTÄR: motiven guppar OLIKA mycket. Alla lika = en pulserande yta.
//
// Mätningen läser transformer direkt varje bildruta (ingen bild, inget fxLayer) — det
// undviker hela familjen "grönt pixeltal som mäter något annat".
//
//   node scripts/_hyllprobe2.mjs
import { chromium } from 'playwright'

const ID = 'vad-forsvann'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

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
  await page.waitForTimeout(2200) // studs-in klar

  // --- svep 1: visa-fasen. Läs varje slots transformer i ~3,5 s. -------------
  const svep = async (ms) => page.evaluate(async (dur) => {
    const g = window.__barnspel.game
    const slots = g?._slots || []
    const prov = slots.map((s) => ({
      motif: s._motif,
      slotY: [], slotX: [],
      livY: [], livRot: [],
      skuggaY: [], hallY: [],
      isGap: !!s._isGap,
    }))
    const t0 = performance.now()
    while (performance.now() - t0 < dur) {
      slots.forEach((s, i) => {
        const p = prov[i]
        p.slotY.push(s.y); p.slotX.push(s.x)
        const l = s._livLager
        p.livY.push(l ? l.y : 0)
        p.livRot.push(l ? l.rotation : 0)
        const skugga = s.children?.[0]
        p.skuggaY.push(skugga ? skugga.y : 0)
        p.hallY.push(s._placeholder ? s._placeholder.y : 0)
      })
      await new Promise((r) => requestAnimationFrame(r))
    }
    const spann = (a) => (a.length ? Math.max(...a) - Math.min(...a) : 0)
    return prov.map((p) => ({
      motif: p.motif,
      isGap: p.isGap,
      slot: +Math.max(spann(p.slotY), spann(p.slotX)).toFixed(2),
      liv: +spann(p.livY).toFixed(2),
      rot: +spann(p.livRot).toFixed(4),
      skugga: +spann(p.skuggaY).toFixed(2),
      hall: +spann(p.hallY).toFixed(2),
    }))
  }, ms)

  const visa = await svep(3600)

  const antalLevande = visa.filter((p) => p.liv > 0.5).length
  ok('1 alla saker lever', antalLevande === visa.length && visa.length >= 3,
    `${antalLevande} av ${visa.length} slots guppar`)

  const varstSlot = Math.max(0, ...visa.map((p) => p.slot))
  ok('2 traffytan star still', varstSlot < 0.01,
    `slotens egen rorelse ${varstSlot.toFixed(2)} px (krav 0,00)`)

  const varstSkugga = Math.max(0, ...visa.map((p) => p.skugga))
  const varstHall = Math.max(0, ...visa.map((p) => p.hall))
  ok('3 skugga + platshallare star still', varstSkugga < 0.01 && varstHall < 0.01,
    `skugga ${varstSkugga.toFixed(2)} px, platshallare ${varstHall.toFixed(2)} px`)

  const amp = visa.map((p) => p.liv)
  const spridning = amp.length > 1 ? Math.max(...amp) - Math.min(...amp) : 0
  ok('4 karaktar: olika mycket', spridning > 0.8,
    `amplituder ${amp.map((a) => a.toFixed(1)).join(' / ')} px -> spridning ${spridning.toFixed(1)} px`)

  const rot = visa.map((p) => p.rot)
  ok('5 vaggning finns', Math.max(0, ...rot) > 0.01,
    `rotation ${rot.map((r) => r.toFixed(3)).join(' / ')} rad`)

  // --- svep 2: gom sakerna, vanta ut filten, mat luckan. ---------------------
  await page.evaluate(() => {
    const g = window.__barnspel.game
    g._hide(window.__barnspel.ctx)
  }).catch(() => {})
  // Fallback: tryck pa knappen om _hide behovde en ctx vi inte har.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    if (g?._phase === 'show' && g?._button) g._button.emit('pointertap', { global: { x: 640, y: 650 } })
  }).catch(() => {})
  await page.waitForTimeout(4200) // filt in + byte + filt ut

  const fas = await page.evaluate(() => window.__barnspel.game?._phase)
  const luckor = await page.evaluate(() => (window.__barnspel.game?._slots || []).filter((s) => s._isGap).length)

  if (fas === 'answer' && luckor === 1) {
    const efter = await svep(2600)
    const lucka = efter.find((p) => p.isGap)
    ok('6 luckan guppar inte', lucka && lucka.liv < 0.01,
      `luckans liv-lager ${lucka ? lucka.liv.toFixed(2) : '—'} px (krav 0,00)`)
    const kvar = efter.filter((p) => !p.isGap && p.liv > 0.5).length
    ok('7 resten lever vidare', kvar === efter.length - 1,
      `${kvar} av ${efter.length - 1} kvarvarande saker guppar`)
  } else {
    ok('6 luckan guppar inte', false, `kom aldrig till svarsfasen (fas=${fas}, luckor=${luckor}) — RAKNAS SOM 0`)
    ok('7 resten lever vidare', false, 'samma orsak')
  }

  // --- exit ------------------------------------------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  const kvarlevande = await page.evaluate(() => {
    let n = 0
    const gata = (nod) => {
      if (!nod || nod.destroyed) return
      if (nod._fxLiv && nod._fxLiv.isActive?.()) n++
      for (const c of nod.children || []) gata(c)
    }
    gata(window.__barnspel.nav.ctx.screenHolder)
    return n
  })
  ok('8 inget tickar efter exit', kvarlevande === 0, `${kvarlevande} levande liv-tweens kvar`)
  ok('9 inga konsolfel', errors.length === 0, `${errors.length} fel${errors[0] ? ': ' + errors[0] : ''}`)

  console.log(`\n  ${ID} — hyllans liv\n`)
  for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn.padEnd(34)} ${r.text}`)
  const gronaN = rader.filter((r) => r.ok).length
  console.log(`\n  ${gronaN}/${rader.length}\n`)
  process.exitCode = gronaN === rader.length ? 0 : 1
} finally {
  await browser.close()
}
