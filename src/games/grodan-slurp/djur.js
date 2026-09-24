// DJUREN OCH SAKERNA i Grodan Slurps nya världar (L6/L7) — bara BILDER. Kropparna, banorna och
// reglerna äger dammen.js/index.js/hinder.js; den här filen ritar det de visar.
//
// Ritkontraktet (docs/games/grodan-slurp.md §4i):
//  - Hindren ritas CENTRERADE kring origo (0, 0) = fysikkroppens mitt, fram/nos mot +x. Rullande
//    och fallande saker ritas i en Graphics `g` som roterar med kroppen; gående, simmande och
//    flygande djur i en Container `c` och får tillbaka `{ uppdatera(T, dt) }` som animerar ben,
//    vingar och svans. (Pillerbaggen är undantaget från "nos mot +x": den går BAKLÄNGES med
//    bakbenen på bollen, precis som en riktig pillerbagge — bollen ligger på +x.)
//  - Möblerna (L7) ritas i VÄRLDENS koordinater i Containern `R`, från golvet (y 528) upp till
//    `it.topp` (ovansidan på envägsplankan w × 26 som grodan landar på), centrerade på `it.x`.
//    De returnerar `{ svaj, uppdatera?, darra? }`: `darra(0..1)` stöter en dämpad fjäder som
//    `uppdatera` spelar upp (gelé, soffa, puff).
//  - `uppdatera(T, dt)`: T och dt i SEKUNDER. Skriver bara transform/alfa på egna noder och tål
//    att de är förstörda. Inga tweens, timers eller ticker — allt liv räknas ur T och dt.
//
// Regler (CLAUDE.md): gradientfyllningarna bara med FASTA palettfärger (varje färg bakas en
// gång och cachas); aldrig `arc()` — bågar är polylinjer (`bagPunkter`); aldrig
// `generateTexture`/`new FillGradient`; alla containrar `eventMode = 'none'`.
import { Container, Graphics } from 'pixi.js'
import { sphereFill, cylinderFill, topLightFill, verticalFill, verticalFillAlpha } from '../../lib/form.js'
import { shade } from '../../lib/theme.js'

const TAU = Math.PI * 2
const MARK = 528 // golvet/bänken i världen
const klam = (v, a, b) => (v < a ? a : v > b ? b : v)
const levd = (n) => !!n && !n.destroyed

// ---------------------------------------------------------------------------------------
// Verktyg
// ---------------------------------------------------------------------------------------
function nod(foralder, x = 0, y = 0) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  c.position.set(x, y)
  foralder.addChild(c)
  return c
}

function ritning(foralder) {
  const g = new Graphics()
  g.eventMode = 'none'
  foralder.addChild(g)
  return g
}

// Ett frö-styrt slumptal (mulberry32) — samma teckning varje gång för samma frö.
function fro(s) {
  let t = s >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// Punkter längs en ellipsbåge — i stället för arc() (V23-fällan).
function bagPunkter(cx, cy, rx, ry, a0, a1, n = 12) {
  const p = []
  for (let i = 0; i <= n; i++) {
    const v = a0 + ((a1 - a0) * i) / n
    p.push(cx + Math.cos(v) * rx, cy + Math.sin(v) * ry)
  }
  return p
}

// En öppen polylinje (för stroke).
function linje(g, p) {
  g.moveTo(p[0], p[1])
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1])
  return g
}

function stjarnPunkter(cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  const p = []
  for (let i = 0; i < n * 2; i++) {
    const v = rot + (i * Math.PI) / n
    const rr = i % 2 ? r : R
    p.push(cx + Math.cos(v) * rr, cy + Math.sin(v) * rr)
  }
  return p
}

// Ett hjärta (spetsen nedåt) som polygon — för präglingar och små dekorer.
function hjartPunkter(cx, cy, s) {
  const p = []
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * TAU
    const x = 16 * Math.sin(t) ** 3
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
    p.push(cx + (x * s) / 16, cy + (y * s) / 16)
  }
  return p
}

// En punkt och en normal på en kubisk bezier (svansar, ånga).
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
  const L = Math.hypot(dx, dy) || 1
  return { x, y, nx: -dy / L, ny: dx / L }
}

// En dämpad fjäder för darra(): x = utslag (negativt = hoptryckt), stegad med fasta delsteg
// så att gungningen inte beror på bildfrekvensen. En ny stöt mitt i en gungning adderas till
// farten — ingen hackig omstart från noll.
function fjader(w, zeta) {
  const s = { x: 0, v: 0 }
  return {
    stot(k) {
      s.v -= klam(Number(k) || 0, -1, 1) * w
    },
    steg(dt) {
      let rest = klam(Number(dt) || 0, 0, 0.1)
      while (rest > 1e-6) {
        const h = Math.min(rest, 1 / 120)
        s.v += (-w * w * s.x - 2 * zeta * w * s.v) * h
        s.x += s.v * h
        rest -= h
      }
      s.x = klam(s.x, -1.2, 1.2)
      if (Math.abs(s.x) < 1e-4 && Math.abs(s.v) < 1e-3) s.x = s.v = 0
      return s.x
    },
  }
}

const matt = (it, fallW, fallTopp) => {
  const w = Number(it?.w) > 0 ? Number(it.w) : fallW
  const topp = Number.isFinite(Number(it?.topp)) ? Number(it.topp) : fallTopp
  const x = Number.isFinite(Number(it?.x)) ? Number(it.x) : 0
  return { x, w, H: Math.max(40, MARK - topp) }
}

// =======================================================================================
// RULLANDE OCH FALLANDE SAKER — en Graphics som roterar med kroppen
// =======================================================================================

const KOKOS = { skal: 0x7b4a27, mork: 0x3e2410, ljus: 0xb07a45, fiber: 0x5a3417, hal: 0x2a160a }

/** Kokosnöt, r 17: hårig brun nöt med tovor runt kanten och tre "ögon". */
export function ritaKokosnot(g) {
  g.clear()
  const P = KOKOS
  const R = 17
  const s = fro(17)
  // Tovorna runt kanten sticker ut ur silhuetten — de gör rullningen synlig.
  for (let i = 0; i < 14; i++) {
    const v = (i / 14) * TAU + s() * 0.3
    const b = v + (s() - 0.5) * 0.6
    const r1 = R + 2.5 + s() * 2.5
    g.moveTo(Math.cos(v) * (R - 2), Math.sin(v) * (R - 2)).lineTo(Math.cos(b) * r1, Math.sin(b) * r1)
      .stroke({ width: 1.7, color: i % 2 ? P.ljus : P.skal, cap: 'round' })
  }
  g.circle(0, 0, R).fill(sphereFill(P.skal, { lightX: 0.35, lightY: 0.3, dark: 0.42 })).stroke({ width: 2, color: P.mork })
  // Fibrerna över skalet: korta böjda strån i en solrosspiral.
  for (let i = 0; i < 28; i++) {
    const v = i * 2.39996
    const rr = 2.5 + (i / 28) * 12.5
    const x = Math.cos(v) * rr
    const y = Math.sin(v) * rr
    const d = v + Math.PI / 2 + (s() - 0.5) * 0.8
    const L = 2.6 + s() * 2.4
    g.moveTo(x - Math.cos(d) * L, y - Math.sin(d) * L)
      .quadraticCurveTo(x + Math.cos(d + 1.2) * 1.4, y + Math.sin(d + 1.2) * 1.4, x + Math.cos(d) * L, y + Math.sin(d) * L)
      .stroke({ width: 1.2, color: i % 3 === 0 ? P.ljus : P.fiber, alpha: 0.75, cap: 'round' })
  }
  // De tre groparna i ena änden.
  for (const [x, y] of [[-4.5, -8.5], [3, -10], [-0.5, -4]]) {
    g.circle(x, y, 2.5).fill(P.hal)
    g.circle(x - 0.6, y - 0.7, 0.8).fill({ color: P.ljus, alpha: 0.7 })
  }
}

const BUSK = [0xb88b50, 0x9a6d3a, 0xd6b47c, 0x7d5528]

/** Buskboll (öknens rullbuske), r 28: ett trassligt, genomsiktigt nystan av torra kvistar. */
export function ritaBuskboll(g) {
  g.clear()
  const R = 28
  const s = fro(1 + Math.floor(Math.random() * 1e6))
  g.circle(0, 0, R - 4).fill({ color: 0x8a6334, alpha: 0.12 })
  // Långa böjda kvistar tvärs genom nystanet.
  for (let i = 0; i < 32; i++) {
    const a0 = s() * TAU
    const a1 = a0 + 1.1 + s() * 2.6
    const r0 = R * (0.6 + 0.4 * s())
    const r1 = R * (0.6 + 0.4 * s())
    const am = (a0 + a1) / 2 + (s() - 0.5) * 0.8
    const rm = R * (0.1 + 0.8 * s())
    g.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0)
      .quadraticCurveTo(Math.cos(am) * rm, Math.sin(am) * rm, Math.cos(a1) * r1, Math.sin(a1) * r1)
      .stroke({ width: 1.3 + s() * 1.5, color: BUSK[i % 4], cap: 'round' })
  }
  // Öglor som gör det till ett NYSTAN och inte ett streckmoln.
  for (let i = 0; i < 7; i++) {
    const v = s() * TAU
    const d = s() * R * 0.45
    const cx = Math.cos(v) * d
    const cy = Math.sin(v) * d
    const rx = 6 + s() * 8
    const ry = 3 + s() * 5
    const rot = s() * TAU
    const p = []
    for (let j = 0; j <= 16; j++) {
      const t = (j / 16) * TAU
      const ex = Math.cos(t) * rx
      const ey = Math.sin(t) * ry
      p.push(cx + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot))
    }
    linje(g, p).stroke({ width: 1.3, color: BUSK[(i + 1) % 4], alpha: 0.95 })
  }
  // Spröt med små gafflar som sticker ut ur nystanet.
  for (let i = 0; i < 12; i++) {
    const v = (i / 12) * TAU + s() * 0.4
    const r1 = R + 1 + s() * 5
    const x0 = Math.cos(v) * (R - 7)
    const y0 = Math.sin(v) * (R - 7)
    const x1 = Math.cos(v) * r1
    const y1 = Math.sin(v) * r1
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 1.4, color: BUSK[(i + 2) % 4], cap: 'round' })
    const gv = v + (i % 2 ? 0.5 : -0.5)
    const mx = (x0 + x1) / 2 + Math.cos(v) * 2
    const my = (y0 + y1) / 2 + Math.sin(v) * 2
    g.moveTo(mx, my).lineTo(mx + Math.cos(gv) * 5, my + Math.sin(gv) * 5).stroke({ width: 1.1, color: BUSK[(i + 3) % 4], cap: 'round' })
  }
}

const BADBOLL = [0xef4a3f, 0xfdfaf0, 0x3b8ee6, 0xffd23f, 0xfdfaf0, 0x4cc063]

/** Badboll, r 26: sex fält i svängda kilar kring ett vitt nav — rullningen syns direkt. */
export function ritaBadboll(g) {
  g.clear()
  const R = 26
  const som = (k, rho) => (k * TAU) / 6 + 0.6 * (rho / R) ** 1.4
  for (let k = 0; k < 6; k++) {
    const p = [0, 0]
    for (let i = 1; i <= 6; i++) {
      const rho = (R * i) / 6
      const v = som(k, rho)
      p.push(Math.cos(v) * rho, Math.sin(v) * rho)
    }
    const v0 = som(k, R)
    const v1 = som(k + 1, R)
    for (let i = 1; i <= 8; i++) {
      const v = v0 + ((v1 - v0) * i) / 8
      p.push(Math.cos(v) * R, Math.sin(v) * R)
    }
    for (let i = 5; i >= 1; i--) {
      const rho = (R * i) / 6
      const v = som(k + 1, rho)
      p.push(Math.cos(v) * rho, Math.sin(v) * rho)
    }
    g.poly(p).fill(BADBOLL[k])
  }
  for (let k = 0; k < 6; k++) {
    const p = []
    for (let i = 0; i <= 6; i++) {
      const rho = (R * i) / 6
      const v = som(k, rho)
      p.push(Math.cos(v) * rho, Math.sin(v) * rho)
    }
    linje(g, p).stroke({ width: 1, color: 0x2a2a3a, alpha: 0.18 })
  }
  // Volym: en skuggmåne mellan två lika stora cirklar (de möts exakt i kanten) och en glans.
  const skugga = [...bagPunkter(0, 0, R, R, -Math.PI / 4, (3 * Math.PI) / 4, 14), ...bagPunkter(-5, -5, R, R, (3 * Math.PI) / 4, -Math.PI / 4, 14)]
  g.poly(skugga).fill({ color: 0x0a1a30, alpha: 0.14 })
  g.circle(0, 0, 5.5).fill(0xfdfaf0).stroke({ width: 1.2, color: 0xc9c4b4 })
  g.circle(0.8, 0.8, 1.8).fill(0xd8d2c0)
  linje(g, bagPunkter(0, 0, R - 5.5, R - 5.5, Math.PI * 1.08, Math.PI * 1.4, 8)).stroke({ width: 3.5, color: 0xffffff, alpha: 0.6, cap: 'round' })
  g.circle(-12, -15, 1.8).fill({ color: 0xffffff, alpha: 0.75 })
  g.circle(0, 0, R).stroke({ width: 2, color: 0x5a4a4a, alpha: 0.7 })
}

