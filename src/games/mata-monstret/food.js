// Handritad, glansig och gullig MAT byggd helt med Pixi Graphics (ingen emoji, ingen
// tallrik). Varje mat är en Container centrerad i (0,0), ca 120–140 px, med kontur +
// mjuk dager + karaktärsfulla detaljer. Allt är dekorativt (eventMode 'none') — själva
// gripytan sätts av spelet (index.js) på en yttre behållare. Maten är spelets blickfång.
//
// API:
//   import { FOODS, makeFood, foodCat } from './food.js'
//   FOODS   -> [{ key:'apple', cat:'frukt', draw(scale=1){...Container} }, ...]
//   makeFood(key, scale=1) -> färsk Container med konstverket (skalad)
//   foodCat(key) -> 'frukt' | 'gronsaker' | 'godis'
import { Container, Graphics } from 'pixi.js'

// --- små färg-hjälpare (mörkare kontur / ljusare dager) ---
function darken(hex, amt = 0.25) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

// =================== Frukt ===================

function buildApple() {
  const c = new Container()
  const stem = new Graphics().roundRect(-3, -52, 6, 18, 3).fill(0x7a4a25)
  const leaf = new Graphics()
  leaf.ellipse(0, 0, 16, 9).fill(0x6fbf52).stroke({ width: 3, color: 0x4f9a38 })
  leaf.moveTo(-12, 0).lineTo(12, 0).stroke({ width: 2, color: 0x3f7d2c, alpha: 0.7 })
  leaf.position.set(18, -44)
  leaf.rotation = -0.25
  const body = new Graphics().ellipse(0, 8, 54, 56).fill(0xe23b3b).stroke({ width: 6, color: 0xa31f1f })
  const dimple = new Graphics().ellipse(0, -42, 16, 8).fill({ color: 0x9a1d1d, alpha: 0.35 })
  const crease = new Graphics().moveTo(3, -28).quadraticCurveTo(11, 12, 3, 56).stroke({ width: 3, color: 0xb02a2a, alpha: 0.4 })
  const shine = new Graphics().ellipse(-22, -8, 16, 24).fill({ color: 0xffffff, alpha: 0.45 })
  c.addChild(body, dimple, stem, leaf, crease, shine)
  return c
}

function buildBanana() {
  const c = new Container()
  const body = new Graphics()
  body
    .moveTo(-54, -4)
    .quadraticCurveTo(-6, -58, 52, -12)
    .quadraticCurveTo(62, 2, 50, 8)
    .quadraticCurveTo(40, 2, 34, 2)
    .quadraticCurveTo(-2, -34, -44, 2)
    .quadraticCurveTo(-56, 4, -54, -4)
    .fill(0xffce3a)
    .stroke({ width: 6, color: 0xd99a1f })
  const ridge = new Graphics().moveTo(-44, -4).quadraticCurveTo(-4, -46, 46, -12).stroke({ width: 4, color: 0xf4e08a, alpha: 0.85 })
  const tipL = new Graphics().circle(-52, -2, 6).fill(0x6e4a1e)
  const tipR = new Graphics().circle(50, -9, 6).fill(0x6e4a1e)
  const shine = new Graphics().moveTo(-38, 2).quadraticCurveTo(-4, -28, 38, -6).stroke({ width: 3, color: 0xffffff, alpha: 0.4 })
  c.addChild(body, ridge, tipL, tipR, shine)
  return c
}

function buildStrawberry() {
  const c = new Container()
  const body = new Graphics()
  body
    .moveTo(-46, -22)
    .quadraticCurveTo(0, -44, 46, -22)
    .quadraticCurveTo(44, 24, 0, 58)
    .quadraticCurveTo(-44, 24, -46, -22)
    .fill(0xe83a4a)
    .stroke({ width: 6, color: 0xb31f30 })
  const seeds = new Graphics()
  const sp = [[-26, -6], [-6, 4], [16, -8], [28, 10], [-18, 18], [4, 26], [-30, 16], [22, -22], [0, -14], [-12, -22], [12, 14]]
  for (const [x, y] of sp) seeds.ellipse(x, y, 3.2, 5).fill(0xffe27a)
  const cap = new Graphics().ellipse(0, -26, 17, 9).fill(0x5cae46)
  const leaf = new Graphics()
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.5
    leaf.moveTo(0, -24).lineTo(Math.sin(a) * 30, -26 - Math.cos(a) * 22).lineTo(Math.sin(a) * 12, -20)
  }
  leaf.fill(0x5cae46).stroke({ width: 2, color: 0x3f8a30 })
  const shine = new Graphics().ellipse(-18, -2, 9, 14).fill({ color: 0xffffff, alpha: 0.4 })
  c.addChild(body, seeds, cap, leaf, shine)
  return c
}

