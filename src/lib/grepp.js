// grepp.js — FJÄDERGREPP: ta tag i en matter-kropp med ett finger (FYSIKPLAN G1).
//
// Två spel hade varsin lösning på samma sak — popcornkalasets `Karl` (`drivPunkt` + handen med
// accelerationstak) och leksakslådans center-grepp (`STYR_K` + fartstak per leksak). Det här är
// biblioteket under båda. `Karl` importerar `drivPunkt` härifrån; hylla, vippning och
// handtag är popcornspelets egna regler och stannar i `Karl`.
//
//   const grepp = new Grepp({
//     phys, yta: this._root,                 // yta = gemensam STATIC förälder (K3, lib/pekare.js)
//     hitArea: new Rectangle(0, 0, 1280, 720), // bara om ytan saknar träffbar geometri (tap-tap!)
//     kroppar: () => this._leksaker.map((l) => l.body),
//     halo: 24,                              // osynlig träffmarginal runt kroppen (P0)
//     punkt: 'fingret' | 'mitten',           // fingret = kroppen hänger där man tog · mitten = r = 0
//     k: 0.35,                               // andel av glappet som stängs per steg (GREPP_K)
//     tak: { dv: 3, v: 22 } | null,          // KRAFTTAK. null = stelt grepp (kontrollarm, farligt)
//     fartTak: (b) => 15,                    // valfritt: högsta draghastighet per kropp (px/steg)
//     kast: false | { max: 18, min: 6 },     // G2: släppfarten blir kastet (px/steg), annars falla
//     tapTap: true,                          // småbarn: tryck kropp → tryck mål → handen bär dit
//     grupp: phys.grupp(),                   // valfritt: kollisionsgrupp (R6) medan kroppen hålls
//     onLyft(b), onSlapp(b, info), onMarkera(b), onAvmarkera(b), onMal(b, p),
//   })
//   …destroy(): grepp.destroy()              // exit-säkert: inga lyssnare/krokar kvar, inga anrop
//
// PER STEG (`phys.beforeStep`, aldrig per bildruta — farten är px/STEG): handen följer fingret med
// ett accelerationstak (`HAND_ACC`, som `karl.js` — ett finger kan gå från 0 till 20 px/steg på en
// bildruta, en hand som bär något tungt gör det inte) och `drivPunkt` ger kroppen den impuls som
// får greppunkten att följa handen, med rätt EFFEKTIV massa och KRAFTTAK.
//
// ⚠️ GREPPET ÄR INTE ETT matter-`Constraint`. Det skenar när r²·m/I > ~1: villkoret räknar
// vridningen som r×F·m/I utan r²-termen i den effektiva massan, så korrektionen skjuter ÖVER
// (grytan snurrade 166 000°). `_greppprobe` mäter det med en kontrollarm som SKA skena vid 3,0.
//
// ⚠️ KRAFTTAKET är inte valfritt i praktiken: ett stelt grepp mot något stillastående ger obegränsad
// impuls — grytan trycktes genom bordet eller sköts iväg i 56 px/steg. Förvalet är `TAK_FORVAL`.
//
// ⚠️ EN DRIVEN KROPP ÄR EN MURBRÄCKA. Handen bryr sig inte om kontakter, så en buren kropp knuffar
// bort allt i sin väg. Vill du att den slinker förbi något: `grupp` (sätts på FÖRÄLDERN — matters
// bredfas läser inte delarnas filter — och återställs vid släpp).
//
// TAP-TAP (småbarn, P0 — drag är svårt före ~4 år): första trycket MARKERAR kroppen (`onLyft` vid
// själva nedtrycket = vippning + ljud < 100 ms, `onMarkera` när det visade sig vara ett tryck),
// andra trycket sätter ett MÅL (`onMal` kan snäppa/neka det) och den osynliga handen bär dit i
// begränsad fart (`barFart`, `HAND_ACC`) — ALDRIG en teleport. Tryck på den markerade kroppen igen
// avmarkerar; tryck på en annan kropp byter. Kommer den inte fram (fastnar) släpps den efter
// `barStall` steg utan framsteg — taket på hur mycket som kan gå fel.
//
// Ren logik utan Pixi: pekhändelserna går genom `pekGrepp` (lib/pekare.js, bara `on/off/toLocal`),
// så hela klassen prövas i Node med en falsk yta (`scripts/_greppprobe.mjs`).
import Matter from 'matter-js'
import { pekGrepp } from './pekare.js'
import { Pekspar, kastSteg } from './pekspar.js'