const APELSIN = { skal: 0xf7941d, kant: 0xc0620c, por: 0xd9730f, blad: 0x5fae3e, bladK: 0x3a7a25, stjalk: 0x6b7a2a }

/** Apelsin, r 18: porigt skal, en liten stjälk och ett blad. */
export function ritaApelsin(g) {
  g.clear()
  const P = APELSIN
  const R = 18
  const s = fro(18)
  // Bladet först, så att stjälken sitter ovanpå dess bas.
  g.moveTo(1, -17).bezierCurveTo(5, -27, 14, -29, 18, -25).bezierCurveTo(14, -19, 7, -16, 1, -17).closePath()
    .fill(topLightFill(P.blad, { highlight: 0.3 })).stroke({ width: 1.5, color: P.bladK })
  g.moveTo(3, -18).quadraticCurveTo(10, -23, 16, -24.5).stroke({ width: 1, color: P.bladK, alpha: 0.7 })
  g.circle(0, 0, R).fill(sphereFill(P.skal, { lightX: 0.35, lightY: 0.3, dark: 0.3 })).stroke({ width: 2, color: P.kant })
  for (let i = 0; i < 26; i++) {
    const v = s() * TAU
    const rr = Math.sqrt(s()) * 15
    g.circle(Math.cos(v) * rr, Math.sin(v) * rr, 0.8 + s() * 0.6).fill({ color: P.por, alpha: 0.55 })
  }
  g.circle(0, -16.5, 2.6).fill(P.stjalk)
  g.ellipse(-6, -7, 5, 3).fill({ color: 0xffffff, alpha: 0.35 })
}

const LEKBOLL = { bas: 0xef5a78, kant: 0xa82a48, band: 0x3f86e0, bandK: 0x1f4f9a, stjarna: 0xffd23f, stjK: 0xc9950f }

/** Leksaksboll, r 22: blank rosaröd boll med ett blått band och en gul stjärna. */
export function ritaLeksaksboll(g) {
  g.clear()
  const P = LEKBOLL
  const R = 22
  g.circle(0, 0, R).fill(sphereFill(P.bas, { lightX: 0.35, lightY: 0.3, dark: 0.35 })).stroke({ width: 2, color: P.kant })
  // Bandet: två breddgrader sedda lite ovanifrån (framsidan buktar nedåt).
  const lutn = 0.35
  const lat = (h, t) => {
    const rl = Math.sqrt(R * R - h * h)
    return [rl * Math.cos(t), h * Math.cos(lutn) + rl * Math.sin(lutn) * Math.sin(t)]
  }
  const band = []
  for (let i = 0; i <= 16; i++) band.push(...lat(3, (Math.PI * i) / 16))
  for (let i = 16; i >= 0; i--) band.push(...lat(11, (Math.PI * i) / 16))
  g.poly(band).fill(P.band).stroke({ width: 1.5, color: P.bandK })
  g.poly(stjarnPunkter(-2, -9, 8, 3.4)).fill(P.stjarna).stroke({ width: 1.5, color: P.stjK, join: 'round' })
  g.ellipse(-10, -11, 4.5, 2.6).fill({ color: 0xffffff, alpha: 0.55 })
  g.circle(-5, -16, 1.4).fill({ color: 0xffffff, alpha: 0.7 })
}

/** Vattendroppe, r 11: spetsig uppåt, rund nedtill, blank och lite genomskinlig. */
export function ritaDroppe(g) {
  g.clear()
  const p = []
  for (let i = 0; i <= 12; i++) {
    const v = (Math.PI * i) / 12
    p.push(11 * Math.cos(v), 2 + 11 * Math.sin(v))
  }
  g.moveTo(0, -21).bezierCurveTo(3, -13, 11, -7, 11, 2)
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1])
  g.bezierCurveTo(-11, -7, -3, -13, 0, -21).closePath()
    .fill(verticalFillAlpha(0xd6f1ff, 0x3a9ee0, 0.8, 0.95)).stroke({ width: 1.8, color: 0x2d86c4 })
  g.ellipse(-4, -2, 2.4, 5).fill({ color: 0xffffff, alpha: 0.85 })
  g.circle(4.5, 6.5, 1.5).fill({ color: 0xffffff, alpha: 0.6 })
  g.moveTo(-6, 8).quadraticCurveTo(0, 12, 6, 8).stroke({ width: 1.5, color: 0xffffff, alpha: 0.45, cap: 'round' })
}

const TVAL = { bas: 0xf7a6c8, kant: 0xc0567f, ljus: 0xfcd3e4, bubbla: 0xffffff }

/** Tvålbit 52 × 28: rosa, rundad, ett präglat hjärta och bubblor på ovansidan. */
export function ritaTval(g) {
  g.clear()
  const P = TVAL
  g.roundRect(-26, -14, 52, 28, 11).fill(topLightFill(P.bas, { highlight: 0.35, dark: 0.22 })).stroke({ width: 2, color: P.kant })
  g.roundRect(-19, -8, 38, 16, 7).stroke({ width: 1.6, color: P.ljus, alpha: 0.9 })
  g.poly(hjartPunkter(0, 0, 6)).fill({ color: P.kant, alpha: 0.3 })
  g.roundRect(-20, -12, 24, 3, 1.5).fill({ color: 0xffffff, alpha: 0.55 })
  for (const [x, y, r] of [[-14, -16, 5], [-5, -19, 3.5], [9, -17, 6], [19, -14, 3]]) {
    g.circle(x, y, r).fill({ color: P.bubbla, alpha: 0.28 }).stroke({ width: 1.2, color: P.bubbla, alpha: 0.95 })
    g.circle(x - r * 0.35, y - r * 0.35, Math.max(0.8, r * 0.25)).fill({ color: 0xffffff, alpha: 0.95 })
  }
}

const SAPA = [0xff8fd0, 0xffe27a, 0x8ff0ff, 0xb99bff]

/** Såpbubbla, r 34: nästan genomskinlig, regnbågsskimmer i kanten och ett fönsterblänk. */
export function ritaSapbubbla(g) {
  g.clear()
  const R = 34
  g.circle(0, 0, R).fill({ color: 0xdff2ff, alpha: 0.14 })
  const band = [[0, 3.4, 4.9], [1, 4.8, 5.9], [2, 0.3, 1.9], [3, 1.8, 3.5]]
  for (const [i, a0, a1] of band) linje(g, bagPunkter(0, 0, R - 3, R - 3, a0, a1, 14)).stroke({ width: 4, color: SAPA[i], alpha: 0.5, cap: 'round' })
  linje(g, bagPunkter(0, 0, R - 8, R - 8, 0.5, 1.4, 8)).stroke({ width: 2.5, color: SAPA[0], alpha: 0.25, cap: 'round' })
  g.circle(0, 0, R).stroke({ width: 1.8, color: 0xffffff, alpha: 0.65 })
  // Fönsterblänket uppe till vänster: en krökt ruta mellan två radier.
  const f = [...bagPunkter(0, 0, R - 7, R - 7, 3.72, 4.3, 6), ...bagPunkter(0, 0, R - 15, R - 15, 4.3, 3.72, 6)]
  g.poly(f).fill({ color: 0xffffff, alpha: 0.75 })
  g.circle(-9, -25, 2.2).fill({ color: 0xffffff, alpha: 0.8 })
  g.circle(15, 18, 3).fill({ color: 0xffffff, alpha: 0.5 })
}

/** Träskets gasbubbla, r 26: grumlig oliv, halvgenomskinlig, dy-prickar och en liten reflex. */
export function ritaGasbubbla(g) {
  g.clear()
  const R = 26
  g.circle(0, 0, R).fill(verticalFillAlpha(0xb4bd62, 0x5f6a2c, 0.4, 0.66)).stroke({ width: 2, color: 0x4f5a22, alpha: 0.8 })
  g.circle(0, 0, R - 4).stroke({ width: 1.5, color: 0xd4dc96, alpha: 0.22 })
  for (const [x, y, r, a] of [[-8, 6, 2.2, 0.5], [6, 10, 1.6, 0.45], [10, -2, 1.3, 0.4], [-3, 14, 1.2, 0.4], [-12, -4, 1.1, 0.35], [2, 3, 1.5, 0.3]]) {
    g.circle(x, y, r).fill({ color: 0x3f4818, alpha: a })
  }
  linje(g, bagPunkter(0, 0, R - 6, R - 6, 3.6, 4.4, 7)).stroke({ width: 3.2, color: 0xeef5c0, alpha: 0.8, cap: 'round' })
  g.circle(-4, -19, 1.8).fill({ color: 0xeef5c0, alpha: 0.85 })
}

// =======================================================================================
// GÅENDE OCH SIMMANDE DJUR — en Container, animeras via uppdatera(T, dt)
// =======================================================================================

const KRABBA = { skal: 0xf0643a, kant: 0x9e2f16, ben: 0xe8563a, benK: 0xa33418, ljus: 0xffa27a, kind: 0xff9c9c, mun: 0x7a2412 }

/** Strandkrabba, kropp 110 × 44. Sedd framifrån: den går SIDLÄNGES (spelet flyttar den i ±x). */
export function ritaKrabba(c) {
  const P = KRABBA
  const kropp = nod(c)
  // Benen bakom skalet: fyra per sida, knät uppåt-utåt, foten på marken (y ≈ 22).
  const ben = []
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const n = nod(kropp, s * (13 + i * 7), 5 + i)
      const g = ritning(n)
      const ut = 11 + i * 3
      const p = [0, 0, s * ut, -6 + i * 1.5, s * (ut + 5 + i * 1.5), 17 - i * 1.5]
      linje(g, p).stroke({ width: 6.5 - i * 0.4, color: P.benK, cap: 'round', join: 'round' })
      linje(g, p).stroke({ width: 4.2 - i * 0.4, color: P.ben, cap: 'round', join: 'round' })
      ben.push({ n, s, fas: i * 1.7 + (s > 0 ? Math.PI : 0) })
    }
  }
  // Stjälkögonen — före skalet så att det täcker stjälkarnas rot.
  const ogon = []
  for (const s of [-1, 1]) {
    const n = nod(kropp, s * 9, -9)
    const g = ritning(n)
    g.moveTo(0, 0).lineTo(s * 3, -20).stroke({ width: 6.5, color: P.benK, cap: 'round' })
    g.moveTo(0, 0).lineTo(s * 3, -20).stroke({ width: 4.2, color: P.ben, cap: 'round' })
    g.circle(s * 3, -24, 7.5).fill(sphereFill(0xffffff, { lightX: 0.4, lightY: 0.3, dark: 0.14 })).stroke({ width: 1.8, color: P.kant })
    g.circle(s * 3 + 1.2, -23, 4).fill(0x1c1414)
    g.circle(s * 3 + 0.1, -24.6, 1.5).fill(0xffffff)
    ogon.push({ n, s })
  }
  // Armarna till klorna, bakom skalet.
  const arm = ritning(kropp)
  for (const s of [-1, 1]) {
    arm.moveTo(s * 32, 2).quadraticCurveTo(s * 46, 6, s * 50, -6).stroke({ width: 9, color: P.benK, cap: 'round' })
    arm.moveTo(s * 32, 2).quadraticCurveTo(s * 46, 6, s * 50, -6).stroke({ width: 6.2, color: P.ben, cap: 'round' })
  }
  // Skalet: en bred kupol med prickar, rosa kinder och ett brett leende.
  const sk = ritning(kropp)
  sk.moveTo(-40, 8).bezierCurveTo(-44, -22, 44, -22, 40, 8).bezierCurveTo(30, 18, -30, 18, -40, 8).closePath()
    .fill(sphereFill(P.skal, { lightX: 0.4, lightY: 0.25, dark: 0.35 })).stroke({ width: 2.5, color: P.kant })
  sk.moveTo(-36, 4).bezierCurveTo(-20, 10, 20, 10, 36, 4).stroke({ width: 2, color: P.kant, alpha: 0.4 })
  for (const [x, y, r] of [[-18, -8, 2.6], [-6, -11.5, 2], [8, -11, 2.4], [20, -7, 2], [-27, -1, 1.6], [28, 0, 1.6]]) sk.circle(x, y, r).fill({ color: P.ljus, alpha: 0.6 })
  sk.ellipse(-15, 3, 5, 3).fill({ color: P.kind, alpha: 0.55 })
  sk.ellipse(15, 3, 5, 3).fill({ color: P.kind, alpha: 0.55 })
  sk.moveTo(-8, 1.5).quadraticCurveTo(0, 9, 8, 1.5).stroke({ width: 2.2, color: P.mun, cap: 'round' })
  // Klorna: runda "vantar" — handen och en tumme som öppnar och stänger sig. Inga spetsar.
  const klor = []
  for (const s of [-1, 1]) {
    const klo = nod(kropp, s * 53, -12)
    klo.scale.x = s
    const tumme = nod(klo, -5, -5)
    ritning(tumme).ellipse(7, -4, 10, 6).fill(sphereFill(P.skal, { lightX: 0.35, lightY: 0.3, dark: 0.3 })).stroke({ width: 2, color: P.kant })
    const kg = ritning(klo)
    kg.ellipse(0, 3, 12.5, 10).fill(sphereFill(P.skal, { lightX: 0.35, lightY: 0.3, dark: 0.3 })).stroke({ width: 2, color: P.kant })
    kg.ellipse(-3, -1, 4, 2.4).fill({ color: 0xffffff, alpha: 0.4 })
    klor.push({ tumme, s })
  }
  return {
    uppdatera(T) {
      if (!levd(kropp)) return
      kropp.y = -Math.abs(Math.sin(T * 9)) * 1.6
      for (const b of ben) if (levd(b.n)) b.n.rotation = b.s * 0.24 * Math.sin(T * 16 + b.fas)
      for (const k of klor) if (levd(k.tumme)) k.tumme.rotation = -(0.08 + 0.28 * (0.5 + 0.5 * Math.sin(T * 3.1 + k.s)))
      for (const o of ogon) if (levd(o.n)) o.n.rotation = 0.1 * Math.sin(T * 2.3 + o.s * 1.3)
    },
  }
}

