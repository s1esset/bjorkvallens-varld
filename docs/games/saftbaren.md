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

> 🐛 **Rapporterade buggar väntar i `docs/ATGARDER.md` (#3, #4)** — ljudet hakar upp sig efter
> ett färgbyte, och vätskan följer med glas som dras förbi. Fixas före nya förbättringar.

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

- 2026-08-06: byggt som första spel på `lib/vatska.js`. Motorn utökades samtidigt med
  färg per partikel (`world.pal`), blandningstabell (`setMixTable`) och roterade
  kärlväggar (`addBox(..., angle)`) — det sista är det som gör att ett glas kan hälla.