const { Body, Sleeping, Vertices } = Matter

// Hur stor del av glappet mellan hand och greppunkt som stängs per steg.
export const GREPP_K = 0.35
// Handens accelerationstak (px/steg²).
export const HAND_ACC = 0.8
// Krafttakets förval: punktens fartändring per steg högst `dv`, och farten den dras mot högst `v`
// (= popcornkalasets `GRYTA.greppTak`, uppmätt att hålla grytan på bordet och i bild).
export const TAK_FORVAL = { dv: 3, v: 22 }
// Rörelse (px) innan ett tryck räknas som ett DRAG och inte ett tryck (som DragController).
const DRAG_TROSKEL = 12

const rot = (x, y, a) => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: x * c - y * s, y: x * s + y * c }
}

// PUNKTGREPPET: ge kroppen den impuls i punkten `r` (världsriktad förskjutning från
// tyngdpunkten) som får punkten att följa handen `h` = { x, y, vx, vy } — handens fart plus en
// andel av glappet. Löser 2×2-systemet Δv_punkt = K·J med K = (1/m)·I₂ + (1/I)·r⊥r⊥ᵀ, alltså
// rätt effektiv massa (se huvudet om varför det inte är ett matter-Constraint). Flyttad hit ur
// `popcornkalaset/karl.js` (G1); `karl.js` re-exporterar den.
//
// `tak` = { dv, v } (valfritt): greppet blir en fjäder med KRAFTTAK. Punktens fartändring per
// steg högst `dv`, och den fart den dras mot högst `v`. Utan tak är greppet stelt: ett kärl som
// hålls mot bordet får då hur stor impuls som helst, och grytan trycktes genom bordet och golvet
// eller sköts iväg i 56 px/steg (`_popcorngast`, ägarens "flyger iväg utanför skärmen").
export function drivPunkt(b, r, h, k = GREPP_K, tak = null) {
  const w = b.angularVelocity
  let mx = h.vx + (h.x - (b.position.x + r.x)) * k
  let my = h.vy + (h.y - (b.position.y + r.y)) * k
  if (tak?.v) {
    const m = Math.hypot(mx, my)
    if (m > tak.v) { mx *= tak.v / m; my *= tak.v / m }
  }
  let dvx = mx - (b.velocity.x - w * r.y)
  let dvy = my - (b.velocity.y + w * r.x)
  if (tak?.dv) {
    const d = Math.hypot(dvx, dvy)
    if (d > tak.dv) { dvx *= tak.dv / d; dvy *= tak.dv / d }
  }
  const im = b.inverseMass
  const ii = b.inverseInertia
  const k11 = im + ii * r.y * r.y
  const k12 = -ii * r.x * r.y
  const k22 = im + ii * r.x * r.x
  const det = k11 * k22 - k12 * k12
  if (det <= 1e-12) return
  const jx = (k22 * dvx - k12 * dvy) / det
  const jy = (-k12 * dvx + k11 * dvy) / det
  Body.setVelocity(b, { x: b.velocity.x + jx * im, y: b.velocity.y + jy * im })
  Body.setAngularVelocity(b, w + ii * (r.x * jy - r.y * jx))
}

// HANDEN ett fast steg: rör `h` = { x, y, vx, vy } mot `mal` med högst `maxFart` och ändrar farten
// högst `acc` per steg. Den ACCELERERAR och BROMSAR mjukt (farten mot målet är den man hinner
// bromsa ifrån, √(2·a·d)) — samma hand som `Karl.steg`, och ingen teleport: en kropp som flyttas
// med `setPosition(…, true)` bär farten kvar för alltid (CLAUDE.md).
export function handSteg(h, mal, { maxFart = 22, acc = HAND_ACC } = {}) {
  const dx = mal.x - h.x
  const dy = mal.y - h.y
  const d = Math.hypot(dx, dy)
  const fart = Math.min(maxFart, Math.sqrt(2 * acc * d))
  let vx = d > 1e-6 ? (dx / d) * fart : 0
  let vy = d > 1e-6 ? (dy / d) * fart : 0
  const ax = vx - h.vx
  const ay = vy - h.vy
  const a = Math.hypot(ax, ay)
  if (a > acc) {
    vx = h.vx + (ax / a) * acc
    vy = h.vy + (ay / a) * acc
  }
  if (d < 0.5 && Math.hypot(vx, vy) < acc) {
    h.x = mal.x
    h.y = mal.y
    vx = 0
    vy = 0
  }
  h.vx = vx
  h.vy = vy
  h.x += vx
  h.y += vy
}

