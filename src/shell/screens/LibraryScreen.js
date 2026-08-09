// Spelbibliotek: spelen är indelade i 4 färgglada flikar (Roligt / Fysik / Pussel /
// Lära). Flikarna är stora "riktiga" flikar över hela bredden och sitter ovanpå en
// innehållspanel vars ram får den aktiva flikens färg. Byt flik genom att trycka på
// fliken ELLER svepa vågrätt på spelytan (axellåst mot den lodräta skrollen).
// En liten ikon-knapp växlar sortering "Nyast" (🆕) <-> "A–Ö" (🔤). Ingen läsning
// krävs — rösten säger "Välj ett spel!". Rutnätet skrollas lodrätt om det blir högre
// än panelen (mjukt drag). Vald flik + sortering minns mellan besök.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { bounceIn } from '../../lib/feedback.js'
import { GAMES } from '../../games/registry.js'
import { CATEGORIES, COLORS, FONT, DESIGN_W, DESIGN_H, TAB_GROUPS, SPACING, RADIUS, ANIM, shade, tint } from '../../lib/theme.js'

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

// Layoutkonstanter (designrymd, se docs/DESIGN.md §2 + §8)
const TAB_Y = 172 // flikarnas överkant — ger >=40px luft under topp-bandet (slutar ~128)
const TAB_H = 92
const TAB_GAP = 12
const PANEL_TOP = TAB_Y + TAB_H // panelen börjar där flikarna slutar
const PANEL_MARGIN = SPACING.sm // panelens avstånd till skärmkant vänster/höger/ner
const SWIPE_THRESHOLD = 70 // px vågrätt drag som räknas som flikbyte

