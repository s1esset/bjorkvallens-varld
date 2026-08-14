// Passa Formerna — dra formvännerna till sina hål i trälådan (2–5 år, pussel).
//
// KÄRNLOOP  Sju formvänner (cirkel · triangel · kvadrat · stjärna · hjärta · halvmåne ·
// femhörning) ligger på golvet framför en stor trälåda. Var och en är en FRISTÅENDE ritad
// figur med egen silhuett, ögon, mun och två små armar — samma kontur som hålet den passar
// i, ritad ur samma vägbyggare (`former.js`). Barnet drar en vän till ett hål: rätt hål →
// hen dyker ner med ett trä-klonk, locket studsar, hålets kant tänds i vännens färg och en
// ton ur C-durskalan klingar (den n:te formen ger den n:te tonen — hela rundan spelar en
// stigande skala). Fel hål → lådan säger "tock tock" med hålet, vännen vinglar hem. Aldrig
// ett kryss, aldrig en summer.
//
// MÅL  Alla vänner hemma → lådan SKAKAR AV SKRATT, locket lyfter, och allihop poppar upp ur
// mörkret som en kör och sjunger skalan uppifrån. Sedan `progress.complete()` (stjärna +
// klistermärke + konfetti) och en ny, lite större runda.
//
// AGENS  Vilket hål barnet väljer. Hålens ORDNING lottas om varje runda, så ingen kan lära
// sig "stjärnan ligger till höger" — man måste titta på formen.
//
// VARIATION  Antal former växer 3 → 6 med nivån, färgpaletten byts per runda, och ibland är
// EN form GYLLENE: den glittrar medan den ligger kvar och sjunger en treklang när den passar.
//
// MOTGÅNG (P0, med tak)  En liten mus tittar ibland upp ur ett hål och skymmer det i ~3 s.
// TAKET: högst EN mus åt gången, aldrig när något hålls i handen (alltså aldrig det hål
// barnet är på väg mot), och aldrig när färre än två hål är kvar — det finns alltid ett
// annat hål att göra under tiden. Släpper man rätt form på musen piper hon till och kilar
// ner direkt, så det går att åtgärda på en sekund. Rolig ton, ingen förlust, ingen tidspress.
//
// MOTTAGARE  Bobo står bredvid lådan, följer med blicken det som dras, hejar per form och
// jublar när alla kommit hem (`lib/karaktarer.js`).
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene } from '../../lib/scene.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { bounceIn, pop, wiggle, shake, squash, liv, breathe, puff, sparkle, ripple, floatText } from '../../lib/feedback.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { shade } from '../../lib/theme.js'
import { topLightFill, groundFill } from '../../lib/form.js'
import { FORM_KEYS, makeFormvan, makeHal, makeMus } from './former.js'

// Lådans mått i designkoordinater. Fronten bär hålen, locket ligger ovanpå och lyfter
// vid finalen; `INSIDA` är den mörka springan som avslöjas när locket går upp.
const LADA = { cx: 640, w: 900, topp: 412, h: 236 }
const GOLV = LADA.topp + LADA.h // 648
const HAL_Y = 524
const LOCK_Y = 398
const LOCK_W = 944
const LOCK_H = 40

const TRA = 0xb5793c
const TRA_LOCK = 0xc9924f

// Djup: 3 → 6 former. Bara MER, aldrig svårare på fel sätt.
const ANTAL = [3, 3, 4, 4, 5, 6]

// Ny palett per runda (variation nr 1: samma stjärna är aldrig samma färg två rundor).
const PALETTER = [
  [0xff8a3d, 0x5bbf6a, 0x4aa3df, 0xffd35c, 0xa78bfa, 0xff6b6b, 0x57c8c3],
  [0xff9ec4, 0x57c8c3, 0xffb14a, 0x7bc96f, 0x8ab6f0, 0xf07d7d, 0xc9a0f0],
  [0xf2b134, 0x4fb99f, 0xef6f6c, 0x6a8caf, 0xa0c46a, 0xd98cb3, 0x5db3d9],
]

// C-durskalan. Den n:te formen som kommer hem ger den n:te tonen — en runda spelar en
// stigande skala, och finalen sjunger samma skala uppifrån. Stämd musik, inte blipp.
const SKALA = [0, 2, 4, 5, 7, 9, 11, 12]
const ton = (halvtoner) => 523.25 * Math.pow(2, halvtoner / 12)

