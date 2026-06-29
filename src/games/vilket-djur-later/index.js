// Vilket Djur Låter Så? — pedagogiskt tryck-spel (2–5 år). Rösten spelar upp ett
// djurläte (t.ex. "Mu! Muu!") och barnet trycker på rätt djur bland 2–6 stora,
// gulliga kort på en solig äng. Rätt -> kortet hoppar glatt, gnistror + stjärna,
// och djuret "svarar" med sitt namn ("Det är en ko! Kon säger muu!"). Fel -> mjuk,
// vänlig vingel + neutralt ljud, och lätet upprepas snällt. ALDRIG bestraffning,
// ingen poäng som sjunker, ingen timer. Oändlig, lugnt växande lek.
//
// Djup (anti-enformighet): antal kort växer med nivån (2 -> 3 -> 4 -> 6), djuren
// varieras ur en bred pool varje runda, och fler frågor krävs per firande på högre
// nivåer. Allt async är this._alive-skyddat (exit-säkert): ticker, fördröjda anrop
// och varje tween dödas i destroy().
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, floatText, ripple, shake, burst, breathe } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Djurdata: emoji + svenskt namn (rätt artikel + bestämd form) för en grammatiskt
// korrekt bekräftelse, + lätesord (late) och frasen rösten spelar som ledtråd (fras),
// + en egen accentfärg så varje djur blir tydligt och igenkännbart.
const DJUR = [
  { id: 'ko', emoji: '🐮', namn: 'ko', art: 'en', best: 'Kon', late: 'muu', fras: 'Mu! Muu!', color: 0xff9ec4 },
  { id: 'hund', emoji: '🐶', namn: 'hund', art: 'en', best: 'Hunden', late: 'voff', fras: 'Voff! Voff!', color: 0xffd35c },
  { id: 'katt', emoji: '🐱', namn: 'katt', art: 'en', best: 'Katten', late: 'mjau', fras: 'Mjau! Mjau!', color: 0xff8a3d },
  { id: 'gris', emoji: '🐷', namn: 'gris', art: 'en', best: 'Grisen', late: 'nöff', fras: 'Nöff! Nöff!', color: 0xffb3d1 },
  { id: 'far', emoji: '🐑', namn: 'får', art: 'ett', best: 'Fåret', late: 'bää', fras: 'Bää! Bää!', color: 0x57c8c3 },
  { id: 'hast', emoji: '🐴', namn: 'häst', art: 'en', best: 'Hästen', late: 'gnägg', fras: 'Gnägg! Gnägg!', color: 0xa78bfa },
  { id: 'anka', emoji: '🦆', namn: 'anka', art: 'en', best: 'Ankan', late: 'kvack', fras: 'Kvack! Kvack!', color: 0xffd35c },
  { id: 'hona', emoji: '🐔', namn: 'höna', art: 'en', best: 'Hönan', late: 'pock', fras: 'Pock pock pock!', color: 0xff6b6b },
  { id: 'groda', emoji: '🐸', namn: 'groda', art: 'en', best: 'Grodan', late: 'kvack', fras: 'Kvack! Kvack!', color: 0x5bbf6a },
  { id: 'bi', emoji: '🐝', namn: 'bi', art: 'ett', best: 'Biet', late: 'surr', fras: 'Bzzz! Bzzz!', color: 0xffd35c },
  { id: 'tupp', emoji: '🐓', namn: 'tupp', art: 'en', best: 'Tuppen', late: 'kuckeliku', fras: 'Kuckeliku!', color: 0xff6b6b },
  { id: 'uggla', emoji: '🦉', namn: 'uggla', art: 'en', best: 'Ugglan', late: 'hoo', fras: 'Hoo! Hoo!', color: 0xa78bfa },
]

// Svårighet = antal svarsalternativ (osynligt för barnet, växer långsamt).
const LEVELS = [2, 3, 4, 6]

