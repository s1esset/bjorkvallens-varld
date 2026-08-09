// Vätska — partikelbaserad vätska (SPH-lik) + metaboll-rendering.
//
// Solvern är "double density relaxation" (Clavet m.fl.) i FRAMERUTOR, inte sekunder:
// hastighet = px/steg, gravitation = px/steg² — samma enheter som predictTrajectory()
// i physics.js. Steget är fast 1/60 s och ackumuleras precis som PhysicsWorld gör.
// Grannsökning via spatial hash (räknesortering), all data i typade arrayer.
//
// Renderingen är METABOLLAR: varje partikel ritas som en mjuk vit klick, hela lagret
// suddas och tröskeltestas i ett filter → klickarna smälter ihop till sammanhängande
// vätska med en ljus kant. Filtret körs i halv upplösning, det är där kostnaden ligger.
//
// Användning i ett spel:
//   this._fluid = new FluidWorld({ max: 360 })
//   this._fluid.addBox(640, 700, 400, 40)               // botten på ett kärl
//   this._fluidView = new FluidView(this.root, this._fluid, FLUIDS.vatten)
//   ctx.ticker.add(this._tick = (t) => {
//     this._fluid.spawn(640, 120, { vy: 3 })             // kran som rinner
//     this._fluid.update(t.deltaMS)
//     this._fluidView.update()
//   })
//   ...destroy(): ctx.ticker.remove(this._tick); this._fluidView.destroy(); this._fluid.destroy()
//
// OBS: alla rektanglar (addBox, countIn, drain) anges CENTRERAT (x, y = mitten),
// precis som PhysicsWorld.rectangle() — inte hörn.
import { Container, Sprite, Texture, Rectangle, BlurFilter, Filter, defaultFilterVert } from 'pixi.js'
import { DESIGN_W, DESIGN_H } from './theme.js'

// Förval per vätsketyp: färg, kantfärg och hur trögflytande den är.
// sigma/beta = viskositet (linjär/kvadratisk), rho0 = vilodensitet (packning).
export const FLUIDS = {
  // vanligt vatten — lättflytande, stänker
  vatten: { color: 0x39b7f0, edge: 0xc9efff, sigma: 0.04, beta: 0.10, rho0: 5, alpha: 0.95 },
  // saft/juice — som vatten men färgstarkare och lite tjockare
  saft: { color: 0xf2564b, edge: 0xffc9c4, sigma: 0.08, beta: 0.16, rho0: 5, alpha: 1 },
  // gegga/slem — trögt, hänger ihop i klumpar, rinner långsamt
  gegga: { color: 0x76c043, edge: 0xd8f7a8, sigma: 0.2, beta: 0.12, rho0: 6, alpha: 1 },
  // honung/gröt — mycket trögt, bygger högar
  honung: { color: 0xe8a121, edge: 0xffe3a3, sigma: 0.32, beta: 0.14, rho0: 6.5, alpha: 1 },
  // lava/choklad — trögt och mörkt
  choklad: { color: 0x6b3a1f, edge: 0xb07a4a, sigma: 0.28, beta: 0.14, rho0: 6.5, alpha: 1 },
  // tvålvatten — ljust, luftigt, nästan genomskinligt
  tval: { color: 0x9fd8ff, edge: 0xffffff, sigma: 0.05, beta: 0.12, rho0: 4.5, alpha: 0.8 },
}

