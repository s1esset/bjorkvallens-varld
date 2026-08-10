# Saftbaren (`saftbaren`)

> fysik · mixed · [2, 5] · ✅
> Status: ✅ marknadsklar

## 0. Spec

| | |
|---|---|
| **id** | `saftbaren` |
| **titleSv** | Saftbaren |
| **icon** | 🥤 |
| **kategori** | fysik → flik **Fysik** |
| **input** | mixed (drag + tap, tap-tap-fallback på allt) |
| **ålder** | [2, 5] |
| **kärnloop** | dra kranen till ett glas → tryck → saft rinner. Spaken byter färg. Häll ett glas i ett annat → färgerna smittar i vätskan och blir en ny färg |
| **mål** | Bobo beställer en färg; när ett glas har den färgen dricker han upp det → `progress.complete()` |
| **agens** | VILKEN färg (spaken), VILKET glas (kranens läge), och VAD man häller ihop — barnets tre val avgör vilken färg som uppstår |
| **variation** | ny beställning varje gång, grundfärg eller blandning; glasens innehåll är aldrig samma två gånger |
| **mottagare** | Bobo — dricker upp glaset, hoppar och rapar en färgad bubbla |
| **finish** | Bobo *dricker* (vätskan sugs ur glaset partikel för partikel med stigande ton) + färgad rapbubbla — inte standardkonfetti |

**Röstrepliker**
```
"Tryck på kranen så rinner det saft i glaset!"
"Dra kranen till ett glas och tryck på den!"
"Tryck på ett glas och sedan på ett annat, så hälls saften över!"
"Bobo vill ha grön saft!"  (+ röd/gul/blå/orange/lila)
"Gul och blå blir grön!" · "Röd och blå blir lila!" · "Röd och gul blir orange!"
"Oj, nu blev det brunt!"
"Precis den färgen Bobo ville ha!"
```

## 1. Nuläge (sett som spelare)

Första spelet på `src/lib/vatska.js` — riktig partikelvätska med metaboll-rendering, inte
animerade droppar längs en väg. Baren har fyra glas på ett galler, en kran på skena, en spak
med tre grundfärger, en hink att tömma i och Bobo som beställer.

- **Kranen**: dra i sidled (snäpper över närmaste glas) eller tryck ◀ ▶. Tryck på kranen →
  rinner 2,6 s och stänger av sig själv. Tonen stiger med hur fullt glaset är.
- **Glasen**: dra ett glas upp och håll det bredvid-och-över ett annat → det lutar och häller.
  Tryck-tryck (glas → glas) gör samma sak automatiskt och träffar alltid.
- **Färgblandning**: partiklarna har egna färger och smittar varandra vid kontakt via en
  blandningstabell (röd+gul=orange, röd+blå=lila, gul+blå=grön, allt annat=brunt). Man SER
  färgen svepa genom vätskan när man häller.
- **Droppstorlek**: en knapp med tre droppar växlar liten/lagom/stor klick — leksaksläget.
- **Spill** rinner ner genom gallret och försvinner. Inget går sönder, inget kan misslyckas.

## 2. Ursprunglig plan & tankeprocess

Ägarens idé: fyra glas med olika färgade vätskor, en kran att fylla med, en spak för färgbyte,
och möjlighet att hälla mellan glasen och blanda färgerna. Målet var att ge den nya
vätskemotorn sitt första riktiga spel.

Pedagogiken sitter i färgläran: *gul + blå = grön* är svårt att förstå som påstående men
självklart när man häller det själv och ser det hända i vätskan. Blandningen är därför en
tabell över barnets färgvärld, inte ett RGB-medelvärde (som gör blå+gul grått).

Bobos beställning finns för att ge loopen ett mål utan att göra den till ett uppdrag: man kan
strunta i beställningen hur länge som helst och bara leka.

## 3. Vad gör det lättjefullt / tunt

