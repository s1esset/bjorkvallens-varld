// Enhörningen Flyger — Elviras enhörning glider fram över en rullande himmel (3–5 år).
// Barnet styr bara HÖJDEN: dra fingret upp/ner (eller tappa i övre/nedre halvan) och
// enhörningen glider mjukt dit med momentum (egen 1D-integrator: fjäder mot fingret +
// dämpning — hon snäpper ALDRIG, hon glider). Himlen scrollar mot vänster; svävande
// glansiga ringar och stjärnor kommer emot henne. Flyger hon genom en rings öppning
// tänds en pip i topp-raden; rör hon en stjärna samlas den. Andra kontrollen: en stor
// "Långsammare"-knapp (🐢/🐇) som halverar scroll-farten så de minsta hinner sikta
// (sparas per profil). INGET fel-läge: banan tar aldrig slut förrän målet nås, en
// missad ring studsar bara lekfullt och köar en ny, och en snäll auto-magnet (starkare
// efter ett par missar) garanterar att hon alltid kommer igenom. Allt ritas
// programmatiskt (Pixi Graphics + emoji) och städas exit-säkert. Avbildad människa =
// Elvira (enhörningen är ett djur och behöver inget namn).
//
// En RESA, inte en tom himmel (2026-09-30): himlen byter tid på dygnet per nivå (dag →
// skymning → kväll → morgon) med kullar och lågt moln som glider i nederkanten; en
// regnbågsport långt fram närmar sig och växer för varje tänd pip; fyra ringtyper
// (vanlig, blom, moln, regnbåge = två pips); en regnbågsremsa ritas bakom enhörningen;
// och fångade stjärnor flyger ner i en ritad stjärnsäck som sparas mellan rundor.
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { COLORS, PLAYFUL, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { makeElvira } from '../../lib/figurer.js'
import { bage } from '../../lib/form.js'
import { nyKolumn, luftHos, uppvindSteg, KOL_HALV, KOL_BOTTEN, KOL_LUFT } from './uppvind.js'
import { nyUppvindsvy } from './uppvindbild.js'
import { sparkle, puff, wiggle, pop, bounceIn, breathe, floatText, burst, kvittera, liv } from '../../lib/feedback.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Logisk flygruta (designkoordinater).
const Y_MIN = 170 // enhörningens centrum hålls i [Y_MIN, Y_MAX]
const Y_MAX = 620
const UNI_X = 300 // enhörningens fasta x — gott om sikt-tid (ringen färdas 1080px)
const SPAWN_X = 1380 // ringar/stjärnor föds strax utanför högerkanten

// Integrator-konstanter (px & px/frame @60fps). Se "Fysik & kalibrering" i specen.
const STEER = 0.03 // fjäderstyrka mot fingret (skickligt men förlåtande)
const DAMP = 0.9 // hastighets-dämpning per frame -> mjuk utglidning (momentum)
const ASSIST = 0.006 // mjuk auto-magnet mot nästa rings mitt (förlåtande sikte)
const ASSIST_HELP = 0.018 // starkare magnet efter ett par missar -> garanterad passage
const MAXV = 18 // hastighetstak (px/frame)
const TAP_IMPULSE = 6 // enkel-tap i övre/nedre halvan ger denna höjd-impuls
const STAR_R = 70 // samlingsradie för stjärnor (enhörningen är större nu)
const IDLE_DELAY = 6 // s utan input -> mild om-cue
const UNI_SIZE = 50 // enhörningens ritade storlek (R) — var 40; rör inte kollisionen (bara uni.y räknas)

// Regnbågsfärger (ribban bakom enhörningen, regnbågsringen, porten).
const RB = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]

// Himlen byter tid på dygnet per nivå. Sky-temat har ingen mark (vi ritar egna kullar).
const TIDER = ['dag', 'skymning', 'kvall', 'morgon']
const SKY_DAG = { top: 0xaee3fb, bottom: 0xeaf7ea, sun: true, clouds: 3 }
const SKY_KVALL = { top: 0xaee3fb, bottom: 0xeaf7ea, sun: false, clouds: 1, stars: 20 } // månen ritas i _makeBackdrop
// Kullar + moln-ton per tid (lågt, bakom flygrutan, så nedre halvan inte är bara gradient).
const KULL_PAL = {
  dag: { far: 0xa4d8b4, near: 0x86cc98, moln: 0xffffff },
  skymning: { far: 0xb58ab4, near: 0x8f6aa6, moln: 0xffd9c4 },
  kvall: { far: 0x454a8c, near: 0x363a78, moln: 0xaab0e6 },
  morgon: { far: 0xc8d9a6, near: 0xa6cf8c, moln: 0xfff1d6 },
}
const SACK_X = 880 // stjärnsäcken, bredvid pipsen
const SACK_Y = 122
const PORT_FAR = 1165 // regnbågsportens x när resan börjar …
const PORT_NEAR = 980 // … och när alla pips är tända
const PORT_Y = 664

