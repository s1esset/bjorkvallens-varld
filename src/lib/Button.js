// Stor, barnvänlig knapp. Center-origo, generös träffyta (hit-halo),
// pekfeedback (studs + ljud) under 100 ms. Klarar ikon (emoji), text eller båda.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, FONT, ANIM } from './theme.js'

export class Button extends Container {
  constructor({
    label = '',
    icon = '',
    width = 240,
    height = 120,
    color = COLORS.orange,
    textColor = COLORS.white,
    fontSize = 0,
    iconSize = 0,
    radius = 0,
    haloPad = 24,
    sound = 'tap',
    onTap = null,
    services = null,
    stacked = false,
  } = {}) {
    super()
    this._onTap = onTap
    this._services = services
    this._sound = sound
    this._enabled = true

    const r = radius || Math.min(height / 2, 36)
    const w = width
    const h = height

    // "godis"-look: mörkare läpp under + ljus platta över
    const lip = new Graphics()
    lip.roundRect(-w / 2, -h / 2 + 8, w, h, r).fill({ color: this._darken(color, 0.18) })
    const face = new Graphics()
    face.roundRect(-w / 2, -h / 2, w, h - 6, r).fill({ color })
    // mjuk glansremsa upptill
    face.roundRect(-w / 2 + 10, -h / 2 + 8, w - 20, h * 0.32, r * 0.7).fill({ color: COLORS.white, alpha: 0.18 })
    this.addChild(lip, face)
    this._face = face

    const fs = fontSize || Math.min(h * 0.42, 42)
    const is = iconSize || (label ? Math.min(h * 0.46, 56) : Math.min(h * 0.6, 80))

    if (icon && label && stacked) {
      const ic = this._text(icon, is, textColor)
      ic.y = -h * 0.16
      const tx = this._text(label, fs * 0.8, textColor, FONT.title)
      tx.y = h * 0.22
      this.addChild(ic, tx)
    } else if (icon && label) {
      const ic = this._text(icon, is, textColor)
      const tx = this._text(label, fs, textColor, FONT.title)
      const gap = 14
      const total = ic.width + gap + tx.width
      ic.x = -total / 2 + ic.width / 2
      tx.x = total / 2 - tx.width / 2
      this.addChild(ic, tx)
    } else if (icon) {
      this.addChild(this._text(icon, is, textColor))
    } else {
      this.addChild(this._text(label, fs, textColor, FONT.title))
    }

    // träffyta större än grafiken
    this.hitArea = new Rectangle(-w / 2 - haloPad, -h / 2 - haloPad, w + haloPad * 2, h + haloPad * 2)
    this.eventMode = 'static'
    this.cursor = 'pointer'

    this.on('pointerdown', this._down, this)
    this.on('pointerup', this._up, this)
    this.on('pointerupoutside', this._up, this)
    this.on('pointertap', this._tap, this)
  }

  _text(str, size, color, family = FONT.body) {
    const t = new Text({
      text: str,
      style: { fontFamily: family, fontSize: size, fontWeight: '700', fill: color, align: 'center' },
    })
    t.anchor.set(0.5)
    t.eventMode = 'none'
    return t
  }

  _darken(hex, amt) {
    const r = (hex >> 16) & 0xff
    const g = (hex >> 8) & 0xff
    const b = hex & 0xff
    const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
    return (d(r) << 16) | (d(g) << 8) | d(b)
  }

  setEnabled(on) {
    this._enabled = on
    this.alpha = on ? 1 : 0.45
    this.eventMode = on ? 'static' : 'none'
    this.cursor = on ? 'pointer' : 'default'
    return this
  }

  _down() {
    if (!this._enabled) return
    const s = ANIM.press.scale
    gsap.to(this.scale, { x: s, y: s, duration: ANIM.press.duration, ease: ANIM.press.ease })
  }

  _up() {
    if (!this._enabled) return
    gsap.to(this.scale, { x: 1, y: 1, duration: ANIM.release.duration, ease: ANIM.release.ease })
  }

  _tap() {
    if (!this._enabled) return
    this._services?.audio?.sfx(this._sound)
    this._onTap?.()
  }
}
