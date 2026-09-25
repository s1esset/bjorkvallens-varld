// KONSTEN i popcornkalaset: rummet, spisen, reglaget, grytan, påsen, skålarna och popcornen.
//
// Ren ritning — inga tweens, inga timers, ingen ticker. index.js äger allt som rör sig och
// sätter bara tal på de noder som exporteras här (tint, alpha, x). Därför kan inget i den
// här filen överleva ett spelbyte: det som inte har en förälder städas med föräldern.
//
// Varje mått kommer ur `matt.js`. Konsten måste följa den FYSISKA formen — popcorn ligger
// mot grytans lutande väggar, kornen i påsens botten, skålens mynning är sensorns kant — så
// ett avskrivet tal här vore en tyst glipa mellan det barnet ser och det som händer.
//
// Stil: appens platta front-/sidovy, varma färger, mjuka konturer. Filmkväll: kök till
// vänster (x < 520), vardagsrum till höger, skymningshimmel i fönstren och en taklampa.
//
// ⚠️ Fällorna ur CLAUDE.md som den här filen undviker med flit:
// · Inga `g.arc()` — rundade kanter är `quadraticCurveTo`/`ellipse`/`roundRect`.
// · Ingen `generateTexture`, och varje FillGradient är CACHAD på modulnivå (lib/form.js
//   cachar sina; tv-skenets egen bakas en gång för hela appens livstid).
// · Inga egna fält med Pixis namn (`_cx` m.fl.) — egna fält heter `ljus`, `bak`, `fram`.
import { Container, FillGradient, Graphics } from 'pixi.js'
import { COLORS, shade, tint } from '../../lib/theme.js'
import { cylinderFill, sphereFill, topLightFill, verticalFill, verticalFillAlpha } from '../../lib/form.js'
import { GOLV, BANK, SPIS, REGLAGE, PASE, GRYTA, LOCK, BORD, SOFFA, PLATSER, KORN } from './matt.js'

// Ritytan inklusive telefonens bleed (lib/view.js: upp till ±240 i sidled, ±160 i höjd).
const V = { x0: -260, x1: 1540, y0: -180, y1: 900 }

const INK = COLORS.ink

// Palett. Samlad här så en ton ändras på ett ställe.
const P = {
  // köket
  kokVagg: 0xf3e0bb,
  kakel: 0xf1f4ec,
  fog: 0xcfd6c9,
  kakelRand: 0x8fc2cc,
  skap: 0x8fbfa4,
  skapK: 0x5e8c74,
  skiva: 0xd9a066,
  skivaK: 0x9a6536,
  spis: 0xf2e6cf,
  spisK: 0xb8a482,
  panel: 0xe3d3b4,
  // vardagsrummet
  vardVagg: 0xdcaa8a,
  vardVaggMork: 0xc98f70,
  list: 0xf6ead6,
  golvKok: 0xe8dcc2,
  golvKok2: 0xd2bf9c,
  parkett: 0xbb8455,
  matta: 0xc95f55,
  mattaK: 0xf2c56a,
  // himlen i fönstren
  himmelTopp: 0x3d4a8a,
  himmelBotten: 0xf2a37e,
  karm: 0xfbf5e8,
  gardin: 0xf2c65a,
  // soffan och bordet
  tyg: 0x4aa3a8,
  tygM: 0x2f7478,
  dyna: 0x5bb5b9,
  ben: 0x8a5a30,
  kudde1: 0xf28a6a,
  kudde2: 0xf6c94c,
  tra: 0xb97c46,
  traK: 0x7a4a24,
  // metall och glas
  stal: 0xaeb8be,
  stalK: 0x5f6b72,
  glas: 0xe3f3fb,
  glasKant: 0x7fa6bb,
  // påsen
  kraft: 0xcf9f66,
  kraftM: 0x9c7043,
  // popcornen och kornen
  popcorn: 0xfbecc8,
  popcornK: 0xd9b98a,
  skal: 0xf2b440,
  korn: 0xf0a23a,
}

// ---- små byggstenar ----------------------------------------------------------

