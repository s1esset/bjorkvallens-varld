# Poppa Ballongerna (`poppa-ballonger`)
> Färgglada ballonger svävar lugnt uppåt och barnet trycker för att poppa dem med pling och konfetti — ren orsak-och-verkan-glädje som de allra minsta (2–3 år) älskar, helt utan fel eller slut.

## Metadata
| Fält | Värde |
| --- | --- |
| id | `poppa-ballonger` |
| titleSv | Poppa Ballongerna |
| icon | 🎈 |
| category | `motorik` |
| input | `tap` |
| ageRange | `[2, 3]` |
| bundle | `poppa-ballonger` (== id) |
| voiceIntro | `"Tryck på ballongerna!"` |

## Mål & mekanik
Barnet trycker på ballonger som lugnt stiger uppåt över skärmen. Varje tryck på en ballong poppar den med ett glatt ljud och en liten konfettipuff i ballongens färg.

**Kärnloopen:**
1. Några ballonger (5–8) svävar långsamt uppåt från botten med lätt sidledes vaggande.
2. Barnet trycker på en ballong → den poppar (ljud + puff + snör/knut faller bort), räknaren minskar.
3. Tomt tryck (mellan ballongerna) → en mjuk studsande luftbubbla/ring uppstår där fingret rörde, med ljudet `'soft'`. Aldrig "fel".
4. Ballonger som hinner sväva ut över toppen återanvänds: de respawnas mjukt nere igen (oändlig sväng) tills hela rundans kvot poppats — så ingenting "missas" och inget straffas.
5. När alla ballonger i rundan poppats → `ctx.progress.complete()` (firande + klistermärke), kort paus, ny runda fylls på.

Det finns ingen poäng som syns, ingen timer, inget game over.

## Skärm-layout (1280×720)
GameHost ritar header med hem- och högtalar/repetera-knapp överst — **rita inga egna sådana**. Spelet använder hela ytan under headern.

- **Spelyta:** hela `ctx.stage` 0–1280 × 0–720. Ballonger får sväva i x ∈ [120, 1160] (sidomarginal 120 px så de inte klipps), och rör sig i y från ~800 (strax under skärm) upp till ~-120 (strax ovan skärm).
- **Bakgrund (valfri, dekorativ):** ljus himmelsgradient eller enfärgad ljusblå `Graphics` `rect(0,0,1280,720).fill(COLORS.sky || 0xBFE3FF)`. `eventMode='none'`, `interactiveChildren=false`. Ligger längst bak; **fångar inte tap** (tomt-tryck hanteras på ett separat osynligt bakgrundslager, se Interaktion).
- **Osynligt tap-fångar-lager:** en `Graphics` `rect(0,0,1280,720).fill({color:0x000000, alpha:0})` med `eventMode='static'`, placerad ovanför bakgrund men under ballongerna. Ger tomt-tryck-feedback.
- **Ballonglager:** `Container` ovanpå tap-lagret; varje ballong är ett eget `Container`.
- **Ballongstorlek:** kropp ellips ca 150 px hög × 120 px bred (radie ~60–75). Hit-area en `circle` med radie **≥ 70** (≥ 96 px diameter regel uppfylld; lägg dessutom +24 px osynligt hit-halo → `hitArea = new Circle(0, -10, 84)`).
- **Avstånd:** spawn-x slumpas men håll minst ~140 px mellan samtidiga ballonger om enkelt; annars acceptera överlapp (ballongerna rör sig så de skiljs).

### Ballongens delar (i lokala koordinater, ankare i kroppens centrum)
- Kropp: `g.ellipse(0, 0, 60, 72).fill({color}).stroke({width:4, color: mörkare nyans})`.
- Glansprick: `g.ellipse(-22, -28, 16, 22).fill({color:0xffffff, alpha:0.55})`.
- Knut: liten triangel/`circle(0, 70, 7).fill(color)` i botten.
- Snöre: `g.moveTo(0,76).lineTo(6,150).stroke({width:3, color:0x9aa})` (dekorativt, ingår i hit-halo ej nödvändigt).

## Interaktion
**Endast TAP.** Inga drag, inga dubbeltryck.

- Varje ballong-`Container`: `eventMode='static'`, `cursor='pointer'`, explicit `hitArea = new Circle(0, -10, 84)` (stort + halo). Lyssnar på `'pointertap'` → `_pop(ctx, balloon)`.
- Tomt-tryck: det osynliga tap-fångar-lagret lyssnar på `'pointertap'` → läs `event.global`, konvertera till stage-koordinater (`this._layer.toLocal(event.global)`) och spela mjuk studs-ring + `audio.sfx('soft')` där. Eftersom ballongerna ligger ovanför fångar de sina egna tap först (event bubblar inte vidare till lagret bakom i Pixi när målet är ballongen), så endast genuina mellanrum-tryck ger soft-feedback.
- Guard: en ballong som redan poppats (`b._popped`) sätter `eventMode='none'` och ignorerar nya tap (ingen dubbeltryck-resolving-bugg).
- Ingen DragController behövs (rent tap-spel).

