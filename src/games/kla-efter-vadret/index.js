// Klä efter Vädret — dra-och-släpp (3–5 år). Uppe visas dagens väder (sol/regn/snö)
// med stor animerad symbol + fallande regn/snö. En glad figur (Elvira) står i mitten.
// Barnet drar (eller tap-tap:ar via DragController) rätt plagg till rätt kroppszon
// (huvud/överkropp/fötter). Passar plagget vädret + zonen → det snäpper fast, figuren
// hoppar till och rösten säger plaggnamnet. Opassande plagg ger en mjuk vänlig vink
// ("Brr, då fryser vi!") och snäpper tillbaka — aldrig en bestraffning. Alla zoner
// fyllda → delat firande + klistermärke, sedan nytt väder. Oändlig omsorgslek.
// Allt ritas programmatiskt i Pixi Graphics — plagg och vädertecken via drawIcon
// (src/lib/artikoner.js), inga externa filer och ingen emoji som spelobjekt.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, floatText } from '../../lib/feedback.js'
import { drawIcon } from '../../lib/artikoner.js'
import { COLORS } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// Kroppszonernas centrum (= snäpp-mål). Huvud-zonen ligger strax ovanför huvudet
// (en hatt sitter på toppen), fot-zonen strax ovanför fötterna.
const ZONES = { huvud: [640, 230], overkropp: [640, 400], fotter: [640, 560] }
const ZONE_NAMES = { huvud: 'huvudet', overkropp: 'kroppen', fotter: 'fötterna' }
// Prioritetsordning när antal obligatoriska zoner växer med nivån.
const ZONE_ORDER = ['overkropp', 'huvud', 'fotter']

// Väderdata. key = ascii-nyckel, namn/intro/lagom behåller åäö. valid = LISTA av
// dugliga plagg per zon (flera funkar → barnet resonerar i stället för att hitta det
// enda rätta). lagom/proof = "gå ut"-payoffen (kopplar belöningen till lärandet).
const WEATHERS = {
  sol: {
    key: 'sol', symbol: '☀️', bg: 0xfff3c4, glow: 0xffd35c,
    intro: 'Det är sol idag. Klä på Elvira så hon blir lagom!',
    recue: 'Det är sol och varmt — vad behöver vi då?',
    lagom: 'Nu blir jag lagom sval i solen!',
    proof: '😎',
    valid: {
      huvud: [{ art: 'solhatt', namn: 'solhatten' }, { art: 'keps', namn: 'kepsen' }],
      overkropp: [{ art: 'troja', namn: 'tröjan' }, { art: 'klanning', namn: 'klänningen' }],
      fotter: [{ art: 'sandaler', namn: 'sandalerna' }, { art: 'skor', namn: 'skorna' }],
    },
  },
  regn: {
    key: 'regn', symbol: 'regnmoln', bg: 0xcfe3ef, glow: 0x9fc4dd,
    intro: 'Det är regn idag. Klä på Elvira så hon blir lagom!',
    recue: 'Det är regnigt — vad behöver vi då?',
    lagom: 'Nu blir jag lagom torr i regnet!',
    proof: '☂️',
    valid: {
      huvud: [{ art: 'regnhatt', namn: 'regnhatten' }],
      overkropp: [{ art: 'regnjacka', namn: 'regnjackan' }, { art: '☂️', namn: 'paraplyet' }],
      fotter: [{ art: 'gummistovlar', namn: 'gummistövlarna' }, { art: 'stovlar', namn: 'stövlarna' }],
    },
  },
  sno: {
    key: 'sno', symbol: 'snoflinga', bg: 0xeaf4fb, glow: 0xbfe6f7,
    intro: 'Det är snö idag. Klä på Elvira så hon blir lagom!',
    recue: 'Det är kallt och snöigt — vad behöver vi då?',
    lagom: 'Nu blir jag lagom varm i snön!',
    proof: '⛄',
    valid: {
      huvud: [{ art: 'vintermossa', namn: 'vintermössan' }],
      overkropp: [{ art: 'vinterjacka', namn: 'vinterjackan' }],
      fotter: [{ art: 'vinterstovlar', namn: 'vinterstövlarna' }, { art: 'kangor', namn: 'kängorna' }],
    },
  },
}

