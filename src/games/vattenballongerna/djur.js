// VATTENBALLONGERNA — de sex djuren (elefant, gris, lejon, hund, giraff, isbjörn).
//
// Varje djur är ett FRISTÅENDE ritat föremål med egen silhuett (P0 ASSETS): kropp, ben, huvud,
// öron/man/snabel/svans som egna Graphics, en markskugga och vilo-liv (vandrar, guppar, vaggar).
// Värmen syns på tre sätt som alla går mellan "varmt" och "svalt": färgtonen (röd → ren),
// ansiktet (trött + svettdroppar → blundande leende + blå kinder) och värmevågor ovanför ryggen.
//
// Inga gsap-tweens bor i klassen — allt animeras i `uppdatera(dt)` av spelets egen ticker, så
// ett djur kan aldrig överleva en rivning. Det enda gsap som används är feedback.js (squash/pop)
// på djurets inre barn, och `riv()` städar dem med stadFx.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { shade } from '../../lib/theme.js'
import { lerpColor } from '../../lib/scene.js'
import { spray } from '../../lib/partiklar.js'
import { squash, stadFx } from '../../lib/feedback.js'
import { VATTEN_FARGER, PLATSER, SVANG, DJUR_STORLEK, UPPVARMNING_S, clamp } from './konst.js'

const HETT_TON = 0xffcdbd // multipliceras mot djurets färger → rödaktigt
const SVALT_TON = 0xffffff

function ben(g, x, topp, w, farg) {
  g.roundRect(x - w / 2, topp, w, -topp, w * 0.42).fill(farg)
}

