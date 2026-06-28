# Kittla Figuren (`kittla-figuren`)
> En stor, mjuk figur som fnissar, sprattlar och vinglar varje gång barnet trycker på dess kittelfläckar (mage, fötter, huvud, kinder) — ren orsak-och-verkan-glädje utan mål, fel eller slut, perfekt för de allra minsta (2-4 år).

## Metadata
| Fält | Värde |
|---|---|
| id | `kittla-figuren` |
| titleSv | Kittla Figuren |
| icon | 😄 |
| category | roligt |
| input | tap |
| ageRange | [2, 4] |
| bundle | `kittla-figuren` |
| voiceIntro | "Kittla gubben! Tryck på magen, fötterna och huvudet!" |

## Mål & mekanik
Det finns inget vinst-/förlustmål — spelet är ren upptäckarlek (cause-and-effect). En enda stor, glad figur ("Kittel-Kalle") står mitt på skärmen. Figuren har flera markerade **kittelzoner** (mage, vänster fot, höger fot, huvud, vänster kind, höger kind). 

**Kärnloop:** barnet trycker på en zon → figuren reagerar omedelbart (< 100ms): zonen studsar, hela figuren vinglar/sprattlar, ett glatt skratt-/pop-ljud spelas och en liten partikelpuff syns. Munnen växlar till ett bredare skratt och ögonen knipps ihop en kort stund. Varje zon har sin egen lilla reaktion (t.ex. fötterna sparkar, huvudet skakar, magen hoppar).

**"Klart"-tillfälle (oändlig lek):** spelet räknar antal kittlingar i den aktuella rundan. När barnet har kittlat `kittlingarMal` gånger (default 6) når figuren ett "skrattanfall": ett större firande (`bigCelebration` + `voice.say` beröm), `ctx.progress.complete()` anropas (delat firande + stjärna + klistermärke), räknaren nollställs och en ny runda börjar direkt (ev. med en ny figurfärg). Leken tar aldrig slut.

## Skärm-layout (1280x720)
Header-knappar (hem/högtalare) ritas av GameHost — rita INGA egna.

- **Bakgrund:** mjuk pastellrektangel `g.rect(0,0,1280,720).fill(COLORS.bg eller 0xFFF3E0)` över hela ytan, `eventMode='none'`. Valfria dekor-moln (vita rundade rektanglar) högt upp, `eventMode='none'`, `interactiveChildren=false`.
- **Figur-rot (`figureContainer`):** centrerad pivot vid **x=640, y=400** (lite under mitten så huvudet får plats). All anatomi byggs i lokala koordinater runt (0,0). Hela containern används för "sprattel"-vinglet.
- **Kropp:** stor rundad rektangel/ellips, lokal mitt (0, 0), ca **bredd 320, höjd 300**, `g.roundRect(-160,-150,320,300,80).fill(bodyColor).stroke({width:8,color:darker})`.
- **Huvud:** cirkel ovanför kroppen, lokal centrum (0, -230), **radie 110**.
- **Ögon:** två cirklar på huvudet vid (-40,-245) och (40,-245), radie 18, vita med svart pupill r=9.
- **Mun:** Graphics-båge under ögonen, centrum (0, -205), ritas om vid skratt (liten båge → stor öppen halvcirkel).
- **Kinder:** två rosa cirklar på huvudet vid (-70,-215) och (70,-215), radie 30 — kittelzoner.
- **Mage:** kittelzon på kroppen, lokal (0, 30), markerad med en svag ljusare cirkel r=90.
- **Fötter:** två ovaler under kroppen vid (-90, 175) och (90, 175), ca bredd 120 höjd 70 — kittelzoner.
- **Armar:** två rundade rektanglar på sidorna (dekor, behöver ej vara zoner).
- **Kittelzoner (6 st):** mage, vänster fot, höger fot, huvud, vänster kind, höger kind. Varje zon är ett eget interaktivt barn med en **explicit `hitArea`** (Pixi `Circle`) på minst **radie 70px** (>=96px diameter, plus halo). Zonerna ligger ovanpå anatomin.
- **Räknar-indikator (valfritt, ej läskrav):** en rad med 6 små stjärnor/prickar längst ner (y≈660, centrerad), där en tänds per kittling den här rundan — visuell, kräver ingen läsning.

## Interaktion
Endast **TAP**. Ingen drag, inget dubbeltryck, inget långtryck.

- Varje kittelzon är en `Container`/`Graphics` med `eventMode='static'`, `cursor='pointer'`, och `hitArea = new Circle(0,0,70)` (i zonens lokala rum) för generös, exakt träffyta + halo.
- Lyssnare: `zon.on('pointertap', () => this._tickle(ctx, zon))`.
- **Tomt tryck** (på bakgrunden utanför zoner): bakgrunden har egen `pointertap` som ger en mjuk, neutral reaktion — figuren vinglar lätt + `audio.sfx('soft')`. Aldrig "fel".
- **Dubbel-/snabbtryck-skydd:** under en zons reaktions-animation (ca 250ms) ignoreras nya tap på *samma* zon via en `zon._busy`-flagga; andra zoner svarar fortfarande direkt så barnet aldrig känner sig blockerat.
- Ingen DragController behövs (rent tap-spel).

