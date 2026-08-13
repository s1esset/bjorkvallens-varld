// Pizzabageriets ingredienser — ALLA ritade som fristående föremål (P0 ASSETS).
// Hyllan var tidigare 65 emoji i en Text; en emoji är inte ett ritat spelobjekt, så varje
// sak har nu egen silhuett, egna färger och en glansfläck som gör den saftig.
//
// Ritregler i den här filen:
//  · Varje ritfunktion returnerar en Graphics ritad i en ~100-enheters låda kring (0,0).
//    makeItemView skalar med size/100, så samma form funkar i hyllan (56) och på pizzan (140).
//  · Pixi v8: form → fill(). En `arc()` efter ett `fill()` i SAMMA Graphics fortsätter vägen
//    och drar ett streck från förra formen (se POLERINGSRUNDA.md, sjätte läckan). Därför
//    används quadraticCurveTo/moveTo här — ingen naken arc().
import { Graphics } from 'pixi.js'
import { sphereFill, topLightFill, cylinderFill } from '../../lib/form.js'

const G = () => new Graphics()

// Mjuk vit glansfläck — ger allt en blank, aptitlig yta.
const gloss = (g, x, y, r, a = 0.35) => g.circle(x, y, r).fill({ color: 0xffffff, alpha: a })

// Rund skiva (tomat, zucchini …): skal + kött + glans.
function disc(rim, flesh, r = 34, rimW = 5) {
  const g = G().circle(0, 0, r).fill(rim).circle(0, 0, r - rimW).fill(topLightFill(flesh))
  gloss(g, -r * 0.34, -r * 0.36, r * 0.2, 0.4)
  return g
}

// Ring/donut (oliv, lök, ananas, calamari): ytterring med urgröpt mitt.
function ring(outer, inner, hole, r = 34, thick = 12) {
  const g = G().circle(0, 0, r).fill(outer).circle(0, 0, r - 4).fill(topLightFill(inner)).circle(0, 0, r - thick).fill(hole)
  gloss(g, -r * 0.4, -r * 0.4, r * 0.16, 0.4)
  return g
}

// Blad med mittnerv — basilika, spenat, ruccola.
function leaf(fill, vein, w = 28, h = 42) {
  const g = G()
  g.moveTo(0, -h).quadraticCurveTo(w, -h * 0.2, 0, h).quadraticCurveTo(-w, -h * 0.2, 0, -h).fill(topLightFill(fill))
  g.moveTo(0, -h * 0.78).lineTo(0, h * 0.78).stroke({ width: 3, color: vein })
  for (let i = -1; i <= 1; i++) {
    const y = i * h * 0.3
    g.moveTo(0, y).lineTo(w * 0.5, y + h * 0.18).stroke({ width: 2, color: vein })
    g.moveTo(0, y).lineTo(-w * 0.5, y + h * 0.18).stroke({ width: 2, color: vein })
  }
  return g
}

// Litet glatt ansikte (ögon + leende) — för djuren och specialarna. Aldrig läskigt.
function face(g, cx, cy, s = 1, ink = 0x2f2a26) {
  g.circle(cx - 7 * s, cy, 3.6 * s).fill(ink)
  g.circle(cx + 7 * s, cy, 3.6 * s).fill(ink)
  g.moveTo(cx - 6 * s, cy + 7 * s).quadraticCurveTo(cx, cy + 13 * s, cx + 6 * s, cy + 7 * s)
    .stroke({ width: 2.6 * s, color: ink, cap: 'round' })
  return g
}

// En strumpa (används både ren och smutsig).
function sock(main, cuff, dirty) {
  const g = G()
  g.moveTo(-16, -36).lineTo(14, -36).lineTo(14, 8).quadraticCurveTo(14, 26, -4, 30)
    .lineTo(-32, 34).quadraticCurveTo(-44, 30, -40, 18).lineTo(-16, 8).closePath().fill(main)
  g.roundRect(-18, -40, 34, 14, 6).fill(cuff)
  g.moveTo(-16, -12).lineTo(14, -12).stroke({ width: 5, color: cuff })
  if (dirty) {
    g.circle(-8, 6, 7).fill({ color: 0x7a6244, alpha: 0.75 })
    g.circle(-26, 22, 5).fill({ color: 0x7a6244, alpha: 0.7 })
    g.circle(4, -6, 4).fill({ color: 0x8d7550, alpha: 0.7 })
  } else {
    gloss(g, -4, -22, 6, 0.35)
  }
  return g
}

// En ost-kil (används både färsk och möglig).
function cheeseWedge(body, light, holes) {
  const g = G()
  g.moveTo(-38, 22).lineTo(30, -26).quadraticCurveTo(40, -30, 40, -18).lineTo(40, 18)
    .quadraticCurveTo(40, 26, 30, 26).closePath().fill(topLightFill(body))
  g.moveTo(-38, 22).lineTo(30, -26).quadraticCurveTo(40, -30, 40, -18).lineTo(-30, 26).closePath()
    .fill({ color: light, alpha: 0.85 })
  for (const [x, y, r] of [[10, 4, 7], [26, -8, 5], [2, 16, 4]]) g.circle(x, y, r).fill(holes)
  return g
}

