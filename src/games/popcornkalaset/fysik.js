// Rummets statiska kroppar — delade mellan spelet och `_grytprobe.mjs`, så att sonden mäter
// precis den skål och den spis barnet häller i. Rena tal + matter, ingen Pixi.
import Matter from 'matter-js'
import { BANK, SKAL, GRYTA } from './matt.js'

const { Body } = Matter

// PÅSENS HYLLA (`karl.hylla`, se karl.js `_folj`): bygelns lägsta höjd när påsens mitt står vid
// x, och målet om den får hälla där. Fingret kan dra påsen ned till hyllan, aldrig igenom —
// förut gick den rakt genom grytan (`_popcornnaiv` P4: 7 korn på golvet). Grytan hade en hylla
// över skålarna i v1.264 — borttagen 2026-09-26 (ägaren: "de osynliga barriärerna gör att
// grytan flyger iväg"); den häller nu i sina sidohandtag (`_popcornhandtag`).

// Påsen: över grytan hänger den strax ovanför mynningen (där den parkeras); annars vilar den
// på bänken, eller strax ovanför skålkanterna ute i rummet. Den häller alltid åt HÖGER: den
// hänger 30 px till vänster om grytans mitt, och en vänsterhäll därifrån pekade mot grytans
// kant (16 % spill i `_popcornhall`).
export function paseHylla(pase, gryta, x) {
  const gm = gryta.varld(0, 0)
  const mx = gm.x - 30
  if (Math.abs(x - mx) < GRYTA.bredd / 2 + 60) return { y: pase.parkHojd(gm.y - 48), mal: { x: mx, gryta: true, sidor: [1] } }
  return { y: pase.parkHojd(x < BANK.x1 ? BANK.yta : SKAL[0].kant - 10) }
}

// Skålen: botten + två lutande väggar. ⚠️ Botten går IN UNDER väggarnas fötter — med
// kant-mot-kant-mått fanns en glipa i vart nedre hörn, och popcorn rann rakt igenom skålen
// (`_grytprobe --bild`: skålen tömdes på golvet medan hällningen i sig var rätt).
export function byggSkal(phys, s, label = 'skal') {
  const delar = []
  delar.push(phys.rectangle(s.x, s.botten + 6, s.bottenB + 28, 12, { isStatic: true, label }))
  for (const sida of [-1, 1]) {
    const x0 = s.x + (sida * s.bottenB) / 2
    const x1 = s.x + (sida * s.kantB) / 2
    const len = Math.hypot(x1 - x0, s.kant - s.botten) + 18
    const b = phys.rectangle((x0 + x1) / 2 + sida * 3, (s.botten + s.kant) / 2 + 4, 12, len, { isStatic: true, label })
    Body.setAngle(b, -Math.atan2(x1 - x0, s.botten - s.kant))
    delar.push(b)
  }
  return delar
}

// Ligger en punkt i skålen (eller i högen ovanpå den)?
export function iSkal(s, x, y, hog = 90) {
  return Math.abs(x - s.x) < s.kantB / 2 + 6 && y < s.botten + 2 && y > s.kant - hog
}
