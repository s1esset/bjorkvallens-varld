// Vart Tog Det Vägen? — det klassiska kopp-spelet ("hitta bollen") för 3–5 år.
// En leksak göms under en av tre koppar, kopparna byter plats i lugna svep och
// barnet följer med blicken och trycker på rätt kopp. Rätt kopp lyfts och
// leksaken hoppar fram (firande); fel kopp lyfts lite, visar tom plats och får
// trycka igen — aldrig ett "fel". Ingen poäng, ingen timer, inget slut.
// Allt ritas programmatiskt (Pixi Graphics + emoji), inga externa filer.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'

const SLOT_X = [400, 640, 880] // kopparnas tre platser (mellanrum 240px)
const BASE_Y = 470 // y-referenslinje: koppen nedsänkt på bordet
const LIFT_Y = BASE_Y - 120 // koppens y i lyft-läge (visa/kika)
const PEEK_Y = BASE_Y - 60 // litet lyft vid fel gissning (visar tom plats)
const ROUNDS_PER_LEVEL = 3

// Svårigheten växer via fler/snabbare byten — aldrig fler koppar.
const LEVELS = [
  { swaps: 2, swapDur: 0.7 }, // nivå 0 (lättast, 3-åring)
  { swaps: 3, swapDur: 0.6 },
  { swaps: 4, swapDur: 0.5 },
  { swaps: 6, swapDur: 0.42 }, // svårast
]

const PRIZES = ['🐥', '⭐', '🍓', '🐸', '🚗', '🎈', '🐱', '🌟', '🦋', '🍎']
const CUP_COLORS = [COLORS.red, COLORS.blue, COLORS.yellow]
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

  // Bygg den persistenta scenen en gång: bakgrund, bord, skuggor, leksak, 3 koppar.
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

    // Mjuka skuggor under varje plats (dekorativa).
    const shadows = new Graphics()
    shadows.eventMode = 'none'
    shadows.interactiveChildren = false
    for (const x of SLOT_X) shadows.ellipse(x, BASE_Y + 58, 96, 20).fill({ color: COLORS.shadow, alpha: 0.12 })
    this._root.addChild(shadows)

    // Leksaken: en Text-emoji, BAKOM kopparna i z-led (döljs när koppen är nere,
    // syns när koppen lyfts). Återanvänds varje runda (byter bara text/plats).
    this._prize = new Text({ text: PRIZES[0], style: { fontFamily: FONT.body, fontSize: 96, align: 'center' } })
    this._prize.anchor.set(0.5)
    this._prize.eventMode = 'none'
    this._prize.position.set(SLOT_X[0], BASE_Y)
    this._root.addChild(this._prize)

    // Tre koppar (en fast färg var, så barnet kan följa både plats och färg).
    this._cups = []
    for (let i = 0; i < 3; i++) {
      const cup = this._makeCup(CUP_COLORS[i])
      cup._slot = i
      cup._peeking = false
      cup.position.set(SLOT_X[i], BASE_Y)
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

  // Ny runda: nollställ koppar till hemplats, slumpa göm-plats + leksak, visa, blanda.
  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._phase = 'reveal'

    // Återställ koppar till sina hemplatser (snäppt, inga kvardröjande tweens).
    this._cups.forEach((cup, i) => {
      gsap.killTweensOf(cup)
      gsap.killTweensOf(cup.scale)
      cup._slot = i
      cup._peeking = false
      cup.x = SLOT_X[i]
      cup.y = BASE_Y
      cup.rotation = 0
      cup.scale.set(1)
    })

    // Slumpa göm-plats och leksak. Prize-koppen följs via identitet.
    this._prizeSlot = (Math.random() * 3) | 0
    this._prizeCup = this._cups[this._prizeSlot]
    this._prize.text = randomFrom(PRIZES)
    this._prize.x = SLOT_X[this._prizeSlot]
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

  // Blanda: utför LEVELS[lvl].swaps sekventiella parbyten med lugna svep.
  _shuffle(ctx) {
    if (!this._alive) return
    this._phase = 'shuffle'
    const lvl = LEVELS[this._level]

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
    for (let s = 0; s < lvl.swaps; s++) {
      // Två olika platser, undvik att direkt ångra föregående byte.
      let pair
      do {
        pair = shuffle([0, 1, 2]).slice(0, 2).sort((a, b) => a - b)
      } while (pair[0] === prev >> 4 && pair[1] === (prev & 0xf))
      prev = (pair[0] << 4) | pair[1]
      const [i, j] = pair
      const cupA = order[i]
      const cupB = order[j]
      const xA = SLOT_X[i]
      const xB = SLOT_X[j]

      const sub = gsap.timeline()
      sub.call(() => {
        if (this._alive) ctx.services.audio.sfx('whoosh')
      })
      sub.to(cupA, { x: xB, duration: lvl.swapDur, ease: 'power1.inOut' }, 0)
      sub.to(cupB, { x: xA, duration: lvl.swapDur, ease: 'power1.inOut' }, 0)
      // cupA bågar lätt över cupB (läser som att den passerar framför).
      sub.to(cupA, { y: BASE_Y - 36, duration: lvl.swapDur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
      // Leksaken följer med sin kopp (den rör sig MED koppen, inte kvar på bordet).
      if (cupA === this._prizeCup) sub.to(this._prize, { x: xB, duration: lvl.swapDur, ease: 'power1.inOut' }, 0)
      if (cupB === this._prizeCup) sub.to(this._prize, { x: xA, duration: lvl.swapDur, ease: 'power1.inOut' }, 0)
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
    this._lastInteract = performance.now()
    ctx.services.voice.say('Var tog den vägen? Tryck på koppen!')
  },

  // Tap på en kopp.
  _onTap(ctx, cup) {
    if (!this._alive) return
    this._lastInteract = performance.now()

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

  // Idle-recue: i gissa-fasen, efter ~6s tystnad, upprepa uppmaningen.
  _update(ctx) {
    if (!this._alive || this._phase !== 'guess') return
    if (performance.now() - this._lastInteract > 6000) {
      this._lastInteract = performance.now()
      ctx.services.voice.say('Var tog den vägen? Tryck på koppen!')
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

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