function buildCherry() {
  const c = new Container()
  const stalk = new Graphics()
  stalk.moveTo(-16, 20).quadraticCurveTo(-6, -30, 4, -40).stroke({ width: 5, color: 0x6e9a3a })
  stalk.moveTo(20, 24).quadraticCurveTo(14, -22, 4, -40).stroke({ width: 5, color: 0x6e9a3a })
  const leaf = new Graphics().ellipse(0, 0, 16, 8).fill(0x6fbf52).stroke({ width: 2, color: 0x4f9a38 })
  leaf.position.set(20, -44)
  leaf.rotation = -0.4
  const c1 = new Graphics().circle(-16, 24, 22).fill(0xd62b3a).stroke({ width: 5, color: 0x9c1c28 })
  const c2 = new Graphics().circle(20, 28, 22).fill(0xe23b4a).stroke({ width: 5, color: 0x9c1c28 })
  const s1 = new Graphics().circle(-22, 16, 6).fill({ color: 0xffffff, alpha: 0.5 })
  const s2 = new Graphics().circle(14, 20, 6).fill({ color: 0xffffff, alpha: 0.5 })
  c.addChild(stalk, leaf, c1, c2, s1, s2)
  return c
}

function buildGrape() {
  const c = new Container()
  const stem = new Graphics().roundRect(-3, -50, 6, 16, 3).fill(0x7a4a25)
  const leaf = new Graphics().ellipse(0, 0, 14, 9).fill(0x6fbf52).stroke({ width: 2, color: 0x4f9a38 })
  leaf.position.set(16, -46)
  leaf.rotation = -0.3
  const berries = new Graphics()
  const pos = [[0, -30], [-22, -12], [22, -12], [-36, 8], [0, 6], [36, 8], [-20, 26], [20, 26], [0, 44]]
  for (const [x, y] of pos) berries.circle(x, y, 15).fill(0x8e6bd0).stroke({ width: 3, color: 0x6a48ad })
  const shines = new Graphics()
  for (const [x, y] of [[-22, -16], [0, 2], [20, 22]]) shines.circle(x - 4, y - 4, 4).fill({ color: 0xffffff, alpha: 0.5 })
  c.addChild(stem, leaf, berries, shines)
  return c
}

function buildOrange() {
  const c = new Container()
  const body = new Graphics().circle(0, 6, 52).fill(0xff9e2c).stroke({ width: 6, color: 0xd9791a })
  const pores = new Graphics()
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * 44
    pores.circle(Math.cos(a) * r, 6 + Math.sin(a) * r, 1.6).fill({ color: 0xe07d12, alpha: 0.5 })
  }
  const stem = new Graphics().roundRect(-3, -50, 6, 12, 3).fill(0x6e4a1e)
  const leaf = new Graphics().ellipse(0, 0, 16, 9).fill(0x5cae46).stroke({ width: 2, color: 0x3f8a30 })
  leaf.position.set(14, -44)
  leaf.rotation = -0.3
  const shine = new Graphics().ellipse(-20, -12, 14, 20).fill({ color: 0xffffff, alpha: 0.4 })
  c.addChild(body, pores, stem, leaf, shine)
  return c
}

