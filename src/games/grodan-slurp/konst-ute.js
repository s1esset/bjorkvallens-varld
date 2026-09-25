// KONST UTE — grodan-slurps L6-världar: TRÄSKET, ÖKNEN och STRANDEN (docs/games/grodan-slurp.md §4i).
//
// Bara ritfunktioner. Ramverket (dammen.js) bygger kropparna och anropar funktionerna här med
// geometrin; varje funktion ritar i en given Container i VÄRLDENS koordinater (om inget annat
// sägs) och returnerar `{ svaj: [{ nod, bas, amp, w, fas }], uppdatera?: (T, dt) => void }`.
//
// `svaj`-noderna vrids av ramverket varje bildruta (rotation = amp·sin(T·w + fas) + …), så varje
// sådan nod står med vridpunkten där rörelsen ska utgå ifrån (ett strås fot, ett palmblads fäste,
// en lavslinga i grenen) och har vilovinkeln 0 — ramverket SKRIVER rotationen, den läggs aldrig
// till. `uppdatera` rör bara transform på filens EGNA noder och tål att de är förstörda.
//
// Regler (CLAUDE.md "Tysta fällor"): gradienterna ur lib/form.js får bara FASTA palettfärger
// (cachen växer per färg — slumpa VILKEN palettfärg, aldrig en blandad), inga arc() (bågar ritas
// som polylinjer, ellipser och kurvor), ingen generateTexture/new FillGradient, inga tweens eller
// timers, alla containrar eventMode 'none', och inga egna fält på Pixi-objekt.
import { Container, Graphics } from 'pixi.js'
import { sphereFill, cylinderFill, topLightFill, verticalFill } from '../../lib/form.js'
import { shade, tint } from '../../lib/theme.js'

const TAU = Math.PI * 2
const YT_Y = 560
const MARK_Y = 528

// ---- paletter: FASTA färger (allt som blir en gradient kommer härifrån) ----------------------

// Träsket
const DODVED = 0x8e8070 // dött trä, grå-brunt
const DODVED_ROT = 0x7d6f60
const BARVED = 0xd3c7ae // ljus ved där barken fallit av
const LAV = [0xa9bf9e, 0xc2d0b4, 0x93ad8f]
const TICKA = [0xdcb57a, 0xc4935a]
const TORV = 0x4d3b2b
const TUVGRAS = [0x9aa846, 0x86983c, 0xb3b65a, 0x76893a]
const TUVULL = 0xfbfaf2
// Öknen
const KAKTUS = 0x5f9c4e
const TAGG = 0xf6efd6
const KAKTUSBLOMMA = [0xfff6f0, 0xffb3cf, 0xffe07a]
const OKEN_TOPP = 0xf3c982
const OKEN_BOTTEN = 0xc98c4c
const OKENSAND = 0xeebd72
const SANDSTEN = [0xdf8f55, 0xcb7442, 0xe8a86c, 0xbd6038]
const DYN_TOPP = 0xf6d08e
const DYN_BOTTEN = 0xd49a55
const PALMSTAM = [0xa07c55, 0x8c6b48]
const PALMBLAD = [0x4f9a3c, 0x5eaa46, 0x46903a]
const PALMBLAD_BAK = 0x3a7a33
const KOKOS = 0x7a5232
const STEN = [0xa8a094, 0x9a948a, 0xb8a98e]
// Stranden
const STRAND_TOPP = 0xf6e7c1
const STRAND_BOTTEN = 0xcfb382
const STRANDSAND = 0xf1dfb3
const VATSAND = 0xb89a68
const SLOTT = 0xe3c58d
const TRA_VIT = 0xf5f0e6
const TRA_ROD = 0xe0493f
const TRA_LJUS = 0xd8b27c
const TRA = 0xae7f50
const PALE = 0x7f5a3a
const STRANDSTEN = [0x8d959d, 0x7f8891, 0x9a948b]
const TANG = [0x6b7a2e, 0x57692a, 0x7f7c36]
const HOPP_BLA = 0x2f86d6
const BRADA = 0xf4f7fa
const SJOSTJARNA = [0xf07a4a, 0xf2a03d, 0xe8607a]
const SNACKOR = [0xfff1e6, 0xffd2c2, 0xf4e0c0, 0xffc4d6]
const RINGAR = [
  [0xe94a3f, 0xfbf7f0],
  [0x2f86d6, 0xfbf7f0],
]
const PARASOLL = [
  [0xe8453c, 0xfdf6ec],
  [0x3b7fd9, 0xf6c945],
  [0x2fb3a0, 0xfdf6ec],
]
const HINKAR = [0xe8453c, 0x3b7fd9, 0xf6c945, 0x5cc26a]
const HANDDUK = [
  [0xf06b8f, 0xfdf6ec],
  [0x46a6e0, 0xfdf6ec],
  [0xf6c945, 0x2fb3a0],
]

// ---- småverktyg -------------------------------------------------------------------------------

const rnd = (a, b) => a + Math.random() * (b - a)
const rint = (a, b) => Math.floor(rnd(a, b + 1))
const valj = (arr) => arr[(Math.random() * arr.length) | 0]
const chans = (p) => Math.random() < p

// Dekor-container: aldrig ett träffmål (spelet äger all input).
function dekor(parent, x = 0, y = 0) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  c.position.set(x, y)
  parent.addChild(c)
  return c
}

function ritning(parent) {
  const g = new Graphics()
  g.eventMode = 'none'
  parent.addChild(g)
  return g
}

const svajar = (nod, amp, w, fas = rnd(0, TAU)) => ({ nod, bas: 0, amp, w, fas })

// Spetsigt blad från basen (x, y) i riktning `ang` (0 = rakt upp).
function spetsblad(g, x, y, ang, len, bred) {
  const dx = Math.sin(ang)
  const dy = -Math.cos(ang)
  const px = Math.cos(ang)
  const py = Math.sin(ang)
  const mx = x + dx * len * 0.5
  const my = y + dy * len * 0.5
  return g
    .moveTo(x, y)
    .quadraticCurveTo(mx + px * bred, my + py * bred, x + dx * len, y + dy * len)
    .quadraticCurveTo(mx - px * bred, my - py * bred, x, y)
    .closePath()
}

// Punkter längs en ellipsbåge — bågar är polylinjer, aldrig arc() (arc-fällan).
function ellipsBage(cx, cy, rx, ry, a0, a1, n) {
  const p = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)
  }
  return p
}

function polylinje(g, pts) {
  g.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
  return g
}

// Punkter längs en kvadratisk kurva.
function kurva(x0, y0, cx, cy, x1, y1, n = 10) {
  const p = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    p.push(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1)
  }
  return p
}

// Ett avsmalnande band längs en polylinje (bredd w0 → w1). `ljus` = en linje på den sida som
// vetter mot ljuset (uppe till vänster) — en glanslinje som ger en kvist volym utan gradient.
function band(pts, w0, w1) {
  const n = pts.length / 2
  const v = []
  const h = []
  const ljus = []
  const dxa = pts[pts.length - 2] - pts[0]
  const dya = pts[pts.length - 1] - pts[1]
  const da = Math.hypot(dxa, dya) || 1
  const sL = (-dya / da) * -0.6 + (dxa / da) * -0.8 >= 0 ? 1 : -1
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1)
    const i1 = Math.min(n - 1, i + 1)
    const dx = pts[i1 * 2] - pts[i0 * 2]
    const dy = pts[i1 * 2 + 1] - pts[i0 * 2 + 1]
    const d = Math.hypot(dx, dy) || 1
    const nx = -dy / d
    const ny = dx / d
    const w = (w0 + ((w1 - w0) * i) / Math.max(1, n - 1)) / 2
    const x = pts[i * 2]
    const y = pts[i * 2 + 1]
    v.push(x + nx * w, y + ny * w)
    h.push(x - nx * w, y - ny * w)
    ljus.push(x + sL * nx * w * 0.45, y + sL * ny * w * 0.45)
  }
  const poly = v.slice()
  for (let i = n - 1; i >= 0; i--) poly.push(h[i * 2], h[i * 2 + 1])
  return { poly, ljus }
}

// Ett böjt strå/blad från basen (x0, y0) via (cx, cy) till spetsen (x1, y1), `b` brett vid basen.
function stra(g, x0, y0, cx, cy, x1, y1, b) {
  const dx = cx - x0
  const dy = cy - y0
  const d = Math.hypot(dx, dy) || 1
  const nx = (-dy / d) * (b / 2)
  const ny = (dx / d) * (b / 2)
  return g
    .moveTo(x0 + nx, y0 + ny)
    .quadraticCurveTo(cx + nx * 0.7, cy + ny * 0.7, x1, y1)
    .quadraticCurveTo(cx - nx * 0.7, cy - ny * 0.7, x0 - nx, y0 - ny)
    .closePath()
}

// y på en kontur [x0, y0, x1, y1, …] vid x (konturen får gå åt vilket håll som helst i x).
function yVid(pts, x) {
  for (let i = 0; i < pts.length - 2; i += 2) {
    const xa = pts[i]
    const xb = pts[i + 2]
    if ((x >= xa && x <= xb) || (x <= xa && x >= xb)) {
      const t = xb === xa ? 0 : (x - xa) / (xb - xa)
      return pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t
    }
  }
  return Math.abs(x - pts[0]) < Math.abs(x - pts[pts.length - 2]) ? pts[1] : pts[pts.length - 1]
}

// Kala kvistar som delar sig: `ut` får { pts, w0, w1, djup } — tjockast först.
function kvistar(x, y, ang, len, w, djup, ut) {
  const bojd = rnd(-0.35, 0.35)
  const ex = x + Math.sin(ang) * len
  const ey = y - Math.cos(ang) * len
  const cx = x + Math.sin(ang + bojd) * len * 0.55
  const cy = y - Math.cos(ang + bojd) * len * 0.55
  ut.push({ pts: kurva(x, y, cx, cy, ex, ey, 8), w0: w, w1: Math.max(1.6, w * 0.62), djup })
  if (djup <= 0) return
  const n = djup >= 2 ? 2 : rint(2, 3)
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * rnd(0.55, 0.85) + rnd(-0.12, 0.12)
    kvistar(ex, ey, a, len * rnd(0.5, 0.7), w * 0.62, djup - 1, ut)
  }
}

function ritaKvistar(g, limbs, farg) {
  const kontur = shade(farg, 0.4)
  for (const l of limbs) g.poly(band(l.pts, l.w0, l.w1).poly).fill(farg).stroke({ width: 1.2, color: kontur, alpha: 0.45, join: 'round' })
  for (const l of limbs) if (l.w0 > 5) polylinje(g, band(l.pts, l.w0, l.w1).ljus)
  g.stroke({ width: 1.8, color: tint(farg, 0.4), alpha: 0.5, cap: 'round' })
}

// En gren i världen: containern vid (bx, by), vriden `rot`, speglad med `sgn` — lokalt spänner
// plankan x −L/2 (vid stammen) … +L/2 (spetsen), y −13 (ovansidan) … +13.
function grenVy(R, gr, sgn) {
  const v = dekor(R, gr.bx, gr.by)
  v.rotation = gr.rot
  v.scale.x = sgn
  return v
}

// Grenens lokala punkt (lx, ly) i världen.
function grenPunkt(gr, sgn, lx, ly) {
  const c = Math.cos(gr.rot)
  const s = Math.sin(gr.rot)
  const x = sgn * lx
  return { x: gr.bx + c * x - s * ly, y: gr.by + s * x + c * ly }
}

// Ring i fält (livboj, badring): mellan ytterellipsen och hålets ellips, n fält i två färger.
function ringFalt(g, cx, cy, rx, ry, hcx, hcy, hrx, hry, n, fA, fB, off = 0) {
  for (let i = 0; i < n; i++) {
    const a0 = off + (i / n) * TAU
    const a1 = off + ((i + 1) / n) * TAU
    g.poly([...ellipsBage(cx, cy, rx, ry, a0, a1, 10), ...ellipsBage(hcx, hcy, hrx, hry, a1, a0, 8)]).fill(i % 2 ? fB : fA)
  }
}

// Livboj rakt framifrån: röda och vita fält, rep runt om, glans.
function livboj(g, x, y, r) {
  const ri = r * 0.55
  g.ellipse(x + 2, y + 3, r, r).fill({ color: 0x000000, alpha: 0.12 })
  ringFalt(g, x, y, r, r, x, y, ri, ri, 8, TRA_ROD, TRA_VIT, 0.39)
  // Skugga i nedre högra halvan, glans uppe till vänster.
  g.poly([...ellipsBage(x, y, r, r, -0.3, 2.4, 16), ...ellipsBage(x, y, ri, ri, 2.4, -0.3, 12)]).fill({ color: 0x000000, alpha: 0.13 })
  polylinje(g, ellipsBage(x, y, (r + ri) / 2, (r + ri) / 2, 3.5, 4.6, 8)).stroke({ width: r * 0.14, color: 0xffffff, alpha: 0.55, cap: 'round' })
  // Repet som löper runt ringen i fyra bågar.
  for (let k = 0; k < 4; k++) {
    const a0 = 0.39 + (k * TAU) / 4 + 0.25
    const a1 = a0 + TAU / 4 - 0.5
    polylinje(g, ellipsBage(x, y, r + 1.5, r + 1.5, a0, a1, 6))
  }
  g.stroke({ width: 1.6, color: 0xe8dcc0, alpha: 0.95, cap: 'round' })
  g.circle(x, y, r).stroke({ width: 1.2, color: shade(TRA_ROD, 0.4), alpha: 0.35 })
}

// Flagga/vimpel som vajar: en kedja av leder där varje led vrids lite mer — en våg som går utåt.
// Roten sitter i (x, y) = flaggans fäste (mitt på höjden). `uppdatera` (flaggUpp) vrider lederna.
function flagga(parent, x, y, { len = 56, h = 30, n = 4, farger, vimpel = false }) {
  const rot = dekor(parent, x, y)
  const leder = []
  const sl = len / n
  let p = rot
  for (let i = 0; i < n; i++) {
    const c = dekor(p, i === 0 ? 0 : sl, 0)
    const g = ritning(c)
    const h0 = vimpel ? h * (1 - i / n) : h * (1 - i * 0.03)
    const h1 = vimpel ? Math.max(1.5, h * (1 - (i + 1) / n)) : h * (1 - (i + 1) * 0.03)
    const x1 = sl + (i === n - 1 ? 0 : 1.5)
    const k = farger.length
    for (let s = 0; s < k; s++) {
      const ya0 = -h0 / 2 + (h0 * s) / k
      const ya1 = -h0 / 2 + (h0 * (s + 1)) / k
      const yb0 = -h1 / 2 + (h1 * s) / k
      const yb1 = -h1 / 2 + (h1 * (s + 1)) / k
      g.poly([-1.5, ya0, x1, yb0, x1, yb1, -1.5, ya1]).fill(farger[s])
    }
    // Lätt skugga på varannan led — tyget veckar sig.
    if (i % 2 === 1) g.poly([-1.5, -h0 / 2, x1, -h1 / 2, x1, h1 / 2, -1.5, h0 / 2]).fill({ color: 0x000000, alpha: 0.08 })
    leder.push(c)
    p = c
  }
  return { rot, leder, fas: rnd(0, TAU), w: rnd(3.2, 4.2) }
}

function flaggUpp(flaggor) {
  return (T) => {
    for (const f of flaggor) {
      for (let i = 0; i < f.leder.length; i++) {
        const c = f.leder[i]
        if (!c || c.destroyed) continue
        c.rotation = (i === 0 ? 0.08 : 0.03) + 0.13 * Math.sin(T * f.w - i * 0.95 + f.fas) + 0.04 * Math.sin(T * f.w * 2.1 - i * 1.3 + f.fas)
      }
    }
  }
}

// Snäcka (solfjäder) med ribbor, basen i (x, y).
function snacka(g, x, y, s, farg) {
  const p = [x, y]
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (Math.PI * i) / 10
    const r = (i % 2 ? 7.4 : 8) * s
    p.push(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85)
  }
  g.poly(p).fill(farg).stroke({ width: 1, color: shade(farg, 0.3), alpha: 0.6, join: 'round' })
  for (let i = 1; i < 5; i++) {
    const a = Math.PI + (Math.PI * i) / 5
    g.moveTo(x, y).lineTo(x + Math.cos(a) * 6.8 * s, y + Math.sin(a) * 5.8 * s)
  }
  g.stroke({ width: 0.9, color: shade(farg, 0.28), alpha: 0.6, cap: 'round' })
  g.ellipse(x, y + 0.5 * s, 2.4 * s, 1.4 * s).fill(shade(farg, 0.12))
}

