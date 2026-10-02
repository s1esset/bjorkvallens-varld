// BLÄCKFISKEN OTTO — all ritning (inga bilder, inga emoji). Varje föremål är en egen silhuett:
// ett skal, en burk, en boll, en kista — aldrig en ikon i en ruta. Formerna ritas centrerade i
// (0,0) så att spelet kan lägga dem i en container och guppa/vagga INNE i den.
import { Container, Graphics } from 'pixi.js'
import { sphereFill, topLightFill, groundFill, bage } from '../../lib/form.js'
import { shade, tint } from '../../lib/theme.js'

const TAU = Math.PI * 2
const lerp = (a, b, t) => a + (b - a) * t
export const FLOOR = 652 // fysikens golv (ovansidan)
export const OTTO_Y = 556
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const slump = (a, b) => a + Math.random() * (b - a)

export function nolla(n) {
  n.eventMode = 'none'
  return n
}

// Ett öga som tittar åt (lx, ly) i -1..1.
function ogon(g, x, y, r, lx = 0, ly = 0) {
  g.circle(x, y, r).fill(0xffffff).stroke({ width: Math.max(1.5, r * 0.12), color: 0x2a2540, alpha: 0.3 })
  g.circle(x + lx * r * 0.38, y + ly * r * 0.38, r * 0.54).fill(0x25203a)
  g.circle(x + lx * r * 0.38 - r * 0.17, y + ly * r * 0.38 - r * 0.2, r * 0.18).fill(0xffffff)
}

// ───────────────────────── FÖREMÅL ─────────────────────────
// r = fysikradie, flyt < 1 sjunker (lägre = snabbare), tung = Otto dras dit i stället för att saken följer.
export const SAKER = {
  skal: { r: 36, flyt: 0.45, rita: ritaSkal },
  burk: { r: 62, flyt: 0.9, rita: ritaBurk },
  unge: { r: 34, flyt: 0.42, rita: (g) => ritaSjohast(g, 0xff9a5c, 0.62, true) },
  boll: { r: 34, flyt: 0.4, rita: ritaBoll },
  kista: { r: 56, flyt: 0.2, tung: true, rita: ritaKista },
  sjostjarna: { r: 38, flyt: 0.38, rita: ritaSjostjarna },
  flaska: { r: 32, flyt: 0.72, rita: ritaFlaska },
  snacka: { r: 36, flyt: 0.35, rita: ritaSnacka },
}

function ritaSkal(g) {
  g.circle(4, 4, 31).fill(sphereFill(0xf6bd7c))
  g.poly([-22, -16, -50, -34, -36, 8]).fill(0xe9a35f)
  g.poly([-22, -16, -50, -34, -36, 8]).stroke({ width: 2, color: 0xc9803c, alpha: 0.6, join: 'round' })
  bage(g, 4, 4, 22, 3.3, 7.4).stroke({ width: 4.5, color: 0xd28a45, cap: 'round' })
  bage(g, 4, 4, 12, 4.1, 7.9).stroke({ width: 4, color: 0xd28a45, cap: 'round' })
  g.circle(-4, -14, 7).fill({ color: 0xffffff, alpha: 0.35 })
  g.circle(4, 4, 31).stroke({ width: 3, color: 0xc9803c, alpha: 0.7 })
}

function ritaBurk(g) {
  g.roundRect(-45, -52, 90, 106, 24).fill({ color: 0xbfe9f7, alpha: 0.32 })
  g.roundRect(-45, -52, 90, 106, 24).stroke({ width: 4, color: 0xffffff, alpha: 0.75 })
  g.roundRect(-34, -66, 68, 18, 7).fill(topLightFill(0xc3ccd4))
  g.roundRect(-34, -66, 68, 18, 7).stroke({ width: 2, color: 0x7d8794, alpha: 0.8 })
  g.roundRect(-33, -34, 9, 62, 4).fill({ color: 0xffffff, alpha: 0.55 })
  g.circle(24, 36, 4).fill({ color: 0xffffff, alpha: 0.5 })
}

