// Spindelhjältens VINDBAND — ren matematik (ingen Pixi), så att en Node-sond kan mäta exakt det
// spelet kör. Vinden är inte längre en global kraft utan ett BAND av luft på himlen (lib/vind.js,
// Vindfalt): hjälten knuffas bara medan han flyger genom det, och bandet SYNS (löv + streck i
// index.js). Barnets val är oförändrat — Vind-knappen växlar av → höger → vänster.
import { Vindfalt } from '../../lib/vind.js'

export const SLING = { x: 240, y: 540 }
export const HERO_FA = 0.004 // frictionAir på hjälten (MATERIALS.bouncy) — vinden är luftens FART, fa·w blir kraften
export const BAND_X0 = 330 // bandets vänstra kant (källan när vinden blåser åt höger)
export const BAND_X1 = 1230 // högra kanten (källan när den blåser åt vänster)
export const BAND_LANGD = BAND_X1 - BAND_X0
export const BAND_AVTAG = { langs: 0.25, tvars: 0.5 }
export const BAND_HALV = 118

// Luftens fart i bandets mitt (px/steg) per nivå. Kraften på hjälten är fa·w = 0,12 … 0,21 px/steg²
// mitt i bandet (gravitationen är 0,28) — märkbart, aldrig förstörande. Mätt i scripts/_spindelvindprobe.mjs.
export const luftForNiva = (level) => 30 + Math.min(Math.max(level, 0), 4) * 5.5

export function nyttVindband(phys, { luft = 30, y = 300, halv = BAND_HALV } = {}) {
  return new Vindfalt({
    varld: phys,
    form: { typ: 'band', x: BAND_X0, y, rackvidd: BAND_LANGD, halvhojd: halv },
    luft: { x: luft, y: 0 },
    avtag: { ...BAND_AVTAG },
    filter: (b) => b.label === 'hero',
    aktiv: false,
  })
}

// Ställ bandet: riktning (−1/0/1), höjd och styrka. Källan sitter på den sida vinden kommer ifrån.
export function stallBand(vind, { dir = 0, y, halv, luft } = {}) {
  if (!vind) return
  if (luft != null) vind.luft.x = Math.abs(luft) * (dir || 1)
  else vind.luft.x = Math.abs(vind.luft.x) * (dir || 1)
  if (halv != null) vind.form.halvhojd = halv
  vind.flytta(dir < 0 ? BAND_X1 : BAND_X0, y ?? vind.form.y)
  vind.aktiv = dir !== 0
}

// Förutsäg en bana som launcherns `predict`, men med vinden ur FÄLTET i varje punkt (inte ett tal).
// Euler, samma damp/studs som spelets prickbana; returnerar punkter OCH vindens acceleration per steg.
export function forutsagBana({ vind, vx, vy, x = SLING.x, y = SLING.y, gy, damp, steps = 64, every = 1, bounds, fa = HERO_FA }) {
  const pts = []
  const acc = []
  let px = x
  let py = y
  let pvx = vx
  let pvy = vy
  const { floorY = null, leftX = null, rightX = null, restitution = 0.55 } = bounds || {}
  for (let i = 0; i < steps; i++) {
    const w = vind?.luftVid(px, py)
    const ax = w ? fa * w.vx : 0
    const ay = w ? fa * w.vy : 0
    pvy += gy + ay
    pvx += ax
    pvx *= damp
    pvy *= damp
    px += pvx
    py += pvy
    if (floorY != null && py > floorY) {
      py = floorY
      pvy = -Math.abs(pvy) * restitution
    }
    if (leftX != null && px < leftX) {
      px = leftX
      pvx = Math.abs(pvx) * restitution
    }
    if (rightX != null && px > rightX) {
      px = rightX
      pvx = -Math.abs(pvx) * restitution
    }
    acc.push(ax)
    if (i % every === 0) pts.push({ x: px, y: py })
    if (py > 900) break
  }
  return { pts, acc }
}

// Launchern kan bara bära ETT vind-tal (`setPreview({ wind })`). Här väljs det talet så att pricklinjens
// SLUTPUNKT efter `steg` steg hamnar där den verkliga banan gör: en acceleration som verkar tidigt
// flyttar slutet mer än en sen (Δx = Σ aᵢ·(T − i)), så medelvärdet viktas därefter. Utan vind eller
// utanför bandet: 0. (G3b — banan genom fält — skulle ge en exakt kurva; det här är en approximation.)
export function forhandsAcc({ vind, vx, vy, gy, damp, bounds, steps = 64 }) {
  if (!vind?.aktiv) return 0
  const { acc } = forutsagBana({ vind, vx, vy, gy, damp, steps, bounds })
  const T = steps
  let s = 0
  for (let i = 0; i < acc.length; i++) s += acc[i] * (T - i - 0.5)
  return (2 * s) / (T * T)
}