export default {
  id: 'enhorningen-flyger',
  titleSv: 'Enhörningen Flyger',
  icon: '✨',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'enhorningen-flyger',
  voiceIntro: 'Dra för att flyga genom ringarna!',

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._idle = 0
    this._t = 0 // ticker-tid (bob-fas)
    this._tailT = 0 // glitter-svans-throttle (ms)
    this._lastSoft = 0 // kant-/miss-ljud-throttle
    this._lastHopp = 0 // 'Hoppsan!'-throttle

    // Styr-state.
    this._steering = false
    this._fingerY = 360
    this._downY = 360
    this._downAt = 0
    this._vy = 0

    // Spel-state.
    this._rings = []
    this._stars = []
    this._toSpawn = []
    this._dist = 0
    this._ringsDone = 0
    this._missStreak = 0
    this._target = 3
    this._R = 90
    this._bobAmp = 0
    this._pipNodes = []
    this._passed = 0 // antal passerade ringar i rundan (beröm var 3:e)
    this._tid = null // himlens tid på dygnet just nu
    this._bds = [] // bakgrunder (två under en övertoning): { view, hills, clouds }
    this._fadeTw = null
    this._goalTw = null
    this._goalP = { p: 0 }
    this._trail = [] // regnbågsremsans punkter
    this._starTws = [] // stjärnor på väg ner i säcken
    this._sackN = ctx.progress.get().custom?.stjarnor | 0 // sparat mellan rundor
    this._kinds = []
    this._uppv = [] // uppvindspelare på banan: { vind: Vindfalt, vy, x, topY }
    this._lyftK = 0 // hur starkt uppvinden blåser på henne just nu (0..1, mjukad)
    this._uppPa = false // är hon i en pelare (för ljudet vid inträdet)
    this._uppSagt = false // utropet sägs en gång per bana
    this._wingP = 0 // vingens egen fas (flaxar snabbare i uppvind)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST: himmel per nivå + kullar och lågt moln (byts i _buildLevel).
    this._bgHolder = new Container()
    this._bgHolder.eventMode = 'none'
    this._bgHolder.interactiveChildren = false
    this._root.addChild(this._bgHolder)

    // Parallax-molnremsa (scrollar lite långsammare än ringarna -> djup).
    this._parallax = new Container()
    this._parallax.eventMode = 'none'
    this._parallax.interactiveChildren = false
    this._root.addChild(this._parallax)
    for (let i = 0; i < 5; i++) {
      const c = makeParallaxCloud(0.7 + Math.random() * 0.8)
      c.x = Math.random() * ctx.width
      c.y = 70 + Math.random() * 180
      c.alpha = 0.85
      this._parallax.addChild(c)
    }

    // Målet långt fram: en regnbågsport som närmar sig när pipsen fylls.
    this._gate = makeGate()
    this._gate.position.set(PORT_FAR, PORT_Y)
    this._root.addChild(this._gate)
    this._applyGoal()

    // Uppvindens luftpelare ligger bakom ringar och stjärnor, framför himlen.
    this._uppLayer = new Container()
    this._uppLayer.eventMode = 'none'
    this._uppLayer.interactiveChildren = false
    this._root.addChild(this._uppLayer)

    // Fält för ringar + stjärnor.
    this._field = new Container()
    this._field.eventMode = 'none'
    this._field.interactiveChildren = false
    this._root.addChild(this._field)

    // Regnbågsremsa + glitter-svans (bakom enhörningen).
    this._tail = new Container()
    this._tail.eventMode = 'none'
    this._tail.interactiveChildren = false
    this._ribbon = new Graphics()
    this._ribbon.eventMode = 'none'
    this._tail.addChild(this._ribbon)
    this._root.addChild(this._tail)

    // Enhörningen (Elvira).
    this._makeUnicorn(ctx)

    // Progress-pips (topp-mitt).
    this._pips = new Container()
    this._pips.position.set(ctx.width / 2, 120)
    this._pips.eventMode = 'none'
    this._pips.interactiveChildren = false
    this._root.addChild(this._pips)

    // Stjärnsäcken (fångade stjärnor landar här; sparas mellan rundor, ingen siffra).
    this._sack = makeSack()
    this._sack.position.set(SACK_X, SACK_Y)
    this._root.addChild(this._sack)
    this._drawSack()
    liv(this._sack, { bob: 3, sway: 0.05, duration: 2.8 })

    // Heltäckande, osynlig drag-yta över flygrutan (egen vertikal styrning).
    this._pad = new Graphics().rect(0, 90, ctx.width, 630).fill({ color: 0x000000, alpha: 0 })
    this._pad.eventMode = 'static'
    this._pad.cursor = 'pointer'
    this._pad.hitArea = new Rectangle(0, 90, ctx.width, 630)
    this._onDown = (e) => this._steerDown(ctx, e)
    this._onMove = (e) => this._steerMove(e)
    this._onUp = () => this._steerUp()
    this._pad.on('pointerdown', this._onDown)
    this._pad.on('globalpointermove', this._onMove)
    this._pad.on('pointerup', this._onUp)
    this._pad.on('pointerupoutside', this._onUp)
    this._root.addChild(this._pad)

    // "Långsammare"-knapp (på top av dragytan så den fångar sina egna tryck).
    this._slow = !!ctx.progress.get().custom?.slow
    this._makeSlowBtn(ctx)

    // Starta på sparad nivå och bygg banan.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._buildLevel(ctx)

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scen-noder ----------------------------------------------------------

  _makeUnicorn(ctx) {
    const uni = new Container()
    // Elvira rider enhörningen — berättelsen hade inget ansikte (gate-punkt 4).
    // makeElvira har origo vid FÖTTERNA. Hon sätts en bit bak på ryggen med fötterna
    // strax under kroppens ovansida (y=-13 vid R=40), så benen försvinner in i
    // silhuetten och hon läser som sittande i stället för stående på ryggen.
    // Enhörningen är 25 % större (R 40 → 50) så hon syns i ett 1280-fält; ryttaren följer med.
    const rider = makeElvira(72)
    rider.position.set(16, -6) // höjd så axlarna syns, fötterna fortfarande inne i ryggen
    rider.scale.x = -1 // vänd åt flygriktningen (enhörningen ser åt vänster)
    uni.addChild(rider)
    this._rider = rider

    uni.position.set(UNI_X, 360)
    // Mjuk skuggellips under.
    const shadow = new Graphics().ellipse(0, 70, 58, 17).fill({ color: COLORS.shadow, alpha: 1 })
    shadow.alpha = 0.12
    uni.addChild(shadow)
    // RITAD flygande enhörning (P0 ASSETS) — var en 🦄-emoji.
    this._uniEmoji = makeUnicorn(UNI_SIZE)
    uni.addChild(this._uniEmoji)
    uni.eventMode = 'none'
    uni.interactiveChildren = false
    this._root.addChild(uni)
    this._uni = uni
    this._vy = 0
  },

  _makeSlowBtn(ctx) {
    const btn = new Container()
    btn.position.set(120, 650)
    const plate = new Graphics().circle(0, 0, 55).fill(COLORS.teal).stroke({ width: 6, color: 0xffffff, alpha: 0.85 })
    const gloss = new Graphics().ellipse(0, -18, 34, 16).fill({ color: 0xffffff, alpha: 0.25 })
    // Ritad sköldpadda/hare (P0 ASSETS) — ritas om i _drawSpeedIcon.
    this._slowIco = new Graphics()
    this._drawSpeedIcon()
    this._slowLabel = new Text({
      text: this._slow ? 'Långsam' : 'Normal',
      style: { fontFamily: FONT.title, fontSize: 23, fontWeight: '700', fill: 0xffffff },
    })
    this._slowLabel.anchor.set(0.5)
    this._slowLabel.y = 80
    btn.addChild(plate, gloss, this._slowIco, this._slowLabel)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.hitArea = new Circle(0, 0, 67) // ≥96px träffyta (+halo)
    this._onSlow = () => this._toggleSlow(ctx)
    btn.on('pointertap', this._onSlow)
    this._slowBtn = btn
    this._root.addChild(btn)
  },

  _toggleSlow(ctx) {
    if (!this._alive) return
    this._slow = !this._slow
    this._drawSpeedIcon()
    this._slowLabel.text = this._slow ? 'Långsam' : 'Normal'
    pop(this._slowBtn)
    ctx.services.audio.sfx('pop')
    ctx.progress.setCustom('slow', this._slow)
    this._idle = 0
  },

  // ---- Himmel, kullar, mål och säck ---------------------------------------

  // En bakgrund = himmel ur createScene (tid på dygnet) + två kullband och lågt moln.
  // Kullbanden är två lika breda perioder som glider och lindas (`x += W`), så skarven syns aldrig.
  _makeBackdrop(ctx, tid) {
    const W = ctx.width
    const pal = KULL_PAL[tid]
    const view = new Container()
    view.eventMode = 'none'
    view.interactiveChildren = false
    view.addChild(createScene(tid === 'kvall' ? SKY_KVALL : SKY_DAG, { ground: false, tid, width: W, height: ctx.height }))

    if (tid === 'kvall') {
      // Kvällen har en blek måne, inte solen (SKY_KVALL har sun: false).
      const moon = new Container()
      moon.eventMode = 'none'
      moon.addChild(new Graphics().circle(0, 0, 80).fill({ color: 0xf4f1d8, alpha: 0.15 }))
      moon.addChild(new Graphics().circle(0, 0, 44).fill(0xf4f1d8))
      moon.addChild(new Graphics().circle(-12, -8, 8).fill({ color: 0xdedab8, alpha: 0.7 }))
      moon.addChild(new Graphics().circle(10, 12, 5.5).fill({ color: 0xdedab8, alpha: 0.7 }))
      moon.position.set(270, 135)
      view.addChild(moon)
    }

    const hills = []
    const mkHills = (color, baseY, amp, n, f) => {
      const lay = new Container()
      lay.eventMode = 'none'
      const g = new Graphics()
      const step = W / n
      g.moveTo(-W, 980).lineTo(-W, baseY)
      for (let c = -1; c < 3; c++) {
        for (let i = 0; i < n; i++) {
          const x0 = c * W + i * step
          const a = amp * (0.7 + 0.3 * Math.sin(i * 1.9 + f * 9)) // periodisk över W -> sömlös
          g.quadraticCurveTo(x0 + step / 2, baseY - a * 2, x0 + step, baseY)
        }
      }
      g.lineTo(3 * W, 980).closePath().fill(color)
      g.eventMode = 'none'
      lay.addChild(g)
      view.addChild(lay)
      hills.push({ lay, f })
    }
    mkHills(pal.far, 612, 52, 4, 0.12)

    const clouds = new Container()
    clouds.eventMode = 'none'
    clouds.interactiveChildren = false
    for (let i = 0; i < 4; i++) {
      const c = makeParallaxCloud(0.75 + Math.random() * 0.5)
      c.x = (i / 4) * W * 1.2 + Math.random() * 120
      c.y = 575 + Math.random() * 85
      c.alpha = 0.75
      c.tint = pal.moln
      clouds.addChild(c)
    }
    view.addChild(clouds)

    mkHills(pal.near, 664, 38, 5, 0.3)
    return { view, hills, clouds }
  },

  _setSky(ctx, tid) {
    if (!this._alive || tid === this._tid) return
    const first = !this._tid
    this._finishFade() // en övertoning i taget: den förra blir färdig direkt (och tintar molnen)
    this._tid = tid
    const bd = this._makeBackdrop(ctx, tid)
    this._bgHolder.addChild(bd.view)
    this._bds.push(bd)
    if (first) this._tintClouds()
    if (first) return
    bd.view.alpha = 0
    const st = { a: 0 }
    this._fadeTw = gsap.to(st, {
      a: 1,
      duration: 1.1,
      ease: 'sine.inOut',
      onUpdate: () => { if (!bd.view.destroyed) bd.view.alpha = st.a },
      onComplete: () => this._finishFade(),
    })
  },

  // Molntinten följer himlen: den byts först när övertoningen är klar (annars rosa moln på blå himmel).
  _tintClouds() {
    if (!this._tid || !this._parallax || this._parallax.destroyed) return
    for (const c of this._parallax.children) c.tint = KULL_PAL[this._tid].moln
  },

  _finishFade() {
    this._fadeTw?.kill()
    this._fadeTw = null
    this._tintClouds()
    while (this._bds.length > 1) {
      const old = this._bds.shift()
      if (old.view && !old.view.destroyed) old.view.destroy({ children: true })
    }
    const cur = this._bds[0]
    if (cur && cur.view && !cur.view.destroyed) cur.view.alpha = 1
  },

  _scrollBackdrops(ctx, speed) {
    const W = ctx.width
    for (const bd of this._bds) {
      for (const h of bd.hills) {
        h.lay.x -= speed * h.f
        if (h.lay.x <= -W) h.lay.x += W
      }
      for (const c of bd.clouds.children) {
        c.x -= speed * 0.22
        if (c.x < -260) c.x = W + 260 + Math.random() * 80
      }
    }
  },

  // Regnbågsporten: x/skala/alfa följer målets framsteg p (0 = långt bort, 1 = framme).
  _applyGoal() {
    const g = this._gate
    if (!g || g.destroyed) return
    const p = this._goalP.p
    g.x = PORT_FAR + (PORT_NEAR - PORT_FAR) * p
    g.scale.set(0.42 + 0.5 * p)
    g.alpha = 0.75 + 0.25 * p
  },

  _goTo(p, dur) {
    this._goalTw?.kill()
    this._goalTw = gsap.to(this._goalP, {
      p,
      duration: dur,
      ease: 'power2.out',
      onUpdate: () => { if (this._alive) this._applyGoal() },
    })
  },

  // Säcken: stjärnor som tittar upp ur öppningen (högst 6) — en samling, aldrig en siffra.
  _drawSack() {
    const s = this._sack
    if (!s || s.destroyed) return
    const n = Math.min(this._sackN, SACK_SPOTS.length)
    const g = s._stars
    g.clear()
    for (let i = 0; i < n; i++) {
      const [x, y, r] = SACK_SPOTS[i]
      // Varje varv om sex byter färg (guld, rosa, blå, lila): säcken förändras hela tiden.
      const [fill, line] = SACK_FARG[Math.floor((this._sackN - 1 - i) / 6) % SACK_FARG.length]
      drawStar(g, x, y, r, fill, line)
    }
    s._body.scale.set(1 + Math.min(this._sackN, 30) * 0.008)
  },

  // En stjärna har landat i säcken.
  _sackLand(ctx) {
    if (!this._alive || !this._sack || this._sack.destroyed) return
    this._drawSack()
    pop(this._sack, { scale: 1.22 })
    ctx.services.audio.tone({ freq: 1047, dur: 0.1, type: 'sine', vol: 0.2 })
    // Var femte stjärna: säcken firar lite extra.
    if (this._sackN % 5 === 0) {
      burst(ctx.fxLayer, SACK_X, SACK_Y, { count: 10, colors: [0xffd24a, 0xfff3b0, 0xffffff] })
      const au = ctx.services.audio
      ;[523, 659, 784].forEach((f, i) => au.tone({ freq: f, dur: 0.14, type: 'sine', vol: 0.22, delay: 0.06 + i * 0.08 }))
    }
  },

  // Regnbågsremsan bakom henne: en punkt per bildruta som glider bakåt med världen.
  // Tre alfa-steg (färskast starkast) — sex färgband som följer hennes höjd-kurva.
  _drawRibbon() {
    const g = this._ribbon
    if (!g || g.destroyed) return
    g.clear()
    const tr = this._trail
    const pts = []
    for (let i = tr.length - 1; i >= 0; i -= 3) pts.push(tr[i])
    if (pts.length < 3) return
    const alphas = [0.92, 0.62, 0.3]
    const per = Math.ceil((pts.length - 1) / alphas.length)
    for (let s = 0; s < alphas.length; s++) {
      const a = s * per
      const b = Math.min(pts.length - 1, (s + 1) * per)
      if (b - a < 1) continue
      for (let k = 0; k < RB.length; k++) {
        const off = (k - 2.5) * 6
        g.moveTo(pts[a].x, pts[a].y + off)
        for (let i = a + 1; i <= b; i++) g.lineTo(pts[i].x, pts[i].y + off)
        g.stroke({ width: 6.4, color: RB[k], alpha: alphas[s], cap: 'round', join: 'round' })
      }
    }
  },

  // ---- Bana / nivå ---------------------------------------------------------

  _buildLevel(ctx) {
    if (!this._alive) return
    const L = this._level
    let target, R, bobAmp, stars
    if (L <= 1) {
      target = 3
      R = 90
      bobAmp = 0
      stars = 1
    } else if (L <= 3) {
      target = 4
      R = 80
      bobAmp = 20
      stars = 1
    } else if (L <= 5) {
      target = 5
      R = 70
      bobAmp = 35
      stars = 2
    } else {
      target = 6
      R = 60
      bobAmp = 50
      stars = 2
    }
    this._target = target
    this._R = R
    this._bobAmp = bobAmp

    // Töm fältet.
    this._clearField()
    this._ringsDone = 0
    this._passed = 0
    this._missStreak = 0
    this._dist = 0
    this._resolving = false
    this._trail.length = 0
    this._uppSagt = false
    this._lyftK = 0
    this._uppPa = false

    // Ny himmel per nivå, och resans port långt borta igen.
    this._setSky(ctx, TIDER[L % TIDER.length])
    this._goTo(0, 0.8)

    // Ringtyper: summan av värdena (regnbåge = 2) blir exakt målet, så pipsen går jämnt upp.
    // Första nivån får en av varje vanlig sort; senare nivåer garanterar en regnbågsring.
    const kinds = this._planKinds(target, L)
    this._kinds = kinds
    const n = kinds.length

    // Bygg spawn-kö: tätare, mer varierad rytm i stället för glesa ensam-ringar.
    // Ringarna siktar mot VÄXLANDE höjder (sicksack), var tredje följer tätt efter sin
    // föregångare på kontrasterande höjd, och stjärnorna bildar en BÅGE man skördar
    // genom att glida i en kurva mellan ringarna. Höjd-hint följer med i kön (y).
    const LO = 300
    const HI = 500
    let zig = Math.random() < 0.5
    const q = []
    // Stjärn-båge från höjd a till höjd b (böjer mjukt uppåt på mitten).
    const arc = (a, b, cnt) => {
      for (let s = 0; s < cnt; s++) {
        const t = (s + 1) / (cnt + 1)
        q.push({ type: 'star', gap: 130, y: a + (b - a) * t - Math.sin(t * Math.PI) * 80 })
      }
    }
    let forraY = null
    for (let i = 0; i < n; i++) {
      const y = zig ? LO : HI
      let ringGap = i === 0 ? 220 : i % 3 === 0 ? 280 : 380
      // Uppvind: en luftpelare strax före en ring som sitter HÖGRE än den förra — lyft åt det håll hon
      // ändå ska. Pelaren tar en del av ringens lucka (takten är oförändrad), toppen ligger vid ringens höjd.
      if (forraY != null && y < forraY) {
        const wg = Math.min(ringGap - 140, 170 + Math.random() * 60)
        q.push({ type: 'upp', gap: wg, topY: clamp(y + (Math.random() * 40 - 20), 240, 540), halv: KOL_HALV - 6 + Math.random() * 16 })
        ringGap -= wg
      }
      q.push({ type: 'ring', kind: kinds[i], gap: ringGap, y })
      forraY = y
      zig = !zig
      // Stjärn-båge som leder från senaste ringen mot nästa rings höjd.
      if (stars > 0) arc(y, zig ? LO : HI, stars + 1)
    }
    this._toSpawn = q

    // Progress-pips (otända).
    this._buildPips()

    // Enhörningen studsar in på sin plats.
    if (this._uni && !this._uni.destroyed) {
      this._uniEmoji.rotation = 0
      bounceIn(this._uni, { duration: 0.4 })
    }
  },

  // Ringtyper för en nivå. 'vanlig' · 'blom' · 'moln' = 1 pip, 'regnbage' = 2 pips.
  _planKinds(target, L) {
    const pool = ['vanlig', 'blom', 'moln']
    if (L === 0) return shuffle(pool).slice(0, target)
    let left = target
    const kinds = []
    const rb = target >= 5 && Math.random() < 0.5 ? 2 : 1
    for (let i = 0; i < rb; i++) {
      kinds.push('regnbage')
      left -= 2
    }
    // Olika sorter i tur och ordning (blandat), så inte tre blommor i rad.
    let bag = []
    while (left > 0) {
      if (!bag.length) bag = shuffle(pool)
      kinds.push(bag.pop())
      left--
    }
    const out = shuffle(kinds)
    // Första ringen är aldrig en regnbåge — man ska hinna sikta in sig.
    if (out[0] === 'regnbage') {
      const j = out.findIndex((k) => k !== 'regnbage')
      if (j > 0) [out[0], out[j]] = [out[j], out[0]]
    }
    return out
  },

  _buildPips() {
    const layer = this._pips
    if (!layer || layer.destroyed) return
    for (const c of [...layer.children]) c.destroy()
    this._pipNodes = []
    const n = this._target
    const gap = 58
    const startX = -((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      const g = new Graphics()
      drawPip(g, false, PLAYFUL[i % PLAYFUL.length])
      g.x = startX + i * gap
      layer.addChild(g)
      this._pipNodes.push(g)
    }
  },

  // Pipen fylls med RINGENS färg — barnet ser att det var just den ringen som räknades.
  _lightPip(i, color) {
    const g = this._pipNodes[i]
    if (!g || g.destroyed) return
    drawPip(g, true, color ?? PLAYFUL[i % PLAYFUL.length])
    pop(g, { scale: 1.3 })
  },

  // ---- Spawn ---------------------------------------------------------------

  _spawnRing(ctx, hintY, kind = 'vanlig') {
    if (!this._alive) return
    const R = this._R
    const { view: ring, acc, color } = makeRingView(kind, R)
    // Efter ett par missar: centrera ringen på enhörningen -> garanterad passage.
    // Annars sikta mot köns höjd-hint (sicksack) med lite slump; utan hint = fritt.
    const ry0 =
      this._missStreak >= 2
        ? clamp(this._uni.y, 240, 540)
        : hintY != null
          ? clamp(hintY + (Math.random() * 60 - 30), 240, 540)
          : 240 + Math.random() * 300
    ring.x = SPAWN_X
    ring.y = ry0
    this._field.addChild(ring)
    bounceIn(ring, { duration: 0.3 })
    this._rings.push({
      view: ring,
      kind,
      acc,
      color,
      R,
      ry0,
      ry: ry0,
      bobSpeed: 0.03 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      done: false,
    })
  },

  _spawnStar(ctx, hintY) {
    if (!this._alive) return
    // RITAD stjärna (P0 ASSETS) — var en ⭐-emoji.
    const view = new Graphics()
    const spts = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
      const rr = i % 2 ? 12 : 27
      spts.push(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    view.poly(spts).fill(0xffd24a).stroke({ width: 3, color: 0xd9a021 })
    view.circle(-7, -8, 5).fill({ color: 0xffffff, alpha: 0.65 })
    view.x = SPAWN_X
    view.y = hintY != null ? clamp(hintY, 200, 560) : 220 + Math.random() * 340
    view.eventMode = 'none'
    this._field.addChild(view)
    bounceIn(view, { duration: 0.3 })
    this._stars.push({ view })
  },

  // ---- Integrator + scroll + kollision (ticker) ----------------------------

  _update(ctx, tk) {
    if (!this._alive || this._resolving) return
    const dt = Math.min(2, (tk.deltaMS || 16.67) / 16.67)
    this._t += dt
    const uni = this._uni
    if (!uni || uni.destroyed) return
    const speed = (this._slow ? 1.5 : 2.6) * dt

    // 0. Uppvinden: pelarna glider med världen; luften vid henne läses ur samma Vindfalt som bilden ritas av.
    const luft = this._stegaUppvind(ctx, speed, dt)

    // 1. Styr-input: fjäder mot fingret.
    if (this._steering) this._vy += (clamp(this._fingerY, Y_MIN, Y_MAX) - uni.y) * STEER * dt // (oförändrad flygfysik)
    // 2. Dämpning (glid-momentum).
    this._vy *= Math.pow(DAMP, dt)
    // 2b. Uppvind: luftens fart mot hennes (motstånd relativt luften) — hon lyfts, fingret styr ändå.
    this._vy = uppvindSteg(this._vy, luft, dt, DAMP)
    // 3. Mjuk auto-magnet mot nästa opassade ring (förlåtande sikte).
    const nextRing = this._nextRing()
    if (nextRing) {
      const ahead = nextRing.view.x - UNI_X
      if (ahead > 0 && ahead < 160) {
        const a = this._missStreak >= 2 ? ASSIST_HELP : ASSIST
        this._vy += (nextRing.ry - uni.y) * a * dt
      }
    }
    // 4. Hastighetstak.
    this._vy = clamp(this._vy, -MAXV, MAXV)
    // 5. Integrera.
    uni.y += this._vy * dt
    // 6. Mjuka gränser (lekfull studs vid nudd).
    if (uni.y < Y_MIN) {
      uni.y = Y_MIN
      this._vy *= -0.4
      this._edgePuff(ctx, uni.y)
    } else if (uni.y > Y_MAX) {
      uni.y = Y_MAX
      this._vy *= -0.4
      this._edgePuff(ctx, uni.y)
    }
    // 8. Enhörningen LEVER: galopp-bob (mjuk y-oscillation kopplad till _t),
    //    vingslag (liten höjd-puls) och huvudet lutar mot NÄSTA ring (blick framåt)
    //    utöver farten. Allt kosmetiskt — rör inte kollisions-y (uni.y).
    const gallop = this._t * 0.28
    this._uniEmoji.y = Math.sin(gallop) * 4
    this._uniEmoji.scale.set(1, 1 + Math.sin(gallop) * 0.05)
    // Vingen flaxar i galoppens takt (den var en egen nod för just det, men stod still).
    const wing = this._uniEmoji._wing
    // I uppvind flaxar vingen snabbare och högre (egen fas, så takten byts utan hopp).
    this._wingP += dt * 0.28 * (1 + 1.6 * this._lyftK)
    if (wing && !wing.destroyed) wing.rotation = Math.sin(this._wingP) * (0.32 + 0.22 * this._lyftK)
    const aim = nextRing ? clamp((nextRing.ry - uni.y) * 0.0016, -0.13, 0.13) : 0
    this._uniEmoji.rotation = clamp(this._vy * 0.01 + aim, -0.22, 0.22)

    // 7. Världs-scroll.
    for (const c of this._parallax.children) {
      c.x -= speed * 0.45
      if (c.x < -150) c.x = 1430 + Math.random() * 60
    }
    this._scrollBackdrops(ctx, speed)

    // Regnbågsremsan: en ny punkt vid svansen, alla äldre glider bakåt med världen.
    const tr = this._trail
    for (const p of tr) p.x -= speed
    tr.push({ x: UNI_X - 50, y: uni.y + 14 })
    while (tr.length && tr[0].x < UNI_X - 50 - 300) tr.shift()
    this._drawRibbon()

    // Ringar: bob -> rörelse -> korsnings-kollision -> recykla.
    for (let i = this._rings.length - 1; i >= 0; i--) {
      const r = this._rings[i]
      const v = r.view
      if (!v || v.destroyed) {
        this._rings.splice(i, 1)
        continue
      }
      r.ry = r.ry0 + Math.sin(this._t * r.bobSpeed + r.phase) * this._bobAmp
      v.y = r.ry
      // Ringens glitter-fyrudd tindrar (vilo-liv): vrider sig och pulserar i egen fas.
      if (r.acc && !r.acc.destroyed) {
        r.acc.rotation = Math.sin(this._t * 0.06 + r.phase) * 0.5
        r.acc.scale.set(1 + 0.18 * Math.sin(this._t * 0.12 + r.phase))
      }
      const prevX = v.x
      v.x -= speed
      if (!r.done && prevX > UNI_X && v.x <= UNI_X) {
        r.done = true
        const d = Math.abs(uni.y - r.ry)
        if (d < r.R) this._onRingPassed(ctx, r)
        else this._onRingMiss(ctx, r)
      }
      if (v.x < -120) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
        this._rings.splice(i, 1)
      }
    }

    // Stjärnor: rörelse -> samling -> recykla.
    for (let i = this._stars.length - 1; i >= 0; i--) {
      const s = this._stars[i]
      const v = s.view
      if (!v || v.destroyed) {
        this._stars.splice(i, 1)
        continue
      }
      v.x -= speed
      if (!s.gone && Math.hypot(UNI_X - v.x, uni.y - v.y) < STAR_R) {
        s.gone = true
        this._onStar(ctx, v)
        this._stars.splice(i, 1)
        continue
      }
      if (v.x < -120) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
        this._stars.splice(i, 1)
      }
    }

    // Spawn nästa köade objekt när det scrollats tillräckligt.
    this._dist += speed
    if (this._toSpawn.length && this._dist >= this._toSpawn[0].gap) {
      const item = this._toSpawn.shift()
      this._dist = 0
      if (item.type === 'ring') this._spawnRing(ctx, item.y, item.kind)
      else if (item.type === 'upp') this._spawnUppvind(item)
      else this._spawnStar(ctx, item.y)
    }

    // Glitter-svans bakom henne när hon rör sig — tätare/bredare vid hög fart.
    this._tailT += tk.deltaMS || 16.67
    const fast = Math.abs(this._vy) > 6 || this._lyftK > 0.5
    if ((this._steering || Math.abs(this._vy) > 1.5 || this._lyftK > 0.3) && this._tailT > (fast ? 130 : 250)) {
      this._tailT = 0
      sparkle(this._tail, UNI_X - 52, uni.y + (Math.random() - 0.5) * (fast ? 40 : 24), { count: fast ? 5 : 3 })
    }

    // Tyst om-cue om ingen rört skärmen på ett tag.
    this._idle += (tk.deltaMS || 16.67) / 1000
    // V21: tomgången räknas från TYSTNAD — påminnelsen får aldrig kapa en replik som talar.
    if (ctx.services.voice.talar) this._idle = 0
    if (this._idle > IDLE_DELAY) {
      this._idle = 0
      this._recue(ctx)
    }
  },

  // ---- Uppvind -------------------------------------------------------------

  // Pelarna glider med världen (x), luften vid enhörningen läses ur `Vindfalt` (uppvind.js — samma tal
  // som bilden ritas av) och returneras som lufthastighet (px/bildruta, ≤ 0). Reaktionen (ljud, vinge,
  // gnistor) hänger på den mjukade styrkan `_lyftK`.
  _stegaUppvind(ctx, speed, dt) {
    const lista = this._uppv
    const uni = this._uni
    const tS = this._t / 60
    for (let i = lista.length - 1; i >= 0; i--) {
      const u = lista[i]
      u.x -= speed
      if (u.x < -(u.halv + 90)) {
        this._rivEnUppvind(u)
        lista.splice(i, 1)
        continue
      }
      u.vind.flytta(u.x, KOL_BOTTEN)
      u.vy.rot.x = u.x
    }
    const l = luftHos(lista.map((u) => u.vind), UNI_X, uni.y)
    const w = l.w
    this._lyftK += (l.k - this._lyftK) * Math.min(1, 0.2 * dt)
    for (const u of lista) {
      const o = u.vind.luftVid(UNI_X, uni.y)
      const k = o ? Math.min(1, -o.vy / KOL_LUFT) : 0
      u.vy.uppdatera(tS, k, clamp((SPAWN_X - u.x) / 90, 0, 1))
    }
    if (l.k > 0.25 && !this._uppPa) {
      this._uppPa = true
      this._uppInne(ctx)
    } else if (l.k < 0.08) {
      this._uppPa = false
    }
    return w
  },

  // Hon flyger in i en luftpelare: stigande klang (stämd, G4 → G5), gnistor och ett hopp av Elvira.
  _uppInne(ctx) {
    if (!this._alive) return
    const au = ctx.services.audio
    au.tone({ freq: 392, slideTo: 784, dur: 0.38, type: 'sine', vol: 0.2 })
    au.tone({ freq: 587, slideTo: 1175, dur: 0.3, type: 'triangle', vol: 0.1, delay: 0.08 })
    sparkle(ctx.fxLayer, UNI_X, this._uni.y + 24, { count: 6 })
    if (this._rider && !this._rider.destroyed) pop(this._rider, { scale: 1.1 })
    if (!this._uppSagt && !ctx.services.voice.talar) {
      this._uppSagt = true
      ctx.services.voice.say('Uppåt med vinden!')
    }
  },

  _spawnUppvind(item) {
    if (!this._alive) return
    const vy = nyUppvindsvy(item.topY, item.halv, Math.random())
    vy.rot.x = SPAWN_X
    vy.uppdatera(this._t / 60, 0, 0) // före första bilden: löven ska inte stå i origo
    this._uppLayer.addChild(vy.rot)
    const vind = nyKolumn({ topY: item.topY, halv: item.halv, x: SPAWN_X })
    this._uppv.push({ vind, vy, x: SPAWN_X, halv: item.halv })
  },

  _rivEnUppvind(u) {
    u.vind?.destroy()
    u.vy?.riv()
  },

  _rivUppvind() {
    for (const u of this._uppv) this._rivEnUppvind(u)
    this._uppv = []
  },

  _nextRing() {
    let best = null
    for (const r of this._rings) {
      if (r.done || !r.view || r.view.destroyed) continue
      if (r.view.x <= UNI_X) continue
      if (!best || r.view.x < best.view.x) best = r
    }
    return best
  },

  _edgePuff(ctx, y) {
    const now = performance.now()
    if (now - this._lastSoft > 180) {
      this._lastSoft = now
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, UNI_X, y, { count: 4 })
    }
  },

  // ---- Träffar -------------------------------------------------------------

  _onRingPassed(ctx, r) {
    if (!this._alive) return
    const uni = this._uni
    this._missStreak = 0
    this._idle = 0
    // Varje ringtyp har sitt eget ljud (stämd skala, C-dur-pentatonik) och sin egen bild.
    const au = ctx.services.audio
    const kind = r.kind || 'vanlig'
    if (kind === 'regnbage') {
      // Regnbågen: en stigande arpeggio + stor gnistkaskad, och räknas som TVÅ pips.
      au.sfx('pling')
      ;[523, 659, 784, 1047].forEach((f, i) => au.tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.3, delay: i * 0.07 }))
      sparkle(ctx.fxLayer, UNI_X, uni.y, { count: 16 })
      floatText(ctx.fxLayer, UNI_X, uni.y - 64, '🌈', { fontSize: 64 })
    } else if (kind === 'blom') {
      // Blomringen: mjuk klockklang och kronblad i blomfärger.
      au.sfx('pling')
      au.tone({ freq: 784, slideTo: 988, dur: 0.22, type: 'sine', vol: 0.3 })
      burst(ctx.fxLayer, UNI_X, uni.y, { count: 12, colors: [0xff9ec4, 0xffd24a, 0xffffff, 0xc9a7ff] })
      floatText(ctx.fxLayer, UNI_X, uni.y - 60, '🌸', { fontSize: 52 })
    } else if (kind === 'moln') {
      // Molnringen: luftigt "puff" med lägre, mjukare ton.
      au.sfx('pop')
      au.tone({ freq: 392, slideTo: 523, dur: 0.26, type: 'sine', vol: 0.28 })
      puff(ctx.fxLayer, UNI_X, uni.y, { count: 12, color: 0xffffff })
      sparkle(ctx.fxLayer, UNI_X, uni.y, { count: 5 })
      floatText(ctx.fxLayer, UNI_X, uni.y - 60, '⭐', { fontSize: 52 })
    } else {
      // Magiskt genomflygnings-ljud: ljus attack + två uppåt-glidande skimmer-toner.
      au.sfx('pling')
      au.tone({ freq: 700, slideTo: 1180, dur: 0.2, type: 'sine', vol: 0.34 })
      au.tone({ freq: 1050, slideTo: 1760, dur: 0.24, type: 'sine', vol: 0.2, delay: 0.05 })
      sparkle(ctx.fxLayer, UNI_X, uni.y, { count: 8 })
      floatText(ctx.fxLayer, UNI_X, uni.y - 60, '⭐', { fontSize: 56 })
    }
    this._ringBurst(ctx, r)
    if (this._rider && !this._rider.destroyed) pop(this._rider, { scale: 1.14 })

    // Pips: regnbågen tänder två (den andra strax efter), allt klämt mot målet.
    const val = kind === 'regnbage' ? 2 : 1
    const first = this._ringsDone
    this._passed++
    this._ringsDone = Math.min(this._target, first + val)
    this._lightPip(first, r.color)
    if (val === 2 && first + 1 < this._target) {
      ctx.later(0.14, () => { if (this._alive) this._lightPip(first + 1, 0xa78bfa) })
    }
    // Målet närmar sig för varje tänd pip.
    this._goTo(this._ringsDone / this._target, 0.9)
    if (this._gate && !this._gate.destroyed) pop(this._gate._art, { scale: 1.1 })

    if (this._ringsDone >= this._target) {
      this._win(ctx)
      return
    }
    if (kind === 'regnbage') {
      // Ett utrop på ett ögonblick: hoppas över om något redan talar.
      if (!ctx.services.voice.talar) ctx.services.voice.say('Regnbåge!')
    } else if (this._passed % 3 === 0) {
      // Variation + sparsamt beröm var 3:e ring.
      au.sfx('reveal')
      ctx.services.voice.say(randomFrom(['Wow!', 'Bra fluget!', 'Hurra!']))
    }
  },

  // Ringen får ett EGET ögonblick vid genomflygning: den snäpper till, skickar ut en
  // färgvåg i sin egen färg och konfetti i samma ton — i stället för en generisk pop.
  // Vågen är en egen kortlivad Graphics i fxLayer (exit-säker proxy-tween).
  _ringBurst(ctx, r) {
    if (!r?.view || r.view.destroyed) return
    pop(r.view, { scale: 1.22 })
    const col = r.color ?? COLORS.purple
    const wave = new Graphics().circle(0, 0, r.R + 16).stroke({ width: 14, color: col })
    wave.position.set(r.view.x, r.ry)
    wave.eventMode = 'none'
    ctx.fxLayer.addChild(wave)
    const st = { s: 1, a: 0.85 }
    const tw = gsap.to(st, {
      s: 2.1,
      a: 0,
      duration: 0.45,
      ease: 'power2.out',
      onUpdate: () => {
        if (wave.destroyed) return
        wave.scale.set(st.s)
        wave.alpha = st.a
      },
      onComplete: () => { if (!wave.destroyed) wave.destroy() },
    })
    this._waveTweens = this._waveTweens || []
    this._waveTweens.push(tw)
    burst(ctx.fxLayer, r.view.x, r.ry, { count: 10, color: col })
  },

  _onRingMiss(ctx, r) {
    if (!this._alive) return
    wiggle(r.view)
    puff(ctx.fxLayer, r.view.x, r.ry, { count: 8 })
    const now = performance.now()
    if (now - this._lastSoft > 180) {
      this._lastSoft = now
      ctx.services.audio.sfx('soft')
    }
    if (now - this._lastHopp > 2600) {
      this._lastHopp = now
      ctx.services.voice.say('Hoppsan!')
    }
    this._missStreak++
    // Köa en extra ring så målet alltid förblir nåbart (banan tar aldrig slut).
    // Samma sort som den missade, så pip-summan alltid går att nå.
    this._toSpawn.push({ type: 'ring', kind: r.kind, gap: 520 })
  },

  _onStar(ctx, view) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('pop')
    sparkle(ctx.fxLayer, view.x, view.y, { count: 6 })
    // Stjärnan flyger ner i säcken (sparas mellan rundor). Exit-säker: tweena en proxy och rör
    // Pixi-noden bara om den lever; tweenen hålls i _starTws så destroy kan döda den.
    this._sackN++
    ctx.progress.setCustom('stjarnor', this._sackN)
    const st = { x: view.x, y: view.y, s: view.scale.x || 1 }
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    const tw = gsap.to(st, {
      x: SACK_X,
      y: SACK_Y,
      s: 0.45,
      duration: 0.65,
      ease: 'power2.in',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        view.x = st.x
        view.y = st.y
        view.scale.set(st.s)
        view.rotation += 0.18
      },
      onComplete: () => {
        const i = this._starTws.indexOf(tw)
        if (i >= 0) this._starTws.splice(i, 1)
        if (!view.destroyed) view.destroy()
        this._sackLand(ctx)
      },
    })
    this._starTws.push(tw)
  },

  // ---- Mål -----------------------------------------------------------------

  _win(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    const uni = this._uni
    // Vinstljud, beröm och konfettiregn kommer från complete() nedan — här bara det egna.
    if (uni && !uni.destroyed) pop(uni, { scale: 1.25 })
    burst(ctx.fxLayer, UNI_X, uni ? uni.y : 360)
    // Porten är framme: regnbågen blixtrar till där resan slutar.
    if (this._gate && !this._gate.destroyed) {
      pop(this._gate._art, { scale: 1.2 })
      sparkle(ctx.fxLayer, this._gate.x, this._gate.y - 140, { count: 14 })
    }

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete()

    this._winTimer?.kill()
    this._winTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._nextLevel(ctx)
    })
  },

  _nextLevel(ctx) {
    if (!this._alive) return
    this._level++
    if (this._uni && !this._uni.destroyed) {
      this._uni.y = 360
      this._uniEmoji.rotation = 0
    }
    this._vy = 0
    this._buildLevel(ctx)
    // Banan startar genast; orden väntar tills berömmet från complete() är klart (say()
    // kapar annars det). Nivå-token: en kö som hann bli inaktuell säger ingenting.
    const lvl = this._level
    ctx.narTyst(() => {
      if (!this._alive || this._level !== lvl) return
      ctx.services.voice.say('Fler ringar!')
    })
  },

  // ---- Styrning (egen vertikal pointer-logik) ------------------------------

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _steerDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._steering = true
    const ly = this._root.toLocal(e.global).y
    this._fingerY = clamp(ly, Y_MIN, Y_MAX)
    this._downY = ly
    this._downAt = performance.now()
    this._idle = 0
    ctx.services.audio.sfx('tap')
  },

  _steerMove(e) {
    if (!this._alive || !this._steering) return
    const ly = this._root.toLocal(e.global).y
    this._fingerY = clamp(ly, Y_MIN, Y_MAX)
    this._idle = 0
  },

  _steerUp() {
    if (!this._steering) return
    this._steering = false
    // Tap-fallback: kort tryck i övre/nedre halvan ger en mild höjd-impuls.
    const dt = performance.now() - this._downAt
    if (dt < 250) {
      const mid = (Y_MIN + Y_MAX) / 2
      this._vy += this._downY < mid ? -TAP_IMPULSE : TAP_IMPULSE
    }
    // (Annars: vy finns kvar -> hon glider ut mjukt, inget snäpp.)
  },

  _recue(ctx) {
    if (!this._alive || this._resolving) return
    ctx.services.voice.replayLast()
    // En kort breathe-puls på enhörningen + mild höjd-vink.
    if (this._uni && !this._uni.destroyed) {
      this._breatheTw?.kill()
      this._breatheTw = breathe(this._uni, { scale: 1.1, duration: 0.7 })
      gsap.delayedCall(1.8, () => {
        this._breatheTw?.kill()
        if (this._uni && !this._uni.destroyed) this._uni.scale.set(1)
      })
    }
    this._vy += this._uni && this._uni.y > (Y_MIN + Y_MAX) / 2 ? -4 : 4
  },

  // ---- Städning ------------------------------------------------------------

  _clearField() {
    for (const r of this._rings) {
      const v = r.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
      }
    }
    this._rings = []
    for (const s of this._stars) {
      const v = s.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
      }
    }
    this._stars = []
    this._rivUppvind()
  },

  // Ritar fart-ikonen: sköldpadda (långsamt) eller hare (snabbt). Anropas vid bygget
  // och vid varje växling — var tidigare 🐢/🐇-emoji.
  _drawSpeedIcon() {
    const g = this._slowIco
    if (!g || g.destroyed) return
    g.clear()
    if (this._slow) {
      g.ellipse(-24, 10, 9, 6).fill(0x8fd67a) // fötter
      g.ellipse(16, 12, 9, 6).fill(0x8fd67a)
      g.moveTo(-26, 2).quadraticCurveTo(0, -30, 26, 2).quadraticCurveTo(0, 12, -26, 2).fill(0x6f9c3f)
      for (let i = -1; i <= 1; i++) g.circle(i * 13, -6, 6).fill({ color: 0x9ec96a, alpha: 0.9 })
      g.circle(-32, -2, 10).fill(0x8fd67a) // huvud
      g.circle(-35, -4, 2.6).fill(0x33291f)
    } else {
      g.ellipse(-6, 12, 20, 13).fill(0xf4ede3) // kropp
      g.circle(10, 0, 13).fill(0xf4ede3) // huvud
      g.ellipse(8, -20, 5, 15).fill(0xf4ede3) // öron
      g.ellipse(18, -19, 5, 15).fill(0xf4ede3)
      g.ellipse(8, -20, 2.5, 10).fill(0xf6c2d3)
      g.ellipse(18, -19, 2.5, 10).fill(0xf6c2d3)
      g.circle(14, -2, 2.6).fill(0x33291f)
      g.circle(20, 3, 3).fill(0xe79ab0) // nos
      g.circle(-24, 12, 7).fill(0xfffaf3) // svans
    }
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._winTimer?.kill()
    this._breatheTw?.kill()
    ;(this._waveTweens || []).forEach((t) => t.kill())
    this._waveTweens = []
    this._fadeTw?.kill()
    this._fadeTw = null
    this._goalTw?.kill()
    this._goalTw = null
    ;(this._starTws || []).forEach((t) => t.kill())
    this._starTws = []
    this._sack?._fxLiv?.kill()
    if (this._sack && !this._sack.destroyed) gsap.killTweensOf(this._sack.scale)
    if (this._gate && !this._gate.destroyed && this._gate._art) gsap.killTweensOf(this._gate._art.scale)
    if (this._rider && !this._rider.destroyed) gsap.killTweensOf(this._rider.scale)

    if (this._pad && !this._pad.destroyed) {
      this._pad.off('pointerdown', this._onDown)
      this._pad.off('globalpointermove', this._onMove)
      this._pad.off('pointerup', this._onUp)
      this._pad.off('pointerupoutside', this._onUp)
    }
    if (this._slowBtn && !this._slowBtn.destroyed) this._slowBtn.off('pointertap', this._onSlow)

    if (this._uni && !this._uni.destroyed) {
      gsap.killTweensOf(this._uni)
      gsap.killTweensOf(this._uni.scale)
    }
    for (const g of this._pipNodes) {
      if (g && !g.destroyed) gsap.killTweensOf(g.scale)
    }
    for (const r of this._rings) {
      const v = r.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    }
    for (const s of this._stars) {
      const v = s.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    }
    this._rings = []
    this._stars = []
    this._rivUppvind()
    if (this._slowBtn && !this._slowBtn.destroyed) gsap.killTweensOf(this._slowBtn.scale)

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- programmatiska hjälpare ------------------------------------------------

// Stjärnsäckens synliga stjärnor (x, y, radie) — fylls på i ordning upp till sex.
const SACK_SPOTS = [[-9, -30, 11], [9, -34, 10], [0, -42, 12], [-19, -26, 9], [19, -27, 9], [3, -28, 10]]

const SACK_FARG = [[0xffd24a, 0xd9a021], [0xff9ec4, 0xd9688f], [0x7cc4ff, 0x4a8fcf], [0xc9a7ff, 0x8c62c9]]

function drawStar(g, x, y, r, fill, line) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    const rr = i % 2 ? r * 0.45 : r
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  g.poly(pts).fill(fill).stroke({ width: 2, color: line, join: 'round' })
}

