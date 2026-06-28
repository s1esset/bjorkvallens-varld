# Räkna Äpplena (`rakna-applen`)
> Äpplen ramlar mjukt ner i en korg och barnet trycker på ett i taget medan rösten räknar 1–2–3–4–5; 2–5-åringar älskar att "fylla" korgen och höra sin egen räkning bekräftad med pling och firande.

## Metadata
| Fält | Värde |
|---|---|
| id | `rakna-applen` |
| titleSv | Räkna Äpplena |
| icon | 🍎 |
| category | larande |
| input | tap |
| ageRange | [3, 5] |
| bundle | `rakna-applen` |
| voiceIntro | "Tryck på äpplena och räkna med mig!" |

## Mål & mekanik
- **Vad barnet gör:** Ett gäng äpplen (lika många som rundans mål, 1–5) ligger/studsar in på ett träd-/markområde. Barnet trycker på äpplena ett i taget. Varje tryck "plockar" äpplet, det flyger ner i korgen längst ner, och rösten säger nästa räkneord ("ett", "två", "tre"...).
- **Kärnloop:** mål N äpplen → barnet trycker → räkna upp → när alla N är i korgen visas/hörs totalen ("Fem äpplen!") → `ctx.progress.complete()` (firande + klistermärke) → ny runda med (ev. fler) äpplen.
- **Räkning är ordnings­oberoende:** vilket äpple som helst kan tryckas; räknaren går 1,2,3… i tryck­ordning. Det finns inget "fel äpple".
- **Lyckad handling:** äpplet poppar lätt, susar in i korgen (whoosh), korgens äpple-räknare uppdateras, en stor siffra pulserar fram i mitten.
- **Runda klar:** när antal plockade == målet. Inget tidskrav, ingen poäng som sjunker.

## Skärm-layout (1280x720)
Bygg allt i `ctx.stage` (designkoordinater). GameHost ritar hem-/repetera-knappar i headern — rita INGA egna sådana.

- **Bakgrund:** en lugn äng. Valfri `Graphics`: ljusgrön mark-remsa nedtill (`rect(0,560,1280,160).fill(COLORS.green)`), resten bakgrundsfärg `COLORS.bg`. Ett stort träd-emoji 🌳 (`Text`, fontSize 220) centrerat upptill kring (640, 230) som dekor (`eventMode='none'`).
- **Spelyta för äpplen (plockzon):** rektangel x∈[180,1100], y∈[150,470]. Äpplen placeras på ett glest rutnät i denna zon (se Interaktion), aldrig så nära varandra att hit-halo överlappar.
- **Äpple-bricka:** Container med vit cirkel `circle(0,0,70).fill({color:0xffffff,alpha:0.85}).stroke({width:4,color:0xeadfca})` + 🍎 `Text` fontSize 96, `anchor 0.5`. Effektiv träffyta ≥ 140px (radie 70 + osynlig hitArea-halo till 96).
- **Korg:** nere till höger, container vid (980, 620). Rita korg programmatiskt: `roundRect(-150,-60,300,120,30).fill(COLORS.brown)` + vävmönster (några horisontella linjer via `stroke`). Plockade äpplen staplas synligt ovanpå korgkanten.
- **Stor räknesiffra:** `Text` i mitten kring (640, 360), fontFamily `FONT.display`, fontSize 220, fill `COLORS.orangeDark`, `anchor 0.5`, börjar dold (alpha 0). Visar senast räknade tal och pulserar vid varje tryck.
- **Liten progress-rad (valfri):** N tomma cirkel-konturer kring (640, 150) som fylls med 🍎 i takt med plockning — extra visuellt stöd, noll läsning.

## Interaktion
- **Input:** enbart TAP. Varje äpple: `eventMode='static'`, `cursor='pointer'`, explicit `hitArea = new Circle(0,0,96)` (Pixi `Circle` från 'pixi.js') så även de minsta träffar. Lyssna på `'pointertap'`.
- **Placering:** spawna N äpplen på slumpade men icke-överlappande positioner inom plockzonen (enkel rutnäts­placering: dela zonen i celler ≥160px och slumpa lite inom cellen). Studsa in med `bounceIn(apple)` eller `gsap.to(scale, back.out)` med liten stagger.
- **Vid tryck på äpple:**
  1. Markera `apple._picked = true`, sätt `apple.eventMode='none'` (förhindra dubbelräkning/dubbeltryck).
  2. Öka `this._count`.
  3. Spela ljud + säg räkneordet (se nedan), pulsa stora siffran.
  4. Flyg äpplet till en stapelplats i korgen med `gsap.to(apple,{x,y,duration:0.45})` + `whoosh`.
