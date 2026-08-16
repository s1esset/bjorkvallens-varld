# Leksakslådan (`leksakslada`)

> fysik · drag · 2–5 · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `leksakslada` |
| **titleSv** | Leksakslådan |
| **icon** | 🧸 |
| **kategori** | `fysik` → flik Fysik |
| **input** | drag |
| **ålder** | [2, 5] |
| **kärnloop** | Bobo håller upp en beställningslapp med en leksak ritad på. Leksaken ligger i en stor låda tillsammans med tio andra, i en riktig hög med äkta kollisioner — nästan alltid UNDER något. Barnet bökar runt i högen med fingret, drar undan det som ligger i vägen, gräver fram rätt sak och lyfter den över lådkanten ner i Bobos korg. |
| **mål** | 4 beställningar klarade → lådan skakar, korgens leksaker hoppar tillbaka ner i en kaskad, locket faller och smäller igen, leksaksfanfar → `progress.complete()` |
| **agens** | VAD man gräver med och i vilken ordning. Den lyfta leksaken är en riktig fysikkropp som knuffar resten av högen medan den bärs — vilken sak man tar upp avgör hur högen lägger om sig. Tunga saker är dessutom trögare att styra men flyttar mer. |
| **variation** | Uppsättningen (8–11 av 11 leksaker) och beställningsordningen slumpas per runda; startlägena slumpas så högen lägger sig olika varje gång; 28 % chans på en sällsynt **studsboll** som far runt i lådan när man rör den; högen fylls på med en ny slumpad leksak efter varje leverans; nivån ger fler leksaker (8 → 11). |
| **mottagare** | Bobo står vid korgen, följer med blicken det barnet gräver med, jublar per rätt leverans och skakar skrattande på huvudet vid fel. |
| **finish** | Lådan skakar → locket faller ner från väggen och smäller igen (låg glidande ton + skakning + dammpuffar längs kanten) → fyra fanfartoner i durtreklang + konfetti. |

**Röstrepliker**
```
"Titta, en låda full med leksaker! Bobo vill ha en sak i taget."
"Hittar du bollen?"  ·  "Hittar du nallebjörnen?"  ·  "Hittar du tågloket?"
"Hittar du gummiankan?"  ·  "Hittar du bilen?"  ·  "Hittar du byggklossen?"
"Hittar du stjärnan?"  ·  "Hittar du tärningen?"  ·  "Hittar du roboten?"
"Hittar du trumman?"  ·  "Hittar du dinosaurien?"  ·  "Leta efter en leksak i lådan!"
"Där var den! Tack så mycket."  ·  "Precis den jag ville ha!"
"Vilken duktig letare du är!"  ·  "Ja! Ner i korgen med den."
"Hihi, inte den! Leta vidare i lådan."  ·  "Oj, det var en annan sak. Prova igen!"
"Böka runt i lådan med fingret så hittar du den."  ·  "Dra undan leksakerna och leta längst ner."
"Jag hjälper till! Titta, den glittrar där nere."
"Oj, tågloket är tungt! Dra det långsamt."  ·  "Roboten är också tung. Ta i lite!"
"En studsboll! Den studsar runt i lådan."
"Titta, korgen är full! Nu åker allting ner i lådan igen."
"Alla leksaker är i lådan. Locket smäller igen!"
```

## 1. Nuläge (sett som spelare)

En barnkammare med tapetränder och plankgolv. Till vänster en stor öppen trälåda med
järnbeslag; ovanför den hänger locket på två spikar. I lådan ligger 8–12 leksaker i en
hög: strandboll, nallebjörn, tågloke, gummianka, bil, byggkloss, tygstjärna, tärning,
robot, trumma, dinosaurie — var och en ett fristående ritat föremål med egen silhuett
och en liten vilo-guppning. Till höger står Bobo vid en flätad korg, och över honom
hänger en anslagstavla med den efterfrågade leksaken ritad i mitten och fyra prickar
som tänds till stjärnor.

Man pekar på en leksak och drar. Den lyfts (skugga under, liten puls) och släpar efter
fingret olika mycket beroende på vikt — bollen följer nästan direkt, tågloket kommer
efter. Under tiden knuffar den undan allt den rör vid: högen rasar om, saker rullar ner
i gropen, klossar välter. Släpps leksaken faller den tillbaka i lådan och klingar till
i sitt eget material (trä dovt, metall ljust, gummi mjukt). Släpps den i korgen och det
var rätt sak jublar Bobo, en ton i pentatoniken spelas, en prick blir en stjärna och
leksaken lägger sig synlig i korgen. Var det fel sak spottar korgen tillbaka den i en
båge ner i lådan medan Bobo skrattar — ingen förlust, ingen nollställning.

Tap-tap fungerar hela vägen (tryck leksak → tryck korg), och en tryckning på lappen
upprepar frågan.

## 2. Ursprunglig plan & tankeprocess

