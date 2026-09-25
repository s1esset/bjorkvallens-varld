// GÄSTERNA — de som sitter i soffan och tar emot popcornen (spelets MOTTAGARE, §4 B6a).
//
// Sex figurer ur andra delar av appen, alla redan exporterade — ingen källfil rörs:
//   bobo    makeKaraktar()              lib/karaktarer.js   rigg: humör · react · look
//   kusin   makeKaraktar({ palett })    samma, ny päls per omgång
//   katt    makeKompis('katt')          titt-ut-pappa/kompisar.js   reagera · jubla · liv
//   anka    makeKompis('anka')          samma fil
//   valp    makeVerktyg('hund')         vakna-pappa/verktyg.js      tryck · liv (sover i sitt
//                                       eget spel — här är den VAKEN: eget öga, egen tunga)
//   knytt   byggKnytt(dnaFromSeed(…))   unika-knytt/knytt.js        ett nytt varje omgång, tick()
//
// Spelet ska inte veta vilken figur det fått, så allt går genom EN fasad (`Gast`):
//   hungrig() · titta(x, y) · jubla() · mumsa() · knaprigt() · tick(dtMs) · destroy()
//
// NODTRÄDET — en ägare per transform (CLAUDE.md "Vem skriver egenskapen varje bildruta?"):
//   view      (spelets) position = sittplatsen. Rörs aldrig av oss efter bygget.
//   ├ bak     golvkuddens ovansida + kontaktskuggan på sitsen
//   ├ kropp   MASKAD vid sitslinjen — det som är under sitsen syns inte (stående figurer
//   │ │       blir sittande). Masken sitter UTANFÖR lutningen, så snittet står vågrätt.
//   │ └ lut        tick() äger rotation (lutar mot det gästen tittar på)
//   │   └ reakt    våra egna reaktionstweens äger y + scale (sniff, tugg, hopp)
//   │     └ vand   scale.x = ±1 — sidovända figurer vänder sig mot det de tittar på
//   │       └ fig  skalan som gör alla gäster lika stora → figurens egen view
//   ├ fram    golvkuddens framkant (döljer snittet på golvet)
//   └ fx      popcornet i luften + smulor/glitter (feedback.js-partiklar, dör med view)
//
// Exit-säkert: varje egen tween ligger i `_tw` och dödas i destroy(); fördröjningar går
// BARA via spelets `later` (dör med omgången) och vaktas dessutom av `_dod` + en token per
// reaktion. destroy() kör `stadFx` över hela trädet FÖRE figurens egen rivning — killTweensOf
// på roten når aldrig armar, svansar och huvuden en nivå in (CLAUDE.md).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { makeKompis } from '../titt-ut-pappa/kompisar.js'
import { makeVerktyg } from '../vakna-pappa/verktyg.js'
import { byggKnytt } from '../unika-knytt/knytt.js'
import { dnaFromSeed } from '../unika-knytt/dna.js'
import { burst, sparkle, stadFx } from '../../lib/feedback.js'
import { spray } from '../../lib/partiklar.js'
import { COLORS, shade, tint } from '../../lib/theme.js'
import { PLATSER, SKAL } from './matt.js'

export const POOL = ['bobo', 'kusin', 'katt', 'anka', 'valp', 'knytt']

// Sitslinjen i gästens eget rum: allt under den (y > SNITT) är dolt av masken. Lite UNDER
// sittpunkten, så kroppen sjunker ner i dynan i stället för att balansera på en kant.
const SNITT = 6
// Designdukens högerkant — armstödet står på x 1238, och en bred gäst där får inte hänga
// utanför bilden på en surfplatta.
const HOGER_TAK = 1272

// Kusinens päls. En FAST lista (inte fri kulör): Karaktar fyller kroppen med `sphereFill`,
// som bakar en gradient per färg och cachar den — en ny kulör varje omgång vore en ny
// texturbakning vid varje montering (CLAUDE.md, FillGradient-fällan). Ingen ligger nära
// Bobos orange, så kusinen läses aldrig som en andra Bobo.
const KUSIN_PALS = [0x6fa8dc, 0x7cc47a, 0xa98bd6, 0xef8fb6, 0x4fc1b5, 0xf2c94c, 0x9aa6b2, 0xc9705a]
const KUDD_FARG = [0xe07a5f, 0x81b29a, 0xe9b949, 0x7aa6d8, 0xc98bb9]

