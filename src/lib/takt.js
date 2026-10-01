// TAKT — fast tidssteg för allt som inte är matter (FYSIKPLAN T3).
//
//   const takt = new Takt({ steg: 1000 / 60, max: 3, snapp: 0.5 })
//   takt.kor(ticker.deltaMS, () => soft.steg(1))   // i tickern
//   takt.alfa                                      // 0..1 — resten, för interpolation
//
// Varför: `Mjukkropp` och `Rep` räknar `damp` och villkorsstyvhet per STEG men kraftfält
// (`grav`, `falt`) per `dtF²`. Stegar man med ett variabelt `dtF` (deltaMS / 16,67) eller ett
// steg per bildruta ändras därför JÄMVIKTEN med bildfrekvensen: en varm marshmallow kollapsar
// vid ≤ 40 fps, och ett rep hänger 1,9× djupare vid 30 fps. En `Takt` stegar ALLTID med exakt
// 1 och låter antalet steg per bildruta variera i stället.
//
// Samma semantik som `PhysicsWorld.update` (physics.js): deltaMS klampas till 100 ms, och en
// bildruta inom ±`snapp` ms från ett steg räknas som exakt ett steg (vsync-jitter på 0,1 ms
// runt 16,67 ms ger annars 32 % nollstegs- och 34 % dubbelstegsrutor vid 60,00 Hz). Skillnad
// mot physics.js: taket kastar bara överskott som FINNS (kvar ≥ ett steg) — `max` steg med en
// rest under ett steg behåller sin rest, så alfa förblir sann.

export class Takt {
  constructor({ steg = 1000 / 60, max = 3, snapp = 0.5 } = {}) {
    this.steg = steg
    this.max = Math.max(1, max | 0)
    this.snapp = snapp
    this._acc = 0
  }

  // Resten i ackumulatorn som andel av ett steg (0..1) — för render-interpolation.
  get alfa() {
    const a = this._acc / this.steg
    return a < 0 ? 0 : a > 1 ? 1 : a
  }

  // Kör `fn(i)` en gång per fullt steg som ryms i `deltaMS`. Returnerar antalet steg.
  kor(deltaMS, fn) {
    const FIXED = this.steg
    let d = Math.min(Number(deltaMS) || FIXED, 100) // klampa stora hopp (flikbyte); 0/NaN = ett steg
    if (d < 0) d = 0
    if (Math.abs(d - FIXED) < this.snapp) d = FIXED
    this._acc += d
    let n = 0
    while (this._acc >= FIXED && n < this.max) {
      fn(n)
      this._acc -= FIXED
      n++
    }
    if (this._acc >= FIXED) this._acc = 0 // släpp efterskott i stället för att spiralera
    return n
  }

  nollstall() {
    this._acc = 0
    return this
  }
}

// En dämpad fjäder: x = utslag, stegad med fasta delsteg (1/120 s) så att gungningen inte
// beror på bildfrekvensen. En ny stöt mitt i en gungning adderas till farten. Kopierad ur
// `games/grodan-slurp/djur.js` (där heter den `fjader`) — grodan är orörd.
//   const f = fjader1d(w, zeta); f.stot(k); f.steg(dtSekunder) → x
const klam = (v, a, b) => (v < a ? a : v > b ? b : v)

export function fjader1d(w, zeta) {
  const s = { x: 0, v: 0 }
  return {
    stot(k) {
      s.v -= klam(Number(k) || 0, -1, 1) * w
    },
    steg(dt) {
      let rest = klam(Number(dt) || 0, 0, 0.1)
      while (rest > 1e-6) {
        const h = Math.min(rest, 1 / 120)
        s.v += (-w * w * s.x - 2 * zeta * w * s.v) * h
        s.x += s.v * h
        rest -= h
      }
      s.x = klam(s.x, -1.2, 1.2)
      if (Math.abs(s.x) < 1e-4 && Math.abs(s.v) < 1e-3) s.x = s.v = 0
      return s.x
    },
  }
}
