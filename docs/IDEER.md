# IDEER.md — idébank (spel som inte är planerade än)

Parkerade spelidéer, **nyast överst**. En idé här är *inte* ett spec-kort — den är råmaterialet
som `/spel <idé>` får som indata när vi bestämmer oss för att bygga den. Varje post fångar
idén som ägaren beskrev den, plus de frågor en planerare måste svara på först.

När en idé byggs: flytta den till `docs/games/<id>.md` (§0 Spec) och stryk posten här.

---

## 1. Tre nya ansiktsspel — `titt-ut-pappa` · `vakna-pappa` · `flugan-pa-nasan`

*Inlagd 2026-08-15. Status: 🟡 **spec-kort framlagda, väntar på att nattpasset startas** —
ägarens start av passet ÄR ja:et (`/spel`s steg 0 kan inte grinda mitt i natten). Körordning,
grindar och avbrottsregler: **`docs/NATTPASS.md`**. Tillhör `ansiktssektionen` (post 3).*

### Varför just de här tre — riggen har fem oanvända funktioner

`src/lib/ansikte.js` är byggd och mätt, men `mata-munnen` är dess enda kund och rör inte det
mesta. Det här är byggt, betalt och står stilla:

| Riggfunktion | Vad den gör | Används idag |
|---|---|---|
| `blick(dx, dy)` | ögonen **följer** något (3 lappar, korsblekning, hysteres) | bara medan en matbit dras |
| `ogon_v` / `ogon_h` | blundlager per öga → **ett öga i taget** | bara i `blinkning()` (winken) |
| `liv(pa, { takt })` | andningstakten: 3,4 s dåsig … 1,1 s flämtande | sätts en gång, ändras aldrig |
| `traffar(x, y, marg)` | **pixelexakt** var på ansiktet något landade (radprofil, 0,0 % fel) | bara kastad mat (träff/miss) |
| `oron()` | var öronen sitter, i scenens koordinater | ingen kund alls |
| 13 miner | `sur acklad het lycksalig fundersam forvanad aj nojd skratt gasp chock skeptisk retas` | ~6 används |

Och **17 inspelade uttrycksljud finns redan** i sfx-manifestet (`pappa_aaah aj blaa chock ehh
fniss gasp hmm huh mmm ohh oj prutt prutt_lang rap retas surt`) — de tre spelen behöver bara
ETT nytt klipp (en snarkning), och det har en procedurell reserv.

Vart och ett av spelen gör **en** av de oanvända funktionerna till sin kärnmekanik, så de blir
tre olika spel och inte tre skinn på `mata-munnen`:

| Spel | Kärnmekaniken är … | Vad barnet gör |
|---|---|---|
| `titt-ut-pappa` | `blick()` + minerna | letar — trycker på gömställen |
| `vakna-pappa` | `liv({ takt })` + ett öga i taget | väljer verktyg — trycker på ljud |
| `flugan-pa-nasan` | `blick()` per bildruta + `traffar()` | styr — viftar, lockar, blåser |

---

### ⓵ `titt-ut-pappa` — **Titt ut, pappa!**

**Kärnidé.** Ett rum med 5–6 gömställen (tvättkorgen · gardinen · kartongen · dörren på glänt ·
filten · den alldeles för lilla blomkrukan). Pappa är i ETT av dem. Barnet trycker på ett
gömställe → något händer alltid.

**Agens — det här är inte en gissningslek** (kvalitetsgrind 1). Gömstället **skvallrar**, och
ledtrådarna är rörelse, inte text:
- gardinen **buktar i andningens takt** (`liv()`-tweenen driver bukten — samma klocka som lungan)
- ett par ögon tittar upp över kartongkanten i en halv sekund och duckar — och **ögonen tittar
  dit barnet senast tryckte** (`blick()` mot senaste tap:en). Det är riggens finaste oanvända
  funktion och den bär hela spelet.
- ett fniss (`pappa_fniss`) hörs från ett håll, med en synlig liten skakning i just det möblet

En 2-åring trycker där något rörde sig. En 4-åring lär sig läsa tre olika skvaller. Ingen läsning
behövs, och slumpen avgör aldrig ensam.

**"Fel" gömställe är en belöning, inte ett fel** (P0 MOTGÅNG). Där bor något annat roligt: en
strumpa, katten, en anka, en ballong som far upp i taket, en välling-tetra. Var sak har egen
reaktion + eget ljud, och **den följer med till finalen** — alltså blir varje "miss" en insamlad
kompis. Det är billigare i kod än en fel-hantering och roligare än att ha rätt.

**Riggen.** Innan han hittas syns bara en strimma av honom (ögonen över kanten) och `blick()`
jagar barnets tryck. När han hittas: `min('forvanad'|'skratt'|'retas'|'gasp')` + `ryck()` +
`blinkning()` ("du tog mig") + `pappa_huh`/`pappa_oj`/`pappa_fniss`.

