# Skuggmatchning (`skuggmatchning`)
> Barnet drar färgglada föremål till sin svarta skugga på marken — när rätt skugga träffas blommar den ut i full färg, vilket ger 2-4-åringar den enkla "det passar!"-tillfredsställelsen utan läsning, tidspress eller fel.

## Metadata
| Fält | Värde |
|------|-------|
| id | `skuggmatchning` |
| titleSv | Skuggmatchning |
| icon | 🌑 |
| category | pussel |
| input | drag |
| ageRange | [2, 4] |
| bundle | `skuggmatchning` |
| voiceIntro | "Dra sakerna till rätt skugga!" |

## Mål & mekanik
**Kärnloop:** På marken (nedre delen av skärmen) ligger 2-4 svarta skuggor (silhuetter av föremål). Uppe i ett "förråd" ligger samma föremål i full färg, blandade i ordning. Barnet drar ett föremål till skuggan med samma form. Rätt skugga lyser upp i föremålets färg och föremålet snäpper på plats ovanpå skuggan. När alla skuggor är fyllda firas rundan (`ctx.progress.complete()`) och en ny runda med nya föremål startar — oändlig lek.

**Lyckad handling:** Föremålet snäpper exakt på skuggan, skuggan tonar från svart till färg (skuggans emoji byts ut / dess silhuett färgas), `audio.sfx('match')`, `sparkle()` på platsen, röst säger föremålets namn ("Banan!"). En liten `pop()` på föremålet.

**Runda klar:** När antalet placerade == antal skuggor: `audio.sfx('celebrate')`, `bigCelebration(ctx.fxLayer)`, röst säger ett `PRAISE`-beröm, `ctx.progress.setLevel(level+1)` + `ctx.progress.complete()`. Efter ~1.4 s rensas scenen och `_newRound()` bygger en ny uppsättning.

## Skärm-layout (1280x720)
GameHost ritar header (hem-/högtalarknapp) överst — **rita inga egna sådana knappar**. Spelets innehåll håller sig under y≈90.

- **Marklinje (skuggrad):** en mjuk markremsa ritas som `Graphics().roundRect(40, 470, 1200, 210, 40).fill(0xece3d0)` (ljus sandfärg) i botten, eventMode='none'.
- **Skuggzoner (mål):** 2-4 skuggor jämnt fördelade på marken vid `y = 560`.
  - För N skuggor: `slotW = 220`, `gap = 60`, `totalW = N*slotW + (N-1)*gap`, `startX = (1280 - totalW)/2 + slotW/2`, varje skugga `x = startX + i*(slotW+gap)`.
  - Varje skugga: en svart silhuett-Text (emoji i mörk ton) på en svag oval `Graphics().ellipse(0,0,95,40).fill({color:0x000000, alpha:0.12})`. Skugg-emojin är samma emoji renderad med `fill: 0x222222` och `alpha: 0.85` (en mörk silhuett), fontSize 120.
- **Förråd (källföremål):** föremålen i full färg ligger i en rad upptill vid `y = 250`, blandad ordning relativt skuggorna.
  - Samma kolumnberäkning som skuggorna men oberoende blandad x-ordning (shuffle av positionerna), `y = 250`.
  - Varje föremål: `Container` med `Graphics().circle(0,0,82).fill({color:0xffffff, alpha:0.9}).stroke({width:4,color:0xeadfca})` + färg-emoji Text fontSize 104, anchor 0.5.
- **Hit-halo:** föremålens cirkel (r=82 → 164px diameter) > 96px-kravet. Skuggornas snäpp-radie `hitRadius: 150`.

## Interaktion
Använd **`DragController`** (`lib/DragController.js`) — den har snäpp, snäpp-tillbaka OCH tap-tap-fallback inbyggt.

