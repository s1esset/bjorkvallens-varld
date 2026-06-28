// Enkel Ja/Nej-dialog (förälder-bekräftelse), ritad i Pixi. Returnerar Promise<boolean>.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from './Button.js'
import { COLORS, FONT, DESIGN_W, DESIGN_H } from './theme.js'

export function confirmDialog(layer, services, opts = {}) {
  const { title = 'Är du säker?', yes = 'Ja', no = 'Nej', yesColor = COLORS.green, noColor = COLORS.inkSoft } = opts
  return new Promise((resolve) => {
    const root = new Container()
    const cx = DESIGN_W / 2
    const cy = DESIGN_H / 2

    const backdrop = new Graphics()
      .rect(-1200, -1200, DESIGN_W + 2400, DESIGN_H + 2400)
      .fill({ color: 0x281e14, alpha: 0.55 })
    backdrop.eventMode = 'static'

    const card = new Graphics().roundRect(cx - 320, cy - 180, 640, 360, 36).fill(COLORS.cream)

    const tt = new Text({
      text: title,
      style: {
        fontFamily: FONT.title,
        fontSize: 40,
        fontWeight: '700',
        fill: COLORS.ink,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 560,
      },
    })
    tt.anchor.set(0.5)
    tt.x = cx
    tt.y = cy - 60

    root.addChild(backdrop, card, tt)

    const finish = (v) =>
      gsap.to(root, {
        alpha: 0,
        duration: 0.18,
        onComplete: () => {
          root.destroy({ children: true })
          resolve(v)
        },
      })

    const noBtn = new Button({ label: no, icon: '✖', width: 240, height: 116, color: noColor, services, sound: 'tap', onTap: () => finish(false) })
    noBtn.x = cx - 140
    noBtn.y = cy + 70
    const yesBtn = new Button({ label: yes, icon: '✔', width: 240, height: 116, color: yesColor, services, sound: 'correct', onTap: () => finish(true) })
    yesBtn.x = cx + 140
    yesBtn.y = cy + 70
    root.addChild(noBtn, yesBtn)

    root.alpha = 0
    layer.addChild(root)
    gsap.to(root, { alpha: 1, duration: 0.18 })
  })
}
