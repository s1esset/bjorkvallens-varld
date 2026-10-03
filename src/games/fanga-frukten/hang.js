// FRUKTEN I SKAFTET (FYSIKPLAN F1, dag D16 B4) — geometri och tal, ren (ingen Pixi), så att en Node-sond kan
// bygga EXAKT samma pendel som spelet.
//
// Frukten är en vanlig matter-kropp som hänger i `phys.pendel` (skaft av längd HANG_L, fäst i kroppens topp)
// från en kvist under lövverket. Den startar utslagen åt ena sidan och gungar av tyngdkraften; efter
// HANG_MIN…HANG_MIN+HANG_SPANN sekunder släpper skaftet (`led.ta()`) och frukten faller som förut.
//   • Luftmotståndet är lågt under hänget (HANG_LUFT): fallets 0,03 dämpar en pendel av den här längden på ~0,5 s
//     (uppmätt i `_dag-fanga-frukten.mjs`, kontrollarmen) — då hänger frukten stilla och gungar aldrig.
//   • Fallet börjar vid kvisten (y ≈ 200) i stället för över skärmkanten (y −40): ~240 px kortare fall. Hänget
//     tar tillbaka den tiden, så tiden från ny frukt till korgen är ungefär densamma (sonden skriver ut båda).
export const HANG_Y = 168 // kvistens höjd (under lövverkets nederkant)
export const HANG_L = 24 // skaftets längd (px)
export const HANG_VINKEL = 0.55 // startutslag från lodrätt (rad); +0–0,18 slump
export const HANG_MIN = 1.0 // s minsta hängtid
export const HANG_SPANN = 0.4 // s slump ovanpå
export const HANG_LUFT = 0.006 // luftmotstånd medan frukten hänger
export const HANG_STYVHET = 0.92 // skaftet är lite fjädrande (1 = stel stång)
export const HANG_ZON = [940, 1072] // ekorrens/figurens/önskebubblans x — inga skaft här
export const HANG_TATT = 96 // två skaft närmare än så här flyttas isär
export const HANG_X = [90, 1190] // hur långt ut ett skaft får sitta

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Fästets x: ur zonen vid ekorren till närmaste kant, och minst HANG_TATT från redan hängande frukter.
export function hangX(x, andraAx = []) {
  if (x > HANG_ZON[0] && x < HANG_ZON[1]) x = x < (HANG_ZON[0] + HANG_ZON[1]) / 2 ? HANG_ZON[0] : HANG_ZON[1]
  for (let f = 0; f < 5; f++) {
    const nara = andraAx.find((a) => Math.abs(a - x) < HANG_TATT)
    if (nara == null) break
    x = clamp(x + (x >= nara ? 110 : -110), HANG_X[0], HANG_X[1])
    if (x > HANG_ZON[0] && x < HANG_ZON[1]) x = x < (HANG_ZON[0] + HANG_ZON[1]) / 2 ? HANG_ZON[0] : HANG_ZON[1]
  }
  return x
}

// Startläget: fästet (ax, ay), skaftets utslag `th` (rad, + = åt höger), fruktens mitt (cx, cy) och kroppens vinkel
// (−th: kroppens topp pekar mot kvisten). `ank` = fästets avstånd ovanför fruktens mitt (lokalt).
// `ankare` = samma punkt som matters `pointB`: matter räknar den i VÄRLDSAXLAR vid skapandet (kroppens vinkel då =
// `angle`) och vrider den sedan med kroppen — ett `{0, −ank}` på en redan vriden kropp ger ett startfel på
// 2·ank·sin(θ/2) ≈ 15 px (uppmätt) som pendeln sedan svänger ut.
export function hangStart({ x, r, sida = 1, slump = 0, andraAx = [] }) {
  const ank = r * 1.15
  const th = sida * (HANG_VINKEL + slump * 0.18)
  const ax = hangX(x, andraAx)
  const ay = HANG_Y
  const px = ax + HANG_L * Math.sin(th)
  const py = ay + HANG_L * Math.cos(th)
  const angle = -th
  return { ax, ay, th, ank, cx: px + ank * Math.sin(th), cy: py + ank * Math.cos(th), angle, ankare: { x: ank * Math.sin(angle), y: -ank * Math.cos(angle) } }
}
