// Fysiköverlägg (FYSIKPLAN F9) — DEV-only, bara med `?fysik` i adressen.
//
// Ritar ovanpå allt, i ett eget Graphics på `world` (designrummet 1280×720, samma som
// Scaler skalar), det som annars bara syns i en sond:
//   cyan      kroppskontur, vaken dynamisk kropp (cirklar får en rotationsstreck)
//   blågrå    sovande kropp            grå  statisk kropp (väggar, ramper)
//   magenta   sensor (fylld, isSensor)
//   gul       led/constraint: linje + ankarpunkter (pointA/pointB, roterade med kroppen)
//   röd prick kontaktpunkt (engine.pairs, aktiva par)
//   grön pil  fart (px/steg × 8, tak 160 px)
//   RÖD RING  `statisk-fart` (R1): statisk kropp med fart > 0,5 px/steg som INTE flyttat sig
//             på ≥ 6 bildrutor — kvarliggande fart från setPosition(…, true); + röd fartpil
//   orange    kropp som snurrar > 1,5 rad/steg (R1 `snurr`)
//   bärnsten  hitArea (+ eventMode static/dynamic) på synliga noder: grepp, sikte, knappar
//
// RUM. Varje kropp ritas i det rum DESS Pixi-vy lever i: `PhysicsWorld._links[i].view.parent`
// är det koordinatsystem kroppens position skrivs i (kamera, förskjuten container). Punkterna
// mappas därifrån till överlägget med `toGlobal`/`toLocal` (tre prov → affin matris), så en
// kamera- eller letterbox-förskjutning följer med. Kroppar utan länk (väggar, hinkens kanter)
// ritas i världens FÖRSTA länkade vys rum; en värld helt utan länkar ritas i designrummet.
// Begränsning: en värld vars länkar bor i FLERA olika containrar ritar de olänkade kropparna i
// den första containerns rum.
//
// VÄRLDAR. Ingen ändring i physics.js: modulen lappar `PhysicsWorld.prototype._buildWalls`
// (anropas av konstruktorn → registrerar `this`) och `destroy` (avregistrerar) UTIFRÅN, på
// samma sätt som gamelog.js hakar på delade chokepunkter. Inga levande världar → inget ritas
// och Graphics förstörs (inget som lever kvar på lagret).
//
// RÄKNARE för mätning:  window.__fysikdebug = { konturer, kroppar, … }  uppdateras varje bildruta.
//   kroppar   Composite.allBodies() summerat över levande världar (räknas OBEROENDE av ritningen)
//   konturer  antal kroppskonturer som faktiskt ritades  → konturer === kroppar är kravet
//
// KOSTNAD. Utan `?fysik` laddas modulen aldrig (main.js gör en dynamisk import bakom
// `import.meta.env.DEV` + parametern). I bygget är hela grenen borta: markörsträngen nedan
// får aldrig finnas i dist/.
import { Graphics, Point } from 'pixi.js'
import { PhysicsWorld, Composite, VAKT_STAT_FART, VAKT_SNURR } from './physics.js'

export const MARKOR = 'fysikdebug-markor-q7x3'

const DEV = !!import.meta.env?.DEV

const FARG = {
  dyn: 0x00e5ff,
  sov: 0x7986cb,
  stat: 0x9e9e9e,
  sens: 0xff40ff,
  led: 0xffd600,
  kontakt: 0xff3d00,
  fart: 0x76ff03,
  statfart: 0xff1744,
  snurr: 0xff9100,
  hit: 0xffab00,
}
const PILSKALA = 8 // px per px/steg
const PILTAK = 160
const STILLA_RUTOR = 6
const MAX_KONTAKTER = 400

let svc = null
let g = null
let tick = null
let orig = null
let minne = new Map() // kropp-id → { x, y, n } (rutor utan förflyttning)
const varldar = new Set()

