# CLAUDE.md — Björkvallens Värld

Guidance for Claude Code (and humans) working in this repo. **Read this fully before adding or changing a game.** Deeper background lives in `ARCHITECTURE.md`.

## What this is

**Barnspel** is an offline-first, installable **PWA of mini-games for children aged 2–5**, fully in **Swedish** (UI, voice, text). Tablet-first. **No ads, no third-party tracking, no runtime network calls.** A thin shell (splash → menu → settings/library → game) hosts hot-swappable, self-contained **game modules** that all implement one contract and use shared services.

## Commands

```bash
npm install        # engångs
npm run dev        # Vite dev-server med HMR  -> http://localhost:5173
npm run build      # produktionsbygge (genererar service worker + manifest)
npm run preview    # servera produktionsbygget lokalt (testa PWA/offline)
npm run icons      # generera app-ikoner (public/icons) — beroendefritt (Node zlib)
npm run assets     # försök hämta egen-hostade typsnitt till public/fonts (kräver nät)
```

## Stack

PixiJS v8 (WebGL) · Vite 5 · vite-plugin-pwa (Workbox `generateSW`) · GSAP · vanilla JS (ESM).
Audio = hybrid: förinspelade RIKTIGA klipp (offline mp3) + procedurell Web Audio som fallback.
Riktiga SFX/djurläten genereras lokalt med MOSS-SoundEffect (`npm run sfx` → `scripts/gen-sfx.py`).
Röst = Web Speech `sv-SE` i grundbygget (uppgradera till förgenererade Piper-klipp, offline).

## Design system & versioning

- **`docs/DESIGN.md` är appens globala UI-designsystem** (spacing/färgroller/typografi/radier/rörelse/komponenter). Tokens finns i `src/lib/theme.js` (`SPACING`, `RADIUS`, `ANIM`, `shade()`, `tint()`). Följ det för allt skal-/UI-arbete; hårdkoda inte värden som har en token.
- **Versionsnummer:** menyns uppdateringsknapp visar `vM.NN` (från `package.json` `version`, MINOR zero-paddat — se `docs/DESIGN.md §9`). **Bumpa MINOR i `package.json` vid varje hopslagen ändringsomgång** (fler steg vid större omgångar; MAJOR vid milstolpar) — annars kan föräldern inte se att uppdateringen slog igenom.

## Non-negotiable design rules (P0 — bake into every screen and game)

```
TOUCH_TARGET_MIN  = 96px (>=2cm); spacing >=24px; +24px osynlig hit-halo
DESIGN_RESOLUTION = 1280x720 (landskap); Math.min letterbox-skala (contain)
GESTURES_ALLOWED  = [tap, enkel-drag(snäpp, med tap-tap-fallback)]
GESTURES_FORBIDDEN= [dubbeltryck, långtryck, pinch, rotation, multitouch, snabb-svep-nav, exakt drag]
FEEDBACK          = varje pekning -> ljud+bild < 100ms; ENDAST positivt
NAV               = ikon-först, noll läsning; talad svensk instruktion + repetera-knapp per skärm
PARENTAL_GATE     = tryck-och-håll 2,5s på inställningar/avsluta/ta bort/nollställ/länkar
NO                = reklam, 3:e-parts-spårning, analytics, nätanrop vid körning, ogrindade länkar,
                    felsteg/"game over", poäng-som-sjunker, bestraffande timers
DATA              = endast localStorage JSON; ingen PII lämnar enheten
SWEDISH           = full åäö i UI/röst; ASCII-vik (a/a/o) för id:n/filnamn/ljudnycklar
CHARACTERS        = avbildade människor/personer heter ENDAST Zacke/Alissa/Elvira/Lova
                    (djur, monster, nallen och maskoten Bobo undantas) — se lib/theme.js
PWA               = fullscreen/standalone, touch-action:none, ingen user-scalable, orientation-lås,
                    ingen kontextmeny
PIXI_V8           = await app.init(); app.canvas; eventMode; ticker.deltaMS/deltaTime; preference:'webgl'
```

