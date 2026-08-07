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
| V5 | `bajs-och-kiss` | **Faller bara i FULL `test:all`** — `pageerror ×3`, `tween-lacka ×2` (GSAP-tween lever efter destroy), `tween-mot-forstort ×2` (GSAP animerar ett förstört objekt). Ensamt: grönt. Fyra parallellt: grönt. Alla 71: rött, i två körningar i rad. | **Undantaget är fångat:** `Uncaught TypeError: Cannot read properties of null (reading 'y')`, kastat inifrån GSAP (`node_modules/.vite/deps/chunk-YMUDJAOC.js:1745`) — alltså en tween som skriver `.y` på ett mål vars transform redan är rivet. Det stämmer med `tween-mot-forstort ×3`. I loggen föregås det av `render/lang-ruta 100 ms` + `fysik/svalt steg:5`: under full parallell last blir bildrutorna långa, och då hinner tweenen före teardown. Ensamt/fyra parallellt vinner teardown kapplöpningen och allt är grönt. Repro: `npm run test:all` (spara HELA utskriften — en enskild omkörning skriver över `.test-logs/bajs-och-kiss.json`). Leta efter en tween som startas i finish/teardown utan `_alive`-vakt eller som saknar `killTweensOf` i `destroy`. Upptäckt 2026-08-07; orört av dagens commits, som bara rör `magnet-fiske` + `saftbaren`. | ⬜ |

## Avklarat

| # | Var | Fel | Fix | Commit |
|---|-----|-----|-----|--------|
| V4 | `saftbaren` | Hällningen flyttade **noll** vätska — spelets kärnloop. | `TILT` och `OFFS` var aldrig mätta mot varandra: mynningen ligger på `(0, IN_TOP)`, så vid lutningen θ hamnar den `-IN_TOP·sin θ` px åt sidan. Vid 1,05 rad nådde saften aldrig över läppen. Kalibrerat med `scripts/_pourtune.mjs` mot antalet partiklar som hamnar I MÅLET (av ~103): `1,05 → 0` · `2,2/100 → 77` · `2,6/100 → 86`. Valt **TILT 2,2 + OFFS 100** (75 % över, minst spill). Hinken fick `MOUTH_DX` (fritt fall) och Bobo egna `SERVE_TILT/SERVE_OFFS` (han dricker, får inte saft hälld på sig). Fixen skapade i sin tur en bugg som mätningen fångade: ett fullt glas tappade allt till glas 2 när det gled förbi lågt → `SAFE_Y` + `_moveOver()` lyfter glaset över grannarna. **Mätt efter:** glas→glas 61 över och målet blir grönt (renhet 1,00) · glas→hink 58/58 slukade · Bobo serveras och dricker upp. | `5ee202a` |
| V1 | `VoiceService` (app-brett) | Introt talades av robotrösten trots att klippet fanns — `mount()` sade `voiceIntro` innan manifest-fetchen i konstruktorn hunnit fram. | `say()` skjuter upp repliken tills manifestet landat (tak 1500 ms); `cancel()` ogiltigförklarar en väntande replik (exit-säkerhet). `gamelog` dömer likadant: loggraden skrivs i tid, fyndet väntar in manifestet. **Mätt: 16 spel / 17 träffar `rost-utan-klipp` → 0 av 71.** | `ec21e80` |
| V2 | `vippbradan:380` + `check.mjs` | Repliker byggda med template literal fick aldrig ett klipp och varnade aldrig. | Template-repliker kan inte slås upp statiskt — de räknas nu (27 st) och verifieras där sanningen finns: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json` och varnar för den **exakta** texten. Backtick utan `${}` läses som vanlig literal. Hittade 4 äkta luckor, noll falska: "Lätt vikt!" + "Tung vikt!" (`vippbradan` — `voice-phrases.json` hade Liten/Stor, etiketterna heter Lätt/Tung), "Nästan!" (`bygg-tornet`), "en" (`ballonglyft`). Alla fyra har klipp nu. | `ec21e80` |
| 1 | `magnet-fiske` | Allt satt redan fast i magneten vid start — inget att fiska upp. | Fältet var ~280× för starkt OCH påslaget medan magneten hängde parkerad i luften. Krafterna anges nu i px/steg (`SPEED_TO_A`) och fältet verkar bara när magneten är **doppad**. Mätt: 5/5 fast utan input → **0/5 efter 8 s**, toppfart 79 → 2,6 px/steg, `_idleprobe` 0. Första spåret ("troligen inte överlapp vid start") var rätt om överlappet men missade att attraktionen drog direkt. | `1e3f20a` |
| 2 | `magnet-fiske` | De fastklistrade sakerna skakade. | Rätt gissat spår: två ägare till positionen. Kropparna pinnas till sin slot varje bildruta men **krockade** fortfarande — slottarna ligger 38 px isär, kropparna har 38 px radie, så solvern sprängde isär klasen varje steg. `isSensor` i `_stick`. Mätt: 53 px svängning och 47 px hopp → **0,1 px**. | `1e3f20a` |
| 3 | `saftbaren` | Ljudet hakade upp sig efter ett färgbyte. | Första spåret (ostrypt `audio.tone` i häll-loopen) var **fel** — den tonen är throttlad och `_recolor` gör inget ljud alls. Riktig orsak: `_lastMix` satt på spelet, inte på glaset, så två glas med var sin blandfärg pingpongade värdet var 12:e bildruta. Mätt: **48 ljud + 48 röstrepliker på 5 s utan input → 1 + 1.** | `dd6b3aa` |
| 4 | `saftbaren` | Vätskan följde med glas man drog förbi. | Spåret pekade rätt håll men på fel detalj: tie-breaken `it.g.y > own.y` var inte "generös", den var **omöjlig** — ett draget glas låg kvar på disken, alltså exakt samma y, så jämförelsen blev falsk och ägarskapet föll tillbaka på ordningen i `_glasses`. Hållna glas lyfts nu, och ägaren är det glas partikeln ligger djupast inne i. Mätt: **56 av 56 stulna → 0.** | `dd6b3aa` |
