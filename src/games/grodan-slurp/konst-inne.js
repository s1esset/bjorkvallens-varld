// konst-inne.js — L7:s inomhuskonst för Grodan Slurp: KÖK · VARDAGSRUM · BADRUM, sett i grodans
// skala (allt är jättestort). Bara RITFUNKTIONER: ramverket i dammen.js äger kropparna och
// layouten och anropar det här (ritkontraktet i docs/games/grodan-slurp.md §4i).
//
// Varje funktion ritar i en given Container och returnerar
//   { svaj: [{ nod, amp, w, fas }], uppdatera?: (T, dt) => void }
// `svaj` = noder som ramverket vaggar (rotation = amp·sin(T·w + fas) + …) — alltid en EGEN
// barnnod med grundrotation 0, aldrig en gren-container (den bär grenens lutning). `uppdatera`
// skriver bara transform/alfa på noder som skapats här och tål att de är förstörda.
//
// Regler som bryter bilden eller sviten tyst (CLAUDE.md "Tysta fällor"):
//  - gradienthjälparna (sphereFill, cylinderFill, topLightFill, verticalFill, verticalFillAlpha)
//    får bara FASTA palettfärger — cachen växer per färg. Slumpen väljer VILKEN palettfärg.
//    (shade/tint av en palettfärg med ett fast tal är också en fast färg.)
//  - aldrig Graphics-metoden arc — bågar som polylinjer (ellipsBage), ellipse, circle, kurvor
//  - aldrig generateTexture / new FillGradient, inga tweens, timers eller ticker
//  - alla containrar eventMode 'none' (spelet äger all input)
//  - mönster (kakel, tapet, parkett) = få Graphics med många former och EN fill/stroke
import { Container, Graphics } from 'pixi.js'
import { sphereFill, cylinderFill, topLightFill, verticalFill, verticalFillAlpha } from '../../lib/form.js'
import { shade, tint } from '../../lib/theme.js'
import { lerpColor } from '../../lib/scene.js'

const TAU = Math.PI * 2
const MARK_Y = 528
const YT_Y = 560

// ---- småverktyg ---------------------------------------------------------------------------

const rnd = (a, b) => a + Math.random() * (b - a)
const rint = (a, b) => Math.floor(rnd(a, b + 1))
const valj = (arr) => arr[(Math.random() * arr.length) | 0]
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const tal = (v, d) => (Number.isFinite(v) ? v : d)

function blanda(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Dekor-container: aldrig ett träffmål.
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

// En nod som vajar: egen container med grundrotation 0 (ramverket skriver rotationen).
function vajNod(parent, x, y, svaj, amp, w = rnd(1, 1.7)) {
  const c = dekor(parent, x, y)
  svaj.push({ nod: c, amp, w, fas: rnd(0, TAU) })
  return c
}

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

// Brett hjärtformat blad (monstera, rankor): basen i (x, y), spetsen `len` bort i riktning `ang`.
function hjartblad(g, x, y, ang, len, bred) {
  const dx = Math.sin(ang)
  const dy = -Math.cos(ang)
  const px = Math.cos(ang)
  const py = Math.sin(ang)
  const P = (a, b) => [x + dx * a + px * b, y + dy * a + py * b]
  const [tx, ty] = P(len, 0)
  return g
    .moveTo(x, y)
    .bezierCurveTo(...P(-len * 0.22, -bred), ...P(len * 0.62, -bred * 1.15), tx, ty)
    .bezierCurveTo(...P(len * 0.62, bred * 1.15), ...P(-len * 0.22, bred), x, y)
    .closePath()
}

// Punkter längs en ellipsbåge — bågar ritas som polygoner, aldrig med arc-metoden.
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

// En spiral (handduksrulle, snäcka, toarulle) som polylinje.
function spiral(g, cx, cy, r, varv = 2.2, a0 = 0) {
  const n = Math.round(varv * 18)
  g.moveTo(cx + Math.cos(a0) * r * 0.12, cy + Math.sin(a0) * r * 0.12)
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const a = a0 + t * varv * TAU
    const rr = r * (0.12 + 0.88 * t)
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  return g
}

const kontur = (farg, w = 2, a = 0.55) => ({ width: w, color: shade(farg, 0.5), alpha: a, join: 'round', cap: 'round' })
const skugga = (g, x, y, rx, a = 0.2) => g.ellipse(x, y, rx, Math.max(2.5, rx * 0.09)).fill({ color: 0x2a1a0a, alpha: a })

// En gren-container: rotation = grenens lutning, scale.x = sidan. Lokalt: x −L/2 (vid stammen)
// … +L/2 (spetsen), ovansidan på y −h.
function grenVy(parent, gr, sgn) {
  const c = dekor(parent, tal(gr.bx, 0), tal(gr.by, 0))
  c.rotation = tal(gr.rot, 0)
  c.scale.x = sgn < 0 ? -1 : 1
  return c
}

// Världens läge för en punkt (lx, ly) i en gren-containers lokala rum.
function grenTillVarld(gr, sgn, lx, ly) {
  const r = tal(gr.rot, 0)
  const c = Math.cos(r)
  const s = Math.sin(r)
  const x = (sgn < 0 ? -1 : 1) * lx
  return { x: tal(gr.bx, 0) + c * x - s * ly, y: tal(gr.by, 0) + s * x + c * ly }
}

// ---- paletter (FASTA färger — det är bara de som får gå in i en gradient) -------------------

const EK = 0xd9a466
const EK_MORK = 0xa46b3a
const VALNOT = 0x8a5a34
const TERRAKOTTA = 0xc9683f
const KROM = 0xc6d1db
const STAL = 0xb4c2cf
const EMALJ = 0xf6fafb
const TURKOS = 0x3fb8b0
const MASSING = 0xe0b04a

// Kök
const SKAP = 0x93c9b4
const BANK = 0xdba468
const SYLT = [0xc8324a, 0xf0922a, 0x7b3f8c]
const LOCK = [0xe0463a, 0x4a90d9, 0xf2b33d]
const KRYDDA = [0xd9702b, 0x6e9a3a, 0xe8c25a, 0xa0522d]
const GRYTA = [0xe0503c, 0x3f8fd0, 0xf2b33d]
const KOPP = [0x5aa8d8, 0xf28c8c, 0x8fd08a, 0xf5d36a]
const BASILIKA = [0x4f9e3a, 0x63b04a, 0x3f8a32]
const KRUKA = 0xf1e3c6
const KRUKA_BLA = 0x3f78b8

// Vardagsrum
const HYLLA_VR = 0xc28b55
const BOCKER = [0xd9534f, 0x4a90d9, 0xf2c14e, 0x5cb85c, 0x9b59b6, 0xf28c38, 0x3fb8af, 0xe97aa8, 0x2f5d8a]
const BIL = [0xe8453c, 0x3f8fd0, 0xf2b33d]
const RAM = [0xd9a44a, 0x8a5a34, 0xf4efe6]
const MATTA = [0xe8604c, 0xf3c24f, 0x4aa3c8, 0xfdf3e1, 0x6cbf84]
const PARKETT = 0xd9a266
const PANEL = 0xa8703f
const KRUKA_VR = [0x3f78b8, 0xe8845a, 0xf2efe6]
const LAMPSKARM = 0xf6e3b4
const LJUS = 0xfff1b8

// Badrum
const HANDDUK = [0xff9eb5, 0x7fd0ea, 0xfff0a8, 0x9adf9a, 0xc5a8f0]
const FLASKA = [0x4ab3e8, 0xff7aa2, 0x8ad16a, 0xffb347, 0xb58ae8]
const TVAL = [0xffc2d6, 0xc9f0d8, 0xfff2b0]
const ANKA = 0xffd23f
const NABB = 0xff8a2a
const KAKEL_VIT = 0xf4fbfb
const KAKEL_TURKOS = 0x7fd6d0
const MATTA_BAD = 0xffb3c7

// Väggarna (R) — topp och botten i toningen.
const VAGG = {
  kok: [0xfdeccf, 0xf7d3aa],
  vardagsrum: [0xdcecdd, 0xc5dccb],
  badrum: [0xe8f9f7, 0xc6ebe7],
}

// Fjärran: dämpat mot väggens ton, så det läser som LÅNGT BORT. Räknas en gång vid laddning ur
// fasta färger — alltså en fast palett, inte en blandning per anrop.
const DAMP = 0.5
const d = (stil, c, t = DAMP) => lerpColor(c, VAGG[stil][1], t)

// =============================================================================================
// FÖREMÅL PÅ HYLLPLAN — basen i (x, y), y = hyllplanets ovansida (lokalt −13). Returnerar bredd.
// =============================================================================================

function syltburk(g, x, y) {
  const farg = valj(SYLT)
  const lock = valj(LOCK)
  const w = rint(42, 50)
  const h = rint(52, 64)
  skugga(g, x, y, w * 0.56)
  g.roundRect(x - w / 2, y - h, w, h, 9).fill(cylinderFill(farg, { axis: 'y', dark: 0.38, highlight: 0.2 }))
  g.roundRect(x - w / 2 + 3, y - h + 3, w - 6, 8, 4).fill({ color: 0xffffff, alpha: 0.38 })
  // Etikett med två bär.
  const ly = y - h * 0.6
  g.roundRect(x - w / 2 + 5, ly, w - 10, h * 0.34, 4).fill(0xfff6e2).stroke({ width: 1.2, color: 0xd8c8a8 })
  const fy = ly + h * 0.19
  g.circle(x - 3.5, fy + 1, 5).fill(farg)
  g.circle(x + 3.5, fy + 1, 5).fill(farg)
  spetsblad(g, x, fy - 3, 0.5, 8, 2.8).fill(0x5aa845)
  g.roundRect(x - w / 2 + 5, y - h + 13, 4.5, h - 20, 2.2).fill({ color: 0xffffff, alpha: 0.5 })
  // Tyglocket: rutigt tyg med rynkad kant och ett snöre.
  const ty = y - h - 5
  for (let i = 0; i <= 5; i++) g.circle(x - w / 2 - 1 + (i * (w + 2)) / 5, ty + 8, 4.4)
  g.fill(lock)
  g.roundRect(x - w / 2 - 4, ty - 6, w + 8, 14, 5).fill(topLightFill(lock, { highlight: 0.25, dark: 0.25 }))
  const ruta = (w + 8) / 6
  for (let i = 0; i < 6; i += 2) g.rect(x - w / 2 - 4 + i * ruta, ty - 5, ruta, 5)
  for (let i = 1; i < 6; i += 2) g.rect(x - w / 2 - 4 + i * ruta, ty + 1, ruta, 5)
  g.fill({ color: 0xffffff, alpha: 0.55 })
  g.roundRect(x - w / 2 - 1, ty + 6, w + 2, 3, 1.5).fill(0xf6ecd0)
  return w
}

function kryddburk(g, x, y) {
  const farg = valj(KRYDDA)
  const w = 22
  const h = rint(38, 46)
  skugga(g, x, y, 13)
  g.roundRect(x - w / 2, y - h + 8, w, h - 8, 5).fill(cylinderFill(0xe4eef0, { axis: 'y', dark: 0.2, highlight: 0.3 }))
  g.roundRect(x - w / 2 + 2, y - h * 0.72, w - 4, h * 0.72 - 2, 4).fill(cylinderFill(farg, { axis: 'y', dark: 0.32, highlight: 0.2 }))
  g.roundRect(x - w / 2 - 1, y - h, w + 2, 11, 3).fill(cylinderFill(0x3a3f47, { axis: 'y', dark: 0.3, highlight: 0.35 }))
  g.roundRect(x - w / 2 + 3, y - h + 14, 3, h - 20, 1.5).fill({ color: 0xffffff, alpha: 0.55 })
  return w
}

function gryta(g, x, y) {
  const farg = valj(GRYTA)
  const w = 84
  const h = 44
  skugga(g, x, y, w * 0.55)
  g.roundRect(x - w / 2 - 12, y - h + 8, 18, 9, 4.5).fill(shade(farg, 0.3))
  g.roundRect(x + w / 2 - 6, y - h + 8, 18, 9, 4.5).fill(shade(farg, 0.3))
  g.roundRect(x - w / 2, y - h, w, h, 12).fill(cylinderFill(farg, { axis: 'y', dark: 0.36, highlight: 0.24 }))
  for (const [dx, dy] of [[-24, -18], [-10, -30], [14, -14], [27, -28], [2, -8]]) g.circle(x + dx, y + dy, 2.6)
  g.fill({ color: 0xffffff, alpha: 0.7 })
  g.roundRect(x - w / 2 - 2, y - h - 3, w + 4, 8, 4).fill(0xf4f1ea)
  g.poly(ellipsBage(x, y - h - 2, w / 2 - 5, 17, Math.PI, TAU, 22)).fill(sphereFill(farg, { lightY: 0.15, dark: 0.3 }))
  g.roundRect(x - 7, y - h - 26, 14, 9, 4).fill(0x3a3f47)
  g.ellipse(x - 12, y - h - 11, 9, 3).fill({ color: 0xffffff, alpha: 0.45 })
  return w + 20
}

function kopp(g, x, y) {
  const farg = valj(KOPP)
  const w = 34
  const h = 38
  skugga(g, x, y, 20)
  g.moveTo(x + w / 2 - 3, y - h + 9).bezierCurveTo(x + w / 2 + 16, y - h + 5, x + w / 2 + 16, y - 7, x + w / 2 - 3, y - 10)
    .stroke({ width: 6.5, color: shade(farg, 0.14), cap: 'round' })
  g.roundRect(x - w / 2, y - h, w, h, 8).fill(cylinderFill(farg, { axis: 'y', dark: 0.3, highlight: 0.3 }))
  g.ellipse(x, y - h + 1, w / 2 - 1, 3.5).fill(shade(farg, 0.45))
  // Ett hjärta på koppen.
  const hy = y - h * 0.5
  g.circle(x - 3.2, hy - 2, 4).fill(0xffffff)
  g.circle(x + 3.2, hy - 2, 4).fill(0xffffff)
  g.poly([x - 7, hy - 1, x + 7, hy - 1, x, hy + 7]).fill(0xffffff)
  return w + 12
}

// Basilika i en terrakottakruka — plantan vajar.
function basilika(c, x, y, svaj) {
  const g = ritning(c)
  skugga(g, x, y, 24)
  g.poly([x - 22, y - 38, x + 22, y - 38, x + 17, y, x - 17, y]).fill(topLightFill(TERRAKOTTA, { highlight: 0.18, dark: 0.3 }))
  g.roundRect(x - 26, y - 47, 52, 12, 3).fill(topLightFill(TERRAKOTTA, { highlight: 0.3, dark: 0.18 }))
  g.ellipse(x, y - 46, 21, 3.5).fill(0x5a3a22)
  const p = vajNod(c, x, y - 46, svaj, 0.05, rnd(1.1, 1.6))
  const pg = ritning(p)
  const stj = [-0.5, -0.2, 0.08, 0.34, 0.6].map((a) => ({ a, len: rnd(40, 62) }))
  for (const s of stj) {
    const ex = Math.sin(s.a) * s.len
    const ey = -Math.cos(s.a) * s.len
    pg.moveTo(0, 0).quadraticCurveTo(ex * 0.3, ey * 0.6, ex, ey)
  }
  pg.stroke({ width: 3, color: 0x4a7a2a, cap: 'round' })
  for (const s of stj) {
    for (const t of [0.5, 0.78]) {
      const px = Math.sin(s.a) * s.len * t
      const py = -Math.cos(s.a) * s.len * t
      for (const sid of [-1, 1]) {
        const f = valj(BASILIKA)
        spetsblad(pg, px, py, s.a + sid * 1.05, rnd(15, 19), 8).fill(f)
      }
    }
    const ex = Math.sin(s.a) * s.len
    const ey = -Math.cos(s.a) * s.len
    for (const da of [-0.5, 0, 0.5]) spetsblad(pg, ex, ey, s.a + da, rnd(13, 17), 7).fill(valj(BASILIKA))
  }
  // Nerver + ljus kant — bladen läser som basilika och inte som gräs.
  for (const s of stj) {
    const ex = Math.sin(s.a) * s.len
    const ey = -Math.cos(s.a) * s.len
    pg.moveTo(ex, ey).lineTo(ex + Math.sin(s.a) * 10, ey - Math.cos(s.a) * 10)
  }
  pg.stroke({ width: 1.2, color: 0xb8e07a, alpha: 0.7, cap: 'round' })
  return 54
}

// Böcker (vänsterkant x, bas y).
function bok(g, x, y, w, h, farg) {
  g.roundRect(x, y - h, w, h, 2.5).fill(cylinderFill(farg, { axis: 'y', dark: 0.32, highlight: 0.16 }))
  g.rect(x + 1.5, y - h + 6, w - 3, 2.5).fill({ color: 0xfff3c4, alpha: 0.8 })
  g.rect(x + 1.5, y - 11, w - 3, 2.5).fill({ color: 0xfff3c4, alpha: 0.8 })
  if (w > 15) g.roundRect(x + 3.5, y - h * 0.64, w - 7, h * 0.22, 1.5).fill({ color: 0xffffff, alpha: 0.42 })
  g.roundRect(x, y - h, w, h, 2.5).stroke({ width: 1.2, color: shade(farg, 0.5), alpha: 0.6 })
}

// En rad böcker från x0 (vid gaveln) utåt, med en lutande bok sist. Returnerar slutet.
function bokrad(c, g, x0, y, maxX) {
  let x = x0
  let forra = -1
  let hl = 0
  const n = rint(4, 8)
  for (let i = 0; i < n; i++) {
    const w = rint(13, 24)
    const h = rint(52, 86)
    if (x + w > maxX - 30) break
    let k = rint(0, BOCKER.length - 1)
    if (k === forra) k = (k + 1) % BOCKER.length
    forra = k
    bok(g, x, y, w, h, BOCKER[k])
    x += w + (Math.random() < 0.3 ? 2 : 0)
    hl = h
  }
  // Den lutande boken vilar mot den sista stående: vridpunkten i dess nedre VÄNSTRA hörn.
  if (hl && x < maxX - 30) {
    const w = rint(14, 20)
    const h = rint(60, 80)
    const th = 0.32
    const xp = x + Math.min(hl * Math.tan(th), h * Math.sin(th)) + 1
    const lc = dekor(c, xp, y)
    lc.rotation = -th
    let k = rint(0, BOCKER.length - 1)
    if (k === forra) k = (k + 1) % BOCKER.length
    bok(ritning(lc), 0, 0, w, h, BOCKER[k])
    x = xp + w * Math.cos(th) + 4
  }
  return x
}

// En liggande trave böcker.
function boktrave(g, x, y, n = 2) {
  let yy = y
  const w0 = rint(66, 80)
  for (let i = 0; i < n; i++) {
    const w = w0 - i * rint(4, 10)
    const h = rint(11, 15)
    const farg = valj(BOCKER)
    const xx = x - w / 2 + rnd(-4, 4)
    g.roundRect(xx, yy - h, w, h, 2).fill(topLightFill(farg, { highlight: 0.2, dark: 0.3 }))
    g.rect(xx + 5, yy - h + 2, 2, h - 4).fill({ color: 0xfff3c4, alpha: 0.75 })
    g.rect(xx + w - 7, yy - h + 2, 2, h - 4).fill({ color: 0xfff3c4, alpha: 0.75 })
    g.roundRect(xx, yy - h, w, h, 2).stroke({ width: 1.1, color: shade(farg, 0.5), alpha: 0.6 })
    yy -= h
  }
  return yy
}

function leksaksbil(g, x, y) {
  const farg = valj(BIL)
  skugga(g, x, y, 34)
  // Kaross + hytt.
  g.moveTo(x - 20, y - 22).quadraticCurveTo(x - 15, y - 42, x + 1, y - 42).lineTo(x + 8, y - 42)
    .quadraticCurveTo(x + 20, y - 40, x + 24, y - 22).closePath().fill(topLightFill(farg, { highlight: 0.3, dark: 0.2 }))
  g.roundRect(x - 34, y - 26, 68, 18, 8).fill(topLightFill(farg, { highlight: 0.25, dark: 0.3 }))
  g.moveTo(x - 14, y - 24).quadraticCurveTo(x - 11, y - 37, x - 1, y - 37).lineTo(x - 1, y - 24).closePath()
  g.moveTo(x + 3, y - 24).lineTo(x + 3, y - 37).lineTo(x + 8, y - 37).quadraticCurveTo(x + 16, y - 36, x + 19, y - 24).closePath()
  g.fill(0xcdefff)
  g.moveTo(x - 10, y - 33).lineTo(x - 6, y - 35).stroke({ width: 2, color: 0xffffff, alpha: 0.9, cap: 'round' })
  g.circle(x + 31, y - 20, 3.5).fill(0xfff2a8)
  g.roundRect(x - 36, y - 13, 10, 5, 2).fill(0xdfe5ea)
  g.roundRect(x + 26, y - 13, 10, 5, 2).fill(0xdfe5ea)
  for (const hx of [-19, 19]) {
    g.circle(x + hx, y - 8, 9).fill(sphereFill(0x33363d, { lightY: 0.3 }))
    g.circle(x + hx, y - 8, 3.5).fill(0xd8dee4)
  }
  g.roundRect(x - 34, y - 26, 68, 18, 8).stroke({ width: 1.2, color: shade(farg, 0.5), alpha: 0.5 })
  return 74
}

// En fotoram på fot (ett landskap eller en groda — aldrig en människa).
function fotoram(g, x, y) {
  const ram = valj(RAM)
  const w = 56
  const h = 70
  skugga(g, x + 6, y, 32)
  g.moveTo(x + 10, y - h * 0.5).lineTo(x + 22, y).stroke({ width: 4, color: shade(ram, 0.3), cap: 'round' })
  g.roundRect(x - w / 2, y - h, w, h, 4).fill(topLightFill(ram, { highlight: 0.35, dark: 0.3 }))
  const ix = x - w / 2 + 7
  const iy = y - h + 7
  const iw = w - 14
  const ih = h - 14
  if (Math.random() < 0.5) {
    g.rect(ix, iy, iw, ih).fill(verticalFill(0x9fd3ef, 0xe8f6fb))
    g.circle(ix + iw * 0.72, iy + ih * 0.28, 5.5).fill(0xffd35c)
    g.moveTo(ix, iy + ih * 0.7).quadraticCurveTo(ix + iw * 0.4, iy + ih * 0.46, ix + iw, iy + ih * 0.66).lineTo(ix + iw, iy + ih).lineTo(ix, iy + ih).closePath().fill(0x7cbf5a)
    g.moveTo(ix + iw * 0.3, iy + ih * 0.62).lineTo(ix + iw * 0.3, iy + ih * 0.44).stroke({ width: 2, color: 0x7a5236 })
    g.circle(ix + iw * 0.3, iy + ih * 0.4, 6).fill(0x4f9e3a)
  } else {
    // Ett grodporträtt.
    g.rect(ix, iy, iw, ih).fill(verticalFill(0xfff1d6, 0xf6d9ae))
    const fx = ix + iw / 2
    const fy = iy + ih * 0.6
    g.ellipse(fx, fy, 15, 12).fill(0x6cbf4a)
    g.circle(fx - 8, fy - 11, 6).fill(0x6cbf4a)
    g.circle(fx + 8, fy - 11, 6).fill(0x6cbf4a)
    g.circle(fx - 8, fy - 12, 3.6).fill(0xffffff)
    g.circle(fx + 8, fy - 12, 3.6).fill(0xffffff)
    g.circle(fx - 7.5, fy - 12, 1.8).fill(0x1e2a1e)
    g.circle(fx + 8.5, fy - 12, 1.8).fill(0x1e2a1e)
    g.moveTo(fx - 7, fy + 2).quadraticCurveTo(fx, fy + 7, fx + 7, fy + 2).stroke({ width: 1.6, color: 0x2f5a22, cap: 'round' })
  }
  g.roundRect(x - w / 2, y - h, w, h, 4).stroke({ width: 1.4, color: shade(ram, 0.55), alpha: 0.6 })
  g.rect(ix, iy, iw, ih).stroke({ width: 1.2, color: shade(ram, 0.45), alpha: 0.6 })
  return w + 14
}

// Hängväxt: en kruka på hyllan och rankor som hänger ned framför planet (vajar).
function hangvaxt(c, x, y, svaj) {
  const g = ritning(c)
  const farg = valj(KRUKA_VR)
  skugga(g, x, y, 22)
  g.roundRect(x - 20, y - 34, 40, 34, 9).fill(cylinderFill(farg, { axis: 'y', dark: 0.3, highlight: 0.3 }))
  g.roundRect(x - 23, y - 38, 46, 9, 4).fill(topLightFill(farg, { highlight: 0.3, dark: 0.2 }))
  g.ellipse(x, y - 37, 19, 3).fill(0x5a3a22)
  // Lite blad på toppen.
  const topp = ritning(c)
  for (const a of [-0.9, -0.4, 0.1, 0.6]) spetsblad(topp, x + a * 10, y - 37, a, rnd(14, 18), 7).fill(valj(BASILIKA))
  // Rankorna — var sin vajande nod, fäst vid krukans framkant.
  const nr = rint(2, 3)
  for (let i = 0; i < nr; i++) {
    const r = vajNod(c, x + 12 - i * 10, y - 34, svaj, rnd(0.04, 0.07), rnd(0.8, 1.3))
    const rg = ritning(r)
    const len = rnd(110, 170)
    const ut = 18 + i * 6
    const pts = []
    for (let k = 0; k <= 14; k++) {
      const t = k / 14
      const px = t < 0.2 ? (ut * t) / 0.2 : ut + Math.sin(t * 5 + i) * 5
      const py = t < 0.2 ? -8 * Math.sin((t / 0.2) * Math.PI) : (len * (t - 0.2)) / 0.8 + 30 * (t - 0.2)
      pts.push(px, py)
    }
    polylinje(rg, pts).stroke({ width: 2.4, color: 0x4a7a2a, cap: 'round', join: 'round' })
    for (let k = 3; k < pts.length / 2; k += 2) {
      const px = pts[k * 2]
      const py = pts[k * 2 + 1]
      const sid = k % 4 === 1 ? 1 : -1
      const f = valj(BASILIKA)
      // Hjärtformat blad: två kurvor.
      const bx = px + sid * 3
      rg.moveTo(bx, py).bezierCurveTo(bx + sid * 14, py - 8, bx + sid * 16, py + 8, bx + sid * 5, py + 14)
        .bezierCurveTo(bx + sid * 1, py + 8, bx - sid * 2, py + 4, bx, py).closePath().fill(f)
    }
  }
  return 46
}

// Handduksrulle (ändan mot oss): en spiral i en rund frotté-ända.
function handdukRulle(g, x, y, r, farg) {
  g.circle(x + 3, y + 2, r).fill(shade(farg, 0.22))
  g.circle(x, y, r).fill(sphereFill(farg, { lightX: 0.35, lightY: 0.3, dark: 0.18, highlight: 0.35 }))
  spiral(g, x, y, r * 0.86, 2.3, rnd(0, TAU)).stroke({ width: 2, color: shade(farg, 0.28), alpha: 0.8, cap: 'round' })
  // Frotténs luddiga kant.
  const pts = []
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU
    pts.push(x + Math.cos(a) * (r + 1.5), y + Math.sin(a) * (r + 1.5))
  }
  for (let i = 0; i < pts.length; i += 2) g.circle(pts[i], pts[i + 1], 1.8)
  g.fill({ color: tint(farg, 0.4), alpha: 0.8 })
}