// Snäckskal (spiral).
function spiralSnacka(g, x, y, s, farg) {
  g.moveTo(x - 7 * s, y).quadraticCurveTo(x - 6 * s, y - 7 * s, x + 1 * s, y - 6 * s).quadraticCurveTo(x + 8 * s, y - 4 * s, x + 7 * s, y).closePath().fill(farg)
  g.moveTo(x + 7 * s, y).lineTo(x + 10 * s, y + 0.5 * s).stroke({ width: 1.6 * s, color: farg, cap: 'round' })
  polylinje(g, ellipsBage(x, y - 3 * s, 3.4 * s, 2.6 * s, 0.2, 5.4, 12)).stroke({ width: 1, color: shade(farg, 0.32), alpha: 0.7 })
}

// Sjöstjärna med rundade armar och prickar.
function sjostjarna(g, x, y, r, ang, farg) {
  const pt = (i, rr) => {
    const a = ang - Math.PI / 2 + (i * Math.PI) / 5
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]
  }
  const [sx0, sy0] = pt(-1, r * 0.42)
  g.moveTo(sx0, sy0)
  for (let k = 0; k < 5; k++) {
    const [tx, ty] = pt(2 * k, r)
    const [ix, iy] = pt(2 * k + 1, r * 0.42)
    const [px, py] = pt(2 * k - 1, r * 0.42)
    const mx = (px + ix) / 2
    const my = (py + iy) / 2
    g.quadraticCurveTo(tx * 2 - mx, ty * 2 - my, ix, iy)
  }
  g.closePath().fill(sphereFill(farg, { lightX: 0.38, lightY: 0.32, dark: 0.3 }))
  g.circle(x, y, r * 0.2).fill(tint(farg, 0.3))
  for (let k = 0; k < 5; k++) {
    for (const f of [0.42, 0.66]) {
      const [dx, dy] = pt(2 * k, r * f)
      g.circle(dx, dy, r * 0.075).fill(tint(farg, 0.6))
    }
  }
}

// Havstulpan: en liten vit vulkan med en mörk springa.
function havstulpan(g, x, y, r) {
  g.moveTo(x - r, y + r * 0.45).lineTo(x - r * 0.5, y - r * 0.6).lineTo(x + r * 0.5, y - r * 0.6).lineTo(x + r, y + r * 0.45).closePath().fill(0xe4dfd2)
  g.moveTo(x - r * 0.72, y).lineTo(x - r * 0.42, y - r * 0.55).stroke({ width: 0.9, color: 0xa8a294, alpha: 0.8 })
  g.ellipse(x, y - r * 0.56, r * 0.46, r * 0.18).fill(0x555a58)
}

// Hink (i en fast palettfärg) med handtag och sand upptill.
function hink(g, x, y, s, farg) {
  const wb = 17 * s
  const wt = 23 * s
  const h = 22 * s
  g.moveTo(x - wt / 2 - 1, y - h - 2).quadraticCurveTo(x, y - h - 22 * s, x + wt / 2 + 1, y - h - 2).stroke({ width: 1.8 * s, color: shade(farg, 0.35), cap: 'round' })
  g.moveTo(x - wb / 2, y).lineTo(x - wt / 2, y - h).lineTo(x + wt / 2, y - h).lineTo(x + wb / 2, y).closePath().fill(cylinderFill(farg, { axis: 'y', dark: 0.3, highlight: 0.3 }))
  g.ellipse(x, y - h, wt / 2, 3.2 * s).fill(shade(farg, 0.3))
  g.ellipse(x, y - h + 0.5 * s, wt / 2 - 2 * s, 2.2 * s).fill(0xe6c98f)
  g.moveTo(x - wt / 2 + 3 * s, y - h * 0.62).lineTo(x + wt / 2 - 3 * s, y - h * 0.62).stroke({ width: 1.4 * s, color: tint(farg, 0.4), alpha: 0.7 })
  g.ellipse(x, y + 0.5, wb / 2 + 3, 2.5).fill({ color: 0x8a6a3a, alpha: 0.2 })
}

// Spade som står nedstucken i sanden, lutad `ang` (0 = rakt upp).
function spade(g, x, y, ang, farg) {
  const dx = Math.sin(ang)
  const dy = -Math.cos(ang)
  const px = Math.cos(ang)
  const py = Math.sin(ang)
  const P = (a, b) => [x + dx * a + px * b, y + dy * a + py * b]
  // Bladet (nedstucket till hälften), skaftet och handtaget.
  g.poly([...P(-6, -8), ...P(10, -9), ...P(14, 0), ...P(10, 9), ...P(-6, 8)]).fill(topLightFill(farg, { highlight: 0.3, dark: 0.25 }))
  g.poly([...P(12, -2.2), ...P(44, -2.2), ...P(44, 2.2), ...P(12, 2.2)]).fill(shade(farg, 0.1))
  g.poly([...P(42, -7), ...P(49, -7), ...P(49, 7), ...P(42, 7)]).fill(farg)
  g.ellipse(x, y + 1, 10, 3).fill(STRANDSAND)
}

// Torr grästuva (öken): tunna gula strån.
function torrTuva(g, x, y, s = 1) {
  for (let i = 0; i < 8; i++) {
    const h = rnd(10, 22) * s
    const lut = rnd(-10, 10) * s
    g.moveTo(x + rnd(-5, 5) * s, y).quadraticCurveTo(x + lut * 0.3, y - h * 0.6, x + lut, y - h)
  }
  g.stroke({ width: 1.6, color: 0xc9a55a, alpha: 0.95, cap: 'round' })
  for (let i = 0; i < 4; i++) {
    const h = rnd(8, 16) * s
    g.moveTo(x + rnd(-4, 4) * s, y).quadraticCurveTo(x, y - h * 0.5, x + rnd(-7, 7) * s, y - h)
  }
  g.stroke({ width: 1.3, color: 0xa8843e, alpha: 0.9, cap: 'round' })
}

// =================================================================================================
// TRÄD — geo = { sx, sgn, bas, topp, grenar: [{ bx, by, L, rot, topp }] }
// =================================================================================================

// ---- 1. Träsket: ett dött, knotigt träd med skägglav ------------------------------------------

export function ritaTradDod(R, geo) {
  const { sx, sgn, bas, topp, grenar } = geo
  const svaj = []
  const stam = dekor(R, sx, 0)
  stam.scale.x = sgn
  // Kala kvistar i toppen: tre huvudgrenar som delar sig (ritas FÖRE stammen, så stammen täcker
  // deras fötter). Lokalt +x = ut över vattnet.
  const limbs = []
  kvistar(-6, topp + 46, rnd(-0.85, -0.6), rnd(110, 140), 18, 3, limbs)
  kvistar(0, topp + 24, rnd(-0.12, 0.12), rnd(130, 165), 22, 3, limbs)
  kvistar(6, topp + 70, rnd(0.55, 0.85), rnd(150, 185), 18, 3, limbs)
  ritaKvistar(ritning(stam), limbs, DODVED)
  ritaDodStam(ritning(stam), bas, topp)

  const grenVyer = []
  for (const gr of grenar) {
    const v = grenVy(R, gr, sgn)
    ritaDodGren(v, gr.L)
    grenVyer.push(v)
  }
  // Skägglav: 2–3 slingor under varje gren och några i kronan — ritade i världens rum så att de
  // hänger rakt ned oavsett grenens lutning, med vridpunkten där de sitter fast.
  for (const gr of grenar) {
    const n = gr.L > 380 ? 3 : 2
    for (let i = 0; i < n; i++) {
      const lx = -gr.L / 2 + gr.L * (0.24 + (0.64 * (i + rnd(0.15, 0.85))) / n)
      const p = grenPunkt(gr, sgn, lx, 10)
      svaj.push(svajar(ritaLav(R, p.x, p.y, rnd(60, 120)), rnd(0.06, 0.1), rnd(1.1, 1.8)))
    }
  }
  const mellan = limbs.filter((l) => l.djup === 2 || l.djup === 1)
  for (let i = 0; i < 4 && mellan.length; i++) {
    const l = mellan.splice((Math.random() * mellan.length) | 0, 1)[0]
    const k = 8 // mitt på kvisten (punkt 4 av 8)
    svaj.push(svajar(ritaLav(R, sx + sgn * l.pts[k], l.pts[k + 1] + 2, rnd(55, 100)), rnd(0.07, 0.12), rnd(1.2, 1.9)))
  }
  return { svaj, vyer: { stam, grenar: grenVyer } }
}

function ritaDodStam(g, b, t) {
  const H = b - t
  // Rotutlöpare.
  g.moveTo(-24, b - 52).bezierCurveTo(-46, b - 26, -66, b - 4, -90, b + 8).lineTo(-14, b + 8).closePath()
  g.fill(topLightFill(DODVED_ROT, { highlight: 0.2, dark: 0.32 }))
  g.moveTo(22, b - 46).bezierCurveTo(46, b - 20, 70, b - 2, 94, b + 8).lineTo(12, b + 8).closePath()
  g.fill(topLightFill(DODVED_ROT, { highlight: 0.2, dark: 0.32 }))
  // Stammen: knotig och lite vriden, smalnar uppåt och slutar i en avbruten topp bland kvistarna.
  g.moveTo(-62, b + 8)
    .bezierCurveTo(-40, b - 4, -31, b - 36, -29, b - 110)
    .bezierCurveTo(-27, b - H * 0.34, -35, b - H * 0.48, -28, b - H * 0.6)
    .bezierCurveTo(-21, b - H * 0.74, -28, t + 120, -20, t + 60)
    .lineTo(-15, t + 30)
    .lineTo(-8, t + 42)
    .lineTo(-2, t + 18)
    .lineTo(5, t + 38)
    .lineTo(13, t + 30)
    .bezierCurveTo(24, t + 110, 21, b - H * 0.72, 27, b - H * 0.58)
    .bezierCurveTo(33, b - H * 0.45, 25, b - H * 0.3, 28, b - 110)
    .bezierCurveTo(30, b - 36, 40, b - 4, 64, b + 8)
    .closePath()
    .fill(cylinderFill(DODVED, { axis: 'y', dark: 0.42, highlight: 0.2 }))
  // Ljus ved där barken fallit av.
  for (let i = 0; i < 6; i++) {
    const y = rnd(t + 90, b - 70)
    const x = rnd(-16, 8)
    const h = rnd(26, 64)
    g.moveTo(x, y).bezierCurveTo(x + 9, y + h * 0.2, x + 9, y + h * 0.8, x + 2, y + h).bezierCurveTo(x - 5, y + h * 0.7, x - 5, y + h * 0.3, x, y).closePath()
    g.fill({ color: BARVED, alpha: 0.5 })
  }
  // Långa sprickor i barken och korta tvärsprickor.
  for (const k of [-19, -9, 2, 12, 20]) g.moveTo(k, b - 14).bezierCurveTo(k + 6, b - H * 0.3, k - 6, b - H * 0.65, k * 0.7, t + 50)
  g.stroke({ width: 2.4, color: shade(DODVED, 0.45), alpha: 0.5, cap: 'round' })
  for (let i = 0; i < 16; i++) {
    const y = rnd(t + 60, b - 30)
    const x = rnd(-20, 14)
    g.moveTo(x, y).lineTo(x + 4, y + 3).lineTo(x + 9, y + 1)
  }
  g.stroke({ width: 1.6, color: shade(DODVED, 0.5), alpha: 0.45, cap: 'round', join: 'round' })
  // Grå-gröna lavfläckar på barken.
  for (let i = 0; i < 12; i++) g.ellipse(rnd(-22, 20), rnd(t + 80, b - 20), rnd(3, 7), rnd(2, 4)).fill({ color: valj(LAV), alpha: 0.6 })
  // Håligheten: ljus kant, mörkt inre.
  const hy = b - 170
  g.ellipse(-3, hy, 16, 23).fill(tint(DODVED, 0.28))
  g.ellipse(-3, hy + 1, 11, 18).fill(0x2a1f16)
  g.ellipse(-1, hy + 6, 8, 11).fill(0x160f09)
  g.moveTo(-14, hy - 10).quadraticCurveTo(-3, hy - 22, 9, hy - 10).stroke({ width: 2, color: shade(DODVED, 0.5), alpha: 0.6, cap: 'round' })
  // Tickor (hyllsvampar) på sidorna.
  ticka(g, 26, b - 120, 1.1, 1, TICKA[0])
  ticka(g, 25, b - 96, 0.8, 1, TICKA[1])
  ticka(g, -25, b - H * 0.46, 1, -1, TICKA[0])
  ticka(g, -24, b - H * 0.46 + 20, 0.7, -1, TICKA[1])
  // Dy och mossa vid foten.
  for (let i = 0; i < 8; i++) g.ellipse(rnd(-34, 32), b - rnd(2, 26), rnd(6, 12), rnd(3, 5)).fill({ color: valj([0x5e7a3a, 0x6f8a44]), alpha: 0.8 })
}

// Hyllsvamp ut från stammen (dir = +1 åt höger).
function ticka(g, x, y, s, dir, farg) {
  g.moveTo(x, y - 5 * s)
    .quadraticCurveTo(x + dir * 36 * s, y - 11 * s, x + dir * 32 * s, y + 3 * s)
    .quadraticCurveTo(x + dir * 20 * s, y + 9 * s, x, y + 6 * s)
    .closePath()
    .fill(topLightFill(farg, { highlight: 0.3, dark: 0.3 }))
  g.moveTo(x + dir * 3 * s, y - 2.5 * s).quadraticCurveTo(x + dir * 27 * s, y - 7 * s, x + dir * 28 * s, y + 1 * s)
  g.stroke({ width: 1.4, color: tint(farg, 0.5), alpha: 0.8, cap: 'round' })
  g.moveTo(x, y + 5 * s).quadraticCurveTo(x + dir * 19 * s, y + 8 * s, x + dir * 31 * s, y + 3 * s)
  g.stroke({ width: 1.8, color: shade(farg, 0.4), alpha: 0.7, cap: 'round' })
}

function ritaDodGren(v, L) {
  const g = ritning(v)
  const a = -L / 2 - 16
  const b = L / 2
  // Kala kvistar bakom grenen: en eller två uppåt, en nedåt.
  const kv = []
  kvistar(rnd(-L * 0.05, L * 0.22), -8, rnd(0.3, 0.7), rnd(40, 60), 8, 1, kv)
  if (L > 300) kvistar(rnd(L * 0.28, L * 0.4), -8, rnd(-0.1, 0.3), rnd(28, 40), 6, 1, kv)
  kvistar(rnd(-L * 0.22, 0), 8, Math.PI - rnd(0.35, 0.7), rnd(28, 42), 7, 0, kv)
  ritaKvistar(g, kv, DODVED)
  // Grenen: ovansidan följer plankan (y −13), undersidan är knölig och spetsen avbruten.
  g.moveTo(a, -22)
    .bezierCurveTo(a + 30, -16, a + 60, -14, a + 100, -13.5)
    .lineTo(b - 30, -12.5)
    .lineTo(b - 14, -12)
    .lineTo(b - 6, -16)
    .lineTo(b - 1, -8)
    .lineTo(b + 8, -7)
    .lineTo(b + 1, -1)
    .lineTo(b + 6, 4)
    .lineTo(b - 6, 7)
    .bezierCurveTo(b - L * 0.3, 9, b - L * 0.48, 16, a + L * 0.45, 13)
    .bezierCurveTo(a + L * 0.3, 10, a + 80, 18, a + 50, 17)
    .bezierCurveTo(a + 30, 18, a + 14, 22, a, 26)
    .closePath()
    .fill(cylinderFill(DODVED, { axis: 'x', dark: 0.4, highlight: 0.2 }))
  // Knölar under grenen.
  const kx = rnd(-L * 0.15, L * 0.2)
  g.ellipse(kx, 13, 11, 7).fill(topLightFill(DODVED_ROT, { highlight: 0.2, dark: 0.32 }))
  g.ellipse(kx - 2, 12, 4, 2.5).fill({ color: shade(DODVED, 0.5), alpha: 0.6 })
  // Ved där barken fallit av, fibrer och tvärsprickor.
  for (let i = 0; i < 3; i++) {
    const x = rnd(a + 40, b - 50)
    g.ellipse(x, rnd(-3, 4), rnd(14, 30), rnd(3, 5)).fill({ color: BARVED, alpha: 0.45 })
  }
  for (const k of [-6, 0.5, 6]) g.moveTo(a + 24, k * 1.4).bezierCurveTo(a + L * 0.35, k + 2, b - L * 0.35, k * 0.8 - 2, b - 16, k * 0.7)
  g.stroke({ width: 1.8, color: shade(DODVED, 0.45), alpha: 0.45, cap: 'round' })
  for (let i = 0; i < 5; i++) {
    const x = rnd(a + 30, b - 20)
    g.moveTo(x, rnd(-8, 0)).lineTo(x + 2, rnd(2, 8))
  }
  g.stroke({ width: 1.4, color: shade(DODVED, 0.5), alpha: 0.45, cap: 'round' })
  // Ljus kant längs ovansidan och lavfläckar.
  g.moveTo(a + 40, -11).lineTo(b - 16, -10.5).stroke({ width: 1.6, color: tint(DODVED, 0.45), alpha: 0.5, cap: 'round' })
  for (let i = 0; i < 4; i++) g.ellipse(rnd(a + 30, b - 30), rnd(-10, 8), rnd(4, 8), rnd(2, 3.5)).fill({ color: valj(LAV), alpha: 0.65 })
}