// Ett dekorlager: tar aldrig emot tryck (index.js lägger träffytorna själv).
function dekor(c) {
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

function ritning(foralder) {
  const g = new Graphics()
  foralder.addChild(g)
  return g
}

// Färgblandning mellan två 0xRRGGBB (t 0..1).
function blanda(a, b, t) {
  const k = Math.max(0, Math.min(1, t))
  const m = (s) => Math.round(((a >> s) & 0xff) + ((((b >> s) & 0xff) - ((a >> s) & 0xff)) * k))
  return (m(16) << 16) | (m(8) << 8) | m(0)
}

// Multiplicera två färger kanal för kanal — samma sak som Pixis `tint` gör med en fyllning,
// så den mjuka kroppen under poppen får EXAKT samma färg som det färdiga popcornets tint.
function multiplicera(a, b) {
  const m = (s) => Math.round((((a >> s) & 0xff) * ((b >> s) & 0xff)) / 255)
  return (m(16) << 16) | (m(8) << 8) | m(0)
}

// Deterministisk slump ur ett frö (mulberry32) — samma frö ger samma popcorn varje gång.
function slump(seed) {
  let s = (seed | 0) || 0x2f6b
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Ett kärls silhuett: toppen ±xt på höjd y0, botten ±xb på höjd y1, rundade NEDRE hörn med
// radien rb (längs sidan resp. botten). Gäller både grytan (xt > xb) och påsen (xt < xb).
function karlForm(g, xt, xb, y0, y1, rb) {
  const L = Math.hypot(xb - xt, y1 - y0)
  const dx = (xb - xt) / L
  const dy = (y1 - y0) / L
  g.moveTo(-xt, y0)
  g.lineTo(-(xb - dx * rb), y1 - dy * rb)
  g.quadraticCurveTo(-xb, y1, -xb + rb, y1)
  g.lineTo(xb - rb, y1)
  g.quadraticCurveTo(xb, y1, xb - dx * rb, y1 - dy * rb)
  g.lineTo(xt, y0)
  g.closePath()
  return g
}

// Nedre halvan av en ellips som en öppen båge (vänster → höger genom (cx, cy + ry)).
// En kvadratisk kurva med kontrollpunkten på 2·ry går exakt genom bottenpunkten.
function framkant(g, cx, cy, rx, ry) {
  return g.moveTo(cx - rx, cy).quadraticCurveTo(cx, cy + ry * 2, cx + rx, cy)
}
function bakkant(g, cx, cy, rx, ry) {
  return g.moveTo(cx - rx, cy).quadraticCurveTo(cx, cy - ry * 2, cx + rx, cy)
}

// ---- rummet ------------------------------------------------------------------

// Tv-skenets toning: genomskinligt till vänster, blått mot tv:n till höger (utanför bild).
// Linjär, alltså ingen förifyllning (den radiella fällan i CLAUDE.md gäller inte). Bakas EN
// gång för appens livstid — inte en ny gradient per montering.
let _tvGradient = null
function tvGradient() {
  if (!_tvGradient) {
    _tvGradient = new FillGradient({
      end: { x: 1, y: 0 },
      colorStops: [
        { offset: 0, color: '#6fb8ff00' },
        { offset: 0.45, color: '#7cc0ff40' },
        { offset: 1, color: '#9ad2ffa6' },
      ],
    })
  }
  return _tvGradient
}

// Ett fönster med skymningshimmel, måne, stjärnor och en björkkant mot horisonten.
function ritaFonster(g, x0, y0, w, h, fro) {
  const r = slump(fro)
  // Karmen bakom glaset.
  g.roundRect(x0 - 12, y0 - 12, w + 24, h + 24, 14).fill(topLightFill(P.karm, { highlight: 0.2, dark: 0.12 })).stroke({ width: 3, color: shade(P.karm, 0.3) })
  g.rect(x0, y0, w, h).fill(verticalFill(P.himmelTopp, P.himmelBotten))
  // Stjärnor i den mörka övre halvan.
  for (let i = 0; i < 9; i++) {
    const sx = x0 + 10 + r() * (w - 20)
    const sy = y0 + 8 + r() * h * 0.45
    g.circle(sx, sy, 1.4 + r() * 1.4).fill({ color: 0xfff6d0, alpha: 0.9 })
  }
  // Månen med ett mjukt sken.
  const mx = x0 + w * 0.72
  const my = y0 + h * 0.24
  g.circle(mx, my, 22).fill({ color: 0xfff3c4, alpha: 0.18 })
  g.circle(mx, my, 13).fill(sphereFill(0xfff0b8, { dark: 0.12 }))
  g.circle(mx - 4, my + 3, 2.6).fill({ color: 0xe8d596, alpha: 0.8 })
  g.circle(mx + 4, my - 4, 1.8).fill({ color: 0xe8d596, alpha: 0.8 })
  // Kullar och trädkronor i motljus längst ned.
  const kulle = 0x4d4f82
  g.moveTo(x0, y0 + h).lineTo(x0, y0 + h * 0.8)
    .quadraticCurveTo(x0 + w * 0.3, y0 + h * 0.7, x0 + w * 0.55, y0 + h * 0.82)
    .quadraticCurveTo(x0 + w * 0.8, y0 + h * 0.9, x0 + w, y0 + h * 0.78)
    .lineTo(x0 + w, y0 + h).closePath().fill(kulle)
  for (let i = 0; i < 3; i++) {
    const tx = x0 + w * (0.18 + i * 0.3) + r() * 10
    const ty = y0 + h * (0.72 + r() * 0.06)
    g.rect(tx - 1.5, ty, 3, h * 0.2).fill(0xe9e4f0)
    g.ellipse(tx, ty - 6, 13, 16).fill(shade(kulle, 0.12))
  }
  // Spröjsen (korset) och fönsterbrädan.
  g.rect(x0 + w / 2 - 4, y0, 8, h).fill(P.karm).stroke({ width: 1.5, color: shade(P.karm, 0.25) })
  g.rect(x0, y0 + h * 0.46 - 4, w, 8).fill(P.karm).stroke({ width: 1.5, color: shade(P.karm, 0.25) })
  g.roundRect(x0 - 22, y0 + h + 8, w + 44, 12, 5).fill(topLightFill(P.karm, { highlight: 0.2, dark: 0.18 })).stroke({ width: 2.5, color: shade(P.karm, 0.3) })
  // Gardiner med mjuka veck, uppknutna i midjan.
  for (const s of [-1, 1]) {
    const gx = s < 0 ? x0 - 10 : x0 + w + 10
    const ytter = gx + s * 18
    const inner = gx - s * 26
    g.moveTo(ytter, y0 - 22).lineTo(inner, y0 - 22)
      .quadraticCurveTo(inner - s * 6, y0 + h * 0.4, gx - s * 4, y0 + h * 0.55)
      .quadraticCurveTo(inner, y0 + h * 0.75, inner - s * 4, y0 + h + 4)
      .lineTo(ytter, y0 + h + 4).closePath()
      .fill(topLightFill(P.gardin, { highlight: 0.2, dark: 0.18 })).stroke({ width: 2.5, color: shade(P.gardin, 0.35), join: 'round' })
    for (const k of [0.35, 0.7]) {
      const vx = ytter - s * 44 * k
      g.moveTo(vx, y0 - 16).quadraticCurveTo(vx - s * 4, y0 + h * 0.5, vx, y0 + h).stroke({ width: 2, color: shade(P.gardin, 0.22), alpha: 0.6 })
    }
    g.ellipse(gx - s * 4, y0 + h * 0.55, 8, 5).fill(shade(P.gardin, 0.25))
  }
  // Gardinstången.
  g.roundRect(x0 - 40, y0 - 30, w + 80, 8, 4).fill(cylinderFill(P.tra, { axis: 'x' })).stroke({ width: 2, color: P.traK })
  g.circle(x0 - 42, y0 - 26, 7).fill(sphereFill(P.tra)).stroke({ width: 2, color: P.traK })
  g.circle(x0 + w + 42, y0 - 26, 7).fill(sphereFill(P.tra)).stroke({ width: 2, color: P.traK })
}

// En hylla med kryddburkar och en kryddväxt ovanför bänken.
function ritaHylla(g, x0, x1, y) {
  // Burkar: glas med lock och synligt innehåll.
  const burkar = [
    { x: x0 + 34, w: 34, h: 50, inne: 0xf2c65a, lock: 0xd9483b },
    { x: x0 + 80, w: 30, h: 40, inne: 0xc2593d, lock: 0x4aa3a8 },
    { x: x0 + 122, w: 36, h: 56, inne: 0xfff6df, lock: 0xf2a33a },
  ]
  for (const b of burkar) {
    g.roundRect(b.x - b.w / 2, y - b.h, b.w, b.h, 8).fill({ color: P.glas, alpha: 0.55 }).stroke({ width: 2.5, color: P.glasKant })
    g.roundRect(b.x - b.w / 2 + 4, y - b.h * 0.62, b.w - 8, b.h * 0.62 - 4, 6).fill(b.inne)
    g.roundRect(b.x - b.w / 2 - 2, y - b.h - 8, b.w + 4, 10, 4).fill(topLightFill(b.lock)).stroke({ width: 2, color: shade(b.lock, 0.35) })
    g.roundRect(b.x - b.w / 2 + 5, y - b.h + 6, 4, b.h * 0.5, 2).fill({ color: 0xffffff, alpha: 0.6 })
  }
  // Kryddväxten i en terrakottakruka.
  const kx = x1 - 36
  for (const [bx, by] of [[-12, -46], [0, -54], [12, -46], [-6, -40], [7, -38]]) {
    g.ellipse(kx + bx, y - 24 + by * 0.5, 7, 13).fill(topLightFill(0x6cbf6a)).stroke({ width: 2, color: 0x3f8a48 })
  }
  g.moveTo(kx - 20, y - 30).lineTo(kx + 20, y - 30).lineTo(kx + 15, y).lineTo(kx - 15, y).closePath()
    .fill(topLightFill(0xd9784a)).stroke({ width: 2.5, color: 0x9a4a28, join: 'round' })
  g.roundRect(kx - 23, y - 34, 46, 8, 3).fill(topLightFill(0xe08a5a)).stroke({ width: 2, color: 0x9a4a28 })
  // Själva hyllplanet med konsoler.
  g.roundRect(x0, y, x1 - x0, 10, 4).fill(topLightFill(P.tra, { highlight: 0.3, dark: 0.2 })).stroke({ width: 2.5, color: P.traK })
  for (const hx of [x0 + 24, x1 - 24]) {
    g.moveTo(hx - 4, y + 10).lineTo(hx + 4, y + 10).lineTo(hx + 4, y + 34).quadraticCurveTo(hx, y + 22, hx - 4, y + 18).closePath()
      .fill(P.traK)
  }
}

// En tavla: björkar på en äng i kvällssol — Björkvallen.
function ritaTavla(g, x0, y0, w, h) {
  g.roundRect(x0 - 14, y0 - 14, w + 28, h + 28, 8).fill(topLightFill(0xd9a441, { highlight: 0.35, dark: 0.3 })).stroke({ width: 3, color: 0x8a5a1e })
  g.rect(x0, y0, w, h).fill(verticalFill(0xffd9a0, 0xf6b48a))
  g.circle(x0 + w * 0.3, y0 + h * 0.42, 18).fill({ color: 0xfff1c0, alpha: 0.9 })
  g.moveTo(x0, y0 + h).lineTo(x0, y0 + h * 0.72).quadraticCurveTo(x0 + w * 0.5, y0 + h * 0.55, x0 + w, y0 + h * 0.7).lineTo(x0 + w, y0 + h).closePath()
    .fill(topLightFill(0x8cc46a, { highlight: 0.15, dark: 0.2 }))
  for (const [bx, bh] of [[0.62, 0.72], [0.78, 0.6]]) {
    const tx = x0 + w * bx
    const topp = y0 + h * (1 - bh)
    g.ellipse(tx, topp + 6, 22, 26).fill(topLightFill(0x9fd07a))
    g.roundRect(tx - 4, topp + 10, 8, h * bh - 10, 3).fill(0xfbf8f0).stroke({ width: 1.5, color: 0xb8b0a0 })
    for (let k = 0; k < 4; k++) g.rect(tx - 4, topp + 22 + k * 14, 5, 2.5).fill(0x3a3430)
  }
  g.rect(x0, y0, w, h).stroke({ width: 3, color: shade(0xd9a441, 0.45) })
}

// Statisk bakgrund i tre lager (se kontraktet överst i index.js/i uppdraget).
export function ritaRum() {
  const bakgrund = dekor(new Container())
  const soffa = dekor(new Container())
  const bord = dekor(new Container())

  // ---- väggen ----
  const vagg = ritning(bakgrund)
  // Köket: varm cremevägg, kakel från y 300 ned till bänken.
  vagg.rect(V.x0, V.y0, 540 - V.x0, BANK.yta - V.y0).fill(verticalFill(tint(P.kokVagg, 0.1), shade(P.kokVagg, 0.08)))
  const kakelY = 300
  vagg.rect(V.x0, kakelY, BANK.x1 - V.x0, BANK.yta - kakelY).fill(P.kakel)
  for (let y = kakelY + 12; y < BANK.yta; y += 32) vagg.moveTo(V.x0, y).lineTo(BANK.x1, y)
  for (let rad = 0; kakelY + 12 + rad * 32 < BANK.yta; rad++) {
    const yt = kakelY + 12 + rad * 32
    const forskj = rad % 2 ? 20 : 0
    for (let x = V.x0 + forskj; x < BANK.x1; x += 40) vagg.moveTo(x, yt).lineTo(x, Math.min(yt + 32, BANK.yta))
  }
  vagg.stroke({ width: 2, color: P.fog })
  vagg.rect(V.x0, kakelY, BANK.x1 - V.x0, 12).fill(topLightFill(P.kakelRand, { highlight: 0.25, dark: 0.15 }))
  // Vardagsrummet: varm tapet med mjuka ränder.
  vagg.rect(540, V.y0, V.x1 - 540, GOLV - V.y0).fill(verticalFill(tint(P.vardVagg, 0.12), shade(P.vardVagg, 0.1)))
  for (let x = 566; x < V.x1; x += 48) vagg.rect(x, V.y0, 16, GOLV - V.y0).fill({ color: 0xffffff, alpha: 0.07 })
  // Hörnet mellan rummen: en putsad pelare.
  vagg.rect(520, V.y0, 34, GOLV - V.y0).fill(cylinderFill(0xefd9b8, { dark: 0.14, highlight: 0.2 }))
  vagg.moveTo(520, V.y0).lineTo(520, BANK.yta).stroke({ width: 2, color: shade(0xefd9b8, 0.25) })
  vagg.moveTo(554, V.y0).lineTo(554, GOLV).stroke({ width: 2, color: shade(0xefd9b8, 0.25) })
  // Golvlisten längs vardagsrummets vägg.
  vagg.rect(554, GOLV - 16, V.x1 - 554, 16).fill(topLightFill(P.list, { highlight: 0.2, dark: 0.15 }))
  vagg.moveTo(554, GOLV - 16).lineTo(V.x1, GOLV - 16).stroke({ width: 2, color: shade(P.list, 0.25) })

  const dekorG = ritning(bakgrund)
  ritaFonster(dekorG, 40, 92, 176, 160, 7)
  ritaHylla(dekorG, 282, 506, 208)
  ritaFonster(dekorG, 660, 70, 210, 190, 19)
  ritaTavla(dekorG, 1040, 118, 150, 118)

  // Taklampan: sladd + skärm är fasta; LJUSET är en egen nod som index.js kan dimma.
  const lampX = 950
  const lampY = 64
  const fattning = ritning(bakgrund)
  fattning.moveTo(lampX, V.y0).lineTo(lampX, lampY - 6).stroke({ width: 3, color: 0x4a3a30 })
  fattning.roundRect(lampX - 7, lampY - 14, 14, 14, 3).fill(0x6a5646)
  // Skärmen: en rundad kupa i varm senap.
  fattning.moveTo(lampX - 22, lampY - 2).lineTo(lampX + 22, lampY - 2)
    .quadraticCurveTo(lampX + 60, lampY + 16, lampX + 64, lampY + 50).lineTo(lampX - 64, lampY + 50)
    .quadraticCurveTo(lampX - 60, lampY + 16, lampX - 22, lampY - 2).closePath()
    .fill(topLightFill(0xf0b84a, { highlight: 0.3, dark: 0.25 })).stroke({ width: 3, color: 0x9a6a1e, join: 'round' })
  fattning.moveTo(lampX - 64, lampY + 50).lineTo(lampX + 64, lampY + 50).stroke({ width: 4, color: 0xd9983a, cap: 'round' })
  const lampa = dekor(new Container())
  bakgrund.addChild(lampa)
  const ljus = ritning(lampa)
  // Ljuskäglan: stackade ellipser med låg alfa (ingen radiell gradient — ingen textur).
  // Först ett svagt varmt skimmer över hela vardagsrummet — det är det som slocknar när
  // index.js dimmar lampan, och det märks mer än själva käglan.
  ljus.rect(554, V.y0, V.x1 - 554, GOLV - V.y0).fill({ color: 0xffe2a0, alpha: 0.07 })
  for (let i = 0; i < 6; i++) {
    const k = 1 - i / 6
    ljus.ellipse(lampX, lampY + 110 + i * 10, 90 + 220 * k, 50 + 130 * k).fill({ color: 0xffe9a8, alpha: 0.07 })
  }
  ljus.ellipse(lampX, lampY + 52, 50, 10).fill({ color: 0xfff6d6, alpha: 0.95 })
  ljus.ellipse(lampX, lampY + 54, 26, 6).fill({ color: 0xffffff, alpha: 0.9 })
  lampa.ljus = ljus

  // ---- golvet ----
  const golv = ritning(bakgrund)
  // Köket: rutigt klinker.
  golv.rect(V.x0, GOLV, 554 - V.x0, V.y1 - GOLV).fill(P.golvKok)
  for (let y = GOLV, rad = 0; y < V.y1; y += 34, rad++) {
    for (let x = V.x0 + (rad % 2) * 44; x < 554; x += 88) golv.rect(x, y, Math.min(44, 554 - x), 34)
  }
  golv.fill(P.golvKok2)
  // Vardagsrummet: parkett i långa brädor med förskjutna skarvar.
  golv.rect(554, GOLV, V.x1 - 554, V.y1 - GOLV).fill(groundlikt(P.parkett))
  for (let y = GOLV + 18, rad = 0; y < V.y1; y += 18, rad++) golv.moveTo(554, y).lineTo(V.x1, y)
  for (let y = GOLV, rad = 0; y < V.y1; y += 18, rad++) {
    for (let x = 554 + ((rad * 97) % 180); x < V.x1; x += 180) golv.moveTo(x, y).lineTo(x, y + 18)
  }
  golv.stroke({ width: 1.5, color: shade(P.parkett, 0.25), alpha: 0.6 })
  // Skuggan där golvet möter väggen.
  golv.rect(V.x0, GOLV, V.x1 - V.x0, 10).fill(verticalFillAlpha(0x3a2616, 0x3a2616, 0.22, 0))
  // Mattan under soffbordet, med fransar och en bård.
  const mx = (BORD.x0 + BORD.x1) / 2
  golv.ellipse(mx, 688, 372, 32).fill(topLightFill(P.matta, { highlight: 0.12, dark: 0.2 })).stroke({ width: 3, color: shade(P.matta, 0.35) })
  golv.ellipse(mx, 688, 340, 22).stroke({ width: 4, color: P.mattaK, alpha: 0.85 })
  golv.ellipse(mx, 688, 300, 14).stroke({ width: 2.5, color: P.mattaK, alpha: 0.5 })

  // ---- köksbänken ----
  const bank = ritning(bakgrund)
  // Skåpluckorna under bänken, till vänster om spisen.
  const skapTopp = BANK.yta + BANK.djup
  bank.rect(BANK.x0, skapTopp, SPIS.x0 - BANK.x0, GOLV - skapTopp).fill(shade(P.skap, 0.25))
  for (let x = SPIS.x0 - 4; x > BANK.x0; x -= 108) {
    const lx = Math.max(BANK.x0 + 4, x - 104)
    bank.roundRect(lx, skapTopp + 6, x - lx, GOLV - skapTopp - 26, 10).fill(topLightFill(P.skap, { highlight: 0.22, dark: 0.18 })).stroke({ width: 2.5, color: P.skapK })
    bank.roundRect(lx + 12, skapTopp + 18, x - lx - 24, GOLV - skapTopp - 50, 8).stroke({ width: 2, color: P.skapK, alpha: 0.5 })
    bank.circle(x - 18, skapTopp + 40, 6).fill(sphereFill(0xf6ead6)).stroke({ width: 2, color: 0x9a8a6a })
  }
  // Den smala biten mellan spisen och hörnet.
  bank.rect(SPIS.x1, skapTopp, BANK.x1 - SPIS.x1, GOLV - skapTopp).fill(topLightFill(P.skap, { highlight: 0.1, dark: 0.2 })).stroke({ width: 2, color: P.skapK })
  // Sockeln.
  bank.rect(BANK.x0, GOLV - 16, BANK.x1 - BANK.x0, 16).fill(shade(P.skap, 0.45))
  // Spisens front: krämvit emalj med en kontrollpanel (reglaget ritas som eget objekt) och
  // en låda med handtag nedtill.
  bank.roundRect(SPIS.x0, skapTopp - 4, SPIS.x1 - SPIS.x0, GOLV - skapTopp - 8, 12).fill(topLightFill(P.spis, { highlight: 0.25, dark: 0.14 })).stroke({ width: 3, color: P.spisK })
  bank.roundRect(SPIS.x0 + 10, REGLAGE.y - 46, SPIS.x1 - SPIS.x0 - 20, 92, 20).fill(topLightFill(P.panel, { highlight: 0.1, dark: 0.12 })).stroke({ width: 2, color: P.spisK, alpha: 0.7 })
  const ladaY = REGLAGE.y + 54
  bank.roundRect(SPIS.x0 + 12, ladaY, SPIS.x1 - SPIS.x0 - 24, GOLV - ladaY - 14, 8).fill(topLightFill(P.spis, { highlight: 0.1, dark: 0.18 })).stroke({ width: 2, color: P.spisK })
  bank.roundRect(SPIS.x - 60, ladaY + 8, 120, 9, 4.5).fill(cylinderFill(P.stal, { axis: 'x' })).stroke({ width: 2, color: P.stalK })
  // Bänkskivan: ljus ovansida (djupet bakåt) + framkant.
  bank.rect(BANK.x0, BANK.yta - 8, BANK.x1 - BANK.x0, 8).fill(tint(P.skiva, 0.35))
  bank.roundRect(BANK.x0, BANK.yta, BANK.x1 - BANK.x0 + 6, BANK.djup, 6).fill(topLightFill(P.skiva, { highlight: 0.25, dark: 0.22 })).stroke({ width: 3, color: P.skivaK })
  for (let x = BANK.x0 + 40; x < BANK.x1; x += 70) bank.moveTo(x, BANK.yta + 7).lineTo(x + 34, BANK.yta + 7)
  bank.stroke({ width: 1.5, color: shade(P.skiva, 0.2), alpha: 0.5 })

  // ---- soffan ----
  const s = ritning(soffa)
  const armW = 48
  const inX0 = SOFFA.x0 + armW
  const inX1 = SOFFA.x1 - armW
  const armTopp = PLATSER.find((p) => p.id === 'armstod')?.y ?? SOFFA.sits - 40
  const benY = GOLV + 4
  // Skugga mot golvet och fyra ben.
  s.ellipse((SOFFA.x0 + SOFFA.x1) / 2, benY, (SOFFA.x1 - SOFFA.x0) / 2 + 10, 8).fill({ color: 0x000000, alpha: 0.16 })
  for (const bx of [SOFFA.x0 + 18, SOFFA.x1 - 18, inX0 + 30, inX1 - 30]) {
    s.moveTo(bx - 8, benY - 20).lineTo(bx + 8, benY - 20).lineTo(bx + 5, benY).lineTo(bx - 5, benY).closePath()
      .fill(topLightFill(P.ben, { highlight: 0.25, dark: 0.2 })).stroke({ width: 1.5, color: shade(P.ben, 0.35) })
  }
  // Ryggen: ramen och tre ryggdynor.
  const dynH = 42
  s.roundRect(inX0 - 18, SOFFA.rygg, inX1 - inX0 + 36, SOFFA.sits - SOFFA.rygg + dynH, 28).fill(topLightFill(P.tygM, { highlight: 0.2, dark: 0.15 })).stroke({ width: 2.5, color: shade(P.tygM, 0.3) })
  const n = 3
  const cw = (inX1 - inX0) / n
  for (let i = 0; i < n; i++) {
    const x0 = inX0 + i * cw
    s.roundRect(x0 + 4, SOFFA.rygg + 10, cw - 8, SOFFA.sits - SOFFA.rygg + 4, 22).fill(topLightFill(P.tyg, { highlight: 0.25, dark: 0.18 })).stroke({ width: 2.5, color: P.tygM })
    s.circle(x0 + cw / 2, SOFFA.rygg + (SOFFA.sits - SOFFA.rygg) * 0.45, 3.5).fill(P.tygM)
    s.roundRect(x0 + 20, SOFFA.rygg + 18, cw - 40, 6, 3).fill({ color: 0xffffff, alpha: 0.2 })
  }
  // Ramen under sitsen.
  s.roundRect(SOFFA.x0 + 4, SOFFA.sits + dynH - 8, SOFFA.x1 - SOFFA.x0 - 8, benY - 20 - (SOFFA.sits + dynH - 8) + 6, 12)
    .fill(topLightFill(P.tygM, { highlight: 0.18, dark: 0.2 })).stroke({ width: 2.5, color: shade(P.tygM, 0.3) })
  // Sittdynorna — gästernas sits (y = SOFFA.sits är dynornas ovansida).
  for (let i = 0; i < n; i++) {
    const x0 = inX0 + i * cw
    s.roundRect(x0 + 2, SOFFA.sits, cw - 4, dynH + 4, 16).fill(topLightFill(P.dyna, { highlight: 0.3, dark: 0.18 })).stroke({ width: 2.5, color: P.tygM })
    s.roundRect(x0 + 16, SOFFA.sits + 5, cw - 32, 6, 3).fill({ color: 0xffffff, alpha: 0.28 })
    s.moveTo(x0 + 12, SOFFA.sits + 18).lineTo(x0 + cw - 12, SOFFA.sits + 18).stroke({ width: 1.5, color: P.tygM, alpha: 0.35 })
  }
  // Armstöden med rullad överkant (gästen på armstödet sitter på `armTopp`).
  for (const sx of [-1, 1]) {
    const ax = sx < 0 ? SOFFA.x0 + armW / 2 : SOFFA.x1 - armW / 2
    s.roundRect(ax - armW / 2, armTopp, armW, benY - 20 - armTopp, 18).fill(topLightFill(P.tyg, { highlight: 0.25, dark: 0.22 })).stroke({ width: 2.5, color: P.tygM })
    s.ellipse(ax, armTopp + 12, armW / 2 + 4, 14).fill(topLightFill(P.dyna, { highlight: 0.35, dark: 0.12 })).stroke({ width: 2.5, color: P.tygM })
    s.ellipse(ax - sx * 4, armTopp + 9, armW / 2 - 10, 5).fill({ color: 0xffffff, alpha: 0.25 })
  }
  // Två prydnadskuddar i hörnen, lutade mot ryggen.
  const kudde = (kx, lut, farg, prickig) => {
    const kc = new Container()
    kc.position.set(kx, SOFFA.sits + 6)
    kc.rotation = lut
    soffa.addChild(kc)
    const kg = ritning(kc)
    kg.moveTo(-30, 0).quadraticCurveTo(-23, -30, -30, -60).quadraticCurveTo(0, -52, 30, -60).quadraticCurveTo(23, -30, 30, 0)
      .quadraticCurveTo(0, -8, -30, 0).closePath()
      .fill(sphereFill(farg, { lightX: 0.35, lightY: 0.3, dark: 0.25 })).stroke({ width: 2.5, color: shade(farg, 0.35), join: 'round' })
    if (prickig) for (const [px, py] of [[-12, -44], [4, -48], [16, -36], [-4, -30], [-16, -18], [10, -16]]) kg.circle(px, py, 3.2).fill(0xfff4dc)
    else for (const py of [-44, -30, -16]) kg.moveTo(-24, py).quadraticCurveTo(0, py - 3, 24, py).stroke({ width: 4, color: 0xe07a3a, alpha: 0.7, cap: 'round' })
  }
  kudde(inX0 + 30, -0.22, P.kudde1, true)
  kudde(inX1 - 30, 0.22, P.kudde2, false)
  // Golvkudden (platsen `kudde`) — en platt sittkudde på mattan. Ligger i soffans lager så
  // den hamnar bakom gästen; `rum.kudde` pekar hit om index.js vill flytta den.
  const golvkudde = new Container()
  soffa.addChild(golvkudde)
  const gp = PLATSER.find((p) => p.id === 'kudde')
  if (gp) {
    const kg = ritning(golvkudde)
    kg.ellipse(gp.x, gp.y + 22, 58, 7).fill({ color: 0x000000, alpha: 0.18 })
    kg.moveTo(gp.x - 54, gp.y + 18).quadraticCurveTo(gp.x - 62, gp.y - 2, gp.x - 40, gp.y - 4)
      .quadraticCurveTo(gp.x, gp.y + 2, gp.x + 40, gp.y - 4).quadraticCurveTo(gp.x + 62, gp.y - 2, gp.x + 54, gp.y + 18)
      .quadraticCurveTo(gp.x, gp.y + 26, gp.x - 54, gp.y + 18).closePath()
      .fill(topLightFill(0xa78bfa, { highlight: 0.3, dark: 0.2 })).stroke({ width: 2.5, color: shade(0xa78bfa, 0.4), join: 'round' })
    kg.circle(gp.x, gp.y + 8, 3.5).fill(shade(0xa78bfa, 0.35))
    kg.moveTo(gp.x - 36, gp.y + 2).quadraticCurveTo(gp.x, gp.y + 6, gp.x + 36, gp.y + 2).stroke({ width: 3, color: 0xffffff, alpha: 0.3, cap: 'round' })
  }

  // ---- soffbordet ----
  const b = ritning(bord)
  const benTopp = BORD.yta + BORD.tjock
  const benBotten = GOLV + 22
  b.ellipse((BORD.x0 + BORD.x1) / 2, benBotten + 2, (BORD.x1 - BORD.x0) / 2 - 10, 6).fill({ color: 0x000000, alpha: 0.2 })
  for (const bx of [BORD.x0 + 26, BORD.x1 - 26]) {
    b.moveTo(bx - 10, benTopp).lineTo(bx + 10, benTopp).lineTo(bx + 6, benBotten).lineTo(bx - 6, benBotten).closePath()
      .fill(cylinderFill(P.tra, { dark: 0.3 })).stroke({ width: 2, color: P.traK })
  }
  // En hylla under skivan med en hopvikt filt.
  const hyllY = benTopp + 26
  b.roundRect(BORD.x0 + 20, hyllY, BORD.x1 - BORD.x0 - 40, 8, 3).fill(topLightFill(P.tra, { highlight: 0.2, dark: 0.25 })).stroke({ width: 2, color: P.traK })
  b.roundRect(BORD.x1 - 190, hyllY - 16, 120, 17, 7).fill(topLightFill(0x7fb0e0, { highlight: 0.3, dark: 0.2 })).stroke({ width: 2, color: 0x4a78a8 })
  for (let k = 0; k < 4; k++) b.moveTo(BORD.x1 - 176 + k * 28, hyllY - 16).lineTo(BORD.x1 - 176 + k * 28, hyllY + 1).stroke({ width: 3, color: 0xf6ead6, alpha: 0.7 })
  // Skivan: ljus ovansida + tjock framkant.
  b.roundRect(BORD.x0 + 4, BORD.yta - 8, BORD.x1 - BORD.x0 - 8, 10, 4).fill(tint(P.tra, 0.3))
  b.roundRect(BORD.x0, BORD.yta, BORD.x1 - BORD.x0, BORD.tjock, 8).fill(topLightFill(P.tra, { highlight: 0.3, dark: 0.25 })).stroke({ width: 3, color: P.traK })
  b.moveTo(BORD.x0 + 20, BORD.yta + 6).lineTo(BORD.x1 - 20, BORD.yta + 6).stroke({ width: 1.5, color: 0xffffff, alpha: 0.25 })

  // ---- tv-skenet (finishen) ----
  // Toningen är vågrät (mot tv:n); upptill tonar den in i åtta band som INTE överlappar, så
  // skenet inte får en rak överkant över tavlan. (Åtta överlappande lager om 1/8 var gav
  // lodräta ränder: gradientens 8-bitarsalfa kvantiserades en gång per lager.)
  const tvSken = dekor(new Container())
  tvSken.alpha = 0
  const BAND = 8
  const bandH = 24
  const tvTopp = 110
  for (let i = 0; i <= BAND; i++) {
    const band = ritning(tvSken)
    const y = tvTopp + i * bandH
    band.rect(560, y, V.x1 - 560, i < BAND ? bandH : V.y1 - y).fill(tvGradient())
    band.alpha = (i + 1) / (BAND + 1)
  }
  // Skymningen: en mörkblå slöja över hela rummet som index.js kan tona in när lampan dimmas
  // (finishen). Inte fäst i något lager — index.js lägger den där den ska dämpa.
  const skymning = dekor(new Container())
  skymning.alpha = 0
  ritning(skymning).rect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0).fill({ color: 0x1c2250, alpha: 0.38 })

  return { bakgrund, soffa, bord, lampa, tvSken, skymning, kudde: golvkudde }
}

// En markplan i perspektiv: ljusast längst bort (mot väggen), mörknar mot betraktaren.
function groundlikt(c) {
  return verticalFill(tint(c, 0.12), shade(c, 0.22))
}

// ---- spisplattan ---------------------------------------------------------------

// Plattan i bänkskivans nivå. Sidovy med en aning uppifrån: en platt skiva + ringar.
// setGlod(t) byter bara alpha/tint — geometrin ritas en gång.
export function ritaPlatta() {
  const view = dekor(new Container())
  const rx = SPIS.plattaR
  const cy = SPIS.yta - 4
  const bas = ritning(view)
  bas.ellipse(SPIS.x, cy, rx + 6, 9).fill(topLightFill(P.stal, { highlight: 0.3, dark: 0.3 })).stroke({ width: 2, color: P.stalK })
  bas.ellipse(SPIS.x, cy, rx, 7).fill(0x3a3634)
  bas.ellipse(SPIS.x, cy - 1, rx * 0.66, 4.5).stroke({ width: 1.5, color: 0x5a5452 })
  bas.ellipse(SPIS.x, cy - 1, rx * 0.33, 2.5).stroke({ width: 1.5, color: 0x5a5452 })
  // Glöden: ringarna lyser orangeröda och luften ovanför darrar varmt.
  const glod = ritning(view)
  glod.ellipse(SPIS.x, cy - 10, rx + 16, 20).fill({ color: 0xff8a3d, alpha: 0.22 })
  glod.ellipse(SPIS.x, cy - 4, rx + 6, 11).fill({ color: 0xff9a4a, alpha: 0.3 })
  glod.ellipse(SPIS.x, cy, rx - 2, 6).fill({ color: 0xd9381e, alpha: 0.75 })
  glod.ellipse(SPIS.x, cy - 1, rx * 0.66, 4.5).stroke({ width: 3, color: 0xff7a2a })
  glod.ellipse(SPIS.x, cy - 1, rx * 0.33, 2.5).stroke({ width: 3, color: 0xffa24a })
  glod.ellipse(SPIS.x, cy - 1, rx - 6, 5.5).stroke({ width: 2.5, color: 0xff5a2a })
  glod.alpha = 0
  function setGlod(t) {
    const k = Math.max(0, Math.min(1, Number(t) || 0))
    glod.alpha = k
    // Kall platta: grå. Varm: den mörka skivan drar mot rödbrun även där ringarna inte lyser.
    bas.tint = blanda(0xffffff, 0xffb09a, k)
  }
  return { view, setGlod }
}

// ---- värmereglaget -------------------------------------------------------------

// Hackens färger: kallt blått → orange → rött (steg 1..10). Steg 0 = av.
const STEG_FARG = Array.from({ length: REGLAGE.steg }, (_, i) => {
  const t = i / (REGLAGE.steg - 1)
  return t < 0.5 ? blanda(0x5aa8e6, 0xffa23a, t * 2) : blanda(0xffa23a, 0xf0443a, (t - 0.5) * 2)
})

// Ett vågrätt spår med 10 hack mellan en − och en +, och en knopp som snäpper till hacken.
// knopp/minus/plus är barn i `view`, positionerade i designkoordinater och ritade kring sin
// egen mitt så att index.js kan skala dem (pop) runt mitten.
export function ritaReglage() {
  const view = new Container()
  const { x0, x1, y, steg, knappR, minusX, plusX } = REGLAGE
  const hackX = (i) => x0 + ((x1 - x0) * i) / steg

  // Spåret: en nedsänkt ränna med hacken som prickar.
  const spar = ritning(view)
  spar.eventMode = 'none'
  spar.roundRect(x0 - 16, y - 13, x1 - x0 + 32, 26, 13).fill(verticalFill(shade(0x8f7f68, 0.3), 0x8f7f68)).stroke({ width: 2.5, color: shade(P.spisK, 0.35) })
  spar.roundRect(x0 - 10, y - 6, x1 - x0 + 20, 6, 3).fill({ color: 0x000000, alpha: 0.18 })
  // Av-läget (steg 0): en liten ring.
  spar.circle(x0, y, 5).stroke({ width: 2.5, color: 0xf2e6cf })
  const prickar = []
  for (let i = 1; i <= steg; i++) {
    const pc = new Container()
    pc.eventMode = 'none'
    pc.position.set(hackX(i), y)
    view.addChild(pc)
    const pg = ritning(pc)
    // Prickarna växer mot det varma hållet — mer värme, större prick.
    const r = 4 + i * 0.35
    pg.circle(0, 0, r).fill(sphereFill(STEG_FARG[i - 1], { dark: 0.2 })).stroke({ width: 1.5, color: shade(STEG_FARG[i - 1], 0.4) })
    prickar.push(pc)
  }

  // − och + : stora runda knappar, tecknen RITADE som former (inga texter).
  const knapp = (x, farg, plus) => {
    const c = new Container()
    c.position.set(x, y)
    view.addChild(c)
    const g = ritning(c)
    g.circle(0, 5, knappR).fill({ color: 0x000000, alpha: 0.16 })
    g.circle(0, 0, knappR).fill(sphereFill(farg, { dark: 0.28, highlight: 0.35 })).stroke({ width: 3.5, color: shade(farg, 0.4) })
    g.circle(0, 0, knappR - 9).stroke({ width: 2, color: 0xffffff, alpha: 0.25 })
    const L = knappR * 0.52
    const T = knappR * 0.2
    g.roundRect(-L, -T / 2, L * 2, T, T / 2).fill(COLORS.white).stroke({ width: 2, color: shade(farg, 0.45) })
    if (plus) {
      g.roundRect(-T / 2, -L, T, L * 2, T / 2).fill(COLORS.white).stroke({ width: 2, color: shade(farg, 0.45) })
      // Täck plustecknets inre konturkors så att det läser som ETT tecken.
      g.rect(-T / 2 + 1, -T / 2 + 1, T - 2, T - 2).fill(COLORS.white)
    }
    g.ellipse(-knappR * 0.34, -knappR * 0.42, knappR * 0.28, knappR * 0.16).fill({ color: 0xffffff, alpha: 0.45 })
    return c
  }
  const minus = knapp(minusX, 0x5aa8e6, false)
  const plus = knapp(plusX, 0xf06a3a, true)

  // Greppknoppen: en rund, räfflad ratt (68 px) med en färgad mitt som visar värmen.
  const knopp = new Container()
  knopp.position.set(x0, y)
  view.addChild(knopp)
  const kg = ritning(knopp)
  const kr = 34
  kg.circle(0, 5, kr).fill({ color: 0x000000, alpha: 0.2 })
  // Räfflorna runt kanten: små tänder utanför den runda kroppen.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    kg.circle(Math.cos(a) * (kr - 2), Math.sin(a) * (kr - 2), 5).fill(shade(0xf6ead6, 0.12))
  }
  kg.circle(0, 0, kr - 2).fill(sphereFill(0xf6ead6, { dark: 0.25 })).stroke({ width: 3, color: 0x8a7a60 })
  const mitt = ritning(knopp)
  mitt.circle(0, 0, kr * 0.52).fill(sphereFill(0xffffff, { dark: 0.2, highlight: 0.2 })).stroke({ width: 2.5, color: 0x6a5a48 })
  // En pekare som visar mot hacken.
  kg.roundRect(-3, -kr + 3, 6, 12, 3).fill(0x6a5a48)
  kg.ellipse(-kr * 0.35, -kr * 0.4, kr * 0.26, kr * 0.14).fill({ color: 0xffffff, alpha: 0.5 })

  function setSteg(nSteg) {
    const s = Math.max(0, Math.min(steg, Math.round(Number(nSteg) || 0)))
    knopp.x = hackX(s)
    // Mitten tar hackets färg (grå när spisen är av); tända hack lyser, resten är dova.
    mitt.tint = s === 0 ? 0xc8c0b4 : STEG_FARG[s - 1]
    prickar.forEach((pc, i) => {
      pc.alpha = i < s ? 1 : 0.35
      pc.scale.set(i === s - 1 ? 1.25 : 1)
    })
  }
  setSteg(0)
  return { view, setSteg, knopp, minus, plus }
}

