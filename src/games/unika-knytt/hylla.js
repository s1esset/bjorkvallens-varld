// hylla.js — VERKSTADSHYLLAN LEVER (poleringsrundan steg 5, 2026-09-10; docens §4 "Senare").
//
// Två leksaker kring hyllans tre bon i verkstan:
//   1. BÄRSKÅLEN på bänkens vänstra ände. Dra ett smultron till ett knytt i ett bo — det gapar,
//      tuggar och rapar en gnista (`Knytt.at()`). Tryck-sedan-tryck fungerar också (P0: ett drag
//      är svårt under ~4 år): tryck på skålen, sedan på ett bo. Drag och tap-tap bor i
//      `lib/DragController`, med hyllans bon som mål.
//   2. DRA UT ETT KNYTT på golvet. Det springer i en fil framför maskinen en stund och hoppar
//      sedan hem till sitt bo av sig självt. Tryck-sedan-tryck: tryck på knyttet, sedan på golvet.
//      Ett tryck på det TOMMA boet kallar hem det direkt.
//
// Geometri (designrymden): skålen på (96, 470), bäret vilar på (96, 446) och bär hela skålens
// träffyta — Circle r 64 kring skålens MITT → x 32–160 · y 406–534: 56 px till bälgen (från 216),
// 38 px till hyllans bon (från 572). Golvfilen är y 700, x 430–1030: framför väderveven, tratten och mönsterhjulets fot.
// Ett knytt på golvet är ovanpå verktygen i z-ordningen och har en EGEN träffyta som följer det —
// ett tryck på knyttet når knyttet, aldrig verktyget bakom. (Ett husdjur som springer över golvet
// kan inte ha en stillastående yta; regeln "noden som bär hitArea animeras aldrig" gäller släppmål.)
//
// Exit-säkert av konstruktion: springandet drivs i `tick`, hoppen tweenar ett {}-proxy som bara
// kopieras till levande noder, och `hemNu()` ställer tillbaka varje knytt i sitt bo i ett enda
// synkront steg — index.js kallar den före spaken, boden, en omritad hylla och destroy.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { sphereFill, topLightFill } from '../../lib/form.js'
import { shade } from '../../lib/theme.js'
import { landa, liv, pop, puff, stadFx } from '../../lib/feedback.js'

export const SKAL = { x: 96, y: 470 }
const BAR_HEM = { x: 96, y: 446 }
const BAR_R = 64
const GOLV_Y = 700
const GOLV_X0 = 430
const GOLV_X1 = 1030
/** Hur länge ett knytt springer på golvet innan det går hem av sig självt. */
export const UTE_S = 9
const FART = 150 // px/s
const DRAG_TROSKEL = 14
const VALD_S = 3 // hur länge ett tryckt knytt väntar på "tryck på golvet"
const TRA = 0xb98050
const INK = 0x3b2c22

const G = () => new Graphics()
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Ett smultron: hjärtformad frukt, gula frön, grön blomfoder — egen silhuett (P0 ASSETS).
function ritaSmultron(g, s = 1) {
  g.moveTo(0, 12 * s)
    .quadraticCurveTo(-13 * s, 2 * s, -9 * s, -7 * s)
    .quadraticCurveTo(0, -12 * s, 9 * s, -7 * s)
    .quadraticCurveTo(13 * s, 2 * s, 0, 12 * s)
    .closePath()
    .fill(sphereFill(0xe23b3b, { highlight: 0.45 }))
  for (const [x, y] of [[-4, -3], [3, -4], [-1, 2], [5, 2], [-5, 4], [1, 7]]) g.ellipse(x * s, y * s, 1 * s, 1.4 * s).fill(0xffe27a)
  g.star(0, -9 * s, 5, 7 * s, 2.6 * s).fill(0x4f9f3a)
}

/**
 * opts: { space, bon, boX, boY, audio, senare(s, fn), pa(h, d) }
 *   space — index.js `_spelLager` (designrymden; där bona bor, och där DragController mäter)
 *   bon   — index.js `_bon`, den LEVANDE listan { nod, inner, knytt } — läses vid varje behov
 *   pa('at', { i }) · pa('ute', { i }) · pa('hemma', { i })
 */