// ---- Konsten: en funktion per art. Alla ritar med fötterna på y = 0, huvudet åt vänster. -------
// Returnerar { huvud:{x,y,r}, svans?:{g,px,py,amp,fart}, snabel?:{g,px,py}, mund:bool, hojd }.
const ARTER = {
  elefant: {
    skala: 0.74,
    ljud: null,
    reaktion: 'spruta',
    bygg(bild) {
      const c = 0x9fb0bf
      const d = shade(c, 0.18)
      const oron = 0xc9a9b8
      const g = new Graphics()
      ben(g, -34, -62, 28, d)
      ben(g, 56, -62, 28, d)
      g.ellipse(20, -98, 76, 56).fill(c)
      ben(g, -6, -62, 30, c)
      ben(g, 78, -62, 30, c)
      g.ellipse(-112, -124, 27, 42).fill(oron).stroke({ width: 3, color: shade(oron, 0.2) })
      g.ellipse(-32, -124, 27, 42).fill(oron).stroke({ width: 3, color: shade(oron, 0.2) })
      g.circle(-72, -124, 44).fill(c)
      g.ellipse(-90, -94, 5, 13).fill(0xfff6df)
      g.ellipse(-54, -94, 5, 13).fill(0xfff6df)
      bild.addChild(g)
      // svansen: tunn med tofs
      const svans = new Graphics()
      svans.moveTo(0, 0).quadraticCurveTo(14, 16, 8, 38).stroke({ width: 7, color: d, cap: 'round' })
      svans.circle(8, 40, 7).fill(d)
      svans.position.set(92, -112)
      bild.addChild(svans)
      // snabeln: eget grepp (pivot i roten) så den kan lyftas och spruta
      const snabel = new Graphics()
      snabel.moveTo(0, 0).quadraticCurveTo(-4, 50, -30, 62).stroke({ width: 26, color: c, cap: 'round' })
      snabel.moveTo(-30, 62).lineTo(-36, 64).stroke({ width: 22, color: shade(c, 0.1), cap: 'round' })
      snabel.position.set(-72, -108)
      bild.addChild(snabel)
      return { huvud: { x: -72, y: -126, r: 40 }, svans: { g: svans, amp: 0.2, fart: 1.6 }, snabel: { g: snabel, px: -72, py: -108 }, mund: false, hojd: 168 }
    },
  },
  gris: {
    skala: 0.86,
    ljud: 'djur_gris',
    reaktion: 'hoppa',
    bygg(bild) {
      const c = 0xf4a6b8
      const d = shade(c, 0.2)
      const g = new Graphics()
      ben(g, -30, -40, 22, d)
      ben(g, 46, -40, 22, d)
      g.ellipse(12, -72, 70, 50).fill(c)
      ben(g, -4, -40, 24, c)
      ben(g, 70, -40, 24, c)
      // öron: trianglar som hänger åt sidorna
      g.moveTo(-100, -108).lineTo(-84, -142).lineTo(-66, -112).closePath().fill(d)
      g.moveTo(-26, -108).lineTo(-44, -142).lineTo(-60, -112).closePath().fill(d)
      g.circle(-64, -86, 40).fill(c)
      bild.addChild(g)
      const tryne = new Graphics()
      tryne.ellipse(-64, -68, 20, 14).fill(0xee8aa0).stroke({ width: 2, color: shade(0xee8aa0, 0.2) })
      tryne.ellipse(-70, -68, 3.4, 5).fill(0x8a4a55)
      tryne.ellipse(-58, -68, 3.4, 5).fill(0x8a4a55)
      bild.addChild(tryne)
      const svans = new Graphics()
      svans.moveTo(0, 0).quadraticCurveTo(16, -14, 6, -26).quadraticCurveTo(-6, -36, 8, -42).stroke({ width: 5, color: d, cap: 'round' })
      svans.position.set(80, -88)
      bild.addChild(svans)
      return { huvud: { x: -64, y: -90, r: 36 }, svans: { g: svans, amp: 0.3, fart: 2.4 }, mund: false, hojd: 130 }
    },
  },
  lejon: {
    skala: 0.8,
    ljud: null,
    reaktion: 'skaka',
    bygg(bild) {
      const c = 0xe8b04a
      const d = shade(c, 0.2)
      const man = 0xb9702a
      const svans = new Graphics()
      svans.moveTo(0, 0).quadraticCurveTo(26, -14, 24, -44).stroke({ width: 7, color: d, cap: 'round' })
      svans.circle(24, -48, 11).fill(man)
      svans.position.set(82, -84)
      bild.addChild(svans)
      const g = new Graphics()
      ben(g, -30, -46, 24, d)
      ben(g, 52, -46, 24, d)
      g.ellipse(14, -74, 72, 44).fill(c)
      ben(g, -2, -46, 26, c)
      ben(g, 74, -46, 26, c)
      // manen: en krans av tofsar bakom huvudet
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.circle(-64 + Math.cos(a) * 40, -92 + Math.sin(a) * 40, 20).fill(i % 2 ? man : shade(man, 0.12))
      }
      g.circle(-64, -92, 46).fill(shade(man, 0.08))
      g.circle(-64, -92, 36).fill(0xf2c25a)
      g.circle(-92, -128, 11).fill(0xf2c25a)
      g.circle(-36, -128, 11).fill(0xf2c25a)
      bild.addChild(g)
      const mule = new Graphics()
      mule.ellipse(-64, -74, 17, 12).fill(0xfff0c8)
      mule.moveTo(-70, -80).lineTo(-58, -80).lineTo(-64, -72).closePath().fill(0x7a4a2a)
      bild.addChild(mule)
      return { huvud: { x: -64, y: -96, r: 32 }, svans: { g: svans, amp: 0.25, fart: 1.4 }, mund: false, hojd: 142 }
    },
  },
  hund: {
    skala: 0.86,
    ljud: 'djur_hund',
    reaktion: 'skaka',
    bygg(bild) {
      const c = 0xd9a066
      const d = shade(c, 0.2)
      const oron = 0x8a5a33
      const svans = new Graphics()
      svans.moveTo(0, 0).quadraticCurveTo(14, -12, 12, -34).stroke({ width: 10, color: c, cap: 'round' })
      svans.position.set(76, -94)
      bild.addChild(svans)
      const g = new Graphics()
      ben(g, -28, -48, 20, d)
      ben(g, 50, -48, 20, d)
      g.ellipse(12, -78, 66, 40).fill(c)
      g.ellipse(20, -70, 30, 22).fill(0xf0dcc0)
      ben(g, -2, -48, 22, c)
      ben(g, 72, -48, 22, c)
      g.circle(-62, -98, 36).fill(c)
      g.ellipse(-102, -92, 14, 30).fill(oron)
      g.ellipse(-22, -92, 14, 30).fill(oron)
      g.circle(-62, -98, 34).fill(c)
      bild.addChild(g)
      const nos = new Graphics()
      nos.ellipse(-62, -80, 19, 14).fill(0xf6e6cc)
      nos.ellipse(-62, -88, 8, 6).fill(0x33291f)
      bild.addChild(nos)
      return { huvud: { x: -62, y: -102, r: 32 }, svans: { g: svans, amp: 0.45, fart: 5.5 }, mund: true, hojd: 134 }
    },
  },
  giraff: {
    skala: 0.7,
    ljud: null,
    reaktion: 'hoppa',
    bygg(bild) {
      const c = 0xf4c74a
      const d = shade(c, 0.2)
      const fl = 0xb5772c
      const g = new Graphics()
      ben(g, -22, -92, 17, d)
      ben(g, 50, -92, 17, d)
      g.ellipse(18, -116, 62, 40).fill(c)
      ben(g, 0, -92, 18, c)
      ben(g, 70, -92, 18, c)
      // halsen
      g.moveTo(-26, -128).lineTo(-52, -214).stroke({ width: 40, color: c, cap: 'round' })
      for (const [x, y, r] of [[18, -120, 9], [44, -108, 8], [-4, -108, 7], [-34, -166, 8], [-44, -194, 7], [28, -134, 6]]) g.circle(x, y, r).fill(fl)
      // huvudet + horn
      g.ellipse(-60, -226, 39, 30).fill(c)
      g.moveTo(-74, -252).lineTo(-74, -268).stroke({ width: 5, color: fl, cap: 'round' })
      g.moveTo(-46, -252).lineTo(-46, -268).stroke({ width: 5, color: fl, cap: 'round' })
      g.circle(-74, -270, 5.5).fill(fl)
      g.circle(-46, -270, 5.5).fill(fl)
      g.ellipse(-100, -228, 11, 6).fill(shade(c, 0.1)) // öron
      g.ellipse(-20, -228, 11, 6).fill(shade(c, 0.1))
      bild.addChild(g)
      const svans = new Graphics()
      svans.moveTo(0, 0).quadraticCurveTo(10, 24, 4, 56).stroke({ width: 5, color: d, cap: 'round' })
      svans.circle(4, 58, 7).fill(fl)
      svans.position.set(76, -126)
      bild.addChild(svans)
      return { huvud: { x: -60, y: -226, r: 32 }, svans: { g: svans, amp: 0.22, fart: 1.5 }, mund: true, hojd: 274 }
    },
  },
  isbjorn: {
    skala: 0.8,
    ljud: null,
    reaktion: 'snurra',
    bygg(bild) {
      const c = 0xf6f9fc
      const k = 0xbccbdb
      const d = 0xe0e9f2
      const g = new Graphics()
      ben(g, -30, -44, 30, d)
      ben(g, 52, -44, 30, d)
      g.ellipse(14, -74, 74, 50).fill(c).stroke({ width: 3, color: k })
      ben(g, -2, -44, 32, c)
      ben(g, 76, -44, 32, c)
      g.circle(-92, -116, 13).fill(c).stroke({ width: 3, color: k })
      g.circle(-36, -116, 13).fill(c).stroke({ width: 3, color: k })
      g.circle(-92, -116, 6).fill(0xe7b8c8)
      g.circle(-36, -116, 6).fill(0xe7b8c8)
      g.circle(-64, -92, 38).fill(c).stroke({ width: 3, color: k })
      g.circle(86, -80, 10).fill(c).stroke({ width: 3, color: k })
      bild.addChild(g)
      const nos = new Graphics()
      nos.ellipse(-64, -76, 17, 12).fill(0xe6edf5)
      nos.ellipse(-64, -82, 7.5, 5.5).fill(0x2a2a33)
      bild.addChild(nos)
      return { huvud: { x: -64, y: -96, r: 34 }, mund: true, hojd: 134 }
    },
  },
}

