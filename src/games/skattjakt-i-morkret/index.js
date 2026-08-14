// Skattjakt i Mörkret — en mysig vind i mörker, en ficklampa och en skattkista.
//
// KÄRNLOOP: barnet drar (eller trycker) ficklampan över ett mörkt vindsrum. Ljuskäglan
// avslöjar det som ligger under — gamla lådor, en sovande katt och de saker som står på
// hyllan längst ner. Tryck på en upplyst sak → den flyger till Bobos skattkista.
// När alla saker på hyllan är hittade öppnas kistan och lyser upp HELA rummet: mörkret
// lyfts som en gardin.
//
// ── MÖRKRET (den tekniskt känsliga delen) ────────────────────────────────────────────
// Mörkret är TVÅ saker:
//   1. En SPRITE med en Canvas2D-bakad ljustextur (256×256) centrerad på lampan: full mörk
//      duk med ett HÅL punsat i mitten och en varm glöd inne i hålet (se `bakaLjusTextur`).
//      Spriten skalas till 2·R och följer fingret VARJE bildruta — inga trappsteg, ingen
//      omritning, ingen hackighet.
//   2. FYRA heltäckande mörka rektanglar som täcker resten av BLEED-ytan och möter spritens
//      kvadrat exakt (1 px överlapp). De ritas också om varje bildruta — fyra rektanglar
//      kostar ingenting, och varje eftersläpning skulle öppna en ljus skarv vid kanten.
//
// FÖRSTA VERSIONEN var ett rutnät av ~180 rektanglar med alfa per ruta. Det fungerade
// (grönt test), men ägaren läste skärmdumpen: ljuskäglans kant gick i synliga fyrkantiga
// trappsteg och de upplysta sakerna fick en rutig slöja. 32 px-rastret SYNS. Rutnätsvägen
// ligger kvar som reservläge (`_ritaRutnat`) och används bara om texturen inte kan bakas.
//
// ── EXIT-SÄKERHET ────────────────────────────────────────────────────────────────────
// `_alive` + `ctx.later()` för allt fördröjt, alla tweens samlas i `this._tw` och dödas i
// `destroy`. Transienta partiklar går genom `lib/feedback.js` (redan exit-säkra).
//
// ── VARFÖR INTE DragController ───────────────────────────────────────────────────────
// Ficklampan snäpper inte till något mål — den är fri över hela rummet. `DragController`
// är byggd kring föremål+mål+snäpp, och skulle här bara lägga en snäpp-hem-tween på
// ljuset. Draget är därför handrullat, men med samma P0-regler: tap fungerar lika bra som
// drag (ett tryck flyttar ljuset dit), draget överlever att fingret lämnar lampan
// (`globalpointermove`), och bara EN pekare åt gången (inget multitouch).
import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import { gsap } from 'gsap'
import { drawIcon } from '../../lib/artikoner.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle, puff, burst, liv, ripple, kvittera, squash } from '../../lib/feedback.js'
import { COLORS, PRAISE, shade } from '../../lib/theme.js'
import { verticalFill, groundFill, topLightFill, sphereFill } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

const W = 1280
const H = 720

// --- mörkret ---
const MORK = 0x241b2e // djup, VARM mörkerton (inte svart — vinden ska vara mysig)
const MORK_RGB = '36, 27, 46' // samma färg för Canvas2D-toningen
const MORK_MAX = 0.94 // hur mörkt det blir längst bort från lampan
const KARNA = 0.4 // andel av radien som är HELT genomskinlig (rena färger under ljuset)
const FULL_VID = 0.88 // ...och här är mörkret redan fullt, innanför spritens kant
const TEX_S = 256 // ljustexturens sida i px (skalas upp till 2·R, ~1,6× vid R=202)
// Ramens inre kant läggs 1 px innanför spritens kvadrat. Ett större insteg (8 % av R
// prövades först) mörkar samma yta TVÅ gånger och ritar en synlig mörkare ram runt ljuset;
// noll insteg riskerar en hårfin ljus skarv vid halvpixelplacering. 1 px är den enda
// bredden som varken syns eller släpper igenom.
const RAM_INS = 1
const OMRITNING_PX = 3 // reservlägets rutnät ritas om först när lampan rört sig så mycket
const OMRITNING_R = 2 // ...eller radien ändrats så här mycket
// Reservlägets rutnät (används bara om Canvas2D-texturen inte kan bakas).
const CELL_W = 32
const CELL_H = 30

// --- ljuset ---
const LJUS_MIN_X = 80
const LJUS_MAX_X = 1200
const LJUS_MIN_Y = 130
const LJUS_MAX_Y = 596
// Ficklampan hålls NEDANFÖR ljuskäglan (handen kommer underifrån), så varken lampan
// eller fingret ligger ovanpå det barnet ska se.
const LAMPA_DX = 34
const LAMPA_DY = 104
const LAMPA_ROT = Math.atan2(LAMPA_DY, LAMPA_DX) // riktning från lampan upp mot käglan

// --- rummet ---
const VAGG_Y = 498 // golvlinjen
const HYLLA_Y = 640 // checklistans hylla (UI, alltid upplyst)
const KISTA = { x: 1112, y: 542 }
const BOBO_POS = { x: 966, y: 492 }

// Gömställen: ett rutnät av kandidatpunkter i rummet, blandas och plockas med
// minsta avstånd så två träffytor aldrig krockar (P0: ≥24 px mellan ytorna).
const SPOT_X = [190, 330, 470, 610, 740, 858]
const SPOT_Y = [216, 330, 442, 540]
const MIN_AVSTAND = 176

// Skatterna. Nycklarna är `artikoner.js`-ikoner: riktiga RITADE föremål med egen
// silhuett (P0 ASSETS) — ingen emoji i en ruta någonstans.
const SKATTER = ['🔑', '🧸', '⭐', '⚽', '🎈', '🚂', '⛵', '🎁', '☂️', '⏰', '💎', '🍪']

// Nivåer: mjuk progression, aldrig hårdare på fel sätt. Färre saker och bredare kägla
// först; flimret (motgången) finns först från nivå 1.
const NIVAER = [
  { saker: 3, radie: 202, flimmer: false },
  { saker: 4, radie: 184, flimmer: true },
  { saker: 5, radie: 168, flimmer: true },
]

// Fyndens ton: en pentatonisk stege uppåt (C5 D5 E5 G5 A5) — varje fynd är nästa steg,
// så rundan i sig blir en melodi som stiger mot finalen.
const STEGE = [523.25, 587.33, 659.25, 783.99, 880.0]

