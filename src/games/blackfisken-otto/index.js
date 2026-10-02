// BLÄCKFISKEN OTTO — barnet sätter fingret i vattnet och Ottos närmaste arm sträcker sig dit; sugkoppen
// fastnar i det första den nuddar. Lätta saker följer armen till en vän, den tunga skattkistan drar Otto
// dit i stället. Tre havsvänner (tre av fyra, aldrig samma trio två gånger i rad) behöver hjälp.
// Spec: `docs/games/blackfisken-otto.md` §0. Ritning: konst.js · armar: fysik.js.
//
// FYSIK: saker = matter-kroppar i en Flytvolym (lugnt sjunkande) · armar = Rep ×8 stegade med fast takt ·
// greppet = handSteg + drivPunkt per fysiksteg (aldrig ett Constraint) · ett finger i taget (pekGrepp).
//
// SONDKROK: `_armar[i].spets` {x,y} · `_saker[i]` {id,x,y,r,behov,klar,hallen,tung,lost} ·
// `_vanner[i]` {typ,x,y,zon,klar} · `_otto` {x,y} · `_g` (pågående grepp) · `_fas` · `_klara`.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { Flytvolym } from '../../lib/flytkraft.js'
import { drivPunkt, handSteg } from '../../lib/grepp.js'
import { pekGrepp } from '../../lib/pekare.js'
import { pase, nastaVariant } from '../../lib/variation.js'
import { shuffle } from '../../lib/swedish.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { puff, sparkle, burst, ripple, squash, wiggle, liv, bounceIn } from '../../lib/feedback.js'
import { Arm, REACH } from './fysik.js'
import { fest } from './fest.js'
import { omgivning } from './omgivning.js'
import { SAKER, VANNER, SKEPP, ritaVan, ritaArm, ritaSand, ritaLjusstrak, skapaTang, skapaSten, skapaSkepp, skapaDack, skapaSak, skapaVan, nolla, FLOOR, OTTO_Y, clamp, slump } from './konst.js'

const OTTO_MIN = 170
const OTTO_MAX = 1110
const TROSKEL = 14 // px rörelse innan ett tryck räknas som ett drag
const BURK_LOS = 110 // så långt (px) måste burken dras för att fisken ska bli fri
const NOTER = { krabba: [0, 2, 4], fisk: [1, 3, 5], sjohast: [2, 4, 5], skoldpadda: [0, 3, 4] } // typ → toner ur SKALA
const HALO = 34 // träffmarginal runt en sak (tap-tap)
const ALLA = ['krabba', 'fisk', 'sjohast', 'skoldpadda']
const SKALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5] // C-dur pentatonisk

// Städar en hel gren: gsap når bara roten av en tween-lista, så barnbarnen måste tas en och en.
function killTrad(n) {
  if (!n || n.destroyed) return
  gsap.killTweensOf(n)
  if (n.scale) gsap.killTweensOf(n.scale)
  if (n.position) gsap.killTweensOf(n.position)
  n._fxLiv?.kill()
  n._fxPopTl?.kill()
  n._fxSquashTl?.kill()
  n._fxWiggleTl?.kill()
  n._fxHopTl?.kill()
  n._fxShakeTw?.kill()
  if (n.children) for (const c of n.children) killTrad(c)
}

