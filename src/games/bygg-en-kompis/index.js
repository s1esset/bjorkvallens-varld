// Bygg en Kompis — barnet BYGGER en varelse av delar och ser den bli levande.
//
// Kärnloop: sex kontrollrader (kroppsform · ögon · mun · huvudprydnad · färg · storlek)
// med var sitt par stora pilknappar. Varje tryck byter delen DIREKT på varelsen som
// står mitt på golvet: den nya delen studsar in, hela varelsen squashar, blinkar och
// säger sin egen ton. Varje del har en EGEN plats i en pentaton skala, så själva
// bygget blir en liten melodi — och när kompisen är klar sjunger den sin melodi.
//
// Mål: tryck på Bobos ritade kamera → kompisen blir levande (hoppar, snurrar, vinkar),
// blixten smäller, ett fotografi flyger upp och spikas fast på bildväggen (klonk), alla
// tidigare kompisar vinkar från sina ramar → progress.complete(). Sedan låses en NY del
// upp (vingar, horn, prickar, ränder, nya ögon, ny mun ...) och en ny kompis börjar.
//
// Galleriet sparas via ctx.progress.setCustom('galleri', …) — max 6, äldst ryker först.
// Spelet rör aldrig webbläsarens lagring själv; ctx.progress är hela vägen (P0 DATA).
//
// MOTGÅNG (P0, med tak): ibland kommer en bus-fjäril och sätter sig på kompisens huvud
// och skymmer prydnaden. Den är rolig, hindrar ingenting viktigt, flyger iväg av sig
// själv efter en stund — och ETT tryck på den räcker. Max EN i taget, minst 22 s emellan,
// aldrig under fotograferingen.
//
// P0: alla knappar ≥96 px med ≥24 px mellan träffytorna · ingen rotationsgest (snurren
// sker i finishen, aldrig med fingret) · inga poäng, ingen timer, inget misslyckande.
// ASSETS: varje kroppsdel är en egen ritad form med egen silhuett — inga emoji-i-ruta.
// Panelerna (bildväggen, kameraskylten) bär bara text och UI.
// EXIT-SÄKERT: _alive + ctx.later för allt fördröjt, alla liv()-tweens (repeat: -1)
// spåras och dödas, transienta effekter går via lib/feedback.js.
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { createScene } from '../../lib/scene.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { sphereFill } from '../../lib/form.js'
import { bounceIn, pop, squash, liv, puff, sparkle, burst, ripple, kvittera, breathe } from '../../lib/feedback.js'
import { COLORS, FONT, shade, tint } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Geometri (designkoordinater 1280×720) --------------------------------
// Talen är valda mot P0 TRÄFFYTA: varje knapp är 96×96 med Buttons 24 px hit-halo,
// alltså 144×144 träffyta. P0 kräver ≥24 px MELLAN träffytorna — inte att de nuddar.
// Raderna låg först 144 px isär, exakt en träffytehöjd: mellanrummet blev 0 px, och
// galleriramarnas träffyta (upp till y 138) överlappade dessutom översta raden
// vågrätt. Ingenting av det syns i ett grönt test — `check.mjs` mäter ingen geometri.
// Nu: rader 168 px isär (144 + 24) och ramens träffyta 96 px hög (y 30–126), alltså
// 24 px upp till första raden. Nedersta radens träffyta slutar på y 630, ovanför
// designytans kant. Skalets egna knappar (hem 70,64 · högtalare 1210,64) äger hörnen
// upp till y≈134 — därför slutar bildväggen vid x 1040.
const VX = 540 // varelsens fotpunkt x
const VY = 560 // varelsens fotpunkt y (golvlinjen den står på)
const RAD_Y = [222, 390, 558]
const VAN = { pil1: 88, prev: 182, pil2: 276 }
const HOG = { pil1: 1004, prev: 1098, pil2: 1192 }
const RAM_X = [250, 390, 530, 670, 810, 950]
const RAM_Y = 78
const MAX_RAMAR = 6
const KAM_X = 812
const KAM_Y = 470
const HINT_S = 7 // sekunder utan handling → mjuk om-cue
const BUS_S = 22 // minst så många sekunder mellan två fjärilsbesök

// Pentaton skala i C — varje del har sin egen startpunkt, så samma knapp ger alltid
// samma tonhöjd och bygget blir en melodi i stället för en rad blip. Stämda toner,
// aldrig ett generiskt UI-klick (se CLAUDE.md "Byt inte ut stämda ljud").
const SKALA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]
const TON_BAS = { kropp: 0, ogon: 2, mun: 4, topp: 5, farg: 6, storlek: 1 }

const SPH = { dark: 0.24, highlight: 0.3, spread: 0.6 }

// --- KROPPAR ---------------------------------------------------------------
// Alla ritas i varelsens egen rymd: y = 0 är golvet, allt annat är negativt uppåt.
// `m` är formens fästpunkter — var ögonen sitter, var munnen sitter, var prydnaden
// fäster, var axlarna är. Utan dem hade varje ny kroppsform krävt ny kod i varje
// annan del; nu är en kropp fem rader data plus en ritfunktion.
const KROPPAR = [
  {
    id: 'klot',
    m: { topY: -206, faceY: -136, munY: -78, bredd: 94, axelY: -116 },
    rita(g, p) {
      g.ellipse(-48, -12, 32, 17).fill(p.d)
      g.ellipse(48, -12, 32, 17).fill(p.d)
      g.circle(0, -112, 96).fill(sphereFill(p.c, SPH)).stroke({ width: 6, color: p.d })
      g.ellipse(0, -80, 52, 54).fill({ color: p.l, alpha: 0.5 })
    },
  },
  {
    id: 'agg',
    m: { topY: -208, faceY: -138, munY: -84, bredd: 86, axelY: -124 },
    rita(g, p) {
      g.ellipse(-44, -12, 30, 16).fill(p.d)
      g.ellipse(44, -12, 30, 16).fill(p.d)
      g.moveTo(0, -214)
      g.quadraticCurveTo(-62, -206, -68, -140)
      g.quadraticCurveTo(-98, -54, 0, -16)
      g.quadraticCurveTo(98, -54, 68, -140)
      g.quadraticCurveTo(62, -206, 0, -214)
      g.closePath().fill(sphereFill(p.c, SPH)).stroke({ width: 6, color: p.d })
      g.ellipse(0, -66, 46, 40).fill({ color: p.l, alpha: 0.5 })
    },
  },
  {
    id: 'kloss',
    m: { topY: -204, faceY: -142, munY: -84, bredd: 86, axelY: -122 },
    rita(g, p) {
      g.ellipse(-50, -12, 32, 16).fill(p.d)
      g.ellipse(50, -12, 32, 16).fill(p.d)
      g.roundRect(-88, -210, 176, 194, 42).fill(sphereFill(p.c, SPH)).stroke({ width: 6, color: p.d })
      g.roundRect(-50, -108, 100, 82, 30).fill({ color: p.l, alpha: 0.45 })
    },
  },
  {
    id: 'kon',
    m: { topY: -218, faceY: -118, munY: -68, bredd: 84, axelY: -104 },
    rita(g, p) {
      g.ellipse(-44, -12, 30, 16).fill(p.d)
      g.ellipse(44, -12, 30, 16).fill(p.d)
      g.moveTo(0, -228)
      g.quadraticCurveTo(-30, -166, -58, -106)
      g.quadraticCurveTo(-96, -32, 0, -16)
      g.quadraticCurveTo(96, -32, 58, -106)
      g.quadraticCurveTo(30, -166, 0, -228)
      g.closePath().fill(sphereFill(p.c, SPH)).stroke({ width: 6, color: p.d })
      g.ellipse(0, -56, 44, 32).fill({ color: p.l, alpha: 0.45 })
    },
  },
  // --- upplåsbara ---
  {
    id: 'moln',
    m: { topY: -196, faceY: -126, munY: -74, bredd: 100, axelY: -110 },
    rita(g, p) {
      g.ellipse(-46, -12, 30, 16).fill(p.d)
      g.ellipse(46, -12, 30, 16).fill(p.d)
      // Mörk "rimkant" bakom lobberna i stället för stroke — en stroke på överlappande
      // cirklar ritar streck TVÄRS ÖVER molnet och silhuetten faller isär.
      for (const [lx, ly, lr] of [[-58, -104, 56], [58, -104, 56], [0, -152, 62], [0, -74, 70]]) {
        g.circle(lx, ly + 5, lr + 6).fill(p.d)
      }
      for (const [lx, ly, lr] of [[-58, -104, 56], [58, -104, 56], [0, -152, 62], [0, -74, 70]]) {
        g.circle(lx, ly, lr).fill(sphereFill(p.c, SPH))
      }
      g.ellipse(0, -66, 46, 36).fill({ color: p.l, alpha: 0.42 })
    },
  },
  {
    id: 'lang',
    m: { topY: -234, faceY: -168, munY: -110, bredd: 58, axelY: -146 },
    rita(g, p) {
      g.ellipse(-32, -12, 26, 15).fill(p.d)
      g.ellipse(32, -12, 26, 15).fill(p.d)
      g.roundRect(-58, -240, 116, 224, 58).fill(sphereFill(p.c, SPH)).stroke({ width: 6, color: p.d })
      g.ellipse(0, -96, 32, 56).fill({ color: p.l, alpha: 0.45 })
    },
  },
]

