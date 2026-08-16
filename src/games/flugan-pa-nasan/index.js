// FLUGAN — spel 4 i ansiktssektionen (`docs/games/flugan-pa-nasan.md`).
//
// En fluga surrar runt pappa och landar på honom. `traffar()` avgör EXAKT var — näsa, panna,
// kind, öra, haka, lugg — och varje zon har sin egen reaktion. Mellan landningarna följer
// pappa flugan med blicken, varje bildruta. Det är själen i spelet.
//
// GULDKORNET: landar flugan på näsan används `blick_ner` — han tittar ner på sin egen näsa.
// Den lappen har funnits sedan riggen byggdes och ingen har använt den till det.
//
// ⚠️ MÄTFRÅGAN ÄR AVGJORD, OCH DEN FÖLL ÅT ANDRA HÅLLET. `blick()`s hysteres är inställd på
//    en långsamt dragen matbit, och spec-kortet varnade för att en fluga skulle få lappen
//    att flimra (gränsen ~3 byten/s = ett ögonflimmer på ett fotoansikte). Uppmätt med
//    `scripts/_blickprobe.mjs`, som hakar på riggens egen `_blickTill()` och räknar BYTEN:
//    rå fluga **1,2 byten/s**, kontrollarm (samma bana i 1/5 farten) 0,4. Riggens hysteres
//    absorberar redan ryckigheten. Den kända reserven — att lågpassfiltrera flugans läge —
//    är därför MEDVETET INTE inkopplad: ett filter fördröjer blicken, och att blicken följer
//    flugan är precis det spelet handlar om. `Blickfilter` står kvar i `fluga.js` som mätt
//    reserv, och sonden kör den som tredje arm.
//
// ⚠️ BARNET KAN ALDRIG FASTNA. Sitter flugan för länge på näsan bygger pappa upp en NYSNING
//    som blåser iväg den själv (P0 MOTGÅNG: hinder får sakta ner, aldrig stoppa).
import { Circle, Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PLATS, byggRum } from './rummet.js'
import { makeFluga, makeMedalj, makeSylt } from './props.js'
import { BLICK_RADIE, Flugbana } from './fluga.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { DragController } from '../../lib/DragController.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { burst, kvittera, puff, ripple, sparkle } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'

const ANS_H = 300
const MAL_UTE = 3          // tre flugor ut = en runda
const MAX_SAMTIDIGT = 2    // aldrig fler än två i luften (spec)
const FLAKT_CD = 2         // s mellan två pustar — taket på fläkten
const VIFT_R = 96          // P0: en viftning räknas inom 96 px från flugan
const SITT_MIN = 2.2
const SITT_MAX = 4.6
const NYS_TID = 6          // s på näsan innan nysningen byggs upp
const LAND_PAUS = 1.6      // s efter en start innan hon får landa igen
// Kaffekoppens mynning, uppmätt av `rummet.js` (fatet 1110,542 — muggens mynning y 490).
const KOPP = { x: 1110, y: 492 }

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
}

