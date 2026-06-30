// Spelbibliotek: spelen är indelade i 4 färgglada flikar (Roligt / Fysik / Pussel /
// Lära). En sorteringsknapp växlar mellan "Nyast" (senast tillagda först) och "A–Ö"
// (alfabetisk). Ingen läsning krävs — flikarna har ikon + kort ord, rösten säger
// "Välj ett spel!". Rutnätet av stora brickor skrollas lodrätt om det blir högre än
// ytan (mjuk drag, inget snabb-svep). Vald flik + sortering minns mellan besök.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { bounceIn } from '../../lib/feedback.js'
import { GAMES } from '../../games/registry.js'
import { CATEGORIES, COLORS, FONT, DESIGN_W, DESIGN_H, TAB_GROUPS } from '../../lib/theme.js'

// Säkerhet: varje spel-kategori MÅSTE ingå i någon fliks `cats`, annars göms de spelen
// (filtreras bort ur alla flikar). Varna högt i dev så att en ny kategori inte tappas bort.
if (import.meta.env?.DEV) {
  const covered = new Set(TAB_GROUPS.flatMap((g) => g.cats))
  const missing = [...new Set(GAMES.map((g) => g.category))].filter((c) => !covered.has(c))
  if (missing.length) console.warn('[bibliotek] kategorier utan flik (spelen göms!):', missing)
}

// Bibliotekets UI-läge (vald flik + sortering) minns över besök/omladdning.
const UI_KEY = 'pwagames.library.ui'
function loadUI() {
  try {
    const v = JSON.parse(localStorage.getItem(UI_KEY) || '{}')
    return {
      tab: Number.isInteger(v.tab) && v.tab >= 0 && v.tab < TAB_GROUPS.length ? v.tab : 0,
      sort: v.sort === 'alpha' ? 'alpha' : 'added',
    }
  } catch {
    return { tab: 0, sort: 'added' }
  }
}
function saveUI(ui) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui))
  } catch {
    /* UI-pref är inte kritisk */
  }
}