- **Tomt tryck (på bakgrund/redan plockat):** ingen räkning; spela `soft` och låt närmaste äpple `wiggle()` som vänlig vink. Aldrig negativ feedback.
- **Ingen DragController behövs** (rent tap-spel). Ingen tap-tap-fallback krävs eftersom det inte är drag.
- **Idle ~6s:** om `this._count < target` och ingen aktivitet, upprepa en mjuk ledtråd: säg "Tryck på ett äpple till!" och `wiggle` ett oplockat äpple. Återställ idle-timern vid varje tryck.

## Återkoppling & belöning
- **Per-tryck (<100ms):** omedelbart `ctx.services.audio.sfx('pop')` vid plock + visuell puls på stora siffran och äpplets bounce. Direkt efter: `ctx.services.voice.say(RAKNEORD[this._count-1])` där `RAKNEORD = ['ett','två','tre','fyra','fem']`.
- **Korrekt (alla plockade):** 
  - Säg totalen som hel fras: `voice.say(this._count + ' äpplen! ' + randomFrom(PRAISE))` (t.ex. "Fem äpplen! Bravo!"). För 1 äpple: "Ett äpple!".
  - `ctx.services.audio.sfx('correct')` följt av `'celebrate'`.
  - `sparkle(ctx.fxLayer, 980, 600)` vid korgen + `bigCelebration(ctx.fxLayer, {width:ctx.width,height:ctx.height})`.
  - `ctx.progress.complete()` (delat firande + klistermärke hanteras av plattformen).
- **Fel finns inte.** Tomt tryck = `'soft'` + `wiggle`. Inget rött, ingen buzzer, ingen "game over".
- **Ljudnamn som används:** `'pop'`, `'whoosh'`, `'soft'`, `'correct'`, `'celebrate'`, ev. `'pling'` vid sista äpplet.
- **Röstfraser:** voiceIntro, räkneorden ett–fem, total-frasen, idle-ledtråden "Tryck på ett äpple till!".

## Progression & nivåer
- Läs `this._level = Math.max(0, ctx.progress.get().highestLevel|0)`.
- **Mål per runda:** `target = Math.min(5, 2 + this._level)` (runda 1 → 2 äpplen som mjukstart; växer till 5 och stannar där). Alternativt börja på 3 om man vill. Håll alltid `target ≤ 5` (räknespannet 1–5).
- Vid klar runda: `ctx.progress.setLevel(this._level + 1)` (höjer highestLevel om större), `ctx.progress.addStars(1)` sker via `complete()`s firande/klistermärke — använd `complete()` som det enda "klart".
- `ctx.progress.setCustom('rundor', (get().custom?.rundor||0)+1)` för statistik.
- **Oändlig lek:** efter `complete()`, `gsap.delayedCall(1.4, () => this._newRound(ctx))` (skydda med `_alive`). När target nått 5 fortsätter rundorna på 5 (alltid firande, aldrig slut).

## Tillgångar (programmatiskt)
- **Emoji (renderas som `Text`):** 🍎 (äpplen), 🌳 (träd, dekor), valfritt 🧺 om man hellre vill ha korg som emoji istället för Graphics.
- **Pixi Graphics-former:** mark-remsa (`rect`), äpple-brickans vita cirkel (`circle` + `stroke`), korgen (`roundRect` + linjer), tomma progress-konturer (`circle` stroke), stora räknesiffran (`Text`).
- **Partiklar/firande:** via `feedback.js` (`sparkle`, `bigCelebration`, `wiggle`, `bounceIn`, `pop`).
- INGA externa bild- eller ljudfiler. Ingen bundle att ladda (bundle-id finns men är tom).

