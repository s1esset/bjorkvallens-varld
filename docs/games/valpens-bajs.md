# Valpens Bajs (`valpens-bajs`)
> Lovas lilla valp tassar runt i parken och lämnar små bajshögar — barnet styr vart valpen går och skyfflar upp bajset i tunnan medan glada flugor surrar runt. Ren mys, inga misslyckanden: bajset ligger snällt kvar tills man tar det, och tunnan fylls alltid till slut.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `valpens-bajs` | Valpens Bajs | 🐶 | motorik | mixed | [2,4] | `valpens-bajs` | "Tryck dit valpen ska gå — och skyffla bajset i tunnan!" |

> Notera: PLAN-2 listar `input: tap`, men spelet har TVÅ kontroller (tapp-för-att-gå + skyffel-drag), så `input: 'mixed'` är ärligare. Behåll `category: 'motorik'` och `icon: '🐶'` enligt PLAN-2.

## Mål & mekanik
Barnet hjälper **Lovas valp** att hålla parken ren. Två tydliga kontroller styr utfallet:

1. **Vägval (tap-to-walk):** tryck var som helst på gräset → valpen tassar dit med en mjuk vagg-tween. Ibland sätter den sig och **bajsar** (plopp-SFX + en liten hög lämnas kvar där den satt). Vart du går valpen bestämmer alltså VAR bajset hamnar.
2. **Skyffeln (bajstången):** dra bajstången (pooper-scooper) så dess skopa hamnar över en bajshög → högen fastnar i skopan; dra skopan till **tunnan** och släpp/passera → bajset åker i tunnan och **mätaren fyller på**. Tap-fallback: tappa en bajshög direkt → skyffeln flyger dit och skyfflar upp den själv.

**Kärnloop:** valpen vandrar och bajsar → flugor 🪰 börjar surra runt gammalt bajs (bara roligt, ALDRIG straff) → barnet skyfflar bajset till tunnan → tunnans mätare fylls. När mätaren är full (parken ren) → firande + `ctx.progress.complete()` → ny, lite livligare runda.

**Mål per runda:** deponera `needed = 3 + level` bajshögar i tunnan (mätaren full).

**No-fail (obligatoriskt):**
- En missad skyffel (skopan nuddar inte högen) → mjukt `soft`-ljud + liten `floatText('Hihi!')`/fniss; bajset ligger kvar tills barnet tar det. Inga timers som straffar, ingen "smutsig park = förlust".
- Flugorna är rent dekorativa. Fler flugor = bara mer komiskt, aldrig poängavdrag.
- **Mjuk auto-hjälp** (se Progression/Idle) garanterar att tunnan alltid blir full: efter idle pekar en hint mot närmaste hög, och vid lång idle skyfflar valpens kompis (skopan) automatiskt en hög till tunnan.

## Skärm-layout (1280x720)
GameHost ritar header (hem-/repetera-knapp) överst — rita INGA egna. Allt spelinnehåll ligger i `this._root` (designkoordinater), under y≈90.