export default {
  id: 'skattjakt-i-morkret',
  titleSv: 'Skattjakt i Mörkret',
  icon: '🔦',
  category: 'pussel',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'skattjakt-i-morkret',
  voiceIntro: 'Det är mörkt på vinden! Lys med ficklampan och hitta sakerna.',

  init(ctx) {
    this._alive = true
    this._tw = []
    this._ctxRef = ctx
    this._niva = Math.max(0, Math.min(NIVAER.length - 1, ctx.progress.get().highestLevel | 0))

    this._rot = new Container()
    ctx.stage.addChild(this._rot)

    // Lager underifrån och upp:
    //   catcher (pekytan för draget) → rum (allt gömt) → mörker → front (allt som
    //   ALLTID syns: fönstret, Bobo, kistan, hyllan, lampan) → fx (partiklar).
    this._catcher = new Container()
    this._catcher.eventMode = 'static'
    this._catcher.hitArea = new Rectangle(-BLEED_X, -BLEED_Y, W + BLEED_X * 2, H + BLEED_Y * 2)
    this._rum = new Container()
    this._morker = new Container()
    this._morker.eventMode = 'none'
    this._morker.interactiveChildren = false
    // OBS: `_front` får INTE vara eventMode 'none' / interactiveChildren false — ficklampan
    // bor här och måste gå att greppa. Varje dekorativt barn sätts 'none' var för sig.
    this._front = new Container()
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._rot.addChild(this._catcher, this._rum, this._morker, this._front, this._fx)

    // Rummets fasta delar (vägg, golv, takstolar) — byggs en gång.
    this._byggRum()

    // Skräpet på vinden ritas om per runda (nya platser = ny rumskänsla).
    this._bråte = new Container()
    this._bråte.eventMode = 'none'
    this._rum.addChild(this._bråte)

    // Gömda saker + katt ligger ÖVER bråten men UNDER mörkret.
    this._saker = new Container()
    this._rum.addChild(this._saker)

    // Mörkret: ljusspriten (hålet) + ramens fyra rektanglar. `_morkerG` är reservlägets
    // rutnät och står tomt så länge texturen finns.
    this._ljusTex = bakaLjusTextur()
    this._morkerG = new Graphics()
    this._morkerG.eventMode = 'none'
    this._ramG = new Graphics()
    this._ramG.eventMode = 'none'
    if (this._ljusTex) {
      this._hal = new Sprite(this._ljusTex)
      this._hal.anchor.set(0.5)
      this._hal.eventMode = 'none'
      this._morker.addChild(this._hal, this._ramG)
    } else {
      this._morker.addChild(this._morkerG)
    }

    // Fronten (alltid synlig).
    this._byggFonster()
    this._byggKista()
    this._bobo = makeKaraktar({ r: 44 })
    this._bobo.view.position.set(BOBO_POS.x, BOBO_POS.y)
    this._front.addChild(this._bobo.view)

    // Minnesglimtar: en svag varm fläck ovanpå mörkret där barnet REDAN sett något.
    // Utan den blir en sak man hittat men inte hunnit trycka på borta igen så fort
    // ljuset glider vidare — det är en motgång utan glädje.
    this._glimtar = new Container()
    this._glimtar.eventMode = 'none'
    this._front.addChild(this._glimtar)

    // Flyglager: en sak som är på väg till kistan lyfts hit så den syns OVANPÅ mörkret.
    this._flyg = new Container()
    this._flyg.eventMode = 'none'
    this._front.addChild(this._flyg)

    this._hylla = new Container()
    this._hylla.eventMode = 'none'
    this._front.addChild(this._hylla)

    // Käglan (dis från linsen) + själva ficklampan. Den varma glöden i ljuspölen bor i
    // ljustexturen, inte i en egen sprite — se noten i `bakaLjusTextur`.
    this._straleG = new Graphics()
    this._straleG.eventMode = 'none'
    this._front.addChild(this._straleG)
    this._byggLampa()

    // Ljusets tillstånd. Startpunkten ligger med flit UTANFÖR sak-rutnätet (SPOT_X når
    // 858+22, SPOT_Y 216−18): mitt i rummet var 2 av 12 rundor redan avslöjade när
    // barnet kom in — en sak låg innanför upptäcktsradien (R·0,6 ≈ 121 px) från start
    // och glimmade klickbar utan att någon rört ficklampan. Vid fönstret är närmaste
    // möjliga gömställe 182 px bort, alltså alltid utanför.
    this._lx = 1060
    this._ly = 170
    this._tx = 1060
    this._ty = 170
    this._flimmer = { f: 1 } // 1 = full radie, <1 = flimrar
    this._ritadX = -9999
    this._ritadY = -9999
    this._ritadR = -1

    this._pekId = null
    this._drar = false

    this._nyRunda(ctx, false)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)

    this._catcher.on('pointerdown', (e) => this._nedslag(ctx, e))
    this._catcher.on('globalpointermove', (e) => this._flytta(e))
    // SLÄPPET LYSSNAS PÅ ROTEN, inte på catchern. Greppar barnet SJÄLVA ficklampan blir
    // `_lampa` (barn till `_front`) pressTarget, och catchern är dess SYSKON — den ligger
    // på ingen av de två vägar ett släpp tar: `pointerup` bubblar längs släpp-målets kedja
    // (lampa → _front → _rot) och `pointerupoutside` vandrar bara uppför pressTargets EGEN
    // föräldrakedja (EventBoundary.mapPointerUp/mapPointerUpOutside). `_slapp` kördes
    // därför aldrig: `_drar` stod kvar true och `_pekId` på ett dött finger-id, så varje NY
    // pekning (ett nytt pointerId, vilket varje ny fingerpekning får) avvisades som "andra
    // fingret" och ljuset gick inte att flytta mer — permanent, utan ett enda konsolfel.
    // Uppmätt (`scripts/_lampprobe.mjs`): efter släpp flyttade en ny pekare lampan 1 px mot
    // kontrollarmens 372 px. Roten är gemensam förälder till både catchern och lampan.
    //
    // `eventMode` MÅSTE sättas: `EventBoundary.notifyTarget` bortar tyst på allt som inte är
    // 'static'/'dynamic', så en bubblande förälder på default 'passive' får ingenting. Utan
    // raden fastnade även KONTROLLARMEN (ny pekare flyttade lampan 2 px). Roten blir inte
    // själv ett träffmål av det — en bar Container utan `hitArea` träfftestar alltid falskt.
    this._rot.eventMode = 'static'
    this._rot.on('pointerup', (e) => this._slapp(e))
    this._rot.on('pointerupoutside', (e) => this._slapp(e))
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._bobo?.react('hej')
  },

  // ---------------------------------------------------------------- rummet

  _byggRum() {
    const bw = W + BLEED_X * 2
    const vagg = new Graphics()
    // Vägg: varmt trä, ljusare upptill (fönstret sitter där).
    vagg.rect(-BLEED_X, -BLEED_Y, bw, VAGG_Y + BLEED_Y).fill(verticalFill(0x6b4d38, 0x3f2c21))
    // Plankskarvar — annars är väggen en enda platt ton.
    for (let x = -BLEED_X; x < W + BLEED_X; x += 104) {
      vagg.rect(x, -BLEED_Y, 4, VAGG_Y + BLEED_Y).fill({ color: 0x2c1e17, alpha: 0.35 })
    }
    // Takstolar: en bjälke tvärs över och två snedstöttor — vindskänsla på tre former.
    vagg.rect(-BLEED_X, 96, bw, 30).fill(topLightFill(0x5a3f2d))
    vagg.moveTo(-BLEED_X, -BLEED_Y).lineTo(250, 112).lineTo(196, 130).lineTo(-BLEED_X, -BLEED_Y + 60).closePath().fill(0x4a3325)
    vagg.moveTo(W + BLEED_X, -BLEED_Y).lineTo(1030, 112).lineTo(1084, 130).lineTo(W + BLEED_X, -BLEED_Y + 60).closePath().fill(0x4a3325)
    // Golv.
    vagg.rect(-BLEED_X, VAGG_Y, bw, H + BLEED_Y - VAGG_Y).fill(groundFill(0x7d5836))
    for (let y = VAGG_Y + 34; y < H + BLEED_Y; y += 46) {
      vagg.rect(-BLEED_X, y, bw, 3).fill({ color: 0x4a3220, alpha: 0.4 })
    }
    // Spindelväv i hörnet (mysig vind, inte läskig).
    for (let i = 1; i <= 3; i++) {
      vagg.moveTo(-BLEED_X + 10, 130 + i * 34).quadraticCurveTo(120, 150 + i * 20, 150 + i * 26, 130)
      vagg.stroke({ width: 2, color: 0xd8d0c4, alpha: 0.12 })
    }
    vagg.eventMode = 'none'
    this._rum.addChild(vagg)
  },

  // Runt fönster med månljus. Ligger i FRONT-lagret med låg alfa: det är rummets enda
  // egna ljuskälla och ett fast riktmärke i mörkret.
  _byggFonster() {
    const f = new Container()
    f.position.set(1108, 196)
    const g = new Graphics()
    g.circle(0, 0, 74).fill({ color: 0x9fc4e8, alpha: 0.34 })
    g.circle(0, 0, 62).fill({ color: 0xd8ecff, alpha: 0.22 }).stroke({ width: 9, color: 0x6b4d38, alpha: 0.9 })
    g.moveTo(-62, 0).lineTo(62, 0).moveTo(0, -62).lineTo(0, 62).stroke({ width: 7, color: 0x6b4d38, alpha: 0.85 })
    g.circle(-18, -16, 17).fill({ color: 0xfff6d0, alpha: 0.5 }) // månen
    f.addChild(g)
    // Månstrimma ner mot golvet.
    const strimma = new Graphics()
    strimma.moveTo(-52, 40).lineTo(52, 40).lineTo(150, 330).lineTo(-30, 330).closePath()
    strimma.fill({ color: 0xbcd8f2, alpha: 0.07 })
    f.addChildAt(strimma, 0)
    f.eventMode = 'none'
    this._front.addChild(f)
  },

  // Skattkistan: ritad låda med gångjärnslock som gapar när en sak kommer in.
  _byggKista() {
    const k = new Container()
    k.position.set(KISTA.x, KISTA.y)

    // Varm lyktglöd bakom kistan + Bobo, så mottagaren alltid är synlig.
    const glod = new Graphics()
    glod.ellipse(-70, 30, 240, 140).fill({ color: 0xffcf7a, alpha: 0.14 })
    glod.ellipse(-40, 20, 150, 92).fill({ color: 0xffe0a0, alpha: 0.12 })
    glod.eventMode = 'none'
    this._front.addChild(glod)

    const skugga = new Graphics().ellipse(0, 66, 108, 20).fill({ color: 0x000000, alpha: 0.3 })
    const kropp = new Graphics()
    kropp.roundRect(-96, -18, 192, 84, 12).fill(topLightFill(0x8a5a3b))
    kropp.rect(-96, 6, 192, 12).fill({ color: 0xd9a021, alpha: 0.85 }) // beslag
    kropp.roundRect(-18, 10, 36, 34, 8).fill(sphereFill(0xf0c33c)) // lås
    kropp.circle(0, 24, 6).fill(0x6b4d38)

    // Guldet syns bara när locket är uppe (ligger under locket i z-led).
    const guld = new Graphics()
    guld.roundRect(-84, -34, 168, 30, 10).fill(0xf0c33c)
    for (const gx of [-56, -20, 18, 54]) guld.circle(gx, -30, 13).fill(sphereFill(0xffe14a))
    guld.eventMode = 'none'

    const lock = new Container()
    lock.position.set(-96, -20)
    const lg = new Graphics()
    lg.moveTo(0, 0).lineTo(192, 0).lineTo(192, -18).quadraticCurveTo(96, -56, 0, -18).closePath()
    lg.fill(topLightFill(0x9a6743))
    lg.rect(0, -8, 192, 11).fill({ color: 0xd9a021, alpha: 0.85 })
    lock.addChild(lg)
    lock.pivot.set(0, 0)

    k.addChild(skugga, guld, kropp, lock)
    k.eventMode = 'none'
    this._kista = k
    this._lock = lock
    this._front.addChild(k)
  },

  // Ficklampan: ritat föremål (grepp, kropp, ring, lins) med egen silhuett. Ritad
  // pekande längs -x, så en enda rotation riktar den mot käglan.
  _byggLampa() {
    const c = new Container()
    const g = new Graphics()
    g.roundRect(-16, -13, 74, 26, 11).fill(topLightFill(0x4a5a68)) // grepp
    g.roundRect(30, -9, 22, 18, 6).fill(0x2f3a44)
    g.roundRect(-34, -17, 26, 34, 8).fill(topLightFill(0xd9a021)) // ring
    g.moveTo(-34, -17).lineTo(-56, -27).lineTo(-56, 27).lineTo(-34, 17).closePath().fill(topLightFill(0xe8b93a)) // huvud
    g.ellipse(-55, 0, 8, 26).fill(sphereFill(0xfff3c4)) // lins
    g.ellipse(-53, -8, 4, 9).fill({ color: 0xffffff, alpha: 0.65 })
    g.roundRect(-6, -15, 9, 30, 4).fill({ color: 0xffffff, alpha: 0.16 })
    g.eventMode = 'none'
    c.addChild(g)
    c.rotation = LAMPA_ROT
    // Egen träffyta ≥96 px så lampan går att greppa direkt (P0).
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-64, -54, 132, 108)
    // Greppas SJÄLVA lampan behåller käglan sitt läge i förhållande till handen (offset),
    // i stället för att hoppa ner till fingret.
    c.on('pointerdown', (e) => this._nedslag(this._ctxRef, e, -LAMPA_DX, -LAMPA_DY))
    this._lampa = c
    this._front.addChild(c)
  },

  // Bråte som varierar per runda: lådstaplar, tunna, böcker, kvast, matta. Rena former,
  // inga ikoner — de här SKA läsa som möbler i skugga, inte som saker att trycka på.
  _byggBrate() {
    const b = this._bråte
    for (const barn of b.removeChildren()) barn.destroy({ children: true })
    const j = (m) => (Math.random() * 2 - 1) * m
    const g = new Graphics()

    // Lådstapel till vänster.
    const lx = 150 + j(30)
    for (let i = 0; i < 3; i++) {
      const w = 128 - i * 14
      const y = VAGG_Y - 14 - i * 62
      g.roundRect(lx - w / 2, y - 58, w, 60, 6).fill(topLightFill(0xa87c4e))
      g.rect(lx - w / 2, y - 34, w, 7).fill({ color: 0x8a6238, alpha: 0.8 })
    }
    // Tunna.
    const tx = 700 + j(40)
    g.roundRect(tx - 52, VAGG_Y - 128, 104, 128, 16).fill(topLightFill(0x8a5a3b))
    g.ellipse(tx, VAGG_Y - 128, 52, 15).fill(shade(0x8a5a3b, 0.2))
    for (const by of [-98, -56, -20]) g.rect(tx - 52, VAGG_Y + by, 104, 8).fill({ color: 0x5f3d26, alpha: 0.7 })
    // Bokstapel.
    const bx = 430 + j(40)
    for (let i = 0; i < 4; i++) {
      const w = 96 - Math.abs(i - 1) * 10
      g.roundRect(bx - w / 2 + j(6), VAGG_Y - 22 - i * 20, w, 18, 4).fill([0xb0533f, 0x3f6a8a, 0x6a8a3f, 0x8a6a3f][i])
    }
    // Kvast lutad mot väggen.
    const kx = 950 + j(20)
    g.moveTo(kx, VAGG_Y - 6).lineTo(kx - 34, 250).stroke({ width: 10, color: 0x9a6743 })
    g.moveTo(kx - 4, VAGG_Y - 4).lineTo(kx + 26, VAGG_Y + 4).lineTo(kx + 12, VAGG_Y - 54).closePath().fill(0xd9b06a)
    // Hoprullad matta.
    const mx = 560 + j(50)
    g.roundRect(mx - 90, VAGG_Y + 40, 180, 34, 17).fill(topLightFill(0xb0533f))
    g.circle(mx - 90, VAGG_Y + 57, 17).fill(0x8a3f30)
    // Tavla på väggen.
    const px = 300 + j(40)
    g.roundRect(px - 46, 210, 92, 74, 6).fill(0x6b4d38).stroke({ width: 6, color: 0xd9a021, alpha: 0.6 })
    g.roundRect(px - 34, 222, 68, 50, 4).fill(0x4f6d8a)

    g.eventMode = 'none'
    b.addChild(g)
  },

  // ---------------------------------------------------------------- rundan

  _nyRunda(ctx, tala = true) {
    if (!this._alive) return
    this._ctxRef = ctx
    this._klart = false
    this._funna = 0
    this._idle = 0
    this._idleSteg = 0
    this._sisteFlimmer = 0
    this._forstaFyndet = false

    const niva = NIVAER[this._niva]
    this._radie = niva.radie
    // TAK PÅ MOTGÅNGEN (P0): som mest ETT flimmer per föremål, och aldrig innan det
    // första fyndet. Med 4 saker kan alltså högst 3 flimmer inträffa på en hel runda.
    this._flimmerKvar = niva.flimmer ? Math.max(0, niva.saker - 1) : 0

    // Riv förra rundans saker.
    this._rivSaker()
    this._byggBrate()

    // Nya saker på nya platser.
    const nycklar = shuffle([...SKATTER]).slice(0, niva.saker)
    const platser = valjPlatser(niva.saker)
    this._mal = []
    nycklar.forEach((key, i) => {
      const p = platser[i]
      this._mal.push(this._byggSak(ctx, key, p.x, p.y))
    })

    // Sällsynt: en sovande katt som ligger ovanpå en av sakerna och först måste
    // spinna färdigt. Motgång med rolig ton, aldrig ett stopp.
    this._katt = null
    if (Math.random() < 0.45) {
      const offer = randomFrom(this._mal)
      offer._blockad = true
      this._byggKatt(offer)
    }

    this._byggHylla()

    // Ljuset börjar vid fönstret, utanför sak-rutnätet — se init().
    this._tx = 1060
    this._ty = 170
    this._lx = 1060
    this._ly = 170
    this._flimmer.f = 1
    this._ritadX = -9999
    this._ritadY = -9999
    this._ritadR = -1
    gsap.killTweensOf(this._flimmer)
    gsap.killTweensOf(this._morker)
    gsap.killTweensOf(this._straleG)
    this._morker.position.set(0, 0)
    this._morker.alpha = 1
    this._straleG.alpha = 1
    if (this._lock) {
      gsap.killTweensOf(this._lock)
      this._lock.rotation = 0
    }
    this._bobo?.setMood('nyfiken')

    // Rita mörkret direkt (annars står rummet obelyst och lampan i origo en bildruta).
    this._placeraLjus(this._radie)
    this._ritaMorker(this._radie)

    if (tala) ctx.services.voice.say('Lys runt i rummet. Vad hittar du?')
  },

  // Riv rundan. TWEENSEN DÖDAS FÖRE noderna rivs: en `gsap.to(bock, { alpha })` med
  // fördröjning skulle annars skriva på en förstörd Graphics efter att en ny runda byggts.
  _rivSaker() {
    this._dodaRundansTweens()
    for (const barn of this._saker.removeChildren()) barn.destroy({ children: true })
    for (const barn of this._flyg.removeChildren()) barn.destroy({ children: true })
    for (const barn of this._glimtar.removeChildren()) barn.destroy({ children: true })
    this._mal = []
    this._katt = null
  },

  _dodaRundansTweens() {
    for (const t of this._tw) t?.kill?.()
    this._tw = []
    for (const s of this._mal || []) {
      if (!s || s.destroyed) continue
      gsap.killTweensOf(s)
      gsap.killTweensOf(s.scale)
      if (s._bild && !s._bild.destroyed) {
        s._bild._fxLiv?.kill()
        gsap.killTweensOf(s._bild)
        gsap.killTweensOf(s._bild.scale)
      }
      if (s._glimt && !s._glimt.destroyed) gsap.killTweensOf(s._glimt)
    }
    const k = this._katt
    if (k && !k.destroyed) {
      gsap.killTweensOf(k)
      k._bild?._fxLiv?.kill()
      if (k._bild && !k._bild.destroyed) gsap.killTweensOf(k._bild.scale)
    }
    for (const r of this._rutor || []) {
      if (!r?.nod || r.nod.destroyed) continue
      gsap.killTweensOf(r.nod)
      gsap.killTweensOf(r.nod.scale)
      gsap.killTweensOf(r.ikon)
      gsap.killTweensOf(r.bock)
    }
  },

  // En gömd sak: ritat föremål (artikoner) med skugga och egen vilo-guppning. Bilden
  // guppar i ett BARN — träffytan sitter på behållaren och står därmed alltid still.
  _byggSak(ctx, key, x, y) {
    const s = new Container()
    s.position.set(x, y)
    s._nyckel = key
    s._sedd = false
    s._tagen = false
    s._blockad = false

    const skugga = new Graphics().ellipse(0, 46, 40, 12).fill({ color: 0x000000, alpha: 0.32 })
    skugga.eventMode = 'none'
    const bild = new Container()
    const konst = drawIcon(key, 92)
    konst.eventMode = 'none'
    bild.addChild(konst)
    liv(bild, { bob: 4, sway: 0.025, duration: 2.4 + Math.random() * 1.2 })
    s._bild = bild
    s.addChild(skugga, bild)

    // Träffyta 132×148 px ≫ 96 px, med osynlig halo runt konsten (P0).
    s.hitArea = new Rectangle(-66, -74, 132, 148)
    s.eventMode = 'none' // tänds först när saken setts
    s.cursor = 'pointer'
    s.on('pointertap', () => this._ta(ctx, s))
    this._saker.addChild(s)

    // Minnesglimten (ovanför mörkret) — en svag varm fläck där saken ligger.
    // Geometrin är BAKAD på plats och noden står i origo: en bar Graphics ritad i origo
    // som får en stor `.position` är husets kända renderingsfälla (CLAUDE.md/snobollen).
    const glimt = new Graphics()
    glimt.circle(x, y, 42).fill({ color: 0xffd98a, alpha: 0.5 })
    glimt.circle(x, y, 22).fill({ color: 0xfff3c4, alpha: 0.5 })
    glimt.alpha = 0
    glimt.eventMode = 'none'
    this._glimtar.addChild(glimt)
    s._glimt = glimt
    return s
  },

  // Den sovande katten: ritad, hoprullad, med svans och stängda ögon.
  _byggKatt(sak) {
    const k = new Container()
    k.position.set(sak.x + 4, sak.y + 10)
    const g = new Graphics()
    g.ellipse(0, 34, 68, 14).fill({ color: 0x000000, alpha: 0.3 })
    g.moveTo(48, 24).quadraticCurveTo(96, 20, 78, -18).stroke({ width: 15, color: 0x9aa4b0, cap: 'round' })
    g.ellipse(0, 6, 66, 34).fill(sphereFill(0xb6c0cc))
    for (const sx of [-30, -6, 18]) g.moveTo(sx, -18).quadraticCurveTo(sx + 8, 0, sx, 18).stroke({ width: 5, color: 0x8d99a6, alpha: 0.7 })
    g.circle(-46, -12, 28).fill(sphereFill(0xc3ccd4))
    g.moveTo(-66, -30).lineTo(-58, -52).lineTo(-44, -34).closePath().fill(0xb6c0cc)
    g.moveTo(-38, -36).lineTo(-26, -52).lineTo(-24, -30).closePath().fill(0xb6c0cc)
    g.moveTo(-58, -10).quadraticCurveTo(-52, -4, -46, -10).moveTo(-40, -10).quadraticCurveTo(-34, -4, -28, -10)
    g.stroke({ width: 3, color: 0x4a3526 })
    g.circle(-44, -2, 5).fill(0xff9ec4)
    g.eventMode = 'none'
    const bild = new Container()
    bild.addChild(g)
    liv(bild, { bob: 3, sway: 0.012, duration: 3.2 })
    k.addChild(bild)
    k.eventMode = 'none'
    k._bild = bild
    k._sak = sak
    k._vaknat = false
    k._lyst = 0
    this._saker.addChild(k)
    this._katt = k
  },

  // Checklistan: en HYLLA längst ner (UI — får bära små ritade ikoner enligt P0, det är
  // panelen som är förbjuden för spelobjekt, inte för gränssnitt).
  _byggHylla() {
    const h = this._hylla
    for (const barn of h.removeChildren()) barn.destroy({ children: true })

    const plank = new Graphics()
    plank.rect(-BLEED_X, HYLLA_Y, W + BLEED_X * 2, H + BLEED_Y - HYLLA_Y).fill(verticalFill(0x8a5a3b, 0x5f3d26))
    plank.rect(-BLEED_X, HYLLA_Y, W + BLEED_X * 2, 9).fill({ color: 0xd9a021, alpha: 0.6 })
    plank.eventMode = 'none'
    h.addChild(plank)

    const n = this._mal.length
    const steg = 132
    const start = 640 - ((n - 1) * steg) / 2
    this._rutor = this._mal.map((sak, i) => {
      const c = new Container()
      c.position.set(start + i * steg, HYLLA_Y + 42)
      const ikon = drawIcon(sak._nyckel, 62)
      ikon.eventMode = 'none'
      ikon.alpha = 0.4
      // Bocken ritas på plats (geometri bakad, nod i origo) — samma renderingsfälla.
      const bock = new Graphics()
      bock.moveTo(18, 22).lineTo(27, 32).lineTo(45, 8).stroke({ width: 8, color: COLORS.green, cap: 'round' })
      bock.alpha = 0
      bock.eventMode = 'none'
      c.addChild(ikon, bock)
      c.eventMode = 'none'
      h.addChild(c)
      return { nod: c, ikon, bock }
    })
  },

  // ---------------------------------------------------------------- input

  // Ett tryck FLYTTAR ljuset dit (tap fungerar precis som drag — P0 GESTER) och startar
  // samtidigt draget. Bara en pekare åt gången: den andra ignoreras helt (inget
  // multitouch), men får ändå sitt kvitto så ingen pekning är tyst.
  _nedslag(ctx, e, offX = 0, offY = 0) {
    if (!this._alive || !ctx) return
    const p = this._rot.toLocal(e.global)
    if (this._pekId !== null && this._pekId !== e.pointerId) {
      kvittera(this._fx, p.x, p.y, ctx.services.audio)
      return
    }
    this._pekId = e.pointerId
    this._drar = true
    this._greppX = offX
    this._greppY = offY
    this._idle = 0
    this._idleSteg = 0
    if (this._klart) {
      // Finalen rullar — kvittera pekningen i stället för att tiga (P0 ÅTERKOPPLING).
      kvittera(this._fx, p.x, p.y, ctx.services.audio)
      return
    }
    this._sikta(p.x + offX, p.y + offY)
    ctx.services.audio.tone({ freq: 430, dur: 0.05, type: 'sine', vol: 0.07 })
    ripple(this._fx, p.x, p.y, { color: 0xffe7ad, maxR: 54, width: 3, alpha: 0.28, duration: 0.4 })
  },

  _flytta(e) {
    if (!this._alive || !this._drar || this._klart) return
    if (this._pekId !== null && this._pekId !== e.pointerId) return
    const p = this._rot.toLocal(e.global)
    this._sikta(p.x + (this._greppX || 0), p.y + (this._greppY || 0))
    this._idle = 0
  },

  _slapp(e) {
    if (this._pekId !== null && e && this._pekId !== e.pointerId) return
    this._drar = false
    this._pekId = null
    this._greppX = 0
    this._greppY = 0
  },

  _sikta(x, y) {
    this._tx = Math.max(LJUS_MIN_X, Math.min(LJUS_MAX_X, x))
    this._ty = Math.max(LJUS_MIN_Y, Math.min(LJUS_MAX_Y, y))
  },

  // ---------------------------------------------------------------- bildruta

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(0.05, ticker.deltaMS / 1000)
    const k = Math.min(1, dt * 13)

    // Ljuset glider efter fingret — ett tryck blir en mjuk förflyttning, inte ett hopp.
    this._lx += (this._tx - this._lx) * k
    this._ly += (this._ty - this._ly) * k
    const R = this._radie * this._flimmer.f

    // Själva LJUSET följer fingret varje bildruta (spriten + lampan + käglan) — det får
    // aldrig hacka. Bara den heltäckande ramen (fyra rektanglar i den redan helmörka
    // zonen) väntar på tröskeln, och reservlägets rutnät likaså.
    this._placeraLjus(R)
    if (
      Math.abs(this._lx - this._ritadX) > OMRITNING_PX ||
      Math.abs(this._ly - this._ritadY) > OMRITNING_PX ||
      Math.abs(R - this._ritadR) > OMRITNING_R
    ) {
      this._ritaMorker(R)
    }

    if (this._klart) return

    // Vad ligger i ljuset?
    for (const sak of this._mal) {
      if (sak._tagen) continue
      // 0,6·R, inte kanten. Räknat på ljustexturens kurva (helt klar inom 0,40·R,
      // smoothstep upp till full mörk vid 0,88·R): vid 0,82·R är alfan 0,84 och saken hade
      // "hittats" innan barnet kunde se den. Vid 0,6·R är alfan 0,35 — tydligt upplyst.
      const d = Math.hypot(sak.x - this._lx, sak.y - this._ly)
      const lyst = d < R * 0.6 && !sak._blockad
      if (lyst && !sak._sedd) this._upptack(ctx, sak)
      const vill = sak._sedd ? 'static' : 'none'
      if (sak.eventMode !== vill) sak.eventMode = vill
      if (sak._glimt && !sak._glimt.destroyed) {
        const mal = sak._sedd && !lyst ? 0.34 + Math.sin(performance.now() / 420) * 0.1 : 0
        sak._glimt.alpha += (mal - sak._glimt.alpha) * k
      }
    }

    // Katten: lys på den en stund så vaknar den, sträcker på sig och går undan.
    const katt = this._katt
    if (katt && !katt.destroyed && !katt._vaknat) {
      const d = Math.hypot(katt.x - this._lx, katt.y - this._ly)
      katt._lyst = d < R * 0.65 ? katt._lyst + dt : 0
      if (katt._lyst > 0.45) this._vackKatt(ctx, katt)
    }

    // Bobo tittar dit barnet lyser.
    this._bobo?.look(this._lx, this._ly)

    // Idle: mjuk om-cue, andra gången en ring där något gömmer sig. Aldrig en tillsägelse.
    this._idle += dt
    if (this._idle > 7) {
      this._idle = 0
      this._idleSteg++
      if (this._idleSteg >= 2) {
        this._idleSteg = 0
        this._tips(ctx)
      } else {
        ctx.services.voice.say('Lys i mörkret, sakerna gömmer sig.')
      }
    }
  },

  // Ljuset i sig: spriten (hålet), ramen som möter den, ficklampan och den varma disen.
  // Körs VARJE bildruta — ljuset får aldrig hacka, och ramen får aldrig släpa efter
  // spriten (det öppnar en ljus skarv i kanten).
  _placeraLjus(R) {
    if (this._hal && !this._hal.destroyed) {
      this._hal.position.set(this._lx, this._ly)
      this._hal.width = R * 2
      this._hal.height = R * 2
      this._ritaRam(R)
    }
    if (this._lampa && !this._lampa.destroyed) {
      this._lampa.position.set(this._lx + LAMPA_DX, this._ly + LAMPA_DY)
    }
    this._ritaStrale(R)
  },

  // Med textur ritas ramen redan varje bildruta i `_placeraLjus`; det som är kvar här är
  // reservlägets rutnät, som är dyrt nog att behöva sin tröskel.
  _ritaMorker(R) {
    this._ritadX = this._lx
    this._ritadY = this._ly
    this._ritadR = R
    if (!this._hal) this._ritaRutnat(R)
  },

  _ritaRam(R) {
    const g = this._ramG
    if (!g || g.destroyed) return
    g.clear()
    const x0 = -BLEED_X
    const y0 = -BLEED_Y
    const x1 = W + BLEED_X
    const y1 = H + BLEED_Y
    const ins = RAM_INS
    const sx0 = Math.max(x0, this._lx - R + ins)
    const sx1 = Math.min(x1, this._lx + R - ins)
    const sy0 = Math.max(y0, this._ly - R + ins)
    const sy1 = Math.min(y1, this._ly + R - ins)
    const helt = { color: MORK, alpha: MORK_MAX }
    if (sy0 > y0) g.rect(x0, y0, x1 - x0, sy0 - y0).fill(helt)
    if (sy1 < y1) g.rect(x0, sy1, x1 - x0, y1 - sy1).fill(helt)
    if (sx0 > x0) g.rect(x0, sy0, sx0 - x0, sy1 - sy0).fill(helt)
    if (sx1 < x1) g.rect(sx1, sy0, x1 - sx1, sy1 - sy0).fill(helt)
  },

  // RESERVLÄGE: samma mörker byggt av ett rutnät (alfa per ruta). Används bara om
  // Canvas2D-texturen inte gick att baka — då är kanten kantig, men spelet går att spela.
  _ritaRutnat(R) {
    const g = this._morkerG
    if (!g || g.destroyed) return
    g.clear()

    const x0 = -BLEED_X
    const y0 = -BLEED_Y
    const x1 = W + BLEED_X
    const y1 = H + BLEED_Y
    const kolumner = Math.ceil((x1 - x0) / CELL_W)
    const rader = Math.ceil((y1 - y0) / CELL_H)

    const c0 = Math.max(0, Math.floor((this._lx - R - x0) / CELL_W))
    const c1 = Math.min(kolumner, Math.ceil((this._lx + R - x0) / CELL_W))
    const r0 = Math.max(0, Math.floor((this._ly - R - y0) / CELL_H))
    const r1 = Math.min(rader, Math.ceil((this._ly + R - y0) / CELL_H))

    const fx0 = x0 + c0 * CELL_W
    const fx1 = x0 + c1 * CELL_W
    const fy0 = y0 + r0 * CELL_H
    const fy1 = y0 + r1 * CELL_H
    const helt = { color: MORK, alpha: MORK_MAX }

    // Fyra heltäckande rektanglar runt ljusfönstret (allt där ute är ändå lika mörkt).
    if (fy0 > y0) g.rect(x0, y0, x1 - x0, fy0 - y0).fill(helt)
    if (fy1 < y1) g.rect(x0, fy1, x1 - x0, y1 - fy1).fill(helt)
    if (fx0 > x0) g.rect(x0, fy0, fx0 - x0, fy1 - fy0).fill(helt)
    if (fx1 < x1) g.rect(fx1, fy0, x1 - fx1, fy1 - fy0).fill(helt)

    // Cellerna i fönstret. +0.7 px överlapp så inga hårstrecksfogar syns mellan rutorna.
    const inner = R * KARNA
    const band = Math.max(1, R - inner)
    for (let r = r0; r < r1; r++) {
      const cy = y0 + r * CELL_H + CELL_H / 2
      const dy = cy - this._ly
      for (let c = c0; c < c1; c++) {
        const cx = x0 + c * CELL_W + CELL_W / 2
        const dx = cx - this._lx
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d <= inner) continue // helt upplyst — rita ingenting alls
        let t = (d - inner) / band
        if (t > 1) t = 1
        const a = t * t * (3 - 2 * t) * MORK_MAX // smoothstep: mjuk kant, ingen hård ring
        if (a < 0.02) continue
        g.rect(x0 + c * CELL_W, y0 + r * CELL_H, CELL_W + 0.7, CELL_H + 0.7).fill({ color: MORK, alpha: a })
      }
    }
  },

  // Den varma disen: en kägla från linsen ut till ljuspölens kanter (hela triangeln ligger
  // INNANFÖR pölen, så den läser som en stråle och inte som en fläck i mörkret).
  //
  // Här satt tidigare även en `circle(lx, ly, R*0.86)` med alfa 0,07. Den mätte 111 → 150 i
  // luminans på EN pixel i skärmdumpen: en hårdkantad slöja-skiva som låg över både ljus och
  // mörker. Glöden bor numera i ljustexturen själv — ljus ska tona ut, inte sluta.
  _ritaStrale(R) {
    const g = this._straleG
    if (!g || g.destroyed) return
    g.clear()
    const dirx = -Math.cos(LAMPA_ROT)
    const diry = -Math.sin(LAMPA_ROT)
    const lx = this._lx + LAMPA_DX + dirx * 52
    const ly = this._ly + LAMPA_DY + diry * 52
    const px = -diry
    const py = dirx
    g.moveTo(lx, ly)
      .lineTo(this._lx + px * R * 0.86, this._ly + py * R * 0.86)
      .lineTo(this._lx - px * R * 0.86, this._ly - py * R * 0.86)
      .closePath()
      .fill({ color: 0xffe0a0, alpha: 0.06 })
    g.circle(lx, ly, 16).fill({ color: 0xfff6d0, alpha: 0.3 })
  },

  // ---------------------------------------------------------------- fynd

  _upptack(ctx, sak) {
    if (!this._alive) return
    sak._sedd = true
    const a = ctx.services.audio
    a.tone({ freq: 1046.5, dur: 0.1, type: 'sine', vol: 0.13, slideTo: 1568 })
    a.tone({ freq: 1568, dur: 0.12, type: 'triangle', vol: 0.08, delay: 0.07 })
    sparkle(this._fx, sak.x, sak.y, { count: 8 })
    pop(sak._bild, { scale: 1.24 })
    this._bobo?.react('nyfiken')
    if (!this._forstaFyndet) {
      this._forstaFyndet = true
      ctx.services.voice.say('Där är något! Tryck på den.')
    } else if (Math.random() < 0.4) {
      ctx.services.voice.say('Lägg den i skattkistan!')
    }
  },

  // Tryck på en sedd sak: den flyger i en båge till kistan.
  _ta(ctx, sak) {
    if (!this._alive || this._klart || sak._tagen || !sak._sedd) return
    sak._tagen = true
    sak.eventMode = 'none'
    this._idle = 0
    if (sak._glimt && !sak._glimt.destroyed) gsap.to(sak._glimt, { alpha: 0, duration: 0.2 })

    const a = ctx.services.audio
    const ton = STEGE[this._funna % STEGE.length]
    a.tone({ freq: ton, dur: 0.16, type: 'triangle', vol: 0.2 })
    a.tone({ freq: ton * 1.5, dur: 0.22, type: 'sine', vol: 0.11, delay: 0.08 })
    puff(this._fx, sak.x, sak.y, { count: 7, color: 0xffe14a })

    // Lyft saken till flyglagret så den syns OVANPÅ mörkret hela vägen.
    sak._bild?._fxLiv?.kill()
    this._flyg.addChild(sak)

    const sx = sak.x
    const sy = sak.y
    const mx = (sx + KISTA.x) / 2
    const my = Math.min(sy, KISTA.y) - 170
    const st = { p: 0 }
    const tw = gsap.to(st, {
      p: 1,
      duration: 0.66,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (sak.destroyed) {
          tw.kill()
          return
        }
        const p = st.p
        const q = 1 - p
        sak.x = q * q * sx + 2 * q * p * mx + p * p * KISTA.x
        sak.y = q * q * sy + 2 * q * p * my + p * p * (KISTA.y - 10)
        sak.rotation = p * 1.1
        const s = 1 - 0.66 * p
        sak.scale.set(s)
      },
      onComplete: () => {
        if (!this._alive) return
        if (!sak.destroyed) sak.visible = false
        this._landaIKistan(ctx)
      },
    })
    this._tw.push(tw)

    // Checklistan bockas av direkt — barnet ska se sambandet med en gång.
    const index = this._mal.indexOf(sak)
    const ruta = this._rutor?.[index]
    if (ruta && !ruta.nod.destroyed) {
      gsap.to(ruta.ikon, { alpha: 1, duration: 0.2 })
      gsap.to(ruta.bock, { alpha: 1, duration: 0.25, delay: 0.5 })
      this._tw.push(pop(ruta.nod, { scale: 1.22 }))
    }
  },

  // Saken landar: locket gapar, guld gnistrar, Bobo jublar.
  _landaIKistan(ctx) {
    if (!this._alive) return
    this._funna++
    const a = ctx.services.audio
    a.tone({ freq: 210, dur: 0.09, type: 'sine', vol: 0.16, slideTo: 130 }) // klonk
    sparkle(this._fx, KISTA.x, KISTA.y - 30, { count: 10 })
    this._oppnaLock(-0.5, 0.42)
    this._bobo?.react('jubel')
    if (Math.random() < 0.55) ctx.services.voice.say(randomFrom(PRAISE))

    if (this._funna >= this._mal.length) {
      ctx.later(0.5, () => this._final(ctx))
    } else {
      this._kanskeFlimmer(ctx)
    }
  },

  _oppnaLock(vinkel, tid) {
    const l = this._lock
    if (!l || l.destroyed) return
    gsap.killTweensOf(l)
    const tl = gsap
      .timeline()
      .to(l, { rotation: vinkel, duration: 0.14, ease: 'power2.out' })
      .to(l, { rotation: 0, duration: tid, ease: 'bounce.out' })
    this._tw.push(tl)
  },

  // MOTGÅNG med tak: lampan flimrar till ~0,9 s. Rolig ton, tydlig orsak, går över av
  // sig själv, och kan aldrig inträffa fler gånger än (antal saker − 1) per runda eller
  // oftare än var 5:e sekund.
  _kanskeFlimmer(ctx) {
    if (!this._alive || this._flimmerKvar <= 0) return
    const nu = performance.now()
    if (nu - this._sisteFlimmer < 5000) return
    if (Math.random() > 0.5) return
    this._flimmerKvar--
    this._sisteFlimmer = nu

    const a = ctx.services.audio
    a.tone({ freq: 300, dur: 0.07, type: 'square', vol: 0.1, slideTo: 190 })
    a.tone({ freq: 240, dur: 0.07, type: 'square', vol: 0.09, delay: 0.22, slideTo: 160 })
    wiggle(this._lampa)
    gsap.killTweensOf(this._flimmer)
    const tl = gsap
      .timeline()
      .to(this._flimmer, { f: 0.42, duration: 0.12, ease: 'power2.in' })
      .to(this._flimmer, { f: 0.86, duration: 0.14 })
      .to(this._flimmer, { f: 0.36, duration: 0.12 })
      .to(this._flimmer, { f: 1, duration: 0.5, ease: 'power2.out' })
    this._tw.push(tl)
    if (Math.random() < 0.6) ctx.services.voice.say('Oj, lampan blinkar!')
  },

  // Katten vaknar: spinner, sträcker på sig, går undan och lämnar saken bar.
  _vackKatt(ctx, katt) {
    if (!this._alive || katt._vaknat) return
    katt._vaknat = true
    const a = ctx.services.audio
    ctx.services.voice.say('En katt som sover! Titta vad den gömmer.')
    // Riktigt kattklipp om det finns; annars spinnandet som två låga svävande toner.
    if (!a.sample('djur_katt')) {
      a.tone({ freq: 108, dur: 0.5, type: 'sawtooth', vol: 0.1, slideTo: 96 })
      a.tone({ freq: 112, dur: 0.5, type: 'sine', vol: 0.07, delay: 0.08, slideTo: 100 })
    }
    katt._bild?._fxLiv?.kill()
    squash(katt._bild, { intensity: 1.2 })
    const tl = gsap.timeline({
      onComplete: () => {
        if (!this._alive) return
        if (katt._sak) katt._sak._blockad = false
        puff(this._fx, katt._sak?.x ?? katt.x, katt._sak?.y ?? katt.y, { count: 8, color: 0xd8d0c4 })
      },
    })
    tl.to(katt, { x: katt.x + 156, duration: 1.1, ease: 'power1.inOut', delay: 0.35 })
    tl.to(katt, { y: katt.y - 8, duration: 0.18, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.35)
    this._tw.push(tl)
  },

  // Idle-tips: en ring där en osedd sak ligger. Ovanpå mörkret, så den syns.
  // Aldrig ett "fel" — bara en snäll knuff.
  _tips(ctx) {
    if (!this._alive || this._klart) return
    const kvar = this._mal.filter((s) => !s._tagen && !s._sedd)
    const sak = kvar.length ? randomFrom(kvar) : this._mal.find((s) => !s._tagen)
    if (!sak) return
    ctx.services.voice.say('Titta, något glimmar där!')
    ctx.services.audio.tone({ freq: 880, dur: 0.12, type: 'sine', vol: 0.1, slideTo: 1320 })
    ripple(this._fx, sak.x, sak.y, { color: 0xffe7ad, maxR: 120, width: 6, alpha: 0.5, duration: 0.9 })
    sparkle(this._fx, sak.x, sak.y, { count: 5 })
  },

  // ---------------------------------------------------------------- finalen

  // Kistan öppnas och lyser upp HELA rummet: mörkret lyfts som en gardin (containern
  // glider uppåt och tonar bort samtidigt), guld sprutar och en durtreklang klingar.
  _final(ctx) {
    if (!this._alive || this._klart) return
    this._klart = true
    this._drar = false
    this._pekId = null
    const a = ctx.services.audio
    ctx.services.voice.say('Kistan lyser upp hela rummet!')

    // Locket slås upp och STANNAR öppet (till skillnad från fyndets korta gap).
    // `lucka` är ett riktigt klipp på ett lock som slås upp; utan det ett trä-knarr.
    if (!a.sample('lucka')) a.tone({ freq: 170, dur: 0.28, type: 'sawtooth', vol: 0.12, slideTo: 320 })
    const l = this._lock
    if (l && !l.destroyed) {
      gsap.killTweensOf(l)
      this._tw.push(gsap.to(l, { rotation: -1.25, duration: 0.45, ease: 'back.out(1.6)' }))
    }

    // Durtreklang uppåt (C–E–G–C) — spelets egen fanfar, inte ett UI-klick.
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      a.tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.16, delay: i * 0.11 })
    })

    // Guldet ur kistan.
    burst(this._fx, KISTA.x, KISTA.y - 40, { count: 18, colors: [0xffe14a, 0xf0c33c, 0xfff3c4], power: 1.4 })
    sparkle(this._fx, KISTA.x, KISTA.y - 40, { count: 12 })
    ctx.later(0.3, () => {
      if (!this._alive) return
      burst(this._fx, KISTA.x, KISTA.y - 60, { count: 14, colors: [0xffe14a, 0xfff3c4], power: 1.8 })
    })

    // GARDINEN: mörkret glider upp och tonar bort — rummet står plötsligt i varmt ljus.
    gsap.killTweensOf(this._morker)
    this._tw.push(
      gsap.to(this._morker, {
        y: -(H + BLEED_Y + 60),
        alpha: 0,
        duration: 1.15,
        ease: 'power2.in',
      }),
    )
    // Käglan och glöden blir överflödiga när allt lyser.
    gsap.killTweensOf(this._straleG)
    this._tw.push(gsap.to(this._straleG, { alpha: 0, duration: 0.8 }))
    for (const sak of this._mal) {
      if (sak._glimt && !sak._glimt.destroyed) gsap.to(sak._glimt, { alpha: 0, duration: 0.4 })
    }

    this._bobo?.react('jubel')
    ctx.later(0.9, () => {
      if (!this._alive) return
      this._bobo?.setMood('stolt')
      this._niva = Math.min(NIVAER.length - 1, this._niva + 1)
      ctx.progress.setLevel(this._niva)
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      ctx.progress.complete() // firande + stjärna + klistermärke (delat)
    })
    ctx.later(3.6, () => {
      if (!this._alive) return
      this._straleG.alpha = 1
      this._nyRunda(ctx, true)
    })
  },

  // ---------------------------------------------------------------- städning

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    // Samma städning som mellan två rundor (saker · glimtar · katt · checklista) …
    this._dodaRundansTweens()
    // … plus det som lever hela spelomgången.
    gsap.killTweensOf(this._flimmer)
    gsap.killTweensOf(this._morker)
    gsap.killTweensOf(this._straleG)
    if (this._lock && !this._lock.destroyed) gsap.killTweensOf(this._lock)
    if (this._lampa && !this._lampa.destroyed) gsap.killTweensOf(this._lampa)
    gsap.killTweensOf(this._rot)
    this._bobo?.destroy()
    this._bobo = null
    ctx?.services?.voice?.cancel?.()
    this._rot?.destroy({ children: true })
    this._rot = null
    // Texturerna är spelets EGNA bakningar (inte delade assets) och måste rivas med sina
    // källor, annars ligger dukarna kvar på GPU:n hela appens livstid.
    this._hal = null
    if (this._ljusTex && !this._ljusTex.destroyed) this._ljusTex.destroy(true)
    this._ljusTex = null
    this._mal = null
    this._rutor = null
    this._katt = null
    this._ctxRef = null
  },
}

