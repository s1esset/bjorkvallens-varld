// Följ Spåret — VÄRLDEN bakom spåret: en hel skärm (full bleed) med horisont, kullar, träd,
// blommor och en riktig slingrande stig som ritas genom rundans fotspårspunkter.
// Tre teman (äng → strand → snö) roterar per runda, samma mekanik.
//
// Allt här är dekor (eventMode 'none') och ligger i EN rot som spelet river per runda.
// Exit-säkerhet: varje levande sak (vajande blommor, fjärilar, måsar, snöflingor) tweenar ett
// vanligt {}-proxy och rör Pixi-objektet bara om det lever — och alla tweens samlas i `tw` så
// `rivVarld()` kan döda dem INNAN noderna förstörs.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { verticalFill, sphereFill, bage } from '../../lib/form.js'
import { liv } from '../../lib/feedback.js'
import { BLEED_X } from '../../lib/view.js'
import { shade, tint } from '../../lib/theme.js'

const GROUND_H = 400 // marken börjar på y = 720 − 400 = 320 (horisonten)
const HORISONT = 320

// `stig` = färger på den trampade stigen (opak, se ritaStig), `tass` = avtryckens ton.
export const TEMAN = [
  {
    id: 'aeng',
    scen: 'meadow',
    scenOpts: { sunX: 560, sunY: 112, groundH: GROUND_H },
    stig: { rand: 0x9cc46e, kant: 0xa27b48, mark: 0xd3b27a, mitt: 0xe3c690 },
    tass: 0x7a5530,
    kant: 'stra',
    gras: 0x4fa85c,
    sno: false,
  },
  {
    id: 'strand',
    scen: { top: 0x8fdcff, bottom: 0xe9f8ff, ground: 0xf5dfa0, groundDark: 0xe0bf78, sun: true, clouds: 2 },
    scenOpts: { sunX: 560, sunY: 112, groundH: GROUND_H, djup: false, dis: false },
    stig: { rand: 0xe2c483, kant: 0xa8814a, mark: 0xc9a062, mitt: 0xd6b27a },
    tass: 0x6b4c22,
    kant: 'sten',
    gras: 0xc9a062,
    sno: false,
  },
  {
    id: 'sno',
    scen: { top: 0xbcd8f0, bottom: 0xeef5fb, ground: 0xf6f9fd, groundDark: 0xcfdeee, sun: 0xfff1c9, clouds: 3 },
    scenOpts: { sunX: 560, sunY: 112, groundH: GROUND_H },
    stig: { rand: 0xe2ecf6, kant: 0x9fb6cf, mark: 0xc6d6e6, mitt: 0xd8e4ef },
    tass: 0x5f7b9a,
    kant: 'klump',
    gras: 0xffffff,
    sno: true,
  },
]

const slump = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ---- Stigen -------------------------------------------------------------------------

// Catmull-Rom genom punkterna → tät polylinje (≈9 px mellan punkterna). Kurvan går EXAKT
// genom varje fotspår, så tassarna ligger på stigen och inte bredvid den.
export function kurva(p) {
  const P = [p[0], ...p, p[p.length - 1]]
  const out = []
  for (let i = 0; i < P.length - 3; i++) {
    const [a, b, c, d] = [P[i], P[i + 1], P[i + 2], P[i + 3]]
    const per = Math.max(6, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / 9))
    for (let s = 0; s < per; s++) {
      const t = s / per
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x: 0.5 * (2 * b.x + (-a.x + c.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * t2 + (-a.x + 3 * b.x - 3 * c.x + d.x) * t3),
        y: 0.5 * (2 * b.y + (-a.y + c.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * t2 + (-a.y + 3 * b.y - 3 * c.y + d.y) * t3),
      })
    }
  }
  out.push({ x: p[p.length - 1].x, y: p[p.length - 1].y })
  return out
}

