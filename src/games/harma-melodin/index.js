// Härma Melodin — mjukt, förlåtande Simon-/minnesspel (3–5 år). Fyra sjungande varelser
// står på en liten konsertscen och sjunger varsin glad ton i en sekvens som barnet sedan
// härmar genom att trycka på dem i samma ordning. Dirigent-Bobo slår takten. Sekvensen
// växer långsamt och kan alltid visas igen ("Visa igen") — man kan ALDRIG "förlora": fel
// tryck ger mjuk respons och sekvensen visas bara om. Varelsernas utseende byts efter
// varannan klarad melodi (groda/äpple/droppe/stjärna <-> päron/jordgubbe/blåbär/citron);
// färger, platser och toner är desamma. Allt ritas programmatiskt.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { sparkle, pop, wiggle, kvittera, squash, liv, ripple, puff } from '../../lib/feedback.js'
import { COLORS } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { Button } from '../../lib/Button.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { TEMAN, skapaVarelse, FOT } from './varelser.js'
import { byggScen, byggDirigent, PINNE_VILA } from './scen.js'

// Fyra platser på stagen. Färg och plats är spelets identitet (tonen följer platsen);
// vilken varelse som står där byts med temat. Mitt-x: 280 / 500 / 780 / 1000 med 190 px
// breda träffytor -> 30 px mellan två grannar (kravet är 24). Dirigenten står på pallen
// mitt emellan plats 1 och 2 (x 640). Harnessens nio autotryck träffar alla fyra:
// (300,450) plats 0, (480,600) plats 1, (800,600) plats 2, (950,450) plats 3.
const PAD_DEFS = [
  { color: COLORS.green, x: 280, y: 470 }, // 0 grön
  { color: COLORS.red, x: 500, y: 470 }, // 1 röd
  { color: COLORS.blue, x: 780, y: 470 }, // 2 blå
  { color: COLORS.yellow, x: 1000, y: 470 }, // 3 gul
]
// RIKTIG musikalisk tonhöjd: varje varelse sjunger en ton ur en glad C-durs pentaton
// (C–D–E–G), STIGANDE med platsens index -> en sekvens LÅTER som en liten melodi och
// barnet som härmar hör exakt samma toner. freq = BAS * 2^(halvtoner/12).
const BASE_FREQ = 523.25 // C5 — ljus och barnvänlig
const PENTATONIC = [0, 2, 4, 7] // C, D, E, G (halvtonssteg) -> stigande grön→röd→blå→gul
const PAD_FREQ = PENTATONIC.map((semi) => BASE_FREQ * Math.pow(2, semi / 12))

const START_LEN = 2 // startsekvensens längd
const MAX_LEN = 6 // längden slutar växa här (men nya slumpsekvenser fortsätter)
const LIT_MS = 450 // hur länge en varelse sjunger vid uppspelning
const GAP_MS = 280 // paus mellan varelserna vid uppspelning (lugnt tempo)
const TEMA_VARJE = 2 // antal klarade melodier per tema

// MELODIBOKEN: en rad ritade noter nere till höger som fylls, en per klarad melodi
// (`custom.rundor`). Nedre mitten är "Visa igen" (x 490–790), stagens framkant slutar på
// y 624 — raden ligger på y 672, x 870–1220: 80 px från knappen, 48 px under stagen,
// långt från skalets knappar i topphörnen. Max BOK_MAX noter; fylld är fylld för gott.
const BOK_MAX = 8
const BOK_X0 = 870
const BOK_DX = 50
const BOK_Y = 672

