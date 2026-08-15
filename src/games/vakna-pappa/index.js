// VAKNA, PAPPA! — spel 3 i ansiktssektionen (`docs/games/vakna-pappa.md`).
//
// Samma fotorigg som `mata-munnen` och `titt-ut-pappa`, men den här gången är det
// ANDNINGSTAKTEN som är spelet. `liv(true, { takt })` sattes förut en gång och ändrades
// aldrig; här ÄR den sömnmätaren: 3,4 s är djupsömn, 1,1 s är nyvaken. Barnet hör och ser
// att han närmar sig ytan innan något annat har hänt.
//
// Två riggfunktioner används här för första gången i hela appen:
//   · ETT ÖGA I TAGET — `blunda({ v: true, h: false })`, alltså ett öga som öppnas och
//     tittar på det som lät, medan det andra ligger kvar. `blinkning()` är en wink som tar
//     slut av sig själv och kan inte bära ett vaknande; `blunda()` är ett TILLSTÅND.
//   · ETT LÅNGSAMT GAP — gäspningen, 1,2 s med en blink i toppen. Allt `mata-munnen` gör
//     är snabba tuggap.
//
// ⚠️ ATT HAN SOMNAR OM ÄR INTE ETT MISSLYCKANDE — det är skämtet, och kedjan är den enda
//    "svårighet" spelet har. Taket (P0 MOTGÅNG): ett läge i taget, pausat `PAUS` sekunder
//    efter varje framsteg, filten högst en gång per runda, och aldrig under läge 1.
//
// ⚠️ `liv()` ANROPAS EN GÅNG PER LÄGESBYTE, och det var precis så `mata-munnen` läckte en
//    död tween per tugga in i riggens ringbuffert. Rättningen finns i `ansikte.js` (`_track`
//    filtrerar på `tw.parent`), men den ska MÄTAS för det här spelet också:
//    `node scripts/_frysprobe.mjs` läser spökminer, eviga tweens och om han fortfarande
//    blinkar. Se doc §5.
//
// ⚠️ DET FINNS INGEN SNARKNING I SFX-MANIFESTET. `_snarka()` bygger den procedurellt av två
//    toner (ett insug som stiger, ett "puh" som faller). Klippnamnet `snark` läses ändå
//    först — den dagen ägaren spelar in det tar spelet klippet utan en rad kod.
import { Circle, Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PLATS, byggSovrum } from './sovrum.js'
import { VERKTYG, makeKatt, makeVerktyg } from './verktyg.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { burst, kvittera, puff, ripple, sparkle, wiggle } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'
import { shuffle } from '../../lib/swedish.js'

const ANS_H = 320
const LAGEN = 5           // fem vakenlägen; `_vaken` går 0 … 4
const MAX = LAGEN - 1
const PAUS = 3            // s efter ett framsteg innan återinsomnandet ens får börja
const ATER = 9            // s per läge nedåt — långsamt, ett läge i taget
// Andningstakten per läge. Talen kommer ur `ansikte.js`s eget kommentarsspann (3,4 s mätt
// och dåsig, 1,1 s flämtande) och är hela mätaren: barnet HÖR skillnaden innan det ser den.
const TAKT = [3.4, 2.4, 1.8, 1.4, 1.1]

// Verktygens verkan i LÄGEN. Ingen av dem är fel, och ingen av dem är obligatorisk —
// `kittla` ensam tar honom hela vägen, den är bara långsammast (kvalitetsgrind 1).
const EFFEKT = { klocka: 2, katt: 1, trumpet: 1, gardin: 0, kaffe: 2, kittla: 1 }
const KLICK_R = 64        // P0: 128 px träffyta, plus 24 px osynlig halo
const KLICK_HALO = 24
const VERKTYG_AVST = 180  // ≥ 2·64 + 24 med marginal

const ROST = {
  hmm: { klipp: 'pappa_hmm', ton: [330, 296], typ: 'sine' },
  ehh: { klipp: 'pappa_ehh', ton: [300, 380], typ: 'sine' },
  aaah: { klipp: 'pappa_aaah', ton: [300, 820], typ: 'sine' },
  oj: { klipp: 'pappa_oj', ton: [520, 780], typ: 'sine' },
  fniss: { klipp: 'pappa_fniss', ton: [600, 760], typ: 'triangle' },
  aj: { klipp: 'pappa_aj', ton: [700, 430], typ: 'triangle' },
  blaa: { klipp: 'pappa_blaa', ton: [420, 190], typ: 'sawtooth' },
}