// ---- grytan (glas) -------------------------------------------------------------

// Grytans mått i det lokala rummet (origo = mynningens mitt, y nedåt), härledda ur GRYTA
// exakt som karl.js bygger kroppen.
function karlMatt(K) {
  const tan = Math.tan(K.utfall)
  const cos = Math.cos(K.utfall)
  const bottenB = K.bredd - 2 * K.djup * tan
  const inTopp = K.bredd / 2
  const inBott = bottenB / 2
  const ytterTopp = inTopp + K.vagg / cos
  // Ytterlinjen förlängd ned till golvets underkant.
  const ytterBott = inBott - K.golv * tan + K.vagg / cos
  // Ytterlinjen på golvets ovansida (där innerbotten ligger).
  const ytterVidBotten = inBott + K.vagg / cos
  return { bottenB, inTopp, inBott, ytterTopp, ytterBott, ytterVidBotten, djup: K.djup, golv: K.golv }
}

// Glasgrytan. `view` = [bak, fram, glod, bygel] — bak och fram är självständiga barn med
// origo i mynningens mitt, så index.js kan flytta dem till två containrar med popcornlagret
// emellan. Inget position sätts på `view` själv.
export function ritaGryta() {
  const M = karlMatt(GRYTA)
  const Y1 = M.djup + M.golv
  const rb = M.golv
  const view = new Container()

  // BAK: den bortre glasväggens insida, svag, och metallrandens bortre halva.
  const bak = new Container()
  const bg = ritning(bak)
  bg.moveTo(-M.inTopp, 0).lineTo(-M.inBott, M.djup).lineTo(M.inBott, M.djup).lineTo(M.inTopp, 0).closePath()
    .fill({ color: 0xbcdaea, alpha: 0.2 })
  // Bortre väggens reflex: ett långt, svagt streck.
  bg.moveTo(M.inTopp - 26, 8).lineTo(M.inBott - 18, M.djup - 10).stroke({ width: 5, color: 0xffffff, alpha: 0.22, cap: 'round' })
  bakkant(bg, 0, 0, M.inTopp + 4, 8).stroke({ width: 5, color: shade(P.stal, 0.18), cap: 'round' })

  // FRAM: glasytan, glasets tjocklek i kanterna, metallbotten, metallrand och reflexer.
  const fram = new Container()
  const fg = ritning(fram)
  karlForm(fg, M.ytterTopp, M.ytterBott, 0, Y1, rb).fill({ color: P.glas, alpha: 0.22 })
  // Glaset syns tjockare där man ser det från kanten — väggarna.
  for (const s of [-1, 1]) {
    fg.moveTo(s * M.ytterTopp, 0).lineTo(s * M.inTopp, 0).lineTo(s * M.inBott, M.djup).lineTo(s * M.ytterVidBotten, M.djup).closePath()
      .fill({ color: 0xcfe8f4, alpha: 0.5 })
  }
  // Metallbotten: golvet (djup..djup+golv) med de rundade hörnen.
  const Ld = Math.hypot(M.ytterBott - M.ytterTopp, Y1)
  const ddx = (M.ytterBott - M.ytterTopp) / Ld
  const ddy = Y1 / Ld
  fg.moveTo(-M.ytterVidBotten, M.djup)
    .lineTo(-(M.ytterBott - ddx * rb), Y1 - ddy * rb)
    .quadraticCurveTo(-M.ytterBott, Y1, -M.ytterBott + rb, Y1)
    .lineTo(M.ytterBott - rb, Y1)
    .quadraticCurveTo(M.ytterBott, Y1, M.ytterBott - ddx * rb, Y1 - ddy * rb)
    .lineTo(M.ytterVidBotten, M.djup).closePath()
    .fill(topLightFill(P.stal, { highlight: 0.35, dark: 0.3 })).stroke({ width: 2.5, color: P.stalK, join: 'round' })
  fg.moveTo(-M.inBott + 4, M.djup + 4).lineTo(M.inBott - 4, M.djup + 4).stroke({ width: 2, color: 0xffffff, alpha: 0.55, cap: 'round' })
  // Glasets kontur.
  karlForm(fg, M.ytterTopp, M.ytterBott, 0, Y1, rb).stroke({ width: 3, color: P.glasKant, alpha: 0.95, join: 'round' })
  // Reflexerna: två långa ljusa streck längs vänster vägg och ett kort till höger.
  const langs = (t0, t1, off, bredd, alpha) => {
    const xa = -M.inTopp + off
    const xb = -M.inBott + off * 0.8
    fg.moveTo(xa + (xb - xa) * t0, M.djup * t0).lineTo(xa + (xb - xa) * t1, M.djup * t1)
      .stroke({ width: bredd, color: 0xffffff, alpha, cap: 'round' })
  }
  langs(0.12, 0.82, 14, 7, 0.75)
  langs(0.2, 0.55, 28, 4, 0.55)
  fg.moveTo(M.inTopp - 12, 18).lineTo(M.inTopp - 16, 34).stroke({ width: 5, color: 0xffffff, alpha: 0.6, cap: 'round' })
  // Metallranden upptill: främre halvan av mynningens ellips + kapslar över väggarnas topp.
  framkant(fg, 0, 0, M.inTopp + 4, 8).stroke({ width: 7, color: P.stal, cap: 'round' })
  framkant(fg, 0, -1.5, M.inTopp + 2, 7).stroke({ width: 2, color: 0xffffff, alpha: 0.6, cap: 'round' })
  for (const s of [-1, 1]) {
    fg.roundRect(s > 0 ? M.inTopp - 4 : -M.ytterTopp - 3, -5, M.ytterTopp - M.inTopp + 7, 11, 5)
      .fill(topLightFill(P.stal, { highlight: 0.4, dark: 0.25 })).stroke({ width: 2, color: P.stalK })
    // Öronen där bygeln sitter: små nitade flikar utanför kanten.
    const ox = s * (M.ytterTopp + 5)
    fg.roundRect(ox - 7, -6, 14, 22, 6).fill(topLightFill(P.stal, { highlight: 0.35, dark: 0.3 })).stroke({ width: 2, color: P.stalK })
    fg.circle(ox, 8, 2.6).fill(P.stalK)
  }

  // GLOD: värmen underifrån — metallbotten drar mot orange och ett sken under kanten.
  const glod = dekor(new Container())
  const gg = ritning(glod)
  gg.moveTo(-M.ytterVidBotten, M.djup)
    .lineTo(-(M.ytterBott - ddx * rb), Y1 - ddy * rb)
    .quadraticCurveTo(-M.ytterBott, Y1, -M.ytterBott + rb, Y1)
    .lineTo(M.ytterBott - rb, Y1)
    .quadraticCurveTo(M.ytterBott, Y1, M.ytterBott - ddx * rb, Y1 - ddy * rb)
    .lineTo(M.ytterVidBotten, M.djup).closePath()
    .fill(verticalFillAlpha(0xff9a3a, 0xe8401e, 0.25, 0.9))
  gg.ellipse(0, Y1 + 2, M.ytterBott + 6, 7).fill({ color: 0xff8a3d, alpha: 0.5 })
  glod.alpha = 0

  // BYGELN: ståltråd från öronen upp till toppen (y = −GRYTA.bygel), med ett trähandtag.
  const bygel = new Container()
  const yg = ritning(bygel)
  const ox = M.ytterTopp + 5
  const top = -GRYTA.bygel
  const tradVag = (g) => g.moveTo(-ox, 6).bezierCurveTo(-ox, top * 0.55, -ox * 0.55, top, 0, top).bezierCurveTo(ox * 0.55, top, ox, top * 0.55, ox, 6)
  tradVag(yg).stroke({ width: 7, color: P.stalK, cap: 'round', join: 'round' })
  tradVag(yg).stroke({ width: 3.5, color: tint(P.stal, 0.2), cap: 'round', join: 'round' })
  // Handtaget: en tjock trärulle i toppen — där barnet greppar.
  yg.roundRect(-38, top - 10, 76, 20, 10).fill(cylinderFill(0xd9483b, { axis: 'x', dark: 0.3 })).stroke({ width: 3, color: shade(0xd9483b, 0.45) })
  for (const rx of [-26, 26]) yg.roundRect(rx - 3, top - 10, 6, 20, 2).fill(shade(0xd9483b, 0.25))
  yg.roundRect(-24, top - 6, 40, 4, 2).fill({ color: 0xffffff, alpha: 0.45 })

  view.addChild(bak, fram, glod, bygel)
  view.bak = bak
  view.fram = fram
  return { view, bygel, glod }
}

