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
//   ogon     blundande ögon ur blund-fotot             ← alfa 0→1 = en blinkning
//   ogon_v·h samma blund, en mjuk oval per öga         ← ETT öga = wink
//   min      oval lapp med en hel min                  ← korsbleks in och ut
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

const _cache = new Map()

/**
 * Läser manifestet och laddar alla lager EN gång per person. Resultatet cachas, så ett
 * spel som monteras om inte laddar om texturerna.
 */
export async function laddaAnsikte(person = 'pappa') {
  if (_cache.has(person)) return _cache.get(person)
  const bas = `${BAS_URL}ansikte/${person}/`
  const svar = await fetch(`${bas}manifest.json`, { cache: 'no-cache' })
  if (!svar.ok) throw new Error(`ansikte: manifest saknas för ${person}`)
  const manifest = await svar.json()
  const filer = [...Object.values(manifest.lager), ...Object.values(manifest.miner)]
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

  _slackMin(s, dur) {
    const st = { a: s.alpha }
    this._track(gsap.to(st, { a: 0, duration: dur,
      onUpdate: () => { if (this._alive && !s.destroyed) s.alpha = st.a },
      onComplete: () => { if (!s.destroyed) s.visible = false } }))
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
    if (this._blinkTimer) return // blinkslingan lever redan; bara takten byttes
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
  _track(tw) {
    this._tw.push(tw)
    if (this._tw.length > 24) {
      this._tw = this._tw.filter((t) => t === tw || t.isActive?.() || (t.totalProgress?.() ?? 1) < 1)
      while (this._tw.length > 24) {
        const i = this._tw.findIndex((t) => (t.repeat?.() ?? 0) !== -1)
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
    for (const tw of this._tw) tw.kill()
    this._tw = []
    gsap.killTweensOf(this._inre.scale)
    gsap.killTweensOf(this._g) // huvudgesterna tweenar ett vanligt objekt, inte en nod
    // Texturerna ägs av `Assets`-cachen och ska INTE rivas — nästa montering av samma
    // spel ska inte behöva ladda om dem.
    if (!this.view.destroyed) this.view.destroy({ children: true })
  }
}
