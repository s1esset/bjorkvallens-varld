# Stor och Liten (`stor-liten`)
> Barnet drar saker i två storlekar till en stor eller en liten låda och lär sig begreppen "stor" och "liten" genom roligt sorterande — enkelt, förlåtande och belönande för de minsta.

## Metadata
| Fält | Värde |
|---|---|
| id | `stor-liten` |
| titleSv | Stor och Liten |
| icon | 📏 |
| category | pussel |
| input | drag |
| ageRange | [2, 4] |
| bundle | `stor-liten` |
| voiceIntro | "Dra de stora sakerna till den stora lådan och de små till den lilla lådan!" |

## Mål & mekanik
Kärnloopen: ett antal föremål (samma sorts emoji men i två tydliga storlekar) ligger utspridda i mitten. Längst ner finns två lådor: en STOR låda (vänster) och en LITEN låda (höger). Barnet drar (eller tap-tap:ar) varje föremål till lådan som matchar dess storlek.

- Lyckad handling: föremålet snäpper in i rätt låda, ljud `correct` + glad röstfras, lådan studsar, föremålet krymper in och försvinner. Räknare ökar.
- Fel: föremålet snäpper mjukt tillbaka till sin plats med `soft`-ljud och en liten vingel. Ingen bestraffning, inget rött, ingen "miss".
- Runda klar: när alla föremål i rundan är placerade -> `ctx.progress.complete()` (firande 1–2s + stjärna + klistermärke), sedan startar en ny runda automatiskt med nya föremål (oändlig lek).

Noll läsning krävs: lådorna har visuell storleksskillnad + texten "Stor"/"Liten" som extra (men inte nödvändig) ledtråd, och rösten förklarar.

## Skärm-layout (1280x720)
GameHost ritar header-knappar (hem/högtalare) — rita INGA egna.

- Spelyta: hela 1280x720. Bakgrund hanteras av skalet.
- **Stor låda** (vänster): container på x=320, y=560. Kropp: `roundRect(-180,-130,360,260,28)` (360x260). Färg COLORS-accent (t.ex. 0x4aa3df). Vit kant `stroke({width:6,color:0xffffff,alpha:0.6})`. Etikett-text "Stor" fontSize 40 centrerad, y=80. Hit-radius 200.
- **Liten låda** (höger): container på x=960, y=600. Kropp: `roundRect(-110,-80,220,160,22)` (220x160). Annan färg (t.ex. 0xffb14a). Etikett "Liten" fontSize 30, y=50. Hit-radius 150.
- **Spawn-zon för föremål**: övre/mellersta området, y mellan 150 och 360, x mellan 220 och 1060. Föremål placeras på ett glest rutnät (t.ex. 2 rader x 3 kolumner) med jitter så de inte överlappar lådornas hit-radier.
- **Stora föremål**: container med vit cirkel-platta `circle(0,0,82)` + emoji-Text fontSize 110.
- **Små föremål**: vit cirkel-platta `circle(0,0,52)` + emoji-Text fontSize 64.
- Marginal: håll föremål >=120px från lådornas centrum vid spawn så drag inte triggar oavsiktlig snäpp.

## Interaktion
Använd `lib/DragController.js`:

```js
this._drag = new DragController({ space: this._root, services: ctx.services })
// lådor som mål:
this._drag.addTarget(bigBox,   (data) => data.size === 'stor',  { hitRadius: 200 })
this._drag.addTarget(smallBox, (data) => data.size === 'liten', { hitRadius: 150 })
// varje föremål:
this._drag.addItem(view, { size }, { onCorrect, onWrong })
```

- **Drag**: dra föremålet mot en låda; om släppt inom hit-radien för en låda som `accepts(data)` -> onCorrect. Annars mjuk snäpp-tillbaka (DragController sköter detta inbyggt).
- **Tap-tap-fallback** (inbyggt i DragController): tap på föremål -> det väljs (pulserar, `tap`-ljud) -> tap på en låda -> resolve mot den lådan. Perfekt för 2-3-åringar som inte klarar drag.
- Hit-areor stora: cirkel-platta + DragController:s generösa hitRadius. Föremålens eventMode='static' sätts av DragController.
- Tomt tryck i bakgrunden: inget krävs, men lägg gärna ett lekfullt litet `tap`-ljud på en bakgrunds-`pointertap` (valfritt) — aldrig negativ respons.