function handdukTrave(g, x, y) {
  const r = 17
  const [f1, f2, f3] = blanda(HANDDUK)
  skugga(g, x, y, 38)
  handdukRulle(g, x - r, y - r, r, f1)
  handdukRulle(g, x + r + 1, y - r, r, f2)
  handdukRulle(g, x + 1, y - r * 2.7, r, f3)
  return r * 4 + 6
}

function flaska(g, x, y) {
  const farg = valj(FLASKA)
  const w = rint(28, 34)
  const h = rint(54, 72)
  const pump = Math.random() < 0.5
  skugga(g, x, y, w * 0.6)
  g.roundRect(x - w / 2, y - h, w, h, 10).fill(cylinderFill(farg, { axis: 'y', dark: 0.3, highlight: 0.3 }))
  g.roundRect(x - w / 2 + 5, y - h * 0.62, w - 10, h * 0.34, 4).fill({ color: 0xffffff, alpha: 0.85 })
  g.circle(x - 2, y - h * 0.47, 3.4).fill({ color: farg, alpha: 0.7 })
  g.circle(x + 4, y - h * 0.42, 2.2).fill({ color: farg, alpha: 0.7 })
  g.roundRect(x - w / 2 + 4, y - h + 8, 3.5, h - 18, 1.8).fill({ color: 0xffffff, alpha: 0.5 })
  if (pump) {
    g.roundRect(x - 6, y - h - 10, 12, 12, 3).fill(0xf2f2f2)
    g.roundRect(x - 5, y - h - 20, 10, 11, 3).fill(0xe2e2e2)
    g.roundRect(x - 4, y - h - 22, 18, 6, 3).fill(0xe8e8e8)
  } else {
    g.roundRect(x - w / 2 + 3, y - h - 12, w - 6, 14, 5).fill(cylinderFill(shade(farg, 0.25), { axis: 'y', dark: 0.3, highlight: 0.25 }))
  }
  return w
}

function tandborstmugg(g, x, y) {
  const farg = valj([TURKOS, 0xffb347, 0xb58ae8])
  skugga(g, x, y, 21)
  const borst = (bx, ex, ey, f) => {
    g.moveTo(bx, y - 30).lineTo(ex, ey).stroke({ width: 5, color: f, cap: 'round' })
    const dx = ex - bx
    const dy = ey - (y - 30)
    const l = Math.hypot(dx, dy)
    const ux = dx / l
    const uy = dy / l
    g.moveTo(ex, ey).lineTo(ex + ux * 14, ey + uy * 14).stroke({ width: 7, color: f, cap: 'round' })
    g.moveTo(ex + ux * 2 - uy * 5, ey + uy * 2 + ux * 5).lineTo(ex + ux * 14 - uy * 5, ey + uy * 14 + ux * 5).stroke({ width: 5, color: 0xffffff, cap: 'round' })
  }
  borst(x - 4, x - 16, y - 72, 0xff7aa2)
  borst(x + 5, x + 14, y - 78, 0x4ab3e8)
  g.roundRect(x - 17, y - 42, 34, 42, 9).fill(cylinderFill(farg, { axis: 'y', dark: 0.3, highlight: 0.3 }))
  g.ellipse(x, y - 41, 15, 3.5).fill(shade(farg, 0.4))
  g.roundRect(x - 12, y - 36, 4, 26, 2).fill({ color: 0xffffff, alpha: 0.5 })
  return 40
}

function badanka(g, x, y) {
  skugga(g, x, y, 26)
  g.poly([x - 22, y - 20, x - 34, y - 34, x - 16, y - 28]).fill(shade(ANKA, 0.08))
  g.ellipse(x, y - 17, 25, 16).fill(sphereFill(ANKA, { lightY: 0.25, dark: 0.22 }))
  g.ellipse(x - 4, y - 18, 12, 7).fill({ color: shade(ANKA, 0.2), alpha: 0.6 })
  g.circle(x + 11, y - 38, 13).fill(sphereFill(ANKA, { lightY: 0.25, dark: 0.2 }))
  g.ellipse(x + 26, y - 35, 9, 4.5).fill(NABB)
  g.ellipse(x + 25, y - 32, 7, 2.5).fill(shade(NABB, 0.2))
  g.circle(x + 15, y - 41, 3).fill(0x1e1e24)
  g.circle(x + 16, y - 42, 1).fill(0xffffff)
  g.ellipse(x + 7, y - 33, 3.5, 2).fill({ color: 0xff8fa0, alpha: 0.5 })
  return 56
}

// Hyllplan i lokala koordinater: x −L/2 (vid stolpen) … +L/2, ovansidan −h, undersidan +h.
function ritaPlanka(g, L, farg, { tjock = 26, list = null, rund = 5, adring = true } = {}) {
  const h = tjock / 2
  const a = -L / 2 - 2
  const b = L / 2
  const w = b - a
  // Kastskugga på väggen under planet (ljuset kommer uppifrån).
  g.roundRect(a + 26, h - 4, w - 34, 18, 9).fill({ color: 0x3a2410, alpha: 0.1 })
  g.roundRect(a, -h, w, tjock, rund).fill(topLightFill(farg, { highlight: 0.2, dark: 0.32, mid: 0.35 }))
  g.roundRect(a + 3, -h + 1, w - 6, 6, 3).fill({ color: 0xffffff, alpha: 0.3 })
  if (list != null) g.roundRect(a + 1, h - 8, w - 2, 7, 3.5).fill(list)
  if (adring) {
    for (const k of [-2, 4.5]) g.moveTo(a + 32, k).bezierCurveTo(a + w * 0.35, k - 2, b - w * 0.35, k + 2.5, b - 14, k)
    g.stroke({ width: 1.3, color: shade(farg, 0.35), alpha: 0.35, cap: 'round' })
  }
  g.roundRect(b - 8, -h + 3, 5, tjock - 6, 2.5).fill({ color: shade(farg, 0.16), alpha: 0.7 })
  g.roundRect(a, -h, w, tjock, rund).stroke({ width: 2, color: shade(farg, 0.5), alpha: 0.6 })
}

// En konsol under hyllplanet, vid stolpen (x = stolpens kant).
function konsol(g, x, farg, { h = 13, lang = 50, hog = 56 } = {}) {
  g.moveTo(x, h).lineTo(x + lang, h).quadraticCurveTo(x + lang * 0.28, h + hog * 0.3, x, h + hog).closePath()
    .fill(topLightFill(farg, { highlight: 0.15, dark: 0.35 })).stroke(kontur(farg, 1.6, 0.5))
}

// Lägg ut föremål längs planet från stolpen utåt (x från −L/2 + marg), inom `andel` av längden.
// Planets yttre del lämnas FRI så grodan har plats.
function lagUt(L, saker, { marg = 34, andel = 0.42 } = {}) {
  let x = -L / 2 + marg
  const slut = -L / 2 + marg + L * andel
  for (const s of saker) {
    const w = s.w
    if (x + w > slut) continue
    s.rita(x + w / 2)
    x += w + rnd(4, 9)
  }
  return x
}

// =============================================================================================
// "TRÄD" — hyllställ där stammen är stolpen/gaveln och grenarna är hyllplanen
// =============================================================================================

// 1. KÖK: ett högt hyllställ i trä, fullt av burkar, en gryta, en kopp och en basilika.
export function ritaTradKokshylla(R, geo) {
  const { sx, sgn, bas, topp, grenar = [] } = geo
  const s = sgn < 0 ? -1 : 1
  const svaj = []
  const rot = dekor(R)
  // Vilka uppsättningar som hamnar på vilket plan: basilikan alltid på det översta.
  const satser = blanda(['burkar', 'gryta'])
  grenar.forEach((gr, i) => {
    const L = tal(gr.L, 300)
    const c = grenVy(rot, gr, s)
    const g = ritning(c)
    konsol(g, -L / 2 + 26, EK_MORK)
    ritaPlanka(g, L, EK, { list: shade(EK, 0.12) })
    const sg = ritning(c)
    const typ = i === grenar.length - 1 ? 'ort' : satser[i % 2]
    let saker
    if (typ === 'burkar') {
      saker = [
        { w: 48, rita: (x) => syltburk(sg, x, -13) },
        { w: 48, rita: (x) => syltburk(sg, x, -13) },
        { w: 22, rita: (x) => kryddburk(sg, x, -13) },
        { w: 22, rita: (x) => kryddburk(sg, x, -13) },
        { w: 48, rita: (x) => syltburk(sg, x, -13) },
      ]
    } else if (typ === 'gryta') {
      saker = [
        { w: 104, rita: (x) => gryta(sg, x, -13) },
        { w: 46, rita: (x) => kopp(sg, x - 6, -13) },
        { w: 22, rita: (x) => kryddburk(sg, x, -13) },
      ]
    } else {
      saker = [
        { w: 54, rita: (x) => basilika(c, x, -13, svaj) },
        { w: 22, rita: (x) => kryddburk(sg, x, -13) },
        { w: 46, rita: (x) => kopp(sg, x - 6, -13) },
      ]
    }
    lagUt(L, saker, { andel: L > 360 ? 0.4 : 0.46 })
  })
  // Stolpen ovanpå planen — de går in i den.
  const c = dekor(R, sx, 0)
  c.scale.x = s
  const g = ritning(c)
  const F = EK_MORK
  const y0 = topp + 50
  g.rect(-26, y0, 52, bas - 24 - y0).fill(cylinderFill(F, { axis: 'y', dark: 0.34, highlight: 0.2 }))
  for (const k of [-14, -5, 6, 15]) g.moveTo(k, y0 + 10).bezierCurveTo(k + 3, y0 + 200, k - 3, bas - 200, k * 0.8, bas - 30)
  g.stroke({ width: 1.4, color: shade(F, 0.4), alpha: 0.3, cap: 'round' })
  // Pinnhålen (där hyllplanen kan flyttas).
  for (let y = y0 + 34; y < bas - 60; y += 40) g.circle(0, y, 3.4)
  g.fill({ color: shade(F, 0.6), alpha: 0.6 })
  // Fot, krage, hals och knopp.
  g.roundRect(-46, bas - 26, 92, 30, 10).fill(topLightFill(F, { highlight: 0.2, dark: 0.35 })).stroke(kontur(F))
  g.roundRect(-31, topp + 40, 62, 14, 6).fill(topLightFill(F, { highlight: 0.25, dark: 0.3 })).stroke(kontur(F))
  g.roundRect(-14, topp + 26, 28, 18, 5).fill(cylinderFill(F, { axis: 'y', dark: 0.3, highlight: 0.2 }))
  g.circle(0, topp + 14, 19).fill(sphereFill(F, { lightY: 0.28, dark: 0.3 })).stroke(kontur(F, 1.6, 0.4))
  g.rect(-26, y0, 52, bas - 24 - y0).stroke(kontur(F, 2, 0.45))
  // Krokar på stolpens baksida med en slev och en visp som hänger och vajar.
  const krokY = []
  for (let i = 0; i + 1 < grenar.length; i++) krokY.push((tal(grenar[i].by, 0) + tal(grenar[i + 1].by, 0)) / 2 + 20)
  krokY.forEach((ky, i) => {
    g.moveTo(-24, ky).lineTo(-38, ky).quadraticCurveTo(-46, ky, -46, ky + 9).stroke({ width: 4, color: MASSING, cap: 'round' })
    g.circle(-24, ky, 4).fill(shade(MASSING, 0.2))
    const h = vajNod(c, -46, ky + 8, svaj, 0.07, rnd(1.2, 1.8))
    const hg = ritning(h)
    if (i % 2 === 0) {
      // Slev: ring, skaft, skål.
      hg.circle(0, 5, 5).stroke({ width: 2.4, color: shade(STAL, 0.2) })
      hg.roundRect(-3.5, 9, 7, 80, 3.5).fill(cylinderFill(STAL, { axis: 'y', dark: 0.3, highlight: 0.35 }))
      hg.poly(ellipsBage(0, 88, 22, 22, 0, Math.PI, 16)).fill(sphereFill(STAL, { lightY: 0.2, dark: 0.35 }))
      hg.ellipse(0, 88, 22, 5).fill(shade(STAL, 0.35))
    } else {
      // Visp: träskaft och trådöglor.
      hg.circle(0, 5, 5).stroke({ width: 2.4, color: shade(EK, 0.3) })
      hg.roundRect(-5, 9, 10, 40, 5).fill(cylinderFill(EK, { axis: 'y', dark: 0.3, highlight: 0.25 }))
      for (const rx of [4, 9, 14]) hg.ellipse(0, 78, rx, 30)
      hg.stroke({ width: 1.8, color: STAL, alpha: 0.95 })
    }
  })
  return { svaj }
}

// 2. VARDAGSRUM: en hög bokhylla (stammen = gaveln) med böcker, en leksaksbil, en fotoram och
// en hängväxt.
export function ritaTradBokhylla(R, geo) {
  const { sx, sgn, bas, topp, grenar = [] } = geo
  const s = sgn < 0 ? -1 : 1
  const svaj = []
  const rot = dekor(R)
  const extra = blanda(['ram', 'bil'])
  grenar.forEach((gr, i) => {
    const L = tal(gr.L, 300)
    const c = grenVy(rot, gr, s)
    const g = ritning(c)
    konsol(g, -L / 2 + 26, shade(HYLLA_VR, 0.1), { lang: 40, hog: 46 })
    ritaPlanka(g, L, HYLLA_VR, { list: tint(HYLLA_VR, 0.25) })
    const sg = ritning(c)
    const slut = -L / 2 + 30 + L * (L > 360 ? 0.4 : 0.46)
    const topp_ = i === grenar.length - 1
    if (topp_) {
      // Översta planet: hängväxten först, sedan en liten trave.
      hangvaxt(c, -L / 2 + 56, -13, svaj)
      if (-L / 2 + 90 + 70 < slut) boktrave(sg, -L / 2 + 124, -13, rint(2, 3))
    } else {
      const x = bokrad(c, sg, -L / 2 + 30, -13, slut)
      const e = extra[i % 2]
      if (e === 'ram' && x + 60 < slut + 30) fotoram(sg, x + 32, -13)
      else if (e === 'bil' && x + 70 < slut + 36) leksaksbil(sg, x + 40, -13)
    }
  })
  // Gaveln ovanpå planen.
  const c = dekor(R, sx, 0)
  c.scale.x = s
  const g = ritning(c)
  const F = HYLLA_VR
  const y0 = topp + 22
  g.rect(-26, y0, 52, bas - 40 - y0).fill(cylinderFill(F, { axis: 'y', dark: 0.28, highlight: 0.16 }))
  // Fräst spår längs gaveln + ådring.
  g.moveTo(-15, y0 + 14).lineTo(-15, bas - 54).moveTo(15, y0 + 14).lineTo(15, bas - 54)
  g.stroke({ width: 2, color: shade(F, 0.35), alpha: 0.5 })
  g.moveTo(-13, y0 + 14).lineTo(-13, bas - 54).moveTo(17, y0 + 14).lineTo(17, bas - 54)
  g.stroke({ width: 1, color: tint(F, 0.5), alpha: 0.5 })
  for (const k of [-6, 3]) g.moveTo(k, y0 + 20).bezierCurveTo(k + 3, y0 + 240, k - 3, bas - 240, k, bas - 60)
  g.stroke({ width: 1.2, color: shade(F, 0.35), alpha: 0.28 })
  g.rect(-26, y0, 52, bas - 40 - y0).stroke(kontur(F, 2, 0.45))
  // Sockel och krönlist.
  g.roundRect(-34, bas - 42, 68, 46, 4).fill(topLightFill(shade(F, 0.12), { highlight: 0.2, dark: 0.35 })).stroke(kontur(F))
  g.rect(-34, bas - 42, 68, 5).fill({ color: 0xffffff, alpha: 0.25 })
  g.roundRect(-30, topp + 10, 60, 14, 3).fill(topLightFill(F, { highlight: 0.25, dark: 0.3 })).stroke(kontur(F, 1.6))
  g.roundRect(-37, topp - 2, 74, 14, 4).fill(topLightFill(F, { highlight: 0.3, dark: 0.25 })).stroke(kontur(F, 1.6))
  return { svaj }
}