const BAGGE = { kropp: 0x2e3860, kant: 0x121726, glans: 0x8fb0ff, ben: 0x1e2438, benL: 0x3a4670, boll: 0x7b4a26, bollM: 0x4a2a12, bollL: 0x9a6536, halm: 0xe6c56a, halmM: 0xb8953a }

/**
 * Pillerbagge med bajsboll, kropp 160 × 60. Bollen (r 34) ligger på +x och baggen skjuter den
 * baklänges med bakbenen, huvudet nere vid marken. `uppdatera(T, dt, fart?)` rullar bollen —
 * `fart` i px/s (tecknet = riktning i den egna ramen); utan den ~40 px/s framåt.
 */
export function ritaPillerbagge(c) {
  const P = BAGGE
  const R = 34
  const MARKY = 30
  const bx = -30
  const by = 1
  const rot = -0.38
  const co = Math.cos(rot)
  const si = Math.sin(rot)
  const W = (x, y) => [bx + x * co - y * si, by + x * si + y * co]

  const ben = []
  const benNod = (hx, hy, knX, knY, fx, fy, fram, fas) => {
    const [x, y] = W(hx, hy)
    const n = nod(c, x, y)
    const g = ritning(n)
    const p = [0, 0, knX - x, knY - y, fx - x, fy - y]
    linje(g, p).stroke({ width: fram ? 4.6 : 4, color: fram ? P.ben : P.kant, cap: 'round', join: 'round', alpha: fram ? 1 : 0.8 })
    if (fram) linje(g, [0, 0, knX - x, knY - y]).stroke({ width: 1.4, color: P.benL, alpha: 0.8, cap: 'round' })
    g.circle(fx - x, fy - y, fram ? 2.6 : 2.2).fill(fram ? P.ben : P.kant)
    ben.push({ n, fas, amp: hx > 10 ? 0.12 : 0.28 })
  }
  // Bortre benen bakom kroppen — och båda frambenen, som går in under huvudet och fram till
  // marken framför det (ovanpå huvudet korsade de ansiktet).
  benNod(-22, 10, -54, 28, -68, MARKY, false, 0.9)
  benNod(-4, 13, -20, 20, -30, MARKY, false, 2.6)
  benNod(18, 11, 2, 22, 13.5, 8, false, 1.4)
  benNod(-20, 12, -58, 26, -78, MARKY, true, 0)

  // Bollen: egen nod som rullar.
  const boll = nod(c, 46, MARKY - R)
  const bg = ritning(boll)
  const s = fro(34)
  for (let i = 0; i < 11; i++) {
    const v = (i / 11) * TAU + s() * 0.3
    bg.circle(Math.cos(v) * (R - 3), Math.sin(v) * (R - 3), 5 + s() * 3).fill(sphereFill(P.boll, { lightX: 0.35, lightY: 0.3, dark: 0.4 })).stroke({ width: 2, color: P.bollM })
  }
  bg.circle(0, 0, R - 1).fill(sphereFill(P.boll, { lightX: 0.35, lightY: 0.3, dark: 0.4 }))
  for (let i = 0; i < 9; i++) {
    const v = s() * TAU
    const rr = Math.sqrt(s()) * (R - 8)
    bg.ellipse(Math.cos(v) * rr, Math.sin(v) * rr, 3 + s() * 4, 2 + s() * 3).fill({ color: i % 3 ? P.bollM : P.bollL, alpha: 0.45 })
  }
  // Halmstrån — några sticker ut ur bollen, så rullningen syns i silhuetten.
  for (let i = 0; i < 9; i++) {
    const v = s() * TAU
    const r0 = (i < 4 ? R - 6 : Math.sqrt(s()) * (R - 12))
    const r1 = i < 4 ? R + 7 + s() * 4 : r0 + 8
    const x0 = Math.cos(v) * r0
    const y0 = Math.sin(v) * r0
    const d = i < 4 ? v + (s() - 0.5) * 0.5 : s() * TAU
    const x1 = i < 4 ? Math.cos(d) * r1 : x0 + Math.cos(d) * 10
    const y1 = i < 4 ? Math.sin(d) * r1 : y0 + Math.sin(d) * 10
    bg.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 3.2, color: P.halmM, cap: 'round' })
    bg.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 1.8, color: P.halm, cap: 'round' })
  }
  bg.ellipse(-12, -14, 9, 5).fill({ color: 0xffffff, alpha: 0.16 })

  // Skalbaggen, lutad med bakdelen upp mot bollen.
  const bagge = nod(c, bx, by)
  bagge.rotation = rot
  const kg = ritning(bagge)
  kg.ellipse(6, 0, 28, 18).fill(sphereFill(P.kropp, { lightX: 0.4, lightY: 0.22, highlight: 0.5, dark: 0.45 })).stroke({ width: 2.2, color: P.kant })
  kg.moveTo(-18, -3).quadraticCurveTo(8, -12, 33, -1).stroke({ width: 1.4, color: P.kant, alpha: 0.6 })
  for (let i = 0; i < 3; i++) kg.moveTo(-14, 3 + i * 4.5).quadraticCurveTo(8, -4 + i * 4.5, 31, 3 + i * 3).stroke({ width: 1, color: P.glans, alpha: 0.18 })
  kg.moveTo(-8, -12).quadraticCurveTo(8, -18, 22, -12).stroke({ width: 3.2, color: P.glans, alpha: 0.6, cap: 'round' })
  kg.circle(-4, -10, 1.6).fill({ color: 0xffffff, alpha: 0.7 })
  // Halsskölden.
  kg.ellipse(-21, 3, 12.5, 12).fill(sphereFill(P.kropp, { lightX: 0.4, lightY: 0.22, highlight: 0.5, dark: 0.45 })).stroke({ width: 2, color: P.kant })
  kg.moveTo(-28, -5).quadraticCurveTo(-21, -9.5, -14, -6).stroke({ width: 2.2, color: P.glans, alpha: 0.55, cap: 'round' })
  // Huvudet: en rundad skovel med tre små flikar, antenn med klubba, ett vänligt öga.
  kg.moveTo(-38, -1).lineTo(-46, -9).stroke({ width: 1.8, color: P.ben, cap: 'round' })
  for (const [dx, dy] of [[-3.4, -1.6], [-1.4, -3.8], [1.2, -3.6]]) kg.moveTo(-46, -9).lineTo(-46 + dx, -9 + dy).stroke({ width: 1.8, color: P.ben, cap: 'round' })
  for (const [x, y] of [[-44, 5], [-44.5, 10.5], [-42.5, 15.5]]) kg.circle(x, y, 3.1).fill(sphereFill(P.kropp, { lightX: 0.4, lightY: 0.22, highlight: 0.5, dark: 0.45 })).stroke({ width: 1.2, color: P.kant })
  kg.ellipse(-34, 8, 11, 9.5).fill(sphereFill(P.kropp, { lightX: 0.4, lightY: 0.22, highlight: 0.5, dark: 0.45 })).stroke({ width: 1.8, color: P.kant })
  kg.ellipse(-34, 3.5, 5, 5.5).fill(0xffffff).stroke({ width: 1.3, color: P.kant })
  kg.circle(-35.4, 4.2, 3).fill(0x111111)
  kg.circle(-34.2, 2.6, 1.2).fill(0xffffff)
  kg.moveTo(-41, 12.5).quadraticCurveTo(-37.5, 15.5, -34, 13.5).stroke({ width: 1.5, color: P.glans, alpha: 0.85, cap: 'round' })

  // Närmre benen: mitten på marken, bakbenet uppe på bollen.
  benNod(-2, 15, -14, 24, -22, MARKY, true, 1.8)
  benNod(20, 13, 4, -8, 14.5, -13, true, 3.3)

  const w0 = 40 / R
  return {
    boll,
    uppdatera(T, dt, fart) {
      if (!levd(boll)) return
      const w = Number.isFinite(fart) ? fart / R : w0
      boll.rotation = (boll.rotation + w * klam(Number(dt) || 0, 0, 0.1)) % TAU
      if (levd(bagge)) bagge.y = by - Math.abs(Math.sin(T * 10)) * 1.2
      for (const b of ben) if (levd(b.n)) b.n.rotation = b.amp * Math.sin(T * 10 + b.fas)
    },
  }
}

const KATT = { pals: 0xf2a444, rand: 0xd4782c, kant: 0xa4581e, ljus: 0xfff0da, rosa: 0xf28fa6, oga: 0x8fcf4a, ogaK: 0x4a7a1e, mork: 0x3a2418, bortPals: 0xd98f38 }

// Ett kattben i en egen nod (vridpunkt i höften/skuldran), ritat nedåt till tassen.
function kattBen(foralder, x, y, L, bak, bort) {
  const P = KATT
  const n = nod(foralder, x, y)
  const g = ritning(n)
  const farg = bort ? P.bortPals : P.pals
  // Ett avsmalnande ben; bakbenets baksida buktar ut till ett lår. Överdelen går upp i bålen,
  // så konturen ritas bara längs sidorna och runt foten — aldrig tvärs över kroppen.
  const y0 = -10
  const topB = bak ? 17 : 9.5
  const botB = 8.5
  const q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
  const R0 = [-topB, y0]
  const Rc = [-topB - (bak ? 9 : 1), y0 + (L - y0) * 0.35]
  const R1 = [-botB, L - 6]
  const F0 = [topB, y0]
  const Fc = [topB + (bak ? 1 : 0.5), y0 + (L - y0) * 0.45]
  const F1 = [botB, L - 6]
  g.moveTo(R0[0], R0[1]).quadraticCurveTo(Rc[0], Rc[1], R1[0], R1[1]).quadraticCurveTo(0, L + 4, F1[0], F1[1])
    .quadraticCurveTo(Fc[0], Fc[1], F0[0], F0[1]).closePath()
    .fill(cylinderFill(farg, { axis: 'y', dark: 0.16, highlight: 0.18 }))
  const kontur = (A, C, B, t0) => {
    const p = []
    for (let i = 0; i <= 10; i++) {
      const t = t0 + ((1 - t0) * i) / 10
      p.push(q(A[0], C[0], B[0], t), q(A[1], C[1], B[1], t))
    }
    return p
  }
  const bakKant = kontur(R0, Rc, R1, bak ? 0.3 : 0.42)
  const framKant = kontur(F0, Fc, F1, bak ? 0.55 : 0.42)
  linje(g, bakKant).stroke({ width: 2.5, color: P.kant, cap: 'round', join: 'round' })
  linje(g, framKant).stroke({ width: 2.5, color: P.kant, cap: 'round', join: 'round' })
  if (!bort) g.moveTo(bak ? -12 : -6, bak ? 6 : L * 0.3).lineTo(bak ? 2 : 3, bak ? 10 : L * 0.3 + 3).stroke({ width: 4, color: P.rand, cap: 'round', alpha: 0.85 })
  g.ellipse(3, L, 12.5, 6.5).fill(bort ? shade(P.ljus, 0.12) : P.ljus).stroke({ width: 2.2, color: P.kant })
  g.moveTo(5, L - 3).lineTo(5, L + 3).stroke({ width: 1.3, color: P.kant, alpha: 0.6 })
  g.moveTo(10, L - 3).lineTo(10, L + 3).stroke({ width: 1.3, color: P.kant, alpha: 0.6 })
  return n
}