**Motgång med tak.** Han **smiter** mellan gömställen medan barnet tittar åt annat håll — högst
**en gång per runda**, alltid förvarnat med ett prassel och en synlig skakning, och aldrig till
ett gömställe barnet just tryckt på. Saktar ner, stoppar aldrig.

**Progression.** Runda 1–2: gömstället skvallrar mycket. Runda 3: han gömmer sig **usel** med
flit (halva pappa syns bakom den lilla krukan) — skämtet. Runda 4–5: två skvaller samtidigt.

**Mål & finish.** Fem fynd (mätaren = fem små ansikten som tänds, noll siffror). Finalen: pappa
och **allt barnet hittat på vägen** far upp ur sina gömställen samtidigt och jublar (mottagare,
grind 4) — strumpan vinkar, katten jamar, ballongen far i taket. Klistermärke.

**Repliker (7 literaler).** "Var är pappa? Tryck där du tror att han gömmer sig!" · "Titt ut!
Där var han!" · "Oj, en strumpa! Leta vidare." · "Titta, något rör sig där borta …" · "Hihi, nu
gömde han sig igen!" · "Du hittade pappa fem gånger! Vilken mästare du är." · "Titta så många
kompisar du hittade!"

**Spec-kort.** `titt-ut-pappa` · **Titt ut, pappa!** · 🫣 · Roligt · **bara tap** · 2–5 · ingen
fysikmotor (GSAP + egen ticker). **Kärnloop:** 5–6 gömställen, ett skvallrar (bukt i andningstakt ·
ögon över kanten som följer barnets tryck · fniss + skakning) → tryck → pappa upp med min + eget
ljud, ELLER en rolig sak som blir en insamlad kompis. **Variation:** gömställen och
överraskningspool roterar; sällsynt wow (~1 på 8): han gömmer sig i taklampan. **Motgång:** han
smiter en gång per runda, alltid förvarnat. **Finish:** allt insamlat far upp samtidigt och jublar.

**Risk.** Bulken av arbetet är **ritad konst**: 6 gömställen + ~6 överraskningar, fristående
objekt med eget liv (P0 ASSETS — aldrig en emoji i en ruta). Mildras av `artikoner.js` där
nyckeln redan finns (katt · anka · ballong) och `form.js`/`scene.js` för möblerna.

---

### ⓶ `vakna-pappa` — **Vakna, pappa!**

**Kärnidé.** Pappa sover. En **sömnmätare** sjunker av ljud och **kryper tillbaka upp av tystnad**
— alltså måste barnet kedja ihop sina tryck. Att han somnar om är inte ett misslyckande, det är
poängen med skämtet, och kedjan är den enda "svårighet" spelet har.

**Vakenlägena ÄR riggfunktioner ingen annan använder:**

| Läge | Ansiktet | Riggen |
|---|---|---|
| 1 djupsömn | båda ögonen igen, långa andetag | `liv(true, { takt: 3.4 })` + snarkning |
| 2 rör sig | mumlar, vänder på huvudet | `tveka()` · `liv(takt: 2.4)` · `pappa_hmm` |
| 3 **ett öga** | ena ögat öppnas och **tittar på det som lät** | `ogon_h` släckt ensam + `blick()` mot ljudkällan |
| 4 förvirrad | båda ögonen, vet inte var han är | `min('forvanad')` · `nick()` · `pappa_ehh` |
| 5 vaken | **gäspning** — långsamt gap 1,2 s med blink i toppen | `gap()` mjukt + `pappa_aaah` · `min('nojd')` |

Läge 3 och 5 finns ingen annanstans i appen: **ett öga i taget** och ett **långsamt** gap (allt
`mata-munnen` gör är snabba tuggap). Gäspningen ensam är värd spelet.

**Agens — verktygen är olika, inget är fel** (grind 1 + 6):
| Verktyg | Effekt | Skämtet / haken |
|---|---|---|
| väckarklockan | −2 lägen, starkast | han drar **filten över huvudet** → nästa 2 ljud dämpas tills barnet trycker bort filten |
| katten | −1, och den **stannar** på kudden och kan tryckas igen | den går på hans ansikte; `traffar()` ger rätt min per ställe |
| trumpeten | −1 + luggen flyger rakt upp och ramlar ner | ren komik |
| rullgardinen | −0, men **dubblar allt annat** medan dagsljuset flödar in | den listiga vägen — 4-åringen hittar den, 2-åringen behöver den inte |
| kaffekoppen | −2, men **bara från läge 2** | doften driver som en synlig slinga mot näsan, `blick()` följer den, han snusar (små gap-pulser) |
| viska/kittla | −1, alltid tillgänglig | den snälla vägen; funkar alltid, långsammast |

**Motgång med tak.** Återinsomnandet är långsamt (ett läge åt gången), pausat i 3 s efter varje
framsteg, och **filten kan bara komma en gång per runda**. Barnet kan aldrig hamna under läge 1.

**Mål & finish.** Mätaren är **en måne som sjunker och en sol som stiger** — ingen siffra, ingen
timer. Finalen: han sätter sig upp, gäspar stort, sträcker på sig, solen far upp — och
väckarklockan, katten och trumpeten hoppar och jublar (mottagare). Klistermärke. Sen: "en gång
till?" → han dimper ner och börjar snarka igen, vilket **är** slutklämmen.

