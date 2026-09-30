// Klä efter Vädret — dra-och-släpp (3–5 år). Ett rum: tapetserad vägg, plankgolv, matta och ett
// FÖNSTER där dagens väder syns ute (sol / regn / snö / blåst med höstlöv) — bilden bär frågan
// "vad är det för väder?" utan läsning. Elvira står på mattan i underkläder (figur.js).
// Plaggen HÄNGER på ett klädstreck till vänster (rum.js), fästa med varsin klädnypa, och gungar
// i vila (mer när det blåser). Barnet drar (eller tap-tap:ar via DragController) rätt plagg till
// rätt kroppszon (huvud/överkropp/fötter). Passar plagget vädret + zonen → det snäpper fast och
// sätts på henne (hatt på huvudet, ett par skor på fötterna), hon hoppar och rösten säger
// plaggnamnet. Opassande plagg ger en mjuk vänlig vink ("Brr, då fryser vi!") och hänger tillbaka
// på strecket — aldrig en bestraffning. Alla zoner fyllda → hon går ut i vädret, delat firande
// + klistermärke, sedan nytt väder. Oändlig omsorgslek.
// Allt ritas programmatiskt i Pixi Graphics — plagg via drawIcon (src/lib/artikoner.js), inga
// externa filer och ingen emoji som spelobjekt.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, floatText, ripple } from '../../lib/feedback.js'
import { drawIcon } from '../../lib/artikoner.js'
import { COLORS } from '../../lib/theme.js'
import { byggElvira, CX } from './figur.js'
import { byggRum, byggStreck, byggNypa, byggFonster, repY } from './rum.js'

// Fötternas underkant ligger på 616 -> hon står PÅ mattan (rum.js FLOOR_Y = 606).
const GROUND_Y = 606

// --- Elvira KÄNNER vädret -------------------------------------------------
// Obehaget är inte dekor: det är dagens VÄDER mot hur mycket hon har på sig, så skalvet börjar
// stort, avtar för varje plagg och är BORTA när hon är lagom klädd — då blir "Nu blir jag lagom
// varm i snön!" något barnet ser, inte bara hör. Takterna skiljer väderslagen åt (frekvens),
// storleken är kalibrerad mot `_ryserprobe`/`_stillaprobe` (rör inte utslagen utan mätning).
const OBEHAG = {
  sno: { frekv: 21, ampX: 4.8, ampR: 0.005 }, // snabbt, smått köldskalv
  regn: { frekv: 8.5, ampX: 3.4, ampR: 0.013 }, // långsammare hukning i blöten
  sol: { frekv: 3.0, ampX: 5.4, ampR: 0.020 }, // trög värmevaggning, fläktar sig
  bla: { frekv: 13, ampX: 4.4, ampR: 0.016 }, // ryckigt, vindpuffar
}
const RYS_MS = 750 // en extra huttring när ett opassande plagg provas

// Kroppszonernas centrum (= snäpp-mål). Huvud-zonen ligger strax ovanför huvudet
// (en hatt sitter på toppen), fot-zonen strax ovanför fötterna.
const ZONES = { huvud: [640, 230], overkropp: [640, 400], fotter: [640, 560] }
// Prioritetsordning när antal obligatoriska zoner växer med nivån.
const ZONE_ORDER = ['overkropp', 'huvud', 'fotter']

// Där plagget SITTER när det är påsatt (och hur stort det blir på henne). Plaggen hänger i
// 104 px-ikoner, men Elviras kropp är ~200 px bred — påsatt skalas de upp så de passar.
const WEAR = {
  huvud: { x: CX, y: 172, s: 1.6 },
  overkropp: { x: CX, y: 385, sx: 2.6, sy: 3.2 }, // reserv; alla överkroppsplagg har egen rad i WEAR_OVR
  fotter: { x: CX, y: 566, s: 1.25 }, // ett PAR: se _sattPa
}
// Överkroppsplaggen skalas ICKE-likformigt (sx bredd, sy höjd) så de täcker Elviras bål (x 550–730,
// axlar y ~300, höfter ~480–510). Ikonernas mått (S = 1,04): tröja/klänning/jacka ±37 bred med ärmar,
// tröja y −26..30, klänning −26..34, jacka/dunjacka axlar −20 och nederkant 32 (jackans huva −48 hamnar
// BAKOM huvudet). y = axelhöjd 300–302 − ikonens topp·1,04·sy.
const WEAR_OVR = {
  troja: { y: 381, sx: 2.6, sy: 3.0 }, // bredd 200, y 300–475
  klanning: { y: 387, sx: 2.6, sy: 3.2 }, // y 300–500
  regnjacka: { y: 373, sx: 2.6, sy: 3.4 }, // axlar 302, nederkant 486
  vinterjacka: { y: 373, sx: 2.6, sy: 3.4 },
  halsduk: { y: 364, sx: 1.9, sy: 2.0 }, // kragen vid halsen (y ~318), ändarna till ~433
  '☂️': { x: 770, y: 380, s: 1.9, top: true }, // hålls i höger hand, ovanpå allt
}

