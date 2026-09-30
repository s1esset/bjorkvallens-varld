// Rummet och filten i "Vad Försvann?".
//
// RUMMET är ett barnrum sett rakt framifrån: tapetrandig vägg, fönster med gardiner och
// en moln som driver förbi, tre tavlor, en vimpelgirland, golv med brädor, en matta under
// svarsraden och en leksakskorg. Allt sitter i kanterna och högt upp — mitten (hyllan och
// sakerna) ska vara den enda yta som drar blicken. Därför är tonerna dämpade.
//
// FILTEN är tyg, inte en ruta: ett rutnät av punkter som förskjuts av en våg. Samma
// punkter bär mönstret (rutor · prickar · ränder), kantbandet, stygnen och vecken, så allt
// kryssar och vrider sig tillsammans när filten glider in och ut. Helt täckande (alfa 1).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill } from '../../lib/form.js'
import { COLORS, shade, tint } from '../../lib/theme.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// Golvets horisont. Sakerna i svarsraden står på golvet och når ~50 px ovanför den.
export const FLOOR_Y = 600

const C_WALL_TOP = 0xfffaf0
const C_WALL_BOT = 0xf1e3c5
const C_FLOOR_TOP = 0xe9d8b8
const C_FLOOR_BOT = 0xdcc79c
const C_FLOOR_EDGE = 0xc2a97e

const TEMAN = [
  { gardin: 0xf2a7be, matta: 0xe79aa9, ram: 0xd9b98a },
  { gardin: 0x8fd0c8, matta: 0x86c4b9, ram: 0xc9a77a },
  { gardin: 0xf2cf7c, matta: 0xe3b96f, ram: 0xd2a878 },
  { gardin: 0xa9c4f0, matta: 0x9db6e6, ram: 0xd9b98a },
]
const VIMPEL = [0xff9ec4, 0xffd35c, 0x57c8c3, 0xff8a3d, 0xa78bfa, 0x4aa3df, 0x5bbf6a]

// Ett tema per runda: gardinfärg, mattfärg, tavelordning och vimpelfas.
export function slumpaTema() {
  return { ...randomFrom(TEMAN), tavlor: shuffle([0, 1, 2]), vimpel: Math.floor(Math.random() * VIMPEL.length) }
}

// Sned ruta med ett litet "vinkelrätt" ansikte — en leksaksklots.
function kloss(g, x, y, s, rot, col) {
  const h = s / 2
  const pts = []
  for (const [px, py] of [[-h, -h], [h, -h], [h, h], [-h, h]]) {
    pts.push(x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot))
  }
  g.poly(pts).fill(col).stroke({ width: 3, color: shade(col, 0.28) })
  g.circle(x, y, s * 0.2).fill({ color: COLORS.white, alpha: 0.45 })
}

// En upphängd tavla: ram, snören till en spik, och en liten målning inuti.
function tavla(g, x, y, w, h, ram, art) {
  const apex = y - h / 2 - 18
  g.moveTo(x, apex).lineTo(x - w / 4, y - h / 2 + 2).moveTo(x, apex).lineTo(x + w / 4, y - h / 2 + 2)
  g.stroke({ width: 2, color: 0x9a8a78, alpha: 0.7 })
  g.circle(x, apex, 3.2).fill(COLORS.inkSoft)
  g.roundRect(x - w / 2 + 3, y - h / 2 + 6, w, h, 6).fill({ color: COLORS.shadow, alpha: 0.07 }) // slagskugga
  g.roundRect(x - w / 2, y - h / 2, w, h, 6).fill(ram).stroke({ width: 3, color: shade(ram, 0.28) })
  g.rect(x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16).fill(0xfffaf0)
  art(g, x, y, w - 16, h - 16)
}

