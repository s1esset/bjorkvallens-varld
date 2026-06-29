// Lättviktig brygga mellan matter.js (fysik) och Pixi (rendering).
// Bygg scenen i designkoordinater (1280x720); kropparna lever i samma rymd.
// Stega motorn på Pixi-tickern, synka display-objekt till kroppar, städa exit-säkert.
//
// Användning i ett spel:
//   this._phys = new PhysicsWorld({ gravityY: 1.4 })
//   const body = this._phys.circle(x, y, r, { restitution: 0.7 })
//   this._phys.link(body, pixiSprite)          // sprite.anchor.set(0.5)
//   ctx.ticker.add(this._tick = (t) => this._phys.update(t.deltaMS))
//   ...destroy(): ctx.ticker.remove(this._tick); this._phys.destroy()
import Matter from 'matter-js'
import { DESIGN_W, DESIGN_H } from './theme.js'

const { Engine, Composite, Bodies, Body, Events } = Matter

export class PhysicsWorld {
  // walls: vilka osynliga väggar som skapas ('floor','left','right','ceiling').
  // wallThickness/extra: tjocklek + hur långt utanför skärmen väggarna sträcker sig.
  constructor({ gravityY = 1, gravityX = 0, walls = ['floor', 'left', 'right'], wallThickness = 120, wallExtra = 200 } = {}) {
    this.engine = Engine.create()
    this.engine.gravity.x = gravityX
    this.engine.gravity.y = gravityY
    this.world = this.engine.world
    this._links = [] // { body, view, onUpdate? }
    this._alive = true
    this.walls = []
    this._buildWalls(walls, wallThickness, wallExtra)
  }

  _buildWalls(which, t, ex) {
    const W = DESIGN_W
    const H = DESIGN_H
    const opt = { isStatic: true, restitution: 0.4, friction: 0.6, label: 'wall' }
    const defs = {
      floor: [W / 2, H + t / 2, W + ex * 2, t],
      ceiling: [W / 2, -t / 2, W + ex * 2, t],
      left: [-t / 2, H / 2, t, H + ex * 2],
      right: [W + t / 2, H / 2, t, H + ex * 2],
    }
    for (const name of which) {
      const d = defs[name]
      if (!d) continue
      const b = Bodies.rectangle(d[0], d[1], d[2], d[3], opt)
      this.walls.push(b)
      Composite.add(this.world, b)
    }
  }

  // --- kropp-fabriker (designkoordinater) ---
  rectangle(x, y, w, h, opts = {}) {
    return this._add(Bodies.rectangle(x, y, w, h, opts))
  }

  circle(x, y, r, opts = {}) {
    return this._add(Bodies.circle(x, y, r, opts))
  }

  polygon(x, y, sides, r, opts = {}) {
    return this._add(Bodies.polygon(x, y, sides, r, opts))
  }

  _add(body) {
    Composite.add(this.world, body)
    return body
  }

  add(body) {
    return this._add(body)
  }

  // Koppla en Pixi-display till en kropp så den följer position+rotation varje steg.
  // onUpdate(view, body) kör efter synk om du vill lägga till egen logik.
  link(body, view, onUpdate) {
    const rec = { body, view, onUpdate }
    this._links.push(rec)
    return rec
  }

  // Ta bort en kropp (och sluta synka dess display). Förstör INTE Pixi-objektet.
  removeBody(body) {
    if (!body) return
    Composite.remove(this.world, body)
    const i = this._links.findIndex((l) => l.body === body)
    if (i >= 0) this._links.splice(i, 1)
  }

  // Antal aktiva (icke-statiska, länkade) kroppar.
  get count() {
    return this._links.length
  }

  onCollision(handler) {
    if (!this._alive) return
    Events.on(this.engine, 'collisionStart', handler)
    return () => Events.off(this.engine, 'collisionStart', handler)
  }

  // Stega fysiken och synka rendering. deltaMS från ctx.ticker.
  update(deltaMS) {
    if (!this._alive) return
    // Tak på steget så ett stort hopp (flik-byte/lagg) inte tunnlar genom väggar.
    const dt = Math.min(32, deltaMS || 16.67)
    Engine.update(this.engine, dt)
    const links = this._links
    for (let i = 0; i < links.length; i++) {
      const l = links[i]
      const v = l.view
      if (!v || v.destroyed) continue
      v.x = l.body.position.x
      v.y = l.body.position.y
      v.rotation = l.body.angle
      if (l.onUpdate) l.onUpdate(v, l.body)
    }
  }

  destroy() {
    this._alive = false
    try {
      Events.off(this.engine)
      Composite.clear(this.world, false)
      Engine.clear(this.engine)
    } catch {
      /* noop */
    }
    this._links = []
    this.walls = []
  }
}

// Bekvämt omslag: skjut en impuls/hastighet på en kropp.
export function nudge(body, vx, vy) {
  Body.setVelocity(body, { x: vx, y: vy })
}

export function applyForce(body, fx, fy) {
  Body.applyForce(body, body.position, { x: fx, y: fy })
}

export { Matter }