// Klädstrecket: två rader på vänster sida (rum.js REP). Plaggen hänger HANG px under repet.
const HANG = 46
const ROW_X = { 1: [260], 2: [185, 335], 3: [110, 260, 410] }

// Väderdata. key = ascii-nyckel, namn/intro/lagom behåller åäö. valid = LISTA av dugliga
// plagg per zon (flera funkar → barnet resonerar i stället för att hitta det enda rätta).
// `sitter` = plaggets egen replik (literal — klippen finns färdiga). lagom/proof = "gå ut"-
// payoffen (kopplar belöningen till lärandet). bg = rummets tint. look = vad fönstret visar.
const WEATHERS = {
  sol: {
    key: 'sol', bg: 0xfff3c4,
    intro: 'Det är sol idag. Klä på Elvira så hon blir lagom!',
    recue: 'Det är sol och varmt — vad behöver vi då?',
    lagom: 'Nu blir jag lagom sval i solen!',
    proof: '😎',
    look: { sky: 0x8fd3ff, hill: 0x8fd06a, crown: 0x5fbf62, moln: [0xffffff, 0xffffff, null], sol: true, wind: 0.12, ljus: 0.22 },
    valid: {
      huvud: [{ art: 'solhatt', sitter: 'Solhatten sitter!' }, { art: 'keps', sitter: 'Kepsen sitter!' }],
      overkropp: [{ art: 'troja', sitter: 'Tröjan sitter!' }, { art: 'klanning', sitter: 'Klänningen sitter!' }],
      fotter: [{ art: 'sandaler', sitter: 'Sandalerna sitter!' }, { art: 'skor', sitter: 'Skorna sitter!' }],
    },
  },
  regn: {
    key: 'regn', bg: 0xcfe3ef,
    intro: 'Det är regn idag. Klä på Elvira så hon blir lagom!',
    recue: 'Det är regnigt — vad behöver vi då?',
    lagom: 'Nu blir jag lagom torr i regnet!',
    proof: '☂️',
    look: { sky: 0x8b97a6, hill: 0x5f8f6e, crown: 0x467a58, moln: [0x6f7a86, 0x7d8894, 0x66717d], regn: true, wind: 0.3, ljus: 0 },
    valid: {
      huvud: [{ art: 'regnhatt', sitter: 'Regnhatten sitter!' }],
      overkropp: [{ art: 'regnjacka', sitter: 'Regnjackan sitter!' }, { art: '☂️', sitter: 'Paraplyet sitter!' }],
      fotter: [{ art: 'gummistovlar', sitter: 'Gummistövlarna sitter!' }, { art: 'stovlar', sitter: 'Stövlarna sitter!' }],
    },
  },
  sno: {
    key: 'sno', bg: 0xeaf4fb,
    intro: 'Det är snö idag. Klä på Elvira så hon blir lagom!',
    recue: 'Det är kallt och snöigt — vad behöver vi då?',
    lagom: 'Nu blir jag lagom varm i snön!',
    proof: '⛄',
    look: { sky: 0xc4d8ee, hill: 0xf4f8ff, crown: 0xf2f8ff, moln: [0xe6ecf2, 0xf4f7fa, null], sno: true, wind: 0.08, ljus: 0.06 },
    valid: {
      huvud: [{ art: 'vintermossa', sitter: 'Vintermössan sitter!' }],
      overkropp: [{ art: 'vinterjacka', sitter: 'Vinterjackan sitter!' }, { art: 'halsduk', sitter: 'Halsduken sitter!' }],
      fotter: [{ art: 'vinterstovlar', sitter: 'Vinterstövlarna sitter!' }, { art: 'kangor', sitter: 'Kängorna sitter!' }],
    },
  },
  // Blåsigt höstväder: solhatten och kepsen blåser iväg — bara det som SITTER KVAR duger
  // (en mössa som sluter tätt, en jacka, sjalen knuten runt halsen).
  bla: {
    key: 'bla', bg: 0xf6e2c0,
    intro: 'Det blåser idag. Klä på Elvira så hon blir lagom!',
    recue: 'Det blåser och är svalt — vad behöver vi då?',
    lagom: 'Nu blir jag lagom varm, och mössan sitter kvar!',
    proof: '🍂',
    look: { sky: 0xa9cbe0, hill: 0xc2bf5c, crown: 0xe0902f, moln: [0xf4f4f4, 0xe4e8ec, 0xd4dadf], lov: true, wind: 1, ljus: 0.1 },
    valid: {
      huvud: [{ art: 'vintermossa', sitter: 'Mössan sitter!' }],
      overkropp: [{ art: 'regnjacka', sitter: 'Jackan sitter!' }, { art: 'halsduk', sitter: 'Halsduken sitter!' }],
      fotter: [{ art: 'stovlar', sitter: 'Stövlarna sitter!' }, { art: 'skor', sitter: 'Skorna sitter!' }],
    },
  },
}
const WEATHER_ORDER = ['sol', 'regn', 'sno', 'bla']

