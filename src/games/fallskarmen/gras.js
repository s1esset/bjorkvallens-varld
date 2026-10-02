// GRÄSMATTAN — landningens fjäder (FYSIKPLAN P1, kund 3: fallskarmen).
//
// Landningen var en gsap-tidslinje: upp 72 px, ner, upp 38 px, ner — HELT oberoende av hur fort
// hoppararen kom ner och av om hen var Lätt eller Tung. Tyngd-valet, som hela spelet handlar om,
// syntes alltså aldrig i själva landningen. Här är landningen en riktig fjäder: den tyngre
// hoppararen kommer fortare, pressar mattan djupare och kastas högre, den lätta lagom — och en
// tredje studs tynar bort av sig själv.
//
// Spelet kör ingen matter-värld, så fjädern är `fjader1d` (lib/takt.js) — en dämpad fjäder med
// fasta 1/120 s-delsteg — och luftfärden efter utkastet är en enkel parabel. Rena tal, ingen Pixi,
// inga tweens, inga timers: filen kan inte överleva ett spelbyte, och sonden
// `scripts/_dag-fallskarm-landa.mjs` importerar EXAKT de här konstanterna och klassen, så sond och
// spel kan inte glida isär. (Luftkonstanterna GRAV/V_LATT/MASSA_TUNG bor också här av samma skäl.)
//
//   const g = new Gras()
//   g.landa(vIn)                       // vIn: nedåtfart i px/s när fötterna når marken
//   takt.kor(deltaMS, () => g.steg(1/60))   // FAST steg — samma kurva vid 30 och 60 fps
//   chute.y = GROUND_Y + g.dy          // + = ner i mattan, − = i luften över den
//   g.sank                             // 0…1,2 hur hoptryckt mattan är (till bilden)
//   g.slagN / g.senaste                // ökar vid varje nedslag → ljud + damm
//   g.klar                             // färdigstudsat
//
// ⚠️ FÖRSTA SLAGET ÄR EN SPARK, DE ÖVRIGA ÄR PASSIVA. En fallskärm kommer ner i ~1,4–2,4 px/bildruta;
// en passiv fjäder skulle kasta iväg dem 1–3 px — osynligt. Mattan får därför ge det första
// slaget en spark (`forstaLast`: golv KMIN + det som hoppararens fart tillför, tak 1), men de
// följande nedslagen är hoppararens EGEN utfart och laddas rakt (`passivLast`, retur < 1) — det är
// det som gör att studsarna avtar i stället för att ligga kvar på taket. Med sparken på varje
// nedslag hade utfarten legat på taket för alla nedslag över VREF och studsandet aldrig dött.
//
// TAKET ÄR INBYGGT: `forstaLast` och `passivLast` klämmer laddningen till 1, och en full laddning
// ger utfarten `UTFART_MAX` — alltså en högsta studs (HOJD_MAX px) hur hårt någon än kommer.
// Hoppararen lämnar aldrig bild och mattan sjunker aldrig mer än ~DJUP px.
import { fjader1d } from '../../lib/takt.js'

const klam = (v, a, b) => (v < a ? a : v > b ? b : v)

// Luftrum och fallets luft (flyttade hit ur index.js — värdena är oförändrade).
export const START_Y = 150 // fallskärmens (barnets fötter) start-y
export const GROUND_Y = 560 // marknivå: landning triggas här
export const GRAV = 0.086 // px/bildruta² — sätter hur LÄNGE accelerationen syns (~0,5 s till 95 %)
export const V_LATT = 85 / 60 // px/bildruta: HEADs uppmätta 85 px/s, bevarad fallkänsla
export const MASSA_TUNG = 2.79 // gränsfart ∝ √massa → 1,67× (HEADs uppmätta kvot Tung/Lätt)

export const GRAS = {
  W: 24, // fjäderns ω (rad/s): halvperiod ≈ 0,13 s = själva kontakten
  ZETA: 0.12, // dämpning → passiv retur e^(−ζπ/√(1−ζ²)) ≈ 0,69
  DJUP: 28, // px per fjäderenhet: full laddning pressar ≈ 0,9·28 ≈ 25 px
  KMIN: 0.5, // första slagets golv: även den mjukaste landningen ger en synlig studs (0,3 gav Lätt bara 34 px — för snålt, D7-kritiken)
  VREF: 150, // px/s som (med KMIN) ger full spark — Tung (142) ligger precis under taket
  G: 1500, // px/s² i luften efter utkastet (en fallskärm är lätt — inte matter-tung)
  MAX_FLYG: 2, // högst två utkast per landning (spark + ett passivt) — Tung hinner klart på < 1,6 s
  V_STOPP: 90, // px/s: en utfart under detta blir ingen studs (≈ 2,7 px) — mattan lugnar sig
  MAX_KONTAKT: 40, // säkerhetsnät i steg (0,67 s): en kontakt kan aldrig hänga sig
}
export const X_ENHET = GRAS.W * GRAS.DJUP // px/s som en full fjäderladdning svarar mot (672)
export const UTFART_MAX = X_ENHET * Math.exp((-GRAS.ZETA * Math.PI) / Math.sqrt(1 - GRAS.ZETA ** 2)) // px/s vid k = 1
export const HOJD_MAX = (UTFART_MAX * UTFART_MAX) / (2 * GRAS.G) // högsta studs (px) — taket

