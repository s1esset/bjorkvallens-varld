// VAKNA, PAPPA! — spel 3 i ansiktssektionen (`docs/games/vakna-pappa.md`).
//
// Samma fotorigg som `mata-munnen` och `titt-ut-pappa`, men här är det ANDNINGSTAKTEN som
// är spelet. `liv(true, { takt })` ÄR sömnmätaren: 3,4 s är djupsömn, 1,1 s är nyvaken.
// Barnet hör och ser att han närmar sig ytan innan något annat har hänt.
//
// ⚠️ ATT HAN SOMNAR OM ÄR INTE ETT MISSLYCKANDE — det är skämtet, och kedjan är den enda
//    "svårighet" spelet har. Taken (P0 MOTGÅNG): ett läge i taget, pausat `PAUS` sekunder
//    efter varje framsteg, filten högst en gång per runda, EN krydda i taget med minst
//    `KRYDD_PAUS` sekunder emellan, och aldrig under läge 1.
//
// TRE VÄGAR IN (v1.226) — alla tre gör samma sak, och det är MENINGEN: en tvååring hittar
// en av dem, en femåring växlar mellan alla tre.
//   ⓐ VÄLJ + VÄCK   ett tryck på en sak väljer den (ring + sakens egen reaktion). Den
//                   stora knappen skickar iväg den mot pappas ansikte.
//   ⓑ DRA           `DragController` (bär tap-tap-fallbacken P0 GESTER kräver). VAR man
//                   släpper avgör: ansiktet ger full verkan, täcket dämpar, foten kittlar.
//   ⓒ TRYCK I RUMMET fönstret byter väder, hyllan tappar en bok, tavlan gungar, täcket
//                   åker ner, och ett tryck på pappa själv petar honom.
//
// TOLV VERKTYG, en per busskategori (se `verktyg.js` för silhuetterna). Ingen av dem gör
// samma sak som en annan — det är hela poängen med att de är tolv och inte sex:
//   klocka ljud · trumpet ljud · ballong smäll · kaffe god lukt · strumpa äcklig lukt ·
//   lampa ljus · gardin dagsljus · spruta blött · flakt vind · kittla kryp ·
//   katt sätter sig · hund pruttar
//
// ⚠️ TOLV SAKER FÅR INTE PLATS I EN RAD. Räknat: träffytan är 128 px (HIT_R 64) och P0
//    kräver ≥24 px emellan, alltså ≥152 px centrumavstånd; med 180 px (dagens) blir tolv
//    saker 1980 px av 1280. Hyllan är därför bläddringsbar: TRE SIDOR om FYRA, med pilar
//    som ligger 136 px från yttersta saken (64 + 48 + 24 = exakt P0-minimum).
//
// ⚠️ DET FINNS INGEN SNARKNING I SFX-MANIFESTET. `_snarka()` bygger den procedurellt av två
//    toner. Klippnamnet `snark` läses ändå först — den dagen ägaren spelar in det tar
//    spelet klippet utan en rad kod.
import { Circle, Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PLATS, byggSovrum } from './sovrum.js'
import { makeKatt, makeVerktyg } from './verktyg.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { DragController } from '../../lib/DragController.js'
import { Button } from '../../lib/Button.js'
import { burst, kvittera, pop, puff, ripple, sparkle, wiggle } from '../../lib/feedback.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

const ANS_H = 320
const LAGEN = 5           // fem vakenlägen; `_vaken` går 0 … 4
const MAX = LAGEN - 1
const PAUS = 3            // s efter ett framsteg innan återinsomnandet ens får börja
const ATER = 9            // s per läge nedåt — långsamt, ett läge i taget
const KRYDD_PAUS = 8      // s mellan två slumpade händelser (P0 MOTGÅNG: takt + tak)
// Andningstakten per läge. Talen kommer ur `ansikte.js`s eget kommentarsspann (3,4 s mätt
// och dåsig, 1,1 s flämtande) och är hela mätaren: barnet HÖR skillnaden innan det ser den.
const TAKT = [3.4, 2.4, 1.8, 1.4, 1.1]

// Verktygens verkan i LÄGEN. Ingen av dem är fel, och ingen av dem är obligatorisk —
// `kittla` ensam tar honom hela vägen, den är bara långsammast (kvalitetsgrind 1).
const EFFEKT = {
  klocka: 2, trumpet: 1, ballong: 2, kaffe: 2, strumpa: 2, lampa: 1,
  gardin: 0, spruta: 2, flakt: 1, kittla: 1, katt: 1, hund: 2,
}

// HYLLANS TRE SIDOR. Sidorna blandas ALDRIG om mellan varandra: varje sida bär en ljudsak,
// en känselsak och något oväntat, så ett barn som aldrig bläddrar ändå har en hel låda.
// (Ordningen INOM en sida lottas per omgång — variation utan att flytta knappar under
// fingret på ett barn som just lärt sig var trumpeten står.)
const SIDOR = [
  ['klocka', 'kittla', 'kaffe', 'katt'],
  ['trumpet', 'spruta', 'lampa', 'hund'],
  ['ballong', 'strumpa', 'flakt', 'gardin'],
]

// Hur många saker som får väljas samtidigt (ägarens punkt 1). Taket är tre, och det är
// inte godtyckligt: fyra saker på en sida, och kan man välja alla fyra finns inget val
// kvar att göra. Tre av fyra är en KOMBINATION; fyra av fyra är bara knappen.
const MAX_VAL = 3
const KOMBO_STEG = 0.34   // s mellan två utskickade saker — de ska landa i följd, inte i klump

const HIT_R = 64          // P0: 128 px träffyta …
const HALO = 24           // … plus 24 px osynlig halo
const SLOT_X = [190, 370, 550, 730]   // 180 px isär = 52 px luft mellan träffytorna
const HYLL_Y = 596
const PIL_R = 48          // 96 px = P0-minimum; 136 px från yttersta saken = 24 px luft
const PIL_V = { x: 50, y: HYLL_Y }
const PIL_H = { x: 878, y: HYLL_Y }
const VACK = { x: 1120, y: 570, w: 230, h: 160 }

/**
 * PAPPAS TRE ZONER. `r` är släpp-radien (`DragController` mäter avstånd till mitten),
 * `hit` är träffytan för tap-tap och för ett tryck utan valt verktyg.
 *
 * VAR man släpper spelar roll (kvalitetsgrind 1, agens):
 *   ansikte  full verkan
 *   filt     dämpat (−1, aldrig under 1) men täcket bucklar sig — och en fläkt eller
 *            spruta på täcket drar ner det helt
 *   fot      kittel och vatten ger EXTRA (+1); allt annat dämpas som på täcket
 */
// ⚠️ ALLA MÅTT HÄR ÄR RÄKNADE, INTE VALDA — hela uppsättningen kördes parvis mot P0
//    (≥96 px yta, ≥24 px emellan) INKLUSIVE skalets egna hörnknappar. Trängsta paren i
//    NOMINELLA ytor: ansikte↔filt 26 px · fot↔fönster 26 px · fönster↔högtalarknappen
//    (1140–1280, −6–134) 24 px · tavla↔vägghylla 30 px · vägghylla↔fot 24 px ·
//    verktyg↔pil 28/36 px · verktyg↔verktyg 52 px.
//    De 24 px osynliga HALOERNA får överlappa varandra med några pixlar — det är samma
//    konvention som verktygsraden alltid haft (180 px isär, 176 px halodiameter), och det
//    är de nominella ytorna P0 mäter.
const ZONER = [
  { id: 'ansikte', x: PLATS.ansikte.x, y: 296, r: 155, hit: new Rectangle(-100, -116, 200, 220) },
  { id: 'filt', x: PLATS.mage.x, y: PLATS.mage.y, r: 150, hit: new Rectangle(-144, -46, 288, 96) },
  { id: 'fot', x: PLATS.fot.x, y: PLATS.fot.y, r: 74, hit: new Circle(0, 0, 66) },
]

// Rummets tryckbara saker. Ingen av dem är obligatorisk, ingen av dem kan gå fel.
const RUM = [
  { id: 'fonster', x: 1055, y: 205, hit: new Rectangle(-133, -47, 290, 200) },
  { id: 'vagghylla', x: PLATS.vagghylla.x, y: PLATS.vagghylla.y, hit: new Rectangle(-90, -50, 160, 100) },
  { id: 'tavla', x: PLATS.tavla.x, y: PLATS.tavla.y, hit: new Rectangle(-86, -66, 172, 120) },
]

// Pappas egna läten. Klippet läses först; tonen är reserven som alltid finns.
const ROST = {
  hmm: { klipp: 'pappa_hmm', ton: [330, 296], typ: 'sine' },
  ehh: { klipp: 'pappa_ehh', ton: [300, 380], typ: 'sine' },
  aaah: { klipp: 'pappa_aaah', ton: [300, 820], typ: 'sine' },
  oj: { klipp: 'pappa_oj', ton: [520, 780], typ: 'sine' },
  fniss: { klipp: 'pappa_fniss', ton: [600, 760], typ: 'triangle' },
  aj: { klipp: 'pappa_aj', ton: [700, 430], typ: 'triangle' },
  blaa: { klipp: 'pappa_blaa', ton: [420, 190], typ: 'sawtooth' },
  chock: { klipp: 'pappa_chock', ton: [340, 880], typ: 'square' },
  gasp: { klipp: 'pappa_gasp', ton: [280, 660], typ: 'sine' },
  huh: { klipp: 'pappa_huh', ton: [360, 300], typ: 'sine' },
  surt: { klipp: 'pappa_surt', ton: [400, 240], typ: 'sawtooth' },
  ohh: { klipp: 'pappa_ohh', ton: [300, 400], typ: 'sine' },
  mmm: { klipp: 'pappa_mmm', ton: [260, 240], typ: 'sine' },
  retas: { klipp: 'pappa_retas', ton: [500, 620], typ: 'triangle' },
}

const REGN_SLINGA = 'vaknapappa-regn'

// Hur länge saken stannar kvar hos pappa innan den far hem till hyllan. Fjädern KRYPER en
// sträcka (tre nedslag, 0,42 s isär) och hunden hinner skälla, vända sig om och prutta —
// far de hem efter standardens 0,62 s rycks de bort mitt i sin egen mekanism.
const RESA_HALL = { kittla: 1.6, hund: 1.7, katt: 0.9 }
const HALL_STANDARD = 0.62

// Var saken LANDAR i förhållande till zonens mitt. Hunden ska stå BREDVID pappa och vända
// rumpan mot honom — landar hon mitt i ansiktet finns det ingen riktning att vända åt.
// Var saken LANDAR i förhållande till zonens mitt (bara väckknappens väg — vid ett drag
// bestämmer barnets finger). Hunden ska stå BREDVID pappa och vända rumpan mot honom, och
// ficklampan, fläkten, strumpan och kaffet behöver ett AVSTÅND att lysa, blåsa och lukta
// över: landar de mitt i ansiktet blir strålen noll pixlar lång.
const LANDNING = {
  hund: { x: 86, y: 18 },
  katt: { x: 62, y: -10 },
  lampa: { x: 172, y: -72 },
  flakt: { x: 248, y: 34 },
  strumpa: { x: 152, y: 30 },
  spruta: { x: 166, y: -28 },
  kaffe: { x: 150, y: 40 },
}

