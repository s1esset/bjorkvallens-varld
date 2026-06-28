# Bygg Tornet (`bygg-tornet`)
> Barnet drar mjuka klossar och staplar dem till ett allt högre torn som vajar lekfullt — tornet kan aldrig "förlora", det studsar bara glatt och kan alltid byggas vidare, vilket ger 3–5-åringar ren bygg- och orsak-verkan-glädje.

## Metadata
| fält | värde |
|---|---|
| id | `bygg-tornet` |
| titleSv | Bygg Tornet |
| icon | 🧱 |
| category | `fysik` |
| input | `drag` |
| ageRange | `[3, 5]` |
| bundle | `bygg-tornet` |
| voiceIntro | `Bygg ett högt torn! Dra en kloss och ställ den överst.` |

## Mål & mekanik
- **Vad barnet gör:** En kloss ligger redo i en "låda" nere till vänster. Barnet drar (eller tap-tap:ar) klossen upp till tornets topp där en lysande pulsande plats visar var nästa kloss ska stå. Klossen snäpper magnetiskt på plats, tornet växer en våning och vajar mjukt.
- **Kärnloop:** spawna en kloss i lådan → barnet drar den till topp-platsen → den snäpper, tornet svajar glatt, ny plats markeras högre upp, ny kloss spawnar → upprepa tills rundans mål-höjd nås.
- **Lyckad handling:** `audio.sfx('pling')` + en kort "studs-in"-puls på klossen + hela tornet gör en extra glad gunga (wobble) + ibland röst ("En till!", "Så högt!"). Platsmarkören hoppar upp till nästa våning.
- **Runda klar:** När antalet staplade klossar når rundans mål (`goal = 4 + level`, max 8) tänds en liten flagga/fågel i toppen, `ctx.progress.complete()` körs (delat firande + stjärna + klistermärke), tornet "vinner" genom att studsa isär i en glad puff (aldrig ett fall = misslyckande), och en ny, ett snäpp högre runda byggs upp.

## Skärm-layout (1280×720)
Rita INTE hem-/högtalarknapp (GameHost äger headern). Allt byggs i designkoordinater i `this._root` (barn till `ctx.stage`).

- **Bakgrund/golv:** En bred markplatta `Graphics().roundRect(640-260, 600, 520, 90, 24).fill(COLORS.brown)` med ljusare gräs-/golvkant ovanpå. Topp-ytan (där första klossen står) ligger på `groundTopY = 600`. `eventMode='none'`.
- **Tornets staplingskolumn:** centrerad på `baseX = 640`.
- **Klossmått:** bredd `BW = 220`, höjd `BH = 76`, radie 16 (träffyta vida över 96px + naturligt hit-halo via klossens storlek).
- **Slot-center för kloss-index `i` (0 = nederst):** `slotY(i) = groundTopY - BH/2 - i*BH` → 562, 486, 410, 334, 258, 182, 106, 30. (Max 8 ryms inom 720.)
- **Platsmarkör (drop-slot):** en pulsande ljus kontur `roundRect(-BW/2-6, -BH/2-6, BW+12, BH+12, 20).stroke({width:6, color:COLORS.yellow})` placerad på `(640, slotY(nästa))`. Detta är DragControllerns `target`.
- **Lådan/spawn-plats:** klossen som väntar visas på `(250, 560)`; en enkel `roundRect`-låda ritas runt `(250, 600)` som visuell "förvaring". `eventMode='none'`.
- **Mål-indikator:** en flagga `🚩` eller glad fågel `🐦` (Text-emoji, fontSize 64) som svävar vid `(820, slotY(goal-1) - 10)` och visar hur högt det ska byggas; den vinkar/hoppar när tornet når den.
- **Höjdkänsla:** inga siffror, ingen text att läsa. Marginaler: minst 24px mellan låda och torn; spawn-klossen och platsmarkören står tydligt isär.

## Interaktion
- **DragController:** `this._drag = new DragController({ space: this._root, services: ctx.services })`. Items och target ligger BÅDA i `this._root` så koordinaterna matchar.
- **Target (platsmarkör):** `this._drag.addTarget(slotView, () => true, { hitRadius: 300 })`. `accepts` returnerar alltid `true` (alla klossar passar — barnet kan inte välja "fel" kloss). Generös `hitRadius` gör att en kloss som släpps någonstans i närheten av toppen snäpper in.
- **Item (kloss):** `this._drag.addItem(blockView, { i }, { onCorrect, onWrong })`. Endast en kloss är aktiv åt gången (spawnas när föregående snäppt).
- **Drag:** finger ned på klossen → den lyfts (1.12× skala, inbyggt) och följer fingret även om det lämnar klossen (`globalpointermove`). Släpp inom `hitRadius` → snäpp till platsen.
- **Tap-tap-fallback (inbyggd):** tap på klossen → den väljs och pulserar + `audio.sfx('tap')`; tap på platsmarkören → klossen snäpper dit. Perfekt för de yngsta.
- **Miss / släpp långt bort:** ingen target under → DragController snäpper klossen tillbaka till lådan med mjuk `back.out`-studs (aldrig bestraffning). 
- **Tomt tryck i bakgrunden:** en heltäckande osynlig `hitArea`-platta (`eventMode='static'`, `'pointertap'`) längst bak ger `audio.sfx('soft')` + en liten ripple/`puff`, så varje pekning svarar.
- **Under "resolving":** medan en kloss snäpper (onCorrect-tween pågår) spawnas nästa kloss FÖRST efter `onComplete`, så två klossar aldrig flyttas samtidigt.