export default {
  id: 'vakna-pappa',
  titleSv: 'Vakna, pappa!',
  icon: '😴',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  voiceIntro: 'Pappa sover! Väck honom med ljuden.',

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
    this._andT = 0
    this._snarkT = 0
    this._himmelV = 0
    this._filtPa = false
    this._filtKvar = 0
    this._filtAnvand = false
    this._gardinUppe = false
    this._verktyg = []
    this._katt = null
    this._kattPa = false
    this._somnRepliker = 0
    this._pappaTill = 0
    this._wow = Math.random() < 0.125
    this._cueVaxel = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._sovrum = byggSovrum(ctx)
    this._root.addChild(this._sovrum.bak)

    // Ansiktet ligger MELLAN rummets bak- och framdel, precis som gömställena i
    // `titt-ut-pappa`: då kan filten dras över huvudet utan en enda mask.
    this._pappaL = this._nyttLager()
    this._root.addChild(this._sovrum.fram)
    this._kattL = this._nyttLager()   // katten går PÅ ansiktet, alltså ovanför filten
    this._verktygL = this._nyttLager()
    this._klickL = new Container()
    this._root.addChild(this._klickL)

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

    this._byggVerktyg(ctx)
    this._byggFiltKlick(ctx)
    // Utgångsläget måste sättas EN gång: `_update` skriver bara himlen när den rör sig, så
    // utan de här två raderna renderas rummet i sitt obestämda byggläge tills något händer.
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
  },

  _nyttLager() {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    return c
  },

  // ---------------------------------------------------------------- verktygen ---

  /**
   * Sex verktyg i rad på nattduksbordet.
   *
   * ⚠️ ORDNINGEN LOTTAS PER OMGÅNG, INTE PER RUNDA. Spec-kortet ber om att uppsättningen
   *    och ordningen roterar (variation, kvalitetsgrind 2) — men att flytta knappar under
   *    fingret på ett barn som just lärt sig var trumpeten står vore att byta bort P0
   *    NAVIGATION mot variation. Ordningen sätts därför en gång när spelet monteras och
   *    står still hela leken igenom; nästa gång barnet öppnar spelet är den en annan.
   */
  _byggVerktyg(ctx) {
    const ordning = shuffle([...VERKTYG])
    const x0 = 640 - ((ordning.length - 1) * VERKTYG_AVST) / 2
    ordning.forEach((key, i) => {
      const v = makeVerktyg(key)
      if (!v) return
      const x = x0 + i * VERKTYG_AVST
      const y = PLATS.hylla.y
      v.view.position.set(x, y)
      this._verktygL.addChild(v.view)
      v.liv?.()

      const r = Math.max(KLICK_R, v.hitR || 0)
      const klick = new Graphics().circle(0, 0, r).fill({ color: 0xffffff, alpha: 0 })
      klick.position.set(x, y)
      klick.eventMode = 'static'
      klick.cursor = 'pointer'
      klick.hitArea = new Circle(0, 0, r + KLICK_HALO)
      this._klickL.addChild(klick)

      const rec = { key, v, klick, x, y }
      klick.on('pointertap', () => this._tryckVerktyg(ctx, rec))
      this._verktyg.push(rec)
    })
  },

  // Filten över huvudet får en egen träffyta som bara finns när filten faktiskt ligger där.
  _byggFiltKlick(ctx) {
    const k = new Graphics().rect(-95, -95, 190, 190).fill({ color: 0xffffff, alpha: 0 })
    k.position.set(PLATS.ansikte.x, PLATS.ansikte.y)
    k.eventMode = 'static'
    k.cursor = 'pointer'
    k.hitArea = new Rectangle(-95 - KLICK_HALO, -95 - KLICK_HALO, 190 + KLICK_HALO * 2, 190 + KLICK_HALO * 2)
    k.visible = false
    k.on('pointertap', () => this._filtAv(ctx, true))
    this._klickL.addChild(k)
    this._filtKlick = k
  },

  _tryckVerktyg(ctx, rec) {
    this._idle = 0
    if (!this._alive) return
    // ⚠️ EN UPPTAGEN-FLAGGA FÅR ALDRIG SVÄLJA EN PEKNING TYST (P0 ÅTERKOPPLING). `_busy`
    //    står genom hela gäspningen och finalen — sekunder då barnet garanterat trycker igen.
    if (this._busy) {
      kvittera(ctx.fxLayer, rec.x, rec.y, ctx.services.audio)
      return
    }
    rec.v.tryck?.()
    ripple(ctx.fxLayer, rec.x, rec.y, { color: 0xffffff, maxR: 78 })
    // Vilket håll ljudet kom ifrån — det öppnade ögat i läge 3 tittar dit.
    this._sistLjudDx = Math.max(-1, Math.min(1, (rec.x - PLATS.ansikte.x) / 420))
    this._verkan(ctx, rec)
  },

  _verkan(ctx, rec) {
    const audio = ctx.services.audio
    const key = rec.key

    if (key === 'gardin') {
      // ⚠️ RULLGARDINEN GER NOLL LÄGEN — och är ändå spelets vassaste verktyg. Den DUBBLAR
      //    allt annat medan dagsljuset flödar in. Det är den listiga vägen som en 4-åring
      //    hittar och en 2-åring aldrig behöver.
      this._gardinUppe = !this._gardinUppe
      this._sovrum.rullgardin?.(!this._gardinUppe)
      audio.sfx('flip')
      if (this._gardinUppe) sparkle(ctx.fxLayer, PLATS.fonster.x, PLATS.fonster.y, { count: 12 })
      return
    }

    if (key === 'katt') return this._kattTur(ctx, rec)

    let e = EFFEKT[key] ?? 1
    if (key === 'klocka') {
      audio.tone({ freq: 880, dur: 0.09, type: 'square', vol: 0.16 })
      audio.tone({ freq: 1180, dur: 0.09, type: 'square', vol: 0.16, delay: 0.11 })
      audio.tone({ freq: 880, dur: 0.09, type: 'square', vol: 0.16, delay: 0.22 })
      this._hoj(ctx, e, rec)
      // …och så drar han filten över huvudet. EFTER höjningen, så det starkaste verktyget
      // alltid ger sitt framsteg först och haken kommer som en reaktion på det.
      ctx.later(0.55, () => this._filtPaHuvudet(ctx))
      return
    } else if (key === 'trumpet') {
      // En stämd fanfar, aldrig en generisk blipp (kvalitetsgrind 5): G4 → C5, en ren kvart.
      audio.tone({ freq: 392, dur: 0.16, type: 'sawtooth', vol: 0.16 })
      audio.tone({ freq: 523, dur: 0.26, type: 'sawtooth', vol: 0.16, delay: 0.17 })
      this._ans?.ryck({ styrka: 1.2 })
      puff(ctx.fxLayer, PLATS.ansikte.x, PLATS.ansikte.y - 120, { count: 9, color: 0x6b4a32 })
    } else if (key === 'kittla') {
      audio.sfx('soft')
      this._ans?.tveka({ vinkel: 0.06, varv: 3, tid: 0.16 })
      this._sagPappa(ctx, 'fniss')
    } else if (key === 'kaffe') {
      return this._kaffe(ctx, rec)
    }

    this._hoj(ctx, e, rec)
  },

  /**
   * KAFFET biter bara från läge 2 — dessförinnan sover han för djupt för att känna doften.
   * Men "biter inte" får aldrig betyda "hände ingenting" (P0 ÅTERKOPPLING): doften driver
   * synligt mot näsan, blicken följer den, och han snusar med små gap-pulser.
   */
  _kaffe(ctx, rec) {
    const a = this._ans
    ctx.services.audio.sfx('soft')
    this._doftslinga(ctx, rec)
    if (a) {
      const dx = Math.max(-1, Math.min(1, (rec.x - PLATS.ansikte.x) / 420))
      a.blick(dx, 0.5)
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
      this._sagPappa(ctx, 'hmm')
      return
    }
    this._hoj(ctx, EFFEKT.kaffe, rec)
  },

  _doftslinga(ctx, rec) {
    const nx = PLATS.ansikte.x
    const ny = this._ogonY + 40
    for (let i = 0; i < 5; i++) {
      ctx.later(i * 0.11, () => {
        if (!this._alive) return
        const t = i / 4
        puff(ctx.fxLayer, rec.x + (nx - rec.x) * t, rec.y + (ny - rec.y) * t - 20 * Math.sin(t * Math.PI),
          { count: 3, color: 0xd9c0a0 })
      })
    }
  },

  /**
   * KATTEN går på hans ansikte, och `traffar()` avgör vilken min varje tass ger. Det är
   * riggens pixelexakta silhuettmätning använd till något annat än kastad mat — samma
   * funktion, en helt annan lek.
   */
  _kattTur(ctx, rec) {
    const A = PLATS.ansikte
    if (!this._katt) {
      const k = makeKatt()
      if (!k) return
      k.view.position.set(rec.x, rec.y - 40)
      this._kattL.addChild(k.view)
      this._katt = k
      k.liv?.()
    }
    const katt = this._katt
    ctx.services.audio.sample?.('djur_katt') || ctx.services.audio.tone({ freq: 523, dur: 0.22, type: 'sine', vol: 0.18, slideTo: 659 })
    katt.jama?.()

    if (this._kattPa) {
      // Den står redan på honom: ett tryck till är en klapp, och den ger sitt eget läge.
      katt.reagera?.()
      this._minForZon(ctx, katt.view.x, katt.view.y + 26)
      this._hoj(ctx, EFFEKT.katt, rec)
      return
    }

    this._kattPa = true
    const vag = [
      { x: A.x - 96, y: A.y - 26 },
      { x: A.x, y: A.y - 58 },
      { x: A.x + 96, y: A.y - 26 },
    ]
    const steg = (i) => {
      if (!this._alive || !this._katt) return
      if (i >= vag.length) {
        this._hoj(ctx, EFFEKT.katt, rec)
        return
      }
      const p = vag[i]
      this._katt.gaTill?.(p.x, p.y, () => {
        if (!this._alive) return
        this._minForZon(ctx, p.x, p.y + 26)
        ctx.later(0.45, () => steg(i + 1))
      })
    }
    steg(0)
  },

  /** Vilken min tassen framkallar, avgjort av VAR på ansiktet den landade. */
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

  // ---------------------------------------------------------------- sömnen ---

  _niva() { return Math.min(LAGEN, Math.floor(this._vaken) + 1) },

  _hoj(ctx, e, rec) {
    if (!this._alive) return
    let n = e
    if (this._gardinUppe) n *= 2
    if (this._filtPa) {
      // Filten dämpar — men den är ETT tryck bort och narratorn säger var. Motgången saktar
      // ner, den stoppar aldrig (P0), och efter två dämpade ljud glider den av själv.
      n = Math.floor(n / 2)
      this._filtKvar -= 1
      if (this._filtKvar <= 0) this._filtAv(ctx)
    }
    if (n <= 0) {
      if (rec) puff(ctx.fxLayer, rec.x, rec.y - 40, { count: 5, color: 0xffffff })
      return
    }
    const forr = this._niva()
    this._vaken = Math.min(MAX, this._vaken + n)
    this._pausT = PAUS
    this._aterT = 0
    // ⚠️ HÖGST ETT LÄGE FÅR TAPPAS PER TRYCK, OCH BARA VARANNAN GÅNG. Utan den regeln har
    //    återinsomnandet en KLIPPKANT som mättes upp med `_somnprobe.mjs --takt`: med det
    //    svagaste verktyget (+1) klarade 12 s mellan tryck målet, men 15 s fastnade för
    //    alltid — 16 tryck på 240 s utan att ta sig förbi läge 1. Ett tryck gav +1 och
    //    tystnaden tog −1, alltså nettoframsteg noll i all oändlighet. Det är ett hinder som
    //    STOPPAR, och P0 MOTGÅNG tillåter bara att hinder saktar ner.
    //    Att bara höja `ATER` flyttar kanten, den tar inte bort den: så länge förlusten per
    //    trycklucka kan bli lika stor som vinsten finns det alltid en långsam takt som står
    //    still. Med förlusten takad till ett läge varannan gång blir nettot minst +0,5 per
    //    tryck OAVSETT hur långsamt barnet trycker — och skämtet är kvar: han somnar om,
    //    bara inte två gånger på samma tryck.
    this._sankKvar = this._sankVaxel ? 1 : 0
    this._sankVaxel = !this._sankVaxel
    const nu = this._niva()
    if (nu !== forr) this._satLage(ctx, nu)
    if (this._vaken >= MAX) this._final(ctx)
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
   * De fem vakenlägena. ETT läge = EN andningstakt, och det är hela mätaren i ljud.
   *
   * ⚠️ `liv()` startar om andetaget varje gång — det är meningen (takten ska byta) — men
   *    varje anrop registrerar också en evig tween i riggens ringbuffert. Den rensas numera
   *    på `tw.parent`; att den faktiskt gör det mäts med `scripts/_frysprobe.mjs`.
   */
  _satLage(ctx, n, { tyst = false } = {}) {
    const a = this._ans
    if (!a) return
    a.liv(true, { takt: TAKT[Math.max(0, Math.min(TAKT.length - 1, n - 1))] })
    // ⚠️ MIN-LAGRET LIGGER ÖVERST OCH BÄR SINA EGNA ÖGON (se `ansikte.js`). En kvarhängande
    //    grimas täcker alltså de slutna ögonlocken helt: `blunda()` skriver på ett lager
    //    ingen ser, och han "sover" med vidöppna ögon och öppen mun. Uppmätt i bild av
    //    `_somnprobe.mjs` — läge 1 visade `forvanad` i stället för djupsömn. Att somna om
    //    måste därför SLÄPPA minen först, annars är sovlägena inte deterministiska.
    if (n <= 3) a.slappMin?.()
    if (n <= 2) a.blunda({ v: true, h: true })
    else if (n === 3) a.blunda({ v: true, h: false })
    else a.blunda({ v: false, h: false })

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

  /** Väckarklockan: han drar filten över huvudet. Högst en gång per runda (taket). */
  _filtPaHuvudet(ctx) {
    if (!this._alive || this._busy) return
    if (this._filtAnvand || this._filtPa) return
    this._filtAnvand = true
    this._filtPa = true
    this._filtKvar = 2
    this._sovrum.filtOver?.(true)
    if (this._filtKlick) this._filtKlick.visible = true
    // Eget ljud, inte samma `soft` som kittlingen och kaffet: tre olika händelser med ett
    // enda råljud läser som en bugg även när allt annat är rätt. `flip` är tygets smäll upp,
    // `whoosh` är svischen när den dras av igen.
    ctx.services.audio.sfx('flip')
    this._sag(ctx, 'Dra av filten så han hör dig.')
  },

  _filtAv(ctx, avBarnet = false) {
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
    }
  },

  // ---------------------------------------------------------------- finalen ---

  /**
   * FINALEN — spelets egen (kvalitetsgrind 7): gäspningen. Ett LÅNGSAMT gap över 1,2 s med
   * en blink i toppen, taket 40 px käkfall (över det glider underkäkens kontur utanför
   * basens — mätt i `ansikte.js`). Solen far upp, verktygen jublar.
   *
   * ⚠️ `progress.complete()` SÄGER SJÄLV EN REPLIK. `GameHost.js:29–37` kör
   *    `voice.say(randomFrom(PRAISE))` inuti den, och `VoiceService.say()` kallar `cancel()`
   *    som första sak — spelets egen "God morgon, pappa!" hade aldrig hunnit bli hörbar om
   *    den stod före. complete() FÖRST, spelets replik efter: `_narTyst` ställer sig då i kö.
   */
  _final(ctx) {
    if (!this._alive || this._busy) return
    this._busy = true
    this._idle = 0
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
    this._verktyg.forEach((rec, i) => {
      ctx.later(0.1 * i, () => {
        if (!this._alive || rec.v.view.destroyed) return
        wiggle(rec.v.view)
        burst(ctx.fxLayer, rec.x, rec.y - 30, { count: 7, colors: PLAYFUL, power: 0.8 })
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
      this._somnRepliker = 0
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

    if (this._idle > 6.5 && !this._busy) {
      this._idle = 0
      this._cueVaxel = (this._cueVaxel + 1) % 2
      if (this._cueVaxel === 0) ctx.services.voice.replayLast?.()
      else this._snarka(ctx)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._root?.off('pointerdown', this._vakna)
    this._gaspTl?.kill()
    this._gaspTl = null
    this._snusTw?.kill()
    this._snusTw = null
    if (this._ans && !this._ans.view.destroyed) gsap.killTweensOf(this._ans.view)
    for (const rec of this._verktyg) {
      if (rec.v?.view && !rec.v.view.destroyed) gsap.killTweensOf(rec.v.view)
      rec.v?.destroy?.()
    }
    this._verktyg = []
    if (this._katt?.view && !this._katt.view.destroyed) gsap.killTweensOf(this._katt.view)
    this._katt?.destroy?.()
    this._katt = null
    this._sovrum?.destroy?.()
    this._sovrum = null
    this._ans?.destroy()
    this._ans = null
    this._root?.destroy({ children: true })
    this._root = null
  },
}
