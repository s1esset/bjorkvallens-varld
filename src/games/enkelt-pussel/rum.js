// Rummet pusslet ligger i: ett trabord med plankor, ljus från ett fönster och en
// penna + två klossar kvar vid kanten, på ett golv med brädor. (L2: förut låg pusslet på
// en krämplatta — en enda ton i skalets letterbox.)
//
// Allt här är KULISS och ritas en gång (inga gradienter per montering — verticalFill
// cachar per färgpar, och tre par används). Inget rör sig och inget fångar tryck utom
// golvet, som spelet själv hänger kvitteringen på.
import { Container, Graphics } from 'pixi.js'
import { verticalFill } from '../../lib/form.js'
import { COLORS } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// Bordsskivan. Pusselramen (120..620 × 110..610) och spridningsytan (700..1200) ligger
// innanför; 64 px golv syns på var sida och 30 px bordskant under.
const T = { x0: 64, x1: 1216, y1: 656, r: 36 }

const C_GOLV_TOP = 0xb4c7d3
const C_GOLV_BOT = 0x9db3c2
const C_BORD_TOP = 0xedc890
const C_BORD_BOT = 0xdcb176
const C_KANT = 0xb98550
const C_SKARV = 0xa97c46

// Fast pseudoslump: rummet ska se likadant ut varje gång (och drar aldrig Math.random).
function lcg(fro) {
  let s = fro >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * @returns {{ golv: Graphics, bord: Container }} `golv` är helskärmsytan (spelet hänger
 *   kvitteringen på den); `bord` är all kuliss ovanpå, utan träffyta.
 */
export function byggRum(W, H) {
  const x0 = -BLEED_X
  const y0 = -BLEED_Y
  const bredd = W + 2 * BLEED_X
  const hojd = H + 2 * BLEED_Y

  // ---- Golvet: en helskärmsyta med brädor (det syns bara i kanterna runt bordet) ----
  const golv = new Graphics().rect(x0, y0, bredd, hojd).fill(verticalFill(C_GOLV_TOP, C_GOLV_BOT))
  golv.eventMode = 'static'

  const bord = new Container()
  bord.eventMode = 'none'
  bord.interactiveChildren = false

  const fog = new Graphics()
  for (let x = x0 + 40; x < x0 + bredd; x += 96) fog.moveTo(x, y0).lineTo(x, y0 + hojd)
  fog.stroke({ width: 3, color: 0x6f8594, alpha: 0.2 })
  bord.addChild(fog)

  // ---- Bordet: skugga på golvet, framkant, skiva ----
  const w = T.x1 - T.x0
  const skugga = new Graphics().roundRect(T.x0 + 12, T.y1 - 90, w, 130, T.r).fill({ color: COLORS.shadow, alpha: 0.18 })
  bord.addChild(skugga)

  const kant = new Graphics().roundRect(T.x0, T.y1 - 60, w, 90, T.r).fill(C_KANT)
  kant.roundRect(T.x0 + 24, T.y1 + 14, w - 48, 4, 2).fill({ color: COLORS.white, alpha: 0.14 }) // ljuskant
  bord.addChild(kant)

  // Skivan: EN form (rundade nedre hörn) så toningen aldrig får en söm.
  const skiva = new Graphics()
    .moveTo(T.x0, y0)
    .lineTo(T.x1, y0)
    .lineTo(T.x1, T.y1 - T.r)
    .quadraticCurveTo(T.x1, T.y1, T.x1 - T.r, T.y1)
    .lineTo(T.x0 + T.r, T.y1)
    .quadraticCurveTo(T.x0, T.y1, T.x0, T.y1 - T.r)
    .closePath()
    .fill(verticalFill(C_BORD_TOP, C_BORD_BOT))
  bord.addChild(skiva)

  // Plankor: lagda vågrätt, 104 px höga, med skarvar som ligger förskjutna rad för rad.
  const slump = lcg(7121)
  const plank = new Graphics()
  const ljus = new Graphics()
  const adring = new Graphics()
  const PH = 104
  for (let rad = 0, y = y0 + 40; y < T.y1 + 4; rad++, y += PH) {
    plank.moveTo(T.x0, y).lineTo(T.x1, y)
    ljus.moveTo(T.x0, y + 3).lineTo(T.x1, y + 3)
    // Stötskarv: ett kort lodrätt streck, förskjutet per rad.
    const sx = T.x0 + 220 + ((rad * 331) % 760)
    const sy = Math.min(y + PH, T.y1 - 4) // sista radens skarv slutar vid skivans kant
    plank.moveTo(sx, y).lineTo(sx, sy)
    ljus.moveTo(sx + 3, y + 4).lineTo(sx + 3, sy)
    // Ådring: tre långa, svagt böjda streck per planka.
    for (let k = 0; k < 3; k++) {
      const ay = y + 18 + k * 28 + slump() * 8
      const ax = T.x0 + 30 + slump() * 400
      const len = 260 + slump() * 420
      adring.moveTo(ax, ay).quadraticCurveTo(ax + len / 2, ay + (slump() - 0.5) * 10, ax + len, ay + (slump() - 0.5) * 6)
    }
  }
  plank.stroke({ width: 3, color: C_SKARV, alpha: 0.32 })
  ljus.stroke({ width: 2, color: COLORS.white, alpha: 0.16 })
  adring.stroke({ width: 2, color: C_SKARV, alpha: 0.13 })
  bord.addChild(plank, ljus, adring)

  // Kvistar: tre ringar i plankan, långt från pusselytorna.
  const kvist = new Graphics()
  for (const [kx, ky] of [[96, 300], [1190, 480], [1160, 70]]) {
    kvist.ellipse(kx, ky, 15, 8).stroke({ width: 2.5, color: C_SKARV, alpha: 0.3 })
    kvist.ellipse(kx, ky, 7, 3.5).fill({ color: C_SKARV, alpha: 0.22 })
  }
  bord.addChild(kvist)

  // Fönsterljus snett över bordet: två mjuka band. Ligger OVANPÅ skivan men under allt
  // spelet ritar, så kortet och bitarna får ljuset på sig.
  const sken = new Graphics()
  sken.poly([760, y0, 940, y0, 560, T.y1, 380, T.y1]).fill({ color: COLORS.white, alpha: 0.09 })
  sken.poly([980, y0, 1040, y0, 660, T.y1, 600, T.y1]).fill({ color: COLORS.white, alpha: 0.07 })
  bord.addChild(sken)

  // Kanten mot golvet: en ljus linje där skivan slutar.
  const rand = new Graphics()
    .moveTo(T.x0 + T.r, T.y1 - 2)
    .lineTo(T.x1 - T.r, T.y1 - 2)
    .stroke({ width: 3, color: COLORS.white, alpha: 0.28 })
  bord.addChild(rand)

  // ---- Kvarglömda saker vid bordets framkant (under pusselramens skugga, y ≥ 628) ----
  bord.addChild(ritaPenna(150, 642), ritaKloss(372, 641, COLORS.blue, 0.1), ritaKloss(414, 645, COLORS.red, -0.24, 28))

  return { golv, bord }
}

// En ritad penna som ligger på sidan: spets, stift, kropp, hylsa, suddgummi.
function ritaPenna(x, y) {
  const c = new Container()
  c.position.set(x, y)
  c.rotation = 0.03
  const g = new Graphics()
  g.ellipse(60, 12, 74, 5).fill({ color: COLORS.shadow, alpha: 0.16 }) // skugga
  g.rect(0, -7, 110, 14).fill(COLORS.red) // kropp
  g.rect(0, -7, 110, 4).fill({ color: COLORS.white, alpha: 0.28 }) // glans
  g.poly([0, -7, 0, 7, -22, 0]).fill(0xf0d0a8) // träspets
  g.poly([-12, -3.5, -12, 3.5, -22, 0]).fill(0x4a4a52) // stift
  g.rect(110, -7, 10, 14).fill(0xb8c2ca) // hylsa
  g.roundRect(120, -7, 13, 14, 5).fill(0xff9ec4) // suddgummi
  c.addChild(g)
  return c
}

// En liten leksaksklloss: skugga, kropp, ljus ovansida.
function ritaKloss(x, y, farg, vrid, s = 34) {
  const c = new Container()
  c.position.set(x, y)
  c.rotation = vrid
  const g = new Graphics()
  const h = s / 2
  g.ellipse(2, h - 1, h + 5, 6).fill({ color: COLORS.shadow, alpha: 0.18 })
  g.roundRect(-h, -h, s, s, 6).fill(farg)
  g.roundRect(-h + 3, -h + 3, s - 6, s * 0.34, 4).fill({ color: COLORS.white, alpha: 0.3 })
  c.addChild(g)
  return c
}