export default {
  id: 'blackfisken-otto',
  titleSv: 'Bläckfisken Otto',
  icon: '🐙',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'blackfisken-otto',
  voiceIntro: 'Hjälp Otto att hjälpa sina vänner! Dra i en arm.',
  ...fest,
  ...omgivning,

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._tid = 0
    this._tw = []
    this._saker = []
    this._vanner = []
    this._ordning = []
    this._bub = []
    this._perlor = []
    this._g = null
    this._fas = 'spel'
    this._klara = 0
    this._idle = 0
    this._idleStg = 0
    this._hjalpMal = null
    this._ring = null
    this._sagTid = -99
    this._tungSagt = false
    this._skepp = null
    this._bubbleT = 1.5
    this._leksaker = pase(['sjostjarna', 'flaska', 'snacka'])

    const root = (this._root = new Container())
    ctx.stage.addChild(root)
    root.addChild(createScene('water', { ground: false }))
    const strak = nolla(new Graphics())
    ritaLjusstrak(strak)
    root.addChild(strak)
    const sand = nolla(new Graphics())
    ritaSand(sand, FLOOR - 10, -320, 1600)
    root.addChild(sand)
    const lager = (namn) => {
      const c = nolla(new Container())
      root.addChild(c)
      this[namn] = c
      return c
    }
    lager('_lDekor')
    lager('_lArmVila') // vilande armar ligger UNDER sakerna
    lager('_lSkugga')
    lager('_lVan')
    lager('_lSak')
    lager('_lArm')
    lager('_lOtto')
    lager('_lFx')

    // FYSIK — vatten överallt (ytan ligger ovanför bild), golvet vid FLOOR.
    this._phys = new PhysicsWorld({ gravityY: 0.9, walls: ['floor', 'left', 'right', 'ceiling'], bounds: { left: 0, top: 0, right: 1280, bottom: FLOOR } })
    this._flyt = new Flytvolym({ varld: this._phys, ytY: 0, botten: FLOOR, motstand: 0.93, maxFart: 10 })
    this._sakGrupp = this._phys.grupp() // saker kolliderar aldrig med varandra, bara med botten/skeppet
    this._avSteg = this._phys.beforeStep(() => this._gripSteg())

    // OTTO
    const o = (this._otto = { x: 640, y: OTTO_Y, vx: 0, humor: 0.12, heim: null, look: { x: 0, y: 0 }, blinking: false, blinkT: 2.2, nyckel: '', farg: 0x8d7be0 })
    this._ottoSkugga = nolla(new Graphics().ellipse(0, 0, 118, 20).fill({ color: 0x0b3a5a, alpha: 0.3 }))
    this._ottoSkugga.position.set(o.x, FLOOR - 4)
    this._lArmVila.addChild(this._ottoSkugga)
    this._armar = []
    for (let i = 0; i < 8; i++) {
      const a = new Arm(i, FLOOR)
      a.bygg(o.x, OTTO_Y)
      this._lArmVila.addChild(a.g)
      this._armar.push(a)
    }
    const oc = (this._ottoC = nolla(new Container()))
    oc.position.set(o.x, OTTO_Y)
    this._ottoSq = nolla(new Container())
    this._ottoKropp = nolla(new Container())
    this._ottoG = nolla(new Graphics())
    this._ottoKropp.addChild(this._ottoG)
    this._ottoSq.addChild(this._ottoKropp)
    oc.addChild(this._ottoSq)
    this._lOtto.addChild(oc)
    liv(this._ottoKropp, { bob: 5, sway: 0.03, duration: 2.8 })
    this._ottoVisa(0)

    this._av = pekGrepp(root, {
      hitArea: new Rectangle(-400, -300, 2080, 1320),
      traff: (p) => this._traff(p),
      ned: (p) => this._ned(p),
      flytta: (p) => this._flytta(p),
      slapp: (p, mal, o2) => this._upp(p, o2),
    })
    root.interactiveChildren = false

    this._tick = (tk) => this._steg(tk)
    this._byggRunda()
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    ctx.narTyst(() => {
      if (this._alive && this._fas === 'spel' && this._ordning[0]) this._sagVan(this._ordning[0])
    })
    ctx.ticker.add(this._tick)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._av?.()
    this._av = null
    this._avSteg?.()
    this._avSteg = null
    for (const t of this._tw || []) t.kill()
    this._tw = []
    if (this._root && !this._root.destroyed) killTrad(this._root)
    for (const a of this._armar || []) a.destroy()
    this._armar = []
    this._flyt?.destroy()
    this._phys?.destroy()
    this._flyt = this._phys = null
    this._root?.destroy({ children: true })
    this._root = null
    this._saker = []
    this._vanner = []
    this._bub = []
    this._perlor = []
    this._g = null
    this._ring = null
    this._skepp = null
  },

  // ───────────────────────── RUNDAN ─────────────────────────

  _rensaRunda() {
    if (this._g) {
      this._g = null
    }
    for (const a of this._armar) {
      a.nollstall()
      a.vilaLangd()
    }
    for (const t of this._tw) t.kill()
    this._tw = []
    for (const it of this._saker) {
      this._phys.removeBody(it.body)
      this._flyt.ta(it.body)
    }
    if (this._skepp?.deck) this._phys.removeBody(this._skepp.deck)
    this._flyt.rensa()
    this._saker = []
    this._vanner = []
    this._skepp = null
    this._ring = null
    this._hjalpMal = null
    for (const lager of [this._lDekor, this._lSkugga, this._lVan, this._lSak]) {
      for (const c of lager.removeChildren()) {
        killTrad(c)
        c.destroy({ children: true })
      }
    }
    for (const p of this._perlor) {
      if (!p.destroyed) p.destroy()
    }
    this._perlor = []
    gsap.killTweensOf(this._ottoSq)
    this._ottoSq.rotation = 0
  },

  _byggRunda() {
    this._rensaRunda()
    this._fas = 'spel'
    this._klara = 0
    this._tungSagt = false
    this._idle = 0
    this._idleStg = 0
    const o = this._otto
    o.heim = 640

    // Trion: en av fyra utelämnas, och aldrig samma som förra rundan → aldrig samma trio två gånger i rad.
    const utan = nastaVariant(ALLA, this._utanForra)
    this._utanForra = utan
    const trio = shuffle(ALLA.filter((t) => t !== utan))
    this._ordning = trio
    const golv = trio.filter((t) => !VANNER[t].mitten)
    const mitt = trio.filter((t) => VANNER[t].mitten)
    const plats = {}
    if (golv.length === 2) {
      const [a, b] = shuffle(golv)
      plats[a] = 'L'
      plats[b] = 'R'
      plats[mitt[0]] = 'M'
    } else {
      const sida = Math.random() < 0.5 ? 'L' : 'R'
      plats[golv[0]] = sida
      const [m1, m2] = shuffle(mitt)
      plats[m1] = 'M'
      plats[m2] = sida === 'L' ? 'R' : 'L'
    }
    const kolX = { L: () => slump(140, 250), M: () => slump(590, 690), R: () => slump(1030, 1140) }

    const placerat = [{ x: 640, r: 105 }]
    const frittX = (r, rel = 1, minX = 100, maxX = 1180) => {
      for (let f = 0; f < 70; f++) {
        const x = slump(minX, maxX)
        const sp = f < 45 ? 0.9 : 0.45
        if (placerat.every((p) => Math.abs(p.x - x) >= (p.r + r) * sp * rel)) return x
      }
      return slump(minX, maxX)
    }

    // VÄNNER
    const vx = {}
    for (const typ of trio) {
      const def = VANNER[typ]
      const x = kolX[plats[typ]]()
      const y = def.mitten ? def.hojd + slump(-24, 24) : FLOOR - (typ === 'krabba' ? 46 : 44)
      const v = skapaVan(typ)
      v.c.position.set(x, y)
      this._lVan.addChild(v.c)
      liv(v.kropp, { bob: typ === 'skoldpadda' || typ === 'krabba' ? 3 : 7, sway: typ === 'sjohast' ? 0.05 : 0.02, duration: 2.2 + Math.random() })
      const van = { typ, def, zon: def.zon, zy: typ === 'sjohast' ? 24 : 0, klar: false, sak: null, ...v, get x() { return this.c.x }, get y() { return this.c.y + this.zy } }
      this._vanner.push(van)
      vx[typ] = van
      placerat.push({ x, r: def.mitten ? 65 : 90 })
      bounceIn(v.vard, { delay: 0.1 + Math.random() * 0.25 })
    }

    // HAVSBOTTEN: skeppet (alltid om sköldpaddan är med — bollen ligger på däck), tång, stenar, bildäck.
    let skeppX = null
    if (vx.skoldpadda || Math.random() < 0.6) {
      const tx = vx.skoldpadda ? vx.skoldpadda.c.x : null
      const golvVanner = this._vanner.filter((v) => !v.def.mitten).map((v) => v.c.x)
      let basta = -1
      for (let f = 0; f < 40; f++) {
        const x = Math.random() < 0.5 ? slump(330, 470) : slump(810, 950)
        if (tx != null && Math.abs(x - tx) <= 380) continue
        const marg = golvVanner.length ? Math.min(...golvVanner.map((gx) => Math.abs(gx - x))) : 999
        if (marg > basta) {
          basta = marg
          skeppX = x
        }
      }
      skeppX ??= vx.skoldpadda.c.x < 640 ? 900 : 380
      const s = skapaSkepp(skeppX, FLOOR)
      this._lDekor.addChild(s)
      const dackTop = FLOOR + 8 + SKEPP.dackY
      const deck = this._phys.rectangle(skeppX, dackTop + 8, 272, 16, { isStatic: true, label: 'dack' })
      this._skepp = { x: skeppX, dackTop, deck }
    }
    if (Math.random() < 0.5) {
      let x = slump(100, 1180)
      for (let f = 0; f < 30 && skeppX != null && Math.abs(x - skeppX) < 280; f++) x = slump(100, 1180)
      this._lDekor.addChild(skapaDack(x, FLOOR))
    }
    // Ungen ligger i tången, långt från mamman.
    let ungeX = null
    if (vx.sjohast) {
      for (let f = 0; f < 60 && ungeX == null; f++) {
        const x = slump(110, 1170)
        if (Math.abs(x - vx.sjohast.c.x) > 330 && Math.abs(x - 640) > 210 && (skeppX == null || Math.abs(x - skeppX) > 190) && this._vanner.every((v) => Math.abs(v.c.x - x) > 150)) ungeX = x
      }
      ungeX ??= vx.sjohast.c.x < 640 ? 960 : 330
    }
    const antalTang = 3 + ((Math.random() * 3) | 0)
    const tangX = ungeX != null ? [ungeX] : []
    for (let k = tangX.length; k < antalTang; k++) tangX.push(slump(60, 1220))
    const grona = [0x4fae64, 0x3f9d6c, 0x6bbf5a, 0x5aa87a]
    for (const x of tangX) this._lDekor.addChild(skapaTang(x, FLOOR, 3 + ((Math.random() * 3) | 0), slump(90, 170), grona[(Math.random() * grona.length) | 0]))
    const antalSten = 2 + ((Math.random() * 3) | 0)
    for (let k = 0; k < antalSten; k++) this._lDekor.addChild(skapaSten(slump(40, 1240), FLOOR, slump(24, 46)))

    // SAKER
    if (vx.krabba) {
      const it = this._lagaSak('skal', frittX(40), FLOOR - 40)
      it.behov = 'krabba'
      placerat.push({ x: it.x, r: 40 })
    }
    if (vx.fisk) {
      const it = this._lagaSak('burk', vx.fisk.c.x, vx.fisk.c.y + 4)
      it.behov = 'fisk'
      it.hem = { x: it.x, y: it.y }
    }
    if (vx.sjohast) {
      const it = this._lagaSak('unge', ungeX, FLOOR - 40)
      it.behov = 'sjohast'
      placerat.push({ x: ungeX, r: 40 })
    }
    if (vx.skoldpadda) {
      const it = this._lagaSak('boll', this._skepp.x + slump(-80, 80), this._skepp.dackTop - 40)
      it.behov = 'skoldpadda'
    }
    const kista = this._lagaSak('kista', frittX(62), FLOOR - 40)
    placerat.push({ x: kista.x, r: 62 })
    const nLek = Math.random() < 0.5 ? 2 : 3
    for (let k = 0; k < nLek; k++) {
      let id = this._leksaker.nasta()
      // en sak får inte förekomma två gånger, och kammusslan lämnas hemma när krabban är med (den läser som ett skal)
      const dub = () => this._saker.some((q) => q.id === id) || (id === 'snacka' && vx.krabba)
      for (let f = 0; f < 10 && dub(); f++) id = this._leksaker.nasta()
      if (dub()) continue
      const x = frittX(46, 0.9)
      this._lagaSak(id, x, slump(240, 470))
      placerat.push({ x, r: 46 })
    }
    // föremålen studsar in en i taget
    this._saker.forEach((it, i) => bounceIn(it.view, { delay: 0.2 + i * 0.07 }))
  },

  _lagaSak(id, x, y) {
    const def = SAKER[id]
    const { view, kropp } = skapaSak(id)
    const opt = { restitution: 0.1, friction: 0.9, frictionAir: 0.02, density: def.tung ? 0.004 : 0.0015, inertia: Infinity, label: 'sak', collisionFilter: { group: this._sakGrupp } }
    const body = def.tung ? this._phys.rectangle(x, y, 112, 70, opt) : this._phys.circle(x, y, def.r, opt)
    view.position.set(x, y)
    this._lSak.addChild(view)
    this._phys.link(body, view)
    this._flyt.lagg(body, { flyt: def.flyt, liv: false })
    liv(kropp, { bob: 4, sway: 0.04, duration: 2 + Math.random() * 1.2 })
    const skugga = nolla(new Graphics().ellipse(0, 0, def.r * 0.95, def.r * 0.26).fill({ color: 0x0b3a5a, alpha: 0.3 }))
    this._lSkugga.addChild(skugga)
    const it = {
      id, def, r: def.r, tung: !!def.tung, body, view, kropp, skugga,
      klar: false, hallen: null, markerad: false, behov: null, lost: false, hem: null,
      get x() { return this.body.position.x },
      get y() { return this.body.position.y },
    }
    this._saker.push(it)
    return it
  },

  // ───────────────────────── PEKNING ─────────────────────────

  _traff(p) {
    if (this._fas === 'spel') return {}
    // Under festen tar vi ändå emot trycket med en ring och en ton (P0: varje pekning svarar).
    this._ctx.services.audio.tone({ freq: 440, slideTo: 520, dur: 0.08, type: 'sine', vol: 0.08 })
    ripple(this._lFx, p.x, p.y, { color: 0xffffff, maxR: 50, width: 3, alpha: 0.4, duration: 0.4 })
    return null
  },

  _ned(p) {
    const ctx = this._ctx
    this._idle = 0
    this._idleStg = 0
    this._hjalpMal = null
    this._otto.heim = null
    const au = ctx.services.audio
    au.tone({ freq: 360, slideTo: 540, dur: 0.09, type: 'sine', vol: 0.1 })
    ripple(this._lFx, p.x, p.y, { color: 0xffffff, maxR: 58, width: 4, alpha: 0.5, duration: 0.45 })
    const van = this._vanVid(p)
    if (van) this._vanRor(van)
    let g = this._g
    if (g && g.mode === 'hall') {
      if (this._narSak(g.sak, p)) {
        g.mode = 'dra'
        g.fing = p
        g.start = p
        g.drog = false
        g.pend = null
        g.reMark = true
        g.sak.markerad = false
        g.hand = { x: g.sak.x, y: g.sak.y, vx: g.sak.body.velocity.x, vy: g.sak.body.velocity.y }
        return
      }
      g.pend = p
      g.start = p
      g.drog = false
      g.fing = p
      return
    }
    if (g) this._slappG()
    this._nyttGrepp(p)
  },

  _nyttGrepp(p) {
    const o = this._otto
    let bast = null
    let bd = 1e9
    for (const a of this._armar) {
      const d = Math.hypot(a.spets.x - p.x, a.spets.y - p.y) + Math.abs(a.rot(o.x, o.y).x - p.x) * 0.15
      if (d < bd) {
        bd = d
        bast = a
      }
    }
    bast.mode = 'aktiv'
    bast.rorelse = 0
    bast.pekT = 0
    this._g = { arm: bast, sak: null, mode: 'dra', fing: p, start: p, drog: false, hand: null, handMal: null, sikte: null, mal: null, tid: 0, pend: null, reMark: false }
    this._ctx.services.audio.tone({ freq: 190, slideTo: 330, dur: 0.18, type: 'sine', vol: 0.07 })
  },

  _flytta(p) {
    const g = this._g
    if (!g) return
    g.fing = p
    if (!g.drog && Math.hypot(p.x - g.start.x, p.y - g.start.y) > TROSKEL) {
      g.drog = true
      if (g.pend) {
        // drag från tomt vatten medan något hölls i tap-tap: släpp det och ta en ny arm
        this._slappG()
        this._nyttGrepp(p)
        this._g.drog = true
      }
    }
  },

  _upp(p) {
    const g = this._g
    if (!g) return
    this._idle = 0
    g.fing = p
    if (g.pend && !g.drog) {
      g.pend = null
      this._bar(g, p)
      return
    }
    if (g.mode !== 'dra') return
    if (g.drog) {
      this._slappG()
      return
    }
    // ett TRYCK
    if (g.sak) {
      if (g.reMark) this._slappG()
      else this._markera(g)
      return
    }
    const it = this._sakVid(p)
    g.mode = 'natt'
    g.tid = 0
    if (it) {
      g.sikte = it
      g.mal = { x: it.x, y: it.y }
    } else {
      g.sikte = null
      g.mal = { x: p.x, y: p.y }
    }
  },

  _markera(g) {
    g.mode = 'hall'
    g.sak.markerad = true
    g.mal = { x: g.sak.x, y: g.sak.y }
    this._ctx.services.audio.tone({ freq: 660, slideTo: 760, dur: 0.1, type: 'sine', vol: 0.1 })
  },

  _bar(g, p) {
    const van = this._vanVid(p)
    g.mode = 'bar'
    g.tid = 0
    g.mal = van ? { x: van.c.x, y: van.c.y + van.zy } : { x: p.x, y: p.y }
    if (g.sak) g.sak.markerad = false
  },

  _narSak(it, p) {
    return it && Math.hypot(it.x - p.x, it.y - p.y) <= it.r + HALO
  },

  _sakVid(p) {
    let bast = null
    let bd = 1e9
    for (const it of this._saker) {
      if (it.klar) continue
      const d = Math.hypot(it.x - p.x, it.y - p.y) - it.r
      if (d <= HALO && d < bd) {
        bd = d
        bast = it
      }
    }
    return bast
  },

  _vanVid(p) {
    let bast = null
    let bd = 1e9
    for (const v of this._vanner) {
      const d = Math.hypot(v.x - p.x, v.y - p.y)
      if (d <= v.zon && d < bd) {
        bd = d
        bast = v
      }
    }
    return bast
  },

  _vanRor(van) {
    wiggle(van.vard)
    if (van.klar) {
      squash(van.vard, { intensity: 0.8, hop: 14 })
      return
    }
    if (this._tid - this._sagTid > 4 && !this._ctx.services.voice.talar) {
      this._sagTid = this._tid
      this._sagVan(van.typ)
    }
  },

  _sagVan(typ) {
    const v = this._ctx.services.voice
    if (typ === 'krabba') v.say('Krabban vill ha sitt skal!')
    else if (typ === 'fisk') v.say('Fisken sitter fast i burken!')
    else if (typ === 'sjohast') v.say('Sjöhästen har tappat sin unge!')
    else if (typ === 'skoldpadda') v.say('Sköldpaddan har tappat sin boll!')
  },

  // ───────────────────────── GREPPET ─────────────────────────

  _fastna(g, it) {
    const ctx = this._ctx
    g.sak = it
    it.hallen = g.arm
    g.hand = { x: it.x, y: it.y, vx: it.body.velocity.x, vy: it.body.velocity.y }
    if (g.mode === 'natt') {
      g.mode = 'hall'
      it.markerad = true
      g.mal = { x: it.x, y: it.y }
    }
    g.arm.tryck = 1
    const t = g.arm.spets
    squash(it.kropp, { intensity: 1.3 })
    puff(this._lFx, t.x, t.y, { count: 6, color: 0xdff6ff })
    ctx.services.audio.tone({ freq: 300, slideTo: 560, dur: 0.12, type: 'sine', vol: 0.15 })
    ctx.services.audio.tone({ freq: 720, slideTo: 900, dur: 0.06, type: 'sine', vol: 0.08, delay: 0.09 })
    this._humorStot(0.25)
    if (it.hem && !it.lost) {
      const fisk = this._vanner.find((v) => v.typ === 'fisk')
      if (fisk) wiggle(fisk.vard)
    }
    if (it.tung && !this._tungSagt) {
      this._tungSagt = true
      squash(this._ottoSq, { intensity: 1.2 })
      if (!ctx.services.voice.talar) ctx.services.voice.say('Oj, vilken tung skattkista!')
    }
  },

  // Avslutar greppet: armen rullar in, och saken (om någon) hamnar där den släpps.
  _slappG() {
    const g = this._g
    if (!g) return
    this._g = null
    const arm = g.arm
    arm.mode = 'vila'
    arm.vilaLangd()
    arm.tryck = 0
    const it = g.sak
    if (it) {
      it.hallen = null
      it.markerad = false
      // Ett snabbt drag hinner före saken: släpps fingret ÖVER vännen räknas det (N1-sonden: 4 av 9 raka drag föll kort).
      this._slappSak(it, g.drog ? g.fing : null)
    }
  },

  _slappSak(it, fing = null) {
    if (it.klar || !this._alive) return
    const ctx = this._ctx
    const b = it.body
    const v = Math.hypot(b.velocity.x, b.velocity.y)
    if (v > 6) Body.setVelocity(b, { x: (b.velocity.x / v) * 6, y: (b.velocity.y / v) * 6 })
    // Burken som inte dragits tillräckligt långt svävar tillbaka: tydlig reaktion så barnet förstår att den ska längre bort.
    if (it.hem && !it.lost) {
      this._burkTillbaka(it)
      return
    }
    const van = this._vanVid({ x: it.x, y: it.y }) || (fing && this._vanVid(fing))
    if (!van || it.tung) {
      ctx.services.audio.tone({ freq: 520, slideTo: 330, dur: 0.14, type: 'sine', vol: 0.1 })
      return
    }
    if (it.behov === van.typ && !van.klar && it.id !== 'burk') this._taEmot(van, it)
    else if (it.id === 'burk' && it.behov === van.typ) return // burken sitter kvar tills den dragits bort
    else this._fel(van, it)
  },

  _burkTillbaka(it) {
    const ctx = this._ctx
    const fisk = this._vanner.find((v) => v.typ === 'fisk')
    squash(it.kropp, { intensity: 1.4 })
    puff(this._lFx, it.hem.x, it.hem.y - 30, { count: 6, color: 0xdff6ff })
    ctx.services.audio.tone({ freq: 300, slideTo: 460, dur: 0.14, type: 'sine', vol: 0.12 })
    if (fisk) {
      wiggle(fisk.vard)
      if (this._tid - this._sagTid > 4 && !ctx.services.voice.talar) {
        this._sagTid = this._tid
        this._sagVan('fisk')
      }
    }
  },

  _fel(van, it) {
    const ctx = this._ctx
    wiggle(van.vard)
    ctx.services.audio.tone({ freq: 392, slideTo: 330, dur: 0.16, type: 'triangle', vol: 0.12 })
    puff(this._lFx, van.c.x, van.c.y - 40, { count: 4, color: 0xffffff })
    // vännen säger vad den vill ha (om det gått en stund och ingen talar)
    if (!van.klar && this._tid - this._sagTid > 4 && !ctx.services.voice.talar) {
      this._sagTid = this._tid
      this._sagVan(van.typ)
    }
    const o = this._otto
    const dx = o.x - it.x
    const dy = FLOOR - 60 - it.y
    const d = Math.hypot(dx, dy) || 1
    Body.setVelocity(it.body, { x: (dx / d) * 7, y: (dy / d) * 4 - 4.5 })
    squash(it.kropp, { intensity: 1 })
  },

  _taEmot(van, it) {
    const ctx = this._ctx
    it.klar = true
    van.klar = true
    van.sak = it
    this._phys.removeBody(it.body)
    this._flyt.ta(it.body)
    it.skugga.destroy()
    // saken flyttar in i vännens container och landar på sin plats
    const lx = it.view.x - van.c.x
    const ly = it.view.y - van.c.y
    van.vard.addChild(it.view)
    it.view.position.set(lx, ly)
    const ax = van.def.anker.x
    const ay = van.def.anker.y
    const st = { t: 0 }
    const tw = gsap.to(st, {
      t: 1, duration: 0.5, ease: 'back.out(1.5)',
      onUpdate: () => {
        if (it.view.destroyed) { tw.kill(); return }
        it.view.position.set(lx + (ax - lx) * st.t, ly + (ay - ly) * st.t)
      },
    })
    this._tw.push(tw)
    ritaVan(van.g, van.typ, true)
    this._jubla(van)
  },

  // Fisken lossnar när burken dragits ≥ BURK_LOS px bort.
  _befria(it) {
    it.lost = true
    const van = this._vanner.find((v) => v.typ === 'fisk')
    if (!van || van.klar) return
    van.klar = true
    ritaVan(van.g, 'fisk', true)
    const bx = van.c.x
    const by = van.c.y
    const tx = gsap.to(van.c, {
      x: bx + 90, duration: 2.3, yoyo: true, repeat: -1, ease: 'sine.inOut',
      onRepeat: () => { if (!van.flip.destroyed) van.flip.scale.x *= -1 },
    })
    const ty = gsap.to(van.c, { y: by - 22, duration: 1.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._tw.push(tx, ty)
    this._jubla(van)
  },

  // Mottagaren jublar: hopp, bubblor, stämd ton — och Otto blir rosa.
  _jubla(van) {
    const ctx = this._ctx
    const au = ctx.services.audio
    this._klara++
    squash(van.vard, { intensity: 1.5, hop: 46 })
    this._gest(van)
    puff(this._lFx, van.c.x, van.c.y - 20, { count: 12, color: 0xbfeaff })
    burst(this._lFx, van.c.x, van.c.y - 30, { count: 10, colors: [0xffd35c, 0xff9ec4, 0xbfeaff, 0xffffff], power: 0.9 })
    for (let i = 0; i < 6; i++) this._bubbla(van.c.x + slump(-50, 50), van.c.y + slump(-30, 30))
    const noter = NOTER[van.typ] || [0, 2, 3]
    noter.forEach((n, i) => au.tone({ freq: SKALA[n], dur: 0.18, type: 'sine', vol: 0.2, delay: i * 0.1 }))
    au.sfx('match')
    ctx.services.voice.say('Tack, Otto!')
    this._otto.humor = 1
    squash(this._ottoSq, { intensity: 1.3, hop: 22 })
    if (this._klara >= 3) ctx.later(1.7, () => this._finish())
  },

  // Varje vän firar på sitt sätt: krabban skuttar i sidled, sköldpaddan rullar glatt, sjöhästen gungar.
  _gest(van) {
    if (van.typ === 'krabba') {
      const x0 = van.c.x
      this._tw.push(gsap.to(van.c, { x: x0 + 28, duration: 0.11, yoyo: true, repeat: 5, ease: 'sine.inOut', onComplete: () => { if (!van.c.destroyed) van.c.x = x0 } }))
    } else if (van.typ === 'skoldpadda') {
      this._tw.push(gsap.to(van.vard, { rotation: 0.32, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut', onComplete: () => { if (!van.vard.destroyed) van.vard.rotation = 0 } }))
    } else if (van.typ === 'sjohast') {
      this._tw.push(gsap.to(van.vard, { rotation: -0.2, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut', onComplete: () => { if (!van.vard.destroyed) van.vard.rotation = 0 } }))
    }
  },

  _humorStot(v) {
    this._otto.humor = Math.min(1, this._otto.humor + v)
  },

  // ───────────────────────── PER STEG / PER BILDRUTA ─────────────────────────

  // Per fysiksteg: handen följer fingret med accelerationstak, saken drivs dit med krafttak.
  _gripSteg() {
    if (!this._alive) return
    for (const it of this._saker) {
      if (it.hem && !it.lost && !it.hallen && !it.klar) {
        const b = it.body
        Body.setVelocity(b, { x: (it.hem.x - b.position.x) * 0.18, y: (it.hem.y - b.position.y) * 0.18 })
      }
    }
    const g = this._g
    if (!g || !g.sak || !g.handMal) return
    const it = g.sak
    if (it.klar) return
    if (it.tung) {
      Body.setVelocity(it.body, { x: 0, y: 0 })
      return
    }
    if (!g.hand) g.hand = { x: it.x, y: it.y, vx: 0, vy: 0 }
    handSteg(g.hand, g.handMal, { maxFart: 13, acc: 0.8 })
    drivPunkt(it.body, { x: 0, y: 0 }, g.hand, 0.35, { dv: 2.6, v: 15 })
  },

  _steg(tk) {
    if (!this._alive || !this._root) return
    const dMs = Math.min(tk.deltaMS || 16.67, 100)
    const dts = dMs / 1000
    this._tid += dts
    this._phys.update(dMs)
    this._ottoSteg(dts)
    this._armarSteg(dMs, dts)
    this._kolla(dts)
    this._skuggorSteg()
    this._bubblorSteg(dts)
    this._hjalpSteg(dts)
    this._ringSteg()
    this._ottoVisa(dts)
  },

  _ottoMal() {
    const g = this._g
    const o = this._otto
    if (g) {
      if (g.sak && g.sak.tung) {
        const dx = g.sak.x - o.x
        return Math.abs(dx) > 170 ? { x: g.sak.x - Math.sign(dx) * 150, v: 85 } : null
      }
      const ref = g.mode === 'dra' ? g.fing : g.mode === 'bar' ? g.mal : g.mode === 'natt' ? (g.sikte ? { x: g.sikte.x, y: g.sikte.y } : g.mal) : null
      if (ref) {
        const R = REACH * 0.62
        const dx = ref.x - o.x
        if (Math.abs(dx) > R) return { x: ref.x - Math.sign(dx) * R, v: 150 }
      }
      return null
    }
    if (o.heim != null) {
      if (Math.abs(o.heim - o.x) < 4) {
        o.heim = null
        return null
      }
      return { x: o.heim, v: 130 }
    }
    return null
  },

  _ottoSteg(dts) {
    const o = this._otto
    const m = this._ottoMal()
    const vill = m ? clamp((m.x - o.x) * 2.5, -m.v, m.v) : 0
    o.vx += (vill - o.vx) * Math.min(1, dts * 5)
    o.x = clamp(o.x + o.vx * dts, OTTO_MIN, OTTO_MAX)
    this._ottoC.position.set(o.x, OTTO_Y)
    this._ottoC.rotation = (o.vx / 170) * 0.1
    this._ottoSkugga.position.set(o.x, FLOOR - 4)
  },

  _armarSteg(dMs, dts) {
    const o = this._otto
    const g = this._g
    for (const a of this._armar) {
      let mal = null
      let k = 0.06
      if (g && g.arm === a) {
        g.tid += dts
        let tmal = null
        if (g.mode === 'dra') tmal = g.fing
        else if (g.mode === 'natt') {
          if (g.sikte && g.sikte.klar) {
            this._slappG()
            continue
          }
          tmal = g.sikte ? { x: g.sikte.x, y: g.sikte.y } : g.mal
          if ((!g.sikte && g.tid > 0.9) || (g.sikte && g.tid > 3.2)) {
            this._slappG()
            continue
          }
        } else if (g.mode === 'hall') tmal = g.mal
        else if (g.mode === 'bar') tmal = g.mal
        if (g.sak) {
          const it = g.sak
          if (g.mode === 'dra') g.handMal = a.klipp(o.x, o.y, g.fing.x, g.fing.y)
          else if (g.mode === 'bar') g.handMal = a.klipp(o.x, o.y, g.mal.x, g.mal.y)
          else g.handMal = { x: it.x, y: it.y }
          mal = { x: it.x, y: it.y }
          k = 0.9
          a.tryck = 1
          a.langdMotAvstand(o.x, o.y, it.x, it.y)
          if (g.mode === 'bar' && !it.tung) {
            if (Math.hypot(it.x - g.mal.x, it.y - g.mal.y) < 16 || g.tid > 5) {
              this._slappG()
              continue
            }
          }
        } else if (tmal) {
          const c = a.klipp(o.x, o.y, tmal.x, tmal.y)
          mal = c
          k = 0.4
          a.langdMotAvstand(o.x, o.y, c.x, c.y)
          const it = this._kontakt(a, g.sikte)
          if (it) this._fastna(g, it)
        }
      } else if (a.mode === 'peka' && a.pekMal) {
        a.pekT -= dts
        mal = a.pekMal
        k = 0.3
        a.langdMotAvstand(o.x, o.y, mal.x, mal.y)
        if (a.pekT <= 0) {
          a.mode = 'vila'
          a.pekMal = null
          a.vilaLangd()
        }
      } else {
        // vila: spetsen rullas ihop i en spiral (Arm.krulla) i stället för att dras mot en punkt
        a.vilaLangd()
        a.krulla(o.x, this._tid)
        a.tryck = Math.max(0, a.tryck - dts * 4)
        mal = null
      }
      // aktiva armar ritas OVANPÅ sakerna (sugkoppen sitter på dem), vilande UNDER
      const lager = (g && g.arm === a) || a.mode === 'peka' ? this._lArm : this._lArmVila
      if (a.g.parent !== lager) lager.addChild(a.g)
      a.steg(o.x, o.y, dMs, mal, k)
    }
    for (const a of this._armar) ritaArm(a.g, a.rep, this._otto.farg, a.sida, a.tryck)
  },

  _kontakt(arm, sikte) {
    if (!sikte && arm.rorelse < 80) return null
    const t = arm.spets
    let bast = null
    let bd = 1e9
    for (const it of this._saker) {
      if (it.klar || it.hallen) continue
      if (sikte && it !== sikte) continue
      const d = Math.hypot(t.x - it.x, t.y - it.y) - it.r
      if (d <= 22 && d < bd) {
        bd = d
        bast = it
      }
    }
    return bast
  },

  // Burken: fisken lossnar när burken är ≥ 150 px från sitt ställe.
  _kolla() {
    for (const it of this._saker) {
      if (it.hem && !it.lost && !it.klar && Math.hypot(it.x - it.hem.x, it.y - it.hem.y) > BURK_LOS) this._befria(it)
    }
  },

  _underlag(it) {
    const s = this._skepp
    if (s && Math.abs(it.x - s.x) < 136 && it.y + it.r <= s.dackTop + 14) return s.dackTop
    return FLOOR
  },

  _skuggorSteg() {
    for (const it of this._saker) {
      if (it.klar || !it.skugga || it.skugga.destroyed) continue
      const yy = this._underlag(it)
      const h = Math.max(0, yy - (it.y + it.r))
      it.skugga.position.set(it.x, yy - 4)
      const s = 1 / (1 + h / 380)
      it.skugga.scale.set(s, s)
      it.skugga.alpha = 0.35 + 0.65 * s
    }
  },
}