// ---- locket --------------------------------------------------------------------

// Glaslock med metallkant, centrerat i origo. Plattan LOCK.bredd × LOCK.tjock; knoppen
// (radie LOCK.knoppR) sitter mitt på med sin mitt på y = −tjock/2 − knoppR.
export function ritaLock() {
  const c = new Container()
  const g = ritning(c)
  const hw = LOCK.bredd / 2
  const ht = LOCK.tjock / 2
  // En låg glaskupa ovanpå plattan (6 px) — läser som ett lock, inte som en bräda.
  g.moveTo(-hw + 10, -ht).quadraticCurveTo(0, -ht - 12, hw - 10, -ht).closePath().fill({ color: 0xcfe8f4, alpha: 0.6 }).stroke({ width: 2.5, color: P.glasKant })
  g.roundRect(-hw, -ht, LOCK.bredd, LOCK.tjock, ht).fill(topLightFill(P.stal, { highlight: 0.4, dark: 0.3 })).stroke({ width: 2.5, color: P.stalK })
  g.roundRect(-hw + 3, -ht + 2, LOCK.bredd - 6, 3, 1.5).fill({ color: 0xffffff, alpha: 0.7 })
  g.moveTo(-hw + 30, -ht - 2).quadraticCurveTo(-hw + 60, -ht - 7, -hw + 90, -ht - 7).stroke({ width: 3, color: 0xffffff, alpha: 0.6, cap: 'round' })
  // Knoppen: en röd kula på en kort hals.
  const kr = LOCK.knoppR
  const ky = -ht - kr
  g.roundRect(-6, ky + kr * 0.4, 12, kr * 0.8, 3).fill(topLightFill(P.stal)).stroke({ width: 2, color: P.stalK })
  g.circle(0, ky, kr).fill(sphereFill(0xd9483b, { dark: 0.3 })).stroke({ width: 3, color: shade(0xd9483b, 0.45) })
  g.ellipse(-kr * 0.32, ky - kr * 0.36, kr * 0.34, kr * 0.2).fill({ color: 0xffffff, alpha: 0.55 })
  return c
}

