// Spelbibliotek: rutnät av stora färgglada brickor (ikon + svensk titel).
// Ingen läsning krävs — rösten säger "Välj ett spel!" och ikonen visar vad det är.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { bounceIn } from '../../lib/feedback.js'
import { GAMES } from '../../games/registry.js'
import { CATEGORIES, COLORS, FONT, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

export async function createLibraryScreen(services) {
  const view = new Container()
  const { nav, audio, voice, stickers } = services

  // Hem-knapp (tillbaka till menyn)
  const home = new Button({
    icon: '🏠',
    width: 100,
    height: 100,
    color: COLORS.orange,
    services,
    sound: 'tap',
    onTap: () => nav.go('menu'),
  })
  home.x = 80
  home.y = 80
  view.addChild(home)

  const title = new Text({
    text: 'Välj ett spel',
    style: { fontFamily: FONT.title, fontSize: 52, fontWeight: '700', fill: COLORS.ink },
  })
  title.anchor.set(0.5)
  title.x = DESIGN_W / 2
  title.y = 78
  view.addChild(title)

  // Repetera röst-instruktion
  const speaker = new Button({
    icon: '🔊',
    width: 100,
    height: 100,
    color: COLORS.purple,
    services,
    sound: 'tap',
    onTap: () => voice.say('Välj ett spel!'),
  })
  speaker.x = DESIGN_W - 80
  speaker.y = 80
  view.addChild(speaker)

  // --- rutnät ---
  const grid = new Container()
  view.addChild(grid)

  const N = GAMES.length
  const cols = Math.max(1, Math.min(4, N))
  const rows = Math.ceil(N / cols)
  const areaTop = 170
  const areaH = DESIGN_H - areaTop - 40
  const gap = 36
  const maxTileW = 280
  const tileW = Math.min(maxTileW, (1180 - gap * (cols - 1)) / cols)
  const tileH = Math.min(tileW * 1.1, (areaH - gap * (rows - 1)) / rows)
  const gridW = cols * tileW + (cols - 1) * gap

  GAMES.forEach((game, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = (DESIGN_W - gridW) / 2 + col * (tileW + gap) + tileW / 2
    const rowsInThis = Math.ceil(N / cols)
    const totalH = rowsInThis * tileH + (rowsInThis - 1) * gap
    const y = areaTop + (areaH - totalH) / 2 + row * (tileH + gap) + tileH / 2
    const tile = makeTile(game, tileW, tileH, services, stickers.has(game.id))
    tile.x = x
    tile.y = y
    grid.addChild(tile)
    bounceIn(tile, { delay: 0.05 * i })
  })

  voice.say('Välj ett spel!')

  return {
    view,
    destroy() {
      gsap.killTweensOf(grid)
    },
  }
}

function makeTile(game, w, h, services, earned) {
  const { nav, audio } = services
  const cat = CATEGORIES[game.category] || { color: COLORS.orange, label: '' }
  const c = new Container()
  c.eventMode = 'static'
  c.cursor = 'pointer'

  const lip = new Graphics().roundRect(-w / 2, -h / 2 + 8, w, h, 28).fill({ color: shade(cat.color, 0.2) })
  const face = new Graphics().roundRect(-w / 2, -h / 2, w, h - 6, 28).fill(cat.color)
  c.addChild(lip, face)

  const icon = new Text({ text: game.icon || '🎮', style: { fontFamily: FONT.body, fontSize: h * 0.42 } })
  icon.anchor.set(0.5)
  icon.y = -h * 0.12
  c.addChild(icon)

  const label = new Text({
    text: game.titleSv,
    style: {
      fontFamily: FONT.title,
      fontSize: Math.min(34, w * 0.16),
      fontWeight: '700',
      fill: COLORS.white,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: w - 24,
    },
  })
  label.anchor.set(0.5)
  label.y = h * 0.28
  c.addChild(label)

  if (earned) {
    const star = new Text({ text: '⭐', style: { fontFamily: FONT.body, fontSize: 40 } })
    star.anchor.set(0.5)
    star.x = w / 2 - 28
    star.y = -h / 2 + 28
    c.addChild(star)
  }

  c.hitArea = { contains: (px, py) => px >= -w / 2 - 16 && px <= w / 2 + 16 && py >= -h / 2 - 16 && py <= h / 2 + 16 }
  c.on('pointerdown', () => gsap.to(c.scale, { x: 0.94, y: 0.94, duration: 0.08 }))
  c.on('pointerup', () => gsap.to(c.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(3)' }))
  c.on('pointerupoutside', () => gsap.to(c.scale, { x: 1, y: 1, duration: 0.2 }))
  c.on('pointertap', () => {
    audio.sfx('pling')
    nav.go('game', { id: game.id })
  })
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
