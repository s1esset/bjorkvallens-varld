# Spåra Linjen (`spara-linjen`)
> Barnet drar fingret längs en prickad linje eller form och ser hur den färgläggs bit för bit — en lugn, förlåtande "rita-själv"-känsla som ger 3–5-åringar stolthet utan att kräva precision eller läsning.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `spara-linjen` | Spåra Linjen | ✏️ | motorik | drag | [3,5] | `spara-linjen` | "Dra fingret längs prickarna!" |

## Mål & mekanik
- En **prickad väg** (linje eller enkel form) visas på en stor "rit-yta". Längs vägen sitter **stora vägpunkts-prickar** (waypoints) i ordning.
- **Kärnloop:** barnet sätter fingret på startpricken (som blinkar/pulsar) och drar längs vägen. När fingret passerar nära nästa prick i ordning "tänds" den: den fylls med färg, ett färgat **segment ritas** från föregående prick till denna, och ett mjukt `pling`/`pop` spelas.
- Ordningen är **förlåtande**: en prick tänds när fingret kommer inom dess träffradie OCH den är nästa otända pricken (eller redan tänd → ignoreras). Hoppar fingret över en prick tänds den överhoppade automatiskt när nästa nås (fyll-igen), så barnet aldrig "fastnar".
- **Klart** = alla prickar tända → hela linjen är färglagd → linjen "vaknar" (studsar/glittrar), `ctx.progress.complete()` körs, och efter firandet byggs nästa form (oändlig lek).
- Inget kan bli fel: släpper barnet fingret mitt i förblir det tända kvar; tomt drag utanför vägen ger ingenting (eller en mjuk gnista), aldrig en bestraffning.

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalar-knappar i headern — rita INTE egna. Allt nedan ligger i spelets `_root` (designkoordinater).
- **Bakgrund/rityta:** en ljus papperspanel, `roundRect(120, 130, 1040, 520, 40)` fylld `COLORS.cream` (0xfffdf7) med mjuk kant `stroke({width:6, color:COLORS.yellow})`. Detta är "ritytan" där vägen ligger.
- **Aktiv rityta-rektangel (logisk):** x ∈ [180, 1100], y ∈ [200, 590]. Alla vägpunkter genereras inom denna ruta med marginal.
- **Vägpunkts-prickar:** cirklar radie **34px**, osynlig hit-halo via `hitArea`/avståndskoll radie **70px** (≥96px diameter träffyta). Otänd prick: `circle(0,0,34).fill({color:COLORS.inkSoft, alpha:0.18}).stroke({width:4, color:COLORS.inkSoft, alpha:0.5})` (prickad känsla). Tänd prick: fylls med rundans färg.
- **Segment-grafik:** ett dedikerat `Graphics` (`this._ink`) som ligger UNDER prickarna och ritar färgade tjocka streck (`width:22, cap:'round'`) mellan tända prickar.
- **Startmarkör:** liten ✏️-emoji (Text, fontSize 64) som placeras vid första pricken och flyttas till senast tända prick som "pennspets".
- **Färgknapp (valfri, dekorativ):** ingen krävs — rundans färg väljs automatiskt ur `PLAYFUL`.

## Interaktion
Detta spel använder INTE `DragController` (den är till dra-föremål-till-mål). Istället en enkel egen spårings-lyssnare på ritytan, byggd av plattformens primitiver:
- Gör `_root` (eller en transparent `hitArea`-rektangel som täcker ritytan) `eventMode='static'`.
- Lyssna på `pointerdown` → sätt `this._tracing = true`, kör `_checkPoint(localPos)`.
- Lyssna på `globalpointermove` (på ritytan, så draget överlever att fingret lämnar en prick) → om `_tracing`, konvertera `e.global` med `_root.toLocal(e.global)` och kör `_checkPoint`.
- Lyssna på `pointerup`/`pointerupoutside` → `this._tracing = false`.
- `_checkPoint(p)`: hitta nästa otända prick `this._dots[this._next]`. Om `Math.hypot(p.x-d.x, p.y-d.y) < 70` → tänd alla prickar från `_next` t.o.m. denna (fyll-igen-skydd) via `_lightDot(i)` och öka `_next`.
- **Tap-tap-fallback (för de minsta / de som inte kan dra):** varje prick är även `eventMode='static'` med `pointertap` → om den är nästa i ordning, tänd den direkt. Så barnet kan **tappa prickarna en och en i ordning** istället för att dra. Båda lägena driver samma `_lightDot`/`_next`.
- Skydd mot dubbeltryck under firande: när rundan är klar sätts `this._resolving = true`; alla pointer-callbacks returnerar tidigt tills nästa runda byggs.

