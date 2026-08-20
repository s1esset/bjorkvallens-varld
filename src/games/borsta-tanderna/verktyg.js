// FÖREMÅLEN i `borsta-tanderna` — allt barnet ser och rör i badrummet utom pappas ansikte.
//
// Filen är delad i två halvor som inte känner till varandra:
//   ⓵ TABELLERNA (`TUBER`, `SMUTS`) — vad en tandkräm respektive en smuts ÄR i tal.
//      `index.js` läser dem, väljer min/ljud/replik ur dem och skickar tillbaka färgerna
//      hit när något ska RITAS. Ingen färg står alltså på två ställen.
//   ⓶ BYGGARNA (`makeTub`, `makeBorste`, `makeMugg`, `makeGlas`, `makeSmutsflack`,
//      `makeSkumklick`, `makeTandglans`) — hur sakerna ser ut. Var sak är ett FRISTÅENDE
//      föremål med egen silhuett (P0 ASSETS): en tub har krymplåda-veck, hals och
//      skruvkork; en tandborste har grepp-räfflor och enskilda borststrån. Ingen emoji,
//      ingen bricka, ingen `Text`.
//
// ⚠️ TVÅ SKALOR I SAMMA FIL. Tuberna, borsten, muggen och glaset ritas i DESIGN-koordinater
//    (1280×720) och är 90–210 px stora. Smutsen och skummet ritas i FOTORUTANS koordinater
//    (se `layout.js`: allt under mun-lagret skalas ned till ~11–15 px på skärmen). Därför
//    är de två sista medvetet grovhuggna: enkel kontur, hård kontrast, tjock kantlinje.
//    En finritad fläck med mjuka toningar försvinner helt i den storleken.
//
// ⚠️ INGA TEXTURBAKNINGAR. `renderer.generateTexture()` och `new FillGradient` är förbjudna
//    här — en gradient som bakas per montering destabiliserar hela testsviten (CLAUDE.md).
//    Volymen kommer uteslutande från de CACHADE hjälparna i `lib/form.js`.
//
// ⚠️ EXIT-SÄKERT. Bara `makeBorste` och `makeGlas` animerar något själva, och båda har en
//    `destroy()` som går igenom HELA nodträdet — `killTweensOf(roten)` når bara roten, och
//    tandkrämsklicken respektive vattenytan ligger en nivå in. Ingen byggare startar en
//    evig tween; vilorörelsen är `index.js` sak (`feedback.liv`).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, PLAYFUL, shade, tint } from '../../lib/theme.js'
import {
  cylinderFill,
  rimLight,
  sphereFill,
  topLightFill,
  verticalFill,
  verticalFillAlpha,
} from '../../lib/form.js'

// ---------------------------------------------------------------------------
// ⓵ TABELLERNA
// ---------------------------------------------------------------------------

/**
 * De sex tandkrämerna.
 *
 * `tub`    tubens (etikettens) färg — den färg barnet KÄNNER IGEN på hyllan
 * `skum`   skummets färg i munnen — samma smak ska ge samma färg lödder
 * `min`    pappas min ur fotoriggen när smaken slår till
 * `ljud`   sample-nyckel för pappas egen reaktion (`audio.sample`)
 * `replik` narratorns rad när smaken väljs (byggs ur tabellen — måste därför in i
 *          `voice-phrases.json` för hand, `check.mjs` ser inga tabelluppslag)
 * `frost`  smaken är ISKALL — mint är den enda
 * `wow`    sällsynt vinstval; `index.js` avgör NÄR den dyker upp, filen här levererar
 *          bara posten och den regnbågsskimrande tuben
 */
export const TUBER = [
  {
    key: 'mint',
    namn: 'mint',
    tub: 0x37c2b0,
    skum: 0x9ff0e4,
    min: 'chock',
    ljud: 'pappa_chock',
    frost: true,
    replik: 'Mintkräm! Nu blir det iskallt i pappas mun!',
  },
  {
    key: 'jordgubb',
    namn: 'jordgubb',
    tub: 0xe8557f,
    skum: 0xffc3d8,
    min: 'lycksalig',
    ljud: 'pappa_mmm',
    replik: 'Jordgubbskräm! Den där älskar pappa.',
  },
  {
    key: 'banan',
    namn: 'banan',
    tub: 0xf2c327,
    skum: 0xfff0a8,
    min: 'skratt',
    ljud: 'pappa_fniss',
    replik: 'Banankräm! Pappa kan inte sluta skratta.',
  },
  {
    key: 'blabar',
    namn: 'blåbär',
    tub: 0x6a63c9,
    skum: 0xc9c4f0,
    min: 'forvanad',
    ljud: 'pappa_oj',
    replik: 'Blåbärskräm! Pappa blir alldeles blå i munnen.',
  },
  {
    key: 'lakrits',
    namn: 'lakrits',
    tub: 0x3b3b46,
    skum: 0xb9b9c6,
    min: 'skeptisk',
    ljud: 'pappa_ehh',
    replik: 'Lakritskräm! Pappa vet inte riktigt vad han tycker.',
  },
  {
    key: 'glitter',
    namn: 'glittrig',
    tub: 0xff8ad8,
    skum: 0xffffff,
    min: 'lycksalig',
    ljud: 'pappa_aaah',
    wow: true,
    replik: 'Glitterkräm! Nu blir pappas tänder alldeles magiska!',
  },
]

export const TUB_KEYS = TUBER.map((t) => t.key)
export const tubSpec = (key) => TUBER.find((t) => t.key === key) || TUBER[0]

/**
 * Vad som sitter på tänderna. `antal` är hur många fläckar smutsen lägger ut på
 * tandraden — det är ocksÅ hela svårighetsspannet: 5 till 7 fläckar, aldrig fler.
 */
export const SMUTS = [
  { key: 'spenat', namn: 'spenat', farg: 0x3f7d3a, antal: 6 },
  { key: 'choklad', namn: 'choklad', farg: 0x5a3620, antal: 5 },
  { key: 'sylt', namn: 'sylt', farg: 0xa32741, antal: 7 },
  { key: 'blabar', namn: 'blåbär', farg: 0x36306b, antal: 6 },
]

export const SMUTS_KEYS = SMUTS.map((s) => s.key)
export const smutsSpec = (key) => SMUTS.find((s) => s.key === key) || SMUTS[0]