## Återkoppling & belöning
- **Per pekning (<100ms):** tap/lyft → `audio.sfx('tap')` + skala-puls (DragController). Bakgrundstryck → `audio.sfx('soft')`.
- **Korrekt placering:** `audio.sfx('pling')` (var 4:e gång `'pop'`), `pop(blockView)` (glad puls), hela tornet gör en extra `wobble`-gunga, `sparkle(ctx.fxLayer, x, y)` på fästpunkten. Ibland röst: `voice.say(randomFrom(['En till!','Så högt!','Pling!']))`.
- **"Fel"/miss (släpp utanför):** `audio.sfx('soft')` + `wiggle(blockView)` i `onWrong`, sedan mjuk snäpp tillbaka till lådan. ALDRIG buzzer, rött kryss eller tillrättavisning.
- **Tornet svajar:** kontinuerlig mjuk sinus-sway (se nedan) — uppfattas som "levande/roligt", aldrig som att det håller på att rasa.
- **Runda klar:** mål-flaggan hoppar (`pop`), `voice.say(randomFrom(PRAISE))` ev. + `ctx.progress.complete()` (firande 1–2s + stjärna + klistermärke). Därefter glad "vinst-puff": klossarna studsar isär med `puff`/`bigCelebration` på `ctx.fxLayer`, sedan byggs ny runda.
- **`ctx.progress.complete()` anropas:** exakt en gång per fullbyggt torn (när `placedCount === goal`).

## Progression & nivåer
- **Läs nivå:** `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)`.
- **Mål-höjd:** `goal = Math.min(4 + this._level, 8)` klossar per torn.
- **Vid klar runda:** `ctx.progress.setLevel(this._level + 1)`, höj `this._level`, `ctx.progress.setCustom('torn', (custom?.torn||0)+1)`.
- **Svårighet växer mjukt:** högre mål-höjd + något större sway-amplitud (`amp = Math.min(0.004*placedCount, 0.045)` rad) ger mer "spänning" utan risk. Hit-radie och kloss-storlek hålls konstant stora.
- **Oändlig lek:** efter firande (`gsap.delayedCall(1.4, () => this._newTower(ctx))`) startar nästa, ett snäpp högre, runda. Inget slut, ingen game over.

## Tillgångar (programmatiskt)
Inga externa filer. Allt ritas i Pixi v8 + systememoji som `Text`.
- **Klossar:** `Graphics().roundRect(-BW/2,-BH/2,BW,BH,16).fill(PLAYFUL[i % PLAYFUL.length]).stroke({width:5,color:COLORS.white,alpha:0.7})` + två små "studs"-cirklar på toppen (`g.circle(±50,-BH/2+8,12).fill(...)` för LEGO-känsla) + en mörkare skuggrad nedtill.
- **Markplatta/golv:** `roundRect` i `COLORS.brown` + ljus kant.
- **Lådan:** `roundRect`-ram i `COLORS.orange`.
- **Platsmarkör:** pulsande `roundRect`-kontur i `COLORS.yellow`.
- **Mål-indikator:** emoji `🚩` eller `🐦` som `new Text({text:'🚩', style:{fontFamily:FONT.body, fontSize:64}})`.
- **Partiklar/firande:** `puff`, `sparkle`, `bigCelebration` från `lib/feedback.js`.
- **Text:** endast i ev. dekorativt syfte; ingen läsning krävs.

## Återanvänd dessa
- `lib/DragController.js` — drag + snäpp + snäpp-tillbaka + tap-tap-fallback (uppfinn inte eget drag).
- `lib/feedback.js` — `pop`, `wiggle`, `puff`, `sparkle`, `bigCelebration`.
- `lib/theme.js` — `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js` — `randomFrom`, `shuffle`.
- `ctx.services.audio.sfx('tap'|'pop'|'pling'|'soft'|'celebrate')`, `ctx.services.voice.say()/replayLast()`.
- `ctx.progress` — `get()`, `setLevel()`, `complete()`, `setCustom()` (rör ALDRIG `localStorage` direkt).
- `ctx.fxLayer` för firande ovanpå, `ctx.ticker` för sway + idle-recue.