function ritaBoll(g) {
  const r = 33
  const farg = [0xff5e6c, 0xffffff, 0xffd35c, 0xffffff, 0x4aa3df, 0xffffff]
  for (let i = 0; i < 6; i++) {
    g.moveTo(0, 0).arc(0, 0, r, (i * TAU) / 6, ((i + 1) * TAU) / 6).closePath().fill(farg[i])
  }
  g.circle(0, 0, r).stroke({ width: 2.5, color: 0x3a3a50, alpha: 0.35 })
  g.circle(0, 0, 6).fill(0xffffff)
  g.circle(-10, -12, 8).fill({ color: 0xffffff, alpha: 0.35 })
}

// Kistan: botten + ett lock i egen container (`lock`) som kan vickas upp vid festen.
function ritaKista(g, kropp) {
  g.roundRect(-58, -6, 116, 52, 8).fill(topLightFill(0x9a6238))
  for (let i = -1; i <= 1; i++) g.moveTo(i * 36, -4).lineTo(i * 36, 44).stroke({ width: 2, color: 0x6e4222, alpha: 0.55 })
  g.roundRect(-60, 18, 120, 11, 3).fill(topLightFill(0xe8b93c))
  g.roundRect(-58, -6, 116, 52, 8).stroke({ width: 3, color: 0x5d3a20, alpha: 0.8 })
  g.roundRect(-12, 14, 24, 22, 5).fill(0xffd35c)
  g.circle(0, 24, 4).fill(0x6e4222)
  if (kropp) {
    const lock = new Container()
    lock.position.set(-58, -6)
    const l = new Graphics()
    l.poly([0, 0, 116, 0, 112, -30, 92, -46, 24, -46, 4, -30]).fill(topLightFill(0xa96a3c))
    l.poly([0, 0, 116, 0, 112, -30, 92, -46, 24, -46, 4, -30]).stroke({ width: 3, color: 0x5d3a20, alpha: 0.8, join: 'round' })
    l.roundRect(0, -10, 116, 11, 3).fill(topLightFill(0xe8b93c))
    l.roundRect(50, -14, 16, 18, 4).fill(0xffd35c)
    l.eventMode = 'none'
    lock.addChild(l)
    kropp.addChild(lock)
    kropp.lock = lock
  }
}

function ritaSjostjarna(g) {
  g.star(0, 0, 5, 40, 17, -Math.PI / 2).fill(topLightFill(0xff9248))
  g.star(0, 0, 5, 40, 17, -Math.PI / 2).stroke({ width: 5, color: 0xff9248, join: 'round' })
  g.star(0, 0, 5, 40, 17, -Math.PI / 2).stroke({ width: 2, color: 0xd9692a, alpha: 0.5, join: 'round' })
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5
    g.circle(Math.cos(a) * 16, Math.sin(a) * 16, 3.2).fill(0xffe3b8)
    g.circle(Math.cos(a) * 28, Math.sin(a) * 28, 2.6).fill(0xffe3b8)
  }
  g.circle(0, 0, 5).fill(0xffe3b8)
}

function ritaFlaska(g) {
  g.roundRect(-15, -4, 30, 52, 13).fill({ color: 0x7ed6a4, alpha: 0.75 })
  g.roundRect(-15, -4, 30, 52, 13).stroke({ width: 3, color: 0x3f9d6c, alpha: 0.8 })
  g.roundRect(-8, -34, 16, 34, 5).fill({ color: 0x7ed6a4, alpha: 0.75 })
  g.roundRect(-8, -34, 16, 34, 5).stroke({ width: 3, color: 0x3f9d6c, alpha: 0.8 })
  g.roundRect(-7, -44, 14, 12, 4).fill(0xb8814a)
  g.roundRect(-6, 8, 12, 26, 4).fill({ color: 0xfff3d1, alpha: 0.9 })
  g.roundRect(-10, 2, 4, 36, 2).fill({ color: 0xffffff, alpha: 0.55 })
}

// En solfjäderformad kammussla — medvetet INTE lik krabbans spiralskal.
function ritaSnacka(g) {
  const pts = [-14, 26]
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI + (k / 12) * Math.PI
    pts.push(Math.cos(a) * 40, Math.sin(a) * 38 + 8)
  }
  pts.push(14, 26)
  g.poly(pts).fill(sphereFill(0xffa8c4, { lightY: 0.15, spread: 0.7 }))
  g.poly(pts).stroke({ width: 3, color: 0xd9688f, alpha: 0.8, join: 'round' })
  for (let k = 1; k < 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI
    g.moveTo(0, 24).lineTo(Math.cos(a) * 36, Math.sin(a) * 34 + 8).stroke({ width: 2.4, color: 0xd9688f, alpha: 0.65 })
  }
  g.roundRect(-14, 22, 28, 10, 4).fill(0xe27ba0)
}