// Extra "tydliga säsongs"-plagg som bara används som distraktorer (fel väder).
const EXTRAS = {
  sol: [
    { slot: 'huvud', art: 'solglasogon', namn: 'solglasögonen' },
    { slot: 'overkropp', art: 'badbyxor', namn: 'badbyxorna' },
  ],
  regn: [{ slot: 'overkropp', art: '☂️', namn: 'paraplyet' }],
  sno: [{ slot: 'overkropp', art: 'halsduk', namn: 'halsduken' }],
}

// Plaggens y på hyllan (designkoordinater). Låg nog att ligga PÅ hyllplanet
// (626..718) i stället för att sväva ovanför det och krocka med Elviras fötter.
const SHELF_Y = 668
// Mittkolumnen är Elviras — inga plagg får läggas där. Se _layoutShelf.
const SHELF_LEFT_END = 470
const SHELF_RIGHT_START = 810
const SHELF_STEP = 168

export default {
  id: 'kla-efter-vadret',
  titleSv: 'Klä efter Vädret',
  icon: '☔',
  category: 'pedagogiskt',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'kla-efter-vadret',
  voiceIntro: 'Vi klär på Elvira efter vädret!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._items = []
    this._filled = new Set()
    this._reqZones = []
    this._seq = 0
    this._ambT = 1200 // ms till nästa väder-ambient (fågel/regn/vind)
    this._payoff = null
    this._lastWeather = ctx.progress.get().custom?.lastWeather || null

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._drag = new DragController({ space: this._root, services: ctx.services, skugga: true })

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
  // Ritas med bleed åt alla håll så breda telefoner (synlig yta utanför 0..1280)
  // aldrig visar creme-lister — se lib/view.js.
  _buildBackground(ctx) {
    const bg = new Graphics().rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, ctx.height + 2 * BLEED_Y).fill(0xffffff)
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

    // Regn/snö faller över hela den SYNLIGA ytan (ctx.view läses vid användning,
    // aldrig cachad) — på en bred telefon vore torra kolumner i kanterna avslöjande.
    this._rain = []
    for (let i = 0; i < 26; i++) {
      const d = new Graphics().roundRect(-3, -13, 6, 26, 3).fill({ color: 0x6fb7e0, alpha: 0.8 })
      d.x = ctx.view.left + Math.random() * ctx.view.width
      d.y = Math.random() * ctx.height
      d._spd = 6 + Math.random() * 4
      d.visible = false
      fx.addChild(d)
      this._rain.push(d)
    }

    this._snow = []
    for (let i = 0; i < 26; i++) {
      const s = new Graphics().circle(0, 0, 5 + Math.random() * 4).fill({ color: 0xffffff, alpha: 0.92 })
      s._bx = ctx.view.left + Math.random() * ctx.view.width
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

  // Vädersymbol upptill (undviker knapphörnen): mjuk glow + vit panel + stort RITAT
  // vädertecken. Symbolen är hela ledtråden i spelet — den får inte vara en emoji
  // som ritas av systemfonten.
  _buildHeader() {
    const group = new Container()
    group.position.set(640, 96)
    group.eventMode = 'none'
    group.interactiveChildren = false

    const glow = new Graphics().circle(0, 0, 92).fill(0xffffff)
    glow.alpha = 0.55
    glow.tint = COLORS.yellow
    const panel = new Graphics().circle(0, 0, 80).fill({ color: 0xffffff, alpha: 0.5 })
    // Egen behållare: tecknet byts genom att rita om, inte genom att byta .text.
    const symbol = new Container()
    symbol.eventMode = 'none'
    symbol.addChild(drawIcon('☀️', 120))

    group.addChild(glow, panel, symbol)
    this._root.addChild(group)
    this._glow = glow
    this._symbol = symbol

    this._glowPulse = gsap.to(glow.scale, { x: 1.12, y: 1.12, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._symPulse = gsap.to(symbol.scale, { x: 1.07, y: 1.07, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Figuren "Elvira" — en glad tjej med blont hår, byggd av Pixi Graphics i en
  // container på (0,0) så den kan hoppa. Håret (blont) + tofsarna ritas i samma
  // statiska figur (inga egna tweens → städas med figuren, exit-säkert).
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
    const hair = 0xf6cb45 // blont
    const hairDark = darken(hair, 0.22)

    const feet = new Graphics()
    for (const fx of [-46, 46]) feet.ellipse(640 + fx, 590, 42, 26).fill(skin).stroke({ width: 6, color: skinDark })
    const legs = new Graphics()
    for (const lx of [-46, 10]) legs.roundRect(640 + lx, 498, 36, 96, 16).fill(body)
    const arms = new Graphics()
    for (const ax of [-124, 88]) arms.roundRect(640 + ax, 300, 38, 150, 18).fill(body).stroke({ width: 6, color: bodyDark })
    const torso = new Graphics().roundRect(640 - 90, 290, 180, 220, 40).fill(body).stroke({ width: 8, color: bodyDark })
    // Blonda tofsar (bakom huvudet) som tittar fram vid sidorna → tydlig tjej.
    const backHair = new Graphics()
    for (const hx of [-74, 74]) backHair.ellipse(640 + hx, 282, 24, 46).fill(hair).stroke({ width: 5, color: hairDark })
    const head = new Graphics().circle(640, 250, 70).fill(skin).stroke({ width: 8, color: skinDark })
    // Blond lugg/topphår ovanpå huvudet (efter head, före face så ögonen syns).
    const topHair = new Graphics().ellipse(640, 192, 74, 40).fill(hair).stroke({ width: 5, color: hairDark })
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
    // Små hårsnoddar där tofsarna fästs.
    const ties = new Graphics()
    for (const tx of [-70, 70]) ties.circle(640 + tx, 238, 10).fill(COLORS.pink)

    fig.addChild(feet, legs, arms, torso, backHair, head, topHair, face, ties)
  },

  // Garderobshylla (dekor) längst ner som plaggen ligger på.
  _buildShelf() {
    // Bred nog att bära sex plagg i två grupper (yttersta centrum 134 resp. 1146).
    const shelf = new Graphics().roundRect(80, 626, 1120, 92, 24).fill({ color: 0xffffff, alpha: 0.6 })
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

  // x-positioner för n plagg: halva vänster om Elvira, halva höger, mitten fri.
  // Vänstergruppen fylls högerifrån så den alltid slutar vid SHELF_LEFT_END.
  _layoutShelf(n) {
    const leftN = Math.ceil(n / 2)
    const xs = []
    for (let i = 0; i < leftN; i++) xs.push(SHELF_LEFT_END - (leftN - 1 - i) * SHELF_STEP)
    for (let j = 0; j < n - leftN; j++) xs.push(SHELF_RIGHT_START + j * SHELF_STEP)
    return xs
  },

  // Ett plagg: ett RITAT plagg (P0 ASSETS — de dras runt, de är spelobjekt) utan
  // bricka/bakgrund + en osynlig generös träffyta (Ø140 ≥ 96px).
  _makeItem(art) {
    const it = new Container()
    it.addChild(drawIcon(art, 104))
    it.hitArea = new Circle(0, 0, 70)
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
    this._symbol.removeChildren().forEach((c) => c.destroy())
    this._symbol.addChild(drawIcon(w.symbol, 120))
    this._glow.tint = w.glow
    const rainOn = key === 'regn'
    const snowOn = key === 'sno'
    for (const d of this._rain) d.visible = rainOn
    for (const s of this._snow) s.visible = snowOn
    this._activeFx = rainOn ? 'rain' : snowOn ? 'snow' : null
    this._ambT = 1200 // mjuk start på nya vädrets ambient
  },

  // Bygg en runda: nytt väder, obligatoriska zoner + plagg utifrån nivå.
  _newRound(ctx, { silent = false } = {}) {
    if (!this._alive) return
    this._resolving = false
    this._idle = 0
    this._filled = new Set()

    // Nollställ figuren (kan ha "gått ut" i förra rundans payoff).
    this._payoff?.kill()
    this._payoff = null
    if (this._figure && !this._figure.destroyed) {
      gsap.killTweensOf(this._figure)
      this._figure.position.set(0, 0)
      this._figure.rotation = 0
    }

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

    // Passande plagg: minst ETT per obligatorisk zon, och för en slumpad zon (som har
    // fler dugliga val) läggs ETT extra dugligt plagg ut → barnet resonerar "vilket
    // funkar?" i stället för att leta det enda rätta. Sedan fylls hyllan med distraktorer.
    const usedArt = new Set()
    const fitting = []
    const choiceZones = reqZones.filter((s) => this._weather.valid[s].length >= 2)
    const choiceZone = choiceZones.length ? randomFrom(choiceZones) : null
    for (const slot of reqZones) {
      const opts = shuffle(this._weather.valid[slot].slice())
      const take = slot === choiceZone ? 2 : 1
      for (let i = 0; i < take && i < opts.length; i++) {
        usedArt.add(opts[i].art)
        fitting.push({ slot, fits: true, art: opts[i].art, namn: opts[i].namn, from: key })
      }
    }
    const distractors = distractorPool(key, usedArt).slice(0, Math.max(1, shelfCount - fitting.length))
    const deck = shuffle([...fitting, ...distractors])

    // Lägg ut på hyllan i TVÅ grupper med mittkolumnen fri. Jämnt centrerat gav
    // alltid ett plagg på x=640 — ovanpå Elvira och inuti fot-zonens träffyta
    // (Ø260), så en liten knuff kunde räknas som en placering barnet aldrig gjort.
    const xs = this._layoutShelf(deck.length)
    deck.forEach((data, i) => {
      const view = this._makeItem(data.art)
      view.position.set(xs[i], SHELF_Y)
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
      // Godkänn valfritt dugligt plagg för zonen — men bara tills zonen är fylld
      // (så ett andra dugligt plagg inte dubbel-fyller den).
      this._drag.addTarget(this._zones[slot], (data) => this._alive && data.slot === slot && data.fits && !this._filled.has(slot), { hitRadius: 130 })
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
    // Snäpp-"klick" + mjukt tyg-fras när plagget sätter sig (fastsättningen var platt).
    ctx.services.audio.tone({ freq: 880, dur: 0.045, type: 'square', vol: 0.1 })
    ctx.services.audio.tone({ freq: 300, dur: 0.16, type: 'sine', vol: 0.09, slideTo: 170, delay: 0.04 })
    ctx.services.voice.say(randomFrom([`${cap(namn)}!`, `${cap(namn)} sitter!`, 'Så fin!', 'Vad bra!']))

    pop(rec.view)
    const z = this._zones[slot]
    sparkle(ctx.fxLayer, z.x, z.y)

    const ring = this._rings[slot]
    gsap.killTweensOf(ring)
    gsap.killTweensOf(ring.scale)
    ring.alpha = 0.95
    pop(ring) // liten zon-studs när plagget snäpper fast
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
    let line
    if (d.fits && this._filled.has(d.slot)) line = 'Där sitter det redan något bra!'
    else if (d.fits) line = `${cap(d.namn)} hör på ${ZONE_NAMES[d.slot]}!`
    else line = mismatchHint(this._weather.key, d.from)
    ctx.services.voice.say(line || this._weather.recue)
  },

  // Alla obligatoriska zoner fyllda: delat firande + "gå ut"-payoff (Elvira går ut i
  // vädret och visar att hon nu är lagom → kopplar belöningen TILL lärandet), nytt väder.
  _roundComplete(ctx) {
    this._resolving = true
    this._idle = 0
    this._level += 1
    ctx.progress.setLevel(this._level)

    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke
    this._goOutside(ctx)
  },

  // Payoff: Elvira tar ett par steg ut i vädret (små steg-bobbar) och visar sedan att
  // hon blivit lagom (torr i regn / varm i snö / sval i sol) med en glad replik + bevis.
  _goOutside(ctx) {
    const fig = this._figure
    if (!fig || fig.destroyed) return
    gsap.killTweensOf(fig)
    ctx.services.voice.say('Nu går Elvira ut!')
    ctx.services.audio.sfx('whoosh')
    this._payoff?.kill()
    const tl = gsap.timeline()
    this._payoff = tl
    tl.to(fig, { x: 70, duration: 0.34, ease: 'sine.inOut' })
      .to(fig, { y: -16, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, '<')
      .to(fig, { x: 130, duration: 0.34, ease: 'sine.inOut' })
      .to(fig, { y: -16, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, '<')
      .call(() => this._showLagom(ctx))
  },

  // Visa "lagom"-beviset: glad replik + vädersspecifik emoji som svävar upp + gnistor +
  // ett litet glädjehopp. Sedan (efter en paus) nytt väder.
  _showLagom(ctx) {
    if (!this._alive) return
    const w = this._weather
    ctx.services.voice.say(w.lagom)
    ctx.services.audio.sfx('reveal')
    const hx = 640 + (this._figure?.x || 0)
    floatText(ctx.fxLayer, hx, 150, w.proof, { fontSize: 76, rise: 74, duration: 1.4 })
    sparkle(ctx.fxLayer, hx, 230, { count: 8 })
    if (this._figure && !this._figure.destroyed) {
      gsap.to(this._figure, { y: -22, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' })
    }
    this._celebrate = gsap.delayedCall(1.7, () => {
      if (this._alive) this._newRound(ctx)
    })
  },

  // Tick: animera aktiva väderpartiklar (pooled) + idle-recue efter ~6 s.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaTime
    // Wrap mot ctx.view (läses i användningsögonblicket): på en bred telefon eller
    // 4:3-platta ska dropparna täcka och vända utanför den SYNLIGA ytan, inte 0..1280.
    if (this._activeFx === 'rain') {
      for (const d of this._rain) {
        d.y += d._spd * dt * 1.7
        if (d.y > ctx.view.bottom + 20) {
          d.y = ctx.view.top - 20
          d.x = ctx.view.left + Math.random() * ctx.view.width
        }
      }
    } else if (this._activeFx === 'snow') {
      for (const s of this._snow) {
        s._ph += 0.04 * dt
        s.y += s._spd * dt
        s.x = s._bx + Math.sin(s._ph) * s._amp
        if (s.y > ctx.view.bottom + 15) {
          s.y = ctx.view.top - 15
          s._bx = ctx.view.left + Math.random() * ctx.view.width
        }
      }
    }

    // Lugn väder-ambient: fågelkvitter (sol) / mjuka droppar (regn) / vind-sus (snö).
    this._ambT -= ticker.deltaMS
    if (this._ambT <= 0) this._playAmbient(ctx)

    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say(this._weather.recue)
      for (const slot of this._reqZones) if (!this._filled.has(slot)) pop(this._rings[slot])
    }
  },

  // Spela en kort, LÅG väder-ambient och schemalägg nästa (håll den lugn — aldrig påträngande).
  _playAmbient(ctx) {
    const a = ctx.services.audio
    const rnd = (lo, hi) => lo + Math.random() * (hi - lo)
    const k = this._weather?.key
    if (k === 'regn') {
      a.tone({ freq: rnd(520, 820), dur: 0.06, type: 'sine', vol: 0.045, slideTo: rnd(200, 300) })
      if (Math.random() < 0.5) a.tone({ freq: rnd(400, 700), dur: 0.05, type: 'sine', vol: 0.03, slideTo: rnd(180, 260), delay: rnd(0.12, 0.3) })
      this._ambT = rnd(380, 820)
    } else if (k === 'sno') {
      a.tone({ freq: rnd(240, 340), dur: rnd(1.0, 1.6), type: 'sine', vol: 0.05, slideTo: rnd(180, 240) })
      this._ambT = rnd(3800, 6000)
    } else {
      const f = rnd(1900, 2500)
      a.tone({ freq: f, dur: 0.07, type: 'sine', vol: 0.05, slideTo: f * 1.25 })
      a.tone({ freq: f * 1.2, dur: 0.06, type: 'sine', vol: 0.04, slideTo: f * 0.9, delay: 0.09 })
      this._ambT = rnd(2600, 4800)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._celebrate?.kill()
    this._payoff?.kill()
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
// fits:false. Hoppar över plagg som krockar med rundans passande (paraplyet finns
// både som regn-plagg och regn-extra).
function distractorPool(curKey, usedArt) {
  const seen = new Set(usedArt)
  const pool = []
  for (const okey of Object.keys(WEATHERS)) {
    if (okey === curKey) continue
    const ow = WEATHERS[okey]
    const cands = []
    for (const z of ['huvud', 'overkropp', 'fotter']) {
      const first = ow.valid[z][0]
      cands.push({ slot: z, art: first.art, namn: first.namn })
    }
    for (const ex of EXTRAS[okey] || []) cands.push(ex)
    for (const c of cands) {
      if (seen.has(c.art)) continue
      seen.add(c.art)
      pool.push({ slot: c.slot, fits: false, art: c.art, namn: c.namn, from: okey })
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