// ---- majspåsen ----------------------------------------------------------------

// En ritad majskolv (motivet på påsen), centrerad i (cx, cy), höjd h.
function ritaMajskolv(g, cx, cy, h) {
  const w = h * 0.44
  // Blasten: två gröna blad som omfamnar kolven nedifrån.
  for (const s of [-1, 1]) {
    g.moveTo(cx, cy + h * 0.5).quadraticCurveTo(cx + s * w * 1.1, cy + h * 0.1, cx + s * w * 0.35, cy - h * 0.3)
      .quadraticCurveTo(cx + s * w * 0.55, cy + h * 0.15, cx, cy + h * 0.5).closePath()
      .fill(topLightFill(0x6cbf6a, { highlight: 0.2, dark: 0.25 })).stroke({ width: 1.5, color: 0x3f8a48, join: 'round' })
  }
  g.ellipse(cx, cy - h * 0.05, w / 2, h * 0.42).fill(sphereFill(0xf7c540, { dark: 0.25 })).stroke({ width: 1.5, color: 0xb8801e })
  // Kornraderna.
  for (let r = 0; r < 6; r++) {
    const yy = cy - h * 0.36 + r * h * 0.12
    const bredd = Math.sqrt(Math.max(0, 1 - ((yy - (cy - h * 0.05)) / (h * 0.42)) ** 2)) * (w / 2)
    for (let k = -1; k <= 1; k++) {
      const xx = cx + k * bredd * 0.55
      g.ellipse(xx, yy, 2.4, 2.8).fill({ color: 0xfff0a0, alpha: 0.9 })
    }
  }
}

