// Vart Tog Det Vägen? — det klassiska kopp-spelet ("hitta bollen") för 3–5 år.
// En leksak göms under en av kopparna, kopparna byter plats i lugna svep och
// barnet följer med blicken och trycker på rätt kopp. Rätt kopp lyfts och
// leksaken hoppar fram (firande); fel kopp lyfts lite, visar tom plats och får
// trycka igen — aldrig ett "fel". Ingen poäng, ingen timer, inget slut.
//
// Svårigheten växer med nivån (var 3:e lyckad runda):
//   • FLER KOPPAR: 3 från start, +1 var tredje nivå (nivå 3 -> 4, nivå 6 -> 5).
//   • SAMMA RÖDA FÄRG: från nivå 3 är alla koppar likadant röda, så barnet inte
//     längre kan följa en kopp på dess färg utan måste följa rörelsen.
//   • FLER/SNABBARE BYTEN: antal byten och tempo ökar mjukt med nivån.
// Allt är fortfarande no-fail: fel tryck är lekfullt och idle ger auto-hjälp.
// Allt ritas programmatiskt (Pixi Graphics + emoji), inga externa filer.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle, liv } from '../../lib/feedback.js'
import { COLORS, PRAISE, tint, shade } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { verticalFill } from '../../lib/form.js'

const BASE_Y = 470 // y-referenslinje: koppen nedsänkt på bordet
const LIFT_Y = BASE_Y - 120 // koppens y i lyft-läge (visa/kika)
const PEEK_Y = BASE_Y - 60 // litet lyft vid fel gissning (visar tom plats)
const ROUNDS_PER_LEVEL = 3

// Layout: koppar centreras kring CENTER och sprids med jämnt mellanrum (max
// MAX_SPACING) men hålls inom bordets bredd (SPAN) även när det blir fler.
const CENTER = 640
const MAX_SPACING = 240
const SPAN = 840

// Svårighetsparametrar per nivå (saturerar — högre nivå gör inte spelet hårdare).
const BASE_CUPS = 3 // antal koppar på nivå 0–2
const MAX_CUPS = 5 // tak (håller pekytor och layout rena)
const MAX_SWAPS = 7
const MIN_SWAP_DUR = 0.36
const RED_LEVEL = 3 // från denna nivå: alla koppar samma röda färg
const MAX_LEVEL = 9 // tak på sparad nivå (parametrarna är ändå maxade här)

const PRIZES = ['🐥', '⭐', '🍓', '🐸', '🚗', '🎈', '🐱', '🌟', '🦋', '🍎']
// Distinkta färger används bara på nivå 0–2 (3 koppar). Från nivå 3 blir alla röda.
const CUP_COLORS = [COLORS.red, COLORS.blue, COLORS.yellow, COLORS.green, COLORS.purple]
const TABLE = 0xf2d6a8 // varm bordsyta

// RUMMET. `_plattprobe --medbakgrund` mätte 529 236 px — 57 % av skärmen — i EN ton,
// och den tonen var `COLORS.bg`: bordet svävade i skalets egen letterbox-creme. En scen
// målad i exakt den färgen går dessutom inte att skilja från "ingen bleed alls"
// (kantCream i scripts/bildkoll.mjs), så bakgrunden MÅSTE äga en egen ton.
// Horisonten ligger strax ovanför bordsskivan (415), så bordet står på ett golv.
const HORIZON_Y = 400
const C_WALL_TOP = 0xfff7e6
const C_WALL_BOT = 0xfae7c6
const C_FLOOR_TOP = 0xe6cfab
const C_FLOOR_BOT = 0xd2b68a

