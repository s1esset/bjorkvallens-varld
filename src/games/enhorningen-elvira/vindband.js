// Elviras VINDBAND — ren matematik (ingen Pixi), så att en Node-sond kan mäta exakt det spelet kör.
// Vind-knappen (Lugnt · Medvind · Motvind) var en global `setWind`: samma knuff överallt, för alla vikter,
// utan synlig luft. Nu är den ett `Vindfalt` (lib/vind.js): en bred luftström som blåser in från ena sidan
// och är starkast i höjd med mitten — Elvira känner den medan hon flyger genom den, och en LÄTT Elvira
// (stort `frictionAir`) följer med mer än en TUNG (litet) — det barnet kan se i banan. Bilden bor i vindbild.js.
import { Vindfalt } from '../../lib/vind.js'

export const START = { x: 185, y: 165 }
export const BAND_X0 = 90 // källan när vinden blåser åt höger (Medvind)
export const BAND_X1 = 1190 // källan när den blåser åt vänster (Motvind)
export const BAND_LANGD = BAND_X1 - BAND_X0
export const BAND_HALV = 215 // luften täcker ~430 px höjd — starkast i mitten, tunn mot kanterna
export const BAND_AVTAG = { langs: 0.3, tvars: 0.6 }

// Luftens fart i bandets mitt (px/steg). Elviras `frictionAir` (0,02 lätt · 0,012 tung) gör kraften:
// 0,17–0,28 px/steg² lätt, 0,10–0,17 tung i mitten — dagens globala vind var 0,139 åt båda.
export const luftForNiva = (level) => 10.5 + Math.min(Math.max(level - 3, 0), 5) * 0.7

export function nyttVindband(phys, { luft = 10.5, y = 330, halv = BAND_HALV } = {}) {
  return new Vindfalt({
    varld: phys,
    form: { typ: 'band', x: BAND_X0, y, rackvidd: BAND_LANGD, halvhojd: halv },
    luft: { x: luft, y: 0 },
    avtag: { ...BAND_AVTAG },
    filter: (b) => b.label === 'elvira',
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
// `fa` = Elviras frictionAir (vikten), `damp` = 1 − fa. Returnerar punkter OCH vindens acceleration per steg.
export function forutsagBana({ vind, vx, vy, x = START.x, y = START.y, gy, damp, fa, steps = 54, every = 1, bounds }) {
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

// Launchern bär bara ETT vind-tal (`setPreview({ wind })`): välj det så att prickbanans SLUTPUNKT efter
// `steg` steg hamnar där den verkliga banan gör — en tidig acceleration flyttar slutet mer än en sen
// (Δx = Σ aᵢ·(T − i)), så medelvärdet viktas därefter. (G3b — banan genom fält — skulle ge en exakt kurva.)
export function forhandsAcc({ vind, vx, vy, gy, damp, fa, bounds, steps = 64 }) {
  if (!vind?.aktiv) return 0
  const { acc } = forutsagBana({ vind, vx, vy, gy, damp, fa, steps, bounds })
  const T = steps
  let s = 0
  for (let i = 0; i < acc.length; i++) s += acc[i] * (T - i - 0.5)
  return (2 * s) / (T * T)
}