function buildWatermelon() {
  const c = new Container()
  const flesh = new Graphics().arc(0, -6, 52, 0, Math.PI).fill(0xf2566a)
  const white = new Graphics().arc(0, -6, 52, 0, Math.PI).stroke({ width: 8, color: 0xfff3f0 })
  const rind = new Graphics().arc(0, -6, 57, 0, Math.PI).stroke({ width: 12, color: 0x5fae3f })
  const rindDark = new Graphics().arc(0, -6, 57, 0, Math.PI).stroke({ width: 4, color: 0x3f8a2c })
  const seeds = new Graphics()
  for (const [x, y] of [[-24, 16], [0, 24], [24, 16], [-12, 34], [12, 34], [0, 8]]) seeds.ellipse(x, y, 3.2, 5.4).fill(0x2c2218)
  const shine = new Graphics().ellipse(-18, 8, 10, 6).fill({ color: 0xffffff, alpha: 0.3 })
  c.addChild(flesh, white, rind, rindDark, seeds, shine)
  return c
}

function buildPear() {
  const c = new Container()
  const stem = new Graphics().roundRect(-3, -54, 6, 16, 3).fill(0x7a4a25)
  stem.rotation = 0.1
  const leaf = new Graphics().ellipse(0, 0, 14, 8).fill(0x6fbf52).stroke({ width: 2, color: 0x4f9a38 })
  leaf.position.set(16, -48)
  leaf.rotation = -0.3
  const body = new Graphics()
  body.circle(0, 22, 40).circle(0, -16, 26).fill(0xbfd84a)
  const ol = new Graphics()
  ol.circle(0, 22, 40).stroke({ width: 6, color: 0x8aa72f, alpha: 0.9 })
  ol.circle(0, -16, 26).stroke({ width: 6, color: 0x8aa72f, alpha: 0.9 })
  const freck = new Graphics()
  for (const [x, y] of [[10, 30], [-6, 40], [16, 12]]) freck.circle(x, y, 2).fill({ color: 0x9bbf3a, alpha: 0.7 })
  const shine = new Graphics().ellipse(-16, 14, 12, 18).fill({ color: 0xffffff, alpha: 0.4 })
  c.addChild(body, ol, stem, leaf, freck, shine)
  return c
}

// =================== Grönsaker ===================

function buildCarrot() {
  const c = new Container()
  const tops = new Graphics()
  for (const a of [-0.4, -0.1, 0.2, 0.5]) tops.moveTo(0, -28).quadraticCurveTo(Math.sin(a) * 18, -58, Math.sin(a) * 30, -66)
  tops.stroke({ width: 7, color: 0x4f9a38, cap: 'round' })
  const root = new Graphics().moveTo(-26, -30).lineTo(26, -30).lineTo(0, 58).closePath().fill(0xff8a2c).stroke({ width: 6, color: 0xd9701a })
  const ridges = new Graphics()
  for (const y of [-14, 2, 18, 34]) {
    const w = 22 * (1 - (y + 30) / 92)
    ridges.moveTo(-w, y).lineTo(w, y).stroke({ width: 3, color: 0xe0791a, alpha: 0.7 })
  }
  const shine = new Graphics().moveTo(-12, -22).lineTo(-4, 40).stroke({ width: 4, color: 0xffffff, alpha: 0.35 })
  c.addChild(tops, root, ridges, shine)
  return c
}

function buildBroccoli() {
  const c = new Container()
  const stalk = new Graphics().roundRect(-14, 6, 28, 48, 12).fill(0xbfd89a).stroke({ width: 5, color: 0x8fae6a })
  const fp = [[0, -34], [-26, -22], [26, -22], [-14, -6], [14, -6], [0, -16], [-34, -4], [34, -4]]
  const florets = new Graphics()
  for (const [x, y] of fp) florets.circle(x, y, 18).fill(0x4f9a3a)
  const bump = new Graphics()
  for (const [x, y] of fp) {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * 6.28
      const r = Math.random() * 12
      bump.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, 5).fill(0x3f8a2c)
    }
  }
  const ol = new Graphics()
  for (const [x, y] of fp) ol.circle(x, y, 18).stroke({ width: 3, color: 0x357326, alpha: 0.5 })
  const shine = new Graphics().circle(-10, -26, 6).fill({ color: 0xffffff, alpha: 0.3 })
  c.addChild(stalk, florets, bump, ol, shine)
  return c
}

