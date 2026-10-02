// VINDFÄLT — luften som en LUFTHASTIGHET i en avgränsad form (FYSIKPLAN F4).
//
// `PhysicsWorld.setWind` är global och konstant: allt i hela världen får samma knuff, och den
// kan varken ha en källa, en räckvidd eller en riktning som SYNS. `studsa-ner`s fläkt hade en
// egen regional vind (`_fanForce`) och `flugan-pa-nasan` en till (`_vindKraft`) — två handbyggda
// fält med samma tre tal (form, avtagande, styrka). Här är de ETT bibliotek.
//
//   this._vind = new Vindfalt({
//     varld: this._phys,                                  // PhysicsWorld — stegar per fysiksteg SJÄLVT
//     form: { typ: 'band', x: 116, y: 380, rackvidd: 1150, halvhojd: 104 },
//     luft: { x: 110, y: 0 },                             // luftens fart i mitten, px/steg
//     avtag: { langs: 0.6, tvars: 1 },                    // andel av farten som tappas längs/tvärs
//     filter: (b) => b.label === 'ball',                  // vilka kroppar vinden tar i (true | falskt | fångfaktor)
//   })
//   this._vind.flytta(x, y)  ·  this._vind.rikta(vinkel)  ·  this._vind.luft = { x: -110, y: 0 }
//   this._vind.aktiv = false  (eller en funktion `() => bool`, läst varje steg)
//   this._vind.rita(g, { t })                             // luftströmmen SYNS — en vind utan bild är ingen vind
//   ...destroy():                                          this._vind.destroy()
//
// MODELLEN — OCH VARFÖR DEN INTE ÄR EN KRAFT. Vinden är luftens FART `w`, och en kropp känner
// ett motstånd mot sin fart RELATIVT luften: Δv = fa · (w − v) per steg, där `fa` är kroppens
// `frictionAir`. matter drar redan av `fa · v` varje steg (en luft som står still), så det som
// SAKNAS är exakt termen `fa · w` — den lägger Vindfalt på som kraft = massa · speedToAccel(w, fa).
// Följden är den fysik man vill ha utan ett enda handsatt tal:
//   · en kropp driver mot luftens fart (sluthastighet = w), aldrig förbi den;
//   · en lätt kropp (stort `fa`) hinner dit fort och FÖLJER MED, en tung (litet `fa`) SLÄPAR;
//   · `w` är i px/steg, den fart vinden ger — aldrig matters kraftenhet (`speedToAccel`, ~280×).
// Har kroppen `frictionAir` 0 finns ingen koefficient att läsa: då gäller `reservFa` och
// motståndet `−fa·v` läggs på av Vindfalt själv (annars skulle kroppen accelerera förbi luften).
//
// FORMEN (lokala axlar: `langs` längs strömmen från källan, `tvars` tvärs):
//   band  rektangel — `halvhojd` konstant. studsa-ner.
//   kon   som band men `halvhojd + langs · vidgning` (förval 0,42). flugan-pa-nasan, pruttvind.
//   sug   (valfritt, band/kon) luften BAKOM källan dras MOT den:
//         `sug: { rackvidd, halvhojd, del, tvars }` — `del` = sugets styrka som andel av utblåsets.
//         §5.5-kravet: en ren kon täckte 22 av 200 flugpositioner, kon + sug når allt.
//   fn    egen form: `{ typ: 'fn', fn: (x, y) => ({ vx, vy, s }) | null }` — en riktning (vx,vy)
//         och en styrka s (0..1) per punkt; luften = |luft| · s · (vx, vy).
// Strömmens axel är `form.vinkel` (rad, 0 = åt höger) — utelämnad följer den `luft`s riktning.
// Styrkan i en punkt: s = (1 − avtag.langs · langs/rackvidd) · (1 − avtag.tvars · |tvars|/halv).
// Förval: band {langs 1, tvars 1}, kon {langs 1, tvars 0,72}.
//
// TID. `styrka` (0..1+, förval 1) är en reglage-egenskap som spelet får tweena (en fläkt som tar
// fart). `puff: { period, djup, fas }` modulerar den periodiskt (en by som kommer och går).
// `pust(steg, styrka)` lägger en ENSTAKA by ovanpå (sinus-kuvert) — för en synlig vindby som
// annars är avstängd. Alla tider räknas i FYSIKSTEG (1/60 s), aldrig bildrutor — samma takt
// som `Flytvolym`, så en 30-fps-skärm får samma vind som en 60.
//
// Rena tal + matter. Ingen Pixi (rita tar en Graphics du äger), inga tweens, inga timers;
// `destroy()` avregistrerar steget och allt efteråt är en no-op.
import Matter from 'matter-js'
import { speedToAccel } from './physics.js'