## Edge-cases & städning
- **`this._alive`-skydd:** sätt `this._alive = true` i `init`, `false` i `destroy`. Kontrollera `if (!this._alive) return` först i alla `onCorrect`/`onWrong`/`gsap.delayedCall`/ticker-callbacks/spawn.
- **Undvik dubbel-placering:** medan en kloss snäpper, spawna nästa först i tween-ens `onComplete`; sätt en `this._resolving`-flagga som blockerar ny spawn tills klar.
- **Sway under drag:** nollställ/dämpa tornets sway-rotation medan en kloss aktivt dras så snäpp-koordinaterna stämmer (target ligger ändå still i `this._root`).
- **Exit mitt i animation:** alla `gsap.delayedCall`/tweens måste kunna avbrytas.
- **`destroy(ctx):`**
  - `this._alive = false`
  - `ctx.ticker.remove(this._tick)`
  - `this._drag?.destroy()` (avregistrerar alla item/target-lyssnare)
  - `gsap.killTweensOf(this._root)` samt `killTweensOf` på sway-mål och ev. platsmarkör
  - `this._root?.destroy({ children: true })`
- **Återställ vid ny runda:** kill befintliga klossars idle/sway-tweens innan `_root` rensas/ny torn byggs.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/bygg-tornet/index.js` och `export default { ... }` enligt GameModule-kontraktet (id, titleSv, icon `🧱`, category `'fysik'`, input `'drag'`, ageRange `[3,5]`, bundle `'bygg-tornet'`, voiceIntro).
2. I `init(ctx)`: `this._alive = true`; skapa `this._root = new Container()` och `ctx.stage.addChild(this._root)`; skapa `this._drag = new DragController({ space: this._root, services: ctx.services })`.
3. Rita statisk scen: bakgrunds-hitArea-platta (soft-tryck), markplatta/golv, lådan vid `(250,600)`. Läs `this._level` och beräkna `goal`.
4. Skriv `_newTower(ctx)`: nollställ `this._placed = []`, `this._count = 0`, rita mål-flaggan på goal-höjd, skapa/placera platsmarkören på `slotY(0)`, anropa `_spawnBlock(ctx)`.
5. Skriv `_spawnBlock(ctx)`: om `this._count >= goal` → `_finishTower(ctx)`; annars skapa kloss-`Container` på `(250,560)`, `bounceIn`, registrera via `this._drag.addItem(block, {i:this._count}, { onCorrect, onWrong })` och `addTarget` på platsmarkören (`() => true`, `hitRadius: 300`).
6. `onCorrect(rec)`: guarda `this._alive`/`this._resolving`; `audio.sfx('pling')`; lås klossens läge till `slotY(this._count)`; pusha till `this._placed`; `this._count++`; flytta platsmarkör + mål-uppdatering; `sparkle`/`pop`; spawna nästa i `onComplete`. `onWrong(rec)`: `audio.sfx('soft')` + `wiggle` (DragController snäpper hem).
7. `_finishTower(ctx)`: `ctx.progress.setLevel(this._level+1)`; `ctx.progress.complete()`; `voice.say(randomFrom(PRAISE))`; `bigCelebration(ctx.fxLayer,...)` + glad isär-puff; `gsap.delayedCall(1.4, () => this._alive && this._newTower(ctx))`.
8. Ticker `this._tick`: uppdatera sway (`Math.sin`-offset per placerad kloss, amplitud ∝ höjd) och idle-timer (>6s utan handling → `voice.say(voiceIntro)` + lyft platsmarkören/blink).
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. `destroy(ctx)`: enligt städ-checklistan ovan.
11. Registrera i `src/games/registry.js`: `import byggTornet from './bygg-tornet/index.js'` och lägg `byggTornet` i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repris, snäpp, mjuk miss, firande och att `highestLevel` ökar efter reload.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (inga ouppfångade undantag, inga Pixi-varningar om förstörda objekt).
- `voiceIntro` (eller dess fallback) triggas vid mount; repris-/idle-recue fungerar efter ~6s utan interaktion.
- En kloss finns aktiv i lådan; en pulsande platsmarkör visas vid tornets topp.
- **Drag korrekt:** att dra/släppa klossen på platsmarkören snäpper den på plats, ökar antal staplade klossar med 1 och spawnar en ny kloss; ljud (`pling`/`pop`) + visuell puls sker < 100ms.
- **Tap-tap-fallback:** tap på kloss + tap på platsmarkör placerar klossen likvärdigt.
- **Mjuk miss:** släpp långt från markören ger `soft`-ljud + vingel och klossen återvänder till lådan; INGEN game over, inget rött kryss, inget poängtapp.
- **Runda klar:** när `goal` klossar staplats körs `ctx.progress.complete()` exakt en gång (firande + stjärna + klistermärke) och en ny, högre runda startar automatiskt.
- **Persistens:** `highestLevel` (och ev. `custom.torn`) ökar och kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid `exitToLibrary`/destroy tas ticker-callback bort, tweens dödas och inga "leakande" lyssnare/animationer fortsätter.