// Ett band av fyra lager OPAKA streck (inte alfa: ett alfa-streck med rundade skarvar ger
// pärlor där triangelnäten överlappar) — mjuk kant, trampad jord, en ljusare mitt. Därpå
// småsten i bandet och en kantlist av strån/stenar/snöklumpar, deterministisk i fördelning
// men slumpad i läge så varje runda får sin egen stig.
function ritaStig(root, kp, tema) {
  const s = tema.stig
  const g = new Graphics()
  const linje = (w, color) => {
    g.moveTo(kp[0].x, kp[0].y)
    for (let i = 1; i < kp.length; i++) g.lineTo(kp[i].x, kp[i].y)
    g.stroke({ width: w, color, cap: 'round', join: 'round' })
  }
  linje(116, s.rand)
  linje(100, s.kant)
  linje(86, s.mark)
  linje(46, s.mitt)
  g.eventMode = 'none'
  root.addChild(g)

  // normal i punkt i
  const norm = (i) => {
    const a = kp[Math.max(0, i - 1)]
    const b = kp[Math.min(kp.length - 1, i + 1)]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const l = Math.hypot(dx, dy) || 1
    return { x: -dy / l, y: dx / l }
  }
  const smasten = new Graphics()
  for (let i = 2; i < kp.length - 2; i += 2) {
    if (Math.random() < 0.45) continue
    const n = norm(i)
    const o = slump(-36, 36)
    const x = kp[i].x + n.x * o
    const y = kp[i].y + n.y * o
    const r = slump(2.2, 5)
    smasten.ellipse(x, y, r * 1.3, r).fill(Math.random() < 0.5 ? shade(s.mark, 0.14) : tint(s.mark, 0.35))
  }
  smasten.eventMode = 'none'
  root.addChild(smasten)

  const kant = new Graphics()
  for (let i = 3; i < kp.length - 3; i += 3) {
    if (Math.random() < 0.35) continue
    const n = norm(i)
    const side = Math.random() < 0.5 ? -1 : 1
    const o = side * slump(52, 62)
    const x = kp[i].x + n.x * o
    const y = kp[i].y + n.y * o
    if (tema.kant === 'stra') {
      for (const dx of [-5, 0, 5]) kant.moveTo(x + dx, y).quadraticCurveTo(x + dx + 2, y - 9, x + dx * 1.8, y - slump(12, 19))
    } else if (tema.kant === 'sten') {
      kant.ellipse(x, y, slump(5, 9), slump(3.5, 6)).fill(pick([0xb99a66, 0xd9c08a, 0xa98a58]))
    } else {
      kant.ellipse(x, y + 3, slump(9, 15), slump(5, 8)).fill(0xdde8f3)
      kant.ellipse(x, y, slump(8, 14), slump(4.5, 7.5)).fill(0xffffff)
    }
  }
  if (tema.kant === 'stra') kant.stroke({ width: 3, color: tema.gras, cap: 'round' })
  kant.eventMode = 'none'
  root.addChild(kant)
}

// ---- Dekorföremål (alla ritade med egen silhuett, origo = där de står) ---------------

function skugga(c, rx, ry, dy = 4) {
  c.addChild(new Graphics().ellipse(0, dy, rx, ry).fill({ color: 0x000000, alpha: 0.12 }))
}

function trad(s, tw) {
  const c = new Container()
  skugga(c, 78 * s, 15 * s, 6)
  const stam = new Graphics()
  stam.poly([-15 * s, 4, -9 * s, -125 * s, 9 * s, -125 * s, 15 * s, 4]).fill(0x9a6a3c)
  stam.poly([4 * s, 4, 3 * s, -125 * s, 9 * s, -125 * s, 15 * s, 4]).fill({ color: 0x000000, alpha: 0.13 })
  c.addChild(stam)
  const kr = new Container()
  const grön = sphereFill(0x5bbf6a)
  for (const [x, y, r] of [[-52, -150, 44], [52, -150, 44], [0, -196, 56], [-24, -126, 40], [28, -128, 42], [0, -150, 50]]) {
    kr.addChild(new Graphics().circle(x * s, y * s, r * s).fill(grön))
  }
  const ap = new Graphics()
  for (const [x, y] of [[-38, -170], [30, -196], [46, -140], [-12, -128], [8, -168]]) {
    ap.circle(x * s, y * s, 7.5 * s).fill(0xe0392b)
    ap.circle((x - 2.5) * s, (y - 2.5) * s, 2.4 * s).fill({ color: 0xffffff, alpha: 0.6 })
  }
  kr.addChild(ap)
  c.addChild(kr)
  const t = liv(kr, { bob: 0, sway: 0.012, duration: slump(3, 4.4) })
  if (t) tw.push(t)
  return c
}