// Ritad stjärnsäck: lila tygpåse med knytband och en guldstjärna på magen. Stjärnorna
// som tittar upp ur öppningen ligger i ett eget lager BAKOM påsen (`_stars`).
function makeSack() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const stars = new Graphics()
  const body = new Container()
  const g = new Graphics()
  g.ellipse(0, 42, 38, 9).fill({ color: 0x000000, alpha: 0.1 })
  g.moveTo(-16, -16).quadraticCurveTo(-50, 6, -36, 34).quadraticCurveTo(0, 48, 36, 34).quadraticCurveTo(50, 6, 16, -16)
    .closePath().fill(0xb58cf0).stroke({ width: 3, color: 0x8c62c9, join: 'round' })
  g.ellipse(0, -16, 18, 7).fill(0x8c62c9)
  g.ellipse(-17, 8, 7, 14).fill({ color: 0xffffff, alpha: 0.25 })
  g.circle(-11, -14, 5).fill(0xff9ec4)
  g.circle(11, -14, 5).fill(0xff9ec4)
  drawStar(g, 0, 15, 13, 0xffd24a, 0xd9a021)
  body.addChild(g)
  c.addChild(stars, body)
  c._stars = stars
  c._body = body
  return c
}

// Regnbågsporten: sex färgband i en båge på två ben, med molnpuffar vid fötterna. Origo =
// marken mitt emellan benen; bilden ligger i `_art` (pop:as utan att röra målets x/skala).
function makeGate() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const art = new Container()
  art.eventMode = 'none'
  const g = new Graphics()
  const CY = -70
  for (let i = 0; i < RB.length; i++) {
    const r = 130 - i * 11
    const st = { width: 11.5, color: RB[i] }
    g.moveTo(-r, 0).lineTo(-r, CY).stroke(st)
    bage(g, 0, CY, r, Math.PI, Math.PI * 2).stroke(st)
    g.moveTo(r, CY).lineTo(r, 0).stroke(st)
  }
  for (const side of [-1, 1]) {
    const bx = side * 100
    g.circle(bx + 2, 8, 36).fill({ color: 0x000000, alpha: 0.06 })
    g.circle(bx, 0, 34).fill(0xffffff)
    g.circle(bx + side * 28, 8, 25).fill(0xffffff)
    g.circle(bx - side * 26, 10, 23).fill(0xffffff)
  }
  art.addChild(g)
  c.addChild(art)
  c._art = art
  return c
}