- **Bakgrund:** `createScene('meadow', { width: 1280, height: 720 })` som FÖRSTA barn i `_root` (gradient-himmel, sol, moln, grön markremsa). `eventMode='none'`.
- **Parkdekor (dekorativ, `eventMode='none'`):** ett träd 🌳 (Text fontSize 110) uppe till vänster vid (180,210); en blomsterrad 🌷🌼 längs nederkanten; en grusgång (`roundRect` ljusbeige `0xe9dcc0` alpha 0.7) som en mjuk slinga mitt på planen. Endast pynt — ingen interaktion.
- **Gångyta (logisk):** valpen får gå inom rektangeln x ∈ [120, 1080], y ∈ [300, 650]. Tunnan + skyffel-vilan ligger i högra/nedre kanten.
- **Mark-hitArea (gå-yta):** en osynlig `Graphics`-rektangel (eller `hitArea`) som täcker hela planen 0,90 → 1280,720, `eventMode='static'`, längst NER i lager-ordningen (ovanpå scenen men under valp/bajs/skyffel). Tap här = "gå dit".
- **Valpen** (programmatisk Graphics-container, se Tillgångar): start mitt på planen (640, 460). Bredd ≈ 130px. Valpen är INTE tap-mål (gå-ytan ligger under den och fångar tappet bakom valpen); den kan dock pulsa/skälla som svar.
- **Bajshögar** (dynamiska): glänsande brun "mjukglass-swirl" (3 staplade `ellipse`/`circle` i `COLORS.brown` 0x8a5a3b med en ljus glansprick), radie ≈ 26px. Varje hög är en `Container`, `eventMode='static'`, osynlig `hitArea = new Circle(0,0,60)` (≥96px träffyta för tap-fallback). Max 5 högar samtidigt på planen (lugnt, ej rörigt).
- **Tunnan (mål):** nedre högra hörnet vid (1140, 540). Programmatisk soptunna: `roundRect(-70,-90,140,170,22).fill(COLORS.green).stroke({width:8,color:COLORS.greenDark})` + ett lock-streck + emoji-etikett ♻️/🗑️ (Text). **Insläppszon = cirkel radie 120** runt tunnans överkant (1140, 470). En subtil gul glödring (`circle r=120 .stroke({width:6,color:COLORS.yellow, alpha:0.5})`) markerar zonen.
- **Mätare (renhet/fyllnad):** en stående glasrör-mätare till höger om tunnan vid (1230, 470), `roundRect(-22,-150,44,300,22)` med ljus fyllnad `COLORS.yellow` vars höjd = `collected/needed`. Ovanpå små 💩→⭐-slots (en rad prickar som tänds per deponerad hög) som tydlig, läs-fri progress.
- **Skyffeln (bajstången):** vilo-läge nere till vänster (200, 650). Container med ett snett handtag (`roundRect` brunt) som lutar nedåt-höger och en öppen skopa/kratta i toppen; **skopans tip = containerns origin (0,0)** så att den punkt barnet drar = den punkt som skyfflar. Osynlig `hitArea = new Circle(0,0,90)` runt greppet (≥96px). Vid bärning sitter den buren bajshögen fäst vid skopans tip.

Marginaler: ≥24px mellan tunna, mätare och skärmkant; högar genereras med ≥40px från tunnan så det alltid går att skopa upp dem.

## Interaktion
Spelet har **två kontroller** (mer än "tryck & titta"): styr valpens väg + skyffla i rätt läge/tajming.

### A) Vägval — tap-to-walk
- Mark-hitArea lyssnar `pointertap` → `p = _root.toLocal(e.global)`; klampa `p` till gångytan [120,1080]×[300,650]; kör `_walkTo(p)`.
- `_walkTo(target)`: `audio.sfx('tap')` direkt (<100ms), vänd valpen åt rätt håll (`body.scale.x = dir`), tweena `valp.position` med `gsap.to` i fart ≈ **280 px/s** (`duration = dist/280`, ease `'sine.inOut'`), lägg en liten vagg-bob på benen/kroppen (separat repeterande `gsap` på en barn-container, ±6px y). Spara `this._walkTween`.
- **Vid framkomst:** ev. bajsa. Om `poops.length < cap` OCH `now - this._lastPoop > 2.5s` OCH `Math.random() < 0.55` → `_poop()`. Annars en glad svans-vift (`pop` på svansen).
- `_poop()`: kort hukande-anim (skala kroppen ned/bak ~0.6s, valpen "sätter sig"), `audio.sfx('soft')` följt av `audio.sfx('pop')` som "plopp", spawna en bajshög ~30px BAKOM valpen (`bounceIn`), `floatText(fxLayer, valp.x, valp.y-90, '💨')`, sätt `this._lastPoop = now`.

### B) Skyffeln — drag (med tap-fallback)
Egen pekar-logik (skyffeln är ett bestående verktyg, inte ett DragController-item→mål). Snäll-principerna från `DragController` återanvänds i anda (stora ytor, mjuk respons).
- `pointerdown` på skyffeln: `this._scooping = true`, lyft-skala 1.08, `audio.sfx('tap')`, registrera `globalpointermove`.
- `globalpointermove` (vid scooping): sätt `skyffel.position = _root.toLocal(e.global)` (klampad till planen). Skopans tip = skyffel-positionen.
  - **Plocka upp:** om INTE bär hög → hitta närmaste oupphämtade bajshög inom **70px** av tipen → fäst den (`_carry = hög`; högen flyttar till skyffeln som barn, eller följ tipen varje frame), `audio.sfx('pop')`, flugorna runt den skingras med `puff`/liten `floatText('🪰')`.
  - **Släpp i tunnan:** om bär hög OCH tipen är inom insläppszonen (dist till (1140,470) < 120) → `_deposit()`.