**Repliker (7 literaler).** "Pappa sover! Väck honom med ljuden." · "Titta, han rör på sig!" ·
"Ett öga är öppet! Fortsätt." · "Oj, han somnade om igen. Prova igen!" · "Dra av filten så han
hör dig." · "God morgon, pappa!" · "Vill du väcka honom en gång till?"

**Spec-kort.** `vakna-pappa` · **Vakna, pappa!** · 😴 · Roligt · **bara tap** · 2–5 · ingen
fysikmotor. **Kärnloop:** sömnmätare (måne→sol) som sjunker av ljud och stiger av tystnad; sex
verktyg med olika verkan och egna skämt; fem vakenlägen som syns i ansiktet (ett öga · gäspning).
**Variation:** verktygsuppsättning + ordning roterar; sällsynt wow (~1 på 8): han sätter sig upp
och snarkar vidare **sittande**. **Finish:** gäspningen + soluppgången + verktygen som jublar.

**Ljudlucka (blockerar inte).** Det finns **ingen snarkning** i sfx-manifestet. Passet bygger en
procedurell reserv (låg ton + långsam LFO + ett mjukt "puh" på utandningen, `audio.tone()`), och
lägger `snark` · `god-morgon` · `gaspning` på ägarens inspelningslista. Spelet ska vara klart och
grönt utan dem.

---

### ⓷ `flugan-pa-nasan` — **Flugan**

**Kärnidé.** En fluga surrar runt pappa och landar på honom. **`traffar()` avgör exakt var** —
näsa · panna · kind · öra · haka · lugg — och varje zon har sin egen reaktion. Mellan landningarna
**följer pappa flugan med blicken, hela tiden**. Det är hela själen i spelet, och det är en
riggfunktion som idag bara används i ett långsamt drag.

**Guldkornet:** landar flugan på näsan används `blick_ner` — han **tittar ner på sin egen näsa**.
Den lappen finns redan, och ingen har använt den till det.

**Agens — tre verktyg, alla lika giltiga** (grind 1):
| Verktyg | Vad det gör | Vem hittar det |
|---|---|---|
| **vifta** (tryck på/nära flugan) | den lyfter **bort från trycket** — alltså styr träffpunkten riktningen | alla, direkt |
| **fläkten** (tryck) | en vindpust i en kon: flugan, pappas lugg och pappren far iväg. Tak: en pust var 2:a sekund | 3-åringen |
| **sylten** (enkelt drag med snäpp + tap-tap-fallback) | flugan väljer sylten framför pappa — ställ den vid fönstret så flyger den ut själv | 4-åringen, och det är en riktig aha |

Målet är att få ut flugan genom det **öppna fönstret**. Tre flugor per runda, aldrig fler än
**två samtidigt**.

**Motgång med tak — och den är en gåva.** Landar flugan i kaffekoppen kommer den ut **kladdig och
långsam** (lättare att vifta ut). Landar den på ögonlocket: `min('aj')` + `ryck()`. Sitter den för
länge på näsan bygger pappa upp en **nysning** (`gasp` → `pappa_gasp` → **ATJOO** med `ryck()`
full styrka) som blåser iväg flugan **själv** — barnet kan alltså aldrig fastna.

**Riggen.** `blick()` varje bildruta mot flugans läge relativt ansiktet · `traffar()` per landning
· `ryck()` · `tveka()` ("nja …") · `min('aj' 'retas' 'skratt' 'gasp' 'skeptisk' 'forvanad')` ·
ljud ur `pappa_aj oj huh ehh gasp fniss` + `djur_bi` som surr.

**Mål & finish.** Tre flugor ut. Finalen: **Bobo** stänger fönstret, ger pappa en medalj, och
pappa ger Bobo en `blinkning()` (mottagare, grind 4). Klistermärke.

**Repliker (7 literaler).** "Titta, en fluga! Den kittlar pappa på näsan." · "Tryck på flugan så
flyger den iväg." · "Ställ sylten där du vill att flugan ska flyga." · "Blås med fläkten!" ·
"Hihi, den satte sig på örat!" · "Nu flög den ut genom fönstret!" · "Tack, säger pappa. Nu är det
lugnt igen."

**Spec-kort.** `flugan-pa-nasan` · **Flugan** · 🪰 · Roligt · tap + enkelt drag (snäpp +
tap-tap-fallback) · 2–5 · ingen fysikmotor (egen styrande integrator för flugbanan).
**Kärnloop:** flugan surrar, pappa följer den med blicken; den landar → zon via `traffar()` → egen
min + eget ljud; barnet viftar/blåser/lockar den mot det öppna fönstret. **Variation:** zonpool +
flugbanor roterar; sällsynt wow (~1 på 8): flugan sätter sig på pappas öga och han går vindögd.
**Finish:** Bobo stänger fönstret och delar ut medalj.