function gran(s, tw) {
  const c = new Container()
  skugga(c, 56 * s, 11 * s, 4)
  c.addChild(new Graphics().roundRect(-9 * s, -34 * s, 18 * s, 38 * s, 3).fill(0x8a5a3b))
  const kr = new Container()
  const g = new Graphics()
  // tre våningar, nedersta först; varje har en snömössa med ojämn underkant
  for (const [w, top, bot] of [[58, -78, -24], [46, -122, -62], [34, -166, -108]]) {
    g.poly([-w * s, bot * s, 0, top * s, w * s, bot * s]).fill(0x3c8a66)
    g.poly([-w * s, bot * s, 0, top * s, 0, bot * s]).fill({ color: 0x000000, alpha: 0.1 })
    const h = top + (bot - top) * 0.46
    const h2 = top + (bot - top) * 0.58
    g.poly([-w * 0.56 * s, h * s, 0, top * s, w * 0.56 * s, h * s, w * 0.28 * s, h2 * s, 0, (h + 4) * s, -w * 0.28 * s, h2 * s]).fill(0xffffff)
  }
  kr.addChild(g)
  c.addChild(kr)
  const t = liv(kr, { bob: 0, sway: 0.01, duration: slump(3.4, 4.6) })
  if (t) tw.push(t)
  return c
}

function palm(s, tw) {
  const c = new Container()
  skugga(c, 60 * s, 12 * s, 6)
  const stam = new Graphics()
  stam.moveTo(0, 2).quadraticCurveTo(-16 * s, -90 * s, 40 * s, -176 * s).stroke({ width: 20 * s, color: 0xa7793f, cap: 'round' })
  stam.moveTo(0, 2).quadraticCurveTo(-16 * s, -90 * s, 40 * s, -176 * s).stroke({ width: 8 * s, color: 0xc49a5e, cap: 'round' })
  for (const t of [0.22, 0.42, 0.62, 0.82]) {
    const u = 1 - t
    const x = 2 * u * t * -16 * s + t * t * 40 * s
    const y = 2 + 2 * u * t * (-90 * s - 2) + t * t * (-176 * s - 2)
    stam.moveTo(x - 9 * s, y).lineTo(x + 9 * s, y + 2).stroke({ width: 2.5, color: 0x8a5e2c, alpha: 1 })
  }
  c.addChild(stam)
  const kr = new Container()
  kr.position.set(40 * s, -176 * s)
  const blad = sphereFill(0x43b36a)
  for (const a of [-3.3, -2.75, -2.15, -1.55, -0.95, -0.35, 0.2]) {
    const f = new Graphics()
    const len = slump(78, 96) * s
    f.ellipse(len / 2, 0, len / 2, 11 * s).fill(blad)
    f.moveTo(4, 0).lineTo(len - 6, 0).stroke({ width: 2, color: 0x2f8a4e })
    f.rotation = a
    kr.addChild(f)
  }
  kr.addChild(new Graphics().circle(-7 * s, 8 * s, 8 * s).fill(0x7a4a26).circle(8 * s, 10 * s, 8 * s).fill(0x6b3f20))
  c.addChild(kr)
  const t = liv(kr, { bob: 0, sway: 0.04, duration: slump(3, 4) })
  if (t) tw.push(t)
  return c
}

function parasoll(s) {
  const c = new Container()
  skugga(c, 54 * s, 9 * s, 4)
  const g = new Graphics()
  g.moveTo(0, 0).lineTo(0, -116 * s).stroke({ width: 5 * s, color: 0x8a5a3b, cap: 'round' })
  for (let i = 0; i < 4; i++) {
    const x0 = (-70 + i * 35) * s
    const x1 = x0 + 35 * s
    g.poly([0, -150 * s, x0, -108 * s, x1, -108 * s]).fill(i % 2 ? 0xffffff : 0xff6b6b)
  }
  g.moveTo(-70 * s, -108 * s).lineTo(70 * s, -108 * s).stroke({ width: 2, color: 0xd05050 })
  c.addChild(g)
  c.rotation = slump(-0.12, 0.12)
  return c
}