Wrong/empty taps must still be **fun** (object wiggles, soft neutral sound) — never a buzzer, red X, or scolding. Rewards are short (1–2s) celebrations + Swedish voice praise + a sticker. No points/streaks/FOMO.

## Folder structure

```
public/
  icons/            app-ikoner (genereras med npm run icons)
  fonts/            Fredoka/Baloo2/Nunito WOFF2 + OFL.txt (npm run assets)
  assets/           valfria spel-bundles (atlas/ljud) per spel
src/
  main.js           bootstrap: skapar Pixi-app, tjänster, router, startar splash
  styles.css        låser webbläsargester (touch-action:none m.m.) + @font-face
  shell/
    App.js          äger Pixi Application + lager (bg/world/screenHolder/fxLayer/gateLayer)
    Nav.js          skärm-router (state machine + fade)
    screens/        SplashScreen, MenuScreen, SettingsScreen, LibraryScreen, GameHost
  services/
    Scaler.js       designupplösning + letterbox
    SaveService.js  localStorage JSON (debounce, flush, validera, migrera, backup)
    ProfileService.js  multi-profil CRUD ovanpå SaveService
    AudioService.js procedurella SFX (sfx-namn) — byt till @pixi/sound senare
    VoiceService.js talad svenska (say) — Web Speech nu, Piper-klipp senare
    AssetService.js Pixi Assets-wrapper (registerBundle/loadBundle/unloadBundle/get)
    StickerService.js  belöningsslinga (award/list/has)
    ParentalGate.js tryck-och-håll-grind -> Promise<boolean>
  lib/
    theme.js        DESIGN_W/H, FONT, COLORS, PLAYFUL, CATEGORIES, PRAISE
    Button.js       stor barnknapp (hit-halo, studs, ljud)
    DragController.js  återanvändbar drag m. snäpp/snäpp-tillbaka/tap-tap
    feedback.js     bounceIn/pop/wiggle (på egna objekt — döda tweens i destroy) · puff/sparkle/bigCelebration/floatText (självstädande/exit-säkra)
    mascot.js       maskoten "Bobo" (Pixi Graphics)
    confirm.js      Ja/Nej-dialog
    domModal.js     DOM-textinmatning (namnge profil)
    toast.js        lugn avi-text
    swedish.js      asciiFold, AVATARS, shuffle, randomFrom
    fonts.js / pwa.js
  games/
    registry.js     GAMES = [ ...moduler ]  (biblioteket läser härifrån)
    klambubblor/    sortera-skrap/    vandkort/    (ett index.js per spel)
```

## The GameModule contract

Every game is a folder under `src/games/<id>/` whose `index.js` **default-exports one object** matching this shape. The shell never reaches inside a game; the game only touches the world through the injected `ctx`.

