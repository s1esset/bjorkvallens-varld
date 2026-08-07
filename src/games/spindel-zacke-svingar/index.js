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
import { pop, wiggle, sparkle, floatText, burst, breathe, bounceIn } from '../../lib/feedback.js'
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

const SWING_WORDS = ['Wii!', 'Hihi!', 'Sväva!']

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

    // Bakgrund (FÖRSTA barn): mjuk blå himmel + sol + drivande moln. Aldrig tryckbar.
    this._root.addChild(createScene('sky', { width: ctx.width, height: ctx.height }))

    // Hustaks-siluett (dekorativ).
    this._roofs = this._buildRoofs()
    this._root.addChild(this._roofs)

    // Fästen (knoppar + 🕸️) + mål-dekor (🐱/Elvira).
    this._anchorLayer = new Container()
    this._anchorLayer.eventMode = 'none'
    this._root.addChild(this._anchorLayer)

    // Nät-grafik (ritas om varje tick), under Zacke.
    this._web = new Graphics()
    this._web.eventMode = 'none'
    this._root.addChild(this._web)

    // Spök-båge (ritas vid längd-val, tonar bort själv), över nätet men under Zacke.
    this._ghost = new Graphics()
    this._ghost.eventMode = 'none'
    this._root.addChild(this._ghost)
    this._ghostTw = null
    this._winTweens = [] // vinstscenens proxy-tweens — dödas explicit i _buildLevel/destroy

    // Zacke (hjälte-figur).
    this._zacke = this._buildZacke()
    this._root.addChild(this._zacke)

    // Trycky-yta: osynlig heltäckande hit-rektangel över hela svingnings-rymden.
    this._sky = new Graphics().rect(0, 90, ctx.width, 430).fill({ color: 0xffffff, alpha: 0.001 })
    this._sky.eventMode = 'static'
    this._sky.hitArea = new Rectangle(0, 90, ctx.width, 430)
    this._hRelease = (e) => this._onSkyTap(ctx, e)
    this._sky.on('pointertap', this._hRelease)
    this._root.addChild(this._sky)

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
    this._root.addChild(this._lenBtn)

    // Nivå från sparad progress → oändlig variation.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._buildLevel(this._level)

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
  _levelConfig(level) {
    if (level <= 1) return { count: 3, gap: 300, mode: 'flat', yvar: 0 }
    if (level <= 3) return { count: 4, gap: 300, mode: 'var', yvar: 25 }
    if (level <= 5) return { count: 5, gap: 290, mode: 'zigzag', yvar: 0 }
    return { count: 6, gap: 300, mode: 'jitter', yvar: 30 }
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

    const cfg = this._levelConfig(level)
    const count = cfg.count
    const gap = Math.min(cfg.gap, 920 / (count - 1))
    const startX = 200 + (920 - gap * (count - 1)) / 2

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
        elvira.position.set(Math.min(a.x + 80, 1230), ROOF_Y)
        this._anchorLayer.addChild(elvira)
        this._elvira = elvira
      }
    })

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
    bounceIn(z)
    this._drawWeb()
  },

  // ------------------------------------------------------------------ figurer
  _buildZacke() {
    const c = new Container()
    c.eventMode = 'none'
    // Svag glöd-ring (han svävar).
    c.addChild(new Graphics().circle(0, 0, 40).stroke({ color: 0xffffff, alpha: 0.25, width: 4 }))
    // Kropp (hjälte-dräkt) + armar + ben.
    const body = new Graphics()
    body.roundRect(-26, 2, 12, 28, 6).fill(COLORS.red) // vänster arm
    body.roundRect(14, 2, 12, 28, 6).fill(COLORS.red) // höger arm
    body.roundRect(-16, -2, 32, 40, 12).fill(COLORS.blue) // bål
    body.circle(0, 14, 7).fill(COLORS.red) // bröst-emblem
    body.roundRect(-13, 34, 11, 22, 5).fill(COLORS.blue) // vänster ben
    body.roundRect(2, 34, 11, 22, 5).fill(COLORS.blue) // höger ben
    c.addChild(body)
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

  _buildRoofs() {
    const g = new Graphics()
    g.eventMode = 'none'
    const tops = [COLORS.red, COLORS.teal, COLORS.red, COLORS.teal, COLORS.red, COLORS.teal]
    const n = 6
    const w = 1280 / n
    for (let i = 0; i < n; i++) {
      const x = i * w
      const wallTop = 540 + (i % 2) * 15
      g.roundRect(x + 6, wallTop, w - 12, 720 - wallTop, 10).fill(COLORS.brown) // vägg
      g.moveTo(x, wallTop + 10).lineTo(x + w / 2, wallTop - 55).lineTo(x + w, wallTop + 10).closePath().fill(tops[i % tops.length]) // tak
      if (i % 2) g.roundRect(x + w * 0.68, wallTop - 30, 16, 36, 4).fill(COLORS.brown) // skorsten
      g.roundRect(x + w * 0.5 - 16, wallTop + 50, 32, 40, 5).fill(COLORS.yellow) // fönster
    }
    return g
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
    for (let step = 1; y < ROOF_Y && x < 1300 && step < 240; step++) {
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
  _onSkyTap(ctx, e) {
    if (!this._alive || this._resolving) return
    if (this._state === 'swing') {
      this._release(ctx, false)
    } else {
      // Redan i flykt/firande → mjukt ljud + gnista där fingret är (aldrig straff;
      // P0 ÅTERKOPPLING: varje pekning ska ge ljud OCH bild).
      ctx.services.audio.sfx('soft')
      const p = this._root.toLocal(e.global)
      sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
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
        sparkle(ctx.fxLayer, this._zacke.x, this._zacke.y, { count: 6 })
        floatText(ctx.fxLayer, this._zacke.x, this._zacke.y - 60, randomFrom(SWING_WORDS))
      }
    }
    this._state = 'flight'
    ctx.services.audio.sfx('whoosh')
    sparkle(ctx.fxLayer, this._anchor.x, this._anchor.y, { count: 5 })
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
    sparkle(ctx.fxLayer, anchor.x, anchor.y, { count: 6 })
    floatText(ctx.fxLayer, z.x, z.y - 70, randomFrom(SWING_WORDS))
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
    const z = this._zacke
    const anchor = this._anchors[this._a]
    const L = this._ropeLen
    const startTheta = -0.9
    const destX = anchor.x + L * Math.sin(startTheta)
    const destY = anchor.y + L * Math.cos(startTheta)

    ctx.services.audio.sfx('soft')
    ctx.services.voice.say('Hoppsan! Molnet fångar dig.')
    floatText(ctx.fxLayer, z.x, z.y - 40, '😄', { fontSize: 48 })

    // RITAT moln (P0 ASSETS) — var en ☁️-emoji.
    const cloud = new Graphics()
    cloud.circle(-38, 6, 30).fill(0xfffdf7)
    cloud.circle(0, -14, 40).fill(0xfffdf7)
    cloud.circle(40, 4, 32).fill(0xfffdf7)
    cloud.roundRect(-56, 2, 112, 34, 17).fill(0xfffdf7)
    cloud.circle(-14, -20, 22).fill({ color: 0xffffff, alpha: 0.85 })
    cloud.position.set(z.x, z.y + 64)
    cloud.eventMode = 'none'
    ctx.fxLayer.addChild(cloud)

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
    const lx = Math.min(goal.x - 64, 1140)
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
          floatText(ctx.fxLayer, lx + 28, ly - 96, '❤️', { fontSize: 64, rise: 70, duration: 1.2 })
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
      burst(ctx.fxLayer, lx + 20, ly - 20, { count: 18 })
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
      z.rotation += 0.04 * dt
      const next = this._anchors[this._a + 1]
      // Förlåtande fäst-fönster: nå fram horisontellt utan att sjunka under taket.
      if (next && z.x >= next.x - 45 && z.y < ROOF_Y) {
        this._attach(ctx, this._a + 1)
      } else if (z.y >= ROOF_Y || z.x > 1240) {
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
    floatText(ctx.fxLayer, this._zacke.x, this._zacke.y - 60, '👆')
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
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