export default {
  id: 'vakna-pappa',
  titleSv: 'Vakna, pappa!',
  icon: '😴',
  category: 'roligt',
  input: 'mixed',
  ageRange: [2, 5],
  voiceIntro: 'Pappa sover! Välj en sak och busa med honom.',

  async init(ctx) {
    this._alive = true
    // Singleton — allt tillstånd nollas här, annars ärver nästa omgång förra rundans sömn.
    this._busy = false
    this._idle = 0
    this._vaken = 0
    this._pausT = 0
    this._aterT = 0
    this._sankKvar = 0
    this._sankVaxel = true
    this._snarkT = 0
    this._himmelV = 0
    this._filtPa = false
    this._filtKvar = 0
    this._filtAnvand = false
    this._taketNer = false
    this._gardinUppe = false
    this._regnar = false
    this._verktyg = []
    this._fx = []
    this._katt = null
    this._kattPa = false
    this._somnRepliker = 0
    this._pappaTill = 0
    this._lutNu = 0
    this._wow = Math.random() < 0.125
    this._cueVaxel = 0
    this._sida = 0
    this._valda = []
    this._resor = new Set()
    this._komboKvar = 0
    this._finalVantar = false
    this._sagtKombo = false
    this._sistKey = null
    this._upprepning = 0
    this._kryddT = KRYDD_PAUS
    this._bokKvar = 3
    this._tomKnappar = 0
    this._sistLjudDx = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._sovrum = byggSovrum(ctx)
    this._root.addChild(this._sovrum.bak)

    // Ansiktet ligger MELLAN rummets bak- och framdel, precis som gömställena i
    // `titt-ut-pappa`: då kan filten dras över huvudet utan en enda mask.
    this._pappaL = this._nyttLager()
    this._root.addChild(this._sovrum.fram)
    // Allt som far över sängen: katten, fallna böcker, ljuskäglor, doftspår.
    this._effektL = this._nyttLager()
    this._klickL = new Container()   // rummets träffytor
    this._zonL = new Container()     // pappas tre zoner + filten över huvudet
    this._hyllL = new Container()    // verktygen, pilarna, väckknappen — alltid överst
    this._root.addChild(this._klickL, this._zonL, this._hyllL)

    try {
      const data = await laddaAnsikte('pappa')
      if (!this._alive) return
      this._ans = new Ansikte(data, { hojd: ANS_H })
      this._ans.view.position.set(PLATS.ansikte.x, PLATS.ansikte.y)
      this._pappaL.addChild(this._ans.view)
      const k = ANS_H / data.manifest.ruta.h
      this._ogonY = PLATS.ansikte.y + (data.manifest.geometri.ogonlinje - data.manifest.ruta.h / 2) * k
    } catch (e) {
      console.warn('vakna-pappa: ansiktet kunde inte laddas —', e?.message || e)
      this._ogonY = PLATS.ansikte.y - 40
    }

    // Böckernas hemläge läses EN gång, innan någon hunnit tippa ner dem. Utan det kan en
    // ny omgång inte ställa tillbaka dem — och `_bokKvar = 3` hade pekat ut en bok som
    // redan ligger på täcket och "tappat" den en gång till, från golvet.
    this._bokHem = (this._sovrum.bocker || []).map((b) => ({
      nod: b, foralder: b.parent, x: b.x, y: b.y, rot: b.rotation,
    }))

    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._byggZoner(ctx)
    this._byggRum(ctx)
    this._byggHylla(ctx)
    this._byggFiltKlick(ctx)

    // Utgångsläget måste sättas EN gång: `_update` skriver bara himlen när den rör sig, så
    // utan de här raderna renderas rummet i sitt obestämda byggläge tills något händer.
    this._sovrum.himmel?.(0)
    this._sovrum.rullgardin?.(true)
    this._sovrum.liv?.()

    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)

    this._root.eventMode = 'static'
    this._root.hitArea = new Rectangle(-400, -300, 2080, 1320)
    this._vakna = (e) => this._tomtTryck(ctx, e)
    this._root.on('pointerdown', this._vakna)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._satLage(ctx, 1, { tyst: true })
    ctx.later(4.4, () => {
      if (this._alive && this._vaken <= 0) this._sag(ctx, 'Tryck på den stora knappen, eller dra saken på pappa.')
    })
  },

  _nyttLager() {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    return c
  },

  // ---------------------------------------------------------------- hyllan ---

  /**
   * VERKTYGSHYLLAN: tolv saker på tre sidor om fyra, plus två bläddringspilar och den
   * stora väckknappen.
   *
   * Varje sak är BÅDE en väljbar knapp och ett dragbart föremål — det är samma nod, och
   * `DragController` skiljer dem åt (ett tryck utan rörelse = val + tap-tap-läge, ett drag
   * = föremålet följer fingret). Därför sitter träffytan på sakens EGEN vy och inte på en
   * osynlig cirkel ovanpå: en cirkel i ett högre lager hade svalt varje pointerdown och
   * draget hade aldrig startat.
   */
  _byggHylla(ctx) {
    // ⚠️ TRE RINGAR, INTE EN. Ägaren bad om att få välja upp till tre saker och skicka
    //    iväg dem tillsammans, och en enda markering hade gjort de två andra valen
    //    osynliga — ett val man inte ser är inget val.
    this._ringar = []
    this._ringTws = []
    for (let n = 0; n < MAX_VAL; n++) {
      const ring = new Graphics()
      ring.circle(0, 0, 68).stroke({ width: 7, color: COLORS.yellow, alpha: 0.95 })
      ring.circle(0, 0, 78).stroke({ width: 4, color: COLORS.yellow, alpha: 0.35 })
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        ring.circle(Math.cos(a) * 68, Math.sin(a) * 68, 5).fill({ color: 0xfff3b0 })
      }
      ring.eventMode = 'none'
      ring.visible = false
      this._hyllL.addChild(ring)
      this._ringar.push(ring)
      this._ringTws.push(gsap.to(ring.scale, {
        x: 1.07, y: 1.07, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut',
      }))
    }

    SIDOR.forEach((sida, si) => {
      shuffle([...sida]).forEach((key, i) => {
        const v = makeVerktyg(key)
        if (!v) return
        const x = SLOT_X[i]
        const y = HYLL_Y
        v.view.position.set(x, y)
        v.view.hitArea = new Circle(0, 0, Math.max(HIT_R, v.hitR || 0) + HALO)
        v.view.visible = si === 0
        this._hyllL.addChild(v.view)
        v.liv?.()

        const post = { key, v, x, y, sida: si, rec: null }
        post.rec = this._drag.addItem(v.view, { key }, {
          onCorrect: (r, mal) => this._slappPa(ctx, post, mal.zon),
          onMiss: () => this._slappBredvid(ctx, post),
        })
        v.view.on('pointertap', () => this._tryckVerktyg(ctx, post))
        if (si !== 0) v.view.eventMode = 'none'
        this._verktyg.push(post)
      })
    })

    const pil = (p, riktning, tecken) => {
      const g = new Graphics()
      g.circle(0, 0, PIL_R).fill(COLORS.orange).stroke({ width: 5, color: 0xfff3d9 })
      // En ritad pilspets, inte en Text: en bokstav i en cirkel är just den "emoji i en
      // ruta" P0 ASSETS förbjuder, och en triangel läser dessutom snabbare för en tvååring.
      // ⚠️ SPETSEN ÅT RÄTT HÅLL. Talen stod först tvärtom (`d*15` på basen, `d*-13` på
      //    spetsen), så vänsterpilen pekade HÖGER och högerpilen VÄNSTER. Ingen kod klagade,
      //    ingen mätning fångade det — det syntes bara i skärmdumpen.
      const d = tecken
      g.moveTo(d * -15, -20).lineTo(d * 13, 0).lineTo(d * -15, 20).closePath()
        .fill(0xfffdf7)
      g.position.set(p.x, p.y)
      g.eventMode = 'static'
      g.cursor = 'pointer'
      g.hitArea = new Circle(0, 0, PIL_R)
      g.on('pointertap', () => this._sidaTill(ctx, riktning))
      this._hyllL.addChild(g)
      return g
    }
    this._pilV = pil(PIL_V, -1, -1)
    this._pilH = pil(PIL_H, +1, +1)

    // Sidprickar: tre punkter på bordsskivan mellan tredje och fjärde platsen (x 640 är den
    // enda luckan i raden). Ren dekor — de har ingen träffyta att stjäla.
    const prickar = new Container()
    prickar.eventMode = 'none'
    prickar.interactiveChildren = false
    this._prickar = []
    for (let i = 0; i < SIDOR.length; i++) {
      const p = new Graphics()
      p.circle(640 + (i - 1) * 22, 650, 6).fill(0xfff3d9)
      p.eventMode = 'none'
      prickar.addChild(p)
      this._prickar.push(p)
    }
    this._hyllL.addChild(prickar)

    this._vackKnapp = new Button({
      label: 'VÄCK!',
      // Pappa ligger till VÄNSTER om knappen — en pekande hand måste peka mot honom,
      // annars pekar knappen ut ur bild.
      icon: '👈',
      stacked: true,
      width: VACK.w,
      height: VACK.h,
      color: COLORS.red,
      sound: 'tap',
      services: ctx.services,
      onTap: () => this._vackTryck(ctx),
    })
    this._vackKnapp.position.set(VACK.x, VACK.y)
    this._hyllL.addChild(this._vackKnapp)

    this._malaPrickar()
  },

  _malaPrickar() {
    this._prickar?.forEach((p, i) => {
      if (p.destroyed) return
      p.alpha = i === this._sida ? 1 : 0.35
    })
  },

  /** Bläddrar hyllan. Sidorna går RUNT, så ingen pil är någonsin död. */
  _sidaTill(ctx, d) {
    if (!this._alive) return
    this._idle = 0
    const ny = (this._sida + d + SIDOR.length) % SIDOR.length
    ctx.services.audio.sfx('flip')
    this._avbrytResa()
    // Valen släpps vid sidbyte. Annars kunde väckknappen skicka iväg en sak som ligger på
    // en gömd sida — den hade flugit in från ingenstans, osynlig hela vägen. Det gäller
    // hela trippelvalet: sidan bär fyra saker, och tre av dem är kombinationen.
    this._rensaVal()
    this._sida = ny
    const in_ = []
    for (const post of this._verktyg) {
      const view = post.v?.view
      if (!view || view.destroyed) continue
      gsap.killTweensOf(view)
      if (post.sida === ny) {
        view.visible = true
        view.eventMode = 'static'
        view.position.set(post.x, post.y)
        view.alpha = 0
        in_.push(view)
      } else {
        view.eventMode = 'none'
        gsap.to(view, {
          alpha: 0,
          duration: 0.14,
          onComplete: () => { if (!view.destroyed) view.visible = false },
        })
      }
    }
    in_.forEach((view, i) => {
      gsap.to(view, { alpha: 1, duration: 0.2, delay: 0.08 + i * 0.05 })
      ctx.later(0.08 + i * 0.05, () => { if (this._alive && !view.destroyed) pop(view, { scale: 1.14 }) })
    })
    this._malaPrickar()
    this._syncRing()
  },

  /**
   * ETT TRYCK PÅ EN SAK — den väljer den, och saken gör SIN egen grej på studs (klockan
   * skallrar, valpen vaknar, fläkten rusar). Verkan på pappa kommer först vid väckknappen
   * eller vid ett släpp; ingenting händer någonsin tyst.
   *
   * ⚠️ HELA TRYCKRESPONSEN BOR HÄR, INTE I `onSelect`. `DragController._toggleSelect`
   *    har redan hunnit växla valet när `pointertap` kommer, och dess AVMARKERINGS-gren är
   *    helt tyst (biblioteket spelar bara ljud när något VÄLJS). Ett andra tryck på samma
   *    sak hade alltså varit en död yta — precis det P0 ÅTERKOPPLING förbjuder. Nu svarar
   *    båda trycken lika; bara ringen skiljer lägena åt.
   */
  _tryckVerktyg(ctx, post) {
    if (!this._alive) return
    // Ett DRAG slutar också med ett `pointertap` på samma nod. Släppet har sin egen respons
    // (`_slappPa` / `_slappBredvid`), så här ska det inte dubbleras.
    if (post.rec?.dragging) return
    this._idle = 0
    post.v.tryck?.()
    this._forhandsljud(ctx, post.key)

    // ⚠️ VALET ÄGS AV SPELET, INTE AV `DragController`. Bibliotekets `selected` rymmer EN
    //    post och nollas vid varje nytt tryck — det går alltså inte att bygga ett trippelval
    //    på den. `_toggleSelect` har redan hunnit köra när det här `pointertap` kommer, så
    //    dess val släpps direkt och listan här är den enda sanningen. Tap-tap-vägen (P0
    //    GESTER) bärs vidare av zonernas EGNA lyssnare, som läser samma lista.
    this._drag?._deselect?.()
    const ix = this._valda.indexOf(post)
    let lagg = true
    if (ix >= 0) {
      this._valda.splice(ix, 1)
      lagg = false
    } else {
      // Fullt? Den ÄLDSTA får lämna plats. Ett tryck får aldrig vara en död yta (P0
      // ÅTERKOPPLING), så ett fjärde val byter ut i stället för att avvisas.
      if (this._valda.length >= MAX_VAL) this._valda.shift()
      this._valda.push(post)
    }

    ripple(ctx.fxLayer, post.x, post.y, { color: lagg ? 0xffe9a8 : 0xffffff, maxR: lagg ? 84 : 58 })
    if (lagg) {
      ctx.services.audio.tone({
        // Tonen STIGER med antalet valda: ett, två, tre saker låter som en treklang som
        // byggs. Barnet hör hur många det har valt utan en enda siffra.
        freq: [523, 659, 784][this._valda.length - 1] || 523,
        dur: 0.12, type: 'triangle', vol: 0.16,
      })
    } else {
      ctx.services.audio.tone({ freq: 392, dur: 0.1, type: 'sine', vol: 0.13 })
    }
    if (this._valda.length === 2 && !this._sagtKombo) {
      this._sagtKombo = true
      this._sag(ctx, 'Två saker på en gång! Tryck på knappen.')
    }
    this._syncRing()
  },

  _rensaVal() {
    this._valda = []
    this._drag?._deselect?.()
    this._syncRing()
  },

  _syncRing() {
    const ringar = this._ringar || []
    ringar.forEach((ring, i) => {
      if (!ring || ring.destroyed) return
      const post = this._valda[i]
      const visa = !!post && post.sida === this._sida
      ring.visible = visa
      if (visa) ring.position.set(post.x, post.y)
    })
  },

  // ---------------------------------------------------------------- zonerna ---

  /**
   * Pappas tre släppzoner. Varje zon är BÅDE ett `DragController`-mål (släpp + tap-tap) och
   * en vanlig träffyta.
   *
   * ⚠️ MIN EGEN LYSSNARE MÅSTE REGISTRERAS FÖRE `addTarget`. Målets egen tap-hanterare
   *    nollar `drag.selected` som första sak; körde min efter skulle den alltid se "inget
   *    valt" och peta pappa OVANPÅ att verktyget användes. Nu läser min lyssnare flaggan
   *    medan den fortfarande är sann och backar undan.
   */
  _byggZoner(ctx) {
    this._zoner = []
    for (const z of ZONER) {
      const n = new Graphics().circle(0, 0, 6).fill({ color: 0xffffff, alpha: 0 })
      n.position.set(z.x, z.y)
      n.eventMode = 'static'
      n.cursor = 'pointer'
      n.hitArea = z.hit
      n.on('pointertap', () => {
        // TAP-TAP-VÄGEN (P0 GESTER) går numera genom spelets egen vallista: har barnet
        // valt en till tre saker skickas ALLA hit. `_deselect()` först, så bibliotekets
        // egen mål-hanterare (som körs efter den här) inte också flyttar ett föremål.
        if (this._valda.length) {
          this._drag?._deselect?.()
          if (this._busy) {
            kvittera(ctx.fxLayer, z.x, z.y, ctx.services.audio)
            return
          }
          this._idle = 0
          this._anvandValda(ctx, z.id)
          return
        }
        if (!this._drag?.selected) this._peta(ctx, z.id)
      })
      this._zonL.addChild(n)
      const mal = this._drag.addTarget(n, () => true, { hitRadius: z.r })
      mal.zon = z.id
      this._zoner.push({ id: z.id, nod: n, mal })
    }
  },

  // Filten över huvudet får en egen träffyta som bara finns när filten faktiskt ligger där.
  _byggFiltKlick(ctx) {
    const k = new Graphics().rect(-95, -95, 190, 190).fill({ color: 0xffffff, alpha: 0 })
    k.position.set(PLATS.ansikte.x, PLATS.ansikte.y)
    k.eventMode = 'static'
    k.cursor = 'pointer'
    k.hitArea = new Rectangle(-95 - HALO, -95 - HALO, 190 + HALO * 2, 190 + HALO * 2)
    k.visible = false
    k.on('pointertap', () => this._filtAv(ctx, true, true))
    this._zonL.addChild(k)
    this._filtKlick = k
  },

  // ---------------------------------------------------------------- rummet ---

  _byggRum(ctx) {
    for (const r of RUM) {
      const n = new Graphics().circle(0, 0, 6).fill({ color: 0xffffff, alpha: 0 })
      n.position.set(r.x, r.y)
      n.eventMode = 'static'
      n.cursor = 'pointer'
      n.hitArea = r.hit
      n.on('pointertap', () => this._rumTryck(ctx, r))
      this._klickL.addChild(n)
    }
  },

  _rumTryck(ctx, r) {
    if (!this._alive) return
    this._idle = 0
    if (this._busy) {
      kvittera(ctx.fxLayer, r.x, r.y, ctx.services.audio)
      return
    }
    if (r.id === 'fonster') return this._vaderTryck(ctx)
    if (r.id === 'vagghylla') return this._hyllaTryck(ctx)
    return this._tavlaTryck(ctx)
  },

  /**
   * FÖNSTRET växlar väder: uppehåll → regn → uppehåll. Regnet väcker honom INTE av sig
   * själv (spelet får aldrig klara sig utan barnet) — men medan det regnar kan en av
   * kryddorna bli ett åskdunder, och DET väcker.
   */
  _vaderTryck(ctx) {
    const audio = ctx.services.audio
    this._regnar = !this._regnar
    this._sovrum.vader?.(this._regnar)
    sparkle(ctx.fxLayer, PLATS.fonster.x, PLATS.fonster.y, { count: 10 })
    if (this._regnar) {
      audio.loop(REGN_SLINGA, { typ: 'brus', freq: 2600, q: 0.7, vol: 0.05 })
      audio.tone({ freq: 880, dur: 0.1, type: 'sine', vol: 0.1, slideTo: 660 })
      this._sag(ctx, 'Nu regnar det ute.')
    } else {
      audio.stopLoop?.(REGN_SLINGA)
      audio.tone({ freq: 660, dur: 0.14, type: 'sine', vol: 0.1, slideTo: 990 })
    }
  },

  /** VÄGGHYLLAN tappar en bok ner på täcket. Tak: tre böcker, sen bara ett skak. */
  _hyllaTryck(ctx) {
    const audio = ctx.services.audio
    const bocker = this._sovrum.bocker || []
    const bok = this._bokKvar > 0 ? bocker[bocker.length - this._bokKvar] : null
    if (!bok || bok.destroyed) {
      this._sovrum.hyllaSkak?.()
      audio.sfx('soft')
      puff(ctx.fxLayer, 752, 320, { count: 5, color: 0xd9c0a0 })
      return
    }
    this._bokKvar -= 1
    this._sovrum.hyllaSkak?.()
    audio.tone({ freq: 520, dur: 0.09, type: 'triangle', vol: 0.12, slideTo: 380 })
    this._tappaBok(ctx, bok)
  },

  /**
   * Boken tippar över hyllkanten och landar på täcket. Den flyttas till effektlagret först
   * — en bok i `bak` hade fallit BAKOM täcket och försvunnit ur bild i samma sekund den
   * lämnade hyllan.
   */
  _tappaBok(ctx, bok) {
    this._effektL.addChild(bok)
    const startX = bok.x
    const startY = bok.y
    const malX = 470 + Math.random() * 220
    const malY = 424 + Math.random() * 22
    const st = { t: 0 }
    const tw = gsap.to(st, {
      t: 1,
      duration: 0.66,
      ease: 'power1.in',
      onUpdate: () => {
        if (!this._alive || bok.destroyed) return
        const t = st.t
        bok.x = startX + (malX - startX) * t
        bok.y = startY + (malY - startY) * (t * t)
        bok.rotation = t * 2.4
      },
      onComplete: () => {
        if (!this._alive || bok.destroyed) return
        bok.rotation = 2.4 + (Math.random() - 0.5) * 0.4
        ctx.services.audio.sample?.('traff_mjuk') || ctx.services.audio.sfx('soft')
        puff(ctx.fxLayer, malX, malY, { count: 8, color: 0xf2dfa0 })
        this._sovrum.filtFladdra?.(1.3)
        this._ans?.slappMin?.()
        this._ans?.min('forvanad', { hall: 0.9 })
        this._sagPappa(ctx, 'oj')
        this._hoj(ctx, 1, { x: malX, y: malY }, 'bok')
        this._sag(ctx, 'Boken ramlade ner på pappa.')
      },
    })
    this._fx.push({ nod: bok, tw })
  },

  /** Böckerna tillbaka i hyllan inför nästa omgång — någon har städat medan pappa gäspade. */
  _stallTillbakaBocker() {
    for (const h of this._bokHem || []) {
      const b = h.nod
      if (!b || b.destroyed || !h.foralder || h.foralder.destroyed) continue
      // Fallet drivs av en PROXY-tween (`st`), inte av boken själv — `killTweensOf(b)` når
      // den alltså inte, och en bok mitt i fallet hade skrivit sin position varje bildruta
      // rakt ovanpå återställningen.
      for (const f of this._fx || []) if (f.nod === b) f.tw?.kill()
      gsap.killTweensOf(b)
      h.foralder.addChild(b)
      b.position.set(h.x, h.y)
      b.rotation = h.rot
    }
    this._bokKvar = this._bokHem?.length || 0
  },

  /** TAVLAN: den sovande månen gungar och gnistrar. Noll vakenhet, bara glädje. */
  _tavlaTryck(ctx) {
    this._sovrum.tavlaGunga?.()
    ctx.services.audio.tone({ freq: 784, dur: 0.14, type: 'sine', vol: 0.12, slideTo: 1046 })
    sparkle(ctx.fxLayer, 650, 178, { count: 8 })
  },

  /**
   * ETT TRYCK PÅ PAPPA UTAN VALT VERKTYG. Ingen yta på honom får vara död (P0).
   *   ansikte → han muttrar och vänder sig bort
   *   filt    → täcket åker ner, och han fryser tills han drar upp det igen
   *   fot     → foten rycks in under täcket
   */
  _peta(ctx, zon) {
    if (!this._alive) return
    this._idle = 0
    const audio = ctx.services.audio
    const p = this._zonPunkt(zon)
    if (this._busy) {
      kvittera(ctx.fxLayer, p.x, p.y, audio)
      return
    }
    ripple(ctx.fxLayer, p.x, p.y, { color: 0xffffff, maxR: 62 })
    if (zon === 'filt') return this._taketNed(ctx)
    if (zon === 'fot') {
      this._sovrum.fotRyck?.()
      audio.sfx('soft')
      this._ans?.tveka({ vinkel: 0.05, varv: 2, tid: 0.18 })
      this._sagPappa(ctx, 'huh')
      this._hoj(ctx, 1, p, 'peta-fot')
      return
    }
    audio.sfx('soft')
    this._luta(ctx, -0.55, 0.28)
    ctx.later(0.9, () => this._luta(ctx, 0, 0.5))
    this._ans?.slappMin?.()
    this._ans?.min('sur', { hall: 0.8 })
    this._sagPappa(ctx, 'surt')
    this._hoj(ctx, 1, p, 'peta-ansikte')
  },

  /** TÄCKET ÅKER NER — och han drar upp det själv igen. Ett i taget, alltid självläkande. */
  _taketNed(ctx) {
    if (this._taketNer) {
      // Redan nere: ett tryck till drar upp det, så barnet aldrig sitter fast i läget.
      this._taketUpp(ctx)
      return
    }
    this._taketNer = true
    this._sovrum.taketAv?.(true)
    ctx.services.audio.sfx('whoosh')
    puff(ctx.fxLayer, 570, 470, { count: 10, color: 0x87b2e6 })
    this._ans?.kyla(0.5)
    this._ans?.slappMin?.()
    this._ans?.min('chock', { hall: 1 })
    this._ans?.tveka({ vinkel: 0.06, varv: 4, tid: 0.1 })
    this._sagPappa(ctx, 'ohh')
    this._sag(ctx, 'Nu ligger pappa utan täcke. Brrr!')
    this._hoj(ctx, 1, { x: 570, y: 440 }, 'take')
    ctx.later(6, () => { if (this._alive) this._taketUpp(ctx) })
  },

  _taketUpp(ctx) {
    if (!this._taketNer) return
    this._taketNer = false
    this._sovrum.taketAv?.(false)
    ctx.services.audio.sfx('flip')
    this._ans?.kyla(0)
    this._sagPappa(ctx, 'mmm')
  },

  // ---------------------------------------------------------------- vägarna in ---

  /**
   * VÄCKKNAPPEN. Med ett valt verktyg far det iväg mot ansiktet och gör sin sak; utan
   * val hoppar hela hyllan i stället — en stor knapp får ALDRIG vara en död yta (P0).
   */
  _vackTryck(ctx) {
    if (!this._alive) return
    this._idle = 0
    if (!this._valda.length) return this._tomKnapp(ctx)
    if (this._busy) {
      kvittera(ctx.fxLayer, VACK.x, VACK.y - 60, ctx.services.audio)
      return
    }
    this._anvandValda(ctx, 'ansikte')
  },

  /**
   * ÄGARENS PUNKT 1: alla valda saker far iväg TILLSAMMANS, en efter en med `KOMBO_STEG`
   * emellan. Turordningen är den barnet valde i — den som trycktes först landar först.
   *
   * ⚠️ LISTAN TÖMS FÖRE avfärden. Varje sak stänger av sin egen träffyta under resan
   *    (`_skickaIvag`), och en post som ligger kvar som "vald" medan den flyger hade
   *    kunnat skickas iväg en gång till av nästa tryck på knappen.
   */
  _anvandValda(ctx, zon) {
    const valda = this._valda.filter((p) => p.sida === this._sida)
    if (!valda.length) return
    this._rensaVal()
    // ⚠️ FINALEN HÅLLS TILLBAKA TILLS HELA KOMBON LANDAT. Två starka saker räcker för att
    //    ta honom hela vägen, och `_final` gör `_avbrytResa()` — sak två och tre hade
    //    snäppts hem mitt i luften och aldrig visat vad de gjorde. Barnet valde tre saker;
    //    det ska få se tre saker.
    this._komboKvar = valda.length
    valda.forEach((post, i) => {
      if (i === 0) return this._skickaIvag(ctx, post, zon, 0)
      ctx.later(i * KOMBO_STEG, () => {
        if (this._alive && !this._busy) this._skickaIvag(ctx, post, zon, i)
      })
    })
  },

  _tomKnapp(ctx) {
    const audio = ctx.services.audio
    // Sakerna på hyllan hoppar och ropar på sig själva — instruktionen som en bild.
    const pa = this._verktyg.filter((p) => p.sida === this._sida)
    pa.forEach((post, i) => {
      ctx.later(i * 0.07, () => {
        if (!this._alive || post.v.view.destroyed) return
        wiggle(post.v.view)
        sparkle(ctx.fxLayer, post.x, post.y - 40, { count: 5 })
      })
    })
    audio.tone({ freq: 523, dur: 0.1, type: 'triangle', vol: 0.13 })
    audio.tone({ freq: 659, dur: 0.1, type: 'triangle', vol: 0.13, delay: 0.1 })
    audio.tone({ freq: 784, dur: 0.16, type: 'triangle', vol: 0.13, delay: 0.2 })
    this._tomKnappar += 1
    if (this._tomKnappar % 2 === 1) this._sag(ctx, 'Välj en sak på bordet först!')
    else this._sag(ctx, 'Tryck på pilarna, det finns fler saker.')
  },

  /**
   * VÄG ⓐ: saken lyfter från hyllan, far i en båge till zonen, gör sin sak och far hem.
   *
   * ⚠️ SAKEN SJÄLV FLYGER — ingen kopia. En kopia hade betytt två likadana föremål i bild
   *    under en halv sekund, och det läser som en bugg. Under resan är dess `eventMode`
   *    'none': den ÄR inte på hyllan, så det finns ingen yta att trycka på. (Det är inte en
   *    upptagen-flagga som sväljer ett tryck — den som trycker på tom hyllplats får ändå
   *    rummets eget svar av `_tomtTryck`.)
   */
  _skickaIvag(ctx, post, zon, ordning = 0) {
    const view = post.v?.view
    if (!view || view.destroyed) return
    // ⚠️ BARA DEN HÄR SAKENS EGEN RESA AVBRYTS. Förut fanns ETT `_resa`-fack, och en ny
    //    avfärd snäppte hem den förra — med tre saker i luften samtidigt (ägarens punkt 1)
    //    hade sak två slagit hem sak ett innan den ens landat.
    this._avbrytPost(post)
    this._resor.add(post)
    view.eventMode = 'none'
    gsap.killTweensOf(view)
    const rakt = this._zonPunkt(zon)
    const off = LANDNING[post.key] || { x: 0, y: 0 }
    // Flera saker på samma zon får var sitt läge, annars står de i varandra. Fjäderformen
    // är medveten: mitten först, sedan lite ovanför och lite nedanför.
    const spridd = ordning ? { x: off.x + (ordning % 2 ? 46 : -40), y: off.y + (ordning % 2 ? -52 : 48) } : off
    const mal = { x: rakt.x + spridd.x, y: rakt.y + spridd.y }
    const start = { x: view.x, y: view.y }
    const topp = Math.min(start.y, mal.y) - 110
    const st = { t: 0 }
    post._resaTw = gsap.to(st, {
      t: 1,
      duration: 0.42,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (!this._alive || view.destroyed) return
        const t = st.t
        const u = 1 - t
        view.x = u * u * start.x + 2 * u * t * ((start.x + mal.x) / 2) + t * t * mal.x
        view.y = u * u * start.y + 2 * u * t * topp + t * t * mal.y
        view.rotation = Math.sin(t * Math.PI) * 0.45
      },
      onComplete: () => {
        if (!this._alive || view.destroyed) return
        this._verkan(ctx, post, zon)
        this._komboLandade(ctx)
        ctx.later(RESA_HALL[post.key] ?? HALL_STANDARD, () => this._resaHem(ctx, post))
      },
    })
  },

  /** En sak ur kombon är framme. Är den sista framme släpps en uppskjuten final. */
  _komboLandade(ctx) {
    if (this._komboKvar > 0) this._komboKvar -= 1
    if (this._komboKvar > 0 || !this._finalVantar) return
    this._finalVantar = false
    ctx.later(0.6, () => { if (this._alive) this._final(ctx) })
  },

  _resaHem(ctx, post) {
    const view = post.v?.view
    if (!this._alive || !view || view.destroyed) return
    gsap.killTweensOf(view)
    post.v.sikta?.(null)
    post._resaTw = gsap.to(view, {
      x: post.x,
      y: post.y,
      rotation: 0,
      duration: 0.42,
      ease: 'back.out(1.3)',
      onComplete: () => {
        if (!this._alive || view.destroyed) return
        if (post.sida === this._sida) view.eventMode = 'static'
        post._resaTw = null
        this._resor.delete(post)
      },
    })
  },

  /** Snäpper hem EN saks resa direkt. */
  _avbrytPost(post) {
    if (!post) return
    post._resaTw?.kill()
    post._resaTw = null
    this._resor.delete(post)
    const view = post.v?.view
    if (!view || view.destroyed) return
    gsap.killTweensOf(view)
    post.v.sikta?.(null)
    view.position.set(post.x, post.y)
    view.rotation = 0
    view.eventMode = post.sida === this._sida ? 'static' : 'none'
  },

  /** Snäpper hem ALLA pågående resor — sidbyte och final. */
  _avbrytResa() {
    for (const post of [...this._resor]) this._avbrytPost(post)
    this._resor.clear()
    this._komboKvar = 0
  },

  /** VÄG ⓑ: `DragController` har redan flugit saken till zonen — verka och skicka hem den. */
  _slappPa(ctx, post, zon) {
    this._idle = 0
    if (!this._alive) return
    // `aterstall` gör saken dragbar igen — men först när den är HEMMA. Släcks den inte här
    // kan ett nytt grepp startas mitt i hemresan, och `DragController`s quickTo skulle då
    // slåss med hemtweenen om samma x/y. (Ingen död yta: saken ligger på pappa, inte på
    // hyllplatsen, och `_resaHem` tänder den igen när den står på sin plats.)
    this._drag.aterstall(post.v.view)
    if (!post.v.view.destroyed) post.v.view.eventMode = 'none'
    // Ett DRAG är sin egen handling: den dragna saken lämnar trippelvalet, annars hade den
    // skickats iväg en gång till av nästa tryck på väckknappen.
    const ix = this._valda.indexOf(post)
    if (ix >= 0) { this._valda.splice(ix, 1); this._syncRing() }
    if (this._busy) {
      kvittera(ctx.fxLayer, post.v.view.x, post.v.view.y, ctx.services.audio)
    } else {
      this._verkan(ctx, post, zon)
    }
    ctx.later(RESA_HALL[post.key] ?? HALL_STANDARD, () => {
      if (!this._alive || post.v.view.destroyed) return
      this._resor.add(post)
      this._resaHem(ctx, post)
    })
  },

  /** Ett släpp bredvid pappa är aldrig fel — saken studsar hem och pyser lite. */
  _slappBredvid(ctx, post) {
    this._idle = 0
    if (!this._alive) return
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, post.v.view.x, post.v.view.y, { count: 5, color: 0xffffff })
  },

  _zonPunkt(zon) {
    const z = ZONER.find((q) => q.id === zon) || ZONER[0]
    if (zon === 'ansikte') return { x: z.x, y: (this._ogonY || z.y) + 26 }
    return { x: z.x, y: z.y }
  },

  /**
   * VARIFRÅN en riktad effekt ska ritas. Käglan, vindbågarna och doftspåret behöver ett
   * AVSTÅND att gå: släpper barnet saken mitt i ansiktet är riktningen odefinierad och
   * strålen blir noll pixlar lång. Då backas källan ut till `minst` px från målet, längs
   * linjen mot sakens plats på hyllan — alltså åt det håll den faktiskt kom ifrån.
   */
  _kallaPunkt(post, mal, minst = 155) {
    const v = post.v?.view
    const x = v && !v.destroyed ? v.x : post.x
    const y = v && !v.destroyed ? v.y : post.y
    let dx = x - mal.x
    let dy = y - mal.y
    let d = Math.hypot(dx, dy)
    if (d >= minst) return { x, y }
    if (d < 1) {
      dx = post.x - mal.x
      dy = post.y - mal.y
      d = Math.hypot(dx, dy) || 1
    }
    return { x: mal.x + (dx / d) * minst, y: mal.y + (dy / d) * minst }
  },

  // ---------------------------------------------------------------- verkan ---

  /**
   * VAD SAKEN GÖR MED PAPPA. Var sak har en EGEN mekanism och en EGEN min — tolv varianter
   * av samma studs vore tolv gånger ingenting.
   */
  _verkan(ctx, post, zon) {
    if (!this._alive) return
    // ⚠️ TRE SAKER I LUFTEN KAN LANDA EFTER FINALEN. Kombinationen skickas iväg med
    //    `KOMBO_STEG` emellan, och den första kan mycket väl ta honom hela vägen — då är
    //    `_busy` sann när nummer två och tre kommer fram. De kvitterar och far hem i
    //    stället för att köra en verkan ovanpå gäspningen.
    if (this._busy) {
      kvittera(ctx.fxLayer, post.v?.view?.x ?? post.x, post.v?.view?.y ?? post.y, ctx.services.audio)
      return
    }
    const key = post.key
    const audio = ctx.services.audio
    const a = this._ans
    const p = this._zonPunkt(zon)
    // ⚠️ SIKTET SÄTTS FÖRE `tryck()`. `tryck()` nollställer saken mot sin vilopose och
    //    lägger sin rekyl kring den — vrids lampan efteråt slåss de två om `rotation`, och
    //    vred man den före blir rekylen automatiskt rätt (den räknas kring `sikte`).
    if (key === 'lampa') {
      const kl0 = this._kallaPunkt(post, p)
      post.v.sikta?.(Math.atan2(p.y - kl0.y, p.x - kl0.x))
    }
    post.v.tryck?.()
    // Vilket håll ljudet kom ifrån — det öppnade ögat i läge 3 tittar dit. Landar saken
    // MITT i ansiktet finns ingen riktning i släpp-punkten (dx = 0), så då används sakens
    // plats på hyllan i stället: det är därifrån barnet såg den komma.
    const kalla = zon === 'ansikte' ? post.x : p.x
    this._sistLjudDx = Math.max(-1, Math.min(1, (kalla - PLATS.ansikte.x) / 420))

    // Rullgardinen rör aldrig pappa: den öppnar rummet och DUBBLAR allt annat.
    if (key === 'gardin') {
      this._gardinUppe = !this._gardinUppe
      this._sovrum.rullgardin?.(!this._gardinUppe)
      audio.sfx('flip')
      if (this._gardinUppe) {
        sparkle(ctx.fxLayer, PLATS.fonster.x, PLATS.fonster.y, { count: 14 })
        a?.slappMin?.()
        a?.min('skeptisk', { hall: 0.8 })
      }
      return
    }

    if (key === 'katt') return this._kattTur(ctx, post, zon, p)
    if (key === 'kaffe') return this._kaffe(ctx, post, zon, p)

    let e = EFFEKT[key] ?? 1

    if (key === 'klocka') {
      audio.tone({ freq: 880, dur: 0.09, type: 'square', vol: 0.16 })
      audio.tone({ freq: 1180, dur: 0.09, type: 'square', vol: 0.16, delay: 0.11 })
      audio.tone({ freq: 880, dur: 0.09, type: 'square', vol: 0.16, delay: 0.22 })
      a?.ryck({ styrka: 1.3 })
      a?.slappMin?.()
      a?.min('chock', { hall: 0.9 })
      this._sagPappa(ctx, 'chock')
      this._hoj(ctx, this._zonVerkan(key, zon, e), p, key)
      // …och så drar han filten över huvudet. EFTER höjningen, så det starkaste verktyget
      // alltid ger sitt framsteg först och haken kommer som en reaktion på det.
      ctx.later(0.55, () => this._filtPaHuvudet(ctx))
      return
    }

    if (key === 'trumpet') {
      // En stämd fanfar, aldrig en generisk blipp (kvalitetsgrind 5): G4 → C5, en ren kvart.
      audio.tone({ freq: 392, dur: 0.16, type: 'sawtooth', vol: 0.16 })
      audio.tone({ freq: 523, dur: 0.26, type: 'sawtooth', vol: 0.16, delay: 0.17 })
      a?.ryck({ styrka: 1.2 })
      a?.slappMin?.()
      a?.min('forvanad', { hall: 0.9 })
      puff(ctx.fxLayer, p.x, p.y - 150, { count: 11, color: 0x6b4a32 })
      this._sagPappa(ctx, 'oj')
    } else if (key === 'ballong') {
      // SMÄLLEN: ett verkligt anslag, inte en blipp — `pop` + ett samplat slag + en
      // basstöt som faller 120 → 52 Hz. Ballongen sväller i sin egen `tryck()` samtidigt,
      // så bilden och ljudet berättar samma sak i samma bildruta.
      audio.sfx('pop')
      audio.sample?.('traff_hard')
      audio.tone({ freq: 120, dur: 0.24, type: 'sawtooth', vol: 0.14, slideTo: 52, delay: 0.02 })
      burst(ctx.fxLayer, p.x, p.y - 30, { count: 16, colors: [0xef5b5b, 0xffd35c, 0xfffdf7], power: 1.25 })
      a?.ryck({ styrka: 1.8 })
      a?.blunda({ v: false, h: false })
      a?.slappMin?.()
      a?.min('chock', { hall: 1.2 })
      this._sovrum.filtFladdra?.(1.5)
      this._sagPappa(ctx, 'chock')
    } else if (key === 'strumpa') {
      // LUKTEN driver synligt mot näsan och han vänder bort huvudet.
      audio.sfx('soft')
      audio.tone({ freq: 300, dur: 0.42, type: 'sawtooth', vol: 0.11, slideTo: 150 })
      const kv = this._kallaPunkt(post, p)
      this._spar(ctx, kv.x, kv.y - 30, p.x, p.y - 24, 0x9ed46a)
      a?.slappMin?.()
      a?.min('acklad', { hall: 1.4 })
      this._luta(ctx, this._sistLjudDx > 0 ? -0.85 : 0.85, 0.3)
      ctx.later(1.5, () => this._luta(ctx, 0, 0.5))
      this._sagPappa(ctx, 'blaa')
      if (Math.random() < 0.5) this._sag(ctx, 'Usch, vad strumpan luktar!')
    } else if (key === 'lampa') {
      // LJUSET: en kägla över ansiktet, och han kisar med båda ögonen ett ögonblick.
      audio.sfx('flip')
      audio.tone({ freq: 1320, dur: 0.18, type: 'sine', vol: 0.1, slideTo: 1760 })
      // Strålen utgår ur LINSEN (siktet är redan satt längre upp), inte ur lampans mitt.
      const lins = post.v.stralPunkt?.()
      const kl = lins && Math.hypot(p.x - lins.x, p.y - lins.y) > 40 ? lins : this._kallaPunkt(post, p)
      this._kagla(ctx, kl.x, kl.y, p)
      sparkle(ctx.fxLayer, p.x, p.y - 20, { count: 10 })
      a?.slappMin?.()
      a?.min('skeptisk', { hall: 1.1 })
      a?.blunda({ v: true, h: true, tid: 0.12 })
      ctx.later(1.2, () => { if (this._alive) this._satOgon() })
      this._sagPappa(ctx, 'huh')
    } else if (key === 'spruta') {
      // BLÖTT: droppar far ut, han ryser, och huden blir kall.
      audio.sample?.('thwip') || audio.sfx('whoosh')
      audio.tone({ freq: 1600, dur: 0.16, type: 'sine', vol: 0.09, slideTo: 900 })
      burst(ctx.fxLayer, p.x, p.y - 10, { count: 12, colors: [0x9fd9f5, 0x4aa3df, 0xfffdf7], power: 0.9 })
      ripple(ctx.fxLayer, p.x, p.y, { color: 0x9fd9f5, maxR: 96 })
      a?.kyla(0.6)
      ctx.later(1.8, () => { if (this._alive) this._ans?.kyla(0) })
      a?.tveka({ vinkel: 0.08, varv: 4, tid: 0.09 })
      a?.slappMin?.()
      a?.min('chock', { hall: 1 })
      this._sagPappa(ctx, 'gasp')
    } else if (key === 'flakt') {
      // VIND: bågar far över sängen, täcket fladdrar — och filten över huvudet BLÅSER AV.
      audio.sfx('whoosh')
      audio.tone({ freq: 220, dur: 0.7, type: 'sine', vol: 0.07, slideTo: 340 })
      const kf = this._kallaPunkt(post, p, 210)
      this._vindbagar(ctx, kf.x, kf.y, p)
      this._sovrum.filtFladdra?.(1.6)
      a?.kyla(0.32)
      ctx.later(2.2, () => { if (this._alive) this._ans?.kyla(0) })
      a?.slappMin?.()
      a?.min('skeptisk', { hall: 1 })
      this._sagPappa(ctx, 'ohh')
      if (this._filtPa) {
        this._filtAv(ctx, true)
        e += 1
      }
    } else if (key === 'kittla') {
      // KRYPET: fjädern går en STRÄCKA över honom, tre nedslag med var sin min.
      return this._kryp(ctx, post, zon, p, e)
    } else if (key === 'hund') {
      return this._hundPrutt(ctx, post, zon, p, e)
    }

    this._hoj(ctx, this._zonVerkan(key, zon, e), p, key)
  },

  /**
   * ZONENS VERKAN. Ansiktet ger full effekt; täcket dämpar (men aldrig till noll — ett
   * hinder får sakta ner, aldrig stoppa); fotsulan är kittlig och ger EXTRA för fjädern
   * och sprutan. Att välja rätt ställe är hela agensen i draget.
   */
  _zonVerkan(key, zon, e) {
    if (e <= 0) return e
    if (zon === 'ansikte') return e
    if (zon === 'fot') return key === 'kittla' || key === 'spruta' ? e + 1 : Math.max(1, e - 1)
    return Math.max(1, e - 1)
  },

  /**
   * KAFFET biter bara från läge 2 — dessförinnan sover han för djupt för att känna doften.
   * Men "biter inte" får aldrig betyda "hände ingenting" (P0 ÅTERKOPPLING): doften driver
   * synligt mot näsan, blicken följer den, och han snusar med små gap-pulser.
   */
  _kaffe(ctx, post, zon, p) {
    const a = this._ans
    const audio = ctx.services.audio
    audio.sfx('soft')
    audio.tone({ freq: 330, dur: 0.3, type: 'sine', vol: 0.1, slideTo: 392 })
    const kk = this._kallaPunkt(post, p)
    this._spar(ctx, kk.x, kk.y - 24, p.x, p.y - 22, 0xd9c0a0)
    if (a) {
      a.blick(this._sistLjudDx, 0.5)
      const st = { v: 0 }
      this._snusTw?.kill()
      this._snusTw = gsap.to(st, {
        v: 0.22, duration: 0.16, yoyo: true, repeat: 3, ease: 'sine.inOut',
        onUpdate: () => { if (this._alive && this._ans) this._ans.gap(st.v) },
        onComplete: () => { if (this._alive && this._ans) this._ans.gap(0) },
      })
      ctx.later(1.1, () => { if (this._alive) this._ans?.blick(0, 0) })
    }
    if (this._vaken < 1) {
      // Han snusar i sömnen. Ingen text, ingen tillsägelse — bara ett litet "mmm".
      this._sagPappa(ctx, 'mmm')
      return
    }
    a?.slappMin?.()
    a?.min('nojd', { hall: 1.1 })
    this._hoj(ctx, this._zonVerkan('kaffe', zon, EFFEKT.kaffe), p, 'kaffe')
  },

  /**
   * FJÄDERN KRYPER en sträcka över honom — tre nedslag med 0,42 s emellan, och varje
   * nedslag frågar riggens `traffar()` VAR det landade och väljer min därefter. En
   * punkteffekt hade varit ett tryck till; det här är ett kryp.
   */
  _kryp(ctx, post, zon, p, e) {
    const audio = ctx.services.audio
    const view = post.v?.view
    const steg = zon === 'fot'
      ? [{ x: p.x - 34, y: p.y + 8 }, { x: p.x, y: p.y - 6 }, { x: p.x + 30, y: p.y + 4 }]
      : [{ x: p.x - 62, y: p.y + 30 }, { x: p.x + 4, y: p.y - 6 }, { x: p.x + 58, y: p.y + 26 }]
    // En liten stämd stege — kittlingen ska LÅTA som en kittling, inte som ett 'soft'.
    const toner = [660, 784, 988]
    steg.forEach((s, i) => {
      ctx.later(i * 0.42, () => {
        if (!this._alive) return
        audio.tone({ freq: toner[i], dur: 0.1, type: 'triangle', vol: 0.11, slideTo: toner[i] * 1.2 })
        sparkle(ctx.fxLayer, s.x, s.y, { count: 4 })
        if (view && !view.destroyed) {
          gsap.to(view, { x: s.x, y: s.y - 44, duration: 0.3, ease: 'sine.inOut' })
          post.v.tryck?.()
        }
        this._ans?.tveka({ vinkel: 0.05, varv: 2, tid: 0.13 })
        if (i === 1) this._minForZon(ctx, s.x, s.y)
      })
    })
    ctx.later(1.3, () => {
      if (!this._alive) return
      this._ans?.slappMin?.()
      this._ans?.min('skratt', { hall: 1.2 })
      this._sagPappa(ctx, 'fniss')
      this._hoj(ctx, this._zonVerkan('kittla', zon, e), p, 'kittla')
    })
  },

  /**
   * HUNDEN pruttar på honom. Ja, verkligen — P0 tillåter bajs- och pruttkomik, och det är
   * spelets största skratt. Hon skäller först (så barnet vet vem det var), vänder rumpan
   * till, och den gröna skyn driver mot näsan.
   */
  _hundPrutt(ctx, post, zon, p, e) {
    const audio = ctx.services.audio
    const a = this._ans
    const view = post.v?.view
    audio.sample?.('djur_hund') || audio.tone({ freq: 300, dur: 0.16, type: 'sawtooth', vol: 0.16, slideTo: 220 })
    // Valpen är ritad åt HÖGER (nosen på +52, svansroten på −58), alltså sitter rumpan åt
    // vänster i vila. Står hon till höger om pappa behåller hon riktningen; står hon till
    // vänster speglas hon. Vändningen går via `vand()` (livnoden) — `view.scale` ägs av
    // valpulsen och `krop.scale` av tryck-reaktionen, och två tweens om samma egenskap
    // hade skrivit om varandra varje bildruta.
    const hoger = (view && !view.destroyed ? view.x : p.x) >= p.x
    post.v.vand?.(hoger ? 1 : -1)
    ctx.later(0.5, () => {
      if (!this._alive) return
      if (!audio.sample?.('fart')) {
        audio.tone({ freq: 150, dur: 0.34, type: 'sawtooth', vol: 0.15, slideTo: 68 })
        audio.tone({ freq: 96, dur: 0.26, type: 'square', vol: 0.1, slideTo: 58, delay: 0.3 })
      }
      const bas = view && !view.destroyed ? view.x : p.x + 86
      const bx = bas + (hoger ? -52 : 52)
      const by = (view && !view.destroyed ? view.y : p.y) + 8
      puff(ctx.fxLayer, bx, by, { count: 12, color: 0x9ed46a })
      this._spar(ctx, bx, by, p.x, p.y - 24, 0x9ed46a)
      this._sovrum.filtFladdra?.(0.8)
    })
    ctx.later(1.15, () => {
      if (!this._alive) return
      a?.slappMin?.()
      a?.min('acklad', { hall: 1.5 })
      a?.gap(0.3)
      ctx.later(0.5, () => { if (this._alive) this._ans?.gap(0) })
      this._sagPappa(ctx, 'blaa')
      this._sag(ctx, 'Hundvalpen pruttade på pappa!')
      this._hoj(ctx, this._zonVerkan('hund', zon, e), p, 'hund')
      post.v.vand?.(1)
    })
  },

  /**
   * KATTEN går på hans ansikte, och `traffar()` avgör vilken min varje tass ger. Det är
   * riggens pixelexakta silhuettmätning använd till något annat än kastad mat — samma
   * funktion, en helt annan lek. Hon STANNAR där hon hamnar; nästa tryck är en klapp.
   */
  _kattTur(ctx, post, zon, p) {
    const A = PLATS.ansikte
    const audio = ctx.services.audio
    if (!this._katt) {
      const k = makeKatt()
      if (!k) return
      k.view.position.set(post.v.view.x, post.v.view.y - 40)
      this._effektL.addChild(k.view)
      this._katt = k
      k.liv?.()
    }
    const katt = this._katt
    audio.sample?.('djur_katt') || audio.tone({ freq: 523, dur: 0.22, type: 'sine', vol: 0.18, slideTo: 659 })
    katt.jama?.()

    if (this._kattPa) {
      // Den står redan på honom: ett tryck till är en klapp, och den ger sitt eget läge.
      katt.reagera?.()
      this._minForZon(ctx, katt.view.x, katt.view.y + 26)
      this._hoj(ctx, this._zonVerkan('katt', zon, EFFEKT.katt), p, 'katt')
      return
    }

    this._kattPa = true
    this._sag(ctx, 'Katten sitter kvar på kudden.')
    const vag = zon === 'ansikte'
      ? [{ x: A.x - 96, y: A.y - 26 }, { x: A.x, y: A.y - 58 }, { x: A.x + 96, y: A.y - 26 }]
      : [{ x: p.x - 90, y: p.y - 30 }, { x: p.x, y: p.y - 44 }, { x: A.x + 96, y: A.y - 26 }]
    const steg = (i) => {
      if (!this._alive || !this._katt) return
      if (i >= vag.length) {
        this._hoj(ctx, this._zonVerkan('katt', zon, EFFEKT.katt), p, 'katt')
        return
      }
      const q = vag[i]
      this._katt.gaTill?.(q.x, q.y, () => {
        if (!this._alive) return
        this._minForZon(ctx, q.x, q.y + 26)
        ctx.later(0.45, () => steg(i + 1))
      })
    }
    steg(0)
  },

  /** Vilken min tassen (eller fjädern) framkallar, avgjort av VAR den landade. */
  _minForZon(ctx, x, y) {
    const a = this._ans
    if (!a) return
    if (!a.traffar(x, y, 26)) return
    const dy = y - (this._ogonY || 0)
    const namn = dy < -34 ? 'forvanad' : dy < 34 ? 'aj' : 'acklad'
    a.slappMin?.()
    a.min(namn, { hall: 0.8 })
    this._sagPappa(ctx, namn === 'aj' ? 'aj' : namn === 'acklad' ? 'blaa' : 'oj')
  },

  // ---------------------------------------------------------------- effekter ---

  /** Ett transient ritat lager som tonar in och ut och städar efter sig — exit-säkert. */
  _transient(ctx, g, { topp = 0.6, hall = 0.35, ut = 0.5 } = {}) {
    g.eventMode = 'none'
    g.alpha = 0
    this._effektL.addChild(g)
    const st = { a: 0 }
    const skriv = () => { if (!g.destroyed) g.alpha = st.a }
    const tw = gsap.timeline()
    tw.to(st, { a: topp, duration: 0.12, ease: 'power2.out', onUpdate: skriv })
      .to(st, { a: topp, duration: hall })
      .to(st, {
        a: 0, duration: ut, ease: 'power2.in', onUpdate: skriv,
        onComplete: () => { if (!g.destroyed) g.destroy() },
      })
    // Listan finns bara för att `destroy()` ska hitta det som fortfarande lever. Den städas
    // vid varje ny effekt, annars växer den en post per tryck genom hela sessionen.
    this._fx = this._fx.filter((f) => f.nod && !f.nod.destroyed)
    this._fx.push({ nod: g, tw })
    return g
  },

  /** Ett doft-/stinkspår som driver från saken till näsan. Fem puffar längs vägen. */
  _spar(ctx, x0, y0, x1, y1, farg) {
    for (let i = 0; i < 5; i++) {
      ctx.later(i * 0.11, () => {
        if (!this._alive) return
        const t = i / 4
        puff(ctx.fxLayer, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 24 * Math.sin(t * Math.PI),
          { count: 3, color: farg })
      })
    }
  },

  /** Ficklampans kägla: en trapets från lampan till ansiktet. */
  _kagla(ctx, x0, y0, mal) {
    const dx = mal.x - x0
    const dy = mal.y - y0
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const g = new Graphics()
    g.moveTo(x0 + nx * 14, y0 + ny * 14)
      .lineTo(mal.x + nx * 86, mal.y + ny * 86)
      .lineTo(mal.x - nx * 86, mal.y - ny * 86)
      .lineTo(x0 - nx * 14, y0 - ny * 14)
      .closePath()
      .fill({ color: 0xfff3b0 })
    g.ellipse(mal.x, mal.y, 92, 78).fill({ color: 0xfffdf0, alpha: 0.5 })
    this._transient(ctx, g, { topp: 0.5, hall: 0.5, ut: 0.6 })
  },

  /** Fläktens vind: fyra bågar som far från fläkten mot sängen. */
  _vindbagar(ctx, x0, y0, mal) {
    const dx = mal.x - x0
    const dy = mal.y - y0
    const vinkel = Math.atan2(dy, dx)
    for (let i = 0; i < 4; i++) {
      ctx.later(i * 0.09, () => {
        if (!this._alive) return
        const g = new Graphics()
        const t = 0.25 + i * 0.2
        const cx = x0 + dx * t
        const cy = y0 + dy * t - 40 * Math.sin(t * Math.PI)
        for (const r of [22, 34, 46]) {
          g.arc(cx, cy, r, vinkel - 0.8, vinkel + 0.8).stroke({ width: 4, color: 0xdff2ff, cap: 'round' })
        }
        this._transient(ctx, g, { topp: 0.75, hall: 0.12, ut: 0.42 })
      })
    }
  },

  // ---------------------------------------------------------------- sömnen ---

  _niva() { return Math.min(LAGEN, Math.floor(this._vaken) + 1) },

  /**
   * @param key vad som orsakade höjningen. VIKTIGT att den skickas med: vänjnings-regeln
   *            nedan räknar upprepningar av SAMMA orsak, och en rums-händelse (bok, åska)
   *            får inte bokföras som "samma verktyg igen".
   */
  _hoj(ctx, e, punkt, key = 'rum') {
    if (!this._alive) return
    let n = e
    if (this._gardinUppe) n *= 2
    // ⚠️ HAN VÄNJER SIG VID SAMMA SAK. Tredje gången i rad ger ett läge mindre — men aldrig
    //    under 1, för då hade upprepning STOPPAT framsteget och P0 MOTGÅNG tillåter bara
    //    att hinder saktar ner. Bytet av verktyg löser det direkt, och det är just det
    //    valet spelet vill locka fram.
    if (n > 0) {
      if (this._sistKey === key) this._upprepning += 1
      else { this._sistKey = key; this._upprepning = 1 }
      if (this._upprepning >= 3) {
        n = Math.max(1, n - 1)
        this._ans?.slappMin?.()
        this._ans?.min('retas', { hall: 0.8 })
        this._sagPappa(ctx, 'retas')
      }
    }
    if (this._filtPa) {
      // Filten dämpar — men den är ETT tryck bort och narratorn säger var. Motgången saktar
      // ner, den stoppar aldrig (P0), och efter två dämpade ljud glider den av själv.
      n = Math.floor(n / 2)
      this._filtKvar -= 1
      if (this._filtKvar <= 0) this._filtAv(ctx)
    }
    if (n <= 0) {
      if (punkt) puff(ctx.fxLayer, punkt.x, punkt.y - 40, { count: 5, color: 0xffffff })
      return
    }
    const forr = this._niva()
    this._vaken = Math.min(MAX, this._vaken + n)
    this._pausT = PAUS
    this._aterT = 0
    // ⚠️ HÖGST ETT LÄGE FÅR TAPPAS PER TRYCK, OCH BARA VARANNAN GÅNG. Utan den regeln har
    //    återinsomnandet en KLIPPKANT (uppmätt med `_somnprobe.mjs --takt`): med det
    //    svagaste verktyget (+1) klarade 12 s mellan tryck målet, men 15 s fastnade för
    //    alltid — 16 tryck på 240 s utan att ta sig förbi läge 1. Ett tryck gav +1 och
    //    tystnaden tog −1, alltså nettoframsteg noll i all oändlighet. Det är ett hinder som
    //    STOPPAR, och P0 MOTGÅNG tillåter bara att hinder saktar ner.
    this._sankKvar = this._sankVaxel ? 1 : 0
    this._sankVaxel = !this._sankVaxel
    const nu = this._niva()
    if (nu !== forr) this._satLage(ctx, nu)
    if (this._vaken >= MAX) {
      // Väntar resten av kombon i luften? Då skjuts finalen upp till sista saken landat
      // (`_komboLandade`) — annars river `_final`s `_avbrytResa()` dem mitt i flykten.
      if (this._komboKvar > 0) {
        this._finalVantar = true
        return
      }
      this._final(ctx)
      return
    }
    this._kanskeKrydda(ctx)
    // Muttret ligger EFTER sakens egen min (som håller upp till 1,5 s) och kommer bara
    // varannan gång — en gubbe som muttrar vid varje enskild höjning blir tapet.
    if (Math.random() < 0.55) ctx.later(1.7, () => this._muttra(ctx))
  },

  _sank(ctx) {
    if (!this._alive || this._vaken <= 0) return
    if (this._sankKvar <= 0) return // taket, se `_hoj`
    this._sankKvar -= 1
    const forr = this._niva()
    this._vaken = Math.max(0, this._vaken - 1)
    const nu = this._niva()
    if (nu === forr) return
    this._satLage(ctx, nu)
    // Repliken varannan gång: en röst som säger samma sak var nionde sekund blir tapet,
    // och bilden (månen som kryper upp igen) säger redan allt.
    this._somnRepliker += 1
    if (this._somnRepliker % 2 === 1) this._sag(ctx, 'Oj, han somnade om igen. Prova igen!')
  },

  /**
   * IRRITATIONEN — kärnan i skämtet. Efter varje framsteg vill han tillbaka till sömnen:
   * han muttrar, vänder sig bort, drar upp axlarna eller blundar hårdare. Det är aldrig
   * ett bakslag i tal, bara en gubbe som INTE vill vakna.
   */
  _muttra(ctx) {
    if (!this._alive || this._busy) return
    const a = this._ans
    if (!a) return
    const val = randomFrom(['bort', 'sur', 'blund', 'grym'])
    if (val === 'bort') {
      this._luta(ctx, this._sistLjudDx > 0 ? -0.7 : 0.7, 0.45)
      ctx.later(1.6, () => this._luta(ctx, 0, 0.6))
      this._sagPappa(ctx, 'mmm')
    } else if (val === 'sur') {
      a.slappMin?.()
      a.min('sur', { hall: 0.9 })
      this._sagPappa(ctx, 'surt')
    } else if (val === 'blund') {
      a.blunda({ v: true, h: true, tid: 0.18 })
      ctx.later(1.1, () => { if (this._alive) this._satOgon() })
      this._sagPappa(ctx, 'hmm')
    } else {
      a.tveka({ vinkel: 0.05, varv: 2, tid: 0.26 })
      this._sagPappa(ctx, 'huh')
    }
  },

  /**
   * SLUMPADE KRYDDOR. Taket är hårt (P0 MOTGÅNG): EN i taget, minst `KRYDD_PAUS` sekunder
   * emellan, och var och en ger som mest ett läge. Alla är dessutom HJÄLPSAMMA — de är
   * krydda, inte straff.
   */
  _kanskeKrydda(ctx) {
    if (!this._alive || this._busy) return
    if (this._kryddT > 0) return
    if (Math.random() > 0.3) return
    const val = ['drom']
    if (this._kattPa) val.push('kattprutt')
    if (this._bokKvar > 0) val.push('bok')
    if (this._regnar) val.push('aska')
    const e = randomFrom(val)
    this._kryddT = KRYDD_PAUS
    ctx.later(1.6, () => {
      if (!this._alive || this._busy) return
      if (e === 'kattprutt') return this._kattPrutt(ctx)
      if (e === 'bok') return this._hyllaTryck(ctx)
      if (e === 'aska') return this._aska(ctx)
      return this._drom(ctx)
    })
  },

  _kattPrutt(ctx) {
    const k = this._katt
    if (!k || k.view.destroyed) return
    const audio = ctx.services.audio
    k.reagera?.()
    if (!audio.sample?.('fart')) {
      audio.tone({ freq: 170, dur: 0.28, type: 'sawtooth', vol: 0.13, slideTo: 80 })
    }
    puff(ctx.fxLayer, k.view.x - 46, k.view.y + 10, { count: 10, color: 0x9ed46a })
    this._ans?.slappMin?.()
    this._ans?.min('acklad', { hall: 1.2 })
    this._sagPappa(ctx, 'blaa')
    this._hoj(ctx, 1, { x: k.view.x, y: k.view.y }, 'kattprutt')
  },

  _aska(ctx) {
    const audio = ctx.services.audio
    this._sovrum.blixt?.()
    // Ljudet EFTER ljuset — 0,35 s, precis som ett åskväder några kilometer bort.
    ctx.later(0.35, () => {
      if (!this._alive) return
      audio.sample?.('traff_hard')
      audio.tone({ freq: 62, dur: 1.3, type: 'sawtooth', vol: 0.13, slideTo: 30 })
      audio.tone({ freq: 110, dur: 0.9, type: 'square', vol: 0.06, slideTo: 44, delay: 0.1 })
      this._ans?.ryck({ styrka: 1.5 })
      this._ans?.slappMin?.()
      this._ans?.min('chock', { hall: 1.1 })
      this._sagPappa(ctx, 'gasp')
      this._sag(ctx, 'Åska! Vilket dunder!')
      this._hoj(ctx, 1, { x: PLATS.fonster.x, y: PLATS.fonster.y }, 'aska')
    })
  },

  /** Han drömmer högt och skrattar i sömnen. Ren karaktär, noll vakenhet. */
  _drom(ctx) {
    const a = this._ans
    if (!a) return
    a.slappMin?.()
    a.min('lycksalig', { hall: 1.4 })
    this._sagPappa(ctx, 'mmm')
    sparkle(ctx.fxLayer, PLATS.ansikte.x, PLATS.ansikte.y - 150, { count: 7 })
  },

  /**
   * De fem vakenlägena. ETT läge = EN andningstakt, och det är hela mätaren i ljud.
   *
   * ⚠️ `liv()` startar om andetaget varje gång — det är meningen (takten ska byta) — men
   *    varje anrop registrerar också en evig tween i riggens ringbuffert. Den rensas numera
   *    på `tw.parent`; att den faktiskt gör det mäts med `scripts/_somnprobe.mjs`.
   */
  _satLage(ctx, n, { tyst = false } = {}) {
    const a = this._ans
    if (!a) return
    a.liv(true, { takt: TAKT[Math.max(0, Math.min(TAKT.length - 1, n - 1))] })
    // ⚠️ MIN-LAGRET LIGGER ÖVERST OCH BÄR SINA EGNA ÖGON (se `ansikte.js`). En kvarhängande
    //    grimas täcker alltså de slutna ögonlocken helt: `blunda()` skriver på ett lager
    //    ingen ser, och han "sover" med vidöppna ögon och öppen mun.
    if (n <= 3) a.slappMin?.()
    this._satOgon(n)

    if (tyst) return
    if (n === 2) {
      a.tveka({ vinkel: 0.045, varv: 2, tid: 0.24 })
      this._sagPappa(ctx, 'hmm')
      this._sag(ctx, 'Titta, han rör på sig!')
    } else if (n === 3) {
      // Det öppnade ögat tittar på det som lät.
      a.blick(this._sistLjudDx || 0, 0.25)
      this._sagPappa(ctx, 'ehh')
      this._sag(ctx, 'Ett öga är öppet! Fortsätt.')
    } else if (n === 4) {
      a.slappMin?.()
      a.min('forvanad', { hall: 1.1 })
      a.nick()
      this._sagPappa(ctx, 'ehh')
    }
  },

  /**
   * ATT VÄNDA BORT HUVUDET. `lutaMot()` är byggd för att SÄTTAS varje bildruta av den som
   * drar något (se `ansikte.js`) och tweenar alltså ingenting själv — anropad rakt av snäpper
   * huvudet 14 px i sidled på en bildruta. Här går den genom en proxy-tween i stället, så
   * "usch, ta bort den där" blir en rörelse och inte ett klipp.
   */
  _luta(ctx, mal, tid = 0.4) {
    if (!this._alive || !this._ans) return
    this._lutTw?.kill()
    const st = { v: this._lutNu || 0 }
    this._lutTw = gsap.to(st, {
      v: mal,
      duration: tid,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (!this._alive || !this._ans) return
        this._lutNu = st.v
        this._ans.lutaMot(st.v)
      },
    })
  },

  /** Ögonen för ett givet läge. Egen funktion, för flera verktyg lånar ögonen tillfälligt. */
  _satOgon(n = this._niva()) {
    const a = this._ans
    if (!a) return
    if (n <= 2) a.blunda({ v: true, h: true })
    else if (n === 3) a.blunda({ v: true, h: false })
    else a.blunda({ v: false, h: false })
  },

  /** Väckarklockan: han drar filten över huvudet. Högst en gång per runda (taket). */
  _filtPaHuvudet(ctx) {
    if (!this._alive || this._busy) return
    if (this._filtAnvand || this._filtPa) return
    this._filtAnvand = true
    this._filtPa = true
    this._filtKvar = 2
    this._sovrum.filtOver?.(true)
    if (this._filtKlick) this._filtKlick.visible = true
    // Eget ljud, inte samma `soft` som kittlingen: tre olika händelser med ett enda råljud
    // läser som en bugg även när allt annat är rätt.
    ctx.services.audio.sfx('flip')
    this._sag(ctx, 'Dra av filten så han hör dig.')
  },

  _filtAv(ctx, avBarnet = false, medVerktyg = false) {
    if (!this._filtPa) return
    this._filtPa = false
    this._filtKvar = 0
    this._sovrum.filtOver?.(false)
    if (this._filtKlick) this._filtKlick.visible = false
    ctx.services.audio.sfx('whoosh')
    if (avBarnet) {
      this._idle = 0
      sparkle(ctx.fxLayer, PLATS.ansikte.x, PLATS.ansikte.y - 60, { count: 10 })
      this._sagPappa(ctx, 'oj')
      // Hade barnet saker valda drogs filten av MED dem i handen — då ska de också få
      // användas, annars kostade filten ett helt tryck. Hela kombon följer med, av samma
      // skäl som väckknappen skickar hela kombon.
      if (medVerktyg && this._valda.length && !this._busy) {
        ctx.later(0.35, () => { if (this._alive) this._anvandValda(ctx, 'ansikte') })
      }
    }
  },

  // ---------------------------------------------------------------- finalen ---

  /**
   * FINALEN — spelets egen (kvalitetsgrind 7): gäspningen. Ett LÅNGSAMT gap över 1,2 s med
   * en blink i toppen, taket 40 px käkfall (över det glider underkäkens kontur utanför
   * basens — mätt i `ansikte.js`). Solen far upp, verktygen jublar.
   *
   * ⚠️ `progress.complete()` SÄGER SJÄLV EN REPLIK. `GameHost.js` kör
   *    `voice.say(randomFrom(PRAISE))` inuti den, och `VoiceService.say()` kallar `cancel()`
   *    som första sak — spelets egen "God morgon, pappa!" hade aldrig hunnit bli hörbar om
   *    den stod före. complete() FÖRST, spelets replik efter: `_narTyst` ställer sig då i kö.
   */
  _final(ctx) {
    if (!this._alive || this._busy) return
    this._busy = true
    this._idle = 0
    this._komboKvar = 0
    this._finalVantar = false
    this._avbrytResa()
    this._luta(ctx, 0, 0.3)
    const a = this._ans
    ctx.services.audio.sfx('celebrate')

    ctx.progress.setLevel((ctx.progress.get().highestLevel || 0) + 1)
    ctx.progress.complete()
    this._sag(ctx, 'God morgon, pappa!')

    if (a) {
      a.slappMin?.()
      a.blunda({ v: false, h: false })
      a.liv(true, { takt: TAKT[4] })
      this._gaspa(ctx, () => {
        if (!this._alive) return
        a.min('nojd', { hall: 2 })
        this._sagPappa(ctx, 'aaah')
      })
    }

    // Verktygen är mottagaren (kvalitetsgrind 4): de hoppar och jublar, förskjutet så det
    // läser som en publik och inte som en enda animation.
    this._verktyg.filter((p) => p.sida === this._sida).forEach((post, i) => {
      ctx.later(0.1 * i, () => {
        if (!this._alive || post.v.view.destroyed) return
        wiggle(post.v.view)
        burst(ctx.fxLayer, post.x, post.y - 30, { count: 7, colors: PLAYFUL, power: 0.8 })
      })
    })

    ctx.later(3.6, () => {
      if (!this._alive) return
      this._sag(ctx, 'Vill du väcka honom en gång till?')
    })
    // SLUTKLÄMMEN: han dimper ner och börjar snarka igen. Det är inte ett bakslag — det är
    // skämtet spelet är byggt kring, och det är också hur nästa omgång börjar.
    ctx.later(6.4, () => {
      if (!this._alive) return
      this._vaken = 0
      this._filtAnvand = false
      this._gardinUppe = false
      this._sovrum.rullgardin?.(true)
      this._taketUpp(ctx)
      this._somnRepliker = 0
      this._upprepning = 0
      this._sistKey = null
      this._stallTillbakaBocker()
      this._wow = Math.random() < 0.125
      this._satLage(ctx, 1, { tyst: true })
      this._sagPappa(ctx, 'hmm')
      this._busy = false
    })
  },

  /** Gäspningen: långsamt upp, blink i toppen, långsamt ner. Taket är `gap(1)` = 40 px. */
  _gaspa(ctx, klar) {
    const a = this._ans
    if (!a) return
    const st = { v: 0 }
    const tl = gsap.timeline({ onComplete: () => { if (this._alive) klar?.() } })
    tl.to(st, { v: 1, duration: 0.55, ease: 'sine.inOut',
      onUpdate: () => { if (this._alive && this._ans) this._ans.gap(st.v) } })
    tl.add(() => { if (this._alive) this._ans?.blink({ hall: 0.12 }) })
    tl.to(st, { v: 0, duration: 0.65, ease: 'sine.inOut',
      onUpdate: () => { if (this._alive && this._ans) this._ans.gap(st.v) } })
    this._gaspTl = tl
    // WOW (~1 på 8): han sätter sig upp — och snarkar vidare SITTANDE.
    if (this._wow) {
      ctx.later(1.4, () => {
        if (!this._alive || !this._ans || this._ans.view.destroyed) return
        gsap.to(this._ans.view, { y: PLATS.ansikte.y - 92, duration: 0.5, ease: 'back.out(1.4)' })
        ctx.later(1.1, () => { if (this._alive) this._snarka(ctx) })
      })
    }
  },

  // ---------------------------------------------------------------- ljud & röst ---

  /** Sakens eget förhandsljud när den VÄLJS — dämpat, det är inte pappa som drabbas än. */
  _forhandsljud(ctx, key) {
    const audio = ctx.services.audio
    const ton = {
      klocka: [880, 1180], trumpet: [392, 523], ballong: [520, 660], kaffe: [330, 392],
      strumpa: [300, 220], lampa: [1046, 1318], gardin: [523, 659], spruta: [1200, 900],
      flakt: [220, 300], kittla: [660, 880], katt: [523, 659], hund: [300, 240],
    }[key] || [523, 659]
    audio.tone({ freq: ton[0], dur: 0.1, type: 'sine', vol: 0.09, slideTo: ton[1] })
  },

  /**
   * SNARKNINGEN, byggd av två toner: ett insug som stiger och ett "puh" som faller.
   * Klippnamnet läses först — finns `snark` i manifestet en dag tar spelet det direkt.
   */
  _snarka(ctx) {
    const audio = ctx.services.audio
    if (audio.harSample?.('snark') && audio.sample('snark')) return
    audio.tone({ freq: 58, dur: 0.8, type: 'sawtooth', vol: 0.09, slideTo: 84 })
    audio.tone({ freq: 150, dur: 0.55, type: 'sine', vol: 0.05, slideTo: 92, delay: 0.95 })
  },

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

  _tomtTryck(ctx, e) {
    this._idle = 0
    if (!this._alive) return
    if (e?.target && e.target !== this._root) return
    const p = e.global ? this._root.toLocal(e.global) : null
    if (!p) return
    ripple(ctx.fxLayer, p.x, p.y, { color: 0xffffff, maxR: 54 })
    ctx.services.audio.tone({ freq: 392, dur: 0.12, type: 'sine', vol: 0.1, slideTo: 494 })
  },

  _update(ctx, dtMS) {
    if (!this._alive) return
    const dt = Math.min(0.05, dtMS / 1000)
    if (!this._busy) this._idle += dt
    if (this._kryddT > 0) this._kryddT -= dt

    // Himlen är mätaren. Den följer efter mjukt, så ett hopp på två lägen läser som en
    // gryning och inte som ett klipp.
    const mal = this._vaken / MAX
    if (Math.abs(this._himmelV - mal) > 0.001) {
      this._himmelV += (mal - this._himmelV) * Math.min(1, dt * 2.2)
      this._sovrum.himmel?.(this._himmelV)
    }

    // Snarkningen ligger på andningens egen klocka, inte på ett eget schema — annars driver
    // de två isär i samma sekund takten byts.
    const niva = this._niva()
    if (!this._busy && niva <= 2) {
      const takt = TAKT[niva - 1]
      this._snarkT += dt
      if (this._snarkT >= takt * 2) {
        this._snarkT = 0
        this._snarka(ctx)
      }
    } else {
      this._snarkT = 0
    }

    if (!this._busy && this._vaken > 0) {
      if (this._pausT > 0) this._pausT -= dt
      else {
        this._aterT += dt
        if (this._aterT >= ATER) {
          this._aterT = 0
          this._sank(ctx)
        }
      }
    }

    this._syncRing()

    // BACKSTOPP för den uppskjutna finalen: blev en sak ur kombon aldrig framme (sidbyte
    // mitt i flykten) får spelet inte fastna en bildruta från gäspningen.
    if (this._finalVantar && this._komboKvar <= 0 && !this._busy) {
      this._finalVantar = false
      this._final(ctx)
      return
    }

    if (this._idle > 6.5 && !this._busy) {
      this._idle = 0
      this._cueVaxel = (this._cueVaxel + 1) % 3
      if (this._cueVaxel === 0) ctx.services.voice.replayLast?.()
      else if (this._cueVaxel === 1) this._snarka(ctx)
      else {
        // Hyllan vinkar till sig: en sak i taget guppar, aldrig hela raden på en gång.
        const pa = this._verktyg.filter((p) => p.sida === this._sida)
        const post = randomFrom(pa)
        if (post && !post.v.view.destroyed && !this._resor.has(post)) wiggle(post.v.view)
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._root?.off('pointerdown', this._vakna)
    ctx?.services?.audio?.stopLoop?.(REGN_SLINGA)
    this._gaspTl?.kill()
    this._gaspTl = null
    this._snusTw?.kill()
    this._snusTw = null
    this._lutTw?.kill()
    this._lutTw = null
    for (const post of this._verktyg || []) {
      post._resaTw?.kill()
      post._resaTw = null
    }
    this._resor?.clear()
    for (const tw of this._ringTws || []) tw?.kill()
    this._ringTws = []
    this._valda = []
    this._drag?.destroy()
    this._drag = null
    for (const f of this._fx || []) {
      f.tw?.kill()
      if (f.nod && !f.nod.destroyed) gsap.killTweensOf(f.nod)
    }
    this._fx = []
    if (this._ans && !this._ans.view.destroyed) gsap.killTweensOf(this._ans.view)
    for (const post of this._verktyg) {
      const view = post.v?.view
      if (view && !view.destroyed) {
        gsap.killTweensOf(view)
        gsap.killTweensOf(view.scale)
        gsap.killTweensOf(view.position)
      }
      post.v?.destroy?.()
    }
    this._verktyg = []
    for (const r of this._ringar || []) if (r && !r.destroyed) gsap.killTweensOf(r.scale)
    this._ringar = []
    if (this._katt?.view && !this._katt.view.destroyed) gsap.killTweensOf(this._katt.view)
    this._katt?.destroy?.()
    this._katt = null
    // Knappens tryck-tween skriver på `scale` — den måste dö FÖRE noden, annars skriver
    // gsap på en nollad transform i den bildruta spelaren lämnar mitt i ett tryck.
    if (this._vackKnapp && !this._vackKnapp.destroyed) {
      gsap.killTweensOf(this._vackKnapp.scale)
      gsap.killTweensOf(this._vackKnapp)
    }
    this._vackKnapp = null
    this._pilV = null
    this._pilH = null
    this._prickar = []
    this._sovrum?.destroy?.()
    this._sovrum = null
    this._ans?.destroy()
    this._ans = null
    this._root?.destroy({ children: true })
    this._root = null
  },
}
