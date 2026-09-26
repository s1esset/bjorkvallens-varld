// POPCORNKALASET — häll majskorn i grytan, vrid upp värmen, lyssna när det poppar, och häll
// popcornen i gästernas skålar. Småbarn 3–5 år, fliken Fysik. Plan och mätningar:
// `docs/games/popcornkalaset.md`.
//
// Ägarens krav (2026-09-25): barnet LUTAR OCH HÄLLER SJÄLV, med fysik — ingenting häller åt
// det. Därför är grytan och påsen riktiga kroppar som barnet bär (`karl.js`):
//
//   GRYTAN (ägarens design 2026-09-26, efter "de osynliga barriärerna gör att grytan flyger
//   iväg"): två SIDOHANDTAG, inga osynliga spärrar.
//     ta i själva grytan → den bärs stadigt dit fingret drar
//     släpp               → den landar där den är — t.ex. på en skål
//     ta i ett handtag    → den lyfts lugnt och tippar i lagom takt; det rinner ut på den
//                           BORTRE sidan (`_popcornhandtag` H2: på skålen → ~90 % i den skålen)
//   PÅSEN (en gest): ta tag var som helst → den bärs upprätt; över grytan vilar den på en
//     osynlig hylla, tryck vidare nedåt → den lutar och häller (`_popcornhall`)
//   tap-reserven    → tryck på grytan, tryck på en skål: grytan FLYTTAS dit och ställs ned,
//                     häller aldrig
//
// Poppen: värmefältet (`lib/varme.js`) grader varje korn mot en slumpad tröskel; kornet blir
// en mjuk kropp (`lib/mjukkropp.js`) som växer på 11 fasta steg (receptet ur `_poppprobe`) och
// sedan ett stelt popcorn. Ingen ljudspärr — varje popp hörs (ägarens val efter `_poppdemo`),
// spelat med `audio.sample('popp')`, aldrig `sfx` (30 ms-golvet hade tystat hälften).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, Composite } from '../../lib/physics.js'
import { Mjukkropp } from '../../lib/mjukkropp.js'
import { Varmefalt } from '../../lib/varme.js'
import { puff, sparkle, pop, wiggle, ripple } from '../../lib/feedback.js'
import { logDrag } from '../../lib/gamelog.js'
import { bage } from '../../lib/form.js'
import { Karl, drivPunkt } from './karl.js'
import { byggSkal, iSkal, paseHylla } from './fysik.js'
import { GOLV, BANK, SPIS, REGLAGE, PASE, GRYTA, LOCK, BORD, SKAL, POPCORN, KORN, FULL_SKAL } from './matt.js'
import { ritaRum, ritaPlatta, ritaReglage, ritaGryta, ritaLock, ritaPase, ritaSkal, ritaKorn, popcornForm, ritaPopcorn, ritaPopcornMjuk } from './konst.js'
import { dragGaster, skapaGast } from './gaster.js'

const STEG_MS = 1000 / 60
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Hur många korn i påsen per fyllning, och hur många "farmorskorn" (poppar aldrig) per fyllning.
const KORN_PER_PASE = 32
const FARMOR_PER_PASE = 2
// Poppen (receptet ur `_poppprobe`: ≤ 8 steg vänder ringen ut och in för gott; 10–12 steg från
// ×0,35 håller över hela spannet 10–16 punkter × överskjut 1–1,3).
const POPP_START = 0.35
const POPP_STEG = 11
const POPP_OVER = 1.15
const POPP_LANDA = 30
// Taket på samtidigt poppande mjuka kroppar (B0, `_popcornomrit`: 0,5–0,85 ms per kropp och
// bildruta vid CPU ×4 — 8 st = +3,9 ms, 16 st = +10,2 ms av 16,7). Kornen över taket väntar —
// osynligt, kaskaden är ändå slumpad.
const MAX_SAMTIDIGA_POPP = 8
// Ett jättepopcorn ungefär var 40:e.
const JATTE_CHANS = 1 / 40
// Brynandet (B9): från steg 8 grader popcorn som ligger kvar på plattan mot brunt.
const BRAND_FRAN = 8
// Idle-påminnelse (P0 småbarn ~6 s).
const IDLE_S = 6.5
// Värmereglagets toner — stämd pentaton, ett hack = ett steg uppåt.
const PENTA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047]
const SKAL_FARG = [0xe8505b, 0x3f8fd8, 0xf2b53a]

// Vart påsen och grytan står hemma.
const GRYTA_HEM = { x: SPIS.x, y: SPIS.yta - GRYTA.golv - GRYTA.djup }
const PASE_HEM = { x: PASE.x, y: BANK.yta - PASE.golv - PASE.djup }
// Lockets krok på köksväggen, ovanför påsen.
const LOCK_KROK = { x: 118, y: 292 }

