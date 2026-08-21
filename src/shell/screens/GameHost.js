// Värd för ett spel-modul: laddar ev. bundle, bygger GameContext + ProgressApi,
// monterar modulen och städar vid utgång. Ger hem- och högtalarknapp.
// Se GameModule-kontraktet i CLAUDE.md.
import { Container } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { bigCelebration } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { GAMES } from '../../games/registry.js'
import { PRAISE, COLORS, DESIGN_W, DESIGN_H, ANIM } from '../../lib/theme.js'
import { startGame, endGame, log as diag, flag as diagFlag, logProgress } from '../../lib/gamelog.js'

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

  // Fördröjda anrop som ALLTID dör med spelomgången.
  //
  // Spelmodulerna är singletons (registry.js exporterar objekt, inte klasser). En
  // `gsap.delayedCall` från förra omgången överlever därför `destroy`, och när samma spel
  // startas igen är `this._alive` åter `true` — vakten `if (!this._alive) return` SLÄPPER
  // alltså igenom den gamla callbacken, som kör mitt i den nya omgången. Fönstret är exakt
  // så långt som ens fördröjning, och att gå ut och in snabbt är precis vad ett barn gör.
  //
  // ctx.later() knyter varje fördröjt anrop till DEN HÄR omgången: vid destroy dödas de,
  // och en callback från en tidigare omgång kan aldrig köra.
  const timers = new Set()
  const later = (delaySeconds, fn) => {
    const call = gsap.delayedCall(delaySeconds, () => {
      timers.delete(call)
      diag('timer', 'kor', { efter: delaySeconds, kvar: timers.size })
      fn()
    })
    timers.add(call)
    diag('timer', 'satt', { efter: delaySeconds, aktiva: timers.size })
    return call
  }

  const ctx = {
    stage,
    ticker: services.app.ticker,
    width: DESIGN_W,
    height: DESIGN_H,
    // Synlig designyta (lib/view.js): levande objekt som muteras vid resize. Läs vid
    // användning (spawn/wrap/cull-marginaler), cachea inte fälten, mutera aldrig.
    // Vid 16:9 är view identiskt med 0,0..1280,720.
    view: services.scaler.view,
    services,
    progress,
    exitToLibrary,
    later,
    fxLayer: services.fxLayer,
  }

  // Diagnostiklogg för hela omgången (DEV-only, no-op i bygget).
  startGame(game.id, ctx)
  // DEV-only: exponera den KÖRANDE modulinstansen för sonder (scripts/_*.mjs).
  // En sond som importerar spel-URL:en själv kan få en annan instans så fort
  // Vite HMR-stämplat modulen (?t=…) — den här referensen är alltid rätt.
  if (import.meta.env.DEV && window.__barnspel) {
    window.__barnspel.game = game
    // ...och omgångens ctx, så en sond kan driva spelets egna metoder (t.ex. lösa
    // banan med _autoHelp) utan att snickra ihop en falsk ctx som inte är den riktiga.
    window.__barnspel.ctx = ctx
  }
  for (const k of ['complete', 'update', 'setLevel', 'addStars', 'setCustom']) {
    const orig = progress[k].bind(progress)
    progress[k] = (...a) => {
      logProgress(k, k === 'setCustom' ? { key: a[0] } : a[0])
      return orig(...a)
    }
  }

  // Ladda ev. bundle (de första spelen ritar programmatiskt -> ingen).
  await assets.loadBundle(game.bundle)

  try {
    const tInit = performance.now()
    await game.init(ctx)
    diag('liv', 'init', { ms: Math.round(performance.now() - tInit) })
    const tMount = performance.now()
    await game.mount?.(ctx)
    diag('liv', 'mount', { ms: Math.round(performance.now() - tMount), barn: stage.children.length })
  } catch (err) {
    diagFlag('start-krasch', 'Spelet kastade ett fel i init/mount', { text: String(err?.message || err).slice(0, 200) }, 'fel')
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
    onTap: () => voice.replayLast(true), // uttrycklig knapp: kringgå anti-upprepning
  })
  speaker.x = DESIGN_W - 70
  speaker.y = 64
  view.addChild(speaker)

  // Ankomst-takt: spelet sätter sig på plats i stället för att bara stå där. Skalan går
  // NEDÅT mot 1 (1.06 -> 1), aldrig under — en scale-in underifrån hade visat skalets
  // creme runt kanterna en halv sekund, och full bleed finns just för att slippa det.
  // Pivot i designens mitt så barnens koordinater är oförändrade.
  view.pivot.set(DESIGN_W / 2, DESIGN_H / 2)
  view.position.set(DESIGN_W / 2, DESIGN_H / 2)
  view.scale.set(1.06)
  gsap.to(view.scale, { x: 1, y: 1, duration: ANIM.enter.duration, ease: 'power3.out' })

  // Har omgången redan tystats av `Nav.go()`? Se `destroy()` — flaggan avgör om rivningen
  // fortfarande får röra rösten, och vid rivningen är rösten någon annans.
  let pausad = false

  return {
    view,
    // Skalet river den här skärmen först när övergången glidit klart. `Nav.go()` kallar
    // `pause()` i stället direkt vid trycket, så omgången inte låter vidare ovanpå nästa
    // skärm (ÅTGÄRDER V18). Bara det som HÖRS och det som kan HÄNDA tystas — tickern rullar
    // vidare, för bilden ska glida undan levande.
    pause() {
      pausad = true
      if (timers.size) diag('timer', 'dodade-vid-paus', { antal: timers.size })
      for (const t of timers) t.kill()
      timers.clear()
      voice.cancel()
      audio.stopAllLoops()
    },
    destroy() {
      gsap.killTweensOf(view.scale)
      // Döda omgångens fördröjda anrop FÖRE spelets egen städning, så inget hinner
      // köra mot halvrivna objekt (och inget överlever till nästa omgång).
      if (timers.size) diag('timer', 'dodade-vid-exit', { antal: timers.size })
      for (const t of timers) t.kill()
      timers.clear()
      if (import.meta.env.DEV && window.__barnspel?.game === game) window.__barnspel.game = null
      try {
        game.destroy?.(ctx)
      } catch (err) {
        diagFlag('destroy-krasch', 'Spelet kastade ett fel i destroy — exit-säkerheten brister', { text: String(err?.message || err).slice(0, 200) }, 'fel')
        console.warn('Fel vid städning av spel', game.id, err)
      }
      endGame('exit')
      assets.unloadBundle(game.bundle)
      // ⚠️ BARA om ingen paus hunnit före. Rivningen sker 270–285 ms efter trycket (uppmätt,
      // `_bytprobe`), och då talar NÄSTA skärm sedan 270 ms — dess replik startar 1–3 ms in.
      // `voice.cancel()` här kapade alltså den nya skärmens mening mitt i, varje gång barnet
      // lämnade ett spel. Kvar som skyddsnät för en väg som river utan att pausa.
      if (pausad) return
      voice.cancel()
      // Kontinuerliga ljud (kranen, fläkten) hör till OMGÅNGEN. Ett spel som glömmer att
      // stoppa sin slinga — eller vars `destroy` kraschar ovan — hade annars låtit vidare
      // på menyn, och ett brum utan bild går inte att förstå eller stänga av. Städas här
      // av samma skäl som `timers`: skalet får inte lita på att spelet gjorde rätt.
      audio.stopAllLoops()
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
