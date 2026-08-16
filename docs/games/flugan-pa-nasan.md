# Flugan (`flugan-pa-nasan`)

> roligt · mixed · 2–5 · 📝
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

*Spel 3 av 3 i nattpasset (`docs/NATTPASS.md`). Spec-kortet kommer ur `docs/IDEER.md` post 2 ⓷.*

## 0. Spec

| | |
|---|---|
| **id** | `flugan-pa-nasan` |
| **titleSv** | Flugan |
| **icon** | 🪰 |
| **kategori** | `roligt` → flik **Roligt** |
| **input** | mixed (tap + enkelt drag med snäpp + tap-tap-fallback) |
| **ålder** | [2, 5] |
| **kärnloop** | En fluga surrar runt pappa; **han följer den med blicken hela tiden**. Den landar → `traffar()` avgör zonen (näsa · panna · kind · öra · haka · lugg) → egen min + eget ljud. Barnet viftar, blåser eller lockar den mot det öppna fönstret. |
| **mål** | Tre flugor ut genom fönstret → `progress.complete()` |
| **agens** | Tre verktyg, alla lika giltiga: **vifta** (den lyfter bort från trycket, alltså styr träffpunkten riktningen), **fläkten** (vindpust i en kon, tak en pust var 2:a s), **sylten** (ställ den vid fönstret så flyger flugan ut själv — 4-åringens aha). |
| **variation** | Zonpool + flugbanor roterar; sällsynt wow (~1 på 8): flugan sätter sig på ögat och han går vindögd. |
| **mottagare** | **Bobo** stänger fönstret och delar ut en medalj; pappa ger Bobo en `blinkning()`. |
| **finish** | Fönstret stängs, medaljen, winken. |

**Röstrepliker (7 literaler)**
```
"Titta, en fluga! Den kittlar pappa på näsan."   ← voiceIntro
"Tryck på flugan så flyger den iväg."
"Ställ sylten där du vill att flugan ska flyga."
"Blås med fläkten!"
"Hihi, den satte sig på örat!"
"Nu flög den ut genom fönstret!"
"Tack, säger pappa. Nu är det lugnt igen."
```

## 1. Nuläge (sett som spelare)

Ett soligt matrum. Pappa sitter vid ett bord vars skiva skär hans hals; till höger ett stort
öppet fönster med utsikt. På bordet en fläkt, papper, en kaffekopp och en syltburk. En fluga
surrar runt honom — och **han följer den med blicken**, hela tiden. Hon landar, han grimaserar
efter var hon satte sig, och barnet viftar, blåser eller lockar henne mot fönstret.

Skärmdump: `.test-shots/flugan-pa-nasan.png`.

### Vad sonderna mätte

`scripts/_blickprobe.mjs` har två lägen: blickflimret (se §2) och `--zoner`.

**Flugan landade nästan aldrig — och guldkornet nåddes ALDRIG.**

| | före | efter |
|---|---|---|
| landningar på 240 s | **2** | **47** |
| zoner som nåddes (av 6) | 2 | **6** |
| näsan (`blick_ner`) | **0** | 4 |

Flugans område spände hela rummet (x 150–1220), så hon passerade bara undantagsvis över
ansiktet. Fyra av sex byggda och betalda reaktioner var alltså osynliga, och den enda som
spec-kortet kallar spelets guldkorn var en av dem. Området är nu centrerat på pappa (en fluga
cirklar kring den den besvärar), och varje landning har ett uttalat **siktmål per zon** ur en
pool som töms innan den fylls på — så alla sex kommer innan någon kommer två gånger.
Siktmålet styr bara vägen; `traffar()` avgör fortfarande om hon verkligen rör vid honom.
Kontrollarmen stänger av träffytan och kräver **noll** landningar.

**Flugan föddes inne i målzonen.** Hon kommer in genom fönstret — samma väg hon ska ut — och
ut-testet slog till på första bildrutan: tre flugor "flög ut" utan att någonsin ha flugit, och
finalen kom efter en sekund. Testet var grönt hela tiden; det syntes i skärmdumpen, som visade
konfetti och medalj efter åtta sekunder. Rättat med en `armerad`-flagga: hon måste lämna
fönstret innan hon kan räknas som utflugen.

## 2. Mätfrågan som avgjordes FÖRE bygget — och som föll åt andra hållet

Spec-kortet bar en uttrycklig varning: `blick()`s hysteres (`BLICK_DOD 0,16` · `BLICK_HYST
0,14` · `BLICK_TID 0,13 s`) är inställd på en **långsamt dragen matbit**. En fluga rör sig
ryckigt och snabbt, och byts blicklappen oftare än ~**3 gånger per sekund** läser det som ett
ögonflimmer i stället för en blick — på ett fotoansikte alltså direkt obehagligt. Den kända
reserven var att **lågpassfiltrera flugans läge** innan det matas till blicken (aldrig att
ändra riggens konstanter — `mata-munnen` läser samma).

