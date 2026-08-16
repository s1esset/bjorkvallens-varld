// Balanstornet — bygg ett torn på en planka som VIPPAR (3–5 år).
//
// Skillnaden mot `bygg-tornet` är underlaget: där släpper en kran klossen rakt ner på
// FAST mark, här DRAR barnet klossen dit den ska och plankan ligger på en rund stödpunkt.
// Viktfördelningen vänster/höger ÄR spelet: en tung kloss ytterst lutar plankan tio
// grader, en liten i mitten nästan ingenting, och lutningen syns direkt i vattenpasset
// på stödet. Lutar det för mycket åt ett håll för länge tippar hela bygget ner i
// höet — vilket ALDRIG är ett fall: Bobo skrattar, och tornet byggs upp igen från
// den bästa höjd barnet nått. Efter var tredje tipp blir stödpunkten bredare (no-fail).
//
// FYSIK (matter.js). Plankan är en dynamisk kropp fastnålad i stödpunkten med en
// revolut-constraint; klossarnas egen tyngd ger vridmomentet helt av sig själv. Stödets
// BREDD modelleras som ett återförande vridmoment i `phys.beforeStep()`:
//
//     torque += -(vinkel − vila) · STOD_K − vinkelfart · STOD_DAMP
//
// Jämvikten blir då klossarnas moment delat med STOD_K, alltså en lutning som är ett
// ärligt mått på obalansen. Kalibrerat mot matter utan webbläsare (gravitation 1,2,
// plankan 660×28 vid density 0,0016): en TUNG kloss ytterst ger 0,183 rad ≈ 10,5°, en
// MELLAN 0,087, en LITEN 0,043, ballongklossen 0,012 — och två tunga på samma ytterläge
// hamnar på 0,33–0,36 och passerar tippgränsen 0,32. Det är de talen hela
// svårighetskurvan vilar på; ändra inte STOD_K utan att mäta om dem.
//
// Fällor som respekteras med flit (CLAUDE.md):
// · Ingen kropp BÄRS. Klossen dras som ren Pixi-vy och får sin matter-kropp först när
//   den släpps — `Body.setPosition(kropp, p, true)` på en buren kropp lämnar kvar en
//   fart för alltid och får lösaren att läsa kontakten som separerande.
// · Stödmomentet drivs i `beforeStep()` (en gång per FAST steg), aldrig per bildruta:
//   en tappad bildruta är 1–5 steg och konstanterna är per steg.
// · Sidodekoren har INGEN kropp. Höbalarna som stod där hade klossens silhuett (rundad
//   rektangel med band) och lästes som byggbitar; buskarna som ersatte dem är rent
//   organiska och får inte heller gå att stapla på.
// · `addTarget`-noderna (kolumnmarkörerna) animeras ALDRIG — pilen som guppar är ett
//   BARN till dem, så snäppytan står still. Samma sak för klossarna på bänken.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, Composite, Matter, mat } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { DragController } from '../../lib/DragController.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { pop, wiggle, puff, sparkle, floatText, bigCelebration, liv, stegra, kvittera } from '../../lib/feedback.js'
import { COLORS } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { groundFill, topLightFill, cylinderFill } from '../../lib/form.js'

const { Constraint } = Matter

// ---- Geometri (designkoordinater 1280×720) --------------------------------
const GY = 640 // markens ovansida
const PX = 640 // stödpunktens mitt = plankans vridpunkt
const PY = 496
const PLANK_W = 660
const PLANK_H = 28
const PLANK_TOP = PY - PLANK_H / 2 // klossarnas vilolinje när plankan är rak
const PLANK_HALV = PLANK_W / 2

// Fyra placeringskolumner, 120 px isär = 96 px träffyta + 24 px mellanrum (P0).
// INGEN kolumn ligger på stödpunkten. En kolumn rakt över vridpunkten ger matematiskt
// noll vridmoment hur tungt man än staplar där — "lägg allt i mitten" vann alltid, och
// då är balansen (spelets hela idé) frivillig. Med ±60 px som närmaste plats kostar
// varje kloss något, och att bygga stadigt blir ett VAL mellan sidorna i stället för
// en genväg. Symmetrin runt plankans mitt är kvar.
const KOL = [PX - 180, PX - 60, PX + 60, PX + 180]
const SLAPP_MIN_Y = 70
const SLAPP_MAX_Y = PY - 130

// Sidorna bar förr två höbalar. De var rundade rektanglar med band tvärsöver — alltså
// exakt samma silhuett som spelets klossar — och lästes som "klossar jag kan dra dit".
// De fångade inget som marken inte redan fångar (plankans ändar pekar mot HO_HOG_X, och
// markkroppen är 1900 px bred), så de är utbytta mot buskar: organisk siluett, inga
// raka kanter, inget som liknar en byggbit.
const BUSKE_X = [170, 1104] // buskar vid sidorna (utanför plankans svepyta)
const HO_HOG_X = [340, 940] // utspritt hö rakt under plankans ändar — dit klossarna ramlar
const FLAGG_X = 1214
const BOBO_X = 790
const BOBO_Y = 566
// Byggbänken längst ner. Mittplatsen låg först på 640 — rakt framför stödpunkten, så
// klossen täckte vattenpasset och tornets vridpunkt blev svårläst; nu ligger de två
// vänstra platserna vid sidan av stödet och Bobo.
// Avståndet är räknat på den BREDASTE träffytan, inte på bilden: `halvB` blir 101 för
// "stor" och 84 för "mellan", så 200 px isär gav 15 px mellanrum när de två hamnade
// bredvid varandra — under P0:s 24 px, i ungefär var tredje runda. 250 px ger 48 px
// i det värsta paret (stor + stor).
const HYLLA_X = [250, 500, 950]
// Bänken låg först på 678/706: den största klossen (66 px hög) sträckte sig då till
// y=711 och bänkskivan till 776 — halva hyllan hamnade UTANFÖR 720-ytan i skärmdumpen.
// 636/668 håller hela klossen innanför designhöjden och lämnar bänkskivan som en
// synlig list längst ner.
const HYLLA_Y = 636
const BANK_Y = 668

// ---- Fysik ----------------------------------------------------------------
const G = 1.2
const STOD_DAMP = 280 // dämpning av plankans vinkelfart (uppmätt: ~24 % översläng)
// Stödpunktens bredd = hur hårt den håller emot. Smal = känslig, bred = förlåtande.
const STOD = [
  { key: 'smal', k: 48, halv: 34 },
  { key: 'mellan', k: 58, halv: 46 },
  { key: 'bred', k: 72, halv: 60 },
]
const TRAPPA_K = 13 // no-fail: stödet blir bredare efter var tredje tipp
const TRAPPA_HALV = 9
const TIPP = 0.32 // rad — över detta lutar tornet för mycket
const TIPP_HALL = 0.3 // s som lutningen måste ligga kvar innan det räknas som ett tipp
const MAX_LUT = 0.4 // hård nödbroms (plankans spets når då y ≈ 624, ovanför bänken)
const TIPP_PAUS = 1.6 // s innan ett nytt tipp kan registreras (TAK på motgången)