export async function createLibraryScreen(services) {
  const view = new Container()
  const { nav, voice, stickers } = services
  const ui = loadUI()

  // --- Innehållspanel (under flikarna; ramfärg = aktiv flik) ---
  const panel = new Graphics()
  panel.eventMode = 'none'
  view.addChild(panel)
  function redrawPanel() {
    const color = TAB_GROUPS[ui.tab].color
    panel
      .clear()
      .roundRect(PANEL_MARGIN, PANEL_TOP, DESIGN_W - PANEL_MARGIN * 2, DESIGN_H - PANEL_TOP - PANEL_MARGIN, RADIUS.panel)
      .fill(COLORS.cream)
      .stroke({ width: 5, color })
  }

  // --- Topp-rad: hem · titel · sortering · högtalare ---
  const home = new Button({
    icon: '🏠', width: 100, height: 100, color: COLORS.orange, services, sound: 'tap',
    onTap: () => nav.go('menu'),
  })
  home.position.set(SPACING.edge + 52, SPACING.edge + 52)
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
  speaker.position.set(DESIGN_W - SPACING.edge - 52, SPACING.edge + 52)
  view.addChild(speaker)

  // Liten ikon-knapp som växlar sortering (Nyast <-> A–Ö). Ikonen visar AKTUELLT läge,
  // rösten bekräftar bytet.
  const sortBtn = new Button({
    icon: '🆕', width: 96, height: 96, color: COLORS.teal, services, sound: 'flip',
    onTap: () => {
      ui.sort = ui.sort === 'added' ? 'alpha' : 'added'
      saveUI(ui)
      updateSortIcon()
      rebuildGrid(true)
      voice.say(ui.sort === 'alpha' ? 'A till Ö' : 'Nyast först', true)
    },
  })
  sortBtn.position.set(DESIGN_W - SPACING.edge - 104 - SPACING.md - 48, SPACING.edge + 52)
  view.addChild(sortBtn)
  const sortIcon = sortBtn.children.find((ch) => ch instanceof Text)
  function updateSortIcon() {
    if (sortIcon) sortIcon.text = ui.sort === 'alpha' ? '🔤' : '🆕'
  }
  updateSortIcon()

  // --- Flikar: hela bredden, aktiv = full färg + lite högre, inaktiv = urblekt ---
  const tabBar = new Container()
  view.addChild(tabBar)
  const tabW = (DESIGN_W - SPACING.edge * 2 - TAB_GAP * (TAB_GROUPS.length - 1)) / TAB_GROUPS.length
  const tabs = TAB_GROUPS.map((group, i) => {
    const t = makeTab(group, tabW, TAB_H, services, () => selectTab(i, 0))
    t.x = SPACING.edge + i * (tabW + TAB_GAP) + tabW / 2
    t.y = TAB_Y + TAB_H / 2
    tabBar.addChild(t)
    return t
  })
  function updateTabs() {
    tabs.forEach((t, i) => t.setActive(i === ui.tab))
    redrawPanel()
  }

  // Flikbyte från tap eller svep. dir: -1 = nya rutnätet glider in från vänster,
  // +1 = från höger, 0 = ingen glid (tap).
  function selectTab(i, dir) {
    if (ui.tab === i || i < 0 || i >= TAB_GROUPS.length) return
    ui.tab = i
    saveUI(ui)
    updateTabs()
    rebuildGrid(true, dir)
    voice.say(TAB_GROUPS[i].label, true)
  }

  // --- Rutnät (skrollbart), byggs om vid flik-/sorterings-byte ---
  const areaTop = PANEL_TOP + SPACING.sm
  const areaH = DESIGN_H - areaTop - PANEL_MARGIN - SPACING.sm

  const grid = new Container()
  view.addChild(grid)

  const mask = new Graphics().rect(0, areaTop - 8, DESIGN_W, areaH + 16).fill(0xffffff)
  view.addChild(mask)
  grid.mask = mask

  // "mer nedanför"-pil (visas bara när det går att skrolla).
  const hint = new Text({ text: '⬇', style: { fontFamily: FONT.body, fontSize: 40, fill: COLORS.inkSoft } })
  hint.anchor.set(0.5)
  hint.position.set(DESIGN_W / 2, DESIGN_H - 30)
  hint.eventMode = 'none'
  hint.visible = false
  view.addChild(hint)
  gsap.to(hint, { y: DESIGN_H - 38, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })

  // Skroll-/svep-tillstånd (delas med brickorna så ett drag inte startar ett spel).
  const scroll = { dragging: false, moved: false, axis: null, fits: true, minY: areaTop, maxY: areaTop }
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
    gsap.killTweensOf(grid)
    for (const child of [...grid.children]) {
      gsap.killTweensOf(child)
      gsap.killTweensOf(child.scale)
      child.destroy({ children: true })
    }
  }

  function rebuildGrid(animate = false, slideDir = 0) {
    clearGrid()
    const list = orderedGames()
    const N = list.length
    const cols = Math.max(1, Math.min(4, N))
    const rows = Math.ceil(N / cols)
    const gap = 28
    const innerW = DESIGN_W - (PANEL_MARGIN + SPACING.lg) * 2
    const tileW = Math.min(280, (innerW - gap * (cols - 1)) / cols)
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
      if (animate && !slideDir) bounceIn(tile, { delay: Math.min(ANIM.stagger.max, ANIM.stagger.per * i) })
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

    // Svep-glid: nya rutnätet kommer in från den sida barnet drog mot.
    if (slideDir) {
      grid.x = slideDir * 90
      grid.alpha = 0
      gsap.to(grid, { x: 0, alpha: 1, duration: 0.28, ease: 'power2.out' })
    } else {
      grid.x = 0
      grid.alpha = 1
    }
  }
  updateTabs()
  rebuildGrid(true)

  // Drag: lodrätt = skrolla rutnätet, vågrätt = svep mellan flikar (axellås vid ~12px).
  let startPx = 0
  let startPy = 0
  let startGridY = 0
  let dragDx = 0
  const onDown = (e) => {
    const p = view.toLocal(e.global)
    if (p.y < PANEL_TOP) return // svep/skroll gäller spelytan, inte topp-band/flikar
    scroll.dragging = true
    scroll.moved = false
    scroll.axis = null
    startPx = p.x
    startPy = p.y
    startGridY = grid.y
    dragDx = 0
  }
  const onMove = (e) => {
    if (!scroll.dragging) return
    const p = view.toLocal(e.global)
    const dx = p.x - startPx
    const dy = p.y - startPy
    if (!scroll.axis && Math.hypot(dx, dy) > 12) {
      scroll.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      scroll.moved = true
    }
    if (scroll.axis === 'v' && !scroll.fits) {
      grid.y = Math.max(scroll.minY, Math.min(scroll.maxY, startGridY + dy))
      hint.alpha = grid.y <= scroll.minY + 4 ? 0 : 1
    } else if (scroll.axis === 'h') {
      dragDx = dx
      // rutnätet följer fingret med motstånd; extra trögt om det inte finns fler flikar åt hållet
      const target = ui.tab + (dx < 0 ? 1 : -1)
      const hasNext = target >= 0 && target < TAB_GROUPS.length
      const limit = hasNext ? 90 : 26
      grid.x = Math.max(-limit, Math.min(limit, dx * 0.35))
    }
  }
  const onUp = () => {
    if (!scroll.dragging) return
    scroll.dragging = false
    if (scroll.axis !== 'h') return
    const dx = dragDx
    const target = ui.tab + (dx < 0 ? 1 : -1)
    if (Math.abs(dx) > SWIPE_THRESHOLD && target >= 0 && target < TAB_GROUPS.length) {
      // nya rutnätet glider in från hållet barnet drog mot
      selectTab(target, dx < 0 ? 1 : -1)
    } else {
      // för kort drag eller ingen flik åt det hållet -> mjukt tillbaka (roligt, inte fel)
      gsap.to(grid, { x: 0, duration: 0.3, ease: 'back.out(2)' })
    }
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
      for (const t of tabs) t.kill()
      grid.mask = null
    },
  }
}

