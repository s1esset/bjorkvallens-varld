// VIPPA — en detalj som fjädrar när något stöter till den (FYSIKPLAN P2).
//
//   import { vippa } from '../../lib/vippa.js'
//   const v = vippa(antennBarn, { axel: 'rot', max: 0.3 })   // tickar på Ticker.shared
//   const v = vippa(antennBarn, { ticker: ctx.ticker })      // …eller spelets egen ticker
//   v.stot(0.8)        // en stöt, −1..1 (tecknet = riktningen). En ny stöt mitt i en gungning ADDERAS.
//   v.destroy()        // i spelets destroy(): tar ticker-lyssnaren och lämnar noden i viloläge
//
// Alternativ (alla valfria):
//   axel  'rot' (rotation, radianer) | 'y' (px) | 'skev' (skew.x, radianer)      — default 'rot'
//   max   utslaget vid full stöt i axelns enhet = TAKET: utslaget klämmer aldrig över ±max, hur
//         många stötar som än kommer (hamburgerstapeln får svaja, aldrig välta).
//         Default: rot 0.3 rad · y 14 px · skev 0.35 rad
//   k     fjäderstyvhet (w = √k rad/s). Default 180 ≈ 2,1 Hz (öron, antenner); 400 = stramare/kortare
//   damp  dämpningskvot ζ. Default 0.18 (3–4 synliga svängningar). 0 = dämpas ALDRIG (kontrollarm)
//   ticker  Pixi-ticker att haka på (ctx.ticker). Utelämnad → Ticker.shared. `null` → ingen
//         ticker alls: spelet/sonden driver själv med `v.steg(deltaMS)` (så mäter _vippaprobe)
//
// ⚠️ ANIMERA ALDRIG NODEN SOM BÄR `hitArea` ELLER ÄR ETT `DragController`-MÅL. DragController mäter
// snäppavståndet mot målnodens view när saken släpps och hitArea sitter på samma nod — en vippa som
// flyttar den flyttar träffytan med sig (CLAUDE.md: "animera aldrig containern som addTarget fick").
// Lägg i stället bilden i ett INRE BARN och vippa det:
//     const rot = new Container()                 // bär hitArea / är drag-mål — står still
//     const bild = new Container(); rot.addChild(bild)
//     vippa(bild, { axel: 'y' })                  // bara bilden rör sig
// I dev varnas det i konsolen om noden har en `hitArea`.
//
// Hur: `fjader1d` (lib/takt.js) stegad av en `Takt` med fast steg 1/60 s — samma kurva vid 30 och
// 60 Hz. Utslaget x∈[−1,1] skalas med `max` och läggs ovanpå nodens startvärde (taget vid
// skapandet — sätt noden på plats FÖRE vippa()). Vila: när fjädern stannat snäpps noden till exakt
// startvärdet EN gång och därefter skrivs ingenting förrän nästa stöt. ⚠️ Skriv inte samma egenskap
// någon annanstans varje bildruta (bukt()/liv()/tween) — då blir vippan osynlig. Noden rivs av
// spelet utan att fråga: vippan ser `nod.destroyed` och släpper tickern själv.
import { Ticker } from 'pixi.js'
import { Takt, fjader1d } from './takt.js'

const STANDARD_MAX = { rot: 0.3, y: 14, skev: 0.35 }
const VILA_X = 0.002 // |x| under detta …
const VILA_DX = 0.0003 // … och förflyttning per steg under detta = i vila (≈ 0,03 px vid max 14)
const STEG_S = 1 / 60

export function vippa(nod, opts = {}) {
  const axel = opts.axel === 'y' || opts.axel === 'skev' ? opts.axel : 'rot'
  const max = Number.isFinite(opts.max) ? Math.abs(opts.max) : STANDARD_MAX[axel]
  const w = Math.sqrt(Math.max(1, Number.isFinite(opts.k) ? opts.k : 180))
  const zeta = Math.max(0, Number.isFinite(opts.damp) ? opts.damp : 0.18)

  if (nod?.hitArea && import.meta.env?.PROD !== true) {
    console.warn('vippa: noden har en hitArea — vippa ett INRE barn, inte noden som bär träffytan eller är drag-mål (se lib/vippa.js)')
  }

  const bas = axel === 'y' ? nod.y : axel === 'skev' ? nod.skew.x : nod.rotation
  const skriv = (v) => {
    if (axel === 'y') nod.y = v
    else if (axel === 'skev') nod.skew.x = v
    else nod.rotation = v
  }

  let f = fjader1d(w, zeta)
  const takt = new Takt()
  let x = 0
  let vila = true // inget att skriva förrän första stöten
  let landat = false // sant när ett STEG gav x === 0 (en bildruta utan steg vid 90 Hz är inte vila)
  let levande = true
  let ticker = null
  let tickFn = null

  const stegEtt = () => {
    const xFore = x
    x = f.steg(STEG_S)
    // Fjäderns egen snäpp (1e-4 / 1e-3) kommer sent för mjuka axlar — snäpp här så fort det inte
    // syns, och starta en ny fjäder (fjader1d exponerar inget sätt att nollställa farten).
    if (x !== 0 && Math.abs(x) < VILA_X && Math.abs(x - xFore) < VILA_DX) {
      x = 0
      f = fjader1d(w, zeta)
    }
    if (x === 0) landat = true // fjädern stannade (egen eller fjader1d:s snäpp) — inte "ingen steg än"
  }

  const api = {
    /** En stöt, −1..1. Adderas till en pågående gungning. */
    stot(v) {
      if (!levande) return
      f.stot(v)
      vila = false
      landat = false
    },
    /** En bildruta. Anropas av tickern själv — bara med `{ ticker: null }` driver spelet den. Returnerar utslaget (−1..1). */
    steg(deltaMS) {
      if (!levande) return 0
      if (nod.destroyed) { api.destroy(); return 0 }
      if (vila) return 0
      takt.kor(deltaMS, stegEtt)
      const ut = x > 1 ? 1 : x < -1 ? -1 : x
      skriv(bas + ut * max)
      if (landat) vila = true // sista skrivningen (exakt bas) är gjord — tyst tills nästa stöt
      return ut
    },
    /** Utslaget just nu, −1..1 (för sonder). */
    get x() { return x },
    get vila() { return vila },
    destroy() {
      if (!levande) return
      levande = false
      if (ticker && tickFn) ticker.remove(tickFn)
      ticker = tickFn = null
      if (!nod.destroyed) skriv(bas)
    },
  }

  if (opts.ticker !== null) {
    ticker = opts.ticker || Ticker.shared
    tickFn = (t) => api.steg(t.deltaMS)
    ticker.add(tickFn)
  }
  return api
}