// Klosstyperna — riktig massa, riktig silhuett. Massan är w·h·density:
// liten 8,6 · mellan 16,3 · stor 29,2 · ballong 2,5.
const SPEC = {
  liten: { key: 'liten', w: 100, h: 54, d: 0.0016, farg: COLORS.yellow },
  mellan: { key: 'mellan', w: 136, h: 60, d: 0.002, farg: COLORS.blue },
  stor: { key: 'stor', w: 170, h: 66, d: 0.0026, farg: COLORS.red },
  ballong: { key: 'ballong', w: 124, h: 58, d: 0.00035, farg: COLORS.pink },
}
const VANLIGA = ['liten', 'mellan', 'stor']

const KLOSS_OPTS = (s) =>
  s.key === 'ballong'
    ? mat('gummi', { density: s.d, friction: 0.6, frictionStatic: 1, frictionAir: 0.06, restitution: 0.18, label: 'kloss' })
    : mat('tra', { density: s.d, friction: 0.72, frictionStatic: 1.2, frictionAir: 0.02, restitution: 0.02, label: 'kloss' })

// Stigande pentatonik: man HÖR hur högt tornet är.
const VANINGSTON = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51]

const BEROM = ['Så högt!', 'Fint placerat!', 'En våning till!', 'Stadigt och fint!']
const IDLE = ['Dra en kloss ut på plankan!', 'Var ska nästa kloss stå? Prova mitten!']
const TAPP_ROP = ['Hoppsan!', 'Plums!', 'Hihi!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'balanstornet',
  titleSv: 'Balanstornet',
  icon: '⚖️',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'balanstornet',
  voiceIntro: 'Bygg ett torn på plankan! Dra en kloss dit du vill.',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._tippT = 0
    this._stabilT = 0
    this._markorT = 0
    this._sistTipp = -99
    this._sistTapp = -99
    this._sistKnak = -99
    this._sistBerom = -99
    this._klar = false
    this._tippar = false
    this._duckar = false
    this._tippRakning = 0
    this._trappa = 0
    this._flaggGlod = 0
    this._slotY = 360
    this._lutBand = -1
    this._sagtBallong = false
    this._klossar = [] // { view, inner, body, spec }
    this._hylla = [] // { view, inner, spec, plats, rec, livTw }
    this._basta = [] // klosspecar (nederst först) vid bästa stabila höjd
    this._bastaY = PLANK_TOP

    this._niva = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._phys = new PhysicsWorld({ gravityY: G, walls: ['floor', 'left', 'right'] })
    this._unbindLjud = this._phys.impactAudio(ctx.services.audio, { vol: 0.22, hardSpeed: 12 })
    this._unbindSlag = this._phys.onImpact((h) => this._anslag(ctx, h), { minSpeed: 2.2, maxPerFrame: 2 })
    this._unbindSteg = this._phys.beforeStep(() => this._stod())

    this._byggScen(ctx)
    this._byggPlanka()

    this._drag = new DragController({ space: this._root, services: ctx.services, skugga: true })
    this._byggMarkorer(ctx)

    this._nyRunda(ctx, true)

    this._tick = (t) => this._uppdatera(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scen ---------------------------------------------------------------

  _byggScen(ctx) {
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, ground: false }))

    // Osynlig tryckyta längst ner i ritordningen: en pekning som inte träffar något
    // annat ska ändå få ett svar inom 100 ms (P0 ÅTERKOPPLING).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatch = (e) => this._tomTryck(ctx, e)
    this._catcher.on('pointertap', this._onCatch)
    this._root.addChild(this._catcher)

    // Mark med grässtrån.
    const mark = new Graphics()
    mark.rect(0, GY, ctx.width, ctx.height - GY).fill(groundFill(0x86d27a))
    mark.rect(0, GY, ctx.width, 12).fill({ color: COLORS.greenDark, alpha: 0.55 })
    for (let i = 0; i < 44; i++) {
      const gx = (i * 137) % ctx.width
      const gy = GY + 18 + ((i * 53) % 26)
      mark.moveTo(gx, gy).lineTo(gx + 3, gy - 13).stroke({ width: 3, color: COLORS.greenDark, alpha: 0.4 })
    }
    // Utspritt hö där plankans ändar pekar — det är HIT klossarna ramlar.
    for (const hx of HO_HOG_X) ritaHohog(mark, hx, GY)
    mark.eventMode = 'none'
    this._root.addChild(mark)

    // Marken som kropp: klossarna ska landa mjukt i höet, inte falla ur bild.
    this._phys.rectangle(640, GY + 130, 1900, 260, { isStatic: true, friction: 1, label: 'mark' })

    // Buskar vid sidorna — ren dekor UTAN kropp. En kloss som skulle nå så långt ut
    // landar i markkroppen precis som förut; buskarna ska inte kunna staplas på.
    for (const bx of BUSKE_X) this._root.addChild(makeBuske(bx, GY))

    // Flaggstången med målflaggan.
    this._flaggstang = new Graphics()
    this._flaggstang.eventMode = 'none'
    this._root.addChild(this._flaggstang)
    this._flagga = makeFlagga()
    this._flagga.eventMode = 'none'
    this._root.addChild(this._flagga)

    // Stödpunkten (ritas om när bredden ändras) + vattenpasset som visar lutningen.
    this._stodView = new Graphics()
    this._stodView.eventMode = 'none'
    this._root.addChild(this._stodView)

    this._pass = new Container()
    this._pass.eventMode = 'none'
    this._passRor = new Graphics()
    this._passBubbla = new Graphics()
    this._pass.addChild(this._passRor, this._passBubbla)
    this._pass.position.set(PX, 566)
    this._root.addChild(this._pass)
    this._ritaPass(0)

    // Mottagaren: Bobo står vid stödpunkten, hejar per kloss och duckar när det lutar.
    // Riggen ligger i en YTTRE container — spelet äger duckningen där, riggen sin egen
    // view (jubel/hoppsan flyttar den relativt). Två skrivare på samma nod hackar.
    this._bobo = new Container()
    this._kar = makeKaraktar({ r: 42 })
    this._bobo.addChild(this._kar.view)
    this._bobo.position.set(BOBO_X, BOBO_Y)
    this._bobo.eventMode = 'none'
    this._bobo.interactiveChildren = false
    this._root.addChild(this._bobo)

    // Plankan under klossarna, klossarna ovanpå.
    this._plankLager = new Container()
    this._plankLager.eventMode = 'none'
    this._plankLager.interactiveChildren = false
    this._root.addChild(this._plankLager)

    this._blockLager = new Container()
    this._blockLager.eventMode = 'none'
    this._blockLager.interactiveChildren = false
    this._root.addChild(this._blockLager)

    // Byggbänken (förgrund) med tre platser.
    const bank = new Graphics()
    bank.roundRect(-30, BANK_Y, ctx.width + 60, 70, 18).fill(topLightFill(0xa5714c))
    bank.roundRect(-30, BANK_Y, ctx.width + 60, 13, 8).fill({ color: 0xc9955f, alpha: 0.9 })
    for (const hx of HYLLA_X) {
      bank.roundRect(hx - 88, BANK_Y + 6, 176, 9, 5).fill({ color: 0x7a4d2e, alpha: 0.45 })
    }
    bank.eventMode = 'none'
    this._root.addChild(bank)

    this._markorLager = new Container()
    this._root.addChild(this._markorLager)

    this._hyllLager = new Container()
    this._root.addChild(this._hyllLager)
  },

  _byggPlanka() {
    this._plankBody = this._phys.rectangle(PX, PY, PLANK_W, PLANK_H, {
      ...mat('tra'),
      density: 0.0016,
      friction: 0.86,
      frictionStatic: 1.5,
      frictionAir: 0.02,
      restitution: 0.02,
      label: 'planka',
    })
    this._constraint = Constraint.create({
      pointA: { x: PX, y: PY },
      bodyB: this._plankBody,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1,
    })
    Composite.add(this._phys.world, this._constraint)

    this._plankView = makePlanka()
    this._plankView.eventMode = 'none'
    this._plankLager.addChild(this._plankView)
    this._phys.link(this._plankBody, this._plankView)
  },

  // Kolumnmarkörerna (en per KOL). De är DragControllerns MÅL (tap-tap-fallbacken: tryck på
  // klossen, tryck sedan på en kolumn). Själva mål-noden står alltid still —
  // guppningen ligger i ett barn, annars flyttar snäppytan sig mitt i ett släpp.
  _byggMarkorer(ctx) {
    this._markorer = []
    KOL.forEach((x, i) => {
      const c = new Container()
      c.position.set(x, this._slotY)
      c.hitArea = new Rectangle(-48, -120, 96, 260)
      c.alpha = 0.34
      c._btKol = i
      const inner = new Container()
      const g = new Graphics()
      g.moveTo(0, 28)
        .lineTo(-17, 3)
        .lineTo(-7, 3)
        .lineTo(-7, -22)
        .lineTo(7, -22)
        .lineTo(7, 3)
        .lineTo(17, 3)
        .closePath()
        .fill(topLightFill(COLORS.yellow))
        .stroke({ width: 3, color: COLORS.orangeDark, alpha: 0.85 })
      g.eventMode = 'none'
      inner.addChild(g)
      inner.eventMode = 'none'
      c.addChild(inner)
      this._markorLager.addChild(c)
      // MIN lyssnare först, DragControllerns tap-tap efter: då hinner jag se att en
      // kloss är vald och håller mig undan (annars hade kvittot ljudit ovanpå släppet).
      c.on('pointertap', () => this._markorTryck(ctx, i))
      const rec = this._drag.addTarget(c, () => true, { hitRadius: 92 })
      this._markorer.push({ view: c, inner, kol: i, rec, livTw: liv(inner, { bob: 5, sway: 0.05, duration: 2.2, phase: i / KOL.length }) })
    })
  },

  // ---- Runda / nivå -------------------------------------------------------

  _nyRunda(ctx, forsta = false) {
    if (!this._alive) return
    this._finishTl?.kill()
    this._finishTl = null
    this._flaggVift?.kill()
    this._flaggVift = null

    this._klar = false
    this._tippar = false
    this._tippT = 0
    this._stabilT = 0
    this._tippRakning = 0
    this._trappa = 0
    this._basta = []
    this._bastaY = PLANK_TOP
    this._sagtBallong = false
    this._idle = 0
    this._flaggGlod = 0

    this._rensaKlossar()

    // VARIATION: stödpunktens bredd och plankans startlutning slumpas per runda.
    this._stodIdx = forsta ? 1 : (Math.random() * STOD.length) | 0
    this._vila = forsta ? 0 : randomFrom([-0.07, -0.04, 0, 0.04, 0.07])
    this._satStod()

    Body.setAngle(this._plankBody, this._vila)
    Body.setAngularVelocity(this._plankBody, 0)
    Body.setVelocity(this._plankBody, { x: 0, y: 0 })

    // Målhöjden växer med nivån (150 px ≈ knappt tre våningar, 320 ≈ knappt sex).
    this._malH = Math.min(150 + this._niva * 40, 320)
    this._flaggY = PLANK_TOP - this._malH
    this._ritaFlaggstang()
    if (this._flagga && !this._flagga.destroyed) {
      this._flagga.position.set(FLAGG_X - 4, this._flaggY)
      this._flagga.scale.set(1)
      if (this._flagga._btDuk && !this._flagga._btDuk.destroyed) this._flagga._btDuk.scale.set(1)
    }

    this._fyllHylla(ctx)
    this._flyttaMarkorer(true)
  },

  _satStod() {
    const s = STOD[this._stodIdx]
    this._stodK = s.k + this._trappa * TRAPPA_K
    this._stodHalv = s.halv + this._trappa * TRAPPA_HALV
    ritaStod(this._stodView, this._stodHalv)
  },

  _ritaFlaggstang() {
    const g = this._flaggstang
    if (!g || g.destroyed) return
    const topp = Math.max(88, this._flaggY - 110)
    g.clear()
    g.ellipse(FLAGG_X, GY + 4, 46, 12).fill({ color: 0x000000, alpha: 0.14 })
    g.roundRect(FLAGG_X - 28, GY - 28, 56, 32, 10).fill(topLightFill(0x9aa4b0)).stroke({ width: 3, color: 0x6d7783 })
    g.roundRect(FLAGG_X - 7, topp, 14, GY - topp, 7).fill(cylinderFill(0xd8c3a5)).stroke({ width: 3, color: 0x9c8a6b })
    g.circle(FLAGG_X, topp + 2, 11).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orangeDark })
    // Målstrecket: en streckad linje in mot tornet så höjden går att sikta mot.
    // Den började på x 706 — 66 px till HÖGER om plankans mitt (PX 640), alltså precis
    // utanför den enda plats tornet kan växa på. Linjen låg då i tom himmel och gick
    // aldrig att sikta MOT något. Den startar nu vänster om mitten, så tornets topp och
    // strecket möts i samma blickfång. Flaggstången ligger tidigt i barnordningen och
    // hamnar därför BAKOM klossarna — strecket skymmer inget.
    for (let x = PX - 40; x < FLAGG_X - 48; x += 36) {
      g.roundRect(x, this._flaggY - 3, 20, 6, 3).fill({ color: COLORS.white, alpha: 0.5 })
    }
    this._flaggToppY = topp + 18
  },

  // ---- Byggbänken ---------------------------------------------------------

  _fyllHylla(ctx) {
    for (const h of this._hylla) this._taBortHyllKloss(h)
    this._hylla = []
    HYLLA_X.forEach((x, i) => {
      ctx.later(i * 0.09, () => {
        if (this._alive) this._nyHyllKloss(ctx, i)
      })
    })
  },

  _nyHyllKloss(ctx, plats) {
    if (!this._alive) return null
    const finns = this._hylla.filter((h) => h && h.plats !== plats).map((h) => h.spec.key)
    let key
    // Sällsynt ballongkloss: väger nästan ingenting och får tornet att svaja lustigt.
    if (!finns.includes('ballong') && this._klossar.length >= 1 && Math.random() < 0.14) key = 'ballong'
    else {
      const kvar = VANLIGA.filter((k) => !finns.includes(k))
      key = randomFrom(kvar.length ? kvar : VANLIGA)
    }
    const spec = SPEC[key]
    const { outer, inner } = makeKloss(spec)
    outer.position.set(HYLLA_X[plats], HYLLA_Y)
    const halvB = Math.max(60, spec.w / 2 + 16)
    outer.hitArea = new Rectangle(-halvB, -60, halvB * 2, 120)
    this._hyllLager.addChild(outer)

    const post = { view: outer, inner, spec, plats }
    post.rec = this._drag.addItem(outer, spec, {
      onCorrect: (r, target) => this._placera(ctx, r, target.view._btKol ?? 2),
      onMiss: (r) => this._slapptFritt(ctx, r),
      onSelect: () => this._blinkaMarkorer(),
    })
    outer.on('pointerdown', () => {
      if (!this._alive) return
      this._idle = 0
      ctx.services.audio.sfx('tap')
      pop(inner, { scale: 1.1 })
      this._blinkaMarkorer()
    })
    // Eget liv i vila — i ett BARN, så hemläget och träffytan står still.
    post.livTw = liv(inner, { bob: 4, sway: 0.025, duration: 2.6, phase: Math.random() })
    this._hylla[plats] = post
    pop(outer)

    if (key === 'ballong' && !this._sagtBallong) {
      this._sagtBallong = true
      ctx.services.voice.say('En ballongkloss! Den väger nästan ingenting.')
      sparkle(ctx.fxLayer, outer.x, outer.y - 50, { count: 7 })
    }
    return post
  },

  _taBortHyllKloss(h) {
    if (!h) return
    h.livTw?.kill()
    h.inner?._fxLiv?.kill()
    this._drag?.removeItem(h.view)
    if (h.view && !h.view.destroyed) {
      gsap.killTweensOf(h.view)
      gsap.killTweensOf(h.view.scale)
      gsap.killTweensOf(h.inner)
      gsap.killTweensOf(h.inner.scale)
      h.view.destroy({ children: true })
    }
  },

  // ---- Placering ----------------------------------------------------------

  // Släppt utan att träffa en markör: ligger släppet i byggzonen placerar vi ändå, på
  // närmaste kolumn. Utanför zonen glider klossen hem igen — aldrig en tillsägelse.
  _slapptFritt(ctx, rec) {
    if (!this._alive) return
    const x = rec.tx
    const y = rec.ty
    if (x < 290 || x > 990 || y > 570 || y < 30) {
      ctx.services.audio.sfx('soft')
      wiggle(rec.view)
      return
    }
    let kol = 0
    let bast = Infinity
    KOL.forEach((kx, i) => {
      const d = Math.abs(kx - x)
      if (d < bast) {
        bast = d
        kol = i
      }
    })
    gsap.killTweensOf(rec.view)
    this._placera(ctx, rec, kol)
  },

  _placera(ctx, rec, kol) {
    if (!this._alive || !rec?.view || rec.view.destroyed) return
    if (this._tippar || this._klar) {
      // Upptaget (tornet ramlar / firandet rullar): klossen glider hem, och barnet får
      // ändå ett kvitto på att fingret nådde fram (P0 — tystnad är inte en paus).
      rec.placed = false
      rec.view.eventMode = 'static'
      gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.3, ease: 'back.out(1.4)' })
      kvittera(ctx.fxLayer, rec.tx, rec.ty, ctx.services.audio)
      return
    }

    const post = this._hylla.find((h) => h && h.rec === rec)
    const spec = rec.data
    const view = rec.view
    const inner = post ? post.inner : view.children[0]

    post?.livTw?.kill()
    if (post) this._hylla[post.plats] = null
    this._drag.removeItem(view)

    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    view.eventMode = 'none'
    view.scale.set(1)
    view.rotation = 0
    view._fxScaleBusy = false
    view._fxWiggleBusy = false
    if (inner && !inner.destroyed) {
      // `liv()` tweenar ett PROXY-objekt, inte noden — `killTweensOf(inner)` når den
      // aldrig. Utan den här raden guppar klossens bild kvar inuti den lagda klossen.
      inner._fxLiv?.kill()
      gsap.killTweensOf(inner)
      gsap.killTweensOf(inner.scale)
      inner.position.set(0, 0)
      inner.rotation = 0
      inner.scale.set(1)
    }

    const x = KOL[kol]
    const y = this._slappY(spec.h)
    view.position.set(x, y)
    this._hyllLager.removeChild(view)
    this._blockLager.addChild(view)

    const body = this._phys.rectangle(x, y, spec.w, spec.h, KLOSS_OPTS(spec))
    Body.setVelocity(body, { x: 0, y: 0 })
    this._phys.link(body, view)
    this._klossar.push({ view, inner, body, spec })

    const n = this._klossar.length - 1
    ctx.services.audio.sfx('pling')
    ctx.services.audio.tone({
      freq: VANINGSTON[Math.min(n, VANINGSTON.length - 1)],
      dur: 0.2,
      type: 'triangle',
      vol: 0.16,
    })
    if (spec.key === 'ballong') {
      ctx.services.audio.tone({ freq: 1320, slideTo: 1760, dur: 0.16, type: 'sine', vol: 0.12, delay: 0.08 })
    }
    sparkle(ctx.fxLayer, x, y, { count: 6 })
    this._kar?.react('heja')

    if (this._t - this._sistBerom > 2.6 && Math.random() < 0.55) {
      this._sistBerom = this._t
      ctx.services.voice.say(randomFrom(BEROM))
    }

    this._idle = 0
    if (post) {
      ctx.later(0.32, () => {
        if (!this._alive || this._hylla[post.plats]) return
        this._nyHyllKloss(ctx, post.plats)
      })
    }
  },

  // Var klossen släpps ifrån: strax ovanför tornets topp, aldrig inuti det.
  _slappY(h) {
    return clamp(this._toppY(true) - h / 2 - 44, SLAPP_MIN_Y, SLAPP_MAX_Y)
  },

  // Markörernas höjd är ett TILLSTÅND, inte en animation: den ändras bara när tornets
  // vilande topp flyttat sig, och bara var 0,35 s — en mål-nod som glider varje
  // bildruta hade flyttat snäppytan under släppet.
  _flyttaMarkorer(direkt = false) {
    const y = clamp(this._toppY(true) - 74, SLAPP_MIN_Y, SLAPP_MAX_Y)
    if (!direkt && Math.abs(y - this._slotY) < 10) return
    this._slotY = y
    for (const m of this._markorer || []) {
      if (m.view && !m.view.destroyed) m.view.y = y
    }
  },

  _blinkaMarkorer() {
    for (const m of this._markorer || []) {
      if (!m.view || m.view.destroyed) continue
      gsap.killTweensOf(m.view)
      gsap.to(m.view, { alpha: 0.92, duration: 0.14 })
      gsap.to(m.view, { alpha: 0.34, duration: 0.5, delay: 2 })
    }
  },

  _markorTryck(ctx, i) {
    if (!this._alive) return
    this._idle = 0
    // Är en kloss vald sköter DragControllerns egen tap-tap-hantering placeringen.
    if (this._drag?.selected) return
    kvittera(ctx.fxLayer, KOL[i], this._slotY, ctx.services.audio)
    this._blinkaMarkorer()
    stegra(
      this._hylla.filter(Boolean).map((h) => h.inner),
      pop
    )
  },

  _tomTryck(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    if (this._tippar || this._klar) {
      kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio)
      return
    }
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, p.x, p.y, { count: 4, color: COLORS.yellow })
    this._blinkaMarkorer()
  },

  // ---- Stödmomentet (per FAST fysiksteg) ----------------------------------

  _stod() {
    const pb = this._plankBody
    if (!pb) return
    if (this._tippar) {
      // Stödet har släppt taget: plankan får svaja över, bara lätt dämpad.
      pb.torque += -pb.angularVelocity * 90
    } else {
      pb.torque += -(pb.angle - this._vila) * this._stodK - pb.angularVelocity * STOD_DAMP
    }
    if (Math.abs(pb.angle) > MAX_LUT) {
      Body.setAngle(pb, Math.sign(pb.angle) * MAX_LUT)
      Body.setAngularVelocity(pb, 0)
    }
  },

  // ---- Uppdatering --------------------------------------------------------

  _uppdatera(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._phys.update(ticker.deltaMS) // `_stod` körs inifrån, per fast steg

    const lut = this._plankBody.angle - this._vila
    this._visaLutning(ctx, lut)
    this._boboFoljer(lut)

    this._markorT += dt
    if (this._markorT > 0.35) {
      this._markorT = 0
      this._flyttaMarkorer()
    }

    if (!this._tippar && !this._klar) {
      if (Math.abs(lut) > TIPP) {
        this._tippT += dt
        if (this._tippT > TIPP_HALL && this._t - this._sistTipp > TIPP_PAUS) this._tippa(ctx)
      } else {
        this._tippT = 0
      }
      this._tappade(ctx)
      this._kollaMal(ctx, dt, lut)
    }

    this._idle += dt
    if (!this._tippar && !this._klar && this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE))
      this._blinkaMarkorer()
      stegra(
        this._hylla.filter(Boolean).map((h) => h.inner),
        pop
      )
    }
  },

  // Vattenpasset på stödet: bubblan visar lutningen, och plankan knakar när det blir
  // mycket. Röret ritas om BARA när färgbandet byts, aldrig per bildruta.
  _visaLutning(ctx, lut) {
    const f = clamp(lut / TIPP, -1, 1)
    if (this._passBubbla && !this._passBubbla.destroyed) this._passBubbla.x = f * 44
    const band = Math.abs(f) < 0.42 ? 0 : Math.abs(f) < 0.76 ? 1 : 2
    if (band === this._lutBand) return
    this._lutBand = band
    this._ritaPass(band)
    if (band === 2 && !this._tippar && this._t - this._sistKnak > 1.4) {
      this._sistKnak = this._t
      ctx.services.audio.tone({ freq: 165, slideTo: 118, dur: 0.22, type: 'triangle', vol: 0.17 })
      if (this._klossar.length >= 2 && Math.random() < 0.5) {
        ctx.services.voice.say('Oj, plankan lutar! Lägg nästa kloss på andra sidan.')
      }
    }
  },

  _ritaPass(band) {
    const ror = this._passRor
    const bub = this._passBubbla
    if (!ror || ror.destroyed || !bub || bub.destroyed) return
    const farg = band === 0 ? COLORS.green : band === 1 ? COLORS.yellow : COLORS.orange
    ror.clear()
    ror.roundRect(-62, -16, 124, 32, 16).fill(topLightFill(0xe6dcc8)).stroke({ width: 4, color: 0x9c8a6b })
    ror.roundRect(-56, -10, 112, 20, 10).fill({ color: 0xbfe6ff, alpha: 0.75 })
    ror.rect(-2, -16, 4, 32).fill({ color: 0x9c8a6b, alpha: 0.7 })
    bub.clear()
    bub.circle(0, 0, 11).fill(farg).stroke({ width: 3, color: COLORS.white, alpha: 0.85 })
    bub.circle(-3.5, -3.5, 3.4).fill({ color: COLORS.white, alpha: 0.7 })
  },

  // Bobo tittar på tornets topp och duckar när plankan lutar ner mot honom.
  _boboFoljer(lut) {
    if (!this._kar || !this._bobo || this._bobo.destroyed) return
    this._kar.look(PX - this._bobo.x, this._toppY() - this._bobo.y)
    const duck = this._tippar || Math.abs(lut) > TIPP * 0.62
    if (duck === this._duckar) return
    this._duckar = duck
    gsap.killTweensOf(this._bobo, 'y')
    gsap.to(this._bobo, {
      y: BOBO_Y + (duck ? 44 : 0),
      duration: duck ? 0.16 : 0.4,
      ease: duck ? 'power2.out' : 'back.out(1.6)',
    })
  },

  // Tornets topp. `stilla` räknar bara klossar som lagt sig — annars skulle en kloss
  // som just släppts (och fortfarande faller) flytta både markörer och släpphöjd.
  _toppY(stilla = false) {
    let topp = PLANK_TOP
    for (const k of this._klossar) {
      if (stilla && k.body.speed > 2) continue
      const y = k.body.position.y - k.spec.h / 2
      if (y < topp) topp = y
    }
    return topp
  },

  // En kloss som hamnat UNDER plankan (i höet eller på marken) plockas bort. Roligt,
  // aldrig ett straff — och strypt till en i taget så det aldrig blir ett regn (TAK).
  _tappade(ctx) {
    if (this._t - this._sistTapp < 0.8) return
    const sin = Math.sin(this._plankBody.angle)
    for (let i = 0; i < this._klossar.length; i++) {
      const k = this._klossar[i]
      const p = k.body.position
      // +100 och inte +30: klossen ska SYNAS falla en bit ner i höet innan den puffar
      // bort. En kloss som vilar på plankan ligger alltid ovanför plankans linje.
      const plankY = PY + (p.x - PX) * sin
      if (p.y < plankY + 100 && p.x > 240 && p.x < 1040) continue
      this._sistTapp = this._t
      this._klossar.splice(i, 1)
      puff(ctx.fxLayer, p.x, p.y, { count: 8, color: k.spec.farg })
      floatText(ctx.fxLayer, p.x, p.y - 34, randomFrom(TAPP_ROP), { fontSize: 40 })
      ctx.services.audio.sfx('soft')
      this._kar?.react('hoppsan')
      this._taBortKloss(k)
      this._flyttaMarkorer(true)
      return
    }
  },

  _kollaMal(ctx, dt, lut) {
    const topp = this._toppY()
    const stilla = this._klossar.length > 0 && this._klossar.every((k) => k.body.speed < 1.4 && k.body.angularSpeed < 0.07)

    // Bästa uppnådda höjd sparas — det är HÄRIFRÅN vi bygger vidare efter ett tipp.
    if (stilla && Math.abs(lut) < 0.24 && topp < this._bastaY - 4) {
      this._bastaY = topp
      this._basta = [...this._klossar]
        .sort((a, b) => b.body.position.y - a.body.position.y)
        .map((k) => k.spec)
        .slice(0, 8)
    }

    if (topp <= this._flaggY && stilla && Math.abs(lut) < 0.18) {
      this._stabilT += dt
      const f = clamp(this._stabilT / 1.4, 0, 1)
      this._flaggGlod = f
      if (this._flagga && !this._flagga.destroyed) this._flagga.scale.set(1 + f * 0.16)
      if (this._stabilT > 1.4) this._klarat(ctx)
    } else if (this._stabilT > 0) {
      this._stabilT = 0
      this._flaggGlod = 0
      if (this._flagga && !this._flagga.destroyed) this._flagga.scale.set(1)
    }
  },

  _anslag(ctx, h) {
    if (!this._alive) return
    if (h.styrka > 0.45) puff(ctx.fxLayer, h.x, h.y, { count: 5, color: h.traff ?? 0xc9a06a })
  },

  // ---- Tipp (aldrig ett fall) --------------------------------------------

  _tippa(ctx) {
    if (!this._alive || this._tippar) return
    this._tippar = true
    this._tippT = 0
    this._stabilT = 0
    this._sistTipp = this._t
    this._tippRakning++

    ctx.services.audio.sfx('whoosh')
    ctx.services.audio.tone({ freq: 300, slideTo: 120, dur: 0.42, type: 'triangle', vol: 0.2 })
    this._kar?.react('hoppsan')
    floatText(ctx.fxLayer, PX, PY - 130, randomFrom(TAPP_ROP), { fontSize: 54 })
    ctx.services.voice.say('Hoppsan! Allting ramlade ner i höet.')

    ctx.later(1.35, () => {
      if (!this._alive) return
      for (const k of this._klossar) {
        puff(ctx.fxLayer, k.body.position.x, k.body.position.y, { count: 6, color: k.spec.farg })
      }
      this._rensaKlossar()
      Body.setAngle(this._plankBody, this._vila)
      Body.setAngularVelocity(this._plankBody, 0)
      Body.setVelocity(this._plankBody, { x: 0, y: 0 })

      // No-fail-trappa: var tredje tipp gör stödpunkten bredare (max två steg).
      if (this._tippRakning % 3 === 0 && this._trappa < 2) {
        this._trappa++
        this._satStod()
        ctx.services.audio.sfx('magi')
        sparkle(ctx.fxLayer, PX, 560, { count: 12 })
        ctx.services.voice.say('Nu gör jag stödet bredare. Då står tornet stadigare!')
      } else if (this._tippRakning === 1) {
        ctx.services.voice.say('Det gör ingenting! Vi bygger vidare.')
      }

      this._aterbygg(ctx)
    })
  },

  // Bygg upp igen från BÄSTA höjd — aldrig från noll (P0: inget som nollställer).
  _aterbygg(ctx) {
    if (!this._alive) return
    const lista = this._basta
    if (!lista.length) {
      this._tippar = false
      this._flyttaMarkorer(true)
      return
    }
    ctx.services.voice.say('Vi börjar där du var som högst!')
    let y = PLANK_TOP
    lista.forEach((spec, i) => {
      const cy = y - spec.h / 2 - 1
      y -= spec.h + 2
      ctx.later(0.1 + i * 0.12, () => {
        if (!this._alive) return
        const { outer, inner } = makeKloss(spec)
        outer.position.set(PX, cy)
        outer.eventMode = 'none'
        this._blockLager.addChild(outer)
        const body = this._phys.rectangle(PX, cy, spec.w, spec.h, KLOSS_OPTS(spec))
        Body.setVelocity(body, { x: 0, y: 0 })
        this._phys.link(body, outer)
        this._klossar.push({ view: outer, inner, body, spec })
        pop(inner, { scale: 1.14 })
        ctx.services.audio.tone({ freq: VANINGSTON[Math.min(i, VANINGSTON.length - 1)], dur: 0.12, type: 'sine', vol: 0.12 })
        sparkle(ctx.fxLayer, PX, cy, { count: 4 })
      })
    })
    ctx.later(0.25 + lista.length * 0.12, () => {
      if (!this._alive) return
      this._tippar = false
      this._tippT = 0
      this._flyttaMarkorer(true)
      this._kar?.react('heja')
    })
  },

  // ---- Målet nått: flaggan hissas, tornet tänds nedifrån ------------------

  _klarat(ctx) {
    if (!this._alive || this._klar) return
    this._klar = true
    this._stabilT = 0

    ctx.services.audio.sfx('correct')
    ctx.services.voice.say('Hurra! Tornet nådde ända upp till flaggan!')
    this._kar?.react('jubel')

    this._niva += 1
    ctx.progress.setLevel(this._niva)
    ctx.progress.setCustom('torn', (ctx.progress.get().custom?.torn || 0) + 1)
    ctx.progress.complete()

    const ordning = [...this._klossar].sort((a, b) => b.body.position.y - a.body.position.y)
    const tl = gsap.timeline()
    this._finishTl = tl

    // 1) Flaggan hissas till stångens topp och viftar.
    const flagga = this._flagga
    if (flagga && !flagga.destroyed) {
      tl.to(flagga, { y: this._flaggToppY, duration: 0.75, ease: 'power2.out' }, 0)
      tl.to(flagga.scale, { x: 1.18, y: 1.18, duration: 0.2, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.72)
      tl.add(() => {
        if (!this._alive) return
        ctx.services.audio.tone({ freq: 440, slideTo: 880, dur: 0.7, type: 'triangle', vol: 0.18 })
        const duk = flagga._btDuk
        if (duk && !duk.destroyed) {
          this._flaggVift = gsap.to(duk.scale, { x: 0.8, duration: 0.24, yoyo: true, repeat: 11, ease: 'sine.inOut' })
        }
      }, 0)
    }

    // 2) Tornet lyser upp våning för våning UNDERIFRÅN.
    ordning.forEach((k, i) => {
      tl.add(() => {
        if (!this._alive || !k.view || k.view.destroyed) return
        const glans = k.inner?._btGlans
        if (glans && !glans.destroyed) {
          gsap.killTweensOf(glans)
          glans.alpha = 0
          gsap.to(glans, { alpha: 0.85, duration: 0.13, yoyo: true, repeat: 1, ease: 'sine.out' })
        }
        if (k.inner && !k.inner.destroyed) pop(k.inner, { scale: 1.08 })
        sparkle(ctx.fxLayer, k.body.position.x, k.body.position.y, { count: 6 })
        ctx.services.audio.tone({
          freq: VANINGSTON[Math.min(i, VANINGSTON.length - 1)],
          dur: 0.22,
          type: 'triangle',
          vol: 0.18,
        })
      }, 0.7 + i * 0.16)
    })

    tl.add(() => {
      if (!this._alive) return
      ctx.services.audio.sfx('celebrate')
      bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
      this._kar?.react('jubel')
      floatText(ctx.fxLayer, BOBO_X, BOBO_Y - 90, randomFrom(['Hurra!', 'Bravo!', '❤️']), { fontSize: 46 })
    }, 0.95 + ordning.length * 0.16)

    ctx.later(3.8 + ordning.length * 0.16, () => {
      if (!this._alive) return
      this._nyRunda(ctx)
    })
  },

  // ---- Städning -----------------------------------------------------------

  _taBortKloss(k) {
    if (!k) return
    if (k.body) this._phys.removeBody(k.body)
    k.inner?._fxLiv?.kill() // `liv()` tweenar ett proxy — killTweensOf når den inte
    if (k.view && !k.view.destroyed) {
      gsap.killTweensOf(k.view)
      gsap.killTweensOf(k.view.scale)
      if (k.inner && !k.inner.destroyed) {
        gsap.killTweensOf(k.inner)
        gsap.killTweensOf(k.inner.scale)
        if (k.inner._btGlans && !k.inner._btGlans.destroyed) gsap.killTweensOf(k.inner._btGlans)
      }
      k.view.destroy({ children: true })
    }
  },

  _rensaKlossar() {
    for (const k of this._klossar) this._taBortKloss(k)
    this._klossar = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._unbindLjud?.()
    this._unbindSlag?.()
    this._unbindSteg?.()

    this._finishTl?.kill()
    this._flaggVift?.kill()

    for (const h of this._hylla || []) {
      if (!h) continue
      h.livTw?.kill()
      h.inner?._fxLiv?.kill()
      if (h.view && !h.view.destroyed) {
        gsap.killTweensOf(h.view)
        gsap.killTweensOf(h.view.scale)
      }
      if (h.inner && !h.inner.destroyed) {
        gsap.killTweensOf(h.inner)
        gsap.killTweensOf(h.inner.scale)
      }
    }
    this._hylla = []

    for (const k of this._klossar || []) {
      k.inner?._fxLiv?.kill()
      if (k.view && !k.view.destroyed) {
        gsap.killTweensOf(k.view)
        gsap.killTweensOf(k.view.scale)
      }
      if (k.inner && !k.inner.destroyed) {
        gsap.killTweensOf(k.inner)
        gsap.killTweensOf(k.inner.scale)
        if (k.inner._btGlans && !k.inner._btGlans.destroyed) gsap.killTweensOf(k.inner._btGlans)
      }
    }
    this._klossar = []

    for (const m of this._markorer || []) {
      m.livTw?.kill()
      if (m.inner && !m.inner.destroyed) {
        m.inner._fxLiv?.kill()
        gsap.killTweensOf(m.inner)
      }
      if (m.view && !m.view.destroyed) gsap.killTweensOf(m.view)
    }
    this._markorer = []

    if (this._flagga && !this._flagga.destroyed) {
      gsap.killTweensOf(this._flagga)
      gsap.killTweensOf(this._flagga.scale)
      if (this._flagga._btDuk && !this._flagga._btDuk.destroyed) gsap.killTweensOf(this._flagga._btDuk.scale)
    }
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    this._kar?.destroy()
    this._kar = null

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatch)
    this._drag?.destroy()
    this._drag = null

    this._phys?.destroy() // river även constrainten (Composite.clear)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Ritade föremål (P0 ASSETS: egen silhuett, aldrig en emoji i en ruta) ---

// Klossarna. Fyra riktiga föremål: en spjällåda, en målad byggkloss, ett stenblock och
// en ballongkloss. `outer` bär position/drag, `inner` bär allt liv (gupp, pop, glans) —
// den som animerar den YTTRE noden flyttar både hemläge och träffyta.
function makeKloss(spec) {
  const outer = new Container()
  const inner = new Container()
  const w = spec.w
  const h = spec.h
  const g = new Graphics()

  if (spec.key === 'liten') {
    // Spjällåda: brädor med kryss och synliga spikar.
    g.roundRect(-w / 2, -h / 2, w, h, 9).fill(topLightFill(0xd9a05b)).stroke({ width: 4, color: 0x8a5a3b })
    g.rect(-w / 2 + 6, -h / 2 + 6, w - 12, 8).fill({ color: 0xf0c188, alpha: 0.75 })
    g.moveTo(-w / 2 + 9, h / 2 - 7).lineTo(w / 2 - 9, -h / 2 + 9).stroke({ width: 5, color: 0xb27b45 })
    g.moveTo(w / 2 - 9, h / 2 - 7).lineTo(-w / 2 + 9, -h / 2 + 9).stroke({ width: 5, color: 0xb27b45 })
    for (const sx of [-w / 2 + 11, w / 2 - 11]) {
      g.circle(sx, -h / 2 + 11, 3).fill(0x8a939b)
      g.circle(sx, h / 2 - 11, 3).fill(0x8a939b)
    }
  } else if (spec.key === 'stor') {
    // Stenblock: kantstött, spräckligt, tydligt tungt.
    g.moveTo(-w / 2, -h / 2 + 10)
      .lineTo(-w / 2 + 13, -h / 2)
      .lineTo(w / 2 - 9, -h / 2 + 3)
      .lineTo(w / 2, -h / 2 + 17)
      .lineTo(w / 2 - 4, h / 2 - 5)
      .lineTo(w / 2 - 19, h / 2)
      .lineTo(-w / 2 + 11, h / 2 - 2)
      .lineTo(-w / 2 - 1, h / 2 - 15)
      .closePath()
      .fill(topLightFill(0x9aa4b0))
      .stroke({ width: 4, color: 0x6d7783 })
    g.moveTo(-w / 2 + 14, -h / 2 + 7).lineTo(w / 2 - 14, -h / 2 + 10).stroke({ width: 5, color: 0xc2cad3, alpha: 0.7 })
    for (let i = 0; i < 7; i++) {
      const px = -w / 2 + 20 + ((i * 37) % (w - 40))
      const py = -h / 2 + 21 + ((i * 23) % (h - 32))
      g.circle(px, py, 3 + (i % 3)).fill({ color: 0x7d8794, alpha: 0.6 })
    }
  } else if (spec.key === 'ballong') {
    // Ballongkloss: en lätt randig kloss med en ballong knuten i hörnet.
    g.roundRect(-w / 2, -h / 2, w, h, 14).fill(topLightFill(spec.farg)).stroke({ width: 4, color: 0xe0779f })
    for (let i = -1; i <= 1; i++) {
      g.roundRect(i * 34 - 5, -h / 2 + 8, 10, h - 16, 5).fill({ color: COLORS.white, alpha: 0.45 })
    }
    g.moveTo(w / 2 - 15, -h / 2 + 4)
      .quadraticCurveTo(w / 2 + 7, -h / 2 - 17, w / 2 - 2, -h / 2 - 33)
      .stroke({ width: 2.5, color: COLORS.white, alpha: 0.85 })
    g.ellipse(w / 2 - 2, -h / 2 - 52, 17, 21).fill(topLightFill(COLORS.red))
    g.ellipse(w / 2 - 8, -h / 2 - 58, 5, 7).fill({ color: COLORS.white, alpha: 0.55 })
    g.moveTo(w / 2 - 7, -h / 2 - 33).lineTo(w / 2 + 3, -h / 2 - 33).lineTo(w / 2 - 2, -h / 2 - 27).closePath().fill(0xd94c4c)
  } else {
    // Målad byggkloss med två knoppar och synlig ådring.
    g.roundRect(-w / 2, -h / 2, w, h, 13).fill(topLightFill(spec.farg)).stroke({ width: 4, color: COLORS.white, alpha: 0.75 })
    g.roundRect(-w / 2 + 10, h / 2 - 16, w - 20, 9, 5).fill({ color: 0x000000, alpha: 0.14 })
    for (const sx of [-w * 0.22, w * 0.22]) {
      g.circle(sx, -h / 2 + 10, 11).fill({ color: COLORS.white, alpha: 0.5 })
      g.circle(sx, -h / 2 + 10, 7).fill({ color: COLORS.white, alpha: 0.35 })
    }
    g.moveTo(-w / 2 + 15, 7).quadraticCurveTo(0, 13, w / 2 - 15, 7).stroke({ width: 2.5, color: 0x000000, alpha: 0.14 })
  }

  // Glansen som tänds våning för våning i finalen (alfa 0 tills dess).
  const glans = new Graphics()
  glans.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 15).fill(0xfff3b0)
  glans.alpha = 0
  glans.eventMode = 'none'

  g.eventMode = 'none'
  inner.addChild(g, glans)
  inner.eventMode = 'none'
  inner._btGlans = glans
  outer.addChild(inner)
  outer.cursor = 'pointer'
  return { outer, inner }
}

