# Färgregn (`fargregn`)
> Färgade droppar regnar lugnt nedåt och rösten ber barnet trycka på en viss färg — ren färginlärning genom att jaga regndroppar, utan fel och utan slut, vilket 2–4-åringar älskar för det omedelbara plinget och de studsande dropparna.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|----|---------|------|----------|-------|----------|--------|------------|
| `fargregn` | Färgregn | 🌈 | larande | tap | [2,4] | `fargregn` | Tryck på de röda dropparna! |

(voiceIntro byts dynamiskt vid varje runda till den aktuella målfärgen, se Progression. Den statiska `voiceIntro`-strängen ovan används som modulens metadata; i `mount` säger vi istället den runt-specifika frasen.)

## Mål & mekanik
- **Vad barnet gör:** Lyssnar på rösten ("Tryck på de **gula** dropparna!"), tittar på den stora målfärg-skylten uppe i mitten, och trycker på regndroppar i den färgen medan de faller långsamt nedåt.
- **Kärnloop:** Droppar i flera färger spawnar i toppen och faller mjukt nedåt (ca 70–110 px/s). Barnet trycker på en droppe → om den har målfärgen poppar den med `pling` + gnistor och en räknare fylls på; om den har en annan färg vinglar den bara vänligt vidare (`soft`) och fortsätter falla. Droppar som når botten landar i en pöl och försvinner stillsamt (aldrig "miss", ingen bestraffning).
- **Lyckad handling:** Rätt droppe → `pling`, `sparkle` på dropp-positionen, droppen krymper bort, en av N "regnbågsbåge-segment" (eller stjärnor) i en framstegsrad högst upp tänds.
- **Runda blir klar:** När barnet samlat **N droppar av målfärgen** (N = 4 på nivå 1, växer långsamt) → `ctx.progress.complete()` (delat firande 1–2s + klistermärke), regnet pausar kort, sedan ny runda med ny målfärg (oändlig lek).

## Skärm-layout (1280×720)
GameHost ritar header (hem-knapp + repetera/högtalare). Rita INTE egna sådana. Allt nedan ligger i `this._root` (Container i ctx.stage).

- **Bakgrund:** mjuk pastell-rektangl `g.roundRect(0,0,1280,720,0).fill(COLORS.bg)` som botten-fyllnad (eller en lugn ljusblå `0xdff1fb` himmel). `eventMode='none'`.
- **Målfärg-skylt (center-topp):** Container på `x=640, y=92`. En stor rundad bricka `g.roundRect(-150,-56,300,112,28).fill(COLORS.cream).stroke({width:6,color: målfärg})`. I mitten en stor droppe-ikon i målfärgen (radie ~38) så barnet ser vilken färg som gäller utan att läsa. Denna är `eventMode='static'` och vid tap upprepar den röst-instruktionen (extra repetera-yta).
- **Framstegsrad (topp, under skylten):** N tomma "prickar"/bågsegment centrerade kring `x=640, y=170`, varje radie ~16, mellanrum 44px. Tända = målfärg, otända = grå `0xd8cfc4`. `eventMode='none'`.
- **Regn-fält:** hela ytan `y` från −80 (ovanför skärm) till 720. Droppar spawnar med `x` jämnt fördelat i intervallet `[120, 1160]` (24px marginal-säkring), `y=-80`.
- **Pöl-rad (botten):** en valfri dekorativ vågig remsa vid `y≈690` (`g.roundRect`-remsa, `eventMode='none'`) där droppar "plaskar" och tonas ut.

Marginaler: minst 24px mellan droppar vid spawn-försök; droppar respawnar inte ovanpå varandra (slumpa x tills >100px från andra aktiva droppar, max 6 försök).

## Interaktion
- **Endast TAP.** Varje droppe är en Container med `eventMode='static'`, `cursor='pointer'`, och en **osynlig hit-halo**: lägg till en genomskinlig cirkel `g.circle(0,0,64).fill({color:0xffffff,alpha:0.001})` bakom den synliga droppen (synlig droppe ~radie 40 → total träffyta ≥ 96px diameter, faktiskt 128px). Lyssnare: `drop.on('pointertap', () => this._tapDrop(ctx, drop))`.
- **Ingen drag** (input='tap'). Ingen DragController behövs.
- **Tomt tryck på bakgrunden:** bakgrunden är `eventMode='none'`, så tomma tryck gör inget skadligt; alternativt en lätt `audio.sfx('soft')` om man vill (valfritt, undvik spam).
- **Dubbeltryck-skydd:** varje droppe har `drop._resolved`; ignorera tap om redan resolved.