// Ett popcorn: vitt, och det BRÄNDA som en gäst älskar ("knaprigt!").
const MAJS = { ljus: 0xfff4d6, kant: 0xe8c98a, karna: 0xf3cf6b }
const BRAND = { ljus: 0x9a6232, kant: 0x5e3a1c, karna: 0x4a2c14 }

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const naerma = (nu, mal, k, dt) => nu + (mal - nu) * (1 - Math.exp(-k * dt))

function blanda(arr, rng) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Dra `n` olika gäster på `n` olika platser. Regeln: varje skål 0/1/2 får minst en ägare —
// en skål som fylls utan att någon jublar är en belöning utan mottagare. Platserna grupperas
// per skål, en dras ur varje grupp, och resten fylls på ur det som blev över.
export function dragGaster(rng = Math.random, n = 3) {
  const antal = clamp(Math.round(n) || 0, 0, Math.min(POOL.length, PLATSER.length))
  const valda = []
  for (const skal of [0, 1, 2]) {
    if (valda.length >= antal) break
    const grupp = PLATSER.filter((p) => p.skal === skal)
    if (grupp.length) valda.push(grupp[Math.floor(rng() * grupp.length) % grupp.length])
  }
  for (const p of blanda(PLATSER, rng)) {
    if (valda.length >= antal) break
    if (!valda.includes(p)) valda.push(p)
  }
  const typer = blanda(POOL, rng).slice(0, antal)
  // Platsordningen blandas också, annars sitter första gästen alltid på skål 0:s plats.
  return blanda(valda, rng).map((plats, i) => ({ typ: typer[i], plats }))
}

// --- figurerna ---------------------------------------------------------------
// Varje byggare returnerar figuren + dess mått i FIGURENS EGET rum (före skalan `s`):
//   ned     den y i figuren som ska ligga på sitslinjen
//   halv    halva bredden (för skuggan, kudden och högerkanten)
//   huvud   huvudets mitt (glitter vid jubel) · mun  dit popcornet flyger
//   natur   åt vilket håll en sidovänd figur tittar (+1 höger, −1 vänster, 0 = framifrån)

// Nod i ett annat spels figur, hittad via dess (dokumenterade) byggordning. Returnerar null
// i stället för att kasta om strukturen någon gång ändras — då uteblir bara detaljen.
function barn(nod, ...index) {
  let n = nod
  for (const i of index) {
    n = n?.children?.[i]
    if (!n) return null
  }
  return n
}

function byggBobo(rng, kusin) {
  const r = kusin ? 52 : 56
  let palett = {}
  if (kusin) {
    const pals = KUSIN_PALS[Math.floor(rng() * KUSIN_PALS.length) % KUSIN_PALS.length]
    palett = { pals, palsMork: shade(pals, 0.3), ansikte: tint(pals, 0.72) }
  }
  const fig = makeKaraktar({ r, palett })
  fig.setMood('hungrig', { direkt: true })
  return {
    fig,
    view: fig.view,
    s: 1,
    // Origo = huvudets mitt. Magen slutar på 2,16·r; snittet vid 1,78·r ger en kort,
    // sittande bål under huvudet.
    ned: r * 1.78,
    halv: r * 1.05,
    huvud: { x: 0, y: 0 },
    mun: { x: 0, y: r * 0.3 },
    natur: 0,
    r,
  }
}

function byggDjur(nyckel) {
  const fig = makeKompis(nyckel)
  fig.liv()
  // kompisar.js: view = [skugga, livnod] · livnod = [krop] · krop = [svans|stjärt, kropp, huvud]
  const huvudNod = barn(fig.view, 1, 0, 2)
  if (nyckel === 'katt') {
    // Huvudet (ikon 78 px) står på (−10, −16), tassarna slutar på y 57.
    return { fig, view: fig.view, s: 1.55, ned: 54, halv: 44, huvud: { x: -10, y: -16 }, mun: { x: -10, y: 2 }, natur: -1, huvudNod }
  }
  // Ankan: huvudet (ikon 74 px) på (19, −16), kroppen slutar på y 50.
  return { fig, view: fig.view, s: 1.7, ned: 47, halv: 46, huvud: { x: 19, y: -16 }, mun: { x: 19, y: 0 }, natur: 1, huvudNod }
}

