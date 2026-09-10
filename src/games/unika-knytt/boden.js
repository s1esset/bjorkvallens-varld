// boden.js — Knyttboden: en RULLANDE POPUP som bara visar det man FÅTT (docens §1 "Knyttboden",
// §8 beslut 1), och bodluckan i verkstan som leder dit.
//
// Tre regler bär filen:
//
// 1. INGEN FRÅNVARO. Ett hyllplan finns först när det har ett knytt, en skylt finns först när
//    dess värld (eller skimret) har ett, och listan slutar där samlingen slutar. Inga tomma
//    bon, inga låsta siluetter, ingen räknare (P0 FOMO). "Alla" är alltid första fliken, så
//    ett barn med tre skogsknytt aldrig öppnar boden på en tom hylla.
// 2. ALLT SYNLIGT LEVER. Varje knytt i bild är en riktig rigg (`byggKnytt`, r 44) som andas,
//    blinkar, somnar och väcks — byggd LAT när dess rad rullar in i bild och riven när den
//    rullar ut, så en samling på 200 kostar lika mycket som en på åtta.
// 3. RULLNINGEN ÄR P0-SÄKER. Ett mjukt axellåst drag på innehållsytan (DESIGN.md §8, samma
//    mönster som LibraryScreen) med en `scrolling()`-vakt så ett drag aldrig öppnar ett knytt,
//    PLUS två 96 px pilknappar som stegar ett plan i taget — tap-vägen för ett barn som inte
//    kan dra. Aldrig snabbsvep-nav.
//
// Boden äger inga repliker — index.js säger dem på `pa('oppnad' | 'vila' | 'somnar')`, för
// `check.mjs` läser bara index.js.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, shade, tint } from '../../lib/theme.js'
import { topLightFill, verticalFill, groundFill, cylinderFill, sphereFill } from '../../lib/form.js'
import { kvittera, pop, puff, sparkle, squash, stadFx } from '../../lib/feedback.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { dnaFromSeed, VARLDAR } from './dna.js'
import { byggKnytt } from './knytt.js'

const W = 1280
const H = 720
const TRA = 0xb98050
const TRA_MORK = 0x8a5a3b
const HALM = 0xc9a15a
const INK = 0x3b2c22
const MASSING = 0xe0a53c

// Layout i designrymden. Skalets hem (70,64) och högtalare (1210,64) ligger ÖVER overlayn
// med träffytor y −6–134 — allt här börjar under 158 så P0-avståndet 24 håller.
const PANEL = { x: 60, y: 100, w: 1160, h: 590, r: 36 }
const FLIK = { y: 206, x0: 150, pitch: 130, w: 104, h: 96 }
const VY = { x0: 120, y0: 262, x1: 1100, y1: 672 } // rullytan (masken)
const RAD_H = 200 // ett hyllplan
const RAD_Y0 = 112 // första planets mitt, mätt från rullytans topp
const BO_X = [280, 500, 720, 940] // fyra bon per plan — 220 isär, träffytor 96 → 124 fritt
// Pilkolumnen: tre knappar à 120 px (96 + halo) — pil ▲ y 280–400 · pil ▼ 424–544 · dörren
// 568–688, alltså 24 px isär, och 26 px under skyltradens underkant (254). Stod förut på
// 330/490/630: pil ▼ och dörren 20 px isär, och den ÅTTONDE skylten (Alla + sex världar +
// Skimmer, x 1008–1112) 16 px ovanför pil ▲. Uppmätt i `_knyttlyftprobe` B9 — ingen
// sond hade mätt bodens avstånd förut, och de flesta samlingar har inte åtta skyltar än.
const PIL = { x: 1160, upp: 340, ner: 484 }
const STANG = { x: 1160, y: 628 }
const KNYTT_R = 44
const SKVALLER_MIN = 5
const SKVALLER_MAX = 9
const HINT_S = 7

