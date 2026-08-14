// Elementlekplatsen — en sandlåda där barnet MÅLAR med naturkrafter och ser dem
// bråka med varandra. Fem fristående element står på rad under lådan (eld · vatten ·
// is · vind · jord); man plockar ett och drar fingret i rutan. Sanden faller, vattnet
// rinner, elden brinner ut, isen växer. Sex reaktioner går att hitta, och varje ny
// tänder en ruta i upptäcktsbandet högst upp. Alla sex → regnbåge, och sandlådan
// fortsätter för alltid — ingenting låses, ingenting kan gå sönder.
//
// MOTORVAL: EN cellautomat (./automat.js) för allt. Husets SPH-vätska övervägdes och
// valdes bort med skäl som står i automatens filhuvud: alla sex reaktionerna är
// tillståndsbyten hos en GRANNE, och grannar finns bara i ett rutnät. Två vattenmodeller
// i samma spel vore dessutom två fasta tidssteg som driver samma bild (skill fysik-spel:
// "ett spel = en motor").
//
// TAKT: automaten stegar 30 ggr/s (var andra bildruta), och rutnätet ritas om BARA när
// automaten säger att något ändrats. En stilla sandlåda kostar noll ritanrop.
//
// MOTGÅNG (P0): ingen skriptad översittare. Hindren är emergenta och alla tre går att
// måla sig runt på en sekund: elden torkar tillbaka lera till jord, isen växer sakta och
// kapslar in det som ligger nära, glöd svalnar till sten mitt i högen. Taken sitter i
// automaten (max 300 eldceller, max 260 glödceller) — inget kan svälla okontrollerat.
//
// P0 ASSETS: verktygen är FRISTÅENDE ritade element med egen silhuett, egen skugga och
// egen vilo-guppning — inte emoji i en knappruta. Därför används INTE lib/Button.js här
// (den ritar alltid en rundad platta med en etikett i); tryckbeteendet — hit-halo, studs,
// ljud — är kopierat från den. Upptäcktsbandet är UI och får bära små ritade ikoner.
//
// EXIT-SÄKERT: _alive, ticker tas bort, alla tweens dödas, partikel-emittern rivs, och
// BÅDA ljudslingorna (vind + eld) stoppas i destroy.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { Sandlada, TOM, JORD, VATTEN, IS, ELD, ANGA, LERA, GLOD, STEN, FRO, ANTAL_MAT } from './automat.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, puff, sparkle, burst, ripple, liv, wiggle } from '../../lib/feedback.js'
import { emitter } from '../../lib/partiklar.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { verticalFill } from '../../lib/form.js'
import { COLORS } from '../../lib/theme.js'

// --- geometri (designkoordinater 1280×720) --------------------------------------
// Talen är inte valda på känsla. Skalets hemknapp har träffytan x 0–140 / y −6–134 och
// högtalarknappen x 1140–1280: lådan börjar därför på x 156 och y 120, så ingen del av
// målytan ligger under en knapp som äter pekningen (P0 "död träffyta").
const CELL = 16
const COLS = 58
const ROWS = 26
const GX = 156
const GY = 120
const GW = COLS * CELL // 928
const GH = ROWS * CELL // 416

// Verktygsraden. P0: träffyta ≥96 px OCH ≥24 px MELLAN träffytorna. Halon är 24 px per
// sida, så två 96 px-verktyg behöver 96+24+24+24 = 168 px mellan centrumen. Fem verktyg
// på 168 px avstånd spänner 816 px inklusive halo — får gott och väl plats.
const VERKTYG_Y = 648
const VERKTYG_STEG = 168
const HALO = 24
const VERKTYG_R = 48 // synlig halvstorlek → 96 px träffyta

// Upptäcktsbandet (UI, ingen träffyta).
const BAND_Y = 62
const BAND_W = 118
const BAND_H = 68
const BAND_STEG = 138

const MITT_X = GX + GW / 2 // 620

const BORSTE_R = 2.6 // penselradie i celler (~42 px)
const VIND_R = 4.2

// --- material → färg -------------------------------------------------------------
// TOPP är en 4 px ljus remsa på varje ytas ÖVERKANT. Utan den läser en fylld hög som en
// platt färgklump (jfr `_plattprobe`); med den får varje hög en belyst ovansida och
// bilden djup, till priset av ett extra fill per material.
const FARG = new Array(ANTAL_MAT).fill(0xffffff)
const TOPP = new Array(ANTAL_MAT).fill(0xffffff)
FARG[JORD] = 0xb07a4a; TOPP[JORD] = 0xd7a271
FARG[VATTEN] = 0x3f8fd6; TOPP[VATTEN] = 0x86ccf2
FARG[IS] = 0x9fdcf0; TOPP[IS] = 0xeafaff
FARG[ELD] = 0xff7a2d; TOPP[ELD] = 0xffd35c
FARG[ANGA] = 0xc6d8e2; TOPP[ANGA] = 0xeef6fa
FARG[LERA] = 0x7a4f33; TOPP[LERA] = 0xa06b46
FARG[GLOD] = 0xe8541b; TOPP[GLOD] = 0xffab45
FARG[STEN] = 0x8b8079; TOPP[STEN] = 0xb3a9a1
FARG[FRO] = 0x5bbf6a; TOPP[FRO] = 0x93e39d
const ALFA = new Array(ANTAL_MAT).fill(1)
ALFA[ANGA] = 0.72

// --- verktygen -------------------------------------------------------------------
// Tonhöjderna är en C-durpentatonik (C4 E4 G4 A4 D5) — varje element har sin egen ton,
// och två element efter varandra låter alltid som musik, aldrig som en kollision.
const VERKTYG = [
  { key: 'eld', mat: ELD, farg: 0xff8a3d, ton: 440.0 },
  { key: 'vatten', mat: VATTEN, farg: 0x4aa3df, ton: 329.63 },
  { key: 'is', mat: IS, farg: 0xbdeefa, ton: 392.0 },
  { key: 'vind', mat: -1, farg: 0xa9d6e5, ton: 587.33 },
  { key: 'jord', mat: JORD, farg: 0xb07a4a, ton: 261.63 },
]

// --- upptäckterna ----------------------------------------------------------------
// Ordningen är bandets ordning från vänster. `ikon` pekar på en ritad småfigur.
const UPPTACKTER = [
  { key: 'anga', ikon: 'anga' },
  { key: 'smalt', ikon: 'droppe' },
  { key: 'lera', ikon: 'lera' },
  { key: 'glod', ikon: 'sten' },
  { key: 'is', ikon: 'iskristall' },
  { key: 'vind', ikon: 'vindsnurr' },
]

