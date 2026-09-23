// INSEKTERNA i Grodan Slurp — egenstyrda småkryp, INTE fysikkroppar.
//
// Ritningen (docs/games/grodan-slurp.md §4a) säger att insekterna är lätta agenter med eget
// flygbeteende: spelet (index.js) avgör när en insekt fångas, flyttar den fångade med
// tungspetsen och säger till när den ätits. Den här filen äger bara tre saker: HUR varje
// sort flyger, HUR den ser ut, och att den lever (vingslag, ben, glöd, glitter) varje bildruta.
//
// VAL SOM GJORDES UTAN ÄGAREN (han sov — noterade här så de går att pröva):
//  ⓵ `lista` är en GETTER som returnerar en NY filtrerad array varje gång. Då kan spelet
//     loopa över den och anropa fanga()/ata() mitt i loopen utan att hoppa över någon.
//     Kostnaden är en liten array per anrop (≤ 6 insekter) — försumbart.
//  ⓶ `uppdatera(dtS, t)` läser INTE `t`. Varje insekt har en egen klocka och egna faser
//     (ingen synkron dans), och en klocka i fel enhet (ms mot s) kan då aldrig ge fel takt.
//     dt klämmas till 0,05 s så en tappad flik inte skjuter iväg någon genom en vägg.
//  ⓷ Fjärilen är den ENDA som ritas framifrån/ovanifrån (kroppen lodrät, vingarna utbredda
//     åt sidorna, vingslaget = skala i x). Det är så en treåring känner igen en fjäril;
//     sedd rakt från sidan är den en tunn streckfigur. Alla andra ritas i sidovy och speglas
//     i x åt flygriktningen (vändningen tar ~0,2 s och går genom skala 0 — läser som en sväng).
//  ⓸ `spawn()` utan x/y lägger insekten strax UTANFÖR `view` på den sida som ligger närmast
//     hemmet, så den flyger in. Utan `hem` blir hemmet en cirkel (r 160) runt startpunkten.
//     Efter `destroy()` returnerar `spawn()` null.
//  ⓹ Gränserna (x 40–1240, y 50 … ytY−36) hålls med MJUK styrning: målpunkter klämmas
//     innanför, och i en 20 px kantzon växer en styrkraft med djupet. Ett nödstopp (aldrig en
//     studs — farten mot kanten nollas bara) finns vid ytY−22 för vattnet och 24 px utanför
//     sidorna, för det fall att vind + skräm tillsammans vinner över styrningen.
//  ⓺ Vind och skräm läggs i en EGEN yttre fart som klingar av (τ 0,6 s) — utanför
//     insektens fartspärr. Lärdom från `flugan-pa-nasan/fluga.js`: en knuff som skrivs i
//     flygfarten klämmas bort i samma bildruta och syns aldrig.
//  ⓻ Glöd (eldflugan), glans (guldflugan) och guldgnistorna använder `lib/glod.js` — en
//     delad Canvas2D-textur, alltså ingen `generateTexture` och ingen `new FillGradient` per
//     insekt. Gnistorna är en återanvänd pool (högst 18) som rivs i destroy().
//  ⓼ Ingen ljudkod här (ingen ctx). Surret som stämd ton-vibrato hör hemma i index.js.
//  ⓽ En fångad insekt vänds åt det håll spelet drar den, och den senast uppmätta farten
//     följer med när `slapp()` släpper den (humlan som sliter sig far vidare, den tvärstannar
//     inte).
//
// EXIT-SÄKERT: all animation sker per bildruta i uppdatera(). Enda tweenen är ata()s krymp,
// som tweenar ett {}-proxy och skriver till vyn bara om `!view.destroyed`; destroy() dödar
// varje sådant proxy. `_alive` stänger alla publika metoder efter destroy(). Inga timers.
//
// FÖRSLAG ATT LYFTA TILL lib/ (inte gjort — reglerna för spelbyggare): styrmodellen
// (wander + arrive + yttre fart + mjuka gränser) är generell för allt som flyger fritt i en
// scen (fåglar, fjärilar, bin). `flugan-pa-nasan/fluga.js` har en egen, enklare variant.

import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { sphereFill, cylinderFill } from '../../lib/form.js'
import { glod } from '../../lib/glod.js'
import { lerpColor } from '../../lib/scene.js'
import { shade, tint } from '../../lib/theme.js'

export const TYPER = ['fluga', 'mygga', 'trollslanda', 'fjaril', 'humla', 'eldfluga', 'guldfluga', 'tjockfluga']

// ---------------------------------------------------------------------------------------
// Konstanter
// ---------------------------------------------------------------------------------------
const TAU = Math.PI * 2
const X_MIN = 40
const X_MAX = 1240
const Y_MIN = 50
const YTA_AVSTAND = 36      // insekterna håller sig minst så här högt över vattenytan
const NOD_YTA = 22          // nödstoppet: aldrig närmare ytan än så här
const NOD_SIDA = 24         // nödstoppet utanför sidorna/taket
const ZON = 20              // kantzonen där den mjuka styrningen börjar
const MAL_KANT = 30         // målpunkter hålls så här långt innanför gränserna
const KANT_K = 700          // px/s² vid en hel zons djup (sidor/tak)
const KANT_MAX = 1600
const VATTEN_K = 1000       // vattnet trycker hårdare än sidorna
const VATTEN_MAX = 2400
const YTTRE_TAU = 0.6       // avklingning för vind + skräm (s)
// Skalets knappar (hem uppe till vänster, ljud uppe till höger, ~24–116 px + träffhalo) — en
// insekt där lockar barnet att trycka PÅ knappen. I hörnkolumnerna ligger taket därför lägre.
const HORN_X0 = 175
const HORN_X1 = 1105
const HORN_Y = 180
const taketVid = (x, y0) => (x < HORN_X0 || x > HORN_X1 ? Math.max(y0, HORN_Y) : y0)
const YTTRE_MAX = 520       // tak för den yttre farten (px/s)
const PIL_BROMS = 1100      // trollsländans inbromsning (px/s²) — v = √(2·a·d) ger mjuk ankomst
const DT_MAX = 0.05
const GNIST_MAX = 18

// Per sort. fart px/s · gain = hur fort flygfarten når önskad fart (1/s) · byte = sekunder
// mellan nya mål · zig/bob = [amplitud px, fMin Hz, fMax Hz] (läggs som FART, så läget
// svänger exakt med amplituden och driver aldrig) · vind = hur mycket vinden tar ·
// flax = vingslag/s (visuellt — nära Nyquist ger surr) · skala = bildens storlek ·
// vandTrosk/vandFart = hysteres (px/s) och takt för att vända sig (myggan byter riktning så
// ofta att en långsam vändning syntes som en tunn strimma i skärmdumpen).
const TYP = {
  fluga:       { r: 16, skala: 1.25, fart: [60, 110], gain: 3.2, byte: [0.8, 1.9], svav: [0.5, 1.0], svavP: 0.32, zig: [3, 5, 8], bob: [1.5, 2.4, 3.2], vind: 1, flax: 17 },
  mygga:       { r: 12, skala: 1.2, fart: [95, 150], gain: 8, byte: [0.22, 0.55], ryck: true, zig: [2.5, 8, 11], bob: [2, 5, 7], vind: 1.3, flax: 20, vandTrosk: 45, vandFart: 24 },
  trollslanda: { r: 20, skala: 1.1, fart: [400, 600], gain: 9, svavGain: 4, svav: [1, 2], pil: true, bob: [2.5, 0.8, 1.4], vind: 0.6, flax: 11 },
  fjaril:      { r: 22, skala: 1.25, fart: [40, 70], gain: 1.6, byte: [1.6, 3.2], hog: true, fladder: [10, 15, 1.5, 2.1], vind: 1.5, flax: 5, symmetrisk: true },
  humla:       { r: 22, skala: 1.2, fart: [45, 70], gain: 1.4, byte: [2, 3.5], bob: [7, 1, 1.3], vind: 0.45, flax: 15, massa: 1 },
  eldfluga:    { r: 16, skala: 1.3, fart: [28, 50], gain: 1.2, byte: [1.5, 3], bob: [6, 0.6, 0.9], vind: 1, flax: 9 },
  guldfluga:   { r: 16, skala: 1.3, fart: [70, 120], gain: 3.4, byte: [0.8, 1.7], svav: [0.4, 0.8], svavP: 0.25, zig: [3, 5, 8], bob: [1.5, 2.4, 3.2], vind: 1, flax: 18, sallsynt: true },
  tjockfluga:  { r: 22, skala: 1.25, fart: [34, 46], gain: 1.1, byte: [1.8, 3.2], svav: [0.8, 1.4], svavP: 0.2, bob: [10, 1.1, 1.5], vind: 0.6, flax: 21 },
}

const slump = (a, b) => a + Math.random() * (b - a)
const slumpI = (p) => slump(p[0], p[1])
const klam = (v, a, b) => (v < a ? a : v > b ? b : v)
const utBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2 }
const levande = (i) => !i.dod && !i.fangad && !i.view.destroyed

// ---------------------------------------------------------------------------------------
// Ritverktyg — varje insekt ritas EN gång vid spawn och animeras sedan med transformer.
// Allt är centrerat kring (0,0) = fångstpunkten, nosen åt HÖGER (+x).
// ---------------------------------------------------------------------------------------
function nod(foralder, x = 0, y = 0) {
  const c = new Container()
  c.position.set(x, y)
  c.eventMode = 'none'
  foralder.addChild(c)
  return c
}

function ritning(foralder) {
  const g = new Graphics()
  g.eventMode = 'none'
  foralder.addChild(g)
  return g
}

