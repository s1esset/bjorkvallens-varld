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
| — | — | *(inga öppna ägarrapporter)* | | |

## Verktygsfynd

Hittade av harnessen/bildkollen, **inte** rapporterade av ägaren — därför i egen tabell. Samma
regel gäller: reproducera innan du ändrar.

| # | Var | Fynd | Bevis | Status |
|---|-----|------|-------|:--:|
| V3 | `spara-linjen` | **Tommaste scenen i repot** — 4,3 % innehåll (näst lägst: 9,8 %). Tom vit panel, fyra grå prickar, ✏️-emoji som hela verktyget. Plan finns i spelets doc §4. | `bildkoll.mjs` `gles-scen`, enda utslaget av 71 spel. | ⬜ |
| V5 | `bajs-och-kiss` | **Faller bara i FULL `test:all`** — `pageerror ×3`, `tween-lacka ×2` (GSAP-tween lever efter destroy), `tween-mot-forstort ×2` (GSAP animerar ett förstört objekt). Ensamt: grönt. Fyra parallellt: grönt. Alla 71: rött, i två körningar i rad. | Alltså last-/timingberoende i exit-cykeln, inte slumpmässigt flakigt. Repro: `npm run test:all` och läs `.test-logs/bajs-och-kiss.json` från DEN körningen (en enskild omkörning skriver över den). Leta efter en tween som startas i finish/teardown utan `_alive`-vakt eller utan `killTweensOf` i `destroy`. Upptäckt 2026-08-07; orört av `1e3f20a`/`dd6b3aa`, som bara rör `magnet-fiske` + `saftbaren`. | ⬜ |
| V4 | `saftbaren` | **Hällningen flyttar noll vätska** — spelets kärnloop ("häll ett glas i ett annat → färgerna blandas") gör ingenting. Hela sekvensen körs snyggt (glaset åker till rätt plats, når vinkel 1,02, väntar, åker hem) men inte en droppe lämnar glaset. Gäller både tryck-tryck (`_autoPour`) och drag. | `scripts/_tiltprobe.mjs` på ett nästan fullt glas (103 partiklar): `TILT` 1,05 → **0 rann ur**, 1,2 → 1, **1,35 → 19**, 1,5 → 23, 1,7 → 22. `TILT = 1,05 rad` ligger alltså under tröskeln för glasets geometri. Verifierat på HEAD → inte en regress. **Obs:** en större `TILT` svänger mynningen längre ut, så `OFFS = 205` måste mätas om samtidigt, annars hamnar strålen bredvid målglaset. | ⬜ |

## Avklarat

| # | Var | Fel | Fix | Commit |
|---|-----|-----|-----|--------|
| V1 | `VoiceService` (app-brett) | Introt talades av robotrösten trots att klippet fanns — `mount()` sade `voiceIntro` innan manifest-fetchen i konstruktorn hunnit fram. | `say()` skjuter upp repliken tills manifestet landat (tak 1500 ms); `cancel()` ogiltigförklarar en väntande replik (exit-säkerhet). `gamelog` dömer likadant: loggraden skrivs i tid, fyndet väntar in manifestet. **Mätt: 16 spel / 17 träffar `rost-utan-klipp` → 0 av 71.** | `ec21e80` |
| V2 | `vippbradan:380` + `check.mjs` | Repliker byggda med template literal fick aldrig ett klipp och varnade aldrig. | Template-repliker kan inte slås upp statiskt — de räknas nu (27 st) och verifieras där sanningen finns: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json` och varnar för den **exakta** texten. Backtick utan `${}` läses som vanlig literal. Hittade 4 äkta luckor, noll falska: "Lätt vikt!" + "Tung vikt!" (`vippbradan` — `voice-phrases.json` hade Liten/Stor, etiketterna heter Lätt/Tung), "Nästan!" (`bygg-tornet`), "en" (`ballonglyft`). Alla fyra har klipp nu. | `ec21e80` |
| 1 | `magnet-fiske` | Allt satt redan fast i magneten vid start — inget att fiska upp. | Fältet var ~280× för starkt OCH påslaget medan magneten hängde parkerad i luften. Krafterna anges nu i px/steg (`SPEED_TO_A`) och fältet verkar bara när magneten är **doppad**. Mätt: 5/5 fast utan input → **0/5 efter 8 s**, toppfart 79 → 2,6 px/steg, `_idleprobe` 0. Första spåret ("troligen inte överlapp vid start") var rätt om överlappet men missade att attraktionen drog direkt. | `1e3f20a` |
| 2 | `magnet-fiske` | De fastklistrade sakerna skakade. | Rätt gissat spår: två ägare till positionen. Kropparna pinnas till sin slot varje bildruta men **krockade** fortfarande — slottarna ligger 38 px isär, kropparna har 38 px radie, så solvern sprängde isär klasen varje steg. `isSensor` i `_stick`. Mätt: 53 px svängning och 47 px hopp → **0,1 px**. | `1e3f20a` |
| 3 | `saftbaren` | Ljudet hakade upp sig efter ett färgbyte. | Första spåret (ostrypt `audio.tone` i häll-loopen) var **fel** — den tonen är throttlad och `_recolor` gör inget ljud alls. Riktig orsak: `_lastMix` satt på spelet, inte på glaset, så två glas med var sin blandfärg pingpongade värdet var 12:e bildruta. Mätt: **48 ljud + 48 röstrepliker på 5 s utan input → 1 + 1.** | `dd6b3aa` |
| 4 | `saftbaren` | Vätskan följde med glas man drog förbi. | Spåret pekade rätt håll men på fel detalj: tie-breaken `it.g.y > own.y` var inte "generös", den var **omöjlig** — ett draget glas låg kvar på disken, alltså exakt samma y, så jämförelsen blev falsk och ägarskapet föll tillbaka på ordningen i `_glasses`. Hållna glas lyfts nu, och ägaren är det glas partikeln ligger djupast inne i. Mätt: **56 av 56 stulna → 0.** | `dd6b3aa` |
