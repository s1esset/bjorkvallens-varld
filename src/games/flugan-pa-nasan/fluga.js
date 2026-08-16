// FLUGANS RÖRELSE — egen styrande integrator, ingen fysikmotor.
//
// Den bor i en EGEN fil därför att `scripts/_blickprobe.mjs` måste kunna driva exakt samma
// bana som spelet gör. En sond som simulerar sin egen "fluglika" rörelse mäter sondens
// fluga, inte spelets, och blir grön den dag banan ändras.
//
// En fluga rör sig i RYCK: den håller en riktning en kort stund, byter mål, skjuter iväg.
// Det är precis motsatsen till den långsamt dragna matbiten `ansikte.js`s `blick()`-hysteres
// är inställd på — därav mätfrågan i `docs/IDEER.md` post 2 ⓷.

// Hur långt från ansiktets mitt ett utslag på 1,0 ligger när flugans läge matas till
// `blick()`. Delas av spelet och sonden av samma skäl som banan själv.
export const BLICK_RADIE = 230

/**
 * Flugans bana. Ett mål som byts ofta, och en fart som styr mot det.
 *
 * `ryck` är hela flugkänslan: hur ofta målet byts. Låga tal = nervös fluga.
 */
export class Flugbana {
  constructor({ x = 640, y = 300, omrade, fart = 300, accel = 1500, ryckMin = 0.22, ryckMax = 0.62 } = {}) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this._omr = omrade || { x: 640, y: 300, w: 620, h: 400 }
    this._fart = fart
    this._accel = accel
    this._ryckMin = ryckMin
    this._ryckMax = ryckMax
    this._t = 0
    this._mal = { x, y }
    this._lockad = null
    this._nyttMal()
  }

  _nyttMal() {
    this._t = this._ryckMin + Math.random() * (this._ryckMax - this._ryckMin)
    if (this._lockad) {
      // Lockad (sylt eller fönster): målet ligger nära lockbetet, men aldrig exakt på det —
      // en fluga som far spikrakt mot en punkt läser som en pil, inte som en fluga.
      this._mal = {
        x: this._lockad.x + (Math.random() - 0.5) * 70,
        y: this._lockad.y + (Math.random() - 0.5) * 70,
      }
      return
    }
    const o = this._omr
    this._mal = {
      x: o.x + (Math.random() - 0.5) * o.w,
      y: o.y + (Math.random() - 0.5) * o.h,
    }
  }

  /** Locka flugan mot en punkt (sylten, det öppna fönstret). `null` = släpp lockbetet. */
  lockaMot(p) {
    this._lockad = p ? { x: p.x, y: p.y } : null
    this._t = 0
  }

  /** En knuff bort från en punkt — viftningen och fläktens pust. */
  knuff(fx, fy, kraft = 1) {
    const dx = this.x - fx
    const dy = this.y - fy
    const d = Math.hypot(dx, dy) || 1
    this.vx += (dx / d) * 420 * kraft
    this.vy += (dy / d) * 420 * kraft
    this._t = 0
  }

  /** Ett steg. `dt` i sekunder — klämd av anroparen, precis som spelets egen loop gör. */
  steg(dt) {
    this._t -= dt
    if (this._t <= 0) this._nyttMal()
    const dx = this._mal.x - this.x
    const dy = this._mal.y - this.y
    const d = Math.hypot(dx, dy) || 1
    this.vx += (dx / d) * this._accel * dt
    this.vy += (dy / d) * this._accel * dt
    // Fartspärr + lite luftmotstånd, annars svänger den ut i oändligheten.
    const v = Math.hypot(this.vx, this.vy)
    const tak = this._lockad ? this._fart * 0.7 : this._fart
    if (v > tak) {
      this.vx = (this.vx / v) * tak
      this.vy = (this.vy / v) * tak
    }
    this.vx *= 0.985
    this.vy *= 0.985
    this.x += this.vx * dt
    this.y += this.vy * dt
    return this
  }
}

/**
 * LÅGPASSFILTRET som `blick()` matas genom.
 *
 * ⚠️ SPELET FÅR INTE ÄNDRA RIGGENS KONSTANTER. `BLICK_DOD`/`BLICK_HYST`/`BLICK_TID` i
 *    `lib/ansikte.js` läses av `mata-munnen` också, och de är inställda på en långsamt
 *    dragen matbit. Går flimret för högt är den KÄNDA reserven att jämna ut flugans läge
 *    INNAN det matas till blicken — alltså här, i spelet, inte där.
 *
 * `tid` är tidskonstanten i sekunder: hur länge det tar för utjämningen att komma ~63 % av
 * vägen till ett nytt läge. Den gör inte flugan långsammare — bara BLICKEN.
 */
export class Blickfilter {
  constructor({ tid = 0.28 } = {}) {
    this.tid = tid
    this.x = null
    this.y = null
  }

  steg(dt, x, y) {
    if (this.x === null) {
      this.x = x
      this.y = y
      return this
    }
    const k = this.tid > 0 ? 1 - Math.exp(-dt / this.tid) : 1
    this.x += (x - this.x) * k
    this.y += (y - this.y) * k
    return this
  }
}