export default {
  id: 'popcornkalaset',
  titleSv: 'Popcornkalaset',
  icon: '🍿',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'popcornkalaset',
  voiceIntro: 'Häll majskornen i grytan!',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._rng = Math.random
    this._t = 0
    this._idle = 0
    this._steg = 0 // värmereglaget 0..10
    this._korn = [] // { id, body, view, troskel, farmor }
    this._pop = [] // { id, body, view, mjuk, g, n, k, brand, seed, skal }
    this._nextId = 1
    this._full = [false, false, false]
    this._batch = { sagtVarme: false, sagtPopp: false, sagtLuta: false, sagtLock: false, sagtKnaprigt: false }
    this._finish = false
    this._grepp = null // { typ: 'gryta'|'pase'|'lock'|'knopp', id, x0, y0, t0, flyttat }
    this._vald = null // 'gryta' | 'pase' — tap-reservens val
    this._varme = new Varmefalt({ uppvarmning: 2.2, avsvalning: 1.2 })

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._byggScen(ctx)
    this._byggFysik()
    this._byggInput(ctx)
    this._nyaGaster(ctx)
    this._fyllPase()

    this._tick = (ticker) => this._update(ctx, ticker.deltaMS)
    ctx.ticker.add(this._tick)
    if (import.meta.env?.DEV) window.__popcorn = this._dev()
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- scenen -----------------------------------------------------------------

  _byggScen(ctx) {
    const R = this._root
    this._rum = ritaRum()
    R.addChild(this._rum.bakgrund)
    // Lockets krok på köksväggen: en mässingskrok som knoppen hänger i.
    const krok = new Graphics()
    const ky = LOCK_KROK.y - LOCK.tjock / 2 - LOCK.knoppR * 2 - 2
    krok.roundRect(LOCK_KROK.x - 14, ky - 30, 28, 12, 6).fill(0xb98b3e)
    krok.moveTo(LOCK_KROK.x, ky - 20).lineTo(LOCK_KROK.x, ky + 4).stroke({ width: 6, color: 0xc99a48, cap: 'round' })
    bage(krok, LOCK_KROK.x + 8, ky + 4, 8, Math.PI, 0, true)
    krok.stroke({ width: 6, color: 0xc99a48, cap: 'round' })
    krok.eventMode = 'none'
    R.addChild(krok)
    this._platta = ritaPlatta()
    R.addChild(this._platta.view)
    this._reglage = ritaReglage()
    R.addChild(this._reglage.view)
    R.addChild(this._rum.soffa)
    this._gastLager = new Container()
    R.addChild(this._gastLager)
    R.addChild(this._rum.bord)

    this._skalBak = new Container()
    this._skalFram = new Container()
    this._skalar = SKAL.map((s, i) => {
      const v = ritaSkal(s, SKAL_FARG[i])
      this._skalBak.addChild(v.bak)
      this._skalFram.addChild(v.fram)
      return v
    })

    // Kärlens bakre halvor → innehållet → kärlens främre halvor, så att kornen syns I grytan.
    this._karlBak = new Container()
    this._innehall = new Container()
    this._karlFram = new Container()
    this._lockLager = new Container()
    R.addChild(this._skalBak, this._karlBak, this._innehall, this._skalFram, this._karlFram, this._lockLager)
    this._jubelLager = new Container()
    this._jubelLager.eventMode = 'none'
    R.addChild(this._jubelLager)

    // Dimningen i finishen ligger över rummet men under tv-skenet och gästerna i ljuset — den
    // läggs ovanpå allt och gästerna lyses upp av tv:n i stället (tvSken ovanpå dimningen).
    this._dimma = new Graphics().rect(-300, -200, 1880, 1120).fill(0x0b1030)
    this._dimma.alpha = 0
    this._dimma.eventMode = 'none'
    R.addChild(this._dimma)
    if (this._rum.tvSken) R.addChild(this._rum.tvSken)

    // Jubellagret: gästen vars skål just blev full kliver fram hit medan den jublar — annars
    // skymde grytan (som hänger över skålen) precis den gäst den belönade (kritikerfynd).
    this._hjalpLager = new Container()
    this._hjalpLager.eventMode = 'none'
    R.addChild(this._hjalpLager)

    for (const c of [this._rum.bakgrund, this._rum.soffa, this._rum.bord, this._platta.view, this._skalBak, this._skalFram, this._karlBak, this._innehall, this._karlFram, this._lockLager, this._gastLager]) {
      c.eventMode = 'none'
      c.interactiveChildren = false
    }
  },

  _byggFysik() {
    const phys = (this._phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: -400, right: 1280, bottom: GOLV } }))
    // Bänken (spisen sitter i den) och soffbordet.
    phys.rectangle((BANK.x0 + BANK.x1) / 2, BANK.yta + 20, BANK.x1 - BANK.x0, 40, { isStatic: true, label: 'bank' })
    phys.rectangle((BORD.x0 + BORD.x1) / 2, BORD.yta + BORD.tjock / 2, BORD.x1 - BORD.x0, BORD.tjock, { isStatic: true, label: 'bord' })
    for (const s of SKAL) byggSkal(phys, s)

    this._gryta = new Karl(phys, { ...GRYTA_HEM, ...GRYTA, label: 'gryta', grupp: -7 })
    this._pase = new Karl(phys, { ...PASE_HEM, ...PASE, label: 'pase', grupp: -7 })
    this._gryta.innehall = []
    this._pase.innehall = []
    // Påsens hylla: fingret drar påsen ned TILL den över grytan, aldrig igenom, och det som trycks
    // under hyllan blir en lutning (`fysik.js`, `karl.js _folj`). Grytan har INGEN hylla
    // (ägarens design 2026-09-26: inga osynliga spärrar) — den häller i sina sidohandtag.
    this._pase.hylla = (x) => paseHylla(this._pase, this._gryta, x)
    this._gryta.rum = this._pase.rum = { x0: 0, x1: 1280 }

    // Locket hänger på sin krok på väggen tills barnet tar det (kornen ska kunna hällas i
    // grytan utan att först lista ut locket). Skapat dynamiskt och SEDAN statiskt, så att
    // det går att väcka (physics.js: annars NaN-position vid setStatic(false)).
    this._lock = phys.rectangle(LOCK_KROK.x, LOCK_KROK.y, LOCK.bredd, LOCK.tjock, { density: 0.003, friction: 0.5, restitution: 0.05, frictionAir: 0.02, label: 'lock' })
    Body.setStatic(this._lock, true)
    this._lockPaKrok(true)
    this._lockHand = null
    this._lockHem = false

    // Kärlens bilder följer kropparna. Konsten är ritad i kärlets LOKALA rum (origo =
    // mynningens mitt); kroppens position är tyngdpunkten, så bilden förskjuts med -com.
    const koppla = (karl, konst) => {
      const bak = new Container()
      const fram = new Container()
      // Bygeln och glöden hör till framsidan — alla delar följer samma kropp.
      for (const [c, del] of [[bak, konst.view.bak], [fram, konst.view.fram], [fram, konst.glod], [fram, konst.handtag ?? konst.bygel]]) {
        if (!del) continue
        del.position.set(-karl._com.x, -karl._com.y)
        c.addChild(del)
      }
      this._karlBak.addChild(bak)
      this._karlFram.addChild(fram)
      phys.link(karl.body, bak)
      phys.link(karl.body, fram)
      return { bak, fram }
    }
    this._grytKonst = ritaGryta()
    this._grytVy = koppla(this._gryta, this._grytKonst)
    this._paseKonst = ritaPase()
    this._paseVy = koppla(this._pase, this._paseKonst)
    this._lockVy = ritaLock()
    this._lockLager.addChild(this._lockVy)
    phys.link(this._lock, this._lockVy)

    // Allt som ska ske i matters takt (handen, poppens tillväxt) — EN gång per fast steg.
    this._avBeforeStep = phys.beforeStep(() => this._fastSteg())

    // Hörbar tyngd: popcorn som landar i en skål, locket som skramlar, kornen i grytan.
    phys.impactAudio(this._ctx.services.audio, { standard: 'tra', minSpeed: 2.2, hardSpeed: 12, vol: 0.12, maxPerFrame: 2, filter: (a, b) => a.label !== 'popcorn' || b.label !== 'popcorn' })
  },

  // ---- påsen och kornen -----------------------------------------------------------

  // Fyller på `antal` korn (en tom påse får en full omgång, en med några kvar toppas upp).
  _fyllPase(antal = KORN_PER_PASE) {
    const p = this._pase
    const farmor = new Set()
    const nFarmor = Math.round((FARMOR_PER_PASE * antal) / KORN_PER_PASE)
    while (farmor.size < nFarmor) farmor.add(Math.floor(this._rng() * antal))
    const forsta = KORN_PER_PASE - antal // de nya läggs OVANPÅ det som redan ligger i påsen
    for (let i = 0; i < antal; i++) {
      // Slumpad plats i påsens nedre del (lokalt rum), kornen lägger sig själva.
      const ly = PASE.djup - 8 - ((i + forsta) % 6) * 9 - Math.floor((i + forsta) / 6) * 2 - this._rng() * 4
      const lx = (this._rng() - 0.5) * (p.innerHalv(ly) * 2 - 14)
      const w = p.varld(lx, ly)
      this._nyttKorn(w.x, w.y, farmor.has(i))
    }
  },

  _nyttKorn(x, y, farmor = false) {
    const id = this._nextId++
    const body = this._phys.circle(x, y, KORN.r, { ...KORN.kropp, label: 'korn' })
    const view = ritaKorn()
    view.rotation = this._rng() * Math.PI * 2
    this._innehall.addChild(view)
    // Tröskeln avgör NÄR kornet smäller — slumpad, så ordningen och takten aldrig blir lika.
    const k = { id, body, view, troskel: 0.55 + this._rng() * 0.45, farmor }
    this._varme.lagg('k' + id, { x, y })
    this._korn.push(k)
    this._gryta.innehall.push(body)
    this._pase.innehall.push(body)
    return k
  },

  _taKorn(k) {
    this._varme.ta('k' + k.id)
    this._phys.removeBody(k.body)
    this._utur(this._gryta.innehall, k.body)
    this._utur(this._pase.innehall, k.body)
    if (!k.view.destroyed) k.view.destroy()
    const i = this._korn.indexOf(k)
    if (i >= 0) this._korn.splice(i, 1)
  },

  _kornIPasen() {
    return this._korn.filter((k) => this._pase.inuti(k.body.position.x, k.body.position.y, 10)).length
  },

  _utur(lista, x) {
    const i = lista.indexOf(x)
    if (i >= 0) lista.splice(i, 1)
  },

  // ---- poppen -------------------------------------------------------------------

  _poppa(k) {
    const ctx = this._ctx
    const { x, y } = k.body.position
    this._taKorn(k)
    const id = this._nextId++
    const jatte = this._rng() < JATTE_CHANS
    const r = POPCORN.r * (jatte ? 1.6 : 0.9 + this._rng() * 0.2)
    const body = this._phys.polygon(x, y, 7, r, { ...POPCORN.kropp, label: 'popcorn' })
    Body.scale(body, POPP_START, POPP_START)
    Body.setAngle(body, this._rng() * Math.PI * 2)
    // Smällen: uppåt ur slumpen. Ungefär var sjätte är en HÅRD smäll som skjuter iväg popcornet
    // (utan lock flyger det ur grytan — med lock lyfter det locket).
    const hard = this._rng() < 0.16
    const vy = -(hard ? 9 + this._rng() * 4 : 2.5 + this._rng() * 4)
    Body.setVelocity(body, { x: (this._rng() - 0.5) * (hard ? 5 : 3), y: vy })
    Body.setAngularVelocity(body, (this._rng() - 0.5) * 0.3)
    const seed = Math.floor(this._rng() * 1e9)
    const m = new Mjukkropp({ w: r * 2, h: r * 1.84, punkter: 16, grav: 0, iter: 6, form: popcornForm(seed) })
    m.skala(POPP_START)
    const g = new Graphics()
    this._innehall.addChild(g)
    const p = { id, body, view: null, mjuk: m, g, n: 0, k: POPP_START, r, brand: 0, seed, skal: -1, jatte }
    this._varme.lagg('p' + id, { x, y })
    this._pop.push(p)
    this._gryta.innehall.push(body)

    ctx.services.audio.sample('popp')
    if (hard || jatte) puff(ctx.fxLayer, x, y - 6, { count: jatte ? 8 : 4, color: 0xfff6dc })
    if (!this._batch.sagtPopp) {
      this._batch.sagtPopp = true
      // Ett UTROP på ögonblicket: köat kommer det för sent (CLAUDE.md, V24).
      if (!ctx.services.voice.talar) ctx.services.voice.say('Lyssna … nu poppar det!')
    }
  },

  // Poppens tillväxt — i matters takt, exakt ett steg per fast steg (mjukkroppsregeln).
  _vaxPopp(p) {
    p.n++
    const n = p.n
    // Den fysiska kroppen växer utan överskjut; den mjuka bilden skjuter över och landar.
    const kFys = n <= POPP_STEG ? POPP_START + (1 - POPP_START) * (1 - (1 - n / POPP_STEG) ** 3) : 1
    if (kFys !== p.k) {
      Body.scale(p.body, kFys / p.k, kFys / p.k)
      p.k = kFys
    }
    const kMjuk = n <= POPP_STEG
      ? POPP_START + (POPP_OVER - POPP_START) * (1 - (1 - n / POPP_STEG) ** 3)
      : POPP_OVER + (1 - POPP_OVER) * Math.min(1, (n - POPP_STEG) / POPP_LANDA)
    p.mjuk.skala(kMjuk)
    p.mjuk.steg(1)
    if (n >= POPP_STEG + POPP_LANDA) this._stelna(p)
  },

  // Poppen är klar: den mjuka kroppen byts mot den färdiga bilden (mjuk BARA under poppen).
  _stelna(p) {
    p.mjuk.destroy?.()
    p.mjuk = null
    if (p.g && !p.g.destroyed) p.g.destroy()
    p.g = null
    const art = ritaPopcorn(p.seed, p.r)
    p.view = art.view
    p.setBrand = art.setBrand
    p.setBrand(p.brand)
    this._innehall.addChild(p.view)
  },

  _taPopcorn(p, { puffa = false } = {}) {
    if (puffa) puff(this._ctx.fxLayer, p.body.position.x, p.body.position.y, { count: 5, color: 0xfff3d0 })
    this._varme.ta('p' + p.id)
    this._phys.removeBody(p.body)
    this._utur(this._gryta.innehall, p.body)
    if (p.g && !p.g.destroyed) p.g.destroy()
    if (p.view && !p.view.destroyed) {
      gsap.killTweensOf(p.view)
      p.view.destroy({ children: true })
    }
    p.mjuk = null
    const i = this._pop.indexOf(p)
    if (i >= 0) this._pop.splice(i, 1)
  },

  // ---- matters takt -----------------------------------------------------------------

  _fastSteg() {
    if (!this._alive) return
    this._gryta.steg()
    this._pase.steg()
    // Locket i fingret: samma punktgrepp som kärlen.
    const lh = this._lockHand
    if (lh) {
      const dx = lh.mx - lh.x
      const dy = lh.my - lh.y
      const d = Math.hypot(dx, dy)
      const k = d > 20 ? 20 / d : 1
      lh.vx = dx * k
      lh.vy = dy * k
      lh.x += lh.vx
      lh.y += lh.vy
      const b = this._lock
      const c = Math.cos(b.angle - lh.a0)
      const s = Math.sin(b.angle - lh.a0)
      drivPunkt(b, { x: lh.rx * c - lh.ry * s, y: lh.rx * s + lh.ry * c }, lh)
      // Locket hålls i knoppen: det vill hänga vågrätt.
      Body.setAngularVelocity(b, b.angularVelocity * 0.8 - b.angle * 0.05)
    }
    for (let i = this._pop.length - 1; i >= 0; i--) {
      const p = this._pop[i]
      if (p.mjuk) this._vaxPopp(p)
    }
  },

  // ---- varje bildruta ----------------------------------------------------------------

  _update(ctx, deltaMS) {
    if (!this._alive) return
    const dt = Math.min(deltaMS, 100) / 1000
    const dtF = Math.min(deltaMS, 100) / STEG_MS
    this._t += dt
    this._phys.update(deltaMS)

    // Värmen. Plattan är en källa bara när reglaget är på; kornen värms av närheten.
    if (this._steg > 0) this._varme.kalla('platta', { x: SPIS.x, y: SPIS.yta - 18, radie: 150, styrka: 0.03 + 0.024 * this._steg })
    else this._varme.taKalla('platta')
    for (const k of this._korn) this._varme.flytta('k' + k.id, k.body.position.x, k.body.position.y)
    for (const p of this._pop) this._varme.flytta('p' + p.id, p.body.position.x, p.body.position.y)
    this._varme.steg(dtF)

    // Kornen: darrar när de är varma, smäller när gradningen når tröskeln.
    let poppar = this._pop.reduce((n, p) => n + (p.mjuk ? 1 : 0), 0)
    let iGrytan = 0
    for (let i = this._korn.length - 1; i >= 0; i--) {
      const k = this._korn[i]
      const b = k.body.position
      const temp = this._varme.temp('k' + k.id)
      const j = temp > 0.25 ? (temp - 0.25) * 3.2 : 0
      k.view.position.set(b.x + (j ? (this._rng() - 0.5) * j : 0), b.y + (j ? (this._rng() - 0.5) * j : 0))
      if (this._gryta.inuti(b.x, b.y, 10)) iGrytan++
      if (!k.farmor && poppar < MAX_SAMTIDIGA_POPP && this._varme.grad('k' + k.id) >= k.troskel) {
        this._poppa(k)
        poppar++
      } else if (b.y > GOLV + 40 || b.x < -100 || b.x > 1380) this._taKorn(k)
    }

    // Popcornen: rita, bryn, räkna.
    const skalN = [0, 0, 0]
    let iGrytanPop = 0
    let mork = 0
    for (const p of this._pop) if (p.brand > 0.7) mork++
    const morkTak = Math.ceil(this._pop.length / 3)
    for (let i = this._pop.length - 1; i >= 0; i--) {
      const p = this._pop[i]
      const b = p.body
      if (p.mjuk) {
        p.g.position.set(b.position.x, b.position.y)
        p.g.rotation = b.angle
        ritaPopcornMjuk(p.g, p.mjuk, p.brand)
      } else if (p.view) {
        p.view.position.set(b.position.x, b.position.y)
        p.view.rotation = b.angle
      }
      // Brynandet (B9): bara det som ligger kvar på den heta plattan, bara på höga steg, och
      // med ett TAK — högst en tredjedel kan bli mörk. Sänkt värme stoppar det direkt.
      if (this._steg >= BRAND_FRAN) {
        const n = this._varme.narhet('p' + p.id)
        if (n > 0.2 && p.brand < 1) {
          const tak = p.brand > 0.7 || mork < morkTak ? 1 : 0.68
          const fore = p.brand
          p.brand = Math.min(tak, p.brand + (this._steg - BRAND_FRAN + 1) * 0.05 * n * dt)
          if (fore <= 0.7 && p.brand > 0.7) {
            mork++
            puff(ctx.fxLayer, b.position.x, b.position.y - 8, { count: 3, color: 0x8d8580 })
          }
          if (p.setBrand && Math.floor(fore * 20) !== Math.floor(p.brand * 20)) p.setBrand(p.brand)
        }
      }
      if (this._gryta.inuti(b.position.x, b.position.y, 20)) iGrytanPop++
      // I en skål? Räknas bara det som ligger STILL (inte det som studsar förbi).
      p.skal = -1
      for (let s = 0; s < SKAL.length; s++) {
        if (iSkal(SKAL[s], b.position.x, b.position.y) && Math.hypot(b.velocity.x, b.velocity.y) < 0.8) {
          p.skal = s
          skalN[s]++
          break
        }
      }
      if (b.position.y > GOLV + 60 || b.position.x < -120 || b.position.x > 1400) this._taPopcorn(p)
    }
    this._skalN = skalN

    this._platta.setGlod(this._steg / 10)
    // Glöden bara när grytan STÅR på plattan (den kan ställas var som helst nu).
    this._grytKonst.glod && (this._grytKonst.glod.alpha = this._gryta.lage === 'fri' && this._grytaPaSpisen() ? this._steg / 10 : 0)

    // Kärl på väg hem: släpp dem på plattan/bänken när handen nått fram.
    // …men först när kärlet hänger VÅGRÄTT: en påse som vippats 149° hann hem före sin egen
    // uppresning, föll på sidan och fylldes sedan på liggande — kornen rann rakt ut.
    const lugn = (k) => Math.abs(k.vinkel) < 0.06 && Math.abs(k.body.angularVelocity) < 0.01
    if (this._grytaPaVagHem && this._gryta.lage === 'park' && this._grytaVia?.length && this._gryta.framme(6) && Math.abs(this._gryta.vinkel) < 0.3) {
      const v = this._grytaVia.shift()
      this._gryta.parkera(v.x, v.y)
    } else if (this._grytaPaVagHem && this._gryta.lage === 'park' && this._gryta.framme(2) && lugn(this._gryta)) {
      this._grytaPaVagHem = false
      this._gryta.lagNer()
    }
    if (this._pasePaVagHem && this._pase.lage === 'park' && this._paseVia?.length && this._pase.framme(6) && Math.abs(this._pase.vinkel) < 0.3) {
      const v = this._paseVia.shift()
      this._pase.parkera(v.x, v.y)
    } else if (this._pasePaVagHem && this._pase.lage === 'park' && this._pase.framme(2) && lugn(this._pase)) {
      this._pasePaVagHem = false
      this._pase.lagNer()
    }

    this._hemOmVilse(ctx)
    this._rostTriggers(ctx, iGrytan, iGrytanPop)
    this._kollaSkalar(ctx, skalN)
    this._gasterTick(ctx, deltaMS)
    this._lockTick(ctx)
    this._underhall(ctx)
    this._idleTick(ctx, dt)
  },

  // Ett kärl som står FRITT någon annanstans än hemma (knuffat av en smäll, ramlat av bänken)
  // och ligger still i en sekund glider hem av sig självt — det ska aldrig behöva letas fram.
  // GRYTAN får stå där barnet ställer den (på en skål, på bänken — ägarens design): den går hem
  // bara om den vält, ramlat på golvet, eller står TOM en stund (då ska nästa omgång poppas).
  _hemOmVilse(ctx) {
    for (const [karl, hem, typ] of [[this._gryta, GRYTA_HEM, 'gryta'], [this._pase, PASE_HEM, 'pase']]) {
      if (karl.lage !== 'fri' || (this._grepp && this._grepp.typ === typ)) {
        karl._vilse = 0
        continue
      }
      const b = karl.body
      const m = karl.varld(0, 0)
      const hemma = Math.abs(m.x - hem.x) < 24 && Math.abs(m.y - hem.y) < 24 && Math.abs(b.angle) < 0.2
      if (hemma || Math.hypot(b.velocity.x, b.velocity.y) > 0.3) {
        karl._vilse = 0
        continue
      }
      let grans = 60
      if (typ === 'gryta') {
        const valt = Math.abs(b.angle) > 0.8 || m.y > BORD.yta - GRYTA.djup
        const tom = !this._pop.some((p) => karl.inuti(p.body.position.x, p.body.position.y, 20)) && !this._korn.some((k) => karl.inuti(k.body.position.x, k.body.position.y, 10))
        if (!valt && !tom) {
          karl._vilse = 0
          continue
        }
        grans = valt ? 60 : 150
      }
      if (++karl._vilse > grans) {
        karl._vilse = 0
        if (typ === 'gryta') this._grytaHem(ctx)
        else this._paseHem(ctx)
      }
    }
  },

  // ---- rösten: instruktionerna följer det barnet faktiskt har gjort ------------------------

  _rostTriggers(ctx, iGrytan, iGrytanPop) {
    const v = ctx.services.voice
    const b = this._batch
    if (!b.sagtVarme && iGrytan >= 8 && this._steg === 0) {
      b.sagtVarme = true
      ctx.narTyst(() => {
        if (this._alive && this._steg === 0) v.say('Dra i reglaget så blir spisen varm!')
      })
    }
    if (!b.sagtLuta && iGrytanPop >= 12 && this._korn.filter((k) => !k.farmor && this._gryta.inuti(k.body.position.x, k.body.position.y, 10)).length <= 2) {
      b.sagtLuta = true
      ctx.narTyst(() => {
        if (this._alive && !this._finish) v.say('Luta grytan över skålen!')
      })
    }
  },

  // ---- skålarna och målet --------------------------------------------------------------

  _kollaSkalar(ctx, skalN) {
    if (this._finish) return
    for (let s = 0; s < SKAL.length; s++) {
      if (this._full[s] || skalN[s] < FULL_SKAL) continue
      this._full[s] = true
      const sk = SKAL[s]
      sparkle(ctx.fxLayer, sk.x, sk.kant - 20, { count: 10 })
      ctx.services.audio.sfx('match')
      const g = this._agare[s]
      this._framJubel(ctx, g)
      const lat = g?.jubla()
      if (!lat && !ctx.services.voice.talar) ctx.services.voice.say('Mums, vad gott!')
      else if (lat) ctx.later(0.9, () => { if (this._alive && !ctx.services.voice.talar) ctx.services.voice.say('Mums, vad gott!') })
      if (this._full.every(Boolean)) ctx.later(1.4, () => this._filmkvall(ctx))
    }
  },

  _framJubel(ctx, g) {
    if (!g?.view || g.view.destroyed) return
    this._jubelLager.addChild(g.view)
    ctx.later(2.6, () => {
      if (this._alive && g.view && !g.view.destroyed && g.view.parent === this._jubelLager) this._gastLager.addChild(g.view)
    })
  },

  // ---- gästerna ------------------------------------------------------------------------

  _nyaGaster(ctx) {
    for (const g of this._gaster || []) g.destroy()
    this._gastLager.removeChildren()
    this._jubelLager.removeChildren()
    const val = dragGaster(this._rng, 3)
    this._gaster = val.map(({ typ, plats }) => {
      const g = skapaGast(typ, plats, { later: ctx.later, audio: ctx.services.audio, rng: this._rng })
      this._gastLager.addChild(g.view)
      g.hungrig()
      return g
    })
    // Varje skål har en ägare (dragGaster lovar minst en per skål); den första som äger den.
    this._agare = SKAL.map((_, s) => this._gaster.find((g) => g.plats.skal === s) || this._gaster[s % this._gaster.length])
    this._nastaMums = this._gaster.map(() => 2 + this._rng() * 3)
  },

  _gasterTick(ctx, deltaMS) {
    const titt = this._gryta.varld(0, 30)
    const titta = Math.floor(this._t * 6) !== Math.floor((this._t - deltaMS / 1000) * 6)
    this._gaster.forEach((g, i) => {
      g.tick(deltaMS)
      if (titta) g.titta(titt.x, titt.y)
      // En gäst vars skål är full mumsar då och då — och tar ibland ett popcorn ur skålen.
      const s = g.plats.skal
      if (!this._full[s] && !this._finish) return
      this._nastaMums[i] -= deltaMS / 1000
      if (this._nastaMums[i] > 0) return
      this._nastaMums[i] = 3 + this._rng() * 3
      g.mumsa()
      const iSkalen = this._pop.filter((p) => p.skal === s && !p.mjuk)
      if (iSkalen.length > 6 && this._rng() < 0.5) {
        const topp = iSkalen.reduce((a, b) => (b.body.position.y < a.body.position.y ? b : a))
        // Ett bränt popcorn: gästen ÄLSKAR det (B9 — brända räknas, aldrig ett misslyckande).
        if (topp.brand > 0.6 && !this._batch.sagtKnaprigt) {
          this._batch.sagtKnaprigt = true
          g.knaprigt()
        }
        this._taPopcorn(topp)
      }
    })
  },

  // ---- locket --------------------------------------------------------------------------

  _lockTick(ctx) {
    const b = this._lock
    // Popcornen lyfte locket av sig själv: ett utrop, en gång per omgång.
    if (!this._lockHand && !this._batch.sagtLock && b.velocity.y < -4.5 && this._gryta.lage === 'fri') {
      this._batch.sagtLock = true
      ctx.services.audio.tone({ freq: 784, dur: 0.12, type: 'triangle', vol: 0.18, slideTo: 988 })
      if (!ctx.services.voice.talar) ctx.services.voice.say('Oj, locket flög!')
    }
    // Hemfärden till kroken: framme → hänger still på kroken igen.
    const h = this._lockHand
    if (h?.hem && Math.hypot(b.position.x - LOCK_KROK.x, b.position.y - LOCK_KROK.y) < 4 && Math.abs(b.angle) < 0.05) {
      this._lockHand = null
      this._lockHem = false
      Body.setAngle(b, 0)
      Body.setPosition(b, LOCK_KROK)
      Body.setVelocity(b, { x: 0, y: 0 })
      Body.setStatic(b, true)
      this._lockPaKrok(true)
    }
    // Ett lock som ramlat av grytan och ligger still någon annanstans går hem till kroken.
    if (!h && !b.isStatic && Math.hypot(b.velocity.x, b.velocity.y) < 0.15 && !this._gryta.inuti(b.position.x, b.position.y, 40)) {
      this._lockStilla = (this._lockStilla || 0) + 1
      if (this._lockStilla > 150) {
        this._lockStilla = 0
        this._lockTillKrok()
      }
    } else this._lockStilla = 0
  },

  // ---- underhåll: påsen fylls på, spill städas -------------------------------------------

  _underhall(ctx) {
    // Påsen fylls på när den är tom och står hemma (mellan omgångarna).
    const iPasen = this._kornIPasen()
    const hemma = this._pase.lage === 'fri' && Math.abs(this._pase.body.position.x - PASE.x) < 30 && Math.abs(this._pase.vinkel) < 0.1
    // En påse med några få korn kvar (fastnade i en vippning) fylls också — med regeln "under 3"
    // stod en påse med 4 korn kvar över grytan för alltid (`_popcornspel`).
    if (iPasen < 10 && hemma && this._korn.length < 60 && !this._finish) {
      this._paseTom = (this._paseTom || 0) + 1
      if (this._paseTom > 90) {
        this._paseTom = 0
        this._fyllPase(KORN_PER_PASE - iPasen)
        const m = this._pase.varld(0, 0)
        sparkle(ctx.fxLayer, m.x, m.y - 10, { count: 6 })
        ctx.services.audio.sfx('soft')
      }
    } else this._paseTom = 0
    // Spill som blir LIGGANDE (korn på golvet, farmorskorn i en skål, popcorn på bänken)
    // försvinner i en liten puff efter en stund. Utan det växte kornen i världen 35 → 55 på två
    // omgångar, och påfyllningen har ett tak — ett barn hade till slut fått en tom påse.
    for (const k of [...this._korn]) {
      const b = k.body
      const iKarl = this._gryta.inuti(b.position.x, b.position.y, 20) || this._pase.inuti(b.position.x, b.position.y, 20)
      k.stilla = !iKarl && Math.hypot(b.velocity.x, b.velocity.y) < 0.15 ? (k.stilla || 0) + 1 : 0
      if (k.stilla > 300) {
        puff(ctx.fxLayer, b.position.x, b.position.y, { count: 3, color: 0xf2c14e })
        this._taKorn(k)
      }
    }
    for (const p of [...this._pop]) {
      if (p.mjuk || p.skal >= 0) continue
      const b = p.body
      p.stilla = !this._gryta.inuti(b.position.x, b.position.y, 30) && Math.hypot(b.velocity.x, b.velocity.y) < 0.15 ? (p.stilla || 0) + 1 : 0
      if (p.stilla > 1500) this._taPopcorn(p, { puffa: true })
    }
    // Tak på popcorn i världen: det äldsta spillet på golvet försvinner i en puff.
    if (this._pop.length > 110) {
      const golv = this._pop.find((p) => p.skal < 0 && !p.mjuk && p.body.position.y > GOLV - 40)
      if (golv) this._taPopcorn(golv, { puffa: true })
    }
  },

  // ---- input ---------------------------------------------------------------------------

  _byggInput(ctx) {
    const R = this._root
    R.eventMode = 'static'
    // Hela ytan tar emot tryck: varje pekning får svar (P0), och SLÄPPET måste nå en
    // gemensam förälder (CLAUDE.md: ett släpp når aldrig ett syskon).
    R.hitArea = new Rectangle(-400, -200, 2080, 1120)
    this._onDown = (e) => this._ned(ctx, e)
    this._onMove = (e) => this._flytta(ctx, e)
    this._onUp = (e) => this._upp(ctx, e)
    R.on('pointerdown', this._onDown)
    R.on('globalpointermove', this._onMove)
    R.on('pointerup', this._onUp)
    R.on('pointerupoutside', this._onUp)

    // Reglagets knappar och knopp: stora träffytor (P0 ≥ 96 px + halo).
    const rg = this._reglage
    for (const [btn, d] of [[rg.minus, -1], [rg.plus, 1]]) {
      btn.eventMode = 'static'
      btn.cursor = 'pointer'
      btn.hitArea = new Rectangle(-REGLAGE.knappR - 24, -REGLAGE.knappR - 24, (REGLAGE.knappR + 24) * 2, (REGLAGE.knappR + 24) * 2)
      btn.on('pointerdown', (e) => {
        e.stopPropagation()
        this._idle = 0
        this._satSteg(ctx, this._steg + d)
        pop(btn, { scale: 1.12 })
      })
    }
    rg.view.eventMode = 'passive'
  },

  _pekpunkt(e) {
    return this._root.toLocal(e.global)
  },

  _ned(ctx, e) {
    if (this._grepp) return // ett finger i taget
    this._idle = 0
    this._hjalpStopp()
    const p = this._pekpunkt(e)
    const t = performance.now()
    const bas = { id: e.pointerId, x0: p.x, y0: p.y, t0: t, flyttat: false }

    // Reglagets knopp och spår: dra värmen.
    if (Math.abs(p.y - REGLAGE.y) < 58 && p.x > REGLAGE.x0 - 40 && p.x < REGLAGE.x1 + 40) {
      this._grepp = { ...bas, typ: 'knopp' }
      this._dragKnopp(ctx, p.x)
      return
    }

    // Tap-reservens andra tryck: något är valt, och det här trycket är målet.
    if (this._vald && this._valjMal(ctx, p)) return

    // Locket (det ligger överst).
    if (this._traffarLock(p)) {
      this._greppaLock(p)
      this._grepp = { ...bas, typ: 'lock' }
      audioGrip(ctx)
      return
    }
    // Det kärl fingret faktiskt RÖR vinner, och vid lika påsen (den ritas ovanpå grytan). Hänger
    // påsen över grytan täcker den grytans bygel: med grytan först tog ett tryck mitt på påsen
    // GRYTAN (`_popcornnaiv` P4, fanns även före 2026-09-26) — med påsen först gick grytan inte
    // att få tag i alls så länge påsen hängde där (`_popcornspel`).
    const traff = [['pase', this._pase], ['gryta', this._gryta]]
      .filter(([, k]) => k.zonVid(p.x, p.y))
      .sort((a, b) => a[1].avstand(p.x, p.y) - b[1].avstand(p.x, p.y))
    for (const [typ, karl] of traff) {
      const zon = karl.zonVid(p.x, p.y)
      if (this._vald && this._vald !== typ) this._avmarkera(ctx)
      const fore = { lage: karl.lage, mal: { ...karl._mal } }
      karl.greppa(p.x, p.y)
      if (typ === 'gryta') { this._grytaPaVagHem = false; this._grytaVia = null }
      if (typ === 'pase') { this._pasePaVagHem = false; this._paseVia = null; this._gryta._pasePark = false }
      // Grytan lyfts bort under en påse som hänger över den: påsen går hem.
      if (typ === 'gryta' && this._gryta._pasePark && this._pase.lage === 'park') {
        this._gryta._pasePark = false
        this._paseHem(ctx)
      }
      this._grepp = { ...bas, typ, zon, fore }
      logDrag('plock', { typ, zon })
      audioGrip(ctx, zon)
      if (karl === this._gryta) pop(this._grytVy.fram, { scale: 1.03 })
      return
    }

    // Ett tryck på ingenting: en glad krusning och ett mjukt ljud (P0 — aldrig tyst).
    ripple(ctx.fxLayer, p.x, p.y, { color: 0xfff1c8, maxR: 50 })
    ctx.services.audio.sfx('soft')
    if (this._vald) this._avmarkera(ctx)
  },

  _flytta(ctx, e) {
    const g = this._grepp
    if (!g || e.pointerId !== g.id) return
    const p = this._pekpunkt(e)
    if (!g.flyttat && Math.hypot(p.x - g.x0, p.y - g.y0) > 12) g.flyttat = true
    this._idle = 0
    if (g.typ === 'knopp') this._dragKnopp(ctx, p.x)
    else if (g.typ === 'lock') {
      this._lockHand.mx = p.x + this._lockHand.ox
      this._lockHand.my = p.y + this._lockHand.oy
    } else (g.typ === 'gryta' ? this._gryta : this._pase).dra(p.x, p.y)
  },

  _upp(ctx, e) {
    const g = this._grepp
    if (!g || e.pointerId !== g.id) return
    this._grepp = null
    this._idle = 0
    const p = this._pekpunkt(e)
    const tap = !g.flyttat && performance.now() - g.t0 < 400
    if (g.typ === 'knopp') return
    if (g.typ === 'lock') return this._slappLock(ctx)
    const karl = g.typ === 'gryta' ? this._gryta : this._pase
    logDrag('slapp', { typ: g.typ, dragen: !tap, x: Math.round(p.x), y: Math.round(p.y) })

    if (karl.lage === 'vippa') {
      // Släppt MEDAN det häller: kärlet hänger kvar över målet och rätar upp sig lugnt.
      const mal = karl.hallMal
      karl.slappVippa()
      if (karl === this._gryta) {
        logDrag('ratt', { typ: g.typ, skal: mal.s, hallt: true })
      } else {
        logDrag('ratt', { typ: g.typ, hallt: true })
        // En påse som HÄLLT går hem (och fylls på där när den är tom): hängde den kvar över grytan
        // täckte den grytans bygel. Den rätar först upp sig rakt ovanför grytan (`_paseHem`), så
        // det som rinner ur den på vägen hamnar ändå i grytan.
        this._paseHem(ctx)
      }
      return
    }
    if (tap) {
      // Ett TRYCK på ett kärl: tap-reserven. Kärlet lyfts en aning och väntar på sitt mål —
      // det går aldrig att hälla med tryck (ägarens val).
      if (g.fore.lage === 'park') karl.parkera(g.fore.mal.x, g.fore.mal.y)
      else this._lyftVald(karl, g.typ)
      this._markera(ctx, g.typ)
      return
    }
    if (karl === this._gryta) {
      // GRYTAN landar där den släpps (inga osynliga spärrar): på en skål, bänken, spisen.
      const m = karl.varld(0, 0)
      const s = SKAL.findIndex((sk) => Math.abs(m.x - sk.x) < sk.kantB / 2 + 20)
      karl.lagNer()
      logDrag(s >= 0 ? 'ratt' : 'slapp', { typ: g.typ, skal: s, zon: g.zon })
      return
    }
    this._parkeraEfterSlapp(ctx, g.typ)
  },

  // Var ett släppt kärl hamnar: över en skål (grytan) / över grytan (påsen), annars hem.
  _parkeraEfterSlapp(ctx, typ) {
    if (typ === 'gryta') {
      const g = this._gryta
      const m = g.varld(0, 0)
      const s = SKAL.findIndex((sk) => Math.abs(m.x - sk.x) < sk.kantB / 2 + 50 && m.y < sk.kant)
      if (s >= 0) {
        this._parkeraOverSkal(ctx, s)
        logDrag('ratt', { typ, skal: s })
      } else {
        this._grytaHem(ctx)
        logDrag('miss', { typ })
      }
    } else {
      const p = this._pase
      const m = p.varld(0, 0)
      const gm = this._gryta.varld(0, 0)
      if (Math.abs(m.x - gm.x) < GRYTA.bredd / 2 + 60 && m.y < gm.y + 40) {
        this._paseOverGryta(ctx)
        logDrag('ratt', { typ })
      } else {
        this._paseHem(ctx)
        logDrag('miss', { typ })
      }
    }
  },

  // Tap-reservens mål: den osynliga handen bär grytan dit — upp över skålarna — och STÄLLER
  // den på skålen. Den häller aldrig själv; barnet tar sedan i ett handtag.
  _parkeraOverSkal(ctx, s) {
    const g = this._gryta
    const x = clamp(SKAL[s].x, GRYTA.handtag.x + 24, 1280 - GRYTA.handtag.x - 24)
    this._grytaTill(x, g.parkHojd(SKAL[s].kant) - 6)
    ctx.services.audio.tone({ freq: 523, dur: 0.1, type: 'sine', vol: 0.14, slideTo: 659 })
  },

  _grytaHem(ctx) {
    const g = this._gryta
    this._grytaTill(GRYTA_HEM.x, g.parkHojd(SPIS.yta) - 4)
  },

  // Den osynliga handen bär grytan till (x, y) och ställer ned den där — över skålarna går
  // den UPP först: raka vägen släpade grytan genom popcornhögen i skålarna den passerade.
  _grytaTill(x, y) {
    const g = this._gryta
    const m = g.varld(0, 0)
    const hog = Math.min(m.y, y, SKAL[0].kant - GRYTA.golv - GRYTA.djup - 70)
    this._grytaVia = []
    if (Math.abs(m.x - x) > 40) {
      g.parkera(m.x, hog)
      this._grytaVia.push({ x, y: hog }, { x, y })
    } else g.parkera(x, y)
    this._grytaPaVagHem = true
  },

  // Står grytan på spisplattan?
  _grytaPaSpisen() {
    const m = this._gryta.varld(0, 0)
    return Math.abs(m.x - GRYTA_HEM.x) < 70 && Math.abs(m.y - GRYTA_HEM.y) < 30
  },

  // Vilken skål grytan står på (eller hänger över), -1 om ingen.
  _grytaVidSkal() {
    const m = this._gryta.varld(0, 0)
    if (this._grytaPaSpisen()) return -1
    return SKAL.findIndex((sk) => Math.abs(m.x - sk.x) < sk.kantB / 2 + 20 && m.y < sk.kant)
  },

  _paseOverGryta(ctx) {
    const gm = this._gryta.varld(0, 0)
    const h = paseHylla(this._pase, this._gryta, gm.x - 30)
    this._pase.parkera(h.mal.x, h.y)
    this._gryta._pasePark = true
    ctx.services.audio.tone({ freq: 440, dur: 0.1, type: 'sine', vol: 0.12, slideTo: 523 })
  },

  _paseHem(ctx) {
    const p = this._pase
    const hem = { x: PASE_HEM.x, y: p.parkHojd(BANK.yta) - 4 }
    // Står påsen över eller bortom grytan går den UPP över grytans kant och sedan hem — raka
    // vägen drog den genom grytans vägg. Påsen krockar inte med grytan, men kornen i den gör
    // det: de skrapades ut (`_popcornnaiv` P3: 17 av 32 korn på golvet).
    const m = p.varld(0, 0)
    const gm = this._gryta.varld(0, 0)
    this._paseVia = []
    if (m.x > gm.x - GRYTA.bredd / 2 - PASE.bredd) {
      const hog = Math.min(m.y, paseHylla(p, this._gryta, gm.x - 30).y)
      p.parkera(m.x, hog)
      this._paseVia.push({ x: hem.x, y: hog }, hem)
    } else p.parkera(hem.x, hem.y)
    this._pasePaVagHem = true
  },

  _lyftVald(karl, typ) {
    const m = karl.varld(0, 0)
    const lp = karl === this._gryta ? GRYTA.bygel : 0
    karl.parkera(m.x, m.y - lp - 24)
  },

  _markera(ctx, typ) {
    this._vald = typ
    const vy = typ === 'gryta' ? this._grytVy : this._paseVy
    for (const c of [vy.bak, vy.fram]) c.tint = 0xfff4b0
    pop(vy.fram, { scale: 1.04 })
    ctx.services.audio.tone({ freq: 659, dur: 0.09, type: 'sine', vol: 0.12 })
  },

  _avmarkera(ctx) {
    const typ = this._vald
    this._vald = null
    if (!typ) return
    const vy = typ === 'gryta' ? this._grytVy : this._paseVy
    for (const c of [vy.bak, vy.fram]) c.tint = 0xffffff
    // Ett valt kärl som bara lyftes där det stod går tillbaka.
    const karl = typ === 'gryta' ? this._gryta : this._pase
    if (karl.lage === 'park') {
      if (typ === 'gryta') karl.lagNer()
      if (typ === 'pase' && !this._gryta._pasePark) this._paseHem(ctx)
    }
  },

  // Tap-reservens mål. Returnerar true om trycket förbrukades.
  _valjMal(ctx, p) {
    const typ = this._vald
    if (typ === 'gryta') {
      const s = SKAL.findIndex((sk) => Math.abs(p.x - sk.x) < sk.kantB / 2 + 30 && p.y > sk.kant - 180 && p.y < BORD.yta + 40)
      if (s >= 0) {
        this._avmarkeraTyst()
        this._parkeraOverSkal(ctx, s)
        ripple(ctx.fxLayer, SKAL[s].x, SKAL[s].kant, { color: 0xfff1c8 })
        logDrag('ratt', { typ, tap: true, skal: s })
        return true
      }
      if (Math.abs(p.x - SPIS.x) < SPIS.w / 2 && p.y > BANK.yta - 40 && p.y < BANK.yta + 60) {
        this._avmarkeraTyst()
        this._grytaHem(ctx)
        return true
      }
    } else if (typ === 'pase') {
      if (this._gryta.zonVid(p.x, p.y)) {
        this._avmarkeraTyst()
        this._paseOverGryta(ctx)
        logDrag('ratt', { typ, tap: true })
        return true
      }
    }
    return false
  },

  _avmarkeraTyst() {
    const typ = this._vald
    this._vald = null
    const vy = typ === 'gryta' ? this._grytVy : this._paseVy
    if (vy) for (const c of [vy.bak, vy.fram]) c.tint = 0xffffff
  },

  // ---- värmereglaget -----------------------------------------------------------------

  _dragKnopp(ctx, x) {
    const t = clamp((x - REGLAGE.x0) / (REGLAGE.x1 - REGLAGE.x0), 0, 1)
    this._satSteg(ctx, Math.round(t * REGLAGE.steg))
  },

  _satSteg(ctx, n) {
    const s = clamp(n | 0, 0, REGLAGE.steg)
    if (s === this._steg) {
      if (s === 0 || s === REGLAGE.steg) wiggle(this._reglage.knopp)
      return
    }
    const upp = s > this._steg
    this._steg = s
    this._reglage.setSteg(s)
    ctx.services.audio.tone({ freq: PENTA[s], dur: 0.09, type: 'triangle', vol: 0.13 })
    if (upp && s === 1) ripple(ctx.fxLayer, SPIS.x, SPIS.yta, { color: 0xff9a4a, maxR: 90 })
    // Fräset: brus genom ett bandpass, starkare ju varmare. Samma namn = den gamla slingan
    // stoppas först (rampat), så en dragen knopp aldrig lägger fräs på fräs.
    if (s === 0) ctx.services.audio.stopLoop('fras')
    else ctx.services.audio.loop('fras', { typ: 'brus', freq: 3200 + s * 180, q: 0.8, vol: 0.015 + s * 0.006 })
  },

  // ---- locket ---------------------------------------------------------------------------

  _traffarLock(p) {
    const b = this._lock
    const c = Math.cos(-b.angle)
    const s = Math.sin(-b.angle)
    const dx = p.x - b.position.x
    const dy = p.y - b.position.y
    const lx = dx * c - dy * s
    const ly = dx * s + dy * c
    return Math.abs(lx) < LOCK.bredd / 2 + 16 && ly > -LOCK.knoppR * 2 - 30 && ly < LOCK.tjock + 18
  },

  _greppaLock(p) {
    const b = this._lock
    if (b.isStatic) Body.setStatic(b, false)
    this._lockPaKrok(false)
    this._lockHem = false
    // Locket hålls i knoppen (rakt ovanför mitten), var på locket fingret än hamnade.
    const k = { x: b.position.x + Math.sin(b.angle) * LOCK.tjock, y: b.position.y - Math.cos(b.angle) * LOCK.tjock }
    this._lockHand = { x: k.x, y: k.y, vx: 0, vy: 0, mx: k.x, my: k.y, ox: k.x - p.x, oy: k.y - p.y, rx: k.x - b.position.x, ry: k.y - b.position.y, a0: b.angle }
    this._utur(this._gryta.innehall, b)
  },

  _slappLock(ctx) {
    this._lockHand = null
    // Släpps locket ovanför grytans mynning lägger det sig på av egen tyngd; annars faller det.
    const b = this._lock
    const m = this._gryta.varld(0, 0)
    if (Math.abs(b.position.x - m.x) < 70 && b.position.y < m.y + 10 && b.position.y > m.y - 160) {
      Body.setVelocity(b, { x: (m.x - b.position.x) * 0.08, y: b.velocity.y })
      Body.setAngularVelocity(b, 0)
      this._gryta.innehall.push(b)
      ctx.services.audio.tone({ freq: 587, dur: 0.12, type: 'triangle', vol: 0.14 })
      return
    }
    // Annars bär den osynliga handen tillbaka det till kroken.
    this._lockTillKrok()
  },

  // Ett lock som hänger på kroken är DEKOR tills barnet tar det: det kolliderar med ingenting.
  // Som statisk kropp i påsens väg skrapade det av kornen när påsen bars förbi (`_popcornspel`:
  // 2 korn i grytan av 32, medan påsens häll i node gav 32 av 32).
  _lockPaKrok(pa) {
    this._lock.collisionFilter.mask = pa ? 0 : 0xffffffff
  },

  _lockTillKrok() {
    const b = this._lock
    if (b.isStatic) return
    const k = { x: b.position.x, y: b.position.y - LOCK.tjock }
    this._lockHand = { x: k.x, y: k.y, vx: 0, vy: 0, mx: LOCK_KROK.x, my: LOCK_KROK.y - LOCK.tjock, ox: 0, oy: 0, rx: 0, ry: -LOCK.tjock, a0: b.angle, hem: true }
    this._lockHem = true
  },

  // ---- påminnelsen (P0 småbarn: mjuk om-cue vid ~6 s stillhet) -------------------------------

  _idleTick(ctx, dt) {
    if (this._grepp || this._finish || ctx.services.voice.talar) {
      this._idle = 0
      return
    }
    this._idle += dt
    if (this._idle < IDLE_S) return
    this._idle = -4 // nästa påminnelse tidigast om ~10 s
    const iGrytan = this._korn.filter((k) => this._gryta.inuti(k.body.position.x, k.body.position.y, 10)).length
    const popIGrytan = this._pop.filter((p) => this._gryta.inuti(p.body.position.x, p.body.position.y, 20)).length
    let replik
    let gest
    if (popIGrytan >= 6) {
      replik = 'Greppa grytan och luta den!'
      gest = this._grytaVidSkal() >= 0 ? 'vippa' : 'bara'
    } else if (iGrytan >= 6 && this._steg === 0) {
      replik = 'Dra i reglaget så blir spisen varm!'
      gest = 'reglage'
    } else if (iGrytan < 6) {
      replik = 'Häll majskornen i grytan!'
      gest = 'pase'
    }
    if (!replik) return
    ctx.services.voice.say(replik)
    this._visaGest(ctx, gest)
  },

  // Spökhanden: en genomskinlig hand visar GESTEN (greppa, dra dit, tryck nedåt så det lutar).
  // Den gör ingenting själv.
  _visaGest(ctx, gest) {
    this._hjalpStopp()
    const hand = new Graphics()
    hand.circle(0, 0, 22).fill({ color: 0xffffff, alpha: 0.7 }).stroke({ width: 4, color: 0x5b6b8c, alpha: 0.7 })
    hand.roundRect(-9, -64, 18, 52, 9).fill({ color: 0xffffff, alpha: 0.7 }).stroke({ width: 4, color: 0x5b6b8c, alpha: 0.7 })
    hand.alpha = 0
    this._hjalpLager.addChild(hand)
    this._hjalp = hand
    let fran
    let till
    // `ned`: gestens andra halva — väl framme trycker handen vidare nedåt (så lutar kärlet).
    let ned = 0
    if (gest === 'pase') {
      fran = this._pase.varld(this._pase.bredd / 2, 30)
      const m = this._gryta.varld(0, 0)
      till = { x: m.x - 30, y: m.y - 150 }
      ned = 150
    } else if (gest === 'reglage') {
      fran = { x: REGLAGE.x0, y: REGLAGE.y }
      till = { x: REGLAGE.x1, y: REGLAGE.y }
    } else if (gest === 'bara') {
      // Ta i själva grytan och ställ den på en skål.
      fran = this._gryta.varld(0, 50)
      till = { x: SKAL[0].x, y: SKAL[0].kant - 70 }
    } else {
      // Ta ett handtag och håll kvar (grytan lyfts och tippar själv) — handen lyfter lite.
      fran = this._gryta.varld(GRYTA.handtag.x, GRYTA.handtag.y)
      till = { x: fran.x, y: fran.y - 60 }
    }
    hand.position.set(fran.x, fran.y)
    const tl = gsap.timeline({ repeat: 1 })
    tl.to(hand, { alpha: 1, duration: 0.3 })
      .to(hand.scale, { x: 0.85, y: 0.85, duration: 0.18 })
      .to(hand, { x: till.x, y: till.y, duration: 1.2, ease: 'sine.inOut' })
    if (ned) tl.to(hand, { y: till.y + ned, duration: 0.8, ease: 'sine.inOut' })
    tl.to(hand.scale, { x: 1, y: 1, duration: 0.18 })
      .to(hand, { alpha: 0, duration: 0.35 })
      .set(hand, { x: fran.x, y: fran.y })
    tl.eventCallback('onComplete', () => this._hjalpStopp())
    this._hjalpTl = tl
  },

  _hjalpStopp() {
    this._hjalpTl?.kill()
    this._hjalpTl = null
    if (this._hjalp && !this._hjalp.destroyed) {
      gsap.killTweensOf(this._hjalp)
      gsap.killTweensOf(this._hjalp.scale)
      this._hjalp.destroy()
    }
    this._hjalp = null
  },

  // ---- finish: filmkvällen (B13) -------------------------------------------------------

  _filmkvall(ctx) {
    if (!this._alive || this._finish) return
    this._finish = true
    this._omgangar = (this._omgangar || 0) + 1
    this._hjalpStopp()
    // Spelets egen rad FÖRE complete() — då står den kvar och berömmet utgår.
    ctx.services.voice.say('Nu börjar filmen!')
    gsap.to(this._dimma, { alpha: 0.5, duration: 1.4, ease: 'sine.inOut' })
    if (this._rum.lampa) gsap.to(this._rum.lampa, { alpha: 0.25, duration: 1.4 })
    if (this._rum.tvSken) {
      gsap.to(this._rum.tvSken, { alpha: 0.85, duration: 1.2 })
      this._tvFlimmer = gsap.to(this._rum.tvSken, { alpha: 0.55, duration: 0.23, repeat: -1, yoyo: true, ease: 'steps(3)', delay: 1.2 })
    }
    ctx.services.audio.stopLoop('fras')
    this._gaster.forEach((g, i) => { this._nastaMums[i] = 0.4 + i * 0.7 })
    // Ett sista popcorn poppar ur en skål och landar i någons hår.
    ctx.later(1.6, () => this._sistaPoppet(ctx))
    ctx.later(2.6, () => {
      if (this._alive) ctx.progress.complete()
    })
    ctx.later(9, () => this._nyOmgang(ctx))
  },

  _sistaPoppet(ctx) {
    if (!this._alive) return
    const s = Math.floor(this._rng() * SKAL.length)
    const g = this._agare[s] || this._gaster[0]
    const sk = SKAL[s]
    const art = ritaPopcorn(Math.floor(this._rng() * 1e9), POPCORN.r)
    const v = art.view
    v.position.set(sk.x, sk.kant - 10)
    this._innehall.addChild(v)
    this._sista = v
    ctx.services.audio.sample('popp')
    const gb = g.view.getBounds()
    const mal = this._root.toLocal({ x: gb.x + gb.width * 0.5, y: gb.y + 8 })
    const o = { t: 0 }
    const x0 = v.x
    const y0 = v.y
    gsap.to(o, {
      t: 1,
      duration: 0.9,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (v.destroyed) return
        v.x = x0 + (mal.x - x0) * o.t
        v.y = y0 + (mal.y - y0) * o.t - Math.sin(o.t * Math.PI) * 170
        v.rotation = o.t * 6
      },
      onComplete: () => {
        if (!this._alive || v.destroyed) return
        sparkle(ctx.fxLayer, v.x, v.y, { count: 5 })
        ctx.services.audio.tone({ freq: 880, dur: 0.1, type: 'sine', vol: 0.12 })
        g.mumsa()
      },
    })
  },

  // En ny omgång: ljuset tänds, skålarna töms, tre nya gäster (ny slump), påsen full.
  _nyOmgang(ctx) {
    if (!this._alive) return
    this._tvFlimmer?.kill()
    gsap.to(this._dimma, { alpha: 0, duration: 1 })
    if (this._rum.lampa) gsap.to(this._rum.lampa, { alpha: 1, duration: 1 })
    if (this._rum.tvSken) gsap.to(this._rum.tvSken, { alpha: 0, duration: 0.8 })
    if (this._sista && !this._sista.destroyed) this._sista.destroy()
    this._sista = null
    for (const p of [...this._pop]) if (p.skal >= 0 || p.body.position.y > GOLV - 40) this._taPopcorn(p, { puffa: p.skal >= 0 && this._rng() < 0.3 })
    this._full = [false, false, false]
    this._batch = { sagtVarme: false, sagtPopp: false, sagtLuta: false, sagtLock: false, sagtKnaprigt: false }
    this._nyaGaster(ctx)
    this._finish = false
    this._idle = 0
    ctx.narTyst(() => {
      if (this._alive) ctx.services.voice.say(this.voiceIntro)
    })
  },

  // ---- DEV: sondkrokar (viker ihop till inget i bygget) --------------------------------------

  _dev() {
    return {
      poppa: (n) => {
        for (const k of this._korn.slice(0, n)) this._poppa(k)
      },
      lage: () => ({
        korn: this._korn.length,
        popcorn: this._pop.length,
        mjuka: this._pop.filter((p) => p.mjuk).length,
        skal: this._skalN,
        full: this._full,
        omgangar: this._omgangar || 0,
        steg: this._steg,
        gryta: { lage: this._gryta.lage, zon: this._gryta.zon, x: this._gryta.body.position.x, y: this._gryta.body.position.y, vinkel: this._gryta.vinkel },
        pase: { lage: this._pase.lage, overGryta: !!this._gryta._pasePark, x: this._pase.body.position.x, y: this._pase.body.position.y },
      }),
    }
  },

  // ---- städning (exit-säkert) --------------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    ctx?.services?.audio?.stopLoop('fras')
    this._avBeforeStep?.()
    this._hjalpStopp()
    this._tvFlimmer?.kill()
    const R = this._root
    if (R && !R.destroyed) {
      R.off('pointerdown', this._onDown)
      R.off('globalpointermove', this._onMove)
      R.off('pointerup', this._onUp)
      R.off('pointerupoutside', this._onUp)
    }
    for (const g of this._gaster || []) g.destroy()
    this._gaster = []
    for (const p of this._pop || []) if (p.view && !p.view.destroyed) gsap.killTweensOf(p.view)
    if (this._sista && !this._sista.destroyed) gsap.killTweensOf(this._sista)
    for (const c of [this._dimma, this._rum?.lampa, this._rum?.tvSken, this._grytVy?.fram, this._grytVy?.fram?.scale, this._paseVy?.fram, this._paseVy?.fram?.scale, this._reglage?.knopp, this._reglage?.minus, this._reglage?.plus]) {
      if (c) gsap.killTweensOf(c)
    }
    for (const b of [this._reglage?.minus, this._reglage?.plus]) if (b && !b.destroyed) gsap.killTweensOf(b.scale)
    this._gryta?.destroy()
    this._pase?.destroy()
    this._phys?.destroy()
    this._varme?.destroy()
    this._korn = []
    this._pop = []
    ctx?.services?.voice?.cancel()
    R?.destroy({ children: true })
    this._root = null
    if (import.meta.env?.DEV && window.__popcorn) delete window.__popcorn
  },
}

// Ett grepp låter: ett handtag (eller påsens kant) klirrar ljust, själva grytan dovare.
function audioGrip(ctx, zon) {
  ctx.services.audio.tone({ freq: zon === 'bygel' || zon?.startsWith?.('handtag') ? 660 : 440, dur: 0.07, type: 'triangle', vol: 0.12 })
}
