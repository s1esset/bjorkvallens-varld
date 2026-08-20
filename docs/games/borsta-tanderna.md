# Borsta Pappas tänder (`borsta-tanderna`)

> roligt · mixed · 2–5 år · 📝
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

**LÄGET 2026-08-20:** spec-kortet nedan är **framlagt och godkänt av ägaren** — ingen kod är
skriven än. Nästa handling är steg 2 `bygg` i `/spel`-pipelinen (checkpointen ligger i
`.claude/state/korning.json`, plocka upp med `/aterta`). Spelet är fjärde spelet i
ansiktssektionen (`docs/IDEER.md` post 4) efter `mata-munnen`, `titt-ut-pappa`,
`vakna-pappa` och `flugan-pa-nasan`.

⚠️ **Läs `docs/games/mata-munnen.md` §3 innan bygget** — den bär vad ansiktsriggen faktiskt
klarar, och den bär den återvändsgränd som bara en sond som SPELAR spelet hittade.

## 0. Spec (godkänd av ägaren 2026-08-20)

| | |
|---|---|
| **id** | `borsta-tanderna` |
| **titleSv** | Borsta Pappas tänder |
| **icon** | 🪥 |
| **kategori** | `roligt` → flik **Roligt** (sektionsbeslut 5: egen flik först när sektionen bär den) |
| **input** | mixed — tap på tandkrämstuben, drag med borsten (tap-tap-fallback) |
| **ålder** | [2, 5] |
| **kärnloop** | ⓵ tryck på en tandkrämstub på hyllan → klicket kläms ut på borsten, och han smakar den direkt (mint → `chock` + frostglimt · jordgubb → `lycksalig` · banan → `skratt`). ⓶ DRA borsten in i den gapande munnen och skrubba fram och tillbaka — där borsten går försvinner smutsen och skummet växer, och skrubbljudets tonhöjd följer farten. ⓷ ansiktet reagerar på VAR borsten är, löpande: framtänder → `nojd` + hummande · långt in → `gasp` (kittlas) · utanför munnen (kind/näsa/öra) → `skratt` + han lutar undan (`lutaMot`) · hakan → `forvanad`. ⓸ alla fläckar borta → tryck på vattenglaset → skölj |
| **mål** | 5–7 smutsfläckar bortborstade + sköljningen → `progress.complete()` + klistermärke, sedan **ny omgång med ny smuts** (fri lek fortsätter, aldrig slut) |
| **agens** | VILKEN tandkräm (skummets färg, hans smak-min, ljudet) · VAR du borstar (smuts försvinner bara där du varit, och varje zon har sin reaktion) · om du borstar tungan också (bonus: extra fräsch, en stjärna) |
| **variation** | smutstyp per omgång (spenat · choklad · sylt · blåbär — olika färg och antal) · tubpoolen roterar · sällsynt wow (~1 på 8): glittertandkräm → regnbågsskum och alla tänder blixtrar samtidigt |
| **motgång** | **TUNGAN SLICKAR** — han retas och slickar bort skummet från EN fläck (`retas`-minen finns i manifestet, + slurp-ljud). Tak: max 1 åt gången, tidigast var 8:e sekund, går att borsta om direkt. Saktar ner, avslutar aldrig (P0 MOTGÅNG) |
| **mottagare** | Pappa själv (han beundrar resultatet) + **Bobo** på handfatskanten som räcker fram vattenglaset och jublar |
| **finish** | sköljningen: han gurglar (gap-vaggning), spottar skummet i handfatet med ett plask, ler brett — och ett **PLING med en stjärnglimt som studsar av framtanden**. Ingen generisk konfetti |

**Röstrepliker (7 literaler — måste stå som `voice.say('literal')`, annars får de aldrig ett klipp)**
```
"Borsta pappas tänder!"
"Välj en tandkräm på hyllan!"
"Titta, det skummar och bubblar!"
"Hihi, det kittlas!"
"Oj, tungan slickade bort skummet!"
"Nu är alla tänder rena — skölj munnen!"
"Wow, vilka blanka tänder pappa har!"
```

### Två designval som är MÄTTA, inte gissade — ändra dem inte utan en ny mätning

