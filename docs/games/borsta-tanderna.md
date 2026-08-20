# Borsta Pappas tänder (`borsta-tanderna`)

> 🪥 roligt · mixed · 2–5 år · status: byggt v1.230.0, kritikerrundan återstår

**LÄGET 2026-08-20 (v1.230.0):** BYGGT och testat. `npm run check` 0/0 ·
`npm run test borsta-tanderna` grön, 0 konsolfel · `node scripts/_borstprobe.mjs` **9/9 gröna**.
Spelet är femte spelet i ansiktssektionen (`docs/IDEER.md` post 4) efter `mata-munnen`,
`titt-ut-pappa`, `vakna-pappa` och `flugan-pa-nasan`. Commit `4b9e361`.

⚠️ **KVAR INNAN SPELET ÄR MARKNADSKLART:** kritikerrundan (steg 6–7 i `/spel`) är INTE körd,
och tre saker syns i skärmdumpen — se §6.

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

**⓵ Nära bild: `hojd: 880`.** ✅ Talet står kvar — men RESONEMANGET under det var fel, och
den rättelsen är hela §3.

~~Vid `hojd: 880` (k = 1,10) blir munnen **191×155 px**.~~ **NEJ.** 191×155 är manifestets
mun-RUTA, och den rutan är till tre fjärdedelar skymd av överläppen och käken. Den yta som
faktiskt SYNS — och alltså går att borsta — är **186 × 37 px**. Se §3.

Resten av stycket håller: hjässan hamnar utanför bildkanten (han lutar sig fram mot kameran,
som hos tandläkaren), ögonen syns så minerna bär, och ansiktets synliga innehåll är 472 px
brett — hyllan med tuberna får resten till höger.

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

## 3. Vad som mättes (och vad mätningen ändrade)

### ⓵ Munnen är ingen håla — den är en tandrad (`scripts/_gapprobe.mjs`, NY)

Spec-kortets ⓶ vilade på att munnen blir "191×155 px" vid `hojd: 880`. Det är manifestets
mun-RUTA. Sonden bytte mun-lagret mot en **magenta platta i samma läge och samma index** och
mätte hur mycket av den som syns när käken sjunker — allt annat i riggen står kvar, så
överläppen och käken skymmer plattan exakt som de skymmer fotot.

| gap | synlig mun-inre (`hojd: 880`) | (`hojd: 1100`) |
|---|---|---|
| **0,00** | **0 px** ← KONTROLLARM | 0 px |
| 0,35 | 1 229 px · 186 × 8 | 1 996 px · 233 × 10 |
| 0,70 | 4 172 px · 186 × 23 | 6 444 px · 233 × 29 |
| **1,00** | **6 596 px · 186 × 37** | 10 358 px · 233 × 46 |

Kontrollarmen är tyst (0 px vid stängd mun), så talet är munnen och inget annat.

**Följden för designen:** munnen är en bred, låg TANDRAD, inte en håla att föra in en borste
i. Det är också vad tandborstning ÄR — ett vågrätt svep längs en rad — så kärnloopen
överlever oförändrad. Det som flyttade sig är var belöningen bor: **skummet**, inte hålan.
Det svämmar ut över läppar, mustasch och haka där det finns hur mycket plats som helst, och
det är det barnet ser växa. 37 px rymmer inget lödder som VÄXER.

### ⓶ `hojd: 1100` prövades och föll — på BILDEN, inte på talen

Spelet byggdes först på 1100 för de nio extra pixlarna remsa. Skärmdumpen visade vad talet
inte kunde: ett ansikte på 590 px brett och 1100 högt i en ruta på 1280×720 blir en närbild
som tränger undan hyllan, kranen och maskoten, och hjässan är inte "beskuren" utan borta.
Tillbaka på spec-kortets 880 — nu av ett **mätt** skäl i stället för ett antaget.
Ett tal ensamt kunde inte avgöra den frågan.

### ⓷ `scripts/_borstprobe.mjs` (NY) — sonden som SPELAR spelet

Testharnessen rörde aldrig borsten: `drag/foremal 1`, och **noll** `drag/ratt`/`slapp`/`miss`.
Hela kärnloopen var grön och omätt. Sonden kör två kontrollarmar före mätarmarna.

| Mätning | Kontrollarm | Utfall |
|---|---|---|
| Vila | — | gap 0 · smuts 4/4 · skum 0 ✓ |
| Borsten hålls vid VÄGGEN, samma sveprörelse | draget bevisat levande (`drar true`) | gap 0,00 · smuts oförändrad ✓ |
| Gapar han vid borsten? | kontrollarmen ovan | **0,00 → 0,988** ✓ |
| Borstas smutsen bort? | smutssumman före | 4,00 → 0,00 ✓ |
| Växer skummet? | 0 klickar före | 0 → 14 ✓ |
| Går målet att nå? | — | 4/4 rena · fas `skolj` · glaset lyser ✓ |
| Gurglar han? | — | `busy` ✓ |
| Exit mitt i sköljningen | — | 0 konsolfel ✓ |

