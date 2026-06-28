# Vart Tog Det Vägen? (`vart-tog-det-vagen`)
> Det klassiska kopp-spelet ("hitta bollen"): en leksak göms under en av tre koppar som långsamt byter plats — barnet följer med blicken och trycker på rätt kopp. 3-5-åringar älskar spänningen i att "kika under" och får alltid hitta leksaken till slut, helt utan att kunna förlora.

## Metadata
| Fält | Värde |
|------|-------|
| id | `vart-tog-det-vagen` |
| titleSv | Vart Tog Det Vägen? |
| icon | 🥤 |
| category | minne |
| input | tap |
| ageRange | [3, 5] |
| bundle | `vart-tog-det-vagen` |
| voiceIntro | Titta noga! Var är leksaken? Tryck på rätt kopp. |

## Mål & mekanik
Kärnloopen i fyra faser:
1. **Visa (reveal):** Tre koppar står i rad, alla lyfta så barnet ser leksaken (t.ex. 🐥) under en av dem. Rösten säger "Titta var leksaken är!". Efter ~1,5s sänks alla koppar mjukt över sina platser.
2. **Blanda (shuffle):** Kopparna byter plats parvis i lugna animerade svep ('whoosh'). Antal byten och hastighet styrs av nivån. Under blandningen är kopparna inte tryckbara (busy-lås).
3. **Gissa (guess):** Blandningen stannar, rösten säger "Var tog den vägen? Tryck på koppen!". Barnet trycker på en kopp.
   - **Rätt kopp:** koppen lyfts, leksaken hoppar fram, 'reveal' + 'correct', glad röstberöm, gnistror. Detta räknas som en lyckad runda.
   - **Fel kopp:** koppen lyfts lite och vinglar, visar att den är tom, mjukt 'soft'-ljud, rösten säger "Kika igen!". Koppen sänks tillbaka och barnet får trycka igen (inga försök "tar slut", ingen bestraffning).
4. **Klart & ny runda:** Efter rätt gissning firar spelet kort; en runda räknas. Efter ett bestämt antal lyckade rundor (se Progression) anropas `ctx.progress.complete()` och nivån höjs. Sedan startar en ny runda automatiskt (oändlig lek).

Ingen poäng visas, ingen timer, inget slut.

## Skärm-layout (1280x720)
GameHost ritar själv header (hem-knapp + repetera/högtalar-knapp) överst — rita INGA egna sådana.

- **Spelyta/rot (`_root`):** hela 1280x720, eget Container tillagt i `ctx.stage`.
- **Bakgrund:** valfri lugn Graphics-platta, en "bordsyta": `roundRect` runt y≈420-660 i en varm färg (COLORS.cream/orange-toning) som koppar står på. Eventmode 'none'.
- **Tre kopp-platser (slots):** centrerade horisontellt på en rad.
  - Kopp-bredd ≈ 200px, höjd ≈ 230px. Hit-area minst 200x230 (klart > 96px).
  - Slot-mittpunkter (x): `slotX = [400, 640, 880]`, dvs mellanrum 240px (gott om luft, > 24px).
  - Kopp-bottenlinje (y): `BASE_Y = 470` (koppens y-position när nedsänkt).
  - Lyft-läge: koppen animeras till y `BASE_Y - 120` när den lyfts (visa/kika).
- **Leksak (prize):** Text-emoji ~96px, placeras på den slot där den göms, y ≈ `BASE_Y + 20` (står på bordet, döljs av kopp). Anchor 0.5.
- **Maskot/ledtråd (valfritt):** liten Bobo i hörnet eller utelämnas; håll scenen ren.
- Allt byggs i designkoordinater; `_root` redan skalad/centrerad.

## Interaktion
Endast **TAP** (ingen drag).

- Varje kopp är en `Container` med `eventMode = 'static'`, `cursor = 'pointer'`, lyssnar på `'pointertap'`.
- Sätt en explicit `hitArea` (Pixi `Rectangle`) på ~220x260 runt koppen så även "kanttryck" registreras (extra hit-halo).
- Ett `this._phase`-tillstånd styr tryckbarhet: tap hanteras ENDAST när `this._phase === 'guess'`. I faserna 'reveal'/'shuffle'/'resolving' ignoreras tap (förhindrar dubbeltryck under animation).
- Tap under fel fas eller på tom yta: spela mjukt 'tap'/'soft' + liten `wiggle` på närmaste kopp, ingen straffeffekt.
- Ingen DragController behövs (rent tap-spel). Tap-tap-fallback är irrelevant eftersom det inte finns drag.