function artLandskap(g, x, y, w, h) {
  const x0 = x - w / 2, y0 = y - h / 2
  g.rect(x0, y0, w, h).fill(0xbfe6f7)
  g.circle(x + w * 0.27, y - h * 0.2, 8).fill(0xffd35c)
  g.moveTo(x0, y0 + h).lineTo(x0, y0 + h * 0.68).quadraticCurveTo(x - w * 0.1, y0 + h * 0.4, x0 + w, y0 + h * 0.74).lineTo(x0 + w, y0 + h).closePath().fill(0x8fcf86)
}
function artTrad(g, x, y, w, h) {
  g.rect(x - w / 2, y - h / 2, w, h).fill(0xf6e3ef)
  g.rect(x - 4, y + 4, 8, h / 2 - 4).fill(0x9a6a3c)
  g.circle(x, y - 8, 21).fill(0x6fbf73)
  g.circle(x - 8, y - 12, 4).fill(0xe0574f)
  g.circle(x + 9, y - 3, 4).fill(0xe0574f)
}
function artMane(g, x, y, w, h) {
  g.rect(x - w / 2, y - h / 2, w, h).fill(0x6d7bb6)
  g.circle(x - 4, y - 4, 14).fill(0xffe27a)
  g.circle(x + 3, y - 8, 12).fill(0x6d7bb6)
  g.circle(x + 14, y + 12, 3).fill(0xffe27a)
  g.circle(x - 16, y + 14, 2.4).fill(0xffe27a)
}

// Gardinen är ritad vänster; `m` speglar den runt fönstrets mitt (x = 165).
function gardin(g, col, m) {
  const X = (x) => (m ? 330 - x : x)
  g.moveTo(X(60), 86).lineTo(X(118), 86)
  g.quadraticCurveTo(X(96), 150, X(100), 206)
  g.quadraticCurveTo(X(110), 270, X(116), 334)
  g.lineTo(X(52), 334)
  g.quadraticCurveTo(X(62), 270, X(58), 206)
  g.quadraticCurveTo(X(58), 150, X(60), 86)
  g.closePath().fill(col).stroke({ width: 3, color: shade(col, 0.2) })
  for (const [a, b, c] of [[72, 70, 64], [86, 84, 90], [101, 100, 106]]) {
    g.moveTo(X(a), 92).quadraticCurveTo(X(b), 200, X(c), 330)
  }
  g.stroke({ width: 4, color: shade(col, 0.16), alpha: 0.4 })
  g.roundRect(m ? X(102) : 56, 200, 46, 12, 6).fill(tint(col, 0.4)).stroke({ width: 2, color: shade(col, 0.2) })
  g.circle(X(100), 206, 6).fill(shade(col, 0.1))
}