// ---------------------------------------------------------------------------
// Små hjälpare
// ---------------------------------------------------------------------------

const P = {
  plastVit: 0xf3f7fa,
  plastMork: 0xbfcbd6,
  keramik: 0xf6f1e6,
  keramikMork: 0xcfc3ad,
  borstBla: 0x4aa3df,
  borstMork: 0x2f7fb8,
  stråVit: 0xfbfdff,
  stråBla: 0xbfe0f5,
  stråGron: 0xa9e0b5,
  gummi: 0x57c8c3,
  vatten: 0x64c6ef,
  vattenDjup: 0x2f8ec4,
  glas: 0xdff0fa,
  mork: 0x2c2117,
}

function nyG() {
  const g = new Graphics()
  g.eventMode = 'none'
  return g
}

// Samlar varje nod i trädet. `gsap.killTweensOf(roten)` når BARA roten — tandkrämsklicken,
// borstraderna och vattenytan ligger en till två nivåer in och överlever annars rivningen
// helt tyst (inget konsolfel, ingen krasch, bara en tween som skriver på en nollad
// transform). Samma fälla som `bygg-en-kompis` gick i.
function samlaNoder(nod, ut = []) {
  if (!nod) return ut
  ut.push(nod)
  const barn = nod.children || []
  for (let i = 0; i < barn.length; i++) samlaNoder(barn[i], ut)
  return ut
}

function rivTrad(rot) {
  if (!rot) return
  for (const n of samlaNoder(rot)) {
    gsap.killTweensOf(n)
    if (n.scale) gsap.killTweensOf(n.scale)
    if (n.position) gsap.killTweensOf(n.position)
  }
  if (!rot.destroyed) rot.destroy({ children: true })
}

// En mjuk kontaktskugga mot hyllan/bänken — djup utan filter.
function skugga(y, rx, ry, alpha = 0.18) {
  const g = nyG()
  g.ellipse(0, y, rx, ry).fill({ color: P.mork, alpha })
  return g
}

// Är färgen mörk? Styr om ett motiv ska ritas i ljust eller mörkt ovanpå etiketten —
// lakritstuben är nästan svart och en svart spiral på den vore osynlig.
function arMork(hex) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return (r * 0.299 + g * 0.587 + b * 0.114) < 140
}

// ---------------------------------------------------------------------------
// ⓶ TANDKRÄMSTUBEN
// ---------------------------------------------------------------------------

// Tubens mått. Talen används både när kroppen ritas och när etiketten placeras — ett
// enda ställe, så att en smalare tub aldrig kan få en etikett som sticker ut.
const TUB = {
  halvB: 43, // kroppens halva bredd → 86 px total
  toppY: -38, // axeln där halsen börjar
  bottenY: 54, // kroppens underkant (krympvecket ligger ovanpå)
  korkTopp: -66,
  veckBotten: 64, // → total höjd 130 px
  etikett: { x: -36, y: -8, b: 72, h: 40 },
}

/** Ett litet ritat motiv i mitten av etiketten. Aldrig en emoji — riktiga former. */
function ritaMotiv(g, key, farg) {
  const cx = 0
  const cy = TUB.etikett.y + TUB.etikett.h / 2 // 12
  const ljus = arMork(farg)
  const kontur = ljus ? 0xfffdf7 : shade(farg, 0.55)

  if (key === 'mint') {
    // Två myntablad med mittnerv, plus två frostgnistor — mint är den enda ISKALLA.
    for (const s of [-1, 1]) {
      g.moveTo(cx, cy + 8)
        .quadraticCurveTo(cx + s * 20, cy + 4, cx + s * 15, cy - 11)
        .quadraticCurveTo(cx + s * 5, cy - 4, cx, cy + 8)
        .closePath()
        .fill(topLightFill(0x6fd6a0, { highlight: 0.4, dark: 0.28 }))
        .stroke({ width: 2, color: 0x2f7a52, alpha: 0.8 })
      g.moveTo(cx, cy + 7).quadraticCurveTo(cx + s * 8, cy - 1, cx + s * 14, cy - 9)
        .stroke({ width: 1.6, color: 0x2f7a52, alpha: 0.7 })
    }
    for (const [fx, fy, fr] of [[-24, -8, 3], [23, 6, 2.4]]) {
      g.moveTo(cx + fx - fr, cy + fy).lineTo(cx + fx + fr, cy + fy)
      g.moveTo(cx + fx, cy + fy - fr).lineTo(cx + fx, cy + fy + fr)
      g.stroke({ width: 1.8, color: 0xffffff, alpha: 0.9, cap: 'round' })
    }
  } else if (key === 'jordgubb') {
    // Jordgubbe: hjärtformad kropp, gröna blad, ljusa kärnor.
    g.moveTo(cx, cy + 14)
      .quadraticCurveTo(cx - 15, cy + 4, cx - 12, cy - 5)
      .quadraticCurveTo(cx - 6, cy - 11, cx, cy - 6)
      .quadraticCurveTo(cx + 6, cy - 11, cx + 12, cy - 5)
      .quadraticCurveTo(cx + 15, cy + 4, cx, cy + 14)
      .closePath()
      .fill(sphereFill(0xe23c58, { lightY: 0.28, dark: 0.34 }))
      .stroke({ width: 2, color: 0x8f1c30 })
    for (const [sx, sy] of [[-5, 0], [4, 1], [-1, 6], [7, -3], [-8, 5]]) {
      g.circle(cx + sx, cy + sy, 1.4).fill({ color: 0xfff2b0, alpha: 0.95 })
    }
    for (const s of [-1, 0, 1]) {
      g.moveTo(cx, cy - 7)
        .quadraticCurveTo(cx + s * 9, cy - 13, cx + s * 12 - 1, cy - 6)
        .quadraticCurveTo(cx + s * 5, cy - 6, cx, cy - 7)
        .closePath()
        .fill(0x4e9c47)
    }
  } else if (key === 'banan') {
    // Banan: en halvmåne med mörka ändar och en ljus insida.
    g.moveTo(cx - 18, cy - 8)
      .quadraticCurveTo(cx - 4, cy + 16, cx + 18, cy + 7)
      .quadraticCurveTo(cx + 6, cy + 8, cx - 12, cy - 9)
      .closePath()
      .fill(cylinderFill(0xffd94f, { axis: 'x', dark: 0.3, highlight: 0.32 }))
      .stroke({ width: 2, color: 0xa8791a })
    g.circle(cx - 17, cy - 8, 3).fill(0x6f4f16)
    g.circle(cx + 18, cy + 7, 3).fill(0x6f4f16)
    g.moveTo(cx - 12, cy - 4).quadraticCurveTo(cx - 2, cy + 8, cx + 12, cy + 5)
      .stroke({ width: 2, color: 0xfff3bc, alpha: 0.75, cap: 'round' })
  } else if (key === 'blabar') {
    // Tre blåbär med den lilla kronan överst — det är kronan som gör att det läser blåbär.
    for (const [bx, by, br] of [[-10, 4, 8], [9, 5, 7], [0, -5, 8.5]]) {
      g.circle(cx + bx, cy + by, br)
        .fill(sphereFill(0x4a5bb0, { lightY: 0.26, dark: 0.4 }))
        .stroke({ width: 1.8, color: 0x232a5c })
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2
        g.moveTo(cx + bx, cy + by - br * 0.35)
          .lineTo(cx + bx + Math.cos(a) * br * 0.42, cy + by - br * 0.35 + Math.sin(a) * br * 0.42)
      }
      g.stroke({ width: 1.4, color: 0x171b40, alpha: 0.65, cap: 'round' })
      g.circle(cx + bx - br * 0.32, cy + by - br * 0.42, br * 0.22).fill({ color: 0xffffff, alpha: 0.4 })
    }
  } else if (key === 'lakrits') {
    // Lakritsspiral: en riktig spiral, ritad ljus eftersom etiketten är nästan svart.
    let a = 0
    let r = 2.5
    g.moveTo(cx + r, cy)
    for (let i = 1; i <= 64; i++) {
      a = (i / 64) * Math.PI * 2 * 2.6
      r = 2.5 + (i / 64) * 12
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92)
    }
    g.stroke({ width: 4.2, color: kontur, cap: 'round', join: 'round' })
    let a2 = 0
    let r2 = 2.5
    g.moveTo(cx + r2, cy - 1)
    for (let i = 1; i <= 64; i++) {
      a2 = (i / 64) * Math.PI * 2 * 2.6
      r2 = 2.5 + (i / 64) * 12
      g.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2 * 0.92 - 1)
    }
    g.stroke({ width: 1.6, color: 0xffffff, alpha: 0.35, cap: 'round', join: 'round' })
  } else {
    // Glitter: tre fyruddiga stjärnor i olika storlek.
    for (const [sx, sy, ss] of [[-13, 3, 1], [4, -6, 1.5], [13, 8, 0.8]]) {
      ritaStjarna(g, cx + sx, cy + sy, 11 * ss, 0xffffff, 0.95)
    }
  }
}

