# Peka på Kroppen (`peka-pa-kroppen`)
> Rösten ber barnet peka på en kroppsdel (näsa, mage, fot...) på en glad figur, och rätt del lyser upp och studsar med namnet uppläst — en lugn lärlek som bygger kroppsordförråd helt utan läsning och utan att man kan göra fel.

## Metadata
| Fält | Värde |
|---|---|
| id | `peka-pa-kroppen` |
| titleSv | Peka på Kroppen |
| icon | 👦 |
| category | pedagogiskt |
| input | tap |
| ageRange | [2, 4] |
| bundle | `peka-pa-kroppen` |
| voiceIntro | "Kan du peka på näsan?" (genereras dynamiskt utifrån den efterfrågade delen vid varje runda) |

## Mål & mekanik
- En stor vänlig figur ("Bobo-liknande" barnfigur, ritad med Pixi Graphics + emoji) står i mitten av skärmen.
- Rösten ber barnet peka på EN namngiven kroppsdel, t.ex. "Kan du peka på magen?".
- **Kärnloop:** röst frågar -> barnet trycker på en kroppsdel -> rätt del lyser/hoppar + namnet sägs glatt -> kort paus -> ny del efterfrågas.
- **Lyckad handling:** den efterfrågade delen pulserar, en mjuk gloria/ring lyser upp runt den, `sparkle` gnistror, ljud `correct`/`pling`, och rösten säger delens namn ("Näsa! Bra!").
- **Fel/annan del:** den tryckta delen ger en vänlig `wiggle` + mjukt `soft`-ljud och ett litet uppmuntrande "Var är näsan?" (upprepar frågan). Aldrig bestraffning.
- **Runda blir klar:** efter att barnet hittat ett antal delar (default 4, se Progression) anropas `ctx.progress.complete()` (delat firande + klistermärke), sedan startar en ny runda automatiskt med blandade delar (oändlig lek).

## Skärm-layout (1280x720)
GameHost ritar header med hem-knapp och repetera/högtalar-knapp överst — rita INTE egna sådana. Använd ytan under headern (ca y >= 96).

- **Bakgrund:** mjuk pastellpanel `roundRect(40, 96, 1200, 600, 48)` i ljus färg från COLORS, eventMode `none`.
- **Figur (`_figure` Container):** centrerad horisontellt vid x=640, vertikalt centrerad i spelytan med fötter nedtill, ca y-spann 150–650 (höjd ~500 px). Uppbyggd av delar (alla i designkoordinater relativt figurens rot vid 640, 130 = topp av huvudet):
  - **Huvud:** cirkel r=90 vid (0, +90) -> absolut ~(640, 220). Hit-region runt huvudet.
  - **Hår/ansikte-emoji:** valfri emoji-Text 😊 ovanpå huvudet (dekorativ, `eventMode='none'`).
  - **Näsa:** liten cirkel r=18 vid huvudets mitt (640, 230). Hit-halo r=70.
  - **Ögon:** två cirklar (640±32, 205) — valbara som "ögon".
  - **Mun:** båge/roundRect (640, 262, bredd 70, höjd 22) — valbar som "mun".
  - **Öron:** två cirklar (640±90, 220) r=24 — "öron".
  - **Mage:** stor avlång roundRect kropp (640, 410), magezon cirkel r=80 vid (640, 410) — "mage".
  - **Armar:** två avlånga roundRect från axlar (640±110, 360) ut åt sidorna — "armar/händer". Händer cirklar vid (480, 430) och (800, 430).
  - **Ben/fötter:** två ben nedtill, fötter cirklar/ovaler vid (590, 640) och (690, 640) — "fötter".
- **Varje kroppsdel** är en egen interaktiv Container med ett osynligt hit-halo (cirkel r>=70 / minst 96 px diameter, eventMode `static`, alpha 0.001 fill) ovanpå den synliga grafiken, så små delar (näsa) ändå har stor träffyta.
- **Mascot/prompt-rad (valfritt):** liten talbubbla uppe vid figurens sida som visar emoji för efterfrågad del (t.ex. 👃) som visuellt stöd, vid (1050, 200). Dekorativ.
- **Sparkle/firande** läggs i `ctx.fxLayer` (ovanpå allt).

## Interaktion
- **Endast TAP.** Varje kroppsdel-Container: `eventMode='static'`, `cursor='pointer'`, lyssnar på `'pointertap'`.
- Hit-area sätts explicit: `part.hitArea = new Circle(0,0, R)` med R >= 48 (minst 96 px träffdiameter), även för små delar som näsa/ögon, så de minsta lätt träffar.
- Vid tap jämförs `part.key` (ASCII, t.ex. `'nasa'`, `'mage'`, `'fot'`, `'oga'`, `'mun'`, `'ora'`, `'arm'`, `'hand'`) mot `this._target.key`.
- **Ingen drag** behövs. (Spelet är `input:'tap'`, så DragController används inte.)
- **Anti-dubbeltryck:** medan en korrekt träff "resolvas" (`this._resolving = true`) ignoreras nya tap tills nästa fråga ställs.
- Tomt tryck på bakgrunden/figurkroppen utan key: mjuk `soft` + ingen påföljd (frågan står kvar).