// Hierarkin: rot (läge + ät-krymp + intoning) → vand (spegling + storlek) → luta (tippning,
// sprattel) → art (förskjuten så att bildens mitt hamnar på fångstpunkten). Ingen nod skrivs
// av två ägare — en tween mot en egenskap som uppdatera() skriver varje bildruta blir osynlig.
function skal(ox) {
  const rot = new Container()
  rot.eventMode = 'none'
  rot.interactiveChildren = false
  const vand = nod(rot)
  const luta = nod(vand)
  const art = nod(luta, ox, 0)
  return { rot, vand, luta, art, vingar: [], sudd: [], ben: [] }
}

// En vinge i sidovy, ritad kring sin rot i (0,0) och bakåt mot −x. Positiv rotation lyfter
// spetsen. Ådringen gör den till en VINGE och inte till en genomskinlig klick.
function ritSidovinge(g, L, W, stil) {
  g.moveTo(0, 0)
    .bezierCurveTo(-L * 0.22, -W * 1.2, -L * 0.78, -W * 1.1, -L, -W * 0.28)
    .bezierCurveTo(-L * 1.03, W * 0.38, -L * 0.52, W * 0.62, 0, 0)
    .closePath()
    .fill({ color: stil.farg, alpha: stil.alpha })
    .stroke({ width: 1.5, color: 0xffffff, alpha: stil.kantA ?? 0.85, join: 'round' })
  if (stil.ader != null) {
    g.moveTo(-1.5, -0.6).quadraticCurveTo(-L * 0.45, -W * 0.75, -L * 0.9, -W * 0.34)
      .stroke({ width: 0.9, color: stil.ader, alpha: 0.65, cap: 'round' })
    g.moveTo(-2, 0.6).quadraticCurveTo(-L * 0.48, -W * 0.05, -L * 0.82, W * 0.14)
      .stroke({ width: 0.8, color: stil.ader, alpha: 0.5, cap: 'round' })
  }
  // Trollsländans vingmärke (pterostigma) — den lilla mörka fläcken nära spetsen.
  if (stil.flack) g.ellipse(-L * 0.84, -W * 0.62, 2.4, 1.2).fill({ color: 0x3a5577, alpha: 0.75 })
}

// Surrets rörelseoskärpa: en blek solfjäder över hela svepet. Den ligger UTANFÖR den
// roterande vingnoden — en oskärpa som snurrar med i surr-takt flimrar i stället för att stå
// still som den svepta ytan den föreställer. Polygon, ingen arc() (arc-fällan, V23).
function ritSudd(g, L, bas, amp, farg) {
  for (const [R, a] of [[L * 1.0, 0.12], [L * 0.72, 0.14]]) {
    const pts = [0, 0]
    for (let j = 0; j <= 10; j++) {
      const v = Math.PI + (bas - amp) + (2 * amp * j) / 10
      pts.push(Math.cos(v) * R, Math.sin(v) * R)
    }
    g.poly(pts).fill({ color: farg, alpha: a })
  }
}

function sidovinge(foralder, x, y, L, W, bas, amp, off, stil, m) {
  const fast = nod(foralder, x, y)
  if (stil.sudd !== false) {
    const sudd = ritning(fast)
    ritSudd(sudd, L, bas, amp, stil.farg)
    sudd.alpha = 0
    m.sudd.push(sudd)
  }
  const n = nod(fast)
  ritSidovinge(ritning(n), L, W, stil)
  n.rotation = bas
  m.vingar.push({ n, bas, amp, off })
  return n
}

// Ett ben: rot → knä → fot, med en liten fotknopp. Två segment — ett rakt streck läser som
// ett hårstrå, ett knäveck läser som ett insektsben.
function ritBen(g, pts, w, farg, alpha) {
  g.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
  g.stroke({ width: w, color: farg, alpha, cap: 'round', join: 'round' })
  g.circle(pts[pts.length - 2], pts[pts.length - 1], w * 0.75).fill({ color: farg, alpha })
}

// Ett benpar (bortre ELLER närmre sidan) i en egen nod som vrids kring sitt fäste.
// m.ben[0] = bortre sidan, m.ben[1] = närmre — sprattlet går i motfas mellan dem.
function benpar(foralder, x, y, ben, w, farg, alpha, m) {
  const n = nod(foralder, x, y)
  const g = ritning(n)
  for (const b of ben) ritBen(g, b, w, farg, alpha)
  m.ben.push(n)
  return n
}

// Ett lodrätt band av en ellips mellan x = xa och xb — humlans ränder utan mask.
function ellipsBand(g, cx, cy, rx, ry, xa, xb, farg) {
  const N = 8
  const pts = []
  const yv = (x) => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))
  for (let i = 0; i <= N; i++) { const x = xa + ((xb - xa) * i) / N; pts.push(x, cy - yv(x)) }
  for (let i = N; i >= 0; i--) { const x = xa + ((xb - xa) * i) / N; pts.push(x, cy + yv(x)) }
  g.poly(pts).fill(farg)
}

// ---------------------------------------------------------------------------------------
// FLUGAN (och guldflugan — samma kropp, annan palett)
// ---------------------------------------------------------------------------------------
const FLUG_FARG = { kropp: 0x34405a, bak: 0x2a3550, glans: 0x86acdc, oga: 0xd8433f, ogaM: 0x8f2622, ben: 0x1f252e, vinge: 0xe4eef8, ader: 0x9db6c9 }
const GULD_FARG = { kropp: 0xf2b630, bak: 0xe6a21a, glans: 0xfff3b0, oga: 0xc23a2b, ogaM: 0x7a1d14, ben: 0x7a4f10, vinge: 0xfff4d6, ader: 0xe3bd5c }

function byggFluga(f = FLUG_FARG) {
  const m = skal(0)
  const a = m.art
  // Bortre sidan först: vinge och ben i skugga bakom kroppen.
  sidovinge(a, -1, -6.5, 20, 7, 0.62, 0.6, 0.55, { farg: f.vinge, alpha: 0.26, kantA: 0.5 }, m)
  benpar(a, 1, 5, [[4, 0, 8, 6, 10, 11], [1, 0, 1, 7, -1, 12], [-2, 0, -7, 5, -11, 9]], 1.7, f.ben, 0.55, m)

  const k = ritning(a)
  // Bakkroppen: blåsvart och glänsande, två segmentveck och en blank rygglinje.
  k.ellipse(-8, 1.5, 10.5, 7.5).fill(sphereFill(f.bak, { lightY: 0.24, dark: 0.36 }))
    .stroke({ width: 1.6, color: shade(f.bak, 0.45) })
  k.moveTo(-12.5, -4.8).quadraticCurveTo(-10.5, 1.5, -12.5, 7.8).stroke({ width: 1.3, color: shade(f.bak, 0.5), alpha: 0.7 })
  k.moveTo(-6, -5.6).quadraticCurveTo(-4, 1.5, -6, 8.6).stroke({ width: 1.3, color: shade(f.bak, 0.5), alpha: 0.6 })
  k.moveTo(-15.5, -1.5).quadraticCurveTo(-10, -5.6, -3, -4.4).stroke({ width: 2.2, color: f.glans, alpha: 0.6, cap: 'round' })
  // Mellankroppen med några borst.
  k.ellipse(3, -0.5, 7.5, 7).fill(sphereFill(f.kropp, { lightY: 0.22, dark: 0.3 }))
    .stroke({ width: 1.6, color: shade(f.kropp, 0.45) })
  for (const [x0, y0, x1, y1] of [[0, -7, -1, -10.5], [3.5, -7.4, 3.5, -11], [7, -6, 8.5, -9.5]]) {
    k.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 1.2, color: shade(f.kropp, 0.3), cap: 'round' })
  }
  // Sugsnabeln först, så huvudet täcker roten.
  k.moveTo(14.5, 4.5).quadraticCurveTo(16.5, 8, 17.5, 9.5).stroke({ width: 2.2, color: shade(f.kropp, 0.2), cap: 'round' })
  k.ellipse(18, 9.8, 2, 1.3).fill(shade(f.kropp, 0.15))
  k.circle(11.5, 0.5, 6.5).fill(sphereFill(f.kropp, { lightY: 0.2, dark: 0.3 }))
    .stroke({ width: 1.5, color: shade(f.kropp, 0.45) })
  k.moveTo(15, -4.5).lineTo(17.5, -8).stroke({ width: 1.4, color: f.ben, cap: 'round' })
  // FACETTÖGAT: stort och rött — det enda som skiljer en fluga från vilken mörk prick som helst.
  k.ellipse(12.8, -1, 5.3, 5.8).fill(sphereFill(f.oga, { lightY: 0.26, dark: 0.36 }))
    .stroke({ width: 1.4, color: f.ogaM })
  k.moveTo(8, -1).lineTo(17.6, -1).stroke({ width: 0.8, color: f.ogaM, alpha: 0.5 })
  k.moveTo(12.8, -6.3).lineTo(12.8, 4.3).stroke({ width: 0.8, color: f.ogaM, alpha: 0.45 })
  k.circle(11, -3.4, 1.7).fill({ color: 0xffffff, alpha: 0.9 })

  // Närmre sidan.
  benpar(a, 3, 5.5, [[4, 0, 8, 6, 11, 12], [1, 0, 1.5, 7, -0.5, 13], [-2, -0.5, -7, 5, -11, 10]], 1.9, f.ben, 1, m)
  sidovinge(a, 0, -6.8, 21, 7.5, 0.5, 0.6, 0, { farg: f.vinge, alpha: 0.46, ader: f.ader }, m)
  return m
}

