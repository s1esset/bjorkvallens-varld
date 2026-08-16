// Leksakslådan — böka i en riktig hög och gräv fram det Bobo bad om (2–5 år).
//
// Skillnaden mot `sortera-skrap` är HÖGEN. Där ligger sakerna prydligt uppradade på
// en rad och snäpper i en tunna; här ligger ett par dussin leksaker huller om buller i en låda
// med äkta matter.js-kollisioner, olika storlek och olika MASSA. Bobo håller upp en
// beställningslapp ("Hittar du tågloket?") och det man beställt ligger nästan alltid
// UNDER något annat. Man måste dra undan, knuffa, lyfta bort — grävandet ÄR spelet.
//
// FYSIK (matter.js). Den lyfta leksaken är en HELT VANLIG dynamisk kropp som varje
// fast steg får en hastighet mot fingret:
//
//     v = klamp((finger − kropp) · STYR_K, spec.fart)
//
// Två saker faller ut av det, och båda är designen:
//   · Den lyfta saken KROCKAR med resten av högen medan den bärs. Det är därför man
//     kan böka: dra bollen åt sidan och nallen rullar ner i gropen.
//   · `spec.fart` är ett TAK per leksak. Tågloket får 9 px/steg och roboten 11 medan
//     bollen får 22, så de tunga släpar efter fingret och känns tröga — och eftersom
//     de samtidigt har fyra gånger massan välter de lätta saker på vägen. Det är
//     P0-MOTGÅNGEN: rolig, tydlig orsak, alltid åtgärdbar, och taket ligger i
//     hastigheten så inget kan gå snabbare fel än barnet hinner med.
//
// Fällor som respekteras med flit (CLAUDE.md):
// · INGEN kropp bärs med `Body.setPosition(kropp, p, true)` — det lämnar kvar en fart
//   för alltid och får lösaren att läsa kontakten som separerande. Styrningen sker med
//   `Body.setVelocity` i `phys.beforeStep()`, alltså en gång per FAST steg (farten är
//   px/steg och en bildruta rymmer 1–5 steg).
// · Lådans kanter är statiska; en statisk kropps `restitution` nollas av
//   `Body.setStatic`, så studsen sitter på `{ isStatic: true, studs }`.
// · `addTarget`-noden (korgen) animeras ALDRIG — vickningen ligger i ett BARN, annars
//   flyttar snäppytan sig mitt i ett släpp.
// · DragControllern får ett osynligt HANDTAG per leksak, inte leksakens egen vy.
//   Vyn ägs av fysikkroppen (`phys.link`); handtaget ägs av fingret. Skulle båda skriva
//   samma nod hade den lyfta leksaken ritats vid fingret medan den knuffade högen från
//   ett helt annat ställe — och hela tyngdkänslan i tågloket är just att de två skiljer
//   sig åt.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, mat } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { DragController } from '../../lib/DragController.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { pop, puff, sparkle, floatText, bigCelebration, liv, shake, kvittera } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { shuffle } from '../../lib/swedish.js'
import { sphereFill, cylinderFill, topLightFill, groundFill, verticalFill } from '../../lib/form.js'

// ---- Rummet (designkoordinater 1280×720) ----------------------------------
const GOLV = 660 // golvets ovansida
const L_UT_V = 84 // lådans yttre vänsterkant
const L_UT_H = 768 // lådans yttre högerkant
const L_IN_V = 128 // innerväggarnas insida
const L_IN_H = 724
// Mynningen låg på 300 när lådan rymde 8–11 leksaker. Med dubbla högen (16–22) räcker
// inte volymen: innerytan 596×340 = 202 640 px² tar ~130 000 px² leksak innan högen
// reser sig ovanför kanten och rullar ut på golvet. 244 ger 596×396 = 236 016 px²
// (×1,17) och leksakerna krymptes samtidigt med SKALA (×0,58 i yta) — tillsammans
// dryga dubbla rymden, alltså en HÖG som når upp mot kanten utan att svämma över.
const L_TOPP = 244 // lådans mynning
const L_BOTTEN = 640 // innergolvet
const L_MITT = (L_IN_V + L_IN_H) / 2 // 426
// Hur brett leksakerna släpps ner. Med hela innerbredden (416 px band) la sig 8–11
// leksaker SIDA VID SIDA i ett enda lager: uppmätt 10 av 10 rundor där den beställda
// saken inte hade en enda leksak framför sig — alltså noll bökande, i ett spel vars
// hela premiss är att gräva. Ett smalare band tvingar högen att bli en HÖG.
const SPRIDNING = 416
const KANT_Y = 616 // framkantens ovansida (dekor framför högens nedersta rad)

const KORG = { x: 940, y: 590 }
const BOBO = { x: 1142, y: 540 }
const LAPP = { x: 1030, y: 156 }
const LOCK_VILA = { x: 426, y: 150, rot: 0.06 } // hänger på väggen ovanför lådan
// Lockets mått delas med `makeLock()` — spikarna måste sitta där beslagen FAKTISKT
// hamnar. De var hårdkodade till x 180/672 medan beslagen satt på 116/736: locket
// såg ut att sväva fritt i luften ovanför lådan. Syntes bara i skärmdumpen.
const LOCK_W = 700
const LOCK_H = 46
const LOCK_BESLAG_DX = LOCK_W / 2 - 40
const LOCK_STANGT = { x: 426, y: L_TOPP + 20, rot: 0 } // vilar på mynningen

// ---- Fysik ----------------------------------------------------------------
const G = 1.0
const STYR_K = 0.34 // px/steg per px avstånd mellan kropp och finger
const SLAPP_TAK = 18 // px/steg — släppfartens tak (annars kan något tunnla genom en vägg)
const FART_TAK = 30 // px/steg — hård spärr på ALLA leksaker (lådans väggar är 44 px tjocka)
const STUDS_KYLA = 0.9 // s mellan studsbollens studsar (TAK på motgången)
const MAL_PER_RUNDA = 4

// Stigande pentatonik: man HÖR hur många beställningar som är klara.
const TON = [523.25, 587.33, 659.25, 783.99]
const FANFAR = [523.25, 659.25, 783.99, 1046.5]

// Leksakerna. `fart` är styrningens tak i px/steg — det är DEN som gör tågloket trögt,
// medan `d` (densiteten) avgör hur mycket det knuffar undan när det ändå rör sig.
// Ungefärlig massa = area · d: boll 7,6 · nalle 13,7 · tågloke 54 · robot 35 · bil 21.
//
// Måtten nedan är den RITADE naturliga storleken. Kroppen (och träffytan) byggs av
// samma mått gånger SKALA — se `SPEC` under tabellen.
const NATUR = {
  boll: { key: 'boll', form: 'cirkel', r: 52, d: 0.0009, fart: 22, mtrl: 'gummi', studs: 0.5, farg: COLORS.red },
  nalle: { key: 'nalle', form: 'cirkel', r: 58, d: 0.0013, fart: 15, mtrl: 'tra', studs: 0.05, farg: 0xb07a4a },
  tagloke: { key: 'tagloke', form: 'ruta', w: 150, h: 86, d: 0.0042, fart: 9, mtrl: 'metall', studs: 0.08, farg: 0xd94c4c },
  anka: { key: 'anka', form: 'cirkel', r: 50, d: 0.0008, fart: 22, mtrl: 'gummi', studs: 0.34, farg: COLORS.yellow },
  bil: { key: 'bil', form: 'ruta', w: 132, h: 74, d: 0.0022, fart: 15, mtrl: 'tra', studs: 0.12, farg: COLORS.blue },
  kloss: { key: 'kloss', form: 'ruta', w: 84, h: 84, d: 0.0026, fart: 15, mtrl: 'tra', studs: 0.06, farg: 0xd9a05b },
  stjarna: { key: 'stjarna', form: 'cirkel', r: 54, d: 0.0008, fart: 22, mtrl: 'tra', studs: 0.1, farg: COLORS.yellow },
  tarning: { key: 'tarning', form: 'ruta', w: 82, h: 82, d: 0.0024, fart: 15, mtrl: 'tra', studs: 0.14, farg: COLORS.white },
  robot: { key: 'robot', form: 'ruta', w: 92, h: 108, d: 0.0034, fart: 11, mtrl: 'metall', studs: 0.1, farg: 0x8fa3b8 },
  trumma: { key: 'trumma', form: 'cirkel', r: 50, d: 0.0019, fart: 15, mtrl: 'tra', studs: 0.2, farg: COLORS.red },
  dino: { key: 'dino', form: 'ruta', w: 122, h: 84, d: 0.0017, fart: 15, mtrl: 'gummi', studs: 0.3, farg: COLORS.green },
  // Sällsynt. Beställs ALDRIG (den skulle vara orättvis att jaga) — den är ren lek.
  studsboll: { key: 'studsboll', form: 'cirkel', r: 42, d: 0.0009, fart: 22, mtrl: 'gummi', studs: 0.86, farg: COLORS.purple },
}
// Dubbla högen kräver mindre leksaker (se L_TOPP). SKALA krymper både bilden och
// kroppen; densiteten kompenseras med 1/SKALA² så MASSAN — och därmed hela den mätta
// tyngdkänslan i tågloket och roboten — är exakt densamma som förut. `fart`-taken är
// px/steg och rörs inte alls.
const SKALA = 0.76
const skalad = (s) => ({
  ...s,
  ...(s.r != null ? { r: s.r * SKALA } : null),
  ...(s.w != null ? { w: s.w * SKALA, h: s.h * SKALA } : null),
  d: s.d / (SKALA * SKALA),
})
const SPEC = Object.fromEntries(Object.entries(NATUR).map(([k, s]) => [k, skalad(s)]))