// Skägglav: en slinga grå-gröna trådar, vridpunkten överst (där den sitter fast).
function ritaLav(parent, x, y, len) {
  const c = dekor(parent, x, y)
  const g = ritning(c)
  const f = valj(LAV)
  const w = rnd(9, 14)
  // Mjuk silhuett bakom trådarna.
  g.moveTo(-w, 0).bezierCurveTo(-w * 1.15, len * 0.38, -w * 0.45, len * 0.72, rnd(-2, 2), len).bezierCurveTo(w * 0.5, len * 0.7, w * 1.1, len * 0.4, w, 0).closePath()
  g.fill({ color: f, alpha: 0.5 })
  // Trådarna i tre toner.
  const toner = [shade(f, 0.18), f, tint(f, 0.35)]
  for (let ti = 0; ti < 3; ti++) {
    for (let i = 0; i < 4; i++) {
      let px = rnd(-w * 0.8, w * 0.8)
      let py = rnd(0, 3)
      const slut = len * rnd(0.5, 1)
      const drift = rnd(-0.12, 0.12)
      g.moveTo(px, py)
      let sida = 1
      while (py < slut) {
        py += rnd(6, 10)
        px += sida * rnd(1.2, 2.4) + drift * 8
        sida = -sida
        g.lineTo(px, py)
      }
      // Små sidohår.
      g.moveTo(px, py).lineTo(px + rnd(-4, 4), py + rnd(3, 6))
    }
    g.stroke({ width: ti === 1 ? 2.2 : 1.6, color: toner[ti], alpha: 0.95, cap: 'round', join: 'round' })
  }
  g.ellipse(0, 1, 7, 4).fill(f)
  return c
}

// ---- 2. Öknen: en jättelik saguarokaktus --------------------------------------------------------

export function ritaTradKaktus(R, geo) {
  const { sx, sgn, bas, topp, grenar } = geo
  // Armarna först: pelaren täcker deras rötter (armen växer ut ur pelarens sida).
  const grenVyer = []
  for (const gr of grenar) {
    const v = grenVy(R, gr, sgn)
    ritaKaktusArm(v, gr.L)
    grenVyer.push(v)
  }
  const stam = dekor(R, sx, 0)
  stam.scale.x = sgn
  ritaKaktusPelare(ritning(stam), bas, topp)
  return { svaj: [], vyer: { stam, grenar: grenVyer } }
}

// Saguarons veck: mörka fåror och ljusa åsar emellan, taggknippen (areoler) glest längs åsarna.
// Lodrätt: `faror`/`asar` = x, från y0 (överst) till y1.
function kaktusAsar(g, faror, asar, y0, y1) {
  for (const x of faror) g.moveTo(x, y1).lineTo(x, y0)
  g.stroke({ width: 3, color: shade(KAKTUS, 0.45), alpha: 0.5, cap: 'round' })
  for (const x of asar) g.moveTo(x, y1).lineTo(x, y0)
  g.stroke({ width: 3, color: tint(KAKTUS, 0.4), alpha: 0.28, cap: 'round' })
  for (const x of asar) {
    for (let y = y1 - rnd(10, 22); y > y0 + 8; y -= rnd(24, 32)) {
      g.moveTo(x, y).lineTo(x - 3, y - 3).moveTo(x, y).lineTo(x + 3, y - 3).moveTo(x, y).lineTo(x, y - 4)
    }
  }
  g.stroke({ width: 1, color: TAGG, alpha: 0.75, cap: 'round' })
}

// Vågrätt (armens liggande del): `faror`/`asar` = y, från x0 till x1.
function kaktusAsarX(g, faror, asar, x0, x1) {
  for (const y of faror) g.moveTo(x0, y).lineTo(x1, y)
  g.stroke({ width: 3, color: shade(KAKTUS, 0.45), alpha: 0.5, cap: 'round' })
  for (const y of asar) g.moveTo(x0, y).lineTo(x1, y)
  g.stroke({ width: 3, color: tint(KAKTUS, 0.4), alpha: 0.28, cap: 'round' })
  for (const y of asar) {
    for (let x = x0 + rnd(8, 20); x < x1 - 8; x += rnd(24, 32)) {
      g.moveTo(x, y).lineTo(x - 3, y - 3).moveTo(x, y).lineTo(x + 3, y - 3).moveTo(x, y).lineTo(x + 4, y)
    }
  }
  g.stroke({ width: 1, color: TAGG, alpha: 0.75, cap: 'round' })
}

function kaktusBlomma(g, x, y, s, farg) {
  const kontur = { width: 1, color: shade(farg, 0.3), alpha: 0.45 }
  g.ellipse(x, y + 3 * s, 6 * s, 4 * s).fill(0x6fa84e)
  for (const a of [-1.35, 1.35, -0.9, 0.9]) spetsblad(g, x, y, a, 13 * s, 5 * s).fill(tint(farg, 0.2)).stroke(kontur)
  for (const a of [-0.45, 0, 0.45]) spetsblad(g, x, y - s, a, 15 * s, 5.5 * s).fill(farg).stroke(kontur)
  g.circle(x, y - 3 * s, 3.4 * s).fill(0xffd35c)
  for (let k = 0; k < 5; k++) g.circle(x + Math.cos((k * TAU) / 5) * 2 * s, y - 3 * s + Math.sin((k * TAU) / 5) * 2 * s, 0.9 * s).fill(0xe8912c)
}

function ritaKaktusPelare(g, b, t) {
  const r = 31
  g.moveTo(-r, b + 6)
    .lineTo(-r + 1, t + r)
    .bezierCurveTo(-r + 1, t - r * 0.33, r - 1, t - r * 0.33, r - 1, t + r)
    .lineTo(r, b + 6)
    .closePath()
    .fill(cylinderFill(KAKTUS, { axis: 'y', dark: 0.44, highlight: 0.34 }))
  // Fårorna möts i toppen.
  for (const x of [-20, -10, 0, 10, 20]) g.moveTo(x, t + r + 4).quadraticCurveTo(x, t + 6, x * 0.25, t + 1)
  g.stroke({ width: 3, color: shade(KAKTUS, 0.45), alpha: 0.45, cap: 'round' })
  kaktusAsar(g, [-20, -10, 0, 10, 20], [-25, -15, -5, 5, 15, 25], t + r + 4, b)
  // Hackspettshål.
  const hy = b - 190
  g.ellipse(-6, hy, 10, 12).fill(0x7a5a36)
  g.ellipse(-6, hy + 1, 6.5, 8.5).fill(0x1d140c)
  // Blommor i toppen.
  kaktusBlomma(g, -15, t + 10, 1.35, KAKTUSBLOMMA[0])
  kaktusBlomma(g, 17, t + 12, 1.1, KAKTUSBLOMMA[1])
  kaktusBlomma(g, 2, t - 1, 1.5, valj(KAKTUSBLOMMA))
  g.ellipse(-25, t + 30, 4.5, 6).fill(0x86b85a)
  g.ellipse(26, t + 34, 4, 5).fill(0x86b85a)
  // Sanden som blåst upp mot foten.
  g.moveTo(-92, b + 12).bezierCurveTo(-62, b - 4, -40, b - 16, 0, b - 16).bezierCurveTo(40, b - 16, 64, b - 4, 94, b + 12).closePath()
  g.fill(topLightFill(OKENSAND, { highlight: 0.22, dark: 0.12 }))
  g.moveTo(-60, b - 2).quadraticCurveTo(-30, b - 12, 0, b - 13).stroke({ width: 1.6, color: tint(OKENSAND, 0.5), alpha: 0.7, cap: 'round' })
  for (let i = 0; i < 5; i++) g.ellipse(rnd(-80, 80), b + rnd(-4, 6), rnd(3, 6), rnd(2, 3.5)).fill({ color: valj([0xb89868, 0xa07a50, 0xd4b27a]), alpha: 0.9 })
  torrTuva(g, -70, b + 2, 0.8)
}

function ritaKaktusArm(v, L) {
  const g = ritning(v)
  const hr = 22
  const ux = L / 2 - 8
  const H = rnd(64, 110)
  const topY = -13 - H
  // Den vågräta delen: ut från pelaren till armbågen. Ovansidan = plankan (y −13).
  g.moveTo(-L / 2, -13).lineTo(ux, -13).lineTo(ux, 24).lineTo(-L / 2 + 50, 22).quadraticCurveTo(-L / 2 + 24, 20, -L / 2, 15).closePath()
  g.fill(cylinderFill(KAKTUS, { axis: 'x', dark: 0.44, highlight: 0.34 }))
  kaktusAsarX(g, [-4, 5, 14], [-8.5, 0.5, 9.5, 18.5], -L / 2 + 30, ux - hr + 2)
  // Den uppåtböjda spetsen (bara bild).
  g.moveTo(ux - hr, 22)
    .lineTo(ux - hr, topY + hr)
    .bezierCurveTo(ux - hr, topY - hr * 0.33, ux + hr, topY - hr * 0.33, ux + hr, topY + hr)
    .lineTo(ux + hr, 4)
    .quadraticCurveTo(ux + hr, 24, ux + 2, 24)
    .lineTo(ux - hr, 24)
    .closePath()
    .fill(cylinderFill(KAKTUS, { axis: 'y', dark: 0.44, highlight: 0.34 }))
  // Mjuk hålkäl i armbågens innerhörn + ett veck.
  g.moveTo(ux - hr - 13, -13).quadraticCurveTo(ux - hr + 1, -13, ux - hr + 1, -27).lineTo(ux - hr + 1, -13).closePath().fill(shade(KAKTUS, 0.08))
  g.moveTo(ux - hr + 1, -10).quadraticCurveTo(ux - hr + 6, 6, ux - hr + 2, 21).stroke({ width: 2, color: shade(KAKTUS, 0.35), alpha: 0.45, cap: 'round' })
  for (const x of [ux - 11, ux, ux + 11]) g.moveTo(x, topY + hr).quadraticCurveTo(x, topY + 4, ux + (x - ux) * 0.25, topY + 1)
  g.stroke({ width: 3, color: shade(KAKTUS, 0.45), alpha: 0.45, cap: 'round' })
  kaktusAsar(g, [ux - 11, ux, ux + 11], [ux - 16, ux - 5.5, ux + 5.5, ux + 16], topY + hr, 18)
  if (chans(0.5)) kaktusBlomma(g, ux + rnd(-6, 6), topY + 3, 1.1, valj(KAKTUSBLOMMA))
}

// ---- 3. Stranden (land): ett livräddartorn i rött och vitt trä ------------------------------------

export function ritaTradLivrad(R, geo) {
  const { sx, sgn, bas, topp, grenar } = geo
  const stam = dekor(R, sx, 0)
  stam.scale.x = sgn
  const g = ritning(stam)
  const b = bas
  const ut = topp + 34 // utkikens golv
  // Snedsträvor (kryss) bakom stegen.
  for (let y = b - 16; y - 150 > ut; y -= 160) g.moveTo(-17, y).lineTo(17, y - 150).moveTo(17, y).lineTo(-17, y - 150)
  g.stroke({ width: 6, color: shade(TRA_VIT, 0.3), cap: 'round' })
  // Stegpinnar.
  for (let y = b - 24; y > ut + 14; y -= 32) g.roundRect(-17, y - 3, 34, 6, 3).fill(topLightFill(TRA_LJUS, { highlight: 0.3, dark: 0.3 }))
  // Stolparna: vita med röda band, ned i sanden.
  for (const px of [-22, 22]) {
    g.roundRect(px - 7, ut - 4, 14, b + 10 - ut, 5).fill(cylinderFill(TRA_VIT, { axis: 'y', dark: 0.24, highlight: 0.1 }))
    for (let y = b - 60; y - 26 > ut + 30; y -= 130) g.rect(px - 7, y - 26, 14, 26).fill(cylinderFill(TRA_ROD, { axis: 'y', dark: 0.28, highlight: 0.2 }))
  }
  for (const px of [-22, 22]) {
    g.moveTo(px - 22, b + 10).quadraticCurveTo(px, b - 8, px + 22, b + 10).closePath().fill(topLightFill(STRANDSAND, { highlight: 0.2, dark: 0.1 }))
  }
  livboj(g, 36, b - 180, 19)
  g.moveTo(29, b - 199).lineTo(33, b - 206).stroke({ width: 2.5, color: 0x6a6a6a, cap: 'round' })

  // Utkiken högst upp: golv, räcke, två stolpar och ett randigt tygtak.
  const tak = topp - 44
  const spets = topp - 106
  for (const px of [-60, 60]) g.roundRect(px - 3.5, tak, 7, ut - tak, 3).fill(cylinderFill(TRA_VIT, { axis: 'y', dark: 0.24, highlight: 0.1 }))
  for (let x = -62; x <= 62; x += 17.7) g.roundRect(x - 2.5, ut - 38, 5, 36, 2).fill(TRA_VIT)
  g.roundRect(-70, ut - 42, 140, 7, 3.5).fill(topLightFill(TRA_ROD, { highlight: 0.3, dark: 0.25 }))
  g.roundRect(-76, ut - 6, 152, 11, 4).fill(topLightFill(TRA_LJUS, { highlight: 0.3, dark: 0.3 }))
  g.roundRect(-76, ut + 4, 152, 9, 3).fill(topLightFill(TRA_ROD, { highlight: 0.3, dark: 0.25 }))
  // Tygtaket: randiga kilar från spetsen och en bågad kappa.
  const n = 6
  for (let i = 0; i < n; i++) {
    const x0 = -98 + (196 * i) / n
    const x1 = -98 + (196 * (i + 1)) / n
    g.poly([0, spets, x0, tak, x1, tak]).fill(topLightFill(i % 2 ? TRA_VIT : TRA_ROD, { highlight: 0.3, dark: 0.2 }))
  }
  g.poly([0, spets, 0, tak, 98, tak]).fill({ color: 0x000000, alpha: 0.1 })
  for (let i = 0; i < n; i++) {
    const x0 = -98 + (196 * i) / n
    const x1 = -98 + (196 * (i + 1)) / n
    g.moveTo(x0, tak - 1).lineTo(x1, tak - 1).lineTo(x1, tak + 8).quadraticCurveTo((x0 + x1) / 2, tak + 22, x0, tak + 8).closePath()
    g.fill(i % 2 ? TRA_ROD : TRA_VIT)
  }
  g.moveTo(-98, tak).lineTo(98, tak).stroke({ width: 1.5, color: shade(TRA_ROD, 0.3), alpha: 0.4 })
  g.roundRect(-2.5, spets - 66, 5, 70, 2.5).fill(cylinderFill(0xd8dde2, { axis: 'y', dark: 0.3, highlight: 0.2 }))
  g.circle(0, spets - 68, 4.5).fill(sphereFill(0xf6c945))

  // Plattformarna (grenarna).
  const grenVyer = []
  for (const gr of grenar) {
    const v = grenVy(R, gr, sgn)
    ritaLivPlattform(v, gr.L)
    grenVyer.push(v)
  }
  const fl = flagga(stam, 2.5, spets - 48, { len: 58, h: 30, n: 4, farger: [TRA_ROD, TRA_VIT, TRA_ROD] })
  return { svaj: [], uppdatera: flaggUpp([fl]), vyer: { stam, grenar: grenVyer } }
}