export const ART_NAMN = Object.keys(ARTER)

// ---- Ansikten ----------------------------------------------------------------------------------
function ritaHett(g, r, mund) {
  const e = r * 0.36
  for (const sx of [-1, 1]) {
    g.circle(sx * e, -r * 0.1, r * 0.2).fill(0xfffdf7).stroke({ width: 1.5, color: 0x33291f, alpha: 0.5 })
    g.circle(sx * e + sx * 0.5, -r * 0.02, r * 0.1).fill(0x33291f)
    // tunga, trötta ögonlock (inga bryn — de såg arga ut)
    g.moveTo(sx * e - r * 0.2, -r * 0.2).lineTo(sx * e + r * 0.2, -r * 0.2).stroke({ width: 3, color: 0x6a4a36, cap: 'round' })
    g.ellipse(sx * r * 0.66, r * 0.2, r * 0.2, r * 0.13).fill({ color: 0xff6b6b, alpha: 0.5 })
  }
  if (mund) {
    // flåsar: öppen mun med tungan ute
    g.ellipse(0, r * 0.5, r * 0.2, r * 0.17).fill(0x5a2f2f)
    g.ellipse(0, r * 0.64, r * 0.13, r * 0.2).fill(0xff8aa5).stroke({ width: 1.5, color: 0xe0607d })
  }
}

