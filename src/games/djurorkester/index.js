// Djurorkester — musiklek/leksak (2–4 år). Sex djur STÅR FRITT på en liten teaterscen (mörk
// vägg med målad måne, trägolv, rampljus, röda ridåer) var och en på sin färgade podietunna
// med ett riktigt ritat instrument i händerna. Framför scenen, i orkestergraven, står
// dirigent-Bobo med taktpinne och slår takten. En lugn bakgrundstakt pulserar hela tiden —
// djuren guppar och lamporna blinkar i takt. Tryck på ett djur → det sjunger (squash + hopp,
// instrumentet och huvudet reagerar, rampljuset flammar upp, en not flyger upp till
// notlinjen i scenbågen och tänds där) + djurets riktiga läte + en stämd ton. Tre olika djur
// i följd → kör: de gungar ihop, ackord, Bobo hejar. Åtta noter på linjen = en hel konsert:
// firande, djuren spelar upp barnets melodi som tack, ridån dras för och NYA djur (ur tolv)
// kliver fram. Inget mål, inga fel — det är ett instrument. Oändlig lek.
//
// Lagerordning (rot): bakvägg · tapp-fångare · rampljus · djur · ridåpaneler · ram (draperi,
// valance, notlinje) · noter · front (scenkant, orkestergrav) · Bobo · effekter.
//
// EXIT-/ÅTERSPELSSÄKERT: djurens rörelse ligger i BARN (`figur` för squash/hopp/skälv/gung,
// `vila` för guppningen) — `djur`-behållaren med `hitArea` står still. Alla fördröjda anrop går via
// ctx.later + `_tok` (konsert-token) så en gammal konsert aldrig rör den nya; proxy-tweens spåras
// i `_tw` och dödas i destroy; stadFx() städar innernoderna före rivning.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { pop, wiggle, sparkle, squash, bounceIn, liv, ripple, stadFx } from '../../lib/feedback.js'
import { drawIcon } from '../../lib/artikoner.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { tint } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { ritaInstrument, ritaKropp, ritaHander, ritaNot, ritaFlygNot, ritaPodium } from './konst.js'
import {
  W, STAFF_Y0, STAFF_DY, BOBO_X, GORDIN_OPPEN, GORDIN_STANGD,
  byggBak, ritaKon, byggRam, byggFront, byggGordiner,
} from './scen.js'

// Alla tolv djur som har ett `djur_<id>`-klipp (samma pool som vilket-djur-later).
// note = en ton i C-dur-pentaton, unik per djur, så vilken kombination som helst är konsonant
// och stora djur är LÅGA (häst, uggla, ko), små HÖGA (bi, tupp). instr = önskat instrument
// (ett annat delas ut om det redan är taget på scenen). marke = kroppsmönster (konst.js).
const DJUR = {
  hast: { id: 'hast', emoji: '🐴', fras: 'Gnägg! Gnägg!', note: 196.0, instr: 'xylophone', pals: 0xb5764a }, // G3
  uggla: { id: 'uggla', emoji: '🦉', fras: 'Hoo! Hoo!', note: 220.0, instr: 'keys', pals: 0xc98a4b }, // A3
  ko: { id: 'ko', emoji: '🐮', fras: 'Mu! Muu!', note: 261.63, instr: 'trumpet', pals: 0xf7f4ef, marke: 'flackar' }, // C4
  gris: { id: 'gris', emoji: '🐷', fras: 'Nöff! Nöff!', note: 293.66, instr: 'sax', pals: 0xf7b9c4 }, // D4
  hund: { id: 'hund', emoji: '🐶', fras: 'Voff! Voff!', note: 329.63, instr: 'drum', pals: 0xc98a4b }, // E4
  katt: { id: 'katt', emoji: '🐱', fras: 'Mjau! Mjau!', note: 392.0, instr: 'keys', pals: 0xb6c0cc }, // G4
  groda: { id: 'groda', emoji: '🐸', fras: 'Kvack! Kvack!', note: 440.0, instr: 'maracas', pals: 0x7ed06a }, // A4
  anka: { id: 'anka', emoji: '🦆', fras: 'Kvack kvack!', note: 523.25, instr: 'fiddle', pals: 0xf3ecd4 }, // C5
  far: { id: 'far', emoji: '🐑', fras: 'Bää! Bää!', note: 587.33, instr: 'tambourine', pals: 0xf0e6d8 }, // D5
  hona: { id: 'hona', emoji: '🐔', fras: 'Pock pock pock!', note: 659.25, instr: 'maracas', pals: 0xfaf6ee }, // E5
  tupp: { id: 'tupp', emoji: '🐓', fras: 'Kuckeliku!', note: 783.99, instr: 'trumpet', pals: 0xc46a45 }, // G5
  bi: { id: 'bi', emoji: '🐝', fras: 'Bzzz! Bzzz!', note: 880.0, instr: 'triangel', pals: 0xf0c33c, marke: 'rander' }, // A5
}
const ALLA = Object.keys(DJUR)
const FORSTA = ['ko', 'hund', 'katt', 'groda', 'gris', 'anka'] // konsert 1: som spelet alltid börjat
const ANDRA = ['far', 'hast', 'hona', 'bi', 'tupp', 'uggla'] // konsert 2: helt nya
const INSTR_ORDNING = ['trumpet', 'drum', 'keys', 'maracas', 'sax', 'fiddle', 'tambourine', 'xylophone', 'triangel']