function byggGuldfluga() {
  const m = byggFluga(GULD_FARG)
  // Ett varmt sken bakom kroppen och en blänkande stjärna på ryggen — WOW, inte bara gul.
  const sken = glod({ namn: 'prick', color: 0xffd75a, size: 64, alpha: 0.4 })
  if (sken) { sken.position.set(0, 0); m.art.addChildAt(sken, 0) }
  const blank = glod({ namn: 'stjarna', color: 0xfff2a8, size: 30, alpha: 0.8 })
  if (blank) {
    blank.position.set(-5, -4)
    m.art.addChild(blank)
    m.blank = blank
    m.blankBas = blank.scale.x
  }
  return m
}

// ---------------------------------------------------------------------------------------
// MYGGAN — smal, långbent, lång snabel
// ---------------------------------------------------------------------------------------
const MYGG = { kropp: 0x86705a, mork: 0x4b3b2f, ben: 0x5a4838, vinge: 0xeef5fb, ader: 0xb6c8d6 }

function byggMygga() {
  const f = MYGG
  const m = skal(-1)
  const a = m.art
  sidovinge(a, 0, -3.5, 17, 3.8, 0.34, 0.55, 0.6, { farg: f.vinge, alpha: 0.26, kantA: 0.5 }, m)
  benpar(a, 1, 3, [[3, 0, 10, 8, 17, 20], [1, 0, 2, 10, -1, 22], [-1, 0, -9, 8, -18, 18]], 1.1, f.ben, 0.55, m)

  const k = ritning(a)
  k.ellipse(-10.5, 2, 11, 3.8).fill(sphereFill(f.kropp, { lightY: 0.3, dark: 0.34 }))
    .stroke({ width: 1.2, color: shade(f.kropp, 0.45) })
  for (const x of [-17, -13, -9, -5]) k.moveTo(x, -1.2).lineTo(x - 0.8, 5.4).stroke({ width: 1.2, color: f.mork, alpha: 0.55 })
  k.ellipse(2, -0.5, 5.6, 5).fill(sphereFill(f.kropp, { lightY: 0.24 }))
    .stroke({ width: 1.2, color: shade(f.kropp, 0.45) })
  k.moveTo(-1.5, -3.6).quadraticCurveTo(2, -5.2, 5.6, -3).stroke({ width: 1.4, color: tint(f.kropp, 0.45), alpha: 0.8, cap: 'round' })
  // Snabeln och de fjäderlika antennerna först, så huvudet täcker rötterna.
  k.moveTo(11, 1.8).lineTo(23.5, 6.6).stroke({ width: 1.5, color: f.mork, cap: 'round' })
  k.moveTo(9.5, -2.5).quadraticCurveTo(11.5, -7.5, 14.5, -10.5).stroke({ width: 1.1, color: f.mork, cap: 'round' })
  for (const [x, y] of [[10.6, -5], [11.8, -7.2], [13.2, -9]]) {
    k.moveTo(x, y).lineTo(x - 2.2, y - 1).stroke({ width: 0.8, color: f.mork, alpha: 0.8, cap: 'round' })
    k.moveTo(x, y).lineTo(x + 1.8, y - 2).stroke({ width: 0.8, color: f.mork, alpha: 0.8, cap: 'round' })
  }
  k.circle(8.5, 0.5, 3.9).fill(sphereFill(f.mork, { lightY: 0.26 }))
  k.circle(9.3, -0.1, 2.7).fill(0x231d19)
  k.circle(8.6, -1, 0.9).fill({ color: 0xffffff, alpha: 0.9 })

  benpar(a, 2, 3.5, [[3, 0, 11, 8, 18, 21], [1, 0, 2.5, 11, 0, 23], [-1, 0, -8, 9, -17, 19.5]], 1.2, f.ben, 1, m)
  sidovinge(a, 1, -4, 18, 4.2, 0.28, 0.55, 0, { farg: f.vinge, alpha: 0.45, ader: f.ader }, m)
  return m
}

// ---------------------------------------------------------------------------------------
// TROLLSLÄNDAN — lång turkos segmenterad bakkropp, jätteögon, fyra glittrande vingar
// ---------------------------------------------------------------------------------------
const TROLL = {
  bak: 0x2fb8d8, bakM: 0x146a86, brost: 0x2a93b8, band: 0x8ce8b0, oga: 0x3e72dc, ogaM: 0x1d3f8a,
  ben: 0x1d2a33, vinge: 0xeaf7ff, ader: 0xb9d9ee, glitter: [0xff9ee0, 0x9ef3ff, 0xfff49e, 0xb7a6ff],
}

function byggTrollslanda() {
  const f = TROLL
  const m = skal(10)
  const a = m.art
  // Bortre vingparet: ingen egen oskärpa (fyra solfjädrar ovanpå varandra blir mjölk).
  sidovinge(a, 16, -6, 34, 5.5, 0.3, 0.3, 1.3, { farg: f.vinge, alpha: 0.22, kantA: 0.55, sudd: false }, m)
  sidovinge(a, 12, -6, 32, 6.5, 0.12, 0.28, 2.9, { farg: f.vinge, alpha: 0.22, kantA: 0.55, sudd: false }, m)
  benpar(a, 14, 5.5, [[2, 0, 7, 5, 11, 4], [0, 0, 2, 7, 6, 9], [-2, 0, -3, 7, 0, 11]], 1.5, f.ben, 0.55, m)

  // Bakkroppen: ett långt, avsmalnande rör som böjer sig svagt nedåt mot spetsen.
  const b = ritning(a)
  const N = 14
  const x0 = 9
  const x1 = -44
  const rad = (t) => ({ x: x0 + (x1 - x0) * t, w: 4.4 - 2.2 * t, yc: 1.8 * t * t })
  const pts = []
  for (let i = 0; i <= N; i++) { const p = rad(i / N); pts.push(p.x, p.yc - p.w) }
  for (let i = N; i >= 0; i--) { const p = rad(i / N); pts.push(p.x, p.yc + p.w) }
  b.poly(pts).fill(cylinderFill(f.bak, { axis: 'x' })).stroke({ width: 1.4, color: shade(f.bak, 0.4), join: 'round' })
  b.circle(x1, 1.8, 2.2).fill(f.bakM)
  for (let s = 1; s <= 8; s++) {
    const p = rad(s / 9)
    b.moveTo(p.x, p.yc - p.w).lineTo(p.x, p.yc + p.w).stroke({ width: 1.2, color: f.bakM, alpha: 0.85 })
    b.ellipse(p.x + 1.8, p.yc - p.w + 1.1, 1.8, 1).fill({ color: f.bakM, alpha: 0.7 })
  }
  b.moveTo(x1 - 1, 0.6).lineTo(x1 - 5, -1.6).stroke({ width: 1.4, color: f.bakM, cap: 'round' })
  b.moveTo(x1 - 1, 3).lineTo(x1 - 5, 5).stroke({ width: 1.4, color: f.bakM, cap: 'round' })

  const k = ritning(a)
  k.ellipse(15, 0, 7.8, 6.8).fill(sphereFill(f.brost, { lightY: 0.26 }))
    .stroke({ width: 1.5, color: shade(f.brost, 0.42) })
  k.moveTo(11.5, -5).quadraticCurveTo(14, 0, 12.2, 5.6).stroke({ width: 2.2, color: f.band, alpha: 0.9, cap: 'round' })
  k.moveTo(16.5, -6).quadraticCurveTo(19, 0, 17.4, 5.8).stroke({ width: 2, color: f.band, alpha: 0.8, cap: 'round' })
  k.circle(23.5, 0.8, 5.2).fill(sphereFill(f.brost, { lightY: 0.24 }))
  k.ellipse(24, -1.8, 5.8, 5.6).fill(sphereFill(f.oga, { lightY: 0.24, dark: 0.38 }))
    .stroke({ width: 1.4, color: f.ogaM })
  k.circle(22.2, -4.2, 1.8).fill({ color: 0xffffff, alpha: 0.9 })
  k.circle(26, -0.4, 0.9).fill({ color: 0xffffff, alpha: 0.6 })
  k.moveTo(26.5, 4).quadraticCurveTo(28, 4.6, 29, 3.6).stroke({ width: 1.2, color: shade(f.brost, 0.5), cap: 'round' })

  // Benen hålls framåt som en korg — så jagar en trollslända.
  benpar(a, 15, 6, [[2, 0, 7.5, 5.5, 12, 4.5], [0, 0, 2.5, 7.5, 6.5, 10], [-2, 0, -3, 7.5, 0, 12]], 1.7, f.ben, 1, m)
  const v1 = sidovinge(a, 17.5, -6.4, 36, 6, 0.26, 0.32, 0, { farg: f.vinge, alpha: 0.4, ader: f.ader, flack: true }, m)
  const v2 = sidovinge(a, 13, -6.4, 33, 7, 0.1, 0.3, 1.6, { farg: f.vinge, alpha: 0.4, ader: f.ader, flack: true }, m)

  // Glitterkanten: färgade prickar längs framkanten som blänker till när vingen fångar ljuset.
  m.glitter = []
  for (const [v, L, W] of [[v1, 36, 6], [v2, 33, 7]]) {
    const g = ritning(v)
    for (let i = 0; i < 5; i++) {
      const t = 0.2 + i * 0.16
      g.circle(-L * t, -W * 0.72 * Math.sin(Math.PI * (0.12 + 0.8 * t)), 1.3).fill(f.glitter[i % 4])
    }
    g.alpha = 0
    m.glitter.push(g)
  }
  return m
}

// ---------------------------------------------------------------------------------------
// FJÄRILEN — framifrån: kroppen lodrät, två vingpar som slår genom att skalas i x
// ---------------------------------------------------------------------------------------
const FJARIL_SCHEMAN = [
  { vinge: 0xffd84a, inre: 0xfff1a0, kant: 0x7a5418, prick: 0xff8f2e }, // citronfjäril
  { vinge: 0x58a8ff, inre: 0xbfe2ff, kant: 0x1e3c8c, prick: 0xffffff }, // blåvinge
  { vinge: 0xff6f9c, inre: 0xffc6d8, kant: 0x7a1f45, prick: 0xfff0a0 }, // rosa
  { vinge: 0xff8a2a, inre: 0xffc47c, kant: 0x2d1b12, prick: 0xffffff }, // monark
]