// Papperspåsen i sitt LOKALA rum (origo = mynningens mitt). Ogenomskinligt papper — kornen
// syns när de rinner ut. `view` = [bak, fram], självständiga barn med origo i mynningen.
export function ritaPase() {
  const M = karlMatt(PASE)
  const Y1 = M.djup + M.golv
  const view = new Container()

  // BAK: bortre pappersväggen, som sticker upp lite över framsidan med en rufsig kant.
  const bak = new Container()
  const bg = ritning(bak)
  const tand = (g, xa, xb, yLag, yHog, n) => {
    for (let i = 0; i <= n; i++) {
      const x = xa + ((xb - xa) * i) / n
      g.lineTo(x, i % 2 ? yHog : yLag)
    }
  }
  bg.moveTo(-M.ytterBott, Y1 - 2).lineTo(-M.ytterTopp + 1, -2)
  tand(bg, -M.ytterTopp + 1, M.ytterTopp - 1, -6, -13, 8)
  bg.lineTo(M.ytterBott, Y1 - 2).closePath().fill(topLightFill(P.kraftM, { highlight: 0.1, dark: 0.3 })).stroke({ width: 2.5, color: shade(P.kraftM, 0.35), join: 'round' })

  // FRAM: framsidan med en nedvikt krage, majskolven och vecken.
  const fram = new Container()
  const fg = ritning(fram)
  const kant = 6
  fg.moveTo(-M.ytterTopp, kant)
  const hw = (y) => M.ytterTopp + (M.ytterBott - M.ytterTopp) * (y / Y1)
  fg.lineTo(-(M.ytterBott - 2), Y1 - 4).quadraticCurveTo(-M.ytterBott, Y1, -M.ytterBott + 6, Y1)
    .lineTo(M.ytterBott - 6, Y1).quadraticCurveTo(M.ytterBott, Y1, M.ytterBott - 2, Y1 - 4)
    .lineTo(M.ytterTopp, kant)
  tand(fg, M.ytterTopp, -M.ytterTopp, kant, kant - 5, 8)
  fg.closePath().fill(topLightFill(P.kraft, { highlight: 0.22, dark: 0.18 })).stroke({ width: 2.5, color: shade(P.kraft, 0.45), join: 'round' })
  // Kragen: en nedvikt remsa med sicksack-underkant.
  const kragY = 22
  fg.moveTo(-M.ytterTopp - 1, kant - 2).lineTo(M.ytterTopp + 1, kant - 2).lineTo(hw(kragY) + 1, kragY)
  tand(fg, hw(kragY) + 1, -hw(kragY) - 1, kragY, kragY + 5, 8)
  fg.closePath().fill(topLightFill(shade(P.kraft, 0.1), { highlight: 0.3, dark: 0.1 })).stroke({ width: 2, color: shade(P.kraft, 0.45), join: 'round' })
  // Motivet: en röd rund etikett med majskolven.
  const ey = 64
  fg.circle(0, ey, 26).fill(sphereFill(0xe0554a, { dark: 0.22 })).stroke({ width: 2.5, color: shade(0xe0554a, 0.4) })
  fg.circle(0, ey, 21).stroke({ width: 1.5, color: 0xfff0d0, alpha: 0.8 })
  ritaMajskolv(fg, 0, ey + 1, 34)
  // Vecken: lodräta pappersveck och en bottenfals.
  for (const s of [-1, 1]) {
    fg.moveTo(s * (M.ytterTopp - 9), kragY + 6).lineTo(s * (M.ytterBott - 10), Y1 - 6).stroke({ width: 1.5, color: shade(P.kraft, 0.3), alpha: 0.6 })
  }
  fg.moveTo(-M.ytterBott + 8, Y1 - 10).lineTo(M.ytterBott - 8, Y1 - 10).stroke({ width: 1.5, color: shade(P.kraft, 0.3), alpha: 0.5 })
  fg.moveTo(-M.ytterTopp + 6, kragY + 10).lineTo(-M.ytterTopp + 10, kragY + 40).stroke({ width: 3, color: 0xffffff, alpha: 0.35, cap: 'round' })

  view.addChild(bak, fram)
  view.bak = bak
  view.fram = fram
  return { view, bak, fram }
}