// Extra "tydliga säsongs"-plagg som bara används som distraktorer (fel väder).
const EXTRAS = {
  sol: [
    { slot: 'huvud', art: 'solglasogon', sitter: 'Solglasögonen sitter!' },
    { slot: 'overkropp', art: 'badbyxor', sitter: 'Badbyxorna sitter!' },
  ],
  regn: [{ slot: 'overkropp', art: '☂️', sitter: 'Paraplyet sitter!' }],
  sno: [],
  bla: [],
}

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
    this._t = 0
    this._rysT = 0
    this._obehagT = 0
    this._ambT = 1200 // ms till nästa väder-ambient (fågel/regn/vind)
    this._payoff = null
    this._lastWeather = ctx.progress.get().custom?.lastWeather || null

    this._root = new Container()
    ctx.stage.addChild(this._root)
    // Ingen lyft-skugga från biblioteket: plagget ritar sin egen skugga mot väggen (_makeItem).
    this._drag = new DragController({ space: this._root, services: ctx.services })

    this._buildRoom(ctx)
    this._buildFigure()
    this._buildZones(ctx)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._newRound(ctx, { silent: true })

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this._weather.intro)
  },

  // Rummet: vägg + golv + matta i ETT tonat Graphics (en tint klär hela rummet efter vädret),
  // klädstreck, fönster med väder, golvljus. Ett tryck på tomt: mjukt ljud + ring; ett tryck på
  // Elvira kittlar henne.
  _buildRoom(ctx) {
    const rum = byggRum()
    rum.on('pointertap', (e) => {
      if (!this._alive) return
      this._idle = 0
      const p = this._root.toLocal(e.global)
      if (Math.abs(p.x - CX) < 150 && p.y > 150 && p.y < 625) {
        this._kittlaElvira(ctx, p)
      } else {
        ctx.services.audio.sfx('soft')
        ripple(ctx.fxLayer, p.x, p.y, { maxR: 46 })
      }
    })
    this._root.addChild(rum)
    this._rum = rum
    this._bgColor = { r: 255, g: 255, b: 255 }

    this._root.addChild(byggStreck())
    this._fonster = byggFonster()
    this._root.addChild(this._fonster.view, this._fonster.ljus)
  },

  // Ett tryck på Elvira: hon skrattar och hoppar till. (Zonernas träffytor ligger över henne, så
  // samma metod anropas därifrån — utom när ett plagg är valt för tap-tap: då är trycket ett släpp.)
  _kittlaElvira(ctx, p) {
    ctx.services.audio.sfx('tap')
    this._elvira?.kittla()
    if (!this._resolving) this._hopp(12)
    sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
  },

  // Figuren "Elvira" (figur.js): volym, ansikte, andning och blinkning. `_figure` ägs av gsap
  // (hoppet vid rätt plagg och "gå ut"-promenaden); skalvet + andningen drivs av tickern på det
  // INRE lagret `_figureInner` — de får aldrig skriva samma egenskap.
  _buildFigure() {
    this._elvira = byggElvira(GROUND_Y)
    this._figure = this._elvira.root
    this._figureInner = this._elvira.inner
    // Mjuk golvskugga som följer med henne när hon går (ligger i roten, under kroppen).
    const skugga = new Graphics().ellipse(CX, 612, 132, 15).fill({ color: 0x000000, alpha: 0.18 })
    skugga.eventMode = 'none'
    this._figure.addChildAt(skugga, 0)
    this._root.addChild(this._figure)
  },

  // Tre kroppszoner: svag ledtrådsring + osynlig snäpp-/tap-mål-container.
  _buildZones(ctx) {
    this._zones = {}
    this._rings = {}
    for (const key of Object.keys(ZONES)) {
      const [zx, zy] = ZONES[key]
      // Vit ring med mörk kant under: läses mot både ljus tapet och mörkt trä.
      const ring = new Graphics()
      ring.circle(0, 0, 70).stroke({ width: 10, color: 0x000000, alpha: 0.22 })
      ring.circle(0, 0, 70).stroke({ width: 6, color: COLORS.white, alpha: 0.95 })
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
      zone.on('pointertap', (e) => {
        if (!this._alive || this._drag.selected) return
        this._idle = 0
        this._kittlaElvira(ctx, this._root.toLocal(e.global))
      })
      this._root.addChild(zone)
      this._zones[key] = zone
    }
  },

  // Var plaggen hänger: n plagg fördelas på strecket, upp till tre per rad. Returnerar
  // [{x, y}] i itemets mittpunkt (klädnypan sitter på repet, HANG px ovanför).
  _ropeSlots(n) {
    const rad1 = Math.ceil(n / 2)
    const rader = [rad1, n - rad1]
    const slots = []
    rader.forEach((k, rad) => {
      const xs = ROW_X[k] || []
      for (const x of xs) slots.push({ x, y: repY(x, rad) + HANG })
    })
    return slots
  },

  // Ett plagg: ett RITAT föremål som HÄNGER i en klädnypa på strecket (P0 ASSETS — de dras
  // runt, de är spelobjekt), med egen skugga mot väggen, och en osynlig generös träffyta
  // (Ø140 ≥ 96px). Strukturen:
  //   it (drag-mål, hitArea, ägs av DragController)
  //     └ hang (pivot i klädnypan → gungar därifrån; ägs av tickern)
  //         ├ cloth (skugga + ikon; skalas upp när plagget sätts på)
  //         └ peg (klädnypan)
  _makeItem(art) {
    const it = new Container()
    it.interactiveChildren = false
    const hang = new Container()
    hang.position.set(0, -HANG)
    hang.pivot.set(0, -HANG)
    const cloth = new Container()
    const skugga = drawIcon(art, 104)
    skugga.tint = 0x000000
    skugga.alpha = 0.13
    skugga.position.set(7, 9)
    skugga.eventMode = 'none'
    const ikon = drawIcon(art, 104)
    ikon.eventMode = 'none'
    cloth.addChild(skugga, ikon)
    const peg = byggNypa()
    peg.position.set(0, -HANG)
    hang.addChild(cloth, peg)
    it.addChild(hang)
    it.hitArea = new Circle(0, 0, 70)
    it._wxHang = hang
    it._wxCloth = cloth
    it._wxIkon = ikon
    it._wxSkugga = skugga
    it._wxPeg = peg
    it._wxPh = Math.random() * Math.PI * 2
    it._wxWorn = false
    return it
  },

  // Städa ett plagg: killTweensOf når bara roten, så innernoderna tas med.
  _stadaItem(v) {
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    for (const n of [v._wxHang, v._wxCloth, v._wxIkon, v._wxSkugga, v._wxPeg]) {
      if (!n || n.destroyed) continue
      gsap.killTweensOf(n)
      if (n.scale) gsap.killTweensOf(n.scale)
    }
  },

  // Välj väder: sol→regn→snö de tre första rundorna (offset så vi ej upprepar förra
  // sessionens väder), blåst som fjärde, sedan slumpat ≠ förra. Sparas så en ny session ej upprepar.
  _pickWeather(ctx) {
    let key
    if (this._seq < 3) {
      const first = WEATHER_ORDER.slice(0, 3)
      let start = 0
      const li = first.indexOf(this._lastWeather)
      if (li >= 0) start = (li + 1) % 3
      key = first[(start + this._seq) % 3]
    } else if (this._seq === 3 && this._lastWeather !== 'bla') {
      key = 'bla'
    } else {
      key = randomFrom(WEATHER_ORDER.filter((k) => k !== this._lastWeather))
    }
    this._seq++
    this._lastWeather = key
    ctx.progress.setCustom('lastWeather', key)
    return key
  },

  // Nytt väder: rummet tonas mjukt, fönstret byter utsikt.
  _applyWeather(key, snap = false) {
    const w = WEATHERS[key]
    const to = rgb(w.bg)
    gsap.killTweensOf(this._bgColor)
    const sätt = () => {
      if (this._alive && this._rum && !this._rum.destroyed) {
        const c = this._bgColor
        this._rum.tint = (Math.round(c.r) << 16) | (Math.round(c.g) << 8) | Math.round(c.b)
      }
    }
    if (snap) {
      Object.assign(this._bgColor, to)
      sätt()
    } else {
      gsap.to(this._bgColor, { r: to.r, g: to.g, b: to.b, duration: 0.6, ease: 'sine.inOut', onUpdate: sätt })
    }
    this._fonster.apply(w.look, snap)
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
    // Nollställ skalvet också, annars ärver nya rundan förra rundans utslag.
    this._rysT = 0
    if (this._figureInner && !this._figureInner.destroyed) {
      this._figureInner.position.set(CX, GROUND_Y) // == pivoten, se figur.js
      this._figureInner.rotation = 0
    }

    // Rensa förra rundans plagg (clear() avregistrerar lyssnare + dödar tweens först). Påsatta
    // plagg ligger i Elviras inre lager och tas med här.
    this._drag.clear()
    for (const v of this._items) {
      this._stadaItem(v)
      if (!v.destroyed) v.destroy({ children: true })
    }
    this._items = []
    for (const k of Object.keys(this._rings)) {
      gsap.killTweensOf(this._rings[k])
      gsap.killTweensOf(this._rings[k].scale)
      this._rings[k].alpha = 0
      this._rings[k].scale.set(1)
    }

    const key = this._pickWeather(ctx)
    this._weather = WEATHERS[key]
    this._applyWeather(key, silent)

    // Svårighet växer mjukt: antal obligatoriska zoner + plagg på strecket.
    const reqCount = this._level >= 4 ? 3 : this._level >= 2 ? 2 : 1
    const shelfCount = reqCount === 1 ? 3 : reqCount === 2 ? 4 : this._level >= 6 ? 6 : 5
    const reqZones = ZONE_ORDER.slice(0, reqCount)
    this._reqZones = reqZones
    this._needed = reqZones.length
    this._placed = 0

    // Passande plagg: minst ETT per obligatorisk zon, och för en slumpad zon (som har
    // fler dugliga val) läggs ETT extra dugligt plagg ut → barnet resonerar "vilket
    // funkar?" i stället för att leta det enda rätta. Sedan fylls strecket med distraktorer.
    const usedArt = new Set()
    const fitting = []
    const choiceZones = reqZones.filter((s) => this._weather.valid[s].length >= 2)
    const choiceZone = choiceZones.length ? randomFrom(choiceZones) : null
    for (const slot of reqZones) {
      const opts = shuffle(this._weather.valid[slot].slice())
      const take = slot === choiceZone ? 2 : 1
      for (let i = 0; i < take && i < opts.length; i++) {
        usedArt.add(opts[i].art)
        fitting.push({ slot, fits: true, art: opts[i].art, sitter: opts[i].sitter, from: key })
      }
    }
    const distractors = distractorPool(key, usedArt).slice(0, Math.max(1, shelfCount - fitting.length))
    const deck = shuffle([...fitting, ...distractors])

    // Häng upp dem på strecket (max tre per rad, två rader). Strecket ligger på vänster sida
    // och slutar vid x 500 — mittkolumnen är Elviras, så inget plagg spawnar i en släppzon.
    const slots = this._ropeSlots(deck.length)
    deck.forEach((data, i) => {
      const view = this._makeItem(data.art)
      view.position.set(slots[i].x, slots[i].y)
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
      // (så ett andra dugliga plagg inte dubbel-fyller den).
      this._drag.addTarget(this._zones[slot], (data) => this._alive && data.slot === slot && data.fits && !this._filled.has(slot), { hitRadius: 130 })
      this._rings[slot].alpha = 0.4
    }

    // Väderbytet syns genast; bara orden köar bakom lagom-raden (3,2 s) som en fast
    // 1,7 s kapade. Om-cuen (6 s) räknas från raden, annars kapar den en sen intro.
    if (!silent) {
      const w = this._weather
      ctx.narTyst(() => {
        if (!this._alive || this._weather !== w || this._resolving) return
        this._idle = 0
        ctx.services.voice.say(w.intro)
      })
    }
  },

  // Rätt plagg på rätt zon (DragController har redan snäppt det dit).
  _onCorrect(ctx, rec) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const { slot, sitter } = rec.data

    ctx.services.audio.sfx('correct')
    // Snäpp-"klick" + mjukt tyg-fras när plagget sätter sig (fastsättningen var platt).
    ctx.services.audio.tone({ freq: 880, dur: 0.045, type: 'square', vol: 0.1 })
    ctx.services.audio.tone({ freq: 300, dur: 0.16, type: 'sine', vol: 0.09, slideTo: 170, delay: 0.04 })
    // Alltid plaggets egen rad — även det sista i rundan (den sägs FÖRE complete(), se _roundComplete).
    ctx.services.voice.say(sitter)

    pop(rec.view)
    const z = this._zones[slot]
    sparkle(ctx.fxLayer, z.x, z.y)

    const ring = this._rings[slot]
    gsap.killTweensOf(ring)
    gsap.killTweensOf(ring.scale)
    ring.alpha = 0.95
    pop(ring) // liten zon-studs när plagget snäpper fast
    gsap.to(ring, { alpha: 0, duration: 0.5, ease: 'sine.out' })

    // Fäst plagget på figuren (i det INRE lagret) så det både bobbar med hoppet
    // och skakar med henne så länge hon fortfarande fryser.
    rec.view.eventMode = 'none'
    const inner = this._figureInner
    if (inner && !inner.destroyed && !rec.view.destroyed) {
      const wo = WEAR_OVR[rec.data.art]
      const bak = this._elvira.bakHar
      if (slot === 'overkropp' && !wo?.top && bak && bak.parent === inner) inner.addChildAt(rec.view, inner.getChildIndex(bak))
      else inner.addChild(rec.view)
      this._sattPa(rec)
    }

    this._hopp(10)

    this._filled.add(slot)
    this._placed += 1
    if (this._placed >= this._needed) this._roundComplete(ctx)
  },

  // Plagget lämnar klädnypan och sätts på: nypan släpper, gungandet upphör, plagget glider till
  // sin plats på kroppen och växer till Elviras storlek. Skor och stövlar blir ETT PAR.
  _sattPa(rec) {
    const v = rec.view
    if (!v || v.destroyed || v._wxWorn) return
    const { slot, art } = rec.data
    const w = { ...WEAR[slot], ...(WEAR_OVR[art] || {}) }
    const sx = w.sx ?? w.s
    const sy = w.sy ?? w.s
    v._wxWorn = true
    v._wxPeg.visible = false
    v._wxSkugga.visible = false
    v._wxHang.rotation = 0
    if (slot === 'fotter') {
      // Ett par: originalet på höger fot, en spegling på vänster (tårna utåt åt varsitt håll).
      const dx = 44 / sx
      v._wxIkon.x = dx
      const par = drawIcon(art, 104)
      par.eventMode = 'none'
      par.scale.x = -1
      par.x = -dx
      v._wxCloth.addChild(par)
    }
    gsap.to(v, { x: w.x, y: w.y, duration: 0.3, ease: 'back.out(1.5)' })
    gsap.to(v._wxCloth.scale, { x: sx, y: sy, duration: 0.3, ease: 'back.out(1.6)' })
  },

  // Opassande plagg (fel väder eller fel zon): ALDRIG bestraffning — mjuk vink.
  // DragController har redan spelat 'soft' och snäpper plagget tillbaka till strecket.
  _onWrong(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    wiggle(rec.view)
    this._rys() // kroppen svarar också, inte bara plagget och rösten
    const d = rec.data
    const v = ctx.services.voice
    if (d.fits && this._filled.has(d.slot)) {
      v.say('Där sitter det redan något bra!')
    } else if (d.fits) {
      if (d.slot === 'huvud') v.say('Den passar på huvudet!')
      else if (d.slot === 'overkropp') v.say('Den passar på kroppen!')
      else v.say('Den passar på fötterna!')
    } else {
      v.say(mismatchHint(this._weather.key, d.from, d.slot) || this._weather.recue)
    }
  },

  // Alla obligatoriska zoner fyllda: delat firande + "gå ut"-payoff (Elvira går ut i
  // vädret och visar att hon nu är lagom → kopplar belöningen TILL lärandet), nytt väder.
  _roundComplete(ctx) {
    this._resolving = true
    this._idle = 0
    this._level += 1
    ctx.progress.setLevel(this._level)

    // Plaggets egen rad ('… sitter!') sägs redan i _onCorrect, alltså FÖRE complete(): då talar
    // rösten och berömmet utgår i stället för att kapa den. 'Nu går Elvira ut!' KÖAR bakom den
    // (say() skulle kapa plaggnamnet) och gäller bara om rundan är kvar. Bilden väntar inte.
    ctx.progress.complete() // celebrate-ljud + konfetti + stjärna + klistermärke
    const w = this._weather
    ctx.narTyst(() => {
      if (this._alive && this._resolving && this._weather === w) ctx.services.voice.say('Nu går Elvira ut!')
    })
    this._goOutside(ctx)
  },

  // Payoff: Elvira tar ett par steg ut i vädret (små steg-bobbar) och visar sedan att
  // hon blivit lagom (torr i regn / varm i snö / sval i sol) med en glad replik + bevis.
  _goOutside(ctx) {
    const fig = this._figure
    if (!fig || fig.destroyed) return
    gsap.killTweensOf(fig)
    fig.y = 0 // ett avbrutet hopp får inte bli promenadens nya golv
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
    // Köar bakom "Nu går Elvira ut!" (1,9 s) som annars kapades efter 0,7 s. Hann nästa
    // väder komma under väntan är raden fel väder och utgår.
    ctx.narTyst(() => {
      if (this._alive && this._weather === w && this._resolving) ctx.services.voice.say(w.lagom)
    })
    ctx.services.audio.sfx('reveal')
    const hx = CX + (this._figure?.x || 0)
    floatText(ctx.fxLayer, hx, 110, w.proof, { fontSize: 76, rise: 74, duration: 1.4 })
    sparkle(ctx.fxLayer, hx, 230, { count: 8 })
    this._hopp(22)
    // Nästa runda köas BAKOM lagom-raden (och 'Nu går Elvira ut!' före den): på en fast 1,7 s
    // hann lagom-raden (3,2 s) aldrig sägas, den föll på sin väder-vakt. narTyst kör i köordning
    // och varje fn väntar in det den förra sa; 1,7 s är den minsta tid utsikten får stå kvar.
    ctx.later(1.7, () => {
      ctx.narTyst(() => {
        if (this._alive && this._weather === w && this._resolving) this._newRound(ctx)
      })
    })
  },

  // Ett hopp på roten (gsap äger x/y där). Nollar y först så ett avbrutet hopp inte lämnar
  // henne i luften — yoyo återvänder till startvärdet, och startvärdet var mitt i det förra.
  _hopp(h) {
    const fig = this._figure
    if (!fig || fig.destroyed) return
    gsap.killTweensOf(fig, 'y')
    fig.y = 0
    gsap.to(fig, { y: -h, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' })
  },

  // Hur illa Elvira har det just nu: 0 = lagom klädd, 1 = inget på sig alls.
  // Andelen OFYLLDA obligatoriska zoner, alltså exakt det barnet håller på att
  // åtgärda — därför avtar skalvet av sig självt för varje plagg som sätter sig.
  _obehag() {
    if (this._resolving) return 0 // hon har klarat det; då ska hon inte huttra
    const n = this._needed || 1
    return Math.max(0, Math.min(1, (n - this._placed) / n))
  },

  // En extra huttring när ett opassande plagg provas: kroppen svarar, inte bara plagget.
  _rys() {
    this._rysT = RYS_MS / 1000
  },

  // Per-frame: obehaget uttryckt i kroppen. Skalvet ligger i `_figureInner` — se
  // figur.js för varför det inte får ligga i `_figure`.
  _stepObehag(dt) {
    const inner = this._figureInner
    if (!inner || inner.destroyed) return
    this._obehagT = (this._obehagT || 0) + dt
    if (this._rysT > 0) this._rysT = Math.max(0, this._rysT - dt)

    const o = this._obehag()
    const extra = this._rysT > 0 ? 1.6 * (this._rysT / (RYS_MS / 1000)) : 0
    const styrka = Math.min(1.9, o + extra)
    if (styrka <= 0.001) { // lagom klädd = helt stilla, inget kvarglömt utslag
      inner.x = CX
      inner.rotation = 0
      return
    }
    const p = OBEHAG[this._weather?.key] || OBEHAG.sno
    const t = this._obehagT
    inner.x = CX + Math.sin(t * p.frekv) * p.ampX * styrka
    inner.rotation = Math.sin(t * p.frekv * 0.5) * p.ampR * styrka
  },

  // Plaggen på strecket gungar från klädnypan — lugnt i vila, kraftigt i blåst; det som hålls
  // i handen hänger rakt.
  _gungaPlagg(sec) {
    const vind = this._weather?.look.wind || 0
    const held = this._drag.active?.view
    const k = Math.min(1, sec * 10)
    for (const v of this._items) {
      if (!v || v.destroyed || v._wxWorn) continue
      const hang = v._wxHang
      if (!hang || hang.destroyed) continue
      let mal = 0
      if (v !== held) {
        const t = this._t
        mal = Math.sin(t * (1.15 + vind * 1.5) + v._wxPh) * (0.035 + vind * 0.09)
          + vind * 0.04 * Math.sin(t * 0.7 + v._wxPh * 0.5)
      }
      hang.rotation += (mal - hang.rotation) * k
    }
  },

  // Tick: fönstret, Elvira (ansikte + andning), plaggen, ambient + idle-recue efter ~6 s.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaTime
    const sec = ticker.deltaMS / 1000
    this._t += sec

    this._fonster.update(dt, this._t)
    this._stepObehag(sec)
    this._gungaPlagg(sec)

    // Elvira: blicken följer det som dras, ansiktet visar obehaget.
    const act = this._drag.active
    const sel = act?.dragging ? act : null
    const lx = sel ? clamp((sel.tx - CX) / 260, -1, 1) : 0
    const ly = sel ? clamp((sel.ty - 250) / 260, -1, 1) : 0
    const rys = this._rysT > 0 ? 1.6 * (this._rysT / (RYS_MS / 1000)) : 0
    this._elvira.uppdatera(sec, {
      obehag: this._obehag() + rys,
      glad: this._resolving,
      vader: this._weather.key,
      lookX: lx,
      lookY: ly,
    })

    // Lugn väder-ambient: fågelkvitter (sol) / mjuka droppar (regn) / vind-sus (snö, blåst).
    this._ambT -= ticker.deltaMS
    if (this._ambT <= 0) this._playAmbient(ctx)

    // Tomgången räknas från TYSTNAD: medan en replik talar står klockan still (V21 —
    // annars kapar påminnelsens say() en replik som redan talar).
    if (ctx.services.voice.talar) this._idle = 0
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
    } else if (k === 'bla') {
      // Vindpuff: en låg ton som stiger och dör ut, ibland två i rad.
      const f = rnd(170, 250)
      a.tone({ freq: f, dur: rnd(1.1, 1.7), type: 'sine', vol: 0.05, slideTo: f * rnd(1.3, 1.7) })
      if (Math.random() < 0.4) a.tone({ freq: f * 1.5, dur: rnd(0.7, 1.1), type: 'sine', vol: 0.03, slideTo: f * 1.1, delay: rnd(0.5, 0.9) })
      this._ambT = rnd(2800, 4600)
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
    this._payoff?.kill()
    this._drag?.destroy()
    if (this._bgColor) gsap.killTweensOf(this._bgColor)
    if (this._figure) gsap.killTweensOf(this._figure)
    for (const k of Object.keys(this._rings || {})) {
      gsap.killTweensOf(this._rings[k])
      gsap.killTweensOf(this._rings[k].scale)
    }
    for (const v of this._items || []) this._stadaItem(v)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    // Fönstrets mask måste lossas innan noderna rivs.
    this._fonster?.destroy()
    this._root?.destroy({ children: true })
  },
}

