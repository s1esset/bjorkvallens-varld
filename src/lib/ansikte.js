// ANSIKTSRIGGEN — ett riktigt foto som spelfigur (`docs/IDEER.md` post 2).
//
// Lagren klipps OFFLINE av `npm run ansikte` (se `scripts/ansikte.mjs`) och ligger som
// webp + manifest under `public/ansikte/<person>/`. Här byggs de till en figur som kan
// GAPA, TUGGA, BLINKA och byta MIN — resten av appen ska aldrig behöva veta att det är
// fotografier.
//
// Lagerordningen är hela tricket, och den är mätt fram i bild:
//
//   bas      hela det inriktade ansiktet, stilla       ← syns bara i glipan
//   mun      mun-inre (tänder/tunga) ur gap-fotot      ← följer käken en bit
//   undre    käken: allt under överläppen              ← ÅKER NER när munnen öppnas
//   ovre     allt över överläppen, ligger överst       ← står still
//   blick_*  samma ögonruta, iris åt ett håll          ← korsbleks in = han tittar dit
//   ogon     blundande ögon ur blund-fotot             ← alfa 0→1 = en blinkning
//   ogon_v·h samma blund, en mjuk oval per öga         ← ETT öga = wink
//   min      oval lapp med en hel min                  ← korsbleks in och ut
//
// ⚠️ BLICKEN LIGGER UNDER BLINKNINGEN, och det är inte en smaksak: ligger den över blundar
// han med öppna ögon. Minerna ligger över båda — de bär sina egna ögon.
//
// ⚠️ MINERNA LIGGER ÖVER ÖGONLAGREN, och det är avsiktligt (en min bär sina egna ögon) —
// men följden är att ansiktet INTE kan blinka medan en grimas visas. `sur`-klippet är
// 1,90 s, och så länge stod ansiktet som ett stillbildsfoto. Att skära hål i lapparna för
// ögonen går inte (varje min HAR sina ögon, ofta slutna). Det som går är att låta huvudet
// röra sig under hållet: `min()` lägger därför automatiskt en `nick()` när grimasen
// landar, och andningen i `_inre` fortsätter hela tiden.
//
// ⚠️ BAS-LAGRET ÄR INTE DEKORATION. Utan det syns bakgrunden som ett ljust streck tvärs
// kinderna så fort käken sjunker — käken är en rak avskärning, och ett riktigt ansikte
// har hud där. I vila täcks basen helt av de två halvorna.
//
// ⚠️ Käken TRANSLATERAS, den roterar inte. En 2D-rotation kring en punkt svänger käken i
// SIDLED i frontvy (provat i bild); det som läser rätt är att den sjunker rakt ner, med
// ett tak — vid ~40 px börjar underkäkens kontur glida utanför basens.
import { Assets, Container, Sprite } from 'pixi.js'
import { gsap } from 'gsap'

const BAS_URL = import.meta.env.BASE_URL
const GAP_MAX = 40 // px i rutans koordinater — mätt tak, se filhuvudet
const MUN_FOLJ = 0.18 // mun-inre följer käken en bit, annars sitter tungan spikad
// BLICKEN, se `blick()`. Lappen är antingen PÅ eller AV — aldrig hållen halvvägs.
const BLICK_TID = 0.13 // korsblekningens längd: ögat ska hinna läsas som att det RÖR sig
const BLICK_DOD = 0.16 // under så här mycket utslag tittar han rakt fram
const BLICK_HYST = 0.14 // ny riktning måste slå den visade med marginal, annars flimmer

const _cache = new Map()

/**
 * Läser manifestet och laddar alla lager EN gång per person. Resultatet cachas, så ett
 * spel som monteras om inte laddar om texturerna.
 *
 * VARIANTMINER: en roll i `manifest.miner` får vara ett FÄLT av lappar — samma min ur
 * olika foton. Valet görs HÄR, en gång, och bara den valda laddas.
 *
 * ⚠️ Varianten är alltså låst per app-session, inte slumpad per anrop, och det är
 * avsiktligt: `_cache` lever appens livstid, och att hålla alla varianter laddade vore
 * 3 × hela riggen i GPU-minne (13,5 → ~40 MB) för en variation ögat ser en gång i minuten.
 * Barnet får ett ansikte som skiljer sig mellan omgångar, inte mellan grimaser.
 *
 * `Ansikte` ser aldrig fälten: manifestet som lämnas vidare bär EN lapp per roll, precis
 * som förut. Samma mönster som ljudets `_sampleUrls` — slumpen bor i tjänsten, inte i
 * spelen som använder den.
 */