## Återkoppling & belöning
Varje pekning ger ljud+bild < 100ms:
- **Kopp tryckt (rätt):** `audio.sfx('reveal')` direkt vid lyft + `audio.sfx('correct')` när leksaken visas; `pop(kopp)` och `pop(prize)`; `sparkle(ctx.fxLayer, x, y)`; `voice.say(randomFrom(PRAISE))` t.ex. "Bra jobbat!" / "Du hittade den!".
- **Kopp tryckt (fel):** koppen lyfts lite (~60px) och visar tom plats, `wiggle(kopp)`, `audio.sfx('soft')`, `voice.say('Kika igen!')`. Koppen sänks tillbaka efter ~0,6s. Barnet trycker vidare. ALDRIG buzzer/rött/"fel".
- **Vid blandning:** varje platsbyte spelar `audio.sfx('whoosh')`.
- **Vid rundstart/visa:** `audio.sfx('pling')` när leksaken visas under reveal.
- **complete():** Efter N lyckade rundor på nivån: `ctx.progress.complete()` (delat firande 1-2s + stjärna + klistermärke). Lägg ev. `ctx.progress.addStars(1)` per lyckad runda om önskat (men complete ger redan stjärna — undvik dubblering, hoppa addStars).

Röstfraser (sv, åäö): voiceIntro vid mount; "Titta var leksaken är!" vid reveal; "Var tog den vägen? Tryck på koppen!" vid guess-start; PRAISE vid rätt; "Kika igen!" vid fel. Re-cue guess-frasen om idle ~6s (se nedan).

## Progression & nivåer
Använd `ctx.progress.get().highestLevel` (clampat) som nivåindex. Definiera en LEVELS-tabell som styr antal blandningssvep och hastighet:

```
LEVELS = [
  { swaps: 2, swapDur: 0.7 },  // nivå 0 (lättast, 3-åring)
  { swaps: 3, swapDur: 0.6 },
  { swaps: 4, swapDur: 0.5 },
  { swaps: 6, swapDur: 0.42 }, // svårast
]
```
- Alltid 3 koppar (håll det enkelt för 3-5; fler koppar gör det för svårt).
- Svårigheten växer via fler/snabbare byten, inte fler koppar.
- **ROUNDS_PER_LEVEL = 3**: efter 3 lyckade rundor på en nivå → `ctx.progress.setLevel(nästa)` + `ctx.progress.complete()`, höj nivå (clamp), nollställ rundräknare, starta ny runda.
- Spara mellanrundsräknare i minnet (`this._roundsDone`); behöver ej persistas. `highestLevel` persisteras automatiskt via setLevel.
- Oändlig lek: efter varje lyckad runda (även de som inte triggar complete) startar ny runda med ny slumpad göm-position och ny leksak (`randomFrom(PRIZES)`).

## Tillgångar (programmatiskt)
INGA externa filer. Allt ritas:
- **Koppar:** Pixi `Graphics` — en upp-och-nedvänd kopp/mugg: `roundRect`/trapets-form via `moveTo/lineTo` eller enkel `roundRect` med smalare topp; fyll med PLAYFUL-färger (en färg per kopp, t.ex. röd/blå/gul) + vit `stroke`. Liten ellips/handtag valfritt. Alternativt kopp-emoji 🥤 som Text 130px om Graphics-kopp blir krångligt — Graphics rekommenderas för tydlig "lyft"-form.
- **Leksak/prize (PRIZES):** emoji som Text, t.ex. `['🐥','⭐','🍓','🐸','🚗','🎈','🐱','🌟']`, slumpas per runda.
- **Bord/bakgrund:** `Graphics.roundRect(...).fill(...)`.
- **Feedback:** `sparkle`, `pop`, `wiggle`, `puff` från `lib/feedback.js`; konfetti via `complete()`.
- **Skugga under kopp (valfritt):** halvtransparent ellips `Graphics`.

## Återanvänd dessa
- `ctx.services.audio.sfx(...)`: 'reveal','correct','soft','whoosh','pling','tap'.
- `ctx.services.voice.say/replayLast/cancel`.
- `ctx.progress`: get(), setLevel(n), complete().
- `lib/feedback.js`: `pop`, `wiggle`, `sparkle`, `puff`.
- `lib/swedish.js`: `shuffle`, `randomFrom`.
- `lib/theme.js`: `FONT`, `COLORS`, `PLAYFUL`, `PRAISE`.
- `gsap` för kopp-lyft/sänk och platsbyte-animationer.
- `ctx.fxLayer` för gnistror/konfetti ovanpå.
- INTE: DragController (ej drag), egna header-knappar, localStorage direkt.