function ritaLivPlattform(v, L) {
  const g = ritning(v)
  const a = -L / 2
  const b = L / 2
  // Knästöd från stolpen snett upp till undersidan.
  if (L > 180) {
    const s = band(kurva(a + 22, 13 + 84, a + 60, 50, a + L * 0.36, 12, 6), 10, 9)
    g.poly(s.poly).fill(shade(TRA_VIT, 0.12)).stroke({ width: 1.2, color: shade(TRA_VIT, 0.4), alpha: 0.5 })
  }
  // Räcket (står bakom grodan).
  const n = Math.max(2, Math.round(L / 110))
  for (let i = 0; i <= n; i++) {
    const x = a + 34 + ((L - 46) * i) / n
    g.roundRect(x - 3.5, -58, 7, 47, 3).fill(cylinderFill(TRA_VIT, { axis: 'y', dark: 0.24, highlight: 0.1 }))
  }
  g.roundRect(a + 26, -62, L - 32, 8, 4).fill(topLightFill(TRA_ROD, { highlight: 0.3, dark: 0.25 }))
  g.roundRect(a + 26, -38, L - 32, 5, 2.5).fill(shade(TRA_VIT, 0.08))
  // Däcket: plankornas ovansida och en röd kantbräda med vit rand.
  g.rect(a - 4, -13, L + 8, 8).fill(topLightFill(TRA_LJUS, { highlight: 0.3, dark: 0.3 }))
  for (let x = a + 14; x < b; x += 22) g.moveTo(x, -12).lineTo(x, -6)
  g.stroke({ width: 1.2, color: shade(TRA_LJUS, 0.4), alpha: 0.6 })
  g.roundRect(a - 4, -6, L + 8, 19, 3).fill(topLightFill(TRA_ROD, { highlight: 0.3, dark: 0.25 }))
  g.rect(a - 4, 1, L + 8, 3).fill({ color: 0xffffff, alpha: 0.85 })
  for (let x = a + 30; x < b - 10; x += 90) g.circle(x, 8, 2).fill(shade(TRA_ROD, 0.45))
  g.moveTo(a, -12).lineTo(b, -12).stroke({ width: 1.4, color: 0xffffff, alpha: 0.45 })
}

// ---- 4. Stranden (i havet): ett hopptorn i blått och vitt -----------------------------------------

export function ritaTradHopptorn(R, geo) {
  const { sx, sgn, bas, topp, grenar } = geo
  const stam = dekor(R, sx, 0)
  stam.scale.x = sgn
  const g = ritning(stam)
  const b = Math.max(bas, 740) + 20 // pålarna går ned till botten (vattnet ritas över dem)
  // Utåtspretande stödben under ytan.
  for (const s of [-1, 1]) g.poly(band([s * 18, YT_Y + 30, s * 40, 680, s * 66, b], 12, 16).poly).fill(shade(HOPP_BLA, 0.25))
  // Kryssförband mellan benen.
  for (let y = YT_Y + 20; y - 120 > topp + 90; y -= 140) g.moveTo(-17, y).lineTo(17, y - 120).moveTo(17, y).lineTo(-17, y - 120)
  g.stroke({ width: 5, color: 0xdfe8ef, cap: 'round' })
  // Stegpinnar.
  for (let y = YT_Y - 22; y > topp + 36; y -= 30) g.roundRect(-15, y - 2.5, 30, 5, 2.5).fill(topLightFill(BRADA, { highlight: 0.2, dark: 0.25 }))
  // Benen.
  for (const px of [-21, 21]) g.roundRect(px - 8, topp + 10, 16, b - topp - 10, 7).fill(cylinderFill(HOPP_BLA, { axis: 'y', dark: 0.32, highlight: 0.3 }))
  // Alger och havstulpaner vid vattenlinjen.
  for (const px of [-21, 21]) {
    g.roundRect(px - 9, YT_Y - 8, 18, 60, 6).fill({ color: 0x3f6a2a, alpha: 0.55 })
    for (let i = 0; i < 3; i++) havstulpan(g, px + rnd(-5, 5), YT_Y - rnd(-10, 6), rnd(2.4, 3.4))
  }
  // Utkiken i toppen: golv, räcke och en vimpelstång.
  g.roundRect(-3, topp - 84, 6, 110, 3).fill(cylinderFill(0xd8dde2, { axis: 'y', dark: 0.3, highlight: 0.2 }))
  g.circle(0, topp - 86, 5).fill(sphereFill(0xf6c945))
  for (let x = -50; x <= 50; x += 20) g.roundRect(x - 2.5, topp - 16, 5, 32, 2).fill(BRADA)
  g.roundRect(-58, topp - 20, 116, 7, 3.5).fill(cylinderFill(HOPP_BLA, { axis: 'x', dark: 0.3, highlight: 0.3 }))
  g.roundRect(-62, topp + 14, 124, 14, 4).fill(topLightFill(BRADA, { highlight: 0.2, dark: 0.25 }))
  g.rect(-62, topp + 23, 124, 4).fill(HOPP_BLA)

  const grenVyer = []
  for (const gr of grenar) {
    const v = grenVy(R, gr, sgn)
    ritaHoppbrada(v, gr.L)
    grenVyer.push(v)
  }
  const fl = flagga(stam, 3, topp - 64, { len: 64, h: 30, n: 5, farger: [HOPP_BLA, 0xffffff, HOPP_BLA], vimpel: true })
  return { svaj: [], uppdatera: flaggUpp([fl]), vyer: { stam, grenar: grenVyer } }
}

function ritaHoppbrada(v, L) {
  const g = ritning(v)
  const a = -L / 2
  const b = L / 2
  // Stag från stommen ut till stödbocken under brädan.
  const fx = a + Math.min(L * 0.36, 150)
  g.roundRect(a - 2, 16, fx - a + 12, 9, 4).fill(cylinderFill(shade(HOPP_BLA, 0.2), { axis: 'x', dark: 0.3, highlight: 0.3 }))
  g.poly([fx - 16, 26, fx + 16, 26, fx + 9, 4, fx - 9, 4]).fill(topLightFill(HOPP_BLA, { highlight: 0.3, dark: 0.3 }))
  g.ellipse(fx, 4, 11, 4).fill(shade(HOPP_BLA, 0.35))
  // Räcket vid stommen: ett böjt rör som går upp och ned.
  const r1 = a + 34
  const r2 = a + Math.min(110, L * 0.4)
  g.moveTo(r1, -12).lineTo(r1, -48).quadraticCurveTo(r1 + 4, -66, r1 + 24, -66).lineTo(r2 - 18, -66).quadraticCurveTo(r2, -64, r2, -44).lineTo(r2, -12)
  g.stroke({ width: 7, color: HOPP_BLA, cap: 'round', join: 'round' })
  g.moveTo(r1 - 1.5, -16).lineTo(r1 - 1.5, -48).quadraticCurveTo(r1 + 2, -63, r1 + 22, -63.5).lineTo(r2 - 20, -63.5)
  g.stroke({ width: 2, color: 0xffffff, alpha: 0.45, cap: 'round' })
  // Brädan: vit, tunnare ut mot spetsen, rundad nos, blå undersida.
  g.moveTo(a - 6, -13)
    .lineTo(b - 8, -13)
    .quadraticCurveTo(b + 6, -13, b + 6, -4)
    .quadraticCurveTo(b + 6, 5, b - 8, 5)
    .lineTo(a + L * 0.45, 7)
    .lineTo(a - 6, 13)
    .closePath()
    .fill(topLightFill(BRADA, { highlight: 0.2, dark: 0.3 }))
  g.moveTo(a - 6, 6).lineTo(a + L * 0.45, 2).lineTo(b - 8, 1).quadraticCurveTo(b + 4, 1, b + 5, -1)
    .lineTo(b + 5, 1).quadraticCurveTo(b + 4, 5, b - 8, 5).lineTo(a + L * 0.45, 7).lineTo(a - 6, 13).closePath()
    .fill(topLightFill(HOPP_BLA, { highlight: 0.2, dark: 0.3 }))
  // Halkskydd överst (ljusblått, räfflat) och en blå kantrand.
  g.roundRect(a, -13, L - 8, 6, 3).fill(0xa9d8f2)
  for (let x = a + 8; x < b - 12; x += 7) g.moveTo(x, -12).lineTo(x - 2, -8)
  g.stroke({ width: 1, color: 0x6fb3dc, alpha: 0.8, cap: 'round' })
  g.moveTo(a - 4, -4).lineTo(b - 2, -4.5).stroke({ width: 3.5, color: HOPP_BLA, cap: 'round' })
  g.moveTo(b + 3, -11).quadraticCurveTo(b + 5, -6, b + 2, -1).stroke({ width: 1.4, color: 0xffffff, alpha: 0.7, cap: 'round' })
}

// =================================================================================================
// PLATTFORMAR
// =================================================================================================

// ---- 5. Träsket: en tuva i vattnet ----------------------------------------------------------------

export function ritaTuva(R, { x, w, topp }) {
  const svaj = []
  const c = dekor(R, x, 0)
  const u = w / 2
  const r = 0.4 * w
  // Hur långt ned gräskjolen når: till vattnet, eller en bit under den rundade toppen.
  const kjol = Math.min(YT_Y + 4, topp + r + 18)
  // Bakre strån (mörka, upp och ut) — bakom klumpen.
  const bak = dekor(c, 0, topp + 4)
  const bg = ritning(bak)
  for (let i = 0; i < 18; i++) {
    const t = rnd(-1, 1)
    const bx = t * u * 0.6
    const h = rnd(48, 88) * (1 - Math.abs(t) * 0.3)
    const lut = t * rnd(30, 64) + rnd(-8, 8)
    stra(bg, bx, 6, bx + lut * 0.3, -h * 0.65, bx + lut, -h, rnd(4.5, 6.5)).fill(shade(valj(TUVGRAS), 0.3))
  }
  svaj.push(svajar(bak, rnd(0.03, 0.05), rnd(0.8, 1.2)))
  // Torvklumpen: rundad topp, vidgar sig under vattnet (syns mest genom vattnet).
  const g = ritning(c)
  g.moveTo(-u, topp + r)
    .quadraticCurveTo(-u, topp, -u + r, topp)
    .lineTo(u - r, topp)
    .quadraticCurveTo(u, topp, u, topp + r)
    .bezierCurveTo(u + 4, 600, u * 1.35, 690, u * 1.62, 780)
    .lineTo(-u * 1.62, 780)
    .bezierCurveTo(-u * 1.35, 690, -u - 4, 600, -u, topp + r)
    .closePath()
    .fill(topLightFill(TORV, { highlight: 0.2, dark: 0.5, mid: 0.3 }))
  for (let i = 0; i < 14; i++) {
    const y = rnd(kjol, 740)
    const x0 = rnd(-u * 1.1, u * 1.1)
    g.moveTo(x0, y).quadraticCurveTo(x0 + rnd(-10, 10), y + rnd(6, 14), x0 + rnd(-16, 16), y + rnd(14, 26))
  }
  g.stroke({ width: 1.5, color: 0x8a6e4a, alpha: 0.55, cap: 'round' })
  for (let i = 0; i < 8; i++) g.ellipse(rnd(-u * 1.1, u * 1.1), rnd(kjol + 10, 740), rnd(3, 7), rnd(2, 4)).fill({ color: valj([0x2e2319, 0x6a5238]), alpha: 0.7 })
  // Gräskupolen: en rund kulle av gräs över toppen, med en fransig kjol som hänger ned.
  const m = ritning(c)
  m.moveTo(-u - 10, kjol - 6)
    .bezierCurveTo(-u - 14, topp + r * 0.15, -u * 0.62, topp - 9, 0, topp - 9)
    .bezierCurveTo(u * 0.62, topp - 9, u + 14, topp + r * 0.15, u + 10, kjol - 6)
  const steg = 8
  for (let xx = u + 10; xx > -u - 10; xx -= steg) m.lineTo(xx - steg * 0.5, kjol + rnd(0, 8)).lineTo(xx - steg, kjol - rnd(8, 14))
  m.closePath().fill(topLightFill(TUVGRAS[1], { highlight: 0.35, dark: 0.35 }))
  // Strån som draperar kupolen: från toppen ut och ned över kanterna.
  for (const [farg, a, bredd] of [[shade(TUVGRAS[3], 0.25), 0.55, 1.8], [tint(TUVGRAS[2], 0.3), 0.75, 1.6]]) {
    for (let i = 0; i < 16; i++) {
      const t = rnd(-1, 1)
      const bx = t * u * 0.3
      const ex = t * (u + rnd(4, 14))
      m.moveTo(bx, topp - 6).quadraticCurveTo(t * (u * 0.9), topp + rnd(-6, 6), ex, topp + rnd(r * 0.4, kjol - topp - 4))
    }
    m.stroke({ width: bredd, color: farg, alpha: a, cap: 'round' })
  }
  // Hängande strån över kanterna — en grupp per sida, vajar var för sig.
  for (const s of [-1, 1]) {
    const hc = dekor(c, s * u * 0.5, topp)
    const hg = ritning(hc)
    for (let i = 0; i < 13; i++) {
      const bx = s * rnd(-u * 0.25, u * 0.35)
      const tx = s * (u * 0.55 + rnd(18, 46))
      const ty = rnd(16, Math.max(24, kjol - topp + 14))
      stra(hg, bx, rnd(-6, 2), s * (u * 0.55 + rnd(8, 28)), rnd(-30, -10), tx, ty, rnd(4.5, 7)).fill(valj(TUVGRAS))
    }
    for (let i = 0; i < 5; i++) {
      const bx = s * rnd(0, u * 0.35)
      stra(hg, bx, -4, s * (u * 0.5 + rnd(4, 18)), rnd(-22, -8), s * (u * 0.5 + rnd(20, 36)), rnd(24, 60), 3.5).fill(tint(TUVGRAS[2], 0.3))
    }
    svaj.push(svajar(hc, rnd(0.025, 0.04), rnd(0.9, 1.3)))
  }
  // Främre upprätta strån.
  const fram = dekor(c, 0, topp - 4)
  const fg = ritning(fram)
  for (let i = 0; i < 12; i++) {
    const t = rnd(-1, 1)
    const bx = t * u * 0.55
    const lut = t * rnd(14, 40) + rnd(-10, 10)
    const h = rnd(26, 60)
    stra(fg, bx, 4, bx + lut * 0.35, -h * 0.6, bx + lut, -h, rnd(4, 6)).fill(valj(TUVGRAS))
  }
  for (let i = 0; i < 6; i++) {
    const bx = rnd(-u * 0.5, u * 0.5)
    fg.moveTo(bx, 0).quadraticCurveTo(bx + rnd(-4, 4), -20, bx + rnd(-10, 10), -rnd(30, 48))
  }
  fg.stroke({ width: 1.4, color: tint(TUVGRAS[2], 0.4), alpha: 0.8, cap: 'round' })
  svaj.push(svajar(fram, rnd(0.035, 0.055), rnd(1, 1.4)))
  // Tuvull: vita bomullsbollar på tunna stjälkar.
  if (chans(0.6)) {
    for (let i = rint(1, 3); i > 0; i--) {
      const tc = dekor(c, rnd(-u * 0.55, u * 0.55), topp - 6)
      const tg = ritning(tc)
      const h = rnd(46, 76)
      const lut = rnd(-12, 12)
      tg.moveTo(0, 0).quadraticCurveTo(lut * 0.2, -h * 0.5, lut, -h).stroke({ width: 1.8, color: 0x6a7a3a, cap: 'round' })
      for (let k = 0; k < 7; k++) {
        const a = (k * TAU) / 7
        tg.circle(lut + Math.cos(a) * 4.5, -h - 5 + Math.sin(a) * 4, rnd(4, 5.5)).fill(sphereFill(TUVULL, { lightY: 0.3, dark: 0.12 }))
      }
      tg.circle(lut - 1, -h - 6, 5).fill(sphereFill(TUVULL, { lightY: 0.3, dark: 0.12 }))
      svaj.push(svajar(tc, rnd(0.06, 0.1), rnd(1.2, 1.8)))
    }
  }
  return { svaj }
}

// ---- 6. Öknen: en sandstensklippa (mesa) -----------------------------------------------------

