# Roliga Snurran (`roliga-snurran`)

> roligt · tap · 2–5 år · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec

| | |
|---|---|
| **id** | `roliga-snurran` |
| **titleSv** | Roliga Snurran |
| **icon** | 🎰 |
| **kategori** | `roligt` → fliken **Roligt** |
| **input** | tap |
| **ålder** | [2, 5] |
| **kärnloop** | Tryck på den stora spaken → alla tre trummorna snurrar. I **handläget** trycker barnet sedan på VARJE trumma för att stoppa den; i **stjärnläget** stannar de själva, ett i taget. Allt som landar firas — och **tre lika är vinsten**. |
| **lägen** | En väljare på maskinens högra sida (träffyta 184×156, ikon-först + röst). 🖐 = du stoppar hjulen själv (standard) · ✨ = maskinen stannar dem, som en riktig spelautomat. Valet sparas per profil (`custom.autoStopp`). |
| **vinst** | Tre lika → egen ceremoni: bilden dämpas, vinsten glider ner uppifrån i 2,2× storlek, en 12-uddig stjärna roterar bakom, 16 strålar skjuts ut åt alla håll (åt motsatt håll mot stjärnan), en glans sveper över föremålet **maskad av dess egen silhuett**, och en kort trudelutt (C–E–G–C–B–C) klingar. Sedan flyger vinsten till trofehyllan. |
| **mål** | Fem snurr → `progress.complete()`: lamporna springer varvet runt maskinen, glitter-myntregn ur luckan, och snurran får en ny färgpalett + en ny symboluppsättning. Parallellt: **fyll trofehyllan** med upp till 8 unika vinster. |
| **agens** | NÄR varje trumma stoppas — eller valet att låta maskinen göra det. Trummorna går 1,79 symboler/s och stoppet är WYSIWYG: den symbol som står i fönstret när fingret nuddar är den som stannar där (uppmätt 85–94 %, kontrollarm 0–17 %). Ett barn kan alltså sikta på tre lika med flit. |
| **variation** | Symboluppsättningen byts per runda (djur · frukt · fordon · hav · former · leksaker), antalet OLIKA symboler per trumma växer 3 → 4 → 5, farten 300 → 360 px/s, maskinen får ny palett. Sällsynt regnbågstrumma (16 %). |
| **mottagare** | Bobo sitter på maskinens tak, studsar i takt med trummornas tickande, följer med blicken när en trumma stannar och jublar/hejar/blir förvånad efter utfall. |
| **finish** | Maskinens egen: lampringen tänds i ett löpande varv, luckan sprutar guldmynt och glitterstjärnor, kronans fem lampor står tända — och snurran byter färg inför nästa runda. |

**Röstrepliker**
```
"Tryck på spaken så snurrar hjulen!"        (intro)
"Stoppa hjulen när du vill!"                (när trummorna startar)
"Tre lika! Vilket party!"                   (tre lika)
"Titta, alla tre är likadana!"              (tre lika, variant)
"Två lika! Så fint!"                        (två lika)
"Två kompisar hittade varandra!"            (två lika, variant)
"En tokig kompis kom fram!"                 (alla olika)
"Titta vilken rolig blandning!"             (alla olika, variant)
"Regnbågshjulet blev likadant!"             (regnbågstrumman förvandlas)
"Hurra! Snurran fick nya färger!"           (runda klar)
"Tryck på ett hjul så stannar det!"         (om-cue, trummorna snurrar)
"Tryck på den stora spaken!"                (om-cue, redo)
"Nu stoppar du hjulen själv."               (väljaren → handläget)
"Nu stannar hjulen själva."                 (väljaren → stjärnläget)
"Titta, hjulen stannar själva!"             (snurr startar i stjärnläget)
"Den ställer sig på hyllan!"                (ny trofé)
"Den har du redan! Titta på hyllan."        (dubblett)
"Hyllan är full av fina saker!"             (hyllan full)
```

## 1. Nuläge (sett som spelare)

En stor, lackad spelautomat står mitt i bild med en lampram runt hela kabinettet, tre
trumfönster, en lucka längst ner och en röd spak på höger sida. Bobo sitter på taket.
Ett tryck på spaken (träffyta 180×260 px) får plåten att skaka och alla tre trummorna
att dra igång i samma bildruta som trycket. Varje trumma är en egen träffyta på
192×208 px med 28 px mellan sig.

Trummorna rullar långsamt (en symbol var 0,56 s) och tickar mekaniskt; Bobo studsar i
takten. Ett tryck på en trumma bromsar den mjukt på 0,42 s och sätter den på plats med
en egen ton — C5, E5, G5. När alla tre står klingar tonerna tillsammans som en
durtreklang. En trumma som redan står går att trycka på igen bara för att spela sin ton:
maskinen är också ett litet instrument.