function ritaSvalt(g, r, mund) {
  const e = r * 0.36
  for (const sx of [-1, 1]) {
    // blundande glada ögon (omvända bågar)
    g.moveTo(sx * e - r * 0.2, -r * 0.02).quadraticCurveTo(sx * e, -r * 0.4, sx * e + r * 0.2, -r * 0.02).stroke({ width: 3.6, color: 0x33291f, cap: 'round' })
    g.circle(sx * r * 0.68, r * 0.2, r * 0.19).fill({ color: 0x6cc4ff, alpha: 0.85 })
    g.circle(sx * r * 0.68 - r * 0.05, r * 0.14, r * 0.05).fill({ color: 0xffffff, alpha: 0.8 })
  }
  if (mund) g.moveTo(-r * 0.22, r * 0.42).quadraticCurveTo(0, r * 0.7, r * 0.22, r * 0.42).stroke({ width: 3.2, color: 0x33291f, cap: 'round' })
  else g.moveTo(-r * 0.2, r * 0.12).quadraticCurveTo(0, r * 0.26, r * 0.2, r * 0.12).stroke({ width: 3, color: 0x33291f, cap: 'round', alpha: 0.9 })
}

function droppe(r) {
  const g = new Graphics()
  g.moveTo(0, -r * 1.5).quadraticCurveTo(r * 1.1, 0, 0, r * 0.9).quadraticCurveTo(-r * 1.1, 0, 0, -r * 1.5).fill({ color: 0x7fd6ff, alpha: 0.95 })
  g.eventMode = 'none'
  return g
}

function vag(bredd) {
  const g = new Graphics()
  g.moveTo(-bredd, 0).quadraticCurveTo(-bredd / 2, -9, 0, 0).quadraticCurveTo(bredd / 2, 9, bredd, 0).stroke({ width: 4, color: 0xff8f6b, alpha: 0.7, cap: 'round' })
  g.eventMode = 'none'
  return g
}