export function ritaKlippa(R, { x, w, topp, bas }) {
  const c = dekor(R, x, 0)
  const g = ritning(c)
  const u = w / 2
  const B = bas + 10
  const ub = u * 1.18
  const vagg = (y) => u + ((ub - u) * (y - topp)) / (B - topp) // halva bredden vid y
  // Lagergränser: den översta platt (plattformen), de andra lite vågiga.
  const granser = [topp]
  for (let y = topp + rnd(14, 22); y < B - 10; y += rnd(16, 32)) granser.push(y)
  granser.push(B)
  const NI = 7
  const linjer = granser.map((y, j) => {
    const p = []
    for (let i = 1; i < NI; i++) {
      const t = i / NI
      p.push(-vagg(y) + 2 * vagg(y) * t, j === 0 || j === granser.length - 1 ? y : y + rnd(-2.5, 2.5))
    }
    return p
  })
  const k0 = rint(0, 3)
  for (let j = 0; j < granser.length - 1; j++) {
    const y0 = granser[j]
    const y1 = granser[j + 1]
    const d = j === 0 ? 4 : rnd(-4, 4) // hårdare lager sticker ut, översta är ett överhäng
    const pts = [-vagg(y0) - d, y0, ...linjer[j], vagg(y0) + d, y0, vagg(y1) + d, y1]
    const nedre = linjer[j + 1]
    for (let i = nedre.length - 2; i >= 0; i -= 2) pts.push(nedre[i], nedre[i + 1])
    pts.push(-vagg(y1) - d, y1)
    g.poly(pts).fill(topLightFill(SANDSTEN[(k0 + j) % SANDSTEN.length], { highlight: 0.18, dark: 0.22 }))
  }
  // Varje lagerkant: en ljus avsats och en mörk skugga strax under.
  for (let j = 1; j < granser.length - 1; j++) {
    const y = granser[j]
    const kant = [-vagg(y), y, ...linjer[j], vagg(y), y]
    polylinje(g, kant).stroke({ width: 2, color: tint(SANDSTEN[2], 0.45), alpha: 0.4, cap: 'round', join: 'round' })
    polylinje(g, kant.map((v, i) => (i % 2 ? v + 3 : v))).stroke({ width: 2, color: shade(SANDSTEN[3], 0.4), alpha: 0.18, cap: 'round', join: 'round' })
  }
  // Skuggsidan till höger, ljus kant till vänster.
  g.poly([u * 0.3, topp + 4, u + 4, topp + 4, ub + 4, B, ub * 0.25, B]).fill({ color: 0x5a2410, alpha: 0.08 })
  g.poly([u * 0.62, topp + 4, u + 4, topp + 4, ub + 4, B, ub * 0.6, B]).fill({ color: 0x5a2410, alpha: 0.1 })
  g.poly([u * 0.86, topp + 4, u + 4, topp + 4, ub + 4, B, ub * 0.86, B]).fill({ color: 0x5a2410, alpha: 0.1 })
  g.moveTo(-u - 2, topp + 8).lineTo(-ub - 2, B - 6).stroke({ width: 2, color: tint(SANDSTEN[2], 0.4), alpha: 0.45, cap: 'round' })
  // Toppens ljusa yta.
  g.roundRect(-u - 4, topp - 1, w + 8, 6, 3).fill(tint(SANDSTEN[2], 0.35))
  g.moveTo(-u, topp + 0.5).lineTo(u, topp + 0.5).stroke({ width: 1.4, color: 0xffffff, alpha: 0.4 })
  // Sprickor och små hål.
  for (let i = 0; i < rint(2, 3); i++) {
    let cx = rnd(-u * 0.7, u * 0.7)
    let cy = topp + rnd(6, 20)
    g.moveTo(cx, cy)
    const slut = cy + rnd(40, 100)
    while (cy < slut && cy < B - 10) {
      cy += rnd(8, 14)
      cx += rnd(-6, 6)
      g.lineTo(cx, cy)
    }
  }
  g.stroke({ width: 2, color: shade(SANDSTEN[3], 0.45), alpha: 0.55, cap: 'round', join: 'round' })
  for (let i = 0; i < 6; i++) g.ellipse(rnd(-u * 0.8, u * 0.8), rnd(topp + 20, B - 20), rnd(2.5, 5), rnd(1.5, 3)).fill({ color: 0x6a2a14, alpha: 0.35 })
  // Nedfallna stenar vid foten.
  for (let i = 0; i < 5; i++) {
    const s = chans(0.5) ? -1 : 1
    const rr = rnd(5, 11)
    g.ellipse(s * (ub + rnd(-6, 16)), B - 12 - rr * 0.3, rr, rr * 0.7).fill(topLightFill(SANDSTEN[i % SANDSTEN.length], { highlight: 0.25, dark: 0.3 }))
  }
  // Ibland en ödla på väggen, ibland en torr buske på kanten.
  const val = Math.random()
  if (val < 0.45) odla(g, rnd(-u * 0.45, u * 0.45), rnd(topp + 34, Math.max(topp + 40, B - 50)), chans(0.5) ? 1 : -1)
  else if (val < 0.85) torrBuske(g, (chans(0.5) ? -1 : 1) * rnd(u * 0.4, u * 0.75), topp)
  return { svaj: [] }
}

function odla(g, x, y, dir) {
  const f = 0x72b04c
  // Svansen i en S-kurva.
  g.poly(band(kurva(x - dir * 10, y, x - dir * 24, y + 14, x - dir * 34, y + 4, 8), 5, 1).poly).fill(f)
  // Ben.
  for (const [lx, ly, ex, ey] of [[-6, 1, -12, -5], [-6, 3, -12, 9], [7, 1, 13, -5], [7, 3, 13, 9]]) {
    g.moveTo(x + dir * lx, y + ly).lineTo(x + dir * ex, y + ey)
  }
  g.stroke({ width: 2.4, color: shade(f, 0.15), cap: 'round' })
  // Kropp och huvud.
  g.ellipse(x, y + 2, 11, 5).fill(sphereFill(f, { lightY: 0.3, dark: 0.25 }))
  g.ellipse(x + dir * 13, y + 1, 6, 4.2).fill(sphereFill(f, { lightY: 0.3, dark: 0.25 }))
  g.circle(x + dir * 15, y - 0.5, 1.5).fill(0x1d2a1a)
  g.circle(x + dir * 15.4, y - 1, 0.5).fill(0xffffff)
  for (const px of [-4, 0, 4]) g.circle(x + dir * px, y + 1, 1.1).fill(tint(f, 0.45))
}

function torrBuske(g, x, y) {
  for (let i = 0; i < 9; i++) {
    const a = rnd(-1.2, 1.2)
    const l = rnd(14, 26)
    const ex = x + Math.sin(a) * l
    const ey = y - Math.cos(a) * l
    g.moveTo(x, y).quadraticCurveTo(x + Math.sin(a) * l * 0.5 + rnd(-3, 3), y - Math.cos(a) * l * 0.5, ex, ey)
    g.moveTo(ex - Math.sin(a) * l * 0.4, ey + Math.cos(a) * l * 0.4).lineTo(ex - Math.sin(a) * l * 0.4 + rnd(-6, 6), ey + Math.cos(a) * l * 0.4 - rnd(3, 7))
  }
  g.stroke({ width: 1.6, color: 0x8a6a44, cap: 'round' })
  for (let i = 0; i < 6; i++) g.circle(x + rnd(-14, 14), y - rnd(6, 22), rnd(2, 3.2)).fill({ color: valj([0x9aa87a, 0xb3b08a]), alpha: 0.9 })
}

// ---- 7. Öknen: en sanddyn ------------------------------------------------------------------------

export function ritaDyn(R, { pts, bas = 900 }) {
  const g = ritning(R)
  const n = pts.length / 2
  const xa = pts[0]
  const xb = pts[(n - 1) * 2]
  const yta = MARK_Y - 3 // markens ritade ovansida (ritaSand)
  // Kroppen i två delar: ovanför marken en ljus dyn som tonar mot markens färg vid foten, och
  // under marken EXAKT markens toning (ritaSand), så att foten inte får någon söm.
  const ovan = []
  for (let i = 0; i < n; i++) ovan.push(pts[i * 2], Math.min(pts[i * 2 + 1], yta))
  g.poly([...ovan, xb, yta, xa, yta]).fill(verticalFill(DYN_TOPP, OKEN_TOPP))
  const under = []
  for (let i = 0; i < n; i++) under.push(pts[i * 2], Math.max(pts[i * 2 + 1], yta))
  g.poly([...under, xb, bas, xa, bas]).fill(verticalFill(OKEN_TOPP, OKEN_BOTTEN))
  // Krönet och läsidan (den brantare sidan): läsidan ligger i en mjuk skugga — fyra band vars
  // innerkant lutar allt längre in mot läsidan, så skuggan tonar i stället för att sluta i en kant.
  let ki = 0
  for (let i = 1; i < n; i++) if (pts[i * 2 + 1] < pts[ki * 2 + 1]) ki = i
  const kx = pts[ki * 2]
  const ky = pts[ki * 2 + 1]
  const brantV = (pts[1] - ky) / Math.max(1, Math.abs(kx - xa))
  const brantH = (pts[(n - 1) * 2 + 1] - ky) / Math.max(1, Math.abs(xb - kx))
  const lee = brantH >= brantV ? 1 : -1
  const lePts = []
  if (lee > 0) for (let i = ki; i < n; i++) lePts.push(pts[i * 2], pts[i * 2 + 1])
  else for (let i = ki; i >= 0; i--) lePts.push(pts[i * 2], pts[i * 2 + 1])
  const lx1 = lePts[lePts.length - 2]
  const ly1 = lePts[lePts.length - 1]
  const bredd = Math.abs(lx1 - kx)
  // Läsidan: en skugga vars inre kant är en mjuk kurva från krönet ned till foten (dynens rygg).
  const fotX = kx + lee * bredd * 0.3
  const rygg = kurva(fotX, yta, kx - lee * bredd * 0.06, (ky + yta) / 2, kx, ky, 10)
  g.poly([...lePts, lx1, Math.max(ly1, yta), ...rygg.slice(0, -2)]).fill({ color: 0x8a4a1a, alpha: 0.13 })
  // Ett smalt mörkare band precis under krönet på läsidan.
  const skugga = []
  for (let i = 0; i < lePts.length; i += 2) skugga.push(lePts[i], lePts[i + 1])
  for (let i = lePts.length - 2; i >= 0; i -= 2) skugga.push(lePts[i], lePts[i + 1] + 14)
  g.poly(skugga).fill({ color: 0x8a4a1a, alpha: 0.07 })
  // Vindkrusningar på lovartsidan: streck parallella med ytan, i bitar.
  const lovA = lee > 0 ? xa : xb
  const lovB = kx - lee * 18
  const lo = Math.min(lovA, lovB)
  const hi = Math.max(lovA, lovB)
  for (const d of [12, 28, 46, 68, 94]) {
    let x = lo + rnd(0, 30)
    while (x < hi - 20) {
      const L = rnd(36, 80)
      const seg = []
      for (let xx = x; xx < Math.min(hi, x + L); xx += 6) {
        const y = yVid(pts, xx) + d + 2.2 * Math.sin(xx * 0.09 + d)
        if (y < yta - 4) seg.push(xx, y)
      }
      if (seg.length >= 6) {
        polylinje(g, seg).stroke({ width: 2, color: tint(DYN_TOPP, 0.5), alpha: 0.6, cap: 'round' })
        polylinje(g, seg.map((v, i) => (i % 2 ? v + 3 : v))).stroke({ width: 1.5, color: shade(DYN_BOTTEN, 0.1), alpha: 0.22, cap: 'round' })
      }
      x += L + rnd(16, 36)
    }
  }
  // Ljust krön.
  const kron = []
  for (let i = Math.max(0, ki - 3); i <= Math.min(n - 1, ki + 3); i++) kron.push(pts[i * 2], pts[i * 2 + 1] + 1.5)
  if (kron.length >= 4) polylinje(g, kron).stroke({ width: 3, color: tint(DYN_TOPP, 0.55), alpha: 0.8, cap: 'round', join: 'round' })
  // Småsten och torra tuvor på ytan.
  for (let i = 0; i < Math.max(2, (Math.abs(xb - xa) / 160) | 0); i++) {
    const xx = rnd(Math.min(xa, xb) + 20, Math.max(xa, xb) - 20)
    const yy = yVid(pts, xx)
    if (chans(0.5)) torrTuva(g, xx, yy + 3, rnd(0.7, 1))
    else g.ellipse(xx, yy + 2, rnd(3, 6), rnd(2, 3.5)).fill({ color: valj([0xb89868, 0xa07a50]), alpha: 0.9 })
  }
  return { svaj: [] }
}

// ---- 8. Stranden: en träbrygga ut i havet --------------------------------------------------------

export function ritaBrygga(R, { x0, x1, topp }) {
  const g = ritning(R)
  const L = x1 - x0
  const n = Math.max(1, Math.round((L - 32) / 140))
  const palar = []
  for (let i = 0; i <= n; i++) palar.push(x0 + 16 + ((L - 32) * i) / n)
  // Pålarna ned i vattnet: blöta och slemmiga vid vattenlinjen, havstulpaner.
  for (const px of palar) {
    g.roundRect(px - 10, topp + 8, 20, 760 - topp - 8, 6).fill(cylinderFill(PALE, { axis: 'y', dark: 0.36, highlight: 0.2 }))
    g.rect(px - 10, YT_Y, 20, 760 - YT_Y).fill({ color: 0x1e3a2a, alpha: 0.25 })
    g.roundRect(px - 11, YT_Y - 8, 22, 18, 6).fill({ color: 0x5f7a2e, alpha: 0.8 })
    for (let i = 0; i < 3; i++) havstulpan(g, px + rnd(-6, 6), YT_Y + rnd(10, 40), rnd(2.4, 3.4))
  }
  // Tvärslå under däcket.
  g.rect(x0 + 6, topp + 22, L - 12, 8).fill(shade(TRA, 0.35))
  // Däcket: plankornas ändar ovanpå och en kantbräda framtill med bultar vid pålarna.
  g.rect(x0 - 4, topp, L + 8, 8).fill(topLightFill(TRA_LJUS, { highlight: 0.3, dark: 0.3 }))
  for (let x = x0 + 16; x < x1; x += 22) g.moveTo(x, topp + 1).lineTo(x, topp + 8)
  g.stroke({ width: 1.3, color: shade(TRA_LJUS, 0.4), alpha: 0.65 })
  g.roundRect(x0 - 4, topp + 7, L + 8, 18, 3).fill(topLightFill(TRA, { highlight: 0.25, dark: 0.3 }))
  for (const k of [12, 18]) g.moveTo(x0 + 6, topp + k).lineTo(x1 - 6, topp + k + rnd(-1, 1))
  g.stroke({ width: 1.2, color: shade(TRA, 0.35), alpha: 0.4 })
  for (const px of palar) {
    g.circle(px - 4, topp + 15, 2).fill(0x4a4a4a)
    g.circle(px + 4, topp + 15, 2).fill(0x4a4a4a)
  }
  g.moveTo(x0 - 4, topp + 0.5).lineTo(x1 + 4, topp + 0.5).stroke({ width: 1.4, color: 0xffffff, alpha: 0.4 })
  // Två förtöjningspålar ovanför däcket längst ut, rep emellan och en livboj.
  if (palar.length >= 2) {
    const b1 = palar[palar.length - 2]
    const b2 = palar[palar.length - 1]
    for (const px of [b1, b2]) {
      g.roundRect(px - 9, topp - 36, 18, 44, 7).fill(cylinderFill(PALE, { axis: 'y', dark: 0.36, highlight: 0.2 }))
      g.ellipse(px, topp - 34, 8, 3.2).fill(0xc7a070)
    }
    g.moveTo(b1 + 6, topp - 26).quadraticCurveTo((b1 + b2) / 2, topp - 2, b2 - 6, topp - 26).stroke({ width: 3.6, color: 0xd8c08a, cap: 'round' })
    for (let t = 0.1; t < 0.95; t += 0.08) {
      const xx = b1 + 6 + (b2 - b1 - 12) * t
      const yy = topp - 26 + 48 * t * (1 - t)
      g.moveTo(xx - 1.5, yy - 1.5).lineTo(xx + 1.5, yy + 1.5)
    }
    g.stroke({ width: 1, color: 0x9a7a48, alpha: 0.8 })
    for (const px of [b1, b2]) {
      g.moveTo(px - 9, topp - 27).lineTo(px + 9, topp - 26).stroke({ width: 3.6, color: 0xd8c08a, cap: 'round' })
    }
    livboj(g, b1, topp - 10, 17)
  }
  // En badstege längst ut.
  const sx = x1 - 26
  for (const dx of [-9, 9]) {
    g.moveTo(sx + dx, topp - 24).quadraticCurveTo(sx + dx + 2, topp - 34, sx + dx + 14, topp - 30).lineTo(sx + dx + 14, 680)
  }
  g.stroke({ width: 4, color: 0xc9d1d8, cap: 'round', join: 'round' })
  for (let y = topp + 34; y < 670; y += 28) g.moveTo(sx - 5, y).lineTo(sx + 23, y)
  g.stroke({ width: 3, color: 0xb2bcc5, cap: 'round' })
  return { svaj: [] }
}

// ---- 9. Stranden: ett parasoll ------------------------------------------------------------------