**Fyra buggar som BARA sonden kunde hitta — alla med grönt test och noll konsolfel:**

1. **Borsten gick inte att ta i.** `verktyg.js` sätter `eventMode = 'none'` på alla
   innernoder (rätt för dekor), och en bar `Container` utan `hitArea` träfftestar aldrig sig
   själv. `addItem` sätter visserligen `eventMode = 'static'` på vyn, men det fanns ingen
   geometri att träffa. **Permanent död träffyta i spelets enda dragbara föremål.** Fixen är
   en explicit `hitArea` på 112 × 220 px. (Först misstänktes `_borsteL`s
   `interactiveChildren = false` — det var också fel och är rättat, men det var inte orsaken.)
2. **Gapet öppnade sig aldrig när borsten kom fram.** Borsten förs in NERIFRÅN, så huvudet är
   "djupt inne" redan första bildrutan → `gasp`-kittlingen sköt igång → och en min anropar
   `gap(0)`. Uppmätt: `gap 0,00` med borsten bevisligen på raden och `min gasp` 399 ms kvar.
   Kittlingen kräver nu att munnen faktiskt är öppen OCH att man borstat i 0,6 s.
3. **Kinden åt upp det barnet gjorde.** Borsten måste korsa kinden för att nå munnen, och
   `skratt`-lappen där stängde munnen precis när man kom fram (uppmätt 462 ms kvar).
   En zon måste nu DRÖJAS KVAR i 0,3 s — att kittla pappa på kinden är roligt när man stannar
   där, på vägen in är det brus.
4. **ÅTERVÄNDSGRÄND (P0-brott).** Tungans svep är 0,62 s långt och kunde landa EFTER att
   sista fläcken blev ren. Då står fasen på `skolj`, `_arbeta` bailar, och den återställda
   fläcken går aldrig att borsta bort igen. Uppmätt: **rena 3/4, fas skolj, 26 extravarv utan
   att talet rörde sig.** Exakt `mata-munnen`s busade mat, och lika osynlig utan en sond som
   spelar klart.

**Och en läxa om mig själv:** jag gissade orsaken till gap-nollan TVÅ gånger (först
kindzonen, sedan kittlingen) och byggde en fix på varje gissning innan jag lade in
`minKvar`/`_gapNu`/`iRad` i sondens avläsning. Den ena raden diagnostik avgjorde frågan
direkt. Båda gissningarna råkade peka på riktiga buggar, vilket är precis varför de kändes
bekräftade — men ordningen var fel, och den kostade två sondkörningar.

## 6. Öppna trådar (INTE gjorda)

- **Kritikerrundan är inte körd** (`/spel` steg 6–7). Spelet är testat, inte granskat som lek.
- **Borsthuvudet läser som ett förstoringsglas** — en stor rund vit skiva med borst i. Skaftet
  är däremot omedelbart läsbart. Art-fix i `verktyg.js`.
- **Handduken läser som en jättetub tandkräm** — mer tub-lik än de riktiga tuberna, och den
  går inte att trycka på. Ett barn kommer att peka på den. Art-fix i `badrum.js`.
- **Tuberna läser som burkar**, inte som hoprullningsbara tuber.
- **`TUBER` bär ett oanvänt `replik`-fält** (6 repliker, en per smak). Antingen koppla in dem
  OCH lägg dem för hand i `voice-phrases.json` (`check.mjs` kan inte se tabellbyggda
  strängar), eller ta bort fältet. Död data som ser levande ut är sämre än båda.
- **`pappa_slurp` och `pappa_gurgla` finns inte inspelade.** Spelet faller på en stämd ton och
  tar klippen i bruk automatiskt via `audio.harSample()` när de landar. `borsta_skrubb` ligger
  i `scripts/sfx-phrases.json` och väntar på `npm run sfx`.
- **`samlaNoder`/`rivTrad` är nu skriven en TREDJE gången** (här, `flugan-pa-nasan/verktyg.js`,
  `vakna-pappa/verktyg.js`). Hör hemma i `lib/feedback.js` — delade filer rördes inte under bygget.

## 5. Status / loggar

`2026-08-20 · spec-kortet framlagt och godkänt av ägaren; ingen kod skriven · —`
`2026-08-20 · BYGGT v1.230.0 (commit 4b9e361) · check 0/0 · test grön · _borstprobe 9/9 ·
två nya sonder (_gapprobe, _borstprobe) · fyra buggar hittade av sonden, varav en
P0-återvändsgränd · kritikerrundan återstår`