// Första slaget: golv + hoppararens fart (px/s, nedåt). Monotont, 0…1.
export function forstaLast(vIn, o = GRAS) {
  return klam(o.KMIN + (1 - o.KMIN) * (Math.max(0, vIn) / o.VREF), 0, 1)
}
// Passivt slag (hoppararens egen utfart tillbaka): laddas rakt, 0…1.
export function passivLast(vIn, o = GRAS) {
  return klam(Math.max(0, vIn) / (o.W * o.DJUP), 0, 1)
}

export class Gras {
  constructor(o = {}) {
    this.o = { ...GRAS, ...o }
    this.fas = 'vila' // 'vila' | 'kontakt' | 'luft' | 'klar'
    this.dy = 0 // px: + ner i mattan, − upp i luften
    this.sank = 0 // 0…1,2: fjäderns utslag nedåt (mattans hoptryckning)
    this.vy = 0 // px/s i luften (+ ner)
    this.slagN = 0 // antal nedslag hittills (ökar vid varje)
    this.senaste = null // { n, k, vIn } för senaste nedslaget
    this.flygN = 0
    this.topp = 0 // högsta höjd över marken under HELA studsandet (px)
    this.topp1 = 0 // …under första utkastet
    this.djupast = 0 // djupaste inpressning (px)
    this.t = 0 // s sedan landa()
    this._f = null
    this._x = 0
    this._prev = 0
    this._steg = 0
    this._alive = true
  }

  get klar() {
    return this.fas === 'klar'
  }

  get hojd() {
    return this.dy < 0 ? -this.dy : 0
  }

  // Ett nedåtriktat nedslag med farten `vIn` (px/s): det FÖRSTA — här får mattan ge sin spark.
  landa(vIn) {
    if (!this._alive) return
    this.slagN = 0
    this.flygN = 0
    this.topp = 0
    this.topp1 = 0
    this.djupast = 0
    this.t = 0
    this._kontakt(forstaLast(vIn, this.o), vIn)
  }

  _kontakt(k, vIn) {
    const o = this.o
    this.k = k
    this.fas = 'kontakt'
    this._steg = 0
    this._f = fjader1d(o.W, o.ZETA)
    this._f.stot(-k) // −k → fjädern går FÖRST ner (positivt utslag = mattan pressas), sedan upp
    this._x = 0
    this._prev = 0
    this.dy = 0
    this.sank = 0
    this.vy = 0
    this.senaste = { n: this.slagN, k, vIn }
    this.slagN++
  }

  _lyft(vOut) {
    const o = this.o
    if (this.flygN < o.MAX_FLYG && vOut >= o.V_STOPP) {
      this.flygN++
      this.fas = 'luft'
      this.vy = -vOut
      this._f = null
    } else {
      this.fas = 'klar'
      this.vy = 0
      this._f = null
    }
  }

  // ETT fast steg (sekunder). Returnerar false när allt är lugnt.
  steg(dt = 1 / 60) {
    if (!this._alive || this.fas === 'klar' || this.fas === 'vila') return false
    const o = this.o
    this.t += dt
    if (this.fas === 'kontakt') {
      this._steg++
      this._prev = this._x
      this._x = this._f.steg(dt)
      if (this._x <= 0 || this._steg >= o.MAX_KONTAKT) {
        // Fjädern är tillbaka i viloläget på väg UPP: utfarten är mattans egen fart just då.
        const vOut = this._x <= 0 ? Math.max(0, ((this._prev - this._x) / dt) * o.DJUP) : 0
        this.dy = 0
        this.sank = 0
        this._lyft(vOut)
      } else {
        this.dy = this._x * o.DJUP
        this.sank = klam(this._x, 0, 1.2)
        if (this.dy > this.djupast) this.djupast = this.dy
      }
    } else {
      this.dy += this.vy * dt
      this.vy += o.G * dt
      if (this.dy >= 0) {
        this.dy = 0
        const vIn = this.vy
        this._kontakt(passivLast(vIn, o), vIn)
      } else {
        const h = -this.dy
        if (h > this.topp) this.topp = h
        if (this.flygN === 1 && h > this.topp1) this.topp1 = h
      }
    }
    return true
  }

  destroy() {
    this._alive = false
    this._f = null
    this.fas = 'klar'
    this.dy = 0
    this.sank = 0
  }
}
