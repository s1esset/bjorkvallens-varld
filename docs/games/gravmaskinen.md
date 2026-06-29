# Grävmaskinen (`gravmaskinen`)
> Barnet kör Zackes grävmaskin: drar skopan ner i en stor sandhög så riktig kornig sand rinner ner, svänger över lastbilen och tippar tills flaket är fullt — sanden faller och lägger sig på riktigt, och lastbilen tutar av glädje. Ren skaparglädje utan ett enda sätt att göra fel.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `gravmaskinen` | Grävmaskinen | 🚜 | fysik | drag | [3,5] | `gravmaskinen` | "Hjälp Zacke! Gräv sand och fyll lastbilen!" |

## Mål & mekanik
Zacke kör en grävmaskin. Barnet **drar skopan** (med fingret) ner i en oändlig sandhög för att **gräva** (skopan fylls med sand), svänger sedan över **dumpern** och **släpper** (tippar) så sanden rinner ner i flaket. **Mål:** fyll flaket upp till **fyllnadslinjen** → lastbilen tutar, firande, klistermärke.

Kärnloop:
1. Skopan vilar tom vid sandhögen. Bommen (armen) ritas alltid som en stång från grävmaskinens led till skopan.
2. **Gräv (kontroll 1):** barnet drar skopan ner i sandhögen och sveper. Ju längre/djupare svepet är, desto mer fyller sig skopan (upp till kapacitet **40 korn**). En kort doppning ger lite, ett helt svep fyller den. Skopans sandnivå syns direkt.
3. **Bär & tippa (kontroll 2):** barnet drar den fyllda skopan över flaket och **släpper fingret** → skopan tippar och häller ut sina korn vid skopans mun. Kornen **faller granulärt** och lägger sig i högar i flaket. **Var** du släpper avgör var sanden landar — för långt ut åt sidan och en del **spiller** bredvid (bara roligt, aldrig straff).
4. När den vilande sanden i flaket når fyllnadslinjen tvärs över → **klart**: `audio.sfx('celebrate')` + lastbilstut, `voice.say('Full last! Tuut tuut!')`, `bigCelebration`, `ctx.progress.complete()`. Efter ~1,6s töms flaket och en ny (något större) last börjar — oändlig lek.

Spelet kan **aldrig misslyckas:** sandhögen är oändlig (den är en statisk hög som "aldrig sinar"), spilld sand är bara kul, och en mjuk auto-hjälp (se nedan) garanterar att flaket till slut blir fullt.

## Skärm-layout (1280x720)
GameHost ritar hem-/repetera-knappar i headern — rita INGA egna. Håll spelinnehåll under y≈90. Allt nedan ligger i spelets `_root` (designkoordinater). Bakgrund = `createScene('warm', { ground:true })` som FÖRSTA barn (varm sand-/byggarbetston).