// ───────────────────────── VÄNNER ─────────────────────────
export const VANNER = {
  krabba: { zon: 112, sak: 'skal', mitten: false, hojd: 0, anker: { x: 2, y: -46 } },
  fisk: { zon: 112, sak: 'burk', mitten: true, hojd: 300, anker: { x: 0, y: 0 } },
  sjohast: { zon: 112, sak: 'unge', mitten: true, hojd: 340, anker: { x: 74, y: 34 } },
  skoldpadda: { zon: 118, sak: 'boll', mitten: false, hojd: 0, anker: { x: 98, y: 20 } },
}

export function ritaVan(g, typ, glad) {
  g.clear()
  if (typ === 'krabba') return ritaKrabba(g, glad)
  if (typ === 'fisk') return ritaFisk(g, glad)
  if (typ === 'sjohast') return ritaSjohast(g, 0xffc83d, 1.55, glad)
  return ritaSkoldpadda(g, glad)
}

function ritaKrabba(g, glad) {
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      g.moveTo(s * 30, 12 + k * 8).lineTo(s * (56 + k * 7), 24 + k * 13).stroke({ width: 6, color: 0xe0603c, cap: 'round' })
    }
    const uppe = glad ? -66 : -36
    g.moveTo(s * 42, -2).lineTo(s * 62, uppe + 12).stroke({ width: 10, color: 0xf0714a, cap: 'round' })
    g.ellipse(s * 68, uppe, 18, 15).fill(sphereFill(0xff7a52))
    g.poly([s * 70, uppe - 2, s * 86, uppe - 20, s * 92, uppe - 2]).fill(0xff6a3f)
    g.ellipse(s * 68, uppe, 18, 15).stroke({ width: 2.5, color: 0xc84a2a, alpha: 0.6 })
  }
  g.ellipse(0, 8, 54, 34).fill(sphereFill(0xff7a52))
  g.ellipse(0, 8, 54, 34).stroke({ width: 3, color: 0xc84a2a, alpha: 0.55 })
  for (const s of [-1, 1]) {
    g.moveTo(s * 14, -20).lineTo(s * 16, -42).stroke({ width: 5, color: 0xe0603c, cap: 'round' })
    ogon(g, s * 16, -50, 10, glad ? 0 : -s * 0.4, glad ? -0.3 : 0.5)
  }
  if (glad) bage(g, 0, 8, 13, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 4, color: 0x7a2b18, cap: 'round' })
  else bage(g, 0, 24, 11, 1.15 * Math.PI, 1.85 * Math.PI).stroke({ width: 4, color: 0x7a2b18, cap: 'round' })
}

function ritaFisk(g, glad) {
  g.poly([-42, 0, -82, -28, -80, 28]).fill(0xff9a3c)
  g.poly([-42, 0, -82, -28, -80, 28]).stroke({ width: 2.5, color: 0xd96a1c, alpha: 0.6, join: 'round' })
  g.poly([-8, -30, 12, -56, 28, -28]).fill(0xff7f2a)
  g.poly([4, 26, 22, 46, 30, 22]).fill(0xff7f2a)
  g.ellipse(0, 0, 54, 36).fill(sphereFill(0xffa94d))
  g.ellipse(-14, 0, 6, 31).fill({ color: 0xffffff, alpha: 0.85 })
  g.ellipse(6, 0, 5, 32).fill({ color: 0xffffff, alpha: 0.85 })
  g.ellipse(0, 0, 54, 36).stroke({ width: 3, color: 0xd96a1c, alpha: 0.55 })
  ogon(g, 28, -8, 11, glad ? 0.4 : 0.2, glad ? -0.2 : 0.4)
  if (glad) bage(g, 38, 4, 11, 0.15 * Math.PI, 0.8 * Math.PI).stroke({ width: 3.5, color: 0x8a3a10, cap: 'round' })
  else g.ellipse(44, 12, 6, 5).fill(0x8a3a10)
}