/** Stor snäll randig katt i sidovy som GÅR, kropp 260 × 120 (tassarna på y 60). */
export function ritaKatt(c) {
  const P = KATT
  const kropp = nod(c)
  // Bortre benen (mörkare) bakom kroppen.
  const bortFram = kattBen(kropp, 50, 14, 40, false, true)
  const bortBak = kattBen(kropp, -76, 6, 48, true, true)
  // Svansen: en tjock båge upp och bakåt, randig, som vajar kring roten.
  const svans = nod(kropp, -98, -14)
  const sg = ritning(svans)
  const S = [[0, 0], [-46, 6], [-56, -54], [-30, -86]]
  const sp = []
  for (let i = 0; i <= 20; i++) {
    const b = bez(S[0], S[1], S[2], S[3], i / 20)
    sp.push(b.x, b.y)
  }
  linje(sg, sp).stroke({ width: 19, color: P.kant, cap: 'round', join: 'round' })
  linje(sg, sp).stroke({ width: 14, color: P.pals, cap: 'round', join: 'round' })
  for (const t of [0.3, 0.48, 0.64, 0.8]) {
    const b = bez(S[0], S[1], S[2], S[3], t)
    sg.moveTo(b.x - b.nx * 6.5, b.y - b.ny * 6.5).lineTo(b.x + b.nx * 6.5, b.y + b.ny * 6.5).stroke({ width: 4.5, color: P.rand, cap: 'round' })
  }
  const spets = bez(S[0], S[1], S[2], S[3], 0.97)
  sg.circle(spets.x, spets.y, 6.5).fill(P.rand)
  // Bålen.
  const k = ritning(kropp)
  k.moveTo(-104, 0)
    .bezierCurveTo(-108, -34, -74, -44, -40, -42)
    .bezierCurveTo(0, -40, 40, -44, 72, -34)
    .bezierCurveTo(96, -26, 98, 10, 80, 26)
    .bezierCurveTo(50, 40, -40, 40, -80, 30)
    .bezierCurveTo(-98, 24, -104, 14, -104, 0)
    .closePath()
    .fill(topLightFill(P.pals, { highlight: 0.28, dark: 0.16 }))
    .stroke({ width: 3, color: P.kant })
  k.ellipse(-2, 27, 62, 8.5).fill({ color: P.ljus, alpha: 0.9 })
  k.ellipse(84, 2, 11, 18).fill({ color: P.ljus, alpha: 0.9 })
  for (const [x, y] of [[-82, -34], [-57, -40], [-32, -41], [-7, -40], [18, -40], [43, -40]]) {
    k.moveTo(x, y + 1).quadraticCurveTo(x + 10, y + 14, x + 4, y + 27).stroke({ width: 7, color: P.rand, cap: 'round', alpha: 0.9 })
  }
  k.moveTo(-60, -28).quadraticCurveTo(-10, -36, 44, -30).stroke({ width: 5, color: 0xffffff, alpha: 0.18, cap: 'round' })
  // Närmre benen.
  const naraFram = kattBen(kropp, 64, 18, 36, false, false)
  const naraBak = kattBen(kropp, -62, 10, 44, true, false)
  // Huvudet (3/4 mot oss — vänligt, båda ögonen syns), med öron i egna noder.
  const huvud = nod(kropp, 94, -28)
  const ora = (x, y, r0, bort) => {
    const n = nod(huvud, x, y)
    n.rotation = r0
    const g = ritning(n)
    g.moveTo(-14, 6).lineTo(-4, -26).quadraticCurveTo(0, -31, 4, -26).lineTo(14, 6).closePath()
      .fill(bort ? P.bortPals : P.pals).stroke({ width: 2.5, color: P.kant, join: 'round' })
    g.moveTo(-8, 4).lineTo(-2.5, -17).quadraticCurveTo(0, -21, 2.5, -17).lineTo(8, 4).closePath().fill(P.rosa)
    return n
  }
  const oraBort = ora(-16, -22, -0.22, true)
  const oraNara = ora(20, -24, 0.18, false)
  const hg = ritning(huvud)
  hg.ellipse(2, -2, 40, 33).fill(sphereFill(P.pals, { lightX: 0.4, lightY: 0.3, dark: 0.22 })).stroke({ width: 3, color: P.kant })
  for (const [x0, y0, x1, y1] of [[-6, -33, -4, -22], [3, -35, 3.5, -23], [12, -33, 11, -22]]) hg.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 4, color: P.rand, cap: 'round' })
  hg.ellipse(-22, 10, 7, 4).fill({ color: P.rosa, alpha: 0.4 })
  hg.ellipse(31, 10, 6, 4).fill({ color: P.rosa, alpha: 0.4 })
  hg.ellipse(0, 13, 12, 8.5).fill(P.ljus)
  hg.ellipse(15, 13, 12, 8.5).fill(P.ljus)
  hg.moveTo(2, 4).lineTo(13, 4).quadraticCurveTo(7.5, 12, 2, 4).closePath().fill(P.rosa).stroke({ width: 1.5, color: shade(P.rosa, 0.3), join: 'round' })
  hg.moveTo(7.5, 8.5).lineTo(7.5, 12).stroke({ width: 2, color: P.mork, cap: 'round' })
  hg.moveTo(0, 13.5).quadraticCurveTo(3.8, 18, 7.5, 12.5).quadraticCurveTo(11.2, 18, 15, 13.5).stroke({ width: 2, color: P.mork, cap: 'round', join: 'round' })
  for (const [x1, y1] of [[-36, 5], [-37, 12], [-35, 19]]) hg.moveTo(-6, 13).lineTo(x1, y1).stroke({ width: 1.5, color: P.mork, alpha: 0.45, cap: 'round' })
  for (const [x1, y1] of [[50, 5], [51, 12], [49, 19]]) hg.moveTo(21, 13).lineTo(x1, y1).stroke({ width: 1.5, color: P.mork, alpha: 0.45, cap: 'round' })
  // Ögonen i egna noder (blinkar).
  const oga = (x, y, rx) => {
    const n = nod(huvud, x, y)
    const g = ritning(n)
    g.ellipse(0, 0, rx, 10).fill(sphereFill(P.oga, { lightX: 0.4, lightY: 0.3, dark: 0.3 })).stroke({ width: 1.8, color: P.ogaK })
    g.ellipse(1, 1, rx * 0.54, 6.8).fill(P.mork)
    g.circle(-2.4, -3.6, 2.6).fill(0xffffff)
    g.circle(2.8, 4, 1.2).fill({ color: 0xffffff, alpha: 0.8 })
    return n
  }
  const ogon = [oga(-9, -4, 8.5), oga(22, -4, 7.5)]

  const benLista = [
    { n: naraFram, fas: 0, amp: 0.32 },
    { n: bortFram, fas: Math.PI, amp: 0.32 },
    { n: naraBak, fas: Math.PI, amp: 0.28 },
    { n: bortBak, fas: 0, amp: 0.28 },
  ]
  return {
    uppdatera(T) {
      if (!levd(kropp)) return
      const fi = T * 5.2
      for (const b of benLista) if (levd(b.n)) b.n.rotation = b.amp * Math.sin(fi + b.fas)
      kropp.y = -1.6 * (0.5 - 0.5 * Math.cos(2 * fi))
      if (levd(huvud)) huvud.rotation = 0.035 * Math.sin(2 * fi + 0.6)
      if (levd(svans)) svans.rotation = 0.16 * Math.sin(T * 1.7) + 0.05 * Math.sin(T * 4.1)
      if (levd(oraNara)) oraNara.rotation = 0.18 + 0.3 * Math.max(0, Math.sin(T * 0.8)) ** 40
      if (levd(oraBort)) oraBort.rotation = -0.22 - 0.06 * Math.sin(T * 1.3)
      const blink = T % 3.4 < 0.13 ? 0.12 : 1
      for (const o of ogon) if (levd(o)) o.scale.y = blink
    },
  }
}

const ANKA = { gul: 0xffd83a, kant: 0xc99a12, vinge: 0xf2c020, nabb: 0xff8a1f, nabbK: 0xc05a0a, kind: 0xff9a6a }

/** Gul badanka (gummileksak), kropp 150 × 44 i vattenytan; huvudet ovanför kroppen. */
export function ritaBadanka(c) {
  const P = ANKA
  const inre = nod(c)
  const k = ritning(inre)
  k.moveTo(-70, 0).lineTo(-84, -20).quadraticCurveTo(-76, -18, -64, -12).closePath().fill(sphereFill(P.gul, { lightX: 0.4, lightY: 0.3, dark: 0.22 })).stroke({ width: 2.5, color: P.kant, join: 'round' })
  k.moveTo(-70, 0).bezierCurveTo(-80, -30, -40, -38, 0, -32).bezierCurveTo(40, -30, 62, -14, 60, 4)
    .bezierCurveTo(40, 22, -40, 22, -70, 0).closePath()
    .fill(sphereFill(P.gul, { lightX: 0.4, lightY: 0.25, dark: 0.25 })).stroke({ width: 3, color: P.kant })
  // Den gjutna vingen och ett blankt gummiblänk på ryggen.
  k.moveTo(-40, -12).bezierCurveTo(-30, -26, 4, -26, 12, -10).bezierCurveTo(0, -2, -24, -2, -40, -12).closePath()
    .fill(sphereFill(P.vinge, { lightX: 0.4, lightY: 0.3, dark: 0.18 })).stroke({ width: 2, color: P.kant, alpha: 0.8 })
  k.moveTo(-30, -14).quadraticCurveTo(-16, -8, 2, -10).stroke({ width: 1.6, color: P.kant, alpha: 0.5 })
  k.moveTo(-58, -18).quadraticCurveTo(-36, -30, -6, -28).stroke({ width: 4, color: 0xffffff, alpha: 0.55, cap: 'round' })
  const huvud = nod(inre, 32, -24)
  const hg = ritning(huvud)
  hg.circle(4, -26, 24).fill(sphereFill(P.gul, { lightX: 0.4, lightY: 0.3, dark: 0.22 })).stroke({ width: 3, color: P.kant })
  hg.moveTo(22, -32).quadraticCurveTo(42, -35, 46, -26).quadraticCurveTo(42, -18, 22, -20).closePath()
    .fill(sphereFill(P.nabb, { lightX: 0.4, lightY: 0.3, dark: 0.25 })).stroke({ width: 2, color: P.nabbK, join: 'round' })
  hg.moveTo(26, -26).quadraticCurveTo(36, -24.5, 44, -26).stroke({ width: 1.5, color: P.nabbK, alpha: 0.7, cap: 'round' })
  hg.ellipse(10, -33, 4.6, 6).fill(0x1a1410)
  hg.circle(8.6, -35.2, 1.9).fill(0xffffff)
  hg.circle(11, -30.5, 0.9).fill({ color: 0xffffff, alpha: 0.8 })
  hg.ellipse(14, -20, 5, 3).fill({ color: P.kind, alpha: 0.5 })
  hg.ellipse(-6, -38, 7, 4).fill({ color: 0xffffff, alpha: 0.6 })
  return {
    uppdatera(T) {
      if (!levd(inre)) return
      inre.rotation = 0.035 * Math.sin(T * 1.6)
      if (levd(huvud)) huvud.rotation = 0.07 * Math.sin(T * 2.3 + 0.8)
    },
  }
}

// =======================================================================================
// FLYGANDE OCH HOPPANDE I EN BÅGE
// =======================================================================================

const GADDA = { rygg: 0x5c9a3f, buk: 0xe2e2a8, kant: 0x2f5a22, rand: 0x3f7a2e, prick: 0xd6e89a, fena: 0x7fb85a, fenaK: 0x4f8a35, kind: 0xff9a8a }

// En rundad fena kring vridpunkten (0, 0), fläktad bort från kroppen (ned = +1 uppåt = −1).
function fena(g, bredd, hojd, ned) {
  g.moveTo(-bredd, 0).quadraticCurveTo(-bredd * 0.7, ned * hojd * 1.2, bredd * 0.4, ned * hojd)
    .quadraticCurveTo(bredd * 1.1, ned * hojd * 0.5, bredd, 0).closePath()
    .fill(GADDA.fena).stroke({ width: 1.8, color: GADDA.fenaK, join: 'round' })
  for (let i = 1; i <= 3; i++) {
    const x = -bredd + (i * 2 * bredd) / 4
    g.moveTo(x, 0).lineTo(x + bredd * 0.25, ned * hojd * 0.75).stroke({ width: 1, color: GADDA.fenaK, alpha: 0.6 })
  }
}