const BEROM = ['Precis rätt!', 'Den passade fint!', 'Så duktig du är!']

export default {
  id: 'passa-formerna',
  titleSv: 'Passa Formerna',
  icon: '🔺',
  category: 'pussel',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'passa-formerna',
  voiceIntro: 'Dra formerna till rätt hål i lådan!',

  init(ctx) {
    this._alive = true
    this._startad = false
    this._resolving = false
    this._level = klamp(ctx.progress.get().highestLevel | 0)
    this._rundor = ctx.progress.get().custom?.rundor | 0
    this._formar = []
    this._korFigurer = []
    this._idle = 0
    this._glitT = 0
    this._musT = 0
    this._musNasta = 12
    this._mus = null

    this._root = new Container()
    ctx.stage.addChild(this._root)
    // Äng med himmel: den varma 'warm'-scenen låg för nära träets egen ton och hela
    // bilden blev EN beige yta (syns bara i skärmdumpen). Grönt gräs och blå himmel gör
    // att både lådan och de färgglada formerna kliver fram.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Tomt tryck ska ALDRIG vara tyst (P0 ÅTERKOPPLING): mjukt ljud + en liten ring.
    const fangare = new Graphics().rect(-400, -300, ctx.width + 800, ctx.height + 600).fill({ color: 0x000000, alpha: 0 })
    fangare.eventMode = 'static'
    fangare.on('pointertap', (e) => {
      if (!this._alive) return
      const p = this._root.toLocal(e.global)
      ctx.services.audio.sfx('tap')
      ripple(this._fx, p.x, p.y, { color: 0xffffff, maxR: 58, width: 4, alpha: 0.35 })
      this._idle = 0
    })
    this._root.addChild(fangare)

    this._play = new Container()
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._play, this._fx)

    // Lådan (skakbar behållare) → hålens BILDER → osynliga släppmål → körlagret.
    this._boxSkak = new Container()
    this._halLager = new Container()
    this._halLager.eventMode = 'none'
    this._halLager.interactiveChildren = false
    this._malLager = new Container()
    this._korLager = new Container()
    this._korLager.eventMode = 'none'
    this._korLager.interactiveChildren = false
    // Figurerna i ett EGET lager — annars ligger förra rundans vyer kvar i _play för
    // alltid (lagren är det som rivs per runda), och draget skulle fortsätta hitta dem.
    this._figLager = new Container()
    this._play.addChild(this._boxSkak, this._malLager, this._korLager, this._figLager)
    this._byggLada()
    this._boxSkak.addChild(this._halLager, this._lock)

    // Mottagaren: Bobo står vid lådans högra sida.
    this._bobo = makeKaraktar({ r: 46 })
    this._bobo.view.position.set(1176, GOLV - 108)
    this._play.addChildAt(this._bobo.view, 1) // ovanpå lådan, under figurerna

    this._drag = new DragController({ space: this._play, services: ctx.services })

    this._buildRound(ctx, false)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._startad = true
    this._idle = 0
    ctx.services.voice.say('Dra formerna till rätt hål i lådan!')
    this._bobo?.react('hej')
  },

  // --- lådan ---------------------------------------------------------------

  // Statisk trälåda: markskugga, mörk insida, front med plankfogar och ådring, och ett
  // lock som studsar vid varje form och lyfter vid finalen.
  _byggLada() {
    const x0 = LADA.cx - LADA.w / 2
    const g = new Graphics()
    // markskugga
    g.ellipse(LADA.cx, GOLV + 12, LADA.w * 0.52, 22).fill({ color: 0x3a2412, alpha: 0.22 })
    // insidan (mörk springa som syns när locket lyfter)
    g.roundRect(x0 + 12, LOCK_Y - LOCK_H / 2, LADA.w - 24, 74, 12).fill(0x2b1a0d)
    // fronten
    g.roundRect(x0, LADA.topp, LADA.w, LADA.h, 26).fill(topLightFill(TRA, { highlight: 0.16, dark: 0.3 }))
    g.roundRect(x0, LADA.topp, LADA.w, LADA.h, 26).stroke({ width: 6, color: shade(TRA, 0.36) })
    // plankfogar
    for (let i = 1; i < 5; i++) {
      const fx = x0 + (LADA.w / 5) * i
      g.moveTo(fx, LADA.topp + 10).lineTo(fx, LADA.topp + LADA.h - 10).stroke({ width: 3, color: shade(TRA, 0.24), alpha: 0.55 })
    }
    // ådring
    for (let i = 0; i < 7; i++) {
      const ay = LADA.topp + 28 + i * 30
      const ax = x0 + 40 + ((i * 137) % (LADA.w - 200))
      g.moveTo(ax, ay).quadraticCurveTo(ax + 60, ay + 7, ax + 130, ay).stroke({ width: 3, color: shade(TRA, 0.18), alpha: 0.35 })
    }
    // sockel + skuggband längst ner (så fronten inte är EN platt ton)
    g.roundRect(x0 - 14, GOLV - 26, LADA.w + 28, 34, 12).fill(groundFill(TRA, { light: 0.08, dark: 0.3 }))
    g.roundRect(x0 + 6, GOLV - 62, LADA.w - 12, 34, 10).fill({ color: 0x3a2412, alpha: 0.12 })
    g.eventMode = 'none'
    this._boxSkak.addChild(g)

    // Locket: egen nod (studsar/lyfter). Ritat centrerat i sin behållare.
    const lock = new Container()
    lock.position.set(LADA.cx, LOCK_Y)
    const lg = new Graphics()
    lg.roundRect(-LOCK_W / 2, -LOCK_H / 2, LOCK_W, LOCK_H, 14).fill(topLightFill(TRA_LOCK, { highlight: 0.24, dark: 0.24 }))
    lg.roundRect(-LOCK_W / 2, -LOCK_H / 2, LOCK_W, LOCK_H, 14).stroke({ width: 5, color: shade(TRA_LOCK, 0.34) })
    lg.roundRect(-LOCK_W * 0.46, -LOCK_H * 0.18, LOCK_W * 0.92, 7, 4).fill({ color: 0xffffff, alpha: 0.14 })
    // två små handtag i mässing
    for (const s of [-1, 1]) {
      lg.roundRect(s * LOCK_W * 0.36 - 22, -LOCK_H / 2 - 12, 44, 14, 7).fill(0xd9a92b)
      lg.roundRect(s * LOCK_W * 0.36 - 22, -LOCK_H / 2 - 12, 44, 14, 7).stroke({ width: 3, color: shade(0xd9a92b, 0.35) })
    }
    lg.eventMode = 'none'
    lock.addChild(lg)
    lock.eventMode = 'none'
    lock.interactiveChildren = false
    this._lock = lock
  },

  // --- runda ---------------------------------------------------------------

  _buildRound(ctx, announce = false) {
    if (!this._alive) return
    this._klarHint()
    this._musNed(ctx, true)

    // Riv föregående runda.
    this._drag.clear()
    this._formar.forEach((f) => this._killForm(f))
    this._korFigurer.forEach((k) => killFigur(k))
    this._korFigurer = []
    this._halLager.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._malLager.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._korLager.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._figLager.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._formar = []
    this._klara = 0
    this._idle = 0
    this._glitT = 0
    this._musT = 0
    this._musNasta = 11 + Math.random() * 6
    this._resolving = false

    // Locket tillbaka till viloläge (finalen lyfte det).
    gsap.killTweensOf(this._lock)
    this._lock.y = LOCK_Y
    this._lock.rotation = 0

    const n = ANTAL[this._level]
    const nycklar = shuffle(FORM_KEYS).slice(0, n)
    // Sällsynt gyllene form (variation nr 2). Aldrig i allra första rundan.
    const gyllene = this._rundor > 0 && Math.random() < 0.28 ? randomFrom(nycklar) : null
    // Guldet plockas ur paletten när en gyllene form finns — annars kan en vanlig form
    // få exakt samma gula ton och "den som glittrar" tappar sin poäng.
    const palett = shuffle(PALETTER[(this._rundor + this._level) % PALETTER.length]).filter((c) => !gyllene || c !== 0xffd35c)

    const spacing = (LADA.w - 90) / n
    const r = Math.min(52, spacing * 0.36)
    const snappR = Math.max(104, spacing * 0.78)
    const tappR = Math.min(snappR, Math.max(50, (spacing - 26) / 2)) // P0: ≥96px yta, ≥24px mellanrum

    // Hålens ordning lottas OBEROENDE av figurernas — det är det som gör det till ett
    // pussel i stället för en rad man kan lära sig utantill.
    const halOrdning = shuffle(nycklar)
    const figOrdning = shuffle(nycklar)
    const farger = {}
    nycklar.forEach((k, i) => (farger[k] = k === gyllene ? 0xffd35c : palett[i % palett.length]))

    const form = {}
    halOrdning.forEach((key, i) => {
      const hx = LADA.cx + (i - (n - 1) / 2) * spacing
      const hal = makeHal(key, r, TRA, farger[key])
      hal.position.set(hx, HAL_Y)
      this._halLager.addChild(hal)

      // Släppmålet är en EGEN, orörlig nod (aldrig hålets bild): DragController mäter
      // avståndet till `target.view.x/y` när något släpps, och en nod som guppar eller
      // gapar flyttar snäppytan mitt i släppet.
      const mal = new Container()
      mal.position.set(hx, HAL_Y)
      const yta = new Graphics().circle(0, 0, tappR).fill({ color: 0xffffff, alpha: 0 })
      mal.addChild(yta)
      mal.hitArea = new Circle(0, 0, tappR)
      this._malLager.addChild(mal)

      const f = { key, farg: farger[key], gyllene: key === gyllene, hal, mal, r, klar: false, gap: 0 }
      mal._form = f
      form[key] = f
      this._formar.push(f)
      this._drag.addTarget(mal, (d) => d.key === key && !f.blockad, { hitRadius: snappR })
      bounceIn(hal, { delay: 0.05 + i * 0.05, duration: 0.36 })
    })

    // Figurerna i en slängd hög ovanför lådan.
    const platser = layoutFigurer(n)
    figOrdning.forEach((key, i) => {
      const f = form[key]
      const fig = makeFormvan(key, r, f.farg, { gyllene: f.gyllene })
      fig.view.position.set(platser[i].x, platser[i].y)
      fig.kropp.rotation = (Math.random() * 2 - 1) * 0.07
      fig.view.hitArea = new Circle(0, 0, r + 22)
      this._figLager.addChild(fig.view)
      f.fig = fig

      // Vilo-guppning med EGEN fas (P0 ASSETS: eget liv). Ligger på `kropp`, aldrig på
      // `view` — draget äger view.x/y.
      liv(fig.kropp, { bob: 5 + Math.random() * 2, sway: 0.03, duration: 2.2 + Math.random() * 0.8 })

      fig.view.on('pointerdown', () => {
        if (!this._alive || f.klar) return
        this._idle = 0
        this._klarHint()
        squash(fig.mitt, { intensity: 0.7 })
        ctx.services.audio.tone({ freq: 520, dur: 0.05, type: 'triangle', vol: 0.12 })
      })

      this._drag.addItem(fig.view, { key }, {
        onSelect: () => {
          this._idle = 0
          this._klarHint()
        },
        onCorrect: () => this._onCorrect(ctx, f),
        onWrong: (_rec, target) => this._onWrong(ctx, f, target),
        onMiss: () => this._onMiss(ctx, f),
      })
      bounceIn(fig.view, { delay: 0.1 + i * 0.06, duration: 0.34 })
    })

    if (announce && this._startad) ctx.services.voice.say('Vilken form passar i hålet?')
  },

  // --- rätt hål -------------------------------------------------------------

  _onCorrect(ctx, f) {
    if (!this._alive || f.klar) return
    f.klar = true
    this._idle = 0
    this._klarHint()

    const x = f.mal.x
    const y = f.mal.y
    const nr = this._klara
    this._klara++

    // Trä-klonk + rundans n:te ton ur skalan.
    const a = ctx.services.audio
    a.tone({ freq: 200, dur: 0.09, type: 'square', vol: 0.16, slideTo: 124 })
    a.tone({ freq: ton(SKALA[Math.min(nr, SKALA.length - 1)]), dur: 0.22, type: 'sine', vol: 0.22, delay: 0.06 })
    if (f.gyllene) {
      // Gyllene form: en liten durtreklang ovanpå.
      a.tone({ freq: ton(12), dur: 0.14, type: 'sine', vol: 0.18, delay: 0.16 })
      a.tone({ freq: ton(16), dur: 0.14, type: 'sine', vol: 0.18, delay: 0.28 })
      a.tone({ freq: ton(19), dur: 0.3, type: 'sine', vol: 0.2, delay: 0.4 })
    }

    pop(f.hal, { scale: 1.12 })
    this._lockStuds()
    puff(this._fx, x, y, { count: 7, color: 0xd9a86b }) // sågspån
    ripple(this._fx, x, y, { color: f.farg, maxR: 130, width: 6, alpha: 0.6 })
    sparkle(this._fx, x, y, { count: f.gyllene ? 12 : 6 })
    if (f.gyllene) floatText(this._fx, x, y - 70, '✨', { fontSize: 52, rise: 80 })

    const klar = f.hal._klar
    if (klar && !klar.destroyed) {
      gsap.killTweensOf(klar)
      gsap.to(klar, { alpha: 0.95, duration: 0.3 })
    }

    this._dyk(f)
    this._bobo?.react(f.gyllene ? 'jubel' : 'heja')

    const v = ctx.services.voice
    if (f.gyllene) v.say('En gyllene form! Så fin!')
    else if (Math.random() < 0.62) this._sagForm(v, f.key)
    else v.say(randomFrom(BEROM))

    if (this._klara >= this._formar.length) ctx.later(0.6, () => this._finish(ctx))
  },

  // Formens NAMN sägs som literal per gren — en tabellsökning hade aldrig kunnat få
  // ett röstklipp (check.mjs ser bara literaler).
  _sagForm(voice, key) {
    switch (key) {
      case 'cirkel': voice.say('Cirkel!'); break
      case 'triangel': voice.say('Triangel!'); break
      case 'kvadrat': voice.say('Kvadrat!'); break
      case 'stjarna': voice.say('Stjärna!'); break
      case 'hjarta': voice.say('Hjärta!'); break
      case 'halvmane': voice.say('Halvmåne!'); break
      default: voice.say('Femhörning!'); break
    }
  },

  // Figuren dyker ner i lådan: krymper, sjunker och tonar bort. Tweenar en {}-proxy och
  // rör Pixi-objektet bara om det lever (exit-säkert).
  _dyk(f) {
    const fig = f.fig
    const v = fig?.view
    if (!v || v.destroyed) return
    this._drag.removeItem(v)
    fig.kropp._fxLiv?.kill()
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.killTweensOf(fig.kropp)
    gsap.killTweensOf(fig.kropp.scale)
    v._fxSquashTl?.kill()
    v._fxPopTl?.kill()
    if (fig.skugga && !fig.skugga.destroyed) fig.skugga.alpha = 0
    const st = { s: v.scale.x || 1, y: v.y, a: 1 }
    const tw = gsap.to(st, {
      s: 0.16,
      y: v.y + 30,
      a: 0,
      duration: 0.34,
      ease: 'power2.in',
      onUpdate: () => {
        if (v.destroyed) {
          tw.kill()
          return
        }
        v.scale.set(st.s)
        v.y = st.y
        v.alpha = st.a
      },
      onComplete: () => {
        if (!v.destroyed) v.destroy({ children: true })
      },
    })
  },

  _lockStuds() {
    const l = this._lock
    if (!l || l.destroyed || this._resolving) return
    gsap.killTweensOf(l)
    gsap
      .timeline()
      .to(l, { y: LOCK_Y - 15, rotation: -0.018, duration: 0.09, ease: 'power2.out' })
      .to(l, { y: LOCK_Y, rotation: 0, duration: 0.36, ease: 'bounce.out' })
  },

  // --- fel hål / miss -------------------------------------------------------

  _onWrong(ctx, f, target) {
    if (!this._alive) return
    this._idle = 0
    const mal = target?.view?._form
    wiggle(f.fig.mitt)
    puff(this._fx, f.fig.view.x, f.fig.view.y - 20, { count: 5, color: 0xe8d3b0 })
    if (mal && mal.blockad) {
      // Musen sitter i vägen: hon piper till och kilar ner DIREKT, så barnet kan göra om
      // på en sekund. Motgången saktar ner, den stoppar aldrig.
      this._musPip(ctx)
      if (this._mus) this._mus.t = Math.min(this._mus.t, 0.4)
      ctx.services.voice.say('Titta, en liten mus i hålet!')
    } else if (mal && mal.hal && !mal.hal.destroyed) {
      // Vänligt "tock tock" ur träet — aldrig en summer.
      shake(mal.hal, { intensity: 5, duration: 0.3 })
      ctx.services.audio.tone({ freq: 232, dur: 0.07, type: 'square', vol: 0.12 })
      ctx.services.audio.tone({ freq: 196, dur: 0.08, type: 'square', vol: 0.11, delay: 0.1 })
      if (Math.random() < 0.45) ctx.services.voice.say('Hoppsan, prova ett annat hål!')
    }
    this._bobo?.react('hoppsan')
  },

  _onMiss(ctx, f) {
    if (!this._alive) return
    this._idle = 0
    wiggle(f.fig.mitt)
    ctx.services.audio.sfx('soft')
  },

  // --- musen (motgången) ----------------------------------------------------

  _musUppdatera(ctx, dt) {
    if (!this._alive || this._resolving) return
    if (this._mus) {
      this._mus.t -= dt
      // Musen tittar sig omkring medan hon sitter där.
      const nod = this._mus.nod
      if (nod && !nod.destroyed && nod._ogon && !nod._ogon.destroyed) {
        nod._ogon.x = Math.sin(this._mus.t * 3.1) * this._mus.r * 0.08
      }
      if (this._mus.t <= 0) this._musNed(ctx)
      return
    }
    this._musT += dt
    if (this._musT < this._musNasta) return
    // TAKET: bara när ingenting hålls (alltså aldrig hålet barnet är på väg mot) och
    // bara när minst två hål är kvar — det finns alltid ett annat att göra.
    if (this._drag?.active || this._drag?.selected) return
    const lediga = this._formar.filter((f) => !f.klar)
    if (lediga.length < 2) return
    this._musUpp(ctx, randomFrom(lediga))
  },

  _musUpp(ctx, f) {
    if (!this._alive || !f || f.klar || f.hal?.destroyed) return
    const r = f.r * 1.06
    const nod = makeMus(r)
    nod.position.set(f.mal.x, f.mal.y + r * 0.7)
    nod.scale.set(0.2)
    nod.alpha = 0
    this._halLager.addChild(nod)
    gsap.to(nod, { y: f.mal.y - r * 0.12, alpha: 1, duration: 0.28, ease: 'back.out(2)' })
    gsap.to(nod.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(2)' })
    f.blockad = true
    this._mus = { form: f, nod, t: 3.1, r }
    this._musPip(ctx)
    if (Math.random() < 0.5) ctx.services.voice.say('Titta, en liten mus i hålet!')
  },

  _musPip(ctx) {
    const a = ctx.services.audio
    a.tone({ freq: 1380, dur: 0.06, type: 'sine', vol: 0.14, slideTo: 1880 })
    a.tone({ freq: 1720, dur: 0.06, type: 'sine', vol: 0.11, delay: 0.08 })
  },

  _musNed(ctx, direkt = false) {
    const m = this._mus
    this._mus = null
    this._musT = 0
    this._musNasta = 11 + Math.random() * 6
    if (!m) return
    if (m.form) m.form.blockad = false
    const nod = m.nod
    if (!nod || nod.destroyed) return
    gsap.killTweensOf(nod)
    gsap.killTweensOf(nod.scale)
    if (direkt) {
      nod.destroy({ children: true })
      return
    }
    ctx?.services?.audio?.tone({ freq: 760, dur: 0.14, type: 'sine', vol: 0.12, slideTo: 400 })
    gsap.to(nod, {
      y: nod.y + m.r * 0.9,
      alpha: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        if (!nod.destroyed) nod.destroy({ children: true })
      },
    })
  },

  // --- finalen --------------------------------------------------------------

  _finish(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._klarHint()
    this._musNed(ctx, true)
    this._level = klamp(this._level + 1)
    this._rundor++
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', this._rundor)

    ctx.services.voice.say('Alla formerna kom hem!')
    // Lådan skrattar: tre korta, låga skratt-toner + en mjuk skakning.
    shake(this._boxSkak, { intensity: 7, duration: 0.7 })
    const a = ctx.services.audio
    a.tone({ freq: 172, dur: 0.11, type: 'sawtooth', vol: 0.14 })
    a.tone({ freq: 158, dur: 0.11, type: 'sawtooth', vol: 0.13, delay: 0.15 })
    a.tone({ freq: 146, dur: 0.14, type: 'sawtooth', vol: 0.12, delay: 0.3 })
    this._bobo?.react('jubel')

    // Locket lyfter och mörkret innanför avslöjas.
    ctx.later(0.72, () => {
      if (!this._alive) return
      ctx.services.audio.sfx('whoosh')
      gsap.killTweensOf(this._lock)
      gsap.to(this._lock, { y: LOCK_Y - 82, rotation: -0.032, duration: 0.52, ease: 'back.out(1.3)' })
    })

    // Kören: alla formvänner poppar upp ur lådan och sjunger skalan uppifrån.
    const n = this._formar.length
    this._formar.forEach((f, i) => {
      ctx.later(1.05 + i * 0.19, () => this._korPopp(ctx, f, i, n))
    })

    ctx.later(1.15 + n * 0.19 + 0.45, () => {
      if (!this._alive) return
      ctx.progress.complete()
    })
    ctx.later(1.15 + n * 0.19 + 3.0, () => {
      if (!this._alive) return
      this._buildRound(ctx, true)
    })
  },

  _korPopp(ctx, f, i, n) {
    if (!this._alive || !this._korLager || this._korLager.destroyed) return
    const fig = makeFormvan(f.key, f.r, f.farg, { gyllene: f.gyllene })
    fig.view.eventMode = 'none'
    fig.view.interactiveChildren = false
    fig.view.position.set(f.mal.x, LADA.topp - 6)
    fig.view.scale.set(0.45)
    this._korLager.addChild(fig.view)
    this._korFigurer.push(fig)

    // Kören ska stå TYDLIGT ovanför locket — på samma höjd läste plankan som en
    // gungbräda de balanserade på (syns bara i bild).
    const mYFinal = LADA.topp - 196 - (i % 2) * 24
    gsap.to(fig.view, { y: mYFinal, duration: 0.42, ease: 'back.out(1.8)' })
    gsap.to(fig.view.scale, { x: 1, y: 1, duration: 0.42, ease: 'back.out(1.8)' })
    // ...och vinkar med båda armarna.
    for (const arm of fig.armar) {
      gsap.to(arm, {
        rotation: arm._sida * 0.85,
        duration: 0.26,
        delay: 0.3,
        yoyo: true,
        repeat: 5,
        ease: 'sine.inOut',
      })
    }
    // Skalan uppifrån: sista formen får grundtonen.
    ctx.services.audio.tone({ freq: ton(SKALA[Math.min(n - 1 - i, SKALA.length - 1)]), dur: 0.3, type: 'sine', vol: 0.22 })
    sparkle(this._fx, f.mal.x, LADA.topp - 60, { count: 5 })
  },

  // --- per bildruta ---------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(0.05, ticker.deltaMS / 1000)
    const k = Math.min(1, dt * 10)

    const halls = this._drag?.active?.view || this._drag?.selected?.view || null
    const h = halls && !halls.destroyed ? halls : null

    // Bobo följer det som dras med blicken (mottagaren är närvarande hela tiden).
    if (this._bobo) this._bobo.look(h ? h.x : LADA.cx, h ? h.y : HAL_Y - 30)

    // Hålen GAPAR när något närmar sig — sätts per bildruta, inga tweens (exit-säkert).
    for (const f of this._formar) {
      const hal = f.hal
      if (!hal || hal.destroyed) continue
      let mal = 0
      if (h && !f.klar && !f.blockad) {
        const d = Math.hypot(h.x - f.mal.x, h.y - f.mal.y)
        mal = Math.max(0, 1 - d / 270)
      }
      f.gap += (mal - f.gap) * k
      const inner = hal._inner
      if (inner && !inner.destroyed) inner.scale.set(1 + f.gap * 0.1, 1 + f.gap * 0.15)
    }

    // Den gyllene formen glittrar medan den ligger kvar.
    const gyl = this._formar.find((f) => f.gyllene && !f.klar && f.fig && !f.fig.view.destroyed)
    if (gyl) {
      this._glitT += dt
      if (this._glitT > 1.5) {
        this._glitT = 0
        sparkle(this._fx, gyl.fig.view.x, gyl.fig.view.y, { count: 3 })
      }
    }

    this._musUppdatera(ctx, dt)

    if (this._resolving) return
    this._idle += dt
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say('Vilken form passar i hålet?')
      this._klarHint()
      const kvar = this._formar.filter((f) => !f.klar && f.fig && !f.fig.view.destroyed)
      if (kvar.length) {
        const f = randomFrom(kvar)
        this._hint = f
        this._hintTw = breathe(f.fig.kropp, { scale: 1.1, duration: 0.7 })
        if (f.hal && !f.hal.destroyed) {
          ripple(this._fx, f.mal.x, f.mal.y, { color: f.farg, maxR: f.r * 2.4, width: 5, alpha: 0.5 })
        }
      }
    }
  },

  _klarHint() {
    this._hintTw?.kill()
    this._hintTw = null
    const f = this._hint
    this._hint = null
    const kropp = f?.fig?.kropp
    if (kropp && !kropp.destroyed) {
      gsap.killTweensOf(kropp.scale)
      kropp.scale.set(1, 1)
    }
  },

  _killForm(f) {
    if (!f) return
    if (f.fig) killFigur(f.fig)
    if (f.hal && !f.hal.destroyed) {
      gsap.killTweensOf(f.hal)
      gsap.killTweensOf(f.hal.scale)
      if (f.hal._klar && !f.hal._klar.destroyed) gsap.killTweensOf(f.hal._klar)
    }
    if (f.mal && !f.mal.destroyed) gsap.killTweensOf(f.mal)
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    this._klarHint()
    this._drag?.destroy()
    this._drag = null
    this._musNed(null, true)
    this._formar?.forEach((f) => this._killForm(f))
    this._korFigurer?.forEach((k) => killFigur(k))
    this._bobo?.destroy()
    this._bobo = null
    if (this._lock && !this._lock.destroyed) gsap.killTweensOf(this._lock)
    gsap.killTweensOf(this._boxSkak)
    gsap.killTweensOf(this._play)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._play = null
    this._fx = null
    this._boxSkak = null
    this._halLager = null
    this._malLager = null
    this._korLager = null
    this._figLager = null
    this._lock = null
    this._formar = []
    this._korFigurer = []
  },
}

