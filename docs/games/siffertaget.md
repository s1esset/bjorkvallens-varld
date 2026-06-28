# Siffertåget (`siffertaget`)
> Barnet hjälper ett glatt ånglok att koppla ihop sina vagnar i rätt sifferordning (1→5) — varje rätt vagn snäpper fast med ett pling och rösten räknar med, så tåget till slut tutar och åker iväg. 3–5-åringar älskar att se tåget bli helt och rulla.

## Metadata
| fält | värde |
| --- | --- |
| id | `siffertaget` |
| titleSv | Siffertåget |
| icon | 🚂 |
| category | larande |
| input | mixed |
| ageRange | [3, 5] |
| bundle | `siffertaget` |
| voiceIntro | "Hjälp tåget! Sätt vagnarna i ordning, ett, två, tre." |

## Mål & mekanik
Kärnloop: Ett ånglok (🚂) står till vänster. En rad tomma "kopplingsplatser" sträcker sig åt höger längs en räls. Under rälsen ligger lösa tågvagnar i blandad ordning, var och en med en stor siffra (1..N). Barnet ska få vagnarna på plats i stigande ordning.

- Den vagn som står näst på tur (lägsta siffran som inte är placerad) är **aktiv** och "lyser" (mjuk puls + gl#) — endast den kan placeras härnäst. Det gör det omöjligt att göra "fel ordning permanent".
- Barnet **drar** (eller tap-tap) en vagn till nästa lediga kopplingsplats.
  - Är det rätt vagn (lägsta kvarvarande siffran): vagnen snäpper fast bakom loket/föregående vagn, rösten säger siffran ("Ett!", "Två!"...), `pling`/`correct`, liten gnistra.
  - Är det fel vagn (för hög siffra) eller fel plats: vagnen **pyser vänligt tillbaka** (`soft` + wiggle) till sin plats under rälsen — aldrig en bestraffning.
- När alla N vagnar sitter: loket tutar (`whoosh`/`celebrate`), hela tåget rullar långsamt åt höger ut ur bild, konfetti, `ctx.progress.complete()`. Därefter ny runda (oändlig lek) med ev. fler vagnar.

Noll läsning krävs: siffrorna stöttas av lika många prickar (tärnings-/dominoprickar) på varje vagn och rösten räknar med.

## Skärm-layout (1280x720)
GameHost ritar header (hem + repetera/högtalare) överst — rita INGA egna sådana.

- **Räls (perrong):** en horisontell rälslinje vid y=300. Två bruna linjer (sliprar) ritas med Graphics: huvudbalk `roundRect(60, 300, 1160, 18)` fill `COLORS.brown`, plus korta tvärslipers var ~60px. Marginal 60px vänster/höger.
- **Lok (🚂):** Container vid x=150, y=250 (botten vilar på rälsen). Lokkropp = `roundRect(-90,-70,180,120,24)` fill `COLORS.red`, skorsten liten `roundRect`, hjul = två `circle(r=26)` fill `COLORS.ink` vid y=55. Emoji 🚂 som Text fontSize 90 ovanpå, eller rena Graphics — välj Graphics-lok + 🚂 dekor. Loket är `eventMode='none'`.
- **Kopplingsplatser (slots):** N platser i rad efter loket. Slot-bredd 170, gap 24, höjd 150. Första slot-centrum x = 150 + 90 + 24 + 85 = 290; nästa = +194 osv. Centrum-y = 245. Varje slot ritas som streckad/ljus spökruta: `roundRect(-85,-75,170,150,20).fill({color:white,alpha:0.35}).stroke({width:5,color:ink,alpha:0.4})`.
- **Lösa vagnar (pool):** Ligger i en blandad rad längs nederkant, centrum-y=560. N vagnar fördelade jämnt mellan x=170 och x=1110 (clamp så de inte hamnar under header). Varje vagn ~170×150 (träffyta >=96px med god marginal).
- **Vagn-utseende:** Container med `roundRect(-85,-75,170,150,20)` fill = PLAYFUL[siffra-1], `stroke({width:6,color:white,alpha:0.7})`, två hjul `circle(r=22)` fill ink vid y=70, en stor `Text` med siffran (fontFamily FONT.display, fontSize 96, fill white) `anchor.set(0.5)` y=-6, plus en liten prick-rad (1..N små `circle(r=8)` fill white) y=46 som icke-läsande stöd.

## Interaktion
input: mixed (drag + inbyggd tap-tap-fallback via DragController).

- Skapa `this._drag = new DragController({ space: this._root, services: ctx.services })`.
- **Mål:** Lägg EN enda aktiv kopplings-target på nästa lediga slot. `accepts(data)` returnerar `data.n === this._expected` (this._expected = nästa siffra som ska placeras, börjar på 1). `addTarget(slotView, accepts, { hitRadius: 130 })`. Efter varje rätt placering: ta bort gammal target (`drag.clear()`-fri lösning: bygg om enkelt) — enklast är att ge ALLA slots en target men låt `accepts` kräva både rätt siffra och att sloten är "nästa lediga" via en delad `this._expected`. Konkret: varje slot-target `accepts(data) => data.n === this._expected && slot.index === this._placedCount`.
- **Föremål:** varje vagn `drag.addItem(vagnView, { n }, { onCorrect, onWrong, onSelect })`.
- **tap-tap-fallback:** DragController hanterar detta automatiskt — tryck på vagn (väljs, pulserar, `tap`-ljud), tryck sedan på en slot. Ingen extra kod behövs.
- **Hit-area:** vagnarna är 170×150 (>96px). Slots har hitRadius 130. Endast den aktiva vagnen behöver kunna placeras rätt; övriga drag ger onWrong (mjukt).
- Förhindra interaktion under "resolving"/firande: sätt `this._resolving = true` medan tåget rullar ut, och returnera tidigt i callbacks.

## Återkoppling & belöning
Per-tryck (<100ms): DragController ger studs-skala + `tap` vid val. Aktiv vagn pulserar hela tiden (gsap yoyo) så barnet ser vad det ska ta.

- **Rätt vagn på rätt plats** (`onCorrect`): `ctx.services.audio.sfx('correct')` direkt + `sfx('pling')`; `ctx.services.voice.say(SIFFROR[n])` där `SIFFROR = {1:'Ett',2:'Två',3:'Tre',4:'Fyra',5:'Fem'}`; `sparkle(ctx.fxLayer, slotX, slotY)`; `pop(vagnView)`. Vagnen snäpper till slot-positionen (DragController gör flytten), öka `this._placedCount`, sätt `this._expected++`.
- **Fel vagn / fel plats / släpp i tomma luften** (`onWrong` och miss): DragController spelar redan `soft` och snäpper tillbaka; lägg till `wiggle(rec.view)` i `onWrong`. Ingen röst som tillrättavisar, inget rött, ingen poängminskning.
- **Tomt tryck på bakgrund:** valfritt — en mjuk `soft` + liten studs på loket. Aldrig negativt.
- **Runda klar** (alla N placerade): sätt `this._resolving = true`; `ctx.services.audio.sfx('celebrate')` + `sfx('whoosh')` (tut); `ctx.services.voice.say(randomFrom(PRAISE))`; animera lok+alla vagnar (lägg dem i en gemensam tåg-Container, eller tweena var för sig) åt höger ut ur bild (`x += 1500`, duration ~1.4); `bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })`; `ctx.progress.setLevel(this._level + 1)`; `ctx.progress.complete()`. Efter ~1.6s (`gsap.delayedCall`, skyddad av `this._alive`) starta ny runda.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i init.
- **Antal vagnar N växer med nivå:** `N = Math.min(5, 3 + Math.floor(this._level / 2))` → start 3 vagnar (1–3), sedan 4, sedan 5. Aldrig fler än 5 (åldersanpassat, ryms i layouten).
- Efter varje klar runda: `ctx.progress.setLevel(this._level + 1)` och uppdatera `this._level` lokalt, bygg ny runda med uppdaterat N. Vagnarnas startordning blandas med `shuffle()`.
- `custom`: valfritt spara `ctx.progress.setCustom('rundor', (get().custom.rundor||0)+1)` för statistik. Inget krav.
- Oändlig lek: ingen slutskärm, alltid ny runda. highestLevel är monotont (setLevel höjer bara).

## Tillgångar (programmatiskt)
INGA externa filer. Allt ritas med Pixi Graphics + systememoji som Text.

- Emoji (Text): 🚂 (lok-dekor), valfri rökpuff via `puff()`/Graphics. Ev. 🎉 undviks (konfetti görs av bigCelebration).
- Graphics-former:
  - Räls: `roundRect` huvudbalk + korta `rect`-sliprar, fill `COLORS.brown`.
  - Lok: `roundRect`-kropp (COLORS.red), skorsten `roundRect`, hjul `circle` (COLORS.ink).
  - Slot (spökruta): `roundRect` med låg alpha-fill + streck-stroke.
  - Vagn: `roundRect`-kropp (PLAYFUL[n-1]), hjul `circle` (ink), siffra `Text` (FONT.display, fontSize 96, fill white), prickrad `circle`×n (white).
- Ljud: endast befintliga sfx-namn: `tap`, `pling`, `correct`, `soft`, `whoosh`, `celebrate`, ev. `pop`.
- Röst: svenska fraser via `voice.say` (siffror + PRAISE).

## Återanvänd dessa
- `lib/DragController.js` — drag + snäpp + snäpp-tillbaka + tap-tap-fallback (kärnan i interaktionen).
- `lib/feedback.js` — `wiggle` (fel), `pop`/`bounceIn` (rätt/spawna), `sparkle` (rätt), `bigCelebration` (klart). Ev. `puff` för rök.
- `lib/swedish.js` — `shuffle` (blanda vagn-pool), `randomFrom` (PRAISE).
- `lib/theme.js` — `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`.
- `ctx.services.audio.sfx`, `ctx.services.voice.say/replayLast`, `ctx.fxLayer`, `ctx.progress` (get/setLevel/setCustom/complete). Använd ALDRIG localStorage direkt.
- (Valfritt) `lib/Button.js` behövs inte — header sköts av GameHost.

## Edge-cases & städning
- `this._alive = true` i init; `false` först i destroy. Alla `gsap.delayedCall`/callbacks kollar `if (!this._alive) return` innan de rör scenen.
- `this._resolving`-flagga blockerar nya drop/val medan tåget rullar ut och under firande, så att inget dubbeltryck startar två rundor.
- Barnet kan avsluta mitt i animation: i `destroy()` →
  - `this._alive = false`
  - `this._drag?.destroy()`
  - `gsap.killTweensOf(this._root)` samt killa per-vagn-tweens (loopa pulsande vagnar och `gsap.killTweensOf(v)` / `v.scale`), och `this._pulse?.kill()`.
  - `this._root?.destroy({ children: true })`.
- Idle ~6s: GameHost re-cue:ar voiceIntro automatiskt om plattformen stödjer det; annars valfritt egen timer som anropar `voice.say(this.voiceIntro)` (skydda med `_alive`, nollställ vid varje interaktion). Håll det enkelt — förlita dig på GameHosts re-cue om möjligt.
- Layout-clamp: vid N=5 kontrollera att slots/vagnar inte hamnar under header (håll y under ~120) eller utanför 1280 — sista slot-centrum vid N=5 = 290 + 4*194 = 1066 (+85 = 1151 < 1280, OK).
- Skapa nya rundor utan att läcka: rensa förra rundans vagnar/slots (`this._roundLayer.removeChildren()` + destroy, och `this._drag.clear()` innan nya items/targets läggs till) innan ny runda byggs.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/siffertaget/index.js`. Kopiera strukturen från `src/games/sortera-skrap/index.js` (samma DragController-mönster).
2. Importera: `Container, Graphics, Text` från `pixi.js`; `gsap`; `DragController`; `shuffle, randomFrom`; `wiggle, pop, sparkle, bigCelebration`; `COLORS, PLAYFUL, FONT, PRAISE`.
3. Default-exportera modulobjektet med metadata (se tabell) inkl. `voiceIntro`.
4. `init(ctx)`: sätt `this._alive=true`; skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`; skapa `this._drag`; rita statisk räls + lok i `this._root`; läs `this._level`; anropa `this._newRound(ctx)`.
5. `_newRound(ctx)`: beräkna `N`; `this._placedCount=0`, `this._expected=1`, `this._resolving=false`; rensa förra rundan (drag.clear + ta bort gamla slot/vagn-containrar); bygg N slots (target per slot med `accepts(data)=> data.n===this._expected && slot.index===this._placedCount`, hitRadius 130); skapa N vagn-data {n:1..N}, `shuffle`, lägg ut i pool-raden; `bounceIn` varje vagn; markera aktiv vagn (n===1) med puls; `drag.addItem` per vagn med onCorrect/onWrong/onSelect.
6. `onCorrect(rec,target)`: guard `_alive`/`_resolving`; spela correct+pling, `voice.say(SIFFROR[rec.data.n])`, `sparkle` på slot, öka `_placedCount`/`_expected`, uppdatera vilken vagn som pulserar (nästa = `_expected`); om `_placedCount===N` → `_finishRound(ctx)`.
7. `onWrong(rec)`: guard; `wiggle(rec.view)` (DragController spelar redan `soft`).
8. `_finishRound(ctx)`: `_resolving=true`; spela celebrate+whoosh; `voice.say(randomFrom(PRAISE))`; tweena lok+vagnar ut åt höger; `bigCelebration(ctx.fxLayer,{width,height})`; `setLevel`; `complete()`; `gsap.delayedCall(1.6, ()=>{ if(!this._alive) return; this._level++; this._newRound(ctx) })`.
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. `destroy()`: `_alive=false`; `this._drag?.destroy()`; killa alla tweens (root + vagnar + puls); `this._root?.destroy({children:true})`.
11. Registrera i `src/games/registry.js`: `import siffertaget from './siffertaget/index.js'` och lägg `siffertaget` i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, repetera-röst, rätt→pling+räkning, fel→mjuk pys tillbaka, tåget rullar+firar, och att progress (highestLevel) finns kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas utan konsolfel när man navigerar Bibliotek → Siffertåget (canvas finns, inga uncaught errors).
- `voiceIntro` triggas vid mount (VoiceService anropas) — verifiera via mockad/observerad `voice.say` eller att ingen krasch sker.
- Minst N vagnar och N slots ritas i startläget (verifiera via exponerad teststate eller pixel/koordinat-tap).
- Tap-tap-fallback: tryck på vagn "1" och sedan på första sloten → vagnen placeras (positionsändring nära slot-koordinat), `correct`/`pling` spelas, `_placedCount` ökar.
- Fel handling är mjuk: tryck på vagn "3" (när 1 förväntas) och släpp på sloten → vagnen snäpper tillbaka mot sin pool-position (ingen "game over", ingen felljud-buzzer, endast `soft`).
- Att placera alla vagnar i ordning → firande sker (bigCelebration-noder skapas i fxLayer) och `ctx.progress.complete()` anropas exakt en gång per runda.
- Efter en klar runda startas en ny runda (nya vagnar finns efter ~1.6s) — oändlig lek, ingen slutskärm.
- Progress sparas: efter en klar runda är `highestLevel` i localStorage (`pwagames.save.v1`) höjt; värdet kvarstår efter sidomladdning.
- Inga nätverksanrop sker under körning (network idle / 0 externa requests).
- Hem-knappen (GameHost) tar tillbaka till biblioteket utan konsolfel (destroy körs, inga kvarvarande tickers/tweens-fel).
