// Partikelsystem på ParticleContainer — ett lager, en tween, tusen partiklar.
//
// FÖRE: varje partikel i feedback.js var en egen `Graphics` MED en egen GSAP-tween.
// `bigCelebration` = 60 Graphics + 60 tweens; varje bit hade en nod i scengrafen, en
// egen transform och en egen tesselering. Taket låg runt ~2000 samtidiga partiklar
// (mätt, se DENSITY) — vilket är exakt varför firandena varit så sparsmakade.
//
// EFTER: formerna ligger i ett litet atlasark och ritas som `Particle` i EN
// `ParticleContainer` per lager. En enda tween driver hela svärmen. Kostnaden per
// partikel går från "en nod i scengrafen" till "16 float i en buffert".
//
// Rörelsen är ANALYTISK (position räknas ur t, inte integreras) — oberoende av
// bildrutetakt, exakt reproducerbar, och billig. Utseendekurvan är medvetet identisk
// med den gamla: gsap tweenade avstånd, alpha och skala med `power2.out`, så vi
// använder samma e = 1−(1−t)² på alla tre.
//
// EXIT-SÄKERHET: samma mönster som feedback.js. Tweenen driver ett vanligt JS-objekt
// och rör partiklarna bara om containern lever; är den förstörd dödas tweenen.
// Containern är barn till spelets lager och rivs med det.
import { CanvasSource, Particle, ParticleContainer, Rectangle, Texture } from 'pixi.js'
import { gsap } from 'gsap'
import { PLAYFUL } from './theme.js'
import { VIEW } from './view.js'

// Cellstorlek i arket och den radie formerna ritas med. Skalan i spray() räknas som
// `storlek / FORM_R`, så en partikel med storlek 10 ser ut att ha radie 10.
const CELL = 48
const FORM_R = 20
const ARK_RES = 2 // arket ritas i 2x så partiklarna inte mjuknar när världen skalas upp

// Täthetsfaktor — hur många gånger fler partiklar än den gamla Graphics-vägen gav.
//
// MÄTT (scripts/_fpsprobe.mjs, headless Chrome, CPU 6x strypt, 4 s per punkt):
//
//   levande partiklar   ParticleContainer   Graphics (gamla vägen)
//        ~500                 57,6 FPS            57,2 FPS
//       ~2 100                57,7 FPS            43,5 FPS
//       ~3 000                   —                27,6 FPS
//       ~4 200                57,4 FPS            22,7 FPS
//      ~10 600                57,2 FPS               —
//      ~21 800                56,5 FPS               —
//
// Gamla vägen viker vid ~2 000 samtidiga partiklar. Den nya håller full bildfrekvens
// vid 21 800 och var fortfarande inte flaskhalsen när mätningen slutade.
//
// 3 är valt på UTSEENDE, inte på budget: vid 3 känns ett firande som ett firande
// medan skärmen inte blir en gröt. Toppen i verklig lek landar kring 300–600
// samtidiga, mitt i det platta området. P0 ÖVERSTIMULERING sätter den övre gränsen
// här, inte GPU:n.
//
// FÖRBEHÅLL: mätt på en strypt utvecklardator, inte på målplattan, och CPU-strypning
// missgynnar den gamla (CPU-bundna) vägen mer än den nya (GPU-bundna). Marginalen är
// ändå så stor att slutsatsen håller. Mät om på riktig hårdvara innan siffran höjs:
// npm run build && npm run serve.
export const DENSITY = 3

// --- atlasarket ------------------------------------------------------------
//
// Arket ritas med CANVAS2D, inte med Pixi Graphics + renderer.generateTexture().
//
// Det var inte det första försöket, och skälet är mätt: generateTexture() byter
// rendermål mitt i en bildruta. Med den lösningen gav `npm run test:all` (72 spel,
// fyra parallella webbläsare) tomma skärmdumpar — `tom-scen`-fynd i 5 av 7 körningar,
// mot 0 av 5 på HEAD — och en gång "WebGL context could not be created" i det enda
// 3D-spelet. Att baka tidigt vid uppstart i stället för lat vid första poffen
// hjälpte inte. Canvas2D rör inte GL-tillståndet alls: inget rendermål byts, ingen
// renderare behöver ens finnas, och arket kan byggas innan appen startat.
//
// Alla former ritas VITA så att tint kan färga dem, centrerade i sin cell.
const FORMER = ['cirkel', 'ruta', 'stjarna', 'gnista', 'ring']