function buildCorn() {
  const c = new Container()
  const husk = new Graphics()
  husk.moveTo(-10, 42).quadraticCurveTo(-40, 30, -34, -6).quadraticCurveTo(-22, 30, -8, 36).fill(0x6fae3a).stroke({ width: 3, color: 0x4f8a2c })
  husk.moveTo(10, 42).quadraticCurveTo(40, 30, 34, -6).quadraticCurveTo(22, 30, 8, 36).fill(0x6fae3a).stroke({ width: 3, color: 0x4f8a2c })
  const cob = new Graphics().ellipse(0, 2, 28, 46).fill(0xffd84a).stroke({ width: 6, color: 0xe0b020 })
  const kernels = new Graphics()
  for (let r = 0; r < 7; r++) {
    for (let col = -2; col <= 2; col++) {
      const x = col * 11 + (r % 2 ? 5 : 0)
      const y = -34 + r * 11
      if (Math.abs(x) < 26 - Math.abs(y) * 0.15) kernels.circle(x, y, 4.5).fill({ color: 0xffe46a, alpha: 0.95 }).stroke({ width: 1, color: 0xe0b020, alpha: 0.6 })
    }
  }
  const shine = new Graphics().ellipse(-12, -10, 7, 18).fill({ color: 0xffffff, alpha: 0.3 })
  c.addChild(husk, cob, kernels, shine)
  return c
}

function buildTomato() {
  const c = new Container()
  const body = new Graphics().ellipse(0, 8, 52, 46).fill(0xe83a3a).stroke({ width: 6, color: 0xb31f1f })
  const calyx = new Graphics()
  for (const a of [-1.0, -0.5, 0, 0.5, 1.0]) calyx.moveTo(0, -30).lineTo(Math.sin(a) * 22, -30 - Math.cos(a) * 16).lineTo(Math.sin(a) * 8, -24)
  calyx.fill(0x4f9a3a).stroke({ width: 2, color: 0x357326 })
  const stem = new Graphics().roundRect(-4, -44, 8, 14, 3).fill(0x4f9a3a)
  const shine = new Graphics().ellipse(-20, -6, 14, 18).fill({ color: 0xffffff, alpha: 0.4 })
  c.addChild(body, stem, calyx, shine)
  return c
}

// =================== Godis ===================

function buildCookie() {
  const c = new Container()
  const body = new Graphics().circle(0, 4, 52).fill(0xddb066).stroke({ width: 6, color: 0xb98a44 })
  const chips = new Graphics()
  for (const [x, y] of [[-22, -12], [10, -20], [24, 6], [-10, 18], [6, 26], [-28, 12], [18, -4], [0, -2]]) chips.circle(x, y + 4, 6).fill(0x5a3a22)
  const crumbs = new Graphics()
  for (const [x, y] of [[-14, -2], [14, 16], [-2, -18]]) crumbs.circle(x, y + 4, 2.2).fill(0x7a5230)
  const shine = new Graphics().ellipse(-20, -14, 12, 8).fill({ color: 0xffffff, alpha: 0.25 })
  c.addChild(body, chips, crumbs, shine)
  return c
}

function buildCupcake() {
  const c = new Container()
  const wrap = new Graphics().moveTo(-38, 2).lineTo(38, 2).lineTo(30, 52).lineTo(-30, 52).closePath().fill(0xf2a65a).stroke({ width: 5, color: 0xd1843a })
  const lines = new Graphics()
  for (const x of [-20, -7, 7, 20]) lines.moveTo(x, 4).lineTo(x * 0.78, 50).stroke({ width: 3, color: 0xd1843a, alpha: 0.6 })
  const frosting = new Graphics()
  frosting.ellipse(0, -2, 40, 18).fill(0xfff0f4)
  frosting.ellipse(0, -16, 30, 16).fill(0xffd1e0)
  frosting.ellipse(0, -30, 20, 14).fill(0xffb3d0)
  frosting.ellipse(0, -42, 11, 10).fill(0xff9ec4)
  const fol = new Graphics().ellipse(0, -2, 40, 18).stroke({ width: 4, color: 0xf3a7c4, alpha: 0.6 })
  const sprinkles = new Graphics()
  const cols = [0xff6b6b, 0x4aa3df, 0xffd35c, 0x5bbf6a, 0xa78bfa]
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() * 2 - 1) * 28
    const y = -30 + Math.random() * 26
    sprinkles.roundRect(x, y, 7, 3, 1.5).fill(cols[i % cols.length])
  }
  const cherry = new Graphics().circle(0, -50, 7).fill(0xe23b3a).stroke({ width: 2, color: 0x9c1c28 })
  c.addChild(wrap, lines, frosting, fol, sprinkles, cherry)
  return c
}