// --- flik-knapp: godis-look som Button men med aktiv/inaktiv-tillstånd som ritas om ---
function makeTab(group, w, h, services, onSelect) {
  const c = new Container()
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.hitArea = new Rectangle(-w / 2 - 12, -h / 2 - 16, w + 24, h + 32)

  const g = new Graphics()
  const label = new Text({
    text: `${group.icon}  ${group.label}`,
    style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.white, align: 'center' },
  })
  label.anchor.set(0.5)
  label.eventMode = 'none'
  c.addChild(g, label)

  let active = false
  c.setActive = (on) => {
    active = on
    const r = RADIUS.card
    g.clear()
    if (on) {
      g.roundRect(-w / 2, -h / 2 + 8, w, h, r).fill(shade(group.color, 0.2))
      g.roundRect(-w / 2, -h / 2, w, h - 6, r).fill(group.color)
      g.roundRect(-w / 2 + 10, -h / 2 + 8, w - 20, h * 0.3, r * 0.7).fill({ color: COLORS.white, alpha: 0.18 })
    } else {
      g.roundRect(-w / 2, -h / 2 + 8, w, h - 8, r).fill(tint(group.color, 0.62))
    }
    label.style.fill = on ? COLORS.white : COLORS.inkSoft
    gsap.killTweensOf(c.scale)
    gsap.to(c.scale, { x: on ? 1 : 0.92, y: on ? 1 : 0.92, duration: ANIM.settle.duration, ease: ANIM.settle.ease })
    gsap.to(c, { y: TAB_Y + h / 2 + (on ? 0 : 8), duration: ANIM.settle.duration, ease: 'power2.out' })
  }

  c.on('pointerdown', () => gsap.to(c.scale, { x: 0.88, y: 0.88, duration: ANIM.press.duration, ease: ANIM.press.ease }))
  c.on('pointerup', () => gsap.to(c.scale, { x: active ? 1 : 0.92, y: active ? 1 : 0.92, duration: ANIM.release.duration, ease: ANIM.release.ease }))
  c.on('pointerupoutside', () => gsap.to(c.scale, { x: active ? 1 : 0.92, y: active ? 1 : 0.92, duration: ANIM.settle.duration }))
  c.on('pointertap', () => {
    services.audio.sfx('tap')
    onSelect()
  })
  c.kill = () => {
    gsap.killTweensOf(c.scale)
    gsap.killTweensOf(c)
  }
  return c
}

function makeTile(game, w, h, services, earned, scrolling) {
  const { nav, audio } = services
  const cat = CATEGORIES[game.category] || { color: COLORS.orange, label: '' }
  const c = new Container()
  c.eventMode = 'static'
  c.cursor = 'pointer'

  const lip = new Graphics().roundRect(-w / 2, -h / 2 + 8, w, h, RADIUS.card).fill({ color: shade(cat.color, 0.2) })
  const face = new Graphics().roundRect(-w / 2, -h / 2, w, h - 6, RADIUS.card).fill(cat.color)
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
    if (scrolling && scrolling()) return // det var ett skroll-/svep-drag, inte ett val
    audio.sfx('pling')
    nav.go('game', { id: game.id })
  })
  return c
}