// --- startvärldar ----------------------------------------------------------------
// Ingen startvärld får innehålla två material som reagerar med varandra: en sjö med
// jordstränder hade gjort lera av sig själv och tänt en ruta i bandet UTAN att barnet
// gjort något (`scripts/_idleprobe.mjs` ska ge 0). Därför är allt fodrat med sten.
const VARLDAR = ['sjo', 'kulle', 'brasa', 'istappar']

// =================================================================================
// Ritade figurer. Allt är egna silhuetter, centrerade i (0,0).
// =================================================================================

function ritaVerktyg(key) {
  const g = new Graphics()
  if (key === 'eld') {
    g.moveTo(0, 44).quadraticCurveTo(-36, 14, -20, -14).quadraticCurveTo(-13, -4, -7, -10)
    g.quadraticCurveTo(-10, -34, 7, -47).quadraticCurveTo(3, -20, 20, -10)
    g.quadraticCurveTo(30, -20, 28, -31).quadraticCurveTo(43, -3, 0, 44).closePath()
    g.fill(0xff7a2d)
    g.moveTo(0, 36).quadraticCurveTo(-18, 10, -5, -7).quadraticCurveTo(3, -20, 10, -3)
    g.quadraticCurveTo(21, 10, 0, 36).closePath().fill(0xffd35c)
    g.circle(-2, 20, 6).fill({ color: 0xfff3b0, alpha: 0.85 })
  } else if (key === 'vatten') {
    g.moveTo(0, -46).quadraticCurveTo(34, -6, 34, 12)
    g.arc(0, 12, 34, 0, Math.PI)
    g.quadraticCurveTo(-34, -6, 0, -46).closePath()
    g.fill(0x4aa3df).stroke({ width: 4, color: 0x2f7fb8 })
    g.ellipse(-12, 10, 8, 13).fill({ color: 0xffffff, alpha: 0.5 })
    g.circle(11, 22, 4).fill({ color: 0xffffff, alpha: 0.35 })
  } else if (key === 'is') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      const cx = Math.cos(a)
      const cy = Math.sin(a)
      g.moveTo(0, 0).lineTo(cx * 42, cy * 42).stroke({ width: 9, color: 0xbdeefa, cap: 'round' })
      for (const s of [-1, 1]) {
        const b = a + s * 0.85
        g.moveTo(cx * 24, cy * 24).lineTo(cx * 24 + Math.cos(b) * 14, cy * 24 + Math.sin(b) * 14)
        g.stroke({ width: 6, color: 0xd8f3fb, cap: 'round' })
      }
    }
    g.circle(0, 0, 12).fill(0xeafaff).stroke({ width: 3, color: 0x9fdcf0 })
  } else if (key === 'vind') {
    for (const [y, w] of [[-20, 32], [-2, 42], [16, 26]]) {
      g.moveTo(-w, y).lineTo(w - 12, y)
      g.arc(w - 12, y + 10, 10, -Math.PI / 2, Math.PI / 2)
      g.stroke({ width: 9, color: 0x8fc9e0, cap: 'round' })
    }
    // En liten virvel längst ut — vinden ska ha en riktning, inte bara ligga där.
    let px = 0
    let py = 0
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2.6
      const r = 3 + (i / 40) * 15
      const nx = 20 + Math.cos(a) * r
      const ny = 34 + Math.sin(a) * r
      if (i === 0) g.moveTo(nx, ny)
      else g.lineTo(nx, ny)
      px = nx
      py = ny
    }
    g.stroke({ width: 6, color: 0xc4e6f2, cap: 'round' })
    g.circle(px, py, 4).fill(0xe6f6fb)
  } else {
    // jord — en jordkoka med gräs och småsten
    g.moveTo(-38, 28).quadraticCurveTo(-44, -4, -18, -16)
    g.quadraticCurveTo(2, -30, 24, -14).quadraticCurveTo(44, -4, 36, 28).closePath()
    g.fill(0x8a5a3b).stroke({ width: 4, color: 0x6f4a2e })
    // Strukturen är STRECK, inte prickar: två mörka ellipser i en rundad klump lästes
    // som ögon och gjorde jordkokan till ett ansikte (sett i skärmdumpen).
    g.moveTo(-24, 8).quadraticCurveTo(-12, 13, 0, 9).stroke({ width: 3, color: 0x6f4a2e, alpha: 0.7 })
    g.moveTo(4, 17).quadraticCurveTo(18, 20, 28, 14).stroke({ width: 3, color: 0x6f4a2e, alpha: 0.55 })
    g.circle(-26, 18, 4).fill(0x6f4a2e)
    g.circle(30, 20, 3.4).fill(0x6f4a2e)
    g.moveTo(-10, -14).quadraticCurveTo(-18, -34, -2, -42).stroke({ width: 6, color: 0x5bbf6a, cap: 'round' })
    g.moveTo(4, -18).quadraticCurveTo(14, -32, 24, -30).stroke({ width: 6, color: 0x6fd07a, cap: 'round' })
    g.circle(-2, -44, 4).fill(0x8fe09a)
  }
  g.eventMode = 'none'
  return g
}

