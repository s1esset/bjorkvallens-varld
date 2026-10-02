// HÖG (FYSIKPLAN P3) — det barnet samlar blir en hög som SYNS: frukt i en korg, pärlor i en burk.
//
//   const hog = new Hog({ kanter: { x0: -32, x1: 32, y1: 26, hornrund: 14 }, tak: 20, sova: true })
//   ctx.ticker.add(this._tick = (t) => hog.update(t.deltaMS))      // stegar (egen värld) + tonar bort
//   const post = hog.lagg({ cirkel: 7, vy: pearl }, x, y, { x: 0, y: 1.5 })   // sakten faller och lägger sig
//   hog.tom()                  // alla tonar bort (tom(true) = bort på direkten, t.ex. vid ny runda)
//   hog.destroy()              // i spelets destroy()
//
// En LITEN matter-värld per behållare (eller spelets egen via `varld`). Allt sker i behållarens EGET
// koordinatrum: lägg kanter, kroppar och vyer i samma rum (en burk = en Container på burkens plats och
// koordinater relativt den; en korg = designkoordinater om vyerna ligger i en rot som inte flyttats).
//
// Vad biblioteket ordnar åt spelet:
//   • FÅNGVÄGGAR — golv + två sidor (+ ett lock om `y0` anges, + rundade hörn med `hornrund`). Väggarna är
//     tjocka (60 px) och varje post har ett fartTak (14 px/steg), så inget går igenom; blir något ändå
//     utanför lyfts det tillbaka i behållaren (`hog.rymt` räknar de gångerna — i en hel mätning ska det vara 0).
//   • ETT TAK — fler än `tak` poster → den ÄLDSTA tonar bort (`tona` s, alfa på vyn), sedan lyfts den ur
//     världen och alla andra väcks (en sovande hög som mist en bärare hänger annars kvar i luften).
//     `hog.antal` = poster som INTE tonar bort — det är det spelet jämför mot antalet fångade.
//   • SÖMN SOM STABILITET — `sova: true` (egen värld): en hög som vilar står STILL (en vilande hög som darrar
//     ser trasig ut). Mät med `scripts/_hogprobe.mjs`: kryp px/10 s med och utan sömn.
//   • KANTERNA bär `studs` (en statisk kropps studs finns ENBART genom den nyckeln — `restitution` är nollad
//     av matters setStatic) och `friktion`. En post har sin egen `studs` (= kroppens restitution).
//
// Behållaren står STILL (en korg, en burk) → statiska kanter. En behållare som rör sig ska byggas med
// `phys.kinematisk()` (R2) av spelet och dess kanter läggas i `varld` — Hog flyttar inga kanter själv.
//
// ⚠️ Hog river aldrig en vy på egen hand i förväg: `bort(post)` anropas när en post lämnar högen (utan att
// ha tonat klart, vid `tom(true)`, eller efter en uttoning). Förvalet är `vy.destroy({ children: true })`;
// ett spel med gsap-tweens på sina vyer anger egen `bort` som dödar dem först. `destroy()` anropar INTE
// `bort` — spelets rot river vyerna.
import Matter from 'matter-js'
import { PhysicsWorld } from './physics.js'

const { Body, Sleeping } = Matter

const STEG_MS = 1000 / 60

export class Hog {
  // kanter: { x0, x1, y1, y0?, hornrund?, tjocklek?, extra?: [{ x, y, w, h, vinkel }] }
  //   x0..x1 = innerväggarna, y1 = golvets ÖVERYTA, y0 = ett lock (valfritt; utan lock går väggarna 800 px upp).
  //   hornrund = radie för två 45°-fasningar i golvhörnen (en rund burk). extra = egna statiska bitar.
  // tak: mest antal poster som visas (default 30).   sova: sömn i den egna världen (default true).
  // varld: en PhysicsWorld att dela (kanter och poster läggs i den; spelet stegar den, och `sova` rörs inte).
  // tona: sekunder en post tar på sig att försvinna.   studs/friktion: kanternas.
  // fartTak: px/steg per post.   gravitation: px/steg² (egen värld).   bort(post): se ovan.
  constructor({ varld = null, kanter, tak = 30, sova = true, gravitation = 1, tona = 0.45, studs = 0.15, friktion = 0.5, fartTak = 14, bort = null } = {}) {
    if (!kanter || !(kanter.x1 > kanter.x0)) throw new Error('Hog: kanter { x0, x1, y1 } krävs')
    this._levande = true
    this._agd = !varld
    this.fysik = varld || new PhysicsWorld({ gravityY: gravitation, walls: [], sova })
    this.kanter = { ...kanter }
    this.tak = Math.max(1, tak | 0)
    this.tona = Math.max(0.05, tona)
    this._fartTak = fartTak
    this._bort = bort
    this._poster = []
    this._pb = new Map() // kropp -> post
    this._vaggar = []
    this._n = 0
    this.rymt = 0 // poster som tog sig ur behållaren och lyftes tillbaka
    this._bygg(kanter, studs, friktion)
  }

