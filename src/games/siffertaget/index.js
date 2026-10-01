// Siffertåget — siffer-/räknelek med tågtema (3–5 år). Ett glatt ånglok står till
// vänster; barnet kopplar på de numrerade vagnarna genom att dra (eller tap-tap) dem till
// rätt kopplingsplats. Två lägen som turas om:
//   · RAD   — vagnarna 1→N hängs på i stigande ordning. Rösten FRÅGAR per steg ("Vilken
//             vagn är nummer två?") — ingen vagn lyser från start.
//   · LUCKA — tåget står klart men EN vagn saknas (1, _, 3). Vilken passar?
// Hjälpen kommer SENT och SYNLIGT: efter ~4 s tystnad utan att barnet rör något (eller direkt
// efter en fel vagn) börjar den vagn som söks lysa. Fel vagn = rolig reaktion (vingel + mjukt
// ljud + vagnen säger sitt eget nummer), aldrig ett "fel".
// När tåget är fullt tutar det och ÅKER: landskapet rullar förbi (kullar, träd, telefonstolpar,
// sliprar), en station glider in och kanin, Bobo och björn vinkar och jublar. Sedan rullar
// tåget vidare, ett nytt lok kommer in och en ny runda börjar. Oändlig lek, ingen poäng, ingen
// timer. All async är skyddad med this._alive och rundtoken (exit- och återspelssäkert).
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, puff, liv, kvittera } from '../../lib/feedback.js'
import { drawIcon } from '../../lib/artikoner.js'
import { COLORS, FONT, PLAYFUL, PRAISE } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { verticalFill } from '../../lib/form.js'
import { createScene } from '../../lib/scene.js'
import { Varld, STATION_X, STATION_HALV, GAST_HOJD, GAST_BREDD } from './varld.js'
import { valjEgna, byggEgenFigur, presentera } from '../../lib/egnafigurer.js'

// Lastens ritnyckel per vagnsnummer (emoji-strängen är nyckel in i artikoner.js — föremålen
// RITAS, de är inte glyfer). Rundans vagnar håller sig alltid inom 1–5.
const LAST_ORD = { 1: '🌸', 2: '🐟', 3: '🍎', 4: '🐤', 5: '⭐' }

// Rösten. Varje replik står som en LITERAL i sin egen gren — check.mjs kan bara läsa
// `voice.say('literal')`, och en byggd sträng får aldrig ett klipp.
function sagaAntal(voice, n) {
  switch (n) {
    case 1: voice.say('Ett! En blomma!'); break
    case 2: voice.say('Två! Två fiskar!'); break
    case 3: voice.say('Tre! Tre äpplen!'); break
    case 4: voice.say('Fyra! Fyra ankungar!'); break
    case 5: voice.say('Fem! Fem stjärnor!'); break
  }
}
function fragaNummer(voice, n) {
  switch (n) {
    case 1: voice.say('Vilken vagn är nummer ett?'); break
    case 2: voice.say('Vilken vagn är nummer två?'); break
    case 3: voice.say('Vilken vagn är nummer tre?'); break
    case 4: voice.say('Vilken vagn är nummer fyra?'); break
    case 5: voice.say('Vilken vagn är nummer fem?'); break
  }
}
function fragaEfter(voice, n) {
  switch (n) {
    case 1: voice.say('Vilken kommer efter ett?'); break
    case 2: voice.say('Vilken kommer efter två?'); break
    case 3: voice.say('Vilken kommer efter tre?'); break
    case 4: voice.say('Vilken kommer efter fyra?'); break
  }
}
function sagaDetVar(voice, n) {
  switch (n) {
    case 1: voice.say('Det där är nummer ett!'); break
    case 2: voice.say('Det där är nummer två!'); break
    case 3: voice.say('Det där är nummer tre!'); break
    case 4: voice.say('Det där är nummer fyra!'); break
    case 5: voice.say('Det där är nummer fem!'); break
  }
}

// Layout (designkoordinater 1280x720).
// VIKTIGT om riktningen: loket ritas med kofångare, panna och skorsten till VÄNSTER om
// sitt origo — fronten pekar alltså åt vänster — och vagnarna hängs på åt HÖGER. Därför
// måste tåget rulla iväg åt VÄNSTER (loket först ur bild, sista vagnen sist), och landskapet
// glida åt HÖGER när tåget "kör". Allt som rör avfärden nedan utgår från det.
// LANDSKAPET. Himmel + mark kommer ur `createScene` (cachade toningar, noll texturbakningar);
// kullar, träd, telefonstolpar, sliprar och stationen ritas i `varld.js` som periodiska
// lager som skrollar. Marken hade tidigare EN ton och rälsen hängde i luften
// (`_plattprobe --medbakgrund` 697 730 px) — banvallen nedan är det som låter spåret vila.
const HORIZON_Y = 296
const C_SKY_TOP = 0xfff9ec
const C_SKY_BOT = 0xffeccd
const C_GROUND_TOP = 0xb4d78d
const C_GROUND_BOT = 0x99c471
const C_BALLAST_TOP = 0xd9c8a8
// Lokets kropp byter färg per runda (aldrig samma två gånger i rad). Första rundan är alltid
// röd som förut. Inget orange: vagn 1 — den som kopplas närmast loket — är orange.
const LOK_FARGER = [COLORS.red, COLORS.blue, COLORS.green, COLORS.teal, COLORS.purple]
const C_BALLAST_BOT = 0xc0ab87

const RAIL_Y = 300
const ENGINE_Y = 250
const ENGINE_NOSE = 122 // hur långt loket sticker ut till vänster om sitt origo (kofångaren)
const ENGINE_GAP = 200 // lok-origo -> första kopplingsplatsens centrum (koppel möter koppel)
const CAR_HALF = 85 // halva vagnskorgen
const SLOT_Y = 245
const SLOT_STEP = 188 // 170 vagnsbredd + 18 -> kopplingsstumparna möts snyggt
const POOL_Y = 560
const DEPART_DX = 1500 // minsta rullsträcka (åt vänster) vid avfärd — förlängs efter ctx.view
const DEPART_TIME = 1.5
const DEPART_STAGGER = 0.035 // stafett: varje vagn rycker med strax efter den framför