function ritaBandIkon(key) {
  const g = new Graphics()
  if (key === 'anga') {
    for (const [x, y, r] of [[-10, 6, 10], [3, 1, 12], [13, 8, 8]]) g.circle(x, y, r).fill(0xdceaf2)
    g.moveTo(-12, -10).quadraticCurveTo(-3, -18, -9, -24).stroke({ width: 4, color: 0xdceaf2, cap: 'round' })
    g.moveTo(6, -12).quadraticCurveTo(15, -20, 9, -26).stroke({ width: 4, color: 0xdceaf2, cap: 'round' })
  } else if (key === 'droppe') {
    g.moveTo(0, -22).quadraticCurveTo(16, -2, 16, 6).arc(0, 6, 16, 0, Math.PI).quadraticCurveTo(-16, -2, 0, -22)
    g.closePath().fill(0x4aa3df).stroke({ width: 3, color: 0x2f7fb8 })
    g.ellipse(-6, 5, 4, 6).fill({ color: 0xffffff, alpha: 0.5 })
  } else if (key === 'lera') {
    // En BLÖT jordklump, inte en hög: låg, bred, med vattenblänk och fingerspår.
    // Första utkastet var en rundad kon med en kula på — den läste som en bajshög.
    g.moveTo(-24, 12).quadraticCurveTo(-26, -4, -10, -8)
    g.quadraticCurveTo(2, -14, 14, -7).quadraticCurveTo(27, -2, 24, 12).closePath()
    g.fill(0x7a4f33).stroke({ width: 3, color: 0x543724 })
    g.ellipse(-9, -1, 9, 4).fill({ color: 0xa87a52, alpha: 0.9 })
    g.moveTo(-4, 5).lineTo(10, 3).stroke({ width: 2.5, color: 0x543724, alpha: 0.7 })
    g.circle(13, -13, 4).fill(0x6fc2f0) // en vattendroppe på väg ner i leran
  } else if (key === 'sten') {
    g.moveTo(-20, 12).lineTo(-13, -8).lineTo(2, -16).lineTo(17, -5).lineTo(19, 12).closePath()
    g.fill(0x8b8079).stroke({ width: 3, color: 0x6b615a })
    g.circle(-6, 2, 3.5).fill(0xff7a2d)
    g.circle(7, 5, 2.8).fill(0xffab45)
  } else if (key === 'iskristall') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI
      g.moveTo(-Math.cos(a) * 20, -Math.sin(a) * 20).lineTo(Math.cos(a) * 20, Math.sin(a) * 20)
      g.stroke({ width: 6, color: 0xbdeefa, cap: 'round' })
    }
    g.circle(0, 0, 6).fill(0xeafaff)
  } else {
    for (const [y, w] of [[-8, 17], [2, 21], [12, 13]]) {
      g.moveTo(-w, y).lineTo(w - 6, y)
      g.arc(w - 6, y + 5, 5, -Math.PI / 2, Math.PI / 2)
      g.stroke({ width: 5, color: 0x8fc9e0, cap: 'round' })
    }
  }
  g.eventMode = 'none'
  return g
}

// Blomman som ett frö kan bli i leran — ett riktigt föremål med stjälk, blad och krona.
function ritaBlomma(farg) {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(0, 34).quadraticCurveTo(-6, 8, 0, -10).stroke({ width: 5, color: 0x4f9e56, cap: 'round' })
  g.moveTo(-2, 14).quadraticCurveTo(-18, 8, -20, -4).quadraticCurveTo(-8, -2, -2, 12).closePath().fill(0x5bbf6a)
  g.moveTo(2, 6).quadraticCurveTo(16, 0, 19, -10).quadraticCurveTo(8, -9, 2, 4).closePath().fill(0x6fd07a)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    g.ellipse(Math.cos(a) * 13, -12 + Math.sin(a) * 13, 9, 9).fill(farg)
  }
  g.circle(0, -12, 8).fill(0xffd35c).stroke({ width: 2.5, color: 0xe0a94f })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

// =================================================================================