/** En busig gädda, kropp 110 × 32: grön-randig, lång näbb, glad min, fenor som viftar. */
export function ritaGadda(c) {
  const P = GADDA
  const inre = nod(c)
  const stjart = nod(inre, -50, 0)
  const sg = ritning(stjart)
  sg.moveTo(2, -4).quadraticCurveTo(-14, -12, -26, -21).quadraticCurveTo(-24, -6, -18, 0).quadraticCurveTo(-24, 6, -26, 21)
    .quadraticCurveTo(-14, 12, 2, 4).closePath().fill(P.fena).stroke({ width: 2, color: P.fenaK, join: 'round' })
  for (const y of [-12, -5, 5, 12]) sg.moveTo(0, y * 0.2).lineTo(-20, y).stroke({ width: 1, color: P.fenaK, alpha: 0.55 })
  const rygg = nod(inre, -30, -11)
  fena(ritning(rygg), 11, 13, -1)
  const buk = nod(inre, -28, 12)
  fena(ritning(buk), 9, 10, 1)
  const g = ritning(inre)
  g.moveTo(64, -1).bezierCurveTo(50, -9, 30, -16, 10, -16).bezierCurveTo(-20, -16, -40, -10, -51, -4)
    .lineTo(-51, 4).bezierCurveTo(-40, 12, -20, 16, 10, 16).bezierCurveTo(30, 16, 50, 10, 64, 2).closePath()
    .fill(verticalFill(P.rygg, P.buk)).stroke({ width: 2.5, color: P.kant, join: 'round' })
  for (const x of [-36, -22, -8, 6, 20]) g.moveTo(x, -14).quadraticCurveTo(x + 5, -5, x + 1, 5).stroke({ width: 4, color: P.rand, alpha: 0.5, cap: 'round' })
  for (const [x, y] of [[-29, -6], [-15, -9], [-1, -6], [13, -9], [-42, -3]]) g.ellipse(x, y, 2.6, 1.6).fill({ color: P.prick, alpha: 0.85 })
  g.moveTo(-40, -8).quadraticCurveTo(0, -17, 40, -9).stroke({ width: 2.5, color: 0xffffff, alpha: 0.22, cap: 'round' })
  // Gällocket, munnen (ett brett leende) och ett stort öga med ett busigt ögonbryn.
  g.moveTo(27, -11).quadraticCurveTo(32, 0, 26, 11).stroke({ width: 1.8, color: P.kant, alpha: 0.6, cap: 'round' })
  g.moveTo(63, 1).quadraticCurveTo(50, 6, 39, 3).quadraticCurveTo(36, 1, 37, -2).stroke({ width: 2, color: P.kant, cap: 'round', join: 'round' })
  g.ellipse(35, 6, 4.5, 2.6).fill({ color: P.kind, alpha: 0.45 })
  g.circle(41, -6, 6.5).fill(0xffffff).stroke({ width: 1.6, color: P.kant })
  g.circle(42.5, -5.5, 3.8).fill(0x151515)
  g.circle(41.2, -7.3, 1.5).fill(0xffffff)
  g.moveTo(34, -14).quadraticCurveTo(40, -18.5, 47.5, -14.5).stroke({ width: 2.4, color: P.kant, cap: 'round' })
  const bro = nod(inre, 20, 8)
  const bg = ritning(bro)
  bg.ellipse(-8, 3, 10, 4.5).fill(P.fena).stroke({ width: 1.6, color: P.fenaK })
  bg.moveTo(0, 0).lineTo(-15, 3).stroke({ width: 1, color: P.fenaK, alpha: 0.6 })
  return {
    uppdatera(T) {
      if (!levd(inre)) return
      if (levd(stjart)) stjart.rotation = 0.28 * Math.sin(T * 9)
      if (levd(bro)) bro.rotation = 0.35 + 0.35 * Math.sin(T * 7)
      if (levd(rygg)) rygg.rotation = 0.12 * Math.sin(T * 6 + 1)
      if (levd(buk)) buk.rotation = -0.12 * Math.sin(T * 6 + 2)
    },
  }
}

const MAS = { kropp: 0xfafbfc, kant: 0x9aa6b2, vinge: 0xb9c5d0, vingeB: 0xa3afba, vingeK: 0x74818e, spets: 0x2a2e33, nabb: 0xffc93a, nabbK: 0xc79212, prick: 0xe8433a, fot: 0xf2b04a }

// En vinge som pekar upp och bakåt från axeln (0, 0). Vingslaget = scale.y (1 upp … −0,6 ned).
function masVinge(g, farg) {
  const P = MAS
  // Framkanten F och bakkanten B som kubiska kurvor — den svarta spetsen tas ur samma kurvor.
  const F = [[12, 1], [12, -22], [-4, -46], [-36, -58]]
  const B = [[-36, -58], [-29, -40], [-25, -14], [-14, 3]]
  g.moveTo(-14, 3).lineTo(F[0][0], F[0][1]).bezierCurveTo(F[1][0], F[1][1], F[2][0], F[2][1], F[3][0], F[3][1])
    .bezierCurveTo(B[1][0], B[1][1], B[2][0], B[2][1], B[3][0], B[3][1]).closePath()
    .fill(topLightFill(farg, { highlight: 0.25, dark: 0.15 })).stroke({ width: 2, color: P.vingeK, join: 'round' })
  const spets = []
  for (let i = 0; i <= 6; i++) {
    const b = bez(F[0], F[1], F[2], F[3], 0.7 + (0.3 * i) / 6)
    spets.push(b.x, b.y)
  }
  for (let i = 1; i <= 6; i++) {
    const b = bez(B[0], B[1], B[2], B[3], (0.3 * i) / 6)
    spets.push(b.x, b.y)
  }
  g.poly(spets).fill(P.spets)
  const m = bez(F[0], F[1], F[2], F[3], 0.86)
  g.circle(m.x - 4, m.y + 3, 1.6).fill(0xffffff)
  for (const t of [0.35, 0.55]) {
    const a = bez(F[0], F[1], F[2], F[3], t)
    const b = bez(B[0], B[1], B[2], B[3], 1 - t)
    g.moveTo(a.x - 3, a.y + 2).quadraticCurveTo((a.x + b.x) / 2 - 2, (a.y + b.y) / 2 + 4, b.x + 1, b.y).stroke({ width: 1.2, color: P.vingeK, alpha: 0.5 })
  }
}

/** Mås i sidovy, kropp 80 × 34: vit-grå med gul näbb; vingarna flaxar. */
export function ritaMas(c) {
  const P = MAS
  const inre = nod(c)
  const bort = nod(inre, 0, -8)
  masVinge(ritning(bort), P.vingeB)
  const g = ritning(inre)
  g.moveTo(-24, -4).lineTo(-46, -9).quadraticCurveTo(-49, 0, -46, 7).lineTo(-24, 8).closePath()
    .fill(topLightFill(P.kropp, { highlight: 0.1, dark: 0.14 })).stroke({ width: 2, color: P.kant, join: 'round' })
  g.moveTo(-20, 12).lineTo(-28, 16).stroke({ width: 2.5, color: P.fot, cap: 'round' })
  g.ellipse(0, 2, 32, 13).fill(sphereFill(P.kropp, { lightX: 0.4, lightY: 0.25, highlight: 0.2, dark: 0.18 })).stroke({ width: 2, color: P.kant })
  g.circle(28, -8, 12).fill(sphereFill(P.kropp, { lightX: 0.4, lightY: 0.25, highlight: 0.2, dark: 0.18 })).stroke({ width: 2, color: P.kant })
  g.moveTo(38, -11).lineTo(54, -8.5).quadraticCurveTo(57, -6, 53, -3.5).lineTo(38, -4).closePath()
    .fill(sphereFill(P.nabb, { lightX: 0.4, lightY: 0.3, dark: 0.22 })).stroke({ width: 1.6, color: P.nabbK, join: 'round' })
  g.circle(48.5, -5, 1.5).fill(P.prick)
  g.circle(31.5, -11, 2.8).fill(0x151515)
  g.circle(30.6, -12, 1).fill(0xffffff)
  g.moveTo(34, -2).quadraticCurveTo(36.5, 0, 39, -2.5).stroke({ width: 1.3, color: P.kant, cap: 'round' })
  const nara = nod(inre, 4, -6)
  masVinge(ritning(nara), P.vinge)
  return {
    uppdatera(T) {
      if (!levd(inre)) return
      const fi = T * 8.5
      if (levd(nara)) nara.scale.y = 0.22 + 0.78 * Math.cos(fi)
      if (levd(bort)) bort.scale.y = 0.22 + 0.78 * Math.cos(fi - 0.25)
      inre.y = 2.2 * Math.sin(fi)
    },
  }
}

const PAPPER = { ljus: 0xfdfdfb, mellan: 0xe6edf4, mork: 0xc9d4df, kant: 0x7e8ea0, stjarna: 0xffd23f, stjK: 0xe8433a, rand: 0x3f86e0 }

/** Vikt pappersflygplan, kropp 80 × 30: ljust papper, veck och en ritad stjärna. */
export function ritaPappersflygplan(c) {
  const P = PAPPER
  const inre = nod(c)
  const g = ritning(inre)
  const kant = { width: 2, color: P.kant, join: 'round' }
  // Kölen under, den bortre vingen bakom, den närmre vingen överst.
  g.poly([44, 1, -24, 1, -31, 15]).fill(P.mork).stroke(kant)
  g.poly([46, -1, -42, -17, -26, -1]).fill(P.mellan).stroke(kant)
  g.poly([46, 0, -26, -1, -45, 9]).fill(P.ljus).stroke(kant)
  g.moveTo(40, -1.5).lineTo(-36, -11).stroke({ width: 1.2, color: P.kant, alpha: 0.5 })
  g.moveTo(40, 1).lineTo(-36, 5.5).stroke({ width: 1.2, color: P.kant, alpha: 0.45 })
  g.moveTo(-4, -4.5).lineTo(-36, -13.5).stroke({ width: 3, color: P.rand, alpha: 0.75, cap: 'round' })
  g.poly(stjarnPunkter(-14, 3, 6.5, 2.8, 5, -Math.PI / 2 + 0.2)).fill(P.stjarna).stroke({ width: 1.6, color: P.stjK, join: 'round' })
  return {
    uppdatera(T) {
      if (!levd(inre)) return
      inre.rotation = 0.05 * Math.sin(T * 2.1)
      inre.y = 1.5 * Math.sin(T * 3.3)
    },
  }
}

// =======================================================================================
// MÖBLER (L7) — i världens koordinater, från golvet (528) upp till it.topp
// =======================================================================================

const GELE = { fat: 0xf2f6fa, fatK: 0xa9b8c6, gron: 0x7ccf6a, gradde: 0xfff2cc, graddeK: 0xd8c6a0, rosa: 0xf57fa0, rosaL: 0xff9ab6, rosaTopp: 0xffb0c8, kant: 0xc4476b, bar: 0xd8283a, barK: 0x8a1020, stjalk: 0x6b8a2a }

