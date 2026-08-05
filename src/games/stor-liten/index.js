// Stor och Liten — dra och släpp (2–5 år). Lär begreppen "stor"/"liten" (och på
// högre nivåer "mellan") genom att GE samma sorts gulliga föremål efter STORLEK
// till rätt KOMPIS: en stor mjukisfigur som vill ha stora saker och en liten som
// vill ha små (och en mellanstor på högre nivåer). Kompisarna lever — de blinkar,
// öppnar munnen och "sväljer" tungt/lätt efter storleken, med storleksbundet ljud
// (djup *bom* för stort, hög *tink* för litet). En prickrad ovanför varje kompis
// räknar upp vad den fått (frö till antal, sjunker aldrig). Bygger på den
// återanvändbara DragController (stor träffyta, snäpp, snäpp-tillbaka, tap-tap).
// Fel = mjuk vingel på kompisen (ALDRIG en bestraffning). Oändlig, växande lek:
// fler föremål, ny gullig figur varje runda, och en tredje kompis på högre nivåer.
// När rundan är klar firar vi (stjärna + klistermärke) och en ny runda startar.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, sparkle, ripple, shake, breathe, bounceIn, floatText } from '../../lib/feedback.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Ny gullig figur varje runda (samma figur i flera storlekar) -> alltid en rent
// STORLEKS-uppgift, men friskt och varierat: djur, frukt, fordon, leksaker.
const EMOJIS = [
  '🐻', '🐶', '🐱', '🐰', '🐸', '🐥', '🐢', '🦋', '🐠', '🐝', '🦊', '🐼',
  '🍎', '🍌', '🍓', '🍐', '🍊', '🍇', '🍉', '🍒',
  '🚗', '🚌', '🚜', '🚂', '🚀',
  '🎈', '⭐', '🌟', '🧸', '⚽', '🌸', '🍪', '🎁',
]

// Storleksprofiler: figurens fotavtryck/träffradie + emoji-grad + kompisens
// kroppsmått + färg + etikett + storleksbunden reaktion (skvätt/skak/ton). Tydligt
// åtskilda så skillnaden alltid syns OCH hörs direkt. (`plate` = föremålets
// osynliga träffradie; föremålen visas helt utan platta.)
const SIZES = {
  stor: {
    plate: 86, font: 120, bw: 232, bh: 216, color: COLORS.blue, label: 'Stor',
    shakeAmt: 8, squashY: 0.78, stretchX: 1.16,
    tone: { freq: 150, slideTo: 90, dur: 0.3, type: 'sine', vol: 0.34 }, // djup *bom*
  },
  mellan: {
    plate: 62, font: 82, bw: 176, bh: 168, color: COLORS.teal, label: 'Mellan',
    shakeAmt: 4, squashY: 0.86, stretchX: 1.1,
    tone: { freq: 340, slideTo: 250, dur: 0.22, type: 'sine', vol: 0.3 },
  },
  liten: {
    plate: 44, font: 54, bw: 130, bh: 128, color: COLORS.orange, label: 'Liten',
    shakeAmt: 2, squashY: 0.92, stretchX: 1.06,
    tone: { freq: 1180, slideTo: 1560, dur: 0.14, type: 'triangle', vol: 0.24 }, // hög *tink*
  },
}

// Röstvariation per storlek (full svenska, alltid positivt) — nu med kompis-flärd.
const WORDS = {
  stor: ['Stor!', 'En stor sak!', 'Till den stora!', 'Bra!', 'Precis!'],
  mellan: ['Mellan!', 'Mellanstor!', 'Lagom stor!', 'Fint!', 'Bra!'],
  liten: ['Liten!', 'En liten!', 'Till den lilla!', 'Toppen!', 'Fint!'],
}
const WRONG = ['Prova en annan kompis!', 'Hoppsan, prova en annan kompis!']
const HAPPY = ['😄', '🎉', '⭐', '💛', '✨']

const INTRO_TWO = 'Ge de stora sakerna till den stora kompisen och de små till den lilla kompisen!'
const INTRO_THREE = 'Ge sakerna till rätt kompis: stor, mellan och liten!'