export async function createLibraryScreen(services) {
  const view = new Container()
  const { nav, voice, stickers } = services
  const ui = loadUI()

  // --- Topp-rad: hem · titel · sortering · högtalare ---
  const home = new Button({
    icon: '🏠', width: 100, height: 100, color: COLORS.orange, services, sound: 'tap',
    onTap: () => nav.go('menu'),
  })
  home.position.set(80, 80)
  view.addChild(home)

  const title = new Text({
    text: 'Välj ett spel',
    style: { fontFamily: FONT.title, fontSize: 48, fontWeight: '700', fill: COLORS.ink },
  })
  title.anchor.set(0.5)
  title.position.set(DESIGN_W / 2, 70)
  view.addChild(title)

  const speaker = new Button({
    icon: '🔊', width: 100, height: 100, color: COLORS.purple, services, sound: 'tap',
    onTap: () => voice.say('Välj ett spel!', true),
  })
  speaker.position.set(DESIGN_W - 80, 80)
  view.addChild(speaker)

  // Sorteringsknapp (växlar Nyast <-> A–Ö). Etiketten visar AKTUELLT läge.
  const sortBtn = new Button({
    width: 188, height: 92, color: COLORS.teal, services, sound: 'flip',
    onTap: () => {
      ui.sort = ui.sort === 'added' ? 'alpha' : 'added'
      saveUI(ui)
      updateSortLabel()
      rebuildGrid(true)
      voice.say(ui.sort === 'alpha' ? 'A till Ö' : 'Nyast först', true)
    },
  })
  sortBtn.position.set(DESIGN_W - 250, 80)
  view.addChild(sortBtn)
  // Egen etikett (ikon + text) som vi kan byta vid växling.
  const sortText = new Text({ text: '', style: { fontFamily: FONT.title, fontSize: 32, fontWeight: '700', fill: COLORS.white, align: 'center' } })
  sortText.anchor.set(0.5)
  sortText.eventMode = 'none'
  sortBtn.addChild(sortText)
  function updateSortLabel() {
    sortText.text = ui.sort === 'alpha' ? '🔤 A–Ö' : '🆕 Nyast'
  }
  updateSortLabel()

  // --- Flik-rad (4 grupper) ---
  const tabBar = new Container()
  view.addChild(tabBar)
  const tabW = 250
  const tabGap = 20
  const tabsTotalW = TAB_GROUPS.length * tabW + (TAB_GROUPS.length - 1) * tabGap
  const tabs = TAB_GROUPS.map((group, i) => {
    const b = new Button({
      label: group.label, icon: group.icon, width: tabW, height: 92, color: group.color,
      services, sound: 'tap',
      onTap: () => {
        if (ui.tab === i) return
        ui.tab = i
        saveUI(ui)
        updateTabs()
        rebuildGrid(true)
        voice.say(group.label, true)
      },
    })
    b.x = (DESIGN_W - tabsTotalW) / 2 + i * (tabW + tabGap) + tabW / 2
    b.y = 164
    tabBar.addChild(b)
    return b
  })
  function updateTabs() {
    tabs.forEach((b, i) => {
      const active = i === ui.tab
      b.alpha = active ? 1 : 0.5
      gsap.killTweensOf(b.scale)
      b.scale.set(active ? 1 : 0.94)
    })
  }
  updateTabs()

  // --- Rutnät (skrollbart), byggs om vid flik-/sorterings-byte ---
  const areaTop = 232
  const areaH = DESIGN_H - areaTop - 24

  const grid = new Container()
  view.addChild(grid)

  const mask = new Graphics().rect(0, areaTop - 8, DESIGN_W, areaH + 16).fill(0xffffff)
  view.addChild(mask)
  grid.mask = mask

  // "mer nedanför"-pil (visas bara när det går att skrolla).
  const hint = new Text({ text: '⬇', style: { fontFamily: FONT.body, fontSize: 40, fill: COLORS.inkSoft } })
  hint.anchor.set(0.5)
  hint.position.set(DESIGN_W / 2, DESIGN_H - 26)
  hint.eventMode = 'none'
  hint.visible = false
  view.addChild(hint)
  gsap.to(hint, { y: DESIGN_H - 34, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })

  // Skroll-tillstånd (delas med brickorna så ett skroll-drag inte startar ett spel).
  const scroll = { dragging: false, moved: false, fits: true, minY: areaTop, maxY: areaTop }
  const scrolling = () => scroll.moved

  // Aktuell flik + sortering → lista av spel.
  function orderedGames() {
    const group = TAB_GROUPS[ui.tab]
    const list = GAMES.filter((g) => group.cats.includes(g.category))
    if (ui.sort === 'alpha') {
      return [...list].sort((a, b) => a.titleSv.localeCompare(b.titleSv, 'sv'))
    }
    return [...list].reverse() // 'added' = senast tillagda först
  }

  function clearGrid() {
    for (const child of [...grid.children]) {
      gsap.killTweensOf(child)
      gsap.killTweensOf(child.scale)
      child.destroy({ children: true })
    }
  }

  function rebuildGrid(animate = false) {
    clearGrid()
    const list = orderedGames()
    const N = list.length
    const cols = Math.max(1, Math.min(4, N))
    const rows = Math.ceil(N / cols)
    const gap = 28
    const tileW = Math.min(280, (1180 - gap * (cols - 1)) / cols)
    const tileH = 150
    const gridW = cols * tileW + (cols - 1) * gap
    const gridTotalH = rows * tileH + (rows - 1) * gap

    list.forEach((game, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = (DESIGN_W - gridW) / 2 + col * (tileW + gap) + tileW / 2
      const y = row * (tileH + gap) + tileH / 2
      const tile = makeTile(game, tileW, tileH, services, stickers.has(game.id), scrolling)
      tile.position.set(x, y)
      grid.addChild(tile)
      if (animate) bounceIn(tile, { delay: Math.min(0.4, 0.03 * i) })
    })

    // Vertikal placering: centrera om allt får plats, annars skrolla (uppifrån).
    const fits = gridTotalH <= areaH
    const maxY = fits ? areaTop + (areaH - gridTotalH) / 2 : areaTop
    const minY = fits ? maxY : areaTop - (gridTotalH - areaH)
    scroll.fits = fits
    scroll.maxY = maxY
    scroll.minY = minY
    grid.y = maxY
    hint.visible = !fits
    if (!fits) hint.alpha = 1
  }
  rebuildGrid(true)

  // Drag-att-skrolla. Spårar i designkoordinater; bounds läses från `scroll`.
  let startPy = 0
  let startGridY = 0
  const onDown = (e) => {
    if (scroll.fits) return
    scroll.dragging = true
    scroll.moved = false
    startPy = view.toLocal(e.global).y
    startGridY = grid.y
  }
  const onMove = (e) => {
    if (!scroll.dragging) return
    const dy = view.toLocal(e.global).y - startPy
    if (Math.abs(dy) > 8) scroll.moved = true
    grid.y = Math.max(scroll.minY, Math.min(scroll.maxY, startGridY + dy))
    hint.alpha = grid.y <= scroll.minY + 4 ? 0 : 1
  }
  const onUp = () => {
    scroll.dragging = false
  }
  view.eventMode = 'static'
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
      gsap.killTweensOf(hint)
      gsap.killTweensOf(grid)
      for (const child of grid.children) {
        gsap.killTweensOf(child)
        gsap.killTweensOf(child.scale)
      }
      for (const b of tabs) gsap.killTweensOf(b.scale)
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