export async function laddaAnsikte(person = 'pappa') {
  if (_cache.has(person)) return _cache.get(person)
  const bas = `${BAS_URL}ansikte/${person}/`
  const svar = await fetch(`${bas}manifest.json`, { cache: 'no-cache' })
  if (!svar.ok) throw new Error(`ansikte: manifest saknas för ${person}`)
  const rat = await svar.json()
  const miner = {}
  for (const [namn, v] of Object.entries(rat.miner)) {
    miner[namn] = Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v
  }
  const manifest = { ...rat, miner }
  const filer = [...Object.values(manifest.lager), ...Object.values(miner)]
  const tex = {}
  await Promise.all(filer.map(async (l) => { tex[l.fil] = await Assets.load(`${bas}${l.fil}`) }))
  const data = { manifest, tex }
  _cache.set(person, data)
  return data
}

export class Ansikte {
  /**
   * @param {object} data  resultatet från `laddaAnsikte()`
   * @param {number} hojd  önskad höjd i designpixlar (rutan skalas till den)
   */
  constructor(data, { hojd = 520 } = {}) {
    const { manifest, tex } = data
    this.manifest = manifest
    this._alive = true
    this._tw = []
    this._gap = 0
    // Huvudgesternas delar — se `_tillampa()`. En gest per fält, aldrig två på samma.
    this._g = { nickY: 0, lutaR: 0, lutaX: 0, ryckX: 0, ryckR: 0 }

    // TRE noder, en ägare var — annars slåss två tweens om samma transform:
    //   view   spelet: läge i scenen, `shake()`, spegling
    //   _gest  riggens HUVUDGESTER: nick, tveksam skakning, luta sig mot maten
    //   _inre  riggens andning (bara `scale`) — samma regel som karaktärsriggen
    // `_gest` roterar kring HALSEN, inte kring näsan: en 2D-rotation kring bildmitten
    // svänger hela huvudet i sidled (samma mätning som sa att käken måste translateras,
    // inte roteras), medan en rotation kring halsen läser som att han lutar på huvudet.
    this.view = new Container()
    this.view.eventMode = 'none'
    this._gest = new Container()
    this._gest.eventMode = 'none'
    this.view.addChild(this._gest)
    this._inre = new Container()
    this._gest.addChild(this._inre)

    const k = hojd / manifest.ruta.h
    this._inre.scale.set(k)
    this._inre.pivot.set(manifest.ruta.w / 2, manifest.ruta.h / 2)
    this.bredd = manifest.ruta.w * k
    this.hojd = hojd
    this._k = k

    // Halsen ligger strax under fotorutans nederkant (rutan slutar vid hakan och tonas ut
    // mot tröjan). Pivot OCH position sätts till samma tal, så noden är identitet i vila
    // och `oron()` fortfarande kan räknas i förälderns koordinater.
    this._hals = hojd * 0.46
    this._gest.pivot.set(0, this._hals)
    this._gest.position.set(0, this._hals)

    this._lager = [] // varje fotolager, för `hetta()` — tinten måste gälla alla
    const lagg = (l) => {
      const s = new Sprite(tex[l.fil])
      s.position.set(l.x, l.y)
      s.eventMode = 'none'
      this._inre.addChild(s)
      this._lager.push(s)
      return s
    }
    const L = manifest.lager
    this._bas = lagg(L.bas)
    this._mun = lagg(L.mun)
    this._undre = lagg(L.undre)
    this._ovre = lagg(L.ovre)
    // Blicken: en lapp per riktning, alla släckta. Riktningsnamnen är BILDENS (`v` = mot
    // skärmens vänster). Saknas de i manifestet — en äldre klippning, eller en person utan
    // blickfoton — blir `_blickar` null och `blick()` gör ingenting alls.
    this._blickar = null
    for (const n of ['v', 'h', 'ner']) {
      const l = L[`blick_${n}`]
      if (!l) continue
      const s = lagg(l)
      s.alpha = 0
      ;(this._blickar ||= {})[n] = s
    }
    this._blickNamn = null
    // ⚠️ Tweenen bokförs i en Map, INTE som ett fält på spriten. Egna fält på ett
    // Pixi-objekt kan krocka med Containerns egen transform-cache (`_cx` renderade en gång
    // ett helt fält med skalan 3660), och den risken är gratis att slippa.
    this._blickTw = new Map()
    this._ogon = lagg(L.ogon)
    this._ogon.alpha = 0
    // Ett öga i taget (winken). Saknas de i manifestet — en äldre klippning — faller
    // `blink({ oga })` tillbaka på båda ögonen i stället för att göra ingenting.
    this._ogonV = L.ogon_v ? lagg(L.ogon_v) : null
    this._ogonH = L.ogon_h ? lagg(L.ogon_h) : null
    if (this._ogonV) this._ogonV.alpha = 0
    if (this._ogonH) this._ogonH.alpha = 0

    // Minerna: en sprite per min, alla släckta. De ligger överst så en min täcker även
    // käkens läge — en grimas och ett gap ska aldrig visas samtidigt.
    this._miner = {}
    this._minY = {}
    for (const [namn, l] of Object.entries(manifest.miner)) {
      const s = lagg(l)
      s.alpha = 0
      s.visible = false
      this._miner[namn] = s
      this._minY[namn] = l.y
    }
    this._aktivMin = null
    // Vilken tween som just nu äger varje min-lapps `alpha` — en skrivare per lapp. Samma
    // bokföring som blickens `_blickTw`, och av samma skäl: en Map i stället för ett fält
    // på spriten, så inget krockar med Pixis egen transform-cache.
    this._minTw = new Map()
    this._hemY = { undre: L.undre.y, mun: L.mun.y }
  }