// 3. BADRUM: en hög vit/turkos hyllpelare med handdukar, flaskor, tandborstmugg och badanka,
// och en handduk som hänger ned från ett av planen.
export function ritaTradBadhylla(R, geo) {
  const { sx, sgn, bas, topp, grenar = [] } = geo
  const s = sgn < 0 ? -1 : 1
  const svaj = []
  const rot = dekor(R)
  const satser = blanda(['handdukar', 'flaskor'])
  const hangPlan = grenar.length > 1 ? rint(0, 1) : 0
  grenar.forEach((gr, i) => {
    const L = tal(gr.L, 300)
    const c = grenVy(rot, gr, s)
    const g = ritning(c)
    konsol(g, -L / 2 + 26, KROM, { lang: 36, hog: 40 })
    ritaPlanka(g, L, 0xf2f7f7, { list: TURKOS, adring: false, rund: 9 })
    const sg = ritning(c)
    const typ = i === grenar.length - 1 ? 'anka' : satser[i % 2]
    let saker
    if (typ === 'handdukar') {
      saker = [
        { w: 76, rita: (x) => handdukTrave(sg, x, -13) },
        { w: 34, rita: (x) => flaska(sg, x, -13) },
        { w: 40, rita: (x) => tandborstmugg(sg, x, -13) },
      ]
    } else if (typ === 'flaskor') {
      saker = [
        { w: 34, rita: (x) => flaska(sg, x, -13) },
        { w: 34, rita: (x) => flaska(sg, x, -13) },
        { w: 40, rita: (x) => tandborstmugg(sg, x, -13) },
        { w: 34, rita: (x) => flaska(sg, x, -13) },
      ]
    } else {
      saker = [
        { w: 40, rita: (x) => tandborstmugg(sg, x, -13) },
        { w: 58, rita: (x) => badanka(sg, x, -13) },
        { w: 34, rita: (x) => flaska(sg, x, -13) },
      ]
    }
    lagUt(L, saker, { andel: L > 360 ? 0.4 : 0.48 })
    // Handduken som hänger över planets framkant.
    if (i === hangPlan) {
      const hx = -L / 2 + L * rnd(0.52, 0.62)
      const farg = valj(HANDDUK)
      const hw = 46
      const hh = rnd(100, 130)
      const hc = vajNod(c, hx, -8, svaj, 0.03, rnd(0.8, 1.2))
      const hg = ritning(hc)
      hg.roundRect(-hw / 2, 0, hw, hh, 6).fill(topLightFill(farg, { highlight: 0.2, dark: 0.22 }))
      hg.rect(-hw / 2, hh - 30, hw, 7).fill({ color: 0xffffff, alpha: 0.75 })
      hg.rect(-hw / 2, hh - 19, hw, 4).fill({ color: 0xffffff, alpha: 0.75 })
      for (let k = -hw / 2 + 4; k < hw / 2; k += 6) hg.moveTo(k, hh - 1).lineTo(k + rnd(-1, 1), hh + 6)
      hg.stroke({ width: 2, color: tint(farg, 0.3), cap: 'round' })
      for (const k of [-10, 4, 14]) hg.moveTo(k, 8).quadraticCurveTo(k + 2, hh * 0.5, k - 1, hh - 34)
      hg.stroke({ width: 1.4, color: shade(farg, 0.2), alpha: 0.4, cap: 'round' })
      // Vecket ovanpå planet.
      g.roundRect(hx - hw / 2 - 2, -17, hw + 4, 9, 4).fill(tint(farg, 0.1))
    }
  })
  // Pelaren.
  const c = dekor(R, sx, 0)
  c.scale.x = s
  const g = ritning(c)
  const y0 = topp + 30
  g.roundRect(-26, y0, 52, bas - 20 - y0, 12).fill(cylinderFill(EMALJ, { axis: 'y', dark: 0.16, highlight: 0.3 }))
  for (let y = y0 + 70; y < bas - 60; y += 150) g.roundRect(-29, y, 58, 11, 5.5)
  g.fill(cylinderFill(TURKOS, { axis: 'y', dark: 0.28, highlight: 0.3 }))
  g.roundRect(-26, y0, 52, bas - 20 - y0, 12).stroke({ width: 2, color: 0x9fbfc2, alpha: 0.7 })
  g.roundRect(-12, y0 + 12, 6, bas - y0 - 50, 3).fill({ color: 0xffffff, alpha: 0.6 })
  // Fot och topp.
  g.ellipse(0, bas - 6, 46, 10).fill(shade(TURKOS, 0.3))
  g.roundRect(-44, bas - 26, 88, 22, 11).fill(topLightFill(TURKOS, { highlight: 0.3, dark: 0.25 }))
  g.poly(ellipsBage(0, topp + 34, 32, 30, Math.PI, TAU, 20)).fill(sphereFill(TURKOS, { lightY: 0.2 }))
  g.roundRect(-33, topp + 30, 66, 10, 5).fill(shade(TURKOS, 0.15))
  g.circle(0, topp + 4, 8).fill(sphereFill(EMALJ, { lightY: 0.3, dark: 0.2 }))
  return { svaj }
}

// =============================================================================================
// "STUBBAR" — ett tungmål (stammen) och två små plattformar (grenarna)
// =============================================================================================

// 4. KÖK: en stor keramikkruka med köksredskap. Stammen = en hög träslev, grenarna = en soppslevs
// skål och en stekspade som sticker ut åt sidan.
export function ritaStubbeSlevar(R, geo2) {
  const { x, topp, bas, grenar = [] } = geo2
  const svaj = []
  const rot = dekor(R)
  const bakom = ritning(rot)
  const kTopp = 440
  const kb = 80
  const typer = blanda(['slev', 'spade'])
  // En visp står snett i krukan på den sida där den lägre plattformen INTE sitter.
  const lagre = grenar.reduce((m, gr) => (m == null || tal(gr.by, 0) > tal(m.by, 0) ? gr : m), null)
  const vs = lagre && lagre.sida > 0 ? -1 : 1
  const visp = dekor(rot, x + vs * 34, kTopp + 24)
  visp.rotation = vs * 0.32
  const vg = ritning(visp)
  vg.roundRect(-7, -86, 14, 90, 7).fill(cylinderFill(0xe0503c, { axis: 'y', dark: 0.3, highlight: 0.3 }))
  for (const rx of [5, 11, 17, 22]) vg.ellipse(0, -128, rx, 44)
  vg.stroke({ width: 2.2, color: STAL, alpha: 0.95 })
  vg.roundRect(-9, -92, 18, 10, 4).fill(KROM)
  // Skaften (de går ned i krukan): ett per gren, fram till redskapets huvud.
  grenar.forEach((gr, i) => {
    const sida = gr.sida < 0 ? -1 : 1
    const L = tal(gr.L, 140)
    const inre = grenTillVarld(gr, sida, -L / 2 + 8, 0)
    const fx = x + sida * 30
    const fy = kTopp + 24
    const farg = typer[i % 2] === 'slev' ? STAL : EK
    const skaft = () => bakom.moveTo(fx, fy).quadraticCurveTo(fx + sida * 6, (fy + inre.y) / 2, inre.x, inre.y)
    skaft().stroke({ width: 20, color: shade(farg, 0.4), cap: 'round' })
    skaft().stroke({ width: 16, color: farg, cap: 'round' })
    bakom.moveTo(fx - sida * 4, fy).quadraticCurveTo(fx + sida * 2, (fy + inre.y) / 2, inre.x - sida * 4, inre.y + 2)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.35, cap: 'round' })
  })
  // Huvudsleven: ett tjockt skaft rakt upp och skålen (upp och ned) i toppen.
  const t = topp
  bakom.roundRect(x - 18, t + 104, 36, kTopp + 40 - t - 104, 16).fill(cylinderFill(EK, { axis: 'y', dark: 0.32, highlight: 0.25 }))
  bakom.roundRect(x - 18, t + 104, 36, kTopp + 40 - t - 104, 16).stroke(kontur(EK, 1.6, 0.4))
  bakom.moveTo(x - 18, t + 116).quadraticCurveTo(x - 12, t + 100, x - 20, t + 88).lineTo(x + 20, t + 88).quadraticCurveTo(x + 12, t + 100, x + 18, t + 116).closePath()
    .fill(EK)
  bakom.ellipse(x, t + 54, 46, 58).fill(sphereFill(EK, { lightX: 0.35, lightY: 0.3, dark: 0.32 })).stroke(kontur(EK, 2, 0.5))
  bakom.ellipse(x - 14, t + 36, 12, 22).fill({ color: 0xffffff, alpha: 0.28 })
  for (const k of [-8, 7]) bakom.moveTo(x + k, t + 130).lineTo(x + k * 0.8, kTopp)
  bakom.stroke({ width: 1.3, color: shade(EK, 0.35), alpha: 0.35 })
  // Krukan: gräddvit stengods med blå ränder och en målad blomma.
  const k = ritning(rot)
  skugga(k, x, bas - 2, kb + 8, 0.18)
  k.moveTo(x - kb + 8, kTopp).bezierCurveTo(x - kb - 8, kTopp + 30, x - kb - 6, bas - 30, x - kb + 12, bas - 2)
    .lineTo(x + kb - 12, bas - 2).bezierCurveTo(x + kb + 6, bas - 30, x + kb + 8, kTopp + 30, x + kb - 8, kTopp).closePath()
    .fill(cylinderFill(KRUKA, { axis: 'y', dark: 0.25, highlight: 0.2 }))
  k.rect(x - kb + 1, kTopp + 20, kb * 2 - 2, 9)
  k.rect(x - kb - 2, kTopp + 34, kb * 2 + 4, 4)
  k.rect(x - kb + 4, bas - 20, kb * 2 - 8, 5)
  k.fill({ color: KRUKA_BLA, alpha: 0.85 })
  const bx = x + 18
  const by = kTopp + 62
  for (let i = 0; i < 5; i++) k.circle(bx + Math.cos((i / 5) * TAU) * 7, by + Math.sin((i / 5) * TAU) * 7, 5.5)
  k.fill({ color: KRUKA_BLA, alpha: 0.8 })
  k.circle(bx, by, 4).fill(0xf2c14e)
  k.roundRect(x - kb + 1, kTopp - 7, kb * 2 - 2, 15, 7.5).fill(topLightFill(KRUKA, { highlight: 0.3, dark: 0.2 })).stroke(kontur(KRUKA, 1.6, 0.5))
  k.ellipse(x - 44, kTopp + 56, 8, 20).fill({ color: 0xffffff, alpha: 0.32 })
  // Plattformarna: redskapens huvuden, vågräta ut från skaftet.
  grenar.forEach((gr, i) => {
    const sida = gr.sida < 0 ? -1 : 1
    const L = tal(gr.L, 140)
    const c = grenVy(rot, gr, sida)
    const g = ritning(c)
    const a = -L / 2 + 2
    const b = L / 2
    if (typer[i % 2] === 'slev') {
      // Soppslevens skål, öppningen uppåt: grodan står på kanten.
      g.poly(ellipsBage((a + b) / 2 + 6, -11, (b - a) / 2 - 4, 34, 0, Math.PI, 22)).fill(sphereFill(STAL, { lightX: 0.35, lightY: 0.15, dark: 0.35 }))
      g.ellipse((a + b) / 2 + 6, -11, (b - a) / 2 - 4, 7).fill(verticalFill(shade(STAL, 0.45), shade(STAL, 0.2)))
      g.ellipse((a + b) / 2 + 6, -11, (b - a) / 2 - 4, 7).stroke({ width: 2.5, color: tint(STAL, 0.5) })
      g.ellipse((a + b) / 2 - 10, 6, 12, 5).fill({ color: 0xffffff, alpha: 0.45 })
      g.roundRect(a - 4, -15, 18, 8, 4).fill(STAL)
    } else {
      // Stekspaden: bladet med tre slitsar.
      g.roundRect(a + 8, -11, b - a - 6, 20, 7).fill(topLightFill(EK, { highlight: 0.3, dark: 0.3 })).stroke(kontur(EK, 1.8))
      for (let j = 0; j < 3; j++) g.roundRect(a + 26 + j * ((b - a - 44) / 3), -5, (b - a - 44) / 3 - 10, 7, 3.5)
      g.fill(shade(EK, 0.45))
      g.roundRect(a + 10, -10, b - a - 12, 4, 2).fill({ color: 0xffffff, alpha: 0.3 })
      g.roundRect(a - 4, -8, 16, 12, 5).fill(shade(EK, 0.1))
    }
  })
  return { svaj }
}

// 5. VARDAGSRUM: en golvlampa — tung fot, hög stång, en skärm som lyser varmt i toppen och två
// läslampsarmar med små skärmar (grenarna).
export function ritaStubbeGolvlampa(R, geo2) {
  const { x, topp, bas, grenar = [] } = geo2
  const svaj = []
  const rot = dekor(R)
  // Ljuset bakom allt: mjuka halvgenomskinliga ellipser och en ljuskägla nedåt.
  const ljus = ritning(rot)
  const sy = topp + 34
  for (const [r, a] of [[150, 0.07], [112, 0.09], [80, 0.12]]) ljus.ellipse(x, sy, r, r * 0.8).fill({ color: LJUS, alpha: a })
  ljus.poly([x - 70, topp + 72, x + 70, topp + 72, x + 150, topp + 330, x - 150, topp + 330]).fill(verticalFillAlpha(LJUS, LJUS, 0.32, 0))
  const g = ritning(rot)
  // Stången med skarvringar.
  g.roundRect(x - 9, topp + 60, 18, bas - topp - 80, 9).fill(cylinderFill(MASSING, { axis: 'y', dark: 0.35, highlight: 0.35 }))
  for (let y = topp + 150; y < bas - 60; y += 110) g.roundRect(x - 13, y, 26, 9, 4.5)
  g.fill(cylinderFill(shade(MASSING, 0.12), { axis: 'y', dark: 0.35, highlight: 0.3 }))
  // Foten: en tung kupol på golvet.
  g.ellipse(x, bas - 6, 64, 11).fill({ color: 0x2a1a0a, alpha: 0.2 })
  g.poly([...ellipsBage(x, bas - 8, 58, 30, Math.PI, TAU, 22)]).fill(sphereFill(MASSING, { lightY: 0.15, dark: 0.35 }))
  g.roundRect(x - 60, bas - 12, 120, 10, 5).fill(shade(MASSING, 0.25))
  g.roundRect(x - 14, bas - 50, 28, 14, 6).fill(cylinderFill(MASSING, { axis: 'y', dark: 0.3, highlight: 0.3 }))
  // Armarna (grenarna): mässingsrör med en liten skärm i spetsen som lyser nedåt.
  grenar.forEach((gr) => {
    const sida = gr.sida < 0 ? -1 : 1
    const L = tal(gr.L, 140)
    const c = grenVy(rot, gr, sida)
    const ag = ritning(c)
    const a = -L / 2 + 2
    const b = L / 2
    const lx = b - 20
    ag.poly([lx - 20, 42, lx + 20, 42, lx + 58, 160, lx - 58, 160]).fill(verticalFillAlpha(LJUS, LJUS, 0.3, 0))
    ag.ellipse(lx, 40, 26, 14).fill({ color: LJUS, alpha: 0.35 })
    ag.roundRect(a, -11, b - a - 4, 13, 6.5).fill(cylinderFill(MASSING, { axis: 'x', dark: 0.35, highlight: 0.35 }))
    ag.circle(a + 4, -4, 11).fill(sphereFill(MASSING, { lightY: 0.25, dark: 0.3 }))
    ag.roundRect(lx - 3, 0, 6, 12, 3).fill(shade(MASSING, 0.2))
    ag.poly([lx - 13, 10, lx + 13, 10, lx + 26, 40, lx - 26, 40]).fill(topLightFill(LAMPSKARM, { highlight: 0.25, dark: 0.2 })).stroke(kontur(LAMPSKARM, 1.4))
    ag.ellipse(lx, 40, 25, 5).fill(0xfff8d8)
  })
  // Den stora skärmen i toppen: veckat tyg, en bård, ljus underkant.
  const sk = ritning(rot)
  sk.roundRect(x - 4, topp + 58, 8, 16, 3).fill(shade(MASSING, 0.2))
  sk.poly([x - 56, topp - 2, x + 56, topp - 2, x + 82, topp + 72, x - 82, topp + 72]).fill(topLightFill(LAMPSKARM, { highlight: 0.35, dark: 0.12 }))
  for (let i = -3; i <= 3; i++) sk.moveTo(x + i * 16, topp + 1).lineTo(x + i * 23.5, topp + 69)
  sk.stroke({ width: 1.3, color: shade(LAMPSKARM, 0.18), alpha: 0.5 })
  sk.roundRect(x - 84, topp + 64, 168, 9, 4).fill(0xe8845a)
  sk.roundRect(x - 58, topp - 5, 116, 7, 3.5).fill(0xe8845a)
  sk.ellipse(x, topp + 74, 80, 9).fill(0xfff8d8)
  sk.ellipse(x, topp + 74, 50, 5).fill(0xffffff)
  return { svaj }
}

