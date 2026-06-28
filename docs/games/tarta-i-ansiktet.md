# Tårta i Ansiktet (`tarta-i-ansiktet`)
> Barnet trycker eller drar en gräddtårta rätt i ansiktet på en skrattande clown som blir härligt kladdig — ren slapstick-glädje utan mål eller fel, och 3-5-åringar älskar den tillåtna busigheten och det stora "PLASK!".

## Metadata
| Fält | Värde |
|---|---|
| id | `tarta-i-ansiktet` |
| titleSv | `Tårta i Ansiktet` |
| icon | `🎂` |
| category | `roligt` |
| input | `mixed` (tap ELLER enkel drag) |
| ageRange | `[3, 5]` |
| bundle | `tarta-i-ansiktet` |
| voiceIntro | `Kasta tårtan i ansiktet på clownen!` |

## Mål & mekanik
Kärnloop (oändlig, helt utan felsteg):
1. En stor, skrattande clown står mitt på scenen. Längst ner ligger en "tårtbricka" med en gräddtårta som väntar.
2. Barnet kan antingen **trycka** på tårtan (den flyger automatiskt mot clownens ansikte) eller **dra** tårtan upp mot ansiktet. Båda leder till samma roliga PLASK.
3. När tårtan träffar ansiktet: grädde-splat täcker ansiktet, clownen skrattar och vinglar, konfetti/gnistror, ljud `pop`+`celebrate`-känsla. Ansiktet blir kladdigare för varje träff (1 -> 2 -> 3 lager grädde).
4. En **svamp/trasa-knapp** (🧽) dyker upp när ansiktet är kladdigt. Tryck på den -> ansiktet torkas rent med ett `whoosh`, och en ny tårta läggs fram. Barnet kan kasta hur många gånger som helst.
5. En "runda blir klar" efter att barnet kastat ett visst antal tårtor (se Progression). Då anropas `ctx.progress.complete()` (delat firande + klistermärke), clownen jublar, och en ny färsk runda startar automatiskt.

Det finns inget rätt/fel: varje tryck/drag som når ansiktet är en succé. Tomt tryck (bredvid) ger bara en lekfull liten studs/vingel på tårtan och ett mjukt `soft`-ljud — aldrig en bestraffning.

## Skärm-layout (1280x720)
Designkoordinater. GameHost ritar hem-/högtalarknappar i headern — rita INGA egna sådana.

- **Bakgrund**: hel `Graphics` rect 0,0 -> 1280,720, fyll `COLORS.bg` (0xfdf6e3). Dekorativ "scen-golv"-rect y=560..720 i ljus `COLORS.cream`, samt två "ridå"-rektanglar i `COLORS.red` vid vänster (x 0..90) och höger (x 1190..1280), `eventMode='none'`. interaktiva barn av: `interactiveChildren=false` på dekorlagret.
- **Clown (`_clown` Container)**: centrerad horisontellt, x=640, y=300.
  - Huvud: `Graphics().circle(0,0,150).fill(0xfff0e0).stroke({width:8,color:0xe8c9b0})`.
  - Hår: två röda `circle` r=70 vid (-130,-40) och (130,-40), fyll `COLORS.red`.
  - Röd näsa: `circle(0,40,34).fill(COLORS.red)`.
  - Ögon: två vita `circle` r=26 vid (-55,-25)/(55,-25) med svarta pupiller r=12.
  - Leende: emoji-Text `🤡` är INTE huvudkroppen — clownen byggs av Graphics; men en glad mun ritas med `g.arc`/roundRect (en bred röd båge). Alternativt enkelt: använd ansiktsemoji-Text `😄` (fontSize 120) som munuttryck centrerad vid (0,55). Håll det programmatiskt (emoji = Text).
  - Hatt: liten `roundRect` + `circle` topp ovanpå huvudet (y -150), valfri färg ur `PLAYFUL`.
  - `_clown.eventMode='static'` så att tap på clownen också registrerar en kastträff (stor träffyta).