// Korta, varierade rundinstruktioner (rösten) så det aldrig blir enformigt.
const ROUND_PROMPTS = [
  'Vilket djur låter så här?',
  'Lyssna! Vad är det som låter?',
  'Vem är det som låter nu?',
  'Vilket djur hör du?',
]

// Glada svävande emoji vid rätt svar.
const HAPPY = ['⭐', '🌟', '✨', '💛', '😄']

// Layout (designkoordinater 1280x720).
const SOUND_X = 640
const SOUND_Y = 158
const SOUND_R = 86
const CARD_AREA_TOP = 300
const CARD_AREA_BOTTOM = 700
const GAP_X = 44
const GAP_Y = 34

export default {
  id: 'vilket-djur-later',
  titleSv: 'Vilket Djur Låter Så?',
  icon: '🐮',
  category: 'pedagogiskt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'vilket-djur-later',
  voiceIntro: 'Lyssna! Vilket djur låter så här?',

  init(ctx) {
    this._alive = true
    this._first = true
    this._busy = false
    this._idle = 0
    this._wins = 0
    this._calls = []
    this._cards = []
    this._lastAnswerId = null

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Marknadsmässig bakgrund: mjuk äng med sol, kullar och drivande moln.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // 2) Osynlig tap-fångare under korten: tryck bredvid ett kort -> mjukt ljud +
    //    liten ring där fingret var + en vänlig vingel på ett kort (aldrig "fel").
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._root.addChild(tap)

    // 3) Ljud-/repetera-knappen (ligger kvar mellan rundor).
    this._makeSoundButton(ctx)

    // 4) Kort-lager (det enda som byggs om per runda).
    this._cardLayer = new Container()
    this._root.addChild(this._cardLayer)

    // Nivå från sparad framgång (antal kort på skärmen).
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)
    // Hur många rätt innan nästa stora firande (växer med nivån).
    this._winsInSet = 0
    this._setTarget = 3 + this._level

    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._cueSoon(ctx, 1.3) // första lätet en stund efter intron
  },

  // --- scen-byggare -------------------------------------------------------

  // Vänlig "öra/högtalare"-knapp: gul cirkel + 🔊 + puls-ring. Tryck = repris av
  // lätet (in-game-repetera). Studsar in och stannar kvar mellan rundor.
  _makeSoundButton(ctx) {
    const btn = new Container()
    btn.position.set(SOUND_X, SOUND_Y)

    // Mjuk markskugga + halo bakom badgen ger djup.
    btn.addChild(new Graphics().ellipse(0, SOUND_R + 18, SOUND_R * 0.8, 16).fill({ color: 0x000000, alpha: 0.12 }))
    btn.addChild(new Graphics().circle(0, 0, SOUND_R + 16).fill({ color: COLORS.yellow, alpha: 0.22 }))

    const ring = new Graphics().circle(0, 0, SOUND_R + 6).stroke({ width: 7, color: COLORS.white, alpha: 0.95 })
    ring.alpha = 0
    ring.eventMode = 'none'

    const body = new Graphics().circle(0, 0, SOUND_R).fill(COLORS.yellow).stroke({ width: 8, color: COLORS.white })
    // Liten glansdager uppe till vänster.
    const gloss = new Graphics().ellipse(-26, -30, 26, 16).fill({ color: COLORS.white, alpha: 0.4 })
    gloss.eventMode = 'none'

    const icon = new Text({ text: '🔊', style: { fontFamily: FONT.body, fontSize: 90 } })
    icon.anchor.set(0.5)
    icon.eventMode = 'none'

    btn.addChild(ring, body, gloss, icon)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.hitArea = new Circle(0, 0, SOUND_R + 30) // generös träffyta (radie + halo)
    btn.on('pointertap', () => {
      pop(btn)
      this._playSound(ctx)
    })

    this._root.addChild(btn)
    this._soundBtn = btn
    this._ring = ring
    bounceIn(btn, { duration: 0.4 })
  },

  // Gulligt djurkort: mjuk skugga + ren cremebricka + färgad "spotlight"-skiva med
  // glansdager och stor djur-emoji som gungar lugnt. Tryck = välj svar.
  _makeCard(ctx, djur, cardW, cardH, faceSize, discR) {
    const card = new Container()
    card._djur = djur

    // Markskugga under kortet.
    const shadow = new Graphics().ellipse(0, cardH / 2 - 2, cardW * 0.42, 20).fill({ color: 0x000000, alpha: 0.14 })
    shadow.eventMode = 'none'

    // Brickan: rundad cremeruta med vit kant + mjuk topp-sheen.
    const body = new Graphics()
      .roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 32)
      .fill(COLORS.cream)
      .stroke({ width: 6, color: COLORS.white, alpha: 0.95 })
    body.roundRect(-cardW / 2 + 12, -cardH / 2 + 12, cardW - 24, cardH * 0.34, 22).fill({ color: COLORS.white, alpha: 0.45 })
    body.eventMode = 'none'

    // Färgad spotlight-skiva som gör djuret tydligt och varje kort distinkt.
    const disc = new Graphics().circle(0, -8, discR).fill(djur.color)
    disc.circle(-discR * 0.32, -8 - discR * 0.34, discR * 0.4).fill({ color: COLORS.white, alpha: 0.22 })
    disc.eventMode = 'none'

    // Djuret (emoji) — gungar lugnt (idle-bob) för liv.
    const face = new Text({ text: djur.emoji, style: { fontFamily: FONT.body, fontSize: faceSize } })
    face.anchor.set(0.5)
    face.position.set(0, -8)
    face.eventMode = 'none'

    card.addChild(shadow, body, disc, face)
    card._face = face
    card._baseY = 0 // sätts av anroparen efter positionering

    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.hitArea = new Rectangle(-cardW / 2 - 24, -cardH / 2 - 24, cardW + 48, cardH + 48)
    card.on('pointertap', () => this._choose(ctx, card))

    // Lugn gung-tween (egen fas) — exit-säkert: dödas före kortet förstörs.
    gsap.to(face, {
      y: -8 - 7,
      duration: 0.9 + Math.random() * 0.4,
      delay: Math.random() * 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
    return card
  },

  // --- rund-logik ---------------------------------------------------------

  // Bygg en ny runda: städa förra korten, slumpa rätt-djur + distraktorer ur den
  // breda poolen (aldrig samma svar två gånger i rad; distraktorer delar aldrig läte
  // med svaret), och studsa in korten. Spelar INTE lätet här — det styrs separat.
  _newRound(ctx) {
    if (!this._alive) return
    this._clearCards()
    this._busy = false
    this._idle = 0
    this._killCalls()

    const n = LEVELS[this._level]

    // Färskt svar (aldrig samma som förra rundan).
    let pool = DJUR.filter((d) => d.id !== this._lastAnswerId)
    if (!pool.length) pool = DJUR
    const answer = randomFrom(pool)
    this._answer = answer
    this._lastAnswerId = answer.id

    // Distraktorer får aldrig dela läte med svaret (groda/anka säger båda "kvack").
    const distractors = shuffle(DJUR.filter((d) => d.id !== answer.id && d.late !== answer.late)).slice(0, n - 1)
    const round = shuffle([answer, ...distractors])

    // Adaptiv layout: 2–4 kort på en rad, 6 kort i ett 3×2-rutnät.
    const cols = n <= 4 ? n : 3
    const rows = Math.ceil(n / cols)
    const cardW = rows === 1 ? 226 : 210
    const cardH = rows === 1 ? 256 : 192
    const faceSize = rows === 1 ? 120 : 100
    const discR = rows === 1 ? 80 : 70
    const gridW = cols * cardW + (cols - 1) * GAP_X
    const gridH = rows * cardH + (rows - 1) * GAP_Y
    const areaCY = (CARD_AREA_TOP + CARD_AREA_BOTTOM) / 2
    const startX = (ctx.width - gridW) / 2 + cardW / 2
    const startY = areaCY - gridH / 2 + cardH / 2

    round.forEach((djur, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const card = this._makeCard(ctx, djur, cardW, cardH, faceSize, discR)
      card.x = startX + col * (cardW + GAP_X)
      card.y = startY + row * (cardH + GAP_Y)
      card._baseY = card.y
      this._cardLayer.addChild(card)
      this._cards.push(card)
      bounceIn(card, { delay: 0.06 + i * 0.07, duration: 0.34 })
    })

    // Talad rundinstruktion (första rundan täcks av voiceIntro i mount) + ledtråd.
    if (!this._first) {
      ctx.services.voice.say(randomFrom(ROUND_PROMPTS))
      this._cueSoon(ctx, 1.1)
    }
    this._first = false
  },

  // Spela upp lätet (ledtråd): pling + svävande noter + puls-ring + rösten säger lätet.
  _playSound(ctx) {
    if (!this._alive || !this._answer) return
    this._idle = 0
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say(this._answer.fras)
    floatText(ctx.fxLayer, SOUND_X - 30, SOUND_Y - 40, '🎵', { fontSize: 40, rise: 70 })
    floatText(ctx.fxLayer, SOUND_X + 34, SOUND_Y - 30, '🎶', { fontSize: 36, rise: 84 })

    const ring = this._ring
    if (ring && !ring.destroyed) {
      gsap.killTweensOf(ring)
      gsap.killTweensOf(ring.scale)
      ring.scale.set(1)
      ring.alpha = 0.85
      gsap.to(ring.scale, { x: 1.55, y: 1.55, duration: 0.75, ease: 'sine.out' })
      gsap.to(ring, { alpha: 0, duration: 0.75, ease: 'sine.out' })
    }
  },

  _choose(ctx, card) {
    if (!this._alive || this._busy) return
    this._idle = 0
    this._clearHint()

    // Omedelbar (<100ms) återkoppling på VARJE tryck: ljud + studs + ring.
    ctx.services.audio.sfx('tap')
    pop(card)
    ripple(ctx.fxLayer, card.x, card.y, { color: card._djur.color, maxR: 90 })

    if (card._djur !== this._answer) {
      // Fel: aldrig bestraffning — mjuk vingel + neutralt ljud, upprepa lätet vänligt.
      ctx.services.audio.sfx('soft')
      wiggle(card)
      this._cueSoon(ctx, 0.9)
      return
    }

    // Rätt! Fira kortet och låt djuret "svara" med sitt namn.
    this._busy = true
    ctx.services.audio.sfx('correct')
    sparkle(ctx.fxLayer, card.x, card.y - 8)
    burst(ctx.fxLayer, card.x, card.y - 8, { count: 14, power: 1 })
    floatText(ctx.fxLayer, card.x, card.y - 70, randomFrom(HAPPY), { fontSize: 60, rise: 90 })
    ctx.services.voice.say(`Det är ${card._djur.art} ${card._djur.namn}! ${card._djur.best} säger ${card._djur.late}!`)

    // Glad hopp-animation på vinnarkortet; tona de andra mjukt.
    this._celebrateCard(card)

    // Spara framsteg + höj svårighet långsamt.
    const rundor = (ctx.progress.get().custom?.rundor || 0) + 1
    ctx.progress.setCustom('rundor', rundor)
    const lvl = clampLevel(Math.floor(rundor / 3))
    if (lvl > this._level) this._level = lvl
    ctx.progress.setLevel(this._level)

    this._wins++
    this._winsInSet++

    if (this._winsInSet >= this._setTarget) {
      // Milstolpe: mjuk skak + delat stort firande (firar-ljud, beröm, konfetti,
      // stjärna, klistermärke sköts av complete() — vi dubblerar det inte).
      this._winsInSet = 0
      this._setTarget = 3 + this._level
      this._schedule(1.7, () => {
        this._shakeTween = shake(this._root, { intensity: 6, duration: 0.4 })
        ctx.progress.complete()
      })
      this._schedule(3.3, () => this._nextRound(ctx))
    } else {
      this._schedule(1.8, () => this._nextRound(ctx))
    }
  },

  // Glad hopp + studs på vinnarkortet; mjuk nedtoning av de andra korten.
  _celebrateCard(card) {
    const baseY = card._baseY
    gsap.killTweensOf(card)
    gsap
      .timeline()
      .to(card, { y: baseY - 26, duration: 0.18, ease: 'power2.out' })
      .to(card, { y: baseY, duration: 0.5, ease: 'bounce.out' })
    if (card._face) {
      gsap.killTweensOf(card._face)
      card._face.y = -8
      gsap.fromTo(card._face, { rotation: -0.14 }, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    }
    this._cards.forEach((c) => {
      if (c === card || c.destroyed) return
      gsap.to(c, { alpha: 0.5, duration: 0.3, ease: 'sine.out' })
      gsap.to(c.scale, { x: 0.92, y: 0.92, duration: 0.3, ease: 'sine.out' })
    })
  },

  _nextRound(ctx) {
    this._newRound(ctx)
  },

  // Tomt tryck bredvid korten: mjukt ljud + ring där fingret var + vänlig vingel.
  _emptyTap(ctx, e) {
    if (!this._alive || this._busy) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    if (e?.global) {
      const p = this._root.toLocal(e.global)
      ripple(ctx.fxLayer, p.x, p.y, { color: COLORS.green, maxR: 70 })
    }
    if (this._cards.length) wiggle(randomFrom(this._cards))
  },

  // Idle ~6s utan rätt: upprepa instruktion + lätet och locka med en lugn
  // andnings-puls (breathe) på rätt kort. Återställs vid varje tryck.
  _update(ctx, ticker) {
    if (!this._alive || this._busy) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(ROUND_PROMPTS))
      this._cueSoon(ctx, 1.0)
      const answerCard = this._cards.find((c) => c._djur === this._answer)
      if (answerCard && !answerCard.destroyed) {
        this._clearHint()
        this._hintCard = answerCard
        this._hintTween = breathe(answerCard, { scale: 1.1, duration: 0.85 })
      }
    }
  },

  // Schemalägg en (enda) fördröjd ledtråd — ersätter ev. tidigare så de inte staplas.
  _cueSoon(ctx, delay) {
    this._cueCall?.kill()
    this._cueCall = gsap.delayedCall(delay, () => {
      if (this._alive && !this._busy) this._playSound(ctx)
    })
  },

  // Fördröjda anrop i firandesekvensen (alive-skyddade, spårade).
  _schedule(delay, fn) {
    const call = gsap.delayedCall(delay, () => {
      if (this._alive) fn()
    })
    this._calls.push(call)
    return call
  },

  _killCalls() {
    this._calls?.forEach((c) => c.kill())
    this._calls = []
  },

  // Stoppa idle-hintens andnings-puls och återställ kortets skala.
  _clearHint() {
    this._hintTween?.kill()
    this._hintTween = null
    if (this._hintCard && !this._hintCard.destroyed) this._hintCard.scale.set(1)
    this._hintCard = null
  },

  // Döda alla tweens på nuvarande kort och förstör dem (exit-säkert mellan rundor).
  _clearCards() {
    this._clearHint()
    this._cards.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
      if (c._face) gsap.killTweensOf(c._face)
    })
    this._cardLayer?.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._cards = []
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._cueCall?.kill()
    this._shakeTween?.kill()
    this._killCalls()
    this._clearHint()
    // Döda kort-tweens (och gung/skala) innan trädet rivs.
    this._cards?.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
      if (c._face) gsap.killTweensOf(c._face)
    })
    if (this._soundBtn) {
      gsap.killTweensOf(this._soundBtn)
      gsap.killTweensOf(this._soundBtn.scale)
    }
    if (this._ring) {
      gsap.killTweensOf(this._ring)
      gsap.killTweensOf(this._ring.scale)
    }
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