// 6. BADRUM: en duschstång från golvet med ett duschmunstycke i toppen (några droppar faller),
// och två trådkorgar med tvål och flaskor (grenarna).
export function ritaStubbeDusch(R, geo2) {
  const { x, topp, bas, grenar = [] } = geo2
  const svaj = []
  const rot = dekor(R)
  const g = ritning(rot)
  // Stången.
  g.roundRect(x - 14, topp + 40, 28, bas - topp - 50, 14).fill(cylinderFill(KROM, { axis: 'y', dark: 0.35, highlight: 0.45 }))
  g.roundRect(x - 7, topp + 50, 5, bas - topp - 80, 2.5).fill({ color: 0xffffff, alpha: 0.7 })
  // En glidhållare på stången.
  g.roundRect(x - 19, (topp + bas) / 2 + 40, 38, 26, 8).fill(cylinderFill(KROM, { axis: 'y', dark: 0.3, highlight: 0.45 }))
  g.ellipse(x, bas - 3, 46, 9).fill({ color: 0x2a3a40, alpha: 0.18 })
  g.roundRect(x - 36, bas - 14, 72, 12, 6).fill(topLightFill(KROM, { highlight: 0.4, dark: 0.3 }))
  g.roundRect(x - 16, bas - 30, 32, 18, 6).fill(cylinderFill(KROM, { axis: 'y', dark: 0.3, highlight: 0.4 }))
  // Munstycket: en böj i toppen och ett stort runt huvud som pekar nedåt.
  g.moveTo(x, topp + 46).quadraticCurveTo(x, topp + 6, x + 24, topp + 6).stroke({ width: 22, color: 0x9aa8b6, cap: 'round' })
  g.moveTo(x, topp + 46).quadraticCurveTo(x, topp + 6, x + 24, topp + 6).stroke({ width: 17, color: KROM, cap: 'round' })
  g.moveTo(x - 3, topp + 40).quadraticCurveTo(x - 3, topp + 4, x + 20, topp + 2).stroke({ width: 4, color: 0xffffff, alpha: 0.6, cap: 'round' })
  const hx = x + 30
  g.poly([hx - 26, topp - 4, hx + 26, topp - 4, hx + 50, topp + 26, hx - 50, topp + 26]).fill(topLightFill(KROM, { highlight: 0.45, dark: 0.3 }))
  g.ellipse(hx, topp + 27, 50, 8).fill(0xa8b6c2)
  for (let i = -3; i <= 3; i++) g.circle(hx + i * 12, topp + 27, 1.8)
  g.fill(0x5a6a78)
  // Dropparna (uppdatera): faller från munstycket och tonar bort.
  const droppar = []
  for (let i = 0; i < 6; i++) {
    const dc = dekor(rot, hx + (i - 2.5) * 15 + rnd(-3, 3), topp + 32)
    ritning(dc).circle(0, 0, 3.2).fill({ color: 0xbfe9ff, alpha: 0.9 }).circle(-1, -1, 1.1).fill({ color: 0xffffff, alpha: 0.9 })
    droppar.push({ c: dc, y0: topp + 32, fall: rnd(120, 190), fart: rnd(0.45, 0.7), fas: Math.random() })
  }
  // Korgarna.
  grenar.forEach((gr) => {
    const sida = gr.sida < 0 ? -1 : 1
    const L = tal(gr.L, 140)
    const c = grenVy(rot, gr, sida)
    const kg = ritning(c)
    const a = -L / 2 + 8
    const b = L / 2 - 2
    // Klämman runt stången + bakre kant.
    kg.roundRect(-L / 2 - 14, -16, 28, 20, 7).fill(cylinderFill(KROM, { axis: 'y', dark: 0.3, highlight: 0.4 }))
    kg.roundRect(a, -11, b - a, 4, 2).fill(shade(KROM, 0.25))
    // Innehållet: en flaska vid stången, en tvål, och en liten flaska till.
    const f = valj(FLASKA)
    kg.roundRect(a + 8, -46, 24, 60, 8).fill(cylinderFill(f, { axis: 'y', dark: 0.3, highlight: 0.3 }))
    kg.roundRect(a + 11, -56, 18, 12, 4).fill(cylinderFill(shade(f, 0.25), { axis: 'y', dark: 0.3, highlight: 0.25 }))
    kg.roundRect(a + 12, -36, 4, 40, 2).fill({ color: 0xffffff, alpha: 0.45 })
    const tv = valj(TVAL)
    kg.roundRect(a + 40, -18, 40, 22, 10).fill(topLightFill(tv, { highlight: 0.4, dark: 0.18 }))
    kg.ellipse(a + 56, -13, 9, 3).fill({ color: 0xffffff, alpha: 0.6 })
    for (const [bx, by, br] of [[a + 46, -22, 5], [a + 54, -25, 3.5], [a + 70, -21, 4.5]]) kg.circle(bx, by, br)
    kg.stroke({ width: 1.3, color: 0xffffff, alpha: 0.85 })
    if (b - a > 118) {
      const f2 = valj(FLASKA)
      kg.roundRect(a + 90, -30, 20, 44, 7).fill(cylinderFill(f2, { axis: 'y', dark: 0.3, highlight: 0.3 }))
      kg.roundRect(a + 92, -38, 16, 10, 4).fill(0xf2f2f2)
    }
    // Trådarna framför innehållet: överkant (där grodan står), botten och lodräta trådar.
    for (let xx = a + 6; xx < b - 2; xx += 11) kg.moveTo(xx, -9).lineTo(xx, 17)
    kg.stroke({ width: 2, color: STAL, alpha: 0.95 })
    kg.roundRect(a, 14, b - a, 6, 3).fill(cylinderFill(KROM, { axis: 'x', dark: 0.3, highlight: 0.4 }))
    kg.roundRect(a - 2, -12, b - a + 4, 7, 3.5).fill(cylinderFill(KROM, { axis: 'x', dark: 0.3, highlight: 0.45 }))
    kg.moveTo(a, -8).lineTo(a, 18).moveTo(b, -8).lineTo(b, 18).stroke({ width: 3, color: KROM, cap: 'round' })
  })
  const uppdatera = (T) => {
    for (const dr of droppar) {
      if (dr.c.destroyed) continue
      const p = (T * dr.fart + dr.fas) % 1
      dr.c.y = dr.y0 + dr.fall * p * p
      dr.c.alpha = p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9
      dr.c.scale.y = 1 + p * 0.6
    }
  }
  return { svaj, uppdatera }
}

// =============================================================================================
// GOLV — piece { a, b, kant, inat, mark }: marken från a till b, ovansidan på `mark`, ned till 900.
// Ligger gölen vid `kant` slutar biten där med en rak lodrät kant (gölens vägg täcker den).
// =============================================================================================

function golvBit(piece) {
  const a = tal(piece?.a, 0)
  const b = tal(piece?.b, 1280)
  const mark = tal(piece?.mark, MARK_Y)
  const kant = Number.isFinite(piece?.kant) ? piece.kant : null
  const inat = piece?.inat < 0 ? -1 : 1
  // Den del av biten som ligger fri från gölens kant (för mattor, handdukar och annat).
  const fri0 = kant != null && inat < 0 ? a + 70 : a
  const fri1 = kant != null && inat > 0 ? b - 70 : b
  return { a, b, mark, kant, inat, fri0, fri1 }
}

// Moduler (skåp, paneler) längs biten, från den yttre änden in mot gölen.
function moduler(a, b, wMin, wMax) {
  const m = []
  let x = a
  while (x < b - 20) {
    let w = rnd(wMin, wMax)
    if (b - (x + w) < wMin * 0.6) w = b - x
    m.push({ x0: x, x1: Math.min(b, x + w) })
    x += w
  }
  return m
}

// 7. KÖK: bänkskivan (tjock trä-skiva med framkant), under den luckor och lådor med knoppar.
export function ritaBank(R, piece) {
  const P = golvBit(piece)
  const { a, b, mark } = P
  const svaj = []
  const c = dekor(R)
  const g = ritning(c)
  const w = b - a
  const skapTopp = mark + 32
  // Skåpstommen.
  g.rect(a, skapTopp, w, 900 - skapTopp).fill(verticalFill(shade(SKAP, 0.06), shade(SKAP, 0.28)))
  g.rect(a, skapTopp, w, 14).fill({ color: 0x1e3a30, alpha: 0.28 })
  g.rect(a, 862, w, 40).fill(shade(SKAP, 0.55))
  // Luckor och lådor.
  const L = ritning(c)
  const knopp = []
  const handtag = []
  for (const m of moduler(a, b, 200, 280)) {
    const x0 = m.x0 + 7
    const x1 = m.x1 - 7
    const mw = x1 - x0
    if (mw < 40) continue
    const lador = Math.random() < 0.3
    if (lador) {
      const hojd = (856 - (skapTopp + 12)) / 3
      for (let i = 0; i < 3; i++) {
        const y = skapTopp + 12 + i * hojd
        L.roundRect(x0, y, mw, hojd - 8, 8)
        handtag.push([(x0 + x1) / 2, y + hojd * 0.28, Math.min(70, mw * 0.4)])
      }
    } else {
      L.roundRect(x0, skapTopp + 12, mw, 62, 8)
      handtag.push([(x0 + x1) / 2, skapTopp + 38, Math.min(70, mw * 0.4)])
      const dy = skapTopp + 82
      if (mw > 180) {
        const hw = (mw - 8) / 2
        L.roundRect(x0, dy, hw, 856 - dy, 8)
        L.roundRect(x0 + hw + 8, dy, hw, 856 - dy, 8)
        knopp.push([x0 + hw - 16, dy + 40], [x0 + hw + 24, dy + 40])
      } else {
        L.roundRect(x0, dy, mw, 856 - dy, 8)
        knopp.push([x1 - 20, dy + 40])
      }
    }
  }
  L.fill(topLightFill(SKAP, { highlight: 0.18, dark: 0.16 }))
  L.stroke({ width: 2.5, color: shade(SKAP, 0.4), alpha: 0.6 })
  // Handtag och knoppar i mässing.
  const H = ritning(c)
  for (const [hx, hy, hw] of handtag) H.roundRect(hx - hw / 2, hy - 4, hw, 8, 4)
  H.fill(cylinderFill(MASSING, { axis: 'x', dark: 0.3, highlight: 0.4 }))
  for (const [kx, ky] of knopp) H.circle(kx, ky, 8.5)
  H.fill(sphereFill(MASSING, { lightY: 0.3, dark: 0.35 }))
  // En kökshandduk hänger på ett lådhandtag här och där (vajar).
  const fri = handtag.filter(([hx]) => hx > P.fri0 + 40 && hx < P.fri1 - 40)
  for (let i = 0; i < Math.max(1, Math.round(w / 1100)) && fri.length; i++) {
    const [hx, hy] = fri.splice((Math.random() * fri.length) | 0, 1)[0]
    const hc = vajNod(c, hx + rnd(-10, 10), hy + 2, svaj, 0.025, rnd(0.7, 1.1))
    const hg = ritning(hc)
    const farg = valj([0xe0463a, 0x4a90d9])
    hg.roundRect(-26, -2, 52, 110, 5).fill(0xfbf6ea)
    for (let k = 0; k < 4; k++) hg.rect(-26 + k * 13 + 3, -2, 6, 110)
    for (let k = 0; k < 8; k++) hg.rect(-26, 4 + k * 13, 52, 6)
    hg.fill({ color: farg, alpha: 0.45 })
    hg.roundRect(-28, -4, 56, 8, 4).fill(tint(farg, 0.2))
  }
  // Bänkskivan: ovansidan som ett smalt ljust band, framkanten med limfogar.
  const S = ritning(c)
  S.rect(a, mark - 6, w, 14).fill(verticalFill(tint(BANK, 0.42), tint(BANK, 0.12)))
  S.rect(a, mark + 8, w, 26).fill(topLightFill(BANK, { highlight: 0.18, dark: 0.3 }))
  for (let x = a + rnd(10, 30); x < b; x += rnd(24, 34)) S.moveTo(x, mark + 10).lineTo(x, mark + 32)
  S.stroke({ width: 1.4, color: shade(BANK, 0.28), alpha: 0.45 })
  S.rect(a, mark + 7, w, 2.5).fill({ color: 0xffffff, alpha: 0.4 })
  S.rect(a, mark + 32, w, 3).fill({ color: shade(BANK, 0.45), alpha: 0.7 })
  // Smulor och en liten fläck på skivan.
  for (let i = 0; i < w / 80; i++) S.ellipse(rnd(a + 10, b - 10), mark + rnd(-3, 5), rnd(1.5, 3), rnd(1, 1.8))
  S.fill({ color: shade(BANK, 0.3), alpha: 0.5 })
  if (P.kant != null) S.rect(P.kant - (P.inat > 0 ? 3 : 0), mark - 6, 3, 900 - mark + 6).fill({ color: 0x1e2a30, alpha: 0.25 })
  return { svaj }
}

// 8. VARDAGSRUM: parkettgolv (ovansidan ett smalt ljust band, framsidan en golvlist och paneler)
// och en randig matta på en del.
export function ritaGolv(R, piece) {
  const P = golvBit(piece)
  const { a, b, mark } = P
  const c = dekor(R)
  const w = b - a
  const g = ritning(c)
  // Framsidan: paneler (en sockel) ned till 900.
  g.rect(a, mark + 30, w, 900 - mark - 30).fill(verticalFill(PANEL, shade(PANEL, 0.35)))
  const pn = ritning(c)
  for (const m of moduler(a, b, 150, 190)) {
    if (m.x1 - m.x0 < 50) continue
    pn.roundRect(m.x0 + 14, mark + 60, m.x1 - m.x0 - 28, 210, 6)
    pn.roundRect(m.x0 + 14, mark + 290, m.x1 - m.x0 - 28, 120, 6)
  }
  pn.fill(topLightFill(tint(PANEL, 0.08), { highlight: 0.12, dark: 0.12 }))
  pn.stroke({ width: 3, color: shade(PANEL, 0.4), alpha: 0.6 })
  pn.stroke({ width: 1.2, color: tint(PANEL, 0.4), alpha: 0.35 })
  // Golvlisten (vitmålad) under golvkanten.
  g.rect(a, mark + 30, w, 22).fill(topLightFill(0xf3ede2, { highlight: 0.3, dark: 0.12 }))
  g.rect(a, mark + 50, w, 4).fill({ color: 0x3a2410, alpha: 0.3 })
  g.rect(a, mark + 37, w, 1.5).fill({ color: 0xc9bfae, alpha: 0.8 })
  // Golvets kant (brädornas ändar) och ovansidan: parkettstavar i förband.
  const P2 = ritning(c)
  P2.rect(a, mark + 12, w, 18).fill(topLightFill(shade(PARKETT, 0.08), { highlight: 0.1, dark: 0.3 }))
  P2.rect(a, mark - 6, w, 18).fill(verticalFill(tint(PARKETT, 0.3), PARKETT))
  const s = ritning(c)
  for (let rad = 0; rad < 3; rad++) {
    const y0 = mark - 6 + rad * 6
    s.moveTo(a, y0).lineTo(b, y0)
    for (let x = a + ((rad * 37) % 90); x < b; x += rnd(70, 110)) s.moveTo(x, y0).lineTo(x + 1.5, y0 + 6)
  }
  for (let x = a + 20; x < b; x += rnd(40, 70)) s.moveTo(x, mark + 12).lineTo(x, mark + 30)
  s.stroke({ width: 1.1, color: shade(PARKETT, 0.35), alpha: 0.45 })
  P2.rect(a, mark + 11, w, 2).fill({ color: 0xffffff, alpha: 0.3 })
  // Den randiga mattan: på ovansidan, med framkanten över golvkanten och fransar.
  const ledigt = P.fri1 - P.fri0
  if (ledigt > 380) {
    const mw = Math.min(ledigt - 60, rnd(300, 460))
    const m0 = rnd(P.fri0 + 30, P.fri1 - 30 - mw)
    const m1 = m0 + mw
    const M = ritning(c)
    const farger = blanda(MATTA)
    const rand = 22
    let k = 0
    for (let x = m0; x < m1; x += rand) {
      const x2 = Math.min(m1, x + rand)
      M.rect(x, mark - 4, x2 - x, 16).fill(farger[k % farger.length])
      M.rect(x, mark + 12, x2 - x, 7).fill(shade(farger[k % farger.length], 0.2))
      k++
    }
    M.rect(m0, mark - 4, mw, 4).fill({ color: 0xffffff, alpha: 0.25 })
    M.rect(m0, mark + 17, mw, 3).fill({ color: 0x3a2410, alpha: 0.25 })
    for (let y = mark - 2; y < mark + 18; y += 4) M.moveTo(m0, y).lineTo(m0 - 8, y + 1).moveTo(m1, y).lineTo(m1 + 8, y + 1)
    M.stroke({ width: 1.6, color: 0xf6ecd8, cap: 'round' })
  }
  if (P.kant != null) g.rect(P.kant - (P.inat > 0 ? 3 : 0), mark - 6, 3, 900 - mark + 6).fill({ color: 0x1e1410, alpha: 0.25 })
  return { svaj: [] }
}

// 9. BADRUM: kakelgolv (rutor, fogar), sockel, kaklad framsida och en badrumsmatta.
export function ritaKakel(R, piece) {
  const P = golvBit(piece)
  const { a, b, mark } = P
  const c = dekor(R)
  const w = b - a
  const g = ritning(c)
  // Framsidan: små vita kakelplattor med en turkos bård.
  const f0 = mark + 26
  g.rect(a, f0, w, 900 - f0).fill(verticalFill(KAKEL_VIT, shade(KAKEL_VIT, 0.16)))
  const T = 38
  const ho = ritning(c)
  for (let y = f0 + 40; y < 900; y += T * 2) for (let x = a + ((y / T) % 2) * T; x < b; x += T * 2) ho.rect(x + 3, y + 3, T - 6, T - 6)
  ho.fill({ color: 0xffffff, alpha: 0.5 })
  g.rect(a, f0, w, 36).fill(topLightFill(KAKEL_TURKOS, { highlight: 0.25, dark: 0.2 }))
  const fog = ritning(c)
  for (let x = a; x < b; x += T) fog.moveTo(x, f0 + 36).lineTo(x, 900)
  for (let y = f0 + 36; y < 900; y += T) fog.moveTo(a, y).lineTo(b, y)
  for (let x = a; x < b; x += 36) fog.moveTo(x, f0).lineTo(x, f0 + 36)
  fog.stroke({ width: 2, color: 0x9fc9cc, alpha: 0.7 })
  const gl = ritning(c)
  for (let y = f0 + 36; y < 900; y += T) for (let x = a; x < b; x += T) gl.rect(x + 4, y + 4, 8, 3)
  for (let x = a; x < b; x += 36) gl.rect(x + 4, f0 + 4, 10, 3)
  gl.fill({ color: 0xffffff, alpha: 0.6 })
  // Sockeln + golvets ovansida: rutor i perspektiv, varannan turkos.
  g.rect(a, mark + 12, w, 14).fill(topLightFill(shade(TURKOS, 0.1), { highlight: 0.3, dark: 0.3 }))
  g.rect(a, mark - 6, w, 18).fill(verticalFill(tint(KAKEL_VIT, 0.2), shade(KAKEL_VIT, 0.06)))
  const rut = ritning(c)
  const R2 = 56
  for (let x = a - (a % (R2 * 2)); x < b; x += R2 * 2) {
    const x0 = Math.max(a, x)
    const x1 = Math.min(b, x + R2)
    if (x1 > x0) rut.rect(x0, mark - 6, x1 - x0, 9)
    const x2 = Math.max(a, x + R2)
    const x3 = Math.min(b, x + R2 * 2)
    if (x3 > x2) rut.rect(x2, mark + 3, x3 - x2, 9)
  }
  rut.fill({ color: KAKEL_TURKOS, alpha: 0.55 })
  const rf = ritning(c)
  rf.moveTo(a, mark + 3).lineTo(b, mark + 3)
  for (let x = a - (a % R2); x < b; x += R2) rf.moveTo(x, mark - 6).lineTo(x + 3, mark + 12)
  rf.stroke({ width: 1.3, color: 0x9fc9cc, alpha: 0.8 })
  g.rect(a, mark - 6, w, 2).fill({ color: 0xffffff, alpha: 0.6 })
  // Badrumsmattan: rosa och luddig, med rundad framkant.
  const ledigt = P.fri1 - P.fri0
  if (ledigt > 300) {
    const mw = Math.min(ledigt - 60, rnd(220, 320))
    const m0 = rnd(P.fri0 + 30, P.fri1 - 30 - mw)
    const M = ritning(c)
    M.roundRect(m0, mark - 5, mw, 24, 10).fill(topLightFill(MATTA_BAD, { highlight: 0.3, dark: 0.2 }))
    for (let x = m0 + 6; x < m0 + mw - 4; x += 8) M.circle(x, mark + 18 + (x % 3), 3.2)
    M.fill(MATTA_BAD)
    for (let i = 0; i < mw / 10; i++) M.moveTo(m0 + rnd(8, mw - 8), mark - 2 + rnd(0, 14)).lineTo(m0 + rnd(8, mw - 8), mark - 2 + rnd(0, 14))
    M.stroke({ width: 1.4, color: tint(MATTA_BAD, 0.5), alpha: 0.6, cap: 'round' })
    M.roundRect(m0 + 10, mark - 4, mw - 20, 3, 1.5).fill({ color: 0xffffff, alpha: 0.5 })
  }
  // Vått kakel närmast karet (där det är halt): blanka pölar och stänk.
  if (P.kant != null) {
    const V = ritning(c)
    const pol = []
    for (let i = 0; i < 3; i++) pol.push([P.kant - P.inat * (46 + i * 78 + rnd(0, 36)), mark + rnd(0, 5), rnd(30, 52)])
    for (const [px, py, pr] of pol) V.ellipse(px, py, pr, Math.max(4, pr * 0.15))
    V.fill({ color: 0x8fd4f0, alpha: 0.8 })
    for (const [px, py, pr] of pol) V.ellipse(px - pr * 0.25, py - 1.5, pr * 0.45, 1.6)
    V.fill({ color: 0xffffff, alpha: 0.95 })
    for (let i = 0; i < 6; i++) V.circle(P.kant - P.inat * rnd(10, 250), mark + rnd(-4, 8), rnd(1.5, 3))
    V.fill({ color: 0xbfeaff, alpha: 0.85 })
  }
  if (P.kant != null) g.rect(P.kant - (P.inat > 0 ? 3 : 0), mark - 6, 3, 900 - mark + 6).fill({ color: 0x1e2a30, alpha: 0.2 })
  return { svaj: [] }
}

// =============================================================================================
// GÖLAR — gol { x0, x1, yt, botten, mark }. Vattnet mellan x0 och x1 ritas av någon annan,
// halvgenomskinligt OVANPÅ R. Golvbitarna går 30 px in i gölen, så behållarens väggar ritas i F
// över x0 … x0+30 och x1−30 … x1 — där täcker de både vattnets kant och golvets raka kant.
// =============================================================================================

function golMatt(gol) {
  const x0 = tal(gol?.x0, 300)
  const x1 = tal(gol?.x1, 900)
  const yt = tal(gol?.yt, YT_Y)
  const botten = tal(gol?.botten, 740)
  const mark = tal(gol?.mark, MARK_Y)
  return { x0, x1, yt, botten, mark, i0: x0 + 30, i1: x1 - 30 }
}

