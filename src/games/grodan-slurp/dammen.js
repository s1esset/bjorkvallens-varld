// DAMMEN (grodan-slurp) — scenen grodan lever i: himmel efter tid på dagen, fjärran skog,
// vattnet (ett höjdfält som svarar på plask), näckrosblad som gungar, trädet med grenen,
// strandbanken, stenar, en flytande stock, vass — och grodungarna, som är spelets MOTTAGARE.
//
// Spelet (index.js) äger grodan, tungan, insekterna och rösten. Den här modulen äger bara
// sina egna kroppar och sina egna containrar i de lager spelet lämnar över:
//   himmel (fast i skärmen) → fjarran (parallax) → bakom → [grodan + tungan] → vatten →
//   [insekterna] → fram
//
// VÄRLDEN ÄR STÖRRE ÄN SKÄRMEN (L4, lib/kamera.js): `varld.w` bred (2560) och med toppen på
// `varld.topp` (−720) — dammen ligger kvar på y 0–720 och himlen/träden växer UPPÅT, så inget
// av det som redan var ritat behövde flyttas. Två stränder med var sitt högt träd (grenar på
// tre höjder), en död stam mitt i dammen, och grodkören vid ena stranden. Himlen ritas i
// skärmrummet (den står still), fjärran skog och vatten i ett långsamt parallaxlager
// (`FJARRAN`) och resten i världen. `vy()` (från spelet) är den synliga världsytan just nu —
// allt som förut läste `ctx.view` för att placera något utanför bild läser den i stället.
//
// VAL SOM GJORDES UTAN ÄGAREN (nattpass — se docs/games/grodan-slurp.md §4a):
//  1. STAMMEN är en statisk kropp (`label: 'stam'`, `typ: 'gren'`) — grodan kan slå i den
//     och tungan fastna i den. Den ligger EFTER grenen i `foremal`, så
//     `foremal.find(f => f.typ === 'gren')` ger alltid grenen. `this.gren`/`this.stam` pekar ut dem.
//  2. STOCKEN KROCKAR INTE MED NÄCKROSBLADEN (samma negativa kollisionsgrupp, `DAMM_GRUPP`).
//     En statisk bladkropp stoppade annars en 26 kg-stock som en vägg — en tung stock som fastnar
//     mot ett löv läser som en bugg, och en stock inklämd mellan två blad kom aldrig loss. Stocken
//     ritas BAKOM bladen (längre bort i dammen) och bladet gungar till när den glider förbi.
//     Grodan (`Body.nextGroup`) och hindren (grupp 0) krockar med båda som vanligt.
//  3. VATTENLINJEN PACKAS i stället för att slumpas fritt. Blad (≥ 220 px mellan mitten) och
//     stenar (får inte överlappa bladen) tävlar om samma ~885 px; en fri slumpning hittade ofta
//     ingen plats alls. Sakerna läggs i slumpad ordning med minsta luckor och överskottet fördelas
//     slumpvis. 4 blad får plats bara om de är smala och stenen är ensam — annars blir det 3.
//  4. BLADENS GUPP: kroppen jagar en fjäder med högst 1 px per `steg()` (Body.setPosition UTAN
//     fart — fällan i CLAUDE.md), och VYN FÖLJER KROPPEN EXAKT, så grodan aldrig svävar över ett
//     ritat blad. Bladen rider på höjdfältets vågor, och ett blad med något dynamiskt på sig
//     sjunker 3 px (tyngd, läst ur matters kontaktpar).
//  5. `plask()` är TYST — spelet äger plaskljudet (samma händelse ska inte låta två gånger).
//     Bilden kommer genast: våg + droppar + puff.
//  6. Utöver API:t (inga avvikelser, bara tillägg): `ytaVid(x)` (ytans y inkl. vågor),
//     `gren`, `stam`, `grodungar.titta(x, y)` (vart ungarna tittar; standard = dammens mitt).
//  7. INGA gsap-tweens i den här filen. Allt liv är per-bildruta-animation i `rita()` — då
//     finns inget som kan överleva en rivning, och `rita()` efter `destroy()` gör ingenting.
//     Molnen i `createScene` tweenar själva exit-säkert (scene.js).
//  8. Himlen är `createScene` med ett EGET tema-objekt per tid och `height: YT_Y`, så himlens
//     toning slutar exakt vid vattenytan. Skymningen får egna rosa stråk-moln + glöd + stjärnor.
//  9. Alla gradientfärger kommer ur FASTA paletter (inga slumpade färger till form.js), så
//     cacharna i form.js/scene.js växer inte per omgång — en montering bakar noll nya texturer
//     efter första gången per tid.
import { Container, Graphics } from 'pixi.js'
import { mat, Matter } from '../../lib/physics.js'
import { Flytvolym } from '../../lib/flytkraft.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { sphereFill, cylinderFill, topLightFill, verticalFill, verticalFillAlpha } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { shade, tint } from '../../lib/theme.js'
import { shuffle } from '../../lib/swedish.js'
import { puff, stadFx } from '../../lib/feedback.js'

const { Body } = Matter

export const YT_Y = 560
export const TIDER = ['morgon', 'eftermiddag', 'skymning']

const W = 1280 // SKÄRMENS bredd (himlen, fjärranbandet) — världens bredd är `this.VW`
const H = 720
// Fjärranbandets parallax (kullar, skog, bortre vatten). index.js ger lagret samma faktor.
export const FJARRAN = { x: 0.3, y: 0.3 }
const TAU = Math.PI * 2
const BLAD_TOPP = YT_Y - 6 // näckrosbladets ovansida (kroppens topp)
const BLAD_H = 14
const STOCK_W = 190
const STOCK_H = 34
// Delad negativ grupp för stock + näckrosblad (val 2 ovan). Långt från `Body.nextGroup`s
// -1, -2, … så grodans egen grupp aldrig kan råka bli densamma.
const DAMM_GRUPP = -4711

// Höjdfältet — minnet "Ytvågor via höjdfält": fast tidssteg, ETT spridningspass, dämpningen
// SIST. Talen är provkörda i node (stöt 9 → topp ~16 px, våg ~350 px/s, lugnt efter ~6 s).
const VAG_X0 = -BLEED_X
const VAG_DX = 20
const VAG_K = 0.01
const VAG_SPRID = 0.14
const VAG_DAMP = 0.975
const VAG_MAX = 22

// Bladets fjäder (px, px/s): ω ≈ 9 rad/s, lätt underdämpad → ett "gung-gung".
const BLAD_K = 80
const BLAD_C = 5
const MAX_DROPP = 56

// C-dur från C5 — ungarnas kvack klättrar ett steg per insekt mot målet.
const SKALA = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5]
const KOR_LANGD = 2.2

// Tid på dagen. Allt som blir en GRADIENT är en fast färg här (se val 9).
const PALETT = {
  morgon: {
    himmel: 0xa7d6ef, horisont: 0xffe2b8, glod: null, sol: 0xfff0c0, solU: 1010, solY: 250, moln: 2,
    dis: 0.55, disFarg: 0xfff7ec,
    kulle: 0xb4cdb6, skogFjarran: 0x94b89c, skogNara: 0x6b9a73, strandFjarran: 0x5a8858,
    fjarrVatten: 0xe6f0e6, djupTopp: 0x7ab8bd, djupBotten: 0x22505e, sand: 0xb8a47e,
    yta: 0x9fd7d6, djup: 0x2a6a7a, ytA: 0.4, djupA: 0.78, linje: 0xffffff, glitter: 0xfff6d8,
    ton: 0xfff4e6, stjarnor: 0, dimma: true, stral: 0.06,
  },
  eftermiddag: {
    himmel: 0x74c0f0, horisont: 0xd4f0fb, glod: null, sol: 0xffe27a, solU: 1050, solY: 105, moln: 3,
    dis: 0.3, disFarg: 0xeef9ff,
    kulle: 0xa9cdb5, skogFjarran: 0x86b995, skogNara: 0x4f8f58, strandFjarran: 0x467c45,
    fjarrVatten: 0xcbeef8, djupTopp: 0x5eb3d2, djupBotten: 0x184b6e, sand: 0xc7b284,
    yta: 0x7fd0ea, djup: 0x1d5f8c, ytA: 0.38, djupA: 0.8, linje: 0xffffff, glitter: 0xffffff,
    ton: 0xffffff, stjarnor: 0, dimma: false, stral: 0.07,
  },
  skymning: {
    himmel: 0x3b3f82, horisont: 0xffa36e, glod: 0xff8e9e, sol: 0xffc07a, solU: 880, solY: 478, moln: 0,
    dis: 0.34, disFarg: 0xffc8ae,
    kulle: 0xb07a90, skogFjarran: 0x8a6c96, skogNara: 0x4a4468, strandFjarran: 0x383452,
    fjarrVatten: 0xf6bb9c, djupTopp: 0x5a6d9c, djupBotten: 0x171c3a, sand: 0x8a7a78,
    yta: 0x8a90c8, djup: 0x1f2450, ytA: 0.42, djupA: 0.84, linje: 0xffe2cc, glitter: 0xffd4aa,
    ton: 0xffe6d6, stjarnor: 9, dimma: false, stral: 0.035,
  },
}

const BLAD_FARGER = [0x4f9e3a, 0x5aa845, 0x63b04a]
const ROS_FARGER = [0xff9ec4, 0xfff0f6, 0xffb8d4]
const STEN_FARGER = [0x8d949b, 0x9a948a, 0x858f99]
const BARK = 0x7a5236
const STOCK_BARK = 0x80583a
const KRONA_BAK = 0x3f8a3a
const KRONA_FRAM = [0x55a443, 0x66b24c, 0x4d9a40]
const LOV = [0x5aa845, 0x6cb84e, 0x4f9c42]
const GRAS = 0x6fb54a
const JORD = 0x8b6a45
const MOSSA = 0x6f9b3a
const UNGE_FARGER = [0x7cc653, 0x5fb24e, 0x93cf48]

// ---- småverktyg -------------------------------------------------------------------

const rnd = (a, b) => a + Math.random() * (b - a)
const rint = (a, b) => Math.floor(rnd(a, b + 1))
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const k01 = (v) => klamp(Number.isFinite(v) ? v : 0, 0, 1)
const valj = (arr) => arr[(Math.random() * arr.length) | 0]

// Dekor-container: aldrig ett träffmål (spelet äger all input).
function dekor(parent, x = 0, y = 0) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  c.position.set(x, y)
  parent.addChild(c)
  return c
}

function ritning(parent) {
  const g = new Graphics()
  g.eventMode = 'none'
  parent.addChild(g)
  return g
}

// Spetsigt blad (löv, kronblad, vassblad) från basen (x, y) i riktning `ang` (0 = rakt upp).
function spetsblad(g, x, y, ang, len, bred) {
  const dx = Math.sin(ang)
  const dy = -Math.cos(ang)
  const px = Math.cos(ang)
  const py = Math.sin(ang)
  const mx = x + dx * len * 0.5
  const my = y + dy * len * 0.5
  return g
    .moveTo(x, y)
    .quadraticCurveTo(mx + px * bred, my + py * bred, x + dx * len, y + dy * len)
    .quadraticCurveTo(mx - px * bred, my - py * bred, x, y)
    .closePath()
}

// Punkter längs en ellipsbåge — bågar ritas som polygoner, aldrig med arc() (arc-fällan).
function ellipsBage(cx, cy, rx, ry, a0, a1, n) {
  const p = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)
  }
  return p
}

function polylinje(g, pts) {
  g.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
  return g
}

// Näckrosblad sett lite snett uppifrån: platt ellips med den klassiska kilen, nerver,
// undersidans tjocklek och en ljus bakkant. Ytans mitt ligger i (0, cy).
function ritaNackrosblad(g, w, farg, { cy = -10, ry = null, skara = 1.05 } = {}) {
  const rx = w / 2
  const ryy = ry ?? Math.max(9, w * 0.068)
  const half = 0.2
  const a0 = skara + half
  const a1 = skara - half + TAU
  g.poly([0, cy + 3, ...ellipsBage(0, cy + 3, rx + 1, ryy + 1.5, a0, a1, 48)]).fill(shade(farg, 0.42))
  const kant = ellipsBage(0, cy, rx, ryy, a0, a1, 48)
  g.poly([0, cy, ...kant]).fill(topLightFill(farg, { highlight: 0.26, dark: 0.16, mid: 0.5 }))
  // Nerver från skårans spets ut mot kanten.
  for (let a = a0 + 0.3; a < a1 - 0.2; a += 0.42) {
    g.moveTo(0, cy).lineTo(Math.cos(a) * rx * 0.9, cy + Math.sin(a) * ryy * 0.86)
  }
  g.stroke({ width: 1.4, color: tint(farg, 0.42), alpha: 0.55, cap: 'round' })
  // Skårans två snittkanter.
  g.moveTo(kant[0], kant[1]).lineTo(0, cy).lineTo(kant[kant.length - 2], kant[kant.length - 1])
  g.stroke({ width: 1.5, color: shade(farg, 0.3), alpha: 0.55, cap: 'round', join: 'round' })
  // Ljus bakkant (ljuset faller uppifrån, bortre kanten fångar det).
  polylinje(g, ellipsBage(0, cy, rx - 1.5, ryy - 1, Math.PI + 0.12, TAU - 0.12, 26))
  g.stroke({ width: 2, color: tint(farg, 0.58), alpha: 0.75, cap: 'round' })
}

// Näckrosblomma: liggande ytterblad, bakre och främre kronblad, gula ståndare.
function ritaNackros(g, x, y, s, farg) {
  const kontur = { width: 1, color: shade(farg, 0.25), alpha: 0.35 }
  for (const a of [-1.5, 1.5, -1.22, 1.22]) spetsblad(g, x, y, a, 17 * s, 5.5 * s).fill(tint(farg, 0.5)).stroke(kontur)
  for (const a of [-0.78, -0.4, 0, 0.4, 0.78]) spetsblad(g, x, y - s, a, 19 * s, 5.8 * s).fill(tint(farg, 0.28)).stroke(kontur)
  g.ellipse(x, y - 6 * s, 6 * s, 3.2 * s).fill(0xffd35c)
  for (let i = -2; i <= 2; i++) g.circle(x + i * 2.3 * s, y - 8.5 * s + Math.abs(i) * 0.8 * s, 1.1 * s).fill(0xffb627)
  for (const a of [-0.98, -0.52, 0.52, 0.98]) spetsblad(g, x, y + s, a, 15 * s, 5.2 * s).fill(farg).stroke(kontur)
}

