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
import { ON as DIAG, logPhysics } from './gamelog.js'

const { Engine, Composite, Bodies, Body, Vector, Events } = Matter

// Materialförval (kropp-opts) — ger spelen "olika egenskaper" utan magiska tal:
// studsighet (restitution), täthet/massa (density), friktion, luftmotstånd.
export const MATERIALS = {
  // lätt & studsig (boll, gummi)
  bouncy: { restitution: 0.86, friction: 0.05, frictionAir: 0.004, density: 0.0010 },
  // standard
  normal: { restitution: 0.45, friction: 0.25, frictionAir: 0.01, density: 0.0015 },
  // tung & trög (sten, stor bajskorv) — mer massa = mer momentum, mindre studs
  heavy: { restitution: 0.18, friction: 0.5, frictionAir: 0.008, density: 0.0045 },
  // lätt & luftig (fjäder, liten korv) — bromsas av luft, lätt att blåsa iväg
  light: { restitution: 0.5, friction: 0.2, frictionAir: 0.05, density: 0.0005 },
  // klistrig (fastnar, studsar nästan inte)
  sticky: { restitution: 0.02, friction: 0.9, frictionAir: 0.02, density: 0.002 },
}

export class PhysicsWorld {
  // walls: vilka osynliga väggar som skapas ('floor','left','right','ceiling').
  // wallThickness/extra: tjocklek + hur långt utanför skärmen väggarna sträcker sig.
  // windAx/windAy: konstant vind-ACCELERATION (px/steg²) på alla dynamiska kroppar.
  constructor({ gravityY = 1, gravityX = 0, walls = ['floor', 'left', 'right'], wallThickness = 120, wallExtra = 200, windAx = 0, windAy = 0 } = {}) {
    this.engine = Engine.create()
    this.engine.gravity.x = gravityX
    this.engine.gravity.y = gravityY
    this.world = this.engine.world
    this._links = [] // { body, view, onUpdate? }
    this._alive = true
    this._acc = 0 // ackumulerad realtid för fast tidssteg
    this._windAx = windAx
    this._windAy = windAy
    this.walls = []
    this._buildWalls(walls, wallThickness, wallExtra)
    if (DIAG) this._diagInit({ gravityX, gravityY, walls, windAx, windAy })
  }

  // --- diagnostik (DEV-only; hela blocket viker ihop till inget i bygget) ---

  _diagInit(opts) {
    this._diag = { frames: 0, bodies: 0, collisions: 0, escaped: new Set(), maxSpeed: 0 }
    logPhysics('skapad', opts)
    // Lyssna på ALLA kollisioner, inte bara de spelet självt bryr sig om.
    Events.on(this.engine, 'collisionStart', (e) => {
      const d = this._diag
      d.collisions += e.pairs.length
      const p = e.pairs[0]
      if (!p) return
      const a = p.bodyA
      const b = p.bodyB
      const rel = Math.hypot((a.velocity.x - b.velocity.x), (a.velocity.y - b.velocity.y))
      logPhysics('kollision', {
        par: e.pairs.length,
        a: a.label || 'kropp',
        b: b.label || 'kropp',
        fartDiff: Number(rel.toFixed(1)),
        studs: Number(((a.restitution + b.restitution) / 2).toFixed(2)),
        friktion: Number(((a.friction + b.friction) / 2).toFixed(2)),
        totalt: d.collisions,
      })
    })
  }

  // Kör var 30:e bildruta: kroppsräkning, sovande, utrymningar, NaN, toppfart.
  _diagSample() {
    const d = this._diag
    const all = Composite.allBodies(this.world)
    let dyn = 0
    let sleeping = 0
    let maxSpeed = 0
    for (const b of all) {
      if (b.isStatic) continue
      dyn++
      if (b.isSleeping) sleeping++
      const { x, y } = b.position
      if (!isFinite(x) || !isFinite(y)) {
        logPhysics('nan-kropp', { label: b.label || 'kropp', x, y })
        continue
      }
      const s = Math.hypot(b.velocity.x, b.velocity.y)
      if (s > maxSpeed) maxSpeed = s
      const ute = x < -600 || x > DESIGN_W + 600 || y > DESIGN_H + 600 || y < -1200
      if (ute && !d.escaped.has(b.id)) {
        d.escaped.add(b.id)
        logPhysics('rymde', { label: b.label || 'kropp', x: Math.round(x), y: Math.round(y) })
      } else if (!ute && d.escaped.has(b.id)) {
        d.escaped.delete(b.id)
      }
    }
    if (maxSpeed > d.maxSpeed) d.maxSpeed = maxSpeed
    // >40 px/steg ≈ 2400 px/s: en boll kan hoppa förbi en tunn vägg mellan två steg.
    if (maxSpeed > 40) logPhysics('hog-fart', { fart: Math.round(maxSpeed), risk: 'tunnling' })
    logPhysics('prov', {
      kroppar: dyn,
      sovande: sleeping,
      statiska: all.length - dyn,
      lankar: this._links.length,
      toppfart: Math.round(d.maxSpeed),
      gravitation: this.engine.gravity.y,
      vind: this._windAx,
    })
  }