/** KÖK: en darrande gelépudding i lager på ett fat. Studsig — darra ger en saftig wobble. */
export function ritaGele(R, it) {
  const { x, w, H } = matt(it, 160, 400)
  const P = GELE
  const rot = nod(R, x, MARK)
  const g = ritning(rot)
  const fw = w * 0.66
  g.ellipse(0, -1, fw + 6, 8).fill({ color: 0x000000, alpha: 0.12 })
  g.ellipse(0, -5, fw, 9).fill(topLightFill(P.fat, { highlight: 0.3, dark: 0.16 })).stroke({ width: 2, color: P.fatK })
  g.ellipse(0, -7, fw * 0.82, 5).fill({ color: 0xffffff, alpha: 0.5 })
  const j = nod(rot, 0, -8)
  const jg = ritning(j)
  const h = H - 8
  const wt = w / 2
  const wb = w * 0.6
  // Formen: fyra våningar som var och en buktar ut (en gjuten pudding), smalare uppåt. Vid
  // toppen är halvbredden exakt w/2 — plankan grodan landar på.
  const VAN = [[0, 0.3, P.gron], [0.3, 0.42, P.gradde], [0.42, 0.72, P.rosa], [0.72, 1, P.rosaL]]
  const kant = (u) => {
    const v = VAN.find((t) => u <= t[1]) || VAN[VAN.length - 1]
    return wb + (wt - wb) * u + w * 0.05 * Math.sin((Math.PI * (u - v[0])) / (v[1] - v[0]))
  }
  const N = 8
  for (const [u0, u1, farg] of VAN) {
    const p = []
    for (let i = 0; i <= N; i++) {
      const u = u0 + ((u1 - u0) * i) / N
      p.push(-kant(u), -u * h)
    }
    for (let i = N; i >= 0; i--) {
      const u = u0 + ((u1 - u0) * i) / N
      p.push(kant(u), -u * h)
    }
    jg.poly(p).fill(cylinderFill(farg, { axis: 'y', dark: 0.2, highlight: 0.38 }))
  }
  // Formens räfflor: lodräta ljusa band som följer utbuktningarna.
  const alla = []
  for (let i = 0; i <= 40; i++) alla.push(i / 40)
  for (let i = -3; i <= 3; i++) {
    if (!i) continue
    const f = (i / 3.7) * 0.94
    linje(jg, alla.flatMap((u) => [f * kant(u), -u * h - 2])).stroke({ width: 4, color: 0xffffff, alpha: 0.2, cap: 'round' })
    linje(jg, alla.flatMap((u) => [(f + 0.05) * kant(u), -u * h - 2])).stroke({ width: 2, color: P.kant, alpha: 0.1, cap: 'round' })
  }
  // Fårorna mellan våningarna (framsidans båge).
  for (const [u0] of VAN.slice(1)) linje(jg, bagPunkter(0, -u0 * h, kant(u0), 5, 0.08, Math.PI - 0.08, 12)).stroke({ width: 2, color: P.kant, alpha: 0.35 })
  const blank = []
  for (let i = 0; i <= N; i++) {
    const u = 0.1 + (0.8 * i) / N
    blank.push(-kant(u) + 9, -u * h)
  }
  for (let i = N; i >= 0; i--) {
    const u = 0.1 + (0.8 * i) / N
    blank.push(-kant(u) + 17, -u * h)
  }
  jg.poly(blank).fill({ color: 0xffffff, alpha: 0.42 })
  jg.circle(-kant(0.2) + 27, -0.2 * h, 3.2).fill({ color: 0xffffff, alpha: 0.75 })
  jg.circle(-kant(0.6) + 25, -0.6 * h, 2.2).fill({ color: 0xffffff, alpha: 0.6 })
  const ut = []
  for (let i = 0; i <= 40; i++) ut.push(-kant(i / 40), (-i / 40) * h)
  for (let i = 40; i >= 0; i--) ut.push(kant(i / 40), (-i / 40) * h)
  linje(jg, ut).stroke({ width: 2.5, color: P.kant, alpha: 0.75, join: 'round' })
  // Ovansidan (det grodan landar på), och en gräddtopp med ett körsbär vid ena kanten.
  jg.ellipse(0, -h, wt, 9).fill(topLightFill(P.rosaTopp, { highlight: 0.35, dark: 0.1 })).stroke({ width: 2.5, color: P.kant, alpha: 0.8 })
  jg.ellipse(-wt * 0.35, -h - 2, wt * 0.28, 3).fill({ color: 0xffffff, alpha: 0.6 })
  const gx = wt * 0.5
  for (const [dy, rx, ry] of [[-5, 14, 7], [-11, 10.5, 6], [-16, 6.5, 4.5]]) {
    jg.ellipse(gx, -h + dy, rx, ry).fill(topLightFill(P.gradde, { highlight: 0.5, dark: 0.1 })).stroke({ width: 1.6, color: P.graddeK })
  }
  jg.moveTo(gx + 2, -h - 27).quadraticCurveTo(gx + 5, -h - 38, gx + 12, -h - 40).stroke({ width: 2.2, color: P.stjalk, cap: 'round' })
  jg.circle(gx + 1, -h - 24, 7).fill(sphereFill(P.bar, { lightX: 0.35, lightY: 0.3, dark: 0.3 })).stroke({ width: 1.6, color: P.barK })
  jg.circle(gx - 1.5, -h - 26.5, 1.8).fill({ color: 0xffffff, alpha: 0.85 })
  const fj = fjader(13, 0.13)
  const sk = fjader(9, 0.1)
  return {
    svaj: [],
    darra(styrka) {
      const k = klam(Number(styrka) || 0, 0, 1)
      fj.stot(k)
      sk.stot(k * 0.8 * (Math.random() < 0.5 ? -1 : 1))
    },
    uppdatera(T, dt) {
      if (!levd(j)) return
      const a = fj.steg(dt)
      const b = sk.steg(dt)
      j.scale.set(1 - 0.07 * a, 1 + 0.1 * a)
      j.skew.x = 0.07 * b + 0.01 * Math.sin(T * 2.6)
    },
  }
}

const KAKA = { porslin: 0xf2f6fa, porslinM: 0xd6e0ea, porslinK: 0x9fb2c4, monster: 0x7fa6d6, botten: 0xf2d29a, bottenK: 0xb98a4a, gradde: 0xfffaf0, sylt: 0xe8506a, glasyr: 0xffb8cc, glasyrTopp: 0xffcad8, glasyrK: 0xd9708f, bar: 0xe8433a, barK: 0x9a1f1a, blad: 0x5fae3e, strossel: [0xff6b6b, 0x5bbf6a, 0x4aa3df, 0xffd35c, 0xa78bfa, 0xffffff] }

/** KÖK: ett kakfat på fot med en tårta (ovansidan = tårtans glasyr). */
export function ritaKakfat(R, it) {
  const { x, w, H } = matt(it, 180, 400)
  const P = KAKA
  const rot = nod(R, x, MARK)
  const g = ritning(rot)
  const kakH = klam(H * 0.45, 44, 92)
  const fatY = -(H - kakH)
  const fw = w * 0.62
  const s = fro(Math.round(w))
  g.ellipse(0, -1, w * 0.3, 6).fill({ color: 0x000000, alpha: 0.12 })
  g.ellipse(0, -5, w * 0.22, 7).fill(topLightFill(P.porslin, { highlight: 0.3, dark: 0.18 })).stroke({ width: 1.8, color: P.porslinK })
  g.moveTo(-w * 0.2 + 6, -7).bezierCurveTo(-8, -14, -7, fatY * 0.6, -18, fatY + 4).lineTo(18, fatY + 4)
    .bezierCurveTo(7, fatY * 0.6, 8, -14, w * 0.2 - 6, -7).closePath()
    .fill(cylinderFill(P.porslin, { axis: 'y', dark: 0.18, highlight: 0.25 })).stroke({ width: 1.8, color: P.porslinK })
  g.ellipse(0, fatY * 0.5, 11, 4.5).fill(P.porslinM).stroke({ width: 1.5, color: P.porslinK })
  // Fatet.
  g.ellipse(0, fatY + 5, fw, 10).fill(P.porslinM).stroke({ width: 1.8, color: P.porslinK })
  g.ellipse(0, fatY, fw, 10).fill(topLightFill(P.porslin, { highlight: 0.3, dark: 0.18 })).stroke({ width: 1.8, color: P.porslinK })
  for (let i = 1; i < 12; i++) {
    const v = (Math.PI * i) / 12
    g.circle(fw * 0.92 * Math.cos(v), fatY + 8.2 * Math.sin(v), 2).fill(P.monster)
  }
  // Tårtan: botten, grädde, sylt, botten — och glasyr med droppar överst.
  const lagerH = [[0.34, P.botten], [0.08, P.gradde], [0.08, P.sylt], [0.28, P.botten]]
  let y = fatY
  for (const [andel, farg] of lagerH) {
    const hh = kakH * andel
    g.rect(-w / 2, y - hh, w, hh).fill(topLightFill(farg, { highlight: 0.2, dark: 0.12 }))
    y -= hh
  }
  g.moveTo(-w / 2, fatY).lineTo(-w / 2, -H + 6).stroke({ width: 2, color: P.bottenK, alpha: 0.7 })
  g.moveTo(w / 2, fatY).lineTo(w / 2, -H + 6).stroke({ width: 2, color: P.bottenK, alpha: 0.7 })
  for (let i = 0; i < w / 18; i++) g.circle(-w / 2 + 8 + s() * (w - 16), fatY - kakH * (0.06 + s() * 0.26), 1.2).fill({ color: P.bottenK, alpha: 0.4 })
  // Glasyren: ett band överst som droppar ned längs framsidan.
  const glH = kakH * 0.22
  const kantY = -H + glH
  g.moveTo(-w / 2 - 2, -H)
  g.lineTo(-w / 2 - 2, kantY)
  const n = Math.max(4, Math.round(w / 26))
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 - 2 + ((w + 4) * i) / n
    const x1 = -w / 2 - 2 + ((w + 4) * (i + 1)) / n
    const dropp = kantY + (i % 2 ? 6 : 14 + s() * 10)
    const mx = (x0 + x1) / 2
    g.quadraticCurveTo(x0 + (x1 - x0) * 0.15, kantY, mx - (x1 - x0) * 0.22, dropp - 4)
    g.quadraticCurveTo(mx, dropp + 5, mx + (x1 - x0) * 0.22, dropp - 4)
    g.quadraticCurveTo(x1 - (x1 - x0) * 0.15, kantY, x1, kantY)
  }
  g.lineTo(w / 2 + 2, -H).closePath().fill(topLightFill(P.glasyr, { highlight: 0.3, dark: 0.1 })).stroke({ width: 2, color: P.glasyrK, join: 'round' })
  g.ellipse(0, -H, w / 2 + 2, 8).fill(P.glasyrTopp).stroke({ width: 2, color: P.glasyrK })
  for (let i = 0; i < w / 7; i++) {
    const sx = -w / 2 + 6 + s() * (w - 12)
    const sy = -H - 5 + s() * (glH + 8)
    const v = s() * Math.PI
    const L = 3
    g.moveTo(sx - Math.cos(v) * L, sy - Math.sin(v) * L).lineTo(sx + Math.cos(v) * L, sy + Math.sin(v) * L)
      .stroke({ width: 2.2, color: P.strossel[i % P.strossel.length], cap: 'round' })
  }
  g.ellipse(-w * 0.2, -H - 2, w * 0.18, 2.5).fill({ color: 0xffffff, alpha: 0.55 })
  // Två jordgubbar på fatet bredvid tårtan.
  for (const sx of [-1, 1]) {
    const bx = sx * (w / 2 + (fw - w / 2) * 0.55)
    const bY = fatY - 7
    g.moveTo(bx - 7, bY - 4).bezierCurveTo(bx - 8, bY + 6, bx - 2, bY + 10, bx, bY + 11).bezierCurveTo(bx + 2, bY + 10, bx + 8, bY + 6, bx + 7, bY - 4)
      .quadraticCurveTo(bx, bY - 8, bx - 7, bY - 4).closePath()
      .fill(sphereFill(P.bar, { lightX: 0.35, lightY: 0.3, dark: 0.3 })).stroke({ width: 1.5, color: P.barK })
    for (const [dx, dy] of [[-3, 0], [2, -1], [0, 4], [-2, 6], [3, 4]]) g.ellipse(bx + dx, bY + dy, 0.8, 1.2).fill(0xfff2a0)
    g.poly(stjarnPunkter(bx, bY - 5, 6, 2.5, 5, -Math.PI / 2)).fill(P.blad)
  }
  return { svaj: [] }
}

const SOFFA = { tyg: 0x4aa3a8, tygM: 0x2f7478, dyna: 0x5bb5b9, ljus: 0x8fd6d6, ben: 0x8a5a30, benK: 0x5a3a1c, kudde1: 0xf28a6a, kudde2: 0xf6c94c, prick: 0xfff4dc, rand: 0xe07a3a }

