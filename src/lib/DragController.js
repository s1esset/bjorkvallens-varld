// Återanvändbar dra-och-släpp för Pixi v8, byggd för småbarn (2–5 år).
// - Stora träffytor + generös snäpp-radie runt målen.
// - Snäpp tillbaka mjukt vid miss (aldrig en bestraffning).
// - "tap-tap"-fallback: tryck på föremålet, tryck sedan på målet (drag är svårt < ~4 år).
// - Draget överlever att fingret lämnar föremålet (globalpointermove på föremålet).
//
// Föremål och mål antas ligga i samma container ("space", designkoordinater).
//
// TYNGD (v1.69): ett föremål i handen följer fingret med en liten eftersläpning,
// lutar åt det håll det dras, kastar en mjuk skugga och landar med en tryckning.
// Eftersläpningen är BARA visuell — träffprövningen använder fingrets position
// (rec.tx/ty), aldrig den släpande bilden, så inget mål blir svårare att träffa.
import { Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { logDrag } from './gamelog.js'
import { landa } from './feedback.js'
import { ANIM } from './theme.js'

const FOLJ_LAG = 0.1 // s — hur långt efter fingret bilden ligger
const LUT_MAX = 0.22 // rad — taket för lutningen
const LUT_PER_PX = 0.008 // rad per px eftersläpning (uppmätt: 13 px släp -> ~6°)

export class DragController {
  // `skugga` är OPT-IN: ungefär hälften av spelen ritar redan en egen skugga under
  // sina föremål, och två skuggor som glider isär under ett snabbt drag syns direkt.
  // Eftersläpning, lutning och landning ärvs däremot av alla spel utan en rad kod.
  constructor({ space, services, skugga = false } = {}) {
    this.space = space
    this.services = services
    this.items = []
    this.targets = []
    this.active = null
    this.selected = null
    this._moveThreshold = 12
    this._skugga = skugga
  }

  addItem(view, data, hooks = {}) {
    view.eventMode = 'static'
    view.cursor = 'pointer'
    const rec = {
      view,
      data,
      hooks,
      home: { x: view.x, y: view.y },
      base: { x: view.scale.x || 1, y: view.scale.y || 1 },
      placed: false,
    }
    rec._down = (e) => this._onDown(rec, e)
    view.on('pointerdown', rec._down)
    this.items.push(rec)
    logDrag('foremal', { n: this.items.length, x: Math.round(view.x), y: Math.round(view.y), data: kort(data) })
    return rec
  }

  addTarget(view, accepts, { hitRadius = 120 } = {}) {
    const rec = { view, accepts, hitRadius }
    rec._tap = () => {
      if (this.selected && !this.selected.placed) {
        const item = this.selected
        this._deselect()
        this._resolveDrop(item, rec)
      }
    }
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.on('pointertap', rec._tap)
    this.targets.push(rec)
    return rec
  }

  _onDown(rec, e) {
    if (this.active || rec.placed) return
    this.active = rec
    rec.dragging = false
    const p = this.space.toLocal(e.global)
    rec.grabDX = rec.view.x - p.x
    rec.grabDY = rec.view.y - p.y
    rec.startX = p.x
    rec.startY = p.y
    rec.tx = rec.view.x
    rec.ty = rec.view.y
    if (rec.view.parent) rec.view.parent.setChildIndex(rec.view, rec.view.parent.children.length - 1)
    // Vilo-skalan pinnas medan föremålet är lyft: annars läser en pop() mitt i draget
    // den uppblåsta 1.12:an som ny bas (samma fälla som feedback.js beskriver).
    rec.view._fxRestScale = { x: rec.base.x, y: rec.base.y }
    rec.view._fxScaleBusy = true
    const s = ANIM.lift.scale
    gsap.to(rec.view.scale, {
      x: rec.base.x * s, y: rec.base.y * s,
      duration: ANIM.lift.duration, ease: ANIM.lift.ease,
    })
    if (!rec._tilting) rec.restRot = rec.view.rotation
    // Samma pinning för rotationen: ett spel som vinglar föremålet vid fel släpp
    // (feedback.wiggle) skulle annars läsa LUTNINGEN som föremålets vilo-vinkel.
    rec.view._fxRestRot = rec.restRot
    rec.view._fxWiggleBusy = true
    rec._shadow = this._skugga ? this._makeShadow(rec) : null
    rec._qx = gsap.quickTo(rec.view, 'x', { duration: FOLJ_LAG, ease: 'power2.out' })
    rec._qy = gsap.quickTo(rec.view, 'y', { duration: FOLJ_LAG, ease: 'power2.out' })
    rec._tick = () => this._dragTick(rec)
    gsap.ticker.add(rec._tick)
    rec._move = (ev) => this._onMove(rec, ev)
    rec._up = () => this._onUp(rec)
    rec.view.on('globalpointermove', rec._move)
    rec.view.on('pointerup', rec._up)
    rec.view.on('pointerupoutside', rec._up)
  }

  _onMove(rec, e) {
    if (this.active !== rec) return
    const p = this.space.toLocal(e.global)
    if (!rec.dragging && Math.hypot(p.x - rec.startX, p.y - rec.startY) > this._moveThreshold) {
      rec.dragging = true
      rec._tilting = true
    }
    if (rec.dragging) {
      rec.tx = p.x + rec.grabDX
      rec.ty = p.y + rec.grabDY
      rec._qx(rec.tx)
      rec._qy(rec.ty)
    }
  }

  // Körs varje bildruta medan något hålls: lutning ur eftersläpningen (blir automatiskt
  // proportionell mot farten) och skuggan under fingret, inte under den släpande bilden.
  _dragTick(rec) {
    const v = rec.view
    if (!v || v.destroyed) return
    if (rec.dragging) {
      const lag = rec.tx - v.x
      v.rotation = rec.restRot + clamp(lag * LUT_PER_PX, -LUT_MAX, LUT_MAX)
    }
    const sh = rec._shadow
    if (sh && !sh.destroyed) {
      sh.x = rec.tx
      sh.y = rec.ty + rec._shDY
    }
  }

  _onUp(rec) {
    if (this.active !== rec) return
    this._detach(rec)
    this.active = null
    logDrag('slapp', { dragen: !!rec.dragging, x: Math.round(rec.tx), y: Math.round(rec.ty), data: kort(rec.data) })
    if (!rec.dragging) {
      gsap.to(rec.view.scale, {
        x: rec.base.x, y: rec.base.y,
        duration: ANIM.settle.duration,
        onComplete: () => { rec.view._fxScaleBusy = false },
      })
      this._dropShadow(rec)
      this._levelOut(rec)
      this._toggleSelect(rec)
      return
    }
    this._resolveDrop(rec, this._targetUnder(rec.tx, rec.ty))
  }

  _detach(rec) {
    if (rec._tick) gsap.ticker.remove(rec._tick)
    rec._tick = null
    rec._qx = rec._qy = null
    if (rec._move) rec.view.off('globalpointermove', rec._move)
    if (rec._up) {
      rec.view.off('pointerup', rec._up)
      rec.view.off('pointerupoutside', rec._up)
    }
    rec._move = rec._up = null
  }

  // Mjuk ellipsskugga strax UNDER föremålet i dess egen förälder (aldrig i space —
  // föremålet kan ligga i ett underlager, och då hade en skugga i space hamnat över).
  _makeShadow(rec) {
    const parent = rec.view.parent
    if (!parent || parent.destroyed) return null
    if (rec._shR == null) {
      let b = null
      try {
        b = rec.view.getLocalBounds()
      } catch {
        b = null
      }
      const w = Math.abs((b?.width || 90) * (rec.base.x || 1))
      const h = Math.abs((b?.height || 90) * (rec.base.y || 1))
      rec._shR = clamp(w * 0.34, 26, 110)
      rec._shDY = clamp(h * 0.42, 18, 90)
    }
    const g = new Graphics()
    g.ellipse(0, 0, rec._shR, rec._shR * 0.4).fill({ color: 0x000000 })
    g.alpha = 0
    g.eventMode = 'none'
    g.x = rec.tx
    g.y = rec.ty + rec._shDY
    parent.addChild(g)
    parent.setChildIndex(g, Math.max(0, parent.children.length - 2))
    gsap.to(g, { alpha: 0.16, duration: ANIM.lift.duration })
    return g
  }

  _dropShadow(rec) {
    const g = rec._shadow
    rec._shadow = null
    if (!g || g.destroyed) return
    gsap.to(g, {
      alpha: 0,
      duration: 0.18,
      onComplete: () => {
        if (g.destroyed) return
        g.parent?.removeChild(g)
        g.destroy()
      },
    })
  }

  // Diagnostik: hur nära var man? Många missar strax utanför radien = för snål snäppyta.
  _narmastMal(x, y) {
    let d = Infinity
    let r = 0
    for (const t of this.targets) {
      const dd = Math.hypot(x - t.view.x, y - t.view.y)
      if (dd < d) {
        d = dd
        r = t.hitRadius
      }
    }
    return isFinite(d) ? { avstand: Math.round(d), radie: r, utanfor: Math.round(d - r) } : null
  }

  _targetUnder(x, y) {
    let best = null
    let bestD = Infinity
    for (const t of this.targets) {
      const d = Math.hypot(x - t.view.x, y - t.view.y)
      if (d < t.hitRadius && d < bestD) {
        bestD = d
        best = t
      }
    }
    return best
  }

  _resolveDrop(rec, target) {
    this._restoreScale(rec)
    this._dropShadow(rec)
    this._levelOut(rec)
    gsap.killTweensOf(rec.view, 'x,y')
    logDrag(target ? (target.accepts(rec.data) ? 'ratt' : 'fel-mal') : 'miss', {
      data: kort(rec.data),
      mal: target ? { x: Math.round(target.view.x), y: Math.round(target.view.y), radie: target.hitRadius } : null,
      slapp: { x: Math.round(rec.tx), y: Math.round(rec.ty) },
      narmast: target ? null : this._narmastMal(rec.tx, rec.ty),
    })
    if (target && target.accepts(rec.data)) {
      rec.placed = true
      rec.view.eventMode = 'none'
      // Översläng in i målet + en landningstryckning i stället för det döda power2.in-stoppet.
      gsap.to(rec.view, {
        x: target.view.x,
        y: target.view.y,
        duration: 0.24,
        ease: 'back.out(2.2)',
        onComplete: () => {
          landa(rec.view, { intensity: 0.8, base: rec.base })
          rec.hooks.onCorrect?.(rec, target)
        },
      })
    } else if (target) {
      this.services?.audio?.sfx('soft')
      rec.hooks.onWrong?.(rec, target)
      this._snapHome(rec)
    } else {
      this._snapHome(rec)
      rec.hooks.onMiss?.(rec)
    }
  }

  _snapHome(rec) {
    gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.32, ease: 'back.out(1.4)' })
  }

  _restoreScale(rec) {
    gsap.to(rec.view.scale, {
      x: rec.base.x, y: rec.base.y,
      duration: 0.15,
      onComplete: () => { rec.view._fxScaleBusy = false },
    })
  }

  // Tillbaka till vilo-rotationen efter lutningen.
  _levelOut(rec) {
    if (!rec._tilting) {
      rec.view._fxWiggleBusy = false
      return
    }
    gsap.to(rec.view, {
      rotation: rec.restRot || 0,
      duration: ANIM.settle.duration,
      ease: 'power2.out',
      onComplete: () => {
        rec._tilting = false
        rec.view._fxWiggleBusy = false
      },
    })
  }

  _toggleSelect(rec) {
    if (this.selected === rec) {
      this._deselect()
      return
    }
    this._deselect()
    this.selected = rec
    rec.hooks.onSelect?.(rec)
    this.services?.audio?.sfx('tap')
    rec._pulse = gsap.to(rec.view.scale, {
      x: rec.base.x * 1.1,
      y: rec.base.y * 1.1,
      duration: 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  }

  _deselect() {
    const rec = this.selected
    this.selected = null
    if (rec) {
      rec._pulse?.kill()
      rec._pulse = null
      gsap.to(rec.view.scale, { x: rec.base.x, y: rec.base.y, duration: 0.15 })
    }
  }

  /**
   * Avregistrera ETT föremål. Behövs av spel där föremål kommer och går under omgången
   * (mata-munnen öppnar och stänger skåp om och om igen) — utan detta ligger posten kvar
   * i `items` med en förstörd vy, och nästa träffsökning läser den.
   * Rör inte vyn i övrigt; anroparen äger den.
   */
  removeItem(view) {
    const i = this.items.findIndex((r) => r.view === view)
    if (i < 0) return null
    const rec = this.items[i]
    this.items.splice(i, 1)
    if (this.active === rec) this.active = null
    if (this.selected === rec) this._deselect()
    this._detach(rec)
    if (rec._down && !view.destroyed) view.off('pointerdown', rec._down)
    const sh = rec._shadow
    rec._shadow = null
    if (sh) {
      gsap.killTweensOf(sh)
      if (!sh.destroyed) {
        sh.parent?.removeChild(sh)
        sh.destroy()
      }
    }
    return rec
  }

  clear() {
    this._deselect()
    for (const rec of this.items) {
      this._detach(rec)
      if (rec._down) rec.view.off('pointerdown', rec._down)
      // Döda ev. pågående snäpp/skala-tweens så ett spel-exit mitt i en förflyttning
      // aldrig skriver till ett förstört Pixi-objekt (null-transform-krasch).
      if (!rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        rec.view._fxScaleBusy = false
      }
      // Skuggan lever i spelets lager — den måste dö med draget, inte med sin tween.
      const sh = rec._shadow
      rec._shadow = null
      if (sh) {
        gsap.killTweensOf(sh)
        if (!sh.destroyed) {
          sh.parent?.removeChild(sh)
          sh.destroy()
        }
      }
    }
    for (const t of this.targets) if (t._tap) t.view.off('pointertap', t._tap)
    this.items = []
    this.targets = []
    this.active = null
  }

  destroy() {
    this.clear()
  }
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

// Kort, ofarlig representation av godtycklig item-data för loggen.
function kort(d) {
  if (d == null) return null
  if (typeof d !== 'object') return String(d).slice(0, 40)
  const k = d.id ?? d.key ?? d.namn ?? d.name ?? d.typ ?? d.type
  return k != null ? String(k).slice(0, 40) : Object.keys(d).slice(0, 3).join(',')
}
