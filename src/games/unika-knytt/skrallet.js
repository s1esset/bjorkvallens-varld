// skrallet.js — SKRÄLLET, verkstadens busvätte (docens §4b; poleringsrundan steg 3, 2026-09-10).
//
// En liten rufsig figur springer in längs takbjälken, hoppar ner på kupans krage, SNOR en sak ur
// världen — en rekvisita eller en gnista — och sitter och fnissar med den som en trofé. Byggd
// efter P0 MOTGÅNG: rolig ton, tydlig orsak (barnet SER den ta saken), går att åtgärda direkt (ETT
// tryck: den hickar, tappar saken och kilar iväg) och ett TAK. Tidtabellen och vad den får sno
// ägs av index.js (`_skrallForsok`); den här filen äger figuren och dess liv:
//   · läker sig själv — ignorerad i `TROTT_S` gäspar den, lämnar tillbaka saken och går, så den
//     kan aldrig blockera spaken
//   · `sugIn()` — drar barnet i spaken medan den håller något sugs den med in i degen, och
//     knyttet får en tofs av dess päls (`SKRALL_PALS`, ritad i knytt.js) och ett vikt öra
//
// ⚠️ Byggd UTAN uppehållsmätningen §4b väntade på (ägarens beslut 2026-09-10). Specens spärrar
// (12 s · 22 s · 7 s) är enda bromsen, och ett barn som drar spaken inom 12 s ser den aldrig.
//
// Träffytan är en EGEN nod på (620, 210), Rect(−72,−72,144,144), som aldrig animeras — figuren
// rör sig i barnnoder. Den är 'static' BARA medan Skrället sitter; annars 'none' och ett tryck
// faller igenom. Kupan behåller sin träffyta: Skrällets nod ligger ovanpå i z-ordningen, så ett
// tryck på Skrället når Skrället och ett tryck bredvid rullar fortfarande om kupan. (Specen ville
// stänga av kupan medan Skrället sitter — en död yta på skärmens största föremål vore sämre.)
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { sphereFill } from '../../lib/form.js'
import { shade, tint } from '../../lib/theme.js'
import { pop, puff, sparkle, squash, stadFx } from '../../lib/feedback.js'

/** Skrällets päls — knytt.js ritar tofsen i samma färg, så tofsen läser som ITS päls. */
export const SKRALL_PALS = 0x8a64b8

/** Hur länge Skrället sitter med sin trofé innan den blir uttråkad och går (§4b). */
export const TROTT_S = 7

const YTA = { x: 620, y: 210 }
const SITT = { x: 612, y: 212 } // fotpunkten när den klänger på kragen, innanför träffytan
const BALK = { y: 76, x0: 232, x1: 548 } // takbjälkens ovankant och stretchen den springer
const MORK = shade(SKRALL_PALS, 0.36)
const BUK = tint(SKRALL_PALS, 0.44)
const INK = 0x2d2233
const TAU = Math.PI * 2

const G = () => new Graphics()

// Figuren, ritad med FOTPUNKTEN i origo — egen silhuett, aldrig en ikon (P0 ASSETS).
function ritaKropp(g) {
  // svansen bakom allt: ett tunt böjt streck med en tofs
  g.moveTo(12, -18).quadraticCurveTo(38, -26, 30, -54).stroke({ width: 5, color: MORK, cap: 'round' })
  g.circle(30, -57, 8.5).fill(MORK)
  g.circle(30, -58, 6.5).fill(SKRALL_PALS)
  // fötterna
  g.ellipse(-10, -3, 9, 5).fill(MORK)
  g.ellipse(10, -3, 9, 5).fill(MORK)
  // öronen: spetsiga, utåtlutade, med rosa insida
  g.poly([-13, -44, -30, -68, -4, -52]).fill(MORK)
  g.poly([-13, -47, -24, -62, -8, -52]).fill(0xf6a3c0)
  g.poly([13, -44, 30, -68, 4, -52]).fill(MORK)
  g.poly([13, -47, 24, -62, 8, -52]).fill(0xf6a3c0)
  // den rufsiga kroppen: en mörkare kopia bakom (kontur utan stroke), sedan pälsen
  g.star(0, -27, 22, 29, 24.5).fill(MORK)
  g.star(0, -28, 22, 26.5, 22.5).fill(sphereFill(SKRALL_PALS, { highlight: 0.32, dark: 0.18 }))
  g.ellipse(0, -18, 13, 10).fill(BUK)
  // ögonen — stora och busiga, med bryn som lutar inåt
  g.ellipse(-8, -36, 7.5, 8.5).fill(0xffffff)
  g.ellipse(8, -36, 7.5, 8.5).fill(0xffffff)
  g.circle(-6.5, -35, 3.6).fill(INK)
  g.circle(9.5, -35, 3.6).fill(INK)
  g.circle(-5.6, -36.2, 1.3).fill(0xffffff)
  g.circle(10.4, -36.2, 1.3).fill(0xffffff)
  g.moveTo(-15, -47).lineTo(-3, -43).stroke({ width: 3, color: MORK, cap: 'round' })
  g.moveTo(15, -47).lineTo(3, -43).stroke({ width: 3, color: MORK, cap: 'round' })
  // flinet med EN tand
  g.moveTo(-10, -24).quadraticCurveTo(0, -14, 10, -24).stroke({ width: 3, color: INK, cap: 'round' })
  g.roundRect(-2.5, -22.5, 5, 4.5, 1.2).fill(0xffffff)
}