/** En fyruddig glansstjärna med konkava sidor — delas av etiketten och `makeTandglans`. */
function ritaStjarna(g, cx, cy, r, farg, alpha = 1) {
  const t = r * 0.24
  g.moveTo(cx, cy - r)
    .quadraticCurveTo(cx + t * 0.5, cy - t, cx + r, cy)
    .quadraticCurveTo(cx + t * 0.5, cy + t, cx, cy + r)
    .quadraticCurveTo(cx - t * 0.5, cy + t, cx - r, cy)
    .quadraticCurveTo(cx - t * 0.5, cy - t, cx, cy - r)
    .closePath()
    .fill({ color: farg, alpha })
}

/**
 * En tandkrämstub som STÅR på hyllan: krymplåda-veck i botten, avsmalnande hals,
 * räfflad skruvkork och en etikett i smakens färg med ett litet ritat motiv.
 *
 * Mått ~86 × 130 px, origo i mitten. Tubplatserna i `layout.js` står 140 px isär, så
 * konsten håller sig innanför ±43 px medan grannens träffyta börjar 70 px bort — konsten
 * och träffytan är TVÅ budgetar (CLAUDE.md), och den här ligger med 27 px marginal.
 *
 * @param {{key:string,tub:number,wow?:boolean,frost?:boolean}} spec post ur `TUBER`
 */