Sedan firas det, alltid:
* **tre lika** — symbolerna hoppar ut ur fönstren och dansar över kronan, lamporna
  springer varvet runt, fanfar, myntregn ur luckan, Bobo jublar;
* **två lika** — de två som är lika hoppar ut och möts mitt på maskinen med gnistor och
  en kvint, Bobo hejar;
* **alla olika** — alla tre hoppar ut, virvlar ihop i en poff, och en **tokig
  blandfigur** byggd av just de tre symbolerna (den ena som hatt, den andra på magen,
  den tredje i handen) kliver ur luckan och dansar fyra hopp innan den poffar tillbaka.

Skärmdumpar: `.test-shots/roliga-snurran-vila.png` · `-fest.png` · `-blandfigur.png`.

## 2. Ursprunglig plan & tankeprocess

Formen är en spelautomat, mekaniken är det INTE. Det finns ingen insats, ingen förlust,
ingen "nästan-vinst"-dramaturgi, ingen poäng och ingen timer — allt det som gör en riktig
enarmad bandit till en enarmad bandit är medvetet borttaget. Kvar blir det som ett barn
faktiskt gillar med maskinen: den stora spaken, hjulen som snurrar, ljudet, lamporna och
att något roligt händer varje gång.

Agensen ligger inte i att "vinna" utan i att **stoppa varje hjul själv**. Därför är farten
vald så att man kan sikta: 168 px mellan symbolerna och 300 px/s ger 1,79 symboler i
sekunden, och stoppet siktar på närmaste symbolmitt — toleransen blir en halv symbol åt
vardera hållet, alltså ±0,28 s. Ett barn får vara nästan en tredjedels sekund fel och ändå
få symbolen det siktade på.

Utfallen är rangordnade i FIRANDE, inte i värde: tre lika är störst, men "alla olika" är
det roligaste (en helt ny varelse kliver ur maskinen) just för att den vanligaste
utgången inte får vara den tråkigaste.

## 3. Vad gör det lättjefullt / tunt

Ärligt om nuläget:
* ~~**Tre lika är sällsynt för den som inte siktar.**~~ **Åtgärdat 2026-08-14 med
  stjärnläget:** där garanteras tre lika minst var tredje snurr (och alltid det första i en
  session), så barnet aldrig kan dra spaken fler än tre gånger utan en vinst. I handläget är
  det fortfarande siktet som avgör — men nu bär varje runda en **delad symbol** som finns på
  alla tre hjulen, vilket den inte gjorde förut: 17,9 % av rundorna med 3 olika symboler per
  trumma saknade en gemensam symbol och gjorde tre lika **matematiskt omöjligt**.
* **Ceremonin är oprövad på ett riktigt barn.** Den är 4,1 s från tre lika till nästa snurr,
  vilket är längre än P0:s riktvärde 1–2 s för ett firande (men i linje med spelets egen
  blandfigur, som tar 4 s). Om det känns långt vid tionde vinsten är det tempot som ska ner,
  inte ceremonin som ska bort.
* **Hyllan tar 8 unika och sedan inte fler.** Vinst nummer nio firas fullt men lägger inget
  nytt. Det är valt för att inget ska försvinna, men en hylla som växer (fler plankor, eller
  ett andra rum) vore ärligare mot ett barn som spelar länge.
* **Blandfiguren har en enda kroppsmall.** Bara färgen och de tre symbolerna varierar;
  kropp, ögon och dans är desamma varje gång.
* **Ingen motgång alls.** P0 tillåter hinder, och specen förbjöd förlust — men det finns
  inte ens ett ofarligt streck i räkningen (ett hjul som nyser, en lampa som slocknar).
  Loopen är därför mycket lugn.
* ~~**Maskinen har bara ett läge.**~~ **Åtgärdat 2026-08-14:** väljaren ger hand- och
  stjärnläge. Trummorna ser dock fortfarande likadana ut hela vägen (utom regnbågstrumman);
  det finns ingen "gyllene runda" eller liknande.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
* **[Quick]** Låt en trumma som redan står kunna *pilla igång igen* med ett andra tryck
  (en enda trumma i taget), så barnet kan "rätta" ett hjul utan att dra spaken om.
* **[Medium]** Ett valfritt "önskeläge": Bobo håller upp en lapp med en symbol, och
  träffar barnet den på minst ett hjul blir det extra jubel. Ger sikte ett syfte utan att
  införa fel.

**Variation**
* **[Medium]** Fler kroppsmallar till blandfiguren (lång/rund/spretig) + slumpade ben och
  antenner.
* **[Quick]** Låt regnbågstrumman ibland ge en regnbågs-SYMBOL som lyser i alla utfall.

**Juice**
* **[Quick]** Riktiga klipp för trum-tick och spak-klonk via `npm run sfx` (idag stämda
  syntestoner).
* **[Medium]** Låt myntregnet studsa mot luckans kant innan det faller ur bild.

