// VATTENBALLONGERNA — tal, ljud och små rena hjälpare (ingen Pixi här).
import { COLORS } from '../../lib/theme.js'

export const W = 1280
export const H = 720

// --- Världen ---------------------------------------------------------------------------------
export const MARK_Y = 660 // markens yta: ballongens mittpunkt vilar vid MARK_Y - BALL_R
export const BALL_R = 26
export const BALL_FA = 0.006 // frictionAir — samma tal i den riktiga kroppen och i skuggvärldens provkula
export const GRAV_Y = 1 // matters gravityY → 0,2778 px/steg²
export const G_STEG = 0.2778

// Skjutplatsen = där ballongen hänger vid kranens pip. x ≤ 950 och y ≤ 600 (harnessens autotryck).
export const SKOTT = { x: 262, y: 508 }
export const KRAN_X = 112 // kranens fot (stående rör)
export const KRAN_Y = 664
export const PIP = { x: 262, y: 424 } // pipens mynning

// Dragkontrollen (slangbella: dra bakåt → skjut framåt).
export const MAX_KRAFT = 22
export const MIN_KRAFT = 7
export const KRAFT_SKALA = 0.13
export const TAP_ANDEL = 0.62

// --- Djuren ----------------------------------------------------------------------------------
// Fyra platser från vänster till höger; ett djur vandrar ±SVANG kring sin plats och håller sig
// därmed alltid >= 130 px från grannen.
export const PLATSER = [500, 710, 920, 1130]
export const SVANG = 18
export const DJUR_STORLEK = 0.85 // alla djur skalas så att grannarna aldrig överlappar
export const DJUR_FOTER = [648, 668, 654, 672] // fotens y per plats — lite djup, ingen ligger bakom en annan
export const TRAFF_R = 128 // hur nära ett stänk måste landa för att djuret ska bli svalt

// Värmen: solen värmer upp ETT svalt djur i taget, aldrig fler än TAK_UPPVARMNING per runda.
export const TAK_UPPVARMNING = 2
export const UPPVARMNING_S = 7.5 // sekunder för ett djur att gå från svalt till varmt
export const FORSTA_UPPVARMNING_S = 11 // tidigast efter första träffen

// --- Vind ------------------------------------------------------------------------------------
// Vinden är luftens fart w (px/steg, lib/vind.js). Kraften på ballongen blir a = BALL_FA·w px/steg²,
// och det är samma tal pricklinjen får (AimLauncher previewWind) — vinden syns alltså i linjen.
export const VIND_MAX = 7.5

// Vind för kast nummer n. Första kasten är nästan stilla; sedan växer taket med antalet svala djur
// och rundan, men aldrig över VIND_MAX. Tecknet byter helst sida mot förra kastet.
export function valjVind(forra, svala, runda) {
  const tak = Math.min(VIND_MAX, 1.6 + svala * 1.1 + runda * 0.9)
  let mag = 0.8 + Math.random() * (tak - 0.8)
  if (svala === 0 && runda === 0) mag = 0.6 + Math.random() * 1.2
  let tecken = Math.random() < 0.5 ? -1 : 1
  if (forra != null && Math.abs(forra) > 1.5 && Math.random() < 0.7) tecken = forra > 0 ? -1 : 1
  return tecken * mag
}

// --- Ballongfärger ---------------------------------------------------------------------------
export const BALLONG_FARGER = [0xff6b6b, 0xffd35c, 0xa78bfa, 0x57c8c3, 0xff9ec4, 0xff8a3d, 0x6fd16f]
export const VATTEN = 0x39b7f0
export const VATTEN_LJUS = 0xc9efff
export const VATTEN_FARGER = [0x39b7f0, 0x7fd6ff, 0xc9efff, 0xffffff]

// --- Ljud: stämd skala (C-dur pentatonisk) --------------------------------------------------
export const SKALA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

// --- Ballistik -------------------------------------------------------------------------------
// Samma integrator som matter (uppmätt mot PhysicsWorld och Skuggvarld: 0,0 px fel):
//   v = v·(1 − fa) + a ;  p += v
export function flyg(x, y, vx, vy, { aw = 0, steg = 400, stopp = null } = {}) {
  let px = x
  let py = y
  for (let i = 0; i < steg; i++) {
    vx = vx * (1 - BALL_FA) + aw
    vy = vy * (1 - BALL_FA) + G_STEG * GRAV_Y
    px += vx
    py += vy
    if (py >= MARK_Y - BALL_R) return { x: px, y: MARK_Y - BALL_R, t: i, mark: true }
    if (stopp && stopp(px, py, i)) return { x: px, y: py, t: i, mark: false }
  }
  return { x: px, y: py, t: steg, mark: false }
}

// Tap-tap-reserven: en LAGOM lobb mot ett djur. Fast höjdvinkel, farten lösas fram så att banan
// passerar djurets bröst. Vinden räknas MEDVETET inte in — barnet har tryckt på djuret, men
// luften får fortfarande vara med och bestämma var stänket landar.
export function lobbMot(fran, mal, maxFart = MAX_KRAFT) {
  const dx = mal.x - fran.x
  const vinkel = dx > 600 ? 0.72 : 0.9 // rad uppåt — flackare mot långt håll
  let lo = 3
  let hi = maxFart
  const c = Math.cos(vinkel)
  const s = Math.sin(vinkel)
  for (let i = 0; i < 32; i++) {
    const v = (lo + hi) / 2
    // höjden banan har när den passerar målets x
    let vx = v * c
    let vy = -v * s
    let px = fran.x
    let py = fran.y
    let hojd = null
    for (let k = 0; k < 400; k++) {
      vx = vx * (1 - BALL_FA)
      vy = vy * (1 - BALL_FA) + G_STEG * GRAV_Y
      const nx = px + vx
      if (nx >= mal.x) {
        const t = (mal.x - px) / (nx - px || 1)
        hojd = py + vy * t
        break
      }
      px = nx
      py += vy
      if (py > MARK_Y + 200) break
    }
    // För hög träff = för mycket fart; för låg (eller nådde aldrig fram) = för lite.
    if (hojd == null || hojd > mal.y) lo = v
    else hi = v
  }
  const v = Math.min(maxFart, (lo + hi) / 2)
  return { vx: v * c, vy: -v * s, power: v }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t

export const FARG = COLORS
