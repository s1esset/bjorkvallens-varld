# Flugan (`flugan-pa-nasan`)

> roligt · mixed · 2–5 · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

*Spel 3 av 3 i nattpasset 2026-08-16 (v1.225.0, se `docs/SESSIONS.md`). Körplanen
`docs/NATTPASS.md` är struken — passet är kört, och spec-kortet ur `docs/IDEER.md` post 2 ⓷
bor numera här nedan.*

## 0. Spec

| | |
|---|---|
| **id** | `flugan-pa-nasan` |
| **titleSv** | Flugan |
| **icon** | 🪰 |
| **kategori** | `roligt` → flik **Roligt** |
| **input** | mixed (tap + enkelt drag med snäpp + tap-tap-fallback) |
| **ålder** | [2, 5] |
| **kärnloop** | Flugor surrar in genom fönstret och besvärar pappa; **han följer den närmaste med blicken hela tiden**. Barnet väljer ett **verktyg** ur den utdragna skrivbordslådan och trycker där flugan är. Träffad fluga **plattas mot ytan**, glider ner på bordet, ligger 1–3 s — och flyger sedan **rakt ut genom fönstret**. Landar hon i stället på honom avgör `traffar()` zonen (näsa · panna · kind · öra · haka · lugg) → egen min + eget ljud. |
| **mål** | Rundans alla flugor ut genom fönstret → `progress.complete()`. 3 flugor i runda 0, upp till 6. |
| **agens** | **Fem verktyg** med var sin verkanstyp — flugsmälla (`slag`), sprayflaska (`vind`+`vat`), pilbössa (`slag`, med flygtid), hoprullad tidning (`slag`+`vind`, bred), klibbig slemhand (`klibb`). Plus **fläkten** (vindpust, tak en pust var 2:a s) och **sylten** (ställ den vid fönstret så flyger flugorna ut själva — 4-åringens aha). |
| **variation** | Rundan eskalerar: fart 300 → 540 px/s, 2 → **6 flugor samtidigt**, kortare `ryck` (nervösare bana) och större område. Landningen lottas mellan sex ansiktszoner, kaffekoppen och **rummets sju föremål**. Sällsynt wow (~1 på 8): flugan sätter sig på ögat och han går vindögd. |
| **rummet** | Sju träffbara saker med egen materialegenskap: klockan svajar och visarna snurrar · tavlan blir SNED och minns det · lampan blinkar/slocknar/tänds · pappren flaxar · kaffekoppen VÄLTER och spiller en pöl som lockar flugor och gör dem kladdiga · krukväxten skakar (och sträcker på sig av vatten) · gardinen bågnar. |
| **mottagare** | **Bobo** stänger fönstret och delar ut en medalj; pappa ger Bobo en `blinkning()`. Pappas andningstakt stiger med antalet flugor som sitter på honom (2,2 → 1,3 s). |
| **finish** | Fönstret stängs, medaljen, winken — sedan nästa, snabbare runda. |

**Röstrepliker (12 literaler + fem verktygsrepliker)**
```
"Titta, en fluga! Ta ett verktyg ur lådan och hjälp pappa."   ← voiceIntro
"Välj ett verktyg i lådan och tryck där flugan är."
"Ställ sylten i fönstret så flyger flugan ut."
"Blås med fläkten!"
"Hihi, den satte sig på örat!"
"Nu flög den ut genom fönstret!"
"Titta, den blev alldeles platt!"
"Oj, kaffet rann ut! Flugorna älskar det."
"Hoppsan, där tog du pappa i stället!"
"Fler flugor kommer in!"
"Tack, säger pappa. Nu är det lugnt igen."
```
Verktygens egna cue-repliker ligger som `cue` i `verktyg.js` och sägs vid verktygsbyte. De
byggs INTE av en template literal, men de står inte heller som `voice.say('literal')` på
anropsstället — `check.mjs` kan alltså inte se dem statiskt, och de är därför inlagda för hand
i `scripts/voice-phrases.json` (den dokumenterade backstoppen).

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

