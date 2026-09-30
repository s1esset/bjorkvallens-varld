// Färgregn — färginlärning (2–5 år). Regnmoln driver över en kuperad äng med ett hus,
// träd och en regnbåge som växer ju fler färger barnet bemästrat. Dropparna faller UR
// molnen; rösten ber barnet trycka på en viss färg. Varje pekning ger ringle + plask +
// ljud (<100ms). Rätt färg poppar med pling och flyger som en liten komet till Bobo, som
// står i markremsan med ett paraply (eller en hink) i målfärgen och fångar den — målet
// syns alltså i händerna på en MOTTAGARE, inte i en ruta. Fel färg vinglar bara glatt
// vidare (ALDRIG en bestraffning). Ibland faller en regnbågsdroppe, en tvilling, en stor
// skvättdroppe eller en långsam glittrande. Inga felsteg, ingen timer, inget slut — när
// målet nås firar vi (complete) och en ny, lite svårare runda startar (oändlig lek).
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, sparkle, bounceIn, puff, ripple, burst, shake, squash, liv, floatText } from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { bage } from '../../lib/form.js'
import { COLORS, PRAISE, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// Färgpalett: ASCII-nyckel + 0xRRGGBB + svensk plural-fras (böjd) + grundord (för
// ord-rundan). intro/done skrivs som FULLA LITERALER — de byggdes tidigare med
// strängkonkatenering ('Tryck på de ' + plural + ' dropparna!'), och då kan varken
// klipp-manifestet (slår upp på exakt text) eller check.mjs hitta dem. Klippen fanns
// hela tiden; det var källkoden som gjorde dem onåbara.
const COLOR_DEFS = [
  { key: 'rod', color: 0xff6b6b, plural: 'röda', word: 'röd', intro: 'Tryck på de röda dropparna!', done: 'Du hittade alla röda!' },
  { key: 'gul', color: 0xffd35c, plural: 'gula', word: 'gul', intro: 'Tryck på de gula dropparna!', done: 'Du hittade alla gula!' },
  { key: 'bla', color: 0x4aa3df, plural: 'blåa', word: 'blå', intro: 'Tryck på de blåa dropparna!', done: 'Du hittade alla blåa!' },
  { key: 'gron', color: 0x5bbf6a, plural: 'gröna', word: 'grön', intro: 'Tryck på de gröna dropparna!', done: 'Du hittade alla gröna!' },
  { key: 'lila', color: 0xa78bfa, plural: 'lila', word: 'lila', intro: 'Tryck på de lila dropparna!', done: 'Du hittade alla lila!' },
  { key: 'rosa', color: 0xff9ec4, plural: 'rosa', word: 'rosa', intro: 'Tryck på de rosa dropparna!', done: 'Du hittade alla rosa!' },
]

// Regnbågens band, ytterst → innerst. Bara de bemästrade färgerna ritas (inga tomma platser).
const BAND_ORDER = ['rod', 'gul', 'gron', 'bla', 'lila', 'rosa']
const BOW = { cx: 640, cy: 640, rOut: 400, w: 24 }

// Färgblandning i pölarna: två OLIKA grundfärger som landar i samma pöl blir en
// tredje och rösten säger vilken. Nyckeln är de två färgnycklarna i bokstavsordning
// så ordningen dropparna landar i inte spelar roll. Fraserna är fulla literaler.
const mixKey = (a, b) => [a, b].sort().join('+')
const MIXES = {
  'bla+gul': { key: 'gron', color: 0x5bbf6a, phrase: 'Gul och blå blir grön!' },
  'bla+rod': { key: 'lila', color: 0xa78bfa, phrase: 'Röd och blå blir lila!' },
  'gul+rod': { key: 'orange', color: 0xff9d3d, phrase: 'Röd och gul blir orange!' },
}

// Stigande kombo-ton: klar dur-pentatonisk stege (flera rätt i snabb följd klättrar).
const COMBO_LADDER = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1174.66, 1318.51]
const RAINBOW = [0xff6b6b, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa, 0xff9ec4]

// Regnmolnen längst upp: dropparna föds under dem och faller ut. Fyra moln med glipor
// emellan täcker x ≈ 180–930; Bobo och ordskylten står till höger om regnet.
const CLOUD_DEFS = [
  { x: 230, y: 85, s: 0.88 },
  { x: 465, y: 77, s: 0.95 },
  { x: 680, y: 87, s: 0.85 },
  { x: 880, y: 79, s: 0.92 },
]
const SPAWN_Y = 92 // mitt under molnet — molnlagret ligger OVANPÅ dropparna och döljer födelsen
const DROP_R = 42
const BOTTOM_Y = 648 // droppen "landar" i pölremsan här
const PUDDLE_Y = 672 // pölarnas mittlinje (i markremsan)

// Mottagaren Bobo i markremsan, till höger om regnet.
const MOTT_X = 1140
const MOTT_Y = 590
const MOTT_R = 40
const PAW_X = MOTT_R * 1.04 // tassens läge i Karaktar-riggen (vilopose)
const PAW_Y = MOTT_R * 0.24
const NEUTRAL = 0xdde3ea // paraplyet i en ord-runda innan färgen avslöjats

// Mörkare nyans av en 0xRRGGBB-färg (till kontur/skuggning).
function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

function lighten(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const l = (v) => Math.min(255, Math.round(v + (255 - v) * amt))
  return (l(r) << 16) | (l(g) << 8) | l(b)
}

// Fyruddig glitterstjärna (vit) — skrivs som ett polygon, ingen båge.
function star(g, x, y, r) {
  g.poly([
    x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28,
    x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28,
  ]).fill({ color: 0xffffff })
}