export class FluidWorld {
  // max          hårt tak på antal partiklar (arrayerna allokeras en gång)
  // radius       interaktionsradie i px — även rutstorlek i grannrutnätet
  // gravityY/X   px/steg² (0.5 ≈ samma fall som resten av spelen)
  // rho0/k/kNear packning + tryckstyvhet. kNear håller isär partiklar (ingen kollaps)
  // sigma/beta   viskositet: linjär + kvadratisk. Höj för gegga, sänk för vatten
  // walls        vilka kanter i bounds som stoppar vätskan
  // restitution  studs mot vägg/kärl (0 = klet, 1 = studsboll)
  // wallFriction 0 = halkar fritt längs väggen, 1 = fastnar
  constructor({
    max = 400,
    radius = 26,
    gravityY = 0.5,
    gravityX = 0,
    rho0 = 5,
    k = 0.5,
    kNear = 3,
    sigma = 0.05,
    beta = 0.12,
    damp = 0.996,
    bounds = { left: 0, right: DESIGN_W, top: -800, bottom: DESIGN_H },
    walls = { left: true, right: true, bottom: true, top: false },
    restitution = 0.12,
    wallFriction = 0.25,
  } = {}) {
    this.max = max
    this.radius = radius
    this.pr = radius * 0.3 // fysisk "kroppsradie" mot väggar/kärl (mindre än interaktionsradien)
    this.gravityY = gravityY
    this.gravityX = gravityX
    this.rho0 = rho0
    this.k = k
    this.kNear = kNear
    this.sigma = sigma
    this.beta = beta
    this.damp = damp
    this.bounds = { ...bounds }
    this.walls = { ...walls }
    this.restitution = restitution
    this.wallFriction = wallFriction
    this.colliders = []
    this.count = 0
    this._alive = true
    this._acc = 0
    this._recycle = 0
    this._maxStep = radius * 0.6 // hastighetstak per steg → inga tunnlande partiklar

    this.x = new Float32Array(max)
    this.y = new Float32Array(max)
    this.px = new Float32Array(max)
    this.py = new Float32Array(max)
    this.vx = new Float32Array(max)
    this.vy = new Float32Array(max)
    this.pal = new Uint8Array(max) // visningsfärg per partikel (se FluidView.palette)
    this._rho = new Float32Array(max)
    this._rhoN = new Float32Array(max)
    this.ch = null // blandbara ingredienser per partikel — se setChannels()
    this._chN = 0
    this._chRate = 0

    // Grannrutnät: en ruta per interaktionsradie, en marginal runtom.
    this._gw = Math.ceil((bounds.right - bounds.left) / radius) + 4
    this._gh = Math.ceil((bounds.bottom - bounds.top) / radius) + 4
    const cells = this._gw * this._gh
    this._cellOf = new Int32Array(max)
    this._cellStart = new Int32Array(cells + 1)
    this._cursor = new Int32Array(cells + 1)
    this._sorted = new Int32Array(max)
    this._gridBuilt = false
  }

  // --- partiklar ---

  // Lägg till en partikel. När taket är nått återanvänds den äldsta (rullande),
  // så en kran kan rinna hur länge som helst utan att växa.
  // Blandbara "ingredienser" per partikel (t.ex. 3 kanaler = rött/gult/blått).
  // Partiklar som rör vid varandra jämnar ut sina mängder — det är riktig UTSPÄDNING
  // och mängden bevaras. Skillnaden mot att bara byta färg vid kontakt är avgörande:
  // en enda droppe grönt i ett glas gult ska INTE göra hela glaset grönt.
  // Spelet läser this.ch[k][i] och skriver en visningsfärg i this.pal[i].
  setChannels(count, rate = 0.06) {
    this.ch = []
    for (let k = 0; k < count; k++) this.ch.push(new Float32Array(this.max))
    this._chN = count
    this._chRate = rate
  }

  spawn(x, y, { vx = 0, vy = 0, pal = 0, ch = null } = {}) {
    let i
    if (this.count < this.max) {
      i = this.count++
    } else {
      i = this._recycle
      this._recycle = (this._recycle + 1) % this.max
    }
    this.x[i] = x
    this.y[i] = y
    this.px[i] = x - vx
    this.py[i] = y - vy
    this.vx[i] = vx
    this.vy[i] = vy
    this.pal[i] = pal
    if (this.ch && ch) for (let k = 0; k < this._chN; k++) this.ch[k][i] = ch[k] || 0
    return i
  }