export default {
  id: 'stor-liten',
  titleSv: 'Stor och Liten',
  icon: '📏',
  category: 'pussel',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'stor-liten',
  // Literal, inte INTRO_TWO: check.mjs (och därmed /rost) ser bara strängar som
  // står skrivna på plats — en referens gjorde att spelet räknades som röstlöst.
  voiceIntro: 'Ge de stora sakerna till den stora kompisen och de små till den lilla kompisen!',

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._mode = null
    this._itemRecs = []
    this._friends = null
    this._rounds = ctx.progress.get().custom?.rounds || 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._intro = INTRO_TWO

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk, inbjudande äng-bakgrund (sol, moln, kullar, gräs) — exit-säker.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Genomskinlig tap-fångare: tomt tryck -> lekfullt litet ljud (aldrig negativt).
    const tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tapCatcher.eventMode = 'static'
    tapCatcher.on('pointertap', () => {
      if (!this._alive) return
      ctx.services.audio.sfx('tap')
      this._resetIdle(ctx)
    })
    this._root.addChild(tapCatcher)

    // Spel-lager (kompisar + föremål) — separat från bakgrunden så vi kan skaka det
    // milt vid en tung "svälj" utan att hela scenen guppar.
    this._play = new Container()
    this._root.addChild(this._play)

    this._drag = new DragController({ space: this._play, services: ctx.services })
    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this._intro)
    this._resetIdle(ctx)
  },

  // --- Kompisar (mottagare) ----------------------------------------------

  // Bygg mottagar-kompisarna för aktuellt läge (två eller tre storlekar). Anropas
  // bara när läget ändras; annars återanvänds samma kompisar mellan rundor.
  _buildFriends(ctx, sizeKeys) {
    if (this._friends) {
      for (const f of this._friends) {
        this._killFriendTweens(f)
        if (!f.destroyed) f.destroy({ children: true })
      }
    }
    this._friends = []

    const friends = sizeKeys.map((k) => this._makeFriend(k))
    const n = friends.length
    const left = 330
    const right = 950
    const groundY = ctx.height - 66 // kompisens fötter vilar på gräset

    friends.forEach((f, i) => {
      f.x = n === 1 ? ctx.width / 2 : left + ((right - left) * i) / (n - 1)
      f.y = groundY - f._h / 2
      this._play.addChild(f)
      this._friends.push(f)
      f.scale.set(0)
      bounceIn(f, { duration: 0.42, delay: 0.05 * i })
      this._startFriendLife(f) // blink + andning -> känns levande
    })
  },

  // En gullig mottagar-KOMPIS i exakt sin storlek (stor kompis = stor kropp): mjuk
  // markskugga, rund kropp med ljus kant, öron, blinkande ögon, en mun som öppnas
  // och "sväljer", en GENOMSKINLIG figur på magen som önske-ledtråd (ingen läsning
  // krävs), en textetikett + en prickrad ovanför huvudet som räknar upp vad den fått.
  _makeFriend(key) {
    const s = SIZES[key]
    const w = s.bw
    const h = s.bh
    const c = new Container()
    c._size = key
    c._w = w
    c._h = h

    const shadow = new Graphics().ellipse(0, h / 2 + 12, w * 0.48, 18).fill({ color: 0x000000, alpha: 0.15 })

    // Kropps-container (allt som ska "svälja"/skvätta) — skala animeras vid mottag.
    const body = new Container()

    const ears = new Graphics()
      .circle(-w * 0.3, -h * 0.42, w * 0.13)
      .fill(s.color)
      .circle(w * 0.3, -h * 0.42, w * 0.13)
      .fill(s.color)
    const shell = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.44)
      .fill(s.color)
      .stroke({ width: 6, color: 0xffffff, alpha: 0.5 })
    const belly = new Graphics().ellipse(0, h * 0.22, w * 0.34, h * 0.28).fill({ color: 0xffffff, alpha: 0.2 })

    const eyes = []
    for (const sx of [-1, 1]) {
      const eye = new Container()
      eye.position.set(sx * w * 0.19, -h * 0.16)
      const white = new Graphics().circle(0, 0, w * 0.12).fill(0xffffff)
      const pupil = new Graphics().circle(sx * w * 0.02, w * 0.03, w * 0.055).fill(0x333333)
      eye.addChild(white, pupil)
      eyes.push(eye)
    }

    const mouth = new Graphics().ellipse(0, 0, w * 0.14, h * 0.05).fill({ color: 0x3a2a2a, alpha: 0.55 })
    mouth.position.set(0, h * 0.02) // öppnas via scale.y

    // Önske-ledtråd: genomskinlig figur i exakt den storlek kompisen vill ha.
    // Behållare för den RITADE önske-figuren (var en Text vars .text byttes).
    const ghost = new Container()
    ghost._size = s.font * 0.5
    ghost.position.set(0, h * 0.3)
    ghost.alpha = 0.5

    body.addChild(ears, shell, belly, ...eyes, mouth, ghost)

    const label = new Text({
      text: s.label,
      style: { fontFamily: FONT.title, fontSize: key === 'liten' ? 22 : key === 'mellan' ? 26 : 32, fontWeight: '700', fill: COLORS.white },
    })
    label.anchor.set(0.5)
    label.position.set(0, h / 2 + 20)

    // Prickrad ovanför huvudet — räknar upp vad kompisen fått denna runda.
    const dots = new Container()
    dots.position.set(0, -h / 2 - 24)

    c.addChild(shadow, body, label, dots)
    c._body = body
    c._mouth = mouth
    c._eyes = eyes
    c._ghost = ghost
    c._dots = dots
    c._dotR = Math.max(6, w * 0.045)
    c._filled = 0
    return c
  },

  // Levande kompis: långsam andning på önske-figuren + slumpvisa blinkningar.
  _startFriendLife(friend) {
    friend._ghostBreathe = breathe(friend._ghost, { scale: 1.06, duration: 1.8 })
    this._scheduleBlink(friend)
  },

  _scheduleBlink(friend) {
    if (!this._alive || friend.destroyed) return
    friend._blinkCall = gsap.delayedCall(1.5 + Math.random() * 3.5, () => {
      if (!this._alive || friend.destroyed) return
      for (const eye of friend._eyes) {
        if (eye.destroyed) continue
        gsap.killTweensOf(eye.scale)
        gsap.timeline().to(eye.scale, { y: 0.12, duration: 0.07 }).to(eye.scale, { y: 1, duration: 0.09 })
      }
      this._scheduleBlink(friend)
    })
  },

  // Storleksbunden reaktion när rätt storlek når rätt kompis: ton (bom/tink),
  // munnen öppnas, kroppen skvätter proportionellt (stor = tung, liten = lätt),
  // glada ögon och en proportionell skärmskak.
  _reactReceive(ctx, friend, key) {
    const s = SIZES[key]
    ctx.services.audio.tone(s.tone)

    if (!friend.destroyed) {
      gsap.killTweensOf(friend._mouth.scale)
      gsap.timeline().to(friend._mouth.scale, { y: 2, duration: 0.12, ease: 'power2.out' }).to(friend._mouth.scale, { y: 1, duration: 0.24, ease: 'power2.inOut' }, '+=0.05')

      gsap.killTweensOf(friend._body.scale)
      gsap.timeline().to(friend._body.scale, { x: s.stretchX, y: s.squashY, duration: 0.12, ease: 'power2.out' }).to(friend._body.scale, { x: 1, y: 1, duration: 0.42, ease: 'back.out(2.2)' })

      for (const eye of friend._eyes) {
        if (eye.destroyed) continue
        gsap.killTweensOf(eye.scale)
        gsap.timeline().to(eye.scale, { y: 0.35, duration: 0.12 }).to(eye.scale, { y: 1, duration: 0.28 }, '+=0.1')
      }
    }
    this._shakePlay(s.shakeAmt, 0.35)
  },

  // Reset + skaka spel-lagret (undviker drift om två släpp överlappar).
  _shakePlay(intensity, duration) {
    if (!this._play || this._play.destroyed) return
    gsap.killTweensOf(this._play)
    this._play.position.set(0, 0)
    shake(this._play, { intensity, duration })
  },

  // --- Runda --------------------------------------------------------------

  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._killHint()
    this._destroyItems()
    this._drag.clear() // tar bort gamla föremål- + mål-lyssnare, dödar deras tweens

    const three = this._level >= 5
    const sizeKeys = three ? ['stor', 'mellan', 'liten'] : ['stor', 'liten']
    const perSize = three
      ? Math.min(3, 1 + Math.floor((this._level - 5) / 2)) // 1..3 per storlek -> 3..9
      : Math.min(3, 1 + Math.floor(this._level / 2)) // 1..3 per storlek -> 2..6
    const mode = three ? 'three' : 'two'
    this._intro = three ? INTRO_THREE : INTRO_TWO

    if (mode !== this._mode || !this._friends) {
      this._buildFriends(ctx, sizeKeys)
      this._mode = mode
    }

    const emoji = randomFrom(EMOJIS)

    // Uppdatera varje kompis önske-figur + prickrad, och re-registrera som drop-mål
    // (clear() tog bort lyssnarna). Generös träffradie efter kompisens storlek.
    for (const friend of this._friends) {
      this._setupFriendRound(friend, emoji, perSize)
      gsap.killTweensOf(friend.scale)
      friend.scale.set(1)
      const key = friend._size
      this._drag.addTarget(friend, (d) => d.size === key, { hitRadius: Math.max(friend._w, friend._h) * 0.62 })
    }

    const sizes = shuffle(sizeKeys.flatMap((k) => Array.from({ length: perSize }, () => k)))
    const count = sizes.length
    const slots = this._gridSlots(count)
    this._remaining = count
    this._itemRecs = []

    sizes.forEach((key, i) => {
      const slot = slots[i]
      const made = this._makeItem(emoji, key)
      made.key = key
      const view = made.container
      view.position.set(slot.x + (Math.random() * 2 - 1) * 20, slot.y + (Math.random() * 2 - 1) * 16)
      this._play.addChild(view)
      bounceIn(view, { delay: i * 0.05, duration: 0.34 })

      // Egna lyft-lyssnare (DragController ger ingen "plocka upp"-hook vid drag):
      // föremålet lyfter, skuggan växer + tonar (känns högre upp). Exit-säkert —
      // tweens dödas i destroy/_destroyItems innan objektet rivs.
      const lift = () => {
        if (!this._alive || view.destroyed) return
        this._killHint()
        this._resetIdle(ctx)
        ctx.services.audio.sfx('pop')
        gsap.killTweensOf(made.body)
        gsap.killTweensOf(made.shadow)
        gsap.killTweensOf(made.shadow.scale)
        gsap.to(made.body, { y: -18, duration: 0.14, ease: 'power2.out' })
        gsap.to(made.shadow, { alpha: 0.1, duration: 0.14 })
        gsap.to(made.shadow.scale, { x: 1.5, y: 1.3, duration: 0.14 })
      }
      const settle = () => {
        if (view.destroyed) return
        gsap.killTweensOf(made.body)
        gsap.killTweensOf(made.shadow)
        gsap.killTweensOf(made.shadow.scale)
        gsap.to(made.body, { y: 0, duration: 0.2, ease: 'back.out(1.6)' })
        gsap.to(made.shadow, { alpha: 0.18, duration: 0.2 })
        gsap.to(made.shadow.scale, { x: 1, y: 1, duration: 0.2 })
      }
      view.on('pointerdown', lift)
      view.on('pointerup', settle)
      view.on('pointerupoutside', settle)
      made._lift = lift
      made._settle = settle
      this._itemRecs.push(made)

      this._drag.addItem(view, { size: key }, {
        onSelect: () => this._resetIdle(ctx),
        onCorrect: (rec, target) => this._onCorrect(ctx, rec, target, made),
        onWrong: (rec, target) => this._onWrong(ctx, rec, target, made),
      })
    })

    this._resetIdle(ctx)
  },

  // Uppdatera kompisens rundspecifika delar: önske-figur + töm/rita prickraden.
  _setupFriendRound(friend, emoji, perSize) {
    for (const ch of friend._ghost.removeChildren()) ch.destroy({ children: true })
    friend._ghost.addChild(drawIcon(emoji, friend._ghost._size))
    friend._filled = 0
    const dots = friend._dots
    for (const ch of dots.children) gsap.killTweensOf(ch.scale)
    for (const ch of dots.removeChildren()) if (!ch.destroyed) ch.destroy()
    const r = friend._dotR
    const gap = r * 2.6
    const start = -((perSize - 1) * gap) / 2
    for (let i = 0; i < perSize; i++) {
      const d = new Graphics().circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.28 }).stroke({ width: 2, color: 0xffffff, alpha: 0.6 })
      d.position.set(start + i * gap, 0)
      dots.addChild(d)
    }
  },

  // Lys upp nästa prick (räknar upp — sjunker aldrig).
  _fillNextDot(friend) {
    if (friend.destroyed) return
    const dots = friend._dots
    const d = dots.children[friend._filled]
    friend._filled = Math.min(friend._filled + 1, dots.children.length)
    if (!d || d.destroyed) return
    const r = friend._dotR
    d.clear().circle(0, 0, r).fill(0xfff3b0).stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
    pop(d)
  },

  // Föremål = bara figuren (emoji) + mjuk markskugga — ingen platta/ruta bakom.
  // Storleken bär hela poängen. En osynlig, generös träffyta (>=96px i diameter)
  // gör att pekningen alltid funkar trots att den synliga konsten kan vara liten.
  _makeItem(emoji, key) {
    const s = SIZES[key]
    const c = new Container()
    const shadow = new Graphics().ellipse(0, s.font * 0.5 + 8, s.font * 0.4, s.font * 0.15).fill({ color: 0x000000, alpha: 0.18 })
    const body = new Container()
    // P0 ASSETS: RITAD figur (var en emoji-Text). Storleken bär hela poängen.
    const e = drawIcon(emoji, s.font)
    body.addChild(e)
    c.addChild(shadow, body)
    // Osynlig träffyta runt figuren (minst 96px diameter -> radie >=48) så även
    // "liten" är lätt att träffa; layout/avstånd är oförändrade.
    c.hitArea = new Circle(0, 0, Math.max(s.plate, 50))
    return { container: c, body, shadow }
  },

  // Rätt kompis: glad röst + storleksbundet ljud/skvätt, prickraden fylls, ring +
  // gnistror, och figuren poppar och krymper ner i kompisen (blir "uppäten").
  _onCorrect(ctx, rec, target, made) {
    if (!this._alive || rec._done) return
    rec._done = true
    const key = target.view._size
    this._reactReceive(ctx, target.view, key) // storleksbunden ton + mun + skvätt + skak
    ctx.services.voice.say(randomFrom(WORDS[key]))
    this._fillNextDot(target.view)
    ripple(ctx.fxLayer, target.view.x, target.view.y - 12, { color: 0xffffff, maxR: 120 })
    sparkle(ctx.fxLayer, rec.view.x, rec.view.y)
    if (Math.random() < 0.4) floatText(ctx.fxLayer, rec.view.x, rec.view.y - 40, randomFrom(HAPPY))

    gsap.killTweensOf(made.body)
    gsap.killTweensOf(made.shadow)
    made.shadow.alpha = 0
    pop(rec.view)
    gsap.to(rec.view.scale, {
      x: 0,
      y: 0,
      duration: 0.3,
      delay: 0.32,
      ease: 'back.in(1.6)',
      onComplete: () => {
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
      },
    })

    this._remaining--
    this._resetIdle(ctx)
    if (this._remaining <= 0) this._finishRound(ctx)
  },

  // Fel kompis: DragController gav redan 'soft' + snäpp hem. Lägg på en vänlig
  // "nej tack"-vingel på kompisen + mjuk ring (aldrig en bestraffning) och då och
  // då en uppmuntrande ledtråd.
  _onWrong(ctx, rec, target, made) {
    if (!this._alive) return
    wiggle(made.body)
    if (!target.view.destroyed) wiggle(target.view._body)
    ripple(ctx.fxLayer, target.view.x, target.view.y - 12, { color: 0xffffff, maxR: 90, alpha: 0.4 })
    this._resetIdle(ctx)
    if (Math.random() < 0.35) ctx.services.voice.say(randomFrom(WRONG))
  },

  // Runda klar: mild skakning + delat firande (stjärna + klistermärke via
  // complete()), sedan en ny, något större runda.
  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle?.kill()
    this._killHint()
    this._rounds++
    this._level++
    ctx.progress.setCustom('rounds', this._rounds)
    ctx.progress.setLevel(this._level)
    this._shakePlay(6, 0.4)
    ctx.progress.complete() // celebrate + beröm + konfetti + stjärna + klistermärke
    this._next = gsap.delayedCall(1.5, () => {
      if (!this._alive) return
      this._newRound(ctx)
    })
  },

  // --- Hjälp/idle ---------------------------------------------------------

  // Rutnät i spawn-zonen (ovanför kompisarna), blandat så placeringen känns ny.
  _gridSlots(count) {
    const x0 = 250
    const x1 = 1030
    const y0 = 140
    const y1 = 320
    const cols = count <= 3 ? count : count <= 6 ? 3 : Math.ceil(count / 3)
    const rows = Math.ceil(count / cols)
    const slots = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = cols > 1 ? x0 + ((x1 - x0) * c) / (cols - 1) : (x0 + x1) / 2
        const y = rows > 1 ? y0 + ((y1 - y0) * r) / (rows - 1) : (y0 + y1) / 2
        slots.push({ x, y })
      }
    }
    return shuffle(slots).slice(0, count)
  },

  // Idle-recue: upprepar instruktionen efter ~6s tystnad och "andas" på ett
  // kvarvarande föremål som vänlig ledtråd. Nollställs vid varje interaktion.
  _resetIdle(ctx) {
    if (!this._alive) return
    this._idle?.kill()
    this._idle = gsap.delayedCall(6, () => {
      if (!this._alive || this._resolving) return
      ctx.services.voice.say(this._intro)
      this._hintRandom()
      this._resetIdle(ctx)
    })
  },

  _hintRandom() {
    this._killHint()
    const live = this._itemRecs.filter((m) => !m.container.destroyed)
    if (!live.length) return
    const m = randomFrom(live)
    this._hintRec = m
    this._hint = breathe(m.body, { scale: 1.12, duration: 0.7 })
  },

  _killHint() {
    this._hint?.kill()
    this._hint = null
    if (this._hintRec && !this._hintRec.container.destroyed) {
      gsap.killTweensOf(this._hintRec.body.scale)
      this._hintRec.body.scale.set(1, 1)
    }
    this._hintRec = null
  },

  _destroyItems() {
    if (!this._itemRecs) {
      this._itemRecs = []
      return
    }
    for (const m of this._itemRecs) {
      gsap.killTweensOf(m.body)
      gsap.killTweensOf(m.body.scale)
      gsap.killTweensOf(m.shadow)
      gsap.killTweensOf(m.shadow.scale)
      gsap.killTweensOf(m.container)
      gsap.killTweensOf(m.container.scale)
      if (m.container && !m.container.destroyed) {
        if (m._lift) m.container.off('pointerdown', m._lift)
        if (m._settle) {
          m.container.off('pointerup', m._settle)
          m.container.off('pointerupoutside', m._settle)
        }
        m.container.destroy({ children: true })
      }
    }
    this._itemRecs = []
  },

  // Döda alla tweens/schemata på en kompis (blink, andning, mun, ögon, kropp, prickar).
  _killFriendTweens(friend) {
    if (!friend) return
    friend._blinkCall?.kill()
    friend._ghostBreathe?.kill()
    gsap.killTweensOf(friend)
    gsap.killTweensOf(friend.scale)
    if (friend._body) {
      gsap.killTweensOf(friend._body)
      gsap.killTweensOf(friend._body.scale)
    }
    if (friend._mouth) gsap.killTweensOf(friend._mouth.scale)
    if (friend._ghost) gsap.killTweensOf(friend._ghost.scale)
    if (friend._eyes) for (const eye of friend._eyes) gsap.killTweensOf(eye.scale)
    if (friend._dots) for (const ch of friend._dots.children) gsap.killTweensOf(ch.scale)
  },

  destroy(ctx) {
    this._alive = false
    this._idle?.kill()
    this._next?.kill()
    this._hint?.kill()
    // DragController river sina lyssnare och dödar föremåls-view-tweens.
    this._drag?.destroy()
    // Egna sub-objekt-tweens (kropp/skugga/skala) som DragController inte känner till.
    if (this._itemRecs) {
      for (const m of this._itemRecs) {
        gsap.killTweensOf(m.body)
        gsap.killTweensOf(m.body.scale)
        gsap.killTweensOf(m.shadow)
        gsap.killTweensOf(m.shadow.scale)
        gsap.killTweensOf(m.container)
        gsap.killTweensOf(m.container.scale)
      }
    }
    if (this._friends) {
      for (const f of this._friends) this._killFriendTweens(f)
    }
    gsap.killTweensOf(this._play)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