// --- hjälpare ---------------------------------------------------------------

function klamp(l) {
  return Math.max(0, Math.min(ANTAL.length - 1, l))
}

function killFigur(fig) {
  if (!fig) return
  fig.kropp?._fxLiv?.kill()
  for (const nod of [fig.view, fig.kropp, fig.mitt, fig.ogon, fig.mun, fig.body, fig.skugga, ...(fig.armar || [])]) {
    if (nod && !nod.destroyed) {
      gsap.killTweensOf(nod)
      gsap.killTweensOf(nod.scale)
    }
  }
}

// En slängd hög ovanför lådan: 1–2 rader, centrerade, med jitter så det inte blir en
// prydlig tabell. Aldrig så högt upp att hem-knappen (70, 64) hamnar under en figur.
function layoutFigurer(n) {
  const perRad = n <= 4 ? n : Math.ceil(n / 2)
  const rader = Math.ceil(n / perRad)
  const sx = 196
  const sy = 152
  const topp = 244 - ((rader - 1) * sy) / 2
  const jit = (m) => (Math.random() * 2 - 1) * m
  // Sidledsjittret måste RYMMAS i mellanrummet. Med ±26 px per figur kan två grannar
  // jittra mot varandra och pressa gapet från 48 px ner till ~3 px — under P0:s 24 px,
  // utan att figurerna någonsin överlappar (så inget syns i en skärmdump). Taket här är
  // halva det som blir över när båda träffytorna (2×74) och P0-marginalen är avdragna.
  const jitX = Math.max(0, Math.min(26, (sx - 2 * 74 - 24) / 2))
  const p = []
  for (let i = 0; i < n; i++) {
    const rad = Math.floor(i / perRad)
    const kolIRad = rad < rader - 1 ? perRad : n - perRad * (rader - 1)
    const idx = i - rad * perRad
    const bredd = (kolIRad - 1) * sx
    p.push({ x: 640 - bredd / 2 + idx * sx + jit(jitX), y: topp + rad * sy + jit(18) })
  }
  return p
}