// LJUSTEXTUREN: mörkret OCH den varma glöden i EN Canvas2D-bakad duk.
//
// Canvas2D kan det Pixis egen radiella `FillGradient` INTE kan: ha genomskinlig mitt
// (`buildRadialGradient` förfyller hela duken med sista färgstoppet). Och till skillnad
// från `renderer.generateTexture()` — som byter rendermål mitt i en bildruta och
// destabiliserar hela testsviten — rör en 2D-duk inte GL-tillståndet. Det är precis den
// väg CLAUDE.md pekar ut. Bakas EN gång per spelomgång, aldrig per runda eller bildruta.
//
// ⚠️ TVÅ SAKER HÄR ÄR MÄTTA, INTE VALDA — båda syntes bara i skärmdumpen:
//
// ⓵ **Hålet punsas med `destination-out`, ovanpå en HELTÄCKANDE mörk fyllning.** Första
//    försöket lät en enda radiell toning gå från genomskinlig mitt till mörk kant och
//    litade på att ytan UTANFÖR toningens yttercirkel (rutans hörn) fick sista stoppets
//    färg. Uppmätt i skärmdumpen: hörnen blev inte lika mörka som ramen bredvid, och
//    kvadraten ritade en synlig ram runt ljuset. Med `fillRect` först är hörnen exakt
//    `MORK_MAX` per konstruktion, och `destination-out` bryr sig inte om hur toningen
//    beter sig utanför cirkeln (alfa 0 där = ingen verkan).
//
// ⓶ **Den varma glöden ligger i SAMMA duk, klippt till en cirkel.** Den var först en egen
//    sprite ovanpå mörkret, och den kvadraten mätte +11 i luminans över hela sin yta
//    (36,27,46 → 47,39,57) med knivskarp kant — en andra synlig ram. En glöd som bor i
//    ljusets egen textur kan inte ha en kant som ljuset inte har.
function bakaLjusTextur() {
  if (typeof document === 'undefined') return null
  let duk
  let c2
  try {
    duk = document.createElement('canvas')
    duk.width = TEX_S
    duk.height = TEX_S
    c2 = duk.getContext('2d')
  } catch {
    return null
  }
  if (!c2) return null
  const m = TEX_S / 2

  // 1. Hela duken full mörk — hörnen inkluderade (se ⓵).
  c2.fillStyle = `rgba(${MORK_RGB}, ${MORK_MAX})`
  c2.fillRect(0, 0, TEX_S, TEX_S)

  // 2. Punsa hålet. Smoothstep i tio stopp: Canvas2D interpolerar linjärt mellan stopp,
  //    och en enda rak ramp läser som en tydlig ring i kanten.
  const hal = c2.createRadialGradient(m, m, 0, m, m, m)
  hal.addColorStop(0, 'rgba(255, 255, 255, 1)')
  hal.addColorStop(KARNA, 'rgba(255, 255, 255, 1)')
  for (let i = 1; i < 10; i++) {
    const p = i / 10
    const a = 1 - p * p * (3 - 2 * p)
    hal.addColorStop(KARNA + (FULL_VID - KARNA) * p, `rgba(255, 255, 255, ${a.toFixed(3)})`)
  }
  hal.addColorStop(FULL_VID, 'rgba(255, 255, 255, 0)')
  hal.addColorStop(1, 'rgba(255, 255, 255, 0)')
  c2.globalCompositeOperation = 'destination-out'
  c2.fillStyle = hal
  c2.fillRect(0, 0, TEX_S, TEX_S)

  // 3. Varm glöd inne i hålet, klippt till cirkeln (se ⓶).
  c2.globalCompositeOperation = 'source-over'
  c2.save()
  c2.beginPath()
  c2.arc(m, m, m - 1, 0, Math.PI * 2)
  c2.clip()
  const varm = c2.createRadialGradient(m, m, 0, m, m, m)
  varm.addColorStop(0, 'rgba(255, 226, 160, 0.13)')
  varm.addColorStop(0.45, 'rgba(255, 222, 150, 0.085)')
  varm.addColorStop(0.72, 'rgba(255, 216, 140, 0.03)')
  varm.addColorStop(1, 'rgba(255, 216, 140, 0)')
  c2.fillStyle = varm
  c2.fillRect(0, 0, TEX_S, TEX_S)
  c2.restore()

  try {
    return Texture.from(duk)
  } catch {
    return null
  }
}

