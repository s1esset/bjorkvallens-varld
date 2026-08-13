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
import { Circle, Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { ANS, BANK_Y, BRADA, FYSIK, KANT_Y, MATARE, OPPNA_MAX, PLATSER, byggKok } from './kok.js'
import { arAtbar, makeSak, sakFarg, sakMaterial, sakMin } from './skafferi.js'
import { DragController } from '../../lib/DragController.js'
import { Body, PhysicsWorld, mat } from '../../lib/physics.js'
import { FLUIDS, FluidView, FluidWorld } from '../../lib/vatska.js'
import { makeMjukkropp } from '../../lib/mjukkropp.js'
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
const LOSA_MAX = 8  // samma sorts tak för högen på bänken

// Vilka saker som bär vätska, och vilken. Varken apelsinsaft eller mjölk finns i `FLUIDS`
// (den har rött och vitt saknas helt), så de två har egna tal. Saften är GLASETS färg —
// `FLUIDS.saft` är röd och läste som utspillt bär mitt i ett orange glas.
// EN vätskevärld bär alla fyra, färgade per partikel via `FluidView.palette` — det är
// precis vad biblioteket har den för. Alternativet (en värld per vätska) hade betytt fyra
// uppsättningar sprites och fyra filterpass för något barnet ser ett i taget.
const VATSKOR = [
  { key: 'vatten', color: 0x5ec8f0 },      // kranen
  { key: 'glas_saft', color: 0xf59a2e },   // apelsinsaft — GLASETS färg, inte FLUIDS röda
  { key: 'mjolk', color: 0xf6fbfd },
  { key: 'honung', color: FLUIDS.honung.color },
]
const PALETT = VATSKOR.map((v) => v.color)
const SPILL = Object.fromEntries(VATSKOR.map((v, i) => [v.key, i]))

// Diskhons botten och sidor, som kranens vatten samlas i. Ovalen i bilden ligger på
// (322, 240) med rx 56 — kärlet ritas en aning innanför den så vattnet syns i porslinet.
const HO = { x: 322, y: 240, bottenY: 258, v: 264, h: 380 }

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
    this._losa = []

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

    // Vätskelagret ligger UNDER maten: en pöl är på bänken, inte ovanpå det som ligger där.
    this._vatskaL = new Container()
    this._vatskaL.eventMode = 'none'
    this._root.addChild(this._vatskaL)

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

    this._startaFysik(ctx)
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
    // Plockas en liggande sak upp måste dess kropp dö FÖRST. `onSelect` duger inte —
    // den kör bara vid tapp utan drag. Draget skriver `view.x` varje bildruta och
    // fysiken gör samma sak; två skrivare till samma fält är hackighet, inte en bugg
    // som syns i en logg.
    rec._grepp = () => this._lyftLos(rec)
    yttre.on('pointerdown', rec._grepp)
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
      mtrl: 'tra',
      vy: () => makeFood(key, 0.75),
    }, plats, i, delay)
  },

  // ----------------------------------------------------------- fysiken ---

  // Bänkskivan är ett riktigt fysikbord. Allt som lämnar spelet på annat sätt än att bli
  // uppätet — utspottade prylar, gegga som ploppar av ansiktet, mat som släpps på bänken
  // — faller ner hit, studsar med sitt eget materials röst och lägger sig i en hög.
  //
  // ⚠️ Väggarna är OPT-IN mot öns kanter, inte mot `ctx.view`. En bred telefon hade annars
  //    fått en annan spelplan än den testade, och saker hade kunnat vila i bleed-zonen.
  _startaFysik(ctx) {
    this._phys = new PhysicsWorld({
      gravityY: 1,
      walls: ['floor', 'left', 'right'],
      bounds: { left: FYSIK.v, top: -600, right: FYSIK.h, bottom: FYSIK.golv },
    })
    this._phys.impactAudio(ctx.services.audio, { standard: 'tra', vol: 0.2, minSpeed: 2.2 })
    this._losa = []
  },

  // Gör en vy till en fallande kropp. Vyn ägs fortfarande av draget, så saken går att
  // plocka upp igen — och DÄRFÖR måste kroppen dö i samma sekund den lyfts (`_lyftLos`).
  // Två skrivare till samma `view.x` är den klassiska varianten av "det ryckte".
  _gorLos(ctx, rec, { vx = 0, vy = 0 } = {}) {
    if (!this._phys || !this._alive) return
    const v = rec.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    rec._inre?._fxLiv?.kill()
    v.visible = true
    v.alpha = 1

    // Saken har LÄMNAT sitt skåp. Står den kvar i stationens lista river `_plockaTillbaka`
    // vyn när luckan stängs — medan fysikkroppen fortsätter skriva till den. (Uppmätt:
    // `Cannot read properties of null (reading 'x')` i _kokprobe, första körningen.)
    if (rec._station?._saker) {
      const i = rec._station._saker.indexOf(rec)
      if (i >= 0) rec._station._saker.splice(i, 1)
    }

    // SJUHÖRNING, inte cirkel. En cirkel rullar nästan utan motstånd i matter — högen
    // kröp 8,0 px per 700 ms långt efter att sista saken landat, alltså aldrig riktigt
    // still (`_stillaprobe`s fråga, ställd mot det här spelet). Och det är inte bollar
    // som ligger på bänken: en gaffel och en kastrull ska lägga sig, inte rulla iväg.
    const namn = rec.data.mtrl || 'tra'
    const b = this._phys.polygon(v.x, v.y, 7, 34, mat(namn, { label: 'los' }))
    Body.setVelocity(b, { x: vx, y: vy })
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.14)
    if (SPILL[rec.data.key]) this._spill(ctx, v.x, v.y + 10, rec.data.key)
    this._phys.link(b, v)
    rec._kropp = b
    this._losa.push(rec)

    // Taket. Samma princip som geggans: den äldsta försvinner så högen aldrig äter
    // bänken (P0 MOTGÅNG — tak på hur mycket som kan ligga och skräpa samtidigt).
    while (this._losa.length > LOSA_MAX) this._stadaLos(ctx, this._losa[0])
  },

  // ---------------------------------------------------------- vätskan ---

  // Ägaren bad om vätska två gånger ("vätska", "glas med vätskor"). Den ligger DÄR den
  // syns och gör något: ett glas saft eller ett mjölkpaket som pappa spottar ut TÖMS
  // över bänkskivan, och pölen rinner runt allt annat som ligger där.
  //
  // Två val som är kostnad, inte smak:
  //  · EN vätskevärld, och den skapas först när något faktiskt spills. `FluidView`
  //    allokerar en sprite per partikel och lägger två filterpass över sin `area` varje
  //    bildruta — ett kök som aldrig spiller ska inte betala för det.
  //  · `area` är bänkbandet, inte designytan. Förvalet (1520×1080) är 9× dyrare än det
  //    här bandet, och den notan betalas i tappade WebGL-kontexter i ANDRA spel när
  //    sviten kör fyra webbläsare parallellt.
  // Skapar vätskevärlden om den inte finns. Den sträcker sig från diskhon (kranen) ner
  // till bänkskivan (pölarna) — ETT fält, fyra färger.
  _sakraVatska() {
    if (this._vatskaV) return this._vatskaV
    const b = { left: FYSIK.v, right: FYSIK.h, top: 150, bottom: FYSIK.golv + 10 }
    this._vatskaV = new FluidWorld({
      max: 116, radius: 20, gravityY: 0.5, bounds: b,
      walls: { left: true, right: true, bottom: true, top: false },
      rho0: 5.2, sigma: 0.1, beta: 0.16, restitution: 0.06, wallFriction: 0.5,
    })
    // Diskhons kärl sätts upp i `_vatskaTick`, inte här: varje bildruta börjar med
    // `clearColliders()`.
    this._vatskaVy = new FluidView(this._vatskaL, this._vatskaV, {
      // Låg blur + hög tröskel: en pöl ska ha en KANT. Med förvalen (blur 9, tröskel
      // 0,42) blev samma partiklar en glödande dimma tvärs hela bänken.
      palette: PALETT, edge: 0xe8f7ff, blur: 6, threshold: 0.52, blobScale: 1.2, resolution: 0.5,
      area: new Rectangle(b.left - 30, b.top - 20, b.right - b.left + 60, b.bottom - b.top + 60),
    })
    return this._vatskaV
  },

  _spill(ctx, x, y, sort) {
    const pal = SPILL[sort]
    if (pal == null || !this._alive) return
    const w = this._sakraVatska()
    // Tätt och lugnt. Första försöket sköt iväg dem med ±3,2 px/steg i sidled och 46
    // partiklar smetade då ut sig över hela bänkens 788 px — en hinna, inte en pöl.
    for (let i = 0; i < 58; i++) {
      w.spawn(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 14, {
        vx: (Math.random() - 0.5) * 1.3, vy: -0.4 - Math.random() * 1.4, pal,
      })
    }
    ctx.services.audio.sfx('soft')
    this._torkT = 0
  },

  // Pölen torkar upp av sig själv. Utan det ligger en vätskevärld och kostar för alltid
  // (`fxLayer`-fällan i CLAUDE.md, en våning upp: allt som cachas på ett långlivat lager
  // måste kunna rivas när det är tomt).
  _vatskaTick(ctx, dt) {
    // Kranen häller RIKTIGT vatten i hon. Den ritade strålen är kvar som stråle — det är
    // pölen i porslinet som är vätska. Att låta kranen bara skala en grafik medan samma
    // fil bär en fungerande vätskemotor var det som fick kranen att ljuga.
    if (this._vatten && this._alive) {
      this._kranT = (this._kranT || 0) + dt
      if (this._kranT > 90) {
        this._kranT = 0
        this._sakraVatska().spawn(HO.x - 4 + (Math.random() - 0.5) * 8, 232, {
          vx: (Math.random() - 0.5) * 0.6, vy: 2.4, pal: 0,
        })
      }
    }
    const w = this._vatskaV
    if (!w) return
    // Avloppet: hon rinner ut hela tiden, så nivån håller sig och kranen kan stå på hur
    // länge som helst utan att skölja över bänken.
    this._avloppT = (this._avloppT || 0) + dt
    if (this._avloppT > 240) {
      this._avloppT = 0
      w.drain(HO.x, HO.bottenY - 6, 120, 30, { max: 2 })
    }
    // Kollisionskropparna matas in på nytt varje bildruta: högen rör sig, och en pöl som
    // rinner genom en kastrull är inte en pöl.
    //
    // ⚠️ DISKHON MÅSTE LÄGGAS TILLBAKA HÄR. `clearColliders()` tömmer HELA listan, så
    //    kärlet som sattes upp en gång vid `_sakraVatska()` försvann i första bildrutan
    //    efteråt — kranens vatten rann rakt igenom porslinet och sögs bort av avloppet
    //    innan det hann synas (uppmätt: 0 partiklar i hon efter 2,6 s med kranen på).
    w.clearColliders()
    w.addBox(HO.x, HO.bottenY, 132, 12)
    w.addBox(HO.v, HO.y, 12, 44)
    w.addBox(HO.h, HO.y, 12, 44)
    for (const rec of this._losa) {
      if (rec._kropp && rec.view && !rec.view.destroyed) w.addCircle(rec.view.x, rec.view.y, 30)
    }
    w.update(dt)
    this._vatskaVy?.update()

    this._torkT = (this._torkT || 0) + dt
    if (this._torkT > 5000 && !this._vatten) {
      this._torkStep = (this._torkStep || 0) + dt
      if (this._torkStep > 150) {
        this._torkStep = 0
        // ⚠️ `drain(x, y, w, h)` tar ett CENTRUM, inte ett hörn. Med hörnet inskickat
        // låg avloppet på x −248..632 medan pölen samlats kring 430..830 — den torkade
        // då bara på vänstra halvan (uppmätt 57 → 29 partiklar på elva sekunder, och
        // världen levde vidare). Samma sorts tyst enhetsfel som CLAUDE.md varnar för.
        w.drain((FYSIK.v + FYSIK.h) / 2, (KANT_Y + FYSIK.golv) / 2,
          FYSIK.h - FYSIK.v + 120, FYSIK.golv - KANT_Y + 400, { max: 7 })
        if (w.count <= 0) this._rivVatska()
      }
    }
  },

  _rivVatska() {
    this._vatskaVy?.destroy()
    this._vatskaVy = null
    this._vatskaV?.destroy()
    this._vatskaV = null
    this._torkT = 0
  },

  _lyftLos(rec) {
    if (!rec?._kropp) return
    this._phys?.removeBody(rec._kropp)
    rec._kropp = null
    const i = this._losa.indexOf(rec)
    if (i >= 0) this._losa.splice(i, 1)
    if (rec.view && !rec.view.destroyed) rec.view.rotation = 0
  },

  _stadaLos(ctx, rec, forsening = 0) {
    if (!rec) return
    this._lyftLos(rec)
    this._drag?.removeItem?.(rec.view)
    rec._uppaten = true
    const v = rec.view
    if (!v || v.destroyed) return
    ctx.later(forsening, () => {
      if (!this._alive || v.destroyed) return
      puff(ctx.fxLayer, v.x, v.y, { count: 5, color: rec.data.farg })
      gsap.to(v, { alpha: 0, duration: 0.3,
        onComplete: () => { if (!v.destroyed) v.destroy({ children: true }) } })
      gsap.to(v.scale, { x: 0.2, y: 0.2, duration: 0.3 })
    })
  },

  // Sopa bänken ren. Körs i finalen, i takt — allt på en gång läser som en bugg.
  _sopaBanken(ctx) {
    const alla = [...(this._losa || [])]
    alla.forEach((rec, i) => this._stadaLos(ctx, rec, i * 0.07))
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
    if (!this._alive) return
    // ⚠️ Återkopplingen kommer FÖRE upptagen-spärren. Låg `kvittera` efter den blev varje
    //    tryck på en lucka under rapfinalen (3,4 s) helt tyst — och en station svarar inte
    //    via `_tomtTryck`, för den pekningen når aldrig roten. Det är P0-brottet
    //    `dod-traffyta` (se `scripts/_tystprobe.mjs`), och sondens mönstermatchning
    //    fångade det inte: den letar efter kända handlarnamn.
    kvittera(ctx.fxLayer, st.yta.x + st.yta.w / 2, st.yta.y + st.yta.h / 2, ctx.services.audio,
      { color: 0xffe3b0, maxR: 74 })
    if (this._busy) return
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
        mtrl: sakMaterial(key),
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
    this._lyftLos(rec) // bältet till hängslet: ingen kropp får överleva sin vy
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
        // TVÅ saker som möts: står fläkten också på SUGS ångan upp i kåpan. Det är den
        // billigaste "objekten interagerar med varandra" som finns i köket, och den enda
        // som syns utan att man rör något.
        if (this._flaktPa) {
          for (let i = 1; i <= 3; i++) {
            ctx.later(i * 0.11, () => {
              if (!this._alive || !this._flaktPa || !this._spisPa) return
              const t = i / 3
              puff(ctx.fxLayer, n.gryta.x + (956 - n.gryta.x) * t + (Math.random() - 0.5) * 16,
                n.gryta.y - 10 + (104 - (n.gryta.y - 10)) * t,
                { count: 3, color: 0xffffff })
            })
          }
        }
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
        // Ut ur munnen som en RIKTIG kastad kropp: gaffeln flyger, studsar på bänken och
        // blir liggande bland allt annat. Att bara tona bort den vore att säga att saken
        // upphörde att finnas — det här säger att pappa spottade ut den.
        v.scale.set(rec.view._fxRestScale?.x ?? 1, rec.view._fxRestScale?.y ?? 1)
        rec._uppaten = false
        this._gorLos(ctx, rec, {
          vx: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 4),
          vy: -7 - Math.random() * 3,
        })
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

    // Kleten under maten är en MJUK KROPP — och bara den NYASTE. Det är hela regeln för
    // mjuka kroppar i det här repot: gör bara det mjukt som deformeras just nu (CLAUDE.md,
    // `pruttbad` mätte högst 3 samtidigt). En klick som splattar ut vid nedslaget och
    // sedan lägger sig är skillnaden mot en fläck som bara dyker upp färdig.
    //
    // Den fryser efter 1,4 s: sista ritningen ligger kvar i sin `Graphics`, kroppen
    // slängs, och nästa gegga får bli den mjuka. Aldrig mer än EN i taget.
    this._frysGegga()
    const klet = new Graphics()
    // VILOFORMEN är redan utsplattad (bred och låg) — det är så en klick som träffat ett
    // ansikte ser ut. Första försöket byggde en rund kropp och knuffade ut den vid
    // nedslaget; mätningen mot en oknuffad kontrollarm visade att hela deformationen var
    // borta efter SEX steg (88 → 78 px på 0,1 s), alltså osynlig. Kroppen bär nu formen,
    // och det mjuka är VOBBELN när den landar: låg styvhet + hög dämpning ger en
    // svängning som lägger sig över ungefär en sekund.
    const kropp = makeMjukkropp({
      x, y, w: 84, h: 44, punkter: 12, grav: 0,
      damp: 0.93, iter: 4, tryck: 1.04, styvhet: 0.16,
    })
    kropp.knuff(x, y - 26, 14, 90) // nedslaget uppifrån: klicken trycks ihop och studsar
    this._mjuk = { kropp, g: klet, farg, t: 0, acc: 0 }

    const bit = new Container()
    bit.position.set(x, y)
    bit.rotation = (Math.random() - 0.5) * 0.9
    bit.scale.set(0.62)
    bit.eventMode = 'none'
    bit.addChild(rec.data.vy())

    this._geggaL.addChild(klet, bit)
    const g = { klet, bit, farg, kropp }
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

  // Geggan ploppar av ansiktet och FALLER NER PÅ BÄNKEN. Tidigare tonade den bara bort
  // på vägen ner, vilket sa att den upphörde att finnas; nu landar den bland allt annat
  // och knuffar undan det som redan ligger där. Kleten följer inte med — den är en fläck
  // på huden, inte ett föremål.
  // Frys den mjuka geggan: sluta stega, behåll bilden. Utan detta tickar en verlet-kropp
  // per fläck vidare i all evighet — och sex av dem är sex solvers ingen ser.
  _frysGegga() {
    if (!this._mjuk) return
    this._mjuk.kropp.destroy()
    this._mjuk = null
  },

  // ⚠️ FAST TIDSSTEG. `Mjukkropp` räknar dämpning och villkorsstyvhet per STEG men
  //    kraftfält per f² — ett för stort steg viker ihop kroppen för gott, ett för litet
  //    ger en helt annan jämvikt (CLAUDE.md). Ackumulatorn stegar alltid med exakt 1.
  _mjukTick(dtMS) {
    const m = this._mjuk
    if (!m) return
    if (m.g.destroyed) { this._frysGegga(); return }
    m.acc += dtMS / (1000 / 60)
    let n = 0
    while (m.acc >= 1 && n < 4) { m.kropp.steg(1); m.acc -= 1; n++ }
    m.acc = Math.min(m.acc, 2)
    m.g.clear()
    m.kropp.path(m.g)
    m.g.fill({ color: m.farg, alpha: 0.55 })
    m.t += dtMS
    if (m.t > 1400) this._frysGegga()
  },

  _ploppa(ctx, g) {
    if (!g) return
    const levande = g.bit && !g.bit.destroyed ? g.bit : null
    const x = levande ? levande.x : 0
    const y = levande ? levande.y : 0
    if (this._mjuk && this._mjuk.g === g.klet) this._frysGegga()
    if (g.klet && !g.klet.destroyed) {
      gsap.to(g.klet, { alpha: 0, duration: 0.35,
        onComplete: () => { if (!g.klet.destroyed) g.klet.destroy({ children: true }) } })
    }
    if (levande) {
      // Flytta biten till matlagret: geggalagret ligger BAKOM köksön, och en sak som
      // faller ner på bänken måste ritas framför den.
      levande.parent?.removeChild(levande)
      this._matL.addChild(levande)
      this._gorLos(ctx, { view: levande, data: { farg: g.farg, mtrl: 'tra' } }, {
        vx: (Math.random() - 0.5) * 3, vy: 1.5,
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
      this._sopaBanken(ctx)
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
    this._phys?.update(dtMS)
    this._vatskaTick(ctx, dtMS)
    this._mjukTick(dtMS)
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
      this._cueVaxel += 1
      // Var tredje cue pekar på KÖKET i stället för på maten. Utan den syns det aldrig att
      // skåpen går att öppna: en stängd lucka har bara sitt handtag att gå på, och en
      // 2-åring läser inget. En ring och ett litet skutt på dörren är en inbjudan, aldrig
      // en tillsägelse — och den kräver ingen text (P0 NAVIGATION).
      if (this._cueVaxel % 3 === 0) {
        const stangda = (this._stationer || []).filter((st) => st.dorr && !st.oppen)
        const st = randomFrom(stangda)
        if (st) {
          kvittera(ctx.fxLayer, st.yta.x + st.yta.w / 2, st.yta.y + st.yta.h / 2,
            ctx.services.audio, { color: 0xffe3b0, maxR: 80 })
          pop(st.dorr, { scale: 1.04 })
          ctx.services.voice.say('Vad finns i skåpen, tror du?')
        }
        return
      }
      if (kvar.length) {
        const r = randomFrom(kvar)
        if (r?.view && !r.view.destroyed) wiggle(r.view)
        const harChili = kvar.some((m) => m.data.key === 'chili')
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
    // Lösa kroppar först: `clear()` river strax vyerna, och en matter-kropp som pekar på
    // en förstörd vy skriver till den varje steg.
    for (const rec of [...(this._losa || [])]) this._lyftLos(rec)
    this._losa = []
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
        if (rec._grepp) rec.view.off('pointerdown', rec._grepp)
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
      }
      rec._grepp = null
    }
    for (const g of this._geggor || []) {
      for (const nod of [g.klet, g.bit]) if (nod && !nod.destroyed) gsap.killTweensOf(nod)
    }
    this._geggor = []
    this._mat = []
    if (this._hjarta && !this._hjarta.destroyed) gsap.killTweensOf(this._hjarta)
    gsap.killTweensOf(this._fyll)

    for (const rec of this._losa || []) {
      if (rec?.view && !rec.view.destroyed) gsap.killTweensOf(rec.view)
    }
    this._losa = []
    this._frysGegga()
    // Kökets egna animerade noder. De ägs av `kok.js` men tweenas HÄRIFRÅN (`_knapp`), och
    // var därför de enda i filen utan städning — exakt mönstret CLAUDE.md varnar för
    // (en tween som skriver till ett förstört Pixi-objekt efter exit).
    const n = this._noder || {}
    for (const nod of [n.fagel, n.strale, n.plattor, n.flakthjul, n.sol]) {
      if (nod) { gsap.killTweensOf(nod); gsap.killTweensOf(nod.scale) }
    }
    this._noder = null
    this._phys?.destroy()
    this._phys = null
    this._rivVatska()

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