const DRAW = {
  // ------------------------------------------------------------ goda toppings

  tomat: () => {
    const g = disc(0xd8402c, 0xf2604a, 34)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6
      g.ellipse(Math.cos(a) * 16, Math.sin(a) * 16, 7, 10).fill({ color: 0xffc9b0, alpha: 0.95 })
      g.ellipse(Math.cos(a) * 16, Math.sin(a) * 16, 3, 4.5).fill(0xf7e9a8)
    }
    return g
  },

  svamp: () => {
    const g = G()
    g.roundRect(-11, 0, 22, 32, 9).fill(0xf5ead2).stroke({ width: 3, color: 0xe0d2b4 })
    g.moveTo(-40, 4).quadraticCurveTo(-38, -38, 0, -38).quadraticCurveTo(38, -38, 40, 4).closePath().fill(topLightFill(0xb5734a))
    g.moveTo(-40, 2).quadraticCurveTo(0, 14, 40, 2).lineTo(40, 4).quadraticCurveTo(0, 16, -40, 4).closePath().fill(0x94592f)
    g.ellipse(-16, -18, 8, 5).fill({ color: 0xd8a077, alpha: 0.8 })
    g.ellipse(14, -22, 6, 4).fill({ color: 0xd8a077, alpha: 0.7 })
    return g
  },

  paprika: () => {
    const g = G().circle(0, 0, 36).fill(0x3fa03a).circle(0, 0, 31).fill(topLightFill(0x62c455))
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2
      g.ellipse(Math.cos(a) * 13, Math.sin(a) * 13, 12, 9).fill(0xd9f0c4)
    }
    g.circle(0, 0, 6).fill(0xf3f9dd)
    gloss(g, -14, -16, 7, 0.4)
    return g
  },

  ost: () => cheeseWedge(0xf7c94b, 0xffe08a, 0xe0a92e),

  majs: () => {
    const g = G()
    g.moveTo(-22, 30).quadraticCurveTo(-30, -20, 0, -38).quadraticCurveTo(30, -20, 22, 30)
      .quadraticCurveTo(0, 38, -22, 30).fill(cylinderFill(0xf2c33c))
    for (let r = 0; r < 5; r++) {
      for (let c = -2; c <= 2; c++) {
        const x = c * 9 + (r % 2 ? 4.5 : 0)
        if (Math.abs(x) > 20 - r) continue
        g.ellipse(x, -26 + r * 13, 4, 4.6).fill(0xfbe07e)
      }
    }
    g.moveTo(-22, 26).quadraticCurveTo(-40, 6, -32, 34).quadraticCurveTo(-26, 34, -22, 26).fill(0x74b84a)
    return g
  },

  ananas: () => {
    const g = ring(0xe0a72c, 0xf8d45c, 0xfceec0, 36, 14)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      g.moveTo(Math.cos(a) * 22, Math.sin(a) * 22).lineTo(Math.cos(a) * 31, Math.sin(a) * 31)
        .stroke({ width: 2.5, color: 0xe0a72c })
    }
    return g
  },

  fisk: () => {
    const g = G()
    g.ellipse(2, 0, 34, 21).fill(topLightFill(0x69b6d8))
    g.moveTo(-30, 0).lineTo(-48, -16).lineTo(-48, 16).closePath().fill(0x4f9bbd)
    g.moveTo(4, -20).quadraticCurveTo(12, -34, 22, -18).closePath().fill(0x4f9bbd)
    g.ellipse(4, 6, 26, 12).fill({ color: 0xb7e2f2, alpha: 0.75 })
    g.circle(22, -5, 6).fill(0xfffdf7)
    g.circle(23, -5, 3).fill(0x2f2a26)
    g.moveTo(14, 8).quadraticCurveTo(22, 12, 30, 7).stroke({ width: 2.5, color: 0x3d7f9e, cap: 'round' })
    return g
  },

  raka: () => {
    const g = G()
    for (let i = 0; i < 6; i++) {
      const a = -0.5 + i * 0.42
      g.circle(Math.cos(a) * 26 - 6, Math.sin(a) * 24 - 2, 14 - i * 1.1).fill(sphereFill(i % 2 ? 0xff9a72 : 0xf87e55))
    }
    g.moveTo(-16, -22).lineTo(-34, -34).lineTo(-30, -16).closePath().fill(0xf87e55)
    g.circle(20, -14, 3).fill(0x2f2a26)
    g.moveTo(24, -18).quadraticCurveTo(38, -30, 44, -20).stroke({ width: 2.5, color: 0xf87e55, cap: 'round' })
    gloss(g, 2, -12, 6, 0.4)
    return g
  },

  bacon: () => {
    const g = G()
    g.moveTo(-44, -14).quadraticCurveTo(-14, -26, 6, -12).quadraticCurveTo(28, 2, 46, -10)
      .lineTo(46, 12).quadraticCurveTo(28, 24, 6, 10).quadraticCurveTo(-14, -4, -44, 8).closePath()
      .fill(topLightFill(0xd9603f))
    g.moveTo(-44, -4).quadraticCurveTo(-14, -16, 6, -2).quadraticCurveTo(28, 12, 46, 0)
      .stroke({ width: 6, color: 0xf7d9c4 })
    return g
  },

  broccoli: () => {
    const g = G()
    g.roundRect(-8, 6, 16, 30, 7).fill(cylinderFill(0xa9d17a))
    for (const [x, y, r] of [[-24, -6, 17], [0, -18, 20], [24, -6, 17], [-12, 6, 15], [13, 6, 15]]) {
      g.circle(x, y, r).fill(sphereFill(0x4e9c3f))
    }
    for (const [x, y, r] of [[-20, -12, 6], [4, -24, 7], [22, -10, 5]]) {
      g.circle(x, y, r).fill({ color: 0x6fbd57, alpha: 0.9 })
    }
    return g
  },

  morot: () => {
    const g = G()
    g.moveTo(-8, -18).lineTo(8, -18).lineTo(4, 40).quadraticCurveTo(0, 46, -4, 40).closePath().fill(cylinderFill(0xf0873a))
    for (let i = 0; i < 4; i++) {
      const y = -8 + i * 12
      g.moveTo(-7 + i, y).lineTo(6 - i, y + 3).stroke({ width: 2, color: 0xd06b22 })
    }
    for (const dx of [-16, 0, 16]) {
      g.moveTo(0, -16).quadraticCurveTo(dx * 0.7, -32, dx, -42).stroke({ width: 7, color: 0x5faa42, cap: 'round' })
    }
    return g
  },

  chili: () => {
    const g = G()
    g.moveTo(-4, -22).quadraticCurveTo(28, -14, 26, 16).quadraticCurveTo(24, 40, 6, 38)
      .quadraticCurveTo(14, 22, 10, 6).quadraticCurveTo(6, -10, -4, -22).fill(cylinderFill(0xd8342c))
    g.moveTo(2, -14).quadraticCurveTo(18, -6, 17, 14).stroke({ width: 4, color: 0xf5705f })
    g.moveTo(-4, -22).quadraticCurveTo(-14, -32, -22, -30).stroke({ width: 8, color: 0x5faa42, cap: 'round' })
    return g
  },

  oliv: () => ring(0x3a3a2c, 0x55553f, 0xd8402c, 30, 11),

  lok: () => {
    const g = G().circle(0, 0, 36).fill(0xd9b9d6).circle(0, 0, 31).fill(0xfaf0f7)
    for (const r of [24, 17, 10]) g.circle(0, 0, r).stroke({ width: 3, color: 0xd9b9d6 })
    gloss(g, -14, -16, 6, 0.5)
    return g
  },

  vitlok: () => {
    const g = G()
    g.moveTo(0, -34).quadraticCurveTo(24, -8, 20, 16).quadraticCurveTo(16, 36, 0, 36)
      .quadraticCurveTo(-16, 36, -20, 16).quadraticCurveTo(-24, -8, 0, -34)
      .fill(0xfaf3e4).stroke({ width: 4, color: 0xcdbf9f })
    g.moveTo(0, -30).lineTo(0, 32).stroke({ width: 3, color: 0xe2d6bf })
    g.moveTo(-11, -14).quadraticCurveTo(-16, 12, -10, 32).stroke({ width: 2.5, color: 0xe2d6bf })
    g.moveTo(11, -14).quadraticCurveTo(16, 12, 10, 32).stroke({ width: 2.5, color: 0xe2d6bf })
    g.moveTo(-4, -42).lineTo(4, -42).lineTo(0, -32).closePath().fill(0xcbbd9e)
    return g
  },

  agg: () => {
    const g = G()
    g.moveTo(0, -38).quadraticCurveTo(26, -16, 26, 6).quadraticCurveTo(26, 36, 0, 36)
      .quadraticCurveTo(-26, 36, -26, 6).quadraticCurveTo(-26, -16, 0, -38)
      .fill(0xfdf6e6).stroke({ width: 4, color: 0xdccfb4 })
    g.ellipse(9, 12, 12, 16).fill({ color: 0xe8dcc2, alpha: 0.55 })
    gloss(g, -9, -12, 8, 0.9)
    return g
  },

  kyckling: () => {
    const g = G()
    g.ellipse(6, -6, 26, 24).fill(topLightFill(0xc8813f))
    g.ellipse(2, -12, 16, 12).fill({ color: 0xe0a262, alpha: 0.7 })
    g.roundRect(-4, 8, 14, 30, 7).fill(0xf6ecd6).stroke({ width: 3, color: 0xdccfb4 })
    g.circle(-2, 38, 9).fill(0xf6ecd6).stroke({ width: 3, color: 0xdccfb4 })
    g.circle(12, 36, 8).fill(0xf6ecd6).stroke({ width: 3, color: 0xdccfb4 })
    return g
  },

  kott: () => {
    const g = G()
    g.moveTo(-34, -18).quadraticCurveTo(0, -34, 32, -14).quadraticCurveTo(40, 10, 16, 26)
      .quadraticCurveTo(-16, 34, -34, 12).closePath().fill(topLightFill(0xb2543c))
    g.moveTo(-30, -12).quadraticCurveTo(0, -26, 26, -10).stroke({ width: 7, color: 0xf2e3cd })
    g.ellipse(-4, 6, 14, 8).fill({ color: 0xd07a5c, alpha: 0.8 })
    return g
  },

  biff: () => {
    const g = G()
    g.moveTo(-32, -20).quadraticCurveTo(6, -30, 34, -8).quadraticCurveTo(34, 18, 4, 26)
      .quadraticCurveTo(-30, 26, -32, -20).closePath().fill(topLightFill(0xc0503f))
    g.ellipse(0, -2, 18, 12).fill({ color: 0xdd7360, alpha: 0.85 })
    g.moveTo(-20, 14).quadraticCurveTo(0, 22, 22, 10).stroke({ width: 5, color: 0xf0dcc4 })
    return g
  },

  stekt_agg: () => {
    const g = G()
    g.moveTo(-38, -6).quadraticCurveTo(-34, -30, -8, -28).quadraticCurveTo(6, -40, 24, -26)
      .quadraticCurveTo(44, -20, 36, 4).quadraticCurveTo(40, 26, 14, 26)
      .quadraticCurveTo(-8, 34, -22, 20).quadraticCurveTo(-42, 16, -38, -6)
      .fill(0xfdf8ec).stroke({ width: 4, color: 0xe4d6b8 })
    g.circle(2, -2, 16).fill(sphereFill(0xf5b52e))
    gloss(g, -3, -8, 6, 0.55)
    return g
  },

  blackfisk: () => {
    const g = ring(0xe6d3b8, 0xf7ecd8, 0xf3cd63, 32, 11)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.circle(Math.cos(a) * 26, Math.sin(a) * 26, 2.4).fill({ color: 0xcbb694, alpha: 0.9 })
    }
    return g
  },

  krabba: () => {
    const g = G()
    g.ellipse(0, 6, 30, 20).fill(topLightFill(0xe0563c))
    g.ellipse(-2, 0, 20, 10).fill({ color: 0xf58e70, alpha: 0.7 })
    for (const s of [-1, 1]) {
      g.moveTo(s * 24, 12).quadraticCurveTo(s * 40, 14, s * 42, 26).stroke({ width: 5, color: 0xe0563c, cap: 'round' })
      g.moveTo(s * 18, 18).quadraticCurveTo(s * 30, 26, s * 30, 34).stroke({ width: 5, color: 0xe0563c, cap: 'round' })
      g.circle(s * 34, -14, 11).fill(0xe0563c)
      g.moveTo(s * 34, -14).lineTo(s * 46, -24).lineTo(s * 42, -12).closePath().fill(0xf58e70)
    }
    face(g, 0, 2, 0.9, 0x3a2018)
    return g
  },

  atta_armar: () => {
    const g = G()
    for (let i = 0; i < 5; i++) {
      const x = -30 + i * 15
      g.moveTo(x, 10).quadraticCurveTo(x - 6, 28, x + 4, 38).stroke({ width: 7, color: 0xb86bc4, cap: 'round' })
    }
    g.ellipse(0, -6, 30, 28).fill(sphereFill(0xcf82da))
    g.ellipse(-6, -16, 16, 10).fill({ color: 0xe7b6ee, alpha: 0.7 })
    face(g, 0, -4, 1, 0x4a2352)
    return g
  },

  citron: () => {
    const g = disc(0xf0c832, 0xfbe98a, 34)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4
      g.moveTo(0, 0).lineTo(Math.cos(a) * 26, Math.sin(a) * 26).stroke({ width: 3, color: 0xfdf7d0 })
    }
    g.circle(0, 0, 4).fill(0xfdf7d0)
    return g
  },

  druvor: () => {
    const g = G()
    for (const [x, y] of [[-16, -6], [0, -12], [16, -6], [-8, 8], [8, 8], [0, 24]]) {
      g.circle(x, y, 12).fill(sphereFill(0x8e5fc0))
      gloss(g, x - 4, y - 5, 3.5, 0.4)
    }
    g.moveTo(0, -20).quadraticCurveTo(6, -32, 2, -38).stroke({ width: 4, color: 0x6a8f3c, cap: 'round' })
    g.moveTo(2, -34).quadraticCurveTo(18, -40, 20, -30).fill(0x74b84a)
    return g
  },

  choklad: () => {
    const g = G()
    g.roundRect(-34, -26, 68, 52, 6).fill(topLightFill(0x5c3520))
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        g.roundRect(-31 + c * 21, -23 + r * 24, 18, 21, 4).fill(topLightFill(0x7a4a2c))
      }
    }
    gloss(g, -22, -18, 5, 0.25)
    return g
  },

  godis: () => {
    const g = G()
    g.moveTo(-38, -14).lineTo(-20, -4).lineTo(-38, 14).closePath().fill(0xf07ab0)
    g.moveTo(38, -14).lineTo(20, -4).lineTo(38, 14).closePath().fill(0xf07ab0)
    g.roundRect(-22, -18, 44, 32, 14).fill(topLightFill(0xff9ec4))
    g.moveTo(-14, -12).quadraticCurveTo(0, 0, -10, 10).stroke({ width: 4, color: 0xfff0f6 })
    g.moveTo(4, -12).quadraticCurveTo(18, 0, 8, 10).stroke({ width: 4, color: 0xfff0f6 })
    return g
  },

  munk: () => {
    const g = G().circle(0, 0, 36).fill(topLightFill(0xd8a45e)).circle(0, 0, 30).fill(topLightFill(0xf3a8cd))
    g.circle(0, 0, 11).fill(0xfdf6e6)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 7
      const rr = 16 + (i % 3) * 5
      g.roundRect(Math.cos(a) * rr - 4, Math.sin(a) * rr - 1.5, 8, 3, 1.5)
        .fill([0xffe066, 0x6fc4e8, 0x8fd97a, 0xffffff][i % 4])
    }
    return g
  },

  kringla: () => {
    const g = G()
    g.moveTo(-34, -14).quadraticCurveTo(-4, -40, 0, -8).quadraticCurveTo(4, -40, 34, -14)
      .quadraticCurveTo(44, 10, 16, 26).quadraticCurveTo(0, 32, -16, 26)
      .quadraticCurveTo(-44, 10, -34, -14).stroke({ width: 13, color: 0xa9702f, cap: 'round' })
    for (const [x, y] of [[-20, -12], [16, -8], [0, 18], [-8, 2]]) g.circle(x, y, 2.2).fill(0xfdf6e6)
    return g
  },

  jordnot: () => {
    const g = G()
    g.circle(-14, -10, 20).fill(sphereFill(0xd9a86a, { highlight: 0.2, dark: 0.2 }))
    g.circle(14, 12, 22).fill(sphereFill(0xd9a86a, { highlight: 0.2, dark: 0.2 }))
    g.ellipse(0, 1, 16, 14).fill(sphereFill(0xd9a86a, { highlight: 0.2, dark: 0.2 }))
    for (const [x, y] of [[-14, -10], [14, 12]]) {
      g.circle(x - 6, y - 5, 3).fill({ color: 0xb9884a, alpha: 0.7 })
      g.circle(x + 5, y + 4, 3).fill({ color: 0xb9884a, alpha: 0.7 })
    }
    gloss(g, -20, -18, 5, 0.3)
    return g
  },

  kastanj: () => {
    const g = G()
    g.moveTo(0, -30).quadraticCurveTo(30, -18, 30, 8).quadraticCurveTo(30, 32, 0, 32)
      .quadraticCurveTo(-30, 32, -30, 8).quadraticCurveTo(-30, -18, 0, -30).fill(sphereFill(0x7d4a24))
    g.ellipse(0, 26, 20, 9).fill(0xe8d5ae)
    g.moveTo(-2, -30).lineTo(2, -30).lineTo(0, -40).closePath().fill(0x5c3520)
    gloss(g, -11, -12, 6, 0.28)
    return g
  },

  larv: () => {
    const g = G()
    for (let i = 0; i < 5; i++) {
      g.circle(-28 + i * 15, i % 2 ? 4 : -2, 15 - i * 0.8).fill(sphereFill(i % 2 ? 0x86c94e : 0x9bd960))
    }
    g.circle(30, -2, 16).fill(sphereFill(0x9bd960))
    face(g, 32, -4, 0.95, 0x36521f)
    g.moveTo(26, -16).lineTo(22, -28).stroke({ width: 3, color: 0x36521f, cap: 'round' })
    g.moveTo(36, -16).lineTo(40, -28).stroke({ width: 3, color: 0x36521f, cap: 'round' })
    return g
  },

  ben: () => {
    const g = G()
    // Kontur först (annars försvinner det vita benet mot den ljusa hyllan).
    for (const s of [-1, 1]) {
      g.circle(s * 28, -12, 15).fill(0xcbbd9e)
      g.circle(s * 28, 12, 15).fill(0xcbbd9e)
    }
    g.roundRect(-26, -11, 52, 22, 11).fill(0xcbbd9e)
    for (const s of [-1, 1]) {
      g.circle(s * 28, -12, 12).fill(0xf6efdc)
      g.circle(s * 28, 12, 12).fill(0xf6efdc)
    }
    g.roundRect(-24, -8, 48, 16, 8).fill(0xf6efdc)
    g.roundRect(-18, -4, 36, 5, 3).fill({ color: 0xdcd0b4, alpha: 0.7 })
    return g
  },

  aubergine: () => {
    const g = G()
    g.moveTo(0, -18).quadraticCurveTo(28, -14, 28, 10).quadraticCurveTo(28, 38, 0, 38)
      .quadraticCurveTo(-28, 38, -28, 10).quadraticCurveTo(-28, -14, 0, -18).fill(sphereFill(0x7b47a8))
    g.ellipse(-9, 8, 8, 16).fill({ color: 0xa877cf, alpha: 0.6 })
    g.moveTo(-18, -16).quadraticCurveTo(0, -26, 18, -16).quadraticCurveTo(0, -6, -18, -16).fill(0x5faa42)
    g.moveTo(0, -20).lineTo(0, -38).stroke({ width: 6, color: 0x5faa42, cap: 'round' })
    return g
  },

  zucchini: () => {
    const g = disc(0x3d7f33, 0xd7ecc0, 34, 6)
    g.circle(0, 0, 20).fill(0xeaf6dd)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      g.ellipse(Math.cos(a) * 11, Math.sin(a) * 11, 3, 4).fill(0xb9d69a)
    }
    return g
  },

  basilika: () => leaf(0x4e9c3f, 0x2f6b26),
  spenat: () => leaf(0x2f7a34, 0x1d5322, 32, 38),
  ruccola: () => {
    const g = G()
    g.moveTo(0, 40).quadraticCurveTo(-4, 0, 0, -40).stroke({ width: 4, color: 0x3f8a34, cap: 'round' })
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const y = 16 - i * 18
        g.moveTo(0, y).quadraticCurveTo(s * 20, y - 12, s * 26, y - 2)
          .quadraticCurveTo(s * 16, y + 8, 0, y).fill(0x62b04a)
      }
    }
    g.moveTo(-8, -40).quadraticCurveTo(0, -52, 8, -40).quadraticCurveTo(0, -32, -8, -40).fill(0x62b04a)
    return g
  },

  korv: () => {
    const g = G()
    g.roundRect(-42, -12, 84, 26, 13).fill(cylinderFill(0xc46a3a, { axis: 'x' }))
    g.roundRect(-38, -8, 76, 8, 4).fill({ color: 0xe08f5d, alpha: 0.7 })
    g.moveTo(-32, 2).quadraticCurveTo(-16, -8, 0, 2).quadraticCurveTo(16, 12, 32, 2)
      .stroke({ width: 6, color: 0xf5c542, cap: 'round' })
    return g
  },

  avokado: () => {
    const g = G()
    g.moveTo(0, -34).quadraticCurveTo(26, -22, 26, 6).quadraticCurveTo(26, 36, 0, 36)
      .quadraticCurveTo(-26, 36, -26, 6).quadraticCurveTo(-26, -22, 0, -34).fill(topLightFill(0x4e7a2c))
    g.moveTo(0, -28).quadraticCurveTo(20, -18, 20, 6).quadraticCurveTo(20, 30, 0, 30)
      .quadraticCurveTo(-20, 30, -20, 6).quadraticCurveTo(-20, -18, 0, -28).fill(topLightFill(0xc8dd7a))
    g.circle(0, 8, 13).fill(sphereFill(0x8a5a33))
    gloss(g, -4, 3, 4, 0.3)
    return g
  },

  scampi: () => {
    const g = G()
    for (let i = 0; i < 5; i++) {
      const a = -0.4 + i * 0.4
      g.circle(Math.cos(a) * 24 - 4, Math.sin(a) * 22, 15 - i).fill(sphereFill(i % 2 ? 0xf2b28a : 0xe09a6e))
    }
    g.moveTo(-14, -20).lineTo(-32, -30).lineTo(-28, -12).closePath().fill(0xf58e70)
    for (let i = 0; i < 12; i++) {
      const a = i * 1.7
      g.circle(Math.cos(a) * 18 - 4, Math.sin(a) * 16, 2).fill({ color: 0xfae2c4, alpha: 0.85 })
    }
    return g
  },

  banan: () => {
    const g = G()
    g.moveTo(-30, -26).quadraticCurveTo(6, -18, 30, 22).quadraticCurveTo(20, 32, 8, 26)
      .quadraticCurveTo(-14, 4, -36, -18).closePath().fill(topLightFill(0xf5d33e))
    g.moveTo(-26, -22).quadraticCurveTo(4, -12, 24, 20).stroke({ width: 4, color: 0xfceb9b })
    g.circle(30, 24, 5).fill(0x7d5a2c)
    g.circle(-33, -24, 5).fill(0x7d5a2c)
    return g
  },

  mango: () => {
    const g = G()
    g.moveTo(-6, -30).quadraticCurveTo(30, -26, 30, 4).quadraticCurveTo(30, 34, -2, 34)
      .quadraticCurveTo(-30, 34, -28, 4).quadraticCurveTo(-26, -24, -6, -30).fill(sphereFill(0xef8b32))
    g.ellipse(6, -6, 16, 18).fill({ color: 0xfac557, alpha: 0.75 })
    g.moveTo(-6, -30).quadraticCurveTo(-2, -40, 6, -42).stroke({ width: 4, color: 0x5faa42, cap: 'round' })
    gloss(g, -10, -10, 6, 0.35)
    return g
  },

  stjarna: () => {
    const g = G()
    g.star(0, 0, 5, 38, 17).fill(topLightFill(0xffd35c)).stroke({ width: 4, color: 0xf0ad2a })
    g.star(0, -3, 5, 20, 9).fill({ color: 0xfff0b8, alpha: 0.8 })
    return g
  },

  // ------------------------------------------------- äckligt-roliga (fnissiga)

  bajs: () => {
    const g = G()
    g.moveTo(-32, 34).quadraticCurveTo(-34, 12, -20, 8).quadraticCurveTo(-26, -8, -12, -12)
      .quadraticCurveTo(-14, -30, 0, -32).quadraticCurveTo(14, -30, 12, -12)
      .quadraticCurveTo(26, -8, 20, 8).quadraticCurveTo(34, 12, 32, 34).closePath().fill(topLightFill(0x8a5a33))
    g.moveTo(-22, 12).quadraticCurveTo(0, 20, 22, 12).stroke({ width: 4, color: 0x6d4425 })
    g.moveTo(-14, -8).quadraticCurveTo(0, -2, 14, -8).stroke({ width: 4, color: 0x6d4425 })
    face(g, 0, 4, 1, 0x3a2411)
    gloss(g, -12, -22, 5, 0.3)
    return g
  },

  strumpa: () => sock(0x6fc4e8, 0xfdf6e6, false),
  smutsig_strumpa: () => sock(0x9a8a62, 0xd6c9a4, true),

  tand: () => {
    const g = G()
    g.moveTo(-26, -22).quadraticCurveTo(0, -32, 26, -22).lineTo(22, 8)
      .quadraticCurveTo(18, 34, 8, 34).quadraticCurveTo(2, 34, 0, 12)
      .quadraticCurveTo(-2, 34, -8, 34).quadraticCurveTo(-18, 34, -22, 8).closePath().fill(0xfdfaf0)
    g.stroke({ width: 3, color: 0xe2dac6 })
    gloss(g, -10, -12, 7, 0.9)
    return g
  },

  mask: () => {
    const g = G()
    for (let i = 0; i < 6; i++) {
      const x = -30 + i * 13
      g.circle(x, Math.sin(i * 1.1) * 9, 13 - i * 0.5).fill(sphereFill(i % 2 ? 0xf29ab0 : 0xe8879e))
    }
    g.circle(34, Math.sin(6 * 1.1) * 9, 13).fill(sphereFill(0xf29ab0))
    face(g, 35, Math.sin(6.6) * 9 - 2, 0.8, 0x8a4256)
    return g
  },

  tandborste: () => {
    const g = G()
    g.roundRect(-44, -6, 62, 13, 6).fill(cylinderFill(0x6fc4e8, { axis: 'x' }))
    g.roundRect(14, -9, 30, 19, 8).fill(topLightFill(0x4aa3df))
    for (let i = 0; i < 5; i++) {
      g.roundRect(16 + i * 6, -22, 4, 14, 2).fill(0xfdf6e6)
    }
    gloss(g, -28, -2, 3.5, 0.4)
    return g
  },

  spindel: () => {
    const g = G()
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const y = -10 + i * 12
        g.moveTo(s * 14, y).quadraticCurveTo(s * 34, y - 8, s * 40, y + 10)
          .stroke({ width: 4, color: 0x4a3d52, cap: 'round' })
      }
    }
    g.ellipse(0, 6, 24, 20).fill(sphereFill(0x5d4d68))
    g.circle(0, -14, 15).fill(sphereFill(0x6f5c7c))
    g.circle(-6, -16, 4.5).fill(0xfdf6e6)
    g.circle(6, -16, 4.5).fill(0xfdf6e6)
    g.circle(-6, -15, 2.4).fill(0x2f2a26)
    g.circle(6, -15, 2.4).fill(0x2f2a26)
    return g
  },

  snigel: () => {
    const g = G()
    g.moveTo(-42, 26).quadraticCurveTo(-30, 12, -8, 14).lineTo(24, 14)
      .quadraticCurveTo(34, 14, 34, 22).quadraticCurveTo(34, 30, 22, 30).lineTo(-42, 30).closePath()
      .fill(topLightFill(0xd7c48f))
    g.circle(4, 0, 24).fill(sphereFill(0xb5734a))
    for (const r of [17, 10, 4]) g.circle(4, 0, r).stroke({ width: 4, color: 0x8a5a33 })
    g.moveTo(-34, 16).lineTo(-40, -2).stroke({ width: 3.5, color: 0xd7c48f, cap: 'round' })
    g.moveTo(-26, 16).lineTo(-28, -4).stroke({ width: 3.5, color: 0xd7c48f, cap: 'round' })
    g.circle(-40, -4, 3.5).fill(0x2f2a26)
    g.circle(-28, -6, 3.5).fill(0x2f2a26)
    return g
  },

  mogelost: () => {
    const g = cheeseWedge(0xe4dd8e, 0xf2eec0, 0xa8c46a)
    for (const [x, y, r] of [[6, -4, 6], [22, -14, 4], [-6, 12, 5], [18, 8, 4], [-18, 16, 4]]) {
      g.circle(x, y, r).fill({ color: 0x7f9c46, alpha: 0.85 })
    }
    return g
  },

  groda: () => {
    const g = G()
    g.ellipse(0, 10, 32, 22).fill(topLightFill(0x62b04a))
    g.ellipse(0, 16, 20, 11).fill({ color: 0xc8e39a, alpha: 0.9 })
    for (const s of [-1, 1]) {
      g.ellipse(s * 30, 22, 12, 8).fill(0x4e9c3f)
      g.circle(s * 13, -12, 13).fill(0x62b04a)
      g.circle(s * 13, -13, 8).fill(0xfdf6e6)
      g.circle(s * 13, -12, 4.5).fill(0x2f2a26)
    }
    g.moveTo(-13, 8).quadraticCurveTo(0, 18, 13, 8).stroke({ width: 3.5, color: 0x2f5b25, cap: 'round' })
    return g
  },

  fluga: () => {
    const g = G()
    for (const s of [-1, 1]) {
      g.ellipse(s * 24, -14, 20, 11).fill({ color: 0xbfe0ef, alpha: 0.75 })
    }
    g.ellipse(0, 8, 22, 17).fill(0x4a4450)
    g.circle(0, -10, 15).fill(0x5d5668)
    g.circle(-6, -12, 5.5).fill(0xd8402c)
    g.circle(6, -12, 5.5).fill(0xd8402c)
    g.moveTo(-8, -22).lineTo(-14, -32).stroke({ width: 3, color: 0x4a4450, cap: 'round' })
    g.moveTo(8, -22).lineTo(14, -32).stroke({ width: 3, color: 0x4a4450, cap: 'round' })
    return g
  },

  gulligt_monster: () => {
    const g = G()
    g.moveTo(-28, 30).lineTo(-28, -6).quadraticCurveTo(-28, -34, 0, -34)
      .quadraticCurveTo(28, -34, 28, -6).lineTo(28, 30)
      .lineTo(16, 20).lineTo(6, 30).lineTo(-6, 20).lineTo(-16, 30).closePath().fill(topLightFill(0xa78bfa))
    g.circle(0, -10, 14).fill(0xfdf6e6)
    g.circle(2, -9, 7).fill(0x2f2a26)
    g.moveTo(-12, 8).quadraticCurveTo(0, 18, 12, 8).stroke({ width: 3.5, color: 0x5b3fa8, cap: 'round' })
    for (const s of [-1, 1]) g.moveTo(s * 16, -32).lineTo(s * 22, -44).stroke({ width: 4, color: 0xa78bfa, cap: 'round' })
    for (const s of [-1, 1]) g.circle(s * 22, -46, 5).fill(0xffd35c)
    return g
  },

  prutt: () => {
    const g = G()
    for (const [x, y, r, a] of [[-18, 8, 20, 0.55], [6, -2, 24, 0.5], [24, 14, 16, 0.45], [-4, 20, 15, 0.4]]) {
      g.circle(x, y, r).fill({ color: 0x9bc46a, alpha: a })
    }
    g.moveTo(-34, 26).quadraticCurveTo(-18, 18, -6, 26).stroke({ width: 4, color: 0x8ab35c, cap: 'round' })
    g.moveTo(10, 30).quadraticCurveTo(24, 24, 34, 30).stroke({ width: 4, color: 0x8ab35c, cap: 'round' })
    return g
  },

  // Grön snorklump med glans och droppe.
  snor: () => {
    const g = G()
      .circle(0, -4, 26).fill(sphereFill(0x8bc34a))
      .circle(-16, 12, 15).fill(sphereFill(0x8bc34a))
      .circle(15, 14, 12).fill(sphereFill(0x8bc34a))
      .circle(8, 34, 7).fill(sphereFill(0x9ccc65))
    gloss(g, -8, -12, 7, 0.35)
    return g
  },

  // Fiskskelett: huvud + ryggrad + revben + stjärtfena.
  fiskben: () => {
    const g = G()
    g.moveTo(-14, 0).lineTo(30, 0).stroke({ width: 6, color: 0xf2ecd8, cap: 'round' })
    for (const x of [-4, 6, 16, 26]) {
      g.moveTo(x, -13).lineTo(x, 13).stroke({ width: 5, color: 0xf2ecd8, cap: 'round' })
    }
    g.poly([30, 0, 44, -13, 44, 13]).fill(0xf2ecd8)
    g.circle(-24, 0, 13).fill(0xf2ecd8)
    g.circle(-28, -3, 3).fill(0x3a3430)
    return g
  },

  // Brun lerplask.
  lera: () => {
    const g = G()
      .circle(0, 2, 26).fill(0x8a5a33)
      .circle(-22, -4, 12).fill(0x8a5a33)
      .circle(20, 8, 11).fill(0x8a5a33)
      .circle(4, -20, 9).fill(0x8a5a33)
      .circle(-8, 24, 8).fill(0x8a5a33)
    g.circle(-6, -6, 6).fill({ color: 0xa9744a, alpha: 0.8 })
    return g
  },

  // Gul kissdroppe.
  kissdroppe: () => {
    const g = G()
    g.moveTo(0, -34).quadraticCurveTo(20, -6, 20, 8).quadraticCurveTo(20, 30, 0, 30)
      .quadraticCurveTo(-20, 30, -20, 8).quadraticCurveTo(-20, -6, 0, -34)
      .fill(sphereFill(0xf6d84a)).stroke({ width: 4, color: 0xd9b52e })
    gloss(g, -6, 8, 5, 0.55)
    return g
  },

  // Använd blöja: vit blöja med tejpflikar + brun överraskning.
  anvand_bloja: () => {
    const g = G()
      .roundRect(-36, -18, 12, 12, 4).fill(0xbfe3f0)
      .roundRect(24, -18, 12, 12, 4).fill(0xbfe3f0)
      .roundRect(-32, -22, 64, 26, 10).fill(0xfdfcf4).stroke({ width: 4, color: 0xd8d2c0 })
      .roundRect(-22, -6, 44, 32, 16).fill(0xfdfcf4).stroke({ width: 4, color: 0xd8d2c0 })
      .circle(0, 10, 8).fill(0xa9743f)
      .circle(8, 14, 5).fill(0x8a5a33)
    return g
  },

  // Blå potta med handtag.
  potta: () => {
    const g = G()
      .ellipse(0, 24, 22, 7).fill(0x4a92c8)
      .roundRect(-26, -8, 52, 32, 14).fill(topLightFill(0x62b1e8)).stroke({ width: 4, color: 0x4a92c8 })
      .ellipse(0, -8, 26, 9).fill(0x8fd0f5).stroke({ width: 4, color: 0x4a92c8 })
    g.circle(31, 4, 8).stroke({ width: 5, color: 0x4a92c8 })
    return g
  },

  // ------------------------------------------------------------- specialarna
  // Roller, inte namn (CLAUDE.md: namngivna människor är bara Zacke/Alissa/Elvira/Lova).

  pappa: () => {
    const g = G()
    g.roundRect(-24, 4, 48, 34, 16).fill(0x4aa3df)
    g.circle(0, -8, 26).fill(0xf5c9a0)
    g.moveTo(-26, -14).quadraticCurveTo(-20, -38, 0, -38).quadraticCurveTo(20, -38, 26, -14)
      .quadraticCurveTo(0, -26, -26, -14).fill(0x6d4425)
    g.moveTo(-18, 6).quadraticCurveTo(0, 30, 18, 6).quadraticCurveTo(0, 14, -18, 6).fill(0x6d4425)
    g.circle(-9, -8, 3.6).fill(0x2f2a26)
    g.circle(9, -8, 3.6).fill(0x2f2a26)
    g.moveTo(-7, 2).quadraticCurveTo(0, 8, 7, 2).stroke({ width: 2.6, color: 0x2f2a26, cap: 'round' })
    return g
  },

  mamma: () => {
    const g = G()
    g.roundRect(-24, 4, 48, 34, 16).fill(0xf07ab0)
    g.moveTo(-30, 10).quadraticCurveTo(-34, -34, 0, -34).quadraticCurveTo(34, -34, 30, 10)
      .quadraticCurveTo(22, 2, 22, -10).quadraticCurveTo(0, -18, -22, -10)
      .quadraticCurveTo(-22, 2, -30, 10).fill(0xc98a3c)
    g.circle(0, -6, 25).fill(0xf5c9a0)
    g.moveTo(-26, -12).quadraticCurveTo(-20, -34, 0, -34).quadraticCurveTo(20, -34, 26, -12)
      .quadraticCurveTo(0, -24, -26, -12).fill(0xc98a3c)
    g.circle(-9, -6, 3.6).fill(0x2f2a26)
    g.circle(9, -6, 3.6).fill(0x2f2a26)
    g.moveTo(-7, 4).quadraticCurveTo(0, 10, 7, 4).stroke({ width: 2.6, color: 0x2f2a26, cap: 'round' })
    return g
  },
}

export default DRAW