  /** Munnens öppning, 0–1. Käken sjunker, mun-inre följer med en bit. */
  gap(v) {
    if (!this._alive) return
    this._gap = Math.max(0, Math.min(1, v))
    const d = this._gap * GAP_MAX
    this._undre.y = this._hemY.undre + d
    this._mun.y = this._hemY.mun + d * MUN_FOLJ
  }

  /**
   * Ett tugg: n snabba gap. Löses upp av sig självt och lämnar munnen stängd.
   *
   * `takt`, `djup` och `n` är hela skillnaden mellan att knapra på en morot och att tugga
   * på en kola — och `onTugg(i)` ropas vid varje SAMMANBITNING, så ljudet kan ligga på
   * käkens egen takt i stället för på ett schema som gissar den. Utan kroken hade den som
   * ville ha ett knasterljud per tugg fått räkna ut `takt * 2 * i` själv, och de två hade
   * drivit isär i samma sekund tuggan blev materialberoende.
   */
  tugga(n = 3, { takt = 0.11, djup = 0.75, onTugg = null } = {}) {
    if (!this._alive) return
    const st = { v: this._gap }
    const tl = gsap.timeline()
    for (let i = 0; i < n; i++) {
      tl.to(st, { v: djup, duration: takt, ease: 'power2.out', onUpdate: () => this.gap(st.v) })
      tl.to(st, {
        v: 0.06, duration: takt, ease: 'power2.in', onUpdate: () => this.gap(st.v),
        onStart: onTugg ? () => { if (this._alive) onTugg(i) } : undefined,
      })
    }
    tl.to(st, { v: 0, duration: 0.1, onUpdate: () => this.gap(st.v) })
    this._track(tl)
    return tl
  }

  /**
   * En blinkning: de blundande ögonen tonas in och ut.
   *
   * `oga: 'v'|'h'` blinkar med ETT öga (winken) — och då hålls det stängt längre, för en
   * wink som går lika fort som en blinkning läser bara som en blinkning.
   */
  blink({ oga = null, hall = 0.04 } = {}) {
    if (!this._alive) return
    const s = oga === 'v' ? (this._ogonV || this._ogon) : oga === 'h' ? (this._ogonH || this._ogon) : this._ogon
    if (!s || s.destroyed) return
    const satt = (a) => { if (this._alive && !s.destroyed) s.alpha = a }
    const st = { a: 0 }
    const tl = gsap.timeline()
    tl.to(st, { a: 1, duration: 0.07, onUpdate: () => satt(st.a) })
    tl.to(st, { a: 0, duration: 0.11, delay: hall, onUpdate: () => satt(st.a) })
    this._track(tl)
    return tl
  }