// Lövknippe: 3–5 löv i en solfjäder kring riktningen `ang`.
function lovknippe(g, x, y, ang, n, len) {
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.5 + rnd(-0.12, 0.12)
    const f = LOV[i % LOV.length]
    spetsblad(g, x, y, a, len * rnd(0.8, 1.1), len * 0.3).fill(f).stroke({ width: 1, color: shade(f, 0.3), alpha: 0.4 })
    const dx = Math.sin(a)
    const dy = -Math.cos(a)
    g.moveTo(x, y).lineTo(x + dx * len * 0.75, y + dy * len * 0.75).stroke({ width: 1, color: tint(f, 0.45), alpha: 0.6 })
  }
}

// =====================================================================================

export class Dammen {
  // phys: PhysicsWorld · lager: { himmel, fjarran, bakom, vatten, fram } · audio: ctx.services.audio
  // tid: en av TIDER · varld: { w, topp } · vy: () => synlig världsyta { left, right, top, bottom }
  constructor({ phys, lager, audio, tid, varld = {}, vy = null }) {
    this._alive = true
    this._phys = phys
    this._lager = lager
    this._audio = audio
    this._vyFn = vy
    this.VW = Math.max(W, varld.w || W)
    this.TOPP = Math.min(0, varld.topp ?? 0)
    this._vagN = Math.round((this.VW + 2 * BLEED_X) / VAG_DX) + 1
    // Fjärranbandet glider med FJARRAN.x — det måste räcka från kamerans ena ände till den andra.
    this._fjB = W + (this.VW - W) * FJARRAN.x + 2 * BLEED_X + 80
    this.tid = TIDER.includes(tid) ? tid : valj(TIDER)
    this._pal = PALETT[this.tid]
    this._t = 0
    this._stegT = null
    this._sida = Math.random() < 0.5 ? 'v' : 'h' // trädets sida
    this._sgn = this._sida === 'v' ? 1 : -1

    this.foremal = []
    this.blad = []
    this.gren = null
    this.stam = null
    this._kroppar = []
    this._rotter = []
    this._svaj = [] // { nod, bas, amp, w, fas } — vaggning per bildruta
    this._dropp = []
    this._bubblor = []
    this._nastaBubbla = rnd(0.8, 2)
    this._lastade = new Set()

    this._vag = new Float32Array(this._vagN)
    this._vagV = new Float32Array(this._vagN)
    this._vagA = new Float32Array(this._vagN)
    this._vagAcc = 0

    // guppAmp/vaggAmp sänkta från Flytvolyms standard (0.0007/0.00025): standardguppet är ~70 %
    // av tyngden, och stocken (halvhöjd 17 px) svängde MÄTT mellan y 549 och 577 med 3,3 s
    // period — helt under ytan varannan gång (`scripts/_dammstock.mjs`). Nu ~±2 px. Påverkar bara
    // kroppar med `liv` (stocken, kotten) — grodans delar läggs med `liv: false`.
    this.flytvolym = new Flytvolym({ varld: phys, ytY: YT_Y, botten: 720, vanster: 0, hoger: this.VW, motstand: 0.94, maxFart: 22, guppAmp: 0.00012, vaggAmp: 0.0001 })

    // En rot per lager. Tid-på-dagen-tonen läggs som `tint` på bakom/fram-rötterna (Container.tint
    // ärvs av barnen i Pixi v8) — billig färgsättning utan en enda extra gradient.
    this._himmelRot = this._rot(lager.himmel)
    this._fjarranRot = this._rot(lager.fjarran || lager.himmel)
    this._bakomRot = this._rot(lager.bakom)
    this._vattenRot = this._rot(lager.vatten)
    this._framRot = this._rot(lager.fram)
    this._bakomRot.tint = this._pal.ton
    this._framRot.tint = this._pal.ton
    this._kronor = []
    this._strander = []

    this._planera()
    this._byggHimmel()
    this._byggBotten()
    this._byggStenar()
    this._byggStrand(1)
    this._byggStrand(2)
    for (const t of this._plan.trad) this._byggTrad(t)
    this._byggStubbe()
    this._byggVass()
    this._byggStock()
    this._byggBlad()
    this._byggVatten()
    this._byggFram()
    this.grodungar = new Grodungar({ lager: this._framRot, audio, x: this._plan.kor.x, sida: this._plan.kor.sida })
    this._droppG = ritning(this._framRot) // dropparna överst i förgrunden

    this.startPunkt = { x: this.blad[0].x, y: BLAD_TOPP - 40 }
  }

  _rot(lager) {
    const c = dekor(lager)
    this._rotter.push(c)
    return c
  }

  // u-rummet: avstånd från trädets kant. Trädet står alltid vid u = 0; `_x` speglar till
  // världen så att all layout skrivs EN gång oavsett sida.
  _x(u) {
    return this._sida === 'v' ? u : this.VW - u
  }

  _u(x) {
    return this._sida === 'v' ? x : this.VW - x
  }

  // Matter centrerar en kropp på sin TYNGDPUNKT. En rektangel med avfasade hörn bara upptill
  // (sten, strand) får tyngdpunkten nedflyttad, så hela kroppen hamnar några px för HÖGT
  // (uppmätt: sten 30 av 300 omgångar utanför 470–520, `scripts/_dammlayout.mjs`) — grodan
  // hade stått i luften ovanför den ritade stenen. Flytta den statiska kroppen så att dess
  // översta punkt ligger exakt på `topp` (ingen fart — kroppen har aldrig stegats).
  _toppTill(body, topp) {
    const dy = topp - body.bounds.min.y
    if (Math.abs(dy) > 0.001) Body.setPosition(body, { x: body.position.x, y: body.position.y + dy })
  }

  _kropp(body, typ, view) {
    this._kroppar.push(body)
    const rec = { body, typ, klibb: true, view }
    this.foremal.push(rec)
    return rec
  }

  // ---- layout ---------------------------------------------------------------------

  _planera() {
    const P = (this._plan = {})
    const VW = this.VW
    P.strand = rnd(140, 170) // trädsidans bank (u räknat från trädsidan)
    P.strand2 = rnd(130, 165) // bortre banken (u räknat från ANDRA sidan)
    // Två höga träd, ett på varje strand, med grenar på tre höjder ut över vattnet — det är dem
    // grodan klättrar i (tunga → sving → nästa gren). Den lägsta grenen inte högre än 150: i
    // startbilden står stammen 60–80 px från kanten, och skalets hem-/ljudknapp (hörnen, träffyta
    // ned till ~134 px) hade annars legat över grenens bas (hemknappen är medvetet ogrindad).
    // Grenavståndet är MÄTT: en groda som hänger i tungan under en gren har kroppen ~160 px under
    // grenen (tungans kortaste längd 64 + kroppen), så nästa gren måste ligga inom ~400 px från
    // munnen. Första versionen hade ~300 px mellan grenarna och grodan nådde aldrig mellangrenen
    // (_klatterprobe: högsta y 317 av 4 varv) — nu ~200.
    const tradFor = (bank) => ({
      bank, // 1 = trädsidan, 2 = andra stranden (speglad)
      stamU: rnd(60, 80),
      topp: rnd(-500, -460),
      grenar: [
        { topp: rnd(150, 185), L: rnd(380, 520), a: rnd(-0.07, 0.09) },
        { topp: rnd(-50, -15), L: rnd(300, 420), a: rnd(-0.1, 0.06) },
        { topp: rnd(-265, -225), L: rnd(240, 340), a: rnd(-0.12, 0.04) },
      ],
    })
    P.trad = [tradFor(1), tradFor(2)]

    // Vattenlinjen: blad + stenar + den döda stammen packas i u ∈ [Z0, Z1] (val 3).
    const Z0 = 205
    const Z1 = VW - 205
    let nBlad = valj([6, 6, 7, 7, 8])
    let nSten = valj([2, 2, 3])
    const minLucka = (a, b) => {
      if (a.typ === 'blad' && b.typ === 'blad') return Math.max(30, 220 - (a.w + b.w) / 2)
      if (a.typ === 'sten' && b.typ === 'sten') return 36
      if (a.typ === 'stubbe' || b.typ === 'stubbe') return 60
      return 24
    }
    let rad = null
    for (let forsok = 0; forsok < 12 && !rad; forsok++) {
      const saker = [{ typ: 'stubbe', w: 70 }]
      for (let i = 0; i < nBlad; i++) saker.push({ typ: 'blad', w: rnd(130, 170) })
      for (let i = 0; i < nSten; i++) saker.push({ typ: 'sten', w: rnd(84, 120) })
      for (let p = 0; p < 40 && !rad; p++) {
        const ord = shuffle(saker)
        // Den döda stammen står inte ytterst — den ska vara något att klättra i MITT i dammen.
        const iS = ord.findIndex((o) => o.typ === 'stubbe')
        if (iS < 2 || iS > ord.length - 3) continue
        const luckor = []
        let krav = 0
        for (let i = 0; i < ord.length; i++) {
          krav += ord[i].w
          if (i > 0) {
            const l = minLucka(ord[i - 1], ord[i])
            luckor.push(l)
            krav += l
          }
        }
        if (krav <= Z1 - Z0) rad = { ord, luckor, krav }
      }
      if (!rad) {
        if (nSten > 1) nSten--
        else if (nBlad > 3) nBlad--
      }
    }
    if (!rad) {
      // Kan inte hända med den här bredden, men en scen utan blad vore död.
      rad = { ord: [{ typ: 'blad', w: 150 }, { typ: 'sten', w: 96 }, { typ: 'stubbe', w: 70 }, { typ: 'blad', w: 150 }, { typ: 'blad', w: 150 }], luckor: [24, 60, 60, 70], krav: 830 }
    }
    const slack = Z1 - Z0 - rad.krav
    const vikt = Array.from({ length: rad.ord.length + 1 }, () => 0.25 + Math.random())
    const summa = vikt.reduce((a, b) => a + b, 0)
    let u = Z0 + (slack * vikt[0]) / summa
    const blad = []
    P.stenar = []
    rad.ord.forEach((s, i) => {
      if (i > 0) u += rad.luckor[i - 1] + (slack * vikt[i]) / summa
      const mitt = u + s.w / 2
      u += s.w
      if (s.typ === 'blad') blad.push({ u: mitt, w: s.w })
      else if (s.typ === 'stubbe') P.stubbe = { u: mitt, topp: rnd(130, 190), grenar: [] }
      else P.stenar.push({ u: mitt, w: s.w, topp: rnd(470, 520), farg: valj(STEN_FARGER), mossa: Math.random() < 0.75 })
    })
    // Stubben: bruten ~400 px över vattnet, med en grenstump lågt (nås från vattnet) och en högt
    // åt andra hållet (en trappa upp mot insekterna). Första försöket var 950 px hög och stod som
    // en telefonstolpe genom hela startbilden (_varldbildprobe).
    const st = P.stubbe
    const sida = Math.random() < 0.5 ? 1 : -1
    st.grenar.push({ topp: st.topp + rnd(160, 210), L: rnd(140, 175), sida })
    st.grenar.push({ topp: st.topp + rnd(35, 60), L: rnd(120, 150), sida: -sida })

    // Startbladet: det som ligger närmast världens mitt, men inte tätt intill den döda stammen.
    const siktet = VW / 2 + rnd(-150, 150)
    const avst = (b) => Math.abs(b.u - siktet) + (Math.abs(b.u - st.u) < 200 ? 10000 : 0)
    const start = blad.reduce((a, b) => (avst(b) < avst(a) ? b : a))
    P.blad = [start, ...blad.filter((b) => b !== start)]
    P.blad.forEach((b, i) => {
      b.farg = BLAD_FARGER[i % BLAD_FARGER.length]
      b.skara = Math.random() < 0.5 ? rnd(0.85, 1.25) : Math.PI - rnd(0.85, 1.25)
    })
    // Blommor: 2–3 blad, aldrig startbladet (grodan skulle sitta på den).
    const utan = P.blad.slice(1)
    for (const b of shuffle(utan).slice(0, Math.min(utan.length, rint(2, 3)))) b.ros = { dx: rnd(-0.26, 0.26) * b.w, farg: valj(ROS_FARGER), s: rnd(0.9, 1.15) }

    // Stocken: inte i en sten eller stammen, inte under startbladet, helst inte bakom ett blad.
    const uMin = P.strand + 105
    const uMax = VW - P.strand2 - 105
    const kandidater = []
    for (let pass = 0; pass < 2 && !kandidater.length; pass++) {
      let bast = Infinity
      for (let su = Math.max(uMin, 295); su <= Math.min(uMax, VW - 295); su += 5) {
        if (P.stenar.some((s) => Math.abs(su - s.u) < STOCK_W / 2 + s.w / 2 + 12)) continue
        if (Math.abs(su - st.u) < STOCK_W / 2 + 60) continue
        if (pass === 0 && Math.abs(su - start.u) < STOCK_W / 2 + start.w / 2 + 20) continue
        const straff = P.blad.filter((b) => Math.abs(su - b.u) < STOCK_W / 2 + b.w / 2 + 6).length
        if (straff < bast) {
          bast = straff
          kandidater.length = 0
        }
        if (straff === bast) kandidater.push(su)
      }
    }
    P.stockU = kandidater.length ? valj(kandidater) : VW / 2 + 400
    P.stockU0 = uMin
    P.stockU1 = uMax

    // Vass: 1–2 strån vid varje strandkant.
    P.vass = []
    const lagg = (n, a, b, luft) => {
      for (let i = 0, forsok = 0; i < n && forsok < 40; forsok++) {
        const vu = rnd(a, b)
        if (P.vass.some((v) => Math.abs(v.u - vu) < luft)) continue
        P.vass.push({ u: vu, topp: rnd(300, 420), fas: rnd(0, TAU) })
        i++
      }
    }
    lagg(rint(1, 2), Math.max(118, P.strand - 22), P.strand + 18, 12)
    lagg(rint(1, 3), VW - P.strand2 - 22, VW - P.strand2 + 30, 16)

    // Grodkören: på ett eget blad i förgrunden vid ena stranden — en bit att ta sig till.
    const korBank = Math.random() < 0.5 ? 1 : 2
    const korU = korBank === 1 ? P.strand + rnd(150, 190) : VW - P.strand2 - rnd(150, 190)
    const korX = this._x(korU)
    P.kor = { x: korX, sida: korX < VW / 2 ? 'v' : 'h' }
  }

  // ---- himmel, fjärran skog, bortre vatten ------------------------------------------

