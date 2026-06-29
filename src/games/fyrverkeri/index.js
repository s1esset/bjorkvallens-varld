// Fyrverkeri — en lugn partikel- och animationsshow (2–5 år). Tryck var som helst
// på natthimlen så stiger en raket upp och small i ett färgsprakande regn av glödande
// gnistor. Inget mål att missa: varje tryck ger en raket + mjukt ljud + glada ord.
// Efter ett gäng fyrverkerier kommer ett delat firande, sedan rullar leken vidare.
//
// EXIT-SÄKERHET: hela showen drivs av ticker-integration (egen hastighet/gravitation),
// INTE av gsap-tweens på Pixi-objekt. Partiklar ligger i arrayer och uppdateras varje
// bildruta; när de tonat ut tas de bort + förstörs. Eftersom tickern tas bort och
// this._root.destroy({children:true}) körs i destroy() kan ingen uppdatering någonsin
// skriva till ett förstört Pixi-objekt. Varje loop kollar ändå .destroyed defensivt.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { randomFrom } from '../../lib/swedish.js'
import { PLAYFUL } from '../../lib/theme.js'

const GRAVITY = 520 // px/s^2 — drar gnistorna mjukt nedåt så de bågar
const FW_PER_CELEBRATION = 6 // efter så här många fyrverkerier: delat firande
const PARTICLE_CAP = 700 // mjukt tak för prestanda
const STAR_COUNT = 20

// Ljusa, festliga nyanser till fyrverkerierna (PLAYFUL + några extra klara toner).
const HUES = [...PLAYFUL, 0xffffff, 0xffe27a, 0x9be3ff, 0xff7ad9]