**⚠️ MÄTFRÅGA SOM MÅSTE AVGÖRAS MED EN SOND, INTE MED EN GISSNING.** `blick()`s hysteres
(`BLICK_DOD 0,16` · `BLICK_HYST 0,14` · `BLICK_TID 0,13 s`) är inställd på en **långsamt dragen
matbit**. En fluga rör sig ryckigt och snabbt — om lappen byts oftare än ~3 ggr/s läser det som
ett ögonflimmer i stället för en blick, och det är ett fotoansikte, alltså direkt obehagligt.
**Mät antal lappbyten per sekund med en långsam kontrollarm bredvid** (samma bana, 1/5 farten)
innan något byggs ovanpå. Känd reserv om talet är rött: lågpassfiltrera flugans läge innan det
matas till `blick()` — spelet ska **inte** ändra riggens konstanter, för `mata-munnen` läser samma.

---

### Öppen punkt som INTE hör till nattpasset

Ansiktssektionens beslut 5 (post 3) säger att spelen ligger i **Roligt** tills sektionen har 2–3
spel, sen lyfts en egen flik. Med de här tre är sektionen uppe i **fyra** spel — alltså har den
tröskeln passerats, och en femte flik i biblioteket är ett ägarbeslut, inte ett byggbeslut.
Frågan ställs efter passet.

## 2. Egna ansikten & röster från telefonen (arbets-id: `egna-ansikten`)

*Inlagd 2026-08-07. Status: ⬜ ej planerad. Utbruten ur `ansiktssektionen` (beslut 2026-08-07).*

**Idén, som den beskrevs:** kunna **fota ett ansikte och spela in röstljud direkt i telefonen**,
förbereda dem där, och lägga in **vilken karaktär som helst** (vilket ansikte + vilken röst
som helst) i ansiktssektionens spel.

### Frågor att svara på i planeringen (INTE nu)
1. **Lagring.** P0 DATA tillåter endast localStorage JSON (~5 MB). Foton skapade i körning
   kräver antingen hård komprimering eller en medveten P0-omförhandling (IndexedDB).
   Ingenting får lämna enheten.
2. **Friläggning på enheten.** Klippa bort bakgrunden utan nätanrop — telefonens "lyft motiv"
   ger PNG manuellt, men ett i-appen-flöde kräver egen lösning.
3. **Delning i lager på enheten.** Halvorna/ögonen måste klippas och riktas in — kräver ett
   enkelt inriktnings-UI bakom föräldragrinden.
4. **Grind.** Kamera + mikrofon hör hemma bakom tryck-och-håll-grinden (P0 GRIND).
5. **Beroende:** ansiktsriggen (`lib/ansikte.js`) och minst ett spel måste finnas först —
   funktionen är ett påbyggnadslager, inte grunden.

---

## 3. Ansiktssektionen — riktiga foton som spelfigur (arbets-id: `ansiktssektionen`)

*Inlagd 2026-08-06. Status: 🟢 **SEKTIONEN ÖPPNAD 2026-08-13 (v1.186.0)** — riggen byggd och
första spelet `mata-munnen` levererat (`docs/games/mata-munnen.md`). Posten står kvar för att
sektionen ska ha FLER spel (se tabellen längre ner). Omfattning: en hel ny sektion.*

### ▶ LÄGET 2026-08-13 — läs detta först, resten av posten är PLANEN

**`mata-munnen` ÄR BYGGT** (v1.186.0) och mätt med `node scripts/_munprobe.mjs`, som spelar
spelet på riktigt — testharnessen rör aldrig en matbit, så kärnloopen var grön och omätt.
Sonden hittade en återvändsgränd som ingen läsning av koden hade gett: busad mat lämnade
tallriken men räknades in i mättnadsmålet, så ett barn som busade en bit av sex kunde tömma
tallriken utan att finalen kunde komma. Tallriken fyller nu på sig själv. **Läs spelets doc
§3 innan nästa spel i sektionen byggs** — den bär vad riggen faktiskt klarar.

Kvar i sektionen: `titt-ut-pappa` · `vakna-pappa` · `flugan-pa-nasan` (**spec-kort klara, post 1
— byggs i nattpasset**) · `harma-grimasen` · `borsta-tanderna` · `prat-ansiktet` (tabellen nedan), plus
**ägarens inspelningsuppgift**: pappas uttrycksljud. Kopplingen finns redan och tar klippen i
bruk automatiskt (`ROST`-tabellen + `audio.harSample()`).

**Fotoshooten är levererad:** 129 frilagda PNG, **768×1024** (inte 1024×1024 som det sades),
ren alfakant, i ComfyUI:s egen output-katalog (`s1face__NNNNN_.png`, nummer 1-129).
De 49 som används ligger i repot under `assets-src/ansikte/pappa/`.

**Tre ägarbeslut 2026-08-13:**
1. **Rigg först, sedan spelet** — riggen är det hela sektionen står på.
2. **Ögon-följningen är STRUKEN.** Blickserien (8 riktningar) finns inte i materialet;
   jag gick igenom ögonbandet i alla 129 och alla tittar mot kameran eller blundar.
   Ansiktet lever på blink, andning, käkens gap och minerna i stället.