// En ring av given sort. Returnerar { view, acc, color }: `acc` = glitter-fyrudden (tindrar),
// `color` = färgen på vågen och pipen. Varje sort har egen silhuett, inte bara annan färg.
function makeRingView(kind, R) {
  const view = new Container()
  view.eventMode = 'none'
  const g = new Graphics()
  const Rr = R + 16
  let color
  let acc = null
  if (kind === 'regnbage') {
    color = 0xffd35c
    RB.forEach((col, i) => g.circle(0, 0, Rr + (i - 2.5) * 5).stroke({ width: 5.4, color: col }))
    g.circle(0, 0, Rr + 16).stroke({ width: 2, color: 0xffffff, alpha: 0.6 })
    acc = makeGlitter(Rr + 18)
  } else if (kind === 'blom') {
    color = randomFrom([0xff9ec4, 0xffd24a, 0xc9a7ff, 0xffb347])
    const FL = [0xff9ec4, 0xffffff, 0xffb347, 0xc9a7ff]
    const cnt = Math.max(8, Math.round((Rr * 2 * Math.PI) / 52))
    g.circle(0, 0, Rr).stroke({ width: 9, color: 0x6fbf6a })
    for (let i = 0; i < cnt; i++) {
      const a = ((i + 0.5) / cnt) * Math.PI * 2
      g.circle(Math.cos(a) * Rr, Math.sin(a) * Rr, 6.5).fill(0x57a857) // blad mellan blommorna
    }
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2
      const x = Math.cos(a) * Rr
      const y = Math.sin(a) * Rr
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 + i
        g.circle(x + Math.cos(pa) * 8, y + Math.sin(pa) * 8, 7.5).fill(FL[i % FL.length])
      }
      g.circle(x, y, 5.5).fill(0xffe27a)
    }
  } else if (kind === 'moln') {
    color = 0x6cb8ee
    const cnt = Math.max(10, Math.round((Rr * 2 * Math.PI) / 32))
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2
      g.circle(Math.cos(a) * Rr + 2, Math.sin(a) * Rr + 4, (i % 2 ? 17 : 21) + 1.5).fill(0xbcd8ee) // skugga
    }
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2
      g.circle(Math.cos(a) * Rr, Math.sin(a) * Rr, i % 2 ? 17 : 21).fill(0xffffff)
    }
  } else {
    color = randomFrom(PLAYFUL)
    g.circle(0, 0, Rr).stroke({ width: 18, color })
    g.circle(0, 0, Rr).stroke({ width: 6, color: 0xffffff, alpha: 0.5 })
    acc = makeGlitter(Rr)
  }
  view.addChild(g)
  if (acc) view.addChild(acc)
  return { view, acc, color }
}

