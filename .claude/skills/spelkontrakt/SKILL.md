---
name: spelkontrakt
description: Use when writing, reading or changing ANY game module under src/games/. Covers the GameModule contract (metadata + init/mount/destroy), the injected GameContext and services, ProgressApi, exit-safe teardown, the shared toolkit (feedback/scene/DragController/mascot), Pixi v8 gotchas, and the add-a-game checklist. Triggers on - game module, GameModule, ctx, init, mount, destroy, registry, nytt spel, new game, exit-safe, exit-säker, DragController, feedback.js, scene.js, progress.complete, Pixi v8, Graphics, Container, ticker.
---

# GameModule-kontraktet

Ett spel = en mapp `src/games/<id>/` vars `index.js` **default-exporterar ett objekt**.
Skalet når aldrig in i spelet; spelet når världen bara via injicerat `ctx`.
Mallar: **`klambubblor`** (enkelt tap), **`rulla-bollen-hem`** (fysik), **`glittergrottan`** (3D).

## Metadata (statisk — läses av LibraryScreen + AssetService)

```js
id          // ASCII, == mappnamn == bundle, t.ex. "klambubblor"
titleSv     // svensk titel MED åäö, "Klämbubblor"
icon        // emoji till brickan, "🫧"
category    // 'drag'|'larande'|'pedagogiskt'|'roligt'|'fysik'|'pussel'|'motorik'|'minne'
input       // 'tap'|'drag'|'mixed'
ageRange    // [2,3]
bundle      // Assets-bundle (oftast == id; valfritt)
voiceIntro  // svensk fras som spelas vid mount
```

## Livscykel (anropas av GameHost; alla får vara async)

```js
init(ctx)     // bygg scenen i ctx.stage (bundle redan laddad)
mount(ctx)    // starta: säg voiceIntro, starta ticker, idle-recue
destroy(ctx)  // ta bort lyssnare, gsap.killTweensOf, förstör barn
```

## GameContext

```js
ctx.stage     // spelets rot, redan letterbox-skalad/centrerad i 1280×720
ctx.ticker    // läs ticker.deltaMS / ticker.deltaTime (callback får Ticker-instansen)
ctx.width     // 1280
ctx.height    // 720
ctx.fxLayer   // för konfetti/firande OVANPÅ spelet
ctx.exitToLibrary()
ctx.services  // se nedan
ctx.progress  // se nedan
```

### ctx.services

| Tjänst | Användning |
|---|---|
| `audio` | `sfx(name)` riktigt klipp annars syntes (`pop·pling·correct·match·soft·flip·celebrate·whoosh·reveal·tap`) · `sample('djur_ko')` spelar ENDAST riktigt klipp, returnerar `true`/`false` → falla tillbaka på rösten · `tone({freq,dur,type,vol,slideTo,delay})` stämd blip |
| `voice` | `say('svensk fras')` · `replayLast()` · `cancel()` |
| `assets` | `get(key)` (bundle redan laddad av GameHost) |
| `stickers` | `award/list/has` |
| `profiles` · `save` · `scaler` · `gate` | använd hellre `ctx.progress` än `save` |

### ctx.progress (scopad till aktiv profil + detta spel)

```js
get()                 // { unlocked, highestLevel, stars, custom }
update(patch) · setLevel(n) · addStars(n=1) · setCustom(key, value)
complete()            // ETT tillfredsställande "klart": firande 1–2 s + stjärna + klistermärke
```

## Regler för spelmoduler

- Rita i **designkoordinater 1280×720**. `ctx.stage` är redan skalad — bygg bara barn.
- **Aldrig `localStorage` direkt** → `ctx.progress`. Aldrig egen ljudmotor → `ctx.services.audio`.
- **Ingen synlig poäng, ingen tidspress, inget misslyckande som avslutar eller nollställer.**
  `ctx.progress.complete()` vid ett tillfredsställande "klart".
- **Motgång är tillåten och önskvärd.** Hinder som barnet kan anpassa sig runt — något blir
  smutsigt igen, välter, kommer i vägen — gör spelet bättre. De får som mest **sakta ner**,
  aldrig stoppa. Krav: rolig ton, tydlig orsak, går att åtgärda direkt, och ett **tak** på hur
  mycket som kan gå fel samtidigt (t.ex. max 3 aktiva fläckar; därutöver missar hindret).
- Fel/tomma tryck ska ändå vara **roliga** (wiggle + mjukt neutralt ljud) — aldrig sur summer,
  rött kryss eller tillrättavisning.
- Talad svenska vid `mount`; mjuk om-cue vid ~6 s inaktivitet; positiv reaktion på VARJE tryck.

