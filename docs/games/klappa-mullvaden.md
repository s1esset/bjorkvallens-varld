# Klappa Mullvaden (`klappa-mullvaden`)
> Snälla mullvadar tittar lugnt upp ur sina hål och barnet klappar dem så de fnissar och dyker ner igen — ren reflex-glädje utan press, perfekt för 2–4-åringars utvecklande hand-öga-koordination.

## Metadata
| Fält | Värde |
|---|---|
| id | `klappa-mullvaden` |
| titleSv | Klappa Mullvaden |
| icon | 🐹 |
| category | motorik |
| input | tap |
| ageRange | [2, 4] |
| bundle | `klappa-mullvaden` |
| voiceIntro | "Klappa mullvadarna när de tittar upp!" |

## Mål & mekanik
Spelet är en snäll, lugn variant av "whack-a-mole" — utan slag, utan straff, utan tidspress.

- En äng med runda hål visas (rutnät av hål). Med jämna, lugna mellanrum poppar en eller flera mullvadar (🐹) långsamt upp ur sina hål.
- **Kärnloop:** mullvad reser sig (~0,4 s upp) → står uppe en generös stund (2–3,5 s) → om barnet klappar den (tap) fnissar den, studsar och dyker ner igen → om barnet inte hinner dyker den självmant lugnt ner igen (aldrig "miss", aldrig fel).
- **Lyckad handling:** vid tap på en uppe-mullvad spelas `pop`/`pling`, mullvaden gör en glad puls (`pop`), en liten partikelpuff (`puff`) syns, och en räknare ökar med 1. Var ~3:e klapp säger rösten beröm.
- **Runda blir klar:** när barnet klappat **N mullvadar** (rundans mål, börjar på 5) körs `ctx.progress.complete()` (delat firande + klistermärke), och en ny runda startar automatiskt med fler/snabbare mullvadar (oändlig lek).
- Tomt tryck (på ett tomt hål eller på ängen) ger en mjuk neutral respons (`soft` + liten studs på närmaste hål) — aldrig en bestraffning.

## Skärm-layout (1280x720)
GameHost ritar header-knappar (hem/repetera) överst — **rita inga egna**. Allt nedan byggs i `ctx.stage` i designkoordinater.

- **Bakgrund:** heltäckande grön äng-rektangel `g.rect(0,0,1280,720).fill(0x8ed16a)` med en mörkare gräs-remsa nedtill `g.rect(0,560,1280,160).fill(0x6fbf4f)`. `eventMode='static'` på en osynlig bakgrunds-träffyta för att fånga tomma tryck (se Interaktion).
- **Räknar-display (frö/morötter):** uppe till vänster, säkert under header, vid `(120, 120)`. Visar rundans framsteg som små ikoner 🥕 (en per klappad mullvad, mål N). Alternativt en enkel Text med stora siffror. Håll borta från header-zonen (y < 96 reserverad).
- **Hålrutnät:** centrerat lekfält. 
  - Nivå-beroende rutnät, start **3×2 = 6 hål**.
  - Fält-area: x från 240 till 1040 (bredd 800), y från 230 till 600 (höjd 370).
  - Kolumn-steg = 800/(cols-1), rad-steg = 370/(rows-1). För 3 kolumner: x = 240, 640, 1040. För 2 rader: y = 230, 600.
  - Varje **hål** = mörk ellips `g.ellipse(0,0,90,40).fill(0x4a3b2a)` med ljusare kant `.stroke({width:6,color:0x3a2d20})`, radie/träffyta minst 96px.
- **Mullvad-container** sitter i varje hål. Mullvaden ritas ovanför hålet men **maskas/klipps** så den ser ut att komma upp ur hålet (använd en mask-Graphics i form av en uppåtvänd halvcirkel runt hålöppningen, eller enklast: rita mullvaden i en container som tweenas i y från `+50` (gömd, under hålkanten med en clip-rect-mask) till `0` (uppe)).

## Interaktion
**Endast TAP.** Inga drag, inga dubbeltryck.

- Varje **mullvad-container** har `eventMode='static'`, `cursor='pointer'` och en generös `hitArea` (t.ex. `new Circle(0,-20,80)` så hela huvud/kropp täcks, >=96px diameter). Lyssnar på `pointertap`.
- Tap på en mullvad som är **uppe** (`mole._up === true` och inte `mole._resolving`) → räknas som klapp (se Återkoppling).
- **Bakgrunds-träffyta:** en heltäckande osynlig rektangel under allt med `eventMode='static'` och `pointertap` → tomt tryck → `audio.sfx('soft')` + liten `wiggle`/studs på närmaste hål. Mullvads-containrar ligger ovanpå så deras tap "vinner" (Pixi event bubblar inte förbi `stopPropagation`; sätt `e.stopPropagation()` i mullvadens handler, eller låt bakgrunden vara separat och endast fånga där ingen mullvad träffades).
- Ingen tap-tap-fallback behövs (det är ett rent tap-spel, inte drag). DragController används inte.
- Skydda mot dubbeltryck: när en mullvad klappats sätts `mole._resolving = true` tills den dykt ner; vidare tap ignoreras under nedgången.