// ---- Djur --------------------------------------------------------------------------------------
export class Djur {
  constructor(art, plats, fotY, { fxLayer, runda = 0, startSvalt = false } = {}) {
    const a = ARTER[art]
    this.art = art
    this.spec = a
    this.sk = a.skala * DJUR_STORLEK
    this.plats = plats
    this.hem = PLATSER[plats]
    this.fotY = fotY
    this.fxLayer = fxLayer
    this.sval = startSvalt ? 1 : 0 // visat värde 0..1 (varmt → svalt)
    this.mal = this.sval // vart det glider
    this.svalad = startSvalt // räknas som svalt (sjunker till false när solen värmt klart)
    this.upp = false // solen värmer det just nu
    this._fas = Math.random() * 20
    this._rikt = Math.random() < 0.5 ? -1 : 1
    this._fart = 11 + Math.random() * 7 + runda * 1.6 // px/s
    this._flip = this._rikt // visuell skala.x
    this._snurrM = 1 // pirouett: gånger skala.x (cos), 1 i vila
    this._reakt = 0 // sekunder kvar av en reaktion
    this._reaktTyp = null
    this._blot = 0 // sekunder kvar av vattendroppar som rinner av
    this._gnist = 1 + Math.random() * 2
    this._mal = null // hjälpen: vandra hit
    this.skakar = 0
    this.alive = true

    const nod = new Container()
    nod.position.set(this.hem + (Math.random() * 2 - 1) * SVANG * 0.8, fotY)
    nod.eventMode = 'static'
    nod.cursor = 'pointer'
    this.nod = nod

    const sk = new Graphics()
    sk.ellipse(0, 0, 76 * this.sk, 11).fill({ color: 0x1b3a1b, alpha: 0.2 })
    sk.eventMode = 'none'
    nod.addChild(sk)
    this.skugga = sk

    // kropp = inre barn som guppar, vänds och skakas. nod bär bara läge + träffyta.
    const kropp = new Container()
    kropp.eventMode = 'none'
    nod.addChild(kropp)
    this.kropp = kropp
    // vand = vänder djuret åt gåhållet (spelet skriver scale.x varje bildruta) · pulsa = squash/hopp
    // från feedback.js (äger sin egen scale) · skal = konstant storlek. Tre lager så ingen
    // egenskap har två skrivare.
    const vand = new Container()
    vand.eventMode = 'none'
    kropp.addChild(vand)
    this.vand = vand
    const pulsa = new Container()
    pulsa.eventMode = 'none'
    vand.addChild(pulsa)
    this.pulsa = pulsa
    const skal = new Container()
    skal.scale.set(this.sk)
    skal.eventMode = 'none'
    pulsa.addChild(skal)
    this.skal = skal
    const bild = new Container()
    bild.eventMode = 'none'
    skal.addChild(bild)
    this.bild = bild
    const info = a.bygg(bild)
    this.info = info
    this.hojd = info.hojd * this.sk

    // ansikten (ej tonade — de ska läsa tydligt)
    const { x: hx, y: hy, r } = info.huvud
    this.hett = new Graphics()
    ritaHett(this.hett, r, info.mund)
    this.svalt = new Graphics()
    ritaSvalt(this.svalt, r, info.mund)
    this.ansikte = new Container()
    this.ansikte.position.set(hx, hy)
    this.ansikte.eventMode = 'none'
    this.ansikte.addChild(this.hett, this.svalt)
    skal.addChild(this.ansikte)

    // svettdroppar + värmevågor
    this.svett = [droppe(r * 0.16), droppe(r * 0.13)]
    for (const d of this.svett) skal.addChild(d)
    this.vagor = [vag(14), vag(11), vag(14)]
    for (const v of this.vagor) skal.addChild(v)

    // träffyta: ≥ 96 px bred (110) med halo, och hela djurets höjd
    const bred = 110
    const hh = Math.max(this.hojd, 130) // lågt djur: träffytan ändå minst 130 px hög
    nod.hitArea = new Rectangle(-bred / 2 - 12, -hh - 12, bred + 24, hh + 24)
    this._apply()
  }

  get x() {
    return this.nod.x
  }
  // Bröstet — det stänket ska nå.
  get brost() {
    return { x: this.nod.x, y: this.fotY - Math.min(this.hojd * 0.45, 62) }
  }
  get huvudPos() {
    const { x, y } = this.info.huvud
    return { x: this.nod.x + x * this.sk * this._flip, y: this.fotY + y * this.sk }
  }