export default {
  id: 'vart-tog-det-vagen',
  titleSv: 'Vart Tog Det Vägen?',
  icon: '🥤',
  category: 'minne',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vart-tog-det-vagen',
  voiceIntro: 'Titta noga! Var är leksaken? Tryck på rätt kopp.',

  init(ctx) {
    this._alive = true
    this._timers = []
    this._phase = 'reveal' // reveal | shuffle | guess | resolving
    this._resolving = false
    this._roundsDone = 0
    this._idleCues = 0
    this._lastInteract = performance.now()
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._build(ctx)

    this._tick = () => this._update(ctx)
    ctx.ticker.add(this._tick)

    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg den persistenta scenen en gång: bakgrund, bord, skuggor, leksak.
  // Själva kopparna (antal + färg) byggs/ombyggs av _ensureLayout per nivå.
  _build(ctx) {
    // Bakgrund: fångar "tomt tryck" -> mjukt ljud (aldrig "fel"). Full bleed:
    // täcker även telefonens kantremsor utanför 16:9 (statiskt, enfärgad yta).
    // Vägg + golv (se rumsnoten vid HORIZON_Y). Cachade linjära toningar — noll
    // texturbakningar per montering.
    const w = ctx.width + BLEED_X * 2
    const bg = new Graphics()
    bg.rect(-BLEED_X, -BLEED_Y, w, HORIZON_Y + BLEED_Y).fill(verticalFill(C_WALL_TOP, C_WALL_BOT))
    bg.rect(-BLEED_X, HORIZON_Y, w, ctx.height + BLEED_Y - HORIZON_Y).fill(verticalFill(C_FLOOR_TOP, C_FLOOR_BOT))
    bg.eventMode = 'static'
    bg.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(bg)

    // Bordsyta (dekorativ). Skuggan under skivan lyfter bordet från golvet; utan den
    // låg skivan som en dekal på marken.
    const table = new Graphics()
    table.roundRect(132, 432, 1040, 260, 48).fill({ color: COLORS.shadow, alpha: 0.1 })
    table
      .roundRect(120, 415, 1040, 260, 48)
      .fill(verticalFill(tint(TABLE, 0.13), shade(TABLE, 0.14)))
      .stroke({ width: 8, color: COLORS.orange, alpha: 0.5 })
    table.eventMode = 'none'
    this._root.addChild(table)

    // Mjuka skuggor under varje plats (ritas om per layout).
    this._shadows = new Graphics()
    this._shadows.eventMode = 'none'
    this._shadows.interactiveChildren = false
    this._root.addChild(this._shadows)

    // Leksaken: en Text-emoji, BAKOM kopparna i z-led (döljs när koppen är nere,
    // syns när koppen lyfts). Återanvänds varje runda (byter bara text/plats).
    // P0 ASSETS: behållare för den RITADE leksaken (var en emoji-Text vars
    // .text byttes varje runda).
    this._prize = new Container()
    this._prize.eventMode = 'none'
    this._prize.position.set(CENTER, BASE_Y)
    this._root.addChild(this._prize)

    this._cups = []
    this._slots = []
    this._layoutKey = null
  },

  // Bygg om kopparna om antal/färg ändrats sedan förra rundan. Kopparna ligger
  // alltid överst i z-led (framför skuggor + leksak), så leksaken döljs när koppen
  // är nere och syns när den lyfts.
  _ensureLayout(ctx, params) {
    const key = params.cups + (params.allRed ? ':r' : ':c')
    if (this._layoutKey === key && this._cups.length === params.cups) return
    this._layoutKey = key
    this._slots = computeSlots(params.cups)

    // Riv gamla koppar (döda tweens först — spelaren kan ha hunnit avsluta).
    this._cups.forEach((cup) => {
      gsap.killTweensOf(cup)
      gsap.killTweensOf(cup.scale)
      cup.destroy({ children: true })
    })
    this._cups = []

    // Rita om skuggorna under de nya platserna.
    this._shadows.clear()
    for (const x of this._slots) {
      this._shadows.ellipse(x, BASE_Y + 58, 96, 20).fill({ color: COLORS.shadow, alpha: 0.12 })
    }

    // Bygg kopparna. Från RED_LEVEL är alla samma röda; annars distinkta färger.
    for (let i = 0; i < params.cups; i++) {
      const color = params.allRed ? COLORS.red : CUP_COLORS[i % CUP_COLORS.length]
      const cup = this._makeCup(color)
      cup._slot = i
      cup._peeking = false
      cup.position.set(this._slots[i], BASE_Y)
      cup.eventMode = 'static'
      cup.cursor = 'pointer'
      // Generös träffyta (230x280 ≫ 96px) så även kanttryck registreras.
      cup.hitArea = new Rectangle(-115, -200, 230, 280)
      cup.on('pointertap', () => this._onTap(ctx, cup))
      this._root.addChild(cup)
      this._cups.push(cup)
    }
  },

  // Upp-och-nedvänd kopp: trapets-kropp (smalare topp) + rundad topp + glansremsa.
  // Lokalt origo = referenslinjen; kroppen går från y=-190 (topp) till y=+60 (rim).
  _makeCup(color) {
    const cup = new Container()
    const topW = 150
    const botW = 200
    const top = -190
    const bot = 60
    const g = new Graphics()
    g.moveTo(-topW / 2, top)
      .lineTo(topW / 2, top)
      .lineTo(botW / 2, bot)
      .lineTo(-botW / 2, bot)
      .closePath()
      .fill(color)
      .stroke({ width: 6, color: COLORS.white })
    // rundad topp-kupol
    g.ellipse(0, top, topW / 2, 16).fill(darken(color, 0.12)).stroke({ width: 6, color: COLORS.white })
    // glansremsa
    g.roundRect(-botW / 2 + 26, top + 36, 26, 150, 13).fill({ color: COLORS.white, alpha: 0.22 })
    g.eventMode = 'none'
    cup.addChild(g)
    // Kopparna står och vaggar medan de väntar. Guppningen ligger på den INRE
    // grafiken — spelet äger `cup` (blandning, kik, snäpp tillbaka), så de kan
    // aldrig slåss om samma y.
    liv(g, { bob: 3, sway: 0.01, duration: 2.8 })
    return cup
  },

  // Ny runda: säkerställ layout, nollställ koppar, slumpa göm-plats + leksak, visa, blanda.
  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._phase = 'reveal'
    this._params = levelParams(this._level)
    this._ensureLayout(ctx, this._params)
    const n = this._cups.length

    // Återställ koppar till sina hemplatser (snäppt, inga kvardröjande tweens).
    this._cups.forEach((cup, i) => {
      gsap.killTweensOf(cup)
      gsap.killTweensOf(cup.scale)
      cup._slot = i
      cup._peeking = false
      cup.x = this._slots[i]
      cup.y = BASE_Y
      cup.rotation = 0
      cup.scale.set(1)
    })

    // Slumpa göm-plats och leksak. Prize-koppen följs via identitet.
    this._prizeSlot = (Math.random() * n) | 0
    this._prizeCup = this._cups[this._prizeSlot]
    for (const ch of this._prize.removeChildren()) ch.destroy({ children: true })
    this._prize.addChild(drawIcon(randomFrom(PRIZES), 96))
    this._prize.x = this._slots[this._prizeSlot]
    this._prize.y = BASE_Y
    this._prize.rotation = 0
    this._prize.scale.set(1)
    this._prize.visible = true

    // Visa: lyft alla koppar så leksaken syns under en av dem.
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say('Titta var leksaken är!')
    this._cups.forEach((cup) => this._liftCup(cup, LIFT_Y))
    pop(this._prize)

    // Efter ~1,5s: sänk kopparna (mjukt "tock" mot bordet) och börja blanda.
    this._later(1.5, () => {
      this._cups.forEach((cup) => this._lowerCup(cup))
      this._tock(ctx)
      this._later(0.45, () => this._shuffle(ctx))
    })
  },

  // Blanda: en sekvens av "drag" som VARIERAR (par-byte i olika stilar, cyklisk
  // virvel om 3 koppar, ofarlig fint) så ingen blandning ser exakt likadan ut.
  // Variationen växer med nivån (se planMoves). Glid-ljudet stiger i tonhöjd mot
  // slutet -> en mjuk spännings-crescendo. Leksaken följer alltid MED sin kopp.
  _shuffle(ctx) {
    if (!this._alive) return
    this._phase = 'shuffle'
    const params = this._params
    const n = this._cups.length

    // order[slot] = kopp som just nu står på den platsen (uppdateras per drag).
    const order = []
    this._cups.forEach((c) => (order[c._slot] = c))

    const tl = gsap.timeline({
      onComplete: () => {
        if (this._alive) this._beginGuess(ctx)
      },
    })
    this._shuffleTl = tl

    const moves = planMoves(params.swaps, n, this._level)
    moves.forEach((mv, mi) => {
      const prog = moves.length > 1 ? mi / (moves.length - 1) : 0
      this._addMove(ctx, tl, order, mv, params, prog)
    })
  },

  // Lägg ETT drag till blandnings-tidslinjen. Uppdaterar order[]/_slot löpande.
  // mv = { type:'swap'|'swirl', slots:[…], style, feint }. prog 0..1 = hur långt in
  // i blandningen (styr glid-ljudets tonhöjd). Leksaken följer sin kopp via identitet.
  _addMove(ctx, tl, order, mv, params, prog) {
    const dur = params.swapDur
    const sub = gsap.timeline()

    // Glid/svisch under draget — stigande tonhöjd mot slutet (spänning).
    sub.call(() => {
      if (!this._alive) return
      const base = 280 + prog * 260
      ctx.services.audio.tone({ freq: base, slideTo: base * 0.68, dur: dur * 0.8, type: 'sine', vol: 0.12 })
    })

    if (mv.type === 'swirl') {
      // Cyklisk virvel: tre koppar roterar ett steg (i->j->k->i eller baklänges).
      const [i, j, k] = mv.slots
      const cA = order[i]
      const cB = order[j]
      const cC = order[k]
      const fwd = Math.random() < 0.5
      // [kopp, mål-x, mål-slot]
      const map = fwd
        ? [[cA, this._slots[j], j], [cB, this._slots[k], k], [cC, this._slots[i], i]]
        : [[cA, this._slots[k], k], [cB, this._slots[i], i], [cC, this._slots[j], j]]
      map.forEach(([cup, tx], idx) => {
        sub.to(cup, { x: tx, duration: dur * 1.15, ease: 'power1.inOut' }, 0)
        sub.to(cup, { y: BASE_Y - 30 - idx * 8, duration: dur * 0.6, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
        if (cup === this._prizeCup) sub.to(this._prize, { x: tx, duration: dur * 1.15, ease: 'power1.inOut' }, 0)
      })
      sub.call(() => {
        if (!this._alive) return
        map.forEach(([cup, , slot]) => (cup._slot = slot))
        this._prizeSlot = this._prizeCup._slot
      })
      map.forEach(([cup, , slot]) => (order[slot] = cup))
      tl.add(sub)
      return
    }

    // Par-byte i vald stil.
    const [i, j] = mv.slots
    const cupA = order[i]
    const cupB = order[j]
    const xA = this._slots[i]
    const xB = this._slots[j]

    // Ofarlig "fint": en kopp gör en liten falsk rörelse innan det riktiga bytet.
    if (mv.feint) {
      const feint = Math.random() < 0.5 ? cupA : cupB
      const dx = (Math.random() < 0.5 ? -1 : 1) * 60
      sub.to(feint, { x: feint.x + dx, duration: dur * 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
    }
    const t0 = mv.feint ? dur * 0.7 : 0

    sub.to(cupA, { x: xB, duration: dur, ease: 'power1.inOut' }, t0)
    sub.to(cupB, { x: xA, duration: dur, ease: 'power1.inOut' }, t0)
    // Vem som bågar över (passerar framför) beror på stilen.
    if (mv.style === 'under') {
      sub.to(cupB, { y: BASE_Y - 40, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
    } else if (mv.style === 'cross') {
      sub.to(cupA, { y: BASE_Y - 48, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
      sub.to(cupB, { y: BASE_Y - 20, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
    } else {
      sub.to(cupA, { y: BASE_Y - 40, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
    }
    // Leksaken följer med sin kopp (rör sig MED koppen, inte kvar på bordet).
    if (cupA === this._prizeCup) sub.to(this._prize, { x: xB, duration: dur, ease: 'power1.inOut' }, t0)
    if (cupB === this._prizeCup) sub.to(this._prize, { x: xA, duration: dur, ease: 'power1.inOut' }, t0)
    sub.call(() => {
      if (!this._alive) return
      cupA._slot = j
      cupB._slot = i
      this._prizeSlot = this._prizeCup._slot
    })
    tl.add(sub)
    order[i] = cupB
    order[j] = cupA
  },

  // Gissa-fasen: nu är kopparna tryckbara.
  _beginGuess(ctx) {
    if (!this._alive) return
    this._phase = 'guess'
    this._idleCues = 0
    this._lastInteract = performance.now()
    // Kopparna "landar" — ett sista mjukt tock innan gissningen.
    this._tock(ctx, 0.13)
    ctx.services.voice.say('Var tog den vägen? Tryck på koppen!')
  },

  // Tap på en kopp.
  _onTap(ctx, cup) {
    if (!this._alive) return
    this._lastInteract = performance.now()
    this._idleCues = 0

    // Utanför gissa-fasen (eller mitt i upplösning): lekfullt, ingen rundlogik.
    if (this._phase !== 'guess' || this._resolving) {
      ctx.services.audio.sfx('tap')
      wiggle(cup)
      return
    }

    if (cup === this._prizeCup) {
      // RÄTT: lyft koppen, leksaken hoppar fram, beröm + gnistror.
      this._resolving = true
      this._phase = 'resolving'
      ctx.services.audio.sfx('reveal')
      this._liftCup(cup, LIFT_Y - 10, () => {
        if (!this._alive) return
        ctx.services.audio.sfx('correct')
        pop(cup)
        const gp = ctx.fxLayer.toLocal(this._prize.getGlobalPosition())
        sparkle(ctx.fxLayer, gp.x, gp.y)
        // Leksaken gör SITT eget (anka kvackar, groda hoppar, stjärna snurrar…).
        this._reactPrize(ctx)
        ctx.services.voice.say(randomFrom(PRAISE))
        this._roundsDone++
        this._later(1.3, () => this._finishRound(ctx))
      })
    } else {
      // FEL: lyft lite, visa tom plats, vingla, mjukt ljud, "Kika igen!".
      this._peekEmpty(cup)
      ctx.services.audio.sfx('soft')
      ctx.services.voice.say('Kika igen!')
    }
  },

  // Avsluta runda: efter ROUNDS_PER_LEVEL lyckade rundor -> höj nivå + firande.
  _finishRound(ctx) {
    if (!this._alive) return
    if (this._roundsDone >= ROUNDS_PER_LEVEL) {
      this._roundsDone = 0
      this._level = clampLevel(this._level + 1)
      ctx.progress.setLevel(this._level)
      ctx.progress.complete() // delat firande (1–2s) + stjärna + klistermärke
      this._later(1.8, () => this._newRound(ctx))
    } else {
      this._newRound(ctx)
    }
  },

  // Fel gissning: koppen lyfts ~60px (tom plats), vinglar, sänks tillbaka.
  _peekEmpty(cup) {
    if (cup._peeking) return
    cup._peeking = true
    wiggle(cup)
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, {
      y: PEEK_Y,
      duration: 0.18,
      ease: 'power2.out',
      onComplete: () => {
        if (!this._alive) {
          cup._peeking = false
          return
        }
        this._later(0.4, () => {
          gsap.to(cup, {
            y: BASE_Y,
            duration: 0.22,
            ease: 'power2.in',
            onComplete: () => (cup._peeking = false),
          })
        })
      },
    })
  },

  _liftCup(cup, y, onDone) {
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, {
      y,
      duration: 0.4,
      ease: 'back.out(1.3)',
      onComplete: () => {
        if (this._alive) onDone?.()
      },
    })
  },

  _lowerCup(cup) {
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, { y: BASE_Y, duration: 0.35, ease: 'power2.in' })
  },

  // Mjukt "tock" när en kopp möter bordet (ren syntes, ingen sample behövs).
  _tock(ctx, vol = 0.16) {
    if (!this._alive) return
    ctx.services.audio.tone({ freq: 150, slideTo: 90, dur: 0.09, type: 'sine', vol })
  },

  // Leksaks-reaktion vid fynd: varje sorts leksak gör sitt egna lilla nummer
  // (rörelse + eget ljud). this._prize är ett persistent objekt -> gsap direkt är
  // ok (dödas i destroy); tonerna är fire-and-forget. Rotation/skala nollställs i
  // _newRound, så reaktionerna får lämna dem påverkade.
  _reactPrize(ctx) {
    if (!this._alive) return
    const p = this._prize
    const a = ctx.services.audio
    const fx = ctx.fxLayer
    const gp = fx.toLocal(p.getGlobalPosition())
    gsap.killTweensOf(p)
    gsap.killTweensOf(p.scale)
    const y0 = p.y
    switch (p.text) {
      case '🐥': // anka: vaggar + kvackar
        wiggle(p)
        a.tone({ freq: 620, dur: 0.1, type: 'square', vol: 0.16, slideTo: 470 })
        this._later(0.14, () => a.tone({ freq: 560, dur: 0.1, type: 'square', vol: 0.16, slideTo: 420 }))
        break
      case '🐸': // groda: hoppar med "boing"
        gsap.timeline()
          .to(p, { y: y0 - 80, duration: 0.24, ease: 'power2.out' })
          .to(p, { y: y0, duration: 0.34, ease: 'bounce.out' })
        a.tone({ freq: 200, dur: 0.2, type: 'sine', vol: 0.18, slideTo: 560 })
        break
      case '🚗': // bil: kör iväg och tillbaka med "vroom"
        gsap.timeline()
          .to(p, { x: p.x + 80, duration: 0.28, ease: 'power2.out' })
          .to(p, { x: p.x, duration: 0.4, ease: 'power2.inOut' })
        a.tone({ freq: 120, dur: 0.4, type: 'sawtooth', vol: 0.12, slideTo: 240 })
        break
      case '🎈': // ballong: guppar upp lätt + högt pip
        gsap.timeline()
          .to(p, { y: y0 - 60, duration: 0.5, ease: 'sine.out' })
          .to(p, { y: y0, duration: 0.4, ease: 'sine.in' })
        a.tone({ freq: 900, dur: 0.16, type: 'sine', vol: 0.13, slideTo: 1200 })
        break
      case '🐱': // katt: vinglar + jamar (två toner)
        wiggle(p)
        a.tone({ freq: 700, dur: 0.14, type: 'sawtooth', vol: 0.12, slideTo: 520 })
        this._later(0.16, () => a.tone({ freq: 520, dur: 0.16, type: 'sawtooth', vol: 0.12, slideTo: 660 }))
        break
      case '🦋': // fjäril: fladdrar (snabba vinglingar) + ljus klang + gnistror
        wiggle(p)
        sparkle(fx, gp.x, gp.y, { count: 8 })
        a.tone({ freq: 1000, dur: 0.1, type: 'sine', vol: 0.1, slideTo: 1400 })
        break
      case '⭐':
      case '🌟': // stjärna: snurrar ett varv + gnistror + skimmer
        gsap.to(p, { rotation: p.rotation + Math.PI * 2, duration: 0.6, ease: 'power1.inOut' })
        pop(p)
        sparkle(fx, gp.x, gp.y, { count: 9 })
        a.tone({ freq: 1100, dur: 0.14, type: 'triangle', vol: 0.12, slideTo: 1650 })
        break
      case '🍓':
      case '🍎': // frukt: saftig kläm-puls
        pop(p, { scale: 1.32 })
        a.tone({ freq: 420, dur: 0.12, type: 'sine', vol: 0.16, slideTo: 300 })
        break
      default: // övrigt: glad puls + gnistror
        pop(p)
        sparkle(fx, gp.x, gp.y)
        break
    }
  },

  // Tomt tryck bredvid kopparna: lekfullt mjukt ljud. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive) return
    this._lastInteract = performance.now()
    ctx.services.audio.sfx('soft')
  },

  // Auto-hjälp: lyft rätt kopp en stund så barnet ser var leksaken är, sänk igen.
  // Aldrig ett "fel" — bara en snäll knuff. Koppen är fortfarande tryckbar efteråt.
  _hintPrize(ctx) {
    if (!this._alive || this._phase !== 'guess' || this._resolving) return
    const cup = this._prizeCup
    if (!cup || cup._peeking) return
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say('Titta, här är den!')
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, {
      y: LIFT_Y,
      duration: 0.4,
      ease: 'back.out(1.3)',
      onComplete: () => {
        if (!this._alive) return
        this._later(0.9, () => {
          if (!this._alive || this._phase !== 'guess') return
          gsap.to(cup, { y: BASE_Y, duration: 0.3, ease: 'power2.in' })
        })
      },
    })
  },

  // Idle-recue: i gissa-fasen efter ~6s tystnad — först upprepa uppmaningen,
  // andra gången auto-hjälp (lyft rätt kopp). Aldrig bestraffande.
  _update(ctx) {
    if (!this._alive || this._phase !== 'guess' || this._resolving) return
    if (performance.now() - this._lastInteract > 6000) {
      this._lastInteract = performance.now()
      this._idleCues++
      if (this._idleCues >= 2) {
        this._idleCues = 0
        this._hintPrize(ctx)
      } else {
        ctx.services.voice.say('Var tog den vägen? Tryck på koppen!')
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._timers?.forEach((t) => t.kill())
    this._shuffleTl?.kill()
    this._cups?.forEach((cup) => {
      gsap.killTweensOf(cup)
      gsap.killTweensOf(cup.scale)
    })
    if (this._prize) {
      gsap.killTweensOf(this._prize)
      gsap.killTweensOf(this._prize.scale)
    }
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel?.()
    this._root?.destroy({ children: true })
  },

  // Schemalägg en guardad fördröjd callback (samlas så destroy kan döda dem).
  _later(delay, fn) {
    const c = gsap.delayedCall(delay, () => {
      if (this._alive) fn()
    })
    this._timers.push(c)
    return c
  },
}

// Svårighetsparametrar för en nivå. Parametrarna saturerar vid taken ovan.
function levelParams(level) {
  return {
    cups: Math.min(BASE_CUPS + Math.floor(level / 3), MAX_CUPS),
    swaps: Math.min(2 + level, MAX_SWAPS),
    swapDur: Math.max(MIN_SWAP_DUR, 0.7 - level * 0.05),
    allRed: level >= RED_LEVEL,
  }
}

// Planera blandnings-dragen. Variationen VÄXER med nivån: nivå 0 = bara "over"-
// byten, nivå 1 lägger "under", nivå 2 "cross" + cyklisk virvel (om ≥3 koppar),
// nivå 3 ofarliga finter. Så svårare nivåer är inte bara fler/snabbare utan även
// visuellt rikare. Undviker att direkt upprepa exakt samma par-byte.
function planMoves(count, n, level) {
  const moves = []
  let prevKey = ''
  const swirlOk = n >= 3 && level >= 2
  const styles = ['over']
  if (level >= 1) styles.push('under')
  if (level >= 2) styles.push('cross')
  for (let m = 0; m < count; m++) {
    let mv
    if (swirlOk && Math.random() < 0.28) {
      const pick = shuffle([...Array(n).keys()]).slice(0, 3).sort((a, b) => a - b)
      mv = { type: 'swirl', slots: pick, style: 'over' }
      prevKey = ''
    } else {
      let pair
      do {
        pair = shuffle([...Array(n).keys()]).slice(0, 2).sort((a, b) => a - b)
      } while (n > 2 && pair.join(',') === prevKey)
      prevKey = pair.join(',')
      mv = { type: 'swap', slots: pair, style: randomFrom(styles) }
    }
    // Ofarlig fint (falsk rörelse) blir möjlig från nivå 3.
    mv.feint = level >= 3 && Math.random() < 0.22
    moves.push(mv)
  }
  return moves
}

// Jämnt fördelade kopp-platser, centrerade kring CENTER, inom bordets bredd.
function computeSlots(n) {
  if (n <= 1) return [CENTER]
  const spacing = Math.min(MAX_SPACING, SPAN / (n - 1))
  const total = spacing * (n - 1)
  const start = CENTER - total / 2
  const slots = []
  for (let i = 0; i < n; i++) slots.push(Math.round(start + spacing * i))
  return slots
}

function clampLevel(l) {
  return Math.max(0, Math.min(MAX_LEVEL, l | 0))
}

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
