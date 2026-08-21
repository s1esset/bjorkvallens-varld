// Föräldra-grind: visas före alla vuxen-handlingar (inställningar, avsluta,
// ta bort/nollställ profil). Tryck-och-håll i ~2,5 s tills ringen fylls.
// Ett 2–5-åring ska inte klara den; en förälder klarar den på några sekunder.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../lib/Button.js'
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

      const card = new Graphics().roundRect(cx - 340, cy - 250, 680, 500, 40).fill(COLORS.cream)
      // Kortet måste SVÄLJA tryck. Pixi v8:s standard passive är inte hittestad — så ett
      // tryck mitt på kortet hade fallit rakt igenom till bakgrunden och stängt grinden.
      card.eventMode = 'static'

      const tt = new Text({
        text: title,
        style: { fontFamily: FONT.title, fontSize: 42, fontWeight: '700', fill: COLORS.ink, align: 'center' },
      })
      tt.anchor.set(0.5)
      tt.x = cx
      tt.y = cy - 190

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
      sub.y = cy - 138

      root.addChild(backdrop, card, tt, sub)

      // Håll-knapp
      const btnY = cy - 10
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

      // Avbryt — en RIKTIG knapp, inte en textrad.
      //
      // ⚠️ Ägarrapport 2026-08-21: "avbryt-knappen är för liten och svår att se/träffa, barnet
      // blir fast på den skärmen". Den var en bar `Text` på 26 px, alltså en träffyta på
      // ~130×30 px — långt under P0:s ≥96 px, och i grindens dämpade inkSoft mot creme syntes
      // den knappt. Ett barn som råkat öppna grinden hade ingen väg ut alls: bakgrunden
      // blockerade tryck utan att göra något, och håll-knappen leder INTE ut.
      const cancel = new Button({
        label: 'Avbryt',
        icon: '✖',
        width: 300,
        height: 104,
        color: COLORS.red,
        fontSize: 36,
        services: this.services,
        sound: 'tap',
        onTap: () => finish(false),
      })
      cancel.x = cx
      cancel.y = cy + 172
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
      // Tryck UTANFÖR kortet stänger också. Andra halvan av samma rapport: bakgrunden fångade
      // trycket men gjorde ingenting, så det enda som såg ut som en utväg var död yta.
      // Bakgrunden ligger UNDER kortet i `root`, så ett tryck på kortet självt når den aldrig.
      backdrop.cursor = 'pointer'
      backdrop.on('pointertap', () => finish(false))

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
