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
//   min      oval lapp med en hel min                  ← korsbleks in och ut
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

    // YTTRE container: spelet äger läge, spegling och egna gester här. Riggens egen
    // andning bor i den INRE — samma regel som karaktärsriggen lärde sig den hårda
    // vägen (en `pop()` på samma nod som andningen blir hackig).
    this.view = new Container()
    this.view.eventMode = 'none'
    this._inre = new Container()
    this.view.addChild(this._inre)

    const k = hojd / manifest.ruta.h
    this._inre.scale.set(k)
    this._inre.pivot.set(manifest.ruta.w / 2, manifest.ruta.h / 2)
    this.bredd = manifest.ruta.w * k
    this.hojd = hojd
    this._k = k

    const lagg = (l) => {
      const s = new Sprite(tex[l.fil])
      s.position.set(l.x, l.y)
      s.eventMode = 'none'
      this._inre.addChild(s)
      return s
    }
    const L = manifest.lager
    this._bas = lagg(L.bas)
    this._mun = lagg(L.mun)
    this._undre = lagg(L.undre)
    this._ovre = lagg(L.ovre)
    this._ogon = lagg(L.ogon)
    this._ogon.alpha = 0

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

  /** Ett tugg: n snabba gap. Löses upp av sig självt och lämnar munnen stängd. */
  tugga(n = 3, { takt = 0.11, djup = 0.75 } = {}) {
    if (!this._alive) return
    const st = { v: this._gap }
    const tl = gsap.timeline()
    for (let i = 0; i < n; i++) {
      tl.to(st, { v: djup, duration: takt, ease: 'power2.out', onUpdate: () => this.gap(st.v) })
      tl.to(st, { v: 0.06, duration: takt, ease: 'power2.in', onUpdate: () => this.gap(st.v) })
    }
    tl.to(st, { v: 0, duration: 0.1, onUpdate: () => this.gap(st.v) })
    this._track(tl)
    return tl
  }

  /** En blinkning: de blundande ögonen tonas in och ut. */
  blink() {
    if (!this._alive || this._ogon.destroyed) return
    const st = { a: 0 }
    const tl = gsap.timeline()
    tl.to(st, { a: 1, duration: 0.07, onUpdate: () => { if (this._alive && !this._ogon.destroyed) this._ogon.alpha = st.a } })
    tl.to(st, { a: 0, duration: 0.11, delay: 0.04, onUpdate: () => { if (this._alive && !this._ogon.destroyed) this._ogon.alpha = st.a } })
    this._track(tl)
    return tl
  }

  /**
   * Visa en min. Korsbleknar in (~120 ms), håller, och bleknar tillbaka — aldrig ett
   * hårt klipp. Munnen stängs först: en min bär sin egen mun.
   */
  min(namn, { hall = 1.5, in: tin = 0.12, ut: tut = 0.22 } = {}) {
    if (!this._alive) return
    const s = this._miner[namn]
    if (!s || s.destroyed) return
    if (this._aktivMin && this._aktivMin !== s) this._slackMin(this._aktivMin, 0.1)
    this._aktivMin = s
    this.gap(0)
    s.visible = true
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

  _slackMin(s, dur) {
    const st = { a: s.alpha }
    this._track(gsap.to(st, { a: 0, duration: dur,
      onUpdate: () => { if (this._alive && !s.destroyed) s.alpha = st.a },
      onComplete: () => { if (!s.destroyed) s.visible = false } }))
  }

  /** Vilorörelse: andning + slumpade blinkningar. Ligger på den INRE containern. */
  liv(pa = true) {
    if (!this._alive) return
    if (!pa) {
      gsap.killTweensOf(this._inre.scale)
      this._blinkTimer?.kill()
      this._blinkTimer = null
      return
    }
    this._track(gsap.to(this._inre.scale, { x: this._k * 1.006, y: this._k * 1.01, duration: 2.4,
      yoyo: true, repeat: -1, ease: 'sine.inOut' }))
    const om = () => {
      if (!this._alive) return
      this.blink()
      this._blinkTimer = gsap.delayedCall(2.2 + Math.random() * 3.4, om)
      this._track(this._blinkTimer)
    }
    this._blinkTimer = gsap.delayedCall(1.2 + Math.random() * 2.5, om)
    this._track(this._blinkTimer)
  }

  _track(tw) {
    this._tw.push(tw)
    if (this._tw.length > 24) this._tw.shift()?.kill()
    return tw
  }

  destroy() {
    this._alive = false
    this._blinkTimer?.kill()
    this._blinkTimer = null
    for (const tw of this._tw) tw.kill()
    this._tw = []
    gsap.killTweensOf(this._inre.scale)
    // Texturerna ägs av `Assets`-cachen och ska INTE rivas — nästa montering av samma
    // spel ska inte behöva ladda om dem.
    if (!this.view.destroyed) this.view.destroy({ children: true })
  }
}
