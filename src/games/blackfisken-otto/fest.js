// BLÄCKFISKEN OTTO — festen när alla tre vännerna fått hjälp: vännerna simmar fram, kistan öppnas och
// pärlor + bubblor stiger i en ring runt Otto som snurrar nöjt. Blandas in i spelets objekt (`this` = spelet).
import { Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { burst, sparkle } from '../../lib/feedback.js'
import { FLOOR, OTTO_Y, clamp, nolla } from './konst.js'

export const fest = {
  // ───────────────────────── FESTEN ─────────────────────────

  _finish() {
    if (!this._alive || this._fas !== 'spel') return
    const ctx = this._ctx
    this._fas = 'fest'
    if (this._g) this._slappG()
    this._hjalpMal = null
    const o = this._otto
    o.heim = null
    o.humor = 1
    ctx.services.voice.say('Alla vännerna är glada! Hurra för Otto!')
    // vännerna simmar fram till Otto
    const n = this._vanner.length
    this._vanner.forEach((v, i) => {
      gsap.killTweensOf(v.c)
      v.flip.scale.x = 1
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 1.05
      const tw = gsap.to(v.c, { x: o.x + Math.cos(a) * 250, y: OTTO_Y + Math.sin(a) * 215 - 25, duration: 1.5, delay: i * 0.15, ease: 'sine.inOut' })
      this._tw.push(tw)
    })
    // skattkistan öppnas
    const kista = this._saker.find((s) => s.id === 'kista')
    let kx = o.x
    let ky = FLOOR - 36
    if (kista) {
      this._phys.removeBody(kista.body)
      this._flyt.ta(kista.body)
      kista.klar = true
      kista.skugga.visible = false
      kx = clamp(o.x + (o.x < 640 ? 270 : -270), 120, 1160)
      const tw = gsap.to(kista.view, { x: kx, y: ky, duration: 1.1, ease: 'sine.inOut' })
      this._tw.push(tw)
      const lock = kista.kropp.lock
      if (lock) {
        const tl = gsap.to(lock, { rotation: -1.3, duration: 0.55, delay: 1.1, ease: 'back.out(2.2)' })
        this._tw.push(tl)
      }
    }
    ctx.later(1.2, () => {
      if (!this._alive) return
      ctx.services.audio.sfx('reveal')
      burst(this._lFx, kx, ky - 40, { count: 16, colors: [0xffd35c, 0xfff0f5, 0xff9ec4], power: 1.2 })
      sparkle(this._lFx, kx, ky - 50, { count: 8 })
    })
    // pärlor och bubblor i en ring runt Otto som snurrar nöjt
    const N = 14
    for (let i = 0; i < N; i++) {
      const p = nolla(new Graphics())
      p.circle(0, 0, 9).fill(i % 3 === 0 ? 0xffe3ef : 0xfff8ec)
      p.circle(0, 0, 9).stroke({ width: 2, color: 0xe9c9d6, alpha: 0.9 })
      p.circle(-3, -3, 2.8).fill({ color: 0xffffff, alpha: 0.9 })
      p.alpha = 0
      p.position.set(kx, ky - 40)
      this._lFx.addChild(p)
      this._perlor.push(p)
    }
    const st = { t: 0, sist: 0 }
    const dr = gsap.to(st, {
      t: 1, duration: 3.5, delay: 1.2, ease: 'none',
      onUpdate: () => {
        if (!this._alive) return
        const cx = this._otto.x
        const cy = OTTO_Y - 40 - st.t * 36
        const inn = clamp(st.t / 0.14, 0, 1)
        const ut = clamp((1 - st.t) / 0.16, 0, 1)
        this._perlor.forEach((p, i) => {
          if (p.destroyed) return
          const a = (i / N) * Math.PI * 2 + st.t * Math.PI * 3.2
          const r = 150 + 22 * Math.sin(i * 1.7 + st.t * 7)
          const tx = cx + Math.cos(a) * r
          const ty = cy + Math.sin(a) * r * 0.52
          const e = inn * inn * (3 - 2 * inn)
          p.x = kx + (tx - kx) * e
          p.y = ky - 40 + (ty - (ky - 40)) * e
          p.alpha = Math.min(inn, ut)
          p.scale.set(0.8 + 0.3 * Math.sin(i + st.t * 9))
        })
        if (st.t - st.sist > 0.035) {
          st.sist = st.t
          const a = Math.random() * Math.PI * 2
          this._bubbla(cx + Math.cos(a) * 130, cy + 40 + Math.sin(a) * 60)
        }
      },
      onComplete: () => {
        for (const p of this._perlor) if (!p.destroyed) p.destroy()
        this._perlor = []
      },
    })
    this._tw.push(dr)
    this._tw.push(gsap.to(this._ottoSq, { rotation: Math.PI * 4, duration: 2.8, delay: 1.1, ease: 'power2.inOut', onComplete: () => { if (!this._ottoSq.destroyed) this._ottoSq.rotation = 0 } }))
    ctx.later(1.6, () => ctx.progress.complete())
    ctx.later(5.5, () => {
      if (!this._alive) return
      this._byggRunda()
      ctx.narTyst(() => {
        if (this._alive && this._fas === 'spel' && this._ordning[0]) this._sagVan(this._ordning[0])
      })
    })
  },
}
