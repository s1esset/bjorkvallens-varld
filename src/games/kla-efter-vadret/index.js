// Klä efter Vädret — dra-och-släpp (3–5 år). Uppe visas dagens väder (sol/regn/snö)
// med stor animerad symbol + fallande regn/snö. En glad figur (Bobo) står i mitten.
// Barnet drar (eller tap-tap:ar via DragController) rätt plagg till rätt kroppszon
// (huvud/överkropp/fötter). Passar plagget vädret + zonen → det snäpper fast, figuren
// hoppar till och rösten säger plaggnamnet. Opassande plagg ger en mjuk vänlig vink
// ("Brr, då fryser vi!") och snäpper tillbaka — aldrig en bestraffning. Alla zoner
// fyllda → delat firande + klistermärke, sedan nytt väder. Oändlig omsorgslek.
// Allt ritas programmatiskt (Pixi Graphics + emoji) — inga externa filer.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Kroppszonernas centrum (= snäpp-mål). Huvud-zonen ligger strax ovanför huvudet
// (en hatt sitter på toppen), fot-zonen strax ovanför fötterna.
const ZONES = { huvud: [640, 230], overkropp: [640, 400], fotter: [640, 560] }
const ZONE_NAMES = { huvud: 'huvudet', overkropp: 'kroppen', fotter: 'fötterna' }
// Prioritetsordning när antal obligatoriska zoner växer med nivån.
const ZONE_ORDER = ['overkropp', 'huvud', 'fotter']

// Väderdata. key = ascii-nyckel, namn/intro behåller åäö. good = rätt plagg per zon.
const WEATHERS = {
  sol: {
    key: 'sol', symbol: '☀️', bg: 0xfff3c4, glow: 0xffd35c,
    intro: 'Det är sol idag. Klä på Bobo så hen blir lagom!',
    recue: 'Det är sol och varmt — vad behöver vi då?',
    good: {
      huvud: { emoji: '👒', namn: 'solhatten' },
      overkropp: { emoji: '👕', namn: 'tröjan' },
      fotter: { emoji: '🩴', namn: 'sandalerna' },
    },
  },
  regn: {
    key: 'regn', symbol: '🌧️', bg: 0xcfe3ef, glow: 0x9fc4dd,
    intro: 'Det är regn idag. Klä på Bobo så hen blir lagom!',
    recue: 'Det är regnigt — vad behöver vi då?',
    good: {
      huvud: { emoji: '🧢', namn: 'regnhatten' },
      overkropp: { emoji: '🧥', namn: 'regnjackan' },
      fotter: { emoji: '🥾', namn: 'gummistövlarna' },
    },
  },
  sno: {
    key: 'sno', symbol: '❄️', bg: 0xeaf4fb, glow: 0xbfe6f7,
    intro: 'Det är snö idag. Klä på Bobo så hen blir lagom!',
    recue: 'Det är kallt och snöigt — vad behöver vi då?',
    good: {
      huvud: { emoji: '🧶', namn: 'vintermössan' },
      overkropp: { emoji: '🧥', namn: 'vinterjackan' },
      fotter: { emoji: '👢', namn: 'vinterstövlarna' },
    },
  },
}

// Extra "tydliga säsongs"-plagg som bara används som distraktorer (fel väder).
const EXTRAS = {
  sol: [
    { slot: 'huvud', emoji: '🕶️', namn: 'solglasögonen' },
    { slot: 'overkropp', emoji: '🩳', namn: 'badbyxorna' },
  ],
  regn: [{ slot: 'overkropp', emoji: '🌂', namn: 'paraplyet' }],
  sno: [{ slot: 'overkropp', emoji: '🧣', namn: 'halsduken' }],
}

const SHELF_Y = 600 // plaggens y på hyllan (designkoordinater)

