// vev.js — ROTATIONSGREPP kring en axel: dra runt en ratt/vev/ventil (FYSIKPLAN G8).
//
// Ett finger som dras RUNT en axel ger ratten vinkelfart; ett enkelt tryck är en KNUFF (ett kvarts
// varv). Småbarn: enkel drag + tap (P0) — tap-fallbacken är hela vägen, inte en reserv man måste
// leta efter. Ingen matter krävs: libbet har en egen vinkel+vinkelfart-integrator och kan bara
// VALFRITT kopplas till ett `phys.gangjarn(...)`-handtag (lib/physics.js, F1) när ratten är en
// riktig kropp med tröghet.
//
//   const vev = new Vev({
//     yta: this._ventilYta,                      // gemensam STATIC förälder (K3, lib/pekare.js)
//     hitArea: new Circle(CX, CY, 66),           // bara om ytan saknar träffbar geometri
//     x: CX, y: CY,                              // axeln — ytans LOKALA koordinater
//     hitRadie: 66,                              // träffbar yta (småbarn: ≥ 48 + halo)
//     rMin: 28,                                  // närmare axeln än så dämpas fingrets bidrag
//     tapVinkel: Math.PI / 2,                    // ett tryck = så här långt (glidet), rad
//     damp: 0.03,                                // andel av farten som tappas per steg (egen integrator)
//     acc: 0.012,                                // TAK: högsta vinkelfartändring per steg (rad/steg²)
//     maxFart: 0.3,                              // TAK: högsta vinkelfart (rad/steg) — en vild snurr skenar inte
//     gain: 0.35,                                // andel av glappet fingret stänger per steg
//     klick: Math.PI / 4,                        // onKlick var 45:e grad (spärrhjul/ljud)
//     stopp: 0.0015,                             // dödzon (rad/steg): under den står ratten still
//     // valfritt — ratten är en matter-kropp:
//     phys, gangjarn: phys.gangjarn(hjul, { x: CX, y: CY }),  maxMoment: 3000,
//     onNed(p), onGrepp(), onKnuff(riktning), onKlick(n, riktning), onSlapp({ tryck, drag, avbruten }),
//   })
//   ticker: vev.uppdatera(t.deltaMS)             // egen integrator (fast steg 1/60 s, ackumulator)
//   vy.rotation = vev.vinkel                     // ALDRIG modulo — varven räknas uppåt
//   …destroy(): vev.destroy()                    // exit-säkert: inga lyssnare/krokar kvar, inga anrop
//
// VINKELN är i Pixis skärmriktning (positivt = medurs, y nedåt) och räknas uppåt för alltid.
// FARTEN är rad/STEG (60 steg/s) som resten av fysikbiblioteken; `varvPerS` ger varv/s för en mätning.
//
// DRAG: fingret börjar ta tag först efter `DRAG_TROSKEL` px rörelse — ett tryck som hålls stilla
// bromsar alltså aldrig ratten (annars hade varje tap-knuff på en snurrande ratt nollat farten först).
// FINGRETS VINKELFART mäts över ~90 ms (samma fönster/ålder som `Pekspar`): tangentialfarten
// v_t = ω·r, och ω = v_t / max(r, rMin) — nära axeln, där en pixel är många grader, räknas bidraget
// ner. Greppet är en fjäder med KRAFTTAK: `dv = gain·(ω_finger − ω)` klämt till `acc`, och farten
// klämd till `maxFart` (utan taken sköts ratten iväg — mätt i `_vevlibprobe`).
//
// TAP = KNUFF: ett tryck (ingen drag, hållet < `TAP_MAX_MS`) ger en fartimpuls som glider ett kvarts
// varv på en stilla ratt: v0 = tapVinkel · damp (+ dödzonens svans). Knuffar ADDERAS (taket `maxFart` gäller),
// så ett par snabba tryck får upp samma varvtal som ett drag.
//
// Ren logik utan Pixi och utan matter-import: pekhändelserna går genom `pekGrepp`, så hela klassen
// prövas i Node med en falsk yta (`scripts/_vevlibprobe.mjs`).
import { pekGrepp } from './pekare.js'
import { KAST_FONSTER, KAST_ALDER } from './pekspar.js'

export const VEV_STEG_MS = 1000 / 60
export const VEV_STEG2 = VEV_STEG_MS * VEV_STEG_MS // matters dt² (samma tal som STEG2 i physics.js)
const MS_TILL_STEG = VEV_STEG_MS // rad/ms → rad/steg
const DRAG_TROSKEL = 12 // px rörelse innan ett tryck räknas som ett drag
export const TAP_MAX_MS = 600 // längre än så = ett hållet tryck, inte en knuff
const STOPP_FART = 0.0015 // under detta (rad/steg) står ratten still — inget svänghjul i evighet
const PROV = 8

