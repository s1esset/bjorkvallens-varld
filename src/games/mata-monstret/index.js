// Mata Monstret — dra och släpp (2–5 år). Ett stort, gosigt monster sitter mitt
// på en solig äng och GÄSPAR av hunger. Dra den glänsande maten upp mot munnen:
// ögonen följer maten, munnen GAPAR när maten närmar sig, och vid ett lyckat mål
// stänger käken med ett saftigt TUGG, magen skvalpar, gnistror yr och monstret
// ropar "Mums!". Missar studsar mjukt tillbaka (ALDRIG en bestraffning) — det
// finns bara ETT mål (munnen) som tar emot ALLT, så inget felsteg är möjligt.
//
// DJUP (anti-upprepning): monstret byter SKEPNAD varje runda (färg, form, horn/
// öron, namn + personlighet) och fler/mer varierade maträtter (frukt, grönsaker,
// godis) ju högre nivå (ctx.progress.highestLevel). Från nivå 2 får monstret en
// mild FAVORIT ("extra sugen på frukt!") som ger extra jubel — men VILKEN mat som
// helst äts alltid glatt upp (strikt no-fail). När alla tallrikar är tomma firar
// vi via ctx.progress.complete() (ljud/beröm/konfetti/stjärna/klistermärke) och en
// ny, något större runda startar. Allt ritas programmatiskt (Pixi Graphics + emoji).
//
// Återanvänder den delade DragController (stor träffyta, snäpp, snäpp-tillbaka,
// tap-tap-fallback) och de exit-säkra feedback-hjälparna.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, puff, sparkle, ripple, shake, burst, breathe, floatText } from '../../lib/feedback.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

// --- layout (designkoordinater) -----------------------------------------------
const CX = 640
const MY = 300 // monstrets mitt
const EYE_Y = -96 // ögonlinjen relativt monstermitt
const EYE_DX = 72
const MOUTH_DY = 44 // munnens mitt relativt monstermitt -> värld-y 344
const MOUTHY = MY + MOUTH_DY
const BELLY_Y = 132
const FOOT_Y = 188
const FOOT_X = 100
const TABLE_Y = 602 // tallrikarnas y (vilar på bordet)
const EAT_R = 150 // snäpp/ät-radie runt munnen
const ANTIC_R = 300 // munnen börjar gapa när maten är så här nära
const MOUTH_CLOSED = 0.42 // viloläge: ett litet glatt grin
const MOUTH_OPEN = 1.0 // fullt gap

// Maträtter med kategori (driver favorit-läget). Stor, varierad meny -> färska rundor.
const FRUIT = ['🍎', '🍌', '🍓', '🍇', '🍒', '🍐', '🍊', '🍉', '🍑', '🥝', '🍈', '🫐']
const VEG = ['🥕', '🥦', '🌽', '🥬', '🍅', '🫑', '🍆', '🥒']
const TREAT = ['🍬', '🍪', '🧁', '🍩', '🍫', '🍭', '🍰', '🥧']
const FOODS = [
  ...FRUIT.map((e) => ({ e, cat: 'frukt' })),
  ...VEG.map((e) => ({ e, cat: 'gronsaker' })),
  ...TREAT.map((e) => ({ e, cat: 'godis' })),
]

const YUM_EMOJI = ['😋', '😻', '💛', '🤤', '⭐', '✨']

// Glada tuggljud (vi har bara procedurella sfx) — 'match' blir vårt "krasch/mums".
const MUMS = ['Mums!', 'Nam nam!', 'Så gott!', 'Åh vad gott!', 'Mums filibabba!']
const FULL = ['Mätt och belåten! Tack för maten!', 'Åh vad gott det var! Hela magen är full!', 'Nu är monstret pickemätt! Tack!']
const IDLE_CUES = ['Dra maten upp till munnen!', 'Mata det hungriga monstret!']

// Favorit-läget (nivå 2+): mild önskan, men ALL mat äts ändå glatt upp.
const PREF_INTRO = {
  frukt: 'Idag är monstret extra sugen på frukt!',
  gronsaker: 'Idag vill monstret gärna ha grönsaker!',
  godis: 'Idag är monstret sugen på något sött!',
}
const PREF_PRAISE = {
  frukt: ['Mmm, frukt! Så nyttigt!', 'Härlig frukt! Mums!'],
  gronsaker: ['Goda grönsaker! Nyttigt!', 'Knapriga grönsaker, mums!'],
  godis: ['Åh, något sött! Jättegott!', 'Så sött och gott!'],
}