export function makeTub(spec) {
  const s = spec && spec.tub != null ? spec : TUBER[0]
  const c = new Container()
  c.eventMode = 'none'
  // Nyckeln bor i ETT EGET FÄLT, aldrig i en nod-egenskap: `switch (nod.text)` dör tyst
  // när noden byter typ (CLAUDE.md / check.mjs-tripwiren).
  c.__key = s.key

  c.addChild(skugga(TUB.veckBotten - 2, 38, 6))

  const g = nyG()
  c.addChild(g)

  const korkFarg = shade(s.tub, 0.18)

  // --- kork + hals ---------------------------------------------------------
  g.roundRect(-13, -46, 26, 16, 4).fill(cylinderFill(P.plastVit, { axis: 'x', dark: 0.24 }))
    .stroke({ width: 2.4, color: P.plastMork })
  g.roundRect(-18, TUB.korkTopp, 36, 26, 7).fill(cylinderFill(korkFarg, { axis: 'x', dark: 0.3, highlight: 0.34 }))
    .stroke({ width: 3, color: shade(s.tub, 0.5) })
  for (let i = 0; i < 5; i++) {
    const rx = -13 + i * 6.5
    g.moveTo(rx, TUB.korkTopp + 4).lineTo(rx, TUB.korkTopp + 22)
      .stroke({ width: 1.8, color: shade(s.tub, 0.45), alpha: 0.55, cap: 'round' })
  }
  g.roundRect(-15, TUB.korkTopp + 2, 6, 20, 3).fill({ color: 0xffffff, alpha: 0.3 })

  // --- kroppen -------------------------------------------------------------
  // Silhuetten: smala axlar upp mot halsen, bredast på mitten, rak ner mot vecket.
  g.moveTo(-24, TUB.toppY)
    .quadraticCurveTo(-40, TUB.toppY + 8, -TUB.halvB, -4)
    .lineTo(-40, TUB.bottenY - 8)
    .quadraticCurveTo(-40, TUB.bottenY, -32, TUB.bottenY)
    .lineTo(32, TUB.bottenY)
    .quadraticCurveTo(40, TUB.bottenY, 40, TUB.bottenY - 8)
    .lineTo(TUB.halvB, -4)
    .quadraticCurveTo(40, TUB.toppY + 8, 24, TUB.toppY)
    .closePath()
    .fill(cylinderFill(P.plastVit, { axis: 'x', dark: 0.22, highlight: 0.3 }))
    .stroke({ width: 3, color: P.plastMork })
  // Blänket längs vänsterkanten säger att plasten är blank, inte papper.
  g.roundRect(-33, -24, 9, 62, 4).fill({ color: 0xffffff, alpha: 0.5 })

  // --- etiketten -----------------------------------------------------------
  const E = TUB.etikett
  if (s.wow) {
    // Wow-tuben skimrar i regnbåge: sex vågräta band ur PLAYFUL. Banden är egna rektanglar
    // (rundade i topp och botten) — ingen mask, ingen ny gradient, ingen texturbakning.
    const n = 6
    const bh = E.h / n
    for (let i = 0; i < n; i++) {
      const by = E.y + i * bh
      const f = PLAYFUL[i % PLAYFUL.length]
      if (i === 0) g.roundRect(E.x, by, E.b, bh + 6, 9)
      else if (i === n - 1) g.roundRect(E.x, by - 6, E.b, bh + 6, 9)
      else g.rect(E.x, by, E.b, bh)
      g.fill({ color: f, alpha: 0.95 })
    }
    g.roundRect(E.x, E.y, E.b, E.h, 9).stroke({ width: 3, color: shade(s.tub, 0.4) })
  } else {
    g.roundRect(E.x, E.y, E.b, E.h, 9)
      .fill(topLightFill(s.tub, { highlight: 0.22, dark: 0.2 }))
      .stroke({ width: 3, color: shade(s.tub, 0.42) })
  }
  ritaMotiv(g, s.key, s.wow ? 0x8a5a9a : s.tub)

  // --- krympvecket i botten ------------------------------------------------
  g.roundRect(-34, 46, 68, 18, 5)
    .fill(cylinderFill(P.plastMork, { axis: 'y', dark: 0.2, highlight: 0.34 }))
    .stroke({ width: 2.6, color: shade(P.plastMork, 0.35) })
  for (let i = 0; i < 8; i++) {
    const vx = -29 + i * 8.3
    g.moveTo(vx, 49).lineTo(vx, 61).stroke({ width: 2, color: shade(P.plastMork, 0.34), alpha: 0.7, cap: 'round' })
  }

  return c
}

// ---------------------------------------------------------------------------
// ⓶ TANDBORSTEN
// ---------------------------------------------------------------------------

// Borstens geometri på ETT ställe. `RAD_Y` är borstradernas mittlinjer, och `HUVUD`
// räknas ur dem — det exporterade läget kan alltså inte glida ifrån konsten om huvudet
// flyttas (CLAUDE.md: "en hårdkodad spets rapporterade samma tal efter att vingen krympts").
const RAD_Y = [-88, -68, -48] // tipprad först — ritordningen vänds nedan
const TUFT_X = [-22, -11, 0, 11, 22]
const HUVUD = { x: 0, y: (RAD_Y[0] + RAD_Y[RAD_Y.length - 1]) / 2 } // → { 0, -68 }
// Vilovinkel: borsthuvudet pekar UPPÅT-VÄNSTER. Konsten ritas längs lokala −Y, så en
// negativ rotation svänger huvudet åt vänster medan handtaget går ner till höger — precis
// som man håller en tandborste.
const BORSTE_VILA = -0.35
export { HUVUD as BORSTE_HUVUD, BORSTE_VILA }

// Krämklickens mittlinje över borstfältet — en vågig korv, inte en rak stapel.
const KRAM_VAG = [
  [-28, -74], [-14, -84], [0, -70], [14, -60], [27, -72],
]

/**
 * Tandborsten.
 *
 * @returns {{
 *   view: import('pixi.js').Container,
 *   huvud: {x:number,y:number},
 *   kram: (farg:number|null) => void,
 *   boj: (v:number) => void,
 *   destroy: () => void
 * }}
 *
 * `view` — origo MITT PÅ SKAFTET (det är där fingret håller). Total längd ~210 px,
 *   borsthuvudet ~64 px brett. Vilorotationen är satt till `BORSTE_VILA` (−0,35 rad).
 * `huvud` — borststråfältets mittpunkt i `view`s LOKALA koordinater, alltså FÖRE rotation
 *   och skala. `index.js` räknar kontaktpunkten som fingrets läge + `huvud` roterad med
 *   `view.rotation`. Talet härleds ur `RAD_Y` och är samma tal som konsten ritas med.
 * `kram(farg)` — lägger en klick tandkräm i den färgen på borsten (guppar in). `null` tar
 *   bort den.
 * `boj(v)` — v 0..1, böjer borststråna åt sidan som när man trycker mot en tandyta.
 *   ALLOKERAR INTE: sätter bara `x`/`rotation`/`scale` på tre radnoder och krämklicken,
 *   så den tål att anropas varje bildruta.
 */
