// STUDSKNOPPEN SOM SVAJAR (FYSIKPLAN F1, dag D16 B4) — den flytande studsknoppens fjäder, ren (ingen Pixi/matter).
//
// Knoppen VILAR tills hjälten slår i den. Stöten ger den en fart bort från hjälten (en andel av hjältens
// fart mot knoppen, klämd), och en mjuk fjäder drar tillbaka den till sin plats: den gungar ett par gånger
// och står stilla igen på ~2 s. Det är ingen ny rörelse varje bildruta utan ett SVAR på barnets skott.
//
// Varför en egen fjäder i stället för `phys.pendel`/`gangjarn`: pricklinjen (AimLauncher.skuggvarld, G3a) läser
// bara STATISKA kroppar, och en dynamisk pendel skulle vara osynlig för den. Knoppen är därför en statisk kropp som
// `phys.kinematisk({ avvikelse })` flyttar i fysiksteget — fjäderns utslag läggs oklampat ovanpå basen (samma mönster
// som studsmattan) — och `forhandsStopp` gör att banan SLUTAR där knoppen faktiskt står just nu.
//
// P0-taken: utslaget klämt till MAX px (knoppen lämnar aldrig sin trakt, hjälten ser den alltid där den var) och
// fjäderfarten klämd till MAX_STOT px/steg. Träffytan ÄR kroppen och följer knoppen (vyn läser kroppens läge), och
// rörelsen börjar först efter en stöt — ett 2–5-årigt barn siktar alltid mot en knopp som står stilla.
export const KNOPP = {
  PER: 1.25, // s — en svängning (ω = 2π/PER)
  ZETA: 0.28, // dämpning: ~3 synliga gungningar, sedan vila
  MAX: 34, // px — största utslag från platsen
  STOT_FAKTOR: 0.16, // andel av hjältens fart mot knoppen som blir knoppens fart
  MIN_STOT: 0.6, // px/steg — minsta fart en stöt ger (så ett mjukt slag också syns)
  MAX_STOT: 3.0, // px/steg — största fart en stöt ger (≈ 28 px utslag)
  MIN_ANSLAG: 1.5, // px/steg — långsammare anslag räknas inte (rullande kontakt)
  VILA_POS: 0.25, // px
  VILA_FART: 0.03, // px/steg
}

export class KnoppFjader {
  constructor(o = {}) {
    const k = { ...KNOPP, ...o }
    this.k = k
    const w = (2 * Math.PI) / (k.PER * 60) // rad/steg
    this.styvhet = w * w
    this.damp = 2 * k.ZETA * w
    this.x = 0
    this.y = 0
    this.vx = 0
    this.vy = 0
  }

  // En stöt: (nx, ny) = enhetsvektor från hjälten mot knoppens mitt, `fart` = hjältens fart mot knoppen (px/steg).
  stot(nx, ny, fart) {
    const { k } = this
    if (!(fart > k.MIN_ANSLAG)) return false
    const v = Math.max(k.MIN_STOT, Math.min(k.MAX_STOT, k.STOT_FAKTOR * fart))
    this.vx += nx * v
    this.vy += ny * v
    const s = Math.hypot(this.vx, this.vy)
    if (s > k.MAX_STOT) {
      this.vx *= k.MAX_STOT / s
      this.vy *= k.MAX_STOT / s
    }
    return true
  }

  // Ett FAST fysiksteg → utslaget { x, y } (px från platsen). Halvimplicit Euler.
  steg() {
    if (this.vilar) {
      this.x = this.y = this.vx = this.vy = 0
      return { x: 0, y: 0 }
    }
    this.vx += -this.styvhet * this.x - this.damp * this.vx
    this.vy += -this.styvhet * this.y - this.damp * this.vy
    this.x += this.vx
    this.y += this.vy
    const d = Math.hypot(this.x, this.y)
    if (d > this.k.MAX) {
      this.x *= this.k.MAX / d
      this.y *= this.k.MAX / d
      // Farten utåt tas bort: knoppen vänder vid taket i stället för att klistra där.
      const dot = (this.vx * this.x + this.vy * this.y) / (this.k.MAX * this.k.MAX)
      if (dot > 0) {
        this.vx -= dot * this.x
        this.vy -= dot * this.y
      }
    }
    // Vila: nära platsen och nästan stilla → exakt på platsen (en fjäder når aldrig noll av sig själv).
    if (Math.hypot(this.x, this.y) < this.k.VILA_POS && Math.hypot(this.vx, this.vy) < this.k.VILA_FART) {
      this.x = this.y = this.vx = this.vy = 0
    }
    return { x: this.x, y: this.y }
  }

  get vilar() {
    return this.x === 0 && this.y === 0 && this.vx === 0 && this.vy === 0
  }
}