3. **Egna uttrycksljud finns inte än** — spelet byggs utan dem, sample-namnen förbereds.

**Byggt (`e55db82` + `b477d0a`):** `scripts/ansikte.mjs` (`npm run ansikte`) klipper 15
inriktade lager på 586 kB av budgetens 3072, och `src/lib/ansikte.js` bär riggen:
`gap(0–1)` · `tugga(n)` · `blink()` · `min(namn)` (korsblekning) · `liv()`. Sond:
`node scripts/_ansiktebild.mjs` (14 lägen i ett rutnät + exit-koll).

⚠️ **Det materialet TVINGADE fram — kopiera inte planen nedan rakt av:**
- **Huvudet driver mellan bilderna** (hjässan y 159–319, höjd 705–865, flera lutar), så
  varje roll riktas in mot neutralbilden. Måttet måste läsa **pose** (silhuett-IoU), inte
  utseende: intensitet och gradient i ögonbandet blandar ihop fel läge med annan min, och
  5 av 11 bilder blev dubbelexponerade innan måttet byttes.
- **En roll = flera kandidater.** Fem foton gick inte att rätta alls (personen hade lutat
  sig fram — en 3D-rotation). `roller.json` listar kandidater; skriptet väljer på pose och
  ger aldrig samma foto åt två roller.
- **Käken translateras, den roterar inte.** En 2D-rotation svänger käken i sidled i frontvy.
  Taket är ~40 px; över det glider underkäkens kontur utanför basens.
- **Ett bas-lager måste ligga underst**, annars syns bakgrunden som ett ljust streck tvärs
  kinderna när käken sjunker.
- **Minerna klipps som ovala lappar** och nederkanten tonas ut — tröjan BYTS mitt i
  fotoserien (13–42, 49–57, 81, 121–122 bär ett tryck).
- `P0 KARAKTÄRER` har fått sitt undantag: `theme.js` bär `ROLLER = ['Pappa', 'Mamma']`.

**Idén, som den beskrevs:** En helt ny sektion i biblioteket där **riktiga foton av ägarens
ansikte** är spelfiguren. Ansiktet **grimaserar som svar på vad spelaren gör** — grimasen är
återkopplingen. Fotot är inte en stillbild: det **skärs upp i delar** så att det blir
interaktivt — **mun och käke** lyfts ut som egna bitar så ansiktet kan se ut att **prata**
och kunna **äta genom att gapa**.

**Första spelet i sektionen:** dra-och-släpp **mat i munnen**. Munnen gapar när maten närmar
sig, tuggar, och **ansiktet/grimasen ändras beroende på vad man matade det med** — citron ger
sur min, chili ger het min, tårta ger lycksalig min, broccoli ger en fundersam min.

### Ägarens detaljering (2026-08-07)

- **Riggen:** ett frilagt porträtt delas i **två halvor** — övre ansiktet (övre läppen och
  uppåt) och nedre ansiktet (nedre läppen + hakan). Prat/tugg = nedre halvan flyttas upp/ner
  i 2D; mun-inre som eget lager bakom. Flera foton med olika uttryck/grimaser gör personen
  levande (minbyte ovanpå riggen).
- **Ögonen följer** det man drar: ögon-lagret växlar mellan foton som tittar åt olika håll,
  i ~45°-steg hela varvet runt (8 riktningar).
- **Matning:** dra-och-släpp mat på munnen → gap, tugg, smask; grimas + uttryck beroende på
  maten. **Smulor** sprutar ur munnen när den tuggar.
- **Bus är en feature:** släpper man mat på resten av ansiktet (ögon, näsa, öron, hår) så
  **fastnar det** och det blir geggigt/kladdigt på ansiktet; ansiktet reagerar med olika miner.
- **Ljud:** ägaren spelar in många korta uttrycksljud i egen röst (blää, aj, oj, ohh) som hör
  ihop med vissa miner.
- **Önskad framtida feature:** kunna **fota ansikten och spela in röst direkt i telefonen** och
  lägga in vilken karaktär som helst. (Obs: P0 DATA = endast localStorage JSON — foton skapade
  i körning kräver ett medvetet lagringsbeslut; troligen en egen, senare idé.)

### Varför den är intressant
- **Ingenting i biblioteket ser ut så här.** 70 spel är ritad vektorgrafik. Ett riktigt ansikte
  som reagerar är en helt annan sorts belöning — och det är *pappas* ansikte, vilket för ett
  2–5-åring slår varje tecknad figur.
- **Grimasen ÄR återkopplingen.** P0 kräver ljud+bild <100 ms per pekning; ett ansikte som
  ändrar min är den mest avläsbara feedback som finns för en 2-åring — noll läsning, noll ikoner.