function byggValp() {
  const fig = makeVerktyg('hund')
  fig.liv()
  // verktyg.js: view = [skugga, livnod] · livnod = [krop] · krop = [svans, kropp, huvud, zzz]
  // · huvud = [huvudritning, sovande öga, öra]. Hon SOVER på nattduksbordet; i soffan är hon
  // vaken och sugen: z:na göms, det slutna ögat byts mot ett öppet med egen pupill, och en
  // tunga hänger ut medan hon väntar. `visible` och inte `alpha` — valpens egen tryck-
  // reaktion tweenar alpha på båda, så alpha hade tänt dem igen.
  const krop = barn(fig.view, 1, 0)
  const huvudNod = barn(krop, 2)
  const zzz = barn(krop, 3)
  const sovOga = barn(huvudNod, 1)
  if (zzz) zzz.visible = false
  if (sovOga) sovOga.visible = false
  let pupill = null
  let tunga = null
  if (huvudNod) {
    // Tungan FÖRE ögat i ordningen men EFTER huvudritningen: den sticker ut under nosen.
    tunga = new Graphics()
    tunga.moveTo(-5, 0).lineTo(5, 0).quadraticCurveTo(7, 12, 0, 14).quadraticCurveTo(-7, 12, -5, 0).closePath()
      .fill(0xf28aa0).stroke({ width: 2.2, color: shade(0xf28aa0, 0.3), join: 'round' })
    tunga.moveTo(0, 2).lineTo(0, 9).stroke({ width: 1.6, color: shade(0xf28aa0, 0.28), cap: 'round' })
    tunga.position.set(42, -12)
    huvudNod.addChildAt(tunga, 1)
    const oga = new Container()
    oga.position.set(30, -36)
    oga.addChild(new Graphics().circle(0, 0, 6.2).fill(COLORS.white).stroke({ width: 1.6, color: shade(0xd7a86e, 0.34) }))
    pupill = new Graphics()
    pupill.circle(0, 0, 3.6).fill(COLORS.ink)
    pupill.circle(1.1, -1.3, 1.2).fill(COLORS.white)
    oga.addChild(pupill)
    huvudNod.addChild(oga)
  }
  // Huvudets mitt (20, −30) + kropens förskjutning (−6, 4); nosen på (36, −18).
  return { fig, view: fig.view, s: 1.8, ned: 57, halv: 60, huvud: { x: 14, y: -26 }, mun: { x: 34, y: -12 }, natur: 1, huvudNod, pupill, tunga }
}

function byggNyttKnytt(rng, audio, senare) {
  // Ett nytt individ varje gång: fröet OCH barnets recept slumpas (färg, mönster, värld).
  const seed = Math.floor(rng() * 4294967296) >>> 0
  const val = {
    f: Math.floor(rng() * 10),
    z: Math.floor(rng() * 4),
    m: Math.floor(rng() * 6),
    v: Math.floor(rng() * 6),
    g: Math.floor(rng() * 4),
  }
  const fig = byggKnytt(dnaFromSeed(seed, val), { r: 60, audio, senare })
  // Knyttets mått läses ur dess fästpunktspost (`_m`, satt vid bygget, skrivs aldrig om) och
  // storleksfaktorn `_bas`. Origo = fötterna; kroppens botten sitter på −benhöjden.
  const m = fig._m || {}
  const bas = Number.isFinite(fig._bas) ? fig._bas : 1
  const bh = Number.isFinite(m.bh) ? m.bh : 50
  const bw = Number.isFinite(m.bw) ? m.bw : 50
  const botten = Number.isFinite(m.fotY) ? m.fotY * bas : -10
  // Samma synliga storlek oavsett hur stort barnet valde att göra det — mätt på den RITADE
  // figuren (horn, kompis, vingar och svans med), för en larv med tre lober är dubbelt så
  // bred som en droppe med samma kroppshöjd. Det som är under sitsen räknas inte.
  const b = fig.view.getLocalBounds()
  const hojd = Math.max(1, botten - b.minY)
  const bredd = Math.max(1, b.maxX - b.minX)
  const s = clamp(Math.min(165 / hojd, 200 / bredd), 0.5, 1.8)
  return {
    fig,
    view: fig.view,
    s,
    // Sjunk en tiondel av kroppen ner i dynan — benen hamnar under sitsen.
    ned: botten - bh * bas * 0.12,
    halv: bw * bas,
    huvud: { x: 0, y: (Number.isFinite(m.faceY) ? m.faceY : -80) * bas },
    mun: { x: 0, y: (Number.isFinite(m.munY) ? m.munY : -60) * bas },
    natur: 0,
  }
}

