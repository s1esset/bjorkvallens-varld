// Djurorkester — musiklek/leksak (2–4 år). En rad/rutnät av sex stora, färgglada
// djurkort, vart och ett med en liten instrument-rekvisita (🥁🎺🎻🎹🪇🎷) så det
// läser som en riktig orkester. En lugn bakgrundstakt pulserar hela tiden — korten
// andas i takt så barnet KÄNNER pulsen och tryck hamnar i en groove. Tryck på ett
// djur → squash-and-stretch-studs, en svävande not, mjukt ljud, en pitchad ton
// (varierad så samma djur aldrig låter mekaniskt likadant) + djurets riktiga läte.
// Spela TRE olika djur i följd → de tre korten gungar TILLSAMMANS och lätena lägger
// sig i en liten ackord-harmoni + extra gnistor ("Wow, de sjunger ihop!"). Inget mål,
// inga fel — det är ett instrument. Var ~8:e tryck → delat firande. Oändlig lek.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { randomFrom } from '../../lib/swedish.js'
import { pop, floatText, sparkle } from '../../lib/feedback.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'

// Djurdata (delmängd av vilket-djur-later). emoji + fras (lätet rösten "sjunger" om
// inget riktigt klipp finns) + note (en ton i en C-dur-pentaton skala så vilken
// kombination av tre som helst blir konsonant/glad) + instr (instrument-rekvisita).
// Mörka djur (ko) får låga toner, ljusa (anka) höga.
const DJUR = [
  { id: 'ko', emoji: '🐮', fras: 'Mu! Muu!', note: 261.63, instr: '🎺' }, // C4
  { id: 'hund', emoji: '🐶', fras: 'Voff! Voff!', note: 329.63, instr: '🥁' }, // E4
  { id: 'katt', emoji: '🐱', fras: 'Mjau! Mjau!', note: 392.0, instr: '🎹' }, // G4
  { id: 'groda', emoji: '🐸', fras: 'Kvack! Kvack!', note: 440.0, instr: '🪇' }, // A4
  { id: 'gris', emoji: '🐷', fras: 'Nöff! Nöff!', note: 293.66, instr: '🎷' }, // D4
  { id: 'anka', emoji: '🦆', fras: 'Kvack kvack!', note: 523.25, instr: '🎻' }, // C5
]

// Beröm när tre olika djur sjunger ihop (kören).
const KOR_BEROM = ['Wow, de sjunger ihop!', 'En hel kör!', 'Så fint, allihop!', 'Lyssna — de sjunger ihop!']

// Layout (designkoordinater 1280x720): 2 rader x 3 kolumner med stora kort.
const COLS = 3
const ROWS = 2
const CARD_W = 300
const CARD_H = 250
const GAP_X = 56
const GAP_Y = 56

// Hur många tryck innan det delade stora firandet (stjärna + klistermärke).
const TAPS_PER_CELEBRATION = 8

// Bakgrundstakt: lugnt tempo (~80 slag/min) så det känns rofyllt, inte stressande.
const BEAT = 0.75 // sekunder per slag