const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const nuMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const lindra = (a) => {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a <= -Math.PI) a += 2 * Math.PI
  return a
}

export class Vev {
  constructor({
    yta, x = 0, y = 0, hitArea = null, hitRadie = 66, rMin = 28, tapVinkel = Math.PI / 2, damp = 0.03,
    acc = 0.012, maxFart = 0.3, gain = 0.35, klick = Math.PI / 4, riktning = 1, stopp = STOPP_FART, phys = null,
    gangjarn = null, maxMoment = null, onNed, onGrepp, onKnuff, onKlick, onSlapp,
  } = {}) {
    this.x = x
    this.y = y
    this.hitRadie = hitRadie
    this.rMin = rMin
    this.tapVinkel = tapVinkel
    this.damp = damp
    this.acc = acc
    this.maxFart = maxFart
    this.gain = gain
    this.klick = klick
    this.riktning = riktning // knuffens riktning: 1 medurs, -1 moturs
    this.stopp = stopp // under detta (rad/steg) står ratten still; 0 = ingen dödzon
    this.maxMoment = maxMoment
    this.led = gangjarn
    this.aktiv = true // false = ratten tar inga tryck (t.ex. stängd tills vidare)
    this._on = { onNed, onGrepp, onKnuff, onKlick, onSlapp }

    this._alive = true
    this._vinkel = 0
    this._fart = 0
    this._acc = 0 // ackumulerad realtid (egen integrator)
    this._ko = 0 // köad knuff-fartimpuls (rad/steg), läggs på i nästa steg
    this._klickN = 0
    this._grepp = null // { id, start:{x,y}, t0, drog, spar:[], th, r }
    this._avSteg = this.led && phys?.beforeStep ? phys.beforeStep(() => this.steg()) : null
    this._av = yta
      ? pekGrepp(yta, {
          hitArea,
          traff: (p) => (this._alive && this.aktiv && Math.hypot(p.x - this.x, p.y - this.y) <= this.hitRadie ? true : null),
          ned: (p) => this._ned(p),
          flytta: (p) => this._flytta(p),
          slapp: (p, mal, o) => this._slapp(p, o),
        })
      : null
  }

  // ---- läsning -----------------------------------------------------------------------------

  get vinkel() {
    return this.led ? this.led.vinkel : this._vinkel
  }

  get fart() {
    return this.led ? this.led.vinkelfart : this._fart
  }

  get varv() {
    return this.vinkel / (2 * Math.PI)
  }

  get varvPerS() {
    return (this.fart * 60) / (2 * Math.PI)
  }

  // Ett finger håller i ratten OCH drar (ett stilla hållet tryck räknas inte).
  get gripen() {
    return !!(this._grepp && this._grepp.drog)
  }

  get hallen() {
    return this._av ? this._av.aktiv : false
  }

  // ---- pekhändelser (ren logik) ------------------------------------------------------------

  _ned(p) {
    this._grepp = { start: { x: p.x, y: p.y }, t0: nuMs(), drog: false, spar: [], th: null, r: 0 }
    this._prov(p)
    this._on.onNed?.(p)
  }

  _flytta(p) {
    const g = this._grepp
    if (!g) return
    this._prov(p)
    if (!g.drog && Math.hypot(p.x - g.start.x, p.y - g.start.y) > DRAG_TROSKEL) {
      g.drog = true
      this._on.onGrepp?.()
    }
  }

  _slapp(p, o = {}) {
    const g = this._grepp
    this._grepp = null
    if (!g) return
    const tryck = !g.drog && !o.avbruten && nuMs() - g.t0 < TAP_MAX_MS
    if (tryck) this.knuff(this.riktning)
    this._on.onSlapp?.({ tryck, drag: g.drog, avbruten: !!o.avbruten })
  }

  // Ett prov: tidpunkt + hur många radianer fingret gick runt axeln sedan förra provet, viktat med
  // tangentialfarten (nära axeln dämpas bidraget — se huvudet).
  _prov(p) {
    const g = this._grepp
    const dx = p.x - this.x
    const dy = p.y - this.y
    const r = Math.hypot(dx, dy)
    const th = Math.atan2(dy, dx)
    const t = nuMs()
    if (g.th != null) {
      const vikt = klamp((r + g.r) / 2 / this.rMin, 0, 1)
      g.spar.push({ t, tf: g.t, d: lindra(th - g.th) * vikt })
      if (g.spar.length > PROV) g.spar.shift()
    }
    g.th = th
    g.r = r
    g.t = t
  }