  // Himlen står still i SKÄRMEN (lagret himmel, faktor 0): gradienten, solen, molnen,
  // skymningens glöd, stråkmoln och stjärnor. Under horisonten fylls skärmen med horisontens
  // färg — när kameran klättrar sjunker fjärranbandet och himlen måste räcka hela vägen ned.
  // Fjärranbandet (lagret fjarran, parallax FJARRAN): kullar, skog, bortre strand och vatten.
  // Allt ritas på EXAKT samma y som förut, så startbilden (kameran längst ned) är densamma.
  _byggHimmel() {
    const R = this._himmelRot
    const F = this._fjarranRot
    const p = this._pal
    const scen = createScene(
      { top: p.himmel, bottom: p.horisont, sun: p.sol, clouds: p.moln },
      { ground: false, height: YT_Y, sunX: this._sida === 'v' ? p.solU : W - p.solU, sunY: p.solY, vinjett: false }
    )
    R.addChild(scen)
    this._scen = scen
    const sx0 = -BLEED_X - 20
    const sbr = W + 2 * BLEED_X + 40
    ritning(R).rect(sx0, YT_Y - 2, sbr, H + BLEED_Y - YT_Y + 30).fill(p.horisont)

    if (p.glod) {
      // Skymningens glöd: rosa/orange ljus som stiger ur horisonten.
      ritning(R).rect(sx0, 250, sbr, YT_Y - 250).fill(verticalFillAlpha(p.glod, p.glod, 0, 0.55))
    }

    // Stjärnor (skymning): tindrar per bildruta, bara högt upp där himlen redan är djup.
    this._stjarnor = []
    for (let i = 0; i < p.stjarnor; i++) {
      const c = dekor(R, rnd(-BLEED_X, W + BLEED_X), rnd(-BLEED_Y * 0.5, 170))
      const r = rnd(2.5, 5)
      const k = r * 0.28
      ritning(c).poly([0, -r, k, -k, r, 0, k, k, 0, r, -k, k, -r, 0, -k, -k]).fill(0xfff6e0)
      this._stjarnor.push({ c, w: rnd(1.2, 2.6), fas: rnd(0, TAU) })
    }

    // Skymningens stråkmoln — långa, rosa, med varmare undersida. Driver sakta.
    this._molnStrak = []
    if (p.glod) {
      for (let i = 0; i < 4; i++) {
        const c = dekor(R, rnd(-BLEED_X, W + BLEED_X), rnd(150, 380))
        const g = ritning(c)
        const bw = rnd(90, 170)
        g.ellipse(0, 0, bw, rnd(8, 13)).fill({ color: lerpColor(p.glod, 0xffffff, 0.35), alpha: 0.7 })
        g.ellipse(bw * 0.15, 5, bw * 0.75, 5).fill({ color: 0xff8a6a, alpha: 0.5 })
        g.ellipse(-bw * 0.35, -4, bw * 0.45, 6).fill({ color: 0xffe0e6, alpha: 0.55 })
        this._molnStrak.push({ c, fart: rnd(3, 7), bw })
      }
    }

    // Fjärran kullar, skog och bortre strand. Ritordningen ÄR djupet.
    const vx0 = -BLEED_X - 20
    const vbr = this._fjB
    const x1 = vx0 + vbr
    const kulle = ritning(F)
    this._kullband(kulle, 546, 92, lerpColor(p.kulle, p.horisont, 0.3), x1)
    const skog = ritning(F)
    this._tradlinje(skog, 548, 46, p.skogFjarran, 0.35, 24, 58, x1)
    ritning(F).rect(vx0, YT_Y - 125, vbr, 117).fill(verticalFillAlpha(p.disFarg, p.disFarg, 0, p.dis))
    const nara = ritning(F)
    this._tradlinje(nara, 550, 24, p.skogNara, 0.2, 30, 70, x1)
    const strand = ritning(F)
    strand.rect(vx0, 540, vbr, 10).fill(p.strandFjarran)
    for (let x = -BLEED_X; x < x1; x += rnd(5, 14)) {
      strand.moveTo(x, 546).lineTo(x + rnd(-3, 3), 546 - rnd(5, 16))
    }
    strand.stroke({ width: 1.6, color: p.strandFjarran, alpha: 0.9, cap: 'round' })

    // Bortre vattnet (syns ovanför vår vågiga ytlinje) och det djupa vattnet bakom allt. Det
    // djupa räcker långt ned: när kameran klättrar sjunker bandet (FJARRAN.y) men dammens yta
    // sjunker fortare, och det som blir synligt emellan är bortre vatten.
    ritning(F).rect(vx0, 546, vbr, 52).fill(verticalFill(p.fjarrVatten, p.djupTopp))
    ritning(F).rect(vx0, 546, vbr, 9).fill({ color: p.skogNara, alpha: 0.28 }) // spegling
    ritning(F).rect(vx0, 596, vbr, H + BLEED_Y - 596 + 420).fill(verticalFill(p.djupTopp, p.djupBotten))
    // Avlägsna undervattensväxter — bara silhuetter i djupet.
    const fjarrVaxt = ritning(F)
    for (let x = -BLEED_X; x < x1; x += rnd(40, 110)) {
      const h = rnd(30, 90)
      fjarrVaxt.moveTo(x, 730).quadraticCurveTo(x + rnd(-14, 14), 730 - h * 0.5, x + rnd(-10, 10), 730 - h)
    }
    fjarrVaxt.stroke({ width: 5, color: lerpColor(p.djupTopp, 0x1c4a3a, 0.55), alpha: 0.45, cap: 'round' })

    // Skimmer på bortre vattnet + solens spegelgata (låg sol: morgon och skymning).
    const sk = ritning(F)
    for (let i = 0; i < 26 * (vbr / W); i++) {
      const x = rnd(-BLEED_X, x1)
      const y = rnd(549, 560)
      sk.moveTo(x, y).lineTo(x + rnd(10, 30), y)
    }
    if (p.solY > 200) {
      const sx = this._sida === 'v' ? p.solU : W - p.solU
      for (let y = 549; y < 562; y += 3) {
        const bred = rnd(14, 34) * (1 - (y - 549) / 30)
        sk.moveTo(sx - bred + rnd(-4, 4), y).lineTo(sx + bred + rnd(-4, 4), y)
      }
    }
    sk.stroke({ width: 1.6, color: 0xffffff, alpha: 0.5, cap: 'round' })
    this._skimmer = sk
  }

  // Mjuka kullar i fjärran (som scene.js band, men med vår egen horisont).
  _kullband(g, basY, amp, farg, xSlut = W + BLEED_X + 60) {
    let x = -BLEED_X - 60
    g.moveTo(x, basY + 30).lineTo(x, basY)
    while (x < xSlut) {
      const w = rnd(220, 380)
      g.quadraticCurveTo(x + w / 2, basY - amp * rnd(0.45, 1), x + w, basY)
      x += w
    }
    g.lineTo(x, basY + 30).closePath().fill(farg)
  }

  // En trädlinje: runda lövträdskupoler och spetsiga granar om vartannat.
  _tradlinje(g, basY, hojd, farg, granAndel, wMin, wMax, xSlut = W + BLEED_X + 40) {
    let x = -BLEED_X - 40
    g.moveTo(x, basY + 30).lineTo(x, basY - hojd * 0.5)
    while (x < xSlut) {
      const w = rnd(wMin, wMax)
      const h = hojd * rnd(0.55, 1)
      const slut = basY - hojd * rnd(0.35, 0.6)
      if (Math.random() < granAndel) {
        g.lineTo(x + w * 0.2, basY - h * 0.8)
        g.lineTo(x + w * 0.5, basY - h - hojd * 0.35)
        g.lineTo(x + w * 0.8, basY - h * 0.8)
        g.lineTo(x + w, slut)
      } else {
        g.bezierCurveTo(x, basY - h - w * 0.45, x + w, basY - h - w * 0.45, x + w, slut)
      }
      x += w
    }
    g.lineTo(x, basY + 30).closePath().fill(farg)
  }

  // ---- dammens botten: sand, småsten, växter, bubblor, en fisk -----------------------

  _byggBotten() {
    const R = this._bakomRot
    const p = this._pal
    const g = ritning(R)
    let x = -BLEED_X - 20
    g.moveTo(x, H + BLEED_Y + 20).lineTo(x, 694)
    while (x < this.VW + BLEED_X + 20) {
      const w = rnd(120, 260)
      g.quadraticCurveTo(x + w / 2, 692 - rnd(-8, 20), x + w, 690 + rnd(-6, 10))
      x += w
    }
    g.lineTo(x, H + BLEED_Y + 20).closePath().fill(verticalFill(p.sand, shade(p.sand, 0.45)))
    const sm = ritning(R)
    for (let i = 0; i < 34 * (this.VW / W); i++) {
      const sx = rnd(-BLEED_X, this.VW + BLEED_X)
      const sy = rnd(700, 760)
      const r = rnd(3, 11)
      sm.ellipse(sx, sy, r, r * rnd(0.5, 0.75)).fill({ color: valj([0x8d949b, 0x7a6a58, 0xa89a82, 0x6f7a70]), alpha: 0.85 })
    }
    // En sjunken kvist på botten.
    const kx = rnd(250, this.VW - 250)
    sm.moveTo(kx - 70, 712).quadraticCurveTo(kx, 700, kx + 80, 708).stroke({ width: 6, color: 0x5a4030, alpha: 0.8, cap: 'round' })
    sm.moveTo(kx - 10, 704).lineTo(kx + 12, 684).stroke({ width: 3, color: 0x5a4030, alpha: 0.8, cap: 'round' })

    // Växter som vajar (ritas om per bildruta i `_ritaBotten`).
    this._vaxter = []
    for (let i = 0; i < 12 * (this.VW / W); i++) {
      this._vaxter.push({
        x: rnd(-BLEED_X * 0.6, this.VW + BLEED_X * 0.6),
        y: rnd(700, 720),
        h: rnd(46, 104),
        w: rnd(0.9, 1.6),
        fas: rnd(0, TAU),
        amp: rnd(1.2, 2.4),
        bred: rnd(4, 7),
        farg: valj([0x3f8a4a, 0x4f9a52, 0x377a44]),
      })
    }
    this._vaxtG = ritning(R)

    // En liten fisk simmar ibland förbi nere vid botten (dekor — vattnet tonar den).
    const fc = dekor(R)
    const fg = ritning(fc)
    const ff = shade(p.djupTopp, 0.4)
    fg.poly([-12, 0, -26, -9, -22, 0, -26, 9]).fill(ff)
    fg.ellipse(0, 0, 17, 7.5).fill(ff)
    fg.poly([-2, -6, 6, -12, 8, -5]).fill(ff)
    fg.circle(9, -1.5, 1.8).fill({ color: 0xffffff, alpha: 0.7 })
    fc.alpha = 0.55
    fc.visible = false
    this._fisk = { c: fc, aktiv: false, nasta: rnd(4, 9), dir: 1, fart: 60, y: 650, fas: rnd(0, TAU) }
  }

  // ---- stenar -------------------------------------------------------------------------

  _byggStenar() {
    for (const s of this._plan.stenar) {
      const x = this._x(s.u)
      const u = s.w / 2
      const T = s.topp
      const hh = 740 - T
      const body = this._phys.rectangle(x, T + hh / 2, s.w, hh, {
        isStatic: true,
        studs: 0.6,
        ...mat('sten'),
        chamfer: { radius: [u * 0.84, u * 0.84, 0, 0] },
        label: 'sten',
      })
      this._toppTill(body, T)
      const view = dekor(this._bakomRot, x, body.position.y)
      const inre = dekor(view, 0, T - body.position.y) // ritas med toppen som origo
      const g = ritning(inre)
      const D = hh + 30
      // En liten grannsten vid foten (under vattnet).
      g.ellipse(u * 1.25, D - 40, u * 0.55, u * 0.38).fill(topLightFill(STEN_FARGER[(STEN_FARGER.indexOf(s.farg) + 1) % 3]))
      // Ett block som vidgar sig under ytan — ett stenblock på botten, inte en pelare.
      // (Kroppen är rak, ±u; det som skiljer ligger under vattnet där grodan flyter.)
      g.moveTo(-u * 1.55, D)
        .bezierCurveTo(-u * 1.62, D * 0.62, -u * 1.1, u * 1.3, -u * 0.99, u * 0.5)
        .bezierCurveTo(-u * 0.96, u * 0.1, -u * 0.5, 0, 0, 0)
        .bezierCurveTo(u * 0.55, 0, u * 0.97, u * 0.12, u, u * 0.52)
        .bezierCurveTo(u * 1.12, u * 1.35, u * 1.66, D * 0.58, u * 1.52, D)
        .closePath()
        .fill(topLightFill(s.farg, { highlight: 0.32, dark: 0.38, mid: 0.28 }))
      // En avlång knöl på blockets sida, under vattnet.
      g.ellipse(-u * 0.95, D * 0.62, u * 0.55, u * 0.4).fill({ color: shade(s.farg, 0.12), alpha: 0.7 })
      // Sprickor.
      g.moveTo(-u * 0.3, u * 0.55).quadraticCurveTo(-u * 0.15, u * 0.9, -u * 0.35, u * 1.3)
      g.moveTo(u * 0.45, u * 0.7).lineTo(u * 0.3, u * 1.05)
      g.stroke({ width: 2, color: shade(s.farg, 0.42), alpha: 0.45, cap: 'round' })
      if (s.mossa) {
        g.moveTo(-u * 0.9, u * 0.42)
          .bezierCurveTo(-u * 0.86, u * 0.04, -u * 0.46, -2, 0, -2)
          .bezierCurveTo(u * 0.5, -2, u * 0.88, u * 0.08, u * 0.93, u * 0.4)
          .quadraticCurveTo(u * 0.62, u * 0.26, u * 0.36, u * 0.38)
          .quadraticCurveTo(u * 0.1, u * 0.22, -u * 0.2, u * 0.34)
          .quadraticCurveTo(-u * 0.56, u * 0.2, -u * 0.9, u * 0.42)
          .closePath()
          .fill(topLightFill(MOSSA, { highlight: 0.3, dark: 0.25 }))
        for (let i = 0; i < 7; i++) g.circle(rnd(-u * 0.7, u * 0.7), rnd(u * 0.05, u * 0.24), rnd(1.5, 3)).fill({ color: tint(MOSSA, 0.45), alpha: 0.8 })
      } else {
        for (let i = 0; i < 5; i++) g.circle(rnd(-u * 0.6, u * 0.6), rnd(u * 0.1, u * 0.6), rnd(2, 4.5)).fill({ color: 0xd9d27a, alpha: 0.55 })
      }
      // Glansyta på axeln.
      g.ellipse(-u * 0.58, u * 0.62, u * 0.2, u * 0.1).fill({ color: 0xffffff, alpha: 0.32 })
      this._kropp(body, 'sten', view)
    }
  }

  // ---- strandbankerna (en på varje sida av världen) ----------------------------------------

  // Stranden `nr` (1 = trädsidan, 2 = andra sidan). Samma ritning, speglad: `xb(u)` räknar u från
  // just den strandens ytterkant.
  _xb(nr, u) {
    return nr === 1 ? this._x(u) : this._x(this.VW - u)
  }

