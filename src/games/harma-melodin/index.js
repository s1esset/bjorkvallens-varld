// Härma Melodin — mjukt, förlåtande Simon-/minnesspel (3–5 år). Fyra stora
// färgglada plattor lyser och spelar varsin glad ton i en sekvens som barnet
// sedan härmar genom att trycka i samma ordning. Sekvensen växer långsamt och
// kan alltid visas igen ("Visa igen") — man kan ALDRIG "förlora": fel tryck ger
// mjuk respons och sekvensen visas bara om. Oändlig lek. Allt ritas programmatiskt.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { sparkle, pop, wiggle, bigCelebration, kvittera } from '../../lib/feedback.js'
import { COLORS } from '../../lib/theme.js'
import { Button } from '../../lib/Button.js'

// Fyra plattor (2x2-rutnät, mitt 640,320). Varje platta har egen färg, plats, ikon.
const PAD_DEFS = [
  { color: COLORS.green, x: 480, y: 160, icon: '🐸' }, // 0 grön
  { color: COLORS.red, x: 800, y: 160, icon: '🍎' }, // 1 röd
  { color: COLORS.blue, x: 480, y: 480, icon: '💧' }, // 2 blå
  { color: COLORS.yellow, x: 800, y: 480, icon: '⭐' }, // 3 gul
]
// RIKTIG musikalisk tonhöjd: varje platta spelar en ton ur en glad C-durs pentaton
// (C–D–E–G), STIGANDE med plattans index -> en sekvens LÅTER som en liten melodi och
// barnet som härmar hör exakt samma toner. freq = BAS * 2^(halvtoner/12).
const BASE_FREQ = 523.25 // C5 — ljus och barnvänlig
const PENTATONIC = [0, 2, 4, 7] // C, D, E, G (halvtonssteg) -> stigande grön→röd→blå→gul
const PAD_FREQ = PENTATONIC.map((semi) => BASE_FREQ * Math.pow(2, semi / 12))

const START_LEN = 2 // startsekvensens längd
const MAX_LEN = 6 // längden slutar växa här (men nya slumpsekvenser fortsätter)
const LIT_MS = 450 // hur länge en platta "lyser" vid uppspelning
const GAP_MS = 280 // paus mellan plattorna vid uppspelning (lugnt tempo)