// En sjöhäst (mamman stor, ungen liten): svans som rullar ihop sig, krona, nos och ryggfena.
export function ritaSjohast(g, farg, s, glad) {
  const P = (x, y) => [x * s, y * s]
  const rygg = [P(6, -34), P(-6, -12), P(-8, 18), P(4, 40), P(22, 54), P(18, 72), P(2, 68), P(6, 54)]
  // ryggfena bakom kroppen
  g.ellipse(18 * s, -2 * s, 11 * s, 22 * s).fill({ color: tint(farg, 0.45), alpha: 0.85 })
  g.moveTo(...rygg[0])
  g.quadraticCurveTo(...rygg[1], ...rygg[2])
  g.quadraticCurveTo(...P(-6, 34), ...rygg[3])
  g.quadraticCurveTo(...P(26, 46), ...rygg[4])
  g.quadraticCurveTo(...P(30, 72), ...rygg[5])
  g.quadraticCurveTo(...P(6, 76), ...rygg[6])
  g.quadraticCurveTo(...P(-2, 56), ...rygg[7])
  g.stroke({ width: 22 * s, color: shade(farg, 0.22), cap: 'round', join: 'round' })
  g.moveTo(...rygg[0])
  g.quadraticCurveTo(...rygg[1], ...rygg[2])
  g.quadraticCurveTo(...P(-6, 34), ...rygg[3])
  g.quadraticCurveTo(...P(26, 46), ...rygg[4])
  g.quadraticCurveTo(...P(30, 72), ...rygg[5])
  g.quadraticCurveTo(...P(6, 76), ...rygg[6])
  g.quadraticCurveTo(...P(-2, 56), ...rygg[7])
  g.stroke({ width: 17 * s, color: farg, cap: 'round', join: 'round' })
  // buk
  g.ellipse(-3 * s, 6 * s, 9 * s, 20 * s).fill({ color: tint(farg, 0.5), alpha: 0.7 })
  // huvud + nos
  g.circle(6 * s, -38 * s, 15 * s).fill(sphereFill(farg))
  g.ellipse(-12 * s, -34 * s, 15 * s, 6.5 * s).fill(shade(farg, 0.1))
  for (let k = 0; k < 3; k++) g.circle((2 + k * 6) * s, -54 * s - (k === 1 ? 3 * s : 0), 3.6 * s).fill(tint(farg, 0.35))
  ogon(g, 5 * s, -42 * s, 6.5 * s, -0.3, glad ? -0.4 : 0.2)
  if (glad) bage(g, -10 * s, -32 * s, 5 * s, 0.1 * Math.PI, 0.9 * Math.PI).stroke({ width: 2 * s, color: 0x7a4a10, cap: 'round' })
}

function ritaSkoldpadda(g, glad) {
  g.poly([-56, 8, -80, 14, -58, 20]).fill(0x8ccf6a)
  for (const [x0, y0, x1, y1] of [[34, 16, 66, 40], [-34, 18, -64, 44], [38, 22, 22, 46], [-30, 24, -14, 48]]) {
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 20, color: 0x8ccf6a, cap: 'round' })
  }
  g.circle(78, -2, 23).fill(sphereFill(0xa4dd82))
  ogon(g, 87, -9, 8, 0.4, glad ? -0.3 : 0.2)
  if (glad) bage(g, 84, 4, 9, 0.1 * Math.PI, 0.85 * Math.PI).stroke({ width: 3, color: 0x2f6a30, cap: 'round' })
  else g.moveTo(80, 12).lineTo(92, 12).stroke({ width: 3, color: 0x2f6a30, cap: 'round' })
  g.ellipse(0, 0, 64, 42).fill(sphereFill(0x4f9a52, { lightY: 0.2 }))
  g.ellipse(0, 0, 64, 42).stroke({ width: 4, color: 0x2f6a30, alpha: 0.7 })
  for (const [x, y, r] of [[0, -4, 14], [-30, 0, 12], [30, 0, 12], [-15, 20, 11], [15, 20, 11], [-14, -24, 9], [14, -24, 9]]) {
    g.circle(x, y, r).stroke({ width: 3, color: 0x8fd18a, alpha: 0.75 })
  }
}