// Blanda kandidatpunkterna och plocka de N första som ligger minst MIN_AVSTAND från
// varandra — så två träffytor (132 px) aldrig hamnar närmare än 24 px från varandra (P0).
function valjPlatser(n) {
  const alla = []
  for (const x of SPOT_X) for (const y of SPOT_Y) alla.push({ x, y })
  const blandad = shuffle(alla)
  const valda = []
  for (const p of blandad) {
    if (valda.length >= n) break
    const jx = p.x + (Math.random() * 2 - 1) * 22
    const jy = p.y + (Math.random() * 2 - 1) * 18
    if (valda.every((v) => Math.hypot(v.x - jx, v.y - jy) >= MIN_AVSTAND)) valda.push({ x: jx, y: jy })
  }
  // Nödutgångar om slumpen gav för få platser. Den sista tar bort avståndskravet helt:
  // en runda med FÄRRE saker än checklistan visar vore ett omöjligt mål, och det är
  // värre än två saker som ligger nära varandra.
  for (const p of blandad) {
    if (valda.length >= n) break
    if (valda.every((v) => Math.hypot(v.x - p.x, v.y - p.y) >= MIN_AVSTAND * 0.8)) valda.push({ x: p.x, y: p.y })
  }
  for (const p of blandad) {
    if (valda.length >= n) break
    if (!valda.some((v) => v.x === p.x && v.y === p.y)) valda.push({ x: p.x, y: p.y })
  }
  return valda
}