// --- ÖGON (ritas i ögonnodens origo, som sitter på kroppens faceY) ---------
const OGON = [
  {
    id: 'tva',
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.circle(s * 34, 0, 23).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(s * 34 + s * 3, 4, 11).fill(p.ink)
        g.circle(s * 34 - 2, -2, 4.5).fill(COLORS.white)
      }
    },
  },
  {
    id: 'stort',
    rita(g, p) {
      g.circle(0, -2, 36).fill(COLORS.white).stroke({ width: 5, color: p.d })
      g.circle(2, 3, 17).fill(p.ink)
      g.circle(-6, -8, 7).fill(COLORS.white)
    },
  },
  {
    id: 'tre',
    rita(g, p) {
      for (const [ex, ey] of [[-40, 2], [0, -20], [40, 2]]) {
        g.circle(ex, ey, 16).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(ex + 2, ey + 3, 8).fill(p.ink)
        g.circle(ex - 3, ey - 3, 3).fill(COLORS.white)
      }
    },
  },
  {
    id: 'skaft',
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.moveTo(s * 18, 22).quadraticCurveTo(s * 30, -10, s * 40, -40)
        g.stroke({ width: 8, color: p.d, cap: 'round' })
        g.circle(s * 42, -50, 18).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(s * 44, -47, 8).fill(p.ink)
        g.circle(s * 38, -55, 3.5).fill(COLORS.white)
      }
    },
  },
  // --- upplåsbara ---
  {
    id: 'glasogon',
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.circle(s * 36, 0, 21).fill(COLORS.white)
        g.circle(s * 36 + s * 3, 3, 10).fill(p.ink)
        g.circle(s * 36 - 2, -3, 4).fill(COLORS.white)
        g.circle(s * 36, 0, 26).stroke({ width: 6, color: 0x4a3526 })
      }
      g.moveTo(-10, 0).lineTo(10, 0).stroke({ width: 6, color: 0x4a3526 })
    },
  },
  {
    id: 'somnig',
    // Ögonlocket måste vara MÖRKARE än kroppen. Första utkastet fyllde locket med
    // kroppsfärgen och ögonen försvann helt i silhuetten — syntes bara i skärmdumpen.
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.circle(s * 34, 0, 22).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(s * 34 + 2, 8, 9).fill(p.ink)
        g.moveTo(s * 34 - 22, -1).arc(s * 34, -1, 22, Math.PI, 0).closePath().fill(p.d)
        g.moveTo(s * 34 - 22, -1).lineTo(s * 34 + 22, -1).stroke({ width: 5, color: p.ink, cap: 'round' })
        for (const lx of [-13, 1, 15]) {
          g.moveTo(s * 34 + lx, -4).lineTo(s * 34 + lx * 1.15, -18).stroke({ width: 3.5, color: p.ink, cap: 'round' })
        }
      }
    },
  },
]

// --- MUNNAR (origo = kroppens munY) ---------------------------------------
const MUNNAR = [
  {
    id: 'leende',
    rita(g, p) {
      g.moveTo(-30, -6).quadraticCurveTo(0, 26, 30, -6).stroke({ width: 8, color: p.ink, cap: 'round' })
    },
  },
  {
    id: 'gap',
    rita(g, p) {
      g.ellipse(0, 4, 33, 25).fill(0x53263a).stroke({ width: 4, color: p.d })
      g.ellipse(0, 16, 17, 10).fill(COLORS.pink)
    },
  },
  {
    id: 'tander',
    rita(g, p) {
      g.roundRect(-40, -14, 80, 36, 16).fill(0x53263a).stroke({ width: 4, color: p.d })
      for (const tx of [-26, -9, 8, 25]) g.roundRect(tx, -14, 15, 13, 4).fill(COLORS.white)
      for (const tx of [-18, 1, 18]) g.roundRect(tx, 12, 14, 10, 4).fill(COLORS.white)
    },
  },
  {
    id: 'liten',
    rita(g, p) {
      g.circle(0, 2, 13).fill(p.ink)
      g.circle(-4, -2, 4).fill({ color: COLORS.white, alpha: 0.4 })
    },
  },
  // --- upplåsbara ---
  {
    id: 'tunga',
    rita(g, p) {
      g.moveTo(-30, -8).quadraticCurveTo(0, 22, 30, -8).stroke({ width: 8, color: p.ink, cap: 'round' })
      g.moveTo(2, 8).quadraticCurveTo(24, 12, 20, 34).quadraticCurveTo(8, 44, 2, 26).closePath()
      g.fill(COLORS.pink).stroke({ width: 4, color: 0xd97ba0 })
    },
  },
  {
    id: 'snabel',
    rita(g, p) {
      g.moveTo(-14, -6).quadraticCurveTo(30, 0, 26, 40).quadraticCurveTo(24, 56, 42, 56)
      g.stroke({ width: 17, color: p.d, cap: 'round' })
      g.circle(46, 56, 11).fill(p.l).stroke({ width: 4, color: p.d })
    },
  },
]

// --- PRYDNADER (origo = kroppens topY; alla ritas BAKOM kroppen) ----------
// `bak: true` betyder att delen fäster i axelhöjd i stället för på hjässan (vingar).
const TOPPAR = [
  {
    id: 'runda-oron',
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.circle(s * 50, 14, 30).fill(p.c).stroke({ width: 6, color: p.d })
        g.circle(s * 50, 14, 15).fill({ color: p.l, alpha: 0.7 })
      }
    },
  },
  {
    id: 'spetsiga-oron',
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.moveTo(s * 18, 22).lineTo(s * 74, -50).lineTo(s * 66, 26).closePath()
        g.fill(p.c).stroke({ width: 6, color: p.d })
        g.moveTo(s * 32, 16).lineTo(s * 62, -22).lineTo(s * 58, 18).closePath().fill({ color: p.l, alpha: 0.7 })
      }
    },
  },
  {
    id: 'antenner',
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.moveTo(s * 14, 20).quadraticCurveTo(s * 34, -18, s * 40, -54)
        g.stroke({ width: 7, color: p.d, cap: 'round' })
        g.circle(s * 41, -64, 14).fill(COLORS.yellow).stroke({ width: 4, color: 0xd9a52b })
        g.circle(s * 37, -68, 4).fill({ color: COLORS.white, alpha: 0.7 })
      }
    },
  },
  {
    id: 'tofs',
    rita(g, p) {
      for (const [tx, ty, tw] of [[-30, -46, -16], [0, -62, 0], [30, -46, 16]]) {
        g.moveTo(tx * 0.4, 22).quadraticCurveTo(tx, ty, tx + tw, ty - 10)
        g.quadraticCurveTo(tx + tw * 0.3, ty + 24, tx * 0.4 + 14, 22).closePath()
        g.fill(p.d)
      }
      g.circle(0, 12, 16).fill({ color: p.d, alpha: 0.9 })
    },
  },
  // --- upplåsbara ---
  {
    id: 'horn',
    // Tjocka vid basen och krökta UTÅT — det första utkastet var smala spetsar och
    // lästes som kaninöron i skärmdumpen.
    rita(g) {
      for (const s of [-1, 1]) {
        g.moveTo(s * 16, 26)
        g.quadraticCurveTo(s * 74, 12, s * 64, -50)
        g.quadraticCurveTo(s * 44, -14, s * 2, 22)
        g.closePath().fill(0xf3e3c4).stroke({ width: 5, color: 0xc2a77e })
        g.moveTo(s * 30, 16).quadraticCurveTo(s * 58, 0, s * 56, -30).stroke({ width: 3, color: 0xc2a77e, alpha: 0.8 })
        g.moveTo(s * 24, 22).quadraticCurveTo(s * 50, 8, s * 50, -14).stroke({ width: 3, color: 0xc2a77e, alpha: 0.5 })
      }
    },
  },
  {
    id: 'vingar',
    bak: true,
    // Vingarna är den FÖRSTA upplåsningen och måste synas ordentligt utanför kroppen.
    // Spännvidden är satt så att spetsarna stannar innanför vänsterkolumnens pilar och
    // kamerans stativ även på den största kompisen (150 px × 1,12 = 168 px från mitten).
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.moveTo(0, 10)
        g.quadraticCurveTo(s * 88, -96, s * 150, -40)
        g.quadraticCurveTo(s * 120, 34, 0, 34)
        g.closePath().fill({ color: tint(p.c, 0.5), alpha: 0.95 }).stroke({ width: 5, color: p.d })
        g.moveTo(s * 18, 6).quadraticCurveTo(s * 76, -40, s * 132, -34).stroke({ width: 3.5, color: p.d, alpha: 0.7 })
        g.moveTo(s * 18, 18).quadraticCurveTo(s * 72, -6, s * 120, 2).stroke({ width: 3.5, color: p.d, alpha: 0.5 })
        g.moveTo(s * 18, 26).quadraticCurveTo(s * 64, 18, s * 96, 26).stroke({ width: 3, color: p.d, alpha: 0.35 })
      }
    },
  },
]