- **Motgång blir rolig av sig själv.** P0 `MOTGÅNG` vill hinder som är roliga och aldrig
  skambelagda: "fel" mat = en jättegrimas + ett spott-ljud, aldrig ett rött kryss. Sur min är
  en belöning i sig, inte ett misslyckande.
- **En uppskuren ansiktsrigg är återanvändbar** — samma käke/mun/ögon-rigg driver hela
  sektionen: mata, härma grimasen, tandborstning, prat-docka, ansiktet som sjunger med.

### Möjliga spel i sektionen (att välja bland senare)
| Arbets-id | Vad det är |
|---|---|
| `mata-munnen` | dra mat till munnen → gap, tugg, grimas efter smak — ✅ **BYGGT v1.186.0** |
| `titt-ut-pappa` | leta rätt på pappa bland gömställen — 🟡 **spec-kort klart, se post 1** |
| `vakna-pappa` | väck honom med ljud; sömnmätare + ett öga i taget — 🟡 **spec-kort klart, post 1** |
| `flugan-pa-nasan` | han följer flugan med blicken; vifta ut den — 🟡 **spec-kort klart, post 1** |
| `harma-grimasen` | ansiktet gör en min, barnet trycker på rätt min bland tre |
| `borsta-tanderna` | dra tandborsten i den gapande munnen, ansiktet reagerar på var man är |
| `prat-ansiktet` | tryck på ord/ikoner → käken rör sig i takt med röstklippet |

### Beslut (2026-08-07)
1. **Rigg:** frilagt porträtt i **två halvor** (delning vid överläppen) + mun-inre bakom;
   nedre halvan translateras upp/ner för gap/tugg/prat. **Endast neutralfotot klipps.**
   Grimaser är **helbildsfoton** som korsbleknar in efter svalt tugg (~120 ms), hålls ~1,5 s
   med tillhörande ljud, och bleknar tillbaka. Ögon-följningen (8 riktningar, eget ögonlager)
   sker bara i neutralläget medan man drar.
2. **Namn:** karaktären heter **"Pappa"** — en roll, inte ett namn. `lib/theme.js`-regeln får
   tillägget "roller (Pappa/Mamma) är tillåtna för fotokaraktärer" i samma commit som sektionen.
3. **Ansikten:** bara ägarens nu; riggen byggs så fler ansikten kan läggas till senare med
   samma fotolista. Telefon-funktionen är utbruten till egen idé (`egna-ansikten`, post 1).
4. **Mål i `mata-munnen`:** **mättnadsmätare** — tallrik med 4–6 matbitar per runda, full mage
   → rap-final → ny tallrik. Bus fyller inte mätaren men geggan sitter kvar till finalen.
5. **Flik:** spelen ligger i **Roligt** tills sektionen har 2–3 spel; då lyfts en egen flik.
6. **Fallback/integritet:** fotona checkas in som vanliga assets (repot är lokalt, ingen PII
   lämnar enheten); ingen ritad fallback byggs.
7. **Bildbudget:** webp, maxhöjd ~800 px per lager, hela sektionen ≤3 MB.
8. **P0 `ASSETS`** gäller som noterat: friskuren silhuett med eget liv (andning, blink),
   aldrig ett rektangulärt foto i en ram. Maten ritas som vanligt (`artikoner.js`).

### Fotoshoot-lista (ägarens produktionsuppgift — allt i EN session)
Stativ, samma ljus/avstånd/vinkel, huvudet stilla (sätt ett märke att titta på), enfärgad
bakgrund. Frilägg helst med telefonens "lyft motiv" (sker lokalt på enheten) → PNG; annars
levereras råbilder så klipper vi här.

| # | Fil | Vad |
|---|---|---|
| 1 | `neutral` | mun stängd, ögon mot kameran (klipps i halvor — basriggen) |
| 2 | `gap` | munnen vidöppen, säg "aaah" (härifrån klipps mun-inre: tänder/tunga) |
| 3–10 | `ogon-<riktning>` | endast ögonen flyttas: upp · upp-hoger · hoger · ner-hoger · ner · ner-vanster · vanster · upp-vanster |
| 11 | `ogon-stangda` | för blink i vila |
| 12 | `sur` | citron |
| 13 | `acklad` | blää |
| 14 | `het` | chili — flämtande |
| 15 | `lycksalig` | tårta/glass |
| 16 | `fundersam` | broccoli |
| 17 | `forvanad` | oj! (bus-släpp) |
| 18 | `aj` | något studsade på näsan (bus) |
| 19 | `nojd-matt` | stor belåten min (rund-finalen) |
| 20 | `skratt` | valfri bonus — bus i hår/öron |

**Ljudinspelningar (egen röst, telefonen räcker, tyst rum, ett uttryck per fil):**
`blaa` · `aj` · `oj` · `ohh` · `mmm` · `nam-nam` · `rap` · `fniss` · `aaah`.
Tugg/smask kan tas ur sfx-pipelinen om egna inte blir bra.

**Leverans:** lägg allt i `assets-src/ansikte/pappa/` (utanför `public/`) — ett skript under
`scripts/` klipper, komprimerar till webp och genererar lager + manifest med ankarpunkter.

