// MAGNETFÄLT — en punkt som DRAR eller KNUFFAR det som kommer nära (LYFTPLAN, spår 3).
//
// Ett kraftfält är inte magnetens privatsak: en dammsugare, en virvel, en svart hål-
// planet, en gubbe som lockar med mat och en magnet är samma tre tal (radie, styrka,
// avtagande) med olika bild ovanpå. Appen hade EN sådan implementation, inbakad i
// `magnet-fiske`, och den bar dessutom repots viktigaste kalibrering (px/steg → matter-
// kraft) i en lokal konstant.
//
//   this._falt = new Magnetfalt({ radie: 300, styrka: 480, maxFart: 14, minAvstand: 28 })
//   ...varje bildruta:
//   this._falt.flytta(tip.x, tip.y)
//   this._falt.aktiv = doppad            // en magnet i luften fiskar inte
//   for (const kropp of metall) this._falt.dra(kropp)
//   for (const kropp of trä)    this._falt.knuff(kropp, { radie: 80, styrka: 4, profil: 'jamn' })
//
// STYRKAN ANGES I PX/STEG — den FART fältet ska ge — aldrig i matters kraftenheter.
// Omräkningen sker per kropp ur dess egen `frictionAir` (se `speedToAccel` i physics.js),
// vilket också är skälet till att fältet inte tar en lista kroppar i konstruktorn: två
// saker i samma damm kan ha olika luftmotstånd och ska ändå dras lika fort.
//
// TVÅ AVTAGANDEN, båda med en riktig kund i första spelet:
//   'invers'  styrka/avstånd  — len drift långt bort, snabb snäpp nära (magnetens drag).
//             `styrka` läses då som px²/steg: 480 ger 1,6 px/steg vid 300 px och
//             10,4 px/steg vid 46 px.
//   'jamn'    styrka          — lika hårt i hela radien (den mjuka knuffen bort).
//
// `minAvstand` är golvet som håller `invers` ändlig nära centrum, och `maxFart` är taket
// som håller farten långt under kärlets väggtjocklek — utan det tunnlar kroppar rakt
// igenom väggar mellan två steg.
//
// POLER (`polaritet` + `polDra`) — fältet kan dra ELLER stöta bort beroende på vad det
// möter. Kroppens egen pol skickas in per anrop, eftersom den hör till saken och inte
// till fältet:
//   pol 0   omagnetiserat järn — dras av BÅDA polerna. Det är den riktiga fysiken, och
//           det är också det som gör en pol-damm omöjlig att låsa: det finns alltid
//           något som fastnar oavsett hur fältet står.
//   pol ±1  en egen magnet — LIKA pol stöter bort, OLIKA drar.
// Repulsionen ärver aldrig dragets `maxFart`: ett omvänt 1/r-fält är en katapult precis
// vid centrum, så knuffen har ett eget, lägre tak (`stotFart`).
//
// Den ärver inte heller dragets RADIE, och det är mätt fram: med samma radie åt båda
// håll pressas den bortstötta saken hela vägen ut ur fältet (uppmätt 315 px från en
// 300 px radie på 1,5 s), och då kan ingen vändning nå tillbaka den — leken låser sig
// om barnet inte råkar följa efter med magneten. `stotRadie` (< `radie`) gör knuffen
// till en NÄRFÄLTSEFFEKT: saken glider ut till knuffkanten, stannar där, och ligger
// fortfarande långt inne i dragets radie när polen vänds.
//
// Rena tal + matter. Ingen Pixi, inga tweens, inga timers; `dra()` efter `destroy()`
// gör ingenting.
import Matter from 'matter-js'
import { speedToAccel } from './physics.js'

const { Body } = Matter

export class Magnetfalt {
  constructor({ x = 0, y = 0, radie = 300, styrka = 480, profil = 'invers', minAvstand = 28, maxFart = 14, aktiv = true, polaritet = 1, stotFart = 7, stotRadie = 0 } = {}) {
    this.x = x
    this.y = y
    this.radie = radie
    this.styrka = styrka
    this.profil = profil
    this.minAvstand = minAvstand
    this.maxFart = maxFart
    this.aktiv = aktiv
    this.polaritet = polaritet >= 0 ? 1 : -1
    this.stotFart = stotFart
    this.stotRadie = stotRadie // 0 = samma som `radie`
    this._alive = true
  }

  flytta(x, y) {
    this.x = x
    this.y = y
  }

  avstand(body) {
    const p = body?.position
    if (!p) return Infinity
    return Math.hypot(this.x - p.x, this.y - p.y)
  }

  // Dra kroppen mot fältets mitt. Returnerar den fart (px/steg) fältet lade på —
  // 0 betyder "utanför radien, avstängt fält eller redan riven", vilket gör
  // returvärdet användbart som villkor (spelet slipper räkna avståndet en gång till).
  dra(body, opts = {}) {
    return this._verka(body, 1, opts)
  }

  // Samma fält åt andra hållet. En knuff bort ska nästan alltid vara 'jamn' och kort:
  // ett omvänt 1/r-fält blir en katapult precis vid kanten av det som knuffas.
  knuff(body, opts = {}) {
    return this._verka(body, -1, opts)
  }

  // Vänd fältet. Returnerar den nya polariteten.
  vand() {
    this.polaritet = this.polaritet >= 0 ? -1 : 1
    return this.polaritet
  }

  // Dra ELLER stöta bort beroende på kroppens egen pol (0 = järn, ±1 = egen magnet).
  // Returvärdet är SIGNERAT: >0 drogs mot mitten, <0 knuffades bort, 0 = utanför
  // radien / avstängt fält. Tecknet är därför hela villkoret spelet behöver.
  polDra(body, pol = 0, opts = {}) {
    const p = pol > 0 ? 1 : pol < 0 ? -1 : 0
    if (p !== this.polaritet || p === 0) return this._verka(body, 1, opts)
    // Lika pol: knuffen får sitt EGET tak och sin EGEN radie. Ärvde den dragets tak
    // (14 px/steg) skulle en sak vid `minAvstand` kastas iväg fortare än väggarna är
    // tjocka; ärvde den dragets radie skulle den knuffas ut ur fältet för gott.
    return -this._verka(body, -1, { radie: this.stotRadie || this.radie, maxFart: this.stotFart, ...opts })
  }

  _verka(body, tecken, { radie = this.radie, styrka = this.styrka, profil = this.profil, minAvstand = this.minAvstand, maxFart = this.maxFart } = {}) {
    if (!this._alive || !this.aktiv || !body || body.isStatic) return 0
    const p = body.position
    if (!p || !isFinite(p.x) || !isFinite(p.y)) return 0
    const dx = this.x - p.x
    const dy = this.y - p.y
    const d = Math.hypot(dx, dy) || 0.0001
    if (d > radie) return 0
    const obegransad = profil === 'jamn' ? styrka : styrka / Math.max(d, minAvstand)
    const fart = Math.min(obegransad, maxFart)
    const a = speedToAccel(fart, body.frictionAir) * tecken
    Body.applyForce(body, p, { x: body.mass * a * (dx / d), y: body.mass * a * (dy / d) })
    return fart
  }

  destroy() {
    this._alive = false
  }
}