## Återkoppling & belöning
**Per-tryck < 100 ms, enbart positivt.**

Lyckat pop (tryck på ballong):
- Ljud: `audio.sfx('pop')` (25 % chans `'pling'` för variation).
- Bild: `puff(this._layer, b.x, b.y, { count: 9, color: ballongfärg })` + ballongen skalar ner till 0 via `gsap.to(b.scale,{x:0,y:0,duration:0.22,ease:'back.in(2)'})`, sedan `b.visible=false`.
- Liten `pop(b)`-puls får uteslutas eftersom den poppar bort direkt.

Tomt tryck (mellanrum) — **aldrig bestraffning**:
- Ljud: `audio.sfx('soft')`.
- Bild: en liten ring/luftbubbla (`Graphics().circle(x,y,12).stroke({width:4,color:0xffffff,alpha:0.8})`) som växer och tonar ut på ~0.4 s via gsap, sedan `destroy()`.

Rundan klar (alla ballonger poppade):
- `ctx.services.voice.say(randomFrom(PRAISE))` (t.ex. "Bra jobbat!").
- `ctx.progress.complete()` → delat firande (konfetti via `bigCelebration` i `ctx.fxLayer`) + stjärna + klistermärke (hanteras av plattformen).
- `ctx.progress.setCustom('rundor', (get().custom?.rundor||0)+1)`.
- Efter `gsap.delayedCall(1.4, ...)` → bygg ny runda.

Idle (~6 s utan tryck och ballonger kvar):
- Återupprepa `voice.say(this.voiceIntro)` och låt en kvarvarande ballong pulsa (`gsap.to(b.scale,{x:1.2,y:1.2,yoyo:true,repeat:3,duration:0.18})`) som mjuk vink.

## Progression & nivåer
- `highestLevel` = aktuell nivå, höjs via `ctx.progress.setLevel(level)` efter varje klar runda.
- **Svårighet växer mjukt** (men förblir lätt — målgrupp 2–3):
  - Nivå 1: 5 ballonger, stighastighet ~35 px/s.
  - Varje ny runda: `count = Math.min(8, 5 + Math.floor(level/2))`, `speed = Math.min(70, 35 + level*4)`.
- **Oändlig lek:** efter `complete()` byggs alltid en ny runda; spelet tar aldrig slut.
- `custom.rundor` räknar avklarade rundor (för ev. statistik), `custom` annars fritt.

## Tillgångar (programmatiskt)
**Inga externa filer.**
- Emoji (valfritt, som dekor/firande): 🎈 (icon i biblioteket). Spelballongerna ritas med Graphics för full färgkontroll (ej emoji).
- Pixi `Graphics`:
  - Bakgrund: `rect().fill()` (ljusblå himmel).
  - Ballong: `ellipse()` kropp + glans-`ellipse()` + knut-`circle()` + snöre-`lineTo().stroke()`.
  - Tomt-tryck-ring: `circle().stroke()`.
  - Partiklar: via `puff()` och `bigCelebration()` (lib/feedback).
- Färger: `PLAYFUL[]` från `lib/theme.js` (rotera per ballong: `PLAYFUL[idx % PLAYFUL.length]`).

