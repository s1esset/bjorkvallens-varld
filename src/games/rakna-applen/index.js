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
import { bounceIn, wiggle, floatText, ripple, shake, burst, breathe, puff } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

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

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Marknadsmässig bakgrund: mjuk äng med sol, kullar och drivande moln.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // 2) Heltäckande, osynlig tap-fångare (ligger UNDER frukten): tryck bredvid
    //    frukten -> mjukt ljud + vänlig vingel + en liten ring där fingret var.
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._root.addChild(tap)

    // 3) Trädet som frukten hänger i (programmatiskt, dekorativt).
    this._root.addChild(this._makeTree())

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

    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // --- scen-byggare -------------------------------------------------------

  // Charmigt träd: stam + organisk lövkrona i två gröna toner (för djup).
  _makeTree() {
    const tree = new Container()
    tree.eventMode = 'none'
    tree.interactiveChildren = false

    // Stam med en mörk mittlinje och liten rotuppsving nedtill.
    const trunk = new Graphics()
    trunk.roundRect(-52, 320, 104, 304, 26).fill(COLORS.brown)
    trunk.roundRect(-78, 588, 156, 40, 24).fill(COLORS.brown)
    trunk.moveTo(0, 340).lineTo(0, 600).stroke({ width: 6, color: 0x6e4528, alpha: 0.4 })
    trunk.position.set(640, 0)
    tree.addChild(trunk)

    // Lövkrona: mörka bas-bollar + ljusare topp-bollar.
    const back = new Graphics()
    const blobs = [
      [640, 300, 270],
      [370, 330, 190],
      [910, 330, 190],
      [520, 200, 170],
      [760, 200, 170],
    ]
    blobs.forEach(([x, y, r]) => back.circle(x, y, r).fill(0x49a657))
    tree.addChild(back)

    const front = new Graphics()
    blobs.forEach(([x, y, r]) => front.circle(x, y - 26, r - 34).fill(0x63c46f))
    tree.addChild(front)

    return tree
  },

  // Flätad korg: bakdel (kropp + flätlinjer + bakre kant) och framkant.
  _makeBasket() {
    const back = new Container()
    back.position.set(1000, 600)
    back.eventMode = 'none'
    back.interactiveChildren = false
    const b = new Graphics()
    b.roundRect(-150, -46, 300, 116, 28).fill(COLORS.brown)
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
    c.addChild(new Graphics().circle(0, 4, 60).fill({ color: 0xffffff, alpha: 0.22 }))
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
    a.addChild(this._fruitArt(fruit))
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

  // Stapelplats i korgen för det i:te plockade frukten (upp till 5 per rad).
  _stackPos(i, total) {
    const cols = Math.min(5, total)
    const spacing = 52
    const col = i % cols
    const row = Math.floor(i / cols)
    const baseX = 1000 - ((cols - 1) * spacing) / 2
    return { x: baseX + col * spacing + (Math.random() * 2 - 1) * 4, y: 600 - row * 42 }
  },

  // --- rund-logik ---------------------------------------------------------

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
    const lvl = this._level
    const grow = Math.min(10, 3 + lvl)
    this._goalMode = lvl >= 1 && lvl % 4 !== 0
    if (this._goalMode) {
      this._target = 2 + ((lvl - 1) % 4) // 2..5 att trycka på (börjar på 2)
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

    // Rensa förra rundans frukt.
    this._appleLayer.removeChildren().forEach((o) => {
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

    // Talad instruktion per runda (första rundan täcks av voiceIntro i mount).
    if (!this._first) {
      ctx.services.voice.say(this._goalMode ? goalIntro(this._target, this._fruit) : countAllIntro(this._fruit))
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
  _pick(ctx, a) {
    if (!this._alive || this._resolving || a._picked) return
    a._picked = true
    a.eventMode = 'none'
    this._idle = 0
    this._breathTween?.kill()
    const n = ++this._count
    this._picked.push(a)

    // Omedelbar återkoppling (<100ms): ljud + ring + svävande siffra + stor siffra.
    ctx.services.audio.sfx('pop')
    ripple(ctx.fxLayer, a.x, a.y, { color: this._fruit.body, maxR: 90 })
    floatText(ctx.fxLayer, a.x, a.y - 6, String(n), { fontSize: 64, fontFamily: FONT.display, rise: 80 })
    this._showBig(n)
    this._fillProgress(n - 1)
    ctx.services.voice.say(numWord(n))

    // Flyg till korgen (kort puls -> krymp + sus), liten puff vid landning.
    const stack = this._stackPos(n - 1, this._target)
    gsap.killTweensOf(a)
    gsap.killTweensOf(a.scale)
    gsap
      .timeline()
      .to(a.scale, { x: 1.25, y: 1.25, duration: 0.1, ease: 'power2.out' })
      .to(a.scale, { x: 0.42, y: 0.42, duration: 0.45, ease: 'power2.in' })
    gsap.to(a, {
      x: stack.x,
      y: stack.y,
      rotation: (Math.random() * 2 - 1) * 0.35,
      duration: 0.5,
      ease: 'power2.inOut',
      delay: 0.06,
      onComplete: () => {
        if (!this._alive) return
        if (!a.destroyed) puff(ctx.fxLayer, stack.x, stack.y + 8, { count: 5, color: this._fruit.body })
        // Taktil landning: "plums"-ljud + en liten studs på korgen.
        this._plums(ctx)
        this._basketBounce(0.9, 1.06)
        this._cheer(1)
      },
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
    if (!this._alive || this._resolving) return
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
    if (!this._alive || this._resolving) return
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
    ;(this._apples || []).forEach((a) => {
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

// Ekorren som tar emot frukten (gate-punkt 4: mottagare). Origo mellan fötterna.
// Kinderna ligger i ett eget lager så de kan rodna mer ju fullare korgen blir.
function makeSquirrel() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const fur = 0xc4763f
  const furDark = 0x8a5030
  const belly = 0xf0c9a0

  const g = new Graphics()
  // Svans: stor plym bakom ryggen (ritas först = längst bak).
  g.moveTo(-24, -12).quadraticCurveTo(-94, -22, -80, -98)
  g.quadraticCurveTo(-72, -146, -28, -130)
  g.quadraticCurveTo(-58, -120, -58, -92)
  g.quadraticCurveTo(-60, -46, -20, -42).closePath()
  g.fill(fur).stroke({ width: 4, color: furDark })
  // Fötter.
  g.ellipse(-14, -6, 14, 9).fill(furDark)
  g.ellipse(14, -6, 14, 9).fill(furDark)
  // Armar (bakom kroppen så tassarna sticker fram vid sidorna).
  g.roundRect(-35, -74, 12, 34, 6).fill(fur).stroke({ width: 3, color: furDark })
  g.roundRect(23, -74, 12, 34, 6).fill(fur).stroke({ width: 3, color: furDark })
  // Kropp.
  g.ellipse(0, -50, 31, 44).fill(fur).stroke({ width: 4, color: furDark })
  g.ellipse(0, -44, 19, 29).fill(belly)
  // Öron + huvud.
  g.ellipse(-19, -116, 10, 14).fill(fur).stroke({ width: 3, color: furDark })
  g.ellipse(19, -116, 10, 14).fill(fur).stroke({ width: 3, color: furDark })
  g.circle(0, -100, 28).fill(fur).stroke({ width: 4, color: furDark })
  g.ellipse(0, -90, 15, 11).fill(belly)
  g.circle(-10, -104, 5).fill(0x2b2b2b)
  g.circle(10, -104, 5).fill(0x2b2b2b)
  g.circle(-8, -106, 2).fill(0xffffff)
  g.circle(12, -106, 2).fill(0xffffff)
  g.ellipse(0, -93, 5, 4).fill(0x2b2b2b)
  // moveTo före arc — annars drar Pixi v8 ett streck från origo till munnens start.
  const a0 = 0.15 * Math.PI
  g.moveTo(9 * Math.cos(a0), -89 + 9 * Math.sin(a0))
  g.arc(0, -89, 9, a0, 0.85 * Math.PI).stroke({ width: 3, color: 0x2b2b2b, cap: 'round' })
  g.eventMode = 'none'

  const cheeks = new Graphics()
  cheeks.circle(-19, -95, 7).fill(0xef8fa4)
  cheeks.circle(19, -95, 7).fill(0xef8fa4)
  cheeks.alpha = 0.35
  cheeks.eventMode = 'none'

  c.addChild(g, cheeks)
  c._cheeks = cheeks
  return c
}