### Kvarvarande öppna punkter
- Exakt matlista + mat→min-mappning (avgörs i spec/bygge mot `artikoner.js`).
- Klippskriptets form: helautomatiskt eller skript + handsatta koordinater i en JSON.

### Spec-kort `mata-munnen` (framlagt 2026-08-07 — ✅ **JA från ägaren 2026-08-13**)
⚠️ **Ögon-följningen i kärnloopen nedan är struken** (se LÄGET överst) — allt annat står.
`mata-munnen` · **Mata Pappa** · 😋 · Roligt · drag (tap-tap-fallback) · 2–5 · ingen
fysikmotor (DragController + GSAP). **Kärnloop:** tallrik med 4–6 matbitar → dra (ögonen
följer i 8 riktningar, munnen gapar när maten närmar sig) → släpp på munnen → tugg + smask +
smulor → helbilds-grimas per mat + ägarens inspelade ljud (~1,5 s) → mättnadsmätaren fyller.
Bus: släpp på ögon/näsa/öron/hår → fastnar + gegga (tak 6 samtidigt, äldsta ploppar av),
fyller inte mätaren. **Variation:** matpool ~14, 4–6 slumpas per tallrik; sällsynt wow
(~1 på 8): jättegrimas/dubbelrap. **Finish:** rap-finalen — nöjd-mätt-minen, inspelat rap,
fniss, smul-konfetti, geggan kvar. Klistermärke. **Repliker (7 literaler):** "Mata pappa med
maten på tallriken!" · "Mmm, det där var gott!" · "Oj! Vad surt det var!" · "Titta, pappa
tuggar och tuggar!" · "Hihi, nu blev det kladdigt!" · "Vad tror du händer om pappa smakar
chilin?" · "Nu är pappa mätt och belåten!" — pappas egna uttrycksljud är **samples**
(`audio.sample()`), inte narrator-repliker.

### Tekniska hållpunkter
- **Ansiktsriggen blir en delad modul** (`lib/ansikte.js`-aktig), inte kod i ett spel — lager:
  övre halva · nedre halva (translateras vertikalt för gap/tugg/prat) · mun-inre bakom ·
  ögonlager (8 riktningar + stängda) · helbilds-grimaslager för korsblekning · dekal-lager
  för gegga/fastnad mat. Pixi v8: vanliga `Sprite`-lager räcker; ingen mesh-deformation behövs.
- **Uppskärningen görs offline**, inte i körning: ett skript under `scripts/` som klipper ut
  delarna ur källfotona till färdiga PNG/webp-lager — samma mönster som `npm run voice`/`sfx`.
- **Käken kan drivas av rösten.** `VoiceService` spelar redan mp3-klipp; enklast är
  tidsbaserat käkflaxande medan ett klipp spelas, dyrare är amplitud från `AudioService`.
  Se skill **ljud-och-rost**.
- **Grimasbyte** = korsblekning över ~120 ms + en liten skalpuff, aldrig ett hårt klipp.
  `feedback.js`-hjälparna och `_alive`-flaggan gäller som vanligt (P0 `EXIT-SÄKERT`).
- **Maten** dras med `DragController` (samma som övriga dra-spel) med mun-området som mottagare
  — träffytan runt munnen måste vara ≥96px även om munnen på fotot är mindre.

---

## ~~4. Nätskott från bilfönstret (arbets-id: `natskott-pa-stan`)~~ ✅ BYGGD

*Inlagd 2026-08-06. **Byggd 2026-08-08 och polerad samma kväll** — se
`docs/games/natskott-pa-stan.md`. Posten stod kvar som "väntar på spec-ja" i två dagar
efter att spelet fanns i registret; filens egen regel är att stryka den vid bygge.*

**Idén, som den beskrevs:** Förstapersonsvy där man ser **sin egen arm och hand** nere i bild,
i webb-skjutar-posen (pek- och lillfinger ut, mellanfingrarna in mot handflatan), med
hjältedräkt på underarmen. Man **trycker var som helst på skärmen → ett nät skjuts dit**.
Scenen är en **sidscrollande gatuvy sett från ett bilfönster** — bakgrunden glider från höger
till vänster och skiftar mellan stad och förort medan man åker. Längs vägen passerar saker
man kan skjuta nät på och **påverka med fysik**: gummor som går på trottoaren, katter, hundar,
blomkrukor i fönsterbleck, brevlådor, fåglar, paket, fönster som går sönder, m.m.

**Två nättyper** (kärnvalet i spelet):
- **Klibbnät** — det man träffar fastnar i bakgrunden/väggen där det är.
- **Dragnät** — det man träffar dras tillbaka mot spelaren.

### Varför den är intressant
- Ett **helt nytt kameraperspektiv** i biblioteket — alla 70 spel är sidovy eller ovanifrån.
  Förstaperson + åkande bakgrund ger en resa-känsla ingen annan titel har.
- **Ett enda gest-verb** (tap där du vill) men **två utfall** via lägesknappen → äkta agens
  utan mer motorik. Passar 2–5 år rakt av.