// Tidsstyrning.
const GLOD_EFTER = 4 // s tyst tvekan (inget drag, ingen replik) innan sökta vagnen börjar lysa
const CUE_EFTER = 6 // s tystnad -> frågan upprepas mjukt (småbarn)
// Färden: landskapet glider FARD_TID medan stationen kommer in; tåget står still på skärmen.
const FARD_TID = 2.4
const HURRA_T = 2.1 // stationen nästan framme -> gästerna jublar
const UTFART_T = 3.9 // hurrat har hörts -> tåget rullar vidare ut åt vänster
const RULL_TID = 1.9 // landskapet bromsar in medan nästa lok rullar in
const RULL_MIN = 600 // minsta skrollsträcka vid inrullning

// --- ritade hjälpare för spökplatsen ------------------------------------------
function rundRam(x, y, w, h, r, steg = 5) {
  const pts = []
  const hornen = [
    [x + w - r, y + r, -Math.PI / 2],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ]
  for (const [cx, cy, a0] of hornen) {
    for (let k = 0; k <= steg; k++) {
      const a = a0 + (k / steg) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  return pts
}
function cirkel(cx, cy, r, n = 20) {
  const pts = []
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return pts
}
// Streckad linje längs en SLUTEN polylinje (mönstret bär över hörn och kanter).
function streckaPoly(g, pts, dash, gap) {
  let penna = true
  let kvar = dash
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    let d = 0
    while (d < len) {
      const steg = Math.min(kvar, len - d)
      if (penna) {
        g.moveTo(a[0] + ((b[0] - a[0]) * d) / len, a[1] + ((b[1] - a[1]) * d) / len)
        g.lineTo(a[0] + ((b[0] - a[0]) * (d + steg)) / len, a[1] + ((b[1] - a[1]) * (d + steg)) / len)
      }
      d += steg
      kvar -= steg
      if (kvar <= 1e-6) {
        penna = !penna
        kvar = penna ? dash : gap
      }
    }
  }
}

export default {
  id: 'siffertaget',
  titleSv: 'Siffertåget',
  icon: '🚂',
  category: 'larande',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'siffertaget',
  voiceIntro: 'Hjälp tåget! Sätt vagnarna i ordning, ett, två, tre.',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._forstaLok = true // första rundans lok är alltid rött (se LOK_FARGER)
    this._idle = 0
    this._tvekan = 0
    this._cueN = 0
    this._stegTok = 0 // rundtoken: en replik som köats gäller bara om token är oförändrad
    this._resolving = false
    this._glodPa = false
    this._mode = 'rad'
    this._cars = []
    this._slots = []
    this._scroll = { s: 0 } // landskapets skrollvariabel (px, växer åt höger)
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Världen: skrollande lager + station. Byggs före allt som ritas över den.
    this._varld = new Varld(ctx)

    // Lugn bakgrund (dekorativ, fångar inga tryck). Breddad med BLEED så en bred telefon
    // (full bleed) aldrig ser creme-kanter utanför 0..1280. Himlen hålls i den varma tonen
    // (aldrig COLORS.bg: den färgen ÄR letterbox-cremen). Ritordning (bakifrån): scen ->
    // kullar/träd/stolpar/stationshus -> banvall -> sliprar -> rälsbalk -> förgrundsgräs ->
    // rundans föremål -> lok -> perrong med gäster -> ånga.
    // Fångare längst bak: ett tryck på tomt (mark, himmel, station, under färden) får ändå ett
    // mjukt kvitto (ton + ring). Ligger UNDER allt annat och tar bara det som inget annat tar —
    // vagnar, platser och loket är egna träffmål framför den, så inga drag stjäls.
    this._root.addChild(this._buildFangare(ctx))
    this._root.addChild(this._buildBackdrop(ctx))
    this._root.addChild(this._varld.bak)
    this._root.addChild(this._buildBallast(ctx))
    this._root.addChild(this._varld.slipers)
    this._engineX = this._engineXFor(3)
    this._root.addChild(this._buildRail())
    this._root.addChild(this._varld.gras)

    // Rundans föränderliga innehåll (slots + lösa vagnar) ligger UNDER loket, så att
    // loket kör snyggt förbi de halvgenomskinliga spökrutorna när det rullar in.
    this._roundLayer = new Container()
    this._root.addChild(this._roundLayer)

    this._engine = this._buildEngine()
    this._root.addChild(this._engine)

    // Perrongen med gäster ligger FRAMFÖR tåget (göms tills stationen kommer).
    this._root.addChild(this._varld.fram)

    // Egen behållare för ångpuffarna ur skorstenen (överst — röken syns alltid).
    // Förstörs med _root vid exit -> ingen läcka.
    this._steamLayer = new Container()
    this._steamLayer.eventMode = 'none'
    this._root.addChild(this._steamLayer)

    this._drag = new DragController({ space: this._root, services: ctx.services, skugga: true })

    this._varld.sattScroll(0)
    this._newRound(ctx, true)

    // Levande lok: hjul som guppar lätt + en svag vagga, och en loop med ång-puffar.
    this._startLocoLife(ctx)

    // Tvekan/idle: ingen glöd från start — den tänds först efter GLOD_EFTER s tyst tvekan.
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // Frågan för första steget köas efter introt (narTyst väntar in det). En kort fördröjning
    // först så att introt hunnit registreras som "talar" — annars kapar frågan det.
    ctx.later(0.4, () => {
      if (this._alive) this._fraga(ctx)
    })
  },

  // Osynlig fångare över hela synliga ytan (inkl. bleed). Alfa 0 men riktig geometri + hitArea.
  _buildFangare(ctx) {
    const w = 1280 + 2 * BLEED_X
    const h = 720 + 2 * BLEED_Y
    const g = new Graphics()
    g.rect(-BLEED_X, -BLEED_Y, w, h).fill({ color: 0xffffff, alpha: 0 })
    g.hitArea = new Rectangle(-BLEED_X, -BLEED_Y, w, h)
    g.eventMode = 'static'
    g.on('pointertap', (e) => {
      if (!this._alive || !this._root || this._root.destroyed) return
      const p = this._root.toLocal(e.global)
      kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio)
    })
    return g
  },

  // Loket är tryckbart: vissla + ångpuff + en puls på lokets KROPP (ett barn — själva loket
  // tweenas av inrullning, vagga och avfärd). Fungerar även under färden.
  _tutaLok(ctx) {
    if (!this._alive || !this._engine || this._engine.destroyed) return
    const audio = ctx.services.audio
    this._tutN = (this._tutN || 0) + 1
    const f = this._tutN % 2 ? 700 : 830
    audio.tone({ freq: f, dur: 0.32, type: 'sawtooth', vol: 0.13, slideTo: f * 1.08 })
    audio.tone({ freq: f * 1.5, dur: 0.32, type: 'sine', vol: 0.07, slideTo: f * 1.5 * 1.08 })
    const kropp = this._engine._kropp
    if (kropp && !kropp.destroyed) pop(kropp, { scale: 1.06 })
    this._emitSteam(ctx)
    puff(ctx.fxLayer, this._engine.x - 68, this._engine.y - 82, { count: 5, color: COLORS.white })
    ctx.later(0.15, () => this._emitSteam(ctx))
  },

  // Himmel + mark ur `createScene`. Djupbanden (`djup`) och disbandet stängs av: kullar, träd
  // och stolpar ritas i stället som SKROLLANDE lager i varld.js, och statiska kullar bakom
  // dem hade stått still medan tåget "åker". `groundH` räknas ur ctx.height så att horisonten
  // står kvar på HORIZON_Y även på en telefon med annan höjd.
  _buildBackdrop(ctx) {
    return createScene(
      {
        top: C_SKY_TOP,
        bottom: C_SKY_BOT,
        ground: C_GROUND_TOP,
        groundDark: C_GROUND_BOT,
        clouds: 2,
        gras: true,
      },
      { width: ctx.width, height: ctx.height, ground: true, groundH: ctx.height - HORIZON_Y, djup: false, dis: false },
    )
  },

  // Banvallen: grusbädden som spåret vilar på, ritad EFTER kullarna så att deras fot döljs.
  // Sliprarna (skrollande lager) ritas ovanpå, så spåret ligger i gruset.
  _buildBallast(ctx) {
    const g = new Graphics()
    g.rect(-BLEED_X, HORIZON_Y - 4, ctx.width + 2 * BLEED_X, 54).fill(verticalFill(C_BALLAST_TOP, C_BALLAST_BOT))
    g.eventMode = 'none'
    return g
  },

  // Rälsbalken (sliprarna är ett eget skrollande lager). Går hela den synliga bredden.
  _buildRail() {
    const rail = new Container()
    rail.eventMode = 'none'
    const g = new Graphics()
    g.roundRect(-BLEED_X - 40, RAIL_Y, 1280 + 2 * BLEED_X + 80, 18, 9).fill(COLORS.brown)
    g.rect(-BLEED_X - 40, RAIL_Y + 2, 1280 + 2 * BLEED_X + 80, 3).fill({ color: 0xffffff, alpha: 0.25 })
    rail.addChild(g)
    return rail
  },

  // Centrera hela tågsättet (lok + n vagnsplatser) i bilden och returnera lokets x.
  // Med n=5 blir loket x≈183 (vänsterkant 61) och sista vagnens högerkant ≈1220 —
  // balanserat, inget under hem-/högtalarknapparna, och gott om räls kvar att rulla på.
  _engineXFor(n) {
    const span = ENGINE_NOSE + ENGINE_GAP + (n - 1) * SLOT_STEP + CAR_HALF
    return Math.round(640 - span / 2 + ENGINE_NOSE)
  },

  // Ånglok ritat helt med Pixi Graphics så det tydligt läses som ett tåg:
  // kofångare + panna (boiler) med skorsten och ångdom till vänster (fronten),
  // hytt med tak och fönster till höger (mot vagnarna) och runda hjul under.
  // Ingen emoji/ikon inuti — bara loket.
  _buildEngine() {
    const eng = new Container()
    eng.position.set(this._engineX, ENGINE_Y)
    // Träffyta: slutar 100 px höger om origo, FÖRE första platsens träffyta (origo + 105).
    eng.hitArea = new Rectangle(-125, -80, 225, 165)
    eng.eventMode = 'static'
    eng.cursor = 'pointer'
    eng.on('pointertap', () => this._tutaLok(this._ctx))

    // Hjulen i en egen behållare så de kan gunga lätt (levande lok) utan att röra
    // resten av loket; ritas först så chassi/kropp täcker överkanten (rullar på rälsen).
    const wheels = new Graphics()
    wheels.eventMode = 'none'
    const wheel = (cx, cy, r) => {
      wheels.circle(cx, cy, r).fill(COLORS.ink).stroke({ width: 3, color: COLORS.white, alpha: 0.3 })
      wheels.circle(cx, cy, r * 0.45).fill(COLORS.inkSoft)
      wheels.circle(cx, cy, 4).fill(COLORS.ink)
    }
    wheel(-70, 48, 16) // litet löphjul fram
    wheel(-28, 50, 28) // drivhjul
    wheel(44, 50, 28) // drivhjul
    eng.addChild(wheels)
    eng._wheels = wheels

    const g = new Graphics()
    this._lokFarg = LOK_FARGER[0]
    this._ritaLok(g, this._lokFarg)
    eng.addChild(g)
    eng._kropp = g
    return eng
  },

  // Lokets kropp i en given färg. Ritas om (clear + samma geometri) när rundan byter färg.
  _ritaLok(g, farg) {
    g.clear()
    // Kofångare (pilot) längst fram till vänster.
    g.poly([-96, 22, -120, 52, -96, 52]).fill(COLORS.orangeDark)
    // Chassi/fotplåt.
    g.roundRect(-98, 24, 200, 18, 7).fill(COLORS.ink)

    // Pannans kropp (boiler) + mörkare smokebox-ring + strålkastare fram.
    g.roundRect(-100, -34, 150, 64, 22).fill(farg).stroke({ width: 5, color: COLORS.white, alpha: 0.45 })
    g.roundRect(-99, -30, 24, 56, 13).fill(COLORS.orangeDark)
    g.circle(-89, -2, 11).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.white, alpha: 0.6 })

    // Hytt (cab) bak till höger, med tak-överhäng och fönster mot vagnarna.
    g.roundRect(36, -60, 60, 90, 16).fill(farg).stroke({ width: 5, color: COLORS.white, alpha: 0.45 })
    g.roundRect(28, -68, 80, 16, 8).fill(COLORS.orangeDark) // tak
    g.roundRect(50, -46, 38, 34, 9).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.white, alpha: 0.5 })

    // Skorsten (funnel) på pannan, vidare upptill.
    g.poly([-78, -34, -84, -66, -54, -66, -60, -34]).fill(COLORS.ink)
    g.roundRect(-86, -74, 36, 13, 6).fill(COLORS.ink)
    // Ångdom mitt på pannan.
    g.roundRect(-30, -50, 32, 20, 9).fill(COLORS.yellow)
    g.circle(-14, -50, 9).fill(COLORS.yellow)

    // Koppel mot första vagnen.
    g.roundRect(94, 6, 16, 12, 4).fill(COLORS.ink)
  },

  // Levande lok: hjulen guppar lätt + ång-puffar ur skorstenen i loop. Vaggan
  // (_startRock) startas/återställs per runda eftersom _newRound dödar lok-tweens.
  _startLocoLife(ctx) {
    if (!this._alive || !this._engine || this._engine.destroyed) return
    // Hjulen guppar en aning (egen behållare -> stör inte vaggan eller utrullningen).
    if (this._engine._wheels) {
      this._wheelBob = gsap.to(this._engine._wheels, {
        y: 2,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
    }
    // Ång-puffar var ~1,4:e sekund.
    this._steam = gsap
      .timeline({ repeat: -1 })
      .to({}, { duration: 1.4 })
      .call(() => this._emitSteam(ctx))
  },

  // Svag fram-och-tillbaka-vagga på loket (y-gupp + pytteliten rotation). Dödas av
  // gsap.killTweensOf(this._engine) i _newRound, så vi startar om den där.
  _startRock() {
    this._rock?.kill()
    this._rock = null
    if (!this._alive || !this._engine || this._engine.destroyed) return
    this._engine.y = ENGINE_Y
    this._engine.rotation = 0
    this._rock = gsap
      .timeline({ repeat: -1 })
      .to(this._engine, { y: ENGINE_Y - 3, rotation: 0.012, duration: 1.0, ease: 'sine.inOut' })
      .to(this._engine, { y: ENGINE_Y, rotation: -0.012, duration: 1.0, ease: 'sine.inOut' })
      .to(this._engine, { y: ENGINE_Y - 2, rotation: 0.006, duration: 0.9, ease: 'sine.inOut' })
      .to(this._engine, { y: ENGINE_Y, rotation: 0, duration: 0.9, ease: 'sine.inOut' })
  },

  // En mjuk vit ångpuff ur skorstenen som stiger, växer och tonar bort. Exit-säkert:
  // tweenar ett vanligt objekt och rör Pixi-objektet bara om det lever (förstörs med
  // _steamLayer/_root vid exit -> kan aldrig krascha på null-transform).
  _emitSteam(ctx) {
    if (!this._alive || !this._steamLayer || this._steamLayer.destroyed) return
    if (!this._engine || this._engine.destroyed) return
    // Följ skorstenen där loket FAKTISKT är just nu (det rullar in och ut ur bild).
    const x0 = this._engine.x - 68 + (Math.random() * 10 - 5)
    const y0 = this._engine.y - 80
    const p = new Graphics().circle(0, 0, 9 + Math.random() * 5).fill({ color: COLORS.white, alpha: 0.75 })
    p.position.set(x0, y0)
    p.eventMode = 'none'
    this._steamLayer.addChild(p)
    const st = { x: x0, y: y0, s: 0.6, a: 0.7 }
    const tw = gsap.to(st, {
      // Ångan driver BAKÅT (åt höger) — tåget kör åt vänster, så röken hamnar efter det.
      x: x0 + 24 + Math.random() * 20,
      y: y0 - 70 - Math.random() * 30,
      s: 1.7,
      a: 0,
      duration: 1.6,
      ease: 'power1.out',
      onUpdate: () => {
        if (p.destroyed) {
          tw.kill()
          return
        }
        p.position.set(st.x, st.y)
        p.scale.set(st.s)
        p.alpha = st.a
      },
      onComplete: () => {
        if (!p.destroyed) p.destroy()
      },
    })
  },

  // Spökplats: ritad, inte en genomskinlig ruta. En STRECKAD vagnskontur med streckade hjul
  // och två kopplingskrokar i ändarna — den visar var en vagn ska hänga, med samma silhuett
  // som en riktig vagn. Rälsens slipers ligger redan under (skrollande lager).
  _makeSlot() {
    const s = new Container()
    const g = new Graphics()
    g.eventMode = 'none'
    g.roundRect(-85, -75, 170, 132, 20).fill({ color: COLORS.white, alpha: 0.22 })
    streckaPoly(g, rundRam(-85, -75, 170, 132, 20), 12, 9)
    g.stroke({ width: 5, color: COLORS.ink, alpha: 0.42, cap: 'round' })
    for (const wx of [-45, 45]) streckaPoly(g, cirkel(wx, 70, 24), 7, 6)
    g.stroke({ width: 4, color: COLORS.ink, alpha: 0.32, cap: 'round' })
    // Kopplingskrokar: stump + ögla, där nästa vagns koppel ska hänga i.
    for (const sida of [-1, 1]) {
      g.roundRect(sida * 88 - 7, 54, 14, 10, 3).fill({ color: COLORS.ink, alpha: 0.4 })
      g.circle(sida * 99, 59, 6).stroke({ width: 3, color: COLORS.ink, alpha: 0.4 })
    }
    s.addChild(g)
    s._ritning = g
    s.hitArea = new Rectangle(-95, -85, 190, 170)
    return s
  },

  // En tågvagn: glöd-halo (dold tills den behövs) + färgad kropp + hjul + stor siffra + last.
  // Träffyta 194x174 (>96px med hit-halo). Allt visuellt ligger i EN inre behållare `_inner`
  // som guppar av sig självt (vilo-liv) — vagnen själv bär träffytan, dragets position och
  // landningen och animeras aldrig med guppet.
  _makeCar(n) {
    const car = new Container()
    const inner = new Container()
    const glow = new Graphics().roundRect(-97, -87, 194, 174, 26).fill(COLORS.yellow)
    glow.alpha = 0
    glow.eventMode = 'none'
    const body = new Graphics()
    // Hjul med nav (ritas först).
    ;[-45, 45].forEach((wx) => {
      body.circle(wx, 70, 24).fill(COLORS.ink).stroke({ width: 3, color: COLORS.white, alpha: 0.3 })
      body.circle(wx, 70, 11).fill(COLORS.inkSoft)
      body.circle(wx, 70, 4).fill(COLORS.ink)
    })
    // Chassi + koppel-stumpar på sidorna (kopplar ihop vagnarna).
    body.roundRect(-82, 52, 164, 16, 6).fill(COLORS.ink)
    body.roundRect(-94, 54, 14, 10, 3).fill(COLORS.ink)
    body.roundRect(80, 54, 14, 10, 3).fill(COLORS.ink)
    // Vagnskorg + lätt takdager.
    body
      .roundRect(-85, -75, 170, 132, 20)
      .fill(PLAYFUL[(n - 1) % PLAYFUL.length])
      .stroke({ width: 6, color: COLORS.white, alpha: 0.7 })
    body.roundRect(-78, -70, 156, 24, 12).fill({ color: COLORS.white, alpha: 0.16 })
    // Lastbädd: en mörkare remsa i korgens botten som lasten vilar på. Utan den
    // flyter föremålen i vagnsfärgen (blomman försvann nästan mot den orange vagnen).
    body.roundRect(-74, 18, 148, 36, 12).fill({ color: 0x000000, alpha: 0.13 })
    body.eventMode = 'none'
    const num = new Text({
      text: String(n),
      style: { fontFamily: FONT.display, fontSize: 78, fontWeight: '700', fill: COLORS.white, align: 'center' },
    })
    num.anchor.set(0.5)
    num.position.set(0, -20)
    num.eventMode = 'none'
    // Lasta vagnen med exakt n tematiska föremål (3 äpplen i vagn 3, 4 ankungar i
    // vagn 4 …) — så barnet kopplar siffra <-> antal och kan RÄKNA sakerna. En liten rad
    // längst ned i korgen; skalas ned när det blir trångt. Lasten RITAS (P0 ASSETS).
    const cargo = new Container()
    cargo.eventMode = 'none'
    const key = LAST_ORD[n] || LAST_ORD[1]
    const size = n >= 4 ? 30 : 36
    const spacing = n >= 4 ? 31 : 37
    for (let i = 0; i < n; i++) {
      const it = drawIcon(key, size)
      it.position.set(-((n - 1) * spacing) / 2 + i * spacing, 36)
      cargo.addChild(it)
    }
    inner.addChild(glow, body, num, cargo)
    inner.eventMode = 'none'
    inner.interactiveChildren = false
    car.addChild(inner)
    car.hitArea = new Rectangle(-97, -87, 194, 174)
    car._glow = glow
    car._inner = inner
    return car
  },

  // --- glöden: sent och synligt, aldrig först ---------------------------------

  // Släck glöden och döda den eviga pulsen (körs när vagnen placerats, vid rundbyte, i destroy).
  _slackGlod() {
    this._pulse?.kill()
    this._pulse = null
    this._glodPa = false
    const car = this._activeCar
    this._activeCar = null
    if (car && !car.destroyed && car._glow && !car._glow.destroyed) {
      gsap.killTweensOf(car._glow)
      car._glow.alpha = 0
    }
  },

  // Numret som söks just nu.
  _malNummer() {
    return this._mode === 'lucka' ? this._gapN : this._expected
  },

  // Tänd glöden på den sökta vagnen — bara efter tvekan eller ett fel val. Mjukt klingande
  // ton + ett vink så det syns OCH hörs att hjälpen kom; den pulsar tills vagnen placeras.
  _tandGlod(ctx) {
    if (!this._alive || this._resolving || this._glodPa) return
    const n = this._malNummer()
    const car = this._cars.find((c) => !c.destroyed && !c._placed && c._n === n)
    if (!car || !car._glow || car._glow.destroyed) return
    this._glodPa = true
    this._activeCar = car
    const glow = car._glow
    gsap.killTweensOf(glow)
    glow.alpha = 0
    ctx.services.audio.tone({ freq: 880, dur: 0.2, type: 'sine', vol: 0.09 })
    wiggle(car)
    this._pulse = gsap.to(glow, {
      alpha: 0.85,
      duration: 0.5,
      ease: 'sine.out',
      onComplete: () => {
        if (!this._alive || glow.destroyed) return
        this._pulse = gsap.to(glow, { alpha: 0.45, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      },
    })
  },

  // --- frågorna ---------------------------------------------------------------

  // Köa frågan för nuvarande steg. En INSTRUKTION: den väntar in det som talar (narTyst)
  // och gäller bara om steget fortfarande är samma när den väl sägs (token oförändrad).
  _fraga(ctx) {
    if (!this._alive) return
    const tok = ++this._stegTok
    const voice = ctx.services.voice
    const gilt = () => this._alive && tok === this._stegTok && !this._resolving
    if (this._mode === 'lucka') {
      ctx.narTyst(() => {
        if (!gilt()) return
        voice.say('Här saknas en vagn!')
      })
    }
    ctx.narTyst(() => {
      if (!gilt()) return
      this._tvekan = 0
      this._idle = 0
      if (this._mode === 'lucka') fragaEfter(voice, this._gapN - 1)
      else fragaNummer(voice, this._expected)
    })
  },

  // Bygg en ny runda: rensa förra, beräkna N (växer med nivå), välj läge (rad/lucka turas
  // om), lägg ut slots + blandade vagnar. `utanFraga` = första rundan, där mount() köar frågan
  // efter introt.
  _newRound(ctx, utanFraga = false) {
    if (!this._alive) return
    this._depart?.kill()
    this._depart = null
    this._rollIn?.kill()
    this._rollIn = null
    this._scrollTw?.kill()
    this._scrollTw = null
    this._wheelBob?.timeScale(1)
    this._clearRound()
    this._placedCount = 0
    this._expected = 1
    this._resolving = false
    this._idle = 0
    this._tvekan = 0
    this._cueN = 0
    this._stegTok++ // gamla köade repliker gäller inte i den nya rundan
    const N = Math.min(5, 3 + Math.floor(this._level / 2)) // 3 → 4 → 5
    this._N = N
    // Lägena turas om: udda nivåer är luck-rundor (1, _, 3), jämna är rad-rundor.
    this._mode = this._level % 2 === 1 ? 'lucka' : 'rad'

    gsap.killTweensOf(this._engine)
    this._engineX = this._engineXFor(N) // tågsättet centreras efter hur många vagnar rundan har
    this._startRock() // vaggan dödas ovan -> starta om (återställer även y/rotation)
    // Ett nytt lok rullar in från HÖGER och bromsar in på sin plats — fronten pekar åt
    // vänster, så det kör framlänges in precis som det strax kör framlänges ut.
    // Parkeringen utgår från ctx.view.right (läses vid användning): på en bred telefon
    // syns designkoordinater bortom 1280, och loket får inte stå synligt och vänta.
    const startX = ctx.view.right + 240
    this._engine.x = startX
    // Nytt lok, ny färg — bytet sker medan loket står utanför bild. Första rundan är röd.
    if (!this._forstaLok && this._engine._kropp && !this._engine._kropp.destroyed) {
      const val = LOK_FARGER.filter((f) => f !== this._lokFarg)
      this._lokFarg = randomFrom(val)
      this._ritaLok(this._engine._kropp, this._lokFarg)
    }
    this._forstaLok = false
    this._rollIn = gsap.to(this._engine, { x: this._engineX, duration: 1.1, ease: 'power2.out' })

    // Landskapet glider åt höger medan loket rullar in (och bromsar in med det). Stationen
    // från förra rundan följer med marken och lämnar bild åt höger.
    const stX = this._varld.stationX()
    const dx = stX == null ? RULL_MIN : Math.max(RULL_MIN, ctx.view.right + STATION_HALV + 60 - stX)
    this._scrollTw = gsap.to(this._scroll, {
      s: this._scroll.s + dx,
      duration: RULL_TID,
      ease: 'sine.out',
      onUpdate: () => this._skrolla(),
    })

    if (this._mode === 'lucka') this._bygLucka(ctx, N, startX - this._engineX)
    else this._bygRad(ctx, N)

    if (!utanFraga) this._fraga(ctx)
  },

  _skrolla() {
    if (this._alive) this._varld?.sattScroll(this._scroll.s)
  },

  // RAD: alla N platser är mål, men bara nästa lediga tar emot rätt siffra.
  _bygRad(ctx, N) {
    for (let i = 0; i < N; i++) {
      const slot = this._makeSlot()
      slot.position.set(this._engineX + ENGINE_GAP + i * SLOT_STEP, SLOT_Y)
      slot._index = i
      this._roundLayer.addChild(slot)
      this._slots.push(slot)
      this._drag.addTarget(slot, (data) => data.n === this._expected && slot._index === this._placedCount, {
        hitRadius: 130,
      })
    }
    this._laggUtLosa(ctx, shuffle(Array.from({ length: N }, (_, k) => k + 1)))
  },

  // LUCKA: tåget står klart utom EN vagn — bara den luckan är ett mål. Poolen har den saknade
  // vagnen och två andra som inte passar (slumpade siffror ur 1–5). Fördel: samma vagnar och
  // samma drag, men barnet måste läsa av raden runt luckan i stället för att räkna uppåt.
  _bygLucka(ctx, N, inrullDx) {
    const gapIdx = 1 + Math.floor(Math.random() * (N - 2)) // aldrig först eller sist
    this._gapIdx = gapIdx
    this._gapN = gapIdx + 1
    this._placedCount = N - 1
    for (let i = 0; i < N; i++) {
      const x = this._engineX + ENGINE_GAP + i * SLOT_STEP
      if (i === gapIdx) {
        const slot = this._makeSlot()
        slot.position.set(x, SLOT_Y)
        slot._index = i
        this._roundLayer.addChild(slot)
        this._slots.push(slot)
        this._drag.addTarget(slot, (data) => data.n === this._gapN, { hitRadius: 130 })
        continue
      }
      // Färdigkopplade vagnar rullar in tillsammans med loket (samma ease -> ett stelt tåg).
      const car = this._makeCar(i + 1)
      car.eventMode = 'none'
      car._n = i + 1
      car._placed = true
      car.position.set(x + inrullDx, SLOT_Y)
      this._roundLayer.addChild(car)
      this._cars.push(car)
      this._rullaIn(car, x)
      if (car._inner) car._inner.y = 0
    }
    // Avledarna hämtas helst ur siffror som INTE redan sitter i tåget (1, _, 3 -> 4 och 5), så att
    // barnet väljer mellan olika tal och inte hittar en tvåa-i-tåget-kopia.
    const iTaget = new Set(Array.from({ length: N }, (_, k) => k + 1))
    const kandidater = [1, 2, 3, 4, 5].filter((k) => k !== this._gapN)
    const decoys = [...shuffle(kandidater.filter((k) => !iTaget.has(k))), ...shuffle(kandidater.filter((k) => iTaget.has(k)))].slice(0, 2)
    this._laggUtLosa(ctx, shuffle([this._gapN, ...decoys]))
  },

  _rullaIn(car, x) {
    gsap.to(car, { x, duration: 1.1, ease: 'power2.out' })
  },

  // De lösa vagnarna längs nederkanten (samma drag-koppling i båda lägena).
  _laggUtLosa(ctx, ns) {
    const span = Math.min(940, (ns.length - 1) * 235)
    ns.forEach((n, i) => {
      const car = this._makeCar(n)
      car.position.set(ns.length === 1 ? 640 : 640 - span / 2 + (span * i) / (ns.length - 1), POOL_Y)
      car._n = n
      car._placed = false
      this._roundLayer.addChild(car)
      this._cars.push(car)
      bounceIn(car, { delay: i * 0.08 })
      // Eget liv i vila: vagnen guppar och vaggar i sin egen fas (på den inre behållaren).
      if (car._inner) liv(car._inner, { bob: 3, sway: 0.015, duration: 2 + Math.random() * 0.8, phase: Math.random() })
      this._drag.addItem(car, { n }, {
        onSelect: () => {
          if (!this._alive) return
          this._idle = 0
          this._tvekan = 0
        },
        onWrong: (rec, target) => this._onFel(ctx, rec, target),
        onCorrect: (rec, target) => this._onCorrect(ctx, rec, target),
      })
    })
  },

  // Fel vagn på en plats: rolig reaktion, aldrig ett "fel". Vagnen vinglar, DragController
  // spelar redan 'soft' och snäpper hem den. En vagn med FEL nummer säger vilket nummer den
  // är (siffra <-> talord) och glöden tänds direkt på den som söks. Den RÄTTA vagnen på fel
  // plats får i stället rätt plats att pulsa till.
  _onFel(ctx, rec, target) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._tvekan = 0
    wiggle(rec.view)
    const voice = ctx.services.voice
    if (rec.data.n !== this._malNummer()) {
      if (!voice.talar) sagaDetVar(voice, rec.data.n)
      this._tandGlod(ctx)
    } else {
      const ratt = this._slots[this._placedCount]
      if (ratt && !ratt.destroyed && ratt._ritning && !ratt._ritning.destroyed) pop(ratt._ritning)
    }
  },

  // Rätt vagn på rätt plats: räkna, gnistra, koppla på och gå vidare.
  _onCorrect(ctx, rec, target) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._tvekan = 0
    rec.view._placed = true
    this._slackGlod() // glöden och dess eviga puls dör när vagnen placerats
    const n = rec.data.n
    // Vagnen slutar guppa när den hänger i tåget.
    const inner = rec.view._inner
    if (inner && !inner.destroyed) {
      inner._fxLiv?.kill()
      inner.y = 0
      inner.rotation = 0
    }

    ctx.services.audio.sfx('correct')
    // Mjukt tåg-"tut" vid varje koppling; tonhöjden KLÄTTRAR ju fler vagnar som
    // hängts på (kombo-känsla). audio.tone går förbi anti-loop-skyddet med flit.
    const steg = this._mode === 'lucka' ? this._gapIdx : this._placedCount
    const base = 220 + steg * 34
    ctx.services.audio.tone({ freq: base, dur: 0.24, type: 'triangle', vol: 0.18, slideTo: base * 1.18 })
    ctx.services.audio.tone({ freq: base * 1.5, dur: 0.24, type: 'sine', vol: 0.08, slideTo: base * 1.5 * 1.18 })
    // Räkna OCH knyt siffran till antalet last-föremål ("Tre! Tre äpplen!").
    sagaAntal(ctx.services.voice, n)
    sparkle(ctx.fxLayer, target.view.x, target.view.y)
    pop(rec.view)
    this._koppelSnapp(ctx, rec.view)
    // Spökplatsen har gjort sitt när vagnen sitter i — tona bort den, annars står tomma
    // streckade konturer kvar på rälsen när tåget rullar iväg.
    const ghost = target.view
    if (ghost && !ghost.destroyed) {
      gsap.killTweensOf(ghost)
      gsap.to(ghost, { alpha: 0, duration: 0.3, ease: 'sine.out' })
    }

    this._placedCount++
    if (this._mode === 'rad') this._expected++

    if (this._placedCount >= this._N) this._finishRound(ctx)
    else this._fraga(ctx) // nästa steg: fråga, utan glöd
  },

  // Koppelsnäpp: vagnen KLICKAR i kopplet — en kort metallisk klick-ton, damm vid hjulen
  // och ett ryck mot loket. Rycket går på vagnens BARN via ett proxy-objekt: vagnen själv
  // bär träffytan, DragControllers landning och `pop`. Ett ryck per vagn (`_ryckTl`), så
  // två snabba kopplingar aldrig lämnar en vagn halvvägs förskjuten.
  _koppelSnapp(ctx, car) {
    if (!this._alive || !car || car.destroyed) return
    const audio = ctx.services.audio
    audio.tone({ freq: 1318.51, dur: 0.035, type: 'square', vol: 0.05 })
    audio.tone({ freq: 783.99, dur: 0.06, type: 'triangle', vol: 0.12, delay: 0.035 })
    for (const wx of [-45, 45]) puff(ctx.fxLayer, car.x + wx, car.y + 90, { count: 3, color: C_BALLAST_TOP })
    const barn = [...car.children]
    const st = { dx: 0 }
    const flytta = () => {
      for (const b of barn) if (!b.destroyed) b.x = st.dx
    }
    car._ryckTl?.kill()
    car._ryckTl = gsap
      .timeline({ onUpdate: flytta, onComplete: flytta })
      .to(st, { dx: -9, duration: 0.06, ease: 'power2.out' })
      .to(st, { dx: 0, duration: 0.36, ease: 'elastic.out(1, 0.4)' })
  },

  // Hela tåget klart: tut + firande, sedan FÄRDEN — landskapet rullar förbi, en station glider
  // in och gästerna jublar — och så rullar tåget vidare ut åt vänster och nästa runda börjar.
  _finishRound(ctx) {
    if (!this._alive) return
    this._resolving = true
    this._idle = 0
    this._stegTok++ // ingen köad fråga får höras under färden
    this._slackGlod()

    // Vinstljud och konfettiregn kommer från progress.complete() nedan.
    ctx.services.audio.sfx('whoosh')
    // Stolt ångvissel när hela tåget är fullt: en varm, rätt hög ton som stiger och
    // hålls (två stämmor = ångvisslans övertoner).
    ctx.services.audio.tone({ freq: 620, dur: 0.75, type: 'sawtooth', vol: 0.2, slideTo: 720 })
    ctx.services.audio.tone({ freq: 930, dur: 0.75, type: 'sine', vol: 0.1, slideTo: 1080 })
    this._rollIn?.kill()
    this._rollIn = null
    this._scrollTw?.kill()
    this._scrollTw = null
    puff(ctx.fxLayer, this._engine.x - 68, this._engine.y - 82, { color: COLORS.inkSoft })

    // FÄRDEN. Tåget står still på skärmen; världen glider åt HÖGER (tåget kör åt vänster).
    // Stationen börjar utanför vänsterkanten (läses mot ctx.view.left vid användning) och
    // glider in med marken så att den stannar exakt bakom tåget vid FARD_TID.
    const s0 = this._scroll.s
    const x0 = ctx.view.left - STATION_HALV - 20
    this._varld.stationVisa(s0, x0)
    this._egenGast(ctx)
    this._depart = gsap.timeline()
    this._depart.to(
      this._scroll,
      { s: s0 + (STATION_X - x0), duration: FARD_TID, ease: 'sine.inOut', onUpdate: () => this._skrolla() },
      0,
    )
    // Hjulen snurrar snabbare och skorstenen chuffar medan tåget "åker".
    this._wheelBob?.timeScale(3.2)
    ;[0, 0.3, 0.6, 0.9, 1.25, 1.6].forEach((t) => this._depart.call(() => this._emitSteam(ctx), null, t))
    // Framme: hjulen lugnar sig och gästerna vinkar och jublar.
    this._depart.call(
      () => {
        if (!this._alive) return
        this._wheelBob?.timeScale(1)
        this._varld?.hurra(ctx)
      },
      null,
      HURRA_T,
    )

    // AVFÄRD ÅT VÄNSTER. Loket har fronten (kofångare/skorsten) åt vänster och vagnarna
    // åt höger, så tåget måste rulla åt VÄNSTER för att köra framlänges: loket lämnar
    // bilden först, sista vagnen sist. Varje vagn rycker med en aning efter den framför
    // (stafett) så man känner att kopplen tas upp ett i taget.
    // Rullsträckan läses mot ctx.view.left vid användning: på en bred telefon syns
    // designkoordinater till vänster om 0, och HELA tågsättet (sista vagnen sist) ska
    // hinna förbi den synliga kanten. På 16:9 blir det exakt DEPART_DX som förut.
    const lastCarX = this._engineX + ENGINE_GAP + (this._N - 1) * SLOT_STEP
    const departDx = Math.max(DEPART_DX, Math.round(lastCarX + CAR_HALF + 40 - ctx.view.left + 60))
    this._depart.call(
      () => {
        if (!this._alive) return
        ctx.services.audio.tone({ freq: 700, dur: 0.35, type: 'sawtooth', vol: 0.13, slideTo: 760 })
        this._wheelBob?.timeScale(3.2)
      },
      null,
      UTFART_T,
    )
    this._depart.to(this._engine, { x: `-=${departDx}`, duration: DEPART_TIME, ease: 'power1.in' }, UTFART_T)
    this._cars.forEach((c) => {
      if (c.destroyed) return
      const place = Math.max(0, (c._n | 0) - 1) // vagn 1 sitter närmast loket och rycker först
      this._depart.to(
        c,
        { x: `-=${departDx}`, duration: DEPART_TIME, ease: 'power1.in' },
        UTFART_T + (place + 1) * DEPART_STAGGER,
      )
    })
    ;[0, 0.25, 0.5, 0.8].forEach((t) => this._depart.call(() => this._emitSteam(ctx), null, UTFART_T + t))

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    // Delat firande: vinstljud + regn + stjärna + klistermärke. Berömmet utgår — sista
    // vagnens räkneord ("Fem! Fem stjärnor!", 1,8–2,1 s) talar redan i samma tick.
    ctx.progress.complete()
    // Sista frasen: glatt tut + beröm medan tåget åker. Den väntar in räkneordet; är rundan
    // en annan när den blir hörbar (token ändrad) är den inaktuell och utgår.
    const tok = ++this._stegTok
    ctx.narTyst(() => {
      if (!this._alive || tok !== this._stegTok) return
      ctx.services.voice.say(`Tut tut! ${randomFrom(PRAISE)}`)
    })

    // Vänta tills hela tågsättet (inkl. stafett-fördröjningen på sista vagnen) lämnat
    // bilden innan nästa lok rullar in från höger.
    this._next?.kill()
    this._next = gsap.delayedCall(UTFART_T + DEPART_TIME + 0.4, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Barnets egen figur står bland gästerna på perrongen — en gång per ankomst (valjEgna räknar
  // takten: varannan station, annars bara kanin, Bobo och björn). Byggs vid ankomsten och
  // följer med stationen ut ur bild. En ny figur presenteras; andra får bilden räcka, så
  // ett mött knytt aldrig kallas "ditt".
  _egenGast(ctx) {
    const [beskr] = valjEgna(ctx.services, 'siffertaget', { antal: 1 })
    if (!beskr || !this._alive || !this._varld) return
    const fig = byggEgenFigur(ctx, beskr, { hojd: GAST_HOJD, maxBredd: GAST_BREDD })
    this._varld.sattGast(fig, this._engineX)
    presentera(ctx, fig, { knytt: 'Titta, ditt knytt står på perrongen!', kompis: 'Titta, din kompis står på perrongen!' })
  },

  // Tvekan och idle. Båda räknar bara TYSTNAD utan att barnet rör något: medan en replik talar
  // eller ett drag pågår står klockorna still (annars kapar påminnelsens say() en replik som
  // redan talar). Efter GLOD_EFTER s tänds glöden; efter CUE_EFTER s upprepas frågan mjukt.
  _update(ctx, ticker) {
    if (!this._alive || this._resolving) return
    if (this._drag?.active || ctx.services.voice.talar) {
      this._idle = 0
      this._tvekan = 0
      return
    }
    const dt = ticker.deltaMS / 1000
    this._tvekan += dt
    this._idle += dt
    if (!this._glodPa && this._tvekan > GLOD_EFTER) this._tandGlod(ctx)
    if (this._idle > CUE_EFTER) {
      this._idle = 0
      const voice = ctx.services.voice
      if (this._mode === 'lucka') fragaEfter(voice, this._gapN - 1)
      else if (this._expected > 1 && this._cueN++ % 2 === 1) fragaEfter(voice, this._expected - 1)
      else fragaNummer(voice, this._expected)
      if (this._activeCar && !this._activeCar.destroyed) wiggle(this._activeCar)
    }
  },

  // Töm förra rundans slots/vagnar utan att läcka tweens eller lyssnare.
  _clearRound() {
    this._slackGlod()
    this._drag.clear()
    this._dodaRundTweens()
    this._roundLayer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._cars = []
    this._slots = []
  },

  // Dödar ALLA tweens på rundans noder (rot + inre behållare + barn) innan de rivs.
  _dodaRundTweens() {
    this._slots.forEach((s) => {
      if (s.destroyed) return
      gsap.killTweensOf(s)
      if (s._ritning && !s._ritning.destroyed) {
        gsap.killTweensOf(s._ritning)
        gsap.killTweensOf(s._ritning.scale)
      }
    })
    this._cars.forEach((c) => {
      if (c.destroyed) return
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
      if (c._glow) gsap.killTweensOf(c._glow)
      const inner = c._inner
      if (inner && !inner.destroyed) {
        inner._fxLiv?.kill()
        gsap.killTweensOf(inner)
        gsap.killTweensOf(inner.scale)
      }
      c._ryckTl?.kill()
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._next?.kill()
    this._pulse?.kill()
    this._depart?.kill()
    this._rollIn?.kill()
    this._scrollTw?.kill()
    this._steam?.kill()
    this._rock?.kill()
    this._wheelBob?.kill()
    this._drag?.destroy()
    this._dodaRundTweens()
    if (this._engine) gsap.killTweensOf(this._engine)
    const kr = this._engine?._kropp
    if (kr && !kr.destroyed) {
      kr._fxPopTl?.kill()
      gsap.killTweensOf(kr)
      gsap.killTweensOf(kr.scale)
    }
    this._ctx = null
    if (this._scroll) gsap.killTweensOf(this._scroll)
    // Världens tweens (djurens armar, Bobo-riggen) dör INNAN scenen rivs.
    this._varld?.destroy()
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