function ritFjarilVinge(g, sx, framre, s) {
  const X = (v) => v * sx
  if (framre) {
    g.moveTo(X(-1), -3)
      .bezierCurveTo(X(-8), -24, X(-29), -27, X(-31), -16)
      .bezierCurveTo(X(-32), -7, X(-18), 1, X(-1), 1.5)
      .closePath()
      .fill(s.vinge)
      .stroke({ width: 2.2, color: s.kant, join: 'round' })
    g.moveTo(X(-3), -3.5)
      .bezierCurveTo(X(-9), -18, X(-23), -21, X(-24), -14)
      .bezierCurveTo(X(-25), -8, X(-15), -2, X(-3), -1)
      .closePath()
      .fill({ color: s.inre, alpha: 0.6 })
    for (const [x, y] of [[-28, -19], [-23.5, -23], [-17.5, -24.2], [-30, -12.5]]) g.circle(X(x), y, 1.8).fill(s.prick)
    g.circle(X(-16), -12, 3.8).fill(s.kant)
    g.circle(X(-16), -12, 2).fill(s.prick)
  } else {
    g.moveTo(X(-1), 2)
      .bezierCurveTo(X(-11), 0, X(-25), 6, X(-22), 16)
      .bezierCurveTo(X(-19), 25, X(-6), 21, X(-1), 7)
      .closePath()
      .fill(s.vinge)
      .stroke({ width: 2.2, color: s.kant, join: 'round' })
    g.moveTo(X(-3), 4)
      .bezierCurveTo(X(-10), 3, X(-19), 8, X(-17), 14)
      .bezierCurveTo(X(-15), 19, X(-7), 16, X(-3), 7)
      .closePath()
      .fill({ color: s.inre, alpha: 0.55 })
    g.circle(X(-13), 13, 3).fill(s.kant)
    g.circle(X(-13), 13, 1.5).fill(s.prick)
    g.circle(X(-20), 17, 1.6).fill(s.prick)
  }
}

function byggFjaril() {
  const s = FJARIL_SCHEMAN[Math.floor(Math.random() * FJARIL_SCHEMAN.length)]
  const m = skal(0)
  const a = m.art
  m.fjaril = []
  // Bakvingarna först (under), sedan framvingarna. Bakvingen släpar lite efter i slaget.
  for (const [framre, off] of [[false, -0.45], [true, 0]]) {
    for (const sx of [-1, 1]) {
      const n = nod(a)
      ritFjarilVinge(ritning(n), sx, framre, s)
      m.fjaril.push({ n, off })
    }
  }
  const k = ritning(a)
  for (const sx of [-1, 1]) {
    k.moveTo(sx * 1.2, -12.5).quadraticCurveTo(sx * 4.5, -21, sx * 8.5, -24.5).stroke({ width: 1.4, color: 0x2e2420, cap: 'round' })
    k.circle(sx * 8.5, -24.5, 2.3).fill(0x2e2420)
  }
  k.ellipse(0, 9, 2.9, 9.5).fill(sphereFill(0x4a3a30, { lightX: 0.35 }))
  for (const y of [4, 8, 12]) k.moveTo(-2.6, y).quadraticCurveTo(0, y + 1.2, 2.6, y).stroke({ width: 0.9, color: 0x2a201b, alpha: 0.7 })
  k.ellipse(0, -2, 3.8, 5.8).fill(sphereFill(0x5a4838, { lightX: 0.35 }))
  k.circle(0, -10, 4).fill(sphereFill(0x3b2f2a))
  for (const sx of [-1, 1]) {
    k.circle(sx * 1.7, -10.6, 1.3).fill(0x111111)
    k.circle(sx * 1.7 - 0.4, -11, 0.5).fill(0xffffff)
  }
  return m
}

// ---------------------------------------------------------------------------------------
// HUMLAN — rund, luden, randig, med en pollenkorg på bakbenet
// ---------------------------------------------------------------------------------------
const HUMLA = { svart: 0x2b2420, gul: 0xffc83a, vit: 0xfff4dc, vinge: 0xeaf4ff, ader: 0xb8cadb, pollen: 0xffa22b }

function byggHumla() {
  const f = HUMLA
  const m = skal(-1.5)
  const a = m.art
  sidovinge(a, 2, -12, 17, 7, 0.78, 0.7, 0.5, { farg: f.vinge, alpha: 0.28, kantA: 0.5 }, m)
  benpar(a, 0, 13.5, [[4, 0, 7, 5, 6, 9], [-2, 0, -3, 6, -6, 9.5], [-8, -1, -13, 4, -15, 8.5]], 2.8, f.svart, 0.7, m)

  const cx = -2
  const cy = 2
  const rx = 19
  const ry = 15
  ritning(a).ellipse(cx, cy, rx, ry).fill(sphereFill(f.svart, { highlight: 0.22, dark: 0.3 }))
  // Ränderna, var och en i egen Graphics.
  ellipsBand(ritning(a), cx, cy, rx, ry, 4, 11.5, f.gul)
  ellipsBand(ritning(a), cx, cy, rx, ry, -9, -2, f.gul)
  ellipsBand(ritning(a), cx, cy, rx, ry, cx - rx, -14, f.vit)
  // Pälsen: korta tofsar runt hela konturen, i den rands färg de sitter på.
  const pals = ritning(a)
  const randFarg = (x) => ((x >= 4 && x <= 11.5) || (x >= -9 && x <= -2) ? f.gul : x <= -14 ? f.vit : f.svart)
  for (let i = 0; i < 34; i++) {
    const v = (i / 34) * TAU + 0.09
    const ex = cx + rx * Math.cos(v)
    const ey = cy + ry * Math.sin(v)
    const vv = v + 0.25 * Math.sin(i * 2.3)
    const nx = Math.cos(vv)
    const ny = Math.sin(vv)
    pals.moveTo(ex - nx * 2, ey - ny * 2).lineTo(ex + nx * 3, ey + ny * 3).stroke({ width: 3, color: randFarg(ex), cap: 'round' })
  }
  // Volym: skugga under, glans över.
  const vol = ritning(a)
  vol.ellipse(cx + 1, cy + 8, rx * 0.8, ry * 0.42).fill({ color: 0x000000, alpha: 0.16 })
  vol.ellipse(cx - 5, cy - 8, 8.5, 4.5).fill({ color: 0xffffff, alpha: 0.3 })

  // Huvudet: ett vänligt öga, en rosa kind och ett litet leende.
  const h = ritning(a)
  h.moveTo(19, -3).lineTo(22, -10).lineTo(26.5, -11.5).stroke({ width: 1.8, color: f.svart, cap: 'round', join: 'round' })
  h.circle(17, 4, 8.5).fill(sphereFill(f.svart, { highlight: 0.3 }))
  for (let i = 0; i < 9; i++) {
    const v = -2.7 + (i / 8) * 2.2
    const ex = 17 + 8.5 * Math.cos(v)
    const ey = 4 + 8.5 * Math.sin(v)
    h.moveTo(ex - Math.cos(v) * 1.5, ey - Math.sin(v) * 1.5).lineTo(ex + Math.cos(v) * 2.4, ey + Math.sin(v) * 2.4)
      .stroke({ width: 2.4, color: f.svart, cap: 'round' })
  }
  h.ellipse(19.8, 1.8, 3.4, 4).fill(0xffffff)
  h.circle(20.6, 2.4, 2.3).fill(0x1a1512)
  h.circle(19.7, 1, 0.95).fill(0xffffff)
  h.circle(22, 7.5, 2).fill({ color: 0xff9aa6, alpha: 0.55 })
  h.moveTo(19.6, 9.4).quadraticCurveTo(21.4, 10.6, 23.2, 9).stroke({ width: 1.3, color: 0x7a5a50, cap: 'round' })

  const nara = benpar(a, 2, 14, [[4, 0, 7.5, 5, 6.5, 9.5], [-2, 0, -2.5, 6.5, -5.5, 10], [-8, -1, -13, 4.5, -15, 9]], 3, f.svart, 1, m)
  ritning(nara).circle(-12.5, 4.8, 3.4).fill(sphereFill(f.pollen)).stroke({ width: 1, color: shade(f.pollen, 0.35) })
  sidovinge(a, 3, -12.5, 18, 7.5, 0.72, 0.7, 0, { farg: f.vinge, alpha: 0.5, ader: f.ader }, m)
  return m
}

// ---------------------------------------------------------------------------------------
// ELDFLUGAN — liten skalbagge vars bakkropp lyser gulgrönt
// ---------------------------------------------------------------------------------------
const ELD = { tak: 0x3d3029, skold: 0xe0674a, prick: 0x2a1d18, lykta: 0xf4ffa0, glod: 0xd8ff62, ben: 0x2a211c, vinge: 0xeef6e8, ader: 0xc4d4b8 }

