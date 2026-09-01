// Unika Knytt — barnet fyller en glaskupa med en liten värld, drar i spaken, knådar degen,
// knackar fram ägget, och ur ägget strömmar VÄRLDEN ut och ett unikt knytt föds i den.
//
// Fasmaskin: 'bygga' → 'ceremoni' → 'klacka' → 'avtack' → 'bygga'.
// Exakt en träffyte-regim är levande åt gången, så ingen korsregim-överlappning kan uppstå.
//
// Modulen är en SINGLETON — this överlever mellan omgångar. Varje räknare, array, nodhandtag
// och flagga nollställs därför överst i init().
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import gsap from 'gsap'
import { createScene } from '../../lib/scene.js'
import { COLORS } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { verticalFill, groundFill, topLightFill } from '../../lib/form.js'
import { squash, landa, puff, sparkle, ripple, kvittera, stadFx } from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { log as diag } from '../../lib/gamelog.js'
import { byggKupa, byggVerktyg, byggSpak } from './kupan.js'
import { byggCeremoni } from './ceremoni.js'
import { byggKnytt } from './knytt.js'
import { dnaFromSeed, slumpFro, mulberry32, STORLEKAR, MONSTER, FARGER, VARLDAR } from './dna.js'

// Verkstadens egen värld. createScene tar ett eget tema-objekt lika gärna som en nyckel —
// och det behövs: temanycklarna är sky·meadow·sunset·candy·water·night·warm, och 'warm' bär
// gräs. Ett okänt NAMN faller dessutom tyst tillbaka på blå himmel.
const VERKSTAD = {
  top: 0xfbe6c6,
  bottom: 0xf1d2ab,
  ground: 0xb9835a,
  groundDark: 0x8a5c3c,
  bokeh: 12,
  gras: false,
}

// Layouten i designkoordinater. P0-avstånden är räknade mot varandra OCH mot skalets
// hem (70,64) och högtalare (1210,64) — flyttas något här måste de räknas om.
const T_LAGE = {
  farg: { x: 300, y: 250, w: 168 },
  gnista: { x: 950, y: 250, w: 168 },
  storlek: { x: 300, y: 450, w: 168 },
  monster: { x: 950, y: 450, w: 168 },
  varld: { x: 480, y: 630, w: 144 },
}
const KUPA_X = 640
const KUPA_Y = 330
const SPAK_X = 1160
const SPAK_Y = 350
const AGG_X = 640
const AGG_Y = 470
// Hyllan i verkstan: de tre senaste knytten. 96 px träffytor, 120 px isär → 24 px lucka,
// och 30 px kvar till vädervevens vänsterkant (408).
const BO_X = [90, 210, 330]
const BO_Y = 620
const HYLLA_MAX = 3

const HINT_S = 7
const KNACK_SPARR = 0.18
const AGG_KNACK = 4