- Bakgrunden som rullar ger gratis **variation och progression** (stad → förort → …) utan att
  vi behöver nivåer med fail-tillstånd.

### Avgränsa mot de tre spindelspel som redan finns
| Finns redan | Vad det är | Hur den nya skiljer sig |
|---|---|---|
| `spindelhjalten` | slangbella, drar hjälten själv genom luften | här skjuter man nät, hjälten rör sig inte |
| `spindel-zacke-svingar` | pendel, timing-släpp mellan hustak | här ingen svingning, ingen timing-press |
| `spindelnatet` | står still, fångar fallande föremål i ett nät | här rullar världen förbi och nätet påverkar *världen* |

### Beslut (2026-08-07)
1. **Varumärke:** armen/dräkten är **Spindel-Zackes** — röd/blå med svarta nät-linjer, egna
   designen (INTE Marvels). Samma hjälte som i `spindel-zacke-svingar`.
2. **Fönster krossas på riktigt** (ägarens val). Tonram som håller P0: tecknat glitter-splitter
   + glatt "hoppsan"-ljud, rutan **självlagas med ett skimmer efter ~5 s** (världen förblir
   aldrig trasig = tak), och ibland tittar ett **litet monster ut ur den trasiga rutan och
   vinkar** — mottagar-ögonblick, aldrig tillsägelse.
3. **Inga människor** — målen är djur, monster och föremål (katter, hundar, fåglar, paket,
   blomkrukor, ballonger). KARAKTÄRER-frågan bortfaller helt.
4. **Mål: uppdragsrundor** som roterar och använder båda näten — "fånga katten som rymt"
   (dragnät) · "fäst paketen innan de blåser iväg" (klibbnät) · "hämta hem 3 ballonger".
   Fri lek mellan uppdragen; alltid utan fail.
5. **Nätval: stor växelknapp** (≥96px) med egna ritade ikoner. Båda näten gör alltid NÅGOT
   roligt på varje mål — inget felval, bara olika utfall.
6. **Bilen: antydd ram** — smal dörrkant/fönsterkarm nertill där armen vilar, inte full ram
   (skärmytan i 1280×720 ska gå till gatan).
7. **Mottagare:** hemdragna djur/saker landar i **baksätet** och jublar där; rund-finalen är
   **hemkomsten** — bilen stannar, alla hoppar ur och firar.
8. **Fysik:** matter.js (`PhysicsWorld`); kroppar följer scrollen och städas utanför bild.
   Klibbnät = kroppen blir statisk i bakgrundslagret (scrollar med). Dragnät = constraint mot
   kameran; kroppen plockas ur fysiken nära bilen och landar i baksätet.

### Spec-kort `natskott-pa-stan` (framlagt 2026-08-07 — väntar på ägarens ja)
`natskott-pa-stan` · **Nätskott på stan** · 🚙 (byggaren verifierar unikhet i registryt) ·
Fysik · tap + stor växelknapp (inga drag alls) · 2–5 · matter.js. **Kärnloop:** bilen rullar
(parallax hus · trottoar · vägkant, stad→förort), Spindel-Zacke-armen nere i bild med
vilo-guppning; tryck var som helst → nät dit med whoosh + rekyl <100 ms; klibbnät fäster
saker där de är, dragnät drar hem dem till baksätet som jublar. Uppdragsrundor roterar
("fånga katten" · "fäst paketen" · "hämta 3 ballonger"); fri lek emellan, aldrig fail.
Fönster krossas i glitter-splitter, självlagas ~5 s, ibland vinkar ett monster ur hålet.
**Motgång:** vindby (max 2 lösa samtidigt) + skata som knycker paket (1 åt gången, går att
näta). **Variation:** kuliss + målpool roterar; sällsynt wow (~1 på 8): guldpaket som regnar
stjärnor. **Finish:** hemkomsten — bilen stannar vid huset, alla insamlade hoppar ur och
firar. Klistermärke. **Repliker (7 literaler):** "Tryck där du vill skjuta nätet!" · "Byt nät
med den stora knappen!" · "Fånga katten med dragnätet!" · "Fäst paketen så de inte blåser
iväg!" · "Hoppsan! Där rök en ruta!" · "Titta, baksätet blir fullt med vänner!" · "Nu är vi
hemma — vilket äventyr!"

### Tekniska hållpunkter
- matter.js (`PhysicsWorld`) för de påverkade föremålen; bakgrunden som parallax-lager
  (TilingSprite eller egna ritade lager) i tre djup: hus · trottoar · vägkant.
- Nätet självt: en dragen linje som skjuts ut från handen till träffpunkten, med `whoosh` +
  träffljud <100 ms. Klibbnät = kroppen blir statisk där den är. Dragnät = constraint som
  drar kroppen mot kameran och plockar bort den ur fysiken när den kommer nära.
- Armen/handen är ett **fristående ritat objekt** (P0 `ASSETS`), aldrig en emoji — med
  vilo-rörelse och rekyl vid skott.
