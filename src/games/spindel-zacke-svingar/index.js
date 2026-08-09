// Spindel-Zacke Svingar — fysik-GAME (3–5 år). Spindel-Zacke (ett ORIGINAL hjälte-
// barn, Zacke — INTE Spider-Man) hänger i ett spindelnät från ett fäste och svingar
// som en PENDEL fram och tillbaka mellan hustaken. Barnet TRYCKER var som helst på
// himlen för att SLÄPPA nätet i rätt stund → Zacke flyger iväg som en PROJEKTIL och
// ett nytt nät fäster automatiskt vid nästa fäste. Mål: nå kattungen 🐱 (och Elvira)
// längst till höger → firande.
//
// TVÅ kontroller som ändrar utfallet (krav ≥2):
//   1) TIMING av släpp-trycket — släpp högt upp i framåt-bågen = långt kast,
//      i botten = flackt, för sent = kort. Förlåtande fönster.
//   2) NÄT-LÄNGD-knapp (📏 Kort 170 / Lång 260) — ändrar pendelns period OCH
//      räckvidd: långt nät = långsammare, lägre, snabbare svep (når längre);
//      kort nät = piggt och högt. Varje tryck ritar en SPÖK-BÅGE (prickad bana,
//      samma integrator som flykten) som visar den nya räckvidden.
//
// Faller ALDRIG: ett mjukt moln ☁️ glider in och bär tillbaka honom till senast
// nådda fäste (fniss, inget "game over"). Mjuk auto-hjälp (idle-auto-släpp i bästa
// stund + generöst fäst-fönster + garanterat kast efter upprepade missar) GARANTERAR
// att han till slut når kattungen. Egen ticker-driven pendel/projektil-integrator
// (samma G i båda → kalibrerad av konstruktion); INGEN GSAP på fysik-objekt.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { Camera, DJUP, lagerBredd } from '../../lib/kamera.js'
import { pop, wiggle, sparkle, floatText, burst, breathe, bounceIn, liv, kvittera } from '../../lib/feedback.js'
import { glod } from '../../lib/glod.js'
import { Button } from '../../lib/Button.js'
import { COLORS } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Fysik-konstanter (px/frame, egen integrator) ---
const G = 0.35 // gemensam gravitation för pendel OCH projektil → konsekvent känsla
const SHORT = 170 // kort nät-radie
const LONG = 260 // långt nät-radie
const AMP = 1.1 // garanterad framåt-amplitud (~63°) → räcker till nästa fäste
const THETA_MAX = 1.4 // hård spärr — går aldrig över toppen
const ROOF_Y = 520 // fångst-golv (taklinje): under denna i flykt → moln-fångst

// --- Världen (LYFTPLAN A4.4 — kamerans första kund) ---
//
// FÖRE: banan var hårdklämd till 920 px med `Math.min(cfg.gap, 920 / (count - 1))`, och
// eftersom antalet fästen VÄXTE med nivån blev varje hopp KORTARE ju längre barnet kom
// (nivå 1: 3 fästen à 300 px · nivå 6: 6 à 184). Hela stan syntes från första svinget,
// och progressionen gick åt fel håll.
//
// EFTER: gapet är konstant 300 px — exakt det avstånd nivå 1–3 redan bevisat att fysiken
// klarar — och NIVÅN LÄGGER TILL FÄSTEN i stället för att trycka ihop dem. Kameran följer
// Zacke genom en stad som är upp till 3400 px bred.
//
// `WORLD_MAX` är den bredaste värld spelet kan bygga. Bakgrund och tak ritas för den EN
// gång; `kam.setWorld()` klämmer sedan panoreringen per nivå, så en kort bana aldrig visar
// tom stad till höger om kattungen.
const WORLD_MAX = 3400
const START_X = 200 // första fästets x
const MAL_MARGINAL = 420 // värld till höger om sista fästet (taket målet står på + luft)
const HUS_W = 214 // en husbredd — samma som förut (1280 / 6), nu kaklad genom världen

// Stämning per nivå — en dag som går, och sedan börjar om.
//
// Spelet är en slinga: rädda en kattunge, rädda en till, rädda en till. Utan något som
// FÖRÄNDRAS mellan varven blir den femte räddningen identisk med den första. Dygnet ger
// slingan en form barnet kan känna igen utan att kunna läsa — "nu är det kväll, vi har
// hållit på länge" — och kostar ingenting, eftersom `createScene` redan kan tona ett tema
// genom morgon/skymning/kväll (`tid`) och har ett eget natt-tema.
//
// `hus` tintar stadens KROPP; fönstren tintas separat med `lyse` och går åt andra hållet.
// En enda tint över hela huset hade släckt fönstren i samma andetag som den mörknade
// väggen, och ett mörkt hus med mörka fönster läser som en kuliss, inte som en stad där
// någon bor.
const STAMNINGAR = [
  { tema: 'sky', tid: 'dag', hus: 0xffffff, lyse: 0xfff6d0 },
  { tema: 'sky', tid: 'morgon', hus: 0xffe8cf, lyse: 0xfff3c4 },
  { tema: 'sunset', tid: 'skymning', hus: 0xf0b79a, lyse: 0xffe9a0 },
  { tema: 'sky', tid: 'kvall', hus: 0x9aa2c8, lyse: 0xffe27a },
  { tema: 'night', tid: 'dag', hus: 0x6f77ad, lyse: 0xffd95c },
]
const stamningFor = (niva) => STAMNINGAR[((niva % STAMNINGAR.length) + STAMNINGAR.length) % STAMNINGAR.length]

const SWING_WORDS = ['Wii!', 'Hihi!', 'Sväva!']

// --- Saker att nudda i flykten ---
//
// Flykten var förut helt tom: man släppte, väntade, fäste. Nu hänger det saker i luften
// mellan fästena — en fågel, en ballong, en stjärna — som ger ett pling när båg-kastet
// stryker förbi. De är ALDRIG ett krav: de går inte att missa på ett sätt som kostar
// något, de sitter inte i vägen, och det finns ingen räknare som kan sjunka. De är en
// liten skörd för den som råkar flyga rätt, och en anledning att välja långt nät ibland.
//
// Tonerna är en PENTATONISK stege, inte fem godtyckliga blipp: vilken delmängd som helst
// av en pentatonisk skala låter bra ihop, så en skörd på två saker är lika musikalisk som
// en på fem. Samma skäl som CLAUDE.md ger för att inte byta ut `correct`/`match`.
const PLING = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]
const TREAT_R = 54 // nudd-radie — generös, det ska kännas som att man strök förbi
const TREATS = ['fagel', 'ballong', 'stjarna']