// Närmaste punkt på en kropps yta (delarna om den är sammansatt) och avståndet dit; 0 om punkten
// ligger INUTI. Matters `vertices` är världskoordinater och följer kroppen.
export function narmasteYta(b, p) {
  const delar = b.parts.length > 1 ? b.parts.slice(1) : [b]
  let bast = Infinity
  let pt = null
  for (const d of delar) {
    const v = d.vertices
    if (Vertices.contains(v, p)) return { d: 0, x: p.x, y: p.y }
    for (let i = 0; i < v.length; i++) {
      const a = v[i]
      const c = v[(i + 1) % v.length]
      const ex = c.x - a.x
      const ey = c.y - a.y
      const l2 = ex * ex + ey * ey
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2)) : 0
      const qx = a.x + ex * t
      const qy = a.y + ey * t
      const dd = Math.hypot(p.x - qx, p.y - qy)
      if (dd < bast) { bast = dd; pt = { x: qx, y: qy } }
    }
  }
  return pt ? { d: bast, x: pt.x, y: pt.y } : { d: Infinity, x: p.x, y: p.y }
}

export class Grepp {
  constructor({
    phys, yta, kroppar, hitArea = null, halo = 24, punkt = 'fingret', k = GREPP_K, tak = TAK_FORVAL,
    fartTak = null, handFart = 22, handAcc = HAND_ACC, kast = false, tapTap = false, barFart = 9,
    barStall = 90, grupp = null, vinkelDamp = null, onLyft, onSlapp, onMarkera, onAvmarkera, onMal,
  } = {}) {
    this.phys = phys
    this.yta = yta
    this._kroppar = kroppar
    this.halo = halo
    this.punkt = punkt
    this.k = k
    this.tak = tak
    this.fartTak = fartTak
    this.handFart = handFart
    this.handAcc = handAcc
    this.kast = kast ? { max: 18, min: 6, ...kast } : false
    this.tapTap = tapTap
    this.barFart = barFart
    this.barStall = barStall
    this.grupp = grupp
    this.vinkelDamp = vinkelDamp
    this._on = { onLyft, onSlapp, onMarkera, onAvmarkera, onMal }

    this._alive = true
    this._h = null // { b, rLok, off, hand, grupp0 } — kroppen i fingret
    this._fing = null // fingrets läge (ytans lokala = fysikens koordinater)
    this._start = null
    this._drog = false
    this._spar = new Pekspar()
    this._mark = null // markerad kropp (tap-tap)
    this._bar = null // { b, hand, mal, steg, bast, utanFramsteg } — handen bär kroppen dit

    this._avSteg = phys?.beforeStep?.(() => this.steg())
    this._av = yta
      ? pekGrepp(yta, {
          hitArea,
          traff: (p) => this._traff(p),
          ned: (p, mal) => this.tryckNed(p, mal),
          flytta: (p) => this.tryckFlytta(p),
          slapp: (p, mal, o) => this.tryckUpp(p, mal, o),
        })
      : null
  }

  // ---- läsning -----------------------------------------------------------------------------

  get hallen() {
    return this._h ? this._h.b : null
  }

  get markerad() {
    return this._mark
  }

  get bar() {
    return this._bar ? this._bar.b : null
  }

  get aktiv() {
    return !!this._h
  }

  _lista() {
    const l = typeof this._kroppar === 'function' ? this._kroppar() : this._kroppar
    return l || []
  }

  // Vilken kropp (om någon) ligger under p — inom `halo` px från ytan. Den översta (senast i
  // listan) vinner när flera träffas; annars den närmaste. Statiska kroppar går aldrig att ta.
  _hitta(p) {
    let bast = null
    for (const b of this._lista()) {
      if (!b || b.isStatic) continue
      const n = narmasteYta(b, p)
      if (n.d > this.halo) continue
      if (!bast || n.d <= bast.n.d) bast = { b, n } // lika nära → den senare (översta) vinner
    }
    return bast
  }

  // pekGrepp-vakten: en kropp, eller (när tap-tap har en markerad/buren kropp) ett TOMT tryck som
  // kan bli ett mål. Falsy = trycket ignoreras helt.
  _traff(p) {
    if (!this._alive) return null
    const h = this._hitta(p)
    if (h) return h
    if (this.tapTap && (this._mark || this._bar)) return { tom: true }
    return null
  }

