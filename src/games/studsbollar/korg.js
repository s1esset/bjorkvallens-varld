// Den GUNGANDE KORGEN (FYSIKPLAN F1) — korgen står på marken och vaggar som en tumlare när en boll
// slår i kanten eller dyker ner i den. Samma modul körs av spelet och av sonden
// `scripts/_dag-studsbollar-korg.mjs`, så sonden mäter exakt det spelet gör.
//
// KROPP: EN sammansatt kropp — två kantcirklar ('rim') och en sensor i öppningen ('basket'), i
// samma etiketter som den gamla statiska korgen (spelets `_onCollision` är orörd). Kroppen sitter
// fast i ett GÅNGJÄRN i markplanet under korgen (`phys.gangjarn`) och hålls upprätt av en
// VRIDFJÄDER (`g.vridfjader`): vaggar den, fjädrar den tillbaka och lugnar sig.
//
// TRE SPÄRRAR så en gungande korg aldrig blir ett hinder:
//   · maxVinkel — mjuk gräns (fjädern stelnar utanför) + hård fartkoll: kanten rör sig högst
//     ~18 px åt något håll, så öppningen finns alltid kvar där barnet siktade.
//   · tyngdkraften tas bort från korgen i `beforeStep` — den är en torsionsoscillator, inte en
//     omvänd pendel (annars skulle fjädern behöva slåss mot sin egen tyngd).
//   · kantcirklarna har restitution 0 och friktion 1 som den gamla statiska korgen EFFEKTIVT hade
//     (`Body.setStatic` nollade 0,55) — så en boll som slår i kanten studsar som förut; det
//     ENDA som är nytt är att kanten ger efter ett ögonblick.
// En boll som gjort mål lämnar fysiken direkt (spelet tar bort kroppen) — gungningen kan alltså
// aldrig kasta ut en fångad boll. Spelet flyttar dess bild in i korgens egen container.
import { Bodies, Body, STEG2 } from '../../lib/physics.js'

export const KORG = {
  period: 0.9, // s — en hel gungning (vaggar lugnt, inte nervöst)
  zeta: 0.22, // dämpning: ~3 synliga vaggningar, stilla på ~2,5 s
  rimMassa: 24, // kg per kant — tungt nog att en boll i kanten studsar som mot HEAD:s statiska kant (träffandel 47,0 mot 46,7 %)
  sensorMassa: 16,
  ballastDjup: 50, // px under marken (sensor inne i golvet)
  maxVinkel: 0.09, // rad — mjuk gräns (≈ 13,5 px vid kantens höjd 150)
  hardVinkel: 0.105, // rad — hård gräns (≈ 16 px, med överskott ≤ 18): utåt-fart nollas och vinkeln fastnar på gränsen
  maxFart: 0.025, // rad/steg
  knuff: 0.009, // rad/steg vid full knuff (en boll som gör mål) → ≈ 0,075 rad utslag (≈ 11 px)
  vilaVinkel: 0.0008,
  vilaFart: 0.0004,
}

export class Gungkorg {
  // `phys`: PhysicsWorld · `x`: korgens mitt · `golvY`: marken under den · `oppningY`: öppningens y
  // · `scale`: nivåns skala.
  constructor(phys, { x, golvY, oppningY, scale = 1 } = {}) {
    this.phys = phys
    this.x = x
    this.golvY = golvY
    this.oppningY = oppningY
    this.scale = scale
    this.levande = true
    this._unbind = null
    this.led = null

    const s = scale
    // Delarna väger så att TYNGDPUNKTEN hamnar i gångjärnet: ett gångjärn långt från tyngdpunkten
    // (34 kg 142 px bort) får matters lösare att skena (r²·m/I > 2/styvhet − 1 → vinkel 10²⁰⁰ efter
    // åtta steg, mätt). Därför en BALLAST under marken — en sensor (löser aldrig en kontakt) som
    // ligger inne i golvkroppen där ingen boll kan nå (golvets ovansida = golvY).
    const hRim = golvY - oppningY // kantens höjd över gångjärnet
    const hSens = golvY - (oppningY + 38 * s)
    const dBal = KORG.ballastDjup
    const dens = (massa, area) => massa / area
    const sensor = Bodies.rectangle(x, oppningY + 38 * s, 110 * s, 44 * s, { isSensor: true, label: 'basket', density: dens(KORG.sensorMassa, 110 * s * 44 * s) })
    const rimOpt = { label: 'rim', restitution: 0, friction: 1, frictionStatic: 1, density: dens(KORG.rimMassa, Math.PI * (12 * s) ** 2) }
    const rimL = Bodies.circle(x - 70 * s, oppningY, 12 * s, rimOpt)
    const rimR = Bodies.circle(x + 70 * s, oppningY, 12 * s, rimOpt)
    // Ballastens massa räknas ur delarnas FAKTISKA massor (cirklarna är månghörningar), så tyngdpunkten hamnar exakt i leden.
    const mBal = (rimL.mass * hRim + rimR.mass * hRim + sensor.mass * hSens) / dBal
    const ballast = Bodies.rectangle(x, golvY + dBal, 120, 60, { isSensor: true, label: 'ballast', density: dens(mBal, 120 * 60) })

    this.body = phys.sammansatt([sensor, rimL, rimR, ballast], { label: 'korg', frictionAir: 0 })
    this.delar = [this.body]
    this._vilaX = this.body.position.x // grundläget (tyngdpunkten) när korgen står upprätt
    this._vilaY = this.body.position.y
    this.led = phys.gangjarn(this.body, { x, y: golvY }, { label: 'korgled' })

    // Fjäderns tal räknas ur kroppens EGEN tröghet kring gångjärnet, så perioden stämmer vid
    // varje skala: ω₀² = k·STEG2/I  →  k = ω₀²·I/STEG2 (ω₀ i rad/steg), c = 2·ζ·ω₀·I/STEG2.
    const d = Math.hypot(this.body.position.x - x, this.body.position.y - golvY)
    this.tregh = this.body.inertia + this.body.mass * d * d
    const w0 = (2 * Math.PI) / (KORG.period * 60)
    this.k = (w0 * w0 * this.tregh) / STEG2
    this.c = (2 * KORG.zeta * w0 * this.tregh) / STEG2
    const kHard = this.k * 6
    this.led.vridfjader({
      vila: 0,
      k: () => {
        // Mjuk gräns: fjädern stelnar utanför maxVinkel — en kraftig stöt bromsas mot kanten.
        const a = Math.abs(this.led.vinkel)
        return a > KORG.maxVinkel ? this.k + kHard * ((a - KORG.maxVinkel) / KORG.maxVinkel) : this.k
      },
      damp: this.c,
    })
    this._unbind = phys.beforeStep(() => this._steg())
  }