// Räknarna är ETT objekt som muteras (window.__fysikdebug pekar på det).
export const stat = {
  aktiv: false,
  varldar: 0,
  kroppar: 0,
  konturer: 0,
  leder: 0,
  kontakter: 0,
  pilar: 0,
  sensorer: 0,
  statiskFart: 0,
  snurr: 0,
  hitareor: 0,
  ruta: 0,
  markor: MARKOR,
}

function nollaRaknare() {
  stat.aktiv = false
  stat.varldar = stat.kroppar = stat.konturer = stat.leder = stat.kontakter = 0
  stat.pilar = stat.sensorer = stat.statiskFart = stat.snurr = stat.hitareor = 0
}

// ---------------------------------------------------------------- inkoppling

// Anropas av main.js (dev + ?fysik). `opt.test` släpper DEV-grinden för en Node-sond.
export function attach(services, opt = {}) {
  if ((!DEV && !opt.test) || svc) return
  svc = services
  const proto = PhysicsWorld.prototype
  orig = { bygg: proto._buildWalls, update: proto.update, destroy: proto.destroy }
  proto._buildWalls = function (...a) {
    varldar.add(this)
    return orig.bygg.apply(this, a)
  }
  // En värld som byggdes INNAN modulen hann laddas (en djuplänk, ett snabbt spelval) fångas
  // vid sitt första steg — utan detta såg överlägget noll världar i en uppmätt körning.
  proto.update = function (...a) {
    if (this._alive) varldar.add(this)
    return orig.update.apply(this, a)
  }
  proto.destroy = function (...a) {
    varldar.delete(this)
    return orig.destroy.apply(this, a)
  }
  if (!opt.test) {
    // Efter spelens ticker-steg (prio 0) men FÖRE Pixis render (−25): annars en bildruta efter.
    tick = () => ritaRuta()
    svc.app.ticker.add(tick, null, -10)
  }
  window.__fysikdebug = stat
}

export function detach() {
  if (!svc) return
  if (tick) svc.app.ticker.remove(tick)
  const proto = PhysicsWorld.prototype
  if (orig) {
    proto._buildWalls = orig.bygg
    proto.update = orig.update
    proto.destroy = orig.destroy
  }
  rensa()
  varldar.clear()
  minne.clear()
  nollaRaknare()
  delete window.__fysikdebug
  svc = tick = orig = null
}

function rensa() {
  if (g) {
    g.destroy()
    g = null
  }
}

// ---------------------------------------------------------------- rum

const S0 = new Point(0, 0)
const S1 = new Point(1, 0)
const S2 = new Point(0, 1)
const G0 = new Point()
const G1 = new Point()
const G2 = new Point()
const L0 = new Point()
const L1 = new Point()
const L2 = new Point()

// Matris nod-lokalt → överlägg-lokalt, ur tre prov via Pixis egna toGlobal/toLocal
// (följer med kamera, skala och letterbox utan att jag räknar med någons matrisordning).
function matrisAv(nod) {
  nod.toGlobal(S0, G0)
  nod.toGlobal(S1, G1)
  nod.toGlobal(S2, G2)
  g.toLocal(G0, undefined, L0)
  g.toLocal(G1, undefined, L1)
  g.toLocal(G2, undefined, L2)
  return { a: L1.x - L0.x, b: L1.y - L0.y, c: L2.x - L0.x, d: L2.y - L0.y, tx: L0.x, ty: L0.y }
}

const IDENT = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const mx = (M, x, y) => M.a * x + M.c * y + M.tx
const my = (M, x, y) => M.b * x + M.d * y + M.ty

function lagg(arr, M, x, y) {
  arr.push(mx(M, x, y), my(M, x, y))
}

// ---------------------------------------------------------------- ritning

function kontur(b, M) {
  const del = b.parts
  for (let i = del.length > 1 ? 1 : 0; i < del.length; i++) {
    const v = del[i].vertices
    const p = [] // NY lista per poly: Graphics sparar referensen, inte en kopia
    for (let k = 0; k < v.length; k++) lagg(p, M, v[k].x, v[k].y)
    g.poly(p, true)
  }
}