- **Gräddlager (`_splatLayer` Container)** ligger framför clownens ansikte men under svampknappen. Här adderas grädde-splats (vita ojämna `circle`-klumpar) vid varje träff, centrerade kring ansiktet (lokala koordinater i clownen).
- **Tårtbricka / aktiv tårta (`_cake` Container)**: startposition x=640, y=620. Storlek ~140px bred.
  - Tårta byggs av: botten `roundRect(-70,-30,140,60,16).fill(0xc98a5a)` (botten), grädde-topp `roundRect(-72,-46,144,30,14).fill(0xffffff)`, ett körsbär `circle(0,-52,14).fill(COLORS.red)`, plus emoji-Text `🍰` (fontSize 90) ovanpå för tydlighet. Hela tårtan har hit-halo: sätt `_cake.hitArea` till en generös rektangel/cirkel (radie ~90).
- **Svampknapp (`_wipeBtn`)**: visas endast när `_splats > 0`. Placeras nere till höger, x=1120, y=620. Byggs med `lib/Button.js`: `new Button({ icon:'🧽', label:'Torka', width:200, height:120, color:COLORS.blue, services, sound:'whoosh', onTap:()=>this._wipe(ctx), radius:28, stacked:true })`. Minst 96px träffyta uppfylls (200x120).
- **Räknar-prickar (valfritt, ingen siffra krävs)**: små stjärnor 🌟 uppe (y=70, centrerade) som tänds per kast i rundan för att visa progress utan läsning. Max ~4 prickar.

Marginaler: allt interaktivt minst 24px från kanter; tårta och svampknapp minst 96px stora.

## Interaktion
Spelet stödjer BÅDA inmatningssätten samtidigt (input: `mixed`):

**Tap-läge (enklast, för de minsta):**
- Tryck på `_cake` (eller på `_clown`) -> `pointertap` -> `this._throw(ctx)`: tårtan animeras (gsap) i en båge från sin position upp till clownens ansikte (mål ~x=640, y=300), skala upp lite, sedan splat. Under flygningen sätts `this._resolving=true` så att inga nya kast triggas förrän träffen är klar.

**Drag-läge (för de äldre):**
- Använd `lib/DragController.js`: `this._drag = new DragController({ space:this._root, services:ctx.services })`.
- `this._drag.addItem(this._cake, { kind:'cake' }, { onCorrect, onWrong })`.
- `this._drag.addTarget(this._clown, (data)=>data.kind==='cake', { hitRadius:180 })` — stor snäppzon runt ansiktet.
- `onCorrect(rec, target)` -> samma `_splat`-logik som tap, sedan lägg fram ny tårta. DragController ger tap-tap-fallback gratis (tryck tårta, tryck clown).
- `onWrong(rec)` -> `wiggle(rec.view)` + `soft`-ljud (DragController spelar redan `soft`), snäpp tillbaka. Aldrig bestraffning.

Eftersom DragController redan hanterar pointerdown/up och har tap-tap, kan ren-tap-på-tårtan ses som "tap-tap utan mål". För enkel "tryck = kasta direkt"-känsla: lägg dessutom en separat `pointertap` på `_clown` som direkt kastar närmaste väntande tårta. Dubbelhantering undviks via `this._resolving`-flaggan.

Hit-areor: `_cake.hitArea` cirkel r≈90; `_clown` target hitRadius 180; svampknapp 200x120.

## Återkoppling & belöning
Per-tryck (<100ms): varje `pointertap`/pickup ger omedelbart `audio.sfx('tap')` och en liten `pop(_cake)`-puls innan flygbågen startar.

Lyckad träff (`_splat`):
- Ljud: `audio.sfx('pop')` vid nedslag, ibland `audio.sfx('pling')` (25% chans) som krydda.
- Bild: lägg 3-5 vita grädde-`circle`-klumpar i `_splatLayer` runt ansiktet (slumpad offset inom r≈120), `bounceIn` på varje. `puff(ctx.fxLayer, 640, 300, {count:12, color:0xffffff})`. Clownen `wiggle()` + en glad studs (`pop(_clown)`).
- Röst: slumpa korta glada fraser via `voice.say(randomFrom(['Plask!','Mums!','Hihi!','Pang!','En till!']))`.
- `_splats++`. När `_splats===1` visas svampknappen (`bounceIn`).