// ---- skålarna ------------------------------------------------------------------

// Popcornskål i DESIGNKOORDINATER: randig kartongskål med rullad kant och en liten fot.
// `bak` = insidan (bakom popcornen), `fram` = skålens kropp + främre kanten (framför dem).
export function ritaSkal(s, farg) {
  const rx = s.kantB / 2
  const ry = 13
  const botY = s.botten + 3
  const fotY = BORD.yta
  const halvB = s.bottenB / 2 + 4
  // Kroppens halva bredd på relativ höjd t (0 = mynningen, 1 = botten): raka sidor upptill
  // som rundar in mot botten — en skål, inte en tratt.
  const hw = (t) => rx - (rx - halvB) * t * t
  // Kroppens övre kant följer mynningens främre halva: y på relativ bredd u (−1..1).
  const topp = (u) => s.kant + ry * Math.sqrt(Math.max(0, 1 - u * u))
  const yAt = (u, t) => topp(u) + (botY - topp(u)) * t

  const bak = dekor(new Container())
  const bg = ritning(bak)
  bg.ellipse(s.x, fotY + 1, rx * 0.7, 5).fill({ color: 0x000000, alpha: 0.2 })
  bg.ellipse(s.x, s.kant, rx, ry).fill(verticalFill(shade(farg, 0.45), tint(farg, 0.5)))
  bakkant(bg, s.x, s.kant, rx, ry).stroke({ width: 7, color: tint(farg, 0.75), cap: 'round' })

  const fram = dekor(new Container())
  const fg = ritning(fram)
  // Foten.
  fg.roundRect(s.x - halvB * 0.8, botY - 2, halvB * 1.6, fotY - botY + 2, 3).fill(shade(farg, 0.3))
  // Kroppen i krämvitt, sedan ränderna ovanpå — varannan i skålens färg.
  const STEG = 10
  const kropp = (g) => {
    g.moveTo(s.x - rx, s.kant)
    for (let i = 1; i <= STEG; i++) {
      const t = i / STEG
      g.lineTo(s.x - hw(t), s.kant + (botY - s.kant) * t)
    }
    g.lineTo(s.x + hw(1), botY)
    for (let i = STEG - 1; i >= 0; i--) {
      const t = i / STEG
      g.lineTo(s.x + hw(t), s.kant + (botY - s.kant) * t)
    }
    // Upptill: mynningens främre halva, höger → vänster.
    for (let i = 1; i < 16; i++) {
      const u = 1 - (2 * i) / 16
      g.lineTo(s.x + u * rx, topp(u))
    }
    return g.closePath()
  }
  kropp(fg).fill(topLightFill(0xfffaf0, { highlight: 0.1, dark: 0.12 }))
  const RANDER = 9
  for (let j = 0; j < RANDER; j++) {
    if (j % 2) continue
    const ua = -1 + (2 * j) / RANDER
    const ub = -1 + (2 * (j + 1)) / RANDER
    // Ränderna följer kroppens form: ett band mellan två "meridianer".
    for (let i = 0; i <= STEG; i++) {
      const t = i / STEG
      const p = { x: s.x + ua * hw(t), y: yAt(ua, t) }
      if (i === 0) fg.moveTo(p.x, p.y)
      else fg.lineTo(p.x, p.y)
    }
    for (let i = STEG; i >= 0; i--) {
      const t = i / STEG
      fg.lineTo(s.x + ub * hw(t), yAt(ub, t))
    }
    fg.closePath()
  }
  fg.fill(topLightFill(farg, { highlight: 0.2, dark: 0.22 }))
  // Skugga mot botten så kroppen läser rund.
  fg.moveTo(s.x - hw(0.7), s.kant + (botY - s.kant) * 0.7).quadraticCurveTo(s.x, botY + 8, s.x + hw(0.7), s.kant + (botY - s.kant) * 0.7)
    .lineTo(s.x + hw(1), botY).lineTo(s.x - hw(1), botY).closePath().fill({ color: 0x000000, alpha: 0.1 })
  kropp(fg).stroke({ width: 3, color: shade(farg, 0.45), join: 'round' })
  // Den rullade kanten fram.
  framkant(fg, s.x, s.kant, rx, ry).stroke({ width: 8, color: tint(farg, 0.82), cap: 'round' })
  framkant(fg, s.x, s.kant + 3, rx - 2, ry).stroke({ width: 2, color: shade(farg, 0.3), alpha: 0.6, cap: 'round' })
  // Glans på vänster sida.
  fg.moveTo(s.x - rx * 0.78, s.kant + 20).quadraticCurveTo(s.x - rx * 0.8, s.kant + 38, s.x - rx * 0.62, s.kant + 54)
    .stroke({ width: 5, color: 0xffffff, alpha: 0.45, cap: 'round' })
  return { bak, fram }
}

