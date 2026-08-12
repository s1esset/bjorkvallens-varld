// MATA PAPPA — första spelet i ansiktssektionen (`docs/IDEER.md` post 2).
//
// Spelfiguren är ett RIKTIGT foto, uppskuret i lager av `npm run ansikte` och riggat av
// `lib/ansikte.js`: käken sjunker, munnen tuggar, ögonen blinkar och en hel grimas
// korsbleks in ovanpå. Barnet drar mat från tallriken till munnen; ansiktets min ÄR
// återkopplingen (P0: ljud+bild <100 ms, noll läsning).
//
// Två saker som materialet och riggen tvingar fram, och som inte får glömmas bort:
//
// ⚠️ MUNNEN ÄR ETT MÅL SOM ALDRIG FÅR RÖRA SIG. Riggen andas (inre containerns skala) och
//    `DragController` mäter avståndet till `target.view.x/y` NÄR maten släpps. Målnoden
//    ligger därför i spelets eget lager på en fast punkt — aldrig som barn till ansiktet.
//    (Samma fälla som sänkte `sortera-skrap`s tunnor: släpp 2 px utanför radien.)
//
// ⚠️ MIN-LAGRET LIGGER ÖVERST och bär sin egen mun. Ett tugg bakom en kvarhängande grimas
//    syns inte — varje ny matbit släpper den förra minen (`slappMin`) innan käken rör sig.
//
// BUS är en feature, inte ett fel (P0 MOTGÅNG): släpps maten på kinden, pannan eller håret
// fastnar den och blir gegga. Det fyller inte mättnadsmätaren, men det bestraffas aldrig —
// pappa blir förvånad, säger aj eller fnissar, och geggan sitter kvar till rapfinalen.
import { Circle, Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { DragController } from '../../lib/DragController.js'
import { FOODS, MAT_STARK, makeFood, foodColor } from '../../lib/mat.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { burst, liv, pop, puff, ripple, sparkle, shake, wiggle } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'

// --- geometri (designkoordinater 1280×720) ---
const ANS = { x: 455, y: 320, h: 500 } // ansiktets mitt + höjd
const MUN_R = 130                      // snäppradie till munnen (P0: träffyta ≫96 px)
const BUS = { rx: 215, ry: 250 }       // ansiktets ellips — utanför den är det en ren miss
const TALLRIK = { x: 960, y: 525, rx: 252, ry: 165 }
const BORD_Y = 590 // bordsskivans framkant — tallriken måste skära den, annars svävar den
// Sex platser, alla med sin MATBILD (±50 px) innanför tallrikens ellips. Första bilden
// hade dem på kanten och den andra lät nedre raden hänga utanför — båda läste som
// utspilld mat. Träffhalon är 104 px i diameter (P0 kräver ≥96) och mellanrummet mellan
// två halon 26 px i höjd, 46 i sidled (P0 kräver ≥24).
const PLATSER = [
  [810, 460], [960, 460], [1110, 460],
  [810, 590], [960, 590], [1110, 590],
]
const GRIP_R = 52
const MATARE = { x: 112, y: 445, w: 116, h: 286 } // står PÅ bordet, svävar inte
const GEGGA_MAX = 6 // P0 MOTGÅNG: tak på hur mycket som kan gå fel samtidigt

// Vilken min varje mat framkallar. Chilin och citronen är hela poängen med att en sur
// och en het min finns — resten fördelas så att en tallrik sällan ger samma grimas två
// gånger i rad.
const MIN_PER_MAT = {
  lemon: 'sur',
  chili: 'het',
  broccoli: 'acklad',
  carrot: 'fundersam',
  corn: 'fundersam',
  tomato: 'fundersam',
  pear: 'fundersam',
  grape: 'skratt',
  watermelon: 'skratt',
  lollipop: 'skratt',
}

// Pappas egna uttrycksljud är INSPELADE klipp (ägaren spelar in dem själv). De finns inte
// än, så varje min bär också en stämd reserv: två toner som säger samma sak i musik.
// `harSample` frågar först — annars hade varje tugg flaggat `saknat-ljudklipp` i testloggen.
const ROST = {
  sur: { klipp: 'pappa_ohh', ton: [560, 300], typ: 'sine' },
  acklad: { klipp: 'pappa_blaa', ton: [420, 190], typ: 'sawtooth' },
  het: { klipp: 'pappa_aaah', ton: [300, 820], typ: 'sine' },
  lycksalig: { klipp: 'pappa_mmm', ton: [440, 660], typ: 'sine' },
  fundersam: { klipp: 'pappa_ohh', ton: [400, 470], typ: 'sine' },
  forvanad: { klipp: 'pappa_oj', ton: [520, 780], typ: 'sine' },
  aj: { klipp: 'pappa_aj', ton: [700, 430], typ: 'triangle' },
  skratt: { klipp: 'pappa_fniss', ton: [600, 760], typ: 'triangle' },
  nojd: { klipp: 'pappa_rap', ton: [240, 105], typ: 'sawtooth' },
}

export default {
  id: 'mata-munnen',
  titleSv: 'Mata Pappa',
  icon: '😋',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  voiceIntro: 'Mata pappa med maten på tallriken!',

  async init(ctx) {
    this._alive = true
    this._busy = false
    this._idle = 0
    this._atna = 0
    this._gapNu = 0 // spelmodulen är en singleton — gapet får inte ärvas från förra omgången
    this._geggor = []
    this._cueVaxel = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))
    this._root.addChild(this._bord(ctx))

    // Lagerordning: tallrik → ansikte → gegga (ovanpå ansiktet) → mat (ovanpå allt, så
    // en bit som dras aldrig försvinner bakom hakan).
    this._propL = new Container()
    this._propL.eventMode = 'none'
    this._root.addChild(this._propL)

    this._ansL = new Container()
    this._ansL.eventMode = 'none'
    this._root.addChild(this._ansL)

    this._geggaL = new Container()
    this._geggaL.eventMode = 'none'
    this._geggaL.interactiveChildren = false
    this._root.addChild(this._geggaL)

    this._matL = new Container()
    this._root.addChild(this._matL)

    this._ritaTallrik()
    this._ritaMatare()

    // Ansiktet. Foton kan saknas i ett halvbyggt bygge — då ska spelet inte krascha,
    // bara sakna sin figur (medvetet: ingen ritad reservfigur, se beslut 6 i IDEER).
    try {
      const data = await laddaAnsikte('pappa')
      if (!this._alive) return
      this._ans = new Ansikte(data, { hojd: ANS.h })
      this._ans.view.position.set(ANS.x, ANS.y)
      this._ansL.addChild(this._ans.view)
      const g = data.manifest.geometri
      const k = ANS.h / data.manifest.ruta.h
      this._munY = ANS.y + (g.mun.y + g.mun.h / 2 - data.manifest.ruta.h / 2) * k
      this._ogonY = ANS.y + (g.ogonlinje - data.manifest.ruta.h / 2) * k
    } catch (e) {
      console.warn('mata-munnen: ansiktet kunde inte laddas —', e?.message || e)
      this._munY = ANS.y + 87
      this._ogonY = ANS.y - 37
    }

    // Munnen som släppmål: en egen, ORÖRLIG nod. Den ligger i SAMMA container som maten
    // (`_matL`) eftersom `DragController` jämför släppunkten i sitt `space` med målets
    // `x/y` — mål och föremål måste läsa samma koordinatsystem.
    this._mun = new Graphics().circle(0, 0, MUN_R).fill({ color: 0xffffff, alpha: 0 })
    this._mun.position.set(ANS.x, this._munY)
    this._mun.hitArea = new Circle(0, 0, MUN_R)
    this._matL.addChild(this._mun)

    this._drag = new DragController({ space: this._matL, services: ctx.services })
    this._drag.addTarget(this._mun, () => true, { hitRadius: MUN_R })

    this._nyTallrik(ctx)

    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)

    this._root.eventMode = 'static'
    this._root.hitArea = new Circle(ctx.width / 2, ctx.height / 2, 4000)
    this._vakna = (e) => this._tomtTryck(ctx, e)
    this._root.on('pointerdown', this._vakna)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._ans?.liv(true)
  },

  // Varje pekning ska ge ljud+bild inom 100 ms (P0 ÅTERKOPPLING) — även den som landar
  // på bordsduken. En ring och en mjuk ton, aldrig en tillsägelse. Tryck på maten eller
  // munnen har redan sin egen återkoppling och bubblar hit; dem rör vi inte.
  _tomtTryck(ctx, e) {
    this._idle = 0
    if (!this._alive || e?.target !== this._root) return
    const p = this._root.toLocal(e.global)
    ripple(ctx.fxLayer, p.x, p.y, { color: 0xffd9a0, maxR: 62 })
    ctx.services.audio.tone({ freq: 480, dur: 0.08, vol: 0.14 })
  },

  // ------------------------------------------------------------------ scen ---

  // Bordet går ut ur bild åt BÅDA håll. En skiva som slutar mitt i luften läser som en
  // lös planka; och på en bred telefon når `ctx.view` ut till −240/+1520, så kanterna
  // måste ligga utanför den — inte utanför 0..1280.
  _bord(ctx) {
    const c = new Container()
    c.eventMode = 'none'
    const v = ctx.view
    const x0 = Math.min(-360, v.left - 120)
    const x1 = Math.max(ctx.width + 360, v.right + 120)
    const skiva = new Graphics()
      .rect(x0, BORD_Y, x1 - x0, 300)
      .fill(0xc98a4e)
      .stroke({ width: 7, color: 0x9a6535 })
    const kant = new Graphics()
      .rect(x0, BORD_Y, x1 - x0, 26)
      .fill({ color: 0xe0a86c, alpha: 0.85 })
    const adring = new Graphics()
    for (const y of [652, 700, 748]) {
      adring.moveTo(x0, y).quadraticCurveTo(640, y + 10, x1, y)
        .stroke({ width: 3, color: 0xa87342, alpha: 0.35 })
    }
    c.addChild(skiva, kant, adring)
    return c
  },

  _ritaTallrik() {
    const t = new Container()
    t.eventMode = 'none'
    const skugga = new Graphics()
      .ellipse(TALLRIK.x, TALLRIK.y + 152, TALLRIK.rx * 0.92, 24)
      .fill({ color: 0x000000, alpha: 0.12 })
    const under = new Graphics()
      .ellipse(TALLRIK.x, TALLRIK.y + 14, TALLRIK.rx, TALLRIK.ry)
      .fill(0xdfe6ee)
      .stroke({ width: 6, color: 0xa9b6c4 })
    const yta = new Graphics()
      .ellipse(TALLRIK.x, TALLRIK.y, TALLRIK.rx, TALLRIK.ry)
      .fill(0xf6fbff)
      .stroke({ width: 6, color: 0xbcc9d6 })
    const inre = new Graphics()
      .ellipse(TALLRIK.x, TALLRIK.y, TALLRIK.rx * 0.7, TALLRIK.ry * 0.66)
      .stroke({ width: 4, color: 0xd6e2ec })
    const dager = new Graphics()
      .ellipse(TALLRIK.x - 96, TALLRIK.y - 46, 62, 24)
      .fill({ color: 0xffffff, alpha: 0.6 })
    t.addChild(skugga, under, yta, inre, dager)
    this._propL.addChild(t)
  },

  // Mättnadsmätaren: en burk som fylls. Den kan bara STIGA — ingen poäng som sjunker (P0).
  _ritaMatare() {
    const m = new Container()
    m.eventMode = 'none'
    const { x, y, w, h } = MATARE
    const glas = new Graphics()
      .roundRect(x - w / 2, y - h / 2, w, h, 34)
      .fill({ color: 0xffffff, alpha: 0.55 })
      .stroke({ width: 7, color: 0xb08a5c })
    const lock = new Graphics()
      .roundRect(x - w / 2 - 9, y - h / 2 - 26, w + 18, 34, 14)
      .fill(0xd9a05b)
      .stroke({ width: 6, color: 0x9a6535 })

    // Fyllningen ritas om per nivå i sin egen Graphics — maskad av burkens rundning
    // genom att bara rita innanför den.
    this._fyll = new Graphics()
    this._fyllNiva = 0

    const dager = new Graphics()
      .roundRect(x - w / 2 + 14, y - h / 2 + 24, 16, h - 70, 8)
      .fill({ color: 0xffffff, alpha: 0.45 })

    // Hjärtat på locket tänds när magen är full — belöningen, aldrig en varning.
    this._hjarta = new Graphics()
    this._hjarta.moveTo(0, 9)
      .quadraticCurveTo(-16, -4, -8, -13)
      .quadraticCurveTo(0, -18, 0, -8)
      .quadraticCurveTo(0, -18, 8, -13)
      .quadraticCurveTo(16, -4, 0, 9)
      .fill(0xff6b8e)
      .stroke({ width: 3, color: 0xd94f72 })
    this._hjarta.position.set(x, y - h / 2 - 52)
    this._hjarta.scale.set(1.9)
    this._hjarta.alpha = 0.22

    m.addChild(glas, this._fyll, dager, lock, this._hjarta)
    this._propL.addChild(m)
    this._ritaFyll(0)
  },

  _ritaFyll(v) {
    if (!this._fyll || this._fyll.destroyed) return
    const { x, y, w, h } = MATARE
    const innerW = w - 18
    const innerH = h - 20
    const hojd = Math.max(0, Math.min(1, v)) * innerH
    this._fyll.clear()
    if (hojd < 2) return
    const topp = y + innerH / 2 - hojd
    this._fyll
      .roundRect(x - innerW / 2, topp, innerW, hojd, Math.min(26, hojd / 2))
      .fill(0xffb14a)
    this._fyll
      .ellipse(x, topp + 4, innerW / 2 - 2, 9)
      .fill({ color: 0xffd08a, alpha: 0.9 })
  },

  // -------------------------------------------------------------- omgången ---

  _nyTallrik(ctx) {
    this._rensaMat()
    this._antal = 4 + Math.floor(Math.random() * 3) // 4–6 tuggor mättar magen
    this._atna = 0
    this._fyllNiva = 0
    this._ritaFyll(0)
    if (this._hjarta && !this._hjarta.destroyed) this._hjarta.alpha = 0.22
    this._ledig = PLATSER.map(() => true)
    for (let i = 0; i < Math.min(PLATSER.length, this._antal); i++) this._spawna(ctx, i * 0.07)
  },

  // Vad som läggs upp härnäst. Aldrig två likadana på tallriken samtidigt, och högst en
  // stark åt gången: citronen och chilin är spelets stora skratt, men en tallrik som
  // ALLTID är sur är en tallrik barnet lär sig att undvika.
  _valjMat() {
    const pa = new Set((this._mat || []).filter((r) => !r._uppaten).map((r) => r.data.key))
    const harStark = [...pa].some((k) => k === 'lemon' || k === 'chili')
    const bank = !harStark && Math.random() < 0.3 ? MAT_STARK : FOODS
    const fria = bank.filter((f) => !pa.has(f.key))
    return randomFrom(fria.length ? fria : shuffle(bank)).key
  },

  _spawna(ctx, delay = 0) {
    const i = (this._ledig || []).findIndex(Boolean)
    if (i < 0) return null
    this._ledig[i] = false
    const rec = this._skapaMat(ctx, this._valjMat(), PLATSER[i], i, delay)
    rec._plats = i
    this._mat.push(rec)
    return rec
  },

  // En bit har lämnat tallriken (uppäten ELLER fastnad i ansiktet). Platsen blir ledig.
  _frigor(ctx, rec) {
    if (rec._plats == null) return
    this._ledig[rec._plats] = true
    rec._plats = null
    ctx.later(0.55, () => { if (this._alive && !this._busy) this._paFyllning(ctx) })
  },

  // Tallriken får ALDRIG ta slut medan magen inte är full. Utan påfyllningen kunde barnet
  // busa bort halva rundan och sedan sitta med en tom tallrik där ingenting mer hände —
  // en återvändsgränd, alltså precis det P0 förbjuder. (Mätt: 5 ätna av 6, en busad,
  // finalen kom aldrig.) Bus kostar därför tid och en fläck, aldrig omgången.
  _paFyllning(ctx) {
    const kvar = (this._mat || []).filter((r) => !r._uppaten).length
    let n = Math.min(Math.max(0, this._antal - this._atna), PLATSER.length) - kvar
    while (n-- > 0) if (!this._spawna(ctx)) break
  },

  _skapaMat(ctx, key, [x, y], i, delay = 0) {
    const yttre = new Container() // draget äger den här — inget annat får röra den
    yttre.position.set(x, y)
    yttre.hitArea = new Circle(0, 0, GRIP_R)

    const inre = new Container() // vilorörelsen bor här, så draget aldrig slåss med den
    inre.eventMode = 'none'
    inre.addChild(makeFood(key, 0.75))
    yttre.addChild(inre)
    this._matL.addChild(yttre)

    liv(inre, { bob: 5, sway: 0.04, phase: i * 0.17 })
    // Entrén tweenas på den INRE skalan. `addItem` läser `view.scale.x` som vilo-bas, och
    // en `gsap.from` på den yttre hade satt 0.2 i samma bildruta — draget hade då pinnat
    // 0.2 som föremålets normalstorlek för resten av omgången.
    gsap.from(inre.scale, { x: 0.2, y: 0.2, duration: 0.4, delay, ease: 'back.out(2)' })

    const rec = this._drag.addItem(yttre, { key }, {
      onCorrect: () => this._ata(ctx, rec),
      onMiss: () => this._miss(ctx, rec),
      onSelect: () => ctx.services.audio.tone({ freq: 620, dur: 0.07, vol: 0.16 }),
    })
    rec._inre = inre
    return rec
  },

  // ------------------------------------------------------------------ äta ---

  _ata(ctx, rec) {
    if (!this._alive || rec._uppaten) return
    rec._uppaten = true
    this._idle = 0
    const key = rec.data.key
    const farg = foodColor(key)
    const v = rec.view

    // Maten åker in i munnen: krymper och släcks. Draget har precis kört sin landning —
    // döda den tweenen först, annars drar två tweens i samma skala.
    gsap.killTweensOf(v.scale)
    rec._inre?._fxLiv?.kill()
    gsap.to(v.scale, {
      x: 0.12, y: 0.12, duration: 0.26, ease: 'power2.in',
      onComplete: () => { if (!v.destroyed) v.visible = false },
    })
    gsap.to(v, { y: this._munY + 10, duration: 0.26, ease: 'power2.in' })

    ctx.services.audio.sfx('pop')

    const a = this._ans
    a?.slappMin(0.1)
    ctx.later(0.24, () => {
      if (!this._alive) return
      a?.tugga(3)
      this._smulor(ctx, farg)
      ctx.services.audio.tone({ freq: 200, dur: 0.07, type: 'triangle', vol: 0.2 })
      ctx.services.audio.tone({ freq: 170, dur: 0.07, type: 'triangle', vol: 0.2, delay: 0.22 })
      ctx.services.audio.tone({ freq: 205, dur: 0.07, type: 'triangle', vol: 0.2, delay: 0.44 })
    })

    this._atna += 1
    this._fyllTill(this._atna / this._antal)
    this._frigor(ctx, rec)

    // Sällsynt wow (~1 på 8): grimasen hålls längre, ansiktet skakar och det glittrar.
    const wow = Math.random() < 0.125
    ctx.later(0.92, () => {
      if (!this._alive) return
      const namn = MIN_PER_MAT[key] || 'lycksalig'
      a?.min(namn, { hall: wow ? 2.4 : 1.4 })
      this._sag(ctx, namn)
      if (wow) {
        if (a?.view && !a.view.destroyed) shake(a.view, { intensity: 7, duration: 0.5 })
        sparkle(ctx.fxLayer, ANS.x, this._ogonY, { count: 10 })
      }
      this._replikEfterMin(ctx, namn)
    })

    ctx.later(1.15, () => {
      if (!this._alive) return
      if (this._atna >= this._antal) this._final(ctx)
    })
  },

  _smulor(ctx, farg) {
    for (let i = 0; i < 3; i++) {
      ctx.later(0.1 + i * 0.22, () => {
        if (!this._alive) return
        puff(ctx.fxLayer, ANS.x + (Math.random() - 0.5) * 70, this._munY + 24, { count: 5, color: farg })
      })
    }
  },

  // ------------------------------------------------------------------ bus ---

  // Släpp utanför munnen. Ligger släppet PÅ ansiktet fastnar maten och blir gegga; ligger
  // det utanför har `DragController` redan snäppt hem biten och inget mer behöver hända.
  _miss(ctx, rec) {
    if (!this._alive || rec._uppaten) return
    this._idle = 0
    const dx = (rec.tx - ANS.x) / BUS.rx
    const dy = (rec.ty - ANS.y) / BUS.ry
    if (dx * dx + dy * dy > 1) return

    gsap.killTweensOf(rec.view) // avbryt hemsnäppet — biten stannar i ansiktet
    rec._uppaten = true
    this._gegga(ctx, rec)
    this._frigor(ctx, rec)

    // Miner efter var det landade: högt upp = aj (det studsade på näsan), mitt på =
    // förvånad, i håret/kanten = ett skratt.
    const namn = rec.ty < this._ogonY ? (Math.random() < 0.5 ? 'aj' : 'skratt') : 'forvanad'
    this._ans?.slappMin(0.1)
    this._ans?.min(namn, { hall: 1.3 })
    this._sag(ctx, namn)
    if (this._ans?.view && !this._ans.view.destroyed) shake(this._ans.view, { intensity: 5, duration: 0.34 })
    this._replikEfterMin(ctx, namn)
  },

  _gegga(ctx, rec) {
    const v = rec.view
    const farg = foodColor(rec.data.key)
    const x = rec.tx
    const y = rec.ty

    // Klet UNDER maten, så den ser fastklistrad ut i stället för pålagd.
    const klet = new Graphics()
    const n = 7
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = 26 + Math.random() * 16
      klet.circle(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.6, 13 + Math.random() * 9)
    }
    klet.fill({ color: farg, alpha: 0.5 })
    klet.position.set(x, y)

    const bit = new Container()
    bit.position.set(x, y)
    bit.rotation = (Math.random() - 0.5) * 0.9
    bit.scale.set(0.62)
    bit.eventMode = 'none'
    bit.addChild(makeFood(rec.data.key, 0.75))

    this._geggaL.addChild(klet, bit)
    const g = { klet, bit }
    this._geggor.push(g)
    if (!v.destroyed) v.visible = false

    gsap.from(bit.scale, { x: 0.9, y: 0.9, duration: 0.28, ease: 'back.out(2.4)' })
    puff(ctx.fxLayer, x, y, { count: 6, color: farg })
    ctx.services.audio.sfx('soft')

    // Taket: den äldsta geggan ploppar av. Ansiktet blir aldrig helt övertäckt, och
    // barnet kan busa hur länge det vill utan att spelet stannar.
    if (this._geggor.length > GEGGA_MAX) {
      const gammal = this._geggor.shift()
      this._ploppa(ctx, gammal)
    }
  },

  _ploppa(ctx, g) {
    if (!g) return
    const levande = g.bit && !g.bit.destroyed ? g.bit : null
    const x = levande ? levande.x : 0
    const y = levande ? levande.y : 0
    for (const nod of [g.klet, g.bit]) {
      if (!nod || nod.destroyed) continue
      gsap.to(nod, {
        y: nod.y + 190, alpha: 0, rotation: nod.rotation + 1.2, duration: 0.5, ease: 'power1.in',
        onComplete: () => { if (!nod.destroyed) nod.destroy({ children: true }) },
      })
    }
    if (x || y) puff(ctx.fxLayer, x, y, { count: 4 })
  },

  _torkaRent(ctx) {
    const geggor = this._geggor
    this._geggor = []
    geggor.forEach((g, i) => {
      ctx.later(i * 0.06, () => { if (this._alive) this._ploppa(ctx, g) })
    })
  },

  // ----------------------------------------------------------------- ljud ---

  // Pappas röst: det inspelade klippet om det finns, annars minens stämda signatur.
  _sag(ctx, namn) {
    const r = ROST[namn]
    if (!r) return
    const audio = ctx.services.audio
    if (audio.harSample?.(r.klipp) && audio.sample(r.klipp)) return
    audio.tone({ freq: r.ton[0], dur: 0.3, type: r.typ, vol: 0.22, slideTo: r.ton[1] })
  },

  // Narratorn kommenterar då och då — aldrig efter varje bit, det blir tjat.
  _replikEfterMin(ctx, namn) {
    const voice = ctx.services.voice
    if (namn === 'sur') { voice.say('Oj! Vad surt det var!'); return }
    if (namn === 'forvanad' || namn === 'aj' || namn === 'skratt') {
      if (Math.random() < 0.5) voice.say('Hihi, nu blev det kladdigt!')
      return
    }
    if (Math.random() < 0.35) voice.say('Mmm, det där var gott!')
  },

  // ---------------------------------------------------------------- final ---

  _fyllTill(v) {
    const st = { v: this._fyllNiva }
    this._fyllNiva = v
    gsap.to(st, {
      v, duration: 0.5, ease: 'power2.out',
      onUpdate: () => { if (this._alive) this._ritaFyll(st.v) },
    })
  },

  _final(ctx) {
    if (this._busy) return
    this._busy = true
    const a = this._ans

    if (this._hjarta && !this._hjarta.destroyed) {
      gsap.to(this._hjarta, { alpha: 1, duration: 0.3 })
      pop(this._hjarta, { scale: 1.5 })
    }

    a?.slappMin(0.1)
    a?.min('nojd', { hall: 3 })
    ctx.services.voice.say('Nu är pappa mätt och belåten!')

    // Rapen: en djup, fallande ton (pappas eget klipp när det finns), och vid wow en till.
    ctx.later(0.5, () => {
      if (!this._alive) return
      this._sag(ctx, 'nojd')
      if (a?.view && !a.view.destroyed) shake(a.view, { intensity: 9, duration: 0.6 })
      burst(ctx.fxLayer, ANS.x, this._munY, { count: 18, colors: PLAYFUL })
      if (Math.random() < 0.3) ctx.later(0.7, () => { if (this._alive) this._sag(ctx, 'nojd') })
    })
    ctx.later(1.2, () => {
      if (!this._alive) return
      this._sag(ctx, 'skratt')
      sparkle(ctx.fxLayer, ANS.x, this._ogonY, { count: 12 })
    })

    ctx.progress.complete()

    // Geggan sitter kvar genom hela finalen och torkas av först när nästa tallrik kommer.
    ctx.later(2.6, () => {
      if (!this._alive) return
      this._torkaRent(ctx)
    })
    ctx.later(3.4, () => {
      if (!this._alive) return
      this._busy = false
      this._nyTallrik(ctx)
      ctx.services.voice.say('Mata pappa med maten på tallriken!')
    })
  },

  // ----------------------------------------------------------------- tick ---

  _update(ctx, dtMS) {
    if (!this._alive) return
    const dt = Math.min(60, dtMS)

    // Munnen gapar när maten närmar sig — riggens tydligaste inbjudan. Läs fingrets
    // position (rec.tx/ty), inte den släpande bilden.
    const rec = this._drag?.active
    if (rec && rec.dragging && this._ans && !this._busy) {
      const d = Math.hypot(rec.tx - ANS.x, rec.ty - this._munY)
      const v = Math.max(0, Math.min(1, 1 - (d - 70) / 230))
      if (Math.abs(v - (this._gapNu ?? 0)) > 0.01) {
        this._gapNu = v
        this._ans.gap(v)
      }
    } else if (this._gapNu > 0 && !this._busy) {
      this._gapNu = Math.max(0, this._gapNu - dt / 260)
      this._ans?.gap(this._gapNu)
    }

    // Mjuk om-cue vid stillhet — en fråga, aldrig en tillsägelse.
    this._idle += dt
    if (this._idle > 6800 && !this._busy) {
      this._idle = 0
      const kvar = (this._mat || []).filter((r) => !r._uppaten)
      if (kvar.length) {
        const r = randomFrom(kvar)
        if (r?.view && !r.view.destroyed) wiggle(r.view)
        const harChili = kvar.some((m) => m.data.key === 'chili')
        this._cueVaxel += 1
        if (harChili && this._cueVaxel % 2 === 1) ctx.services.voice.say('Vad tror du händer om pappa smakar chilin?')
        else ctx.services.voice.say('Titta, pappa tuggar och tuggar!')
      }
    }
  },

  // --------------------------------------------------------------- städning ---

  _rensaMat() {
    for (const rec of this._mat || []) {
      if (rec._inre) {
        rec._inre._fxLiv?.kill()
        gsap.killTweensOf(rec._inre)
      }
      if (!rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        rec.view.destroy({ children: true })
      }
    }
    this._mat = []
    // Föremålen är borta — dragets register måste följa med, annars pekar det på
    // förstörda noder. Målet (munnen) sätts tillbaka direkt.
    this._drag?.clear()
    if (this._mun && !this._mun.destroyed) this._drag?.addTarget(this._mun, () => true, { hitRadius: MUN_R })
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._tick = null
    if (this._vakna && this._root && !this._root.destroyed) this._root.off('pointerdown', this._vakna)
    this._vakna = null

    for (const rec of this._mat || []) {
      rec._inre?._fxLiv?.kill()
      if (!rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
      }
    }
    for (const g of this._geggor || []) {
      for (const nod of [g.klet, g.bit]) if (nod && !nod.destroyed) gsap.killTweensOf(nod)
    }
    this._geggor = []
    this._mat = []
    if (this._hjarta && !this._hjarta.destroyed) gsap.killTweensOf(this._hjarta)
    gsap.killTweensOf(this._fyll)

    this._drag?.destroy()
    this._drag = null
    // `shake` lägger sin tween på ett proxy-objekt utanför riggens egen bokföring.
    this._ans?.view?._fxShakeTw?.kill()
    this._ans?.destroy()
    this._ans = null
    this._root?.destroy({ children: true })
    this._root = null
    this._mun = null
    this._fyll = null
    this._hjarta = null
  },
}