const { Body, Composite } = Matter
const TAU = Math.PI * 2

// Egen form: förval per typ. Allt går att skriva över i `form` resp. `avtag`.
const FORMFORVAL = {
  band: { vidgning: 0, avtag: { langs: 1, tvars: 1 } },
  kon: { vidgning: 0.42, avtag: { langs: 1, tvars: 0.72 } },
}

export class Vindfalt {
  // varld     PhysicsWorld (eller allt med `.world` + `beforeStep`). Utan `beforeStep` stegar du
  //           själv: `v.steg()` en gång per FAST steg (aldrig per bildruta).
  // form      se ovan. `x`,`y` = källan (fläktens mitt, munnen).
  // luft      luftens fart i formens mitt, px/steg. Dess RIKTNING styr strömmen om `form.vinkel` saknas.
  // avtag     { langs, tvars } — se ovan. Utelämnat = formens förval.
  // filter    (body) → false/0 = rör inte · true = 1 · tal = fångfaktor (ett segel fångar mer).
  //           Utelämnat = alla dynamiska, icke-sovande kroppar i världen.
  // kroppar   () → lista kroppar att gå igenom i stället för hela världen (billigare i stora världar).
  // aktiv     bool eller () => bool, läst varje steg.
  // reservFa  `frictionAir` att räkna med för en kropp som har 0.
  constructor({ varld = null, form = { typ: 'band' }, luft = { x: 0, y: 0 }, avtag = null, filter = null, kroppar = null, aktiv = true, styrka = 1, puff = null, reservFa = 0.01 } = {}) {
    this._varld = varld
    this._world = varld?.world || null
    this.form = { typ: 'band', x: 0, y: 0, rackvidd: 400, halvhojd: 80, ...form }
    this.luft = { x: luft.x || 0, y: luft.y || 0 }
    this.avtag = avtag
    this.filter = filter
    this.kroppar = kroppar
    this._aktiv = aktiv
    this.styrka = styrka
    this.puff = puff
    this.reservFa = reservFa
    this._alive = true
    this._t = 0 // egen stegklocka (s): +1/60 per fast steg — driver bara puff
    this._pust = null // { kvar, tot, styrka }
    this._ut = { vx: 0, vy: 0, s: 0, ux: 0, uy: 0 } // återanvänd mellan punkter — inget skräp per kropp och steg
    this._av = null
    const sjalv = typeof varld?.beforeStep === 'function'
    if (sjalv) this._av = varld.beforeStep(() => this._steg()) || null
    this._sjalv = !!this._av
  }

  get aktiv() {
    return typeof this._aktiv === 'function' ? !!this._aktiv() : !!this._aktiv
  }
  set aktiv(v) {
    this._aktiv = v
  }

  // Sant när fältet stegar själv (per fysiksteg) och publika `steg()` därför är en no-op.
  get stegarSjalv() {
    return this._sjalv
  }

  // Flytta källan. Formen följer; riktningen rörs inte.
  flytta(x, y) {
    this.form.x = x
    this.form.y = y
    return this
  }

  // Vrid strömmens axel (rad, 0 = åt höger). `null` = följ `luft`s riktning igen.
  rikta(vinkel) {
    this.form.vinkel = vinkel == null ? undefined : vinkel
    return this
  }

  // En enstaka by: `steg` fysiksteg lång, `styrka` i topp. Läggs OVANPÅ `styrka`/`puff` — så ett fält
  // med `styrka: 0` blir en vindby som kommer och går. Anropas den igen börjar en ny by.
  pust(steg = 45, styrka = 1) {
    this._pust = { kvar: steg, tot: steg, styrka }
    return this
  }

  // Hur starkt fältet blåser just nu som tidsfaktor: styrka · puff + en eventuell by.
  get faktor() {
    let m = this.styrka
    const p = this.puff
    if (p && p.period > 0) m *= 1 - (p.djup ?? 0.5) * (0.5 - 0.5 * Math.cos((this._t / p.period) * TAU + (p.fas || 0)))
    const b = this._pust
    if (b) m += b.styrka * Math.sin(Math.PI * (1 - b.kvar / b.tot))
    return m
  }