export function ritaParasoll(R, { x, w, topp }) {
  const [A, B] = valj(PARASOLL)
  const c = dekor(R, 0, 0)
  const g = ritning(c)
  // Skugga på sanden och sanden som skottats upp runt stången.
  g.ellipse(x + 10, MARK_Y + 4, w * 0.45, 7).fill({ color: 0x8a6a3a, alpha: 0.14 })
  // Handduk, hink och spade vid foten (på slumpad sida).
  const sida = chans(0.5) ? 1 : -1
  const [H1, H2] = valj(HANDDUK)
  const hx = x + sida * 22
  const hx2 = hx + sida * 118
  const xl = Math.min(hx, hx2)
  const xr = Math.max(hx, hx2)
  g.poly([xl + 6, MARK_Y - 5, xr + 6, MARK_Y - 5, xr - 2, MARK_Y + 5, xl - 2, MARK_Y + 5]).fill(H1)
  for (let i = 1; i < 8; i += 2) {
    const a0 = xl + ((xr - xl) * i) / 8
    const a1 = xl + ((xr - xl) * (i + 1)) / 8
    g.poly([a0 + 6, MARK_Y - 5, a1 + 6, MARK_Y - 5, a1 - 2, MARK_Y + 5, a0 - 2, MARK_Y + 5]).fill(H2)
  }
  g.poly([xl - 2, MARK_Y + 5, xr - 2, MARK_Y + 5, xr - 2, MARK_Y + 7, xl - 2, MARK_Y + 7]).fill({ color: 0x000000, alpha: 0.12 })
  for (let k = xl; k < xr; k += 5) g.moveTo(k - 2, MARK_Y + 5).lineTo(k - 2, MARK_Y + 8)
  g.stroke({ width: 1, color: H1, alpha: 0.9 })
  hink(g, x - sida * 46, MARK_Y + 4, 1, valj(HINKAR))
  spade(g, x - sida * 74, MARK_Y + 4, sida * -0.35, valj(HINKAR))
  // Stången: vit med färgade band, i en liten sandhög.
  const st = topp + 18
  g.roundRect(x - 4, st, 8, MARK_Y + 2 - st, 4).fill(cylinderFill(0xf2efe8, { axis: 'y', dark: 0.25, highlight: 0.15 }))
  for (let y = st + 20; y < MARK_Y - 10; y += 36) g.rect(x - 4, y, 8, 14).fill(cylinderFill(A, { axis: 'y', dark: 0.28, highlight: 0.2 }))
  g.roundRect(x - 6, (st + MARK_Y) / 2 - 6, 12, 10, 4).fill(0xc9ced4)
  g.moveTo(x - 26, MARK_Y + 6).quadraticCurveTo(x, MARK_Y - 10, x + 26, MARK_Y + 6).closePath().fill(topLightFill(STRANDSAND, { highlight: 0.2, dark: 0.1 }))
  // Duken: en flack kupol, toppen på `topp`, kanten ~30 px lägre. Kilar från toppen till kanten.
  const W = w / 2 + 6
  const yRim = (u) => topp + 26 + 7 * (1 - u * u)
  const N = 8
  const us = []
  for (let k = 0; k <= N; k++) us.push(-Math.cos((Math.PI * k) / N))
  const rib = (u) => {
    const p = []
    for (let i = 0; i <= 8; i++) {
      const s = i / 8
      p.push(x + u * W * s, topp + (yRim(u) - topp) * s * s)
    }
    return p
  }
  for (let k = 0; k < N; k++) {
    const ua = us[k]
    const ub = us[k + 1]
    const um = (ua + ub) / 2
    const ra = rib(ua)
    const rb = rib(ub)
    const skalla = kurva(x + ua * W, yRim(ua), x + um * W, yRim(um) + 12, x + ub * W, yRim(ub), 6)
    const pts = [...ra, ...skalla.slice(2)]
    for (let i = rb.length - 4; i >= 0; i -= 2) pts.push(rb[i], rb[i + 1])
    const f = k % 2 ? B : A
    const ff = um > 0.35 ? shade(f, 0.1) : um < -0.35 ? tint(f, 0.1) : f
    g.poly(pts).fill(topLightFill(ff, { highlight: 0.25, dark: 0.2 }))
  }
  // Ekrarna, fransar under kanten och en knopp i toppen.
  for (let k = 1; k < N; k++) polylinje(g, rib(us[k]))
  g.stroke({ width: 1, color: 0x000000, alpha: 0.12 })
  for (let k = 0; k < N; k++) {
    const um = (us[k] + us[k + 1]) / 2
    const fx = x + um * W
    const fy = yRim(um) + 7
    g.moveTo(fx, fy).lineTo(fx, fy + 6).stroke({ width: 1.2, color: k % 2 ? A : B })
    g.circle(fx, fy + 7.5, 2.4).fill(k % 2 ? A : B)
  }
  for (let k = 0; k <= N; k++) g.circle(x + us[k] * W, yRim(us[k]), 1.8).fill(0xd0d4d8)
  g.moveTo(x - W * 0.55, topp + 3).quadraticCurveTo(x - W * 0.25, topp - 1, x, topp).stroke({ width: 3, color: 0xffffff, alpha: 0.4, cap: 'round' })
  g.circle(x, topp - 3, 4).fill(sphereFill(0xf2efe8))
  return { svaj: [] }
}

// ---- 10. Stranden: en luftmadrass (i lokala koordinater) ------------------------------------------
// Origo = kroppens mitt, kroppen w × 14, ovansidan på lokalt y −7. `farg` är en av 0x4fb3e8,
// 0xf2c14e, 0xe86a8f (fasta — får gå in i en gradient).

export function ritaLuftmadrass(g, w, farg) {
  const L = -w / 2
  const H = w / 2
  const kudde = Math.min(50, w * 0.28)
  const top = -8
  const bot = 8
  // Skugga i vattnet.
  g.ellipse(0, bot + 3, w / 2 + 4, 5).fill({ color: 0x0c3a5a, alpha: 0.18 })
  // Kroppen: bulliga rör och en kudde i högra änden.
  const slut = H - kudde
  const start = L + 8
  const n = Math.max(3, Math.round((slut - start) / 24))
  const d = (slut - start) / n
  const kropp = () => {
    g.moveTo(start, bot).quadraticCurveTo(L - 2, bot, L - 2, 0).quadraticCurveTo(L - 2, top - 1, start, top)
    for (let i = 0; i < n; i++) g.quadraticCurveTo(start + d * i + d / 2, top - 5, start + d * (i + 1), top)
    g.quadraticCurveTo(slut + 4, top - 12, slut + kudde * 0.5, top - 12)
      .quadraticCurveTo(H + 2, top - 12, H + 2, top - 1)
      .quadraticCurveTo(H + 3, bot, H - 8, bot)
      .closePath()
  }
  kropp()
  g.fill(topLightFill(farg, { highlight: 0.35, dark: 0.3 }))
  // Varannat rör ljusare — randig madrass.
  for (let i = 0; i < n; i += 2) g.roundRect(start + d * i + 1.5, top + 1, d - 3, bot - top - 3, 4).fill({ color: 0xffffff, alpha: 0.22 })
  // Sömmar mellan rören och vid kudden.
  for (let i = 1; i <= n; i++) {
    const sx = start + d * i
    g.moveTo(sx, top + 0.5).quadraticCurveTo(sx + 1.5, 0, sx, bot - 1)
  }
  g.stroke({ width: 1.6, color: shade(farg, 0.3), alpha: 0.55, cap: 'round' })
  // Glans på varje rör och på kudden.
  for (let i = 0; i < n; i++) g.ellipse(start + d * i + d * 0.45, top + 1.5, d * 0.26, 1.6).fill({ color: 0xffffff, alpha: 0.55 })
  g.ellipse(slut + kudde * 0.42, top - 7, kudde * 0.22, 2.4).fill({ color: 0xffffff, alpha: 0.5 })
  // Ventilen.
  g.roundRect(L - 6, -3, 6, 5, 2).fill(0xf4f4f4)
  g.roundRect(L + 2, 2, w - 10, bot - 2, 3).fill({ color: 0x000000, alpha: 0.08 })
  kropp()
  g.stroke({ width: 1.4, color: shade(farg, 0.45), alpha: 0.5, join: 'round' })
}

// ---- 11. Badringen som kören sitter på (lokala koordinater, centrerad i (0, 0)) --------------------
// Ungarnas fötter står på y ≈ −4…3 (x −62, 0, 62): ringens ovansida spänner y −18…12, hålet
// ligger mellan och bakom ungarna, och den främre delen av röret är ~26 px tjock (ned till y 42).

export function ritaBadring(g, w = 236) {
  const [A, B] = valj(RINGAR)
  const rx = w / 2
  const cy = 12
  const ry = 30
  const hrx = Math.round(w * 0.2)
  const hry = 9
  const hcy = 4
  // Skugga/reflex i vattnet under ringen.
  g.ellipse(0, cy + 22, rx + 10, 10).fill({ color: 0x0c3a5a, alpha: 0.18 })
  // Fälten mellan ytterkanten och hålet. Gränserna böjer sig runt röret (nedåt på framsidan,
  // uppåt på baksidan) — raka gränser gör ringen till en platt skiva.
  const grans = (a, utat) => {
    const ox = Math.cos(a) * rx
    const oy = cy + Math.sin(a) * ry
    const ix = Math.cos(a) * hrx
    const iy = hcy + Math.sin(a) * hry
    const k = kurva(ix, iy, (ox + ix) / 2, (oy + iy) / 2 + Math.sin(a) * 9 + 3, ox, oy, 8)
    if (!utat) {
      const b = []
      for (let i = k.length - 2; i >= 0; i -= 2) b.push(k[i], k[i + 1])
      return b
    }
    return k
  }
  for (let i = 0; i < 8; i++) {
    const a0 = 0.2 + (i / 8) * TAU
    const a1 = 0.2 + ((i + 1) / 8) * TAU
    g.poly([...ellipsBage(0, cy, rx, ry, a0, a1, 10), ...grans(a1, false), ...ellipsBage(0, hcy, hrx, hry, a1, a0, 8), ...grans(a0, true)]).fill(i % 2 ? B : A)
  }
  // Hålet: den bakre innerväggen överst (ringens material i skugga), vatten nedanför.
  g.ellipse(0, hcy, hrx, hry).fill(shade(A, 0.4))
  g.ellipse(0, hcy + 4, hrx - 2, hry - 3).fill(0x2f79a6)
  g.ellipse(0, hcy + 5, hrx * 0.55, 1.6).fill({ color: 0xffffff, alpha: 0.35 })
  // Undersidan i skugga: en skära längs nedre kanten.
  g.poly([...ellipsBage(0, cy, rx, ry, 0.02, Math.PI - 0.02, 32), ...ellipsBage(0, cy - 7, rx - 8, ry - 11, Math.PI - 0.1, 0.1, 32)]).fill({ color: 0x0a0a1a, alpha: 0.2 })
  // Rörets rundade ovansida: ett ljust band mitt emellan hålet och ytterkanten, runt om.
  const mrx = (rx + hrx) / 2
  const mry = (ry + hry) / 2 - 2
  const mcy = (cy + hcy) / 2 - 3
  polylinje(g, ellipsBage(0, mcy, mrx, mry, Math.PI + 0.12, TAU - 0.12, 30)).stroke({ width: 8, color: 0xffffff, alpha: 0.26, cap: 'round' })
  polylinje(g, ellipsBage(0, mcy + 2, mrx, mry, 0.45, Math.PI - 0.45, 20)).stroke({ width: 6, color: 0xffffff, alpha: 0.2, cap: 'round' })
  // Hålets främre kant fångar ljuset.
  polylinje(g, ellipsBage(0, hcy + 1, hrx + 3, hry + 2, 0.3, Math.PI - 0.3, 16)).stroke({ width: 2.5, color: 0xffffff, alpha: 0.5, cap: 'round' })
  // Glansfläckar.
  g.ellipse(-rx * 0.62, cy - 11, 15, 4.5).fill({ color: 0xffffff, alpha: 0.7 })
  g.ellipse(-rx * 0.45, cy - 16, 5, 2).fill({ color: 0xffffff, alpha: 0.6 })
  g.ellipse(rx * 0.3, cy + 20, 11, 3).fill({ color: 0xffffff, alpha: 0.45 })
  // Vattenlinjen: den nedersta delen av ringen ligger under ytan.
  const djup = ry - 8
  const a0 = Math.asin(djup / ry)
  const wl = ellipsBage(0, cy, rx, ry, a0, Math.PI - a0, 18)
  g.poly(wl).fill({ color: 0x2f7fb0, alpha: 0.3 })
  g.moveTo(wl[0] + 2, wl[1]).quadraticCurveTo(0, cy + djup + 3, wl[wl.length - 2] - 2, wl[wl.length - 1]).stroke({ width: 2, color: 0xffffff, alpha: 0.55, cap: 'round' })
  // Ventilen och en mjuk kontur.
  g.roundRect(rx * 0.44, cy + 13, 8, 6, 2).fill(0xf4f4f4)
  g.ellipse(0, cy, rx, ry).stroke({ width: 1.6, color: shade(A, 0.5), alpha: 0.45 })
}

// ---- 12. Stranden: en klippa i havet --------------------------------------------------------------

export function ritaStrandsten(R, { x, w, topp }) {
  const svaj = []
  const fi = (Math.random() * STRANDSTEN.length) | 0
  const farg = STRANDSTEN[fi]
  const u = w / 2
  const c = dekor(R, x, topp) // ritas med toppen som origo
  const g = ritning(c)
  const D = 740 - topp + 30
  const wl = YT_Y - topp // vattenlinjen i lokala koordinater
  // En grannsten vid foten (under vattnet).
  g.ellipse(u * 1.2, D - 44, u * 0.5, u * 0.36).fill(topLightFill(STRANDSTEN[(fi + 1) % STRANDSTEN.length], { highlight: 0.3, dark: 0.35 }))
  // Blocket: samma silhuett som dammens stenar, vidgar sig under ytan.
  g.moveTo(-u * 1.55, D)
    .bezierCurveTo(-u * 1.62, D * 0.62, -u * 1.1, u * 1.3, -u * 0.99, u * 0.5)
    .bezierCurveTo(-u * 0.96, u * 0.1, -u * 0.5, 0, 0, 0)
    .bezierCurveTo(u * 0.55, 0, u * 0.97, u * 0.12, u, u * 0.52)
    .bezierCurveTo(u * 1.12, u * 1.35, u * 1.66, D * 0.58, u * 1.52, D)
    .closePath()
    .fill(topLightFill(farg, { highlight: 0.3, dark: 0.42, mid: 0.3 }))
  // Skuggsida, sprickor och ett blött band strax ovanför vattnet.
  g.moveTo(u * 0.35, u * 0.2).bezierCurveTo(u * 0.8, u * 0.3, u * 1.05, u * 1.2, u * 1.1, D).lineTo(u * 0.6, D).bezierCurveTo(u * 0.7, u * 1.4, u * 0.5, u * 0.6, u * 0.35, u * 0.2).closePath()
  g.fill({ color: 0x1a2530, alpha: 0.1 })
  g.moveTo(-u * 0.3, u * 0.55).quadraticCurveTo(-u * 0.12, u * 0.95, -u * 0.36, u * 1.35)
  g.moveTo(u * 0.4, u * 0.7).lineTo(u * 0.26, u * 1.05)
  g.stroke({ width: 2, color: shade(farg, 0.45), alpha: 0.5, cap: 'round' })
  if (wl > u * 0.8) {
    for (let i = 0; i < 3; i++) {
      const y = wl - 6 - i * 7
      g.moveTo(-u * 0.9, y).quadraticCurveTo(0, y + rnd(-3, 3), u * 0.92, y)
    }
    g.stroke({ width: 3, color: 0x2a3a48, alpha: 0.12, cap: 'round' })
  }
  // Havstulpaner i två klungor nära vattnet.
  for (const s of [-1, 1]) {
    const bx = s * rnd(u * 0.45, u * 0.72)
    const by = Math.max(u * 0.8, wl - rnd(8, 20))
    for (let i = 0; i < 5; i++) havstulpan(g, bx + rnd(-11, 11), by + rnd(-7, 9), rnd(3, 4.6))
  }
  // Sjöstjärnan på sidan ovanför vattnet.
  const sy = wl - 30 > u * 0.9 ? rnd(u * 0.9, wl - 30) : u * 0.75
  sjostjarna(g, rnd(-u * 0.45, u * 0.35), sy, rnd(12, 16), rnd(-0.4, 0.4), valj(SJOSTJARNA))
  // Blött blänk.
  g.ellipse(-u * 0.58, u * 0.55, u * 0.2, u * 0.09).fill({ color: 0xffffff, alpha: 0.4 })
  g.ellipse(-u * 0.2, u * 0.16, u * 0.34, u * 0.07).fill({ color: 0xffffff, alpha: 0.28 })
  for (const [gx, gy] of [[-u * 0.7, u * 0.4], [u * 0.55, u * 0.3]]) {
    g.moveTo(gx - 4, gy).lineTo(gx + 4, gy).moveTo(gx, gy - 4).lineTo(gx, gy + 4)
  }
  g.stroke({ width: 1.4, color: 0xffffff, alpha: 0.7, cap: 'round' })
  // Blåstång som ligger över ena axeln och hänger ned längs stenen (vajar lite), med små
  // luftblåsor på bladen.
  {
    const s = chans(0.5) ? -1 : 1
    const tc = dekor(c, s * u * 0.66, u * 0.2)
    const tg = ritning(tc)
    for (let i = 0; i < 6; i++) {
      const bx = s * rnd(-12, 8)
      const tx = s * rnd(4, 22)
      const ty = rnd(30, 64)
      stra(tg, bx, rnd(-4, 2), s * rnd(10, 20), ty * 0.45, tx, ty, rnd(6, 9)).fill(valj(TANG))
      for (let k = 0; k < 2; k++) {
        const t = rnd(0.35, 0.8)
        tg.ellipse(bx + (tx - bx) * t + s * rnd(2, 5) * (1 - t), ty * t, 2.6, 3.4).fill(tint(TANG[2], 0.25))
      }
    }
    tg.ellipse(s * -2, 0, 14, 5).fill(TANG[1])
    svaj.push(svajar(tc, rnd(0.03, 0.05), rnd(1, 1.5)))
  }
  if (wl > u) {
    const vc = dekor(c, (chans(0.5) ? -1 : 1) * u * rnd(0.5, 0.9), wl + 4)
    const vg = ritning(vc)
    for (let i = 0; i < 5; i++) stra(vg, rnd(-6, 6), 0, rnd(-14, 14), -rnd(14, 24), rnd(-22, 22), -rnd(28, 44), rnd(4, 6)).fill(valj(TANG))
    svaj.push(svajar(vc, rnd(0.05, 0.08), rnd(0.9, 1.3)))
  }
  return { svaj }
}

