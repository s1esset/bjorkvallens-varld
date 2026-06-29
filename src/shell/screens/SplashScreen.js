// Startskärm: maskot + titel + "Tryck för att börja".
// Första pekningen låser även upp ljudet (Web Audio kräver en användargest).
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { makeMascot } from '../../lib/mascot.js'
import { bounceIn } from '../../lib/feedback.js'
import { COLORS, FONT, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

export async function createSplashScreen(services) {
  const view = new Container()

  // mjuka dekormoln
  const clouds = new Graphics()
  const cloud = (cx, cy, s) => {
    clouds.circle(cx, cy, 40 * s).circle(cx + 46 * s, cy + 6 * s, 32 * s).circle(cx - 44 * s, cy + 8 * s, 30 * s).circle(cx + 10 * s, cy - 22 * s, 30 * s)
  }
  cloud(250, 150, 1.1)
  cloud(1050, 200, 1.3)
  cloud(180, 560, 0.9)
  clouds.fill({ color: COLORS.white, alpha: 0.7 })
  clouds.eventMode = 'none'
  view.addChild(clouds)

  const mascot = makeMascot(140)
  mascot.x = DESIGN_W / 2
  mascot.y = DESIGN_H / 2 - 50
  view.addChild(mascot)

  const title = new Text({
    text: 'BJÖRKVALLENS VÄRLD',
    style: { fontFamily: FONT.display, fontSize: 96, fontWeight: '700', fill: COLORS.orange, align: 'center' },
  })
  title.anchor.set(0.5)
  title.x = DESIGN_W / 2
  title.y = DESIGN_H / 2 + 150
  view.addChild(title)
  // Krymp vid behov så det långa namnet alltid får plats på en rad.
  const maxTitleW = DESIGN_W - 120
  if (title.width > maxTitleW) title.scale.set(maxTitleW / title.width)

  const hint = new Text({
    text: 'Tryck för att börja',
    style: { fontFamily: FONT.title, fontSize: 36, fontWeight: '700', fill: COLORS.inkSoft },
  })
  hint.anchor.set(0.5)
  hint.x = DESIGN_W / 2
  hint.y = DESIGN_H / 2 + 250
  view.addChild(hint)

  bounceIn(mascot)
  gsap.from(title, { y: title.y + 30, alpha: 0, duration: 0.5, delay: 0.15 })
  const hintTween = gsap.to(hint, { alpha: 0.3, duration: 0.85, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  const floatTween = gsap.to(mascot, { y: mascot.y - 14, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })

  view.eventMode = 'static'
  view.hitArea = new Rectangle(0, 0, DESIGN_W, DESIGN_H)

  let started = false
  const start = () => {
    if (started) return
    started = true
    services.audio.sfx('pling')
    services.voice.say('Välkommen till Björkvallens värld!')
    services.nav.go('menu')
  }
  view.on('pointertap', start)

  return {
    view,
    destroy() {
      hintTween.kill()
      floatTween.kill()
      // Döda även entré-tweens (kan pågå om barnet trycker direkt vid start).
      gsap.killTweensOf(mascot)
      gsap.killTweensOf(mascot.scale)
      gsap.killTweensOf(title)
      view.off('pointertap', start)
    },
  }
}