// ───────────────────────── OTTO ─────────────────────────
// Huvudet. `o` = { look:{x,y}, blink, mun:'leende'|'oj'|'glad' }. Ritas om bara när något ändrats.
export function ritaOtto(g, farg, o) {
  g.clear()
  g.ellipse(0, 4, 78, 86).fill(sphereFill(farg, { lightX: 0.36, lightY: 0.26, spread: 0.62, highlight: 0.42, dark: 0.26 }))
  g.ellipse(0, 4, 78, 86).stroke({ width: 3.5, color: shade(farg, 0.35), alpha: 0.55 })
  for (const [x, y, r] of [[-34, -46, 8], [-14, -62, 6], [36, -40, 9], [20, -56, 5], [52, -8, 6]]) g.circle(x, y, r).fill({ color: shade(farg, 0.3), alpha: 0.28 })
  g.circle(-40, 38, 12).fill({ color: 0xff7fa8, alpha: o.glad ? 0.55 : 0.25 })
  g.circle(40, 38, 12).fill({ color: 0xff7fa8, alpha: o.glad ? 0.55 : 0.25 })
  const lx = o.look.x
  const ly = o.look.y
  for (const s of [-1, 1]) {
    const x = s * 29
    if (o.blink) {
      bage(g, x, 12, 14, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 4, color: 0x2a2540, cap: 'round' })
    } else {
      ogon(g, x, 8, 18, lx, ly)
    }
  }
  if (o.mun === 'oj') g.ellipse(0, 46, 8, 10).fill(0x7a2f55)
  else if (o.mun === 'glad') {
    g.moveTo(-18, 40).quadraticCurveTo(0, 66, 18, 40).closePath().fill(0x7a2f55)
    g.ellipse(0, 54, 8, 4.5).fill(0xff7fa8)
  } else bage(g, 0, 36, 16, 0.2 * Math.PI, 0.8 * Math.PI).stroke({ width: 4, color: 0x7a2f55, cap: 'round' })
}

// En arm: avsmalnande, med sugkoppar längs undersidan och en tydlig sugkopp i spetsen.
export function ritaArm(g, rep, farg, sida, tryck) {
  const P = rep.pts
  const n = P.length
  const S = [P[0]]
  for (let i = 1; i < n - 1; i++) {
    const a = { x: (P[i - 1].x + P[i].x) / 2, y: (P[i - 1].y + P[i].y) / 2 }
    const m = { x: (P[i].x + P[i + 1].x) / 2, y: (P[i].y + P[i + 1].y) / 2 }
    for (let s = 1; s <= 2; s++) {
      const t = s / 2
      const u = 1 - t
      S.push({ x: u * u * a.x + 2 * u * t * P[i].x + t * t * m.x, y: u * u * a.y + 2 * u * t * P[i].y + t * t * m.y })
    }
  }
  S.push(P[n - 1])
  const m = S.length
  const L = []
  const R = []
  const N = []
  const W = []
  for (let k = 0; k < m; k++) {
    const a = S[Math.max(0, k - 1)]
    const b = S[Math.min(m - 1, k + 1)]
    let tx = b.x - a.x
    let ty = b.y - a.y
    const d = Math.hypot(tx, ty) || 1
    tx /= d
    ty /= d
    const nx = -ty
    const ny = tx
    const w = lerp(23, 7.5, Math.pow(k / (m - 1), 0.8))
    N.push({ x: nx, y: ny })
    W.push(w)
    L.push(S[k].x + nx * w, S[k].y + ny * w)
    R.push(S[k].x - nx * w, S[k].y - ny * w)
  }
  const poly = L.slice()
  for (let k = m - 1; k >= 0; k--) poly.push(R[k * 2], R[k * 2 + 1])
  g.clear()
  g.poly(poly).fill(farg).stroke({ width: 2.5, color: shade(farg, 0.38), alpha: 0.55, join: 'round' })
  // glans längs ryggen
  const glans = []
  for (let k = 2; k < m - 2; k++) glans.push(S[k].x - N[k].x * W[k] * 0.45, S[k].y - N[k].y * W[k] * 0.45)
  if (glans.length >= 4) g.poly(glans, false).stroke({ width: 2.4, color: tint(farg, 0.5), alpha: 0.35, cap: 'round', join: 'round' })
  // sugkoppar
  const ljus = tint(farg, 0.62)
  for (let k = 5; k < m - 2; k += 2) {
    const w = W[k]
    g.circle(S[k].x + N[k].x * w * 0.18 * sida, S[k].y + N[k].y * w * 0.18 * sida, w * 0.5).fill(ljus)
    g.circle(S[k].x + N[k].x * w * 0.18 * sida, S[k].y + N[k].y * w * 0.18 * sida, w * 0.22).fill({ color: shade(farg, 0.25), alpha: 0.5 })
  }
  const t = S[m - 1]
  g.circle(t.x, t.y, 10.5 - tryck * 2.5).fill(ljus)
  g.circle(t.x, t.y, 10.5 - tryck * 2.5).stroke({ width: 2.2, color: shade(farg, 0.3), alpha: 0.65 })
  g.circle(t.x, t.y, 4.5).fill({ color: shade(farg, 0.3), alpha: 0.55 })
}

