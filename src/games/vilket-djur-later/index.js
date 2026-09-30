// Vilket Djur Låter Så? — pedagogiskt tryck-spel (2–5 år). Rösten spelar upp ett
// djurläte (t.ex. "Mu! Muu!") och barnet trycker på rätt djur bland 2–6 djur som står
// FRITT på en solig äng (egen kropp, skugga, vilo-guppning — inga kort, inga brickor).
// Rätt -> djuret hoppar glatt, gnistror, och "svarar" med sitt namn ("Det är en ko! Kon
// säger muu!"). Fel -> mjuk, vänlig skakning + neutralt ljud, och lätet upprepas snällt.
// ALDRIG bestraffning, ingen poäng, ingen timer. Oändlig, lugnt växande lek.
//
// Djup (anti-enformighet): antal djur växer med nivån (2 -> 3 -> 4 -> 6); rundorna har TEMA
// (bondgården först, sedan dammen/skogen, sedan bondgården igen …) med egen kuliss; var
// fjärde runda är en VÄNDA-runda där ETT djur visas stort och barnet får härma lätet
// ("Hur låter kon? Säg muu!") — trycket på djuret spelar upp djurets eget läte som ett eko.
//
// Djuren ritas med djurorkesterns kropp (`../djurorkester/konst.js`, bara läst) så de båda
// spelen ser ut att höra ihop. Träffytan sitter på en BEHÅLLARE som aldrig rör sig; allt
// som guppar, hoppar och nickar är barn (P0 + feedback.js-regeln om snäppytor).
// Allt async är this._alive-skyddat: ticker, fördröjda anrop och varje tween dödas i destroy().
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import {
  bounceIn, pop, wiggle, sparkle, floatText, ripple, shake, burst, breathe, kvittera, squash, liv, stadFx,
} from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { drawIcon } from '../../lib/artikoner.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { ritaKropp, ritaHander, ritaFlygNot } from '../djurorkester/konst.js'

// Djurdata: emoji (NYCKEL för ikon, namn och ljudklipp) + svenskt namn (rätt artikel +
// bestämd form) för en grammatiskt korrekt bekräftelse, + lätesord (late), frasen rösten
// spelar som ledtråd (fras) och vändarundans uppmaning (hur). `color` = ringfärg,
// `pals` + `marke` = kroppen (konst.js), `tema` = vilken kuliss djuret hör hemma i.
const DJUR = [
  { id: 'ko', emoji: '🐮', namn: 'ko', art: 'en', best: 'Kon', late: 'muu', fras: 'Mu! Muu!', hur: 'Hur låter kon? Säg muu!', color: 0xff9ec4, pals: 0xf7f4ef, marke: 'flackar', tema: 'gard' },
  { id: 'hund', emoji: '🐶', namn: 'hund', art: 'en', best: 'Hunden', late: 'voff', fras: 'Voff! Voff!', hur: 'Hur låter hunden? Säg voff!', color: 0xffd35c, pals: 0xc98a4b, tema: 'gard' },
  { id: 'katt', emoji: '🐱', namn: 'katt', art: 'en', best: 'Katten', late: 'mjau', fras: 'Mjau! Mjau!', hur: 'Hur låter katten? Säg mjau!', color: 0xff8a3d, pals: 0xb6c0cc, tema: 'gard' },
  { id: 'gris', emoji: '🐷', namn: 'gris', art: 'en', best: 'Grisen', late: 'nöff', fras: 'Nöff! Nöff!', hur: 'Hur låter grisen? Säg nöff!', color: 0xffb3d1, pals: 0xf7b9c4, tema: 'gard' },
  { id: 'far', emoji: '🐑', namn: 'får', art: 'ett', best: 'Fåret', late: 'bää', fras: 'Bää! Bää!', hur: 'Hur låter fåret? Säg bää!', color: 0x57c8c3, pals: 0xf0e6d8, tema: 'gard' },
  { id: 'hast', emoji: '🐴', namn: 'häst', art: 'en', best: 'Hästen', late: 'gnägg', fras: 'Gnägg! Gnägg!', hur: 'Hur låter hästen? Säg gnägg!', color: 0xa78bfa, pals: 0xb5764a, tema: 'gard' },
  { id: 'anka', emoji: '🦆', namn: 'anka', art: 'en', best: 'Ankan', late: 'kvack', fras: 'Kvack! Kvack!', hur: 'Hur låter ankan? Säg kvack!', color: 0xffd35c, pals: 0xf3ecd4, tema: 'skog' },
  { id: 'hona', emoji: '🐔', namn: 'höna', art: 'en', best: 'Hönan', late: 'pock', fras: 'Pock pock pock!', hur: 'Hur låter hönan? Säg pock!', color: 0xff6b6b, pals: 0xfaf6ee, tema: 'gard' },
  { id: 'groda', emoji: '🐸', namn: 'groda', art: 'en', best: 'Grodan', late: 'kvack', fras: 'Kvack! Kvack!', hur: 'Hur låter grodan? Säg kvack!', color: 0x5bbf6a, pals: 0x7ed06a, tema: 'skog' },
  { id: 'bi', emoji: '🐝', namn: 'bi', art: 'ett', best: 'Biet', late: 'surr', fras: 'Bzzz! Bzzz!', hur: 'Hur låter biet? Säg surr!', color: 0xffd35c, pals: 0xf0c33c, marke: 'rander', tema: 'skog' },
  { id: 'tupp', emoji: '🐓', namn: 'tupp', art: 'en', best: 'Tuppen', late: 'kuckeliku', fras: 'Kuckeliku!', hur: 'Hur låter tuppen? Säg kuckeliku!', color: 0xff6b6b, pals: 0xc46a45, tema: 'gard' },
  { id: 'uggla', emoji: '🦉', namn: 'uggla', art: 'en', best: 'Ugglan', late: 'hoo', fras: 'Hoo! Hoo!', hur: 'Hur låter ugglan? Säg hoo!', color: 0xa78bfa, pals: 0xc98a4b, tema: 'skog' },
]

