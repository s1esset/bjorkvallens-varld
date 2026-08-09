// FLYTKRAFT — en VÄTSKEVOLYM som lyfter, bromsar och vaggar det som ligger i den
// (LYFTPLAN B6).
//
// `PhysicsWorld` kunde bara två saker med en kropp: dra den nedåt (gravitation) och
// blåsa på den i sidled (`setWind`). Det fanns inget begrepp för "här är vatten" —
// alltså ingen lyftkraft som beror på hur DJUPT något ligger, inget motstånd som gör
// rörelsen lugn, och ingen skillnad mellan en kork och en sten annat än att spelet
// själv räknade ut krafterna varje bildruta. `plask-i-vattnet` gjorde exakt det i
// 34 rader; `fallskarmen`, `ballonglyft` och `poppa-ballonger` väntar på samma sak.
//
//   const v = new Flytvolym({ varld: this._phys, ytY: 330, botten: 672,
//                             vanster: 414, hoger: 866 })
//   v.lagg(body, { flyt: 1.6 })     // > 1 = flyter, < 1 = sjunker
//   ...varje bildruta, FÖRE varld.update():  v.steg(this._t)
//   ...destroy():                            v.destroy()
//
// VARFÖR DET ÄR MASSOBEROENDE. Matter lägger på gravitationen som en KRAFT
// (`massa · g.y · g.scale`), så accelerationen blir densamma för alla kroppar.
// Flytkraften byggs likadant: `massa · bas · frac · flyt`, där `bas` läses ur
// världens egen gravitation. Då gäller EN regel oavsett täthet och storlek:
//
//     frac · flyt  >  1   ⇒ netto uppåt      (kroppen stiger tills det står lika)
//     frac · flyt  <  1   ⇒ netto nedåt      (kroppen sjunker)
//
// och en flytare lägger sig i jämvikt vid nedsänkningen `frac = 1/flyt` — flyt 1.6
// ger 62 % under ytan. Det är alltså `flyt` ensamt som avgör hur högt något flyter,
// vilket är precis den knapp ett spel vill ha ("anden guppar högt, båten ligger
// djupare") utan att behöva pilla på densitet och radie samtidigt.
//
// Volymen är en REKTANGEL, inte bara en ytlinje: `vanster`/`hoger` gör att ett spel
// kan ha vatten i en del av bilden (en tank, en pöl, en hink) utan att kroppar
// utanför den lyfts av osynligt vatten.
//
// Rena tal + matter. Ingen Pixi, inga tweens, inga timers — volymen kan inte
// överleva ett spelbyte, och `steg()` efter `destroy()` gör ingenting.
import Matter from 'matter-js'

const { Body } = Matter
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const TAU = Math.PI * 2

// Radien används till nedsänkningen (hur mycket av kroppen som är under ytan).
// En cirkel bär den själv; allt annat mäts ur sin egen höjd.
function radie(b) {
  if (b.circleRadius) return b.circleRadius
  const bb = b.bounds
  return bb ? (bb.max.y - bb.min.y) / 2 : 20
}

export class Flytvolym {
  // varld     PhysicsWorld (eller en matter-Engine) — flytkraftens bas läses ur dess
  //           gravitation, så ett spel som ändrar gravitationen mitt i leken behåller
  //           jämvikten. Utan värld: skicka `bas` (= g.y · 0.001) själv.
  // ytY       vätskeytans y (nollinjen). Ovanför den finns ingen lyftkraft.
  // botten    golvets ovansida — det som lagt sig där lugnas extra (inget jitter).
  // motstand  hastighetsdämpning per bildruta INUTI volymen (0..1). 0.93 = lugnt vatten.
  // maxFart   fartspärr (px/steg) — inget kan skjuta ur kärlet.
  // vridDamp  rotationsdämpning → föremål håller sig ~upprätta.
  // fjader    svag sidofjäder mot `hemX` (fördelar sakerna i stället för att stapla dem).
  // guppAmp/W, vaggAmp/W  liv vid ytan: lodrätt gupp + mjuk sidledsvaggning.
  constructor({
    varld = null,
    bas = null,
    ytY = 0,
    botten = null,
    vanster = -Infinity,
    hoger = Infinity,
    motstand = 0.93,
    maxFart = 10,
    vridDamp = 0.9,
    fjader = 0.00003,
    maxSid = 0.0008,
    guppAmp = 0.0007,
    guppW = 1.8,
    vaggAmp = 0.00025,
    vaggW = 1.4,
    bottenLugn = 0.7,
    bottenMarg = 8,
  } = {}) {
    this._engine = varld?.engine || varld || null
    this._bas = bas
    this.ytY = ytY
    this.botten = botten
    this.vanster = vanster
    this.hoger = hoger
    this.motstand = motstand
    this.maxFart = maxFart
    this.vridDamp = vridDamp
    this.fjader = fjader
    this.maxSid = maxSid
    this.guppAmp = guppAmp
    this.guppW = guppW
    this.vaggAmp = vaggAmp
    this.vaggW = vaggW
    this.bottenLugn = bottenLugn
    this.bottenMarg = bottenMarg
    this._alive = true
    this._items = []
  }

