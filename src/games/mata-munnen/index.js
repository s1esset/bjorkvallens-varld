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
import { ANS, BANK_Y, MATARE, OPPNA_MAX, PLATSER, byggKok } from './kok.js'
import { arAtbar, makeSak, sakFarg, sakMin } from './skafferi.js'
import { DragController } from '../../lib/DragController.js'
import { FOODS, MAT_STARK, makeFood, foodColor } from '../../lib/mat.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { burst, kvittera, liv, pop, puff, ripple, sparkle, shake, wiggle } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'

// --- geometri (designkoordinater 1280×720) ---
// ANS · PLATSER · MATARE · BRADA bor i `kok.js`: köksön räknas ur ansiktets halslinje, och
// maten ligger på skärbrädan som köket ritar. En andra uppsättning tal här hade drivit isär.
const MUN_R = 130                // snäppradie till munnen (P0: träffyta ≫96 px)
const BUS = { rx: 215, ry: 250 } // ansiktets ellips — utanför den är det en ren miss
const GRIP_R = 52
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
    this._oppnaSt = []
    this._stationer = []
    this._vatten = false
    this._spisPa = false
    this._flaktPa = false

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lagerordning — den är hela lösningen på det svävande huvudet:
    //   köket bakom → ansikte → gegga (ovanpå ansiktet) → KÖKSÖN (framför ansiktet, skär
    //   halsen) → burken och annat som står på bänken → mat (överst, så en bit som dras
    //   aldrig försvinner bakom hakan eller under bänkskivan).
    const kok = byggKok(ctx)
    this._noder = kok.noder
    this._root.addChild(kok.bakgrund)

    this._ansL = new Container()
    this._ansL.eventMode = 'none'
    this._root.addChild(this._ansL)

    this._geggaL = new Container()
    this._geggaL.eventMode = 'none'
    this._geggaL.interactiveChildren = false
    this._root.addChild(this._geggaL)

    this._root.addChild(kok.framgrund)

    // Kökets träffytor. Ligger ovanför köksön (så öns luckor går att trycka på) men
    // under maten (så en matbit alltid vinner pekningen över luckan bakom den).
    this._klickL = new Container()
    this._root.addChild(this._klickL)

    this._propL = new Container()
    this._propL.eventMode = 'none'
    this._root.addChild(this._propL)

    this._matL = new Container()
    this._root.addChild(this._matL)

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
    this._byggStationer(ctx, kok.stationer)

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

  // Mättnadsmätaren: en burk som fylls. Den kan bara STIGA — ingen poäng som sjunker (P0).
  _ritaMatare() {
    const m = new Container()
    m.eventMode = 'none'
    const { x, y, w, h } = MATARE
    // Burken står på köksöns bänkskiva och behöver en skugga för att göra det —
    // ett glas utan skugga svävar precis som huvudet gjorde.
    const skugga = new Graphics()
      .ellipse(x, y + h / 2 - 2, w / 2 + 6, 13)
      .fill({ color: 0x6b4a2c, alpha: 0.2 })
    const glas = new Graphics()
      .roundRect(x - w / 2, y - h / 2, w, h, 30)
      .fill({ color: 0xffffff, alpha: 0.5 })
      .stroke({ width: 7, color: 0xb08a5c })
    const lock = new Graphics()
      .roundRect(x - w / 2 - 9, y - h / 2 - 24, w + 18, 32, 13)
      .fill(0xd9a05b)
      .stroke({ width: 6, color: 0x9a6535 })
      .roundRect(x - w / 2 - 4, y - h / 2 - 19, w + 8, 8, 4)
      .fill({ color: 0xffffff, alpha: 0.3 })

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
    // Hjärtat sitter PÅ locket, inte ovanför det: i köksbilden fanns 34 px luft mellan
    // dem och hjärtat läste som en dekal på väggen bakom burken.
    this._hjarta.position.set(x, y - h / 2 - 22)
    this._hjarta.scale.set(1.4)
    this._hjarta.alpha = 0.28

    m.addChild(skugga, glas, this._fyll, dager, lock, this._hjarta)
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

  // ETT sätt att skapa ett dragbart föremål, oavsett var det kommer ifrån. `data` bär
  // allt resten av spelet behöver veta: färgen (gegga + smulor), grimasen och om saken
  // går att äta. Utan den gemensamma formen hade brädans mat och skåpens prylar behövt
  // varsin gren genom `_ata`, `_miss` och `_gegga`.
  _skapaFor(ctx, data, [x, y], i, delay = 0) {
    const yttre = new Container() // draget äger den här — inget annat får röra den
    yttre.position.set(x, y)
    yttre.hitArea = new Circle(0, 0, GRIP_R)

    const inre = new Container() // vilorörelsen bor här, så draget aldrig slåss med den
    inre.eventMode = 'none'
    inre.addChild(data.vy())
    yttre.addChild(inre)
    this._matL.addChild(yttre)

    liv(inre, { bob: 5, sway: 0.04, phase: i * 0.17 })
    // Entrén tweenas på den INRE skalan. `addItem` läser `view.scale.x` som vilo-bas, och
    // en `gsap.from` på den yttre hade satt 0.2 i samma bildruta — draget hade då pinnat
    // 0.2 som föremålets normalstorlek för resten av omgången.
    gsap.from(inre.scale, { x: 0.2, y: 0.2, duration: 0.4, delay, ease: 'back.out(2)' })

    const rec = this._drag.addItem(yttre, data, {
      onCorrect: () => this._ata(ctx, rec),
      onMiss: () => this._miss(ctx, rec),
      onSelect: () => ctx.services.audio.tone({ freq: 620, dur: 0.07, vol: 0.16 }),
    })
    rec._inre = inre
    return rec
  },

  // Brädans mat: alltid ätlig, alltid det som driver målet framåt.
  _skapaMat(ctx, key, plats, i, delay = 0) {
    return this._skapaFor(ctx, {
      key,
      farg: foodColor(key),
      min: MIN_PER_MAT[key] || 'lycksalig',
      atbar: true,
      vy: () => makeFood(key, 0.75),
    }, plats, i, delay)
  },

  // ------------------------------------------------------------ köket ---

  // Varje station får en egen, osynlig träffyta i ett eget lager mellan köket och maten.
  // Den ligger UNDER `_matL`, så en matbit som råkar hamna över en lucka alltid vinner
  // pekningen — det är maten barnet siktar på.
  _byggStationer(ctx, stationer) {
    this._stationer = stationer
    this._oppnaSt = []
    for (const st of stationer) {
      const { x, y, w, h } = st.yta
      const hit = new Graphics().rect(x, y, w, h).fill({ color: 0xffffff, alpha: 0 })
      hit.eventMode = 'static'
      hit.cursor = 'pointer'
      st._tryck = () => this._tryckStation(ctx, st)
      hit.on('pointertap', st._tryck)
      st._hit = hit
      this._klickL.addChild(hit)
    }
  },

  _tryckStation(ctx, st) {
    this._idle = 0
    if (!this._alive || this._busy) return
    kvittera(ctx.fxLayer, st.yta.x + st.yta.w / 2, st.yta.y + st.yta.h / 2, ctx.services.audio,
      { color: 0xffe3b0, maxR: 74 })
    if (st.typ === 'knapp') return this._knapp(ctx, st)
    if (st.oppen) return this._stangStation(ctx, st)

    // Taket: högst OPPNA_MAX luckor öppna samtidigt. Den äldsta stängs — samma sorts
    // gräns som geggans, och av samma skäl (P0 MOTGÅNG: tak på hur mycket samtidigt).
    while (this._oppnaSt.length >= OPPNA_MAX) this._stangStation(ctx, this._oppnaSt[0])

    st.oppna()
    this._oppnaSt.push(st)
    ctx.services.audio.sfx('soft')
    ctx.services.audio.tone({ freq: 330, dur: 0.1, vol: 0.16, slideTo: 470 })

    // Innehållet lottas per öppning, så samma skåp inte ger samma sak varje gång.
    st._saker = []
    const val = shuffle([...st.innehall]).slice(0, st.platser.length)
    val.forEach((key, i) => {
      const rec = this._skapaFor(ctx, {
        key,
        farg: sakFarg(key),
        min: sakMin(key),
        atbar: arAtbar(key),
        vy: () => makeSak(key),
      }, st.platser[i], i, 0.1 + i * 0.08)
      rec._station = st
      st._saker.push(rec)
      this._mat.push(rec)
    })
    if (Math.random() < 0.6) ctx.services.voice.say('Titta vad som fanns där inne!')
  },

  _stangStation(ctx, st) {
    const i = this._oppnaSt.indexOf(st)
    if (i >= 0) this._oppnaSt.splice(i, 1)
    if (!st.oppen) return
    st.stang()
    ctx.services.audio.sfx('soft')
    // Det som ligger kvar åker in i skåpet igen. Det får inte bara försvinna: en sak som
    // blinkar bort mitt framför barnet läser som att den gick sönder.
    for (const rec of st._saker || []) this._plockaTillbaka(ctx, rec)
    st._saker = []
  },

  _plockaTillbaka(ctx, rec) {
    if (!rec || rec._uppaten) return
    rec._uppaten = true
    this._drag?.removeItem?.(rec.view)
    const v = rec.view
    if (v.destroyed) return
    rec._inre?._fxLiv?.kill()
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, { x: 0.1, y: 0.1, duration: 0.24, ease: 'power2.in' })
    gsap.to(v, { alpha: 0, duration: 0.24,
      onComplete: () => { if (!v.destroyed) v.destroy({ children: true }) } })
  },

  // Stationerna som inte öppnar något utan GÖR något. Alla är växlar: tryck igen och det
  // slutar. Ingen av dem kan misslyckas, och ingen av dem påverkar målet.
  _knapp(ctx, st) {
    const n = this._noder
    const audio = ctx.services.audio
    if (st.id === 'diskho') {
      this._vatten = !this._vatten
      if (n.strale) {
        n.strale.visible = true
        gsap.killTweensOf(n.strale.scale)
        gsap.to(n.strale.scale, { y: this._vatten ? 1 : 0.02, duration: 0.22,
          onComplete: () => { if (!this._vatten && n.strale && !n.strale.destroyed) n.strale.visible = false } })
      }
      audio.tone({ freq: this._vatten ? 620 : 300, dur: 0.12, type: 'sine', vol: 0.16 })
      if (this._vatten) ctx.services.voice.say('Vattnet rinner!')
      return
    }
    if (st.id === 'spis') {
      this._spisPa = !this._spisPa
      if (n.plattor) gsap.to(n.plattor, { alpha: this._spisPa ? 1 : 0.35, duration: 0.3 })
      audio.tone({ freq: this._spisPa ? 240 : 180, dur: 0.16, type: 'triangle', vol: 0.16 })
      if (this._spisPa) ctx.services.voice.say('Nu kokar det i kastrullen!')
      return
    }
    if (st.id === 'flakt') {
      this._flaktPa = !this._flaktPa
      audio.tone({ freq: this._flaktPa ? 180 : 140, dur: 0.2, type: 'sawtooth', vol: 0.1 })
      if (this._flaktPa) ctx.services.voice.say('Fläkten surrar!')
      return
    }
    if (st.id === 'fonster') {
      // Fågeln landar på fönsterblecket, kvittrar och flyger iväg igen.
      const f = n.fagel
      audio.tone({ freq: 880, dur: 0.09, vol: 0.18, slideTo: 1180 })
      audio.tone({ freq: 990, dur: 0.09, vol: 0.16, slideTo: 1320, delay: 0.14 })
      if (n.sol) pop(n.sol, { scale: 1.35 })
      if (f && !f.destroyed && !f.visible) {
        f.visible = true
        f.alpha = 0
        gsap.killTweensOf(f)
        gsap.to(f, { alpha: 1, y: 118, duration: 0.3, ease: 'back.out(2)' })
        gsap.to(f, { alpha: 0, y: 82, duration: 0.45, delay: 2.4, ease: 'power1.in',
          onComplete: () => { if (!f.destroyed) { f.visible = false; f.y = 118 } } })
        ctx.services.voice.say('En fågel kom och tittade in!')
      }
    }
  },

  // Vilorörelser i köket som bara går när något är påslaget. Ligger i spelets tick, så
  // ingenting tickar vidare efter att spelet lämnats.
  _kokTick(ctx, dt) {
    const n = this._noder
    if (this._flaktPa && n.flakthjul && !n.flakthjul.destroyed) n.flakthjul.rotation += dt * 0.012
    this._angT = (this._angT || 0) + dt
    if (this._angT > 620) {
      this._angT = 0
      if (this._spisPa && n.gryta) {
        puff(ctx.fxLayer, n.gryta.x + (Math.random() - 0.5) * 30, n.gryta.y - 10,
          { count: 4, color: 0xffffff })
      }
      if (this._vatten && n.ho) {
        puff(ctx.fxLayer, n.ho.x + (Math.random() - 0.5) * 24, n.ho.y - 4,
          { count: 3, color: 0x8fd6f5 })
      }
    }
  },

  // ------------------------------------------------------------------ äta ---

  // Något oätligt hamnade i munnen. Pappa smakar, grimaserar och spottar ut det — och
  // saken landar tillbaka på bänken i stället för att bara upphöra.
  _spotta(ctx, rec) {
    const v = rec.view
    const a = this._ans
    ctx.services.audio.sfx('pop')
    a?.slappMin(0.1)
    a?.tugga(1)
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    rec._inre?._fxLiv?.kill()
    gsap.to(v.scale, { x: 0.4, y: 0.4, duration: 0.16, ease: 'power2.in' })
    ctx.later(0.34, () => {
      if (!this._alive) return
      a?.min(rec.data.min || 'acklad', { hall: 1.4 })
      this._sag(ctx, rec.data.min || 'acklad')
      if (a?.view && !a.view.destroyed) shake(a.view, { intensity: 8, duration: 0.42 })
      if (!v.destroyed) {
        // Ut ur munnen i en båge, ner mot bänken och bort. Riktningen slumpas så två
        // utspottade saker aldrig följer exakt samma väg.
        const ut = (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 90)
        gsap.to(v, { x: v.x + ut, duration: 0.6, ease: 'power1.out' })
        gsap.to(v, { y: BANK_Y - 30, duration: 0.6, ease: 'power2.in' })
        gsap.to(v.scale, { x: 0.7, y: 0.7, duration: 0.6 })
        gsap.to(v, { alpha: 0, duration: 0.3, delay: 0.55,
          onComplete: () => { if (!v.destroyed) v.destroy({ children: true }) } })
      }
      puff(ctx.fxLayer, ANS.x, this._munY + 20, { count: 8, color: rec.data.farg })
      if (Math.random() < 0.6) ctx.services.voice.say('Blää, det där gick inte att äta!')
    })
    this._frigor(ctx, rec)
  },

  _ata(ctx, rec) {
    if (!this._alive || rec._uppaten) return
    rec._uppaten = true
    this._idle = 0
    const key = rec.data.key
    const farg = rec.data.farg
    const v = rec.view

    // Oätligt går inte in i magen. Pappa smakar, grimaserar och spottar ut — stor
    // reaktion, noll framsteg, och aldrig ett fel. (P0: bestraffa inte, blockera inte.)
    if (rec.data.atbar === false) return this._spotta(ctx, rec)

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
      const namn = rec.data.min || 'lycksalig'
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
    // Miner efter var det landade — men en spindel i pannan är inte samma sak som en
    // banan i pannan, så en sak med egen stark min (`aj`, `acklad`) behåller sin.
    const egen = rec.data.min === 'aj' || rec.data.min === 'acklad' ? rec.data.min : null
    const namn = egen || (rec.ty < this._ogonY ? (Math.random() < 0.5 ? 'aj' : 'skratt') : 'forvanad')
    this._ans?.slappMin(0.1)
    this._ans?.min(namn, { hall: 1.3 })
    this._sag(ctx, namn)
    if (this._ans?.view && !this._ans.view.destroyed) shake(this._ans.view, { intensity: 5, duration: 0.34 })
    this._replikEfterMin(ctx, namn)
  },

  _gegga(ctx, rec) {
    const v = rec.view
    const farg = rec.data.farg
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
    bit.addChild(rec.data.vy())

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
    this._kokTick(ctx, dt)

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
    // Öppna luckor hör till den gamla omgången. Stängs de inte här ligger deras poster
    // kvar i `_saker` och pekar på vyer som `clear()` strax river.
    for (const st of [...(this._oppnaSt || [])]) {
      st.stang()
      st._saker = []
    }
    this._oppnaSt = []
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

    for (const st of this._stationer || []) {
      if (st._hit && !st._hit.destroyed && st._tryck) st._hit.off('pointertap', st._tryck)
      st._tryck = null
      st.stada?.()
      for (const rec of st._saker || []) {
        if (rec?.view && !rec.view.destroyed) {
          gsap.killTweensOf(rec.view)
          gsap.killTweensOf(rec.view.scale)
        }
      }
      st._saker = []
    }
    this._stationer = []
    this._oppnaSt = []

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
