// Rummets statiska kroppar — delade mellan spelet och `_grytprobe.mjs`, så att sonden mäter
// precis den skål och den spis barnet häller i. Rena tal + matter, ingen Pixi.
import Matter from 'matter-js'
import { BANK, SKAL, SKAL_LUFT, GRYTA } from './matt.js'

const { Body } = Matter

// HYLLORNA (`karl.hylla`, se karl.js `_folj`): bygelns lägsta höjd när kärlets mitt står vid x,
// och målet om kärlet får hälla där. Fingret kan dra kärlet ned till hyllan, aldrig igenom —
// förut gick grytan att pressa ned i skålen (`_popcornnaiv` G3: 29 av 30 popcorn krossades ut)
// och påsen rakt genom grytan (P4: 7 korn på golvet).
//
// `sidor`: vilka sidor som får sänkas över skålen; den första gäller när barnet tar mitt på
// (eller i en sida som inte är tillåten där). Mätt i `_popcornhall`: över skål 2 svänger
// grytans kropp in i högerväggen om VÄNSTER sida sänks, och över skål 0 landar det som går förbi
// en vänsterhäll på bänken (31 % spill) — medan det som går förbi en högerhäll hamnar i nästa
// skål och fyller den. Bara skål 1 har utrymme åt båda hållen.
export const SKAL_SIDOR = [[1], [1, -1], [1]]

// Grytan: över en skål hänger den i hällhöjd; över bänken vilar den på bänkskivan; mellan
// bänken och bordet går den aldrig lägre än hällhöjden (skålkanten står nedanför).
export function grytHylla(gryta, x) {
  const s = SKAL.findIndex((sk) => Math.abs(x - sk.x) < sk.kantB / 2 + 50)
  if (s >= 0) return { y: gryta.parkHojd(SKAL[s].kant - SKAL_LUFT), mal: { x: SKAL[s].x, s, sidor: SKAL_SIDOR[s] } }
  if (x < BANK.x1) return { y: gryta.parkHojd(BANK.yta) }
  return { y: gryta.parkHojd(SKAL[0].kant - SKAL_LUFT) }
}

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