Appen hade tolv drag-spel där föremålen ligger uppradade och snäpper i ett mål. Det som
saknades var ett spel där föremålen ligger i vägen för varandra — där **letandet** är
motoriken. En låda med riktig stelkroppsfysik ger det gratis: att hitta något innebär
att flytta något annat, och varje omgång ser olika ut utan att en enda regel behöver
slumpas.

Pedagogiskt: benämning (Bobo säger vad saken heter, bilden visar den), objektspermanens
(saken finns även när den är dold), och orsak–verkan i ett fysiskt system som svarar
direkt.

Tekniskt vilar hela loopen på ett val: den lyfta leksaken förblir en **dynamisk** kropp
och styrs med en hastighet i `phys.beforeStep()`, inte en position. Det är dels den enda
fällfria vägen (`Body.setPosition(…, true)` lämnar en fart som ligger kvar för alltid),
dels det som gör att den bärna saken faktiskt knuffar högen. Hastighetens TAK per leksak
(`spec.fart`, 9–22 px/steg) är hela svårighetskurvan: tunga saker går trögt men flyttar
mycket, lätta går snabbt men flyttar lite.

## 3. Vad gör det lättjefullt / tunt

- Högens djup är i praktiken 2–3 lager. En riktigt begravd leksak (fyra lager ner) går
  inte att åstadkomma utan fler kroppar än budgeten tål.
- Alla leksaker har samma "personlighet" utöver vikt: ingen av dem gör något eget när
  den lyfts (ankan piper inte, trumman låter inte).
- Beställningen är alltid "hitta X". Den kunde varit "hitta något RUNT" eller "hitta två
  saker" utan att mekaniken ändras.
- Korgen tar emot vad som helst; det finns ingen andra mottagare (hyllan, sängen) som
  skulle ge draget en riktning till.
- Lådans framkant döljer den nedersta raden. Det är avsiktligt (saken ska ligga *i*
  lådan) men gör den understa raden svår att avläsa.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- **[Quick]** Leksaks-röst vid lyft: ankan piper, trumman får ett dovt slag, tågloket
  ett tut — ett `audio.tone()` per nyckel, inte ett klipp.
- **[Medium]** Andra beställningstypen: "två likadana" eller "den STÖRSTA" — samma
  gräva-loop, ny fråga. Lappen bär redan ikonen och kan bära två.
- **[Deep]** Ett andra mål (en hylla) så draget får en riktning till att välja mellan.

**Variation**
- **[Quick]** Fler sällsynta gäster i studsbollens klass (en snurra som roterar, en
  ballong som sjunker långsamt).
- **[Medium]** Lådan byter innehållstema per nivå (fordon · djur · byggsaker) så
  beställningarna hänger ihop.

**Juice**
- **[Quick]** Damm som yr när något tungt landar i botten.
- **[Medium]** Högens leksaker som vickar till när grannen rycks bort (i dag sköter
  fysiken det, men utslaget är litet).

**Progression**
- **[Medium]** Beställningarna blir längre per nivå (4 → 5 → 6) i stället för bara fler
  leksaker.

**Karaktär**
- **[Quick]** Bobo pekar mot lådan när autohjälpen går igång i stället för bara glittret.

**Ljud**
- **[Quick]** Egen ton per leksak vid leverans, så fyra rätt bildar en liten melodi som
  hör ihop med just de sakerna.

## 5. Status / loggar

### Mätt 2026-08-14 (`scripts/_leksakprobe.mjs`)

- **Beställningslogiken**: fel leksak i korgen ger `_klara` 0 och behåller beställningen;
  rätt leksak räknas. Kontrollarmen (fel-leksaken) körs först.
- **Bökandet**: den beställda leksaken har något ovanpå sig i **7 av 10 rundor**, i snitt
  **29 % av bredden täckt**. En första mätning påstod tvärtom "noll bökande i 10 av 10" —
  den räknade genomträngning mellan cirklar och var därför blind för leksaker som *vilar*
  på varandra (de rör vid varandra utan att tränga in). Smalare låda + smalare spawn-band
  prövades: 46 % täckning men lika många fria rundor (3 av 10) och ett tommare rum —
  förkastat.

`2026-08-14 · byggt från spelkö-specen (fysik · drag · 4 beställningar · låda med 8–12 kroppar) · <commit>`

`2026-08-16 · ägaruppdrag: DUBBLA högen, 8–11 → 16–22 leksaker (duplikat tillåtna — det finns
bara elva sorter). Två stödändringar, båda räknade och inte gissade: mynningen 300 → 244
(+17 % volym) och leksakerna krympta till 0,76 (−42 % yta), med densiteten delad med 0,76²
så MASSAN — och därmed hela den mätta tyngdkänslan i tågloket och roboten — är oförändrad.
Utan dem hade högen rest sig över kanten och rullat ut på golvet.`