- Bara tre grundfärger i kranen — ingen vit/vatten att späda med, ingen is, inget sugrör.
- Bobo beställer men har ingen egen historia (blir han törstig? har han en favoritfärg?).
- Ingen kolsyra, inga bubblor i saften, ingen skvalp-ljudmatta — ljudet är ton + SFX.
- Glasen är identiska; inga former (högt glas, litet glas) som ändrar hur mycket som ryms.

## 4. Förbättringar & förhöjningar (plan)

> ✅ **ATGARDER #3 + #4 fixade 2026-08-07** (se §5).
>
> ✅ **ATGARDER V4 (hällningen flyttade noll vätska) fixad 2026-08-07** — se §5.

**Kärnloop**
- [Quick] Fjärde spakläge: **vatten** som späder färgen ett steg ljusare.
- [Medium] Olika glasformer (smalt/brett/högt) → samma mängd ser olika ut, mer att upptäcka.

**Variation**
- [Quick] Bobo ber ibland om "mer i glaset" (nivå) i stället för färg.
- [Medium] Kunder som kommer och går (Elvira, Lova) med egna favoritfärger.

**Juice**
- [Quick] Bubblor som stiger i glaset när det står stilla.
- [Medium] Skvalp-ljud kopplat till vätskans rörelse (mängd × hastighet).

**Karaktär**
- [Medium] Bobo blir törstigare ju längre man leker (blinkar mot glasen).

## 5. Status / loggar

- 2026-08-10 🎨 **D1 (delat mönster): baren fick ljus uppifrån** (`b3cde53`, v1.119.0).
  Barens framsida låg på **99 676 px i EN ton** (`_plattprobe --medbakgrund`) — spelets största
  fält. Samma konstruktion som i tre andra spel, därför den delade `groundFill()` i
  `lib/form.js`. BÅDA plattorna med samma ton tonades (bakgrunden bakom vätskan och framsidan),
  annars syns en skarv i bleed-zonen på höga plattor.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **99 676 → 34 726 px**, brunt ute
  ur topp-3. Spelets topp är nu väggen, som redan var tonad.

- 2026-08-06: byggt som första spel på `lib/vatska.js`. Motorn utökades samtidigt med
  färg per partikel (`world.pal`), blandningstabell (`setMixTable`) och roterade
  kärlväggar (`addBox(..., angle)`) — det sista är det som gör att ett glas kan hälla.