// Svårighet = antal svarsalternativ (osynligt för barnet, växer långsamt).
const LEVELS = [2, 3, 4, 6]
// Golv: minst 3 djur (utom allra första rundan i en session, som får vara 2 som
// mjuk introduktion) — med bara 2 blir det ett myntkast, valet ska kräva
// att man faktiskt LYSSNAR.
const MIN_CARDS = 3

// Korta, varierade rundinstruktioner (rösten) så det aldrig blir enformigt.
const ROUND_PROMPTS = [
  'Vilket djur låter så här?',
  'Lyssna! Vad är det som låter?',
  'Vem är det som låter nu?',
  'Vilket djur hör du?',
]

// När kulissen byts (milstolpen) ersätter den rundans vanliga instruktion.
const TEMA_INTRO = {
  gard: 'Nu är vi på bondgården! Vem låter här?',
  skog: 'Nu är vi vid dammen och skogen! Vem låter här?',
}

// Vändarundan: djuret har hört sig själv härmas — kort och sakligt, aldrig "rätt/fel".
const HARMA_BEROM = ['Precis så!', 'Ja, just så!', 'Vad fint det lät!']

// Vinnardjuret gör en EGEN gest vid rätt svar. Sitter på HUVUDET (ett barn) — aldrig på
// behållaren som bär träffytan. `prop` x/y/rotation; `skak` = svänger åt båda håll runt
// vila; annars fram och tillbaka från vila. Alla slutar i vila inom ~1,2 s.
const GEST = {
  ko: { prop: 'rotation', amp: 0.18, n: 2, t: 0.12, skak: true }, // vickar på huvudet
  hund: { prop: 'rotation', amp: 0.1, n: 4, t: 0.06, skak: true }, // viftar av glädje
  katt: { prop: 'rotation', amp: -0.22, n: 1, t: 0.3 }, // lutar huvudet, mysigt
  gris: { prop: 'y', amp: -14, n: 2, t: 0.12 }, // nosknuffar uppåt
  far: { prop: 'x', amp: 6, n: 3, t: 0.07, skak: true }, // bää-skakar
  hast: { prop: 'rotation', amp: -0.28, n: 1, t: 0.25 }, // stegrar sig
  anka: { prop: 'rotation', amp: 0.15, n: 2, t: 0.12, skak: true }, // vaggar
  hona: { prop: 'rotation', amp: 0.32, n: 3, t: 0.08 }, // picker framåt
  groda: { prop: 'y', amp: -30, n: 2, t: 0.16 }, // hoppar
  bi: { prop: 'x', amp: 5, n: 5, t: 0.045, skak: true }, // surrar på stället
  tupp: { prop: 'rotation', amp: -0.2, n: 1, t: 0.3 }, // sträcker på halsen och gal
  uggla: { prop: 'rotation', amp: 0.4, n: 1, t: 0.32 }, // vrider på huvudet
}

// Glada svävande emoji vid rätt svar (effekt, inget spelobjekt).
const HAPPY = ['⭐', '🌟', '✨', '💛', '😄']

// Layout (designkoordinater 1280x720).
const SOUND_X = 640
const SOUND_Y = 158
const SOUND_R = 86