// Rotationsstreck för cirklar: mitt → ytan i kroppens vinkel.
function vridstreck(b, M) {
  if (!(b.circleRadius > 0)) return
  const x = b.position.x
  const y = b.position.y
  const ex = x + Math.cos(b.angle) * b.circleRadius
  const ey = y + Math.sin(b.angle) * b.circleRadius
  g.moveTo(mx(M, x, y), my(M, x, y)).lineTo(mx(M, ex, ey), my(M, ex, ey))
}

// Pil i design-/överläggsrum från världspunkt (x,y) med vektor (dx,dy) i världsrum.
function pil(M, x, y, dx, dy) {
  const x0 = mx(M, x, y)
  const y0 = my(M, x, y)
  let x1 = mx(M, x + dx, y + dy)
  let y1 = my(M, x + dx, y + dy)
  let l = Math.hypot(x1 - x0, y1 - y0)
  if (l < 1) return
  if (l > PILTAK) {
    x1 = x0 + ((x1 - x0) * PILTAK) / l
    y1 = y0 + ((y1 - y0) * PILTAK) / l
    l = PILTAK
  }
  const ux = (x1 - x0) / l
  const uy = (y1 - y0) / l
  const h = Math.min(10, l * 0.4)
  g.moveTo(x0, y0).lineTo(x1, y1)
  g.moveTo(x1 - ux * h - uy * h * 0.5, y1 - uy * h + ux * h * 0.5).lineTo(x1, y1).lineTo(x1 - ux * h + uy * h * 0.5, y1 - uy * h - ux * h * 0.5)
}

// Punktform i lokala koordinater → platt punktlista (cirkel/ellips som 24-hörning).
function formPunkter(s, ut) {
  ut.length = 0
  if (!s) return false
  if (s.points && s.points.length >= 6) {
    for (let i = 0; i < s.points.length; i++) ut.push(s.points[i])
    return true
  }
  if (s.halfWidth != null) {
    for (let i = 0; i < 24; i++) ut.push(s.x + Math.cos((i / 24) * 6.2832) * s.halfWidth, s.y + Math.sin((i / 24) * 6.2832) * s.halfHeight)
    return true
  }
  if (s.width != null && s.height != null) {
    ut.push(s.x, s.y, s.x + s.width, s.y, s.x + s.width, s.y + s.height, s.x, s.y + s.height)
    return true
  }
  if (s.radius != null) {
    for (let i = 0; i < 24; i++) ut.push(s.x + Math.cos((i / 24) * 6.2832) * s.radius, s.y + Math.sin((i / 24) * 6.2832) * s.radius)
    return true
  }
  const bb = s.getBounds?.()
  if (bb && bb.width != null) {
    ut.push(bb.x, bb.y, bb.x + bb.width, bb.y, bb.x + bb.width, bb.y + bb.height, bb.x, bb.y + bb.height)
    return true
  }
  return false
}

// Alla synliga noder med hitArea + eventMode static/dynamic. 'none' / interactiveChildren=false
// avskär hela grenen på samma sätt som Pixis egen träfftest.
function hitareor(rot, ut) {
  const stack = [rot]
  while (stack.length) {
    const n = stack.pop()
    if (!n || n === g || n.destroyed || !n.visible || n.renderable === false) continue
    if (n.eventMode === 'none') continue
    if (n.hitArea && (n.eventMode === 'static' || n.eventMode === 'dynamic')) ut.push(n)
    if (n.interactiveChildren === false) continue
    const k = n.children
    if (k) for (let i = 0; i < k.length; i++) stack.push(k[i])
  }
}