- `this._drag = new DragController({ space: this._root, services: ctx.services })`.
- **Mål:** för varje skugga `this._drag.addTarget(shadowView, (data) => data.key === shadowKey, { hitRadius: 150 })`. `accepts` matchar på föremålets unika `key` (t.ex. `'banan'`).
- **Föremål:** `this._drag.addItem(itemView, { key, emoji, name, color }, { onCorrect, onWrong })`.
- **Drag:** barnet drar föremålet; släpp inom 150px från rätt skugga → `onCorrect`. Släpp på fel skugga → DragController spelar `'soft'` + `onWrong` + snäpp tillbaka hem. Släpp i tomma intet → snäpp tillbaka hem.
- **Tap-tap-fallback (inbyggt):** tryck på föremålet (det börjar pulsa + `'tap'`), tryck sedan på en skugga → samma resolve-väg. Inget behov av eget tap-tap.
- Förhindra dubbelhandling under firande: sätt `this._resolving = true` medan runda löses; ignorera vidare callbacks tills ny runda byggts.

## Återkoppling & belöning
**Per tryck (<100ms):** DragController ger `'tap'` + puls vid markering, scale 1.12 vid grab. Inget tryck är "fel".

**Rätt skugga (`onCorrect(rec, target)`):**
- `ctx.services.audio.sfx('match')`
- `sparkle(ctx.fxLayer, target.view.x, target.view.y)` (eller skuggans globala position via `_root` koordinater — skuggan ligger i `_root` så samma rymd som fxLayer? fxLayer är separat: använd skuggans x/y direkt eftersom fxLayer ritas i samma 1280x720-rymd).
- Färglägg skuggan: byt skugg-emojins `style.fill` till full (ta bort mörk tint genom att sätta en färgad version) — enklast: skuggan har två Text-lager (mörk silhuett + färgglad emoji som börjar `alpha:0`); tona färg-emojin in med `gsap.to(colorEmoji, {alpha:1, duration:0.25})` och svärtan ut.
- `pop(rec.view)`, sedan göm föremålet (`gsap.to(rec.view,{alpha:0...})` och destroy) eftersom färg-emojin nu sitter i skuggan.
- `ctx.services.voice.say(data.name)` (t.ex. "Banan!").
- Räkna upp `this._placed`; om alla placerade → runda klar.

**Fel skugga (`onWrong`):** DragController spelar redan `'soft'`. Lägg `wiggle(rec.view)` och låt den snäppa hem. Skuggan gör ett litet vänligt skutt: `gsap.timeline().to(target.view,{y:'-=14',duration:0.1}).to(target.view,{y:'+=14',duration:0.16})`. ALDRIG buzzer/rött/röst-tillrättavisning.

**Runda klar:** `audio.sfx('celebrate')`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, `voice.say(randomFrom(PRAISE))`, `ctx.progress.setLevel(this._level+1)`, `ctx.progress.complete()`. `gsap.delayedCall(1.4, () => this._newRound(ctx))`.

**Idle-recue:** starta en timer (via `ctx.ticker` ackumulerad deltaMS eller `gsap.delayedCall`); om ingen interaktion på ~6 s → `voice.say('Dra sakerna till rätt skugga!')`. Nollställ timern vid varje pointerdown.

**sfx-namn:** `tap`, `match`, `soft`, `celebrate`. **Voice:** voiceIntro, föremålsnamn, PRAISE-fras, idle-recue.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i `init`.
- **Antal skuggor per runda:** `count = Math.min(2 + Math.floor(this._level / 2), 4)` → börjar på 2, växer till max 4.
- **Föremålspool:** välj `count` unika föremål via `shuffle(POOL).slice(0, count)`. Skuggornas ordning och förrådets ordning blandas oberoende (`shuffle`).
- Vid varje klar runda: `setLevel(this._level + 1)` (höjer highestLevel) och `complete()`. Oändlig lek: ny runda byggs automatiskt.
- Valfritt `setCustom('rounds', n)` för antal klarade rundor (ej nödvändigt).

## Tillgångar (programmatiskt)
INGA externa filer. Allt = Pixi Graphics + system-emoji (Text).