```js
/**
 * @typedef {Object} GameModule
 * // --- statiska metadata (LibraryScreen + AssetService) ---
 * @property {string}  id          ASCII-id == mappnamn == bundle, t.ex. "klambubblor"
 * @property {string}  titleSv     svensk titel MED åäö, t.ex. "Klämbubblor"
 * @property {string}  icon        emoji/asset-nyckel till brickan, t.ex. "🫧"
 * @property {'drag'|'larande'|'pedagogiskt'|'roligt'|'fysik'|'pussel'|'motorik'|'minne'} category
 * @property {'tap'|'drag'|'mixed'} input
 * @property {[number,number]} ageRange   t.ex. [2,3]
 * @property {string}  bundle      Assets-bundle att ladda (oftast == id; valfritt)
 * @property {string=} voiceIntro  svensk fras som spelas vid mount, t.ex. "Tryck på bubblorna!"
 * // --- livscykel (anropas av GameHost; alla får vara async) ---
 * @property {(ctx: GameContext) => (Promise<void>|void)} init     // bygg scenen i ctx.stage (bundle redan laddad)
 * @property {(ctx: GameContext) => (Promise<void>|void)} [mount]  // starta spel: säg voiceIntro, starta ticker, idle-recue
 * @property {(ctx: GameContext) => void} destroy                  // ta bort lyssnare, gsap.killTweensOf, förstör barn
 */

/**
 * @typedef {Object} GameContext      // injiceras i varje livscykel-anrop
 * @property {import('pixi.js').Container} stage   // spelets egen rot, redan skalad/centrerad i 1280x720-rymden
 * @property {import('pixi.js').Ticker}    ticker  // läs ticker.deltaMS / ticker.deltaTime
 * @property {number} width   // 1280
 * @property {number} height  // 720
 * @property {Services} services
 * @property {ProgressApi} progress
 * @property {() => void} exitToLibrary
 * @property {import('pixi.js').Container} fxLayer // för konfetti/firande ovanpå
 */

/**
 * @typedef {Object} Services
 * @property {AudioService}   audio    // audio.sfx(name) riktigt klipp om det finns, annars syntes ('pop'|'pling'|'correct'|'match'|'soft'|'flip'|'celebrate'|'whoosh'|'reveal'|'tap'); audio.sample('djur_ko'…) spelar ENDAST ett riktigt klipp (returnerar true om spelat, annars false → falla tillbaka på rösten)
 * @property {VoiceService}   voice    // voice.say('svensk fras') / voice.replayLast() / voice.cancel()
 * @property {SaveService}    save     // använd hellre ctx.progress
 * @property {AssetService}   assets   // assets.get(key)
 * @property {StickerService} stickers
 * @property {ProfileService} profiles
 * @property {Scaler}         scaler
 * @property {ParentalGate}   gate
 */

/**
 * @typedef {Object} ProgressApi   // scoped till aktiv profil + detta spel av GameHost
 * @property {() => object} get                          // { unlocked, highestLevel, stars, custom }
 * @property {(patch: object) => void} update
 * @property {(level: number) => void} setLevel          // höjer highestLevel om större
 * @property {(n?: number) => void} addStars             // n default 1
 * @property {(key: string, value: any) => void} setCustom
 * @property {() => void} complete   // ETT tillfredsställande "klart": firande (1–2s) + stjärna + klistermärke
 */
```

**Rules for game modules**
- Author in **design coordinates (1280×720)**. `ctx.stage` is already letterbox-scaled & centered — just build children.
- Never touch `localStorage` directly — use `ctx.progress`. Never load your own audio engine — use `ctx.services.audio` / `voice`.
- **No visible score, no fail state, no timer pressure.** Call `ctx.progress.complete()` at a satisfying "done" → shared celebration + sticker.
- Clean up in `destroy`: `ctx.ticker.remove(...)`, `gsap.killTweensOf(...)`, kill per-object tweens, `container.destroy({children:true})`. Guard async callbacks (`gsap.delayedCall`, `setTimeout`) with an `this._alive` flag set false in `destroy` (the user can exit mid-animation).
- **Exit-safe transient particles (IMPORTANT):** anything you create *and* destroy on its own tween `onComplete` (confetti, puffs, floating emoji/text) can also be destroyed by the player exiting mid-animation — a raw `gsap.to(pixiObj, {...})` will then crash writing to a null transform. Use the shared `lib/feedback.js` helpers (`puff`, `sparkle`, `bigCelebration`, `floatText`) which are already exit-safe, OR tween a plain `{}` proxy and copy onto the Pixi object only `if (!obj.destroyed)` (`onComplete: () => { if (!obj.destroyed) obj.destroy() }`). Never tween a Pixi object directly when it can be destroyed by its own `onComplete` *or* by game exit.
- Spoken Swedish on `mount`; re-cue gently if idle ~6s; provide a positive reaction to every tap.

### How to add a new game (checklist)

