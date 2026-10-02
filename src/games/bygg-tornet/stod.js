// Tornets stöd — leder mellan klossarna och en vridfjäder vid basen (FYSIKPLAN F1).
//
// Förut låstes varje lagd kloss statisk (`Body.setStatic`) och tornet kunde aldrig svaja. Nu
// STÅR klossarna kvar som riktiga kroppar:
//
//   · en SOCKEL — en tung platta nedsänkt i marken (toppytan = markens översida), fastnålad i
//     tornets mittlinje med ett gångjärn (`phys.gangjarn`) och en vridfjäder (`vridfjader`). Den
//     kolliderar bara med klossar, aldrig med marken, så den får vippa ±några grader;
//   · en LED (`phys.gangjarn(..., { med })`) i kontaktytan mellan varje kloss och den under. Klossen
//     vilar kvar mot den under (kontakten) och hålls samman av stiftet, så tornet svajar SOM EN
//     HELHET i stället för att glida sönder.
//
// P0 småbarn: inget barnet byggt får välta. Därför är fjädern inte en fast konstant utan LÄSER
// tornet varje steg (lutande moment M0 i tornets egen ram, tyngdpunktshöjd, tröghet) och väljer
//
//     k = K_MIN + MARGINAL · W·h + |M0| / VINKEL_TAK        (och stelare ju närmare/över VAGG)
//
// Jämvikten blir då θ = M0 / (k − W·h) < VINKEL_TAK för VILKA klossar som helst (ett tungt, ensidigt torn
// lutar mer, men aldrig över taket), och MARGINAL > 1 håller tornet ur den omvända pendelns instabilitet
// (k > W·h). Dämpningen följer tornets tröghet (relativ dämpning ZETA), så svajet klingar av på några
// sekunder oavsett om det är 2 eller 20 klossar. Allt per FAST fysiksteg (`phys.beforeStep`), aldrig per
// bildruta.
//
// Svajet kommer ur LANDNINGEN: `slag()` ger hela tornet en stel vridstöt åt det håll klossen landar (en
// gungbräda tar emot en kloss på ena sidan). Lösaren överför själv bara en bråkdel av den (mätt i Node:
// 0,18° mot ~1,5° för samma landning), så stöten läggs på uttryckligen — taket `slagMax` och fjäderns
// mjuka vägg gör att flera stötar i takt ändå aldrig tar tornet längre än ~4°.
//
// Samma modul körs i Node-mätningen (`node scripts/_dag-bygg-tornet-nod.mjs`).
import { Body, STEG2 } from '../../lib/physics.js'

export const KAT_MARK = 0x0004 // markens kollisionskategori (sockeln kolliderar inte med den)
export const KAT_SOCKEL = 0x0008

export const STOD = {
  bredd: 560, // sockelns bredd (tornets första kloss får landa upp till ±120 från mitten)
  tjocklek: 16,
  massa: 100, // sockelns tyngd — ju lättare, desto mer gungar tornet av en landning
  vinkelTak: 0.04, // rad (2,3°) — den största LUTNING ett torn kan ställa in sig på av egen tyngd
  vagg: 0.045, // rad (2,6°) — över detta stelnar fjädern snabbt (en mjuk vägg), så inte ens flera stötar i takt tar tornet längre
  vaggBredd: 0.01, // rad — fjädern är 2× så stel en vaggBredd över väggen, 5× vid två
  marginal: 2, // k = kMin + marginal·W·h + …  (omvänd pendel: > 1 krävs; 2 ger tydligt svaj och ändå en jämvikt)
  kMin: 60,
  zeta: 0.15, // relativ dämpning — ~62 % översläng, klingar av på ~3 s
  styvhetLed: 1,
  slagGain: 6, // en landning är en stöt mot en gungbräda: ω = gain · m·v·e / I  (v = nedslagsfart, e = avstånd från mitten)
  slagMax: 0.006, // rad/steg — taket på stöten
}

export class Tornstod {
  // `phys`: PhysicsWorld · `px`: tornets mittlinje · `markY`: markens översida (klossarnas vilolinje)
  constructor(phys, { px, markY }) {
    this.phys = phys
    this.px = px
    this.markY = markY
    this.klossar = [] // lagda klossar i ordning, nederst först
    this._levande = true
    const gy = STOD.tjocklek / 2
    this.py = markY + gy
    const dens = STOD.massa / (STOD.bredd * STOD.tjocklek)
    this.sockel = phys.rectangle(px, this.py, STOD.bredd, STOD.tjocklek, {
      density: dens,
      friction: 1,
      frictionStatic: 2,
      frictionAir: 0.02,
      restitution: 0,
      label: 'sockel',
      collisionFilter: { group: 0, category: KAT_SOCKEL, mask: 0xffffffff & ~KAT_MARK },
    })
    this._k = STOD.kMin
    this._d = 0
    this.moment = 0 // senaste obalansmoment (för mätning)
    this._I = 1 // tornets + sockelns tröghet kring pivoten (läses i _las)
    this._tyngd = phys.engine.gravity.y * phys.engine.gravity.scale
    // Beräkningen först, fjädern efter — båda i `beforeUpdate`, i registreringsordning.
    this._av = phys.beforeStep(() => this._las())
    this.led = phys.gangjarn(this.sockel, { x: px, y: this.py })
    this.led.vridfjader({ vila: 0, k: () => this._k, damp: () => this._d })
    this._las()
  }