- **Föremåls-emoji-pool (`POOL`)** — varje med `{ key (ASCII), emoji, name (åäö) }`:
  - `{key:'banan', emoji:'🍌', name:'Banan'}`
  - `{key:'apple', emoji:'🍎', name:'Äpple'}`
  - `{key:'stjarna', emoji:'⭐', name:'Stjärna'}`
  - `{key:'boll', emoji:'⚽', name:'Boll'}`
  - `{key:'hjarta', emoji:'❤️', name:'Hjärta'}`
  - `{key:'bil', emoji:'🚗', name:'Bil'}`
  - `{key:'blomma', emoji:'🌸', name:'Blomma'}`
  - `{key:'fisk', emoji:'🐟', name:'Fisk'}`
  - `{key:'sol', emoji:'☀️', name:'Sol'}`
  - `{key:'hus', emoji:'🏠', name:'Hus'}`
- **Föremåls-bricka:** `Graphics().circle(0,0,82).fill({color:0xffffff,alpha:0.9}).stroke({width:4,color:0xeadfca})` + färg-emoji Text fontSize 104.
- **Skugga:** markoval `Graphics().ellipse(0,0,95,40).fill({color:0x000000,alpha:0.12})` + mörk silhuett-emoji `new Text({text:emoji, style:{fontFamily:FONT.body, fontSize:120, fill:0x222222}})` med `alpha:0.85` + samma emoji i full färg ovanpå med `alpha:0` (tonas in vid match).
- **Mark:** `Graphics().roundRect(40,470,1200,210,40).fill(0xece3d0)`.
- **Bakgrund:** ärvs från shell (COLORS.bg). Valfri svag dekor-himmel utelämnas.

## Återanvänd dessa
- `lib/DragController.js` — drag/snäpp/snäpp-tillbaka/tap-tap (addItem/addTarget).
- `lib/feedback.js` — `pop`, `wiggle`, `sparkle`, `bigCelebration`.
- `lib/swedish.js` — `shuffle`, `randomFrom`.
- `lib/theme.js` — `FONT`, `COLORS`, `PRAISE`.
- `ctx.services.audio.sfx`, `ctx.services.voice.say` / `replayLast`.
- `ctx.progress.setLevel`, `ctx.progress.complete`, `ctx.progress.get`.
- `ctx.fxLayer` för konfetti/gnistor.
- `gsap` för tweens (importera `{ gsap } from 'gsap'`).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `this._alive = false` i `destroy`. Guarda ALLA async-callbacks (`onCorrect`, `onWrong`, `gsap.delayedCall`, idle-recue) med `if (!this._alive) return`.
- `this._resolving`-flagga: sätt `true` när sista föremålet placeras / under firande, blockera nya placeringar tills `_newRound` kört. Förhindrar dubbel-`complete()`.
- Användaren kan avsluta mitt i animation → `destroy()` måste:
  - `this._drag?.destroy()` (avregistrerar alla lyssnare).
  - `gsap.killTweensOf(this._root)` + döda per-objekt-tweens (skuggor/föremål) — enklast `gsap.killTweensOf('*')` undviks; iterera och `gsap.killTweensOf(view)` för aktiva, eller döda via `this._root` rekursivt räcker oftast då children destrueras.
  - Avbryt idle-timern: `this._idleCall?.kill()` om `gsap.delayedCall` används, eller nollställ ticker-ackumulatorn och `ctx.ticker.remove(this._tick)`.
  - `this._root?.destroy({ children: true })`.