export function byggHyllliv(opts = {}) {
  const space = opts.space
  const bon = opts.bon || []
  const boX = opts.boX || []
  const boY = opts.boY ?? 620
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  const senareRa = typeof opts.senare === 'function' ? opts.senare : (s, fn) => setTimeout(fn, s * 1000)
  const sfx = (n) => audio?.sfx?.(n)
  const ton = (o) => audio?.tone?.(o)
  let levande = true
  const strax = (s, fn) => senareRa(s, () => { if (levande) fn() })
  let tweens = []
  const spara = (tw) => {
    if (tweens.length > 24) tweens = tweens.filter((x) => x && x.parent)
    tweens.push(tw)
    return tw
  }
  let klocka = 0

  // ---- skålen och högen (dekor) -----------------------------------------------------
  // En Graphics får inga barn i Pixi v8 (varning i konsolen), så högens smultron ritas i en
  // egen Container bredvid skålens Graphics, inte i den.
  const skal = new Container()
  skal.position.set(SKAL.x, SKAL.y)
  skal.eventMode = 'none'
  const skalG = G()
  skalG.ellipse(0, 34, 60, 11).fill({ color: INK, alpha: 0.16 })
  skalG.moveTo(-56, 0).quadraticCurveTo(-52, 34, 0, 36).quadraticCurveTo(52, 34, 56, 0).closePath().fill(topLightFill(TRA, { highlight: 0.24, dark: 0.26 }))
  skalG.ellipse(0, 0, 56, 13).fill(shade(TRA, 0.45))
  const hog = new Container()
  for (const [x, y, s] of [[-30, -4, 0.9], [-12, -9, 0.95], [10, -8, 0.9], [30, -3, 0.85], [0, -2, 0.9]]) {
    const b = G()
    ritaSmultron(b, s)
    b.position.set(x, y)
    hog.addChild(b)
  }
  const kant = G().ellipse(0, 0, 56, 13).stroke({ width: 3, color: shade(TRA, 0.15) })
  skal.addChild(skalG, hog, kant)
  for (const n of [skalG, hog, kant]) n.eventMode = 'none'
  space.addChild(skal)

  // Golvet: knytt som springer där ligger ovanpå verktygen (lagret läggs till EFTER dem).
  const golv = new Container()
  space.addChild(golv)

  // ---- bäret: dragbart, med tap-tap-fallback --------------------------------------------
  const dc = new DragController({ space, services: { audio } })
  let bar = null
  let atna = 0

  function nyttBar() {
    if (!levande || bar) return
    const v = new Container()
    const inner = new Container() // liv() äger y + rotation, pop() äger scale — i ett BARN
    const g = G()
    ritaSmultron(g, 1.35)
    g.eventMode = 'none'
    inner.addChild(g)
    inner.eventMode = 'none'
    v.addChild(inner)
    v.position.set(BAR_HEM.x, BAR_HEM.y)
    v.hitArea = new Circle(0, SKAL.y - BAR_HEM.y, BAR_R) // hela skålen är bärets yta, kring dess mitt
    space.addChild(v)
    liv(inner, { bob: 3, sway: 0.06, duration: 2.1, phase: 0.3 })
    pop(inner)
    dc.addItem(v, { typ: 'bar' }, {
      onCorrect: (rec, mal) => atFran(v, mal),
      onSelect: () => ton({ freq: 659, dur: 0.1, type: 'triangle', vol: 0.14 }),
    })
    bar = v
  }

  function atFran(v, mal) {
    const i = bon.findIndex((b) => b?.nod === mal?.view)
    const k = bon[i]?.knytt
    dc.removeItem(v)
    stadFx(v)
    if (!v.destroyed) v.destroy({ children: true })
    if (bar === v) bar = null
    if (k && !k.view?.destroyed) {
      k.at?.()
      atna++
      puff(space, boX[i], boY - 20, { count: 6, color: 0xffd0d0 })
      pa('at', { i })
    }
    strax(0.6, nyttBar)
  }

  // Hyllans bon är släppmålen. Samma noder hela spelets livstid (bara knytten i dem byts), så de
  // registreras EN gång; `accepts` läser läget vid släppet: bara ett bo med ett knytt HEMMA.
  bon.forEach((b, i) => {
    if (b?.nod) dc.addTarget(b.nod, () => !!bon[i]?.knytt && !bon[i]?.ute, { hitRadius: 58 })
  })
  nyttBar()

  // ---- ett knytt ute på golvet ---------------------------------------------------------------
  let ute = null // { i, knytt, hall, yta, lage: 'dras'|'hoppar'|'springer'|'hem'|'in', t, malX, paus, fas, tw }
  let drag = null // { i, sx, sy, moved, nod }
  let vald = null // { i, tills } — tap-tap: knyttet väntar på ett tryck på golvet
  let drogNyss = -1e9

  function taUt(i, p) {
    const b = bon[i]
    const k = b?.knytt
    if (!k || k.view.destroyed || ute) return false
    const hall = new Container()
    hall.position.set(p.x, p.y)
    golv.addChild(hall)
    hall.addChild(k.view)
    k.view.position.set(0, 0)
    const yta = new Container()
    yta.hitArea = new Circle(0, -40, 50)
    yta.eventMode = 'none'
    yta.cursor = 'pointer'
    yta.on('pointertap', () => {
      if (!levande || !ute || ute.lage !== 'springer') return
      ute.knytt.glad?.()
      ute.paus = Math.max(ute.paus, 0.5)
      pa('lek', { i: ute.i })
    })
    hall.addChild(yta)
    b.ute = true
    ute = { i, knytt: k, hall, yta, lage: 'dras', t: UTE_S, malX: p.x, paus: 0, fas: 0, tw: null }
    vald = null
    sfx('whoosh')
    pa('ute', { i })
    return true
  }

  /** Ett proxy-hopp i en båge — skrivs bara till en levande nod, och förra hoppet dör först. */
  function hoppa(till, hojd, dur, klar) {
    if (!ute) return
    const hall = ute.hall
    ute.tw?.kill()
    const x0 = hall.x
    const y0 = hall.y
    const st = { t: 0 }
    ute.tw = spara(gsap.to(st, {
      t: 1,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        if (hall.destroyed) return
        hall.x = x0 + (till.x - x0) * st.t
        hall.y = y0 + (till.y - y0) * st.t - Math.sin(st.t * Math.PI) * hojd
      },
      onComplete: () => { if (levande && ute?.hall === hall && !hall.destroyed) klar() },
    }))
  }

  function landaPaGolv(x) {
    if (!ute) return
    ute.lage = 'hoppar'
    hoppa({ x: klamp(x, GOLV_X0, GOLV_X1), y: GOLV_Y }, 60, 0.42, () => {
      landa(ute.knytt.view)
      sfx('tap')
      ute.lage = 'springer'
      ute.yta.eventMode = 'static'
      ute.malX = ute.hall.x
      ute.paus = 0.35
    })
  }

  // Tillbaka i boet: vyn flyttas hem SYNKRONT — ingen tween får ha den mitt emellan.
  function satIn() {
    if (!ute) return
    const { i, knytt, hall } = ute
    ute.tw?.kill()
    const b = bon[i]
    if (b && b.inner && !b.inner.destroyed && knytt && !knytt.view.destroyed) {
      b.inner.addChild(knytt.view)
      knytt.view.position.set(0, 4)
    }
    if (b) b.ute = false
    stadFx(hall)
    if (!hall.destroyed) hall.destroy({ children: true })
    ute = null
    pa('hemma', { i })
  }

  function gaHem() {
    if (!ute || ute.lage === 'hem' || ute.lage === 'in') return
    ute.lage = 'hem'
    ute.malX = boX[ute.i] ?? GOLV_X0
    ute.paus = 0
  }

  function hoppaIn() {
    if (!ute) return
    ute.lage = 'in'
    ute.yta.eventMode = 'none'
    hoppa({ x: boX[ute.i], y: boY }, 70, 0.5, () => {
      const i = ute.i
      const k = ute.knytt
      satIn()
      if (k && !k.view.destroyed) landa(k.view)
      puff(space, boX[i], boY, { count: 7, color: 0xffe6a8 })
      sfx('pop')
    })
  }

  // ---- index.js kallar ---------------------------------------------------------------------

  /** pointerdown på ett bo. Ett drag över tröskeln lyfter ut knyttet; annars blir det ett tryck. */
  function boNer(i, e) {
    if (!levande || ute || drag || dc.active || dc.selected) return
    const b = bon[i]
    if (!b?.knytt || b.ute) return
    const p = space.toLocal(e.global)
    drag = { i, sx: p.x, sy: p.y, moved: false, nod: b.nod }
    b.nod.on('globalpointermove', onDragMove)
    b.nod.on('pointerup', onDragUp)
    b.nod.on('pointerupoutside', onDragUp)
  }
  function onDragMove(e) {
    if (!drag || !levande) return
    const p = space.toLocal(e.global)
    if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > DRAG_TROSKEL) {
      if (!taUt(drag.i, p)) return
      drag.moved = true
    }
    if (drag.moved && ute?.lage === 'dras') ute.hall.position.set(klamp(p.x, 20, 1260), klamp(p.y, 40, 710))
  }
  function onDragUp(e) {
    if (!drag) return
    const d = drag
    drag = null
    d.nod.off('globalpointermove', onDragMove)
    d.nod.off('pointerup', onDragUp)
    d.nod.off('pointerupoutside', onDragUp)
    if (!d.moved || !ute) return
    drogNyss = performance.now()
    const p = e?.global ? space.toLocal(e.global) : { x: ute.hall.x, y: ute.hall.y }
    // Släppt nära sitt eget bo: det ville inte ut, det går tillbaka in.
    if (Math.hypot(p.x - boX[d.i], p.y - boY) < 70) hoppaIn()
    else landaPaGolv(p.x)
  }

  /**
   * pointertap på ett bo — index.js frågar INNAN den gör knyttet glatt. Returnerar
   * 'bar' (ett valt bär ska ätas — DragController tar det), 'drag' (trycket avslutade ett drag),
   * 'hem' (boets knytt är ute — det kallas hem) eller null (index gör sitt vanliga tryck, och
   * knyttet väntar `VALD_S` på ett tryck på golvet: tap-tap-vägen ut).
   */
  function boTryck(i) {
    if (!levande) return null
    if (dc.selected) return 'bar'
    if (performance.now() - drogNyss < 250) return 'drag'
    if (ute && ute.i === i) {
      if (ute.lage === 'springer' || ute.lage === 'hoppar') gaHem()
      return 'hem'
    }
    if (bon[i]?.knytt && !ute) {
      vald = { i, tills: klocka + VALD_S }
      pop(bon[i].inner, { scale: 1.1 })
    }
    return null
  }

  /** Ett tryck på bakgrunden i verkstan: skickar ut ett VALT knytt dit, om trycket är på golvet. */
  function golvTryck(p) {
    if (!levande || !vald || ute || klocka > vald.tills || !p || p.y < 530) return false
    const i = vald.i
    vald = null
    if (!taUt(i, { x: boX[i], y: boY })) return false
    landaPaGolv(p.x)
    return true
  }

  /** Alla hem NU, synkront (spaken, boden, en omritad hylla). Ett valt bär släpps också. */
  function hemNu() {
    if (drag) {
      drag.nod.off('globalpointermove', onDragMove)
      drag.nod.off('pointerup', onDragUp)
      drag.nod.off('pointerupoutside', onDragUp)
      drag = null
    }
    vald = null
    if (ute) satIn()
  }

  function tick(dtMS) {
    if (!levande) return
    const dt = Math.min(0.05, (Number.isFinite(dtMS) ? dtMS : 16) / 1000)
    klocka += dt
    if (!ute) return
    const hall = ute.hall
    if (hall.destroyed) {
      ute = null
      return
    }
    if (ute.lage === 'springer') {
      ute.t -= dt
      if (ute.t <= 0) gaHem()
    }
    if (ute.lage === 'springer' || ute.lage === 'hem') {
      if (ute.paus > 0) {
        ute.paus -= dt
        hall.y = GOLV_Y
      } else {
        const dx = ute.malX - hall.x
        if (Math.abs(dx) < 6) {
          if (ute.lage === 'hem') return hoppaIn()
          ute.paus = 0.4 + Math.random() * 0.8
          ute.malX = GOLV_X0 + Math.random() * (GOLV_X1 - GOLV_X0)
        } else {
          hall.x += Math.sign(dx) * Math.min(Math.abs(dx), FART * dt)
          ute.fas += dt
          hall.y = GOLV_Y - Math.abs(Math.sin(ute.fas * 11)) * 7 // små studsande steg
        }
      }
    }
  }

  function destroy() {
    if (!levande) return
    levande = false
    hemNu()
    for (const tw of tweens) tw?.kill()
    tweens = []
    dc.destroy()
    for (const n of [skal, golv, bar]) {
      if (!n || n.destroyed) continue
      stadFx(n)
      n.destroy({ children: true })
    }
    bar = null
  }

  return {
    boNer,
    boTryck,
    golvTryck,
    hemNu,
    tick,
    destroy,
    get ute() { return ute ? { i: ute.i, lage: ute.lage, x: ute.hall.x, y: ute.hall.y } : null },
    get valt() { return !!dc.selected },
    get atna() { return atna },
    get harBar() { return !!bar && !bar.destroyed },
  }
}