// --- FÄRG + MÖNSTER --------------------------------------------------------
const FARGER = [
  { c: 0xff8a3d, m: 'ingen' },
  { c: 0x5bbf6a, m: 'ingen' },
  { c: 0x4aa3df, m: 'ingen' },
  { c: 0xa78bfa, m: 'ingen' },
  { c: 0xff9ec4, m: 'ingen' },
  { c: 0xffd35c, m: 'ingen' },
  // --- upplåsbara ---
  { c: 0x57c8c3, m: 'prickar' },
  { c: 0xff6b6b, m: 'rander' },
  { c: 0x8ed96f, m: 'prickar' },
  { c: 0x7cb8ff, m: 'rander' },
]

const STORLEKAR = [0.78, 0.94, 1.12]

// Så många varianter finns framme från start; resten låses upp en i taget.
const BAS = { kropp: 4, ogon: 4, mun: 4, topp: 4, farg: 6, storlek: 3 }
const TAK = { kropp: KROPPAR.length, ogon: OGON.length, mun: MUNNAR.length, topp: TOPPAR.length, farg: FARGER.length, storlek: STORLEKAR.length }
// Upplåsningsordning: en ny del per färdig kompis. Vingarna först — de är den roligaste
// upptäckten och ska inte ligga bakom tio omgångar.
const LAS_ORDNING = ['topp', 'farg', 'kropp', 'ogon', 'mun', 'topp', 'farg', 'kropp', 'ogon', 'mun', 'farg', 'farg']

const DELAR = [
  { key: 'kropp', farg: COLORS.green, kol: 'v', rad: 0 },
  { key: 'ogon', farg: COLORS.blue, kol: 'v', rad: 1 },
  { key: 'mun', farg: COLORS.pink, kol: 'v', rad: 2 },
  { key: 'topp', farg: COLORS.purple, kol: 'h', rad: 0 },
  { key: 'farg', farg: COLORS.yellow, kol: 'h', rad: 1 },
  { key: 'storlek', farg: COLORS.teal, kol: 'h', rad: 2 },
]

// Palett ur den valda färgen. En egen liten funktion så varje ritfunktion får samma
// tre toner (grundfärg, mörk kant, ljus mage) utan att räkna om dem.
function palett(farg) {
  return { c: farg.c, d: shade(farg.c, 0.3), l: tint(farg.c, 0.5), ink: 0x3b2a20 }
}

// Bygg en hel varelse ur en konfiguration. Returnerar noderna som spelet vill
// animera var för sig (ögonen blinkar, armarna vinkar, delen som byttes studsar).
function byggVarelse(cfg) {
  const kropp = KROPPAR[cfg.kropp % KROPPAR.length]
  const farg = FARGER[cfg.farg % FARGER.length]
  const toppDef = TOPPAR[cfg.topp % TOPPAR.length]
  const p = palett(farg)
  const m = kropp.m

  const nod = new Container()
  nod.eventMode = 'none'
  const bak = new Container()
  const fram = new Container()
  nod.addChild(bak, fram)

  // Prydnaden ligger BAKOM kroppen: öron och horn ska sticka upp ur silhuetten,
  // aldrig ligga som klistermärken ovanpå den.
  const toppNod = new Container()
  const tg = new Graphics()
  toppDef.rita(tg, p, m)
  toppNod.addChild(tg)
  toppNod.position.set(0, toppDef.bak ? m.axelY - 16 : m.topY)
  bak.addChild(toppNod)

  // Armarna: egen nod med pivån i axeln, så en vinkning är en rotation.
  const armar = [-1, 1].map((s) => {
    const arm = new Container()
    arm.position.set(s * m.bredd * 0.84, m.axelY)
    const ag = new Graphics()
    ag.moveTo(0, 0).quadraticCurveTo(s * 34, 18, s * 52, 48).stroke({ width: 17, color: p.c, cap: 'round' })
    ag.circle(s * 52, 48, 13).fill(p.l).stroke({ width: 4, color: p.d })
    arm.addChild(ag)
    arm.pivot.set(0, 0)
    return arm
  })
  bak.addChild(armar[0], armar[1])

  const bg = new Graphics()
  kropp.rita(bg, p)
  fram.addChild(bg)

  // Mönstret ritas i kroppens breda mittparti — mätt mot varje kropps `bredd`, så
  // ränderna aldrig sticker ut utanför silhuetten.
  if (farg.m !== 'ingen') {
    const mg = new Graphics()
    if (farg.m === 'prickar') {
      for (const [px, py, pr] of [[-0.42, 0.16, 13], [0.4, 0.04, 11], [0.04, 0.44, 12], [-0.3, 0.66, 10], [0.4, 0.6, 11]]) {
        mg.circle(px * m.bredd, m.munY + py * 84, pr).fill({ color: p.d, alpha: 0.42 })
      }
    } else {
      for (const [ry, rw] of [[0.14, 0.6], [0.4, 0.56], [0.66, 0.44]]) {
        mg.roundRect(-rw * m.bredd, m.munY + ry * 84 - 9, rw * 2 * m.bredd, 18, 9).fill({ color: p.d, alpha: 0.36 })
      }
    }
    fram.addChild(mg)
  }

  const ogonNod = new Container()
  const og = new Graphics()
  OGON[cfg.ogon % OGON.length].rita(og, p)
  ogonNod.addChild(og)
  ogonNod.position.set(0, m.faceY)
  fram.addChild(ogonNod)

  const munNod = new Container()
  const mug = new Graphics()
  MUNNAR[cfg.mun % MUNNAR.length].rita(mug, p)
  munNod.addChild(mug)
  munNod.position.set(0, m.munY)
  fram.addChild(munNod)

  return { nod, ogonNod, munNod, toppNod, armar, m, p }
}

// Liten blobb — används av förhandsvisningarna för färg och storlek. Ett riktigt
// litet väsen med ögonprickar, inte en färgruta.
function ritaBlobb(g, p, r) {
  g.ellipse(0, r * 0.86, r * 0.9, r * 0.24).fill({ color: 0x000000, alpha: 0.12 })
  g.circle(0, 0, r).fill(sphereFill(p.c, SPH)).stroke({ width: 4, color: p.d })
  g.circle(-r * 0.3, -r * 0.12, r * 0.16).fill(p.ink)
  g.circle(r * 0.3, -r * 0.12, r * 0.16).fill(p.ink)
  g.moveTo(-r * 0.24, r * 0.3).quadraticCurveTo(0, r * 0.56, r * 0.24, r * 0.3).stroke({ width: 3.5, color: p.ink, cap: 'round' })
}

// Färgrutans klick: en ojämn målarklick med glans — en egen form, inte samma runda
// blobb som storleksrutan.
function ritaFargklick(g, p) {
  g.moveTo(-26, -6)
  g.quadraticCurveTo(-24, -26, -4, -26)
  g.quadraticCurveTo(10, -32, 20, -18)
  g.quadraticCurveTo(34, -10, 26, 6)
  g.quadraticCurveTo(30, 24, 10, 24)
  g.quadraticCurveTo(-6, 32, -16, 18)
  g.quadraticCurveTo(-30, 12, -26, -6)
  g.closePath().fill(sphereFill(p.c, SPH)).stroke({ width: 4, color: p.d })
  g.ellipse(-10, -12, 8, 5).fill({ color: COLORS.white, alpha: 0.4 })
  g.circle(24, 20, 5).fill(p.c).stroke({ width: 3, color: p.d })
}