function byggEldfluga() {
  const f = ELD
  const m = skal(-1.5)
  const a = m.art
  // Glöden ligger UNDER kroppen — den är ljuset lyktan sänder ut, inte formen.
  const halo = glod({ namn: 'prick', color: f.glod, size: 92, alpha: 0.7 })
  if (halo) {
    halo.position.set(-9, 3.5)
    a.addChild(halo)
    m.halo = halo
    m.haloBas = halo.scale.x
  }
  sidovinge(a, 1, -4.5, 17, 5.5, 0.95, 0.6, 0.5, { farg: f.vinge, alpha: 0.26, kantA: 0.5 }, m)
  benpar(a, 3, 4, [[2, 0, 5, 4.5, 7, 8], [0, 0, 0.5, 5, -1.5, 8.5], [-2, 0, -5, 4, -7.5, 7.5]], 1.5, f.ben, 0.55, m)

  const ly = ritning(a)
  ly.ellipse(-8.5, 3, 8.2, 4.9).fill(f.lykta)
  ly.moveTo(-12, -0.5).quadraticCurveTo(-13, 3, -12, 6.8).stroke({ width: 1, color: 0xb9c774, alpha: 0.7 })
  ly.moveTo(-8, -1.2).quadraticCurveTo(-9, 3, -8, 7.6).stroke({ width: 1, color: 0xb9c774, alpha: 0.6 })
  m.lykta = ly
  const karna = glod({ namn: 'prick', color: 0xf8ffc0, size: 28, alpha: 0.8 })
  if (karna) {
    karna.position.set(-9, 3.5)
    a.addChild(karna)
    m.karna = karna
  }

  const k = ritning(a)
  k.ellipse(-2.5, -1.8, 10.5, 5.2).fill(sphereFill(f.tak, { lightY: 0.25 }))
    .stroke({ width: 1.3, color: shade(f.tak, 0.45) })
  k.moveTo(-12, -2.5).quadraticCurveTo(-3, -7.4, 7, -3.2).stroke({ width: 1.2, color: tint(f.tak, 0.35), alpha: 0.7 })
  k.ellipse(6.5, -0.6, 5, 4.6).fill(sphereFill(f.skold, { lightY: 0.24 }))
    .stroke({ width: 1.2, color: shade(f.skold, 0.4) })
  k.ellipse(6.4, -1.6, 2.1, 1.8).fill(f.prick)
  k.moveTo(12.3, -1.2).quadraticCurveTo(15.5, -6.5, 19.5, -7.5).stroke({ width: 1.2, color: f.ben, cap: 'round' })
  k.circle(11, 1.6, 3.7).fill(sphereFill(f.prick))
  k.circle(12, 0.9, 2).fill(0x14100e)
  k.circle(11.4, 0.2, 0.7).fill(0xffffff)

  benpar(a, 4, 4.5, [[2, 0, 5.5, 4.5, 7.5, 8.5], [0, 0, 0.5, 5.5, -1.5, 9], [-2, 0, -5.5, 4.5, -8, 8]], 1.6, f.ben, 1, m)
  sidovinge(a, 2, -5, 18, 6, 0.9, 0.6, 0, { farg: f.vinge, alpha: 0.42, ader: f.ader }, m)
  return m
}

// ---------------------------------------------------------------------------------------
// TJOCKFLUGAN — autohjälpen: rund, trött och lite fånig, med pyttesmå vingar
// ---------------------------------------------------------------------------------------
const TJOCK = { kropp: 0x46587a, bak: 0x3c4c6c, glans: 0x9cc2ec, oga: 0xe0584a, ogaM: 0x8f2622, ben: 0x262c36, vinge: 0xe8f0fa, ader: 0xa9bfd2 }

function byggTjockfluga() {
  const f = TJOCK
  const m = skal(-3.5)
  const a = m.art
  sidovinge(a, 4, -12, 13, 5.5, 0.75, 0.8, 0.5, { farg: f.vinge, alpha: 0.28, kantA: 0.5 }, m)
  benpar(a, 1, 13, [[3, 0, 5.5, 5, 4.5, 9], [0, 0, -1, 5, -3, 9], [-4, -1, -8, 3, -10.5, 7]], 2.6, f.ben, 0.55, m)

  const k = ritning(a)
  k.circle(-5, 3, 15.5).fill(sphereFill(f.bak, { lightY: 0.26, dark: 0.38 }))
    .stroke({ width: 2, color: shade(f.bak, 0.45) })
  k.moveTo(-13, -9.5).quadraticCurveTo(-8, 3, -13, 15.5).stroke({ width: 2.4, color: f.glans, alpha: 0.3, cap: 'round' })
  k.moveTo(-3, -12).quadraticCurveTo(1.5, 3, -3, 17.8).stroke({ width: 2.4, color: f.glans, alpha: 0.3, cap: 'round' })
  k.ellipse(-10, -5, 5, 3).fill({ color: 0xffffff, alpha: 0.28 })
  for (const [x0, y0, x1, y1] of [[-14, -9, -16, -13], [-8, -11.5, -8.5, -15.5], [-2, -11.5, -1, -15.5]]) {
    k.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 1.4, color: shade(f.bak, 0.3), cap: 'round' })
  }
  k.ellipse(8, -1, 9, 9).fill(sphereFill(f.kropp, { lightY: 0.24 }))
    .stroke({ width: 1.8, color: shade(f.kropp, 0.45) })
  k.moveTo(23, 7).quadraticCurveTo(25.5, 10, 26.5, 12.5).stroke({ width: 2.6, color: shade(f.kropp, 0.2), cap: 'round' })
  k.ellipse(27, 12.8, 2.3, 1.5).fill(shade(f.kropp, 0.15))
  k.circle(17, 2, 8.5).fill(sphereFill(f.kropp, { lightY: 0.22 }))
    .stroke({ width: 1.6, color: shade(f.kropp, 0.45) })
  k.moveTo(20, -5.5).lineTo(22, -10).stroke({ width: 1.6, color: f.ben, cap: 'round' })
  // Ett stort SÖMNIGT öga: ögonlocket hänger över övre halvan.
  k.ellipse(18.6, 0.5, 6.3, 6.6).fill(sphereFill(f.oga, { lightY: 0.5, dark: 0.34 }))
    .stroke({ width: 1.5, color: f.ogaM })
  k.circle(21, 3.2, 1.4).fill({ color: 0xffffff, alpha: 0.85 })
  // Locket är LJUSARE än kroppen och kanten böjd — mörkt och rakt läste det som ett visir, och
  // fransar över det röda ögat läste som en tandrad (båda sedda i skärmdumpen).
  const lock = []
  for (let i = 0; i <= 12; i++) {
    const v = Math.PI + (Math.PI * i) / 12
    lock.push(18.6 + 6.9 * Math.cos(v), 0.5 + 7.2 * Math.sin(v))
  }
  // Lockets underkant: samma kvadratiska kurva som kantlinjen nedan, så de ligger kant i kant.
  for (let j = 0; j <= 8; j++) {
    const t = j / 8
    const u = 1 - t
    lock.push(u * u * 25.2 + 2 * u * t * 18.6 + t * t * 12, u * u * -1.4 + 2 * u * t * 1.4 + t * t * -1.4)
  }
  k.poly(lock).fill(sphereFill(tint(f.kropp, 0.28), { lightY: 0.3 }))
  k.moveTo(12, -1.4).quadraticCurveTo(18.6, 1.4, 25.2, -1.4).stroke({ width: 1.5, color: shade(f.kropp, 0.45), cap: 'round' })

  benpar(a, 3, 13.5, [[3, 0, 6, 5, 5, 9.5], [0, 0, -0.5, 5.5, -2.5, 9.5], [-4, -1, -8, 3.5, -10.5, 7.5]], 2.8, f.ben, 1, m)
  sidovinge(a, 5, -12.5, 14, 6, 0.7, 0.8, 0, { farg: f.vinge, alpha: 0.48, ader: f.ader }, m)
  return m
}

const BYGG = {
  fluga: () => byggFluga(FLUG_FARG),
  mygga: byggMygga,
  trollslanda: byggTrollslanda,
  fjaril: byggFjaril,
  humla: byggHumla,
  eldfluga: byggEldfluga,
  guldfluga: byggGuldfluga,
  tjockfluga: byggTjockfluga,
}

// ---------------------------------------------------------------------------------------
// SVÄRMEN
// ---------------------------------------------------------------------------------------
export class Svarm {
  /**
   * @param {object} o
   *   lager  Container där insekterna ritas (spelet äger den — den rivs inte här)
   *   ytY    vattenytans y (560)
   *   view   ctx.view — LEVANDE, läses vid användning, muteras aldrig
   */
  constructor({ lager, ytY = 560, view } = {}) {
    this._alive = true
    this._ytY = Number.isFinite(ytY) ? ytY : 560
    this._view = view || null
    this._vind = 0
    this._alla = []          // alla insekter som har en vy: flygande, fångade och de som äts just nu
    this._proxy = new Set()  // ata()-tweenernas proxy-objekt — dödas i destroy()
    this._gnistor = []       // guldflugans gnistpool
    this._gnistLager = new Container()
    this._kryp = new Container()
    for (const c of [this._gnistLager, this._kryp]) {
      c.eventMode = 'none'
      c.interactiveChildren = false
    }
    lager?.addChild(this._gnistLager, this._kryp)
  }

  /** Levande, EJ fångade insekter. En ny array per anrop — säker att loopa över medan man fångar. */
  get lista() {
    return this._alla.filter(levande)
  }

  _granser() {
    return { x0: X_MIN, x1: X_MAX, y0: Y_MIN, y1: this._ytY - YTA_AVSTAND }
  }

  _vy() {
    return this._view || { left: 0, right: 1280, top: 0, bottom: 720 }
  }

  _normHem(h, reserv) {
    const b = this._granser()
    const x = Number(h?.x)
    const y = Number(h?.y)
    const r = Number(h?.r)
    return {
      x: klam(Number.isFinite(x) ? x : reserv?.x ?? 640, b.x0, b.x1),
      y: klam(Number.isFinite(y) ? y : reserv?.y ?? 300, b.y0, b.y1),
      r: klam(Number.isFinite(r) && r > 0 ? r : reserv?.r ?? 160, 40, 320),
    }
  }