// ---- kornen och popcornen -------------------------------------------------------

// Ett okokt majskorn: bred rundad krona upptill, smal spets nedtill med en ljus fästpunkt.
// Radie ≈ KORN.r, centrerat i origo — fysiken vrider det.
export function ritaKorn() {
  const g = new Graphics()
  const k = KORN.r / 5
  g.moveTo(0, 6 * k)
    .bezierCurveTo(-3 * k, 4.5 * k, -5.6 * k, 0, -5.2 * k, -2.6 * k)
    .bezierCurveTo(-4.8 * k, -6 * k, 4.8 * k, -6 * k, 5.2 * k, -2.6 * k)
    .bezierCurveTo(5.6 * k, 0, 3 * k, 4.5 * k, 0, 6 * k)
    .closePath()
    .fill(sphereFill(P.korn, { dark: 0.3, highlight: 0.4 }))
    .stroke({ width: 1.2, color: shade(P.korn, 0.45) })
  // Grodden: en ljusare droppe mitt på, och den vita spetsen längst ned.
  g.ellipse(0, 0.5 * k, 1.7 * k, 2.8 * k).fill({ color: 0xffe9a0, alpha: 0.85 })
  g.ellipse(0, 4.6 * k, 1.4 * k, 1.1 * k).fill(0xfff6df)
  return g
}

// Popcornets silhuett: 5–7 lober ur fröet, radiefaktor ~0,8–1,15 runt 1. Samma funktion
// används av Mjukkroppen under poppen och av den färdiga bilden, så de två stämmer.
export function popcornForm(seed) {
  const r = slump((seed | 0) * 2654435761)
  const n = 5 + Math.floor(r() * 3)
  const lober = []
  for (let i = 0; i < n; i++) {
    lober.push({
      c: ((i + (r() - 0.5) * 0.55) / n) * Math.PI * 2,
      amp: 0.16 + r() * 0.16,
      w: (Math.PI / n) * (0.55 + r() * 0.3),
    })
  }
  const TVA_PI = Math.PI * 2
  const form = (a) => {
    let f = 0.8
    for (const l of lober) {
      let d = (a - l.c) % TVA_PI
      if (d > Math.PI) d -= TVA_PI
      if (d < -Math.PI) d += TVA_PI
      f += l.amp * Math.exp(-((d / l.w) ** 2))
    }
    return Math.max(0.8, Math.min(1.15, f))
  }
  // Lobernas riktningar följer med, så bilden kan lägga en puff i varje lob.
  form.lober = lober.map((l) => l.c)
  return form
}

// Brändhetens tint: vit → gyllenbrun → mörkbrun (fortfarande gullig — aldrig svart).
function brandTint(t) {
  const k = Math.max(0, Math.min(1, Number(t) || 0))
  return k < 0.5 ? blanda(0xffffff, 0xf2b870, k * 2) : blanda(0xf2b870, 0xb0784c, (k - 0.5) * 2)
}

// Samma mjuka kurva som Mjukkropp.path(): kvadratiska steg genom kantmittpunkterna.
function mjukVag(g, pts) {
  const n = pts.length
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  let m = mid(pts[n - 1], pts[0])
  g.moveTo(m.x, m.y)
  for (let i = 0; i < n; i++) {
    m = mid(pts[i], pts[(i + 1) % n])
    g.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y)
  }
  return g.closePath()
}

function formPunkter(form, r, n = 28, skala = 1) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    const f = form(a) * r * skala
    pts.push({ x: Math.cos(a) * f, y: Math.sin(a) * f })
  }
  return pts
}

// Ett färdigt popcorn. Lagren ritas EN gång; setBrand byter bara tint och alpha.
export function ritaPopcorn(seed, r) {
  const form = popcornForm(seed)
  const rnd = slump((seed | 0) + 911)
  const view = new Container()
  const pts = formPunkter(form, r)

  // Kroppen i krämvitt (tintas mot brunt).
  const kropp = ritning(view)
  mjukVag(kropp, pts).fill(P.popcorn)
  // En ljus puff i varje lob — det är de som gör klumpen till ett fluffigt popcorn.
  for (const c of form.lober) {
    const d = form(c) * r * 0.5
    kropp.circle(Math.cos(c) * d, Math.sin(c) * d, r * 0.38).fill({ color: 0xfffdf6, alpha: 0.9 })
  }
  kropp.circle(0, 0, r * 0.3).fill({ color: 0xffffff, alpha: 0.5 })
  // Veck mellan loberna: korta böjda streck från kanten in mot mitten, där formen har en dal.
  const veck = ritning(view)
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 - Math.PI / 2
    const f = form(a)
    const fa = form(a - 0.22)
    const fb = form(a + 0.22)
    if (f < fa && f < fb) {
      const ro = f * r * 0.94
      const ri = f * r * 0.5
      veck.moveTo(Math.cos(a) * ro, Math.sin(a) * ro).quadraticCurveTo(Math.cos(a + 0.2) * ri * 1.3, Math.sin(a + 0.2) * ri * 1.3, Math.cos(a) * ri, Math.sin(a) * ri)
    }
  }
  veck.stroke({ width: Math.max(1.2, r * 0.1), color: P.popcornK, alpha: 0.6, cap: 'round' })
  // Rostade prickar som bara syns när popcornet blivit brunt.
  const rost = ritning(view)
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2
    const d = r * (0.25 + rnd() * 0.45)
    rost.circle(Math.cos(a) * d, Math.sin(a) * d, r * (0.1 + rnd() * 0.08)).fill(0x8a5a3b)
  }
  rost.alpha = 0
  // Skalbiten: en liten gyllene flaga (en böjd trekant, inte en oval — en oval läste som ett
  // öga) som sitter kvar i en dal nära mitten, slumpat vriden.
  const sa = rnd() * Math.PI * 2
  const skal = new Container()
  skal.position.set(Math.cos(sa) * r * 0.22, Math.sin(sa) * r * 0.22)
  skal.rotation = sa
  view.addChild(skal)
  const sr = r * 0.26
  ritning(skal).moveTo(-sr, -sr * 0.2).quadraticCurveTo(0, -sr * 0.9, sr, -sr * 0.3).quadraticCurveTo(sr * 0.3, sr * 0.2, -sr * 0.1, sr * 0.7)
    .quadraticCurveTo(-sr * 0.5, sr * 0.2, -sr, -sr * 0.2).closePath().fill(P.skal).stroke({ width: 1, color: shade(P.skal, 0.3), join: 'round' })
  // Konturen, mjuk och varm.
  const kontur = ritning(view)
  mjukVag(kontur, pts).stroke({ width: Math.max(1.5, r * 0.14), color: P.popcornK, join: 'round' })
  // Glansen.
  const glans = ritning(view)
  glans.ellipse(-r * 0.32, -r * 0.36, r * 0.22, r * 0.13).fill({ color: 0xffffff, alpha: 0.85 })

  function setBrand(t) {
    const k = Math.max(0, Math.min(1, Number(t) || 0))
    const tn = brandTint(k)
    kropp.tint = tn
    veck.tint = tn
    kontur.tint = tn
    rost.alpha = Math.max(0, (k - 0.35) * 1.4)
    glans.alpha = 1 - k * 0.55
  }
  setBrand(0)
  return { view, setBrand }
}

// Ett popcorn MITT I poppen: Mjukkroppen ritad med samma färger som det färdiga popcornet
// (kroppens krämvitt × brändhetens tint). Två path-anrop per bildruta: kropp + glans.
export function ritaPopcornMjuk(g, mjukkropp, brand) {
  const tn = brandTint(brand)
  g.clear()
  mjukkropp.path(g).fill(multiplicera(P.popcorn, tn)).stroke({ width: 2, color: multiplicera(P.popcornK, tn), join: 'round' })
  mjukkropp.path(g, 0.6).fill({ color: 0xffffff, alpha: 0.4 * (1 - Math.max(0, Math.min(1, brand || 0)) * 0.6) })
  return g
}