  // Ett träffat djur: glider till svalt och reagerar.
  traffa() {
    this.mal = 1
    this.svalad = true
    this.upp = false
    this._blot = 2.2
    this._reakt = this.spec.reaktion === 'spruta' ? 1.5 : this.spec.reaktion === 'skaka' ? 1.1 : this.spec.reaktion === 'snurra' ? 1.0 : 0.7
    this._reaktTyp = this.spec.reaktion
    this._reaktT0 = this._reakt
    if (this.spec.reaktion === 'hoppa') squash(this.pulsa, { intensity: 1.2, hop: 26 })
    else if (this.spec.reaktion === 'snurra') squash(this.pulsa, { intensity: 0.9, hop: 22 })
    else if (this.spec.reaktion === 'skaka') squash(this.pulsa, { intensity: 0.8, hop: 10 })
    else squash(this.pulsa, { intensity: 0.9, hop: 8 })
  }

  // Solen börjar värma upp djuret igen.
  varma() {
    this.upp = true
  }

  // Ett tryck på ett djur utan ballong: en glad reaktion (aldrig ett fel).
  kittla() {
    squash(this.pulsa, { intensity: 1, hop: 14 })
  }

  gaTill(x) {
    this._mal = clamp(x, 470, 1190)
  }

  _apply() {
    const s = this.sval
    this.bild.tint = lerpColor(HETT_TON, SVALT_TON, s)
    this.hett.alpha = clamp(1 - s * 1.25, 0, 1)
    this.svalt.alpha = clamp(s * 1.25 - 0.25, 0, 1)
  }