1. `src/games/<id>/index.js` — default-export a GameModule (`id` is ASCII, matches the folder). Copy `klambubblor` as the template.
2. Pick a `category` from the CATEGORIES list (drives the library tile color) and an `icon` emoji.
3. Build the scene in `init(ctx)`; speak `voiceIntro` in `mount(ctx)`; tear down in `destroy(ctx)`.
4. Drag-and-drop? Reuse `lib/DragController.js` (don't reinvent — it has the snap/snap-back/tap-tap fallback under-4s need).
5. Register it: add the import + entry in `src/games/registry.js`.
6. Real art/audio? Put files in `public/assets/games/<id>/`, `assets.registerBundle('<id>', manifest)` (e.g. in the module or a small init), then `init` can `assets.get(key)`. Log any non-CC0 asset in `ASSET_LICENSES.md`.
7. `npm run dev`, open the library, play it; verify the home button, voice replay, completion celebration, and that progress persists after reload.

### Minimal skeleton

```js
import { Container } from 'pixi.js'
export default {
  id: 'mitt_spel', titleSv: 'Mitt Spel', icon: '🎈',
  category: 'roligt', input: 'tap', ageRange: [2, 4], bundle: 'mitt_spel',
  voiceIntro: 'Tryck på ballongen!',
  init(ctx) { this._alive = true; this._root = new Container(); ctx.stage.addChild(this._root) /* bygg scenen */ },
  mount(ctx) { ctx.services.voice.say(this.voiceIntro) },
  destroy() { this._alive = false; this._root?.destroy({ children: true }) },
}
```

## Save-data JSON schema (`localStorage` key `pwagames.save.v1`, backup `pwagames.save.bak`)

```jsonc
{
  "schemaVersion": 1,
  "app": "pwagames",
  "createdAt": "ISO", "updatedAt": "ISO",
  "activeProfileId": "p_xxxx",
  "settings": {                      // global / enhetsnivå
    "masterVolume": 0.8, "musicEnabled": true, "sfxEnabled": true,
    "voiceEnabled": true, "parentalGateEnabled": true, "sessionReminderMinutes": 0
  },
  "profiles": [{
    "id": "p_xxxx", "name": "Astrid", "avatar": "rav",   // namn lagras som skrivet (åäö ok)
    "createdAt": "ISO", "lastPlayedAt": "ISO",
    "settings": {},                                       // ev. per-profil-override
    "stats": { "totalPlaySeconds": 0, "starsTotal": 37, "stickers": ["klambubblor"] },
    "games": {                                            // keyad på GameModule.id
      "vandkort": { "unlocked": true, "highestLevel": 4, "stars": 9, "lastPlayedAt": "ISO", "custom": {} }
    }
  }]
}
```

Writes are debounced 500ms + synchronously flushed on `visibilitychange=hidden`/`pagehide`. Load validates, falls back to backup, runs sequential migrations (`SaveService._migrate`). Export/import JSON lives in Settings (behind the gate). Add a migration when you change the schema and bump `SCHEMA_VERSION`.

## Screen flow

`splash` → `menu` → (`library` → `game`) and `menu` → gate → `settings`. `menu` → gate → confirm → exit. `*` adult actions are behind `services.gate.open()`. A pending service-worker update is applied only at the menu (`applyPendingUpdateAtMenu`), never mid-game.

## Conventions / Pixi v8 gotchas

- `await app.init({...})`; canvas is `app.canvas`. `eventMode` not `interactive`. Ticker callback gets the **Ticker instance** (`ticker.deltaMS`).
- Graphics is fluent and **shape-then-paint**: `g.roundRect(...).fill(color).stroke({width,color})`, `g.circle(...).fill(...)`. `g.clear()` to reset.
- Text: `new Text({ text, style: { fontFamily, fontSize, fontWeight, fill, align, wordWrap, wordWrapWidth } })`; `t.anchor.set(0.5)`.
- Buttons/tiles use `pointertap`; drag uses `globalpointermove` on the item (survives finger leaving the sprite). Decorative layers: `eventMode='none'` + `interactiveChildren=false`.
- Perf: prefer atlases; avoid filters/blur/shadows; explicit `hitArea`; destroy/unload on exit; cap `app.ticker.maxFPS = 60`.

## Advanced physics (goal-based games)

`matter-js` powers the physics games via `src/lib/physics.js` (`PhysicsWorld`): body factories (`circle/rectangle/polygon`) taking full matter opts, `MATERIALS` presets (`bouncy/normal/heavy/light/sticky` → restitution/density/**mass**/friction/frictionAir), `setWind(ax,ay)` (force field), `setGravity(y,x?)`, `link(body,view)`, `onCollision` (match `body.label`), fixed-timestep `update(deltaMS)`, exit-safe `destroy()`, plus `predictTrajectory(...)` and re-exported `Body`/`Composite`/`Vector`. `src/lib/launcher.js` `AimLauncher` is the reusable **"drag to set direction + power, with a live dotted trajectory preview"** control (`slingshot` pull-back or throw; tap-fallback aims at `defaultAim`; `setWind`/`setPreview` keep the preview honest). Build games with a **goal** (reach/collect/fill) + at least one extra control that changes the outcome (placement drag, weight/wind/bounce toggles). **NEVER a fail state** — misses are fun (wiggle/puff/giggle) and gentle auto-help guarantees success. Templates: `rulla-bollen-hem` (top-down minigolf, surface toggle), `spindelhjalten`, `enhorningen-elvira`, `bajs-och-kiss`, `fanga-frukten` (catch), `bygg-tornet` (crane-drop stacking), `plask-i-vattnet` (buoyancy float/sink), `mata-monstret` (4 modes: drag/walk/shelf-drop/plinko).

**Preview calibration (so the dotted line matches the real flight — measured against matter.js at the fixed 1/60 step):** matter's per-step downward velocity gain ≈ `0.2778 × gravityY` px/step, and air friction damps velocity ≈ `(1 − frictionAir)` per step. So for `AimLauncher`/`predictTrajectory` set `previewGravity = 0.2778 × gravityY` and `previewDamp = 1 − frictionAir` (launcher now takes a `previewDamp` opt; default 1). For `setWind(ax)` to match the preview's `previewWind` (px/step²), use `ax = previewWind / (1000/60)²` (≈ `/277.8`). Getting this wrong (e.g. the old `gy=0.5`, no damp) made spider's preview point ~380px off and its auto-assist miss; the calibrated values match to ~2px. The launcher games that predate this (`bajs-och-kiss` 0.42, `studsbollar` 0.44) were hand-tuned to roughly-correct `previewGravity` for their higher `gravityY` — don't blindly retune them; measure first (`fyrverkeri` integrates its own motion at `GY` so its preview is exact by construction).

## Assets & licenses

CC0-first (Kenney.nl, Kenney audio, Freesound-CC0). **Ship zero attribution obligations.** Any CC-BY asset must be logged in `ASSET_LICENSES.md` and trigger a "Krediter/Tack" screen. Fonts are SIL OFL (Fredoka/Baloo 2/Nunito), self-hosted in `public/fonts` (never the Google CDN). The first three games draw everything **programmatically** (emoji + Pixi Graphics) so they need no external assets. See `ARCHITECTURE.md §4` for the full source table and AVOID list.

**Audio (real SFX + voice).** Both are pre-generated locally and bundled as offline `.mp3` — no runtime network calls, no third-party attribution.
- **SFX/djurläten:** `npm run sfx` → `scripts/gen-sfx.py` posts each prompt in `scripts/sfx-phrases.json` to the local **MOSS-SoundEffect** service (`services/moss-sfx`, FastAPI :8003, reuses the narrator `.venv`), picks the best of N takes, normalizes/fades, encodes to `public/audio/sfx/<key>.mp3` + `manifest.json`. Idempotent. `AudioService` decodes them via Web Audio and plays them in `sfx()`/`sample()`, falling back to the procedural synth (tiny UI blips stay synth on purpose). To add/replace a sound: add a key+prompt, run the service, `npm run sfx` (or `--force --only <key>` to re-roll).
- **Röst:** `npm run voice` (self-generated, MP3  in `public/audio/voice/`) — see neural-voice notes. Both `npm run sfx`/`voice` use a forward-slash venv path; run them from **PowerShell** (cmd/npm chokes on the path under git-bash).

## Swedish

UI/voice text keeps å/ä/ö. Ids, file names, asset/voice keys use `asciiFold()` (å/ä→a, ö→o). Voice prompts are full Swedish sentences passed to `voice.say('…')`.