// Skumklunga: små bubblor i en container som gungar (uppdatera).
function skumKlunga(parent, x, y, bredd, { farg = 0xf4fbff, n = 10 } = {}) {
  const c = dekor(parent, x, y)
  const g = ritning(c)
  const bubb = []
  for (let i = 0; i < n; i++) {
    const bx = rnd(-bredd / 2, bredd / 2)
    const r = rnd(7, 15) * (1 - Math.abs(bx) / bredd)
    bubb.push([bx, -r * rnd(0.3, 0.9), r])
  }
  bubb.sort((p, q) => p[2] - q[2])
  for (const [bx, by, r] of bubb) g.circle(bx, by, r)
  g.fill(sphereFill(farg, { lightX: 0.35, lightY: 0.3, dark: 0.16, highlight: 0.5 }))
  for (const [bx, by, r] of bubb) g.circle(bx - r * 0.35, by - r * 0.35, r * 0.25)
  g.fill({ color: 0xffffff, alpha: 0.9 })
  // Några lösa, skimrande såpbubblor.
  for (let i = 0; i < 3; i++) {
    const r = rnd(4, 7)
    g.circle(rnd(-bredd / 2, bredd / 2), rnd(-24, -8), r).stroke({ width: 1.3, color: valj([0xff9ec4, 0x9fd8ff, 0xc5a8f0]), alpha: 0.8 })
  }
  return { c, y, fas: rnd(0, TAU), w: rnd(1.1, 1.6) }
}

function gungaSkum(klungor, T) {
  for (const k of klungor) {
    if (k.c.destroyed) continue
    k.c.y = k.y + Math.sin(T * k.w + k.fas) * 2
    k.c.rotation = Math.sin(T * k.w * 0.7 + k.fas) * 0.03
  }
}

// 10. KÖK: diskhon i bänken — rostfria väggar och botten, en stor kran, droppar och diskskum.
export function ritaDiskho(R, F, gol) {
  const G = golMatt(gol)
  const { x0, x1, yt, botten, mark, i0, i1 } = G
  const rc = dekor(R)
  const g = ritning(rc)
  // Skåpet under hon (samma som bänken).
  g.rect(x0, botten + 10, x1 - x0, 900 - botten - 10).fill(verticalFill(shade(SKAP, 0.1), shade(SKAP, 0.3)))
  const hw = (x1 - x0 - 24) / 2
  g.roundRect(x0 + 8, botten + 24, hw, 900 - botten, 8).fill(topLightFill(SKAP, { highlight: 0.18, dark: 0.16 }))
  g.roundRect(x0 + 16 + hw, botten + 24, hw, 900 - botten, 8).fill(topLightFill(SKAP, { highlight: 0.18, dark: 0.16 }))
  g.circle((x0 + x1) / 2 - 18, botten + 62, 8.5).fill(sphereFill(MASSING, { lightY: 0.3, dark: 0.35 }))
  g.circle((x0 + x1) / 2 + 18, botten + 62, 8.5).fill(sphereFill(MASSING, { lightY: 0.3, dark: 0.35 }))
  // Hons insida: borstat stål, mörkare nedåt.
  g.rect(x0, mark - 4, x1 - x0, botten - mark + 16).fill(verticalFill(0xdbe4ec, 0x8e9dab))
  const bo = ritning(rc)
  for (let x = x0 + 6; x < x1; x += rnd(5, 11)) bo.moveTo(x, mark + rnd(0, 20)).lineTo(x + rnd(-2, 2), botten - rnd(0, 20))
  bo.stroke({ width: 1, color: 0xffffff, alpha: 0.18 })
  // Skuggan under bänkkanten och botten med avlopp + propp i kedja.
  g.rect(x0, mark - 4, x1 - x0, 20).fill(verticalFillAlpha(0x2a3440, 0x2a3440, 0.35, 0))
  const ax = x0 + (x1 - x0) * rnd(0.4, 0.6)
  g.ellipse(ax, botten - 2, 36, 9).fill(0x6b7a88)
  g.ellipse(ax, botten - 2, 24, 6).fill(0x2a3038)
  for (let i = -2; i <= 2; i++) g.moveTo(ax + i * 8, botten - 7).lineTo(ax + i * 8, botten + 3)
  g.stroke({ width: 1.6, color: 0x8e9dab })
  const px = ax + 70
  const kedja = ritning(rc)
  for (let i = 0; i < 9; i++) kedja.circle(ax + 20 + i * 5.6, botten - 4 - Math.sin((i / 8) * Math.PI) * 10, 2.2)
  kedja.stroke({ width: 1.3, color: 0x6b7a88 })
  g.roundRect(px - 16, botten - 16, 32, 14, 6).fill(topLightFill(0x3a3f47, { highlight: 0.3, dark: 0.3 }))
  // Kranen: står på bänken strax utanför ena kanten, svanhals över vattnet (bara bild).
  const sid = Math.random() < 0.5 ? -1 : 1
  const kx = sid > 0 ? x1 + 26 : x0 - 26
  const kr = ritning(rc)
  const pipTopp = mark - 250
  const bage = 64
  const px0 = kx
  const px1 = kx - sid * bage * 2
  const pts = [px0, mark - 40, px0, pipTopp + bage]
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI
    pts.push((px0 + px1) / 2 + sid * Math.cos(a) * -bage, pipTopp + bage + Math.sin(a) * bage)
  }
  pts.push(px1, pipTopp + bage + 34)
  polylinje(kr, pts).stroke({ width: 28, color: 0x9aa8b6, cap: 'round', join: 'round' })
  polylinje(kr, pts).stroke({ width: 22, color: KROM, cap: 'round', join: 'round' })
  polylinje(kr, pts.map((v, i) => (i % 2 === 0 ? v - sid * 5 : v))).stroke({ width: 5, color: 0xffffff, alpha: 0.7, cap: 'round', join: 'round' })
  kr.roundRect(px1 - 16, pipTopp + bage + 26, 32, 16, 6).fill(topLightFill(KROM, { highlight: 0.4, dark: 0.3 }))
  kr.ellipse(px1, pipTopp + bage + 42, 14, 4).fill(0x6b7a88)
  kr.roundRect(kx - 30, mark - 44, 60, 46, 14).fill(cylinderFill(KROM, { axis: 'y', dark: 0.3, highlight: 0.45 }))
  kr.moveTo(kx + sid * 14, mark - 38).lineTo(kx + sid * 50, mark - 78).stroke({ width: 10, color: KROM, cap: 'round' })
  kr.circle(kx + sid * 50, mark - 78, 8).fill(sphereFill(KROM, { lightY: 0.3, dark: 0.3 }))
  kr.ellipse(kx, mark + 2, 40, 6).fill({ color: 0x2a3440, alpha: 0.2 })
  const spetsY = pipTopp + bage + 46
  // Droppen (uppdatera) och ringen den gör i vattnet (i F).
  const dropp = dekor(rc, px1, spetsY)
  ritning(dropp).moveTo(0, -7).quadraticCurveTo(6, 2, 0, 6).quadraticCurveTo(-6, 2, 0, -7).closePath().fill({ color: 0xcfefff, alpha: 0.95 })
    .circle(-1.5, 1, 1.4).fill({ color: 0xffffff, alpha: 0.9 })
  // F: väggarna (tjockt rostfritt med rullad kant), botten och skummet.
  const fc = dekor(F)
  const fg = ritning(fc)
  for (const [va, vb] of [[x0 - 4, i0 + 4], [i1 - 4, x1 + 4]]) {
    fg.roundRect(va, mark - 2, vb - va, botten - mark + 18, 10).fill(cylinderFill(STAL, { axis: 'y', dark: 0.3, highlight: 0.35 }))
    fg.roundRect(va + (vb - va) * 0.34, mark + 6, 5, botten - mark - 10, 2.5).fill({ color: 0xffffff, alpha: 0.55 })
    fg.roundRect(va - 6, mark - 6, vb - va + 12, 12, 6).fill(topLightFill(KROM, { highlight: 0.45, dark: 0.25 }))
  }
  fg.roundRect(x0 - 4, botten - 2, x1 - x0 + 8, 14, 7).fill(topLightFill(STAL, { highlight: 0.3, dark: 0.3 }))
  const ring = dekor(fc, px1, yt + 2)
  ritning(ring).ellipse(0, 0, 16, 4).stroke({ width: 2, color: 0xffffff, alpha: 0.8 })
  ring.alpha = 0
  const klungor = [
    skumKlunga(fc, i0 + rnd(30, 60), yt - 2, 90),
    skumKlunga(fc, i1 - rnd(30, 60), yt - 2, 80),
  ]
  if (x1 - x0 > 520) klungor.push(skumKlunga(fc, (x0 + x1) / 2 + rnd(-140, 140), yt, 44, { n: 5 }))
  const PER = 3.2
  const uppdatera = (T) => {
    gungaSkum(klungor, T)
    const t = (T % PER) / PER
    if (!dropp.destroyed) {
      if (t < 0.55) {
        dropp.alpha = 1
        dropp.y = spetsY
        dropp.scale.set(0.35 + (t / 0.55) * 0.65)
      } else if (t < 0.78) {
        const u = (t - 0.55) / 0.23
        dropp.alpha = 1
        dropp.scale.set(1, 1.2)
        dropp.y = spetsY + (yt - spetsY) * u * u
      } else dropp.alpha = 0
    }
    if (!ring.destroyed) {
      if (t >= 0.78) {
        const u = (t - 0.78) / 0.22
        ring.alpha = 1 - u
        ring.scale.set(0.4 + u * 1.6)
      } else ring.alpha = 0
    }
  }
  return { svaj: [], uppdatera }
}

// Fisk som simmar fram och tillbaka (uppdatera).
function fisk(parent, x, y, farg, stor) {
  const c = dekor(parent, x, y)
  const inre = dekor(c)
  const g = ritning(inre)
  const s = stor
  g.poly([-18 * s, 0, -34 * s, -13 * s, -29 * s, 0, -34 * s, 13 * s]).fill(shade(farg, 0.08))
  spetsblad(g, -4 * s, -10 * s, -0.6, 14 * s, 5 * s).fill(shade(farg, 0.1))
  g.ellipse(0, 0, 22 * s, 13 * s).fill(sphereFill(farg, { lightY: 0.25, dark: 0.28 }))
  g.ellipse(-6 * s, 1 * s, 3.2 * s, 11.5 * s).fill({ color: 0xffffff, alpha: 0.85 })
  g.ellipse(7 * s, 0, 2.8 * s, 11 * s).fill({ color: 0xffffff, alpha: 0.85 })
  spetsblad(g, 2 * s, 8 * s, Math.PI - 0.5, 10 * s, 4 * s).fill(shade(farg, 0.12))
  g.circle(12 * s, -3 * s, 4 * s).fill(0xffffff)
  g.circle(13 * s, -3 * s, 2.2 * s).fill(0x1e1e24)
  g.moveTo(17 * s, 4 * s).quadraticCurveTo(19 * s, 6 * s, 21 * s, 4 * s).stroke({ width: 1.2, color: shade(farg, 0.4), cap: 'round' })
  return c
}

// 11. VARDAGSRUM: ett akvarium i golvet — glasväggar, grus, vajande växter, ett sjunket slott,
// en snäcka, bubblor som stiger och ett par små fiskar.
export function ritaAkvarium(R, F, gol) {
  const G = golMatt(gol)
  const { x0, x1, yt, botten, mark, i0, i1 } = G
  const svaj = []
  const rc = dekor(R)
  const g = ritning(rc)
  // Under akvariet: golvets paneler fortsätter.
  g.rect(x0, botten + 10, x1 - x0, 900 - botten).fill(verticalFill(shade(PANEL, 0.1), shade(PANEL, 0.4)))
  // Bakgrunden i tanken: ljust turkos upptill, djupare nedåt, med klippsilhuetter.
  g.rect(x0, mark - 4, x1 - x0, botten - mark + 14).fill(verticalFill(0xbdf0ea, 0x3f9fae))
  const kl = ritning(rc)
  let x = i0
  kl.moveTo(i0, botten)
  while (x < i1) {
    const w = rnd(60, 130)
    kl.quadraticCurveTo(x + w / 2, botten - rnd(60, 150), Math.min(i1, x + w), botten - rnd(10, 40))
    x += w
  }
  kl.lineTo(i1, botten).closePath().fill({ color: 0x2f8595, alpha: 0.45 })
  // Ljusstrålar från ytan.
  const st = ritning(rc)
  for (let i = 0; i < 4; i++) {
    const sx = rnd(i0 + 40, i1 - 80)
    st.poly([sx, yt, sx + 30, yt, sx + 80, botten - 20, sx + 40, botten - 20])
  }
  st.fill(verticalFillAlpha(0xffffff, 0xffffff, 0.22, 0))
  // Vattenväxter som vajar — var sin nod, fäst i gruset.
  const plantor = []
  for (let i = 0; i < 7; i++) plantor.push(i0 + 20 + ((i1 - i0 - 40) * (i + rnd(0.1, 0.9))) / 7)
  for (const px of plantor) {
    const h = rnd(70, 150)
    const p = vajNod(rc, px, botten - 12, svaj, rnd(0.06, 0.12), rnd(0.8, 1.4))
    const pg = ritning(p)
    const farg = valj([0x3f9a4a, 0x4fb058, 0x2f8a52, 0x6cbf5a])
    const n = rint(2, 4)
    for (let k = 0; k < n; k++) {
      const lut = (k - (n - 1) / 2) * 0.22 + rnd(-0.1, 0.1)
      const hh = h * rnd(0.7, 1)
      const tx = Math.sin(lut) * hh
      pg.moveTo(-4, 0).bezierCurveTo(-8 + tx * 0.3, -hh * 0.4, tx - 10, -hh * 0.7, tx, -hh)
        .bezierCurveTo(tx + 8, -hh * 0.7, 8 + tx * 0.3, -hh * 0.4, 4, 0).closePath()
    }
    pg.fill(topLightFill(farg, { highlight: 0.3, dark: 0.25 }))
  }
  // Slottet.
  const sx = i0 + (i1 - i0) * valj([0.25, 0.7])
  const sl = ritning(rc)
  const SLOTT = 0x9aa3ad
  const sb = botten - 10
  sl.rect(sx - 44, sb - 64, 88, 64).fill(topLightFill(SLOTT, { highlight: 0.2, dark: 0.3 }))
  sl.rect(sx - 56, sb - 108, 28, 108).fill(cylinderFill(SLOTT, { axis: 'y', dark: 0.3, highlight: 0.2 }))
  sl.rect(sx + 28, sb - 96, 28, 96).fill(cylinderFill(SLOTT, { axis: 'y', dark: 0.3, highlight: 0.2 }))
  for (const [tx, ty] of [[sx - 56, sb - 108], [sx + 28, sb - 96]]) for (let k = 0; k < 3; k++) sl.rect(tx + k * 10, ty - 8, 8, 9)
  for (let k = 0; k < 4; k++) sl.rect(sx - 40 + k * 22, sb - 72, 14, 9)
  sl.fill(SLOTT)
  sl.poly([sx - 14, sb, sx - 14, sb - 26, ...ellipsBage(sx, sb - 26, 14, 14, Math.PI, TAU, 10).slice(2, -2), sx + 14, sb - 26, sx + 14, sb]).fill(0x2a3440)
  sl.roundRect(sx - 47, sb - 84, 10, 16, 5).fill(0x2a3440)
  sl.roundRect(sx + 37, sb - 74, 10, 16, 5).fill(0x2a3440)
  sl.moveTo(sx - 42, sb - 116).lineTo(sx - 42, sb - 138).stroke({ width: 2, color: 0x5a4030 })
  sl.poly([sx - 42, sb - 138, sx - 22, sb - 132, sx - 42, sb - 126]).fill(0xe8604c)
  for (let i = 0; i < 6; i++) sl.ellipse(sx + rnd(-50, 50), sb - rnd(4, 60), rnd(5, 9), rnd(3, 5))
  sl.fill({ color: 0x5aa845, alpha: 0.75 })
  // Gruset: färgglada småstenar, en fyllning per färg.
  const grus = ritning(rc)
  grus.rect(x0, botten - 14, x1 - x0, 26).fill(verticalFill(0xe8d3a0, 0xb89a68))
  for (const f of [0xe8c07a, 0xd98a5a, 0x9ad0e0, 0xf2e6c8, 0x7fb07a, 0xf2a0b8]) {
    for (let i = 0; i < (i1 - i0) / 22; i++) grus.ellipse(rnd(i0, i1), botten - rnd(-4, 14), rnd(3, 6), rnd(2, 4))
    grus.fill(f)
  }
  // Snäckan.
  const snx = sx > (i0 + i1) / 2 ? i0 + rnd(60, 120) : i1 - rnd(60, 120)
  const sn = ritning(rc)
  sn.circle(snx, botten - 20, 13).fill(sphereFill(0xf2b8a0, { lightY: 0.3, dark: 0.25 }))
  spiral(sn, snx, botten - 20, 11, 2, 0).stroke({ width: 1.8, color: 0xb86a58, alpha: 0.8 })
  sn.ellipse(snx + 13, botten - 11, 8, 5).fill(0xf6d6c6)
  // Luftstenen och bubblorna (uppdatera).
  const lx = sx > (i0 + i1) / 2 ? i0 + 50 : i1 - 50
  g.roundRect(lx - 12, botten - 16, 24, 10, 5).fill(0x5a6a78)
  const bubblor = []
  for (let i = 0; i < 9; i++) {
    const bc = dekor(rc, lx, botten - 18)
    const r = rnd(3, 7)
    ritning(bc).circle(0, 0, r).stroke({ width: 1.6, color: 0xffffff, alpha: 0.85 }).circle(-r * 0.35, -r * 0.35, r * 0.28).fill({ color: 0xffffff, alpha: 0.9 })
    bubblor.push({ c: bc, fas: i / 9, fart: rnd(0.16, 0.22), sv: rnd(2, 5) })
  }
  // Fiskarna.
  const fiskar = []
  const nf = rint(1, 2)
  for (let i = 0; i < nf; i++) {
    const fy = rnd(yt + 50, botten - 60)
    const c = fisk(rc, (i0 + i1) / 2, fy, valj([0xff8a3d, 0xffb627, 0xf26d7d]), rnd(0.8, 1.05))
    fiskar.push({ c, mitt: (i0 + i1) / 2 + rnd(-40, 40), amp: (i1 - i0) / 2 - 60, y: fy, w: rnd(0.22, 0.34), fas: rnd(0, TAU) })
  }
  // F: glasväggarna (tjockt glas syns grönblått i kanten), ramen upptill och en svag reflex.
  const fc = dekor(F)
  const fg = ritning(fc)
  for (const [va, vb] of [[x0 - 4, i0 + 4], [i1 - 4, x1 + 4]]) {
    fg.rect(va, mark - 2, vb - va, botten - mark + 14).fill(verticalFillAlpha(0xc8f4ee, 0x7fcfc6, 0.92, 0.92))
    fg.rect(va + 5, mark + 6, 3, botten - mark - 10).fill({ color: 0xffffff, alpha: 0.8 })
    fg.rect(vb - 9, mark + 6, 2, botten - mark - 10).fill({ color: 0xffffff, alpha: 0.5 })
    fg.rect(va, mark - 2, vb - va, botten - mark + 14).stroke({ width: 2, color: 0x4f9f98, alpha: 0.7 })
    fg.roundRect(va - 4, mark - 8, vb - va + 8, 12, 4).fill(topLightFill(0x3a3f47, { highlight: 0.3, dark: 0.3 }))
  }
  fg.roundRect(x0 - 8, botten - 2, x1 - x0 + 16, 16, 5).fill(topLightFill(0x3a3f47, { highlight: 0.3, dark: 0.3 }))
  const ref = ritning(fc)
  const rx = rnd(i0 + 60, i1 - 200)
  ref.poly([rx, yt + 20, rx + 40, yt + 20, rx + 110, botten - 30, rx + 70, botten - 30])
  ref.poly([rx + 60, yt + 20, rx + 72, yt + 20, rx + 142, botten - 30, rx + 130, botten - 30])
  ref.fill({ color: 0xffffff, alpha: 0.1 })
  const uppdatera = (T) => {
    const H = botten - 18 - (yt + 6)
    for (const b of bubblor) {
      if (b.c.destroyed) continue
      const p = (T * b.fart + b.fas) % 1
      b.c.y = botten - 18 - H * p
      b.c.x = lx + Math.sin(T * 3 + b.fas * 20) * b.sv * p
      b.c.alpha = p > 0.85 ? (1 - p) / 0.15 : 1
    }
    for (const f of fiskar) {
      if (f.c.destroyed) continue
      const a = T * f.w + f.fas
      f.c.x = f.mitt + Math.sin(a) * f.amp
      f.c.y = f.y + Math.sin(T * 0.9 + f.fas) * 8
      const v = Math.cos(a)
      let sx2 = klamp(v * 4, -1, 1)
      if (Math.abs(sx2) < 0.15) sx2 = sx2 < 0 ? -0.15 : 0.15
      f.c.scale.x = sx2
      const inre = f.c.children[0]
      if (inre && !inre.destroyed) inre.rotation = Math.sin(T * 7 + f.fas) * 0.05
    }
  }
  return { svaj, uppdatera }
}