export default {
  id: 'bygg-en-kompis',
  titleSv: 'Bygg en Kompis',
  icon: '👾',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'bygg-en-kompis',
  voiceIntro: 'Bygg en kompis! Tryck på pilarna och se vad som händer.',

  // ---- livscykel ---------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._idle = 0
    this._busTid = 0
    this._hintN = 0
    this._knappar = []
    this._rader = []
    this._ramar = []
    this._livTweens = []
    this._losa = [] // noder på väg ut med en DIREKT tween (fjäril, nedtagen ram)
    this._fjaril = null
    this._fjarilTl = null
    this._flashTl = null
    this._hintTween = null
    this._hintNod = null

    const spar = ctx.progress.get()
    this._niva = Math.max(0, spar.highestLevel | 0)
    this._galleri = (Array.isArray(spar.custom?.galleri) ? spar.custom.galleri : [])
      .slice(-MAX_RAMAR)
      .map((c) => this._rensaCfg(c))

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Botten som fångar tomma tryck: ett barn som trycker mitt i finishen ska få ett
    // kvitto, aldrig tystnad (P0 ÅTERKOPPLING / `dod-traffyta`).
    const botten = new Graphics().rect(-320, -220, 1920, 1160).fill({ color: COLORS.bg, alpha: 0.001 })
    botten.eventMode = 'static'
    botten.on('pointertap', (e) => {
      if (!this._alive) return
      this._idle = 0
      const pos = this._root.toLocal(e.global)
      kvittera(ctx.fxLayer, pos.x, pos.y, ctx.services.audio)
    })
    this._root.addChild(botten)

    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))

    this._byggVagg(ctx)
    this._byggGolv()
    this._byggVarelseNoder(ctx)
    this._byggKamera(ctx)
    for (const del of DELAR) this._byggRad(ctx, del)

    this._cfg = this._slumpaCfg()
    this._ritaVarelse(ctx, null)
    for (const del of DELAR) this._ritaPrev(del.key)
    this._ritaGalleri(ctx)
    this._planeraBlink(ctx)

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._busTid = 0
    ctx.services.voice.say(this.voiceIntro)
    bounceIn(this._vSkala, { duration: 0.5 })
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._slutaHint()
    this._fjarilTl?.kill()
    this._fjarilTl = null
    this._flashTl?.kill()
    this._flashTl = null
    for (const tw of this._livTweens || []) tw?.kill()
    this._livTweens = []
    this._bobo?.destroy()
    this._bobo = null
    for (const knapp of this._knappar || []) {
      if (knapp && !knapp.destroyed) {
        gsap.killTweensOf(knapp.scale)
        gsap.killTweensOf(knapp)
      }
    }
    this._knappar = []
    // `_losa` är noder på väg ut med en DIREKT tween (x/y/alpha) — en kvarlevande
    // sådan skriver på en riven transform varje bildruta efter exit (Pixi v8 nollar
    // _position i destroy).
    for (const nod of [this._vGrund, this._vSkala, this._vSnurr, this._vLiv, this._kamKonst, this._blixtG, this._skugga, this._fjaril, ...(this._losa || [])]) {
      if (nod && !nod.destroyed) {
        gsap.killTweensOf(nod)
        gsap.killTweensOf(nod.scale)
      }
    }
    for (const ram of this._ramar || []) {
      if (ram?.nod && !ram.nod.destroyed) {
        gsap.killTweensOf(ram.nod)
        gsap.killTweensOf(ram.nod.scale)
      }
      if (ram?.spik && !ram.spik.destroyed) {
        gsap.killTweensOf(ram.spik)
        gsap.killTweensOf(ram.spik.scale)
      }
      if (ram?.kompis?.nod && !ram.kompis.nod.destroyed) {
        ram.kompis.nod._fxLiv?.kill()
        gsap.killTweensOf(ram.kompis.nod)
        for (const arm of ram.kompis.armar || []) gsap.killTweensOf(arm)
      }
    }
    this._ramar = []
    for (const rad of this._rader || []) {
      if (rad?.konst && !rad.konst.destroyed) gsap.killTweensOf(rad.konst)
    }
    this._rader = []
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
  },

  // ---- scenens fasta delar ------------------------------------------------

  // Bildväggen: en tapetserad panel med en list under. Panelen bär BARA ramarna
  // (som är riktiga föremål med egen silhuett) — inga spelobjekt ligger i rutor.
  _byggVagg() {
    const vagg = new Container()
    vagg.eventMode = 'none'
    const g = new Graphics()
    g.roundRect(168, 4, 876, 152, 26).fill(0xf6e7cd).stroke({ width: 5, color: 0xd9bd97 })
    for (let x = 190; x < 1030; x += 34) {
      g.roundRect(x, 14, 5, 132, 3).fill({ color: 0xe4cfae, alpha: 0.75 })
    }
    g.roundRect(168, 138, 876, 18, 9).fill(0xc79a6b)
    g.roundRect(168, 138, 876, 6, 3).fill({ color: 0xe0b98a, alpha: 0.8 })
    vagg.addChild(g)
    this._root.addChild(vagg)
    this._vaggNod = vagg
  },

  // Golvet under varelsen: en mjuk skugga som ligger STILL medan varelsen guppar
  // (en skugga som guppar med föremålet slutar läsa som mark).
  _byggGolv() {
    const skugga = new Graphics().ellipse(VX, VY + 8, 118, 26).fill({ color: 0x6b4a2a, alpha: 0.18 })
    skugga.eventMode = 'none'
    this._root.addChild(skugga)
    this._skugga = skugga
  },

  // Varelsens nodkedja. Varje nivå äger EN transform, så snurr, hopp och vilogupp
  // aldrig skriver över varandra:
  //   _vGrund (fotpunkt) → _vSkala (storlek + hopp) → _vSnurr (rotation) → _vLiv (gupp)
  _byggVarelseNoder() {
    this._vGrund = new Container()
    this._vGrund.position.set(VX, VY)
    this._vSkala = new Container()
    this._vSnurr = new Container()
    this._vSnurr.pivot.set(0, -110)
    this._vSnurr.position.set(0, -110)
    this._vLiv = new Container()
    this._vGrund.addChild(this._vSkala)
    this._vSkala.addChild(this._vSnurr)
    this._vSnurr.addChild(this._vLiv)
    this._root.addChild(this._vGrund)
    this._sparaLiv(liv(this._vLiv, { bob: 5, sway: 0.015, duration: 2.8 }))
  },

  // Kameran på stativ + Bobo som tittar fram bakom den. HELA gruppen är knappen —
  // ett barn som siktar på Bobo träffar också rätt.
  _byggKamera(ctx) {
    const grupp = new Container()
    grupp.position.set(KAM_X, KAM_Y)
    const konst = new Container() // allt som animeras ligger HÄR, aldrig på gruppen
    konst.eventMode = 'none'
    grupp.addChild(konst)

    const stativ = new Graphics()
    for (const [bx, by] of [[-58, 176], [56, 176], [10, 152]]) {
      stativ.moveTo(0, 6).lineTo(bx, by).stroke({ width: 11, color: 0x8a5a3b, cap: 'round' })
      stativ.circle(bx, by, 8).fill(0x6f4a2e)
    }
    stativ.circle(0, 4, 13).fill(0x6f4a2e)
    konst.addChild(stativ)

    this._bobo = makeKaraktar({ r: 40, kropp: false })
    this._bobo.view.position.set(34, -136)
    konst.addChild(this._bobo.view)

    const hus = new Graphics()
    hus.roundRect(-58, -86, 132, 94, 18).fill(0x4d4d5e).stroke({ width: 5, color: 0x2c2c39 })
    hus.roundRect(-48, -78, 60, 22, 9).fill({ color: COLORS.white, alpha: 0.12 })
    hus.roundRect(-96, -62, 44, 48, 12).fill(0x3a3a4a).stroke({ width: 5, color: 0x2c2c39 })
    hus.circle(-92, -38, 21).fill(sphereFill(0x6ad0ff, SPH)).stroke({ width: 5, color: 0x2c2c39 })
    hus.circle(-98, -46, 6).fill({ color: COLORS.white, alpha: 0.75 })
    hus.circle(46, -70, 13).fill(COLORS.red).stroke({ width: 4, color: 0xc44a4a })
    konst.addChild(hus)

    // Bobos tassar över kamerahusets kant. Utan dem svävar huvudet ovanför kameran som
    // en lös boll — tassarna binder ihop honom med föremålet han står bakom.
    const tassar = new Graphics()
    for (const [tx, ty] of [[-34, -84], [58, -78]]) {
      tassar.circle(tx, ty, 13).fill(COLORS.cream).stroke({ width: 4, color: 0xe0cba8 })
      tassar.circle(tx, ty - 3, 6).fill({ color: 0xf2e2c4, alpha: 0.8 })
    }
    tassar.eventMode = 'none'
    konst.addChild(tassar)

    // Blixten sitter överst och är den som lyser när kortet tas.
    const blixt = new Graphics()
    blixt.roundRect(-34, -112, 54, 24, 9).fill(0xe7dcc6).stroke({ width: 4, color: 0x9e9078 })
    blixt.circle(-7, -100, 12).fill(0xfff3b0)
    konst.addChild(blixt)
    this._blixtG = blixt

    const skylt = new Graphics()
    skylt.roundRect(-56, 96, 112, 46, 14).fill(COLORS.cream).stroke({ width: 5, color: COLORS.brown })
    konst.addChild(skylt)
    const txt = new Text({ text: 'Klar!', style: { fontFamily: FONT.title, fontSize: 28, fontWeight: '800', fill: COLORS.brown } })
    txt.anchor.set(0.5)
    txt.position.set(0, 119)
    txt.eventMode = 'none'
    konst.addChild(txt)

    grupp.eventMode = 'static'
    grupp.cursor = 'pointer'
    grupp.interactiveChildren = false
    // 204×350 träffyta som slutar 24 px från högerkolumnens vänsterpil (P0-avstånd).
    grupp.hitArea = new Rectangle(-108, -196, 204, 350)
    grupp.on('pointertap', () => this._fotografera(ctx))
    this._root.addChild(grupp)
    this._kamera = grupp
    this._kamKonst = konst
    this._knappar.push(grupp)
  },

  // En kontrollrad: två stora pilar med delens egen färg och en levande
  // förhandsvisning emellan (ritad del, inte ikon i ruta).
  _byggRad(ctx, del) {
    const kol = del.kol === 'v' ? VAN : HOG
    const y = RAD_Y[del.rad]
    const rad = { key: del.key, del, konst: null }

    const gora = (x, ikon, riktning) => {
      // Ingen `services` skickas in med flit: knappens eget klick skulle konkurrera med
      // delens STÄMDA ton, som är hela poängen med ljudbilden här.
      const b = new Button({
        icon: ikon,
        width: 96,
        height: 96,
        radius: 30,
        iconSize: 42,
        color: del.farg,
        onTap: () => this._byt(ctx, del.key, riktning),
      })
      b.position.set(x, y)
      this._root.addChild(b)
      this._knappar.push(b)
      return b
    }
    rad.pilV = gora(kol.pil1, '◀', -1)
    rad.pilH = gora(kol.pil2, '▶', 1)

    // Förhandsvisningen är AVSIKTLIGT stum — men fick inte se ut som en knapp. Den bar
    // samma ring och sken som pilarna, och ett barn trycker då på den och får bara
    // skalets bottenkvitto. Att göra den tryckbar går INTE: pilarna står 94 px isär, så
    // mellan deras 144 px-halor finns bara 44 px — en knapp där kan varken bli 96 px
    // bred eller hålla 24 px avstånd (P0). Lösningen är alltså att sluta lova en knapp:
    // ingen ring, bara en svag skugga bakom delen, som en glugg i väggen.
    const prev = new Container()
    prev.position.set(kol.prev, y)
    prev.eventMode = 'none'
    const sken = new Graphics().circle(0, 1, 40).fill({ color: 0x000000, alpha: 0.05 })
    prev.addChild(sken)
    this._root.addChild(prev)
    rad.prev = prev
    this._rader.push(rad)
  },

  // ---- konfiguration och delbyten ----------------------------------------

  _antal(key) {
    let n = BAS[key]
    for (let i = 0; i < Math.min(this._niva, LAS_ORDNING.length); i++) {
      if (LAS_ORDNING[i] === key) n += 1
    }
    return Math.max(1, Math.min(n, TAK[key]))
  },

  _rensaCfg(c) {
    const v = (k, x) => {
      const n = Number.isFinite(x) ? Math.floor(x) : 0
      return ((n % TAK[k]) + TAK[k]) % TAK[k]
    }
    return {
      kropp: v('kropp', c?.kropp),
      ogon: v('ogon', c?.ogon),
      mun: v('mun', c?.mun),
      topp: v('topp', c?.topp),
      farg: v('farg', c?.farg),
      storlek: v('storlek', c?.storlek),
    }
  },

  _slumpaCfg() {
    const r = (k) => (Math.random() * this._antal(k)) | 0
    return { kropp: r('kropp'), ogon: r('ogon'), mun: r('mun'), topp: r('topp'), farg: r('farg'), storlek: 1 }
  },

  _delTon(ctx, key, idx) {
    const f = SKALA[(TON_BAS[key] + idx) % SKALA.length]
    ctx.services.audio.tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.26 })
    ctx.services.audio.tone({ freq: f * 2, dur: 0.12, type: 'sine', vol: 0.07, delay: 0.02 })
  },

  // Kompisens EGEN melodi: en ton per vald del, i skalan. Två olika kompisar låter
  // olika — det är samma val som syns i bilden, hört.
  _melodi(ctx, cfg, forsening = 0) {
    const ordning = ['kropp', 'ogon', 'mun', 'topp', 'farg']
    ordning.forEach((k, i) => {
      const f = SKALA[(TON_BAS[k] + cfg[k]) % SKALA.length]
      ctx.services.audio.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.24, delay: forsening + i * 0.13 })
    })
    const slut = SKALA[(TON_BAS.kropp + cfg.kropp) % SKALA.length] * 2
    ctx.services.audio.tone({ freq: slut, dur: 0.45, type: 'sine', vol: 0.22, delay: forsening + 0.68 })
  },

  _byt(ctx, key, riktning) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._slutaHint()
    const n = this._antal(key)
    const nasta = (((this._cfg[key] + riktning) % n) + n) % n
    this._cfg[key] = nasta
    this._delTon(ctx, key, nasta)
    this._ritaVarelse(ctx, key)
    // ALLA förhandsvisningar ritas om: de delar varelsens palett, så ett färgbyte
    // ska synas i varenda ruta — annars visar raderna en kompis som inte finns.
    for (const d of DELAR) this._ritaPrev(d.key)
    if (Math.random() < 0.14) ctx.services.voice.say(randomFrom(['Vad rolig den blev!', 'Oj, vilken fin kompis!', 'Titta vad du gör!']))
  },

  // Rita om varelsen. Hela figuren byggs om (det är 15 former, inte 1500) och den
  // BYTTA delen studsar in — så barnet ser exakt vad trycket gjorde.
  _ritaVarelse(ctx, bytt) {
    if (!this._alive || !this._vLiv || this._vLiv.destroyed) return
    // Sitter bus-fjärilen på huvudet blir den skrämd av förvandlingen och flyger —
    // den försvinner aldrig tyst mitt i bilden.
    if (this._fjaril) this._fjarilBort(ctx, false)
    for (const gammal of this._vLiv.removeChildren()) {
      gsap.killTweensOf(gammal)
      gsap.killTweensOf(gammal.scale)
      gammal.destroy({ children: true })
    }

    const v = byggVarelse(this._cfg)
    this._varelse = v
    this._vLiv.addChild(v.nod)

    const mal = STORLEKAR[this._cfg.storlek % STORLEKAR.length]
    if (bytt) {
      gsap.to(this._vSkala.scale, { x: mal, y: mal, duration: 0.28, ease: 'back.out(2)' })
      squash(this._vGrund, { intensity: 0.55 })
      const delNod = { kropp: v.nod, ogon: v.ogonNod, mun: v.munNod, topp: v.toppNod, farg: v.nod, storlek: v.nod }[bytt]
      if (delNod && delNod !== v.nod) bounceIn(delNod, { duration: 0.34 })
      this._blinka()
    } else {
      this._vSkala.scale.set(mal)
    }
  },

  // Förhandsvisningen i raden: samma ritfunktioner som varelsen använder, i litet.
  _ritaPrev(key) {
    const rad = this._rader.find((r) => r.key === key)
    if (!rad || !rad.prev || rad.prev.destroyed) return
    if (rad.konst && !rad.konst.destroyed) {
      rad.konst._fxLiv?.kill()
      gsap.killTweensOf(rad.konst)
      gsap.killTweensOf(rad.konst.scale)
      rad.konst.destroy({ children: true })
    }
    const p = palett(FARGER[this._cfg.farg % FARGER.length])
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()

    if (key === 'kropp') {
      KROPPAR[this._cfg.kropp % KROPPAR.length].rita(g, p)
      c.addChild(g)
      c.scale.set(0.29)
      c.position.set(0, 32)
    } else if (key === 'ogon' || key === 'mun') {
      // Ett litet ANSIKTE, inte en lös detalj: den del raden styr ritas i full styrka
      // och den andra blekt — annars läser mun-rutan som en ensam prick.
      g.circle(0, 0, 32).fill(sphereFill(p.c, SPH)).stroke({ width: 4, color: p.d })
      c.addChild(g)
      const svag = new Graphics()
      if (key === 'ogon') MUNNAR[this._cfg.mun % MUNNAR.length].rita(svag, p)
      else OGON[this._cfg.ogon % OGON.length].rita(svag, p)
      svag.scale.set(key === 'ogon' ? 0.4 : 0.34)
      svag.position.set(0, key === 'ogon' ? 15 : -13)
      svag.alpha = 0.4
      c.addChild(svag)
      const d = new Graphics()
      if (key === 'ogon') OGON[this._cfg.ogon % OGON.length].rita(d, p)
      else MUNNAR[this._cfg.mun % MUNNAR.length].rita(d, p)
      d.scale.set(key === 'ogon' ? 0.52 : 0.62)
      d.position.set(0, key === 'ogon' ? -8 : 8)
      c.addChild(d)
    } else if (key === 'topp') {
      const def = TOPPAR[this._cfg.topp % TOPPAR.length]
      const d = new Graphics()
      def.rita(d, p, KROPPAR[this._cfg.kropp % KROPPAR.length].m)
      d.scale.set(0.42)
      d.position.set(0, def.bak ? 4 : -6)
      c.addChild(d)
      g.circle(0, 14, 24).fill(sphereFill(p.c, SPH)).stroke({ width: 4, color: p.d })
      g.circle(-8, 12, 4).fill(p.ink)
      g.circle(8, 12, 4).fill(p.ink)
      c.addChild(g)
    } else if (key === 'farg') {
      // En färgklick, INTE en blobb till: färg- och storleksrutan låg bredvid varandra
      // och såg likadana ut i skärmdumpen.
      ritaFargklick(g, p)
      if (FARGER[this._cfg.farg % FARGER.length].m === 'prickar') {
        for (const [dx, dy] of [[-12, 8], [11, 6], [0, -13]]) g.circle(dx, dy, 5).fill({ color: p.d, alpha: 0.55 })
      } else if (FARGER[this._cfg.farg % FARGER.length].m === 'rander') {
        for (const ry of [-9, 2, 13]) g.roundRect(-18, ry, 36, 6, 3).fill({ color: p.d, alpha: 0.45 })
      }
      c.addChild(g)
    } else {
      // Den största storleken står kvar som en blek kontur, så steget SYNS.
      g.circle(0, 0, 28).stroke({ width: 3, color: p.d, alpha: 0.3 })
      ritaBlobb(g, p, 12 + this._cfg.storlek * 8)
      c.addChild(g)
    }

    rad.prev.addChild(c)
    rad.konst = c
    bounceIn(c, { duration: 0.3 })
    this._sparaLiv(liv(c, { bob: 3, sway: 0.05, duration: 2.1 + Math.random() * 0.8 }))
  },

  // ---- liv i varelsen -----------------------------------------------------

  // ⚠️ Blinkningen får ALDRIG köra ovanpå en studs. Den dödar tweens på `ogon.scale`
  // och tweenar bara `y` — startade den mitt i `bounceIn` (som börjar på skala 0) blev
  // ögonens scale.x kvar på 0 och HELA ansiktet var tomt, utan ett konsolfel. Hittades
  // i skärmdumpen, inte i koden. `_fxScaleBusy` sätts av feedback.js under studsen.
  _blinka() {
    const o = this._varelse?.ogonNod
    if (!o || o.destroyed || o._fxScaleBusy || o.scale.x < 0.99) return
    gsap.killTweensOf(o.scale)
    gsap.to(o.scale, {
      y: 0.1,
      duration: 0.07,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
      onComplete: () => {
        if (this._alive && o && !o.destroyed) o.scale.set(1, 1)
      },
    })
  },

  _planeraBlink(ctx) {
    ctx.later(1.6 + Math.random() * 3.2, () => {
      if (!this._alive) return
      this._blinka()
      this._planeraBlink(ctx)
    })
  },

  _vinka(styrka = 1) {
    const armar = this._varelse?.armar || []
    armar.forEach((arm, i) => {
      if (!arm || arm.destroyed) return
      const s = i === 0 ? -1 : 1
      gsap.killTweensOf(arm)
      gsap
        .timeline()
        .to(arm, { rotation: s * 1.1 * styrka, duration: 0.14, ease: 'back.out(2)' })
        .to(arm, { rotation: s * 0.6 * styrka, duration: 0.16 })
        .to(arm, { rotation: s * 1.1 * styrka, duration: 0.16 })
        .to(arm, { rotation: 0, duration: 0.26, ease: 'power2.inOut' })
    })
  },

  // Alla eviga tweens (repeat: -1) spåras för destroy. Listan RENSAS på färdiga/dödade
  // i stället för att kasta de äldsta: förhandsvisningarna byts sex åt gången vid varje
  // tryck, och den äldsta posten är varelsens egen andning som aldrig tar slut av sig
  // själv (samma fälla som fällde ansiktsriggen — se CLAUDE.md). `tw.parent` är måttet
  // som skiljer LEVANDE från DÖDAD.
  _sparaLiv(tw) {
    if (!tw) return tw
    if (this._livTweens.length > 64) this._livTweens = this._livTweens.filter((t) => t && t.parent)
    this._livTweens.push(tw)
    return tw
  },

  // ---- galleriet ----------------------------------------------------------

  // En ram är ett riktigt föremål: träram, passepartout, spik ovanför — och kompisen
  // står INUTI fotot, i sin egen storlek.
  _byggRam(ctx, cfg, slot) {
    const nod = new Container()
    nod.position.set(RAM_X[slot], RAM_Y)
    const g = new Graphics()
    g.roundRect(-58, -60, 116, 120, 12).fill(0xb5793f).stroke({ width: 5, color: 0x8a5a3b })
    g.roundRect(-48, -50, 96, 100, 7).fill(0xfff8e8)
    g.roundRect(-48, -50, 96, 26, 7).fill({ color: 0xffe9c0, alpha: 0.8 })
    nod.addChild(g)

    const kompis = byggVarelse(cfg)
    kompis.nod.scale.set(0.3)
    kompis.nod.position.set(0, 42)
    nod.addChild(kompis.nod)

    const glans = new Graphics()
    glans.moveTo(-48, 40).lineTo(-8, -50).lineTo(16, -50).lineTo(-24, 40).closePath().fill({ color: COLORS.white, alpha: 0.13 })
    nod.addChild(glans)

    nod.eventMode = 'static'
    nod.cursor = 'pointer'
    nod.interactiveChildren = false
    // Exakt ramens mått: 24 px mellan två ramars träffytor (P0), 116 px bred (≥96).
    nod.hitArea = new Rectangle(-58, -48, 116, 96) // 96 px hög (P0-minimum) → 24 px ner till RAD_Y[0]
    const ram = { nod, kompis, cfg, slot }
    nod.on('pointertap', () => this._klappaRam(ctx, ram))
    this._root.addChild(nod)
    this._sparaLiv(liv(kompis.nod, { bob: 2.5, sway: 0.02, duration: 2.4 + Math.random() * 1.2 }))
    return ram
  },

  // Tomma platser: en spik och en tunn konturruta så barnet ser att det finns plats
  // för fler kompisar (mjuk progression, utan en enda siffra).
  _ritaGalleri(ctx) {
    for (const ram of this._ramar || []) {
      ram.kompis?.nod?._fxLiv?.kill()
      if (ram.nod && !ram.nod.destroyed) {
        gsap.killTweensOf(ram.nod)
        ram.nod.destroy({ children: true })
      }
    }
    this._ramar = []
    if (this._tomma && !this._tomma.destroyed) this._tomma.destroy({ children: true })

    const tomma = new Graphics()
    tomma.eventMode = 'none'
    for (let i = this._galleri.length; i < MAX_RAMAR; i++) {
      const x = RAM_X[i]
      tomma.circle(x, RAM_Y - 74, 6).fill(0x9a8f7a)
      tomma.roundRect(x - 52, RAM_Y - 54, 104, 108, 10).stroke({ width: 4, color: 0xc9ab84, alpha: 0.65 })
    }
    this._root.addChild(tomma)
    this._tomma = tomma

    this._galleri.forEach((cfg, i) => {
      const ram = this._byggRam(ctx, cfg, i)
      this._ramar.push(ram)
      ram.spik = this._gorSpik(RAM_X[i])
    })
  },

  // Spiken ovanför en ram. Geometrin bakas i (0,0) och BEHÅLLAREN placeras — en bar
  // Graphics ritad i origo med en stor .position kan rendera som ett helskärmsband.
  _gorSpik(x) {
    const c = new Container()
    c.position.set(x, RAM_Y - 74)
    c.eventMode = 'none'
    const g = new Graphics()
    g.circle(0, 2, 6).fill({ color: 0x000000, alpha: 0.2 })
    g.circle(0, 0, 6).fill(0x7a6657)
    g.circle(-2, -2, 2).fill({ color: COLORS.white, alpha: 0.5 })
    c.addChild(g)
    this._root.addChild(c)
    return c
  },

  _klappaRam(ctx, ram) {
    if (!this._alive) return
    this._idle = 0
    this._slutaHint()
    this._vinkaRam(ram)
    this._melodi(ctx, ram.cfg, 0)
    sparkle(ctx.fxLayer, ram.nod.x, ram.nod.y, { count: 6 })
    if (Math.random() < 0.5) ctx.services.voice.say('Hej igen, gamla kompis!')
  },

  _vinkaRam(ram) {
    const k = ram?.kompis
    if (!k || !k.nod || k.nod.destroyed) return
    const arm = k.armar[1]
    if (arm && !arm.destroyed) {
      gsap.killTweensOf(arm)
      gsap
        .timeline()
        .to(arm, { rotation: 1.2, duration: 0.14, ease: 'back.out(2)' })
        .to(arm, { rotation: 0.7, duration: 0.14 })
        .to(arm, { rotation: 1.2, duration: 0.14 })
        .to(arm, { rotation: 0, duration: 0.24 })
    }
    if (ram.nod && !ram.nod.destroyed) pop(ram.nod, { scale: 1.09 })
  },

  // ---- finishen: levande kompis → blixt → ramen upp på väggen -------------

  _fotografera(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    this._slutaHint()
    this._satKnappar(false)
    if (this._fjaril) this._fjarilBort(ctx, false)

    ctx.services.voice.say('Nu blir din kompis levande!')
    ctx.services.audio.sfx('whoosh')
    this._bobo?.react('nyfiken')

    // Kompisen får liv: hopp, snurr (med KNAPP, aldrig med fingret — P0 GESTER),
    // vinkning och sin egen melodi.
    squash(this._vSkala, { intensity: 1, hop: 74 })
    gsap.to(this._vSnurr, { rotation: Math.PI * 2, duration: 0.85, ease: 'back.inOut(1.2)', onComplete: () => {
      if (this._alive && this._vSnurr && !this._vSnurr.destroyed) this._vSnurr.rotation = 0
    } })
    ctx.later(0.5, () => {
      if (!this._alive) return
      this._vinka(1)
      this._blinka()
    })
    this._melodi(ctx, this._cfg, 0.15)

    ctx.later(1.25, () => this._blixt(ctx))
  },

  _blixt(ctx) {
    if (!this._alive) return
    ctx.services.audio.tone({ freq: 1500, dur: 0.05, type: 'square', vol: 0.16 })
    ctx.services.audio.sfx('pling')
    if (this._blixtG && !this._blixtG.destroyed) pop(this._blixtG, { scale: 1.5 })
    if (this._kamKonst && !this._kamKonst.destroyed) {
      gsap.killTweensOf(this._kamKonst)
      gsap.to(this._kamKonst, { x: -7, duration: 0.06, yoyo: true, repeat: 3, onComplete: () => {
        if (this._alive && this._kamKonst && !this._kamKonst.destroyed) this._kamKonst.x = 0
      } })
    }

    // Vit blixt över hela den SYNLIGA ytan (ctx.view läses vid användning).
    const v = ctx.view
    const flash = new Graphics()
      .rect(v.left - 40, v.top - 40, v.width + 80, v.height + 80)
      .fill(COLORS.white)
    flash.alpha = 0
    flash.eventMode = 'none'
    this._root.addChild(flash)
    // Blixten tweenar ett vanligt objekt och rör Pixi-noden bara om den lever — den
    // kan alltså inte krascha om barnet lämnar spelet mitt i smällen.
    const st = { a: 0 }
    const skriv = () => {
      if (flash.destroyed) this._flashTl?.kill()
      else flash.alpha = st.a
    }
    this._flashTl?.kill()
    this._flashTl = gsap
      .timeline({
        onComplete: () => {
          this._flashTl = null
          if (!flash.destroyed) flash.destroy()
        },
      })
      .to(st, { a: 0.88, duration: 0.07, onUpdate: skriv })
      .to(st, { a: 0, duration: 0.42, onUpdate: skriv })

    burst(ctx.fxLayer, KAM_X - 92, KAM_Y - 38, { count: 10, power: 0.8 })
    ctx.later(0.45, () => this._hangUpp(ctx))
  },

  _hangUpp(ctx) {
    if (!this._alive) return
    const cfg = { ...this._cfg }

    // Är väggen full åker den äldsta ner (mjukt, med en liten puff) och de andra
    // glider ett steg åt vänster. Ingenting "försvinner" utan att synas.
    if (this._galleri.length >= MAX_RAMAR) {
      const gammal = this._ramar.shift()
      this._galleri.shift()
      if (gammal?.nod && !gammal.nod.destroyed) {
        gammal.kompis?.nod?._fxLiv?.kill()
        const nod = gammal.nod
        nod.eventMode = 'none'
        this._losa.push(nod)
        gsap.to(nod, {
          y: nod.y + 90,
          alpha: 0,
          rotation: -0.3,
          duration: 0.45,
          ease: 'power2.in',
          onComplete: () => {
            this._losa = (this._losa || []).filter((n) => n !== nod)
            if (!nod.destroyed) nod.destroy({ children: true })
          },
        })
      }
      if (gammal?.spik && !gammal.spik.destroyed) {
        gsap.killTweensOf(gammal.spik)
        gammal.spik.destroy({ children: true })
      }
      this._ramar.forEach((ram, i) => {
        ram.slot = i
        if (ram.nod && !ram.nod.destroyed) gsap.to(ram.nod, { x: RAM_X[i], duration: 0.4, ease: 'power2.inOut' })
        if (ram.spik && !ram.spik.destroyed) gsap.to(ram.spik, { x: RAM_X[i], duration: 0.4, ease: 'power2.inOut' })
      })
    }

    const slot = Math.min(this._galleri.length, MAX_RAMAR - 1)
    this._galleri.push(cfg)
    ctx.progress.setCustom('galleri', this._galleri)

    const ram = this._byggRam(ctx, cfg, slot)
    this._ramar.push(ram)
    // Fotografiet startar vid kompisen och flyger upp på väggen.
    ram.nod.position.set(VX, VY - 150)
    ram.nod.scale.set(0.45)
    ram.nod.eventMode = 'none'
    ctx.services.audio.sfx('whoosh')
    gsap
      .timeline({
        onComplete: () => {
          if (!this._alive) return
          this._spika(ctx, ram)
        },
      })
      .to(ram.nod, { x: RAM_X[slot], y: RAM_Y - 60, duration: 0.38, ease: 'power2.out' })
      .to(ram.nod.scale, { x: 1, y: 1, duration: 0.38, ease: 'back.out(1.6)' }, '<')
      .to(ram.nod, { y: RAM_Y, duration: 0.22, ease: 'power2.in' })
  },

  _spika(ctx, ram) {
    if (!this._alive) return
    // Spik-klonk: två korta låga toner — trä och metall, inte ett UI-klick.
    ctx.services.audio.tone({ freq: 190, dur: 0.09, type: 'square', vol: 0.2, slideTo: 120 })
    ctx.services.audio.tone({ freq: 900, dur: 0.06, type: 'triangle', vol: 0.1, delay: 0.02 })
    ram.spik = this._gorSpik(RAM_X[ram.slot])
    bounceIn(ram.spik, { duration: 0.3 })
    puff(ctx.fxLayer, RAM_X[ram.slot], RAM_Y - 70, { count: 6, color: 0xe4cfae })
    ripple(ctx.fxLayer, RAM_X[ram.slot], RAM_Y, { color: COLORS.white, maxR: 110, width: 5, alpha: 0.5 })
    if (ram.nod && !ram.nod.destroyed) {
      gsap
        .timeline()
        .to(ram.nod, { rotation: 0.12, duration: 0.1 })
        .to(ram.nod, { rotation: -0.06, duration: 0.12 })
        .to(ram.nod, { rotation: 0, duration: 0.18, ease: 'back.out(2)' })
    }
    this._bobo?.react('jubel')

    // Hela väggen vinkar till den nya kompisen.
    this._ramar.forEach((r, i) => {
      ctx.later(0.16 + i * 0.09, () => {
        if (this._alive) this._vinkaRam(r)
      })
    })

    ctx.later(0.5, () => {
      if (!this._alive) return
      this._niva += 1
      ctx.progress.setLevel(this._niva)
      ctx.progress.complete()
    })
    ctx.later(1.7, () => {
      if (!this._alive) return
      ctx.services.voice.say('Vilken fin kompis! Nu hänger den på väggen.')
    })
    ctx.later(2.7, () => this._nyRunda(ctx))
  },

  _nyRunda(ctx) {
    if (!this._alive) return
    const las = LAS_ORDNING[this._niva - 1]
    this._cfg = this._slumpaCfg()
    // Den nyupplåsta delen är förvald — barnet SER vad som är nytt utan ett ord text.
    if (las) this._cfg[las] = this._antal(las) - 1
    this._ritaVarelse(ctx, null)
    for (const del of DELAR) this._ritaPrev(del.key)
    bounceIn(this._vSkala, { duration: 0.5 })
    sparkle(ctx.fxLayer, VX, VY - 130, { count: 10 })
    this._satKnappar(true)
    this._resolving = false
    this._idle = 0
    this._busTid = 0

    if (las === 'topp') ctx.services.voice.say('Titta! Nu finns något nytt att sätta på huvudet!')
    else if (las === 'kropp') ctx.services.voice.say('Titta! Nu finns en ny kroppsform!')
    else if (las === 'ogon') ctx.services.voice.say('Titta! Nu finns nya ögon att välja!')
    else if (las === 'mun') ctx.services.voice.say('Titta! Nu finns en ny mun!')
    else if (las === 'farg') ctx.services.voice.say('Titta! Nu finns en ny färg att välja!')
    else ctx.services.voice.say('Nu bygger vi en ny kompis!')
  },

  _satKnappar(pa) {
    for (const k of this._knappar) {
      if (!k || k.destroyed) continue
      // Kameran tonas INTE ned — Bobo och stativet är scenografi under finishen och
      // ska se levande ut. Bara pekbarheten stängs av; tomma tryck får kvitto av
      // bottenytan (P0 ÅTERKOPPLING).
      if (k.setEnabled) k.setEnabled(pa)
      else k.eventMode = pa ? 'static' : 'none'
    }
    for (const ram of this._ramar) {
      if (ram?.nod && !ram.nod.destroyed) ram.nod.eventMode = pa ? 'static' : 'none'
    }
  },

  // ---- bus-fjärilen (P0 MOTGÅNG: rolig, med tak, alltid åtgärdbar) --------

  _slappFjaril(ctx) {
    if (!this._alive || this._resolving || this._fjaril || !this._varelse) return
    const m = this._varelse.m
    const f = new Container()
    f.position.set(430, -320)
    const vingar = [-1, 1].map((s) => {
      const v = new Container()
      const g = new Graphics()
      g.ellipse(s * 22, -12, 22, 17).fill({ color: 0xffd9f0, alpha: 0.95 }).stroke({ width: 3, color: 0xe07ab8 })
      g.ellipse(s * 18, 12, 17, 13).fill({ color: 0xffc2e6, alpha: 0.95 }).stroke({ width: 3, color: 0xe07ab8 })
      g.circle(s * 24, -12, 5).fill({ color: 0xe07ab8, alpha: 0.6 })
      v.addChild(g)
      f.addChild(v)
      return v
    })
    const kropp = new Graphics()
    kropp.roundRect(-5, -16, 10, 34, 5).fill(0x6b4a2e)
    kropp.circle(0, -18, 7).fill(0x6b4a2e)
    for (const s of [-1, 1]) {
      kropp.moveTo(s * 3, -22).quadraticCurveTo(s * 12, -34, s * 8, -40).stroke({ width: 2.5, color: 0x6b4a2e, cap: 'round' })
      kropp.circle(s * 8, -41, 3).fill(0x6b4a2e)
    }
    f.addChild(kropp)
    f.eventMode = 'static'
    f.cursor = 'pointer'
    f.interactiveChildren = false
    // r 70 i varelsens rymd: även på den MINSTA kompisen (0,78×) blir träffytan
    // 109 px bred, alltså över P0:s 96.
    f.hitArea = new Circle(0, -6, 70)
    f.on('pointertap', () => this._fjarilBort(ctx, true))
    // Fjärilen hänger i _vSkala, INTE i _vLiv: _vLiv rivs vid varje delbyte, och en
    // nod som förstörs mitt i sin egen flykttween skriver på en riven transform.
    this._vSkala.addChild(f)
    this._fjaril = f

    ctx.services.audio.tone({ freq: 660, dur: 0.1, type: 'sine', vol: 0.14, slideTo: 880 })
    const landY = m.topY - 34
    this._fjarilTl = gsap
      .timeline()
      .to(f, { x: 210, y: -300, rotation: -0.2, duration: 0.5, ease: 'sine.inOut' })
      .to(f, { x: 90, y: landY - 60, rotation: 0.15, duration: 0.5, ease: 'sine.inOut' })
      .to(f, { x: 0, y: landY, rotation: 0, duration: 0.4, ease: 'power2.out' })
      .add(() => {
        if (this._alive) ctx.services.audio.tone({ freq: 520, dur: 0.12, type: 'sine', vol: 0.12 })
      })
    // Vingslag hela tiden — och den flyger vidare av sig själv, den kan aldrig fastna.
    // Exit-säkert mönster (som lib/feedback.js): tweena ett vanligt objekt och skriv
    // bara till Pixi-noden om den lever. En repeat:-1-tween direkt på en `scale` som
    // rivs vid nästa delbyte skriver annars på en förstörd transform varje bildruta.
    for (const v of vingar) {
      const st = { s: 1 }
      const tw = gsap.to(st, {
        s: 0.5,
        duration: 0.22,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        onUpdate: () => {
          if (v.destroyed) tw.kill()
          else v.scale.x = st.s
        },
      })
      this._sparaLiv(tw)
    }
    ctx.later(9, () => this._fjarilBort(ctx, false))
  },

  _fjarilBort(ctx, klappad) {
    const f = this._fjaril
    if (!f || f.destroyed) {
      this._fjaril = null
      return
    }
    this._fjaril = null
    this._fjarilTl?.kill()
    this._fjarilTl = null
    this._busTid = 0
    if (klappad) {
      this._idle = 0
      ctx.services.audio.sfx('pop')
      ctx.services.audio.tone({ freq: 990, dur: 0.14, type: 'sine', vol: 0.16, slideTo: 1320 })
      const glob = f.getGlobalPosition ? f.toGlobal({ x: 0, y: 0 }) : null
      const fx = glob ? ctx.fxLayer.toLocal(glob) : { x: VX, y: VY - 200 }
      sparkle(ctx.fxLayer, fx.x, fx.y, { count: 8 })
      this._vinka(0.7)
      if (Math.random() < 0.6) ctx.services.voice.say('Hejdå, lilla fjäril!')
    }
    this._losa.push(f)
    gsap.to(f, {
      x: f.x + 320,
      y: f.y - 260,
      rotation: 0.4,
      alpha: 0,
      duration: 0.7,
      ease: 'power1.in',
      onComplete: () => {
        this._losa = (this._losa || []).filter((n) => n !== f)
        if (!f.destroyed) f.destroy({ children: true })
      },
    })
  },

  // ---- puls, idle och om-cue ---------------------------------------------

  _update(ctx, tk) {
    if (!this._alive || this._resolving) return
    const dt = tk.deltaMS / 1000
    this._idle += dt
    this._busTid += dt

    if (this._busTid > BUS_S && !this._fjaril) this._slappFjaril(ctx)

    if (this._idle > HINT_S) {
      this._idle = 0
      this._hintN += 1
      this._slutaHint()
      if (this._hintN % 2 === 1) {
        ctx.services.voice.say('Tryck på en pil så byter din kompis utseende!')
        const rad = randomFrom(this._rader)
        if (rad?.pilH && !rad.pilH.destroyed) {
          this._hintNod = rad.pilH
          this._hintTween = breathe(rad.pilH, { scale: 1.12, duration: 0.7 })
        }
        if (rad?.konst && !rad.konst.destroyed) pop(rad.konst)
      } else {
        ctx.services.voice.say('Tryck på kameran när din kompis är klar!')
        if (this._kamera && !this._kamera.destroyed) {
          this._hintNod = this._kamKonst
          this._hintTween = breathe(this._kamKonst, { scale: 1.06, duration: 0.8 })
        }
        this._bobo?.react('hej')
      }
    }
  },

  _slutaHint() {
    if (this._hintTween) {
      this._hintTween.kill()
      this._hintTween = null
    }
    const n = this._hintNod
    if (n && !n.destroyed) {
      gsap.killTweensOf(n.scale)
      n.scale.set(1)
    }
    this._hintNod = null
  },
}