// Djuret i egna koordinater: fötterna i (0,0), huvudet 104 px över dem (konst.js-kroppen).
const HUVUD_Y = -104
// Träffyta: 140 px bred och från huvudets topp till strax under fötterna. Skalan sätts per
// layout så att den aldrig understiger 96 px + halo, och så att rader/kolumner ligger
// ≥ 24 px isär (se _lagg).
const HIT = new Rectangle(-70, -150, 140, 166)
// Örat (fri-lyssna) sitter bredvid kroppen — som SYSKON till djuret, inte barn: en
// behållare med hitArea släpper aldrig igenom träffar utanför sin yta.
const EAR_DX = 84
const EAR_DY = -56

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
    this._rond = 0
    this._calls = []
    this._cards = []
    this._lastAnswerId = null
    this._hur = false
    this._tema = 'gard' // bondgården först
    this._temaNytt = false
    this._deco = null
    this._decoTema = null
    this._decoTw = null

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Marknadsmässig bakgrund: mjuk äng med sol, kullar och drivande moln.
    //    Marken börjar vid stängslet (y≈360) så djuren, ladan och dammen står PÅ ängen i
    //    stället för att sväva på himlens dis.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, groundH: 360 }))

    // 2) Kuliss per tema (lada + stängsel / damm + träd), byts när temat byts.
    this._decoLager = new Container()
    this._decoLager.eventMode = 'none'
    this._decoLager.interactiveChildren = false
    this._root.addChild(this._decoLager)

    // 3) Osynlig tap-fångare under djuren: tryck bredvid ett djur -> mjukt ljud +
    //    liten ring där fingret var + en vänlig skakning på ett djur (aldrig "fel").
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._root.addChild(tap)

    // 4) Ljud-/repetera-knappen (ligger kvar mellan rundor).
    this._makeSoundButton(ctx)

    // 5) Djur-lager + öron-lager (det enda som byggs om per runda).
    this._cardLayer = new Container()
    this._earLayer = new Container()
    this._root.addChild(this._cardLayer, this._earLayer)

    // Nivå från sparad framgång (antal djur på scenen).
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

  // Vänlig "högtalare"-knapp: gul cirkel + 🔊 + puls-ring. Tryck = repris av lätet
  // (i vändarundan: repris av uppmaningen). Studsar in och stannar kvar mellan rundor.
  _makeSoundButton(ctx) {
    const btn = new Container()
    btn.position.set(SOUND_X, SOUND_Y)

    // Mjuk markskugga + halo bakom knappen ger djup.
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

  // Ett fritt djur: markskugga + kropp/huvud/händer (djurorkesterns kropp) som guppar
  // lugnt. `d` (träffytan) rör sig ALDRIG — `_figur` hoppar/klämmer, `_vila` guppar,
  // `_huvud` nickar och "pratar". Tryck = välj svar.
  _makeCard(ctx, djur, sc, x, y) {
    const d = new Container()
    d._djur = djur
    d.position.set(x, y)
    d.scale.set(sc)
    d.eventMode = 'static'
    d.cursor = 'pointer'
    d.hitArea = HIT

    const skugga = new Graphics().ellipse(0, 4, 66, 13).fill({ color: 0x000000, alpha: 0.18 })
    skugga.eventMode = 'none'

    const figur = new Container()
    figur.eventMode = 'none'
    figur.interactiveChildren = false
    const vila = new Container()
    const kropp = ritaKropp(djur)
    const hander = ritaHander(djur)
    // Huvudet i en egen behållare (ikonen ritas i origo) — den nickar, ikonen står still i den.
    const huvud = new Container()
    const ikon = drawIcon(djur.emoji, 104)
    ikon.eventMode = 'none'
    huvud.addChild(ikon)
    huvud.position.set(0, HUVUD_Y)
    vila.addChild(kropp, huvud, hander)
    figur.addChild(vila)
    d.addChild(skugga, figur)

    // Vilo-guppning med egen fas per djur (stadFx river den via _fxLiv).
    liv(vila, { bob: 4, sway: 0.025, duration: 1.5 + Math.random() * 0.8, phase: Math.random() })

    d._figur = figur
    d._vila = vila
    d._huvud = huvud
    d._sc = sc
    d.on('pointertap', () => this._choose(ctx, d))
    return d
  },

  // Fri-lyssna-öra: ett litet UI-kontrollknapp bredvid djuret. Tryck = hör DETTA djurs
  // läte utan att det räknas som svar (nyfikenhet belönas, ALDRIG vinglas bort).
  _makeEar(ctx, d) {
    const earR = 34
    const ear = new Container()
    ear.position.set(d.x + EAR_DX * d._sc, d.y + EAR_DY * d._sc)
    ear.addChild(new Graphics().circle(0, 2, earR).fill({ color: 0x000000, alpha: 0.12 }))
    ear.addChild(new Graphics().circle(0, 0, earR).fill(COLORS.white).stroke({ width: 4, color: d._djur.color, alpha: 0.9 }))
    const earIcon = new Text({ text: '👂', style: { fontFamily: FONT.body, fontSize: earR + 8 } })
    earIcon.anchor.set(0.5)
    earIcon.eventMode = 'none'
    ear.addChild(earIcon)
    ear.eventMode = 'static'
    ear.cursor = 'pointer'
    ear.hitArea = new Circle(0, 0, 50) // 100px träffyta (>=96)
    ear.on('pointertap', (e) => {
      e.stopPropagation() // örat är inte ett svar
      this._listen(ctx, d)
    })
    d._ear = ear
    return ear
  },

  // --- kuliss -----------------------------------------------------------------

  // Byt kuliss om temat ändrats (bondgård ↔ damm/skog). Den gamla rivs genast, den nya
  // tonas in. Tweenen spåras och dödas i destroy().
  _visaTema() {
    if (this._decoTema === this._tema) return
    this._decoTw?.kill()
    this._decoTw = null
    this._deco?.destroy({ children: true })
    const deco = this._tema === 'gard' ? byggGard() : byggSkog()
    deco.alpha = 0
    this._decoLager.addChild(deco)
    this._deco = deco
    this._decoTema = this._tema
    this._decoTw = gsap.to(deco, { alpha: 1, duration: 0.6, ease: 'sine.out' })
  },

  // --- rund-logik ---------------------------------------------------------

  // Bygg en ny runda: städa förra djuren, slumpa rätt-djur ur temats pool + distraktorer
  // (aldrig samma svar två gånger i rad; distraktorer delar aldrig läte med svaret), och
  // studsa in djuren. Var fjärde runda är en vändarunda med ETT djur. Spelar INTE lätet
  // här — det styrs separat.
  _newRound(ctx) {
    if (!this._alive) return
    this._clearCards()
    this._busy = false
    this._idle = 0
    this._killCalls()
    this._cueCall?.kill()
    this._rond++
    this._visaTema()

    const hur = !this._first && this._wins % 4 === 3
    this._hur = hur

    // Svaret hämtas ur temats pool (aldrig samma som förra rundan).
    let pool = DJUR.filter((d) => d.tema === this._tema && d.id !== this._lastAnswerId)
    if (!pool.length) pool = DJUR.filter((d) => d.id !== this._lastAnswerId)
    const answer = randomFrom(pool)
    this._answer = answer
    this._lastAnswerId = answer.id

    if (hur) {
      // Ett stort djur mitt på ängen.
      const card = this._makeCard(ctx, answer, 1.7, 640, 612)
      this._cardLayer.addChild(card)
      this._cards.push(card)
      bounceIn(card._figur, { delay: 0.06, duration: 0.4 })
    } else {
      // Allra första rundan får vara 2 djur (mjuk start); alla följande minst 3 så
      // barnet måste lyssna för att välja rätt.
      const n = this._first ? 2 : Math.max(MIN_CARDS, LEVELS[this._level])

      // Distraktorer får aldrig dela läte med svaret (groda/anka säger båda "kvack").
      // Djur ur samma tema först; saknas de fylls det på ur det andra temat.
      // Höna och tupp är samma fågel för en treåring — de står aldrig på ängen samtidigt.
      const fagel = (d) => d.id === 'hona' || d.id === 'tupp'
      const ovriga = DJUR.filter((d) => d.id !== answer.id && d.late !== answer.late)
      const samma = shuffle(ovriga.filter((d) => d.tema === answer.tema))
      const andra = shuffle(ovriga.filter((d) => d.tema !== answer.tema))
      let harFagel = fagel(answer)
      const distractors = [...samma, ...andra].filter((d) => {
        if (!fagel(d)) return true
        if (harFagel) return false
        return (harFagel = true)
      }).slice(0, n - 1)
      const round = shuffle([answer, ...distractors])

      this._lagg(ctx, round)
    }

    // Talad rundinstruktion (första rundan täcks av voiceIntro i mount) + ledtråd.
    // Efter en milstolpe kommer rundan 1,6 s efter complete() — på fast tid kapade
    // frågan berömmet (1,0–2,3 s). Djuren delas ut genast; frågan köar, och lätet följer
    // 1,1 s efter FRÅGAN. Har barnet redan svarat, eller rundan bytts, tappas den.
    if (!this._first) {
      const rond = this._rond
      const nyttTema = this._temaNytt
      this._temaNytt = false
      ctx.narTyst(() => {
        if (!this._alive || this._rond !== rond || this._busy) return
        if (hur) {
          ctx.services.voice.say(answer.hur)
          this._nudga(this._cards[0])
          return
        }
        ctx.services.voice.say(nyttTema ? TEMA_INTRO[this._tema] : randomFrom(ROUND_PROMPTS))
        this._cueSoon(ctx, 1.1)
      })
    } else {
      this._temaNytt = false
    }
    this._first = false
  },

  // Placera djuren fritt på ängen. 2–4: en rad, stora. 6: 3×2, mindre — skalan väljs så att
  // träffytan (140 px × skala) är ≥ 96 px + halo och raderna ligger ≥ 24 px isär:
  // rad-avstånd 186 px, träffytans höjd 166 × 0,95 = 158 -> 28 px luft.
  _lagg(ctx, round) {
    const n = round.length
    const placera = (djur, sc, x, y, i) => {
      const card = this._makeCard(ctx, djur, sc, x, y)
      this._cardLayer.addChild(card)
      this._cards.push(card)
      bounceIn(card._figur, { delay: 0.06 + i * 0.07, duration: 0.4 })
      const ear = this._makeEar(ctx, card)
      this._earLayer.addChild(ear)
      bounceIn(ear, { delay: 0.2 + i * 0.07, duration: 0.3 })
    }
    if (n <= 4) {
      const pitch = n === 2 ? 380 : n === 3 ? 340 : 300
      round.forEach((djur, i) => placera(djur, 1.3, 640 + (i - (n - 1) / 2) * pitch, 590, i))
    } else {
      round.forEach((djur, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        placera(djur, 0.95, 340 + col * 300, row === 0 ? 478 : 664, i)
      })
    }
  },

  // Spela upp lätet (ledtråd): pling + svävande noter + puls-ring + rösten säger lätet.
  // I vändarundan är knappen en REPETERA-knapp för uppmaningen.
  _playSound(ctx) {
    if (!this._alive || !this._answer) return
    this._idle = 0
    ctx.services.audio.sfx('pling')
    if (this._hur) {
      ctx.services.voice.say(this._answer.hur)
      this._nudga(this._cards[0])
    } else {
      // Riktigt förinspelat djurläte om klippet finns — annars säger rösten lätet.
      if (!ctx.services.audio.sample(`djur_${this._answer.id}`)) {
        ctx.services.voice.say(this._answer.fras)
      }
      floatText(ctx.fxLayer, SOUND_X - 30, SOUND_Y - 40, '🎵', { fontSize: 40, rise: 70 })
      floatText(ctx.fxLayer, SOUND_X + 34, SOUND_Y - 30, '🎶', { fontSize: 36, rise: 84 })
    }

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

  // Ett litet "titta på mig"-hopp (vändarundans uppmaning).
  _nudga(d) {
    if (!d || d.destroyed || !this._alive) return
    squash(d._figur, { intensity: 0.8, hop: 28 })
  },

  // Fri-lyssna: barnet tryckte på örat bredvid ett djur -> spela DET djurets läte och låt
  // djuret röra sig med ljudet. Räknas ALDRIG som svar (ingen skakning, inget "fel").
  _listen(ctx, d) {
    if (!this._alive) return
    if (!d || d.destroyed) return
    if (this._busy) return kvittera(ctx.fxLayer, d.x, d.y, ctx.services.audio, { color: d._djur?.color })
    this._idle = 0
    pop(d._ear)
    // Riktigt klipp om det finns, annars säger rösten lätet (inte namnet — örat är
    // ren nyfikenhet: "hör hur det låter", inte en avslöjande ledtråd).
    if (!ctx.services.audio.sample(`djur_${d._djur.id}`)) {
      ctx.services.voice.say(d._djur.fras)
    }
    squash(d._figur, { intensity: 0.7 })
    this._speak(ctx, d)
  },

  // Låt djuret VISUELLT "göra" sitt läte: huvudet "pratar" (skala i takt) och kroppen
  // trycks ihop lätt, + ljudvågs-ring ut från djuret. Kopplar ihop ljud och djur.
  // Exit-säkert: tweens dödas i _killCardTweens (anropas i _clearCards/destroy).
  _speak(ctx, d) {
    if (!d || d.destroyed) return
    const huvud = d._huvud
    if (huvud && !huvud.destroyed) {
      gsap.killTweensOf(huvud.scale)
      huvud.scale.set(1)
      gsap.to(huvud.scale, {
        x: 1.16, y: 0.88, duration: 0.15, repeat: 5, yoyo: true, ease: 'sine.inOut',
        onComplete: () => { if (!huvud.destroyed) huvud.scale.set(1) },
      })
    }
    ripple(ctx.fxLayer, d.x, d.y - 70 * d._sc, { color: d._djur.color, maxR: 104 })
  },

  // Skicka "ljudvågor" (flygande noter) från ljudknappen mot ett djur — idle-ledtråden
  // (då rätt djur redan andas) kopplar ljud->djur. Exit-säker: tweenar ett vanligt objekt
  // och rör Pixi-noten bara om den lever.
  _noteTo(ctx, d) {
    if (!d || d.destroyed) return
    for (let i = 0; i < 2; i++) {
      const t = ritaFlygNot(d._djur.color)
      t.scale.set(0.8)
      const x0 = SOUND_X, y0 = SOUND_Y + 44, x1 = d.x, y1 = d.y - 150 * d._sc
      t.position.set(x0, y0)
      ctx.fxLayer.addChild(t)
      const st = { x: x0, y: y0, a: 1 }
      const tw = gsap.to(st, {
        x: x1, y: y1, a: 0, duration: 0.9, delay: i * 0.18, ease: 'sine.in',
        onUpdate: () => {
          if (t.destroyed) { tw.kill(); return }
          t.x = st.x
          t.y = st.y
          t.alpha = st.a
        },
        onComplete: () => { if (!t.destroyed) t.destroy({ children: true }) },
      })
    }
  },

  _choose(ctx, d) {
    if (!this._alive) return
    // Firandet pågår — men ett tryck får aldrig vara stumt (P0): ring + mjukt pling.
    if (this._busy) return kvittera(ctx.fxLayer, d?.x, d?.y, ctx.services.audio, { color: d?._djur?.color })
    this._idle = 0
    this._clearHint()

    // Vändarundan: varje tryck på djuret är ett härmande — det finns inget fel svar.
    if (this._hur) return this._harma(ctx, d)

    // Omedelbar (<100ms) återkoppling på VARJE tryck: ljud + hopp + ring.
    ctx.services.audio.sfx('tap')
    ripple(ctx.fxLayer, d.x, d.y - 60 * d._sc, { color: d._djur.color, maxR: 90 })

    if (d._djur !== this._answer) {
      // Fel: aldrig bestraffning — djuret studsar till och skakar på huvudet, mjukt ljud,
      // och lätet upprepas vänligt.
      ctx.services.audio.sfx('soft')
      squash(d._figur, { intensity: 0.8, hop: 14 })
      wiggle(d._huvud)
      this._cueSoon(ctx, 0.9)
      return
    }

    // Rätt! Fira djuret och låt det "svara" med sitt namn.
    this._busy = true
    ctx.services.audio.sfx('correct')
    sparkle(ctx.fxLayer, d.x, d.y - 80 * d._sc)
    burst(ctx.fxLayer, d.x, d.y - 80 * d._sc, { count: 14, power: 1 })
    floatText(ctx.fxLayer, d.x, d.y - 170 * d._sc, randomFrom(HAPPY), { fontSize: 60, rise: 90 })
    ctx.services.voice.say(`Det är ${d._djur.art} ${d._djur.namn}!`)

    // Glad hopp-animation på vinnaren; tona de andra mjukt.
    this._celebrateCard(d)

    // Stolt, multisensorisk belöning: spela det RIKTIGA klippet IGEN — nu tillsammans
    // med djurets namn ("Det är en ko!" ... *muu*) — och låt djuret själv "göra" lätet
    // så ljud↔djur kopplas ihop. Klippet finns förinspelat; saknas det säger rösten lätet.
    this._schedule(0.85, () => {
      if (!d || d.destroyed) return
      if (!ctx.services.audio.sample(`djur_${d._djur.id}`)) {
        ctx.services.voice.say(`${d._djur.best} säger ${d._djur.late}!`)
      }
      this._speak(ctx, d)
    })

    this._spara(ctx, 1.8, 1.7)
  },

  // Vändarundan: djuret visas, barnet trycker -> barnet "hör sig själv härmad": djurets
  // EGET läte spelas som eko, djuret svarar med mun och gest, sedan ett kort beröm.
  _harma(ctx, d) {
    const audio = ctx.services.audio
    this._busy = true
    audio.sfx('tap')
    ripple(ctx.fxLayer, d.x, d.y - 60 * d._sc, { color: d._djur.color, maxR: 130 })
    sparkle(ctx.fxLayer, d.x, d.y - 100 * d._sc)
    burst(ctx.fxLayer, d.x, d.y - 100 * d._sc, { count: 14, power: 1 })
    floatText(ctx.fxLayer, d.x, d.y - 180 * d._sc, randomFrom(HAPPY), { fontSize: 60, rise: 90 })

    const klipp = audio.sample(`djur_${d._djur.id}`)
    if (!klipp) ctx.services.voice.say(d._djur.fras)
    const langd = klipp ? audio.sampleDuration(`djur_${d._djur.id}`) : 1.2
    this._celebrateCard(d)
    this._speak(ctx, d)

    // Berömmet väntar in klippet (annars kapar det ekot) — bilden väntar inte.
    const dur = Math.max(1.0, langd)
    this._schedule(dur + 0.25, () => {
      audio.sfx('correct')
      if (!ctx.services.voice.talar) ctx.services.voice.say(randomFrom(HARMA_BEROM))
    })

    const nasta = Math.max(2.4, dur + 1.7)
    this._spara(ctx, nasta, nasta - 0.6)
  },

  // Spara framsteg + höj svårighet långsamt; schemalägg nästa runda (eller milstolpe).
  // `tidNasta` = sekunder till nästa runda, `tidFira` = sekunder till milstolpsfirandet.
  _spara(ctx, tidNasta, tidFira) {
    const rundor = (ctx.progress.get().custom?.rundor || 0) + 1
    ctx.progress.setCustom('rundor', rundor)
    const lvl = clampLevel(Math.floor(rundor / 3))
    if (lvl > this._level) this._level = lvl
    ctx.progress.setLevel(this._level)

    this._wins++
    this._winsInSet++

    if (this._winsInSet >= this._setTarget) {
      // Milstolpe: mjuk skak + delat stort firande (firar-ljud, beröm, konfetti,
      // stjärna, klistermärke sköts av complete() — vi dubblerar det inte). Därefter byter
      // kulissen: bondgård <-> damm/skog.
      this._winsInSet = 0
      this._setTarget = 3 + this._level
      this._schedule(tidFira, () => {
        this._shakeTween = shake(this._root, { intensity: 6, duration: 0.4 })
        ctx.progress.complete()
      })
      this._schedule(tidFira + 1.6, () => {
        this._tema = this._tema === 'gard' ? 'skog' : 'gard'
        this._temaNytt = true
        this._nextRound(ctx)
      })
    } else {
      this._schedule(tidNasta, () => this._nextRound(ctx))
    }
  },

  // Glad hopp + studs på vinnaren; mjuk nedtoning av de andra djuren.
  _celebrateCard(d) {
    squash(d._figur, { intensity: 1.1, hop: 44 })
    if (d._huvud && !d._huvud.destroyed) {
      gsap.killTweensOf(d._huvud)
      d._huvud.position.set(0, HUVUD_Y)
      if (!this._gest(d)) {
        gsap.fromTo(d._huvud, { rotation: -0.14 }, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
      }
    }
    this._cards.forEach((c) => {
      if (c === d || c.destroyed) return
      gsap.to(c, { alpha: 0.5, duration: 0.3, ease: 'sine.out' })
      gsap.to(c._figur.scale, { x: 0.92, y: 0.92, duration: 0.3, ease: 'sine.out' })
    })
    this._earLayer?.children.forEach((e) => {
      if (!e.destroyed) gsap.to(e, { alpha: 0.4, duration: 0.3, ease: 'sine.out' })
    })
  },

  // Spelar GEST[id] på vinnarens huvud. Sant om djuret hade en egen gest.
  // Tweensen dödas av _killCardTweens (killTweensOf huvudet) vid nästa runda och i destroy.
  _gest(d) {
    const huvud = d?._huvud
    const g = GEST[d?._djur?.id]
    if (!huvud || huvud.destroyed || !g) return false
    const bas = g.prop === 'y' ? HUVUD_Y : 0
    huvud.x = 0
    huvud.y = HUVUD_Y
    huvud.rotation = 0
    const tl = gsap.timeline({
      onComplete: () => {
        if (!huvud.destroyed) huvud[g.prop] = bas
      },
    })
    if (g.skak) {
      tl.to(huvud, { [g.prop]: bas + g.amp, duration: g.t, ease: 'sine.out' })
        .to(huvud, { [g.prop]: bas - g.amp, duration: g.t * 2, ease: 'sine.inOut', yoyo: true, repeat: g.n * 2 - 1 })
        .to(huvud, { [g.prop]: bas, duration: g.t, ease: 'sine.in' })
    } else {
      tl.to(huvud, { [g.prop]: bas + g.amp, duration: g.t, ease: 'sine.out', yoyo: true, repeat: g.n * 2 - 1 })
    }
    return true
  },

  _nextRound(ctx) {
    this._newRound(ctx)
  },

  // Tomt tryck bredvid djuren: mjukt ljud + ring där fingret var + ett djur skakar vänligt.
  _emptyTap(ctx, e) {
    if (!this._alive) return
    if (this._busy) {
      const q = e?.global ? this._root.toLocal(e.global) : null
      return kvittera(ctx.fxLayer, q?.x, q?.y, ctx.services.audio, { color: COLORS.green })
    }
    this._idle = 0
    ctx.services.audio.sfx('soft')
    if (e?.global) {
      const p = this._root.toLocal(e.global)
      ripple(ctx.fxLayer, p.x, p.y, { color: COLORS.green, maxR: 70 })
    }
    const c = this._cards.length ? randomFrom(this._cards) : null
    if (c && !c.destroyed) {
      squash(c._figur, { intensity: 0.6, hop: 10 })
      wiggle(c._huvud)
    }
  },

  // Idle ~6s utan rätt: upprepa instruktion + lätet och locka med en lugn
  // andnings-puls (breathe) på rätt djur. Återställs vid varje tryck.
  _update(ctx, ticker) {
    if (!this._alive || this._busy) return
    // Tomgången räknas från TYSTNAD — annars kapar lockningen en replik som talar.
    if (ctx.services.voice.talar) this._idle = 0
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      const answerCard = this._cards.find((c) => c._djur === this._answer)
      if (this._hur) ctx.services.voice.say(this._answer.hur)
      else {
        ctx.services.voice.say(randomFrom(ROUND_PROMPTS))
        this._cueSoon(ctx, 1.0)
      }
      if (answerCard && !answerCard.destroyed) {
        this._clearHint()
        this._hintCard = answerCard
        this._hintTween = breathe(answerCard._figur, { scale: 1.1, duration: 0.85 })
        // Ljudvågor från knappen mot rätt djur (djuret avslöjas redan av andningen).
        if (!this._hur) this._noteTo(ctx, answerCard)
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

  // Stoppa idle-hintens andnings-puls och återställ djurets skala.
  _clearHint() {
    this._hintTween?.kill()
    this._hintTween = null
    if (this._hintCard && !this._hintCard.destroyed && this._hintCard._figur) this._hintCard._figur.scale.set(1)
    this._hintCard = null
  },

  // Döda varje tween som kan sitta på ett djur: behållaren, hela figurträdet (guppning,
  // hopp, squash, huvudets gest och "prat"-skala — stadFx går nedåt i trädet och tar även
  // liv()-tweenen som ligger på ett proxy-objekt) och örat.
  _killCardTweens(c) {
    if (!c || c.destroyed) return
    stadFx(c)
    gsap.killTweensOf(c)
    gsap.killTweensOf(c.scale)
    if (c._huvud) {
      gsap.killTweensOf(c._huvud)
      gsap.killTweensOf(c._huvud.scale)
    }
    if (c._figur) gsap.killTweensOf(c._figur.scale)
    if (c._ear && !c._ear.destroyed) {
      stadFx(c._ear)
      gsap.killTweensOf(c._ear)
      gsap.killTweensOf(c._ear.scale)
    }
  },

  // Döda alla tweens på nuvarande djur och förstör dem (exit-säkert mellan rundor).
  _clearCards() {
    this._clearHint()
    this._cards.forEach((c) => this._killCardTweens(c))
    this._cardLayer?.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._earLayer?.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._cards = []
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._cueCall?.kill()
    this._shakeTween?.kill()
    this._decoTw?.kill()
    this._killCalls()
    this._clearHint()
    // Döda djur-tweens (gung/skala/prat/öra) innan trädet rivs.
    this._cards?.forEach((c) => this._killCardTweens(c))
    if (this._deco && !this._deco.destroyed) gsap.killTweensOf(this._deco)
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

// --- kulisser (ritade, ingen emoji) -------------------------------------------------
// Ligger bakom djuren på horisonten (y ≈ 250–360) så de aldrig tar plats där djuren står.

// Bondgård: röd lada till vänster, ett stängsel tvärs över och en höbal till höger.
function byggGard() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const g = new Graphics()
  // Ladan (vänster): röd kropp, mörkare tak, dubbeldörr med kryss, lucka på vinden.
  g.ellipse(160, 352, 104, 12).fill({ color: 0x000000, alpha: 0.12 })
  g.rect(84, 262, 152, 88).fill(0xc8453a)
  g.poly([72, 266, 160, 212, 248, 266]).fill(0x9c2f2b)
  g.rect(122, 298, 76, 52).fill(0x8f2d28)
  g.moveTo(122, 298).lineTo(198, 350).stroke({ width: 4, color: 0xfff3d6 })
  g.moveTo(198, 298).lineTo(122, 350).stroke({ width: 4, color: 0xfff3d6 })
  g.rect(122, 298, 76, 52).stroke({ width: 4, color: 0xfff3d6 })
  g.circle(160, 250, 11).fill(0xfff3d6).stroke({ width: 3, color: 0x8f2d28 })
  // Höbalen (höger).
  g.ellipse(1150, 356, 58, 10).fill({ color: 0x000000, alpha: 0.12 })
  g.roundRect(1100, 318, 100, 40, 16).fill(0xe8c65a).stroke({ width: 3, color: 0xc9a23c })
  for (const x of [1125, 1150, 1175]) g.moveTo(x, 320).lineTo(x, 356).stroke({ width: 2, color: 0xc9a23c })
  // Stängslet (framför ladan): två liggande ribbor + stolpar.
  const Y = 340
  g.rect(0, Y + 14, 1280, 6).fill(0xd9b98a)
  g.rect(0, Y + 34, 1280, 6).fill(0xd9b98a)
  for (let x = 24; x < 1280; x += 64) g.roundRect(x, Y, 10, 56, 3).fill(0xc79d68)
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// Damm + skog: en liten damm med näckrosor och vass till vänster, ett stort träd till höger.
function byggSkog() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const g = new Graphics()
  // Dammen.
  g.ellipse(180, 352, 158, 38).fill(0x5fb8e6).stroke({ width: 4, color: 0x3f93c2 })
  g.ellipse(160, 346, 112, 22).fill({ color: 0x9adcf5, alpha: 0.7 })
  for (const [x, y, rx] of [[130, 352, 22], [215, 360, 18]]) {
    g.ellipse(x, y, rx, rx * 0.4).fill(0x4fae5a)
    g.ellipse(x + rx * 0.3, y - 2, rx * 0.3, rx * 0.13).fill(0xf7b9d8)
  }
  // Vass (kråkvirke) vid dammens högra kant.
  for (const [x, lutn, h] of [[312, 6, 76], [326, -4, 92], [340, 8, 68]]) {
    g.moveTo(x, 358).lineTo(x + lutn, 358 - h).stroke({ width: 3, color: 0x4f8f3e, cap: 'round' })
    g.roundRect(x + lutn - 5, 358 - h - 4, 10, 26, 5).fill(0x7a4a26)
  }
  // Trädet (höger): stam + tre lövklot.
  g.ellipse(1184, 352, 62, 11).fill({ color: 0x000000, alpha: 0.12 })
  g.roundRect(1170, 232, 28, 122, 6).fill(0x8a5a2a)
  g.circle(1184, 210, 62).fill(0x3f9e55)
  g.circle(1136, 240, 44).fill(0x3f9e55)
  g.circle(1232, 244, 44).fill(0x4aae5f)
  g.circle(1172, 190, 30).fill({ color: 0x7bd18a, alpha: 0.55 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}