  uppdatera(dt, t, host) {
    if (!this.alive) return
    const nod = this.nod
    // --- värmen glider ---
    if (this.upp) {
      this.mal = Math.max(0, this.mal - dt / UPPVARMNING_S)
      if (this.mal < 0.34) this.svalad = false
      if (this.mal <= 0) this.upp = false
    }
    const d = this.mal - this.sval
    if (Math.abs(d) > 0.001) this.sval += clamp(d, -dt * 2.4, dt * 0.9)
    this._apply()
    const hett = 1 - this.sval

    // --- vandring ---
    const fart = this._fart * (0.55 + 0.45 * this.sval)
    let fartNu = fart
    if (this._mal != null) {
      const dx = this._mal - nod.x
      if (Math.abs(dx) < 4) {
        this.hem = this._mal
        this._mal = null
      } else {
        this._rikt = Math.sign(dx)
        fartNu = 70
      }
    } else {
      const lo = this.hem - SVANG
      const hi = this.hem + SVANG
      if (nod.x < lo) this._rikt = 1
      if (nod.x > hi) this._rikt = -1
    }
    nod.x += this._rikt * fartNu * dt
    this._fas += dt * (fartNu / 14)
    // vänd mjukt åt gåhållet (skala.x går genom noll = en liten sväng)
    this._flip += (this._rikt - this._flip) * Math.min(1, dt * 12)
    // djuret ritas med huvudet åt vänster: rikt = -1 (går åt vänster) ska ge scale +1
    const fl = -this._flip * this._snurrM
    this.vand.scale.x = Math.abs(fl) < 0.1 ? (fl < 0 ? -0.1 : 0.1) : fl
    const gupp = Math.abs(Math.sin(this._fas)) * (2.2 + 2.4 * this.sval)
    let ry = -gupp
    let rot = Math.sin(this._fas) * 0.018
    // trött och hängig när det är varmt
    this.kropp.scale.y = 1 - 0.03 * hett

    // --- reaktion ---
    if (this._reakt > 0) {
      this._reakt -= dt
      const k = clamp(this._reakt / (this._reaktT0 || 1), 0, 1)
      if (this._reaktTyp === 'snurra') {
        // pirouett: två snabba varv kring den lodräta axeln, sedan tillbaka
        this._snurrM = Math.cos((1 - k) * Math.PI * 4)
        if (k < 0.05) this._snurrM = 1
        if (Math.random() < dt * 10) this._droppar(nod.x, this.fotY - this.hojd * 0.5, Math.random() < 0.5 ? 0 : Math.PI, 2, 90, 0.6, 420)
      } else if (this._reaktTyp === 'skaka') {
        rot += Math.sin(t * 46) * 0.2 * k
        if (Math.random() < dt * 14) this._droppar(this.brost.x, this.brost.y - 20, Math.random() < 0.5 ? 0 : Math.PI, 3)
      } else if (this._reaktTyp === 'spruta' && this.info.snabel) {
        const sn = this.info.snabel
        const lift = Math.sin(clamp((1 - k) * 3, 0, Math.PI)) // upp-ned
        sn.g.rotation = -1.15 * lift * (k > 0.1 ? 1 : k * 10)
        if (k > 0.15 && Math.random() < dt * 22) {
          // snabelns spets i världen: lokal (−30,62) kring roten, roterad
          const ang = sn.g.rotation
          const lx = -30
          const ly = 62
          const rx = lx * Math.cos(ang) - ly * Math.sin(ang)
          const ry2 = lx * Math.sin(ang) + ly * Math.cos(ang)
          const wx = nod.x + (sn.px + rx) * this.sk * this.vand.scale.x
          const wy = this.fotY + (sn.py + ry2) * this.sk
          this._droppar(wx, wy, -2.2, 2, 150, 0.5, 520)
        }
      }
    } else {
      this._snurrM = 1
      if (this.info.snabel) this.info.snabel.g.rotation *= 0.85
    }
    if (this._blot > 0) {
      this._blot -= dt
      if (Math.random() < dt * 9) this._droppar(nod.x + (Math.random() * 2 - 1) * 40, this.fotY - this.hojd * (0.3 + Math.random() * 0.5), Math.PI / 2, 1, 40, 0.4, 600)
    }
    this.kropp.y = ry
    this.kropp.rotation = rot

    // --- svans ---
    const sv = this.info.svans
    if (sv) sv.g.rotation = Math.sin(t * sv.fart + this._fas) * sv.amp * (0.5 + 0.5 * this.sval)

    // --- svett och värmevågor (bara när det är varmt) ---
    const hu = this.info.huvud
    for (let i = 0; i < this.svett.length; i++) {
      const dr = this.svett[i]
      const ph = (t * 0.7 + i * 0.5 + this._fas * 0.1) % 1
      dr.alpha = hett * Math.sin(ph * Math.PI) * 0.95
      dr.position.set(hu.x + (i ? 0.92 : -0.92) * hu.r, hu.y - hu.r * 0.85 + ph * hu.r * 0.7)
    }
    for (let i = 0; i < this.vagor.length; i++) {
      const v = this.vagor[i]
      const ph = (t * 0.45 + i / 3) % 1
      v.alpha = hett * Math.sin(ph * Math.PI) * 0.9
      v.position.set(-20 + i * 46, -this.info.hojd * 0.62 - 14 - ph * 46)
    }

    // --- svalt: gnistrar ibland ---
    if (this.sval > 0.9 && host) {
      this._gnist -= dt
      if (this._gnist <= 0) {
        this._gnist = 1.6 + Math.random() * 1.8
        host.gnistra(nod.x + (Math.random() * 2 - 1) * 40, this.fotY - this.hojd * (0.4 + Math.random() * 0.5))
      }
    }
  }

  // vattendroppar (spray ur partiklar.js — exit-säkert)
  _droppar(x, y, vinkel, antal, dist = 70, spread = 1.4, grav = 420) {
    spray(this.fxLayer, x, y, {
      count: antal,
      former: ['cirkel'],
      colors: VATTEN_FARGER,
      size: 5,
      sizeVar: 0.4,
      sizeTo: 0.5,
      dist,
      distVar: 0.4,
      angle: vinkel,
      spread,
      gravity: grav,
      life: 0.7,
      lifeVar: 0.25,
    })
  }

  riv() {
    this.alive = false
    stadFx(this.nod)
    this.nod.removeAllListeners?.()
    if (!this.nod.destroyed) this.nod.destroy({ children: true })
  }
}

