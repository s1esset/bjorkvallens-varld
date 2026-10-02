// VATTENBALLONGERNA — en het sommardag, djuren är för varma.
//
// Tryck på kranen → en ballong fylls (sväller och dallrar). Dra bakåt från ballongen och sikta längs
// en prickad bana (AimLauncher + skuggvärld: banan är EXAKT den riktiga flygningen, vinden inräknad),
// släpp → ballongen vobblar genom luften och spricker i en vätskekaskad (SPH, bara där det stänker).
// Landar stänket vid ett djur blir det svalt och nöjt. Miss = en pöl i gräset där en and badar.
//
// Flygningen bärs av en matter-cirkel; mjukkroppen (ballong.js) är bild + dallring och följer den.
// Vinden är luftens fart (lib/vind.js Vindfalt) och syns i en flagga; en ny vind lottas efter varje
// kast. Solen värmer upp ETT svalt djur i taget (tak 2 per runda) — aldrig ett straff.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { Vindfalt } from '../../lib/vind.js'
import { FluidWorld, FluidView, FLUIDS } from '../../lib/vatska.js'
import { createScene } from '../../lib/scene.js'
import { shuffle } from '../../lib/swedish.js'
import { shade } from '../../lib/theme.js'
import { spray } from '../../lib/partiklar.js'
import { burst, sparkle, pop, squash, bounceIn, stadFx } from '../../lib/feedback.js'
import { Ballong } from './ballong.js'
import { Djur, ART_NAMN } from './djur.js'
import { byggKran, byggFlagga, ritaFlagga, Pol, Anka, ritaStrale, ritaRegnbage } from './kulisser.js'
import {
  W, MARK_Y, BALL_R, BALL_FA, GRAV_Y, SKOTT, KRAN_X, KRAN_Y, PIP, MAX_KRAFT, MIN_KRAFT, KRAFT_SKALA, TAP_ANDEL,
  PLATSER, DJUR_FOTER, TRAFF_R, TAK_UPPVARMNING, FORSTA_UPPVARMNING_S, VIND_MAX, BALLONG_FARGER, VATTEN, VATTEN_LJUS,
  VATTEN_FARGER, SKALA, valjVind, lobbMot, clamp,
} from './konst.js'

const FYLL_S = 1.25 // sekunder att fylla en ballong
const SPLAT_S = 0.085 // tillplattningen före sprickan
const SOL = { x: 270, y: 135 }

