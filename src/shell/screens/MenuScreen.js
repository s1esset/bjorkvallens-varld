// Huvudmeny: Spela (stor), inställningar (kugghjul, grindad), avsluta (grindad).
// Visar aktiv profil (avatar + namn + stjärnor). Profilbyte är ogrindat (vem som spelar).
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { makeMascot } from '../../lib/mascot.js'
import { confirmDialog } from '../../lib/confirm.js'
import { avatarEmoji } from '../../lib/swedish.js'
import { COLORS, FONT, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

export async function createMenuScreen(services) {
  const view = new Container()
  const { nav, gate, audio, voice, profiles, save } = services

  // Applicera en ev. väntande app-uppdatering vid denna lugna punkt.
  services.applyPendingUpdateAtMenu?.()

  const mascot = makeMascot(70)
  mascot.x = DESIGN_W / 2
  mascot.y = 150
  view.addChild(mascot)
  gsap.to(mascot, { y: 138, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })

  const title = new Text({
    text: 'Barnspel',
    style: { fontFamily: FONT.display, fontSize: 72, fontWeight: '700', fill: COLORS.orange },
  })
  title.anchor.set(0.5)
  title.x = DESIGN_W / 2
  title.y = 270
  view.addChild(title)

  // Profil-chip
  const chip = makeProfileChip(services)
  chip.x = DESIGN_W / 2
  chip.y = 360
  view.addChild(chip)

  // Stor Spela-knapp
  const play = new Button({
    label: 'Spela',
    icon: '▶',
    width: 420,
    height: 150,
    color: COLORS.green,
    fontSize: 60,
    services,
    sound: 'pling',
    onTap: () => nav.go('library'),
  })
  play.x = DESIGN_W / 2
  play.y = 520
  view.addChild(play)
  gsap.from(play.scale, { x: 0, y: 0, duration: 0.5, ease: 'back.out(1.7)', delay: 0.1 })

  // Kugghjul (inställningar) – grindat
  const gear = new Button({
    icon: '⚙️',
    width: 104,
    height: 104,
    color: COLORS.blue,
    services,
    sound: 'tap',
    onTap: async () => {
      const ok = await gate.open({ title: 'Inställningar' })
      if (ok) nav.go('settings')
    },
  })
  gear.x = DESIGN_W - 90
  gear.y = 90
  view.addChild(gear)

  // Avsluta – grindat
  const exit = new Button({
    icon: '🚪',
    width: 104,
    height: 104,
    color: COLORS.red,
    services,
    sound: 'tap',
    onTap: () => onExit(),
  })
  exit.x = 90
  exit.y = 90
  view.addChild(exit)

  async function onExit() {
    const ok = await gate.open({ title: 'Avsluta appen?' })
    if (!ok) return
    const yes = await confirmDialog(services.gateLayer, services, {
      title: 'Vill du avsluta?',
      yes: 'Avsluta',
      no: 'Stanna',
      yesColor: COLORS.red,
    })
    if (!yes) return
    save.flush()
    voice.cancel()
    try {
      window.close()
    } catch {
      /* tillåts inte i installerad PWA */
    }
    // window.close() fungerar inte i installerade PWA:er -> gå till splash + tips.
    setTimeout(() => {
      services.toast?.('Du kan stänga appen nu')
      nav.go('splash')
    }, 350)
  }

  return {
    view,
    destroy() {
      gsap.killTweensOf(mascot)
      gsap.killTweensOf(play.scale)
    },
  }
}

// --- profil-chip + enkel väljare ---
function makeProfileChip(services) {
  const { profiles, audio } = services
  const c = new Container()
  c.eventMode = 'static'
  c.cursor = 'pointer'

  const redraw = () => {
    c.removeChildren()
    const p = profiles.active()
    const name = p?.name || 'Barn'
    const stars = p?.stats?.starsTotal || 0
    const label = new Text({
      text: `${avatarEmoji(p?.avatar)}  ${name}   ⭐ ${stars}`,
      style: { fontFamily: FONT.title, fontSize: 32, fontWeight: '700', fill: COLORS.ink },
    })
    label.anchor.set(0.5)
    const w = label.width + 70
    const bg = new Graphics().roundRect(-w / 2, -34, w, 68, 34).fill(COLORS.cream).stroke({ width: 4, color: COLORS.orange })
    const switchHint = new Text({
      text: 'byt',
      style: { fontFamily: FONT.body, fontSize: 20, fontWeight: '700', fill: COLORS.orange },
    })
    switchHint.anchor.set(0.5)
    switchHint.x = w / 2 - 22
    switchHint.y = -34
    c.addChild(bg, label, switchHint)
  }
  redraw()

  c.on('pointertap', async () => {
    audio.sfx('tap')
    await openProfilePicker(services)
    redraw()
  })
  return c
}

function openProfilePicker(services) {
  const { profiles, gateLayer, audio } = services
  return new Promise((resolve) => {
    const root = new Container()
    const cx = DESIGN_W / 2
    const cy = DESIGN_H / 2
    const backdrop = new Graphics().rect(-1200, -1200, DESIGN_W + 2400, DESIGN_H + 2400).fill({ color: 0x281e14, alpha: 0.5 })
    backdrop.eventMode = 'static'
    backdrop.on('pointertap', () => close())
    root.addChild(backdrop)

    const list = profiles.list()
    const card = new Graphics().roundRect(cx - 360, cy - 220, 720, 440, 36).fill(COLORS.cream)
    const tt = new Text({ text: 'Vem spelar?', style: { fontFamily: FONT.title, fontSize: 40, fontWeight: '700', fill: COLORS.ink } })
    tt.anchor.set(0.5)
    tt.x = cx
    tt.y = cy - 165
    root.addChild(card, tt)

    const perRow = 4
    list.slice(0, 8).forEach((p, i) => {
      const col = i % perRow
      const row = Math.floor(i / perRow)
      const x = cx - ((Math.min(list.length, perRow) - 1) * 160) / 2 + col * 160
      const y = cy - 50 + row * 170
      const item = new Container()
      item.x = x
      item.y = y
      item.eventMode = 'static'
      item.cursor = 'pointer'
      const active = p.id === profiles.activeId()
      const bg = new Graphics().roundRect(-66, -66, 132, 132, 28).fill(active ? COLORS.yellow : COLORS.bg).stroke({ width: active ? 6 : 3, color: COLORS.orange })
      const av = new Text({ text: avatarEmoji(p.avatar), style: { fontFamily: FONT.body, fontSize: 64 } })
      av.anchor.set(0.5)
      av.y = -12
      const nm = new Text({ text: p.name, style: { fontFamily: FONT.body, fontSize: 22, fontWeight: '700', fill: COLORS.ink } })
      nm.anchor.set(0.5)
      nm.y = 44
      item.addChild(bg, av, nm)
      item.on('pointertap', () => {
        audio.sfx('pling')
        profiles.setActive(p.id)
        close()
      })
      root.addChild(item)
    })

    root.alpha = 0
    gateLayer.addChild(root)
    gsap.to(root, { alpha: 1, duration: 0.18 })

    function close() {
      gsap.to(root, { alpha: 0, duration: 0.16, onComplete: () => {
        root.destroy({ children: true })
        resolve()
      } })
    }
  })
}