  // En gång per FAST steg: ta bort tyngden, klämma farten, vila.
  _steg() {
    if (!this.levande || !this.body) return
    const b = this.body
    const g = this.phys.engine.gravity
    const gs = typeof g.scale !== 'undefined' ? g.scale : 0.001
    b.force.x -= b.mass * g.x * gs
    b.force.y -= b.mass * g.y * gs
    let w = b.angularVelocity
    const a = this.led ? this.led.vinkel : b.angle
    // Hård gräns: utåt-fart nollas vid hardVinkel, och farten är alltid klämd.
    if (Math.abs(a) > KORG.hardVinkel && Math.sign(w) === Math.sign(a)) {
      w = 0
      Body.setAngle(b, Math.sign(a) * KORG.hardVinkel) // tyngdpunkten sitter i gångjärnet: vridningen flyttar inget
    }
    w = Math.max(-KORG.maxFart, Math.min(KORG.maxFart, w))
    if (w !== b.angularVelocity) Body.setAngularVelocity(b, w)
    // Vila: nära upprätt och stilla → exakt stilla (inget evigt darr).
    if (Math.abs(a) < KORG.vilaVinkel && Math.abs(w) < KORG.vilaFart) {
      Body.setAngularVelocity(b, 0)
      Body.setAngle(b, 0)
      Body.setPosition(b, { x: this._vilaX ?? b.position.x, y: this._vilaY ?? b.position.y })
    }
  }

  // En stöt: `riktning` −1/+1 (vilket håll toppen far), `styrka` 0…1.
  knuff(riktning, styrka = 1) {
    if (!this.body || !this.levande) return
    const w = this.body.angularVelocity + Math.sign(riktning || 1) * KORG.knuff * Math.max(0, Math.min(1, styrka))
    Body.setAngularVelocity(this.body, Math.max(-KORG.maxFart, Math.min(KORG.maxFart, w)))
  }

  get vinkel() {
    return this.led ? this.led.vinkel : 0
  }

  get fart() {
    return this.body ? this.body.angularVelocity : 0
  }

  // Öppningens mitt just nu, i världen.
  oppning() {
    return this.punkt(0, this.oppningY - this.golvY)
  }

  // En punkt som sitter fast i korgen — (dx, dy) relativt gångjärnet i VILA — i världen nu.
  punkt(dx, dy) {
    const a = this.vinkel
    const cs = Math.cos(a)
    const sn = Math.sin(a)
    return { x: this.x + dx * cs - dy * sn, y: this.golvY + dx * sn + dy * cs }
  }

  // Kantens avvikelse från vilopositionen (px) — för sonden.
  kantAvvikelse() {
    const h = this.golvY - this.oppningY
    const p = this.punkt(0, -h)
    return Math.hypot(p.x - this.x, p.y - this.oppningY)
  }

  destroy() {
    if (!this.levande) return
    this.levande = false
    this._unbind?.()
    this._unbind = null
    this.led?.ta()
    this.led = null
    for (const d of this.delar) this.phys.removeBody(d)
    this.body = null
    this.delar = []
  }
}
