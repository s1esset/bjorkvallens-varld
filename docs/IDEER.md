# IDEER.md — idébank (spel som inte är planerade än)

Parkerade spelidéer, **nyast överst**. En idé här är *inte* ett spec-kort — den är råmaterialet
som `/spel <idé>` får som indata när vi bestämmer oss för att bygga den. Varje post fångar
idén som ägaren beskrev den, plus de frågor en planerare måste svara på först.

När en idé byggs: flytta den till `docs/games/<id>.md` (§0 Spec) och stryk posten här.

---

## 1. Nätskott från bilfönstret (arbets-id: `natskott-pa-stan`)

*Inlagd 2026-08-06. Status: ⬜ ej planerad.*

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

### Frågor att svara på i planeringen (INTE nu)
1. **Varumärke.** Repot har konsekvent egna hjältar ("INTE Spider-Man", se `spindelnatet`,
   `spindel-zacke-svingar`). Armen/dräkten måste bli **vår egen** — t.ex. Spindel-Zackes
   färger — inte Marvels design. Beskriv dräkten i speccen så ingen ritar fel.
2. **Fönster som går sönder.** Passar det P0 (`fel tryck = roligt, aldrig tillsägelse`) eller
   läser en förälder det som skadegörelse? Alternativ: rutan blir *målad med nät* / får ett
   roligt klistermärke i stället för att krossas.
3. **Gummorna.** P0 `KARAKTÄRER`: avbildade människor får bara heta Zacke/Alissa/Elvira/Lova.
   Antingen är fotgängarna **namnlösa**, eller så blir de djur/monster i stället.
4. **Vad är målet?** Fritt lek-läge räcker inte för kvalitetsgrindens punkt 1 (agens med utfall).
   Förslag att väga: "hämta hem X saker med dragnät" · "fånga katten som sprungit iväg" ·
   "fäst alla paket innan de blåser bort" — alltid utan fail.
5. **Bilen.** Ser man fönsterkarmen/dörren i bild (ram runt scenen) eller är det ren
   förstaperson? Ramen ger djup men äter skärmyta i 1280×720.
6. **Lägesbytet klibb/drag.** En stor knapp (≥96px) nere i hörnet, eller växlar det automatiskt
   per mål? Knapp är mer agens, auto är mindre att lära sig.
7. **Fysikbudget.** matter.js med rullande bakgrund → kropparna måste följa med i scrollen och
   städas bort utanför bild. Se skill **fysik-spel** + `PhysicsWorld`.

### Tekniska hållpunkter
- matter.js (`PhysicsWorld`) för de påverkade föremålen; bakgrunden som parallax-lager
  (TilingSprite eller egna ritade lager) i tre djup: hus · trottoar · vägkant.
- Nätet självt: en dragen linje som skjuts ut från handen till träffpunkten, med `whoosh` +
  träffljud <100 ms. Klibbnät = kroppen blir statisk där den är. Dragnät = constraint som
  drar kroppen mot kameran och plockar bort den ur fysiken när den kommer nära.
- Armen/handen är ett **fristående ritat objekt** (P0 `ASSETS`), aldrig en emoji — med
  vilo-rörelse och rekyl vid skott.