## Återkoppling & belöning
- **Per tap (<100ms):** alltid omedelbart ljud + bild.
  - Korrekt del: `audio.sfx('correct')` (ibland `'pling'`), `pop(part)`-puls, lysande ring (Graphics-cirkel som skalar ut och tonar bort) runt delen, `sparkle(ctx.fxLayer, x, y)`, och `voice.say('<Namn>! Bra!')` t.ex. "Näsa! Bra!".
  - Fel del: `audio.sfx('soft')` + `wiggle(part)`. Efter kort stund upprepar `voice.say` frågan ("Var är magen?"). Ingen röd markering, inget minus.
- **Vald del räknas en gång per runda:** efter korrekt -> `this._found++`, delen får en liten bestående glädje (t.ex. en stjärna 🌟 kort) innan nästa fråga.
- **Runda klar:** när `this._found >= this._goal`:
  - `ctx.progress.complete()` (firande 1–2s + stjärna + klistermärke), `bigCelebration` hanteras av complete/firandet; lägg ev. extra `audio.sfx('celebrate')`.
  - `ctx.progress.setCustom('rundor', n+1)`.
  - Efter ~1.4s (gsap.delayedCall, `_alive`-skyddad) startas ny runda.
- **Idle ~6s** utan tap: upprepa aktuell fråga via `voice.say(this._currentPrompt)` och låt efterfrågad del pulsera lätt en gång (hint).
- **Ljudnamn som används:** `correct`, `pling`, `soft`, `celebrate`, ev. `tap` vid första beröring.
- **Röstfraser (svenska, full åäö):** frågor "Kan du peka på näsan?", "Var är magen?", "Hitta foten!"; beröm "Näsa! Bra!", "Ja, det är magen!", "Duktig!".

## Progression & nivåer
- Använd `ctx.progress.get().highestLevel` för att skala svårighet:
  - **Nivå 1 (2–3 år):** stor pool men frågar bara bland de tydligaste, stora delarna (mage, huvud, fot, hand). `_goal = 3`.
  - **Nivå 2:** lägg till näsa, mun, öron. `_goal = 4`.
  - **Nivå 3+:** hela poolen inkl. ögon, armar; snabbare ny-frågetempo. `_goal = 5`.
- Höj nivå via `ctx.progress.setLevel(level+1)` efter ett par fullföljda rundor (t.ex. var 2:a `complete()`), tak vid 3.
- **Frågeval:** `shuffle()` en lista över delar som finns på aktuell nivå; ta dem i tur utan upprepning inom rundan (`randomFrom`/`shuffle` från `lib/swedish.js`).
- **Oändlig lek:** efter `complete()` -> ny runda med ny blandning; inget slut, ingen poäng som sjunker.
- Spara antal rundor i `custom.rundor`; inga felräknare.

## Tillgångar (programmatiskt)
- **Emoji (Text-objekt, dekorativa):** ansiktsuttryck 😊, valfria del-ikoner i prompt-bubbla: näsa 👃, mage (hand på mage / 🫃 alternativt enbart text), fot 🦶, hand ✋, öra 👂, öga 👁️, mun 👄. (Använd endast för visuellt stöd; spel-logiken bygger på `key`.)
- **Pixi Graphics-former:**
  - Bakgrundspanel `roundRect(...).fill(...)`.
  - Huvud/öron/ögon/näsa/händer/fötter: `circle(...).fill(...).stroke({width,color})`.
  - Kropp/armar/ben: `roundRect(...)` avlånga.
  - Mun: `roundRect`/båge.
  - Lysande ring vid korrekt: `circle(0,0,R).stroke({width:8,color})` som skalas och tonas bort.
  - Hit-halo: `circle(0,0,R).fill({color:0xffffff, alpha:0.001})` för stora träffytor.
- **Färger:** från `theme.COLORS` / `PLAYFUL`.
- INGA externa bild- eller ljudfiler.