  // Stänk: n partiklar i en kon åt håll `dir` (radianer, 0 = höger, -PI/2 = uppåt).
  splash(x, y, { count = 10, speed = 6, spread = 1.1, dir = -Math.PI / 2, jitter = 6, pal = 0 } = {}) {
    for (let n = 0; n < count; n++) {
      const a = dir + (Math.random() - 0.5) * spread
      const s = speed * (0.55 + Math.random() * 0.7)
      this.spawn(x + (Math.random() - 0.5) * jitter, y + (Math.random() - 0.5) * jitter, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        pal,
      })
    }
  }

  // Ta bort partikel i (byt-med-sista, så arrayerna förblir kompakta).
  _kill(i) {
    const last = --this.count
    if (i !== last) {
      this.x[i] = this.x[last]
      this.y[i] = this.y[last]
      this.px[i] = this.px[last]
      this.py[i] = this.py[last]
      this.vx[i] = this.vx[last]
      this.vy[i] = this.vy[last]
      this.pal[i] = this.pal[last]
      if (this.ch) for (let k = 0; k < this._chN; k++) this.ch[k][i] = this.ch[k][last]
    }
  }

  clear() {
    this.count = 0
    this._recycle = 0
    this._gridBuilt = false
  }

  // Hur många partiklar finns i rutan (CENTRERAD x,y,w,h)? För mål som "fyll glaset".
  countIn(x, y, w, h) {
    const hw = w / 2
    const hh = h / 2
    let n = 0
    for (let i = 0; i < this.count; i++) {
      if (Math.abs(this.x[i] - x) < hw && Math.abs(this.y[i] - y) < hh) n++
    }
    return n
  }

  // Sug bort vätska i en ruta (avlopp, mun, svamp). Returnerar antal borttagna.
  // `pal` begränsar till en sorts vatten: ett kärl kan då ta emot det som kom rätt
  // väg och låta spill rinna utanför, utan att spelet behöver egna partikelfält.
  drain(x, y, w, h, { max = Infinity, pal = null } = {}) {
    const hw = w / 2
    const hh = h / 2
    let n = 0
    for (let i = this.count - 1; i >= 0 && n < max; i--) {
      if (pal != null && this.pal[i] !== pal) continue
      if (Math.abs(this.x[i] - x) < hw && Math.abs(this.y[i] - y) < hh) {
        this._kill(i)
        n++
      }
    }
    return n
  }

  // Dra vätskan mot (eller från) en punkt — fingret som rör om. strength > 0 drar in.
  attract(x, y, r, strength) {
    const r2 = r * r
    for (let i = 0; i < this.count; i++) {
      const dx = x - this.x[i]
      const dy = y - this.y[i]
      const d2 = dx * dx + dy * dy
      if (d2 > r2 || d2 < 1e-6) continue
      const d = Math.sqrt(d2)
      const f = (strength * (1 - d / r)) / d
      this.vx[i] += dx * f
      this.vy[i] += dy * f
    }
  }

  forEach(cb) {
    for (let i = 0; i < this.count; i++) cb(this.x[i], this.y[i], i)
  }

  // --- kärl och hinder (planobjekt: flytta genom att sätta c.x/c.y direkt) ---

  // angle (radianer) får ändras i farten — så lutar man ett glas och häller ur det.
  addBox(x, y, w, h, angle = 0) {
    const c = { type: 'box', x, y, w, h, angle }
    this.colliders.push(c)
    return c
  }

  addCircle(x, y, r) {
    const c = { type: 'circle', x, y, r }
    this.colliders.push(c)
    return c
  }

  removeCollider(c) {
    const i = this.colliders.indexOf(c)
    if (i >= 0) this.colliders.splice(i, 1)
  }

  clearColliders() {
    this.colliders = []
  }

  // --- simulering ---

  update(deltaMS) {
    if (!this._alive) return
    const FIXED = 1000 / 60
    this._acc += Math.min(deltaMS || FIXED, 100)
    let steps = 0
    while (this._acc >= FIXED && steps < 3) {
      this._step()
      this._acc -= FIXED
      steps++
    }
    if (steps >= 3) this._acc = 0
  }

  _step() {
    const n = this.count
    if (!n) return
    const { x, y, px, py, vx, vy } = this

    // 1. gravitation + hastighetstak. Taket är en SÄKERHETSSPÄRR: utan det kan en
    // trög vätska (hög sigma/beta) skena, ge Infinity → NaN-positioner, och en
    // NaN-partikel drar med sig hela filtret. Vi klampar hastigheten, inte bara steget.
    const vmax = this._maxStep * 1.6
    for (let i = 0; i < n; i++) {
      vx[i] += this.gravityX
      vy[i] += this.gravityY
      const s = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
      if (s > vmax) {
        vx[i] = (vx[i] / s) * vmax
        vy[i] = (vy[i] / s) * vmax
      }
    }

    // 2. viskositet — använder rutnätet från förra steget (en rutbyggnad per steg räcker)
    if (this._gridBuilt && (this.sigma > 0 || this.beta > 0)) this._viscosity()

    // 3. flytta (och tak på steglängd så inget hoppar förbi en ruta)
    const mx = this._maxStep
    for (let i = 0; i < n; i++) {
      let sx = vx[i]
      let sy = vy[i]
      const s = Math.hypot(sx, sy)
      if (s > mx) {
        sx = (sx / s) * mx
        sy = (sy / s) * mx
      }
      px[i] = x[i]
      py[i] = y[i]
      x[i] += sx
      y[i] += sy
    }

    // 4. grannrutnät på de nya positionerna
    this._buildGrid()

    // 5. dubbeldensitets-relaxation (trycket som gör det till en vätska)
    this._relax()

    // 6. väggar och kärl
    this._collide()

    // 7. hastighet ur förflyttningen
    const d = this.damp
    for (let i = 0; i < n; i++) {
      vx[i] = (x[i] - px[i]) * d
      vy[i] = (y[i] - py[i]) * d
    }

    // 8. städa bort det som lämnat världen
    this._cull()
  }

  _cellIndex(x, y) {
    const gx = Math.min(this._gw - 1, Math.max(0, ((x - this.bounds.left) / this.radius + 2) | 0))
    const gy = Math.min(this._gh - 1, Math.max(0, ((y - this.bounds.top) / this.radius + 2) | 0))
    return gy * this._gw + gx
  }

  // Räknesortering av partikelindex per ruta → _sorted + _cellStart.
  _buildGrid() {
    const n = this.count
    const cellStart = this._cellStart
    const cursor = this._cursor
    const cellOf = this._cellOf
    cellStart.fill(0)
    for (let i = 0; i < n; i++) {
      const c = this._cellIndex(this.x[i], this.y[i])
      cellOf[i] = c
      cellStart[c + 1]++
    }
    for (let c = 1; c < cellStart.length; c++) cellStart[c] += cellStart[c - 1]
    cursor.set(cellStart)
    for (let i = 0; i < n; i++) this._sorted[cursor[cellOf[i]]++] = i
    this._gridBuilt = true
  }

  _viscosity() {
    const { x, y, vx, vy, _sorted: sorted, _cellStart: cs } = this
    const h = this.radius
    const gw = this._gw
    const umax = this._maxStep
    for (let i = 0; i < this.count; i++) {
      const c = this._cellOf[i]
      const cx = c % gw
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx
          if (nx < 0 || nx >= gw) continue
          const nc = c + dy * gw + dx
          if (nc < 0 || nc + 1 >= cs.length) continue
          for (let s = cs[nc]; s < cs[nc + 1]; s++) {
            const j = sorted[s]
            if (j <= i) continue // varje par en gång
            const rx = x[j] - x[i]
            const ry = y[j] - y[i]
            const r2 = rx * rx + ry * ry
            if (r2 >= h * h || r2 < 1e-6) continue
            const r = Math.sqrt(r2)
            const ux = rx / r
            const uy = ry / r
            let u = (vx[i] - vx[j]) * ux + (vy[i] - vy[j]) * uy
            if (u <= 0) continue
            if (u > umax) u = umax // kvadrattermen skenar annars vid höga farter
            const q = 1 - r / h
            const imp = 0.5 * q * (this.sigma * u + this.beta * u * u)
            vx[i] -= imp * ux
            vy[i] -= imp * uy
            vx[j] += imp * ux
            vy[j] += imp * uy
          }
        }
      }
    }
  }

  _relax() {
    const { x, y, _rho: rho, _rhoN: rhoN, _sorted: sorted, _cellStart: cs } = this
    const n = this.count
    const h = this.radius
    const gw = this._gw
    const ch = this.ch
    const chN = this._chN
    const chRate = this._chRate
    rho.fill(0, 0, n)
    rhoN.fill(0, 0, n)

    // densitet + närdensitet
    for (let i = 0; i < n; i++) {
      const c = this._cellOf[i]
      const cx = c % gw
      let d = 0
      let dn = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx
          if (nx < 0 || nx >= gw) continue
          const nc = c + dy * gw + dx
          if (nc < 0 || nc + 1 >= cs.length) continue
          for (let s = cs[nc]; s < cs[nc + 1]; s++) {
            const j = sorted[s]
            if (j === i) continue
            const rx = x[j] - x[i]
            const ry = y[j] - y[i]
            const r2 = rx * rx + ry * ry
            if (r2 >= h * h) continue
            const q = 1 - Math.sqrt(r2) / h
            d += q * q
            dn += q * q * q
            // utspädning vid riktig kontakt (q > 0.3), inte på håll. Symmetriskt →
            // summan bevaras: två droppar kan bara jämna ut sig, aldrig skapa mer färg.
            if (ch && q > 0.3) {
              const w = chRate * q
              for (let k = 0; k < chN; k++) {
                const a = ch[k]
                const mid = (a[i] + a[j]) * 0.5
                a[i] += (mid - a[i]) * w
                a[j] += (mid - a[j]) * w
              }
            }
          }
        }
      }
      rho[i] = d
      rhoN[i] = dn
    }

    // tryck → förskjutning (symmetrisk: halva på grannen, halva på mig)
    for (let i = 0; i < n; i++) {
      const P = this.k * (rho[i] - this.rho0)
      const PN = this.kNear * rhoN[i]
      const c = this._cellOf[i]
      const cx = c % gw
      let ax = 0
      let ay = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx
          if (nx < 0 || nx >= gw) continue
          const nc = c + dy * gw + dx
          if (nc < 0 || nc + 1 >= cs.length) continue
          for (let s = cs[nc]; s < cs[nc + 1]; s++) {
            const j = sorted[s]
            if (j === i) continue
            const rx = x[j] - x[i]
            const ry = y[j] - y[i]
            const r2 = rx * rx + ry * ry
            if (r2 >= h * h || r2 < 1e-6) continue
            const r = Math.sqrt(r2)
            const q = 1 - r / h
            const mag = 0.5 * (P * q + PN * q * q)
            const ux = (rx / r) * mag
            const uy = (ry / r) * mag
            x[j] += ux
            y[j] += uy
            ax -= ux
            ay -= uy
          }
        }
      }
      x[i] += ax
      y[i] += ay
    }
  }

  _collide() {
    const { x, y, px, py } = this
    const b = this.bounds
    const w = this.walls
    const pr = this.pr
    const rest = this.restitution
    const slip = 1 - this.wallFriction
    for (let i = 0; i < this.count; i++) {
      // kärl och hinder
      for (let c = 0; c < this.colliders.length; c++) {
        const o = this.colliders[c]
        if (o.type === 'box') {
          // Roterad låda: räkna om partikeln (och dess förra position) till lådans
          // eget koordinatsystem, lös kollisionen axelriktat där, och rotera tillbaka.
          // Det är så ett lutat glas kan hälla ur sig.
          const ex = o.w / 2 + pr
          const ey = o.h / 2 + pr
          const ang = o.angle || 0
          const ca = ang ? Math.cos(ang) : 1
          const sa = ang ? Math.sin(ang) : 0
          const dx = x[i] - o.x
          const dy = y[i] - o.y
          let lx = ang ? dx * ca + dy * sa : dx
          let ly = ang ? -dx * sa + dy * ca : dy
          if (Math.abs(lx) >= ex || Math.abs(ly) >= ey) continue
          const pdx = px[i] - o.x
          const pdy = py[i] - o.y
          let plx = ang ? pdx * ca + pdy * sa : pdx
          let ply = ang ? -pdx * sa + pdy * ca : pdy
          const ox = ex - Math.abs(lx)
          const oy = ey - Math.abs(ly)
          if (ox < oy) {
            lx = (lx < 0 ? -1 : 1) * ex
            const v = lx - plx
            plx = lx + v * rest
            ply = ly - (ly - ply) * slip
          } else {
            ly = (ly < 0 ? -1 : 1) * ey
            const v = ly - ply
            ply = ly + v * rest
            plx = lx - (lx - plx) * slip
          }
          x[i] = o.x + (ang ? lx * ca - ly * sa : lx)
          y[i] = o.y + (ang ? lx * sa + ly * ca : ly)
          px[i] = o.x + (ang ? plx * ca - ply * sa : plx)
          py[i] = o.y + (ang ? plx * sa + ply * ca : ply)
        } else {
          const dx = x[i] - o.x
          const dy = y[i] - o.y
          const rr = o.r + pr
          const d2 = dx * dx + dy * dy
          if (d2 >= rr * rr || d2 < 1e-6) continue
          const d = Math.sqrt(d2)
          const ux = dx / d
          const uy = dy / d
          x[i] = o.x + ux * rr
          y[i] = o.y + uy * rr
          const vX = x[i] - px[i]
          const vY = y[i] - py[i]
          const vn = vX * ux + vY * uy
          px[i] = x[i] - (vX - ux * vn * (1 + rest)) * slip
          py[i] = y[i] - (vY - uy * vn * (1 + rest)) * slip
        }
      }
      // världens kanter
      if (w.bottom && y[i] > b.bottom - pr) {
        y[i] = b.bottom - pr
        py[i] = y[i] + (y[i] - py[i]) * rest
        px[i] = x[i] - (x[i] - px[i]) * slip
      }
      if (w.top && y[i] < b.top + pr) {
        y[i] = b.top + pr
        py[i] = y[i] + (y[i] - py[i]) * rest
      }
      if (w.left && x[i] < b.left + pr) {
        x[i] = b.left + pr
        px[i] = x[i] + (x[i] - px[i]) * rest
      }
      if (w.right && x[i] > b.right - pr) {
        x[i] = b.right - pr
        px[i] = x[i] + (x[i] - px[i]) * rest
      }
    }
  }

  _cull() {
    const b = this.bounds
    const m = 240
    for (let i = this.count - 1; i >= 0; i--) {
      const x = this.x[i]
      const y = this.y[i]
      // Number.isFinite fångar även en partikel som skenat till NaN/Infinity —
      // en enda sådan skulle annars ge hela vätskelagret oändliga bounds.
      if (!Number.isFinite(x) || !Number.isFinite(y) || y > b.bottom + m || y < b.top - m || x < b.left - m || x > b.right + m) {
        this._kill(i)
      }
    }
  }

  destroy() {
    this._alive = false
    this.count = 0
    this.colliders = []
  }
}