  _bygg({ x0, x1, y1, y0 = null, hornrund = 0, tjocklek = 60, extra = [] }, studs, friktion) {
    const t = tjocklek
    const topp = y0 != null ? y0 : y1 - 800
    const kant = (cx, cy, w, h, vinkel = 0) => {
      const b = this.fysik.rectangle(cx, cy, w, h, { isStatic: true, studs, friktion, label: 'hogkant' })
      if (vinkel) Body.setAngle(b, vinkel)
      this._vaggar.push(b)
      return b
    }
    kant((x0 + x1) / 2, y1 + t / 2, x1 - x0 + t * 2, t) // golv
    kant(x0 - t / 2, (topp + y1 + t) / 2, t, y1 + t - topp) // vänster
    kant(x1 + t / 2, (topp + y1 + t) / 2, t, y1 + t - topp) // höger
    if (y0 != null) kant((x0 + x1) / 2, y0 - t / 2, x1 - x0 + t * 2, t) // lock
    if (hornrund > 0) {
      // 45°-fasning: linjen går från (x0, y1 − r) till (x0 + r, y1); balken ligger BAKOM linjen (utåt).
      const r = hornrund
      const len = Math.hypot(r, r) + 12
      const h = 10
      const n = Math.SQRT1_2
      kant(x0 + r / 2 - n * (h / 2), y1 - r / 2 + n * (h / 2), len, h, Math.PI / 4)
      kant(x1 - r / 2 + n * (h / 2), y1 - r / 2 + n * (h / 2), len, h, -Math.PI / 4)
    }
    for (const e of extra) kant(e.x, e.y, e.w, e.h, e.vinkel || 0)
  }

  // Lägg en post. form: { cirkel: r } | { rekt: [w, h] } | { poly: [sidor, r] }, plus
  //   vy      Pixi-vyn som följer kroppen (läge + vinkel; får inte ha en gsap-tween på x/y/rotation)
  //   studs   postens egen studs (0..1, default 0,2)   friktion (0,4)   densitet   luft (frictionAir 0,01)
  //   uppdatera(vy, body)   anropas efter varje synk (t.ex. för att hålla en glans uppåt)
  //   label   (default 'hogpost')
  // x, y: startläge (i kanternas rum — klämt innanför väggarna och uppskjutet tills det inte överlappar högen).
  // v: { x, y } startfart i px/steg. Returnerar posten { id, body, vy, r, ute } eller null efter destroy().
  lagg(form, x, y, v = null) {
    if (!this._levande) return null
    const { cirkel, rekt, poly, vy = null, studs = 0.2, friktion = 0.4, densitet, luft = 0.01, uppdatera, label = 'hogpost' } = form
    const opt = { restitution: studs, friction: friktion, frictionAir: luft, label }
    if (densitet != null) opt.density = densitet
    const r = cirkel ? cirkel : rekt ? Math.hypot(rekt[0], rekt[1]) / 2 : poly ? poly[1] : 10
    const k = this.kanter
    let px = Math.max(k.x0 + r, Math.min(k.x1 - r, x))
    let py = y
    if (k.y0 != null) py = Math.max(k.y0 + r, py)
    // Skjut upp tills nytt-fött inte överlappar något som redan ligger (ett födelseläge inne i en annan
    // kropp ger en explosiv separation). Högst 60 steg à r/2; sedan får lösaren ta resten.
    for (let i = 0; i < 60; i++) {
      let fri = true
      for (const p of this._poster) {
        const dx = p.body.position.x - px
        const dy = p.body.position.y - py
        const lim = (p.r + r) * 0.96
        if (dx * dx + dy * dy < lim * lim) {
          fri = false
          break
        }
      }
      if (fri) break
      py -= Math.max(2, r / 2)
    }
    const body = cirkel ? this.fysik.circle(px, py, cirkel, opt) : rekt ? this.fysik.rectangle(px, py, rekt[0], rekt[1], opt) : this.fysik.polygon(px, py, poly[0], poly[1], opt)
    if (v) Body.setVelocity(body, { x: v.x || 0, y: v.y || 0 })
    this.fysik.fartTak(body, this._fartTak)
    if (vy) {
      vy.position.set(px, py)
      this.fysik.link(body, vy, uppdatera)
    }
    const post = { id: ++this._n, body, vy, r, ute: false, fade: 0 }
    this._poster.push(post)
    this._pb.set(body, post)
    // Taket: den äldsta av dem som inte redan tonar bort.
    while (this.antal > this.tak) {
      const gammal = this._poster.find((p) => !p.ute)
      if (!gammal) break
      gammal.ute = true
    }
    return post
  }