## Återkoppling & belöning
Allt feedback < 100 ms efter pekning.

**Per klapp (lyckad, mullvad uppe):**
- Ljud: `ctx.services.audio.sfx('pop')` (var ~4:e → `'pling'` för variation).
- Bild: `pop(mole)` (glad puls) + `puff(this._layer, mole.x, mole.y, {count:8})`. Mullvaden får ett kort "fniss"-vingel (`wiggle`) innan den dyker.
- Mullvaden sätts `_resolving=true`, tweenas ner (y → gömd, ~0,3 s), markeras klar.
- Räknaren ökar; en 🥕-ikon fylls i.
- Var ~3:e klapp: `ctx.services.voice.say(randomFrom(PRAISE))` (t.ex. "Bravo!", "Vad duktig!").

**Tomt tryck / mullvad redan på väg ner (aldrig fel):**
- `ctx.services.audio.sfx('soft')` + liten studs/`wiggle` på närmaste hål. Ingen negativ signal, ingen minskning.

**Mullvad som inte klappas:** dyker bara lugnt ner av sig själv efter sin uppe-tid. Ingen ljudbestraffning, ingen räknar-ändring.

**Runda klar (räknare når N):**
- `ctx.services.audio.sfx('celebrate')`, `ctx.services.voice.say('Du klappade alla mullvadar! Hurra!')`.
- `bigCelebration(ctx.fxLayer, {width:ctx.width,height:ctx.height})`.
- `ctx.progress.complete()` (ger stjärna + klistermärke via plattformen).
- `gsap.delayedCall(1.6, () => this._nextRound(ctx))` (skyddat av `_alive`).

## Progression & nivåer
Oändlig lek. Använd `ctx.progress`:

- `level` läses från `ctx.progress.get().highestLevel` (default 1) vid `init`. Spara `ctx.progress.setLevel(level+1)` efter varje färdig runda.
- Per-runda parametrar skalar mjukt med level (cap så det aldrig blir stressigt):
  - **Mål N (klappar per runda):** `5 + (level-1)` capad vid ~10.
  - **Antal hål:** level 1 → 3×2 (6); level 3 → 4×2 (8); level 5+ → 4×3 (12). Cap vid 12.
  - **Uppe-tid per mullvad:** start 3,2 s, minskar 0,2 s/level, **golv 2,0 s** (alltid generöst).
  - **Spawn-intervall:** start 1,6 s, minskar 0,1 s/level, golv 1,0 s.
  - **Samtidigt uppe:** level 1 → 1, ökar till max 2–3 på högre nivåer.
- `custom`: spara `ctx.progress.setCustom('rundor', (custom.rundor||0)+1)` för statistik. Inget poäng som kan sjunka.

## Tillgångar (programmatiskt)
Inga externa filer. Allt via Pixi Graphics + Text-emoji.

- **Mullvad:** emoji 🐹 som `new Text({text:'🐹', style:{fontFamily:FONT.body, fontSize:84}})`, `anchor.set(0.5)`. (Alternativ kropp via Graphics: brun ellips-kropp + två svarta ögon-cirklar + rosa nos — men emoji räcker och är enklast.)
- **Hål:** `Graphics` mörkbrun ellips + kant (se layout).
- **Äng-bakgrund:** `Graphics` gröna rektanglar.
- **Hål-clip-mask:** `Graphics` rektangel som mask på mullvad-containern så den klipps vid hålkanten.
- **Räknar-ikoner:** emoji 🥕 (Text) eller stjärna-Graphics.
- **Partiklar/konfetti:** via `puff` / `bigCelebration` (lib/feedback).
- **Dekor (valfritt):** några 🌼/🌱 utspridda (Text, `eventMode='none'`).

