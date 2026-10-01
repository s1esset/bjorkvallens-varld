// Hyllan med hittade leksaker. Den är tom och OSYNLIG tills första leksaken hittats, och
// växer sedan från vänster: bara det man faktiskt hittat står där, aldrig en tom plats
// att fylla (ingen FOMO). Varje leksak står fristående på brädan med egen skugga och eget
// vilo-gupp. Hela hyllan är ETT tryckmål (≥96 px högt) — ett tryck får alla leksaker att
// hoppa i tur och ordning med en liten skala.
//
// Rivning: allt som rör sig ligger på ett barn (`slot`/`kropp`), aldrig på containern som
// bär hitArea. `destroy()` dödar tweens och `liv`-slingorna innan noderna rivs.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { drawIcon } from '../../lib/artikoner.js'
import { bounceIn, liv, pop } from '../../lib/feedback.js'
import { topLightFill } from '../../lib/form.js'

export const HYLLA_X0 = 190 // vänsterkant för första leksaken
export const STEG = 92 // avstånd mellan leksaker (mitt till mitt)
const BRADA_Y = 672 // brädans överkant
const LEK_Y = 645 // leksakens mittpunkt (foten sitter på brädan)
const LEK_STORLEK = 62
const SKALA = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66] // C-durpentatonik-ish

export class Hylla {
  constructor(parent, { onTap } = {}) {
    this._alive = true
    this.leksaker = [] // { key, slot, kropp }
    this.view = new Container()
    this.view.visible = false
    this.view.eventMode = 'static'
    this.view.cursor = 'pointer'
    if (onTap) this.view.on('pointertap', onTap)

    this._brada = new Graphics()
    this._brada.eventMode = 'none'
    this._lager = new Container()
    this._lager.eventMode = 'none'
    this._lager.interactiveChildren = false
    this.view.addChild(this._brada, this._lager)
    parent.addChild(this.view)
  }

  antal() {
    return this.leksaker.length
  }

  antalFigurer() {
    return this.leksaker.filter((l) => l.fig).length
  }

  har(key) {
    return this.leksaker.some((l) => l.key === key)
  }

  index(key) {
    return this.leksaker.findIndex((l) => l.key === key)
  }

  // Mittpunkten för plats i (i rotens koordinater).
  plats(i) {
    return { x: HYLLA_X0 + STEG / 2 + i * STEG, y: LEK_Y }
  }

  ton(i) {
    return SKALA[i % SKALA.length]
  }

  // Lägg till en leksak. `animera` = studsa in (annars står den bara där, som vid start).
  laggTill(key, { animera = false } = {}) {
    if (!this._alive || this.har(key)) return null
    const i = this.leksaker.length
    const p = this.plats(i)
    const slot = new Container()
    slot.position.set(p.x, p.y)
    slot.eventMode = 'none'
    const skugga = new Graphics().ellipse(0, LEK_STORLEK * 0.46, LEK_STORLEK * 0.4, 6).fill({ color: 0x000000, alpha: 0.25 })
    // Kroppen bär vilo-guppet (`liv` äger y + rotation); hopp och skala går på `slot`.
    const kropp = drawIcon(key, LEK_STORLEK)
    kropp.eventMode = 'none'
    slot.addChild(skugga, kropp)
    this._lager.addChild(slot)
    liv(kropp, { bob: 2.5, sway: 0.03, duration: 2 + (i % 4) * 0.35 })
    this.leksaker.push({ key, slot, kropp })
    this._rita()
    if (animera) bounceIn(slot, { duration: 0.5 })
    return slot
  }

  // En av barnets egna figurer som hittats: står på brädan resten av besöket (ingen sparpost —
  // `custom.hittade` rör bara leksaker). Figuren ÄGS av hyllan härifrån och rivs i destroy().
  // Fötterna i slotens lokala rum ligger på samma plats som leksakernas skugga (+27 px), och
  // figuren är normaliserad till samma höjd som en leksak (62 px).
  laggTillFigur(fig, key, { animera = false } = {}) {
    if (!this._alive || this.har(key) || !fig?.view || fig.view.destroyed) return null
    const i = this.leksaker.length
    const p = this.plats(i)
    const slot = new Container()
    slot.position.set(p.x, p.y)
    slot.eventMode = 'none'
    const skugga = new Graphics().ellipse(0, LEK_STORLEK * 0.46, LEK_STORLEK * 0.4, 6).fill({ color: 0x000000, alpha: 0.25 })
    slot.addChild(skugga)
    fig.view.parent?.removeChild(fig.view)
    // Pris-höjden är 100 px och foten 44 px under mitten; på hyllan 0,62× av det.
    fig.view.position.set(0, 44 * 0.62)
    fig.view.scale.set(0.62)
    slot.addChild(fig.view)
    this._lager.addChild(slot)
    this.leksaker.push({ key, slot, kropp: fig.view, fig })
    this._rita()
    if (animera) bounceIn(slot, { duration: 0.5 })
    return slot
  }

  // Bräda + fästen, ritad om efter antalet. Hitarean följer med (≥96 px hög alltid).
  _rita() {
    const n = this.leksaker.length
    this.view.visible = n > 0
    const left = HYLLA_X0 - 16
    const w = n * STEG + 32
    const g = this._brada
    g.clear()
    if (n === 0) return
    g.ellipse(left + w / 2, BRADA_Y + 34, w / 2 + 10, 9).fill({ color: 0x000000, alpha: 0.16 })
    // Fästen under brädan.
    for (const x of [left + 26, left + w - 26]) g.poly([x - 10, BRADA_Y + 24, x + 10, BRADA_Y + 24, x + 10, BRADA_Y + 44, x - 10, BRADA_Y + 44]).fill(0x7a4d28)
    g.roundRect(left, BRADA_Y, w, 16, 6).fill(topLightFill(0xe0a866, { highlight: 0.12, dark: 0.12 }))
    g.roundRect(left, BRADA_Y + 12, w, 14, 6).fill(0xa8703a)
    g.rect(left + 6, BRADA_Y + 2, w - 12, 3).fill({ color: 0xffffff, alpha: 0.35 })
    this.view.hitArea = new Rectangle(left - 10, 590, w + 20, 124)
  }

  // Ett hopp på leksak i.
  hoppa(i) {
    const l = this.leksaker[i]
    if (!this._alive || !l || l.slot.destroyed) return
    gsap.killTweensOf(l.slot, 'y')
    l.slot.y = LEK_Y
    gsap.timeline().to(l.slot, { y: LEK_Y - 24, duration: 0.15, ease: 'power2.out' }).to(l.slot, { y: LEK_Y, duration: 0.34, ease: 'bounce.out' })
    pop(l.slot, { scale: 1.2 })
    l.fig?.react('heja')
  }

  destroy() {
    this._alive = false
    for (const l of this.leksaker) {
      // Figurerna tickar på spelets ticker: riv dem FÖRE hyllans rötter (en bar view.destroy()
      // lämnar dem levande).
      if (l.fig) {
        gsap.killTweensOf(l.kropp)
        if (l.kropp && !l.kropp.destroyed) l.kropp.parent?.removeChild(l.kropp)
        l.fig.destroy()
      }
      l.kropp._fxLiv?.kill()
      gsap.killTweensOf(l.kropp)
      gsap.killTweensOf(l.slot)
      gsap.killTweensOf(l.slot.scale)
      l.slot._fxPopTl?.kill()
    }
    this.leksaker.length = 0
    if (this.view && !this.view.destroyed) this.view.destroy({ children: true })
  }
}