export function makeBorste() {
  const view = new Container()
  view.eventMode = 'none'
  view.rotation = BORSTE_VILA

  let dod = false
  const tweens = []
  const spar = (t) => {
    if (!t) return t
    // Städa FÄRDIGA tweens, aldrig den äldsta: `tw.parent` är sant för löpande OCH köade
    // och falskt för både färdiga och dödade — enda måttet som skiljer dem åt.
    for (let i = tweens.length - 1; i >= 0; i--) if (!tweens[i].parent) tweens.splice(i, 1)
    tweens.push(t)
    return t
  }

  // --- skaft, grepp och hals ----------------------------------------------
  const kropp = nyG()
  view.addChild(kropp)

  // Silhuett: brett rundat handtagsslut, midja med greppräfflor, smal hals, brett huvud.
  kropp.moveTo(-13, 100)
    .quadraticCurveTo(0, 110, 13, 100)
    .quadraticCurveTo(16, 74, 12, 44)
    .quadraticCurveTo(9, 10, 8, -18)
    .lineTo(-8, -18)
    .quadraticCurveTo(-9, 10, -12, 44)
    .quadraticCurveTo(-16, 74, -13, 100)
    .closePath()
    .fill(cylinderFill(P.plastVit, { axis: 'y', dark: 0.24, highlight: 0.32 }))
    .stroke({ width: 3, color: P.plastMork })
  // Greppräfflor: gummiknoppar i två rader längs midjan.
  for (let i = 0; i < 6; i++) {
    const gy = 34 + i * 11
    kropp.roundRect(-9, gy, 18, 5.5, 2.8).fill({ color: P.gummi, alpha: 0.92 })
  }
  kropp.roundRect(-11, 58, 22, 40, 9).stroke({ width: 2, color: P.gummi, alpha: 0.5 })
  // Halsens färgband — det som gör att den läser som en tandborste och inte som en sked.
  kropp.roundRect(-8, -14, 16, 22, 7).fill(cylinderFill(P.borstBla, { axis: 'y', dark: 0.28 }))
  // Blänk längs skaftet.
  kropp.roundRect(-8, 6, 4.5, 84, 2.4).fill({ color: 0xffffff, alpha: 0.45 })

  // --- borsthuvudet --------------------------------------------------------
  const huvudG = nyG()
  view.addChild(huvudG)
  huvudG.roundRect(-32, -106, 64, 82, 26)
    .fill(topLightFill(P.plastVit, { highlight: 0.28, dark: 0.16 }))
    .stroke({ width: 3, color: P.plastMork })
  // Gummikant i spetsen: en mjuk båge tvärs över änden.
  huvudG.moveTo(-27, -96).quadraticCurveTo(0, -110, 27, -96)
    .stroke({ width: 5, color: P.gummi, alpha: 0.85, cap: 'round' })

  // Borststråna. Var rad är en EGEN container med pivot i sin egen baslinje, så `boj()`
  // kan luta dem utan att flytta huvudet. Raderna ritas från spetsen och inåt, så att den
  // rad som ligger närmast handtaget hamnar överst — annars sticker de bakre stråna fram
  // genom de främre.
  const borstFalt = new Container()
  borstFalt.eventMode = 'none'
  view.addChild(borstFalt)

  const rader = []
  for (let i = 0; i < RAD_Y.length; i++) {
    const ry = RAD_Y[i]
    const rad = new Container()
    rad.eventMode = 'none'
    rad.pivot.set(0, ry + 8) // pivot i strånas FÄSTE, inte i deras mitt
    rad.position.set(0, ry + 8)
    const rg = nyG()
    rad.addChild(rg)
    for (let k = 0; k < TUFT_X.length; k++) {
      const tx = TUFT_X[k]
      // Tofsens fot: en liten mörk ellips som ger fältet djup.
      rg.ellipse(tx, ry + 7, 7, 3.4).fill({ color: P.plastMork, alpha: 0.45 })
      // Fyra enskilda strån per tofs, lite olika höga och lite fanande — fem lika höga
      // streck läser som en kam, inte som borst.
      for (let s = 0; s < 4; s++) {
        const off = (s - 1.5) * 2.6
        const hojd = 13 + ((k + s) % 3) * 1.8
        const farg = s === 1 ? P.stråBla : s === 3 ? P.stråGron : P.stråVit
        rg.moveTo(tx + off * 0.6, ry + 7)
          .quadraticCurveTo(tx + off, ry + 1, tx + off * 1.5, ry + 7 - hojd)
          .stroke({ width: 2.6, color: farg, alpha: 0.95, cap: 'round' })
      }
    }
    rader.push(rad)
  }
  // Spetsraden längst bak, handtagsraden överst.
  for (let i = 0; i < rader.length; i++) borstFalt.addChild(rader[i])

  // --- tandkrämsklicken ----------------------------------------------------
  const kramNod = new Container()
  kramNod.eventMode = 'none'
  view.addChild(kramNod)
  const kramG = nyG()
  kramNod.addChild(kramG)
  kramNod.visible = false

  const ritaKram = (farg) => {
    kramG.clear()
    const kant = shade(farg, 0.26)
    // Konturen först i en bredare stroke: en VIT glitterkräm på vita strån behöver en
    // kant för att synas alls.
    for (const [bredd, f, alpha] of [[23, kant, 1], [19, farg, 1]]) {
      kramG.moveTo(KRAM_VAG[0][0], KRAM_VAG[0][1])
      for (let i = 1; i < KRAM_VAG.length; i++) {
        const [px, py] = KRAM_VAG[i - 1]
        const [qx, qy] = KRAM_VAG[i]
        kramG.quadraticCurveTo(px + (qx - px) * 0.5, py, qx, qy)
      }
      kramG.stroke({ width: bredd, color: f, alpha, cap: 'round', join: 'round' })
    }
    // Ljuskammen längs ovansidan gör korven rund i stället för platt.
    kramG.moveTo(KRAM_VAG[0][0] + 3, KRAM_VAG[0][1] - 5)
    for (let i = 1; i < KRAM_VAG.length; i++) {
      const [px, py] = KRAM_VAG[i - 1]
      const [qx, qy] = KRAM_VAG[i]
      kramG.quadraticCurveTo(px + (qx - px) * 0.5, py - 5, qx, qy - 5)
    }
    kramG.stroke({ width: 6, color: tint(farg, 0.55), alpha: 0.7, cap: 'round', join: 'round' })
    // Den lilla curlen i änden — spetsen som blir kvar när man släpper tuben.
    kramG.moveTo(27, -72).quadraticCurveTo(38, -74, 34, -84)
      .stroke({ width: 13, color: farg, cap: 'round' })
    kramG.moveTo(27, -72).quadraticCurveTo(38, -74, 34, -84)
      .stroke({ width: 4, color: tint(farg, 0.5), alpha: 0.6, cap: 'round' })
  }

  // Basvärden som `boj()` skriver relativt — läses en gång, aldrig per bildruta.
  const bojX = [-14, -9, -4]
  const bojR = [-0.17, -0.11, -0.05]

  return {
    view,
    huvud: HUVUD,

    kram(farg) {
      if (dod || kramNod.destroyed) return
      gsap.killTweensOf(kramNod)
      gsap.killTweensOf(kramNod.scale)
      if (farg == null) {
        kramNod.visible = false
        kramG.clear()
        kramNod.scale.set(1)
        kramNod.alpha = 1
        return
      }
      ritaKram(farg)
      kramNod.visible = true
      kramNod.alpha = 1
      kramNod.scale.set(0.4, 0.7)
      spar(gsap.to(kramNod.scale, {
        x: 1,
        y: 1,
        duration: 0.42,
        ease: 'back.out(2.4)',
        onUpdate: () => { if (kramNod.destroyed) gsap.killTweensOf(kramNod.scale) },
      }))
    },

    boj(v) {
      if (dod) return
      const t = v < 0 ? 0 : v > 1 ? 1 : v
      for (let i = 0; i < rader.length; i++) {
        const rad = rader[i]
        if (rad.destroyed) continue
        rad.x = bojX[i] * t
        rad.rotation = bojR[i] * t
      }
      if (!borstFalt.destroyed) borstFalt.scale.y = 1 - t * 0.07
      if (!kramNod.destroyed && kramNod.visible) {
        kramNod.x = bojX[0] * 0.6 * t
        kramNod.y = t * 3
      }
    },

    destroy() {
      dod = true
      for (const t of tweens) t?.kill()
      tweens.length = 0
      rivTrad(view)
    },
  }
}