// 12. BADRUM: ett badkar — vit emalj, rundad kant som sticker upp över golvet, en blank kran och
// ett duschmunstycke på kanten, badskum vid ytan.
export function ritaBadkar(R, F, gol) {
  const G = golMatt(gol)
  const { x0, x1, yt, botten, mark, i0, i1 } = G
  const rc = dekor(R)
  const g = ritning(rc)
  // Under karet: kakel som golvets framsida.
  g.rect(x0, botten + 10, x1 - x0, 900 - botten).fill(verticalFill(KAKEL_VIT, shade(KAKEL_VIT, 0.18)))
  const fog = ritning(rc)
  for (let xx = x0; xx < x1; xx += 38) fog.moveTo(xx, botten + 10).lineTo(xx, 900)
  for (let y = botten + 10; y < 900; y += 38) fog.moveTo(x0, y).lineTo(x1, y)
  fog.stroke({ width: 2, color: 0x9fc9cc, alpha: 0.7 })
  // Karets insida (bortre väggen): emalj, skuggad nedåt, rundad botten.
  const kr = 70
  const ins = [x0, mark - 18, x1, mark - 18, x1, botten - kr]
  ins.push(...ellipsBage(x1 - kr, botten - kr, kr, kr, 0, Math.PI / 2, 10))
  ins.push(...ellipsBage(x0 + kr, botten - kr, kr, kr, Math.PI / 2, Math.PI, 10))
  g.poly(ins).fill(verticalFill(0xffffff, 0xcfe0e8))
  g.rect(x0, mark - 18, x1 - x0, 26).fill(verticalFillAlpha(0x6f8fa0, 0x6f8fa0, 0.25, 0))
  // Karets rundning: insidan mörknar mot gavlarna (remsor med avtagande alfa).
  const rund = ritning(rc)
  for (let k = 0; k < 5; k++) {
    const a = 0.1 - k * 0.02
    rund.rect(i0 + k * 16, mark - 10, 16, botten - mark + 4).fill({ color: 0x7f9fb0, alpha: a })
    rund.rect(i1 - (k + 1) * 16, mark - 10, 16, botten - mark + 4).fill({ color: 0x7f9fb0, alpha: a })
  }
  rund.rect(i0, botten - 40, i1 - i0, 40).fill(verticalFillAlpha(0x7f9fb0, 0x7f9fb0, 0, 0.18))
  // Kanten över golvet (bara bild): en rundad emaljlist runt karet.
  g.roundRect(x0 - 14, mark - 26, x1 - x0 + 28, 26, 13).fill(topLightFill(EMALJ, { highlight: 0.4, dark: 0.18 }))
  g.roundRect(x0 - 14, mark - 26, x1 - x0 + 28, 26, 13).stroke({ width: 1.6, color: 0xa9c3cc, alpha: 0.8 })
  g.roundRect(x0 + 10, mark - 22, x1 - x0 - 20, 4, 2).fill({ color: 0xffffff, alpha: 0.9 })
  // Botten: propp i kedja.
  const ax = x0 + (x1 - x0) * rnd(0.35, 0.65)
  g.ellipse(ax, botten - 4, 18, 5).fill(0x9fb4c0)
  g.ellipse(ax, botten - 4, 11, 3).fill(0x4a5a66)
  const kedja = ritning(rc)
  for (let i = 0; i < 10; i++) kedja.circle(ax + 16 + i * 5.4, botten - 5 - Math.sin((i / 9) * Math.PI) * 12, 2.1)
  kedja.stroke({ width: 1.3, color: 0x8e9dab })
  g.roundRect(ax + 64, botten - 16, 26, 13, 6).fill(topLightFill(0xf06a8a, { highlight: 0.3, dark: 0.3 }))
  // Kranen på kanten: pip ut över vattnet, två vred (varmt/kallt), och ett duschmunstycke i en
  // hållare med slang.
  const sid = Math.random() < 0.5 ? -1 : 1
  const kx = sid > 0 ? x1 - 48 : x0 + 48
  const k = ritning(rc)
  k.roundRect(kx - 14, mark - 88, 28, 64, 12).fill(cylinderFill(KROM, { axis: 'y', dark: 0.3, highlight: 0.45 }))
  k.moveTo(kx, mark - 78).quadraticCurveTo(kx - sid * 10, mark - 104, kx - sid * 74, mark - 96).stroke({ width: 18, color: 0x9aa8b6, cap: 'round' })
  k.moveTo(kx, mark - 78).quadraticCurveTo(kx - sid * 10, mark - 104, kx - sid * 74, mark - 96).stroke({ width: 13, color: KROM, cap: 'round' })
  k.moveTo(kx - sid * 4, mark - 84).quadraticCurveTo(kx - sid * 12, mark - 102, kx - sid * 66, mark - 98).stroke({ width: 3, color: 0xffffff, alpha: 0.75, cap: 'round' })
  k.roundRect(kx - sid * 78 - 7, mark - 98, 14, 16, 5).fill(KROM)
  for (const [vx, vf] of [[kx - 30, 0xf05a5a], [kx + 30, 0x4ab3e8]]) {
    k.roundRect(vx - 6, mark - 44, 12, 22, 5).fill(cylinderFill(KROM, { axis: 'y', dark: 0.3, highlight: 0.45 }))
    k.ellipse(vx, mark - 48, 15, 8).fill(sphereFill(KROM, { lightY: 0.3, dark: 0.3 }))
    k.circle(vx, mark - 50, 3.5).fill(vf)
  }
  const hx = kx + sid * 64
  k.moveTo(kx + sid * 10, mark - 30).bezierCurveTo(kx + sid * 40, mark + 10, hx + sid * 20, mark + 6, hx + sid * 4, mark - 44)
    .stroke({ width: 7, color: 0x9aa8b6, cap: 'round' })
  k.moveTo(kx + sid * 10, mark - 30).bezierCurveTo(kx + sid * 40, mark + 10, hx + sid * 20, mark + 6, hx + sid * 4, mark - 44)
    .stroke({ width: 4, color: KROM, cap: 'round', alpha: 0.9 })
  k.roundRect(hx - 8, mark - 50, 16, 26, 5).fill(0x9aa8b6)
  k.roundRect(hx - 6, mark - 98, 12, 54, 6).fill(cylinderFill(KROM, { axis: 'y', dark: 0.3, highlight: 0.45 }))
  k.ellipse(hx, mark - 106, 20, 12).fill(sphereFill(KROM, { lightY: 0.3, dark: 0.3 }))
  k.ellipse(hx - sid * 2, mark - 104, 13, 7).fill(0xa8b6c2)
  // F: karets gavlar (tjock emalj), botten och skummet.
  const fc = dekor(F)
  const fg = ritning(fc)
  // Gavlarna: tjock emalj med en mjukt rundad insida som går över i botten.
  for (const s of [1, -1]) {
    const ytter = s > 0 ? x0 - 14 : x1 + 14
    const inner = s > 0 ? i0 + 4 : i1 - 4
    const vagg = () => fg.moveTo(ytter, mark - 10).lineTo(inner, mark - 10).lineTo(inner, botten - 70)
      .quadraticCurveTo(inner, botten + 2, inner + s * 70, botten + 2).lineTo(ytter, botten + 14).closePath()
    vagg().fill(cylinderFill(EMALJ, { axis: 'y', dark: 0.2, highlight: 0.35 }))
    vagg().stroke({ width: 1.6, color: 0xa9c3cc, alpha: 0.8 })
    fg.moveTo(inner - s * 6, mark).lineTo(inner - s * 6, botten - 72).quadraticCurveTo(inner - s * 6, botten - 8, inner + s * 50, botten - 6)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.9, cap: 'round' })
  }
  fg.roundRect(x0 + 40, botten - 1, x1 - x0 - 80, 15, 7).fill(topLightFill(EMALJ, { highlight: 0.3, dark: 0.2 }))
  const klungor = [
    skumKlunga(fc, i0 + rnd(40, 70), yt - 2, 110, { n: 13 }),
    skumKlunga(fc, i1 - rnd(40, 70), yt - 2, 100, { n: 12 }),
  ]
  if (x1 - x0 > 480) klungor.push(skumKlunga(fc, (x0 + x1) / 2 + rnd(-150, 150), yt, 60, { n: 7 }))
  const uppdatera = (T) => gungaSkum(klungor, T)
  return { svaj: [], uppdatera }
}

// =============================================================================================
// VÄGGAR — inomhus finns ingen himmel
// =============================================================================================

// 13. Väggen som står STILLA i skärmen: en lugn lodrät toning + ett svagt mönster.
export function ritaVagg(R, stil, yta = {}) {
  const S = VAGG[stil] ? stil : 'kok'
  const x0 = tal(yta.x0, -240)
  const x1 = tal(yta.x1, 1520)
  const y0 = tal(yta.y0, -160)
  const y1 = tal(yta.y1, 880)
  const c = dekor(R)
  const [top, bot] = VAGG[S]
  ritning(c).rect(x0, y0, x1 - x0, y1 - y0).fill(verticalFill(top, bot))
  const m = ritning(c)
  if (S === 'kok') {
    // Varm tapet med små fyrbladiga blommor i förskjutna rader.
    const D = 72
    let rad = 0
    for (let y = y0 + 20; y < y1; y += D * 0.8, rad++) {
      for (let x = x0 + (rad % 2) * (D / 2); x < x1; x += D) {
        m.circle(x, y - 5, 3.4).circle(x, y + 5, 3.4).circle(x - 5, y, 3.4).circle(x + 5, y, 3.4)
      }
    }
    m.fill({ color: 0xe8a878, alpha: 0.28 })
    const m2 = ritning(c)
    rad = 0
    for (let y = y0 + 20; y < y1; y += D * 0.8, rad++) for (let x = x0 + (rad % 2) * (D / 2); x < x1; x += D) m2.circle(x, y, 2)
    m2.fill({ color: 0xf6c86a, alpha: 0.5 })
  } else if (S === 'vardagsrum') {
    // Randig tapet: breda ljusa ränder, tunna linjer emellan och små kvistar i ränderna.
    const D = 84
    for (let x = x0; x < x1; x += D) m.rect(x, y0, 38, y1 - y0)
    m.fill({ color: 0xffffff, alpha: 0.16 })
    const l = ritning(c)
    for (let x = x0 + 52; x < x1; x += D) l.moveTo(x, y0).lineTo(x, y1).moveTo(x + 18, y0).lineTo(x + 18, y1)
    l.stroke({ width: 1.2, color: 0x9fc0a8, alpha: 0.35 })
    const k = ritning(c)
    let rad = 0
    for (let y = y0 + 30; y < y1; y += 96, rad++) {
      for (let x = x0 + 19; x < x1; x += D) {
        const yy = y + (rad % 2) * 48
        k.moveTo(x, yy + 10).lineTo(x, yy - 10)
        spetsblad(k, x, yy - 2, -0.7, 9, 3)
        spetsblad(k, x, yy + 4, 0.7, 9, 3)
      }
    }
    k.fill({ color: 0x8fb89a, alpha: 0.3 })
    k.stroke({ width: 1, color: 0x8fb89a, alpha: 0.3 })
  } else {
    // Blankt kakel: fogar, en glansfläck per platta och en och annan turkos platta.
    const T = 64
    const f = ritning(c)
    for (let y = y0 - (y0 % T); y < y1; y += T) for (let x = x0 - (x0 % T); x < x1; x += T) if (Math.random() < 0.14) f.rect(x, y, T, T)
    f.fill({ color: 0x7fd6d0, alpha: 0.3 })
    for (let x = x0 - (x0 % T); x < x1; x += T) m.moveTo(x, y0).lineTo(x, y1)
    for (let y = y0 - (y0 % T); y < y1; y += T) m.moveTo(x0, y).lineTo(x1, y)
    m.stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
    const sk = ritning(c)
    for (let x = x0 - (x0 % T); x < x1; x += T) sk.moveTo(x + 2, y0).lineTo(x + 2, y1)
    for (let y = y0 - (y0 % T); y < y1; y += T) sk.moveTo(x0, y + 2).lineTo(x1, y + 2)
    sk.stroke({ width: 1, color: 0x7fb0b0, alpha: 0.3 })
    const gl = ritning(c)
    for (let y = y0 - (y0 % T); y < y1; y += T) for (let x = x0 - (x0 % T); x < x1; x += T) gl.roundRect(x + 8, y + 8, 16, 5, 2.5).roundRect(x + 8, y + 16, 5, 10, 2.5)
    gl.fill({ color: 0xffffff, alpha: 0.4 })
  }
  return { svaj: [] }
}

// Ett fönster med utsikt: himmel (pal), sol, kullar och träd, ram och spröjs. Returnerar inget.
function fonster(c, x, y, w, h, pal, stil, { ram = 0xffffff, sproj = true } = {}) {
  const g = ritning(c)
  const himmel = tal(pal?.himmel, 0x9fd3ef)
  const horisont = tal(pal?.horisont, 0xe8f6fb)
  const sol = tal(pal?.sol, 0xffe27a)
  g.rect(x, y, w, h).fill(verticalFill(himmel, horisont))
  // Solen (med gloria) — inom rutan.
  const sx = x + w * 0.72
  const sy = y + h * 0.32
  const sr = Math.min(w, h) * 0.07
  g.circle(sx, sy, sr * 2.1).fill({ color: sol, alpha: 0.18 })
  g.circle(sx, sy, sr * 1.5).fill({ color: sol, alpha: 0.3 })
  g.circle(sx, sy, sr).fill(sol)
  // Ett moln.
  const mx = x + w * 0.28
  const my = y + h * 0.24
  g.ellipse(mx, my, w * 0.09, h * 0.04).ellipse(mx + w * 0.06, my - h * 0.03, w * 0.06, h * 0.045).ellipse(mx - w * 0.05, my + h * 0.005, w * 0.05, h * 0.03)
  g.fill({ color: 0xffffff, alpha: 0.75 })
  // Trädgården: kullar, träd, ett staket.
  const kulle = lerpColor(0x9ccf82, horisont, 0.4)
  const kulle2 = lerpColor(0x6fb35a, horisont, 0.2)
  g.moveTo(x, y + h * 0.7).quadraticCurveTo(x + w * 0.35, y + h * 0.55, x + w * 0.65, y + h * 0.68).quadraticCurveTo(x + w * 0.85, y + h * 0.74, x + w, y + h * 0.62)
    .lineTo(x + w, y + h).lineTo(x, y + h).closePath().fill(kulle)
  for (const [tx, tr] of [[0.15, 0.07], [0.42, 0.055], [0.83, 0.08]]) {
    g.rect(x + w * tx - 3, y + h * 0.7, 6, h * 0.12).fill(lerpColor(0x7a5236, horisont, 0.3))
    g.circle(x + w * tx, y + h * 0.66, w * tr).fill(lerpColor(0x4f9a45, horisont, 0.25))
  }
  g.moveTo(x, y + h * 0.84).quadraticCurveTo(x + w * 0.5, y + h * 0.78, x + w, y + h * 0.86).lineTo(x + w, y + h).lineTo(x, y + h).closePath().fill(kulle2)
  const st = lerpColor(0xffffff, horisont, 0.3)
  for (let px = x + 6; px < x + w; px += 16) g.rect(px, y + h * 0.8, 8, h * 0.2)
  g.rect(x, y + h * 0.84, w, 4)
  g.fill(st)
  // Lite dis över utsikten — den ligger längst bort av allt.
  g.rect(x, y, w, h).fill({ color: VAGG[stil][0], alpha: 0.14 })
  // Rutans reflexer.
  g.poly([x + w * 0.08, y, x + w * 0.2, y, x + w * 0.02, y + h * 0.5, x, y + h * 0.5, x, y + h * 0.15]).fill({ color: 0xffffff, alpha: 0.14 })
  g.poly([x + w * 0.26, y, x + w * 0.3, y, x + w * 0.1, y + h * 0.6, x + w * 0.06, y + h * 0.6]).fill({ color: 0xffffff, alpha: 0.12 })
  // Ramen, spröjsen och bänken.
  const rf = d(stil, ram, 0.25)
  const t = 16
  g.rect(x - t, y - t, w + 2 * t, t).rect(x - t, y + h, w + 2 * t, t).rect(x - t, y, t, h).rect(x + w, y, t, h)
  if (sproj) g.rect(x + w / 2 - 5, y, 10, h).rect(x, y + h * 0.48 - 5, w, 10)
  g.fill(rf)
  g.rect(x - t, y - t, w + 2 * t, h + 2 * t).stroke({ width: 2, color: shade(rf, 0.25), alpha: 0.5 })
  g.rect(x, y, w, h).stroke({ width: 3, color: shade(rf, 0.2), alpha: 0.5 })
  g.roundRect(x - t - 16, y + h + t - 4, w + 2 * t + 32, 14, 5).fill(shade(rf, 0.05))
  g.rect(x - t - 16, y + h + t + 10, w + 2 * t + 32, 5).fill({ color: 0x2a1a0a, alpha: 0.12 })
}

// En tavla i fjärran (ett landskap eller en groda — aldrig en människa).
function tavla(g, x, y, w, h, ram, stil, typ) {
  g.rect(x - 8, y - 8, w + 16, h + 16).fill(d(stil, ram, 0.3))
  g.rect(x - 8, y - 8, w + 16, h + 16).stroke({ width: 1.5, color: d(stil, shade(ram, 0.4), 0.3), alpha: 0.6 })
  if (typ === 'groda') {
    g.rect(x, y, w, h).fill(d(stil, 0xfff1d6, 0.3))
    const fx = x + w / 2
    const fy = y + h * 0.62
    const s = Math.min(w, h) / 70
    g.ellipse(fx, fy, 22 * s, 17 * s).fill(d(stil, 0x6cbf4a, 0.3))
    g.circle(fx - 11 * s, fy - 15 * s, 8 * s).circle(fx + 11 * s, fy - 15 * s, 8 * s).fill(d(stil, 0x6cbf4a, 0.3))
    g.circle(fx - 11 * s, fy - 16 * s, 5 * s).circle(fx + 11 * s, fy - 16 * s, 5 * s).fill(d(stil, 0xffffff, 0.2))
    g.circle(fx - 10 * s, fy - 16 * s, 2.4 * s).circle(fx + 12 * s, fy - 16 * s, 2.4 * s).fill(d(stil, 0x1e2a1e, 0.3))
    g.moveTo(fx - 10 * s, fy + 3 * s).quadraticCurveTo(fx, fy + 10 * s, fx + 10 * s, fy + 3 * s).stroke({ width: 2, color: d(stil, 0x2f5a22, 0.3), cap: 'round' })
    g.ellipse(fx, fy + 19 * s, 34 * s, 5 * s).fill(d(stil, 0x5aa845, 0.35))
  } else {
    g.rect(x, y, w, h * 0.6).fill(d(stil, 0xa7d6ef, 0.3))
    g.circle(x + w * 0.75, y + h * 0.25, Math.min(w, h) * 0.1).fill(d(stil, 0xffd35c, 0.3))
    g.moveTo(x, y + h * 0.62).lineTo(x + w * 0.3, y + h * 0.3).lineTo(x + w * 0.52, y + h * 0.55).lineTo(x + w * 0.7, y + h * 0.4).lineTo(x + w, y + h * 0.62).lineTo(x + w, y + h).lineTo(x, y + h).closePath().fill(d(stil, 0x8aa0b8, 0.3))
    g.poly([x + w * 0.3, y + h * 0.3, x + w * 0.36, y + h * 0.38, x + w * 0.24, y + h * 0.38]).fill(d(stil, 0xffffff, 0.2))
    g.rect(x, y + h * 0.7, w, h * 0.3).fill(d(stil, 0x7cbf5a, 0.3))
    g.rect(x, y + h * 0.7, w, h * 0.06).fill(d(stil, 0x6fa8d8, 0.3))
  }
}

function klocka(g, x, y, r, stil, ram = 0xe0503c) {
  g.circle(x, y, r + 7).fill(d(stil, ram, 0.3))
  g.circle(x, y, r).fill(d(stil, 0xfffcf2, 0.2))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU
    g.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78).lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9)
  }
  g.stroke({ width: 3, color: d(stil, 0x3a3f47, 0.35), cap: 'round' })
  g.moveTo(x, y).lineTo(x + r * 0.45, y - r * 0.3).moveTo(x, y).lineTo(x - r * 0.1, y - r * 0.7)
  g.stroke({ width: 4, color: d(stil, 0x3a3f47, 0.3), cap: 'round' })
  g.circle(x, y, 4).fill(d(stil, 0x3a3f47, 0.3))
}

