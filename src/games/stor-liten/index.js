// Stor och Liten — dra och släpp (2–5 år). Lär begreppen "stor"/"liten" (och på
// högre nivåer "mellan") genom att sortera samma sorts gulliga föremål efter
// STORLEK i rätt korg. Bygger vidare på den återanvändbara DragController (stor
// träffyta, snäpp, snäpp-tillbaka, tap-tap-fallback för de minsta). Fel = mjuk
// studs tillbaka + vingel (ALDRIG en bestraffning). Oändlig, växande lek: fler
// föremål, ny gullig figur varje runda, och en tredje "mellan"-korg på högre
// nivåer. När rundan är klar firar vi (stjärna + klistermärke) och ny runda startar.
import { Container, Graphics, Text, Circle } from 'pixi.js'
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

// Storleksprofiler: figurens fotavtryck/träffradie + emoji-grad + korgmått + färg
// + etikett. Tydligt åtskilda så skillnaden alltid syns direkt. (Föremålen visas
// utan platta — `plate` är nu bara träffytans radie, ingen ritad bakgrund.)
const SIZES = {
  stor: { plate: 86, font: 120, bw: 322, bh: 240, color: COLORS.blue, label: 'Stor' },
  mellan: { plate: 62, font: 82, bw: 250, bh: 198, color: COLORS.teal, label: 'Mellan' },
  liten: { plate: 44, font: 54, bw: 196, bh: 162, color: COLORS.orange, label: 'Liten' },
}

// Röstvariation per storlek (full svenska, alltid positivt).
const WORDS = {
  stor: ['Stor!', 'En stor!', 'Bra!', 'Precis!'],
  mellan: ['Mellan!', 'Mellanstor!', 'Fint!', 'Bra!'],
  liten: ['Liten!', 'En liten!', 'Toppen!', 'Fint!'],
}
const WRONG = ['Prova en annan korg!', 'Hoppsan, prova en annan korg!']
const HAPPY = ['😄', '🎉', '⭐', '💛', '✨']

const INTRO_TWO = 'Dra de stora sakerna till den stora korgen och de små till den lilla korgen!'
const INTRO_THREE = 'Sortera sakerna i rätt korg: stor, mellan och liten!'

