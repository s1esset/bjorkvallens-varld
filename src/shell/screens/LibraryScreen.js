// Spelbibliotek: rutnät av stora färgglada brickor (ikon + svensk titel).
// Ingen läsning krävs — rösten säger "Välj ett spel!" och ikonen visar vad det är.
// Med många spel blir rutnätet högre än skärmen -> dra lodrätt för att skrolla
// (mjuk drag, inget snabb-svep). Brickorna behåller en bekväm, läsbar storlek.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
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

  // --- rutnät (skrollbart) ---
  const grid = new Container()
  view.addChild(grid)

  const N = GAMES.length
  const cols = Math.max(1, Math.min(4, N))
  const rows = Math.ceil(N / cols)
  const areaTop = 156
  const areaH = DESIGN_H - areaTop - 24
  const gap = 28
  const tileW = Math.min(280, (1180 - gap * (cols - 1)) / cols)
  const tileH = 150 // bekväm fast höjd (läsbar titel + ikon), oberoende av antal spel
  const gridW = cols * tileW + (cols - 1) * gap
  const gridTotalH = rows * tileH + (rows - 1) * gap

  // Skroll-tillstånd: delas med brickorna så ett skroll-drag inte råkar starta ett spel.
  const scroll = { dragging: false, moved: false }
  const scrolling = () => scroll.moved

  GAMES.forEach((game, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = (DESIGN_W - gridW) / 2 + col * (tileW + gap) + tileW / 2
    const y = row * (tileH + gap) + tileH / 2
    const tile = makeTile(game, tileW, tileH, services, stickers.has(game.id), scrolling)
    tile.x = x
    tile.y = y
    grid.addChild(tile)
    bounceIn(tile, { delay: Math.min(0.6, 0.04 * i) })
  })

  // Vertikal placering: centrera om allt får plats, annars skrolla.
  const fits = gridTotalH <= areaH
  const maxY = fits ? areaTop + (areaH - gridTotalH) / 2 : areaTop
  const minY = fits ? maxY : areaTop - (gridTotalH - areaH)
  grid.y = maxY

  // Klipp rutnätet till ytan (så brickor inte ritas över titeln/knapparna).
  const mask = new Graphics().rect(0, areaTop - 8, DESIGN_W, areaH + 16).fill(0xffffff)
  view.addChild(mask)
  grid.mask = mask

  // Liten "mer nedanför"-pil när det går att skrolla.
  let hint = null
  if (!fits) {
    hint = new Text({ text: '⬇', style: { fontFamily: FONT.body, fontSize: 40, fill: COLORS.inkSoft } })
    hint.anchor.set(0.5)
    hint.x = DESIGN_W / 2
    hint.y = DESIGN_H - 26
    hint.eventMode = 'none'
    view.addChild(hint)
    gsap.to(hint, { y: hint.y - 8, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  }

  // Drag-att-skrolla (endast om det behövs). Spårar i designkoordinater.
  let startPy = 0
  let startGridY = 0
  const onDown = (e) => {
    if (fits) return
    scroll.dragging = true
    scroll.moved = false
    startPy = view.toLocal(e.global).y
    startGridY = grid.y
  }
  const onMove = (e) => {
    if (!scroll.dragging) return
    const dy = view.toLocal(e.global).y - startPy
    if (Math.abs(dy) > 8) scroll.moved = true
    grid.y = Math.max(minY, Math.min(maxY, startGridY + dy))
    if (hint) hint.alpha = grid.y <= minY + 4 ? 0 : 1
  }
  const onUp = () => {
    scroll.dragging = false
    // moved-flaggan ligger kvar tills nästa pointerdown, så pointertap (som kommer
    // direkt efter pointerup) ser ett genomfört skroll och hoppar över start.
  }
  view.eventMode = 'static'
  // Explicit hitArea så pointerdown fångas även i mellanrummen mellan brickorna
  // (en Container utan hitArea träffas bara där dess barn ligger).
  view.hitArea = new Rectangle(0, 0, DESIGN_W, DESIGN_H)
  view.on('pointerdown', onDown)
  view.on('globalpointermove', onMove)
  view.on('pointerup', onUp)
  view.on('pointerupoutside', onUp)

  voice.say('Välj ett spel!')

  return {
    view,
    destroy() {
      view.off('pointerdown', onDown)
      view.off('globalpointermove', onMove)
      view.off('pointerup', onUp)
      view.off('pointerupoutside', onUp)
      if (hint) gsap.killTweensOf(hint)
      gsap.killTweensOf(grid)
      grid.mask = null
    },
  }
}

function makeTile(game, w, h, services, earned, scrolling) {
  const { nav, audio } = services
  const cat = CATEGORIES[game.category] || { color: COLORS.orange, label: '' }
  const c = new Container()
  c.eventMode = 'static'
  c.cursor = 'pointer'

  const lip = new Graphics().roundRect(-w / 2, -h / 2 + 8, w, h, 28).fill({ color: shade(cat.color, 0.2) })
  const face = new Graphics().roundRect(-w / 2, -h / 2, w, h - 6, 28).fill(cat.color)
  c.addChild(lip, face)

  const icon = new Text({ text: game.icon || '🎮', style: { fontFamily: FONT.body, fontSize: h * 0.36 } })
  icon.anchor.set(0.5)
  icon.y = -h * 0.16
  c.addChild(icon)

  const label = new Text({
    text: game.titleSv,
    style: {
      fontFamily: FONT.title,
      fontSize: 26,
      fontWeight: '700',
      fill: COLORS.white,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: w - 28,
      lineHeight: 28,
    },
  })
  label.anchor.set(0.5)
  label.y = h * 0.26
  // Krymp titeln om den blir för bred/hög så den aldrig spiller över brickan.
  const maxLabelH = h * 0.42
  if (label.height > maxLabelH) label.scale.set(Math.max(0.62, maxLabelH / label.height))
  c.addChild(label)

  if (earned) {
    // Stjärnan i nedre högra hörnet (krockar inte med titeln/ikonen).
    const star = new Text({ text: '⭐', style: { fontFamily: FONT.body, fontSize: 34 } })
    star.anchor.set(0.5)
    star.x = w / 2 - 26
    star.y = h / 2 - 26
    c.addChild(star)
  }

  c.hitArea = { contains: (px, py) => px >= -w / 2 && px <= w / 2 && py >= -h / 2 && py <= h / 2 }
  c.on('pointerdown', () => gsap.to(c.scale, { x: 0.94, y: 0.94, duration: 0.08 }))
  c.on('pointerup', () => gsap.to(c.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(3)' }))
  c.on('pointerupoutside', () => gsap.to(c.scale, { x: 1, y: 1, duration: 0.2 }))
  c.on('pointertap', () => {
    if (scrolling && scrolling()) return // det var ett skroll-drag, inte ett val
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