function ritaForm(ctx, namn, cx, cy) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#ffffff'
  if (namn === 'cirkel') {
    ctx.beginPath()
    ctx.arc(0, 0, FORM_R, 0, Math.PI * 2)
    ctx.fill()
  } else if (namn === 'ruta') {
    ctx.fillRect(-FORM_R * 0.8, -FORM_R * 0.8, FORM_R * 1.6, FORM_R * 1.6)
  } else if (namn === 'ring') {
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(0, 0, FORM_R - 3, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    const uddar = namn === 'gnista' ? 4 : 5
    const inre = namn === 'gnista' ? FORM_R * 0.32 : FORM_R * 0.5
    ctx.beginPath()
    for (let i = 0; i < uddar * 2; i++) {
      const r = i % 2 === 0 ? FORM_R : inre
      const a = (i / (uddar * 2)) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

let _frames = null

function frames() {
  if (_frames) return _frames
  if (typeof document === 'undefined') return null
  try {
    const cols = Math.ceil(Math.sqrt(FORMER.length))
    const rows = Math.ceil(FORMER.length / cols)
    const w = cols * CELL
    const h = rows * CELL

    const canvas = document.createElement('canvas')
    canvas.width = w * ARK_RES
    canvas.height = h * ARK_RES
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(ARK_RES, ARK_RES)
    FORMER.forEach((namn, i) => {
      ritaForm(ctx, namn, (i % cols) * CELL + CELL / 2, ((i / cols) | 0) * CELL + CELL / 2)
    })

    const source = new CanvasSource({ resource: canvas, resolution: ARK_RES, scaleMode: 'linear' })
    const ut = {}
    FORMER.forEach((namn, i) => {
      ut[namn] = new Texture({
        source,
        frame: new Rectangle((i % cols) * CELL, ((i / cols) | 0) * CELL, CELL, CELL),
        defaultAnchor: { x: 0.5, y: 0.5 },
        label: `fx:${namn}`,
      })
    })
    _frames = ut
    return _frames
  } catch {
    return null
  }
}

// Är partikelvägen tillgänglig? feedback.js frågar och faller tillbaka på sin gamla
// Graphics-väg om svaret är nej.
export function redo() {
  return !!frames()
}

// Hämta (eller skapa) lagrets partikelfält. Fältet cachas på lagret och läggs överst
// varje gång, så effekter alltid ritas ovanpå — samma resultat som när varje partikel
// la sig sist i barnlistan.
//
// Fältnamnet är `_fxField`: `_fx`-prefixet är redan feedback.js:s revir och krockar
// inte med Pixis interna transform-cache (se CLAUDE.md om `_cx`).
//
// BLANDNINGEN SITTER PÅ CONTAINERN, inte på partikeln — Pixi packar hela fältet i ett
// enda anrop, så alla partiklar i samma fält delar blendMode. Additiva gnistor behöver
// därför ett EGET fält (`_fxFieldAdd`). Det kostar ett draw call extra medan det finns
// och rivs precis som det vanliga när sista partikeln dött (se stad()).
const FALT_NYCKEL = { normal: '_fxField', add: '_fxFieldAdd' }

function faltFor(layer, blend = 'normal') {
  const nyckel = FALT_NYCKEL[blend] || FALT_NYCKEL.normal
  const cached = layer[nyckel]
  if (cached && !cached.destroyed) {
    if (cached.parent !== layer) layer.addChild(cached)
    else if (layer.children[layer.children.length - 1] !== cached) layer.setChildIndex(cached, layer.children.length - 1)
    return cached
  }
  const f = frames()
  if (!f) return null
  const pc = new ParticleContainer({
    // scale bor i `vertex`, alpha+tint i `color` (Pixi packar dem ihop). Alla tre
    // ändras varje bildruta; `uvs` gör det aldrig — partikeln behåller sin form.
    dynamicProperties: { vertex: true, position: true, rotation: true, color: true, uvs: false },
  })
  pc.eventMode = 'none'
  pc.interactiveChildren = false
  pc.texture = f.cirkel
  if (blend === 'add') pc.blendMode = 'add'
  pc._fxNyckel = nyckel
  layer[nyckel] = pc
  layer.addChild(pc)
  return pc
}

function slumpUr(arr) {
  return arr[(Math.random() * arr.length) | 0]
}

/**
 * Kasta ut en svärm partiklar från en punkt.
 *
 * Returnerar true om partikelvägen användes, false om anroparen måste rita själv.
 *
 * @param {Container} layer  lagret partiklarna ska bo i
 * @param {number} x,y       utgångspunkt i designkoordinater
 * @param {object} o
 *   count    antal (multipliceras med DENSITY)
 *   former   formnamn att slumpa ur, t.ex. ['cirkel','stjarna']
 *   colors   färger att slumpa ur (0xRRGGBB)
 *   size     medelradie i px · sizeVar  variation som andel (0.4 = ±40 %)
 *   sizeTo   slutskala relativt start (0.2 = krymper till en femtedel)
 *   dist     medelavstånd i px · distVar  variation som andel
 *   angle    riktning i radianer (null = jämnt runt hela varvet)
 *   spread   spridning i radianer kring `angle`
 *   jamn     true = fördela vinklarna jämnt i stället för att slumpa dem
 *   gravity  px/s² nedåt utöver utkastet
 *   spin     rotation i radianer över livet (±)
 *   life     medellivstid i sekunder · lifeVar  variation som andel
 *   alpha    starttransparens
 *   blend    'normal' · 'add' (additiv glöd — gnistor, eld, magi. Se lib/glod.js)
 */
export function spray(layer, x, y, o = {}) {
  if (!layer || layer.destroyed) return false
  const f = frames()
  if (!f) return false
  const field = faltFor(layer, o.blend)
  if (!field) return false

  const {
    count = 12,
    former = ['cirkel'],
    colors = PLAYFUL,
    size = 10,
    sizeVar = 0.4,
    sizeTo = 0.2,
    dist = 70,
    distVar = 0.5,
    angle = null,
    spread = Math.PI * 2,
    jamn = false,
    gravity = 0,
    spin = 0,
    life = 0.7,
    lifeVar = 0.3,
    alpha = 1,
  } = o

  const n = Math.max(1, Math.round(count * DENSITY))
  const bitar = []
  let maxLife = 0.001

  for (let i = 0; i < n; i++) {
    const tex = f[slumpUr(former)] || f.cirkel
    const a = angle == null
      ? (jamn ? (i / n) * Math.PI * 2 : Math.random() * Math.PI * 2)
      : angle + (jamn ? (i / n - 0.5) : (Math.random() - 0.5)) * spread
    const d = dist * (1 + (Math.random() * 2 - 1) * distVar)
    const s0 = (size * (1 + (Math.random() * 2 - 1) * sizeVar)) / FORM_R
    const liv = Math.max(0.05, life * (1 + (Math.random() * 2 - 1) * lifeVar))
    if (liv > maxLife) maxLife = liv

    const part = new Particle({
      texture: tex,
      x,
      y,
      anchorX: 0.5,
      anchorY: 0.5,
      scaleX: s0,
      scaleY: s0,
      rotation: Math.random() * Math.PI * 2,
      tint: slumpUr(colors),
      alpha,
    })
    field.addParticle(part)
    bitar.push({
      p: part,
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d,
      s0,
      rot0: part.rotation,
      spin: spin ? (Math.random() * 2 - 1) * spin : 0,
      liv,
    })
  }

  kor(field, bitar, maxLife, (b, e, tau) => {
    b.p.x = x + b.dx * e
    b.p.y = y + b.dy * e + 0.5 * gravity * tau * tau
    b.p.rotation = b.rot0 + b.spin * e
    const s = b.s0 * (1 + (sizeTo - 1) * e)
    b.p.scaleX = s
    b.p.scaleY = s
    b.p.alpha = alpha * (1 - e)
  })
  return true
}

/**
 * Konfettiregn över hela skärmen (firande). Bitarna faller uppifrån, vrider sig och
 * lämnar bilden nedtill — samma rörelse som den gamla bigCelebration, i ett fält.
 */
export function rain(layer, { width = 1280, height = 720, count = 60, colors = PLAYFUL, former = ['ruta', 'cirkel'] } = {}) {
  if (!layer || layer.destroyed) return false
  const f = frames()
  if (!f) return false
  const field = faltFor(layer)
  if (!field) return false

  // Regnet spawnar över det som FAKTISKT syns (VIEW, lib/view.js) — på en bred telefon
  // är det mer än width — och antalet skalas med synlig bredd så tätheten är densamma.
  // Vid 16:9 är VIEW = designrektangeln och allt blir exakt som förut.
  const n = Math.max(1, Math.round(count * DENSITY * (VIEW.width / width)))
  const bitar = []
  let maxLife = 0.001

  for (let i = 0; i < n; i++) {
    const tex = f[slumpUr(former)] || f.ruta
    const s0 = (6 + Math.random() * 7) / FORM_R
    const x0 = VIEW.left + Math.random() * VIEW.width
    const y0 = VIEW.top - 20 - Math.random() * height * 0.5
    const rot0 = Math.random() * Math.PI
    // Fallet startade förr med `delay` per bit; här bakas fördröjningen in i livet
    // så att hela regnet ändå drivs av EN tween.
    const fordroj = Math.random() * 0.4
    const liv = fordroj + 1.6 + Math.random() * 1.2
    if (liv > maxLife) maxLife = liv

    const part = new Particle({
      texture: tex,
      x: x0,
      y: y0,
      anchorX: 0.5,
      anchorY: 0.5,
      scaleX: s0,
      scaleY: s0,
      rotation: rot0,
      tint: slumpUr(colors),
      alpha: 1,
    })
    field.addParticle(part)
    bitar.push({
      p: part,
      x0,
      y0,
      dx: Math.random() * 160 - 80,
      dy: VIEW.bottom + 40 - y0,
      rot0,
      dr: Math.random() * 6 - 3,
      liv,
      vantar: fordroj / liv,
    })
  }

  kor(field, bitar, maxLife, (b, _e, _tau, t) => {
    if (t <= b.vantar) {
      b.p.x = b.x0
      b.p.y = b.y0
      return
    }
    // power1.in på själva fallet, som förut.
    const u = (t - b.vantar) / (1 - b.vantar)
    const k = u * u
    b.p.x = b.x0 + b.dx * k
    b.p.y = b.y0 + b.dy * k
    b.p.rotation = b.rot0 + b.dr * k
  })
  return true
}

// --- kontinuerliga emitters -------------------------------------------------
//
// spray() och rain() är ENGÅNGSHÄNDELSER: en svärm föds, lever och dör. Allt som
// PÅGÅR — en eld som brinner, rök ur en skorsten, en fontän, ett gnistrande spår
// efter ett föremål — går inte att bygga av dem utan att anropa spray() varje
// bildruta, och då får man en ny tween per anrop och ett hackigt, pulserande flöde.
//
// En Emitter föder i stället partiklar med en JÄMN TAKT (`rate`, partiklar/sekund)
// och driver alla från EN ticker-callback.
//
//   const eld = emitter(lager, { x: 640, y: 500, bredd: 70, rate: 40,
//     colors: [0xffd166, 0xff8c42, 0xef476f], blend: 'add',
//     speed: 90, angle: -Math.PI / 2, spread: 0.7, gravity: -40, life: 0.9 })
//   ...
//   eld.destroy()        // ALLTID i spelets destroy()
//
// ÅTERANVÄNDNING I STÄLLET FÖR NYALLOKERING: en död partikel tas inte bort ur
// fältet medan emittern går — den återuppstår på plats. En eld i jämn takt gör
// därför NOLL add/remove efter de första sekunderna. Först när emittern stoppats
// städas de döda bort, och när fältet blir tomt rivs det precis som efter en spray
// (samma regel: inget vilande fält får ligga kvar på ett app-långlivat lager).
//
// EXIT-SÄKERHET: callbacken kollar varje bildruta att lagret och fältet lever och
// river sig själv annars. Det är bältet — hängslet är att spelet anropar destroy().

const _emitterDefaults = {
  x: 0,
  y: 0,
  bredd: 0, // föds längs en linje/yta i stället för i en punkt (en eldbädd, en skorstensmynning)
  hojd: 0,
  rate: 30, // partiklar per sekund, multipliceras med DENSITY
  max: 400, // tak på samtidigt levande. P0 ÖVERSTIMULERING, inte GPU:n, sätter det här
  former: ['cirkel'],
  colors: PLAYFUL,
  blend: 'normal',
  size: 12,
  sizeVar: 0.4,
  sizeTo: 0.3,
  speed: 80, // px/s
  speedVar: 0.4,
  angle: -Math.PI / 2, // uppåt
  spread: 0.6,
  gravity: 0, // px/s² — NEGATIV betyder att partikeln stiger (rök, lågtungor)
  spin: 0,
  life: 0.9,
  lifeVar: 0.3,
  alpha: 1,
  fadeIn: 0.15, // andel av livet som tänder upp. 0 = full styrka direkt (gnistor)
}

export class Emitter {
  constructor(layer, o = {}) {
    this.layer = layer
    this.o = { ..._emitterDefaults, ...o }
    this.x = this.o.x
    this.y = this.o.y
    this.rate = this.o.rate
    this._parts = [] // {p, fodd, liv, x0, y0, vx, vy, s0, rot0, spin, dod}
    this._nu = 0
    this._rest = 0
    this._on = o.pa !== false
    this._field = null
    this._dod = false
    this._tick = (_time, deltaMS) => this.steg(Math.min(0.05, (deltaMS || 16.7) / 1000))
    gsap.ticker.add(this._tick)
  }

  // Flytta födelsepunkten (en fackla som bärs, en fontän som svänger).
  moveTo(x, y) {
    this.x = x
    this.y = y
    return this
  }

  start() {
    this._on = true
    return this
  }

  // Sluta föda. De som lever får brinna klart — en eld som slocknar tvärt
  // med alla lågor kvar i luften läser som en bugg.
  stop() {
    this._on = false
    return this
  }

  get levande() {
    let n = 0
    for (const r of this._parts) if (!r.dod) n++
    return n
  }

  // Extra skvätt utöver takten (ett vindkast i elden, ett plask i fontänen).
  puff(n = 8) {
    const f = this._falt()
    if (!f) return this
    for (let i = 0; i < Math.round(n * DENSITY); i++) this._fod(f)
    return this
  }

  // Fältet kan ha rivits under oss: en spray som tog slut medan emittern råkade
  // ha noll levande partiklar river fältet (stad()). Då är våra partiklar borta
  // med containern och vi börjar om i ett nytt fält.
  _falt() {
    if (this._field && !this._field.destroyed) return this._field
    if (this._parts.length) this._parts.length = 0
    this._field = faltFor(this.layer, this.o.blend)
    return this._field
  }

  _fod(field) {
    const o = this.o
    const f = frames()
    if (!f) return
    let rec = null
    for (const r of this._parts) {
      if (r.dod) {
        rec = r
        break
      }
    }
    if (!rec && this._parts.length >= Math.round(o.max * DENSITY)) return

    const a = o.angle + (Math.random() - 0.5) * o.spread
    const v = o.speed * (1 + (Math.random() * 2 - 1) * o.speedVar)
    const s0 = (o.size * (1 + (Math.random() * 2 - 1) * o.sizeVar)) / FORM_R
    const x0 = this.x + (o.bredd ? (Math.random() - 0.5) * o.bredd : 0)
    const y0 = this.y + (o.hojd ? (Math.random() - 0.5) * o.hojd : 0)
    const tex = f[slumpUr(o.former)] || f.cirkel
    const rot0 = Math.random() * Math.PI * 2
    const tint = slumpUr(o.colors)

    if (rec) {
      // Återuppstå på plats — ingen allokering, ingen ändring av barnlistan.
      //
      // FORMEN BYTS INTE VID ÅTERANVÄNDNING, och det är avsiktligt: fältet har
      // `dynamicProperties.uvs: false`, så texturens UV-koordinater laddas upp EN gång.
      // Ett nytt `rec.p.texture` skulle ändra formen i modellen men inte i bufferten —
      // partikeln skulle rita fel bild utan ett enda felmeddelande. Blandningen av
      // former blir ändå slumpmässig, eftersom varje plats i poolen fick sin form när
      // den skapades.
      rec.p.tint = tint
      rec.p.rotation = rot0
      rec.dod = false
    } else {
      const part = new Particle({
        texture: tex,
        x: x0,
        y: y0,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: s0,
        scaleY: s0,
        rotation: rot0,
        tint,
        alpha: 0,
      })
      field.addParticle(part)
      rec = { p: part }
      this._parts.push(rec)
    }

    rec.fodd = this._nu
    rec.liv = Math.max(0.05, o.life * (1 + (Math.random() * 2 - 1) * o.lifeVar))
    rec.x0 = x0
    rec.y0 = y0
    rec.vx = Math.cos(a) * v
    rec.vy = Math.sin(a) * v
    rec.s0 = s0
    rec.rot0 = rot0
    rec.spin = o.spin ? (Math.random() * 2 - 1) * o.spin : 0
  }

  steg(dt) {
    if (this._dod) return
    if (!this.layer || this.layer.destroyed) {
      this.destroy()
      return
    }
    const o = this.o
    this._nu += dt

    // INGET ATT GÖRA = RÖR INTE FÄLTET. Raden ser överflödig ut och är det inte:
    // `_falt()` SKAPAR ett fält om det saknas, så en stoppad och utbrunnen emitter
    // som ändå kallade på det byggde ett nytt tomt ParticleContainer varje bildruta,
    // direkt efter att den precis rivit föregående. Uppmätt i `_glodprobe.mjs`: 1 fält
    // kvar på fxLayer efter både `stop()` och `destroy()` — alltså exakt det vilande
    // fält på ett app-långlivat lager som CLAUDE.md varnar för, byggt på nytt 60 ggr/s.
    if (!this._on && !this._parts.length) return

    const field = this._falt()
    if (!field) return

    // 1. Rörelsen är ANALYTISK ur partikelns egen ålder, precis som i spray():
    //    ingen integrering betyder ingen drift och samma bana oavsett bildrutetakt.
    let nagonLever = false
    for (const r of this._parts) {
      if (r.dod) continue
      const age = this._nu - r.fodd
      if (age >= r.liv) {
        r.dod = true
        r.p.alpha = 0
        continue
      }
      nagonLever = true
      const u = age / r.liv
      r.p.x = r.x0 + r.vx * age
      r.p.y = r.y0 + r.vy * age + 0.5 * o.gravity * age * age
      const s = r.s0 * (1 + (o.sizeTo - 1) * u)
      r.p.scaleX = s
      r.p.scaleY = s
      r.p.rotation = r.rot0 + r.spin * age
      // Tänder upp över `fadeIn` av livet och slocknar över resten. Utan upptändning
      // POPPAR varje ny partikel fram i full styrka och flödet flimrar.
      r.p.alpha = o.alpha * (u < o.fadeIn ? u / o.fadeIn : 1 - (u - o.fadeIn) / (1 - o.fadeIn))
    }

    // 2. Nyfödda. Resten sparas mellan bildrutor så takten blir exakt även när
    //    rate·dt < 1 (en långsam rök föder en partikel var tredje bildruta).
    if (this._on) {
      this._rest += this.rate * DENSITY * dt
      const n = Math.floor(this._rest)
      this._rest -= n
      for (let i = 0; i < n; i++) this._fod(field)
    } else if (!nagonLever && this._parts.length) {
      // Stoppad OCH utbrunnen: lämna inget kvar. stad() river fältet om det blev tomt.
      const doda = this._parts
      this._parts = []
      stad(field, doda)
      this._field = null
    }
  }

  destroy() {
    if (this._dod) return
    this._dod = true
    gsap.ticker.remove(this._tick)
    const field = this._field
    if (field && !field.destroyed && this._parts.length) stad(field, this._parts)
    this._parts = []
    this._field = null
    this.layer = null
  }
}

/** Bekvämlighetsform: `const rok = emitter(lager, {...})`. Se Emitter ovan. */
export function emitter(layer, o = {}) {
  return new Emitter(layer, o)
}

// --- drivning -------------------------------------------------------------
//
// EN tween per svärm. `steg(bit, e, tau, t)` får både den mjukade kurvan (e), tiden i
// sekunder (tau) och den råa 0..1 (t) — olika effekter vill ha olika av dem.
function kor(field, bitar, maxLife, steg) {
  const st = { t: 0 }
  const tw = gsap.to(st, {
    t: 1,
    duration: maxLife,
    ease: 'none',
    onUpdate: () => {
      if (field.destroyed) {
        tw.kill()
        return
      }
      const t = st.t
      for (let i = 0; i < bitar.length; i++) {
        const b = bitar[i]
        const ti = Math.min(1, (t * maxLife) / b.liv)
        const inv = 1 - ti
        steg(b, 1 - inv * inv, ti * b.liv, ti)
      }
    },
    onComplete: () => stad(field, bitar),
  })
  return tw
}

function stad(field, bitar) {
  if (!field || field.destroyed) return
  const doda = new Set(bitar.map((b) => b.p))
  field.particleChildren = field.particleChildren.filter((p) => !doda.has(p))
  field.update()

  // Tomt fält rivs direkt. `fxLayer` lever hela appens livstid, så ett fält som
  // cachades där skulle annars ligga kvar med sina GPU-buffertar för alltid — och
  // varje spelrot som någonsin poffat skulle bära en till. Mellan effekterna ska
  // appen ha exakt samma avtryck som innan partikelsystemet fanns.
  //
  // Tomt betyder garanterat att ingen svärm lever: partiklarna läggs till synkront i
  // spray()/rain() INNAN tweenen startar, så en pågående svärm har alltid kvar minst
  // en partikel i listan.
  if (field.particleChildren.length === 0) {
    const layer = field.parent
    const nyckel = field._fxNyckel || FALT_NYCKEL.normal
    if (layer && layer[nyckel] === field) layer[nyckel] = null
    field.destroy()
  }
}