  // ---- pekhändelser (ren logik — prövas utan Pixi) -----------------------------------------

  tryckNed(p, mal) {
    if (!this._alive) return
    this._start = { x: p.x, y: p.y }
    this._fing = { x: p.x, y: p.y }
    this._drog = false
    this._spar.rensa()
    this._spar.lagg(performance.now(), p.x, p.y)
    if (!mal || mal.tom) {
      this._h = null
      return
    }
    this._ta(mal.b, p, mal.n)
    this._on.onLyft?.(mal.b)
  }

  tryckFlytta(p) {
    if (!this._alive) return
    this._fing = { x: p.x, y: p.y }
    if (this._start && !this._drog && Math.hypot(p.x - this._start.x, p.y - this._start.y) > DRAG_TROSKEL) this._drog = true
    this._spar.lagg(performance.now(), p.x, p.y)
  }

  tryckUpp(p, mal, o = {}) {
    if (!this._alive) return
    const drog = this._drog
    const h = this._h
    this._h = null
    this._fing = null
    this._start = null
    this._drog = false
    if (!mal || mal.tom || !h) {
      // Tomt tryck: andra trycket i tap-tap sätter ett mål. Ett drag eller en avbruten pekning gör det inte.
      if (mal?.tom && !drog && !o.avbruten) this._satMal(p)
      return
    }
    const b = h.b
    this._aterstall(h)
    if (this.vinkelDamp != null) Body.setAngularVelocity(b, b.angularVelocity * this.vinkelDamp)

    if (this.tapTap && !drog && !o.avbruten) {
      // Ett TRYCK: markera (eller avmarkera/byt).
      if (this._mark === b) this._avmarkera()
      else {
        this._avmarkera()
        this._mark = b
        this._on.onMarkera?.(b)
      }
      this._on.onSlapp?.(b, { tryck: true, kast: null })
      return
    }
    // Ett drag: släpp, och kasta om fingret hade fart.
    if (this.tapTap) this._avmarkera()
    let kast = null
    if (this.kast && !o.avbruten) {
      const s = kastSteg(this._spar.fart(), this.kast.max)
      if (s && s.fart >= this.kast.min) {
        Body.setVelocity(b, { x: s.vx, y: s.vy })
        kast = s
      }
    }
    this._on.onSlapp?.(b, { tryck: false, kast })
  }

  // Programmatiskt släpp (spelet stänger kontrollen mitt i ett drag): som ett avbrott, aldrig kast.
  slappa() {
    if (this._av?.aktiv) this._av.slappa()
    else if (this._h) {
      const h = this._h
      this._h = null
      this._aterstall(h)
    }
  }

  // ---- tap-tap -----------------------------------------------------------------------------

  _avmarkera() {
    const m = this._mark
    if (!m) return
    this._mark = null
    this._on.onAvmarkera?.(m)
  }

  _satMal(p) {
    const b = this._bar ? this._bar.b : this._mark
    if (!b) return
    let m = { x: p.x, y: p.y }
    const v = this._on.onMal?.(b, p)
    if (v === false) return
    if (v && Number.isFinite(v.x)) m = { x: v.x, y: v.y }
    this._mark = null
    this._on.onAvmarkera?.(b)
    if (b.isSleeping) Sleeping.set(b, false)
    const hand = this._bar && this._bar.b === b ? this._bar.hand : { x: b.position.x, y: b.position.y, vx: b.velocity.x, vy: b.velocity.y }
    const d = Math.hypot(m.x - b.position.x, m.y - b.position.y)
    this._bar = { b, hand, mal: m, steg: 0, bast: d, utanFramsteg: 0, grupp0: this._bar?.grupp0 }
    if (this.grupp != null && this._bar.grupp0 === undefined) {
      const par = b.parent || b
      this._bar.grupp0 = par.collisionFilter.group
      par.collisionFilter.group = this.grupp
    }
  }

  _slutaBar(framme) {
    const bar = this._bar
    if (!bar) return
    this._bar = null
    if (bar.grupp0 !== undefined) (bar.b.parent || bar.b).collisionFilter.group = bar.grupp0
    this._on.onSlapp?.(bar.b, { tryck: false, kast: null, framme, tapTap: true })
  }

  // ---- greppet -----------------------------------------------------------------------------