// Beröm när tre olika djur sjunger ihop (kören).
const KOR_BEROM = ['Wow, de sjunger ihop!', 'En hel kör!', 'Så fint, allihop!', 'Lyssna — de sjunger ihop!']
// När ridån går upp för nästa konsert.
const NY_KONSERT = ['Nu kommer nya musikanter!', 'Här kommer en ny konsert!', 'Kolla, nya vänner på scen!']

// Sex platser i en mjuk båge på scengolvet (fötternas läge, designkoordinater). Mitten står
// längre bak (högre upp, lite mindre) = djup. Djuren sorteras på tonhöjd vänster → höger,
// och podierna får regnbågens färger i samma ordning — pitch syns som färg och plats.
const SLOT_X = [265, 415, 565, 715, 865, 1015]
const SLOT_Y = [522, 502, 486, 486, 502, 522]
const SLOT_SC = [1.12, 1.08, 1.04, 1.04, 1.08, 1.12]
const SLOT_FARG = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
// Träffyta i djurets EGNA koordinater: 140 px bred (≥ 96 + halo) och från huvudets topp till
// strax under podiet. Med skalan 1,04–1,12 blir den 146–157 px mot 150 px mellan djuren.
const HIT = new Rectangle(-70, -152, 140, 208)

// Grannarnas skälv när ett djur sjunger (dånet sprider sig, tunnas ut med avståndet, djupa
// toner skakar mer, och det finns ett TAK). Se docens §5 (2026-08-12).
const SKALV_AMP = 7
const SKALV_DJUP_REF = 329.63
const SKALV_RACKVIDD = 300
const SKALV_TAK = 11
const SKALV_AVTAG = 0.26

// Åtta tryck = en konsert (åtta noter på notlinjen), sedan firande.
const TAPS_PER_CELEBRATION = 8
const NOT_X0 = 360 // åtta platser, 80 px isär, centrerade på 640 (notlinjen går 280–1000)
const NOT_DX = 80
const NOT_SK = 1.0

// Bakgrundstakt: lugnt tempo (~80 slag/min).
const BEAT = 0.75