// Gardin: veckat tyg från (x, y) ned till yb, bredd w. Vecken är lodräta remsor i två toner;
// en uppknuten gardin (knyt = −1 knuten åt vänster, +1 åt höger) snörps ihop vid en punkt en
// bit ned och faller ut igen under den. `spets` = en spetskant i nederkanten.
function gardin(g, x, y, w, yb, farg, stil, { knyt = null, spets = false } = {}) {
  const f = d(stil, farg)
  const mork = shade(f, 0.12)
  const n = 6
  const ky = y + (yb - y) * 0.55
  const kx = knyt == null ? null : knyt > 0 ? x + w * 0.78 : x + w * 0.22
  const kb = w * 0.16
  const lagX = (i, t) => {
    const top = x + (w * i) / n
    if (kx == null) return top
    const vid = kx - kb / 2 + (kb * i) / n
    if (t <= 0.55) return top + (vid - top) * (t / 0.55)
    const nere = kx - w * 0.3 + (w * 0.6 * i) / n
    return vid + (nere - vid) * ((t - 0.55) / 0.45)
  }
  const ys = [0, 0.3, 0.55, 0.8, 1]
  for (let i = 0; i < n; i++) {
    const pts = []
    for (const t of ys) pts.push(lagX(i, t), y + (yb - y) * t)
    for (let k = ys.length - 1; k >= 0; k--) pts.push(lagX(i + 1, ys[k]), y + (yb - y) * ys[k])
    g.poly(pts).fill(i % 2 ? mork : f)
  }
  // En ljus veckrygg i varje ljust veck.
  for (let i = 0; i < n; i += 2) {
    const pts = []
    for (const t of ys) pts.push((lagX(i, t) + lagX(i + 1, t)) / 2, y + (yb - y) * t + (t === 0 ? 6 : t === 1 ? -4 : 0))
    polylinje(g, pts)
  }
  g.stroke({ width: 4, color: tint(f, 0.35), alpha: 0.45, cap: 'round' })
  if (spets) {
    const x0 = lagX(0, 1)
    const x1 = lagX(n, 1)
    for (let sx = x0 + 6; sx < x1 - 2; sx += 12) g.circle(sx, yb, 6)
    g.fill(d(stil, 0xffffff, 0.2))
  }
  if (kx != null) g.roundRect(kx - kb * 0.8, ky - 7, kb * 1.6, 14, 7).fill(d(stil, 0xd9a44a, 0.3))
}

// 14. Fjärran (långsamt parallaxlager): det BORTRE av rummet — fönster med himmel, gardiner,
// tavlor, en klocka, hyllor och krukor, och den bortre golv-/bänklinjen vid y 546.
export function ritaVaggFjarran(F, stil, opts = {}) {
  const S = VAGG[stil] ? stil : 'kok'
  const x0 = tal(opts.x0, -260)
  const x1 = tal(opts.x1, 1960)
  const pal = opts.pal || {}
  const c = dekor(F)
  const w = x1 - x0
  const g = ritning(c)
  // Taket i toppen (syns när grodan klättrat högst upp) och taklisten.
  const tak = { kok: 0xfff6e6, vardagsrum: 0xf4f6ee, badrum: 0xf3fbfb }[S]
  g.rect(x0, -520, w, 316).fill(d(S, tak, 0.2))
  g.rect(x0, -210, w, 14).fill(d(S, 0xffffff, 0.2))
  g.rect(x0, -198, w, 6).fill(d(S, 0xe8e2d4, 0.3))
  g.rect(x0, -192, w, 10).fill({ color: 0x3a2410, alpha: 0.06 })
  if (S === 'kok') fjarranKok(c, x0, x1, pal)
  else if (S === 'vardagsrum') fjarranVardagsrum(c, x0, x1, pal)
  else fjarranBadrum(c, x0, x1, pal)
  return { svaj: [] }
}

function fjarranKok(c, x0, x1, pal) {
  const S = 'kok'
  const w = x1 - x0
  const L = 546
  const g = ritning(c)
  // Stänkskyddet: ljust kakel ovanför den bortre bänken.
  g.rect(x0, 404, w, L - 404).fill(d(S, 0xfbf7ee, 0.25))
  const k = ritning(c)
  for (let x = x0; x < x1; x += 34) k.moveTo(x, 404).lineTo(x, L)
  for (let y = 404; y < L; y += 26) k.moveTo(x0, y).lineTo(x1, y)
  k.stroke({ width: 2, color: d(S, 0xd8cdb8, 0.3), alpha: 0.8 })
  const kb = ritning(c)
  for (let x = x0; x < x1; x += 68) kb.rect(x + 2, 430 + 2, 30, 22)
  kb.fill({ color: d(S, 0x7fb3d8, 0.35), alpha: 0.55 })
  // Överskåp på var sida om fönstret.
  const FX = 620
  const FW = 480
  const ov = ritning(c)
  for (const [a, b] of [[x0 - 40, FX - 90], [FX + FW + 90, x1 + 40]]) {
    ov.rect(a, 40, b - a, 250).fill(d(S, shade(SKAP, 0.05), 0.4))
    for (let x = a + 8; x < b - 60; x += 150) ov.roundRect(x, 50, Math.min(140, b - 8 - x), 230, 6)
    ov.fill(d(S, SKAP, 0.4))
    ov.rect(a, 290, b - a, 10).fill({ color: 0x3a2410, alpha: 0.1 })
    for (let x = a + 8; x < b - 60; x += 150) ov.circle(x + Math.min(140, b - 8 - x) - 18, 250, 6)
    ov.fill(d(S, MASSING, 0.35))
  }
  // Fönstret med gardinkappa och sidogardiner.
  fonster(c, FX, 70, FW, 300, pal, S, { ram: 0xffffff })
  const gr = ritning(c)
  gardin(gr, FX - 60, 40, 120, 350, 0xe86a5a, S, { knyt: -1, spets: true })
  gardin(gr, FX + FW - 60, 40, 120, 350, 0xe86a5a, S, { knyt: 1, spets: true })
  gr.rect(FX - 70, 36, FW + 140, 8).fill(d(S, 0xa46b3a, 0.35))
  // Kappan: vågig underkant.
  const kp = [FX - 40, 40, FX + FW + 40, 40]
  for (let i = 12; i >= 0; i--) kp.push(FX - 40 + ((FW + 80) * i) / 12, 88 + (i % 2) * 12)
  gr.poly(kp).fill(d(S, 0xe86a5a, 0.3))
  for (let x = FX - 34; x < FX + FW + 40; x += 22) gr.rect(x, 44, 11, 40)
  gr.fill({ color: d(S, 0xffffff, 0.3), alpha: 0.45 })
  // Krukor på fönsterbänken.
  const bank = ritning(c)
  for (const [px, f, h] of [[FX + 60, 0xc9683f, 34], [FX + 150, 0xe8c25a, 28], [FX + FW - 90, 0x6fa8d8, 32]]) {
    bank.rect(px - 16, 386 - h, 32, h).fill(d(S, f, 0.35))
    bank.circle(px, 386 - h - 14, 18).circle(px - 12, 386 - h - 6, 12).circle(px + 12, 386 - h - 6, 12).fill(d(S, 0x5aa845, 0.35))
  }
  // Den bortre bänken och skåpen under.
  const b = ritning(c)
  b.rect(x0, L - 8, w, 12).fill(d(S, BANK, 0.35))
  b.rect(x0, L + 4, w, 760 - L).fill(d(S, shade(SKAP, 0.1), 0.42))
  for (let x = x0 + 10; x < x1; x += 180) b.roundRect(x, L + 18, 170, 200, 6)
  b.fill(d(S, SKAP, 0.42))
  for (let x = x0 + 10; x < x1; x += 180) b.roundRect(x + 60, L + 34, 50, 7, 3.5)
  b.fill(d(S, MASSING, 0.4))
  // Saker på den bortre bänken: vattenkokare, brödburk, fruktskål, en kran under fönstret.
  const s = ritning(c)
  const kk = FX - 260
  s.roundRect(kk - 30, L - 76, 60, 68, 14).fill(d(S, 0xe0503c, 0.4))
  s.moveTo(kk + 28, L - 60).quadraticCurveTo(kk + 50, L - 50, kk + 30, L - 26).stroke({ width: 7, color: d(S, 0xe0503c, 0.4), cap: 'round' })
  s.poly([kk - 30, L - 62, kk - 50, L - 72, kk - 30, L - 52]).fill(d(S, 0xe0503c, 0.4))
  s.roundRect(kk - 10, L - 86, 20, 12, 5).fill(d(S, 0x3a3f47, 0.4))
  const bb = FX + FW + 170
  s.roundRect(bb - 60, L - 70, 120, 62, 16).fill(d(S, 0x7fb3d8, 0.4))
  s.roundRect(bb - 40, L - 50, 80, 16, 6).fill(d(S, 0xffffff, 0.35))
  const fs = FX + FW + 360
  s.poly(ellipsBage(fs, L - 30, 58, 26, 0, Math.PI, 14)).fill(d(S, 0xf2efe6, 0.35))
  s.circle(fs - 26, L - 36, 16).fill(d(S, 0xff8a3d, 0.35))
  s.circle(fs + 4, L - 42, 17).fill(d(S, 0xe0463a, 0.35))
  s.circle(fs + 30, L - 34, 14).fill(d(S, 0xa6d15a, 0.35))
  s.roundRect(FX + FW / 2 - 8, L - 70, 16, 62, 7).fill(d(S, KROM, 0.35))
  s.moveTo(FX + FW / 2, L - 64).quadraticCurveTo(FX + FW / 2, L - 100, FX + FW / 2 + 40, L - 96).stroke({ width: 12, color: d(S, KROM, 0.35), cap: 'round' })
  // Klockan och en hylla med muggar.
  const kl = ritning(c)
  klocka(kl, 240, 170, 52, S)
  const hy = ritning(c)
  const hx0 = FX + FW + 130
  hy.rect(hx0, 346, 300, 12).fill(d(S, EK, 0.35))
  for (let i = 0; i < 5; i++) {
    const mx = hx0 + 30 + i * 56
    hy.roundRect(mx - 16, 346 - 34, 32, 34, 7).fill(d(S, KOPP[i % KOPP.length], 0.4))
  }
  // Ett barns teckning av en groda, fäst med tejp, vid klockan.
  const tk = ritning(c)
  tk.rect(x0 + 80, 300, 90, 76).fill(d(S, 0xffffff, 0.2))
  tk.ellipse(x0 + 125, 348, 28, 18).fill(d(S, 0x6cbf4a, 0.3))
  tk.circle(x0 + 112, 330, 8).circle(x0 + 138, 330, 8).fill(d(S, 0x6cbf4a, 0.3))
  tk.circle(x0 + 112, 330, 3).circle(x0 + 138, 330, 3).fill(d(S, 0x1e2a1e, 0.3))
  tk.circle(x0 + 150, 312, 9).fill(d(S, 0xffd35c, 0.3))
  tk.rect(x0 + 72, 294, 22, 10).rect(x0 + 152, 294, 22, 10).fill({ color: 0xfff6c8, alpha: 0.7 })
  // En taklampa som hänger ned ovanför fönstret.
  const la = ritning(c)
  la.moveTo(FX + FW / 2, -200).lineTo(FX + FW / 2, -40).stroke({ width: 3, color: d(S, 0x3a3f47, 0.4) })
  la.poly([FX + FW / 2 - 20, -44, FX + FW / 2 + 20, -44, FX + FW / 2 + 62, 10, FX + FW / 2 - 62, 10]).fill(d(S, 0x3f8fd0, 0.4))
  la.ellipse(FX + FW / 2, 10, 62, 8).fill(d(S, 0xfff4c8, 0.2))
}

function fjarranVardagsrum(c, x0, x1, pal) {
  const S = 'vardagsrum'
  const w = x1 - x0
  const L = 546
  const g = ritning(c)
  // Golvet i fjärran: parkett och en matta.
  g.rect(x0, L, w, 760 - L).fill(d(S, PARKETT, 0.45))
  g.rect(x0, L - 18, w, 20).fill(d(S, 0xf3ede2, 0.3))
  g.rect(x0, L, w, 4).fill({ color: 0x3a2410, alpha: 0.15 })
  const pk = ritning(c)
  for (let y = L + 12; y < 760; y += 16) pk.moveTo(x0, y).lineTo(x1, y)
  pk.stroke({ width: 1.5, color: d(S, shade(PARKETT, 0.3), 0.45), alpha: 0.5 })
  // Fönstret med långa gardiner och ett element under.
  const FX = 650
  const FW = 420
  fonster(c, FX, 60, FW, 360, pal, S, { ram: 0xffffff })
  const el = ritning(c)
  el.rect(FX + 20, 450, FW - 40, 76).fill(d(S, 0xffffff, 0.25))
  for (let x = FX + 30; x < FX + FW - 30; x += 18) el.rect(x, 454, 10, 68)
  el.fill(d(S, 0xe6e2d8, 0.25))
  const gr = ritning(c)
  gardin(gr, FX - 110, 20, 150, L - 4, 0xd9a441, S)
  gardin(gr, FX + FW - 40, 20, 150, L - 4, 0xd9a441, S)
  gr.rect(FX - 130, 14, FW + 260, 10).fill(d(S, 0x8a5a34, 0.35))
  gr.circle(FX - 132, 19, 10).circle(FX + FW + 132, 19, 10).fill(d(S, MASSING, 0.35))
  // Kakelugnen (till vänster): pärlvit, kakel, krona, mässingsluckor.
  const KX = 160
  const ku = ritning(c)
  ku.rect(KX - 110, 90, 220, L - 90).fill(d(S, 0xf6f1e4, 0.3))
  for (let y = 110; y < L - 30; y += 44) ku.moveTo(KX - 110, y).lineTo(KX + 110, y)
  for (let x = KX - 110 + 44; x < KX + 110; x += 44) ku.moveTo(x, 90).lineTo(x, L - 30)
  ku.stroke({ width: 2, color: d(S, 0xcfc6b0, 0.3) })
  for (let y = 110; y < L - 60; y += 44) for (let x = KX - 110; x < KX + 110; x += 44) ku.circle(x + 22, y + 22, 7)
  ku.fill({ color: d(S, 0x7fa6c8, 0.3), alpha: 0.6 })
  ku.rect(KX - 124, 60, 248, 34).fill(d(S, 0xf6f1e4, 0.3))
  ku.poly([KX - 90, 60, KX - 60, 20, KX + 60, 20, KX + 90, 60]).fill(d(S, 0xf6f1e4, 0.3))
  ku.rect(KX - 124, L - 34, 248, 34).fill(d(S, 0xe8e0cc, 0.3))
  ku.roundRect(KX - 40, 300, 80, 70, 8).fill(d(S, MASSING, 0.35))
  ku.roundRect(KX - 30, 310, 60, 50, 6).fill(d(S, 0xc98e3a, 0.35))
  // Tavlor ovanför en byrå, och en fåtölj.
  const tv = ritning(c)
  tavla(tv, 1260, 120, 200, 130, 0xd9a44a, S, 'landskap')
  tavla(tv, 1510, 150, 90, 110, 0x8a5a34, S, 'groda')
  const by = ritning(c)
  by.rect(1240, 400, 380, 146).fill(d(S, 0xa8703f, 0.4))
  for (let i = 0; i < 3; i++) by.roundRect(1256, 414 + i * 44, 348, 36, 5)
  by.fill(d(S, 0xc28b55, 0.4))
  for (let i = 0; i < 3; i++) by.circle(1430, 432 + i * 44, 5)
  by.fill(d(S, MASSING, 0.35))
  by.roundRect(1300, 350, 60, 50, 10).fill(d(S, 0x3f78b8, 0.4))
  by.circle(1330, 330, 26).circle(1312, 342, 16).circle(1350, 340, 18).fill(d(S, 0x5aa845, 0.4))
  by.roundRect(1480, 360, 30, 40, 4).fill(d(S, 0xf2efe6, 0.4))
  by.poly([1470, 362, 1520, 362, 1510, 330, 1480, 330]).fill(d(S, LAMPSKARM, 0.35))
  // Fåtölj till höger.
  const ft = ritning(c)
  const FTX = 1780
  ft.roundRect(FTX - 90, 360, 180, 150, 30).fill(d(S, 0x3fb8af, 0.42))
  ft.roundRect(FTX - 110, 430, 50, 100, 20).roundRect(FTX + 60, 430, 50, 100, 20).fill(d(S, shade(0x3fb8af, 0.1), 0.42))
  ft.roundRect(FTX - 70, 460, 140, 50, 14).fill(d(S, tint(0x3fb8af, 0.15), 0.42))
  ft.rect(FTX - 90, 528, 10, 18).rect(FTX + 80, 528, 10, 18).fill(d(S, 0x8a5a34, 0.4))
  // En väggklocka (pendyl) mellan fönstret och tavlorna.
  const kl = ritning(c)
  kl.roundRect(1150, 100, 60, 190, 20).fill(d(S, 0x8a5a34, 0.35))
  klocka(kl, 1180, 140, 22, S, 0x8a5a34)
  kl.moveTo(1180, 170).lineTo(1180, 250).stroke({ width: 2, color: d(S, MASSING, 0.3) })
  kl.circle(1180, 256, 10).fill(d(S, MASSING, 0.3))
  // Mattan på det bortre golvet.
  const mt = ritning(c)
  for (let i = 0; i < 10; i++) mt.rect(1200 + i * 40, 560, 40, 30).fill(d(S, MATTA[i % MATTA.length], 0.45))
  // Taklampa.
  const la = ritning(c)
  la.circle(FX + FW / 2, -196, 30).fill(d(S, 0xffffff, 0.2))
  la.moveTo(FX + FW / 2, -196).lineTo(FX + FW / 2, -70).stroke({ width: 3, color: d(S, 0x3a3f47, 0.4) })
  for (let i = -2; i <= 2; i++) {
    la.moveTo(FX + FW / 2, -80).quadraticCurveTo(FX + FW / 2 + i * 30, -80, FX + FW / 2 + i * 34, -46).stroke({ width: 3, color: d(S, MASSING, 0.35) })
    la.poly([FX + FW / 2 + i * 34 - 10, -50, FX + FW / 2 + i * 34 + 10, -50, FX + FW / 2 + i * 34 + 14, -26, FX + FW / 2 + i * 34 - 14, -26]).fill(d(S, LAMPSKARM, 0.3))
  }
}

function fjarranBadrum(c, x0, x1, pal) {
  const S = 'badrum'
  const w = x1 - x0
  const L = 546
  const g = ritning(c)
  // Golvet i fjärran: rutigt kakel.
  g.rect(x0, L, w, 760 - L).fill(d(S, 0xeaf6f6, 0.4))
  const rt = ritning(c)
  for (let y = L; y < 760; y += 34) for (let x = x0 + ((y - L) / 34 % 2) * 34; x < x1; x += 68) rt.rect(x, y, 34, 34)
  rt.fill({ color: d(S, KAKEL_TURKOS, 0.45), alpha: 0.5 })
  g.rect(x0, L - 16, w, 18).fill(d(S, TURKOS, 0.45))
  // Fönstret: nedre delen frostad.
  const FX = 720
  const FW = 340
  fonster(c, FX, 90, FW, 250, pal, S, { ram: 0xffffff })
  const fr = ritning(c)
  fr.rect(FX, 90 + 250 * 0.55, FW, 250 * 0.45).fill({ color: 0xffffff, alpha: 0.55 })
  for (let i = 0; i < 12; i++) fr.circle(FX + rnd(10, FW - 10), 90 + 250 * rnd(0.6, 0.95), rnd(3, 7))
  fr.fill({ color: 0xffffff, alpha: 0.4 })
  // Spegel ovanför ett badrumsskåp.
  const sp = ritning(c)
  const SX = 1330
  sp.ellipse(SX, 210, 90, 120).fill(d(S, 0xd9a44a, 0.3))
  sp.ellipse(SX, 210, 78, 108).fill(d(S, 0xdff4f8, 0.25))
  sp.poly([SX - 50, 150, SX - 24, 130, SX + 20, 250, SX - 6, 270]).fill({ color: 0xffffff, alpha: 0.35 })
  sp.rect(SX - 130, 380, 260, 166).fill(d(S, 0xffffff, 0.3))
  sp.roundRect(SX - 118, 392, 116, 142, 6).roundRect(SX + 2, 392, 116, 142, 6).fill(d(S, 0xeef6f6, 0.3))
  sp.circle(SX - 16, 462, 5).circle(SX + 16, 462, 5).fill(d(S, KROM, 0.3))
  sp.roundRect(SX - 100, 346, 30, 34, 8).fill(d(S, 0xff7aa2, 0.4))
  sp.roundRect(SX + 60, 336, 26, 44, 8).fill(d(S, 0x4ab3e8, 0.4))
  // Handdukskrokar med handdukar.
  const hk = ritning(c)
  hk.rect(260, 190, 300, 14).fill(d(S, 0xa8703f, 0.35))
  const hf = [0xff9eb5, 0x7fd0ea, 0xfff0a8]
  for (let i = 0; i < 3; i++) {
    const hx = 310 + i * 100
    hk.circle(hx, 212, 7).fill(d(S, KROM, 0.3))
    hk.roundRect(hx - 34, 214, 68, 170 - i * 20, 10).fill(d(S, hf[i], 0.35))
    hk.rect(hx - 34, 330 - i * 20, 68, 10).fill({ color: 0xffffff, alpha: 0.4 })
  }
  // Tvättmaskin med rund lucka.
  const tm = ritning(c)
  const TX = 1640
  tm.roundRect(TX - 90, 350, 180, 196, 12).fill(d(S, 0xffffff, 0.25))
  tm.rect(TX - 90, 350, 180, 38).fill(d(S, 0xe6eef0, 0.25))
  tm.circle(TX + 50, 369, 9).fill(d(S, 0x9fb4c0, 0.3))
  tm.roundRect(TX - 70, 362, 60, 12, 4).fill(d(S, 0x9fb4c0, 0.3))
  tm.circle(TX, 460, 62).fill(d(S, 0x9fb4c0, 0.3))
  tm.circle(TX, 460, 48).fill(d(S, 0x7fc0dc, 0.3))
  tm.poly([TX - 30, 440, TX - 14, 424, TX + 10, 470, TX - 6, 484]).fill({ color: 0xffffff, alpha: 0.35 })
  // En hylla med växter och flaskor.
  const hy = ritning(c)
  hy.rect(x0 + 40, 420, 220, 12).fill(d(S, 0xffffff, 0.3))
  hy.roundRect(x0 + 60, 380, 40, 40, 8).fill(d(S, 0xe8845a, 0.4))
  for (let i = 0; i < 5; i++) spetsblad(hy, x0 + 80, 382, -0.9 + i * 0.45, 46, 10)
  hy.fill(d(S, 0x5aa845, 0.4))
  hy.roundRect(x0 + 130, 376, 26, 44, 8).fill(d(S, 0xb58ae8, 0.4))
  hy.roundRect(x0 + 170, 386, 30, 34, 8).fill(d(S, 0x8ad16a, 0.4))
  // En rund taklampa.
  const la = ritning(c)
  la.poly(ellipsBage(FX + FW / 2, -196, 70, 34, 0, Math.PI, 16)).fill(d(S, 0xffffff, 0.15))
  la.ellipse(FX + FW / 2, -196, 70, 6).fill(d(S, 0xe0eef0, 0.2))
}

