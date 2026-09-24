// Grodan Slurp 🐸 — en ragdoll-groda med klibbtunga i en damm (fysik, 3–5 år).
//
// Tryck någonstans → tungan skjuts dit och fastnar på det FÖRSTA den träffar. Insekt → in i
// munnen, GULP. Fast eller tung sak → grodan slungas dit och dinglar i tungan. Lätt sak →
// saken kommer farande. Tryck PÅ grodan → hopp. Åtta insekter gör magen rund som en boll.
//
// SUPERHOPPET: HÅLL fingret på grodan. Grodan tar sats (hukar, kisar, darrar, en stigande
// skala), och ju längre man håller desto högre och längre hoppar den. I luften gör den en volt
// och lägger sig platt med magen mot oss (stjärnläget, groda.js) medan den snurrar och
// flänger. Tryck i luften → tungan blir ett klibbigt rep (klibbrep.js). Grodan tumlar klart,
// ligger still en sekund, vaknar och slurpar in repet med allt som fastnat. Ett kort tryck på
// grodan är fortfarande ett vanligt hopp, så ingenting kräver att man kan hålla (P0).
//
// GRODKÖREN är en håll-knapp: håll på de tre ungarna i 2,5 s så kallas grodan hem till
// startbladet. Det är för en groda som fastnat, och kören hejar på ett kort tryck.
//
// Allt i grodans rörelse är fysik (groda.js: aktiv ragdoll med leder och muskler), tungans drag
// fördelas efter massa (tunga.js), och dammen (dammen.js), insekterna (insekter.js) och
// motgången (hinder.js) är egna moduler. Den här filen äger rundan, inputen, rösten och målet —
// och ALLA voice.say-repliker (check.mjs läser bara index.js).
//
// Exit-säkerhet: allt fördröjt går via ctx.later, fysik-krokar kopplas via phys.beforeStep och
// dör med världen, och varje runda river och bygger om hela världen (fysik + moduler).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter, STEG2 } from '../../lib/physics.js'
import { puff, sparkle, ripple, burst } from '../../lib/feedback.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { log } from '../../lib/gamelog.js'
import { bage } from '../../lib/form.js'
import { Groda } from './groda.js'
import { Tunga, RACKVIDD } from './tunga.js'
import { Klibbrep } from './klibbrep.js'
import { Svarm } from './insekter.js'
import { Dammen, YT_Y, TIDER } from './dammen.js'
import { Hinder } from './hinder.js'

const { Body, Query } = Matter

const MAL = 8 // insekter till en rund mage
// Superhoppet: kortare tryck än TAP_GRANS är ett vanligt hopp; full sats efter LADD_FULL s.
// Håller fingret kvar efter full sats hoppar grodan av sig själv (den orkar inte vänta).
const TAP_GRANS = 0.3
const LADD_FULL = 1.55
const LADD_SJALV = LADD_FULL + 1.2
const HEM_TID = 2.5 // s att hålla på grodkören — samma som P0-grinden för en nollställning
const LEMMAR = ['fotN', 'fotB', 'underarmN', 'underarmB', 'vadN', 'vadB']
const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const valj = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Durskala (C-dur) för grodans egna små kvack och finishens melodi.
const SKALA = [262, 294, 330, 349, 392, 440, 494, 523]

