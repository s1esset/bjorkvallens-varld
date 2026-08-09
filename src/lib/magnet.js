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
// Rena tal + matter. Ingen Pixi, inga tweens, inga timers; `dra()` efter `destroy()`
// gör ingenting.
import Matter from 'matter-js'
import { speedToAccel } from './physics.js'

const { Body } = Matter

export class Magnetfalt {
  constructor({ x = 0, y = 0, radie = 300, styrka = 480, profil = 'invers', minAvstand = 28, maxFart = 14, aktiv = true } = {}) {
    this.x = x
    this.y = y
    this.radie = radie
    this.styrka = styrka
    this.profil = profil
    this.minAvstand = minAvstand
    this.maxFart = maxFart
    this.aktiv = aktiv
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