  // Poster som INTE tonar bort — det talet spelet jämför mot antalet fångade (upp till `tak`).
  get antal() {
    let n = 0
    for (const p of this._poster) if (!p.ute) n++
    return n
  }

  // Alla poster som finns i världen (även de som tonar bort).
  get synliga() {
    return this._poster.length
  }

  get poster() {
    return this._poster
  }

  // Högens översta punkt (y, minsta) — golvet om högen är tom. Nytt-fött hamnar ovanför.
  get topp() {
    let m = this.kanter.y1
    for (const p of this._poster) if (!p.ute) m = Math.min(m, p.body.bounds.min.y)
    return m
  }

  // Ligger allt stilla? (sovande, eller farten under 0,05 px/steg)
  get vilar() {
    for (const p of this._poster) {
      const b = p.body
      if (!b.isSleeping && Math.hypot(b.velocity.x, b.velocity.y) > 0.05) return false
    }
    return true
  }

  // Anslag för poster: fn(post, h) när en post (som inte tonar bort) slår i något med minst `minSpeed` px/steg
  // (h = onImpact-handtaget: { speed, styrka, x, y, … }). Går genom physics.js onImpact, så anropet kommer
  // INUTI ett fysiksteg — riv ingen kropp där. Returnerar en avlyssnare att stänga av (destroy() gör det ändå).
  paSlag(fn, { minSpeed = 1.5, maxPerFrame = 4 } = {}) {
    if (!this._levande) return null
    const har = (b) => this._pb.has(b.parent || b)
    return this.fysik.onImpact(
      (h) => {
        for (const b of [h.a, h.b]) {
          const p = this._pb.get(b.parent || b)
          if (p && !p.ute) fn(p, h)
        }
      },
      { minSpeed, maxPerFrame, filter: (a, b) => har(a) || har(b) }
    )
  }

  // Alla poster tonar bort (tom(true) = bort på direkten — en ny runda, ett nytt fält).
  tom(snabbt = false) {
    if (!this._levande) return
    if (snabbt) {
      for (const p of [...this._poster]) this._ta(p, false)
      return
    }
    for (const p of this._poster) p.ute = true
  }

  // Stega (egen värld) och tona bort. Anropas varje bildruta — också när spelet stegar en delad värld
  // (då stegas inte världen här). dt i ms.
  update(deltaMS) {
    if (!this._levande) return
    if (this._agd) this.fysik.update(deltaMS)
    const dt = Math.min(deltaMS || STEG_MS, 100) / 1000
    const k = this.kanter
    for (const p of [...this._poster]) {
      const b = p.body
      // Rymd: något som tog sig ur behållaren (eller blev NaN) lyfts tillbaka i mitten, ovanför högen.
      const { x, y } = b.position
      const ute = !Number.isFinite(x) || !Number.isFinite(y) || x < k.x0 - 2 || x > k.x1 + 2 || y > k.y1 + 2 || (k.y0 != null && y < k.y0 - 2)
      if (ute) {
        this.rymt++
        const nx = (k.x0 + k.x1) / 2
        const ny = Math.min(this.topp, k.y1) - p.r * 2
        Body.setPosition(b, { x: nx, y: k.y0 != null ? Math.max(k.y0 + p.r, ny) : ny })
        Body.setVelocity(b, { x: 0, y: 0 })
        Sleeping.set(b, false)
      }
      if (p.ute) {
        p.fade += dt / this.tona
        if (p.vy && !p.vy.destroyed) p.vy.alpha = Math.max(0, 1 - p.fade)
        if (p.fade >= 1) this._ta(p, true)
      }
    }
  }

  _ta(p, vackHogen) {
    const i = this._poster.indexOf(p)
    if (i < 0) return
    this._poster.splice(i, 1)
    this._pb.delete(p.body)
    this.fysik.removeBody(p.body)
    if (vackHogen) for (const q of this._poster) Sleeping.set(q.body, false)
    if (this._bort) this._bort(p)
    else if (p.vy && !p.vy.destroyed) p.vy.destroy({ children: true })
  }

  destroy() {
    if (!this._levande) return
    this._levande = false
    if (this._agd) this.fysik.destroy()
    else {
      for (const p of this._poster) this.fysik.removeBody(p.body)
      for (const w of this._vaggar) this.fysik.removeBody(w)
    }
    this._poster = []
    this._pb.clear()
    this._vaggar = []
    this._bort = null
  }
}