  // Fingrets vinkelfart (rad/steg), positiv = medurs. 0 när fingret stått stilla > KAST_ALDER.
  _fingerFart(nu = nuMs()) {
    const g = this._grepp
    if (!g || !g.spar.length) return 0
    const s = g.spar
    const sist = s[s.length - 1]
    if (nu - sist.t > KAST_ALDER) return 0
    let i = s.length - 1
    while (i > 0 && sist.t - s[i - 1].t < KAST_FONSTER) i--
    let sum = 0
    for (let k = i; k < s.length; k++) sum += s[k].d
    const dt = sist.t - s[i].tf
    if (!(dt > 0)) return 0
    return klamp((sum / dt) * MS_TILL_STEG, -this.maxFart, this.maxFart)
  }

  // ---- knuff -------------------------------------------------------------------------------

  // En knuff (ett tryck): fartimpuls som glider `tapVinkel` på en stilla ratt. Läggs på i nästa steg.
  knuff(riktning = this.riktning) {
    if (!this._alive || !this.aktiv) return
    const rikt = riktning < 0 ? -1 : 1
    this._ko += rikt * this._glid(this.tapVinkel)
    this._on.onKnuff?.(rikt)
  }

  // Fartimpulsen som glider `q` rad på en stilla ratt. Impulsen läggs på i SAMMA steg som dämpningen
  // tar den, så glidet är v0/d (inte v0·(1−d)/d): v0 = q·d. Egen integrator: dödzonen äter svansen
  // (≈ stopp/d rad), så den läggs till — annars hamnar ett kvarts varv strax före sin 90°-klick.
  _glid(q) {
    return q * Math.max(this._damp(), 0.005) + (this.led ? 0 : this.stopp)
  }

  _damp() {
    return this.led ? this.led.b.frictionAir || 0 : this.damp
  }

  // ---- ett fast steg -----------------------------------------------------------------------

  // Egen integrator: ett realtidsanrop (ticker). Matter-läget stegas av `phys.beforeStep` i stället.
  uppdatera(dtMs) {
    if (!this._alive || this.led) return
    this._acc += Math.min(dtMs, 100)
    let n = 0
    while (this._acc >= VEV_STEG_MS - 0.5 && n++ < 5) {
      this._acc = Math.max(0, this._acc - VEV_STEG_MS)
      this.steg()
    }
  }

  // EN gång per fast steg. Egen integrator: w ← w·(1 − damp) + dw. Matter: samma dw blir ett
  // vridmoment på leden (matter räknar dämpningen själv — `frictionAir`).
  steg() {
    if (!this._alive) return
    const led = this.led
    const w = this.fart
    const d = this._damp()
    let dw = 0
    if (this._grepp && this._grepp.drog) {
      const wf = this._fingerFart()
      dw = klamp(this.gain * (wf - w) + d * w, -this.acc, this.acc)
    }
    // Knuffen är en egen impuls — ingen del av greppets accelerationstak, men fartens tak gäller.
    dw += this._ko
    this._ko = 0
    // Taket på farten EFTER steget (w' = w·(1−d) + dw).
    const bas = w * (1 - d)
    dw = klamp(dw, -this.maxFart - bas, this.maxFart - bas)

    if (led) {
      if (dw === 0) return
      const b = led.b
      const a = led.a && !led.a.isStatic ? led.a : null
      const S = (b.isStatic ? 0 : b.inverseInertia) + (a ? a.inverseInertia : 0)
      if (!(S > 0)) return
      let tau = dw / (S * VEV_STEG2)
      if (this.maxMoment) tau = klamp(tau, -this.maxMoment, this.maxMoment)
      b.torque += tau
      if (a) a.torque -= tau
      return
    }

    let ny = bas + dw
    if (Math.abs(ny) < this.stopp && dw === 0) ny = 0
    this._fart = ny
    this._vinkel += ny
    this._klicka()
  }

  _klicka() {
    if (!this.klick) return
    const n = Math.floor(this._vinkel / this.klick)
    if (n !== this._klickN) {
      const rikt = n > this._klickN ? 1 : -1
      this._klickN = n
      this._on.onKlick?.(n, rikt)
    }
  }

  // Stanna ratten på stället (nytt varv, ny bana).
  stoppa() {
    this._fart = 0
    this._ko = 0
  }

  // Programmatisk knuff-lös vridning (hjälpen): lägg en fartimpuls som glider `vinkel` rad.
  vrid(vinkel) {
    if (!this._alive) return
    this._ko += this._glid(vinkel)
  }

  // ---- rivning -----------------------------------------------------------------------------

  // Exit-säkert: tar bort lyssnare och fysikkrok UTAN att anropa något spelet lagt in.
  destroy() {
    this._alive = false
    this._av?.()
    this._av = null
    this._avSteg?.()
    this._avSteg = null
    this._grepp = null
    this._on = {}
    this.led = null
  }
}
