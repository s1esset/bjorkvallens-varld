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
import { landa, puff, sparkle, ripple, kvittera, stadFx } from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { log as diag } from '../../lib/gamelog.js'
import { byggKupa, byggVerktyg, byggSpak } from './kupan.js'
import { byggCeremoni } from './ceremoni.js'
import { byggKnytt } from './knytt.js'
import { byggBoden, byggLucka } from './boden.js'
import { byggSkrallet } from './skrallet.js'
import {
  dnaFromSeed, dnaFranPost, slumpFro, mulberry32, STORLEKAR, MONSTER, FARGER, VARLDAR,
  MILSTOLPAR, START_TAK, takFor, antalFranPoster, rullaTier,
  GEN_NU, MOTIV_ANTAL, FLAGG_TAK, packaFlaggor,
} from './dna.js'

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
// Ljudtratten (T6, steg 2) står på bänkplatsen som var reserverad för den sedan 2026-08-30:
// träffyta x 728–872 · y 558–702 → 24 px under mönsterhjulet (slutar 534), 176 px höger om
// veven, 54 px från kupans cirkel. Harnessens tryck på (800,600) landar nu HÄR i stället för
// på bakgrundsfångaren — med flit (§4c), så standardtestet motionerar tratten.
const T_LAGE = {
  farg: { x: 300, y: 250, w: 168 },
  gnista: { x: 950, y: 250, w: 168 },
  storlek: { x: 300, y: 450, w: 168 },
  monster: { x: 950, y: 450, w: 168 },
  varld: { x: 480, y: 630, w: 144 },
  rost: { x: 800, y: 630, w: 144 },
}
const KUPA_X = 640
const KUPA_Y = 330
const SPAK_X = 1160
const SPAK_Y = 350
const AGG_X = 640
const AGG_Y = 470
// Degens mitt (ceremoni.js KNAD) — dit Skrället sugs när spaken dras medan det håller något.
const KNAD_X = 640
const KNAD_Y = 384
// Skrällets tidtabell (§4b): nåd efter montering och efter varje ny runda, och minsta avstånd
// mellan två besök. Aldrig inom `SKRALL_LUGN_MS` efter ett verktygstryck — saken barnet just
// lade in ska hinna landa innan någon snor den.
const SKRALL_NAD_S = 12
const SKRALL_MELLAN_S = 22
const SKRALL_LUGN_MS = 1500
// `_narTyst`-pollningens tak i varv à 0,35 s. 20 = 7,0 s, satt över spelets längsta
// röstklipp (5,12 s, uppmätt) — se den långa noten vid `_narTyst`.
const NAR_TYST_TAK = 20
// Hyllan i verkstan: de tre senaste knytten. 96 px träffytor, 120 px isär → 24 px lucka,
// och 30 px kvar till vädervevens vänsterkant (408).
const BO_X = [90, 210, 330]
const BO_Y = 620
const HYLLA_MAX = 3
// Hela samlingen sparas — hyllan i verkstan visar bara de tre senaste, men Knyttboden visar
// allt. Före leverans 2 sparades bara hyllans tre, och varje fjärde kläckning kastade det
// äldsta knyttet för gott. 200 poster × 27 tecken ≈ 5,4 KB; taket är en lagringsgräns som
// ett barn aldrig når, inte en vräkning (P0: ingenting tas bort, ingenting nollställs).
const ALLA_MAX = 200

// Trottling for knadning under ett drag. 70 ms ~ var fjarde bildruta i 60 fps —
// tatt nog att kannas kontinuerligt, glest nog att inte oversvamma Mjukkroppen.
const KNAD_MS = 70

// Vad narratorn säger när en milstolpe låser upp något. Replikerna står som LITERALER
// här och inte i tabellen i dna.js: `check.mjs` läser bara index.js, och en replik den
// inte ser statiskt kan aldrig få ett röstklipp (CLAUDE.md). Nyckeln är milstolpens `vid`
// ur `MILSTOLPAR` (världen växer i tre milstolpar sedan steg 4, så axelnamnet räcker inte
// längre som nyckel); `_upplasprobe` U7 mäter att varje milstolpe har sin rad.
const UPPLAS_REPLIK = {
  4: 'Titta! Två nya färger i kranen!',
  8: 'Titta! Två nya mönster på hjulet!',
  12: 'Titta! En ny värld — stjärnnatten!',
  16: 'Titta! Nu kan bälgen blåsa ännu större!',
  20: 'Titta! En ny värld — öknen!',
  24: 'Titta! En ny värld — grottan!',
}