export default {
  id: 'fyrverkeri',
  titleSv: 'Fyrverkeri',
  icon: '🎆',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'fyrverkeri',
  voiceIntro: 'Tryck på himlen så small fyrverkeriet!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._fired = 0
    this._lastVoice = 0
    this._rockets = [] // { g, x, y, vx, vy, targetY, color, trail }
    this._particles = [] // { g, x, y, vx, vy, grav, life, maxLife, baseR }

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Natthimmel (mörkblå -> indigo) + stilla tindrande stjärnor. Ej tryckbar.
    this._sky = makeNightSky(ctx.width, ctx.height)
    this._sky.eventMode = 'none'
    this._sky.interactiveChildren = false
    this._root.addChild(this._sky)

    this._stars = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 1.4 + Math.random() * 1.8
      const g = new Graphics().circle(0, 0, r).fill({ color: 0xfff6d8 })
      g.x = 40 + Math.random() * (ctx.width - 80)
      g.y = 24 + Math.random() * (ctx.height * 0.62) // mest i övre delen
      g.eventMode = 'none'
      this._sky.addChild(g)
      this._stars.push({
        g,
        base: 0.35 + Math.random() * 0.4,
        amp: 0.25 + Math.random() * 0.35,
        speed: 0.6 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      })
    }

    // 2) Hela scenen är tryckbar (skjut upp en raket mot fingret).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._catcher.on('pointertap', (ev) => {
      const p = this._root.toLocal(ev.global)
      this._launch(ctx, p.x, p.y)
    })
    this._root.addChild(this._catcher)

    // 3) Glödlager: alla raketer/gnistor ritas här med additiv blandning -> mjukt sken.
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._fx)

    this._tick = (t) => {
      if (!this._alive) return
      const dt = Math.min(t.deltaMS, 50) / 1000 // klampa vid hack så inget studsar

      // Stjärnor: mjuk alfa-puls.
      for (const s of this._stars) {
        if (s.g.destroyed) continue
        s.phase += s.speed * dt
        s.g.alpha = s.base + Math.sin(s.phase) * s.amp
      }

      // Raketer: stig uppåt, lämna en kort slöja, small vid målhöjd.
      for (let i = this._rockets.length - 1; i >= 0; i--) {
        const r = this._rockets[i]
        r.x += r.vx * dt
        r.y += r.vy * dt
        if (!r.g.destroyed) r.g.position.set(r.x, r.y)
        r.trail += t.deltaMS
        if (r.trail >= 16) {
          r.trail = 0
          this._spawnTrail(r.x, r.y, r.color)
        }
        if (r.y <= r.targetY) {
          this._burst(ctx, r.x, r.targetY, r.color)
          if (!r.g.destroyed) r.g.destroy()
          this._rockets.splice(i, 1)
        }
      }

      // Gnistor: hastighet + gravitation, tona ut, ta bort när slut.
      for (let i = this._particles.length - 1; i >= 0; i--) {
        const p = this._particles[i]
        p.life += dt
        const k = 1 - p.life / p.maxLife
        if (k <= 0 || p.g.destroyed) {
          if (!p.g.destroyed) p.g.destroy()
          this._particles.splice(i, 1)
          continue
        }
        p.vy += p.grav * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.g.position.set(p.x, p.y)
        p.g.alpha = Math.min(1, k * 1.6) // ljus start, mjuk uttoning
        p.g.scale.set(0.45 + k * 0.55)
      }

      // Stilla? Påminn vänligt och skjut ett eget fyrverkeri.
      this._idle += t.deltaMS / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        this._launch(ctx, 120 + Math.random() * (ctx.width - 240), 140 + Math.random() * (ctx.height * 0.35))
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // Ett par fyrverkerier direkt för att visa idén.
    this._launch(ctx, ctx.width * 0.4, ctx.height * 0.32)
    this._demoCall = gsap.delayedCall(0.6, () => {
      if (this._alive) this._launch(ctx, ctx.width * 0.62, ctx.height * 0.24)
    })
  },

  // Skjut upp en raket från botten mot (x, y).
  _launch(ctx, x, y) {
    if (!this._alive) return
    this._idle = 0
    const tx = Math.max(60, Math.min(ctx.width - 60, x))
    const ty = Math.max(110, Math.min(ctx.height * 0.72, y)) // small en bit upp
    const color = randomFrom(HUES)

    const g = new Graphics().circle(0, 0, 5).fill({ color: 0xffffff })
    g.blendMode = 'add'
    g.eventMode = 'none'
    g.position.set(tx, ctx.height + 8)
    this._fx.addChild(g)

    this._rockets.push({
      g,
      x: tx,
      y: ctx.height + 8,
      vx: 0,
      vy: -(720 + Math.random() * 220), // px/s uppåt
      targetY: ty,
      color,
      trail: 0,
    })

    ctx.services.audio.sfx('whoosh')
    this._sayTap(ctx)
  },

  // Kort, ljus slöja efter raketen (ingen gravitation, snabb utToning).
  _spawnTrail(x, y, color) {
    if (!this._alive) return
    const g = new Graphics().circle(0, 0, 3.2).fill({ color })
    g.blendMode = 'add'
    g.eventMode = 'none'
    g.position.set(x, y)
    this._fx.addChild(g)
    this._pushParticle({ g, x, y, vx: 0, vy: 30, grav: 0, life: 0, maxLife: 0.34 })
  },

  // Smällen: 18–30 gnistor radiellt utåt i varierad fart, bågar nedåt och tonar ut.
  _burst(ctx, x, y, color) {
    if (!this._alive) return
    ctx.services.audio.sfx('pop')

    const n = 18 + ((Math.random() * 13) | 0) // 18–30
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.25
      const speed = 140 + Math.random() * 280
      const r = 4 + Math.random() * 5
      // De flesta gnistor i fyrverkeriets färg; några vita för glittret.
      const c = Math.random() < 0.18 ? 0xffffff : color
      const g = new Graphics().circle(0, 0, r).fill({ color: c })
      g.blendMode = 'add'
      g.eventMode = 'none'
      g.position.set(x, y)
      this._fx.addChild(g)
      this._pushParticle({
        g,
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        grav: GRAVITY,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4, // ~0.8–1.2s
      })
    }

    this._fired++
    if (this._fired % FW_PER_CELEBRATION === 0) ctx.progress.complete()
  },

  _pushParticle(p) {
    this._particles.push(p)
    // Mjukt tak: ta bort äldsta om vi spränger gränsen.
    if (this._particles.length > PARTICLE_CAP) {
      const old = this._particles.shift()
      if (old && !old.g.destroyed) old.g.destroy()
    }
  },

  // Glad svensk kommentar vid tryck — strypt så rösten inte hackar vid snabba tryck.
  _sayTap(ctx) {
    const now = performance.now()
    if (now - this._lastVoice < 900) return
    this._lastVoice = now
    ctx.services.voice.say(randomFrom(TAP_PHRASES))
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._demoCall?.kill()
    gsap.killTweensOf(this._root)
    // Inga gsap-tweens körs på partiklarna (allt drivs av tickern), men städa ändå
    // arrayerna och låt destroy({children:true}) förstöra alla Graphics i ett svep.
    this._rockets = []
    this._particles = []
    this._stars = []
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// Korta, glada repliker vid tryck (full svenska med å/ä/ö).
const TAP_PHRASES = ['Pang!', 'Titta så fint!', 'Wow!', 'Vilka färger!', 'En till!', 'Så vackert!']

// Natthimmel: lodrät gradient mörkblå (topp) -> indigo (botten), byggd av strimlor
// (Pixi v8-säkert, en enda Graphics, helt statisk).
function makeNightSky(w, h) {
  const top = 0x122a5c // djup natt-blå
  const bottom = 0x190b3d // indigo
  const g = new Graphics()
  const strips = 48
  const sh = h / strips
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1)
    g.rect(0, i * sh, w, sh + 1).fill({ color: lerpColor(top, bottom, t) })
  }
  return g
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const gg = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (gg << 8) | bl
}