export function makeRum(w, h, tema, { hogHylla = false } = {}) {
  const L = -BLEED_X
  const W = w + 2 * BLEED_X

  // Väggen + golvet är en (träffbar) yta: spelet hänger sitt kvitto-tryck på den.
  const vagg = new Graphics()
    .rect(L, -BLEED_Y, W, FLOOR_Y + BLEED_Y).fill(verticalFill(C_WALL_TOP, C_WALL_BOT))
  vagg.rect(L, FLOOR_Y, W, h + BLEED_Y - FLOOR_Y).fill(verticalFill(C_FLOOR_TOP, C_FLOOR_BOT))

  const dekor = new Container()
  dekor.eventMode = 'none'
  dekor.interactiveChildren = false

  // --- vägg: tapetränder, golvlist, tavlor, girland ---
  const v = new Graphics()
  for (let x = L; x < L + W; x += 72) v.rect(x, -BLEED_Y, 26, FLOOR_Y + BLEED_Y).fill({ color: 0xe8d8b4, alpha: 0.16 })
  v.rect(L, FLOOR_Y - 20, W, 20).fill(0xf7f0de)
  v.rect(L, FLOOR_Y - 20, W, 3).fill({ color: COLORS.white, alpha: 0.7 })
  v.rect(L, FLOOR_Y - 3, W, 4).fill({ color: C_FLOOR_EDGE, alpha: 0.45 })

  const slots = [{ x: 478, y: 160 }, { x: 612, y: 148 }, { x: 746, y: 160 }]
  const konst = [
    { w: 98, h: 78, art: artLandskap },
    { w: 72, h: 94, art: artTrad },
    { w: 68, h: 68, art: artMane },
  ]
  // Två hyllrader (sista nivån) når upp i tavlornas band — en sak framför en tavla läste
  // som en del av tavlan. Då hänger bara EN tavla, på väggen till höger om hyllan.
  const hang = hogHylla ? [{ x: 1110, y: 262 }] : slots
  hang.forEach((pos, i) => {
    const s = konst[tema.tavlor[i]]
    tavla(v, pos.x, pos.y, s.w, s.h, tema.ram, s.art)
  })

  // Vimpelgirlang, sänkt mellan två spikar.
  const P0 = [880, 80], C = [1005, 130], P2 = [1130, 80]
  v.moveTo(P0[0], P0[1]).quadraticCurveTo(C[0], C[1], P2[0], P2[1]).stroke({ width: 3, color: 0x9a8a78 })
  for (let k = 0; k < 8; k++) {
    const t = (k + 0.5) / 8
    const x = (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * C[0] + t * t * P2[0]
    const y = (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * C[1] + t * t * P2[1]
    v.poly([x - 13, y - 1, x + 13, y - 1, x, y + 30]).fill(VIMPEL[(tema.vimpel + k) % VIMPEL.length]).stroke({ width: 2, color: 0xffffff, alpha: 0.6 })
  }
  dekor.addChild(v)

  // --- fönster med gardiner ---
  const f = new Graphics()
  f.roundRect(80, 98, 170, 190, 10).fill(0xfbf4e4).stroke({ width: 4, color: 0xd3bf98 })
  f.roundRect(92, 110, 146, 166, 4).fill(verticalFill(0x9ad7f4, 0xe2f4fb))
  f.circle(206, 146, 22).fill({ color: 0xffe27a, alpha: 0.3 })
  f.circle(206, 146, 15).fill(0xffe27a)
  f.moveTo(92, 252).quadraticCurveTo(150, 214, 238, 246).lineTo(238, 276).lineTo(92, 276).closePath().fill(0x8fcf86)
  f.moveTo(92, 266).quadraticCurveTo(190, 236, 238, 268).lineTo(238, 276).lineTo(92, 276).closePath().fill(0x74bb6f)
  f.rect(162, 110, 6, 166).fill(0xf6eedd)
  f.rect(92, 190, 146, 6).fill(0xf6eedd)
  f.roundRect(92, 110, 146, 166, 4).stroke({ width: 3, color: 0xd3bf98, alpha: 0.7 })
  f.ellipse(165, 314, 92, 7).fill({ color: COLORS.shadow, alpha: 0.07 })
  f.roundRect(68, 286, 194, 16, 6).fill(0xf0e4c8).stroke({ width: 3, color: 0xd3bf98 })
  dekor.addChild(f)

  // Ett moln som driver i rutan. Det bor i ett eget lager: spelet tweenar dess x.
  const moln = new Container()
  const mg = new Graphics()
  mg.circle(-14, 2, 11).fill({ color: COLORS.white, alpha: 0.95 })
  mg.circle(2, -5, 14).fill({ color: COLORS.white, alpha: 0.95 })
  mg.circle(16, 2, 11).fill({ color: COLORS.white, alpha: 0.95 })
  mg.ellipse(1, 6, 27, 8).fill({ color: COLORS.white, alpha: 0.95 })
  moln.addChild(mg)
  moln.position.set(150, 150)
  dekor.addChild(moln)

  const gd = new Graphics()
  gd.moveTo(52, 80).lineTo(278, 80).stroke({ width: 6, color: 0x9a7448, cap: 'round' })
  gd.circle(50, 80, 7).fill(0xb58a55)
  gd.circle(280, 80, 7).fill(0xb58a55)
  gardin(gd, tema.gardin, false)
  gardin(gd, tema.gardin, true)
  for (const rx of [70, 86, 102, 228, 244, 260]) gd.circle(rx, 80, 3.6).stroke({ width: 2, color: 0x7a5a34 })
  dekor.addChild(gd)

  // --- golv: brädor, matta, korg, ljusfläck ---
  const g = new Graphics()
  const rader = [0, 26, 62, 108, 168]
  for (let i = 1; i < rader.length; i++) g.rect(L, FLOOR_Y + rader[i], W, 2).fill({ color: 0xb9a274, alpha: 0.22 })
  for (let r = 0; r + 1 < rader.length; r++) {
    for (let x = L + (r % 2 ? 105 : 0); x < L + W; x += 210) g.rect(x, FLOOR_Y + rader[r], 2, rader[r + 1] - rader[r]).fill({ color: 0xb9a274, alpha: 0.18 })
  }

  // Mattan: under svarsraden och Göm-knappen, så de står på något.
  const my = 672
  g.ellipse(640, my + 6, 446, 48).fill({ color: COLORS.shadow, alpha: 0.08 })
  g.ellipse(640, my, 440, 46).fill(tema.matta).stroke({ width: 3, color: shade(tema.matta, 0.2) })
  g.ellipse(640, my, 420, 37).fill(tint(tema.matta, 0.32))
  g.ellipse(640, my, 340, 29).stroke({ width: 4, color: COLORS.white, alpha: 0.55 })
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2
    g.circle(640 + Math.cos(a) * 382, my + Math.sin(a) * 33, 4.2).fill({ color: COLORS.white, alpha: 0.5 })
  }
  for (let dy = -18; dy <= 18; dy += 9) {
    const ex = 440 * Math.sqrt(1 - (dy / 46) * (dy / 46))
    g.moveTo(640 - ex, my + dy).lineTo(640 - ex - 14, my + dy * 1.1).moveTo(640 + ex, my + dy).lineTo(640 + ex + 14, my + dy * 1.1)
  }
  g.stroke({ width: 3, color: shade(tema.matta, 0.1), cap: 'round' })

  // Leksakskorgen längst åt höger.
  const bx = 1150
  g.ellipse(bx, 696, 72, 10).fill({ color: COLORS.shadow, alpha: 0.14 })
  g.moveTo(bx - 60, 630).lineTo(bx + 60, 630).lineTo(bx + 50, 688).quadraticCurveTo(bx, 698, bx - 50, 688).closePath()
  g.fill(0xd9a05b).stroke({ width: 4, color: 0xa8743a })
  for (const y of [644, 658, 672]) {
    const ins = (10 * (y - 630)) / 58
    g.moveTo(bx - 60 + ins, y).lineTo(bx + 60 - ins, y)
  }
  g.stroke({ width: 3, color: 0xa8743a, alpha: 0.55 })
  for (let r = 0; r < 3; r++) {
    const y = 630 + r * 14
    for (let x = bx - 50 + (r % 2) * 10; x < bx + 50; x += 20) g.moveTo(x, y + 2).lineTo(x, y + 12)
  }
  g.stroke({ width: 3, color: 0xa8743a, alpha: 0.4 })
  g.ellipse(bx, 631, 58, 8).fill(0x8a5a2e)
  kloss(g, bx - 24, 614, 34, -0.25, 0xe8625a)
  kloss(g, bx + 14, 606, 30, 0.3, 0x4aa3df)
  g.circle(bx + 40, 618, 13).stroke({ width: 7, color: 0xff9ec4 })
  g.poly([bx - 6, 590, bx + 14, 622, bx - 26, 622]).fill(0xffd35c).stroke({ width: 3, color: 0xd9a52b })
  g.moveTo(bx - 64, 630).quadraticCurveTo(bx, 652, bx + 64, 630).stroke({ width: 8, color: 0xe6b56f, cap: 'round' })

  // Ljus från fönstret: en parallellogram över golvet med fönsterspröjsen som skugga.
  const lx = (t) => [112 + 64 * t, 236 + 94 * t]
  const y0 = FLOOR_Y + 6
  g.poly([lx(0)[0], y0, lx(0)[1], y0, lx(1)[1], y0 + 112, lx(1)[0], y0 + 112]).fill({ color: 0xfff3b0, alpha: 0.2 })
  const tb = 0.45
  g.moveTo(lx(tb)[0], y0 + tb * 112).lineTo(lx(tb)[1], y0 + tb * 112)
  g.moveTo(174, y0).lineTo(174 + 79, y0 + 112)
  g.stroke({ width: 6, color: tema.matta, alpha: 0.16 })
  dekor.addChild(g)

  return { vagg, dekor, moln }
}

// ---------------------------------------------------------------------------
// FILTEN
// ---------------------------------------------------------------------------

const FILT_FARGER = [COLORS.purple, COLORS.teal, COLORS.pink, COLORS.blue, COLORS.orange]
const MONSTER = ['rutor', 'prickar', 'rander']

export function slumpaFilt() {
  return { monster: randomFrom(MONSTER), farg: randomFrom(FILT_FARGER) }
}

// Lokalt origo i övre vänstra hörnet. Returnerar en Container med egna hjälpare:
//   _glid()     — kalla varje bildruta medan den glider (vågen följer farten)
//   _klar()     — glidet är slut: lägg sig, med en liten krusning
//   _krusning() — ett tryck på filten
//   _stopp()    — döda dess tweens (före destroy)
export function makeFilt(w, h, stil) {
  const STEG = 40
  const cols = Math.max(3, Math.round(w / STEG))
  const rows = Math.max(3, Math.round(h / STEG))
  const cw = w / cols
  const ch = h / rows
  const ljus = tint(stil.farg, 0.42)
  const mork = stil.farg
  const hem = shade(stil.farg, 0.22)
  const sting = tint(stil.farg, 0.8)

  const c = new Container()
  const skugga = new Graphics()
  const bas = new Graphics()
  const moenster = new Graphics()
  const veck = new Graphics()
  const kant = new Graphics()
  for (const g of [skugga, bas, moenster, veck, kant]) { g.eventMode = 'none'; c.addChild(g) }
  c.eventMode = 'static'
  c.hitArea = new Rectangle(0, 0, w, h) // träffbar över hela ytan medan den täcker
  c._y0 = 0

  const wv = { amp: 0, phase: 0 }
  // Förskjutningen av en punkt: fasta små veck + en vandrande våg med styrka `amp`.
  const fx = (x, y) => [
    x + 2.2 * Math.sin(y / 61 + x / 140) + wv.amp * 0.45 * Math.cos(y / 47 - wv.phase * 0.8),
    y + 2.6 * Math.sin(x / 74 + y / 93) + wv.amp * Math.sin(x / 58 - wv.phase),
  ]
  // Punkter längs en inskjuten rektangel (medurs), redan förskjutna.
  const ring = (m, steg) => {
    const out = []
    const side = (xa, ya, xb, yb) => {
      const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, yb - ya) / steg))
      for (let k = 0; k < n; k++) out.push(fx(xa + ((xb - xa) * k) / n, ya + ((yb - ya) * k) / n))
    }
    side(m, m, w - m, m); side(w - m, m, w - m, h - m); side(w - m, h - m, m, h - m); side(m, h - m, m, m)
    return out
  }

  const redraw = () => {
    if (c.destroyed) return
    const P = []
    for (let j = 0; j <= rows; j++) {
      const r = []
      for (let i = 0; i <= cols; i++) r.push(fx(i * cw, j * ch))
      P.push(r)
    }
    const per = []
    for (let i = 0; i <= cols; i++) per.push(...P[0][i])
    for (let j = 1; j <= rows; j++) per.push(...P[j][cols])
    for (let i = cols - 1; i >= 0; i--) per.push(...P[rows][i])
    for (let j = rows - 1; j >= 1; j--) per.push(...P[j][0])

    skugga.clear().poly(per.map((v, k) => v + (k % 2 ? 13 : 6))).fill({ color: COLORS.shadow, alpha: 0.13 })
    bas.clear().poly(per).fill(ljus).stroke({ width: 3, color: hem })

    moenster.clear()
    if (stil.monster === 'rutor') {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if ((i + j) % 2) continue
          moenster.poly([...P[j][i], ...P[j][i + 1], ...P[j + 1][i + 1], ...P[j + 1][i]]).fill(mork)
        }
      }
    } else if (stil.monster === 'prickar') {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if ((i + (j % 2)) % 2) continue
          const a = P[j][i], b = P[j + 1][i + 1]
          moenster.circle((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 7).fill(mork)
        }
      }
    } else {
      for (let i = 0; i < cols; i += 2) {
        const pts = [...P[0][i], ...P[0][i + 1]]
        for (let j = 1; j <= rows; j++) pts.push(...P[j][i + 1])
        for (let j = rows - 1; j >= 0; j--) pts.push(...P[j][i])
        moenster.poly(pts).fill(mork)
      }
    }

    // Veck: fyra ljus/mörka remsor snett över duken, följer samma punkter.
    veck.clear()
    const at = (fi, j) => {
      const i0 = Math.max(0, Math.min(cols - 1, Math.floor(fi)))
      const t = Math.max(0, Math.min(1, fi - i0))
      return [P[j][i0][0] + (P[j][i0 + 1][0] - P[j][i0][0]) * t, P[j][i0][1] + (P[j][i0 + 1][1] - P[j][i0][1]) * t]
    }
    for (let k = 0; k < 4; k++) {
      const fx0 = cols * (0.16 + 0.22 * k)
      const dir = k % 2 ? 0.3 : -0.3
      for (let j = 0; j <= rows; j++) {
        const p = at(fx0 + (j - rows / 2) * dir, j)
        if (j === 0) veck.moveTo(p[0], p[1])
        else veck.lineTo(p[0], p[1])
      }
    }
    veck.stroke({ width: 13, color: COLORS.shadow, alpha: 0.07, join: 'round' })
    for (let k = 0; k < 4; k++) {
      const fx0 = cols * (0.16 + 0.22 * k)
      const dir = k % 2 ? 0.3 : -0.3
      for (let j = 0; j <= rows; j++) {
        const p = at(fx0 + (j - rows / 2) * dir, j)
        if (j === 0) veck.moveTo(p[0] + 8, p[1])
        else veck.lineTo(p[0] + 8, p[1])
      }
    }
    veck.stroke({ width: 5, color: COLORS.white, alpha: 0.16, join: 'round' })

    // Kantband + stygn + en fastsydd rund lapp i mitten (en stjärna läste som stjärn-LEKSAKEN
    // under filten).
    kant.clear()
    const hr = ring(13, 20).flat()
    kant.poly(hr).stroke({ width: 26, color: hem, join: 'miter' })
    const sr = ring(13, 11)
    for (let k = 0; k + 1 < sr.length; k += 2) kant.moveTo(sr[k][0], sr[k][1]).lineTo(sr[k + 1][0], sr[k + 1][1])
    kant.stroke({ width: 3, color: sting, cap: 'round' })
    const star = []
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      const rr = 28
      star.push(...fx(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr))
    }
    kant.poly(star).fill(0xffd35c).stroke({ width: 3, color: 0xe0a94f })
  }
  redraw()

  c._glid = () => {
    if (c.destroyed) return
    if (c._lx === undefined) c._lx = c.x
    const v = Math.abs(c.x - c._lx)
    c._lx = c.x
    wv.amp = Math.min(11, v * 0.22)
    wv.phase += 0.2 + v * 0.03
    c.y = c._y0 - Math.min(8, v * 0.12)
    redraw()
  }
  c._krusning = (a0 = 5) => {
    if (c.destroyed) return
    gsap.killTweensOf(wv)
    wv.amp = a0
    const tw = gsap.to(wv, {
      amp: 0, duration: 0.7, ease: 'power2.out',
      onUpdate: () => {
        if (c.destroyed) { tw.kill(); return }
        wv.phase += 0.3
        redraw()
      },
      onComplete: () => { wv.amp = 0; redraw() },
    })
  }
  c._klar = () => {
    if (c.destroyed) return
    c._lx = c.x
    c.y = c._y0
    c._krusning(5)
  }
  c._stopp = () => gsap.killTweensOf(wv)
  return c
}