## Återkoppling & belöning
- **Per tryck (<100ms):** omedelbart `pop(drop)` (skalpuls) + ljud.
- **Rätt färg:** `ctx.services.audio.sfx('pling')`, `sparkle(ctx.fxLayer, globalX, globalY)`, droppen krymper bort (`gsap.to(drop.scale,{x:0,y:0,duration:0.22,ease:'back.in(2)'})`), framstegsprick tänds med liten `pop`. Räknare++. Vid var 2:a–3:e rätt: kort röst-uppmuntran från `PRAISE` (`randomFrom(PRAISE)`), sparsamt så det inte blir pratigt.
- **Fel färg (aldrig bestraffning):** `ctx.services.audio.sfx('soft')` + `wiggle(drop)` — droppen vinglar glatt och **fortsätter falla**. Ingen röd markering, inget kryss, ingen röst-tillrättavisning, ingen poängavdrag.
- **Klart-villkor:** när räknaren når N → `ctx.services.audio.sfx('celebrate')`, `bigCelebration(ctx.fxLayer,{width:1280,height:720})`, `ctx.progress.complete()`, röst t.ex. `voice.say('Du hittade alla gula! Bravo!')`. Pausa spawn ~1.3s, sedan `this._startRound(ctx)` med ny färg.
- **Audio-namn som används:** `'pling'` (rätt), `'soft'` (fel/lekfullt), `'celebrate'` (klart). Valfritt `'pop'` vid spawn-puff.
- **Voice-fraser:** rundans intro `Tryck på de <färg> dropparna!`, idle-repris (samma), beröm ur `PRAISE`, klart-fras `Du hittade alla <färg>! <beröm>`. Färgord: röd→`röda`, gul→`gula`, blå→`blåa`, grön→`gröna`, lila→`lila`, rosa→`rosa` (böjd plural-form i frasen).

## Progression & nivåer
- **custom/level:** Använd `ctx.progress.get().custom` för att hålla `{ rundor }` och `ctx.progress.setLevel(n)` för antal klarade rundor → `highestLevel`.
- **Nivå-skala (baserat på antal klarade rundor):**
  - Nivå 1 (rundor 0–2): mål-N = 4, distinkta färger på fältet = 3 (t.ex. röd/gul/blå), spawn-intervall ~900ms, fallhastighet ~70px/s.
  - Nivå 2 (rundor 3–5): N = 5, färger = 4, intervall ~750ms, hastighet ~85px/s.
  - Nivå 3 (rundor 6+): N = 6, färger = 5–6, intervall ~650ms, hastighet ~100px/s (tak ~110).
- **Målfärg** väljs slumpvis varje runda via `randomFrom` ur den aktiva färgpaletten, gärna inte samma två rundor i rad. Övriga droppar slumpas ur de andra paletten-färgerna så att minst ~40% av spawnade droppar är målfärgen (garanterar att barnet alltid hittar nog).
- **Oändlig lek:** efter `complete()` startas ny runda automatiskt; ingen "game over", inget slut.
- **Palett:** välj ur `COLORS`/`PLAYFUL`: röd `0xff6b6b`, gul `0xffd35c`, blå `0x4aa3df`, grön `0x5bbf6a`, lila `0xa78bfa`, rosa `0xff9ec4`. Mappa varje färg → svensk plural-fras (se ovan).

## Tillgångar (programmatiskt)
INGA externa filer. Allt ritas med Pixi Graphics + emoji-Text.
- **Droppe:** Pixi Graphics — en droppform: cirkel + en spets uppåt. T.ex. `g.circle(0,0,r).fill({color, alpha:0.92}).stroke({width:4,color: mörkare nyans})` plus en liten vit highlight `g.circle(-r*0.3,-r*0.3,r*0.28).fill({color:0xffffff,alpha:0.6})`. (Valfritt spets: `g.moveTo(0,-r*1.6).lineTo(r*0.6,-r*0.3).lineTo(-r*0.6,-r*0.3).fill(color)` ovanpå cirkeln för "tår"-form.)
- **Osynlig hit-halo:** `g.circle(0,0,64).fill({color:0xffffff,alpha:0.001})`.
- **Målfärg-skylt:** roundRect (cream) + droppe-ikon i målfärg.
- **Framstegsprickar:** små cirklar (Graphics).
- **Moln (dekor, valfritt):** emoji `☁️` som `new Text` högst upp, `eventMode='none'`.
- **Rubrik-droppe-emoji (valfritt på skylten):** `💧` som komplement, men huvud-ikonen ritas i målfärg via Graphics (emoji 💧 är bara blå, så använd Graphics för färgvariation).
- **Pöl/regnbåge:** Graphics-remsa; icon i biblioteket = 🌈 (modulens `icon`).
- Konfetti/gnistor via `feedback.js` (Graphics internt).