  /**
   * HÅLL ögonen slutna — ett TILLSTÅND, till skillnad från `blink()` som är en puls.
   *
   * `blunda({ v, h })` styr ett öga i taget: `{ v: true, h: false }` är en sovande som just
   * öppnat höger öga. Det är riggens enda väg till "ett öga i taget" som varar; `blinkning()`
   * är en wink som tar slut av sig själv, och den kan inte bära ett vaknande.
   *
   * ⚠️ SAKNAS PER-ÖGA-LAGREN (en äldre klippning) faller den tillbaka på det gemensamma
   * `ogon`-lagret när BÅDA ögonen ska vara slutna, och gör ingenting alls när bara det ena
   * ska vara det — samma nedgradering som `blink({ oga })` och `blick()` gör. Ett halvt
   * blundande ansikte är sämre än ett som blundar med båda.
   *
   * ⚠️ `liv()`s blinkslinga fortsätter pulsa det gemensamma `ogon`-lagret under tiden. Det
   * syns inte (locken är redan nere) och får inte stängas av: slingan är samma timer som
   * håller ansiktet levande när han vaknar, och den startas bara om av `liv()`.
   */
  blunda({ v = false, h = false, tid = 0.25 } = {}) {
    if (!this._alive) return
    const par = [[this._ogonV, v], [this._ogonH, h]]
    if (!this._ogonV || !this._ogonH) {
      const s = this._ogon
      if (!s || s.destroyed) return
      return this._tonaOga(s, v && h ? 1 : 0, tid)
    }
    // Det gemensamma lagret måste ner när per-öga-lagren tar över, annars ligger två
    // blundande lager på varandra och ett öppnat öga syns inte.
    if (this._ogon && !this._ogon.destroyed) this._tonaOga(this._ogon, 0, tid)
    for (const [s, pa] of par) if (s && !s.destroyed) this._tonaOga(s, pa ? 1 : 0, tid)
  }

  _tonaOga(s, mal, tid) {
    if (s.alpha === mal) return
    const st = { a: s.alpha }
    return this._track(gsap.to(st, { a: mal, duration: tid, ease: 'sine.inOut',
      onUpdate: () => { if (this._alive && !s.destroyed) s.alpha = st.a } }))
  }

  /**
   * Blicken: han tittar dit maten är. `dx` −1 (skärmens vänster) … 1 (höger), `dy` 0 … 1
   * (nedåt). Sätts direkt varje bildruta av den som drar, precis som `lutaMot()`.
   *
   * ⚠️ LAPPEN ÄR PÅ ELLER AV — utslaget väljer RIKTNING, aldrig alfa. Det är inte en
   * förenkling utan mekanismens villkor: under blicklappen ligger `ovre` med sina egna
   * ögon som tittar rakt fram, så en lapp hållen på halv alfa visar TVÅ irisar i samma
   * öga. Att låta styrkan styra alfan hade alltså gett en dubbelexponering exakt i det
   * läge den var tänkt att göra finast. Vid ett byte korsbleks lapparna på 0,13 s, och
   * just den blekningen är det som läser som att ögat rör sig.
   */
  blick(dx = 0, dy = 0) {
    if (!this._alive || !this._blickar) return
    const k = {
      v: Math.max(0, Math.min(1, -dx)),
      h: Math.max(0, Math.min(1, dx)),
      ner: Math.max(0, Math.min(1, dy)),
    }
    let bast = null
    for (const n of Object.keys(this._blickar)) if (bast === null || k[n] > k[bast]) bast = n
    const nu = this._blickNamn
    // Hysteres: den riktning som redan visas behåller lappen tills en annan slår den med
    // marginal. Utan den byter valet håll fram och tillbaka i ett snett läge där två
    // riktningar är nästan lika starka — och varje byte är en korsblekning, alltså en
    // synlig ryckning i ögat i stället för en blick.
    const vald = (nu && k[nu] >= BLICK_DOD && k[bast] < k[nu] + BLICK_HYST) ? nu : bast
    this._blickTill(k[vald] >= BLICK_DOD ? vald : null)
  }

  /** Korsblekning till EN blicklapp (eller `null` = rakt fram). Idempotent per bildruta. */
  _blickTill(namn) {
    if (this._blickNamn === namn) return
    this._blickNamn = namn
    for (const [n, s] of Object.entries(this._blickar)) {
      const mal = n === namn ? 1 : 0
      if (s.destroyed || (s.alpha === mal && !this._blickTw.has(n))) continue
      this._blickTw.get(n)?.kill()
      const st = { a: s.alpha }
      const tw = gsap.to(st, { a: mal, duration: BLICK_TID, ease: 'sine.inOut',
        onUpdate: () => { if (this._alive && !s.destroyed) s.alpha = st.a },
        onComplete: () => { if (this._blickTw.get(n) === tw) this._blickTw.delete(n) } })
      this._blickTw.set(n, tw)
      this._track(tw)
    }
  }

  /** Winken: ett öga, hållet så länge att det syns, med en liten nick till. */
  blinkning(oga = 'h') {
    if (!this._alive) return
    this.nick({ djup: 5, tid: 0.22 })
    return this.blink({ oga, hall: 0.3 })
  }

