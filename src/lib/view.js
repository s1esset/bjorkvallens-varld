// Synlig designyta ("full bleed"). Skalningen är contain (Math.min-letterbox), så en
// skärm som är bredare än 16:9 visar designkoordinater UTANFÖR 0..1280 — och en 4:3-
// platta visar utanför 0..720. Scaler räknar ut exakt vilken rektangel som syns och
// publicerar den här; bakgrunder ritas med bleed så rektangeln aldrig visar creme,
// och spel läser `ctx.view` för spawn/wrap/cull-marginaler.
//
// Kontrakt: VIEW är ETT levande objekt som muteras på plats vid resize. Läs det vid
// ANVÄNDNING (`ctx.view.right` i tick/spawn-ögonblicket) — cachea aldrig fälten över
// tid och mutera dem aldrig. Vid exakt 16:9 är VIEW identiskt med designrektangeln,
// så headless-testen (1280×720) beter sig bit-identiskt.
import { DESIGN_W, DESIGN_H } from './theme.js'

// Taken avgränsar hur långt utanför designytan vi någonsin ritar/räknar. 21:9-telefon
// behöver ±200 i x (Pixel 10 Pro ±163), 4:3-platta ±120 i y. Bortom taken (vikbara
// ~23:9, delad skärm) blir en smal creme-list kvar med flit — bgLayer målar den, den
// läser som en avsiktlig ram, och taken håller all deterministisk geometri ändlig.
export const BLEED_X = 240
export const BLEED_Y = 160

export const VIEW = {
  left: 0,
  top: 0,
  right: DESIGN_W,
  bottom: DESIGN_H,
  width: DESIGN_W,
  height: DESIGN_H,
}

const subs = new Set()

// Anropas av Scaler vid varje layout. Muterar VIEW på plats (samma objektidentitet
// överallt) och väcker prenumeranterna bara när något faktiskt ändrats.
export function setView(left, top, right, bottom) {
  if (left === VIEW.left && top === VIEW.top && right === VIEW.right && bottom === VIEW.bottom) return
  VIEW.left = left
  VIEW.top = top
  VIEW.right = right
  VIEW.bottom = bottom
  VIEW.width = right - left
  VIEW.height = bottom - top
  for (const cb of subs) cb(VIEW)
}

// Prenumerera på ändringar (i praktiken orientationchange mitt i ett spel).
// Returnerar avregistreraren — koppla den till t.ex. containerns 'destroyed'.
export function onViewChange(cb) {
  subs.add(cb)
  return () => subs.delete(cb)
}