  // Sätt vind-acceleration (px/steg²). Verkar på alla dynamiska kroppar oavsett massa
  // (force = massa × acceleration), så lätta saker blåser iväg lika "naturligt".
  setWind(ax, ay = 0) {
    this._windAx = ax
    this._windAy = ay
  }

  get gravityY() {
    return this.engine.gravity.y
  }
  setGravity(y, x = this.engine.gravity.x) {
    this.engine.gravity.y = y
    this.engine.gravity.x = x
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
  // matter.js vill ha ETT FAST tidssteg — variabelt dt gör kollisioner/impulser
  // opålitliga (t.ex. en domino-kedja som inte fortplantar sig). Vi ackumulerar
  // realtid och kör fasta 1/60-steg (max 5 per bildruta för att undvika dödsspiral).
  update(deltaMS) {
    if (!this._alive) return
    const FIXED = 1000 / 60
    this._acc += Math.min(deltaMS || FIXED, 100) // klamp stora hopp (flik-byte)
    let steps = 0
    const windy = this._windAx !== 0 || this._windAy !== 0
    while (this._acc >= FIXED && steps < 5) {
      if (windy) {
        const bodies = Composite.allBodies(this.world)
        for (let b = 0; b < bodies.length; b++) {
          const body = bodies[b]
          if (body.isStatic || body.isSleeping) continue
          Body.applyForce(body, body.position, { x: body.mass * this._windAx, y: body.mass * this._windAy })
        }
      }
      Engine.update(this.engine, FIXED)
      this._acc -= FIXED
      steps++
    }
    if (steps >= 5) this._acc = 0 // släpp efterskott istället för att spiralera
    if (DIAG) {
      if (steps >= 5) logPhysics('svalt', { steg: steps, deltaMS: Math.round(deltaMS) })
      if (++this._diag.frames % 30 === 0) this._diagSample()
    }
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
    if (DIAG && this._diag) {
      logPhysics('riven', { kollisioner: this._diag.collisions, toppfart: Math.round(this._diag.maxSpeed), rutor: this._diag.frames })
    }
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

// Förutsäg en kastbana (för en prickad sikt-förhandsvisning). Lättviktig Euler-sim av
// en punktmassa under gravitation + vind, med valfri studs mot golv/väggar. Detta är
// en VISUELL guide (matchar matter ungefär, inte exakt) — spelen är ändå no-fail.
// gy/wx = px per steg² (tuna gy ~0.4–0.6 så pricklinjen följer kroppens verkliga fall).
export function predictTrajectory({ x, y, vx, vy, gy = 0.5, wx = 0, steps = 60, every = 3, floorY = null, leftX = null, rightX = null, restitution = 0.55, damp = 0.995 }) {
  const pts = []
  let px = x
  let py = y
  let pvx = vx
  let pvy = vy
  for (let i = 0; i < steps; i++) {
    pvy += gy
    pvx += wx
    pvx *= damp
    pvy *= damp
    px += pvx
    py += pvy
    if (floorY != null && py > floorY) {
      py = floorY
      pvy = -Math.abs(pvy) * restitution
    }
    if (leftX != null && px < leftX) {
      px = leftX
      pvx = Math.abs(pvx) * restitution
    }
    if (rightX != null && px > rightX) {
      px = rightX
      pvx = -Math.abs(pvx) * restitution
    }
    if (i % every === 0) pts.push({ x: px, y: py })
  }
  return pts
}

export { Matter, Body, Composite, Bodies, Vector }