- `pointerup`/`pointerupoutside`: `this._scooping = false`, återställ skala; om bär hög men ej över tunnan → högen "tappas" mjukt tillbaka på marken vid tipen (`bounceIn`, `audio.sfx('soft')`, liten `floatText('Hihi!')`) — aldrig straff; skyffeln vaggar (`wiggle`) tillbaka mot vilo-läget (`gsap.to` hem).
- **Tap-fallback (för de minsta):** varje bajshög har `pointertap` → om skyffeln inte redan bär: skyffeln tweenar (`gsap.to`, ~0.4s) till högen, "scoopar" upp den, tweenar vidare till tunnan och kör `_deposit()`. Helt utan drag-skicklighet. (Tappar man en hög MEDAN skyffeln bär en annan → liten `wiggle` på högen, ingen åtgärd.)

### `_deposit()`
- `this._carry` förstörs/animeras in i tunnan (skala→0 över tunnans mun, `gsap` på en `{}`-proxy om objektet kan hinna destrueras — annars `floatText(fxLayer, 1140, 470, '💩')` som faller in).
- `collected++`; uppdatera mätarens fyllnad (`gsap.to` på fyllnadshöjd) + tänd nästa slot-prick (`pop`).
- `audio.sfx('whoosh')` + `audio.sfx('correct')`, `sparkle(fxLayer, 1140, 470)`, `voice` tyst (spara prat till firandet).
- `this._carry = null`. Om `collected >= needed` → `_finish()`.

