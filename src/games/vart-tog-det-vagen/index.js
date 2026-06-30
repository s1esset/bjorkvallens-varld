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
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'

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
    // Bakgrund: fångar "tomt tryck" -> mjukt ljud (aldrig "fel").
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(bg)

    // Bordsyta (dekorativ).
    const table = new Graphics()
      .roundRect(120, 415, 1040, 260, 48)
      .fill(TABLE)
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
    this._prize = new Text({ text: PRIZES[0], style: { fontFamily: FONT.body, fontSize: 96, align: 'center' } })
    this._prize.anchor.set(0.5)
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
    this._prize.text = randomFrom(PRIZES)
    this._prize.x = this._slots[this._prizeSlot]
    this._prize.y = BASE_Y
    this._prize.scale.set(1)
    this._prize.visible = true

    // Visa: lyft alla koppar så leksaken syns under en av dem.
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say('Titta var leksaken är!')
    this._cups.forEach((cup) => this._liftCup(cup, LIFT_Y))
    pop(this._prize)

    // Efter ~1,5s: sänk kopparna och börja blanda.
    this._later(1.5, () => {
      this._cups.forEach((cup) => this._lowerCup(cup))
      this._later(0.45, () => this._shuffle(ctx))
    })
  },

  // Blanda: utför params.swaps sekventiella parbyten med lugna svep.
  _shuffle(ctx) {
    if (!this._alive) return
    this._phase = 'shuffle'
    const params = this._params
    const n = this._cups.length
    const indices = this._cups.map((_, i) => i)

    // order[slot] = kopp som just nu står på den platsen (uppdateras vid bygget).
    const order = []
    this._cups.forEach((c) => (order[c._slot] = c))

    const tl = gsap.timeline({
      onComplete: () => {
        if (this._alive) this._beginGuess(ctx)
      },
    })
    this._shuffleTl = tl

    let prev = -1
    for (let s = 0; s < params.swaps; s++) {
      // Två olika platser, undvik att direkt ångra föregående byte.
      let pair
      do {
        pair = shuffle([...indices]).slice(0, 2).sort((a, b) => a - b)
      } while (n > 2 && pair[0] === prev >> 4 && pair[1] === (prev & 0xf))
      prev = (pair[0] << 4) | pair[1]
      const [i, j] = pair
      const cupA = order[i]
      const cupB = order[j]
      const xA = this._slots[i]
      const xB = this._slots[j]

      const sub = gsap.timeline()
      sub.call(() => {
        if (this._alive) ctx.services.audio.sfx('whoosh')
      })
      sub.to(cupA, { x: xB, duration: params.swapDur, ease: 'power1.inOut' }, 0)
      sub.to(cupB, { x: xA, duration: params.swapDur, ease: 'power1.inOut' }, 0)
      // cupA bågar lätt över cupB (läser som att den passerar framför).
      sub.to(cupA, { y: BASE_Y - 36, duration: params.swapDur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
      // Leksaken följer med sin kopp (den rör sig MED koppen, inte kvar på bordet).
      if (cupA === this._prizeCup) sub.to(this._prize, { x: xB, duration: params.swapDur, ease: 'power1.inOut' }, 0)
      if (cupB === this._prizeCup) sub.to(this._prize, { x: xA, duration: params.swapDur, ease: 'power1.inOut' }, 0)
      sub.call(() => {
        if (!this._alive) return
        cupA._slot = j
        cupB._slot = i
        this._prizeSlot = this._prizeCup._slot
      })
      tl.add(sub)
      order[i] = cupB
      order[j] = cupA
    }
  },

  // Gissa-fasen: nu är kopparna tryckbara.
  _beginGuess(ctx) {
    if (!this._alive) return
    this._phase = 'guess'
    this._idleCues = 0
    this._lastInteract = performance.now()
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
        pop(this._prize)
        const gp = ctx.fxLayer.toLocal(this._prize.getGlobalPosition())
        sparkle(ctx.fxLayer, gp.x, gp.y)
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