// ───────────────────────── HAVSBOTTEN ─────────────────────────
export function ritaSand(g, golvY, breddL, breddR) {
  const pts = [breddL, 760]
  for (let x = breddL; x <= breddR; x += 40) pts.push(x, golvY + 6 + Math.sin(x * 0.011) * 5 + Math.sin(x * 0.037) * 3)
  pts.push(breddR, 760)
  g.poly(pts).fill(groundFill(0xe9cf92, { light: 0.1, dark: 0.22 }))
  g.poly(pts).stroke({ width: 3, color: 0xf6e3b0, alpha: 0.6, join: 'round' })
  for (let i = 0; i < 46; i++) {
    const x = breddL + ((i * 97.3) % (breddR - breddL))
    const y = golvY + 20 + ((i * 53.7) % 60)
    g.ellipse(x, y, 3 + (i % 3), 2 + (i % 2)).fill({ color: i % 2 ? 0xc8a868 : 0xfbeec2, alpha: 0.7 })
  }
}

export function ritaLjusstrak(g) {
  for (const [x, b, a] of [[180, 120, 0.07], [470, 90, 0.05], [780, 140, 0.065], [1080, 100, 0.05]]) {
    g.poly([x, -20, x + b, -20, x + b + 220, 700, x + 160, 700]).fill({ color: 0xffffff, alpha: a })
  }
}

// Tångruska: en container med fot i (0,0) som vaggar i vattnet.
export function skapaTang(x, golvY, antal, hojd, farg) {
  const c = nolla(new Container())
  c.position.set(x, golvY + 6)
  const g = nolla(new Graphics())
  for (let k = 0; k < antal; k++) {
    const bx = (k - (antal - 1) / 2) * 17
    const h = hojd * (0.65 + 0.35 * (((k * 7) % 5) / 4))
    const sv = (k % 2 ? 1 : -1) * (14 + k * 3)
    const fk = k % 2 ? farg : shade(farg, 0.14)
    g.moveTo(bx, 0).quadraticCurveTo(bx + sv, -h * 0.5, bx - sv * 0.4, -h * 0.78).quadraticCurveTo(bx - sv * 0.2, -h * 0.9, bx + sv * 0.3, -h)
    g.stroke({ width: 13, color: fk, cap: 'round', join: 'round' })
    g.moveTo(bx + 2, -4).quadraticCurveTo(bx + sv + 2, -h * 0.5, bx - sv * 0.4 + 2, -h * 0.78)
    g.stroke({ width: 3.2, color: tint(fk, 0.4), alpha: 0.5, cap: 'round' })
  }
  c.addChild(g)
  return c
}

export function skapaSten(x, golvY, r) {
  const g = nolla(new Graphics())
  g.position.set(x, golvY + 10 - r * 0.2)
  g.ellipse(0, 0, r, r * 0.7).fill(topLightFill(0x8c93a3, { highlight: 0.35 }))
  g.ellipse(0, 0, r, r * 0.7).stroke({ width: 3, color: 0x5e6575, alpha: 0.5 })
  g.ellipse(-r * 0.3, -r * 0.3, r * 0.3, r * 0.14).fill({ color: 0xffffff, alpha: 0.3 })
  g.circle(r * 0.4, r * 0.1, r * 0.12).fill({ color: 0x6aa56a, alpha: 0.55 })
  return g
}