// ---------------------------------------------------------------------------
// ⓶ MUGGEN
// ---------------------------------------------------------------------------

/**
 * Tandborstmugg i keramik — den borsten står i mellan borstningarna.
 * ~96 × 110 px, origo i mitten. Ingen öra/handtag: en tandborstmugg har ingen.
 */
export function makeMugg() {
  const c = new Container()
  c.eventMode = 'none'
  c.addChild(skugga(48, 37, 7))

  const g = nyG()
  c.addChild(g)

  const TOPP = -44
  const BOTTEN = 44

  // Kroppen: svagt konisk, bredast upptill.
  g.moveTo(-44, TOPP)
    .lineTo(-37, BOTTEN - 7)
    .quadraticCurveTo(-36, BOTTEN, -29, BOTTEN)
    .lineTo(29, BOTTEN)
    .quadraticCurveTo(36, BOTTEN, 37, BOTTEN - 7)
    .lineTo(44, TOPP)
    .closePath()
    .fill(cylinderFill(P.keramik, { axis: 'y', dark: 0.22, highlight: 0.26 }))
    .stroke({ width: 3.4, color: P.keramikMork })

  // Målat band en bit ner — muggen ska se ut att höra hemma i ett badrum, inte i en kiosk.
  g.moveTo(-41.2, -18).lineTo(41.2, -18).lineTo(40.1, -6).lineTo(-40.1, -6).closePath()
    .fill({ color: P.borstBla, alpha: 0.85 })
  g.moveTo(-39.4, 0).lineTo(39.4, 0).lineTo(39.1, 4).lineTo(-39.1, 4).closePath()
    .fill({ color: P.gummi, alpha: 0.75 })

  // Öppningen: mörk insida + tjock glaserad kant, så borsten läser som NEDSTOPPAD.
  g.ellipse(0, TOPP, 44, 11).fill(shade(P.keramik, 0.42))
  g.ellipse(0, TOPP + 2, 37, 7.5).fill(shade(P.keramik, 0.62))
  g.ellipse(0, TOPP, 44, 11).stroke({ width: 3.4, color: P.keramikMork })
  g.moveTo(-41, TOPP - 3).quadraticCurveTo(-21, TOPP - 10, 0, TOPP - 10.5)
    .stroke({ width: 3, color: 0xffffff, alpha: 0.7, cap: 'round' })

  // Glansstrimman på porslinet.
  g.roundRect(-33, -28, 9, 60, 4.5).fill({ color: 0xffffff, alpha: 0.42 })
  g.roundRect(24, -16, 4.5, 42, 2.2).fill({ color: 0xffffff, alpha: 0.22 })

  return c
}

// ---------------------------------------------------------------------------
// ⓶ VATTENGLASET
// ---------------------------------------------------------------------------

const GLAS_G = { topp: -48, botten: 48, hwBotten: 36, hwExtra: 8 }
// Glasets halva bredd på höjden y — samma funktion används av väggen OCH av vattnet, så
// vattnet kan aldrig sticka utanför porslinet.
const glasHw = (y) => GLAS_G.hwBotten + ((GLAS_G.botten - y) / (GLAS_G.botten - GLAS_G.topp)) * GLAS_G.hwExtra

/**
 * Ett vattenglas.
 *
 * @returns {{ view: import('pixi.js').Container, fyll: (v:number)=>void, destroy: ()=>void }}
 *
 * ~92 px brett, ~120 px högt, origo i mitten. `fyll(0..1)` sätter vattennivån (0 = tomt)
 * och glider dit på 0,45 s, så att ett glas som fylls SYNS fyllas.
 *
 * Vattnet är inte en blå rektangel: det har en ytlinje med meniskus, en mörkare botten,
 * en ljusbrytning där glasväggen bryts av ytan, och en ljusstrimma som bara finns i den
 * våta delen.
 */