const G = () => new Graphics()
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// ---- skyltarnas ikoner: en per värld + Alla + Skimmer, ritade fristående (P0 ASSETS) ----
const IKON = {
  alla(g) {
    g.ellipse(0, 12, 30, 11).fill(topLightFill(HALM, { highlight: 0.2, dark: 0.26 }))
    for (const [x, c] of [[-16, 0xf28c6b], [0, 0x7fcf6a], [16, 0x74b8ea]]) {
      g.circle(x, -2, 12).fill(sphereFill(c, { highlight: 0.4 }))
      g.circle(x - 3, -5, 2.6).fill(0xffffff)
      g.circle(x + 3, -5, 2.6).fill(0xffffff)
    }
  },
  skog(g) {
    g.roundRect(-4, 6, 8, 20, 3).fill(TRA_MORK)
    g.circle(-10, 0, 13).fill(sphereFill(0x63b955))
    g.circle(10, -2, 12).fill(sphereFill(0x74c862))
    g.circle(0, -14, 13).fill(sphereFill(0x83d46d))
  },
  vatten(g) {
    g.moveTo(-30, 8).quadraticCurveTo(-15, -12, 0, 8).quadraticCurveTo(15, 28, 30, 8).lineTo(30, 26).lineTo(-30, 26).closePath().fill(0x4aa3df)
    g.moveTo(0, -24).quadraticCurveTo(12, -6, 0, 2).quadraticCurveTo(-12, -6, 0, -24).fill(sphereFill(0x8fdcf5))
  },
  sno(g) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI
      g.moveTo(Math.cos(a) * -24, Math.sin(a) * -24).lineTo(Math.cos(a) * 24, Math.sin(a) * 24).stroke({ width: 5, color: 0xdff0ff, cap: 'round' })
    }
    g.circle(0, 0, 6).fill(0xffffff)
  },
  natt(g) {
    g.circle(2, 0, 22).fill(sphereFill(0xffe9a8, { highlight: 0.3 }))
    g.circle(12, -6, 18).fill(TRA)
    g.star(-18, -14, 5, 7, 3).fill(0xfff3b0)
  },
  oken(g) {
    g.circle(14, -14, 11).fill(sphereFill(0xffc93c, { highlight: 0.5 }))
    g.roundRect(-14, -18, 14, 44, 7).fill(topLightFill(0x5faa5a))
    g.roundRect(-28, -6, 10, 18, 5).fill(topLightFill(0x5faa5a))
    g.roundRect(-24, 4, 12, 8, 4).fill(topLightFill(0x5faa5a))
  },
  grotta(g) {
    g.moveTo(-28, 24).lineTo(-8, -22).lineTo(4, 24).closePath().fill(topLightFill(0xb08cff, { highlight: 0.4 }))
    g.moveTo(0, 24).lineTo(16, -8).lineTo(28, 24).closePath().fill(topLightFill(0x8ad8ff, { highlight: 0.4 }))
    g.circle(-8, -24, 3).fill(0xffffff)
  },
  skimmer(g) {
    g.star(0, 0, 5, 26, 12).fill(topLightFill(0xf2c94c, { highlight: 0.4 }))
    g.star(0, 0, 5, 14, 6).fill({ color: 0xfff6c8, alpha: 0.85 })
    g.star(-22, -18, 4, 6, 2.4).fill(0xffffff)
    g.star(22, 16, 4, 5, 2).fill(0xffffff)
  },
}

function ritaBo(g, s = 1) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    g.ellipse(Math.cos(a) * 44 * s, 6 + Math.sin(a) * 13 * s, 14 * s, 7.5 * s).fill({ color: i % 2 ? 0xc9a15e : 0xb98d4c, alpha: 0.95 })
  }
  g.ellipse(0, 10, 46 * s, 16 * s).fill(0xa87d40)
}

/** Sparposten som en liten post boden kan sortera på. */
function tolka(post) {
  return { post, seed: post[0] >>> 0, v: post[4] | 0, t: post[7] | 0 }
}

/**
 * Knyttboden.
 * opts: { senare(s, fn), audio, pa(h, d), varldar }
 */
