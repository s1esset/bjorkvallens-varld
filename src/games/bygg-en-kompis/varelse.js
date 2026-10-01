// varelse.js — kompisens RITNING och dess egen RIGG.
//
// Två läsare sedan 2026-10-01 (LYFTPLAN §10, Spår F):
//   1. bygg-en-kompis själv — verkstan bygger, byter delar och hänger upp fotot.
//   2. ANDRA spel — barnets sparade kompisar (galleriet) lånas ut via `lib/egnafigurer.js`.
// Därför bor ritningen, delarnas tabeller, saneringen och melodin här och inte i index.js:
// en kompis ska se ut och låta exakt likadant var den än står.
//
// RIGGEN (`Kompis`) är en egen klass, byggd efter knyttets förebild (`unika-knytt/knytt.js`):
//   · allt liv drivs i `tick()` — andning, blink, blick, skutt, vinkning, tugga — och summeras
//     i EN `_apply()`. Inga tweens alls, alltså ingen spöktween som överlever en rivning och
//     ingen `killTweensOf(roten)`-fälla för armar och ögon en nivå in (CLAUDE.md).
//   · nodträdet: view (anroparens: position, skala, alfa) > liv (riggens: y, skala, lutning)
//     > skal (storleken ur cfg) > varelsens nod. En ägare per transform.
//   · origo = fötterna, som i verkstan.
// Verkstan själv använder INTE riggen — den driver sin figur med egna tweens (blink, vinkning,
// kittling, bytesstudsar). Riggen är till för kompisar som står i ett annat spel.
import { Container, Graphics, Point } from 'pixi.js'
import { sphereFill } from '../../lib/form.js'
import { COLORS, shade, tint } from '../../lib/theme.js'

export const SPH = { dark: 0.24, highlight: 0.3, spread: 0.6 }