## Återkoppling & belöning
**Per-tryck (< 100ms), endast positivt:**
- Ljud: `audio.sfx('pop')` på zon-kittling, ibland (≈25 %) `audio.sfx('pling')` för variation. Det sista i en runda blir `audio.sfx('celebrate')`.
- Bild: den tryckta zonen får `pop(zon)` (puls), hela figuren får `wiggle(figureContainer)` (sprattel/vingel), `puff(this._layer, globalX, globalY, {count:8})` på trycket. Munnen byter till stort skratt i ~400ms och ögonen knips ihop, sedan tillbaka.
- Zon-specifik krydda: fötter → snabb sparkrörelse (gsap y-yoyo), huvud → liten rotation-shake, mage → kort hopp (figuren `y -= 12` yoyo).
- Röst: sparsamt (inte vid varje tryck — annars pratar den i mun på sig själv). Slumpa korta fnitter-fraser via `voice.say` med ~30 % chans, t.ex. "Hihi!", "Det kittlas!", "Mer!".

**"Fel"/tomt:** bakgrunds-tap → `wiggle` (lätt) + `audio.sfx('soft')`. Aldrig buzzer, rött kryss eller bestraffning.

**Runda klar:** vid `kittlingarMal` kittlingar:
- `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))` (t.ex. "Vad du kittlas bra!").
- `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`.
- Figuren gör ett stort skratt-anfall (snabb yoyo-skala + skakning) ~1.2s.
- `ctx.progress.complete()` (ger stjärna + klistermärke via plattformen).
- Därefter `gsap.delayedCall(1.4, () => this._newRound(ctx))` (skyddad av `this._alive`).

## Progression & nivåer
Oändlig lek. Svårighet hålls medvetet låg (2-4 år) — ingen riktig "svårighet", bara variation.
- `ctx.progress.setCustom('rundor', n+1)` per avklarad runda (statistik).
- `highestLevel`/`setLevel`: använd milt — höj nivå var t.ex. 3:e runda enbart för att variera figurfärg och antal aktiva kittelzoner (4 → 6), aldrig för att göra det svårare/snabbare.
- `_newRound`: nollställ rundräknaren, slumpa ny `bodyColor` från `PLAYFUL`, återställ mun/ögon till neutral-glad, töm räknar-indikatorn. Kittelmål kan stå kvar på 6 (eller skala 5→6→8 mycket mjukt). Ingen tidspress någonsin.

## Tillgångar (programmatiskt)
INGA externa filer. Allt via Pixi Graphics + system-emoji (Text).
- **Emoji (Text, anchor 0.5):** brick-ikon `😄`. Valfri svävande hjärt-/skratt-emoji vid kittling: `😄`, `😆`, `🤣`, `❤️` som kort animerad `Text` ovanför zonen (alternativ till/ihop med `puff`).
- **Pixi Graphics:** kropp (roundRect), huvud (circle), ögon (circle + pupill), mun (arc/roundRect som ritas om), kinder (circle, rosa), mage-markering (circle, ljusare alpha), fötter (ellipse via `g.ellipse`), armar (roundRect), bakgrund (rect), moln (roundRect), räknar-prickar (circle/star).
- **Färger:** `bodyColor` från `PLAYFUL[]`, kinder rosa (0xFF8FA3), bakgrund mjuk pastell från `COLORS`.

## Återanvänd dessa
- `lib/feedback.js`: `pop` (zon-puls), `wiggle` (sprattel + tomt tryck), `puff` (partiklar vid kittling), `bigCelebration` (runda klar), ev. `sparkle`.
- `lib/theme.js`: `PLAYFUL`, `COLORS`, `FONT`, `PRAISE`.
- `lib/swedish.js`: `randomFrom` (slumpa fnitter-/berömfraser), ev. `shuffle`.
- `ctx.services.audio.sfx('pop'|'pling'|'soft'|'celebrate')`, `ctx.services.voice.say(...)`.
- `ctx.progress.complete()`, `ctx.progress.setCustom('rundor', ...)`, ev. `setLevel`.
- `ctx.fxLayer` för firande-konfetti. `ctx.ticker` för idle-räkning.
- Ingen Button behövs (header sköts av GameHost). Ingen DragController.