## Återkoppling & belöning
Varje tänd prick (<100ms): 
- Ljud: `ctx.services.audio.sfx('pling')` (var 3:e prick `'pop'` för variation).
- Bild: `pop(dot)` (puls), `sparkle(ctx.fxLayer, dot.x, dot.y)`, segmentet ritas in med en kort GSAP-fade, och ✏️-pennspetsen flyttas (`gsap.to`) till den tända pricken.
- Röst: vid första pricken `voice.say('Bra, fortsätt!')`; annars tyst för att inte tjattra.
- **Fel/tomt finns inte:** drar barnet utanför vägen händer ingenting störande; valfritt en pytteliten `sparkle` där fingret är. Om barnet tappar en prick som inte är nästa i tur → `wiggle(dot)` på rätt nästa-prick (en vänlig vink om var man ska) + `audio.sfx('soft')`. ALDRIG buzzer/rött/omstart.
- **Klart-firande:** när sista pricken tänds → `this._resolving = true`; hela linjen pulsar (`pop` på varje prick i följd / segment glittrar), `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, sedan `ctx.progress.complete()`. Efter ~1.4s (`gsap.delayedCall`) byggs nästa form.

## Progression & nivåer
- `ctx.progress.setLevel(n)` höjer `highestLevel` när en svårare form klaras; `ctx.progress.setCustom('rundor', n+1)` räknar rundor (oändligt).
- Svårighet = **formval + antal prickar**, väljs av `level = Math.min(progress.get().highestLevel || 1, 4)` och stigande för varje klarad runda:
  1. **Rak linje** vågrätt, 4 prickar (y≈395, x 260→1020).
  2. **Lutande/vågig linje**, 5 prickar (sinus över ritytan).
  3. **Enkel form – triangel eller fyrkant**, 4–6 prickar runt omkretsen, sluten väg (sista pricken nära första).
  4. **Stjärna/sicksack-berg**, 6–8 prickar.
- Efter varje klarad runda: öka intern `this._round`, välj nästa formgenerator, fler prickar/krökar. Loopar tillbaka till variation 1 med ny slumpfärg så leken aldrig tar slut. Färg per runda = `randomFrom(PLAYFUL)`.
- Formerna genereras **programmatiskt** som arrays av {x,y} inom logiska rutan [180,1100]×[200,590]; prickar placeras jämnt längs vägen.

## Tillgångar (programmatiskt)
- Emoji (Text): ✏️ pennspets/markör; valfritt 🎉/⭐ i firandet (annars sköter `bigCelebration` det).
- Pixi Graphics: papperspanel `roundRect`, vägpunkter `circle`, segment-streck via `moveTo/lineTo` + `stroke({width:22, cap:'round', color})`, prickad otänd-stil med låg alpha.
- Inga externa bild-/ljud-/fontfiler. Ljud via `audio.sfx`, röst via `voice.say`.

## Återanvänd dessa
- `ctx.services.audio.sfx('pling'|'pop'|'soft'|'celebrate')`, `ctx.services.voice.say(...)` / `replayLast()`.
- `lib/feedback.js`: `pop`, `wiggle`, `sparkle`, `bigCelebration` (och ev. `puff`).
- `lib/theme.js`: `PLAYFUL`, `COLORS`, `PRAISE`.
- `lib/swedish.js`: `randomFrom`, `shuffle`.
- `ctx.progress`: `complete()`, `setLevel()`, `setCustom()`, `get()`.
- `ctx.fxLayer` för konfetti/gnistror. `ctx.ticker` för idle-timern.
- INTE `DragController` (egen spårning passar bättre; tap-tap-fallback byggs in manuellt enligt ovan).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`-callbacks (bygg nästa runda, firande) ska tidigt-returnera om `!this._alive`.
- Sätt `this._resolving = true` när linjen blir klar; alla pointer/tap-callbacks returnerar om `_resolving` eller `!_alive` → inget dubbeltryck startar två firanden.
- Idle-timer i ticker: om `this._idle > 6s` och rundan ej klar → `voice.say(this.voiceIntro)` + `wiggle`/`pop` på nästa otända prick som vink; nollställ `_idle` vid varje interaktion.
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; avregistrera pointer-lyssnare; `gsap.killTweensOf(...)` för pennspets, prickar och `_ink`; döda eventuella `_pulse`-tweens på prickar; `this._root?.destroy({children:true})`.
- Skydda mot att en prick tänds två gånger (`if (dot._lit) return`).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/spara-linjen/index.js` och default-exportera GameModule-objektet med metadatan ovan.
2. I `init(ctx)`: `this._alive = true`; skapa `this._root = new Container()` och lägg i `ctx.stage`; skapa lager-ordning: papperspanel → `this._ink` (Graphics, segment) → `this._dotsLayer` (Container) → ✏️-markör. Skapa transparent `hitArea`-rektangel över ritytan, `eventMode='static'`, och koppla `pointerdown`/`globalpointermove`/`pointerup`/`pointerupoutside` till spårningslogiken.
3. Skriv `_buildRound(ctx)`: välj `level`/form, generera waypoint-array, rensa gammalt (`_dotsLayer.removeChildren().forEach(d=>d.destroy())`, `_ink.clear()`), skapa prickar (otänd stil) med `bounceIn`-intro, sätt `this._dots`, `this._next = 0`, `this._resolving = false`, placera ✏️ vid första pricken och pulsa den. Lägg `pointertap` per prick (tap-tap-fallback).
4. Skriv `_checkPoint(p)`, `_lightDot(i)` (rita segment i `_ink`, `pop` + `sparkle` + `audio.sfx`, flytta penna), och `_onComplete(ctx)` (firande + `progress.complete()` + `setLevel`/`setCustom` + `gsap.delayedCall(1.4, ()=> this._alive && this._buildRound(ctx))`).
5. I `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
6. Lägg idle-tick: `this._tick = (t)=> this._update(ctx, t)`, `ctx.ticker.add(this._tick)`.
7. I `destroy(ctx)`: städa enligt "Edge-cases & städning".
8. Registrera i `src/games/registry.js`: `import sparaLinjen from './spara-linjen/index.js'` och lägg `sparaLinjen` i `GAMES`-arrayen.
9. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repris, att linjen färgläggs vid drag OCH vid tap-tap, firande vid full linje, samt att `rundor`/`highestLevel` finns kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (canvas finns, inga uncaught errors).
- Vid mount spelas en svensk röstinstruktion / `voiceIntro` är satt (`"Dra fingret längs prickarna!"`).
- En `pointerdown` följt av `globalpointermove` längs prickarna tänder prickar i ordning och ritar färgade segment (testbart via simulerade pekhändelser eller exponerat `_next`/`_dots`-state ökar).
- Tap-tap-fallback: att tappa prickarna i ordning tänder dem en och en utan drag.
- Att tappa "fel" prick (inte nästa i tur) ger mjuk respons (`soft`/`wiggle`) och INGEN omstart, INGET felmeddelande, ingen poängsänkning.
- När alla prickar tänds körs firande och `ctx.progress.complete()` anropas exakt en gång (ingen dubbel via `_resolving`-skydd vid snabba dubbeltryck).
- Efter firandet byggs en ny runda (oändlig lek) och `custom.rundor` har ökat.
- Progress sparas: efter `complete()` finns `highestLevel`/`stars`/`custom.rundor` kvar i localStorage efter omladdning.
- `destroy` lämnar inga kvarvarande tickers/tweens (inga konsolfel efter att man lämnar spelet mitt i en animation).