export function makeGlas() {
  const view = new Container()
  view.eventMode = 'none'
  let dod = false
  let tw = null

  view.addChild(skugga(GLAS_G.botten + 4, 34, 6, 0.16))

  // Bakväggen (det man ser genom vattnet) ritas först, vattnet i mitten, framglaset sist.
  const bak = nyG()
  const vatten = nyG()
  const fram = nyG()
  view.addChild(bak, vatten, fram)

  const T = GLAS_G.topp
  const B = GLAS_G.botten
  const hwT = glasHw(T)
  const hwB = glasHw(B)

  // Bakvägg + botten: en svagt blåtonad glasmassa.
  bak.moveTo(-hwT, T)
    .lineTo(-hwB, B - 10)
    .quadraticCurveTo(-hwB, B, -hwB + 10, B)
    .lineTo(hwB - 10, B)
    .quadraticCurveTo(hwB, B, hwB, B - 10)
    .lineTo(hwT, T)
    .closePath()
    .fill(verticalFillAlpha(tint(P.glas, 0.5), P.glas, 0.3, 0.55))
  // Tjock glasbotten — det som gör att det läser som ett dricksglas.
  bak.moveTo(-hwB + 2, B - 14)
    .lineTo(hwB - 2, B - 14)
    .lineTo(hwB - 4, B - 4)
    .lineTo(-hwB + 4, B - 4)
    .closePath()
    .fill({ color: tint(P.vattenDjup, 0.55), alpha: 0.45 })

  const rita = (n) => {
    if (dod || vatten.destroyed) return
    vatten.clear()
    if (n <= 0.004) return
    const yt = B - (B - T + 6) * n // ytan; +6 så full nivå går strax över kanten på insidan
    const hwY = glasHw(yt)

    // Vattenkroppen.
    vatten.moveTo(-hwY, yt)
      .lineTo(-hwB, B - 10)
      .quadraticCurveTo(-hwB, B - 2, -hwB + 9, B - 2)
      .lineTo(hwB - 9, B - 2)
      .quadraticCurveTo(hwB, B - 2, hwB, B - 10)
      .lineTo(hwY, yt)
      .closePath()
      .fill(verticalFillAlpha(P.vatten, P.vattenDjup, 0.62, 0.86))

    // Ljusbrytningen: en ljus kil längs vänster innervägg som bara finns UNDER ytan, och
    // en förstoringsrand strax under ytan där glaset ser bredare ut genom vattnet.
    vatten.moveTo(-hwY + 4, yt + 5)
      .lineTo(-hwB + 4, B - 12)
      .lineTo(-hwB + 11, B - 12)
      .lineTo(-hwY + 12, yt + 5)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.22 })
    vatten.moveTo(-hwY, yt + 4).lineTo(hwY, yt + 4)
      .stroke({ width: 3, color: tint(P.vatten, 0.6), alpha: 0.5 })

    // Ytan: en ellips (vi ser ner i glaset) med en ljus meniskus mot glaset.
    vatten.ellipse(0, yt, hwY - 1.5, 7).fill({ color: tint(P.vatten, 0.42), alpha: 0.9 })
    vatten.ellipse(0, yt, hwY - 1.5, 7).stroke({ width: 2.6, color: 0xffffff, alpha: 0.75 })
    vatten.moveTo(-hwY * 0.55, yt - 2.5).quadraticCurveTo(0, yt - 5.5, hwY * 0.45, yt - 2)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.55, cap: 'round' })
  }

  // Framglaset: kanttjocklek, blänk och kantljus — ritas EN gång, ligger alltid överst.
  fram.moveTo(-hwT, T)
    .lineTo(-hwB, B - 10)
    .quadraticCurveTo(-hwB, B, -hwB + 10, B)
    .lineTo(hwB - 10, B)
    .quadraticCurveTo(hwB, B, hwB, B - 10)
    .lineTo(hwT, T)
    .stroke({ width: 4, color: tint(P.vattenDjup, 0.35), alpha: 0.85, join: 'round' })
  fram.ellipse(0, T, hwT, 9).stroke({ width: 4.5, color: 0xffffff, alpha: 0.8 })
  fram.ellipse(0, T, hwT, 9).stroke({ width: 2, color: tint(P.vattenDjup, 0.3), alpha: 0.5 })
  fram.roundRect(-hwT + 7, T + 12, 9, 68, 4.5).fill({ color: 0xffffff, alpha: 0.5 })
  fram.roundRect(hwT - 15, T + 24, 4.5, 44, 2.2).fill({ color: 0xffffff, alpha: 0.28 })
  // rimLight() ger en EGEN Graphics — den läggs i `view`, aldrig i `fram`. En Graphics
  // tar visserligen barn i Pixi v8, men varnar deprecerat i konsolen, och testet kräver
  // noll konsolutskrifter.
  const blank = rimLight(hwT, { offsetX: -0.42, offsetY: -0.66, size: 0.2, alpha: 0.4, ry: 50 })
  view.addChild(blank)

  const niva = { n: 0 }
  rita(0)

  return {
    view,

    // ⚠️ `fyll()` måste tåla BÅDA anropsmönstren, och det är därför den inte alltid
    // tweenar. Ett engångsanrop (`fyll(0.72)` när glaset fylls) ska GLIDA dit, annars
    // hoppar vattenytan. Men en anropare som driver nivån själv varje bildruta (en ramp i
    // en `onUpdate`) skulle med en fast 0,45 s-tween döda och starta om tweenen 60 gånger
    // i sekunden och aldrig komma fram — ytan hade släpat en halv sekund efter för alltid.
    // Små steg sätts därför direkt, stora glider, och glidtiden skalar med avståndet.
    fyll(v) {
      if (dod) return
      const mal = v < 0 ? 0 : v > 1 ? 1 : v
      const d = Math.abs(mal - niva.n)
      if (d < 0.06) {
        tw?.kill()
        tw = null
        niva.n = mal
        rita(mal)
        return
      }
      tw?.kill()
      tw = gsap.to(niva, {
        n: mal,
        duration: Math.min(0.45, 0.12 + d * 0.5),
        ease: 'power2.out',
        onUpdate: () => {
          if (dod || vatten.destroyed) { tw?.kill(); return }
          rita(niva.n)
        },
      })
    },

    destroy() {
      dod = true
      tw?.kill()
      tw = null
      gsap.killTweensOf(niva)
      rivTrad(view)
    },
  }
}

// ---------------------------------------------------------------------------
// ⓶ SMUTSFLÄCKEN
// ---------------------------------------------------------------------------

/**
 * EN smutsfläck på en tand.
 *
 * Origo i mitten, `r` = ungefärlig radie. Konturen är oregelbunden (ingen cirkel) men
 * medvetet GROV: fläcken ritas i fotorutans koordinater och landar på 11–15 px på
 * skärmen. Därför tre lager i tydligt skilda nyanser plus en mörk kantlinje — det är
 * kanten som gör att den syns alls mot en vit tand.
 */
