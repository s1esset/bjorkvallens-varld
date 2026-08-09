// LUFTMOTSTÅND — luften som en KRAFT, inte som en handsatt fallfart
//
// VARFÖR DEN FINNS. `fallskarmen` sjönk med `chute.y += sink * dt` där `sink` var
// 1,5 eller 2,4 beroende på tyngdknappen. Uppmätt före ändringen (`_fallprobe.mjs`):
// **95 % av fallfarten nåddes efter 0,07 s** — alltså full fart från första bildrutan,
// ingen acceleration, ingen gränsfart. Vinden var ett andra, frikopplat tal
// (`WIND_FACTOR_HEAVY = 0.45`) och styrningen ett tredje som inte brydde sig om tyngden
// alls (mätt: Lätt 248 px, Tung 245 px på en sekund — knappen gjorde ingenting åt
// styrförmågan). Tre tal som låtsades vara ett system.
//
// Här är de ETT: en kropp som rör sig genom luft känner ett motstånd mot sin fart
// RELATIVT luften. Ur den enda lagen faller allt det andra ut av sig självt:
//
//     a = g − (k·A/m) · |v − v_luft| · (v − v_luft)
//
//   · gränsfarten  = √(m·g / (k·A))   → tyngre last faller fortare, större kupol saktar
//   · vinden       är en LUFTHASTIGHET, inte en kraft: allt driver till slut med luften,
//                    men en tung last hinner inte dit under fallet → "tung biter mindre
//                    mot vinden" är inte längre en siffra någon satt, det är en följd
//   · styrningen   möter samma motstånd → den har en egen gränsfart, och en tung last
//                    är trögare att få i sidled
//
//   const luft = new Motstandsvolym({ grav: 0.086 })
//   const r = luft.lagg(chute, { massa: 1, area: 1 })
//   luft.setVind(2.5, 0)          // px/bildruta — luftens egen fart
//   luft.driv(r, styr, 0)         // barnets input, px/bildruta² (nollas varje steg)
//   luft.steg(dt)                 // integrerar och skriver x/y på objektet
//
// ⚠️ KALIBRERA VIA KÄNSLAN, INTE VIA KOEFFICIENTEN. `k` är ett tal utan mening för den
// som designar ett spel; gränsfarten är själva känslan. `motstandFor()` vänder på
// ekvationen så spelet får säga "så här fort ska det falla" och biblioteket räknar ut
// resten — samma grepp som `speedToAccel()` i `physics.js`.
//
// ENHETER: px och px/bildruta (60 fps), precis som spelen med egen integrator. Inget
// matter, ingen Pixi, inga tweens, inga timers — volymen kan inte överleva ett spelbyte,
// och `steg()` efter `destroy()` gör ingenting.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export class Motstandsvolym {
  // grav     tyngdacceleration i px/bildruta². Den sätter hur LÄNGE accelerationen
  //          syns: tiden till 95 % av gränsfarten är ~1,83 · gränsfart / grav.
  // tathet   luftens täthet (k). Sätts normalt inte för hand — låt `lagg` räkna ut den
  //          ur önskad gränsfart i stället.
  // maxFart  hård fartspärr (px/bildruta) så inget kan skjuta ur banan ens vid lagg-hopp.
  constructor({ grav = 0.09, tathet = 0.04, maxFart = 26 } = {}) {
    this.grav = grav
    this.tathet = tathet
    this.maxFart = maxFart
    this.vind = { x: 0, y: 0 }
    this._kroppar = []
    this._dod = false
  }

  // Koefficienten k·A som ger EXAKT den här gränsfarten för den här massan.
  //   gransfart² = m·g / (k·A)   ⇒   k·A = m·g / gransfart²
  static motstandFor({ massa = 1, grav = 0.09, gransfart = 1.4 }) {
    return (massa * grav) / (gransfart * gransfart)
  }

  // obj      vad som helst med skrivbara `x`/`y` (en Pixi-Container går bra — biblioteket
  //          rör aldrig något annat på den).
  // massa    lastens massa. Bara förhållandet mellan kroppar betyder något.
  // area     kupolens/kroppens area. Dubbel area = halva gränsfarten i kvadrat.
  // gransfart  ANGE DEN HÄR i stället för `area` när spelet vet vilken fallkänsla det
  //          vill ha: `area` räknas då ut ur massan och gravitationen.
  lagg(obj, { massa = 1, area = null, gransfart = null, vx = 0, vy = 0 } = {}) {
    // Motståndet lagras som k·A/m — det enda talet integreringen behöver, och det som
    // gör en tung last snabb och en stor kupol långsam utan att spelet räknar något.
    let kA
    if (gransfart !== null) kA = Motstandsvolym.motstandFor({ massa, grav: this.grav, gransfart })
    else kA = this.tathet * (area === null ? 1 : area)
    const rec = { obj, massa, area: area === null ? kA / this.tathet : area, kA, vx, vy, ax: 0, ay: 0, kraft: { x: 0, y: 0 } }
    this._kroppar.push(rec)
    return rec
  }

  ta(rec) {
    const i = this._kroppar.indexOf(rec)
    if (i >= 0) this._kroppar.splice(i, 1)
  }

  rensa() {
    this._kroppar.length = 0
  }

  // Luftens egen fart (px/bildruta). En by är alltså inte en kraft utan att LUFTEN rör
  // sig — det är därför en lätt last följer med den och en tung släpar efter.
  setVind(x, y = 0) {
    this.vind.x = x
    this.vind.y = y
  }

  // ⚠️ ACCELERATION OCH KRAFT ÄR INTE SAMMA SAK HÄR, och skillnaden är hela tyngd-
  // knappen. En acceleration känns LIKADANT oavsett massa; en kraft delas med massan
  // och gör en tung last trögare. Uppmätt i `_motstandprobe.mjs`: med styrningen som
  // acceleration drev den tunga lasten **längre** i sidled än den lätta (65 mot 45 px
  // på en sekund — den delar accelerationen men har högre gränsfart), alltså precis
  // tvärtemot vad spelet vill visa. Som kraft blir det 45 mot 27 px.
  //
  // Tumregel: **spelets hjälp är en acceleration, barnets muskler är en kraft.**
  // Den snälla no-fail-assisten ska dra lika hårt oavsett last (annars blir Tung-läget
  // svårare att få hjälp i), medan ett barn som drar i en styrlina känner tyngden.
  //
  // Båda nollas efter varje `steg()` så en glömd `driv` inte blir en evig kraft — samma
  // fälla som `Body.setPosition(..., true)` i physics.js, fast åt andra hållet.
  driv(rec, ax, ay = 0) {
    rec.ax += ax
    rec.ay += ay
  }

  // En KRAFT (px/bildruta² · massa) — accelerationen blir F/m.
  kraft(rec, fx, fy = 0) {
    rec.ax += fx / rec.massa
    rec.ay += fy / rec.massa
  }

  // Gränsfarten just nu: √(m·g / (k·A)). Spelet kan visa den, kalibrera mot den, eller
  // (som fallskärmen) läsa den för att veta hur nära gränsen kupolen ligger.
  gransfart(rec) {
    return Math.sqrt((rec.massa * this.grav) / rec.kA)
  }

  // Motståndskraften från förra steget (px/bildruta² · massa). Det HÄR är kroken för
  // att göra kraften synlig: fallskärmens kupol buktar av kraften den bär, i stället
  // för att spelet gissar en bukt ur farten.
  luftkraft(rec) {
    return rec.kraft
  }

  steg(dt = 1) {
    if (this._dod) return
    const d = clamp(dt, 0, 3)
    for (const r of this._kroppar) {
      // Fart relativt LUFTEN — hela poängen. Står kroppen still i en by känner den
      // ändå ett motstånd, och driver den med luften känner den inget alls.
      const rx = r.vx - this.vind.x
      const ry = r.vy - this.vind.y
      const fart = Math.hypot(rx, ry)
      // Kvadratiskt motstånd: a = (k·A/m) · |v| · v, riktat MOT relativfarten.
      const c = (r.kA / r.massa) * fart
      const dragX = -c * rx
      const dragY = -c * ry
      r.kraft.x = dragX * r.massa
      r.kraft.y = dragY * r.massa

      r.vx += (dragX + r.ax) * d
      r.vy += (dragY + this.grav + r.ay) * d
      r.ax = 0
      r.ay = 0

      // Fartspärr: ett lagg-hopp får aldrig bli ett skutt genom halva banan.
      const v = Math.hypot(r.vx, r.vy)
      if (v > this.maxFart) {
        const s = this.maxFart / v
        r.vx *= s
        r.vy *= s
      }

      if (r.obj && !r.obj.destroyed) {
        r.obj.x += r.vx * d
        r.obj.y += r.vy * d
      }
    }
  }

  destroy() {
    this._dod = true
    this._kroppar.length = 0
  }
}