  _ta(b, p, n) {
    // Ett tryck på en annan kropp avbryter en pågående bärning (handen släpper den).
    if (this._bar) this._slutaBar(false)
    if (b.isSleeping) Sleeping.set(b, false)
    // Greppunkten: 'fingret' = där man tog (närmaste yta om fingret ligger i halon), 'mitten' = r = 0.
    const g = this.punkt === 'mitten' ? { x: b.position.x, y: b.position.y } : { x: n.x, y: n.y }
    const rv = { x: g.x - b.position.x, y: g.y - b.position.y }
    const rLok = rot(rv.x, rv.y, -b.angle)
    // Handen börjar i greppunkten med PUNKTENS fart — en kropp som redan rör sig tvärbromsas inte.
    const w = b.angularVelocity
    const hand = { x: g.x, y: g.y, vx: b.velocity.x - w * rv.y, vy: b.velocity.y + w * rv.x }
    const par = b.parent || b
    const h = { b, rLok, off: { x: g.x - p.x, y: g.y - p.y }, hand, grupp0: undefined }
    if (this.grupp != null) {
      h.grupp0 = par.collisionFilter.group
      par.collisionFilter.group = this.grupp
    }
    this._h = h
    // Tryck på kroppen som markerats tidigare avmarkeras vid släpp (se tryckUpp), inte här.
  }

  _aterstall(h) {
    if (h.grupp0 !== undefined) (h.b.parent || h.b).collisionFilter.group = h.grupp0
  }

  _finns(b) {
    const l = this.phys?.world?.bodies
    return !l || l.includes(b) || (b.parent && l.includes(b.parent))
  }

  _tak(b) {
    if (!this.fartTak) return this.tak
    const v = this.fartTak(b)
    return v ? { ...(this.tak || {}), v } : this.tak
  }

  // EN gång per fast steg (phys.beforeStep).
  steg() {
    if (!this._alive) return
    const h = this._h
    if (h) {
      const b = h.b
      if (!this._finns(b)) {
        this._h = null
        return
      }
      if (b.isSleeping) Sleeping.set(b, false)
      const f = this._fing
      if (f) {
        handSteg(h.hand, { x: f.x + h.off.x, y: f.y + h.off.y }, { maxFart: this.fartTak ? this.fartTak(b) || this.handFart : this.handFart, acc: this.handAcc })
        const r = rot(h.rLok.x, h.rLok.y, b.angle)
        drivPunkt(b, r, h.hand, this.k, this._tak(b))
        if (this.vinkelDamp != null) Body.setAngularVelocity(b, b.angularVelocity * this.vinkelDamp)
      }
    }
    const bar = this._bar
    if (bar) this._barSteg(bar)
  }

  // Den osynliga handen bär kroppen (tap-tap). r = 0: kroppen bärs i sin mitt, en ren förflyttning.
  _barSteg(bar) {
    const b = bar.b
    if (!this._finns(b)) {
      this._bar = null
      return
    }
    if (b.isSleeping) Sleeping.set(b, false)
    const max = this.fartTak ? Math.min(this.barFart, this.fartTak(b) || this.barFart) : this.barFart
    handSteg(bar.hand, bar.mal, { maxFart: max, acc: this.handAcc })
    drivPunkt(b, { x: 0, y: 0 }, bar.hand, this.k, this._tak(b))
    if (this.vinkelDamp != null) Body.setAngularVelocity(b, b.angularVelocity * this.vinkelDamp)
    bar.steg++
    const d = Math.hypot(bar.mal.x - b.position.x, bar.mal.y - b.position.y)
    // Framme: kroppen nära målet och handen stilla.
    if (d < 6 && Math.hypot(bar.hand.vx, bar.hand.vy) < this.handAcc) {
      this._slutaBar(true)
      return
    }
    // Fastnat: inget framsteg på `barStall` steg (något i vägen) — släpp, aldrig ett evigt grepp.
    if (d < bar.bast - 1) {
      bar.bast = d
      bar.utanFramsteg = 0
    } else if (++bar.utanFramsteg > this.barStall) this._slutaBar(false)
  }

  // ---- rivning -----------------------------------------------------------------------------

  // Exit-säkert: tar bort lyssnare och fysikkrok UTAN att anropa något spelet lagt in.
  destroy() {
    this._alive = false
    this._av?.()
    this._av = null
    this._avSteg?.()
    this._avSteg = null
    if (this._h) this._aterstall(this._h)
    if (this._bar && this._bar.grupp0 !== undefined) (this._bar.b.parent || this._bar.b).collisionFilter.group = this._bar.grupp0
    this._h = null
    this._bar = null
    this._mark = null
    this._fing = null
    this._on = {}
    this.phys = null
  }
}