// Distraktor-pool: passande plagg från de ANDRA vädren + säsongs-extras, alla fits:false.
// Hoppar över plagg som krockar med rundans passande — och över allt som är dugligt för DAGENS
// väder i samma zon (mössan är rätt både i snö och i blåst; då får den aldrig vara en distraktor).
function distractorPool(curKey, usedArt) {
  const seen = new Set(usedArt)
  const dugliga = new Set()
  for (const z of ZONE_ORDER) for (const o of WEATHERS[curKey].valid[z]) dugliga.add(o.art)
  const pool = []
  for (const okey of Object.keys(WEATHERS)) {
    if (okey === curKey) continue
    const ow = WEATHERS[okey]
    const cands = []
    for (const z of ZONE_ORDER) {
      const first = ow.valid[z][0]
      cands.push({ slot: z, art: first.art, sitter: first.sitter })
    }
    for (const ex of EXTRAS[okey] || []) cands.push(ex)
    for (const c of cands) {
      if (seen.has(c.art) || dugliga.has(c.art)) continue
      seen.add(c.art)
      pool.push({ slot: c.slot, fits: false, art: c.art, sitter: c.sitter, from: okey })
    }
  }
  return shuffle(pool)
}

// Vänlig (positiv) vink när plagget passar fel väder.
function mismatchHint(cur, from, slot) {
  if (cur === 'sol') return from === 'sno' || from === 'bla' ? 'Oj, då blir det för varmt!' : 'Det behövs inte när solen skiner!'
  if (cur === 'sno') return 'Brr, då fryser vi!'
  if (cur === 'regn') return 'Det regnar ju — vad behöver vi då?'
  if (cur === 'bla') return slot === 'huvud' ? 'Oj, den blåser ju iväg!' : 'Det blåser ju — vad behöver vi då?'
  return ''
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function rgb(hex) {
  return { r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff }
}
