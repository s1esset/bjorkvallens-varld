// BLÄCKFISKEN OTTO — omgivningen: bubblor, den sena hjälpen (om-cue, lysande sak, pekande arm) och Ottos
// utseende (humör, blick, blinkning). Blandas in i spelets objekt (`this` = spelet).
import { Graphics } from 'pixi.js'
import { lerpColor } from '../../lib/scene.js'
import { OTTO_Y, clamp, slump, nolla, ritaOtto } from './konst.js'

export const omgivning = {
  // Små bubblor som stiger — bara en handfull samtidigt.
  _bubbla(x, y, r = slump(3, 7)) {
    if (this._bub.length >= 24 || !this._lFx) return
    const g = nolla(new Graphics())
    g.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.16 })
    g.circle(0, 0, r).stroke({ width: 1.8, color: 0xffffff, alpha: 0.65 })
    g.position.set(x, y)
    this._lFx.addChild(g)
    this._bub.push({ g, x, y, vy: slump(38, 74), fas: Math.random() * 6.28, r })
  },

  _bubblorSteg(dts) {
    this._bubbleT -= dts
    if (this._bubbleT <= 0 && this._fas === 'spel') {
      this._bubbleT = slump(1.6, 3.2)
      const o = this._otto
      this._bubbla(o.x + slump(-18, 18), OTTO_Y - 30)
      if (Math.random() < 0.5) this._bubbla(o.x + slump(-30, 30), OTTO_Y - 40)
      const v = this._vanner[(Math.random() * this._vanner.length) | 0]
      if (v) this._bubbla(v.c.x + slump(-20, 20), v.c.y - 40)
    }
    for (let i = this._bub.length - 1; i >= 0; i--) {
      const b = this._bub[i]
      b.y -= b.vy * dts
      b.fas += dts * 3
      b.g.position.set(b.x + Math.sin(b.fas) * 6, b.y)
      if (b.y < -20) {
        if (!b.g.destroyed) b.g.destroy()
        this._bub.splice(i, 1)
      }
    }
  },

  // ───────────────────────── HJÄLP (sent och synligt) ─────────────────────────

  _hjalpSteg(dts) {
    const voice = this._ctx.services.voice
    if (this._fas !== 'spel' || this._g) {
      this._idle = 0
      this._idleStg = 0
      return
    }
    if (voice.talar && this._idleStg === 0) {
      this._idle = 0
      return
    }
    this._idle += dts
    if (this._idleStg === 0 && this._idle > 6) {
      this._idleStg = 1
      if (!voice.talar) voice.say('Dra i en arm, så sträcker sig Otto.')
      this._vinka()
    } else if (this._idleStg === 1 && this._idle > 14) {
      this._idleStg = 2
      this._hjalp(true)
    } else if (this._idleStg >= 2 && this._idle > 14 + 10 * (this._idleStg - 1)) {
      this._idleStg++
      this._hjalp(false)
    }
  },

  _vinka() {
    const o = this._otto
    const fri = this._armar.filter((a) => a.mode === 'vila')
    const a = fri[(Math.random() * fri.length) | 0]
    if (!a) return
    a.mode = 'peka'
    a.pekT = 1.8
    a.pekMal = { x: o.x + a.sida * 70, y: OTTO_Y - 170 }
  },

  _hjalp(forsta) {
    const van = this._ordning.map((t) => this._vanner.find((v) => v.typ === t)).find((v) => v && !v.klar)
    if (!van) return
    const it = this._saker.find((s) => s.behov === van.typ && !s.klar)
    if (!it) return
    this._hjalpMal = it
    const o = this._otto
    let bast = null
    let bd = 1e9
    for (const a of this._armar) {
      if (a.mode !== 'vila') continue
      const d = Math.abs(a.rot(o.x, o.y).x - it.x)
      if (d < bd) {
        bd = d
        bast = a
      }
    }
    if (bast) {
      const r = bast.rot(o.x, o.y)
      const dx = r.x - it.x
      const dy = r.y - it.y
      const d = Math.hypot(dx, dy) || 1
      const avst = it.r + 70
      const pm = { x: it.x + (dx / d) * avst, y: it.y + (dy / d) * avst }
      bast.pekMal = bast.klipp(o.x, o.y, pm.x, pm.y)
      bast.mode = 'peka'
      bast.pekT = 3.2
    }
    const voice = this._ctx.services.voice
    if (forsta && !voice.talar) voice.say('Jag hjälper till!')
  },

  _ringSteg() {
    const g = this._g
    const it = g && g.mode === 'hall' ? g.sak : this._hjalpMal
    if (!it || it.klar || this._fas !== 'spel') {
      if (this._ring) this._ring.visible = false
      return
    }
    if (!this._ring || this._ring.destroyed) {
      this._ring = nolla(new Graphics())
      this._lSkugga.addChild(this._ring)
    }
    const r = this._ring
    r.visible = true
    const puls = 0.5 + 0.5 * Math.sin(this._tid * 6)
    r.clear()
    const hjalp = !(g && g.mode === 'hall')
    r.circle(it.x, it.y, it.r + 12 + puls * 6).fill({ color: hjalp ? 0xffe27a : 0xffffff, alpha: 0.2 + puls * 0.12 })
    r.circle(it.x, it.y, it.r + 12 + puls * 6).stroke({ width: 4, color: hjalp ? 0xffd35c : 0xffffff, alpha: 0.75 })
  },

  // ───────────────────────── OTTOS UTSEENDE ─────────────────────────

  _ottoVisa(dts) {
    const o = this._otto
    const bas = 0.12 + 0.2 * (this._klara / 3)
    if (this._fas === 'fest') o.humor = 1
    else o.humor += (bas - o.humor) * Math.min(1, dts * 0.45)
    o.farg = lerpColor(0x8d7be0, 0xff8fbc, clamp(o.humor, 0, 1))
    const g = this._g
    let tx = null
    let ty = null
    if (g) {
      const m = g.sak ? { x: g.sak.x, y: g.sak.y } : g.mode === 'dra' ? g.fing : g.mal
      if (m) {
        tx = m.x
        ty = m.y
      }
    } else if (this._hjalpMal) {
      tx = this._hjalpMal.x
      ty = this._hjalpMal.y
    }
    let lx = Math.sin(this._tid * 0.5) * 0.4
    let ly = 0.1
    if (tx != null) {
      const dx = tx - o.x
      const dy = ty - (OTTO_Y + 8)
      const d = Math.hypot(dx, dy) || 1
      const s = Math.min(1, d / 160)
      lx = (dx / d) * s
      ly = (dy / d) * s
    }
    const f = Math.min(1, dts * 9)
    o.look.x += (lx - o.look.x) * f
    o.look.y += (ly - o.look.y) * f
    o.blinkT -= dts
    if (o.blinkT <= 0) {
      o.blinking = !o.blinking
      o.blinkT = o.blinking ? 0.13 : slump(2, 5)
    }
    const mun = g && g.sak && g.sak.tung ? 'oj' : o.humor > 0.7 ? 'glad' : 'leende'
    const nyckel = `${o.farg}|${Math.round(o.look.x * 5)}|${Math.round(o.look.y * 5)}|${o.blinking ? 1 : 0}|${mun}`
    if (nyckel !== o.nyckel) {
      o.nyckel = nyckel
      ritaOtto(this._ottoG, o.farg, { look: o.look, blink: o.blinking, mun, glad: o.humor > 0.6 })
    }
  },
}