function ritaMajs(g, f) {
  // Bulig silhuett: fem överlappande klotar, konturen som en mörkare kopia bakom (en stroke
  // på överlappande former drar streck tvärs över silhuetten).
  const bitar = [[0, 0, 9], [-7, -3, 7], [7, -4, 7], [-2, -9, 6.5], [4, 6, 6]]
  for (const [x, y, r] of bitar) g.circle(x, y + 1, r + 1.6).fill(f.kant)
  for (const [x, y, r] of bitar) g.circle(x, y, r).fill(f.ljus)
  g.circle(-1, 3, 3.2).fill(f.karna)
  g.circle(-3, -5, 2.2).fill({ color: 0xffffff, alpha: f === MAJS ? 0.8 : 0.25 })
  g.visible = false
  g._majsSkala = 1.35 // samma storlek som spelets popcorn (r 13)
  return g
}

// --- fasaden -------------------------------------------------------------------

class Gast {
  constructor(typ, plats, { later, audio, rng } = {}) {
    this.typ = POOL.includes(typ) ? typ : 'bobo'
    this.plats = plats || PLATSER[0]
    this._later = typeof later === 'function' ? later : null
    this._audio = audio || null
    const slump = typeof rng === 'function' ? rng : Math.random
    this._dod = false
    this._tw = []
    this._token = 0
    this._pagar = null // { typ, till } — reaktionen som pågår
    this._hungrig = true
    this._min = 'hungrig' // humöret riggen ska tillbaka till när ingen reaktion pågår
    this._mal = null // senaste titta-punkten (designkoordinater)
    this._vand = 1
    this._t = 0
    this._sniffT = 2 + slump() * 3

    this.view = new Container()
    this.view.eventMode = 'none'
    this.view.interactiveChildren = false
    this.view.position.set(this.plats.x, this.plats.y)

    const senare = (sek, fn) => this._senare(sek, fn)
    let d
    if (this.typ === 'bobo' || this.typ === 'kusin') d = byggBobo(slump, this.typ === 'kusin')
    else if (this.typ === 'katt' || this.typ === 'anka') d = byggDjur(this.typ)
    else if (this.typ === 'valp') d = byggValp()
    else d = byggNyttKnytt(slump, audio, senare)
    // Golvkudden (x 632) står trångt: reglagets plus slutar på x ~528 och skål 0 börjar på
    // x 599. En något mindre gäst där skymmer skålen mindre (§ rapporten: platsen bör flyttas).
    if (this.plats.id === 'kudde') d.s *= 0.85
    this._d = d
    this._fig = d.fig

    const s = d.s
    // Högerkanten: en bred gäst på armstödet flyttas in så den inte hänger utanför bilden.
    const ut = this.plats.x + d.halv * s - HOGER_TAK
    const dx = ut > 0 ? -ut : 0

    this._bak = new Container()
    this._kropp = new Container()
    this._fram = new Container()
    this._fx = new Container()
    this.view.addChild(this._bak, this._kropp, this._fram, this._fx)

    // Kontaktskuggan där gästen sitter — utan den svävar figuren framför soffan.
    const skugga = new Graphics().ellipse(dx, 2, Math.max(40, d.halv * s * 0.85), 10).fill({ color: COLORS.shadow, alpha: 0.16 })
    this._bak.addChild(skugga)

    if (this.plats.id === 'kudde') this._byggKudde(dx, d.halv * s, slump)

    this._lut = new Container()
    this._lut.x = dx
    this._reakt = new Container()
    this._vandNod = new Container()
    this._figNod = new Container()
    this._figNod.scale.set(s)
    d.view.position.set(0, -d.ned)
    this._figNod.addChild(d.view)
    this._vandNod.addChild(this._figNod)
    this._reakt.addChild(this._vandNod)
    this._lut.addChild(this._reakt)
    this._kropp.addChild(this._lut)

    // Masken: allt ovanför sitslinjen. Bred och hög nog för hopp och jubel.
    this._mask = new Graphics().rect(-420, -760, 840, 760 + SNITT).fill(0xffffff)
    this.view.addChild(this._mask)
    this._kropp.mask = this._mask

    // Popcornet som flyger från skålen till munnen — ETT av varje sort, återanvänt.
    this._majs = ritaMajs(new Graphics(), MAJS)
    this._brant = ritaMajs(new Graphics(), BRAND)
    this._fx.addChild(this._majs, this._brant)

    // Sidovända figurer tittar mot grytan (till vänster) från start.
    if (d.natur) this._vand = -1
    this._vandNod.scale.x = d.natur ? (this._vand * d.natur) : 1

    this._pek = { x: 0, y: 0 }
    this._lutNu = 0
    this._huvudLut = 0
    if (d.tunga) d.tunga.visible = true
  }