function snogubbe(s, tw) {
  const c = new Container()
  skugga(c, 44 * s, 9 * s, 4)
  const kr = new Container()
  const snö = sphereFill(0xffffff, { dark: 0.12 })
  const g = new Graphics()
  g.circle(0, -28 * s, 30 * s).fill(snö)
  g.circle(0, -82 * s, 23 * s).fill(snö)
  g.circle(0, -120 * s, 17 * s).fill(snö)
  g.moveTo(-22 * s, -86 * s).quadraticCurveTo(-46 * s, -108 * s, -52 * s, -96 * s).stroke({ width: 3, color: 0x6b4a2e, cap: 'round' })
  g.moveTo(22 * s, -86 * s).quadraticCurveTo(46 * s, -108 * s, 52 * s, -118 * s).stroke({ width: 3, color: 0x6b4a2e, cap: 'round' })
  g.roundRect(-20 * s, -106 * s, 40 * s, 9 * s, 4).fill(0xe0574f)
  g.roundRect(-13 * s, -152 * s, 26 * s, 26 * s, 3).fill(0x33363d)
  g.roundRect(-21 * s, -130 * s, 42 * s, 6 * s, 3).fill(0x33363d)
  g.poly([0, -121 * s, 22 * s, -116 * s, 0, -113 * s]).fill(0xff8a3d)
  g.circle(-6 * s, -125 * s, 2.4 * s).fill(0x33363d).circle(6 * s, -125 * s, 2.4 * s).fill(0x33363d)
  for (const y of [-86, -72, -28, -16]) g.circle(0, y * s, 2.6 * s).fill(0x33363d)
  kr.addChild(g)
  c.addChild(kr)
  const t = liv(kr, { bob: 0, sway: 0.018, duration: slump(2.6, 3.4) })
  if (t) tw.push(t)
  return c
}

function buske(s, berry = 0xe0392b) {
  const c = new Container()
  skugga(c, 54 * s, 10 * s, 4)
  const grön = sphereFill(0x4fb061)
  const g = new Graphics()
  for (const [x, y, r] of [[-28, -20, 26], [26, -22, 28], [0, -34, 32]]) g.circle(x * s, y * s, r * s).fill(grön)
  for (const [x, y] of [[-30, -28], [-8, -48], [22, -18], [34, -34], [4, -22]]) g.circle(x * s, y * s, 4.2 * s).fill(berry)
  c.addChild(g)
  return c
}

function blomma(s, tw) {
  const ut = new Container()
  const c = new Container() // den som vajar (liv äger sin egen y, så den får inte vara den som placeras)
  ut.addChild(c)
  const stjälk = new Graphics()
  stjälk.moveTo(0, 0).quadraticCurveTo(-4, -16 * s, 2, -34 * s).stroke({ width: 4, color: 0x3f8a44, cap: 'round' })
  stjälk.ellipse(-8, -14 * s, 8, 3.5).fill(0x4fb061)
  c.addChild(stjälk)
  const huvud = new Graphics()
  if (Math.random() < 0.5) {
    const kron = pick([0xffffff, 0xfff0a8, 0xf7b9e4])
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      huvud.ellipse(Math.cos(a) * 9 * s, Math.sin(a) * 9 * s, 6.5 * s, 4.2 * s).fill(kron)
    }
    huvud.circle(0, 0, 5.4 * s).fill(0xffc93c)
  } else {
    const kron = pick([0xff6b8a, 0xff8a3d, 0xa78bfa])
    huvud.moveTo(-9 * s, -8 * s).lineTo(-5 * s, 8 * s).quadraticCurveTo(0, 13 * s, 5 * s, 8 * s).lineTo(9 * s, -8 * s).lineTo(4 * s, -2 * s).lineTo(0, -10 * s).lineTo(-4 * s, -2 * s).closePath().fill(kron)
  }
  huvud.position.set(2, -34 * s)
  c.addChild(huvud)
  const t = liv(c, { bob: 0, sway: slump(0.05, 0.09), duration: slump(1.8, 2.8) })
  if (t) tw.push(t)
  return ut
}