// Det sjunkna skeppet. Origo = skrovets mitt vid botten; däcket ligger DACK_Y ovanför origo.
export const SKEPP = { bredd: 250, dackY: -160 }
export function skapaSkepp(x, golvY) {
  const c = nolla(new Container())
  c.position.set(x, golvY + 8)
  const g = nolla(new Graphics())
  // mast + trasigt segel bakom skrovet
  g.roundRect(-7, -318, 14, 170, 4).fill(topLightFill(0x6d4a38))
  g.poly([7, -306, 86, -284, 74, -250, 84, -214, 7, -198]).fill({ color: 0xe8e0c8, alpha: 0.85 })
  g.poly([7, -306, 86, -284, 74, -250, 84, -214, 7, -198]).stroke({ width: 2.5, color: 0xb8ae92, alpha: 0.8, join: 'round' })
  // skrov
  const hull = [-128, -150, 128, -150, 108, -22, 72, 10, -82, 10, -120, -34]
  g.poly(hull).fill(topLightFill(0x73503f, { highlight: 0.22 }))
  g.poly(hull).stroke({ width: 4, color: 0x45291d, alpha: 0.85, join: 'round' })
  for (const y of [-122, -92, -62, -32]) g.moveTo(-118 + (y + 150) * -0.04, y).lineTo(118 - (y + 150) * 0.1, y).stroke({ width: 2.2, color: 0x45291d, alpha: 0.45 })
  for (const x of [-62, 0, 62]) {
    g.circle(x, -96, 14).fill(0x9fd8e8)
    g.circle(x, -96, 14).stroke({ width: 4, color: 0xc89a3c })
  }
  // däck + räcke
  g.roundRect(-136, -160, 272, 14, 5).fill(topLightFill(0x8a6048))
  g.roundRect(-136, -160, 272, 14, 5).stroke({ width: 2.5, color: 0x45291d, alpha: 0.7 })
  for (let k = -3; k <= 3; k++) g.roundRect(k * 40 - 3, -186, 6, 28, 2).fill(0x6d4a38)
  g.circle(-90, 4, 7).fill({ color: 0x7ec98a, alpha: 0.8 })
  g.circle(96, -10, 6).fill({ color: 0x7ec98a, alpha: 0.8 })
  c.addChild(g)
  return c
}

export function skapaDack(x, golvY) {
  const c = nolla(new Container())
  c.position.set(x, golvY + 8)
  const g = nolla(new Graphics())
  for (const [dx, dy] of [[-44, -34], [44, -34], [0, -92]]) {
    g.circle(dx, dy, 33).stroke({ width: 25, color: 0x2f2f36 })
    g.circle(dx, dy, 33).stroke({ width: 6, color: 0x555563, alpha: 0.7 })
  }
  g.moveTo(-60, -66).quadraticCurveTo(-76, -100, -56, -130).stroke({ width: 9, color: 0x5fbf74, cap: 'round' })
  g.moveTo(66, -68).quadraticCurveTo(84, -96, 70, -124).stroke({ width: 9, color: 0x4fae64, cap: 'round' })
  c.addChild(g)
  return c
}

// Små saker man bygger av ritfunktionerna ovan. Returnerar { view, kropp } — guppa `kropp`, flytta `view`.
export function skapaSak(id) {
  const def = SAKER[id]
  const view = nolla(new Container())
  const kropp = nolla(new Container())
  const g = nolla(new Graphics())
  kropp.addChild(g)
  def.rita(g, kropp)
  if (id === 'flaska') kropp.rotation = 0
  view.addChild(kropp)
  return { view, kropp, g }
}

export function skapaVan(typ) {
  const c = nolla(new Container())
  const flip = nolla(new Container())
  const vard = nolla(new Container())
  const kropp = nolla(new Container())
  const g = nolla(new Graphics())
  ritaVan(g, typ, false)
  kropp.addChild(g)
  vard.addChild(kropp)
  flip.addChild(vard)
  c.addChild(flip)
  return { c, flip, vard, kropp, g }
}