// Varje instrument har sin egen klang på djurets ton (bara audio.tone — inga samplade klipp).
// Nivån ligger i höjd med den gamla triangeltonen (vol 0,12). `f` är redan varierad ±3 %.
function spelaInstrument(audio, kind, f) {
  switch (kind) {
    case 'trumpet': // skarp, blåsig
    case 'sax':
      audio.tone({ freq: f, dur: 0.4, type: 'sawtooth', vol: 0.06 })
      audio.tone({ freq: f * 2, dur: 0.3, type: 'sine', vol: 0.03 })
      break
    case 'drum': // dunk: tonen glider snabbt nedåt
      audio.tone({ freq: f, dur: 0.15, type: 'sine', vol: 0.16, slideTo: f * 0.4 })
      break
    case 'xylophone': // klang med svagare överton
    case 'triangel':
      audio.tone({ freq: f, dur: 0.6, type: 'sine', vol: 0.11 })
      audio.tone({ freq: f * 2, dur: 0.4, type: 'sine', vol: 0.04 })
      break
    case 'tambourine': // kort ryck + en glittrande upprepning
      audio.tone({ freq: f, dur: 0.04, type: 'square', vol: 0.05 })
      audio.tone({ freq: f * 1.5, dur: 0.04, type: 'square', vol: 0.04, delay: 0.06 })
      audio.tone({ freq: f * 1.25, dur: 0.04, type: 'square', vol: 0.03, delay: 0.12 })
      break
    case 'maracas': // två korta skakningar
      audio.tone({ freq: f * 2, dur: 0.05, type: 'square', vol: 0.035 })
      audio.tone({ freq: f * 2, dur: 0.05, type: 'square', vol: 0.03, delay: 0.08 })
      audio.tone({ freq: f, dur: 0.3, type: 'sine', vol: 0.06 })
      break
    default: // keys, fiddle: som förut
      audio.tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.12 })
  }
}

// Notens höjd på linjen följer tonens höjd (låg ton = nere, hög = uppe), inom linjen.
const notY = (f) => {
  const t = Math.max(0, Math.min(1, Math.log2(f / 196) / Math.log2(880 / 196)))
  return STAFF_Y0 + 4 * STAFF_DY - t * 4 * STAFF_DY * 0.75
}