  /**
   * Visa en min. Korsbleknar in (~120 ms), håller, och bleknar tillbaka — aldrig ett
   * hårt klipp. Munnen stängs först: en min bär sin egen mun.
   */
  min(namn, { hall = 1.5, in: tin = 0.12, ut: tut = 0.22, nick = true } = {}) {
    if (!this._alive) return
    const s = this._miner[namn]
    if (!s || s.destroyed) return
    if (this._aktivMin && this._aktivMin !== s) this._slackMin(this._aktivMin, 0.1)
    // ⚠️ EN SKRIVARE PER LAPP. Utan raden kunde en pågående uttoning på SAMMA sprite löpa
    // vidare medan den här tänder den igen: två tweens mot samma `alpha`, och uttoningens
    // `onComplete` släckte 0,1 s senare den nytända minen (`visible = false`). Barnet
    // tryckte på pappa och ingenting hände — P0 ÅTERKOPPLING. Samma regel som gesterna i
    // `_g` och blicken i `_blickTw`: den som tar över en egenskap dödar den förra ägaren.
    this._minTw.get(s)?.kill()
    this._aktivMin = s
    this.gap(0)
    s.visible = true
    // Minen är ett STILLBILDSFOTO, och ögonlagret ligger under den — under ett håll på
    // 1,9 s (`pappa_surt`) rör sig annars ingenting alls i hela ansiktet. Nicken när
    // reaktionen landar är det som går att göra utan att skära hål i lappen.
    if (nick) this.nick({ djup: 8, tid: 0.3 })
    const st = { a: s.alpha }
    const tl = gsap.timeline()
    tl.to(st, { a: 1, duration: tin, ease: 'sine.out', onUpdate: () => { if (this._alive && !s.destroyed) s.alpha = st.a } })
    if (hall > 0) {
      tl.to(st, { a: 0, duration: tut, delay: hall, ease: 'sine.in',
        onUpdate: () => { if (this._alive && !s.destroyed) s.alpha = st.a },
        onComplete: () => { if (!s.destroyed) s.visible = false; if (this._aktivMin === s) this._aktivMin = null } })
    }
    this._minTw.set(s, tl)
    this._track(tl)
    return tl
  }

  /**
   * Släpp en aktiv min direkt. Min-lagret ligger ÖVERST och bär sin egen mun, så ett
   * tugg bakom en kvarhängande grimas syns inte alls — den som matar två gånger i rad
   * måste släppa den förra minen först.
   */
  slappMin(dur = 0.14) {
    if (!this._alive || !this._aktivMin) return
    this._slackMin(this._aktivMin, dur)
    this._aktivMin = null
  }

  // Uttoningen är också en skrivare på lappens `alpha` och bokförs därför i samma Map —
  // annars kunde `slappMin()` och `min()` av samma namn löpa mot varandra. `visible = false`
  // står dessutom kvar som VILLKORLIGT: har lappen hunnit bli aktiv igen ska den lysa.
  // (Uppmätt före fixen, med riktiga tryck: två tryck 400 ms isär gav alfa 100 % men
  // `visible: false` 100 % av tiden efter 520 ms — en helt osynlig grimas.)
  _slackMin(s, dur) {
    this._minTw.get(s)?.kill()
    const st = { a: s.alpha }
    const tw = gsap.to(st, { a: 0, duration: dur,
      onUpdate: () => { if (this._alive && !s.destroyed) s.alpha = st.a },
      onComplete: () => { if (!s.destroyed && this._aktivMin !== s) s.visible = false } })
    this._minTw.set(s, tw)
    this._track(tw)
  }

  // ------------------------------------------------------------- huvudgester ---
  //
  // ⚠️ FYRA SKRIVARE PÅ SAMMA TRANSFORM = INGEN AV DEM. En nick som tweenar `_gest.y`
  // och en lutning som sätter `_gest.y` varje bildruta tar ut varandra på ett sätt som
  // inte syns som ett fel — det ser bara ut som att gesten "ibland inte tar". Varje gest
  // äger därför ett EGET fält i `_g`, och en enda funktion lägger ihop dem.

  _tillampa() {
    if (!this._alive || this._gest.destroyed) return
    const g = this._g
    this._gest.y = this._hals + g.nickY
    this._gest.x = g.lutaX + g.ryckX
    this._gest.rotation = g.lutaR + g.ryckR
  }

  /** En nick: huvudet ner och upp igen. "Mmm, gott." */
  nick({ djup = 11, tid = 0.26 } = {}) {
    if (!this._alive) return
    gsap.killTweensOf(this._g, 'nickY')
    const tl = gsap.timeline({ onUpdate: () => this._tillampa() })
    tl.to(this._g, { nickY: djup, duration: tid * 0.42, ease: 'power2.out' })
    tl.to(this._g, { nickY: 0, duration: tid * 0.58, ease: 'back.out(2)' })
    return this._track(tl)
  }