## Återanvänd dessa
- `lib/feedback.js`: `puff` (pop-partiklar), `bigCelebration` (firande i `ctx.fxLayer`), ev. `pop`/`wiggle`.
- `lib/theme.js`: `PLAYFUL`, `COLORS`, `PRAISE`, `DESIGN_W`/`DESIGN_H`.
- `lib/swedish.js`: `randomFrom` (slumpa beröm).
- `ctx.services.audio.sfx('pop'|'pling'|'soft')`, `ctx.services.voice.say()`.
- `ctx.progress.complete()`, `setLevel()`, `setCustom()`, `get()`.
- `ctx.ticker` (driva stigningen via `ticker.deltaMS`), `ctx.fxLayer`.
- **Ingen** DragController (rent tap), **ingen** Button (header sköts av GameHost).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/callbacks kollar `if (!this._alive) return` först (barnet kan lämna mitt i firandet).
- Dubbeltryck-skydd: `b._popped`-flagga + `eventMode='none'` direkt vid pop → ingen dubbel `complete()`. Vakta även rund-slut: poppa-räknaren `_remaining` minskas en gång per ballong; `complete()` triggas bara när `_remaining` når 0 och en `this._resolving`-flagga inte redan är satt.
- Ticker: `ctx.ticker.add(this._tick)` i init, `ctx.ticker.remove(this._tick)` i destroy.
- Tweens: håll referens till varje ballongs vagga-tween och `kill()` dem; `gsap.killTweensOf(this._layer)`; kill alla per-ballong-tweens vid rundbyte och destroy.
- `destroy(ctx)`: sätt `_alive=false`, remove ticker, kill tweens, `this._layer?.destroy({children:true})`.
- Respawn-logik i ticker får inte skapa ballonger efter `_alive=false` eller efter att rundan är klar (`_resolving`).
- Konvertera pekkoordinater korrekt med `toLocal` (stage är skalad av Scaler).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/poppa-ballonger/index.js` och default-exportera modulobjektet med metadata enligt tabellen ovan. Kopiera strukturen från `src/games/klambubblor/index.js` som mall.
2. I `init(ctx)`: sätt `this._alive=true`, `this._idle=0`, `this._level = ctx.progress.get().highestLevel || 1`. Skapa `this._layer = new Container()` och addera till `ctx.stage`. Rita bakgrund (himmel) längst bak, sedan det osynliga tap-fångar-lagret (`alpha:0`, `eventMode='static'`, `'pointertap'` → soft-feedback). Anropa `this._build(ctx)`.
3. `_build(ctx)`: städa förra rundan (kill tweens, ta bort ballonger), beräkna `count`/`speed` från `this._level`, skapa ballonger via `_makeBalloon(ctx, color)`, placera dem spridda nedanför/inom skärmen med slumpad startposition, sätt `this._remaining = count`, `this._resolving=false`, `this._idle=0`.
4. `_makeBalloon(ctx, color)`: bygg `Container` med ellips-kropp + glans + knut + snöre, sätt `eventMode='static'`, `cursor='pointer'`, `hitArea = new Circle(0,-10,84)`, koppla `'pointertap'` → `_pop(ctx, b)`, ge en lätt sidledes vagga-tween (spara på `b._sway`). Returnera.
5. Lägg till `this._tick = (ticker)=>this._update(ctx,ticker)` och `ctx.ticker.add(this._tick)`. I `_update`: flytta varje ej-poppad ballong uppåt (`b.y -= speed * ticker.deltaMS/1000`); om `b.y < -120` respawna nere (`b.y = 800`, ny slump-x); öka `this._idle` och re-cue vid > 6 s.
6. `_pop(ctx, b)`: guard `if(!this._alive||b._popped) return`; sätt `b._popped=true`, `eventMode='none'`, `b._sway?.kill()`, minska `_remaining`, nollställ `_idle`, spela `audio.sfx('pop'/'pling')`, `puff(...)`, skala bort. Om `_remaining<=0 && !this._resolving`: sätt `_resolving=true`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width,height:ctx.height})`, `ctx.progress.complete()`, `setCustom('rundor', …)`, `this._level++`, `setLevel(this._level)`, `gsap.delayedCall(1.4, ()=>{ if(this._alive) this._build(ctx) })`.
7. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
8. `destroy(ctx)`: `this._alive=false`, `ctx.ticker.remove(this._tick)`, kill alla ballong-tweens, `gsap.killTweensOf(this._layer)`, `this._layer?.destroy({children:true})`.
9. Registrera i `src/games/registry.js`: `import poppaBallonger from './poppa-ballonger/index.js'` och lägg i `GAMES`-arrayen.
10. `npm run dev`, öppna biblioteket, spela: verifiera pop, tomt-tryck-soft, firande, klistermärke, idle-recue, hemknapp, och att `rundor`/`highestLevel` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monterar och renderar utan konsolfel (`browser_console_messages` tomt på errors).
- En canvas finns och spelet startar via biblioteket (navigera till spelet).
- Tap på en ballong (klick på dess position på canvas) → ballong försvinner/poppar; ett `pop`- eller `pling`-ljud-anrop sker (verifiera via mock/spion på `audio.sfx` om exponerat, annars via DOM/state-hook).
- Tap i tomt område → ingen "fel"-respons; verifiera att `soft` spelas och att ingen ballong poppas och att inget felaktigt tillstånd uppstår (inget rött/kryss, ingen game-over-text).
- När alla ballonger i en runda poppats → `ctx.progress.complete()` anropas (firande/konfetti syns, stjärna/klistermärke registreras) och en ny runda byggs (nya ballonger finns kvar).
- Dubbeltryck snabbt på samma ballong triggar pop endast en gång (ingen dubbel `complete()`).
- Progress sparas: efter en avklarad runda och sidomladdning är `highestLevel`/`custom.rundor` ökat i localStorage (`pwagames.save.v1`).
- Idle ~6 s utan interaktion → `voice.say` återupprepas (idle-recue) och en ballong pulsar.
- Hemknappen (Gamehost-header) navigerar tillbaka utan konsolfel; `destroy` kör (inga kvarvarande tickers/tweens leakar).
