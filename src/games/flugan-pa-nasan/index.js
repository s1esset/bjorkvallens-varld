// FLUGAN — spel 4 i ansiktssektionen (`docs/games/flugan-pa-nasan.md`).
//
// Flugor surrar in genom fönstret och besvärar pappa. Barnet väljer ett VERKTYG ur den
// utdragna skrivbordslådan — flugsmälla, sprayflaska, pilbössa, hoprullad tidning eller
// klibbig slemhand — och trycker där flugan är. En runda är slut när alla flugor är ute
// genom fönstret igen. Ingen kan gå sönder, ingenting kan gå förlorat, och pappa är
// spelets komiska mottagare: han följer närmaste fluga med blicken varje bildruta, får
// miner när de landar på honom, och blir träffad av verktygen ibland (det är meningen).
//
// GULDKORNET STÅR KVAR: landar flugan på näsan används `blick_ner` — han tittar ner på sin
// egen näsa. Den lappen har funnits sedan riggen byggdes och ingen har använt den till det.
//
// ⚠️ VERKAN OCH BILD ÄR TVÅ SAKER. Verktygens tabell (`verktyg.js`) bär `droj` — hur långt
//    in i animationen slaget faktiskt landar. Räknas träffen vid tryck i stället plattas
//    flugan innan smällan är framme, och pilen träffar innan den lämnat pipan. Spelet
//    väntar därför ut `droj` med `ctx.later()` innan `_verkan()` körs.
//
// ⚠️ ETT FÖREMÅL REAGERAR PÅ VERKANSTYPEN, INTE PÅ VERKTYGET. `rum.slaTill(id, typer)`
//    tar `['slag']`/`['vind','vat']`/`['klibb']`, och rummet svarar med sin egen
//    materialegenskap: kaffet skvätter, pappren flaxar, tavlan blir sned, växten skakar,
//    lampan blinkar. Ett sjätte verktyg kan alltså läggas till utan att röra rummet.
//
// ⚠️ EN TRÄFFAD FLUGA FÖRSVINNER INTE. Hon plattas mot ytan, glider ner på bordet, ligger
//    kvar 1–3 s och reser sig sedan och flyger RAKT ut genom fönstret. Det är hela
//    belöningen: verktyget är inte ett vapen, det är en genväg till målet (P0 — inget
//    misslyckande, ingenting som tas bort).
//
// ⚠️ BARNET KAN ALDRIG FASTNA. Sitter en fluga för länge på näsan bygger pappa upp en
//    NYSNING som blåser iväg den själv (P0 MOTGÅNG: hinder får sakta ner, aldrig stoppa).
//
// ⚠️ MÄTFRÅGAN OM BLICKEN ÄR AVGJORD OCH FÖLL ÅT ANDRA HÅLLET. `blick()`s hysteres är
//    inställd på en långsamt dragen matbit, och spec-kortet varnade för att en fluga skulle
//    få lappen att flimra (~3 byten/s = ögonflimmer på ett fotoansikte). Uppmätt med
//    `scripts/_blickprobe.mjs`: rå fluga **1,2 byten/s**, kontrollarm 0,4. Riggens hysteres
//    absorberar redan ryckigheten, så `Blickfilter` står kvar i `fluga.js` som mätt reserv
//    och är MEDVETET inte inkopplad — ett filter fördröjer blicken, och att blicken följer
//    flugan är precis det spelet handlar om.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PLATS, HUVUD_Y, byggRum } from './rummet.js'
import { makeFluga, makeMedalj, makeSylt } from './props.js'
import { Effekter, VERKTYG, makeIkon, inomVerkan } from './verktyg.js'
import { BLICK_RADIE, Flugbana } from './fluga.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { DragController } from '../../lib/DragController.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { burst, floatText, kvittera, puff, ripple, sparkle } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'

// Ansiktet växte 300 → 380 på ägarens begäran. `rummet.js` bär uträkningen som håller
// hakan mellan bordskanten och fotorutans raka underkant — ändras talet här måste BÅDA
// talen där räknas om.
const ANS_H = 380

const FLAKT_CD = 2         // s mellan två pustar — taket på fläkten

// FLÄKTEN, mätta tal (se `scripts/_syltprobe.mjs`).
//
// ⚠️ TRE FEL SATT I VARANDRA OCH GJORDE FLÄKTEN TILL EN KNAPP UTAN VERKAN:
//    ⓵ konen mättes från fläktens FOT (y 536) medan den RITAS ur huvudet (y 408) — 128 px
//      fel, och flugorna som cirklar kring pappa (y ~100–430) föll utanför villkorsraden.
//    ⓶ pusten gavs som `bana.knuff()`, alltså i `vx/vy` — och `Flugbana.steg()` klämmer
//      dem till flugans egen fart i SAMMA bildruta: 567 px/s pust blev 22 px/s kvar.
//    ⓷ riktningen räknades "mot pappa", alltså åt VÄNSTER, bort från fönstret. Målet är
//      att få ut flugorna, så en pust som drev dem djupare in i rummet motarbetade spelet.
//    Nu är det ett VINDFÄLT som lever `FLAKT_VIND_TID` sekunder efter tryckningen, mätt
//    från huvudet, riktat mot fönstret.
const FLAKT_VIND_TID = 1.15   // s som luftströmmen ligger kvar efter en pust
const FLAKT_RACKVIDD = 760    // px från huvudet där pusten fortfarande biter
const FLAKT_HOJD = 260        // px halv konhöjd vid huvudet (den vidgar sig utåt)
const FLAKT_KRAFT = 430       // px/s tillskott i luftströmmens mitt
const FLAKT_SUG_RACK = 620    // px bakom gallret där insuget når
const FLAKT_SUG_DEL = 0.62    // insugets styrka som andel av utblåsets
const SITT_MIN = 2.2
const SITT_MAX = 4.6
const NYS_TID = 6          // s på näsan innan nysningen byggs upp
const LAND_PAUS = 1.6      // s efter en start innan hon får landa igen
const PLATT_MIN = 1.0      // s hon ligger platt på bordet …
const PLATT_MAX = 3.0      // … innan hon reser sig och flyr ut (ägarens 1–3 s)
const BORD_Y = 522         // var en tillplattad fluga hamnar på skivan

// Verktygsraden i den utdragna lådan. 172 px mellan centrumen ger 144 px träffyta med
// 28 px luft emellan — över P0:s 96 + 24. Raden spänner x 244–1076 och ryms i lådans
// innermått (232–1088).
const VERKTYG_STEG = 172
const VERKTYG_HALV = 72

// Kaffekoppens mynning — hit kan en fluga doppa sig och komma ut kladdig och långsam.
const KOPP = { x: PLATS.kopp.x, y: PLATS.kopp.y - 50 }

// Zonerna. Vilken som gäller avgörs av `traffar()` PLUS var på ansiktet träffen låg —
// aldrig av en handstämd ellips (den vägen är mätt som fel åt båda hållen samtidigt).
const ZON = {
  lugg: { min: 'forvanad', ljud: 'oj' },
  oga: { min: 'aj', ljud: 'aj' },
  nasa: { min: 'skeptisk', ljud: 'huh' },
  kind: { min: 'retas', ljud: 'retas' },
  ora: { min: 'skratt', ljud: 'fniss', replik: 'Hihi, den satte sig på örat!' },
  haka: { min: 'skeptisk', ljud: 'hmm' },
}

const ROST = {
  oj: { klipp: 'pappa_oj', ton: [520, 780], typ: 'sine' },
  aj: { klipp: 'pappa_aj', ton: [700, 430], typ: 'triangle' },
  huh: { klipp: 'pappa_huh', ton: [430, 330], typ: 'sine' },
  retas: { klipp: 'pappa_retas', ton: [560, 700], typ: 'triangle' },
  fniss: { klipp: 'pappa_fniss', ton: [600, 760], typ: 'triangle' },
  hmm: { klipp: 'pappa_hmm', ton: [330, 296], typ: 'sine' },
  gasp: { klipp: 'pappa_gasp', ton: [300, 200], typ: 'sine' },
  ehh: { klipp: 'pappa_ehh', ton: [300, 380], typ: 'sine' },
  blaa: { klipp: 'pappa_blaa', ton: [420, 190], typ: 'sawtooth' },
}

// Rummets material → ett ljud. Klippnamnen läses först; finns de inte spelas en stämd ton,
// och tonerna är valda så att två föremål efter varandra låter som musik (P0: aldrig en
// summer, aldrig ett kollisionsljud).
const FOREMAL_LJUD = {
  klocka: { sfx: 'pling', ton: [880, 1174] },
  tra: { sfx: 'tap', ton: [196, 165] },
  metall: { sfx: 'tap', ton: [660, 990] },
  papper: { sfx: 'flip', ton: [520, 620] },
  porslin: { sfx: 'pling', ton: [1046, 784] },
  lov: { sfx: 'soft', ton: [392, 440] },
  tyg: { sfx: 'soft', ton: [294, 262] },
  blot: { sfx: 'plopp', ton: [330, 260] },
  fras: { sfx: 'whoosh', ton: [900, 300] },
}