## Återanvänd dessa
- `ctx.services.audio.sfx('pop'|'pling'|'soft'|'celebrate')`, `ctx.services.voice.say(...)`.
- `ctx.progress.complete()`, `get()`, `setLevel(n)`, `setCustom(k,v)`.
- `lib/feedback.js`: `pop`, `wiggle`, `puff`, `bigCelebration`.
- `lib/swedish.js`: `randomFrom` (för PRAISE), ev. `shuffle` (välja vilka hål som spawnar).
- `lib/theme.js`: `FONT`, `COLORS`, `PLAYFUL`, `PRAISE`.
- `ctx.ticker` (driver spawn-timer & uppe-tid via `deltaMS`), `ctx.fxLayer` (konfetti).
- **Ej** DragController/Button (rent tap-spel; GameHost äger headern).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `this._alive = false` först i `destroy`. Alla `gsap.delayedCall`/tween-`onComplete`/ticker-callbacks kontrollerar `if (!this._alive) return`.
- **Dubbeltryck under "resolving":** ignorera tap om `mole._resolving` eller `!mole._up`.
- **Exit mitt i animation:** `destroy(ctx)` ska:
  - `ctx.ticker.remove(this._tick)`
  - `gsap.killTweensOf(...)` på alla mullvad-containrar och deras `scale`, samt `this._layer`
  - döda eventuella `delayedCall` (spara referenser, `.kill()`), nolla spawn-timer
  - `this._layer?.destroy({children:true})`
- Spawn-logik via ackumulerad tid i ticker (inte `setInterval`), så den fryser korrekt och städas med tickern.
- Idle-recue: håll en `_idle`-timer; om ingen klapp på ~6 s → `voice.say(this.voiceIntro)` och låt en mullvad vinka (puls). Nollställ `_idle` vid varje tap.
- Vid `_nextRound` rensa gamla mullvad-tweens innan nya hål byggs (mönster som i klambubblor `_build`).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/klappa-mullvaden/index.js` och default-exportera GameModule-objektet med metadata enligt tabellen ovan.
2. I `init(ctx)`: sätt `this._alive=true`; skapa `this._layer = new Container()`, `ctx.stage.addChild(this._layer)`; rita äng-bakgrund + osynlig bakgrunds-träffyta (`pointertap` → tomt-tryck-respons); läs `level` från `ctx.progress.get().highestLevel`.
3. Skriv `_buildField(ctx)`: beräkna cols/rows från level, rita hål-rutnätet, skapa en mullvad-container per hål (Text 🐹 + clip-mask), placera nere/gömd, koppla `pointertap`-handler `_whack(ctx, mole)`. Nollställ räknare och rita 🥕-rad.
4. Skriv spawn-/timer-logik i `this._tick = (ticker) => this._update(ctx, ticker)` och `ctx.ticker.add(this._tick)`: ackumulera tid, res slumpvald gömd mullvad upp (tween y), starta dess uppe-timer (dyk ner automatiskt efter uppe-tid), respektera "samtidigt uppe"-cap, hantera idle-recue.
5. Skriv `_whack(ctx, mole)`: guarda `_alive`/`_up`/`_resolving`; spela `pop`/`pling`; `pop(mole)`+`puff`; öka räknare; var 3:e → beröm; tween mullvad ner; om räknare ≥ N → fira (`celebrate`, `bigCelebration`, `voice.say`, `ctx.progress.complete()`, `setLevel`, `setCustom('rundor',...)`), `gsap.delayedCall(1.6, _nextRound)`.
6. I `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
7. I `destroy(ctx)`: sätt `_alive=false`, `ctx.ticker.remove(this._tick)`, döda alla tweens/delayedCalls, `this._layer.destroy({children:true})`.
8. Registrera i `src/games/registry.js`: importera modulen och lägg till den i `GAMES`-arrayen.
9. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp (GameHost), röst-repris, klapp-feedback, runda-firande och att `highestLevel`/`rundor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras i biblioteket utan konsolfel (inga errors/warnings vid `init`/`mount`).
- Canvas renderas; minst ett hål-rutnät finns och mullvadar poppar upp över tid (verifierbart via exponerad teststat eller visuell snapshot efter wait).
- Tap på en uppe-mullvad ger respons: räknaren ökar och mullvaden dyker (verifiera via state-hook/`progress`/DOM-räknare eller stabil snapshot-diff).
- Tomt tryck (på ängen/tomt hål) ger ingen krasch och ingen negativ förändring (räknare oförändrad, inga felljud) — mjuk respons.
- När rundans mål nås anropas `ctx.progress.complete()` (verifiera via spionerad/spårad progress eller att stjärnor/klistermärke i sparad profil ökat) och en ny runda startar (oändlig lek).
- Inga felsteg/game over: inget tillstånd där spelet blockerar input eller visar bestraffning.
- Progress persisterar: efter en färdig runda och sidomladdning är `highestLevel` (och/eller `custom.rundor`) i localStorage `pwagames.save.v1` ökat.
- `destroy` städar: efter exit till bibliotek finns inga kvarvarande tickers/tweens som loggar fel (ingen konsol-error efter unmount).