/** VARDAGSRUM: en soffa framifrån. Sittdynorna = plattformen (topp); ryggdynor, armstöd, kuddar. */
export function ritaSoffa(R, it) {
  const { x, w, H } = matt(it, 340, 400)
  const P = SOFFA
  const rot = nod(R, x, MARK)
  const g = ritning(rot)
  const armW = 44
  const benH = 16
  const dynH = 36
  const rygg = Math.min(118, H * 0.85)
  g.ellipse(0, -1, w / 2 + armW + 8, 7).fill({ color: 0x000000, alpha: 0.14 })
  for (const bx of [-(w / 2 + armW - 16), w / 2 + armW - 16, -(w / 2 - 36), w / 2 - 36]) {
    g.moveTo(bx - 7, -benH - 4).lineTo(bx + 7, -benH - 4).lineTo(bx + 4, 0).lineTo(bx - 4, 0).closePath()
      .fill(topLightFill(P.ben, { highlight: 0.25, dark: 0.2 })).stroke({ width: 1.5, color: P.benK })
  }
  // Ryggen: ramen och ryggdynorna bakom sitsen.
  g.roundRect(-w / 2 - 8, -H - rygg, w + 16, rygg + dynH + 6, 26).fill(topLightFill(P.tygM, { highlight: 0.2, dark: 0.15 }))
  const nR = Math.max(2, Math.round(w / 150))
  const cw = w / nR
  for (let i = 0; i < nR; i++) {
    const x0 = -w / 2 + i * cw
    g.roundRect(x0 + 4, -H - rygg + 8, cw - 8, rygg + 4, 20).fill(topLightFill(P.tyg, { highlight: 0.25, dark: 0.18 })).stroke({ width: 2.5, color: P.tygM })
    g.circle(x0 + cw / 2, -H - rygg * 0.5, 3.2).fill(P.tygM)
    g.roundRect(x0 + 18, -H - rygg + 14, cw - 36, 5, 2.5).fill({ color: 0xffffff, alpha: 0.2 })
  }
  // Kuddarna lutar mot ryggen (nederkanten gömd bakom sittdynan).
  const kuddar = []
  const kudde = (kx, r0, farg, monster) => {
    const n = nod(rot, kx, -H + 8)
    n.rotation = r0
    const kg = ritning(n)
    kg.moveTo(-30, 0).quadraticCurveTo(-23, -30, -30, -60).quadraticCurveTo(0, -52, 30, -60).quadraticCurveTo(23, -30, 30, 0)
      .quadraticCurveTo(0, -8, -30, 0).closePath()
      .fill(sphereFill(farg, { lightX: 0.35, lightY: 0.3, dark: 0.25 })).stroke({ width: 2.5, color: shade(farg, 0.35), join: 'round' })
    if (monster === 'prickar') {
      for (const [px, py] of [[-12, -44], [4, -48], [16, -36], [-4, -30], [-16, -18], [10, -16]]) kg.circle(px, py, 3.2).fill(P.prick)
    } else {
      for (const py of [-44, -30, -16]) kg.moveTo(-24, py).quadraticCurveTo(0, py - 3, 24, py).stroke({ width: 4, color: P.rand, alpha: 0.7, cap: 'round' })
    }
    kuddar.push({ n, y0: -H + 8, r0 })
  }
  kudde(-w / 2 + 48, -0.2, P.kudde1, 'prickar')
  kudde(w / 2 - 48, 0.22, P.kudde2, 'rand')
  // Ramen under sitsen.
  g.roundRect(-w / 2 - 6, -H + dynH - 6, w + 12, H - dynH - benH + 8, 12).fill(topLightFill(P.tygM, { highlight: 0.18, dark: 0.2 })).stroke({ width: 2.5, color: shade(P.tygM, 0.3) })
  g.moveTo(-w / 2 + 6, -benH - 8).lineTo(w / 2 - 6, -benH - 8).stroke({ width: 2, color: shade(P.tygM, 0.3), alpha: 0.6 })
  // Sittdynorna — egna noder med vridpunkt i nederkanten, så att de trycks ned och fjädrar.
  const dynor = []
  const nS = Math.max(2, Math.round(w / 150))
  const sw = w / nS
  for (let i = 0; i < nS; i++) {
    const n = nod(rot, -w / 2 + sw * (i + 0.5), -H + dynH)
    const dg = ritning(n)
    dg.roundRect(-sw / 2 + 2, -dynH, sw - 4, dynH + 4, 14).fill(topLightFill(P.dyna, { highlight: 0.3, dark: 0.18 })).stroke({ width: 2.5, color: P.tygM })
    dg.roundRect(-sw / 2 + 14, -dynH + 4, sw - 28, 5, 2.5).fill({ color: 0xffffff, alpha: 0.28 })
    dg.moveTo(-sw / 2 + 10, -dynH + 14).lineTo(sw / 2 - 10, -dynH + 14).stroke({ width: 1.5, color: P.tygM, alpha: 0.35 })
    dynor.push(n)
  }
  // Armstöden, med en rullad överkant.
  const armTopp = -H - 46
  for (const sx of [-1, 1]) {
    const ax = sx * (w / 2 + armW / 2 - 4)
    g.roundRect(ax - armW / 2, armTopp, armW, -armTopp - benH, 18).fill(topLightFill(P.tyg, { highlight: 0.25, dark: 0.22 })).stroke({ width: 2.5, color: P.tygM })
    g.ellipse(ax, armTopp + 12, armW / 2 + 3, 13).fill(topLightFill(P.dyna, { highlight: 0.35, dark: 0.12 })).stroke({ width: 2.5, color: P.tygM })
    g.ellipse(ax - sx * 4, armTopp + 10, armW / 2 - 10, 5).fill({ color: 0xffffff, alpha: 0.25 })
  }
  const fj = fjader(11, 0.22)
  return {
    svaj: [],
    darra(styrka) {
      fj.stot(klam(Number(styrka) || 0, 0, 1))
    },
    uppdatera(T, dt) {
      const a = fj.steg(dt)
      for (const n of dynor) if (levd(n)) n.scale.set(1 - 0.03 * a, 1 + 0.26 * a)
      for (const k of kuddar) {
        if (!levd(k.n)) continue
        k.n.y = k.y0 - 7 * a
        k.n.rotation = k.r0 + 0.05 * a
      }
    },
  }
}

const PUFF = { tyg: 0xe56f86, tygM: 0xa83a55, monster: 0xfff0dc, topp: 0xf08ea2 }

/** VARDAGSRUM: en rund, mönstrad sittpuff. Studsig. */
export function ritaPuff(R, it) {
  const { x, w, H } = matt(it, 160, 420)
  const P = PUFF
  const rot = nod(R, x, MARK)
  ritning(rot).ellipse(0, -1, w * 0.55, 7).fill({ color: 0x000000, alpha: 0.14 })
  const p = nod(rot)
  const g = ritning(p)
  const hw = w / 2
  const sid = (u) => hw * (0.88 + 0.13 * Math.sin(Math.PI * u))
  const topY = -H + 10
  const kropp = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    kropp.push(-sid(u), -4 + (topY + 4) * u)
  }
  for (let i = 10; i >= 0; i--) {
    const u = i / 10
    kropp.push(sid(u), -4 + (topY + 4) * u)
  }
  for (let i = 1; i < 10; i++) {
    const v = Math.PI * (i / 10)
    kropp.push(sid(0) * Math.cos(v), -4 + 6 * Math.sin(v))
  }
  g.poly(kropp).fill(cylinderFill(P.tyg, { axis: 'y', dark: 0.3, highlight: 0.22 })).stroke({ width: 2.5, color: P.tygM, join: 'round' })
  // Sicksack-mönstret, rad för rad, och prickar mellan raderna.
  for (const u of [0.22, 0.5, 0.78]) {
    const yy = -4 + (topY + 4) * u
    const half = sid(u) - 10
    const p2 = []
    const steg = 22
    const n = Math.max(2, Math.floor((2 * half) / steg))
    for (let i = 0; i <= n; i++) p2.push(-half + (2 * half * i) / n, yy + (i % 2 ? -6 : 6))
    linje(g, p2).stroke({ width: 3.5, color: P.monster, alpha: 0.9, join: 'round', cap: 'round' })
  }
  for (const u of [0.36, 0.64]) {
    const yy = -4 + (topY + 4) * u
    const half = sid(u) - 18
    for (let xx = -half; xx <= half; xx += 22) g.circle(xx, yy, 2.4).fill({ color: P.monster, alpha: 0.85 })
  }
  // Toppen: en ljusare ellips med en knapp i mitten och veck ut mot kanten.
  const rt = sid(1)
  g.ellipse(0, topY, rt, 10).fill(topLightFill(P.topp, { highlight: 0.3, dark: 0.1 })).stroke({ width: 2.5, color: P.tygM })
  for (let i = 0; i < 8; i++) {
    const v = (i / 8) * TAU
    g.moveTo(Math.cos(v) * 6, topY + Math.sin(v) * 1.6).lineTo(Math.cos(v) * rt * 0.8, topY + Math.sin(v) * 7).stroke({ width: 1.5, color: P.tygM, alpha: 0.35 })
  }
  g.ellipse(0, topY, rt - 6, 6.5).stroke({ width: 2, color: P.monster, alpha: 0.55 })
  g.circle(0, topY, 4.5).fill(P.tygM)
  g.circle(-1, topY - 1, 1.5).fill({ color: 0xffffff, alpha: 0.5 })
  const fj = fjader(12, 0.18)
  return {
    svaj: [],
    darra(styrka) {
      fj.stot(klam(Number(styrka) || 0, 0, 1))
    },
    uppdatera(T, dt) {
      if (!levd(p)) return
      const a = fj.steg(dt)
      p.scale.set(1 - 0.08 * a, 1 + 0.14 * a)
    },
  }
}

const BORD = { tra: 0xc28a52, traM: 0x8a5a30, traL: 0xe0b07a, kopp: 0xf6c94c, koppK: 0xb8901c, kaffe: 0x7a4a2a, fat: 0xf4f7fb, fatK: 0xa9b8c6, bok1: 0x3f7fd0, bok2: 0xe8543f, bok3: 0x5bbf6a, bok4: 0xa78bfa, sidor: 0xfff6e0 }

// En bok liggande platt (framsidan av sidorna vänd mot oss).
function bok(g, cx, botten, bredd, tjock, farg) {
  g.roundRect(cx - bredd / 2, botten - tjock, bredd, tjock, 2.5).fill(topLightFill(farg, { highlight: 0.25, dark: 0.2 })).stroke({ width: 1.5, color: shade(farg, 0.4) })
  g.rect(cx - bredd / 2 + 5, botten - tjock + 2.5, bredd - 8, tjock - 5).fill(BORD.sidor)
  for (let i = 1; i < 3; i++) g.moveTo(cx - bredd / 2 + 6, botten - tjock + 2.5 + ((tjock - 5) * i) / 3).lineTo(cx + bredd / 2 - 4, botten - tjock + 2.5 + ((tjock - 5) * i) / 3).stroke({ width: 0.8, color: shade(BORD.sidor, 0.2) })
}

/** VARDAGSRUM: ett soffbord med en kopp (ånga som vajar) och böcker. */
export function ritaSoffbord(R, it) {
  const { x, w, H } = matt(it, 240, 420)
  const P = BORD
  const rot = nod(R, x, MARK)
  const g = ritning(rot)
  const skiva = 22
  const ben = (bx, farg) => {
    g.moveTo(bx - 8, -H + skiva - 2).lineTo(bx + 8, -H + skiva - 2).lineTo(bx + 5, -2).lineTo(bx - 5, -2).closePath()
      .fill(cylinderFill(farg, { axis: 'y', dark: 0.25, highlight: 0.2 })).stroke({ width: 1.8, color: P.traM })
  }
  g.ellipse(0, -1, w / 2 + 8, 6).fill({ color: 0x000000, alpha: 0.13 })
  for (const sx of [-1, 1]) ben(sx * (w / 2 - 36), P.traM)
  // Hyllan nedtill, med två böcker.
  const hy = -Math.max(26, H * 0.3)
  g.roundRect(-w / 2 + 16, hy, w - 32, 10, 4).fill(topLightFill(P.tra, { highlight: 0.2, dark: 0.2 })).stroke({ width: 1.5, color: P.traM })
  bok(g, -w * 0.18, hy, Math.min(70, w * 0.3), 11, P.bok3)
  bok(g, -w * 0.18 + 6, hy - 11, Math.min(58, w * 0.25), 9, P.bok4)
  for (const sx of [-1, 1]) ben(sx * (w / 2 - 18), P.tra)
  // Skivan.
  g.roundRect(-w / 2, -H, w, skiva, 7).fill(topLightFill(P.tra, { highlight: 0.35, dark: 0.2 })).stroke({ width: 2, color: P.traM })
  g.moveTo(-w / 2 + 8, -H + 4).lineTo(w / 2 - 8, -H + 4).stroke({ width: 2, color: P.traL, alpha: 0.8 })
  for (let i = 0; i < 3; i++) {
    const yy = -H + 9 + i * 4
    g.moveTo(-w / 2 + 16 + i * 20, yy).quadraticCurveTo(0, yy + (i % 2 ? 2 : -2), w / 2 - 20 - i * 14, yy).stroke({ width: 1.2, color: P.traM, alpha: 0.25 })
  }
  // Böckerna på skivan (till vänster) och koppen på sitt fat (till höger).
  const bx = -w * 0.26
  bok(g, bx, -H, Math.min(80, w * 0.34), 11, P.bok1)
  bok(g, bx + 4, -H - 11, Math.min(62, w * 0.27), 9, P.bok2)
  const kx = w * 0.3
  g.ellipse(kx, -H - 2, 24, 5).fill(P.fat).stroke({ width: 1.5, color: P.fatK })
  g.ellipse(kx + 16, -H - 17, 7, 8).stroke({ width: 4.5, color: P.koppK })
  g.ellipse(kx + 16, -H - 17, 7, 8).stroke({ width: 2.5, color: P.kopp })
  g.moveTo(kx - 14, -H - 30).lineTo(kx + 14, -H - 30).lineTo(kx + 12, -H - 7).quadraticCurveTo(kx, -H - 2, kx - 12, -H - 7).closePath()
    .fill(cylinderFill(P.kopp, { axis: 'y', dark: 0.2, highlight: 0.3 })).stroke({ width: 1.8, color: P.koppK, join: 'round' })
  g.ellipse(kx, -H - 30, 14, 4).fill(P.koppK)
  g.ellipse(kx, -H - 29.4, 11.5, 2.8).fill(P.kaffe)
  g.poly(hjartPunkter(kx, -H - 18, 5)).fill(0xffffff)
  // Ångan: en egen nod vid koppens kant som vajar (svaj) och andas (uppdatera).
  const anga = nod(rot, kx, -H - 34)
  const ag = ritning(anga)
  ag.moveTo(-4, 0).bezierCurveTo(-11, -10, 4, -16, -3, -28).stroke({ width: 3, color: 0xffffff, alpha: 0.6, cap: 'round' })
  ag.moveTo(5, -2).bezierCurveTo(0, -12, 11, -18, 5, -32).stroke({ width: 2.5, color: 0xffffff, alpha: 0.45, cap: 'round' })
  return {
    svaj: [{ nod: anga, bas: 0, amp: 0.18, w: 2.1, fas: 0 }],
    uppdatera(T) {
      if (levd(anga)) anga.alpha = 0.55 + 0.45 * Math.sin(T * 1.3)
    },
  }
}