  _byggStrand(nr = 1) {
    const S = nr === 1 ? this._plan.strand : this._plan.strand2
    const sgn = nr === 1 ? this._sgn : -this._sgn
    const uL = -(BLEED_X + 40)
    const uc = (uL + S) / 2
    const yc = 644
    const vanster = this._xb(nr, 0) < this.VW / 2
    const body = this._phys.rectangle(this._xb(nr, uc), yc, S - uL, 760 - 528, {
      isStatic: true,
      ...mat('tra'),
      chamfer: { radius: vanster ? [0, 22, 0, 0] : [22, 0, 0, 0] },
      label: 'strand',
    })
    this._toppTill(body, 528)
    const view = dekor(this._bakomRot, this._xb(nr, uc), yc)
    view.scale.x = sgn
    const g = ritning(view)
    const L = (u, y) => [u - uc, y - yc]
    // Jordbanken, som sluttar ut under vattnet.
    g.moveTo(...L(uL - 10, 522))
      .lineTo(...L(S - 34, 524))
      .bezierCurveTo(...L(S - 12, 524), ...L(S + 2, 532), ...L(S + 6, 552))
      .bezierCurveTo(...L(S + 22, 588), ...L(S + 8, 622), ...L(S + 32, 652))
      .bezierCurveTo(...L(S + 56, 684), ...L(S + 40, 722), ...L(S + 70, 770))
      .lineTo(...L(S + 84, 900))
      .lineTo(...L(uL - 10, 900))
      .closePath()
      .fill(topLightFill(JORD, { highlight: 0.18, dark: 0.42, mid: 0.25 }))
    // Slänten under ytan: stenar längs kanten och alger som växer ur den.
    for (const [su, sy, rx, ry] of [[S + 14, 598, 13, 9], [S + 36, 656, 17, 11], [S + 58, 714, 20, 13], [S + 2, 640, 9, 7]]) {
      const [px, py] = L(su, sy)
      g.ellipse(px, py, rx, ry).fill(topLightFill(STEN_FARGER[2], { highlight: 0.3, dark: 0.35 }))
    }
    for (const [su, sy, h] of [[S + 20, 612, 38], [S + 44, 690, 52], [S + 8, 668, 30]]) {
      const [px, py] = L(su, sy)
      g.moveTo(px, py).quadraticCurveTo(px + 14, py - h * 0.5, px + 6, py - h)
    }
    g.stroke({ width: 4, color: 0x4f8a3e, alpha: 0.85, cap: 'round' })
    for (let i = 0; i < 5; i++) {
      const y = 560 + i * 34 + rnd(-6, 6)
      g.moveTo(...L(uL, y)).quadraticCurveTo(...L(S * 0.5, y + rnd(-6, 6)), ...L(S + (y - 540) * 0.35, y + 4))
    }
    g.stroke({ width: 2, color: shade(JORD, 0.3), alpha: 0.35, cap: 'round' })
    for (let i = 0; i < 14; i++) {
      const [px, py] = L(rnd(uL + 40, S + 10), rnd(545, 700))
      g.ellipse(px, py, rnd(3, 8), rnd(2, 5)).fill({ color: valj([0x9aa0a6, 0x7d6a55, 0xb5a58a]), alpha: 0.85 })
    }
    // Rötter som sticker ut i banken.
    g.moveTo(...L(S - 30, 540)).quadraticCurveTo(...L(S - 6, 560), ...L(S - 18, 588)).stroke({ width: 3, color: shade(BARK, 0.25), alpha: 0.7, cap: 'round' })
    // Gräskanten.
    const gr = ritning(view)
    gr.moveTo(...L(uL - 10, 518))
    for (let u = uL - 10; u < S - 22; u += 22) gr.quadraticCurveTo(...L(u + 11, 511 + rnd(-2, 2)), ...L(u + 22, 518))
    gr.quadraticCurveTo(...L(S + 4, 518), ...L(S + 9, 540))
      .lineTo(...L(S - 6, 538))
      .lineTo(...L(uL - 10, 536))
      .closePath()
      .fill(topLightFill(GRAS, { highlight: 0.3, dark: 0.18 }))
    for (let u = uL; u < S + 4; u += rnd(4, 8)) {
      const h = rnd(7, 18)
      const luta = u > S - 16 ? rnd(4, 10) : rnd(-5, 5)
      gr.moveTo(...L(u, 523)).quadraticCurveTo(...L(u + 1, 523 - h * 0.6), ...L(u + luta, 523 - h))
    }
    gr.stroke({ width: 2.2, color: shade(GRAS, 0.28), alpha: 0.85, cap: 'round' })
    for (let u = uL + 3; u < S; u += rnd(9, 16)) {
      const h = rnd(6, 13)
      gr.moveTo(...L(u, 521)).quadraticCurveTo(...L(u - 1, 521 - h * 0.6), ...L(u + rnd(-4, 4), 521 - h))
    }
    gr.stroke({ width: 1.8, color: tint(GRAS, 0.35), alpha: 0.85, cap: 'round' })
    // Små blommor i gräset.
    for (let i = 0; i < 4; i++) {
      const [bx, by] = L(rnd(10, S - 20), rnd(512, 518))
      const f = valj([0xffffff, 0xffe36e, 0xffc6e0])
      for (let k = 0; k < 5; k++) gr.circle(bx + Math.cos((k * TAU) / 5) * 2.8, by + Math.sin((k * TAU) / 5) * 2.8, 2.2).fill(f)
      gr.circle(bx, by, 1.6).fill(0xf5a623)
    }
    // Kroppen registreras för rivning direkt; i `foremal` läggs den sist (se _byggBlad).
    this._kroppar.push(body)
    this._strander.push({ body, view })
  }

  // ---- träden: hög stam, grenar på tre höjder, en krona i toppen och lövverk vid varje gren ----

  // Ett träd på strand `t.bank`. u räknas från den strandens kant (samma speglingsknep som förut),
  // och `sgn` pekar ut över vattnet. Stammen reser sig från banken (y 528) upp till `t.topp`
  // (−590…−650). Varje gren sticker ut över vattnet och får en egen liten lövklunga vid stammen,
  // så trädet läser som ETT träd även när kronan i toppen är utanför bild.
  _byggTrad(t) {
    const R = this._bakomRot
    const nr = t.bank
    const sgn = nr === 1 ? this._sgn : -this._sgn
    const sx = this._xb(nr, t.stamU)
    const puff = (du, r, lift) => ({ du: du + rnd(-15, 15), r: r * rnd(0.9, 1.1), y: 0, lift })

    // Kronans bakre puffar i toppen (bakom stammen) + mörka klungor bakom varje gren.
    const kronaBak = dekor(R, sx, 0)
    kronaBak.scale.x = sgn
    const kb = ritning(kronaBak)
    const topp = t.grenar[t.grenar.length - 1].topp
    const bak = [puff(-120, 120, 60), puff(40, 140, 95), puff(180, 110, 55), puff(305, 78, 28)]
    for (const b of bak) {
      b.y = topp - 12 - b.r - b.lift
      b.farg = KRONA_BAK
    }
    for (const g of t.grenar.slice(0, -1)) {
      for (const [du, r] of [[rnd(20, 60), rnd(80, 100)], [rnd(150, 200), rnd(58, 72)]]) bak.push({ du, r, y: g.topp - r * 0.62 - 8, farg: KRONA_BAK })
    }
    for (const b of bak) kb.circle(b.du, b.y, b.r).fill(sphereFill(KRONA_BAK, { lightY: 0.25, dark: 0.3 }))
    this._lovkant(ritning(kronaBak), bak)

    // Stammen (egen kropp, se val 1).
    const stamTopp = t.topp
    const stamCy = (stamTopp + 528) / 2
    const stamH = 528 - stamTopp
    const stamBody = this._phys.rectangle(sx, stamCy, 52, stamH, { isStatic: true, ...mat('tra'), label: 'stam' })
    const stamView = dekor(R, sx, stamCy)
    stamView.scale.x = sgn
    this._ritaStam(ritning(stamView), stamH / 2, -stamH / 2)

    // Grenarna — lätt lutande, ut över vattnet.
    const grenRecs = []
    for (const g of t.grenar) {
      const a = g.a
      const bu = t.stamU + (g.L / 2) * Math.cos(a)
      const by = g.topp + 13 + (g.L / 2) * Math.sin(a)
      const bx = this._xb(nr, bu)
      const grenBody = this._phys.rectangle(bx, by, g.L, 26, { isStatic: true, ...mat('tra'), angle: sgn * a, label: 'gren' })
      const grenView = dekor(R, bx, by)
      grenView.rotation = sgn * a
      grenView.scale.x = sgn
      this._ritaGren(grenView, g.L)
      grenRecs.push({ body: grenBody, view: grenView })
    }

    // Kronans främre puffar i toppen + en lövklunga ovanför varje lägre grens bas.
    const kronaFram = dekor(R, sx, 0)
    kronaFram.scale.x = sgn
    const kf = ritning(kronaFram)
    const fram = [
      puff(-150, 95, 25), puff(-40, 105, 12), puff(20, 80, 62), puff(95, 100, 0),
      puff(205, 82, 0), puff(300, 60, 0), puff(378, 42, 6),
    ]
    for (const f of fram) f.y = topp - 10 - f.r - f.lift
    for (const g of t.grenar.slice(0, -1)) {
      for (const [du, r] of [[rnd(-20, 20), rnd(62, 76)], [rnd(90, 130), rnd(50, 62)], [rnd(200, 250), rnd(38, 48)]]) {
        fram.push({ du, r, y: g.topp - r * 0.55 - 6, lift: 0 })
      }
    }
    for (const [i, f] of fram.entries()) {
      f.farg = KRONA_FRAM[i % 3]
      kf.circle(f.du, f.y, f.r).fill(sphereFill(f.farg, { lightY: 0.22, spread: 0.6, dark: 0.26 }))
    }
    // Löv längs puffarnas ytterkant: kronan får en taggig lövsilhuett i stället för bollar.
    this._lovkant(ritning(kronaFram), fram)
    // Lövstruktur ovanpå puffarna, så kronan läser som löv och inte som bollar.
    const lt = ritning(kronaFram)
    for (const f of fram) {
      for (let k = 0; k < Math.round(9 * (f.r / 90)); k++) {
        const ang = rnd(0, TAU)
        const rr = f.r * Math.sqrt(Math.random()) * 0.85
        const lx = f.du + Math.cos(ang) * rr
        const ly = f.y + Math.sin(ang) * rr
        const ljus = ly < f.y
        spetsblad(lt, lx, ly, rnd(-1.2, 1.2), rnd(12, 19), rnd(4, 6)).fill({ color: ljus ? 0xb8e07a : 0x2f6e2f, alpha: ljus ? 0.35 : 0.3 })
      }
    }
    // Hängande löv i toppkronans underkant — vajar var för sig.
    const toppFram = fram.slice(0, 7)
    for (let i = 0; i < 6; i++) {
      const du = rnd(-60, 400)
      const botten = toppFram.reduce((m, f) => (Math.abs(du - f.du) < f.r * 0.8 ? Math.max(m, f.y + Math.sqrt(Math.max(0, f.r * f.r - (du - f.du) ** 2))) : m), -Infinity)
      if (!Number.isFinite(botten)) continue
      const c = dekor(kronaFram, du, botten - 6)
      const lg = ritning(c)
      lg.moveTo(0, 0).lineTo(0, 7).stroke({ width: 1.4, color: 0x4a6a2a })
      const f = valj(LOV)
      spetsblad(lg, 0, 6, Math.PI + rnd(-0.3, 0.3), rnd(16, 22), 5).fill(f).stroke({ width: 1, color: shade(f, 0.3), alpha: 0.4 })
      this._svaj.push({ nod: c, bas: 0, amp: rnd(0.08, 0.16), w: rnd(1.4, 2.4), fas: rnd(0, TAU) })
    }
    this._kronor.push({ nod: kronaBak, sgn }, { nod: kronaFram, sgn })

    const recs = grenRecs.map((g) => this._kropp(g.body, 'gren', g.view))
    const stamRec = this._kropp(stamBody, 'gren', stamView)
    // `gren`/`stam` (sonder och index läser dem): trädsidans lägsta gren och dess stam.
    if (nr === 1) {
      this.gren = recs[0]
      this.stam = stamRec
    }
  }

  // ---- den döda stammen mitt i dammen: en bruten trädstam med två korta grenstumpar ----------

  _byggStubbe() {
    const st = this._plan.stubbe
    if (!st) return
    const R = this._bakomRot
    const x = this._x(st.u)
    const topp = st.topp
    const bas = 740
    const h = bas - topp
    const cy = (topp + bas) / 2
    // Stammen står från botten och en bit upp — som FAST kropp var den en vägg som delade dammen
    // i två (grodan drogs in i den och kom aldrig förbi, _bajsloopprobe L4). Den är därför typ
    // 'stubbe': index.js gör den till ett rent tungmål (krockar med ingenting, som vassen), och
    // grodan simmar framför den. Grenstumparna är vanliga fasta grenar att landa på.
    const body = this._phys.rectangle(x, cy, 44, h, { isStatic: true, isSensor: true, ...mat('tra'), label: 'stam' })
    const view = dekor(R, x, cy)
    const g = ritning(view)
    const DOD = 0x8a7358
    const b = h / 2
    const t = -h / 2
    // Stammen: grå-brun, lite smalare uppåt, bruten tagg-topp.
    g.moveTo(-26, b)
      .bezierCurveTo(-22, b - 200, -22, t + 160, -19, t + 18)
      .lineTo(-13, t + 4).lineTo(-6, t + 20).lineTo(1, t - 6).lineTo(8, t + 14).lineTo(14, t + 2).lineTo(19, t + 22)
      .bezierCurveTo(22, t + 160, 22, b - 200, 26, b)
      .closePath()
      .fill(cylinderFill(DOD, { axis: 'y', dark: 0.38, highlight: 0.2 }))
    for (const k of [-12, -3, 7, 15]) g.moveTo(k, b - 20).bezierCurveTo(k + 4, b - 240, k - 4, t + 180, k * 0.7, t + 30)
    g.stroke({ width: 2, color: shade(DOD, 0.42), alpha: 0.45, cap: 'round' })
    // Ett hackhål och mossa en bit ovanför ytan.
    g.ellipse(-4, t + 90, 8, 11).fill(0x2e2418)
    for (let i = 0; i < 7; i++) g.ellipse(rnd(-18, 16), (YT_Y - cy) - rnd(10, 60), rnd(5, 10), rnd(3, 5)).fill({ color: valj([MOSSA, tint(MOSSA, 0.25)]), alpha: 0.85 })
    // En liten svamp på sidan.
    const my = (YT_Y - cy) - rnd(110, 170)
    g.moveTo(20, my).quadraticCurveTo(38, my - 7, 36, my + 5).quadraticCurveTo(30, my + 9, 20, my + 7).closePath().fill(0xe8c07a)
    this._kropp(body, 'stubbe', view)
    // Grenstumparna.
    for (const gr of st.grenar) {
      const sgn = gr.sida
      const bx = x + sgn * (gr.L / 2 + 10)
      const by = gr.topp + 12
      const gb = this._phys.rectangle(bx, by, gr.L, 22, { isStatic: true, ...mat('tra'), angle: sgn * -0.08, label: 'gren' })
      const gv = dekor(R, bx, by)
      gv.rotation = sgn * -0.08
      gv.scale.x = sgn
      const gg = ritning(gv)
      const a = -gr.L / 2 - 8
      const e = gr.L / 2
      gg.moveTo(a, -13).bezierCurveTo(a + 40, -11, e - 30, -9, e - 6, -7).lineTo(e + 4, -12).lineTo(e + 2, 0).lineTo(e + 8, 6)
        .lineTo(e - 6, 8).bezierCurveTo(e - 30, 10, a + 40, 12, a, 15).closePath()
        .fill(cylinderFill(DOD, { axis: 'x', dark: 0.36, highlight: 0.22 }))
      for (let i = 0; i < 3; i++) gg.ellipse(rnd(a + 20, e - 20), -9, rnd(6, 11), 3).fill({ color: valj([MOSSA, tint(MOSSA, 0.3)]), alpha: 0.9 })
      this._kropp(gb, 'gren', gv)
    }
  }

