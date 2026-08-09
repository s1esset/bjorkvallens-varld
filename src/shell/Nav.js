// Enkel skärm-router. Varje skärm är en fabrik: (services, params) => { view, destroy }.
// view är en Pixi Container; destroy() städar lyssnare/tweens (Nav förstör själva containern).
//
// ÖVERGÅNGEN har en riktning: den nya skärmen läggs UNDER den gamla och är full redan
// från första bildrutan, och det är den GAMLA som glider undan och tonar bort ovanpå.
// Djupare in = gamla glider åt vänster, tillbaka = åt höger. Att i stället tona IN den
// nya (som förut) betyder att båda är halvgenomskinliga en stund — och med full bleed
// lyser skalets creme igenom precis då. Uppmätt med `scripts/_navprobe.mjs` 120 ms in i
// bytet, 952×428: på väg UT ur ett spel 32,5 % creme med korstoningen mot 0,9 % med den
// här ordningen; i inget av de fyra bytena överstiger cremen någon av ändskärmarnas egen.
import { gsap } from 'gsap'
import { ANIM } from '../lib/theme.js'

// Hur djupt in i appen varje skärm ligger. Styr bara riktningen på övergången.
const DJUP = { splash: 0, menu: 1, settings: 2, library: 2, game: 3 }
const GLID = 190 // px i designrymden som den gamla skärmen glider undan

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

    // Den nya skärmen UNDERST och full direkt — inget cremeblänk mellan skärmarna.
    holder.addChildAt(next.view, 0)
    next.view.alpha = 1
    this.current = next

    if (!old) {
      this._busy = false
      return
    }

    // Riktning: djupare in = undan åt vänster, tillbaka = åt höger.
    const fran = DJUP[old.name] ?? 0
    const till = DJUP[name] ?? 0
    const riktning = till >= fran ? -1 : 1
    const x0 = old.view.x

    // _busy släpps FÖRST när övergången är klar. Släpptes den synkront (som förut) kunde
    // ett andra tryck starta nästa skärm mitt i den pågående, och två skärmar tonade om
    // varandra i samma holder.
    const klar = () => {
      try {
        old.destroy?.()
      } catch (err) {
        console.warn('Fel vid städning av skärm', err)
      }
      holder.removeChild(old.view)
      old.view.destroy({ children: true })
      this._busy = false
    }

    gsap.to(old.view, {
      x: x0 + riktning * GLID,
      alpha: 0,
      duration: ANIM.fade + 0.1,
      ease: 'power2.in',
      onComplete: klar,
    })
  }
}