**⓵ Nära bild: `hojd: 880`, inte `mata-munnen`s 520.**
Fotorutan är `733×800` och mun-lagret `170×138` (ur `public/ansikte/pappa/manifest.json`).
Vid `hojd: 520` blir munnen **110×90 designpixlar** — under P0:s 96 px med noll marginal och
omöjlig att sikta i. Vid **`hojd: 880`** (k = 1,10) blir munnen **191×155 px**, och
uppskalningen är bara 1,13× av källan (knappt synlig). Hjässan hamnar då utanför bildkanten:
han lutar sig fram mot kameran, som hos tandläkaren. Ögonen syns fortfarande, så minerna bär.
Ansiktet blir ~806 px brett — hyllan med tuberna får de ~350 px som blir över till höger.

**⓶ Munnen är EN yta, inte sex tandknappar.**
Enskilda tänder blir ~30 px vid `hojd: 880` och kan aldrig bli träffytor. Smutsen ligger
utspridd i munområdet och borsten har en generös kontaktradie (~55 px): barnet sveper och
träffar alltid något. Zonreaktionerna UTANFÖR munnen går via `ansikte.traffar(x, y, marg)`
— och den läser en radprofilerad silhuett, inte en ellips (`mata-munnen` prövade en ellips och
den var fel åt båda hållen samtidigt: 32 % tom bakgrund inne i zonen, 19 % ansikte utanför).

## 2. Ursprunglig plan & tankeprocess

Idén kommer ur `docs/IDEER.md` post 4 (ansiktssektionen): *"dra tandborsten i den gapande
munnen, ansiktet reagerar på var man är"*. Det pedagogiska målet är vardagsrutinen — ett
2-åring som borstar pappas tänder på skärmen borstar lättare sina egna — men leken bär själv:
grimasen ÄR återkopplingen, och att få kittla pappa med en tandborste är rolig makt.

Varför just den här mekaniken: riggen kan `gap()`, och ett öppet gap som står kvar en längre
stund är precis vad `mata-munnen` ALDRIG gör (där gapar han i en halv sekund per tugga). Ett
ihållande gap är alltså outnyttjad yta i den rigg som redan är byggd och mätt.

## 4. Plan inför bygget (taggad)

**Kärnloop** · [Medium]
- `DragController` för borsten med munnen som mottagare — men släppet är INTE poängen; det är
  **rörelsen medan man håller** som borstar. Läs `drag/ratt` i `.test-logs/borsta-tanderna.json`
  efter första testkörningen: står den på 0 har harnessen aldrig spelat spelet
  (`docs/games/mata-munnen.md` §3), och då krävs en sond som drar från borstens FAKTISKA läge.
- Smutsen som en lista fläckar med `{ x, y, r, kvar: 0–1 }`; borstens kontaktradie sänker
  `kvar` per bildruta den överlappar. Skummet växer i samma takt i samma punkter.

**Juice** · [Quick]
- Skrubbljudet: `audio.tone()`/brus vars tonhöjd följer dragets fart (samma familj som
  `_slagprobe`s fart→volym+tonhöjd). Aldrig ett generiskt UI-klick.
- Borsten är ett **fristående ritat föremål** (P0 ASSETS): eget skaft, egna borst, vilo-guppning
  och böjda borst mot tandytan när man trycker. Aldrig en 🪥 i en ruta.

**Karaktär** · [Quick]
- Ansiktet ska LEVA under hela borstningen: `liv()` fortsätter, `nick()` när det kittlas,
  `lutaMot()` när borsten går utanför munnen.
- ⚠️ Minerna ligger ÖVER ögonlagren i riggen, så han kan inte blinka medan en grimas visas —
  håll minerna korta under borstningen och låt `nick()` bära livet (se filhuvudet i
  `src/lib/ansikte.js`).

**Ljud** · [Quick]
- De 7 replikerna in i `scripts/voice-phrases.json` som pending; Web Speech täcker upp tills
  `/rost` körs.
- Pappas egna uttrycksljud (`brr`, `puh`) finns inte inspelade än — förbered sample-namnen och
  låt `audio.harSample()` ta dem i bruk automatiskt när de landar, precis som `mata-munnen`.

**Exit-säkerhet** · [Quick]
- `_alive`-flagga + `feedback.js`-hjälparna. Sköljningens gurgling är en flerstegsanimation —
  exit mitt i den är precis det testharnessen kör.

## 5. Status / loggar

`2026-08-20 · spec-kortet framlagt och godkänt av ägaren; ingen kod skriven · —`