  // Golvkudden: ovansidan bakom gästen, framkanten framför — den döljer snittet.
  _byggKudde(dx, halv, rng) {
    const c = KUDD_FARG[Math.floor(rng() * KUDD_FARG.length) % KUDD_FARG.length]
    const rx = Math.max(84, halv + 22)
    const ry = 18
    const topp = new Graphics()
    topp.ellipse(dx, -2, rx, ry).fill(tint(c, 0.12))
    topp.ellipse(dx - rx * 0.2, -7, rx * 0.5, ry * 0.4).fill({ color: 0xffffff, alpha: 0.18 })
    this._bak.addChildAt(topp, 0)
    const fram = new Graphics()
    fram.moveTo(dx - rx, -2).bezierCurveTo(dx - rx, 24, dx + rx, 24, dx + rx, -2)
      .quadraticCurveTo(dx, 8, dx - rx, -2).closePath().fill(c)
    // Sömmen längs kanten + en skugga mot golvet.
    fram.moveTo(dx - rx * 0.92, 6).quadraticCurveTo(dx, 22, dx + rx * 0.92, 6).stroke({ width: 2.5, color: shade(c, 0.25), alpha: 0.8 })
    const golv = new Graphics().ellipse(dx, 16, rx * 1.02, 7).fill({ color: COLORS.shadow, alpha: 0.14 })
    this._bak.addChildAt(golv, 0)
    this._fram.addChild(fram)
  }

  // --- hjälpare ------------------------------------------------------------

  _senare(sek, fn) {
    if (this._dod || !this._later) return null
    return this._later(sek, () => {
      if (!this._dod) fn()
    })
  }

  _spar(tw) {
    if (!tw) return tw
    // `parent` är sant för löpande OCH väntande tweens, falskt för färdiga och dödade —
    // det enda måttet som skiljer dem åt (CLAUDE.md, ringbufferten).
    if (this._tw.length > 12) this._tw = this._tw.filter((t) => t?.parent)
    this._tw.push(tw)
    return tw
  }

  // Döda VÅRA reaktionstweens (sniff, tugg, hopp, popcornets flykt) och ställ tillbaka
  // noderna de äger. Figurens egna reaktioner avbryts av figuren själv vid nästa anrop.
  _stoppaEgna() {
    for (const t of this._tw) t?.kill?.()
    this._tw.length = 0
    if (!this._reakt.destroyed) {
      this._reakt.y = 0
      this._reakt.scale.set(1)
    }
    // En vändning som dödades halvvägs hade lämnat figuren hoptryckt på bredden.
    if (this._d.natur && !this._vandNod.destroyed) this._vandNod.scale.x = this._vand * this._d.natur
    const h = this._d.huvudNod
    if (this.typ === 'valp' && h && !h.destroyed) h.rotation = 0
    if (!this._majs.destroyed) this._majs.visible = false
    if (!this._brant.destroyed) this._brant.visible = false
  }

  _ny(typ, ms) {
    this._token++
    this._pagar = { typ, till: performance.now() + ms }
    return this._token
  }

  _upptagen() {
    return !!this._pagar && performance.now() < this._pagar.till
  }

  // Figurens punkt (i dess eget rum) → gästens rum (view). Lutningen och hoppet räknas inte
  // med — punkten används för partiklar och popcornets mål, där några pixlar inte syns.
  _iView(p) {
    const s = this._d.s
    const sx = this._vandNod.scale.x
    return { x: this._lut.x + sx * s * p.x, y: s * (p.y - this._d.ned) + this._reakt.y }
  }

  // Popcornet: ur ägarskålen, en båge upp och in i munnen. `klar` körs när det är framme.
  _flyg(brant, klar) {
    const bit = brant ? this._brant : this._majs
    if (bit.destroyed) return
    const skal = SKAL[this.plats.skal] || SKAL[0]
    const fran = { x: skal.x - this.plats.x + (Math.random() - 0.5) * 50, y: skal.kant - this.plats.y - 8 }
    const till = this._iView(this._d.mun)
    const hojd = 46 + Math.abs(till.x - fran.x) * 0.12
    bit.visible = true
    bit.position.set(fran.x, fran.y)
    bit.scale.set(bit._majsSkala)
    bit.rotation = 0
    const st = { t: 0 }
    const tw = gsap.to(st, {
      t: 1,
      duration: 0.36,
      ease: 'none',
      onUpdate: () => {
        if (bit.destroyed) {
          tw.kill()
          return
        }
        const t = st.t
        bit.x = fran.x + (till.x - fran.x) * t
        bit.y = fran.y + (till.y - fran.y) * t - hojd * 4 * t * (1 - t)
        bit.rotation = t * 4
        bit.scale.set(bit._majsSkala * (1 - t * 0.35))
      },
      onComplete: () => {
        if (!bit.destroyed) bit.visible = false
        if (!this._dod) klar(till)
      },
    })
    this._spar(tw)
  }