## Edge-cases & städning
- `this._alive = true` i `init`; sätt `false` först i `destroy`. Alla `gsap.delayedCall`/`setTimeout`-callbacks (ny runda, mun-återställning, idle-recue) måste börja med `if (!this._alive) return`.
- **Dubbeltryck under "resolving":** per-zon `_busy`-flagga sätts vid tap, rensas i en `gsap.delayedCall`/onComplete efter ~250ms (guardad). Runda-firandet sätter `this._resolving = true` så fler kittlingar inte triggar flera `complete()` samtidigt; rensas i `_newRound`.
- **Idle (~6s):** `_update(ctx, ticker)` ackar `this._idle += ticker.deltaMS/1000`; vid >6s och `_resolving===false` → `voice.say(this.voiceIntro)` (eller kort "Kittla mig!") + en zon vinkar (`pop`). Nollställ `_idle` vid varje tap.
- `destroy(ctx)`: `this._alive=false`, `ctx.ticker.remove(this._tick)`, `gsap.killTweensOf(this._figure)` och killTweens på zoner/layer, `this._layer?.destroy({children:true})`. Nollställ referenser.
- Konvertera zon-lokala koordinater till global/layer-koordinater för `puff`/emoji via `zon.getGlobalPosition()` → `this._layer.toLocal(...)` (eller använd zonens kända x/y i figure-rummet + figurens offset).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/kittla-figuren/index.js` och default-exportera ett GameModule-objekt med metadata enligt tabellen ovan (kopiera strukturen från `src/games/klambubblor/index.js`).
2. `init(ctx)`: sätt `this._alive=true`, skapa `this._layer = new Container()` och `ctx.stage.addChild(this._layer)`. Initiera `this._idle=0`, `this._resolving=false`. Anropa `this._build(ctx)`. Lägg `this._tick = (t)=>this._update(ctx,t)` och `ctx.ticker.add(this._tick)`.
3. `_build(ctx)`: rita bakgrund (eget interaktivt barn för tomt-tryck), bygg `this._figure` (Container vid x=640,y=400) med kropp, huvud, ögon, mun (spara referens `this._mouth`), kinder, mage, fötter, armar. Lägg figuren i `this._layer`. Slumpa `this._bodyColor`.
4. Skapa de 6 kittelzonerna som interaktiva barn med `hitArea = new Circle(0,0,70)`, `eventMode='static'`, `pointertap` → `this._tickle(ctx, zon, kind)`. Initiera `this._count=0` och `this._goal=6`. Rita räknar-prickar.
5. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
6. `_tickle(ctx, zon, kind)`: guard `if(!this._alive || zon._busy || this._resolving) return`. Sätt `zon._busy=true`, nollställ `_idle`, `_count++`. Spela ljud, kör `pop(zon)` + `wiggle(this._figure)` + zon-specifik animation + `puff(...)`, byt mun till skratt (återställ via guardad delayedCall). Tänd nästa räknar-prick. Rensa `_busy` efter ~250ms. Om `_count>=_goal` → `_celebrateRound(ctx)`.
7. `_celebrateRound(ctx)`: sätt `this._resolving=true`, spela `celebrate`-ljud + beröm-röst, `bigCelebration(ctx.fxLayer,...)`, `ctx.progress.complete()`, `setCustom('rundor', ...)`, `gsap.delayedCall(1.4, ()=>this._newRound(ctx))`.
8. `_newRound(ctx)`: guard `_alive`, `this._resolving=false`, `_count=0`, slumpa ny färg, återställ mun/ögon/prickar.
9. `_update(ctx,t)`: idle-recue enligt ovan.
10. `destroy(ctx)`: städa enligt "Edge-cases & städning".
11. Registrera i `src/games/registry.js`: lägg till `import kittlaFiguren from './kittla-figuren/index.js'` och inkludera i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: verifiera tap-respons < 100ms, tomt tryck = mjukt, runda klar → firande + klistermärke, och att `rundor`/progress finns kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderas utan konsolfel (inga uncaught errors/warnings vid init/mount/destroy).
- Canvas finns och figuren ritas (t.ex. verifiera att `ctx.stage`/layer har barn via exponerat test-hook eller via skärmdump-diff).
- Tap på en kittelzon ger respons: ljud-anrop sker (mocka/spionera `audio.sfx`) och en animation startar (figurens scale/rotation ändras) inom rimlig tid.
- Tap på bakgrunden (tomt) triggar `audio.sfx('soft')` och `wiggle`, men ökar INTE rundräknaren och triggar ALDRIG ett fel-tillstånd/buzzer.
- Efter `_goal` kittlingar anropas `ctx.progress.complete()` exakt en gång per runda (verifiera spion), och `bigCelebration` lägger barn i `fxLayer`.
- Snabba upprepade tap på samma zon under reaktionen leder inte till flera `complete()`-anrop (dubbeltryck-skydd).
- Efter avklarad runda startar en ny runda automatiskt (räknaren nollställd, figuren interaktiv igen).
- `progress`/`custom.rundor` skrivs och kvarstår efter omladdning (verifiera localStorage `pwagames.save.v1`).
- `destroy()` tar bort ticker-callback och förstör layer utan att lämna kvarvarande gsap-tweens (inga fel vid snabb exit mitt i animation).