// Plankan: en riktig träbjälke med ådring, järnbeslag och målade kolumnstreck.
function makePlanka() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-PLANK_HALV, -PLANK_H / 2, PLANK_W, PLANK_H, 10).fill(cylinderFill(0xc08a54)).stroke({ width: 4, color: 0x8a5a3b })
  for (let i = -2; i <= 2; i++) {
    g.moveTo(-PLANK_HALV + 26, i * 5)
      .quadraticCurveTo(0, i * 5 + (i % 2 ? 4 : -4), PLANK_HALV - 26, i * 5)
      .stroke({ width: 2, color: 0x9a6b3d, alpha: 0.45 })
  }
  for (const sx of [-PLANK_HALV + 16, PLANK_HALV - 16]) {
    g.roundRect(sx - 9, -PLANK_H / 2 - 2, 18, PLANK_H + 4, 6).fill({ color: 0x8a939b, alpha: 0.9 })
    g.circle(sx, 0, 3.4).fill(0x5c646c)
  }
  // Mittmarkeringen sitter över vridpunkten, streckens plats läses ur KOL — annars
  // pekar plankan ut fem platser medan spelet har fyra (det syntes bara i bilden).
  g.rect(-3, -PLANK_H / 2, 6, PLANK_H).fill({ color: COLORS.white, alpha: 0.75 })
  for (const kx of KOL) {
    g.rect(kx - PX - 2, -PLANK_H / 2 + 5, 4, PLANK_H - 10).fill({ color: COLORS.white, alpha: 0.4 })
  }
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// Stödpunkten: ett stenfundament med en rund rulle på toppen. Rullens halvbredd ÄR
// spelets stödbredd — barnet SER att stödet blir bredare i no-fail-trappan.
function ritaStod(g, halv) {
  if (!g || g.destroyed) return
  g.clear()
  g.ellipse(PX, GY + 4, 96, 14).fill({ color: 0x000000, alpha: 0.16 })
  g.moveTo(PX - 84, GY)
    .lineTo(PX + 84, GY)
    .lineTo(PX + halv + 16, PY + 26)
    .lineTo(PX - halv - 16, PY + 26)
    .closePath()
    .fill(topLightFill(0x9aa4b0))
    .stroke({ width: 4, color: 0x6d7783 })
  for (let i = 0; i < 3; i++) {
    g.moveTo(PX - 70 + i * 9, GY - 26 - i * 32)
      .lineTo(PX + 70 - i * 9, GY - 28 - i * 32)
      .stroke({ width: 3, color: 0x7d8794, alpha: 0.5 })
  }
  g.roundRect(PX - halv, PY + 4, halv * 2, 26, 13).fill(cylinderFill(0xd8c3a5)).stroke({ width: 4, color: 0x9c8a6b })
  g.circle(PX, PY + 17, 5).fill(0x9c8a6b)
}

