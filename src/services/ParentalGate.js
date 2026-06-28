// Föräldra-grind: visas före alla vuxen-handlingar (inställningar, avsluta,
// ta bort/nollställ profil). Tryck-och-håll i ~2,5 s tills ringen fylls.
// Ett 2–5-åring ska inte klara den; en förälder klarar den på några sekunder.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, FONT, DESIGN_W, DESIGN_H } from '../lib/theme.js'

const HOLD_SECONDS = 2.5

export class ParentalGate {
  constructor(layer, services) {
    this.layer = layer
    this.services = services
  }

  open({ title = 'Endast för vuxna' } = {}) {
    return new Promise((resolve) => {
      // Går att stänga av i inställningar (t.ex. för utveckling).
      if (this.services.save.data.settings.parentalGateEnabled === false) {
        resolve(true)
        return
      }

      const app = this.services.app
      const cx = DESIGN_W / 2
      const cy = DESIGN_H / 2
      const root = new Container()

      const backdrop = new Graphics()
        .rect(-1200, -1200, DESIGN_W + 2400, DESIGN_H + 2400)
        .fill({ color: 0x281e14, alpha: 0.62 })
      backdrop.eventMode = 'static'

      const card = new Graphics().roundRect(cx - 340, cy - 230, 680, 460, 40).fill(COLORS.cream)

      const tt = new Text({
        text: title,
        style: { fontFamily: FONT.title, fontSize: 42, fontWeight: '700', fill: COLORS.ink, align: 'center' },
      })
      tt.anchor.set(0.5)
      tt.x = cx
      tt.y = cy - 170

      const sub = new Text({
        text: 'Håll inne knappen tills ringen fylls',
        style: {
          fontFamily: FONT.body,
          fontSize: 26,
          fill: COLORS.inkSoft,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: 560,
        },
      })
      sub.anchor.set(0.5)
      sub.x = cx
      sub.y = cy - 120

      root.addChild(backdrop, card, tt, sub)

      // Håll-knapp
      const btnY = cy + 40
      const R = 86
      const ring = new Graphics()
      ring.x = cx
      ring.y = btnY
      const knob = new Graphics().circle(0, 0, R).fill(COLORS.orange)
      knob.x = cx
      knob.y = btnY
      const knobLabel = new Text({
        text: '🔒',
        style: { fontFamily: FONT.body, fontSize: 64, fill: COLORS.white },
      })
      knobLabel.anchor.set(0.5)
      knobLabel.x = cx
      knobLabel.y = btnY
      const hitc = new Container()
      hitc.eventMode = 'static'
      hitc.cursor = 'pointer'
      hitc.addChild(ring, knob, knobLabel)
      root.addChild(hitc)

      // Avbryt
      const cancel = new Text({
        text: '✖  Avbryt',
        style: { fontFamily: FONT.title, fontSize: 26, fontWeight: '700', fill: COLORS.inkSoft },
      })
      cancel.anchor.set(0.5)
      cancel.x = cx
      cancel.y = cy + 180
      cancel.eventMode = 'static'
      cancel.cursor = 'pointer'
      root.addChild(cancel)

      root.alpha = 0
      this.layer.addChild(root)
      gsap.to(root, { alpha: 1, duration: 0.2 })

      let holding = false
      let progress = 0
      let done = false

      const drawRing = () => {
        ring.clear()
        ring.circle(0, 0, R + 16).stroke({ width: 16, color: COLORS.orangeDark, alpha: 0.35 })
        if (progress > 0.001) {
          ring
            .arc(0, 0, R + 16, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
            .stroke({ width: 16, color: COLORS.green, cap: 'round' })
        }
      }
      drawRing()

      const tick = (ticker) => {
        const dt = ticker.deltaMS / 1000
        if (holding) progress += dt / HOLD_SECONDS
        else progress -= dt / (HOLD_SECONDS * 0.4)
        progress = Math.max(0, Math.min(1, progress))
        drawRing()
        if (progress >= 1 && !done) finish(true)
      }
      app.ticker.add(tick)

      const startHold = () => {
        if (done) return
        holding = true
        this.services.audio?.sfx('tap')
        gsap.to(knob.scale, { x: 0.92, y: 0.92, duration: 0.12 })
      }
      const stopHold = () => {
        holding = false
        gsap.to(knob.scale, { x: 1, y: 1, duration: 0.18 })
      }

      hitc.on('pointerdown', startHold)
      hitc.on('pointerup', stopHold)
      hitc.on('pointerupoutside', stopHold)
      cancel.on('pointertap', () => finish(false))

      const finish = (ok) => {
        if (done) return
        done = true
        app.ticker.remove(tick)
        if (ok) this.services.audio?.sfx('correct')
        gsap.to(root, {
          alpha: 0,
          duration: 0.2,
          onComplete: () => {
            root.destroy({ children: true })
            resolve(ok)
          },
        })
      }
    })
  }
}