  /** Tveksam skakning i sidled — "nja, ska jag verkligen äta DET?" */
  tveka({ vinkel = 0.05, varv = 2, tid = 0.2 } = {}) {
    if (!this._alive) return
    gsap.killTweensOf(this._g, 'ryckR')
    const tl = gsap.timeline({ onUpdate: () => this._tillampa() })
    for (let i = 0; i < varv; i++) {
      tl.to(this._g, { ryckR: (i % 2 ? 1 : -1) * vinkel, duration: tid, ease: 'sine.inOut' })
    }
    tl.to(this._g, { ryckR: 0, duration: tid * 0.8, ease: 'sine.inOut' })
    return this._track(tl)
  }

  /** Ett ryck bakåt/uppåt — något oväntat träffade ansiktet. */
  ryck({ styrka = 1 } = {}) {
    if (!this._alive) return
    gsap.killTweensOf(this._g, ['ryckX', 'nickY'])
    const tl = gsap.timeline({ onUpdate: () => this._tillampa() })
    tl.to(this._g, { nickY: -9 * styrka, ryckX: 5 * styrka, duration: 0.09, ease: 'power3.out' })
    tl.to(this._g, { nickY: 0, ryckX: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
    return this._track(tl)
  }

  /**
   * Lutar sig MOT något, −1 (vänster) … 1 (höger), 0 = rakt fram. Sätts direkt varje
   * bildruta av den som drar maten — därför ingen tween, och därför ett eget fält.
   */
  lutaMot(v = 0) {
    if (!this._alive) return
    const t = Math.max(-1, Math.min(1, v))
    this._g.lutaR = t * 0.055
    this._g.lutaX = t * 14
    this._tillampa()
  }

  /**
   * Hetta 0–1: ansiktet rodnar. Fotolagren `tint`:as mot en varm röd, och `tint`
   * MULTIPLICERAR — grönt och blått dras ner medan rött lämnas kvar, vilket är precis
   * vad en het kind gör med en hudton. En röd rektangel ovanpå hade i stället lagt en
   * plastfilm över fotot.
   *
   * Gäller ALLA lager, minerna inkluderade. Bara basen hade betytt att ansiktet byter
   * färg i samma ögonblick som en grimas tonas in ovanpå — och det är just under en
   * grimas (`het`) den här är till för.
   */
  hetta(v) { this._tinta(v, false) }

  /**
   * Köld 0–1. Isbiten satt tidigare på `het` (grimasen stämde, men färgen sa fel sak):
   * en frusen paus mitt i ett matspel är en egen orsak, inte en variant av chili.
   *
   * ⚠️ KÖLD ÄR EN BLEKHET, INTE EN BLÅ FÄRG — och det är `tint`s aritmetik som avgör det,
   * inte en smaksak. `tint` MULTIPLICERAR. Hettan fungerar därför så bra: huden är redan
   * rödast i rött, så att dra ner grönt och blått förstärker något som finns. Åt andra
   * hållet finns ingenting att förstärka — hud har minst blått, och att dra ner rött och
   * grönt tar bara bort färgen. Uppmätt i rutnätet: full styrka på hettans skala gav
   * hudtonen (230,180,160) × (139,211,255)/255 = **(125,149,160)**, alltså ett grått lik,
   * inte en kall kind. Talen är därför MYCKET svagare (blekhet), och det som bär
   * betydelsen är huttringen, frostglimtarna och `chock`-minen.
   */
  kyla(v) { this._tinta(v, true) }

  _tinta(v, kall) {
    if (!this._alive) return
    const t = Math.max(0, Math.min(1, v))
    this._hetta = kall ? 0 : t
    this._kyla = kall ? t : 0
    // Se `kyla()`: multiplikationen kan bara TA BORT färg, så köldens tal är en blekhet
    // (−45 rött, −14 grönt vid full styrka) och inte en färgläggning.
    const r = Math.round(255 - (kall ? 45 : 0) * t)
    const g = Math.round(255 - (kall ? 14 : 96) * t)
    const b = Math.round(255 - (kall ? 0 : 132) * t)
    const ton = (r << 16) | (g << 8) | b
    for (const s of this._lager) if (s && !s.destroyed) s.tint = ton
  }

  /**
   * Var öronen sitter, i FÖRÄLDERNS koordinater (alltså relativt `view.position`) — så
   * ett spel kan låta rök stiga ur dem utan att känna till fotots inre geometri.
   *
   * Punkterna härleds ur manifestet, inte ur en avläsning i bild: basens vänster/höger
   * kant ger huvudets bredaste ställe och `ogonlinje` ger höjden (örat sitter en aning
   * under ögat). Fotot är friskuret runt håret, så örat självt kan vara beskuret —
   * rök från huvudets sida på öronhöjd är ändå den tecknade konventionen barn läser.
   */
  oron() {
    const L = this.manifest.lager.bas
    const G = this.manifest.geometri
    const r = this.manifest.ruta
    const y = ((G.ogonlinje + r.h * 0.06) - r.h / 2) * this._k
    const dx = (L.w / 2 - L.w * 0.06) * this._k
    const mx = (L.x + L.w / 2 - r.w / 2) * this._k
    return [{ x: mx - dx, y }, { x: mx + dx, y }]
  }

  /**
   * Träffade punkten ANSIKTET? Designkoordinater in, `true`/`false` ut — `null` om den här
   * klippningen saknar silhuett i manifestet (då får den som frågar falla tillbaka själv).
   *
   * `marg` vidgar konturen, och den ska vara den KASTADE SAKENS radie: testet blir då "rörde
   * biten vid honom", vilket är vad ögat ser, i stället för "låg bitens mittpunkt på honom".
   *
   * ⚠️ EN HANDSTÄMD ELLIPS RÄCKER INTE, och det är mätt: `mata-munnen` prövade träffar mot
   * en ellips (rx 215) och den var fel åt BÅDA hållen samtidigt — 32,0 % av zonen låg på
   * tom bakgrund (kastad mat small i luften bredvid huvudet och blev gegga) medan 18,8 %
   * av det synliga ansiktet låg utanför den (en träff mitt i hakan gjorde ingenting).
   * Att krympa ellipsen byter bara ut det ena felet mot det andra: rx 124 ger 31,9 %
   * missat ansikte. Radprofilen ur `bas.webp`s alfa ger 0,0 / 0,0. Se `scripts/silhuett.mjs`
   * och `scripts/_silprobe.mjs`; det är samma lärdom som halsmasken — det som skiljer
   * ansikte från icke-ansikte är POSITION, profilerad rad för rad, inte ett enda tal.
   *
   * ⚠️ MÄTS MOT `view`, ALDRIG MOT `_gest`/`_inre`. Huvudgesterna flyttar bilden upp till
   * 14 px i sidled och andningen skalar den — läste träffytan dem skulle den krypa undan
   * mitt i ett kast, exakt det fel som sänkte `sortera-skrap`s tunnor (släpp 2 px utanför
   * radien när målet guppade). Bilden får röra sig; träffytan står still.
   */
  traffar(x, y, marg = 0) {
    const S = this.manifest.geometri?.silhuett
    if (!S?.rader) return null
    if (!this.view || this.view.destroyed) return false
    const k = this._k
    const rx = (x - this.view.x) / k + this.manifest.ruta.w / 2
    const ry = (y - this.view.y) / k + this.manifest.ruta.h / 2
    const m = marg / k
    // Bandet under punkten, plus grannbanden inom marginalen — annars blir en kontur som
    // smalnar av snabbt (hakan) en trappa med `steg` px höga steg i träffytan.
    const i0 = Math.floor((ry - m) / S.steg)
    const i1 = Math.floor((ry + m) / S.steg)
    for (let i = i0; i <= i1; i++) {
      const rad = S.rader[i]
      if (rad && rx >= rad[0] - m && rx <= rad[1] + m) return true
    }
    return false
  }

  /**
   * Vilorörelse: andning + slumpade blinkningar. Ligger på den INRE containern.
   *
   * `takt` är andetagets längd i sekunder. Den är en parameter och inte en konstant för
   * att andhämtningen säger något: 2,4 s är lugnt, 1,1 s är flämtande efter en chili,
   * 3,4 s är mätt och dåsig. Anropa `liv()` igen med ny takt — den gamla tweenen dödas.
   */
  liv(pa = true, { takt = 2.4 } = {}) {
    if (!this._alive) return
    gsap.killTweensOf(this._inre.scale)
    if (!pa) {
      this._blinkTimer?.kill()
      this._blinkTimer = null
      return
    }
    this._takt = takt
    this._track(gsap.to(this._inre.scale, { x: this._k * 1.006, y: this._k * 1.01, duration: takt,
      yoyo: true, repeat: -1, ease: 'sine.inOut' }))
    // ⚠️ FRÅGAN ÄR OM TIMERN LEVER, inte om fältet är satt. En timer som ringbufferten
    // dödat är fortfarande truthy, och då startade blinkslingan aldrig om — pappa slutade
    // blinka för resten av omgången (uppmätt: högsta alfa på ögonlocket över 7 s vila 0,00,
    // mot 1,00 i en kort körning). Ett fotoansikte som inte blinkar läser som en stillbild
    // och förstärkte intrycket av att han "fastnat".
    if (this._blinkTimer?.parent) return // blinkslingan lever redan; bara takten byttes
    const om = () => {
      if (!this._alive) return
      this.blink()
      this._blinkTimer = gsap.delayedCall(2.2 + Math.random() * 3.4, om)
      this._track(this._blinkTimer)
    }
    this._blinkTimer = gsap.delayedCall(1.2 + Math.random() * 2.5, om)
    this._track(this._blinkTimer)
  }

  // ⚠️ RINGBUFFERTEN FICK INTE DÖDA ANDNINGEN. Listan tog bort den ÄLDSTA tweenen när
  // den blev 24 lång — och den äldsta är `liv()`s eviga andetag: det registreras först
  // och tar aldrig slut av sig självt. Med bara tugg och miner räckte 24 platser länge,
  // men en nick per min och ett ryck per bus fyller dem på en halv minut, och då hade
  // ansiktet slutat andas mitt i spelet utan ett konsolfel. Nu rensas FÄRDIGA tweens
  // först, och en evig tween (`repeat: -1`) rensas aldrig bort.
  //
  // ⚠️ …OCH DEN FÖRSTA RÄTTNINGEN LÄCKTE. `t.isActive() || t.totalProgress() < 1` kan inte
  // skilja LEVANDE från DÖDAD: en dödad `repeat: -1`-tween ger `isActive() === false` men
  // `totalProgress() === 0`, alltså < 1, och slapp igenom (uppmätt i `_tweenprobe.mjs`).
  // `liv(true, { takt })` dödar sitt gamla andetag och registrerar ett nytt — och `_ata`
  // anropar `liv()` EN GÅNG PER TUGGA. Alltså växte listan med en permanent död post per
  // tugga, och eftersom while-loopen hoppar över allt med `repeat: -1` kunde de aldrig
  // vräkas heller. Uppmätt över 26 riktiga tuggor: eviga poster 1 → 27, exakt +1 per tugga.
  // Vid tugga ~20 var alla 24 platser döda och loopen började döda LEVANDE tweens; vid 23
  // frös en hel grimaslapp på alfa 1 med `visible: true` medan en annan min var aktiv —
  // min-lagret ligger överst och bär sin egen mun, så barnet såg två ansikten på en gång.
  // Det ÄR ägarens "fastnade mellan 2 lägen", och det gav noll konsolfel hela vägen.
  //
  // `tw.parent` är måttet som faktiskt skiljer lägena åt: sann för löpande OCH väntande,
  // falsk för både färdiga och dödade — oavsett vem som dödade och varför.
  _track(tw) {
    this._tw.push(tw)
    if (this._tw.length > 24) {
      this._tw = this._tw.filter((t) => t === tw || (t.parent && (t.isActive?.() || (t.totalProgress?.() ?? 1) < 1)))
      while (this._tw.length > 24) {
        // `t !== tw`: den nyss skapade tweenen är undantagen i filtret men var det INTE här,
        // så en mättad lista fick `min()` att döda sin egen intoning i samma anrop.
        const i = this._tw.findIndex((t) => t !== tw && (t.repeat?.() ?? 0) !== -1)
        if (i < 0) break
        this._tw.splice(i, 1)[0]?.kill()
      }
    }
    return tw
  }

  destroy() {
    this._alive = false
    this._blinkTimer?.kill()
    this._blinkTimer = null
    // Blickens tweens är spårade i `_tw` också, men ringbufferten kan ha vräkt ut en
    // FÄRDIG av dem — och en som fortfarande löper vore då kvar utan ägare.
    for (const tw of this._blickTw.values()) tw.kill()
    this._blickTw.clear()
    for (const tw of this._minTw.values()) tw.kill()
    this._minTw.clear()
    for (const tw of this._tw) tw.kill()
    this._tw = []
    gsap.killTweensOf(this._inre.scale)
    gsap.killTweensOf(this._g) // huvudgesterna tweenar ett vanligt objekt, inte en nod
    // Texturerna ägs av `Assets`-cachen och ska INTE rivas — nästa montering av samma
    // spel ska inte behöva ladda om dem.
    if (!this.view.destroyed) this.view.destroy({ children: true })
  }
}