// En utspridd höhög på marken (ritas rakt in i markens Graphics — ren dekor).
function ritaHohog(g, x, y) {
  g.ellipse(x, y + 2, 118, 22).fill({ color: 0xd8b455, alpha: 0.9 })
  g.ellipse(x - 34, y - 8, 54, 16).fill({ color: 0xe3c264, alpha: 0.95 })
  g.ellipse(x + 30, y - 6, 48, 14).fill({ color: 0xe3c264, alpha: 0.95 })
  for (let i = 0; i < 22; i++) {
    const sx = x - 106 + i * 10
    const sy = y + 4 - ((i * 7) % 12)
    g.moveTo(sx, sy)
      .lineTo(sx + 12 - ((i * 5) % 20), sy - 12 - ((i * 3) % 9))
      .stroke({ width: 2.5, color: 0xc7a441, alpha: 0.75 })
  }
}

// Buske: överlappande lövklot av olika storlek — ingen rak kant någonstans, så den kan
// inte förväxlas med en byggkloss. Två små blommor gör den till en sak, inte en fläck.
function makeBuske(x, y) {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 2, 84, 12).fill({ color: 0x000000, alpha: 0.14 })
  const klot = [
    [-46, -26, 40, 30], [46, -24, 38, 28], [-16, -46, 44, 34],
    [24, -44, 40, 31], [4, -20, 46, 32],
  ]
  for (const [kx, ky, rx, ry] of klot) g.ellipse(kx, ky, rx, ry).fill(0x4e9c50)
  for (const [kx, ky, rx, ry] of klot) g.ellipse(kx - rx * 0.18, ky - ry * 0.3, rx * 0.62, ry * 0.5).fill({ color: 0x76c06a, alpha: 0.75 })
  // Enstaka löv som sticker ut ur siluetten.
  for (const [lx, ly, rot] of [[-82, -30, -0.5], [84, -34, 0.6], [-4, -74, 0.05]]) {
    g.moveTo(lx, ly)
      .quadraticCurveTo(lx + Math.cos(rot) * 20 - 8, ly + Math.sin(rot) * 20 - 10, lx + Math.cos(rot) * 26, ly + Math.sin(rot) * 26 - 4)
      .quadraticCurveTo(lx + Math.cos(rot) * 12, ly + Math.sin(rot) * 12 + 9, lx, ly)
      .fill(0x59aa57)
  }
  for (const [fx, fy] of [[-40, -44], [38, -38], [-6, -12]]) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      g.circle(fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 5).fill(0xfff0b0)
    }
    g.circle(fx, fy, 4.5).fill(0xf2b33d)
  }
  g.eventMode = 'none'
  c.addChild(g)
  c.position.set(x, y)
  c.eventMode = 'none'
  return c
}

// Målflaggan: duken är ett eget barn så den kan vifta utan att flytta fästpunkten.
function makeFlagga() {
  const c = new Container()
  const duk = new Container()
  const g = new Graphics()
  g.moveTo(0, -25).lineTo(-76, -8).lineTo(0, 12).closePath().fill(topLightFill(COLORS.red)).stroke({ width: 3, color: 0xc94c4c })
  g.moveTo(0, -25).lineTo(-76, -8).lineTo(0, -6).closePath().fill({ color: COLORS.white, alpha: 0.26 })
  g.moveTo(-12, -19).lineTo(-12, 5).stroke({ width: 3, color: COLORS.white, alpha: 0.5 })
  g.moveTo(-30, -14).lineTo(-30, 1).stroke({ width: 3, color: COLORS.white, alpha: 0.4 })
  g.eventMode = 'none'
  duk.addChild(g)
  duk.eventMode = 'none'
  c.addChild(duk)
  const knopp = new Graphics().circle(0, -7, 8).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orangeDark })
  knopp.eventMode = 'none'
  c.addChild(knopp)
  c._btDuk = duk
  return c
}