export default {
  id: 'vattenballongerna',
  titleSv: 'Vattenballongerna',
  icon: '💦',
  category: 'fysik',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'vattenballongerna',
  voiceIntro: 'Djuren är så varma! Tryck på kranen och fyll en ballong.',

  // ---------------------------------------------------------------------------------------------
  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._tid = 0
    this._st = 'ingen' // ingen · fyller · klar · flyger · splat · finish
    this._idle = 0
    this._runda = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._djur = []
    this._forraArter = []
    this._pooler = []
    this._polar = []
    this._anka = null
    this._ballong = { x: SKOTT.x, y: SKOTT.y, fylld: false, flyger: false, k: 0 } // SONDKROK
    this._ballBody = null
    this._bal = null // Ballong-objektet (visuellt)
    this._kontakt = null
    this._missRad = 0
    this._missSagt = 0
    this._sistaLandning = null
    this._vindNu = 0
    this._vindMal = 0
    this._vindForra = null
    this._kastAntal = 0
    this._pull = { x: 0, y: 0, mx: 0, my: 0 }
    this._tapSkott = null
    this._uppv = 0
    this._varmt = null
    this._nastaVarme = FORSTA_UPPVARMNING_S
    this._strale = 0
    this._finish = null
    this._svalaNu = 0
    this._fyllT = 0
    this._fyllDrop = 0
    this._farg = null
    this._ratSpin = 0
    this._dropp = 0
    this._straleMal = null
    this._sistaTap = null
    this._vindStilla = false
    this._host = { gnistra: (x, y) => this._alive && sparkle(ctx.fxLayer, x, y, { count: 2 }) }

    const root = new Container()
    ctx.stage.addChild(root)
    this._root = root

    // --- bakgrund -----------------------------------------------------------------------------
    this._scen = createScene('meadow', { groundH: 175 })
    root.addChild(this._scen)

    // tryck på tomt = en glad liten stänkning (aldrig ett fel)
    this._bg = new Graphics()
    this._bg.rect(ctx.view.left, 0, ctx.view.width, 720).fill({ color: 0xffffff, alpha: 0.001 })
    this._bg.eventMode = 'static'
    this._bg.on('pointerdown', (e) => this._tomtTryck(ctx, e))
    root.addChild(this._bg)

    this._flagga = byggFlagga(root, 392, MARK_Y - 10)
    this._regnbage = new Graphics()
    this._regnbage.eventMode = 'none'
    root.addChild(this._regnbage)
    this._stralG = new Graphics()
    this._stralG.eventMode = 'none'
    root.addChild(this._stralG)
    this._polLager = new Container()
    this._polLager.eventMode = 'none'
    this._polLager.interactiveChildren = false
    root.addChild(this._polLager)

    // --- fysik --------------------------------------------------------------------------------
    this._phys = new PhysicsWorld({ gravityY: GRAV_Y, walls: [] })
    const vl = ctx.view.left
    const vr = ctx.view.right
    const mark = this._phys.rectangle(W / 2, MARK_Y + 40, 8000, 80, { isStatic: true, label: 'mark' })
    mark.forhandsStopp = true // pricklinjen SLUTAR där ballongen spricker
    const vagV = this._phys.rectangle(vl + 8 - 60, 360, 120, 2600, { isStatic: true, label: 'vagg-v' })
    const vagH = this._phys.rectangle(vr - 8 + 60, 360, 120, 2600, { isStatic: true, label: 'vagg-h' })
    vagV.forhandsStopp = true
    vagH.forhandsStopp = true
    this._unbindKoll = this._phys.onCollision((e) => this._kollision(e))
    this._unbindSteg = this._phys.beforeStep(() => this._djurKoll())

    // Vinden: luftens fart (px/steg) över hela skärmen. Kraft = massa·speedToAccel(w, fa) → a = fa·w.
    this._vind = new Vindfalt({
      varld: this._phys,
      form: { typ: 'band', x: -400, y: 360, rackvidd: 2700, halvhojd: 2400 },
      luft: { x: 0, y: 0 },
      avtag: { langs: 0, tvars: 0 },
      kroppar: () => (this._ballBody ? [this._ballBody] : []),
      filter: () => true,
    })

    // --- djur, kran, ballongens lager ---------------------------------------------------------
    this._djurLager = new Container()
    root.addChild(this._djurLager)
    this._ankLager = new Container()
    this._ankLager.eventMode = 'none'
    this._ankLager.interactiveChildren = false
    root.addChild(this._ankLager)

    this._kran = null // SONDKROK: { x, y } = kranens tryckpunkt (sätts nedan)
    const k = byggKran(root)
    this._kranObj = k
    this._kran = { x: KRAN_X, y: KRAN_Y - 130, nod: k.nod }
    k.nod.on('pointerdown', () => this._tryckKran(ctx))

    // tips-ring runt kranens vred: lyser tills barnet hittat den
    this._tips = new Graphics()
    this._tips.circle(0, 0, 58).stroke({ width: 7, color: 0xffd35c, alpha: 0.9 })
    this._tips.circle(0, 0, 70).stroke({ width: 4, color: 0xffffff, alpha: 0.7 })
    this._tips.position.set(KRAN_X, KRAN_Y - 150)
    this._tips.eventMode = 'none'
    root.addChild(this._tips)

    this._ballLager = new Container()
    this._ballLager.eventMode = 'none'
    this._ballLager.interactiveChildren = false
    root.addChild(this._ballLager)

    this._fluidLager = new Container()
    this._fluidLager.eventMode = 'none'
    this._fluidLager.interactiveChildren = false
    root.addChild(this._fluidLager)

    // träffytan för sikte: en osynlig skiva på skjutplatsen (AimLauncher äger hitArea + lyssnarna)
    this._hit = new Container()
    this._hit.position.set(SKOTT.x, SKOTT.y)
    const hg = new Graphics()
    hg.circle(0, 0, 60).fill({ color: 0xffffff, alpha: 0.001 })
    hg.eventMode = 'none'
    this._hit.addChild(hg)
    root.addChild(this._hit)

    this._trailLager = new Container()
    this._trailLager.eventMode = 'none'
    this._trailLager.interactiveChildren = false
    root.addChild(this._trailLager)

    this._launcher = new AimLauncher({
      target: this._hit,
      root: this._trailLager,
      audio: ctx.services.audio,
      slingshot: true,
      maxPower: MAX_KRAFT,
      minPower: MIN_KRAFT,
      powerScale: KRAFT_SKALA,
      hitRadius: 92,
      tapPower: TAP_ANDEL,
      trailColor: 0xffffff,
      previewGravity: 0.2778 * GRAV_Y,
      previewWind: 0,
      // Pricklinjen går genom en skuggvärld: marken och väggarna är DELADE kroppar, provkulan har
      // ballongens egna tal. 0,0 px fel mot den riktiga flygningen (node scripts/_skuggprobe.mjs-läget).
      skuggvarld: {
        varld: this._phys,
        kula: { r: BALL_R, restitution: 0, friction: 0.1, frictionAir: BALL_FA, density: 0.001, ineria: Infinity },
        steg: 190,
        hoppa: 4,
      },
      getOrigin: () => ({ x: SKOTT.x, y: SKOTT.y }),
      defaultAim: () => {
        const d = this._valjTapMal()
        this._tapSkott = d || true
        return d ? d.brost : { x: 900, y: 560 }
      },
      onGrab: () => this._riktaStart(ctx),
      onAim: (v) => this._riktar(v),
      onLaunch: (v) => this._slapp(ctx, v),
    })
    this._hit.eventMode = 'none' // tänds när ballongen är klar

    this._bygg(ctx)
    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._idle = -3 // intron får tala klart innan om-cuen börjar räkna
  },

  // ---- bygg en runda: fyra djur ur poolen på sex ---------------------------------------------
  _bygg(ctx) {
    for (const d of this._djur) d.riv()
    this._djur = []
    // Rundan efter första innehåller alltid de två arter som saknades förra gången → omgång 2 ≠ 1.
    const saknas = shuffle(ART_NAMN.filter((a) => !this._forraArter.includes(a)))
    const rest = shuffle(ART_NAMN.filter((a) => !saknas.includes(a)))
    const val = [...saknas, ...rest].slice(0, 4)
    this._forraArter = val
    const platser = shuffle([0, 1, 2, 3])
    const lista = []
    for (let i = 0; i < 4; i++) {
      const pl = platser[i]
      const d = new Djur(val[i], pl, DJUR_FOTER[pl], { fxLayer: ctx.fxLayer, runda: this._runda })
      d.nod.on('pointerdown', () => this._tryckDjur(ctx, d))
      lista.push(d)
    }
    lista.sort((a, b) => a.fotY - b.fotY) // de nedre ritas främst
    for (const d of lista) this._djurLager.addChild(d.nod)
    this._djur = lista
    this._varmt = null
    this._uppv = 0
    this._nastaVarme = FORSTA_UPPVARMNING_S
    this._missRad = 0
    this._finish = null
    this._svalaNu = 0
    this._regnbage.clear()
    this._regnbage.alpha = 1
    this._stralG.clear()
    this._nyVind(true)
  },

  // ---------------------------------------------------------------------------------------------
  // Kranen och ballongen
  _tryckKran(ctx) {
    if (!this._alive) return
    const a = ctx.services.audio
    this._idle = 0
    const k = this._kranObj
    this._ratSpin = 9
    squash(k.pulsa, { intensity: 0.7 })
    a.tone({ freq: 392, dur: 0.1, type: 'triangle', vol: 0.2, slideTo: 523 })
    if (this._st !== 'ingen') return // redan en ballong — vredet snurrar bara roligt
    this._fyll(ctx)
  },

  _fyll(ctx) {
    this._st = 'fyller'
    this._fyllT = 0
    this._fyllDrop = 0
    this._farg = BALLONG_FARGER[(Math.random() * BALLONG_FARGER.length) | 0]
    const b = new Ballong(this._ballLager, this._farg)
    this._bal = b
    b.nod.position.set(PIP.x, PIP.y + 40)
    this._ballong.fylld = false
    this._ballong.flyger = false
    this._ballong.k = 0
    this._pull.x = this._pull.y = this._pull.mx = this._pull.my = 0
    ctx.services.audio.loop('vbfyll', { typ: 'brus', freq: 1500, q: 0.9, vol: 0.045 })
  },

  _fylldKlar(ctx) {
    this._st = 'klar'
    this._idle = 0
    const a = ctx.services.audio
    a.stopLoop('vbfyll')
    const b = this._bal
    b.skala(1)
    b.knyt()
    pop(b.vy, { scale: 1.16 })
    b.knuff(0, 0, 5, 90)
    this._ballong.fylld = true
    this._ballong.k = 1
    // en stämd liten fanfar: C6 → E6
    a.tone({ freq: SKALA[5], dur: 0.16, type: 'sine', vol: 0.2 })
    ctx.later(0.09, () => this._alive && a.tone({ freq: SKALA[5] * 1.26, dur: 0.22, type: 'sine', vol: 0.18 }))
    sparkle(ctx.fxLayer, SKOTT.x, SKOTT.y - 30, { count: 4 })
    this._hit.eventMode = 'static'
    this._launcher.setEnabled(true)
    // "Dra bakåt och sikta!" första gången, sedan bara om barnet dröjer (om-cuen)
    if (this._kastAntal === 0 && !ctx.services.voice.talar) ctx.services.voice.say('Dra bakåt och sikta!')
  },

  // Aim-callbacks -----------------------------------------------------------------------------
  _riktaStart(ctx) {
    this._idle = 0
    if (this._bal) pop(this._bal.vy, { scale: 1.1 })
  },
  _riktar(v) {
    this._idle = 0
    if (!v || !(v.power > 0)) return
    // Ballongen dras bakåt mot fingret (slangbella) — ju hårdare, desto längre. Rent visuellt.
    const d = Math.min(v.power * 2.7, 44)
    this._pull.mx = (-v.vx / v.power) * d
    this._pull.my = (-v.vy / v.power) * d
  },
  _slapp(ctx, v) {
    const tap = this._tapSkott
    this._tapSkott = null // flaggan lever bara ett släpp
    if (this._st !== 'klar' || !this._alive) return
    let vv = v
    // Tap-tap-reserven: ett tryck på ballongen (utan drag) kastar en lagom lobb mot ett varmt djur.
    // Vinden räknas inte in — luften får fortfarande vara med och bestämma var stänket landar.
    if (tap && tap !== true) vv = lobbMot(SKOTT, tap.brost)
    this._kasta(ctx, vv)
  },

  // Tap-tap-reservens mål: ett slumpat varmt djur, aldrig samma två gånger i rad.
  _valjTapMal() {
    const varma = this._djur.filter((d) => !d.svalad)
    const lista = varma.length ? varma : this._djur
    const ok = lista.filter((d) => d !== this._sistaTap)
    const kalla = ok.length ? ok : lista
    const d = kalla[(Math.random() * kalla.length) | 0]
    this._sistaTap = d
    return d
  },

  _tryckDjur(ctx, d) {
    if (!this._alive) return
    this._idle = 0
    if (this._st === 'klar') {
      this._kasta(ctx, lobbMot(SKOTT, d.brost))
      return
    }
    // utan ballong: djuret blir bara glatt (aldrig ett fel)
    d.kittla()
    const a = ctx.services.audio
    if (!d.spec.ljud || !a.sample(d.spec.ljud)) a.tone({ freq: SKALA[(Math.random() * 4) | 0], dur: 0.16, type: 'sine', vol: 0.16 })
    sparkle(ctx.fxLayer, d.x, d.fotY - d.hojd * 0.6, { count: 3 })
  },

  _tomtTryck(ctx, e) {
    if (!this._alive) return
    const p = this._root.toLocal(e.global)
    spray(ctx.fxLayer, p.x, p.y, {
      count: 3, former: ['cirkel'], colors: VATTEN_FARGER, size: 6, dist: 46, angle: -Math.PI / 2, spread: 1.8,
      gravity: 380, life: 0.55,
    })
    ctx.services.audio.tone({ freq: SKALA[(Math.random() * 5) | 0] * 0.5, dur: 0.1, type: 'sine', vol: 0.12, slideTo: 380 })
  },

  // Flygningen --------------------------------------------------------------------------------
  _kasta(ctx, v) {
    if (this._st !== 'klar' || !this._bal) return
    this._st = 'flyger'
    this._kastAntal++
    this._idle = 0
    this._launcher.setEnabled(false)
    this._hit.eventMode = 'none'
    this._pull.mx = this._pull.my = 0
    this._ballong.fylld = false
    this._ballong.flyger = true
    const b = this._phys.circle(SKOTT.x, SKOTT.y, BALL_R, { restitution: 0, friction: 0.1, frictionAir: BALL_FA, density: 0.001, label: 'ballong' })
    Body.setInertia(b, Infinity)
    Body.setVelocity(b, { x: v.vx, y: v.vy })
    this._ballBody = b
    this._vobT = 0
    this._vobS = 1
    this._flygT = 0
    // släppet ger en kvickt "snärt": ballongen vobblar åt skjutriktningen
    this._bal.vobbla(Math.atan2(v.vy, v.vx), 7)
    squash(this._bal.vy, { intensity: 0.9 })
    ctx.services.audio.tone({ freq: SKALA[2], dur: 0.12, type: 'triangle', vol: 0.16, slideTo: SKALA[4] })
  },

  _kollision(e) {
    if (this._st !== 'flyger' || this._kontakt || !this._ballBody) return
    for (const p of e.pairs) {
      const a = p.bodyA
      const b = p.bodyB
      const boll = a === this._ballBody ? a : b === this._ballBody ? b : null
      if (!boll) continue
      const annan = boll === a ? b : a
      const pos = boll.position
      if (annan.label === 'mark') this._kontakt = { typ: 'mark', x: pos.x, y: MARK_Y - 4, nx: 0, ny: 1 }
      else if (annan.label === 'vagg-v') this._kontakt = { typ: 'vagg', x: pos.x, y: pos.y, nx: 1, ny: 0 }
      else if (annan.label === 'vagg-h') this._kontakt = { typ: 'vagg', x: pos.x, y: pos.y, nx: 1, ny: 0 }
      if (this._kontakt) return
    }
  },

  // Per FAST fysiksteg: träffar ballongen ett djur i luften?
  _djurKoll() {
    if (this._st !== 'flyger' || this._kontakt || !this._ballBody) return
    const p = this._ballBody.position
    const vel = this._ballBody.velocity
    for (const d of this._djur) {
      const cy = d.fotY - d.hojd * 0.5
      const rx = 56 + BALL_R + 10
      const ry = d.hojd * 0.5 + BALL_R + 6
      const dx = (p.x - d.x) / rx
      const dy = (p.y - cy) / ry
      if (dx * dx + dy * dy < 1) {
        const l = Math.hypot(vel.x, vel.y) || 1
        this._kontakt = { typ: 'djur', djur: d, x: p.x, y: p.y, nx: vel.x / l, ny: vel.y / l }
        return
      }
    }
  },

  // Nedslaget: ballongen plattas till en kort stund (det är HÄR den ska se mjuk ut), sedan spricker den.
  _borjaSplat(ctx, k) {
    this._st = 'splat'
    this._splatT = SPLAT_S
    this._splatK = k
    this._splatN = 0
    // fysikkroppen är klar — bilden står kvar på nedslagsplatsen
    if (this._ballBody) {
      this._phys.removeBody(this._ballBody)
      this._ballBody = null
    }
    if (this._bal) this._bal.nod.position.set(k.x, k.y)
    const a = ctx.services.audio
    // omedelbart ljud (< 100 ms): ett mjukt "splat"
    if (!a.sample('traff_mjuk')) a.tone({ freq: 220, dur: 0.1, type: 'sine', vol: 0.2, slideTo: 120 })
  },

  _spricka(ctx) {
    const k = this._splatK
    const a = ctx.services.audio
    const b = this._bal
    const farg = this._farg
    if (b) {
      b.riv()
      this._bal = null
    }
    this._ballong.flyger = false
    this._ballong.fylld = false
    const x = k.x
    const y = k.y

    // lätta ljud: gummit smäller, vattnet plaskar
    if (!a.sample('popp')) a.sfx('pop')
    for (let i = 0; i < 3; i++) {
      const f = SKALA[(Math.random() * 6) | 0]
      ctx.later(0.03 + i * 0.05, () => this._alive && a.tone({ freq: f, dur: 0.1, type: 'sine', vol: 0.1, slideTo: f * 0.6 }))
    }
    // gummibitar + droppar + riktig vätska
    burst(ctx.fxLayer, x, y, { count: 9, colors: [farg, shade(farg, 0.2), 0xffffff], power: 0.9 })
    spray(ctx.fxLayer, x, y, { count: 12, former: ['cirkel'], colors: VATTEN_FARGER, size: 6, dist: 150, distVar: 0.5, angle: -Math.PI / 2, spread: 2.8, gravity: 760, life: 0.8 })
    this._vatten(x, y, k.typ === 'mark')

    // Vem blev blöt? Direktträff i luften, eller stänket når djuret (horisontellt ≤ TRAFF_R)
    const traffade = []
    for (const d of this._djur) {
      if (k.typ === 'djur' && k.djur === d) traffade.push(d)
      else if (Math.abs(d.x - x) < TRAFF_R * 0.78 && y > d.fotY - d.hojd - 50 && y < d.fotY + 50) traffade.push(d)
    }
    this._sistaLandning = { x, y }
    if (traffade.length) this._traff(ctx, traffade)
    else this._miss(ctx, k)

    // Rundan kan vara klar: _traff startar då finishen och sätter _st = 'finish'.
    if (this._st !== 'finish') this._st = 'ingen'
    this._idle = 0
    this._kontakt = null
    if (this._st !== 'finish') this._nyVind(false)
  },

  // Träff: djuren blir svala --------------------------------------------------------------------
  _traff(ctx, lista) {
    const a = ctx.services.audio
    this._missRad = 0
    let nya = 0
    for (const d of lista) {
      if (!d.svalad) nya++
      d.traffa()
      sparkle(ctx.fxLayer, d.x, d.fotY - d.hojd * 0.55, { count: 5 })
      burst(ctx.fxLayer, d.x, d.fotY - d.hojd * 0.5, { count: 8, colors: [0x7fd6ff, 0xc9efff, 0xffffff, 0xffe27a], power: 0.9 })
      if (d.spec.ljud) a.sample(d.spec.ljud)
    }
    const svala = this._djur.filter((d) => d.svalad).length
    this._svalaNu = svala
    // stämd arpeggio som stiger med antalet svala djur
    const i = clamp(svala - 1, 0, 3)
    const toner = [SKALA[i], SKALA[i + 1], SKALA[i + 2]]
    toner.forEach((f, n) => ctx.later(0.07 * n, () => this._alive && a.tone({ freq: f, dur: 0.2, type: 'sine', vol: 0.2 })))
    if (svala >= 4) {
      this._finishFest(ctx)
      return
    }
    if (nya > 0) ctx.services.voice.say('Plask! Nu är det svalt!')
  },

  // Miss: pöl + and (alltid roligt) ---------------------------------------------------------------
  _miss(ctx, k) {
    const a = ctx.services.audio
    this._missRad++
    const x = clamp(k.x, ctx.view.left + 90, ctx.view.right - 90)
    const y = MARK_Y + 4
    // tak: högst tre pölar; den äldsta torkar snabbare
    if (this._polar.length >= 3) this._polar[0].snabbtBort()
    const p = new Pol(this._polLager, x, y)
    this._polar.push(p)
    if (!a.sample('plopp')) a.tone({ freq: 300, dur: 0.22, type: 'sine', vol: 0.24, slideTo: 90 })
    if (!this._anka) {
      const fran = clamp(x < 640 ? x + 330 : x - 330, ctx.view.left - 60, ctx.view.right + 60)
      this._anka = new Anka(this._ankLager, fran, x + (fran > x ? 18 : -18), y + 6)
    }
    if (this._missSagt < 2 && !ctx.services.voice.talar) {
      this._missSagt++
      ctx.services.voice.say('Plask i gräset! Anden tycker om pölen.')
    }
    // Hjälp, sent och synligt: efter tre missar i rad stannar vinden och djuret närmast landningen
    // vandrar lite närmare. Aldrig ett automatiskt sikte.
    if (this._missRad >= 3) this._hjalp(ctx, x)
  },

  _hjalp(ctx, landX) {
    this._missRad = 0
    const varma = this._djur.filter((d) => !d.svalad)
    if (!varma.length) return
    let n = varma[0]
    for (const d of varma) if (Math.abs(d.x - landX) < Math.abs(n.x - landX)) n = d
    // en bit mot landningen, men aldrig in i grannen
    let mal = clamp(n.x + clamp((landX - n.x) * 0.55, -150, 150), PLATSER[0] - 70, PLATSER[3] + 60)
    // aldrig närmare än 170 px från ett annat djur — mottagarna ska inte skymma varandra
    const fri = (x) => this._djur.every((o) => o === n || Math.abs(o.x - x) >= 170)
    let steg = 0
    while (!fri(mal) && steg++ < 40) mal += (n.x - mal) * 0.15
    n.gaTill(mal)
    this._vindStilla = true // nästa kast blåser det inte (lottas i _spricka efter missen)
    sparkle(this._ctx.fxLayer, n.x, n.fotY - n.hojd * 0.6, { count: 6 })
    ctx.services.voice.say('Jag hjälper till!')
  },

  // Vind -------------------------------------------------------------------------------------
  _nyVind(forsta) {
    let w
    if (this._vindStilla) {
      w = 0
      this._vindStilla = false
    } else {
      w = valjVind(this._vindForra, this._djur.filter((d) => d.svalad).length, this._runda)
    }
    if (forsta) w = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.1)
    this._vindForra = w
    this._vindMal = w
  },

  _vindSteg(dt) {
    const d = this._vindMal - this._vindNu
    if (Math.abs(d) < 0.002 && this._vindNu === this._vindMal) return
    // Rör sig bara medan ingen sikte pågår (vinden lottas efter nedslaget, flaggan hinner ikapp)
    this._vindNu += clamp(d, -dt * 6, dt * 6)
    const w = this._vindNu
    this._vind.luft.x = w
    this._vind.flytta(w >= 0 ? -400 : 1700, 360)
    this._launcher.setPreview({ wind: BALL_FA * w })
  },

  // Vatten (SPH — bara där det stänker) -----------------------------------------------------------
  _vatten(x, y, ground) {
    // högst två pölar av vätska samtidigt; den äldsta får gå
    while (this._pooler.length >= 2) this._pooler.shift().riv()
    const left = Math.max(this._ctx.view.left, x - 150)
    const right = Math.min(this._ctx.view.right, x + 150)
    const top = Math.max(-200, y - 360)
    const bottom = MARK_Y + 22
    const wd = new FluidWorld({
      max: 120, radius: 18, gravityY: 0.5, rho0: FLUIDS.vatten.rho0, sigma: FLUIDS.vatten.sigma, beta: FLUIDS.vatten.beta,
      restitution: 0.08, wallFriction: 0.2,
      bounds: { left, right, top, bottom },
      walls: { left: true, right: true, bottom: true, top: false },
    })
    const vy = new FluidView(this._fluidLager, wd, {
      color: VATTEN, edge: VATTEN_LJUS, alpha: 0.92, blobScale: 1.3, threshold: 0.4, soft: 0.1, blur: 6, quality: 2, resolution: 0.5,
      area: new Rectangle(left - 70, top, right - left + 140, bottom - top + 40),
    })
    vy.layer.eventMode = 'none'
    vy.layer.interactiveChildren = false
    // kaskaden: uppåt-utåt i en fontän + lite åt sidorna
    wd.splash(x, y, { count: ground ? 52 : 64, speed: ground ? 5.4 : 6, spread: 2.5, dir: -Math.PI / 2, jitter: 20 })
    wd.splash(x, y, { count: 12, speed: 3, spread: 0.7, dir: 0, jitter: 10 })
    wd.splash(x, y, { count: 12, speed: 3, spread: 0.7, dir: Math.PI, jitter: 10 })
    this._pooler.push({
      wd, vy, age: 0, x, bottom, left, right,
      riv() {
        vy.destroy()
        wd.destroy()
        if (!vy.layer.destroyed) vy.layer.destroy({ children: true })
      },
    })
  },

  // ---------------------------------------------------------------------------------------------
  // Finishen: spelets EGEN plaskfest — alla djuren sprutar upp och en regnbåge växer i dimman
  _finishFest(ctx) {
    this._st = 'finish'
    this._varmt = null
    this._stralG.clear()
    for (const d of this._djur) { d.upp = false; d.mal = 1; d.svalad = true } // ingen värms upp mitt i festen
    ctx.services.voice.say('Alla djuren är svala! Vilken plaskfest!') // egen replik FÖRE complete(): berömmet utgår
    ctx.progress.setLevel(this._runda + 1)
    ctx.progress.complete()
    this._finish = { t: 0, sprut: 0, fas: 0 }
    this._djur.forEach((d, i) => ctx.later(0.12 * i, () => this._alive && d.alive && d.traffa()))
    this._ballong.fylld = false
    // nästa runda: nya djur, ny vind
    ctx.later(5.6, () => {
      if (!this._alive) return
      this._runda++
      this._bygg(ctx)
      for (const d of this._djur) bounceIn(d.pulsa, { duration: 0.5 })
      this._st = 'ingen'
      this._idle = 0
      ctx.narTyst(() => this._alive && ctx.services.voice.say('Tryck på kranen!'))
    })
  },

  // ---------------------------------------------------------------------------------------------
  _update(ctx, t) {
    if (!this._alive) return
    const ms = Math.min(t.deltaMS, 100)
    const dt = ms / 1000
    this._tid += dt
    const a = ctx.services.audio
    const voice = ctx.services.voice

    // fysiken (en boll + statiska kroppar — billigt). Vinden stegar själv i beforeStep.
    this._phys.update(ms)
    this._vindSteg(dt)
    ritaFlagga(this._flagga, this._vindNu, this._tid)

    // --- djur ---
    for (const d of this._djur) d.uppdatera(dt, this._tid, this._host)

    // --- kranen: vredet vaggar och snurrar, tipsringen lyser, en droppe i taget ---
    const k = this._kranObj
    this._ratSpin *= Math.pow(0.04, dt)
    k.ratt.rotation += this._ratSpin * dt + Math.sin(this._tid * 1.3) * 0.0006
    const visaTips = this._st === 'ingen'
    this._tips.visible = visaTips
    if (visaTips) {
      const s = 1 + Math.sin(this._tid * 4.2) * 0.07
      this._tips.scale.set(s)
      this._tips.alpha = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(this._tid * 4.2))
    }
    if (this._st === 'ingen') {
      this._dropp -= dt
      if (this._dropp <= 0) {
        this._dropp = 1.3 + Math.random() * 1.2
        spray(ctx.fxLayer, k.pipX, k.pipY, { count: 1, former: ['cirkel'], colors: [VATTEN_LJUS], size: 6, dist: 60, angle: Math.PI / 2, spread: 0.1, gravity: 900, life: 0.5, sizeTo: 0.7 })
      }
    }

    // --- ballongen ---
    const b = this._bal
    if (b) {
      b.uppdatera(ms)
      if (this._st === 'fyller') this._fyllSteg(ctx, dt)
      else if (this._st === 'klar') this._klarSteg(dt)
      else if (this._st === 'flyger') this._flygSteg(ctx, dt)
      else if (this._st === 'splat') this._splatSteg(ctx, dt)
    }
    if (this._st === 'klar' || this._st === 'fyller') {
      // slangbellans eftersläp: ballongen dras mjukt bakåt mot fingret och fjädrar tillbaka
      const p = this._pull
      const m = Math.min(1, dt * 16)
      p.x += (p.mx - p.x) * m
      p.y += (p.my - p.y) * m
    }

    // --- pölar, and, vätska ---
    for (let i = this._polar.length - 1; i >= 0; i--) {
      const p = this._polar[i]
      if (!p.uppdatera(dt)) {
        p.riv()
        this._polar.splice(i, 1)
      }
    }
    const an = this._anka
    if (an) {
      an.uppdatera(dt)
      if (an.badar && !an.kvackt) {
        an.kvackt = true
        if (!a.sample('djur_anka')) a.tone({ freq: 520, dur: 0.12, type: 'square', vol: 0.08, slideTo: 380 })
        spray(ctx.fxLayer, an.nod.x, an.nod.y - 10, { count: 5, former: ['cirkel'], colors: VATTEN_FARGER, size: 5, dist: 60, angle: -Math.PI / 2, spread: 2, gravity: 500, life: 0.6 })
      }
      if (an.badar && Math.random() < dt * 4) {
        spray(ctx.fxLayer, an.nod.x, an.nod.y - 12, { count: 2, former: ['cirkel'], colors: VATTEN_FARGER, size: 4.5, dist: 46, angle: -Math.PI / 2, spread: 2.2, gravity: 500, life: 0.5 })
      }
      if (an.klar) {
        an.riv()
        this._anka = null
      }
    }
    for (let i = this._pooler.length - 1; i >= 0; i--) {
      const p = this._pooler[i]
      p.age += dt
      p.wd.update(ms)
      p.vy.update()
      // vattnet rinner ner i gräset: efter en stund sugs det bort längs marken tills allt är borta
      if (p.age > 0.9) p.wd.drain((p.left + p.right) / 2, p.bottom - 6, p.right - p.left, 34, { max: 3 })
      if (p.age > 2.0) p.wd.drain((p.left + p.right) / 2, p.bottom - 40, p.right - p.left, 90, { max: 3 })
      if (p.wd.count === 0 || p.age > 5.5) {
        p.riv()
        this._pooler.splice(i, 1)
      }
    }

    // --- motgång: solen värmer ett svalt djur ---
    this._varmeSteg(ctx, dt)

    // --- finish ---
    if (this._finish) this._finishSteg(ctx, dt)

    // --- om-cue: bara småbarn, mjukt vid ~6 s ---
    if (!voice.talar && (this._st === 'ingen' || this._st === 'klar')) this._idle += dt
    if (this._idle > 6) {
      this._idle = 0
      if (this._st === 'ingen') {
        voice.say('Tryck på kranen!')
        this._ratSpin = 9
        squash(k.pulsa, { intensity: 0.8 })
      } else {
        voice.say('Dra bakåt och sikta!')
        if (this._bal) pop(this._bal.vy, { scale: 1.12 })
      }
    }

    // sondkrok
    this._ballong.k = this._bal ? this._bal._k : 0
  },

  _fyllSteg(ctx, dt) {
    const b = this._bal
    this._fyllT += dt
    const u = clamp(this._fyllT / FYLL_S, 0, 1)
    const e = 1 - (1 - u) * (1 - u)
    b.skala(0.3 + 0.7 * e)
    b.nod.position.set(PIP.x, PIP.y + 40 + (SKOTT.y - PIP.y - 40) * e)
    this._ballong.x = b.nod.x
    this._ballong.y = b.nod.y
    this._ballong.k = e
    // dallret: små knuffar medan den sväller
    this._fyllDrop -= dt
    if (this._fyllDrop <= 0) {
      this._fyllDrop = 0.11
      b.knuff((Math.random() * 2 - 1) * 20, (Math.random() * 2 - 1) * 24, 2.4 + 2 * e, 70)
      spray(ctx.fxLayer, PIP.x, PIP.y + 36, { count: 1, former: ['cirkel'], colors: VATTEN_FARGER, size: 4.5, dist: 40, angle: Math.PI / 2, spread: 0.25, gravity: 600, life: 0.3, sizeTo: 0.6 })
    }
    // vattenljudet stiger i tonhöjd medan den fylls
    if (Math.random() < dt * 8) ctx.services.audio.tone({ freq: 380 + 560 * e + Math.random() * 40, dur: 0.05, type: 'sine', vol: 0.05 })
    if (u >= 1) this._fylldKlar(ctx)
  },

  _klarSteg(dt) {
    const b = this._bal
    // hänger och dallrar vid pipen; dras mjukt bakåt när barnet siktar
    b.nod.position.set(SKOTT.x + this._pull.x, SKOTT.y + this._pull.y)
    b.vy.y = Math.sin(this._tid * 2.4) * 2.6
    b.vy.rotation = Math.sin(this._tid * 1.6) * 0.04
    this._ballong.x = SKOTT.x
    this._ballong.y = SKOTT.y
    this._vobT = (this._vobT || 0) - dt
    if (this._vobT <= 0) {
      this._vobT = 0.7 + Math.random() * 0.6
      b.knuff((Math.random() * 2 - 1) * 24, (Math.random() * 2 - 1) * 28, 2.2, 70)
    }
  },

  _flygSteg(ctx, dt) {
    const b = this._bal
    const body = this._ballBody
    if (!body) return
    b.nod.position.set(body.position.x, body.position.y)
    this._ballong.x = body.position.x
    this._ballong.y = body.position.y
    this._flygT += dt
    const vx = body.velocity.x
    const vy = body.velocity.y
    // vobblar genom luften: en andra ordningens vågning som växlar tecken i takt med färden
    this._vobT -= dt
    if (this._vobT <= 0) {
      this._vobT = 0.12
      this._vobS *= -1
      b.vobbla(Math.atan2(vy, vx), 4.2 * this._vobS)
    }
    b.vy.rotation = clamp(Math.atan2(vy, vx) * 0.12, -0.5, 0.5)
    if (this._kontakt) this._borjaSplat(ctx, this._kontakt)
    else if (this._flygT > 8) this._borjaSplat(ctx, { typ: 'mark', x: clamp(body.position.x, 40, 1240), y: MARK_Y - 4, nx: 0, ny: 1 }) // skyddsnät
  },

  _splatSteg(ctx, dt) {
    const b = this._bal
    const k = this._splatK
    // en kort tillplattning längs nedslagets normal — ballongen buktar sig innan den ger upp
    if (this._splatN < 5) {
      this._splatN++
      b.platta(k.nx, k.ny, 0.42)
    }
    this._splatT -= dt
    if (this._splatT <= 0) this._spricka(ctx)
  },

  // Motgången: ETT djur i taget, högst TAK_UPPVARMNING per runda, aldrig efter att alla är svala ---
  _varmeSteg(ctx, dt) {
    const v = this._varmt
    if (v && !v.upp) {
      this._varmt = null
      this._nastaVarme = 9 + Math.random() * 4
    }
    if (this._st === 'finish') return
    if (!this._varmt) {
      const svala = this._djur.filter((d) => d.svalad)
      // klockan går bara medan minst två djur är svala — solen tar sig inte an ett helt varmt följe
      if (svala.length >= 2) this._nastaVarme -= dt
      else this._nastaVarme = FORSTA_UPPVARMNING_S
      const kvarVarma = this._djur.length - svala.length
      if (this._nastaVarme <= 0 && this._uppv < TAK_UPPVARMNING && svala.length >= 2 && kvarVarma >= 1 && (this._st === 'ingen' || this._st === 'klar')) {
        const kand = svala.filter((d) => d.sval > 0.95)
        if (kand.length) {
          const d = kand[(Math.random() * kand.length) | 0]
          this._varmt = d
          this._uppv++
          d.varma()
          this._strale = 0
          ctx.services.audio.tone({ freq: 440, dur: 0.4, type: 'triangle', vol: 0.12, slideTo: 300 })
          ctx.services.voice.say('Solen värmer igen!')
        } else this._nastaVarme = 2
      }
    }
    // strålen från solen ner till det uppvärmda djuret
    const g = this._stralG
    if (this._varmt) {
      this._strale = Math.min(1, this._strale + dt * 1.4)
      const d = this._varmt
      this._straleMal = { x: d.x, y: d.fotY - d.hojd * 0.7 }
      ritaStrale(g, SOL.x, SOL.y, this._straleMal.x, this._straleMal.y, this._strale * (0.75 + 0.25 * Math.sin(this._tid * 5)))
    } else if (this._strale > 0) {
      this._strale = Math.max(0, this._strale - dt * 2)
      const m = this._straleMal
      if (this._strale <= 0 || !m) g.clear()
      else ritaStrale(g, SOL.x, SOL.y, m.x, m.y, this._strale)
    }
  },

  _finishSteg(ctx, dt) {
    const f = this._finish
    f.t += dt
    // regnbågen växer fram ur vattendimman
    const p = clamp(f.t / 2.4, 0, 1)
    const e = 1 - (1 - p) * (1 - p)
    ritaRegnbage(this._regnbage, 700, 640, 430, e)
    if (f.t > 5) this._regnbage.alpha = clamp(1 - (f.t - 5) / 0.6, 0, 1)
    // fontäner: varje djur sprutar vatten rakt upp
    if (f.t < 3.4) {
      f.sprut -= dt
      if (f.sprut <= 0) {
        f.sprut = 0.1
        for (const d of this._djur) {
          const h = d.huvudPos
          spray(ctx.fxLayer, h.x, h.y - 6, {
            count: 2, former: ['cirkel'], colors: VATTEN_FARGER, size: 6.5, sizeVar: 0.4, dist: 200, distVar: 0.35,
            angle: -Math.PI / 2, spread: 0.6, gravity: 620, life: 1.0, lifeVar: 0.2,
          })
        }
      }
      if (f.t > 0.4 && Math.random() < dt * 5) ctx.services.audio.tone({ freq: SKALA[(Math.random() * 6) | 0], dur: 0.14, type: 'sine', vol: 0.08 })
    }
  },

  // ---------------------------------------------------------------------------------------------
  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    ctx.services.audio.stopLoop('vbfyll')
    this._unbindKoll?.()
    this._unbindSteg?.()
    this._launcher?.destroy()
    this._launcher = null
    this._vind?.destroy()
    this._vind = null
    for (const p of this._pooler || []) p.riv()
    this._pooler = []
    for (const p of this._polar || []) p.riv()
    this._polar = []
    this._anka?.riv()
    this._anka = null
    this._bal?.riv()
    this._bal = null
    for (const d of this._djur || []) d.riv()
    this._djur = []
    if (this._kranObj) stadFx(this._kranObj.nod)
    if (this._hit) stadFx(this._hit)
    this._phys?.destroy()
    this._phys = null
    this._ballBody = null
    this._root?.destroy({ children: true })
    this._root = null
    this._kranObj = null
    this._ctx = null
  },
}