Torka (`_wipe`):
- `audio.sfx('whoosh')`, `voice.say('Nu blir clownen ren igen!')`. Töm `_splatLayer` (kill tweens, destroy children), `_splats=0`, dölj svampknappen, lägg fram ny tårta.

"Fel"/tomt (drag som missar, tap bredvid): `audio.sfx('soft')` (DragController gör detta) + `wiggle(_cake)`. Aldrig buzzer, rött kryss eller tillrättavisning.

Runda klar: efter `THROWS_PER_ROUND` kast -> `ctx.progress.complete()` (delat firande 1-2s + stjärna + klistermärke) + `bigCelebration(ctx.fxLayer, {width:1280,height:720})` + `voice.say(randomFrom(PRAISE))`. Därefter `gsap.delayedCall(1.4, ()=>this._newRound(ctx))`.

## Progression & nivåer
- `THROWS_PER_ROUND = 3 + level` där `level = Math.max(0, ctx.progress.get().highestLevel|0)` (clamp till max ~6 så rundan aldrig blir tjatig).
- Vid runda klar: `ctx.progress.setLevel(level+1)` (höjer highestLevel), `ctx.progress.addStars(1)` sker implicit via `complete()` — använd `complete()` som primär belöning, undvik dubbel-stjärna.
- `ctx.progress.setCustom('tartor', totalThrows)` — räkna totalt antal kastade tårtor (rolig statistik, ingen press).
- Svårighet växer mjukt: fler tårtor per runda och (valfritt) clownen guppar lite snabbare i sidled så drag-läget blir lite mer utmanande för 5-åringar. Aldrig snabbare än lekfullt; tap-läge förblir trivialt.
- Oändlig lek: efter firande startar `_newRound` automatiskt — inget slutläge, ingen game over.

## Tillgångar (programmatiskt)
Emoji (renderas som `Text`, full färg, inga filer):
- 🍰 (tårta på brickan), 🧽 (svampknapp), 😄 (clownens glada mun), 🌟 (progress-prickar), valfritt 🤡 endast som dekor.

Pixi `Graphics`-former:
- Clown: `circle` (huvud, hår, näsa, ögon, pupiller), `roundRect`/`circle` (hatt), `arc`/`roundRect` (mun om ej emoji).
- Tårta: `roundRect` (botten + grädde), `circle` (körsbär).
- Grädde-splat: flera `circle` i vitt (0xffffff) med slumpad radie/offset.
- Bakgrund: `rect` (bg, golv, ridåer).
- Partiklar/konfetti via `feedback.js` (puff/bigCelebration/sparkle).

INGA externa bild- eller ljudfiler. Allt ljud via `ctx.services.audio.sfx(...)`.

## Återanvänd dessa
- `lib/DragController.js` — drag + tap-tap-fallback (addItem/addTarget med stor hitRadius).
- `lib/Button.js` — svampknappen (stor träffyta, studs, inbyggt ljud).
- `lib/feedback.js` — `pop`, `wiggle`, `bounceIn`, `puff`, `sparkle`, `bigCelebration`.
- `lib/swedish.js` — `randomFrom` (fraser), ev. `shuffle`.
- `lib/theme.js` — `COLORS`, `FONT`, `PLAYFUL`, `PRAISE`, `DESIGN_W/H`.
- `ctx.services.audio.sfx` ('tap','pop','pling','whoosh','soft'), `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.fxLayer` — konfetti/puff ovanpå scenen. `gsap` för all animation.