## Edge-cases & städning
- `this._alive = true` i init; `false` i destroy. Alla `gsap.delayedCall`/`onComplete`-callbacks börjar med `if (!this._alive) return`.
- `this._phase`/`this._busy`-lås hindrar tap under reveal/shuffle/resolving → inga dubbeltryck som dubbelräknar en runda.
- En kopp kan bara "vinnas" en gång per runda; sätt `this._resolving = true` direkt vid rätt tryck.
- **Idle-recue:** spara `this._lastInteract = performance.now()`; i en ticker-callback, om `phase==='guess'` och >6000ms sedan senaste tap → `voice.say('Var tog den vägen? Tryck på koppen!')` och nollställ timern.
- **destroy(ctx):**
  - `this._alive = false`
  - `ctx.ticker.remove(this._tick)` (om ticker-callback registrerats)
  - `gsap.killTweensOf(...)` på varje kopp (och dess `.scale`/position) samt `_root`
  - rensa eventuella `gsap.delayedCall`-referenser (spara dem och `.kill()`, eller förlita på `_alive`-guard)
  - `voice.cancel()`
  - `this._root?.destroy({ children: true })`
- Hantera att barnet trycker hem-knappen mitt i en blandning: `_alive`-guard stoppar fortsatta steg.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/vart-tog-det-vagen/index.js`. Kopiera strukturen från `klambubblor`/`vandkort` som mall (default-export GameModule).
2. Importera: `Container, Graphics, Text, Rectangle` från `pixi.js`; `gsap`; `shuffle, randomFrom` från `lib/swedish.js`; `pop, wiggle, sparkle` från `lib/feedback.js`; `COLORS, FONT, PLAYFUL, PRAISE` från `lib/theme.js`.
3. Definiera metadata (id, titleSv, icon '🥤', category 'minne', input 'tap', ageRange [3,5], bundle, voiceIntro), `LEVELS`, `PRIZES`, `SLOT_X=[400,640,880]`, `BASE_Y=470`, `ROUNDS_PER_LEVEL=3`.
4. `init(ctx)`: sätt `_alive=true`, skapa `_root` och addera till `ctx.stage`, rita bakgrund/bord, läs nivå från `ctx.progress.get().highestLevel` (clamp), bygg 3 koppar med hitArea + `pointertap`-lyssnare, registrera idle-ticker via `ctx.ticker.add(this._tick)`. Anropa `this._newRound(ctx)`.
5. `_newRound(ctx)`: nollställ `_resolving`; slumpa `_prizeSlot` (0-2) och leksak (`randomFrom(PRIZES)`); placera prize-Text på rätt slot; sätt `_phase='reveal'`; lyft alla koppar, `voice.say('Titta var leksaken är!')`, `sfx('pling')`; efter ~1,5s sänk koppar och kör `_shuffle(ctx)`.
6. `_shuffle(ctx)`: `_phase='shuffle'`; utför `LEVELS[lvl].swaps` slumpade parbyten sekventiellt med gsap-tweens (`swapDur`), `sfx('whoosh')` per byte, uppdatera intern slot↔kopp-mappning. När klart: `_phase='guess'`, `voice.say('Var tog den vägen? Tryck på koppen!')`, nollställ idle-timer.
7. `_onTap(ctx, kopp)`: returnera om `_phase!=='guess'` eller `_resolving`; uppdatera `_lastInteract`. Om koppen täcker `_prizeSlot` → rätt: `_resolving=true`, lyft kopp, visa prize, `pop`, `sparkle`, `sfx('reveal')`+`sfx('correct')`, `voice.say(randomFrom(PRAISE))`, öka `_roundsDone`; efter ~1,3s: om `_roundsDone>=ROUNDS_PER_LEVEL` höj nivå (`setLevel`), `complete()`, nollställ räknare; annars `_newRound`. Om fel kopp → lyft lite, `wiggle`, `sfx('soft')`, `voice.say('Kika igen!')`, sänk tillbaka efter ~0,6s, förbli i 'guess'.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `_tick`-callback: idle re-cue enligt Edge-cases.
10. `destroy(ctx)`: enligt Edge-cases (alive=false, kill tweens, ticker.remove, voice.cancel, root.destroy).
11. Registrera i `src/games/registry.js`: importera modulen och lägg till i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repris, korrekt firande, fel→mjuk respons, och att nivå sparas efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas utan konsolfel efter att man valt det i biblioteket (canvas finns, inga uncaught errors).
- Koppar och en leksak ritas; efter reveal sänks kopparna och en blandning sker (positioner ändras).
- Tap på en kopp i 'guess'-fas ger respons inom rimlig tid (kopp lyfts/vinglar).
- **Rätt kopp** → leksaken visas, firande-tecken (gnistor/`complete()`-effekt) syns; en lyckad runda räknas.
- **Fel kopp** → mjuk respons (vingel + tom kopp), INGET "game over"/rött kryss; spelet stannar i guess och accepterar nytt tryck.
- Tap under blandning/reveal ignoreras (ingen dubbelräkning av rundor).
- Efter ROUNDS_PER_LEVEL lyckade rundor anropas `complete()` och `highestLevel` höjs; värdet persisteras i localStorage (`pwagames.save.v1`) och kvarstår efter sidomladdning.
- En ny runda startar automatiskt efter varje lyckad runda (oändlig lek; koppar/leksak återskapas).
- Ingen synlig poäng, timer eller felräknare förekommer i DOM/scen.