## Återanvänd dessa
- `lib/feedback.js`: `pop` (per-tap puls), `wiggle` (fel droppe), `sparkle` (rätt droppe), `bigCelebration` (klart). `puff` valfritt vid spawn.
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `PRAISE`, `FONT`.
- `lib/swedish.js`: `randomFrom`, `shuffle`.
- `ctx.services.audio.sfx`, `ctx.services.voice.say` / `replayLast`.
- `ctx.progress`: `complete()`, `setLevel(n)`, `setCustom('rundor', n)`, `get()`.
- `ctx.ticker` för fall-uppdatering, `ctx.fxLayer` för firande/gnistor.
- `gsap` för pop/krymp-tweens.
- (Ingen DragController, ingen Button behövs — header sköts av GameHost.)

## Edge-cases & städning
- **`this._alive`** sätts `true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`setTimeout`/tween-`onComplete` som kör `_startRound`/spawn måste börja med `if (!this._alive) return`.
- **Dubbeltryck under "resolving":** `drop._resolved` flagga; sätt `true` direkt i `_tapDrop` och `drop.eventMode='none'`.
- **Spawn-paus vid klart:** flagga `this._paused=true` under firandet så inga nya droppar spawnar och inga tap räknas till nästa runda.
- **Droppar som lämnar skärmen** (y > 740): ta bort från aktiv lista, `gsap.killTweensOf(drop)`, `drop.destroy()` (valfritt liten plask-`puff`).
- **destroy(ctx):**
  - `this._alive = false`
  - `ctx.ticker.remove(this._tick)`
  - för varje aktiv droppe: `gsap.killTweensOf(drop)` (och dess scale)
  - `gsap.killTweensOf(this._root)`
  - rensa ev. `this._spawnTimer` (om `gsap.delayedCall`/intervall används → `.kill()`)
  - `this._root?.destroy({ children: true })`
- **Idle-recue:** ackumulera `this._idle += ticker.deltaMS/1000`; vid >6s och runda pågår → `voice.say` rundans instruktion igen + en liten `pop` på en synlig målfärg-droppe, nollställ `_idle`. Nollställ `_idle` vid varje tap.
- **Inga droppar av målfärgen på skärmen + få spawnar:** säkerställ via spawn-logiken (≥40% målfärg) att barnet aldrig fastnar; vid idle-recue, om inga målfärg-droppar finns, tvinga nästa spawn till målfärg.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/fargregn/index.js`. Kopiera strukturen från `src/games/klambubblor/index.js` som mall (samma livscykel + `_alive`/ticker-mönster).
2. Default-exportera modulobjektet med metadata: `id:'fargregn', titleSv:'Färgregn', icon:'🌈', category:'larande', input:'tap', ageRange:[2,4], bundle:'fargregn', voiceIntro:'Tryck på de röda dropparna!'`.
3. Definiera en färgpalett-array `COLOR_DEFS = [{key:'rod', color:0xff6b6b, plural:'röda'}, {key:'gul', color:0xffd35c, plural:'gula'}, {key:'bla', color:0x4aa3df, plural:'blåa'}, {key:'gron', color:0x5bbf6a, plural:'gröna'}, {key:'lila', color:0xa78bfa, plural:'lila'}, {key:'rosa', color:0xff9ec4, plural:'rosa'}]`.
4. `init(ctx)`: sätt `this._alive=true`; skapa `this._root=new Container()`, `ctx.stage.addChild(this._root)`; init `this._drops=[]`, `this._idle=0`, `this._rounds = ctx.progress.get().custom?.rundor || 0`; rita bakgrund + bygg skylt/framstegsrad-containrar; `this._tick=(t)=>this._update(ctx,t)`; `ctx.ticker.add(this._tick)`; anropa `this._startRound(ctx)`.
5. `_startRound(ctx)`: välj nivå-parametrar från `this._rounds`; välj `this._target` (slumpa, undvik förra); nollställ `this._collected=0`, `this._paused=false`; uppdatera skylt-färg + framstegsrad (rätt antal prickar); säg `voice.say('Tryck på de ' + this._target.plural + ' dropparna!')`; starta spawn-loop.
6. Spawn-loop: använd en ackumulator i `_update` (spawn när `this._spawnAcc >= intervall`) hellre än setInterval, så den pausar/städas med tickern. Skapa droppe via `_makeDrop(ctx, colorDef)`, positionera `x` (slump med avstånds-kontroll), `y=-80`, addera till `this._root` och `this._drops`.
7. `_makeDrop(ctx, def)`: bygg Container (hit-halo + droppe-Graphics i `def.color`), `eventMode='static'`, `drop._def=def`, `drop._resolved=false`, `drop.on('pointertap', ()=>this._tapDrop(ctx,drop))`. `bounceIn(drop)` vid spawn (valfritt).
8. `_update(ctx, ticker)`: om `!this._alive` return; flytta varje droppe `drop.y += hastighet * ticker.deltaMS/1000`; ta bort de som passerat 740; hantera spawn-ackumulator (om ej `_paused`); hantera idle-recue (>6s).
9. `_tapDrop(ctx, drop)`: guard `!this._alive || drop._resolved || this._paused`; `this._idle=0`; `pop(drop)`; om `drop._def.key===this._target.key` → rätt-flöde (`drop._resolved=true`, `eventMode='none'`, `pling`, `sparkle` på `ctx.fxLayer` med drop-global-koordinater, krymp bort, tänd nästa framstegsprick, `this._collected++`; sparsamt beröm; om `this._collected>=N` → `_finishRound(ctx)`); annars fel-flöde (`soft` + `wiggle(drop)`, droppen fortsätter).
10. `_finishRound(ctx)`: `this._paused=true`; `audio.sfx('celebrate')`; `bigCelebration(ctx.fxLayer,...)`; `voice.say('Du hittade alla '+this._target.plural+'! '+randomFrom(PRAISE))`; `ctx.progress.complete()`; `this._rounds++`; `ctx.progress.setCustom('rundor', this._rounds)`; `ctx.progress.setLevel(this._rounds)`; rensa kvarvarande droppar (mjuk fade); `gsap.delayedCall(1.3, ()=>{ if(this._alive) this._startRound(ctx) })`.
11. `mount(ctx)`: `ctx.services.voice.say('Tryck på de ' + this._target.plural + ' dropparna!')` (rundans aktuella färg).
12. `destroy(ctx)`: enligt "Edge-cases & städning" ovan.
13. Registrera i `src/games/registry.js`: importera modulen och lägg till i `GAMES`-arrayen.
14. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repris, rätt→firande, fel→vingel, och att `rundor`/highestLevel kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas utan konsolfel efter att man navigerat till `fargregn` från biblioteket (canvas finns, inga uncaught errors).
- Efter `mount` faller droppar (positioner ändras över tid — verifiera via `browser_evaluate` mot exponerat test-tillstånd eller skärmdiff över tid).
- Tap på en droppe ger omedelbar respons (<100ms visuell puls) — simulera klick på en droppes skärmkoordinat.
- Tap på rätt-färgad droppe → den försvinner, framstegsräknaren ökar (`collected` ökar) och `pling`/`sparkle` triggas.
- Tap på fel-färgad droppe → droppen finns kvar och fortsätter falla (ingen poäng, ingen "fel"-markering), endast `soft`+`wiggle`.
- När mål-N rätta droppar samlats → `ctx.progress.complete()` anropas (firande syns: konfetti i fxLayer) och en ny runda startar med (potentiellt) ny målfärg.
- Progress sparas: efter en klarad runda och sidladdning är `progress.custom.rundor`/`highestLevel` ökat (läs `localStorage` `pwagames.save.v1`).
- Inga förbjudna gester krävs (allt nås med enkla tap); inga buzzer/röda kryss förekommer.
- Vid ~6s inaktivitet upprepas röst-instruktionen (idle-recue), verifierbart via voice-spionering/mockning.
- `destroy` lämnar inga kvarvarande tickers/tweens (navigera bort och tillbaka utan att fallhastighet eller dubbletter ackumuleras).
