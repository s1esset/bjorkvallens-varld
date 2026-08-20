// BORSTA PAPPAS TÄNDER — spel 5 i ansiktssektionen (`docs/games/borsta-tanderna.md`).
//
// Barnet väljer en tandkräm på hyllan, drar tandborsten till pappas gapande mun och
// skrubbar. Där borsten går försvinner smutsen och skummet växer; ansiktet svarar på VAR
// borsten är. När alla fläckar är borta lyser vattenglaset — ett tryck, och han gurglar,
// spottar i handfatet och ler med blanka tänder.
//
// ⚠️ SPEC-KORTETS PREMISS BÖJDES AV EN MÄTNING, och talet står i `layout.js`:
//    munnen är ingen HÅLA att föra in en borste i. `_gapprobe.mjs` bytte mun-lagret mot en
//    magenta platta i samma läge och samma index (kontrollarm: gap 0 gav 0 px) och mätte den
//    yta som faktiskt SYNS mellan överläppens underkant och käkens överkant: **233 × 46 px**
//    vid fullt gap och `hojd: 1100`. Manifestets mun-ruta är 234 × 190 — tre fjärdedelar av
//    den är skymd. Munnen är alltså en bred, låg TANDRAD, och det är också vad tandborstning
//    är: ett vågrätt svep längs en rad. Smutsen ligger på raden; SKUMMET, som är det barnet
//    ser växa, svämmar ut över läpparna och hakan där det finns hur mycket plats som helst.
//
// ⚠️ EN MIN STÄNGER MUNNEN. `Ansikte.min()` anropar `gap(0)` — en min bär sin egen mun.
//    Därför får INGA miner spelas medan borsten arbetar på raden: reaktionen inne i munnen
//    är ljud + `nick()` + skum, aldrig en grimas. Grimaserna hör hemma där han ändå drar sig
//    undan (kind, näsa, öra, haka) och vid kittlingen, och de hålls korta. `_minLas` stänger
//    av gap-styrningen så länge en lapp visas, annars slåss den med `min()` om samma fält.
//
// ⚠️ SMUTSEN OCH SKUMMET RITAS I FOTORUTANS KOORDINATER, som barn till riggens inre
//    container: raden vid mun-lagrets index (då skymmer käken och överläppen den gratis,
//    utan mask), läppskummet överst av allt (det ska synas även genom en grimas). Följden
//    är att BÅDA följer andning och huvudgester av sig själva — men också att deras tweens
//    måste dödas FÖRE `ans.destroy()`: den river `view` med barn, och en tween mot ett rivet
//    barnbarn är precis den tysta läckan `bygg-en-kompis` betalade för.
//
// ⚠️ TUNGAN ÄR MOTGÅNGEN, och den slickar INTE bakom en grimas. Ordningen är: tungan sveper
//    medan munnen står öppen (annars ser barnet ingenting), DÄREFTER kommer `retas`-lappen.
//    Taket: en fläck åt gången, tidigast var 8:e sekund, och den återställs bara till 0,55 —
//    aldrig till full smuts. Att borsta om den tar ~0,4 s mot 8 s väntan, så framsteget
//    vinner alltid (P0 MOTGÅNG: sakta ner, aldrig stoppa).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { DragController } from '../../lib/DragController.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { burst, kvittera, liv, pop, puff, ripple, sparkle, wiggle } from '../../lib/feedback.js'
import { byggBadrum } from './badrum.js'
import { BORSTE_HUVUD, SMUTS, TUBER, makeBorste, makeGlas, makeMugg, makeSkumklick, makeSmutsflack, makeTandglans, makeTub } from './verktyg.js'
import {
  ANS, ANS_H, ANSIKTE_YTA, BOBO, BORSTE_HEM, GLAS, HO, K, KONTAKT_R,
  MUGG, RAD_RUTA, TANDRAD, TUB_PLATS,
} from './layout.js'

// Fotorutans mått — behövs för design→ruta-omräkningen. Samma tal som manifestet; läses
// ur riggen när den laddats, konstanterna är bara reservvärden om laddningen faller.
const RUTA_W = 733
const RUTA_H = 800
// Munnens mittpunkt i fotorutans koordinater (manifestets `geometri.mun` + halva dess mått,
// plus några px nedåt så lödret börjar på läppen och kryper mot hakan).
const MUN_RUTA = { x: 368, y: 545 }

const RENS = 1.45          // andel smuts som försvinner per sekunds kontakt vid full fart
const SKUM_MAX = 14        // tak på läppskummets klickar — ett lödder, inte en snöstorm
const ZON_PAUS = 1.15      // s mellan två ansiktsreaktioner (annars grimaserar han i ett)
const KITTEL_PAUS = 3.6    // s mellan två kittlingar
const TUNGA_PAUS = 8       // s mellan två tungslickningar (spec-kortets tak)
const TUNGA_ATER = 0.55    // hur mycket smuts en slickning lägger tillbaka
const SKRUBB_PAUS = 0.085  // s mellan två skrubb-korn
const IDLE_CUE = 6.5       // s stillhet innan en mjuk om-cue
const SKRUBB_SLINGA = 'borsta_skrubb'

const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Pappas egna uttrycksljud. Finns klippet spelas det; annars en stämd ton, aldrig en
// summer. Samma mönster som `flugan-pa-nasan` — och `pappa_slurp`/`pappa_gurgla` finns
// ännu inte inspelade, så de faller på tonen tills `/rost` levererar dem.
const ROST = {
  chock: { klipp: 'pappa_chock', ton: [300, 620], typ: 'sine' },
  mmm: { klipp: 'pappa_mmm', ton: [330, 392], typ: 'sine' },
  fniss: { klipp: 'pappa_fniss', ton: [600, 760], typ: 'triangle' },
  oj: { klipp: 'pappa_oj', ton: [520, 780], typ: 'sine' },
  ehh: { klipp: 'pappa_ehh', ton: [300, 380], typ: 'sine' },
  aaah: { klipp: 'pappa_aaah', ton: [392, 494], typ: 'sine' },
  gasp: { klipp: 'pappa_gasp', ton: [300, 200], typ: 'sine' },
  hmm: { klipp: 'pappa_hmm', ton: [330, 296], typ: 'sine' },
  huh: { klipp: 'pappa_huh', ton: [430, 330], typ: 'sine' },
  retas: { klipp: 'pappa_retas', ton: [560, 700], typ: 'triangle' },
  slurp: { klipp: 'pappa_slurp', ton: [240, 520], typ: 'sawtooth' },
  gurgla: { klipp: 'pappa_gurgla', ton: [180, 150], typ: 'sawtooth' },
}

// Zonerna UTANFÖR munnen. Vilken som gäller avgörs av `ans.traffar()` (radprofilerad
// silhuett, aldrig en handstämd ellips) PLUS var på ansiktet punkten låg.
const ZON = {
  kind: { min: 'skratt', ljud: 'fniss', luta: true },
  nasa: { min: 'skeptisk', ljud: 'huh' },
  ora: { min: 'skratt', ljud: 'fniss', replik: true, luta: true },
  haka: { min: 'forvanad', ljud: 'oj' },
  panna: { min: 'forvanad', ljud: 'oj' },
}