export default {
  id: 'djurorkester',
  titleSv: 'Djurorkester',
  icon: '🐾',
  category: 'pedagogiskt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'djurorkester',
  voiceIntro: 'Tryck på djuren så sjunger de!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._taps = 0
    this._cards = []
    this._seq = [] // rullande fönster av senaste tryckta korten (för kör-belöningen)
    this._beatTime = 0
    this._beatIndex = 0
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._build(ctx)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg rutnätet en gång: sex djurkort, var sin distinkt färg, studsar in.
  _build(ctx) {
    if (!this._alive) return
    const palette = PLAYFUL // sex första färgerna räcker till sex distinkta kort
    const gridW = COLS * CARD_W + (COLS - 1) * GAP_X
    const gridH = ROWS * CARD_H + (ROWS - 1) * GAP_Y
    const startX = (ctx.width - gridW) / 2 + CARD_W / 2
    const startY = (ctx.height - gridH) / 2 + CARD_H / 2

    DJUR.forEach((djur, i) => {
      const col = i % COLS
      const row = (i / COLS) | 0
      const card = this._makeCard(ctx, djur, palette[i % palette.length])
      card.x = startX + col * (CARD_W + GAP_X)
      card.y = startY + row * (CARD_H + GAP_Y)
      card._homeY = card.y
      this._root.addChild(card)
      this._cards.push(card)
      card.scale.set(0)
      gsap.to(card.scale, { x: 1, y: 1, duration: 0.36, delay: 0.06 + i * 0.06, ease: 'back.out(1.7)' })
    })
  },

  // Djurkort: färgglad rundad ruta + stor djur-emoji + liten instrument-rekvisita.
  // body/face/instrument ligger i en inre behållare (card._inner) vars skala pulsar
  // i takt med bakgrundstakten — helt skilt från kortets hopp-tween (card.scale/y).
  _makeCard(ctx, djur, color) {
    const card = new Container()
    card._djur = djur
    const inner = new Container()
    card._inner = inner
    const body = new Graphics()
      .roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 34)
      .fill(color)
      .stroke({ width: 7, color: COLORS.white, alpha: 0.85 })
    const face = new Text({ text: djur.emoji, style: { fontFamily: FONT.body, fontSize: 150 } })
    face.anchor.set(0.5)
    // Instrument-rekvisita i nedre högra hörnet — nu ÄR det en orkester.
    const instr = new Text({ text: djur.instr, style: { fontFamily: FONT.body, fontSize: 64 } })
    instr.anchor.set(0.5)
    instr.position.set(CARD_W / 2 - 48, CARD_H / 2 - 46)
    instr.rotation = -0.12
    inner.addChild(body, face, instr)
    card.addChild(inner)
    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.hitArea = new Rectangle(-CARD_W / 2 - 24, -CARD_H / 2 - 24, CARD_W + 48, CARD_H + 48)
    card.on('pointertap', () => this._sing(ctx, card))
    return card
  },

  // Tryck på ett djur: omedelbar (<100ms) återkoppling — squash-stretch-studs +
  // litet hopp, en svävande not (storlek/höjd följer tonhöjden), mjukt ljud, en
  // pitchad ton (varierad) och djurets riktiga läte. Spårar även kör-sekvensen.
  _sing(ctx, card) {
    if (!this._alive) return
    this._idle = 0
    const audio = ctx.services.audio
    const djur = card._djur
    audio.sfx('pop')

    this._hop(card)

    // Nottecken stiger upp från kortets topp. Låg ton = stort tecken som stiger lågt,
    // hög ton = litet tecken som stiger högt (visuell tonhöjd = enkel musikteori).
    const noteSize = 46 + (523.25 - djur.note) * 0.1
    const noteRise = 90 + (djur.note - 261.63) * 0.13
    floatText(this._root, card.x, card.y - CARD_H / 2, '🎵', { fontSize: noteSize, rise: noteRise, duration: 1.0 })

    // Riktigt förinspelat djurläte om klippet finns — annars sjunger rösten lätet.
    if (!audio.sample(`djur_${djur.id}`)) ctx.services.voice.say(djur.fras)

    // Pitchad musikton ovanpå med liten slumpvariation (±3%) så samma djur aldrig
    // låter exakt mekaniskt likadant — instrumentet känns levande.
    audio.tone({ freq: djur.note * (0.97 + Math.random() * 0.06), dur: 0.4, type: 'triangle', vol: 0.12 })

    this._trackSequence(ctx, card)

    this._taps++
    if (this._taps % TAPS_PER_CELEBRATION === 0) ctx.progress.complete()
  },

  // Spåra "kören": tre OLIKA djur i följd → de gungar ihop + en ackord-harmoni.
  _trackSequence(ctx, card) {
    const seq = this._seq
    // Samma djur igen bryter "olika i följd"-strecket → börja om från detta kort.
    if (seq.length && seq[seq.length - 1]._djur.id === card._djur.id) seq.length = 0
    seq.push(card)
    if (seq.length >= 3) {
      const last3 = seq.slice(-3)
      const distinct = new Set(last3.map((c) => c._djur.id)).size === 3
      if (distinct) {
        this._chorus(ctx, last3)
        this._seq = [] // nollställ — bygg upp en ny kör
      } else {
        this._seq = last3.slice(1) // glid fönstret framåt (t.ex. A,B,A → B,A)
      }
    }
  },

  // Kören: de tre korten gungar synkront tillsammans, deras toner staplas i en liten
  // ackord-harmoni (pentatonisk = alltid glad), extra gnistor + not, och beröm.
  _chorus(ctx, cards) {
    if (!this._alive) return
    const audio = ctx.services.audio

    this._sway(cards)

    cards.forEach((c, i) => {
      // grundton + en mjuk oktav-glans, lätt arpeggierade in i ett ackord
      audio.tone({ freq: c._djur.note, dur: 0.7, type: 'triangle', vol: 0.14, delay: i * 0.07 })
      audio.tone({ freq: c._djur.note * 2, dur: 0.6, type: 'sine', vol: 0.05, delay: i * 0.07 })
      if (c.destroyed) return
      sparkle(this._root, c.x, c.y - CARD_H / 2, { count: 8 })
      floatText(this._root, c.x, c.y - CARD_H / 2, '🎶', { fontSize: 72, rise: 130, duration: 1.2 })
    })
    audio.sfx('reveal')
    ctx.services.voice.say(randomFrom(KOR_BEROM))
  },

  // Synkron gung-rörelse på de tre kortens inre behållare (rotation är fri — hoppet
  // använder card.scale/card.y). Exit-säkert: proxy-tween, skriver bara om kortet lever.
  _sway(cards) {
    this._swayTween?.kill()
    const st = { p: 0 }
    this._swayTween = gsap.to(st, {
      p: 1,
      duration: 1.1,
      ease: 'sine.inOut',
      onUpdate: () => {
        const ang = Math.sin(st.p * Math.PI * 3) * 0.14 // ~1,5 vaggningar fram och tillbaka
        for (const c of cards) if (c && !c.destroyed && c._inner) c._inner.rotation = ang
      },
      onComplete: () => {
        for (const c of cards) if (c && !c.destroyed && c._inner) c._inner.rotation = 0
      },
    })
  },

  // Squash-and-stretch + ett litet hopp uppåt och tillbaka. Springigt och glatt.
  _hop(card) {
    gsap.killTweensOf(card.scale)
    gsap.killTweensOf(card)
    const home = card._homeY
    card.y = home
    gsap
      .timeline()
      .to(card.scale, { x: 1.16, y: 0.84, duration: 0.09, ease: 'power2.out' })
      .to(card.scale, { x: 0.9, y: 1.18, duration: 0.12, ease: 'power2.out' })
      .to(card.scale, { x: 1, y: 1, duration: 0.34, ease: 'back.out(2.6)' })
    gsap
      .timeline()
      .to(card, { y: home - 46, duration: 0.18, ease: 'power2.out' })
      .to(card, { y: home, duration: 0.4, ease: 'bounce.out' })
  },

  // Per frame: driv bakgrundstakten (slag-ljud + synkron puls på alla kort) och idle.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._idle += dt
    this._beatTime += dt

    // Slå ett nytt slag när vi passerar en takt-gräns (lugn bas-groove).
    const beatNum = Math.floor(this._beatTime / BEAT)
    if (beatNum !== this._beatIndex) {
      this._beatIndex = beatNum
      const strong = beatNum % 2 === 0
      ctx.services.audio.tone({ freq: strong ? 130.81 : 196.0, dur: 0.18, type: 'sine', vol: 0.05 })
    }

    // Korten "andas" i takt: en liten accent i början av varje slag som klingar av.
    const phase = (this._beatTime % BEAT) / BEAT
    const accent = Math.max(0, 1 - phase * 3.5)
    const s = 1 + accent * 0.05
    for (const card of this._cards) {
      if (card && !card.destroyed && card._inner) card._inner.scale.set(s)
    }

    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const card = randomFrom(this._cards)
      if (card && !card.destroyed) pop(card)
    }
  },

  // Döda alla tweens på korten (och deras scale/inre behållare) innan de förstörs.
  _killCardTweens() {
    this._cards?.forEach((c) => {
      if (!c || c.destroyed) return
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
      if (c._inner) gsap.killTweensOf(c._inner)
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._swayTween?.kill()
    this._killCardTweens()
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}