const HINT_S = 7
const KNACK_SPARR = 0.18
const AGG_KNACK = 4
// Bodluckan står under spaken, till höger — den enda lediga platsen sedan hyllan tog
// bottenvänstra hörnet. Träffyta 144×168 → x 1088–1232, y 528–696: 58 px under spakens
// yta (slutar 470), 54 px höger om mönsterhjulets (slutar 1034). Onåbar för harnessens nio
// tryck (max x 950) precis som spaken — `_bodprobe` pekar på den. Bobo flyttade till
// (1000, 600) för att lämna plats; han är ingen träffyta.
const LUCKA_X = 1160
const LUCKA_Y = 612
const BOBO_X = 1000
const BOBO_Y = 600
const KIK_S = 8

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
    // Fröet rullas redan HÄR (och i `_aterstall`), inte först vid spaken: det styr vilka
    // rekvisita kupan visar (steg 4, seedad dragning ur poolen), så förhandsvisningen och
    // finalen måste dela frö. Glaset rullar om det, spaken rullar bara om det saknas.
    this._fro = slumpFro(mulberry32((Math.random() * 0xffffffff) >>> 0))
    // Sällsyntheten (§3b): tiern för RUNDANS ägg, torkräknaren (vanliga i rad, aldrig
    // visad) och en DEV-krok som sonden sätter för att tvinga ett utfall. Nollas här.
    this._tier = 0
    this._torka = 0
    this._tvingaTier = null
    // Knyttboden: favoritens frö (står framme), luckan, overlayn, kiktimern och om det här
    // besöket är "en annan dag" (bodens hälsning, en gång per besök).
    this._fram = 0
    this._boden = null
    this._lucka = null
    this._kikT = KIK_S
    this._ater = false
    // Skrället (§4b, steg 3): figuren, sekunder kvar till nästa möjliga besök (räknar bara i
    // verkstan), axeln förra besöket tog, om RUNDANS knytt får tofsen, och tiden för senaste
    // verktygstrycket.
    this._skrall = null
    this._skrallT = SKRALL_NAD_S
    this._skrallAxel = null
    this._tofsNu = 0
    this._sistVerktyg = 0
    this._verktyg = {}
    this._kupa = null
    this._spak = null
    this._cer = null
    this._bobo = null
    this._boboWrap = null
    this._knytt = null
    this._knyttNod = null
    this._alla = []
    this._hyllData = []
    // TOTALEN kläckta knytt (hyllan bär bara de tre senaste), högsta FIRADE milstolpen och
    // dygnet för senaste besöket. Alla tre bor i samma sparblob, alla tre nollas här.
    this._antal = 0
    this._firad = 0
    this._dag = 0
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
    // Vilka axlar barnet FAKTISKT rort — `_valGjorda` ar bara ett antal och kan inte
    // saga vilken del som anda ar oprovad.
    this._rorda = new Set()
    this._lockIdx = 0
    this._pekNere = false
    this._sistKnad = 0
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

    // Ar fingret NEDE? Kravs for att knadningen ska folja ett drag och inte ett svavande
    // musljus. Bada slapp-vagarna gar uppfor en FORALDRAKEDJA, aldrig i sidled, sa
    // lyssnaren maste sitta pa den gemensamma foraldern till degen och fangaren — inte pa
    // fangaren sjalv (`skattjakt-i-morkret`s doda traffyta var precis det felet).
    // `eventMode = 'static'` ar inte valfritt: `notifyTarget` bortar tyst pa allt annat.
    // En bar Container utan hitArea traffestar aldrig sjalv, sa roten stjal inga tryck.
    this._rot.eventMode = 'static'
    this._rot.on('pointerdown', () => { this._pekNere = true })
    this._rot.on('pointerup', () => { this._pekNere = false })
    this._rot.on('pointerupoutside', () => { this._pekNere = false })

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
    this._byggLucka(ctx)
    // Skrället efter allt det kan klättra på, så det ligger ovanpå kupan i z-ordningen.
    this._byggSkrallet(ctx)
    this._byggAggYta(ctx)
    this._byggHand()
    // Boden SIST: overlayn ska ligga över allt annat i roten.
    this._byggBoden(ctx)

    this._tick = (t) => this._uppdatera(ctx, t)
    ctx.ticker.add(this._tick, this)
  },

  mount(ctx) {
    this._monterad = performance.now()
    this._sistAktiv = this._monterad
    // ÅTGÄRDER U4: klippet "Titta, dina knytt har saknat dig!" var genererat, betalat och
    // aldrig anropat — det fanns ingen datumlogik alls i modulen, så dag två lät exakt som
    // dag ett. Ett dygnstal i sparposten räcker: HAR barnet knytt på hyllan OCH kommer
    // tillbaka en annan dag är det hälsningen som gäller, annars den vanliga introrepliken.
    const dag = this._idag()
    const ater = this._hyllData.length > 0 && this._dag > 0 && dag > this._dag
    this._ater = ater
    ctx.services.voice.say(ater ? 'Titta, dina knytt har saknat dig!' : this.voiceIntro)
    if (dag !== this._dag) {
      this._dag = dag
      this._spara(ctx)
    }
    diag('takt', 'mount', { hylla: this._hyllData.length, antal: this._antal, ater })
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
    this._kupa.setFro(this._fro)
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
    // Taket FÖRE steget, alltid: `satSteg` räknar modulo taket, så omvänd ordning kan
    // lämna kvar ett läge ovanför ett nyss sänkt tak.
    const tak = this._tak
    for (const axel of Object.keys(T_LAGE)) this._verktyg[axel]?.satTak(tak[axel])
    this._verktyg.farg?.satSteg(this._val.f)
    this._verktyg.gnista?.satSteg(this._val.g)
    this._verktyg.storlek?.satSteg(this._val.z)
    this._verktyg.monster?.satSteg(this._val.m)
    this._verktyg.varld?.satSteg(this._val.v)
    this._verktyg.rost?.satSteg(this._val.r)
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
    this._boboWrap.position.set(BOBO_X, BOBO_Y)
    this._bobo = makeKaraktar({ r: 48 })
    this._boboWrap.addChild(this._bobo.view)
    this._spelLager.addChild(this._boboWrap)
    this._bobo.setMood('nyfiken')
    this._bobo.idle()
  },

  // ---------------------------------------------------------------- boden

  _byggLucka(ctx) {
    this._lucka = byggLucka({
      audio: ctx.services.audio,
      pa: () => this._luckaTryck(ctx),
    })
    this._lucka.view.position.set(LUCKA_X, LUCKA_Y)
    this._spelLager.addChild(this._lucka.view)
  },

  _byggBoden(ctx) {
    this._boden = byggBoden({
      senare: (s, fn) => ctx.later(s, fn),
      audio: ctx.services.audio,
      varldar: VARLDAR,
      pa: (h, d) => this._bodHandelse(ctx, h, d),
    })
    this._rot.addChild(this._boden.view)
  },

  // ---------------------------------------------------------------- Skrället (§4b, steg 3)

  _byggSkrallet(ctx) {
    this._skrall = byggSkrallet({
      senare: (s, fn) => ctx.later(s, fn),
      audio: ctx.services.audio,
      pa: (h, d) => this._skrallHandelse(ctx, h, d),
    })
    this._spelLager.addChild(this._skrall.view)
  },

  /**
   * Tidtabellen — §4b:s tak står alla HÄR: bara i verkstan (fas 'bygga'), aldrig de första
   * `SKRALL_NAD_S` (timern börjar där och sätts om vid varje ny runda), minst `SKRALL_MELLAN_S`
   * mellan besök, aldrig två gånger i rad på samma axel, aldrig strax efter ett verktygstryck,
   * högst EN åt gången, och den rör ALDRIG världsvalet — de enda axlarna är rekvisita och gnistor.
   * ⚠️ Byggd utan uppehållsmätningen §4b väntade på (ägarens beslut 2026-09-10).
   */
  _skrallForsok(ctx) {
    const s = this._skrall
    if (!s || s.aktiv || this._fas !== 'bygga') return
    if (performance.now() - this._sistVerktyg < SKRALL_LUGN_MS) {
      this._skrallT = 1.5
      return
    }
    const kand = []
    if (this._kupa?.antalProps() > 0) kand.push('prop')
    if (this._val.g > 0) kand.push('gnista')
    const tillatna = kand.filter((a) => a !== this._skrallAxel)
    if (!tillatna.length) {
      // Inget att sno — eller bara samma sak som förra gången. Titta igen om en stund.
      this._skrallT = 3
      return
    }
    const axel = tillatna[(Math.random() * tillatna.length) | 0]
    this._skrallT = Infinity // under besöket räknar ingen timer; 'borta' sätter nästa
    s.kom(() => this._skrallFramme(ctx, axel))
    diag('takt', 'skrall', { axel })
  },

  // Framme på kragen: kupan låter saken flyga upp till handen, och Skrället äger den från
  // första stund (`tog(sak, 0.4)` — den SYNS i handen när flykten är klar).
  _skrallFramme(ctx, axel) {
    const s = this._skrall
    if (!this._alive || !s) return
    if (this._fas !== 'bygga') {
      s.lamna('fly')
      return
    }
    const till = { x: s.hand.x - KUPA_X, y: s.hand.y - KUPA_Y }
    let sak = null
    if (axel === 'prop') {
      sak = this._kupa?.snoProp(till) || null
    } else if (this._kupa?.snoGnista(till)) {
      sak = { typ: 'gnista' }
      this._val.g = Math.max(0, this._val.g - 1)
      this._verktyg.gnista?.satSteg(this._val.g)
      this._kupa?.setVal(this._val)
    }
    if (!sak) {
      // Saken hann försvinna medan Skrället klättrade (glaset rullade om, spaken …).
      s.lamna('fly')
      return
    }
    this._skrallAxel = axel
    s.tog(sak, 0.4)
    this._sag(ctx, 'Oj, Skrället tog en sak! Peta på den.', 'bygga')
  },

  _skrallHandelse(ctx, h, d) {
    if (!this._alive) return
    if (h === 'tillbaka') {
      const sak = d?.sak
      if (sak?.typ === 'prop') {
        this._kupa?.lamnaProp(sak)
      } else if (sak?.typ === 'gnista') {
        this._val.g = Math.min(3, this._val.g + 1)
        this._verktyg.gnista?.satSteg(this._val.g)
        this._kupa?.setVal(this._val)
      }
      if (d?.orsak === 'petad') {
        // Barnet löste det — det är en seger, inte bara ett slut på ett hinder.
        this._vakna()
        ctx.services.audio.sfx('correct')
        sparkle(ctx.fxLayer, 620, 200)
        this._bobo?.react('jubel')
        ctx.later(1.0, () => this._bobo?.setMood('nyfiken'))
        this._sag(ctx, 'Bra jobbat, Skrället lämnade tillbaka den.', 'bygga')
      }
      diag('takt', 'skrall-tillbaka', { orsak: d?.orsak, typ: sak?.typ })
    } else if (h === 'borta') {
      this._skrallT = SKRALL_MELLAN_S
    }
  },

  _luckaTryck(ctx) {
    this._vakna()
    const a = ctx.services.audio
    if (this._fas !== 'bygga') {
      // Mitt i en ceremoni är luckan en leksak, inte en dörr — ögonen kikar, det klackar.
      this._lucka?.kika()
      kvittera(ctx.fxLayer, LUCKA_X, LUCKA_Y - 60, a)
      return
    }
    if (!this._alla.length) {
      // Tom samling: boden vore ett tomt rum, alltså en frånvaro (P0 FOMO). Dörren svänger,
      // ögonen kikar, en ton — och handen pekar mot spaken, där det första knyttet börjar.
      this._lucka?.kika()
      a.sfx('soft')
      this._visaHand(SPAK_X, SPAK_Y - 150)
      ctx.later(2.0, () => { if (this._alive && this._hintSteg === 0) this._doljHand() })
      return
    }
    // Skrället har inget i boden att göra — det lämnar tillbaka det det håller och går.
    this._skrall?.lamna('fly')
    this._fas = 'boden'
    this._doljHand()
    this._kupaAktiv(false)
    // Överst i roten igen — noder som lagts till senare (bänkens träffyta) ska aldrig
    // hamna ovanpå overlayn.
    this._rot.addChild(this._boden.view)
    this._boden.oppna(this._alla, { fram: this._fram, ater: this._ater })
    this._ater = false
    diag('takt', 'boden', { antal: this._alla.length, flikar: this._boden.flikar.length })
  },

  _bodHandelse(ctx, h, d) {
    if (!this._alive) return
    if (h === 'oppnad') {
      this._sag(ctx, 'Här bor dina knytt.', 'boden')
    } else if (h === 'vila') {
      this._sag(ctx, 'Tryck på ett knytt så vaknar det.', 'boden')
    } else if (h === 'somnar') {
      this._sag(ctx, 'Nu sover det. Väck det försiktigt!', 'boden')
    } else if (h === 'fram') {
      // Favoriten: det knytt barnet senast tryckte på står framme nästa gång. Samma
      // skrivare som allt annat i sparblobben.
      this._fram = Number.isFinite(d) ? d >>> 0 : 0
      this._spara(ctx)
    } else if (h === 'stangd') {
      this._fas = 'bygga'
      this._kupaAktiv(true)
      this._sistAktiv = performance.now()
      this._hintSteg = 0
      this._kikT = KIK_S
    } else if (h === 'flik') {
      diag('takt', 'flik', { flik: d })
    }
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
    this._alla = rent.slice(-ALLA_MAX)
    this._hyllData = this._alla.slice(-HYLLA_MAX)

    // Räknaren är TOTALEN kläckta, inte hyllan — hyllan bär bara de tre senaste. Saknas
    // den är sparposten skriven före upplåsningarna fanns (`v: 1`), och då härleds antalet
    // ur vad barnet REDAN gjort: ingen ska vakna till en verkstad där en värld hen använt
    // har försvunnit. `firad` följer med samma resonemang — en migrerad spelare ska inte
    // få fyra firanden på raken för delar hen redan haft i veckor.
    const tal = (x) => (Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : null)
    const sparat = tal(rå?.n)
    this._antal = sparat === null ? antalFranPoster(rent) : Math.max(sparat, this._alla.length)
    this._firad = tal(rå?.firad) ?? this._antal
    this._dag = tal(rå?.dag) ?? 0
    this._torka = tal(rå?.torka) ?? 0
    this._fram = (tal(rå?.fram) ?? 0) >>> 0
  },

  // Verkstadens tak HÄRLEDS ur räknaren, alltid — aldrig ett eget fält som uppdateras på
  // några ställen och glöms på ett. Första versionen var ett fält, och `_provaUpplasning`
  // glömde det: sonden fick ett recept som pekade på en del vars tak inte hade växt.
  // Två sanningar om samma axel är exakt det fel `satSteg` en gång byggdes för.
  get _tak() {
    return takFor(this._antal)
  },

  /** Dygnsnummer, för U4:s återkomsthälsning. Grovt med flit — datum, aldrig klockslag. */
  _idag() {
    return Math.floor(Date.now() / 86400000)
  },

  // EN skrivare för hela sparblobben. Hyllan, räknaren, den firade milstolpen och dygnet
  // bor i samma post, och två skrivare hade oundvikligen tappat varandras fält.
  _spara(ctx) {
    ctx.progress.setCustom('knytt', {
      v: 2,
      lista: this._alla.map((x) => x.slice()),
      n: this._antal,
      firad: this._firad,
      dag: this._dag,
      torka: this._torka,
      fram: this._fram,
    })
  },

  // Fältvis sanering: progress.get() ger en LEVANDE referens och setCustom sparar utan kopia,
  // så allt som läses kopieras och allt som är trasigt kastas.
  //
  // ÅTTA fält = en post skriven före steg 2 (2026-09-10). Den får ett nionde, flaggfältet med
  // generation 0, och läses exakt som förut — utan den raden hade längdkontrollen kastat
  // varje knytt barnet redan hade (`_knyttlyftprobe` R6).
  _rensaPost(post) {
    if (!Array.isArray(post) || (post.length !== 8 && post.length !== 9)) return null
    for (const n of post) if (!Number.isFinite(n)) return null
    const tak = [0, FARGER.length, STORLEKAR.length, MONSTER.length, VARLDAR.length, MOTIV_ANTAL, 4, 4, FLAGG_TAK]
    const ut = [post[0] >>> 0]
    for (let i = 1; i < 9; i++) {
      const t = tak[i]
      const x = i < post.length ? Math.trunc(post[i]) : 0
      ut.push(((x % t) + t) % t)
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
      // Plats 5: barnets melodi ur Ljudtratten (steg 2, 2026-09-10) — platsen var reserverad
      // åt den sedan 2026-08-30. Knytt skrivna FÖRE steg 2 bär här fröets motiv (före v1.243
      // `_fro % 5`) och läses som generation 0, där plats 5 aldrig läses.
      this._val.r,
      this._val.g,
      this._tier,
      // Plats 8: flaggorna — generationen knyttet föddes i (bit 0–3) och Skrällets tofs (bit 4).
      packaFlaggor({ gen: GEN_NU, tofs: this._tofsNu }),
    ]
    // Torkräknaren: sex vanliga i rad ger nästa garanterat brons. Sparas, visas aldrig.
    this._torka = this._tier === 0 ? this._torka + 1 : 0
    const lista = this._alla.map((x) => x.slice())
    lista.push(p)
    this._alla = lista.slice(-ALLA_MAX)
    this._hyllData = this._alla.slice(-HYLLA_MAX)
    // Taket växer HÄR, i samma andetag som räknaren (det HÄRLEDS ur den) — men
    // avtäckningen sker först när knyttet flyttat hem (`_provaUpplasning`), så den aldrig
    // krockar med ceremonin.
    this._antal++
    this._spara(ctx)
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
      const dna = dnaFranPost(data)
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

    // Degen ska svara pa att fingret GNUGGAR, inte bara pa att det slapper. Rosten sager
    // "Knada degen med fingret sa lyser den mer!" (4,49 s — spelets nast langsta klipp),
    // men `knada()` nads bara fran `_skynda`, som i sin tur bara hanger pa `pointertap`.
    // Ett barn som holl fingret nere och gnuggade runt fick alltsa EN knuff vid slappet.
    //
    // Bara `knada` har — INTE `skynda`. `skynda()` kortar tidslinjen 0,12 s per anrop, och
    // ett drag hade brant hela taket (1,2 s) pa en brakdel av en sekund och gjort degfasen
    // omojlig att vara kvar i.
    if (this._pekNere && this._fas === 'ceremoni') {
      const nu = performance.now()
      if (nu - this._sistKnad >= KNAD_MS) {
        this._sistKnad = nu
        this._cer?.knada(this._pekare.x, this._pekare.y)
      }
    }
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
    // Modulo TAKET, inte tabellen: verktyget cyklar redan inom sitt tak, och den här raden
    // är den andra vakten mot att ett recept pekar på en del som inte är upplåst än.
    const tak = this._tak
    if (axel === 'farg') this._val.f = steg % tak.farg
    else if (axel === 'varld') this._val.v = steg % tak.varld
    else if (axel === 'monster') this._val.m = steg % tak.monster
    else if (axel === 'gnista') this._val.g = steg % tak.gnista
    else if (axel === 'storlek') this._val.z = steg % tak.storlek
    else if (axel === 'rost') this._val.r = steg % tak.rost
    this._sistVerktyg = performance.now()
    this._valGjorda++
    this._rorda.add(axel)
    this._kupa?.setVal(this._val)
    // Ljudtratten spelar EXAKT den melodi knyttet får — samma frö, samma generation som
    // `_startaCeremoni` bygger med. Tonarten är fröets, så glaset (omrullningen) byter den.
    if (axel === 'rost') this._kupa?.sjung(dnaFromSeed(this._fro, { ...this._val, gen: GEN_NU }).motiv)
    else this._kupa?.laggIn(axel)
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
      // ...och rekvisitan följer med fröet: nya saker i samma värld, synligt och direkt.
      this._kupa?.setFro(this._fro)
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

    // Fröet OCH tiern rullas HÄR, före en enda bildruta av ceremonin. Den är en avtäckning,
    // inte en snurr: inget barnet gör under animationen kan ändra utfallet. Burken (g) är
    // ratten med tak +5 pp; första kläckningen och sex vanliga i rad garanterar brons (§3b).
    // `_tvingaTier` är sondens DEV-krok (null i spelet).
    //
    // Skrället FÖRST (§4b): håller det något sugs det med in i degen, och knyttet får en tofs
    // av dess päls och ett vikt öra. En snodd GNISTA går tillbaka i receptet innan tiern rullas
    // nedan — Skrället får aldrig röra sällsyntheten, det är ren kosmetik. Är det på väg in
    // eller ut flyr det bara (och lämnar tillbaka det det bär).
    this._tofsNu = 0
    const skrall = this._skrall
    if (skrall?.haller) {
      const sak = skrall.sugIn(KNAD_X, KNAD_Y)
      if (sak?.typ === 'gnista') {
        this._val.g = Math.min(3, this._val.g + 1)
        this._verktyg.gnista?.satSteg(this._val.g)
      }
      this._tofsNu = 1
      this._sag(ctx, 'Oj! Skrället åkte med in i degen!')
      diag('takt', 'skrall-sugs', { typ: sak?.typ })
    } else if (skrall?.aktiv) {
      skrall.lamna('fly')
    }
    if (!this._fro) this._fro = slumpFro(mulberry32((Math.random() * 0xffffffff) >>> 0))
    const tvang = this._tvingaTier
    this._tier = Number.isFinite(tvang)
      ? Math.max(0, Math.min(3, Math.trunc(tvang)))
      : rullaTier(Math.random(), this._val.g, { forsta: this._antal === 0, torka: this._torka })
    this._dna = dnaFromSeed(this._fro, { ...this._val, t: this._tier, gen: GEN_NU, tofs: this._tofsNu })
    diag('takt', 'tier', { tier: this._tier, g: this._val.g, torka: this._torka, forsta: this._antal === 0 })

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
      // Ett otåligt barn har knackat färdigt på under 1,2 s — då ska handen inte dyka upp
      // ovanpå den nyfödda världen (syntes i `_skimmerbild` innan vakten fanns).
      ctx.later(1.2, () => { if (this._fas === 'klacka') this._visaHand(AGG_X, AGG_Y - 96) })
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
    // Skimret eller kompisen får sin egen mening DIREKT efter namnet, aldrig ovanpå det:
    // `_narTyst` väntar in namnklippet (`talar` är sann så fort kön satts). Raden fångas
    // i en lokal här — `_aterstall` nollar `_dna` och kan hinna emellan.
    const rad = this._tier > 0 ? 'Oj, vad det glittrar!' : 'Ditt knytt har fått en liten kompis med sig!'
    this._narTyst(ctx, () => {
      if (!this._alive) return
      ctx.services.voice.say(namn)
      this._narTyst(ctx, () => { if (this._alive) ctx.services.voice.say(rad) })
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
      // FLYGTUREN MÅSTE DÖ FÖRST. `_tillBanken` tweenar samma `bar` mot bänken i 0,9 s, och
      // träffytan barnet trycker på föds i samma andetag — trycker barnet direkt (och det
      // gör ett otåligt barn) lever den tweenen fortfarande. gsap överskriver inte per
      // automatik, så båda kördes, och den här tweenens `onComplete` river `bar` via
      // `_aterstall` medan flygturen har tid kvar. Resultatet var ett gsap-fel PER BILDRUTA
      // resten av rundan: "Cannot set properties of null (setting 'y')" — och eftersom ett
      // gsap-fel kortsluter bildrutan tappades tryck EFTER det tyst.
      gsap.killTweensOf(bar)
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
    // Samma ordning som `destroy()` redan har: döda tweens FÖRE rivningen. En riven nod
    // som fortfarande tweenas ger inget konsolfel förrän nästa bildruta, och då pekar
    // stacken på gsap i stället för på den som rev.
    gsap.killTweensOf(this._knyttNod)
    this._knyttNod?.destroy({ children: true })
    this._knyttNod = null
    for (const n of this._losa) if (!n.destroyed) n.destroy()
    this._losa.length = 0
    this._knyttYta = null
    this._cer?.destroy()
    this._cer = null
    this._klar = false
    this._fro = slumpFro(mulberry32((Math.random() * 0xffffffff) >>> 0))
    this._kupa?.setFro(this._fro)
    this._dna = null
    this._knackar = 0
    // Rörde barnet ingen enda del den här rundan? Då cyklas receptet ett steg, så nästa
    // knytt ändå blir synligt nytt. Rörde det något gäller dess val fullt ut och NÅGONTING
    // HÄR ÄNDRAS INTE — ett barn som medvetet byggt en snövärld ska få en till i samma
    // familj. (Ägarens beslut 2026-09-01, ÅTGÄRDER U1.)
    //
    // Varför det behövdes: `_val` nollställdes aldrig, och `setVal(this._val)` lade tillbaka
    // samma recept. Uppmätt med `_variantprobe.mjs` över 20 000 kläckningar var kulör, värld
    // och mönster identiska i **100 %** av alla par — bara siluetten varierade, alltså
    // 1,00 av 4 synliga axlar. Största hue-avstånd 6,4°, innanför spelets egen ±8°-klamp:
    // samma färg, alltid. Ett barn som bara matar spaken (den största kontrollen i rummet)
    // fick därför nästan-lika knytt i all evighet, rakt mot spelets eget namn.
    //
    // Bara de TRE frusna axlarna cyklas. Storlek och gnistor är MÄNGD-axlar, inte identitet,
    // och lämnas åt barnet. Cyklingen går mot TAKET, inte tabellen — annars hade den pekat
    // ut en del som inte är upplåst än. Kombinationen upprepas efter 24 rundor med
    // startverkstan (8 · 4 · 3) och efter 60 när allt är upplåst (10 · 6 · 4).
    if (this._rorda.size === 0) {
      const tak = this._tak
      this._val.f = (this._val.f + 1) % tak.farg
      this._val.m = (this._val.m + 1) % tak.monster
      this._val.v = (this._val.v + 1) % tak.varld
    }
    this._valGjorda = 0
    this._rorda.clear()
    this._lockIdx = 0
    // En ny runda: ingen tofs än, och Skrället får nåd igen — golvet 12 s, och taket 22 s
    // (timern står på Infinity om det sögs in, för då kom aldrig något 'borta').
    this._tofsNu = 0
    this._skrallT = Math.max(SKRALL_NAD_S, Math.min(this._skrallT, SKRALL_MELLAN_S))
    this._fas = 'bygga'
    this._spak?.aterstall()
    for (const v of Object.values(this._verktyg)) v.satLast(false)
    // Varje del äger sin EGEN räknare. Cyklas receptet utan att delarna får veta står de
    // kvar på gamla steg, och nästa tryck på färgkranen hoppar tillbaka — två sanningar om
    // samma axel är precis det fel `satSteg` finns för. `_synkaVerktyg` bär dessutom det
    // NYA taket, så en milstolpe som just passerats blir nåbar i samma andetag.
    this._synkaVerktyg()
    this._kupaAktiv(true)
    this._kupa?.setVal(this._val)
    this._ritaHylla(ctx)
    this._bobo?.setMood('nyfiken')
    this._sistAktiv = performance.now()
    this._hintSteg = 0
    this._provaUpplasning(ctx)
  },

  // ---------------------------------------------------------------- upplåsningar

  // Milstolpen firas i VERKSTAN, efter att knyttet flyttat hem — aldrig mitt i ceremonin,
  // där barnet har en annan uppgift. Lämnar barnet spelet däremellan står `firad` kvar och
  // firandet kommer i stället i slutet av nästa runda: delarna är redan barnets (taket
  // växte vid kläckningen), det är bara avtäckningen som är skjuten.
  _provaUpplasning(ctx) {
    const m = MILSTOLPAR.find((x) => x.vid > this._firad && x.vid <= this._antal)
    if (!m) return
    this._firad = m.vid
    this._spara(ctx)
    this._firaUpplasning(ctx, m)
  },

  _firaUpplasning(ctx, m) {
    const p = T_LAGE[m.axel]
    const v = this._verktyg[m.axel]
    if (!p || !v) return
    // Receptet ställs på det FÖRSTA nya läget och maskinen kör in det i kupan direkt. En
    // belöning barnet inte kan se är ingen belöning — och det går samma väg som ett vanligt
    // tryck, så premissen "varje del GÖR det den ändrar" gäller även här. Bara den axel som
    // växte rörs; resten av barnets recept står kvar (ägarens U1-beslut).
    const nytt = Number.isFinite(m.fran) ? m.fran : START_TAK[m.axel]
    if (m.axel === 'farg') this._val.f = nytt
    else if (m.axel === 'monster') this._val.m = nytt
    else if (m.axel === 'varld') this._val.v = nytt
    else if (m.axel === 'storlek') this._val.z = nytt
    this._synkaVerktyg()
    this._kupa?.setVal(this._val)
    this._kupa?.laggIn(m.axel)
    v.locka?.()
    // Stämd kvint, aldrig ett UI-klick — se CLAUDE.md om stämda ljud.
    ctx.services.audio.sfx('correct')
    sparkle(ctx.fxLayer, p.x, p.y - 40)
    ripple(ctx.fxLayer, p.x, p.y, { color: 0xffe6a8 })
    this._visaHand(p.x, p.y - 120)
    // ...men bara tills barnet rör något. `_hintSteg` vaktar så vilohjälpens egen hand
    // inte släcks av den här timern om den hunnit ta över.
    ctx.later(2.4, () => { if (this._alive && this._hintSteg === 0) this._doljHand() })
    this._bobo?.react('jubel')
    ctx.later(1.0, () => this._bobo?.setMood('nyfiken'))
    const rad = UPPLAS_REPLIK[m.vid]
    if (rad) this._sag(ctx, rad, 'bygga')
    diag('takt', 'upplasning', { axel: m.axel, vid: m.vid, antal: this._antal })
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
    if (this._fas === 'klacka') {
      this._visaHand(AGG_X, AGG_Y - 96)
      return
    }
    if (this._fas !== 'bygga') return

    // En OPROVAD del lockar, och nästa vilostund tar nästa oprovade — hjälpen visar hela
    // verkstan i stället för samma del om och om igen.
    //
    // Före: `this._verktyg.farg` var hårdkodat (kommentaren intill sa "Närmaste maskindel"
    // men ingen närhet räknades någonsin ut), och steg 2–3 pekade mot spaken UTAN att läsa
    // `_valGjorda`. Ett barn som provat en enda del fick alltså "dra i spaken" som nästa
    // ledtråd — assistmekaniken drog mot avslut i stället för mot upptäckt, i det spel vars
    // hela premiss är fem oberoende val.
    // Ordningen läses ur `T_LAGE` i stället för en egen lista — en andra kopia av
    // axelnamnen är exakt den glidning som gjorde hornet `krona` onåbart.
    const oprovade = Object.keys(T_LAGE).filter((ax) => !this._rorda.has(ax))
    if (oprovade.length) {
      const ax = oprovade[this._lockIdx++ % oprovade.length]
      this._verktyg[ax]?.locka?.()
      if (steg >= 2) this._visaHand(T_LAGE[ax].x, T_LAGE[ax].y - 120)
      if (steg === 1 && this._valGjorda === 0) return
      if (steg === 1) return
      // Har barnet provat något men inte allt är det UPPTÄCKT som saknas, inte spaken.
      if (this._valGjorda < 2) {
        this._sag(ctx, 'Tryck på maskinen och se vad som händer.')
        return
      }
    }

    // Först när minst två val är gjorda (eller allt är provat) pekar hjälpen mot utgången.
    this._doljHand()
    this._visaHand(SPAK_X, SPAK_Y - 150)
    this._spak?.locka?.()
    if (steg >= 3) {
      ripple(ctx.fxLayer, SPAK_X, SPAK_Y - 60, { color: 0xffd8a0 })
      this._sag(ctx, 'Dra i spaken när du är klar!')
    }
  },

  // ---------------------------------------------------------------- röst

  // voice.say() kapar den förra repliken som första sak. Bilden går genast — bara orden köar.
  //
  // ⚠️ TAKET MÅSTE VARA LÄNGRE ÄN DET LÄNGSTA KLIPPET, annars kapar den här mekanismen
  // själv det den byggdes för att skydda. Kommentaren här sa "klippen är 2,3–4,1 s" och
  // taket stod på 10 varv = 3,5 s. Båda talen var fel: uppmätt med `ffprobe` på spelets
  // elva egna klipp är spannet **2,60–5,12 s**, och FEM av elva är längre än 3,5 s
  // ("Tryck på spaken igen…" 5,12 · "Knåda degen…" 4,49 · "Tryck på maskinen…" 4,38 ·
  // "Nu blandas allt ihop…" 3,97 · "Titta så ägget lyser…" 3,54). När taket löpte ut
  // fyrade `fn()` OVILLKORLIGT mitt i meningen. 20 varv = 7,0 s ligger över 5,12 med
  // marginal för att ett klipp byts mot ett längre.
  _narTyst(ctx, fn, varv = 0) {
    if (!this._alive) return
    const v = ctx.services.voice
    if (varv >= NAR_TYST_TAK || (!v.talar && !v.kvar)) {
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
    this._boden?.tick(dt)
    this._skrall?.tick(dt)
    // Skrällets timer räknar BARA i verkstan och bara när det inte redan är på besök.
    if (this._fas === 'bygga' && this._skrall && !this._skrall.aktiv) {
      this._skrallT -= dt / 1000
      if (this._skrallT <= 0) this._skrallForsok(ctx)
    }

    // Ett par ögon kikar ut genom bodluckan var åttonde sekund — bara i verkstan, aldrig
    // medan ceremonin eller boden pågår.
    if (this._fas === 'bygga') {
      this._kikT -= dt / 1000
      if (this._kikT <= 0) {
        this._kikT = KIK_S + Math.random() * 3
        this._lucka?.kika()
      }
    }

    // Vilohjälpen tiger medan Skrället är på besök: repliken har redan sagt "peta på den", och
    // en hand som pekar på en maskindel skulle dra blicken bort från det som händer.
    if (this._fas !== 'boden' && !this._skrall?.aktiv && nu - this._sistAktiv > HINT_S * 1000) this._viloHjalp(ctx)
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
    this._boden?.destroy()
    this._boden = null
    this._lucka?.destroy()
    this._lucka = null
    this._skrall?.destroy()
    this._skrall = null

    ctx.services.audio.stopAllLoops()
    this._rot?.destroy({ children: true })
    this._rot = null
    this._losa.length = 0
  },
}