const BESTALLBARA = ['boll', 'nalle', 'tagloke', 'anka', 'bil', 'kloss', 'stjarna', 'tarning', 'robot', 'trumma', 'dino']

const KROPP_OPTS = (s) =>
  mat(s.mtrl, {
    density: s.d,
    friction: 0.42,
    frictionStatic: 0.7,
    frictionAir: 0.012,
    restitution: s.studs,
    label: 'leksak',
  })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const storsta = (s) => (s.form === 'cirkel' ? s.r * 2 : Math.max(s.w, s.h))
// Träffytan: ALDRIG under 112 px bred (P0 kräver 96 + osynlig halo).
const halvYta = (s) => Math.max(56, storsta(s) / 2 + 14)

export default {
  id: 'leksakslada',
  titleSv: 'Leksakslådan',
  icon: '🧸',
  category: 'fysik',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'leksakslada',
  voiceIntro: 'Titta, en låda full med leksaker! Bobo vill ha en sak i taget.',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._sokT = 0
    this._sortT = 0
    this._klar = false
    this._klara = 0
    this._onskad = null
    this._ordning = []
    this._leksaker = []
    this._korgIkoner = []
    this._sistStuds = -99
    this._sistFel = -99
    this._sagt = {}
    this._halls = null

    this._niva = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._phys = new PhysicsWorld({ gravityY: G, walls: [] })
    this._unbindLjud = this._phys.impactAudio(ctx.services.audio, { vol: 0.18, minSpeed: 2.2, hardSpeed: 13, maxPerFrame: 2 })
    this._unbindSlag = this._phys.onImpact((h) => this._anslag(ctx, h), { minSpeed: 3, maxPerFrame: 2 })
    this._unbindSteg = this._phys.beforeStep(() => this._styr())

    this._byggRum(ctx)
    this._byggLada()
    this._byggBobo(ctx)
    this._byggLapp(ctx)

    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._korgRec = this._drag.addTarget(this._korg, () => true, { hitRadius: 150 })

    this._nyRunda(ctx, true)

    this._tick = (t) => this._uppdatera(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scen ---------------------------------------------------------------

  _byggRum(ctx) {
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height, ground: false }))

    // Osynlig tryckyta längst ner i ritordningen: en pekning som inte träffar något
    // annat ska ändå få ett svar inom 100 ms (P0 ÅTERKOPPLING).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatch = (e) => this._tomTryck(ctx, e)
    this._catcher.on('pointertap', this._onCatch)
    this._root.addChild(this._catcher)

    this._bakLager = new Container()
    this._bakLager.eventMode = 'none'
    this._bakLager.interactiveChildren = false
    this._root.addChild(this._bakLager)

    // Barnkammaren: tapetränder, golvlist, plankgolv och en rund matta.
    const rum = new Graphics()
    for (let x = -40; x < ctx.width + 80; x += 152) {
      rum.rect(x, 0, 66, GOLV).fill({ color: 0xffe9c7, alpha: 0.55 })
    }
    rum.rect(0, GOLV - 20, ctx.width, 20).fill(verticalFill(0xfff6e6, 0xe4cba4))
    rum.rect(0, GOLV, ctx.width, ctx.height - GOLV).fill(groundFill(0xd9b184))
    for (let x = -30; x < ctx.width + 60; x += 116) {
      rum.moveTo(x, GOLV).lineTo(x - 26, ctx.height).stroke({ width: 3, color: 0xb98f66, alpha: 0.5 })
    }
    rum.rect(0, GOLV, ctx.width, 6).fill({ color: 0xb98f66, alpha: 0.5 })
    // Mattan under korgen — det är HIT en leksak som släpps utanför lådan hamnar.
    rum.ellipse(978, 672, 296, 44).fill({ color: 0x8fd6d2, alpha: 0.85 })
    rum.ellipse(978, 672, 296, 44).stroke({ width: 7, color: 0x57c8c3 })
    rum.ellipse(978, 672, 214, 30).stroke({ width: 6, color: 0xfff2c8, alpha: 0.8 })
    // Spikarna som locket hänger på (de sitter kvar när locket faller). Läget räknas
    // ur lockets EGNA beslagsavstånd med vilolutningen pålagd, så spiken hamnar i hålet.
    for (const s of [-1, 1]) {
      const nx = LOCK_VILA.x + s * LOCK_BESLAG_DX * Math.cos(LOCK_VILA.rot)
      const ny = LOCK_VILA.y + s * LOCK_BESLAG_DX * Math.sin(LOCK_VILA.rot)
      rum.circle(nx, ny, 7).fill(0x9aa4b0)
      rum.circle(nx - 2, ny - 2, 2.8).fill({ color: COLORS.white, alpha: 0.7 })
    }
    this._bakLager.addChild(rum)

    // Lådans insida (bakstycke + innerväggarnas skuggsidor).
    const insida = new Graphics()
    insida.roundRect(L_UT_V, L_TOPP - 8, L_UT_H - L_UT_V, L_BOTTEN + 34 - L_TOPP, 14).fill(topLightFill(0xa5714c))
    insida.rect(L_IN_V, L_TOPP, L_IN_H - L_IN_V, L_BOTTEN - L_TOPP).fill(verticalFill(0x6f4830, 0x9a6b3d))
    for (let i = 0; i < 5; i++) {
      const y = L_TOPP + 34 + i * 62
      insida.moveTo(L_IN_V + 10, y).quadraticCurveTo(L_MITT, y + 9, L_IN_H - 10, y).stroke({ width: 3, color: 0x5d3c26, alpha: 0.35 })
    }
    this._bakLager.addChild(insida)

    this._lockLager = new Container()
    this._lockLager.eventMode = 'none'
    this._lockLager.interactiveChildren = false
    this._root.addChild(this._lockLager)

    this._lock = makeLock()
    this._lock.position.set(LOCK_VILA.x, LOCK_VILA.y)
    this._lock.rotation = LOCK_VILA.rot
    this._lockLager.addChild(this._lock)

    // Lyft-skuggan under den leksak som bärs (egen, i stället för DragControllerns —
    // dess skugga följer FINGRET, och för en tung leksak ligger fingret långt före).
    this._skuggLager = new Container()
    this._skuggLager.eventMode = 'none'
    this._skuggLager.interactiveChildren = false
    this._root.addChild(this._skuggLager)
    // Skuggan bor i en CONTAINER som flyttas — en bar Graphics ritad i origo med en
    // stor `.position` renderas som en helskärmsstapel i Pixi v8 (sedd i sortera-skrap).
    this._lyftNod = new Container()
    this._lyftNod.alpha = 0
    this._lyftNod.eventMode = 'none'
    this._lyft = new Graphics()
    this._lyft.eventMode = 'none'
    this._lyftNod.addChild(this._lyft)
    this._skuggLager.addChild(this._lyftNod)

    this._leksakLager = new Container()
    this._leksakLager.eventMode = 'none'
    this._leksakLager.interactiveChildren = false
    this._root.addChild(this._leksakLager)

    this._framLager = new Container()
    this._framLager.eventMode = 'none'
    this._framLager.interactiveChildren = false
    this._root.addChild(this._framLager)
    this._framLager.addChild(makeLadaFram())

    this._boboLager = new Container()
    this._root.addChild(this._boboLager)

    this._uiLager = new Container()
    this._root.addChild(this._uiLager)

    // Handtagen ligger ÖVERST så den leksak som råkar hamna bakom Bobo eller lådans
    // framkant ändå går att peka på — annars vore en begravd leksak en död träffyta.
    this._handtagLager = new Container()
    this._root.addChild(this._handtagLager)
  },

  // Lådans kanter som statiska kroppar + rummets golv och väggar.
  _byggLada() {
    const kant = { isStatic: true, studs: 0.16, friction: 0.55, label: 'lada' }
    this._phys.rectangle((L_UT_V + L_IN_V) / 2, (L_TOPP + L_BOTTEN) / 2, L_IN_V - L_UT_V, L_BOTTEN - L_TOPP, kant)
    this._phys.rectangle((L_IN_H + L_UT_H) / 2, (L_TOPP + L_BOTTEN) / 2, L_UT_H - L_IN_H, L_BOTTEN - L_TOPP, kant)
    this._phys.rectangle(L_MITT, L_BOTTEN + 22, L_IN_H - L_IN_V + 44, 44, { isStatic: true, studs: 0.1, friction: 0.8, label: 'ladbotten' })
    this._phys.rectangle(640, GOLV + 32, 1800, 64, { isStatic: true, studs: 0.06, friction: 0.9, label: 'golv' })
    this._phys.rectangle(-40, 360, 80, 1000, { isStatic: true, friction: 0.5, label: 'vagg' })
    this._phys.rectangle(1320, 360, 80, 1000, { isStatic: true, friction: 0.5, label: 'vagg' })
  },

  // Mottagaren: Bobo med korgen. Riggen ligger i en YTTRE container så spelet kan
  // flytta honom utan att slåss med riggens egna reaktions-tweens.
  _byggBobo(ctx) {
    this._korg = new Container()
    this._korg.position.set(KORG.x, KORG.y)
    this._korg.hitArea = new Rectangle(-104, -92, 208, 168)
    this._korg.eventMode = 'static'
    this._korg.cursor = 'pointer'
    // ALLT som rör sig ligger i `_korgInner` — mål-noden ovan står blick stilla, annars
    // flyttar snäppytan sig mitt i ett släpp (CLAUDE.md: `snal-snappyta`).
    this._korgInner = new Container()
    this._korgInner.eventMode = 'none'
    this._korgBotten = new Container()
    this._korgBotten.eventMode = 'none'
    this._korgInner.addChild(makeKorgBak(), this._korgBotten, makeKorgFram())
    this._korg.addChild(this._korgInner)
    this._onKorg = () => this._korgTryck(ctx)
    this._korg.on('pointertap', this._onKorg)
    this._boboLager.addChild(this._korg)

    this._bobo = new Container()
    this._kar = makeKaraktar({ r: 50 })
    this._bobo.addChild(this._kar.view)
    this._bobo.position.set(BOBO.x, BOBO.y)
    this._bobo.eventMode = 'none'
    this._bobo.interactiveChildren = false
    this._boboLager.addChild(this._bobo)
  },

  // Beställningslappen är UI (P0 ASSETS tillåter en ritad ikon i en panel) — en
  // anslagstavla med den efterfrågade leksaken ritad i mitten och fyra prickar som
  // tänds. Prickarna kan bara TÄNDAS, aldrig släckas: det är ingen poäng som sjunker.
  _byggLapp(ctx) {
    this._lapp = new Container()
    this._lapp.position.set(LAPP.x, LAPP.y)
    this._lapp.hitArea = new Rectangle(-136, -118, 272, 236)
    this._lapp.eventMode = 'static'
    this._lapp.cursor = 'pointer'
    this._lappInner = new Container()
    this._lappInner.eventMode = 'none'
    this._lappInner.addChild(makeLappTavla())
    this._lappIkon = new Container()
    this._lappIkon.eventMode = 'none'
    this._lappIkon.position.set(0, -14)
    this._lappRit = new Graphics()
    this._lappIkon.addChild(this._lappRit)
    this._lappInner.addChild(this._lappIkon)
    this._prickar = []
    for (let i = 0; i < MAL_PER_RUNDA; i++) {
      const p = new Graphics()
      p.position.set(-54 + i * 36, 82)
      p.eventMode = 'none'
      this._lappInner.addChild(p)
      this._prickar.push(p)
    }
    this._lapp.addChild(this._lappInner)
    this._onLapp = () => this._lappTryck(ctx)
    this._lapp.on('pointertap', this._onLapp)
    this._uiLager.addChild(this._lapp)
    this._ritaPrickar()
  },

  _ritaPrickar() {
    for (let i = 0; i < this._prickar.length; i++) {
      const g = this._prickar[i]
      if (!g || g.destroyed) continue
      g.clear()
      if (i < this._klara) {
        g.star(0, 0, 5, 15, 7).fill(COLORS.yellow).stroke({ width: 2.5, color: COLORS.orangeDark })
      } else {
        g.circle(0, 0, 12).fill({ color: 0xe4d3b4, alpha: 0.8 }).stroke({ width: 2.5, color: 0xbfa07a })
      }
    }
  },

  _visaLapp(key) {
    const g = this._lappRit
    if (!g || g.destroyed) return
    g.clear()
    if (!key) return
    ritaLeksak(g, key)
    // NATUR, inte SPEC: `ritaLeksak` ritar i naturlig storlek — lappens ikon ska vara
    // 104 px oavsett hur mycket leksaken krymps i lådan.
    this._lappIkon.scale.set(104 / storsta(NATUR[key]))
  },

  // ---- Runda --------------------------------------------------------------

  _nyRunda(ctx, forsta = false) {
    if (!this._alive) return
    this._finishTl?.kill()
    this._finishTl = null
    this._klar = false
    this._klara = 0
    this._onskad = null
    this._ordning = []
    this._idle = 0
    this._sokT = 0
    this._ritaPrickar()
    this._visaLapp(null)
    this._rensaLeksaker()
    this._rensaKorg()

    if (this._lock && !this._lock.destroyed) {
      gsap.killTweensOf(this._lock)
      if (forsta) {
        this._lock.position.set(LOCK_VILA.x, LOCK_VILA.y)
        this._lock.rotation = LOCK_VILA.rot
        this._lockLager.addChild(this._lock)
      } else {
        gsap.to(this._lock, { x: LOCK_VILA.x, y: LOCK_VILA.y, rotation: LOCK_VILA.rot, duration: 0.7, ease: 'back.out(1.3)' })
        ctx.later(0.72, () => {
          if (this._alive && this._lock && !this._lock.destroyed) this._lockLager.addChild(this._lock)
        })
      }
    }

    // VARIATION: uppsättningen slumpas, och en sällsynt studsboll läggs i ibland.
    // DUBBLA högen (16–22 mot 8–11): det finns bara elva beställbara sorter, så listan
    // fylls med hela omgångar — varje sort ligger i lådan en eller TVÅ gånger. Det gör
    // både letandet och grävandet svårare utan att någon beställning blir omöjlig:
    // hittar barnet den ena bilen räcker det, den andra är bara mer stök att böka i.
    const antal = clamp(16 + this._niva * 2, 16, 22)
    const pott = []
    while (pott.length < antal) pott.push(...shuffle(BESTALLBARA))
    const lista = shuffle(pott.slice(0, antal)) // `shuffle` returnerar en KOPIA
    if (Math.random() < 0.28) lista.push('studsboll')

    // 0,08 s mellan varje — med 0,14 hade 23 leksaker tagit 3,2 s att hälla i, och
    // första beställningen kommit efter dryga fem sekunders väntan.
    lista.forEach((key, i) => {
      ctx.later(0.12 + i * 0.08, () => {
        if (!this._alive) return
        const x = L_MITT - SPRIDNING / 2 + Math.random() * SPRIDNING
        this._nyLeksak(ctx, key, x, 40 + Math.random() * 130)
        ctx.services.audio.sfx('soft')
      })
    })

    ctx.later(0.5 + lista.length * 0.08 + 1.5, () => {
      if (!this._alive) return
      this._planeraOrdning()
      this._nastaBestallning(ctx)
    })
  },

  _planeraOrdning() {
    const finns = [...new Set(this._leksaker.filter((l) => l.spec.key !== 'studsboll').map((l) => l.spec.key))]
    if (!finns.length) return
    this._ordning = shuffle([...finns]).slice(0, MAL_PER_RUNDA)
    while (this._ordning.length < MAL_PER_RUNDA) this._ordning.push(finns[(Math.random() * finns.length) | 0])
  },

  _nastaBestallning(ctx) {
    if (!this._alive || this._klar) return
    let key = this._ordning[this._klara]
    if (!key || !this._finns(key)) {
      const kvar = this._leksaker.filter((l) => l.spec.key !== 'studsboll' && !l.flyger)
      if (!kvar.length) return
      key = kvar[(Math.random() * kvar.length) | 0].spec.key
    }
    this._onskad = key
    this._sokT = 0
    this._idle = 0
    this._visaLapp(key)
    pop(this._lappInner, { scale: 1.12 })
    ctx.services.audio.sfx('pling')
    this._kar?.react('nyfiken')
    this._fraga(ctx, key)
  },

  _finns(key) {
    return this._leksaker.some((l) => l.spec.key === key && !l.flyger)
  },

  // ---- Leksaker -----------------------------------------------------------

  _nyLeksak(ctx, key, x, y) {
    if (!this._alive) return null
    const spec = SPEC[key]
    if (!spec) return null

    const view = new Container()
    const inner = new Container()
    const g = new Graphics()
    ritaLeksak(g, key)
    // Krympningen sitter på GRAPHICSEN, inte på `inner` — `pop()` tweenar `inner.scale`
    // tillbaka till 1 och hade nollat en skala som låg där.
    g.scale.set(SKALA)
    g.eventMode = 'none'
    inner.addChild(g)
    inner.eventMode = 'none'
    view.addChild(inner)
    view.eventMode = 'none'
    view.position.set(x, y)
    this._leksakLager.addChild(view)

    const body = this._skapaKropp(spec, x, y)
    this._phys.link(body, view)

    const h = halvYta(spec)
    const handtag = new Container()
    const yta = new Graphics().rect(-h, -h, h * 2, h * 2).fill({ color: 0x000000, alpha: 0 })
    yta.eventMode = 'none'
    handtag.addChild(yta)
    handtag.hitArea = new Rectangle(-h, -h, h * 2, h * 2)
    handtag.position.set(x, y)
    this._handtagLager.addChild(handtag)

    const lek = { spec, body, view, inner, handtag, flyger: false }
    lek.rec = this._drag.addItem(handtag, spec, {
      onCorrect: () => this._levererad(ctx, lek),
      onMiss: () => this._slappt(ctx, lek),
      onSelect: () => this._blinkaKorg(),
    })
    // MIN pekhanterare registreras EFTER DragControllerns `pointerdown` (den lades i
    // addItem ovan) men FÖRE dess `pointerup` (den läggs först vid greppet) — alltså
    // vet jag att draget startat när jag sätter styrningen, och jag hinner läsa
    // `rec.dragging` innan biblioteket löser upp släppet.
    lek._ned = () => this._grepp(ctx, lek)
    lek._upp = () => {
      if (this._halls?.lek === lek && !lek.rec.dragging) this._slappStyr()
    }
    handtag.on('pointerdown', lek._ned)
    handtag.on('pointerup', lek._upp)
    handtag.on('pointerupoutside', lek._upp)

    // Eget liv i vila (P0 ASSETS) — i den INRE noden, så kroppens läge står orört.
    lek.livTw = liv(inner, { bob: 2.5, sway: 0.016, duration: 2.5 + Math.random() * 1.1, phase: Math.random() })
    this._leksaker.push(lek)
    return lek
  },

  _skapaKropp(spec, x, y) {
    const body =
      spec.form === 'cirkel'
        ? this._phys.circle(x, y, spec.r, KROPP_OPTS(spec))
        : this._phys.rectangle(x, y, spec.w, spec.h, KROPP_OPTS(spec))
    Body.setVelocity(body, { x: 0, y: 0 })
    Body.setAngularVelocity(body, 0)
    return body
  },

  // ---- Grepp och styrning -------------------------------------------------

  _grepp(ctx, lek) {
    if (!this._alive || lek.flyger || !lek.body) return
    if (this._drag?.active?.view !== lek.handtag) return
    this._idle = 0
    this._halls = { lek, rec: lek.rec }
    ctx.services.audio.sfx('tap')
    pop(lek.inner, { scale: 1.1 })
    this._visaLyft(lek)

    const key = lek.spec.key
    if (key === 'studsboll') {
      ctx.services.audio.sfx('boing')
      if (!this._sagt.studs) {
        this._sagt.studs = true
        ctx.services.voice.say('En studsboll! Den studsar runt i lådan.')
      }
    } else if (key === 'tagloke' && !this._sagt.tag) {
      this._sagt.tag = true
      ctx.services.voice.say('Oj, tågloket är tungt! Dra det långsamt.')
    } else if (key === 'robot' && !this._sagt.robot) {
      this._sagt.robot = true
      ctx.services.voice.say('Roboten är också tung. Ta i lite!')
    }
  },

  // Styrningen — EN gång per FAST fysiksteg. Farten är px/steg; en bildruta rymmer
  // 1–5 steg, så per bildruta hade tågloket dragit 1–5 gånger fel.
  _styr() {
    // FARTSPÄRR på hela högen, körd per fast steg. Att pressa en tung leksak in i
    // packade kroppar kan ge en enskild kropp en utkastimpuls, och lådans väggar är
    // 44 px tjocka: en kropp som rör sig snabbare än så mellan två steg passerar rakt
    // igenom utan ett enda konsolfel. Taket ligger med marginal under väggtjockleken.
    for (const lek of this._leksaker) {
      const b = lek.body
      if (!b || lek.flyger) continue
      const s = Math.hypot(b.velocity.x, b.velocity.y)
      if (s > FART_TAK) Body.setVelocity(b, { x: (b.velocity.x / s) * FART_TAK, y: (b.velocity.y / s) * FART_TAK })
      if (Math.abs(b.angularVelocity) > 0.5) Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.5)
    }

    const h = this._halls
    if (!h) return
    const lek = h.lek
    const b = lek.body
    if (!b || lek.flyger || !h.rec?.view || h.rec.view.destroyed) return
    const dx = h.rec.view.x - b.position.x
    const dy = h.rec.view.y - b.position.y
    let vx = dx * STYR_K
    let vy = dy * STYR_K
    const s = Math.hypot(vx, vy)
    const tak = lek.spec.fart
    if (s > tak) {
      vx = (vx / s) * tak
      vy = (vy / s) * tak
    }
    Body.setVelocity(b, { x: vx, y: vy })
    Body.setAngularVelocity(b, b.angularVelocity * 0.8)
  },

  _slappStyr() {
    this._halls = null
    this._doljLyft()
  },

  _slappt(ctx, lek) {
    if (!this._alive) return
    // DragControllern snäpper handtaget tillbaka till sitt HEMLÄGE — men handtagets hem
    // är där leksaken låg när den skapades. Draget dör här; handtaget hittar tillbaka
    // till kroppen av sig självt i `_uppdatera`.
    if (lek.handtag && !lek.handtag.destroyed) gsap.killTweensOf(lek.handtag)
    this._slappStyr()
    const b = lek.body
    if (!b) return
    const v = b.velocity
    const s = Math.hypot(v.x, v.y)
    if (s > SLAPP_TAK) Body.setVelocity(b, { x: (v.x / s) * SLAPP_TAK, y: (v.y / s) * SLAPP_TAK })
    if (lek.spec.key === 'studsboll') this._studsa(ctx, lek)
  },

  // Studsbollen far runt när man rört den. TAK: en studs per STUDS_KYLA sekunder.
  _studsa(ctx, lek) {
    if (!this._alive || !lek.body) return
    if (this._t - this._sistStuds < STUDS_KYLA) return
    this._sistStuds = this._t
    const v = lek.body.velocity
    Body.setVelocity(lek.body, { x: clamp(v.x + (Math.random() * 8 - 4), -12, 12), y: -9 - Math.random() * 3 })
    ctx.services.audio.sfx('boing')
    sparkle(ctx.fxLayer, lek.body.position.x, lek.body.position.y, { count: 5 })
  },

  _visaLyft(lek) {
    const g = this._lyft
    const nod = this._lyftNod
    if (!g || g.destroyed || !nod || nod.destroyed) return
    const r = storsta(lek.spec) / 2
    g.clear().ellipse(0, 0, r * 0.84, r * 0.3).fill({ color: 0x000000 })
    gsap.killTweensOf(nod)
    gsap.to(nod, { alpha: 0.2, duration: 0.12 })
  },

  _doljLyft() {
    const nod = this._lyftNod
    if (!nod || nod.destroyed) return
    gsap.killTweensOf(nod)
    gsap.to(nod, { alpha: 0, duration: 0.18 })
  },

  // ---- Leverans -----------------------------------------------------------

  _levererad(ctx, lek) {
    if (!this._alive) return
    // Redan i luften (kaskaden) eller firandet rullar: leksaken lämnas tillbaka som
    // dragbar och barnet får ändå ett kvitto på att fingret nådde fram (P0 — tystnad
    // är inte en paus, den är trasig).
    if (lek.flyger || !lek.body || this._klar) {
      this._drag?.aterstall(lek.handtag)
      kvittera(ctx.fxLayer, KORG.x, KORG.y - 40, ctx.services.audio)
      return
    }
    this._halls = null
    this._doljLyft()
    if (lek.handtag && !lek.handtag.destroyed) gsap.killTweensOf(lek.handtag)

    const ratt = lek.spec.key === this._onskad
    const fx = lek.body.position.x
    const fy = lek.body.position.y
    lek.flyger = true
    this._phys.removeBody(lek.body)
    lek.body = null

    if (ratt) {
      ctx.services.audio.sfx('correct')
      ctx.services.audio.tone({ freq: TON[Math.min(this._klara, TON.length - 1)], dur: 0.24, type: 'triangle', vol: 0.18 })
      this._kar?.react('jubel')
      this._flyg(lek, KORG.x - 20 + Math.random() * 40, KORG.y - 22, Math.min(fy, KORG.y) - 160, 0.44, () => {
        this._laggIKorg(ctx, lek)
      })
    } else {
      // Fel leksak är ALDRIG ett fel: korgen spottar tillbaka den i lådan och alla
      // skrattar. Ingen summer, ingen förlust, inget som nollställs (P0).
      ctx.services.audio.sfx('plopp')
      ctx.services.audio.tone({ freq: 520, slideTo: 400, dur: 0.16, type: 'sine', vol: 0.14 })
      this._kar?.react('hoppsan')
      floatText(ctx.fxLayer, KORG.x, KORG.y - 110, 'Hihi!', { fontSize: 44 })
      if (this._t - this._sistFel > 6) {
        this._sistFel = this._t
        if (Math.random() < 0.5) ctx.services.voice.say('Hihi, inte den! Leta vidare i lådan.')
        else ctx.services.voice.say('Oj, det var en annan sak. Prova igen!')
      }
      const mx = L_MITT - SPRIDNING / 2 + Math.random() * SPRIDNING
      this._flyg(lek, mx, 390, 110, 0.72, () => this._tillbakaILadan(ctx, lek, mx, 390))
    }
  },

  // Bågflykt för en leksak som lämnat fysiken. Tweenar ett vanligt objekt och rör
  // Pixi-noden bara om den lever — exit-säkert på samma sätt som feedback.js.
  _flyg(lek, tx, ty, toppY, dur, klar) {
    const v = lek.view
    if (!v || v.destroyed) return
    // En leksak i luften går inte att greppa — annars kunde DragControllern låsa den
    // (`placed = true`) mitt i flykten och den hade aldrig blivit dragbar igen.
    if (lek.handtag && !lek.handtag.destroyed) lek.handtag.eventMode = 'none'
    const fx = v.x
    const fy = v.y
    const r0 = v.rotation
    const vrid = (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.9)
    const st = { p: 0 }
    lek.flygTw?.kill()
    const tw = gsap.to(st, {
      p: 1,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        if (!this._alive || v.destroyed) {
          tw.kill()
          return
        }
        const p = st.p
        const q = 1 - p
        v.x = fx + (tx - fx) * p
        v.y = q * q * fy + 2 * q * p * toppY + p * p * ty
        v.rotation = r0 + vrid * p
        if (lek.handtag && !lek.handtag.destroyed) lek.handtag.position.set(v.x, v.y)
      },
      onComplete: () => {
        if (this._alive && !v.destroyed) klar?.()
      },
    })
    lek.flygTw = tw
    return tw
  },

  _tillbakaILadan(ctx, lek, x, y) {
    if (!this._alive || !lek.view || lek.view.destroyed) return
    lek.body = this._skapaKropp(lek.spec, x, y)
    Body.setVelocity(lek.body, { x: 0, y: 2 })
    this._phys.link(lek.body, lek.view)
    lek.flyger = false
    this._drag?.aterstall(lek.handtag)
    puff(ctx.fxLayer, x, y, { count: 5, color: lek.spec.farg })
    ctx.services.audio.sfx('soft')
  },

  _laggIKorg(ctx, lek) {
    if (!this._alive) return
    puff(ctx.fxLayer, KORG.x, KORG.y - 30, { count: 9, color: lek.spec.farg })
    sparkle(ctx.fxLayer, KORG.x, KORG.y - 40, { count: 8 })
    ctx.services.audio.sfx('pop')
    pop(this._korgInner, { scale: 1.12 })

    const key = lek.spec.key
    this._taBortLeksak(lek)

    // Mini-versionen av leksaken ligger kvar i korgen — Bobo SER vad han fått.
    const ikon = new Container()
    const g = new Graphics()
    ritaLeksak(g, key)
    g.eventMode = 'none'
    ikon.addChild(g)
    ikon.eventMode = 'none'
    ikon.scale.set(52 / storsta(NATUR[key]))
    ikon.position.set(-46 + this._korgIkoner.length * 31, -18 - (this._korgIkoner.length % 2) * 10)
    ikon.rotation = (Math.random() * 0.5 - 0.25)
    ikon._lekKey = key
    this._korgBotten.addChild(ikon)
    this._korgIkoner.push(ikon)

    this._klara++
    this._ritaPrickar()
    this._berom(ctx)
    floatText(ctx.fxLayer, KORG.x, KORG.y - 130, 'Tack!', { fontSize: 46, fontFamily: FONT.display })

    // Högen fylls på så grävandet aldrig blir grunt (en levererad leksak lämnar en
    // lucka, en ny faller ner i den — antalet står alltså stilla). Inte efter SISTA
    // beställningen: då ska kropparna räknas ner mot finalen, inte upp.
    ctx.later(0.35, () => {
      if (!this._alive || this._klar || this._klara >= MAL_PER_RUNDA) return
      const ny = BESTALLBARA[(Math.random() * BESTALLBARA.length) | 0]
      const x = L_MITT - SPRIDNING / 2 + Math.random() * SPRIDNING
      this._nyLeksak(ctx, ny, x, 20)
      ctx.services.audio.sfx('whoosh')
    })

    this._onskad = null
    if (this._klara >= MAL_PER_RUNDA) {
      ctx.later(0.9, () => this._final(ctx))
    } else {
      ctx.later(1.4, () => {
        if (this._alive && !this._klar) this._nastaBestallning(ctx)
      })
    }
  },

  // ---- Finish -------------------------------------------------------------

  _final(ctx) {
    if (!this._alive || this._klar) return
    this._klar = true
    this._onskad = null
    this._halls = null
    this._doljLyft()
    this._visaLapp(null)

    this._niva += 1
    ctx.progress.setLevel(this._niva)
    ctx.progress.setCustom('korgar', (ctx.progress.get().custom?.korgar || 0) + 1)
    ctx.progress.complete()

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Titta, korgen är full! Nu åker allting ner i lådan igen.')
    this._kar?.react('jubel')

    // 1) Korgens leksaker hoppar tillbaka i lådan i en glad kaskad.
    const ikoner = [...this._korgIkoner]
    ikoner.forEach((ikon, i) => {
      ctx.later(0.25 + i * 0.16, () => {
        if (!this._alive || ikon.destroyed) return
        const start = this._root.toLocal(ikon.toGlobal({ x: 0, y: 0 }))
        const key = ikon._lekKey
        ikon.destroy({ children: true })
        const idx = this._korgIkoner.indexOf(ikon)
        if (idx >= 0) this._korgIkoner.splice(idx, 1)
        const mx = L_MITT - SPRIDNING / 2 + Math.random() * SPRIDNING
        const lek = this._nyLeksak(ctx, key, start.x, start.y)
        if (!lek) return
        lek.flyger = true
        this._phys.removeBody(lek.body)
        lek.body = null
        // Miniatyren i korgen växer till full storlek på vägen upp — annars poppar
        // leksaken från 52 px till 150 px i en enda bildruta. Vilo-skalan skrivs
        // uttryckligen (feedback.js läser `_fxRestScale` när ingen effekt pågår).
        const mini = 52 / storsta(lek.spec)
        lek.inner.scale.set(mini)
        lek.inner._fxRestScale = { x: 1, y: 1 }
        lek.inner._fxScaleBusy = true
        gsap.to(lek.inner.scale, {
          x: 1,
          y: 1,
          duration: 0.36,
          ease: 'back.out(1.5)',
          onComplete: () => {
            if (lek.inner && !lek.inner.destroyed) lek.inner._fxScaleBusy = false
          },
        })
        ctx.services.audio.sfx('whoosh')
        this._flyg(lek, mx, 380, 120, 0.62, () => this._tillbakaILadan(ctx, lek, mx, 380))
      })
    })

    // 2) De som ligger på mattan utanför hoppar också in (max det som faktiskt ligger där).
    ctx.later(0.4, () => {
      if (!this._alive) return
      for (const lek of [...this._leksaker]) {
        if (!lek.body || lek.flyger) continue
        if (lek.body.position.x <= L_IN_H) {
          Body.setVelocity(lek.body, { x: (L_MITT - lek.body.position.x) * 0.02, y: -5 - Math.random() * 3 })
          continue
        }
        const mx = L_IN_V + 120 + Math.random() * (L_IN_H - L_IN_V - 240)
        lek.flyger = true
        this._phys.removeBody(lek.body)
        lek.body = null
        this._flyg(lek, mx, 360, 130, 0.66, () => this._tillbakaILadan(ctx, lek, mx, 360))
      }
      ctx.services.audio.sfx('magi')
    })

    // 3) Lådan skakar, locket faller ner och smäller igen, leksaksfanfar.
    const tl = gsap.timeline()
    this._finishTl = tl
    tl.add(() => {
      if (!this._alive) return
      shake(this._framLager, { intensity: 7, duration: 0.5 })
      ctx.services.audio.tone({ freq: 210, slideTo: 168, dur: 0.3, type: 'triangle', vol: 0.16 })
    }, 1.8)
    tl.add(() => {
      if (!this._alive || !this._lock || this._lock.destroyed) return
      this._framLager.addChild(this._lock) // locket ska falla FRAMFÖR högen
      gsap.to(this._lock, { x: LOCK_STANGT.x, y: LOCK_STANGT.y, rotation: LOCK_STANGT.rot, duration: 0.46, ease: 'power2.in' })
    }, 2.4)
    tl.add(() => {
      if (!this._alive) return
      ctx.services.audio.sfx('plopp')
      ctx.services.audio.tone({ freq: 150, slideTo: 92, dur: 0.3, type: 'triangle', vol: 0.26 })
      if (this._lock && !this._lock.destroyed) {
        gsap.fromTo(this._lock, { y: LOCK_STANGT.y }, { y: LOCK_STANGT.y - 9, duration: 0.1, yoyo: true, repeat: 1, ease: 'sine.out' })
      }
      shake(this._framLager, { intensity: 11, duration: 0.45 })
      for (const px of [200, 340, 500, 660]) puff(ctx.fxLayer, px, L_TOPP + 14, { count: 5, color: 0xd9a05b })
      ctx.services.voice.say('Alla leksaker är i lådan. Locket smäller igen!')
    }, 2.88)
    // Leksaksfanfar: fyra toner i durtreklang + en glad avslutning.
    FANFAR.forEach((f, i) => {
      tl.add(() => {
        if (!this._alive) return
        ctx.services.audio.tone({ freq: f, dur: 0.26, type: 'triangle', vol: 0.19 })
        sparkle(ctx.fxLayer, L_MITT - 180 + i * 120, L_TOPP - 20, { count: 6 })
      }, 3.15 + i * 0.17)
    })
    tl.add(() => {
      if (!this._alive) return
      ctx.services.audio.sfx('celebrate')
      bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
      this._kar?.react('jubel')
      floatText(ctx.fxLayer, BOBO.x, BOBO.y - 110, 'Hurra!', { fontSize: 50, fontFamily: FONT.display })
    }, 3.9)

    ctx.later(6.2, () => {
      if (!this._alive) return
      this._nyRunda(ctx)
    })
  },

  // ---- Tryck som inte är ett drag -----------------------------------------

  _korgTryck(ctx) {
    if (!this._alive) return
    this._idle = 0
    if (this._drag?.selected) return // tap-tap: DragControllern sköter släppet
    kvittera(ctx.fxLayer, KORG.x, KORG.y - 40, ctx.services.audio)
    pop(this._korgInner, { scale: 1.08 })
    this._kar?.react('nyfiken')
  },

  _lappTryck(ctx) {
    if (!this._alive) return
    this._idle = 0
    pop(this._lappInner, { scale: 1.1 })
    ctx.services.audio.sfx('pling')
    if (this._onskad) this._fraga(ctx, this._onskad)
    else kvittera(ctx.fxLayer, LAPP.x, LAPP.y, ctx.services.audio)
  },

  _tomTryck(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    if (this._klar) {
      kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio)
      return
    }
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, p.x, p.y, { count: 4, color: COLORS.yellow })
    pop(this._lappInner, { scale: 1.06 })
  },

  _blinkaKorg() {
    if (!this._korgInner || this._korgInner.destroyed) return
    pop(this._korgInner, { scale: 1.14 })
  },

  _anslag(ctx, h) {
    if (!this._alive) return
    if (h.styrka > 0.55) puff(ctx.fxLayer, h.x, h.y, { count: 4, color: h.traff ?? 0xc9a06a })
    // Studsbollen far iväg när något dunkar till den — med samma TAK som vid släpp.
    const s = this._leksaker.find((l) => l.spec.key === 'studsboll' && l.body && (l.body === h.a || l.body === h.b))
    if (s && h.styrka > 0.45) this._studsa(ctx, s)
  },

  // ---- Röst ---------------------------------------------------------------
  //
  // Varje replik står som en LITERAL i voice.say(). Byggs texten vid körning
  // (tabelluppslag, template literal) kan check.mjs inte se den, och den får aldrig
  // ett röstklipp — se CLAUDE.md.

  _fraga(ctx, key) {
    const v = ctx.services.voice
    if (key === 'boll') v.say('Hittar du bollen?')
    else if (key === 'nalle') v.say('Hittar du nallebjörnen?')
    else if (key === 'tagloke') v.say('Hittar du tågloket?')
    else if (key === 'anka') v.say('Hittar du gummiankan?')
    else if (key === 'bil') v.say('Hittar du bilen?')
    else if (key === 'kloss') v.say('Hittar du byggklossen?')
    else if (key === 'stjarna') v.say('Hittar du stjärnan?')
    else if (key === 'tarning') v.say('Hittar du tärningen?')
    else if (key === 'robot') v.say('Hittar du roboten?')
    else if (key === 'trumma') v.say('Hittar du trumman?')
    else if (key === 'dino') v.say('Hittar du dinosaurien?')
    else v.say('Leta efter en leksak i lådan!')
  },

  _berom(ctx) {
    const v = ctx.services.voice
    const n = (Math.random() * 4) | 0
    if (n === 0) v.say('Där var den! Tack så mycket.')
    else if (n === 1) v.say('Precis den jag ville ha!')
    else if (n === 2) v.say('Vilken duktig letare du är!')
    else v.say('Ja! Ner i korgen med den.')
  },

  _cue(ctx) {
    const v = ctx.services.voice
    if (Math.random() < 0.5) v.say('Böka runt i lådan med fingret så hittar du den.')
    else v.say('Dra undan leksakerna och leta längst ner.')
    pop(this._lappInner, { scale: 1.14 })
  },

  // Autohjälpen kommer SENT och SYNLIGT: barnets eget grävande ska avgöra, hjälpen
  // pekar bara ut var saken ligger — den plockar aldrig upp den åt barnet.
  _hjalp(ctx) {
    const lek = this._leksaker.find((l) => l.spec.key === this._onskad && !l.flyger && l.body)
    if (!lek) return
    ctx.services.voice.say('Jag hjälper till! Titta, den glittrar där nere.')
    ctx.services.audio.sfx('magi')
    sparkle(ctx.fxLayer, lek.body.position.x, lek.body.position.y, { count: 12 })
    pop(lek.inner, { scale: 1.3 })
    ctx.later(0.5, () => {
      if (this._alive && lek.body && !lek.inner.destroyed) {
        sparkle(ctx.fxLayer, lek.body.position.x, lek.body.position.y, { count: 10 })
        pop(lek.inner, { scale: 1.26 })
      }
    })
  },

  // ---- Uppdatering --------------------------------------------------------

  _uppdatera(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._phys.update(ticker.deltaMS) // `_styr` körs inifrån, per fast steg

    // Handtaget hittar tillbaka till sin kropp — utom det som fingret håller i.
    for (const lek of this._leksaker) {
      const b = lek.body
      if (!b || lek.flyger) continue
      const p = b.position
      // Skyddsnät: ingen leksak får försvinna ur bild (en enda tunnling skulle annars
      // ta bort ett föremål ur spelet permanent).
      if (p.x < -80 || p.x > 1360 || p.y > 800 || p.y < -400) {
        Body.setPosition(b, { x: L_MITT + (Math.random() * 200 - 100), y: 120 })
        Body.setVelocity(b, { x: 0, y: 0 })
        Body.setAngularVelocity(b, 0)
      }
      if (this._halls?.lek === lek) continue
      if (lek.handtag && !lek.handtag.destroyed) lek.handtag.position.set(p.x, p.y)
    }

    const h = this._halls
    if (h?.lek?.body && this._lyftNod && !this._lyftNod.destroyed) {
      this._lyftNod.position.set(h.lek.body.position.x, h.lek.body.position.y + storsta(h.lek.spec) * 0.48)
    }

    // Blicken: Bobo tittar på det barnet gräver med, annars ner i lådan.
    if (this._kar) {
      if (h?.lek?.body) this._kar.look(h.lek.body.position.x, h.lek.body.position.y)
      else this._kar.look(L_MITT + 120, L_BOTTEN - 90)
    }

    // Ritordning: den leksak som ligger HÖGST i högen ritas främst och pekas på först.
    // Aldrig mitt i ett drag — då hade den lyfta nodens index flyttats under fingret.
    this._sortT += dt
    if (!h && this._sortT > 0.45) {
      this._sortT = 0
      this._sortera()
    }

    if (this._klar) return

    this._idle += dt
    if (this._onskad && this._idle > 7.5) {
      this._idle = 0
      this._cue(ctx)
    }
    this._sokT += dt
    if (this._onskad && this._sokT > 16) {
      this._sokT = 0
      this._hjalp(ctx)
    }
  },

  _sortera() {
    const lista = this._leksaker.filter((l) => l.body && !l.flyger)
    if (lista.length < 2) return
    lista.sort((a, b) => b.body.position.y - a.body.position.y)
    for (const lek of lista) {
      if (lek.view && !lek.view.destroyed && lek.view.parent === this._leksakLager) this._leksakLager.addChild(lek.view)
      if (lek.handtag && !lek.handtag.destroyed && lek.handtag.parent === this._handtagLager) this._handtagLager.addChild(lek.handtag)
    }
  },

  // ---- Städning -----------------------------------------------------------

  _rivLeksak(lek) {
    if (!lek) return
    lek.flygTw?.kill()
    lek.livTw?.kill()
    lek.inner?._fxLiv?.kill() // liv() tweenar ett PROXY — killTweensOf når den aldrig
    if (lek.body) this._phys?.removeBody(lek.body)
    lek.body = null
    if (lek.handtag && !lek.handtag.destroyed) {
      this._drag?.removeItem(lek.handtag)
      lek.handtag.off('pointerdown', lek._ned)
      lek.handtag.off('pointerup', lek._upp)
      lek.handtag.off('pointerupoutside', lek._upp)
      gsap.killTweensOf(lek.handtag)
      gsap.killTweensOf(lek.handtag.scale)
      lek.handtag.destroy({ children: true })
    }
    if (lek.view && !lek.view.destroyed) {
      gsap.killTweensOf(lek.view)
      gsap.killTweensOf(lek.view.scale)
      if (lek.inner && !lek.inner.destroyed) {
        gsap.killTweensOf(lek.inner)
        gsap.killTweensOf(lek.inner.scale)
      }
      lek.view.destroy({ children: true })
    }
  },

  _taBortLeksak(lek) {
    const i = this._leksaker.indexOf(lek)
    if (i >= 0) this._leksaker.splice(i, 1)
    if (this._halls?.lek === lek) this._slappStyr()
    this._rivLeksak(lek)
  },

  _rensaLeksaker() {
    for (const lek of this._leksaker) this._rivLeksak(lek)
    this._leksaker = []
    this._halls = null
  },

  _rensaKorg() {
    for (const ikon of this._korgIkoner) {
      if (ikon && !ikon.destroyed) {
        gsap.killTweensOf(ikon)
        ikon.destroy({ children: true })
      }
    }
    this._korgIkoner = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._unbindLjud?.()
    this._unbindSlag?.()
    this._unbindSteg?.()
    this._finishTl?.kill()
    this._finishTl = null

    this._rensaLeksaker()
    this._rensaKorg()

    if (this._lock && !this._lock.destroyed) gsap.killTweensOf(this._lock)
    if (this._lyftNod && !this._lyftNod.destroyed) gsap.killTweensOf(this._lyftNod)
    if (this._korgInner && !this._korgInner.destroyed) {
      gsap.killTweensOf(this._korgInner)
      gsap.killTweensOf(this._korgInner.scale)
    }
    if (this._lappInner && !this._lappInner.destroyed) {
      gsap.killTweensOf(this._lappInner)
      gsap.killTweensOf(this._lappInner.scale)
    }
    if (this._framLager && !this._framLager.destroyed) gsap.killTweensOf(this._framLager)
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    this._kar?.destroy()
    this._kar = null

    if (this._korg && !this._korg.destroyed && this._onKorg) this._korg.off('pointertap', this._onKorg)
    if (this._lapp && !this._lapp.destroyed && this._onLapp) this._lapp.off('pointertap', this._onLapp)
    if (this._catcher && !this._catcher.destroyed && this._onCatch) this._catcher.off('pointertap', this._onCatch)

    this._drag?.destroy()
    this._drag = null
    this._phys?.destroy()
    this._phys = null

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
  },
}