export default {
  id: 'grodan-slurp',
  titleSv: 'Grodan Slurp',
  icon: '🐸',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'grodan-slurp',
  voiceIntro: 'Tryck där tungan ska fastna! Fånga flugorna!',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._runda = 0
    this._senasteTid = null
    this._idle = 0
    this._cueIdx = 0
    this._hoppsanT = -99
    this._t = 0
    this._firar = false
    this._superAntal = 0
    this._hoppAntal = 0
    this._tipsat = false

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._scen = new Container()
    this._root.addChild(this._scen)
    this._L = {}
    for (const n of ['himmel', 'bakom', 'grodaBak', 'grodaMitt', 'grodaFram', 'tunga', 'vatten', 'insekter', 'fram', 'effekt']) {
      const c = new Container()
      c.eventMode = 'none'
      c.interactiveChildren = false
      this._L[n] = c
      this._scen.addChild(c)
    }

    // Hela bilden (inkl. bleed) tar emot tryck.
    this._root.eventMode = 'static'
    this._root.hitArea = new Rectangle(-BLEED_X, -BLEED_Y, 1280 + BLEED_X * 2, 720 + BLEED_Y * 2)
    this._onDown = (e) => this._tryck(ctx, e)
    this._root.on('pointerdown', this._onDown)
    // Släppet (sats-hoppet, håll-knappen) sitter på SAMMA rot som trycket — ett släpp når
    // aldrig ett syskon. `pointerupoutside`: fingret gled av bilden innan det lyftes.
    this._onUp = (e) => this._upp(ctx, e)
    for (const ev of ['pointerup', 'pointerupoutside', 'pointercancel']) this._root.on(ev, this._onUp)

    this._byggVarld(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ── Världen (byggs om varje runda) ─────────────────────────────────────────────────────

  _byggVarld(ctx) {
    this._runda++
    const tider = TIDER.filter((t) => t !== this._senasteTid)
    const tid = this._runda === 1 ? 'eftermiddag' : valj(tider)
    this._senasteTid = tid
    this._atna = 0
    this._bommar = 0
    this._firar = false
    this._humla = null
    this._humlaKom = false
    this._guldKom = false
    this._guldRunda = this._runda > 1 && Math.random() < 0.35
    this._ankaKom = false
    this._hinderKlocka = 0
    this._nastaHinder = rnd(9, 13)
    this._senasteHinder = null
    this._skotselKlocka = 0
    this._vattenTid = 0
    this._simKlocka = 0
    this._kvackKlocka = rnd(10, 16)
    this._fallY = null
    this._varPaMark = true
    this._ring = null
    this._magplask = false
    this._undvikit = new WeakSet()
    this._knuff = new WeakMap() // insekt → när en lem senast knuffade den
    this._senastAt = this._t
    this._smallT = -9
    this._smallStyrka = 0
    this._super = null // { fas: 'luft'|'mark'|'vaknar', t0, landT, vakT, uppe, p }
    this._rep = null
    this._ladd = null // { id, t, not, full, trill }
    this._hem = null // { id, t, steg } — håll på grodkören

    const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
    phys.engine.positionIterations = 8
    phys.engine.velocityIterations = 6
    phys.engine.constraintIterations = 5
    this._phys = phys

    const L = this._L
    this._dammen = new Dammen({
      phys,
      lager: { himmel: L.himmel, bakom: L.bakom, vatten: L.vatten, fram: L.fram },
      audio: ctx.services.audio,
      tid,
      view: ctx.view,
    })
    // Vassen är BARA ett mål för tungan: den krockar med ingenting (en sensor ger ändå
    // collisionStart — grodan "tumlade" mot vass hon simmade förbi). Query.point bryr sig
    // inte om filtret, så tungan kan fortfarande fastna i den.
    for (const f of this._dammen.foremal) {
      if (f.typ === 'vass') f.body.collisionFilter = { group: 0, category: 0x0004, mask: 0 }
    }
    const sp = this._dammen.startPunkt
    this._groda = new Groda(phys, { bak: L.grodaBak, mitt: L.grodaMitt, fram: L.grodaFram }, { x: sp.x, y: sp.y, riktning: sp.x < 640 ? 1 : -1 })
    this._groda.ytY = YT_Y
    // Grodan flyter (lite) — huvudet och ryggen över ytan, benen under. Grodan äger sin plats i
    // volymen själv (den kliver ur den under superhoppets luftfas, se groda.js flytIn).
    this._groda.flytIn(this._dammen.flytvolym, (namn) => (namn === 'huvud' ? 2.4 : namn === 'kropp' ? 1.9 : 1.3))

    this._svarm = new Svarm({ lager: L.insekter, ytY: YT_Y, view: ctx.view })
    if (tid === 'skymning') this._svarm.skymning = true

    this._hinder = new Hinder({
      phys,
      lager: { bakom: L.bakom, fram: L.fram },
      dammen: this._dammen,
      ytY: YT_Y,
      pa: {
        borta: (body) => {
          if (this._tunga?.body === body) this._tunga.slapp()
          this._rep?.lossa(body)
        },
      },
    })

    this._tunga = new Tunga({
      groda: this._groda,
      lager: L.tunga,
      ytY: YT_Y,
      hitta: {
        kropp: (ax, ay, bx, by, undanta) => this._hittaKropp(ax, ay, bx, by, undanta),
        inuti: (x, y) => this._inuti(x, y),
        // Smal fångstkorridor: sikthjälpen (tryck NÄRA en insekt) belönar avsikt, men en tunga
        // som sveper förbi i blindo ska inte plocka upp allt i sin väg. Med +30 åt slumptryck
        // i himlen lika många insekter som riktade tryck (_grodspelprobe --kontroll).
        insekt: (ax, ay, bx, by) => this._svarm.traffSegment(ax, ay, bx, by, 12),
      },
      pa: {
        traffKropp: (body, x, y) => this._traffKropp(ctx, body, x, y),
        traffInsekt: (ins) => this._traffInsekt(ctx, ins),
        at: (ins) => this._at(ctx, ins),
        bom: (x, y) => this._bom(ctx, x, y),
        vatten: (x, y) => this._tungVatten(ctx, x, y),
        slappt: () => {},
      },
    })

    // En gång per fast fysiksteg: grodans muskler, tungans fjäder, hindrens rörelser, humlan.
    phys.beforeStep(() => {
      this._groda.steg()
      this._tunga.steg()
      this._rep?.steg()
      this._hinder.steg()
      this._humlaSteg()
    })
    // Byter grodan vy mitt i ett superhopp sitter munnen på ett annat ställe på huvudet.
    this._groda.vidVyByte = () => this._rep?.nyMun()
    // Smällar: grodan tumlar. Materialen låter. Repets länkar nuddar hela tiden — de räknas inte.
    const ejRep = (a, b) => !a.plugin?.repLank && !b.plugin?.repLank
    phys.impactAudio(ctx.services.audio, { minSpeed: 3, vol: 0.2, hardSpeed: 16, filter: ejRep })
    phys.onImpact((h) => this._small(ctx, h), { minSpeed: 5, maxPerFrame: 2, filter: ejRep })

    // Några insekter från start: en lätt fluga nära grodan + en till.
    this._spawnaLatt()
    this._spawnaNagon()
  },

  _rivVarld() {
    this._humla = null
    this._rep?.destroy()
    this._rep = null
    this._super = null
    this._ladd = null
    this._hem = null
    this._hemG = null // ligger i effekt-lagret, rivs med det nedan
    this._tunga?.destroy()
    this._hinder?.destroy()
    this._svarm?.destroy()
    this._groda?.destroy()
    this._dammen?.destroy()
    this._phys?.destroy()
    this._tunga = this._hinder = this._svarm = this._groda = this._dammen = this._phys = null
    for (const n of Object.keys(this._L)) {
      const c = this._L[n]
      if (c.destroyed) continue
      for (const ch of c.removeChildren()) if (!ch.destroyed) ch.destroy({ children: true })
    }
  },

  // ── Input ──────────────────────────────────────────────────────────────────────────────

  _tryck(ctx, e) {
    if (!this._alive || !this._groda) return
    if (e.isPrimary === false) return // inga flerfingergester (P0)
    // Ett nytt tryck medan grodan tar sats betyder att släppet aldrig kom fram (fingret
    // lämnade skärmen på fel ställe). Hoppa nu, så att grodan inte fastnar i satsen.
    if (this._ladd) {
      this._laddaSlapp(ctx)
      return
    }
    const nu = performance.now()
    if (nu - (this._senastTryck || 0) < 90) return
    this._senastTryck = nu
    this._idle = 0
    const p = this._scen.toLocal(e.global)
    const g = this._groda
    const audio = ctx.services.audio

    if (this._firar) {
      // Under firandet: grodan kvackar tillbaka.
      g.kvacka()
      this._kvackLjud(ctx)
      return
    }

    const paGrodan = g.avstand(p.x, p.y) < 82

    // Grodkören är en HÅLL-knapp som kallar hem grodan. Ett kort tryck får kören att heja.
    if (!paGrodan && this._paKoren(p)) {
      this._hem = { id: e.pointerId, t: 0, steg: 0 }
      this._dammen.grodungar.kvack(0)
      return
    }

    // Mitt i ett superhopp: tungan blir ett klibbigt rep, och fler tryck snärtar det.
    if (this._super) {
      this._superTryck(ctx, p, paGrodan)
      return
    }

    // Tryck PÅ grodan → den tar sats. Släpps fingret fort blir det ett vanligt hopp; hålls
    // det kvar växer satsen mot ett superhopp (_update, _laddaSlapp).
    if (paGrodan) {
      if (this._tunga.fast) this._tunga.slapp()
      if (g.kanHoppa && g.laddaStart()) {
        this._ladd = { id: e.pointerId, t: 0, not: -1, full: false, trill: 0 }
        audio.tone({ freq: 196, slideTo: 247, dur: 0.1, type: 'triangle', vol: 0.14 })
        return
      }
      // I luften: ett kvack (roligt, aldrig fel).
      g.kvacka()
      this._kvackLjud(ctx)
      return
    }

    // Tungan är på väg ut eller bär en insekt — titta dit och blinka (varje tryck ger svar).
    if (this._tunga.upptagen) {
      g.tittMal = { x: p.x, y: p.y }
      g.blinka()
      audio.tone({ freq: 660, slideTo: 740, dur: 0.06, type: 'sine', vol: 0.08 })
      return
    }

    // Sikthjälp: tryckte barnet nära en insekt siktar tungan dit den är på väg.
    let mal = { x: p.x, y: p.y }
    const ins = this._svarm.narmast(p.x, p.y, 84)
    if (ins) mal = { x: ins.x + (ins.vx || 0) * 0.09, y: ins.y + (ins.vy || 0) * 0.09 }

    // Insekterna är inte dumma: första gången tungan siktar på en kan den väja (olika ofta per
    // sort). Nästa försök på SAMMA insekt lyckas alltid — försök igen, så går det.
    if (ins && this._atna >= 2 && !this._undvikit.has(ins)) {
      const chans = { fluga: 0.22, mygga: 0.32, trollslanda: 0.5, fjaril: 0.28, eldfluga: 0.18, guldfluga: 0.45 }[ins.typ] || 0
      if (Math.random() < chans) {
        this._undvikit.add(ins)
        const m0 = g.mun()
        const d = Math.hypot(ins.x - m0.x, ins.y - m0.y) || 1
        const sida = Math.random() < 0.5 ? -1 : 1
        const nx = (-(ins.y - m0.y) / d) * sida
        const ny = ((ins.x - m0.x) / d) * sida
        this._svarm.skramma(ins.x - nx * 14, ins.y - ny * 14, 50)
        audio.tone({ freq: 1100, slideTo: 1900, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.05 })
        log('grodan', 'undvek', { typ: ins.typ })
      }
    }

    // Sitter grodan och målet ligger bakom den: ett litet vändhopp först.
    const dx = mal.x - g.pos.x
    if (g.paMark && !this._tunga.fast && Math.sign(dx) !== g.riktning && Math.abs(dx) > 40) {
      g.vand()
      g.knuffa(0, -2.6, 0.5)
    }
    g.tittMal = mal
    this._tunga.skjut(mal.x, mal.y)
    if (!audio.sample('thwip')) audio.tone({ freq: 700, slideTo: 1400, dur: 0.09, type: 'sine', vol: 0.2 })
    log('grodan', 'tunga', { x: Math.round(mal.x), y: Math.round(mal.y), sikt: !!ins })
  },

  _upp(ctx, e) {
    if (!this._alive || !this._groda) return
    if (this._ladd && e.pointerId === this._ladd.id) this._laddaSlapp(ctx)
    if (this._hem && e.pointerId === this._hem.id) {
      const kort = this._hem.t < 0.35
      this._hem = null
      if (kort && !this._firar) this._dammen?.grodungar.heja()
    }
  },

  // Trycket träffade grodkörens blad (hörnet mitt emot trädet)?
  _paKoren(p) {
    const k = this._dammen?.grodungar?.plats
    return !!k && Math.abs(p.x - k.x) < 125 && p.y > k.y - 88 && p.y < k.y + 45
  },

  // ── Superhoppet ────────────────────────────────────────────────────────────────────────

  _laddaSlapp(ctx) {
    const l = this._ladd
    this._ladd = null
    const g = this._groda
    if (!l || !g) return
    if (!g.kanHoppa) {
      // Släppt precis i ett gupp: hoppet väntar in fästet (högst 0,3 s, se _laddUppdatera).
      if ((l.utan || 0) <= 0.3) {
        l.slappt = true
        this._ladd = l
      } else g.laddaAvbryt()
      return
    }
    if (l.t < TAP_GRANS) {
      g.laddaAvbryt()
      this._vanligtHopp(ctx)
      return
    }
    this._superHopp(ctx, Math.min(1, (l.t - TAP_GRANS) / (LADD_FULL - TAP_GRANS)))
  },

  _vanligtHopp(ctx) {
    const g = this._groda
    const audio = ctx.services.audio
    if (g.hoppa(g.riktning)) {
      audio.tone({ freq: 240, slideTo: 560, dur: 0.14, type: 'triangle', vol: 0.22 })
      puff(ctx.fxLayer, g.pos.x, g.pos.y + 30, { count: 5, color: 0xd9f0c0 })
      log('grodan', 'hopp', { x: Math.round(g.pos.x), vatten: g.iVatten })
      // Andra vanliga hoppet utan att barnet hittat superhoppet: berätta en gång.
      if (++this._hoppAntal === 2 && !this._superAntal && !this._tipsat) {
        this._tipsat = true
        ctx.narTyst(() => this._alive && !this._firar && !this._superAntal && ctx.services.voice.say('Håll kvar fingret på grodan för ett superhopp!'))
      }
    } else {
      g.kvacka()
      this._kvackLjud(ctx)
    }
  },

  _superHopp(ctx, p) {
    const g = this._groda
    const audio = ctx.services.audio
    this._tunga.nollstall()
    const blad = g.underlag?.label === 'blad' ? g.underlag : null
    if (!g.superHopp(p, g.riktning)) return
    this._super = { fas: 'luft', t0: this._t, landT: null, vakT: null, uppe: false, p }
    this._superAntal++
    if (!audio.sample('whoosh')) audio.tone({ freq: 300, slideTo: 900, dur: 0.35, type: 'sine', vol: 0.14 })
    audio.tone({ freq: 220, slideTo: 880 + 300 * p, dur: 0.28, type: 'triangle', vol: 0.2 })
    puff(ctx.fxLayer, g.pos.x, g.pos.y + 34, { count: Math.round(7 + p * 8), color: 0xd9f0c0 })
    if (blad) this._dammen.bladTryck(blad, 0.6 + 0.4 * p)
    const voice = ctx.services.voice
    if ((this._superAntal <= 2 || Math.random() < 0.35) && !voice.talar) voice.say('Superhopp!')
    log('grodan', 'superhopp', { p: Math.round(p * 100) / 100 })
  },

  // Ett tryck mitt i superhoppet. Första gången åker tungan ut som ett rep: på grodan dit
  // hjässan pekar ("tungan åker bara ut"), annars mot fingret. Sedan snärtar varje tryck repet.
  _superTryck(ctx, p, paGrodan) {
    const s = this._super
    const g = this._groda
    const audio = ctx.services.audio
    if (s.fas === 'vaknar' || s.uppe) {
      g.blinka()
      audio.tone({ freq: 660, slideTo: 740, dur: 0.06, type: 'sine', vol: 0.08 })
      return
    }
    if (!this._rep) {
      let ux
      let uy
      if (paGrodan) {
        const u = g.upp()
        const a = Math.atan2(u.y, u.x) + rnd(-0.5, 0.5)
        ux = Math.cos(a)
        uy = Math.sin(a)
      } else {
        const m = g.mun()
        const d = Math.hypot(p.x - m.x, p.y - m.y) || 1
        ux = (p.x - m.x) / d
        uy = (p.y - m.y) / d
      }
      this._rep = new Klibbrep({
        phys: this._phys,
        groda: g,
        lager: this._L.tunga,
        flytvolym: this._dammen.flytvolym,
        svarm: this._svarm,
        hitta: { maskKroppar: () => this._dammen.foremal.filter((f) => f.typ === 'vass').map((f) => f.body) },
        pa: {
          fastnade: (body, x, y) => this._repFast(ctx, body, x, y),
          fangade: (ins) => this._repFangade(ctx, ins),
          at: (ins) => this._at(ctx, ins),
        },
      })
      this._rep.skjut(ux, uy)
      g.oppnaMun(1)
      if (!audio.sample('thwip')) audio.tone({ freq: 700, slideTo: 1400, dur: 0.09, type: 'sine', vol: 0.2 })
      log('grodan', 'rep', { paGrodan })
      return
    }
    this._rep.snart(p.x, p.y)
    g.sprattla()
    audio.tone({ freq: 520, slideTo: 980, dur: 0.1, type: 'sine', vol: 0.14 })
  },

  _repFast(ctx, body, x, y) {
    const audio = ctx.services.audio
    audio.tone({ freq: 430, slideTo: 250, dur: 0.1, type: 'triangle', vol: 0.22 })
    sparkle(ctx.fxLayer, x, y, { count: 4 })
    // Fast i något som håller grodan kvar: den hänger slak och dinglar (räknas som landning).
    if (this._rep?.ankrad) this._groda.landa()
    if ((body.label === 'skoldpadda' || body.label === 'anka') && !ctx.services.voice.talar) {
      ctx.services.voice.say('Grodan åker vattenskidor!')
    }
    log('grodan', 'repFast', { mal: body.label, statisk: !!body.isStatic })
  },

  _repFangade(ctx, ins) {
    ctx.services.audio.tone({ freq: 880, slideTo: 1320, dur: 0.07, type: 'sine', vol: 0.16 })
    sparkle(ctx.fxLayer, ins.x, ins.y, { count: 3 })
    log('grodan', 'repInsekt', { typ: ins.typ })
  },

  // Per bildruta medan fingret håller på grodan: satsen växer, en stämd skala klättrar, och
  // vid full sats en glittrande "redo"-trill.
  _laddUppdatera(ctx, dtS) {
    const l = this._ladd
    if (!l) return
    const g = this._groda
    const audio = ctx.services.audio
    // Knuffad av bladet mitt i satsen (kotte, fisk) — satsen rinner ut, inget straff. Ett
    // kort ögonblick utan fäste (ett gupp) räknas inte.
    l.utan = g.kanHoppa ? 0 : (l.utan || 0) + dtS
    if (l.utan > 0.3) {
      this._ladd = null
      g.laddaAvbryt()
      return
    }
    if (l.slappt) {
      if (g.kanHoppa) this._laddaSlapp(ctx)
      return
    }
    l.t += dtS
    g.setLaddning(Math.min(1, l.t / LADD_FULL))
    g.tittMal = { x: g.pos.x + g.riktning * 260, y: g.pos.y - 240 }
    if (l.t > TAP_GRANS) {
      const not = Math.min(7, Math.floor(((l.t - TAP_GRANS) / (LADD_FULL - TAP_GRANS)) * 8))
      if (not > l.not) {
        l.not = not
        audio.tone({ freq: SKALA[not], dur: 0.1, type: 'triangle', vol: 0.12 + not * 0.01 })
      }
    }
    if (l.t >= LADD_FULL && !l.full) {
      l.full = true
      const k = g.pos
      sparkle(ctx.fxLayer, k.x, k.y + 20, { count: 8 })
      audio.tone({ freq: 523, dur: 0.18, type: 'triangle', vol: 0.14 })
      audio.tone({ freq: 784, dur: 0.18, type: 'triangle', vol: 0.1, delay: 0.04 })
    }
    if (l.full) {
      l.trill -= dtS
      if (l.trill <= 0) {
        l.trill = 0.13
        l.hog = !l.hog
        audio.tone({ freq: l.hog ? 1047 : 880, dur: 0.07, type: 'sine', vol: 0.06 })
      }
    }
    if (l.t > LADD_SJALV) this._laddaSlapp(ctx)
  },

  // Superhoppets förlopp: luft → mark (tumlar) → vaknar (en sekund stilla) → uppe (på benen,
  // repet slurpas in) → klart.
  _superUppdatera(ctx) {
    const s = this._super
    if (!s || this._firar) return
    const g = this._groda
    const audio = ctx.services.audio
    if (s.fas === 'luft' && g.landat) {
      s.fas = 'mark'
      s.landT = this._t
    }
    if (s.fas === 'luft' || s.fas === 'mark') {
      const vilat = g.vilSteg >= 60
      const lange = s.landT !== null && this._t - s.landT > 5.5
      const evigt = this._t - s.t0 > 11
      if (vilat || lange || evigt) {
        s.fas = 'vaknar'
        s.vakT = this._t
        g.vaknaTill()
        audio.tone({ freq: 392, slideTo: 523, dur: 0.12, type: 'triangle', vol: 0.18 })
        log('grodan', 'vaknarTill', { vilat, lange, evigt })
      }
      return
    }
    if (s.fas === 'vaknar' && !s.uppe) {
      if (this._t - s.vakT < 0.45) return
      s.uppe = true
      // Vänd mot närmaste insekt (annars mot dammens mitt) när den kommer på benen.
      const ins = this._svarm.narmast(g.pos.x, g.pos.y, 900)
      const dir = Math.sign((ins ? ins.x : 640) - g.pos.x) || 1
      const antal = this._rep?.antalInsekter ?? 0
      this._rep?.slurpa()
      g.vakna(dir)
      puff(ctx.fxLayer, g.pos.x, g.pos.y + 24, { count: 6, color: 0xd9f0c0 })
      audio.tone({ freq: 262, slideTo: 523, dur: 0.16, type: 'triangle', vol: 0.2 })
      if (antal && !audio.sample('slurp')) audio.tone({ freq: 900, slideTo: 300, dur: 0.3, type: 'sine', vol: 0.16 })
      log('grodan', 'vaknar', { insekter: antal })
      return
    }
    if (s.uppe && (!this._rep || this._rep.klar)) {
      this._rep?.destroy()
      this._rep = null
      this._super = null
      if (Math.random() < 0.5 && !ctx.services.voice.talar) ctx.services.voice.say('Vilken volt!')
    }
  },

  // Mitt i superhoppet äter grodan det den far in i — med munnen, huvudet eller magen — och
  // lemmarna som sveper förbi knuffar undan insekter.
  _superAta(ctx) {
    const g = this._groda
    const m = g.mun()
    const hp = g.b.huvud.position
    const k = g.pos
    const ins = this._svarm.narmast(m.x, m.y, 50) || this._svarm.narmast(hp.x, hp.y, 44) || this._svarm.narmast(k.x, k.y, 44)
    if (ins) {
      g.oppnaMun(1)
      this._svarm.fanga(ins)
      ins.x = m.x
      ins.y = m.y
      log('grodan', 'munnen', { typ: ins.typ, super: true })
      this._at(ctx, ins)
      ctx.later(0.18, () => this._alive && this._groda === g && !this._rep && this._tunga?.lage === 'av' && g.oppnaMun(0))
    }
    for (const namn of LEMMAR) {
      const b = g.b[namn]
      if (Math.hypot(b.velocity.x, b.velocity.y) < 4.5) continue
      const n = this._svarm.narmast(b.position.x, b.position.y, 34)
      if (!n || (this._knuff.get(n) ?? -9) > this._t - 0.5) continue
      this._knuff.set(n, this._t)
      this._svarm.skramma(b.position.x, b.position.y, 34 + n.r)
      ctx.services.audio.tone({ freq: 1200, slideTo: 1600, dur: 0.05, type: 'sine', vol: 0.06 })
    }
  },

  // Avbryt superhoppet direkt (grodan kallas hem eller rymde). Läget sätts av anroparen.
  _avslutaSuper() {
    this._rep?.destroy()
    this._rep = null
    this._super = null
    if (this._ladd) {
      this._ladd = null
      this._groda?.laddaAvbryt()
    }
    this._groda?.avbrytSuper()
  },

  // ── Grodkören: håll för att kalla hem grodan ───────────────────────────────────────────

  _hemUppdatera(ctx, dtS) {
    const h = this._hem
    if (h) {
      h.t += dtS
      const steg = Math.floor(h.t / 0.45)
      if (steg > h.steg && steg < 6) {
        h.steg = steg
        this._dammen.grodungar.kvack(steg)
      }
      if (h.t >= HEM_TID) this._kallaHem(ctx)
    }
    this._ritaHemRing()
  },

  // En ring som fylls runt kören medan fingret håller — föräldern ser att något händer.
  _ritaHemRing() {
    const h = this._hem
    if (!h) {
      if (this._hemG && !this._hemG.destroyed) this._hemG.clear()
      return
    }
    if (!this._hemG || this._hemG.destroyed) {
      this._hemG = new Graphics()
      this._L.effekt.addChild(this._hemG)
    }
    const k = this._dammen.grodungar.plats
    const g = this._hemG
    const u = Math.min(1, h.t / HEM_TID)
    const cx = k.x
    const cy = k.y - 30
    g.clear()
    g.circle(cx, cy, 82).stroke({ width: 10, color: 0xffffff, alpha: 0.28 })
    if (u > 0.01) bage(g, cx, cy, 82, -Math.PI / 2, -Math.PI / 2 + u * TAU).stroke({ width: 10, color: 0xfff6c8, alpha: 0.95, cap: 'round' })
  },

  _kallaHem(ctx) {
    this._hem = null
    const g = this._groda
    if (!g || this._firar) return
    const audio = ctx.services.audio
    puff(ctx.fxLayer, g.pos.x, g.pos.y, { count: 10, color: 0xd9f0c0 })
    this._avslutaSuper()
    this._tunga.nollstall()
    const sp = this._dammen.startPunkt
    g.teleportera(sp.x, sp.y, sp.x < 640 ? 1 : -1)
    puff(ctx.fxLayer, sp.x, sp.y, { count: 12, color: 0xd9f0c0 })
    sparkle(ctx.fxLayer, sp.x, sp.y - 20, { count: 8 })
    this._dammen.grodungar.heja()
    ;[523, 659, 784, 1047].forEach((f, i) => audio.tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.16, delay: i * 0.08 }))
    if (!ctx.services.voice.talar) ctx.services.voice.say('Grodan hoppar hem!')
    log('grodan', 'hem', {})
  },

  // ── Tungans träffar ────────────────────────────────────────────────────────────────────

  _klibbKroppar() {
    const lista = this._dammen.foremal.map((f) => f.body)
    for (const b of this._hinder.kroppar()) lista.push(b)
    return lista
  },

  // Kroppar som munnen redan sitter inne i (vassen grodan simmar bland) — tungan går igenom dem.
  _inuti(x, y) {
    return Query.point(this._klibbKroppar(), { x, y }).map((b) => b.parent || b)
  },

  _hittaKropp(ax, ay, bx, by, undanta = []) {
    const kroppar = this._klibbKroppar().filter((b) => !undanta.includes(b))
    const d = Math.hypot(bx - ax, by - ay)
    const n = Math.max(1, Math.ceil(d / 7))
    for (let i = 1; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n
      const y = ay + ((by - ay) * i) / n
      const traff = Query.point(kroppar, { x, y })
      if (traff.length) return { body: traff[0].parent || traff[0], x, y }
    }
    return null
  },

  _traffKropp(ctx, body, x, y) {
    const audio = ctx.services.audio
    audio.tone({ freq: 430, slideTo: 250, dur: 0.1, type: 'triangle', vol: 0.24 })
    sparkle(ctx.fxLayer, x, y, { count: 4 })
    const tung = body.isStatic || body.mass >= this._groda.massa * 0.7
    if (tung) this._groda.lage = 'dingla'
    if ((body.label === 'skoldpadda' || body.label === 'anka') && !ctx.services.voice.talar) {
      ctx.services.voice.say('Grodan åker vattenskidor!')
    }
    log('grodan', 'fast', { mal: body.label, statisk: !!body.isStatic })
  },

  _traffInsekt(ctx, ins) {
    this._svarm.fanga(ins)
    ctx.services.audio.tone({ freq: 880, slideTo: 1320, dur: 0.07, type: 'sine', vol: 0.16 })
    if (ins.typ === 'humla') this._startaHumla(ctx, ins)
  },

  _at(ctx, ins) {
    if (!ins || ins.dod) return
    const g = this._groda
    const audio = ctx.services.audio
    this._svarm.ata(ins)
    this._atna++
    this._bommar = 0
    this._senastAt = this._t
    g.svalj()
    g.setMage(this._atna / MAL)
    const m = g.mun()
    sparkle(ctx.fxLayer, m.x, m.y, { count: ins.sallsynt ? 14 : 6 })
    if (ins.sallsynt) burst(ctx.fxLayer, m.x, m.y, { count: 16, colors: [0xffd84a, 0xfff2a8, 0xf5b83a], power: 0.8 })
    if (!audio.sample('svalj')) audio.tone({ freq: 330, slideTo: 150, dur: 0.18, type: 'sine', vol: 0.26 })
    audio.tone({ freq: SKALA[Math.min(7, this._atna - 1)] * 2, dur: 0.12, type: 'triangle', vol: 0.14, delay: 0.12 })
    this._dammen.grodungar.kvack(Math.min(7, this._atna - 1))
    log('grodan', 'at', { typ: ins.typ, atna: this._atna })

    const voice = ctx.services.voice
    if (this._atna >= MAL) {
      // Repet kan bära flera insekter förbi målet — de äts, men firandet startar EN gång.
      if (!this._firar) this._mal(ctx)
      return
    }
    if (ins.sallsynt && !voice.talar) voice.say('Oj, en guldfluga!')
    else if (this._atna === 6) ctx.narTyst(() => this._alive && !this._firar && voice.say('Magen är nästan full!'))
    else if ((this._atna === 1 || Math.random() < 0.35) && !voice.talar) voice.say('Mums! En fluga till!')
  },

  _bom(ctx, x, y) {
    this._bommar++
    ctx.services.audio.tone({ freq: 380, slideTo: 820, dur: 0.15, type: 'sine', vol: 0.18 })
    this._svarm.skramma(x, y, 120)
    if (this._bommar >= 5 && this._t - this._senastAt > 12) this._autohjalp()
  },

  _tungVatten(ctx, x, y) {
    this._bommar++
    this._dammen.plask(x, 0.35)
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.tone({ freq: 520, slideTo: 260, dur: 0.12, type: 'sine', vol: 0.2 })
    if (this._bommar >= 5 && this._t - this._senastAt > 12) this._autohjalp()
  },

  // ── Humlan: en insekt med massa som drar i tungan ─────────────────────────────────────

  _startaHumla(ctx, ins) {
    const r = 16
    const massa = this._groda.massa * 0.5
    const body = this._phys.circle(ins.x, ins.y, r, {
      density: massa / (Math.PI * r * r),
      frictionAir: 0.04,
      collisionFilter: { group: 0, category: 0x0002, mask: 0 },
      label: 'humla',
    })
    body.plugin = body.plugin || {}
    body.plugin.hallFast = true
    this._humla = { ins, body, tid: 0, trott: false, dir: -Math.PI / 2 + rnd(-0.8, 0.8) }
    this._tunga.fastPa(body)
    this._groda.lage = 'dingla'
    if (!ctx.services.audio.sample('djur_bi')) ctx.services.audio.tone({ freq: 180, dur: 0.4, type: 'sawtooth', vol: 0.08 })
    if (!ctx.services.voice.talar) ctx.services.voice.say('En humla! Den drar i tungan!')
  },

  _humlaSteg() {
    const h = this._humla
    if (!h) return
    const b = h.body
    const tunga = this._tunga
    if (tunga.body !== b) {
      // Tungan släpptes — humlan flyger fri igen.
      this._phys.removeBody(b)
      if (!h.ins.dod) {
        h.ins.fangad = false
        this._svarm.slapp(h.ins)
      }
      this._humla = null
      return
    }
    h.tid++
    const antiG = b.mass * this._phys.engine.gravity.y * 0.001
    if (!h.trott) {
      h.dir += rnd(-0.22, 0.22)
      h.dir = Math.max(-Math.PI + 0.2, Math.min(-0.2, h.dir)) // uppåt-ish
      const a = 0.4
      Body.applyForce(b, b.position, { x: (Math.cos(h.dir) * a * b.mass) / STEG2, y: (Math.sin(h.dir) * a * b.mass) / STEG2 - antiG })
      if (h.tid > 60 * 2.6) h.trott = true
    } else {
      Body.applyForce(b, b.position, { x: 0, y: -antiG * 0.55 })
      if (tunga.langd < 74) {
        tunga.nollstall()
        this._phys.removeBody(b)
        this._humla = null
        this._at(this._ctx, h.ins)
        return
      }
    }
    h.ins.x = b.position.x
    h.ins.y = b.position.y
  },

  // ── Smällar ────────────────────────────────────────────────────────────────────────────

  _small(ctx, h) {
    const g = this._groda
    if (!g || this._firar) return
    const aG = g.ar(h.a)
    const bG = g.ar(h.b)
    if (aG === bG) return
    const annan = aG ? h.b : h.a
    if (annan.label === 'wall' || annan.isSensor) return
    const hart = annan.label === 'kotte' || annan.label === 'fisk' || annan.label === 'skoldpadda' || annan.label === 'sten' || annan.label === 'anka' || annan.label === 'stock' || annan.label === 'stam'
    // En groda LANDAR på fötterna: ben/fötter som tar emot är en landning (hög tröskel), men
    // huvud eller kropp in i något — det är en smäll, och hårda saker smäller tidigare.
    const del = (aG ? h.a : h.b).plugin?.grodDel || ''
    const ben = /^(fot|vad|lar)/.test(del)
    const trosk = ben ? (hart ? 13 : 16) : hart ? 6.5 : 11
    if (h.speed < trosk) return
    const styrka = Math.min(1, (h.speed - trosk + 2) / 10)
    // Flera kroppsdelar slår i samma sten i samma ögonblick — det är EN smäll, inte åtta.
    if (this._t - (this._smallT ?? -9) < 0.6 && styrka <= (this._smallStyrka ?? 0) + 0.25) return
    this._smallT = this._t
    this._smallStyrka = styrka
    g.slappna(styrka)
    const vilken = aG ? h.a : h.b
    if (vilken.plugin?.grodDel === 'huvud' || styrka > 0.6) g.yr(1.2 + styrka)
    puff(ctx.fxLayer, h.x, h.y, { count: 6, color: 0xfff4c8 })
    if (!ctx.services.audio.sample(styrka > 0.5 ? 'traff_hard' : 'traff_mjuk')) {
      ctx.services.audio.tone({ freq: 200, slideTo: 120, dur: 0.12, type: 'triangle', vol: 0.22 })
    }
    this._dammen.grodungar.heja()
    // Superhoppets tumlande är meningen, inte en olycka — där säger ingen "hoppsan".
    if (!this._super && this._t - this._hoppsanT > 12 && !ctx.services.voice.talar) {
      this._hoppsanT = this._t
      ctx.services.voice.say('Hoppsan! Grodan tumlade runt!')
    }
    log('grodan', 'small', { mot: annan.label, fart: Math.round(h.speed) })
  },

  // ── Insekterna ─────────────────────────────────────────────────────────────────────────

  // Lätt fluga inom räckhåll från där grodan är nu.
  _spawnaLatt() {
    const g = this._groda
    const m = g.mun()
    const hx = Math.max(160, Math.min(1120, m.x + g.riktning * rnd(90, 200)))
    const hy = Math.max(140, Math.min(YT_Y - 150, m.y - rnd(150, 240)))
    const fran = Math.random() < 0.5 ? -60 : 1340
    const typ = this._svarm.skymning && Math.random() < 0.5 ? 'eldfluga' : 'fluga'
    return this._svarm.spawn(typ, { x: fran, y: rnd(120, 300), hem: { x: hx, y: hy, r: 90 } })
  },

  // En insekt någonstans i dammen — typen följer hur långt barnet kommit.
  _spawnaNagon() {
    const a = this._atna
    let typ = 'fluga'
    if (a >= 2) {
      const pool = ['fluga', 'fjaril', 'trollslanda', this._svarm.skymning ? 'eldfluga' : 'mygga']
      typ = valj(pool)
    }
    if (!this._humlaKom && a >= 3 && a <= 6 && Math.random() < 0.45) {
      typ = 'humla'
      this._humlaKom = true
    }
    if (this._guldRunda && !this._guldKom && a >= 3 && Math.random() < 0.5) {
      typ = 'guldfluga'
      this._guldKom = true
    }
    // Hem: högt uppe eller långt bort — de svåra insekterna kräver att grodan tar sig dit.
    const hoga = typ === 'fjaril' || typ === 'trollslanda' || typ === 'guldfluga' || Math.random() < 0.4
    const m = this._groda.mun()
    let hem = null
    // Andra halvan: helst ett hem UTOM räckhåll från där grodan sitter nu.
    for (let forsok = 0; forsok < 8; forsok++) {
      hem = {
        x: rnd(200, 1080),
        y: hoga ? rnd(170, 250) : rnd(230, YT_Y - 120),
        r: typ === 'trollslanda' ? 200 : typ === 'fjaril' ? 150 : 110,
      }
      if (a < 4 || Math.hypot(hem.x - m.x, hem.y - m.y) > RACKVIDD + 40) break
    }
    const fran = Math.random() < 0.5 ? -70 : 1350
    const ins = this._svarm.spawn(typ, { x: fran, y: rnd(80, 320), hem })
    if (typ === 'guldfluga' && !this._ctx.services.voice.talar) this._ctx.services.voice.say('Oj, en guldfluga!')
    return ins
  },

  _skotsel() {
    if (this._firar) return
    const m = this._groda.mun()
    const lista = this._svarm.lista
    // Räkna på insektens HEM, inte var den är just nu: en fluga som är på väg in utifrån är
    // redan "nära" — annars spawnades en ny var 0,6 s tills den första hunnit fram.
    const lattNara = lista.some((i) => {
      if (i.typ !== 'fluga' && i.typ !== 'tjockfluga' && i.typ !== 'eldfluga') return false
      const h = i.hem || i
      return Math.hypot(h.x - m.x, h.y - m.y) < RACKVIDD - 60
    })
    // Första halvan: alltid en lätt fluga inom räckhåll (även en 3-åring får sitt GULP).
    // Andra halvan: insekterna sätter sig där grodan måste TA SIG dit — hoppa, svinga, dra
    // stocken närmare. Hjälpen kommer då först efter bommar eller lång tid (_autohjalp).
    if (!lattNara && lista.length < 6 && this._atna < 4) {
      this._spawnaLatt()
      return
    }
    const mal = Math.min(5, 3 + Math.floor(this._atna / 3))
    if (lista.length < mal) this._spawnaNagon()
    // Ingen insekt på länge (barnet hoppar bara, eller siktar ingenstans): hjälpen kommer, sent.
    if (this._t - this._senastAt > 25 && this._t - (this._hjalpT ?? -99) > 25) this._autohjalp()
  },

  // Efter fyra bommar i rad: en tjock, trött fluga sjunker ned framför grodan.
  _autohjalp() {
    this._bommar = 0
    this._hjalpT = this._t
    const g = this._groda
    const m = g.mun()
    const hem = { x: Math.max(150, Math.min(1130, m.x + g.riktning * 130)), y: Math.max(120, Math.min(YT_Y - 110, m.y - 110)), r: 40 }
    const finns = this._svarm.lista.find((i) => i.typ === 'tjockfluga')
    if (finns) this._svarm.setHem(finns, hem)
    else this._svarm.spawn('tjockfluga', { x: hem.x + rnd(-80, 80), y: 40, hem })
    log('grodan', 'autohjalp', {})
  },

  // ── Målet ──────────────────────────────────────────────────────────────────────────────

  _mal(ctx) {
    this._firar = true
    this._hinder.avsluta()
    const g = this._groda
    const audio = ctx.services.audio
    ctx.later(0.5, () => {
      if (!this._alive || !this._groda) return
      // Mitt i ett superhopp: repet släpper det det bär och grodan kommer på benen direkt.
      if (this._super || g.superFas) {
        this._rep?.destroy()
        this._rep = null
        this._super = null
        this._ladd = null
        g.laddaAvbryt()
        g.vakna(g.riktning)
      }
      this._tunga.nollstall()
      // 1. Jätterapen: munnen upp, en bubbelring rullar ut över dammen.
      g.oppnaMun(1)
      g.kvacka()
      const m = g.mun()
      this._ring = { x: m.x, y: m.y, r: 10, t: 0 }
      for (let i = 0; i < 9; i++) {
        audio.tone({ freq: 104 + (i % 3) * 6, dur: 0.07, type: 'triangle', vol: 0.3, delay: i * 0.055 })
      }
      audio.tone({ freq: 150, slideTo: 70, dur: 0.5, type: 'sine', vol: 0.3, delay: 0.1 })
      for (let i = 0; i < 6; i++) puff(ctx.fxLayer, m.x + g.riktning * 20, m.y - 10, { count: 3, color: 0xdff4ff })
    })
    ctx.later(1.5, () => {
      if (!this._alive || !this._groda) return
      g.oppnaMun(0)
      // 2. Magplask: ett högt hopp rakt upp mot vattnet.
      g.kraft = 1
      g.knuffa(g.riktning * 1.5, -13.5, 1)
      this._magplask = true
      audio.tone({ freq: 220, slideTo: 660, dur: 0.3, type: 'triangle', vol: 0.22 })
    })
    ctx.later(3.1, () => {
      if (!this._alive || !this._groda) return
      // 3. Grodkören + grodans egen replik FÖRE complete().
      ctx.services.voice.say('Vilken mätt groda! Kvack kvack!')
      const dur = this._dammen.grodungar.kor() || 2.2
      if (!audio.sample('djur_groda')) audio.tone({ freq: 140, slideTo: 110, dur: 0.3, type: 'triangle', vol: 0.3 })
      for (let i = 0; i < 4; i++) ctx.later(0.5 * i, () => this._alive && this._groda?.kvacka())
      ctx.later(dur + 0.2, () => {
        if (!this._alive) return
        ctx.progress.complete()
        ctx.later(3.2, () => ctx.narTyst(() => this._nyRunda(ctx)))
      })
    })
  },

  _nyRunda(ctx) {
    if (!this._alive) return
    gsap.killTweensOf(this._scen)
    gsap.to(this._scen, {
      alpha: 0,
      duration: 0.35,
      onComplete: () => {
        if (!this._alive || this._scen.destroyed) return
        this._rivVarld()
        this._byggVarld(ctx)
        gsap.to(this._scen, { alpha: 1, duration: 0.4 })
        ctx.narTyst(() => this._alive && ctx.services.voice.say(this.voiceIntro))
      },
    })
  },

  // ── Per bildruta ───────────────────────────────────────────────────────────────────────

  _update(ctx, ticker) {
    if (!this._alive || !this._phys) return
    const dtS = Math.min(0.05, ticker.deltaMS / 1000)
    this._t += dtS
    const t = this._t
    const g = this._groda
    const voice = ctx.services.voice

    // Vinden (hinder) blåser på insekterna och på en groda i luften.
    const vind = this._hinder.vind
    this._svarm.setVind(vind * 160)
    this._phys.setWind(g.paMark ? 0 : (vind * 0.07) / STEG2, 0)

    this._dammen.steg(t)
    this._phys.update(ticker.deltaMS)

    this._laddUppdatera(ctx, dtS)
    this._superUppdatera(ctx)
    this._hemUppdatera(ctx, dtS)

    g.rita(dtS)
    this._tunga.rita()
    this._rep?.rita(dtS)
    this._svarm.uppdatera(dtS, t)
    this._dammen.rita(dtS, t)
    this._hinder.rita(dtS, t)
    this._ritaRing(dtS)

    // Grodan rymde / blev trasig → tillbaka på startbladet med en puff.
    const p = g.pos
    if (g.trasig() || p.x < -120 || p.x > 1400 || p.y > 800 || p.y < -900) {
      this._avslutaSuper()
      this._tunga.nollstall()
      const sp = this._dammen.startPunkt
      g.teleportera(sp.x, sp.y)
      puff(ctx.fxLayer, sp.x, sp.y, { count: 10, color: 0xd9f0c0 })
      log('grodan', 'aterstall', {})
    }

    // Plask när grodan slår i vattnet.
    const vy = g.b.kropp.velocity.y
    if (this._fallY !== null && this._fallY < YT_Y - 4 && p.y >= YT_Y - 4 && vy > 2) {
      const styrka = Math.min(1, vy / 13 + (this._magplask ? 0.6 : 0))
      this._dammen.plask(p.x, styrka)
      puff(ctx.fxLayer, p.x, YT_Y - 6, { count: Math.round(4 + styrka * 8), color: 0xcfeeff })
      if (!ctx.services.audio.sample('plopp')) ctx.services.audio.tone({ freq: 480, slideTo: 200, dur: 0.16, type: 'sine', vol: 0.24 })
      if (this._magplask) ripple(ctx.fxLayer, p.x, YT_Y, { color: 0xffffff, maxR: 180, duration: 0.8, width: 8 })
      this._magplask = false
    }
    this._fallY = p.y

    // Landning på ett blad: bladet gungar.
    const paMark = g.paMark
    if (paMark && !this._varPaMark && g.underlag?.label === 'blad') this._dammen.bladTryck(g.underlag, Math.min(1, Math.abs(vy) / 8 + 0.3))
    if (paMark && !this._varPaMark && this._magplask && g.underlag?.label !== 'blad') this._magplask = false
    this._varPaMark = paMark

    // Munnen äter själv: en groda som far genom luften (hopp, sving, slungad av tungan) med
    // en insekt i vägen gapar och sväljer den — utan tunga. Så kan ett vilt hopp bli ett GULP.
    if (!this._firar && this._tunga.lage !== 'bar' && (g.lage === 'luft' || g.lage === 'dingla' || g.lage === 'slak') && g.fart > 3.5) {
      const m = g.mun()
      const ins = this._svarm.narmast(m.x, m.y, 46)
      if (ins && ins.typ !== 'humla') {
        g.oppnaMun(1)
        this._svarm.fanga(ins)
        ins.x = m.x
        ins.y = m.y
        this._flygGulp = true
        log('grodan', 'munnen', { typ: ins.typ })
        this._at(ctx, ins)
        ctx.later(0.18, () => this._alive && this._groda === g && this._tunga?.lage === 'av' && g.oppnaMun(0))
      }
    }
    if (!this._firar && this._super && !this._super.uppe && g.lage === 'super') this._superAta(ctx)

    // Blicken: närmaste insekt när tungan vilar (under satsen tittar grodan dit den ska hoppa).
    if (this._tunga.lage === 'av' && !this._ladd) {
      const m = g.mun()
      const ins = this._svarm.narmast(m.x, m.y, 600)
      if (ins) g.tittMal = { x: ins.x, y: ins.y }
    }

    // Grodan i vattnet utan att barnet gör något: simma till närmaste blad och hoppa upp.
    if (g.lage === 'vatten' && !this._tunga.fast && !this._firar) {
      this._vattenTid += dtS
      if (this._vattenTid > 3.5 && this._idle > 2.5) this._simHem(dtS)
    } else this._vattenTid = 0

    // Insekterna sköts var 0,6 s.
    this._skotselKlocka += dtS
    if (this._skotselKlocka > 0.6) {
      this._skotselKlocka = 0
      this._skotsel()
    }

    // Motgången: EN åt gången, först efter två insekter, var 10–15 s.
    if (!this._firar && this._atna >= 2) {
      if (!this._hinder.aktiv) this._hinderKlocka += dtS
      if (this._hinderKlocka > this._nastaHinder) {
        this._hinderKlocka = 0
        this._nastaHinder = rnd(10, 15)
        this._startaHinder(ctx)
      }
    }

    // Grodan kvackar ibland av sig själv när den sitter.
    this._kvackKlocka -= dtS
    if (this._kvackKlocka <= 0 && g.lage === 'sitt' && !this._firar && !this._ladd) {
      this._kvackKlocka = rnd(12, 20)
      g.kvacka()
      if (!voice.talar) this._kvackLjud(ctx, 0.6)
    }

    // Idle: en mjuk om-cue + en ring som visar var en insekt finns.
    if (voice.talar) this._idle = 0
    this._idle += dtS
    if (this._idle > 6.5 && !this._firar) {
      this._idle = 0
      const cues = ['Tryck där tungan ska fastna! Fånga flugorna!', 'Tryck på grodan, så hoppar den!', 'Håll kvar fingret på grodan för ett superhopp!', 'Prova att fastna i grenen!']
      const replik = cues[this._cueIdx++ % cues.length]
      if (replik === 'Tryck där tungan ska fastna! Fånga flugorna!') voice.say('Tryck där tungan ska fastna! Fånga flugorna!')
      else if (replik === 'Tryck på grodan, så hoppar den!') voice.say('Tryck på grodan, så hoppar den!')
      else if (replik === 'Håll kvar fingret på grodan för ett superhopp!') voice.say('Håll kvar fingret på grodan för ett superhopp!')
      else voice.say('Prova att fastna i grenen!')
      const m = g.mun()
      const ins = this._svarm.narmast(m.x, m.y, RACKVIDD)
      if (ins) ripple(ctx.fxLayer, ins.x, ins.y, { color: 0xffffff, maxR: 70, duration: 0.7, width: 5 })
    }
  },

  _startaHinder(ctx) {
    const pool = ['kotte', 'kotte', 'skoldpadda', 'fisk', 'vind']
    if (!this._ankaKom && Math.random() < 0.18) pool.push('anka', 'anka', 'anka')
    let typ = valj(pool)
    if (typ === this._senasteHinder) typ = valj(pool)
    this._senasteHinder = typ
    const h = this._hinder.starta(typ, this._groda.pos.x)
    if (!h) return
    const audio = ctx.services.audio
    if (typ === 'anka') {
      this._ankaKom = true
      if (!audio.sample('djur_anka')) audio.tone({ freq: 500, slideTo: 380, dur: 0.18, type: 'square', vol: 0.1 })
    } else if (typ === 'vind') {
      if (!audio.sample('whoosh')) audio.tone({ freq: 300, slideTo: 900, dur: 0.5, type: 'sine', vol: 0.12 })
    } else if (typ === 'kotte') {
      audio.tone({ freq: 900, slideTo: 600, dur: 0.12, type: 'triangle', vol: 0.1 })
    }
    log('grodan', 'hinder', { typ })
  },

  _simHem(dtS) {
    const g = this._groda
    const blad = this._dammen.blad
    if (!blad?.length) return
    let bast = null
    let bastD = Infinity
    for (const b of blad) {
      // Sikta på bladets KANT på grodans sida, inte under bladet.
      const kant = b.x + Math.sign(g.pos.x - b.x || 1) * (b.bredd / 2 + 46)
      const d = Math.abs(kant - g.pos.x)
      if (d < bastD) {
        bastD = d
        bast = { x: kant, blad: b }
      }
    }
    if (!bast) return
    const dir = Math.sign(bast.x - g.pos.x) || 1
    if (bastD < 40) {
      const mot = Math.sign(bast.blad.x - g.pos.x) || 1
      if (g.riktning !== mot) g.vand()
      g.hoppa(mot)
      this._vattenTid = 0
      return
    }
    if (g.riktning !== dir && Math.random() < 0.05) g.vand()
    this._simKlocka += dtS
    if (this._simKlocka > 0.8) {
      this._simKlocka = 0
      g.simtag(dir)
    }
  },

  _kvackLjud(ctx, vol = 1) {
    const audio = ctx.services.audio
    const nu = performance.now()
    if (nu - (this._kvackAt || 0) > 1600 && audio.sample('djur_groda')) {
      this._kvackAt = nu
      return
    }
    const f = valj(SKALA)
    audio.tone({ freq: f / 2, slideTo: f / 2.6, dur: 0.14, type: 'triangle', vol: 0.24 * vol })
    audio.tone({ freq: f / 2, slideTo: f / 2.9, dur: 0.12, type: 'triangle', vol: 0.2 * vol, delay: 0.13 })
  },

  // Rapens bubbelring: en vågig ring som rullar ut över dammen och bleknar.
  _ritaRing(dtS) {
    const r = this._ring
    if (!r) return
    if (!this._ringG || this._ringG.destroyed) {
      this._ringG = new Graphics()
      this._L.effekt.addChild(this._ringG)
    }
    r.t += dtS
    r.r += dtS * 420
    const a = Math.max(0, 1 - r.t / 1.6)
    const g = this._ringG
    g.clear()
    if (a <= 0) {
      this._ring = null
      return
    }
    for (let i = 0; i < 18; i++) {
      const v = (i / 18) * TAU + r.t
      const rr = r.r + Math.sin(v * 3 + r.t * 8) * 6
      g.circle(r.x + Math.cos(v) * rr, r.y + Math.sin(v) * rr * 0.55, 7 + (i % 3) * 3).fill({ color: 0xe8f7ff, alpha: 0.55 * a }).stroke({ width: 2, color: 0xffffff, alpha: 0.8 * a })
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    if (this._root && !this._root.destroyed) {
      this._root.off('pointerdown', this._onDown)
      for (const ev of ['pointerup', 'pointerupoutside', 'pointercancel']) this._root.off(ev, this._onUp)
    }
    if (this._scen) gsap.killTweensOf(this._scen)
    this._rivVarld()
    this._ringG = null
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
  },
}