const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export default {
  id: 'flugan-pa-nasan',
  titleSv: 'Flugan',
  icon: '🪰',
  category: 'roligt',
  input: 'mixed',
  ageRange: [2, 5],
  voiceIntro: 'Titta, en fluga! Ta ett verktyg ur lådan och hjälp pappa.',

  async init(ctx) {
    this._alive = true
    this._busy = false
    this._idle = 0
    this._ute = 0
    this._flugor = []
    this._doda = []   // flugor mitt i utflygningen — de ägs av ingen annan lista
    this._flaktT = 0
    this._nysT = 0
    this._pappaTill = 0
    this._cueVaxel = 0
    this._sylt = null
    this._syltPunkt = null
    this._syltOppen = false
    this._syltMarken = []
    this._syltVisa = false
    this._vindT = 0
    this._vindNoder = []
    // Fläkten blåser MOT FÖNSTRET — det är dit flugorna ska. Talet räknas ur layouten så
    // en flyttad fläkt eller ett flyttat fönster inte tyst vänder pusten åt fel håll.
    this._flaktRikt = PLATS.fonster.x >= PLATS.flakt.x ? 1 : -1
    this._verktygKnappar = []
    this._valdIx = 0
    this._kylT = 0
    this._sistProp = -99
    this._sistPappaReplik = 0
    this._sagtPlatt = false
    this._sisteTakt = 2.2
    this._wow = Math.random() < 0.125

    // RUNDAN styr fart, antal och variation. Nivån ligger i profilen, så en fjärde runda
    // är fortfarande fjärde rundan när barnet kommer tillbaka i morgon.
    this._runda = klamp(ctx.progress.get().highestLevel | 0, 0, 12)
    this._sattRunda()

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._rum = byggRum(ctx)
    this._root.addChild(this._rum.bak)

    this._pappaL = this._nyttLager()
    this._root.addChild(this._rum.fram)
    this._boboL = this._nyttLager()
    // Flugan ligger ÖVER allt annat: hon landar på ansiktet, går över bordskanten och
    // flyger ut genom fönstret. Ett lager under något av dem hade dolt henne mitt i flykten.
    this._flugL = this._nyttLager()
    this._syltL = new Container()
    this._root.addChild(this._syltL)
    // Verktygens verkan ritas ÖVER flugorna — smällan ska slå ner på henne, inte bakom.
    this._fxL = this._nyttLager()
    this._klickL = new Container()
    this._root.addChild(this._klickL)

    try {
      const data = await laddaAnsikte('pappa')
      if (!this._alive) return
      this._ans = new Ansikte(data, { hojd: ANS_H })
      this._ans.view.position.set(PLATS.ansikte.x, PLATS.ansikte.y)
      this._pappaL.addChild(this._ans.view)
      const k = ANS_H / data.manifest.ruta.h
      const G = data.manifest.geometri
      this._ogonY = PLATS.ansikte.y + (G.ogonlinje - data.manifest.ruta.h / 2) * k
      this._munY = PLATS.ansikte.y + (G.mun.y + G.mun.h / 2 - data.manifest.ruta.h / 2) * k
      this._ansBredd = data.manifest.ruta.w * k
    } catch (e) {
      console.warn('flugan-pa-nasan: ansiktet kunde inte laddas —', e?.message || e)
      this._ogonY = PLATS.ansikte.y - 28
      this._munY = PLATS.ansikte.y + 70
      this._ansBredd = 348
    }
    // Näsan ligger mellan ögonlinjen och munnen — härlett ur manifestet, inte stämt.
    this._nasY = (this._ogonY + this._munY) / 2

    this._effekter = new Effekter(this._fxL)

    this._byggBobo(ctx)
    this._byggSylt(ctx)
    this._byggFlakt(ctx)
    this._byggVerktyg(ctx)
    this._rum.liv?.()

    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)

    this._root.eventMode = 'static'
    this._root.hitArea = new Rectangle(-400, -300, 2080, 1320)
    this._vakna = (e) => this._tryck(ctx, e)
    this._root.on('pointerdown', this._vakna)

    this._slappStart(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._ans?.liv(true, { takt: 2.2 })
  },

  _nyttLager() {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    return c
  },

  /**
   * Rundans svårighet. ÄGARENS PUNKT 3: lite snabbare fluga varje runda, mer varierad bana
   * och landning, och FLER flugor samtidigt — men aldrig fler än sex.
   *
   * Taken är hårda och står här, på ett ställe: farten 540 px/s (över det hinner en tvååring
   * inte följa henne med ögat), sex flugor samtidigt, sex flugor per runda. `ryck` — hur
   * ofta hon byter mål — krymper med rundan, och det är DET som gör banan mer nervös; en
   * fluga som bara går fortare läser som en fluga i snabbspolning.
   */
  _sattRunda() {
    const r = this._runda
    this._fart = Math.min(540, 300 + r * 45)
    this._maxSamtidigt = Math.min(6, 2 + r)
    this._malUte = Math.min(6, 3 + Math.floor(r / 2))
    this._kvarAttSlappa = this._malUte
    this._ryckMin = Math.max(0.12, 0.22 - r * 0.014)
    this._ryckMax = Math.max(0.3, 0.62 - r * 0.04)
    // Området växer med rundan — samma fluga i ett större rum landar på fler ställen.
    this._omrW = Math.min(880, 520 + r * 70)
    this._omrH = Math.min(470, 330 + r * 34)
  },

  // ---------------------------------------------------------------- uppställning ---

  _byggBobo(ctx) {
    // Mottagaren (kvalitetsgrind 4). Han står vid bordet hela tiden och hejar — utan en
    // mottagare är finalen bara en siffra som blev full.
    try {
      this._bobo = makeKaraktar({ r: 46, kropp: true })
      // Längst ner till vänster, klar av lådans framstycke (som börjar på x 212) och av
      // den vänstraste verktygsknappens träffyta (244).
      this._bobo.view.position.set(108, 596)
      this._boboL.addChild(this._bobo.view)
      this._bobo.setMood?.('nyfiken')
      this._bobo.idle?.()
    } catch (e) {
      console.warn('flugan-pa-nasan: Bobo kunde inte byggas —', e?.message || e)
    }
  },

  /**
   * VERKTYGSRADEN. Konsten ligger i lådan (`rum.ladaInnehall`) och träffytan i det egna
   * klicklagret — två noder, av samma skäl som fläkten har det: markeringen skalar upp
   * konsten, och en träffyta som satt på samma nod hade flyttat sig mitt i ett tryck.
   */
  _byggVerktyg(ctx) {
    const lada = this._rum.ladaInnehall
    if (!lada) return
    const x0 = (PLATS.lada.v + PLATS.lada.h) / 2 - ((VERKTYG.length - 1) * VERKTYG_STEG) / 2
    VERKTYG.forEach((spec, i) => {
      const x = x0 + i * VERKTYG_STEG
      const y = PLATS.lada.y

      // Markeringsringen ligger BAKOM konsten och ritas som ett pärlband — en fylld platta
      // hade gjort verktyget till en ikon i en ruta (P0 ASSETS).
      const ring = new Graphics()
      for (let a = 0; a < 18; a++) {
        const ang = (a / 18) * Math.PI * 2
        ring.circle(Math.cos(ang) * 62, Math.sin(ang) * 62 * 0.86, 4.5).fill({ color: 0xffe9a8, alpha: 0.95 })
      }
      ring.ellipse(0, 0, 60, 52).fill({ color: 0xffe9a8, alpha: 0.2 })
      ring.position.set(x, y)
      ring.visible = false
      ring.eventMode = 'none'

      const konst = new Container()
      konst.eventMode = 'none'
      konst.position.set(x, y)
      konst.addChild(makeIkon(spec.key))
      lada.addChild(ring, konst)

      const knapp = new Graphics().rect(-VERKTYG_HALV, -VERKTYG_HALV, VERKTYG_HALV * 2, VERKTYG_HALV * 2)
        .fill({ color: 0xffffff, alpha: 0 })
      knapp.position.set(x, y)
      knapp.eventMode = 'static'
      knapp.cursor = 'pointer'
      knapp.hitArea = new Rectangle(-VERKTYG_HALV, -VERKTYG_HALV, VERKTYG_HALV * 2, VERKTYG_HALV * 2)
      const valj = () => this._valjVerktyg(ctx, i)
      knapp.on('pointertap', valj)
      this._klickL.addChild(knapp)

      this._verktygKnappar.push({ spec, x, y, ring, konst, knapp, av: () => knapp.off('pointertap', valj) })
    })
    this._sattVald(0)
  },

  _valjVerktyg(ctx, ix) {
    if (!this._alive) return
    this._idle = 0
    const bytte = ix !== this._valdIx
    this._sattVald(ix)
    const v = this._verktygKnappar[ix]
    if (!v) return
    ctx.services.audio.sfx('tap')
    ctx.services.audio.tone({ freq: 392 + ix * 66, dur: 0.13, type: 'triangle', vol: 0.22 })
    ripple(ctx.fxLayer, v.x, v.y, { color: 0xffe9a8, maxR: 92, duration: 0.42 })
    this._bobo?.look?.(v.x, v.y)
    if (bytte) this._sag(ctx, v.spec.cue)
  },

  _sattVald(ix) {
    this._valdIx = ix
    this._verktygKnappar.forEach((v, i) => {
      const pa = i === ix
      if (!v.ring.destroyed) v.ring.visible = pa
      if (v.konst.destroyed) return
      gsap.killTweensOf(v.konst.scale)
      gsap.killTweensOf(v.konst)
      // Det valda verktyget lyfts UR lådan — då syns valet även för den som inte ser ringen.
      gsap.to(v.konst.scale, { x: pa ? 1.14 : 0.88, y: pa ? 1.14 : 0.88, duration: 0.22, ease: 'back.out(2)' })
      gsap.to(v.konst, { y: pa ? v.y - 16 : v.y, duration: 0.24, ease: 'back.out(2)' })
    })
  },

  get _valt() {
    return this._verktygKnappar[this._valdIx]?.spec || VERKTYG[0]
  },

  /**
   * Syltburken. TVÅ tydliga platser i stället för fri placering, och det är ett medvetet
   * val: en 2-åring har inte pixelprecision, och två stora snäppytor är läsbara medan en
   * fri yta är en gissning. `DragController` bär dessutom tap-tap-fallbacken (P0 GESTER).
   *
   * Fönsterbrädan är 4-åringens aha: ställer man sylten där flyger flugorna ut av sig själva.
   */
  _byggSylt(ctx) {
    this._drag = new DragController({ space: this._syltL, services: ctx.services })
    const platser = [
      { namn: 'hem', x: PLATS.sylt.x, y: PLATS.sylt.y },
      { namn: 'fonster', x: 1010, y: PLATS.fonster.y + PLATS.fonster.h / 2 + 24 },
    ]
    // ⚠️ PLATSERNA VAR HELT OSYNLIGA (`alpha: 0`). Barnet drog burken och den snäppte
    //    tillbaka hem så fort släppet låg mer än 110 px från en punkt ingen kunde se —
    //    exakt det ägaren beskrev som "beter sig konstigt". Ringarna tänds medan burken
    //    HÅLLS och slocknar när den släpps: en markering som alltid syns är brus, en som
    //    aldrig syns är en gissning.
    this._syltMarken = []
    for (const p of platser) {
      const ring = new Graphics()
      for (let a = 0; a < 20; a++) {
        const v = (a / 20) * Math.PI * 2
        ring.circle(Math.cos(v) * 66, Math.sin(v) * 66 * 0.42, 5).fill({ color: 0xffe9a8, alpha: 0.95 })
      }
      ring.ellipse(0, 0, 64, 27).fill({ color: 0xffe9a8, alpha: 0.16 })
      ring.position.set(p.x, p.y + 44)
      ring.alpha = 0
      ring.eventMode = 'none'
      this._syltL.addChild(ring)

      const mal = new Graphics().circle(0, 0, 74).fill({ color: 0xffffff, alpha: 0 })
      mal.position.set(p.x, p.y)
      this._syltL.addChild(mal)
      this._drag.addTarget(mal, () => true, { hitRadius: 130 })
      mal._wNamn = p.namn
      this._syltMarken.push(ring)
    }

    const sylt = makeSylt()
    if (!sylt) return
    sylt.view.position.set(PLATS.sylt.x, PLATS.sylt.y)
    // ⚠️ `DragController.addItem()` SÄTTER INGEN `hitArea` — den sätter bara `eventMode`,
    //    och då träfftestar Pixi mot den RITADE silhuetten. Burken är 70×94 px och halsen
    //    bara 56, alltså långt under P0:s 96.
    //    Rektangeln slutar på lokal +40 (design y 552 = bordets framkant) MED FLIT: lådans
    //    verktygsknappar börjar på 582 och ligger ett lager ovanför, så allt under det talet
    //    var burkens yta bara på pappret.
    sylt.view.hitArea = new Rectangle(-62, -84, 124, 124)
    this._syltL.addChild(sylt.view)
    sylt.liv?.()
    this._sylt = sylt
    this._drag.addItem(sylt.view, { sylt: true }, {
      onSelect: () => {
        // ETT TRYCK ÖPPNAR BURKEN. Förut kunde locket bara åka av som en bieffekt av ett
        // lyckat släpp — trycket gjorde ingenting synligt alls, och "svår att öppna" var
        // en korrekt beskrivning av just det.
        if (!this._alive) return
        this._oppnaSylt(ctx)
      },
      onCorrect: (rec, target) => {
        if (!this._alive) return
        this._idle = 0
        this._oppnaSylt(ctx)
        this._syltPunkt = { x: target.view.x, y: target.view.y - 30 }
        this._lockaAlla()
        if (target.view._wNamn === 'fonster') sparkle(ctx.fxLayer, target.view.x, target.view.y - 20, { count: 12 })
        // ⚠️ BURKEN MÅSTE BLI DRAGBAR IGEN. `_resolveDrop` låser ett accepterat föremål
        //    DUBBELT (`placed = true` OCH `eventMode = 'none'`), och inget i biblioteket
        //    öppnar låset av sig självt.
        ctx.later(0.4, () => { if (this._alive) this._drag?.aterstall(this._sylt?.view) })
      },
      onMiss: () => {
        if (!this._alive) return
        // Snäppet hem tar 0,32 s — lockbetet följer med burken dit i stället för att slockna.
        ctx.later(0.36, () => {
          if (!this._alive || !this._sylt || this._sylt.view.destroyed) return
          this._syltPunkt = this._syltOppen ? { x: this._sylt.view.x, y: this._sylt.view.y - 30 } : null
          this._lockaAlla()
        })
      },
    })
  },

  /** Locket av + doften igång. Idempotent — burken kan bara öppnas en gång. */
  _oppnaSylt(ctx) {
    if (this._syltOppen || !this._sylt) return
    this._syltOppen = true
    this._sylt.oppna?.()
    ctx.services.audio.sfx('plopp')
    ctx.services.audio.tone({ freq: 520, slideTo: 780, dur: 0.18, type: 'triangle', vol: 0.18 })
    const v = this._sylt.view
    if (!v.destroyed) sparkle(ctx.fxLayer, v.x, v.y - 40, { count: 8 })
    this._syltPunkt = { x: v.x, y: v.y - 30 }
    this._lockaAlla()
  },

  /**
   * Ringarna lyser medan burken HÅLLS eller är TAP-TAP-MARKERAD — alltså i exakt de lägen
   * barnet behöver veta vart den ska. Läget läses ur `DragController` i loopen i stället
   * för ur krokarna: `_deselect()` har ingen krok, och en markering som blev kvar tänd
   * efter ett avbrutet tap-tap hade varit ett nytt fel i stället för en fix.
   */
  _visaSyltMarken(pa) {
    if (pa === this._syltVisa) return
    this._syltVisa = pa
    for (const r of this._syltMarken || []) {
      if (!r || r.destroyed) continue
      gsap.killTweensOf(r)
      gsap.to(r, { alpha: pa ? 1 : 0, duration: pa ? 0.18 : 0.3 })
    }
  },

  _byggFlakt(ctx) {
    const nod = this._rum.flaktNod
    if (!nod) return
    // ⚠️ FLÄKTEN ÄR HÖG, INTE RUND. Nodens geometri spänner y −185…19 (galler, stativ, fot),
    //    så en cirkel kring ankaret hade lämnat hela gallret — den enda del ett barn siktar
    //    på — utanför träffytan.
    const k = new Graphics().rect(-72, -192, 144, 208).fill({ color: 0xffffff, alpha: 0 })
    k.position.set(PLATS.flakt.x, PLATS.flakt.y)
    k.eventMode = 'static'
    k.cursor = 'pointer'
    k.hitArea = new Rectangle(-72 - 24, -192 - 24, 144 + 48, 208 + 48)
    k.on('pointertap', () => this._blas(ctx))
    this._klickL.addChild(k)
    this._flaktKlick = k
  },

  // ---------------------------------------------------------------- flugorna ---

  /**
   * ÄGARENS PUNKT 3, "flera flugor på en gång": rundan öppnar med så många hon tillåter,
   * inte med en. Utan det nåddes taket aldrig — en fluga i taget släpps bara på när den
   * förra flugit ut, och då är två samtidigt det mesta som kan hända.
   *
   * 1,1 s mellan varje: de föds alla vid fönstret, och samtidiga födslar hade lagt sex
   * flugor i samma punkt (en enda mörk klump i stället för sex flugor).
   */
  _slappStart(ctx) {
    const n = Math.min(this._maxSamtidigt, this._kvarAttSlappa)
    for (let i = 0; i < n; i++) this._slappFluga(ctx, 0.8 + i * 1.1)
  },

  _slappFluga(ctx, forsening = 0) {
    if (!this._alive || this._kvarAttSlappa <= 0) return
    if (this._flugor.length >= this._maxSamtidigt) return
    this._kvarAttSlappa -= 1
    ctx.later(forsening, () => {
      if (!this._alive) return
      const vy = makeFluga()
      if (!vy) return
      // Hon kommer in genom fönstret — samma väg hon ska ut.
      const start = { x: PLATS.fonster.x, y: PLATS.fonster.y }
      // ⚠️ OMRÅDET ÄR CENTRERAT PÅ PAPPA, inte mitt emellan honom och fönstret. Första
      //    versionen spände hela rummet, och då passerade flugan bara undantagsvis över
      //    ansiktet: uppmätt **2 landningar på 240 s**, och näsan — spelets uttalade
      //    guldkorn — nåddes aldrig. En fluga cirklar kring den den besvärar.
      //    Området VÄXER med rundan (`_sattRunda`), så variationen kommer utan att den
      //    första rundan blir omöjlig.
      const bana = new Flugbana({
        x: start.x, y: start.y,
        fart: this._fart,
        ryckMin: this._ryckMin,
        ryckMax: this._ryckMax,
        omrade: {
          x: PLATS.ansikte.x + 60 + (Math.random() - 0.5) * 80,
          y: PLATS.ansikte.y - 30,
          w: this._omrW,
          h: this._omrH,
        },
      })
      vy.view.position.set(start.x, start.y)
      this._flugL.addChild(vy.view)
      vy.vingar?.(true)
      // ⚠️ `armerad` ÄR INTE EN DETALJ — utan den var spelet färdigt på en sekund. Flugan
      //    föds vid fönstret (samma väg hon ska ut), alltså INNE i målzonen, och ut-testet
      //    i `_update` slog till på första bildrutan: tre flugor "flög ut" utan att någonsin
      //    ha flugit. Det syntes inte i testet — det var grönt — utan i skärmdumpen.
      const f = {
        vy, bana, lage: 'flyger', sitter: null, sittT: 0, kladdig: false,
        landPaus: LAND_PAUS, armerad: false, brattom: false,
        malZon: null, malKopp: false, malProp: null, malPunkt: null, malT: 0,
        klibbT: 0, plattT: 0,
      }
      this._flugor.push(f)
      this._lockaEn(f)
      ctx.services.audio.sample?.('djur_bi') || ctx.services.audio.tone({ freq: 210, dur: 0.4, type: 'sawtooth', vol: 0.07, slideTo: 240 })
    })
  },

  /** Vad lockar just nu? Sylten vinner, sedan utspillt kaffe, sedan en tänd lampa. */
  _lockbete() {
    if (this._syltPunkt) return this._syltPunkt
    const pol = this._rum?.kaffePol
    if (pol) return pol
    if (this._rum?.lampaLyser && Math.random() < 0.5) return this._rum.lampPunkt
    return null
  },

  _lockaEn(f) {
    if (f.lage !== 'flyger' || f.brattom) return
    f.bana.lockaMot(this._lockbete())
  },

  _lockaAlla() {
    for (const f of this._flugor) this._lockaEn(f)
  },

  /**
   * ETT TRYCK = VERKTYGET ANVÄNDS DÄR MAN TRYCKTE. Bilden startar genast (P0 ÅTERKOPPLING
   * under 100 ms); VERKAN landar efter verktygets `droj`, när smällan är nere respektive
   * pilen framme.
   */
  _tryck(ctx, e) {
    this._idle = 0
    if (!this._alive) return
    if (e?.target && e.target !== this._root) return
    const p = e.global ? this._root.toLocal(e.global) : null
    if (!p) return

    const spec = this._valt
    if (this._kylT > 0) {
      // Verktyget laddar om — men pekningen får ALDRIG dö tyst.
      kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio)
      return
    }
    this._kylT = spec.kyla

    const knapp = this._verktygKnappar[this._valdIx]
    const fran = knapp ? { x: knapp.x, y: knapp.y - 30 } : { x: p.x, y: 720 }
    this._effekter?.spela(spec.key, p.x, p.y, fran)
    ctx.services.audio.sfx(spec.ljud)
    // Verktyget hoppar till i lådan — det är DET som säger "jag använde just den här".
    if (knapp && !knapp.konst.destroyed) {
      gsap.killTweensOf(knapp.konst)
      gsap.to(knapp.konst, { y: knapp.y - 30, duration: 0.09, ease: 'power2.out' })
      gsap.to(knapp.konst, { y: knapp.y - 16, duration: 0.4, delay: 0.09, ease: 'elastic.out(1, 0.5)' })
    }

    ctx.later(spec.droj, () => { if (this._alive) this._verkan(ctx, spec, p.x, p.y, fran) })
  },

  /**
   * VERKAN. Tre mottagare, i den ordningen: flugorna, pappas ansikte, rummets föremål.
   * Ingen av dem utesluter de andra — en smälla mitt på näsan träffar både flugan och
   * pappa, och det är precis det skämtet ägaren bad om.
   */
  _verkan(ctx, spec, x, y, fran) {
    let nagot = false

    // ---- flugorna ----------------------------------------------------------
    for (const f of [...this._flugor]) {
      if (f.lage === 'ut' || f.lage === 'platt' || f.lage === 'vilar') continue
      const vy = f.vy.view
      if (!inomVerkan(spec, x, y, vy.x, vy.y, fran.x, fran.y)) continue
      nagot = true
      if (spec.platt) {
        this._plattaTill(ctx, f, x, y, spec)
      } else if (spec.typ.includes('klibb')) {
        this._klibba(ctx, f, x, y, spec)
      } else {
        // Vind: hon knuffas undan, och är verkan BLÖT blir vingarna tunga.
        if (f.lage === 'sitter') this._lyft(ctx, f)
        f.bana.knuff(fran.x, fran.y, spec.kraft)
        if (spec.typ.includes('vat') && !f.kladdig) this._blotFluga(ctx, f)
        burst(ctx.fxLayer, vy.x, vy.y, { count: 5, colors: PLAYFUL, power: 0.6 })
      }
    }

    // ---- pappa -------------------------------------------------------------
    // `traffar()` avgör OM ytan är hans ansikte — aldrig en handstämd ellips.
    if (this._ans?.traffar?.(x, y, 20)) {
      nagot = true
      this._pappaTraffad(ctx, spec, x, y)
    }

    // ---- rummets föremål ---------------------------------------------------
    for (const fm of this._rum?.foremal || []) {
      const inne = fm.rekt
        ? x >= fm.x + fm.rekt.x && x <= fm.x + fm.rekt.x + fm.rekt.w && y >= fm.y + fm.rekt.y && y <= fm.y + fm.rekt.y + fm.rekt.h
        : Math.hypot(x - fm.x, y - fm.y) <= fm.r
      if (!inne) continue
      const svar = this._rum.slaTill(fm.id, spec.typ, spec.kraft)
      if (!svar) continue
      nagot = true
      this._foremalLjud(ctx, svar.ljud)
      if (svar.skakning > 0.45) puff(ctx.fxLayer, fm.x, fm.y, { count: 4, color: 0xffffff })
      if (svar.lockPunkt) {
        // Utspillt kaffe drar till sig alla flugor som inte redan har ett bättre lockbete.
        this._lockaAlla()
        this._sag(ctx, 'Oj, kaffet rann ut! Flugorna älskar det.')
        this._bobo?.react?.('hoppsan')
      }
    }

    // Fläkten står utanför föremålslistan — men ett slag i den ska ändå blåsa.
    if (spec.typ.includes('slag') && Math.hypot(x - this._flaktHuvud.x, y - this._flaktHuvud.y) < 92) {
      nagot = true
      this._blas(ctx)
    }

    if (!nagot) {
      // Ett tomt tryck ska ändå ge ljud+bild (P0 ÅTERKOPPLING).
      ripple(ctx.fxLayer, x, y, { color: 0xffffff, maxR: 56 })
      ctx.services.audio.tone({ freq: 430, dur: 0.11, type: 'sine', vol: 0.1, slideTo: 540 })
    }
  },

  _foremalLjud(ctx, namn) {
    const L = FOREMAL_LJUD[namn] || FOREMAL_LJUD.tra
    ctx.services.audio.sfx(L.sfx)
    ctx.services.audio.tone({ freq: L.ton[0], slideTo: L.ton[1], dur: 0.2, type: 'triangle', vol: 0.14 })
  },

  /**
   * PAPPA BLIR TRÄFFAD. Ägarens punkt 4: hans roll är den komiska. Det får ALDRIG läsa som
   * ett straff eller som att barnet gjorde fel — han blir förvånad, gör en min, och Bobo
   * fnissar. Ingen mätare rörs, ingenting går förlorat.
   */
  _pappaTraffad(ctx, spec, x, y) {
    const a = this._ans
    if (!a) return
    const zon = this._zonFor(x, y) || 'kind'
    a.slappMin?.()
    if (spec.typ.includes('vat')) {
      a.min('acklad', { hall: 1.3 })
      a.blunda?.({ v: true, h: true })
      ctx.later(0.6, () => { if (this._alive) this._ans?.blunda?.({ v: false, h: false }) })
      this._sagPappa(ctx, 'blaa')
      burst(ctx.fxLayer, x, y, { count: 12, colors: [0x9ed4f2, 0xffffff], power: 0.9 })
    } else if (spec.typ.includes('klibb')) {
      a.min('acklad', { hall: 1.4 })
      a.tveka?.({ vinkel: 0.06, varv: 3, tid: 0.18 })
      this._sagPappa(ctx, 'huh')
    } else {
      a.min(zon === 'nasa' ? 'aj' : 'chock', { hall: 1.3 })
      a.ryck({ styrka: 1.5 })
      this._sagPappa(ctx, 'aj')
      floatText(ctx.fxLayer, x, y - 60, 'Aj!', { fontSize: 52 })
      burst(ctx.fxLayer, x, y, { count: 10, colors: PLAYFUL, power: 1 })
    }
    this._bobo?.react?.('hoppsan')
    if (performance.now() - (this._sistPappaReplik || 0) > 9000) {
      this._sistPappaReplik = performance.now()
      this._sag(ctx, 'Hoppsan, där tog du pappa i stället!')
    }
  },

  /** Blöta vingar: matt färg, halva farten. Samma tillstånd som kaffekoppen ger. */
  _blotFluga(ctx, f) {
    f.kladdig = true
    f.vy.kladdig?.(true)
    f.bana._fart = this._fart * 0.5
    puff(ctx.fxLayer, f.vy.view.x, f.vy.view.y, { count: 6, color: 0x9ed4f2 })
  },

  /**
   * TRÄFFAD AV ETT VERKTYG. Ägarens punkt 2, sista stycket, ordagrant byggd:
   * hon plattas mot ytan där slaget kom, glider och faller ner på bordet, ligger kvar
   * 1–3 s, reser sig och flyger DIREKT ut genom fönstret.
   */
  _plattaTill(ctx, f, x, y, spec) {
    if (f.lage === 'platt' || f.lage === 'vilar' || f.lage === 'ut') return
    f.lage = 'platt'
    f.sitter = null
    f.malZon = null
    f.malKopp = false
    f.malProp = null
    f.malPunkt = null
    this._nysT = 0
    this._ans?.slappMin?.()

    const vy = f.vy.view
    f.vy.vingar?.(false)
    // Ytans lutning: mot pappas ansikte står hon lodrätt klistrad, i luften platt.
    const motAnsikte = !!this._ans?.traffar?.(x, y, 24)
    const vinkel = motAnsikte ? (x < PLATS.ansikte.x ? -0.3 : 0.3) : (Math.random() - 0.5) * 0.4
    f.vy.platt?.(vinkel)
    ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: 260, slideTo: 120, dur: 0.22, type: 'square', vol: 0.16 })
    burst(ctx.fxLayer, x, y, { count: 9, colors: [0xffffff, 0xdfe9f5], power: 1.1 })
    if (!this._sagtPlatt) {
      this._sagtPlatt = true
      this._sag(ctx, 'Titta, den blev alldeles platt!')
    }

    // Glidet: hon sitter kvar mot ytan ett ögonblick, sedan sjunker hon och landar på
    // skivan. Läget skrivs på en PROXY och kopieras till noden bara om den lever.
    const st = { x: vy.x, y: vy.y }
    const malX = klamp(vy.x + (Math.random() - 0.5) * 90, 210, 1240)
    const malY = BORD_Y + Math.random() * 16
    gsap.killTweensOf(st)
    gsap.to(st, {
      x: malX,
      y: malY,
      duration: 0.75,
      delay: 0.18,
      ease: 'power2.in',
      onUpdate: () => { if (!vy.destroyed) vy.position.set(st.x, st.y) },
      onComplete: () => {
        if (!this._alive || vy.destroyed) return
        vy.position.set(malX, malY)
        f.bana.x = malX
        f.bana.y = malY
        f.bana.vx = 0
        f.bana.vy = 0
        f.lage = 'vilar'
        f.plattT = PLATT_MIN + Math.random() * (PLATT_MAX - PLATT_MIN)
        ctx.services.audio.sfx('soft')
        puff(ctx.fxLayer, malX, malY + 8, { count: 4, color: 0xd9c2a0 })
      },
    })
    f._plattTw = st
  },

  /** Slemhanden: hon fastnar och släpar med, sedan släpper klibbet och hon är fri igen. */
  _klibba(ctx, f, x, y, spec) {
    if (f.lage === 'sitter') this._lyft(ctx, f)
    f.klibbT = spec.klibbTid || 2
    f.vy.kladdig?.(true)
    f.bana._fart = this._fart * 0.34
    f.bana.knuff(x, y, -0.35) // dras MOT handen, inte bort från den
    ctx.services.audio.sfx('plopp')
    sparkle(ctx.fxLayer, f.vy.view.x, f.vy.view.y, { count: 8 })
  },

  /** VIFTNINGEN som fanns förut finns kvar i verktygen — den här lyfter en sittande fluga. */
  _lyft(ctx, f) {
    if (f.lage !== 'sitter') return
    f.lage = 'flyger'
    f.sitter = null
    f.landPaus = LAND_PAUS
    // Siktmålet släpps när hon lyfter — nästa gång lottas en NY zon ur poolen, annars
    // återvänder hon till samma ställe om och om igen.
    f.malZon = null
    f.malKopp = false
    f.malProp = null
    f.malPunkt = null
    this._lockaEn(f)
    f.vy.vingar?.(true)
    f.vy.lyft?.()
    this._nysT = 0
    this._ans?.slappMin?.()
  },

  /** Fläktens huvud i designkoordinater — konen ritas här, alltså mäts den härifrån. */
  get _flaktHuvud() {
    return { x: PLATS.flakt.x, y: PLATS.flakt.y + HUVUD_Y }
  },

  /**
   * LUFTEN VID (x, y): riktning + styrka, eller `null` om det står stilla där.
   *
   * ⚠️ EN REN UTBLÅSKON DUGER INTE, och det är MÄTT och inte tyckt. Fläkten står på x 660,
   *    fönstret på 1010 och flugorna cirklar kring pappa på x 160–680 — alltså BAKOM
   *    fläkten. En kon som bara blåser framåt täckte **22 av 200** flugpositioner ur
   *    spelets eget område (kontrollarm: den gamla konen åt andra hållet tog 105, men drev
   *    dem då bort från fönstret). En riktig fläkt SUGER också, och det är den halvan som
   *    gör verktyget helt: flugan dras in bakifrån, passerar huvudet och kastas ut mot
   *    fönstret. Hela rummet blir nåbart utan att en enda pust pekar åt fel håll.
   */
  _vindKraft(x, y) {
    const h = this._flaktHuvud
    const langs = (x - h.x) * this._flaktRikt
    const dy = y - h.y

    if (langs >= 0) {
      // UTBLÅSET: en kon som vidgar sig framåt och avtar med avståndet.
      if (langs > FLAKT_RACKVIDD) return null
      const halv = FLAKT_HOJD + langs * 0.42
      if (Math.abs(dy) > halv) return null
      const s = (1 - langs / FLAKT_RACKVIDD) * (1 - (Math.abs(dy) / halv) * 0.72)
      if (s <= 0) return null
      // Riktningen blandas mot fönstret så flugan driver ut genom öppningen i stället för
      // att blåsas rakt in i väggen bredvid den.
      const F = PLATS.fonster
      const fx = F.x - x
      const fy = F.y - y
      const d = Math.hypot(fx, fy) || 1
      return { vx: this._flaktRikt * 0.55 + (fx / d) * 0.45, vy: (fy / d) * 0.45, s }
    }

    // INSUGET: allt bakom gallret dras MOT huvudet. Svagare än utblåset (annars rycks
    // flugan iväg i stället för att glida in), men med god räckvidd — det är den här
    // halvan som når flugorna som sitter och surrar kring pappa.
    const bak = -langs
    if (bak > FLAKT_SUG_RACK) return null
    const halv = FLAKT_HOJD * 1.25
    if (Math.abs(dy) > halv) return null
    const s = (1 - bak / FLAKT_SUG_RACK) * (1 - (Math.abs(dy) / halv) * 0.55) * FLAKT_SUG_DEL
    if (s <= 0) return null
    const d = Math.hypot(bak, dy) || 1
    return { vx: (this._flaktRikt * bak) / d, vy: -dy / d, s }
  },

  /** Bara styrkan — sonderna och `_blas` behöver ett skalärt "blåser det här?". */
  _vindStyrka(x, y) {
    return this._vindKraft(x, y)?.s || 0
  },

  _blas(ctx) {
    this._idle = 0
    if (!this._alive) return
    if (this._flaktT > 0) {
      kvittera(ctx.fxLayer, this._flaktHuvud.x, this._flaktHuvud.y, ctx.services.audio)
      return
    }
    this._flaktT = FLAKT_CD
    this._vindT = FLAKT_VIND_TID
    this._rum.blas?.(this._flaktRikt)
    this._rum.papper?.()
    ctx.services.audio.sfx('whoosh')
    ctx.services.audio.tone({ freq: 320, slideTo: 190, dur: 0.5, type: 'sawtooth', vol: 0.09 })
    this._vindStrimmor(ctx)
    // Allt som SITTER i strömmen lyfter genast — det är den tydligaste bilden av att
    // fläkten gjorde något, och den kommer i samma bildruta som tryckningen (P0).
    for (const f of this._flugor) {
      if (f.lage !== 'sitter') continue
      if (this._vindStyrka(f.vy.view.x, f.vy.view.y) <= 0) continue
      this._lyft(ctx, f)
    }
  },

  /**
   * LUFTSTRÖMMEN SKA SYNAS HELA VÄGEN. Rummets egen kon slocknar efter 130 px; utan något
   * som når fram till fönstret ser en pust ut som en liten puff vid fläkten, och ägaren
   * läste den — helt korrekt — som "fläkten gör ingenting".
   */
  _vindStrimmor(ctx) {
    const h = this._flaktHuvud
    const rita = ({ x0, y0, x1, tjock, alfa, tid, drojd }) => {
      const langd = 70 + Math.random() * 70
      const bukt = -8 + Math.random() * 16
      const s = new Graphics()
      // TVÅ strimmor på varandra: en svalblå bredare under och en vit smalare över. En
      // ensam vit linje försvann mot den ljusgröna väggen — luft syns bara mot en kant.
      s.moveTo(0, 0).quadraticCurveTo(langd * 0.5, bukt, langd, 0)
        .stroke({ width: tjock + 3, color: 0x6fb8d8, alpha: 0.4, cap: 'round' })
      s.moveTo(0, 0).quadraticCurveTo(langd * 0.5, bukt, langd, 0)
        .stroke({ width: tjock, color: 0xffffff, alpha: 0.95, cap: 'round' })
      s.position.set(x0, y0)
      s.alpha = 0
      s.eventMode = 'none'
      if (this._flaktRikt < 0) s.scale.x = -1
      ctx.fxLayer.addChild(s)
      // Strimman drivs på NODEN och inte på en proxy: `gsap.killTweensOf(s)` i `destroy()`
      // ska kunna nå den, och en proxy-tween hade levt vidare efter att spelet lämnats.
      gsap.to(s, { alpha: alfa, duration: 0.1, delay: drojd })
      gsap.to(s, {
        x: x1,
        alpha: 0,
        duration: tid,
        delay: drojd + 0.12,
        ease: 'power1.out',
        onComplete: () => {
          if (s.destroyed) return
          s.parent?.removeChild(s)
          s.destroy()
          const ix = this._vindNoder?.indexOf(s) ?? -1
          if (ix >= 0) this._vindNoder.splice(ix, 1)
        },
      })
      ;(this._vindNoder ||= []).push(s)
    }

    // UTBLÅSET: sju strimmor som far hela vägen mot fönstret. Rummets egen kon slocknar
    // efter 130 px, och utan något som når fram läste en pust som en liten puff vid
    // fläkten — precis det ägaren rapporterade som "fläkten gör ingenting".
    for (let i = 0; i < 7; i++) {
      rita({
        x0: h.x + this._flaktRikt * 46,
        y0: h.y + (Math.random() - 0.5) * FLAKT_HOJD * 1.1,
        x1: h.x + this._flaktRikt * (FLAKT_RACKVIDD * (0.6 + Math.random() * 0.5)),
        tjock: 3.5 + Math.random() * 2,
        alfa: 0.7,
        tid: 0.82 + Math.random() * 0.3,
        drojd: i * 0.045,
      })
    }
    // INSUGET: fyra tunnare strimmor som dras IN mot gallret bakifrån. Utan dem är
    // sugkraften en osynlig regel, och en osynlig regel är ingen leksak.
    for (let i = 0; i < 4; i++) {
      rita({
        x0: h.x - this._flaktRikt * (240 + Math.random() * 280),
        y0: h.y + (Math.random() - 0.5) * FLAKT_HOJD * 1.6,
        x1: h.x - this._flaktRikt * 62,
        tjock: 2.2 + Math.random() * 1.2,
        alfa: 0.42,
        tid: 0.62 + Math.random() * 0.2,
        drojd: i * 0.05,
      })
    }
  },

  /**
   * VART flugan siktar när hon vill landa. Ägarens punkt 3 vidgade den här: förut fanns
   * bara ansiktets sex zoner (plus kaffekoppen), nu kan hon också sätta sig på RUMMETS
   * föremål. Det är den mätbara delen av "mer variation i var den landar".
   */
  _zonPunkt(zon) {
    const cx = PLATS.ansikte.x
    const halv = (this._ansBredd || 348) / 2
    switch (zon) {
      case 'lugg': return { x: cx + (Math.random() - 0.5) * 74, y: this._ogonY - 92 }
      case 'oga': return { x: cx + (Math.random() < 0.5 ? -42 : 42), y: this._ogonY - 2 }
      case 'nasa': return { x: cx, y: this._nasY }
      case 'kind': return { x: cx + (Math.random() < 0.5 ? -1 : 1) * halv * 0.42, y: this._nasY + 12 }
      case 'ora': return { x: cx + (Math.random() < 0.5 ? -1 : 1) * halv * 0.72, y: this._ogonY + 28 }
      default: return { x: cx + (Math.random() - 0.5) * 62, y: this._munY + 54 }
    }
  },

  _valjLandning(f) {
    // ⚠️ KAFFEKOPPEN MÅSTE FÅ VARA ETT SIKTMÅL, annars är den oåtkomlig. Att bara koppla in
    //    `kladdig()` räckte inte: flugans område är centrerat på pappa och koppen står långt
    //    åt höger, så hon kom aldrig i närheten.
    if (!f.kladdig && !this._rum?.koppValt && Math.random() < 0.16) {
      f.malKopp = true
      f.malProp = null
      f.malPunkt = { x: KOPP.x, y: KOPP.y }
      f.malT = 0
      f.bana.lockaMot(f.malPunkt)
      return
    }
    f.malKopp = false

    // Rummets föremål: en fluga sätter sig lika gärna på en tavla som på en näsa, och det
    // är det som gör att två rundor inte ser likadana ut.
    const props = this._rum?.foremal || []
    if (props.length && Math.random() < 0.3) {
      const fm = props[(Math.random() * props.length) | 0]
      f.malProp = fm.id
      f.malPunkt = { x: fm.x + (Math.random() - 0.5) * fm.r, y: fm.y + (Math.random() - 0.5) * fm.r * 0.7 }
      f.malT = 0
      f.bana.lockaMot(f.malPunkt)
      return
    }
    f.malProp = null

    if (!this._zonPool || !this._zonPool.length) {
      // Poolen töms innan den fylls på: då kommer alla sex innan någon kommer två gånger.
      this._zonPool = ['lugg', 'oga', 'nasa', 'kind', 'ora', 'haka'].sort(() => Math.random() - 0.5)
    }
    f.malZon = this._zonPool.pop()
    f.malPunkt = this._zonPunkt(f.malZon)
    f.malT = 0
    f.bana.lockaMot(f.malPunkt)
  },

  /** Vilken zon träffen låg i. `traffar()` avgör OM den är på ansiktet; y/x avgör VAR. */
  _zonFor(x, y) {
    const a = this._ans
    if (!a || !a.traffar(x, y, 16)) return null
    const cx = PLATS.ansikte.x
    const halv = (this._ansBredd || 348) / 2
    if (Math.abs(x - cx) > halv * 0.62) return 'ora'
    if (y < this._ogonY - 62) return 'lugg'
    if (Math.abs(y - this._ogonY) <= 32) return 'oga'
    if (Math.abs(y - this._nasY) <= 36 && Math.abs(x - cx) < halv * 0.32) return 'nasa'
    if (y > this._munY + 42) return 'haka'
    return 'kind'
  },

  _landa(ctx, f, zonNamn) {
    const a = this._ans
    const z = ZON[zonNamn]
    if (!z) return
    f.lage = 'sitter'
    f.sitter = zonNamn
    // ⚠️ NÄSAN MÅSTE FÅ SITTA LÄNGRE ÄN NYSNINGEN TAR ATT BYGGA UPP. `NYS_TID` är 6 s medan
    //    `SITT_MAX` är 4,6 — med samma sitt-tid för alla zoner hann den vanliga
    //    lyft-timeouten alltid först, och `_nysa()` spelades ALDRIG upp.
    f.sittT = zonNamn === 'nasa'
      ? NYS_TID + 1.2 + Math.random() * 1.4
      : SITT_MIN + Math.random() * (SITT_MAX - SITT_MIN)
    f.vy.vingar?.(false)
    f.vy.landa?.()
    if (!a) return
    a.slappMin?.()

    if (zonNamn === 'nasa') {
      // GULDKORNET: han tittar ner på sin egen näsa.
      a.blick(0, 1)
      a.tveka({ vinkel: 0.05, varv: 2, tid: 0.22 })
      this._nysT = 0
    } else if (zonNamn === 'oga' && this._wow) {
      // WOW (~1 på 8): hon sätter sig på ögat och han går vindögd.
      this._wow = false
      a.min('forvanad', { hall: 1.4 })
      a.blick(0, 1)
      a.tveka({ vinkel: 0.09, varv: 4, tid: 0.13 })
      this._sagPappa(ctx, 'ehh')
      sparkle(ctx.fxLayer, f.vy.view.x, f.vy.view.y - 18, { count: 10 })
      return
    } else {
      a.min(z.min, { hall: 1.1 })
      a.ryck({ styrka: zonNamn === 'oga' ? 1 : 0.6 })
    }
    this._sagPappa(ctx, z.ljud)
    if (z.replik) this._sag(ctx, z.replik)
    puff(ctx.fxLayer, f.vy.view.x, f.vy.view.y, { count: 4, color: 0xffffff })
  },

  /** Landning på ett rumsföremål — inget ansikte inblandat, bara en liten reaktion i saken. */
  _landaProp(ctx, f, id) {
    f.lage = 'sitter'
    f.sitter = null
    f.sittT = SITT_MIN + Math.random() * (SITT_MAX - SITT_MIN)
    f.vy.vingar?.(false)
    f.vy.landa?.()
    // Ett tak på hur ofta rummet får skramla av sig självt (P0 MOTGÅNG: lagom takt).
    if (performance.now() - this._sistProp > 1400) {
      this._sistProp = performance.now()
      const svar = this._rum?.slaTill(id, ['vind'], 0.3)
      if (svar) this._foremalLjud(ctx, svar.ljud)
    }
  },

  /**
   * NYSNINGEN — taket på motgången. Sitter flugan för länge på näsan bygger pappa upp den,
   * och den blåser iväg flugan SJÄLV.
   */
  _nysa(ctx, f) {
    const a = this._ans
    if (!a) return
    this._nysT = 0
    a.slappMin?.()
    a.min('gasp', { hall: 0.5 })
    this._sagPappa(ctx, 'gasp')
    ctx.later(0.6, () => {
      if (!this._alive) return
      a.ryck({ styrka: 1.6 })
      a.slappMin?.()
      ctx.services.audio.sfx('whoosh')
      ctx.services.audio.tone({ freq: 220, dur: 0.34, type: 'sawtooth', vol: 0.2, slideTo: 90 })
      burst(ctx.fxLayer, PLATS.ansikte.x, this._nasY, { count: 20, colors: [0xffffff, 0xdfe9f5], power: 1.5 })
      if (this._flugor.includes(f) && f.lage === 'sitter') {
        this._lyft(ctx, f)
        // Nysningen blåser henne mot fönstret — hjälpsam, men hon åker inte ut gratis.
        f.bana.knuff(PLATS.ansikte.x, this._nasY, 2.2)
      }
    })
  },

  _utFlog(ctx, f) {
    if (f.lage === 'ut') return
    f.lage = 'ut'
    this._ute += 1
    ctx.services.audio.sfx('reveal')
    sparkle(ctx.fxLayer, PLATS.fonster.x, PLATS.fonster.y, { count: 14 })
    this._bobo?.react?.('jubel')
    const vy = f.vy.view
    gsap.to(vy, {
      x: PLATS.fonster.x, y: PLATS.fonster.y - 30, alpha: 0, duration: 0.45, ease: 'power2.in',
      onComplete: () => { if (this._alive) this._rivFluga(f) },
    })
    this._flugor = this._flugor.filter((x) => x !== f)
    this._doda = this._doda || []
    this._doda.push(f)

    if (this._ute >= this._malUte) {
      ctx.later(0.9, () => { if (this._alive) this._final(ctx) })
      return
    }
    this._sag(ctx, 'Nu flög den ut genom fönstret!')
    this._slappFluga(ctx, 1.2)
    // Flera i luften samtidigt så fort rundan tillåter det — annars når man aldrig taket.
    if (this._flugor.length < this._maxSamtidigt) this._slappFluga(ctx, 2.1)
  },

  _rivFluga(f) {
    if (!f) return
    if (f._plattTw) gsap.killTweensOf(f._plattTw)
    if (f.vy?.view && !f.vy.view.destroyed) gsap.killTweensOf(f.vy.view)
    f.vy?.destroy?.()
    this._doda = (this._doda || []).filter((x) => x !== f)
    this._flugor = this._flugor.filter((x) => x !== f)
  },

  // ---------------------------------------------------------------- finalen ---

  /**
   * FINALEN — spelets egen (kvalitetsgrind 7): Bobo stänger fönstret, ger pappa en medalj,
   * och pappa ger Bobo en `blinkning()` tillbaka.
   *
   * ⚠️ `progress.complete()` säger själv en PRAISE-replik (`GameHost.js:29–37`) och
   *    `voice.say()` kallar `cancel()` först — spelets egen slutreplik måste komma EFTER.
   */
  _final(ctx) {
    if (!this._alive || this._busy) return
    this._busy = true
    this._idle = 0
    const a = this._ans
    ctx.services.audio.sfx('celebrate')

    this._runda = Math.min(12, this._runda + 1)
    ctx.progress.setLevel(this._runda)
    ctx.progress.complete()
    this._sag(ctx, 'Tack, säger pappa. Nu är det lugnt igen.')

    this._bobo?.react?.('jubel')
    this._stangFonster(ctx)
    const m = makeMedalj()
    if (m) {
      m.view.position.set(PLATS.ansikte.x, PLATS.ansikte.y + 176)
      m.view.scale.set(0.2)
      this._boboL.addChild(m.view)
      this._medalj = m
      const st = { s: 0.2 }
      gsap.to(st, {
        s: 1, duration: 0.5, ease: 'back.out(2)',
        onUpdate: () => { if (this._alive && !m.view.destroyed) m.view.scale.set(st.s) },
        onComplete: () => { if (this._alive) m.glans?.() },
      })
      burst(ctx.fxLayer, PLATS.ansikte.x, PLATS.ansikte.y + 176, { count: 16, colors: PLAYFUL, power: 1.1 })
    }
    if (a) {
      a.slappMin?.()
      a.blick(0, 0)
      a.min('skratt', { hall: 1.8 })
      ctx.later(1.6, () => { if (this._alive) a.blinkning('h') })
    }
    this._sagPappa(ctx, 'fniss')

    // …och så börjar en ny runda — snabbare flugor, fler av dem, aldrig ett bakslag.
    ctx.later(5.4, () => {
      if (!this._alive) return
      this._medalj?.destroy?.()
      this._medalj = null
      if (this._ruta && !this._ruta.destroyed) {
        gsap.killTweensOf(this._ruta)
        this._ruta.destroy()
      }
      this._ruta = null
      this._ute = 0
      this._sattRunda()
      this._wow = Math.random() < 0.125
      this._busy = false
      this._sag(ctx, 'Fler flugor kommer in!')
      this._slappStart(ctx)
    })
  },

  /**
   * Fönstret stängs. Glaset är en ljus lutande strimma över en svagt blå platta — samma
   * konvention som rummets egen bågreflex. En helt genomskinlig ruta hade inte lästs alls.
   */
  _stangFonster(ctx) {
    const F = PLATS.fonster
    const ruta = new Graphics()
      .rect(-F.w / 2, -F.h / 2, F.w, F.h)
      .fill({ color: 0xcfe8f7, alpha: 0.42 })
      .stroke({ width: 8, color: 0xf3f7fa, alpha: 0.9 })
    ruta.moveTo(-F.w / 2 + 30, F.h / 2 - 20).lineTo(F.w / 2 - 60, -F.h / 2 + 30)
      .stroke({ width: 26, color: 0xffffff, alpha: 0.3 })
    ruta.position.set(F.x, F.y - F.h)
    ruta.eventMode = 'none'
    this._boboL.addChild(ruta)
    this._ruta = ruta
    ctx.services.audio.sfx('lucka')
    gsap.to(ruta, {
      y: F.y, duration: 0.55, ease: 'power2.in',
      onComplete: () => {
        if (!this._alive || ruta.destroyed) return
        sparkle(ctx.fxLayer, F.x, F.y, { count: 10 })
      },
    })
  },

  // ---------------------------------------------------------------- ljud & röst ---

  _sagPappa(ctx, namn) {
    const r = ROST[namn] || ROST.hmm
    const audio = ctx.services.audio
    const klart = (sek) => {
      this._pappaTill = Math.max(this._pappaTill || 0, performance.now() + sek * 1000)
      return sek
    }
    if (audio.harSample?.(r.klipp) && audio.sample(r.klipp)) {
      return klart(audio.sampleDuration?.(r.klipp) || 0)
    }
    audio.tone({ freq: r.ton[0], dur: 0.3, type: r.typ, vol: 0.2, slideTo: r.ton[1] })
    return klart(0.3)
  },

  _sag(ctx, text) {
    this._narTyst(ctx, () => { if (this._alive) ctx.services.voice.say(text) })
  },

  // ⚠️ `voice.say()` KAPAR den förra repliken (den kallar `cancel()` först), och klippen är
  //    2,3–4,1 s. Ingen replik får alltså läggas på ett fast tal — den väntar in både
  //    narratorn och pappas eget klipp. BILDEN väntar aldrig; bara orden köar.
  _narTyst(ctx, fn, varv = 0) {
    if (!this._alive) return
    const kvar = Math.max(
      ((this._pappaTill || 0) - performance.now()) / 1000,
      ctx.services.voice.kvar || 0,
      ctx.services.voice.talar ? 0.25 : 0,
    )
    if (kvar > 0.06 && varv < 10) {
      ctx.later(kvar + 0.12, () => this._narTyst(ctx, fn, varv + 1))
      return
    }
    fn()
  },

  // ---------------------------------------------------------------- loopen ---

  _update(ctx, dtMS) {
    if (!this._alive) return
    const dt = Math.min(0.05, dtMS / 1000)
    if (!this._busy) this._idle += dt
    if (this._flaktT > 0) this._flaktT -= dt
    if (this._kylT > 0) this._kylT -= dt
    if (this._vindT > 0) this._vindT -= dt

    // Syltens platsringar lyser medan burken hålls eller är markerad. Läget läses här och
    // inte i krokarna — `_deselect()` har ingen krok att haka i.
    this._visaSyltMarken(!!(this._drag && (this._drag.active || this._drag.selected)))

    const F = PLATS.fonster
    let narmast = null
    let narmastD = Infinity
    let paPappa = 0

    for (const f of [...this._flugor]) {
      if (f.lage === 'ut') continue
      if (f.landPaus > 0) f.landPaus -= dt
      if (f.klibbT > 0) {
        f.klibbT -= dt
        if (f.klibbT <= 0 && !f.kladdig) {
          f.vy.kladdig?.(false)
          f.bana._fart = this._fart
        }
      }

      if (f.lage === 'platt') {
        // Glidet ägs av tweenen i `_plattaTill` — loopen rör henne inte.
      } else if (f.lage === 'vilar') {
        f.plattT -= dt
        if (f.plattT <= 0) {
          // RESER SIG och flyr RAKT ut genom fönstret (ägarens punkt 2).
          f.lage = 'flyger'
          f.brattom = true
          f.armerad = true
          f.landPaus = 99
          f.vy.resa?.()
          f.vy.vingar?.(true)
          f.bana.lockaMot({ x: F.x, y: F.y })
          f.bana._fart = this._fart * 1.35
          ctx.services.audio.sfx('whoosh')
          sparkle(ctx.fxLayer, f.vy.view.x, f.vy.view.y, { count: 6 })
        }
      } else if (f.lage === 'sitter') {
        f.sittT -= dt
        // Näsan bygger nysningen. Alla andra zoner: hon lyfter av sig själv.
        if (f.sitter === 'nasa') {
          this._nysT += dt
          if (this._nysT >= NYS_TID) { this._nysa(ctx, f); continue }
        }
        if (f.sitter) paPappa += 1
        if (f.sittT <= 0) this._lyft(ctx, f)
      } else {
        // VINDFÄLTET, innan steget. Pusten ligger kvar drygt en sekund och bär flugan mot
        // fönstret — utanför fartspärren, annars raderas den i samma bildruta (`Flugbana.vind`).
        if (this._vindT > 0) {
          const v = this._vindKraft(f.bana.x, f.bana.y)
          if (v) {
            const k = v.s * FLAKT_KRAFT * dt * 3.4
            f.bana.vind(v.vx * k, v.vy * k, 0.5)
            // Hon SLÄPPER lockbetet i vinden — annars styr hon rakt tillbaka dit medan
            // pusten pågår, och fläkten ser overksam ut fast den arbetar. Fönstret och
            // brådskan är undantagna: de pekar redan åt rätt håll.
            if (!f.brattom && f.bana._lockad && this._syltPunkt && this._syltPunkt.x < PLATS.flakt.x) {
              f.bana.lockaMot(null)
            }
            f.landPaus = Math.max(f.landPaus, 0.5)
          }
        }
        f.bana.steg(dt)
        const vy = f.vy.view
        vy.x = f.bana.x
        vy.y = f.bana.y
        f.vy.vand?.(f.bana.vx >= 0 ? 1 : -1)

        // Ut genom fönstret? Bara om hon hunnit lämna det först — se `armerad`.
        const iFonstret = Math.abs(vy.x - F.x) < F.w / 2 && Math.abs(vy.y - F.y) < F.h / 2
        if (!iFonstret) f.armerad = true
        else if (f.armerad) {
          this._utFlog(ctx, f)
          continue
        }
        if (f.brattom) continue   // hon har bara ETT ärende kvar

        // KAFFEKOPPEN — en fluga som doppat sig kommer ut kladdig och långsam, alltså
        // LÄTTARE att vifta ut. Motgången är en GÅVA.
        if (!f.kladdig && !this._rum?.koppValt && f.landPaus <= 0
            && Math.hypot(vy.x - KOPP.x, vy.y - KOPP.y) < 34) {
          f.kladdig = true
          f.malKopp = false
          f.malPunkt = null
          f.bana.lockaMot(null)
          f.vy.kladdig?.(true)
          f.bana._fart = this._fart * 0.5
          ctx.services.audio.sfx('plopp')
          puff(ctx.fxLayer, KOPP.x, KOPP.y, { count: 7, color: 0x6b4a32 })
          f.landPaus = 0.8
        }
        // …och samma sak i den utspillda kaffepölen på skivan.
        const pol = this._rum?.kaffePol
        if (pol && !f.kladdig && f.landPaus <= 0 && Math.hypot(vy.x - pol.x, vy.y - pol.y) < 52) {
          f.kladdig = true
          f.bana.lockaMot(null)
          f.vy.kladdig?.(true)
          f.bana._fart = this._fart * 0.5
          ctx.services.audio.sfx('plopp')
          puff(ctx.fxLayer, vy.x, vy.y, { count: 6, color: 0x6b4a32 })
          f.landPaus = 0.8
        }

        // Landning. Ett lockbete vinner över allt annat: lockas hon dit ska hon dit.
        if (f.landPaus <= 0 && !this._lockbete()) {
          if (!f.malZon && !f.malKopp && !f.malProp) this._valjLandning(f)
          // ⚠️ ETT SIKTMÅL MÅSTE KUNNA GES UPP. Ett föremål högt upp på väggen kan ligga så
          //    att slumpvandringen kring lockbetet aldrig kommer inom 30 px, och då hade
          //    hon cirklat kring tavlan resten av rundan utan att någonsin landa. Efter
          //    7 s lottas ett nytt mål — och just den flugan blir samtidigt fri att lockas
          //    av sylten igen.
          f.malT += dt
          if (f.malT > 7) {
            f.malZon = null
            f.malKopp = false
            f.malProp = null
            f.malPunkt = null
            f.malT = 0
            f.bana.lockaMot(null)
          }
          if (f.malProp && f.malPunkt && Math.hypot(vy.x - f.malPunkt.x, vy.y - f.malPunkt.y) < 30) {
            this._landaProp(ctx, f, f.malProp)
            continue
          }
          const zon = this._zonFor(vy.x, vy.y)
          if (zon) this._landa(ctx, f, zon)
        }
      }

      const d = Math.hypot(f.vy.view.x - PLATS.ansikte.x, f.vy.view.y - PLATS.ansikte.y)
      if (d < narmastD) { narmastD = d; narmast = f }
    }

    // ÄGARENS PUNKT 4: pappa andas fortare ju fler flugor som sitter på honom. Det är
    // samma mätare som `vakna-pappa` använder till sömn, fast åt andra hållet — och den
    // säger "nu är han verkligen besvärad" utan en enda min.
    const takt = paPappa >= 2 ? 1.3 : paPappa === 1 ? 1.7 : 2.2
    if (takt !== this._sisteTakt) {
      this._sisteTakt = takt
      this._ans?.liv?.(true, { takt })
    }

    // BLICKEN — varje bildruta, mot den närmaste flugan. Ingen utjämning: mätt till
    // 1,2 lappbyten/s, alltså långt under flimmergränsen (se filhuvudet).
    const a = this._ans
    if (a && narmast && narmast.lage === 'flyger' && !this._busy) {
      const dx = (narmast.vy.view.x - PLATS.ansikte.x) / BLICK_RADIE
      const dy = (narmast.vy.view.y - this._ogonY) / BLICK_RADIE
      a.blick(klamp(dx, -1, 1), klamp(dy, 0, 1))
    }

    if (this._idle > 6.5 && !this._busy) {
      this._idle = 0
      this._cueVaxel = (this._cueVaxel + 1) % 3
      if (this._cueVaxel === 0) this._sag(ctx, 'Välj ett verktyg i lådan och tryck där flugan är.')
      else if (this._cueVaxel === 1) this._sag(ctx, 'Ställ sylten i fönstret så flyger flugan ut.')
      else this._sag(ctx, 'Blås med fläkten!')
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._root?.off('pointerdown', this._vakna)
    for (const v of this._verktygKnappar) {
      v.av?.()
      gsap.killTweensOf(v.konst)
      if (v.konst?.scale) gsap.killTweensOf(v.konst.scale)
    }
    this._verktygKnappar = []
    for (const f of [...this._flugor, ...(this._doda || [])]) this._rivFluga(f)
    this._flugor = []
    this._doda = []
    this._effekter?.destroy?.()
    this._effekter = null
    // Vindstrimmorna bor i `ctx.fxLayer` — appens EGET lager, som överlever spelet. De
    // måste därför rivas här och inte av `_root.destroy()`.
    for (const s of this._vindNoder || []) {
      if (!s || s.destroyed) continue
      gsap.killTweensOf(s)
      s.parent?.removeChild(s)
      s.destroy()
    }
    this._vindNoder = []
    for (const r of this._syltMarken || []) if (r && !r.destroyed) gsap.killTweensOf(r)
    this._syltMarken = []
    if (this._ans && !this._ans.view.destroyed) gsap.killTweensOf(this._ans.view)
    if (this._ruta && !this._ruta.destroyed) gsap.killTweensOf(this._ruta)
    this._ruta = null
    if (this._medalj?.view && !this._medalj.view.destroyed) gsap.killTweensOf(this._medalj.view)
    this._medalj?.destroy?.()
    this._medalj = null
    if (this._sylt?.view && !this._sylt.view.destroyed) gsap.killTweensOf(this._sylt.view)
    this._sylt?.destroy?.()
    this._sylt = null
    this._drag?.destroy?.()
    this._drag = null
    this._bobo?.destroy?.()
    this._bobo = null
    this._rum?.destroy?.()
    this._rum = null
    this._ans?.destroy()
    this._ans = null
    this._root?.destroy({ children: true })
    this._root = null
  },
}