  /**
   * Släpp ut en insekt. `hem` = { x, y, r } — området den håller sig i. x,y = startläge
   * (får ligga utanför bild; den flyger då in). Returnerar insekten (null efter destroy()).
   */
  spawn(typ, { x, y, hem } = {}) {
    if (!this._alive) return null
    if (!TYP[typ]) typ = 'fluga'
    const k = TYP[typ]
    const b = this._granser()
    const harXY = Number.isFinite(x) && Number.isFinite(y)
    const h = hem
      ? this._normHem(hem)
      : this._normHem({ x: harXY ? klam(x, 160, 1120) : slump(200, 1080), y: harXY ? klam(y, 120, b.y1 - 60) : slump(140, 400), r: 160 })
    if (!harXY) {
      const v = this._vy()
      x = h.x < 640 ? v.left - 40 : v.right + 40
      y = klam(h.y + slump(-60, 60), b.y0 + 30, b.y1 - 40)
    }

    const m = BYGG[typ]()
    this._kryp.addChild(m.rot)
    const inne = x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
    const v = this._vy()
    const synlig = x >= v.left && x <= v.right && y >= v.top && y <= v.bottom
    const fart = slumpI(k.fart)
    const ins = {
      typ,
      x,
      y,
      vx: 0,
      vy: 0,
      r: k.r,
      hem: h,
      fangad: false,
      dod: false,
      view: m.rot,
      massa: k.massa || 0,
      sallsynt: !!k.sallsynt,
      _s: {
        k,
        m,
        fart,
        pilFart: 0,
        fvx: 0,
        fvy: 0,
        uvx: 0,
        uvy: 0,
        mal: { x: h.x, y: h.y },
        malT: 0,
        lage: k.pil ? 'svav' : 'flyg',
        lageT: k.pil ? slump(0.3, 0.9) : 0,
        inne,
        t: Math.random() * 10,
        fas: Math.random() * TAU,
        zigF: k.zig ? slump(k.zig[1], k.zig[2]) : 0,
        zigFas: Math.random() * TAU,
        bobF: k.bob ? slump(k.bob[1], k.bob[2]) : 0,
        bobFas: Math.random() * TAU,
        flA: k.fladder ? slump(k.fladder[0], k.fladder[1]) : 0,
        flF: k.fladder ? slump(k.fladder[2], k.fladder[3]) : 0,
        flFas: Math.random() * TAU,
        flFas2: Math.random() * TAU,
        vingFas: Math.random() * TAU,
        flaxMul: slump(0.88, 1.12),
        benFas: Math.random() * TAU,
        glodFas: Math.random() * TAU,
        glodPer: slump(1.6, 2.5),
        gnistT: slump(0, 0.1),
        vandMal: 1,
        vandNu: 1,
        inT: synlig ? 0 : 1,
        px: x,
        py: y,
        dragVx: 0,
        dragVy: 0,
      },
    }
    const s = ins._s
    // Riktning och första mål: in mot hemmet.
    const dx = h.x - x
    const dy = h.y - y
    const d = Math.hypot(dx, dy) || 1
    // Fjärilen är symmetrisk och speglas aldrig (en speglad förälder vänder tippningens tecken).
    s.vandMal = s.vandNu = k.symmetrisk || dx >= 0 ? 1 : -1
    if (!inne) {
      s.fvx = (dx / d) * fart
      s.fvy = (dy / d) * fart
      if (k.pil) this._pilMal(ins)
      else this._nyttMal(ins)
      s.mal = this._klamMal(h.x + slump(-0.4, 0.4) * h.r, h.y + slump(-0.4, 0.4) * h.r)
    } else if (!k.pil) this._nyttMal(ins)

    m.rot.position.set(x, y)
    m.rot.scale.set(s.inT < 1 ? 0.15 : 1)
    m.vand.scale.set(s.vandNu * k.skala, k.skala)
    this._alla.push(ins)
    return ins
  }

  /** Per bildruta. `t` läses inte — varje insekt har egen klocka (se val ⓶ överst). */
  uppdatera(dtS, t) { // eslint-disable-line no-unused-vars
    if (!this._alive) return
    const dt = klam(Number(dtS) || 0, 0, DT_MAX)
    for (let i = this._alla.length - 1; i >= 0; i--) {
      const ins = this._alla[i]
      if (ins.view.destroyed) {
        // Spelet rev lagret utan att fråga oss — släpp insekten tyst.
        ins.dod = true
        this._alla.splice(i, 1)
        continue
      }
      ins._s.t += dt
      if (!ins.dod && !ins.fangad) this._flyg(ins, dt)
      this._animera(ins, dt)
    }
    this._gnistSteg(dt)
  }

  // --- flygbeteendet --------------------------------------------------------------------
  _flyg(ins, dt) {
    const s = ins._s
    const k = s.k
    const b = this._granser()
    // Innanför gränserna först när den faktiskt kommit in — en insekt som flyger in utifrån
    // ska inte känna kantstyrningen (den vore då djup och slungade in den).
    if (!s.inne && ins.x >= b.x0 && ins.x <= b.x1 && ins.y >= b.y0 && ins.y <= b.y1) s.inne = true

    // Tillstånd.
    if (s.lage === 'flykt') {
      s.lageT -= dt
      if (s.lageT <= 0) this._tillbaka(ins)
    } else if (k.pil) {
      s.lageT -= dt
      if (s.lage === 'svav') {
        if (s.lageT <= 0) this._pilMal(ins)
      } else {
        const d = Math.hypot(s.mal.x - ins.x, s.mal.y - ins.y)
        if ((d < 14 && Math.hypot(s.fvx, s.fvy) < 110) || s.lageT <= 0) {
          s.lage = 'svav'
          s.lageT = slumpI(k.svav)
        }
      }
    } else if (s.lage === 'svav') {
      s.lageT -= dt
      if (s.lageT <= 0) {
        s.lage = 'flyg'
        this._nyttMal(ins)
      }
    } else {
      s.malT -= dt
      if (s.malT <= 0) {
        const h = ins.hem
        const hemma = Math.hypot(ins.x - h.x, ins.y - h.y) < h.r
        if (k.svavP && hemma && s.inne && Math.random() < k.svavP) {
          s.lage = 'svav'
          s.lageT = slumpI(k.svav)
        } else this._nyttMal(ins)
      }
    }

    // Önskad flygfart ("arrive": saktar in när målet är nära).
    let dvx = 0
    let dvy = 0
    let gain = k.gain
    if (s.lage !== 'svav') {
      const dx = s.mal.x - ins.x
      const dy = s.mal.y - ins.y
      const d = Math.hypot(dx, dy)
      if (d > 0.5) {
        let v
        if (s.lage === 'pil') v = Math.min(s.pilFart, Math.sqrt(2 * PIL_BROMS * d))
        else if (s.lage === 'flykt') {
          v = Math.max(150, s.fart * 2) * Math.min(1, d / 30)
          gain = Math.max(4, k.gain * 2)
        } else {
          // Hemlängtan: långt från hemmet flyger även en långsam insekt fortare hem (efter en
          // vindpust, eller när setHem flyttat hemmet) — uppmätt: utan den låg fjärilen och
          // eldflugan kvar 600+ px bort sex sekunder efter att vinden mojnat.
          const h = ins.hem
          const langtan = 1 + klam((Math.hypot(ins.x - h.x, ins.y - h.y) - h.r) / 250, 0, 1.2)
          v = (s.inne ? s.fart * langtan : Math.max(s.fart * 1.35, 90)) * Math.min(1, d / 45)
        }
        dvx = (dx / d) * v
        dvy = (dy / d) * v
      }
    } else if (k.svavGain) gain = k.svavGain
    const kk = 1 - Math.exp(-gain * dt)
    s.fvx += (dvx - s.fvx) * kk
    s.fvy += (dvy - s.fvy) * kk

    // Mjuka gränser — en styrning som växer med djupet i kantzonen, aldrig en studs.
    let ax = 0
    let ay = 0
    if (s.inne) {
      if (ins.x < b.x0 + ZON) ax += Math.min(KANT_MAX, (KANT_K * (b.x0 + ZON - ins.x)) / ZON)
      else if (ins.x > b.x1 - ZON) ax -= Math.min(KANT_MAX, (KANT_K * (ins.x - (b.x1 - ZON))) / ZON)
      const y0 = taketVid(ins.x, b.y0)
      if (ins.y < y0 + ZON) ay += Math.min(KANT_MAX, (KANT_K * (y0 + ZON - ins.y)) / ZON)
    }
    // Vattnet gäller alltid — även för en insekt som fortfarande flyger in.
    if (ins.y > b.y1 - ZON) ay -= Math.min(VATTEN_MAX, (VATTEN_K * (ins.y - (b.y1 - ZON))) / ZON)
    s.fvx += ax * dt
    s.fvy += ay * dt

    // Yttre fart: vind + skräm, UTANFÖR fartspärren, klingar av av sig själv.
    s.uvx += this._vind * k.vind * dt
    const avt = Math.exp(-dt / YTTRE_TAU)
    s.uvx *= avt
    s.uvy *= avt
    if (s.inne) {
      if ((ins.x < b.x0 + ZON && s.uvx < 0) || (ins.x > b.x1 - ZON && s.uvx > 0)) s.uvx *= Math.exp(-9 * dt)
      if (ins.y < taketVid(ins.x, b.y0) + ZON && s.uvy < 0) s.uvy *= Math.exp(-9 * dt)
    }
    if (ins.y > b.y1 - ZON && s.uvy > 0) s.uvy *= Math.exp(-12 * dt)
    const um = Math.hypot(s.uvx, s.uvy)
    if (um > YTTRE_MAX) {
      s.uvx *= YTTRE_MAX / um
      s.uvy *= YTTRE_MAX / um
    }

    // Egna svängningar, lagda som FART (läget svänger exakt med amplituden, driver aldrig).
    let ox = 0
    let oy = 0
    if (k.zig && s.lage !== 'flykt') {
      const w = TAU * s.zigF
      const z = k.zig[0] * (s.lage === 'svav' ? 0.5 : 1) * w * Math.cos(w * s.t + s.zigFas)
      const fm = Math.hypot(s.fvx, s.fvy)
      if (fm > 8) {
        ox += (-s.fvy / fm) * z
        oy += (s.fvx / fm) * z
      } else oy += z
    }
    if (k.bob) {
      const w = TAU * s.bobF
      oy += k.bob[0] * w * Math.cos(w * s.t + s.bobFas)
    }
    if (k.fladder) {
      // Fjärilens kraftiga lodräta fladder: en grundton + en oregelbunden överton.
      const w = TAU * s.flF
      oy += s.flA * w * Math.cos(w * s.t + s.flFas)
      oy += 0.3 * s.flA * 2.3 * w * Math.cos(2.3 * w * s.t + s.flFas2)
      ox += 6 * TAU * 0.4 * Math.cos(TAU * 0.4 * s.t + s.fas)
    }

    ins.vx = s.fvx + s.uvx + ox
    ins.vy = s.fvy + s.uvy + oy
    ins.x += ins.vx * dt
    ins.y += ins.vy * dt

    // Nödstopp — bara farten MOT kanten nollas, ingen studs.
    const yNod = this._ytY - NOD_YTA
    if (ins.y > yNod) {
      ins.y = yNod
      if (s.fvy > 0) s.fvy = 0
      if (s.uvy > 0) s.uvy = 0
    }
    if (s.inne) {
      if (ins.x < b.x0 - NOD_SIDA) {
        ins.x = b.x0 - NOD_SIDA
        s.fvx = Math.max(0, s.fvx)
        s.uvx = Math.max(0, s.uvx)
      } else if (ins.x > b.x1 + NOD_SIDA) {
        ins.x = b.x1 + NOD_SIDA
        s.fvx = Math.min(0, s.fvx)
        s.uvx = Math.min(0, s.uvx)
      }
      if (ins.y < taketVid(ins.x, b.y0) - NOD_SIDA) {
        ins.y = taketVid(ins.x, b.y0) - NOD_SIDA
        s.fvy = Math.max(0, s.fvy)
        s.uvy = Math.max(0, s.uvy)
      }
    } else {
      const v = this._vy()
      ins.x = klam(ins.x, v.left - 200, v.right + 200)
      ins.y = Math.max(ins.y, v.top - 200)
    }

    // Vänd åt den egna flygriktningen (inte vindens), med hysteres så den inte fladdrar.
    const trosk = k.vandTrosk || 14
    if (s.fvx > trosk) s.vandMal = 1
    else if (s.fvx < -trosk) s.vandMal = -1
  }

