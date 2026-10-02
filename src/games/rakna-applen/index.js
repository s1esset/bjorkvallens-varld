// Räkna Frukten ("Räkna Äpplena") — räkne-/lärande-tap-spel (2–5 år).
// En charmig frukt-trädgård: programmatiskt ritat träd med glansig frukt i kronan,
// en flätad korg nedanför och en stor, vänlig sifferräknare i mitten. Barnet
// trycker på en frukt i taget, frukten susar ner i korgen (plums-ljud + korg-studs)
// och rösten räknar "ett, två, tre…". Redan från runda 2 blir det oftast ett
// "tryck på N stycken"-mål med en SYNLIG mål-siffra ("Tryck på 3") så barnet övar
// att stanna vid rätt antal. När målet är nått räknar vi OM korgen ("ett, två, tre
// — tre äpplen!") medan varje frukt studsar (sluter kardinalitets-loopen), sedan
// firande och en ny runda. Frukttypen varieras per runda (äpple/päron/apelsin/
// plommon/citron) så det aldrig blir enformigt.
//
// Inga felsteg, ingen timer, ingen poäng som sjunker — tomt tryck är bara en
// lekfull vingel + mjukt ljud. ALL async är skyddad med this._alive (exit-säkert):
// fördröjda anrop, breathe/shake-tweens och flyg-tweens dödas i destroy().
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, wiggle, floatText, ripple, shake, burst, breathe, puff, liv, kvittera } from '../../lib/feedback.js'
import { createScene, slump } from '../../lib/scene.js'
import { makeSquirrel } from '../../lib/figurer.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { topLightFill, cylinderFill } from '../../lib/form.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { slumpIBand } from '../../lib/variation.js'
import { Hog } from '../../lib/hog.js'
import { Body } from '../../lib/physics.js'

// Högen i korgen (FYSIKPLAN P3). Korgen står på (1000, 600); innerväggarna och golvet är måttade mot
// dess ritning. Fruktens kropp har radie 24 — en aning mer än bilden (äpple 52·0,42 ≈ 22) så att raden ligger tätt.
// Taket är 10 = det MEST som en runda räknar — en frukt som tonade bort skulle ljuga för omräkningen
// ("ett, två, tre …" studsar varje plockad frukt), så ingen fångad frukt försvinner. Läsbarheten hålls av
// PLATSERNA (_hogSlot): frukterna släpps rakt över sin plats så de ligger i rader om högst 5, nästa rad
// nästlad i gluggarna — samma bild som den gamla staplingen, fast med riktig tyngd.
const KORG_X = 1000
const HOG_R = 24
const HOG_RAD = 48 // avstånd mellan två frukter i en rad = 2·HOG_R: raden ligger tätt och nästlingen blir en regelbunden sexhörning
const HOG_RAD_HOJD = 41.6 // nästlad rad: sqrt(48² − 24²)
const HOG_GOLV = 624
const HOG_Y0 = 600 // mittpunkten på första raden

// Räkneorden 1–10 (rundans mål håller sig alltid inom 1–10).
const NUM = ['ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio']
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Frukter: svensk singular/plural + obestämd artikel + färger + ritform.
const FRUITS = [
  { id: 'apple', one: 'äpple', many: 'äpplen', art: 'ett', body: 0xe6402e, dark: 0xa82a1c, leaf: 0x5bbf6a, shape: 'round' },
  { id: 'pear', one: 'päron', many: 'päron', art: 'ett', body: 0xbcd23a, dark: 0x8ea62a, leaf: 0x5bbf6a, shape: 'pear' },
  { id: 'orange', one: 'apelsin', many: 'apelsiner', art: 'en', body: 0xff9a2e, dark: 0xdb7611, leaf: 0x5bbf6a, shape: 'round' },
  { id: 'plum', one: 'plommon', many: 'plommon', art: 'ett', body: 0x9159d6, dark: 0x6c3fb0, leaf: 0x5bbf6a, shape: 'plum' },
  { id: 'lemon', one: 'citron', many: 'citroner', art: 'en', body: 0xffd83d, dark: 0xdcb81d, leaf: 0x5bbf6a, shape: 'lemon' },
]

const nounOf = (n, f) => (n === 1 ? f.one : f.many)
const numWord = (n) => NUM[n - 1] || String(n)
// "Tre äpplen!" — total efter att alla räknats.
const totalPhrase = (n, f) => `${capitalize(numWord(n))} ${nounOf(n, f)}!`
// Mål på högre nivå: "Kan du trycka på fyra äpplen?"
const goalIntro = (n, f) => `Kan du trycka på ${numWord(n)} ${nounOf(n, f)}?`
// "Räkna alla äpplen!"
const countAllIntro = (f) => `Räkna alla ${f.many}!`
// Bekräftelse efter ett mål: "Du tryckte på fyra äpplen!"
const goalFinish = (n, f) => `Du tryckte på ${numWord(n)} ${nounOf(n, f)}!`
// Inled den avslutande omräkningen av korgen.
const recountIntro = 'Nu räknar vi i korgen!'