// =============================================================================================
// ÖVRIGT
// =============================================================================================

// 15. Disksvampen kören står på: gul med grön skursida, centrerad kring (0, 0), ovansidan vid y ≈ 0.
export function ritaDisksvamp(g, w = 236) {
  const W = tal(w, 236)
  const hw = W / 2
  const GUL = 0xffd84a
  const GRON = 0x3f9a4a
  // Den gröna skursidan i botten, lite under vattnet.
  g.roundRect(-hw + 4, 22, W - 8, 16, 7).fill(topLightFill(GRON, { highlight: 0.2, dark: 0.3 }))
  for (let x = -hw + 10; x < hw - 8; x += 7) g.moveTo(x, 25).lineTo(x + 5, 34)
  g.stroke({ width: 1.4, color: tint(GRON, 0.35), alpha: 0.6 })
  // Framsidan (tjockleken) och ovansidan (lite ovanifrån).
  g.roundRect(-hw, -2, W, 28, 12).fill(topLightFill(shade(GUL, 0.06), { highlight: 0.15, dark: 0.3 }))
  g.roundRect(-hw + 2, -10, W - 4, 16, 8).fill(verticalFill(tint(GUL, 0.4), GUL))
  // Porer.
  for (let i = 0; i < 38; i++) g.ellipse(rnd(-hw + 10, hw - 10), rnd(2, 20), rnd(1.6, 3.4), rnd(1.2, 2.4))
  g.fill({ color: shade(GUL, 0.3), alpha: 0.55 })
  for (let i = 0; i < 22; i++) g.ellipse(rnd(-hw + 12, hw - 12), rnd(-7, 3), rnd(1.4, 3), rnd(0.8, 1.4))
  g.fill({ color: shade(GUL, 0.22), alpha: 0.5 })
  // Blött blänk och kontur.
  g.roundRect(-hw + 16, -8, W * 0.3, 3, 1.5).fill({ color: 0xffffff, alpha: 0.7 })
  g.circle(hw - 30, -4, 2.2).circle(hw - 22, -2, 1.4).fill({ color: 0xffffff, alpha: 0.8 })
  g.roundRect(-hw, -10, W, 36, 12).stroke({ width: 2, color: shade(GUL, 0.45), alpha: 0.5 })
  // Lite skum på kanterna.
  for (const [x, y, r] of [[-hw + 6, -6, 7], [-hw + 16, -10, 5], [hw - 8, -7, 6], [hw - 18, -11, 4]]) g.circle(x, y, r)
  g.fill({ color: 0xffffff, alpha: 0.9 })
}

// 16. Förgrundsdekor vid världens kanter. c är redan placerad; rita från y 760 upp till ~470 och
// luta inåt (kant 'v' → åt höger). Smala föremål, så de ramar in bilden utan att skymma spelet.
// (`variant` är valfri — förhandsvisningen tvingar fram båda; spelet låter slumpen välja.)
export function ritaFramInne(c, stil, kant, variant = Math.random() < 0.5) {
  const svaj = []
  const inat = kant === 'h' ? -1 : 1
  const luta = dekor(c, 0, 760)
  luta.pivot.set(0, 760)
  luta.rotation = inat * 0.035
  const g = ritning(luta)
  // En svarvad profil (radie, y) nedifrån och upp, speglad kring x = 0.
  const svarv = (prof) => {
    const pts = []
    for (const [r, y] of prof) pts.push(-r, y)
    for (let i = prof.length - 1; i >= 0; i--) pts.push(prof[i][0], prof[i][1])
    return pts
  }
  if (stil === 'vardagsrum') {
    if (variant) {
      // En hög golvvas med vippor av pampasgräs som vajar (ingen yta som ser ut att gå att stå på).
      const VAS = 0xe8845a
      const prof = [[26, 762], [34, 740], [40, 700], [38, 660], [28, 628], [18, 606], [16, 588], [22, 576]]
      g.poly(svarv(prof)).fill(cylinderFill(VAS, { axis: 'y', dark: 0.3, highlight: 0.3 })).stroke(kontur(VAS, 1.8, 0.45))
      g.moveTo(-38, 690).lineTo(38, 690).moveTo(-39, 676).lineTo(39, 676).stroke({ width: 3, color: 0xfff3e0, alpha: 0.7 })
      g.roundRect(-12, 640, 5, 90, 2.5).fill({ color: 0xffffff, alpha: 0.3 })
      g.ellipse(0, 577, 20, 4).fill(shade(VAS, 0.45))
      for (let i = 0; i < 5; i++) {
        const a = (i - 2) * 0.2 + inat * 0.1
        const len = rnd(130, 190)
        const b = vajNod(luta, (i - 2) * 3, 578, svaj, rnd(0.03, 0.05), rnd(0.6, 1))
        const bg = ritning(b)
        const ex = Math.sin(a) * len
        const ey = -Math.cos(a) * len
        bg.moveTo(0, 0).quadraticCurveTo(ex * 0.3, ey * 0.5, ex, ey).stroke({ width: 2.4, color: 0xb89a6a, cap: 'round' })
        // Vippan: en fluffig spets av mjuka strån.
        const vl = rnd(56, 76)
        spetsblad(bg, ex, ey + vl * 0.25, a, vl, 13).fill({ color: 0xf2e2c2, alpha: 0.95 })
        for (let k = 0; k < 9; k++) {
          const t = k / 9
          const px = ex + Math.sin(a) * vl * (t - 0.25)
          const py = ey + vl * 0.25 - Math.cos(a) * vl * (t - 0.25)
          const sid = k % 2 ? 1 : -1
          bg.moveTo(px, py).lineTo(px + Math.cos(a) * sid * 11 + Math.sin(a) * 8, py + Math.sin(a) * sid * 11 - Math.cos(a) * 8)
        }
        bg.stroke({ width: 2, color: 0xfaf0dc, alpha: 0.9, cap: 'round' })
      }
    } else {
      // En monstera i blå kruka.
      const kr = KRUKA_VR[0]
      g.poly([-46, 652, 46, 652, 36, 760, -36, 760]).fill(topLightFill(kr, { highlight: 0.25, dark: 0.3 }))
      g.roundRect(-51, 640, 102, 18, 6).fill(topLightFill(kr, { highlight: 0.35, dark: 0.2 }))
      g.moveTo(-40, 700).lineTo(40, 700).stroke({ width: 3, color: 0xffffff, alpha: 0.5 })
      for (let i = 0; i < 4; i++) {
        const a = (i - 1.5) * 0.3 + inat * 0.12
        const len = rnd(100, 150)
        const b = vajNod(luta, (i - 1.5) * 8, 644, svaj, rnd(0.03, 0.05), rnd(0.7, 1.1))
        const bg = ritning(b)
        const ex = Math.sin(a) * len
        const ey = -Math.cos(a) * len
        bg.moveTo(0, 0).quadraticCurveTo(ex * 0.2, ey * 0.6, ex, ey).stroke({ width: 4, color: 0x3f7a2e, cap: 'round' })
        const f = valj([0x3f8a3a, 0x4f9e3a, 0x2f7a32])
        const bl = 66
        hjartblad(bg, ex, ey + 8, a, bl, 30).fill(topLightFill(f, { highlight: 0.25, dark: 0.25 }))
        // Monsterans slitsar: mörka snitt från kanten in mot mittnerven.
        const dx = Math.sin(a)
        const dy = -Math.cos(a)
        for (const tt of [0.3, 0.52, 0.72]) {
          for (const sid of [-1, 1]) {
            const mx = ex + dx * bl * tt
            const my = ey + 8 + dy * bl * tt
            const w = 34 * Math.sin(Math.PI * (0.15 + tt * 0.8)) * 0.95
            bg.moveTo(mx + -dy * sid * w * 0.3, my + dx * sid * w * 0.3).lineTo(mx + -dy * sid * w, my + dx * sid * w)
          }
        }
        bg.stroke({ width: 3.5, color: shade(f, 0.45), alpha: 0.9, cap: 'round' })
        bg.moveTo(ex, ey + 8).lineTo(ex + dx * bl * 0.85, ey + 8 + dy * bl * 0.85).stroke({ width: 1.6, color: tint(f, 0.4), alpha: 0.7 })
      }
    }
  } else if (stil === 'badrum') {
    if (variant) {
      // Toalettpappershållare på fot: rullen på armen upptill, en extrarulle på foten.
      g.ellipse(0, 756, 42, 10).fill(topLightFill(KROM, { highlight: 0.4, dark: 0.3 }))
      g.roundRect(-6, 506, 12, 250, 6).fill(cylinderFill(KROM, { axis: 'y', dark: 0.35, highlight: 0.45 }))
      g.moveTo(0, 520).quadraticCurveTo(0, 494, inat * 22, 494).lineTo(inat * 40, 494).stroke({ width: 8, color: KROM, cap: 'round' })
      // Rullen sedd från änden, med papperet som hänger ned på utsidan.
      const rx = inat * 44
      const pk = rx + inat * 22
      g.rect(pk - 9, 494, 18, 64).fill(topLightFill(0xfbfbf8, { highlight: 0.2, dark: 0.14 }))
      g.moveTo(pk - 9, 520).lineTo(pk + 9, 520).moveTo(pk - 9, 540).lineTo(pk + 9, 540)
      g.stroke({ width: 1, color: 0xc8c8c0, alpha: 0.8 })
      g.circle(rx, 494, 30).fill(sphereFill(0xfbfbf8, { lightY: 0.3, dark: 0.12 }))
      spiral(g, rx, 494, 26, 1.3, 2).stroke({ width: 1, color: 0xd0d0c8, alpha: 0.9 })
      g.circle(rx, 494, 11).fill(0xd8cdb8)
      g.circle(rx, 494, 5).fill(KROM)
      g.circle(inat * 6, 716, 30).fill(sphereFill(0xfbfbf8, { lightY: 0.3, dark: 0.12 }))
      g.circle(inat * 6, 716, 11).fill(0xd8cdb8)
      spiral(g, inat * 6, 716, 26, 1.2, 1).stroke({ width: 1, color: 0xd0d0c8, alpha: 0.9 })
    } else {
      // Handdukstork i krom med en handduk över översta stången (vajar).
      g.ellipse(0, 756, 50, 10).fill(topLightFill(KROM, { highlight: 0.4, dark: 0.3 }))
      g.roundRect(-40, 490, 8, 266, 4).roundRect(32, 490, 8, 266, 4).fill(cylinderFill(KROM, { axis: 'y', dark: 0.35, highlight: 0.45 }))
      for (const y of [494, 580, 660]) g.roundRect(-40, y, 80, 7, 3.5)
      g.fill(cylinderFill(KROM, { axis: 'x', dark: 0.3, highlight: 0.45 }))
      const hc = vajNod(luta, 0, 497, svaj, 0.03, rnd(0.8, 1.2))
      const hg = ritning(hc)
      const f = valj(HANDDUK)
      hg.roundRect(-34, 0, 68, 140, 8).fill(topLightFill(f, { highlight: 0.25, dark: 0.22 }))
      hg.rect(-34, 106, 68, 8).rect(-34, 120, 68, 5).fill({ color: 0xffffff, alpha: 0.75 })
      for (let k = -30; k < 34; k += 6) hg.moveTo(k, 139).lineTo(k, 146)
      hg.stroke({ width: 2, color: tint(f, 0.3), cap: 'round' })
      hg.roundRect(-36, -6, 72, 12, 6).fill(tint(f, 0.1))
    }
  } else {
    if (variant) {
      // Pepparkvarn i valnöt, med några pepparkorn på bänken.
      const prof = [[27, 762], [30, 744], [24, 730], [19, 706], [21, 650], [27, 604], [30, 578], [24, 556], [18, 546], [22, 532]]
      g.poly(svarv(prof)).fill(cylinderFill(VALNOT, { axis: 'y', dark: 0.35, highlight: 0.3 })).stroke(kontur(VALNOT, 2, 0.5))
      for (const y of [730, 578, 548]) g.roundRect(-28, y - 3, 56, 6, 3)
      g.fill({ color: shade(VALNOT, 0.35), alpha: 0.6 })
      g.poly(ellipsBage(0, 532, 22, 18, Math.PI, TAU, 16)).fill(sphereFill(VALNOT, { lightY: 0.25, dark: 0.3 }))
      g.circle(0, 506, 9).fill(sphereFill(shade(VALNOT, 0.1), { lightY: 0.3, dark: 0.3 }))
      g.roundRect(-10, 612, 4, 80, 2).fill({ color: 0xffffff, alpha: 0.28 })
      for (const [px, py] of [[inat * 40, 752], [inat * 50, 756], [inat * 45, 746]]) g.circle(px, py, 4)
      g.fill(0x2e2418)
    } else {
      // En kruka med gräslök och persilja som vajar.
      g.poly([-50, 664, 50, 664, 40, 760, -40, 760]).fill(topLightFill(TERRAKOTTA, { highlight: 0.2, dark: 0.3 }))
      g.roundRect(-55, 650, 110, 20, 5).fill(topLightFill(TERRAKOTTA, { highlight: 0.3, dark: 0.2 }))
      g.ellipse(0, 654, 48, 6).fill(0x5a3a22)
      // Gräslöken: långa smala strån och två lila blommor.
      const lok = vajNod(luta, -14, 654, svaj, 0.04, rnd(0.9, 1.3))
      const lg = ritning(lok)
      for (let i = 0; i < 8; i++) {
        const a = (i - 3.5) * 0.09 + inat * 0.05
        spetsblad(lg, (i - 3.5) * 3, 0, a, rnd(130, 185), 2.6)
      }
      lg.fill(0x4f9e3a)
      for (const [ax, h] of [[-0.12, 150], [0.1, 172]]) {
        const bx = Math.sin(ax) * h
        const by = -Math.cos(ax) * h
        lg.moveTo(0, 0).lineTo(bx, by).stroke({ width: 1.8, color: 0x4a7a2a })
        for (let k = 0; k < 7; k++) lg.circle(bx + Math.cos(k) * 5, by - 4 + Math.sin(k) * 5, 3.4)
        lg.fill(0xc58ad8)
      }
      // Persiljan: stjälkar med flikiga bladfjädrar i topparna.
      const pers = vajNod(luta, 18, 654, svaj, 0.05, rnd(1.1, 1.5))
      const pg = ritning(pers)
      for (let i = 0; i < 4; i++) {
        const a = (i - 1.5) * 0.3 + inat * 0.1
        const len = rnd(80, 120)
        const ex = Math.sin(a) * len
        const ey = -Math.cos(a) * len
        pg.moveTo(0, 0).quadraticCurveTo(ex * 0.4, ey * 0.5, ex, ey).stroke({ width: 2.4, color: 0x4a7a2a, cap: 'round' })
        for (const da of [-0.8, -0.3, 0.2, 0.7]) spetsblad(pg, ex, ey, a + da, rnd(16, 22), 8)
        pg.fill(valj(BASILIKA))
      }
    }
  }
  return { svaj }
}


// ---- Vardagsrummet utan vatten (ägaren 2026-09-25: "enbart land") -----------------------------------

// Körens hörn på golvet (i stället för akvariet): en rund flätad matta och en stor krukväxt som
// vajar. { x0, x1 } = körens plats, `mark` = golvets ovansida.
export function ritaMatta(R, F, { x0, x1, mark = MARK_Y }) {
  const svaj = []
  const c = dekor(R)
  const g = ritning(c)
  const cx = (x0 + x1) / 2
  const rx = Math.min(170, (x1 - x0) / 2 + 10)
  // Den flätade mattan: koncentriska ringar i mattans färger, platt på golvet.
  const farger = [MATTA[0], MATTA[3], MATTA[1], MATTA[3], MATTA[2]]
  farger.forEach((f, i) => {
    const k = 1 - i / farger.length
    g.ellipse(cx, mark + 2, rx * k, 11 * k + 2).fill(f)
  })
  g.ellipse(cx, mark + 2, rx, 13).stroke({ width: 1.6, color: shade(MATTA[0], 0.35), alpha: 0.5 })
  // Krukväxten vid mattans ena kant: en blå kruka och breda blad som vajar.
  const sida = Math.random() < 0.5 ? -1 : 1
  const kx = cx + sida * (rx - 30)
  const blad = vajNod(c, kx, mark - 44, svaj, 0.035, rnd(0.8, 1.2))
  const bg = ritning(blad)
  for (const [a, l] of [[-0.9, 70], [-0.35, 86], [0.25, 80], [0.8, 64], [-1.4, 52], [1.3, 50]]) spetsblad(bg, 0, 0, a, l, 26).fill(valj(BASILIKA))
  const kg = ritning(c)
  kg.moveTo(kx - 30, mark - 52).lineTo(kx + 30, mark - 52).lineTo(kx + 22, mark + 2).lineTo(kx - 22, mark + 2).closePath().fill(topLightFill(KRUKA_BLA, { highlight: 0.2, dark: 0.3 }))
  kg.roundRect(kx - 33, mark - 58, 66, 10, 4).fill(tint(KRUKA_BLA, 0.15))
  kg.ellipse(kx, mark + 3, 30, 5).fill({ color: 0x3a2410, alpha: 0.2 })
  return { svaj }
}

// Kören i vardagsrummet: en stor, mjuk golvkudde i förgrunden. Ovansidan kring y 0 (där ungarna
// står), kudden sväller ned förbi bildkanten, med en kantsöm, en knapp i mitten och tofsar.
export function ritaKorKudde(g, w = 236) {
  const hw = w / 2 + 12
  const BAS = 0xe8844f
  const SOM = 0xfff0d8
  // Skuggan på golvet bakom.
  g.ellipse(0, -2, hw + 16, 14).fill({ color: 0x3a2410, alpha: 0.16 })
  // Kuddens kropp: bulligt rundad, bredast på mitten.
  g.moveTo(-hw + 18, -8)
    .bezierCurveTo(-hw - 14, -6, -hw - 22, 70, -hw + 4, 100)
    .lineTo(hw - 4, 100)
    .bezierCurveTo(hw + 22, 70, hw + 14, -6, hw - 18, -8)
    .bezierCurveTo(hw * 0.4, -16, -hw * 0.4, -16, -hw + 18, -8)
    .closePath()
    .fill(topLightFill(BAS, { highlight: 0.22, dark: 0.34 }))
  // Ovansidan: en ljusare, lite insjunken yta där ungarna sitter.
  g.ellipse(0, 2, hw - 14, 13).fill(verticalFill(tint(BAS, 0.35), tint(BAS, 0.12)))
  // Kantsömmen (paspoal) runt ovansidan och ned längs framsidan.
  g.ellipse(0, 4, hw - 8, 15).stroke({ width: 3, color: SOM, alpha: 0.85 })
  g.moveTo(-hw * 0.55, 20).quadraticCurveTo(0, 30, hw * 0.55, 20).stroke({ width: 2, color: shade(BAS, 0.3), alpha: 0.45, cap: 'round' })
  // Knappen och vecken som strålar ut från den (på framsidan).
  const ky = 52
  for (const a of [-2.4, -1.6, -0.8, 0.8, 1.6, 2.4]) {
    g.moveTo(0, ky).quadraticCurveTo(Math.cos(a) * 20, ky + Math.sin(a) * 10, Math.cos(a) * 42, ky + Math.sin(a) * 20)
  }
  g.stroke({ width: 2, color: shade(BAS, 0.28), alpha: 0.5, cap: 'round' })
  g.circle(0, ky, 6).fill(sphereFill(SOM, { lightX: 0.35, lightY: 0.3, dark: 0.3 }))
  // Tofsar i de övre hörnen.
  for (const s of [-1, 1]) {
    const tx = s * (hw - 10)
    g.circle(tx, -6, 5).fill(SOM)
    for (let i = -2; i <= 2; i++) g.moveTo(tx, -3).lineTo(tx + s * 6 + i * 2.5, 12)
    g.stroke({ width: 2, color: SOM, cap: 'round' })
  }
  // Glans.
  g.ellipse(-hw * 0.45, 38, 18, 7).fill({ color: 0xffffff, alpha: 0.18 })
}