function ritaRuta() {
  for (const w of varldar) if (!w._alive) varldar.delete(w)
  if (!varldar.size) {
    if (g) rensa()
    minne.clear()
    nollaRaknare()
    stat.ruta++
    return
  }
  if (!g) {
    g = new Graphics()
    g.label = 'fysikdebug'
    g.eventMode = 'none'
  }
  const world = svc.world
  if (g.parent !== world || world.children[world.children.length - 1] !== g) world.addChild(g)
  g.clear()
  nollaRaknare()
  stat.aktiv = true
  stat.varldar = varldar.size

  const matriser = new Map() // container → matris, EN beräkning per bildruta
  const matrisFor = (cont) => {
    let M = matriser.get(cont)
    if (!M) {
      M = matrisAv(cont)
      matriser.set(cont, M)
    }
    return M
  }

  // hitArea underst (bakom kropparna).
  const hn = []
  hitareor(world, hn)
  const hp = []
  for (const n of hn) {
    if (!formPunkter(n.hitArea, hp)) continue
    const M = matrisAv(n)
    const p = []
    for (let i = 0; i < hp.length; i += 2) lagg(p, M, hp[i], hp[i + 1])
    g.poly(p, true)
    stat.hitareor++
  }
  if (stat.hitareor) g.fill({ color: FARG.hit, alpha: 0.07 }).stroke({ width: 1.5, color: FARG.hit, alpha: 0.7 })

  const nyttMinne = new Map()
  const dyn = []
  const sov = []
  const fast = []
  const sens = []
  const statfart = []
  const snurr = []
  const farter = []
  const kontakter = []
  const leder = []
  const ankare = []

  for (const w of varldar) {
    // Kroppens rum = rummet för dess länkade vys förälder.
    const kropps = new Map()
    let standard = null
    for (const l of w._links) {
      const v = l.view
      if (!v || v.destroyed || !v.parent) continue
      const M = matrisFor(v.parent)
      if (!standard) standard = M
      kropps.set(l.body, M)
    }
    standard = standard || IDENT
    const matFor = (b) => kropps.get(b) || kropps.get(b.parent) || standard

    const alla = Composite.allBodies(w.world)
    stat.kroppar += alla.length
    for (const b of alla) {
      const x = b.position.x
      const y = b.position.y
      if (!isFinite(x) || !isFinite(y)) continue
      const M = matFor(b)
      if (b.isSensor) {
        sens.push(b, M)
        stat.sensorer++
      } else if (b.isStatic) fast.push(b, M)
      else if (b.isSleeping) sov.push(b, M)
      else dyn.push(b, M)

      const f = Math.hypot(b.velocity.x, b.velocity.y)
      if (b.isStatic) {
        const m = minne.get(b.id)
        const n = m && Math.hypot(x - m.x, y - m.y) <= 0.5 ? m.n + 1 : 0
        nyttMinne.set(b.id, { x, y, n })
        if (f > VAKT_STAT_FART && n >= STILLA_RUTOR) {
          statfart.push(b, M)
          stat.statiskFart++
          farter.push(M, x, y, b.velocity.x, b.velocity.y, true)
        } else if (f > 0.4) {
          farter.push(M, x, y, b.velocity.x, b.velocity.y, false)
        }
      } else {
        if (!b.isSleeping && f > 0.4) farter.push(M, x, y, b.velocity.x, b.velocity.y, false)
        if (Math.abs(b.angularVelocity) > VAKT_SNURR) {
          snurr.push(b, M)
          stat.snurr++
        }
      }
    }

    // leder
    for (const c of Composite.allConstraints(w.world)) {
      const A = c.bodyA
      const B = c.bodyB
      const pa = c.pointA || { x: 0, y: 0 }
      const pb = c.pointB || { x: 0, y: 0 }
      let ax = pa.x
      let ay = pa.y
      let MA = standard
      if (A) {
        const ca = Math.cos(A.angle)
        const sa = Math.sin(A.angle)
        ax = A.position.x + pa.x * ca - pa.y * sa
        ay = A.position.y + pa.x * sa + pa.y * ca
        MA = matFor(A)
      }
      let bx = pb.x
      let by = pb.y
      let MB = standard
      if (B) {
        const cb = Math.cos(B.angle)
        const sb = Math.sin(B.angle)
        bx = B.position.x + pb.x * cb - pb.y * sb
        by = B.position.y + pb.x * sb + pb.y * cb
        MB = matFor(B)
      }
      if (!isFinite(ax + ay + bx + by)) continue
      leder.push(mx(MA, ax, ay), my(MA, ax, ay), mx(MB, bx, by), my(MB, bx, by))
      stat.leder++
    }

    // kontaktpunkter
    for (const p of w.engine.pairs.list) {
      if (!p.isActive || !(p.contactCount > 0)) continue
      const M = matFor(p.bodyA)
      for (let i = 0; i < p.contactCount; i++) {
        const v = p.contacts[i]?.vertex
        if (!v || kontakter.length >= MAX_KONTAKTER * 2) continue
        kontakter.push(mx(M, v.x, v.y), my(M, v.x, v.y))
        stat.kontakter++
      }
    }
  }
  minne = nyttMinne

  // — ritordning: yta först, sedan linjer, sist markeringar —
  const grupp = (lista, farg, alfa, fyll) => {
    if (!lista.length) return
    for (let i = 0; i < lista.length; i += 2) {
      kontur(lista[i], lista[i + 1])
      stat.konturer++
    }
    if (fyll) g.fill({ color: farg, alpha: fyll })
    g.stroke({ width: 2, color: farg, alpha: alfa })
  }
  grupp(fast, FARG.stat, 0.7, 0)
  grupp(sov, FARG.sov, 0.9, 0)
  grupp(sens, FARG.sens, 0.9, 0.15)
  // vaken dynamisk: kontur + rotationsstreck i SAMMA stroke
  if (dyn.length) {
    for (let i = 0; i < dyn.length; i += 2) {
      kontur(dyn[i], dyn[i + 1])
      vridstreck(dyn[i], dyn[i + 1])
      stat.konturer++
    }
    g.stroke({ width: 2, color: FARG.dyn, alpha: 0.95 })
  }

  if (leder.length) {
    for (let i = 0; i < leder.length; i += 4) g.moveTo(leder[i], leder[i + 1]).lineTo(leder[i + 2], leder[i + 3])
    g.stroke({ width: 2, color: FARG.led, alpha: 0.9 })
    for (let i = 0; i < leder.length; i += 4) {
      g.circle(leder[i], leder[i + 1], 3.5)
      g.circle(leder[i + 2], leder[i + 3], 3.5)
    }
    g.fill({ color: FARG.led, alpha: 0.95 })
  }

  // pilar: gröna, sedan röda (statisk-fart)
  for (const rod of [false, true]) {
    let n = 0
    for (let i = 0; i < farter.length; i += 6) {
      if (farter[i + 5] !== rod) continue
      pil(farter[i], farter[i + 1], farter[i + 2], farter[i + 3] * PILSKALA, farter[i + 4] * PILSKALA)
      n++
    }
    if (n) {
      g.stroke({ width: rod ? 3 : 2, color: rod ? FARG.statfart : FARG.fart, alpha: 0.95 })
      stat.pilar += n
    }
  }

  if (kontakter.length) {
    for (let i = 0; i < kontakter.length; i += 2) g.circle(kontakter[i], kontakter[i + 1], 4)
    g.fill({ color: FARG.kontakt, alpha: 0.95 })
  }

  const ring = (lista, farg, extra, bredd, fyll) => {
    if (!lista.length) return
    for (let i = 0; i < lista.length; i += 2) {
      const b = lista[i]
      const M = lista[i + 1]
      const x0 = mx(M, b.bounds.min.x, b.bounds.min.y)
      const y0 = my(M, b.bounds.min.x, b.bounds.min.y)
      const x1 = mx(M, b.bounds.max.x, b.bounds.max.y)
      const y1 = my(M, b.bounds.max.x, b.bounds.max.y)
      g.circle((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) / 2 + extra)
    }
    if (fyll) g.fill({ color: farg, alpha: fyll })
    g.stroke({ width: bredd, color: farg, alpha: 0.95 })
  }
  ring(snurr, FARG.snurr, 6, 3, 0)
  ring(statfart, FARG.statfart, 10, 4, 0.12)

  stat.ruta++
}

// För Node-sonden: en ruta utan ticker.
export function _ruta() {
  ritaRuta()
}