const HANDFAT = { porslin: 0xf4f8fb, porslinM: 0xdfe8f0, porslinK: 0xa9b8c6, krom: 0xc5d0da, kromK: 0x7d8b98, varm: 0xe8534a, kall: 0x4a8fe0, tval: 0x8fd6c4, tvalK: 0x4a9a88, pump: 0xf0f3f6, vatten: 0x9fd8ff }

/** BADRUM: ett piedestalhandfat — kanten = topp; kran (som droppar), tvålpump. */
export function ritaHandfat(R, it) {
  const { x, w, H } = matt(it, 200, 400)
  const P = HANDFAT
  const rot = nod(R, x, MARK)
  const g = ritning(rot)
  const skalH = Math.min(62, H * 0.42)
  g.ellipse(0, -1, 44, 6).fill({ color: 0x000000, alpha: 0.13 })
  // Foten.
  g.moveTo(-18, -H + skalH - 6).bezierCurveTo(-13, -H * 0.5, -14, -30, -38, -3).quadraticCurveTo(0, 3, 38, -3)
    .bezierCurveTo(14, -30, 13, -H * 0.5, 18, -H + skalH - 6).closePath()
    .fill(cylinderFill(P.porslin, { axis: 'y', dark: 0.2, highlight: 0.2 })).stroke({ width: 2, color: P.porslinK })
  // Kranen bakom kanten, med vred för varmt och kallt.
  g.roundRect(-6, -H - 34, 12, 38, 5).fill(cylinderFill(P.krom, { axis: 'y', dark: 0.3, highlight: 0.45 })).stroke({ width: 1.6, color: P.kromK })
  const pip = [0, -H - 30, 0, -H - 48, 26, -H - 50, 26, -H - 30]
  g.moveTo(pip[0], pip[1]).bezierCurveTo(pip[2], pip[3], pip[4], pip[5], pip[6], pip[7]).stroke({ width: 9, color: P.kromK, cap: 'round' })
  g.moveTo(pip[0], pip[1]).bezierCurveTo(pip[2], pip[3], pip[4], pip[5], pip[6], pip[7]).stroke({ width: 6, color: P.krom, cap: 'round' })
  g.moveTo(2, -H - 38).bezierCurveTo(3, -H - 45, 18, -H - 46, 22, -H - 40).stroke({ width: 1.6, color: 0xffffff, alpha: 0.75, cap: 'round' })
  for (const [sx, farg] of [[-1, P.varm], [1, P.kall]]) {
    g.ellipse(sx * 20, -H - 6, 8, 6).fill(sphereFill(P.krom, { lightX: 0.4, lightY: 0.3, dark: 0.3 })).stroke({ width: 1.5, color: P.kromK })
    g.circle(sx * 20, -H - 7, 2.4).fill(farg)
  }
  // Droppen från pipen (faller in bakom kanten).
  const dropp = nod(rot, 26, -H - 26)
  const dg = ritning(dropp)
  dg.moveTo(0, -3).bezierCurveTo(1.5, 0, 3.5, 2, 3.5, 4).bezierCurveTo(3.5, 7, -3.5, 7, -3.5, 4).bezierCurveTo(-3.5, 2, -1.5, 0, 0, -3).closePath()
    .fill(P.vatten).stroke({ width: 1, color: 0x3a8ec8 })
  dg.circle(-1.2, 3.5, 0.9).fill(0xffffff)
  // Skålen och kanten (det grodan står på).
  g.moveTo(-w / 2 + 6, -H + 10).bezierCurveTo(-w / 2 + 10, -H + skalH + 8, w / 2 - 10, -H + skalH + 8, w / 2 - 6, -H + 10).closePath()
    .fill(sphereFill(P.porslin, { lightX: 0.35, lightY: 0.15, dark: 0.16 })).stroke({ width: 2, color: P.porslinK })
  g.roundRect(-w / 2, -H, w, 16, 8).fill(topLightFill(P.porslin, { highlight: 0.4, dark: 0.14 })).stroke({ width: 2, color: P.porslinK })
  g.moveTo(-w / 2 + 10, -H + 4).lineTo(w / 2 - 10, -H + 4).stroke({ width: 2, color: 0xffffff, alpha: 0.9, cap: 'round' })
  // Tvålpumpen på kanten till höger.
  const px = Math.max(w / 2 - 26, 42) // aldrig ovanpå kranens vred (±20 ± 8)
  g.roundRect(px - 11, -H - 32, 22, 32, 7).fill(cylinderFill(P.tval, { axis: 'y', dark: 0.25, highlight: 0.3 })).stroke({ width: 1.6, color: P.tvalK })
  g.roundRect(px - 7, -H - 24, 14, 12, 3).fill({ color: 0xffffff, alpha: 0.85 })
  g.poly(hjartPunkter(px, -H - 18, 3.2)).fill(P.tvalK)
  g.rect(px - 3, -H - 41, 6, 10).fill(P.pump).stroke({ width: 1.2, color: P.porslinK })
  g.roundRect(px - 9, -H - 46, 16, 6, 2.5).fill(P.pump).stroke({ width: 1.2, color: P.porslinK })
  g.rect(px - 16, -H - 45, 8, 3.5).fill(P.pump).stroke({ width: 1.2, color: P.porslinK })
  return {
    svaj: [],
    uppdatera(T) {
      if (!levd(dropp)) return
      const c = (T % 2.6) / 2.6
      if (c < 0.7) {
        dropp.scale.set(0.3 + (0.7 * c) / 0.7)
        dropp.y = -H - 26
        dropp.alpha = 1
      } else {
        const u = (c - 0.7) / 0.3
        dropp.scale.set(1)
        dropp.y = -H - 26 + u * u * 34
        dropp.alpha = 1 - u * 0.6
      }
    },
  }
}

const PALL = { farg: 0x7fcfb8, kant: 0x3f8f7a, ljus: 0xc4efe2, ben: 0x6bbca5 }

/** BADRUM: en liten pall. */
export function ritaPall(R, it) {
  const { x, w, H } = matt(it, 130, 440)
  const P = PALL
  const rot = nod(R, x, MARK)
  const g = ritning(rot)
  const ben = (x0, x1, farg) => {
    g.moveTo(x0 - 7, -H + 20).lineTo(x0 + 7, -H + 20).lineTo(x1 + 5, -2).lineTo(x1 - 5, -2).closePath()
      .fill(topLightFill(farg, { highlight: 0.2, dark: 0.2 })).stroke({ width: 1.8, color: P.kant, join: 'round' })
  }
  g.ellipse(0, -1, w / 2 + 6, 6).fill({ color: 0x000000, alpha: 0.13 })
  for (const sx of [-1, 1]) ben(sx * (w / 2 - 26), sx * (w / 2 - 20), shade(P.ben, 0.15))
  g.roundRect(-w / 2 + 16, -H * 0.42, w - 32, 9, 4).fill(topLightFill(P.ben, { highlight: 0.2, dark: 0.2 })).stroke({ width: 1.6, color: P.kant })
  for (const sx of [-1, 1]) ben(sx * (w / 2 - 13), sx * (w / 2 + 3), P.ben)
  g.roundRect(-w / 2, -H, w, 24, 10).fill(topLightFill(P.farg, { highlight: 0.3, dark: 0.2 })).stroke({ width: 2, color: P.kant })
  g.moveTo(-w / 2 + 10, -H + 4).lineTo(w / 2 - 10, -H + 4).stroke({ width: 2, color: P.ljus, alpha: 0.9, cap: 'round' })
  g.ellipse(0, -H + 13, Math.min(18, w * 0.14), 4.5).fill({ color: P.kant, alpha: 0.7 })
  return { svaj: [] }
}

const KORG = { flata: 0xd9b47a, flataM: 0x9a7040, flataL: 0xf0d6a4, kant: 0xc39457, hal: 0x6a4a24, bla: 0x7fb8e8, blaR: 0xffffff, rosa: 0xf4a3c0, rosaR: 0xffe27a, gul: 0xf6d36a }

/** BADRUM: en flätad tvättkorg (kanten = topp) med handdukar som sticker upp och hänger ut. */
export function ritaTvattkorg(R, it) {
  const { x, w, H } = matt(it, 180, 420)
  const P = KORG
  const rot = nod(R, x, MARK)
  const g = ritning(rot)
  const wt = w / 2
  const wb = w * 0.43
  const halv = (y) => wb + (wt - wb) * ((-y) / H)
  g.ellipse(0, -1, wb + 10, 6).fill({ color: 0x000000, alpha: 0.13 })
  // Handdukarna inne i korgen (bakom framsidan) — låga pucklar, grodan står ändå på kanten.
  g.moveTo(-w * 0.42, -H + 22).bezierCurveTo(-w * 0.4, -H - 32, -w * 0.02, -H - 36, w * 0.06, -H + 22).closePath()
    .fill(topLightFill(P.bla, { highlight: 0.3, dark: 0.15 })).stroke({ width: 2, color: shade(P.bla, 0.35) })
  g.moveTo(-w * 0.35, -H - 5).quadraticCurveTo(-w * 0.18, -H - 22, -w * 0.02, -H - 5).stroke({ width: 3.5, color: P.blaR, alpha: 0.85, cap: 'round' })
  g.moveTo(-w * 0.04, -H + 22).bezierCurveTo(-w * 0.02, -H - 22, w * 0.37, -H - 26, w * 0.43, -H + 22).closePath()
    .fill(topLightFill(P.rosa, { highlight: 0.3, dark: 0.15 })).stroke({ width: 2, color: shade(P.rosa, 0.35) })
  g.moveTo(w * 0.04, -H - 1).quadraticCurveTo(w * 0.2, -H - 15, w * 0.37, -H - 1).stroke({ width: 3.5, color: P.rosaR, alpha: 0.85, cap: 'round' })
  // Korgen.
  g.moveTo(-wt, -H + 6).lineTo(-wb, -14).quadraticCurveTo(-wb, 0, -wb + 14, 0).lineTo(wb - 14, 0).quadraticCurveTo(wb, 0, wb, -14).lineTo(wt, -H + 6).closePath()
    .fill(topLightFill(P.flata, { highlight: 0.25, dark: 0.22 })).stroke({ width: 2.5, color: P.flataM, join: 'round' })
  // Flätningen: rader, stavar och ljusa "rutor" i schackmönster.
  const radH = 13
  const rader = Math.floor((H - 22) / radH)
  for (let r = 0; r < rader; r++) {
    const y1 = -8 - r * radH
    const y0 = y1 - radH
    const hb = halv(y0) - 6
    for (let xx = -hb + 4, k = 0; xx < hb - 10; xx += 18, k++) {
      if ((r + k) % 2 === 0) g.roundRect(xx, y0 + 2.5, 14, radH - 5, 4).fill({ color: P.flataL, alpha: 0.5 })
    }
    g.moveTo(-halv(y1) + 3, y1).lineTo(halv(y1) - 3, y1).stroke({ width: 1.4, color: P.flataM, alpha: 0.5 })
  }
  // Handtagen: två avlånga hål under kanten.
  for (const sx of [-1, 1]) {
    g.ellipse(sx * (wt - 26), -H + 28, 14, 6.5).fill(P.hal)
    g.ellipse(sx * (wt - 26), -H + 26.5, 12, 3.5).fill({ color: 0x000000, alpha: 0.25 })
  }
  // Kanten — en tjock flätad list.
  g.roundRect(-wt - 5, -H - 2, w + 10, 16, 8).fill(topLightFill(P.kant, { highlight: 0.3, dark: 0.2 })).stroke({ width: 2, color: P.flataM })
  for (let xx = -wt + 2; xx < wt - 2; xx += 9) g.moveTo(xx, -H + 1).lineTo(xx + 6, -H + 11).stroke({ width: 1.6, color: P.flataM, alpha: 0.45, cap: 'round' })
  // En handduk som hänger ut över kanten och vajar lite.
  const hang = nod(rot, -w * 0.08, -H + 2)
  const hg = ritning(hang)
  hg.roundRect(-17, -4, 34, 60, 7).fill(topLightFill(P.gul, { highlight: 0.3, dark: 0.18 })).stroke({ width: 2, color: shade(P.gul, 0.35) })
  hg.rect(-16, 38, 32, 6).fill({ color: 0xffffff, alpha: 0.8 })
  hg.rect(-16, 46, 32, 2.5).fill({ color: 0xffffff, alpha: 0.6 })
  for (let xx = -14; xx <= 14; xx += 4) hg.moveTo(xx, 56).lineTo(xx, 61).stroke({ width: 1.4, color: shade(P.gul, 0.2), cap: 'round' })
  hg.roundRect(-18, -6, 36, 10, 5).fill(topLightFill(P.gul, { highlight: 0.35, dark: 0.1 })).stroke({ width: 2, color: shade(P.gul, 0.35) })
  return { svaj: [{ nod: hang, bas: 0, amp: 0.05, w: 1.3, fas: 0.7 }] }
}
