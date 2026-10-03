// KRAFTZONER — kullar och gropar på planen (FYSIKPLAN F4, kluster B1).
//
// Planen var en platt gräsmatta med klossar och studsdynor. En KULLE och en GROP är terräng: ingen vägg
// som stoppar bollen, utan en lutning som böjer av och bromsar den. Toppvy — gravitationen är 0, så
// lutningen är en KRAFT mot bollens mittpunkt, rakt ut från kullens mitt (kullen putsar bort bollen) eller
// rakt in mot gropens mitt (gropen drar in den). Profilen är en cosinus-kulle (höjden `h(d) = (1 + cos(π·d/r))/2`),
// så lutningen är noll i mitten och vid kanten och störst på halva sluttningen — mjuk, ingen kant att fastna på:
//
//     a(d) = A · sin(π·d/r)        px/steg², riktning ±radiellt        (matters kraft = massa · a / STEG2)
//
// Det går alltid att komma ur: potentialdjupet är V = 2·A·r/π, och en boll behöver fart `√(2V)` för att
// ta sig upp ur en grop (eller över en kulle) — UTAN friktion. Ytan bromsar också (frictionAir per steg), så
// gropens A är satt efter sanden (0,044): med A = 0,07 kommer minsta skottet (`minPower` 8) ur en grop på
// sand (A = 0,1 höll kvar det — mätt i ett 1D-prov med ytans broms, D14); den tunga bollen på sand behöver
// fart 10 (dess ledtråd säger "en extra knuff"). Sakta ner/böja av — aldrig stoppa.
//
// FÖRHANDSBANAN (G3a, `lib/launcher.js` Skuggvarld) kan inte veta något om en kraft den inte stegar. Därför är
// varje zon också en STATISK SENSOR med `forhandsStopp = true`: pricklinjen följer bollen precis fram till zonens
// kant och SLUTAR där (hellre en kort ärlig bana än en som ljuger). Sensorns radie är zonens radie minus bollens,
// så provkulan nuddar den exakt när bollens MITT kommer in i zonen — där kraften börjar. Ligger bollen redan
// i en zon (den kan stanna i en grop) tas flaggan bort så länge, annars blev pricklinjen en enda prick.
//
// Rena tal (ingen Pixi) — `scripts`-sonder och Node-prov kan köra EXAKT spelets kod.
export const BOLL_R = 56
export const ZON_R = 130 // zonens radie (px) — ritad och kraftens räckvidd
export const ZONTYP = {
  kulle: { tecken: 1, A: 0.12 }, // utåt
  grop: { tecken: -1, A: 0.07 }, // inåt (satt efter sanden — se ovan)
}

// Lutningsaccelerationen (px/steg²) på en kropp i (x, y). `{ ax: 0, ay: 0 }` utanför zonen eller på exakt mitten.
export function zonAcc(z, x, y, ut = { ax: 0, ay: 0 }) {
  const dx = x - z.x
  const dy = y - z.y
  const d = Math.hypot(dx, dy)
  if (d >= z.r || d < 1e-6) {
    ut.ax = 0
    ut.ay = 0
    return ut
  }
  const t = ZONTYP[z.typ] || ZONTYP.kulle
  const a = t.tecken * t.A * Math.sin((Math.PI * d) / z.r)
  ut.ax = (a * dx) / d
  ut.ay = (a * dy) / d
  return ut
}

// Ligger (x, y) inne i zonen (mittpunkten, där kraften verkar)?
export function iZon(z, x, y) {
  return Math.hypot(x - z.x, y - z.y) < z.r
}

// Sensorns radie i förhandsvärlden: provkulan (radie BOLL_R) nuddar den när dess mitt är på avstånd z.r.
export function sensorRadie(z) {
  return Math.max(24, z.r - BOLL_R)
}

// Vilka zoner banan har. Inga de två första banorna (där lär man sig sikt + kraft), sedan växer det:
// en kulle (2–3), en kulle + grop (4–5), 1–2 slumpade (6+). Allt hålls fritt från start, mål och hinder
// (no-fail: målet ska alltid gå att nå, och glid-hjälpen går över allt).
//   plan = { l, r, t, b } · hinder = [{ type, x, y, r | w, h }] · slump = () => 0..1
export function zonerForLevel(level, { home, start, hinder = [], plan }, slump = Math.random) {
  if (level < 2) return []
  const r = ZON_R
  const out = []
  const klamY = (y) => Math.max(plan.t + r + 10, Math.min(plan.b - r - 10, y))
  const fri = (z) => {
    if (Math.hypot(z.x - home.x, z.y - home.y) < home.r + z.r + 40) return false
    if (Math.hypot(z.x - start.x, z.y - start.y) < z.r + BOLL_R + 50) return false
    for (const o of hinder) {
      const half = o.type === 'block' ? Math.max(o.w, o.h) / 2 : o.r
      if (Math.hypot(z.x - o.x, z.y - o.y) < half + z.r + 10) return false
    }
    for (const q of out) if (Math.hypot(z.x - q.x, z.y - q.y) < z.r + q.r + 20) return false
    return z.x > plan.l + 60 && z.x < plan.r - 60
  }
  const lagg = (z) => {
    z.y = klamY(z.y)
    if (fri(z)) out.push(z)
  }
  if (level <= 3) {
    lagg({ typ: 'kulle', x: 660, y: level % 2 ? 540 : 260, r })
  } else if (level <= 5) {
    lagg({ typ: 'kulle', x: 640, y: level % 2 ? 540 : 260, r })
    lagg({ typ: 'grop', x: 850, y: level % 2 ? 290 : 520, r })
  } else {
    const n = level >= 9 ? 2 : 1
    let forra = null
    for (let k = 0; k < n; k++) {
      for (let f = 0; f < 14; f++) {
        const typ = forra ? (forra === 'kulle' ? 'grop' : 'kulle') : slump() < 0.5 ? 'kulle' : 'grop'
        const z = { typ, x: 420 + slump() * 520, y: plan.t + r + 10 + slump() * (plan.b - plan.t - 2 * r - 20), r }
        const antal = out.length
        lagg(z)
        if (out.length > antal) {
          forra = typ
          break
        }
      }
    }
  }
  return out
}