export default {
  id: 'spindel-zacke-svingar',
  titleSv: 'Spindel-Zacke Svingar',
  icon: '🕸️',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'spindel-zacke-svingar',
  voiceIntro: 'Tryck för att släppa nätet — svinga till kattungen!',

  // ------------------------------------------------------------------ livscykel
  init(ctx) {
    this._alive = true
    this._resolving = false
    this._state = 'swing' // 'swing' | 'flight' | 'rescue'
    this._ropeLen = SHORT
    this._L = SHORT
    this._theta = -0.9
    this._omega = 0
    this.vx = 0
    this.vy = 0
    this._a = 0
    this._idle = 0
    this._didCue = false
    this._attachCount = 0
    this._toldSwing = false

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Nivån läses FÖRE scenen: stämningen (tid på dygnet) hänger på nivån, och att bygga
    // en dag-himmel först och byta den direkt efteråt vore ett synligt hopp vid uppstart.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._stamning = stamningFor(this._level)
    // Vyns mått sparas: scenen byggs om vid varje stämningsbyte, långt efter init.
    this._vw = ctx.width
    this._vh = ctx.height

    // KAMERAN (lib/kamera.js). Spelet bygger allt i VÄRLDSKOORDINATER i faktor-1-lagret
    // och tänker aldrig på var bilden råkar stå; kameran flyttar lagren, aldrig innehållet.
    this._kam = new Camera({ width: ctx.width, height: ctx.height, worldW: WORLD_MAX })
    this._root.addChild(this._kam.root)

    // Bakgrund: himmel + sol + drivande moln, uppdelad i parallaxband av `kamera`-flaggan.
    // Scenens lager är låsta i höjdled — det passar här, för världen är bara bred.
    this._kam.adopt(this._buildScene())

    // Fjärran stadssiluett: rör sig långsamt, alltså läser den som LÅNGT bort. Det är den
    // som gör att en resa åt höger känns som en resa och inte som en rullande tapet.
    this._farLayer = this._kam.parallax(DJUP.fjarran, { dekor: true })
    this._farRoofs = this._buildRoofs(lagerBredd(DJUP.fjarran, ctx.width, WORLD_MAX), true)
    this._farLayer.addChild(this._farRoofs)

    // Spelplanet.
    this._varld = this._kam.parallax(1)

    // Hustaken Zacke svingar över (dekorativa, men i hans plan).
    this._roofs = this._buildRoofs(WORLD_MAX, false)
    this._varld.addChild(this._roofs)
    this._tintaStaden()

    // Fästen (knoppar + nät) + mål-dekor (kattunge/Elvira).
    this._anchorLayer = new Container()
    this._anchorLayer.eventMode = 'none'
    this._varld.addChild(this._anchorLayer)

    // Saker att nudda i flykten — under nätet, så tråden alltid läses som främst.
    this._treatLayer = new Container()
    this._treatLayer.eventMode = 'none'
    this._treatLayer.interactiveChildren = false
    this._varld.addChild(this._treatLayer)
    this._treats = []
    this._skord = 0

    // Nät-grafik (ritas om varje tick), under Zacke.
    this._web = new Graphics()
    this._web.eventMode = 'none'
    this._varld.addChild(this._web)

    // Spök-båge (ritas vid längd-val, tonar bort själv), över nätet men under Zacke.
    this._ghost = new Graphics()
    this._ghost.eventMode = 'none'
    this._varld.addChild(this._ghost)
    this._ghostTw = null
    this._winTweens = [] // vinstscenens proxy-tweens — dödas explicit i _buildLevel/destroy

    // Zacke (hjälte-figur).
    this._zacke = this._buildZacke()
    this._varld.addChild(this._zacke)

    // EFFEKTER I VÄRLDEN. `ctx.fxLayer` är skärmrymd: en gnista vid ett fäste 2000 px in i
    // världen hade dykt upp 2000 px in på SKÄRMEN, alltså utanför bilden. Allt som hör till
    // en världspunkt (gnistor vid fästen, ord över Zacke, räddningsmolnet) går hit i stället.
    // Kvar på ctx.fxLayer: bara det som hör till FINGRET — se `_kvitto`.
    this._fx = this._kam.parallax(1, { dekor: true })

    // HUD i faktor 0: fastspikat i skärmen, skakar aldrig med. Tryckytan hör hemma här —
    // "tryck var som helst" betyder var som helst på SKÄRMEN, inte i världen.
    this._hud = this._kam.parallax(0)

    // Trycky-yta: osynlig heltäckande hit-rektangel över hela svingnings-rymden.
    this._sky = new Graphics().rect(0, 90, ctx.width, 430).fill({ color: 0xffffff, alpha: 0.001 })
    this._sky.eventMode = 'static'
    this._sky.hitArea = new Rectangle(0, 90, ctx.width, 430)
    this._hRelease = (e) => this._onSkyTap(ctx, e)
    this._sky.on('pointertap', this._hRelease)
    this._hud.addChild(this._sky)

    // Nät-längd-knapp nere till vänster (stor träffyta + hit-halo + ljud inbyggt).
    this._lenBtn = new Button({
      icon: '📏',
      label: 'Kort',
      width: 150,
      height: 120,
      color: COLORS.purple,
      stacked: true,
      sound: 'flip',
      services: ctx.services,
      onTap: () => this._toggleLen(ctx),
    })
    this._lenBtn.position.set(130, 650)
    this._lenLabel = this._lenBtn.children[this._lenBtn.children.length - 1]
    this._hud.addChild(this._lenBtn)

    this._buildLevel(this._level)

    // Kameran följer Zacke. `lead` lägger bilden före honom i färdriktningen så barnet
    // ser vart han är på väg; dödzonen låter pendeln svänga fram och tillbaka utan att
    // bilden gungar med — det är svinget som rör sig, inte staden.
    this._kam.follow(this._zacke, { lead: 110, deadzone: 190 })
    this._kam.attach(ctx.ticker)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._didCue = false
    // Mini-berättelse: kattungen ropar först, sedan instruktionen (say avbryter
    // alltid pågående tal — därför i följd via ctx.later, inte samtidigt).
    ctx.services.voice.say('Kattungen sitter fast på taket!')
    ctx.later(0.4, () => {
      if (this._kitten && !this._kitten.destroyed) {
        wiggle(this._kitten)
        if (!ctx.services.audio.sample('djur_katt')) ctx.services.audio.sfx('pop')
      }
    })
    ctx.later(2.3, () => ctx.services.voice.say(this.voiceIntro))
  },

  // ------------------------------------------------------------------ nivåer
  // Gapet är KONSTANT 300 px på alla nivåer, och det är en medveten omsvängning.
  //
  // Förut klämdes banan till 920 px, så fler fästen betydde kortare hopp: nivå 6 hade
  // 184 px mellan fästena mot nivå 1:s 300. Progressionen gjorde alltså varje enskilt
  // hopp LÄTTARE. Nu ligger avståndet kvar på det som nivå 1–3 redan bevisat att
  // pendeln klarar, och nivån lägger till LÄNGD i stället — fler hopp, längre resa,
  // samma svårighet per svep. Höjdvariationen (`mode`) bär variationen.
  _levelConfig(level) {
    if (level <= 1) return { count: 3, gap: 300, mode: 'flat', yvar: 0 }
    if (level <= 3) return { count: 4, gap: 300, mode: 'var', yvar: 25 }
    if (level <= 5) return { count: 6, gap: 300, mode: 'zigzag', yvar: 0 }
    if (level <= 7) return { count: 8, gap: 300, mode: 'jitter', yvar: 30 }
    return { count: 10, gap: 300, mode: 'jitter', yvar: 30 }
  },

  _buildLevel(level) {
    if (!this._alive) return
    this._resolving = false
    this._state = 'swing'
    this._idle = 0
    this._didCue = false
    this._attachCount = 0

    // Döda vinstscenens tweens + spök-bågen (proxy-tweens — killTweensOf når dem inte).
    for (const t of this._winTweens) t.kill()
    this._winTweens = []
    this._ghostTw?.kill()
    this._ghostTw = null
    if (this._ghost && !this._ghost.destroyed) {
      this._ghost.clear()
      this._ghost.alpha = 1
    }

    // Rensa gamla fästen + mål-dekor.
    for (const c of this._anchorLayer.removeChildren()) {
      gsap.killTweensOf(c)
      if (c.scale) gsap.killTweensOf(c.scale)
      c.destroy({ children: true })
    }
    this._kitten = null
    this._elvira = null

    // Ny stämning? Byt himlen och tinta om staden. Bara när den FAKTISKT ändras —
    // `byteScen` river och bygger scenens parallaxband, och det ska inte ske i onödan.
    const nyStamning = stamningFor(level)
    if (this._kam && nyStamning !== this._stamning) {
      this._stamning = nyStamning
      this._kam.byteScen(this._buildScene())
      this._tintaStaden()
    }

    const cfg = this._levelConfig(level)
    const count = cfg.count
    const gap = cfg.gap
    const startX = START_X

    // Världen är precis så bred som banan behöver + luft bakom målet. Kameran får då
    // aldrig panorera ut i tom stad till höger om kattungen, hur kort nivån än är.
    this._worldW = Math.min(WORLD_MAX, Math.max(1280, startX + gap * (count - 1) + MAL_MARGINAL))
    this._kam?.setWorld(this._worldW)

    this._anchors = []
    for (let i = 0; i < count; i++) {
      const x = startX + gap * i
      let y = 200
      if (cfg.mode === 'var') y = 200 + (i % 2 ? cfg.yvar : -cfg.yvar)
      else if (cfg.mode === 'zigzag') y = i % 2 ? 230 : 185
      else if (cfg.mode === 'jitter') y = 200 + (i % 2 ? cfg.yvar : -cfg.yvar) + (Math.random() * 2 - 1) * 18
      y = Math.max(180, Math.min(240, y))
      this._anchors.push({ x, y })
    }

    // Rita fästen.
    this._anchors.forEach((a, i) => {
      const knob = new Graphics().circle(0, 0, 16).fill(COLORS.inkSoft).stroke({ width: 4, color: COLORS.white })
      knob.position.set(a.x, a.y)
      knob.eventMode = 'none'
      // RITAT nätfäste (P0 ASSETS) — var en 🕸️-emoji.
      const web = new Graphics()
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2
        web.moveTo(0, 0).lineTo(Math.cos(ang) * 15, Math.sin(ang) * 15)
      }
      web.stroke({ width: 2.2, color: 0xffffff, alpha: 0.9 })
      for (let ring = 1; ring <= 2; ring++) {
        const rr = (15 * ring) / 2
        for (let k = 0; k < 8; k++) {
          const a1 = (k / 8) * Math.PI * 2
          const a2 = ((k + 1) / 8) * Math.PI * 2
          web.moveTo(Math.cos(a1) * rr, Math.sin(a1) * rr)
            .quadraticCurveTo(Math.cos((a1 + a2) / 2) * rr * 0.8, Math.sin((a1 + a2) / 2) * rr * 0.8,
              Math.cos(a2) * rr, Math.sin(a2) * rr)
        }
      }
      web.stroke({ width: 1.8, color: 0xffffff, alpha: 0.75 })
      web.position.set(a.x, a.y - 4)
      web.eventMode = 'none'

      // "SNART FRAMME" I SJÄLVA BANAN: fästena glöder starkare ju närmare kattungen de
      // sitter. Det är den enda ledtråden om hur långt kvar det är som fungerar när målet
      // ligger utanför bilden — och den kräver ingen siffra och ingen mätare att läsa.
      //
      // Glöden är additiv (lib/glod.js) och skalas med STÄMNINGEN, av samma skäl som stod
      // i A4:s lärdom: additivt ljus behöver svärta att lysa upp. Mot en dagsblå himmel
      // hade full styrka bara blivit en vit fläck, så dagen får en antydan och natten den
      // riktiga glöden.
      const narGoal = count > 1 ? i / (count - 1) : 1
      const nattigt = this._stamning.tema === 'night' || this._stamning.tid === 'kvall'
      if (narGoal > 0.25) {
        const halo = glod({
          color: 0xfff3b0,
          size: 54 + narGoal * 62,
          alpha: (nattigt ? 0.34 : 0.16) * (0.35 + narGoal * 0.65),
        })
        if (halo) {
          halo.position.set(a.x, a.y - 4)
          this._anchorLayer.addChild(halo)
        }
      }

      this._anchorLayer.addChild(knob, web)
      bounceIn(knob, { delay: i * 0.05 })

      // Mål-fästet (sista): kattunge på taket + Elvira vinkar bredvid.
      if (i === count - 1) {
        // RITAD kattunge (P0 ASSETS) — var en 🐱-emoji.
        const kitten = new Container()
        const kg = new Graphics()
        const KR = 40
        kg.moveTo(-KR * 0.62, -KR * 0.4).lineTo(-KR * 0.34, -KR * 1.06).lineTo(-KR * 0.04, -KR * 0.42)
          .closePath().fill(0xffb15c)
        kg.moveTo(KR * 0.62, -KR * 0.4).lineTo(KR * 0.34, -KR * 1.06).lineTo(KR * 0.04, -KR * 0.42)
          .closePath().fill(0xffb15c)
        kg.moveTo(-KR * 0.5, -KR * 0.48).lineTo(-KR * 0.34, -KR * 0.88).lineTo(-KR * 0.16, -KR * 0.5)
          .closePath().fill(0xf6c2d3)
        kg.moveTo(KR * 0.5, -KR * 0.48).lineTo(KR * 0.34, -KR * 0.88).lineTo(KR * 0.16, -KR * 0.5)
          .closePath().fill(0xf6c2d3)
        kg.ellipse(0, KR * 0.5, KR * 0.58, KR * 0.48).fill(0xffb15c)
        kg.moveTo(KR * 0.48, KR * 0.6).quadraticCurveTo(KR * 1.1, KR * 0.36, KR * 0.9, -KR * 0.2)
          .stroke({ width: KR * 0.2, color: 0xf59042, cap: 'round' })
        kg.circle(0, -KR * 0.12, KR * 0.66).fill(0xffc888)
        kg.circle(-KR * 0.26, -KR * 0.18, KR * 0.11).fill(0x33291f)
        kg.circle(KR * 0.26, -KR * 0.18, KR * 0.11).fill(0x33291f)
        kg.circle(-KR * 0.21, -KR * 0.24, KR * 0.045).fill(0xffffff)
        kg.circle(KR * 0.31, -KR * 0.24, KR * 0.045).fill(0xffffff)
        kg.moveTo(-KR * 0.1, KR * 0.02).lineTo(KR * 0.1, KR * 0.02).lineTo(0, KR * 0.14)
          .closePath().fill(0xe79ab0)
        kg.moveTo(-KR * 0.06, KR * 0.14).quadraticCurveTo(-KR * 0.2, KR * 0.26, -KR * 0.3, KR * 0.16)
          .moveTo(KR * 0.06, KR * 0.14).quadraticCurveTo(KR * 0.2, KR * 0.26, KR * 0.3, KR * 0.16)
          .stroke({ width: 3, color: 0x8a5a3b, cap: 'round' })
        kg.circle(-KR * 0.44, KR * 0.06, KR * 0.13).fill({ color: 0xff9ec4, alpha: 0.7 })
        kg.circle(KR * 0.44, KR * 0.06, KR * 0.13).fill({ color: 0xff9ec4, alpha: 0.7 })
        kg.eventMode = 'none'
        kitten.addChild(kg)
        kitten.interactiveChildren = false
        kitten.position.set(a.x, ROOF_Y - 46)
        kitten.eventMode = 'none'
        this._anchorLayer.addChild(kitten)
        this._kitten = kitten
        breathe(kitten, { scale: 1.08, duration: 1.0 })

        const elvira = this._buildElvira()
        elvira.position.set(Math.min(a.x + 80, this._worldW - 50), ROOF_Y)
        this._anchorLayer.addChild(elvira)
        this._elvira = elvira
      }
    })

    this._buildTreats()

    // Fäst Zacke vid fäste 0 med fin start-amplitud (drar bakåt, släpper framåt).
    this._a = 0
    this._anchor = this._anchors[0]
    this._L = this._ropeLen
    this._theta = -0.9
    this._omega = 0
    this.vx = 0
    this.vy = 0
    this._ensureAmplitude()
    const z = this._zacke
    z.rotation = this._theta * 0.5
    z.x = this._anchor.x + this._L * Math.sin(this._theta)
    z.y = this._anchor.y + this._L * Math.cos(this._theta)
    this._drawZacke('swing')
    this._drawFart(0)
    bounceIn(z)
    // Zacke TELEPORTERAR hit från förra nivåns mål. Kamerans hårda ruta klämmer mot
    // målets NUVARANDE läge, så utan det här hoppar bilden med i ett ryck (dokumenterat
    // i kamera.js). Flytta kameran själv i samma andetag.
    this._kam?.moveTo(z.x)
    this._drawWeb()
  },

  // ------------------------------------------------------------------ figurer
  _buildZacke() {
    const c = new Container()
    c.eventMode = 'none'
    // Fart-streck: ritas i Zackes EGNA koordinater, bakom allt annat. Att de bor här inne
    // och inte i världen är hela tricket — när kroppen vrids mot färdriktningen följer
    // strecken med gratis, så de pekar alltid rakt bakåt utan en enda vinkelberäkning.
    this._speed = new Graphics()
    this._speed.eventMode = 'none'
    c.addChild(this._speed)
    // Svag glöd-ring (han svävar).
    c.addChild(new Graphics().circle(0, 0, 40).stroke({ color: 0xffffff, alpha: 0.25, width: 4 }))
    // Kropp (hjälte-dräkt) + armar + ben. Ritas om vid poseskifte, se _drawZacke.
    const body = new Graphics()
    this._body = body
    c.addChild(body)
    this._pose = null
    this._drawZacke('swing')
    // Huvud.
    c.addChild(new Graphics().circle(0, -26, 22).fill(0xffe0bd))
    // Röd domino-mask + vita ögon-prickar + leende.
    const face = new Graphics()
    face.roundRect(-20, -34, 40, 15, 7).fill(COLORS.red) // mask
    face.circle(-8, -27, 4).fill(COLORS.white) // ögon
    face.circle(8, -27, 4).fill(COLORS.white)
    // moveTo till bågens startpunkt — arc() efter fill() strokar annars en implicit
    // linje från origo till bågen (Elvira såg ut att hålla en käpp; samma fälla här).
    face.moveTo(8 * Math.cos(0.15 * Math.PI), -16 + 8 * Math.sin(0.15 * Math.PI))
      .arc(0, -16, 8, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 3, color: COLORS.ink }) // leende
    c.addChild(face)
    return c
  },

  // Zackes två poser. Kroppen ritas om vid skifte, inte varje bildruta — det är ett
  // Graphics-anrop per släpp och per fäste, inte 60 i sekunden.
  //
  // 'swing'  armarna hänger ned längs sidorna, benen isär — han HÄNGER i en tråd.
  // 'flight' båda armarna sträckta rakt fram (lokalt UPPÅT, över huvudet) och benen ihop
  //          bakåt. Eftersom kroppen samtidigt vrids så att lokalt "upp" pekar längs
  //          farten (se _update) blir det den klassiska flyg-posen utan att en enda
  //          kroppsdel behöver veta åt vilket håll han far.
  _drawZacke(pose) {
    if (this._pose === pose) return
    this._pose = pose
    const g = this._body
    if (!g || g.destroyed) return
    g.clear()
    if (pose === 'flight') {
      // Ben ihop och lite bakåt (lokalt nedåt) — en strömlinjeformad silhuett.
      g.moveTo(-5, 30).lineTo(-7, 60).stroke({ width: 12, color: COLORS.blue, cap: 'round' })
      g.moveTo(5, 30).lineTo(7, 60).stroke({ width: 12, color: COLORS.blue, cap: 'round' })
      g.roundRect(-16, -2, 32, 40, 12).fill(COLORS.blue) // bål
      g.circle(0, 14, 7).fill(COLORS.red) // bröst-emblem
      // Armarna framåt, förbi huvudet. De ritas SIST så de ligger över bålen.
      g.moveTo(-13, 4).lineTo(-9, -46).stroke({ width: 12, color: COLORS.red, cap: 'round' })
      g.moveTo(13, 4).lineTo(9, -46).stroke({ width: 12, color: COLORS.red, cap: 'round' })
    } else {
      g.roundRect(-26, 2, 12, 28, 6).fill(COLORS.red) // vänster arm
      g.roundRect(14, 2, 12, 28, 6).fill(COLORS.red) // höger arm
      g.roundRect(-16, -2, 32, 40, 12).fill(COLORS.blue) // bål
      g.circle(0, 14, 7).fill(COLORS.red) // bröst-emblem
      g.roundRect(-13, 34, 11, 22, 5).fill(COLORS.blue) // vänster ben
      g.roundRect(2, 34, 11, 22, 5).fill(COLORS.blue) // höger ben
    }
  },

  // Fart-strecken bakom honom. Längd och styrka följer FARTEN, så ett välträffat släpp
  // syns som ett kraftigare swoosh än ett slappt — juicen belönar samma sak som poängen.
  _drawFart(fart) {
    const g = this._speed
    if (!g || g.destroyed) return
    g.clear()
    if (fart < 1.6) return
    const k = Math.min(1, (fart - 1.6) / 5.5)
    const langd = 26 + k * 62
    for (const [dx, skala] of [[-16, 0.62], [0, 1], [16, 0.62]]) {
      g.moveTo(dx, 34)
        .lineTo(dx * 1.25, 34 + langd * skala)
        .stroke({ width: 5 - Math.abs(dx) * 0.09, color: 0xffffff, alpha: 0.16 + k * 0.4, cap: 'round' })
    }
  },

  // Ett föremål att nudda i flykten. RITAT, aldrig en emoji i en ruta (P0 ASSETS).
  _buildTreat(sort) {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    if (sort === 'fagel') {
      g.ellipse(0, 0, 20, 14).fill(0x6fc3e8) // kropp
      g.moveTo(-4, -4).quadraticCurveTo(-20, -22, -30, -8).quadraticCurveTo(-16, -2, -4, -4).fill(0x4aa3df) // vinge
      g.moveTo(4, -4).quadraticCurveTo(20, -22, 30, -8).quadraticCurveTo(16, -2, 4, -4).fill(0x4aa3df)
      g.circle(13, -6, 9).fill(0x8fd6ee) // huvud
      g.circle(16, -8, 2.6).fill(COLORS.ink) // öga
      g.moveTo(21, -6).lineTo(29, -3).lineTo(21, -1).closePath().fill(COLORS.orange) // näbb
      g.moveTo(-18, 4).lineTo(-30, 12).lineTo(-16, 10).closePath().fill(0x4aa3df) // stjärt
    } else if (sort === 'ballong') {
      g.moveTo(0, 20).quadraticCurveTo(-6, 34, 2, 44).stroke({ width: 2.5, color: 0xd8d2c4, cap: 'round' }) // snöre
      g.ellipse(0, 0, 19, 23).fill(0xef476f) // ballongen
      g.moveTo(-5, 21).lineTo(5, 21).lineTo(0, 28).closePath().fill(0xc93457) // knuten
      g.ellipse(-6, -8, 6, 8).fill({ color: COLORS.white, alpha: 0.5 }) // dager
    } else {
      const R = 22
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? R : R * 0.44
        const ang = (k / 10) * Math.PI * 2 - Math.PI / 2
        const px = Math.cos(ang) * r
        const py = Math.sin(ang) * r
        if (k === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.closePath().fill(0xffd35c)
      g.circle(-5, -5, 5).fill({ color: 0xfff3b0, alpha: 0.85 })
    }
    c.addChild(g)
    // Additiv glöd bakom stjärnan och ballongen så de LÄSER som något att sträcka sig
    // efter. Fågeln får ingen — en fågel lyser inte.
    if (sort !== 'fagel') {
      const halo = glod({ color: sort === 'stjarna' ? 0xffe27a : 0xff9ec4, size: 84, alpha: this._stamning?.tema === 'night' ? 0.4 : 0.2 })
      if (halo) c.addChildAt(halo, 0)
    }
    return c
  },

  // Banan för ett BRA släpp från ett fäste, med samma konstanter och samma steg som
  // flykten och som spök-bågen (G, AMP, dt=1). Att simulera i stället för att gissa är
  // hela poängen — se nedan.
  _flyktBana(anchor, L) {
    const th = 0.75 // mitt i belönings-fönstret, samma tal som `_showGhost`
    const vt = Math.sqrt(Math.max(0, 2 * G * L * (Math.cos(th) - Math.cos(AMP))))
    let x = anchor.x + L * Math.sin(th)
    let y = anchor.y + L * Math.cos(th)
    let vx = vt * Math.cos(th)
    let vy = -vt * Math.sin(th)
    const bana = [{ x, y }]
    for (let s = 0; s < 200 && y < ROOF_Y; s++) {
      vy += G
      x += vx
      y += vy
      bana.push({ x, y })
    }
    return bana
  },

  // Häng ut en sak per lucka mellan fästena — PÅ den bana kastet faktiskt tar.
  //
  // Första försöket satte dem i ett höjdband på känsla (y 246–330) och det var fel, mätt
  // av `_varldprobe.mjs`: en av de passerade sakerna plockades aldrig. Flykten STIGER
  // bara ~22 px med kort nät (vt ≈ 5,8 px/bildruta, varav 3,9 uppåt mot G 0,35), så
  // toppen ligger runt y 302 — en sak på y 250 hänger 50 px ovanför allt barnet kan nå,
  // hur bra det än släpper.
  //
  // Nu simuleras BÅDA nätlängdernas banor och saken hamnar mitt emellan deras närmaste
  // punkter. Då ligger den inom nudd-radien för både kort och långt nät, av konstruktion
  // — samma princip som gör att spök-bågen stämmer med verkligheten.
  _treatSpot(anchor) {
    const kort = this._flyktBana(anchor, SHORT)
    const lang = this._flyktBana(anchor, LONG)
    let bast = null
    let bastD = Infinity
    for (const p of kort) {
      for (const q of lang) {
        const d = Math.hypot(p.x - q.x, p.y - q.y)
        if (d < bastD) {
          bastD = d
          bast = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
        }
      }
    }
    return bast || { x: anchor.x + 160, y: 320 }
  },

  _buildTreats() {
    const lager = this._treatLayer
    if (!lager || lager.destroyed) return
    for (const c of lager.removeChildren()) {
      c._fxLiv?.kill()
      gsap.killTweensOf(c)
      if (c.scale) gsap.killTweensOf(c.scale)
      c.destroy({ children: true })
    }
    this._treats = []
    this._skord = 0
    const a = this._anchors
    for (let i = 0; i < a.length - 1; i++) {
      // Inte i VARJE lucka: en skörd ska kännas som ett fynd, inte som en korridor.
      if (a.length > 3 && i % 2 === 1) continue
      const sort = TREATS[(i + this._level) % TREATS.length]
      const view = this._buildTreat(sort)
      // Liten variation, men bara så mycket som nudd-radien tål — se `_treatSpot`.
      const p = this._treatSpot(a[i])
      const x = p.x + (Math.random() * 2 - 1) * 12
      const y = p.y + (Math.random() * 2 - 1) * 10
      view.position.set(x, y)
      lager.addChild(view)
      liv(view, { bob: sort === 'ballong' ? 9 : 6, sway: sort === 'fagel' ? 0.06 : 0.03, duration: 2.0 + Math.random() * 0.8 })
      this._treats.push({ view, x, y, tagen: false })
    }
  },

  // Nudd i flykten → pling, gnista, och saken far uppåt och tonar bort.
  _checkTreats(ctx) {
    const z = this._zacke
    if (!z || z.destroyed) return
    for (const t of this._treats || []) {
      if (t.tagen || t.view.destroyed) continue
      if (Math.hypot(z.x - t.x, z.y - t.y) > TREAT_R) continue
      t.tagen = true
      this._skord += 1
      ctx.services.audio.tone({ freq: PLING[Math.min(this._skord - 1, PLING.length - 1)], dur: 0.2, type: 'triangle', vol: 0.26 })
      sparkle(this._fx, t.x, t.y, { count: 7 })
      const v = t.view
      v._fxLiv?.kill() // vilorörelsen äger y — den måste släppa taget före flykten uppåt
      const st = { p: 0 }
      const y0 = v.y
      const tw = gsap.to(st, {
        p: 1,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          if (v.destroyed) {
            tw.kill()
            return
          }
          v.y = y0 - st.p * 46
          v.alpha = 1 - st.p
          v.scale.set(1 + st.p * 0.4)
        },
        onComplete: () => {
          if (!v.destroyed) v.visible = false
        },
      })
      this._winTweens.push(tw) // rivs vid nivåbygge och i destroy
    }
  },

  _buildElvira() {
    const c = new Container()
    c.eventMode = 'none'
    const skin = 0xffe0bd
    const legs = new Graphics()
    legs.roundRect(-9, -18, 7, 18, 3).fill(skin)
    legs.roundRect(2, -18, 7, 18, 3).fill(skin)
    const dress = new Graphics()
    dress.moveTo(-20, -16).lineTo(20, -16).lineTo(11, -48).lineTo(-11, -48).closePath().fill(COLORS.pink)
    const hair = new Graphics()
    hair.circle(0, -64, 18).fill(COLORS.purple)
    hair.circle(-15, -58, 8).fill(COLORS.purple)
    hair.circle(15, -58, 8).fill(COLORS.purple)
    const face = new Graphics()
    face.circle(0, -60, 15).fill(skin)
    face.circle(-5, -62, 2.5).fill(COLORS.ink)
    face.circle(5, -62, 2.5).fill(COLORS.ink)
    face.moveTo(6 * Math.cos(0.15 * Math.PI), -57 + 6 * Math.sin(0.15 * Math.PI))
      .arc(0, -57, 6, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 2.5, color: COLORS.ink })
    const arm = new Graphics()
    arm.moveTo(16, -44).lineTo(34, -58).stroke({ width: 6, color: skin, cap: 'round' }) // vinkar
    c.addChild(legs, dress, hair, face, arm)
    return c
  },

  // Staden. Ritas EN gång för hela världsbredden — inte per nivå — så inget bakas om
  // mitt i leken. `fjarran = true` ger det långsamma bandet längst bak: samma hus, men
  // mindre, blekare och utan detaljer. Att det bandet glider långsammare än det främre
  // är hela skillnaden mellan "en resa genom en stad" och "en rullande tapet".
  // Scenen för den AKTUELLA stämningen. `tid` tonar temat mot morgon/skymning/kväll ur
  // samma färger, så staden känns igen genom hela dygnet i stället för att bytas ut.
  _buildScene() {
    const s = this._stamning
    return createScene(s.tema, {
      width: this._vw,
      height: this._vh,
      tid: s.tid,
      kamera: { bredd: WORLD_MAX },
    })
  },

  // Husens kropp mörknar med kvällen medan fönstren går åt ANDRA hållet och tänds.
  _tintaStaden() {
    const s = this._stamning
    if (this._roofs && !this._roofs.destroyed) {
      this._roofs.kropp.tint = s.hus
      this._roofs.fonster.tint = s.lyse
    }
    if (this._farRoofs && !this._farRoofs.destroyed) {
      // Fjärranbandet ligger längre in i luften: samma stämning, men mörkare och utan
      // lysande fönster (det ritar inga). Utan den extra mörkningen ser de bortre husen
      // närmare ut än de främre på natten, och djupet vänder.
      this._farRoofs.kropp.tint = s.tema === 'night' ? 0x4d5480 : s.hus
    }
  },

  _buildRoofs(bredd, fjarran) {
    // Kropp och fönster i VAR SIN Graphics: en enda tint över hela huset hade släckt
    // fönstren i samma andetag som den mörknade väggen. Se STAMNINGAR.
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    const g = new Graphics()
    g.eventMode = 'none'
    const f = new Graphics()
    f.eventMode = 'none'
    c.addChild(g, f)
    c.kropp = g
    c.fonster = f
    const tops = [COLORS.red, COLORS.teal, COLORS.purple, COLORS.teal, COLORS.red, COLORS.blue]
    const w = fjarran ? HUS_W * 0.72 : HUS_W
    const n = Math.ceil(bredd / w) + 1
    // Fjärranbandet ligger högre upp (längre bort = närmare horisonten) och tonas mot
    // himlen med alpha i stället för med en egen färgpalett — då följer det med om
    // scenens himmel någon gång byts.
    const bas = fjarran ? 476 : 540
    const a = fjarran ? 0.45 : 1

    for (let i = 0; i < n; i++) {
      const x = i * w
      // Höjden varierar per hus i ett upprepande men inte uppenbart mönster, så staden
      // inte blir en kam. `i % 5` mot `i % 2` gör att takåsen aldrig hamnar i takt med
      // fästena (som ligger var 300:e px).
      const wallTop = bas + (i % 2) * 15 - (i % 5 === 0 ? 34 : 0)
      g.roundRect(x + 6, wallTop, w - 12, 720 - wallTop, 10).fill({ color: COLORS.brown, alpha: a })
      g.moveTo(x, wallTop + 10)
        .lineTo(x + w / 2, wallTop - 55)
        .lineTo(x + w, wallTop + 10)
        .closePath()
        .fill({ color: tops[i % tops.length], alpha: a })
      if (fjarran) continue
      if (i % 2) g.roundRect(x + w * 0.68, wallTop - 30, 16, 36, 4).fill(COLORS.brown) // skorsten
      f.roundRect(x + w * 0.5 - 16, wallTop + 50, 32, 40, 5).fill(COLORS.yellow) // fönster

      // FINARE MOT MÅLET. Kattungen sitter alltid längst till höger i banan, och världen
      // klipps strax bakom den — "längre åt höger" betyder alltså alltid "närmare målet",
      // på varje nivå. Stadsdelen blir tätare och mer påkostad ju längre in barnet svingar:
      // fler upplysta fönster, sedan balkongräcken, sist en spira på taket.
      //
      // HÖJDEN rörs INTE, och det är ett medvetet val. `ROOF_Y` (520) är fångstgolvet och
      // kattungen sitter på `ROOF_Y - 46`; högre hus mot målet hade lagt takåsen ÖVER både
      // fångstlinjen och kattungens fötter, så hon hade svävat framför en gavel och Zacke
      // flugit rakt genom ett tak innan molnet hann fånga honom.
      const narhet = x / Math.max(1, bredd)
      if (narhet > 0.34) f.roundRect(x + w * 0.5 - 13, wallTop + 112, 26, 34, 5).fill({ color: COLORS.yellow, alpha: 0.8 })
      else if (i % 3 === 0) f.roundRect(x + w * 0.5 - 13, wallTop + 112, 26, 34, 5).fill({ color: COLORS.yellow, alpha: 0.75 })
      if (narhet > 0.52) {
        // Två smala fönster till på var sida — tätare stad.
        f.roundRect(x + w * 0.22, wallTop + 56, 18, 30, 4).fill({ color: COLORS.yellow, alpha: 0.7 })
        f.roundRect(x + w * 0.78 - 18, wallTop + 56, 18, 30, 4).fill({ color: COLORS.yellow, alpha: 0.7 })
      }
      if (narhet > 0.62) {
        // Balkongräcke under mittfönstret.
        g.roundRect(x + w * 0.5 - 26, wallTop + 92, 52, 6, 3).fill(COLORS.brown)
        for (let s = 0; s < 4; s++) g.roundRect(x + w * 0.5 - 22 + s * 13, wallTop + 92, 4, 14, 2).fill(COLORS.brown)
      }
      if (narhet > 0.78) {
        // Spira med kula — den fina delen av stan.
        g.roundRect(x + w * 0.5 - 2, wallTop - 96, 4, 44, 2).fill(COLORS.brown)
        g.circle(x + w * 0.5, wallTop - 100, 7).fill(COLORS.yellow)
      }
    }
    return c
  },

  // ------------------------------------------------------------------ nät-längd
  _toggleLen(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._didCue = false
    this._ropeLen = this._ropeLen === SHORT ? LONG : SHORT
    if (this._lenLabel && !this._lenLabel.destroyed) this._lenLabel.text = this._ropeLen === LONG ? 'Lång' : 'Kort'
    if (this._lenBtn && !this._lenBtn.destroyed) pop(this._lenBtn)
    ctx.services.voice.say(this._ropeLen === LONG ? 'Långt nät!' : 'Kort nät!')
    this._showGhost()
  },

  // Spök-båge: visar vad den NYA nätlängden ger — banan för ett bra släpp (bästa
  // stunden i framåt-bågen), simulerad med EXAKT samma konstanter och steg som
  // flykten (G, L, AMP, dt=1) så förhandsvisningen stämmer av konstruktion.
  // Ritas som prickar som tonar bort själva; knapp → utfall blir synligt.
  _showGhost() {
    if (!this._alive || this._state !== 'swing' || !this._anchor) return
    const g = this._ghost
    if (!g || g.destroyed) return
    this._ghostTw?.kill()
    g.clear()
    g.alpha = 1
    const L = this._ropeLen
    const a = this._anchor
    const th = 0.75 // mitt i belönings-fönstret (0.45–1.05)
    const vt = Math.sqrt(Math.max(0, 2 * G * L * (Math.cos(th) - Math.cos(AMP))))
    let x = a.x + L * Math.sin(th)
    let y = a.y + L * Math.cos(th)
    let vx = vt * Math.cos(th)
    let vy = -vt * Math.sin(th)
    // Spök-tråden vid släpp-punkten.
    g.moveTo(a.x, a.y).lineTo(x, y).stroke({ width: 3, color: 0xffffff, alpha: 0.3 })
    // Prickad flyktbana fram till taklinjen.
    let last = { x, y }
    for (let step = 1; y < ROOF_Y && x < this._worldW + 40 && step < 240; step++) {
      vy += G
      x += vx
      y += vy
      if (step % 4 === 0) {
        g.circle(x, y, 5).fill({ color: 0xfff3b0, alpha: 0.9 - Math.min(1, step / 160) * 0.45 })
        last = { x, y }
      }
    }
    // Landnings-ring: "hit ungefär når du".
    g.circle(last.x, Math.min(last.y, ROOF_Y - 10), 13).stroke({ width: 4, color: 0xfff3b0, alpha: 0.9 })
    const st = { a: 1 }
    const tw = gsap.to(st, {
      a: 0,
      duration: 1.1,
      delay: 1.0,
      ease: 'power1.in',
      onUpdate: () => {
        if (g.destroyed) {
          tw.kill()
          return
        }
        g.alpha = st.a
      },
      onComplete: () => {
        if (!g.destroyed) {
          g.clear()
          g.alpha = 1
        }
      },
    })
    this._ghostTw = tw
  },

  // ------------------------------------------------------------------ släpp/fäst
  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _onSkyTap(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    if (this._state === 'swing') {
      this._release(ctx, false)
    } else {
      // Redan i flykt/firande → mjukt ljud + gnista där fingret är (aldrig straff;
      // P0 ÅTERKOPPLING: varje pekning ska ge ljud OCH bild).
      ctx.services.audio.sfx('soft')
      const p = this._varld.toLocal(e.global)
      sparkle(this._fx, p.x, p.y, { count: 4 })
    }
  },

  // Släpp nätet: pendel → projektil. guaranteed=true → garanterat kast (auto-hjälp).
  _release(ctx, guaranteed = false) {
    if (!this._alive || this._resolving || this._state !== 'swing') return
    this._idle = 0
    this._didCue = false
    if (guaranteed) {
      this._aimAt(this._anchors[this._a + 1])
    } else {
      const vt = this._omega * this._L // tangentiell fart
      this.vx = vt * Math.cos(this._theta)
      this.vy = vt * -Math.sin(this._theta)
      // Belöna ett väl TAJMAT släpp (högt i framåt-bågen) — barnets skicklighet ska
      // kännas tydligt bättre än ett slumpsläpp/auto-släpp.
      if (this._omega > 0 && this._theta >= 0.45 && this._theta <= 1.05) {
        sparkle(this._fx, this._zacke.x, this._zacke.y, { count: 6 })
        floatText(this._fx, this._zacke.x, this._zacke.y - 60, randomFrom(SWING_WORDS))
      }
    }
    this._state = 'flight'
    this._drawZacke('flight') // superhjalte-posen bors nar han lamnar traden
    ctx.services.audio.sfx('whoosh')
    sparkle(this._fx, this._anchor.x, this._anchor.y, { count: 5 })
    this._drawWeb()
  },

  // Garanterat kast mot ett fäste (auto-hjälp): nå punkten i T frames.
  _aimAt(target) {
    const z = this._zacke
    if (!target) {
      this.vx = 4.5
      this.vy = -3.5
      return
    }
    const T = 50
    const tx = target.x
    const ty = target.y + 140 // sikta strax under fästet (fångbart, över taket)
    this.vx = (tx - z.x) / T
    this.vy = (ty - z.y) / T - 0.5 * G * T
  },

  // Flykt → pendel vid fäste i. Beräknar ny pendel ur läge + fart, golv på amplitud.
  _attach(ctx, i) {
    const anchor = this._anchors[i]
    const z = this._zacke
    this._anchor = anchor
    this._a = i
    const dx = z.x - anchor.x
    const dy = z.y - anchor.y
    this._theta = Math.atan2(dx, dy) // från lodrät nedåt
    this._L = Math.max(60, Math.hypot(dx, dy)) // snäpps sen mjukt mot ropeLen
    this._omega = (this.vx * Math.cos(this._theta) - this.vy * Math.sin(this._theta)) / this._L
    this._ensureAmplitude() // garantera framåt-svep
    this._state = 'swing'
    this._drawZacke('swing')
    this._drawFart(0) // strecken tillhör flykten och ska inte hänga kvar i svinget
    this._idle = 0
    this._didCue = false

    // Mål-fästet nått?
    if (i >= this._anchors.length - 1) {
      this._reachGoal(ctx)
      return
    }

    // Riktigt nät-"thwip" när det nya nätet fäster (klipp finns; syntes som fallback).
    if (!ctx.services.audio.sample('thwip')) {
      ctx.services.audio.sfx(this._attachCount % 2 === 0 ? 'reveal' : 'pop')
    }
    this._attachCount += 1
    sparkle(this._fx, anchor.x, anchor.y, { count: 6 })
    floatText(this._fx, z.x, z.y - 70, randomFrom(SWING_WORDS))
    if (!this._toldSwing) {
      this._toldSwing = true
      ctx.services.voice.say('Bra svingat!')
    }
    // Kattungen ser honom komma: jam + hopp vid näst sista fästet (spänning före målet).
    if (i === this._anchors.length - 2 && this._kitten && !this._kitten.destroyed) {
      ctx.later(0.3, () => {
        if (this._kitten && !this._kitten.destroyed) {
          pop(this._kitten, { scale: 1.22 })
          if (!ctx.services.audio.sample('djur_katt')) ctx.services.audio.sfx('pop')
        }
      })
    }
  },

  // Säkerställ minst AMP framåt-amplitud (positiv omega), annars knuffa upp den.
  _ensureAmplitude() {
    const w2 = G / this._L
    const cosA = Math.cos(AMP)
    const cosT = Math.cos(this._theta)
    const need = cosT > cosA ? Math.sqrt(2 * w2 * (cosT - cosA)) : 0.012
    if (this._omega < need) this._omega = need
  },

  // No-fail: moln glider in, bär Zacke mjukt till SENAST nådda fäste (aldrig bakåt).
  _cloudRescue(ctx) {
    if (!this._alive || this._resolving || this._state === 'rescue') return
    this._state = 'rescue'
    this._drawZacke('swing')
    this._drawFart(0)
    const z = this._zacke
    const anchor = this._anchors[this._a]
    const L = this._ropeLen
    const startTheta = -0.9
    const destX = anchor.x + L * Math.sin(startTheta)
    const destY = anchor.y + L * Math.cos(startTheta)

    ctx.services.audio.sfx('soft')
    ctx.services.voice.say('Hoppsan! Molnet fångar dig.')
    floatText(this._fx, z.x, z.y - 40, '😄', { fontSize: 48 })

    // RITAT moln (P0 ASSETS) — var en ☁️-emoji.
    const cloud = new Graphics()
    cloud.circle(-38, 6, 30).fill(0xfffdf7)
    cloud.circle(0, -14, 40).fill(0xfffdf7)
    cloud.circle(40, 4, 32).fill(0xfffdf7)
    cloud.roundRect(-56, 2, 112, 34, 17).fill(0xfffdf7)
    cloud.circle(-14, -20, 22).fill({ color: 0xffffff, alpha: 0.85 })
    cloud.position.set(z.x, z.y + 64)
    cloud.eventMode = 'none'
    this._fx.addChild(cloud)

    // Exit-säkert glid (samma mönster som lib/feedback.js): tweena en {}-proxy och
    // kopiera till Pixi-objekten ENDAST om de lever. Tween:en dödas ALDRIG av exit —
    // den löper klart självständigt och städar bort molnet i onComplete (annars
    // skulle molnet bli kvar i fxLayer). Zacke-skrivningar är vaktade.
    const st = { zx: z.x, zy: z.y, cx: z.x, cy: z.y + 64 }
    gsap.to(st, {
      zx: destX,
      zy: destY,
      cx: destX,
      cy: destY + 64,
      duration: 0.9,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (!cloud.destroyed) cloud.position.set(st.cx, st.cy)
        if (this._alive && !z.destroyed) {
          z.position.set(st.zx, st.zy)
          z.rotation = 0
        }
      },
      onComplete: () => {
        if (!cloud.destroyed) cloud.destroy()
        if (!this._alive) return
        // Återuppta svinget vid senast nådda fäste med fin amplitud.
        this._anchor = anchor
        this._L = L
        this._theta = startTheta
        this._omega = 0
        this._ensureAmplitude()
        this._state = 'swing'
        this._idle = 0
        this._didCue = false
      },
    })
  },

  // Mål nått → spelets EGEN vinstscen: Zacke landar på taket, Elvira springer fram
  // och kramar honom, kattungen jamar och hoppar upp i famnen — SEDAN det delade
  // firandet (complete() säger PRAISE och avbryter allt tal, därför sist, efter att
  // spelets egen replik hunnit klart). Alla fördröjningar via ctx.later (dör med
  // omgången), alla tweens på proxys med destroyed-vakter (exit mitt i scenen ofarligt).
  _reachGoal(ctx) {
    if (this._resolving) return
    this._resolving = true
    const z = this._zacke
    const goal = this._anchors[this._anchors.length - 1]

    ctx.services.audio.sfx('correct')
    this._web.clear() // han släpper tråden och landar

    // 1) Zacke landar mjukt på mål-taket bredvid kattungen.
    const lx = Math.min(goal.x - 64, this._worldW - 140)
    const ly = ROOF_Y - 58
    const st = { x: z.x, y: z.y, r: z.rotation }
    const tw1 = gsap.to(st, {
      x: lx,
      y: ly,
      r: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (!this._alive || z.destroyed) {
          tw1.kill()
          return
        }
        z.position.set(st.x, st.y)
        z.rotation = st.r
      },
    })
    this._winTweens.push(tw1)
    ctx.later(0.1, () => ctx.services.voice.say('Du räddade kattungen!'))

    // 2) Elvira springer fram i små skutt och kramar Zacke.
    const elvira = this._elvira
    if (elvira && !elvira.destroyed) {
      const ex0 = elvira.x
      const es = { p: 0 }
      const tw2 = gsap.to(es, {
        p: 1,
        duration: 0.6,
        delay: 0.5,
        ease: 'power1.inOut',
        onUpdate: () => {
          if (!this._alive || elvira.destroyed) {
            tw2.kill()
            return
          }
          elvira.x = ex0 + (lx + 54 - ex0) * es.p
          elvira.y = ROOF_Y - Math.abs(Math.sin(es.p * Math.PI * 3)) * 14
        },
        onComplete: () => {
          if (!this._alive || elvira.destroyed) return
          elvira.y = ROOF_Y
          ctx.services.audio.sfx('match')
          floatText(this._fx, lx + 28, ly - 96, '❤️', { fontSize: 64, rise: 70, duration: 1.2 })
          wiggle(elvira)
          if (!z.destroyed) wiggle(z)
        },
      })
      this._winTweens.push(tw2)
    }

    // 3) Kattungen jamar och hoppar upp i famnen.
    const kitten = this._kitten
    if (kitten && !kitten.destroyed) {
      ctx.later(1.15, () => {
        if (kitten.destroyed) return
        if (!ctx.services.audio.sample('djur_katt')) ctx.services.audio.sfx('pop')
        const kx0 = kitten.x
        const ky0 = kitten.y
        const ks = { p: 0 }
        const tw3 = gsap.to(ks, {
          p: 1,
          duration: 0.45,
          ease: 'power1.in',
          onUpdate: () => {
            if (!this._alive || kitten.destroyed) {
              tw3.kill()
              return
            }
            // Hoppar över Zackes axel till hans VÄNSTRA sida — höger är Elviras,
            // och mitt framför honom göms kattungen bakom kroppen (Zacke ritas överst).
            kitten.x = kx0 + (lx - 36 - kx0) * ks.p
            kitten.y = ky0 + (ly + 6 - ky0) * ks.p - Math.sin(ks.p * Math.PI) * 84
          },
          onComplete: () => {
            if (this._alive && !kitten.destroyed) pop(kitten, { scale: 1.25 })
          },
        })
        this._winTweens.push(tw3)
      })
    }

    // 4) Delat firande + klistermärke (en gång), höj nivå, räkna mål (aldrig sjunkande).
    ctx.later(1.8, () => {
      ctx.progress.complete()
      burst(this._fx, lx + 20, ly - 20, { count: 18 })
    })
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('svingar', (ctx.progress.get().custom?.svingar || 0) + 1)

    ctx.later(3.0, () => this._buildLevel(this._level))
    // 5) Berättelsen fortsätter: nästa kattunge ropar (efter nybygget, efter PRAISE).
    ctx.later(4.2, () => {
      ctx.services.voice.say('En kattunge till behöver hjälp!')
      if (this._kitten && !this._kitten.destroyed) {
        wiggle(this._kitten)
        if (!ctx.services.audio.sample('djur_katt')) ctx.services.audio.sfx('pop')
      }
    })
  },

  // ------------------------------------------------------------------ nät-ritning
  _drawWeb() {
    const g = this._web
    if (!g || g.destroyed) return
    // Inget nät i flykt/moln — och inte i vinstscenen (ticken som anropar _attach
    // fortsätter till _drawWeb längst ner och skulle annars frysa en tråd i luften).
    g.clear()
    if (this._state !== 'swing' || !this._anchor || this._resolving) return
    const x0 = this._anchor.x
    const y0 = this._anchor.y
    const x1 = this._zacke.x
    const y1 = this._zacke.y
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len
    const py = dx / len
    g.moveTo(x0, y0)
    for (let i = 1; i <= 3; i++) {
      const t = i / 4
      const off = (i % 2 === 0 ? 1 : -1) * 6 // zig-zag för spindeltråd-känsla
      g.lineTo(x0 + dx * t + px * off, y0 + dy * t + py * off)
    }
    g.lineTo(x1, y1)
    g.stroke({ width: 6, color: 0xffffff, alpha: 0.9 })
  },

  // ------------------------------------------------------------------ tick
  _update(ctx, ticker) {
    if (!this._alive || this._resolving) return
    const dt = Math.min(ticker.deltaMS / 16.67, 2) // klampa flikbyte

    if (this._state === 'swing') {
      this._L += (this._ropeLen - this._L) * 0.1 // mjuk längd-justering
      const alpha = -(G / this._L) * Math.sin(this._theta)
      this._omega += alpha * dt
      this._omega *= 0.9999 // pyttenliten dämpning (mjukar av)
      this._theta += this._omega * dt
      if (Math.abs(this._theta) > THETA_MAX) {
        this._theta = Math.sign(this._theta) * THETA_MAX
        this._omega *= -0.5
      }
      const z = this._zacke
      z.x = this._anchor.x + this._L * Math.sin(this._theta)
      z.y = this._anchor.y + this._L * Math.cos(this._theta)
      z.rotation = this._theta * 0.5

      // Idle: om-cue ~6s, sedan auto-släpp i bästa stund FÖRST ~11s (barnet ska hinna
      // släppa själv länge först) och bara i den goda framåt-stunden.
      this._idle += ticker.deltaMS
      if (this._idle > 6000 && !this._didCue) {
        this._didCue = true
        this._idleCue(ctx)
      }
      if (this._idle > 11000 && this._omega > 0 && this._theta >= 0.5) {
        this._release(ctx, true)
      }
    } else if (this._state === 'flight') {
      this.vy += G * dt
      const z = this._zacke
      z.x += this.vx * dt
      z.y += this.vy * dt

      // KROPPEN PEKAR DIT HAN FAR. Förut snurrade han bara (`rotation += 0.04`), vilket
      // läser som att han tappat kontrollen — en hjälte STYR sin flykt.
      //
      // Figuren är ritad stående, alltså pekar hans lokala "upp" (0,−1). Ska det sammanfalla
      // med farten (cos a, sin a) krävs rotationen a + π/2: sin(a+π/2) = cos a och
      // −cos(a+π/2) = sin a. Därför halvvarvet — det är inte en fudge-faktor.
      const fart = Math.hypot(this.vx, this.vy)
      // Målvinkeln kläms till ett behagligt spann. Utan taket dyker han ned mot 135° i
      // slutet av bågen och läser som att han störtar, inte som att han flyger.
      const mal = Math.min(1.85, Math.max(0.42, Math.atan2(this.vy, this.vx) + Math.PI / 2))
      // Mjuk följning i stället för hopp: han kommer från svingets `theta * 0.5` och ska
      // glida in i flygposen, inte snäppa till den på en bildruta.
      z.rotation += (mal - z.rotation) * Math.min(1, 0.18 * dt)
      this._drawFart(fart)

      this._checkTreats(ctx)
      const next = this._anchors[this._a + 1]
      // Förlåtande fäst-fönster: nå fram horisontellt utan att sjunka under taket.
      if (next && z.x >= next.x - 45 && z.y < ROOF_Y) {
        this._attach(ctx, this._a + 1)
      } else if (z.y >= ROOF_Y || z.x > this._worldW - 40) {
        // Upprepade missar → nästa kast blir garanterat (auto-hjälp).
        this._cloudRescue(ctx)
      }
    }
    // state 'rescue' → moln-tween driver positionen.

    this._drawWeb()
  },

  _idleCue(ctx) {
    const v = ctx.services.voice
    if (v.replayLast) v.replayLast()
    else v.say(this.voiceIntro)
    if (this._zacke && !this._zacke.destroyed) pop(this._zacke, { scale: 1.1 })
    floatText(this._fx, this._zacke.x, this._zacke.y - 60, '👆')
  },

  // ------------------------------------------------------------------ städning
  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._ghostTw?.kill()
    for (const t of this._winTweens || []) t.kill()
    this._winTweens = []
    if (this._sky && !this._sky.destroyed) this._sky.off('pointertap', this._hRelease)
    if (this._lenBtn && !this._lenBtn.destroyed) {
      gsap.killTweensOf(this._lenBtn)
      gsap.killTweensOf(this._lenBtn.scale)
    }
    if (this._zacke && !this._zacke.destroyed) {
      gsap.killTweensOf(this._zacke)
      gsap.killTweensOf(this._zacke.scale)
    }
    if (this._kitten && !this._kitten.destroyed) {
      gsap.killTweensOf(this._kitten)
      gsap.killTweensOf(this._kitten.scale)
    }
    if (this._elvira && !this._elvira.destroyed) gsap.killTweensOf(this._elvira)
    // `liv()` är en repeat:-1-tween: den slutar ALDRIG av sig själv. Den vaktar mot ett
    // förstört mål, men tickar vidare i gsap tills den dödas explicit.
    for (const t of this._treats || []) {
      if (!t.view || t.view.destroyed) continue
      t.view._fxLiv?.kill()
      gsap.killTweensOf(t.view)
      gsap.killTweensOf(t.view.scale)
    }
    this._treats = []
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    // Kameran äger en egen ticker-callback och alla parallaxlager. `destroy()` tar bort
    // callbacken OCH river `kam.root` (som i Pixi v8 kopplar loss sig ur sin förälder),
    // så `_root.destroy` nedan hittar inget halvdött barn.
    this._kam?.destroy()
    this._kam = null
    this._varld = this._fx = this._hud = this._farLayer = null
    this._root?.destroy({ children: true })
  },
}