export default {
  id: 'fargregn',
  titleSv: 'Färgregn',
  icon: '🌈',
  category: 'larande',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'fargregn',
  voiceIntro: 'Tryck på de röda dropparna!',

  init(ctx) {
    this._alive = true
    this._drops = []
    this._livs = [] // noder som fått feedback.liv (vilo-gupp) — deras tweens dödas i destroy
    this._tws = new Set() // fristående tweens (flygande droppar, regnbågen)
    this._idle = 0
    this._spawnAcc = 0
    this._paused = true
    this._t = 0
    this._lastTargetKey = null
    this._lastCloud = -1
    this._combo = 0
    this._lastCorrectAt = -999
    this._lastPlop = -999
    const prog = ctx.progress.get()
    this._rounds = prog.highestLevel || prog.custom?.rundor || 0
    // Bemästrade färger (växer regnbågen på himlen) — persistas via progress.
    this._mastered = new Set(Array.isArray(prog.custom?.mastered) ? prog.custom.mastered : [])

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._buildScene(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)

    this._startRound(ctx, false) // första rundan annonseras i mount()
  },

  mount(ctx) {
    ctx.services.voice.say(this._introPhrase)
    this._bobo?.react('hej')
  },

  // Bygger bakgrund, värld, pölar, mottagare, lager och HUD en gång.
  _buildScene(ctx) {
    // 1) Himmel + sol + gräsmark. Inga egna moln (clouds: 0) — regnmolnen ritas här.
    this._root.addChild(
      createScene(
        { top: 0xbfe9ff, bottom: 0xdcf5cf, ground: 0x86d27a, groundDark: 0x5bbf6a, sun: true, clouds: 0, hills: true, gras: true },
        { width: ctx.width, height: ctx.height },
      ),
    )

    // Allt spelinnehåll i en egen container så ett firande-skak inte avslöjar
    // bakgrundens kanter (bakgrunden står stilla).
    this._content = new Container()
    this._root.addChild(this._content)

    // 2) Världen: regnbågen på himlen, kullar, hus och träd — regnet faller NÅGONSTANS.
    this._world = new Container()
    this._world.eventMode = 'none'
    this._world.interactiveChildren = false
    this._content.addChild(this._world)
    this._buildWorld()

    // 3) Pölar i markremsan (dekor — fångar inga tap, men plaskar när droppar landar).
    this._puddleLayer = new Container()
    this._puddleLayer.eventMode = 'none'
    this._puddleLayer.interactiveChildren = false
    this._content.addChild(this._puddleLayer)
    this._buildPuddles(ctx)

    // 4) Mottagaren Bobo med paraply/hink (under dropparna, så en droppe alltid vinner tappet).
    this._buildMott(ctx)

    // 5) Droppar (interaktiva).
    this._dropsLayer = new Container()
    this._content.addChild(this._dropsLayer)

    // 6) Plask/gnist-fx ovanpå droppar (dekor).
    this._splashLayer = new Container()
    this._splashLayer.eventMode = 'none'
    this._splashLayer.interactiveChildren = false
    this._content.addChild(this._splashLayer)

    // 7) Regnmolnen OVANPÅ dropparna: en droppe föds dolt under molnet och faller ut.
    this._buildClouds()

    // 8) HUD: rundans framstegsprickar.
    this._hud = new Container()
    this._content.addChild(this._hud)
    this._dotsRoot = new Container()
    this._dotsRoot.position.set(640, 168)
    this._dotsRoot.eventMode = 'none'
    this._hud.addChild(this._dotsRoot)
    this._dots = []
  },

  // --- världen -------------------------------------------------------------

  _buildWorld() {
    const w = this._world

    // Regnbågen bakom kullarna (bara bemästrade band syns — se _syncBow).
    this._bowG = new Graphics()
    this._bowG.eventMode = 'none'
    w.addChild(this._bowG)
    this._bands = []
    this._syncBow(null, false)

    // Två mjuka kullar som också döljer regnbågens fötter.
    const hills = new Graphics()
    hills.ellipse(300, 652, 200, 68).fill(0x95dc88)
    hills.ellipse(300, 640, 150, 34).fill({ color: 0xb4ea9f, alpha: 0.55 })
    hills.ellipse(975, 654, 212, 62).fill(0x86d27a)
    hills.ellipse(975, 643, 160, 30).fill({ color: 0xa6e493, alpha: 0.5 })
    w.addChild(hills)

    // Huset till vänster.
    const house = new Container()
    house.position.set(92, 642)
    const hg = new Graphics()
    hg.ellipse(0, 4, 84, 11).fill({ color: 0x000000, alpha: 0.12 })
    hg.rect(30, -122, 16, 40).fill(0xb9554e) // skorsten
    hg.roundRect(-60, -70, 120, 70, 6).fill(0xfff1d6).stroke({ width: 3, color: 0xd9b98a })
    hg.poly([-74, -66, 0, -130, 74, -66]).fill(0xe5635b).stroke({ width: 3, color: 0xb9554e, join: 'round' })
    hg.roundRect(-16, -46, 32, 46, 6).fill(0x8b5a3c) // dörr
    hg.circle(8, -22, 3).fill(0xffd35c)
    hg.roundRect(28, -58, 26, 26, 4).fill(0xbfe9ff).stroke({ width: 3, color: 0xd9b98a }) // fönster
    hg.moveTo(41, -58).lineTo(41, -32).moveTo(28, -45).lineTo(54, -45).stroke({ width: 2, color: 0xd9b98a })
    house.addChild(hg)
    w.addChild(house)

    // Träd: stam + krona som vaggar. Kronan är egen nod med rotationspunkten vid stammen.
    const tree = (x, y, s, green) => {
      const t = new Container()
      t.position.set(x, y)
      t.scale.set(s)
      const trunk = new Graphics()
      trunk.ellipse(0, 3, 40, 8).fill({ color: 0x000000, alpha: 0.12 })
      trunk.roundRect(-9, -72, 18, 72, 5).fill(0x8b5a3c)
      const crown = new Container()
      crown.position.set(0, -66)
      const cg = new Graphics()
      cg.circle(-26, -16, 30).fill(darken(green, 0.08))
      cg.circle(26, -16, 30).fill(darken(green, 0.08))
      cg.circle(0, -30, 40).fill(green)
      cg.circle(0, -58, 28).fill(lighten(green, 0.08))
      cg.ellipse(-12, -40, 12, 18).fill({ color: 0xffffff, alpha: 0.16 })
      crown.addChild(cg)
      t.addChild(trunk, crown)
      w.addChild(t)
      liv(crown, { bob: 0, sway: 0.025, duration: 3.4 + Math.random() * 1.6 })
      this._livs.push(crown)
    }
    tree(236, 652, 0.9, 0x4fb35f)
    tree(1040, 652, 1.05, 0x5bbf6a)
    tree(418, 640, 0.62, 0x68c874)
  },

  // Synka regnbågens band mot de bemästrade färgerna. Banden packas ihop ytterifrån
  // (inga luckor); ett NYTT band sveps in från vänster medan de innanför glider ett steg.
  _syncBow(ctx, animate, newKey = null) {
    const keys = BAND_ORDER.filter((k) => this._mastered.has(k))
    // Avsluta en pågående sväng direkt så nya mål utgår från färdiga lägen.
    if (this._bowTw) {
      this._bowTw.kill()
      this._tws.delete(this._bowTw)
      this._bowTw = null
      for (const b of this._bands) {
        b.r = b.rTo
        b.sweep = 1
      }
    }
    const next = keys.map((key, i) => {
      const rTo = BOW.rOut - BOW.w / 2 - i * BOW.w
      const old = this._bands.find((b) => b.key === key)
      if (old) return { key, color: old.color, rFrom: old.r, rTo, r: old.r, sweep: 1 }
      const def = COLOR_DEFS.find((d) => d.key === key)
      return { key, color: def.color, rFrom: rTo, rTo, r: rTo, sweep: animate && key === newKey ? 0 : 1 }
    })
    this._bands = next
    if (!animate || !ctx) {
      for (const b of this._bands) {
        b.r = b.rTo
        b.sweep = 1
      }
      this._drawBow()
      return
    }
    this._drawBow()
    const p = { t: 0 }
    let nextSparkle = 0.15
    const tw = gsap.to(p, {
      t: 1,
      duration: 1.1,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._alive || this._bowG.destroyed) {
          tw.kill()
          return
        }
        for (const b of this._bands) {
          b.r = b.rFrom + (b.rTo - b.rFrom) * p.t
          if (b.key === newKey) b.sweep = p.t
        }
        this._drawBow()
        const nb = this._bands.find((b) => b.key === newKey)
        if (nb && p.t >= nextSparkle) {
          nextSparkle += 0.2
          const a = Math.PI * (1 + p.t)
          sparkle(ctx.fxLayer, BOW.cx + Math.cos(a) * nb.r, BOW.cy + Math.sin(a) * nb.r, { count: 2 })
        }
      },
      onComplete: () => {
        for (const b of this._bands) {
          b.r = b.rTo
          b.sweep = 1
        }
        if (!this._bowG.destroyed) this._drawBow()
        this._tws.delete(tw)
        if (this._bowTw === tw) this._bowTw = null
      },
    })
    this._bowTw = tw
    this._tws.add(tw)
  },

  _drawBow() {
    const g = this._bowG
    if (!g || g.destroyed) return
    g.clear()
    for (const b of this._bands) {
      if (b.sweep < 0.01) continue
      bage(g, BOW.cx, BOW.cy, b.r, Math.PI, Math.PI * (1 + b.sweep)).stroke({ width: BOW.w, color: b.color, alpha: 0.9 })
    }
  },

  // Regnmoln: grå-blå, med mörkare undersida. Molnet guppar mjukt (liv, yttre nod) och
  // klämmer ihop sig när det släpper en droppe (squash, inre nod).
  _buildClouds() {
    this._cloudLayer = new Container()
    this._cloudLayer.eventMode = 'none'
    this._cloudLayer.interactiveChildren = false
    this._content.addChild(this._cloudLayer)
    this._clouds = CLOUD_DEFS.map((d, i) => {
      const wrap = new Container()
      wrap.position.set(d.x, d.y)
      const inner = new Container()
      inner.scale.set(d.s * (i % 2 ? -1 : 1), d.s) // varannat moln speglat — inga identiska kopior
      const g = new Graphics()
      const shapes = (dy, color) => {
        g.ellipse(0, 22 + dy, 122, 30).fill(color)
        g.circle(-76, 8 + dy, 38).fill(color)
        g.circle(-30, -14 + dy, 52).fill(color)
        g.circle(32, -20 + dy, 56).fill(color)
        g.circle(80, 4 + dy, 40).fill(color)
      }
      shapes(9, 0x93a4ba) // undersida
      shapes(0, 0xb9c6d8)
      // ljusare ovansida — lite volym
      g.circle(-30, -19, 46).fill({ color: 0xd3deec, alpha: 0.85 })
      g.circle(32, -25, 49).fill({ color: 0xd3deec, alpha: 0.85 })
      g.ellipse(-36, -36, 26, 13).fill({ color: 0xffffff, alpha: 0.32 })
      g.ellipse(34, -44, 22, 11).fill({ color: 0xffffff, alpha: 0.26 })
      inner.addChild(g)
      wrap.addChild(inner)
      this._cloudLayer.addChild(wrap)
      liv(wrap, { bob: 5, sway: 0, duration: 3 + i * 0.45, phase: i * 0.27 })
      this._livs.push(wrap)
      return { x: d.x, wrap, inner }
    })
  },

  // --- mottagaren ----------------------------------------------------------

  // Bobo i markremsan. Högra tassen håller paraplyet/hinken i målfärgen; i ord-rundan
  // håller vänstra tassen en liten skylt med ORDET (text på en skylt är tillåten).
  _buildMott(ctx) {
    this._mott = new Container()
    this._mott.position.set(MOTT_X, MOTT_Y)
    this._mott.eventMode = 'static'
    this._mott.cursor = 'pointer'
    // Träffytan täcker figuren och paraplyet (≥96 px åt alla håll) och står still.
    this._mott.hitArea = new Rectangle(-95, -175, 245, 300)
    this._mott.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      if (!this._paused) ctx.services.voice.say(this._introPhrase)
      this._bobo?.react('nyfiken')
      this._wobbleItem()
      if (this._schild?.visible) pop(this._schild, { scale: 1.12 })
    })

    this._bobo = makeKaraktar({ r: MOTT_R })
    this._mott.addChild(this._bobo.view)

    // Ordskylten i vänstra tassen (dold utom i ord-rundor).
    this._schild = new Container()
    this._schild.position.set(-PAW_X, PAW_Y)
    const sg = new Graphics()
    sg.moveTo(0, 12).lineTo(0, -92).stroke({ width: 7, color: 0x8a6a48, cap: 'round' })
    sg.roundRect(-116, -150, 120, 60, 12).fill(COLORS.cream).stroke({ width: 5, color: 0xb58a5a })
    sg.circle(-104, -138, 3).fill(0x8a6a48)
    sg.circle(-8, -138, 3).fill(0x8a6a48)
    sg.circle(0, 4, 8).fill(COLORS.cream) // tassen runt skaftet
    this._schildText = new Text({
      text: '',
      style: { fontFamily: FONT.display, fontSize: 42, fontWeight: '800', fill: 0x333333 },
    })
    this._schildText.anchor.set(0.5)
    this._schildText.position.set(-56, -120)
    this._schild.addChild(sg, this._schildText)
    this._schild.visible = false
    this._mott.addChild(this._schild)
    liv(this._schild, { bob: 2, sway: 0.03, duration: 2.8, phase: 0.4 })
    this._livs.push(this._schild)

    // Paraply/hink i högra tassen: wrap (vilo-gupp) → tilt (fångst-vingel) → ritning.
    this._itemWrap = new Container()
    this._itemWrap.position.set(PAW_X, PAW_Y)
    this._itemTilt = new Container()
    this._itemG = new Graphics()
    this._itemTilt.addChild(this._itemG)
    this._itemWrap.addChild(this._itemTilt)
    this._mott.addChild(this._itemWrap)
    liv(this._itemWrap, { bob: 3, sway: 0.035, duration: 2.6, phase: 0.1 })
    this._livs.push(this._itemWrap)

    this._itemKind = 'paraply'
    this._itemColor = NEUTRAL
    this._content.addChild(this._mott)
  },

  // Paraply (kupol + revben + krycka) eller hink (handtag + konisk kropp + vatten) i
  // this._itemColor. Origo = tassen. Ritas om en gång per runda — inga gradienter.
  _drawItem() {
    const g = this._itemG
    if (!g || g.destroyed) return
    g.clear()
    const c = this._itemColor
    const dk = darken(c, 0.3)
    if (this._itemKind === 'paraply') {
      g.moveTo(0, -108).lineTo(0, 12).quadraticCurveTo(0, 26, -12, 24).stroke({ width: 6, color: 0x8a6a48, cap: 'round' })
      g.moveTo(-72, -106)
        .quadraticCurveTo(-72, -172, 0, -172)
        .quadraticCurveTo(72, -172, 72, -106)
        .quadraticCurveTo(54, -92, 36, -106)
        .quadraticCurveTo(18, -92, 0, -106)
        .quadraticCurveTo(-18, -92, -36, -106)
        .quadraticCurveTo(-54, -92, -72, -106)
        .closePath()
        .fill(c)
        .stroke({ width: 4, color: dk, join: 'round' })
      g.moveTo(0, -172).quadraticCurveTo(-22, -146, -36, -106)
      g.moveTo(0, -172).quadraticCurveTo(22, -146, 36, -106)
      g.moveTo(0, -172).lineTo(0, -106)
      g.stroke({ width: 2.5, color: dk, alpha: 0.45 })
      g.ellipse(-30, -148, 14, 8).fill({ color: 0xffffff, alpha: 0.45 })
      g.circle(0, -174, 5).fill(dk)
      g.circle(0, 4, 8).fill(COLORS.cream) // tassen runt skaftet
    } else {
      g.moveTo(-30, 34).quadraticCurveTo(-26, -8, 0, -8).quadraticCurveTo(26, -8, 30, 34).stroke({ width: 5, color: 0x8d96a3, cap: 'round' })
      g.moveTo(-36, 32)
        .lineTo(36, 32)
        .lineTo(28, 86)
        .quadraticCurveTo(0, 94, -28, 86)
        .closePath()
        .fill(c)
        .stroke({ width: 4, color: dk, join: 'round' })
      g.ellipse(0, 32, 36, 9).fill(darken(c, 0.38))
      g.ellipse(0, 34, 29, 6).fill(lighten(c, 0.3))
      g.ellipse(0, 32, 36, 9).stroke({ width: 3, color: dk })
      g.ellipse(-18, 60, 5, 15).fill({ color: 0xffffff, alpha: 0.38 })
      g.circle(0, 2, 8).fill(COLORS.cream)
    }
  },

  // Var dropparna fångas (i _content-rymd).
  _catchPoint() {
    const w = this._itemWrap
    return { x: MOTT_X + w.x, y: MOTT_Y + w.y + (this._itemKind === 'paraply' ? -140 : 26) }
  },

  _wobbleItem() {
    const t = this._itemTilt
    if (!t || t.destroyed) return
    this._itemTl?.kill()
    t.rotation = 0
    this._itemTl = gsap
      .timeline()
      .to(t, { rotation: -0.2, duration: 0.07 })
      .to(t, { rotation: 0.14, duration: 0.09 })
      .to(t, { rotation: 0, duration: 0.14, ease: 'back.out(2)' })
    squash(t, { intensity: 0.8 })
  },

  _celebrateItem() {
    const t = this._itemTilt
    if (!t || t.destroyed) return
    this._itemTl?.kill()
    t.rotation = 0
    this._itemTl = gsap
      .timeline()
      .to(t, { rotation: -0.35, duration: 0.16, ease: 'power2.out' })
      .to(t, { rotation: 0.35, duration: 0.3, ease: 'sine.inOut' })
      .to(t, { rotation: -0.3, duration: 0.3, ease: 'sine.inOut' })
      .to(t, { rotation: 0, duration: 0.25, ease: 'back.out(2)' })
    squash(t, { intensity: 1.2 })
  },

  // Ord-runda: skylten visar ORDET i färgen och paraplyet är neutralt tills barnet tvekat
  // (då färgas det). Vanlig runda: ingen skylt, paraplyet bär färgen.
  _updateMott(ctx, animate) {
    const t = this._target
    const dold = this._wordRound && !this._wordHintShown
    this._itemColor = dold ? NEUTRAL : t.color
    this._drawItem()
    if (this._wordRound) {
      const st = this._schildText.style
      this._schildText.text = t.word
      st.fill = t.color
      st.stroke = { color: darken(t.color, 0.4), width: 5, join: 'round' }
      const visade = this._schild.visible
      this._schild.visible = true
      if (animate && !visade) pop(this._schild, { scale: 1.25 })
    } else {
      this._schild.visible = false
    }
    if (animate) {
      this._wobbleItem()
      // Dra blicken till målet: två ringar i paraplyets/hinkens färg, den andra en halv sekund senare.
      const pt = this._catchPoint()
      const ring = () => ripple(ctx.fxLayer, pt.x, pt.y, { color: this._itemColor, maxR: 96, duration: 0.6, width: 7, alpha: 0.7 })
      ring()
      ctx.later(0.5, () => {
        if (this._alive) ring()
      })
    }
  },

  // --- pölar ---------------------------------------------------------------

  _buildPuddles(ctx) {
    this._puddles = []
    for (const fx of [0.13, 0.34, 0.55, 0.76]) {
      const w = 64 + Math.random() * 46
      const p = new Graphics()
      p._w = w
      p._tint = null // vilken färg pölen just nu innehåller (null = klart vatten)
      p.position.set(ctx.width * fx, PUDDLE_Y)
      this._paintPuddle(p, null)
      this._puddleLayer.addChild(p)
      this._puddles.push(p)
    }
  },

  // Rita om en pöl i en given färg (null = klart regnvatten).
  _paintPuddle(p, color) {
    if (!p || p.destroyed) return
    const w = p._w
    const water = color ?? 0x8fd6ee
    const shade = color ? darken(color, 0.3) : 0x3f8fc6
    p.clear()
    p.ellipse(0, 7, w, w * 0.26).fill({ color: shade, alpha: 0.32 }) // skugga
    p.ellipse(0, 0, w, w * 0.28).fill({ color: water, alpha: color ? 0.75 : 0.6 }) // vatten
    p.ellipse(-w * 0.28, -w * 0.06, w * 0.42, w * 0.1).fill({ color: 0xffffff, alpha: 0.45 }) // glans
  },

  // Nivåparametrar växer mjukt med antal klarade rundor: fler färger, snabbare
  // och tätare regn samt fler droppar att samla. Alltid NO-FAIL.
  _levelFor(r) {
    return {
      colors: Math.min(6, 3 + Math.floor(r / 2)),
      need: Math.min(8, 4 + Math.floor(r / 2)),
      speed: Math.min(150, 72 + r * 8),
      interval: Math.max(480, 900 - r * 45),
    }
  },

  // Starta ny runda: ny målfärg, ny palett, nollställd räknare.
  _startRound(ctx, speak = true) {
    if (!this._alive) return
    const lvl = this._levelFor(this._rounds)
    this._need = lvl.need
    this._speed = lvl.speed
    this._interval = lvl.interval
    this._collected = 0
    this._paused = false
    this._idle = 0
    this._spawnAcc = lvl.interval // spawna direkt

    this._palette = shuffle(COLOR_DEFS).slice(0, lvl.colors)
    let choices = this._palette.filter((c) => c.key !== this._lastTargetKey)
    if (!choices.length) choices = this._palette
    this._target = randomFrom(choices)
    this._lastTargetKey = this._target.key
    this._introPhrase = this._target.intro

    // Ord-runda: efter ett par vanliga rundor visar skylten BARA färgordet i färgen
    // (paraplyet är neutralt) → barnet kopplar ord→färg.
    this._wordRound = this._rounds >= 2 && this._rounds % 3 === 2
    this._wordHintShown = false

    // Paraply och hink turas om.
    this._itemKind = this._rounds % 2 === 0 ? 'paraply' : 'hink'

    this._updateMott(ctx, speak)
    this._buildDots()
    if (speak) this._bobo?.react('hej')

    // Nästa rundas instruktion kommer 1,4 s efter vinstrepliken — orden köar tills den
    // är klar (bilden gör det inte), och en runda som hunnit bytas säger inte sin gamla.
    if (speak) {
      const tgt = this._target
      ctx.narTyst(() => {
        if (this._alive && this._target === tgt) ctx.services.voice.say(this._introPhrase)
      })
    }
  },

  _buildDots() {
    this._dotsRoot.children.forEach((o) => gsap.killTweensOf(o.scale))
    this._dotsRoot.removeChildren().forEach((o) => o.destroy())
    this._dots = []
    const gap = 38
    const total = (this._need - 1) * gap
    for (let i = 0; i < this._need; i++) {
      const d = new Graphics()
      d.circle(0, 0, 15).fill(COLORS.cream).stroke({ width: 3, color: 0x9fb4c8 })
      d.x = -total / 2 + i * gap
      this._dotsRoot.addChild(d)
      this._dots.push(d)
    }
  },

  _lightDot(i) {
    const d = this._dots[i]
    if (!d || d.destroyed) return
    d.clear().circle(0, 0, 15).fill(this._target.color).stroke({ width: 3, color: darken(this._target.color, 0.25) })
    pop(d)
  },

  // --- droppar -------------------------------------------------------------

  // Glansig tårformad droppe (spets uppåt) med mjuk svans, skuggning och highlight.
  _drawDrop(g, r, color) {
    g.clear()
    // mjuk svans ovanför (rörelsekänsla)
    g.ellipse(0, -r * 2.5, r * 0.3, r * 0.95).fill({ color, alpha: 0.14 })
    g.ellipse(0, -r * 1.95, r * 0.42, r * 0.7).fill({ color, alpha: 0.2 })
    // spets
    g.moveTo(0, -r * 1.8)
      .lineTo(r * 0.6, -r * 0.2)
      .lineTo(-r * 0.6, -r * 0.2)
      .fill({ color })
    // kropp
    g.circle(0, 0, r).fill(color).stroke({ width: 4, color: darken(color, 0.22) })
    // volym-skuggning nedtill
    g.circle(0, r * 0.3, r * 0.7).fill({ color: darken(color, 0.16), alpha: 0.3 })
    // glansig highlight + ljus spekulärprick
    g.ellipse(-r * 0.3, -r * 0.42, r * 0.26, r * 0.4).fill({ color: 0xffffff, alpha: 0.55 })
    g.circle(-r * 0.42, -r * 0.55, r * 0.13).fill({ color: 0xffffff, alpha: 0.9 })
  },

  // Regnbågsdroppe: koncentriska färgringar + glans.
  _drawRainbow(g, r) {
    g.clear()
    g.ellipse(0, -r * 2.4, r * 0.3, r * 0.9).fill({ color: 0xffffff, alpha: 0.18 })
    g.moveTo(0, -r * 1.8)
      .lineTo(r * 0.6, -r * 0.2)
      .lineTo(-r * 0.6, -r * 0.2)
      .fill({ color: RAINBOW[0] })
    for (let i = 0; i < RAINBOW.length; i++) {
      g.circle(0, 0, r * (1 - i * 0.14)).fill(RAINBOW[i])
    }
    g.circle(0, 0, r).stroke({ width: 4, color: 0xffffff, alpha: 0.85 })
    g.ellipse(-r * 0.32, -r * 0.42, r * 0.22, r * 0.34).fill({ color: 0xffffff, alpha: 0.7 })
    g.circle(-r * 0.42, -r * 0.55, r * 0.11).fill({ color: 0xffffff, alpha: 0.95 })
  },

  // Konsten för en droppe av en viss sort (en nod — pulsen skalar den, träffytan står still).
  _dropArt(kind, color) {
    if (kind === 'twin') {
      // Tvilling: två små droppar hopkopplade.
      const c = new Container()
      const a = new Graphics()
      this._drawDrop(a, 30, color)
      a.position.set(-34, 8)
      const b = new Graphics()
      this._drawDrop(b, 30, color)
      b.position.set(34, -8)
      c.addChild(a, b)
      return c
    }
    if (kind === 'glitter') {
      const c = new Container()
      const g = new Graphics()
      this._drawDrop(g, DROP_R, color)
      g.circle(0, 0, DROP_R + 4).stroke({ width: 3, color: 0xffffff, alpha: 0.75 })
      const stars = new Graphics()
      star(stars, -16, -16, 9)
      star(stars, 18, 8, 11)
      star(stars, -8, 22, 7)
      star(stars, 24, -24, 6)
      c.addChild(g, stars)
      c._stars = stars
      return c
    }
    const g = new Graphics()
    this._drawDrop(g, kind === 'stor' ? 62 : DROP_R, color)
    return g
  },

  // Gemensamt skal: halo-hitarea + tap-koppling. hitR ≥ 66 (132 px) för alla sorter.
  _dropShell(ctx, konst, def, { hitR = 66, kind = 'vanlig' } = {}) {
    const drop = new Container()
    const halo = new Graphics().circle(0, 0, hitR).fill({ color: 0xffffff, alpha: 0.001 })
    drop.addChild(halo, konst)
    drop._konst = konst
    drop._def = def
    drop._kind = kind
    drop._spd = 1
    drop._resolved = false
    drop.eventMode = 'static'
    drop.cursor = 'pointer'
    drop.hitArea = new Circle(0, 0, hitR)
    drop.on('pointertap', () => this._tapDrop(ctx, drop))
    return drop
  },

  // Vilken sort blir nästa droppe? Nya sorter kommer efter hand (rundor) och har tak
  // på hur många som är i luften samtidigt, så regnet aldrig blir rörigt.
  _pickKind() {
    const live = (k) => this._drops.filter((d) => d._kind === k && !d._resolved).length
    const r = Math.random()
    if (this._rounds >= 1 && r < 0.09 && live('twin') < 2) return 'twin'
    if (this._rounds >= 2 && r >= 0.09 && r < 0.16 && live('stor') < 1) return 'stor'
    if (this._rounds >= 3 && r >= 0.16 && r < 0.23 && live('glitter') < 1) return 'glitter'
    return 'vanlig'
  },

  _spawnPos() {
    let ci = Math.floor(Math.random() * CLOUD_DEFS.length)
    if (ci === this._lastCloud) ci = (ci + 1 + Math.floor(Math.random() * (CLOUD_DEFS.length - 1))) % CLOUD_DEFS.length
    return { ci, x: CLOUD_DEFS[ci].x + (Math.random() * 2 - 1) * 48 }
  },

  // Spawna en droppe ur ett moln. >=50% är målfärg; ibland en regnbågsdroppe (bonus)
  // eller en särskild sort (tvilling · stor skvätt · glittrande).
  _spawnDrop(ctx, forceTarget = false) {
    if (!this._alive) return
    let drop
    const rainbowChance = Math.min(0.09, 0.04 + this._rounds * 0.005)
    if (!forceTarget && Math.random() < rainbowChance) {
      const g = new Graphics()
      this._drawRainbow(g, DROP_R)
      drop = this._dropShell(ctx, g, { key: '__rainbow', color: 0xffffff, rainbow: true }, { kind: 'regnbage' })
    } else {
      let def
      if (forceTarget || Math.random() < 0.5) {
        def = this._target
      } else {
        const others = this._palette.filter((c) => c.key !== this._target.key)
        def = others.length ? randomFrom(others) : this._target
      }
      const kind = forceTarget ? 'vanlig' : this._pickKind()
      drop = this._dropShell(ctx, this._dropArt(kind, def.color), def, {
        kind,
        hitR: kind === 'stor' ? 84 : kind === 'twin' ? 76 : 66,
      })
      if (kind === 'glitter') {
        drop._spd = 0.55
        drop._sparkT = 0
        const st = { a: 0.25 }
        const stars = drop._konst._stars
        drop._glitTw = gsap.to(st, {
          a: 1,
          duration: 0.4,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          onUpdate: () => {
            if (!stars || stars.destroyed) {
              drop._glitTw?.kill()
              return
            }
            stars.alpha = st.a
          },
        })
      } else if (kind === 'stor') {
        drop._spd = 0.9
      }
    }

    // Välj moln + x, och undvik krockar nära toppen (max 6 försök).
    let pos = this._spawnPos()
    for (let i = 0; i < 6; i++) {
      if (this._drops.every((d) => d.y > 150 || Math.abs(d._baseX - pos.x) > 110)) break
      pos = this._spawnPos()
    }
    this._lastCloud = pos.ci
    const cloud = this._clouds[pos.ci]
    if (cloud) squash(cloud.inner, { intensity: 0.6 })

    drop._baseX = pos.x
    drop._phase = Math.random() * Math.PI * 2
    drop._sway = 8 + Math.random() * 10
    drop.x = pos.x
    drop.y = SPAWN_Y
    this._dropsLayer.addChild(drop)
    this._drops.push(drop)
    bounceIn(drop)

    // Målfärgens droppar pulserar en kort stund när de föds (~1,5 s), så valet syns som ett
    // val. Pulsen går i KONSTBARNET — droppens träffyta sitter på containern och står still.
    // Inte i en ord-runda innan formen avslöjats: där ska ORDET bära ledtråden.
    if (!drop._def.rainbow && drop._def.key === this._target.key && (!this._wordRound || this._wordHintShown)) {
      const konst = drop._konst
      const st = { s: 1 }
      drop._pulsTw = gsap.to(st, {
        s: 1.13,
        duration: 0.25,
        delay: 0.25,
        yoyo: true,
        repeat: 5,
        ease: 'sine.inOut',
        onUpdate: () => {
          if (!konst || konst.destroyed) {
            drop._pulsTw?.kill()
            return
          }
          konst.scale.set(st.s)
        },
        onComplete: () => {
          if (konst && !konst.destroyed) konst.scale.set(1)
          drop._pulsTw = null
        },
      })
    }
  },

  // Döda allt som rör en droppe (puls, glitter, skal) — används vid varje rivning.
  _killDropFx(drop) {
    drop._pulsTw?.kill()
    drop._glitTw?.kill()
    gsap.killTweensOf(drop)
    gsap.killTweensOf(drop.scale)
    if (drop._konst && !drop._konst.destroyed) gsap.killTweensOf(drop._konst.scale)
  },

  _removeDrop(drop) {
    const i = this._drops.indexOf(drop)
    if (i >= 0) this._drops.splice(i, 1)
    this._killDropFx(drop)
    if (!drop.destroyed) drop.destroy({ children: true })
  },

  // En liten kopia av droppen flyger i båge till Bobos paraply/hink som en komet (spetsen
  // bakåt) och FÅNGAS där. Tweenar ett vanligt proxy och rör noden bara om den lever.
  _flyGhost(ctx, x, y, color, { r = 26, delay = 0, f = 784 } = {}) {
    if (!this._alive || !this._splashLayer || this._splashLayer.destroyed) return
    const holder = new Container()
    const g = new Graphics()
    this._drawDrop(g, r, color)
    holder.addChild(g)
    holder.position.set(x, y)
    holder.visible = delay <= 0
    this._splashLayer.addChild(holder)
    const target = this._catchPoint()
    const arc = 90 + Math.random() * 50
    const p = { t: 0 }
    let px = x
    let py = y
    const tw = gsap.to(p, {
      t: 1,
      duration: 0.62,
      delay,
      ease: 'power1.in',
      onStart: () => {
        if (!holder.destroyed) holder.visible = true
      },
      onUpdate: () => {
        if (holder.destroyed || !this._alive) {
          tw.kill()
          return
        }
        const nx = x + (target.x - x) * p.t
        const ny = y + (target.y - y) * p.t - Math.sin(Math.PI * p.t) * arc
        const vx = nx - px
        const vy = ny - py
        if (vx !== 0 || vy !== 0) holder.rotation = Math.atan2(-vx, vy)
        px = nx
        py = ny
        holder.position.set(nx, ny)
        holder.scale.set(1 - 0.35 * p.t)
      },
      onComplete: () => {
        this._tws.delete(tw)
        if (!holder.destroyed) holder.destroy({ children: true })
        this._catch(ctx, color, f)
      },
    })
    this._tws.add(tw)
  },

  // Bobo fångar: paraplyet/hinken vinglar, gnistor i färgen, ett litet pling.
  _catch(ctx, color, f = 784) {
    if (!this._alive) return
    const pt = this._catchPoint()
    sparkle(ctx.fxLayer, pt.x, pt.y, { count: 4 })
    burst(this._splashLayer, pt.x, pt.y, { count: 6, colors: [color], power: 0.6 })
    // Fångstljudet bär kombots ton: ljust pling i paraplyet, lägre rundat plopp i hinken.
    if (this._itemKind === 'paraply') ctx.services.audio.tone({ freq: f * 2, dur: 0.16, type: 'sine', vol: 0.14 })
    else ctx.services.audio.tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.16, slideTo: f * 0.75 })
    // Rundan är klar = firandet pågår; då får det sista fångstögonblicket inte avbryta det.
    if (this._paused) return
    this._wobbleItem()
    this._bobo?.react('heja')
  },

  _tapDrop(ctx, drop) {
    if (!this._alive || drop._resolved || this._paused) return
    this._idle = 0
    const x = drop.x
    const y = drop.y
    const kind = drop._kind
    const isTarget = drop._def.rainbow || drop._def.key === this._target.key

    // Varje pekning: ringle på vattenytan (<100ms).
    ripple(ctx.fxLayer, x, y, { color: drop._def.rainbow ? 0xfff3b0 : drop._def.color, maxR: kind === 'stor' ? 150 : 92 })
    this._bobo?.look(x - MOTT_X, y - MOTT_Y)

    if (isTarget) {
      drop._resolved = true
      drop.eventMode = 'none'
      drop._pulsTw?.kill()
      drop._glitTw?.kill()

      // Stigande kombo-ton: flera rätt i snabb följd klättrar uppför stegen.
      if (this._t - this._lastCorrectAt < 1.6) this._combo = Math.min(this._combo + 1, COMBO_LADDER.length - 1)
      else this._combo = 0
      this._lastCorrectAt = this._t
      const fc = COMBO_LADDER[this._combo]

      if (drop._def.rainbow) {
        // Regnbåge: sprutar alla färger + chime + glad emoji (detalj), himlens regnbåge blinkar.
        ctx.services.audio.sfx('match')
        for (const c of RAINBOW) burst(this._splashLayer, x, y, { count: 5, colors: [c], power: 1.15 })
        sparkle(ctx.fxLayer, x, y, { count: 10 })
        floatText(ctx.fxLayer, x, y - 30, '🌈', { fontSize: 64 })
        ctx.services.voice.say('Regnbåge!')
        this._flyGhost(ctx, x, y, randomFrom(RAINBOW), { f: fc })
        this._flyGhost(ctx, x, y, randomFrom(RAINBOW), { delay: 0.1, f: fc })
        this._shimmerBow()
      } else {
        // Rätt färg: klättrande pling (kombo-ton) + extra gnistor + färgglatt plask.
        const f = COMBO_LADDER[this._combo]
        const c = drop._def.color
        ctx.services.audio.tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.3 })
        ctx.services.audio.tone({ freq: f * 1.5, dur: 0.14, type: 'sine', vol: 0.12, delay: 0.03 })
        if (kind === 'twin') {
          // Tvillingen poppar i två färgstänk — och två små droppar flyger åt Bobo.
          sparkle(ctx.fxLayer, x - 34, y + 8)
          sparkle(ctx.fxLayer, x + 34, y - 8)
          burst(this._splashLayer, x - 34, y + 8, { count: 7, colors: [c] })
          burst(this._splashLayer, x + 34, y - 8, { count: 7, colors: [c] })
          ctx.services.audio.tone({ freq: f * 2, dur: 0.12, type: 'sine', vol: 0.14, delay: 0.09 })
          this._flyGhost(ctx, x - 34, y + 8, c, { r: 22, f: fc })
          this._flyGhost(ctx, x + 34, y - 8, c, { r: 22, delay: 0.12, f: fc })
        } else if (kind === 'stor') {
          // Stor skvätt: extra-fett plask, djup plask-ton och ett stort ringle.
          sparkle(ctx.fxLayer, x, y, { count: 10 })
          burst(this._splashLayer, x, y, { count: 20, colors: [c, lighten(c, 0.4)], power: 1.5 })
          ripple(ctx.fxLayer, x, y, { color: c, maxR: 210, duration: 0.7, width: 8, alpha: 0.5 })
          ctx.services.audio.tone({ freq: 210, dur: 0.3, type: 'sine', vol: 0.3, slideTo: 95 })
          this._flyGhost(ctx, x, y, c, { r: 40, f: fc })
        } else if (kind === 'glitter') {
          // Glittrande: ett litet arpeggio och ett regn av gnistor.
          sparkle(ctx.fxLayer, x, y, { count: 16 })
          burst(this._splashLayer, x, y, { count: 10, colors: [c, 0xffffff] })
          ctx.services.audio.tone({ freq: f * 1.25, dur: 0.12, type: 'triangle', vol: 0.14, delay: 0.07 })
          ctx.services.audio.tone({ freq: f * 1.5, dur: 0.12, type: 'triangle', vol: 0.14, delay: 0.14 })
          ctx.services.audio.tone({ freq: f * 2, dur: 0.2, type: 'triangle', vol: 0.14, delay: 0.21 })
          this._flyGhost(ctx, x, y, c, { f: fc })
        } else {
          sparkle(ctx.fxLayer, x, y)
          burst(this._splashLayer, x, y, { count: 8, colors: [c] })
          this._flyGhost(ctx, x, y, c, { f: fc })
        }
      }

      // Droppen krymper bort, prick tänds.
      gsap.killTweensOf(drop.scale)
      gsap.to(drop.scale, { x: 0, y: 0, duration: 0.22, ease: 'back.in(2)', onComplete: () => this._removeDrop(drop) })
      this._lightDot(this._collected)
      this._collected++
      // Sparsamt beröm (inte pratigt).
      if (this._collected < this._need && this._collected % 2 === 0) {
        ctx.services.voice.say(randomFrom(PRAISE))
      }
      if (this._collected >= this._need) this._finishRound(ctx)
    } else {
      // Fel färg: ALDRIG bestraffning — glad vingel + mjukt ljud + litet plask, Bobo blir nyfiken.
      ctx.services.audio.sfx('soft')
      burst(this._splashLayer, x, y, { count: 4, colors: [drop._def.color] })
      wiggle(drop)
      this._bobo?.react('nyfiken')
    }
  },

  // Himlens regnbåge blinkar till när en regnbågsdroppe tas.
  _shimmerBow() {
    if (!this._bands.length || !this._bowG || this._bowG.destroyed) return
    gsap.killTweensOf(this._bowG)
    gsap.fromTo(this._bowG, { alpha: 0.45 }, { alpha: 1, duration: 0.7, ease: 'sine.out' })
  },

  _finishRound(ctx) {
    if (!this._alive) return
    this._paused = true
    this._combo = 0
    // Egen vinstreplik FÖRE complete(): då står den kvar och complete() hoppar över sitt
    // beröm (sagd efter kapade den berömmet). complete() = celebrate-ljud + konfetti +
    // stjärna + klistermärke (GameHost).
    ctx.services.voice.say(this._target.done)
    ctx.progress.complete()
    shake(this._content, { intensity: 7, duration: 0.5 }) // mjukt, glatt firande-skak
    this._bobo?.react('jubel')
    this._celebrateItem()

    // Färgen blir ett nytt band på himlens regnbåge (första gången den bemästras).
    if (!this._mastered.has(this._target.key)) {
      this._mastered.add(this._target.key)
      ctx.progress.setCustom('mastered', [...this._mastered])
      ctx.services.audio.tone({ freq: 523.25, slideTo: 1046.5, dur: 0.9, type: 'triangle', vol: 0.18 })
      this._syncBow(ctx, true, this._target.key)
    } else {
      this._shimmerBow()
    }

    this._rounds++
    ctx.progress.setCustom('rundor', this._rounds)
    ctx.progress.setLevel(this._rounds)

    this._fadeOutDrops()
    this._nextRoundCall = gsap.delayedCall(1.4, () => {
      if (!this._alive) return
      this._startRound(ctx, true)
    })
  },

  // Tona ut kvarvarande droppar mjukt.
  _fadeOutDrops() {
    for (const d of this._drops.slice()) {
      d._resolved = true
      d.eventMode = 'none'
      d._pulsTw?.kill()
      d._glitTw?.kill()
      gsap.killTweensOf(d.scale)
      gsap.killTweensOf(d)
      gsap.to(d, {
        alpha: 0,
        duration: 0.5,
        ease: 'power1.out',
        onComplete: () => this._removeDrop(d),
      })
    }
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt

    // Flytta droppar med mjuk sidledspendling; landa i pölen (plask, ingen "miss").
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i]
      if (d._resolved) continue
      d.y += this._speed * d._spd * dt
      const s = Math.sin(this._t * 1.6 + d._phase)
      d.x = d._baseX + s * d._sway
      d.rotation = s * 0.05
      if (d._kind === 'glitter') {
        d._sparkT += dt
        if (d._sparkT > 0.3) {
          d._sparkT = 0
          sparkle(ctx.fxLayer, d.x, d.y, { count: 2 })
        }
      }
      if (d.y > BOTTOM_Y) {
        this._drops.splice(i, 1)
        this._killDropFx(d)
        // Pöl-plask: nu BÅDE hört (mjukt vått plopp) OCH sett (krusning + närmsta pöl studsar).
        ripple(this._splashLayer, d.x, PUDDLE_Y, { color: 0xbfe9ff, maxR: d._kind === 'stor' ? 80 : 46, duration: 0.5, width: 4, alpha: 0.5 })
        puff(this._splashLayer, d.x, PUDDLE_Y - 4, { count: 5, color: d._def.rainbow ? randomFrom(RAINBOW) : d._def.color })
        this._plop(ctx)
        this._rippleNearestPuddle(ctx, d.x, d._def)
        if (!d.destroyed) d.destroy({ children: true })
      }
    }

    // Spawn-ackumulator (pausar/städas med tickern).
    if (!this._paused) {
      this._spawnAcc += ticker.deltaMS
      if (this._spawnAcc >= this._interval) {
        this._spawnAcc = 0
        this._spawnDrop(ctx)
      }
    }

    // Idle-recue (~6s): upprepa instruktionen, lyft fram en målfärg-droppe.
    this._idle += dt
    // V21: tomgången räknas från TYSTNAD — påminnelsen får aldrig kapa en replik som talar.
    if (ctx.services.voice.talar) this._idle = 0
    if (this._idle > 6 && !this._paused) {
      this._idle = 0
      ctx.services.voice.say(this._introPhrase)
      // Tvekar barnet i en ord-runda? Färga paraplyet som stödhjul.
      if (this._wordRound && !this._wordHintShown) {
        this._wordHintShown = true
        this._updateMott(ctx, true)
      } else {
        this._wobbleItem() // påminnelsen visar paraplyet/hinken
      }
      const targets = this._drops.filter((d) => !d._resolved && d._def.key === this._target.key)
      if (targets.length) pop(randomFrom(targets))
      else this._spawnDrop(ctx, true)
    }
  },

  // Mjukt vått "plopp" när en droppe landar i pölen (lätt strypt så det inte spammar).
  _plop(ctx) {
    if (this._t - this._lastPlop < 0.05) return
    this._lastPlop = this._t
    const base = 150 + Math.random() * 70
    ctx.services.audio.tone({ freq: base, dur: 0.14, type: 'sine', vol: 0.16, slideTo: base * 0.5 })
  },

  // Närmaste pöl studsar mjukt när en droppe landar (exit-säkert via feedback.pop),
  // färgas av droppen — och BLANDAR om den redan höll en annan grundfärg.
  _rippleNearestPuddle(ctx, x, def) {
    if (!this._puddles) return
    let nearest = null
    let best = Infinity
    for (const p of this._puddles) {
      if (p.destroyed) continue
      const dx = Math.abs(p.x - x)
      if (dx < best) {
        best = dx
        nearest = p
      }
    }
    if (!nearest || nearest.destroyed) return
    pop(nearest, { scale: 1.12 })
    if (!def || def.rainbow) return

    const mix = nearest._tint && nearest._tint !== def.key ? MIXES[mixKey(nearest._tint, def.key)] : null
    if (mix) {
      // Äkta färgbegrepp: två grundfärger i samma pöl blir en tredje, och rösten
      // säger vilken. Sällsynt (målfärgen dominerar regnet) → ett wow-ögonblick.
      nearest._tint = mix.key
      this._paintPuddle(nearest, mix.color)
      sparkle(this._splashLayer, nearest.x, PUDDLE_Y - 10, { count: 10 })
      pop(nearest, { scale: 1.3 })
      ctx.services.audio.tone({ freq: 523.25, slideTo: 784, dur: 0.36, type: 'triangle', vol: 0.3 })
      this._mixCall?.kill()
      this._mixCall = gsap.delayedCall(0.25, () => {
        if (this._alive) ctx.services.voice.say(mix.phrase)
      })
    } else {
      nearest._tint = def.key
      this._paintPuddle(nearest, def.color)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._nextRoundCall?.kill()
    this._mixCall?.kill()
    this._itemTl?.kill()
    this._bowTw?.kill()
    this._tws?.forEach((t) => t.kill())
    this._tws?.clear()
    this._livs?.forEach((n) => n._fxLiv?.kill())
    this._drops?.forEach((d) => this._killDropFx(d))
    this._dots?.forEach((d) => gsap.killTweensOf(d.scale))
    this._puddles?.forEach((p) => gsap.killTweensOf(p.scale))
    this._clouds?.forEach((c) => {
      c.inner._fxSquashTl?.kill()
      gsap.killTweensOf(c.inner.scale)
      gsap.killTweensOf(c.wrap)
    })
    for (const n of [this._itemTilt, this._schild, this._itemWrap]) {
      if (!n) continue
      n._fxPopTl?.kill()
      n._fxSquashTl?.kill()
      gsap.killTweensOf(n)
      gsap.killTweensOf(n.scale)
    }
    if (this._bowG) gsap.killTweensOf(this._bowG)
    this._bobo?.destroy()
    gsap.killTweensOf(this._content)
    gsap.killTweensOf(this._root)
    ctx.services.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}