  // En tugga på våra egna noder: kroppen trycks ihop och sträcks två gånger.
  _tugga(ggr = 2) {
    const tl = gsap.timeline()
    for (let i = 0; i < ggr; i++) {
      tl.to(this._reakt.scale, { x: 1.05, y: 0.94, duration: 0.09, ease: 'power2.out' })
        .to(this._reakt.scale, { x: 0.98, y: 1.03, duration: 0.11, ease: 'sine.inOut' })
    }
    tl.to(this._reakt.scale, { x: 1, y: 1, duration: 0.14, ease: 'back.out(2)' })
    this._spar(tl)
  }

  _hopp(h = 16) {
    const tl = gsap.timeline()
    tl.to(this._reakt, { y: -h, duration: 0.16, ease: 'power2.out' })
      .to(this._reakt, { y: 0, duration: 0.34, ease: 'bounce.out' })
    tl.to(this._reakt.scale, { x: 0.94, y: 1.08, duration: 0.16, ease: 'power2.out' }, 0)
      .to(this._reakt.scale, { x: 1.08, y: 0.92, duration: 0.08, ease: 'power2.out' }, 0.44)
      .to(this._reakt.scale, { x: 1, y: 1, duration: 0.24, ease: 'back.out(2.4)' }, 0.52)
    this._spar(tl)
  }

  // Smulor som FALLER från munnen. Små och få: en puff i ansiktet läste som fläckar — och
  // bruna fläckar i ett ansikte är precis det äckliga P0 MOTGÅNG inte får vara.
  _smulor(mun, f) {
    spray(this._fx, mun.x, mun.y + 4, {
      count: 2,
      former: ['cirkel'],
      colors: [f.ljus, f.kant],
      size: 3.2,
      sizeVar: 0.35,
      sizeTo: 0.6,
      dist: 26,
      distVar: 0.5,
      angle: Math.PI / 2,
      spread: 2.4,
      gravity: 520,
      life: 0.5,
      lifeVar: 0.2,
    })
  }

  _ljud(nyckel) {
    try {
      return !!this._audio?.sample?.(nyckel)
    } catch {
      return false
    }
  }

  // --- fasaden -------------------------------------------------------------

  // Väntar på popcorn: sugen min, lutar sig mot grytan. Standardläget.
  hungrig() {
    if (this._dod) return
    this._hungrig = true
    this._min = 'hungrig'
    const d = this._d
    if (d.tunga && !d.tunga.destroyed) d.tunga.visible = true
    if (this.typ === 'knytt' && (this._fig.lage === 'somnig' || this._fig.lage === 'sover')) this._fig.vakna()
    // Riggens humör sätts direkt om inget pågår; annars tar tick() det när reaktionen är slut
    // (en reaktion återgår till humöret den startade med och hade skrivit över oss).
    if (!this._upptagen() && d.r && this._fig.mood?.() !== 'hungrig') this._fig.setMood('hungrig')
  }

  // Blicken mot en punkt i designkoordinater. Anropas ofta: sparar bara punkten — tick()
  // gör jobbet en gång per bildruta.
  titta(x, y) {
    if (this._dod || !Number.isFinite(x) || !Number.isFinite(y)) return
    if (!this._mal) this._mal = { x, y }
    else {
      this._mal.x = x
      this._mal.y = y
    }
  }

  // Skålen blev full: stort jubel. true = ett eget läte spelades (spelet tar annars rösten).
  jubla() {
    if (this._dod) return false
    this._stoppaEgna()
    const tok = this._ny('jubel', 1700)
    this._hungrig = false
    this._min = 'glad'
    const d = this._d
    const fig = this._fig
    let ljud = false
    if (d.tunga && !d.tunga.destroyed) d.tunga.visible = false
    if (this.typ === 'bobo' || this.typ === 'kusin') {
      fig.setMood('glad', { direkt: true })
      fig.react('jubel')
      // Ett andra hopp — ett jubel är två skutt, ett är bara en ryckning.
      this._senare(0.5, () => {
        if (tok === this._token) fig.react('jubel')
      })
    } else if (this.typ === 'katt' || this.typ === 'anka') {
      // Kompisens jubel loopar tills någon avbryter det; dess egen reagera() är ett
      // naturligt slut (katten sträcker på sig, ankan vickar på stjärten).
      fig.jubla()
      this._senare(1.35, () => {
        if (tok === this._token) fig.reagera()
      })
      ljud = this._ljud(this.typ === 'katt' ? 'djur_katt' : 'djur_anka')
    } else if (this.typ === 'valp') {
      fig.tryck() // örat flaxar, svansen viftar, hon skuttar
      this._hopp(22)
      ljud = this._ljud('djur_hund')
    } else {
      fig.glad() // skutt ×3, glada ögon och knyttets EGET fyrtonsmotiv — dess läte
      ljud = !!this._audio
    }
    // Glittret OVANFÖR huvudet — en svärm mitt i ansiktet döljer just det jubel som ska synas.
    const h = this._iView(d.huvud)
    sparkle(this._fx, h.x, h.y - 80, { count: 8 })
    burst(this._fx, h.x, h.y - 90, { count: 5, power: 0.6 })
    return ljud
  }