  // Löv runt varje puffs kant, pekande utåt — men bara där spetsen hamnar UTANFÖR grannpuffarna,
  // så det är silhuetten som blir lövig och inte kronans insida. Ljusa löv i överkant (ljuset
  // kommer uppifrån), mörkare i underkant — samma riktning som puffens klot-toning.
  _lovkant(g, puffar) {
    for (const p of puffar) {
      const steg = 22 / p.r
      for (let fi = rnd(0, steg); fi < TAU; fi += steg * rnd(0.8, 1.2)) {
        const len = rnd(15, 24)
        const cx = Math.cos(fi)
        const cy = Math.sin(fi)
        const tx = p.du + cx * (p.r + len * 0.55)
        const ty = p.y + cy * (p.r + len * 0.55)
        if (puffar.some((o) => o !== p && Math.hypot(tx - o.du, ty - o.y) < o.r * 0.95)) continue
        const f = cy < -0.2 ? tint(p.farg, 0.16) : cy > 0.35 ? shade(p.farg, 0.14) : p.farg
        spetsblad(g, p.du + cx * p.r * 0.86, p.y + cy * p.r * 0.86, fi + Math.PI / 2 + rnd(-0.35, 0.35), len, len * 0.34).fill(f)
      }
    }
  }

  _ritaStam(g, bas, topp) {
    const b = bas
    const bark = BARK
    // Rotutlöpare in i banken.
    g.moveTo(-26, b - 44).bezierCurveTo(-42, b - 20, -60, b - 4, -74, b + 6).lineTo(-18, b + 6).closePath()
    g.moveTo(22, b - 40).bezierCurveTo(40, b - 16, 62, b - 2, 80, b + 8).lineTo(16, b + 8).closePath()
    g.fill(topLightFill(shade(bark, 0.06), { highlight: 0.2, dark: 0.3 }))
    g.moveTo(-50, b + 6)
      .bezierCurveTo(-36, b - 4, -30, b - 30, -28, b - 90)
      .bezierCurveTo(-25, b - 250, -31, topp + 260, -23, topp)
      .lineTo(23, topp)
      .bezierCurveTo(29, topp + 260, 24, b - 250, 27, b - 90)
      .bezierCurveTo(29, b - 30, 38, b - 4, 56, b + 6)
      .closePath()
      .fill(cylinderFill(bark, { axis: 'y', dark: 0.36, highlight: 0.22 }))
    // Barkfåror.
    for (const k of [-17, -7, 4, 14]) {
      g.moveTo(k, b - 16).bezierCurveTo(k + 5, b - 220, k - 5, topp + 200, k * 0.8, topp + 10)
    }
    g.stroke({ width: 2.2, color: shade(bark, 0.4), alpha: 0.45, cap: 'round' })
    for (let i = 0; i < 12; i++) {
      const y = rnd(topp + 60, b - 30)
      const x = rnd(-18, 16)
      g.moveTo(x, y).quadraticCurveTo(x + 3, y - 6, x + 6, y - 2)
    }
    g.stroke({ width: 1.6, color: tint(bark, 0.3), alpha: 0.35, cap: 'round' })
    // Kvisthål.
    g.ellipse(7, b - 215, 12, 16).fill(shade(bark, 0.18))
    g.ellipse(7, b - 214, 8, 12).fill(0x2e1d10)
    // Tickor (små svampar) på stammen.
    g.moveTo(24, b - 128).quadraticCurveTo(46, b - 134, 44, b - 121).quadraticCurveTo(36, b - 116, 24, b - 119).closePath().fill(0xe8c07a)
    g.moveTo(24, b - 110).quadraticCurveTo(40, b - 114, 38, b - 104).quadraticCurveTo(32, b - 101, 24, b - 103).closePath().fill(0xd9aa62)
    // Mossa vid foten.
    for (let i = 0; i < 9; i++) g.ellipse(rnd(-30, 28), b - rnd(4, 40), rnd(5, 11), rnd(3, 6)).fill({ color: valj([MOSSA, tint(MOSSA, 0.25)]), alpha: 0.85 })
  }

  _ritaGren(view, L) {
    const g = ritning(view)
    const bark = BARK
    const a = -L / 2 - 14
    const b = L / 2
    g.moveTo(a, -21)
      .bezierCurveTo(a + 30, -16, a + 70, -15, a + 110, -14.5)
      .bezierCurveTo(a + L * 0.45, -13.5, b - L * 0.3, -12, b - 10, -10.5)
      .quadraticCurveTo(b + 7, -10, b + 7, -0.5)
      .quadraticCurveTo(b + 7, 9.5, b - 10, 9.5)
      .bezierCurveTo(b - L * 0.3, 11.5, a + L * 0.45, 13.5, a + 110, 14.5)
      .bezierCurveTo(a + 70, 15, a + 30, 17, a, 23)
      .closePath()
      .fill(cylinderFill(bark, { axis: 'x', dark: 0.34, highlight: 0.24 }))
    for (const k of [-6, 0.5, 6]) {
      g.moveTo(a + 24, k * 1.4).bezierCurveTo(a + L * 0.35, k + 2, b - L * 0.35, k * 0.8 - 2, b - 16, k * 0.7)
    }
    g.stroke({ width: 1.8, color: shade(bark, 0.38), alpha: 0.4, cap: 'round' })
    // Ändträ i spetsen och en knast.
    g.ellipse(b + 3, -0.5, 3.5, 8).fill(0xc79a62)
    const kx = rnd(-L * 0.1, L * 0.2)
    g.ellipse(kx, 3, 6, 4).fill(shade(bark, 0.5))
    // Mossa längs ovansidan.
    for (let i = 0; i < 6; i++) {
      const mx = rnd(a + 40, b - 30)
      g.ellipse(mx, -12, rnd(8, 16), 3.5).fill({ color: valj([MOSSA, tint(MOSSA, 0.3)]), alpha: 0.9 })
    }
    // Kvistar med lövknippen — egna containrar som vajar.
    const kvist = (x, y, ang, len, lov, bas) => {
      const c = dekor(view, x, y)
      const kg = ritning(c)
      const ex = Math.sin(ang) * len
      const ey = -Math.cos(ang) * len
      kg.moveTo(0, 0).quadraticCurveTo(ex * 0.3 + 4, ey * 0.55, ex, ey).stroke({ width: 4, color: bark, cap: 'round' })
      lovknippe(kg, ex, ey, ang, lov, 20)
      this._svaj.push({ nod: c, bas, amp: rnd(0.04, 0.08), w: rnd(1.1, 1.8), fas: rnd(0, TAU) })
    }
    kvist(rnd(-L * 0.25, L * 0.05), -12, rnd(0.2, 0.6), rnd(26, 38), 4, 0)
    kvist(b + 4, -3, rnd(0.9, 1.3), 24, 3, 0)
    if (Math.random() < 0.7) kvist(rnd(L * 0.1, L * 0.3), -11, rnd(-0.5, -0.2), rnd(18, 26), 3, 0)
    // Ett hängande löv under grenen.
    const hx = rnd(-L * 0.2, L * 0.35)
    const c = dekor(view, hx, 10)
    const hg = ritning(c)
    hg.moveTo(0, 0).lineTo(0, 9).stroke({ width: 1.5, color: 0x4a6a2a })
    spetsblad(hg, 0, 8, Math.PI + 0.2, 20, 6).fill(LOV[0]).stroke({ width: 1, color: shade(LOV[0], 0.3), alpha: 0.4 })
    this._svaj.push({ nod: c, bas: 0, amp: 0.14, w: 1.9, fas: rnd(0, TAU) })
  }

  // ---- vass (sensorer: tungan fastnar, grodan krockar inte) -----------------------------

  _byggVass() {
    for (const v of this._plan.vass) {
      const x = this._x(v.u)
      const bas = 600
      const topp = v.topp
      const cy = (topp + 596) / 2
      const body = this._phys.rectangle(x, cy, 22, 596 - topp, { isStatic: true, isSensor: true, label: 'vass' })
      const view = dekor(this._bakomRot, x, cy)
      const b = bas - cy
      const t = topp - cy
      const hgt = bas - topp
      const inre = dekor(view, 0, b)
      inre.pivot.set(0, b)
      const g = ritning(inre)
      const gron = valj([0x5d9a3e, 0x6aa648, 0x548f38])
      const luta = this._sgn * (v.u < this.VW / 2 ? 1 : -1) * rnd(4, 12)
      g.moveTo(-2, b).quadraticCurveTo(-10 + luta * 0.3, b - hgt * 0.5, -18 + luta, b - hgt * 0.8).quadraticCurveTo(-4, b - hgt * 0.45, 3, b).closePath().fill(gron)
      g.moveTo(1, b).quadraticCurveTo(12, b - hgt * 0.4, 20 + luta * 0.5, b - hgt * 0.62).quadraticCurveTo(8, b - hgt * 0.36, 4, b).closePath().fill(shade(gron, 0.14))
      g.moveTo(0, b).quadraticCurveTo(2.5, b - hgt * 0.5, 0, t + 16).stroke({ width: 4, color: 0x7a9a48, cap: 'round' })
      g.roundRect(-6.5, t + 14, 13, 44, 6.5).fill(cylinderFill(0x6b4428, { axis: 'y', dark: 0.35, highlight: 0.25 }))
      g.moveTo(0, t + 15).lineTo(0.5, t).stroke({ width: 2.2, color: 0x9a7a4a, cap: 'round' })
      this._svaj.push({ nod: inre, bas: 0, amp: rnd(0.02, 0.035), w: rnd(0.8, 1.3), fas: v.fas })
      this._kropp(body, 'vass', view)
    }
  }

  // ---- stocken (dynamisk, flyter) ----------------------------------------------------------

  _byggStock() {
    const P = this._plan
    const x = this._x(P.stockU)
    const body = this._phys.rectangle(
      x,
      YT_Y,
      STOCK_W,
      STOCK_H,
      mat('tra', { density: 0.004, frictionAir: 0.02, chamfer: { radius: 14 }, collisionFilter: { group: DAMM_GRUPP }, label: 'stock' })
    )
    const view = dekor(this._bakomRot, x, YT_Y)
    const g = ritning(view)
    const w = STOCK_W
    const h = STOCK_H
    const bark = STOCK_BARK
    g.roundRect(-w / 2, -h / 2, w, h, 15).fill(cylinderFill(bark, { axis: 'x', dark: 0.36, highlight: 0.2 }))
    for (const k of [-9, -3, 3, 9]) {
      g.moveTo(-w / 2 + 16, k).bezierCurveTo(-30, k + rnd(-2, 2), 30, k + rnd(-2, 2), w / 2 - 18, k)
    }
    g.stroke({ width: 1.6, color: shade(bark, 0.38), alpha: 0.45, cap: 'round' })
    g.ellipse(-28, -3, 9.5, 7).fill(shade(bark, 0.25))
    g.ellipse(-28, -3, 6, 4.5).fill(shade(bark, 0.55))
    // Sågad ände med årsringar (höger) och en bruten ände (vänster).
    const ex = w / 2 - 8
    g.ellipse(ex, 0, 9.5, h / 2 - 1).fill(0xd6ab72)
    g.ellipse(ex, 0, 6.5, 11.5).stroke({ width: 1.3, color: 0xa87a45, alpha: 0.85 })
    g.ellipse(ex, 0, 3.8, 6.8).stroke({ width: 1.2, color: 0xa87a45, alpha: 0.85 })
    g.ellipse(ex, 0, 1.6, 2.6).fill(0xa87a45)
    g.ellipse(ex, 0, 9.5, h / 2 - 1).stroke({ width: 2, color: shade(bark, 0.2) })
    g.moveTo(-w / 2 + 7, -h / 2 + 3).lineTo(-w / 2 - 2, -8).lineTo(-w / 2 + 5, -2).lineTo(-w / 2 - 3, 5).lineTo(-w / 2 + 7, h / 2 - 3).lineTo(-w / 2 + 13, 0).closePath().fill(0xc89a62)
    for (let i = 0; i < 5; i++) {
      g.ellipse(rnd(-w / 2 + 24, w / 2 - 30), -h / 2 + 3, rnd(8, 15), 4).fill({ color: valj([MOSSA, tint(MOSSA, 0.3)]), alpha: 0.9 })
    }
    // En kvist med löv som sticker upp — stocken får en egen silhuett.
    const kx = rnd(10, 50)
    g.moveTo(kx, -h / 2 + 2).quadraticCurveTo(kx + 6, -h / 2 - 14, kx + 18, -h / 2 - 22).stroke({ width: 3.5, color: bark, cap: 'round' })
    lovknippe(g, kx + 18, -h / 2 - 22, 0.7, 3, 15)
    this._phys.link(body, view)
    this.flytvolym.lagg(body, { flyt: 1.8, hemX: x })
    this._stock = { body, view, hemX: x, frac: 1 }
    this._kropp(body, 'stock', view)
  }

  // ---- näckrosbladen ------------------------------------------------------------------------

