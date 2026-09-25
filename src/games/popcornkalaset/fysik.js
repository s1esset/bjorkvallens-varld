// Rummets statiska kroppar — delade mellan spelet och `_grytprobe.mjs`, så att sonden mäter
// precis den skål och den spis barnet häller i. Rena tal + matter, ingen Pixi.
import Matter from 'matter-js'

const { Body } = Matter

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