  // Ett popcorn ur skålen: det flyger in i munnen, gästen tuggar och det knastrar.
  mumsa() {
    if (this._dod || this._upptagen()) return
    const tok = this._ny('mums', this.typ === 'knytt' ? 1500 : 950)
    this._flyg(false, (mun) => {
      if (tok !== this._token) return
      this._ljud('tugg_knaprig')
      this._smulor(mun, MAJS)
      this._tuggaFigur()
    })
  }

  // Ett BRÄNT popcorn — och den här gästen ÄLSKAR brända. Glad, aldrig äcklad (P0 MOTGÅNG).
  knaprigt() {
    if (this._dod) return
    // Jublet får aldrig kapas av ett popcorn; ett vanligt mums får det.
    if (this._upptagen() && this._pagar.typ !== 'mums') return
    this._stoppaEgna()
    const tok = this._ny('knaprigt', 1500)
    this._flyg(true, (mun) => {
      if (tok !== this._token) return
      this._ljud('tugg_knaprig')
      this._smulor(mun, BRAND)
      const h = this._iView(this._d.huvud)
      sparkle(this._fx, h.x, h.y - 78, { count: 7 })
      const fig = this._fig
      if (this.typ === 'bobo' || this.typ === 'kusin') {
        fig.react('nam')
        this._senare(0.46, () => {
          if (tok === this._token) fig.react('heja')
        })
      } else if (this.typ === 'katt' || this.typ === 'anka') {
        fig.reagera()
        this._tugga(2)
      } else if (this.typ === 'valp') {
        fig.tryck()
      } else {
        fig.at() // gapar, tuggar tre gånger och RAPAR en gnista
      }
    })
  }

  _tuggaFigur() {
    const fig = this._fig
    if (this.typ === 'bobo' || this.typ === 'kusin') fig.react('nam')
    else if (this.typ === 'knytt') fig.at()
    else if (this.typ === 'valp') {
      const h = this._d.huvudNod
      if (h && !h.destroyed) {
        const tl = gsap.timeline()
        tl.to(h, { rotation: 0.14, duration: 0.09, ease: 'power2.out' })
          .to(h, { rotation: -0.02, duration: 0.1 })
          .to(h, { rotation: 0.12, duration: 0.09, ease: 'power2.out' })
          .to(h, { rotation: 0, duration: 0.16, ease: 'back.out(2)' })
        this._spar(tl)
      }
      this._tugga(1)
    } else this._tugga(2)
  }

