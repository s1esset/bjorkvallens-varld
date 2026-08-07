# ÅTGÄRDER.md — rapporterade buggar som väntar på fix

Buggar som **ägaren har sett när hen spelat**, i väntan på `/fixa <id> <fel>` eller `/felsok <id>`.
Nyast överst. En rad per fel, inte per spel.

Status: ⬜ ej påbörjad · 🟨 pågår · ✅ fixad (rad flyttas till "Avklarat" med commit).

> Rutan **Första spår** är en *ledtråd från kodläsning*, inte en verifierad diagnos. `/fixa`
> ska alltid reproducera felet i harnessen först — ett plausibelt men falskt spår får inte
> generera en ändring. Se `.claude/commands/fixa.md`.

---

## Öppna

| # | Spel | Fel (som det rapporterades) | Första spår | Status |
|---|------|------------------------------|-------------|:--:|
| 1 | `magnet-fiske` | **Allt sitter redan fast i magneten när spelet startar** — inget att fiska upp. | Sakerna läggs ut i `SPAWN` (y 245–565) och magneten parkerar på `PARK` (560,130), alltså långt utanför `STICK_R` (46) — så det är troligen **inte** överlapp vid start. Titta i stället på om den radiella attraktionen drar innan barnet rört spöet, och på hur `it.slot`/`this._stuck` sätts (`src/games/magnet-fiske/index.js:~413–430`). | ⬜ |
| 2 | `magnet-fiske` | **De fastklistrade sakerna skakar/jittrar.** | `SLOTS`-solfjädern positionerar varje fastnad sak varje tick medan matter-kroppen också vill styra den — två ägare till samma position ger darr. Kolla om kroppen görs statisk/tas ur världen när den fastnar. | ⬜ |
| 3 | `saftbaren` | **Ljudet hakar upp sig när en vätska har bytt färg.** | Häll-loopen fyrar en `audio.tone` per droppe (`index.js:~919`) och `_recolor()` går igenom varje partikel. Misstanke: toner staplas utan strypning när omfärgningen triggar om. Kontrollera att tonen är throttlad och att `_recolor` inte fyrar ljud per partikel. | ⬜ |
| 4 | `saftbaren` | **Vätskan flyttas till de glas man drar över/förbi** med ett annat glas — saften byter glas i stället för att stanna. | `_carryAll()` (`index.js:~725–755`) har redan en ägarregel, men tie-breaken är `it.g.y > own.y` (lägsta glas vinner) och gränserna är generösa (`IN_W/2 + 8`, `ly > IN_TOP − 30`). Ett glas som dras förbi kan därför bli "lägst" ett ögonblick och rycka med sig partiklarna. Ägarskap bör troligen låsas till glaset partikeln **vilade i**, inte omvärderas varje bildruta. | ⬜ |

## Verktygsfynd

Hittade av harnessen/bildkollen, **inte** rapporterade av ägaren — därför i egen tabell. Samma
regel gäller: reproducera innan du ändrar.

| # | Var | Fynd | Bevis | Status |
|---|-----|------|-------|:--:|
| V3 | `spara-linjen` | **Tommaste scenen i repot** — 4,3 % innehåll (näst lägst: 9,8 %). Tom vit panel, fyra grå prickar, ✏️-emoji som hela verktyget. Plan finns i spelets doc §4. | `bildkoll.mjs` `gles-scen`, enda utslaget av 71 spel. | ⬜ |

## Avklarat

| # | Var | Fel | Fix | Commit |
|---|-----|-----|-----|--------|
| V1 | `VoiceService` (app-brett) | Introt talades av robotrösten trots att klippet fanns — `mount()` sade `voiceIntro` innan manifest-fetchen i konstruktorn hunnit fram. | `say()` skjuter upp repliken tills manifestet landat (tak 1500 ms); `cancel()` ogiltigförklarar en väntande replik (exit-säkerhet). `gamelog` dömer likadant: loggraden skrivs i tid, fyndet väntar in manifestet. **Mätt: 16 spel / 17 träffar `rost-utan-klipp` → 0 av 71.** | `ec21e80` |
| V2 | `vippbradan:380` + `check.mjs` | Repliker byggda med template literal fick aldrig ett klipp och varnade aldrig. | Template-repliker kan inte slås upp statiskt — de räknas nu (27 st) och verifieras där sanningen finns: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json` och varnar för den **exakta** texten. Backtick utan `${}` läses som vanlig literal. Hittade 4 äkta luckor, noll falska: "Lätt vikt!" + "Tung vikt!" (`vippbradan` — `voice-phrases.json` hade Liten/Stor, etiketterna heter Lätt/Tung), "Nästan!" (`bygg-tornet`), "en" (`ballonglyft`). Alla fyra har klipp nu. | `ec21e80` |