## Exit-säkerhet (den vanligaste kraschkällan)

Spelaren kan lämna mitt i en animation. Två regler:

1. **`this._alive`-flagga** sätts `true` i `init`, `false` i `destroy`. Alla fördröjda callbacks
   (`gsap.delayedCall`, `setTimeout`, promise-then) börjar med `if (!this._alive) return`.
2. **Transienta partiklar** (konfetti, puffar, flytande emoji/text) som skapas *och* förstörs i sin
   egen tween-`onComplete` kan även förstöras av att spelaren går ut — en rå `gsap.to(pixiObj, …)`
   kraschar då på en null-transform. Använd **`lib/feedback.js`** (redan exit-säkra), ELLER tweena
   ett vanligt `{}`-proxy och kopiera till Pixi-objektet bara `if (!obj.destroyed)`, med
   `onComplete: () => { if (!obj.destroyed) obj.destroy() }`.

```js
destroy(ctx) {
  this._alive = false
  ctx.ticker.remove(this._tick, this)
  gsap.killTweensOf(this._things)
  this._root?.destroy({ children: true })
}
```

## Delad verktygslåda — återuppfinn inte detta

| Fil | Ger dig |
|---|---|
| `lib/feedback.js` | `bounceIn·pop·wiggle·shake·breathe` (egna objekt — döda tweens i destroy) · `puff·sparkle·burst·ripple·bigCelebration·floatText` (självstädande, exit-säkra) |
| `lib/scene.js` | `createScene('sky'|…)` bakgrundsvärld + `lerpColor` |
| `lib/DragController.js` | drag med snäpp / snäpp-tillbaka / **tap-tap-fallback** + `onMiss` — obligatorisk för dragspel |
| `lib/Button.js` | stor barnknapp (hit-halo, studs, ljud) |
| `lib/mascot.js` | maskoten **Bobo** |
| `lib/theme.js` | `DESIGN_W/H · FONT · COLORS · PLAYFUL · CATEGORIES · TAB_GROUPS · PRAISE · SPACING · RADIUS · ANIM · shade() · tint()` |
| `lib/swedish.js` | `asciiFold · AVATARS · shuffle · randomFrom` |
| `lib/physics.js` · `lib/launcher.js` | se skill **fysik-spel** |
| `lib/three3d.js` | se skill **threejs-games** |
| `lib/cooking.js` | delad grädda/grilla-tonmodell |

## Pixi v8-fallgropar

- `await app.init({…})`; canvasen är `app.canvas`. `eventMode`, inte `interactive`.
- Graphics är flytande och **form-sedan-färg**: `g.roundRect(…).fill(c).stroke({width,color})`.
  `g.clear()` nollställer.
- **Bar Graphics ritad i origo + stor `.position` renderas som helskärmsstapel** — baka in
  geometrin centrerad i en container istället. (Sedd bugg i `sortera-skrap`.)
- Text: `new Text({ text, style: {…} })`, `t.anchor.set(0.5)`.
- Knappar/brickor: `pointertap`. Drag: `globalpointermove` på objektet (överlever att fingret
  lämnar spriten). Dekorlager: `eventMode='none'` + `interactiveChildren=false`.
- Perf: atlas framför lösa texturer; undvik filter/blur/skuggor; explicit `hitArea`;
  förstör/avlasta vid exit; `app.ticker.maxFPS = 60`.

## Lägga till ett spel

1. `src/games/<id>/index.js` — default-exportera en GameModule (`id` ASCII == mappnamn).
2. Välj `category` ur `CATEGORIES` (styr brickans färg) + en `icon`-emoji.
3. Bygg i `init`, tala i `mount`, riv i `destroy`.
4. Dragspel → `lib/DragController.js`.
5. Registrera: import + rad i `src/games/registry.js`.
6. Egna assets → `public/assets/games/<id>/` + `assets.registerBundle('<id>', manifest)`.
   Icke-CC0 loggas i `ASSET_LICENSES.md`.
7. `npm run check` (kontrakt + P0) och `npm run test <id>` (headless, 0 fel) innan commit.

### Minimal skelett

```js
import { Container } from 'pixi.js'
export default {
  id: 'mitt_spel', titleSv: 'Mitt Spel', icon: '🎈',
  category: 'roligt', input: 'tap', ageRange: [2, 4], bundle: 'mitt_spel',
  voiceIntro: 'Tryck på ballongen!',
  init(ctx) { this._alive = true; this._root = new Container(); ctx.stage.addChild(this._root) },
  mount(ctx) { ctx.services.voice.say(this.voiceIntro) },
  destroy() { this._alive = false; this._root?.destroy({ children: true }) },
}
```