  // Varje bildruta: blicken, lutningen, sniffandet och knyttets egen rigg.
  tick(dtMs) {
    if (this._dod || this.view.destroyed) return
    const dt = clamp((Number.isFinite(dtMs) ? dtMs : 16) / 1000, 0, 0.05)
    this._t += dt
    const d = this._d
    const upptagen = this._upptagen()

    // Målet i figurens föräldrarum (fig-noden) — den rymd riggarnas look()/tick() läser i.
    let lok = null
    if (this._mal) {
      const mx = this._mal.x - this.view.x
      const my = this._mal.y - this.view.y
      const dxv = mx - this._lut.x
      // Sidovända figurer vänder sig mot målet, med glapp så de inte fladdrar fram och tillbaka.
      if (d.natur && !upptagen) {
        const ny = dxv < -40 ? -1 : dxv > 40 ? 1 : this._vand
        if (ny !== this._vand) {
          this._vand = ny
          const tw = gsap.to(this._vandNod.scale, { x: ny * d.natur, duration: 0.22, ease: 'back.out(2)' })
          this._spar(tw)
        }
      }
      const riktning = Math.sign(dxv)
      const styrka = Math.min(1, Math.abs(dxv) / 600)
      this._lutMal = riktning * styrka * (this._hungrig ? 0.075 : 0.035)
      const s = d.s
      const sx = this._vandNod.scale.x || 1
      // `lok` i fig-nodens rum (riggarnas föräldrarum), `lokF` i figurens eget (där måtten står).
      lok = { x: dxv / (s * sx), y: (my - this._reakt.y) / s }
    } else this._lutMal = 0
    const lokF = lok ? { x: lok.x, y: lok.y + d.ned } : null

    this._lutNu = naerma(this._lutNu, this._lutMal || 0, 4, dt)
    this._lut.rotation = this._lutNu

    const fig = this._fig
    if (this.typ === 'bobo' || this.typ === 'kusin') {
      // Riggens look() har egna spärrar mot småändringar — en tween bara när blicken flyttar sig.
      if (lok) fig.look(lok.x, lok.y)
      if (!upptagen && fig.mood() !== this._min) fig.setMood(this._min)
    } else if (this.typ === 'katt' || this.typ === 'anka') {
      // Huvudet (en ikon) kan inte flytta blicken — det lägger huvudet på sned mot målet.
      // Ingen av kompisens egna rörelser tweenar huvudet, så tick() är dess enda skrivare.
      const h = d.huvudNod
      if (h && !h.destroyed) {
        const mal = lokF ? clamp((lokF.x - d.huvud.x) / 900, -0.2, 0.2) : 0
        this._huvudLut = naerma(this._huvudLut, mal, 5, dt)
        h.rotation = this._huvudLut
      }
    } else if (this.typ === 'valp') {
      const p = d.pupill
      if (p && !p.destroyed) {
        // Ögat sitter på (24, −32) i figurens rum (huvudets (30, −36) + kropens (−6, 4)).
        const hx = lokF ? lokF.x - 24 : 0
        const hy = lokF ? lokF.y + 32 : 0
        const len = Math.hypot(hx, hy) || 1
        const k = lokF ? Math.min(1, len / 200) * 2 : 0
        p.x = naerma(p.x, (hx / len) * k, 9, dt)
        p.y = naerma(p.y, (hy / len) * k, 9, dt)
      }
      const t = d.tunga
      if (t && !t.destroyed && t.visible) t.rotation = Math.sin(this._t * 5.2) * 0.12
    } else if (this.typ === 'knytt') {
      // En gäst som väntar på popcorn somnar inte: knyttets egen sömntimer (`_stilla`) är
      // byggd för hyllan, där ingen matar det. Utan raden sov det efter 20 s i soffan.
      if (this._hungrig && Number.isFinite(fig._stilla) && fig._stilla > 8) fig._stilla = 0
      if (lok) {
        this._pek.x = lok.x
        this._pek.y = lok.y
      }
      fig.tick(dtMs, lok ? this._pek : null)
    }

    // Sniffet: en hungrig djurgäst lyfter sig lite då och då — väntan syns, inte bara står.
    if (this._hungrig && !upptagen && (this.typ === 'katt' || this.typ === 'anka' || this.typ === 'valp')) {
      this._sniffT -= dt
      if (this._sniffT <= 0) {
        this._sniffT = 3 + Math.random() * 3
        const tl = gsap.timeline()
        tl.to(this._reakt, { y: -7, duration: 0.18, ease: 'power2.out' })
          .to(this._reakt, { y: 0, duration: 0.3, ease: 'bounce.out' })
        this._spar(tl)
      }
    }
  }

  destroy() {
    if (this._dod) return
    this._dod = true
    this._token++
    for (const t of this._tw) t?.kill?.()
    this._tw.length = 0
    // Hela trädet FÖRE figurens egen rivning: våra noder, figurens armar/svans/huvud och
    // feedback-hjälparnas proxytweens. Figurens destroy() tar sedan sina egna handtag.
    if (this.view && !this.view.destroyed) stadFx(this.view)
    try {
      this._fig?.destroy?.()
    } catch {
      /* redan riven */
    }
    if (this._kropp && !this._kropp.destroyed) this._kropp.mask = null
    if (this.view && !this.view.destroyed) this.view.destroy({ children: true })
    this._fig = null
  }
}

// Skapa en gäst på sin plats. `later` = spelets ctx.later (dör med omgången), `audio` =
// ctx.services.audio, `rng` = () => [0,1) (kusinens päls, knyttets frö, golvkuddens färg).
export function skapaGast(typ, plats, { later, audio, rng } = {}) {
  return new Gast(typ, plats, { later, audio, rng })
}