// ---- Ritade föremål (P0 ASSETS: egen silhuett, aldrig en emoji i en ruta) ---
//
// Varje leksak ritas centrerad i origo som ett RIKTIGT föremål. Samma funktion
// används för leksaken i lådan, för miniatyren i korgen och för ikonen på
// beställningslappen — bara skalan skiljer.

function ritaLeksak(g, key) {
  const ink = COLORS.ink
  if (key === 'boll') {
    g.circle(0, 0, 52).fill(sphereFill(COLORS.red)).stroke({ width: 4, color: 0xd94c4c })
    g.ellipse(0, 2, 48, 15).fill({ color: COLORS.white, alpha: 0.95 })
    g.ellipse(0, 2, 48, 6).fill(COLORS.blue)
    g.ellipse(-1, -30, 22, 9).fill({ color: COLORS.white, alpha: 0.4 })
    g.circle(-19, -21, 10).fill({ color: COLORS.white, alpha: 0.45 })
  } else if (key === 'nalle') {
    const p = 0xb07a4a
    const l = 0xf0d5b0
    g.circle(-34, -44, 17).fill(p)
    g.circle(34, -44, 17).fill(p)
    g.circle(-34, -44, 9).fill(l)
    g.circle(34, -44, 9).fill(l)
    g.ellipse(-46, 16, 16, 21).fill(p)
    g.ellipse(46, 16, 16, 21).fill(p)
    g.ellipse(-25, 46, 17, 15).fill(p)
    g.ellipse(25, 46, 17, 15).fill(p)
    g.ellipse(-25, 46, 9, 8).fill(l)
    g.ellipse(25, 46, 9, 8).fill(l)
    g.ellipse(0, 24, 34, 32).fill(sphereFill(p))
    g.ellipse(0, 28, 20, 20).fill({ color: l, alpha: 0.9 })
    g.circle(0, -14, 36).fill(sphereFill(p))
    g.ellipse(0, -4, 17, 13).fill(l)
    g.ellipse(0, -9, 7, 5).fill(ink)
    g.moveTo(0, -5).lineTo(0, 1).stroke({ width: 2.5, color: ink })
    g.circle(-14, -20, 5).fill(ink)
    g.circle(14, -20, 5).fill(ink)
    g.circle(-12, -22, 2).fill(COLORS.white)
    g.circle(16, -22, 2).fill(COLORS.white)
  } else if (key === 'tagloke') {
    g.circle(-42, 34, 18).fill(0x3b3026)
    g.circle(-42, 34, 8).fill(0xd8c3a5)
    g.circle(12, 34, 18).fill(0x3b3026)
    g.circle(12, 34, 8).fill(0xd8c3a5)
    g.circle(50, 34, 13).fill(0x3b3026)
    g.circle(50, 34, 6).fill(0xd8c3a5)
    g.roundRect(-72, 4, 144, 26, 8).fill(topLightFill(0x8e2f2f))
    g.roundRect(-70, -24, 80, 34, 15).fill(cylinderFill(0xd94c4c, { axis: 'x' }))
    g.ellipse(-70, -7, 9, 17).fill(0xf1a3a3)
    g.roundRect(14, -42, 56, 52, 10).fill(topLightFill(0xd94c4c)).stroke({ width: 3, color: 0x8e2f2f })
    g.roundRect(24, -32, 36, 26, 6).fill({ color: 0xdff3ff, alpha: 0.95 })
    g.roundRect(-58, -46, 22, 26, 5).fill(cylinderFill(0x4a3526))
    g.ellipse(-47, -46, 15, 7).fill(0x63483a)
    g.roundRect(-74, 26, 150, 8, 4).fill({ color: 0x4a3526, alpha: 0.6 })
  } else if (key === 'anka') {
    g.moveTo(-36, 4).lineTo(-60, -12).lineTo(-34, 20).closePath().fill(0xf2c02f)
    g.ellipse(2, 14, 46, 30).fill(sphereFill(COLORS.yellow))
    g.circle(24, -22, 26).fill(sphereFill(COLORS.yellow))
    g.moveTo(42, -25).lineTo(68, -17).lineTo(42, -9).closePath().fill(topLightFill(COLORS.orange))
    g.moveTo(44, -17).lineTo(64, -14).stroke({ width: 2, color: 0xd06a1a, alpha: 0.7 })
    g.circle(29, -29, 5.5).fill(ink)
    g.circle(31, -31, 2).fill(COLORS.white)
    g.ellipse(0, 14, 20, 13).fill({ color: 0xf2c02f, alpha: 0.85 })
    g.moveTo(-14, 8).quadraticCurveTo(0, 18, 14, 10).stroke({ width: 2.5, color: 0xd6a51f, alpha: 0.8 })
  } else if (key === 'bil') {
    g.circle(-38, 26, 16).fill(0x3b3026)
    g.circle(-38, 26, 7).fill(0xdfe4e8)
    g.circle(38, 26, 16).fill(0x3b3026)
    g.circle(38, 26, 7).fill(0xdfe4e8)
    g.roundRect(-64, -8, 128, 36, 13).fill(topLightFill(COLORS.blue)).stroke({ width: 3, color: 0x2f7fb8 })
    g.moveTo(-34, -8).lineTo(-22, -34).lineTo(24, -34).lineTo(40, -8).closePath().fill(topLightFill(0x6fc0ef))
    g.moveTo(-26, -11).lineTo(-16, -29).lineTo(-2, -29).lineTo(-2, -11).closePath().fill({ color: 0xdff3ff, alpha: 0.95 })
    g.moveTo(4, -29).lineTo(20, -29).lineTo(32, -11).lineTo(4, -11).closePath().fill({ color: 0xdff3ff, alpha: 0.95 })
    g.circle(57, 4, 7).fill(COLORS.yellow)
    g.roundRect(-64, 6, 128, 6, 3).fill({ color: COLORS.white, alpha: 0.35 })
  } else if (key === 'kloss') {
    g.roundRect(-42, -42, 84, 84, 13).fill(topLightFill(0xd9a05b)).stroke({ width: 4, color: 0x8a5a3b })
    g.moveTo(-30, -24).quadraticCurveTo(0, -18, 30, -24).stroke({ width: 3, color: 0xb27b45, alpha: 0.55 })
    g.moveTo(-30, 26).quadraticCurveTo(0, 32, 30, 26).stroke({ width: 3, color: 0xb27b45, alpha: 0.55 })
    g.star(0, 0, 5, 23, 11).fill(COLORS.red).stroke({ width: 2.5, color: 0xb03c3c })
  } else if (key === 'stjarna') {
    g.star(0, 0, 5, 54, 26, -Math.PI / 2).fill(topLightFill(COLORS.yellow)).stroke({ width: 5, color: COLORS.orangeDark })
    g.star(0, 0, 5, 40, 19, -Math.PI / 2).stroke({ width: 2.5, color: COLORS.white, alpha: 0.6 })
    g.circle(-12, -6, 5).fill(ink)
    g.circle(12, -6, 5).fill(ink)
    g.circle(-10, -8, 2).fill(COLORS.white)
    g.circle(14, -8, 2).fill(COLORS.white)
    g.moveTo(-11, 9).quadraticCurveTo(0, 19, 11, 9).stroke({ width: 3, color: ink })
    g.circle(-24, 4, 6).fill({ color: COLORS.pink, alpha: 0.7 })
    g.circle(24, 4, 6).fill({ color: COLORS.pink, alpha: 0.7 })
  } else if (key === 'tarning') {
    g.roundRect(-41, -41, 82, 82, 17).fill(topLightFill(COLORS.white)).stroke({ width: 4, color: 0xcfc6b4 })
    for (const [px, py] of [[-19, -19], [19, -19], [0, 0], [-19, 19], [19, 19]]) g.circle(px, py, 7.5).fill(ink)
    g.roundRect(-33, -33, 26, 10, 5).fill({ color: COLORS.white, alpha: 0.7 })
  } else if (key === 'robot') {
    g.moveTo(0, -56).lineTo(0, -72).stroke({ width: 5, color: 0x8a939b })
    g.circle(0, -76, 8).fill(COLORS.red)
    g.roundRect(-52, -10, 18, 46, 8).fill(cylinderFill(0x9aa4b0))
    g.roundRect(34, -10, 18, 46, 8).fill(cylinderFill(0x9aa4b0))
    g.roundRect(-30, -56, 60, 44, 11).fill(topLightFill(0xc3ccd4)).stroke({ width: 4, color: 0x8a939b })
    g.circle(-13, -37, 8).fill(COLORS.blue)
    g.circle(13, -37, 8).fill(COLORS.blue)
    g.circle(-11, -39, 3).fill(COLORS.white)
    g.circle(15, -39, 3).fill(COLORS.white)
    g.roundRect(-14, -24, 28, 6, 3).fill(0x6d7783)
    g.roundRect(-34, -10, 68, 52, 11).fill(topLightFill(0x8fa3b8)).stroke({ width: 4, color: 0x63788f })
    g.circle(-14, 8, 7).fill(COLORS.yellow)
    g.circle(8, 8, 7).fill(COLORS.green)
    g.roundRect(-18, 24, 36, 8, 4).fill(0x4a5a6b)
    g.roundRect(-27, 42, 21, 15, 6).fill(0x63788f)
    g.roundRect(6, 42, 21, 15, 6).fill(0x63788f)
  } else if (key === 'trumma') {
    g.ellipse(0, 26, 46, 13).fill(0x9a6b3d)
    g.rect(-46, -12, 92, 38).fill(cylinderFill(0xd94c4c, { axis: 'x' }))
    for (let i = 0; i < 5; i++) {
      const x0 = -40 + i * 20
      g.moveTo(x0, -8).lineTo(x0 + 10, 22).lineTo(x0 + 20, -8).stroke({ width: 3, color: 0xf3e3c6, alpha: 0.9 })
    }
    g.ellipse(0, -12, 46, 15).fill(topLightFill(0xf3e3c6)).stroke({ width: 4, color: 0xc9a06a })
    g.ellipse(0, -12, 32, 9).stroke({ width: 2, color: 0xd8c3a5, alpha: 0.8 })
  } else if (key === 'dino') {
    const gr = COLORS.green
    g.moveTo(-28, 12).quadraticCurveTo(-72, 8, -62, -22).quadraticCurveTo(-50, 12, -26, 26).closePath().fill(0x49a657)
    g.ellipse(-14, 32, 15, 13).fill(0x3f9550)
    g.ellipse(18, 32, 15, 13).fill(0x3f9550)
    g.ellipse(0, 6, 42, 28).fill(sphereFill(gr))
    for (const sx of [-18, -1, 16]) {
      g.moveTo(sx - 10, -14).lineTo(sx, -32).lineTo(sx + 10, -14).closePath().fill(COLORS.yellow)
    }
    g.circle(40, -16, 24).fill(sphereFill(gr))
    g.ellipse(57, -10, 15, 11).fill(0x7fd07f)
    g.circle(62, -12, 2.5).fill(0x3f9550)
    g.circle(46, -25, 5.5).fill(ink)
    g.circle(48, -27, 2).fill(COLORS.white)
    g.ellipse(-2, 14, 26, 14).fill({ color: 0xc7ec9d, alpha: 0.8 })
  } else if (key === 'studsboll') {
    g.circle(0, 0, 42).fill(sphereFill(COLORS.purple)).stroke({ width: 4, color: 0x8f6ee0 })
    g.moveTo(-32, 2).quadraticCurveTo(0, -32, 32, 2).stroke({ width: 9, color: COLORS.yellow })
    g.moveTo(-32, 16).quadraticCurveTo(0, -18, 32, 16).stroke({ width: 9, color: COLORS.teal })
    g.circle(-15, -17, 9).fill({ color: COLORS.white, alpha: 0.5 })
  } else {
    g.circle(0, 0, 46).fill(sphereFill(COLORS.teal))
  }
}