  _byggBlad() {
    for (const b of this._plan.blad) {
      const x = this._x(b.u)
      const y0 = BLAD_TOPP + BLAD_H / 2
      const body = this._phys.rectangle(x, y0, b.w, BLAD_H, { isStatic: true, collisionFilter: { group: DAMM_GRUPP }, label: 'blad' })
      const view = dekor(this._bakomRot, x, y0)
      const inre = dekor(view)
      const g = ritning(inre)
      ritaNackrosblad(g, b.w, b.farg, { cy: -9, skara: b.skara })
      // En vattendroppe som glänser på bladet.
      if (Math.random() < 0.6) {
        const dx = rnd(-b.w * 0.3, b.w * 0.3)
        g.ellipse(dx, -11, 3.4, 2.4).fill({ color: 0xdff6ff, alpha: 0.85 })
        g.circle(dx - 1, -12, 1).fill(0xffffff)
      }
      if (b.ros) ritaNackros(g, b.ros.dx, -10, b.ros.s, b.ros.farg)
      const rec = { body, x, bredd: b.w, view, _inre: inre, _y0: y0, _d: 0, _fv: 0, _fas: rnd(0, TAU) }
      this.blad.push(rec)
      this._kropp(body, 'blad', view)
    }
    // Strandbankerna sist i foremal (de är minst intressanta att sikta på).
    for (const s of this._strander) this.foremal.push({ body: s.body, typ: 'strand', klibb: true, view: s.view })
  }

  // ---- vattnet (ritas ÖVER grodan) ------------------------------------------------------------

  _byggVatten() {
    const R = this._vattenRot
    const p = this._pal
    this._vattenG = ritning(R)
    this._vattenFyll = verticalFillAlpha(p.yta, p.djup, p.ytA, p.djupA)
    // Ljusstrålar ner i vattnet, lutade bort från solen.
    const stral = dekor(R)
    const sg = ritning(stral)
    const bort = (this._sida === 'v' ? p.solU : W - p.solU) > W / 2 ? -1 : 1
    for (let i = 0; i < 6 * (this.VW / W); i++) {
      const x0 = rnd(-BLEED_X, this.VW + BLEED_X)
      const w0 = rnd(24, 60)
      sg.poly([x0, 574, x0 + w0, 574, x0 + w0 + bort * 170 + 50, H + BLEED_Y, x0 + bort * 170 - 20, H + BLEED_Y]).fill({ color: 0xffffff, alpha: p.stral })
    }
    this._stral = stral
    // Glitter på ytan.
    this._glitter = []
    for (let i = 0; i < 28 * (this.VW / W); i++) {
      this._glitter.push({ x: rnd(-BLEED_X, this.VW + BLEED_X), dy: rnd(3, 16), r: rnd(4, 10), w: rnd(1.4, 3.4), fas: rnd(0, TAU) })
    }
    this._ytPts = new Float32Array(this._vagN * 2)
    // Morgondimma: mjuka slöjor som driver sakta över bortre vattnet. De ligger i FJÄRRANBANDET
    // (bakom allt spelbart) — i vattenlagret lade de sig över grodan och bleknade den, sett i
    // skärmdumpen.
    this._dimma = []
    if (p.dimma) {
      for (let i = 0; i < 7 * (this._fjB / W); i++) {
        const c = dekor(this._fjarranRot, rnd(-BLEED_X, this._fjB), rnd(522, 556))
        const g = ritning(c)
        const bw = rnd(90, 180)
        g.ellipse(0, 0, bw, rnd(10, 16)).fill({ color: p.disFarg, alpha: 0.12 })
        g.ellipse(bw * 0.3, -4, bw * 0.55, 9).fill({ color: p.disFarg, alpha: 0.1 })
        g.ellipse(-bw * 0.4, 3, bw * 0.5, 8).fill({ color: p.disFarg, alpha: 0.1 })
        this._dimma.push({ c, fart: rnd(5, 12), bw })
      }
    }
  }

  // ---- förgrund: vassklungor längst fram — vid världens kanter och på ett par ställen emellan ----

  _byggFram() {
    this._framVass = []
    const VW = this.VW
    const platser = [{ x: rnd(4, 24), kant: 'v' }, { x: VW - rnd(4, 24), kant: 'h' }]
    const kor = this._plan.kor.x
    for (let i = 0, forsok = 0; i < 2 && forsok < 30; forsok++) {
      const x = rnd(420, VW - 420)
      // Inte framför kören eller startbladet, och inte klumpat.
      if (Math.abs(x - kor) < 260 || Math.abs(x - this._x(this._plan.blad[0].u)) < 220) continue
      if (platser.some((q) => Math.abs(q.x - x) < 500)) continue
      platser.push({ x, kant: x < VW / 2 ? 'v' : 'h' })
      i++
    }
    for (const { x, kant } of platser) {
      const c = dekor(this._framRot, x, 0)
      const inre = dekor(c, 0, 760)
      inre.pivot.set(0, 760)
      const g = ritning(inre)
      const inat = kant === 'v' ? 1 : -1
      for (let i = 0; i < 5; i++) {
        const bx = rnd(-22, 22)
        const topp = rnd(470, 548)
        const luta = inat * rnd(6, 40)
        const f = valj([0x3f7a3a, 0x4d8a3f, 0x437f3a])
        g.moveTo(bx - 4, 760).quadraticCurveTo(bx + luta * 0.3 - 8, (760 + topp) / 2, bx + luta, topp).quadraticCurveTo(bx + luta * 0.3 + 6, (760 + topp) / 2, bx + 5, 760).closePath().fill(f)
      }
      const kt = rnd(500, 540)
      const kx = inat * rnd(4, 12)
      g.moveTo(0, 760).quadraticCurveTo(kx * 0.5, (760 + kt) / 2, kx, kt + 12).stroke({ width: 4, color: 0x5e7f3a, cap: 'round' })
      g.roundRect(kx - 6, kt + 10, 12, 40, 6).fill(cylinderFill(0x5f3c24, { axis: 'y', dark: 0.35, highlight: 0.25 }))
      g.moveTo(kx, kt + 11).lineTo(kx, kt - 4).stroke({ width: 2, color: 0x8a6a3a, cap: 'round' })
      this._framVass.push({ c, kant })
      this._svaj.push({ nod: inre, bas: 0, amp: rnd(0.018, 0.03), w: rnd(0.7, 1.1), fas: rnd(0, TAU) })
    }
  }

  // =====================================================================================
  // Per bildruta

  // FÖRE phys.update: flytkraften + bladens fjädrande gupp + stockens vakt.
  steg(t) {
    if (!this._alive) return
    const nu = Number.isFinite(t) ? t : this._t
    let dt = this._stegT == null ? 1 / 60 : nu - this._stegT
    if (!(dt > 0)) dt = 1 / 60
    dt = Math.min(dt, 1 / 20)
    this._stegT = nu
    this.flytvolym.steg(nu)
    this._stockVakt()
    this._laddaBlad()
    const s = this._stock
    const sp = s ? Math.hypot(s.body.velocity.x, s.body.velocity.y) : 0
    for (const b of this.blad) {
      // Målet: vågen där bladet ligger (ytan bär det) + tyngd om något sitter på det.
      let mal = klamp(this._vagVid(b.x) * 0.6 + this._amb(b.x, this._t) * 0.6, -6, 6)
      if (this._lastade.has(b.body)) mal += 3
      // Stocken som glider förbi bakom bladet rubbar det lite.
      if (s && sp > 0.6 && Math.abs(s.body.position.x - b.x) < STOCK_W / 2 + b.bredd / 2 && Math.abs(s.body.position.y - YT_Y) < 40) {
        b._fv += Math.min(3, sp) * 0.8
      }
      b._fv += (-(b._d - mal) * BLAD_K - b._fv * BLAD_C) * dt
      b._d += b._fv * dt
      if (b._d > 14) {
        b._d = 14
        if (b._fv > 0) b._fv = 0
      } else if (b._d < -7) {
        b._d = -7
        if (b._fv < 0) b._fv = 0
      }
      const pos = b.body.position
      const dy = klamp(b._y0 + b._d - pos.y, -1, 1)
      if (Math.abs(dy) > 0.02) Body.setPosition(b.body, { x: pos.x, y: pos.y + dy }) // UTAN fart
    }
  }

  // Vilka blad har något dynamiskt på sig just nu? Läses ur matters egna kontaktpar.
  _laddaBlad() {
    const set = this._lastade
    set.clear()
    const list = this._phys?.engine?.pairs?.list
    if (!list) return
    for (let i = 0; i < list.length; i++) {
      const pr = list[i]
      if (!pr.isActive || pr.isSensor) continue
      const a = pr.bodyA.parent || pr.bodyA
      const b = pr.bodyB.parent || pr.bodyB
      if (a.label === 'blad' && !b.isStatic) set.add(a)
      else if (b.label === 'blad' && !a.isStatic) set.add(b)
    }
  }

