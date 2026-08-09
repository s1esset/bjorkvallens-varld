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
ctx.later(sekunder, fn)  // fördröjt anrop som DÖR med spelomgången — använd i stället
                         // för gsap.delayedCall/setTimeout (se nedan)
ctx.services  // se nedan
ctx.progress  // se nedan
```

### `ctx.later()` — obligatoriskt för fördröjda anrop

Spelmodulerna är **singletons** (`registry.js` exporterar objekt, inte klasser). En
`gsap.delayedCall` eller `setTimeout` från förra omgången överlever därför `destroy`, och när
samma spel startas igen är `this._alive` åter `true` — vakten `if (!this._alive) return`
**släpper alltså igenom** den gamla callbacken, som kör mitt i den nya omgången (bygger om
rundan, dubblerar objekt, talar fel replik). Fönstret är precis så långt som fördröjningen,
och att gå ut och in snabbt är exakt vad ett barn gör.

```js
ctx.later(1.3, () => this._nextRound(ctx))   // dör automatiskt vid exit
```

`_alive` behövs fortfarande för tweens och andra callbacks — men för fördröjda anrop är
`ctx.later()` det enda som är säkert.

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
- **Fristående objekt (P0 `ASSETS`).** Rita spelobjekt som riktiga föremål med egen silhuett —
  aldrig en emoji i en `roundRect`. En svamp är en svamp med porer och rundade hörn, inte en
  bricka med 🧽 i. Ge dem eget liv: vilo-guppning (`breathe`), reaktion vid tryck (`pop`,
  `wiggle`), skugga för djup. Paneler/kort är till för TEXT och UI-kontroller, inte för
  spelobjekt. Emoji får ligga som detalj *ovanpå* ett ritat föremål, aldrig vara föremålet.
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
| `lib/kamera.js` | `Camera` — parallaxlager, `follow`/`moveTo`/`panTo`/`shake`/`zoomTo`; världar bredare än rutan (se nedan) |
| `lib/DragController.js` | drag med snäpp / snäpp-tillbaka / **tap-tap-fallback** + `onMiss` — obligatorisk för dragspel |
| `lib/Button.js` | stor barnknapp (hit-halo, studs, ljud) |
| `lib/mascot.js` · `lib/figurer.js` | Bobo som **stillbild** — huvud (`makeMascot`) resp. hel figur (`makeBobo`, `makeElvira`, …) |
| `lib/karaktarer.js` | Bobo som **RIGG**: `makeKaraktar({ r, kropp })` → `setMood('glad'\|'stolt'\|'forvanad'\|'nyfiken'\|'hungrig'\|'ledsen'\|'somnig')` · `react('jubel'\|'hoppsan'\|'nyfiken'\|'hej'\|'nam')` · `look(x,y)` · `blink()` · `idle()` · `destroy()`. **Välj den här när figuren ska REAGERA** — det app-breda mönstret "ingen mottagare/publik" löses här, inte med en egen `_setMood` i spelet |
| `lib/theme.js` | `DESIGN_W/H · FONT · COLORS · PLAYFUL · CATEGORIES · TAB_GROUPS · PRAISE · SPACING · RADIUS · ANIM · shade() · tint()` |
| `lib/swedish.js` | `asciiFold · AVATARS · shuffle · randomFrom` |
| `lib/physics.js` · `lib/launcher.js` | se skill **fysik-spel** |
| `lib/three3d.js` | se skill **threejs-games** |
| `lib/cooking.js` | delad grädda/grilla-tonmodell |

### Värld bredare än rutan → `lib/kamera.js`

Kameran äger inga spelobjekt, bara **lager**. Faktor 0 = fastspikat i skärmen, 1 = spelarens
plan, däremellan = bakgrund som glider långsammare. Bygg i faktor 1 och tänk i
världskoordinater.

```js
this._kam = new Camera({ worldW: 3200 })
ctx.stage.addChild(this._kam.root)
this._kam.adopt(createScene('meadow', { kamera: { bredd: 3200 } })) // scenens djupband
this._varld = this._kam.parallax(1)                                  // allt spelbart här
this._kam.follow(this._figur, { lead: 90, deadzone: 140 })
this._kam.attach(ctx.ticker)
// destroy(): this._kam.destroy()   ← river lager OCH ticker-callbacken
```

- **Pekpunkter:** `this._varld.toLocal(e.global)` — lagren är riktiga containrar, ingen egen
  omräkning behövs.
- **Flyttar du figuren långt på en bildruta** (ny runda, respawn): anropa `moveTo()` i samma
  andetag, annars rycker bilden med (kameran släpper aldrig målet ur bild — medvetet val).
- **`worldW` == vyn ⇒ kameran är en no-op.** Adoptera den utan att bygga en större värld och
  bilden blir exakt som förut.
- Scenens parallax är **i sidled**; horisonten ligger still i höjdled. Egna lager
  (`parallax(f)`) rör sig på båda axlarna. **Vill du panorera i höjd** (`worldH` > 720) duger
  därför inte `adopt(createScene(...))` — marken följer inte med och figuren glider av den.
  Kameran varnar i DEV; rita egen bakgrund i ett `parallax()`-lager i stället.
- Zoom är klämd till [1, 1.6] och tar alltid ≥0,5 s. Zoom-ut under 1 kräver att bakgrunden
  ritas med marginal åt båda håll — sätt `minZoom` själv och rita därefter.

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