// Döda ALLT som kan tweena på en nod och dess barn. killTweensOf(roten) når bara roten —
// innernoderna (ögon, mun, glöd, skala) ligger en och två nivåer längre in, och feedback.js
// hänger dessutom egna tidslinjer på målet (_fx*) som killTweensOf inte rör.
function killTree(n) {
  if (!n) return
  n._fxPopTl?.kill()
  n._fxSquashTl?.kill()
  n._fxWiggleTl?.kill()
  n._fxHopTl?.kill()
  n._fxLiv?.kill()
  n._mundCall?.kill()
  n._vaxCall?.kill()
  gsap.killTweensOf(n)
  if (n.scale) gsap.killTweensOf(n.scale)
  n.children?.forEach(killTree)
}

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

    // Återuppta ungefär där barnet var — och med det tema den sparade melodiboken är inne i.
    const sparat = ctx.progress.get()
    const hl = sparat.highestLevel || START_LEN
    this._len = Math.max(START_LEN, Math.min(MAX_LEN, hl))
    this._tema = this._temaFor(sparat.custom?.rundor || 0)
    this._newSequence()

    this._build(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // Spela första sekvensen efter intron (utan att ropa "Lyssna!" så intron hörs klart).
    this._schedule(ctx, 0.8, () => this._playSequence(ctx, { announce: false }))
  },

  // Temat följer antalet klarade melodier: två med varelserna, två med frukten, osv.
  _temaFor(rundor) {
    return Math.floor(rundor / TEMA_VARJE) % TEMAN.length
  },

  // Bygg den persistenta scenen en gång: konsertscen, dirigent, fyra varelser, "Visa igen".
  _build(ctx) {
    // Scen: äng, stage, vimplar och pall (lib/scene.js bär bleedet åt alla håll).
    this._scen = byggScen()
    this._root.addChild(this._scen)

    // Tryckfångare över hela synliga ytan: ett tomt tryck blir en lekfull puff på Bobo,
    // aldrig ett "fel". Nästan osynlig (alfa 0.001) men träffbar.
    const fangare = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, ctx.height + 2 * BLEED_Y)
      .fill({ color: 0xffffff, alpha: 0.001 })
    fangare.eventMode = 'static'
    fangare.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(fangare)

    // Dirigent-Bobo på pallen (riggen + kropp, armar och taktpinne). Inte tryckbar.
    this._kar = makeKaraktar({ r: 58, kropp: false })
    const d = byggDirigent(this._kar)
    this._dirigent = d.grupp
    this._pinne = d.pinne
    this._mascot = this._kar.view
    this._root.addChild(this._dirigent)
    this._setMood('listen')

    // Varelserna.
    this._padLager = new Container()
    this._root.addChild(this._padLager)
    this._pads = []
    this._byggVarelser(ctx, this._tema, { animera: false })

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

    // Melodiboken (se BOK_*): tomma noter är svaga konturer, klarade har platsernas färger.
    this._bok = new Container()
    this._bok.eventMode = 'none'
    this._bok.interactiveChildren = false
    this._root.addChild(this._bok)
    const klara = Math.min(BOK_MAX, ctx.progress.get().custom?.rundor || 0)
    this._bokNoter = []
    for (let i = 0; i < BOK_MAX; i++) {
      const g = new Graphics()
      g.position.set(BOK_X0 + i * BOK_DX, BOK_Y)
      drawNot(g, i < klara, PAD_DEFS[i % PAD_DEFS.length].color)
      this._bok.addChild(g)
      this._bokNoter.push(g)
    }
  },

  // En ny not i boken: fylls i sin färg, studsar och gnistrar. Över BOK_MAX är boken full
  // — den växer inte vidare, men ingenting töms heller.
  _fyllBok(ctx, rundor) {
    const i = rundor - 1
    const g = this._bokNoter?.[i]
    if (i < 0 || !g || g.destroyed) return
    drawNot(g, true, PAD_DEFS[i % PAD_DEFS.length].color)
    pop(g, { scale: 1.45 })
    sparkle(ctx.fxLayer, g.x, g.y - 8, { count: 6 })
  },

  // Bygg (eller bygg om) de fyra varelserna i temat `tema`. De gamla rivs helt — alla
  // deras tweens och tidslinjer först, sedan noderna. Vid ett temabyte (animera: true)
  // poffar de gamla bort och de nya växer upp ur stagen i tur och ordning.
  _byggVarelser(ctx, tema, { animera = false } = {}) {
    for (const p of this._pads || []) {
      if (animera && !p.destroyed) puff(ctx.fxLayer, p.x, p.y + 20, { count: 8, color: PAD_DEFS[this._pads.indexOf(p)]?.color })
      this._rivPad(p)
    }
    this._pads = PAD_DEFS.map((def, i) => {
      const pad = this._makePad(ctx, def, i, tema)
      this._padLager.addChild(pad)
      return pad
    })
    if (!animera) return
    this._pads.forEach((pad, i) => {
      const inner = pad._inner
      inner._fxRestScale = { x: 1, y: 1 }
      inner._fxScaleBusy = true
      inner.scale.set(0)
      inner._vaxCall = gsap.delayedCall(i * 0.09, () => {
        if (!this._alive || inner.destroyed) return
        gsap.to(inner.scale, {
          x: 1, y: 1, duration: 0.45, ease: 'back.out(1.7)',
          onComplete: () => { inner._fxScaleBusy = false },
        })
      })
    })
  },

  _rivPad(pad) {
    if (!pad || pad.destroyed) return
    killTree(pad)
    pad.destroy({ children: true })
  },

  // En varelse: glödande gloria bakom, skugga på stagen, och själva varelsen i en `fig`
  // som guppar i vila (liv). Träffytan sitter på `pad` som står still — allt som rör sig
  // bor i barn (fig/inner), så hitArea aldrig flyttar sig under fingret.
  _makePad(ctx, def, index, tema) {
    const pad = new Container()
    pad.position.set(def.x, def.y)

    const halo = new Graphics().circle(0, -4, 112).fill({ color: def.color, alpha: 0.3 })
    halo.alpha = 0
    halo.eventMode = 'none'

    const skugga = new Graphics().ellipse(0, FOT + 5, 70, 13).fill({ color: COLORS.shadow, alpha: 0.2 })
    skugga.eventMode = 'none'

    const fig = new Container()
    fig.eventMode = 'none'
    const inner = skapaVarelse(tema, index, def.color)
    fig.addChild(inner)

    pad.addChild(halo, skugga, fig)
    pad._halo = halo
    pad._fig = fig
    pad._inner = inner
    pad._glow = inner._glow
    pad._bT = 1 + Math.random() * 3 // sekunder till nästa blinkning
    pad._bD = 0 // kvarvarande blinktid
    pad.eventMode = 'static'
    pad.cursor = 'pointer'
    pad.hitArea = new Rectangle(-95, -110, 190, 245) // ≫ 96 px, 30 px till grannen
    pad.on('pointertap', () => this._onPadTap(ctx, index))

    // Vilo-liv med egen fas per varelse (de sitter inte i takt).
    liv(fig, { bob: 5, sway: 0.025, duration: 2 + index * 0.35, phase: index * 0.27 })
    return pad
  },

  // Varelsen sjunger: stämd ton + öppen mun + studs + glöd + ljudringar och en flygande not.
  // Glöd/studs skalar en aning med tonhöjden (ljusare ton = lite piggare) så ögat följer
  // melodin. Bobo nickar och slår takten. Killbara tweens (persistenta objekt).
  _lightPad(ctx, index) {
    const pad = this._pads?.[index]
    if (!pad || pad.destroyed) return
    // Äkta pitchad ton (mjuk sinus) -> sekvensen upplevs som en melodi.
    ctx.services.audio.tone({ freq: PAD_FREQ[index], dur: 0.42, type: 'sine', vol: 0.32 })
    squash(pad._inner, { intensity: 0.95 + index * 0.08, hop: 10 + index * 4 })
    const glow = pad._glow
    if (glow && !glow.destroyed) {
      gsap.killTweensOf(glow)
      glow.alpha = 0
      gsap.to(glow, { alpha: 0.42 + index * 0.04, duration: 0.12, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }
    const halo = pad._halo
    if (halo && !halo.destroyed) {
      gsap.killTweensOf(halo)
      halo.alpha = 0
      gsap.to(halo, { alpha: 1, duration: 0.14, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }
    this._oppnaMun(pad, LIT_MS / 1000)
    const color = PAD_DEFS[index].color
    ripple(ctx.fxLayer, pad.x, pad.y - 10, { color, maxR: 120, width: 6, alpha: 0.5, duration: 0.6 })
    notFx(ctx.fxLayer, pad.x + 26, pad.y - 70, color)
    this._nod()
    this._slag(index)
  },

  // Munnen öppen `sek` sekunder, sedan tillbaka. Ett nytt anrop nollställer klockan.
  _oppnaMun(pad, sek) {
    if (!pad || pad.destroyed || !pad._inner) return
    pad._inner._mund(true)
    pad._mundCall?.kill()
    pad._mundCall = gsap.delayedCall(sek, () => {
      if (!pad.destroyed && pad._inner && !pad._inner.destroyed) pad._inner._mund(false)
    })
  },

  // Bobo nickar i takt med melodin (liten guppning nedåt). Exit-säkert: persistent grupp,
  // tweens dödas i destroy.
  _nod() {
    const m = this._dirigent
    if (!m || m.destroyed) return
    gsap.killTweensOf(m, 'y')
    m.y = 0
    gsap.to(m, { y: 10, duration: 0.11, yoyo: true, repeat: 1, ease: 'sine.inOut' })
  },

  // Taktpinnen slår åt vänster/höger växelvis.
  _slag(index) {
    const p = this._pinne
    if (!p || p.destroyed) return
    gsap.killTweensOf(p, 'rotation')
    p.rotation = PINNE_VILA
    gsap.to(p, { rotation: PINNE_VILA + (index % 2 ? 0.55 : -0.55), duration: 0.12, yoyo: true, repeat: 1, ease: 'sine.inOut' })
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
    // V24: första melodin är slut 2 s in och introt är 4,1 s — "Din tur!" kapade "Härma sedan
    // melodin." varje start. Varelserna är tryckbara genast; bara orden väntar, och bara så
    // länge barnet inte redan börjat härma just den här uppspelningen.
    const tl = this._seqTl
    ctx.narTyst(() => {
      if (!this._alive || this._seqTl !== tl || this._state !== 'listening' || this._step !== 0) return
      ctx.services.voice.say('Din tur!')
    })
  },

  // HÄRMA: tryck på en varelse.
  _onPadTap(ctx, index) {
    if (!this._alive) return
    // Skydd mot tryck under uppspelning/upplösning (undviker dubbeltryck-fel) — men
    // spärren fick INTE svara med tystnad (P0). Varelsens egen ton vore fel här: den
    // skulle blanda sig i melodin som just demonstreras och lära ut fel sekvens.
    // Kvittot är därför en dämpad ton utanför skalan + en ring, och varelsen vinglar till.
    if (this._state !== 'listening') {
      const p = this._pads[index]
      if (p && !p.destroyed) wiggle(p._inner)
      return kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio, { color: PAD_DEFS[index]?.color })
    }
    this._idle = 0

    if (index === this._sequence[this._step]) {
      // Rätt delsteg: varelsen sjunger + gnistra, flytta fram pekaren.
      this._lightPad(ctx, index)
      const pad = this._pads[index]
      sparkle(ctx.fxLayer, pad.x, pad.y)
      this._step++
      if (this._step >= this._sequence.length) this._onRoundComplete(ctx)
    } else {
      this._onWrong(ctx, index)
    }
  },

  // Hela sekvensen rätt: firande + ny, längre sekvens (oändlig lek). Hela kören jublar med
  // Bobo, och efter varannan melodi byter varelserna skepnad.
  _onRoundComplete(ctx) {
    if (!this._alive) return
    this._state = 'showing'
    this._btn?.setEnabled(false)
    // Hela sekvensen rätt är rundans stora ögonblick — Bobo får JUBLA (stolt min +
    // hopp), inte bara byta mun. Det är hela poängen med en rigg: mottagaren firar
    // med barnet i stället för att titta på.
    this._kar?.react('jubel')
    this._kor(ctx)
    // Slut-ackord: alla fyra toner samtidigt -> ett litet glatt "klart!"-ackord.
    PAD_FREQ.forEach((freq) => ctx.services.audio.tone({ freq, dur: 0.7, type: 'sine', vol: 0.24 }))
    ctx.progress.complete() // delat firande (celebrate + beröm + regn) + stjärna + klistermärke

    // Väx sekvensen med ett steg (upp till MAX_LEN) och spara framsteg.
    this._len = Math.min(MAX_LEN, this._len + 1)
    ctx.progress.setLevel(this._len)
    const rundor = (ctx.progress.get().custom?.rundor || 0) + 1
    ctx.progress.setCustom('rundor', rundor)
    this._fyllBok(ctx, rundor)
    this._newSequence()

    // Ny skepnad: de gamla poffar bort medan berömmet hörs, de nya hinner växa klart
    // (0,9 s + 0,27 + 0,45) före nästa melodi (1,8 s).
    const nyttTema = this._temaFor(rundor)
    if (nyttTema !== this._tema) {
      this._tema = nyttTema
      this._schedule(ctx, 0.9, () => this._byggVarelser(ctx, nyttTema, { animera: true }))
    }

    this._schedule(ctx, 1.8, () => {
      this._playSequence(ctx, { announce: false })
      // "Lyssna!" väntar tills berömmet från complete() tystnat (say() kapar annars det);
      // melodin startar ändå genast. Token: samma uppspelning, och bara medan första
      // varelsen sjunger — senare är melodin redan i gång och "Din tur!" nära.
      const tl = this._seqTl
      ctx.narTyst(() => {
        if (!this._alive || this._seqTl !== tl || this._state !== 'showing') return
        if (tl.time() >= (LIT_MS + GAP_MS) / 1000) return
        ctx.services.voice.say('Lyssna!')
      })
    })
  },

  // Kören jublar: alla fyra hoppar och sjunger med öppen mun, en efter en (ANIM.stagger-takt).
  _kor(ctx) {
    this._pads.forEach((pad, i) => {
      const c = gsap.delayedCall(i * 0.07, () => {
        if (!this._alive || pad.destroyed) return
        squash(pad._inner, { intensity: 1.3, hop: 26 })
        this._oppnaMun(pad, 0.8)
        ripple(ctx.fxLayer, pad.x, pad.y - 10, { color: PAD_DEFS[i].color, maxR: 140, width: 7, alpha: 0.5, duration: 0.7 })
      })
      this._spara(c)
    })
  },

  // Fel tryck — ALDRIG straff: mjukt ljud, vänlig vingel på fel + rätt varelse,
  // nyfiken maskot, och sekvensen visas bara om från början.
  _onWrong(ctx, index) {
    this._state = 'showing'
    this._btn?.setEnabled(false)
    ctx.services.audio.sfx('soft')
    const wrongPad = this._pads[index]
    const rightPad = this._pads[this._sequence[this._step]]
    if (wrongPad) wiggle(wrongPad._inner)
    if (rightPad && rightPad !== wrongPad) wiggle(rightPad._inner)
    this._setMood('curious')
    ctx.services.voice.say('Nästan! Titta igen.')
    // Visa sekvensen om (utan "Lyssna!" så felfrasen hinner höras).
    this._schedule(ctx, 1.0, () => this._playSequence(ctx, { announce: false }))
  },

  // Tomt tryck (bakgrund/maskot): mjuk neutral studs på Bobo + ett slag med taktpinnen.
  // Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('tap')
    if (this._mascot) pop(this._mascot)
    this._slag(0)
  },

  // Blinkningar (alltid) + idle ~6 s i lyssnar-läge: upprepa uppmaningen + låt förväntad
  // varelse sjunga som hint.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    for (const p of this._pads || []) {
      if (p.destroyed || !p._inner) continue
      if (p._bD > 0) {
        p._bD -= dt
        if (p._bD <= 0) p._inner._blink(false)
      } else {
        p._bT -= dt
        if (p._bT <= 0) {
          p._inner._blink(true)
          p._bD = 0.13
          p._bT = 2.5 + Math.random() * 3.5
        }
      }
    }
    if (this._state !== 'listening') return
    this._idle += dt
    // V21: tomgången räknas från TYSTNAD — påminnelsen får aldrig kapa en replik som talar.
    if (ctx.services.voice.talar) this._idle = 0
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say('Din tur!')
      const next = this._sequence[this._step]
      if (next != null) this._lightPad(ctx, next)
    }
  },

  // Spelets tre lägen mappade på riggens humör. `listen` blev `nyfiken` (lutat huvud,
  // vidöppna ögon) och inte `somnig`: Bobo LYSSNAR uppmärksamt under demon, han
  // somnar inte.
  _setMood(mood) {
    if (!this._kar) return
    if (mood === 'listen') this._kar.setMood('nyfiken')
    else if (mood === 'happy') this._kar.setMood('glad')
    else this._kar.react('hoppsan') // förvånad, aldrig sur (P0 MOTGÅNG)
  },

  // Bygg sekvensen utan att samma varelse upprepas direkt (undvik 2,2,2,2 -> känns
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

  // Schemalägg en guardad fördröjd callback. ctx.later dör med spelomgången — en gammal
  // callback kan alltså aldrig köra mitt i nästa omgång av det här (singleton-)spelet.
  _schedule(ctx, delay, fn) {
    return ctx.later(delay, () => {
      if (this._alive) fn()
    })
  },

  // Spåra ett eget fördröjt anrop (kören) så destroy kan döda det. Färdiga rensas bort.
  _spara(c) {
    this._calls = this._calls.filter((x) => x.progress() < 1)
    this._calls.push(c)
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._seqTl?.kill()
    this._calls?.forEach((c) => c.kill())
    this._calls = []
    this._pads?.forEach(killTree)
    killTree(this._dirigent)
    killTree(this._btn)
    this._pads = []
    for (const g of this._bokNoter || []) {
      g._fxPopTl?.kill()
      if (!g.destroyed) gsap.killTweensOf(g.scale)
    }
    this._bokNoter = []
    // Riggen äger sina egna tweens (andning, blink, reaktioner) och river dem själv.
    this._kar?.destroy()
    this._kar = null
    this._mascot = null
    this._dirigent = null
    this._pinne = null
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel?.()
    this._root?.destroy({ children: true })
  },
}