- Tomt tryck på marken/bakgrund: ingen effekt eller mjuk `wiggle` — aldrig fel.
- Föremål redan placerat: DragController sätter `rec.placed`/`eventMode='none'` → kan ej dras igen.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/skuggmatchning/index.js`. Importera `{ Container, Graphics, Text } from 'pixi.js'`, `{ gsap } from 'gsap'`, `{ DragController } from '../../lib/DragController.js'`, `{ pop, wiggle, sparkle, bigCelebration } from '../../lib/feedback.js'`, `{ shuffle, randomFrom } from '../../lib/swedish.js'`, `{ FONT, COLORS, PRAISE } from '../../lib/theme.js'`.
2. Definiera `POOL` (se Tillgångar) och default-exportera modulobjektet med metadata-fälten ovan.
3. `init(ctx)`: `this._alive = true`; skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`; rita marken; skapa `this._drag = new DragController({ space:this._root, services:ctx.services })`; `this._level = Math.max(0, ctx.progress.get().highestLevel|0)`; anropa `this._newRound(ctx)`; starta idle-recue.
4. `_newRound(ctx)`: guard `_alive`; nollställ `this._placed=0`, `this._resolving=false`; rensa förra rundans views; beräkna `count`; välj `picks = shuffle(POOL).slice(0,count)`; bygg skuggor (mål) på `shuffle(picks)`-ordning och förrådsföremål på `shuffle(picks)`-ordning; registrera `addTarget`/`addItem` med hooks; `bounceIn`/scale-in på föremålen.
5. `_makeShadow(pick)` och `_makeItem(pick)` hjälpare som bygger containrarna enligt Tillgångar; behåll referens till skuggans färg-emoji för in-toning.
6. `onCorrect(rec, target)`: guard; `match`-ljud, `sparkle`, tona in skuggans färg, `pop`, göm/destroy föremålet, `voice.say(pick.name)`; `this._placed++`; om `_placed===count` → `_finishRound(ctx)`.
7. `onWrong(rec, target)`: guard; `wiggle(rec.view)` + skuggans skutt (DragController spelar redan `'soft'`).
8. `_finishRound(ctx)`: `this._resolving=true`; `celebrate`-ljud, `bigCelebration(ctx.fxLayer,{width:ctx.width,height:ctx.height})`, `voice.say(randomFrom(PRAISE))`, `ctx.progress.setLevel(this._level+1)`, `this._level++`, `ctx.progress.complete()`, `gsap.delayedCall(1.4, () => this._newRound(ctx))`.
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. Idle-recue: ticker-ackumulator eller `gsap.delayedCall`; vid 6 s utan interaktion → `voice.say(this.voiceIntro)`; nollställ vid interaktion.
11. `destroy(ctx)`: `this._alive=false`; `this._drag?.destroy()`; döda idle-timer; `gsap.killTweensOf(this._root)`; `this._root?.destroy({children:true})`.
12. Registrera i `src/games/registry.js`: `import skuggmatchning from './skuggmatchning/index.js'` och lägg `skuggmatchning` i `GAMES`-arrayen.
13. `npm run dev`, öppna biblioteket, spela: verifiera drag + tap-tap, rätt → firande + klistermärke, fel → mjukt skutt, progress kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas utan konsolfel efter att man navigerat in via biblioteket (canvas finns, inga uncaught errors / Pixi-warnings).
- Vid mount finns 2-4 skuggor på marken och motsvarande färgföremål i förrådet (verifierbart via state/exponerad debug eller pixel/snapshot).
- Drag av rätt föremål till matchande skugga → skuggan färgas, föremålet försvinner, `placed` ökar (verifiera via spelets state eller en hook).
- Tap-tap-fallback fungerar: tap på föremål + tap på rätt skugga ger samma resultat som drag.
- Fel skugga → föremålet snäpper tillbaka hem och finns kvar; inget "game over"/felljud-buzzer; ingen negativ text.
- När alla skuggor fyllts anropas `ctx.progress.complete()` (firande syns; stjärna/klistermärke tilldelas) och en ny runda byggs automatiskt inom ~1.5 s.
- Progress sparas: `highestLevel` i localStorage (`pwagames.save.v1`) ökar efter en klar runda och kvarstår efter sidomladdning.
- Inga nätverksanrop sker under körning (offline-krav).
- Avslut mitt i runda (hem-knapp) lämnar inga kvarvarande tickers/tweens (inga fel i konsolen efter unmount).