// Monster-skepnader: varje runda en ny för variation (färg, form, öron, namn).
const MONSTERS = [
  {
    key: 'gnaffsa', name: 'Gnaffsa', ear: 'horn',
    colors: [COLORS.green, COLORS.teal, 0x6bbf8a],
    body: { w: 384, h: 366, r: 118 },
    intro: 'Här är Gnaffsa! Hon är jättehungrig.',
  },
  {
    key: 'bubbel', name: 'Bubbel', ear: 'antenn',
    colors: [COLORS.blue, COLORS.teal, COLORS.purple],
    body: { w: 372, h: 372, r: 150 },
    intro: 'Det här är Bubbel! Han vill ha mat.',
  },
  {
    key: 'lurvas', name: 'Lurvas', ear: 'oron',
    colors: [COLORS.purple, COLORS.pink, 0xb39ddb],
    body: { w: 356, h: 380, r: 110 },
    intro: 'Säg hej till Lurvas! Vilken hunger.',
  },
  {
    key: 'sotis', name: 'Sötis', ear: 'horn',
    colors: [COLORS.orange, COLORS.red, COLORS.pink],
    body: { w: 392, h: 352, r: 100 },
    intro: 'Här kommer Sötis! Magen kurrar.',
  },
]

export default {
  id: 'mata-monstret',
  titleSv: 'Mata Monstret',
  icon: '🍬',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'mata-monstret',
  voiceIntro: 'Mata monstret! Dra den goda maten upp till munnen.',

  init(ctx) {
    this._alive = true
    this.services = ctx.services
    this._fed = ctx.progress.get().custom?.matningar || 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._idle = 0
    this._resolving = false
    this._chomping = false
    this._parts = {}
    this._foods = []
    this._monsterIdx = Math.floor(Math.random() * MONSTERS.length)
    this._lastColor = null
    this._prefCat = null

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk, inbjudande äng-scen (sol, moln, kullar) — dekorativ, FÖRSTA barnet.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Ett gosigt "bord" där tallrikarna står.
    const table = new Graphics()
    table.roundRect(-60, TABLE_Y - 6, ctx.width + 120, 220, 70).fill(0xe7c79a)
    table.roundRect(-60, TABLE_Y - 6, ctx.width + 120, 16, 70).fill({ color: 0xfff0d6, alpha: 0.6 })
    table.eventMode = 'none'
    this._root.addChild(table)

    // Genomskinlig tap-fångare: tomt tryck -> lekfullt litet ljud (aldrig negativt).
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', () => this._emptyTap())
    this._root.addChild(tap)

    // Spel-lager (monster + mat + munzon) — separat så vi kan skaka det milt vid
    // firande utan att hela bakgrunden guppar.
    this._play = new Container()
    this._root.addChild(this._play)

    // Mjuk skugga under monstret (skalas vid skutt).
    this._shadow = new Graphics().ellipse(0, 0, 176, 38).fill({ color: COLORS.shadow, alpha: 0.16 })
    this._shadow.position.set(CX, MY + 200)
    this._shadow.eventMode = 'none'
    this._play.addChild(this._shadow)

    // Persistent monster-rot (skuttar som helhet); skepnaden inuti byts per runda.
    this._monster = new Container()
    this._monster.position.set(CX, MY)
    this._monster.eventMode = 'none'
    this._monster.interactiveChildren = false
    this._play.addChild(this._monster)

    // Osynlig, generös munzon (drag-mål + tap-tap-mål) på munnens världsposition.
    this._mouthHit = new Container()
    this._mouthHit.position.set(CX, MOUTHY)
    this._mouthHit.hitArea = new Circle(0, 0, EAT_R)
    this._play.addChild(this._mouthHit)

    // Ett enda mål: munnen. Tar emot ALLT -> inget felsteg är möjligt.
    this._drag = new DragController({ space: this._play, services: ctx.services })

    this._newRound(ctx, true)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- runda -------------------------------------------------------------

  _newRound(ctx, first) {
    if (!this._alive) return
    this._resolving = false
    this._idle = 0
    this._killHint()
    this._destroyFoods()
    this._drag.clear() // tar bort gamla mat- + mål-lyssnare, dödar deras tweens

    // Återställ monstrets transform (om vi avbröt mitt i ett skutt).
    gsap.killTweensOf(this._monster)
    gsap.killTweensOf(this._monster.scale)
    this._monster.y = MY
    this._monster.scale.set(1)
    if (this._shadow && !this._shadow.destroyed) {
      gsap.killTweensOf(this._shadow.scale)
      this._shadow.scale.set(1)
    }

    // Ny skepnad denna runda.
    this._buildMonster()
    this._mouthHit.eventMode = 'static'
    this._drag.addTarget(this._mouthHit, () => true, { hitRadius: EAT_R })

    // Hur mycket + favorit (djup som växer med nivån).
    const count = Math.min(6, 3 + this._level)
    const picks = shuffle(FOODS).slice(0, count)
    this._left = count

    this._prefCat = null
    if (this._level >= 2) {
      const cats = [...new Set(picks.map((p) => p.cat))]
      if (cats.length >= 2) this._prefCat = randomFrom(cats)
    }

    const slots = this._slots(count)
    picks.forEach((food, i) => {
      const made = this._makeFood(food.e)
      const view = made.container
      view.position.set(slots[i].x, slots[i].y)
      this._play.addChild(view)
      this._foods.push(made)
      bounceIn(view, { delay: i * 0.07 })

      // Lyft/lägg-ned-lyssnare (DragController saknar "plocka upp"-hook): maten lyfts
      // och skuggan VÄXER + tonar (känns högre upp). Exit-säkert — tweens dödas i
      // _destroyFoods/destroy innan objektet rivs.
      const lift = () => {
        if (!this._alive || view.destroyed) return
        this._killHint()
        this._idle = 0
        gsap.killTweensOf(made.body)
        gsap.killTweensOf(made.shadow)
        gsap.killTweensOf(made.shadow.scale)
        gsap.to(made.body, { y: -22, duration: 0.14, ease: 'power2.out' })
        gsap.to(made.shadow, { alpha: 0.1, duration: 0.14 })
        gsap.to(made.shadow.scale, { x: 1.55, y: 1.35, duration: 0.14 })
      }
      const settle = () => {
        if (view.destroyed) return
        // Skugga tillbaka (om maten inte just åts).
        if (!made._eaten) {
          gsap.killTweensOf(made.body)
          gsap.killTweensOf(made.shadow)
          gsap.killTweensOf(made.shadow.scale)
          gsap.to(made.body, { y: 0, duration: 0.2, ease: 'back.out(1.6)' })
          gsap.to(made.shadow, { alpha: 0.2, duration: 0.2 })
          gsap.to(made.shadow.scale, { x: 1, y: 1, duration: 0.2 })
        }
        // Mjuk miss-reaktion: bara om maten DROGS och hamnade utanför munnen (den
        // snäpper redan hem via DragController). Aldrig en bestraffning.
        const rec = made.rec
        if (rec && rec.dragging && !made._eaten) {
          const d = Math.hypot(view.x - CX, view.y - MOUTHY)
          if (d > EAT_R) {
            ctx.services.audio.sfx('soft')
            wiggle(made.body)
            ripple(ctx.fxLayer, view.x, view.y, { color: 0xffffff, maxR: 80, alpha: 0.4 })
          }
        }
      }
      view.on('pointerdown', lift)
      view.on('pointerup', settle)
      view.on('pointerupoutside', settle)
      made._lift = lift
      made._settle = settle

      made.rec = this._drag.addItem(view, { cat: food.cat, made }, {
        onSelect: () => {
          this._idle = 0
          this._killHint()
        },
        onWrong: () => {
          // Inträffar i praktiken aldrig (munnen tar emot allt) men vara säker:
          if (this._alive) wiggle(made.body)
        },
        onCorrect: (rec) => this._onEat(ctx, rec),
      })
    })

    // Röst: första rundan säger mount() introt; därefter monstrets egen replik + ev. favorit.
    if (!first) {
      const mon = MONSTERS[this._monsterIdx]
      const pref = this._prefCat ? ' ' + PREF_INTRO[this._prefCat] : ''
      ctx.services.voice.say(mon.intro + pref)
    }
  },

  _slots(n) {
    const left = 200
    const right = 1080
    const out = []
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? CX : left + ((right - left) * i) / (n - 1)
      out.push({ x: x + (Math.random() * 2 - 1) * 10, y: TABLE_Y + (Math.random() * 2 - 1) * 8 })
    }
    return out
  },

  // Glänsande, gullig matbricka: mjuk skugga + vit tallrik med gloss-dager + emoji.
  _makeFood(emoji) {
    const c = new Container()
    const shadow = new Graphics().ellipse(0, 74, 50, 17).fill({ color: COLORS.shadow, alpha: 0.2 })
    const body = new Container()
    const plate = new Graphics()
      .circle(0, 0, 70)
      .fill({ color: 0xffffff, alpha: 0.94 })
      .stroke({ width: 4, color: 0xeadfca })
    const gloss = new Graphics()
      .ellipse(-22, -28, 30, 18)
      .fill({ color: 0xffffff, alpha: 0.55 })
    const e = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 88 } })
    e.anchor.set(0.5)
    body.addChild(plate, e, gloss)
    c.addChild(shadow, body)
    return { container: c, body, shadow }
  },

  // ---- monster-bygge -----------------------------------------------------

  _buildMonster() {
    const mon = MONSTERS[this._monsterIdx]
    const pool = mon.colors.filter((c) => c !== this._lastColor)
    const color = randomFrom(pool.length ? pool : mon.colors)
    this._lastColor = color
    const dark = darken(color)
    const light = lighten(color)

    const char = new Container()
    char.eventMode = 'none'
    this._char = char
    this._monster.addChild(char)
    const p = this._parts = {}

    const bw = mon.body.w
    const bh = mon.body.h
    const br = mon.body.r

    // Fötter (bakom kroppen, kikar fram).
    p.feet = this._g(0, 0)
    for (const fx of [-FOOT_X, FOOT_X]) p.feet.ellipse(fx, FOOT_Y, 60, 36).fill(color).stroke({ width: 8, color: dark })
    char.addChild(p.feet)

    // Öron/horn (bakom kroppen).
    this._drawEars(char, mon, color, dark, light)

    // Kropp (andas mjukt) + armar.
    p.body = this._g(0, 0)
    p.body
      .roundRect(-bw / 2 - 34, -40, 44, 150, 22).fill(color).stroke({ width: 8, color: dark }) // vänster arm
      .roundRect(bw / 2 - 10, -40, 44, 150, 22).fill(color).stroke({ width: 8, color: dark }) // höger arm
      .roundRect(-bw / 2, -bh / 2, bw, bh, br).fill(color).stroke({ width: 8, color: dark })
    char.addChild(p.body)

    // Mage (skvalpar vid tugg) — ljusare oval i nedre kroppen.
    p.belly = this._g(0, BELLY_Y)
    p.belly.ellipse(0, 0, 116, 92).fill({ color: light, alpha: 0.9 })
    char.addChild(p.belly)

    // Mun (synlig målzon). Ritad centrerad; scale.y = käke som gapar/tuggar.
    p.mouth = this._g(0, MOUTH_DY)
    this._drawMouth(p.mouth)
    p.mouth.scale.set(1, MOUTH_CLOSED)
    char.addChild(p.mouth)

    // Ögon (stora, följer maten, blinkar) — högst upp.
    const eL = this._makeEye(-EYE_DX, EYE_Y)
    const eR = this._makeEye(EYE_DX, EYE_Y)
    p.eyeL = eL.eye
    p.eyeR = eR.eye
    p.pupilL = eL.pupil
    p.pupilR = eR.pupil
    char.addChild(p.eyeL, p.eyeR)

    // Rosa kinder för gullighet.
    p.cheeks = this._g(0, 0)
    for (const cx of [-EYE_DX - 26, EYE_DX + 26]) p.cheeks.circle(cx, EYE_Y + 44, 24).fill({ color: 0xff9ec4, alpha: 0.85 })
    char.addChild(p.cheeks)

    // Mjuk idle-andning på kroppen (wobblig kropp) + blink-schema.
    this._bodyBreathe = breathe(p.body, { scale: 1.03, duration: 2.1 })
    this._scheduleBlink()

    pop(this._monster) // liten "fräsch start"-studs
  },

  _drawEars(char, mon, color, dark, light) {
    const p = this._parts
    p.earL = this._g(-118, -150)
    p.earR = this._g(118, -150)
    const paint = (g) => {
      if (mon.ear === 'horn') {
        g.poly([-22, 30, 22, 30, 0, -56]).fill(0xffe7a8).stroke({ width: 7, color: darken(0xffe7a8, 0.35) })
      } else if (mon.ear === 'antenn') {
        g.roundRect(-5, -10, 10, 64, 5).fill(dark)
        g.circle(0, -22, 18).fill(light).stroke({ width: 6, color: dark })
      } else {
        // runda öron
        g.circle(0, 0, 40).fill(color).stroke({ width: 8, color: dark })
        g.circle(0, 0, 20).fill({ color: light })
      }
    }
    paint(p.earL)
    paint(p.earR)
    char.addChild(p.earL, p.earR)
  },

  // Stor mun: mörkt gap, tunga, övre + undre tandrad. scale.y öppnar/stänger.
  _drawMouth(g) {
    g.clear()
    g.roundRect(-96, -58, 192, 116, 38).fill(0x6e2530) // gap
    g.roundRect(-54, 14, 108, 46, 24).fill(0xe06b86) // tunga
    for (const tx of [-78, -36, 6, 48, 82]) g.roundRect(tx - 13, -58, 26, 26, 8).fill(0xffffff) // övre tänder
    for (const tx of [-58, -14, 30, 70]) g.roundRect(tx - 12, 36, 24, 22, 7).fill(0xffffff) // undre tänder
  },

  _makeEye(x, y) {
    const eye = new Container()
    eye.position.set(x, y)
    eye.eventMode = 'none'
    const white = new Graphics().circle(0, 0, 40).fill(0xffffff).stroke({ width: 4, color: 0x3a2b22 })
    const pupil = new Container()
    pupil.position.set(0, 2)
    pupil.addChild(new Graphics().circle(0, 0, 18).fill(0x3a2b22))
    pupil.addChild(new Graphics().circle(6, -6, 6).fill(0xffffff)) // glans
    eye.addChild(white, pupil)
    return { eye, pupil }
  },

  _g(x, y) {
    const g = new Graphics()
    g.position.set(x, y)
    g.eventMode = 'none'
    return g
  },

  // ---- äta + reaktioner --------------------------------------------------

  _onEat(ctx, rec) {
    if (!this._alive) return
    const made = rec.data.made
    if (!made || made._eaten) return
    made._eaten = true
    this._idle = 0

    const pref = this._prefCat && rec.data.cat === this._prefCat
    ctx.services.audio.sfx('match') // saftigt "krasch/mums"
    ctx.services.voice.say(pref ? randomFrom(PREF_PRAISE[this._prefCat]) : randomFrom(MUMS))

    // Monstret reagerar med förtjusning.
    this._chomp()
    this._bellyWobble()
    this._happyEyes()
    this._hop(pref ? 30 : 20)

    // Partiklar vid munnen.
    puff(ctx.fxLayer, CX, MOUTHY, { count: 10 })
    sparkle(ctx.fxLayer, CX, MOUTHY - 8, { count: pref ? 9 : 6 })
    ripple(ctx.fxLayer, CX, MOUTHY, { color: 0xffffff, maxR: 120 })
    if (pref) {
      ctx.services.audio.sfx('pling')
      burst(ctx.fxLayer, CX, MOUTHY - 10, { count: 14, power: 1.1 })
    }
    if (pref || Math.random() < 0.5) floatText(ctx.fxLayer, CX, MOUTHY - 70, randomFrom(YUM_EMOJI), { fontSize: 56 })

    // Maten krymper och försvinner ner i munnen (exit-säkert: guarda destroy).
    const view = rec.view
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    gsap.killTweensOf(made.body)
    gsap.killTweensOf(made.shadow)
    made.shadow.alpha = 0
    gsap.to(view.scale, { x: 0, y: 0, duration: 0.24, ease: 'back.in(1.5)' })
    gsap.to(view, {
      alpha: 0,
      duration: 0.24,
      onComplete: () => {
        if (!view.destroyed) view.destroy({ children: true })
      },
    })

    this._fed++
    ctx.progress.setCustom('matningar', this._fed)

    if (--this._left <= 0) this._finishRound(ctx)
  },

  // Glad tugg: käken stänger/öppnar i två tag (chomp), styrt utanför ticker-lerpen.
  _chomp() {
    const m = this._parts.mouth
    if (!m || m.destroyed) return
    this._chomping = true
    gsap.killTweensOf(m.scale)
    gsap.timeline({
      onComplete: () => {
        this._chomping = false
      },
    })
      .to(m.scale, { y: 0.16, duration: 0.09, ease: 'power2.in' })
      .to(m.scale, { y: 0.95, duration: 0.12, ease: 'back.out(2)' })
      .to(m.scale, { y: 0.3, duration: 0.08 })
      .to(m.scale, { y: MOUTH_CLOSED, duration: 0.16, ease: 'back.out(2)' })
  },

  _bellyWobble() {
    const b = this._parts.belly
    if (!b || b.destroyed) return
    gsap.killTweensOf(b.scale)
    gsap.timeline()
      .to(b.scale, { y: 1.2, x: 0.9, duration: 0.12 })
      .to(b.scale, { y: 1, x: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
  },

  _happyEyes() {
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (!eyes.length) return
    gsap.killTweensOf(eyes)
    gsap.to(eyes, { y: 0.35, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  },

  _hop(dip = 20) {
    const mn = this._monster
    gsap.killTweensOf(mn, 'y')
    gsap.to(mn, {
      y: MY - dip,
      duration: 0.14,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (!mn.destroyed) mn.y = MY
      },
    })
    const sh = this._shadow
    if (sh && !sh.destroyed) {
      gsap.killTweensOf(sh.scale)
      gsap.to(sh.scale, {
        x: 0.82, y: 0.82, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out',
        onComplete: () => {
          if (!sh.destroyed) sh.scale.set(1)
        },
      })
    }
  },

  // ---- liv & ticker ------------------------------------------------------

  _scheduleBlink() {
    this._blinkTimer?.kill()
    this._blinkTimer = gsap.delayedCall(2 + Math.random() * 3.5, () => {
      if (!this._alive) return
      if (!this._resolving && !this._chomping) this._blink()
      this._scheduleBlink()
    })
  },

  _blink() {
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (!eyes.length) return
    gsap.to(eyes, { y: 0.1, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  },

  // Vilken mat barnet just nu håller i (drag eller tap-tap-vald)?
  _activeFood() {
    const d = this._drag
    if (!d) return null
    const a = d.active && !d.active.placed ? d.active.view : null
    const s = !a && d.selected && !d.selected.placed ? d.selected.view : null
    const v = a || s
    return v && !v.destroyed ? v : null
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const food = this._activeFood()
    this._gaze(food)
    this._mouthFollow(food)

    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_CUES))
      this._hintRandom()
      pop(this._monster)
    }
  },

  // Pupillerna glider mjukt mot maten (eller framåt i vila).
  _gaze(food) {
    const pL = this._parts.pupilL
    const pR = this._parts.pupilR
    if (!pL || pL.destroyed || !pR || pR.destroyed) return
    let tx = 0
    let ty = 2
    if (food) {
      const dx = food.x - CX
      const dy = food.y - (MY + EYE_Y)
      const d = Math.hypot(dx, dy) || 1
      const max = 13
      tx = (dx / d) * max
      ty = 2 + (dy / d) * max * 0.7
    }
    pL.x += (tx - pL.x) * 0.2
    pL.y += (ty - pL.y) * 0.2
    pR.x += (tx - pR.x) * 0.2
    pR.y += (ty - pR.y) * 0.2
  },

  // Munnen gapar mjukt när maten närmar sig (om vi inte just tuggar).
  _mouthFollow(food) {
    const m = this._parts.mouth
    if (!m || m.destroyed || this._chomping) return
    let target = MOUTH_CLOSED
    if (food) {
      const dist = Math.hypot(food.x - CX, food.y - MOUTHY)
      const o = Math.max(0, Math.min(1, (ANTIC_R - dist) / (ANTIC_R - EAT_R)))
      target = MOUTH_CLOSED + o * (MOUTH_OPEN - MOUTH_CLOSED)
    }
    m.scale.y += (target - m.scale.y) * 0.25
  },

  // Tomt tryck bredvid maten/monstret: lekfullt litet ljud + vingel. Aldrig "fel".
  _emptyTap() {
    if (!this._alive) return
    this._idle = 0
    this.services.audio.sfx('soft')
    if (this._parts.body) wiggle(this._parts.body)
  },

  _hintRandom() {
    this._killHint()
    const live = this._foods.filter((m) => !m.container.destroyed && !m._eaten)
    if (!live.length) return
    const m = randomFrom(live)
    this._hintRec = m
    this._hint = breathe(m.body, { scale: 1.12, duration: 0.7 })
  },

  _killHint() {
    this._hint?.kill()
    this._hint = null
    if (this._hintRec && !this._hintRec.body.destroyed) {
      gsap.killTweensOf(this._hintRec.body.scale)
      this._hintRec.body.scale.set(1, 1)
    }
    this._hintRec = null
  },

  // Runda klar: monstret jublar (stort tugg + skutt + skakning + skur), delat
  // firande (complete() ger ljud/beröm/KONFETTI/stjärna/klistermärke — vi dubblar
  // inte konfettin här), och en ny, något större runda startar.
  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    this._killHint()

    this._chomp()
    this._bellyWobble()
    this._happyEyes()
    this._hop(40)
    shake(this._play, { intensity: 6, duration: 0.4 })
    burst(ctx.fxLayer, CX, MY + EYE_Y, { count: 18, power: 1.2 })

    ctx.services.voice.say(randomFrom(FULL))
    this._level++
    ctx.progress.setLevel(this._level)
    ctx.progress.complete() // delat firande + stjärna + klistermärke

    this._newRoundCall?.kill()
    this._newRoundCall = gsap.delayedCall(1.6, () => {
      if (!this._alive) return
      this._monsterIdx = (this._monsterIdx + 1) % MONSTERS.length
      this._clearMonster()
      this._newRound(ctx, false)
    })
  },

  // ---- städning ----------------------------------------------------------

  _charObjs() {
    const p = this._parts
    return [p.feet, p.earL, p.earR, p.body, p.belly, p.mouth, p.eyeL, p.eyeR, p.cheeks].filter(Boolean)
  },

  _killTweens(objs) {
    for (const o of objs) {
      if (!o) continue
      gsap.killTweensOf(o)
      if (o.scale) gsap.killTweensOf(o.scale)
    }
  },

  _clearMonster() {
    this._blinkTimer?.kill()
    this._blinkTimer = null
    this._bodyBreathe?.kill()
    this._bodyBreathe = null
    this._killTweens(this._charObjs())
    if (this._char) {
      this._char.destroy({ children: true })
      this._char = null
    }
    this._parts = {}
  },

  _destroyFoods() {
    for (const m of this._foods || []) {
      gsap.killTweensOf(m.container)
      gsap.killTweensOf(m.container.scale)
      gsap.killTweensOf(m.body)
      gsap.killTweensOf(m.shadow)
      gsap.killTweensOf(m.shadow.scale)
      if (m.container && !m.container.destroyed) {
        if (m._lift) m.container.off('pointerdown', m._lift)
        if (m._settle) {
          m.container.off('pointerup', m._settle)
          m.container.off('pointerupoutside', m._settle)
        }
        m.container.destroy({ children: true })
      }
    }
    this._foods = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    this._blinkTimer?.kill()
    this._bodyBreathe?.kill()
    this._newRoundCall?.kill()
    this._hint?.kill()

    // DragController river sina lyssnare och dödar matens view-tweens.
    this._drag?.destroy()

    // Egna sub-objekt-tweens som DragController inte känner till.
    for (const m of this._foods || []) {
      gsap.killTweensOf(m.container)
      gsap.killTweensOf(m.container.scale)
      gsap.killTweensOf(m.body)
      gsap.killTweensOf(m.shadow)
      gsap.killTweensOf(m.shadow.scale)
    }
    this._killTweens(this._charObjs())
    if (this._monster) {
      gsap.killTweensOf(this._monster)
      gsap.killTweensOf(this._monster.scale)
    }
    if (this._shadow) {
      gsap.killTweensOf(this._shadow)
      gsap.killTweensOf(this._shadow.scale)
    }
    gsap.killTweensOf(this._play)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Mörkare/ljusare nyans av en hex-färg (kontur respektive mage/öra-markering).
function darken(hex, amt = 0.22) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
function lighten(hex, amt = 0.5) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}