export default {
  id: 'harma-melodin',
  titleSv: 'Härma Melodin',
  icon: '🎵',
  category: 'minne',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'harma-melodin',
  voiceIntro: 'Titta och lyssna! Härma sedan melodin.',

  init(ctx) {
    this._alive = true
    this._calls = [] // spårade fördröjda anrop (dödas i destroy)
    this._state = 'showing' // 'showing' (uppspelning/upplösning) | 'listening' (barnets tur)
    this._step = 0 // hur långt i sekvensen barnet kommit
    this._idle = 0 // sekunder sedan senaste tryck (idle-recue)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Återuppta ungefär där barnet var.
    const hl = ctx.progress.get().highestLevel || START_LEN
    this._len = Math.max(START_LEN, Math.min(MAX_LEN, hl))
    this._newSequence()

    this._build(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // Spela första sekvensen efter intron (utan att ropa "Lyssna!" så intron hörs klart).
    this._schedule(0.8, () => this._playSequence(ctx, { announce: false }))
  },

  // Bygg den persistenta scenen en gång: bakgrund, 4 plattor, maskot, "Visa igen".
  _build(ctx) {
    // Bakgrund — fångar tomt tryck -> lekfullt, aldrig "fel".
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(bg)

    // Fyra plattor.
    this._pads = PAD_DEFS.map((def, i) => {
      const pad = this._makePad(ctx, def, i)
      this._root.addChild(pad)
      return pad
    })

    // Maskot i mitten (ligger ovanpå men är ej tryckbar -> tryck når plattorna under).
    this._buildMascot()
    this._root.addChild(this._mascot)
    this._setMood('listen')

    // "Visa igen"-knapp: spelar upp sekvensen på nytt utan straff.
    this._btn = new Button({
      label: 'Visa igen',
      icon: '👀',
      width: 300,
      height: 76,
      color: COLORS.purple,
      services: ctx.services,
      sound: 'tap',
      onTap: () => {
        if (this._alive && this._state === 'listening') this._playSequence(ctx, { announce: true })
      },
    })
    this._btn.position.set(640, 672)
    this._btn.setEnabled(false) // av tills första uppspelningen är klar
    this._root.addChild(this._btn)
  },

  // En platta: rundad färgruta + vit glödplatta (för "tändning") + centrerad ikon.
  _makePad(ctx, def, index) {
    const pad = new Container()
    pad.position.set(def.x, def.y)

    const body = new Graphics()
      .roundRect(-140, -140, 280, 280, 40)
      .fill({ color: def.color, alpha: 0.85 })
      .stroke({ width: 8, color: 0xffffff, alpha: 0.7 })
    body.eventMode = 'none'

    // Glöd: vit overlay som tonas in/ut vid tändning (exit-säker: persistent objekt).
    const glow = new Graphics().roundRect(-140, -140, 280, 280, 40).fill({ color: 0xffffff, alpha: 1 })
    glow.alpha = 0
    glow.eventMode = 'none'

    // P0 ASSETS: RITAD platt-ikon (var en 96px emoji-Text).
    // P0 ASSETS + sjunde läckan (POLERINGSRUNDA): en ritad ikon i samma färgfamilj
    // som plattan tappar sin silhuett — grodan försvann mot den gröna plattan och
    // stjärnan mot den gula. En mörk kopia strax bakom ger separation mot VILKEN
    // platta som helst, utan att lägga ikonen i en bricka.
    const iconShade = drawIcon(def.icon, 132)
    iconShade.tint = 0x000000
    iconShade.alpha = 0.22
    iconShade.position.set(4, 5)
    iconShade.eventMode = 'none'
    const icon = drawIcon(def.icon, 132)
    icon.eventMode = 'none'

    pad.addChild(body, glow, iconShade, icon)
    pad._glow = glow
    pad.eventMode = 'static'
    pad.cursor = 'pointer'
    pad.hitArea = new Rectangle(-140, -140, 280, 280) // hela plattan (≫ 96px)
    pad.on('pointertap', () => this._onPadTap(ctx, index))
    return pad
  },

  // Liten glad maskot (Pixi Graphics): kropp + ögon (kan "blunda") + mun (humör).
  _buildMascot() {
    const m = new Container()
    m.position.set(640, 320)
    m.eventMode = 'none'
    m.interactiveChildren = false

    const body = new Graphics().circle(0, 0, 70).fill(COLORS.cream).stroke({ width: 6, color: COLORS.orange })

    const eyes = new Container()
    eyes.addChild(new Graphics().circle(-24, -10, 9).fill(COLORS.ink))
    eyes.addChild(new Graphics().circle(24, -10, 9).fill(COLORS.ink))

    const mouth = new Graphics()

    m.addChild(body, eyes, mouth)
    this._mascot = m
    this._eyes = eyes
    this._mouth = mouth
  },

  // Tänd en platta: studs + glöd + plattans RIKTIGA ton. Glöd/studs skalar en aning med
  // tonhöjden (ljusare ton = lite piggare) så ögat följer melodin. Bobo nickar i takt.
  // Killbara tweens (persistent).
  _lightPad(ctx, index) {
    const pad = this._pads?.[index]
    if (!pad || pad.destroyed) return
    // Äkta pitchad ton (mjuk sinus) -> sekvensen upplevs som en melodi.
    ctx.services.audio.tone({ freq: PAD_FREQ[index], dur: 0.42, type: 'sine', vol: 0.32 })
    const lift = 1.1 + index * 0.02 // högre ton studsar en gnutta mer
    gsap.killTweensOf(pad.scale)
    gsap.to(pad.scale, { x: lift, y: lift, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
    const glow = pad._glow
    if (glow && !glow.destroyed) {
      gsap.killTweensOf(glow)
      glow.alpha = 0
      gsap.to(glow, { alpha: 0.45 + index * 0.04, duration: 0.12, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }
    this._nod()
  },

  // Bobo nickar i takt med melodin (liten guppning nedåt). Exit-säkert: persistent maskot,
  // tweens dödas i destroy.
  _nod() {
    const m = this._mascot
    if (!m || m.destroyed) return
    gsap.killTweensOf(m, 'y')
    m.y = 320
    gsap.to(m, { y: 332, duration: 0.11, yoyo: true, repeat: 1, ease: 'sine.inOut' })
  },

  // VISA: spela upp hela sekvensen, sedan växla till barnets tur ("din tur").
  _playSequence(ctx, { announce = true } = {}) {
    if (!this._alive) return
    this._seqTl?.kill()
    this._state = 'showing'
    this._step = 0
    this._idle = 0
    this._btn?.setEnabled(false)
    this._setMood('listen')
    if (announce) ctx.services.voice.say('Lyssna!')

    const step = (LIT_MS + GAP_MS) / 1000
    const tl = gsap.timeline({ onComplete: () => this._onShowDone(ctx) })
    this._seqTl = tl
    this._sequence.forEach((padIndex, i) => {
      tl.call(() => { if (this._alive) this._lightPad(ctx, padIndex) }, null, i * step)
    })
    // Hålltid efter sista tändningen innan "Din tur".
    tl.to({}, { duration: LIT_MS / 1000 })
  },

  // Uppspelning klar -> barnets tur.
  _onShowDone(ctx) {
    if (!this._alive) return
    this._state = 'listening'
    this._step = 0
    this._idle = 0
    this._btn?.setEnabled(true)
    this._setMood('happy')
    ctx.services.voice.say('Din tur!')
  },

  // HÄRMA: tryck på en platta.
  _onPadTap(ctx, index) {
    if (!this._alive) return
    // Skydd mot tryck under uppspelning/upplösning (undviker dubbeltryck-fel) — men
    // spärren fick INTE svara med tystnad (P0). Plattans egen ton vore fel här: den
    // skulle blanda sig i melodin som just demonstreras och lära ut fel sekvens.
    // Kvittot är därför en dämpad ton utanför skalan + en ring på plattan.
    if (this._state !== 'listening') {
      const p = this._pads[index]
      return kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio, { color: PAD_DEFS[index]?.color })
    }
    this._idle = 0

    if (index === this._sequence[this._step]) {
      // Rätt delsteg: tänd plattan + gnistra, flytta fram pekaren.
      this._lightPad(ctx, index)
      const pad = this._pads[index]
      sparkle(ctx.fxLayer, pad.x, pad.y)
      this._step++
      if (this._step >= this._sequence.length) this._onRoundComplete(ctx)
    } else {
      this._onWrong(ctx, index)
    }
  },

  // Hela sekvensen rätt: firande + ny, längre sekvens (oändlig lek).
  _onRoundComplete(ctx) {
    if (!this._alive) return
    this._state = 'showing'
    this._btn?.setEnabled(false)
    this._setMood('happy')
    pop(this._mascot)
    // Slut-ackord: alla fyra toner samtidigt -> ett litet glatt "klart!"-ackord.
    PAD_FREQ.forEach((freq) => ctx.services.audio.tone({ freq, dur: 0.7, type: 'sine', vol: 0.24 }))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    ctx.progress.complete() // delat firande (celebrate + beröm) + stjärna + klistermärke

    // Väx sekvensen med ett steg (upp till MAX_LEN) och spara framsteg.
    this._len = Math.min(MAX_LEN, this._len + 1)
    ctx.progress.setLevel(this._len)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    this._newSequence()

    this._schedule(1.8, () => this._playSequence(ctx, { announce: true }))
  },

  // Fel tryck — ALDRIG straff: mjukt ljud, vänlig vingel på fel + rätt platta,
  // nyfiken maskot, och sekvensen visas bara om från början.
  _onWrong(ctx, index) {
    this._state = 'showing'
    this._btn?.setEnabled(false)
    ctx.services.audio.sfx('soft')
    const wrongPad = this._pads[index]
    const rightPad = this._pads[this._sequence[this._step]]
    if (wrongPad) wiggle(wrongPad)
    if (rightPad && rightPad !== wrongPad) wiggle(rightPad)
    this._setMood('curious')
    ctx.services.voice.say('Nästan! Titta igen.')
    // Visa sekvensen om (utan "Lyssna!" så felfrasen hinner höras).
    this._schedule(1.0, () => this._playSequence(ctx, { announce: false }))
  },

  // Tomt tryck (bakgrund/maskot): mjuk neutral studs på maskoten. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('tap')
    pop(this._mascot)
  },

  // Idle ~6s i lyssnar-läge: upprepa uppmaningen + tänd förväntad platta som hint.
  _update(ctx, ticker) {
    if (!this._alive || this._state !== 'listening') return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say('Din tur — tryck på plattorna!')
      const next = this._sequence[this._step]
      if (next != null) this._lightPad(ctx, next)
    }
  },

  // Maskotens humör (ögon + mun). Instant -> exit-säkert (ingen kvardröjande tween).
  _setMood(mood) {
    const eyes = this._eyes
    if (!eyes || eyes.destroyed || !this._mascot || this._mascot.destroyed) return
    if (mood === 'listen') {
      eyes.scale.y = 0.18 // blundar/lyssnar
      this._drawMouth('neutral')
      this._mascot.rotation = 0
    } else if (mood === 'happy') {
      eyes.scale.y = 1
      this._drawMouth('smile')
      this._mascot.rotation = 0
    } else {
      // curious
      eyes.scale.y = 1
      this._drawMouth('o')
      wiggle(this._mascot)
    }
  },

  _drawMouth(type) {
    const m = this._mouth
    if (!m || m.destroyed) return
    m.clear()
    if (type === 'smile') {
      const r = 22
      const a0 = 0.18 * Math.PI
      const a1 = 0.82 * Math.PI
      // moveTo före arc (Pixi v8: kurvor behöver startpunkt).
      m.moveTo(Math.cos(a0) * r, 6 + Math.sin(a0) * r).arc(0, 6, r, a0, a1).stroke({ width: 5, color: COLORS.ink })
    } else if (type === 'o') {
      m.circle(0, 14, 9).fill(COLORS.ink)
    } else {
      m.moveTo(-14, 14).lineTo(14, 14).stroke({ width: 5, color: COLORS.ink })
    }
  },

  // Bygg sekvensen utan att samma platta upprepas direkt (undvik 2,2,2,2 -> känns
  // avsiktlig, inte som en bugg, och blir en riktig liten melodi att härma).
  _newSequence() {
    const seq = []
    for (let i = 0; i < this._len; i++) {
      let n = Math.floor(Math.random() * 4)
      if (i > 0 && n === seq[i - 1]) n = (n + 1 + Math.floor(Math.random() * 3)) % 4
      seq.push(n)
    }
    this._sequence = seq
  },

  // Schemalägg en guardad fördröjd callback (samlas så destroy kan döda dem).
  _schedule(delay, fn) {
    const c = gsap.delayedCall(delay, () => {
      if (this._alive) fn()
    })
    this._calls.push(c)
    return c
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._seqTl?.kill()
    this._calls?.forEach((c) => c.kill())
    this._pads?.forEach((p) => {
      gsap.killTweensOf(p)
      gsap.killTweensOf(p.scale)
      if (p._glow) gsap.killTweensOf(p._glow)
    })
    if (this._mascot) {
      gsap.killTweensOf(this._mascot)
      gsap.killTweensOf(this._mascot.scale)
    }
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel?.()
    this._root?.destroy({ children: true })
  },
}