// Ritad glitter-fyrudd (P0 ASSETS) — var en ✨-emoji. Sitter överst på ringen.
function makeGlitter(topY) {
  const acc = new Graphics()
  acc.moveTo(0, -20).quadraticCurveTo(3, -5, 19, 0).quadraticCurveTo(3, 5, 0, 20)
    .quadraticCurveTo(-3, 5, -19, 0).quadraticCurveTo(-3, -5, 0, -20).fill(0xffd24a)
  acc.circle(0, 0, 4).fill(0xfff3b0)
  acc.y = -topY
  return acc
}

// Liten parallax-molnpuff (vita cirklar + rundad bas).
function makeParallaxCloud(scale = 1) {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()
  const w = 60 * scale
  g.circle(-w * 0.7, 6 * scale, 22 * scale).fill({ color: 0xffffff, alpha: 0.9 })
  g.circle(0, -8 * scale, 32 * scale).fill({ color: 0xffffff, alpha: 0.9 })
  g.circle(w * 0.7, 6 * scale, 26 * scale).fill({ color: 0xffffff, alpha: 0.9 })
  g.roundRect(-w, 8 * scale, w * 2, 26 * scale, 16 * scale).fill({ color: 0xffffff, alpha: 0.9 })
  c.addChild(g)
  return c
}