  _klamMal(x, y) {
    const b = this._granser()
    const kx = klam(x, b.x0 + MAL_KANT, b.x1 - MAL_KANT)
    return { x: kx, y: klam(y, taketVid(kx, b.y0) + MAL_KANT, b.y1 - ZON - 4) }
  }

  _hemPunkt(ins, hog = false) {
    const h = ins.hem
    const v = Math.random() * TAU
    const rr = h.r * Math.sqrt(Math.random())
    const y = hog ? h.y - Math.abs(Math.sin(v)) * rr : h.y + Math.sin(v) * rr
    return this._klamMal(h.x + Math.cos(v) * rr, y)
  }

  _nyttMal(ins) {
    const s = ins._s
    const k = s.k
    if (k.ryck) {
      // Myggan: korta ryck från där den är, men dras tillbaka om den hamnat utanför hemmet.
      const h = ins.hem
      const v = Math.random() * TAU
      const L = slump(40, 95)
      let x = ins.x + Math.cos(v) * L
      let y = ins.y + Math.sin(v) * L
      const dx = x - h.x
      const dy = y - h.y
      const d = Math.hypot(dx, dy)
      if (d > h.r) {
        x = h.x + (dx / d) * h.r * 0.85
        y = h.y + (dy / d) * h.r * 0.85
      }
      s.mal = this._klamMal(x, y)
    } else s.mal = this._hemPunkt(ins, !!k.hog)
    s.malT = slumpI(k.byte || [1, 2])
  }

  // Trollsländan: välj en punkt i hemmet minst 110 px bort (annars den längsta av åtta).
  _pilMal(ins) {
    const s = ins._s
    let bast = null
    let bastD = -1
    for (let i = 0; i < 8; i++) {
      const p = this._hemPunkt(ins)
      const d = Math.hypot(p.x - ins.x, p.y - ins.y)
      if (d >= 110) {
        bast = p
        break
      }
      if (d > bastD) {
        bast = p
        bastD = d
      }
    }
    s.mal = bast
    s.lage = 'pil'
    s.lageT = 2.4
    s.pilFart = slumpI(s.k.fart)
  }

  _tillbaka(ins) {
    const s = ins._s
    if (s.k.pil) {
      s.lage = 'svav'
      s.lageT = slump(0.4, 0.9)
    } else {
      s.lage = 'flyg'
      this._nyttMal(ins)
    }
  }

  // --- liv per bildruta ----------------------------------------------------------------
  _animera(ins, dt) {
    const s = ins._s
    const k = s.k
    const m = s.m
    const view = ins.view
    view.position.set(ins.x, ins.y)
    if (!ins.dod && s.inT < 1) {
      s.inT = Math.min(1, s.inT + dt / 0.26)
      view.scale.set(0.15 + 0.85 * utBack(s.inT))
    }
    const sprattel = ins.fangad || ins.dod

    // En fångad insekt vänds åt det håll spelet drar den; farten sparas till slapp().
    if (sprattel && dt > 0) {
      s.dragVx = (ins.x - s.px) / dt
      s.dragVy = (ins.y - s.py) / dt
      if (s.dragVx > 60) s.vandMal = 1
      else if (s.dragVx < -60) s.vandMal = -1
    }
    s.px = ins.x
    s.py = ins.y
    if (!k.symmetrisk) {
      s.vandNu += (s.vandMal - s.vandNu) * (1 - Math.exp(-(k.vandFart || 13) * dt))
      m.vand.scale.x = s.vandNu * k.skala
    }

    // Vingarna. Fångad = hektiskt: snabbare och större slag.
    const hekt = sprattel ? (ins.massa ? 2.1 : 1.7) : 1
    const fmod = k.symmetrisk ? 1 + 0.35 * Math.sin(s.t * 2.7 + s.fas) : 1
    s.vingFas = (s.vingFas + TAU * k.flax * s.flaxMul * hekt * fmod * dt) % (TAU * 1000)
    if (m.fjaril) {
      for (const w of m.fjaril) w.n.scale.x = 0.16 + 0.84 * (0.5 + 0.5 * Math.cos(s.vingFas + w.off))
    } else {
      const ampMul = sprattel ? 1.3 : 1
      for (const w of m.vingar) w.n.rotation = w.bas + w.amp * ampMul * Math.sin(s.vingFas + w.off)
    }
    const suddA = sprattel ? (ins.massa ? 1 : 0.9) : s.lage === 'svav' ? 0.5 : 0.6
    for (const g of m.sudd) g.alpha = suddA

    // Benen: dinglar lugnt i luften, sprattlar i motfas när den är fångad.
    const [benB, benA] = m.ben
    if (sprattel) {
      s.benFas += TAU * 8.5 * dt
      if (benA) benA.rotation = 0.34 * Math.sin(s.benFas)
      if (benB) benB.rotation = -0.3 * Math.sin(s.benFas + 0.8)
    } else {
      const w = TAU * 0.8 * s.t + s.fas
      if (benA) benA.rotation = 0.06 * Math.sin(w)
      if (benB) benB.rotation = 0.05 * Math.sin(w + 1.3)
    }

    // Tippning åt rörelsen, eller ett ivrigt sprattel.
    if (sprattel) {
      const a = ins.massa ? 0.22 : 0.17
      m.luta.rotation = a * Math.sin(TAU * 6.3 * s.t + s.fas) + 0.07 * Math.sin(TAU * 12.7 * s.t + 1.1)
    } else {
      let mal
      if (k.symmetrisk) mal = klam(ins.vx / 170, -0.4, 0.4)
      else if (s.lage === 'pil') mal = klam(ins.vy / 900, -0.2, 0.2)
      else mal = klam(ins.vy / 260, -0.38, 0.38)
      m.luta.rotation += (mal - m.luta.rotation) * (1 - Math.exp(-9 * dt))
    }

    // Sortens eget liv.
    if (m.lykta) {
      // Eldflugan: en mjuk puls med egen takt — fångad blinkar den ivrigt.
      s.glodFas += (TAU * dt) / (sprattel ? s.glodPer / 3 : s.glodPer)
      const p = Math.pow(0.5 - 0.5 * Math.cos(s.glodFas), 1.8)
      m.lykta.tint = lerpColor(0xb8c476, 0xffffff, p)
      if (m.halo) {
        m.halo.alpha = 0.35 + 0.6 * p
        m.halo.scale.set(m.haloBas * (0.8 + 0.4 * p))
      }
      if (m.karna) m.karna.alpha = 0.45 + 0.5 * p
    }
    if (m.blank) {
      m.blank.rotation += dt * 1.2
      const p = Math.pow(0.5 + 0.5 * Math.sin(s.t * 3.1 + s.fas), 3)
      m.blank.alpha = 0.3 + 0.6 * p
      m.blank.scale.set(m.blankBas * (0.7 + 0.5 * p))
    }
    if (k.sallsynt && !ins.dod) {
      s.gnistT -= dt
      if (s.gnistT <= 0) {
        s.gnistT = slump(0.07, 0.14)
        this._gnista(ins.x + slump(-9, 9), ins.y + slump(-3, 9))
      }
    }
    if (m.glitter) {
      m.glitter.forEach((g, i) => {
        g.alpha = Math.pow(Math.max(0, Math.sin(s.vingFas * 0.5 + i * 1.7 + s.fas)), 6)
      })
    }
  }