export default {
  id: 'flugan-pa-nasan',
  titleSv: 'Flugan',
  icon: '🪰',
  category: 'roligt',
  input: 'mixed',
  ageRange: [2, 5],
  voiceIntro: 'Titta, en fluga! Den kittlar pappa på näsan.',

  async init(ctx) {
    this._alive = true
    this._busy = false
    this._idle = 0
    this._ute = 0
    this._flugor = []
    this._doda = []   // flugor mitt i utflygningen — de ägs av ingen annan lista
    this._kvarAttSlappa = MAL_UTE
    this._flaktT = 0
    this._nysT = 0
    this._pappaTill = 0
    this._cueVaxel = 0
    this._sylt = null
    this._syltPunkt = null
    this._wow = Math.random() < 0.125

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
      this._ogonY = PLATS.ansikte.y - 22
      this._munY = PLATS.ansikte.y + 55
      this._ansBredd = 275
    }
    // Näsan ligger mellan ögonlinjen och munnen — härlett ur manifestet, inte stämt.
    this._nasY = (this._ogonY + this._munY) / 2

    this._byggBobo(ctx)
    this._byggSylt(ctx)
    this._byggFlakt(ctx)
    this._rum.liv?.()

    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)

    this._root.eventMode = 'static'
    this._root.hitArea = new Rectangle(-400, -300, 2080, 1320)
    this._vakna = (e) => this._tryck(ctx, e)
    this._root.on('pointerdown', this._vakna)

    this._slappFluga(ctx, 0.8)
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

  // ---------------------------------------------------------------- uppställning ---

  _byggBobo(ctx) {
    // Mottagaren (kvalitetsgrind 4). Han står vid fönstret hela tiden och hejar — utan en
    // mottagare är finalen bara en siffra som blev full.
    try {
      this._bobo = makeKaraktar({ r: 52, kropp: true })
      // Nere till vänster på golvet: klar av pappas ansikte (x 281–439, ner till y 464),
      // av syltburkens hemplats (500, 540) och av bordets föremål.
      this._bobo.view.position.set(168, 566)
      this._boboL.addChild(this._bobo.view)
      this._bobo.setMood?.('nyfiken')
      this._bobo.idle?.()
    } catch (e) {
      console.warn('flugan-pa-nasan: Bobo kunde inte byggas —', e?.message || e)
    }
  },

  /**
   * Syltburken. TRE tydliga platser i stället för fri placering, och det är ett medvetet
   * val: en 2-åring har inte pixelprecision, och tre stora snäppytor är läsbara medan en
   * fri yta är en gissning. `DragController` bär dessutom tap-tap-fallbacken (P0 GESTER).
   *
   * Fönsterbrädan är 4-åringens aha: ställer man sylten där flyger flugan ut av sig själv.
   */
  _byggSylt(ctx) {
    this._drag = new DragController({ space: this._syltL, services: ctx.services })
    // ⚠️ TVÅ PLATSER, INTE TRE — och nedskärningen är en rättning, inte en förenkling.
    //    Bordet var min egen tillbyggnad, och det gick inte att placera: rummet är fullt.
    //    Vid x 830 skar släppcirkeln (radie 74) in i fläktens träffyta (x 604–796), där
    //    klicklagret vinner och svalde tap-tap-släppet, och burkens ritade kropp gick 39 px
    //    in i pappershögen (x 826) — ett lager rummet mätte millimeter för att slippa
    //    krocka. Vid x 920 hamnade den i stället 114 px från fönsterplatsen, alltså inom
    //    varandras `hitRadius`: ett släpp emellan blev ett myntkast.
    //    Kvar är det val som faktiskt betyder något — fönsterbrädan eller bordet hos pappa —
    //    och det är dessutom det enda ett tvååring läser. 546 px isär, noll tvetydighet.
    const platser = [
      { namn: 'hem', x: PLATS.sylt.x, y: PLATS.sylt.y },                                     // 500, 540
      { namn: 'fonster', x: PLATS.fonster.x, y: PLATS.fonster.y + PLATS.fonster.h / 2 + 24 }, // 1010, 400
    ]
    for (const p of platser) {
      const mal = new Graphics().circle(0, 0, 74).fill({ color: 0xffffff, alpha: 0 })
      mal.position.set(p.x, p.y)
      this._syltL.addChild(mal)
      this._drag.addTarget(mal, () => true, { hitRadius: 110 })
      mal._wNamn = p.namn
    }

    const sylt = makeSylt()
    if (!sylt) return
    sylt.view.position.set(PLATS.sylt.x, PLATS.sylt.y)
    // ⚠️ `DragController.addItem()` SÄTTER INGEN `hitArea` — den sätter bara `eventMode`,
    //    och då träfftestar Pixi mot den RITADE silhuetten. Burken är 70×94 px och halsen
    //    bara 56, alltså långt under P0:s 96. Fläkten fick sin rektangel av exakt samma
    //    skäl; den här hade lika gärna kunnat glömmas bort, för inget test mäter geometri.
    sylt.view.hitArea = new Rectangle(-62, -78, 124, 156)
    this._syltL.addChild(sylt.view)
    sylt.liv?.()
    this._sylt = sylt
    this._drag.addItem(sylt.view, { sylt: true }, {
      onCorrect: (rec, target) => {
        if (!this._alive) return
        this._idle = 0
        sylt.oppna?.()
        ctx.services.audio.sfx('plopp')
        this._syltPunkt = { x: target.view.x, y: target.view.y - 30 }
        this._lockaAlla()
        // ⚠️ BURKEN MÅSTE BLI DRAGBAR IGEN. `_resolveDrop` låser ett accepterat föremål
        //    DUBBELT (`placed = true` OCH `eventMode = 'none'`), och inget i biblioteket
        //    öppnar låset av sig självt — det är rätt förval för en pusselbricka som ska
        //    ligga kvar, men fel här: hela poängen är att flytta sylten flera gånger.
        //    (Samma fel gjorde `mata-munnen`s utspottade gaffel omöjlig att plocka upp.)
        ctx.later(0.4, () => { if (this._alive) this._drag?.aterstall(this._sylt?.view) })
      },
      onMiss: () => {
        if (!this._alive) return
        this._syltPunkt = null
        this._lockaAlla()
      },
    })
  },

  _byggFlakt(ctx) {
    const nod = this._rum.flaktNod
    if (!nod) return
    // ⚠️ FLÄKTEN ÄR HÖG, INTE RUND. Nodens geometri spänner y −185…19 (galler, stativ, fot),
    //    så en cirkel kring ankaret hade lämnat hela gallret — den enda del ett barn siktar
    //    på — utanför träffytan. Rektangeln är rummets egen uppmätta, plus 24 px halo.
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

  _slappFluga(ctx, forsening = 0) {
    if (!this._alive || this._kvarAttSlappa <= 0) return
    if (this._flugor.length >= MAX_SAMTIDIGT) return
    this._kvarAttSlappa -= 1
    ctx.later(forsening, () => {
      if (!this._alive) return
      const vy = makeFluga()
      if (!vy) return
      // Hon kommer in genom fönstret — samma väg hon ska ut.
      const start = { x: PLATS.fonster.x, y: PLATS.fonster.y }
      // ⚠️ OMRÅDET ÄR CENTRERAT PÅ PAPPA, inte mitt emellan honom och fönstret. Första
      //    versionen spände hela rummet (x 150–1220), och då passerade flugan bara
      //    undantagsvis över ansiktet: uppmätt **2 landningar på 240 s**, och näsan —
      //    spelets uttalade guldkorn — nåddes aldrig. En fluga cirklar kring den den
      //    besvärar; den irrar inte runt i ett rum.
      const bana = new Flugbana({
        x: start.x, y: start.y,
        omrade: { x: PLATS.ansikte.x + 60, y: PLATS.ansikte.y - 30, w: 520, h: 330 },
      })
      vy.view.position.set(start.x, start.y)
      this._flugL.addChild(vy.view)
      vy.vingar?.(true)
      // ⚠️ `armerad` ÄR INTE EN DETALJ — utan den var spelet färdigt på en sekund. Flugan
      //    föds vid fönstret (samma väg hon ska ut), alltså INNE i målzonen, och
      //    ut-testet i `_update` slog till på första bildrutan: tre flugor "flög ut" utan
      //    att någonsin ha flugit, och finalen kom direkt. Det syntes inte i testet — det
      //    var grönt, 0 konsolfel — utan i skärmdumpen, som visade konfetti och medalj
      //    efter åtta sekunder. Hon måste alltså först LÄMNA fönstret innan hon kan räknas
      //    som utflugen.
      const f = { vy, bana, sitter: null, sittT: 0, kladdig: false, landPaus: LAND_PAUS, ute: false, armerad: false }
      this._flugor.push(f)
      if (this._syltPunkt) f.bana.lockaMot(this._syltPunkt)
      ctx.services.audio.sample?.('djur_bi') || ctx.services.audio.tone({ freq: 210, dur: 0.4, type: 'sawtooth', vol: 0.07, slideTo: 240 })
    })
  },

  _lockaAlla() {
    for (const f of this._flugor) {
      if (!f.sitter) f.bana.lockaMot(this._syltPunkt)
    }
  },

  /** VIFTNINGEN: hon lyfter BORT från trycket — alltså styr träffpunkten riktningen. */
  _tryck(ctx, e) {
    this._idle = 0
    if (!this._alive) return
    if (e?.target && e.target !== this._root) return
    const p = e.global ? this._root.toLocal(e.global) : null
    if (!p) return

    let traffad = false
    for (const f of this._flugor) {
      if (f.ute) continue
      const d = Math.hypot(f.vy.view.x - p.x, f.vy.view.y - p.y)
      if (d > VIFT_R) continue
      traffad = true
      this._lyft(ctx, f)
      f.bana.knuff(p.x, p.y, 1)
      burst(ctx.fxLayer, f.vy.view.x, f.vy.view.y, { count: 6, colors: PLAYFUL, power: 0.6 })
      ctx.services.audio.sfx('whoosh')
    }
    if (traffad) return
    // Ett tomt tryck ska ändå ge ljud+bild inom 100 ms (P0 ÅTERKOPPLING).
    ripple(ctx.fxLayer, p.x, p.y, { color: 0xffffff, maxR: 56 })
    ctx.services.audio.tone({ freq: 430, dur: 0.11, type: 'sine', vol: 0.1, slideTo: 540 })
  },

  _blas(ctx) {
    this._idle = 0
    if (!this._alive) return
    if (this._flaktT > 0) {
      // Fläkten laddar om — men pekningen får ALDRIG dö tyst.
      kvittera(ctx.fxLayer, PLATS.flakt.x, PLATS.flakt.y, ctx.services.audio)
      return
    }
    this._flaktT = FLAKT_CD
    const riktning = PLATS.flakt.x < PLATS.ansikte.x ? 1 : -1
    this._rum.blas?.(riktning)
    this._rum.papper?.()
    ctx.services.audio.sfx('whoosh')
    // Vindkonen: allt inom konen får en knuff i blåsriktningen.
    for (const f of this._flugor) {
      if (f.ute) continue
      const dy = Math.abs(f.vy.view.y - PLATS.flakt.y)
      const framfor = (f.vy.view.x - PLATS.flakt.x) * riktning
      if (framfor < 0 || framfor > 620 || dy > 180 + framfor * 0.35) continue
      this._lyft(ctx, f)
      f.bana.knuff(PLATS.flakt.x, PLATS.flakt.y, 1.35)
    }
  },

  _lyft(ctx, f) {
    if (!f.sitter) return
    f.sitter = null
    f.landPaus = LAND_PAUS
    // Siktmålet släpps när hon lyfter — nästa gång lottas en NY zon ur poolen, annars
    // återvänder hon till samma ställe om och om igen.
    f.malZon = null
    f.malKopp = false
    f.malPunkt = null
    f.bana.lockaMot(this._syltPunkt || null)
    f.vy.vingar?.(true)
    f.vy.lyft?.()
    this._nysT = 0
    this._ans?.slappMin?.()
  },

  /**
   * VART flugan siktar när hon vill landa. En punkt per zon, härledd ur ansiktets egen
   * geometri — och zonen lottas ur en pool som roterar, så alla sex reaktioner faktiskt nås.
   *
   * ⚠️ ATT LITA PÅ SLUMPVANDRINGEN RÄCKTE INTE, och det är mätt: utan ett uttalat siktmål
   *    landade flugan 2 gånger på 240 s och nådde två zoner av sex (`_blickprobe --zoner`).
   *    Fyra byggda och betalda reaktioner var alltså osynliga. Siktmålet STYR bara vägen;
   *    `traffar()` avgör fortfarande om hon verkligen rör vid honom.
   */
  _zonPunkt(zon) {
    const cx = PLATS.ansikte.x
    const halv = (this._ansBredd || 275) / 2
    switch (zon) {
      case 'lugg': return { x: cx + (Math.random() - 0.5) * 60, y: this._ogonY - 74 }
      case 'oga': return { x: cx + (Math.random() < 0.5 ? -34 : 34), y: this._ogonY - 2 }
      case 'nasa': return { x: cx, y: this._nasY }
      case 'kind': return { x: cx + (Math.random() < 0.5 ? -1 : 1) * halv * 0.42, y: this._nasY + 10 }
      case 'ora': return { x: cx + (Math.random() < 0.5 ? -1 : 1) * halv * 0.72, y: this._ogonY + 22 }
      default: return { x: cx + (Math.random() - 0.5) * 50, y: this._munY + 44 }
    }
  },

  _valjLandning(f) {
    // ⚠️ KAFFEKOPPEN MÅSTE FÅ VARA ETT SIKTMÅL, annars är den oåtkomlig. Att bara koppla in
    //    `kladdig()` räckte inte: flugans område är centrerat på pappa (x 160–680) och
    //    koppen står på 1110, så hon kom aldrig i närheten. Exakt samma fälla som gjorde
    //    fyra av sex ansiktszoner osynliga — en mekanism kan vara inkopplad, korrekt och
    //    ändå aldrig hända.
    if (!f.kladdig && Math.random() < 0.18) {
      // Egen flagga, inte `malZon = null` — anroparen frågar på `!malZon` och hade rullat
      // om siktmålet varje bildruta, alltså aldrig kommit fram.
      f.malKopp = true
      f.malPunkt = { x: KOPP.x, y: KOPP.y }
      f.bana.lockaMot(f.malPunkt)
      return
    }
    f.malKopp = false
    if (!this._zonPool || !this._zonPool.length) {
      // Poolen töms innan den fylls på: då kommer alla sex innan någon kommer två gånger.
      this._zonPool = ['lugg', 'oga', 'nasa', 'kind', 'ora', 'haka'].sort(() => Math.random() - 0.5)
    }
    f.malZon = this._zonPool.pop()
    f.malPunkt = this._zonPunkt(f.malZon)
    f.bana.lockaMot(f.malPunkt)
  },

  /** Vilken zon träffen låg i. `traffar()` avgör OM den är på ansiktet; y/x avgör VAR. */
  _zonFor(x, y) {
    const a = this._ans
    if (!a || !a.traffar(x, y, 16)) return null
    const cx = PLATS.ansikte.x
    const halv = (this._ansBredd || 275) / 2
    if (Math.abs(x - cx) > halv * 0.62) return 'ora'
    if (y < this._ogonY - 52) return 'lugg'
    if (Math.abs(y - this._ogonY) <= 26) return 'oga'
    if (Math.abs(y - this._nasY) <= 30 && Math.abs(x - cx) < halv * 0.32) return 'nasa'
    if (y > this._munY + 34) return 'haka'
    return 'kind'
  },

  _landa(ctx, f, zonNamn) {
    const a = this._ans
    const z = ZON[zonNamn]
    if (!z) return
    f.sitter = zonNamn
    // ⚠️ NÄSAN MÅSTE FÅ SITTA LÄNGRE ÄN NYSNINGEN TAR ATT BYGGA UPP. `NYS_TID` är 6 s medan
    //    `SITT_MAX` är 4,6 — med samma sitt-tid för alla zoner hann den vanliga
    //    lyft-timeouten alltid först, och `_nysa()` (gasp-minen, 20 partiklar, ATJOO:t som
    //    blåser iväg henne själv) spelades ALDRIG upp. Det är den mekanism filhuvudet
    //    utpekar som garantin att barnet aldrig kan fastna, och den var död kod.
    f.sittT = zonNamn === 'nasa'
      ? NYS_TID + 1.2 + Math.random() * 1.4
      : SITT_MIN + Math.random() * (SITT_MAX - SITT_MIN)
    f.vy.vingar?.(false)
    f.vy.landa?.()
    if (!a) return
    a.slappMin?.()

    if (zonNamn === 'nasa') {
      // GULDKORNET: han tittar ner på sin egen näsa. `blick_ner` finns sedan riggen byggdes
      // och har aldrig använts till det här.
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

  /**
   * NYSNINGEN — taket på motgången. Sitter flugan för länge på näsan bygger pappa upp den,
   * och den blåser iväg flugan SJÄLV. Barnet kan alltså aldrig fastna, oavsett hur illa det
   * går (P0: hinder får sakta ner, aldrig stoppa).
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
      if (this._flugor.includes(f) && !f.ute) {
        this._lyft(ctx, f)
        // Nysningen blåser henne mot fönstret — hjälpsam, men hon åker inte ut gratis.
        f.bana.knuff(PLATS.ansikte.x, this._nasY, 2.2)
      }
    })
  },

  _utFlog(ctx, f) {
    if (f.ute) return
    f.ute = true
    this._ute += 1
    ctx.services.audio.sfx('reveal')
    sparkle(ctx.fxLayer, PLATS.fonster.x, PLATS.fonster.y, { count: 14 })
    this._bobo?.react?.('jubel')
    const vy = f.vy
    gsap.to(vy.view, {
      x: PLATS.fonster.x, y: PLATS.fonster.y - 30, alpha: 0, duration: 0.45, ease: 'power2.in',
      onComplete: () => { if (this._alive) this._rivFluga(f) },
    })
    this._flugor = this._flugor.filter((x) => x !== f)
    this._doda = this._doda || []
    this._doda.push(f)

    if (this._ute >= MAL_UTE) {
      ctx.later(0.9, () => { if (this._alive) this._final(ctx) })
      return
    }
    this._sag(ctx, 'Nu flög den ut genom fönstret!')
    this._slappFluga(ctx, 1.2)
  },

  _rivFluga(f) {
    if (!f) return
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

    ctx.progress.setLevel((ctx.progress.get().highestLevel || 0) + 1)
    ctx.progress.complete()
    this._sag(ctx, 'Tack, säger pappa. Nu är det lugnt igen.')

    this._bobo?.react?.('jubel')
    this._stangFonster(ctx)
    const m = makeMedalj()
    if (m) {
      m.view.position.set(PLATS.ansikte.x, PLATS.ansikte.y + 150)
      m.view.scale.set(0.2)
      this._boboL.addChild(m.view)
      this._medalj = m
      const st = { s: 0.2 }
      gsap.to(st, {
        s: 1, duration: 0.5, ease: 'back.out(2)',
        onUpdate: () => { if (this._alive && !m.view.destroyed) m.view.scale.set(st.s) },
        onComplete: () => { if (this._alive) m.glans?.() },
      })
      burst(ctx.fxLayer, PLATS.ansikte.x, PLATS.ansikte.y + 150, { count: 16, colors: PLAYFUL, power: 1.1 })
    }
    if (a) {
      a.slappMin?.()
      a.blick(0, 0)
      a.min('skratt', { hall: 1.8 })
      ctx.later(1.6, () => { if (this._alive) a.blinkning('h') })
    }
    this._sagPappa(ctx, 'fniss')

    // …och så börjar en ny runda: tre nya flugor, aldrig ett bakslag.
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
      this._kvarAttSlappa = MAL_UTE
      this._wow = Math.random() < 0.125
      this._busy = false
      this._slappFluga(ctx, 0.4)
    })
  },

  /**
   * Fönstret stängs. `rummet.js` exponerar ingen styrning av bågen, så rutan ritas här och
   * glider ner över öppningen — det är en approximation av spec-kortets "Bobo stänger
   * fönstret", och den står som en punkt i doc §4.
   *
   * Glaset är en ljus lutande strimma över en svagt blå platta, alltså samma konvention som
   * rummets egen bågreflex. En helt genomskinlig ruta hade inte lästs som något alls.
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

    const F = PLATS.fonster
    let narmast = null
    let narmastD = Infinity

    for (const f of this._flugor) {
      if (f.ute) continue
      if (f.landPaus > 0) f.landPaus -= dt

      if (f.sitter) {
        f.sittT -= dt
        // Näsan bygger nysningen. Alla andra zoner: hon lyfter av sig själv.
        if (f.sitter === 'nasa') {
          this._nysT += dt
          if (this._nysT >= NYS_TID) { this._nysa(ctx, f); continue }
        }
        if (f.sittT <= 0) this._lyft(ctx, f)
      } else {
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
        // KAFFEKOPPEN — spec-kortets motgång, och den är en GÅVA: en fluga som doppat sig
        // kommer ut kladdig och långsam, alltså LÄTTARE att vifta ut. Den kopplas in här
        // och inte i `_zonFor`, för koppen står på bordet och är inte en ansiktszon.
        if (!f.kladdig && f.landPaus <= 0 && Math.hypot(vy.x - KOPP.x, vy.y - KOPP.y) < 34) {
          f.kladdig = true
          f.malKopp = false
          f.malPunkt = null
          f.bana.lockaMot(null)
          f.vy.kladdig?.(true)
          f.bana._fart = 150 // hon orkar inte längre — halva farten
          ctx.services.audio.sfx('plopp')
          puff(ctx.fxLayer, KOPP.x, KOPP.y, { count: 7, color: 0x6b4a32 })
          f.landPaus = 0.8
        }

        // Landning. Sylten vinner över pappa: lockas hon av den ska hon dit, inte hit.
        if (f.landPaus <= 0 && !this._syltPunkt) {
          if (!f.malZon && !f.malKopp) this._valjLandning(f)
          const zon = this._zonFor(vy.x, vy.y)
          if (zon) this._landa(ctx, f, zon)
        }
      }

      const d = Math.hypot(f.vy.view.x - PLATS.ansikte.x, f.vy.view.y - PLATS.ansikte.y)
      if (d < narmastD) { narmastD = d; narmast = f }
    }

    // BLICKEN — varje bildruta, mot den närmaste flugan. Ingen utjämning: mätt till
    // 1,2 lappbyten/s, alltså långt under flimmergränsen (se filhuvudet).
    const a = this._ans
    if (a && narmast && !narmast.sitter && !this._busy) {
      const dx = (narmast.vy.view.x - PLATS.ansikte.x) / BLICK_RADIE
      const dy = (narmast.vy.view.y - this._ogonY) / BLICK_RADIE
      a.blick(Math.max(-1, Math.min(1, dx)), Math.max(0, Math.min(1, dy)))
    }

    if (this._idle > 6.5 && !this._busy) {
      this._idle = 0
      this._cueVaxel = (this._cueVaxel + 1) % 3
      if (this._cueVaxel === 0) this._sag(ctx, 'Tryck på flugan så flyger den iväg.')
      else if (this._cueVaxel === 1) this._sag(ctx, 'Ställ sylten där du vill att flugan ska flyga.')
      else this._sag(ctx, 'Blås med fläkten!')
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._root?.off('pointerdown', this._vakna)
    for (const f of [...this._flugor, ...(this._doda || [])]) this._rivFluga(f)
    this._flugor = []
    this._doda = []
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