function buildDonut() {
  const c = new Container()
  const dough = new Graphics().circle(0, 4, 46).stroke({ width: 30, color: 0xe0a85c })
  const glaze = new Graphics().circle(0, 1, 46).stroke({ width: 22, color: 0xf06ea9 })
  const drips = new Graphics()
  for (const [x, y] of [[-26, 40], [6, 46], [34, 38]]) drips.circle(x, y, 8).fill(0xf06ea9)
  const sprinkles = new Graphics()
  const cols = [0xffffff, 0xffd35c, 0x4aa3df, 0x5bbf6a, 0xff6b6b]
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3
    const x = Math.cos(a) * 46
    const y = 1 + Math.sin(a) * 46
    const dx = Math.cos(a + Math.PI / 2) * 5
    const dy = Math.sin(a + Math.PI / 2) * 5
    sprinkles.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ width: 4, color: cols[i % cols.length], cap: 'round' })
  }
  const shine = new Graphics().arc(0, 1, 46, Math.PI * 1.05, Math.PI * 1.5).stroke({ width: 6, color: 0xffffff, alpha: 0.4 })
  c.addChild(dough, glaze, drips, sprinkles, shine)
  return c
}

function buildCandy() {
  const c = new Container()
  const wrapL = new Graphics().moveTo(-30, 0).lineTo(-54, -16).lineTo(-54, 16).closePath().fill(0xff7aa8).stroke({ width: 4, color: 0xd94f82 })
  const wrapR = new Graphics().moveTo(30, 0).lineTo(54, -16).lineTo(54, 16).closePath().fill(0xff7aa8).stroke({ width: 4, color: 0xd94f82 })
  const twL = new Graphics()
  for (const y of [-8, 0, 8]) twL.moveTo(-34, y).lineTo(-50, y * 1.6).stroke({ width: 2, color: 0xd94f82, alpha: 0.6 })
  const twR = new Graphics()
  for (const y of [-8, 0, 8]) twR.moveTo(34, y).lineTo(50, y * 1.6).stroke({ width: 2, color: 0xd94f82, alpha: 0.6 })
  const body = new Graphics().ellipse(0, 0, 34, 28).fill(0xff5e93).stroke({ width: 5, color: 0xd94f82 })
  const stripes = new Graphics()
  stripes.moveTo(-20, -16).lineTo(-2, 20).moveTo(6, -20).lineTo(22, 14).stroke({ width: 5, color: 0xffd1e0, alpha: 0.7 })
  const shine = new Graphics().ellipse(-12, -8, 9, 6).fill({ color: 0xffffff, alpha: 0.5 })
  c.addChild(wrapL, wrapR, twL, twR, body, stripes, shine)
  return c
}

function buildLollipop() {
  const c = new Container()
  const stick = new Graphics().roundRect(-4, 30, 8, 40, 4).fill(0xfff7e6).stroke({ width: 2, color: 0xd9cdb0 })
  const disc = new Graphics().circle(0, 0, 46).fill(0xffffff).stroke({ width: 6, color: 0xe0a0c0 })
  const swirl = new Graphics()
  let first = true
  for (let t = 0; t <= Math.PI * 6; t += 0.2) {
    const r = (t / (Math.PI * 6)) * 40
    const x = Math.cos(t) * r
    const y = Math.sin(t) * r
    if (first) {
      swirl.moveTo(x, y)
      first = false
    } else swirl.lineTo(x, y)
  }
  swirl.stroke({ width: 8, color: 0xff5e93, cap: 'round' })
  const shine = new Graphics().ellipse(-16, -16, 10, 14).fill({ color: 0xffffff, alpha: 0.4 })
  c.addChild(stick, disc, swirl, shine)
  return c
}