## Återanvänd dessa
- `lib/feedback.js`: `bounceIn`, `pop`, `wiggle`, `sparkle`, `bigCelebration`.
- `lib/theme.js`: `COLORS`, `FONT`, `PRAISE`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (för positions-/ordnings­slump).
- `ctx.services.audio.sfx`, `ctx.services.voice.say` / `replayLast`.
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.fxLayer` för konfetti. `ctx.ticker` för idle-timer.
- `gsap` för tweens. Pixi `Container`, `Graphics`, `Text`, `Circle` (hitArea).
- Behöver INTE `DragController` (rent tap) eller `Button` (header sköts av GameHost).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `false` först i `destroy`. Skydda ALLA `gsap.delayedCall`/timeout/`onComplete`-callbacks med `if (!this._alive) return`.
- **Förhindra dubbelräkning/dubbeltryck:** sätt `apple.eventMode='none'` och `apple._picked=true` direkt i klick-handlern; ignorera tryck när `this._resolving` (perioden mellan sista plock och ny runda) är sant.
- Idle-timer ackumuleras i ticker-callbacken (`this._idle += ticker.deltaMS/1000`), nollställs vid varje plock; pausa idle-cue när `this._resolving`.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `gsap.killTweensOf(this._root)` och kill per-äpple-tweens; `this._root?.destroy({children:true})`. Användaren kan lämna mitt i en in-flygning — guards förhindrar krasch.
- Bygg nya rundan genom att rensa gamla äpplen (`removeChildren().forEach(o=>o.destroy({children:true}))` på äpple-lagret) innan spawn.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/rakna-applen/index.js` med default-export enligt GameModule-kontraktet (kopiera struktur från `klambubblor/index.js`).
2. Fyll metadata: `id:'rakna-applen'`, `titleSv:'Räkna Äpplena'`, `icon:'🍎'`, `category:'larande'`, `input:'tap'`, `ageRange:[3,5]`, `bundle:'rakna-applen'`, `voiceIntro:'Tryck på äpplena och räkna med mig!'`.
3. I `init(ctx)`: sätt `_alive=true`, skapa `_root` Container + addChild till `ctx.stage`; rita bakgrund (mark, träd-dekor med `eventMode='none'`), korgen, stora siffran (dold), progress-konturer; skapa ett separat `_appleLayer` för äpplen; läs `_level` från `ctx.progress.get().highestLevel`; anropa `_newRound(ctx)`; registrera idle-ticker `this._tick = (t)=>this._update(ctx,t); ctx.ticker.add(this._tick)`.
4. `_newRound(ctx)`: beräkna `target=Math.min(5,2+_level)`, nollställ `_count`, `_resolving=false`, rensa `_appleLayer`, spawna `target` äpplen på icke-överlappande positioner med `bounceIn` + stagger, koppla `pointertap` → `_pick(ctx, apple)`, sätt explicit `hitArea` Circle(0,0,96).
5. `_pick(ctx, apple)`: guarda (`!_alive || _resolving || apple._picked`), markera plockad, öka `_count`, `audio.sfx('pop')`, pulsa stora siffran (visa `_count`, `pop()`), `voice.say(RAKNEORD[_count-1])`, flyg äpplet till korgstapel med `whoosh`; om `_count===target` → `_finish(ctx)`.
6. `_finish(ctx)`: `_resolving=true`, säg total-fras + `randomFrom(PRAISE)`, `audio.sfx('correct')`→`'celebrate'`, `sparkle`+`bigCelebration` på `ctx.fxLayer`, `ctx.progress.setLevel(_level+1)`, `setCustom('rundor',...)`, `ctx.progress.complete()`, `gsap.delayedCall(1.4, ()=>{ if(_alive){ _level++; _newRound(ctx) } })`.
7. Bakgrundstryck (på `_root` eller mark): om inget äpple träffas → `audio.sfx('soft')` + `wiggle` på ett oplockat äpple.
8. `_update(ctx,t)`: ackumulera idle; vid >6s och `_count<target && !_resolving` → upprepa idle-cue och `wiggle` ett oplockat äpple; nollställ idle.
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. `destroy(ctx)`: enligt städ-sektionen ovan.
11. Registrera i `src/games/registry.js`: `import raknaApplen from './rakna-applen/index.js'` och lägg `raknaApplen` i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: verifiera plock-räkning, korg fylls, firande, hem-knapp, röst-repris, och att `highestLevel` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas utan konsolfel (canvas finns, inga uncaught errors) efter att man startar `rakna-applen` från biblioteket.
- Vid mount sägs/triggas `voiceIntro` (VoiceService anropas) och `target` äpplen syns på skärmen.
- Tryck (`pointertap`/klick) på ett äpple → ljud (`pop`) + visuell respons inom ~100ms; räknaren ökar med 1 och äpplet flyttas mot korgen; samma äpple kan inte räknas två gånger (dubbeltryck ignoreras).
- När alla `target` äpplen plockats → `ctx.progress.complete()` anropas (firande/konfetti på fxLayer, klistermärke), och total-frasen sägs.
- Tryck på tom yta → mjuk respons (`soft` + wiggle), ingen räkning, inget felljud, ingen "game over".
- Efter klar runda startar en ny runda automatiskt (äpplen spawnar igen) → oändlig lek.
- Progress sparas: efter en avklarad runda och sidomladdning är `highestLevel` ≥ tidigare värde (kontroll via localStorage `pwagames.save.v1` på aktiv profil under `games['rakna-applen']`).
- Idle ~6s utan input triggar en upprepad röst-ledtråd (idle-cue) och en vänlig wiggle.