- **Markremsa:** scene-temats `ground` ger en sandfärgad mark; toppen av marken ligger ca y≈624. Allt vilar på marken.
- **Sandhög (oändlig, vänster):** en statisk programmatisk hög-`Graphics` — en mjuk kulle av staplade sandfärgade bågar/triangelform, bas x∈[70,430], topp vid (240, 360). Tre lager i sandtoner `0xe8c98a` (topp), `0xd9b46f`, `0xc89a55` (botten) + en mjuk markskugga (mörk ellips alpha 0.12) under. Eventmode `none`. När man gräver i den spelas en kort "div"-puls (skala-dipp via `pop`/wiggle på högen) men formen återställs — den ser alltid full ut.
- **Grävmaskin (mitten-vänster):** 🚜 (Text, fontSize 120) vid (430, 560) som maskinkropp; ovanpå en liten hytt-`roundRect` (gul `COLORS.yellow`, stroke `COLORS.orangeDark`) med **förar-Zacke** 🧒 (Text fontSize 52) vid ca (430, 512). **Bom-led (pivot):** punkt vid (480, 458).
- **Bommen (armen):** ett dedikerat `Graphics` (`this._boom`) som varje frame ritas som en tjock stång från pivot (480,458) till skopans fäste (`width:26`, `cap:'round'`, fyll `COLORS.brown` med en ljusare mittlinje). Den "stretchar/roterar" fritt mot skopan — ingen exakt kinematik (inget toddler-svårt).
- **Skopan (dra-objektet):** en programmatisk skopa (`this._bucket`, Container) ~110×92px: en U-formad/kvartscirkel-`Graphics` i metallgrått (`0xb8c0c8`, stroke `0x8a939b`) med synlig **sandfyllnad** inuti (en sandfärgad fyllnad vars höjd = `count/40`). Osynlig hit-halo: `hitArea = new Circle(0,0, 78)` (≥96px träffyta). Startläge vid sandhögens kant ca (300, 470).
- **Dumpern (höger):** 🚛 (Text fontSize 130) vid (905, 558). Ovanpå ett **öppet flak**: en `roundRect`-låda utan topp, väggar i `COLORS.brown`/stroke `0x6b4326`. Flakets **inre** (där sand samlas): x∈[720, 1010], golv vid y≈500, väggtopp vid y≈360. **Fyllnadslinje:** en streckad gul linje (`COLORS.yellow`, alpha 0.8) tvärs flaket vid y≈384 med en liten 🎯/⬆️-markör i kanten.
- **Sand-grafik (aktiv kornsimulering):** ett dedikerat `Graphics` (`this._sandGfx`) som ligger ÖVER flaket men UNDER skopan; här renderas alla rörliga/vilande korn (se Fysik). Eventmode `none`.

Marginaler: skopans träffyta ≥96px överallt; fri väg mellan hög och flak så ett rakt svep alltid funkar.

## Interaktion
Bara **drag** (med tap-tap-fallback). Egen pointer-logik på skopan (DragController behövs inte — vi vill ha "scoopa medan du drar" + "tippa vid släpp", inte snäpp).

- `this._bucket.eventMode = 'static'`, `cursor = 'pointer'`, `hitArea = new Circle(0,0,78)`.
- **`pointerdown` på skopan:** `this._dragging = true`, spara grepp-offset (`_root.toLocal(e.global)` minus skopans pos), `pop(bucket)` + `audio.sfx('tap')`, nollställ `this._idle`.
- **`globalpointermove`** (lyssnare läggs på skopan/`_root` vid down): om `_dragging`, flytta skopan mot fingret (`_root.toLocal(e.global)` − offset), klampad inom spelytan (y≥130, inom väggar). Rita om bommen mot nya läget. **Medan skopans mun överlappar sandhögens yta** → "gräv": öka `this._bucketCount` (upp till 40) proportionellt mot svepets längd i högen (t.ex. +1 per ~8px rört avstånd inne i högen), spela en kornig `audio.sfx('soft')` (throttlad var ~140ms) + liten `puff(ctx.fxLayer, mun.x, mun.y, {count:3, color:0xd9b46f})`, uppdatera skopans sandfyllnad.
- **`pointerup` / `pointerupoutside`:** `this._dragging = false`. Om skopan har sand (`_bucketCount>0`) → **tippa**: animera skopans lutning (`gsap` rotation fram/tillbaka), `audio.sfx('whoosh')`, och **spawna `_bucketCount` korn** i kornsimuleringen vid skopans mun-position (sprid över 2–3 celler). Nollställ `_bucketCount` och skopans fyllnad. Kornen faller sedan av sig själva (se Fysik).
- **Tap-tap-fallback (för de minsta):** ett kort tap (gest <14px) på skopan medan den är vid högen → fyll skopan automatiskt halvvägs (`_bucketCount=24`) + puls; nästa tap var som helst över flaket → flytta skopan dit (gsap) och tippa automatiskt. Så barnet kan **tappa hög → tappa flak** utan att kunna dra.
- **`_resolving`-skydd:** när flaket når linjen sätts `this._resolving = true`; pointer-callbacks returnerar tidigt tills nästa last byggs (inget dubbelfirande).

## Fysik & kalibrering
Sanden är en **egen cellulär "falling-sand"-simulering** (granulärt, ej matter.js — billigare och pålitligare för många korn på surfplatta). Endast **aktiva/rörliga + vilande korn** simuleras; den oändliga sandhögen är en statisk ritning (gräv = spawna korn i skopan, inte flytta tusentals celler).