  // Stocken hålls inom dammen (u ∈ [strand+105, 1080]) och plaskar när den faller i.
  _stockVakt() {
    const s = this._stock
    if (!s) return
    const b = s.body
    const p = b.position
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.y > 900 || p.y < this.TOPP - 700 || p.x < -300 || p.x > this.VW + 300) {
      Body.setPosition(b, { x: s.hemX, y: YT_Y - 60 })
      Body.setVelocity(b, { x: 0, y: 0 })
      Body.setAngle(b, 0)
      Body.setAngularVelocity(b, 0)
      s.frac = 0
      return
    }
    const u = this._u(p.x)
    const u0 = this._plan.stockU0
    const u1 = this._plan.stockU1
    let vu = this._sgn * b.velocity.x
    if (u < u0 && vu < 1.2) vu = Math.max(vu * 0.6, 0) + Math.min(1.5, (u0 - u) * 0.03)
    else if (u > u1 && vu > -1.2) vu = Math.min(vu * 0.6, 0) - Math.min(1.5, (u - u1) * 0.03)
    else vu = null
    if (vu != null) Body.setVelocity(b, { x: this._sgn * vu, y: b.velocity.y })
    const frac = this.flytvolym.nedsankning(b)
    if (s.frac < 0.1 && frac >= 0.1 && b.velocity.y > 2.5) this.plask(p.x, k01(b.velocity.y / 12))
    s.frac = frac
  }

  // Per bildruta: vattnet, bladen, allt liv.
  rita(dtS, t) {
    if (!this._alive) return
    const dt = klamp(Number.isFinite(dtS) ? dtS : 0, 0, 0.05)
    this._t += dt
    const T = this._t
    this._vagSteg(dt)
    this._ritaVatten(T)
    this._ritaBladen(T)
    for (const s of this._svaj) {
      if (s.nod.destroyed) continue
      s.nod.rotation = s.bas + s.amp * Math.sin(T * s.w + s.fas) + s.amp * 0.35 * Math.sin(T * s.w * 2.3 + s.fas * 1.7)
    }
    for (const k of this._kronor) if (!k.nod.destroyed) k.nod.rotation = k.sgn * 0.004 * Math.sin(T * 0.7)
    this._ritaHimmel(T, dt)
    this._ritaBotten(T, dt)
    this._ritaDroppar(dt)
    this.grodungar._rita(dt)
  }

  // ---- höjdfältet -------------------------------------------------------------------------

  // Fast tidssteg (1/60), max 4 steg per bildruta — samma skäl som Mjukkropp (CLAUDE.md).
  _vagSteg(dt) {
    this._vagAcc += dt * 60
    const h = this._vag
    const v = this._vagV
    const a = this._vagA
    let n = 0
    while (this._vagAcc >= 1 && n < 4) {
      this._vagAcc -= 1
      n++
      const N = this._vagN
      for (let i = 0; i < N; i++) {
        const l = h[i > 0 ? i - 1 : 0]
        const r = h[i < N - 1 ? i + 1 : N - 1]
        a[i] = VAG_SPRID * (l + r - 2 * h[i]) - VAG_K * h[i]
      }
      // Dämpningen SIST, efter spridningen (minnet: annars nästan instabil vid Nyquist).
      for (let i = 0; i < N; i++) {
        v[i] = (v[i] + a[i]) * VAG_DAMP
        h[i] = klamp(h[i] + v[i], -VAG_MAX, VAG_MAX)
      }
    }
    if (n >= 4) this._vagAcc = 0
  }

  // Stöt i ytan vid x. Positivt = nedåt (något slog i), negativt = uppåt.
  _vagStot(x, kraft) {
    const i = Math.round((x - VAG_X0) / VAG_DX)
    const v = this._vagV
    const add = (j, k) => {
      if (j >= 0 && j < this._vagN) v[j] += k
    }
    add(i, kraft)
    add(i - 1, kraft * 0.6)
    add(i + 1, kraft * 0.6)
    add(i - 2, kraft * 0.25)
    add(i + 2, kraft * 0.25)
  }

  _vagVid(x) {
    const t = klamp((x - VAG_X0) / VAG_DX, 0, this._vagN - 1)
    const i = Math.floor(t)
    const j = Math.min(this._vagN - 1, i + 1)
    const f = t - i
    return this._vag[i] * (1 - f) + this._vag[j] * f
  }

  // Svag omgivningsvåg — bara bild, aldrig i simuleringen (kan alltså inte pumpa fältet).
  _amb(x, T) {
    return 1.3 * Math.sin(x * 0.019 + T * 1.25) + 0.7 * Math.sin(x * 0.051 - T * 0.8)
  }

  // Ytans y vid x (vilonivå + våg + omgivningsvåg).
  ytaVid(x) {
    if (!this._alive) return YT_Y
    return YT_Y + this._vagVid(x) + this._amb(x, this._t)
  }

  _ritaVatten(T) {
    const g = this._vattenG
    if (!g || g.destroyed) return
    const p = this._pal
    const pts = this._ytPts
    const N = this._vagN
    for (let i = 0; i < N; i++) {
      const x = VAG_X0 + i * VAG_DX
      pts[i * 2] = x
      pts[i * 2 + 1] = YT_Y + this._vag[i] + this._amb(x, T)
    }
    const x0 = pts[0]
    const x1 = pts[(N - 1) * 2]
    const botten = H + BLEED_Y + 10
    g.clear()
    g.moveTo(x0, pts[1])
    for (let i = 1; i < N; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1])
    g.lineTo(x1, botten).lineTo(x0, botten).closePath().fill(this._vattenFyll)
    // Ljus hinna strax under ytan.
    g.moveTo(x0, pts[1])
    for (let i = 1; i < N; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1])
    for (let i = N - 1; i >= 0; i--) g.lineTo(pts[i * 2], pts[i * 2 + 1] + 12)
    g.closePath().fill({ color: tint(p.yta, 0.4), alpha: 0.2 })
    // Ytlinjen: en mjuk glöd + en skarp ljus linje.
    g.moveTo(x0, pts[1])
    for (let i = 1; i < N; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1])
    g.stroke({ width: 7, color: p.linje, alpha: 0.14, join: 'round' })
    g.moveTo(x0, pts[1])
    for (let i = 1; i < N; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1])
    g.stroke({ width: 2.5, color: p.linje, alpha: 0.75, join: 'round', cap: 'round' })
    // Glitter som tindrar och driver.
    for (const gl of this._glitter) {
      gl.x += 0.08
      if (gl.x > this.VW + BLEED_X) gl.x = -BLEED_X
      const s = Math.sin(T * gl.w + gl.fas)
      if (s < 0.4) continue
      const k = (s - 0.4) / 0.6
      const y = this.ytaVid(gl.x) + gl.dy
      g.ellipse(gl.x, y, gl.r * (0.5 + 0.5 * k), 1.3).fill({ color: p.glitter, alpha: 0.85 * k })
    }
    if (this._stral && !this._stral.destroyed) this._stral.alpha = 0.75 + 0.25 * Math.sin(T * 0.55)
  }

  _ritaBladen(T) {
    for (const b of this.blad) {
      if (b.view.destroyed) continue
      b.view.y = b.body.position.y
      const sq = klamp(b._fv / 150, -1, 1)
      b._inre.rotation = klamp(-b._fv * 0.0012, -0.05, 0.05) + 0.01 * Math.sin(T * 1.3 + b._fas)
      b._inre.scale.set(1 + 0.035 * sq, 1 - 0.05 * sq)
    }
  }

  _ritaHimmel(T, dt) {
    for (const s of this._stjarnor) s.c.alpha = 0.35 + 0.65 * Math.abs(Math.sin(T * s.w + s.fas))
    // Stråkmolnen bor i skärmen (himlen står still), dimman i fjärranbandet.
    for (const m of this._molnStrak) {
      m.c.x += m.fart * dt
      if (m.c.x - m.bw > W + BLEED_X + 40) m.c.x = -BLEED_X - m.bw - 40
    }
    for (const d of this._dimma) {
      d.c.x += d.fart * dt
      if (d.c.x - d.bw > this._fjB + 40) d.c.x = -BLEED_X - d.bw - 40
    }
    if (this._skimmer && !this._skimmer.destroyed) this._skimmer.alpha = 0.7 + 0.3 * Math.sin(T * 1.7)
  }

  // Den synliga världsytan just nu (spelet ger en funktion — kameran flyttar den).
  _vy() {
    const v = this._vyFn?.()
    return v && Number.isFinite(v.left) ? v : { left: 0, right: W, top: 0, bottom: H }
  }

  _ritaBotten(T, dt) {
    const g = this._vaxtG
    if (!g || g.destroyed) return
    g.clear()
    for (const s of this._vaxter) {
      const seg = s.h / 6
      g.moveTo(s.x, s.y)
      for (let k = 1; k <= 6; k++) g.lineTo(s.x + Math.sin(T * s.w + s.fas + k * 0.55) * k * s.amp, s.y - k * seg)
      g.stroke({ width: s.bred, color: s.farg, alpha: 0.9, cap: 'round', join: 'round' })
    }
    // Bubblor som stiger från botten och spricker vid ytan (en liten krusning).
    this._nastaBubbla -= dt
    if (this._nastaBubbla <= 0 && this._bubblor.length < 10) {
      this._nastaBubbla = rnd(1.2, 3.5)
      const v = valj(this._vaxter)
      const n = rint(1, 3)
      for (let i = 0; i < n; i++) this._bubblor.push({ x: v.x + rnd(-6, 6), y: v.y - i * 14, r: rnd(2, 4.5), fas: rnd(0, TAU) })
    }
    for (let i = this._bubblor.length - 1; i >= 0; i--) {
      const b = this._bubblor[i]
      b.y -= (26 + b.r * 6) * dt
      b.x += Math.sin(T * 3 + b.fas) * 0.3
      if (b.y < this.ytaVid(b.x) + b.r) {
        this._vagStot(b.x, -0.35)
        this._bubblor.splice(i, 1)
        continue
      }
      g.circle(b.x, b.y, b.r).stroke({ width: 1.2, color: 0xffffff, alpha: 0.55 })
      g.circle(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3).fill({ color: 0xffffff, alpha: 0.6 })
    }
    // Fisken.
    const f = this._fisk
    if (!f.c.destroyed) {
      const vy = this._vy()
      if (!f.aktiv && T > f.nasta) {
        f.aktiv = true
        f.dir = Math.random() < 0.5 ? 1 : -1
        f.c.x = f.dir > 0 ? vy.left - 50 : vy.right + 50
        f.y = rnd(612, 680)
        f.fart = rnd(50, 85)
        f.c.scale.x = f.dir
        f.c.visible = true
      }
      if (f.aktiv) {
        f.c.x += f.dir * f.fart * dt
        f.c.y = f.y + Math.sin(T * 1.8 + f.fas) * 5
        f.c.rotation = 0.06 * Math.sin(T * 9 + f.fas)
        if ((f.dir > 0 && f.c.x > vy.right + 60) || (f.dir < 0 && f.c.x < vy.left - 60)) {
          f.aktiv = false
          f.c.visible = false
          f.nasta = T + rnd(8, 16)
        }
      }
    }
  }

  _ritaDroppar(dt) {
    const g = this._droppG
    if (!g || g.destroyed) return
    if (!this._dropp.length) {
      if (this._droppRitad) {
        g.clear()
        this._droppRitad = false
      }
      return
    }
    g.clear()
    this._droppRitad = true
    for (let i = this._dropp.length - 1; i >= 0; i--) {
      const d = this._dropp[i]
      d.vy += 900 * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      if (d.vy > 0 && d.y > this.ytaVid(d.x)) {
        this._vagStot(d.x, 0.35)
        this._dropp.splice(i, 1)
        continue
      }
      const str = klamp(Math.abs(d.vy) / 500, 0, 0.6)
      g.ellipse(d.x, d.y, d.r * (1 - str * 0.3), d.r * (1 + str)).fill({ color: 0xe6f7ff, alpha: 0.9 })
      g.circle(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.35).fill({ color: 0xffffff, alpha: 0.9 })
    }
  }

  // =====================================================================================
  // Händelser från spelet

  // Något slog i vattnet vid x (styrka 0..1): våg + droppar + puff. TYST (val 5).
  plask(x, styrka) {
    if (!this._alive || !Number.isFinite(x)) return
    const s = k01(styrka ?? 0.5)
    this._vagStot(x, 2 + 7 * s)
    const y = this.ytaVid(x)
    const n = Math.round(3 + 9 * s)
    for (let i = 0; i < n && this._dropp.length < MAX_DROPP; i++) {
      this._dropp.push({
        x: x + rnd(-14, 14),
        y: y - 2,
        vx: rnd(-1, 1) * (50 + 150 * s),
        vy: -(150 + 330 * s) * rnd(0.55, 1),
        r: rnd(2.2, 4.4),
      })
    }
    if (s > 0.2 && this._lager?.fram && !this._lager.fram.destroyed) {
      puff(this._lager.fram, x, y - 6, { count: Math.round(2 + 5 * s), color: 0xeaf8ff })
    }
  }

  // Något landade på bladet: det gungar ned och fjädrar tillbaka (+ en krusning vid kanterna).
  bladTryck(body, styrka) {
    if (!this._alive) return
    const b = this.blad.find((p) => p.body === body)
    if (!b) return
    const s = k01(styrka ?? 0.5)
    b._fv += 55 + 120 * s
    this._vagStot(b.x - b.bredd * 0.45, 1 + 2.5 * s)
    this._vagStot(b.x + b.bredd * 0.45, 1 + 2.5 * s)
  }

  destroy() {
    if (!this._alive && !this._rotter.length) return
    this._alive = false
    this.grodungar?.destroy()
    for (const b of this._kroppar) {
      try {
        this._phys?.removeBody(b)
      } catch {
        /* världen kan redan vara riven */
      }
    }
    this.flytvolym?.destroy()
    for (const r of this._rotter) {
      if (r.destroyed) continue
      stadFx(r)
      r.destroy({ children: true })
    }
    this._rotter = []
    this._kroppar = []
    this._svaj = []
    this._kronor = []
    this._stjarnor = []
    this._molnStrak = []
    this._dimma = []
    this._framVass = []
    this._dropp = []
    this._bubblor = []
    this._glitter = []
    this.foremal = []
    this.blad = []
    this._stock = null
    this._lastade.clear()
  }
}

// =====================================================================================
// GRODUNGARNA — mottagaren. Tre små grodor på ett eget förgrundsblad i hörnet mitt emot
// trädet. Bara bild (inga kroppar). All rörelse räknas per bildruta i `_rita`.

class Grodungar {
  constructor({ lager, audio, x, sida }) {
    this._alive = true
    this._audio = audio
    this._t = 0
    this._kor = null
    this._langta = false
    this._mal = { x: 640, y: 430 }
    const rot = dekor(lager)
    this._rotC = rot
    const cx = Number.isFinite(x) ? x : sida === 'h' ? rnd(1122, 1148) : rnd(132, 158)
    const cy = 690
    // Bladets mitt i världen — spelet gör kören till en håll-knapp ("kalla hem grodan").
    this.plats = { x: cx, y: cy }
    // Krusningar på vattnet runt bladet (förgrunden flyter också).
    this._ringar = []
    for (let i = 0; i < 2; i++) {
      const c = dekor(rot, cx, cy + 4)
      ritning(c).ellipse(0, 0, 124, 24).stroke({ width: 2.5, color: 0xffffff, alpha: 0.5 })
      this._ringar.push({ c, fas: i * 0.5 })
    }
    const blad = dekor(rot, cx, cy)
    this._bladC = blad
    this._bladY = cy
    const bg = ritning(blad)
    ritaNackrosblad(bg, 236, 0x5aa845, { cy: 0, ry: 19, skara: sida === 'h' ? Math.PI - 1.2 : 1.2 })
    // Ungarna står på bladet: den mittersta lite längre bak.
    const plats = [
      { x: -62, y: 2 },
      { x: 0, y: -4 },
      { x: 62, y: 3 },
    ]
    const blomma = rint(0, 2)
    this._ungar = [0, 1, 2]
      .sort((a, b) => plats[a].y - plats[b].y)
      .map((i) => this._byggUnge(blad, plats[i].x, plats[i].y, UNGE_FARGER[i], i === blomma, i))
      .sort((a, b) => a.i - b.i)
  }