  // Luftens fart (px/steg) i punkten (x, y) — `{ vx, vy, s }` eller `null` utanför formen / avstängd.
  // `s` = den totala skalfaktorn (form · styrka · puff). Samma tal som kraften bygger på, så en
  // sond, en förhandsbana eller en ritad ström läser exakt det fysiken använder.
  luftVid(x, y) {
    if (!this._alive || !this.aktiv) return null
    const o = { vx: 0, vy: 0, s: 0, ux: 0, uy: 0 }
    return this._vid(x, y, this.faktor, o) ? { vx: o.vx, vy: o.vy, s: o.s } : null
  }

  // Formen ensam (utan styrka/puff/aktiv): `{ s, ux, uy }` = skalfaktor + luftens riktning — för en sond.
  formVid(x, y) {
    const o = { s: 0, ux: 0, uy: 0 }
    return this._form(x, y, o) ? { s: o.s, ux: o.ux, uy: o.uy } : null
  }

  // Medelaccelerationen (px/steg², `{ ax, ay }`) vinden ger en kropp med `frictionAir = fa` (× `fang`) längs en
  // lista punkter `[{x, y}]` — punkter utanför formen räknas som 0. För en FÖRHANDSBANA som bara kan bära ETT
  // tal (`AimLauncher.setPreview({ wind })`): lägg den vindfria banan som punkter och läs medelvärdet.
  // Ignorerar `aktiv` (förhandsbanan ska kunna räknas innan vinden slås på); räknar med `faktor` just nu.
  medelAcc(punkter, fa = this.reservFa, fang = 1) {
    const o = { vx: 0, vy: 0, s: 0, ux: 0, uy: 0 }
    const m = this.faktor
    let ax = 0
    let ay = 0
    for (const p of punkter) {
      if (!this._vid(p.x, p.y, m, o)) continue
      ax += fa * fang * o.vx
      ay += fa * fang * o.vy
    }
    const n = punkter.length || 1
    return { ax: ax / n, ay: ay / n }
  }

  // ---- geometrin -------------------------------------------------------------------------

  // Strömmens enhetsvektor (axeln).
  _axel() {
    const f = this.form
    if (f.vinkel != null) {
      // sin(π) = 1,2e-16, inte 0 — och en axel som är ±1e-16 sned flyttar punkter på axeln över nollgränsen
      const c = Math.cos(f.vinkel)
      const s = Math.sin(f.vinkel)
      return { ux: Math.abs(c) < 1e-12 ? 0 : c, uy: Math.abs(s) < 1e-12 ? 0 : s }
    }
    const l = Math.hypot(this.luft.x, this.luft.y)
    return l > 0 ? { ux: this.luft.x / l, uy: this.luft.y / l } : { ux: 1, uy: 0 }
  }

  // Formens egen styrka och riktning i (x, y) → fyller `o.s` och `o.ux/uy` (riktningen luften har).
  _form(x, y, o) {
    const f = this.form
    if (f.typ === 'fn') {
      const r = f.fn?.(x, y)
      if (!r || !(r.s > 0)) return false
      o.s = r.s
      o.ux = r.vx
      o.uy = r.vy
      return true
    }
    const ff = FORMFORVAL[f.typ] || FORMFORVAL.band
    const ax = this._axel()
    const ux = ax.ux
    const uy = ax.uy
    const dx = x - f.x
    const dy = y - f.y
    const langs = dx * ux + dy * uy
    const tvars = Math.abs(dx * -uy + dy * ux)
    if (langs >= 0) {
      if (langs > f.rackvidd) return false
      const vid = f.vidgning ?? ff.vidgning
      const halv = f.halvhojd + langs * vid
      if (tvars > halv) return false
      const av = this.avtag || ff.avtag
      const a = 1 - (av.langs ?? ff.avtag.langs) * (langs / f.rackvidd)
      const b = 1 - (av.tvars ?? ff.avtag.tvars) * (tvars / halv)
      const s = a * b
      if (!(s > 0)) return false
      o.s = s
      o.ux = ux
      o.uy = uy
      return true
    }
    // Sug: luften bakom källan strömmar MOT den.
    const sug = f.sug
    if (!sug) return false
    const bak = -langs
    if (bak > sug.rackvidd) return false
    const halv = sug.halvhojd ?? f.halvhojd * 1.25
    if (tvars > halv) return false
    const stvars = dx * -uy + dy * ux // signerad: vektorn mot källan är (bak, −tvars) i lokala axlar
    const s = (1 - bak / sug.rackvidd) * (1 - (tvars / halv) * (sug.tvars ?? 0.55)) * (sug.del ?? 0.6)
    if (!(s > 0)) return false
    const d = Math.hypot(bak, stvars) || 1
    o.s = s
    // lokalt (bak, −stvars)/d → världen: u·(bak/d) + n·(−stvars/d), n = (−uy, ux)
    o.ux = ux * (bak / d) + -uy * (-stvars / d)
    o.uy = uy * (bak / d) + ux * (-stvars / d)
    return true
  }