export default {
  id: 'stor-liten',
  titleSv: 'Stor och Liten',
  icon: '📏',
  category: 'pussel',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'stor-liten',
  voiceIntro: INTRO_TWO,

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._mode = null
    this._itemRecs = []
    this._boxes = null
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

    // Spel-lager (korgar + föremål) — separat från bakgrunden så vi kan skaka det
    // milt vid firande utan att hela scenen guppar.
    this._play = new Container()
    this._root.addChild(this._play)

    this._drag = new DragController({ space: this._play, services: ctx.services })
    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this._intro)
    this._resetIdle(ctx)
  },

  // --- Korgar -------------------------------------------------------------

  // Bygg korgarna för aktuellt läge (två eller tre storlekar). Anropas bara när
  // läget ändras; annars återanvänds samma korgar mellan rundor.
  _buildBoxes(ctx, sizeKeys) {
    if (this._boxes) {
      for (const b of this._boxes) {
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
        if (!b.destroyed) b.destroy({ children: true })
      }
    }
    this._boxes = []

    const baskets = sizeKeys.map((k) => this._makeBasket(k))
    const n = baskets.length
    const left = 330
    const right = 950
    const groundY = ctx.height - 66 // korgens botten vilar på gräset

    baskets.forEach((b, i) => {
      b.x = n === 1 ? ctx.width / 2 : left + ((right - left) * i) / (n - 1)
      b.y = groundY - b._h / 2
      this._play.addChild(b)
      this._boxes.push(b)
      b.scale.set(0)
      bounceIn(b, { duration: 0.42, delay: 0.05 * i })
    })
  },

  // En gullig "korg": mjuk skugga, kropp med ljus kant, mörkare öppning, lätt
  // flätmönster, främre kant och en GENOMSKINLIG figur i exakt rätt storlek som
  // ikon-ledtråd (ingen läsning krävs) + liten textetikett som extra stöd.
  _makeBasket(key) {
    const s = SIZES[key]
    const w = s.bw
    const h = s.bh
    const c = new Container()
    c._size = key
    c._w = w
    c._h = h

    const shadow = new Graphics().ellipse(0, h / 2 + 8, w * 0.5, 22).fill({ color: 0x000000, alpha: 0.16 })
    const body = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 28)
      .fill(s.color)
      .stroke({ width: 6, color: 0xffffff, alpha: 0.55 })
    const mouth = new Graphics().roundRect(-w / 2 + 18, -h / 2 + 14, w - 36, h * 0.4, 18).fill({ color: 0x000000, alpha: 0.18 })
    const weave = new Graphics()
    for (let i = 0; i < 3; i++) {
      weave.roundRect(-w / 2 + 16, h * 0.02 + i * (h * 0.16), w - 32, 8, 4).fill({ color: 0xffffff, alpha: 0.1 })
    }
    const lip = new Graphics()
      .roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, 30, 14)
      .fill(shade(s.color, 0.18))
      .stroke({ width: 4, color: 0xffffff, alpha: 0.4 })

    // Ikon-ledtråd: en genomskinlig figur i exakt den storlek korgen tar emot.
    const ghost = new Text({ text: '', style: { fontFamily: FONT.body, fontSize: s.font * 0.7 } })
    ghost.anchor.set(0.5)
    ghost.y = -h / 2 + h * 0.24
    ghost.alpha = 0.34

    const label = new Text({
      text: s.label,
      style: { fontFamily: FONT.title, fontSize: key === 'liten' ? 24 : key === 'mellan' ? 28 : 36, fontWeight: '700', fill: COLORS.white },
    })
    label.anchor.set(0.5)
    label.y = h / 2 - 28

    c.addChild(shadow, body, weave, mouth, lip, ghost, label)
    c._ghost = ghost
    return c
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

    if (mode !== this._mode || !this._boxes) {
      this._buildBoxes(ctx, sizeKeys)
      this._mode = mode
    }

    const emoji = randomFrom(EMOJIS)

    // Uppdatera korgarnas ledtrådsfigur + re-registrera som drop-mål (clear() tog
    // bort lyssnarna). Generös träffradie efter korgens storlek.
    for (const box of this._boxes) {
      box._ghost.text = emoji
      gsap.killTweensOf(box.scale)
      box.scale.set(1)
      const key = box._size
      this._drag.addTarget(box, (d) => d.size === key, { hitRadius: Math.max(box._w, box._h) * 0.62 })
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

  // Föremål = bara figuren (emoji) + mjuk markskugga — ingen platta/ruta bakom.
  // Storleken bär hela poängen. En osynlig, generös träffyta (>=96px i diameter)
  // gör att pekningen alltid funkar trots att den synliga konsten kan vara liten.
  _makeItem(emoji, key) {
    const s = SIZES[key]
    const c = new Container()
    const shadow = new Graphics().ellipse(0, s.font * 0.5 + 8, s.font * 0.4, s.font * 0.15).fill({ color: 0x000000, alpha: 0.18 })
    const body = new Container()
    const e = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: s.font } })
    e.anchor.set(0.5)
    body.addChild(e)
    c.addChild(shadow, body)
    // Osynlig träffyta runt figuren (minst 96px diameter -> radie >=48) så även
    // "liten" är lätt att träffa; layout/avstånd är oförändrade.
    c.hitArea = new Circle(0, 0, Math.max(s.plate, 50))
    return { container: c, body, shadow }
  },

  // Rätt korg: glad röst + ljud, korgen studsar, ring + gnistror, figuren poppar
  // och krymper ner i korgen.
  _onCorrect(ctx, rec, target, made) {
    if (!this._alive || rec._done) return
    rec._done = true
    const key = target.view._size
    ctx.services.audio.sfx(Math.random() < 0.5 ? 'correct' : 'match')
    ctx.services.voice.say(randomFrom(WORDS[key]))
    pop(target.view)
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

  // Fel korg: DragController gav redan 'soft' + snäpp hem. Lägg på vänlig vingel +
  // mjuk ring (aldrig en bestraffning) och då och då en uppmuntrande ledtråd.
  _onWrong(ctx, rec, target, made) {
    if (!this._alive) return
    wiggle(made.body)
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
    shake(this._play, { intensity: 6, duration: 0.4 })
    ctx.progress.complete() // celebrate + beröm + konfetti + stjärna + klistermärke
    this._next = gsap.delayedCall(1.5, () => {
      if (!this._alive) return
      this._newRound(ctx)
    })
  },

  // --- Hjälp/idle ---------------------------------------------------------

  // Rutnät i spawn-zonen (ovanför korgarna), blandat så placeringen känns ny.
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
    if (this._boxes) {
      for (const b of this._boxes) {
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
      }
    }
    gsap.killTweensOf(this._play)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Mörkare nyans av en hex-färg (för korgens främre kant).
function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