**Rutnät:** cellstorlek `CELL = 10`. Simzonen täcker x∈[600,1120] (52 kolumner) och y∈[200,540] (34 rader) — alltså flaket + marginal för spill. `grid` = `Int8Array(cols*rows)`: `0`=tom, `>0`=sandfärg-index (1–3), och en `WALL`-flagga (t.ex. `9`) för flakets väggar/golv så korn stannar inne:
- Vänstervägg: celler vid x≈715, rader y 360→500 = `WALL`.
- Högervägg: celler vid x≈1010, rader y 360→500 = `WALL`.
- Golv: celler vid y 500→510 över x 715→1010 = `WALL`.

**Integration (per sim-steg, ticker-driven):** ackumulera `ctx.ticker.deltaMS`; kör ett steg var `STEP_MS = 28` (≈36 steg/s → ~360 px/s fall, lugnt och tydligt). Per steg, iterera rader **nerifrån och upp**, för varje sandcell:
1. om cellen rakt under är tom → flytta korn ner ett steg;
2. annars, i slumpad L/R-ordning, om under-vänster ELLER under-höger är tom → flytta dit (diagonalt → bildar naturliga högar/rasvinkel);
3. annars vila (ligg kvar). `WALL`-celler blockerar både ner och diagonalt → sand staplas inne i flaket och rasar inte ut.
Korn som når simzonens **nedre kant utanför flaket** (spill) tas bort och ger en liten `puff` + `floatText(ctx.fxLayer, x, 600, '😄')` (mark-plask), så de inte ackumuleras för evigt.

**Spawn vid tippning:** lägg `_bucketCount` korn i tomma celler runt skopans mun (kolumn = `round((mun.x−600)/10)`), staplade uppåt om munnen är låg. Korn med slumpad färg-index 1–3.

**Rendering (exit-säker):** varje tick `this._sandGfx.clear()`, loopa sandceller och rita `rect(col*CELL+600, row*CELL+200, CELL, CELL).fill(SAND[idx])` (`SAND=[,0xe8c98a,0xd9b46f,0xc89a55]`). Aldrig GSAP på rutnätet/`_sandGfx` — bara ticker + en Graphics som förstörs med `_root`. (Antal korn är litet, ~60–220 per last, så en `clear+rect`-omritning per frame är billig.)

**Fyllnadsmått:** räkna vilande sandceller inuti flaket vars rad ligger på/ovanför fyllnadslinjen (`y ≤ 384`) ELLER totalt antal sandceller i flaket ≥ `this._target` (level-beroende). När villkoret håller i ~0,3s (stabilt, inte mitt i ett ras) → `_onFull`.

(Ingen `AimLauncher`/`predictTrajectory` används här, så ingen pricklinje-kalibrering behövs — kornen integreras direkt i rutnätet.)