  // Luftens fart i punkten, med tidsfaktorn `m` → fyller `o`. Utanför formen: false.
  _vid(x, y, m, o) {
    if (!this._form(x, y, o)) return false
    const l = Math.hypot(this.luft.x, this.luft.y)
    const sp = l * o.s * m
    o.vx = sp * o.ux
    o.vy = sp * o.uy
    o.s *= m
    return true
  }

  // ---- steget ----------------------------------------------------------------------------

  // Publik väg för en värld utan `beforeStep`. En fältet som stegar själv ignorerar anropet.
  steg() {
    if (this._sjalv) return
    this._steg()
  }

  _steg() {
    if (!this._alive || !this._world) return
    this._t += 1 / 60
    const m = this.faktor
    const b = this._pust
    if (b && --b.kvar <= 0) this._pust = null
    if (m === 0 || !this.aktiv) return
    const lista = this.kroppar ? this.kroppar() : Composite.allBodies(this._world)
    const o = this._ut
    for (const body of lista) {
      if (!body || body.isStatic || body.isSleeping) continue
      const p = body.position
      if (!isFinite(p.x) || !isFinite(p.y)) continue
      let fang = 1
      if (this.filter) {
        const r = this.filter(body)
        if (!r) continue
        if (typeof r === 'number') fang = r
      }
      if (!this._vid(p.x, p.y, m, o)) continue
      const fa = body.frictionAir
      const vx = o.vx * fang
      const vy = o.vy * fang
      let ax
      let ay
      if (fa > 0) {
        // matter drar `fa·v` själv — här läggs bara `fa·w` till (se filhuvudet).
        ax = speedToAccel(vx, fa)
        ay = speedToAccel(vy, fa)
      } else {
        // Ingen koefficient: hela motståndet (`fa·(w − v)`) räknas här, annars skenar kroppen.
        const r = this.reservFa
        ax = speedToAccel(vx - body.velocity.x, r)
        ay = speedToAccel(vy - body.velocity.y, r)
      }
      Body.applyForce(body, p, { x: body.mass * ax, y: body.mass * ay })
    }
  }

  // ---- bilden ----------------------------------------------------------------------------

  // Ritar luftströmmen som `antal` bågar som vandrar utåt längs axeln och tonar bort — en vind
  // utan synlig luft är ingen vind, för ett barn finns den inte. Du äger `g` (en Pixi `Graphics`)
  // och anropar `g.clear()` själv; rita bara när `aktiv`. Gäller band/kon (utblåset, inte sugets
  // sida). `t` = tid i sekunder (spelets egen).
  //   fran/till  avstånd längs axeln där bågarna föds/dör · bag  hur långt kurvan buktar framåt
  //   hojd0/hojd1  bågens halvhöjd som andel av formens vid fasen 0 resp. 1 (0,4 → 1,02)
  // Rita i en färg som SYNS mot bakgrunden: vit på ett cremevitt bräde försvann helt (studsa-ner).
  rita(g, { t = 0, antal = 4, fran = 46, till = null, bag = 30, hojd0 = 0.4, hojd1 = 0.62, farg = 0x5aa9e6, bredd = 7, alpha = 0.5, takt = 0.8 } = {}) {
    const f = this.form
    if (!g || f.typ === 'fn' || !this.aktiv) return
    const ff = FORMFORVAL[f.typ] || FORMFORVAL.band
    const { ux, uy } = this._axel()
    const nx = -uy
    const ny = ux
    const slut = till ?? f.rackvidd
    const vid = f.vidgning ?? ff.vidgning
    for (let i = 0; i < antal; i++) {
      const fas = (t * takt + i / antal) % 1
      const a = fran + fas * (slut - fran)
      const h = (f.halvhojd + a * vid) * (hojd0 + fas * hojd1)
      const al = alpha * (1 - fas) * (1 - fas * 0.7)
      const cx = f.x + ux * a
      const cy = f.y + uy * a
      g.moveTo(cx - nx * h, cy - ny * h)
        .quadraticCurveTo(cx + ux * bag, cy + uy * bag, cx + nx * h, cy + ny * h)
        .stroke({ width: bredd, color: farg, alpha: al, cap: 'round' })
    }
  }

  destroy() {
    this._alive = false
    this._av?.()
    this._av = null
    this._pust = null
    this.filter = null
    this.kroppar = null
    this._world = null
    this._varld = null
  }
}