function sjostjarna(s) {
  const g = new Graphics()
  const pts = []
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2
    const r = (k % 2 === 0 ? 15 : 6.5) * s
    pts.push(Math.cos(a) * r, Math.sin(a) * r * 0.8)
  }
  g.poly(pts).fill(0xff9d3d).stroke({ width: 2, color: 0xd9741b })
  g.rotation = slump(-0.6, 0.6)
  return g
}

function snackskal(s) {
  const g = new Graphics()
  bage(g, 0, 0, 14 * s, Math.PI, Math.PI * 2).closePath().fill(0xffb6c8).stroke({ width: 2, color: 0xe08aa2 })
  for (const x of [-7, 0, 7]) g.moveTo(x * s * 0.3, -1).lineTo(x * s, -12 * s).stroke({ width: 1.6, color: 0xe08aa2 })
  g.rotation = slump(-0.4, 0.4)
  return g
}

function sten(s) {
  const c = new Container()
  skugga(c, 20 * s, 5 * s, 3)
  c.addChild(new Graphics().ellipse(0, -8 * s, 18 * s, 11 * s).fill(0x9aa4b0).ellipse(-5 * s, -12 * s, 9 * s, 5 * s).fill({ color: 0xffffff, alpha: 0.3 }))
  return c
}

function snohog(rx) {
  const c = new Container()
  c.addChild(new Graphics().ellipse(0, 0, rx, rx * 0.3).fill(0xdde8f3))
  c.addChild(new Graphics().ellipse(0, -rx * 0.07, rx * 0.92, rx * 0.25).fill(0xffffff))
  return c
}

// ---- Levande detaljer (proxy-tweens med rivningsvakt) --------------------------------

function fjaril(cx, cy, tw) {
  const c = new Container()
  const vingar = new Container()
  const f = pick([0xff9ec4, 0xffd35c, 0xa78bfa, 0x57c8c3])
  for (const d of [-1, 1]) {
    vingar.addChild(new Graphics().ellipse(d * 7, -4, 7, 9).fill(f).ellipse(d * 6, 6, 5, 6).fill(tint(f, 0.3)))
  }
  c.addChild(vingar, new Graphics().roundRect(-1.6, -8, 3.2, 16, 1.6).fill(0x4a3526))
  c.position.set(cx, cy)
  const st = { p: 0 }
  const dur = slump(16, 24)
  const ax = slump(120, 240)
  const ay = slump(24, 50)
  const ph = Math.random() * 6
  const flaxar = Math.round(dur * 4)
  const t = gsap.to(st, {
    p: 1,
    duration: dur,
    repeat: -1,
    ease: 'none',
    onUpdate: () => {
      if (c.destroyed) return t.kill()
      const a = st.p * Math.PI * 2
      c.x = cx + ax * Math.sin(a)
      c.y = cy + ay * Math.sin(2 * a + ph)
      vingar.scale.x = 0.3 + 0.7 * Math.abs(Math.sin(st.p * Math.PI * 2 * flaxar))
      c.rotation = 0.25 * Math.cos(a)
    },
  })
  tw.push(t)
  return c
}

