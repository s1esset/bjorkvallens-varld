// pekspar.js — fingrets SPÅR och släppfarten ur det (FYSIKPLAN G2).
//
// Flyttad ur `DragController._slappFart` (v1.201) så att fler än en kontroll kan kasta:
// `DragController` (mata-munnen), `Grepp` (lib/grepp.js) och G3-varianterna delar nu EN mätning
// i stället för att skriva om den (tarta-i-ansiktet och blixt-och-dunder hade egna kopior).
//
//   const spar = new Pekspar()
//   spar.lagg(performance.now(), x, y)   // vid varje pekrörelse — FINGRETS läge, inte bildens
//   const k = spar.fart()                // { vx, vy, fart, x, y } i px/ms, eller null
//   spar.rensa()
//
// px/ms × `PX_MS_TILL_STEG` (16,67) = px/steg i matters takt. `kastSteg(k, max)` gör det och
// klämmer farten till `max` px/steg i samma andetag.
//
// ⚠️ TRE TYSTA FÄLLOR (uppmätta, och därför fasta här):
//  1. **Fönstret.** Mäts farten över hela draget blir ett långsamt drag med en snärt på slutet
//     ett medelvärde nära noll; mäts den över de två sista proven mäter man bruset i ett enda
//     pekvärde. ~90 ms bakåt är det spann som bär en snärt.
//  2. **Åldern.** Prov läggs bara vid `pointermove`. Stannar fingret och HÅLLER stilla en halv
//     sekund innan det lyfts kommer inga nya prov — det sista provet bär då fortfarande full
//     fart, och ett stillastående släpp hade lästs som ett kast. Därför förfaller spåret efter
//     `KAST_ALDER`.
//  3. **Sökningen stannar på första provet UTANFÖR fönstret**, och det kan ligga hur
//     långt bort som helst: draget pausar, handen står still, nästa prov bakåt är 220 ms
//     gammalt. Farten räknas då över 270 ms i stället för 50 och späds ut mot noll — uppmätt
//     0,29 px/ms för en snärt som var ~1,9. Ligger provet mer än två fönster bort duger det
//     yngre i stället.
//
// Ren logik, inga beroenden: prövas i Node (`scripts/_greppprobe.mjs`, `_kastprobe.mjs`).

export const KAST_FONSTER = 90 // ms bakåt som farten mäts över
export const KAST_ALDER = 130 // ms — äldre sista prov = fingret STOD STILL, alltså inget kast
export const KAST_PROV = 6 // ringbuffertens längd
export const PX_MS_TILL_STEG = 1000 / 60 // px/ms → px/steg (matters fasta steg är 1/60 s)

const nuMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export class Pekspar {
  constructor({ fonster = KAST_FONSTER, alder = KAST_ALDER, prov = KAST_PROV } = {}) {
    this.fonster = fonster
    this.alder = alder
    this.prov = prov
    this._s = []
  }

  get langd() {
    return this._s.length
  }

  rensa() {
    this._s.length = 0
  }

  // Ett prov: tid i ms (samma klocka som `fart(nu)`), fingrets läge.
  lagg(t, x, y) {
    const s = this._s
    s.push({ t, x, y })
    if (s.length > this.prov) s.shift()
  }

  /**
   * Släppfarten i px/ms, eller `null` om släppet inte var ett kast. `nu` = klockan som `lagg`
   * använde (förval `performance.now()`); den går att ge för en syntetisk spårmätning i Node.
   */
  fart(nu = nuMs()) {
    const s = this._s
    if (s.length < 2) return null
    const sist = s[s.length - 1]
    if (nu - sist.t > this.alder) return null
    let i = s.length - 2
    while (i > 0 && sist.t - s[i].t < this.fonster) i--
    if (i < s.length - 2 && sist.t - s[i].t > 2 * this.fonster) i++
    const dt = sist.t - s[i].t
    if (!(dt > 0)) return null
    const vx = (sist.x - s[i].x) / dt
    const vy = (sist.y - s[i].y) / dt
    return { vx, vy, fart: Math.hypot(vx, vy), x: sist.x, y: sist.y }
  }
}

// px/ms → px/steg, klämt till `max` px/steg (matters tunnlingsgräns är ~40). Returnerar
// { vx, vy, fart } i px/steg, eller null om `k` saknas.
export function kastSteg(k, max = Infinity) {
  if (!k) return null
  let vx = k.vx * PX_MS_TILL_STEG
  let vy = k.vy * PX_MS_TILL_STEG
  let fart = Math.hypot(vx, vy)
  if (fart > max) {
    const s = max / fart
    vx *= s
    vy *= s
    fart = max
  }
  return { vx, vy, fart }
}