## Edge-cases & städning
- Sätt `this._alive=true` i `init`, `this._alive=false` först i `destroy`. Skydda ALLA `gsap.delayedCall`/onComplete-callbacks med `if(!this._alive) return`.
- `this._resolving`-flagga under tårtans flygning och under firande -> ignorera nya tap/kast så att snabba dubbeltryck inte staplar flera kast eller dubbel-`complete()`.
- Användaren kan avsluta mitt i en flygbåge eller firande: i `destroy` kör `gsap.killTweensOf` på `_cake`, `_clown`, `_splatLayer` och scenen; `this._drag?.destroy()`; töm pågående splats.
- Svampknappen ska tas bort/döljas vid `_newRound` och vid `destroy` (Button kan ha egen cleanup — anropa dess destroy om sådan finns, annars `destroy({children:true})`).
- Undvik att lägga oändligt många grädde-klumpar: cappa `_splatLayer.children` (t.ex. max ~15) eller töm vid varje torka.
- `destroy(ctx)`: `this._alive=false; ctx.ticker.remove(this._tick); this._drag?.destroy(); gsap.killTweensOf(this._root); this._root?.destroy({ children:true })`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/tarta-i-ansiktet/index.js`. Default-exportera GameModule-objektet med metadata enligt tabellen ovan.
2. `init(ctx)`: sätt `this._alive=true`; skapa `this._root=new Container()` och `ctx.stage.addChild(this._root)`; bygg bakgrund + golv + ridåer (dekorlager, `eventMode='none'`, `interactiveChildren=false`).
3. Bygg `_buildClown(ctx)` (Graphics-huvud + emoji-mun) på x=640,y=300; `_splatLayer` ovanpå ansiktet; lägg till i `_root`.
4. Skapa `this._drag = new DragController({ space:this._root, services:ctx.services })`; `addTarget(this._clown, d=>d.kind==='cake', {hitRadius:180})`.
5. Implementera `_spawnCake(ctx)`: bygg tårtan vid (640,620), sätt generös `hitArea`, `bounceIn`; registrera `_drag.addItem(...)` med `onCorrect`/`onWrong`; lägg dessutom `pointertap` på `_clown` som kastar väntande tårta direkt.
6. Implementera `_throw(ctx)` (tap-bana, gsap-båge -> `_splat`) och dela splat-logik via `_splat(ctx)`: grädde-klumpar, `puff`, ljud, röst, `wiggle(_clown)`, `_splats++`, visa svampknapp.
7. Implementera `_wipe(ctx)`: rensa `_splatLayer`, dölj svampknapp, `whoosh`, spawna ny tårta.
8. Räkna kast; vid `THROWS_PER_ROUND` -> `_finishRound(ctx)`: `setLevel`, `complete()`, `bigCelebration`, röst-beröm, `gsap.delayedCall(1.4, _newRound)`.
9. `_newRound(ctx)`: nollställ räknare/splats, beräkna ny `THROWS_PER_ROUND` från level, spawna tårta.
10. Lägg en idle-ticker (`this._tick`) som efter ~6s utan handling kör `voice.say(this.voiceIntro)` + en liten `pop(_cake)` som lockelse; återställ idle vid varje interaktion.
11. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
12. `destroy(ctx)`: enligt städsektionen.
13. Registrera i `src/games/registry.js`: `import tartaIAnsiktet from './tarta-i-ansiktet/index.js'` och lägg `tartaIAnsiktet` i `GAMES`-arrayen.
14. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repris, kast (tap + drag), torka, firande och att progress (highestLevel/tartor) finns kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monterar utan konsolfel (inga uncaught errors/warnings från Pixi/gsap).
- Canvas renderas; clownen och en tårta finns i scenen efter `init`/`mount`.
- Tap på tårtan (eller clownen) utlöser ett kast: efter animationen finns minst ett grädde-objekt i `_splatLayer` (kontrollera via exponerad teststate eller pixeländring/screenshot-diff på ansiktet).
- Drag av tårtan till clownens ansikte resolvar som korrekt (splat läggs till); drag som släpps långt bredvid snäpper tillbaka utan att lägga splat och utan fel i konsolen (mjuk respons).
- Svampknappen dyker upp efter första träffen och tar bort grädden vid tryck (`_splats` -> 0).
- Efter `THROWS_PER_ROUND` kast anropas `ctx.progress.complete()` (firande/konfetti syns; stjärna/klistermärke registreras) och en ny runda startar automatiskt.
- Progress persisterar: `highestLevel` och `custom.tartor` finns i localStorage (`pwagames.save.v1`) efter en runda och överlever sidomladdning.
- Inga felsteg: tomt/missat tryck ger aldrig buzzer/rött kryss; endast `soft`-ljud + vingel.
- Snabba upprepade tap under pågående flygning/firande skapar inte dubbla kast eller dubbel `complete()` (verifiera via `_resolving`-flagga / oförändrat antal kast).
- `destroy()` körs utan fel vid hem-knapp mitt i en animation (inga kvarvarande tickers/tweens som loggar efter unmount).
