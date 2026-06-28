// Värd för ett spel-modul: laddar ev. bundle, bygger GameContext + ProgressApi,
// monterar modulen och städar vid utgång. Ger hem- och högtalarknapp.
// Se GameModule-kontraktet i CLAUDE.md.
import { Container } from 'pixi.js'
import { Button } from '../../lib/Button.js'
import { bigCelebration } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { GAMES } from '../../games/registry.js'
import { PRAISE, COLORS, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

export async function createGameHost(services, params) {
  const view = new Container()
  const { nav, audio, voice, assets, stickers, profiles } = services

  const game = GAMES.find((g) => g.id === params.id)
  if (!game) {
    nav.go('library')
    return { view, destroy() {} }
  }

  // Spelets egen scen (designkoordinater).
  const stage = new Container()
  view.addChild(stage)

  // Förlopps-API kopplat till aktiv profil + detta spel.
  const progress = makeProgress(services, game.id)
  progress.complete = () => {
    audio.sfx('celebrate')
    voice.say(randomFrom(PRAISE))
    bigCelebration(services.fxLayer, { width: DESIGN_W, height: DESIGN_H })
    progress.update({}) // stämpla lastPlayedAt på spelet
    progress.addStars(1)
    stickers.award(game.id)
    profiles.touchPlayed()
  }

  const exitToLibrary = () => nav.go('library')

  const ctx = {
    stage,
    ticker: services.app.ticker,
    width: DESIGN_W,
    height: DESIGN_H,
    services,
    progress,
    exitToLibrary,
    fxLayer: services.fxLayer,
  }

  // Ladda ev. bundle (de första spelen ritar programmatiskt -> ingen).
  await assets.loadBundle(game.bundle)

  try {
    await game.init(ctx)
    await game.mount?.(ctx)
  } catch (err) {
    console.error('Spelet kraschade vid start', game.id, err)
  }

  // Hem-knapp (tillbaka till biblioteket) – medvetet enkel, ej grindad.
  const home = new Button({
    icon: '🏠',
    width: 92,
    height: 92,
    color: COLORS.orange,
    services,
    sound: 'tap',
    onTap: exitToLibrary,
  })
  home.x = 70
  home.y = 64
  view.addChild(home)

  // Repetera röst-instruktion.
  const speaker = new Button({
    icon: '🔊',
    width: 92,
    height: 92,
    color: COLORS.purple,
    services,
    sound: 'tap',
    onTap: () => voice.replayLast(),
  })
  speaker.x = DESIGN_W - 70
  speaker.y = 64
  view.addChild(speaker)

  return {
    view,
    destroy() {
      try {
        game.destroy?.(ctx)
      } catch (err) {
        console.warn('Fel vid städning av spel', game.id, err)
      }
      assets.unloadBundle(game.bundle)
      voice.cancel()
    },
  }
}

function makeProgress(services, gameId) {
  const { save, profiles } = services
  const ensure = (d) => {
    const p = d.profiles.find((x) => x.id === d.activeProfileId) || d.profiles[0]
    if (!p.games[gameId]) {
      p.games[gameId] = { unlocked: true, highestLevel: 0, stars: 0, lastPlayedAt: null, custom: {} }
    }
    return p
  }
  return {
    get() {
      const p = profiles.active()
      return p?.games?.[gameId] || { unlocked: true, highestLevel: 0, stars: 0, custom: {} }
    },
    update(patch) {
      save.update((d) => {
        const p = ensure(d)
        Object.assign(p.games[gameId], patch)
        p.games[gameId].lastPlayedAt = new Date().toISOString()
      })
    },
    setLevel(n) {
      save.update((d) => {
        const p = ensure(d)
        if (n > p.games[gameId].highestLevel) p.games[gameId].highestLevel = n
      })
    },
    addStars(n = 1) {
      save.update((d) => {
        const p = ensure(d)
        p.games[gameId].stars += n
        p.stats.starsTotal = (p.stats.starsTotal || 0) + n
      })
    },
    setCustom(key, value) {
      save.update((d) => {
        const p = ensure(d)
        p.games[gameId].custom[key] = value
      })
    },
    complete() {
      /* ersätts av GameHost med firande + klistermärke */
    },
  }
}
