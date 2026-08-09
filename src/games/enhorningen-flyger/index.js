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
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { COLORS, PLAYFUL, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { makeElvira } from '../../lib/figurer.js'
import { sparkle, puff, wiggle, pop, bounceIn, breathe, floatText, burst, bigCelebration , kvittera} from '../../lib/feedback.js'

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
const STAR_R = 60 // samlingsradie för stjärnor
const IDLE_DELAY = 6 // s utan input -> mild om-cue

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

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST: mjuk blå gradient + sol + drivande moln (dekorativ).
    this._root.addChild(createScene('sky', { ground: false, width: ctx.width, height: ctx.height }))

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

    // Fält för ringar + stjärnor.
    this._field = new Container()
    this._field.eventMode = 'none'
    this._field.interactiveChildren = false
    this._root.addChild(this._field)

    // Glitter-svans (bakom enhörningen).
    this._tail = new Container()
    this._tail.eventMode = 'none'
    this._tail.interactiveChildren = false
    this._root.addChild(this._tail)

    // Enhörningen (Elvira).
    this._makeUnicorn(ctx)

    // Progress-pips (topp-mitt).
    this._pips = new Container()
    this._pips.position.set(ctx.width / 2, 120)
    this._pips.eventMode = 'none'
    this._pips.interactiveChildren = false
    this._root.addChild(this._pips)

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
    const rider = makeElvira(58)
    rider.position.set(13, 4)
    rider.scale.x = -1 // vänd åt flygriktningen (enhörningen ser åt vänster)
    uni.addChild(rider)
    this._rider = rider

    uni.position.set(UNI_X, 360)
    // Mjuk skuggellips under.
    const shadow = new Graphics().ellipse(0, 56, 46, 14).fill({ color: COLORS.shadow, alpha: 1 })
    shadow.alpha = 0.12
    uni.addChild(shadow)
    // Enhörnings-emoji (roteras lätt mot vy).
    // RITAD flygande enhörning (P0 ASSETS) — var en 🦄-emoji.
    this._uniEmoji = makeUnicorn()
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
    this._missStreak = 0
    this._dist = 0
    this._resolving = false

    // Bygg spawn-kö: tätare, mer varierad rytm i stället för glesa ensam-ringar.
    // Ringarna siktar mot VÄXLANDE höjder (sicksack), var tredje får ett tätt
    // syskon-par på kontrasterande höjd, och stjärnorna bildar en BÅGE man skördar
    // genom att glida i en kurva mellan ringarna. Höjd-hint följer med i kön (y).
    const LO = 300
    const HI = 500
    let zig = Math.random() < 0.5
    const q = []
    // Stjärn-båge från höjd a till höjd b (böjer mjukt uppåt på mitten).
    const arc = (a, b, n) => {
      for (let s = 0; s < n; s++) {
        const t = (s + 1) / (n + 1)
        q.push({ type: 'star', gap: 130, y: a + (b - a) * t - Math.sin(t * Math.PI) * 80 })
      }
    }
    for (let i = 0; i < target; i++) {
      const y = zig ? LO : HI
      q.push({ type: 'ring', gap: i === 0 ? 220 : 380, y })
      zig = !zig
      let lastY = y
      // Var tredje ring (ej första/sista): ett tätt syskon-par på motsatt höjd.
      if (i > 0 && i < target - 1 && i % 3 === 0) {
        lastY = zig ? LO : HI
        q.push({ type: 'ring', gap: 280, y: lastY })
        zig = !zig
      }
      // Stjärn-båge som leder från senaste ringen mot nästa rings höjd.
      if (stars > 0) arc(lastY, zig ? LO : HI, stars + 1)
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

  _buildPips() {
    const layer = this._pips
    if (!layer || layer.destroyed) return
    for (const c of [...layer.children]) c.destroy()
    this._pipNodes = []
    const n = this._target
    const gap = 50
    const startX = -((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      const g = new Graphics()
      drawPip(g, false, PLAYFUL[i % PLAYFUL.length])
      g.x = startX + i * gap
      layer.addChild(g)
      this._pipNodes.push(g)
    }
  },

  _lightPip(i) {
    const g = this._pipNodes[i]
    if (!g || g.destroyed) return
    drawPip(g, true, PLAYFUL[i % PLAYFUL.length])
    pop(g, { scale: 1.3 })
  },

  // ---- Spawn ---------------------------------------------------------------

  _spawnRing(ctx, hintY) {
    if (!this._alive) return
    const color = randomFrom(PLAYFUL)
    const R = this._R
    const ring = new Container()
    const g = new Graphics()
    g.circle(0, 0, R + 16).stroke({ width: 18, color })
    g.circle(0, 0, R + 16).stroke({ width: 6, color: 0xffffff, alpha: 0.5 })
    ring.addChild(g)
    // Ritad glitter-fyrudd (P0 ASSETS) — var en ✨-emoji.
    const acc = new Graphics()
    acc.moveTo(0, -20).quadraticCurveTo(3, -5, 19, 0).quadraticCurveTo(3, 5, 0, 20)
      .quadraticCurveTo(-3, 5, -19, 0).quadraticCurveTo(-3, -5, 0, -20).fill(0xffd24a)
    acc.circle(0, 0, 4).fill(0xfff3b0)
    acc.y = -(R + 16)
    ring.addChild(acc)
    ring.eventMode = 'none'
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

    // 1. Styr-input: fjäder mot fingret.
    if (this._steering) this._vy += (clamp(this._fingerY, Y_MIN, Y_MAX) - uni.y) * STEER * dt
    // 2. Dämpning (glid-momentum).
    this._vy *= Math.pow(DAMP, dt)
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
    const aim = nextRing ? clamp((nextRing.ry - uni.y) * 0.0016, -0.13, 0.13) : 0
    this._uniEmoji.rotation = clamp(this._vy * 0.01 + aim, -0.22, 0.22)

    // 7. Världs-scroll.
    const speed = (this._slow ? 1.5 : 2.6) * dt
    for (const c of this._parallax.children) {
      c.x -= speed * 0.45
      if (c.x < -150) c.x = 1430 + Math.random() * 60
    }

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
      if (item.type === 'ring') this._spawnRing(ctx, item.y)
      else this._spawnStar(ctx, item.y)
    }

    // Glitter-svans bakom henne när hon rör sig — tätare/bredare vid hög fart.
    this._tailT += tk.deltaMS || 16.67
    const fast = Math.abs(this._vy) > 6
    if ((this._steering || Math.abs(this._vy) > 1.5) && this._tailT > (fast ? 130 : 250)) {
      this._tailT = 0
      sparkle(this._tail, UNI_X - 52, uni.y + (Math.random() - 0.5) * (fast ? 40 : 24), { count: fast ? 5 : 3 })
    }

    // Tyst om-cue om ingen rört skärmen på ett tag.
    this._idle += (tk.deltaMS || 16.67) / 1000
    if (this._idle > IDLE_DELAY) {
      this._idle = 0
      this._recue(ctx)
    }
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
    // Magiskt genomflygnings-ljud: ljus attack + två uppåt-glidande skimmer-toner.
    const au = ctx.services.audio
    au.sfx('pling')
    au.tone({ freq: 700, slideTo: 1180, dur: 0.2, type: 'sine', vol: 0.34 })
    au.tone({ freq: 1050, slideTo: 1760, dur: 0.24, type: 'sine', vol: 0.2, delay: 0.05 })
    sparkle(ctx.fxLayer, UNI_X, uni.y, { count: 8 })
    floatText(ctx.fxLayer, UNI_X, uni.y - 60, '⭐', { fontSize: 56 })
    this._ringBurst(ctx, r)
    if (this._rider && !this._rider.destroyed) pop(this._rider, { scale: 1.14 })
    this._lightPip(this._ringsDone)
    this._ringsDone++
    // Variation + sparsamt beröm var 3:e ring.
    if (this._ringsDone % 3 === 0) {
      ctx.services.audio.sfx('reveal')
      ctx.services.voice.say(randomFrom(['Wow!', 'Bra fluget!', 'Hurra!']))
    }
    if (this._ringsDone >= this._target) this._win(ctx)
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
    this._toSpawn.push({ type: 'ring', gap: 520 })
  },

  _onStar(ctx, view) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('pop')
    sparkle(ctx.fxLayer, view.x, view.y, { count: 6 })
    floatText(ctx.fxLayer, view.x, view.y - 30, '⭐', { fontSize: 46 })
    // Exit-säker bort-tween: tweena en proxy, rör Text:en bara om den lever.
    const st = { s: view.scale.x || 1, a: 1, y: view.y }
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    const tw = gsap.to(st, {
      s: 1.6,
      a: 0,
      y: view.y - 40,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        view.alpha = st.a
        view.y = st.y
        view.scale.set(st.s)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy()
      },
    })
  },

  // ---- Mål -----------------------------------------------------------------

  _win(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    const uni = this._uni
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    if (uni && !uni.destroyed) pop(uni, { scale: 1.25 })
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, UNI_X, uni ? uni.y : 360)

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
    ctx.services.voice.say('Fler ringar!')
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
    if (this._slowBtn && !this._slowBtn.destroyed) gsap.killTweensOf(this._slowBtn.scale)

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- programmatiska hjälpare ------------------------------------------------

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
    g.circle(0, 0, 16).fill(color).stroke({ width: 5, color: 0xffffff })
  } else {
    g.circle(0, 0, 16).stroke({ width: 6, color: 0xffffff, alpha: 0.85 })
  }
}

// RITAD flygande enhörning (P0 ASSETS): kropp, ben, vingar, regnbågsman, horn och ansikte.
function makeUnicorn() {
  const c = new Container()
  const g = new Graphics()
  const R = 40
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
  // svans i regnbågsfärger
  const RB = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
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