// Armarna i två lägen: nere vid sidorna, eller uppe och håller trofén över huvudet.
function ritaArmar(g, uppe) {
  const y = uppe ? -54 : -24
  for (const s of [-1, 1]) {
    if (uppe) g.moveTo(s * 18, -30).quadraticCurveTo(s * 22, -44, s * 12, -60).stroke({ width: 5.5, color: MORK, cap: 'round' })
    g.circle(s * (uppe ? 11 : 21), y - (uppe ? 7 : 0), 5.5).fill(MORK)
    g.circle(s * (uppe ? 11 : 21), y - (uppe ? 7 : 0), 4).fill(SKRALL_PALS)
  }
}

/**
 * Skrället.
 * opts: { senare(s, fn), audio, pa(h, d) }
 *   pa('tillbaka', { sak, orsak })  — saken ska tillbaka i kupan ('petad' · 'trott' · 'fly')
 *   pa('borta', { orsak })          — Skrället har lämnat scenen helt
 */
export function byggSkrallet(opts = {}) {
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  const senareRa = typeof opts.senare === 'function' ? opts.senare : (s, fn) => setTimeout(fn, s * 1000)
  const sfx = (n) => audio?.sfx?.(n)
  const ton = (o) => audio?.tone?.(o)

  let levande = true
  const strax = (s, fn) => senareRa(s, () => { if (levande) fn() })
  let lage = 'borta' // 'borta' · 'kommer' · 'sitter' · 'gar' · 'sugs'
  let sak = null
  let besok = 0 // besöksnummer: en timer från ett TIDIGARE besök får aldrig röra nästa
  let t = 0
  let fnissT = 1.4
  let hickT = 2.6
  let tweens = []
  const spara = (tw) => {
    if (tweens.length > 32) tweens = tweens.filter((x) => x && x.parent)
    tweens.push(tw)
    return tw
  }

  // ---- noder: figur (läget) > hopp (squash äger scale) > kropp (tick äger rotation) ----
  const view = new Container()
  const figur = new Container()
  const hopp = new Container()
  const kropp = new Container()
  const bild = G()
  ritaKropp(bild)
  const armNere = G()
  ritaArmar(armNere, false)
  const armUppe = G()
  ritaArmar(armUppe, true)
  armUppe.visible = false
  const handNod = new Container() // trofén; tick äger y, pop äger scale
  handNod.position.set(0, -80)
  kropp.addChild(bild, armNere, armUppe, handNod)
  hopp.addChild(kropp)
  figur.addChild(hopp)
  for (const n of [figur, hopp, kropp, bild, armNere, armUppe, handNod]) n.eventMode = 'none'
  figur.visible = false

  const yta = new Container()
  yta.position.set(YTA.x, YTA.y)
  yta.hitArea = new Rectangle(-72, -72, 144, 144)
  yta.eventMode = 'none'
  yta.cursor = 'pointer'
  view.addChild(figur, yta)

  function ritaSak(s) {
    for (const c of handNod.removeChildren()) c.destroy({ children: true })
    const g = G()
    if (s?.typ === 'prop' && typeof s.def?.rita === 'function') s.def.rita(g, 22)
    else g.star(0, 0, 5, 12, 5).fill(0xfff3b0)
    g.eventMode = 'none'
    // Centrera trofén i handen oavsett var föremålets egen origo ligger (fot eller mitt).
    const b = g.getLocalBounds()
    g.position.set(-(b.x + b.width / 2), -(b.y + b.height / 2))
    handNod.addChild(g)
  }
  function tomHand() {
    for (const c of handNod.removeChildren()) c.destroy({ children: true })
    armUppe.visible = false
    armNere.visible = true
  }

  // ---- ljud och små gester ----------------------------------------------------------
  function fniss() {
    ton({ freq: 784, dur: 0.06, type: 'triangle', vol: 0.1 })
    strax(0.08, () => ton({ freq: 988, dur: 0.06, type: 'triangle', vol: 0.1 }))
    strax(0.16, () => ton({ freq: 1175, dur: 0.07, type: 'triangle', vol: 0.09 }))
    squash(hopp, { intensity: 0.35 })
  }
  function hick() {
    ton({ freq: 520, dur: 0.09, type: 'sine', vol: 0.12, slideTo: 820 })
    squash(hopp, { intensity: 0.6, hop: 6 })
  }

  // ---- besöket ------------------------------------------------------------------------
  /** In längs takbjälken och ner på kragen. `framme()` när den sitter — då får index.js sno. */
  function kom(framme) {
    if (!levande || lage !== 'borta') return false
    lage = 'kommer'
    besok++
    const nr = besok
    tomHand()
    figur.visible = true
    figur.alpha = 1
    figur.rotation = 0
    figur.scale.set(1)
    figur.position.set(BALK.x0, BALK.y)
    hopp.scale.set(0.15)
    spara(gsap.timeline({
      onComplete: () => {
        if (!levande || nr !== besok || lage !== 'kommer') return
        lage = 'sitter'
        yta.eventMode = 'static'
        fnissT = 0.9
        hickT = 2.4
        framme?.()
      },
    })
      .to(hopp.scale, { x: 1, y: 1, duration: 0.22, ease: 'back.out(2.2)' })
      .to(figur, { x: BALK.x1, duration: 0.8, ease: 'sine.inOut' })
      .to(figur, { x: SITT.x, duration: 0.45, ease: 'none' })
      .to(figur, { y: BALK.y - 44, duration: 0.2, ease: 'power2.out' }, '<')
      .to(figur, { y: SITT.y, duration: 0.25, ease: 'power2.in' }, '>'))
    // Tassandet längs bjälken — en stämd pitter-patter, schemalagd med `senare` (dör med rundan).
    for (let i = 0; i < 8; i++) strax(0.24 + i * 0.1, () => { if (nr === besok) ton({ freq: i % 2 ? 1319 : 1175, dur: 0.035, type: 'square', vol: 0.035 }) })
    strax(1.47, () => {
      if (nr !== besok || lage !== 'sitter') return
      sfx('pop')
      puff(figur.parent, SITT.x, SITT.y - 4, { count: 5, color: 0xf3e2bd })
    })
    return true
  }

  /**
   * Saken är snodd. Den TILLHÖR Skrället från första stund — ett tryck i nästa bildruta lämnar
   * tillbaka den — men syns i handen först efter `visaOm` s, när kupans flygande kopia hunnit
   * fram. (Sattes den först efter flykten kunde ett snabbt tryck i glappet tappa den för gott.)
   * Uttråkad efter `TROTT_S`.
   */
  function tog(s, visaOm = 0) {
    if (!levande || lage !== 'sitter' || !s) return
    sak = s
    const nr = besok
    const visa = () => {
      if (nr !== besok || sak !== s || lage !== 'sitter') return
      ritaSak(s)
      armNere.visible = false
      armUppe.visible = true
      pop(handNod, { scale: 1.3 })
      sfx('whoosh')
      fniss()
    }
    if (visaOm > 0) strax(visaOm, visa)
    else visa()
    strax(TROTT_S, () => { if (nr === besok && lage === 'sitter' && sak) lamna('trott') })
  }

  /**
   * Skrället går — och en sak den håller går ALLTID tillbaka först (`pa('tillbaka')`), oavsett
   * orsak: petad (barnets tryck), trott (ignorerad) eller fly (spaken/boden mitt i ett besök).
   */
  function lamna(orsak = 'fly') {
    if (!levande || (lage !== 'sitter' && lage !== 'kommer')) return false
    const s = sak
    sak = null
    tomHand()
    yta.eventMode = 'none'
    lage = 'gar'
    const nr = besok
    if (s) pa('tillbaka', { sak: s, orsak })
    if (orsak === 'trott') {
      ton({ freq: 520, dur: 0.5, type: 'sine', vol: 0.09, slideTo: 300 }) // gäspningen
    } else {
      hick()
      strax(0.18, fniss)
    }
    gsap.killTweensOf(figur)
    spara(gsap.timeline({
      onComplete: () => {
        if (!levande || nr !== besok) return
        figur.visible = false
        lage = 'borta'
        pa('borta', { orsak })
      },
    })
      .to(figur, { y: BALK.y - 40, x: BALK.x1, duration: 0.26, ease: 'power2.out' })
      .to(figur, { y: BALK.y, duration: 0.14, ease: 'power2.in' })
      .to(figur, { x: BALK.x0, duration: 0.6, ease: 'sine.in' })
      .to(hopp.scale, { x: 0.1, y: 0.1, duration: 0.18, ease: 'back.in(2)' }))
    return true
  }

  /**
   * Spaken drogs medan Skrället höll något: den sugs in i degen i en spiral mot `(x, y)`.
   * Returnerar det den höll (index.js lägger tillbaka en gnista i receptet INNAN tiern rullas,
   * så Skrället påverkar aldrig sällsyntheten — ren kosmetik, §4b).
   */
  function sugIn(x, y) {
    if (!levande || lage !== 'sitter') return null
    const s = sak
    sak = null
    lage = 'sugs'
    yta.eventMode = 'none'
    besok++
    const nr = besok
    gsap.killTweensOf(figur)
    const x0 = figur.x
    const y0 = figur.y - 30 // spiralen räknas från kroppens mitt, inte fötterna
    const r0 = Math.hypot(x0 - x, y0 - y)
    const a0 = Math.atan2(y0 - y, x0 - x)
    ton({ freq: 420, dur: 1.0, type: 'triangle', vol: 0.12, slideTo: 1250 }) // wheeee
    hick()
    const st = { p: 0 }
    spara(gsap.to(st, {
      p: 1,
      duration: 1.1,
      ease: 'power1.in',
      onUpdate: () => {
        if (figur.destroyed) return
        const p = st.p
        const a = a0 + p * 2 * TAU
        const r = r0 * Math.pow(1 - p, 1.3)
        figur.position.set(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.66 + 30 * (1 - p))
        figur.rotation = p * TAU * 1.5
        figur.scale.set(1 - 0.88 * p)
        figur.alpha = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1
      },
      onComplete: () => {
        if (!levande || nr !== besok || figur.destroyed) return
        figur.visible = false
        figur.rotation = 0
        figur.scale.set(1)
        figur.alpha = 1
        tomHand()
        lage = 'borta'
        sparkle(figur.parent, x, y, { count: 6 })
      },
    }))
    return s
  }

  function onTap() {
    if (!levande || lage !== 'sitter') return
    // Petad: den hickar, tappar saken (index.js lägger tillbaka den) och kilar iväg skrattande.
    lamna('petad')
  }
  yta.on('pointertap', onTap)

  function tick(dtMS) {
    if (!levande || !figur.visible) return
    const dt = Math.min(0.05, (Number.isFinite(dtMS) ? dtMS : 16) / 1000)
    t += dt
    if (lage === 'sitter') {
      kropp.rotation = Math.sin(t * 3) * 0.07
      handNod.y = -80 + Math.sin(t * 4.2) * 4
      if (sak) {
        fnissT -= dt
        hickT -= dt
        if (fnissT <= 0) { fnissT = 2.2 + Math.random() * 0.8; fniss() }
        if (hickT <= 0) { hickT = 3.0 + Math.random(); hick() }
      }
    } else if (lage === 'kommer' || lage === 'gar') {
      kropp.rotation = Math.sin(t * 18) * 0.12 // springvickan
    }
  }

  function destroy() {
    if (!levande) return
    levande = false
    yta.off('pointertap', onTap)
    for (const tw of tweens) tw?.kill()
    tweens = []
    gsap.killTweensOf(figur)
    gsap.killTweensOf(hopp.scale)
    stadFx(view)
    view.destroy({ children: true })
  }

  return {
    view,
    yta,
    kom,
    tog,
    lamna,
    sugIn,
    tick,
    destroy,
    get lage() { return lage },
    get aktiv() { return lage !== 'borta' },
    get haller() { return lage === 'sitter' && !!sak },
    get sak() { return sak?.typ ?? null },
    /** Handens läge i skärmens rum — dit kupan flyger det den snor. */
    get hand() { return { x: SITT.x, y: SITT.y - 80 } },
  }
}