## Återkoppling & belöning
- Per pekning < 100ms: DragController ger `tap`-ljud + pulsskala vid val; vid lyft `correct`/`soft` direkt.
- **Korrekt**: `ctx.services.audio.sfx('correct')`; röst med variation via `randomFrom(['Stor!','Det är en stor!','Bra!'])` för stor låda och `randomFrom(['Liten!','En liten!','Fint!'])` för liten; lådan studsar (gsap scale yoyo); `feedback.pop(view)` innan föremålet krymper bort; valfri `feedback.sparkle(ctx.fxLayer, x, y)`.
- **Fel**: DragController spelar redan `soft` och snäpper hem; lägg `feedback.wiggle(rec.view)` i `onWrong`. ALDRIG buzzer/rött/röst som tillrättavisar. Röst kan säga vänligt "Hoppsan, prova den andra lådan!" (valfritt, sparsamt).
- **Runda klar**: när antal placerade == antal föremål -> `ctx.services.audio.sfx('celebrate')`, `ctx.services.voice.say(randomFrom(PRAISE))`, `feedback.bigCelebration(ctx.fxLayer, {width,height})`, `ctx.progress.setLevel(this._level+1)`, `ctx.progress.complete()`. complete() ger delat firande + stjärna + klistermärke.
- Använda sfx-namn: `tap`, `correct`, `soft`, `celebrate` (ev. `pop`, `pling`).

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` läses i init.
- Antal föremål per runda växer mjukt: `count = Math.min(6, 2 + Math.floor(this._level / 2))` (börjar på ~2 par, max 6 föremål). Alltid jämn blandning av stora/små.
- Efter klar runda: `ctx.progress.setLevel(this._level + 1)`, `this._level++`, `ctx.progress.complete()`, sedan `gsap.delayedCall(1.4, () => this._newRound(ctx))` (skyddat med `_alive`).
- Variera vilken emoji som används per runda via `randomFrom` så det känns nytt. Oändlig lek — inget slut, inget "game over".
- `ctx.progress.setCustom('rounds', n)` valfritt för statistik.

## Tillgångar (programmatiskt)
INGA externa filer. Allt ritas med Pixi Graphics + systememoji-Text.

- Lådor: `Graphics.roundRect(...).fill(color).stroke({width,color,alpha})`, plus inre "öppning"-rektangel i mörkare nyans (valfritt) och Text-etikett ("Stor"/"Liten", FONT.title).
- Föremåls-platta: `Graphics.circle(0,0,r).fill({color:0xffffff,alpha:0.85}).stroke({width:4,color:0xeadfca})`.
- Emoji-uppsättning (samma form i två storlekar): 🐻 ⭐ 🍎 🎈 🐟 🌟 🚗 🐶 🌸 🍪. Välj EN emoji per runda, rendera stor (fontSize 110) och liten (fontSize 64).
- Konfetti/glitter via `feedback.bigCelebration` / `sparkle` (ritas i ctx.fxLayer).
- Färger från `lib/theme.js` COLORS.

## Återanvänd dessa
- `lib/DragController.js` — drag + snäpp + snäpp-tillbaka + tap-tap-fallback (kärnmekanik).
- `lib/feedback.js` — `wiggle`, `pop`, `sparkle`, `bigCelebration`.
- `lib/swedish.js` — `randomFrom`, `shuffle`, `asciiFold`.
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `ctx.services.audio.sfx`, `ctx.services.voice.say`, `ctx.progress` (get/setLevel/complete/setCustom), `ctx.fxLayer`.
- (Button behövs inte här — ingen egen UI-knapp; header sköts av GameHost.)

## Edge-cases & städning
- `this._alive = true` i init; sätt `false` i destroy. Vakta ALLA async-callbacks (`gsap.delayedCall`, onCorrect, `_newRound`, `_spawnRound`) med `if (!this._alive) return`.
- Förhindra dubbelplacering: DragController sätter `rec.placed = true` och `view.eventMode='none'` vid korrekt — inga extra tryck räknas. Räkna `this._remaining` ner i onCorrect och trigga klart endast när `=== 0` (skydda mot dubbel-trigger med en `this._resolving`-flagga under firandet).
- Under firande/övergång: blockera ny input genom att inte ha aktiva items (gamla är borttagna, nya spawnas först efter delay).
- destroy(): `this._alive = false`; `this._drag?.destroy()`; `gsap.killTweensOf(this._root)` (och killTweensOf på lådor/föremål om de tweenas separat); `this._root?.destroy({ children: true })`. Användaren kan lämna mitt i animation — allt ska tåla det.
- Idle ~6s utan handling: `ctx.services.voice.say(this.voiceIntro)` igen (timer via gsap.delayedCall som nollställs vid varje interaktion, rensas i destroy).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/stor-liten/index.js`. Kopiera strukturen från `src/games/sortera-skrap/index.js` som mall.
2. Default-exportera GameModule-objektet med metadata enligt tabellen ovan.
3. I `init(ctx)`: sätt `this._alive=true`, skapa `this._root = new Container()` och `ctx.stage.addChild(this._root)`. Skapa `this._drag = new DragController({space:this._root, services:ctx.services})`. Läs `this._level`.
4. Bygg de två lådorna (`_buildBoxes`): stor till vänster (x=320,y=560), liten till höger (x=960,y=600), med etiketter; registrera som targets med rätt `accepts` och hitRadius.
5. `_newRound(ctx)`: räkna ut `count`, välj en emoji, bygg jämn blandning stor/liten, `shuffle`, placera på rutnät i spawn-zonen, `addItem` för varje med onCorrect/onWrong. Sätt `this._remaining = count`.
6. onCorrect: vakta `_alive`, spela `correct` + röst, studsa lådan, `pop`+krymp bort föremålet, `this._remaining--`; om 0 -> firande + `setLevel` + `complete()` + `gsap.delayedCall(1.4, ()=>this._newRound(ctx))`.
7. onWrong: vakta `_alive`, `wiggle(rec.view)` (DragController gav redan `soft` + snäpp hem).
8. I `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`; starta idle-recue-timer.
9. I `destroy()`: städa enligt avsnittet ovan.
10. Registrera i `src/games/registry.js`: importera modulen och lägg till i `GAMES`-arrayen.
11. `npm run dev`, öppna biblioteket, spela: verifiera hemknapp, röst-repris, drag + tap-tap, firande, och att progress kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas i GameHost utan konsolfel (inga uncaught errors / Pixi-varningar).
- `voiceIntro` triggas vid mount (voice.say anropas) — verifierbart via mock/spy eller att canvas är aktiv.
- Två lådor (stor + liten) och minst två föremål finns i scenen vid start.
- Tap-tap på ett STORT föremål följt av tap på STORA lådan -> `correct`-ljud, föremålet tas bort, räknaren minskar.
- Drag av ett LITET föremål till LILLA lådan -> korrekt resolve och borttagning.
- Fel placering (stort föremål -> lilla lådan) -> `soft`-ljud + vingel + föremålet snäpper tillbaka till ursprungsplats; INGEN bestraffning, föremålet finns kvar och kan flyttas igen.
- När alla föremål placerats -> firande spelas (celebrate) och `ctx.progress.complete()` anropas; ny runda spawnas efter delay.
- Progress sparas: efter klar runda är `highestLevel` ökat; efter siduppdatering kvarstår värdet (localStorage).
- Lämna spelet mitt i en animation (klicka hem) -> inga fel, tweens/timers/ticker städas (destroy körs, `_alive=false`).