`scripts/_blickprobe.mjs` hakar på riggens egen `_blickTill()` och räknar **byten**, inte
alfa. Tre armar i samma körning, 20 s simulerad bana per arm:

| arm | byten | per sekund |
|---|---|---|
| långsam (samma bana, 1/5 farten) — **kontrollarm** | 8 | **0,4** |
| fluga (spelets riktiga bana, rått läge) | 24 | **1,2** |
| filtrerad (samma bana genom `Blickfilter`) | 16 | 0,8 |

**Svaret: filtret behövs inte.** Den råa flugan ligger på 1,2 byten/s, alltså under hälften av
gränsen. Riggens hysteres absorberar redan flugans ryck — vilket är rimligt när man tänker på
det: det finns bara tre blicklappar (`v` · `h` · `ner`) plus rakt fram, och en fluga som far
runt ansiktet håller sig mest inom samma kvadrant.

**Och det är tur att det mättes i stället för att byggas på förhand.** Nattpassets reserv var
"bygg med filtret på från början om talet inte går att få billigt" — men ett filter fördröjer
blicken, och att blicken **följer flugan** är hela själen i spelet. Att lägga in det i
förebyggande syfte hade tagit bort det spelet handlar om, för att lösa ett problem som inte
finns.

Kontrollarmen kördes först och separerar 1,2 mot 0,4 — mätningen KAN alltså skilja en ryckig
bana från en lugn, vilket är villkoret för att det låga talet ska betyda något.

**Banan importeras ur spelet**, inte återskapad i sonden (`src/games/flugan-pa-nasan/fluga.js`
delas av båda). `Blickfilter` står kvar i filen: den är den mätta reserven, sonden kör den som
tredje arm, och görs flugbanan ryckigare någon gång ska talet mätas om innan den plockas bort.

## 3. Vad gör det lättjefullt / tunt

*(fylls i av `spelkritiker` efter bygget)*

### Tre mekanismer som var inkopplade, korrekta — och ändå aldrig hände

Det är samma fel tre gånger, och det är värt att minnas: **att en mekanism finns, är rätt
skriven och anropas betyder inte att den inträffar.** Alla tre var gröna i testet.

1. **Fyra av sex ansiktszoner** (2 landningar/240 s → 47). Flugans område spände hela rummet.
2. **Nysningen** — den mekanism filhuvudet utpekar som garantin att barnet aldrig kan fastna.
   `NYS_TID` (6 s) var större än `SITT_MAX` (4,6), så den vanliga lyft-timeouten hann alltid
   först. `_nysa()` med gasp-minen, 20 partiklar och ATJOO:t spelades **aldrig**. Näsan får nu
   en egen, längre sitt-tid.
3. **Kaffekoppen och `kladdig()`.** Hela reaktionen (matt ton, hängande syltdroppe, tröggare
   vingflax) var byggd i `props.js` och aldrig inkopplad. Och att koppla in den räckte inte:
   flugans område är centrerat på pappa (x 160–680) medan koppen står på 1110 — hon kom
   aldrig i närheten. Koppen är nu ett eget siktmål (~18 % av landningsförsöken).

Sonden mäter numera alla tre.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- **[Quick] Verktygsbalansen lutar mot viftningen.** Den har ingen nedkylning och 192 px
  diameter, medan fläkten har 2 s cooldown och en fast kon. Doc-kortets "tre verktyg, alla
  lika giltiga" är sannare i avsikt än i praktiken. Inte trasigt — men sylten och fläkten
  skulle må bra av att vara snabbare vägar, inte bara andra.
- **[Quick] Zonfördelningen är ojämn** (uppmätt över 240 s: öra 16, haka 2). Poolen lottar
  jämnt, men de breda partierna nås lättare än hakan. Ett siktmål som inte nåtts inom N
  sekunder borde behållas i stället för att lottas om.

**Juice**
- **[Quick] Fönsterstängningen läser som ett fallande föremål**, inte som en lucka som
  stängs: rutan ritas av `index.js` (`_stangFonster`) och glider ner med `power2.in`, för
  `rummet.js` exponerar ingen styrning av bågen. Byt till avtagande ease, och gör om det
  ordentligt den dag rummet exponerar `bageNod`.

**Ljud**
- **[Quick] Ägarens inspelningslista** — spelet använder `pappa_oj aj huh retas fniss hmm
  gasp ehh` som alla finns. Inga nya klipp krävs.

## 5. Status / loggar

`2026-08-16 · doc skriven, mätfrågan avgjord (blickflimret: 1,2 byten/s, filtret behövs inte)`