  // Flytkraftens bas i matters kraftenheter: exakt neutral vid `frac · flyt = 1`.
  // Läses ur världen varje steg (inte en gång i konstruktorn) — annars skulle ett
  // `setGravity()` mitt i leken göra allt som flöt till sjunkare utan förklaring.
  get bas() {
    if (this._bas != null) return this._bas
    const g = this._engine?.gravity
    return g ? g.y * (g.scale ?? 0.001) : 0.001
  }

  // flyt  > 1 flyter (jämvikt vid nedsänkning 1/flyt), < 1 sjunker, = 1 svävar neutralt.
  // liv   gupp + vaggning (default: bara flytare — en sten på botten ska ligga still).
  // hemX  sidofjäderns viloläge; utelämnat = ingen fjäder för just den kroppen.
  lagg(body, { flyt = 1, r = null, hemX = null, fas = Math.random() * TAU, liv = null } = {}) {
    if (!body) return null
    const rec = { body, flyt, r: r ?? radie(body), hemX, fas, liv: liv ?? flyt > 1 }
    this._items.push(rec)
    return rec
  }

  ta(body) {
    const i = this._items.findIndex((o) => o.body === body)
    if (i >= 0) this._items.splice(i, 1)
  }

  rensa() {
    this._items = []
  }

  get count() {
    return this._items.length
  }

  // Hur djupt kroppen ligger: 0 = helt ovanför ytan, 1 = helt under.
  nedsankning(body) {
    const rec = this._items.find((o) => o.body === body)
    if (!rec) return 0
    return this._frac(rec)
  }

  _frac(rec) {
    const p = rec.body.position
    if (p.x < this.vanster || p.x > this.hoger) return 0
    return clamp((p.y + rec.r - this.ytY) / (2 * rec.r), 0, 1)
  }

  // Anropas EN gång per bildruta, FÖRE `varld.update()`: matter nollställer alla
  // krafter i sitt eget steg, så en flytkraft som läggs på efteråt kastas bort.
  // `t` är speltid i sekunder och driver bara gupp/vaggnings-faserna.
  steg(t = 0) {
    if (!this._alive) return
    for (const o of this._items) {
      const b = o.body
      if (!b || b.isStatic) continue
      const pos = b.position
      if (!isFinite(pos.x) || !isFinite(pos.y)) continue
      const frac = this._frac(o)
      if (frac > 0) {
        // Uppåt: flytkraft. Nedåt räknar matter själv (gravitationen).
        let vAcc = -this.bas * frac * o.flyt
        // Sidled: svag fjäder mot hemläget, klämd så den aldrig blir en knuff.
        let sidA = o.hemX == null ? 0 : this.fjader * (o.hemX - pos.x)
        if (o.liv) {
          vAcc += this.guppAmp * Math.sin(t * this.guppW + o.fas)
          sidA += this.vaggAmp * Math.sin(t * this.vaggW + o.fas * 1.3)
        }
        sidA = clamp(sidA, -this.maxSid, this.maxSid)
        Body.applyForce(b, pos, { x: b.mass * sidA, y: b.mass * vAcc })
        // Vätskemotstånd: farten dämpas → lugnt, aldrig studsigt.
        Body.setVelocity(b, { x: b.velocity.x * this.motstand, y: b.velocity.y * this.motstand })
      }
      // Det som lagt sig på botten lugnas extra, annars darrar det mot golvet.
      if (this.botten != null && pos.y > this.botten - o.r - this.bottenMarg) {
        Body.setVelocity(b, { x: b.velocity.x * this.bottenLugn, y: b.velocity.y * this.bottenLugn })
      }
      if (b.angularVelocity) Body.setAngularVelocity(b, b.angularVelocity * this.vridDamp)
      // Fartspärren gäller ALLTID, även ovanför ytan: det är den som gör att inget
      // kan tunnla genom kärlets vägg mellan två steg (se `hog-fart` i physics.js).
      const sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > this.maxFart) {
        Body.setVelocity(b, { x: (b.velocity.x / sp) * this.maxFart, y: (b.velocity.y / sp) * this.maxFart })
      }
    }
  }

  destroy() {
    this._alive = false
    this._items = []
  }
}