## Återkoppling & belöning
Varje pekning → ljud+bild <100ms, ENDAST positivt.
- Tap på gräs: `audio.sfx('tap')` + valpen börjar genast gå.
- Valpen bajsar: `soft`+`pop` ("plopp") + `bounceIn` på högen + `💨`-floatText.
- Skopa griper hög: `pop` + flugorna skingras (`puff`).
- Deposit: `whoosh`+`correct` + `sparkle` + mätaren stiger + slot-prick `pop`.
- Missad skyffel / tappad hög: `soft` + `floatText('Hihi!')`/`wiggle`. ALDRIG buzzer, rött kryss eller omstart.
- Flugor (🪰): 1–2 st börjar cirkla en hög efter ~4s (ticker-driven orbit, se Tillgångar). Rent komiskt. När högen tas → de pyser bort med `puff`.
- **Runda klar (`_finish`):** `this._resolving = true`; `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))` (t.ex. "Hurra! Parken är ren!"), `bigCelebration(ctx.fxLayer, {width:1280,height:720})`, valpen skuttar glatt (`pop`/liten hopp-tween), tunnan vickar (`wiggle`). Sedan `ctx.progress.complete()`.
- Idle-recue (~6s utan interaktion): `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + om högar finns: `breathe`/`wiggle` på skyffeln + en prickad hint-pil (serie små cirklar) från skyffeln mot närmaste hög; om INGA högar finns: valpen vandrar själv till en slumppunkt och bajsar (ger material).

Använda sfx: `tap, soft, pop, whoosh, correct, celebrate`. Voice: `voiceIntro`, `randomFrom(PRAISE)`, valfritt "Skyffla bajset i tunnan!".

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- `needed = 3 + this._level` bajshögar per runda (mätaren full = klart).
- Stigande livlighet (oändlig, cyklisk lek):
  - **Nivå 0–1:** valpen bajsar lugnt, `cap = 3` högar samtidigt, gångfart 260 px/s. Lär ut gå + skyffla.
  - **Nivå 2–3:** `needed` växer, bajs-sannolikhet vid framkomst högre, `cap = 4`, fart 300.
  - **Nivå 4+:** `cap = 5`, snabbare auto-vandring mellan bajsningar, fart 330. Därefter upprepas/varieras med `randomFrom`-jitter på dekor/startpunkter.
- Efter `_finish()`: `ctx.progress.setLevel(this._level + 1)`, ev. `ctx.progress.setCustom('hogar', totalCollected)` (frivillig, stigande räknare — inga sjunkande värden, ingen synlig poäng). Vänta ~1.6s (`gsap.delayedCall`) → `_resetRound()` (töm högar/flugor, nollställ `collected`, mätaren tillbaka, valpen till mitten, `_resolving=false`, höj `_level` internt). Loopar oändligt.
- Ingen fail-state, ingen timer som straffar.

## Tillgångar (programmatiskt)
Endast emoji (renderas som `Text`) + Pixi `Graphics`. Inga externa fil-/ljud-tillgångar.
- **Valpen (Graphics-container):** kropp = ljusbrun `ellipse` (~0xc9a06a) + glansprick; huvud = cirkel; två hängande öron (`ellipse`, mörkare brun); svans (liten `roundRect`/ellipse, egen barn-container för vift-tween); ben = fyra små `roundRect`; ögon = vita cirklar + svarta pupiller; nos = mörk cirkel `COLORS.ink`; ev. en glad `floatText('Voff!')` vid skäll. Mjuk markskugga = halvtransparent svart `ellipse` under valpen (ingen filter/blur).
- **Bajshög:** 2–3 staplade bruna `circle`/`ellipse` (`COLORS.brown`) avsmalnande uppåt (swirl) + en liten ljus glans-`circle` (vit alpha 0.4). Markskugga-ellips under.
- **Tunnan:** `roundRect` grön kropp + lock-streck + `stroke` mörkgrön + ♻️/🗑️ emoji-etikett. Gul glödring för insläppszonen (`circle .stroke`).
- **Mätare:** glasrör `roundRect` (ljus, alpha) + gul fyllnad `roundRect` (höjd ∝ `collected/needed`) + rad av slot-prickar (`circle`, släckt→tänd).
- **Skyffeln:** brunt handtag `roundRect` (lutat) + öppen skopa (halvcirkel/`arc` eller `roundRect`-ram) i toppen + ljus metallglans. Origin vid skopans tip.
- **Flugor (🪰):** emoji-Text fontSize 28, `eventMode='none'`. Decorativ orbit i ticker: per fluga `angle += speed*dt`, position = `pile.x + Math.cos(angle)*R`, `pile.y + Math.sin(angle)*R*0.6` (R≈40). Ingen GSAP på fluge-objektet — flyttas direkt i `_update` (exit-säkert; förstörs i `destroy`/när högen tas). 1–2 flugor per "gammal" hög, max för stämning.
- Firande/juice via `lib/feedback.js` (`bounceIn, pop, wiggle, puff, sparkle, floatText, bigCelebration, breathe`).

## Återanvänd dessa
- `lib/scene.js` — `createScene('meadow', {...})` som första barn.
- `lib/feedback.js` — `bounceIn, pop, wiggle, puff, sparkle, floatText, bigCelebration, breathe` (alla exit-säkra).
- `lib/theme.js` — `COLORS` (brown/green/greenDark/yellow/ink), `PLAYFUL`, `PRAISE`, `FONT`, `DESIGN_W/H`.
- `lib/swedish.js` — `randomFrom`, `shuffle` (slumpa dekor/startpunkter/beröm).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get, setLevel, complete, setCustom`.
- `ctx.ticker` (idle-timer + flug-orbit + vandring; läs `deltaMS`), `ctx.fxLayer` (firande/floatText), `gsap` (gång-/skyffel-tweens).
- `pixi.js`: `Container, Graphics, Text, Circle`.
- INTE `DragController` direkt (skyffeln är ett bestående verktyg; egen pekar-logik passar bättre — men följ samma snäll-principer).
- Ingen fysikmotor behövs (ingen `physics.js`/`launcher.js`).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/`_update`-callbacks tidig-returnerar om `!this._alive`.
- `this._resolving = true` vid `_finish()`: alla pekar-callbacks (gå, scoop, tap-fallback) och deposit returnerar tidigt tills `_resetRound()` → ingen dubbel `complete()` vid snabba tryck.
- Skydda hög mot dubbel-upphämtning (`if (pile._taken) return; pile._taken = true`). En hög kan bara bäras av en skopa.
- Begränsa `cap` högar; om `cap` nått hoppar `_poop` över (valpen vandrar utan att bajsa) → planen blir aldrig överfull.
- Idle-timer nollställs vid VARJE interaktion (tap, drag, scoop). Auto-vandring/auto-skyffel kollar `!_resolving && _alive`.
- Flugor: flyttas direkt i ticker (ingen GSAP på dem); när deras hög tas → `puff` + `fluga.destroy()`; spara flug-referenser per hög för städning.
- Exit-säkra partiklar: använd ENBART `feedback.js`-hjälparna (puff/sparkle/floatText/bigCelebration) eller `{}`-proxy-mönstret för bajs-som-faller-i-tunnan; ALDRIG `gsap.to(pixiObj,...)` på något som kan destrueras av sin egen `onComplete` eller av spel-exit.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; avregistrera mark-hitArea- och skyffel-lyssnare (`pointerdown/globalpointermove/pointerup/pointerupoutside`); `gsap.killTweensOf` för valp, skyffel, `_carry`, högar, mätar-fyllnad, svans/vagg-bob; döda `breathe`/idle-tweens; `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/valpens-bajs/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `createScene`, feedback-hjälpare, `COLORS, FONT, PRAISE` från theme, `randomFrom` från swedish.
2. `export default { id:'valpens-bajs', titleSv:'Valpens Bajs', icon:'🐶', category:'motorik', input:'mixed', ageRange:[2,4], bundle:'valpens-bajs', voiceIntro:'Tryck dit valpen ska gå — och skyffla bajset i tunnan!', ... }`.
3. `init(ctx)`: `this._alive=true; this._resolving=false; this._carry=null; this._poops=[]; this._collected=0; this._lastPoop=0; this._idle=0`. Skapa `this._root=new Container()`, `ctx.stage.addChild(this._root)`. Lager: `createScene('meadow')` → parkdekor → mark-hitArea (gå-yta) → bajs-lager (`_poopLayer`) → valp → tunna+mätare → skyffel. Läs `this._level` ur `ctx.progress.get().highestLevel`. Bygg valp (`_makeDog`), tunna+mätare, skyffel (`_makeScooper`). Koppla mark-hitArea `pointertap` → `_walkTo`. Koppla skyffel-pekarlogik. Anropa `_resetRound()` (sätt `needed`, töm högar, mätare 0).
4. Skriv `_walkTo(p)`, `_poop()`, `_makeDog()` (vagg-bob + svans-vift), `_makeScooper()` (drag + lyft).
5. Skriv `_spawnPoop(x,y)` (`bounceIn`, `hitArea` Circle r=60, `pointertap` tap-fallback, schemalägg flugor efter ~4s), `_pickUp(pile)`, `_deposit()`, `_finish()` (firande + `progress.complete()` + `setLevel` + `gsap.delayedCall(1.6, ()=> this._alive && this._resetRound())`).
6. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
7. Lägg ticker: `this._tick=(t)=>this._update(ctx,t)`, `ctx.ticker.add(this._tick)`. I `_update`: flug-orbit, idle-timer (+auto-hjälp), periodisk auto-vandring om `_poops.length<2`. Allt bakom `if(!this._alive||this._resolving) return` där relevant.
8. `destroy(ctx)`: enligt "Edge-cases & städning".
9. Registrera i `src/games/registry.js`: `import valpensBajs from './valpens-bajs/index.js'` och lägg `valpensBajs` i `GAMES`-arrayen.
10. `npm run build` MÅSTE passera (0 fel). Sedan `node scripts/test-game.mjs valpens-bajs --drag ...` mot dev-servern: 0 konsolfel + skärmdump + exit-cykel.
11. `npm run dev`, öppna biblioteket, spela: verifiera tap-to-walk, valpen bajsar, skyffel-drag OCH tap-fallback fyller tunnan, flugor surrar (utan straff), firande vid full mätare, hem-knapp, röst-repris, och att `highestLevel` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera bibliotek → "Valpens Bajs"; canvas finns; inga uncaught errors i `browser_console_messages`).
- Vid mount är `voiceIntro` satt/ röst spelas ("Tryck dit valpen ska gå — och skyffla bajset i tunnan!").
- Tap-to-walk: en `pointertap` på gräset flyttar valpen mot punkten (valpens x/y ändras; verifierbart via exponerat teststate eller pixel/snapshot-skillnad).
- Valpen producerar bajshögar (efter gång/auto-vandring ökar antalet högar i `_poops` / syns på skärmen).
- Skyffeln samlar: drag (eller pointer down→move→up) av skyffeln från en hög till tunnans zon ökar `collected` och mätarens fyllnad; tap-fallback (tap på en hög) skyfflar upp den utan drag.
- Missad skyffel ger mjuk respons (`soft`/`Hihi!`/`wiggle`) och INGEN omstart, INGET felmeddelande, ingen poängsänkning; bajset ligger kvar.
- När `collected >= needed` körs firande (konfetti i fxLayer) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbel-trigg via `_resolving`-skydd vid snabba tryck).
- Efter firandet byggs en ny runda (oändlig lek), `highestLevel` ökat och kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- Ingen fail-state: inga "game over"-element; valpen/skyffeln lämnar aldrig planen (positioner klampade); flugor påverkar aldrig progress.
- Städning: vid retur till biblioteket (hem-knapp) tas ticker bort och inga tweens/timeouts fortsätter logga eller kasta fel (även vid exit mitt under en gång-/skyffel-/firande-animation).
