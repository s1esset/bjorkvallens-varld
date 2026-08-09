// Enkel skärm-router. Varje skärm är en fabrik: (services, params) => { view, destroy }.
// view är en Pixi Container; destroy() städar lyssnare/tweens (Nav förstör själva containern).
import { gsap } from 'gsap'
import { ANIM } from '../lib/theme.js'

export class Nav {
  constructor(ctx) {
    this.ctx = ctx
    this.services = null
    this.routes = new Map()
    this.current = null
    this._busy = false
  }

  register(name, factory) {
    this.routes.set(name, factory)
  }

  async go(name, params = {}) {
    if (this._busy) return
    const factory = this.routes.get(name)
    if (!factory) {
      console.warn('Okänd skärm:', name)
      return
    }
    this._busy = true
    const holder = this.ctx.screenHolder
    const old = this.current

    let next
    try {
      next = await factory(this.services, params)
    } catch (err) {
      console.error('Kunde inte skapa skärm', name, err)
      this._busy = false
      return
    }
    next.name = name

    holder.addChild(next.view)
    next.view.alpha = 0
    this.current = next

    gsap.to(next.view, { alpha: 1, duration: ANIM.fade, ease: 'power1.out' })
    if (old) {
      gsap.to(old.view, {
        alpha: 0,
        duration: ANIM.fade,
        ease: 'power1.in',
        onComplete: () => {
          try {
            old.destroy?.()
          } catch (err) {
            console.warn('Fel vid städning av skärm', err)
          }
          holder.removeChild(old.view)
          old.view.destroy({ children: true })
        },
      })
    }
    this._busy = false
  }
}