export default {
  id: 'borsta-tanderna',
  titleSv: 'Borsta Pappas tänder',
  icon: '🪥',
  category: 'roligt',
  input: 'mixed',
  ageRange: [2, 5],
  voiceIntro: 'Borsta pappas tänder!',

  async init(ctx) {
    this._alive = true
    this._busy = false
    this._fas = 'valj'          // valj → borsta → skolj → final
    this._tid = 0
    this._idle = 0
    this._tub = null
    this._flackar = []
    this._skumKlickar = []
    this._tubKnappar = []
    this._gapNu = 0
    this._minTill = 0
    this._zonTill = 0
    this._kittelTill = 0
    this._tungaTill = 0
    this._skrubbTill = 0
    this._skrubbLjud = false
    this._autoSkrubb = 0
    this._sistK = null
    this._sistAktiv = false
    this._skrubbatNu = 0
    this._zonNu = null
    this._zonSedan = 0
    this._fart = 0
    this._skumNiva = 0
    this._nastaSkum = 0
    this._pappaTill = 0
    this._sagtSkummar = false
    this._tubIx = 0

    this._runda = klamp(ctx.progress.get().highestLevel | 0, 0, 20)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._rum = byggBadrum(ctx)
    this._root.addChild(this._rum.bak)
    this._pappaL = this._nyttLager()
    this._root.addChild(this._rum.fram)
    this._boboL = this._nyttLager()
    // Borsten ligger ÖVER bänkskiva, hylla och ansikte: en tandborste som förs till munnen
    // hålls framför ansiktet, inte bakom det.
    //
    // ⚠️ INTE `_nyttLager()`. Den sätter `interactiveChildren = false`, och borsten är det
    //    ENDA dragbara i spelet — den låg alltså i ett lager som aldrig släpper igenom en
    //    pekning. Permanent död träffyta, noll konsolfel, grönt test: `_borstprobe` mätte
    //    `drar false` och kontaktpunkten spikad på muggen genom hela körningen. Det är
    //    samma familj som `skattjakt-i-morkret`s ficklampa, och lika osynlig utan en sond
    //    som faktiskt tar tag i saken.
    this._borsteL = new Container()
    this._root.addChild(this._borsteL)
    this._fxL = this._nyttLager()
    this._klickL = new Container()
    this._root.addChild(this._klickL)

    await this._byggAnsikte(ctx)
    this._byggBobo()
    this._byggHylla(ctx)
    this._byggBorste(ctx)
    this._byggMunmal(ctx)
    this._rum.liv?.()

    this._nyRunda(ctx)

    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._ans?.liv(true, { takt: 2.6 })
  },

  _nyttLager() {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    return c
  },

  // ---------------------------------------------------------------- uppställning ---

  async _byggAnsikte(ctx) {
    try {
      const data = await laddaAnsikte('pappa')
      if (!this._alive) return
      this._ans = new Ansikte(data, { hojd: ANS_H })
      this._ans.view.position.set(ANS.x, ANS.y)
      this._pappaL.addChild(this._ans.view)
      this._rutaW = data.manifest.ruta.w
      this._rutaH = data.manifest.ruta.h

      // TANDRADEN: smuts + tandskum vid mun-lagrets index, så käken och överläppen skymmer
      // dem exakt som de skymmer mun-fotot. Ingen mask, ingen extra ritning.
      this._radL = new Container()
      this._radL.eventMode = 'none'
      const ix = this._ans._inre.getChildIndex(this._ans._mun)
      this._ans._inre.addChildAt(this._radL, ix + 1)

      // LÄPPSKUMMET överst av allt — det ska synas även när en grimaslapp ligger över
      // ansiktet, för lödder på moustachen försvinner inte för att han blir förvånad.
      this._lappL = new Container()
      this._lappL.eventMode = 'none'
      this._ans._inre.addChild(this._lappL)
    } catch (e) {
      console.warn('borsta-tanderna: ansikte-laddning foll', e?.message || e)
      this._rutaW = RUTA_W
      this._rutaH = RUTA_H
    }
  },

  _byggBobo() {
    // Mottagaren (kvalitetsgrind 4): Bobo står på bänkskivans vänstra ände med
    // vattenglaset i sikte och hejar. Utan honom är finalen bara en mätare som blev full.
    try {
      this._bobo = makeKaraktar({ r: 44, kropp: true })
      this._bobo.view.position.set(BOBO.x, BOBO.y)
      this._boboL.addChild(this._bobo.view)
      this._bobo.setMood?.('nyfiken')
      this._bobo.idle?.()
    } catch (e) {
      console.warn('borsta-tanderna: bobo-bygge foll', e?.message || e)
    }
  },

  /**
   * HYLLAN: tre tandkrämstuber + vattenglaset. Konsten ligger i hyllplanet och träffytan i
   * det egna klicklagret — två noder, av samma skäl som `flugan-pa-nasan`s verktygsrad har
   * det: markeringen skalar upp konsten, och en träffyta på samma nod hade flyttat sig
   * mitt i ett tryck (`sortera-skrap`s snåla snäppyta).
   */
  _byggHylla(ctx) {
    // ⚠️ EN EGEN CONTAINER I HYLLPLANET, inte lösa barn. `badrum.destroy()` gör
    // `hyllPlan.removeChildren()` med flit (badrummet äger inte det andra lagt dit) —
    // och då blir mina noder föräldralösa och nås ALDRIG av `_root.destroy()`. En nod
    // utan förälder rivs inte av någon; den bara slutar synas.
    this._hyllMina = new Container()
    this._hyllMina.eventMode = 'none'
    ;(this._rum.hyllPlan || this._root).addChild(this._hyllMina)
    const plan = this._hyllMina

    TUB_PLATS.forEach((p, i) => {
      const konst = new Container()
      konst.eventMode = 'none'
      konst.position.set(p.x, p.y)
      plan.addChild(konst)

      const ring = new Graphics()
      for (let a = 0; a < 16; a++) {
        const v = (a / 16) * Math.PI * 2
        ring.circle(Math.cos(v) * 70, Math.sin(v) * 78, 4.5).fill({ color: 0xffe9a8, alpha: 0.9 })
      }
      ring.position.set(p.x, p.y)
      ring.visible = false
      ring.eventMode = 'none'
      plan.addChildAt(ring, plan.getChildIndex(konst))

      const yta = new Graphics().rect(-60, -68, 120, 136).fill({ color: 0xffffff, alpha: 0 })
      yta.position.set(p.x, p.y)
      yta.eventMode = 'static'
      yta.cursor = 'pointer'
      yta.hitArea = new Rectangle(-60, -68, 120, 136)
      const tryck = () => this._valjTub(ctx, i)
      yta.on('pointertap', tryck)
      this._klickL.addChild(yta)

      this._tubKnappar.push({ konst, ring, yta, spec: null, nod: null, av: () => yta.off('pointertap', tryck) })
    })

    // VATTENGLASET. Det står framme hela tiden (ett glas som poppar upp ur intet vid målet
    // vore en ny knapp barnet aldrig sett), men det svarar först när tänderna är rena.
    try {
      this._glas = makeGlas()
      this._glas.view.position.set(GLAS.x, GLAS.y)
      this._glas.fyll?.(0.72)
      plan.addChild(this._glas.view)
      liv(this._glas.view, { bob: 3, sway: 0.012 })
    } catch (e) {
      console.warn('borsta-tanderna: glas-bygge foll', e?.message || e)
    }
    this._glasRing = new Graphics()
    for (let a = 0; a < 16; a++) {
      const v = (a / 16) * Math.PI * 2
      this._glasRing.circle(Math.cos(v) * 62, Math.sin(v) * 72, 4.5).fill({ color: 0xbdeefa, alpha: 0.95 })
    }
    this._glasRing.position.set(GLAS.x, GLAS.y)
    this._glasRing.visible = false
    this._glasRing.eventMode = 'none'
    plan.addChild(this._glasRing)

    this._glasYta = new Graphics().rect(-58, -70, 116, 140).fill({ color: 0xffffff, alpha: 0 })
    this._glasYta.position.set(GLAS.x, GLAS.y)
    this._glasYta.eventMode = 'static'
    this._glasYta.cursor = 'pointer'
    this._glasYta.hitArea = new Rectangle(-58, -70, 116, 140)
    this._glasTryck = () => this._tryckGlas(ctx)
    this._glasYta.on('pointertap', this._glasTryck)
    this._klickL.addChild(this._glasYta)
  },

  _byggBorste(ctx) {
    const plan = this._hyllMina || this._root
    try {
      this._mugg = makeMugg()
      this._mugg.position.set(MUGG.x, MUGG.y)
      plan.addChild(this._mugg)
    } catch (e) {
      console.warn('borsta-tanderna: mugg-bygge foll', e?.message || e)
    }

    this._drag = new DragController({ space: this._borsteL, services: ctx.services })
    try {
      this._borste = makeBorste()
    } catch (e) {
      console.warn('borsta-tanderna: borst-bygge foll', e?.message || e)
      return
    }
    this._huvud = this._borste.huvud || BORSTE_HUVUD
    this._borste.view.position.set(BORSTE_HEM.x, BORSTE_HEM.y)
    this._borsteL.addChild(this._borste.view)
    // ⚠️ EXPLICIT TRÄFFYTA, ANNARS GÅR BORSTEN INTE ATT TA I. `verktyg.js` sätter
    //    `eventMode = 'none'` på ALLA innernoder (rätt för dekor), och en bar `Container`
    //    utan `hitArea` träfftestar aldrig sig själv — `addItem` sätter visserligen
    //    `eventMode = 'static'` på vyn, men det finns då ingen geometri att träffa.
    //    Följden var en borste som helt enkelt inte gick att greppa: `_borstprobe` mätte
    //    `drar false` genom hela körningen, utan ett enda konsolfel och med grönt test.
    //    Ytan är 112 × 220 px — långt över P0:s 96, och den täcker hela borsten.
    this._borste.view.hitArea = new Rectangle(-56, -110, 112, 220)
    // Vilo-guppningen ligger i ett BARN av vyn, inte på vyn: DragController mäter och
    // tweenar `view.x/y`, och en guppning på samma nod hade dragit greppet ur läge.
    this._drag.addItem(this._borste.view, { typ: 'borste' }, {
      onSelect: () => this._vack(ctx),
      onCorrect: () => this._slappPaMunnen(ctx),
      onMiss: () => { this._vack(ctx); ctx.services.audio.sfx('soft') },
    })
  },

  /**
   * MUNNENS SLÄPPMÅL är en egen, ORÖRLIG nod — aldrig ett barn till ansiktet. Riggen andas
   * (inre containerns skala) och nickar, och `DragController` mäter avståndet till
   * `target.view.x/y` i släppögonblicket: ett mål som guppar hade krupit undan mitt i
   * släppet (`sortera-skrap`s uppmätta 2 px utanför radien).
   *
   * Ytan är också tap-tap-vägen (P0 GESTER): tryck på borsten, tryck på munnen.
   */
  _byggMunmal(ctx) {
    this._munMal = new Container()
    this._munMal.position.set(TANDRAD.x, TANDRAD.y)
    this._munMal.eventMode = 'static'
    this._munMal.cursor = 'pointer'
    // Träffytan är 260×150 — långt över P0:s 96 px, och medvetet högre än den 46 px höga
    // tandraden: barnet siktar mot MUNNEN, inte mot en remsa.
    this._munMal.hitArea = new Rectangle(-130, -75, 260, 150)
    this._klickL.addChild(this._munMal)
    // ⚠️ Målet bor i `_klickL` medan dragrymden är `_borsteL`. Det går ihop BARA för att
    // båda är otransformerade barn till `_root` — designkoordinater rakt igenom. Ger
    // något av lagren en position eller en skala måste målet flytta med.
    this._drag?.addTarget(this._munMal, (d) => d?.typ === 'borste', { hitRadius: 150 })
  },

  // ---------------------------------------------------------------------- rundan ---

  /**
   * En ny omgång: ny smutstyp, nya lägen, ny uppsättning tuber. Rundan ligger i profilen,
   * så en fjärde omgång är fortfarande fjärde omgången i morgon.
   */
  _nyRunda(ctx) {
    this._fas = 'valj'
    this._tub = null
    this._skumNiva = 0
    this._nastaSkum = 0
    this._sagtSkummar = false
    this._borste?.kram?.(null)
    this._rensaFlackar()
    this._rensaSkum()
    this._sattTuber()

    const s = SMUTS[(this._runda + Math.floor(Math.random() * SMUTS.length)) % SMUTS.length]
    this._smuts = s
    // Antalet växer lugnt med rundan men aldrig över tabellens tal: en femte omgång ska
    // vara lite mer att göra, aldrig en uthållighetsprövning.
    const antal = klamp(4 + Math.floor(this._runda / 2), 4, s.antal)
    const bredd = RAD_RUTA.h - RAD_RUTA.v
    for (let i = 0; i < antal; i++) {
      // Jämnt fördelade längs raden med en liten slumpad förskjutning — annars hamnar två
      // fläckar på varandra och barnet borstar bort båda i ett svep utan att märka det.
      const t = (i + 0.5) / antal
      const rx = RAD_RUTA.v + t * bredd + (Math.random() - 0.5) * (bredd / antal) * 0.5
      const ry = RAD_RUTA.y0 + Math.random() * (RAD_RUTA.y1 - RAD_RUTA.y0)
      const r = 8 + Math.random() * 3
      const rec = { rx, ry, r, kvar: 1, nod: null, skum: null }
      try {
        rec.nod = makeSmutsflack(s.farg, r)
        rec.nod.position.set(rx, ry)
        this._radL?.addChild(rec.nod)
        pop(rec.nod)
      } catch (e) {
        console.warn('borsta-tanderna: smutsflack-ritning foll', e?.message || e)
      }
      this._flackar.push(rec)
    }
    this._sattGlas(false)
  },

  /**
   * TUBPOOLEN ROTERAR: tre tuber ur listan, ett steg framåt per omgång, så samma tre aldrig
   * står kvar två gånger i rad. Det sällsynta wow-valet (glittertandkräm) ersätter en av
   * platserna ungefär var åttonde omgång.
   */
  _sattTuber() {
    const vanliga = TUBER.filter((t) => !t.wow)
    const wow = TUBER.find((t) => t.wow)
    const val = []
    for (let i = 0; i < this._tubKnappar.length; i++) {
      val.push(vanliga[(this._tubIx + i) % vanliga.length])
    }
    this._tubIx = (this._tubIx + 1) % vanliga.length
    if (wow && Math.random() < 0.125) val[Math.floor(Math.random() * val.length)] = wow

    this._tubKnappar.forEach((k, i) => {
      k.ring.visible = false
      if (k.nod && !k.nod.destroyed) {
        gsap.killTweensOf(k.nod)
        gsap.killTweensOf(k.nod.scale)
        k.nod.destroy({ children: true })
      }
      k.nod = null
      k.spec = val[i]
      if (!k.spec) return
      try {
        k.nod = makeTub(k.spec)
        k.konst.addChild(k.nod)
        liv(k.nod, { bob: 4, sway: 0.02 })
      } catch (e) {
        console.warn('borsta-tanderna: tub-ritning foll', e?.message || e)
      }
    })
  },

  _rensaFlackar() {
    for (const f of this._flackar) {
      for (const n of [f.nod, f.skum]) {
        if (!n || n.destroyed) continue
        gsap.killTweensOf(n)
        gsap.killTweensOf(n.scale)
        n.destroy({ children: true })
      }
    }
    this._flackar = []
  },

  _rensaSkum() {
    for (const n of this._skumKlickar) {
      if (!n || n.destroyed) continue
      gsap.killTweensOf(n)
      gsap.killTweensOf(n.scale)
      n.destroy({ children: true })
    }
    this._skumKlickar = []
  },

  // -------------------------------------------------------------------- tandkräm ---

  _valjTub(ctx, i) {
    this._vack(ctx)
    const k = this._tubKnappar[i]
    if (!k?.spec || this._busy || this._fas === 'skolj' || this._fas === 'final') {
      if (k?.nod) wiggle(k.nod)
      ctx.services.audio.sfx('soft')
      return
    }
    const spec = k.spec
    this._tub = spec
    this._fas = 'borsta'

    for (const other of this._tubKnappar) other.ring.visible = other === k
    if (k.nod) pop(k.nod, { scale: 1.16 })
    ctx.services.audio.sfx('pop')
    kvittera(this._fxL, k.konst.x, k.konst.y, ctx.services.audio, { color: spec.skum })

    // Klicken kläms ut på borsten …
    this._borste?.kram?.(spec.skum)
    const bv = this._borste?.view
    if (bv && !bv.destroyed) pop(bv, { scale: 1.1 })

    // … och en smakklick flyger till munnen, för han smakar den direkt.
    this._smakklick(ctx, k.konst.x, k.konst.y, spec)
  },

  /**
   * Smakklicken: en liten klick tandkräm far från tuben till munnen i en båge. När den
   * landar smakar han — och DÅ kommer minen, inte tidigare. Att grimasen skulle komma i
   * samma bildruta som tryckningen vore snabbare men fel: barnet ska se orsaken.
   */
  _smakklick(ctx, x, y, spec) {
    let klick = null
    try {
      klick = makeSkumklick(spec.skum, 15)
    } catch { klick = new Graphics().circle(0, 0, 15).fill({ color: spec.skum }) }
    klick.position.set(x, y)
    this._fxL.addChild(klick)
    const st = { t: 0 }
    const x1 = TANDRAD.x
    const y1 = TANDRAD.y
    const topp = Math.min(y, y1) - 120
    const tw = gsap.to(st, {
      t: 1, duration: 0.52, ease: 'sine.inOut',
      onUpdate: () => {
        if (!this._alive || klick.destroyed) return
        const t = st.t
        klick.x = x + (x1 - x) * t
        klick.y = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * topp + t * t * y1
        klick.rotation = t * 3
      },
      onComplete: () => {
        if (!klick.destroyed) klick.destroy({ children: true })
        if (!this._alive) return
        this._smakar(ctx, spec)
      },
    })
    this._flygTw = tw
  },

  _smakar(ctx, spec) {
    if (!this._alive) return
    sparkle(this._fxL, TANDRAD.x, TANDRAD.y, { count: 7 })
    this._visaMin(spec.min, 1.15)
    // Tubens `ljud` är sample-nyckeln ('pappa_chock'); ROST-tabellen är nycklad utan
    // prefixet. Faller uppslaget tillbaka på 'mmm' hellre än på tystnad.
    const nyckel = String(spec.ljud || '').replace('pappa_', '')
    this._pappaLjud(ctx, ROST[nyckel] ? nyckel : 'mmm')
    if (spec.frost) this._frostglimt(ctx)
    if (spec.wow) this._glitterglans(ctx)
    this._bobo?.react?.('nyfiken')
    this._narTyst(ctx, () => {
      if (this._alive && this._fas === 'borsta' && !this._sagtSkummar) {
        ctx.services.voice.say('Titta, det skummar och bubblar!')
        this._sagtSkummar = true
      }
    })
  },

  // Mintens frostglimt: kylan ligger i ansiktets egen `kyla()` (en BLEKHET, inte en blå
  // färg — se ansikte.js), plus några iskristaller som far ut ur munnen.
  _frostglimt(ctx) {
    const a = this._ans
    if (!a) return
    const st = { v: 0 }
    gsap.to(st, {
      v: 1, duration: 0.22, ease: 'power2.out',
      onUpdate: () => { if (this._alive) a.kyla(st.v) },
      onComplete: () => {
        gsap.to(st, {
          v: 0, duration: 1.5, ease: 'sine.inOut',
          onUpdate: () => { if (this._alive) a.kyla(st.v) },
        })
      },
    })
    puff(this._fxL, TANDRAD.x, TANDRAD.y, { count: 9, color: 0xdff6ff })
  },

  _glitterglans(ctx) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4
      ctx.later(0.1 * i, () => {
        if (!this._alive) return
        sparkle(this._fxL, TANDRAD.v + t * (TANDRAD.h - TANDRAD.v), TANDRAD.y, { count: 5 })
      })
    }
    ctx.services.audio.sfx('magi')
  },

  // ------------------------------------------------------------------- borstandet ---

  /**
   * Borstens kontaktpunkt i designkoordinater = borsthuvudet, inte fingret. Barnet håller
   * skaftet nere till höger och skrubbar med huvudet uppe till vänster, precis som man
   * håller en tandborste — och `huvud` kommer ur borstens EGEN geometri (`verktyg.js`),
   * inte ur ett tal här som kan glida isär från konsten.
   *
   * Under ett drag läses FINGRETS läge (`rec.tx/ty`), aldrig den släpande bilden:
   * eftersläpningen är 0,1 s och en kontaktpunkt mätt på den hade varit försenad.
   */
  _kontakt() {
    const v = this._borste?.view
    if (!v || v.destroyed) return null
    const rec = this._drag?.active
    const drar = !!(rec && rec.dragging)
    const bx = drar ? rec.tx : v.x
    const by = drar ? rec.ty : v.y
    const c = Math.cos(v.rotation)
    const s = Math.sin(v.rotation)
    const h = this._huvud || BORSTE_HUVUD
    return {
      x: bx + h.x * c - h.y * s,
      y: by + h.x * s + h.y * c,
      aktiv: drar || this._autoSkrubb > 0,
    }
  },

  // Designkoordinater → fotorutans koordinater. Samma formel som `Ansikte.traffar()`, och
  // av samma skäl mätt mot `view` och inte mot de noder som andas och nickar.
  _tillRuta(x, y) {
    const a = this._ans
    if (!a) return null
    return {
      rx: (x - a.view.x) / K + (this._rutaW || RUTA_W) / 2,
      ry: (y - a.view.y) / K + (this._rutaH || RUTA_H) / 2,
    }
  },

  _iTandraden(x, y) {
    return x > TANDRAD.v - 26 && x < TANDRAD.h + 26 && y > TANDRAD.topp - 30 && y < TANDRAD.botten + 30
  },

  _update(ctx, dtMs) {
    if (!this._alive) return
    const dt = Math.min(50, dtMs) / 1000
    this._tid += dt
    this._idle += dt
    if (this._autoSkrubb > 0) this._autoSkrubb = Math.max(0, this._autoSkrubb - dt)

    const k = this._kontakt()
    if (k && this._sistK) {
      const d = Math.hypot(k.x - this._sistK.x, k.y - this._sistK.y)
      this._fart = this._fart * 0.7 + (d / Math.max(0.008, dt)) * 0.3
    }
    this._sistK = k ? { x: k.x, y: k.y } : null
    // Stigande flank på greppet: en ny hand på borsten nollställer räknaren för hur länge
    // det här greppet faktiskt har borstat.
    const aktiv = !!k?.aktiv
    if (aktiv && !this._sistAktiv) this._skrubbatNu = 0
    this._sistAktiv = aktiv

    this._gapDriv(dt, k)
    this._blickDriv(k)
    if (k?.aktiv) this._arbeta(ctx, k, dt)
    else this._slutaSkrubba(ctx)
    this._tungaDriv(ctx)
    this._idleDriv(ctx)
  },

  /**
   * GAPET. Munnen öppnar sig när borsten närmar sig och HÅLLS öppen medan den arbetar —
   * det är precis det `mata-munnen` aldrig gör (där gapar han en halv sekund per tugga),
   * och därför är ett ihållande gap outnyttjad yta i en rigg som redan är byggd och mätt.
   *
   * `_minLas`: medan en grimaslapp visas äger `min()` gap-fältet (den anropade `gap(0)`).
   * Att skriva dit varje bildruta hade slagit tillbaka mot den och gett ett ansikte som
   * flimrar mellan grimas och gap — samma familj som "vem skriver egenskapen varje
   * bildruta?".
   */
  _gapDriv(dt, k) {
    const a = this._ans
    if (!a) return
    if (performance.now() < this._minTill) return
    let mal = 0
    if (this._fas === 'borsta' && k) {
      const d = Math.hypot(k.x - TANDRAD.x, k.y - TANDRAD.y)
      mal = klamp(1 - (d - 70) / 260, 0, 1)
      if (k.aktiv && this._iTandraden(k.x, k.y)) mal = 1
    } else if (this._fas === 'skolj') {
      mal = this._gapMal ?? 0
    }
    this._gapNu += (mal - this._gapNu) * Math.min(1, dt * 9)
    a.gap(this._gapNu)
  },

  // Han tittar på borsten. `blick_ner` har funnits sedan riggen byggdes och är precis rätt
  // här: man tittar ner på sin egen mun när någon borstar den.
  _blickDriv(k) {
    const a = this._ans
    if (!a || !k) return
    const mitt = ANS.x + 3
    a.blick(klamp((k.x - mitt) / 260, -1, 1), klamp((k.y - ANSIKTE_YTA.ogonY) / 320, 0, 1))
  },

  _arbeta(ctx, k, dt) {
    this._idle = 0
    if (this._fas !== 'borsta') return

    if (this._iTandraden(k.x, k.y)) {
      this._zonNu = null
      this._skrubba(ctx, k, dt)
      return
    }
    this._slutaSkrubba(ctx)
    this._ans?.lutaMot(0)
    this._zonReaktion(ctx, k)
  },

  /**
   * SKRUBBET. Fläckarna nära borsthuvudet tappar `kvar`, och skummet växer i samma takt i
   * samma punkter — smuts och skum är två sidor av samma tal, inte två system.
   *
   * Farten spelar roll men är inte ett krav: en tvååring som HÅLLER borsten still mot
   * tanden ska också komma framåt, bara långsammare (`0,35 + 0,65 × fart`). Ett golv på
   * noll hade gjort spelet till ett motorikprov.
   */
  _skrubba(ctx, k, dt) {
    const p = this._tillRuta(k.x, k.y)
    if (!p) return
    const rr = KONTAKT_R / K
    const fartK = 0.35 + 0.65 * Math.min(1, this._fart / 260)
    let rorde = false
    for (const f of this._flackar) {
      if (f.kvar <= 0) continue
      if (Math.hypot(p.rx - f.rx, p.ry - f.ry) > rr + f.r) continue
      const fore = f.kvar
      f.kvar = Math.max(0, f.kvar - dt * RENS * fartK)
      rorde = true
      this._ritaFlack(f)
      if (fore > 0 && f.kvar <= 0) this._flackKlar(ctx, f)
    }
    this._skrubbatNu += dt
    this._borste?.boj?.(Math.min(1, 0.45 + this._fart / 420))
    this._skrubbLjudDriv(ctx)
    if (rorde) this._vaxSkum(ctx)

    // Kittlingen: långt ner i munnen. Den STÄNGER munnen ett kort ögonblick (en min bär
    // sin egen mun) — och att han rycker till och blundar när det kittlas är rätt bild.
    // ⚠️ GAPET ÄR ETT VILLKOR, INTE EN FÖLJD. Borsten kommer in i munnen NERIFRÅN (barnet
    //    håller skaftet nedåt), så huvudet passerar den nedre "djupt inne"-remsan redan på
    //    väg in — och kittlingen sköt då igång innan munnen ens hunnit öppna sig. Eftersom
    //    en min anropar `gap(0)` betydde det att gapet aldrig kom: `_borstprobe` mätte
    //    `gap 0,00` med borsten bevisligen på raden och `min gasp` med 399 ms kvar. Man
    //    kittlar inte heller någon långt inne i en STÄNGD mun.
    if (this._gapNu > 0.6 && this._skrubbatNu > 0.6 && k.y > TANDRAD.y + 14 && this._tid > this._kittelTill) {
      this._kittelTill = this._tid + KITTEL_PAUS
      this._visaMin('gasp', 0.5)
      this._pappaLjud(ctx, 'gasp')
      this._ans?.ryck({ styrka: 0.7 })
      this._narTyst(ctx, () => { if (this._alive) ctx.services.voice.say('Hihi, det kittlas!') })
    } else if (this._tid > this._zonTill) {
      // Framtänderna: nöjt hummande + en nick. INGEN min — en grimas hade stängt munnen
      // mitt i skrubbet och tagit bort det barnet håller på med.
      this._zonTill = this._tid + ZON_PAUS * 1.6
      this._pappaLjud(ctx, 'hmm', 0.5)
      this._ans?.nick({ djup: 6, tid: 0.3 })
    }
  },

  _ritaFlack(f) {
    if (f.nod && !f.nod.destroyed) {
      f.nod.alpha = f.kvar
      f.nod.scale.set(0.55 + 0.45 * f.kvar)
    }
    const s = 1 - f.kvar
    if (s > 0.08) {
      if (!f.skum) {
        try {
          f.skum = makeSkumklick(this._tub?.skum ?? 0xffffff, f.r * 1.5)
          f.skum.position.set(f.rx, f.ry)
          f.skum.scale.set(0.2)
          this._radL?.addChild(f.skum)
        } catch { f.skum = null }
      }
      if (f.skum && !f.skum.destroyed) {
        f.skum.scale.set(0.35 + 0.85 * s)
        f.skum.alpha = Math.min(1, s * 1.6)
      }
    }
  },

  _flackKlar(ctx, f) {
    if (f.nod && !f.nod.destroyed) {
      gsap.killTweensOf(f.nod)
      f.nod.visible = false
    }
    ctx.services.audio.sfx('pling')
    // Glimten sitter på FLÄCKENS läge i designkoordinater — den ska komma där tanden blev
    // ren, inte mitt i munnen.
    const d = this._franRuta(f.rx, f.ry)
    if (d) sparkle(this._fxL, d.x, d.y, { count: 5 })
    this._bobo?.react?.('jubel')
    if (this._flackar.every((x) => x.kvar <= 0)) this._alltRent(ctx)
  },

  _franRuta(rx, ry) {
    const a = this._ans
    if (!a || a.view.destroyed) return null
    return {
      x: a.view.x + (rx - (this._rutaW || RUTA_W) / 2) * K,
      y: a.view.y + (ry - (this._rutaH || RUTA_H) / 2) * K,
    }
  },

  /**
   * LÄPPSKUMMET är spelets synliga framsteg. Tandraden är 46 px hög — där ryms inte ett
   * lödder som VÄXER. Utanför munnen finns hela ansiktet, så skummet svämmar ut över
   * läppar, mustasch och haka i takt med hur rent det blivit. Taket är `SKUM_MAX`.
   */
  _vaxSkum(ctx) {
    const klara = this._flackar.reduce((s, f) => s + (1 - f.kvar), 0)
    this._skumNiva = this._flackar.length ? klara / this._flackar.length : 0
    while (this._skumNiva > this._nastaSkum && this._skumKlickar.length < SKUM_MAX) {
      this._nastaSkum += 1 / SKUM_MAX
      this._nyKlick()
    }
  },

  _nyKlick() {
    if (!this._lappL) return
    // Runt munnen i fotorutans koordinater: en ellipsring som vidgar sig utåt ju mer skum
    // det blivit, så lödret kryper nedåt mot hakan i stället för att stapla sig på läppen.
    const t = this._skumKlickar.length / SKUM_MAX
    const v = Math.random() * Math.PI * 2
    const rx = MUN_RUTA.x + Math.cos(v) * (58 + t * 52) + (Math.random() - 0.5) * 20
    const ry = MUN_RUTA.y + Math.sin(v) * (26 + t * 46) * (Math.sin(v) > 0 ? 1.5 : 0.7) + (Math.random() - 0.5) * 12
    let n = null
    try {
      n = makeSkumklick(this._tub?.skum ?? 0xffffff, 13 + Math.random() * 8)
    } catch { return }
    n.position.set(rx, ry)
    n.scale.set(0.1)
    this._lappL.addChild(n)
    this._skumKlickar.push(n)
    gsap.to(n.scale, { x: 1, y: 1, duration: 0.34, ease: 'back.out(2)' })
  },

  /**
   * SKRUBBLJUDET. En brusslinga bär texturen (den startar när borsten möter tanden och
   * tystnar när den lämnar), och ovanpå den ligger korn vars TONHÖJD följer farten —
   * `audio.loop()` kan inte ändra frekvens efter start, så det är kornen som bär farten.
   * Aldrig ett generiskt UI-klick: det vore ett brott mot grindens punkt 5.
   */
  _skrubbLjudDriv(ctx) {
    const a = ctx.services.audio
    if (!this._skrubbLjud) {
      this._skrubbLjud = true
      a.loop(SKRUBB_SLINGA, { klipp: 'borsta_skrubb', typ: 'brus', freq: 1500, q: 1.1, vol: 0.05 })
    }
    if (this._tid < this._skrubbTill) return
    this._skrubbTill = this._tid + SKRUBB_PAUS
    const f = 170 + Math.min(1, this._fart / 340) * 330
    a.tone({ freq: f, dur: 0.055, type: 'triangle', vol: 0.05, slideTo: f * 0.82 })
  },

  _slutaSkrubba(ctx) {
    if (this._skrubbLjud) {
      this._skrubbLjud = false
      ctx.services.audio.stopLoop(SKRUBB_SLINGA)
    }
    this._borste?.boj?.(0)
  },

  /**
   * ZONERNA UTANFÖR MUNNEN. `traffar()` avgör om punkten alls ligger på ansiktet — den
   * läser en radprofilerad silhuett, aldrig en handstämd ellips (den vägen är uppmätt som
   * fel åt BÅDA hållen samtidigt: 32 % tom bakgrund inne i zonen, 19 % ansikte utanför).
   * Var på ansiktet avgörs sedan av läget mot ögonlinjen och munnen, båda härledda ur
   * manifestet.
   */
  _zonReaktion(ctx, k) {
    if (this._tid < this._zonTill) return
    // ⚠️ INGEN ZONREAKTION PÅ VÄGEN IN. Borsten måste passera kinden för att nå munnen,
    //    och en grimas där STÄNGER munnen (`min()` anropar `gap(0)`) — precis i det
    //    ögonblick barnet kommer fram. Uppmätt av `_borstprobe`: gapet stod på 0,00 med
    //    borsten bevisligen på tandraden, för `skratt`-lappen från kindpassagen låg kvar
    //    0,91 s. Nära munnen är borsten inte "på kinden", den är på väg dit.
    if (Math.hypot(k.x - TANDRAD.x, k.y - TANDRAD.y) < 110) return
    const a = this._ans
    const pa = a ? a.traffar(k.x, k.y, 26) : null
    if (!pa) { this._zonNu = null; return }
    this._zonTill = this._tid + ZON_PAUS

    const mitt = ANS.x + 3
    const dx = k.x - mitt
    let namn = 'kind'
    if (Math.abs(dx) > 214) namn = 'ora'
    else if (k.y > TANDRAD.botten + 44) namn = 'haka'
    else if (Math.abs(dx) < 62 && k.y < TANDRAD.topp - 30) namn = 'nasa'
    else if (k.y < ANSIKTE_YTA.ogonY + 30) namn = 'panna'

    // ⚠️ EN ZON MÅSTE DRÖJAS KVAR I, INTE PASSERAS. Borsten måste korsa kinden för att nå
    //    munnen, och en grimas där stänger munnen (`min()` → `gap(0)`) precis när barnet
    //    kommer fram. Uppmätt: `gap 0,00` med borsten bevisligen på tandraden och
    //    `skratt`-lappen kvar 462 ms — en reaktion på något barnet inte bad om, som
    //    dessutom åt upp det barnet faktiskt gjorde. Att kittla pappa på kinden är roligt
    //    när man STANNAR där; på vägen in är det brus.
    if (namn !== this._zonNu) {
      this._zonNu = namn
      this._zonSedan = this._tid
      return
    }
    if (this._tid - this._zonSedan < 0.3) return

    const z = ZON[namn] || ZON.kind
    this._visaMin(z.min, 0.6)
    this._pappaLjud(ctx, z.ljud)
    // Han lutar sig UNDAN borsten — inte mot den. Det är samma fält som `mata-munnen`
    // använder för att luta sig MOT maten, med omvänt tecken.
    if (z.luta) {
      a.lutaMot(klamp(-dx / 260, -1, 1))
      ctx.later(0.75, () => { if (this._alive) this._ans?.lutaMot(0) })
    }
    ripple(this._fxL, k.x, k.y, { color: 0xffffff, maxR: 56 })
    if (z.replik) this._narTyst(ctx, () => { if (this._alive) ctx.services.voice.say('Hihi, det kittlas!') })
  },

  /**
   * SLÄPP PÅ MUNNEN (och tap-tap-vägen, som går genom exakt samma krok). Släppet är inte
   * poängen i det här spelet — det är rörelsen medan man håller — men ett barn som ännu
   * inte klarar ett drag ska ändå få se borstningen hända. Därför sveper borsten av sig
   * själv några gånger över raden och lämnas sedan tillbaka i muggen.
   */
  _slappPaMunnen(ctx) {
    if (!this._alive) return
    const v = this._borste?.view
    if (!v || v.destroyed) return
    this._vack(ctx)
    if (this._fas !== 'borsta') {
      // Ingen tandkräm vald än: han blir förvånad, och barnet pekas mot hyllan.
      this._visaMin('forvanad', 0.7)
      this._pappaLjud(ctx, 'oj')
      this._narTyst(ctx, () => { if (this._alive) ctx.services.voice.say('Välj en tandkräm på hyllan!') })
      this._aterlamna(ctx, 0.5)
      return
    }
    // ⚠️ AUTOSVEPET ÄR TAP-TAP-VÄGENS, INTE ETT PÅBUD. Har barnet redan hållit och
    // skrubbat en stund är släppet bara ett släpp — då tar spelet inte över handen och
    // sveper åt det. Utan den här gränsen svarade VARJE släpp nära munnen med 1,8 s
    // automatik, och ett barn som ville fortsätta själv fick vänta ut spelet.
    if (this._skrubbatNu > 0.4) {
      this._pappaLjud(ctx, 'hmm', 0.6)
      this._ans?.nick({ djup: 7, tid: 0.28 })
      this._aterlamna(ctx, 0.1)
      return
    }
    this._autoSkrubb = 1.9
    const st = { t: 0 }
    const v0 = TANDRAD.v + 24
    const v1 = TANDRAD.h - 24
    gsap.to(st, {
      t: 1, duration: 1.8, ease: 'none',
      onUpdate: () => {
        if (!this._alive || v.destroyed) return
        // Tre svep fram och tillbaka över raden.
        const s = Math.sin(st.t * Math.PI * 6)
        v.x = (v0 + v1) / 2 + s * ((v1 - v0) / 2) - this._huvud.x
        v.y = TANDRAD.y - this._huvud.y
      },
      onComplete: () => { if (this._alive) this._aterlamna(ctx, 0) },
    })
    this._autoTw = st
  },

  // Borsten tillbaka i muggen, och greppet öppnas igen. `aterstall()` behövs för att
  // `_resolveDrop` låser ett accepterat föremål dubbelt (placed + eventMode 'none') —
  // rätt förval för ett pussel, fel för ett spel som lämnar tillbaka saken.
  _aterlamna(ctx, droj = 0) {
    ctx.later(droj, () => {
      if (!this._alive) return
      const v = this._borste?.view
      if (!v || v.destroyed) return
      this._autoSkrubb = 0
      this._slutaSkrubba(ctx)
      this._drag?.aterstall(v)
      gsap.to(v, { x: BORSTE_HEM.x, y: BORSTE_HEM.y, rotation: 0, duration: 0.34, ease: 'back.out(1.4)' })
    })
  },

  // ---------------------------------------------------------------------- tungan ---

  /**
   * MOTGÅNGEN (P0): pappa retas och slickar bort skummet från EN redan borstad fläck.
   *
   * Taken, alla tre mätbara: en fläck åt gången · tidigast var `TUNGA_PAUS` sekund ·
   * återställer bara till `TUNGA_ATER`, aldrig till full smuts. Och den slickar aldrig
   * den SISTA fläcken ren-status bort när allt annat redan är rent — då hade motgången
   * skjutit upp finalen i stället för att krydda mitten.
   *
   * Ordningen är viktig: tungan sveper medan munnen står ÖPPEN, och `retas`-lappen kommer
   * först efteråt. En min stänger munnen, så tvärtom hade barnet inte sett någonting.
   */
  _tungaDriv(ctx) {
    if (this._fas !== 'borsta' || this._busy) return
    if (this._tid < this._tungaTill) return
    const rena = this._flackar.filter((f) => f.kvar <= 0)
    const smutsiga = this._flackar.filter((f) => f.kvar > 0)
    if (rena.length < 2 || smutsiga.length < 1) return
    this._tungaTill = this._tid + TUNGA_PAUS
    const offer = rena[Math.floor(Math.random() * rena.length)]
    this._slicka(ctx, offer)
  },

  _slicka(ctx, f) {
    const a = this._ans
    if (!a || !this._radL) return
    // Tungan ritas i tandradens lager — den ligger då bakom käken och överläppen precis
    // som en riktig tunga gör, och syns bara i den öppna remsan.
    const tunga = new Graphics()
      .ellipse(0, 0, 34, 15).fill({ color: 0xe0736f })
      .ellipse(0, -4, 26, 9).fill({ color: 0xef938f, alpha: 0.8 })
    tunga.position.set(RAD_RUTA.v - 30, f.ry + 4)
    tunga.eventMode = 'none'
    this._radL.addChild(tunga)
    this._tunga = tunga

    this._pappaLjud(ctx, 'slurp')
    const st = { x: RAD_RUTA.v - 30 }
    gsap.to(st, {
      x: RAD_RUTA.h + 30, duration: 0.62, ease: 'sine.inOut',
      onUpdate: () => { if (this._alive && !tunga.destroyed) tunga.x = st.x },
      onComplete: () => {
        if (!tunga.destroyed) tunga.destroy({ children: true })
        if (this._tunga === tunga) this._tunga = null
        if (!this._alive) return
        // ⚠️ SVEPET ÄR 0,62 s LÅNGT och kan landa EFTER att sista fläcken blev ren. Då står
        //    fasen på 'skolj', `_arbeta` bailar, och den återställda fläcken går aldrig att
        //    borsta bort igen — målet blir onåbart. Uppmätt av `_borstprobe`: rena 3/4, fas
        //    skolj, 26 extravarv utan att talet rörde sig. Samma återvändsgränd som
        //    `mata-munnen`s busade mat, och lika osynlig utan en sond som spelar klart.
        if (this._fas !== 'borsta') return
        // Fläcken kommer tillbaka — men bara till 0,55, och skummet krymper med den.
        f.kvar = TUNGA_ATER
        if (f.nod && !f.nod.destroyed) f.nod.visible = true
        this._ritaFlack(f)
        this._visaMin('retas', 0.7)
        this._pappaLjud(ctx, 'retas')
        this._bobo?.react?.('hoppsan')
        this._narTyst(ctx, () => {
          if (this._alive) ctx.services.voice.say('Oj, tungan slickade bort skummet!')
        })
      },
    })
  },

  // ------------------------------------------------------------------ sköljningen ---

  _alltRent(ctx) {
    if (this._fas !== 'borsta') return
    this._fas = 'skolj'
    this._slutaSkrubba(ctx)
    this._sattGlas(true)
    this._visaMin('nojd', 1.2)
    this._pappaLjud(ctx, 'mmm')
    this._bobo?.setMood?.('stolt')
    this._bobo?.react?.('jubel')
    this._narTyst(ctx, () => {
      if (this._alive && this._fas === 'skolj') ctx.services.voice.say('Nu är alla tänder rena — skölj munnen!')
    })
  },

  _sattGlas(pa) {
    this._glasAktiv = pa
    if (this._glasRing) this._glasRing.visible = pa
    if (pa && this._glasRing) {
      gsap.killTweensOf(this._glasRing.scale)
      gsap.to(this._glasRing.scale, { x: 1.1, y: 1.1, duration: 0.72, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    } else if (this._glasRing) {
      gsap.killTweensOf(this._glasRing.scale)
      this._glasRing.scale.set(1)
    }
  },

  _tryckGlas(ctx) {
    this._vack(ctx)
    if (this._busy) return
    if (!this._glasAktiv) {
      // Fel tryck ska vara ROLIGT (P0): glaset skvalpar, inget surt ljud.
      if (this._glas?.view) wiggle(this._glas.view)
      ctx.services.audio.sfx('soft')
      return
    }
    this._busy = true
    this._sattGlas(false)
    this._skolj(ctx)
  },

  /**
   * FINALEN, och den är spelets egen — ingen generisk konfetti. Han tar en munfull,
   * GURGLAR (gapet vaggar i en egen takt), spottar skummet i handfatet med ett plask, och
   * en glansstjärna studsar av framtanden med ett pling.
   */
  _skolj(ctx) {
    const a = this._ans
    const g = this._glas
    const gv = g?.view

    // 1. Glaset upp till munnen.
    if (gv && !gv.destroyed) {
      // Vilo-guppningen måste dö först — annars slåss den med resan mot munnen om `y`.
      gsap.killTweensOf(gv)
      gsap.to(gv, { x: TANDRAD.x + 120, y: TANDRAD.y + 20, rotation: -0.5, duration: 0.55, ease: 'sine.inOut' })
      const niva = { v: 0.72 }
      gsap.to(niva, {
        v: 0.05, duration: 0.5, delay: 0.5, ease: 'sine.in',
        onUpdate: () => { if (this._alive) g?.fyll?.(niva.v) },
      })
      this._nivaTw = niva
    }
    ctx.services.audio.sfx('klunk')

    // 2. Gurglingen: gapet vaggar. Det är riggens EGEN mekanik driven med en annan takt —
    //    ingen ny animation, och den läser omedelbart som "han sköljer".
    ctx.later(1.0, () => {
      if (!this._alive) return
      this._pappaLjud(ctx, 'gurgla')
      this._rum?.kran?.pa?.(true)
      const st = { v: 0 }
      this._gapMal = 0.5
      gsap.to(st, {
        v: 1, duration: 1.5, ease: 'none',
        onUpdate: () => {
          if (!this._alive) return
          this._gapMal = 0.42 + Math.sin(st.v * Math.PI * 9) * 0.3
          a?.lutaMot(Math.sin(st.v * Math.PI * 5) * 0.35)
        },
        onComplete: () => { if (this._alive) { this._gapMal = 0; a?.lutaMot(0) } },
      })
    })

    // 3. Spottet: skummet far ner i handfatet med ett plask.
    ctx.later(2.6, () => {
      if (!this._alive) return
      this._spotta(ctx)
    })

    // 4. Glansen på framtanden + pling.
    ctx.later(3.5, () => {
      if (!this._alive) return
      this._tandglans(ctx)
      this._visaMin('nojd', 2.2)
      this._bobo?.react?.('jubel')
      this._rum?.kran?.pa?.(false)
      this._narTyst(ctx, () => {
        if (this._alive) ctx.services.voice.say('Wow, vilka blanka tänder pappa har!')
      })
    })

    // 5. Kvittot: stjärna + klistermärke, och sedan en ny omgång med ny smuts. Aldrig slut.
    ctx.later(5.2, () => {
      if (!this._alive) return
      this._narTyst(ctx, () => { if (this._alive) ctx.progress.complete() })
      ctx.progress.setLevel(this._runda + 1)
    })
    ctx.later(7.4, () => {
      if (!this._alive) return
      this._busy = false
      this._runda = klamp(this._runda + 1, 0, 20)
      this._aterstallGlas()
      this._nyRunda(ctx)
      this._narTyst(ctx, () => {
        if (this._alive && this._fas === 'valj') ctx.services.voice.say('Välj en tandkräm på hyllan!')
      })
    })
  },

  _spotta(ctx) {
    const ho = this._rum?.ho || this._fxL
    ctx.services.audio.sfx('plopp')
    // Läppskummet lämnar ansiktet och landar i handfatet.
    const klickar = [...this._skumKlickar]
    this._skumKlickar = []
    klickar.forEach((n, i) => {
      if (!n || n.destroyed) return
      gsap.killTweensOf(n)
      gsap.killTweensOf(n.scale)
      gsap.to(n, {
        alpha: 0, duration: 0.3, delay: i * 0.018,
        onComplete: () => { if (!n.destroyed) n.destroy({ children: true }) },
      })
    })
    for (const f of this._flackar) {
      if (!f.skum || f.skum.destroyed) continue
      gsap.killTweensOf(f.skum)
      gsap.killTweensOf(f.skum.scale)
      gsap.to(f.skum, {
        alpha: 0, duration: 0.3,
        onComplete: () => { if (!f.skum?.destroyed) f.skum.destroy({ children: true }); f.skum = null },
      })
    }
    // Plasket i porslinet.
    burst(this._fxL, HO.x, HO.rim + 26, { count: 16, colors: [0xffffff, 0xdff6ff, 0xbdeefa], power: 0.8 })
    ripple(this._fxL, HO.x, HO.rim + 30, { color: 0xffffff, maxR: 120 })
    for (let i = 0; i < 4; i++) {
      const n = makeSkumklick(this._tub?.skum ?? 0xffffff, 12 + Math.random() * 8)
      n.position.set(HO.x + (Math.random() - 0.5) * 150, HO.rim + 18 + Math.random() * 26)
      n.alpha = 0.9
      ho.addChild(n)
      this._hoSkum ||= []
      this._hoSkum.push(n)
      gsap.to(n, {
        alpha: 0, duration: 1.6, delay: 1.1 + i * 0.15,
        onComplete: () => { if (!n.destroyed) n.destroy({ children: true }) },
      })
    }
  },

  // Glansstjärnan STUDSAR AV framtanden — den föds på raden, far uppåt-höger och blinkar
  // bort. Ingen konfetti över hela skärmen: det här är pappas tand, inte en tombola.
  _tandglans(ctx) {
    let st = null
    try { st = makeTandglans() } catch { return }
    st.position.set(TANDRAD.x - 30, TANDRAD.y)
    st.scale.set(0.2)
    this._fxL.addChild(st)
    ctx.services.audio.sfx('pling')
    ctx.services.audio.tone({ freq: 1318, dur: 0.22, type: 'sine', vol: 0.16, delay: 0.08 })
    const tl = gsap.timeline({
      onComplete: () => { if (!st.destroyed) st.destroy({ children: true }) },
    })
    tl.to(st.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(3)' })
    tl.to(st, { x: TANDRAD.x + 96, y: TANDRAD.y - 92, rotation: 1.6, duration: 0.5, ease: 'power2.out' }, 0)
    tl.to(st, { alpha: 0, duration: 0.26 }, 0.42)
    this._glansTl = tl
    sparkle(this._fxL, TANDRAD.x, TANDRAD.y, { count: 8 })
  },

  _aterstallGlas() {
    const g = this._glas
    if (!g?.view || g.view.destroyed) return
    gsap.killTweensOf(g.view)
    g.view.position.set(GLAS.x, GLAS.y)
    g.view.rotation = 0
    g.fyll?.(0.72)
    liv(g.view, { bob: 3, sway: 0.012 })
  },

  // ------------------------------------------------------------------- småverktyg ---

  /**
   * En min, och den LÅSER gap-styrningen så länge lappen visas. `min()` anropar `gap(0)`
   * en gång; utan låset hade `_gapDriv` skrivit tillbaka gapet i nästa bildruta och
   * ansiktet flimrat mellan grimas och gap.
   */
  _visaMin(namn, hall = 0.8) {
    const a = this._ans
    if (!a) return
    a.min(namn, { hall, in: 0.11, ut: 0.2 })
    this._minTill = performance.now() + (0.11 + hall + 0.2) * 1000
    this._gapNu = 0
  },

  /**
   * Pappas eget uttrycksljud. Klippet först; finns det inte spelas en stämd ton — aldrig
   * en summer. `_pappaTill` bokför när han slutat låta, så narratorn kan vänta in honom
   * (`_narTyst`): rösten KAPAR den förra repliken, och två röster ovanpå varandra är
   * samma fel åt andra hållet.
   */
  _pappaLjud(ctx, namn, vol = 1) {
    const r = ROST[namn]
    if (!r) return
    const a = ctx.services.audio
    if (a.harSample?.(r.klipp) && a.sample(r.klipp)) {
      this._pappaTill = performance.now() + (a.sampleDuration?.(r.klipp) || 0.6) * 1000
      return
    }
    const [f0, f1] = r.ton
    a.tone({ freq: f0, slideTo: f1, dur: 0.3, type: r.typ, vol: 0.16 * vol })
    this._pappaTill = performance.now() + 340
  },

  // Väntar in BÅDE narratorn och pappas eget klipp innan en replik sägs. `voice.say()`
  // anropar `cancel()` som första sak, och de F5-genererade klippen är 2,3–4,1 s medan en
  // fast `later(2)` nästan alltid är kortare — resultatet är ett barn som hör att någon
  // blev avbruten mitt i meningen. BILDEN väntar aldrig; bara orden köar.
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

  _vack() { this._idle = 0 },

  // Mjuk om-cue vid stillhet — aldrig en tillsägelse, bara en påminnelse om vad som finns.
  _idleDriv(ctx) {
    if (this._idle < IDLE_CUE || this._busy) return
    this._idle = 0
    if (this._fas === 'valj') {
      for (const k of this._tubKnappar) if (k.nod && !k.nod.destroyed) pop(k.nod, { scale: 1.12 })
      this._narTyst(ctx, () => { if (this._alive) ctx.services.voice.say('Välj en tandkräm på hyllan!') })
    } else if (this._fas === 'borsta') {
      const v = this._borste?.view
      if (v && !v.destroyed) wiggle(v)
      this._ans?.nick({ djup: 9, tid: 0.3 })
      this._pappaLjud(ctx, 'hmm', 0.6)
    } else if (this._fas === 'skolj') {
      if (this._glas?.view) pop(this._glas.view, { scale: 1.12 })
      this._narTyst(ctx, () => {
        if (this._alive) ctx.services.voice.say('Nu är alla tänder rena — skölj munnen!')
      })
    }
  },

  // ---------------------------------------------------------------------- rivning ---

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    ctx?.services?.audio?.stopLoop?.(SKRUBB_SLINGA)

    // ⚠️ TWEENS MOT BARNBARN FÖRST. `ans.destroy()` river `view` med barn — och smutsen,
    // skummet och tungan bor INNE i riggen. En tween som lever vidare mot en riven nod är
    // den tysta läckan som varken ett konsolfel eller en skärmdump visar.
    this._glansTl?.kill()
    this._flygTw?.kill()
    if (this._nivaTw) gsap.killTweensOf(this._nivaTw)
    if (this._autoTw) gsap.killTweensOf(this._autoTw)
    for (const f of this._flackar) {
      for (const n of [f.nod, f.skum]) {
        if (!n || n.destroyed) continue
        gsap.killTweensOf(n)
        gsap.killTweensOf(n.scale)
      }
    }
    this._flackar = []
    for (const n of [...this._skumKlickar, ...(this._hoSkum || [])]) {
      if (!n || n.destroyed) continue
      gsap.killTweensOf(n)
      gsap.killTweensOf(n.scale)
    }
    this._skumKlickar = []
    this._hoSkum = []
    if (this._tunga && !this._tunga.destroyed) gsap.killTweensOf(this._tunga)
    this._tunga = null

    for (const k of this._tubKnappar) {
      k.av?.()
      if (k.nod && !k.nod.destroyed) {
        gsap.killTweensOf(k.nod)
        gsap.killTweensOf(k.nod.scale)
      }
      gsap.killTweensOf(k.ring)
      gsap.killTweensOf(k.ring.scale)
    }
    this._tubKnappar = []
    this._glasYta?.off('pointertap', this._glasTryck)
    if (this._glasRing && !this._glasRing.destroyed) {
      gsap.killTweensOf(this._glasRing)
      gsap.killTweensOf(this._glasRing.scale)
    }
    if (this._glas?.view && !this._glas.view.destroyed) {
      gsap.killTweensOf(this._glas.view)
      gsap.killTweensOf(this._glas.view.scale)
    }
    this._glas?.destroy?.()
    this._glas = null
    if (this._mugg && !this._mugg.destroyed) gsap.killTweensOf(this._mugg)
    this._mugg = null

    this._drag?.destroy?.()
    this._drag = null
    if (this._borste?.view && !this._borste.view.destroyed) {
      gsap.killTweensOf(this._borste.view)
      gsap.killTweensOf(this._borste.view.scale)
    }
    this._borste?.destroy?.()
    this._borste = null

    this._bobo?.destroy?.()
    this._bobo = null
    // FÖRE badrummet: dess `destroy()` plockar loss allt främmande ur hyllplanet, och
    // efter det finns ingen förälder kvar som river mina noder åt mig.
    if (this._hyllMina && !this._hyllMina.destroyed) this._hyllMina.destroy({ children: true })
    this._hyllMina = null
    this._rum?.destroy?.()
    this._rum = null
    this._ans?.destroy()
    this._ans = null
    this._radL = null
    this._lappL = null
    this._root?.destroy({ children: true })
    this._root = null
  },
}