  // --- guldflugans gnistor: en pool, aldrig fler än GNIST_MAX -----------------------------
  _gnista(x, y) {
    let sp = this._gnistor.find((g) => !g.aktiv)
    if (!sp) {
      if (this._gnistor.length >= GNIST_MAX) return
      const c = nod(this._gnistLager)
      const gl = glod({ namn: 'stjarna', color: 0xffe79a, size: 20, alpha: 0.9 })
      if (gl) c.addChild(gl)
      // En ritad kärna också, så gnistan syns även mot en ljus himmel där additivt bleknar.
      ritning(c).poly([0, -3.6, 0.9, -0.9, 3.6, 0, 0.9, 0.9, 0, 3.6, -0.9, 0.9, -3.6, 0, -0.9, -0.9]).fill(0xffd23f)
      sp = { c, aktiv: false, liv: 0, max: 1, vx: 0, vy: 0, vr: 0, s0: 1 }
      this._gnistor.push(sp)
    }
    if (sp.c.destroyed) return
    sp.aktiv = true
    sp.max = sp.liv = slump(0.6, 1.0)
    sp.vx = slump(-18, 18)
    sp.vy = slump(10, 40)
    sp.vr = slump(-3, 3)
    sp.s0 = slump(0.7, 1.15)
    sp.c.position.set(x, y)
    sp.c.visible = true
    sp.c.alpha = 1
    sp.c.scale.set(sp.s0)
  }

  _gnistSteg(dt) {
    for (const sp of this._gnistor) {
      if (!sp.aktiv || sp.c.destroyed) continue
      sp.liv -= dt
      if (sp.liv <= 0) {
        sp.aktiv = false
        sp.c.visible = false
        continue
      }
      sp.vy += 60 * dt
      sp.c.x += sp.vx * dt
      sp.c.y += sp.vy * dt
      sp.c.rotation += sp.vr * dt
      const k = sp.liv / sp.max
      sp.c.alpha = Math.min(1, k * 1.6)
      sp.c.scale.set(sp.s0 * (0.4 + 0.6 * k))
    }
  }

  // --- frågor ----------------------------------------------------------------------------
  /**
   * Den första (närmast a längs segmentet) levande, ej fångade insekt vars mittpunkt ligger
   * inom (r + extra) från segmentet a→b, annars null. "Först" = där segmentet GÅR IN i
   * insektens fångstcirkel, så en stor insekt lite längre bort som nås tidigare vinner.
   */
  traffSegment(ax, ay, bx, by, extra = 0) {
    if (!this._alive) return null
    const dx = bx - ax
    const dy = by - ay
    const L = Math.hypot(dx, dy)
    let bast = null
    let bastS = Infinity
    for (const ins of this._alla) {
      if (!levande(ins)) continue
      const R = ins.r + (Number(extra) || 0)
      let t = 0
      if (L > 1e-6) t = klam(((ins.x - ax) * dx + (ins.y - ay) * dy) / (L * L), 0, 1)
      const px = ax + dx * t
      const py = ay + dy * t
      const d = Math.hypot(ins.x - px, ins.y - py)
      if (d > R) continue
      const inTraff = Math.max(0, t * L - Math.sqrt(Math.max(0, R * R - d * d)))
      if (inTraff < bastS) {
        bastS = inTraff
        bast = ins
      }
    }
    return bast
  }

  /** Närmaste levande, ej fångade insekt inom maxAvst, annars null. */
  narmast(x, y, maxAvst = Infinity) {
    if (!this._alive) return null
    let bast = null
    let bastD = Number.isFinite(maxAvst) ? maxAvst : Infinity
    for (const ins of this._alla) {
      if (!levande(ins)) continue
      const d = Math.hypot(ins.x - x, ins.y - y)
      if (d <= bastD) {
        bastD = d
        bast = ins
      }
    }
    return bast
  }

  // --- händelser från spelet -------------------------------------------------------------
  /** Fångad: slutar flyga själv och sprattlar. Spelet skriver x/y från och med nu. */
  fanga(ins) {
    if (!this._alive || !ins?._s || ins.dod || ins.fangad) return
    const s = ins._s
    ins.fangad = true
    ins.vx = 0
    ins.vy = 0
    s.fvx = s.fvy = s.uvx = s.uvy = 0
    s.dragVx = s.dragVy = 0
    s.px = ins.x
    s.py = ins.y
    s.benFas = 0
  }

  /** Släpp en fångad (humlan som slet sig): flyger undan uppåt en stund, sedan hem igen. */
  slapp(ins) {
    if (!this._alive || !ins?._s || ins.dod || !ins.fangad) return
    const s = ins._s
    ins.fangad = false
    s.inne = true
    s.lage = 'flykt'
    s.lageT = slump(0.7, 1.0)
    s.mal = this._klamMal(ins.x + slump(-90, 90), ins.y - slump(70, 130))
    // Farten spelet drog den med följer med (klämd), plus en ryck uppåt.
    s.fvx = klam(s.dragVx, -300, 300)
    s.fvy = klam(s.dragVy, -300, 300) - 140
    s.uvx = s.uvy = 0
  }

  /** Ät: en snabb krymp in i munnen (0,12 s), sedan rivs vyn. Exit-säker. */
  ata(ins) {
    if (!this._alive || !ins?._s || ins.dod) return
    ins.dod = true
    const view = ins.view
    if (view.destroyed) {
      this._fjarna(ins)
      return
    }
    const start = view.scale.x || 1
    const p = { k: 1 }
    this._proxy.add(p)
    gsap.to(p, {
      k: 0,
      duration: 0.12,
      ease: 'power2.in',
      onUpdate: () => {
        if (view.destroyed) return
        view.scale.set(Math.max(0.01, start * (0.12 + 0.88 * p.k)))
        view.alpha = 0.25 + 0.75 * p.k
      },
      onComplete: () => {
        this._proxy.delete(p)
        if (!this._alive) return
        this._fjarna(ins)
      },
    })
  }

  _fjarna(ins) {
    const i = this._alla.indexOf(ins)
    if (i >= 0) this._alla.splice(i, 1)
    if (!ins.view.destroyed) ins.view.destroy({ children: true })
  }

  /** Efter en bom: insekter inom r flyger undan en bit, och sedan tillbaka mot hemmet. */
  skramma(x, y, r) {
    if (!this._alive || !(r > 0)) return
    for (const ins of this._alla) {
      if (!levande(ins)) continue
      const s = ins._s
      const dx = ins.x - x
      const dy = ins.y - y
      const d = Math.hypot(dx, dy)
      if (d >= r) continue
      let nx
      let ny
      if (d > 0.001) {
        nx = dx / d
        ny = dy / d
      } else {
        nx = Math.random() < 0.5 ? -0.6 : 0.6
        ny = -0.8
      }
      // Aldrig ner mot vattnet i första hand — neråt blir mest åt sidan.
      if (ny > 0) {
        ny *= 0.35
        const n = Math.hypot(nx, ny) || 1
        nx /= n
        ny /= n
      }
      const st = 1 - d / r
      // Mätt: 220+260·st gav ~200 px på en halv sekund — för långt för en treåring som just
      // bommade. Nu ~100–130 px: tydligt "de blev rädda", men kvar inom räckhåll.
      const knuff = (150 + 170 * st) / (1 + ins.massa * 0.6)
      s.uvx += nx * knuff
      s.uvy += ny * knuff
      s.lage = 'flykt'
      s.lageT = 0.45 + 0.3 * st + slump(0, 0.15)
      s.mal = this._klamMal(ins.x + nx * (60 + 80 * st), ins.y + ny * (60 + 80 * st))
      s.malT = s.lageT
      if (Math.abs(nx) > 0.2) s.vandMal = nx > 0 ? 1 : -1
    }
  }

  /** Sidovind i px/s² (vindpusten). 0 = av. */
  setVind(ax) {
    this._vind = Number(ax) || 0
  }

  /** Flytta en insekts hemområde (autohjälpen: tjockflugan sjunker ner mot grodan). */
  setHem(ins, hem) {
    if (!this._alive || !ins?._s || ins.dod || !hem) return
    ins.hem = this._normHem(hem, ins.hem)
    const s = ins._s
    if (ins.fangad || s.lage === 'flykt') return
    if (s.k.pil) {
      if (s.lage === 'svav') s.lageT = Math.min(s.lageT, 0.25)
    } else {
      s.lage = 'flyg'
      this._nyttMal(ins)
    }
  }

  destroy() {
    if (!this._alive) return
    this._alive = false
    for (const p of this._proxy) gsap.killTweensOf(p)
    this._proxy.clear()
    for (const ins of this._alla) {
      ins.dod = true
      if (!ins.view.destroyed) ins.view.destroy({ children: true })
    }
    this._alla.length = 0
    // Glödtexturen är delad (lib/glod.js) — riv noderna, aldrig texturen.
    for (const sp of this._gnistor) if (!sp.c.destroyed) sp.c.destroy({ children: true })
    this._gnistor.length = 0
    if (!this._gnistLager.destroyed) this._gnistLager.destroy({ children: true })
    if (!this._kryp.destroyed) this._kryp.destroy({ children: true })
  }
}
