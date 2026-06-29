// Återanvändbar dra-och-släpp för Pixi v8, byggd för småbarn (2–5 år).
// - Stora träffytor + generös snäpp-radie runt målen.
// - Snäpp tillbaka mjukt vid miss (aldrig en bestraffning).
// - "tap-tap"-fallback: tryck på föremålet, tryck sedan på målet (drag är svårt < ~4 år).
// - Draget överlever att fingret lämnar föremålet (globalpointermove på föremålet).
//
// Föremål och mål antas ligga i samma container ("space", designkoordinater).
import { gsap } from 'gsap'

export class DragController {
  constructor({ space, services }) {
    this.space = space
    this.services = services
    this.items = []
    this.targets = []
    this.active = null
    this.selected = null
    this._moveThreshold = 12
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
    if (rec.view.parent) rec.view.parent.setChildIndex(rec.view, rec.view.parent.children.length - 1)
    gsap.to(rec.view.scale, { x: rec.base.x * 1.12, y: rec.base.y * 1.12, duration: 0.12 })
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
    }
    if (rec.dragging) {
      rec.view.x = p.x + rec.grabDX
      rec.view.y = p.y + rec.grabDY
    }
  }

  _onUp(rec) {
    if (this.active !== rec) return
    this._detach(rec)
    this.active = null
    if (!rec.dragging) {
      gsap.to(rec.view.scale, { x: rec.base.x, y: rec.base.y, duration: 0.2 })
      this._toggleSelect(rec)
      return
    }
    this._resolveDrop(rec, this._targetUnder(rec.view.x, rec.view.y))
  }

  _detach(rec) {
    if (rec._move) rec.view.off('globalpointermove', rec._move)
    if (rec._up) {
      rec.view.off('pointerup', rec._up)
      rec.view.off('pointerupoutside', rec._up)
    }
    rec._move = rec._up = null
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
    if (target && target.accepts(rec.data)) {
      rec.placed = true
      rec.view.eventMode = 'none'
      gsap.to(rec.view, {
        x: target.view.x,
        y: target.view.y,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => rec.hooks.onCorrect?.(rec, target),
      })
    } else if (target) {
      this.services?.audio?.sfx('soft')
      rec.hooks.onWrong?.(rec, target)
      this._snapHome(rec)
    } else {
      this._snapHome(rec)
    }
  }

  _snapHome(rec) {
    gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.32, ease: 'back.out(1.4)' })
  }

  _restoreScale(rec) {
    gsap.to(rec.view.scale, { x: rec.base.x, y: rec.base.y, duration: 0.15 })
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