export default {
  id: 'unika-knytt',
  titleSv: 'Unika Knytt',
  icon: '🥚',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'unika-knytt',
  voiceIntro: 'Här bygger vi en liten värld åt ett nytt knytt!',

  init(ctx) {
    // --- fältnollställning (singleton) ---
    this._alive = true
    this._fas = 'bygga'
    this._val = { f: 0, z: 1, m: 0, v: 0, g: 0, r: 0 }
    this._dna = null
    this._fro = 0
    this._verktyg = {}
    this._kupa = null
    this._spak = null
    this._cer = null
    this._bobo = null
    this._boboWrap = null
    this._knytt = null
    this._knyttNod = null
    this._hyllData = []
    this._bon = []
    this._aggYta = null
    this._hand = null
    this._fangare = null
    this._rot = null
    this._scen = null
    this._rum = null
    this._spelLager = null
    this._knackar = 0
    this._senasteKnack = 0
    this._spakTryck = 0
    this._sistAktiv = 0
    this._hintSteg = 0
    this._valGjorda = 0
    this._pekare = null
    this._pekPunkt = { x: 0, y: 0 }
    this._pekGlobal = { x: 0, y: 0 }
    this._knyttPunkt = { x: 0, y: 0 }
    this._knyttYta = null
    this._tick = null
    this._losa = []
    this._monterad = 0
    this._sisteSpak = 0
    this._klar = false

    this._rot = new Container()
    ctx.stage.addChild(this._rot)

    // Grundscenen byggs SYNKRONT före varje await — tom-scen-vakten startar 1000 ms efter mount.
    this._scen = createScene(VERKSTAD, { groundH: 150 })
    this._rot.addChild(this._scen)

    // Heltäckande fångare underst. En bar Container utan hitArea träfftestar alltid falskt,
    // så den måste ha faktisk geometri.
    this._fangare = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, ctx.height + 2 * BLEED_Y)
      .fill({ color: COLORS.brown, alpha: 0.001 })
    this._fangare.eventMode = 'static'
    this._fangare.on('pointertap', (e) => this._tomtTryck(ctx, e))
    // Fingret matar TRE moduler genom `_uppdatera`: kupans blobb följer det med blicken,
    // knyttet räknar fingerrörelse som liv (och somnar utan den), ceremonin räknar om
    // koordinaten åt knyttet den håller. Utan den här raden står `this._pekare` kvar på
    // null och alla tre får aldrig veta något — hela vägen fanns byggd men omatad.
    this._fangare.on('globalpointermove', (e) => this._flyttaPekare(e))
    this._rot.addChild(this._fangare)

    this._rum = this._byggRum(ctx)
    this._rot.addChild(this._rum)

    this._spelLager = new Container()
    this._rot.addChild(this._spelLager)

    this._laddaSparat(ctx)
    this._byggHylla(ctx)
    this._byggKupa(ctx)
    this._byggVerktyg(ctx)
    this._byggSpak(ctx)
    this._byggBobo(ctx)
    this._byggAggYta(ctx)
    this._byggHand()

    this._tick = (t) => this._uppdatera(ctx, t)
    ctx.ticker.add(this._tick, this)
  },

  mount(ctx) {
    this._monterad = performance.now()
    this._sistAktiv = this._monterad
    ctx.services.voice.say(this.voiceIntro)
    diag('takt', 'mount', { hylla: this._hyllData.length })
  },

  // ---------------------------------------------------------------- rummet

  _byggRum(ctx) {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    const w = ctx.width
    const h = ctx.height

    // Väggen bakom bänken, i en egen ton så inte hela duken blir en kvantiserad yta.
    const vagg = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, w + 2 * BLEED_X, 470 + BLEED_Y)
      .fill(verticalFill(0xf6dcb6, 0xe8c496))
    c.addChild(vagg)

    // Panelbräder på väggen — fyra toner totalt i rummet håller heltackande-falt borta.
    const panel = new Graphics()
    for (let i = -2; i < 12; i++) {
      const x = -BLEED_X + i * 132
      panel.rect(x, 300, 118, 172).fill({ color: i % 2 ? 0xe6c49a : 0xdfb98c, alpha: 1 })
    }
    c.addChild(panel)

    // Bänkskivan
    const bank = new Graphics()
      .roundRect(-BLEED_X, 470, w + 2 * BLEED_X, 46, 10)
      .fill(topLightFill(0xa9743f, { highlight: 0.26, dark: 0.24 }))
    c.addChild(bank)

    const golv = new Graphics()
      .rect(-BLEED_X, 516, w + 2 * BLEED_X, h + 2 * BLEED_Y)
      .fill(groundFill(0x8d5c38, { light: 0.12, dark: 0.24 }))
    c.addChild(golv)

    return c
  },

  _byggHand() {
    // Ritat handpiktogram — samma symbol över spaken och över ägget, så den är inlärd
    // redan andra gången barnet ser den.
    const g = new Graphics()
    g.ellipse(0, 6, 17, 21).fill(0xffe0bd)
    g.roundRect(-5, -26, 11, 26, 5).fill(0xffe0bd)
    g.roundRect(-17, -16, 10, 20, 5).fill(0xffe0bd)
    g.roundRect(7, -18, 10, 22, 5).fill(0xffe0bd)
    g.roundRect(-24, 2, 12, 9, 4).fill(0xffe0bd)
    g.ellipse(0, 6, 17, 21).stroke({ width: 3, color: 0xb98a5f, alpha: 0.5 })
    this._hand = new Container()
    this._hand.addChild(g)
    this._hand.visible = false
    this._hand.eventMode = 'none'
    this._rot.addChild(this._hand)
  },

  // ---------------------------------------------------------------- delarna

  _byggKupa(ctx) {
    this._kupa = byggKupa({
      senare: (s, fn) => ctx.later(s, fn),
      audio: ctx.services.audio,
      pa: (h, d) => this._kupaHandelse(ctx, h, d),
    })
    this._kupa.view.position.set(KUPA_X, KUPA_Y)
    this._spelLager.addChild(this._kupa.view)
    this._kupa.setVal(this._val)
  },

  _byggVerktyg(ctx) {
    for (const axel of Object.keys(T_LAGE)) {
      const p = T_LAGE[axel]
      const v = byggVerktyg(axel, {
        senare: (s, fn) => ctx.later(s, fn),
        audio: ctx.services.audio,
        bredd: p.w,
        pa: (h, d) => this._verktygTryck(ctx, axel, d),
      })
      v.view.position.set(p.x, p.y)
      this._spelLager.addChild(v.view)
      this._verktyg[axel] = v
    }
    // Verktyget bär sin egen stegräknare och rapporterar den. Synka den mot receptet en
    // gång här, så att de två aldrig kan glida isär.
    this._synkaVerktyg()
  },

  _synkaVerktyg() {
    this._verktyg.farg?.satSteg(this._val.f)
    this._verktyg.gnista?.satSteg(this._val.g)
    this._verktyg.storlek?.satSteg(this._val.z)
    this._verktyg.monster?.satSteg(this._val.m)
    this._verktyg.varld?.satSteg(this._val.v)
  },

  _byggSpak(ctx) {
    this._spak = byggSpak({
      senare: (s, fn) => ctx.later(s, fn),
      audio: ctx.services.audio,
      pa: () => this._spakTryckt(ctx),
    })
    this._spak.view.position.set(SPAK_X, SPAK_Y)
    this._spelLager.addChild(this._spak.view)
  },

  _byggBobo(ctx) {
    // Riggen äger view.scale och view.y — allt spelet animerar går på en YTTRE container.
    this._boboWrap = new Container()
    this._boboWrap.position.set(1120, 572)
    this._bobo = makeKaraktar({ r: 48 })
    this._boboWrap.addChild(this._bobo.view)
    this._spelLager.addChild(this._boboWrap)
    this._bobo.setMood('nyfiken')
    this._bobo.idle()
  },

  // Kupans träffyta är en cirkel med r=190 kring (640,330) — den ligger rakt över knyttets
  // huvud under avtäckningen. Utanför byggfasen stängs den av helt, annars blir figurens
  // huvud en död yta.
  _kupaAktiv(pa) {
    const v = this._kupa?.view
    if (!v || v.destroyed) return
    v.eventMode = pa ? 'static' : 'none'
    v.interactiveChildren = !!pa
  },

  _byggAggYta(ctx) {
    // Äggets träffyta är SPELETS egen, inte ceremonins — ceremonin vaggar och studsar sitt
    // ägg, och en hitArea på en animerad nod flyttar undan sig själv.
    const y = new Graphics().circle(0, 0, 120).fill({ color: COLORS.cream, alpha: 0.001 })
    y.position.set(AGG_X, AGG_Y)
    y.eventMode = 'static'
    y.hitArea = new Circle(0, 0, 120)
    y.visible = false
    y.on('pointertap', () => this._aggTryck(ctx))
    this._rot.addChild(y)
    this._aggYta = y
  },

  // ---------------------------------------------------------------- hyllan

  _laddaSparat(ctx) {
    const rå = ctx.progress.get()?.custom?.knytt
    const lista = Array.isArray(rå?.lista) ? rå.lista : []
    const rent = []
    for (const post of lista) {
      const p = this._rensaPost(post)
      if (p) rent.push(p)
    }
    this._hyllData = rent.slice(-HYLLA_MAX)
  },

  // Fältvis sanering: progress.get() ger en LEVANDE referens och setCustom sparar utan kopia,
  // så allt som läses kopieras och allt som är trasigt kastas.
  _rensaPost(post) {
    if (!Array.isArray(post) || post.length !== 8) return null
    for (const n of post) if (!Number.isFinite(n)) return null
    const tak = [0, FARGER.length, STORLEKAR.length, MONSTER.length, VARLDAR.length, 5, 4, 4]
    const ut = [post[0] >>> 0]
    for (let i = 1; i < 8; i++) {
      const t = tak[i]
      ut.push(((Math.trunc(post[i]) % t) + t) % t)
    }
    return ut
  },

  _sparaKnytt(ctx) {
    const p = [
      this._fro >>> 0,
      this._val.f,
      this._val.z,
      this._val.m,
      this._val.v,
      this._val.r,
      this._val.g,
      0,
    ]
    const lista = this._hyllData.map((x) => x.slice())
    lista.push(p)
    this._hyllData = lista.slice(-HYLLA_MAX)
    ctx.progress.setCustom('knytt', { v: 1, lista: this._hyllData.map((x) => x.slice()) })
  },

  _byggHylla(ctx) {
    // Tre bon på bänkens vänstra del. Ett bo utan knytt står tomt och tyst — inga låsta
    // siluetter, ingen räknare, ingenting som visar vad barnet INTE har.
    for (let i = 0; i < HYLLA_MAX; i++) {
      const bo = new Container()
      bo.position.set(BO_X[i], BO_Y)
      const skal = new Graphics()
      for (let s = 0; s < 14; s++) {
        const a = (s / 14) * Math.PI * 2
        skal
          .ellipse(Math.cos(a) * 40, 6 + Math.sin(a) * 12, 13, 7)
          .fill({ color: s % 2 ? 0xc9a15e : 0xb98d4c, alpha: 0.95 })
      }
      skal.ellipse(0, 10, 42, 15).fill(0xa87d40)
      const inner = new Container()
      inner.addChild(skal)
      bo.addChild(inner)
      bo.eventMode = 'static'
      bo.hitArea = new Rectangle(-48, -48, 96, 96)
      bo.on('pointertap', () => this._boTryck(ctx, i))
      this._spelLager.addChild(bo)
      this._bon.push({ nod: bo, inner, knytt: null })
    }
    this._ritaHylla(ctx)
  },

  _ritaHylla(ctx) {
    for (let i = 0; i < this._bon.length; i++) {
      const b = this._bon[i]
      if (b.knytt) {
        stadFx(b.knytt.view)
        b.knytt.destroy()
        b.knytt = null
      }
      const data = this._hyllData[i]
      if (!data) continue
      const dna = dnaFromSeed(data[0], { f: data[1], z: data[2], m: data[3], v: data[4], g: data[6] })
      const k = byggKnytt(dna, {
        r: 40,
        senare: (s, fn) => ctx.later(s, fn),
        audio: ctx.services.audio,
      })
      // Knyttet är HÖGRE och BREDARE än boet, med silhuetten väl över kanten — en fågel i
      // ett bo, aldrig ett föremål i en låda.
      k.view.position.set(0, 4)
      b.inner.addChild(k.view)
      b.knytt = k
    }
  },

  // ---------------------------------------------------------------- input

  // Skrivs i _rot:s koordinater — samma rum som kupan, ceremonin och knyttet räknar i.
  // Punkten återanvänds så bildrutan inte allokerar.
  _flyttaPekare(e) {
    if (!this._alive || !e?.global) return
    const r = this._rot
    if (!r || r.destroyed) return
    this._pekGlobal.x = e.global.x
    this._pekGlobal.y = e.global.y
    this._pekare = r.toLocal(e.global, undefined, this._pekPunkt)
  },

  // Knyttet läser pekaren i sin FÖRÄLDERS rymd — `_blicka` gör `toLocal(p, view.parent)`.
  // Ceremonin räknar redan om åt sitt håll (`pekare − knyttHall`), men efter `_tillBanken`
  // bor knyttet i `bar` på (800,470): en rå designkoordinat skulle peka 800/470 px fel och
  // låsa blicken i ett hörn i stället för att följa fingret.
  _knyttPekare() {
    const par = this._knytt?.view?.parent
    if (!this._pekare || !par || par.destroyed) return null
    return par.toLocal(this._pekGlobal, undefined, this._knyttPunkt)
  },

  _tomtTryck(ctx, e) {
    this._vakna()
    const p = e?.global ? this._rot.toLocal(e.global) : { x: 640, y: 360 }
    kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio)
    ctx.services.audio.sfx('soft')
    if (this._fas === 'ceremoni') this._skynda(ctx, p)
  },

  // Verktyget äger stegningen (inklusive den roliga överfyllningen: burken vänder sig upp
  // och ner, bälgen tömmer sig med en lång pfffff) och rapporterar resultatet. Här läses
  // det bara av — två räknare för samma axel vore två sanningar.
  _verktygTryck(ctx, axel, d) {
    if (this._fas !== 'bygga') return
    this._vakna()
    const a = ctx.services.audio
    const steg = Number.isFinite(d?.steg) ? d.steg : 0
    if (axel === 'farg') this._val.f = steg % FARGER.length
    else if (axel === 'varld') this._val.v = steg % VARLDAR.length
    else if (axel === 'monster') this._val.m = steg % MONSTER.length
    else if (axel === 'gnista') this._val.g = steg % 4
    else if (axel === 'storlek') this._val.z = steg % STORLEKAR.length
    this._valGjorda++
    this._kupa?.setVal(this._val)
    this._kupa?.laggIn(axel)
    this._bobo?.look(this._boboWrap.toLocal({ x: T_LAGE[axel].x, y: T_LAGE[axel].y }).x, 0)
    a.sfx('tap')
    diag('takt', 'verktyg', { axel, n: this._valGjorda })
  },

  _kupaHandelse(ctx, h) {
    if (h === 'glas') {
      this._vakna()
      if (this._fas !== 'bygga') return
      // Kupan är skärmens största, ljusaste föremål — den får inte vara det enda utan verkan.
      // Trycket rullar om fröet, synligt och komiskt.
      this._fro = slumpFro(mulberry32((Math.random() * 0xffffffff) >>> 0))
      ctx.services.audio.sfx('pop')
      sparkle(ctx.fxLayer, KUPA_X, KUPA_Y)
    }
  },

  _boTryck(ctx, i) {
    this._vakna()
    const b = this._bon[i]
    if (!b?.knytt) {
      kvittera(ctx.fxLayer, BO_X[i], BO_Y, ctx.services.audio)
      return
    }
    b.knytt.glad()
    puff(ctx.fxLayer, BO_X[i], BO_Y - 30, { count: 5, color: 0xfff0c4 })
  },

  _spakTryckt(ctx) {
    this._vakna()
    if (this._fas === 'ceremoni') {
      // Andra spaktrycket slår maskinen i botten och hoppar direkt till äggfallet.
      // Utfallet är redan rullat, så ingenting står på spel.
      this._cer?.hoppaTillFall()
      ctx.services.audio.sfx('whoosh')
      return
    }
    // `byggSpak.onTap` har INGEN egen återkoppling — allt ljud och all rörelse ligger i
    // `dra()`. Spakens träffyta står däremot kvar `static` i varje fas, så varje gren som
    // bara `return`:ar gör den till en tyst, verkningslös träffyta (P0 dod-traffyta).
    if (this._fas === 'avtack') {
      // Och just här SÄGER spelet högt "Tryck på spaken igen så gör vi ett nytt knytt!" —
      // då måste spaken också göra det.
      const yta = this._knyttYta
      if (yta && !yta.destroyed) {
        this._hemTillBoet(ctx, yta)
        return
      }
      // ...men bara när knyttet FÖRESTÅR på bänken. Fas 'avtack' börjar redan vid
      // kläckningen, och fram till `_tillBanken` (2,6 s efter 'klar') är knyttet varken
      // sparat eller framme: att nollställa där kastar bort det barnet just gjort.
      // Världen strömmar dessutom fortfarande ut — finalen ska inte gå att avbryta.
      kvittera(ctx.fxLayer, SPAK_X, SPAK_Y - 60, ctx.services.audio)
      return
    }
    if (this._fas === 'klacka') {
      // Ägget är uppgiften — spaken gör ingenting nu, men den kvitterar och pekar tillbaka.
      kvittera(ctx.fxLayer, SPAK_X, SPAK_Y - 60, ctx.services.audio)
      this._visaHand(AGG_X, AGG_Y - 96)
      return
    }
    if (this._fas !== 'bygga') return
    this._startaCeremoni(ctx)
  },

  _aggTryck(ctx) {
    if (this._fas !== 'klacka') return
    this._vakna()
    const nu = performance.now()
    const a = ctx.services.audio
    // En spärr håller takten — men ett oräknat tryck är ALDRIG tyst. Skillnaden mellan takt
    // och P0-brottet dod-traffyta ligger exakt här.
    if (nu - this._senasteKnack < KNACK_SPARR * 1000) {
      this._cer?.knacka(true)
      a.sfx('tap')
      return
    }
    this._senasteKnack = nu
    this._knackar++
    this._doljHand()
    if (this._knackar >= AGG_KNACK) {
      this._cer?.knacka(false, true)
    } else {
      this._cer?.knacka(false, false)
      if (this._knackar === 2) this._sag(ctx, 'Knacka en gång till på ägget!', 'klacka')
    }
  },

  // ---------------------------------------------------------------- ceremonin

  _startaCeremoni(ctx) {
    const nu = performance.now()
    // Uppehållsmätningen: tiden barnet DRÖJER i verkstan avgör om Skrället byggs (§4b).
    diag('takt', 'spak', {
      ms: Math.round(nu - (this._sisteSpak || this._monterad)),
      forsta: this._spakTryck === 0,
      val: this._valGjorda,
    })
    this._sisteSpak = nu
    this._spakTryck++
    this._fas = 'ceremoni'
    this._knackar = 0
    this._doljHand()

    // Fröet rullas HÄR, före en enda bildruta av ceremonin. Den är en avtäckning, inte en snurr.
    if (!this._fro) this._fro = slumpFro(mulberry32((Math.random() * 0xffffffff) >>> 0))
    this._val.r = this._fro % 5
    this._dna = dnaFromSeed(this._fro, this._val)

    for (const v of Object.values(this._verktyg)) v.satLast(true)
    this._kupaAktiv(false)
    this._spak.dra()
    this._bobo?.setMood('forvanad')

    this._cer = byggCeremoni({
      senare: (s, fn) => ctx.later(s, fn),
      audio: ctx.services.audio,
      fxLayer: ctx.fxLayer,
      pa: (h, d) => this._cerHandelse(ctx, h, d),
    })
    this._spelLager.addChild(this._cer.view)
    this._cer.start(this._dna, this._val)
    this._kupa?.tomma()
  },

  _cerHandelse(ctx, h, d) {
    if (!this._alive) return
    if (h === 'deg') {
      this._sag(ctx, 'Nu blandas allt ihop till en mjuk deg!')
      ctx.later(1.1, () => this._sag(ctx, 'Knåda degen med fingret så lyser den mer!'))
    } else if (h === 'harda') {
      this._sag(ctx, 'Titta så ägget lyser och växer!')
    } else if (h === 'pop') {
      this._sag(ctx, 'Poff! Nu ramlar ägget ner.')
    } else if (h === 'agg') {
      this._fas = 'klacka'
      this._aggYta.visible = true
      this._sag(ctx, 'Ett ägg! Knacka på det!')
      ctx.later(1.2, () => this._visaHand(AGG_X, AGG_Y - 96))
      this._bobo?.setMood('nyfiken')
    } else if (h === 'klack') {
      this._fas = 'avtack'
      this._aggYta.visible = false
      this._doljHand()
      this._sag(ctx, 'Titta, hela världen kommer ut!')
    } else if (h === 'varld') {
      this._bobo?.react('jubel')
      ctx.later(0.9, () => this._bobo?.setMood('stolt'))
    } else if (h === 'klar') {
      this._fardigt(ctx, d)
    }
  },

  _skynda(ctx, p) {
    // Varje tryck kortar tidslinjen 0,12 s (tak 1,2 s) OCH knådar degen. Barnets petande är
    // både en leksak och ett riktigt handtag på takten.
    this._cer?.skynda()
    if (p) this._cer?.knada(p.x, p.y)
  },

  _fardigt(ctx, d) {
    if (this._klar) return
    this._klar = true
    this._knytt = d?.knytt || null
    this._sparaKnytt(ctx)
    // complete() spelar själv firande + en slumpad berömreplik. Spelets egen rad ställer sig
    // i kö BAKOM den i stället för att köras över av den.
    ctx.progress.complete()
    this._sag(ctx, 'Vilket fint knytt du gjorde!')
    if (this._dna?.namn) ctx.later(1.4, () => this._sagNamn(ctx))
    ctx.later(2.6, () => this._tillBanken(ctx))
  },

  // Namnet fångas i en LOKAL innan _narTyst skjuter upp callbacken — _aterstall() hinner
  // annars sätta this._dna = null emellan, och vakten ovanför gäller fel ögonblick.
  _sagNamn(ctx) {
    if (!this._alive) return
    const namn = this._dna?.namn
    if (!namn) return
    this._narTyst(ctx, () => {
      if (!this._alive) return
      ctx.services.voice.say(namn)
    })
  },

  _tillBanken(ctx) {
    if (!this._alive || !this._knytt) return
    // Loopen stängs I VERKSTAN. Ceremonin slutar aldrig med att barnet flyttas till en annan
    // skärm — knyttet klättrar upp på bänken och barnet skickar hem det med ett tryck.
    const k = this._knytt
    const nod = k.view
    if (nod.destroyed) return
    const bar = new Container()
    bar.position.set(nod.parent ? nod.parent.x + nod.x : 640, nod.parent ? nod.parent.y + nod.y : 470)
    this._spelLager.addChild(bar)
    bar.addChild(nod)
    nod.position.set(0, 0)
    this._knyttNod = bar

    gsap.to(bar, {
      x: 800,
      y: 470,
      duration: 0.9,
      ease: 'power2.inOut',
      onComplete: () => {
        if (!this._alive || bar.destroyed) return
        landa(nod)
        k.hoppa(2)
      },
    })

    // Träffytan ligger på en EGEN nod som aldrig animeras — knyttet guppar och skuttar i barnet.
    const yta = new Graphics().circle(0, 0, 62).fill({ color: COLORS.cream, alpha: 0.001 })
    yta.position.set(800, 432)
    yta.eventMode = 'static'
    yta.hitArea = new Circle(0, 0, 62)
    yta.on('pointertap', () => this._hemTillBoet(ctx, yta))
    this._rot.addChild(yta)
    this._losa.push(yta)
    this._knyttYta = yta
    ctx.later(1.6, () => this._sag(ctx, 'Tryck på spaken igen så gör vi ett nytt knytt!'))
  },

  _hemTillBoet(ctx, yta) {
    if (!this._alive || !this._knyttYta) return
    // Nollas FÖRST: knyttets egen träffyta och spaken pekar båda hit, och ett andra anrop
    // skulle starta om flygturen mitt i den första.
    this._knyttYta = null
    yta.eventMode = 'none'
    const k = this._knytt
    ctx.services.audio.sfx('whoosh')
    if (k && !k.view.destroyed) k.glad()
    const bar = this._knyttNod
    // Boets index räknas EN gång: dammpuffen låg på BO_X[HYLLA_MAX - 1] medan flygturen
    // gick till BO_X[antal - 1], så de två första knytten landade tyst i ett bo medan
    // dammet yrde 240 px bort, vid ett tomt.
    const bo = Math.min(this._hyllData.length, HYLLA_MAX) - 1
    if (bar && !bar.destroyed) {
      gsap.to(bar, {
        x: BO_X[bo],
        y: BO_Y,
        duration: 0.7,
        ease: 'power2.in',
        onComplete: () => {
          if (!this._alive) return
          puff(ctx.fxLayer, BO_X[bo], BO_Y, { count: 8, color: 0xffe6a8 })
          this._aterstall(ctx)
        },
      })
    } else {
      this._aterstall(ctx)
    }
  },

  _aterstall(ctx) {
    if (!this._alive) return
    // Rundan börjar om: tom kupa, uppfjädrad spak, fem utfällda maskindelar.
    if (this._knytt) {
      stadFx(this._knytt.view)
      this._knytt.destroy()
      this._knytt = null
    }
    this._knyttNod?.destroy({ children: true })
    this._knyttNod = null
    for (const n of this._losa) if (!n.destroyed) n.destroy()
    this._losa.length = 0
    this._knyttYta = null
    this._cer?.destroy()
    this._cer = null
    this._klar = false
    this._fro = 0
    this._dna = null
    this._knackar = 0
    this._valGjorda = 0
    this._fas = 'bygga'
    this._spak?.aterstall()
    for (const v of Object.values(this._verktyg)) v.satLast(false)
    this._kupaAktiv(true)
    this._kupa?.setVal(this._val)
    this._ritaHylla(ctx)
    this._bobo?.setMood('nyfiken')
    this._sistAktiv = performance.now()
    this._hintSteg = 0
  },

  // ---------------------------------------------------------------- vilohjälp

  _vakna() {
    this._sistAktiv = performance.now()
    if (this._hintSteg) {
      this._hintSteg = 0
      this._doljHand()
    }
  },

  _visaHand(x, y) {
    if (!this._alive || !this._hand || this._hand.destroyed) return
    this._hand.position.set(x, y)
    this._hand.visible = true
    this._hand.alpha = 0
    gsap.killTweensOf(this._hand)
    gsap.to(this._hand, { alpha: 1, duration: 0.2 })
    const inner = this._hand.children[0]
    if (inner) {
      gsap.killTweensOf(inner)
      gsap.to(inner, { y: 14, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }
  },

  _doljHand() {
    if (!this._hand || this._hand.destroyed) return
    gsap.killTweensOf(this._hand)
    const inner = this._hand.children[0]
    if (inner) {
      gsap.killTweensOf(inner)
      inner.y = 0
    }
    this._hand.visible = false
    this._hand.alpha = 0
  },

  _viloHjalp(ctx) {
    const steg = this._hintSteg + 1
    this._hintSteg = steg
    this._sistAktiv = performance.now()
    const a = ctx.services.audio
    if (this._fas === 'klacka') {
      this._visaHand(AGG_X, AGG_Y - 96)
      return
    }
    if (this._fas !== 'bygga') return
    if (steg === 1 && this._valGjorda === 0) {
      // Närmaste maskindel hoppar och spelar sin ton.
      const v = this._verktyg.farg
      if (v && !v.view.destroyed) {
        squash(v.view.children[0], { intensity: 1.1 })
        a.tone({ freq: 392, dur: 0.16, type: 'triangle', vol: 0.22 })
      }
      return
    }
    if (steg === 1) {
      this._sag(ctx, 'Tryck på maskinen och se vad som händer.')
      return
    }
    // Steg 2 och 3: spakens knopp studsar med samma handpiktogram som på ägget.
    this._visaHand(SPAK_X, SPAK_Y - 150)
    this._spak?.locka?.()
    if (steg >= 3) {
      ripple(ctx.fxLayer, SPAK_X, SPAK_Y - 60, { color: 0xffd8a0 })
      this._sag(ctx, 'Dra i spaken när du är klar!')
    }
  },

  // ---------------------------------------------------------------- röst

  // voice.say() kapar den förra repliken som första sak, och klippen är 2,3–4,1 s.
  // Bilden går genast — bara orden köar.
  _narTyst(ctx, fn, varv = 0) {
    if (!this._alive) return
    const v = ctx.services.voice
    if (varv >= 10 || (!v.talar && !v.kvar)) {
      fn()
      return
    }
    ctx.later(0.35, () => this._narTyst(ctx, fn, varv + 1))
  },

  // `fas` (valfri): repliken kastas om spelet hunnit vidare medan den låg i kön. _narTyst
  // väntar in narratorn, och under tiden kan ägget ha kläckts — då är "Knacka en gång till"
  // inte bara onödig, den TRÄNGER UNDAN belöningsraden (uppmätt i .test-logs).
  _sag(ctx, rad, fas) {
    this._narTyst(ctx, () => {
      if (!this._alive) return
      if (fas && this._fas !== fas) return
      ctx.services.voice.say(rad)
    })
  },

  // ---------------------------------------------------------------- loopen

  _uppdatera(ctx, t) {
    if (!this._alive) return
    const dt = t.deltaMS
    const nu = performance.now()

    this._kupa?.tick(dt, this._pekare)
    this._cer?.tick(dt, this._pekare)
    this._knytt?.tick(dt, this._knyttPekare())
    for (const b of this._bon) b.knytt?.tick(dt, null)

    if (nu - this._sistAktiv > HINT_S * 1000) this._viloHjalp(ctx)
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick, this)
    this._tick = null

    gsap.killTweensOf(this._hand)
    if (this._hand?.children?.[0]) gsap.killTweensOf(this._hand.children[0])
    gsap.killTweensOf(this._knyttNod)
    gsap.killTweensOf(this._boboWrap)
    gsap.killTweensOf(this._boboWrap?.scale)
    for (const n of this._losa) gsap.killTweensOf(n)

    // stadFx måste köras FÖRE destroy — efteråt är noderna destroyed och loopen hoppar
    // över precis den läcka den skulle stoppa. killTweensOf(roten) når bara roten.
    if (this._knytt) {
      stadFx(this._knytt.view)
      this._knytt.destroy()
      this._knytt = null
    }
    for (const b of this._bon) {
      if (b.knytt) {
        stadFx(b.knytt.view)
        b.knytt.destroy()
        b.knytt = null
      }
    }
    this._bon.length = 0

    this._cer?.destroy()
    this._cer = null
    this._kupa?.destroy()
    this._kupa = null
    this._spak?.destroy()
    this._spak = null
    for (const v of Object.values(this._verktyg)) v.destroy()
    this._verktyg = {}
    this._bobo?.destroy()
    this._bobo = null

    ctx.services.audio.stopAllLoops()
    this._rot?.destroy({ children: true })
    this._rot = null
    this._losa.length = 0
  },
}