  _byggUnge(parent, x, y, farg, blomma, i) {
    const c = dekor(parent, x, y)
    const skugga = dekor(c)
    ritning(skugga).ellipse(0, 1, 21, 4.5).fill({ color: 0x1f4a1f, alpha: 0.3 })
    const inre = dekor(c)
    const g = ritning(inre)
    const mork = shade(farg, 0.14)
    // Bakben (hopvikta lår) och simfötter.
    g.ellipse(-16, -9, 12, 9).fill(sphereFill(mork, { lightY: 0.3 }))
    g.ellipse(16, -9, 12, 9).fill(sphereFill(mork, { lightY: 0.3 }))
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const tx = s * (18 + k * 5)
        g.ellipse(tx, -1, 3.2, 2.2).fill(tint(farg, 0.2))
        g.circle(tx + s * 1.5, -1, 1.4).fill(tint(farg, 0.5))
      }
    }
    // Kropp + huvud i EN silhuett (ingen söm mellan två gradienter).
    g.moveTo(0, -43)
      .bezierCurveTo(12, -43, 20, -38, 20, -29)
      .bezierCurveTo(21, -22, 24, -16, 23, -10)
      .bezierCurveTo(22, -2, 12, 1, 0, 1)
      .bezierCurveTo(-12, 1, -22, -2, -23, -10)
      .bezierCurveTo(-24, -16, -21, -22, -20, -29)
      .bezierCurveTo(-20, -38, -12, -43, 0, -43)
      .closePath()
      .fill(sphereFill(farg, { lightX: 0.35, lightY: 0.25, dark: 0.26 }))
    g.ellipse(0, -9, 14, 8).fill({ color: 0xf1f5c4, alpha: 0.92 })
    for (const [sx, sy, r] of [[-15, -18, 2.6], [16, -21, 2.2], [-8, -36, 1.8], [11, -13, 2]]) g.circle(sx, sy, r).fill({ color: shade(farg, 0.3), alpha: 0.45 })
    g.ellipse(-13, -24, 4, 2.4).fill({ color: 0xff8fa0, alpha: 0.45 })
    g.ellipse(13, -24, 4, 2.4).fill({ color: 0xff8fa0, alpha: 0.45 })
    g.circle(-3, -33, 1).fill(shade(farg, 0.5))
    g.circle(3, -33, 1).fill(shade(farg, 0.5))
    g.moveTo(-12, -27).quadraticCurveTo(0, -20, 12, -27).stroke({ width: 2, color: shade(farg, 0.55), cap: 'round' })
    // Den matade magen: ritas först när ungen fått sin korv (färgen kommer ur korven) och
    // sväller fram — ett matat barn i kören syns på långt håll.
    const magC = dekor(inre, 0, -8)
    magC.scale.set(0)
    // Ögonkulor ovanpå huvudet.
    g.circle(-10, -41, 8.5).fill(sphereFill(farg, { lightY: 0.25 }))
    g.circle(10, -41, 8.5).fill(sphereFill(farg, { lightY: 0.25 }))
    g.circle(-10, -42, 6.5).fill(0xffffff).stroke({ width: 1, color: shade(farg, 0.4), alpha: 0.5 })
    g.circle(10, -42, 6.5).fill(0xffffff).stroke({ width: 1, color: shade(farg, 0.4), alpha: 0.5 })
    const pupiller = []
    const lock = []
    for (const ex of [-10, 10]) {
      const pc = dekor(inre, ex, -42)
      ritning(pc).circle(0, 0, 3.4).fill(0x1d2a1a).circle(-1, -1.2, 1.1).fill(0xffffff)
      pupiller.push({ c: pc, ex })
      const lc = dekor(inre, ex, -49)
      ritning(lc).ellipse(0, 7, 7.4, 7.4).fill(farg)
      lc.scale.y = 0
      lock.push(lc)
    }
    // Halssäcken under hakan (växer nedåt från sin topp).
    // Ljusare än buken och med en kontur — annars försvinner den mot den ljusa buken (sett i
    // skärmdumpen: samma bleka gula, ingen säck syntes mitt i kören).
    const sack = dekor(inre, 0, -22)
    ritning(sack)
      .ellipse(0, 7, 10, 8)
      .fill({ color: 0xfffbea, alpha: 0.97 })
      .stroke({ width: 1.4, color: shade(farg, 0.25), alpha: 0.6 })
      .ellipse(-3.4, 4, 3.4, 2)
      .fill({ color: 0xffffff, alpha: 0.9 })
    // Munnen som gapar (väntar på korven), tuggar och sväljer. Stängd = skalan 0 (då syns
    // det ritade leendet under).
    const munC = dekor(inre, 0, -24)
    ritning(munC).ellipse(0, 2, 9, 6.5).fill(0x6e1f30).stroke({ width: 1.6, color: shade(farg, 0.55) })
      .ellipse(0, 5.2, 5.4, 2.6).fill(0xe0607e)
    munC.scale.y = 0
    munC.visible = false
    // Framben — vilar ner, viftar vid heja.
    const armar = []
    for (const s of [-1, 1]) {
      const ac = dekor(inre, s * 15, -17)
      ac.scale.x = s
      const ag = ritning(ac)
      ag.moveTo(0, 0).quadraticCurveTo(4, 7, 2, 13).stroke({ width: 5, color: mork, cap: 'round' })
      for (const [fx, fy] of [[-1.5, 15], [2, 16], [5, 14.5]]) ag.circle(fx, fy, 2).fill(tint(farg, 0.2))
      ac.rotation = s * -0.22
      armar.push({ c: ac, s })
    }
    if (blomma) {
      const bl = ritning(inre)
      spetsblad(bl, 4, -44, 1.1, 10, 3).fill(0x4f9a3a)
      for (let k = 0; k < 5; k++) bl.circle(7 + Math.cos((k * TAU) / 5) * 3.6, -46 + Math.sin((k * TAU) / 5) * 3.6, 3.2).fill(0xff9ec4)
      bl.circle(7, -46, 2.2).fill(0xffd35c)
    }
    return {
      i, c, inre, skugga, pupiller, lock, sack, armar, munC, magC, farg,
      matad: false, gap: 0, gapNu: 0, tuggT: 0, svaljT: 0, magNu: 0, magMal: 0, ivrigVid: rnd(0.5, 1.5),
      fas: rnd(0, TAU),
      hopY: 0, hopV: 0, hoppVid: -1, hoppFart: 0, sq: 0,
      blinkNasta: rnd(1, 4), blinkT: -9,
      sackStart: -9, sackDur: 0.35, sackMax: 1,
      viftaTill: -1,
    }
  }

  // ── Matningen (bajsloopen, index.js) ──────────────────────────────────────────────────

  // Ungens mun i världen (dit korven kastas). Följer hoppet.
  munVarld(i) {
    const u = this._ungar[i]
    if (!u || u.c.destroyed) return { x: this.plats.x, y: this.plats.y - 40 }
    return { x: this._rotC.x + this._bladC.x + u.c.x, y: this._rotC.y + this._bladC.y + u.c.y - u.hopY - 22 }
  }

  get matade() {
    return this._ungar.filter((u) => u.matad).length
  }

  // Den omatade unge som står närmast x (i världen), annars -1.
  omatad(x) {
    let bast = -1
    let bastD = Infinity
    for (const u of this._ungar) {
      if (u.matad) continue
      const d = Math.abs(this._rotC.x + this._bladC.x + u.c.x - x)
      if (d < bastD) {
        bastD = d
        bast = u.i
      }
    }
    return bast
  }

  // Gapa (0…1): en korv är på väg till just den här ungen.
  gapa(i, v = 1) {
    const u = this._ungar[i]
    if (u) u.gap = v
  }

  // Grodan bär en korv: de omatade ungarna längtar (små gap, ivriga skutt).
  langta(ja) {
    this._langta = !!ja
  }

  // Korven landade i munnen: ungen tuggar (1 s), sväljer och blir rund om magen. Räknas som
  // matad DIREKT, så att nästa kast aldrig siktar på samma unge.
  mata(i, farg) {
    if (!this._alive) return
    const u = this._ungar[i]
    if (!u || u.matad) return
    u.matad = true
    u.korvFarg = farg ?? 0x8b5a32
    u.gap = 0
    u.tuggT = 1
    const mg = ritning(u.magC)
    mg.ellipse(0, 0, 21, 14).fill(sphereFill(0xf1f5c4, { lightX: 0.4, lightY: 0.3, dark: 0.16 }))
      .stroke({ width: 1.4, color: shade(u.farg, 0.3), alpha: 0.55 })
    mg.ellipse(0, 3, 13, 7).fill({ color: farg ?? 0x8b5a32, alpha: 0.3 })
    mg.ellipse(-6, -4, 5, 2.6).fill({ color: 0xffffff, alpha: 0.7 })
    this._audio?.tone?.({ freq: 330, slideTo: 262, dur: 0.1, type: 'triangle', vol: 0.18 })
  }

  // Färgen på korven ungen fick (finalens rap-ring).
  magfarg(i) {
    return this._ungar[i]?.korvFarg ?? 0xe8f7ff
  }

  // En liten rap i finalen (säcken + ett skutt + en låg ton). Returnerar munnens läge.
  rap(i) {
    if (!this._alive) return null
    this._sack(i, 0.4, 1.3)
    this._hopp(i, 200, 0)
    const f = [131, 147, 165][i % 3]
    this._audio?.tone?.({ freq: f, slideTo: f * 0.7, dur: 0.3, type: 'triangle', vol: 0.24 })
    return this.munVarld(i)
  }

  // Vart ungarna tittar (spelet kan låta dem följa grodan). Standard: dammens mitt.
  titta(x, y) {
    if (!this._alive || !Number.isFinite(x) || !Number.isFinite(y)) return
    this._mal.x = x
    this._mal.y = y
  }

  _sack(i, dur, max = 1) {
    const u = this._ungar[i]
    if (!u) return
    u.sackStart = this._t
    u.sackDur = dur
    u.sackMax = max
  }

  _hopp(i, fart, om = 0) {
    const u = this._ungar[i]
    if (!u) return
    u.hoppVid = this._t + om
    u.hoppFart = fart
  }

  // En insekt till (steg 0..7): en unge (roterar) blåser upp halssäcken, hoppar och kvackar
  // en STÄMD ton ur en stigande durskala — "kva-ack", inte ett UI-blipp.
  kvack(steg) {
    if (!this._alive) return
    const n = Math.max(0, Math.floor(Number(steg) || 0))
    const i = n % 3
    const f = SKALA[Math.min(SKALA.length - 1, n)]
    this._audio?.tone?.({ freq: f, dur: 0.16, type: 'triangle', vol: 0.22, slideTo: f * 0.82 })
    this._audio?.tone?.({ freq: f, dur: 0.1, type: 'triangle', vol: 0.18, slideTo: f * 0.9, delay: 0.12 })
    this._sack(i, 0.35, 1)
    this._hopp(i, 150, 0)
  }

  // Grodan tumlade: alla tre studsar och viftar (de tycker det är kul). Ett mjukt fniss.
  heja() {
    if (!this._alive) return
    for (let i = 0; i < 3; i++) {
      const u = this._ungar[i]
      if (!u) continue
      this._hopp(i, rnd(190, 240), i * 0.07 + rnd(0, 0.05))
      u.viftaTill = this._t + 1.1
    }
    const fniss = [783.99, 987.77, 1174.66]
    fniss.forEach((f, k) => this._audio?.tone?.({ freq: f, dur: 0.09, type: 'sine', vol: 0.07, slideTo: f * 1.06, delay: k * 0.07 }))
  }

  // Grodkören: en kort melodi i C-dur, varje ton sjungs av en unge (säcken sväller i takt),
  // sista tonen av alla tre i ackord. Returnerar längden i sekunder.
  kor() {
    if (!this._alive) return 0
    const C5 = 523.25
    const E5 = 659.25
    const G5 = 783.99
    const C6 = 1046.5
    const noter = [
      { t: 0.0, f: C5, vem: [0], dur: 0.18 },
      { t: 0.22, f: E5, vem: [1], dur: 0.18 },
      { t: 0.44, f: G5, vem: [2], dur: 0.18 },
      { t: 0.66, f: E5, vem: [1], dur: 0.18 },
      { t: 0.88, f: C5, vem: [0], dur: 0.28 },
      { t: 1.22, f: E5, vem: [1], dur: 0.18 },
      { t: 1.44, f: G5, vem: [2], dur: 0.18 },
      { t: 1.66, f: C6, vem: [0, 1, 2], dur: 0.5, ackord: [E5, G5] },
    ]
    // Tonerna spelas i _rita NÄR noten nås, inte schemalagda med `delay` i förväg: en
    // schemalagd ton går inte att avbryta, så kören hördes vidare på menyn om barnet gick ut.
    this._kor = { start: this._t, noter, i: 0 }
    return KOR_LANGD
  }

  _rita(dt) {
    if (!this._alive) return
    this._t += dt
    const T = this._t
    // Körens schema: varje ton blåser upp sin sångares säck exakt när den hörs.
    const k = this._kor
    if (k) {
      while (k.i < k.noter.length && T >= k.start + k.noter[k.i].t) {
        const n = k.noter[k.i++]
        this._audio?.tone?.({ freq: n.f, dur: n.dur, type: 'triangle', vol: 0.2, slideTo: n.f * 0.86 })
        if (n.ackord) for (const a of n.ackord) this._audio?.tone?.({ freq: a, dur: n.dur, type: 'triangle', vol: 0.1, slideTo: a * 0.9 })
        for (const v of n.vem) {
          this._sack(v, n.dur + 0.1, n.vem.length > 1 ? 1.25 : 1.05)
          if (n.vem.length > 1) this._hopp(v, rnd(170, 210), v * 0.04)
        }
      }
      if (k.i >= k.noter.length) this._kor = null
    }
    // Förgrundsbladet guppar och krusningarna vidgas.
    if (!this._bladC.destroyed) {
      this._bladC.y = this._bladY + 1.6 * Math.sin(T * 1.4)
      this._bladC.rotation = 0.012 * Math.sin(T * 1.1)
    }
    for (const r of this._ringar) {
      if (r.c.destroyed) continue
      const f = (T * 0.35 + r.fas) % 1
      r.c.scale.set(0.95 + f * 0.3)
      r.c.alpha = 0.5 * (1 - f)
    }
    for (const u of this._ungar) {
      if (u.c.destroyed) continue
      if (u.hoppVid >= 0 && T >= u.hoppVid) {
        u.hopV = u.hoppFart
        u.hoppVid = -1
        if (u.hopY <= 0) u.hopY = 0.01
      }
      if (u.hopY > 0) {
        u.hopV -= 900 * dt
        u.hopY += u.hopV * dt
        if (u.hopY <= 0) {
          u.hopY = 0
          if (u.hopV < -60) u.sq = Math.min(1, -u.hopV / 260)
          u.hopV = 0
        }
      }
      u.sq = Math.max(0, u.sq - dt * 5)
      // Munnen: gapar efter korven, längtar medan grodan bär en, tuggar när den fått den.
      let gapMal = u.gap
      let tugg = 0
      if (this._langta && !u.matad) {
        gapMal = Math.max(gapMal, 0.55 + 0.2 * Math.sin(T * 4 + u.fas))
        if (T >= u.ivrigVid && u.hopY <= 0) {
          u.ivrigVid = T + rnd(1.1, 2.2)
          this._hopp(u.i, rnd(110, 160), 0)
        }
      }
      if (u.tuggT > 0) {
        u.tuggT -= dt
        tugg = Math.abs(Math.sin(T * 19))
        gapMal = 0.15 + 0.55 * tugg
        if (u.tuggT <= 0) {
          // GULP: ögonen trycks ned, magen sväller, ett glatt skutt och en stigande ters.
          u.svaljT = 0.3
          u.magMal = 1
          this._hopp(u.i, 250, 0.05)
          this._audio?.tone?.({ freq: 392, slideTo: 196, dur: 0.16, type: 'sine', vol: 0.22 })
          ;[523.25, 659.25, 783.99].forEach((f, k) => this._audio?.tone?.({ freq: f, dur: 0.12, type: 'triangle', vol: 0.16, delay: 0.14 + k * 0.09 }))
        }
      }
      u.svaljT = Math.max(0, u.svaljT - dt)
      u.gapNu += (gapMal - u.gapNu) * Math.min(1, dt * 18)
      if (!u.munC.destroyed) {
        u.munC.visible = u.gapNu > 0.03
        u.munC.scale.y = u.gapNu
      }
      u.magNu += (u.magMal - u.magNu) * Math.min(1, dt * 6)
      if (!u.magC.destroyed) u.magC.scale.set(u.magNu)
      const andas = Math.sin(T * 2.3 + u.fas)
      const luft = u.hopY > 0 ? klamp(u.hopV / 400, -0.5, 0.5) : 0
      u.inre.y = -u.hopY
      u.inre.scale.set(1 + 0.16 * u.sq - 0.06 * luft + 0.07 * tugg + 0.05 * u.magNu, 1 - 0.18 * u.sq + 0.1 * luft + 0.015 * andas)
      u.inre.rotation = 0.09 * u.magNu * Math.sin(T * 2.4 + u.fas)
      const ls = 1 - Math.min(0.5, u.hopY / 60)
      u.skugga.scale.set(ls)
      u.skugga.alpha = ls
      // Halssäcken: pumpar lite hela tiden (som riktiga grodor), sväller vid kvack.
      let s = 0.24 + 0.06 * Math.sin(T * 6.5 + u.fas)
      const st = (T - u.sackStart) / u.sackDur
      const sjunger = st >= 0 && st <= 1
      if (sjunger) s = Math.max(s, 0.24 + 1.05 * u.sackMax * Math.pow(Math.sin(Math.PI * st), 0.7))
      u.sack.scale.set(s * 1.05, s)
      // Blink — och glada kisögon medan den sjunger.
      if (T >= u.blinkNasta) {
        u.blinkT = T
        u.blinkNasta = T + rnd(2, 5.5)
      }
      const bt = (T - u.blinkT) / 0.16
      const blink = bt >= 0 && bt <= 1 ? Math.sin(Math.PI * bt) : 0
      // En matad unge ser nöjd ut (lite kisande), och trycker ned ögonen när den sväljer.
      const lock = Math.max(blink, sjunger ? 0.38 : 0, u.matad && u.tuggT <= 0 ? 0.3 : 0, u.svaljT > 0 ? 0.95 : 0)
      for (const l of u.lock) l.scale.y = lock
      // Pupillerna mot målet.
      const gx = this._rotC.x + this._bladC.x + u.c.x
      const gy = this._rotC.y + this._bladC.y + u.c.y - u.hopY - 42
      for (const p of u.pupiller) {
        const dx = this._mal.x - (gx + p.ex)
        const dy = this._mal.y - gy
        const d = Math.hypot(dx, dy) || 1
        p.c.position.set(p.ex + (dx / d) * 2.3, -42 + (dy / d) * 2.3)
      }
      // Armarna: vila eller vifta.
      const vifta = T < u.viftaTill
      for (const a of u.armar) {
        const mal = vifta ? a.s * (-2.1 + 0.5 * Math.sin(T * 15 + u.fas)) : a.s * (-0.22 + 0.04 * andas)
        a.c.rotation += (mal - a.c.rotation) * Math.min(1, dt * 14)
      }
    }
  }

  destroy() {
    if (!this._alive) return
    this._alive = false
    this._kor = null
    if (this._rotC && !this._rotC.destroyed) {
      stadFx(this._rotC)
      this._rotC.destroy({ children: true })
    }
    this._ungar = []
    this._ringar = []
  }
}