export default {
  id: 'elementlekplatsen',
  titleSv: 'Elementlekplatsen',
  icon: '🌪️',
  category: 'fysik',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'elementlekplatsen',
  voiceIntro: 'Välj ett element och måla i lådan!',

  // ---- livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._klar = false
    this._funna = new Set()
    this._blommor = []
    this._idle = 0
    this._acc = 0
    this._steg = 0
    this._pek = null
    this._pekPrev = null
    this._pekar = false
    this._vindDir = 1
    this._vindLjud = false
    this._eldLjud = false
    this._sistTon = 0
    this._sistPuff = 0
    this._vindRord = 0
    this._paradTw = []
    this._paradFigurer = []
    this._eldMitt = { x: MITT_X, y: GY + GH / 2, n: 0 }

    // Vilken startvärld? Rullar ett steg per omgång så runda 2 aldrig är runda 1.
    this._varldIx = ((ctx.progress.get().custom?.varld | 0) % VARLDAR.length + VARLDAR.length) % VARLDAR.length
    this._varld = VARLDAR[this._varldIx]
    this._bagar = []

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))

    // --- lådan: ram + mörk insida ---------------------------------------
    // Insidan är MÖRK med flit. Dels för att materialfärgerna ska poppa, dels för att
    // eldens och glödens additiva sken ska ha takhöjd (en additiv glöd på en ljus botten
    // gör ingenting — se CLAUDE.md om `glod`).
    const lada = new Container()
    lada.eventMode = 'none'
    lada.interactiveChildren = false
    lada.addChild(new Graphics().roundRect(GX - 16, GY - 16, GW + 32, GH + 44, 18).fill(0x6f4a2e))
    lada.addChild(new Graphics().roundRect(GX - 10, GY - 10, GW + 20, GH + 20, 12).fill(0x8a5a3b))
    const insida = new Graphics().rect(GX, GY, GW, GH).fill(verticalFill(0x2a2018, 0x3d3126))
    lada.addChild(insida)
    // Bakväggen är en JORDPROFIL, inte en svart platta: fyra jordlager med småsten
    // mellan sig. Den tomma delen av lådan var annars 386 000 px i en enda ton
    // (precis vad `_plattprobe` letar efter), och en glasruta utan innehåll läser
    // som ett hål i skärmen.
    // Tonen var först violett/indigo (0x332c52 → 0x4f4468) med gråblå sten. Samma
    // mörker, men fel KULÖR: prickar på mörkblått med sneda ljusstrimmor över är en
    // natthimmel med ett fönster, och eftersom material bara byggs upp underifrån är
    // lådans övre halva obemålad under större delen av spelet. Nu varm jordton — lika
    // mörk, så additivt eldsken har kvar sin takhöjd, men läser som ett jordsnitt.
    const lager = new Graphics()
    for (let k = 1; k <= 5; k++) {
      const y = GY + (GH * k) / 6
      lager.moveTo(GX + 4, y)
      lager.quadraticCurveTo(MITT_X, y + (k % 2 ? 9 : -9), GX + GW - 4, y)
      lager.stroke({ width: 4, color: 0x6b5540, alpha: 0.75 })
    }
    // Småsten i bakväggen — fasta lägen ur en enkel hash, inte Math.random: bakväggen
    // ska se likadan ut varje gång spelet startas.
    for (let k = 0; k < 46; k++) {
      const px = GX + 22 + ((k * 197) % (GW - 44))
      const py = GY + 18 + ((k * 313) % (GH - 36))
      const r = 2.5 + ((k * 7) % 5) * 0.9
      lager.ellipse(px, py, r, r * 0.72).fill({ color: 0x7a6a55, alpha: 0.5 })
    }
    lada.addChild(lager)
    // Glasrutan framför: två sneda reflexer. Det är de som gör lådan till ett kärl med
    // en framsida i stället för en urklippt rektangel.
    const glas = new Graphics()
    glas.moveTo(GX + 40, GY + GH).lineTo(GX + 190, GY).lineTo(GX + 268, GY).lineTo(GX + 118, GY + GH).closePath()
    glas.fill({ color: 0xffffff, alpha: 0.045 })
    glas.moveTo(GX + 300, GY + GH).lineTo(GX + 450, GY).lineTo(GX + 486, GY).lineTo(GX + 336, GY + GH).closePath()
    glas.fill({ color: 0xffffff, alpha: 0.03 })
    glas.eventMode = 'none'
    lada.addChild(glas)
    // Bultar i hörnen — ramen ska läsa som en byggd låda, inte som en ram i ett program.
    const bult = new Graphics()
    for (const bx of [GX - 2, GX + GW + 2]) {
      for (const by of [GY - 2, GY + GH + 2]) bult.circle(bx, by, 6).fill(0xc79063).stroke({ width: 2, color: 0x6f4a2e })
    }
    lada.addChild(bult)
    this._root.addChild(lada)

    // --- rutnätets ritlager ---------------------------------------------
    this._gridLager = new Container()
    this._gridLager.eventMode = 'none'
    this._gridLager.interactiveChildren = false
    // TVÅ Graphics per material: en för basen och en för toppremsan. De KAN inte ligga i
    // samma nod — `fill()` betalar ALLA obetalda former på en gång, så ett andra fill
    // hade fått noll former och remsan tagit basens färg (Pixi-fällan i CLAUDE.md).
    // Alla baser först, alla remsor sedan: remsan ska ligga ovanpå grannens bas.
    this._matG = []
    this._toppG = []
    for (let m = 0; m < ANTAL_MAT; m++) {
      const g = new Graphics()
      g.eventMode = 'none'
      this._matG.push(g)
      this._gridLager.addChild(g)
    }
    for (let m = 0; m < ANTAL_MAT; m++) {
      const g = new Graphics()
      g.eventMode = 'none'
      this._toppG.push(g)
      this._gridLager.addChild(g)
    }
    this._addG = new Graphics()
    this._addG.eventMode = 'none'
    this._addG.blendMode = 'add'
    this._gridLager.addChild(this._addG)
    this._root.addChild(this._gridLager)

    // Blommor och regnbåge ovanpå sanden.
    this._vaxtLager = new Container()
    this._vaxtLager.eventMode = 'none'
    this._root.addChild(this._vaxtLager)
    this._bageLager = new Container()
    this._bageLager.eventMode = 'none'
    this._root.addChild(this._bageLager)

    // --- automaten + startvärlden ---------------------------------------
    this._aut = new Sandlada({ cols: COLS, rows: ROWS })
    this._byggVarld(this._varld)

    // --- målytan (P0: hela lådan är en träffyta) ------------------------
    const yta = new Graphics().rect(GX, GY, GW, GH).fill({ color: 0xffffff, alpha: 0.001 })
    yta.eventMode = 'static'
    yta.cursor = 'pointer'
    yta.hitArea = new Rectangle(GX, GY, GW, GH)
    this._onDown = (e) => this._pekNed(ctx, e)
    this._onMove = (e) => this._pekFlytt(e)
    this._onUp = () => this._pekUpp(ctx)
    yta.on('pointerdown', this._onDown)
    yta.on('globalpointermove', this._onMove)
    yta.on('pointerup', this._onUp)
    yta.on('pointerupoutside', this._onUp)
    this._yta = yta
    this._root.addChild(yta)

    // --- upptäcktsbandet (UI) -------------------------------------------
    this._band = []
    const bandLager = new Container()
    bandLager.eventMode = 'none'
    const x0 = MITT_X - ((UPPTACKTER.length - 1) * BAND_STEG) / 2
    UPPTACKTER.forEach((u, i) => {
      const c = new Container()
      c.position.set(x0 + i * BAND_STEG, BAND_Y)
      c.eventMode = 'none'
      const platta = new Graphics()
      platta.roundRect(-BAND_W / 2, -BAND_H / 2, BAND_W, BAND_H, 16).fill({ color: 0x000000, alpha: 0.16 })
      platta.roundRect(-BAND_W / 2, -BAND_H / 2, BAND_W, BAND_H, 16).stroke({ width: 4, color: COLORS.cream, alpha: 0.5 })
      c.addChild(platta)
      // Tomt läge: tre prickar, inte ett frågetecken — noll läsning (P0 NAVIGATION).
      const tom = new Graphics()
      for (const dx of [-16, 0, 16]) tom.circle(dx, 0, 5).fill({ color: COLORS.cream, alpha: 0.4 })
      c.addChild(tom)
      const ikon = ritaBandIkon(u.ikon)
      ikon.visible = false
      c.addChild(ikon)
      bandLager.addChild(c)
      this._band.push({ vy: c, platta, tom, ikon, key: u.key })
    })
    this._root.addChild(bandLager)

    // --- verktygen (fristående ritade element) --------------------------
    this._verktyg = []
    const vx0 = MITT_X - ((VERKTYG.length - 1) * VERKTYG_STEG) / 2
    VERKTYG.forEach((v, i) => {
      const c = new Container()
      c.position.set(vx0 + i * VERKTYG_STEG, VERKTYG_Y)
      const ring = new Graphics()
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2
        ring.circle(Math.cos(ang) * 60, Math.sin(ang) * 60, 4).fill({ color: v.farg, alpha: 0.9 })
      }
      ring.circle(0, 0, 56).fill({ color: v.farg, alpha: 0.18 })
      ring.visible = false
      ring.eventMode = 'none'
      const skugga = new Graphics().ellipse(0, 52, 40, 11).fill({ color: 0x000000, alpha: 0.18 })
      skugga.eventMode = 'none'
      // Konsten ligger i en INRE behållare: liv() äger dess y och rotation, medan
      // markeringen tweenar den YTTRE skalan. Två noder = de kan aldrig skriva över
      // varandra bildruta för bildruta.
      const krop = new Container()
      krop.eventMode = 'none'
      krop.addChild(ritaVerktyg(v.key))
      c.addChild(ring, skugga, krop)
      c.eventMode = 'static'
      c.cursor = 'pointer'
      c.interactiveChildren = false
      c.hitArea = new Rectangle(-VERKTYG_R - HALO, -VERKTYG_R - HALO, (VERKTYG_R + HALO) * 2, (VERKTYG_R + HALO) * 2)
      const rec = { key: v.key, mat: v.mat, farg: v.farg, ton: v.ton, vy: c, ring, krop }
      const valj = () => this._valj(ctx, rec)
      c.on('pointertap', valj)
      rec.off = () => c.off('pointertap', valj)
      liv(krop, { bob: 5, sway: 0.05, duration: 2.1 + Math.random() * 0.8 })
      this._root.addChild(c)
      this._verktyg.push(rec)
    })
    this._valdIx = 4 // jord först: den syns direkt, faller och bygger en hög
    this._sattVald(this._verktyg[this._valdIx])

    // --- Bobo vid kanten -------------------------------------------------
    // Riggen bär sin egen skugga och sitt eget andetag. r=40 ger kroppen y −40…+94,
    // alltså 332–466 här — under högtalarknappens träffyta (som slutar på y 134).
    this._bobo = makeKaraktar({ r: 40 })
    this._bobo.view.position.set(1182, 372)
    this._root.addChild(this._bobo.view)

    // --- eldens partikelsken --------------------------------------------
    // Egen emitter i SPELETS lager (inte fxLayer) → den dör med spelet, och rivs
    // dessutom explicit i destroy.
    this._eldFx = emitter(this._gridLager, {
      x: MITT_X,
      y: GY + GH / 2,
      bredd: 40,
      rate: 0,
      max: 90,
      colors: [0xffd35c, 0xff8a3d, 0xff6b6b],
      blend: 'add',
      size: 9,
      sizeVar: 0.5,
      sizeTo: 0.15,
      speed: 46,
      speedVar: 0.5,
      angle: -Math.PI / 2,
      spread: 0.9,
      gravity: -34,
      life: 0.55,
      lifeVar: 0.4,
      alpha: 0.9,
      fadeIn: 0.12,
    })
    this._eldFx.stop()

    this._ritaGrid()
    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    // Nästa gång spelet startas väntar nästa startvärld.
    ctx.progress.setCustom('varld', (this._varldIx + 1) % VARLDAR.length)
    this._bobo?.setMood('nyfiken')
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    // Båda slingorna MÅSTE stoppas här: en AudioBufferSourceNode med loop=true dör
    // inte med spelet och skulle brumma vidare på menyn.
    ctx?.services?.audio?.stopLoop('elementvind')
    ctx?.services?.audio?.stopLoop('elementeld')
    this._vindLjud = false
    this._eldLjud = false
    this._eldFx?.destroy()
    this._eldFx = null
    if (this._yta && !this._yta.destroyed) {
      this._yta.off('pointerdown', this._onDown)
      this._yta.off('globalpointermove', this._onMove)
      this._yta.off('pointerup', this._onUp)
      this._yta.off('pointerupoutside', this._onUp)
    }
    for (const v of this._verktyg || []) {
      v.off?.()
      if (v.krop && !v.krop.destroyed) {
        v.krop._fxLiv?.kill() // repeat:-1 — dör aldrig av sig själv
        gsap.killTweensOf(v.krop.scale)
      }
      if (v.vy && !v.vy.destroyed) gsap.killTweensOf(v.vy.scale)
      if (v.ring && !v.ring.destroyed) gsap.killTweensOf(v.ring)
    }
    this._verktyg = []
    for (const b of this._blommor || []) {
      if (b && !b.destroyed) {
        b._fxLiv?.kill()
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
      }
    }
    this._blommor = []
    for (const b of this._band || []) {
      if (b.ikon && !b.ikon.destroyed) gsap.killTweensOf(b.ikon.scale)
      if (b.tom && !b.tom.destroyed) gsap.killTweensOf(b.tom)
    }
    for (const a of this._bagar || []) if (a && !a.destroyed) gsap.killTweensOf(a.scale)
    this._bagar = []
    for (const t of this._paradTw || []) t?.kill()
    this._paradTw = []
    for (const f of this._paradFigurer || []) if (f && !f.destroyed) gsap.killTweensOf(f)
    this._paradFigurer = []
    this._bobo?.destroy()
    this._bobo = null
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._aut = null
  },

  // ---- startvärldar -------------------------------------------------------

  _byggVarld(namn) {
    const A = this._aut
    const golv = ROWS - 2
    if (namn === 'sjo') {
      // En stenskål med vatten. Jordpelarna står för sig själva på stengolvet — de får
      // inte röra vattnet, då hade leran uppstått av sig själv.
      A.fyll(0, golv, COLS - 1, ROWS - 1, STEN)
      A.fyll(12, golv - 7, 36, golv - 1, STEN) // massivt block…
      A.fyll(14, golv - 7, 34, golv - 2, TOM) // …urgröpt till en skål
      A.fyll(14, golv - 6, 34, golv - 2, VATTEN)
      A.fyll(44, golv - 6, 49, golv - 1, JORD) // jordpelare, utom räckhåll för vattnet
    } else if (namn === 'kulle') {
      A.fyll(0, golv, COLS - 1, ROWS - 1, STEN)
      for (let c = 12; c <= 44; c++) {
        const h = Math.round(11 * Math.cos(((c - 28) / 17) * (Math.PI / 2)))
        if (h > 0) A.fyll(c, golv - h, c, golv - 1, JORD)
      }
      if (Math.random() < 0.55) A.fyll(28, golv - 12, 28, golv - 12, FRO)
    } else if (namn === 'brasa') {
      // En stenhärd med glödbädd och några lågor. Elden har inget bränsle och brinner
      // ut av sig själv — det är stämning, inte en reaktion, och tänder ingen ruta.
      A.fyll(0, golv, COLS - 1, ROWS - 1, STEN)
      A.fyll(22, golv - 2, 36, golv - 1, STEN) // härdens stenkant
      A.fyll(24, golv - 3, 34, golv - 3, GLOD) // glödbädden ovanpå den
      for (let c = 24; c <= 34; c++) A.fyll(c, golv - 5, c, golv - 4, ELD)
      A.fyll(6, golv - 5, 11, golv - 1, JORD)
      A.fyll(47, golv - 5, 52, golv - 1, JORD)
    } else {
      // istappar — pelare av is på stengolv, med en jordklack i mitten.
      A.fyll(0, golv, COLS - 1, ROWS - 1, STEN)
      for (const c of [10, 18, 40, 48]) {
        const h = 8 + ((Math.random() * 6) | 0)
        A.fyll(c - 1, golv - h, c + 1, golv - 1, IS)
      }
      A.fyll(26, golv - 4, 32, golv - 1, JORD)
    }
  },

  // ---- verktygsval --------------------------------------------------------

  _valj(ctx, rec) {
    if (!this._alive) return
    const ix = this._verktyg.indexOf(rec)
    if (ix >= 0) this._valdIx = ix
    this._sattVald(rec)
    pop(rec.krop, { scale: 1.16 })
    ctx.services.audio.tone({ freq: rec.ton, dur: 0.14, type: 'triangle', vol: 0.26 })
    ripple(ctx.fxLayer, rec.vy.x, rec.vy.y, { color: rec.farg, maxR: 96, duration: 0.45 })
    this._bobo?.look(rec.vy.x, rec.vy.y)
  },

  _sattVald(vald) {
    for (const v of this._verktyg) {
      const pa = v === vald
      v.ring.visible = pa
      gsap.killTweensOf(v.vy.scale)
      gsap.to(v.vy.scale, { x: pa ? 1.14 : 0.9, y: pa ? 1.14 : 0.9, duration: 0.22, ease: 'back.out(2)' })
    }
  },

  get _vald() {
    return this._verktyg?.[this._valdIx]
  },

  // ---- pekning ------------------------------------------------------------

  _pekNed(ctx, e) {
    if (!this._alive) return
    const p = this._root.toLocal(e.global)
    this._pek = { x: p.x, y: p.y }
    this._pekPrev = { x: p.x, y: p.y }
    this._pekar = true
    this._bobo?.look(p.x, p.y)
    const v = this._vald
    if (v?.key === 'vind' && !this._vindLjud) {
      this._vindLjud = ctx.services.audio.loop('elementvind', { typ: 'brus', freq: 640, q: 0.7, vol: 0.06 }) !== false
    }
    // P0 ÅTERKOPPLING: bild+ljud under 100 ms, redan innan automaten hunnit stega.
    ripple(ctx.fxLayer, p.x, p.y, { color: v?.farg ?? 0xffffff, maxR: 60, duration: 0.36, alpha: 0.4 })
    this._mala(ctx, true)
  },

  _pekFlytt(e) {
    if (!this._alive || !this._pekar) return
    const p = this._root.toLocal(e.global)
    this._pek = { x: p.x, y: p.y }
  },

  _pekUpp(ctx) {
    if (!this._alive) return
    this._pekar = false
    this._pek = null
    this._pekPrev = null
    if (this._vindLjud) {
      ctx.services.audio.stopLoop('elementvind')
      this._vindLjud = false
    }
  },

  // Målar (eller blåser) längs sträckan sedan förra steget, så ett snabbt drag inte
  // lämnar hål mellan bildrutorna.
  _mala(ctx, forsta = false) {
    if (!this._pek || !this._aut) return
    const v = this._vald
    if (!v) return
    const p = this._pek
    const prev = this._pekPrev || p
    const dx = p.x - prev.x
    const dy = p.y - prev.y
    const dist = Math.hypot(dx, dy)
    // Ett stillastående finger ska inte hälla ut hela hinken: full takt när fingret rör
    // sig, var tredje steg när det står still.
    if (!forsta && dist < 3 && this._steg % 3 !== 0) return
    const langd = BORSTE_R * CELL * 0.75
    const n = Math.max(1, Math.min(12, Math.ceil(dist / langd)))
    if (v.key === 'vind' && Math.abs(dx) > 2) this._vindDir = dx > 0 ? 1 : -1
    let rord = 0
    for (let k = forsta ? 0 : 1; k <= n; k++) {
      const x = prev.x + (dx * k) / n
      const y = prev.y + (dy * k) / n
      const c = Math.floor((x - GX) / CELL)
      const r = Math.floor((y - GY) / CELL)
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue
      if (v.key === 'vind') rord += this._aut.blas(c, r, VIND_R, this._vindDir)
      else this._aut.mala(c, r, BORSTE_R, v.mat)
    }
    const nu = performance.now()
    if (nu - this._sistTon > 145) {
      this._sistTon = nu
      // Målartonen ligger en oktav upp och mycket tystare än verktygsvalet — den ska
      // vara ett spår, inte en fanfar.
      ctx.services.audio.tone({ freq: v.ton * (Math.random() < 0.5 ? 2 : 1.5), dur: 0.09, type: 'sine', vol: 0.11 })
    }
    if (nu - this._sistPuff > 110) {
      this._sistPuff = nu
      puff(ctx.fxLayer, p.x, p.y, { count: 2, color: v.farg })
    }
    // Vind-rutan tänds på hur många celler som FAKTISKT flyttat sig, summerat över
    // draget — inte på ett enskilt anrop. Ett anrop hinner bara knuffa högens yttersta
    // korn, så ett tröskelvärde per anrop tände aldrig rutan (sonden, arm 2).
    if (v.key === 'vind') {
      this._vindRord = (this._vindRord || 0) + rord
      if (this._vindRord > 8) this._upptack(ctx, 'vind')
    }
    this._pekPrev = { x: p.x, y: p.y }
  },

  // ---- upptäckter ---------------------------------------------------------

  _upptack(ctx, key) {
    if (!this._alive || this._funna.has(key)) return
    this._funna.add(key)
    const rec = this._band.find((b) => b.key === key)
    if (rec) {
      rec.tom.visible = false
      rec.ikon.visible = true
      bounceIn(rec.ikon, { duration: 0.5 })
      rec.platta.clear()
      rec.platta.roundRect(-BAND_W / 2, -BAND_H / 2, BAND_W, BAND_H, 16).fill({ color: COLORS.cream, alpha: 0.92 })
      rec.platta.roundRect(-BAND_W / 2, -BAND_H / 2, BAND_W, BAND_H, 16).stroke({ width: 5, color: COLORS.yellow })
      sparkle(ctx.fxLayer, rec.vy.x, rec.vy.y, { count: 8 })
    }
    const a = ctx.services.audio
    a.sfx('pling')
    // Durtreklang uppåt — en upptäckt LÅTER som något som går ihop.
    a.tone({ freq: 523.25, dur: 0.16, type: 'triangle', vol: 0.24 })
    a.tone({ freq: 659.25, dur: 0.16, type: 'triangle', vol: 0.22, delay: 0.1 })
    a.tone({ freq: 783.99, dur: 0.24, type: 'triangle', vol: 0.22, delay: 0.2 })
    this._bobo?.react('jubel')
    this._bobo?.setMood('stolt')
    this._sagUpptackt(ctx.services.voice, key)
    this._idle = 0
    if (this._funna.size >= UPPTACKTER.length && !this._klar) this._final(ctx)
  },

  // Varje replik står som en egen literal i en `voice.say('…')` — bara då kan check.mjs
  // se den, och bara då kan den få ett riktigt röstklipp (CLAUDE.md).
  _sagUpptackt(voice, key) {
    if (!voice) return
    if (key === 'anga') voice.say('Ånga! Titta så den stiger!')
    else if (key === 'smalt') voice.say('Isen smälte till vatten!')
    else if (key === 'lera') voice.say('Vatten och jord blev lera!')
    else if (key === 'glod') voice.say('Jorden blev glödande stenar!')
    else if (key === 'is') voice.say('Isen växer och växer!')
    else if (key === 'vind') voice.say('Vinden blåser iväg allting!')
  },

  _sagTips(voice, key) {
    if (!voice) return
    if (key === 'anga') voice.say('Prova eld i vattnet!')
    else if (key === 'smalt') voice.say('Prova eld på isen!')
    else if (key === 'lera') voice.say('Häll vatten på jorden!')
    else if (key === 'glod') voice.say('Prova eld på jorden!')
    else if (key === 'is') voice.say('Häll vatten bredvid isen!')
    else if (key === 'vind') voice.say('Prova vinden i lådan!')
  },

  // ---- blomman (sällsynt) -------------------------------------------------

  _planteraBlomma(ctx, i) {
    if (!this._alive || this._blommor.length >= 3) return
    const c = i % COLS
    const r = (i / COLS) | 0
    const b = ritaBlomma([0xff9ec4, 0xffd35c, 0xa78bfa][(Math.random() * 3) | 0])
    b.position.set(GX + c * CELL + CELL / 2, GY + r * CELL + CELL / 2)
    b.scale.set(0)
    this._vaxtLager.addChild(b)
    this._blommor.push(b)
    gsap.to(b.scale, { x: 1, y: 1, duration: 0.9, ease: 'back.out(1.6)' })
    liv(b, { bob: 3, sway: 0.06, duration: 2.6 })
    burst(ctx.fxLayer, b.x, b.y, { count: 12, colors: [0x5bbf6a, 0xffd35c, 0xff9ec4] })
    ctx.services.audio.tone({ freq: 659.25, slideTo: 987.77, dur: 0.4, type: 'triangle', vol: 0.24 })
    ctx.services.voice.say('Titta, en blomma växte i leran!')
    this._bobo?.react('nyfiken')
  },

  // ---- finish -------------------------------------------------------------

  _final(ctx) {
    this._klar = true
    ctx.services.voice.say('Du hittade allihop! Nu kommer regnbågen!')
    this._bobo?.setMood('stolt')
    this._bobo?.react('jubel')
    // Regnbågen: sex bågar som studsar in ovanifrån över lådan.
    this._bagar = []
    const cols = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
    cols.forEach((col, i) => {
      const g = new Graphics()
      g.arc(0, 0, 430 - i * 22, Math.PI * 1.06, Math.PI * 1.94).stroke({ width: 18, color: col, alpha: 0.72 })
      g.position.set(MITT_X, GY + GH + 20)
      g.eventMode = 'none'
      this._bageLager.addChild(g)
      this._bagar.push(g)
      bounceIn(g, { delay: 0.09 * i, duration: 0.55 })
    })
    // ...och alla fem elementen gör en RUNDA i rutan, ett i taget.
    //
    // Första versionen lät paraden MÅLA en kolumn av varje element tvärs över lådan.
    // Skärmdumpen dömde ut den: 900 celler material föll ner och begravde exakt det
    // barnet just byggt, i samma sekund som spelet skulle fira det. Isen blev dessutom
    // ett permanent blått tak (is är statisk och stannar där den målas). Nu FLYGER
    // elementen i stället — samma figurer som på verktygsraden, i en båge med gnistspår.
    // Sandlådan är barnets, och en final får inte skriva över den.
    this._paradFigurer = []
    this._paradTw = []
    this._verktyg.forEach((v, i) => {
      const f = ritaVerktyg(v.key)
      f.scale.set(0.66)
      f.position.set(GX + 10, GY + 150)
      f.alpha = 0
      f.eventMode = 'none'
      this._bageLager.addChild(f)
      this._paradFigurer.push(f)
      const st = { p: 0, sist: -1 }
      const tw = gsap.to(st, {
        p: 1,
        duration: 2.1,
        delay: 0.45 + i * 0.4,
        ease: 'none',
        onStart: () => {
          if (this._alive) ctx.services.audio.tone({ freq: v.ton, dur: 0.32, type: 'triangle', vol: 0.22 })
        },
        onUpdate: () => {
          if (f.destroyed || !this._alive) {
            tw.kill()
            return
          }
          // Bågen hålls INNANFÖR lådan och tonas in/ut i ändarna. Utan det flög första
          // och sista figuren utanför träramen och svävade i bakgrunden (skärmdumpen).
          f.x = GX + 10 + (GW - 20) * st.p
          f.y = GY + 150 - Math.sin(st.p * Math.PI) * 96
          f.rotation = Math.sin(st.p * Math.PI * 3) * 0.26
          f.alpha = Math.min(1, Math.min(st.p, 1 - st.p) / 0.09)
          if (st.p - st.sist > 0.06) {
            st.sist = st.p
            sparkle(ctx.fxLayer, f.x, f.y, { count: 2 })
          }
        },
        onComplete: () => {
          if (!f.destroyed) f.destroy()
        },
      })
      this._paradTw.push(tw)
    })
    ctx.later(1.0, () => {
      if (!this._alive) return
      ctx.progress.complete()
      ctx.progress.setLevel(this._varldIx + 1)
    })
  },

  // ---- loop ---------------------------------------------------------------

  _update(ctx, tk) {
    if (!this._alive || !this._aut) return
    const dt = tk.deltaMS
    this._acc += dt

    // Mjuk om-cue. Aldrig en lösning — bara ett tips om nästa oöppnade ruta. Räknas i
    // VÄGGKLOCKA och FÖRE steg-loopen: låg den efter `if (!steg) return` hade halva
    // bildrutorna aldrig räknats och 8,5 s blivit 17.
    //
    // Klockan nollställdes först av VARJE bildruta med fingret nere. Ett barn som målar
    // sammanhängande med samma verktyg kunde alltså aldrig få ett tips — och i två av
    // fyra startvärldar (`kulle` = bara jord, `istappar` = is+jord, som inte reagerar
    // med varandra) är just det den enda vägen till en reaktion. Nu nollställs den bara
    // av en UPPTÄCKT: fingret nere saktar ner klockan till hälften i stället för att
    // frysa den, så den som är igång får sitt tips senare, inte aldrig.
    this._idle += (this._pekar ? 0.5 : 1) * (dt / 1000)
    if (this._idle > 8.5) {
      this._idle = 0
      this._locka(ctx)
    }

    let steg = 0
    // Fast 30 Hz. Taket på 3 steg gör att en tappad bildruta inte blir ett ras.
    while (this._acc >= 33.34 && steg < 3) {
      this._acc -= 33.34
      this._steg++
      if (this._pekar) this._mala(ctx)
      this._aut.steg()
      steg++
    }
    if (!steg) return

    // Upptäckter ur automatens händelser.
    const h = this._aut.taHandelser()
    if (h.anga) this._upptack(ctx, 'anga')
    if (h.smalt) this._upptack(ctx, 'smalt')
    if (h.lera) this._upptack(ctx, 'lera')
    if (h.glod) this._upptack(ctx, 'glod')
    if (h.is) this._upptack(ctx, 'is')
    while (this._aut.groddar.length) this._planteraBlomma(ctx, this._aut.groddar.pop())

    if (this._aut.andrad) {
      this._ritaGrid()
      this._aut.andrad = false
    }
    this._ljudOchSken(ctx)
  },

  _ljudOchSken(ctx) {
    const eld = this._aut.antal[ELD] + this._aut.antal[GLOD]
    const a = ctx.services.audio
    if (eld > 45 && !this._eldLjud) this._eldLjud = a.loop('elementeld', { typ: 'brus', freq: 190, q: 1.7, vol: 0.05 }) !== false
    else if (eld < 18 && this._eldLjud) {
      a.stopLoop('elementeld')
      this._eldLjud = false
    }
    const m = this._eldMitt
    if (m.n > 4) {
      this._eldFx.moveTo(m.x, m.y - 6)
      this._eldFx.o.bredd = Math.min(240, 18 + m.n * 1.4)
      this._eldFx.rate = Math.min(34, 5 + m.n * 0.35)
      this._eldFx.start()
    } else {
      this._eldFx.stop()
    }
  },

  _locka(ctx) {
    if (!this._alive) return
    const nasta = UPPTACKTER.find((u) => !this._funna.has(u.key))
    if (!nasta) {
      ctx.services.voice.say('Måla vad du vill i lådan!')
      this._bobo?.react('hej')
      return
    }
    this._sagTips(ctx.services.voice, nasta.key)
    this._bobo?.react('nyfiken')
    // Peka på de verktyg tipset handlar om — en vinkning, aldrig en lösning.
    const vinkar = { anga: ['eld', 'vatten'], smalt: ['eld', 'is'], lera: ['vatten', 'jord'], glod: ['eld', 'jord'], is: ['is', 'vatten'], vind: ['vind'] }[nasta.key] || []
    for (const key of vinkar) {
      const v = this._verktyg.find((x) => x.key === key)
      if (!v) continue
      pop(v.krop, { scale: 1.22 })
      wiggle(v.krop)
      ripple(ctx.fxLayer, v.vy.x, v.vy.y, { color: v.farg, maxR: 108, duration: 0.6, alpha: 0.45 })
    }
  },

  // ---- rendering ----------------------------------------------------------
  //
  // ETT Graphics per material, körlängdskodat per rad: en full rad blir EN rect i
  // stället för 58. Ovanpå det en 4 px ljus remsa där materialet möter något annat
  // uppåt — det är den som gör högarna till högar i stället för färgfält.
  _ritaGrid() {
    const A = this._aut
    const mat = A.mat
    for (let m = 1; m < ANTAL_MAT; m++) {
      this._matG[m].clear()
      this._toppG[m].clear()
    }
    this._addG.clear()
    let ex = 0
    let ey = 0
    let en = 0
    for (let r = 0; r < ROWS; r++) {
      const y = GY + r * CELL
      let c = 0
      while (c < COLS) {
        const m = mat[r * COLS + c]
        if (m === TOM) {
          c++
          continue
        }
        let c2 = c + 1
        while (c2 < COLS && mat[r * COLS + c2] === m) c2++
        const g = this._matG[m]
        g.rect(GX + c * CELL, y, (c2 - c) * CELL, CELL)
        // toppremsan: bara där cellen ovanför är något ANNAT
        let k = c
        while (k < c2) {
          const olik = r === 0 || mat[(r - 1) * COLS + k] !== m
          if (!olik) {
            k++
            continue
          }
          let k2 = k + 1
          while (k2 < c2 && (r === 0 || mat[(r - 1) * COLS + k2] !== m)) k2++
          this._toppG[m].rect(GX + k * CELL, y, (k2 - k) * CELL, 4)
          k = k2
        }
        if (m === ELD || m === GLOD) {
          this._addG.rect(GX + c * CELL - 4, y - 4, (c2 - c) * CELL + 8, CELL + 8)
          if (m === ELD) {
            ex += (GX + ((c + c2) / 2) * CELL) * (c2 - c)
            ey += y * (c2 - c)
            en += c2 - c
          }
        }
        c = c2
      }
    }
    for (let m = 1; m < ANTAL_MAT; m++) {
      this._matG[m].fill({ color: FARG[m], alpha: ALFA[m] })
      this._toppG[m].fill({ color: TOPP[m], alpha: ALFA[m] })
    }
    // Eldens och glödens sken: additivt, och det är MÄTBART tillåtet här — lådans insida
    // är mörk (0x1d2233→0x2f2a3d), så en varm mörk ton har hela takhöjden kvar att lysa i.
    this._addG.fill({ color: 0x4a2404, alpha: 0.9 })
    this._eldMitt = en > 0 ? { x: ex / en, y: ey / en, n: en } : { x: MITT_X, y: GY + GH / 2, n: 0 }
  },
}