function masar(y, view, tw) {
  const c = new Container()
  const vingar = new Graphics()
  vingar.moveTo(-16, 0).quadraticCurveTo(-8, -10, 0, 0).quadraticCurveTo(8, -10, 16, 0).stroke({ width: 3.2, color: 0xffffff, cap: 'round', join: 'round' })
  vingar.moveTo(-16, 1.5).quadraticCurveTo(-8, -8, 0, 1.5).quadraticCurveTo(8, -8, 16, 1.5).stroke({ width: 1.4, color: 0x9aa4b0, cap: 'round', join: 'round' })
  c.addChild(vingar)
  const st = { p: Math.random() }
  const dur = slump(24, 34)
  const dir = Math.random() < 0.5 ? 1 : -1
  const t = gsap.to(st, {
    p: st.p + 1,
    duration: dur,
    repeat: -1,
    ease: 'none',
    onUpdate: () => {
      if (c.destroyed) return t.kill()
      const q = st.p % 1
      const w = view.right - view.left + 160
      c.x = dir > 0 ? view.left - 80 + q * w : view.right + 80 - q * w
      c.y = y + Math.sin(q * Math.PI * 6) * 14
      vingar.scale.y = 0.55 + 0.45 * Math.abs(Math.sin(st.p * Math.PI * 2 * 9))
      c.scale.x = dir
    },
  })
  tw.push(t)
  return c
}

function snoflinga(view, tw) {
  const g = new Graphics().circle(0, 0, slump(2, 4.2)).fill({ color: 0xffffff, alpha: 0.9 })
  g.eventMode = 'none'
  const st = { p: Math.random() }
  const x0 = slump(view.left, view.right)
  const amp = slump(10, 28)
  const dur = slump(8, 14)
  const t = gsap.to(st, {
    p: st.p + 1,
    duration: dur,
    repeat: -1,
    ease: 'none',
    onUpdate: () => {
      if (g.destroyed) return t.kill()
      const q = st.p % 1
      g.x = x0 + Math.sin(q * Math.PI * 4) * amp
      g.y = view.top - 20 + q * (view.height + 40)
    },
  })
  tw.push(t)
  return g
}

// ---- Bygg hela världen för en runda ---------------------------------------------------