  get vinkel() {
    return this.sockel.angle
  }

  // Läs tornet och välj fjäderns k och damp (ett steg).
  _las() {
    if (!this._levande) return
    const th = this.sockel.angle
    const c = Math.cos(th)
    const s = Math.sin(th)
    const S = this.sockel
    let W = 0
    let Wh = 0
    let M0 = 0
    let I = S.inertia // sockelns egen tröghet (dess mitt ÄR pivoten)
    for (const b of this.klossar) {
      const dx = b.position.x - this.px
      const dy = b.position.y - this.py
      const lx = dx * c + dy * s // tornets egen ram (vridet −θ)
      const ly = -dx * s + dy * c
      const w = b.mass * this._tyngd
      W += w
      Wh += w * -ly
      M0 += w * lx
      I += b.inertia + b.mass * (dx * dx + dy * dy)
    }
    const kEff = STOD.marginal * Wh
    let k = STOD.kMin + kEff + Math.abs(M0) / STOD.vinkelTak
    const over = Math.max(0, Math.abs(th) - STOD.vagg) / STOD.vaggBredd
    k *= 1 + over * over // den mjuka väggen: kvadratiskt stelare ju längre över
    this._k = k
    this.moment = M0
    this._I = I
    // d = 2·ζ·√(k_eff·I / STEG2): Δω per steg = (kθ + dω)·STEG2/I ⇒ kritisk dämpning vid d = 2√(kI/STEG2)
    this._d = 2 * STOD.zeta * Math.sqrt(((this._k - Wh) * I) / STEG2)
  }

  // En kloss som just vilat på tornet ska bli en del av det. Den är dynamisk och ligger kvar där
  // den vilar; stiftet läggs i kontaktytan mellan den och den under.
  lagg(body) {
    if (!this._levande) return null
    const under = this.klossar[this.klossar.length - 1] || null
    const bas = under || this.sockel
    // Kontaktytan i x (överlappet mellan klossens undersida och det under), stiftens y i mitten mellan dem.
    const l = Math.max(body.bounds.min.x, bas.bounds.min.x)
    const r = Math.min(body.bounds.max.x, bas.bounds.max.x)
    const y = under ? (body.position.y + under.position.y) / 2 : this.markY
    const mitt = r > l ? (l + r) / 2 : (body.position.x + bas.position.x) / 2
    // TVÅ stift, minst ±45 px från ytans mitt, så leden aldrig kan vridas (en kloss som vilat ska sitta kvar som den
    // vilade — även en som vilar så ytterst att den ensam skulle vippa). Stiften behöver inte ligga inom
    // överlappet: de skapas med noll fel var de än står. Tornet kan svaja som helhet, men aldrig vika sig i leden.
    const halv = Math.max(45, Math.min(95, (r - l) / 2 - 10))
    const xs = [mitt - halv, mitt + halv]
    const leder = xs.map((x) => this.phys.gangjarn(body, { x, y }, { med: bas, styvhet: STOD.styvhetLed, label: 'tornled' }))
    this.klossar.push(body)
    this._las()
    return leder
  }

  // Stöten från en landande kloss: ett vridimpuls kring pivoten på HELA tornet, som en STEL vridning (varje
  // kropp får fart och vinkelfart enligt sitt avstånd från pivoten). En kloss som landar till höger om mitten
  // trycker ner den sidan som på en gungbräda; ω = gain · m·v·e / I, klämt till `slagMax`.
  slag(body, fart) {
    if (!this._levande || !(fart > 0)) return 0
    const e = body.position.x - this.px
    let w = (STOD.slagGain * body.mass * fart * e) / this._I
    w = Math.max(-STOD.slagMax, Math.min(STOD.slagMax, w))
    if (!w) return 0
    for (const b of [this.sockel, ...this.klossar]) {
      const rx = b.position.x - this.px
      const ry = b.position.y - this.py
      Body.setVelocity(b, { x: b.velocity.x - w * ry, y: b.velocity.y + w * rx })
      Body.setAngularVelocity(b, b.angularVelocity + w)
    }
    return w
  }

  // Ta bort lagda klossar ur stödets bokföring (kroppen tas bort av spelet, ledarna följer med).
  glom() {
    this.klossar.length = 0
    // Allt som stod på sockeln är borta: den är osynlig, så den kan rätas upp och stillas utan att någon ser det.
    Body.setAngle(this.sockel, 0)
    Body.setAngularVelocity(this.sockel, 0)
    this._las()
  }

  ta() {
    if (!this._levande) return
    this._levande = false
    this._av?.()
    this.led?.ta()
  }
}