// --- KROPPAR ---------------------------------------------------------------
// Alla ritas i varelsens egen rymd: y = 0 är golvet, allt annat är negativt uppåt.
// `m` är formens fästpunkter — var ögonen sitter, var munnen sitter, var prydnaden
// fäster, var axlarna är. Utan dem hade varje ny kroppsform krävt ny kod i varje
// annan del; nu är en kropp fem rader data plus en ritfunktion.
//
// `klang` är kroppens MATERIAL, hörd: övertonen som läggs ovanpå delens stämda ton när
// något byts. Klotet är mjukt (ren oktav), klossen är trä (en låg fyrkant en oktav ner),
// molnet luftigt (ett svep uppåt). Grundtonen är alltid densamma — det är bara färgen
// på klangen som byter, så melodin i bygget står kvar.
export const KROPPAR = [
  {
    id: 'klot',
    klang: { type: 'sine', ratio: 2, vol: 0.075, dur: 0.2 },
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
    klang: { type: 'sine', ratio: 3, vol: 0.055, dur: 0.16 },
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
    klang: { type: 'square', ratio: 0.5, vol: 0.06, dur: 0.09 },
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
    klang: { type: 'triangle', ratio: 4, vol: 0.045, dur: 0.12 },
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
    klang: { type: 'sine', ratio: 1.5, vol: 0.07, dur: 0.28, slide: 2.5 },
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
    klang: { type: 'triangle', ratio: 1.5, vol: 0.07, dur: 0.26 },
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
// Varje ritfunktion tar en BLICK: `{ x, y }` i −1…1, där −1 är åt vänster/uppåt.
// Blicken byter bara var pupillen sitter, aldrig hur ögat är byggt — så samma kod
// ritar både vilan och "kompisen tittar på knappen du tryckte".
//
// ⚠️ Förskjutningen måste klampas som en VEKTOR. Läggs x och y på var för sig kryper
// pupillen ut ur ögonvitan så fort blicken pekar snett (10 px + 11 px = 14,9 px från
// mitten i ett öga som bara rymmer 10) — och en pupill utanför sitt öga är inte en
// blick, det är en bugg som ser ut som en design.
export function blick(look, max, bx = 0, by = 0) {
  const lx = look?.x || 0
  const ly = look?.y || 0
  const d = Math.hypot(lx, ly)
  const k = d > 1 ? 1 / d : 1
  return { x: bx + lx * k * max, y: by + ly * k * max }
}

export const OGON = [
  {
    id: 'tva',
    rita(g, p, look) {
      for (const s of [-1, 1]) {
        const q = blick(look, 8, s * 2, 3)
        g.circle(s * 34, 0, 23).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(s * 34 + q.x, q.y, 11).fill(p.ink)
        g.circle(s * 34 + q.x - 4, q.y - 6, 4.5).fill(COLORS.white)
      }
    },
  },
  {
    id: 'stort',
    rita(g, p, look) {
      const q = blick(look, 14, 1, 3)
      g.circle(0, -2, 36).fill(COLORS.white).stroke({ width: 5, color: p.d })
      g.circle(q.x, q.y, 17).fill(p.ink)
      g.circle(q.x - 8, q.y - 11, 7).fill(COLORS.white)
    },
  },
  {
    id: 'tre',
    rita(g, p, look) {
      const q = blick(look, 5, 1, 2)
      for (const [ex, ey] of [[-40, 2], [0, -20], [40, 2]]) {
        g.circle(ex, ey, 16).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(ex + q.x, ey + q.y, 8).fill(p.ink)
        g.circle(ex + q.x - 4, ey + q.y - 5, 3).fill(COLORS.white)
      }
    },
  },
  {
    id: 'skaft',
    // Skaftögonen SVÄNGER med blicken: hela ögonklotet (och skaftets spets) flyttas,
    // och pupillen rör sig lite till inuti. Ett skaft som står blickstilla medan
    // pupillen glider ser ut som en glasögonbåge, inte som ett djur som tittar.
    rita(g, p, look) {
      const sx = (look?.x || 0) * 8
      const sy = (look?.y || 0) * 7
      for (const s of [-1, 1]) {
        const q = blick(look, 6, s * 1.5, 2)
        g.moveTo(s * 18, 22).quadraticCurveTo(s * 30 + sx * 0.4, -10 + sy * 0.4, s * 40 + sx, -40 + sy)
        g.stroke({ width: 8, color: p.d, cap: 'round' })
        g.circle(s * 42 + sx, -50 + sy, 18).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(s * 42 + sx + q.x, -50 + sy + q.y, 8).fill(p.ink)
        g.circle(s * 42 + sx + q.x - 4, -50 + sy + q.y - 6, 3.5).fill(COLORS.white)
      }
    },
  },
  // --- upplåsbara ---
  {
    id: 'glasogon',
    rita(g, p, look) {
      for (const s of [-1, 1]) {
        const q = blick(look, 7, s * 2, 2)
        g.circle(s * 36, 0, 21).fill(COLORS.white)
        g.circle(s * 36 + q.x, q.y, 10).fill(p.ink)
        g.circle(s * 36 + q.x - 4, q.y - 6, 4).fill(COLORS.white)
        g.circle(s * 36, 0, 26).stroke({ width: 6, color: 0x4a3526 })
      }
      g.moveTo(-10, 0).lineTo(10, 0).stroke({ width: 6, color: 0x4a3526 })
    },
  },
  {
    id: 'somnig',
    // Ögonlocket måste vara MÖRKARE än kroppen. Första utkastet fyllde locket med
    // kroppsfärgen och ögonen försvann helt i silhuetten — syntes bara i skärmdumpen.
    // Locket täcker övre halvan, så pupillen får bara röra sig i den NEDRE: en blick
    // uppåt skulle annars gömma hela pupillen bakom locket och ögat se tomt ut.
    rita(g, p, look) {
      for (const s of [-1, 1]) {
        const q = blick(look, 6, 2, 8)
        const py = Math.max(3, Math.min(12, q.y))
        g.circle(s * 34, 0, 22).fill(COLORS.white).stroke({ width: 4, color: p.d })
        g.circle(s * 34 + q.x, py, 9).fill(p.ink)
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
export const MUNNAR = [
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
export const TOPPAR = [
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
    //
    // Spännvidden var 150 och satt mot kamerans STATIV — men kamerans träffyta börjar
    // på x 704, långt till vänster om stativets ben, och 150 × 1,12 lade spetsen på
    // x 708. Ett barn som siktade på vingspetsen på den största kompisen tog alltså
    // kortet i stället för att kittla den. Uppmätt med riktiga muspekningar, inte
    // räknat i huvudet. 142 lägger spetsen på x 699 — utanför kamerans yta i alla tre
    // storlekarna — och skillnaden i bild är 5 %.
    rita(g, p) {
      for (const s of [-1, 1]) {
        g.moveTo(0, 10)
        g.quadraticCurveTo(s * 84, -94, s * 142, -40)
        g.quadraticCurveTo(s * 114, 34, 0, 34)
        g.closePath().fill({ color: tint(p.c, 0.5), alpha: 0.95 }).stroke({ width: 5, color: p.d })
        g.moveTo(s * 18, 6).quadraticCurveTo(s * 72, -40, s * 125, -34).stroke({ width: 3.5, color: p.d, alpha: 0.7 })
        g.moveTo(s * 18, 18).quadraticCurveTo(s * 68, -6, s * 114, 2).stroke({ width: 3.5, color: p.d, alpha: 0.5 })
        g.moveTo(s * 18, 26).quadraticCurveTo(s * 61, 18, s * 91, 26).stroke({ width: 3, color: p.d, alpha: 0.35 })
      }
    },
  },
]

// --- FÄRG + MÖNSTER --------------------------------------------------------
export const FARGER = [
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

export const STORLEKAR = [0.78, 0.94, 1.12]

export const TAK = { kropp: KROPPAR.length, ogon: OGON.length, mun: MUNNAR.length, topp: TOPPAR.length, farg: FARGER.length, storlek: STORLEKAR.length }

// Palett ur den valda färgen. En egen liten funktion så varje ritfunktion får samma
// tre toner (grundfärg, mörk kant, ljus mage) utan att räkna om dem.
export function palett(farg) {
  return { c: farg.c, d: shade(farg.c, 0.3), l: tint(farg.c, 0.5), ink: 0x3b2a20 }
}

// Bygg en hel varelse ur en konfiguration. Returnerar noderna som spelet vill
// animera var för sig (ögonen blinkar, armarna vinkar, delen som byttes studsar).
export function byggVarelse(cfg, look) {
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
  OGON[cfg.ogon % OGON.length].rita(og, p, look)
  ogonNod.addChild(og)
  ogonNod.position.set(0, m.faceY)
  fram.addChild(ogonNod)

  const munNod = new Container()
  const mug = new Graphics()
  MUNNAR[cfg.mun % MUNNAR.length].rita(mug, p)
  munNod.addChild(mug)
  munNod.position.set(0, m.munY)
  fram.addChild(munNod)

  return { nod, ogonNod, ogonG: og, munNod, toppNod, armar, m, p }
}

// Rita om BARA ögonen med en ny blick. Det är sex cirklar i en enda Graphics — billigt
// nog att göra per bildruta under en blickglidning, och det rör varken ögonnodens skala
// (som blinkningen äger) eller resten av figuren.
export function ritaOgon(g, cfg, p, look) {
  if (!g || g.destroyed) return
  g.clear()
  OGON[cfg.ogon % OGON.length].rita(g, p, look)
}

// --- LJUD ------------------------------------------------------------------
// Pentaton skala i C — varje del har sin egen startpunkt, så samma knapp ger alltid
// samma tonhöjd och bygget blir en melodi i stället för en rad blip. Stämda toner,
// aldrig ett generiskt UI-klick (se CLAUDE.md "Byt inte ut stämda ljud").
export const SKALA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]
export const TON_BAS = { kropp: 0, ogon: 2, mun: 4, topp: 5, farg: 6, storlek: 1 }

// Kompisens EGEN melodi: en ton per vald del, i skalan, och kroppens ton en oktav upp som
// slut. Två olika kompisar låter olika — det är dess röst, i verkstan och i andra spel.
export function spelaMelodi(audio, cfg, forsening = 0) {
  if (!audio?.tone || !cfg) return
  const ordning = ['kropp', 'ogon', 'mun', 'topp', 'farg']
  ordning.forEach((k, i) => {
    const f = SKALA[(TON_BAS[k] + cfg[k]) % SKALA.length]
    audio.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.24, delay: forsening + i * 0.13 })
  })
  const slut = SKALA[(TON_BAS.kropp + cfg.kropp) % SKALA.length] * 2
  audio.tone({ freq: slut, dur: 0.45, type: 'sine', vol: 0.22, delay: forsening + 0.68 })
}

// --- SANERING ----------------------------------------------------------------
// En sparad cfg ur galleriet: varje fält ett heltal inom sin tabell, allt annat kastas.
// `progress.get()` ger en levande referens — svaret är alltid ett NYTT objekt.
export function rensaCfg(c) {
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
}

// --- RIGGEN ------------------------------------------------------------------

const TAU = Math.PI * 2
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const tal = (v, reserv) => (typeof v === 'number' && Number.isFinite(v) ? v : reserv)
// Exponentiell närmning, oberoende av bildrutetakt (samma resa på 20 fps som på 60).
const naerma = (nu, mal, k, dt) => nu + (mal - nu) * (1 - Math.exp(-k * dt))

const SKUTT_S = 0.34 // ett skutt, upp och ner
const SKUTT_H = 30 // px i varelsens rymd, före storleken
const VINK_S = 1.25
const JUBEL_S = 1.6
const HEJA_S = 0.7
const TUGG_S = 0.95
const BLINK_S = 0.15
// Hur långt bort ett mål ska vara för full blick, i varelsens rymd (kroppen är ~200 px hög).
const BLICK_R = 260

export class Kompis {
  /**
   * @param cfg   en kompis ur galleriet ({ kropp, ogon, mun, topp, farg, storlek }) — saneras
   * @param opts  { audio, skugga = true }
   */
  constructor(cfg, opts = {}) {
    this._alive = true
    this.cfg = rensaCfg(cfg)
    this._ljud = opts.audio || null
    this._bas = STORLEKAR[this.cfg.storlek]
    this._v = byggVarelse(this.cfg, { x: 0, y: 0 })
    this._m = this._v.m
    this._fas = Math.random() * TAU

    this.view = new Container()
    this.view.eventMode = 'none'
    this.view.interactiveChildren = false
    this._skugga = null
    if (opts.skugga !== false) {
      // Kontaktskuggan står kvar på marken när kompisen skuttar — därför utanför `liv`.
      this._skugga = new Graphics()
        .ellipse(0, -2, this._m.bredd * 0.98 * this._bas, 13 * this._bas)
        .fill({ color: COLORS.shadow, alpha: 0.16 })
      this.view.addChild(this._skugga)
    }
    this._liv = new Container()
    this._skal = new Container()
    this._skal.scale.set(this._bas)
    this._skal.addChild(this._v.nod)
    this._liv.addChild(this._skal)
    this.view.addChild(this._liv)

    // Måtten i view-rymden (före anroparens skala), lästa ur den RITADE figuren — prydnaden
    // och vingarna räknas med, och armarna i viloläge.
    const b = this._v.nod.getLocalBounds()
    const bas = this._bas
    this.matt = {
      topp: b.minY * bas,
      vanster: b.minX * bas,
      hoger: b.maxX * bas,
      ansikte: this._m.faceY * bas,
      mun: this._m.munY * bas,
      axel: this._m.axelY * bas,
    }

    this._pt = new Point()
    this._pt2 = new Point()
    this._t = 0
    this._blick = { x: 0, y: 0 }
    this._blickMal = { x: 0, y: 0 }
    this._blickT = 1 + Math.random() * 2
    this._ritad = { x: 0, y: 0 }
    this._blinkT = 1.2 + Math.random() * 2.5
    this._blinkFas = -1
    this._skuttKvar = 0
    this._skuttFas = 0
    this._skuttAktiv = false
    this._landa = 0
    this._vinkKvar = 0
    this._jubelKvar = 0
    this._hejaKvar = 0
    this._tuggKvar = 0
    this._armRot = [0, 0]
  }

  /** Ett eller flera skutt. */
  hoppa(n = 1) {
    if (!this._alive || this.view.destroyed) return this
    this._skuttKvar = Math.max(this._skuttKvar, Math.max(1, Math.round(n)))
    if (!this._skuttAktiv) {
      this._skuttAktiv = true
      this._skuttFas = 0
    }
    return this
  }

  /** Vinkar med högerarmen. */
  vinka() {
    if (!this._alive || this.view.destroyed) return this
    this._vinkKvar = VINK_S
    return this
  }

  /** Halvt jubel: armarna halvvägs upp och ett skutt. */
  heja() {
    if (!this._alive || this.view.destroyed) return this
    this._hejaKvar = HEJA_S
    return this.hoppa(1)
  }

  /** Stort jubel: båda armarna upp, två skutt — och sin egen melodi. */
  jubla() {
    if (!this._alive || this.view.destroyed) return this
    this._jubelKvar = JUBEL_S
    this.hoppa(2)
    this.sjung()
    return this
  }

  /** Mumsar: munnen tuggar tre gånger. */
  tugga() {
    if (!this._alive || this.view.destroyed) return this
    this._tuggKvar = TUGG_S
    this._ljud?.tone?.({ freq: 392, dur: 0.08, type: 'triangle', vol: 0.1 })
    return this
  }

  /** Sjunger sin egen melodi (bara om riggen fick `audio`). */
  sjung(forsening = 0) {
    if (!this._alive || this.view.destroyed) return this
    spelaMelodi(this._ljud, this.cfg, forsening)
    return this
  }

  /**
   * En bildruta. `mal` = en punkt i VIEW-FÖRÄLDERNS rum som ögonen följer (som knyttets
   * `tick(dt, pekare)`), eller null — då tittar kompisen sig omkring av sig själv.
   */
  tick(dtMS, mal) {
    if (!this._alive || this.view.destroyed) return
    const dt = klamp(tal(dtMS, 16) / 1000, 0, 0.05)
    this._t += dt

    this._blicka(dt, mal)

    if (this._blinkFas >= 0) {
      this._blinkFas += dt / BLINK_S
      if (this._blinkFas >= 1) this._blinkFas = -1
    } else {
      this._blinkT -= dt
      if (this._blinkT <= 0) {
        this._blinkT = 1.6 + Math.random() * 3.2
        this._blinkFas = 0
      }
    }

    if (this._skuttAktiv) {
      this._skuttFas += dt / SKUTT_S
      if (this._skuttFas >= 1) {
        this._skuttKvar--
        this._landa = 1
        if (this._skuttKvar > 0) this._skuttFas = 0
        else {
          this._skuttAktiv = false
          this._skuttFas = 0
        }
      }
    }
    this._landa = naerma(this._landa, 0, 11, dt)
    this._vinkKvar = Math.max(0, this._vinkKvar - dt)
    this._jubelKvar = Math.max(0, this._jubelKvar - dt)
    this._hejaKvar = Math.max(0, this._hejaKvar - dt)
    this._tuggKvar = Math.max(0, this._tuggKvar - dt)

    this._apply(dt)
  }

  _blicka(dt, mal) {
    let lp = null
    if (mal && Number.isFinite(mal.x) && Number.isFinite(mal.y) && this.view.parent) {
      this._pt.set(mal.x, mal.y)
      lp = this._v.nod.toLocal(this._pt, this.view.parent, this._pt2)
      // En förälder med skala 0 (en `bounceIn` som börjar där) har ingen invers → NaN.
      if (!Number.isFinite(lp.x) || !Number.isFinite(lp.y)) lp = null
    }
    let mx
    let my
    if (lp) {
      const dx = lp.x
      const dy = lp.y - this._m.faceY
      const len = Math.hypot(dx, dy) || 1
      const k = Math.min(1, len / BLICK_R)
      mx = (dx / len) * k
      my = (dy / len) * k * 0.85
      this._blickT = 1.2
    } else {
      // Inget mål: en slumpad blick var 3–5 s, så kompisen ser ut att tänka på något.
      this._blickT -= dt
      if (this._blickT <= 0) {
        this._blickT = 3 + Math.random() * 2
        const a = Math.random() * TAU
        const k = 0.3 + Math.random() * 0.55
        this._blickMal = { x: Math.cos(a) * k, y: Math.sin(a) * k * 0.6 }
      }
      mx = this._blickMal.x
      my = this._blickMal.y
    }
    this._blick.x = naerma(this._blick.x, mx, 9, dt)
    this._blick.y = naerma(this._blick.y, my, 9, dt)
    if (!Number.isFinite(this._blick.x) || !Number.isFinite(this._blick.y)) {
      this._blick.x = 0
      this._blick.y = 0
    }
  }

  // ENDA stället där transformer skrivs.
  _apply(dt) {
    const v = this._v
    const t = this._t
    const f = this._fas

    // Skuttet: en parabel per skutt, sträckt på väg upp och tryckt vid landningen.
    const u = this._skuttAktiv ? this._skuttFas : 0
    const h = this._skuttAktiv ? 4 * u * (1 - u) : 0
    const stack = this._skuttAktiv ? Math.max(0, 0.5 - u) * 0.16 : 0
    const andas = Math.sin(t * 2.3 + f)
    const liv = this._liv
    liv.y = -h * SKUTT_H * this._bas
    liv.scale.set(1 - 0.01 * andas + 0.09 * this._landa - stack * 0.5, 1 + 0.017 * andas - 0.12 * this._landa + stack)
    liv.rotation = 0.03 * Math.sin(t * 1.05 + f) + this._blick.x * 0.035
    if (this._skugga && !this._skugga.destroyed) this._skugga.scale.set(1 - 0.32 * h, 1 - 0.32 * h)

    // Armarna: viloläge med en liten pendling, och gesterna i fallande prioritet.
    // Negativ rotation lyfter HÖGERarmen (den är ritad nedåt-utåt), positiv lyfter vänster.
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1
      let mal = s * 0.06 * Math.sin(t * 1.7 + f + i * 1.3)
      if (this._jubelKvar > 0) mal = -s * (1.75 + 0.18 * Math.sin(t * 13 + i * Math.PI))
      else if (this._hejaKvar > 0) mal = -s * 1.05
      else if (this._vinkKvar > 0 && i === 1) mal = -(1.5 + 0.45 * Math.sin(t * 14))
      this._armRot[i] = naerma(this._armRot[i], mal, 16, dt)
      const arm = v.armar[i]
      if (arm && !arm.destroyed) arm.rotation = this._armRot[i]
    }

    // Blinkningen äger ögonnodens scale.y, tuggan munnodens.
    const o = v.ogonNod
    if (o && !o.destroyed) {
      o.scale.y = this._blinkFas >= 0 ? 1 - 0.9 * Math.sin(Math.PI * this._blinkFas) : 1
      o.x = this._blick.x * 9
    }
    const mun = v.munNod
    if (mun && !mun.destroyed) {
      const p = this._tuggKvar > 0 ? 1 - this._tuggKvar / TUGG_S : 0
      const tugg = this._tuggKvar > 0 ? Math.abs(Math.sin(p * Math.PI * 3)) : 0
      const glad = this._jubelKvar > 0 || this._hejaKvar > 0 ? 0.14 : 0
      mun.scale.set(1 + 0.1 * tugg + glad, 1 - 0.55 * tugg + glad)
      mun.x = this._blick.x * 6
    }
    // Ögonen ritas om bara när blicken flyttat sig märkbart — sex cirklar, men inte i onödan.
    const b = this._blick
    if (Math.abs(b.x - this._ritad.x) > 0.02 || Math.abs(b.y - this._ritad.y) > 0.02) {
      ritaOgon(v.ogonG, this.cfg, v.p, b)
      this._ritad.x = b.x
      this._ritad.y = b.y
    }
  }

  destroy() {
    this._alive = false
    if (this.view && !this.view.destroyed) this.view.destroy({ children: true })
    this._v = { armar: [] }
  }
}

/** En levande kompis ur en cfg. */
export function byggKompis(cfg, opts = {}) {
  return new Kompis(cfg, opts)
}