// kp = stigens kurvpunkter (från kurva()). Returnerar { root, tw }.
export function byggVarld(ctx, tema, stigPunkter, { hus, knapp }) {
  const view = ctx.view
  const tw = []
  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false

  const scen = createScene(tema.scen, tema.scenOpts)
  root.addChild(scen)

  // Stranden: havsremsa vid horisonten + skumkant mot sanden.
  if (tema.id === 'strand') {
    const hav = new Graphics()
      .rect(view.left - 40, 262, view.width + 80, HORISONT - 262 + 4)
      .fill(verticalFill(0x5fc3e8, 0x9fe3f5))
    hav.eventMode = 'none'
    root.addChild(hav)
    const vagor = new Container()
    const vg = new Graphics()
    for (let i = 0; i < 18; i++) {
      const x = view.left + 30 + i * ((view.width - 60) / 17) + slump(-20, 20)
      const y = 272 + (i % 3) * 16 + slump(-3, 3)
      vg.moveTo(x - 14, y).quadraticCurveTo(x, y - 5, x + 14, y)
    }
    vg.stroke({ width: 3, color: 0xffffff, cap: 'round' })
    vagor.addChild(vg)
    root.addChild(vagor)
    const st = { p: 0 }
    const t = gsap.to(st, {
      p: 1, duration: 3.6, repeat: -1, yoyo: true, ease: 'sine.inOut',
      onUpdate: () => {
        if (vagor.destroyed) return t.kill()
        vagor.x = (st.p - 0.5) * 26
        vagor.alpha = 0.55 + 0.4 * st.p
      },
    })
    tw.push(t)
    const skum = new Graphics()
    skum.moveTo(view.left - 40, HORISONT + 1)
    for (let x = view.left - 40; x <= view.right + 40; x += 20) skum.lineTo(x, HORISONT + 1 + Math.sin(x * 0.05) * 3)
    skum.stroke({ width: 7, color: 0xffffff, alpha: 1, join: 'round' })
    skum.eventMode = 'none'
    root.addChild(skum)
  }

  const kp = stigPunkter
  ritaStig(root, kp, tema)

  // Placering: bort från stigen, knappen och huset.
  const fritt = (x, y, r) => {
    if (x > hus.x - 120 && y > hus.y - 140 && y < hus.y + 110) return false
    if (x < knapp.x + 140 && y > knapp.y - 70) return false
    for (let i = 0; i < kp.length; i += 2) {
      const dx = kp[i].x - x
      const dy = kp[i].y - y
      if (dx * dx + dy * dy < r * r) return false
    }
    return true
  }
  const plats = (x0, x1, y0, y1, r) => {
    for (let k = 0; k < 40; k++) {
      const x = slump(x0, x1)
      const y = slump(y0, y1)
      if (fritt(x, y, r)) return { x, y }
    }
    return null
  }

  const dekor = [] // { y, nod }
  const lagg = (nod, x, y) => {
    nod.position.set(x, y)
    nod.eventMode = 'none'
    dekor.push({ y, nod })
  }
  const vl = view.left + 40
  const vr = view.right - 40

  // Stora förgrundsföremål per tema (träd/palm/gran) till vänster bakom figuren, små i fjärran.
  const stor = tema.id === 'aeng' ? trad : tema.id === 'strand' ? palm : gran
  lagg(stor(slump(0.95, 1.12), tw), slump(70, 120), 418)
  for (let i = 0; i < 2; i++) {
    const p = plats(380, vr - 160, 332, 346, 60)
    if (p) lagg(stor(slump(0.42, 0.55), tw), p.x, p.y)
  }

  if (tema.id === 'aeng') {
    lagg(buske(0.9), hus.x - 78, hus.y + 60)
    lagg(buske(0.85), hus.x + 92, hus.y + 62)
    for (let i = 0; i < 20; i++) {
      const fjarran = i < 7
      const p = fjarran ? plats(vl, vr, 340, 392, 82) : plats(vl, vr, 612, 712, 90)
      if (p) lagg(blomma(fjarran ? 0.62 : slump(0.9, 1.25), tw), p.x, p.y)
    }
    const b = plats(vl, vr, 640, 700, 100)
    if (b) lagg(buske(0.8), b.x, b.y)
    const f1 = fjaril(slump(450, 800), slump(430, 520), tw)
    const f2 = fjaril(slump(700, 1000), slump(600, 660), tw)
    dekor.push({ y: 2000, nod: f1 }, { y: 2000, nod: f2 })
  } else if (tema.id === 'strand') {
    lagg(sten(1.2), hus.x - 98, hus.y + 58)
    lagg(snackskal(1.3), hus.x + 92, hus.y + 62)
    const pa = plats(450, 900, 338, 348, 70)
    if (pa) lagg(parasoll(0.52), pa.x, pa.y)
    for (let i = 0; i < 14; i++) {
      const p = i < 5 ? plats(vl, vr, 340, 392, 80) : plats(vl, vr, 612, 712, 90)
      if (!p) continue
      const v = Math.random()
      lagg(v < 0.35 ? sjostjarna(slump(0.8, 1.2)) : v < 0.75 ? snackskal(slump(0.8, 1.1)) : sten(slump(0.6, 0.9)), p.x, p.y)
    }
    const m1 = masar(slump(120, 200), view, tw)
    const m2 = masar(slump(200, 250), view, tw)
    dekor.push({ y: 2000, nod: m1 }, { y: 2000, nod: m2 })
  } else {
    lagg(snohog(62), hus.x - 100, hus.y + 62)
    lagg(snohog(54), hus.x + 92, hus.y + 66)
    const sg = plats(430, 900, 340, 348, 70)
    if (sg) lagg(snogubbe(0.62, tw), sg.x, sg.y)
    for (let i = 0; i < 9; i++) {
      const p = i < 3 ? plats(vl, vr, 340, 392, 80) : plats(vl, vr, 612, 712, 90)
      if (p) lagg(snohog(slump(28, 50)), p.x, p.y)
    }
    const b = plats(vl, vr, 630, 700, 100)
    if (b) lagg(gran(0.7, tw), b.x, b.y)
    for (let i = 0; i < 16; i++) dekor.push({ y: 3000, nod: snoflinga(view, tw) })
  }

  dekor.sort((a, b) => a.y - b.y)
  for (const d of dekor) root.addChild(d.nod)
  return { root, tw }
}

export function rivVarld(v) {
  if (!v) return
  for (const t of v.tw) t?.kill?.()
  v.tw.length = 0
  if (v.root && !v.root.destroyed) v.root.destroy({ children: true })
}