## 3b. Ombyggnaden 2026-08-16 (ägaruppdrag) — verktygen, rummet, rundan

Ägaren gav fem punkter. Alla fem är byggda; det som mätte dem är `scripts/_verktygprobe.mjs`,
som SPELAR spelet med riktiga muspekningar och läser spelets eget tillstånd (ingen skärmdump
kan svara på om en fluga faktiskt blev platt).

| ägarens punkt | vad som byggdes |
|---|---|
| ⓵ större ansikte | `ANS_H` 300 → **380**. `PLATS.ansikte.y` 330 → **292** i samma andetag: bordslinjen (472) står still, och hakan skulle annars ha sjunkit 34 px ner UNDER skivan. `rummet.js` bär kvoterna (hjässa H/2 upp, haka 0,4467·H ner, bredd 0,527·H) så nästa ändring går att räkna i stället för att gissa. |
| ⓶ verktyg med fysik | Fem verktyg i en **utdragen skrivbordslåda**, var och en med `radie · kraft · typ · droj · kyla`. Rummets föremål reagerar på **TYPEN**, inte på verktyget — därför skvätter kaffet av ett slag men inte av en spray, och ett sjätte verktyg kan läggas till utan att röra rummet. |
| ⓷ snabbare + fler flugor | `_sattRunda()`: fart 300 → 540 (tak), 2 → **6 samtidigt** (tak), 3 → 6 per runda, kortare `ryck` och större område per runda. Rundan bor i profilen. |
| ⓸ pappas komiska roll | Blicken följer den NÄRMASTE flugan (som förut, nu med upp till sex). Träffas hans ansikte av ett verktyg får han `chock`/`acklad`/`aj` + ryck + "Aj!" — aldrig ett straff, aldrig något som nollställs. Andningstakten stiger med antalet flugor på honom (2,2 → 1,7 → 1,3 s). |
| ⓹ mer i rummet | NYTT: skrivbordslampa (tänd lockar flugor), krukväxt, utdragen låda. GJORDA TRÄFFBARA: klocka, tavla, gardin, papper, kaffekopp. FLYTTADE: fläkten 700 → 660, sylten 500 → 430, pappren 900 → 880, koppen 1110 → 1086, tavlan 690 → 650. |

### Vad sonden mätte (`node scripts/_verktygprobe.mjs`)

Kontrollarmen först, alltid: ett tryck **långt** från varje fluga med samma verktyg.

| arm | tal |
|---|---|
| KONTROLL — smälla 400+ px från varje fluga | **0** plattade |
| MÄT — smälla rakt på flugan | **1** platt direkt |
| MÄT — 1,4 s senare | 1 vilar, **på bordet** (y > 500) |
| MÄT — 4,8 s senare | 1 rest sig / ute (`brattom` = flyr rakt mot fönstret) |
| spray (`vind`+`vat`) mot kaffekoppen | pöl: **nej** — vind välter inte |
| smälla (`slag`) mot kaffekoppen | pöl: **ja** |
| slemhand (`klibb`) mot lampan | tänd → släckt (**slog om**) |
| runda 8 | fart **540**, max/mål **6 / 6**, **6** flugor faktiskt i luften |
| exit mitt i ett verktygssvep | rent, 0 konsolfel |

⚠️ **Sonden räknar sidladdningar.** Vite skickar full-reload när en fil i projektet ändras, och
en omladdning mitt i mätningen byter ut `window.__barnspel` — alla tal efter den punkten är
tagna på ett annat spel. Det såg ut som en bugg i spelet ("tillståndet försvann") tre gånger
innan räknaren fanns. Kör aldrig sonden medan något annat skriver i repot.

## 3c. Ägarrapporten 2026-08-16 kväll — syltburken och fläkten (v1.227.0)

Två fel, båda uppmätta med `node scripts/_syltprobe.mjs` (grepp-karta, drag, fläktens fält)
och `_syltprobe3.mjs` (Pixis egen träffsökning i ett rutnät över burken).