// ---- 13. Stranden: ett sandslott (ren dekor) -----------------------------------------------------

export function ritaSandslott(R, { x, bas }) {
  const svaj = []
  const c = dekor(R, x, bas)
  const g = ritning(c)
  g.ellipse(6, 3, 104, 9).fill({ color: 0x8a6a3a, alpha: 0.16 })
  // Bakre muren mellan tornen.
  g.rect(-58, -54, 116, 54).fill(topLightFill(shade(SLOTT, 0.08), { highlight: 0.2, dark: 0.25 }))
  for (let mx = -56; mx < 52; mx += 16) g.rect(mx, -63, 9, 10).fill(shade(SLOTT, 0.08))
  // Sidotornen (hinkformade) och mitttornet.
  sandTorn(g, -60, 2, 42, 70)
  sandTorn(g, 60, 2, 42, 70)
  const kTopp = -122
  sandTorn(g, 0, -30, 48, 92)
  // Flaggan på mitttornet (vajar kring pinnens fot).
  const fc = dekor(c, 0, kTopp - 9)
  const fg = ritning(fc)
  fg.moveTo(0, 0).lineTo(0, -34).stroke({ width: 2, color: 0x8a6a44, cap: 'round' })
  const ff = valj(HINKAR)
  fg.poly([1, -34, 24, -28, 1, -21]).fill(ff)
  fg.poly([1, -34, 24, -28, 12, -27]).fill({ color: 0xffffff, alpha: 0.25 })
  svaj.push(svajar(fc, 0.08, rnd(1.6, 2.2)))
  // Främre muren med port.
  g.poly([-78, 3, -72, -36, 72, -36, 78, 3]).fill(topLightFill(SLOTT, { highlight: 0.22, dark: 0.22 }))
  for (let mx = -70; mx < 66; mx += 15) g.roundRect(mx, -45, 9, 11, 2).fill(topLightFill(SLOTT, { highlight: 0.22, dark: 0.22 }))
  g.moveTo(-14, 3).lineTo(-14, -14).quadraticCurveTo(0, -32, 14, -14).lineTo(14, 3).closePath().fill(0x7a5a32)
  g.moveTo(-14, 3).lineTo(-14, -14).quadraticCurveTo(0, -32, 14, -14).lineTo(14, 3).stroke({ width: 2, color: shade(SLOTT, 0.25), alpha: 0.6 })
  // Droppar och korn (droppslott) och snäckor intryckta i muren.
  for (let i = 0; i < 30; i++) g.circle(rnd(-74, 74), rnd(-34, 0), rnd(0.8, 1.6)).fill({ color: shade(SLOTT, 0.25), alpha: 0.5 })
  for (const [sx, sy] of [[-44, -20], [40, -16], [-6, -64]]) snacka(g, sx, sy, 0.8, valj(SNACKOR))
  spiralSnacka(g, 30, -52, 0.8, valj(SNACKOR))
  // Hink och spade bredvid, snäckor i sanden.
  const s = chans(0.5) ? 1 : -1
  hink(g, s * 104, 4, 1.1, valj(HINKAR))
  spade(g, -s * 100, 4, s * 0.3, valj(HINKAR))
  snacka(g, s * 70, 7, 0.9, valj(SNACKOR))
  spiralSnacka(g, -s * 60, 8, 0.9, valj(SNACKOR))
  return { svaj }
}

// Ett hinkformat torn: smalare upptill, ränder från hinken, tinnar och ett fönster.
function sandTorn(g, x, yb, w, h) {
  const wt = w * 0.84
  const yt = yb - h
  g.moveTo(x - w / 2, yb).lineTo(x - wt / 2, yt).lineTo(x + wt / 2, yt).lineTo(x + w / 2, yb).closePath()
  g.fill(cylinderFill(SLOTT, { axis: 'y', dark: 0.24, highlight: 0.2 }))
  for (const f of [0.28, 0.6]) {
    const y = yb - h * f
    const ww = w + (wt - w) * f
    g.moveTo(x - ww / 2, y).lineTo(x + ww / 2, y)
  }
  g.stroke({ width: 1.6, color: shade(SLOTT, 0.22), alpha: 0.55 })
  const n = 3
  const mw = wt / (2 * n - 1)
  for (let i = 0; i < n; i++) g.rect(x - wt / 2 + i * 2 * mw, yt - 9, mw, 10).fill(cylinderFill(SLOTT, { axis: 'y', dark: 0.24, highlight: 0.2 }))
  const fy = yb - h * 0.72
  g.moveTo(x - 4.5, fy + 9).lineTo(x - 4.5, fy).quadraticCurveTo(x, fy - 9, x + 4.5, fy).lineTo(x + 4.5, fy + 9).closePath().fill(0x7a5a32)
}

// ---- 14. En palm (dekor) ------------------------------------------------------------------------

export function ritaPalm(R, { x, bas, h = 300, sgn = 1 }) {
  const svaj = []
  const c = dekor(R, x, bas)
  const tx = sgn * h * 0.3
  const ty = -h
  const len = h * 0.46
  // Skugga på sanden.
  ritning(c).ellipse(tx * 0.6, 4, 44 + h * 0.08, 6).fill({ color: 0x6a4a2a, alpha: 0.14 })
  // Bakre blad (mörka, uppåt) — bakom stammen.
  const bakVinklar = [-Math.PI / 2 - 0.55, -Math.PI / 2 + 0.5, -Math.PI / 2 - 0.05]
  for (const a of bakVinklar) {
    const fc = dekor(c, tx, ty)
    palmblad(ritning(fc), a, len * rnd(0.72, 0.86), PALMBLAD_BAK)
    svaj.push(svajar(fc, rnd(0.03, 0.05), rnd(0.8, 1.2)))
  }
  // Stammen: ringade segment längs en böjd kurva, bredare nedtill.
  const g = ritning(c)
  const pts = kurva(0, 0, sgn * h * 0.02, -h * 0.52, tx, ty + 6, 16)
  const n = pts.length / 2 - 1
  for (let i = n - 1; i >= 0; i--) {
    const x0 = pts[i * 2]
    const y0 = pts[i * 2 + 1]
    const x1 = pts[i * 2 + 2]
    const y1 = pts[i * 2 + 3]
    const t0 = i / n
    const t1 = (i + 1) / n
    const w0 = ((30 - 12 * t0) / 2) * 0.86
    const w1 = ((30 - 12 * t1) / 2) * 1.08
    const dx = x1 - x0
    const dy = y1 - y0
    const d = Math.hypot(dx, dy) || 1
    const nx = -dy / d
    const ny = dx / d
    const bx = (dx / d) * 4
    const by = (dy / d) * 4
    g.moveTo(x0 + nx * w0, y0 + ny * w0)
      .lineTo(x1 + nx * w1, y1 + ny * w1)
      .quadraticCurveTo(x1 + bx, y1 + by, x1 - nx * w1, y1 - ny * w1)
      .lineTo(x0 - nx * w0, y0 - ny * w0)
      .closePath()
      .fill(cylinderFill(PALMSTAM[i % 2], { axis: 'y', dark: 0.34, highlight: 0.22 }))
    g.moveTo(x1 + nx * w1, y1 + ny * w1).quadraticCurveTo(x1 + bx, y1 + by, x1 - nx * w1, y1 - ny * w1)
    g.stroke({ width: 1.6, color: shade(PALMSTAM[1], 0.4), alpha: 0.7, cap: 'round' })
  }
  g.moveTo(-20, 5).quadraticCurveTo(0, -10, 20, 5).closePath().fill({ color: 0x6a4a2a, alpha: 0.18 })
  // Kokosnötter i kronan.
  const kg = ritning(c)
  kg.ellipse(tx, ty + 2, 15, 9).fill(shade(PALMSTAM[1], 0.2))
  for (const [kx, ky] of [[-9, 10], [8, 11], [0, 16]]) {
    kg.circle(tx + kx, ty + ky, 8.5).fill(sphereFill(KOKOS, { lightX: 0.35, lightY: 0.3, dark: 0.35 }))
  }
  // Främre blad: åt sidorna och nedåt, hängande.
  const framVinklar = [-0.35, 0.18, Math.PI + 0.35, Math.PI - 0.18, Math.PI / 2 - 1.05, Math.PI / 2 + 1.05]
  for (const a of framVinklar) {
    const fc = dekor(c, tx, ty)
    palmblad(ritning(fc), a + rnd(-0.08, 0.08), len * rnd(0.9, 1.08), valj(PALMBLAD))
    svaj.push(svajar(fc, rnd(0.035, 0.06), rnd(0.8, 1.3)))
  }
  return { svaj }
}

// Ett fjäderblad från (0, 0): en mittnerv som bågnar upp och hänger ned mot spetsen, småblad på
// båda sidor som böjer sig bakåt och nedåt.
function palmblad(g, ang, len, farg) {
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  const sida = Math.abs(dx)
  const ex = dx * len
  const ey = dy * len + len * 0.45 * (0.35 + 0.65 * sida)
  const cx = dx * len * 0.55
  const cy = dy * len * 0.55 - len * 0.3 * sida
  const rach = kurva(0, 0, cx, cy, ex, ey, 14)
  const ljus = tint(farg, 0.14)
  const mork = shade(farg, 0.14)
  for (let i = 2; i < 15; i++) {
    const px = rach[i * 2]
    const py = rach[i * 2 + 1]
    let tx = px - rach[i * 2 - 2]
    let ty = py - rach[i * 2 - 1]
    const d = Math.hypot(tx, ty) || 1
    tx /= d
    ty /= d
    const t = i / 14
    const bl = len * 0.3 * Math.sin(Math.PI * Math.min(0.92, t * 0.95 + 0.05)) + 5
    for (const s of [-1, 1]) {
      const nx = -ty * s
      const ny = tx * s
      let vx = nx * 0.72 + tx * 0.55
      let vy = ny * 0.72 + ty * 0.55 + 0.5
      const vd = Math.hypot(vx, vy) || 1
      vx /= vd
      vy /= vd
      spetsblad(g, px, py, Math.atan2(vx, -vy), bl, 2.6 + 2.2 * (1 - t)).fill(ny < 0 ? ljus : mork)
    }
  }
  polylinje(g, rach).stroke({ width: 3, color: tint(farg, 0.3), cap: 'round', join: 'round' })
}

// =================================================================================================
// MARK
// =================================================================================================

// ---- 15. Sand från a till b (öken eller strand), med eller utan vattenkant --------------------------

export function ritaSand(R, { a, b, kant = null, inat = 1, mark = MARK_Y, stil = 'strand' }) {
  const oken = stil === 'oken'
  const TOPP = oken ? OKEN_TOPP : STRAND_TOPP
  const BOTTEN = oken ? OKEN_BOTTEN : STRAND_BOTTEN
  const g = ritning(R)
  const harKant = Number.isFinite(kant)
  const ytter = harKant ? (inat > 0 ? a : b) : a
  const yta = mark - 3
  if (harKant) {
    g.moveTo(ytter, yta).lineTo(kant - inat * 40, yta)
      .bezierCurveTo(kant - inat * 14, yta + 1, kant + inat * 4, 560, kant + inat * 14, 600)
      .lineTo(kant + inat * 30, 900).lineTo(ytter, 900).closePath()
  } else {
    g.moveTo(a, yta).lineTo(b, yta).lineTo(b, 900).lineTo(a, 900).closePath()
  }
  g.fill(verticalFill(TOPP, BOTTEN))
  // Ytskiktet: ett ljust band överst med mjukt vågig underkant.
  const x0 = harKant ? Math.min(ytter, kant - inat * 34) : a
  const x1 = harKant ? Math.max(ytter, kant - inat * 34) : b
  const lip = []
  lip.push(x0, yta)
  lip.push(x1, yta)
  for (let x = x1; x >= x0; x -= 18) lip.push(x, yta + 9 + Math.sin(x * 0.05) * 2.5)
  g.poly(lip).fill({ color: tint(TOPP, 0.4), alpha: 0.55 })
  g.moveTo(x0, yta + 0.5).lineTo(x1, yta + 0.5).stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 })
  // Svaga lager i genomskärningen och småsten.
  const bred = Math.abs(b - a)
  for (let i = 0; i < bred / 220; i++) {
    const y = rnd(yta + 30, 730)
    const xa = rnd(x0, x1)
    const L = rnd(80, 200)
    g.moveTo(xa, y).quadraticCurveTo(xa + L / 2, y + rnd(-6, 6), xa + L, y + rnd(-3, 3))
  }
  g.stroke({ width: 2, color: shade(BOTTEN, 0.12), alpha: 0.22, cap: 'round' })
  for (let i = 0; i < bred / 70; i++) g.ellipse(rnd(x0, x1), rnd(yta + 20, 730), rnd(3, 7), rnd(2, 4)).fill({ color: valj(oken ? [0xb8865a, 0xa06a40, 0xd9a868] : [0xb8a07a, 0xa89a88, 0xd8c49a]), alpha: 0.7 })
  // Blöt sand närmast vattnet.
  if (harKant) {
    const wx = kant - inat * 70
    g.moveTo(wx, yta + 2).lineTo(kant - inat * 40, yta + 1)
      .bezierCurveTo(kant - inat * 14, yta + 2, kant + inat * 4, 560, kant + inat * 14, 600)
      .lineTo(kant + inat * 30, 900).lineTo(kant - inat * 10, 900).quadraticCurveTo(kant - inat * 30, 600, wx, yta + 2).closePath()
    g.fill({ color: oken ? 0x8a5a2a : VATSAND, alpha: oken ? 0.25 : 0.45 })
  }
  // Ytans småsaker.
  const pa = (x) => !harKant || (inat > 0 ? x < kant - 50 : x > kant + 50)
  if (oken) {
    for (let i = 0; i < bred / 120; i++) {
      const x = rnd(x0 + 10, x1 - 10)
      if (!pa(x)) continue
      g.moveTo(x - 14, yta + 5).quadraticCurveTo(x, yta + 2, x + 14, yta + 5)
    }
    g.stroke({ width: 1.5, color: shade(TOPP, 0.2), alpha: 0.45, cap: 'round' })
    for (let i = 0; i < bred / 160; i++) {
      const x = rnd(x0 + 10, x1 - 10)
      if (pa(x)) g.ellipse(x, yta + 1, rnd(3, 6), rnd(2, 3.5)).fill({ color: valj([0xb8865a, 0xa06a40, 0x9a8a78]), alpha: 0.95 })
    }
    for (let i = 0; i < bred / 280; i++) {
      const x = rnd(x0 + 20, x1 - 20)
      if (pa(x)) torrTuva(g, x, yta + 2, rnd(0.8, 1.1))
    }
    if (chans(0.6)) {
      const x = rnd(x0 + 30, x1 - 30)
      if (pa(x)) kaktusKnopp(g, x, yta + 3)
    }
  } else {
    for (let i = 0; i < bred / 140; i++) {
      const x = rnd(x0 + 10, x1 - 10)
      if (!pa(x)) continue
      if (chans(0.6)) snacka(g, x, yta + 2, rnd(0.7, 1), valj(SNACKOR))
      else spiralSnacka(g, x, yta + 1, rnd(0.6, 0.9), valj(SNACKOR))
    }
    for (let i = 0; i < bred / 300; i++) {
      const x = rnd(x0 + 20, x1 - 20)
      if (!pa(x)) continue
      const f = valj(TANG)
      g.moveTo(x - 16, yta + 2).quadraticCurveTo(x - 6, yta - 4, x, yta + 1).quadraticCurveTo(x + 8, yta + 5, x + 18, yta)
      g.stroke({ width: 3, color: f, cap: 'round' })
      g.ellipse(x - 2, yta + 1, 4, 2).fill(f)
    }
    // Fågelspår i ytskiktet.
    if (chans(0.7)) {
      let x = rnd(x0 + 30, x1 - 160)
      for (let k = 0; k < 6 && pa(x); k++) {
        const y = yta + 4 + (k % 2) * 2
        g.moveTo(x, y + 2).lineTo(x - 3, y - 1).moveTo(x, y + 2).lineTo(x, y - 2).moveTo(x, y + 2).lineTo(x + 3, y - 1)
        x += rnd(18, 24)
      }
      g.stroke({ width: 1.2, color: shade(TOPP, 0.3), alpha: 0.6, cap: 'round' })
    }
  }
  return { svaj: [] }
}