// Lådans framsida: sidostycken + en låg framkant som högen ligger bakom. Ritas
// ovanpå leksakerna så lådan läses som en LÅDA och inte som en tavla på väggen.
function makeLadaFram() {
  const c = new Container()
  const g = new Graphics()
  const bredd = L_UT_H - L_UT_V
  // Sidostycken
  for (const [x0, x1] of [[L_UT_V, L_IN_V], [L_IN_H, L_UT_H]]) {
    g.roundRect(x0, L_TOPP - 10, x1 - x0, L_BOTTEN + 40 - L_TOPP, 10).fill(cylinderFill(0xc08a54))
    g.roundRect(x0 + 5, L_TOPP - 6, x1 - x0 - 10, L_BOTTEN + 30 - L_TOPP, 7).fill({ color: 0xd9a05b, alpha: 0.45 })
  }
  // Framkanten
  g.roundRect(L_UT_V - 8, KANT_Y, bredd + 16, 62, 14).fill(topLightFill(0xc08a54)).stroke({ width: 4, color: 0x8a5a3b })
  g.roundRect(L_UT_V - 2, KANT_Y + 7, bredd + 4, 12, 6).fill({ color: 0xe0b881, alpha: 0.65 })
  for (let i = 0; i < 7; i++) {
    const x = L_UT_V + 40 + i * 96
    g.moveTo(x, KANT_Y + 26).quadraticCurveTo(x + 32, KANT_Y + 34, x + 64, KANT_Y + 26).stroke({ width: 3, color: 0x9a6b3d, alpha: 0.45 })
  }
  // Målad leksaksstjärna på framsidan (lådan tillhör tydligt ett barnrum)
  g.star(L_MITT, KANT_Y + 31, 5, 20, 9).fill({ color: COLORS.yellow, alpha: 0.9 }).stroke({ width: 3, color: COLORS.orangeDark })
  // Järnbeslag i hörnen
  for (const bx of [L_UT_V + 16, L_UT_H - 16]) {
    g.roundRect(bx - 10, L_TOPP - 14, 20, 34, 6).fill({ color: 0x8a939b, alpha: 0.95 })
    g.circle(bx, L_TOPP + 2, 3.6).fill(0x5c646c)
  }
  // Överkantens list — hit måste leksaken lyftas för att komma ut.
  g.roundRect(L_UT_V - 6, L_TOPP - 18, bredd + 12, 20, 9).fill(topLightFill(0xd9a05b)).stroke({ width: 3, color: 0x8a5a3b })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

// Locket: en riktig bräda med tvärslå och två handtag.
function makeLock() {
  const c = new Container()
  const g = new Graphics()
  const w = LOCK_W
  const h = LOCK_H
  g.roundRect(-w / 2, -h / 2, w, h, 12).fill(topLightFill(0xc08a54)).stroke({ width: 4, color: 0x8a5a3b })
  g.roundRect(-w / 2 + 8, -h / 2 + 6, w - 16, 11, 6).fill({ color: 0xe0b881, alpha: 0.6 })
  for (let i = 0; i < 6; i++) {
    const x = -w / 2 + 60 + i * 116
    g.moveTo(x, 4).quadraticCurveTo(x + 38, 11, x + 76, 4).stroke({ width: 3, color: 0x9a6b3d, alpha: 0.42 })
  }
  for (const bx of [-LOCK_BESLAG_DX, LOCK_BESLAG_DX]) {
    g.roundRect(bx - 26, -h / 2 - 4, 52, h + 8, 8).fill({ color: 0x8a939b, alpha: 0.9 })
    g.circle(bx, 0, 4).fill(0x5c646c)
  }
  g.roundRect(-42, -h / 2 - 14, 84, 14, 7).fill(cylinderFill(0x8a5a3b))
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

// Korgen ritas i TVÅ halvor så leksakerna kan ligga MELLAN dem — annars hade de
// legat framför korgen i stället för i den.
function makeKorgBak() {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 62, 96, 16).fill({ color: 0x000000, alpha: 0.16 })
  // Handtaget bakom
  g.moveTo(-58, -30).quadraticCurveTo(0, -122, 58, -30).stroke({ width: 13, color: 0xc9a06a })
  g.moveTo(-58, -30).quadraticCurveTo(0, -122, 58, -30).stroke({ width: 5, color: 0xe3c48f, alpha: 0.8 })
  // Bakre korgvägg
  g.moveTo(-90, -34).lineTo(90, -34).lineTo(72, 58).lineTo(-72, 58).closePath().fill(topLightFill(0xb98346))
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

function makeKorgFram() {
  const c = new Container()
  const g = new Graphics()
  // Främre flätverk (leksakerna ligger bakom detta)
  g.moveTo(-90, 4).lineTo(90, 4).lineTo(72, 58).lineTo(-72, 58).closePath().fill(topLightFill(0xd0a066)).stroke({ width: 4, color: 0x8a5a3b })
  for (let i = 0; i < 9; i++) {
    const x = -80 + i * 20
    g.moveTo(x, 6).lineTo(x - 3, 56).stroke({ width: 4, color: 0xb98346, alpha: 0.7 })
  }
  for (const y of [18, 34, 48]) {
    g.moveTo(-88 + (y - 4) * 0.32, y).lineTo(88 - (y - 4) * 0.32, y).stroke({ width: 4, color: 0xe3c48f, alpha: 0.75 })
  }
  // Övre kantband
  g.roundRect(-94, -44, 188, 22, 11).fill(cylinderFill(0xd0a066)).stroke({ width: 4, color: 0x8a5a3b })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

// Beställningslappen — en anslagstavla i trä (PANEL, alltså UI: den får bära en
// ritad ikon, till skillnad från ett spelobjekt).
function makeLappTavla() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-130, -112, 260, 224, 22).fill(topLightFill(0xc08a54)).stroke({ width: 5, color: 0x8a5a3b })
  g.roundRect(-114, -96, 228, 192, 16).fill(topLightFill(0xfff6e0)).stroke({ width: 3, color: 0xe0cba4 })
  g.roundRect(-114, -96, 228, 20, 10).fill({ color: 0xffe9c7, alpha: 0.8 })
  // Häftstift överst
  g.circle(0, -122, 13).fill(topLightFill(COLORS.red)).stroke({ width: 3, color: 0xb03c3c })
  g.circle(-4, -126, 4).fill({ color: COLORS.white, alpha: 0.6 })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}