export default {
  id: 'rakna-applen',
  titleSv: 'Räkna Äpplena',
  icon: '🍎',
  category: 'larande',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'rakna-applen',
  voiceIntro: 'Tryck på frukterna och räkna med mig — ett, två, tre!',

  init(ctx) {
    this._alive = true
    this._first = true
    this._idle = 0
    this._resolving = false
    this._count = 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._lastFruitId = null
    this._forraMal = undefined // förra rundans mål (slumpIBand undviker det)
    this._allaBlock = -1 // vilket fyrarundorsblock "räkna alla"-platsen är lottad för
    this._allaSlot = 1
    this._fro = 1 + Math.floor(Math.random() * 40) // äng, trädlinje och träd byter utseende per start

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Marknadsmässig bakgrund: mjuk äng med sol, kullar, en trädlinje i fjärran och strån
    //    längst fram (L1). Trädet och korgen framför den (L2) bär själva platsen.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, silhuett: 'skog', forgrund: true, fro: this._fro }))

    // 2) Heltäckande, osynlig tap-fångare (ligger UNDER frukten): tryck bredvid
    //    frukten -> mjukt ljud + vänlig vingel + en liten ring där fingret var.
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._root.addChild(tap)

    // 3) Äppelträdet som frukten hänger i, med mark och skuggor (programmatiskt, dekorativt).
    this._root.addChild(this._makeTree(this._fro))

    // 4) Korg (bakdel bakom frukten, framkant ovanpå så plockad frukt tuckas in).
    const basket = this._makeBasket()
    this._basketBack = basket.back
    this._basketFront = basket.front
    this._root.addChild(basket.back)

    // 5) Stor, vänlig räknesiffra (dold tills första plocket, studsar in per plock).
    this._bigNum = new Text({
      text: '',
      style: {
        fontFamily: FONT.display,
        fontSize: 200,
        fontWeight: '700',
        fill: COLORS.cream,
        stroke: { color: COLORS.orangeDark, width: 12, join: 'round' },
        align: 'center',
      },
    })
    this._bigNum.anchor.set(0.5)
    this._bigNum.position.set(640, 545)
    this._bigNum.alpha = 0
    this._bigNum.eventMode = 'none'
    this._root.addChild(this._bigNum)

    // 5b) Synlig MÅL-siffra ("Tryck på 3"): visas i "tryck på N"-läget så barnet
    //     ser vilket antal det siktar mot och kan öva att stanna vid rätt siffra.
    this._goalBanner = new Container()
    this._goalBanner.eventMode = 'none'
    this._goalBanner.interactiveChildren = false
    this._goalBanner.visible = false
    this._goalBanner.position.set(640, 74)
    const pill = new Graphics()
      .roundRect(-190, -48, 380, 96, 48)
      .fill({ color: COLORS.cream, alpha: 0.94 })
      .stroke({ width: 6, color: COLORS.orangeDark })
    this._goalBanner.addChild(pill)
    this._goalLabel = new Text({
      text: 'Tryck på',
      style: { fontFamily: FONT.display, fontSize: 44, fontWeight: '700', fill: COLORS.ink },
    })
    this._goalLabel.anchor.set(0, 0.5)
    this._goalLabel.position.set(-160, 0)
    this._goalBanner.addChild(this._goalLabel)
    this._goalNum = new Text({
      text: '',
      style: {
        fontFamily: FONT.display,
        fontSize: 78,
        fontWeight: '700',
        fill: COLORS.orange,
        stroke: { color: COLORS.orangeDark, width: 6, join: 'round' },
      },
    })
    this._goalNum.anchor.set(0.5)
    this._goalNum.position.set(120, 0)
    this._goalBanner.addChild(this._goalNum)
    this._root.addChild(this._goalBanner)

    // 6) Progress-rad: tomma konturer som fylls med en mini-frukt per plock.
    this._progLayer = new Container()
    this._progLayer.eventMode = 'none'
    this._progLayer.interactiveChildren = false
    this._root.addChild(this._progLayer)

    // 7) Frukt-lager (det enda interaktiva, överst).
    this._appleLayer = new Container()
    this._root.addChild(this._appleLayer)

    // 8) Korgens framkant (ovanpå frukt-lagret).
    this._root.addChild(basket.front)

    // 9) Mottagaren: ekorren som korgen tillhör. Scenen hade ingen som tog emot
    //    frukten — bara ett träd och en korg (gate-punkt 4, "tomma scener").
    this._squirrel = makeSquirrel()
    this._squirrel.position.set(806, 664)
    this._root.addChild(this._squirrel)
    this._squirrelIdle = breathe(this._squirrel, { scale: 1.03, duration: 1.9 })

    // 9b) Högen i korgen: plockad frukt faller ner och lägger sig (sömn: en vilande hög står still).
    this._hog = new Hog(this._hogOpt())
    this._hog.paSlag((post) => this._landa(ctx, post))

    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // --- scen-byggare -------------------------------------------------------

  // Äppelträd (L2): marken det står på, en tjock stam med bark och rotfötter, grenar som
  // sticker ut under kronan och en krona i tre lager — mörka bas-puffar, ljusare mellanpuffar
  // och ljusfläckar överst. Frukten som barnet räknar hänger i kronan (varje frukt har egen
  // vilo-gupp, se `_makeFruit`). Allt är dekor (eventMode 'none'), ritat i absoluta koordinater.
  //
  // `_plattprobe --medbakgrund` mätte den gamla kronan (fem stora bollar) till 265 955 px — 29 %
  // av skärmen — i EN ton. Basens puffar fylls därför med `topLightFill`, som mappas mot VARJE
  // FORMS egen bbox (ljus ovanifrån per puff, inte en enda grön silhuett). Cachad per färg.
  _makeTree(fro) {
    const rnd = slump(fro * 31 + 5)
    const tree = new Container()
    tree.eventMode = 'none'
    tree.interactiveChildren = false
    const CX = 640
    const CY = 262
    const RX = 470
    const RY = 232

    // Marken: skuggor under trädet och korgen, så de står PÅ gräset.
    const marken = new Graphics()
    marken.ellipse(CX, 626, 250, 22).fill({ color: 0x2e6b3a, alpha: 0.24 })
    marken.ellipse(CX, 626, 160, 13).fill({ color: 0x24562f, alpha: 0.22 })
    marken.ellipse(1000, 676, 184, 16).fill({ color: 0x2e6b3a, alpha: 0.26 })
    tree.addChild(marken)

    // Stam: tapererad, med rotfötter, barklinjer och en kvistknut. `cylinderFill` ger rundningen.
    const trunk = new Graphics()
    trunk
      .moveTo(534, 634)
      .quadraticCurveTo(598, 624, 602, 548)
      .quadraticCurveTo(606, 470, 598, 420)
      .lineTo(682, 420)
      .quadraticCurveTo(674, 470, 678, 548)
      .quadraticCurveTo(682, 624, 746, 634)
      .closePath()
      .fill(cylinderFill(COLORS.brown, { dark: 0.3, highlight: 0.2 }))
    trunk.moveTo(622, 600).quadraticCurveTo(612, 540, 622, 470)
    trunk.moveTo(648, 610).quadraticCurveTo(656, 540, 646, 450)
    trunk.moveTo(666, 590).quadraticCurveTo(660, 530, 668, 480)
    trunk.stroke({ width: 4, color: 0x5e3a22, alpha: 0.32, cap: 'round' })
    trunk.ellipse(628, 538, 10, 14).fill({ color: 0x5e3a22, alpha: 0.75 })
    trunk.ellipse(629, 541, 5, 8).fill({ color: 0x3f2616, alpha: 0.8 })

    // Grenar: tre kraftiga armar upp i kronan. Kronans lägsta puffar täcker det mesta;
    // det som syns är grenfästet under kronan, där frukten i mitten hänger.
    const limbs = new Graphics()
    limbs.moveTo(632, 480).quadraticCurveTo(596, 440, 536, 408)
    limbs.moveTo(648, 480).quadraticCurveTo(684, 440, 744, 408)
    limbs.moveTo(640, 480).lineTo(640, 380)
    limbs.stroke({ width: 36, color: 0x7a4d2f, cap: 'round' })
    limbs.moveTo(632, 480).quadraticCurveTo(596, 440, 536, 408)
    limbs.moveTo(648, 480).quadraticCurveTo(684, 440, 744, 408)
    limbs.stroke({ width: 10, color: 0x9a6a46, alpha: 0.5, cap: 'round' })
    tree.addChild(limbs, trunk)

    // Kronans puffar: ett förskjutet rutnät inom en ellips + knoppar längs kanten (så konturen
    // blir bucklig, inte en ellips). Luckan över stammen hålls öppen så den syns gå in i kronan.
    const puffar = []
    const lucka = (x, y) => Math.abs(x - CX) < 140 && y > 360
    for (let rad = 0; rad < 5; rad++) {
      const y0 = 90 + rad * 85
      for (let x0 = 200 + (rad % 2 ? 50 : 0); x0 <= 1090; x0 += 100) {
        const nx = (x0 - CX) / RX
        const ny = (y0 - CY) / RY
        if (nx * nx + ny * ny > 0.92 || lucka(x0, y0)) continue
        puffar.push([x0 + (rnd() - 0.5) * 24, y0 + (rnd() - 0.5) * 20, 78 + rnd() * 26])
      }
    }
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const x = CX + RX * Math.cos(a) * 0.98
      const y = CY + RY * Math.sin(a) * 0.98
      if (lucka(x, y)) continue
      puffar.push([x, y, 62 + rnd() * 20])
    }

    const back = new Graphics()
    puffar.forEach(([x, y, r]) => back.circle(x, y, r).fill(topLightFill(0x3f9a4f, { highlight: 0.12, dark: 0.22 })))
    tree.addChild(back)

    const mid = new Graphics()
    puffar.forEach(([x, y, r], i) => {
      if (i % 3 === 2) return
      mid.circle(x + 6, y - 12, r * 0.74).fill(0x54b362)
      mid.circle(x - r * 0.12, y - r * 0.42, r * 0.42).fill({ color: 0x6cc476, alpha: 0.85 })
    })
    tree.addChild(mid)

    // Ljusfläckar och bladskuggor ovanpå: kronan får struktur i stället för jämna puffar.
    const fl = new Graphics()
    puffar.forEach(([x, y, r], i) => {
      if (i % 2) return
      fl.circle(x - r * 0.26, y - r * 0.5, r * 0.26).fill({ color: 0x9be39b, alpha: 0.5 })
    })
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2
      const d = Math.sqrt(rnd()) * 0.88
      const x = CX + Math.cos(a) * RX * d
      const y = CY + Math.sin(a) * RY * d
      if (lucka(x, y)) continue
      fl.circle(x, y, 4 + rnd() * 3).fill({ color: i % 2 ? 0x2f7a3f : 0xb6ecae, alpha: i % 2 ? 0.3 : 0.4 })
    }
    tree.addChild(fl)

    // Små blommor i gräset vid roten.
    const blommor = new Graphics()
    ;[[430, 656, 0xff9ec4], [472, 674, 0xffffff], [378, 676, 0xffd35c], [526, 666, 0xff9ec4], [566, 650, 0xffffff]].forEach(([x, y, c]) => {
      blommor.moveTo(x, y).lineTo(x + 1, y - 16).stroke({ width: 2.5, color: 0x3f8f4a })
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        blommor.circle(x + 1 + Math.cos(a) * 5.5, y - 17 + Math.sin(a) * 5.5, 4.2).fill(c)
      }
      blommor.circle(x + 1, y - 17, 3).fill(0xffd35c)
    })
    tree.addChild(blommor)

    return tree
  },

  // Flätad korg: bakdel (kropp + flätlinjer + bakre kant) och framkant.
  _makeBasket() {
    const back = new Container()
    back.position.set(1000, 600)
    back.eventMode = 'none'
    back.interactiveChildren = false
    const b = new Graphics()
    // Handtag bakom korgen: en båge som gör den till en korg, inte en låda. Toppen ligger på
    // y ≈ 488, under rotens lägsta frukt i kronan.
    b.moveTo(-132, -58).bezierCurveTo(-124, -130, 124, -130, 132, -58).stroke({ width: 14, color: 0x7a4a2a, cap: 'round' })
    b.moveTo(-126, -62).bezierCurveTo(-118, -126, 118, -126, 126, -62).stroke({ width: 4, color: 0xb98457, alpha: 0.6, cap: 'round' })
    b.roundRect(-150, -46, 300, 116, 28).fill(topLightFill(COLORS.brown, { highlight: 0.18, dark: 0.18 }))
    for (let i = -120; i <= 120; i += 30) b.moveTo(i, -40).lineTo(i, 64)
    b.moveTo(-148, -8).lineTo(148, -8)
    b.moveTo(-148, 30).lineTo(148, 30)
    b.stroke({ width: 3, color: 0x6e4528, alpha: 0.35 })
    b.roundRect(-158, -66, 316, 28, 14).fill(0x9c6b46).stroke({ width: 3, color: 0x6e4528, alpha: 0.5 })
    back.addChild(b)

    const front = new Container()
    front.position.set(1000, 600)
    front.eventMode = 'none'
    front.interactiveChildren = false
    const f = new Graphics()
    f.roundRect(-150, 30, 300, 46, 22).fill(0x7a4a2a)
    for (let i = -120; i <= 120; i += 30) f.moveTo(i, 36).lineTo(i, 70)
    f.stroke({ width: 3, color: 0x5e3a22, alpha: 0.4 })
    front.addChild(f)

    return { back, front }
  },

  // En glansig, programmatisk frukt (kropp + glansdager + stjälk + blad + skugga).
  _fruitArt(fruit) {
    const c = new Container()
    // Mjuk vit halo: lyfter frukten från den gröna kronan.
    c.addChild(new Graphics().circle(0, 4, 60).fill({ color: 0xffffff, alpha: 0.38 })) // 0,22 räckte inte för päronet mot kronan
    // Markskugga.
    c.addChild(new Graphics().ellipse(0, 56, 42, 12).fill({ color: 0x000000, alpha: 0.16 }))

    const body = new Graphics()
    if (fruit.shape === 'pear') {
      body.circle(0, -22, 30).fill(fruit.body)
      body.ellipse(0, 16, 40, 46).fill(fruit.body)
      body.stroke({ width: 4, color: fruit.dark, alpha: 0.5 })
    } else if (fruit.shape === 'lemon') {
      body.ellipse(0, 4, 56, 42).fill(fruit.body).stroke({ width: 4, color: fruit.dark, alpha: 0.5 })
      body.circle(-56, 4, 7).fill(fruit.body)
      body.circle(56, 4, 7).fill(fruit.body)
    } else if (fruit.shape === 'plum') {
      body.ellipse(0, 4, 46, 52).fill(fruit.body).stroke({ width: 4, color: fruit.dark, alpha: 0.5 })
      body.moveTo(0, -44).lineTo(0, 54).stroke({ width: 3, color: fruit.dark, alpha: 0.4 })
    } else {
      body.circle(0, 6, 52).fill(fruit.body).stroke({ width: 4, color: fruit.dark, alpha: 0.5 })
      if (fruit.id === 'apple') body.ellipse(0, -38, 12, 6).fill({ color: fruit.dark, alpha: 0.5 })
    }
    c.addChild(body)

    // Glansdager (uppe till vänster).
    c.addChild(new Graphics().ellipse(-18, -16, 16, 22).fill({ color: 0xffffff, alpha: 0.45 }))
    // Stjälk + blad.
    c.addChild(new Graphics().roundRect(-3, -58, 6, 24, 3).fill(0x7a4a2a))
    const leaf = new Graphics().ellipse(0, 0, 16, 9).fill(fruit.leaf).stroke({ width: 2, color: 0x3f8f4a, alpha: 0.6 })
    leaf.position.set(16, -50)
    leaf.rotation = -0.5
    c.addChild(leaf)
    return c
  },

  // Interaktiv frukt-bricka: generös hitArea (radie 72 ≈ 144px mål) för små fingrar.
  _makeFruit(ctx, fruit) {
    const a = new Container()
    // Frukten hänger och guppar lite i grenen — i ett BARN (`_art`), så `a` (träffyta, flygtween,
    // andnings-puls) står still medan bilden rör sig. Egen fas och takt per frukt.
    const art = this._fruitArt(fruit)
    a.addChild(art)
    a._art = art
    liv(art, { bob: 3.5, sway: 0.04, duration: 2 + Math.random() * 0.9 })
    a.eventMode = 'static'
    a.cursor = 'pointer'
    a.hitArea = new Circle(0, 0, 72)
    a._picked = false
    a.on('pointertap', () => this._pick(ctx, a))
    return a
  },

  // Cellrutnät i kronan (upp till 5×2 = 10) med liten slump-jitter.
  // Ytterkolumnerna låg tidigare på 220/1060 med översta raden på 210 — utanför
  // lövkronan (närmaste bollen (370,304,r156) är 192 px bort). Hörnäpplena hängde
  // alltså i ren himmel. Kolumnerna indragna och raderna centrerade i kronan.
  _cells() {
    const xs = [300, 470, 640, 810, 980]
    const ys = [250, 410]
    const out = []
    for (const y of ys) for (const x of xs) out.push({ x: x + (Math.random() * 2 - 1) * 10, y: y + (Math.random() * 2 - 1) * 10 })
    return out
  },

  // Tomma progress-konturer kring (640, 110).
  _buildProgress(n) {
    this._progLayer.removeChildren().forEach((o) => o.destroy())
    this._progDots = []
    const gap = Math.min(58, 600 / Math.max(1, n))
    const totalW = (n - 1) * gap
    for (let i = 0; i < n; i++) {
      const d = new Graphics().circle(0, 0, 20).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 4, color: COLORS.inkSoft })
      d.position.set(640 - totalW / 2 + i * gap, 160)
      d.eventMode = 'none'
      this._progLayer.addChild(d)
      this._progDots.push(d)
    }
  },

  // Fyll i:te progress-kontur med en liten frukt-prick (rundans färg).
  _fillProgress(i) {
    const d = this._progDots?.[i]
    if (!d) return
    const dot = new Graphics().circle(0, 0, 16).fill(this._fruit.body).stroke({ width: 3, color: this._fruit.dark, alpha: 0.5 })
    dot.position.copyFrom(d.position)
    dot.eventMode = 'none'
    this._progLayer.addChild(dot)
    bounceIn(dot, { duration: 0.35 })
  },

  // Prickraden "blinkar klart": en våg av ringar längs raden när den blivit full. Vågen går
  // på de tomma KONTURERNA (som ingen annan tweenar) — frukt-prickarna ovanpå har sin egen
  // bounceIn som annars hade slagits med den.
  _pricksvep() {
    this._sweepTl?.kill()
    const dots = (this._progDots || []).filter((d) => d && !d.destroyed)
    if (!dots.length) return
    this._sweepTl = gsap.timeline({ delay: 0.3 })
    dots.forEach((d, i) => {
      this._sweepTl.to(d.scale, { x: 1.35, y: 1.35, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, i * 0.07)
    })
  },

  // Högens kanter, tak och gravitation (en ren funktion av modulens tal — `_hogprobe` bygger samma Hog).
  _hogOpt() {
    return {
      kanter: { x0: KORG_X - 136, x1: KORG_X + 136, y1: HOG_GOLV },
      postR: HOG_R, // inte en Hog-option: sonden läser radien här
      tak: 10,
      sova: true,
      gravitation: 0.9,
      // Frukten bär egna tweens (guppet, andningen, studsen vid omräkningen): döda dem före rivningen.
      bort: (p) => {
        const o = p.vy
        if (!o || o.destroyed) return
        o._art?._fxLiv?.kill()
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
        o.destroy({ children: true })
      },
    }
  },

  // Platsen för den i:te plockade frukten av `total`: x där den släpps, `restY` där den bör landa och `hoverY`
  // dit tweenen flyger den (70 px ovanför) innan fysiken tar över. Rad 0: upp till 5 bredvid varandra, vänster
  // till höger (barnet räknar i ordning). Rad 1: nästlad i gluggarna, inifrån och ut. Rad 2: nästlad ovanpå rad 1.
  // Ren funktion (rör inte `this`) — `_hogprobe` kör den.
  _hogSlot(i, total) {
    const cols = Math.min(5, Math.max(1, total))
    const baseX = KORG_X - ((cols - 1) * HOG_RAD) / 2
    let x
    let rad
    if (i < cols) {
      x = baseX + i * HOG_RAD
      rad = 0
    } else if (i < 2 * cols - 1) {
      const par = [...Array(cols - 1).keys()].sort((p, q) => Math.abs(p + 0.5 - (cols - 1) / 2) - Math.abs(q + 0.5 - (cols - 1) / 2))
      x = baseX + (par[i - cols] + 0.5) * HOG_RAD
      rad = 1
    } else {
      x = baseX + (i - (2 * cols - 1) + 1) * HOG_RAD
      rad = 2
    }
    const restY = HOG_Y0 - rad * HOG_RAD_HOJD
    return { x, restY, hoverY: restY - 70 }
  },

  // --- rund-logik ---------------------------------------------------------

  // Är nivån en "räkna alla"-runda? Nivå 0 är alltid det (introt). Därefter lottas EN plats per
  // fyrarundorsblock (nivå 1–4, 5–8 …) bland blockets andra, tredje och fjärde runda.
  _arAllaRunda(lvl) {
    if (lvl < 1) return true
    const block = Math.floor((lvl - 1) / 4)
    if (this._allaBlock !== block) {
      this._allaBlock = block
      this._allaSlot = slumpIBand(2, 1, { heltal: true }) // 1..3
    }
    return (lvl - 1) % 4 === this._allaSlot
  },

  // Ny runda: välj mål (växer med nivån), välj färsk frukttyp, spawna med studs.
  _newRound(ctx) {
    if (!this._alive) return
    this._count = 0
    this._resolving = false
    this._idle = 0
    this._picked = []

    // Runda 1 (lvl 0) är en mjuk "räkna alla"-intro (3 frukter). Redan från
    // runda 2 blir det oftast ett "tryck på N stycken"-mål med en SYNLIG mål-
    // siffra så barnet övar att stanna vid rätt antal — där räkneförståelsen
    // sitter. Var fjärde runda blir "räkna alla" igen för variation.
    //
    // U2: ingen runda är lika förutsägbar som förut. "Räkna alla" ligger kvar EN gång per
    // fyra rundor men på en lottad plats (aldrig först i blocket, så två "räkna alla" aldrig
    // kommer i rad), och målet lottas inom nivåns band (± 1 kring 2..5, golv 2, tak 5, aldrig
    // samma som förra rundans) — svårigheten står kvar, antalet är inte given på förhand.
    const lvl = this._level
    const grow = Math.min(10, 3 + lvl)
    this._goalMode = lvl >= 1 && !this._arAllaRunda(lvl)
    if (this._goalMode) {
      const mitt = 2 + ((lvl - 1) % 4)
      this._target = slumpIBand(mitt, 1, { heltal: true, golv: 2, tak: 5, forra: this._forraMal })
      this._forraMal = this._target
      this._onTree = Math.min(10, this._target + 2 + (lvl % 2)) // några extra i trädet
    } else {
      this._target = grow
      this._onTree = grow
    }

    // Färsk frukt (aldrig samma som förra rundan).
    let pool = FRUITS.filter((f) => f.id !== this._lastFruitId)
    if (!pool.length) pool = FRUITS
    this._fruit = randomFrom(pool)
    this._lastFruitId = this._fruit.id

    // Rensa förra rundans frukt (högens först: dess `bort` dödar tweens på de plockade).
    this._hog?.tom(true)
    this._appleLayer.removeChildren().forEach((o) => {
      o._art?._fxLiv?.kill() // guppet är en proxy-tween — killTweensOf(o) når den inte
      gsap.killTweensOf(o)
      gsap.killTweensOf(o.scale)
      o.destroy({ children: true })
    })
    this._apples = []
    this._breathTween?.kill()
    this._breathTarget = null

    // Nollställ den stora siffran.
    gsap.killTweensOf(this._bigNum.scale)
    this._bigNum.alpha = 0
    this._bigNum.scale.set(1)
    this._bigNum.text = ''

    this._sweepTl?.kill() // förra rundans prickvåg får inte skriva på rivna konturer
    this._buildProgress(this._target)

    // Synlig mål-siffra: bara i "tryck på N"-läget (i "räkna alla" finns inget
    // förbestämt tal att sikta mot).
    gsap.killTweensOf(this._goalBanner.scale)
    this._goalBanner.scale.set(1)
    if (this._goalMode) {
      this._goalNum.text = String(this._target)
      this._goalNum.style.fill = this._fruit.body
      this._goalBanner.visible = true
      bounceIn(this._goalBanner, { duration: 0.4 })
    } else {
      this._goalBanner.visible = false
    }

    // Återställ korgens studs-skala inför ny runda.
    gsap.killTweensOf(this._basketBack.scale)
    gsap.killTweensOf(this._basketFront.scale)
    this._basketBack.scale.set(1)
    this._basketFront.scale.set(1)

    const cells = shuffle(this._cells()).slice(0, this._onTree)
    cells.forEach((pos, i) => {
      const a = this._makeFruit(ctx, this._fruit)
      a.position.set(pos.x, pos.y)
      this._appleLayer.addChild(a)
      this._apples.push(a)
      bounceIn(a, { delay: i * 0.07 })
    })

    // Talad instruktion per runda (första rundan täcks av voiceIntro i mount). Rundan
    // byggs 1,7 s efter complete(), vars beröm är 1,0–2,3 s — och say() kapar. Orden
    // väntar in rösten; frukterna gör det inte. Vakten släpper inte en förra rundans rad.
    if (!this._first) {
      const lvl = this._level
      ctx.narTyst(() => {
        if (!this._alive || this._level !== lvl || this._resolving) return
        ctx.services.voice.say(this._goalMode ? goalIntro(this._target, this._fruit) : countAllIntro(this._fruit))
      })
    }
    this._first = false

    // Bjud in första trycket när inspelet hunnit landa (lugn andnings-puls).
    this._cueCall?.kill()
    this._cueCall = gsap.delayedCall(0.2 + this._onTree * 0.07 + 0.3, () => {
      if (this._alive) this._cueNext()
    })
  },

  // Lugn andnings-puls på en oplockad frukt för att locka nästa tryck.
  _cueNext() {
    if (!this._alive || this._resolving) return
    if (this._breathTarget && !this._breathTarget.destroyed && !this._breathTarget._picked) this._breathTarget.scale.set(1)
    this._breathTween?.kill()
    const live = (this._apples || []).filter((a) => !a._picked)
    if (!live.length) return
    const a = randomFrom(live)
    this._breathTarget = a
    this._breathTween = breathe(a, { scale: 1.1, duration: 0.85 })
  },

  // Plocka en frukt: räkna upp (ljud+ring+svävtal+stor siffra), flyg till korgen.
  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e, mal) {
    const p = mal && !mal.destroyed ? ctx.fxLayer.toLocal(mal.getGlobalPosition())
      : e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _pick(ctx, a) {
    if (!this._alive) return
    if (this._resolving || a?._picked) return this._kvitto(ctx, null, a)
    a._picked = true
    a.eventMode = 'none'
    this._idle = 0
    this._breathTween?.kill()
    this._stillaLiv(a)
    const n = ++this._count
    this._picked.push(a)

    // Omedelbar återkoppling (<100ms): ljud + ring + svävande siffra + stor siffra.
    ctx.services.audio.sfx('pop')
    ripple(ctx.fxLayer, a.x, a.y, { color: this._fruit.body, maxR: 90 })
    floatText(ctx.fxLayer, a.x, a.y - 6, String(n), { fontSize: 64, fontFamily: FONT.display, rise: 80 })
    this._showBig(n)
    this._fillProgress(n - 1)
    ctx.services.voice.say(numWord(n))

    // Flyg till korgens mynning (kort puls -> krymp + sus). Där tar högen över: frukten faller på sin plats
    // och lägger sig (`_ner`), och puff + plums + korgstuds kommer när den slår i (`_landa`).
    const slot = this._hogSlot(n - 1, this._target)
    slot.x += (Math.random() * 2 - 1) * 2
    gsap.killTweensOf(a)
    gsap.killTweensOf(a.scale)
    gsap
      .timeline()
      .to(a.scale, { x: 1.25, y: 1.25, duration: 0.1, ease: 'power2.out' })
      .to(a.scale, { x: 0.42, y: 0.42, duration: 0.45, ease: 'power2.in' })
    gsap.to(a, {
      x: slot.x,
      y: slot.hoverY,
      rotation: (Math.random() * 2 - 1) * 0.35,
      duration: 0.5,
      ease: 'power2.inOut',
      delay: 0.06,
      onComplete: () => this._ner(ctx, a, n),
    })
    ctx.services.audio.sfx('whoosh')

    if (n >= this._target) {
      this._finish(ctx)
    } else {
      this._cueCall?.kill()
      this._cueCall = gsap.delayedCall(0.45, () => {
        if (this._alive) this._cueNext()
      })
    }
  },

  // Frukten har flugit till korgens mynning: lämna över den till högen (kropp + länk), som släpper den.
  // n = den här fruktens plats (inte `_count` — snabba tryck landar sent).
  _ner(ctx, a, n) {
    if (!this._alive || !this._hog || a.destroyed) return
    const post = this._hog.lagg({ cirkel: HOG_R, vy: a, studs: 0.18, friktion: 0.5, luft: 0.02, label: 'frukt' }, a.x, a.y, { x: 0, y: 1.5 })
    if (!post) return
    post.n = n
    post.landad = false
    Body.setAngle(post.body, a.rotation)
    // Reserv: slår den aldrig i hårt nog för att höras (en tät hög) kommer kvittot ändå.
    ctx.later(0.9, () => this._landa(ctx, post))
  },

  // Taktil landning: puff + "plums"-ljud + en studs på korgen som blir DJUPARE ju fullare korgen är.
  _landa(ctx, post) {
    if (!this._alive || post.landad) return
    post.landad = true
    const a = post.vy
    if (!a || a.destroyed) return
    puff(ctx.fxLayer, a.x, a.y + 14, { count: 5, color: this._fruit.body })
    this._plums(ctx)
    const fyll = Math.min(1, post.n / Math.max(1, this._target))
    this._basketBounce(0.94 - 0.08 * fyll, 1.04 + 0.06 * fyll)
    this._cheer(1)
  },

  // Plockad frukt slutar gunga i grenen (guppet är en egen proxy-tween på `_art`).
  _stillaLiv(a) {
    const art = a?._art
    if (!art || art.destroyed) return
    art._fxLiv?.kill()
    art._fxLiv = null
    art.y = 0
    art.rotation = 0
  },

  // Visa/studsa in den stora siffran vid varje plock.
  _showBig(n) {
    this._bigNum.text = String(n)
    this._bigNum.alpha = 1
    gsap.killTweensOf(this._bigNum.scale)
    this._bigNum.scale.set(0.3)
    gsap.to(this._bigNum.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2.2)' })
  },

  // "Plums": mjuk nedåt-glidande ton när frukten landar i korgen (taktilt).
  _plums(ctx) {
    ctx.services.audio.tone({ freq: 400, slideTo: 165, dur: 0.17, type: 'sine', vol: 0.5 })
  },

  // Ekorren jublar: en studs + kinderna rodnar mer ju fullare korgen blir, så
  // barnet ser mottagaren bli gladare i takt med räknandet.
  _cheer(strength = 1) {
    const s = this._squirrel
    if (!s || s.destroyed) return
    gsap.killTweensOf(s.scale)
    gsap
      .timeline()
      .to(s.scale, { x: 1 + 0.1 * strength, y: 1 + 0.14 * strength, duration: 0.12, ease: 'power2.out' })
      .to(s.scale, { x: 1, y: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' })
    const ch = s._cheeks
    if (ch && !ch.destroyed) {
      const to = Math.min(0.95, 0.35 + (this._count / Math.max(1, this._target)) * 0.6)
      gsap.killTweensOf(ch)
      gsap.to(ch, { alpha: to, duration: 0.3 })
    }
  },

  // Liten studs på korgen (squash-and-stretch) vid varje landning / firande.
  _basketBounce(sy = 0.9, sx = 1.06) {
    ;[this._basketBack, this._basketFront].forEach((b) => {
      if (!b || b.destroyed) return
      gsap.killTweensOf(b.scale)
      gsap
        .timeline()
        .to(b.scale, { x: sx, y: sy, duration: 0.08, ease: 'power2.out' })
        .to(b.scale, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
    })
  },

  // Studsa en frukt som redan ligger i korgen (används vid omräkningen).
  _bounceFruit(a) {
    if (!a || a.destroyed) return
    const base = 0.42 // vilo-skala efter plocket
    gsap.killTweensOf(a.scale)
    gsap
      .timeline()
      .to(a.scale, { x: base * 1.45, y: base * 1.45, duration: 0.15, ease: 'power2.out' })
      .to(a.scale, { x: base, y: base, duration: 0.3, ease: 'bounce.out' })
  },

  // Runda klar: räkna OM korgen (sluter kardinalitets-loopen) -> total -> firande.
  _finish(ctx) {
    if (!this._alive) return
    this._resolving = true
    this._idle = 0
    this._breathTween?.kill()
    this._cueCall?.kill()

    // Låt de kvarvarande (oplockade) frukterna tona bort så blicken går till korgen.
    ;(this._apples || []).forEach((a) => {
      if (!a._picked && !a.destroyed) {
        gsap.killTweensOf(a)
        gsap.to(a, { alpha: 0, duration: 0.3 })
      }
    })

    ctx.services.audio.sfx('pling')
    ctx.services.voice.say(recountIntro)
    this._pricksvep()

    // Avslutande omräkning: peka blicken mot korgen och räkna de samlade
    // frukterna EN gång till ("ett, två, tre — tre äpplen!") medan var och en
    // studsar — barnet ser mängden OCH hör talet ihop.
    const step = 0.6
    const lead = 1.1
    this._recountTl?.kill()
    this._recountTl = gsap.timeline()
    this._picked.forEach((a, i) => {
      this._recountTl.call(
        () => {
          if (!this._alive) return
          this._bounceFruit(a)
          this._basketBounce(0.94, 1.04)
          this._cheer(0.6)
          ctx.services.audio.tone({ freq: 520 + i * 40, dur: 0.12, type: 'triangle', vol: 0.3 })
          this._showBig(i + 1)
          ctx.services.voice.say(numWord(i + 1))
        },
        null,
        lead + i * step,
      )
    })

    const endAt = lead + this._picked.length * step + 0.2
    this._recountTl.call(
      () => {
        if (!this._alive) return
        this._showBig(this._target)
        ctx.services.audio.sfx('correct')
        burst(ctx.fxLayer, 1000, 500, { count: 18, power: 1.1 })
        this._basketBounce(0.84, 1.1)
        this._cheer(1.6)
        this._shakeTween = shake(this._root, { intensity: 6, duration: 0.4 })
        // Pedagogisk total ("Tre äpplen!" / "Du tryckte på fyra äpplen!").
        ctx.services.voice.say(this._goalMode ? goalFinish(this._target, this._fruit) : totalPhrase(this._target, this._fruit))
      },
      null,
      endAt,
    )

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)

    // Stora firandet (konfetti + beröm + stjärna + klistermärke) EFTER att totalen
    // hörts — complete() sköter allt det, vi dubblerar det inte.
    this._complete = gsap.delayedCall(endAt + 1.2, () => {
      if (this._alive) ctx.progress.complete()
    })
    this._next = gsap.delayedCall(endAt + 2.9, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Tomt tryck (bredvid frukten): mjukt ljud + ring där fingret var + vänlig vingel.
  _emptyTap(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    ctx.services.audio.sfx('soft')
    if (e?.global) {
      const p = this._root.toLocal(e.global)
      ripple(ctx.fxLayer, p.x, p.y, { color: COLORS.green, maxR: 70 })
    }
    const live = (this._apples || []).filter((a) => !a._picked)
    if (live.length) wiggle(randomFrom(live))
  },

  // Idle-recue: ~6s utan plock -> upprepa ledtråd + vingla en oplockad frukt.
  _update(ctx, ticker) {
    if (!this._alive) return
    this._hog?.update(ticker.deltaMS) // stegar högen också under omräkningen
    if (this._resolving) return
    // Tomgången räknas från TYSTNAD: medan en replik talar står klockan still (V21 —
    // annars kapar påminnelsens say() en replik som redan talar).
    if (ctx.services.voice.talar) this._idle = 0
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && this._count < this._target) {
      this._idle = 0
      ctx.services.voice.say(`Tryck på ${this._fruit.art} ${this._fruit.one} till!`)
      const live = (this._apples || []).filter((a) => !a._picked)
      if (live.length) wiggle(randomFrom(live))
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._complete?.kill()
    this._next?.kill()
    this._cueCall?.kill()
    this._breathTween?.kill()
    this._shakeTween?.kill()
    this._recountTl?.kill()
    this._sweepTl?.kill()
    this._hog?.destroy()
    this._hog = null
    ;(this._apples || []).forEach((a) => {
      a._art?._fxLiv?.kill()
      gsap.killTweensOf(a)
      gsap.killTweensOf(a.scale)
    })
    gsap.killTweensOf(this._bigNum?.scale)
    gsap.killTweensOf(this._goalBanner?.scale)
    gsap.killTweensOf(this._basketBack?.scale)
    gsap.killTweensOf(this._basketFront?.scale)
    this._squirrelIdle?.kill()
    gsap.killTweensOf(this._squirrel?.scale)
    if (this._squirrel?._cheeks) gsap.killTweensOf(this._squirrel._cheeks)
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