export function makeSmutsflack(farg, r = 14) {
  const c = new Container()
  c.eventMode = 'none'
  const g = nyG()
  c.addChild(g)

  // En sluten blobb av 8 punkter med slumpad radie — ritad med kvadratiska mellansteg
  // genom kantmittpunkterna, så silhuetten blir kladdig och inte kantig.
  const n = 8
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (0.62 + Math.random() * 0.27)
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.86])
  }
  const blobb = (skala, dy) => {
    const mid = (i) => {
      const a = pts[i]
      const b = pts[(i + 1) % n]
      return [((a[0] + b[0]) / 2) * skala, ((a[1] + b[1]) / 2) * skala + dy]
    }
    let m = mid(n - 1)
    g.moveTo(m[0], m[1])
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      m = mid(i)
      g.quadraticCurveTo(p[0] * skala, p[1] * skala + dy, m[0], m[1])
    }
    g.closePath()
  }

  // Lager 1: mörk yttre kladd, en aning nedåtförskjuten (den sitter mot tandköttet).
  blobb(1.04, r * 0.06)
  g.fill(shade(farg, 0.42))
  // Lager 2: själva smutsen.
  blobb(0.92, 0)
  g.fill(farg)
  // Lager 3: en ljusare fläck högt upp — utan den läser den som ett hål, inte som smuts.
  g.ellipse(-r * 0.22, -r * 0.26, r * 0.34, r * 0.24).fill({ color: tint(farg, 0.42), alpha: 0.9 })
  // Kanten sist: hög kontrast mot den vita tanden, och det som överlever nedskalningen.
  blobb(1.04, r * 0.06)
  g.stroke({ width: Math.max(1.6, r * 0.16), color: shade(farg, 0.6), alpha: 0.95, join: 'round' })
  // Två små stänk bredvid — smuts kommer sällan ensam.
  for (const [sx, sy, sr] of [[r * 0.72, r * 0.44, r * 0.17], [-r * 0.68, r * 0.52, r * 0.13]]) {
    g.circle(sx, sy, sr).fill(shade(farg, 0.2))
  }

  return c
}

// ---------------------------------------------------------------------------
// ⓶ SKUMKLICKEN
// ---------------------------------------------------------------------------

/**
 * En skumklick — lödder, inte ett moln.
 *
 * Fem överlappande bubbliga lober i halvgenomskinlig kant, en ljus kärna och ett par
 * riktiga bubbelringar. Origo i mitten, `r` = radie.
 *
 * Genomskinligheten sitter på LAGRET och inte på fyllningen: `.fill(gradient)` och
 * `.fill({ color, alpha })` utesluter varandra i Pixi, så lobernas volym (`sphereFill`)
 * och deras genomskinlighet måste bo på var sitt ställe.
 */
export function makeSkumklick(farg, r = 22) {
  const c = new Container()
  c.eventMode = 'none'

  const ljus = tint(farg, 0.38)
  const kant = shade(farg, 0.16)

  // Ytterloberna, halvgenomskinliga.
  const yttre = nyG()
  yttre.alpha = 0.62
  c.addChild(yttre)
  const lober = [
    [-r * 0.44, r * 0.11, r * 0.48],
    [r * 0.4, r * 0.16, r * 0.44],
    [-r * 0.11, -r * 0.4, r * 0.46],
    [r * 0.27, -r * 0.27, r * 0.37],
    [r * 0.02, r * 0.42, r * 0.4],
  ]
  for (const [lx, ly, lr] of lober) {
    yttre.circle(lx, ly, lr * 1.16).fill(sphereFill(farg, { lightY: 0.28, dark: 0.24 }))
  }
  for (const [lx, ly, lr] of lober) {
    yttre.circle(lx, ly, lr * 1.16).stroke({ width: Math.max(1.2, r * 0.06), color: kant, alpha: 0.5 })
  }

  // Kärnan: tätare och ljusare — det är den som gör att klicken läser som SKUM.
  const karna = nyG()
  karna.alpha = 0.92
  c.addChild(karna)
  for (const [lx, ly, lr] of lober) {
    karna.circle(lx * 0.55, ly * 0.55, lr * 0.72).fill(sphereFill(ljus, { lightY: 0.26, dark: 0.18 }))
  }

  // Enskilda bubblor ovanpå: ringar och gnistor. Utan dem är det bara en klump.
  const bubblor = nyG()
  c.addChild(bubblor)
  for (const [bx, by, br] of [
    [-r * 0.3, -r * 0.24, r * 0.18],
    [r * 0.26, r * 0.05, r * 0.14],
    [-r * 0.02, r * 0.3, r * 0.11],
    [r * 0.38, -r * 0.34, r * 0.1],
  ]) {
    bubblor.circle(bx, by, br).stroke({ width: Math.max(1, r * 0.055), color: 0xffffff, alpha: 0.75 })
    bubblor.circle(bx - br * 0.3, by - br * 0.34, br * 0.32).fill({ color: 0xffffff, alpha: 0.85 })
  }
  bubblor.circle(-r * 0.36, -r * 0.42, r * 0.15).fill({ color: 0xffffff, alpha: 0.7 })

  return c
}

// ---------------------------------------------------------------------------
// ⓶ TANDGLANSEN
// ---------------------------------------------------------------------------

/**
 * Glansstjärnan som studsar av framtanden i finalen: fyruddig med konkava sidor, vit med
 * en varm kärna. ~54 px, origo i mitten.
 */
export function makeTandglans() {
  const c = new Container()
  c.eventMode = 'none'
  const g = nyG()
  c.addChild(g)

  // Den lilla korsstjärnan bakom, vriden 45° — ger blänket riktning åt alla håll.
  const liten = nyG()
  liten.rotation = Math.PI / 4
  liten.alpha = 0.55
  c.addChild(liten)
  ritaStjarna(liten, 0, 0, 15, 0xfff3c4, 0.9)

  // Den varma glorian.
  g.circle(0, 0, 12).fill({ color: COLORS.yellow, alpha: 0.35 })
  g.circle(0, 0, 7).fill({ color: 0xfff0b0, alpha: 0.6 })

  // Huvudstjärnan, 54 px från udd till udd.
  const stor = nyG()
  c.addChild(stor)
  ritaStjarna(stor, 0, 0, 27, COLORS.white, 1)
  // Varm kärna innanför den vita — annars läser stjärnan som papper.
  ritaStjarna(stor, 0, 0, 11, 0xfff2bd, 0.95)
  stor.circle(0, 0, 3.6).fill(0xfff8e0)

  // Två små gnistor bredvid, så finishen inte är en ensam symbol.
  const gnistor = nyG()
  c.addChild(gnistor)
  ritaStjarna(gnistor, 21, -17, 7, COLORS.white, 0.85)
  ritaStjarna(gnistor, -19, 16, 5, COLORS.white, 0.7)

  // Bakgrundsstänket ligger bakom allt: en svag skiva som fångar ögat.
  const bak = nyG()
  bak.circle(0, 0, 22).fill(verticalFill(tint(COLORS.yellow, 0.7), COLORS.white))
  bak.alpha = 0.22
  c.addChildAt(bak, 0)

  return c
}

// Färgerna delas med badrummet: muggen, glaset och borsten ska höra ihop med bänkskivan.
export const BADRUM_FARG = P