// Rita en progress-pip (liten hoop): otänd = vit ring, tänd = fylld + vit kant.
function drawPip(g, lit, color) {
  g.clear()
  if (lit) {
    g.circle(0, 0, 20).fill(color).stroke({ width: 6, color: 0xffffff })
    g.circle(-6, -7, 5).fill({ color: 0xffffff, alpha: 0.5 }) // glans
  } else {
    g.circle(0, 0, 20).stroke({ width: 10, color: 0x7a9bb8, alpha: 0.5 }) // mörk kontur: syns mot ljus himmel
    g.circle(0, 0, 20).stroke({ width: 7, color: 0xffffff, alpha: 0.9 })
  }
}

// RITAD flygande enhörning (P0 ASSETS): kropp, ben, vingar, regnbågsman, horn och ansikte.
function makeUnicorn(R = 40) {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, R * 1.5, R * 0.9, R * 0.22).fill({ color: 0x000000, alpha: 0.12 })
  // bakre vinge
  g.moveTo(-R * 0.2, -R * 0.15).quadraticCurveTo(-R * 1.2, -R * 1.15, -R * 1.5, -R * 0.35)
    .quadraticCurveTo(-R * 0.95, -R * 0.1, -R * 0.2, -R * 0.15).fill(0xbfe9ff)
  // ben
  for (const bx of [-0.55, -0.22, 0.22, 0.55]) {
    g.roundRect(bx * R - R * 0.09, R * 0.55, R * 0.18, R * 0.68, R * 0.09).fill(0xfffdf7)
    g.roundRect(bx * R - R * 0.1, R * 1.08, R * 0.2, R * 0.18, R * 0.06).fill(0xf0c8e0)
  }
  g.ellipse(0, R * 0.28, R * 0.94, R * 0.6).fill(0xfffdf7) // kropp
  // svans i regnbågsfärger (RB = modulens regnbågsfärger)
  RB.forEach((col, i) => {
    g.moveTo(R * 0.85, R * 0.1 + i * 3)
      .quadraticCurveTo(R * 1.45, R * 0.1 + i * 6, R * 1.3, R * 0.85 + i * 3)
      .stroke({ width: 7, color: col, cap: 'round' })
  })
  g.ellipse(-R * 0.72, -R * 0.32, R * 0.44, R * 0.5).fill(0xfffdf7) // huvud
  g.moveTo(-R * 0.62, -R * 0.72).lineTo(-R * 0.5, -R * 1.24).lineTo(-R * 0.34, -R * 0.68)
    .closePath().fill(0xffd24a) // horn
  g.moveTo(-R * 0.56, -R * 0.86).lineTo(-R * 0.42, -R * 0.9)
    .moveTo(-R * 0.52, -R * 1.02).lineTo(-R * 0.42, -R * 1.04)
    .stroke({ width: 2, color: 0xd9a021 })
  g.moveTo(-R * 0.3, -R * 0.7).lineTo(-R * 0.16, -R * 0.98).lineTo(-R * 0.06, -R * 0.62)
    .closePath().fill(0xfffdf7) // öra
  // man
  RB.forEach((col, i) => {
    g.moveTo(-R * 0.34, -R * 0.66 + i * 5)
      .quadraticCurveTo(R * 0.1, -R * 0.8 + i * 5, R * 0.32, -R * 0.1 + i * 4)
      .stroke({ width: 8, color: col, cap: 'round' })
  })
  g.ellipse(-R * 1.02, -R * 0.16, R * 0.16, R * 0.12).fill(0xf0c8e0) // mule
  g.circle(-R * 1.06, -R * 0.2, R * 0.04).fill(0xd49ec0)
  g.circle(-R * 0.78, -R * 0.38, R * 0.09).fill(0x33291f) // öga
  g.circle(-R * 0.8, -R * 0.42, R * 0.035).fill(0xffffff)
  g.circle(-R * 0.62, -R * 0.16, R * 0.1).fill({ color: 0xff9ec4, alpha: 0.7 })
  // Enhörningen ritas vänstervänd men FLYGER åt höger — spegla i en inre container
  // så yttre tweens (skala/rotation) inte påverkas.
  const flip = new Container()
  flip.scale.x = -1
  flip.eventMode = 'none'
  flip.addChild(g)
  c.addChild(flip)
  // främre vinge (egen container så den kan flaxa)
  const wing = new Graphics()
  wing.moveTo(0, 0).quadraticCurveTo(-R * 0.95, -R * 1.25, -R * 1.35, -R * 0.3)
    .quadraticCurveTo(-R * 0.7, -R * 0.15, 0, 0).fill(0xdff0ff)
  wing.moveTo(-R * 0.2, -R * 0.16).quadraticCurveTo(-R * 0.8, -R * 0.7, -R * 1.15, -R * 0.34)
    .stroke({ width: 3, color: 0xa9d8ef, alpha: 0.9 })
  wing.position.set(R * 0.06, -R * 0.05)
  wing.eventMode = 'none'
  flip.addChild(wing)
  c._wing = wing
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