// En flygande not från varelsens mun: stiger, vaggar och tonar bort. Exit-säker på samma
// sätt som feedback.js — tweenar ett vanligt objekt och rör noden bara om den lever.
function notFx(layer, x, y, color) {
  if (!layer || layer.destroyed) return
  const g = new Graphics()
  drawNot(g, true, color)
  g.position.set(x, y)
  g.scale.set(1.1)
  g.eventMode = 'none'
  layer.addChild(g)
  const st = { y, a: 1, p: 0 }
  const tw = gsap.to(st, {
    y: y - 110,
    a: 0,
    p: 1,
    duration: 1.0,
    ease: 'power1.out',
    onUpdate: () => {
      if (g.destroyed) {
        tw.kill()
        return
      }
      g.y = st.y
      g.x = x + Math.sin(st.p * 5) * 12
      g.alpha = st.a
      g.rotation = Math.sin(st.p * 5) * 0.2
    },
    onComplete: () => {
      if (!g.destroyed) g.destroy()
    },
  })
}

// En ritad åttondelsnot (P0 ASSETS): lutande huvud, skaft och flagga — fristående, ingen
// ruta. Tom = svag vit kontur (syns mot ängen), fylld = varelsens färg med vit glans.
function drawNot(g, fylld, color) {
  g.clear()
  if (fylld) {
    g.ellipse(-6, 10, 13, 9.5).fill(color).stroke({ width: 3, color: 0xffffff, alpha: 0.85 })
    g.rect(4, -26, 5, 36).fill(color)
    g.moveTo(9, -26).quadraticCurveTo(24, -18, 20, -2).quadraticCurveTo(20, -14, 9, -14).fill(color)
    g.ellipse(-10, 6, 4, 2.6).fill({ color: 0xffffff, alpha: 0.6 })
  } else {
    g.ellipse(-6, 10, 13, 9.5).stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
    g.moveTo(6.5, 8).lineTo(6.5, -26).stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
  }
}