- 2026-08-07 (`/fixa`, ATGARDER #3 + #4):
  - **#3 "ljudet hakar upp sig när en vätska har bytt färg".** `_lastMix` satt på SPELET,
    inte på glaset. Två glas med var sin blandfärg pingpongade därför värdet var 12:e
    bildruta, och varje växling utlöste både `sfx('reveal')` och en röstreplik. Uppmätt med
    två glas (grön + orange) och **noll input i 5 s: 48 ljud och 48 röstrepliker**
    ("Gul och blå blir grön!" ×24, "Röd och gul blir orange!" ×24). Fix: minnet ligger nu på
    varje glas (`g.lastMix`), nollställs när glaset töms (<10 partiklar) så samma upptäckt
    kan firas igen nästa gång, plus 1,5 s kylning så två samtidiga upptäckter inte talar i
    mun på varandra. Efter: **1 ljud, 1 replik** — precis en utropad upptäckt.
  - **#4 "vätskan flyttas till glas man drar förbi".** Ägarregeln i `_carryAll` var
    `it.g.y > own.y` ("lägsta glaset vinner"). Den kan aldrig utse en vinnare mellan två glas
    i SAMMA höjd — och ett draget glas låg kvar på disken (`g.y` klampades till `GRATE_Y`),
    alltså exakt samma y. Jämförelsen blev falsk varje gång och ägarskapet föll tillbaka på
    ordningen i `_glasses`: drog man glas 0 förbi glas 2 tog glas 0 **hela innehållet, 56 av
    56 partiklar**. Två ändringar: ett hållet glas **lyfts** från disken (`HALL_Y`, som
    senare samma dag blev `SAFE_Y = GRATE_Y - 240`), och ägaren är nu det glas partikeln ligger **djupast** inne i (minsta
    avståndet till kanterna) i stället för det "lägsta". Efter: **0 partiklar stjäls** genom
    hela draget. Lyftet rättar dessutom en tyst bugg till: `_tiltFor` kräver
    `g.y < o.y - 120`, så ett draget glas lutade sig ALDRIG förut.
  - Sond: `scripts/_saftprobe.mjs` (A ljud i vila · B stulen vätska · C hällsekvensen).
    `scripts/_tiltprobe.mjs` mätte lutningströskeln som blev V4.
- 2026-08-07 (`/fixa`, ATGARDER **V4** — hällningen flyttade noll vätska):
  - **Grundorsaken var att `TILT` och `OFFS` aldrig var mätta mot varandra.** Mynningen
    ligger på `(0, IN_TOP)` i glasets egna koordinater, så vid lutningen θ hamnar den
    `-IN_TOP·sin θ` px åt sidan och `IN_TOP·cos θ` px i höjdled från foten. Vid `TILT = 1,05`
    (60°) nådde saften **aldrig över läppen** — spelets kärnloop gjorde bokstavligen ingenting.
  - **Kalibrerat med `scripts/_pourtune.mjs`** (fullt källglas, riktigt målglas, spelets egen
    geometri). Antal partiklar som hamnar I MÅLET av ~103: `1,05 → 0` · `1,5/205 → 29` ·
    `1,9/205 → 19` · `2,2/100 → 77 (spill 7)` · `2,4/100 → 81 (spill 11)` ·
    `2,6/100 → 86 (spill 13)`. Att hålla glaset högre (fot-y 300 i stället för 388) mättes
    också och blev **sämre** — längre fall ger mer skvätt (59 i målet, 25–38 spill).
    **Valt `TILT = 2,2` + `OFFS = 100`:** 75 % kommer över, minst spill, minst extrem vinkel.
  - **Tre vägar delade konstanterna och behövde skiljas åt.** Hinken har bred öppning och vill
    ha en fritt fallande stråle → `MOUTH_DX` (178, härledd ur TILT). Bobo *dricker* — hans mun
    är en drain-ruta och saften ska ligga stilla inne i den, inte hällas på golvet → egna
    `SERVE_TILT/SERVE_OFFS` (de gamla 1,05/205, som gör exakt det).
  - **Ny bugg som fixen själv skapade, hittad genom mätning:** ett fullt glas på väg till
    hinken tappade hela innehållet till glas 2 när det gled förbi (52 partiklar blev liggande
    med medel-x 740 ≈ glas 2:s 750). Orsak: djup-ägarregeln från #4 låter det STÅENDE glaset
    vinna när ett rörligt glas glider lågt förbi — dess inre överlappar grannens. Fix:
    `SAFE_Y` + `_moveOver()` — ett glas som flyttar sig i sidled lyfts först, bärs ovanför
    grannarna och ställs sedan ner. Ser dessutom ut som att glaset lyfts och bärs, inte glider
    genom disken.
  - Verifierat med `scripts/_pourprobe.mjs` via spelets egna vägar: **glas→glas** 61 partiklar
    över och målet blir **grönt, renhet 1,00** (gul i blå — hela poängen med spelet);
    **glas→hink** 58 av 58 slukade, 0 kvar liggande; **hela beställningen** Bobo serveras,
    dricker upp och en ny beställning kommer.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): vägg/hylla/bänk/galler/golv breddade ±BLEED. Vätske-bounds ±200 behållna (cull sker vid ±440, utanför VIEW-taket). OBS: `FluidView.area` klipper spill ~40 px före kanten på bredaste telefonerna — breddning kostar filteryta, mät med `_vatskeprobe` först. Testad båda viewports: 0 fel.
