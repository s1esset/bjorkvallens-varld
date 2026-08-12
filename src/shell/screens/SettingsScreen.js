// Inställningar (nås bakom föräldra-grinden). Ljud, profiler (skapa/byt namn/
// nollställ/ta bort/byt avatar) och data (exportera/importera/börja om).
import { Container, Graphics, Text } from 'pixi.js'
import { Button } from '../../lib/Button.js'
import { confirmDialog } from '../../lib/confirm.js'
import { promptText } from '../../lib/domModal.js'
import { AVATARS, avatarEmoji } from '../../lib/swedish.js'
import { COLORS, FONT, DESIGN_W, DESIGN_H } from '../../lib/theme.js'
import { setDetaljniva } from '../../lib/form.js'

export async function createSettingsScreen(services) {
  const view = new Container()
  const { nav, save, profiles, audio } = services

  const title = new Text({
    text: 'Inställningar',
    style: { fontFamily: FONT.title, fontSize: 50, fontWeight: '700', fill: COLORS.ink },
  })
  title.anchor.set(0.5)
  title.x = DESIGN_W / 2
  title.y = 56
  view.addChild(title)

  const back = new Button({
    icon: '⬅',
    width: 96,
    height: 96,
    color: COLORS.orange,
    services,
    sound: 'tap',
    onTap: () => nav.go('menu'),
  })
  back.x = 74
  back.y = 60
  view.addChild(back)

  // ---------- LJUD- och BILD-panel ----------
  // Sex rader i stället för fem, i SAMMA ruta: radavståndet är 64 (volymraden 70) i
  // stället för 76/86. Att i stället göra panelen högre såg ut att gå ihop på papperet
  // och gjorde det inte — DATA-radens knappar är CENTRERADE på sin y (632 ⇒ 590–674),
  // så en panel som slutar på 610 ligger redan under dem. Det syntes först i
  // `scripts/_installningsbild.mjs`; ingen testkörning öppnar den här skärmen.
  // Sista raden (406) slutar på 456, 14 px ovanför panelens 470.
  const sound = panel(70, 110, 540, 470, 'Ljud och bild')
  view.addChild(sound.box)
  let sy = 80
  const settings = () => save.data.settings

  sound.box.addChild(
    toggleRow('Musik', () => settings().musicEnabled, (v) => setSetting('musicEnabled', v), sy),
  )
  sy += 64
  sound.box.addChild(
    toggleRow('Ljudeffekter', () => settings().sfxEnabled, (v) => setSetting('sfxEnabled', v), sy),
  )
  sy += 64
  sound.box.addChild(
    toggleRow('Röst (svenska)', () => settings().voiceEnabled, (v) => setSetting('voiceEnabled', v), sy),
  )
  sy += 64
  sound.box.addChild(volumeRow(sy))
  sy += 70
  sound.box.addChild(
    toggleRow('Föräldra-grind', () => settings().parentalGateEnabled, (v) => setSetting('parentalGateEnabled', v), sy),
  )
  sy += 64
  // Enklare grafik = app-bred detaljnivå 0 (platta färger) i stället för 2 (bakade
  // gradienter). Nivån sätts direkt, men `lib/form.js` cachar varje gradient vid första
  // ritningen — redan ritade skärmar behåller alltså sitt utseende, och ändringen syns
  // i spel som öppnas därefter. Nivå 1 finns kvar för kod, men en förälder ska välja
  // mellan två lägen, inte tre.
  sound.box.addChild(
    toggleRow('Enklare grafik', () => settings().enklareGrafik, (v) => {
      setSetting('enklareGrafik', v)
      setDetaljniva(v ? 0 : 2)
    }, sy),
  )

  function setSetting(key, value) {
    save.update((d) => {
      d.settings[key] = value
    })
    audio.sfx('tap')
  }

  // ---------- PROFIL-panel ----------
  const prof = panel(650, 110, 560, 470, 'Profiler')
  view.addChild(prof.box)
  const profList = new Container()
  profList.x = 0
  profList.y = 70
  prof.box.addChild(profList)

  function rebuildProfiles() {
    profList.removeChildren()
    const list = profiles.list()
    list.slice(0, 4).forEach((p, i) => {
      profList.addChild(profileRow(p, i * 88))
    })
    const addBtn = new Button({
      label: 'Ny profil',
      icon: '➕',
      width: 240,
      height: 64,
      color: COLORS.green,
      services,
      sound: 'pling',
      onTap: async () => {
        const name = await promptText({ title: 'Vad heter barnet?', placeholder: 'Namn', maxLength: 14 })
        if (name) {
          profiles.create(name, AVATARS[Math.floor(Math.random() * AVATARS.length)].id)
          rebuildProfiles()
        }
      },
    })
    addBtn.x = 270
    addBtn.y = Math.min(list.length, 4) * 88 + 40
    profList.addChild(addBtn)
  }
  rebuildProfiles()

  function profileRow(p, y) {
    const row = new Container()
    row.y = y
    const active = p.id === profiles.activeId()
    const bg = new Graphics().roundRect(20, -2, 520, 76, 20).fill(active ? COLORS.yellow : COLORS.bg).stroke({ width: active ? 4 : 2, color: COLORS.orange })
    bg.eventMode = 'static'
    bg.cursor = 'pointer'
    bg.on('pointertap', () => {
      profiles.setActive(p.id)
      audio.sfx('tap')
      rebuildProfiles()
    })
    row.addChild(bg)

    // avatar (tap = byt avatar)
    const av = new Text({ text: avatarEmoji(p.avatar), style: { fontFamily: FONT.body, fontSize: 46 } })
    av.anchor.set(0.5)
    av.x = 64
    av.y = 36
    av.eventMode = 'static'
    av.cursor = 'pointer'
    av.on('pointertap', () => {
      const idx = AVATARS.findIndex((a) => a.id === p.avatar)
      const next = AVATARS[(idx + 1) % AVATARS.length].id
      profiles.setAvatar(p.id, next)
      audio.sfx('pop')
      rebuildProfiles()
    })
    row.addChild(av)

    const nm = new Text({
      text: p.name,
      style: { fontFamily: FONT.title, fontSize: 28, fontWeight: '700', fill: COLORS.ink },
    })
    nm.anchor.set(0, 0.5)
    nm.x = 100
    nm.y = 36
    row.addChild(nm)

    // små åtgärdsknappar
    const mk = (icon, x, color, onTap, sound = 'tap') => {
      const b = new Button({ icon, width: 58, height: 58, color, radius: 16, services, sound, onTap })
      b.x = x
      b.y = 36
      return b
    }
    row.addChild(
      mk('✎', 360, COLORS.blue, async () => {
        const name = await promptText({ title: 'Byt namn', value: p.name, maxLength: 14 })
        if (name) {
          profiles.rename(p.id, name)
          rebuildProfiles()
        }
      }),
    )
    row.addChild(
      mk('↺', 428, COLORS.purple, async () => {
        const ok = await confirmDialog(services.gateLayer, services, { title: `Nollställa ${p.name}s framsteg?`, yes: 'Nollställ', no: 'Avbryt' })
        if (ok) {
          profiles.resetProfile(p.id)
          rebuildProfiles()
        }
      }),
    )
    row.addChild(
      mk('🗑', 496, COLORS.red, async () => {
        const ok = await confirmDialog(services.gateLayer, services, { title: `Ta bort ${p.name}?`, yes: 'Ta bort', no: 'Avbryt', yesColor: COLORS.red })
        if (ok) {
          profiles.remove(p.id)
          rebuildProfiles()
        }
      }),
    )
    return row
  }

  // ---------- DATA-rad ----------
  const dataRow = new Container()
  dataRow.y = 632
  view.addChild(dataRow)

  const exportBtn = new Button({
    label: 'Exportera',
    icon: '💾',
    width: 250,
    height: 84,
    color: COLORS.teal,
    services,
    sound: 'tap',
    onTap: () => exportSave(),
  })
  exportBtn.x = 250
  dataRow.addChild(exportBtn)

  const importBtn = new Button({
    label: 'Importera',
    icon: '📂',
    width: 250,
    height: 84,
    color: COLORS.blue,
    services,
    sound: 'tap',
    onTap: () => importSave(),
  })
  importBtn.x = 520
  dataRow.addChild(importBtn)

  const resetBtn = new Button({
    label: 'Börja om helt',
    icon: '🧹',
    width: 290,
    height: 84,
    color: COLORS.red,
    services,
    sound: 'tap',
    onTap: async () => {
      const ok = await confirmDialog(services.gateLayer, services, {
        title: 'Radera ALLA profiler och framsteg?',
        yes: 'Radera allt',
        no: 'Avbryt',
        yesColor: COLORS.red,
      })
      if (ok) {
        save.resetAll()
        profiles.create('Barn', AVATARS[0].id)
        rebuildProfiles()
        services.toast?.('Allt nollställt')
      }
    },
  })
  resetBtn.x = 820
  dataRow.addChild(resetBtn)

  const okBtn = new Button({
    label: 'Klar',
    icon: '✔',
    width: 200,
    height: 84,
    color: COLORS.green,
    services,
    sound: 'pling',
    onTap: () => nav.go('menu'),
  })
  okBtn.x = 1090
  dataRow.addChild(okBtn)

  function exportSave() {
    try {
      const blob = new Blob([save.exportJSON()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'barnspel-spar.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      services.toast?.('Sparfil nedladdad')
    } catch {
      services.toast?.('Kunde inte exportera')
    }
  }

  function importSave() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      try {
        const text = await f.text()
        save.importJSON(text)
        rebuildProfiles()
        services.toast?.('Importerat!')
      } catch {
        services.toast?.('Kunde inte läsa filen')
      }
    }
    input.click()
  }

  // ---------- hjälpare ----------
  function panel(x, y, w, h, heading) {
    const box = new Container()
    box.x = x
    box.y = y
    const bg = new Graphics().roundRect(0, 0, w, h, 28).fill(COLORS.cream).stroke({ width: 3, color: 0xeadfca })
    const ht = new Text({ text: heading, style: { fontFamily: FONT.title, fontSize: 34, fontWeight: '700', fill: COLORS.orange } })
    ht.x = 30
    ht.y = 22
    box.addChild(bg, ht)
    return { box }
  }

  function toggleRow(label, get, set, y) {
    const row = new Container()
    row.y = y
    const lbl = new Text({ text: label, style: { fontFamily: FONT.body, fontSize: 28, fontWeight: '700', fill: COLORS.ink } })
    lbl.x = 30
    lbl.y = 16
    row.addChild(lbl)

    const pill = new Container()
    pill.x = 400
    pill.y = 28
    pill.eventMode = 'static'
    pill.cursor = 'pointer'
    const draw = () => {
      pill.removeChildren()
      const on = get()
      const bg = new Graphics().roundRect(0, -22, 120, 44, 22).fill(on ? COLORS.green : 0xcbbda9)
      const knob = new Graphics().circle(on ? 96 : 24, 0, 17).fill(COLORS.white)
      const t = new Text({ text: on ? 'På' : 'Av', style: { fontFamily: FONT.body, fontSize: 20, fontWeight: '700', fill: COLORS.white } })
      t.anchor.set(0.5)
      t.x = on ? 42 : 78
      pill.addChild(bg, t, knob)
    }
    draw()
    pill.on('pointertap', () => {
      set(!get())
      draw()
    })
    row.addChild(pill)
    return row
  }

  function volumeRow(y) {
    const row = new Container()
    row.y = y
    const lbl = new Text({ text: 'Volym', style: { fontFamily: FONT.body, fontSize: 28, fontWeight: '700', fill: COLORS.ink } })
    lbl.x = 30
    lbl.y = 16
    row.addChild(lbl)

    const barX = 220
    const barW = 200
    const bar = new Graphics()
    bar.y = 30
    const drawBar = () => {
      const v = settings().masterVolume ?? 0.8
      bar.clear()
      bar.roundRect(barX, -10, barW, 20, 10).fill(0xe7dcc6)
      bar.roundRect(barX, -10, barW * v, 20, 10).fill(COLORS.orange)
    }
    drawBar()
    row.addChild(bar)

    const minus = new Button({ icon: '−', width: 58, height: 58, color: COLORS.red, radius: 16, services, sound: 'tap', onTap: () => step(-0.1) })
    minus.x = 170
    minus.y = 30
    const plus = new Button({ icon: '+', width: 58, height: 58, color: COLORS.green, radius: 16, services, sound: 'tap', onTap: () => step(0.1) })
    plus.x = 470
    plus.y = 30
    row.addChild(minus, plus)

    function step(d) {
      save.update((s) => {
        s.settings.masterVolume = Math.max(0, Math.min(1, Math.round(((s.settings.masterVolume ?? 0.8) + d) * 10) / 10))
      })
      drawBar()
      audio.sfx('pop')
    }
    return row
  }

  return {
    view,
    destroy() {},
  }
}
