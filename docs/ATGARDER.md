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

## Avklarat

*(tomt — flytta hit med commit-hash när en rad är fixad och testad)*