## Återanvänd dessa
- `ctx.services.voice.say/replayLast/cancel` för instruktion + beröm.
- `ctx.services.audio.sfx('correct'|'pling'|'soft'|'celebrate'|'tap')`.
- `lib/feedback.js`: `pop` (korrekt puls), `wiggle` (fel/lekfullt), `sparkle` (gnistror vid korrekt), `bigCelebration` (vid runda klar, om complete inte redan firar).
- `ctx.progress`: `complete()`, `setCustom('rundor', n)`, `get()`, `setLevel(n)`.
- `lib/swedish.js`: `shuffle`, `randomFrom`, `asciiFold` (för `key`-namn).
- `lib/theme.js`: `DESIGN_W`, `DESIGN_H`, `FONT`, `COLORS`, `PLAYFUL`.
- `ctx.fxLayer` för gnistror/konfetti. INTE DragController (rent tap-spel).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `this._alive = false` först i `destroy`. Alla `gsap.delayedCall`/`setTimeout`-callbacks kontrollerar `if (!this._alive) return`.
- Undvik dubbelträff under firande: `this._resolving`-flagga sätts true vid korrekt och vid runda-klart; nollställs när ny fråga ställs.
- `destroy(ctx)`:
  - `ctx.ticker.remove(this._tick)`.
  - `gsap.killTweensOf(...)` på figur, delar, ringar, och döda alla per-del-tweens.
  - Avbryt röst: `ctx.services.voice.cancel()`.
  - `this._root.destroy({ children: true })`.
- Idle-timer återställs vid varje tap.
- Om profil/progress saknar custom -> defaulta säkert (`get().custom?.rundor || 0`).
- Användaren kan avsluta mitt i animation -> allt skyddat av `_alive`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/peka-pa-kroppen/index.js`, default-exportera GameModule med metadata enligt tabellen ovan. Kopiera strukturen från `klambubblor/index.js` som mall.
2. I `init(ctx)`: sätt `this._alive=true`, skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Rita bakgrundspanel.
3. Bygg figuren: skapa `this._figure` Container med varje kroppsdel som egen Container `{ key, view(Graphics), halo(Graphics, alpha~0), hitArea(Circle r>=48) }`; sätt `eventMode='static'`, `'pointertap'`-lyssnare som anropar `this._onPart(ctx, part)`.
4. Definiera del-pool per nivå och en metod `_nextQuestion(ctx)` som väljer nästa `key`, sätter `this._target`, bygger svensk fras `this._currentPrompt` och anropar `voice.say(...)`; nollställ `this._resolving=false`, `this._idle=0`.
5. `_onPart(ctx, part)`: om `this._resolving` -> return. Spela `tap`. Om `part.key === this._target.key` -> korrekt-flöde (`pop`, ljud `correct`/`pling`, ring + `sparkle`, beröm-röst, `this._found++`, `_resolving=true`, gsap.delayedCall -> `_found>=_goal ? _completeRound : _nextQuestion`). Annars fel-flöde (`wiggle`, `soft`, upprepa fråga efter kort delay).
6. `_completeRound(ctx)`: `ctx.progress.complete()`, ev. `audio.sfx('celebrate')`, `setCustom('rundor', n+1)`, ev. höj nivå, gsap.delayedCall(1.4) -> `_startRound(ctx)`.
7. `_startRound(ctx)`: `this._found=0`, beräkna `_goal` från nivå, `shuffle` del-pool till `this._queue`, anropa `_nextQuestion`.
8. `mount(ctx)`: starta första rundan om ej startad och säg första frågan (voiceIntro/aktuell prompt).
9. I `init` lägg `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`; `_update` ökar `this._idle += t.deltaMS/1000`, vid >6s upprepa fråga + pulsa måldelen.
10. `destroy(ctx)`: enligt städ-sektionen ovan.
11. Registrera i `src/games/registry.js`: importera modulen och lägg till i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, testa: röst frågar, korrekt del firar, fel ger vingel, hem-knapp och repetera fungerar, progress (rundor) kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras i GameHost utan konsolfel (inga uncaught errors/warnings från Pixi).
- Canvas renderas och figuren med flera kroppsdelar finns (verifierbart via exponerat test-API eller genom att tap på koordinater ger respons).
- Ett tap på den efterfrågade delens koordinat triggar korrekt-flöde: puls/ring + beröm; `this._found` ökar (verifierbar via test-hook eller progress).
- Ett tap på en annan del ger mjuk respons (wiggle/`soft`) UTAN att `_found` ökar och UTAN felmarkering/buzzer.
- När `_goal` korrekta delar hittats anropas `ctx.progress.complete()` (verifiera firande/sticker eller progress-uppdatering) och en ny runda startar automatiskt.
- Progress sparas: `custom.rundor` (eller motsvarande) ökar och kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- Idle ~6s upprepar instruktionen (röst-anrop sker igen / hint-puls körs).
- Efter `exitToLibrary`/destroy finns inga kvarvarande tickers eller gsap-tweens (inga konsolfel efter unmount) och `voice.cancel()` har körts.