export default {
  id: 'kla-efter-vadret',
  titleSv: 'Klä efter Vädret',
  icon: '☔',
  category: 'pedagogiskt',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'kla-efter-vadret',
  voiceIntro: 'Vi klär på Bobo efter vädret!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._items = []
    this._filled = new Set()
    this._reqZones = []
    this._seq = 0
    this._lastWeather = ctx.progress.get().custom?.lastWeather || null

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._drag = new DragController({ space: this._root, services: ctx.services })

    this._buildBackground(ctx)
    this._buildWeatherFx(ctx)
    this._buildHeader()
    this._buildFigure()
    this._buildShelf()
    this._buildZones()

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._newRound(ctx, { silent: true })

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this._weather.intro)
  },

  // Heltäckande bakgrund (vit, tonas via tint per väder). Fångar tomma tryck mjukt.
  _buildBackground(ctx) {
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(0xffffff)
    bg.tint = 0xffffff
    this._bgColor = { r: 255, g: 255, b: 255 }
    bg.eventMode = 'static'
    bg.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      ctx.services.audio.sfx('soft')
    })
    this._root.addChild(bg)
    this._bg = bg
  },

  // Pooled regn/snö-partiklar (skapas en gång, återvinns i tickern → exit-säkert).
  _buildWeatherFx(ctx) {
    const fx = new Container()
    fx.eventMode = 'none'
    fx.interactiveChildren = false
    this._root.addChild(fx)
    this._activeFx = null

    this._rain = []
    for (let i = 0; i < 26; i++) {
      const d = new Graphics().roundRect(-3, -13, 6, 26, 3).fill({ color: 0x6fb7e0, alpha: 0.8 })
      d.x = Math.random() * ctx.width
      d.y = Math.random() * ctx.height
      d._spd = 6 + Math.random() * 4
      d.visible = false
      fx.addChild(d)
      this._rain.push(d)
    }

    this._snow = []
    for (let i = 0; i < 26; i++) {
      const s = new Graphics().circle(0, 0, 5 + Math.random() * 4).fill({ color: 0xffffff, alpha: 0.92 })
      s._bx = Math.random() * ctx.width
      s.x = s._bx
      s.y = Math.random() * ctx.height
      s._spd = 1.4 + Math.random() * 1.4
      s._amp = 12 + Math.random() * 22
      s._ph = Math.random() * Math.PI * 2
      s.visible = false
      fx.addChild(s)
      this._snow.push(s)
    }
  },

  // Vädersymbol upptill (undviker knapphörnen): mjuk glow + vit panel + stor emoji.
  _buildHeader() {
    const group = new Container()
    group.position.set(640, 96)
    group.eventMode = 'none'
    group.interactiveChildren = false

    const glow = new Graphics().circle(0, 0, 92).fill(0xffffff)
    glow.alpha = 0.55
    glow.tint = COLORS.yellow
    const panel = new Graphics().circle(0, 0, 80).fill({ color: 0xffffff, alpha: 0.5 })
    const symbol = new Text({ text: '☀️', style: { fontFamily: FONT.body, fontSize: 120 } })
    symbol.anchor.set(0.5)

    group.addChild(glow, panel, symbol)
    this._root.addChild(group)
    this._glow = glow
    this._symbol = symbol

    this._glowPulse = gsap.to(glow.scale, { x: 1.12, y: 1.12, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._symPulse = gsap.to(symbol.scale, { x: 1.07, y: 1.07, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Figuren "Bobo" byggd av Pixi Graphics i en container på (0,0) så den kan hoppa.
  _buildFigure() {
    const fig = new Container()
    fig.eventMode = 'none'
    fig.interactiveChildren = false
    this._figure = fig
    this._root.addChild(fig)

    const skin = 0xffe0b2
    const skinDark = 0xe7c193
    const body = COLORS.teal
    const bodyDark = darken(COLORS.teal, 0.2)
    const ink = 0x4a3526

    const feet = new Graphics()
    for (const fx of [-46, 46]) feet.ellipse(640 + fx, 590, 42, 26).fill(skin).stroke({ width: 6, color: skinDark })
    const legs = new Graphics()
    for (const lx of [-46, 10]) legs.roundRect(640 + lx, 498, 36, 96, 16).fill(body)
    const arms = new Graphics()
    for (const ax of [-124, 88]) arms.roundRect(640 + ax, 300, 38, 150, 18).fill(body).stroke({ width: 6, color: bodyDark })
    const torso = new Graphics().roundRect(640 - 90, 290, 180, 220, 40).fill(body).stroke({ width: 8, color: bodyDark })
    const head = new Graphics().circle(640, 250, 70).fill(skin).stroke({ width: 8, color: skinDark })
    const face = new Graphics()
    face.circle(640 - 40, 262, 9).fill({ color: COLORS.pink, alpha: 0.5 })
    face.circle(640 + 40, 262, 9).fill({ color: COLORS.pink, alpha: 0.5 })
    face.circle(640 - 24, 244, 9).fill(ink)
    face.circle(640 + 24, 244, 9).fill(ink)
    // moveTo till bågens startpunkt först, annars drar Pixi v8 en linje från
    // origo (0,0) till munnens början (stray-streck-buggen).
    const mouthA0 = 0.15 * Math.PI
    face.moveTo(640 + 26 * Math.cos(mouthA0), 258 + 26 * Math.sin(mouthA0))
    face.arc(640, 258, 26, mouthA0, 0.85 * Math.PI).stroke({ width: 6, color: ink, cap: 'round' })

    fig.addChild(feet, legs, arms, torso, head, face)
  },

  // Garderobshylla (dekor) längst ner som plaggen ligger på.
  _buildShelf() {
    const shelf = new Graphics().roundRect(140, 620, 1000, 90, 24).fill({ color: 0xffffff, alpha: 0.6 })
    shelf.eventMode = 'none'
    this._root.addChild(shelf)
  },

  // Tre kroppszoner: svag ledtrådsring + osynlig snäpp-/tap-mål-container.
  _buildZones() {
    this._zones = {}
    this._rings = {}
    for (const key of Object.keys(ZONES)) {
      const [zx, zy] = ZONES[key]
      const ring = new Graphics().circle(0, 0, 70).stroke({ width: 6, color: COLORS.white, alpha: 0.9 })
      ring.position.set(zx, zy)
      ring.alpha = 0
      ring.eventMode = 'none'
      this._root.addChild(ring)
      this._rings[key] = ring

      const zone = new Container()
      zone.position.set(zx, zy)
      zone.hitArea = new Circle(0, 0, 130) // generös träffyta för tap-tap (>96px)
      zone.eventMode = 'static'
      zone.cursor = 'pointer'
      this._root.addChild(zone)
      this._zones[key] = zone
    }
  },

  // En plagg-bricka: vit rund cirkel (Ø132 träffyta) + stor emoji.
  _makeItem(emoji) {
    const it = new Container()
    const tray = new Graphics().circle(0, 0, 66).fill({ color: COLORS.white, alpha: 0.85 }).stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 84 } })
    e.anchor.set(0.5)
    it.addChild(tray, e)
    return it
  },

  // Välj väder: sol→regn→snö de tre första rundorna (offset så vi ej upprepar förra
  // sessionens väder), sedan slumpat ≠ förra. Sparas så en ny session ej upprepar.
  _pickWeather(ctx) {
    const order = ['sol', 'regn', 'sno']
    let key
    if (this._seq < 3) {
      let start = 0
      const li = order.indexOf(this._lastWeather)
      if (li >= 0) start = (li + 1) % 3
      key = order[(start + this._seq) % 3]
    } else {
      key = randomFrom(order.filter((k) => k !== this._lastWeather))
    }
    this._seq++
    this._lastWeather = key
    ctx.progress.setCustom('lastWeather', key)
    return key
  },

  // Måla om bakgrund + symbol + partiklar mjukt vid nytt väder.
  _applyWeather(key) {
    const w = WEATHERS[key]
    const to = rgb(w.bg)
    gsap.killTweensOf(this._bgColor)
    gsap.to(this._bgColor, {
      r: to.r, g: to.g, b: to.b, duration: 0.6, ease: 'sine.inOut',
      onUpdate: () => {
        if (this._alive && this._bg && !this._bg.destroyed) {
          const c = this._bgColor
          this._bg.tint = (Math.round(c.r) << 16) | (Math.round(c.g) << 8) | Math.round(c.b)
        }
      },
    })
    this._symbol.text = w.symbol
    this._glow.tint = w.glow
    const rainOn = key === 'regn'
    const snowOn = key === 'sno'
    for (const d of this._rain) d.visible = rainOn
    for (const s of this._snow) s.visible = snowOn
    this._activeFx = rainOn ? 'rain' : snowOn ? 'snow' : null
  },

  // Bygg en runda: nytt väder, obligatoriska zoner + plagg utifrån nivå.
  _newRound(ctx, { silent = false } = {}) {
    if (!this._alive) return
    this._resolving = false
    this._idle = 0
    this._filled = new Set()

    // Rensa förra rundans plagg (clear() avregistrerar lyssnare + dödar tweens först).
    this._drag.clear()
    for (const v of this._items) if (!v.destroyed) v.destroy({ children: true })
    this._items = []
    for (const k of Object.keys(this._rings)) {
      gsap.killTweensOf(this._rings[k])
      this._rings[k].alpha = 0
      this._rings[k].scale.set(1)
    }

    const key = this._pickWeather(ctx)
    this._weather = WEATHERS[key]
    this._applyWeather(key)

    // Svårighet växer mjukt: antal obligatoriska zoner + plagg på hyllan.
    const reqCount = this._level >= 4 ? 3 : this._level >= 2 ? 2 : 1
    const shelfCount = reqCount === 1 ? 3 : reqCount === 2 ? 4 : this._level >= 6 ? 6 : 5
    const reqZones = ZONE_ORDER.slice(0, reqCount)
    this._reqZones = reqZones
    this._needed = reqZones.length
    this._placed = 0

    // Passande plagg (ett per obligatorisk zon) + distraktorer.
    const usedEmoji = new Set()
    const fitting = reqZones.map((slot) => {
      const g = this._weather.good[slot]
      usedEmoji.add(g.emoji)
      return { slot, fits: true, emoji: g.emoji, namn: g.namn, from: key }
    })
    const distractors = distractorPool(key, usedEmoji).slice(0, Math.max(0, shelfCount - reqCount))
    const deck = shuffle([...fitting, ...distractors])

    // Lägg ut på hyllan, jämnt centrerade.
    const n = deck.length
    const total = n * 150 + (n - 1) * 40
    const startX = (1280 - total) / 2 + 75
    deck.forEach((data, i) => {
      const view = this._makeItem(data.emoji)
      view.position.set(startX + i * 190, SHELF_Y)
      this._root.addChild(view)
      this._items.push(view)
      this._drag.addItem(view, data, {
        onSelect: () => { this._idle = 0 },
        onWrong: (rec) => this._onWrong(ctx, rec),
        onCorrect: (rec) => this._onCorrect(ctx, rec),
      })
      bounceIn(view, { delay: 0.05 * i })
    })

    // Registrera snäpp-mål för dagens obligatoriska zoner + visa ledtrådsringar.
    for (const slot of reqZones) {
      this._drag.addTarget(this._zones[slot], (data) => data.slot === slot && data.fits, { hitRadius: 130 })
      this._rings[slot].alpha = 0.32
    }

    if (!silent) ctx.services.voice.say(this._weather.intro)
  },

  // Rätt plagg på rätt zon (DragController har redan snäppt det dit).
  _onCorrect(ctx, rec) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const { slot, namn } = rec.data

    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(randomFrom([`${cap(namn)}!`, `${cap(namn)} sitter!`, 'Så fin!', 'Vad bra!']))

    pop(rec.view)
    const z = this._zones[slot]
    sparkle(ctx.fxLayer, z.x, z.y)

    const ring = this._rings[slot]
    gsap.killTweensOf(ring)
    ring.alpha = 0.95
    gsap.to(ring, { alpha: 0, duration: 0.5, ease: 'sine.out' })

    // Fäst plagget på figuren (flytta in i this._figure) så det bobbar med hoppet.
    rec.view.eventMode = 'none'
    if (this._figure && !this._figure.destroyed && !rec.view.destroyed) this._figure.addChild(rec.view)

    gsap.killTweensOf(this._figure)
    gsap.to(this._figure, { y: -10, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' })

    this._filled.add(slot)
    this._placed += 1
    if (this._placed >= this._needed) this._roundComplete(ctx)
  },

  // Opassande plagg (fel väder eller fel zon): ALDRIG bestraffning — mjuk vink.
  // DragController har redan spelat 'soft' och snäpper plagget tillbaka till hyllan.
  _onWrong(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    wiggle(rec.view)
    const d = rec.data
    const line = d.fits ? `${cap(d.namn)} hör på ${ZONE_NAMES[d.slot]}!` : mismatchHint(this._weather.key, d.from)
    ctx.services.voice.say(line || this._weather.recue)
  },

  // Alla obligatoriska zoner fyllda: figuren hoppar, delat firande (firande-ljud,
  // beröm, konfetti, stjärna, klistermärke via complete()), sedan nytt väder.
  _roundComplete(ctx) {
    this._resolving = true
    this._idle = 0
    this._level += 1
    ctx.progress.setLevel(this._level)

    gsap.killTweensOf(this._figure)
    gsap.to(this._figure, { y: -26, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' })

    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke

    this._celebrate = gsap.delayedCall(1.3, () => {
      if (this._alive) this._newRound(ctx)
    })
  },

  // Tick: animera aktiva väderpartiklar (pooled) + idle-recue efter ~6 s.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaTime
    if (this._activeFx === 'rain') {
      for (const d of this._rain) {
        d.y += d._spd * dt * 1.7
        if (d.y > ctx.height + 20) {
          d.y = -20
          d.x = Math.random() * ctx.width
        }
      }
    } else if (this._activeFx === 'snow') {
      for (const s of this._snow) {
        s._ph += 0.04 * dt
        s.y += s._spd * dt
        s.x = s._bx + Math.sin(s._ph) * s._amp
        if (s.y > ctx.height + 15) {
          s.y = -15
          s._bx = Math.random() * ctx.width
        }
      }
    }

    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say(this._weather.recue)
      for (const slot of this._reqZones) if (!this._filled.has(slot)) pop(this._rings[slot])
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._celebrate?.kill()
    this._drag?.destroy()
    this._symPulse?.kill()
    this._glowPulse?.kill()
    if (this._symbol) gsap.killTweensOf(this._symbol.scale)
    if (this._glow) {
      gsap.killTweensOf(this._glow)
      gsap.killTweensOf(this._glow.scale)
    }
    if (this._bgColor) gsap.killTweensOf(this._bgColor)
    if (this._figure) gsap.killTweensOf(this._figure)
    for (const k of Object.keys(this._rings || {})) {
      gsap.killTweensOf(this._rings[k])
      gsap.killTweensOf(this._rings[k].scale)
    }
    for (const v of this._items || []) {
      if (!v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    }
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}

// Distraktor-pool: passande plagg från de ANDRA vädren + säsongs-extras, alla
// fits:false. Hoppar över emoji som krockar med rundans passande plagg (samma jacka).
function distractorPool(curKey, usedEmoji) {
  const seen = new Set(usedEmoji)
  const pool = []
  for (const okey of Object.keys(WEATHERS)) {
    if (okey === curKey) continue
    const ow = WEATHERS[okey]
    const cands = []
    for (const z of ['huvud', 'overkropp', 'fotter']) {
      cands.push({ slot: z, emoji: ow.good[z].emoji, namn: ow.good[z].namn })
    }
    for (const ex of EXTRAS[okey] || []) cands.push(ex)
    for (const c of cands) {
      if (seen.has(c.emoji)) continue
      seen.add(c.emoji)
      pool.push({ slot: c.slot, fits: false, emoji: c.emoji, namn: c.namn, from: okey })
    }
  }
  return shuffle(pool)
}

// Vänlig (positiv) vink när plagget passar fel väder.
function mismatchHint(cur, from) {
  if (cur === 'sol') return from === 'sno' ? 'Oj, då blir det för varmt!' : 'Det behövs inte när solen skiner!'
  if (cur === 'sno') return 'Brr, då fryser vi!'
  if (cur === 'regn') return 'Det regnar ju — vad behöver vi då?'
  return ''
}

function cap(s = '') {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function rgb(hex) {
  return { r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff }
}

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