function buildCake() {
  const c = new Container()
  const sponge = new Graphics().moveTo(-50, 16).lineTo(48, -24).lineTo(48, 44).closePath().fill(0xf4c98a).stroke({ width: 5, color: 0xd1a35f })
  const creamMid = new Graphics().moveTo(-50, 30).lineTo(48, 2).lineTo(48, 12).lineTo(-50, 40).closePath().fill(0xfff0f4)
  const frostTop = new Graphics().moveTo(-50, 12).lineTo(48, -28).lineTo(48, -14).lineTo(-50, 26).closePath().fill(0xffd1e0).stroke({ width: 3, color: 0xf3a7c4 })
  const cherry = new Graphics().circle(34, -26, 8).fill(0xe23b3a).stroke({ width: 2, color: 0x9c1c28 })
  const shine = new Graphics().circle(31, -29, 3).fill({ color: 0xffffff, alpha: 0.6 })
  c.addChild(sponge, creamMid, frostTop, cherry, shine)
  return c
}

// =================== Katalog ===================

const BUILDERS = {
  apple: buildApple,
  banana: buildBanana,
  strawberry: buildStrawberry,
  cherry: buildCherry,
  grape: buildGrape,
  orange: buildOrange,
  watermelon: buildWatermelon,
  pear: buildPear,
  carrot: buildCarrot,
  broccoli: buildBroccoli,
  corn: buildCorn,
  tomato: buildTomato,
  cookie: buildCookie,
  cupcake: buildCupcake,
  donut: buildDonut,
  candy: buildCandy,
  lollipop: buildLollipop,
  cake: buildCake,
}

const META = [
  { key: 'apple', cat: 'frukt' },
  { key: 'banana', cat: 'frukt' },
  { key: 'strawberry', cat: 'frukt' },
  { key: 'cherry', cat: 'frukt' },
  { key: 'grape', cat: 'frukt' },
  { key: 'orange', cat: 'frukt' },
  { key: 'watermelon', cat: 'frukt' },
  { key: 'pear', cat: 'frukt' },
  { key: 'carrot', cat: 'gronsaker' },
  { key: 'broccoli', cat: 'gronsaker' },
  { key: 'corn', cat: 'gronsaker' },
  { key: 'tomato', cat: 'gronsaker' },
  { key: 'cookie', cat: 'godis' },
  { key: 'cupcake', cat: 'godis' },
  { key: 'donut', cat: 'godis' },
  { key: 'candy', cat: 'godis' },
  { key: 'lollipop', cat: 'godis' },
  { key: 'cake', cat: 'godis' },
]

// Skapa en färsk mat-Container (centrerad i 0,0). Konstverket är helt dekorativt;
// spelet sätter gripyta/eventMode på en yttre behållare.
export function makeFood(key, scale = 1) {
  const build = BUILDERS[key] || buildApple
  const c = build()
  c.eventMode = 'none'
  c.interactiveChildren = false
  if (scale !== 1) c.scale.set(scale)
  return c
}

export const FOODS = META.map((m) => ({ ...m, draw: (scale = 1) => makeFood(m.key, scale) }))

const CAT_BY_KEY = Object.fromEntries(META.map((m) => [m.key, m.cat]))
export function foodCat(key) {
  return CAT_BY_KEY[key] || 'frukt'
}

// Varje mats DOMINERANDE färg — den som kroppen (`body`/`berries`/`frosting`) är
// fylld med ovan. Tuggan i munnen är en mjuk klick av just den här maten, så den
// måste bära matens egen färg; en generisk brun klump hade lika gärna kunnat vara
// vad som helst. Hämtas ur ritningarna för hand eftersom konstverket är Graphics-
// anrop, inte data — men den står bredvid dem så att en färgändring syns här.
const FOOD_COLOR = {
  apple: 0xe23b3b,
  banana: 0xffce3a,
  strawberry: 0xe83a4a,
  cherry: 0xd62b3a,
  grape: 0x8e6bd0,
  orange: 0xff9e2c,
  watermelon: 0xf2566a,
  pear: 0xbfd84a,
  carrot: 0xff8a2c,
  broccoli: 0x4f9a3a,
  corn: 0xffd84a,
  tomato: 0xe83a3a,
  cookie: 0xddb066,
  cupcake: 0xffd1e0,
  donut: 0xf06ea9,
  candy: 0xff5e93,
  lollipop: 0xff5e93,
  cake: 0xf4c98a,
}
export function foodColor(key) {
  return FOOD_COLOR[key] ?? 0xe23b3b
}

export { darken }