**SYLTBURKEN gick inte att greppa i underkanten.** Burkens ritade fot låg på y 586 — 34 px
UNDER bordets framkant — och dess `hitArea` räckte ner till 618, alltså in i lådans
verktygsrad som ligger ETT LAGER OVANFÖR. Träffkartan: `verktyg0`/`verktyg1` tog **6 av 15
punkter** i burkens nedre tredjedel. Ett tryck på burkens fot BYTTE verktyg i stället för
att lyfta burken. Ankaret 540 → 512 och `hitArea` slutar nu på +40 (design y 552); kartan
är ren.

**De två släppplatserna var osynliga** (`alpha: 0`). Barnet drog burken och den snäppte hem
så fort släppet låg mer än 110 px från en punkt ingen kunde se. Nu tänds en ring vid varje
plats medan burken hålls eller är tap-tap-markerad, och snäppradien är 130.

**Trycket gjorde ingenting synligt.** Locket kunde bara åka av som en bieffekt av ett lyckat
släpp — "svår att öppna" var en korrekt beskrivning. Ett tryck öppnar nu burken.

**`DragController` släppte aldrig tap-tap-markeringen efter ett drag** (rättat i biblioteket,
gäller alla spel): nästa tryck på en godtycklig målyta teleporterade föremålet dit, alltså
ryckte ett tryck på tomma bordet tillbaka burken från fönsterbrädan.

**FLÄKTEN — tre fel satt i varandra.** ⓵ Konen mättes från fotens y 536 men RITAS ur huvudet
på 408; flugorna cirklar kring pappa på y 100–430 och föll utanför villkorsraden. ⓶ Pusten
gavs som `bana.knuff()`, alltså i `vx/vy` — och `Flugbana.steg()` klämmer dem till flugans
egen fart i SAMMA bildruta: **567 px/s pust blev 22 px/s kvar**. ⓷ Riktningen räknades "mot
pappa", alltså BORT från fönstret, och motarbetade spelets eget mål.

Nu: `Flugbana.vind()` lägger farten utanför spärren och låter den klinga av; fläkten blåser
mot fönstret och har dessutom ett INSUG bakåt (flugorna ligger bakom den — en ren utblåskon
täckte **22 av 200** flugpositioner ur spelets eget område, med insuget **199 av 200**);
vindfältet lever 1,15 s och syns hela vägen som elva strimmor. Uppmätt med en fluga låst på
(380, 250): kontrollarm utan pust står still, med pust bärs hon till (522, 330).

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- ~~**[Quick] Verktygsbalansen lutar mot viftningen.**~~ **STRUKEN** — viftningen finns inte
  längre. De fem verktygen har var sin `kyla` (0,45–1,1 s) och var sin verkanstyp, så
  balansen ligger numera i tabellen i `verktyg.js` och går att mäta om per verktyg.
- **[Quick] Zonfördelningen är ojämn** (uppmätt över 240 s: öra 16, haka 2). Poolen lottar
  jämnt, men de breda partierna nås lättare än hakan. Siktmålet ges nu upp efter **7 s** och
  lottas om — det är RÄTT för ett föremål högt på väggen (annars cirklar hon där för alltid)
  men fel för hakan, som bara behöver längre tid. Mät om per zon innan talet ändras.
- **[Medium] Klibbet drar inte MED sig rumsföremål.** Ägarens formulering var "sticky things
  will get stuck for a while and drag things". Flugorna dras (`knuff` med negativ kraft), och
  tavlan MINNS sin snedhet, men koppen och pappren dras inte ur läge — de står ritade på fasta
  koordinater i `rummet.js` och skulle behöva ett eget läges-tillstånd först.

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
`2026-08-16 · ägaruppdrag: fem verktyg, sju träffbara rumsföremål, större ansikte, eskalerande
rundor (max 6 flugor). Mätt med scripts/_verktygprobe.mjs — kontrollarm 0, mätarm 1.`
`2026-08-16 · ägarrapport: syltburkens greppyta + fläktens vindfält (v1.227.0). Se §3c.`