**Progression**
* **[Quick]** Spara vilken symboluppsättning barnet senast såg så en ny session inte
  alltid börjar med djuren.

**Karaktär**
* **[Medium]** Låt Bobo kommentera EN symbol per runda ("En båt!") så maskinen också
  benämner det som händer.

**Ljud**
* **[Quick]** Transponera trummornas treklang per runda (C-dur → F-dur → G-dur) så
  maskinen inte låter identisk i runda fyra.

## 5. Status / loggar

`2026-08-14 · byggd från spelkön (spelko.md §5): spelautomatens form utan dess mekanik,
WYSIWYG-stopp, tre firandegrenar, blandfigur, lampring, myntregn · (commit sätts av
huvudsessionen)`

Mätningar vid bygget (`node scripts/_snurrprobe.mjs`, kontrollarmar i
`scripts/_snurrkontroll.mjs`):
* **Sikte** 85–94 % av trycken gav den symbol som stod i fönstret; kontrollarmen
  (grannsymbolen) 0–17 %.
* **Utfall** över 16 snurr: 2 tre-lika · 7 två-lika · 7 blandfigurer, 0 låsningar,
  3 `complete()`.
* **Exit** `destroy()` mitt i ett firande med levande mynt och utsprungna symboler:
  0 konsolfel.
* **Två fynd som sonden hittade och som är åtgärdade i koden:** trummorna startade förr i
  spakens gsap-tidslinje (0,16 s efter trycket) och en hackig bildruta kunde då lägga
  barnets tryck FÖRE starten — hjulen snurrade vidare i evighet; och ett tryck före
  minsta snurrvarvet avvisades i stället för att bokas.
* **Ett fynd som var sondens eget:** skärmdumpar skrivna till `.test-shots/` mitt i en
  körning triggar Vites bevakare → full page reload → "WebGL context may be lost" och en
  bild där varje gradient i appen ritas fel. 3/3 rena körningar när bilderna skrevs
  utanför repot. `npm run test` är opåverkad (den fotar efter avslut).

`2026-08-14 · ägaruppdrag: lägesväljare (hand ↔ stjärna), tre lika = vinsten med egen
ceremoni, trofehylla som sparas · <commit>`

Mätningar vid det bygget (`node scripts/_vinstprobe.mjs`, kontrollarm = manuellt läge):
* **Kontrollarm** manuellt läge: 3/3 hjul snurrar ännu efter 3,2 s (alltså långt förbi
  autolägets 2,54 s), och barnets tryck stoppar alla tre på 376 ms.
* **Väljaren** ett riktigt tryck på träffytan flippar läget och sparar det i profilen.
* **Autoläget** 8/8 snurr stannade utan att något rördes, snitt 3 135 ms.
* **Garantin** första autosnurren gav tre lika; som mest **3** snurr mellan två vinster;
  varje begärd vinst blev också en vinst (3/3).
* **Delad symbol** ≥1 gemensam symbol på alla tre hjulen i varje snurr. Utan fixen saknades
  den i **17,9 %** av rundorna med `distinct` 3 (200 000 dragningar, ren nodräkning).
* **Ceremonin** vinsten 2,23× trummans symbol (241 px mot 108) · stjärnan 1,04 rad och
  strålarna 0,53 rad **åt motsatt håll** · glansbandet sveper 208 px, maskat av föremålets
  egen `drawIcon`-silhuett.
* **Hyllan** troféerna är unika, sparas i profilen och **överlever en omladdning**.
* **Exit** mitt i en levande ceremoni: 0 konsolfel.

**Fyra fel som mätningen hittade — tre av dem var sondens egna:**
* **Spelets:** `liv` användes i `_placeTrophy` men importerades aldrig. Spelet **kraschade
  vid start** för varje profil som redan hade en trofé sparad — alltså först vid ANDRA
  besöket, vilket ingen testkörning på en tom profil kan se.
* **Sondens:** spardata lästes ur `pwagames.save` (rätt nyckel är `pwagames.save.v1`).
* **Sondens:** avläsning 400 ms efter trycket, men `SaveService.update` är **debouncad
  500 ms** — "sparas inte" var en mätning före flushen, medan omladdningsarmen i samma
  körning visade att det sparades.
* **Sondens:** glansbandet mättes i två punkter direkt efter landningen och gav −104 → −104.
  Svepet startar 0,6 s in i ceremonin, alltså låg båda avläsningarna före det. Måttet läser
  nu **svängningen** (max − min) över 14 prov.

**Två fynd som bara skärmdumpen såg:** troféerna svävade 5 px ovanför plankan (skuggan sitter
32,6 px under behållaren, plankans översida på `SHELF_Y`), och lägesväljarens hand läste först
som ett **nyckelhål** — silhuetten fyllde brickans cirkel helt. Fingret måste vara mycket
smalare än näven (11 mot 34 px) för att de två formerna inte ska läsa ihop till en stapel.