export function byggBoden(opts = {}) {
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  const senareRa = typeof opts.senare === 'function' ? opts.senare : (s, fn) => setTimeout(fn, s * 1000)
  let levande = true
  const strax = (s, fn) => senareRa(s, () => { if (levande) fn() })
  const sfx = (n) => audio?.sfx?.(n)
  const ton = (o) => audio?.tone?.(o)
  const varldar = Array.isArray(opts.varldar) ? opts.varldar : VARLDAR

  // ---- tillstånd ----------------------------------------------------------
  let oppen = false
  let alla = [] // tolkade poster, i sparordning (äldst först)
  let fram = 0 // favoritens frö (0 = ingen)
  let flik = 'alla' // 'alla' | världens id | 'skimmer'
  let lista = [] // fliken sorterad, det som visas
  let bon = [] // { nod, luta, knytt, post, rad, kol }
  let tweens = []
  let skvallerT = SKVALLER_MIN
  let skvallrar = false
  let sistInput = 0
  let hintad = false
  let somnSagd = false
  let klocka = 0
  let pekNere = false
  const scroll = { dragging: false, moved: false, axis: null, startY: 0, startPy: 0, minY: 0 }
  const scrolling = () => scroll.moved

  function spara(tw) {
    if (!tw) return tw
    if (tweens.length > 48) tweens = tweens.filter((x) => x && x.parent)
    tweens.push(tw)
    return tw
  }

  // ---- noder ---------------------------------------------------------------
  const view = new Container()
  view.visible = false
  view.eventMode = 'static'
  // Heltäckande — inget under boden får nås medan den är öppen, och en bar Container utan
  // hitArea träfftestar aldrig.
  view.hitArea = new Rectangle(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, H + 2 * BLEED_Y)

  const dim = G().rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, H + 2 * BLEED_Y).fill({ color: 0x2b1a10, alpha: 0.55 })
  dim.eventMode = 'none'
  view.addChild(dim)

  const panel = new Container()
  panel.eventMode = 'none'
  view.addChild(panel)
  {
    const p = G()
    p.roundRect(PANEL.x + 6, PANEL.y + 10, PANEL.w, PANEL.h, PANEL.r).fill({ color: 0x000000, alpha: 0.22 })
    p.roundRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r).fill(verticalFill(0xd9a86c, 0xb47c48))
    panel.addChild(p)
    // Snidade bräder — fyra toner i rummet håller `heltackande-falt` borta.
    const br = G()
    for (let i = 0; i < 9; i++) {
      const x = PANEL.x + 24 + i * 126
      br.roundRect(x, PANEL.y + 16, 112, PANEL.h - 32, 12).fill({ color: i % 2 ? 0xcf9a5c : 0xc48f52, alpha: 0.9 })
    }
    panel.addChild(br)
    const list = G()
    list.roundRect(PANEL.x + 14, PANEL.y + 14, PANEL.w - 28, PANEL.h - 28, PANEL.r - 10).stroke({ width: 6, color: shade(TRA, 0.35), alpha: 0.5 })
    panel.addChild(list)
  }

  // Skyltraden byggs om vid varje öppning (vilka som finns beror på samlingen).
  const flikLager = new Container()
  view.addChild(flikLager)

  // Rullytan: mask + innehåll.
  const rullHall = new Container()
  const mask = G().rect(VY.x0, VY.y0, VY.x1 - VY.x0, VY.y1 - VY.y0).fill(0xffffff)
  mask.eventMode = 'none'
  rullHall.addChild(mask)
  rullHall.mask = mask
  // `passive` (standard), ALDRIG 'none': 'none' ignorerar händelser även på barnen, och då
  // hade bona varit döda träffytor utan ett konsolfel (`_bodprobe` B5 hittade det).
  const innehall = new Container()
  rullHall.addChild(innehall)
  view.addChild(rullHall)

  // ---- knappar: pilarna och dörren ----------------------------------------
  function knapp(x, y, rita, vid) {
    const k = new Container()
    k.position.set(x, y)
    k.eventMode = 'static'
    k.cursor = 'pointer'
    k.hitArea = new Rectangle(-60, -60, 120, 120)
    const inner = new Container()
    const g = G()
    g.roundRect(-46, -40, 92, 84, 18).fill(topLightFill(TRA_MORK, { highlight: 0.22, dark: 0.26 }))
    g.roundRect(-40, -34, 80, 72, 14).fill(topLightFill(TRA, { highlight: 0.26, dark: 0.22 }))
    rita(g)
    g.eventMode = 'none'
    inner.addChild(g)
    k.addChild(inner)
    k.on('pointertap', () => {
      if (!levande) return
      squash(inner, { intensity: 0.7 })
      vid()
    })
    view.addChild(k)
    return k
  }
  const pil = (g, rikt) => {
    g.moveTo(-22, 12 * rikt).lineTo(0, -14 * rikt).lineTo(22, 12 * rikt).closePath().fill(topLightFill(MASSING, { highlight: 0.3 }))
  }
  const pilUpp = knapp(PIL.x, PIL.upp, (g) => pil(g, 1), () => stega(-1))
  const pilNer = knapp(PIL.x, PIL.ner, (g) => pil(g, -1), () => stega(1))
  const dorr = knapp(STANG.x, STANG.y, (g) => {
    // Dörren hem till verkstan: en trälucka med en pil ut.
    g.roundRect(-24, -26, 48, 52, 8).fill(topLightFill(shade(TRA, 0.3), { highlight: 0.2 }))
    g.circle(12, 2, 4).fill(MASSING)
    g.moveTo(2, -4).lineTo(-16, -4).lineTo(-16, 4).lineTo(2, 4).closePath().fill(0xfff2d0)
    g.moveTo(2, -10).lineTo(14, 0).lineTo(2, 10).closePath().fill(0xfff2d0)
  }, () => stang())

  // ---- rullning: axellåst drag på rullytan (LibraryScreen-mönstret) -----------
  function omfang() {
    const rader = Math.ceil(lista.length / BO_X.length)
    const totalH = rader * RAD_H + 30
    const synligH = VY.y1 - VY.y0
    scroll.minY = Math.min(0, synligH - totalH)
    pilUpp.visible = pilNer.visible = scroll.minY < 0
  }
  function satY(y) {
    innehall.y = klamp(y, scroll.minY, 0)
    synk()
  }
  function stega(rikt) {
    sistInput = klocka
    gsap.killTweensOf(innehall)
    const mal = klamp(Math.round((innehall.y - rikt * RAD_H) / RAD_H) * RAD_H, scroll.minY, 0)
    if (mal === innehall.y) {
      // Slut på hyllan åt det hållet: pilen studsar, inget fel (P0).
      sfx('soft')
      return
    }
    sfx('flip')
    spara(gsap.to(innehall, { y: mal, duration: 0.32, ease: 'power2.out', onUpdate: synk, onComplete: synk }))
  }
  const onDown = (e) => {
    if (!oppen) return
    pekNere = true
    sistInput = klocka
    const p = view.toLocal(e.global)
    if (p.y < VY.y0 || p.x > VY.x1) return
    scroll.dragging = true
    scroll.moved = false
    scroll.axis = null
    scroll.startPy = p.y
    scroll.startY = innehall.y
    gsap.killTweensOf(innehall)
  }
  const onMove = (e) => {
    if (!scroll.dragging) return
    const p = view.toLocal(e.global)
    const dy = p.y - scroll.startPy
    if (!scroll.axis && Math.abs(dy) > 12) {
      scroll.axis = 'v'
      scroll.moved = true
    }
    if (scroll.axis === 'v') satY(scroll.startY + dy)
  }
  const onUp = () => {
    pekNere = false
    if (!scroll.dragging) return
    scroll.dragging = false
    if (scroll.axis === 'v') {
      // Snäpp till närmaste plan så en rad aldrig blir liggande halv.
      const mal = klamp(Math.round(innehall.y / RAD_H) * RAD_H, scroll.minY, 0)
      spara(gsap.to(innehall, { y: mal, duration: 0.28, ease: 'power2.out', onUpdate: synk, onComplete: synk }))
    }
    // `moved` står kvar en bildruta så tappen som avslutar draget hinner läsa den.
    strax(0.05, () => { scroll.moved = false })
  }
  view.on('pointerdown', onDown)
  view.on('globalpointermove', onMove)
  view.on('pointerup', onUp)
  view.on('pointerupoutside', onUp)

  // ---- flikarna -------------------------------------------------------------
  function flikar() {
    const ut = [{ id: 'alla', ikon: 'alla' }]
    varldar.forEach((v, i) => {
      if (alla.some((p) => p.v === i)) ut.push({ id: v.id, ikon: IKON[v.id] ? v.id : 'alla', v: i })
    })
    if (alla.some((p) => p.t > 0)) ut.push({ id: 'skimmer', ikon: 'skimmer' })
    return ut
  }

  function byggFlikar() {
    for (const c of flikLager.removeChildren()) {
      stadFx(c)
      c.destroy({ children: true })
    }
    const lst = flikar()
    if (!lst.some((f) => f.id === flik)) flik = 'alla'
    lst.forEach((f, i) => {
      const x = FLIK.x0 + i * FLIK.pitch
      const skylt = new Container()
      skylt.position.set(x, FLIK.y)
      skylt.eventMode = 'static'
      skylt.cursor = 'pointer'
      skylt.hitArea = new Rectangle(-FLIK.w / 2, -FLIK.h / 2, FLIK.w, FLIK.h)
      const aktiv = f.id === flik
      const inner = new Container()
      const g = G()
      // Hängande träskylt på två snören, den aktiva hänger lägre och ljusare.
      g.moveTo(-26, -70).lineTo(-30, -36).stroke({ width: 3, color: shade(TRA, 0.5) })
      g.moveTo(26, -70).lineTo(30, -36).stroke({ width: 3, color: shade(TRA, 0.5) })
      g.roundRect(-46, -36, 92, 74, 14).fill(topLightFill(aktiv ? tint(TRA, 0.22) : shade(TRA, 0.12), { highlight: 0.24, dark: 0.24 }))
      g.roundRect(-40, -30, 80, 62, 11).stroke({ width: 3, color: aktiv ? MASSING : shade(TRA, 0.3), alpha: 0.8 })
      const ik = G()
      ik.position.set(0, 2)
      ik.scale.set(0.78)
      ;(IKON[f.ikon] || IKON.alla)(ik)
      g.eventMode = 'none'
      ik.eventMode = 'none'
      inner.addChild(g, ik)
      inner.y = aktiv ? 12 : 0
      skylt.addChild(inner)
      skylt.on('pointertap', () => {
        if (!levande || !oppen) return
        sistInput = klocka
        squash(inner, { intensity: 0.6 })
        if (f.id === flik) {
          kvittera(view, x, FLIK.y, audio)
          return
        }
        flik = f.id
        sfx('flip')
        ton({ freq: 587, dur: 0.12, type: 'triangle', vol: 0.14 })
        byggFlikar()
        byggLista()
        pa('flik', flik)
      })
      flikLager.addChild(skylt)
    })
  }

  // ---- listan och bona -------------------------------------------------------
  function sortera() {
    const nyast = alla.slice().reverse()
    if (flik === 'alla') {
      const fav = fram ? nyast.find((p) => p.seed === fram) : null
      return fav ? [fav, ...nyast.filter((p) => p !== fav)] : nyast
    }
    if (flik === 'skimmer') return nyast.filter((p) => p.t > 0).sort((a, b) => b.t - a.t)
    const vi = varldar.findIndex((v) => v.id === flik)
    return nyast.filter((p) => p.v === vi)
  }

  function rivBon() {
    for (const b of bon) rivKnytt(b)
    for (const c of innehall.removeChildren()) {
      stadFx(c)
      c.destroy({ children: true })
    }
    bon = []
  }

  function byggLista() {
    rivBon()
    lista = sortera()
    gsap.killTweensOf(innehall)
    innehall.y = 0
    // Hyllplanen: en bräda per rad, bara där det finns knytt.
    const rader = Math.ceil(lista.length / BO_X.length)
    for (let r = 0; r < rader; r++) {
      const y = VY.y0 + RAD_Y0 + r * RAD_H
      const br = G()
      br.roundRect(VY.x0 + 40, y + 30, VY.x1 - VY.x0 - 80, 22, 8).fill(topLightFill(shade(TRA, 0.18), { highlight: 0.22, dark: 0.26 }))
      br.roundRect(VY.x0 + 40, y + 52, VY.x1 - VY.x0 - 80, 6, 3).fill({ color: 0x000000, alpha: 0.18 })
      br.eventMode = 'none'
      innehall.addChild(br)
    }
    lista.forEach((post, i) => {
      const rad = Math.floor(i / BO_X.length)
      const kol = i % BO_X.length
      const nod = new Container()
      nod.position.set(BO_X[kol], VY.y0 + RAD_Y0 + rad * RAD_H)
      nod.eventMode = 'static'
      nod.cursor = 'pointer'
      nod.hitArea = new Rectangle(-50, -70, 100, 120)
      const luta = new Container() // skvallret lutar den här — aldrig träffytan
      const bo = G()
      ritaBo(bo)
      bo.eventMode = 'none'
      luta.addChild(bo)
      if (post.t > 0) {
        // Skimmerhyllans metallpiedestal, i varje flik: en list i tierns metall runt boet
        // (brons · silver · guld) — så ett skimrande knytt känns igen även bland de vanliga.
        const m = [0, 0xd08a4a, 0xd9dde8, 0xf2c94c][post.t]
        const ring = G()
        ring.ellipse(0, 12, 54, 20).stroke({ width: 6, color: m, alpha: 0.95 })
        ring.ellipse(0, 12, 54, 20).stroke({ width: 2, color: tint(m, 0.5), alpha: 0.8 })
        ring.eventMode = 'none'
        luta.addChildAt(ring, 0)
      }
      nod.addChild(luta)
      if (post.seed === fram && fram) {
        // Favoriten: en liten röd vimpel i boet — aldrig text.
        const v = G()
        v.moveTo(48, -30).lineTo(48, 14).stroke({ width: 3, color: TRA_MORK })
        v.moveTo(48, -30).lineTo(74, -22).lineTo(48, -12).closePath().fill(0xe0503f)
        v.eventMode = 'none'
        luta.addChild(v)
      }
      const b = { nod, luta, knytt: null, post, rad, kol }
      nod.on('pointertap', () => boTryck(b))
      innehall.addChild(nod)
      bon.push(b)
    })
    omfang()
    synk()
  }

  function byggKnyttI(b) {
    if (b.knytt || !levande) return
    const p = b.post.post
    const dna = dnaFromSeed(p[0], { f: p[1], z: p[2], m: p[3], v: p[4], g: p[6], t: p[7] })
    const k = byggKnytt(dna, { r: KNYTT_R, senare: senareRa, audio })
    k.view.position.set(0, 4)
    b.luta.addChild(k.view)
    b.knytt = k
  }
  function rivKnytt(b) {
    if (!b.knytt) return
    stadFx(b.knytt.view)
    b.knytt.destroy()
    b.knytt = null
  }

  /** Bygg knytt i de rader som är i (eller intill) bild, riv de andra. */
  function synk() {
    const topp = -innehall.y - RAD_H
    const botten = -innehall.y + (VY.y1 - VY.y0) + RAD_H * 0.5
    for (const b of bon) {
      const yLokal = RAD_Y0 + b.rad * RAD_H
      const iBild = yLokal > topp && yLokal < botten
      if (iBild) byggKnyttI(b)
      else rivKnytt(b)
    }
  }

  function synliga() {
    return bon.filter((b) => b.knytt && !b.knytt.view.destroyed)
  }

  function boTryck(b) {
    if (!levande || !oppen) return
    sistInput = klocka
    if (scrolling()) return // det var ett drag, inte ett val
    if (!b.knytt) byggKnyttI(b)
    const k = b.knytt
    if (!k) return
    const sov = k.lage === 'sover'
    k.glad()
    puff(view, b.nod.x, innehall.y + b.nod.y - 30, { count: 5, color: 0xfff0c4 })
    if (!sov) sfx('pop')
    // Favoriten: det knytt barnet senast tryckte på står framme nästa gång.
    if (fram !== b.post.seed) {
      fram = b.post.seed
      pa('fram', fram)
    }
  }

  // ---- skvaller: ett grannpar lutar sig mot varandra och kvittrar i tur --------
  function skvaller() {
    const kand = synliga()
    const par = []
    for (const a of kand) {
      const g = kand.find((x) => x.rad === a.rad && x.kol === a.kol + 1)
      if (g) par.push([a, g])
    }
    if (!par.length) return
    const [a, b] = par[(Math.random() * par.length) | 0]
    skvallrar = true
    const lutaTl = gsap.timeline({ onComplete: () => { skvallrar = false } })
    lutaTl.to(a.luta, { rotation: 0.09, duration: 0.45, ease: 'sine.inOut' }, 0)
      .to(b.luta, { rotation: -0.09, duration: 0.45, ease: 'sine.inOut' }, 0)
      .to(a.luta, { rotation: 0, duration: 0.5, ease: 'sine.inOut' }, 1.6)
      .to(b.luta, { rotation: 0, duration: 0.5, ease: 'sine.inOut' }, 1.6)
    spara(lutaTl)
    a.knytt.sjung?.()
    strax(0.7, () => { if (b.knytt && !b.knytt.view.destroyed) b.knytt.sjung?.() })
  }

  // ---- publikt ----------------------------------------------------------------
  function oppna(poster, opt = {}) {
    if (!levande) return
    alla = (Array.isArray(poster) ? poster : []).filter((p) => Array.isArray(p) && p.length === 8).map(tolka)
    fram = Number.isFinite(opt.fram) ? opt.fram >>> 0 : 0
    flik = 'alla'
    oppen = true
    hintad = false
    somnSagd = false
    sistInput = klocka
    skvallerT = SKVALLER_MIN + Math.random() * (SKVALLER_MAX - SKVALLER_MIN)
    view.visible = true
    view.alpha = 0
    panel.scale.set(0.92)
    gsap.killTweensOf(view)
    gsap.killTweensOf(panel.scale)
    spara(gsap.to(view, { alpha: 1, duration: 0.22 }))
    spara(gsap.to(panel.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(1.6)' }))
    byggFlikar()
    byggLista()
    sfx('whoosh')
    ton({ freq: 196, dur: 0.3, type: 'triangle', vol: 0.12, slideTo: 262 })
    // "De har saknat dig": alla i bild hoppar till, ett i taget — utan skuld, utan mätare.
    if (opt.ater) {
      synliga().forEach((b, i) => strax(0.3 + i * 0.12, () => { if (b.knytt && !b.knytt.view.destroyed) b.knytt.hoppa(1) }))
    } else {
      // Favoriten står framme och gör sin glada slinga.
      const fav = synliga().find((b) => b.post.seed === fram)
      if (fav) strax(0.45, () => fav.knytt?.glad())
    }
    pa('oppnad', { antal: alla.length, flikar: flikar().length })
  }

  function stang() {
    if (!levande || !oppen) return
    oppen = false
    scroll.dragging = false
    pekNere = false
    sfx('whoosh')
    gsap.killTweensOf(view)
    spara(gsap.to(view, {
      alpha: 0,
      duration: 0.18,
      onComplete: () => {
        if (!levande) return
        view.visible = false
        rivBon()
      },
    }))
    pa('stangd')
  }

  function tick(dtMS) {
    if (!levande || !oppen) return
    const dt = klamp((Number.isFinite(dtMS) ? dtMS : 16) / 1000, 0, 0.05)
    klocka += dt
    let nagonSover = false
    for (const b of bon) {
      if (!b.knytt) continue
      b.knytt.tick(dtMS, null)
      if (b.knytt.lage === 'sover') nagonSover = true
    }
    if (nagonSover && !somnSagd) {
      somnSagd = true
      pa('somnar')
    }
    // Skvallret: bara när barnet inte rör skärmen, högst ett i taget.
    if (!pekNere && klocka - sistInput > 1.5 && !skvallrar) {
      skvallerT -= dt
      if (skvallerT <= 0) {
        skvallerT = SKVALLER_MIN + Math.random() * (SKVALLER_MAX - SKVALLER_MIN)
        skvaller()
      }
    }
    if (!hintad && klocka - sistInput > HINT_S) {
      hintad = true
      const k = synliga()[0]
      if (k) pop(k.luta)
      pa('vila')
    }
  }

  function destroy() {
    if (!levande) return
    levande = false
    oppen = false
    view.off('pointerdown', onDown)
    view.off('globalpointermove', onMove)
    view.off('pointerup', onUp)
    view.off('pointerupoutside', onUp)
    for (const tw of tweens) tw?.kill()
    tweens = []
    gsap.killTweensOf(innehall)
    gsap.killTweensOf(view)
    gsap.killTweensOf(panel.scale)
    rivBon()
    rullHall.mask = null
    stadFx(view)
    view.destroy({ children: true })
  }

  return {
    view,
    oppna,
    stang,
    tick,
    destroy,
    get oppen() { return oppen },
    get flik() { return flik },
    get antal() { return lista.length },
    get synliga() { return synliga().length },
    get flikar() { return flikar().map((f) => f.id) },
    get rullbar() { return scroll.minY < 0 },
    get y() { return innehall.y },
    get forst() { return lista[0]?.seed ?? 0 },
    get lagen() { return synliga().map((b) => b.knytt.lage) },
    stega,
  }
}

/**
 * Bodluckan i verkstan — en liten stuga på golvet under spaken. Var åttonde sekund kikar ett
 * par ögon ut genom dörren (`kika()`), ett tryck öppnar boden. Egen siluett, eget liv.
 * opts: { audio, pa() }
 */
export function byggLucka(opts = {}) {
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  let dod = false
  const view = new Container()
  view.eventMode = 'static'
  view.cursor = 'pointer'
  view.hitArea = new Rectangle(-72, -84, 144, 168)

  const inner = new Container() // squash äger scale
  view.addChild(inner)
  const g = G()
  // Skuggan på golvet, väggen, taket, dörröppningen.
  g.ellipse(0, 78, 64, 12).fill({ color: INK, alpha: 0.18 })
  g.roundRect(-52, -6, 104, 84, 10).fill(topLightFill(TRA, { highlight: 0.2, dark: 0.26 }))
  for (let i = 0; i < 4; i++) g.rect(-52, 10 + i * 18, 104, 3).fill({ color: shade(TRA, 0.3), alpha: 0.5 })
  g.moveTo(-64, -2).lineTo(0, -58).lineTo(64, -2).closePath().fill(topLightFill(0xb7503c, { highlight: 0.26, dark: 0.24 }))
  g.moveTo(-58, -6).lineTo(0, -54).lineTo(58, -6).closePath().stroke({ width: 4, color: shade(0xb7503c, 0.35), alpha: 0.7 })
  g.roundRect(-22, 22, 44, 56, 18).fill(shade(TRA_MORK, 0.55))
  g.eventMode = 'none'
  inner.addChild(g)

  // Ögonen som kikar ut: en egen nod som `kika()` lyfter upp ur mörkret.
  const ogon = new Container()
  ogon.position.set(0, 74)
  const og = G()
  og.ellipse(0, 0, 18, 12).fill(0x6fc46a)
  og.circle(-7, -2, 5).fill(0xffffff)
  og.circle(7, -2, 5).fill(0xffffff)
  og.circle(-6, -1, 2.4).fill(INK)
  og.circle(8, -1, 2.4).fill(INK)
  og.eventMode = 'none'
  ogon.addChild(og)
  ogon.visible = false
  inner.addChild(ogon)

  // Dörrbladet (rotation äger den, vid tryck svänger den upp).
  const dorr = new Container()
  dorr.position.set(-22, 50)
  const dg = G()
  dg.roundRect(0, -28, 44, 56, 18).fill(cylinderFill(shade(TRA, 0.12), { axis: 'x' }))
  dg.circle(34, 2, 4).fill(MASSING)
  dg.eventMode = 'none'
  dorr.addChild(dg)
  inner.addChild(dorr)

  const sfx = (n) => audio?.sfx?.(n)
  const ton = (o) => audio?.tone?.(o)

  view.on('pointertap', () => {
    if (dod) return
    squash(inner, { intensity: 0.8 })
    gsap.killTweensOf(dorr)
    gsap.to(dorr, { rotation: -0.9, duration: 0.22, ease: 'back.out(2)' })
    gsap.to(dorr, { rotation: 0, duration: 0.4, delay: 0.7, ease: 'power2.inOut' })
    pa('tryck')
  })

  function kika() {
    if (dod || ogon.destroyed) return
    ogon.visible = true
    ogon.y = 74
    gsap.killTweensOf(ogon)
    gsap.timeline({ onComplete: () => { if (!ogon.destroyed) ogon.visible = false } })
      .to(ogon, { y: 48, duration: 0.3, ease: 'back.out(2)' })
      .to(ogon, { x: 6, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      .to(ogon, { y: 74, duration: 0.25, ease: 'power2.in' })
    ton({ freq: 880, dur: 0.08, type: 'sine', vol: 0.08 })
    ton({ freq: 1175, dur: 0.1, type: 'sine', vol: 0.07, delay: 0.1 })
  }

  function locka() {
    if (dod) return
    pop(inner, { scale: 1.12 })
    kika()
    sfx('soft')
  }

  function destroy() {
    dod = true
    gsap.killTweensOf(dorr)
    gsap.killTweensOf(ogon)
    stadFx(view)
    view.destroy({ children: true })
  }

  return { view, kika, locka, destroy }
}