export default {
  id: 'djurorkester',
  titleSv: 'Djurorkester',
  icon: '🐾',
  category: 'pedagogiskt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'djurorkester',
  voiceIntro: 'Tryck på djuren så sjunger de!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._djur = []
    this._seq = [] // rullande fönster av senaste tryckta djur (för kör-belöningen)
    this._notNoder = []
    this._spelade = [] // konsertens tryck i ordning — spelas upp som tack
    this._tw = new Set() // proxy-tweens (flygande noter, ridå, gung) — dödas i destroy
    this._konsert = 1
    this._tok = 0 // ökar vid varje konsertbyte; gamla fördröjda anrop ser att de är inaktuella
    this._konsertTaps = 0
    this._fas = 'spela' // 'spela' | 'tack' | 'rida'
    this._prevIds = []
    this._beatTime = 0
    this._beatIndex = 0
    this._batonKick = 0
    this._spelat = 0 // sekunder kvar av "det spelas just nu" (Bobo slår kraftigare)
    this._swayTween = null

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._build(ctx)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _build(ctx) {
    const root = this._root
    const bak = byggBak()
    this._lampor = bak.lampor
    root.addChild(bak.c)

    // Osynlig tapp-fångare: ett tryck bredvid djuren är aldrig ett "fel" — mjukt ljud, en ring
    // och Bobo tittar dit.
    const fangare = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, 720 + 2 * BLEED_Y)
      .fill({ color: 0x000000, alpha: 0 })
    fangare.eventMode = 'static'
    fangare.on('pointertap', (e) => this._tomtTryck(ctx, e))
    root.addChild(fangare)

    this._konLager = new Container()
    this._konLager.eventMode = 'none'
    this._djurLager = new Container()
    root.addChild(this._konLager, this._djurLager)

    const g = byggGordiner()
    this._gordin = g
    root.addChild(g.c)
    this._settGordin(0)

    root.addChild(byggRam())

    // Notlinjen: åtta tomma platser (svaga skuggnoter) som tänds en efter en.
    this._notLager = new Container()
    this._notLager.eventMode = 'none'
    this._notLager.interactiveChildren = false
    for (let i = 0; i < TAPS_PER_CELEBRATION; i++) {
      const skugga = new Graphics()
        .ellipse(NOT_X0 + i * NOT_DX, STAFF_Y0 + 1.5 * STAFF_DY, 13 * NOT_SK, 9.5 * NOT_SK) // i mellanrummet mellan två linjer
        .fill({ color: 0xffe7a8, alpha: 0.45 })
      skugga.eventMode = 'none'
      this._notLager.addChild(skugga)
    }
    root.addChild(this._notLager)

    const front = byggFront()
    this._fotlampor = front.fotlampor
    root.addChild(front.c)

    // Dirigent-Bobo i orkestergraven, med taktpinne i högra handen (barn till armen, så den
    // följer med när han hejar). Pinnens slag drivs i tickern — ingen egen tween att städa.
    this._bobo = makeKaraktar({ r: 42 })
    this._bobo.view.position.set(BOBO_X, 650)
    const arm = this._bobo.armar?.[1]
    // Pinnen ligger i en behållare vid handen (Graphics ritas i origo, behållaren flyttas).
    const batonG = new Graphics()
    batonG.moveTo(0, 0).lineTo(-6, -64).stroke({ width: 5, color: 0xfff8e0, cap: 'round' })
    batonG.moveTo(0, 2).lineTo(-1.5, -16).stroke({ width: 9, color: 0xc98a17, cap: 'round' })
    batonG.circle(-6, -64, 3.6).fill(0xffffff)
    batonG.eventMode = 'none'
    this._baton = new Container()
    this._baton.addChild(batonG)
    this._baton.position.set(0.5 * 42, -0.8 * 42)
    this._baton.eventMode = 'none'
    if (arm) arm.addChild(this._baton)
    this._batonRot = -0.3
    this._baton.rotation = this._batonRot
    root.addChild(this._bobo.view)

    // Effekter (gnistor, ringar) ovanpå allt.
    this._efx = new Container()
    this._efx.eventMode = 'none'
    root.addChild(this._efx)

    this._byggKonsert(ctx, true)
  },

  // --- Konserten: vilka djur som står på scenen -----------------------------------------------

  _valjDjur() {
    const n = this._konsert
    let ids
    if (n === 1) ids = FORSTA
    else if (n === 2) ids = ANDRA
    else {
      // Fyra som INTE var med förra konserten + två som var det: alltid mest nytt, aldrig
      // samma sex två gånger i rad.
      const prev = this._prevIds
      const nya = shuffle(ALLA.filter((id) => !prev.includes(id)))
      ids = [...nya.slice(0, 4), ...shuffle(prev).slice(0, 2)]
    }
    this._prevIds = ids
    const lista = ids.map((id) => ({ ...DJUR[id] })).sort((a, b) => a.note - b.note)
    // Ett instrument per djur: önskat om det är ledigt, annars första lediga.
    const tagna = new Set()
    for (const d of lista) {
      const k = tagna.has(d.instr) ? INSTR_ORDNING.find((i) => !tagna.has(i)) : d.instr
      d.instrK = k
      tagna.add(k)
    }
    return lista
  },

  // Bygger sex djur. `forsta` = första konserten (djuren studsar in direkt, ridån är redan uppe).
  _byggKonsert(ctx, forsta) {
    this._konsertTaps = 0
    this._spelade = []
    this._seq = []
    this._fas = 'spela'
    const lista = this._valjDjur()
    lista.forEach((data, i) => {
      const d = this._byggDjur(ctx, data, i)
      this._konLager.addChild(d._ork.kon) // rampljuset ligger i eget lager BAKOM alla djur
      this._djurLager.addChild(d)
      this._djur.push(d)
      if (forsta) bounceIn(d._ork.figur, { delay: 0.06 + i * 0.06 })
    })
    this._sattTryck(!!forsta)
  },

  // Ett djur: podium (still) + figur (squash/hopp/skälv/gung) > vila (guppning) > kropp, huvud,
  // instrument, händer. Behållaren `d` bär träffytan och rör sig ALDRIG.
  _byggDjur(ctx, data, i) {
    const d = new Container()
    d.position.set(SLOT_X[i], SLOT_Y[i])
    d.scale.set(SLOT_SC[i])
    d.eventMode = 'static'
    d.interactiveChildren = false
    d.cursor = 'pointer'
    d.hitArea = HIT

    const pod = ritaPodium(SLOT_FARG[i])
    pod.scale.set(0.95)

    const figur = new Container()
    const vila = new Container()
    const kropp = ritaKropp(data)
    // Huvudet i en egen behållare (ikonen ritas i origo) — den vinglar/nickar, ikonen står still i den.
    const huvud = new Container()
    const ikon = drawIcon(data.emoji, 104)
    ikon.eventMode = 'none'
    huvud.addChild(ikon)
    huvud.position.set(0, -104)
    huvud.eventMode = 'none'
    const instr = new Container()
    instr.addChild(ritaInstrument(data.instrK, 60))
    instr.position.set(0, -26)
    instr.rotation = -0.1
    const hander = ritaHander(data)
    vila.addChild(kropp, huvud, instr, hander)
    figur.addChild(vila)
    d.addChild(pod, figur)
    liv(vila, { bob: 4, sway: 0.025, duration: 1.5 + Math.random() * 0.8, phase: Math.random() })

    // Rampljus: en kon uppifrån + en ljuspöl på golvet. Ligger i egen behållare i konlagret.
    const kon = new Container()
    kon.eventMode = 'none'
    const cone = ritaKon(SLOT_X[i], 92, SLOT_Y[i] + 30 - 92)
    const pol = new Graphics().ellipse(SLOT_X[i], SLOT_Y[i] + 20, 96, 20).fill({ color: 0xfff2b8, alpha: 0.2 })
    pol.eventMode = 'none'
    kon.addChild(cone, pol)
    kon.alpha = 0.55

    d._ork = { data, figur, vila, instr, huvud, kon, glow: 0, skalvAmp: 0, skalvT: 0, skalvHz: 10 }
    d.on('pointertap', () => this._sing(ctx, d))
    return d
  },

  // Träffytorna är av medan ridån är för; på när det spelas.
  _sattTryck(pa) {
    for (const d of this._djur) {
      if (d && !d.destroyed) d.eventMode = pa ? 'static' : 'none'
    }
  },

  _rivDjur() {
    this._swayTween?.kill()
    this._swayTween = null
    for (const d of this._djur) {
      if (!d || d.destroyed) continue
      const kon = d._ork?.kon
      stadFx(d)
      d.removeAllListeners()
      d.destroy({ children: true })
      if (kon && !kon.destroyed) kon.destroy({ children: true })
    }
    this._djur = []
    for (const n of this._notNoder) {
      if (n && !n.destroyed) {
        stadFx(n)
        n.destroy({ children: true })
      }
    }
    this._notNoder = []
  },

  // --- Tryck ----------------------------------------------------------------------------------

  _tomtTryck(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    ctx.services.audio.sfx('soft')
    ripple(this._efx, p.x, p.y, { color: 0xfff2b8, maxR: 64 })
    this._bobo?.look(p.x, p.y)
  },

  // Tryck på ett djur: omedelbar (<100 ms) återkoppling — squash + hopp på kroppen, instrumentet
  // och huvudet reagerar, rampljuset flammar, en not flyger till notlinjen, mjukt ljud, djurets
  // riktiga läte och en stämd ton (±3 % så samma djur aldrig låter mekaniskt likadant).
  _sing(ctx, d) {
    if (!this._alive || d.destroyed) return
    this._idle = 0
    const audio = ctx.services.audio
    const o = d._ork
    const data = o.data
    audio.sfx('pop')

    squash(o.figur, { hop: 46 })
    wiggle(o.huvud)
    pop(o.instr, { scale: 1.25 })
    wiggle(o.instr)
    o.glow = 1
    this._batonKick = 1.4
    this._spelat = 3.5
    this._bobo?.look(d.x, d.y - 90)

    // Riktigt förinspelat djurläte om klippet finns — annars sjunger rösten lätet.
    if (!audio.sample(`djur_${data.id}`)) ctx.services.voice.say(data.fras)
    spelaInstrument(audio, data.instrK, data.note * (0.97 + Math.random() * 0.06))

    this._skakGrannar(d)
    this._trackSequence(ctx, d)

    // Konsertmätaren: bara under själva spelandet (inte medan tack-melodin/ridån pågår).
    if (this._fas !== 'spela') return
    const i = this._konsertTaps++
    this._spelade.push(d)
    const tok = this._tok
    const farg = SLOT_FARG[this._djur.indexOf(d)] ?? 0xffffff
    this._flygNot(d.x, d.y - 150 * d.scale.y, NOT_X0 + i * NOT_DX, notY(data.note), farg, () => {
      if (tok === this._tok) this._tandNot(i, data, farg)
    })
    if (this._konsertTaps >= TAPS_PER_CELEBRATION) this._avslut(ctx)
  },

  // Dånet sprider sig: grannarna skälver (i `figur.x`, aldrig på behållaren med träffytan).
  _skakGrannar(kalla) {
    const kn = kalla._ork.data.note
    const bas = SKALV_AMP * (SKALV_DJUP_REF / kn) // låg ton = kraftigare
    for (const c of this._djur) {
      if (!c || c.destroyed || c === kalla) continue
      const o = c._ork
      const dist = Math.hypot(c.x - kalla.x, c.y - kalla.y)
      const amp = bas / (1 + dist / SKALV_RACKVIDD)
      o.skalvAmp = Math.min(SKALV_TAK, o.skalvAmp + amp)
      o.skalvT = 0
      o.skalvHz = Math.min(18, kn / 28)
    }
  },

  // Spåra "kören": tre OLIKA djur i följd → de gungar ihop + en ackord-harmoni.
  _trackSequence(ctx, d) {
    const seq = this._seq
    if (seq.length && seq[seq.length - 1]._ork.data.id === d._ork.data.id) seq.length = 0
    seq.push(d)
    if (seq.length >= 3) {
      const last3 = seq.slice(-3)
      const distinct = new Set(last3.map((c) => c._ork.data.id)).size === 3
      if (distinct) {
        this._chorus(ctx, last3)
        this._seq = []
      } else {
        this._seq = last3.slice(1)
      }
    }
  },

  // Kören: de tre djuren gungar synkront, tonerna staplas i ett litet ackord (pentatoniskt =
  // alltid glatt), gnistor och noter, Bobo hejar, och beröm.
  _chorus(ctx, ds) {
    if (!this._alive) return
    const audio = ctx.services.audio
    this._sway(ds)
    ds.forEach((c, i) => {
      const n = c._ork.data.note
      audio.tone({ freq: n, dur: 0.7, type: 'triangle', vol: 0.14, delay: i * 0.07 })
      audio.tone({ freq: n * 2, dur: 0.6, type: 'sine', vol: 0.05, delay: i * 0.07 })
      if (c.destroyed) return
      c._ork.glow = 1
      sparkle(this._efx, c.x, c.y - 150 * c.scale.y, { count: 8 })
      this._flygNot(c.x, c.y - 150 * c.scale.y, c.x + (i - 1) * 40, c.y - 150 * c.scale.y - 150, SLOT_FARG[this._djur.indexOf(c)] ?? 0xffffff, null, true)
    })
    audio.sfx('reveal')
    this._bobo?.react('heja')
    this._batonKick = 1.6
    ctx.services.voice.say(randomFrom(KOR_BEROM))
  },

  // Synkron gung på de tre djurens `figur.rotation` (fri kanal: squash äger scale, hopp äger y).
  _sway(ds) {
    this._swayTween?.kill()
    const st = { p: 0 }
    const tw = gsap.to(st, {
      p: 1,
      duration: 1.1,
      ease: 'sine.inOut',
      onUpdate: () => {
        const ang = Math.sin(st.p * Math.PI * 3) * 0.14
        for (const c of ds) if (c && !c.destroyed && c._ork.figur && !c._ork.figur.destroyed) c._ork.figur.rotation = ang
      },
      onComplete: () => {
        for (const c of ds) if (c && !c.destroyed && c._ork.figur && !c._ork.figur.destroyed) c._ork.figur.rotation = 0
      },
    })
    this._swayTween = tw
  },

  // --- Konsertmätaren (noter på notlinjen) -----------------------------------------------------

  // En not flyger i en båge till sin plats (eller stiger och tonar bort vid `fade`, för kören).
  _flygNot(x0, y0, x1, y1, farg, klar, fade = false) {
    const n = ritaFlygNot(tint(farg, 0.3))
    n.position.set(x0, y0)
    n.scale.set(0.9)
    this._notLager.addChild(n)
    const st = { t: 0 }
    const tw = gsap.to(st, {
      t: 1,
      duration: fade ? 0.9 : 0.45,
      ease: fade ? 'power1.out' : 'power2.in',
      onUpdate: () => {
        if (n.destroyed) {
          tw.kill()
          return
        }
        n.x = x0 + (x1 - x0) * st.t
        n.y = y0 + (y1 - y0) * st.t - (fade ? 0 : Math.sin(st.t * Math.PI) * 60)
        n.rotation = Math.sin(st.t * Math.PI * 2) * 0.25
        n.scale.set(0.9 - (fade ? 0 : 0.18 * st.t))
        if (fade) n.alpha = 1 - st.t * st.t
      },
      onComplete: () => {
        this._tw.delete(tw)
        if (!n.destroyed) n.destroy({ children: true })
        if (this._alive) klar?.()
      },
    })
    this._tw.add(tw)
  },

  _tandNot(i, data, farg) {
    if (!this._alive || this._notNoder[i]) return
    const n = ritaNot()
    n._not.tint = tint(farg, 0.3)
    n.position.set(NOT_X0 + i * NOT_DX, notY(data.note))
    n.scale.set(NOT_SK)
    this._notLager.addChild(n)
    this._notNoder[i] = n
    bounceIn(n, { duration: 0.3 })
  },

  // --- Konsertens slut: firande → tack-melodi → ridå → nya djur ------------------------------------

  _avslut(ctx) {
    const tok = this._tok
    this._fas = 'tack'
    this._bobo?.react('jubel')
    this._batonKick = 1.6
    // complete() firar SJÄLV (ljud + beröm + regn) — ingen egen vinstreplik här.
    ctx.progress.complete()
    for (let i = 0; i < TAPS_PER_CELEBRATION; i++) {
      ctx.later(0.5 + i * 0.05, () => {
        const n = this._notNoder[i]
        if (this._alive && tok === this._tok && n && !n.destroyed) pop(n, { scale: 1.3 })
      })
    }
    ctx.later(1.6, () => this._tackMelodi(ctx, tok))
  },

  // Djuren spelar upp barnets egen melodi, ton för ton, som tack.
  _tackMelodi(ctx, tok) {
    if (!this._alive || tok !== this._tok) return
    const steg = 0.24
    const audio = ctx.services.audio
    this._spelade.forEach((d, i) => {
      ctx.later(i * steg, () => {
        if (!this._alive || tok !== this._tok || d.destroyed) return
        spelaInstrument(audio, d._ork.data.instrK, d._ork.data.note)
        squash(d._ork.figur, { intensity: 0.7, hop: 22 })
        d._ork.glow = 1
        this._batonKick = 1.2
        const n = this._notNoder[i]
        if (n && !n.destroyed) pop(n, { scale: 1.35 })
      })
    })
    ctx.later(this._spelade.length * steg + 0.9, () => this._rida(ctx, tok))
  },

  _settGordin(p) {
    const g = this._gordin
    if (!g || g.c.destroyed) return
    const x = GORDIN_OPPEN + (GORDIN_STANGD - GORDIN_OPPEN) * p
    g.vanster.x = x
    g.hoger.x = W - x
  },

  _flytta(fran, till, dur, klar) {
    const st = { p: fran }
    const tw = gsap.to(st, {
      p: till,
      duration: dur,
      ease: 'power2.inOut',
      onUpdate: () => this._settGordin(st.p),
      onComplete: () => {
        this._tw.delete(tw)
        if (this._alive) klar?.()
      },
    })
    this._tw.add(tw)
  },

  // Ridån dras för, djuren byts bakom den, ridån går upp.
  _rida(ctx, tok) {
    if (!this._alive || tok !== this._tok) return
    this._fas = 'rida'
    this._sattTryck(false)
    ctx.services.audio.sfx('whoosh')
    this._flytta(0, 1, 0.8, () => {
      if (tok !== this._tok) return
      this._rivDjur()
      this._konsert++
      this._tok++
      this._byggKonsert(ctx, false)
      this._sattTryck(false) // ridån är fortfarande för
      this._fas = 'rida'
      const tok2 = this._tok
      ctx.later(0.35, () => this._oppna(ctx, tok2))
    })
  },

  _oppna(ctx, tok) {
    if (!this._alive || tok !== this._tok) return
    ctx.services.audio.sfx('whoosh')
    this._flytta(1, 0, 0.9, () => {
      if (tok !== this._tok) return
      this._fas = 'spela'
      this._sattTryck(true)
    })
    // De nya djuren kliver fram i takt med att ridån glider undan (mitten först).
    this._djur.forEach((d, i) => {
      bounceIn(d._ork.figur, { delay: 0.25 + Math.abs(i - 2.5) * 0.12 })
    })
    this._bobo?.react('hej')
    ctx.narTyst(() => {
      if (this._alive && tok === this._tok) ctx.services.voice.say(randomFrom(NY_KONSERT))
    })
  },

  // --- Varje bildruta ------------------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._idle += dt
    // V21: tomgången räknas från TYSTNAD — påminnelsen får aldrig kapa en replik som talar.
    if (ctx.services.voice.talar) this._idle = 0
    this._beatTime += dt
    this._spelat = Math.max(0, this._spelat - dt)

    // Slå ett nytt slag när vi passerar en takt-gräns (lugn bas-groove).
    const beatNum = Math.floor(this._beatTime / BEAT)
    if (beatNum !== this._beatIndex) {
      this._beatIndex = beatNum
      const strong = beatNum % 2 === 0
      ctx.services.audio.tone({ freq: strong ? 130.81 : 196.0, dur: 0.18, type: 'sine', vol: 0.05 })
      this._batonKick = Math.max(this._batonKick, this._spelat > 0 ? 1 : 0.5)
    }

    // Djuren guppar i takt: en liten accent i början av varje slag som klingar av (på `vila`,
    // vars scale ingen annan skriver). Skälvet ligger i `figur.x`, rampljuset i konens alfa.
    const phase = (this._beatTime % BEAT) / BEAT
    const accent = Math.max(0, 1 - phase * 3.5)
    const avtag = Math.exp(-dt / SKALV_AVTAG)
    for (const d of this._djur) {
      if (!d || d.destroyed) continue
      const o = d._ork
      if (!o.vila.destroyed) o.vila.scale.set(1 - accent * 0.02, 1 + accent * 0.04)
      if (o.skalvAmp > 0.05) {
        o.skalvT += dt
        o.skalvAmp *= avtag
        o.figur.x = Math.sin(o.skalvT * o.skalvHz * Math.PI * 2) * o.skalvAmp
      } else if (o.skalvAmp) {
        o.skalvAmp = 0
        o.figur.x = 0
      }
      o.glow = Math.max(0, o.glow - dt * 1.6)
      if (!o.kon.destroyed) o.kon.alpha = 0.5 + 0.5 * o.glow + 0.08 * accent
    }

    // Lamporna blinkar växelvis i takt.
    const on = beatNum & 1
    const puls = 0.6 + 0.4 * Math.max(0, 1 - phase * 1.6)
    for (const l of this._lampor) l.alpha = l._par === on ? puls : 0.5
    for (const l of this._fotlampor) l.alpha = l._par === on ? puls : 0.55

    // Bobos taktpinne: ett slag ner vid varje taktslag som svänger tillbaka.
    this._batonKick *= Math.exp(-dt / 0.18)
    if (this._baton && !this._baton.destroyed) this._baton.rotation = -0.3 + Math.min(1.2, this._batonKick) * 0.9

    if (this._idle > 6) {
      this._idle = 0
      if (this._fas === 'spela') {
        ctx.services.voice.say(this.voiceIntro)
        const d = randomFrom(this._djur)
        if (d && !d.destroyed) {
          pop(d._ork.figur)
          d._ork.glow = 1
          this._bobo?.look(d.x, d.y - 90)
          this._bobo?.react('nyfiken')
        }
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._swayTween?.kill()
    for (const tw of this._tw) tw.kill()
    this._tw.clear()
    for (const d of this._djur) if (d && !d.destroyed) stadFx(d)
    for (const n of this._notNoder) if (n && !n.destroyed) stadFx(n)
    this._bobo?.destroy()
    this._bobo = null
    this._baton = null
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
    this._djur = []
    this._notNoder = []
  },
}