// --- rendering: metabollar ---

// uUseTint = 1 → färgen kommer från partiklarnas egen tint (färg per partikel).
// Texturen är förmultiplicerad, så rgb/a ger tillbaka den alfa-viktade medelfärgen —
// det är DÄRFÖR två olika färgade vätskor tonar ihop sig där de möts.
const FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform vec3 uEdge;
uniform float uThreshold;
uniform float uSoft;
uniform float uOpacity;
uniform float uUseTint;

void main(void) {
    vec4 c = texture(uTexture, vTextureCoord);
    float a = c.a;
    float t = smoothstep(uThreshold - uSoft, uThreshold + uSoft, a);
    vec3 base = a > 0.003 ? c.rgb / a : vec3(1.0);
    vec3 body = uColor * mix(vec3(1.0), base, uUseTint);
    vec3 edgeCol = mix(uEdge, mix(body, vec3(1.0), 0.45), uUseTint);
    float inner = smoothstep(uThreshold + 0.04, uThreshold + 0.34, a);
    vec3 col = mix(edgeCol, body, inner);
    float o = t * uOpacity;
    finalColor = vec4(col * o, o);
}
`

let _blobTex = null
// Mjuk vit klick — delas av alla vyer (liten, skapas en gång, förstörs aldrig).
function blobTexture() {
  if (_blobTex && !_blobTex.destroyed) return _blobTex
  const size = 96
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  _blobTex = Texture.from(cv)
  return _blobTex
}

const rgb = (hex) => new Float32Array([((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255])

// Metaboll-filtret byggs EN gång per sida och återanvänds av varje FluidView.
//
// Vad som INTE är skälet — kontrollerat i Pixis källa, så nästa läsare slipper gissa:
// `Filter.from` går via `GlProgram.from`, som cachar per `vertex:fragment`-källa, och
// `Shader.destroy()` river inte det delade programmet (`destroyPrograms` är false som
// förval). Shadern kompileras alltså redan bara en gång per sida.
//
// Skälet är det som FAKTISKT är per vy: ett `Filter`-objekt, en `UniformGroup` och
// dess bind-grupper allokerades och revs vid varje montering. Att dela dem är den
// billigaste vägen att göra monteringen GL-tystare, i samma anda som
// `generateTexture`- och `FillGradient`-fällorna i CLAUDE.md.
//
// ⚠️ Läs mätningen rätt. Det såg först ut som en regression: ändringen flakade 2 av 8
// växelvisa rundor medan HEAD var ren. Nästa körning flakade HEAD SJÄLVT med
// `golvet-ar-lava:tom-scen`, utan en rad av ändringen inne. Slutläget över 11 rundor:
// HEAD 1, ändringen 2. Delningen behölls för att den är billigare — inte för att den
// bevisligen fixade något.
//
// Uniformerna är per vy, men bara ETT spel är monterat i taget — så den delade
// instansen räcker, och den vy som ändå skulle råka leva samtidigt får en egen.
let _thrDelad = null
let _thrUpptagen = false

function byggThr() {
  return Filter.from({
    // OBS: vertex måste anges explicit — Filter.from fyller inte i någon åt oss.
    gl: { vertex: defaultFilterVert, fragment: FRAG },
    resources: {
      fluidUniforms: {
        uColor: { value: rgb(0xffffff), type: 'vec3<f32>' },
        uEdge: { value: rgb(0xffffff), type: 'vec3<f32>' },
        uThreshold: { value: 0.42, type: 'f32' },
        uSoft: { value: 0.13, type: 'f32' },
        uOpacity: { value: 1, type: 'f32' },
        uUseTint: { value: 0, type: 'f32' },
      },
    },
  })
}

export class FluidView {
  // parent      Container att lägga vätskelagret i
  // world       FluidWorld att rita
  // color/edge  fyllnadsfärg + ljusare kantfärg (se FLUIDS)
  // blobScale   hur stor varje klick ritas relativt interaktionsradien
  // threshold   var vätskeytan går (högre = smalare strängar, mer separata droppar)
  // blur        suddningsstyrka — det är den som smälter ihop klickarna
  // resolution  filterupplösning (0.5 = halv = fjärdedels pixelkostnad)
  // palette   array av hex — sätt den för FÄRG PER PARTIKEL (world.pal[i] = index).
  //           Utan palette får hela vätskan färgen i `color`.
  // area      YTAN filtret körs över. Sätt den så snävt som vätskan kan nå — det är
  //           den enda knappen som faktiskt ändrar vad renderingen KOSTAR. Förvalet
  //           är hela designytan med marginal (1520×1080 → 760×540 rendermål vid
  //           resolution 0.5), och tre pass går över den varje bildruta. En lavaflod
  //           som bara upptar ett band är alltså 9× dyrare än den behöver vara — och
  //           i en svit med fyra parallella webbläsare betalas det i tappade
  //           WebGL-kontexter i ANDRA spel, inte i det här.
  constructor(parent, world, { color = 0x39b7f0, edge = 0xc9efff, alpha = 1, blobScale = 1.35, threshold = 0.42, soft = 0.13, blur = 9, quality = 2, resolution = 0.5, palette = null, area = null } = {}) {
    this.world = world
    this.palette = palette
    this.layer = new Container()
    // Lås filterytan. Två vinster: filtret kostar alltid lika mycket oavsett hur
    // vätskan sprider sig, och en skenande partikel kan aldrig spränga
    // renderingstexturen. Förvalet är hela designytan — skicka `area` när spelets
    // vätska bara kan nå en del av skärmen.
    this.layer.boundsArea = area || new Rectangle(-120, -240, DESIGN_W + 240, DESIGN_H + 360)
    parent.addChild(this.layer)

    const tex = blobTexture()
    const size = world.radius * blobScale * 2
    this._blobScale = blobScale
    this._sprites = []
    for (let i = 0; i < world.max; i++) {
      const s = new Sprite(tex)
      s.anchor.set(0.5)
      s.width = s.height = size
      s.visible = false
      this.layer.addChild(s)
      this._sprites.push(s)
    }

    this._blur = new BlurFilter({ strength: blur, quality, resolution })
    if (_thrUpptagen) {
      this._egetThr = true
      this._thr = byggThr()
    } else {
      _thrDelad = _thrDelad || byggThr()
      _thrUpptagen = true
      this._egetThr = false
      this._thr = _thrDelad
    }
    const u = this._thr.resources.fluidUniforms.uniforms
    u.uColor = rgb(palette ? 0xffffff : color)
    u.uEdge = rgb(edge)
    u.uThreshold = threshold
    u.uSoft = soft
    u.uOpacity = alpha
    u.uUseTint = palette ? 1 : 0
    this._thr.resolution = resolution
    this.layer.filters = [this._blur, this._thr]
  }

  // Byt vätskefärg i farten (blanda saft, smutsigt → rent vatten).
  setColor(color, edge) {
    const u = this._thr.resources.fluidUniforms.uniforms
    u.uColor = rgb(color)
    if (edge != null) u.uEdge = rgb(edge)
  }

  setOpacity(a) {
    this._thr.resources.fluidUniforms.uniforms.uOpacity = a
  }

  // Byt droppstorlek i farten (leksaksläge: små droppar ↔ stora klumpar).
  // Tröskeln följer med, annars smälter stora klickar ihop till en enda sörja.
  setBlobScale(scale, threshold) {
    this._blobScale = scale
    const size = this.world.radius * scale * 2
    for (const s of this._sprites) s.width = s.height = size
    if (threshold != null) this._thr.resources.fluidUniforms.uniforms.uThreshold = threshold
  }

  // Synka klickarna med partiklarna — kör efter world.update() varje bildruta.
  update() {
    const w = this.world
    const sp = this._sprites
    const n = w.count
    const pal = this.palette
    for (let i = 0; i < n; i++) {
      const s = sp[i]
      s.visible = true
      s.x = w.x[i]
      s.y = w.y[i]
      if (pal) {
        const t = pal[w.pal[i]] ?? 0xffffff
        if (s.tint !== t) s.tint = t
      }
    }
    for (let i = n; i < sp.length; i++) {
      if (!sp[i].visible) break
      sp[i].visible = false
    }
  }

  destroy() {
    this.layer.filters = []
    try {
      this._blur.destroy()
      // Det DELADE filtret rivs inte — det ska överleva till nästa montering, för
      // hela poängen är att GL-programmet bara kompileras en gång per sida. Det
      // håller inga per-bildruta-buffertar; rendermålen kommer ur Pixis pool och
      // lämnas tillbaka. Ett eget filter (två vyer samtidigt) rivs som vanligt.
      if (this._egetThr) this._thr.destroy()
      else _thrUpptagen = false
    } catch {
      /* noop */
    }
    this._sprites = []
    if (!this.layer.destroyed) this.layer.destroy({ children: true })
  }
}