## Återkoppling & belöning
Varje pekning/handling <100ms:
- Greppa skopan: `audio.sfx('tap')` + `pop(bucket)`.
- Gräva: throttlad `audio.sfx('soft')` + sandkorns-`puff` vid munnen + skopans fyllnad stiger synligt + en mjuk hög-puls.
- Tippa/släpp: `audio.sfx('whoosh')` + skop-tippanimation; kornen rasar ner med ett mjukt sand-sus.
- Korn landar i flaket: enstaka `audio.sfx('tap')` (throttlad ~200ms) när nya korn vilar.
- **Spill (bredvid flaket):** `audio.sfx('soft')` + `floatText(ctx.fxLayer, x, y, '😄')` + liten `puff`. ALDRIG buzzer/rött. Spill är roligt — "gräv mer!".
- **Flaket fullt:** `this._resolving=true`; `audio.sfx('correct')` direkt → `audio.sfx('celebrate')`, lastbilen guppar/tutar (gsap-hopp på 🚛 + `voice.say('Full last! Tuut tuut!')`), `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, flak.x, 360)`, sedan `ctx.progress.complete()`.
- **Idle-recue (~6s utan handling):** `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + `wiggle(bucket)`/`breathe` på skopan + en pil-puls mot sandhögen.

Använda sfx: `tap, soft, whoosh, correct, celebrate`. Röst: voiceIntro samt 'Full last! Tuut tuut!', 'Gräv mer sand!'.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- Svårighet = **flakets storlek + sandmängd som krävs** (`this._target`):
  - **Nivå 0–1:** smalt flak (x 740→990), `target ≈ 60` korn, fyllnadslinje lågt.
  - **Nivå 2–3:** bredare flak (x 720→1010), `target ≈ 90`.
  - **Nivå 4–5:** högt flak, `target ≈ 130`, linjen högre.
  - **Nivå 6+:** stort flak, `target ≈ 180+`, mönstren upprepas med liten jitter (`randomFrom`/Math.random ±). Aldrig orimligt — auto-hjälp garanterar full last.
- Efter `complete()`: `ctx.progress.setLevel(this._level+1)`, `setCustom('lastbilar', n+1)` (räknar fyllda lastbilar, oändligt). Vänta ~1,6s → `_loadLevel(ctx, ++this._level)`: töm flaket (nollställ grid-sandceller), bygg ev. bredare väggar, återställ skopan. Inga sjunkande värden, ingen synlig poäng.
- **Auto-hjälp (no-fail-garanti):** spåra antal tippningar. Om flaket inte är fullt efter ~4 tippningar ELLER ~12s utan framsteg → en mjuk "vindpust": en `floatText('💨')` + spilld/lös sand intill flaket sopas in (flytta några korn-celler in i flaket) tills `target` nås och firandet sker ändå. Barnet lyckas alltid.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `createScene`. Inga externa bild-/ljud-/fontfiler.
- Emoji: 🚜 (grävmaskin), 🧒 (förar-Zacke), 🚛 (dumper), 💨/😄/🎯 (hjälp/spill/markör), valfri 🌟 i firandet.
- Graphics: sandhög (staplade bågar i sandtoner + markskugga), hytt-`roundRect`, bommen (tjock stång, redras varje frame), skopan (U-form metallgrå + sandfyllnad), flakets öppna låda (`roundRect`-väggar), streckad fyllnadslinje, och **kornsimuleringens `_sandGfx`** (en `rect` per sandcell).
- Färger ur `theme.js`: `COLORS.yellow/orangeDark/brown`, sandtoner `0xe8c98a/0xd9b46f/0xc89a55`, metall `0xb8c0c8`. Firande via `feedback.js` (`bigCelebration/burst/puff`).

## Återanvänd dessa
- `lib/scene.js`: `createScene('warm', { ground:true })` (FÖRSTA barn).
- `lib/feedback.js`: `pop`, `wiggle`, `breathe`, `puff`, `burst`, `floatText`, `bigCelebration`.
- `lib/theme.js`: `COLORS`, `FONT`, `PLAYFUL`, `PRAISE`, `DESIGN_W`, `DESIGN_H`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (sandfärg-/jitterval).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (sim-loop + idle-timer), `ctx.fxLayer` (firande/spill), `gsap` (skop-/bom-/lastbils-animationer — ALDRIG på kornrutnätet).
- INTE `physics.js`/`launcher.js` (egen cellulär sand passar bättre); INTE `DragController` (egen "gräv-medan-du-drar"-logik).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/auto-hjälp-callbacks och sim-loopen tidig-returnerar om `!this._alive`.
- `this._resolving = true` när flaket blir fullt → alla pointer-/tap-callbacks och tippning ignoreras tills nästa last laddas (förhindrar dubbla `complete()`).
- Klampa skopan inom spelytan så bommen aldrig pekar bisarrt och munnen aldrig hamnar utanför simzonen vid tippning.
- Begränsa korn-spawn så grid aldrig spillar utanför arrayen (klampa kolumn/rad); ta bort korn som faller under simzonen.
- Throttla gräv-/landnings-ljud (var ~140–200ms) så snabba rörelser inte spammar audio.
- Auto-hjälp-/idle-timer nollställs vid varje pointerdown/move så hjälpen aldrig stör mitt i en handling.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; avregistrera skopans pointer-lyssnare; `gsap.killTweensOf(this._bucket)`, `killTweensOf(this._boom)`, `killTweensOf` på 🚛/hög/skop-rotation; `this._root?.destroy({children:true})`. Inga kvarvarande tweens/timers efter exit.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/gravmaskinen/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `createScene`, feedback-hjälpare, `COLORS, FONT, DESIGN_W, DESIGN_H` från theme, `randomFrom` från swedish.
2. Default-exportera GameModule-objektet med metadatan ovan.
3. `init(ctx)`: `this._alive=true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('warm',{ground:true})` FÖRST. Bygg sandhög, grävmaskin+hytt+Zacke, dumper+flak+fyllnadslinje. Lägg lager: hög → `_sandGfx` → `_boom` → dumper → skopa. Initiera `grid`/`Int8Array`, sätt `WALL`-celler för flakets väggar/golv. Läs `_level`, `_loadLevel(ctx, _level)` (sätter `_target`, väggbredd, tömmer grid).
4. Bygg `_makeBucket()` (skopa-Container + hitArea Circle r=78) och koppla `pointerdown`/`globalpointermove`/`pointerup(outside)` enligt Interaktion (gräv-medan-drag + tippa-vid-släpp + tap-tap-fallback).
5. Skriv kornsimuleringen: `_simStep()` (cellulär falling-sand, nerifrån-upp, ner/diagonal), `_spawnGrains(munX, munY, n)`, `_renderSand()` (`_sandGfx.clear()` + en `rect` per cell), `_countFill()`.
6. Lägg loop: `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: ackumulera deltaMS → kör `_simStep` var 28ms, kör `_renderSand`, rita om `_boom`, kolla `_countFill() ≥ _target` (stabilt) → `_onFull`, samt idle-/auto-hjälp-timers (allt bakom `if(!this._alive||this._resolving) return` där relevant).
7. `_onFull(ctx)`: `_resolving=true`, ljud+tut+voice, `bigCelebration`/`burst`, `ctx.progress.setLevel(_level+1)`, `setCustom('lastbilar', …)`, `ctx.progress.complete()`, `gsap.delayedCall(1.6, ()=> this._alive && this._loadLevel(ctx, ++this._level))`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `destroy(ctx)`: enligt "Edge-cases & städning".
10. Registrera i `src/games/registry.js`: `import gravmaskinen from './gravmaskinen/index.js'` + lägg `gravmaskinen` i `GAMES`.
11. `npm run dev`, öppna biblioteket, spela: verifiera gräv-vid-drag, tippning, att sanden faller/lägger sig granulärt, spill-roligt, fullt-flak-firande + tut, tap-tap-fallback, auto-hjälp, hem-knapp, röst-repris och att `highestLevel`/`lastbilar` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera bibliotek → "Grävmaskinen"). Canvas finns; inga uncaught errors/warnings i `browser_console_messages`.
- Vid mount är `voiceIntro` satt/spelas ("Hjälp Zacke! Gräv sand och fyll lastbilen!").
- Gräv-vid-drag: en pointer down→move som drar skopan genom sandhögen ökar skopans `_bucketCount` (verifierbart via exponerad teststate `window.__barnspel`/`_bucketCount` eller skopans synliga fyllnad).
- Tippning: släpp över flaket spawnar korn i `_sandGfx`/`grid` och kornantalet i flaket ökar; kornen rör sig nedåt mellan frames (granulär fall verifieras via state eller pixel/snapshot-skillnad).
- Sanden lägger sig: korn staplas inne i flakets väggar och rinner inte ut genom golv/väggar (grid-`WALL` håller).
- Spill ger mjuk respons (`soft`/`floatText`) och INGEN buzzer, INGET felmeddelande, ingen poängsänkning.
- När flaket når `_target`/fyllnadslinjen körs firande + lastbilstut och `ctx.progress.complete()` anropas exakt EN gång (inget dubbelfirande via `_resolving`).
- Auto-hjälp: även med dåliga/spillande tippningar blir flaket till slut fullt och rundan firas — aldrig en fail-state.
- Tap-tap-fallback: tap på skopa vid hög + tap över flak fyller och tippar utan drag.
- Progress sparas: efter en avklarad last är `highestLevel` ökat och `custom.lastbilar` finns kvar i localStorage (`pwagames.save.v1`) efter omladdning.
- Städning: vid hem-knappen tas `_tick` bort och inga tweens/timers fortsätter logga/kasta fel.