// En liten rund kaktusknopp på marken.
function kaktusKnopp(g, x, y) {
  g.ellipse(x, y - 9, 10, 11).fill(sphereFill(KAKTUS, { lightX: 0.35, lightY: 0.3, dark: 0.35 }))
  for (const dx of [-5, 0, 5]) g.moveTo(x + dx, y - 1).quadraticCurveTo(x + dx * 1.4, y - 9, x + dx * 0.4, y - 19)
  g.stroke({ width: 1.4, color: shade(KAKTUS, 0.35), alpha: 0.55 })
  for (let i = 0; i < 6; i++) {
    const a = rnd(-2.6, -0.5)
    const px = x + Math.cos(a) * 9
    const py = y - 9 + Math.sin(a) * 10
    g.moveTo(px, py).lineTo(px + Math.cos(a) * 4, py + Math.sin(a) * 4)
  }
  g.stroke({ width: 1, color: TAGG, alpha: 0.9, cap: 'round' })
  kaktusBlomma(g, x + 2, y - 19, 0.55, KAKTUSBLOMMA[1])
}

// ---- 16. Stranden: sluttningen ned i havet -------------------------------------------------------

export function ritaStrandSlant(R, { pts, bas = 900 }) {
  const g = ritning(R)
  const n = pts.length / 2
  const xa = pts[0]
  const xb = pts[(n - 1) * 2]
  g.poly([...pts, xb, bas, xa, bas]).fill(verticalFill(STRAND_TOPP, STRAND_BOTTEN))
  // Blöt sand: ett mörkare band längs ytan där vågorna når (och under vattnet).
  const blot = (yMin, djup) => {
    const ovan = []
    const under = []
    for (let i = 0; i < n; i++) {
      const y = pts[i * 2 + 1]
      if (y < yMin) continue
      ovan.push(pts[i * 2], y)
      under.push(pts[i * 2], y + djup)
    }
    if (ovan.length < 4) return null
    for (let i = under.length - 2; i >= 0; i -= 2) ovan.push(under[i], under[i + 1])
    return ovan
  }
  const b1 = blot(534, 70)
  if (b1) g.poly(b1).fill({ color: VATSAND, alpha: 0.3 })
  const b2 = blot(546, 120)
  if (b2) g.poly(b2).fill({ color: VATSAND, alpha: 0.5 })
  // Ljust ytskikt på den torra delen.
  const torr = []
  const torrU = []
  for (let i = 0; i < n; i++) {
    const y = pts[i * 2 + 1]
    if (y > 540) break
    torr.push(pts[i * 2], y)
    torrU.push(pts[i * 2], y + 9)
  }
  if (torr.length >= 4) {
    for (let i = torrU.length - 2; i >= 0; i -= 2) torr.push(torrU[i], torrU[i + 1])
    g.poly(torr).fill({ color: tint(STRAND_TOPP, 0.4), alpha: 0.5 })
  }
  // Längs ytan: glansiga blöta streck vid vattenkanten, tånglinjen, snäckor och småsten.
  const lo = Math.min(xa, xb)
  const hi = Math.max(xa, xb)
  let xVatten = null
  for (let i = 0; i < n - 1; i++) {
    const y0 = pts[i * 2 + 1]
    const y1 = pts[i * 2 + 3]
    if ((y0 - 552) * (y1 - 552) <= 0 && y0 !== y1) {
      xVatten = pts[i * 2] + ((pts[i * 2 + 2] - pts[i * 2]) * (552 - y0)) / (y1 - y0)
      break
    }
  }
  if (xVatten != null) {
    for (let i = 0; i < 16; i++) {
      const x = xVatten + rnd(-60, 60)
      if (x < lo || x > hi) continue
      const y = yVid(pts, x)
      if (chans(0.55)) g.ellipse(x, y + 1, rnd(3, 7), rnd(1.6, 3)).fill(valj(TANG))
      else g.moveTo(x - 6, y + 1).quadraticCurveTo(x, y - 3, x + 7, y + 1).stroke({ width: 2.4, color: valj(TANG), cap: 'round' })
    }
    for (let i = 0; i < 6; i++) {
      const x = xVatten + rnd(-30, 30)
      if (x < lo || x > hi) continue
      const y = yVid(pts, x)
      g.moveTo(x - 8, y + 3).lineTo(x + 8, y + 3.5).stroke({ width: 1.6, color: 0xffffff, alpha: 0.5, cap: 'round' })
    }
  }
  for (let i = 0; i < Math.max(3, (hi - lo) / 90); i++) {
    const x = rnd(lo + 10, hi - 10)
    const y = yVid(pts, x)
    const v = Math.random()
    if (v < 0.35) snacka(g, x, y + 2, rnd(0.7, 1), valj(SNACKOR))
    else if (v < 0.5) spiralSnacka(g, x, y + 1, rnd(0.6, 0.9), valj(SNACKOR))
    else g.ellipse(x, y + rnd(2, 20), rnd(3, 6), rnd(2, 3.5)).fill({ color: valj([0x9a948a, 0xb8a07a, 0x8a8278]), alpha: 0.85 })
  }
  return { svaj: [] }
}

// ---- 17. Öknen: oasen (dekor runt vattnet) -------------------------------------------------------

export function ritaOas(R, F, { x0, x1, yt = YT_Y }) {
  const svaj = []
  // Palmer på båda sidor, lutande in över vattnet — ibland en liten till.
  const p1 = ritaPalm(R, { x: x0 - rnd(55, 95), bas: MARK_Y + 2, h: rnd(300, 370), sgn: 1 })
  const p2 = ritaPalm(R, { x: x1 + rnd(55, 95), bas: MARK_Y + 2, h: rnd(270, 330), sgn: -1 })
  svaj.push(...p1.svaj, ...p2.svaj)
  if (chans(0.6)) {
    const s = chans(0.5)
    const p3 = ritaPalm(R, { x: s ? x0 - rnd(150, 190) : x1 + rnd(150, 190), bas: MARK_Y + 2, h: rnd(200, 240), sgn: s ? 1 : -1 })
    svaj.push(...p3.svaj)
  }
  // Runda stenar vid vattenkanten, halvt i vattnet.
  const g = ritning(R)
  for (const [x, r] of [[x0 + rnd(4, 18), rnd(12, 17)], [x0 - rnd(14, 30), rnd(9, 13)], [x1 - rnd(4, 18), rnd(12, 17)], [x1 + rnd(14, 30), rnd(9, 12)]]) {
    g.ellipse(x, yt + 2 - r * 0.2, r, r * 0.78).fill(sphereFill(valj(STEN), { lightX: 0.35, lightY: 0.28, dark: 0.35 }))
  }
  // Gräs på sandkanten.
  for (const [x, s] of [[x0 - rnd(20, 40), 1], [x1 + rnd(20, 40), -1], [x0 - rnd(70, 110), 1], [x1 + rnd(70, 110), -1]]) {
    const gc = dekor(R, x, MARK_Y + 1)
    const gg = ritning(gc)
    for (let i = 0; i < 9; i++) {
      const bx = rnd(-10, 10)
      const h = rnd(18, 36)
      const lut = s * rnd(-2, 14) + rnd(-6, 6)
      stra(gg, bx, 2, bx + lut * 0.3, -h * 0.6, bx + lut, -h, 3.6).fill(valj([0x6aa648, 0x5d9a3e, 0x7ab352]))
    }
    svaj.push(svajar(gc, rnd(0.03, 0.05), rnd(1, 1.5)))
  }
  // Vass vid kanterna (i vattnet).
  for (const [x, lut] of [[x0 + rnd(22, 34), 1], [x0 + rnd(46, 62), 1], [x1 - rnd(22, 34), -1], [x1 - rnd(46, 62), -1]]) {
    const v = ritaVass(R, x, yt + 40, rnd(430, 480), lut)
    svaj.push(svajar(v, rnd(0.02, 0.035), rnd(0.8, 1.3)))
  }
  // Förgrunden: ett par strån vid kanterna, ovanpå allt.
  if (F) {
    for (const [x, s] of [[x0 - rnd(4, 18), 1], [x1 + rnd(4, 18), -1]]) {
      const fc = dekor(F, x, 760)
      const fg = ritning(fc)
      for (let i = 0; i < 4; i++) {
        const bx = rnd(-14, 14)
        const topp = rnd(470, 540) - 760
        const lut = s * rnd(4, 30)
        stra(fg, bx, 0, bx + lut * 0.3 - s * 6, topp / 2, bx + lut, topp, 8).fill(valj([0x3f7a3a, 0x4d8a3f, 0x437f3a]))
      }
      svaj.push(svajar(fc, rnd(0.018, 0.03), rnd(0.7, 1.1)))
    }
  }
  return { svaj }
}

// Vass (dekor): två blad, en stjälk och en brun kolv. Vridpunkten vid foten.
function ritaVass(parent, x, yBas, topp, lut) {
  const c = dekor(parent, x, yBas)
  const g = ritning(c)
  const hgt = yBas - topp
  const t = -hgt
  const gron = valj([0x5d9a3e, 0x6aa648, 0x548f38])
  const l = lut * rnd(4, 12)
  g.moveTo(-2, 0).quadraticCurveTo(-10 + l * 0.3, -hgt * 0.5, -18 + l, -hgt * 0.8).quadraticCurveTo(-4, -hgt * 0.45, 3, 0).closePath().fill(gron)
  g.moveTo(1, 0).quadraticCurveTo(12, -hgt * 0.4, 20 + l * 0.5, -hgt * 0.62).quadraticCurveTo(8, -hgt * 0.36, 4, 0).closePath().fill(shade(gron, 0.14))
  g.moveTo(0, 0).quadraticCurveTo(2.5, -hgt * 0.5, 0, t + 16).stroke({ width: 4, color: 0x7a9a48, cap: 'round' })
  g.roundRect(-6.5, t + 14, 13, 44, 6.5).fill(cylinderFill(0x6b4428, { axis: 'y', dark: 0.35, highlight: 0.25 }))
  g.moveTo(0, t + 15).lineTo(0.5, t).stroke({ width: 2.2, color: 0x9a7a4a, cap: 'round' })
  return c
}

// ---- Öknen utan vatten (ägaren 2026-09-25: "enbart land") -----------------------------------------

// Palmlunden där kören sitter (i stället för oasen): palmer på båda sidor, torra tuvor, en buske
// och några rundade stenar i sanden. Ingenting här är vått. { x0, x1 } = körens plats på marken.
export function ritaPalmlund(R, F, { x0, x1, mark = MARK_Y }) {
  const svaj = []
  const bas = mark + 2
  const p1 = ritaPalm(R, { x: x0 - rnd(20, 50), bas, h: rnd(300, 360), sgn: 1 })
  const p2 = ritaPalm(R, { x: x1 + rnd(20, 50), bas, h: rnd(260, 320), sgn: -1 })
  svaj.push(...p1.svaj, ...p2.svaj)
  if (chans(0.6)) {
    const s = chans(0.5)
    const p3 = ritaPalm(R, { x: s ? x0 - rnd(120, 160) : x1 + rnd(120, 160), bas, h: rnd(200, 240), sgn: s ? 1 : -1 })
    svaj.push(...p3.svaj)
  }
  const g = ritning(R)
  // Rundade stenar som ligger i sanden mellan palmerna.
  for (const [x, r] of [[x0 + rnd(30, 60), rnd(12, 17)], [x0 + rnd(80, 110), rnd(8, 11)], [x1 - rnd(30, 60), rnd(12, 16)]]) {
    g.ellipse(x, bas - r * 0.45, r, r * 0.72).fill(sphereFill(valj(STEN), { lightX: 0.35, lightY: 0.28, dark: 0.35 }))
  }
  torrTuva(g, (x0 + x1) / 2 + rnd(-60, -20), bas, 1.2)
  torrTuva(g, (x0 + x1) / 2 + rnd(30, 70), bas, 0.9)
  torrBuske(g, x1 - rnd(90, 120), bas)
  return { svaj }
}

// Kören i öknen: en platt sandstenshäll i förgrunden. Ovansidan kring y 0 (där ungarna står),
// framsidan ned förbi bildkanten, med skikten i stenen och några sprickor.
export function ritaKorSten(g, w = 236) {
  const hw = w / 2 + 8
  const [A, B, C] = SANDSTEN
  // Skugga i sanden bakom hällen.
  g.ellipse(0, -4, hw + 22, 18).fill({ color: 0x6a4a2a, alpha: 0.14 })
  // Framsidan: lite bredare nedåt, rundade övre hörn.
  g.moveTo(-hw, 4)
    .quadraticCurveTo(-hw - 2, 30, -hw - 12, 110)
    .lineTo(hw + 14, 110)
    .quadraticCurveTo(hw + 2, 30, hw, 4)
    .closePath()
    .fill(topLightFill(B, { highlight: 0.18, dark: 0.35 }))
  // Skikten: vågiga ljusare och mörkare band tvärs över framsidan.
  for (const [y, f] of [[22, tint(C, 0.2)], [40, shade(B, 0.12)], [62, tint(A, 0.15)], [86, shade(B, 0.2)]]) {
    g.moveTo(-hw - 4, y)
    for (let x = -hw; x <= hw; x += 24) g.lineTo(x, y + Math.sin(x * 0.06 + y) * 2.5)
    g.stroke({ width: 5, color: f, alpha: 0.55, cap: 'round' })
  }
  // Ovansidan (hällen sedd lite ovanifrån) med en ljus kant.
  g.ellipse(0, 3, hw, 13).fill(verticalFill(tint(C, 0.35), C))
  g.moveTo(-hw + 6, 3).quadraticCurveTo(0, 17, hw - 6, 3).stroke({ width: 2, color: tint(C, 0.5), alpha: 0.7, cap: 'round' })
  // Sprickor och småsten.
  g.moveTo(-hw * 0.4, 16).lineTo(-hw * 0.36, 34).lineTo(-hw * 0.44, 52).stroke({ width: 2, color: shade(B, 0.4), alpha: 0.55, cap: 'round' })
  g.moveTo(hw * 0.55, 12).lineTo(hw * 0.5, 30).stroke({ width: 1.8, color: shade(B, 0.4), alpha: 0.5, cap: 'round' })
  for (const [x, y, r] of [[-hw * 0.7, 1, 3], [hw * 0.72, 4, 2.4], [hw * 0.2, 7, 2]]) g.circle(x, y, r).fill({ color: shade(C, 0.25), alpha: 0.7 })
  // Konturen.
  g.moveTo(-hw, 4).quadraticCurveTo(-hw - 2, 30, -hw - 12, 110).stroke({ width: 2, color: shade(B, 0.45), alpha: 0.5 })
  g.moveTo(hw, 4).quadraticCurveTo(hw + 2, 30, hw + 14, 110).stroke({ width: 2, color: shade(B, 0.45), alpha: 0.5 })
}
